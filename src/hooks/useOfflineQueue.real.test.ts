/**
 * useOfflineQueue — Tests for retry logic and queue processing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockToArray, mockDelete, mockUpdate, mockUnassign } = vi.hoisted(() => ({
    mockToArray: vi.fn(),
    mockDelete: vi.fn(),
    mockUpdate: vi.fn(),
    mockUnassign: vi.fn(),
}));

vi.mock('@/services/db', () => ({
    db: {
        sync_queue: {
            where: () => ({
                equals: () => ({
                    toArray: mockToArray,
                }),
            }),
            delete: mockDelete,
            update: mockUpdate,
        },
    },
}));

vi.mock('@/services/user.service', () => ({
    userService: {
        unassignUserFromOrchard: mockUnassign,
    },
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { useOfflineQueue } from './useOfflineQueue';

describe('useOfflineQueue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockToArray.mockResolvedValue([]);
        mockDelete.mockResolvedValue(undefined);
        mockUpdate.mockResolvedValue(undefined);
        mockUnassign.mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    });

    it('processes pending UNLINK items on mount when online', async () => {
        mockToArray.mockResolvedValue([
            { id: 'q1', type: 'UNLINK', payload: { userId: 'u1' }, retryCount: 0 },
        ]);

        const fetchGlobalData = vi.fn();
        renderHook(() => useOfflineQueue(fetchGlobalData));

        await vi.waitFor(() => {
            expect(mockUnassign).toHaveBeenCalledWith('u1');
        });
        expect(mockDelete).toHaveBeenCalledWith('q1');
        expect(fetchGlobalData).toHaveBeenCalled();
    });

    it('does not process when offline', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        mockToArray.mockResolvedValue([
            { id: 'q1', type: 'UNLINK', payload: { userId: 'u1' } },
        ]);

        const fetchGlobalData = vi.fn();
        renderHook(() => useOfflineQueue(fetchGlobalData));

        await new Promise(r => setTimeout(r, 50));
        expect(mockUnassign).not.toHaveBeenCalled();
    });

    it('skips when queue is empty', async () => {
        mockToArray.mockResolvedValue([]);
        const fetchGlobalData = vi.fn();
        renderHook(() => useOfflineQueue(fetchGlobalData));

        await new Promise(r => setTimeout(r, 50));
        expect(mockUnassign).not.toHaveBeenCalled();
        expect(fetchGlobalData).not.toHaveBeenCalled();
    });

    it('increments retryCount on failure', async () => {
        mockToArray.mockResolvedValue([
            { id: 'q1', type: 'UNLINK', payload: { userId: 'u1' }, retryCount: 1 },
        ]);
        mockUnassign.mockRejectedValue(new Error('Network error'));

        const fetchGlobalData = vi.fn();
        renderHook(() => useOfflineQueue(fetchGlobalData));

        await vi.waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('q1', { retryCount: 2 });
        });
    });

    it('gives up after 3 retries', async () => {
        mockToArray.mockResolvedValue([
            { id: 'q1', type: 'UNLINK', payload: { userId: 'u1' }, retryCount: 3 },
        ]);
        mockUnassign.mockRejectedValue(new Error('Persistent error'));

        const fetchGlobalData = vi.fn();
        renderHook(() => useOfflineQueue(fetchGlobalData));

        await vi.waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith('q1');
        });
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('processes multiple items sequentially', async () => {
        mockToArray.mockResolvedValue([
            { id: 'q1', type: 'UNLINK', payload: { userId: 'u1' }, retryCount: 0 },
            { id: 'q2', type: 'UNLINK', payload: { userId: 'u2' }, retryCount: 0 },
        ]);

        const fetchGlobalData = vi.fn();
        renderHook(() => useOfflineQueue(fetchGlobalData));

        await vi.waitFor(() => {
            expect(mockUnassign).toHaveBeenCalledTimes(2);
        });
        expect(mockDelete).toHaveBeenCalledTimes(2);
        expect(fetchGlobalData).toHaveBeenCalledTimes(1);
    });
});
