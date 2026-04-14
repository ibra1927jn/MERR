/**
 * logisticsMetrics/cycleTime.ts — Métricas de tiempo de ciclo para runners.
 *
 * Módulo puro sin React.
 */
import type { BinFillEvent, PickupRun } from './backlog';

/**
 * avgPickupTime — promedio de segundos desde el llenado de cubeta hasta la recogida.
 * Empareja cada fill con el run completado más cercano (greedy, cronológico).
 * Devuelve 0 si no hay runs completados.
 */
export function avgPickupTime(fills: BinFillEvent[], runs: PickupRun[]): number {
  const completedRuns = runs.filter(
    (r): r is PickupRun & { completedAt: string } => r.completedAt !== null
  );

  if (fills.length === 0 || completedRuns.length === 0) return 0;

  // Ordenar fills y runs por tiempo ascendente
  const sortedFills = [...fills].sort(
    (a, b) => new Date(a.filledAt).getTime() - new Date(b.filledAt).getTime()
  );
  const sortedRuns = [...completedRuns].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  const waitTimes: number[] = [];
  let runIdx = 0;

  for (const fill of sortedFills) {
    const fillMs = new Date(fill.filledAt).getTime();

    // Avanzar al primer run completado después del fill
    while (runIdx < sortedRuns.length && new Date(sortedRuns[runIdx].completedAt).getTime() < fillMs) {
      runIdx++;
    }

    if (runIdx >= sortedRuns.length) break;

    const completedMs = new Date(sortedRuns[runIdx].completedAt).getTime();
    waitTimes.push((completedMs - fillMs) / 1000);
    // Consumir el run (greedy: cada run solo empareja con un fill)
    runIdx++;
  }

  if (waitTimes.length === 0) return 0;
  return waitTimes.reduce((sum, t) => sum + t, 0) / waitTimes.length;
}

/**
 * avgCycleTime — promedio de durationSec de runs completados.
 * Devuelve 0 si no hay runs completados.
 */
export function avgCycleTime(runs: PickupRun[]): number {
  const completed = runs.filter(
    (r): r is PickupRun & { durationSec: number } => r.durationSec !== null
  );

  if (completed.length === 0) return 0;

  const total = completed.reduce((sum, r) => sum + r.durationSec, 0);
  return total / completed.length;
}
