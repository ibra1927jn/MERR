/**
 * KpiCards — Summary metric cards tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KpiCards from './KpiCards';

const cards = [
    { icon: 'payments', label: 'Total Cost', value: '$1,250', gradient: 'from-indigo-50', iconBg: 'bg-indigo-100' },
    { icon: 'inventory_2', label: 'Total Bins', value: '450', gradient: 'from-emerald-50', iconBg: 'bg-emerald-100' },
    { icon: 'schedule', label: 'Avg Hours', value: '6.5h', gradient: 'from-amber-50', iconBg: 'bg-amber-100' },
];

describe('KpiCards', () => {
    it('renders all card labels', () => {
        render(<KpiCards cards={cards} />);
        expect(screen.getByText('Total Cost')).toBeTruthy();
        expect(screen.getByText('Total Bins')).toBeTruthy();
        expect(screen.getByText('Avg Hours')).toBeTruthy();
    });

    it('renders all card values', () => {
        render(<KpiCards cards={cards} />);
        expect(screen.getByText('$1,250')).toBeTruthy();
        expect(screen.getByText('450')).toBeTruthy();
        expect(screen.getByText('6.5h')).toBeTruthy();
    });

    it('renders icons', () => {
        render(<KpiCards cards={cards} />);
        expect(screen.getByText('payments')).toBeTruthy();
        expect(screen.getByText('inventory_2')).toBeTruthy();
    });

    it('renders empty grid when no cards', () => {
        const { container } = render(<KpiCards cards={[]} />);
        const grid = container.querySelector('.grid');
        expect(grid?.children.length).toBe(0);
    });
});
