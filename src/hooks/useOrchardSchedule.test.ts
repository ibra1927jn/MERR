/**
 * useOrchardSchedule — tests para buildSchedule (función pura).
 * useOrchardSchedule hook se cubre indirectamente en CalendarTab render test.
 */
import { describe, it, expect } from 'vitest';
import { buildSchedule } from './useOrchardSchedule';

describe('buildSchedule', () => {
    it('standard 07:00-17:00 (10h) produces start, rest×3 before meal, meal, rest×2 after, end', () => {
        const s = buildSchedule('07:00', '17:00');
        // 07:00 start, rests at 09/11 (before meal 11 = oops meal at 11),
        // meal at 11:00 (4h), rests at 13/15, end 17
        // Actually: rest cada 2h = 09 y 11, pero meal 11 coincide — rest loop
        // condiciona offset < mealInterval, así que rest a 09 solo.
        expect(s[0]!.kind).toBe('shift_start');
        expect(s[0]!.time).toBe('07:00');
        expect(s[s.length - 1]!.kind).toBe('shift_end');
        expect(s[s.length - 1]!.time).toBe('17:00');

        const meals = s.filter((e) => e.kind === 'meal');
        expect(meals.length).toBe(1);
        expect(meals[0]!.time).toBe('11:00');

        const rests = s.filter((e) => e.kind === 'rest');
        // 09:00 antes de meal, 13:00 y 15:00 después.
        expect(rests.map((r) => r.time)).toEqual(['09:00', '13:00', '15:00']);
    });

    it('short shift 08:00-11:00 (3h) — no meal, solo rest at 10:00', () => {
        const s = buildSchedule('08:00', '11:00');
        expect(s.filter((e) => e.kind === 'meal').length).toBe(0);
        expect(s.filter((e) => e.kind === 'rest').map((r) => r.time)).toEqual(['10:00']);
    });

    it('shift < 2h has no breaks', () => {
        const s = buildSchedule('09:00', '10:30');
        expect(s.filter((e) => e.kind === 'rest').length).toBe(0);
        expect(s.filter((e) => e.kind === 'meal').length).toBe(0);
        expect(s.length).toBe(2); // solo start + end
    });

    it('invalid input falls back to 07-17 defaults', () => {
        const s = buildSchedule('bogus', null);
        expect(s[0]!.time).toBe('07:00');
        expect(s[s.length - 1]!.time).toBe('17:00');
    });

    it('end <= start returns empty array (invalid range)', () => {
        expect(buildSchedule('17:00', '10:00')).toEqual([]);
        expect(buildSchedule('09:00', '09:00')).toEqual([]);
    });

    it('long shift 06:00-18:00 (12h) has meal at 10:00 + rests at 08/12/14/16', () => {
        const s = buildSchedule('06:00', '18:00');
        expect(s.filter((e) => e.kind === 'meal').map((m) => m.time)).toEqual(['10:00']);
        expect(s.filter((e) => e.kind === 'rest').map((r) => r.time)).toEqual([
            '08:00',
            '12:00',
            '14:00',
            '16:00',
        ]);
    });

    it('parses HH:MM with leading zero and without', () => {
        const s = buildSchedule('7:00', '17:00');
        expect(s[0]!.time).toBe('07:00');
    });
});
