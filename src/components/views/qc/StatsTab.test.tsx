/**
 * StatsTab — Deep render tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./DistributionBar', () => ({
    default: ({ distribution }: any) => (
        <div data-testid="distribution-bar">
            A:{distribution.A} B:{distribution.B} C:{distribution.C} R:{distribution.reject}
        </div>
    ),
}));

vi.mock('@/components/ui/EmptyState', () => ({
    default: ({ title, subtitle }: any) => (
        <div data-testid="empty-state">
            <span>{title}</span>
            <span>{subtitle}</span>
        </div>
    ),
}));

import StatsTab from './StatsTab';

describe('StatsTab', () => {
    const distribution = { A: 50, B: 25, C: 15, reject: 10, total: 100 };

    it('renders Grade Distribution heading', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByText('Grade Distribution')).toBeTruthy();
    });

    it('renders DistributionBar component', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByTestId('distribution-bar')).toBeTruthy();
    });

    it('shows grade counts', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByText('50')).toBeTruthy();
        expect(screen.getByText('25')).toBeTruthy();
        expect(screen.getByText('15')).toBeTruthy();
        expect(screen.getByText('10')).toBeTruthy();
    });

    it('shows grade labels', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByText('Grade A')).toBeTruthy();
        expect(screen.getByText('Grade B')).toBeTruthy();
        expect(screen.getByText('Grade C')).toBeTruthy();
        expect(screen.getByText('Reject')).toBeTruthy();
    });

    it('shows percentages', () => {
        render(<StatsTab distribution={distribution} />);
        // 50% and 10% appear in both grade breakdown and summary
        expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('25%').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('15%').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('10%').length).toBeGreaterThanOrEqual(1);
    });

    it('shows Summary section', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByText('Summary')).toBeTruthy();
    });

    it('shows Total Inspections', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByText('Total Inspections')).toBeTruthy();
        expect(screen.getByText('100')).toBeTruthy();
    });

    it('shows Export Quality percentage', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByText('Export Quality (A)')).toBeTruthy();
    });

    it('shows Rejection Rate', () => {
        render(<StatsTab distribution={distribution} />);
        expect(screen.getByText('Rejection Rate')).toBeTruthy();
    });

    it('shows empty state when total is 0', () => {
        render(<StatsTab distribution={{ A: 0, B: 0, C: 0, reject: 0, total: 0 }} />);
        expect(screen.getByTestId('empty-state')).toBeTruthy();
        expect(screen.getByText('Grade distribution analytics')).toBeTruthy();
    });
});
