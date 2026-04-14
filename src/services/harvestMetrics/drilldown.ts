/**
 * harvestMetrics/drilldown.ts — Drill-down por hora del gráfico de velocidad
 *
 * Pure helper — sin React.
 */
import type { BucketRecord, Picker } from '@/types';

export interface DrilldownPickerRow {
    pickerId: string;
    pickerName: string;
    bins: number;
    /** Bins en la hora anterior (para calcular tendencia) */
    prevHourBins: number;
    /** +positivo → mejora; -negativo → baja; 0 → igual */
    trendVsPrevHour: number;
}

export interface DrilldownData {
    hourLabel: string;
    slotStartMs: number;
    slotEndMs: number;
    totalBins: number;
    pickers: DrilldownPickerRow[];
}

/**
 * Computa el breakdown por picker para la hora dada [slotStartMs, slotEndMs).
 *
 * @param bucketRecords  - Todos los BucketRecord del día
 * @param crew           - Para resolver nombres de picker
 * @param slotStartMs    - Inicio del slot (UTC ms)
 * @param slotEndMs      - Fin del slot (UTC ms)
 * @param hourLabel      - Etiqueta para mostrar en UI, p.ej. "07:00–08:00"
 */
export function drilldownForHour(
    bucketRecords: BucketRecord[],
    crew: Picker[],
    slotStartMs: number,
    slotEndMs: number,
    hourLabel: string
): DrilldownData {
    // Filtrar scans del slot actual
    const inSlot = bucketRecords.filter(r => {
        const t = new Date(r.scanned_at || r.created_at || '').getTime();
        return !isNaN(t) && t >= slotStartMs && t < slotEndMs;
    });

    // Filtrar scans de la hora ANTERIOR (para tendencia)
    const prevSlotStart = slotStartMs - 3_600_000;
    const inPrevSlot = bucketRecords.filter(r => {
        const t = new Date(r.scanned_at || r.created_at || '').getTime();
        return !isNaN(t) && t >= prevSlotStart && t < slotStartMs;
    });

    // Agrupar por picker
    const binsByPicker = new Map<string, number>();
    for (const r of inSlot) {
        if (!r.picker_id) continue;
        binsByPicker.set(r.picker_id, (binsByPicker.get(r.picker_id) ?? 0) + 1);
    }

    const prevByPicker = new Map<string, number>();
    for (const r of inPrevSlot) {
        if (!r.picker_id) continue;
        prevByPicker.set(r.picker_id, (prevByPicker.get(r.picker_id) ?? 0) + 1);
    }

    // Mapa rápido de id/picker_id → nombre
    const nameMap = new Map<string, string>();
    for (const p of crew) {
        nameMap.set(p.id, p.name);
        if (p.picker_id) nameMap.set(p.picker_id, p.name);
    }

    const pickers: DrilldownPickerRow[] = [];
    for (const [pickerId, bins] of binsByPicker) {
        const prevHourBins = prevByPicker.get(pickerId) ?? 0;
        pickers.push({
            pickerId,
            pickerName: nameMap.get(pickerId) ?? pickerId,
            bins,
            prevHourBins,
            trendVsPrevHour: bins - prevHourBins,
        });
    }

    pickers.sort((a, b) => b.bins - a.bins);

    return {
        hourLabel,
        slotStartMs,
        slotEndMs,
        totalBins: inSlot.length,
        pickers,
    };
}
