// supabase/functions/calculate-wages/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    const { picker_id, start_date, end_date } = await req.json()

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get Bucket Count
    const { data: records } = await supabase
        .from('bucket_records')
        .select('id')
        .eq('picker_id', picker_id)
        .gte('scanned_at', start_date)
        .lte('scanned_at', end_date)

    // 2. Get Settings
    const { data: settings } = await supabase
        .from('harvest_settings')
        .select('*')
        .single()

    const bucketCount = records?.length || 0
    const pieceRatePay = bucketCount * (settings?.piece_rate || 6.50)

    return new Response(
        JSON.stringify({ bucketCount, pieceRatePay }),
        { headers: { "Content-Type": "application/json" } },
    )
})
