/**
 * DayDetailPanel — Day detail metrics panel tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DayDetailPanel from './DayDetailPanel';

const meta = {
    date: '2026-03-05',
    orchardName: 'Test Orchard',
    totalPickers: 12,
    totalBuckets: 450,
    totalTons: 5.8,
    costPerBin: 3.25,
    topUpCost: 120,
    teams: [
        { name: 'Team Alpha', pickers: 6, buckets: 280 },
        { name: 'Team Beta', pickers: 4, buckets: 170 },
    ],
} as any;

describe('DayDetailPanel', () => {
    const onClose = vi.fn();

    it('renders KPI labels', () => {
        render(<DayDetailPanel meta={meta} onClose={onClose} />);
        expect(screen.getByText('Pickers')).toBeTruthy();
        expect(screen.getByText('Buckets')).toBeTruthy();
        expect(screen.getByText('Tons')).toBeTruthy();
        expect(screen.getByText('Cost/Bin')).toBeTruthy();
        expect(screen.getByText('Top-Up')).toBeTruthy();
    });

    it('renders KPI values', () => {
        render(<DayDetailPanel meta={meta} onClose={onClose} />);
        expect(screen.getByText('12')).toBeTruthy();
        expect(screen.getByText('450')).toBeTruthy();
        expect(screen.getByText('5.8')).toBeTruthy();
        expect(screen.getByText('$3.25')).toBeTruthy();
        expect(screen.getByText('$120')).toBeTruthy();
    });

    it('renders orchard name', () => {
        render(<DayDetailPanel meta={meta} onClose={onClose} />);
        expect(screen.getByText('Test Orchard')).toBeTruthy();
    });

    it('renders team bars', () => {
        render(<DayDetailPanel meta={meta} onClose={onClose} />);
        expect(screen.getByText('Team Alpha')).toBeTruthy();
        expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('renders Teams on Site heading', () => {
        render(<DayDetailPanel meta={meta} onClose={onClose} />);
        expect(screen.getByText('Teams on Site')).toBeTruthy();
    });

    it('calls onClose when close button clicked', () => {
        render(<DayDetailPanel meta={meta} onClose={onClose} />);
        fireEvent.click(screen.getByText('close'));
        expect(onClose).toHaveBeenCalled();
    });

    it('renders dash for missing values', () => {
        const emptyMeta = { date: '2026-03-05' } as any;
        render(<DayDetailPanel meta={emptyMeta} onClose={onClose} />);
        const dashes = screen.getAllByText('—');
        expect(dashes.length).toBeGreaterThan(0);
    });
});
