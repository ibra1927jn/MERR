import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
    handlePreflight,
    corsHeaders,
    requireRole,
    errorResponse,
    checkRateLimit,
    PayrollInputSchema,
} from '../_shared/security.ts'

// FIX U3: Dynamic NZST offset — handles DST transitions correctly
function getNZOffset(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    const fmt = new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        timeZoneName: 'longOffset'
    });
    const parts = fmt.formatToParts(d);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    const offset = tzPart?.value?.replace('GMT', '') || '+13:00';
    return offset;
}

function toNZBoundary(dateStr: string, time: string): string {
    return `${dateStr}T${time}${getNZOffset(dateStr)}`;
}

interface PickerBreakdown {
    picker_id: string
    picker_name: string
    buckets: number
    hours_worked: number
    piece_rate_earnings: number
    hourly_rate: number
    minimum_required: number
    top_up_required: number
    total_earnings: number
    is_below_minimum: boolean
}

interface PayrollResult {
    orchard_id: string
    date_range: {
        start: string
        end: string
    }
    summary: {
        total_buckets: number
        total_hours: number
        total_piece_rate_earnings: number
        total_top_up: number
        total_earnings: number
    }
    compliance: {
        workers_below_minimum: number
        workers_total: number
        compliance_rate: number
    }
    picker_breakdown: PickerBreakdown[]
    settings: {
        bucket_rate: number
        min_wage_rate: number   // effective rate (may be floored to legal minimum)
        stored_min_wage: number // raw value from harvest_settings
    }
}

serve(async (req) => {
    // ── CORS Preflight ───────────────────────────────
    const preflight = handlePreflight(req)
    if (preflight) return preflight

    const origin = req.headers.get('Origin')

    try {
        // ── Auth + RBAC ──────────────────────────────
        const { user, supabase } = await requireRole(req, ['admin', 'manager'])
        checkRateLimit(user.id, { maxRequests: 30, windowMs: 60_000 }) // Payroll is sensitive — low limit

        // ── Input Validation ─────────────────────────
        const body = await req.json()
        const { orchard_id, start_date, end_date } = PayrollInputSchema.parse(body)

        console.info(`[Payroll] Calculating for orchard ${orchard_id} from ${start_date} to ${end_date}`)

        // 1. Obtener configuración del orchard desde harvest_settings
        // Nota: bucket_rate = piece_rate en harvest_settings (mismo concepto, nombre legacy en código)
        const { data: settings, error: settingsError } = await supabase
            .from('harvest_settings')
            .select('piece_rate, min_wage_rate')
            .eq('orchard_id', orchard_id)
            .single()

        if (settingsError || !settings) {
            throw new Error(`Harvest settings not found for orchard ${orchard_id}: ${settingsError?.message}`)
        }

        const { piece_rate: bucket_rate, min_wage_rate: stored_min_wage } = settings

        // Floor legal: Minimum Wage Order 2026, efectivo 1 April 2026
        // Garantía defensiva — la migración 20260412 ya lo corrige en DB,
        // pero si la migración no se aplicó en algún entorno, esto evita sub-pagos ilegales.
        const NZ_MIN_WAGE_FLOOR = 23.95
        const min_wage_rate = Math.max(stored_min_wage, NZ_MIN_WAGE_FLOOR)

        if (stored_min_wage < NZ_MIN_WAGE_FLOOR) {
            console.warn(
                `[Payroll] COMPLIANCE WARNING: orchard ${orchard_id} has min_wage_rate=${stored_min_wage} < legal floor ${NZ_MIN_WAGE_FLOOR}. Using floor. Run migration 20260412_harvest_settings_min_wage_floor.sql.`
            )
        }

        console.info(`[Payroll] Settings - Bucket rate: $${bucket_rate}, Min wage: $${min_wage_rate}/hr`)

        // 2. Obtener bucket_records del rango (NZST boundaries)
        // Excluir grade='reject' — buckets rechazados por QC no cuentan para piece-rate
        const { data: events, error: eventsError } = await supabase
            .from('bucket_records')
            .select('picker_id, scanned_at, quality_grade, scanned_by, users:scanned_by(name)')
            .eq('orchard_id', orchard_id)
            .is('deleted_at', null)
            .neq('quality_grade', 'reject')
            .gte('scanned_at', toNZBoundary(start_date, '00:00:00'))
            .lte('scanned_at', toNZBoundary(end_date, '23:59:59'))

        if (eventsError) {
            throw new Error(`Failed to fetch bucket records: ${eventsError.message}`)
        }

        console.info(`[Payroll] Found ${events?.length || 0} bucket records (rejected excluded)`)

        // 2b. Fetch attendance records for actual hours (ALL days in range)
        const { data: attendance } = await supabase
            .from('daily_attendance')
            .select('picker_id, date, check_in_time, check_out_time')
            .eq('orchard_id', orchard_id)
            .gte('date', start_date)
            .lte('date', end_date)

        // NZ Employment Relations Act 2000, s.69ZD:
        // 30-minute paid meal break mandatory for shifts > 4 hours
        const MEAL_BREAK_HOURS = 0.5
        const MEAL_BREAK_THRESHOLD = 4 // hours

        // Build attendance map: picker_id -> total hours across ALL days
        const attendanceHoursMap = new Map<string, number>()
        attendance?.forEach((a: { picker_id: string; check_in_time: string | null; check_out_time: string | null }) => {
            if (a.check_in_time) {
                const checkIn = new Date(a.check_in_time)
                const checkOut = a.check_out_time ? new Date(a.check_out_time) : null

                if (checkOut) {
                    const rawDayHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
                    const dayHours = rawDayHours > MEAL_BREAK_THRESHOLD
                        ? rawDayHours - MEAL_BREAK_HOURS
                        : rawDayHours
                    const prev = attendanceHoursMap.get(a.picker_id) || 0
                    attendanceHoursMap.set(a.picker_id, prev + Math.max(0, dayHours))
                }
            }
        })

        // 3. Agrupar por picker y calcular stats
        const pickerStatsMap = new Map<string, {
            picker_id: string
            picker_name: string
            buckets: number
            first_scan: Date
            last_scan: Date
        }>()

        events?.forEach(event => {
            const pickerId = event.picker_id
            const scanTime = new Date(event.scanned_at)
            const pickerName = (event.users as { name: string } | null)?.name || 'Unknown'

            const existing = pickerStatsMap.get(pickerId)

            if (!existing) {
                pickerStatsMap.set(pickerId, {
                    picker_id: pickerId,
                    picker_name: pickerName,
                    buckets: 1,
                    first_scan: scanTime,
                    last_scan: scanTime
                })
            } else {
                existing.buckets++
                if (scanTime < existing.first_scan) existing.first_scan = scanTime
                if (scanTime > existing.last_scan) existing.last_scan = scanTime
            }
        })

        // 4. Calcular earnings y compliance
        const picker_breakdown: PickerBreakdown[] = []
        let total_buckets = 0
        let total_hours = 0
        let total_piece_rate_earnings = 0
        let total_top_up = 0
        let workers_below_minimum = 0

        for (const [/* key */, stats] of pickerStatsMap) {
            let hours_worked: number
            const attendanceTotal = attendanceHoursMap.get(stats.picker_id)

            if (attendanceTotal !== undefined && attendanceTotal > 0) {
                hours_worked = attendanceTotal
            } else {
                const raw_hours = (stats.last_scan.getTime() - stats.first_scan.getTime()) / (1000 * 60 * 60)
                hours_worked = raw_hours > MEAL_BREAK_THRESHOLD
                    ? raw_hours - MEAL_BREAK_HOURS
                    : raw_hours
            }

            const piece_rate_earnings = stats.buckets * bucket_rate
            const hourly_rate = hours_worked > 0 ? piece_rate_earnings / hours_worked : 0
            const minimum_required = hours_worked * min_wage_rate
            const top_up_required = Math.max(0, minimum_required - piece_rate_earnings)
            const total_earnings = piece_rate_earnings + top_up_required
            const is_below_minimum = hourly_rate < min_wage_rate && hours_worked > 0

            if (is_below_minimum) {
                workers_below_minimum++
            }

            picker_breakdown.push({
                picker_id: stats.picker_id,
                picker_name: stats.picker_name,
                buckets: stats.buckets,
                hours_worked: parseFloat(hours_worked.toFixed(2)),
                piece_rate_earnings: parseFloat(piece_rate_earnings.toFixed(2)),
                hourly_rate: parseFloat(hourly_rate.toFixed(2)),
                minimum_required: parseFloat(minimum_required.toFixed(2)),
                top_up_required: parseFloat(top_up_required.toFixed(2)),
                total_earnings: parseFloat(total_earnings.toFixed(2)),
                is_below_minimum
            })

            total_buckets += stats.buckets
            total_hours += hours_worked
            total_piece_rate_earnings += piece_rate_earnings
            total_top_up += top_up_required
        }

        const total_earnings = total_piece_rate_earnings + total_top_up
        const workers_total = pickerStatsMap.size
        const compliance_rate = workers_total > 0
            ? ((workers_total - workers_below_minimum) / workers_total) * 100
            : 100

        const result: PayrollResult = {
            orchard_id,
            date_range: { start: start_date, end: end_date },
            summary: {
                total_buckets,
                total_hours: parseFloat(total_hours.toFixed(2)),
                total_piece_rate_earnings: parseFloat(total_piece_rate_earnings.toFixed(2)),
                total_top_up: parseFloat(total_top_up.toFixed(2)),
                total_earnings: parseFloat(total_earnings.toFixed(2))
            },
            compliance: {
                workers_below_minimum,
                workers_total,
                compliance_rate: parseFloat(compliance_rate.toFixed(2))
            },
            picker_breakdown,
            settings: { bucket_rate, min_wage_rate, stored_min_wage }
        }

        console.info(`[Payroll] Complete - Total: $${total_earnings}, Top-up: $${total_top_up}`)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return errorResponse(error, origin, 'Payroll')
    }
})
