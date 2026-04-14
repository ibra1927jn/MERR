import { BucketRecord } from '@/types';

/** Mínimo de escaneos en una fila antes de proyectar una tasa — evita ruido */
const MIN_SCANS_FOR_RATE = 3;

/** Minutos de actividad requeridos antes de mostrar una tasa */
const MIN_MINUTES = 15;

/**
 * binsPerHourForRow — tasa de bins por hora para una sola fila.
 *
 * Devuelve null cuando hay menos de MIN_SCANS_FOR_RATE escaneos
 * o menos de MIN_MINUTES de actividad (demasiado ruido para proyectar).
 */
export function binsPerHourForRow(
    rowNum: number,
    bucketRecords: BucketRecord[],
): number | null {
    const rowScans = bucketRecords.filter(br => br.row_number === rowNum);
    if (rowScans.length < MIN_SCANS_FOR_RATE) return null;

    const timestamps = rowScans
        .map(br => {
            const raw = br.scanned_at ?? br.created_at ?? br.timestamp;
            return new Date(raw).getTime();
        })
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);

    if (timestamps.length < 2) return null;

    const elapsedMs = timestamps[timestamps.length - 1] - timestamps[0];
    const elapsedMinutes = elapsedMs / 60_000;
    if (elapsedMinutes < MIN_MINUTES) return null;

    const elapsedHours = elapsedMinutes / 60;
    return Math.round(rowScans.length / elapsedHours);
}
