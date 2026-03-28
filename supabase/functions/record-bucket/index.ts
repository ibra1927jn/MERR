import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
    handlePreflight,
    requireRole,
    errorResponse,
    jsonResponse,
    checkRateLimit,
    BucketRecordSchema,
} from '../_shared/security.ts'

/**
 * record-bucket — Server-side bucket/scan recording
 *
 * This is the FINANCIAL LEDGER — picker pay depends on this data.
 * Moving to server-side prevents:
 * - DevTools manipulation of bucket counts
 * - Injection of fake scan records
 * - Badge ID spoofing
 *
 * Security: Requires admin/manager/team_leader role
 */
serve(async (req) => {
    const preflight = handlePreflight(req)
    if (preflight) return preflight

    const origin = req.headers.get('Origin')

    try {
        const { user, supabase } = await requireRole(req, ['admin', 'manager', 'team_leader'])
        checkRateLimit(user.id, { maxRequests: 120, windowMs: 60_000 }) // Higher limit for rapid scanning

        const body = await req.json()
        const input = BucketRecordSchema.parse(body)

        let finalPickerId = input.picker_id

        // ── Badge-to-UUID Resolution ─────────────────
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(finalPickerId)) {
            // Resolve badge/harness ID to picker UUID
            const { data: picker, error: lookupErr } = await supabase
                .from('pickers')
                .select('id')
                .eq('picker_id', finalPickerId)
                .eq('orchard_id', input.orchard_id)
                .maybeSingle()

            if (lookupErr) throw new Error(`Badge lookup failed: ${lookupErr.message}`)

            if (!picker) {
                // EXACT MATCH ONLY — no fuzzy matching for financial safety
                throw new Error(
                    `Unknown badge ID: "${finalPickerId}". ` +
                    `No picker found with this exact ID in the orchard.`
                )
            }

            finalPickerId = picker.id
        }

        // ── Insert Bucket Record ─────────────────────
        const scannedAt = input.scanned_at || new Date().toISOString()

        const { data: record, error: insertErr } = await supabase
            .from('bucket_records')
            .insert({
                picker_id: finalPickerId,
                orchard_id: input.orchard_id,
                row_number: input.row_number,
                quality_grade: input.quality_grade,
                bin_id: input.bin_id,
                scanned_by: input.scanned_by,
                scanned_at: scannedAt,
            })
            .select('id, picker_id, scanned_at')
            .single()

        if (insertErr) {
            throw new Error(`Failed to record bucket: ${insertErr.message}`)
        }

        console.info(`[record-bucket] Recorded: picker=${finalPickerId}, row=${input.row_number}, by=${user.id}`)

        return jsonResponse({
            id: record.id,
            picker_id: record.picker_id,
            scanned_at: record.scanned_at,
            resolved_from_badge: finalPickerId !== input.picker_id,
        }, origin)

    } catch (error) {
        return errorResponse(error, origin, 'record-bucket')
    }
})
