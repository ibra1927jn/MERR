/**
 * cycleTime.test.ts — Tests para avgCycleTime y avgPickupTime
 */
import { describe, it, expect } from 'vitest';
import { avgCycleTime, avgPickupTime } from './cycleTime';
import type { BinFillEvent, PickupRun } from './backlog';

// Helpers para construir fixtures
const makeRun = (overrides: Partial<PickupRun> = {}): PickupRun => ({
  id: 'r1',
  runnerId: 'ru1',
  runnerName: 'Ana',
  requestedAt: '2026-04-14T08:00:00+12:00',
  completedAt: '2026-04-14T08:05:00+12:00',
  durationSec: 300,
  binsCount: 1,
  ...overrides,
});

const makeFill = (filledAt: string, binId = 'b1'): BinFillEvent => ({ binId, filledAt });

describe('avgCycleTime', () => {
  it('devuelve 0 si no hay runs', () => {
    expect(avgCycleTime([])).toBe(0);
  });

  it('devuelve durationSec cuando hay un solo run completado', () => {
    const runs: PickupRun[] = [makeRun({ durationSec: 300 })];
    expect(avgCycleTime(runs)).toBe(300);
  });

  it('promedia solo los runs completados (ignora durationSec=null)', () => {
    const runs: PickupRun[] = [
      makeRun({ id: 'r1', durationSec: 200 }),
      makeRun({ id: 'r2', durationSec: 400 }),
      makeRun({ id: 'r3', durationSec: null, completedAt: null }), // en progreso
    ];
    // Promedio de 200 y 400 = 300
    expect(avgCycleTime(runs)).toBe(300);
  });

  it('devuelve 0 si todos los runs están en progreso', () => {
    const runs: PickupRun[] = [
      makeRun({ durationSec: null, completedAt: null }),
      makeRun({ durationSec: null, completedAt: null }),
    ];
    expect(avgCycleTime(runs)).toBe(0);
  });
});

describe('avgPickupTime', () => {
  it('devuelve 0 si no hay fills', () => {
    const runs: PickupRun[] = [makeRun()];
    expect(avgPickupTime([], runs)).toBe(0);
  });

  it('devuelve 0 si no hay runs completados', () => {
    const fills: BinFillEvent[] = [makeFill('2026-04-14T08:00:00+12:00')];
    const runs: PickupRun[] = [makeRun({ durationSec: null, completedAt: null })];
    expect(avgPickupTime(fills, runs)).toBe(0);
  });

  it('calcula correctamente el tiempo promedio de pickup', () => {
    // Fill a las 08:00, run completo a las 08:05 → 300s de espera
    const fills: BinFillEvent[] = [
      makeFill('2026-04-14T08:00:00+12:00', 'b1'),
    ];
    const runs: PickupRun[] = [
      makeRun({
        requestedAt: '2026-04-14T08:01:00+12:00',
        completedAt: '2026-04-14T08:05:00+12:00',
        durationSec: 240,
      }),
    ];
    expect(avgPickupTime(fills, runs)).toBe(300);
  });

  it('promedia múltiples fills con sus runs correspondientes', () => {
    // Fill b1 a 08:00, run a 08:05 → 300s
    // Fill b2 a 09:00, run a 09:10 → 600s
    // Promedio = 450s
    const fills: BinFillEvent[] = [
      makeFill('2026-04-14T08:00:00+12:00', 'b1'),
      makeFill('2026-04-14T09:00:00+12:00', 'b2'),
    ];
    const runs: PickupRun[] = [
      makeRun({
        id: 'r1',
        requestedAt: '2026-04-14T08:01:00+12:00',
        completedAt: '2026-04-14T08:05:00+12:00',
        durationSec: 240,
      }),
      makeRun({
        id: 'r2',
        requestedAt: '2026-04-14T09:02:00+12:00',
        completedAt: '2026-04-14T09:10:00+12:00',
        durationSec: 480,
      }),
    ];
    expect(avgPickupTime(fills, runs)).toBe(450);
  });

  it('devuelve 0 si no hay fills ni runs', () => {
    expect(avgPickupTime([], [])).toBe(0);
  });
});
