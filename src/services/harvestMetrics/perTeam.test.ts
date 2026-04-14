/**
 * harvestMetrics/perTeam.test.ts
 */
import { describe, it, expect } from 'vitest';
import { computePerTeam } from './perTeam';
import type { Picker } from '@/types';
import type { PickerMetrics } from './perPicker';

function makePicker(id: string, name: string, role: string = 'team_leader'): Picker {
    return { id, name, role } as Picker;
}

function makeMetrics(overrides: Partial<PickerMetrics>): PickerMetrics {
    return {
        pickerId: 'default',
        pickerName: 'Default',
        bins: 10,
        hoursWorked: 3,
        earned: 70,
        pieceRateEarnings: 65,
        topUp: 5,
        costPerBin: 7,
        ...overrides,
    };
}

describe('computePerTeam', () => {
    const leader1 = makePicker('l1', 'Team Alpha');
    const leader2 = makePicker('l2', 'Team Beta');
    const crew = [leader1, leader2];

    it('agrupa pickers por team leader correctamente', () => {
        const metrics = [
            makeMetrics({ pickerId: 'p1', teamLeaderId: 'l1', bins: 10, earned: 70 }),
            makeMetrics({ pickerId: 'p2', teamLeaderId: 'l1', bins: 20, earned: 140 }),
            makeMetrics({ pickerId: 'p3', teamLeaderId: 'l2', bins: 5, earned: 40 }),
        ];
        const teams = computePerTeam(metrics, crew);
        expect(teams).toHaveLength(2);

        const alpha = teams.find(t => t.teamLeaderId === 'l1');
        expect(alpha?.pickerCount).toBe(2);
        expect(alpha?.totalBins).toBe(30);
        expect(alpha?.totalEarnings).toBeCloseTo(210);
    });

    it('pickers sin team leader van a grupo "unassigned"', () => {
        const metrics = [makeMetrics({ pickerId: 'p1', teamLeaderId: undefined, bins: 5, earned: 35 })];
        const teams = computePerTeam(metrics, []);
        expect(teams[0].teamLeaderId).toBe('unassigned');
        expect(teams[0].teamLeaderName).toBe('Unassigned');
    });

    it('ordena equipos por costPerBin ascendente', () => {
        // l1: 10 bins, $100 → costPerBin=10; l2: 10 bins, $50 → costPerBin=5
        const metrics = [
            makeMetrics({ pickerId: 'p1', teamLeaderId: 'l1', bins: 10, earned: 100 }),
            makeMetrics({ pickerId: 'p2', teamLeaderId: 'l2', bins: 10, earned: 50 }),
        ];
        const teams = computePerTeam(metrics, crew);
        expect(teams[0].costPerBin).toBeLessThan(teams[1].costPerBin);
        expect(teams[0].teamLeaderId).toBe('l2');
    });

    it('retorna array vacío si no hay pickers', () => {
        expect(computePerTeam([], crew)).toEqual([]);
    });

    it('costPerBin es 0 si totalBins es 0', () => {
        const metrics = [makeMetrics({ pickerId: 'p1', teamLeaderId: 'l1', bins: 0, earned: 0 })];
        const teams = computePerTeam(metrics, crew);
        expect(teams[0].costPerBin).toBe(0);
    });
});
