/**
 * logisticsMetrics/index.ts — API pública del módulo.
 *
 * Re-exporta tipos y funciones públicas. Sin lógica.
 */

export type { BinFillEvent, PickupRun, BacklogPoint, RunnerStats } from './backlog';
export { binBacklogSeries } from './backlog';

export { avgPickupTime, avgCycleTime } from './cycleTime';

export {
  logisticsHealth,
  AMBER_RATIO,
  RED_RATIO,
  AMBER_SUSTAIN_MINUTES,
} from './health';

export { runnerLeaderboard } from './runnerSummary';
