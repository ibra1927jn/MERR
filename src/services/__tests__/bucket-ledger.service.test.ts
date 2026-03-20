/**
 * bucket-ledger.service.test.ts — Unit tests
 *
 * recordBucket delegates to record-bucket Edge Function.
 * getPickerHistory delegates to bucketLedgerRepository.
 *
 * Uses vi.spyOn to mock edgeFunctionsRepository.invoke after import.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// We import the real modules, then spy on their methods
import { edgeFunctionsRepository } from '@/repositories/edge-functions.repository';
import { bucketLedgerRepository } from '@/repositories/bucket-ledger.repository';
import { bucketLedgerService } from '../bucket-ledger.service';

// Valid v4 UUIDs for test data
const VALID_ORCHARD = 'a1111111-1111-4111-a111-111111111111';
const VALID_RUNNER = 'b2222222-2222-4222-b222-222222222222';
const VALID_PICKER = 'c3333333-3333-4333-8333-333333333333';

describe('bucketLedgerService', () => {
    let mockInvoke: ReturnType<typeof vi.spyOn>;
    let mockGetPickerHistory: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.restoreAllMocks();
        mockInvoke = vi.spyOn(edgeFunctionsRepository, 'invoke');
        mockGetPickerHistory = vi.spyOn(bucketLedgerRepository, 'getPickerHistory');
    });

    describe('recordBucket', () => {
        it('records bucket via Edge Function with UUID picker_id', async () => {
            mockInvoke.mockResolvedValue({
                data: { id: 'rec-1', picker_id: VALID_PICKER, scanned_at: '2026-03-04T10:00:00Z', resolved_from_badge: false },
                error: null,
            });

            const result = await bucketLedgerService.recordBucket({
                picker_id: VALID_PICKER,
                orchard_id: VALID_ORCHARD,
                scanned_by: VALID_RUNNER,
                row_number: 1,
            } as never);

            expect(mockInvoke).toHaveBeenCalledWith('record-bucket', {
                picker_id: VALID_PICKER,
                orchard_id: VALID_ORCHARD,
                scanned_by: VALID_RUNNER,
                row_number: 1,
                quality_grade: undefined,
                bin_id: undefined,
                scanned_at: undefined,
            });
            expect(result).toEqual(expect.objectContaining({ id: 'rec-1', picker_id: VALID_PICKER }));
        });

        it('resolves badge ID to picker UUID via Edge Function', async () => {
            mockInvoke.mockResolvedValue({
                data: { id: 'rec-1', picker_id: VALID_PICKER, scanned_at: '2026-03-04T10:00:00Z', resolved_from_badge: true },
                error: null,
            });

            const result = await bucketLedgerService.recordBucket({
                picker_id: 'PKR001',
                orchard_id: VALID_ORCHARD,
                scanned_by: VALID_RUNNER,
                row_number: 1,
            } as never);

            expect(result!.resolved_from_badge).toBe(true);
            expect(result!.picker_id).toBe(VALID_PICKER);
        });

        it('throws when Edge Function returns error', async () => {
            mockInvoke.mockResolvedValue({
                data: null,
                error: { message: 'Unknown badge ID' },
            });

            await expect(
                bucketLedgerService.recordBucket({
                    picker_id: 'UNKNOWN',
                    orchard_id: VALID_ORCHARD,
                    scanned_by: VALID_RUNNER,
                    row_number: 1,
                } as never)
            ).rejects.toThrow('Unknown badge ID');
        });

        it('throws on Edge Function error (RLS / insert failure)', async () => {
            mockInvoke.mockResolvedValue({
                data: null,
                error: { message: 'RLS violation' },
            });

            await expect(
                bucketLedgerService.recordBucket({
                    picker_id: VALID_PICKER,
                    orchard_id: VALID_ORCHARD,
                    scanned_by: VALID_RUNNER,
                } as never)
            ).rejects.toThrow('RLS violation');
        });
    });

    describe('getPickerHistory', () => {
        it('returns bucket records for a picker', async () => {
            const records = [
                { id: 'r-1', scanned_at: '2026-03-04T10:00:00Z' },
                { id: 'r-2', scanned_at: '2026-03-04T09:00:00Z' },
            ];
            mockGetPickerHistory.mockResolvedValue(records);

            const result = await bucketLedgerService.getPickerHistory('p-1');
            expect(result).toHaveLength(2);
            expect(mockGetPickerHistory).toHaveBeenCalledWith('p-1');
        });

        it('throws on error', async () => {
            mockGetPickerHistory.mockRejectedValue(new Error('DB error'));
            await expect(bucketLedgerService.getPickerHistory('p-1')).rejects.toThrow('DB error');
        });
    });
});


