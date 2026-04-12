/**
 * Break Verification Deep Tests
 *
 * Verifies: full 8h shift entitlements, break-taken-resets-clock,
 *           multi-worker scenarios, edge cases, legislation references,
 *           and interaction with compliance alerts.
 */
import { describe, it, expect, vi } from 'vitest';
import { restBreakService } from '../rest-break-compliance.service';

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/** Helper: create a Date that is N hours before `now` */
const hoursAgo = (hours: number, now = new Date()): Date =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

describe('Break Verification — Full 8h Shift', () => {
  const now = new Date('2026-04-03T15:00:00Z');

  it('8h shift generates 4 rest breaks (at 2h, 4h, 6h, 8h)', () => {
    const checkIn = hoursAgo(8, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);
    const restBreaks = entitlements.filter(e => e.type === 'rest');
    expect(restBreaks).toHaveLength(4);
  });

  it('8h shift generates 2 meal breaks (at 4h and 8h)', () => {
    const checkIn = hoursAgo(8, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);
    const mealBreaks = entitlements.filter(e => e.type === 'meal');
    expect(mealBreaks).toHaveLength(2);
  });

  it('total entitlements for 8h shift = 6 (4 rest + 2 meal)', () => {
    const checkIn = hoursAgo(8, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);
    expect(entitlements).toHaveLength(6);
  });

  it('all rest breaks are paid (10 min each)', () => {
    const checkIn = hoursAgo(8, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);
    const restBreaks = entitlements.filter(e => e.type === 'rest');
    for (const b of restBreaks) {
      expect(b.isPaid).toBe(true);
      expect(b.durationMinutes).toBe(10);
    }
  });

  it('all meal breaks are unpaid (30 min each)', () => {
    const checkIn = hoursAgo(8, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);
    const mealBreaks = entitlements.filter(e => e.type === 'meal');
    for (const b of mealBreaks) {
      expect(b.isPaid).toBe(false);
      expect(b.durationMinutes).toBe(30);
    }
  });
});

describe('Break Verification — Break Taken Reduces Overdue', () => {
  const now = new Date('2026-04-03T15:00:00Z');

  it('1 break taken at 3h mark: first rest break NOT overdue', () => {
    const checkIn = hoursAgo(3, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 1, now);
    const firstRest = entitlements.find(e => e.type === 'rest');
    expect(firstRest).toBeDefined();
    expect(firstRest!.isOverdue).toBe(false);
  });

  it('0 breaks taken at 3h mark: first rest break IS overdue', () => {
    const checkIn = hoursAgo(3, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);
    const firstRest = entitlements.find(e => e.type === 'rest');
    expect(firstRest!.isOverdue).toBe(true);
    expect(firstRest!.overdueMinutes).toBeGreaterThan(50); // ~60 min overdue
  });

  it('2 breaks taken at 5h: no overdue rest breaks', () => {
    const checkIn = hoursAgo(5, now);
    const entitlements = restBreakService.getEntitlements(checkIn, 2, now);
    const overdueRest = entitlements.filter(e => e.type === 'rest' && e.isOverdue);
    expect(overdueRest).toHaveLength(0);
  });
});

describe('Break Verification — Edge Cases', () => {
  it('worker who just checked in (0 min): no entitlements', () => {
    const checkIn = new Date();
    const entitlements = restBreakService.getEntitlements(checkIn, 0);
    expect(entitlements).toHaveLength(0);
  });

  it('worker at exactly 1h 59m: no breaks due yet', () => {
    const checkIn = hoursAgo(1.98); // Just under 2h
    const entitlements = restBreakService.getEntitlements(checkIn, 0);
    const restBreaks = entitlements.filter(e => e.type === 'rest');
    expect(restBreaks).toHaveLength(0);
  });

  it('worker at exactly 2h 01m: 1 rest break due', () => {
    const checkIn = hoursAgo(2.02);
    const entitlements = restBreakService.getEntitlements(checkIn, 0);
    const restBreaks = entitlements.filter(e => e.type === 'rest');
    expect(restBreaks).toHaveLength(1);
  });

  it('worker at exactly 3h 59m: 1 rest break, no meal break', () => {
    const checkIn = hoursAgo(3.98);
    const entitlements = restBreakService.getEntitlements(checkIn, 0);
    const restBreaks = entitlements.filter(e => e.type === 'rest');
    const mealBreaks = entitlements.filter(e => e.type === 'meal');
    expect(restBreaks).toHaveLength(1); // Floor(3.98/2) = 1
    expect(mealBreaks).toHaveLength(0); // Floor(3.98/4) = 0
  });

  it('overdue minutes increases as time passes without break', () => {
    const now = new Date('2026-04-03T15:00:00Z');
    const checkIn = hoursAgo(4, now); // 4h without any breaks
    const entitlements = restBreakService.getEntitlements(checkIn, 0, now);
    const firstRest = entitlements.find(e => e.type === 'rest');
    // Due at 2h, now at 4h → ~120 min overdue
    expect(firstRest!.overdueMinutes).toBeGreaterThanOrEqual(119);
  });
});

describe('Break Verification — Multi-Worker Workforce Check', () => {
  it('3 workers with different states produce correct alerts', () => {
    const now = new Date();
    const workers = [
      { id: 'fresh', name: 'Fresh Worker', check_in_time: hoursAgo(0.5, now).toISOString(), breaks_taken: 0 },
      { id: 'due', name: 'Due Worker', check_in_time: hoursAgo(2.5, now).toISOString(), breaks_taken: 0 },
      { id: 'compliant', name: 'Compliant Worker', check_in_time: hoursAgo(3, now).toISOString(), breaks_taken: 2 },
    ];

    const alerts = restBreakService.checkWorkforce(workers);

    // Fresh worker (30 min): no alerts
    const freshAlerts = alerts.filter(a => a.pickerId === 'fresh');
    expect(freshAlerts).toHaveLength(0);

    // Due worker (2.5h, 0 breaks): should have alert
    const dueAlerts = alerts.filter(a => a.pickerId === 'due');
    expect(dueAlerts.length).toBeGreaterThan(0);

    // Compliant worker (3h, 2 breaks): no rest alerts
    const compliantAlerts = alerts.filter(a => a.pickerId === 'compliant' && !a.message.includes('meal'));
    expect(compliantAlerts).toHaveLength(0);
  });

  it('empty workforce returns empty alerts', () => {
    expect(restBreakService.checkWorkforce([])).toHaveLength(0);
  });

  it('workers without check_in_time are skipped', () => {
    const alerts = restBreakService.checkWorkforce([
      { id: 'notime', name: 'No Time' },
      { id: 'notime2', name: 'Also No Time' },
    ]);
    expect(alerts).toHaveLength(0);
  });

  it('workforce with 8h worker + no breaks: critical + meal alerts', () => {
    const now = new Date();
    const alerts = restBreakService.checkWorkforce([
      { id: 'marathon', name: 'Marathon Worker', check_in_time: hoursAgo(8, now).toISOString(), breaks_taken: 0 },
    ]);
    // Should have critical rest break alerts AND meal break alerts
    const critical = alerts.filter(a => a.type === 'critical');
    const mealAlerts = alerts.filter(a => a.message.includes('meal'));
    expect(critical.length).toBeGreaterThan(0);
    expect(mealAlerts.length).toBeGreaterThan(0);
  });
});

describe('Break Verification — Alert Priority Sorting', () => {
  it('alerts are sorted: critical first, then overdue, then warning', () => {
    const now = new Date();
    const workers = [
      { id: 'w1', name: 'Worker 1', check_in_time: hoursAgo(4, now).toISOString(), breaks_taken: 0 },  // critical
      { id: 'w2', name: 'Worker 2', check_in_time: hoursAgo(2.3, now).toISOString(), breaks_taken: 0 }, // warning/overdue
    ];
    const alerts = restBreakService.checkWorkforce(workers);

    const priorityOrder = { critical: 0, overdue: 1, warning: 2 };
    for (let i = 1; i < alerts.length; i++) {
      expect(priorityOrder[alerts[i].type]).toBeGreaterThanOrEqual(
        priorityOrder[alerts[i - 1].type]
      );
    }
  });

  it('each alert contains pickerId and pickerName', () => {
    const now = new Date();
    const alerts = restBreakService.checkWorkforce([
      { id: 'pk-42', name: 'Ana María', check_in_time: hoursAgo(3, now).toISOString(), breaks_taken: 0 },
    ]);
    for (const alert of alerts) {
      expect(alert.pickerId).toBe('pk-42');
      expect(alert.pickerName).toBe('Ana María');
    }
  });
});

describe('Break Verification — NZ Legislation References', () => {
  it('requirements reference Employment Relations Act 2000', () => {
    const req = restBreakService.getRequirements();
    expect(req.restBreak.legislation).toContain('Employment Relations Act 2000');
    expect(req.mealBreak.legislation).toContain('Employment Relations Act 2000');
  });

  it('requirements reference Part 6D and Schedule 1C', () => {
    const req = restBreakService.getRequirements();
    expect(req.restBreak.legislation).toContain('Part 6D');
    expect(req.restBreak.legislation).toContain('Schedule 1C');
  });

  it('rest break: 10 min paid every 2h (NZ law)', () => {
    const req = restBreakService.getRequirements();
    expect(req.restBreak.duration).toContain('10');
    expect(req.restBreak.interval).toContain('2');
    expect(req.restBreak.paid).toBe(true);
  });

  it('meal break: 30 min unpaid every 4h (NZ law)', () => {
    const req = restBreakService.getRequirements();
    expect(req.mealBreak.duration).toContain('30');
    expect(req.mealBreak.interval).toContain('4');
    expect(req.mealBreak.paid).toBe(false);
  });
});
