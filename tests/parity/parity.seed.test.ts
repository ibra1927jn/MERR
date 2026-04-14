/**
 * parity.seed.test.ts
 * Verifica paridad numérica entre computePerPicker+computeKPIs y weeklySeries.
 *
 * Contexto del bug (§10):
 * weeklySeries sin nowOverride construye endOfDay como medianoche local NZ
 * (new Date(y, m-1, d, 23, 59, 59, 999)). En UTC+12, esto equivale a
 * mediodía UTC, no a medianoche UTC. Los scans con timestamp NZ offset
 * (ej. "2026-04-14T09:00:00+12:00" = UTC April 13 21:00) tienen UTC ms
 * ANTES de esa medianoche local. Sin embargo, el bug se manifiesta cuando
 * nowMs < clampedFirst → hoursWorked = 0 → sin top-up → labour != real.
 *
 * El fix: pasar nowOverride: new Date() para hoy, o el fin del turno para
 * días pasados. Así el cálculo usa el "now" real en lugar de medianoche local.
 *
 * Nota sobre timestamps en el test:
 * Los scans usan formato con offset NZ "+12:00" para que:
 * 1. scan.scanned_at.slice(0, 10) = "2026-04-14" (extracción de fecha correcta)
 * 2. new Date(ts).getTime() sea un timestamp UTC coherente con NZ mañana
 */
import { describe, it, expect } from 'vitest';
import { weeklySeries } from '@/services/harvestMetrics/weekly';
import { computePerPicker } from '@/services/harvestMetrics/perPicker';
import { computeKPIs } from '@/services/harvestMetrics/kpis';
import type { BucketRecord, Picker } from '@/types';

// ─── Constantes del seed ──────────────────────────────────────────────────────
const TEST_DATE = '2026-04-14';
const PICKER_ID = 'p1';
const PIECE_RATE = 6.5;
const MIN_WAGE = 23.95;
const SETTINGS = {
    piece_rate: PIECE_RATE,
    min_wage_rate: MIN_WAGE,
    shift_start_time: '07:00',
};

// Scans con offset NZ: "2026-04-14T09:30:00+12:00" → slice(0,10) = "2026-04-14" ✓
// UTC equivalente: April 13 21:30 → está antes de nowOverride (April 14 05:00 UTC) ✓
function makeNZScan(hourNZ: number, minNZ: number = 0, idx: number = 0): BucketRecord {
    const h = String(hourNZ).padStart(2, '0');
    const m = String(minNZ).padStart(2, '0');
    return {
        id: `scan-${idx}`,
        picker_id: PICKER_ID,
        scanned_at: `2026-04-14T${h}:${m}:00+12:00`,
        created_at: `2026-04-14T${h}:${m}:00+12:00`,
        orchard_id: 'o1',
    };
}

// 28 scans repartidos entre 09:00 y 15:00 NZ
const SCANS: BucketRecord[] = [
    ...Array.from({ length: 14 }, (_, i) => makeNZScan(9, i * 4, i)),
    ...Array.from({ length: 14 }, (_, i) => makeNZScan(12, i * 4, 14 + i)),
];

const CREW: Picker[] = [{
    id: 'crew-1',
    picker_id: PICKER_ID,
    name: 'Test Picker',
    role: 'picker',
    status: 'active',
    orchard_id: 'o1',
    check_in_time: '2026-04-14T09:00:00+12:00',
    current_row: 1,
    total_buckets_today: 28,
    team_leader_id: null,
    harness_id: null,
}];

// nowOverride = fin del turno NZ = April 14 17:00+12:00 = April 14 05:00 UTC
const SHIFT_END_NZ = new Date('2026-04-14T17:00:00+12:00');

// ─── Tests: weeklySeries con nowOverride ──────────────────────────────────────

describe('parity.seed — weeklySeries con nowOverride = fin de turno', () => {
    it('bins coincide con computePerPicker+computeKPIs', () => {
        const [rollup] = weeklySeries({
            scans: SCANS,
            crew: CREW,
            settings: SETTINGS,
            from: TEST_DATE,
            to: TEST_DATE,
            nowOverride: SHIFT_END_NZ,
        });

        const perPicker = computePerPicker(CREW, SCANS, SETTINGS, SHIFT_END_NZ);
        const kpis = computeKPIs(perPicker);

        expect(rollup.bins).toBe(28);
        expect(rollup.bins).toBe(kpis.totalBins);
    });

    it('totalLabour coincide con computePerPicker+computeKPIs', () => {
        const [rollup] = weeklySeries({
            scans: SCANS,
            crew: CREW,
            settings: SETTINGS,
            from: TEST_DATE,
            to: TEST_DATE,
            nowOverride: SHIFT_END_NZ,
        });

        const perPicker = computePerPicker(CREW, SCANS, SETTINGS, SHIFT_END_NZ);
        const kpis = computeKPIs(perPicker);

        expect(rollup.totalLabour).toBeCloseTo(kpis.totalLabour, 2);
    });

    it('costPerBin coincide con computePerPicker+computeKPIs', () => {
        const [rollup] = weeklySeries({
            scans: SCANS,
            crew: CREW,
            settings: SETTINGS,
            from: TEST_DATE,
            to: TEST_DATE,
            nowOverride: SHIFT_END_NZ,
        });

        const perPicker = computePerPicker(CREW, SCANS, SETTINGS, SHIFT_END_NZ);
        const kpis = computeKPIs(perPicker);

        expect(rollup.costPerBin).toBeCloseTo(kpis.costPerBin, 2);
    });

    it('hoursWorked > 0 cuando nowOverride cubre el turno completo', () => {
        const [rollup] = weeklySeries({
            scans: SCANS,
            crew: CREW,
            settings: SETTINGS,
            from: TEST_DATE,
            to: TEST_DATE,
            nowOverride: SHIFT_END_NZ,
        });

        expect(rollup.hoursWorked).toBeGreaterThan(0);
    });

    it('totalLabour >= piece rate puro (incluye top-up de salario mínimo)', () => {
        const [rollup] = weeklySeries({
            scans: SCANS,
            crew: CREW,
            settings: SETTINGS,
            from: TEST_DATE,
            to: TEST_DATE,
            nowOverride: SHIFT_END_NZ,
        });

        const pieceRateOnly = 28 * PIECE_RATE;
        expect(rollup.totalLabour).toBeGreaterThanOrEqual(pieceRateOnly);
    });
});

// ─── Tests: consistencia interna de weeklySeries ──────────────────────────────

describe('parity.seed — consistencia interna de weeklySeries', () => {
    it('bins no cambia con distintos nowOverride', () => {
        const now1 = new Date('2026-04-14T17:00:00+12:00');
        const now2 = new Date('2026-04-14T23:59:59+12:00');

        const [r1] = weeklySeries({ scans: SCANS, crew: CREW, settings: SETTINGS, from: TEST_DATE, to: TEST_DATE, nowOverride: now1 });
        const [r2] = weeklySeries({ scans: SCANS, crew: CREW, settings: SETTINGS, from: TEST_DATE, to: TEST_DATE, nowOverride: now2 });

        expect(r1.bins).toBe(r2.bins);
        expect(r1.bins).toBe(28);
    });

    it('sin scans, bins = 0 y labour = 0', () => {
        const [rollup] = weeklySeries({
            scans: [],
            crew: CREW,
            settings: SETTINGS,
            from: TEST_DATE,
            to: TEST_DATE,
            nowOverride: SHIFT_END_NZ,
        });

        expect(rollup.bins).toBe(0);
        expect(rollup.totalLabour).toBe(0);
        expect(rollup.hoursWorked).toBe(0);
    });

    it('rango de 2 días produce 2 rollups', () => {
        const result = weeklySeries({
            scans: SCANS,
            crew: CREW,
            settings: SETTINGS,
            from: '2026-04-13',
            to: '2026-04-14',
            nowOverride: SHIFT_END_NZ,
        });

        expect(result).toHaveLength(2);
        expect(result[0].date).toBe('2026-04-13');
        expect(result[1].date).toBe('2026-04-14');
        // Todos los scans son del día 14, el día 13 debe tener 0 bins
        expect(result[0].bins).toBe(0);
        expect(result[1].bins).toBe(28);
    });
});
