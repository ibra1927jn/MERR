import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

        console.log(`[Payroll] Settings - Bucket rate: $${bucket_rate}, Min wage: $${min_wage_rate}/hr`)

        // 2. Obtener todos los bucket_events del rango
        const { data: events, error: eventsError } = await supabaseClient
            .from('bucket_events')
            .select('picker_id, recorded_at, users(name)')
            .eq('orchard_id', orchard_id)
            .gte('recorded_at', `${start_date}T00:00:00Z`)
            .lte('recorded_at', `${end_date}T23:59:59Z`)

        if (eventsError) {
            throw new Error(`Failed to fetch bucket events: ${eventsError.message}`)
        }

        console.log(`[Payroll] Found ${events?.length || 0} bucket events`)

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

        for (const [_, stats] of pickerStatsMap) {
            // Calcular horas trabajadas (desde primer escaneo hasta último)
            const hours_worked = (stats.last_scan.getTime() - stats.first_scan.getTime()) / (1000 * 60 * 60)

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
