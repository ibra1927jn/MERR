/**
 * useQC Hook Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/services/qc.service', () => ({
    qcService: {
        getInspections: vi.fn().mockResolvedValue([
            { id: 'i1', picker_id: 'p1', quality_grade: 'A' },
            { id: 'i2', picker_id: 'p2', quality_grade: 'B' },
        ]),
        submitGrade: vi.fn().mockResolvedValue({ id: 'i3' }),
        uploadPhoto: vi.fn().mockResolvedValue('https://cdn.example.com/photo.jpg'),
    },
}));

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: vi.fn((selector?: (s: any) => unknown) => {
        const state = {
            crew: [
                { id: 'p1', name: 'Alice', picker_id: '101', total_buckets_today: 10 },
                { id: 'p2', name: 'Bob', picker_id: '102', total_buckets_today: 5 },
            ],
            orchard: { id: 'o1', name: 'Test Orchard' },
        };
        if (typeof selector === 'function') return selector(state);
        return state;
    }),
}));

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ appUser: { id: 'u1', role: 'qc_inspector' } }),
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { useQC } from './useQC';

describe('useQC', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('provides crew data from store', () => {
        const { result } = renderHook(() => useQC());
        expect(result.current.crew).toHaveLength(2);
        expect(result.current.crew[0].name).toBe('Alice');
    });

    it('provides orchardId from store', () => {
        const { result } = renderHook(() => useQC());
        expect(result.current.orchardId).toBe('o1');
    });

    it('has initial state values', () => {
        const { result } = renderHook(() => useQC());
        expect(result.current.selectedPicker).toBeNull();
        expect(result.current.notes).toBe('');
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.lastGrade).toBeNull();
    });

    it('provides loadInspections function', () => {
        const { result } = renderHook(() => useQC());
        expect(typeof result.current.loadInspections).toBe('function');
    });

    it('provides handleGrade function', () => {
        const { result } = renderHook(() => useQC());
        expect(typeof result.current.handleGrade).toBe('function');
    });

    it('setSelectedPicker updates picker', () => {
        const { result } = renderHook(() => useQC());
        act(() => {
            result.current.setSelectedPicker(result.current.crew[0]);
        });
        expect(result.current.selectedPicker).toStrictEqual(result.current.crew[0]);
    });

    it('setNotes updates notes', () => {
        const { result } = renderHook(() => useQC());
        act(() => {
            result.current.setNotes('Test note');
        });
        expect(result.current.notes).toBe('Test note');
    });
});
