/**
 * SeasonalPlanningTab — Deep render tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/FilterBar', () => ({
    default: ({ searchPlaceholder }: any) => (
        <input data-testid="filter-bar" placeholder={searchPlaceholder} />
    ),
}));

import SeasonalPlanningTab from './SeasonalPlanningTab';

const makeEmployee = (id: string, name: string, contractType: string, contractEnd: string) => ({
    id, name, email: `${name.toLowerCase()}@test.com`,
    role: 'picker', status: 'active',
    contract_type: contractType,
    contract_start: '2025-01-01',
    contract_end: contractEnd,
    hourly_rate: 23.95,
    visa_status: 'citizen',
}) as any;

describe('SeasonalPlanningTab', () => {
    const employees = [
        makeEmployee('e1', 'Alice', 'permanent', '2027-12-31'),
        makeEmployee('e2', 'Bob', 'seasonal', '2026-04-15'),
        makeEmployee('e3', 'Charlie', 'casual', '2026-03-20'),
    ];

    it('renders Contract Expiry Forecast section', () => {
        render(<SeasonalPlanningTab employees={employees} />);
        expect(screen.getByText('Contract Expiry Forecast')).toBeTruthy();
    });

    it('renders filter bar', () => {
        render(<SeasonalPlanningTab employees={employees} />);
        expect(screen.getByTestId('filter-bar')).toBeTruthy();
    });

    it('renders with empty employees', () => {
        render(<SeasonalPlanningTab employees={[]} />);
        expect(screen.getByText('Contract Expiry Forecast')).toBeTruthy();
    });
});
