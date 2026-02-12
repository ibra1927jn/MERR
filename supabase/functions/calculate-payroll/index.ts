import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// FIX U3: Dynamic NZST offset — handles DST transitions correctly
function getNZOffset(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    const fmt = new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        timeZoneName: 'longOffset'
    });
    const parts = fmt.formatToParts(d);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    // Format: "GMT+13:00" or "GMT+12:00" → extract "+13:00"
    const offset = tzPart?.value?.replace('GMT', '') || '+13:00';
    return offset;
}

function toNZBoundary(dateStr: string, time: string): string {
    return `${dateStr}T${time}${getNZOffset(dateStr)}`;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayrollRequest {
    orchard_id: string
    start_date: string
    end_date: string
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
        min_wage_rate: number
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verificar autenticación
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Crear cliente Supabase con el token del usuario
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // Parse request body
        const { orchard_id, start_date, end_date }: PayrollRequest = await req.json()

        if (!orchard_id || !start_date || !end_date) {
            throw new Error('Missing required parameters: orchard_id, start_date, end_date')
        }

        // eslint-disable-next-line no-console
        console.log(`[Payroll] Calculating for orchard ${orchard_id} from ${start_date} to ${end_date}`)

        // 1. Obtener configuración del orchard
        const { data: orchard, error: orchardError } = await supabaseClient
            .from('orchards')
            .select('bucket_rate, min_wage_rate')
            .eq('id', orchard_id)
            .single()

        if (orchardError || !orchard) {
            throw new Error(`Orchard not found or missing settings: ${orchardError?.message}`)
        }

        const { bucket_rate, min_wage_rate } = orchard

        // eslint-disable-next-line no-console
        console.log(`[Payroll] Settings - Bucket rate: $${bucket_rate}, Min wage: $${min_wage_rate}/hr`)

        // 2. Obtener todos los bucket_events del rango (NZST boundaries)
        const { data: events, error: eventsError } = await supabaseClient
            .from('bucket_events')
            .select('picker_id, recorded_at, users(name)')
            .eq('orchard_id', orchard_id)
            .gte('recorded_at', toNZBoundary(start_date, '00:00:00'))
            .lte('recorded_at', toNZBoundary(end_date, '23:59:59'))

        if (eventsError) {
            throw new Error(`Failed to fetch bucket events: ${eventsError.message}`)
        }

        // eslint-disable-next-line no-console
        console.log(`[Payroll] Found ${events?.length || 0} bucket events`)

        // 2b. Fetch attendance records for actual hours (ALL days in range)
        const { data: attendance } = await supabaseClient
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
        // FIX: Previous code used .set() which overwrote multi-day data
        const attendanceHoursMap = new Map<string, number>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attendance?.forEach((a: any) => {
            if (a.check_in_time) {
                const checkIn = new Date(a.check_in_time)
                const checkOut = a.check_out_time ? new Date(a.check_out_time) : null

                if (checkOut) {
                    const rawDayHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
                    // Deduct meal break PER DAY for shifts > 4h
                    const dayHours = rawDayHours > MEAL_BREAK_THRESHOLD
                        ? rawDayHours - MEAL_BREAK_HOURS
                        : rawDayHours
                    const prev = attendanceHoursMap.get(a.picker_id) || 0
                    attendanceHoursMap.set(a.picker_id, prev + Math.max(0, dayHours))
                }
                // If no check_out: skip this day (will fall back to scan span)
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
            const scanTime = new Date(event.recorded_at)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pickerName = (event.users as any)?.name || 'Unknown'

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
            // Use attendance hours (already aggregated across days with meal breaks deducted)
            // Fall back to scan span if no attendance records exist
            let hours_worked: number
            const attendanceTotal = attendanceHoursMap.get(stats.picker_id)

            if (attendanceTotal !== undefined && attendanceTotal > 0) {
                hours_worked = attendanceTotal
            } else {
                // Fallback: scan span (last_scan - first_scan), deduct meal break
                const raw_hours = (stats.last_scan.getTime() - stats.first_scan.getTime()) / (1000 * 60 * 60)
                hours_worked = raw_hours > MEAL_BREAK_THRESHOLD
                    ? raw_hours - MEAL_BREAK_HOURS
                    : raw_hours
            }

            // Earnings por piece rate
            const piece_rate_earnings = stats.buckets * bucket_rate

            // Wage por hora
            const hourly_rate = hours_worked > 0 ? piece_rate_earnings / hours_worked : 0

            // Calcular mínimo requerido y top-up
            const minimum_required = hours_worked * min_wage_rate
            const top_up_required = Math.max(0, minimum_required - piece_rate_earnings)

            // Total earnings (piece rate + top up)
            const total_earnings = piece_rate_earnings + top_up_required

            // Check compliance
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
            date_range: {
                start: start_date,
                end: end_date
            },
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
            settings: {
                bucket_rate,
                min_wage_rate
            }
        }

        // eslint-disable-next-line no-console
        console.log(`[Payroll] Calculation complete - Total: $${total_earnings}, Top-up: $${total_top_up}`)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[Payroll] Error:', error)

        return new Response(
            JSON.stringify({
                error: error.message,
                details: error.stack
            }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
