/**
 * logisticsMetrics/health.ts — Semáforo de salud logística para el panel del manager.
 *
 * Módulo puro sin React.
 */

export const AMBER_RATIO = 1.2; // TODO: ajustar con datos reales de turno
export const RED_RATIO = 1.5;   // TODO: ajustar con datos reales de turno
export const AMBER_SUSTAIN_MINUTES = 10;

/**
 * logisticsHealth — semáforo para el banner de salud del manager.
 *
 * Ratio = backlogNow / runnerThroughputPerHour.
 * Rojo:   ratio >= RED_RATIO (inmediato, sin requisito de sostenimiento).
 * Ámbar:  ratio >= AMBER_RATIO, sostenido >= AMBER_SUSTAIN_MINUTES.
 * Verde:  por debajo del umbral ámbar o aún no sostenido.
 *
 * Casos borde:
 *   - runnerThroughputPerHour=0 y backlogNow>0 → rojo
 *   - runnerThroughputPerHour=0 y backlogNow=0 → verde
 */
export function logisticsHealth(input: {
  backlogNow: number;
  runnerThroughputPerHour: number;
  /** Minutos que el ratio ha estado >= AMBER_RATIO continuamente. El hook lo rastrea. */
  sustainedAboveAmberMinutes: number;
}): 'green' | 'amber' | 'red' {
  const { backlogNow, runnerThroughputPerHour, sustainedAboveAmberMinutes } = input;

  // Caso borde: sin throughput
  if (runnerThroughputPerHour === 0) {
    return backlogNow > 0 ? 'red' : 'green';
  }

  const ratio = backlogNow / runnerThroughputPerHour;

  // Rojo inmediato sin requisito de sostenimiento
  if (ratio >= RED_RATIO) return 'red';

  // Ámbar requiere sostenimiento
  if (ratio >= AMBER_RATIO && sustainedAboveAmberMinutes >= AMBER_SUSTAIN_MINUTES) {
    return 'amber';
  }

  return 'green';
}
