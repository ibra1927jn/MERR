/**
 * logisticsMetrics/runnerSummary.ts — Estadísticas por runner para el leaderboard.
 *
 * Módulo puro sin React.
 */
import type { PickupRun, RunnerStats } from './backlog';

/**
 * runnerLeaderboard — stats por runner, ordenados por cyclesToday desc.
 * Agrupa runs por runnerId, suma ciclos, calcula avg cycle time.
 * Cada run contribuye binsCount ciclos al runner.
 */
export function runnerLeaderboard(runs: PickupRun[]): RunnerStats[] {
  // Agrupar por runnerId usando un mapa
  const runnerMap = new Map<string, {
    name: string;
    cyclesToday: number;
    completedDurations: number[];
  }>();

  for (const run of runs) {
    const existing = runnerMap.get(run.runnerId);
    if (existing) {
      existing.cyclesToday += run.binsCount;
      if (run.durationSec !== null) {
        existing.completedDurations.push(run.durationSec);
      }
    } else {
      runnerMap.set(run.runnerId, {
        name: run.runnerName,
        cyclesToday: run.binsCount,
        completedDurations: run.durationSec !== null ? [run.durationSec] : [],
      });
    }
  }

  // Convertir a array de RunnerStats
  const stats: RunnerStats[] = [];
  for (const [runnerId, data] of runnerMap.entries()) {
    const avgCycleSec =
      data.completedDurations.length > 0
        ? data.completedDurations.reduce((s, d) => s + d, 0) / data.completedDurations.length
        : 0;

    stats.push({
      runnerId,
      name: data.name,
      cyclesToday: data.cyclesToday,
      avgCycleSec,
    });
  }

  // Ordenar por cyclesToday desc
  return stats.sort((a, b) => b.cyclesToday - a.cyclesToday);
}
