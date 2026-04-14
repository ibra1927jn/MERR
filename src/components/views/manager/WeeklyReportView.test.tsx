/**
 * WeeklyReportView — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSetSelectedDayMeta = vi.fn();
const mockSetShowExportModal = vi.fn();
const mockOpenProfile = vi.fn();

vi.mock('@/i18n', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'insights.weekly.title': 'Weekly Report',
                'insights.weekly.export': 'Export Report',
                'insights.weekly.team_rankings': 'Team Rankings',
                'insights.weekly.top10': 'Top 10 Pickers',
                'insights.weekly.no_teams': 'No team data',
                'insights.weekly.no_pickers': 'No pickers yet',
                // KPI card labels
                'insights.weekly.total_bins': 'Total Bins',
                'insights.weekly.total_hours': 'Total Hours',
                'insights.weekly.total_labour': 'Total Labour',
                'insights.weekly.avg_bins_hr': 'Avg Bins/Hr',
                'insights.weekly.cost_per_bin': 'Cost/Bin',
                // Chart titles
                'insights.weekly.velocity_title': 'Harvest Velocity',
                'insights.weekly.velocity_subtitle': 'Daily bins produced — 7 day trend',
                'insights.weekly.workforce_title': 'Workforce Size',
                'insights.weekly.workforce_subtitle': 'Active pickers per day',
                'insights.weekly.daily_target': 'Daily Target',
                // Suffixes and counts
                'insights.weekly.pickers_suffix': 'pickers',
                'insights.weekly.bins_suffix': 'bins',
                'insights.weekly.bins_hr_suffix': 'bins/hr',
                'insights.weekly.pickers_count': '{n} pickers',
                'insights.weekly.bins_count': '{n} bins',
            };
            return map[key] ?? key;
        },
        locale: 'en',
        setLocale: () => {},
    }),
}));

vi.mock('@/hooks/useWeeklyReport', () => ({
    useWeeklyReport: () => ({
        isLoading: false,
        orchard: { id: 'o1', name: 'Test Orchard' },
        totalBuckets: 1250,
        totalHours: 480,
        totalEarnings: 9600,
        avgBPA: 2.6,
        costPerBin: 7.68,
        dailyBinTarget: 200,
        binsTrend: [
            { label: 'Mon', value: 180, meta: { date: '2026-03-04', bins: 180, pickers: 12 } },
            { label: 'Tue', value: 200, meta: { date: '2026-03-05', bins: 200, pickers: 14 } },
        ],
        workforceTrend: [
            { label: 'Mon', value: 12 },
            { label: 'Tue', value: 14 },
        ],
        teamRankings: [
            { name: 'Team Alpha', count: 5, bpa: 3.2, buckets: 400, earnings: 2600 },
            { name: 'Team Beta', count: 4, bpa: 2.8, buckets: 280, earnings: 1960 },
        ],
        pickers: [
            { picker_id: 'pk1', picker_name: 'Alice', buckets: 120, hours_worked: 40, total_earnings: 780 },
            { picker_id: 'pk2', picker_name: 'Bob', buckets: 100, hours_worked: 38, total_earnings: 650 },
        ],
        crew: [],
        selectedDayMeta: null,
        setSelectedDayMeta: mockSetSelectedDayMeta,
        showExportModal: false,
        setShowExportModal: mockSetShowExportModal,
        openProfile: mockOpenProfile,
    }),
}));

vi.mock('@/utils/weeklyReportExport', () => ({
    exportCSV: vi.fn(),
    exportPDF: vi.fn(),
}));

vi.mock('@/components/charts/TrendLineChart', () => ({
    TrendLineChart: ({ data, onPointClick }: any) => (
        <div data-testid="trend-chart">
            {data?.map((d: any, i: number) => (
                <span key={i} onClick={() => onPointClick?.(d, i)}>{d.label}: {d.value}</span>
            ))}
        </div>
    ),
    TrendDataPoint: {},
}));

vi.mock('@/components/ui/LoadingSkeleton', () => ({
    default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

vi.mock('./weekly-report', () => ({
    KpiCards: ({ cards }: any) => (
        <div data-testid="kpi-cards">
            {cards.map((c: any) => <span key={c.label}>{c.label}: {c.value}</span>)}
        </div>
    ),
    TrendChartCard: ({ title, data, onPointClick }: any) => (
        <div data-testid="trend-chart-card">
            <span>{title}</span>
            {data?.map((d: any, i: number) => (
                <span key={i} onClick={() => onPointClick?.(d, i)}>{d.label}</span>
            ))}
        </div>
    ),
    DayDetailPanel: ({ meta, onClose }: any) => (
        <div data-testid="day-detail-panel">
            <span>Day: {meta.date}</span>
            <button onClick={onClose}>Close</button>
        </div>
    ),
    ExportModal: ({ onClose, onExportPDF, onExportCSV }: any) => (
        <div data-testid="export-modal">
            <button onClick={onExportPDF}>PDF</button>
            <button onClick={onExportCSV}>CSV</button>
            <button onClick={onClose}>Close Modal</button>
        </div>
    ),
}));

import WeeklyReportView from './WeeklyReportView';

describe('WeeklyReportView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Weekly Report heading', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText('Weekly Report')).toBeTruthy();
    });

    it('renders orchard name in subtitle', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText(/Test Orchard/)).toBeTruthy();
    });

    it('renders Export Report button', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText('Export Report')).toBeTruthy();
    });

    it('renders KPI cards with correct values', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText(/Total Bins: 1250/)).toBeTruthy();
        expect(screen.getByText(/Total Hours: 480h/)).toBeTruthy();
        expect(screen.getByText(/Total Labour: \$9600/)).toBeTruthy();
    });

    it('renders trend chart cards', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText('Harvest Velocity')).toBeTruthy();
        expect(screen.getByText('Workforce Size')).toBeTruthy();
    });

    it('renders team rankings', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText('Team Alpha')).toBeTruthy();
        expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('shows team stats (bpa and buckets)', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText('3.2 bins/hr')).toBeTruthy();
        expect(screen.getByText(/400 bins/)).toBeTruthy();
    });

    it('renders Top 10 Pickers section', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText(/Top 10 Pickers/)).toBeTruthy();
    });

    it('shows picker names and stats', () => {
        render(<WeeklyReportView />);
        expect(screen.getByText('Alice')).toBeTruthy();
        expect(screen.getByText('120 bins')).toBeTruthy();
        expect(screen.getByText('Bob')).toBeTruthy();
    });

    it('calls setShowExportModal when Export Report is clicked', () => {
        render(<WeeklyReportView />);
        fireEvent.click(screen.getByText('Export Report'));
        expect(mockSetShowExportModal).toHaveBeenCalledWith(true);
    });

    it('opens picker profile when picker row is clicked', () => {
        render(<WeeklyReportView />);
        fireEvent.click(screen.getByText('Alice'));
        expect(mockOpenProfile).toHaveBeenCalledWith('pk1');
    });
});
