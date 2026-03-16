/**
 * useHHRR Hook Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// vi.mock factories must NOT reference top-level const variables (hoisting)
vi.mock('@/services/hhrr.service', () => ({
    fetchHRSummary: vi.fn().mockResolvedValue({ activeWorkers: 10, pendingContracts: 2, payrollThisWeek: 5000, complianceAlerts: 1 }),
    fetchEmployees: vi.fn().mockResolvedValue([{ id: 'e1', name: 'Alice' }]),
    fetchPayroll: vi.fn().mockResolvedValue({ total: 5000 }),
    fetchComplianceAlerts: vi.fn().mockResolvedValue([{ id: 'a1', message: 'Contract expiring' }]),
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { useHHRR } from './useHHRR';

describe('useHHRR', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts with loading state true', () => {
        const { result } = renderHook(() => useHHRR());
        expect(result.current.isLoading).toBe(true);
    });

    it('fetches data on mount and sets loading to false', async () => {
        const { result } = renderHook(() => useHHRR());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.employees).toEqual([{ id: 'e1', name: 'Alice' }]);
        expect(result.current.summary.activeWorkers).toBe(10);
    });

    it('provides a reload function', async () => {
        const { result } = renderHook(() => useHHRR());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(typeof result.current.reload).toBe('function');
    });

    it('provides summary with correct shape', async () => {
        const { result } = renderHook(() => useHHRR());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.summary.pendingContracts).toBe(2);
        expect(result.current.summary.complianceAlerts).toBe(1);
    });
});
