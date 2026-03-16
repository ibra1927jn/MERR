/**
 * DeadLetterQueueView — Component Tests
 * All mocks inlined to avoid vi.mock hoisting issues
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/services/db', () => ({
    db: {
        dead_letter_queue: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            delete: vi.fn().mockResolvedValue(undefined),
            clear: vi.fn().mockResolvedValue(undefined),
            bulkDelete: vi.fn().mockResolvedValue(undefined),
            filter: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        },
        sync_queue: {
            where: vi.fn().mockReturnValue({ above: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) }),
            put: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            update: vi.fn().mockResolvedValue(undefined),
            filter: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
            bulkDelete: vi.fn().mockResolvedValue(undefined),
        },
    },
}));

vi.mock('@/services/sync.service', () => ({
    syncService: { processQueue: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import DeadLetterQueueView from './DeadLetterQueueView';
import { db } from '@/services/db';

describe('DeadLetterQueueView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(db.dead_letter_queue.toArray).mockResolvedValue([]);
        vi.mocked(db.sync_queue.where).mockReturnValue({
            above: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        } as any);
    });

    it('renders title', () => {
        render(<DeadLetterQueueView />);
        expect(screen.getByText('Dead Letter Queue')).toBeTruthy();
    });

    it('renders "All Clear" when no errors', async () => {
        render(<DeadLetterQueueView />);
        await waitFor(() => expect(screen.getByText('All Clear!')).toBeTruthy());
    });

    it('shows critical errors when retryCount >= 50', async () => {
        vi.mocked(db.dead_letter_queue.toArray).mockResolvedValueOnce([
            { id: 'dlq-1', type: 'bucket', payload: {}, timestamp: Date.now(), retryCount: 55, failureReason: 'test', errorCode: '23503', movedAt: Date.now() },
        ] as any);

        render(<DeadLetterQueueView />);
        await waitFor(() => expect(screen.getByText('Critical Errors')).toBeTruthy());
    });

    it('shows warnings when 10 < retryCount < 50', async () => {
        vi.mocked(db.dead_letter_queue.toArray).mockResolvedValueOnce([
            { id: 'dlq-2', type: 'bucket', payload: {}, timestamp: Date.now(), retryCount: 25, failureReason: 'warn' },
        ] as any);

        render(<DeadLetterQueueView />);
        await waitFor(() => expect(screen.getByText('Warnings')).toBeTruthy());
    });

    it('shows Discard All button when errors exist', async () => {
        vi.mocked(db.dead_letter_queue.toArray).mockResolvedValueOnce([
            { id: 'dlq-3', type: 'bucket', payload: {}, timestamp: Date.now(), retryCount: 60, movedAt: Date.now() },
        ] as any);

        render(<DeadLetterQueueView />);
        await waitFor(() => expect(screen.getByText(/Discard All/)).toBeTruthy());
    });
});
