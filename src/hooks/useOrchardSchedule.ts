/**
 * useOrchardSchedule — Deriva el schedule del día desde harvest_settings.
 *
 * Reemplaza los TODAYS_SCHEDULE hardcoded en CalendarTab/HHRR con datos
 * reales de shift_start_time + shift_end_time. Meal + rest breaks
 * calculados según Employment Relations Act 2000.
 *
 * NZ_REST_BREAK: 10 min pagado cada 2h
 * NZ_MEAL_BREAK: 30 min cada 4h
 */
import { useMemo } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import {
    NZ_REST_BREAK_INTERVAL_HOURS,
    NZ_REST_BREAK_DURATION_MINUTES,
    NZ_MEAL_BREAK_INTERVAL_HOURS,
    NZ_MEAL_BREAK_DURATION_MINUTES,
} from '@/constants/nz-law';

export interface ScheduleEntry {
    time: string;           // HH:MM
    event: string;
    icon: string;           // Material Symbols name
    color: string;          // Tailwind class
    kind: 'shift_start' | 'rest' | 'meal' | 'shift_end';
}

/**
 * Convierte "HH:MM" a minutos desde medianoche. Devuelve NaN si formato inválido.
 */
function parseHHMM(t: string | null | undefined): number {
    if (!t) return NaN;
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m) return NaN;
    const h = parseInt(m[1]!, 10);
    const mm = parseInt(m[2]!, 10);
    if (h < 0 || h > 23 || mm < 0 || mm > 59) return NaN;
    return h * 60 + mm;
}

function formatHHMM(minutes: number): string {
    const safe = ((Math.round(minutes) % 1440) + 1440) % 1440;
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Genera entries: shift_start, rest breaks cada 2h, meal break a las 4h del
 * inicio, shift_end. Si las horas no son parseables usa fallback 07:00-17:00.
 */
export function buildSchedule(shiftStart: string | null | undefined, shiftEnd: string | null | undefined): ScheduleEntry[] {
    const startMin = Number.isFinite(parseHHMM(shiftStart)) ? parseHHMM(shiftStart) : parseHHMM('07:00');
    const endMin = Number.isFinite(parseHHMM(shiftEnd)) ? parseHHMM(shiftEnd) : parseHHMM('17:00');
    if (endMin <= startMin) {
        return [];
    }

    const entries: ScheduleEntry[] = [];
    entries.push({
        time: formatHHMM(startMin),
        event: 'Shift Start — All Teams',
        icon: 'alarm',
        color: 'text-emerald-600',
        kind: 'shift_start',
    });

    const totalMinutes = endMin - startMin;
    const mealInterval = NZ_MEAL_BREAK_INTERVAL_HOURS * 60;
    const restInterval = NZ_REST_BREAK_INTERVAL_HOURS * 60;

    // Rest breaks cada 2h hasta el meal break (no duplicamos rest+meal mismo momento)
    for (let offset = restInterval; offset < Math.min(totalMinutes, mealInterval); offset += restInterval) {
        entries.push({
            time: formatHHMM(startMin + offset),
            event: `Rest Break (${NZ_REST_BREAK_DURATION_MINUTES}min paid)`,
            icon: 'coffee',
            color: 'text-sky-600',
            kind: 'rest',
        });
    }

    // Meal break si el turno es > 4h
    if (totalMinutes > mealInterval) {
        entries.push({
            time: formatHHMM(startMin + mealInterval),
            event: `Meal Break (${NZ_MEAL_BREAK_DURATION_MINUTES}min)`,
            icon: 'restaurant',
            color: 'text-amber-600',
            kind: 'meal',
        });
        // Rest breaks posteriores al meal
        for (
            let offset = mealInterval + restInterval;
            offset < totalMinutes;
            offset += restInterval
        ) {
            entries.push({
                time: formatHHMM(startMin + offset),
                event: `Rest Break (${NZ_REST_BREAK_DURATION_MINUTES}min paid)`,
                icon: 'coffee',
                color: 'text-sky-600',
                kind: 'rest',
            });
        }
    }

    entries.push({
        time: formatHHMM(endMin),
        event: 'Shift End — Day Closure',
        icon: 'logout',
        color: 'text-text-secondary',
        kind: 'shift_end',
    });

    return entries;
}

export function useOrchardSchedule(): { schedule: ScheduleEntry[]; isFallback: boolean } {
    const settings = useHarvestStore((s) => s.settings);
    return useMemo(() => {
        const start = settings?.shift_start_time;
        const end = settings?.shift_end_time;
        const isFallback = !start || !end;
        const schedule = buildSchedule(start ?? '07:00', end ?? '17:00');
        return { schedule, isFallback };
    }, [settings?.shift_start_time, settings?.shift_end_time]);
}
