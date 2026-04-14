/**
 * harvestMetrics/hours.ts — Derivación de horas trabajadas desde scan timestamps
 *
 * Pure helper — sin React imports.
 * Regla: hoursWorked = clamp(lastScan, shiftStart, now) − clamp(firstScan, shiftStart, now)
 * Esto evita inflar las horas si el picker llegó tarde o si solo hay datos nocturnos de la BD.
 */
import type { BucketRecord } from '@/types';
import { getNZShiftBoundaryMs } from '@/utils/time';

/** Sentinel que indica datos de timestamp malformados */
export const HOURS_NO_DATA = -1;

/**
 * Deriva las horas trabajadas de un picker a partir de sus scans del día.
 *
 * @param pickerScans  - Todos los BucketRecord de este picker en el día
 * @param shiftStartHHMM - "07:00" — hora de inicio de turno en NZ
 * @param now          - Momento de referencia (default: Date.now())
 * @returns horas trabajadas (≥0), o HOURS_NO_DATA si los timestamps son inválidos
 */
export function deriveHoursWorked(
    pickerScans: BucketRecord[],
    shiftStartHHMM: string = '07:00',
    now: Date = new Date()
): number {
    if (!pickerScans.length) return 0;

    const timestamps = pickerScans
        .map(s => new Date(s.scanned_at || s.created_at || '').getTime())
        .filter(t => !isNaN(t) && t > 0);

    if (!timestamps.length) return HOURS_NO_DATA;

    const shiftStartMs = getNZShiftBoundaryMs(shiftStartHHMM, now);
    const nowMs = now.getTime();

    const firstScan = Math.min(...timestamps);
    const lastScan = Math.max(...timestamps);

    // Clamp al rango [shiftStart, now]
    const clampedFirst = Math.max(firstScan, shiftStartMs);
    const clampedLast = Math.min(Math.max(lastScan, clampedFirst), nowMs);

    const hours = (clampedLast - clampedFirst) / 3_600_000;
    return Math.max(0, hours);
}

/**
 * Retorna las horas de todos los pickers (map: pickerId → hours).
 * Usa los BucketRecord del día completo agrupados por pickerId.
 */
export function deriveHoursPerPicker(
    bucketRecords: BucketRecord[],
    shiftStartHHMM: string,
    now: Date = new Date()
): Map<string, number> {
    const byPicker = new Map<string, BucketRecord[]>();
    for (const r of bucketRecords) {
        if (!r.picker_id) continue;
        if (!byPicker.has(r.picker_id)) byPicker.set(r.picker_id, []);
        byPicker.get(r.picker_id)!.push(r);
    }

    const result = new Map<string, number>();
    for (const [id, scans] of byPicker) {
        result.set(id, deriveHoursWorked(scans, shiftStartHHMM, now));
    }
    return result;
}
