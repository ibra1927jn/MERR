/**
 * CostAnalyticsView — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@/i18n';

const mockSetSelectedDayMeta = vi.fn();
const mockOpenProfile = vi.fn();

vi.mock('@/hooks/useCostAnalytics', () => ({
    useCostAnalytics: () => ({
        isLoading: false,
        costPerBin: 7.45,
        totalBuckets: 1800,
        totalEarnings: 13400,
        totalTopUp: 850,
        totalPieceRate: 12550,
        breakEven: 8.00,
        costTrend: [
            { label: 'Mon', value: 7.2, meta: { date: '2026-03-04' } },
            { label: 'Tue', value: 7.8, meta: { date: '2026-03-05' } },
        ],
        teamCosts: [
            { teamLeader: 'Team Alpha', costPerBin: 6.80 },
            { teamLeader: 'Team Beta', costPerBin: 8.20 },
        ],
        maxCostPerBin: 8.20,
        sortedByEfficiency: [
            { picker_id: 'pk1', picker_name: 'Alice', buckets: 200, total_earnings: 1200, hours_worked: 8.0 },
            { picker_id: 'pk2', picker_name: 'Bob', buckets: 150, total_earnings: 1050, hours_worked: 7.5 },
            { picker_id: 'pk3', picker_name: 'Charlie', buckets: 80, total_earnings: 720, hours_worked: 6.0 },
            { picker_id: 'pk4', picker_name: 'Diana', buckets: 60, total_earnings: 600, hours_worked: 5.5 },
            { picker_id: 'pk5', picker_name: 'Eve', buckets: 40, total_earnings: 440, hours_worked: 5.0 },
            { picker_id: 'pk6', picker_name: 'Frank', buckets: 30, total_earnings: 390, hours_worked: 4.5 },
        ],
        selectedDayMeta: null,
        setSelectedDayMeta: mockSetSelectedDayMeta,
        openProfile: mockOpenProfile,
    }),
}));

vi.mock('@/components/charts/TrendLineChart', () => ({
    TrendLineChart: ({ data, onPointClick }: any) => (
        <div data-testid="trend-line-chart">
            {data?.map((d: any, i: number) => (
                <span key={i} onClick={() => onPointClick?.(d)}>{d.label}: ${d.value}</span>
            ))}
        </div>
    ),
}));

vi.mock('./weekly-report', () => ({
    DayDetailPanel: ({ meta, onClose }: any) => (
        <div data-testid="day-detail-panel">
            <span>Day: {meta.date}</span>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

vi.mock('@/components/ui/LoadingSkeleton', () => ({
    default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

vi.mock('./cost-analytics', () => ({
    DonutChart: ({ pieceRate, topUp }: any) => (
        <div data-testid="donut-chart">Piece: ${pieceRate}, TopUp: ${topUp}</div>
    ),
    HBar: ({ label, value }: any) => (
        <div data-testid="hbar">{label}: ${value.toFixed(2)}</div>
    ),
    KPICard: ({ label, value }: any) => (
        <div data-testid="kpi-card">{label}: {value}</div>
    ),
}));

import CostAnalyticsView from './CostAnalyticsView';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
);

describe('CostAnalyticsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders KPI cards with correct values', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('COST/BIN: $7.45')).toBeTruthy();
        expect(screen.getByText('TOTAL BINS: 1800')).toBeTruthy();
        expect(screen.getByText('TOTAL LABOUR: $13400')).toBeTruthy();
        expect(screen.getByText('MIN WAGE TOP-UP: $850')).toBeTruthy();
    });

    it('renders Cost Breakdown section', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('Cost Breakdown')).toBeTruthy();
    });

    it('renders donut chart with piece rate and top-up', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByTestId('donut-chart')).toBeTruthy();
    });

    it('renders piece rate and top-up breakdown labels', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('Piece Rate Earnings')).toBeTruthy();
        expect(screen.getByText('Minimum Wage Top-Up')).toBeTruthy();
    });

    it('renders Cost Per Bin trend chart', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText(/Cost Per Bin — 7 Day Trend/)).toBeTruthy();
    });

    it('renders Cost Per Team section', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('Cost Per Team')).toBeTruthy();
    });

    it('renders team cost bars', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('Team Alpha: $6.80')).toBeTruthy();
        expect(screen.getByText('Team Beta: $8.20')).toBeTruthy();
    });

    it('renders Most Efficient section', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('Most Efficient')).toBeTruthy();
    });

    it('renders Least Efficient section', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('Least Efficient')).toBeTruthy();
    });

    it('shows efficient pickers (top 5)', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('Alice')).toBeTruthy();
        // Bob appears in both Most/Least Efficient panels
        expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    });

    it('shows cost per bin for efficient pickers', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByText('$6.00/bin')).toBeTruthy(); // Alice: 1200/200
    });

    it('calls openProfile when picker is clicked', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        fireEvent.click(screen.getByText('Alice'));
        expect(mockOpenProfile).toHaveBeenCalledWith('pk1');
    });

    it('renders trend chart with data points', () => {
        render(<CostAnalyticsView />, { wrapper: Wrapper });
        expect(screen.getByTestId('trend-line-chart')).toBeTruthy();
    });
});
