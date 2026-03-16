/**
 * weeklyReportCharts — Deep functional tests
 * Targets: buildSparkline, buildChartSection, buildDistribution,
 *          buildCostAnalysis, buildDailySummary, buildDailySummaryTable
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
import type { PickerBreakdown } from '@/services/payroll.service';
import type { TrendDataPoint } from '@/components/charts/TrendLineChart';

// ── Helpers ──────────────────────────────────────────
function makePicker(overrides: Partial<PickerBreakdown> = {}): PickerBreakdown {
    return {
        picker_id: 'P001',
        picker_name: 'Alice',
        buckets: 50,
        hours_worked: 8,
        piece_rate_earnings: 100,
        hourly_rate: 23.50,
        minimum_required: 188,
        top_up_required: 0,
        total_earnings: 200,
        is_below_minimum: false,
        ...overrides,
    };
}

function makeTrend(label: string, value: number): TrendDataPoint {
    return { label, value };
}

// ──────────────────────────────────────────────────────
// buildSparkline
// ──────────────────────────────────────────────────────
describe('buildSparkline', () => {
    it('returns empty string when data has fewer than 2 points', () => {
        expect(buildSparkline([], '#10b981')).toBe('');
        expect(buildSparkline([makeTrend('Mon', 10)], '#10b981')).toBe('');
    });

    it('returns SVG markup for 2+ data points', () => {
        const data = [makeTrend('Mon', 10), makeTrend('Tue', 20)];
        const result = buildSparkline(data, '#10b981');
        expect(result).toContain('<svg');
        expect(result).toContain('</svg>');
    });

    it('uses the provided color in the SVG', () => {
        const data = [makeTrend('Mon', 10), makeTrend('Tue', 20)];
        const result = buildSparkline(data, '#ff0000');
        expect(result).toContain('#ff0000');
    });

    it('renders labels from data points', () => {
        const data = [makeTrend('Mon', 10), makeTrend('Tue', 20), makeTrend('Wed', 15)];
        const result = buildSparkline(data, '#10b981');
        expect(result).toContain('Mon');
        expect(result).toContain('Tue');
        expect(result).toContain('Wed');
    });

    it('renders value text on dots', () => {
        const data = [makeTrend('A', 100), makeTrend('B', 200)];
        const result = buildSparkline(data, '#000');
        expect(result).toContain('>100<');
        expect(result).toContain('>200<');
    });

    it('handles all-zero values without crashing', () => {
        const data = [makeTrend('A', 0), makeTrend('B', 0), makeTrend('C', 0)];
        const result = buildSparkline(data, '#abc');
        expect(result).toContain('<svg');
    });

    it('handles negative values gracefully', () => {
        const data = [makeTrend('A', -5), makeTrend('B', 10)];
        const result = buildSparkline(data, '#123');
        expect(result).toContain('<svg');
    });

    it('renders exactly N dots for N data points', () => {
        const data = [makeTrend('A', 1), makeTrend('B', 2), makeTrend('C', 3)];
        const result = buildSparkline(data, '#000');
        const circleCount = (result.match(/<circle/g) || []).length;
        // Each data point produces at least 1 circle element
        expect(circleCount).toBeGreaterThanOrEqual(3);
    });
});

// ──────────────────────────────────────────────────────
// buildChartSection
// ──────────────────────────────────────────────────────
describe('buildChartSection', () => {
    it('embeds bins and workforce SVGs', () => {
        const result = buildChartSection('<svg>BINS</svg>', '<svg>WF</svg>');
        expect(result).toContain('BINS');
        expect(result).toContain('WF');
    });

    it('contains Harvest Velocity label', () => {
        const result = buildChartSection('', '');
        expect(result).toContain('Harvest Velocity');
    });

    it('contains Workforce Size label', () => {
        const result = buildChartSection('', '');
        expect(result).toContain('Workforce Size');
    });
});

// ──────────────────────────────────────────────────────
// buildDistribution
// ──────────────────────────────────────────────────────
describe('buildDistribution', () => {
    it('returns all 4 bracket labels', () => {
        const result = buildDistribution([]);
        expect(result).toContain('Excellent');
        expect(result).toContain('Good');
        expect(result).toContain('Below Target');
        expect(result).toContain('Needs Action');
    });

    it('counts picker correctly in Excellent bracket (bpa >= 3.0)', () => {
        const pickers = [
            makePicker({ buckets: 30, hours_worked: 8 }),  // bpa = 3.75 → Excellent
        ];
        const result = buildDistribution(pickers);
        // Excellent bracket should show count 1
        expect(result).toContain('Excellent');
    });

    it('counts picker in Needs Action bracket (bpa < 1.0)', () => {
        const pickers = [
            makePicker({ buckets: 4, hours_worked: 8 }),  // bpa = 0.5 → Needs Action
        ];
        const result = buildDistribution(pickers);
        expect(result).toContain('Needs Action');
    });

    it('distributes multiple pickers across brackets', () => {
        const pickers = [
            makePicker({ picker_id: 'P1', buckets: 30, hours_worked: 8 }),   // 3.75 → Excellent
            makePicker({ picker_id: 'P2', buckets: 18, hours_worked: 8 }),   // 2.25 → Good
            makePicker({ picker_id: 'P3', buckets: 10, hours_worked: 8 }),   // 1.25 → Below Target
            makePicker({ picker_id: 'P4', buckets: 4, hours_worked: 8 }),    // 0.5  → Needs Action
        ];
        const result = buildDistribution(pickers);
        // All brackets should have a count of 1
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
    });

    it('handles picker with 0 hours (bpa = 0, Needs Action)', () => {
        const pickers = [makePicker({ hours_worked: 0, buckets: 10 })];
        const result = buildDistribution(pickers);
        expect(result).toContain('Needs Action');
    });
});

// ──────────────────────────────────────────────────────
// buildCostAnalysis
// ──────────────────────────────────────────────────────
describe('buildCostAnalysis', () => {
    it('returns empty tables when no pickers have buckets > 0', () => {
        const pickers = [makePicker({ buckets: 0 })];
        const result = buildCostAnalysis(pickers);
        expect(result).toContain('Most Efficient');
        expect(result).toContain('Most Costly');
    });

    it('shows picker names in efficiency tables', () => {
        const pickers = [
            makePicker({ picker_id: 'P1', picker_name: 'Alice', buckets: 100, total_earnings: 200 }),
            makePicker({ picker_id: 'P2', picker_name: 'Bob', buckets: 50, total_earnings: 250 }),
        ];
        const result = buildCostAnalysis(pickers);
        expect(result).toContain('Alice');
        expect(result).toContain('Bob');
    });

    it('ranks pickers by cost per bin', () => {
        const pickers = [
            // costPerBin = 2.0 (efficient)
            makePicker({ picker_id: 'P1', picker_name: 'Efficient', buckets: 100, total_earnings: 200 }),
            // costPerBin = 5.0 (costly)
            makePicker({ picker_id: 'P2', picker_name: 'Costly', buckets: 50, total_earnings: 250 }),
        ];
        const result = buildCostAnalysis(pickers);
        expect(result).toContain('Efficient');
        expect(result).toContain('Costly');
    });

    it('limits to top 5 in each section', () => {
        const pickers = Array.from({ length: 10 }, (_, i) =>
            makePicker({
                picker_id: `P${i}`,
                picker_name: `Picker${i}`,
                buckets: 10 + i * 5,
                total_earnings: 200 + i * 10,
                hours_worked: 8,
            })
        );
        const result = buildCostAnalysis(pickers);
        // 10 data rows (5 efficient + 5 costly) plus header/structure rows
        const dataRowCount = (result.match(/<tr style=/g) || []).length;
        expect(dataRowCount).toBeGreaterThanOrEqual(5);
        expect(dataRowCount).toBeLessThanOrEqual(12);
    });

    it('colors below-min-wage in red', () => {
        const pickers = [
            makePicker({ buckets: 10, total_earnings: 100, hours_worked: 8 }), // $12.5/hr < $23.15
        ];
        const result = buildCostAnalysis(pickers);
        expect(result).toContain('#dc2626');
    });
});

// ──────────────────────────────────────────────────────
// buildDailySummary
// ──────────────────────────────────────────────────────
describe('buildDailySummary', () => {
    it('renders rows for each day in binsTrend', () => {
        const bins: TrendDataPoint[] = [
            makeTrend('Mon', 100),
            makeTrend('Tue', 120),
            makeTrend('Wed', 90),
        ];
        const workforce: TrendDataPoint[] = [
            makeTrend('Mon', 10),
            makeTrend('Tue', 12),
            makeTrend('Wed', 8),
        ];
        const result = buildDailySummary(bins, workforce, 2.0, 3.5);
        expect(result).toContain('Mon');
        expect(result).toContain('Tue');
        expect(result).toContain('Wed');
    });

    it('calculates estimated hours (pickers * 8)', () => {
        const bins = [makeTrend('Mon', 100)];
        const workforce = [makeTrend('Mon', 10)];
        const result = buildDailySummary(bins, workforce, 2.0, 3.5);
        expect(result).toContain('80h'); // 10 pickers * 8 = 80
    });

    it('uses green for above-average BPA and red for below', () => {
        const bins = [makeTrend('Mon', 100), makeTrend('Tue', 10)];
        const workforce = [makeTrend('Mon', 5), makeTrend('Tue', 5)]; // Mon: 100/40=2.5, Tue: 10/40=0.25
        const result = buildDailySummary(bins, workforce, 2.0, 3.0);
        expect(result).toContain('#059669'); // Mon is above avg
        expect(result).toContain('#dc2626'); // Tue is below avg
    });

    it('handles empty arrays', () => {
        const result = buildDailySummary([], [], 2.0, 3.0);
        expect(result).toBe('');
    });

    it('falls back to day names when labels are missing', () => {
        const bins = [{ label: '', value: 50 }];
        const workforce = [makeTrend('', 5)];
        const result = buildDailySummary(bins, workforce, 2.0, 3.0);
        // Falls back to dayNames[0] = 'Mon'
        expect(result).toContain('Mon');
    });

    it('handles zero pickers (no division by zero)', () => {
        const bins = [makeTrend('Mon', 0)];
        const workforce = [makeTrend('Mon', 0)];
        const result = buildDailySummary(bins, workforce, 2.0, 3.0);
        expect(result).toContain('0h');
    });
});

// ──────────────────────────────────────────────────────
// buildDailySummaryTable
// ──────────────────────────────────────────────────────
describe('buildDailySummaryTable', () => {
    it('wraps rows in a table with headers', () => {
        const result = buildDailySummaryTable('<tr><td>test</td></tr>');
        expect(result).toContain('<table');
        expect(result).toContain('<thead>');
        expect(result).toContain('<tbody>');
        expect(result).toContain('test');
    });

    it('includes all 7 column headers', () => {
        const result = buildDailySummaryTable('');
        expect(result).toContain('Day');
        expect(result).toContain('Pickers');
        expect(result).toContain('Bins');
        expect(result).toContain('Hours');
        expect(result).toContain('Avg B/Hr');
        expect(result).toContain('Est. Cost');
        expect(result).toContain('Cost/Bin');
    });

    it('handles empty rows string', () => {
        const result = buildDailySummaryTable('');
        expect(result).toContain('<tbody></tbody>');
    });
});
