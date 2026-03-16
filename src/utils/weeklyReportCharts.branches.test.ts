/**
 * Deep tests for weeklyReportCharts.ts (160L) — exercises all 6 functions
 */
import { describe, it, expect } from 'vitest';

import {
    buildSparkline,
    buildChartSection,
    buildDistribution,
    buildCostAnalysis,
    buildDailySummary,
    buildDailySummaryTable,
} from './weeklyReportCharts';

describe('weeklyReportCharts — deep tests', () => {
    describe('buildSparkline', () => {
        it('returns empty for < 2 data points', () => {
            expect(buildSparkline([{ label: 'Mon', value: 10 }], '#000')).toBe('');
        });

        it('returns SVG for 2+ points', () => {
            const data = [{ label: 'Mon', value: 10 }, { label: 'Tue', value: 20 }, { label: 'Wed', value: 15 }];
            const svg = buildSparkline(data, '#059669');
            expect(svg).toContain('<svg');
            expect(svg).toContain('Mon');
            expect(svg).toContain('#059669');
        });

        it('handles flat data (same values)', () => {
            expect(buildSparkline([{ label: 'A', value: 5 }, { label: 'B', value: 5 }], '#000')).toContain('<svg');
        });
    });

    describe('buildChartSection', () => {
        it('wraps two SVGs', () => {
            const html = buildChartSection('<svg>bins</svg>', '<svg>wf</svg>');
            expect(html).toContain('Harvest Velocity');
            expect(html).toContain('Workforce Size');
        });
    });

    describe('buildDistribution', () => {
        it('returns histogram', () => {
            const pickers = [
                { picker_name: 'A', buckets: 24, hours_worked: 8, total_earnings: 156, piece_earnings: 156, top_up_amount: 0, rate_per_hour: 19.5 },
            ] as any[];
            expect(buildDistribution(pickers)).toContain('Excellent');
        });

        it('handles empty', () => {
            expect(buildDistribution([])).toContain('0');
        });
    });

    describe('buildCostAnalysis', () => {
        it('returns cost tables', () => {
            const pickers = [
                { picker_name: 'A', buckets: 100, hours_worked: 8, total_earnings: 650, piece_earnings: 650, top_up_amount: 0, rate_per_hour: 81.25 },
            ] as any[];
            expect(buildCostAnalysis(pickers)).toContain('Most Efficient');
        });

        it('handles empty', () => expect(buildCostAnalysis([])).toContain('Most Efficient'));
    });

    describe('buildDailySummary', () => {
        it('returns daily rows', () => {
            const bins = [{ label: 'Mon', value: 100 }];
            const wf = [{ label: 'Mon', value: 10 }];
            expect(buildDailySummary(bins, wf, 5, 6.50)).toContain('Mon');
        });
    });

    describe('buildDailySummaryTable', () => {
        it('wraps rows in table', () => {
            expect(buildDailySummaryTable('<tr><td>Test</td></tr>')).toContain('Cost/Bin');
        });
    });
});
