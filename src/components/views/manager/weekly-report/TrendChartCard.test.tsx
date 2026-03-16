/**
 * TrendChartCard — Styled wrapper for TrendLineChart tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/charts/TrendLineChart', () => ({
    TrendLineChart: (props: any) => <div data-testid="trend-line-chart">Chart {props.valueSuffix}</div>,
}));

import TrendChartCard from './TrendChartCard';

const defaultProps = {
    title: 'Harvest Velocity',
    subtitle: '7-day trend',
    icon: 'trending_up',
    colorTheme: 'emerald' as const,
    iconBgClass: 'bg-emerald-100',
    iconTextClass: 'text-emerald-600',
    bgIconClass: 'text-emerald-200',
    data: [{ label: 'Mon', value: 42 }],
    valueSuffix: ' bins',
    staggerClass: 'stagger-1',
    onPointClick: vi.fn(),
};

describe('TrendChartCard', () => {
    it('renders title', () => {
        render(<TrendChartCard {...defaultProps} />);
        expect(screen.getByText('Harvest Velocity')).toBeTruthy();
    });

    it('renders subtitle', () => {
        render(<TrendChartCard {...defaultProps} />);
        expect(screen.getByText('7-day trend')).toBeTruthy();
    });

    it('renders TrendLineChart with suffix', () => {
        render(<TrendChartCard {...defaultProps} />);
        expect(screen.getByTestId('trend-line-chart')).toBeTruthy();
    });

    it('renders icon', () => {
        render(<TrendChartCard {...defaultProps} />);
        const icons = screen.getAllByText('trending_up');
        expect(icons.length).toBeGreaterThan(0);
    });
});
