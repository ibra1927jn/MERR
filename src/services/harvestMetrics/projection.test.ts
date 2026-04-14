/**
 * harvestMetrics/projection.test.ts
 */
import { describe, it, expect } from 'vitest';
import { projectEndOfDay, computeHoursElapsed } from './projection';

// Fecha fija: 14 Apr 2026, 10:00 NZ (+12 → UTC 22:00 del 13)
const NZ_OFFSET_H = 12;
const BASE = '2026-04-14';
function nzDate(timeHHMM: string): Date {
    return new Date(`${BASE}T${timeHHMM}:00+${String(NZ_OFFSET_H).padStart(2, '0')}:00`);
}

describe('computeHoursElapsed', () => {
    it('retorna 0 si now es antes del shift start', () => {
        const now = nzDate('06:30'); // antes de las 07:00
        expect(computeHoursElapsed('07:00', now)).toBe(0);
    });

    it('calcula horas correctamente a mitad del turno', () => {
        const now = nzDate('10:00'); // 3h después de 07:00
        expect(computeHoursElapsed('07:00', now)).toBeCloseTo(3, 1);
    });

    it('nunca retorna negativo', () => {
        const now = nzDate('05:00');
        expect(computeHoursElapsed('07:00', now)).toBeGreaterThanOrEqual(0);
    });
});

describe('projectEndOfDay', () => {
    const now = nzDate('10:00');
    const baseParams = {
        bins: 90,    // 30 bins/h × 3h
        hoursElapsed: 3,
        shiftStartHHMM: '07:00',
        shiftEndHHMM: '17:00', // turno 10h
    };

    it('proyecta correctamente al ritmo actual', () => {
        // 90 bins / 3h = 30 bins/h × 10h = 300 → redondea a 300
        const projected = projectEndOfDay(baseParams, now);
        expect(projected).toBe(300);
    });

    it('retorna 0 si bins = 0', () => {
        expect(projectEndOfDay({ ...baseParams, bins: 0 }, now)).toBe(0);
    });

    it('retorna 0 si hoursElapsed = 0', () => {
        expect(projectEndOfDay({ ...baseParams, hoursElapsed: 0 }, now)).toBe(0);
    });

    it('redondea a múltiplos de 10 para ocultar jitter', () => {
        // 91 bins / 3h = 30.33/h × 10h = 303.3 → redondea a 300
        const projected = projectEndOfDay({ ...baseParams, bins: 91 }, now);
        expect(projected % 10).toBe(0);
    });

    it('acepta shiftDurationH como override', () => {
        // 60 bins / 2h = 30/h × 8h = 240
        const projected = projectEndOfDay({
            bins: 60, hoursElapsed: 2,
            shiftStartHHMM: '07:00', shiftEndHHMM: '17:00',
            shiftDurationH: 8,
        }, now);
        expect(projected).toBe(240);
    });
});
