import { attendanceRepository } from '@/repositories/attendance.repository';
import { withOptimisticLock } from '../optimistic-lock.service';
import type { TimesheetPayload } from './types';

/**
 * Process timesheet approval/rejection sync items.
 * Supports optimistic locking when updated_at is available.
 */
export async function processTimesheet(payload: TimesheetPayload, expectedUpdatedAt?: string): Promise<void> {
    if (payload.action === 'approve') {
        if (expectedUpdatedAt) {
            const result = await withOptimisticLock({
                table: 'daily_attendance',
                recordId: payload.attendanceId,
                expectedUpdatedAt,
                updates: { verified_by: payload.verifiedBy },
            });
            if (!result.success) {
                throw new Error(`Optimistic lock conflict on attendance ${payload.attendanceId}`);
            }
        } else {
            await attendanceRepository.updateVerifiedBy(payload.attendanceId, payload.verifiedBy);
        }
    }
}
