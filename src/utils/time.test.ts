/**
 * utils/time — NZ timezone helpers.
 */
import { describe, it, expect } from 'vitest';
import {
    formatHourLabel,
    toNZISO,
    getNZHour,
    getNZMinute,
    getNZShiftBoundaryMs,
    buildShiftSlots,
} from './time';

describe('formatHourLabel', () => {
    it('pad con ceros (1 dígito)', () => {
        expect(formatHourLabel(7)).toBe('07');
    });
    it('2 dígitos sin pad', () => {
        expect(formatHourLabel(14)).toBe('14');
    });
    it('0 → "00"', () => {
        expect(formatHourLabel(0)).toBe('00');
    });
    it('23 (max)', () => {
        expect(formatHourLabel(23)).toBe('23');
    });
});

describe('toNZISO', () => {
    it('formato ISO con offset +12:00 o +13:00', () => {
        const s = toNZISO(new Date('2026-06-15T12:00:00Z')); // winter NZ (NZST +12)
        expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+(12|13):00$/);
    });
    it('NZDT en verano (enero)', () => {
        const s = toNZISO(new Date('2026-01-15T12:00:00Z'));
        expect(s).toMatch(/\+13:00$/); // NZDT (summer)
    });
    it('NZST en invierno (junio)', () => {
        const s = toNZISO(new Date('2026-06-15T12:00:00Z'));
        expect(s).toMatch(/\+12:00$/); // NZST
    });
});

describe('getNZHour / getNZMinute', () => {
    it('getNZHour devuelve número 0-23', () => {
        const h = getNZHour(new Date('2026-06-15T00:00:00Z'));
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(24);
    });
    it('getNZMinute devuelve número 0-59', () => {
        const m = getNZMinute(new Date('2026-06-15T00:17:00Z'));
        expect(m).toBe(17);
    });
    it('getNZHour midday UTC+0 en invierno NZ (+12) = 00 (next day)', () => {
        // UTC 12:00 + 12h = 00:00 next day en NZ (winter)
        const h = getNZHour(new Date('2026-06-15T12:00:00Z'));
        expect(h).toBe(0);
    });
});

describe('getNZShiftBoundaryMs', () => {
    it('construye timestamp para HH:MM en NZ hoy', () => {
        const ms = getNZShiftBoundaryMs('07:00', new Date('2026-06-15T02:00:00Z'));
        // 07:00 NZST = 19:00 UTC del día anterior
        const d = new Date(ms);
        expect(d.getUTCHours()).toBe(19);
    });
    it('HH:MM = 23:59 retorna ms válido', () => {
        const ms = getNZShiftBoundaryMs('23:59', new Date('2026-06-15T02:00:00Z'));
        expect(Number.isFinite(ms)).toBe(true);
    });
});

describe('buildShiftSlots', () => {
    it('genera N slots entre start y end', () => {
        const slots = buildShiftSlots('07:00', '15:00', new Date('2026-06-15T02:00:00Z'));
        expect(slots).toHaveLength(8); // 7..14 inclusive
    });
    it('cada slot tiene hour, slotStartMs, slotEndMs', () => {
        const slots = buildShiftSlots('07:00', '09:00', new Date('2026-06-15T02:00:00Z'));
        expect(slots[0]).toEqual({
            hour: 7,
            slotStartMs: expect.any(Number),
            slotEndMs: expect.any(Number),
        });
    });
    it('slotEndMs > slotStartMs en cada slot', () => {
        const slots = buildShiftSlots('08:00', '12:00', new Date('2026-06-15T02:00:00Z'));
        slots.forEach(s => {
            expect(s.slotEndMs).toBeGreaterThan(s.slotStartMs);
        });
    });
    it('slots consecutivos son contiguos (end[n] === start[n+1])', () => {
        const slots = buildShiftSlots('10:00', '13:00', new Date('2026-06-15T02:00:00Z'));
        for (let i = 0; i < slots.length - 1; i++) {
            expect(slots[i].slotEndMs).toBe(slots[i + 1].slotStartMs);
        }
    });
    it('start === end → array vacío', () => {
        const slots = buildShiftSlots('10:00', '10:00', new Date('2026-06-15T02:00:00Z'));
        expect(slots).toHaveLength(0);
    });
});
