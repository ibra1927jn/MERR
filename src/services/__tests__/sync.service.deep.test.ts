/**
 * sync.service.deep.test.ts — Offline-first sync queue tests
 *
 * Tests the syncService which manages an IndexedDB-backed offline queue
 * with Zod validation and multiple item types.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

const mockPut = vi.fn().mockResolvedValue('mock-id');
const mockToArray = vi.fn().mockResolvedValue([]);
const mockCount = vi.fn().mockResolvedValue(0);
const mockBulkDelete = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockMetaGet = vi.fn().mockResolvedValue(null);
const mockMetaPut = vi.fn().mockResolvedValue(undefined);

vi.mock('@/services/db', () => ({
  db: {
    sync_queue: {
      put: mockPut,
      toArray: mockToArray,
      count: mockCount,
      bulkDelete: mockBulkDelete,
      update: mockUpdate,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    },
    sync_meta: {
      get: mockMetaGet,
      put: mockMetaPut,
    },
    dead_letter_queue: {
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/uuid', () => ({
  safeUUID: vi.fn(() => `test-uuid-${Math.random().toString(36).slice(2)}`),
}));

vi.mock('@/utils/nzst', () => ({
  toNZST: vi.fn((d: Date) => d.toISOString()),
  nowNZST: vi.fn(() => new Date().toISOString()),
}));

vi.mock('@/config/analytics', () => ({
  analytics: { trackSync: vi.fn(), trackDLQError: vi.fn() },
}));

vi.mock('@/services/bucket-ledger.service', () => ({
  bucketLedgerService: { recordBucket: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/services/simple-messaging.service', () => ({
  simpleMessagingService: { sendMessage: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/services/user.service', () => ({
  userService: { assignUserToOrchard: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/services/conflict.service', () => ({
  conflictService: { detect: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/services/sync-processors', () => ({
  processContract: vi.fn().mockResolvedValue(undefined),
  processTransport: vi.fn().mockResolvedValue(undefined),
  processTimesheet: vi.fn().mockResolvedValue(undefined),
  processAttendance: vi.fn().mockResolvedValue(undefined),
  processPicker: vi.fn().mockResolvedValue(undefined),
  processQCInspection: vi.fn().mockResolvedValue(undefined),
  processUnlink: vi.fn().mockResolvedValue(undefined),
}));

// ── Import after mocks ─────────────────────────────────

import { syncService } from '../sync.service';

// ── Tests ───────────────────────────────────────────────

describe('syncService', () => {
  let savedOnLine: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    savedOnLine = navigator.onLine;
    // Default: offline to prevent auto-processing in addToQueue
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: savedOnLine, configurable: true });
  });

  describe('addToQueue', () => {
    it('adds a PICKER item with correct type and payload', async () => {
      const payload = {
        id: 'p1',
        picker_id: '402',
        name: 'Liam O.',
        orchard_id: 'orch-1',
        status: 'active',
      };

      await syncService.addToQueue('PICKER', payload);

      expect(mockPut).toHaveBeenCalledTimes(1);
      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.type).toBe('PICKER');
      expect(addedItem.payload).toEqual(payload);
    });

    it('adds a QC_INSPECTION item with correct type', async () => {
      const payload = {
        orchard_id: 'orch-1',
        picker_id: 'p1',
        inspector_id: 'insp-1',
        grade: 'A',
        notes: 'Good quality',
      };

      await syncService.addToQueue('QC_INSPECTION', payload);

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.type).toBe('QC_INSPECTION');
    });

    it('adds an UNLINK item with correct type', async () => {
      const payload = { userId: 'user-123' };
      await syncService.addToQueue('UNLINK', payload);

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.type).toBe('UNLINK');
      expect(addedItem.payload).toEqual(payload);
    });

    it('adds an ATTENDANCE item', async () => {
      const payload = { worker_id: 'w1', type: 'check_in', orchard_id: 'orch-1' };
      await syncService.addToQueue('ATTENDANCE', payload);

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.type).toBe('ATTENDANCE');
    });

    it('adds a CONTRACT item', async () => {
      const payload = { action: 'create', employee_id: 'e1', orchard_id: 'orch-1', type: 'seasonal' };
      await syncService.addToQueue('CONTRACT', payload);

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.type).toBe('CONTRACT');
    });

    it('adds a TIMESHEET item', async () => {
      const payload = { action: 'approve', attendanceId: 'a1', verifiedBy: 'mgr-1' };
      await syncService.addToQueue('TIMESHEET', payload);

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.type).toBe('TIMESHEET');
    });

    it('adds a TRANSPORT item', async () => {
      const payload = { action: 'create', orchard_id: 'orch-1', bins_count: 5, priority: 'high' };
      await syncService.addToQueue('TRANSPORT', payload);

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.type).toBe('TRANSPORT');
    });

    it('assigns a UUID id to each queue item', async () => {
      await syncService.addToQueue('UNLINK', { userId: 'u1' });

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.id).toBeDefined();
      expect(typeof addedItem.id).toBe('string');
      expect(addedItem.id.length).toBeGreaterThan(0);
    });

    it('sets timestamp on queue items', async () => {
      const before = Date.now();
      await syncService.addToQueue('UNLINK', { userId: 'u1' });
      const after = Date.now();

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.timestamp).toBeGreaterThanOrEqual(before);
      expect(addedItem.timestamp).toBeLessThanOrEqual(after);
    });

    it('sets retryCount to 0 for new items', async () => {
      await syncService.addToQueue('UNLINK', { userId: 'u1' });

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.retryCount).toBe(0);
    });

    it('includes updated_at when provided', async () => {
      const updatedAt = '2025-01-15T10:00:00Z';
      await syncService.addToQueue('CONTRACT', { action: 'update', contractId: 'c1' }, updatedAt);

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.updated_at).toBe(updatedAt);
    });

    it('does not include updated_at when not provided', async () => {
      await syncService.addToQueue('UNLINK', { userId: 'u1' });

      const addedItem = mockPut.mock.calls[0][0];
      expect(addedItem.updated_at).toBeUndefined();
    });

    it('returns the item id', async () => {
      const id = await syncService.addToQueue('UNLINK', { userId: 'u1' });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('tries to process queue immediately when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      // Mock toArray to return empty so processQueue finishes quickly
      mockToArray.mockResolvedValueOnce([]);

      await syncService.addToQueue('UNLINK', { userId: 'u1' });

      // put should have been called (the item was queued)
      expect(mockPut).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQueue', () => {
    it('returns items from IndexedDB', async () => {
      mockToArray.mockResolvedValueOnce([
        { id: '1', type: 'PICKER', payload: {}, timestamp: Date.now(), retryCount: 0 },
        { id: '2', type: 'UNLINK', payload: {}, timestamp: Date.now(), retryCount: 0 },
      ]);

      const result = await syncService.getQueue();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('returns empty array when queue is empty', async () => {
      mockToArray.mockResolvedValueOnce([]);

      const result = await syncService.getQueue();
      expect(result).toHaveLength(0);
    });

    it('returns empty array on IndexedDB error', async () => {
      mockToArray.mockRejectedValueOnce(new Error('DB error'));

      const result = await syncService.getQueue();
      expect(result).toEqual([]);
    });
  });

  describe('Queue supports all 7 item types', () => {
    const itemTypes = [
      'PICKER',
      'QC_INSPECTION',
      'UNLINK',
      'ATTENDANCE',
      'CONTRACT',
      'TIMESHEET',
      'TRANSPORT',
    ] as const;

    for (const type of itemTypes) {
      it(`supports ${type} item type`, async () => {
        await syncService.addToQueue(type, { action: 'create', userId: 'u1' } as any);
        const addedItem = mockPut.mock.calls[0][0];
        expect(addedItem.type).toBe(type);
      });
    }
  });

  describe('getPendingCount', () => {
    it('returns 0 for empty queue', async () => {
      mockCount.mockResolvedValueOnce(0);
      const count = await syncService.getPendingCount();
      expect(count).toBe(0);
    });

    it('returns correct count after adding items', async () => {
      mockCount.mockResolvedValueOnce(3);
      const count = await syncService.getPendingCount();
      expect(count).toBe(3);
    });
  });

  describe('getQueueSummary', () => {
    it('returns correct summary for mixed queue', async () => {
      mockToArray.mockResolvedValueOnce([
        { id: '1', type: 'PICKER', payload: {}, timestamp: 1000, retryCount: 2 },
        { id: '2', type: 'PICKER', payload: {}, timestamp: 2000, retryCount: 0 },
        { id: '3', type: 'UNLINK', payload: {}, timestamp: 3000, retryCount: 5 },
      ]);
      mockMetaGet.mockResolvedValueOnce(null);

      const summary = await syncService.getQueueSummary();
      expect(summary.total).toBe(3);
      expect(summary.byType['PICKER']).toBe(2);
      expect(summary.byType['UNLINK']).toBe(1);
      expect(summary.maxRetry).toBe(5);
      expect(summary.oldestTimestamp).toBe(1000);
    });

    it('returns zeros for empty queue', async () => {
      mockToArray.mockResolvedValueOnce([]);
      mockMetaGet.mockResolvedValueOnce(null);

      const summary = await syncService.getQueueSummary();
      expect(summary.total).toBe(0);
      expect(summary.maxRetry).toBe(0);
      expect(summary.oldestTimestamp).toBeNull();
    });
  });

  describe('processQueue', () => {
    it('does nothing when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      await syncService.processQueue();

      // toArray should not have been called (skipped because offline)
      expect(mockToArray).not.toHaveBeenCalled();
    });

    it('processes items when online via _doProcessQueue', async () => {
      // Test the internal _doProcessQueue directly to avoid navigator.locks issues
      mockToArray.mockResolvedValueOnce([
        {
          id: '1',
          type: 'UNLINK',
          payload: { userId: 'u1' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      await syncService._doProcessQueue();

      expect(mockBulkDelete).toHaveBeenCalledWith(['1']);
    });

    it('does nothing when queue is empty', async () => {
      mockToArray.mockResolvedValueOnce([]);

      await syncService._doProcessQueue();

      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('processes PICKER items via _doProcessQueue', async () => {
      mockToArray.mockResolvedValueOnce([
        {
          id: '2',
          type: 'PICKER',
          payload: {
            id: 'p1',
            picker_id: '402',
            name: 'Liam',
            orchard_id: 'orch-1',
          },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      await syncService._doProcessQueue();

      // Item should be processed and bulk-deleted
      expect(mockBulkDelete).toHaveBeenCalledWith(['2']);
    });

    it('processes QC_INSPECTION items via _doProcessQueue', async () => {
      mockToArray.mockResolvedValueOnce([
        {
          id: '3',
          type: 'QC_INSPECTION',
          payload: {
            orchard_id: 'orch-1',
            picker_id: 'p1',
            inspector_id: 'insp-1',
            grade: 'A',
          },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      await syncService._doProcessQueue();

      expect(mockBulkDelete).toHaveBeenCalledWith(['3']);
    });
  });

  describe('categorizeError', () => {
    it('returns "network" when navigator is offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      const result = syncService.categorizeError(new Error('something'));
      expect(result).toBe('network');
    });

    it('returns "network" for fetch errors', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(syncService.categorizeError(new Error('fetch failed'))).toBe('network');
      expect(syncService.categorizeError(new Error('network error'))).toBe('network');
      expect(syncService.categorizeError(new Error('timeout exceeded'))).toBe('network');
      expect(syncService.categorizeError(new Error('request aborted'))).toBe('network');
    });

    it('returns "server" for server errors', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(syncService.categorizeError(new Error('500 internal server error'))).toBe('server');
      expect(syncService.categorizeError(new Error('502 bad gateway'))).toBe('server');
      expect(syncService.categorizeError(new Error('503 service unavailable'))).toBe('server');
      expect(syncService.categorizeError(new Error('429 too many requests'))).toBe('server');
    });

    it('returns "validation" for constraint errors', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(syncService.categorizeError(new Error('23505 unique constraint violation'))).toBe('validation');
      expect(syncService.categorizeError(new Error('foreign key violation'))).toBe('validation');
      expect(syncService.categorizeError(new Error('optimistic lock failed'))).toBe('validation');
    });

    it('returns "validation" for Supabase error codes starting with 23', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(syncService.categorizeError({ code: '23505' })).toBe('validation');
    });

    it('returns "server" for PGRST error codes', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(syncService.categorizeError({ code: 'PGRST' })).toBe('server');
    });

    it('returns "unknown" for unrecognized errors', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(syncService.categorizeError(new Error('something random'))).toBe('unknown');
      expect(syncService.categorizeError('string error')).toBe('unknown');
      expect(syncService.categorizeError(null)).toBe('unknown');
    });
  });

  describe('getMaxRetryCount', () => {
    it('returns 0 for empty queue', async () => {
      mockToArray.mockResolvedValueOnce([]);
      const max = await syncService.getMaxRetryCount();
      expect(max).toBe(0);
    });

    it('returns the highest retry count', async () => {
      mockToArray.mockResolvedValueOnce([
        { id: '1', type: 'PICKER', payload: {}, timestamp: Date.now(), retryCount: 3 },
        { id: '2', type: 'UNLINK', payload: {}, timestamp: Date.now(), retryCount: 12 },
        { id: '3', type: 'CONTRACT', payload: {}, timestamp: Date.now(), retryCount: 1 },
      ]);
      const max = await syncService.getMaxRetryCount();
      expect(max).toBe(12);
    });
  });

  describe('last sync time', () => {
    it('returns null when no sync has occurred', async () => {
      mockMetaGet.mockResolvedValueOnce(null);
      const time = await syncService.getLastSyncTime();
      expect(time).toBeNull();
    });

    it('returns stored timestamp when available', async () => {
      mockMetaGet.mockResolvedValueOnce({ id: 'lastSync', value: 1700000000000 });
      const time = await syncService.getLastSyncTime();
      expect(time).toBe(1700000000000);
    });

    it('stores last sync time via setLastSyncTime', async () => {
      await syncService.setLastSyncTime();
      expect(mockMetaPut).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lastSync' })
      );
      const storedValue = mockMetaPut.mock.calls[0][0].value;
      expect(typeof storedValue).toBe('number');
    });
  });

  describe('queue item structure', () => {
    it('queue items have all required fields', async () => {
      await syncService.addToQueue('PICKER', {
        id: 'p1',
        picker_id: '402',
        name: 'Test',
        orchard_id: 'orch-1',
      });

      const item = mockPut.mock.calls[0][0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('payload');
      expect(item).toHaveProperty('timestamp');
      expect(item).toHaveProperty('retryCount');
    });

    it('timestamp is a number (epoch ms)', async () => {
      await syncService.addToQueue('UNLINK', { userId: 'u1' });
      const item = mockPut.mock.calls[0][0];
      expect(typeof item.timestamp).toBe('number');
      expect(item.timestamp).toBeGreaterThan(0);
    });
  });
});
