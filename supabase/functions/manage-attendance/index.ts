import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
    handlePreflight,
    requireRole,
    errorResponse,
    jsonResponse,
    checkRateLimit,
    AttendanceInputSchema,
} from '../_shared/security.ts'

/**
 * manage-attendance — Server-side attendance operations
 *
 * Actions:
 * - check_in:  Create attendance record + update picker status
 * - check_out: Record checkout time + calculate hours worked
 * - correct:   Admin timesheet correction with audit trail
 *
 * Security: Requires admin/manager/team_leader role
 */
serve(async (req) => {
    const preflight = handlePreflight(req)
    if (preflight) return preflight

    const origin = req.headers.get('Origin')

    try {
        const { user, supabase } = await requireRole(req, ['admin', 'manager', 'team_leader'])
        checkRateLimit(user.id)

        const body = await req.json()
        const input = AttendanceInputSchema.parse(body)

        // ── CHECK IN ─────────────────────────────────
        if (input.action === 'check_in') {
            const { picker_id, orchard_id, verified_by } = input

            // Get today's date in NZST
            const today = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Pacific/Auckland',
            }).format(new Date())

            const nowISO = new Date().toISOString()

            // Check if already checked in today
            const { data: existing } = await supabase
                .from('daily_attendance')
                .select('id')
                .eq('picker_id', picker_id)
                .eq('orchard_id', orchard_id)
                .eq('date', today)
                .maybeSingle()

            if (existing) {
                // Already checked in — just ensure picker is active
                await supabase
                    .from('pickers')
                    .update({ status: 'active' })
                    .eq('id', picker_id)

                return jsonResponse({
                    picker_id,
                    status: 'present',
                    id: existing.id,
                    already_checked_in: true,
                }, origin)
            }

            // Create new attendance record
            const { data: attendance, error: insertErr } = await supabase
                .from('daily_attendance')
                .insert({
                    picker_id,
                    orchard_id,
                    date: today,
                    check_in_time: nowISO,
                    status: 'present',
                    verified_by: verified_by || user.id,
                })
                .select('id')
                .single()

            if (insertErr) throw new Error(`Failed to create attendance: ${insertErr.message}`)

            // Update picker status
            const { error: statusErr } = await supabase
                .from('pickers')
                .update({ status: 'active' })
                .eq('id', picker_id)

            if (statusErr) console.warn(`[Attendance] Picker status update failed: ${statusErr.message}`)

            console.info(`[Attendance] Check-in: picker=${picker_id}, orchard=${orchard_id}`)

            return jsonResponse({
                picker_id,
                status: 'present',
                id: attendance.id,
                already_checked_in: false,
            }, origin)
        }

        // ── CHECK OUT ────────────────────────────────
        if (input.action === 'check_out') {
            const { attendance_id } = input
            const nowISO = new Date().toISOString()

            // Fetch check-in time
            const { data: record, error: fetchErr } = await supabase
                .from('daily_attendance')
                .select('id, picker_id, check_in_time')
                .eq('id', attendance_id)
                .single()

            if (fetchErr || !record) throw new Error(`Attendance record not found: ${fetchErr?.message}`)

            // Calculate hours worked
            let hoursWorked: number | undefined
            if (record.check_in_time) {
                const raw = (new Date(nowISO).getTime() - new Date(record.check_in_time).getTime()) / 3_600_000
                hoursWorked = Math.max(0, Math.round(raw * 100) / 100)
            }

            // Update attendance
            const { data: updated, error: updateErr } = await supabase
                .from('daily_attendance')
                .update({
                    check_out_time: nowISO,
                    status: 'present',
                    ...(hoursWorked !== undefined ? { hours_worked: hoursWorked } : {}),
                })
                .eq('id', attendance_id)
                .select('id, picker_id, check_out_time')
                .single()

            if (updateErr) throw new Error(`Failed to update attendance: ${updateErr.message}`)

            // Update picker status to inactive
            const { error: statusErr2 } = await supabase
                .from('pickers')
                .update({ status: 'inactive' })
                .eq('id', record.picker_id)

            if (statusErr2) console.warn(`[Attendance] Picker status update failed: ${statusErr2.message}`)

            console.info(`[Attendance] Check-out: picker=${record.picker_id}, hours=${hoursWorked}`)

            return jsonResponse({
                id: updated.id,
                picker_id: updated.picker_id,
                check_out_time: updated.check_out_time,
                hours_worked: hoursWorked,
            }, origin)
        }

        // ── CORRECT ──────────────────────────────────
        if (input.action === 'correct') {
            const { attendance_id, check_in_time, check_out_time, reason, admin_id } = input

            // Build update payload
            const updatePayload: Record<string, string | number> = {
                correction_reason: reason,
                corrected_by: admin_id,
                corrected_at: new Date().toISOString(),
            }

            if (check_in_time) updatePayload.check_in_time = check_in_time
            if (check_out_time) updatePayload.check_out_time = check_out_time

            // Recalculate hours if we have both times
            const ciTime = check_in_time
            const coTime = check_out_time

            if (ciTime && coTime) {
                updatePayload.hours_worked = Math.max(
                    0,
                    Math.round(((new Date(coTime).getTime() - new Date(ciTime).getTime()) / 3_600_000) * 100) / 100
                )
            } else if (ciTime || coTime) {
                // Fetch the other time to recalculate
                const { data: existing, error: fetchExistingErr } = await supabase
                    .from('daily_attendance')
                    .select('check_in_time, check_out_time')
                    .eq('id', attendance_id)
                    .single()

                if (fetchExistingErr) {
                    throw new Error(`Failed to fetch existing attendance for hours recalculation: ${fetchExistingErr.message}`)
                }

                if (existing) {
                    const ci = ciTime || existing.check_in_time
                    const co = coTime || existing.check_out_time
                    if (ci && co) {
                        updatePayload.hours_worked = Math.max(
                            0,
                            Math.round(((new Date(co).getTime() - new Date(ci).getTime()) / 3_600_000) * 100) / 100
                        )
                    }
                }
            }

            // Apply correction
            const { error: corrErr } = await supabase
                .from('daily_attendance')
                .update(updatePayload)
                .eq('id', attendance_id)

            if (corrErr) throw new Error(`Failed to apply correction: ${corrErr.message}`)

            // Audit trail — must succeed for compliance
            const { error: auditErr } = await supabase
                .from('audit_logs')
                .insert({
                    action: 'timesheet_correction',
                    entity_type: 'daily_attendance',
                    entity_id: attendance_id,
                    performed_by: admin_id,
                    new_values: { check_in_time, check_out_time },
                    notes: reason,
                    created_at: new Date().toISOString(),
                })

            if (auditErr) throw new Error(`Correction applied but audit trail failed: ${auditErr.message}`)

            console.info(`[Attendance] Correction applied: id=${attendance_id}, by=${admin_id}`)

            return jsonResponse({ success: true, attendance_id }, origin)
        }

        throw new Error(`Unknown action`)

    } catch (error) {
        return errorResponse(error, origin, 'manage-attendance')
    }
})
