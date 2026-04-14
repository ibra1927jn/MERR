/**
 * harvestMetrics/kpis.ts — KPIs agregados desde PickerMetrics
 *
 * Pure helper — sin React.
 */
import type { PickerMetrics } from './perPicker';

export interface HarvestKPIs {
    totalBins: number;
    totalLabour: number;
    totalPieceRate: number;
    minWageTopUp: number;
    costPerBin: number;
}

/**
 * Agrega métricas individuales al nivel del orchard.
 */
export function computeKPIs(pickerMetrics: PickerMetrics[]): HarvestKPIs {
    const totalBins = pickerMetrics.reduce((s, p) => s + p.bins, 0);
    const totalLabour = pickerMetrics.reduce((s, p) => s + p.earned, 0);
    const totalPieceRate = pickerMetrics.reduce((s, p) => s + p.pieceRateEarnings, 0);
    const minWageTopUp = pickerMetrics.reduce((s, p) => s + p.topUp, 0);
    const costPerBin = totalBins > 0 ? totalLabour / totalBins : 0;

    return { totalBins, totalLabour, totalPieceRate, minWageTopUp, costPerBin };
}
