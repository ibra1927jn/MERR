/**
 * Attendance Processor — Strategy Pattern processor for ATTENDANCE sync items.
 *
 * Handles check-in (append with dedup) and check-out (optimistic lock).
 * Check-out operations use withOptimisticLock to prevent silent overwrites
 * when a Manager corrects attendance while a Team Leader is offline.
 */

import { attendanceService } from '../attendance.service';
import { withOptimisticLock } from '../optimistic-lock.service';
import type { AttendancePayload } from './types';

export async function processAttendance(
    payload: AttendancePayload,
    expectedUpdatedAt?: string
): Promise<void> {
    if (payload.check_out_time && payload.attendanceId && expectedUpdatedAt) {
        // Check-out with optimistic lock — prevents silent overwrite
        // if a Manager has corrected attendance while TL was offline
        const result = await withOptimisticLock({
            table: 'daily_attendance',
            recordId: payload.attendanceId,
            expectedUpdatedAt,
            updates: {
                check_out_time: payload.check_out_time,
                status: 'present'
            }
        });
        if (!result.success) {
            throw new Error(
                `Optimistic lock conflict on attendance ${payload.attendanceId}: ` +
                `expected=${expectedUpdatedAt}, server has newer version`
            );
        }
    } else {
        // Check-in: delegate to existing service (already has dedup logic)
        await attendanceService.checkInPicker(
            payload.picker_id,
            payload.orchard_id,
            payload.verifiedBy
        );
    }
}
