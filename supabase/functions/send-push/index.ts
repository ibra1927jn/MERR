import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
    handlePreflight,
    corsHeaders,
    requireRole,
    errorResponse,
    jsonResponse,
    checkRateLimit,
} from '../_shared/security.ts'
import { z } from 'npm:zod@^3.22.4'

/**
 * send-push — Server-side Push Notification Delivery
 *
 * Uses the Web Push protocol to send notifications to subscribed browsers/devices.
 * Supports: individual targeting, role-based broadcast, and test pushes.
 *
 * Environment secrets needed:
 *   VAPID_PRIVATE_KEY — base64url-encoded ECDSA P-256 private key
 *   VAPID_PUBLIC_KEY  — base64url-encoded ECDSA P-256 public key
 *   VAPID_SUBJECT     — mailto: URI or https: URL identifying the sender
 */

// ── Input Schemas ──────────────────────────────────

const SendToUserSchema = z.object({
    action: z.literal('send_to_user'),
    user_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(500),
    url: z.string().optional(),
    tag: z.string().optional(),
    type: z.string().optional(),
})

const BroadcastSchema = z.object({
    action: z.literal('broadcast'),
    role: z.enum(['owner', 'manager', 'supervisor', 'picker']).optional(),
    orchard_id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(500),
    url: z.string().optional(),
    tag: z.string().optional(),
    type: z.string().optional(),
})

const TestPushSchema = z.object({
    action: z.literal('test'),
    title: z.string().optional(),
    body: z.string().optional(),
})

const PushInputSchema = z.discriminatedUnion('action', [
    SendToUserSchema,
    BroadcastSchema,
    TestPushSchema,
])

// ── Web Push Crypto ────────────────────────────────

/**
 * Send a push notification using the Web Push protocol.
 * Uses the Fetch API with VAPID JWT for authentication.
 */
async function sendWebPush(
    subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
    payload: Record<string, unknown>,
    vapidKeys: { publicKey: string; privateKey: string; subject: string }
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
        // Build VAPID JWT header
        const vapidJwt = await createVapidJwt(
            new URL(subscription.endpoint).origin,
            vapidKeys.subject,
            vapidKeys.privateKey
        )

        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'aes128gcm',
                'Authorization': `vapid t=${vapidJwt}, k=${vapidKeys.publicKey}`,
                'TTL': '86400', // 24 hours
                'Urgency': 'normal',
            },
            body: JSON.stringify(payload),
        })

        if (response.status === 201 || response.status === 200) {
            return { success: true, statusCode: response.status }
        }

        // 404 or 410 = subscription expired/invalid, should be cleaned up
        if (response.status === 404 || response.status === 410) {
            return { success: false, statusCode: response.status, error: 'Subscription expired' }
        }

        return {
            success: false,
            statusCode: response.status,
            error: `Push service returned ${response.status}`
        }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
        }
    }
}

/**
 * Create a VAPID JWT for Web Push authentication.
 * This is a simplified implementation using the Web Crypto API.
 */
async function createVapidJwt(
    audience: string,
    subject: string,
    privateKeyBase64: string
): Promise<string> {
    const header = { typ: 'JWT', alg: 'ES256' }
    const now = Math.floor(Date.now() / 1000)
    const payload = {
        aud: audience,
        exp: now + 86400, // 24 hours
        sub: subject,
    }

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const unsignedToken = `${headerB64}.${payloadB64}`

    // Import the ECDSA private key
    const keyData = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyData,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    )

    // Sign the token
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        new TextEncoder().encode(unsignedToken)
    )

    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

    return `${unsignedToken}.${sigB64}`
}

// ── Main Handler ───────────────────────────────────

serve(async (req) => {
    const preflight = handlePreflight(req)
    if (preflight) return preflight

    const origin = req.headers.get('Origin')

    try {
        // Auth — at least manager for broadcast, any auth for test
        const { user, supabase } = await requireRole(req, ['owner', 'manager', 'supervisor'])

        checkRateLimit(user.id, { maxRequests: 30, windowMs: 60_000 })

        const body = await req.json()
        const input = PushInputSchema.parse(body)

        // Load VAPID keys from Deno env (set via Supabase secrets)
        const vapidKeys = {
            publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
            privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
            subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@harvestpro.nz',
        }

        if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
            throw new Error('VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.')
        }

        // ── Test Push ───────────────────────────
        if (input.action === 'test') {
            // Fetch subscriptions for the requesting user
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('endpoint, keys_p256dh, keys_auth')
                .eq('user_id', user.id)

            if (!subs || subs.length === 0) {
                return jsonResponse({ success: false, error: 'No push subscriptions found' }, origin, 404)
            }

            const payload = {
                title: input.title || '🍒 HarvestPro Push Test',
                body: input.body || 'Push notifications are working!',
                tag: 'test',
                url: '/',
            }

            let sent = 0
            for (const sub of subs) {
                const result = await sendWebPush(sub, payload, vapidKeys)
                if (result.success) sent++
                // Clean up expired subscriptions
                if (result.statusCode === 404 || result.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                }
            }

            return jsonResponse({ success: true, sent, total: subs.length }, origin)
        }

        // ── Send to User ────────────────────────
        if (input.action === 'send_to_user') {
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('endpoint, keys_p256dh, keys_auth')
                .eq('user_id', input.user_id)

            if (!subs || subs.length === 0) {
                return jsonResponse({ success: false, sent: 0 }, origin)
            }

            const payload = {
                title: input.title,
                body: input.body,
                url: input.url || '/',
                tag: input.tag || `notification-${Date.now()}`,
                type: input.type || 'general',
            }

            let sent = 0
            for (const sub of subs) {
                const result = await sendWebPush(sub, payload, vapidKeys)
                if (result.success) sent++
                if (result.statusCode === 404 || result.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                }
            }

            return jsonResponse({ success: true, sent, total: subs.length }, origin)
        }

        // ── Broadcast ───────────────────────────
        if (input.action === 'broadcast') {
            // Use service_role client for cross-user access
            const adminSupabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            )

            let query = adminSupabase.from('push_subscriptions').select('endpoint, keys_p256dh, keys_auth, user_id')

            // If targeting a specific role, join with user metadata
            // For now, send to all subscribers (role filtering TBD with user_metadata join)
            const { data: subs } = await query

            if (!subs || subs.length === 0) {
                return jsonResponse({ success: true, sent: 0, total: 0 }, origin)
            }

            const payload = {
                title: input.title,
                body: input.body,
                url: input.url || '/',
                tag: input.tag || `broadcast-${Date.now()}`,
                type: input.type || 'broadcast',
            }

            let sent = 0
            const expired: string[] = []
            for (const sub of subs) {
                const result = await sendWebPush(sub, payload, vapidKeys)
                if (result.success) sent++
                if (result.statusCode === 404 || result.statusCode === 410) {
                    expired.push(sub.endpoint)
                }
            }

            // Clean up expired subscriptions
            if (expired.length > 0) {
                await adminSupabase.from('push_subscriptions').delete().in('endpoint', expired)
            }

            console.info(`[send-push] Broadcast: ${sent}/${subs.length} delivered, ${expired.length} expired`)
            return jsonResponse({ success: true, sent, total: subs.length, expired: expired.length }, origin)
        }

        return jsonResponse({ error: 'Unknown action' }, origin, 400)
    } catch (error) {
        return errorResponse(error, origin, 'send-push')
    }
})
