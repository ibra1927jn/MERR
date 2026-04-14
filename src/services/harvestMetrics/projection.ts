/**
 * harvestMetrics/projection.ts — Proyección de fin de día
 *
 * Pure helper — sin React.
 * Extrae la lógica de GoalProgress para que pueda memoizarse sin jitter.
 */
import { getNZShiftBoundaryMs } from '@/utils/time';

interface ProjectionParams {
    bins: number;
    hoursElapsed: number;
    shiftStartHHMM: string;
    shiftEndHHMM: string;
    /** Duración estándar del turno en horas (fallback si no hay hoursElapsed) */
    shiftDurationH?: number;
}

/**
 * Proyecta cuántos bins se completarán al final del turno, redondeado a 10.
 * Retorna 0 si no hay datos suficientes.
 */
export function projectEndOfDay({
    bins,
    hoursElapsed,
    shiftStartHHMM,
    shiftEndHHMM,
    shiftDurationH,
}: ProjectionParams, now: Date = new Date()): number {
    if (bins <= 0 || hoursElapsed <= 0) return 0;

    const shiftStartMs = getNZShiftBoundaryMs(shiftStartHHMM, now);
    const shiftEndMs = getNZShiftBoundaryMs(shiftEndHHMM, now);
    const totalShiftH = shiftDurationH ?? (shiftEndMs - shiftStartMs) / 3_600_000;

    if (totalShiftH <= 0) return 0;

    const projected = Math.round((bins / hoursElapsed) * totalShiftH);

    // Redondear a múltiplos de 10 para ocultar micro-jitter
    return Math.round(projected / 10) * 10;
}

/**
 * Calcula las horas de turno transcurridas desde shiftStart hasta now.
 * Nunca negativo.
 */
export function computeHoursElapsed(
    shiftStartHHMM: string,
    now: Date = new Date()
): number {
    const shiftStartMs = getNZShiftBoundaryMs(shiftStartHHMM, now);
    const nowMs = now.getTime();
    return Math.max(0, (nowMs - shiftStartMs) / 3_600_000);
}
