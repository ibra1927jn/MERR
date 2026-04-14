/**
 * harvestMetrics/kpis.test.ts
 */
import { describe, it, expect } from 'vitest';
import { computeKPIs } from './kpis';
import type { PickerMetrics } from './perPicker';

function makeMetrics(overrides: Partial<PickerMetrics> = {}): PickerMetrics {
    return {
        pickerId: 'p1',
        pickerName: 'Rawiri',
        bins: 10,
        hoursWorked: 3,
        earned: 70,
        pieceRateEarnings: 65,
        topUp: 5,
        costPerBin: 7,
        ...overrides,
    };
}

describe('computeKPIs', () => {
    it('retorna zeros para array vacío', () => {
        const kpis = computeKPIs([]);
        expect(kpis.totalBins).toBe(0);
        expect(kpis.totalLabour).toBe(0);
        expect(kpis.costPerBin).toBe(0);
    });

    it('suma totalBins correctamente', () => {
        const kpis = computeKPIs([makeMetrics({ bins: 10 }), makeMetrics({ bins: 20 })]);
        expect(kpis.totalBins).toBe(30);
    });

    it('suma totalLabour correctamente', () => {
        const kpis = computeKPIs([makeMetrics({ earned: 70 }), makeMetrics({ earned: 30 })]);
        expect(kpis.totalLabour).toBeCloseTo(100);
    });

    it('calcula costPerBin como totalLabour / totalBins', () => {
        const kpis = computeKPIs([makeMetrics({ bins: 10, earned: 70 }), makeMetrics({ bins: 10, earned: 30 })]);
        // totalLabour=100, totalBins=20 → costPerBin=5
        expect(kpis.costPerBin).toBeCloseTo(5);
    });

    it('suma minWageTopUp correctamente', () => {
        const kpis = computeKPIs([makeMetrics({ topUp: 5 }), makeMetrics({ topUp: 10 })]);
        expect(kpis.minWageTopUp).toBeCloseTo(15);
    });

    it('suma totalPieceRate correctamente', () => {
        const kpis = computeKPIs([makeMetrics({ pieceRateEarnings: 65 }), makeMetrics({ pieceRateEarnings: 40 })]);
        expect(kpis.totalPieceRate).toBeCloseTo(105);
    });
});
