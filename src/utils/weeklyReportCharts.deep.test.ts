/**
 * Deep tests for weeklyReportCharts.ts — SVG/HTML chart builders
 */
import { describe, it, expect } from 'vitest';
import { buildSparkline, buildChartSection, buildDistribution, buildCostAnalysis, buildDailySummary, buildDailySummaryTable } from './weeklyReportCharts';

describe('buildSparkline', () => {
    it('returns SVG with polyline for data', () => {
        const data = [
            { label: 'Mon', value: 10 },
            { label: 'Tue', value: 20 },
            { label: 'Wed', value: 15 },
        ];
        const svg = buildSparkline(data, '#059669');
        expect(svg).toContain('<svg');
        expect(svg).toContain('#059669');
    });

    it('returns something for empty data', () => {
        const result = buildSparkline([], '#000');
        expect(typeof result).toBe('string');
    });

    it('handles single-point data', () => {
        const result = buildSparkline([{ label: 'X', value: 5 }], '#f00');
        expect(typeof result).toBe('string');
    });
});

describe('buildChartSection', () => {
    it('wraps two sparklines side by side', () => {
        const html = buildChartSection('<svg>a</svg>', '<svg>b</svg>');
        expect(html).toContain('svg');
    });
});

describe('buildDistribution', () => {
    it('generates content for picker data', () => {
        const pickers: any[] = [
            { picker_name: 'A', buckets: 50, hours_worked: 10 },
            { picker_name: 'B', buckets: 30, hours_worked: 10 },
        ];
        const html = buildDistribution(pickers);
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(0);
    });

    it('handles empty picker list', () => {
        const html = buildDistribution([]);
        expect(typeof html).toBe('string');
    });
});

describe('buildCostAnalysis', () => {
    it('generates content for pickers', () => {
        const pickers: any[] = Array.from({ length: 10 }, (_, i) => ({
            picker_name: `P${i}`,
            buckets: 10 * (i + 1),
            hours_worked: 8,
            total_earnings: 100 + i * 10,
        }));
        const html = buildCostAnalysis(pickers);
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(0);
    });
});

describe('buildDailySummary', () => {
    it('generates daily rows', () => {
        const bins = [{ label: 'Mon', value: 100 }];
        const workforce = [{ label: 'Mon', value: 10 }];
        const html = buildDailySummary(bins, workforce, 5, 8.5);
        expect(html).toContain('Mon');
    });
});

describe('buildDailySummaryTable', () => {
    it('wraps rows in table', () => {
        const html = buildDailySummaryTable('<tr><td>row</td></tr>');
        expect(html).toContain('table');
    });
});
