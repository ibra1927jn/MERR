/**
 * runnerSummary.test.ts — Tests para runnerLeaderboard
 */
import { describe, it, expect } from 'vitest';
import { runnerLeaderboard } from './runnerSummary';
import type { PickupRun } from './backlog';

const makeRun = (overrides: Partial<PickupRun> = {}): PickupRun => ({
  id: 'r1',
  runnerId: 'ru1',
  runnerName: 'Ana',
  requestedAt: '2026-04-14T08:00:00+12:00',
  completedAt: '2026-04-14T08:05:00+12:00',
  durationSec: 300,
  binsCount: 3,
  ...overrides,
});

describe('runnerLeaderboard', () => {
  it('devuelve array vacío si no hay runs', () => {
    expect(runnerLeaderboard([])).toEqual([]);
  });

  it('ordena corredores por cyclesToday descendente', () => {
    const runs: PickupRun[] = [
      makeRun({ id: 'r1', runnerId: 'ru1', runnerName: 'Ana', binsCount: 5, durationSec: 300 }),
      makeRun({ id: 'r2', runnerId: 'ru2', runnerName: 'Bob', binsCount: 10, durationSec: 200 }),
      makeRun({ id: 'r3', runnerId: 'ru3', runnerName: 'Carlos', binsCount: 2, durationSec: 400 }),
    ];
    const result = runnerLeaderboard(runs);

    expect(result[0].runnerId).toBe('ru2');  // 10 ciclos
    expect(result[1].runnerId).toBe('ru1');  // 5 ciclos
    expect(result[2].runnerId).toBe('ru3');  // 2 ciclos
  });

  it('avgCycleSec = 0 si todos los runs están en progreso (durationSec=null)', () => {
    const runs: PickupRun[] = [
      makeRun({ id: 'r1', runnerId: 'ru1', runnerName: 'Ana', durationSec: null, completedAt: null }),
      makeRun({ id: 'r2', runnerId: 'ru1', runnerName: 'Ana', durationSec: null, completedAt: null }),
    ];
    const result = runnerLeaderboard(runs);

    expect(result).toHaveLength(1);
    expect(result[0].avgCycleSec).toBe(0);
  });

  it('agrega correctamente múltiples runs de un mismo runner', () => {
    const runs: PickupRun[] = [
      makeRun({ id: 'r1', runnerId: 'ru1', runnerName: 'Ana', binsCount: 4, durationSec: 200 }),
      makeRun({ id: 'r2', runnerId: 'ru1', runnerName: 'Ana', binsCount: 6, durationSec: 400 }),
    ];
    const result = runnerLeaderboard(runs);

    expect(result).toHaveLength(1);
    expect(result[0].cyclesToday).toBe(10);      // 4 + 6
    expect(result[0].avgCycleSec).toBe(300);      // (200 + 400) / 2
  });

  it('calcula avgCycleSec solo con runs completados por runner', () => {
    const runs: PickupRun[] = [
      makeRun({ id: 'r1', runnerId: 'ru1', runnerName: 'Ana', binsCount: 3, durationSec: 600 }),
      makeRun({ id: 'r2', runnerId: 'ru1', runnerName: 'Ana', binsCount: 2, durationSec: null, completedAt: null }), // en progreso
    ];
    const result = runnerLeaderboard(runs);

    expect(result).toHaveLength(1);
    expect(result[0].cyclesToday).toBe(5);    // 3 + 2
    expect(result[0].avgCycleSec).toBe(600);  // solo r1 completado
  });
});
