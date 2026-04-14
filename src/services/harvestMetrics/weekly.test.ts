/**
 * weekly.test.ts — Verifica que weeklySeries produce los mismos totales
 * que computeKPIs + computePerPicker para el mismo conjunto de datos.
 */
import { describe, it, expect } from 'vitest';
import type { Picker, BucketRecord, HarvestSettings } from '@/types';
import { weeklySeries } from './weekly';
import { computePerPicker } from './perPicker';
import { computeKPIs } from './kpis';

// Fechas estáticas derivadas del momento de ejecución
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

const settings: Pick<HarvestSettings, 'piece_rate' | 'min_wage_rate' | 'shift_start_time'> = {
    piece_rate: 6.5,
    min_wage_rate: 23.95,
    shift_start_time: '07:00',
};

const crew: Picker[] = [
    {
        id: 'picker-a', picker_id: 'PA', name: 'Alice', avatar: 'AL',
        current_row: 1, total_buckets_today: 0, hours: 0,
        status: 'active', safety_verified: true, qcStatus: [1],
        role: 'picker',
    },
    {
        id: 'picker-b', picker_id: 'PB', name: 'Bob', avatar: 'BO',
        current_row: 2, total_buckets_today: 0, hours: 0,
        status: 'active', safety_verified: true, qcStatus: [1],
        role: 'picker',
    },
    {
        id: 'picker-c', picker_id: 'PC', name: 'Carlos', avatar: 'CA',
        current_row: 3, total_buckets_today: 0, hours: 0,
        status: 'active', safety_verified: true, qcStatus: [1],
        role: 'picker',
    },
];

let scanCounter = 0;
const makeScan = (pickerId: string, date: string): BucketRecord => {
    scanCounter++;
    return {
        id: `scan-${pickerId}-${date}-${scanCounter}`,
        picker_id: pickerId,
        bin_id: 'bin1',
        timestamp: `${date}T09:00:00.000Z`,
        scanned_at: `${date}T09:00:00.000Z`,
        created_at: `${date}T09:00:00.000Z`,
    };
};

// 10 scans por picker — 5 hoy, 5 ayer — 3 pickers = 30 scans total
const todayScans: BucketRecord[] = crew.flatMap(p =>
    Array.from({ length: 10 }, () => makeScan(p.id, today))
);
const yesterdayScans: BucketRecord[] = crew.flatMap(p =>
    Array.from({ length: 10 }, () => makeScan(p.id, yesterday))
);
const allScans = [...todayScans, ...yesterdayScans];

// nowOverride: fin del día de hoy para que deriveHoursWorked no se recorte
const todayEnd = (() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
})();

describe('weeklySeries — paridad con computePerPicker + computeKPIs', () => {
    it('el rollup de hoy produce EXACTAMENTE los mismos KPIs que la ruta directa', () => {
        // Ruta directa (lo que hace useHarvestMetrics)
        const directPerPicker = computePerPicker(crew, todayScans, settings, todayEnd);
        const directKPIs = computeKPIs(directPerPicker);

        // Ruta a través de weeklySeries
        const series = weeklySeries({
            scans: allScans,
            crew,
            settings,
            from: today,
            to: today,
            nowOverride: todayEnd,
        });

        expect(series).toHaveLength(1);
        const todayRollup = series[0];

        expect(todayRollup.kpis.totalBins).toBe(directKPIs.totalBins);
        expect(todayRollup.kpis.totalLabour).toBeCloseTo(directKPIs.totalLabour, 6);
        expect(todayRollup.kpis.costPerBin).toBeCloseTo(directKPIs.costPerBin, 6);
        // Verificación de bins en el rollup de conveniencia
        expect(todayRollup.bins).toBe(directKPIs.totalBins);
        expect(todayRollup.totalLabour).toBeCloseTo(directKPIs.totalLabour, 6);
        expect(todayRollup.costPerBin).toBeCloseTo(directKPIs.costPerBin, 6);
    });

    it('totalBins hoy = 30 (3 pickers × 10 scans)', () => {
        const series = weeklySeries({
            scans: allScans,
            crew,
            settings,
            from: today,
            to: today,
            nowOverride: todayEnd,
        });
        expect(series[0].bins).toBe(30);
    });
});

describe('weeklySeries — rango de fechas', () => {
    it('rango [ayer, hoy] devuelve 2 DayRollups', () => {
        const series = weeklySeries({
            scans: allScans,
            crew,
            settings,
            from: yesterday,
            to: today,
        });
        expect(series).toHaveLength(2);
        expect(series[0].date).toBe(yesterday);
        expect(series[1].date).toBe(today);
    });

    it('el rollup de ayer contiene los bins de ayer', () => {
        const series = weeklySeries({
            scans: allScans,
            crew,
            settings,
            from: yesterday,
            to: today,
        });
        expect(series[0].bins).toBe(30); // 3 pickers × 10 scans ayer
    });
});

describe('weeklySeries — scans vacíos', () => {
    it('retorna rollup con todos en cero cuando no hay scans en el rango', () => {
        const series = weeklySeries({
            scans: [],
            crew,
            settings,
            from: today,
            to: today,
        });
        expect(series).toHaveLength(1);
        expect(series[0].bins).toBe(0);
        expect(series[0].totalLabour).toBe(0);
        expect(series[0].costPerBin).toBe(0);
        expect(series[0].hoursWorked).toBe(0);
        expect(series[0].pickerCount).toBe(0);
    });
});

describe('weeklySeries — pickerCount', () => {
    it('cuenta correctamente los pickers con ≥1 scan', () => {
        // Solo 2 de los 3 pickers tienen scans hoy
        const partialScans: BucketRecord[] = [
            makeScan('picker-a', today),
            makeScan('picker-a', today),
            makeScan('picker-b', today),
        ];
        const series = weeklySeries({
            scans: partialScans,
            crew,
            settings,
            from: today,
            to: today,
            nowOverride: todayEnd,
        });
        expect(series[0].pickerCount).toBe(2);
        expect(series[0].bins).toBe(3);
    });

    it('pickerCount === 0 cuando no hay scans', () => {
        const series = weeklySeries({
            scans: [],
            crew,
            settings,
            from: today,
            to: today,
        });
        expect(series[0].pickerCount).toBe(0);
    });
});
