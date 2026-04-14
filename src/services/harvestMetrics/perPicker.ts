/**
 * harvestMetrics/perPicker.ts — Métricas por picker desde scan data
 *
 * Pure helper — sin React. Deriva bins, hoursWorked, earned, effectiveRate
 * directamente de BucketRecord para garantizar consistencia entre Dashboard e Insights.
 */
import type { Picker, BucketRecord, HarvestSettings } from '@/types';
import { deriveHoursPerPicker, HOURS_NO_DATA } from './hours';

export interface PickerMetrics {
    pickerId: string;
    pickerName: string;
    bins: number;
    /** Horas derivadas de timestamps de scans — nunca de p.hours */
    hoursWorked: number;
    earned: number;
    pieceRateEarnings: number;
    /** Top-up = max(0, minWageEarnings − pieceRateEarnings) */
    topUp: number;
    /** efectivo por bin (NZD) */
    costPerBin: number;
    /** Puede ser undefined si el picker no tiene scans hoy */
    teamLeaderId?: string;
}

/**
 * Computa métricas por picker desde el store.
 * Sólo incluye pickers con rol 'picker' que tengan ≥1 scan hoy.
 */
export function computePerPicker(
    crew: Picker[],
    bucketRecords: BucketRecord[],
    settings: Pick<HarvestSettings, 'piece_rate' | 'min_wage_rate' | 'shift_start_time'>,
    now: Date = new Date()
): PickerMetrics[] {
    const pieceRate = settings.piece_rate || 6.5;
    const minWage = settings.min_wage_rate || 23.95;
    const shiftStart = settings.shift_start_time ?? '07:00';

    // Contar bins por picker (desde BucketRecord del store)
    const binsByPicker = new Map<string, number>();
    for (const r of bucketRecords) {
        if (!r.picker_id) continue;
        binsByPicker.set(r.picker_id, (binsByPicker.get(r.picker_id) ?? 0) + 1);
    }

    // Derivar horas por picker (pure computation from timestamps)
    const hoursByPicker = deriveHoursPerPicker(bucketRecords, shiftStart, now);

    // Construir métricas por picker de rol 'picker'
    const pickers = crew.filter(p => !p.role || p.role === 'picker');

    return pickers
        .map(p => {
            // Lookup por id (UUID) y por picker_id (código corto "P001")
            const bins = binsByPicker.get(p.id) ?? binsByPicker.get(p.picker_id) ?? 0;
            const rawHours = hoursByPicker.get(p.id) ?? hoursByPicker.get(p.picker_id) ?? 0;
            const hoursWorked = rawHours === HOURS_NO_DATA ? 0 : rawHours;

            const pieceRateEarnings = bins * pieceRate;
            const minWageEarnings = hoursWorked * minWage;
            const topUp = Math.max(0, minWageEarnings - pieceRateEarnings);
            const earned = pieceRateEarnings + topUp;
            const costPerBin = bins > 0 ? earned / bins : 0;

            return {
                pickerId: p.id,
                pickerName: p.name,
                bins,
                hoursWorked,
                earned,
                pieceRateEarnings,
                topUp,
                costPerBin,
                teamLeaderId: p.team_leader_id,
            };
        })
        .filter(m => m.bins > 0); // Excluir pickers sin scans
}
