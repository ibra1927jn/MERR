/**
 * harvestMetrics/efficiency.ts — Ranking de eficiencia por picker
 *
 * Pure helper — sin React.
 * "Eficiente" = menor costPerBin (mismo costo, más bins → mejor).
 */
import type { PickerMetrics } from './perPicker';

/**
 * Retorna los pickers ordenados de más eficiente (menor costPerBin) a menos.
 * Solo incluye pickers con bins > 0.
 */
export function rankByEfficiency(pickerMetrics: PickerMetrics[]): PickerMetrics[] {
    return [...pickerMetrics]
        .filter(p => p.bins > 0)
        .sort((a, b) => a.costPerBin - b.costPerBin);
}
