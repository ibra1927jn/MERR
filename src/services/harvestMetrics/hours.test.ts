/**
 * harvestMetrics/hours.test.ts
 */
import { describe, it, expect } from 'vitest';
import { deriveHoursWorked, deriveHoursPerPicker, HOURS_NO_DATA } from './hours';
import type { BucketRecord } from '@/types';

// Fecha fija: 14 Apr 2026, 10:00 NZ (+12 → UTC 22:00 del 13)
// shiftStart 07:00 NZ = UTC 19:00 del 13 Apr
const NZ_OFFSET_H = 12;
const BASE_DATE_STR = '2026-04-14';

function nzMs(timeHHMM: string): number {
    // Construye un timestamp absoluto para la fecha BASE en NZ
    return new Date(`${BASE_DATE_STR}T${timeHHMM}:00+${String(NZ_OFFSET_H).padStart(2, '0')}:00`).getTime();
}

function makeRecord(pickerId: string, timeHHMM: string): BucketRecord {
    return {
        id: `r-${pickerId}-${timeHHMM}`,
        picker_id: pickerId,
        scanned_at: new Date(nzMs(timeHHMM)).toISOString(),
        created_at: new Date(nzMs(timeHHMM)).toISOString(),
    } as BucketRecord;
}

// "now" = 10:00 NZ
const NOW = new Date(nzMs('10:00'));

describe('deriveHoursWorked', () => {
    it('retorna 0 si no hay scans', () => {
        expect(deriveHoursWorked([], '07:00', NOW)).toBe(0);
    });

    it('retorna HOURS_NO_DATA si los timestamps son inválidos', () => {
        const bad: BucketRecord[] = [{ id: 'x', picker_id: 'p1', scanned_at: 'not-a-date', created_at: '' } as unknown as BucketRecord];
        expect(deriveHoursWorked(bad, '07:00', NOW)).toBe(HOURS_NO_DATA);
    });

    it('calcula horas correctamente entre primer y último scan', () => {
        const scans = [makeRecord('p1', '08:00'), makeRecord('p1', '10:00')];
        // 08:00–10:00 = 2h; ambos dentro de [07:00, 10:00]
        expect(deriveHoursWorked(scans, '07:00', NOW)).toBeCloseTo(2, 1);
    });

    it('clampea el primer scan a shiftStart si llegó antes', () => {
        // Scan a las 06:30 (antes del turno) → se clampea a 07:00
        const scans = [makeRecord('p1', '06:30'), makeRecord('p1', '09:30')];
        // clampedFirst = 07:00, clampedLast = 09:30 → 2.5h
        expect(deriveHoursWorked(scans, '07:00', NOW)).toBeCloseTo(2.5, 1);
    });

    it('no supera "now" para el último scan', () => {
        // Un scan hipotéticamente en el futuro — now = 10:00
        const scans = [makeRecord('p1', '07:00'), makeRecord('p1', '10:00')];
        const h = deriveHoursWorked(scans, '07:00', NOW);
        expect(h).toBeCloseTo(3, 1);
    });

    it('retorna 0 si todos los scans son antes del turno', () => {
        // Scans a las 05:00 y 06:00 — ambos antes del shiftStart
        const scans = [makeRecord('p1', '05:00'), makeRecord('p1', '06:00')];
        // clampedFirst = 07:00, clampedLast = max(06:00, 07:00) clamped to now = 07:00
        // hours = 0
        expect(deriveHoursWorked(scans, '07:00', NOW)).toBe(0);
    });

    it('un único scan produce 0h (no hay rango)', () => {
        const scans = [makeRecord('p1', '08:30')];
        expect(deriveHoursWorked(scans, '07:00', NOW)).toBe(0);
    });

    it('usa created_at como fallback si scanned_at está vacío', () => {
        const r: BucketRecord = {
            id: 'r1',
            picker_id: 'p1',
            scanned_at: '',
            created_at: new Date(nzMs('07:00')).toISOString(),
        } as unknown as BucketRecord;
        const r2: BucketRecord = {
            id: 'r2',
            picker_id: 'p1',
            scanned_at: '',
            created_at: new Date(nzMs('09:00')).toISOString(),
        } as unknown as BucketRecord;
        expect(deriveHoursWorked([r, r2], '07:00', NOW)).toBeCloseTo(2, 1);
    });
});

describe('deriveHoursPerPicker', () => {
    it('agrupa correctamente por picker_id', () => {
        const records = [
            makeRecord('p1', '07:00'), makeRecord('p1', '09:00'),
            makeRecord('p2', '08:00'), makeRecord('p2', '10:00'),
        ];
        const map = deriveHoursPerPicker(records, '07:00', NOW);
        expect(map.get('p1')).toBeCloseTo(2, 1);
        expect(map.get('p2')).toBeCloseTo(2, 1);
    });

    it('ignora registros sin picker_id', () => {
        const r = { id: 'x', picker_id: null, scanned_at: new Date(nzMs('08:00')).toISOString() } as unknown as BucketRecord;
        const map = deriveHoursPerPicker([r], '07:00', NOW);
        expect(map.size).toBe(0);
    });
});
