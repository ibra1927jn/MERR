/**
 * CostCharts — DonutChart, HBar, KPICard deep render tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DonutChart, HBar, KPICard } from './CostCharts';

describe('DonutChart', () => {
    it('shows Awaiting scan data when total is 0', () => {
        render(<DonutChart pieceRate={0} topUp={0} />);
        expect(screen.getByText('Awaiting scan data')).toBeTruthy();
    });

    it('shows piece rate percentage when data exists', () => {
        render(<DonutChart pieceRate={80} topUp={20} />);
        expect(screen.getByText('80%')).toBeTruthy();
        expect(screen.getByText('Piece Rate')).toBeTruthy();
    });

    it('calculates percentage correctly', () => {
        render(<DonutChart pieceRate={60} topUp={40} />);
        expect(screen.getByText('60%')).toBeTruthy();
    });

    it('handles 100% piece rate', () => {
        render(<DonutChart pieceRate={100} topUp={0} />);
        expect(screen.getByText('100%')).toBeTruthy();
    });
});

describe('HBar', () => {
    it('renders label', () => {
        render(<HBar label="Top-up" value={12.5} max={100} color="bg-amber-400" />);
        expect(screen.getByText('Top-up')).toBeTruthy();
    });

    it('renders value with dollar sign', () => {
        render(<HBar label="Cost" value={25.00} max={100} color="bg-blue-400" />);
        expect(screen.getByText('$25.00')).toBeTruthy();
    });

    it('renders suffix', () => {
        render(<HBar label="Rate" value={5.5} max={10} color="bg-green-400" suffix="/hr" />);
        expect(screen.getByText('$5.50/hr')).toBeTruthy();
    });
});

describe('KPICard', () => {
    it('renders label', () => {
        render(<KPICard icon="payments" label="Total Cost" value="$1,250" gradient="bg-indigo-50" iconColor="text-indigo-600" delay={0} />);
        expect(screen.getByText('Total Cost')).toBeTruthy();
    });

    it('renders value', () => {
        render(<KPICard icon="payments" label="Total Cost" value="$1,250" gradient="bg-indigo-50" iconColor="text-indigo-600" delay={0} />);
        expect(screen.getByText('$1,250')).toBeTruthy();
    });

    it('renders icon', () => {
        render(<KPICard icon="payments" label="Total Cost" value="$1,250" gradient="bg-indigo-50" iconColor="text-indigo-600" delay={0} />);
        expect(screen.getByText('payments')).toBeTruthy();
    });
});
