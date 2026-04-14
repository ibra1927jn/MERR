/**
 * health.test.ts — Tests para logisticsHealth
 */
import { describe, it, expect } from 'vitest';
import {
  logisticsHealth,
  AMBER_RATIO,
  RED_RATIO,
  AMBER_SUSTAIN_MINUTES,
} from './health';

describe('logisticsHealth', () => {
  it('devuelve green cuando ratio < AMBER_RATIO', () => {
    // ratio = 10/20 = 0.5 < 1.2
    expect(logisticsHealth({
      backlogNow: 10,
      runnerThroughputPerHour: 20,
      sustainedAboveAmberMinutes: 0,
    })).toBe('green');
  });

  it('devuelve red cuando ratio >= RED_RATIO (inmediato, sin sostenimiento)', () => {
    // ratio = 15/10 = 1.5 >= RED_RATIO
    expect(logisticsHealth({
      backlogNow: 15,
      runnerThroughputPerHour: 10,
      sustainedAboveAmberMinutes: 0,
    })).toBe('red');
  });

  it('devuelve red con cualquier valor de sustainedAboveAmberMinutes cuando ratio >= RED_RATIO', () => {
    expect(logisticsHealth({
      backlogNow: 20,
      runnerThroughputPerHour: 10,
      sustainedAboveAmberMinutes: 100,
    })).toBe('red');
  });

  it('devuelve green (no amber) cuando ratio >= AMBER_RATIO pero sostenido < AMBER_SUSTAIN_MINUTES', () => {
    // ratio = 12/10 = 1.2 === AMBER_RATIO, sostenido 5 min < 10
    expect(logisticsHealth({
      backlogNow: 12,
      runnerThroughputPerHour: 10,
      sustainedAboveAmberMinutes: 5,
    })).toBe('green');
  });

  it('devuelve amber cuando ratio >= AMBER_RATIO y sostenido >= AMBER_SUSTAIN_MINUTES', () => {
    // ratio = 12/10 = 1.2 === AMBER_RATIO, sostenido 10 min
    expect(logisticsHealth({
      backlogNow: 12,
      runnerThroughputPerHour: 10,
      sustainedAboveAmberMinutes: AMBER_SUSTAIN_MINUTES,
    })).toBe('amber');
  });

  it('devuelve amber con sostenimiento mayor al mínimo', () => {
    expect(logisticsHealth({
      backlogNow: 13,
      runnerThroughputPerHour: 10,
      sustainedAboveAmberMinutes: 20,
    })).toBe('amber');
  });

  it('devuelve green cuando runnerThroughputPerHour=0 y backlogNow=0', () => {
    expect(logisticsHealth({
      backlogNow: 0,
      runnerThroughputPerHour: 0,
      sustainedAboveAmberMinutes: 0,
    })).toBe('green');
  });

  it('devuelve red cuando runnerThroughputPerHour=0 y backlogNow>0', () => {
    expect(logisticsHealth({
      backlogNow: 5,
      runnerThroughputPerHour: 0,
      sustainedAboveAmberMinutes: 0,
    })).toBe('red');
  });

  it('los umbrales exportados tienen los valores correctos', () => {
    expect(AMBER_RATIO).toBe(1.2);
    expect(RED_RATIO).toBe(1.5);
    expect(AMBER_SUSTAIN_MINUTES).toBe(10);
  });
});
