/**
 * Rest Break Compliance Service
 *
 * AUDIT C-5: Implements NZ rest/meal break tracking per Employment Relations Act 2000.
 *
 * NZ Requirements:
 *   - 10-min paid rest break after 2 hours of continuous work
 *   - 30-min unpaid meal break after 4 hours of continuous work
 *   - Breaks cannot be aggregated (must be taken at intervals)
 *
 * References:
 *   - Employment Relations Act 2000, Part 6D
 *   - Schedule 1C — rest and meal break entitlements
 *
 * @module services/rest-break-compliance
 */
import { logger } from '@/utils/logger';

// ── Break Thresholds ──────────────────────────────
const REST_BREAK_INTERVAL_HOURS = 2; // Every 2 hours → 10-min paid break
const REST_BREAK_DURATION_MIN = 10;
const MEAL_BREAK_INTERVAL_HOURS = 4; // Every 4 hours → 30-min unpaid meal break
const MEAL_BREAK_DURATION_MIN = 30;
const ALERT_THRESHOLD_MINUTES = 15; // Alert 15 min before break is overdue

export interface BreakEntitlement {
  type: 'rest' | 'meal';
  dueAt: Date;
  durationMinutes: number;
  isPaid: boolean;
  isOverdue: boolean;
  overdueMinutes: number;
}

export interface BreakComplianceStatus {
  pickerId: string;
  pickerName: string;
  checkInTime: Date;
  hoursWorked: number;
  nextBreakDue: BreakEntitlement | null;
  breaksTakenToday: number;
  isCompliant: boolean;
  alerts: BreakAlert[];
}

export interface BreakAlert {
  type: 'warning' | 'overdue' | 'critical';
  message: string;
  pickerId: string;
  pickerName: string;
}

export const restBreakService = {
  /**
   * Calculate break entitlements for a single worker based on check-in time.
   */
  getEntitlements(
    checkInTime: Date,
    breaksTaken: number,
    now: Date = new Date()
  ): BreakEntitlement[] {
    const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    const entitlements: BreakEntitlement[] = [];

    // Rest breaks: every 2 hours
    const restBreaksDue = Math.floor(hoursWorked / REST_BREAK_INTERVAL_HOURS);
    for (let i = 0; i < restBreaksDue; i++) {
      const dueAt = new Date(
        checkInTime.getTime() + (i + 1) * REST_BREAK_INTERVAL_HOURS * 60 * 60 * 1000
      );
      const isOverdue = now > dueAt && i >= breaksTaken;
      const overdueMinutes = isOverdue ? Math.floor((now.getTime() - dueAt.getTime()) / 60000) : 0;

      entitlements.push({
        type: 'rest',
        dueAt,
        durationMinutes: REST_BREAK_DURATION_MIN,
        isPaid: true,
        isOverdue,
        overdueMinutes,
      });
    }

    // Meal breaks: every 4 hours
    const mealBreaksDue = Math.floor(hoursWorked / MEAL_BREAK_INTERVAL_HOURS);
    for (let i = 0; i < mealBreaksDue; i++) {
      const dueAt = new Date(
        checkInTime.getTime() + (i + 1) * MEAL_BREAK_INTERVAL_HOURS * 60 * 60 * 1000
      );
      const isOverdue = now > dueAt;
      const overdueMinutes = isOverdue ? Math.floor((now.getTime() - dueAt.getTime()) / 60000) : 0;

      entitlements.push({
        type: 'meal',
        dueAt,
        durationMinutes: MEAL_BREAK_DURATION_MIN,
        isPaid: false,
        isOverdue,
        overdueMinutes,
      });
    }

    return entitlements.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  },

  /**
   * Check compliance across a workforce and return alerts for overdue breaks.
   */
  checkWorkforce(
    workers: Array<{
      id: string;
      name: string;
      check_in?: string;
      breaks_taken?: number;
    }>
  ): BreakAlert[] {
    const now = new Date();
    const alerts: BreakAlert[] = [];

    for (const worker of workers) {
      if (!worker.check_in) continue;
      const checkIn = new Date(worker.check_in);
      const hoursWorked = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const breaksTaken = worker.breaks_taken ?? 0;

      // Check rest breaks (every 2 hours)
      const restBreaksDue = Math.floor(hoursWorked / REST_BREAK_INTERVAL_HOURS);
      if (restBreaksDue > breaksTaken) {
        const overdueHours = hoursWorked - (breaksTaken + 1) * REST_BREAK_INTERVAL_HOURS;
        const overdueMinutes = Math.floor(overdueHours * 60);

        if (overdueMinutes >= 60) {
          alerts.push({
            type: 'critical',
            message: `${worker.name} has not taken a rest break in ${Math.floor(hoursWorked)}h — critical compliance violation`,
            pickerId: worker.id,
            pickerName: worker.name,
          });
        } else if (overdueMinutes >= ALERT_THRESHOLD_MINUTES) {
          alerts.push({
            type: 'overdue',
            message: `${worker.name} is ${overdueMinutes}min overdue for a 10-min rest break`,
            pickerId: worker.id,
            pickerName: worker.name,
          });
        } else if (overdueMinutes >= 0) {
          alerts.push({
            type: 'warning',
            message: `${worker.name} is due for a 10-min rest break`,
            pickerId: worker.id,
            pickerName: worker.name,
          });
        }
      }

      // Check meal breaks (every 4 hours)
      if (hoursWorked >= MEAL_BREAK_INTERVAL_HOURS) {
        const mealBreaksDue = Math.floor(hoursWorked / MEAL_BREAK_INTERVAL_HOURS);
        const estimatedMealBreaks = Math.max(0, breaksTaken - restBreaksDue); // rough estimate
        if (mealBreaksDue > estimatedMealBreaks) {
          alerts.push({
            type: 'overdue',
            message: `${worker.name} has worked ${Math.floor(hoursWorked)}h without a 30-min meal break`,
            pickerId: worker.id,
            pickerName: worker.name,
          });
        }
      }
    }

    logger.info(`[BreakCompliance] Checked ${workers.length} workers, ${alerts.length} alerts`);
    return alerts.sort((a, b) => {
      const priority = { critical: 0, overdue: 1, warning: 2 };
      return priority[a.type] - priority[b.type];
    });
  },

  /**
   * Get human-readable summary of NZ break requirements.
   */
  getRequirements() {
    return {
      restBreak: {
        interval: `Every ${REST_BREAK_INTERVAL_HOURS} hours`,
        duration: `${REST_BREAK_DURATION_MIN} minutes`,
        paid: true,
        legislation: 'Employment Relations Act 2000, Part 6D, Schedule 1C',
      },
      mealBreak: {
        interval: `Every ${MEAL_BREAK_INTERVAL_HOURS} hours`,
        duration: `${MEAL_BREAK_DURATION_MIN} minutes`,
        paid: false,
        legislation: 'Employment Relations Act 2000, Part 6D, Schedule 1C',
      },
    };
  },
};
