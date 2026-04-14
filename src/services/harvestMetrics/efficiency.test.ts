/**
 * harvestMetrics/efficiency.test.ts
 */
import { describe, it, expect } from 'vitest';
import { rankByEfficiency } from './efficiency';
import type { PickerMetrics } from './perPicker';

function makeMetrics(pickerId: string, bins: number, costPerBin: number): PickerMetrics {
    return {
        pickerId,
        pickerName: `Picker ${pickerId}`,
        bins,
        hoursWorked: 3,
        earned: bins * costPerBin,
        pieceRateEarnings: bins * costPerBin,
        topUp: 0,
        costPerBin,
    };
}

describe('rankByEfficiency', () => {
    it('ordena de menor a mayor costPerBin', () => {
        const input = [
            makeMetrics('p1', 10, 8),
            makeMetrics('p2', 10, 5),
            makeMetrics('p3', 10, 6.5),
        ];
        const ranked = rankByEfficiency(input);
        expect(ranked.map(r => r.pickerId)).toEqual(['p2', 'p3', 'p1']);
    });

    it('excluye pickers con bins = 0', () => {
        const input = [
            makeMetrics('p1', 10, 7),
            makeMetrics('p2', 0, 0),
        ];
        const ranked = rankByEfficiency(input);
        expect(ranked).toHaveLength(1);
        expect(ranked[0].pickerId).toBe('p1');
    });

    it('retorna array vacío si todos tienen bins = 0', () => {
        const input = [makeMetrics('p1', 0, 0), makeMetrics('p2', 0, 0)];
        expect(rankByEfficiency(input)).toEqual([]);
    });

    it('no muta el array original', () => {
        const input = [makeMetrics('p1', 10, 8), makeMetrics('p2', 10, 5)];
        const original = [...input];
        rankByEfficiency(input);
        expect(input[0].pickerId).toBe(original[0].pickerId);
    });

    it('maneja array vacío sin errores', () => {
        expect(rankByEfficiency([])).toEqual([]);
    });
});
