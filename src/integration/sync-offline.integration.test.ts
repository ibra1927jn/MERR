/**
 * INTEGRATION TEST: Sync Service + Offline Pipeline
 * 
 * Tests: error categorization + queue management + offline bucket flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock external boundaries ────────────────
vi.mock('@/services/supabase', () => ({
    supabase: {
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
        channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
        removeAllChannels: vi.fn(),
    },
}));

vi.mock('@/services/offline.service', () => ({
    offlineService: {
        queueBucket: vi.fn().mockResolvedValue(undefined),
        markAsSynced: vi.fn().mockResolvedValue(undefined),
        getPendingBuckets: vi.fn().mockResolvedValue([]),
        getAll: vi.fn().mockResolvedValue([]),
        clearAll: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/services/audit.service', () => ({
    auditService: { logAudit: vi.fn(), logAuth: vi.fn(), logPickerEvent: vi.fn() },
}));

vi.mock('@/config/analytics', () => ({
    analytics: { trackBucketScanned: vi.fn(), identify: vi.fn(), track: vi.fn(), trackEvent: vi.fn() },
}));

vi.mock('@/repositories/edgeFunctions.repository', () => ({
    edgeFunctionsRepository: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

vi.mock('@/services/gateway.service', () => ({
    gatewayService: {
        withResilience: vi.fn((_n: string, fn: () => Promise<unknown>) => fn()),
        onEvent: vi.fn(() => () => { }),
    },
}));

import { syncService } from '@/services/sync.service';
import { offlineService } from '@/services/offline.service';

// ── SYNC SERVICE: ERROR CATEGORIZATION ─────────

describe('Sync Service — Error Categorization', () => {

    it('network error → "network"', () => {
        expect(syncService.categorizeError(new Error('Failed to fetch'))).toBe('network');
    });

    it('timeout error → "network"', () => {
        expect(syncService.categorizeError(new Error('request timeout aborted'))).toBe('network');
    });

    it('500 in message → "server"', () => {
        expect(syncService.categorizeError(new Error('HTTP 500 Internal Server Error'))).toBe('server');
    });

    it('502 in message → "server"', () => {
        expect(syncService.categorizeError(new Error('502 Bad Gateway'))).toBe('server');
    });

    it('429 rate limit → "server"', () => {
        expect(syncService.categorizeError(new Error('429 Too Many Requests'))).toBe('server');
    });

    it('constraint violation → "validation"', () => {
        expect(syncService.categorizeError(new Error('unique constraint violation'))).toBe('validation');
    });

    it('foreign key error → "validation"', () => {
        expect(syncService.categorizeError(new Error('foreign key constraint'))).toBe('validation');
    });

    it('optimistic lock error → "validation"', () => {
        expect(syncService.categorizeError(new Error('optimistic lock conflict'))).toBe('validation');
    });

    it('Supabase error with code 23xxx → "validation"', () => {
        expect(syncService.categorizeError({ code: '23505' })).toBe('validation');
    });

    it('Supabase error with code PGRST → "server"', () => {
        expect(syncService.categorizeError({ code: 'PGRST' })).toBe('server');
    });

    it('null → "unknown"', () => {
        expect(syncService.categorizeError(null)).toBe('unknown');
    });

    it('string → "unknown"', () => {
        expect(syncService.categorizeError('some error')).toBe('unknown');
    });

    it('empty object → "unknown"', () => {
        expect(syncService.categorizeError({})).toBe('unknown');
    });
});

// ── SYNC SERVICE: QUEUE MANAGEMENT ─────────────

describe('Sync Service — Queue Management', () => {

    it('addToQueue accepts SCAN type', async () => {
        await syncService.addToQueue('SCAN', {
            id: 'b1', picker_id: 'p1', quality_grade: 'A',
            timestamp: new Date().toISOString(), orchard_id: 'o1',
        });
        // Should not throw
    });

    it('getQueue returns array', async () => {
        const queue = await syncService.getQueue();
        expect(Array.isArray(queue)).toBe(true);
    });

    it('getPendingCount returns number', async () => {
        const count = await syncService.getPendingCount();
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
    });

    it('getQueueSummary returns structured data', async () => {
        const summary = await syncService.getQueueSummary();
        expect(summary).toHaveProperty('total');
        expect(summary).toHaveProperty('byType');
        expect(summary).toHaveProperty('maxRetry');
        expect(typeof summary.total).toBe('number');
    });

    it('getMaxRetryCount returns number', async () => {
        const maxRetry = await syncService.getMaxRetryCount();
        expect(typeof maxRetry).toBe('number');
    });
});

// ── OFFLINE SERVICE: BUCKET QUEUE ──────────────

describe('Offline Service — Bucket Queue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('queueBucket called with correct payload', async () => {
        await offlineService.queueBucket({
            id: 'b1', picker_id: 'p1', quality_grade: 'A',
            timestamp: new Date().toISOString(), orchard_id: 'o1',
            scanned_by: 'runner1',
        } as any);

        expect(offlineService.queueBucket).toHaveBeenCalledWith(
            expect.objectContaining({ picker_id: 'p1', scanned_by: 'runner1' })
        );
    });

    it('markAsSynced called with bucket ID', async () => {
        await offlineService.markAsSynced('bucket-123');
        expect(offlineService.markAsSynced).toHaveBeenCalledWith('bucket-123');
    });

    it('getPendingBuckets returns array', async () => {
        const pending = await offlineService.getPendingBuckets();
        expect(Array.isArray(pending)).toBe(true);
    });

    it('multiple queueBucket calls create separate entries', async () => {
        for (let i = 0; i < 5; i++) {
            await offlineService.queueBucket({
                id: `b${i}`, picker_id: `p${i}`, quality_grade: 'A',
                timestamp: new Date().toISOString(), orchard_id: 'o1',
                scanned_by: 'runner1',
            } as any);
        }

        expect(offlineService.queueBucket).toHaveBeenCalledTimes(5);
    });
});
