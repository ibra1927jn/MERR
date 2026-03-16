/**
 * HistoryTab — Deep render tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HistoryTab from './HistoryTab';

const makeLog = (id: string, tractor: string, driver: string, from: string, to: string, bins: number, minutes: number) => ({
    id, tractor_name: tractor, driver_name: driver,
    from_zone: from, to_zone: to,
    bins_count: bins, duration_minutes: minutes,
    started_at: '2026-03-10T08:30:00',
}) as any;

describe('HistoryTab', () => {
    const history = [
        makeLog('l1', 'Tractor Alpha', 'John', 'A1', 'Warehouse', 8, 12),
        makeLog('l2', 'Tractor Beta', 'Jane', 'B1', 'Warehouse', 5, 8),
    ];

    it('renders Transport Log heading', () => {
        render(<HistoryTab history={history} />);
        expect(screen.getByText("Today's Transport Log")).toBeTruthy();
    });

    it('shows trip count', () => {
        render(<HistoryTab history={history} />);
        expect(screen.getByText('2 trips completed')).toBeTruthy();
    });

    it('renders tractor names', () => {
        render(<HistoryTab history={history} />);
        expect(screen.getByText('Tractor Alpha')).toBeTruthy();
        expect(screen.getByText('Tractor Beta')).toBeTruthy();
    });

    it('renders from zones', () => {
        render(<HistoryTab history={history} />);
        expect(screen.getByText('A1')).toBeTruthy();
        expect(screen.getByText('B1')).toBeTruthy();
    });

    it('renders bins count', () => {
        render(<HistoryTab history={history} />);
        expect(screen.getByText('8 bins')).toBeTruthy();
        expect(screen.getByText('5 bins')).toBeTruthy();
    });

    it('renders duration', () => {
        render(<HistoryTab history={history} />);
        expect(screen.getByText('12 min')).toBeTruthy();
        expect(screen.getByText('8 min')).toBeTruthy();
    });

    it('renders with empty history', () => {
        render(<HistoryTab history={[]} />);
        expect(screen.getByText('0 trips completed')).toBeTruthy();
    });
});
