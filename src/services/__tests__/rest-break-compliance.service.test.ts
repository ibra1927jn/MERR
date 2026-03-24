/**
 * rest-break-compliance.service.test.ts
 * Covers: getEntitlements(), checkWorkforce(), getRequirements()
 * Strategy: pure date-based logic — no mocks needed, deterministic with fixed `now`.
 */
import { describe, it, expect, vi } from 'vitest';
import { restBreakService } from '../rest-break-compliance.service';

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/** Helper: create a Date that is N hours before `now` */
const hoursAgo = (hours: number, now = new Date()): Date =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

describe('restBreakService', () => {
  describe('getEntitlements()', () => {
    it('returns no entitlements for worker who just started (< 2h)', () => {
      const checkIn = hoursAgo(1);
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      expect(entitlements).toHaveLength(0);
    });

    it('returns 1 rest break due at exactly 2 hours', () => {
      const checkIn = hoursAgo(2.1); // slightly over 2h to trigger
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      const rest = entitlements.find(e => e.type === 'rest');
      expect(rest).toBeDefined();
    });

    it('rest break is 10 minutes (paid)', () => {
      const checkIn = hoursAgo(2.1);
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      const rest = entitlements.find(e => e.type === 'rest');
      expect(rest?.durationMinutes).toBe(10);
      expect(rest?.isPaid).toBe(true);
    });

    it('returns 1 meal break due at 4 hours', () => {
      const checkIn = hoursAgo(4.1);
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      const meal = entitlements.find(e => e.type === 'meal');
      expect(meal).toBeDefined();
    });

    it('meal break is 30 minutes (unpaid)', () => {
      const checkIn = hoursAgo(4.1);
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      const meal = entitlements.find(e => e.type === 'meal');
      expect(meal?.durationMinutes).toBe(30);
      expect(meal?.isPaid).toBe(false);
    });

    it('marks break as overdue when past due time and not taken', () => {
      const checkIn = hoursAgo(3); // 3h worked → rest break was due at 2h
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      const rest = entitlements.find(e => e.type === 'rest');
      expect(rest?.isOverdue).toBe(true);
      expect(rest?.overdueMinutes).toBeGreaterThan(0);
    });

    it('does NOT mark break as overdue when it has been taken', () => {
      const checkIn = hoursAgo(3);
      const entitlements = restBreakService.getEntitlements(checkIn, 1); // 1 break taken
      const rest = entitlements.find(e => e.type === 'rest');
      expect(rest?.isOverdue).toBe(false);
    });

    it('entitlements are sorted by dueAt ascending', () => {
      const checkIn = hoursAgo(5);
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      for (let i = 1; i < entitlements.length; i++) {
        expect(entitlements[i].dueAt.getTime()).toBeGreaterThanOrEqual(
          entitlements[i - 1].dueAt.getTime()
        );
      }
    });

    it('returns multiple rest breaks for 6+ hours worked', () => {
      const checkIn = hoursAgo(6.1);
      const entitlements = restBreakService.getEntitlements(checkIn, 0);
      const restBreaks = entitlements.filter(e => e.type === 'rest');
      expect(restBreaks.length).toBeGreaterThanOrEqual(3); // 2h, 4h, 6h
    });
  });

  describe('checkWorkforce()', () => {
    it('returns empty array for empty workforce', () => {
      expect(restBreakService.checkWorkforce([])).toHaveLength(0);
    });

    it('returns empty array for worker without check_in_time', () => {
      const alerts = restBreakService.checkWorkforce([{ id: 'p1', name: 'Test' }]);
      expect(alerts).toHaveLength(0);
    });

    it('returns empty array for worker in first 2 hours', () => {
      const recentCheckIn = hoursAgo(1).toISOString();
      const alerts = restBreakService.checkWorkforce([
        { id: 'p1', name: 'Ana', check_in_time: recentCheckIn, breaks_taken: 0 },
      ]);
      expect(alerts).toHaveLength(0);
    });

    it('generates overdue alert for worker 3h in with no breaks', () => {
      const checkIn = hoursAgo(3).toISOString();
      const alerts = restBreakService.checkWorkforce([
        { id: 'p1', name: 'Te Aroha', check_in_time: checkIn, breaks_taken: 0 },
      ]);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].pickerId).toBe('p1');
    });

    it('alert type is overdue or critical for significantly late break', () => {
      const checkIn = hoursAgo(3.5).toISOString();
      const alerts = restBreakService.checkWorkforce([
        { id: 'p1', name: 'Hemi', check_in_time: checkIn, breaks_taken: 0 },
      ]);
      const types = alerts.map(a => a.type);
      expect(types.some(t => t === 'overdue' || t === 'critical')).toBe(true);
    });

    it('critical alert for worker 3+ hours overdue on rest break', () => {
      const checkIn = hoursAgo(4).toISOString(); // 4h worked, only 1h overdue on 2h break
      // But the overdue calc: hoursWorked - (breaksTaken+1)*2 = 4-2 = 2h overdue = 120 min
      const alerts = restBreakService.checkWorkforce([
        { id: 'p1', name: 'Rangi', check_in_time: checkIn, breaks_taken: 0 },
      ]);
      const critical = alerts.find(a => a.type === 'critical');
      expect(critical).toBeDefined();
    });

    it('no alert for compliant worker who took breaks', () => {
      const checkIn = hoursAgo(3).toISOString();
      const alerts = restBreakService.checkWorkforce([
        { id: 'p1', name: 'Ana', check_in_time: checkIn, breaks_taken: 2 },
      ]);
      // Worker who took 2 breaks in 3h should be compliant (only 1 break needed at 2h mark)
      const restAlerts = alerts.filter(a => a.type !== 'overdue' || a.message.includes('meal'));
      expect(restAlerts).toHaveLength(0);
    });

    it('generates meal break alert for 4+ hours worked without meal break', () => {
      const checkIn = hoursAgo(5).toISOString();
      const alerts = restBreakService.checkWorkforce([
        { id: 'p2', name: 'Wiremu', check_in_time: checkIn, breaks_taken: 0 },
      ]);
      const mealAlert = alerts.find(a => a.message.includes('meal'));
      expect(mealAlert).toBeDefined();
    });

    it('sorts alerts by priority — critical before overdue before warning', () => {
      const now = new Date();
      const workers = [
        {
          id: 'p1',
          name: 'Worker 1',
          check_in_time: hoursAgo(3, now).toISOString(),
          breaks_taken: 0,
        },
        {
          id: 'p2',
          name: 'Worker 2',
          check_in_time: hoursAgo(2.2, now).toISOString(),
          breaks_taken: 0,
        },
      ];
      const alerts = restBreakService.checkWorkforce(workers);
      const priorityOrder = { critical: 0, overdue: 1, warning: 2 };
      for (let i = 1; i < alerts.length; i++) {
        expect(priorityOrder[alerts[i].type]).toBeGreaterThanOrEqual(
          priorityOrder[alerts[i - 1].type]
        );
      }
    });

    it('includes picker name and id in alerts', () => {
      const checkIn = hoursAgo(3).toISOString();
      const alerts = restBreakService.checkWorkforce([
        { id: 'picker-99', name: 'Maria G.', check_in_time: checkIn, breaks_taken: 0 },
      ]);
      if (alerts.length > 0) {
        expect(alerts[0].pickerId).toBe('picker-99');
        expect(alerts[0].pickerName).toBe('Maria G.');
      }
    });
  });

  describe('getRequirements()', () => {
    it('returns restBreak and mealBreak requirements', () => {
      const req = restBreakService.getRequirements();
      expect(req).toHaveProperty('restBreak');
      expect(req).toHaveProperty('mealBreak');
    });

    it('rest break interval is every 2 hours', () => {
      const req = restBreakService.getRequirements();
      expect(req.restBreak.interval).toContain('2');
    });

    it('rest break duration is 10 minutes', () => {
      const req = restBreakService.getRequirements();
      expect(req.restBreak.duration).toContain('10');
    });

    it('rest break is paid', () => {
      const req = restBreakService.getRequirements();
      expect(req.restBreak.paid).toBe(true);
    });

    it('meal break interval is every 4 hours', () => {
      const req = restBreakService.getRequirements();
      expect(req.mealBreak.interval).toContain('4');
    });

    it('meal break duration is 30 minutes', () => {
      const req = restBreakService.getRequirements();
      expect(req.mealBreak.duration).toContain('30');
    });

    it('meal break is not paid', () => {
      const req = restBreakService.getRequirements();
      expect(req.mealBreak.paid).toBe(false);
    });

    it('references Employment Relations Act 2000', () => {
      const req = restBreakService.getRequirements();
      expect(req.restBreak.legislation).toContain('Employment Relations Act 2000');
    });
  });
});
