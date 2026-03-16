/**
 * Deep tests for weeklyReportSections.ts — imports module and tests buildKpiStrip, buildTeamSection, buildPickerSection
 * These 3 functions have simple signatures. Other functions require complex types
 * that we test simply by calling and verifying they return strings.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('./weeklyReportCharts', () => ({
    buildSparkline: vi.fn(() => '<svg></svg>'),
    buildChartSection: vi.fn(() => '<div>chart</div>'),
    buildDistribution: vi.fn(() => '<div>dist</div>'),
    buildCostAnalysis: vi.fn(() => '<div>cost</div>'),
    buildDailySummary: vi.fn(() => '<div>daily</div>'),
    buildDailySummaryTable: vi.fn(() => '<table></table>'),
}));

import * as mod from './weeklyReportSections';

describe('weeklyReportSections — deep tests', () => {
    it('exports getTeamName', () => expect(mod.getTeamName).toBeDefined());
    it('exports buildKpiStrip', () => expect(mod.buildKpiStrip).toBeDefined());
    it('exports buildInsightStrip', () => expect(mod.buildInsightStrip).toBeDefined());
    it('exports buildTeamRows', () => expect(mod.buildTeamRows).toBeDefined());
    it('exports buildTeamSection', () => expect(mod.buildTeamSection).toBeDefined());
    it('exports buildPickerRows', () => expect(mod.buildPickerRows).toBeDefined());
    it('exports buildPickerSection', () => expect(mod.buildPickerSection).toBeDefined());
    it('exports buildTeamBreakdown', () => expect(mod.buildTeamBreakdown).toBeDefined());

    describe('getTeamName', () => {
        it('returns Unassigned when no team_leader_id', () => {
            const picker = {} as any;
            expect(mod.getTeamName(picker, [])).toBe('Unassigned');
        });
    });

    describe('buildKpiStrip', () => {
        it('returns HTML string with data', () => {
            const html = mod.buildKpiStrip(1000, 50, 200, 15000, 15, 5, 10, 500);
            expect(typeof html).toBe('string');
            expect(html.length).toBeGreaterThan(100);
            expect(html).toContain('1000');
        });
    });

    describe('buildTeamSection', () => {
        it('returns team section wrapper HTML', () => {
            const html = mod.buildTeamSection('<tr><td>Row</td></tr>', 3);
            expect(html).toContain('Row');
            expect(typeof html).toBe('string');
        });
    });

    describe('buildPickerSection', () => {
        it('returns picker section HTML', () => {
            const html = mod.buildPickerSection(
                '<tr><td>Rows</td></tr>', 10, 2, 500, 5, 1000,
                '200.0', 100, 5, '25.00', 6500, 7000
            );
            expect(html).toContain('Rows');
            expect(html.length).toBeGreaterThan(50);
        });
    });

    describe('buildTeamRows', () => {
        it('handles empty teams', () => {
            expect(mod.buildTeamRows([], 0)).toBe('');
        });
    });

    describe('buildTeamBreakdown', () => {
        it('returns empty for no teams', () => {
            expect(mod.buildTeamBreakdown([], [], [], 5)).toBe('');
        });
    });

    describe('buildInsightStrip', () => {
        it('handles undefined bestPicker', () => {
            const html = mod.buildInsightStrip(undefined, 0, 0, 0, 0);
            expect(typeof html).toBe('string');
        });
    });
});
