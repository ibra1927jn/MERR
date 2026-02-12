// =============================================
// SYNC SERVICE TESTS
// =============================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncService } from './sync.service';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock supabase
vi.mock('./supabase', () => ({
    supabase: {
        from: () => ({
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
        }),
    },
}));

// Valid payloads for each type
const SCAN_PAYLOAD = {
    picker_id: 'pk-001',
    orchard_id: 'orchard-001',
    quality_grade: 'A' as const,
    timestamp: '2026-02-12T10:00:00+13:00',
};

const MESSAGE_PAYLOAD = {
    channel_type: 'direct' as const,
    recipient_id: 'user-002',
    sender_id: 'user-001',
    content: 'Hello!',
    timestamp: '2026-02-12T10:00:00+13:00',
};

const ATTENDANCE_PAYLOAD = {
    picker_id: 'pk-002',
    orchard_id: 'orchard-001',
    check_in_time: '2026-02-12T08:00:00+13:00',
};

describe('Sync Service', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    // =============================================
    // QUEUE OPERATIONS
    // =============================================
    describe('addToQueue', () => {
        it('should add an item to the queue', () => {
            syncService.addToQueue('SCAN', SCAN_PAYLOAD);
            expect(syncService.getPendingCount()).toBe(1);
        });

        it('should add multiple items to the queue', () => {
            syncService.addToQueue('SCAN', SCAN_PAYLOAD);
            syncService.addToQueue('MESSAGE', MESSAGE_PAYLOAD);
            syncService.addToQueue('ATTENDANCE', ATTENDANCE_PAYLOAD);
            expect(syncService.getPendingCount()).toBe(3);
        });

        it('should assign unique IDs to each item', () => {
            syncService.addToQueue('SCAN', SCAN_PAYLOAD);
            syncService.addToQueue('SCAN', { ...SCAN_PAYLOAD, picker_id: 'pk-002' });
            const queue = JSON.parse(localStorage.getItem('harvest_sync_queue') || '[]');
            expect(queue[0].id).not.toBe(queue[1].id);
        });

        it('should set retryCount to 0 for new items', () => {
            syncService.addToQueue('SCAN', SCAN_PAYLOAD);
            const queue = JSON.parse(localStorage.getItem('harvest_sync_queue') || '[]');
            expect(queue[0].retryCount).toBe(0);
        });

        it('should include timestamp on each item', () => {
            syncService.addToQueue('SCAN', SCAN_PAYLOAD);
            const queue = JSON.parse(localStorage.getItem('harvest_sync_queue') || '[]');
            expect(queue[0].timestamp).toBeDefined();
            expect(typeof queue[0].timestamp).toBe('number');
        });
    });

    // =============================================
    // PENDING COUNT
    // =============================================
    describe('getPendingCount', () => {
        it('should return 0 when queue is empty', () => {
            expect(syncService.getPendingCount()).toBe(0);
        });

        it('should return correct count after adding items', () => {
            syncService.addToQueue('SCAN', SCAN_PAYLOAD);
            syncService.addToQueue('SCAN', { ...SCAN_PAYLOAD, picker_id: 'pk-002' });
            syncService.addToQueue('SCAN', { ...SCAN_PAYLOAD, picker_id: 'pk-003' });
            expect(syncService.getPendingCount()).toBe(3);
        });
    });

    // =============================================
    // LAST SYNC TIME
    // =============================================
    describe('getLastSyncTime / setLastSyncTime', () => {
        it('should return null when no sync has occurred', () => {
            expect(syncService.getLastSyncTime()).toBeNull();
        });

        it('should store and retrieve last sync time', () => {
            syncService.setLastSyncTime();
            const time = syncService.getLastSyncTime();
            expect(time).not.toBeNull();
            expect(typeof time).toBe('number');
            // Should be within last second
            expect(Date.now() - time!).toBeLessThan(1000);
        });

        it('should update on subsequent calls', () => {
            syncService.setLastSyncTime();
            const first = syncService.getLastSyncTime();
            syncService.setLastSyncTime();
            const second = syncService.getLastSyncTime();
            expect(second).toBeGreaterThanOrEqual(first!);
        });
    });

    // =============================================
    // MAX RETRY COUNT
    // =============================================
    describe('getMaxRetryCount', () => {
        it('should return 0 when queue is empty', () => {
            expect(syncService.getMaxRetryCount()).toBe(0);
        });

        it('should return the highest retry count', () => {
            const queue = [
                { id: '1', type: 'SCAN', payload: SCAN_PAYLOAD, retryCount: 3, timestamp: Date.now() },
                { id: '2', type: 'SCAN', payload: SCAN_PAYLOAD, retryCount: 10, timestamp: Date.now() },
                { id: '3', type: 'SCAN', payload: SCAN_PAYLOAD, retryCount: 1, timestamp: Date.now() },
            ];
            localStorage.setItem('harvest_sync_queue', JSON.stringify(queue));
            expect(syncService.getMaxRetryCount()).toBe(10);
        });
    });

    // =============================================
    // QUEUE TYPE FILTERING
    // =============================================
    describe('queue item types', () => {
        it('should store type correctly for SCAN items', () => {
            syncService.addToQueue('SCAN', SCAN_PAYLOAD);
            const queue = JSON.parse(localStorage.getItem('harvest_sync_queue') || '[]');
            expect(queue[0].type).toBe('SCAN');
        });

        it('should store type correctly for MESSAGE items', () => {
            syncService.addToQueue('MESSAGE', MESSAGE_PAYLOAD);
            const queue = JSON.parse(localStorage.getItem('harvest_sync_queue') || '[]');
            expect(queue[0].type).toBe('MESSAGE');
        });

        it('should store type correctly for ATTENDANCE items', () => {
            syncService.addToQueue('ATTENDANCE', ATTENDANCE_PAYLOAD);
            const queue = JSON.parse(localStorage.getItem('harvest_sync_queue') || '[]');
            expect(queue[0].type).toBe('ATTENDANCE');
        });
    });
});
