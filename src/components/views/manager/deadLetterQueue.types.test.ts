/**
 * deadLetterQueue.types — getErrorTooltip Tests
 */
import { describe, it, expect } from 'vitest';
import { getErrorTooltip, type DeadLetterItem } from './deadLetterQueue.types';

const makeItem = (overrides: Partial<DeadLetterItem> = {}): DeadLetterItem => ({
    id: 'test-1',
    type: 'bucket' as any,
    payload: {},
    timestamp: Date.now(),
    retryCount: 3,
    ...overrides,
});

describe('getErrorTooltip', () => {
    it('detects foreign key violation (23503)', () => {
        const result = getErrorTooltip(makeItem({ errorCode: '23503' }));
        expect(result).toContain('Foreign Key');
    });

    it('detects duplicate (23505)', () => {
        const result = getErrorTooltip(makeItem({ errorCode: '23505' }));
        expect(result).toContain('Duplicate');
    });

    it('detects RLS violation (PGRST116)', () => {
        const result = getErrorTooltip(makeItem({ errorCode: 'PGRST116' }));
        expect(result).toContain('RLS');
    });

    it('detects archived picker', () => {
        const result = getErrorTooltip(makeItem({ failureReason: 'Picker is archived' }));
        expect(result).toContain('Archived');
    });

    it('detects network error', () => {
        const result = getErrorTooltip(makeItem({ failureReason: 'Network Error' }));
        expect(result).toContain('Network');
    });

    it('falls back to failureReason', () => {
        const result = getErrorTooltip(makeItem({ failureReason: 'Custom error message' }));
        expect(result).toBe('Custom error message');
    });

    it('returns Unknown error when no info', () => {
        const result = getErrorTooltip(makeItem({}));
        expect(result).toBe('Unknown error');
    });
});
