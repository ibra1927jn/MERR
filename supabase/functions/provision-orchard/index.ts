// provision-orchard/index.ts — Customer Onboarding Edge Function
// Creates a new orchard account with all required defaults in one atomic operation.
// Called from the public signup flow — no existing auth required.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handlePreflight } from '../_shared/security.ts';

interface ProvisionRequest {
  orchard_name: string;
  orchard_address?: string;
  total_rows?: number;
  admin_email: string;
  admin_password: string;
  admin_name: string;
  accepted_terms: boolean;
  accepted_privacy: boolean;
  terms_version: string;
  privacy_version: string;
}

// Simple in-memory rate limiter (5 signups per IP per hour)
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

serve(async (req: Request) => {
  // ── CORS preflight ────────────────────────────────────────────────────────
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const origin = req.headers.get('Origin');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';

  // ── Rate limiting ─────────────────────────────────────────────────────────
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Too many signup attempts. Please try again in 1 hour.' }),
      { status: 429, headers }
    );
  }

  // ── Service role client ───────────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body: ProvisionRequest = await req.json();

    // ── Validation ────────────────────────────────────────────────────────
    if (!body.orchard_name?.trim())
      return err(400, 'orchard_name is required', headers);
    if (!body.admin_email?.includes('@'))
      return err(400, 'Valid admin_email is required', headers);
    if (!body.admin_password || body.admin_password.length < 8)
      return err(400, 'admin_password must be at least 8 characters', headers);
    if (!body.admin_name?.trim())
      return err(400, 'admin_name is required', headers);
    if (!body.accepted_terms || !body.accepted_privacy)
      return err(400, 'You must accept the Terms of Service and Privacy Policy', headers);

    // ── Step 1: Create admin user ─────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.admin_email,
      password: body.admin_password,
      email_confirm: true,
      user_metadata: {
        name: body.admin_name,
        role: 'admin',
        onboarding_source: 'self-signup',
        accepted_terms_at: new Date().toISOString(),
        terms_version: body.terms_version,
        privacy_version: body.privacy_version,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered'))
        return err(409, 'An account with this email already exists. Please log in.', headers);
      return err(400, `Account creation failed: ${authError.message}`, headers);
    }

    const userId = authData.user.id;

    // ── Step 2: Create orchard ────────────────────────────────────────────
    const { data: orchard, error: orchardError } = await supabase
      .from('orchards')
      .insert({
        name: body.orchard_name.trim(),
        address: body.orchard_address?.trim() || null,
        total_rows: body.total_rows || 20,
        created_by: userId,
      })
      .select('id, name')
      .single();

    if (orchardError) {
      await supabase.auth.admin.deleteUser(userId);
      return err(500, `Failed to create orchard: ${orchardError.message}`, headers);
    }

    const orchardId = orchard.id;

    // ── Step 3: Orchard membership (admin) ────────────────────────────────
    await supabase.from('orchard_members').insert({
      orchard_id: orchardId,
      user_id: userId,
      role: 'admin',
      invited_by: userId,
    });

    // ── Step 4: Default settings ──────────────────────────────────────────
    await supabase.from('orchard_settings').insert({
      orchard_id: orchardId,
      piece_rate: 6.50,
      target_tons: 100,
      min_buckets_per_hour: 3,
    });

    // ── Step 5: Default wage rates (NZ minimums) ──────────────────────────
    await supabase.from('wage_rates').insert([
      { orchard_id: orchardId, job_type: 'picker',       hourly_rate: 23.15, piece_rate_eligible: true,  piece_rate_per_bin: 6.50, effective_from: new Date().toISOString().split('T')[0], updated_by: userId },
      { orchard_id: orchardId, job_type: 'team_leader',  hourly_rate: 26.00, piece_rate_eligible: true,  piece_rate_per_bin: 6.50, effective_from: new Date().toISOString().split('T')[0], updated_by: userId },
      { orchard_id: orchardId, job_type: 'runner',       hourly_rate: 24.00, piece_rate_eligible: false, piece_rate_per_bin: null,  effective_from: new Date().toISOString().split('T')[0], updated_by: userId },
      { orchard_id: orchardId, job_type: 'manager',      hourly_rate: 45.00, piece_rate_eligible: false, piece_rate_per_bin: null,  effective_from: new Date().toISOString().split('T')[0], updated_by: userId },
    ]);

    // ── Step 6: Audit log ─────────────────────────────────────────────────
    await supabase.from('audit_logs').insert({
      action: 'orchard_provisioned',
      table_name: 'orchards',
      record_id: orchardId,
      user_id: userId,
      new_values: { orchard_name: body.orchard_name, source: 'self-signup' },
    });

    return new Response(
      JSON.stringify({
        success: true,
        orchard_id: orchardId,
        orchard_name: orchard.name,
        user_id: userId,
        message: 'Account created successfully. You can now log in.',
      }),
      { status: 201, headers }
    );

  } catch (e) {
    console.error('[provision-orchard] Unexpected error:', e);
    return err(500, 'An unexpected error occurred. Please try again.', headers);
  }
});

function err(status: number, message: string, headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
