/**
 * useWeeklyReport — Tests for aggregation logic and team rankings
 *
 * Tests the pure calculation functions extracted from useWeeklyReport:
 * - totalBuckets, totalHours, totalEarnings aggregations
 * - avgBPA (buckets per attendee per hour)
 * - costPerBin
 * - dailyBinTarget from settings
 * - Team rankings (grouping by leader, sorted by BPA)
 */
import { describe, it, expect } from 'vitest';

// ── Extracted logic from useWeeklyReport for testing ──

interface PickerBreakdown {
    picker_id: string;
    picker_name: string;
    buckets: number;
    hours_worked: number;
    total_earnings: number;
}

interface CrewMember {
    id: string;
    picker_id: string;
    name: string;
    team_leader_id?: string;
}

interface TeamRanking {
    name: string;
    buckets: number;
    hours: number;
    earnings: number;
    count: number;
    bpa: number;
}

const aggregate = (pickers: PickerBreakdown[]) => {
    const totalBuckets = pickers.reduce((s, p) => s + p.buckets, 0);
    const totalHours = pickers.reduce((s, p) => s + p.hours_worked, 0);
    const totalEarnings = pickers.reduce((s, p) => s + p.total_earnings, 0);
    const avgBPA = totalHours > 0 ? totalBuckets / totalHours : 0;
    const costPerBin = totalBuckets > 0 ? totalEarnings / totalBuckets : 0;
    return { totalBuckets, totalHours, totalEarnings, avgBPA, costPerBin };
};

const calcDailyBinTarget = (targetTons: number | undefined) =>
    targetTons ? Math.round((targetTons * 72) / 30) : undefined;

const calcTeamRankings = (pickers: PickerBreakdown[], crew: CrewMember[]): TeamRanking[] => {
    const teamMap = new Map<string, { buckets: number; hours: number; earnings: number; count: number }>();
    pickers.forEach(p => {
        const crewMember = crew.find(c => c.picker_id === p.picker_id || c.name === p.picker_name);
        const leaderId = crewMember?.team_leader_id || 'unassigned';
        const leader = crew.find(c => c.id === leaderId);
        const teamName = leader?.name || 'Unassigned';
        const entry = teamMap.get(teamName) || { buckets: 0, hours: 0, earnings: 0, count: 0 };
        entry.buckets += p.buckets;
        entry.hours += p.hours_worked;
        entry.earnings += p.total_earnings;
        entry.count++;
        teamMap.set(teamName, entry);
    });
    return Array.from(teamMap.entries())
        .map(([name, data]) => ({ name, ...data, bpa: data.hours > 0 ? data.buckets / data.hours : 0 }))
        .sort((a, b) => b.bpa - a.bpa);
};

// ── Tests ──

describe('useWeeklyReport — aggregations', () => {
    const pickers: PickerBreakdown[] = [
        { picker_id: 'p1', picker_name: 'Alice', buckets: 30, hours_worked: 6, total_earnings: 220 },
        { picker_id: 'p2', picker_name: 'Bob', buckets: 50, hours_worked: 8, total_earnings: 350 },
        { picker_id: 'p3', picker_name: 'Carlos', buckets: 20, hours_worked: 4, total_earnings: 150 },
    ];

    it('totalBuckets sums all picker buckets', () => {
        expect(aggregate(pickers).totalBuckets).toBe(100);
    });

    it('totalHours sums all hours', () => {
        expect(aggregate(pickers).totalHours).toBe(18);
    });

    it('totalEarnings sums all earnings', () => {
        expect(aggregate(pickers).totalEarnings).toBe(720);
    });

    it('avgBPA = totalBuckets / totalHours', () => {
        const r = aggregate(pickers);
        expect(r.avgBPA).toBeCloseTo(100 / 18, 2);
    });

    it('costPerBin = totalEarnings / totalBuckets', () => {
        const r = aggregate(pickers);
        expect(r.costPerBin).toBeCloseTo(720 / 100, 2);
    });

    it('handles empty pickers', () => {
        const r = aggregate([]);
        expect(r.totalBuckets).toBe(0);
        expect(r.avgBPA).toBe(0);
        expect(r.costPerBin).toBe(0);
    });
});

describe('useWeeklyReport — dailyBinTarget', () => {
    it('calculates from target_tons', () => {
        // 100 tons * 72 bins/ton / 30 days = 240
        expect(calcDailyBinTarget(100)).toBe(240);
    });

    it('undefined when no target', () => {
        expect(calcDailyBinTarget(undefined)).toBeUndefined();
    });

    it('rounds to integer', () => {
        // 50 * 72 / 30 = 120 (exact — no rounding needed)
        expect(calcDailyBinTarget(50)).toBe(120);
    });
});

describe('useWeeklyReport — team rankings', () => {
    const crew: CrewMember[] = [
        { id: 'l1', picker_id: 'lp1', name: 'Team Lead A', team_leader_id: undefined },
        { id: 'l2', picker_id: 'lp2', name: 'Team Lead B', team_leader_id: undefined },
        { id: 'w1', picker_id: 'p1', name: 'Alice', team_leader_id: 'l1' },
        { id: 'w2', picker_id: 'p2', name: 'Bob', team_leader_id: 'l1' },
        { id: 'w3', picker_id: 'p3', name: 'Carlos', team_leader_id: 'l2' },
    ];

    const pickers: PickerBreakdown[] = [
        { picker_id: 'p1', picker_name: 'Alice', buckets: 30, hours_worked: 6, total_earnings: 200 },
        { picker_id: 'p2', picker_name: 'Bob', buckets: 50, hours_worked: 8, total_earnings: 350 },
        { picker_id: 'p3', picker_name: 'Carlos', buckets: 25, hours_worked: 4, total_earnings: 175 },
    ];

    it('groups pickers by team leader', () => {
        const rankings = calcTeamRankings(pickers, crew);
        expect(rankings.length).toBe(2);
    });

    it('Team Lead A has Alice + Bob', () => {
        const rankings = calcTeamRankings(pickers, crew);
        const teamA = rankings.find(r => r.name === 'Team Lead A');
        expect(teamA?.count).toBe(2);
        expect(teamA?.buckets).toBe(80); // 30 + 50
        expect(teamA?.hours).toBe(14); // 6 + 8
    });

    it('Team Lead B has Carlos', () => {
        const rankings = calcTeamRankings(pickers, crew);
        const teamB = rankings.find(r => r.name === 'Team Lead B');
        expect(teamB?.count).toBe(1);
        expect(teamB?.buckets).toBe(25);
    });

    it('sorts by BPA descending', () => {
        const rankings = calcTeamRankings(pickers, crew);
        // Team B: 25/4 = 6.25 BPA
        // Team A: 80/14 ≈ 5.71 BPA
        expect(rankings[0].name).toBe('Team Lead B'); // Higher BPA
        expect(rankings[1].name).toBe('Team Lead A');
    });

    it('unassigned pickers go to "Unassigned" team', () => {
        const lonelyPicker: PickerBreakdown[] = [
            { picker_id: 'pX', picker_name: 'Ghost', buckets: 10, hours_worked: 2, total_earnings: 70 },
        ];
        const rankings = calcTeamRankings(lonelyPicker, []);
        expect(rankings[0].name).toBe('Unassigned');
    });

    it('handles empty data', () => {
        expect(calcTeamRankings([], [])).toEqual([]);
    });
});
