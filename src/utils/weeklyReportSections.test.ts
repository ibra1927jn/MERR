/**
 * weeklyReportSections — HTML section builder tests
 */
import { describe, it, expect } from 'vitest';
import { getTeamName, buildKpiStrip, buildInsightStrip, buildTeamRows, buildTeamSection, buildPickerRows, buildPickerSection, buildTeamBreakdown } from './weeklyReportSections';

const mockCrew = [
    { id: 'tl1', picker_id: 'TL01', name: 'Carlos Leader', team_leader_id: undefined },
    { id: 'p1', picker_id: 'P01', name: 'Alice', team_leader_id: 'tl1' },
    { id: 'p2', picker_id: 'P02', name: 'Bob', team_leader_id: 'tl1' },
];

const mockPicker: any = {
    picker_id: 'P01',
    picker_name: 'Alice',
    buckets: 120,
    hours_worked: 40,
    piece_rate_earnings: 240,
    total_earnings: 280,
    top_up_required: 40,
    is_below_minimum: true,
};

const mockTeam: any = {
    name: 'Carlos Leader',
    buckets: 300,
    bpa: 7.5,
    earnings: 600,
    count: 5,
};

describe('getTeamName', () => {
    it('resolves team name from picker_id', () => {
        expect(getTeamName(mockPicker, mockCrew)).toBe('Carlos Leader');
    });

    it('returns Unassigned when picker has no leader', () => {
        const orphan: any = { picker_id: 'P99', picker_name: 'Nobody' };
        expect(getTeamName(orphan, mockCrew)).toBe('Unassigned');
    });

    it('resolves via name fallback', () => {
        const byName: any = { picker_id: 'XX', picker_name: 'Bob' };
        expect(getTeamName(byName, mockCrew)).toBe('Carlos Leader');
    });
});

describe('buildKpiStrip', () => {
    it('returns HTML with all KPI values', () => {
        const html = buildKpiStrip(500, 25, 100, 5000, 10, 5, 20, 200);
        expect(html).toContain('500');
        expect(html).toContain('25.0');
        expect(html).toContain('100h');
        expect(html).toContain('$5000');
        expect(html).toContain('$10.00');
        expect(html).toContain('5.0');
        expect(html).toContain('20');
        expect(html).toContain('$200');
        expect(html).toContain('Total Bins');
    });

    it('styles top-up cell red when > 0', () => {
        const html = buildKpiStrip(100, 5, 50, 1000, 10, 2, 10, 100);
        expect(html).toContain('#fef2f2');
    });

    it('styles top-up cell green when 0', () => {
        const html = buildKpiStrip(100, 5, 50, 1000, 10, 2, 10, 0);
        expect(html).toContain('#f0fdf4');
    });
});

describe('buildInsightStrip', () => {
    it('includes best picker name', () => {
        const html = buildInsightStrip(mockPicker, 100, 3, 10, 20);
        expect(html).toContain('Alice');
    });

    it('handles undefined best picker', () => {
        const html = buildInsightStrip(undefined, 0, 0, 5, 10);
        expect(html).toContain('N/A');
    });
});

describe('buildTeamRows', () => {
    it('generates rows for teams', () => {
        const html = buildTeamRows([mockTeam], 5);
        expect(html).toContain('Carlos Leader');
        expect(html).toContain('300');
        expect(html).toContain('7.5/hr');
        expect(html).toContain('$600');
        expect(html).toContain('5 pickers');
    });

    it('adds medals for top 3 teams', () => {
        const teams = [mockTeam, { ...mockTeam, name: 'T2' }, { ...mockTeam, name: 'T3' }];
        const html = buildTeamRows(teams, 5);
        expect(html).toContain('🥇');
        expect(html).toContain('🥈');
        expect(html).toContain('🥉');
    });
});

describe('buildTeamSection', () => {
    it('wraps team rows with header', () => {
        const html = buildTeamSection('<tr><td>row</td></tr>', 3);
        expect(html).toContain('Team Rankings');
        expect(html).toContain('3 teams');
    });

    it('shows no data message for empty rows', () => {
        const html = buildTeamSection('', 0);
        expect(html).toContain('No team data');
    });
});

describe('buildPickerRows', () => {
    it('generates picker row with all stats', () => {
        const html = buildPickerRows([mockPicker], mockCrew, 5);
        expect(html).toContain('Alice');
        expect(html).toContain('P01');
        expect(html).toContain('120');
        expect(html).toContain('40.0h');
        expect(html).toContain('$280.00');
    });

    it('handles zero hours gracefully', () => {
        const zeroHours = { ...mockPicker, hours_worked: 0 };
        const html = buildPickerRows([zeroHours], mockCrew, 5);
        expect(html).toContain('0d');
    });
});

describe('buildPickerSection', () => {
    it('returns full section with totals', () => {
        const html = buildPickerSection('<tr><td>rows</td></tr>', 10, 2, 100, 50, 500, '50.0', 400, 1.25, '6.50', 2400, 2500);
        expect(html).toContain('Picker Performance Detail');
        expect(html).toContain('10 pickers');
        expect(html).toContain('Below Min: 2');
        expect(html).toContain('$100.00');
    });

    it('shows no data for empty picker rows', () => {
        const html = buildPickerSection('', 0, 0, 0, 0, 0, '0', 0, 0, '0', 0, 0);
        expect(html).toContain('No picker data');
    });
});

describe('buildTeamBreakdown', () => {
    it('generates breakdown per team', () => {
        const html = buildTeamBreakdown([mockTeam], [mockPicker], mockCrew, 5);
        expect(html).toContain("Carlos Leader's Team");
        expect(html).toContain('Alice');
        expect(html).toContain('120');
    });

    it('handles empty picker list', () => {
        const html = buildTeamBreakdown([mockTeam], [], mockCrew, 5);
        expect(html).toBe('');
    });
});
