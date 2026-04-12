/**
 * ContractsTab — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUpdateContract = vi.fn();

vi.mock('@/services/hhrr.service', () => ({
    updateContract: (...args: unknown[]) => mockUpdateContract(...args),
}));

vi.mock('@/components/ui/FilterBar', () => ({
    default: ({ searchPlaceholder, searchValue, onSearchChange }: any) => (
        <input
            data-testid="filter-bar"
            placeholder={searchPlaceholder}
            value={searchValue || ''}
            onChange={(e: any) => onSearchChange(e.target.value)}
        />
    ),
}));

vi.mock('@/components/ui/InlineEdit', () => ({
    default: ({ value }: any) => <span data-testid="inline-edit">{value}</span>,
}));

import ContractsTab from './ContractsTab';

const makeEmployee = (id: string, name: string, contractType: string, contractEnd: string, status = 'active') => ({
    id, name, email: `${name.toLowerCase()}@test.com`, role: 'picker',
    contract_type: contractType,
    contract_start: '2025-01-01',
    contract_end: contractEnd,
    hourly_rate: 23.95,
    status,
    visa_status: 'citizen',
}) as any;

const makeSummary = () => ({
    totalEmployees: 3,
    activeContracts: 2,
    expiringContracts: 1,
    totalPayroll: 5000,
}) as any;

describe('ContractsTab', () => {
    const employees = [
        makeEmployee('e1', 'Alice', 'permanent', '2027-12-31'),
        makeEmployee('e2', 'Bob', 'seasonal', '2026-04-30'),
        makeEmployee('e3', 'Charlie', 'casual', '2026-03-15', 'terminated'),
    ];

    const defaultProps = {
        employees,
        summary: makeSummary(),
        onRefresh: vi.fn(),
    };

    beforeEach(() => vi.clearAllMocks());

    it('renders contract type badges', () => {
        render(<ContractsTab {...defaultProps} />);
        expect(screen.getByText('permanent')).toBeTruthy();
        expect(screen.getByText('seasonal')).toBeTruthy();
    });

    it('renders filter bar', () => {
        render(<ContractsTab {...defaultProps} />);
        expect(screen.getByTestId('filter-bar')).toBeTruthy();
    });

    it('shows Renew button for active contracts', () => {
        render(<ContractsTab {...defaultProps} />);
        const renewBtns = screen.getAllByText('Renew');
        expect(renewBtns.length).toBeGreaterThanOrEqual(1);
    });

    it('shows Terminate button for active contracts', () => {
        render(<ContractsTab {...defaultProps} />);
        const terminateBtns = screen.getAllByText('Terminate');
        expect(terminateBtns.length).toBeGreaterThanOrEqual(1);
    });

    it('calls updateContract on Renew', async () => {
        mockUpdateContract.mockResolvedValue(undefined);
        render(<ContractsTab {...defaultProps} />);
        const renewBtns = screen.getAllByText('Renew');
        fireEvent.click(renewBtns[0]);
        await waitFor(() => expect(mockUpdateContract).toHaveBeenCalled());
    });

    it('shows contract end dates', () => {
        render(<ContractsTab {...defaultProps} />);
        expect(screen.getByText(/2027/)).toBeTruthy();
    });

    it('renders with empty employees', () => {
        render(<ContractsTab employees={[]} summary={makeSummary()} />);
        expect(screen.getByTestId('filter-bar')).toBeTruthy();
    });
});
