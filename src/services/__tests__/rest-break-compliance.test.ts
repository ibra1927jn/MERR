/**
 * rest-break-compliance.test.ts — NZ Break Compliance Tests
 *
 * Tests rest and meal break entitlement calculations per
 * Employment Relations Act 2000, Part 6D, Schedule 1C.
 *
 * NZ Requirements:
 *   - 10-min paid rest break after every 2 hours of continuous work
 *   - 30-min unpaid meal break after every 4 hours of continuous work
 */
import { describe, it, expect, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import real service ─────────────────────────────────

import { restBreakService } from '@/services/rest-break-compliance.service';

// ── Helpers ─────────────────────────────────────────────

function hoursAgo(hours: number, fromDate?: Date): Date {
  const base = fromDate ?? new Date();
  return new Date(base.getTime() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes: number, fromDate?: Date): Date {
  const base = fromDate ?? new Date();
  return new Date(base.getTime() - minutes * 60 * 1000);
}

// ── Tests ───────────────────────────────────────────────

describe('restBreakService.getEntitlements', () => {
  it('0 hours worked = no entitlements', () => {
    const now = new Date();
    const checkIn = now; // just checked in
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    expect(entitlements).toHaveLength(0);
  });

  it('less than 2 hours = no entitlements', () => {
    const now = new Date();
    const checkIn = hoursAgo(1.5, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    expect(entitlements).toHaveLength(0);
  });

  it('2.5 hours worked = 1 rest break due', () => {
    const now = new Date();
    const checkIn = hoursAgo(2.5, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    const restBreaks = entitlements.filter(e => e.type === 'rest');
    expect(restBreaks).toHaveLength(1);
    expect(restBreaks[0].durationMinutes).toBe(10);
    expect(restBreaks[0].isPaid).toBe(true);
  });

  it('4.5 hours worked = 2 rest breaks + 1 meal break', () => {
    const now = new Date();
    const checkIn = hoursAgo(4.5, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    const restBreaks = entitlements.filter(e => e.type === 'rest');
    const mealBreaks = entitlements.filter(e => e.type === 'meal');

    expect(restBreaks).toHaveLength(2);
    expect(mealBreaks).toHaveLength(1);
    expect(mealBreaks[0].durationMinutes).toBe(30);
    expect(mealBreaks[0].isPaid).toBe(false);
  });

  it('6 hours = 3 rest breaks + 1 meal break', () => {
    const now = new Date();
    const checkIn = hoursAgo(6, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    const restBreaks = entitlements.filter(e => e.type === 'rest');
    const mealBreaks = entitlements.filter(e => e.type === 'meal');

    expect(restBreaks).toHaveLength(3);
    expect(mealBreaks).toHaveLength(1);
  });

  it('8 hours = 4 rest breaks + 2 meal breaks', () => {
    const now = new Date();
    const checkIn = hoursAgo(8, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    const restBreaks = entitlements.filter(e => e.type === 'rest');
    const mealBreaks = entitlements.filter(e => e.type === 'meal');

    expect(restBreaks).toHaveLength(4);
    expect(mealBreaks).toHaveLength(2);
  });

  it('overdue breaks are flagged correctly', () => {
    const now = new Date();
    const checkIn = hoursAgo(3, now); // 3 hours, 1 rest break due at 2h

    // 0 breaks taken — the break at 2h is overdue
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    const overdueBreaks = entitlements.filter(e => e.isOverdue);
    expect(overdueBreaks.length).toBeGreaterThan(0);
    expect(overdueBreaks[0].overdueMinutes).toBeGreaterThan(0);
  });

  it('break taken reduces overdue count', () => {
    const now = new Date();
    const checkIn = hoursAgo(3, now);

    // 0 breaks taken
    const withoutBreak = restBreakService.getEntitlements(checkIn, 0, now);
    const overdueWithout = withoutBreak.filter(e => e.isOverdue && e.type === 'rest');

    // 1 break taken
    const withBreak = restBreakService.getEntitlements(checkIn, 1, now);
    const overdueWith = withBreak.filter(e => e.isOverdue && e.type === 'rest');

    expect(overdueWith.length).toBeLessThan(overdueWithout.length);
  });

  it('entitlements are sorted by dueAt time', () => {
    const now = new Date();
    const checkIn = hoursAgo(5, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    for (let i = 1; i < entitlements.length; i++) {
      expect(entitlements[i].dueAt.getTime()).toBeGreaterThanOrEqual(
        entitlements[i - 1].dueAt.getTime()
      );
    }
  });

  it('rest breaks are always paid, meal breaks are always unpaid', () => {
    const now = new Date();
    const checkIn = hoursAgo(8, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);

    for (const e of entitlements) {
      if (e.type === 'rest') expect(e.isPaid).toBe(true);
      if (e.type === 'meal') expect(e.isPaid).toBe(false);
    }
  });
});

describe('restBreakService.checkWorkforce', () => {
  it('workers without check_in_time are skipped', () => {
    const alerts = restBreakService.checkWorkforce([
      { id: 'w1', name: 'No Check-In Worker' },
      { id: 'w2', name: 'Also No Check-In' },
    ]);

    expect(alerts).toHaveLength(0);
  });

  it('worker recently checked in gets no alerts', () => {
    const now = new Date();
    const alerts = restBreakService.checkWorkforce([
      {
        id: 'w1',
        name: 'New Worker',
        check_in_time: minutesAgo(30, now).toISOString(),
        breaks_taken: 0,
      },
    ]);

    expect(alerts).toHaveLength(0);
  });

  it('worker overdue for rest break gets an alert', () => {
    const now = new Date();
    const alerts = restBreakService.checkWorkforce([
      {
        id: 'w1',
        name: 'Overdue Worker',
        check_in_time: hoursAgo(2.5, now).toISOString(),
        breaks_taken: 0,
      },
    ]);

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(a => a.pickerId === 'w1')).toBe(true);
  });

  it('worker overdue > 60 min gets critical alert', () => {
    const now = new Date();
    // Worker checked in 4 hours ago, 0 breaks taken
    // First rest break was due at 2h, so overdue by ~2h = 120min
    const alerts = restBreakService.checkWorkforce([
      {
        id: 'w1',
        name: 'Critical Worker',
        check_in_time: hoursAgo(4, now).toISOString(),
        breaks_taken: 0,
      },
    ]);

    const criticalAlerts = alerts.filter(a => a.type === 'critical' && a.pickerId === 'w1');
    expect(criticalAlerts.length).toBeGreaterThan(0);
    expect(criticalAlerts[0].message).toContain('critical');
  });

  it('worker overdue 15-59 min gets overdue alert', () => {
    const now = new Date();
    // Worker checked in 2h 25min ago, 0 breaks taken
    // First rest break at 2h, overdue by 25min
    const alerts = restBreakService.checkWorkforce([
      {
        id: 'w1',
        name: 'Overdue Worker',
        check_in_time: hoursAgo(2 + 25 / 60, now).toISOString(),
        breaks_taken: 0,
      },
    ]);

    const overdueAlerts = alerts.filter(
      a => a.type === 'overdue' && a.pickerId === 'w1' && a.message.includes('rest break')
    );
    expect(overdueAlerts.length).toBeGreaterThan(0);
  });

  it('worker due for meal break after 4h', () => {
    const now = new Date();
    const alerts = restBreakService.checkWorkforce([
      {
        id: 'w1',
        name: 'Hungry Worker',
        check_in_time: hoursAgo(4.5, now).toISOString(),
        breaks_taken: 0,
      },
    ]);

    const mealAlerts = alerts.filter(
      a => a.pickerId === 'w1' && a.message.includes('meal break')
    );
    expect(mealAlerts.length).toBeGreaterThan(0);
  });

  it('alerts are sorted by priority (critical first)', () => {
    const now = new Date();
    const alerts = restBreakService.checkWorkforce([
      // This worker is critically overdue (4h, 0 breaks)
      {
        id: 'w1',
        name: 'Critical',
        check_in_time: hoursAgo(4, now).toISOString(),
        breaks_taken: 0,
      },
      // This worker is just due for a break (2h 5min)
      {
        id: 'w2',
        name: 'Warning',
        check_in_time: hoursAgo(2 + 5 / 60, now).toISOString(),
        breaks_taken: 0,
      },
    ]);

    if (alerts.length >= 2) {
      const priorityOrder = { critical: 0, overdue: 1, warning: 2 };
      for (let i = 1; i < alerts.length; i++) {
        expect(priorityOrder[alerts[i].type]).toBeGreaterThanOrEqual(
          priorityOrder[alerts[i - 1].type]
        );
      }
    }
  });

  it('handles mixed workforce with some checked in, some not', () => {
    const now = new Date();
    const alerts = restBreakService.checkWorkforce([
      { id: 'w1', name: 'No Check-In' },
      {
        id: 'w2',
        name: 'Overdue',
        check_in_time: hoursAgo(3, now).toISOString(),
        breaks_taken: 0,
      },
      {
        id: 'w3',
        name: 'Compliant',
        check_in_time: hoursAgo(3, now).toISOString(),
        breaks_taken: 2,
      },
    ]);

    // w1 skipped, w2 should have alerts, w3 has taken breaks
    const w2Alerts = alerts.filter(a => a.pickerId === 'w2');
    expect(w2Alerts.length).toBeGreaterThan(0);
  });
});

describe('restBreakService.getRequirements', () => {
  it('returns correct NZ legal intervals for rest breaks', () => {
    const reqs = restBreakService.getRequirements();

    expect(reqs.restBreak.interval).toBe('Every 2 hours');
    expect(reqs.restBreak.duration).toBe('10 minutes');
    expect(reqs.restBreak.paid).toBe(true);
    expect(reqs.restBreak.legislation).toContain('Employment Relations Act 2000');
  });

  it('returns correct NZ legal intervals for meal breaks', () => {
    const reqs = restBreakService.getRequirements();

    expect(reqs.mealBreak.interval).toBe('Every 4 hours');
    expect(reqs.mealBreak.duration).toBe('30 minutes');
    expect(reqs.mealBreak.paid).toBe(false);
    expect(reqs.mealBreak.legislation).toContain('Employment Relations Act 2000');
  });

  it('references correct legislation section', () => {
    const reqs = restBreakService.getRequirements();

    expect(reqs.restBreak.legislation).toContain('Part 6D');
    expect(reqs.restBreak.legislation).toContain('Schedule 1C');
    expect(reqs.mealBreak.legislation).toContain('Part 6D');
    expect(reqs.mealBreak.legislation).toContain('Schedule 1C');
  });
});
