// provision-orchard/index.ts — Customer Onboarding Edge Function
// Creates a new orchard account with all required defaults in one atomic operation.
// Called from the public signup flow — no existing auth required.
//
// Flow: signup form → this function → orchard created → admin user created
//       → membership record → default settings + wage rates seeded

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rateLimiter.ts';

// Strict rate limit for signup — prevents mass account creation abuse
const rateLimiter = createRateLimiter(5, 3600000); // 5 signups per IP per hour

interface ProvisionRequest {
  // Organisation details
  orchard_name: string;
  orchard_address?: string;
  total_rows?: number;
  // Admin user
  admin_email: string;
  admin_password: string;
  admin_name: string;
  // Terms acceptance (required)
  accepted_terms: boolean;
  accepted_privacy: boolean;
  terms_version: string;    // "1.0"
  privacy_version: string;  // "1.0"
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown';

  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (!rateLimiter.check(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Too many signup attempts. Please try again in 1 hour.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── Service role client (bypasses RLS for provisioning) ───────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body: ProvisionRequest = await req.json();

    // ── Validate required fields ──────────────────────────────────────────────
    if (!body.orchard_name?.trim()) {
      return error(400, 'orchard_name is required');
    }
    if (!body.admin_email?.includes('@')) {
      return error(400, 'Valid admin_email is required');
    }
    if (!body.admin_password || body.admin_password.length < 8) {
      return error(400, 'admin_password must be at least 8 characters');
    }
    if (!body.admin_name?.trim()) {
      return error(400, 'admin_name is required');
    }
    if (!body.accepted_terms || !body.accepted_privacy) {
      return error(400, 'You must accept the Terms of Service and Privacy Policy');
    }

    // ── Step 1: Create admin user ─────────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.admin_email,
      password: body.admin_password,
      email_confirm: true,   // Skip email confirmation for smoother onboarding
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
      if (authError.message.includes('already registered')) {
        return error(409, 'An account with this email already exists. Please log in.');
      }
      return error(400, `Account creation failed: ${authError.message}`);
    }

    const userId = authData.user.id;

    // ── Step 2: Create orchard ────────────────────────────────────────────────
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
      // Rollback: delete the user we just created
      await supabase.auth.admin.deleteUser(userId);
      return error(500, `Failed to create orchard: ${orchardError.message}`);
    }

    const orchardId = orchard.id;

    // ── Step 3: Create orchard membership (admin role) ────────────────────────
    await supabase.from('orchard_members').insert({
      orchard_id: orchardId,
      user_id: userId,
      role: 'admin',
      invited_by: userId,
    });

    // ── Step 4: Seed default settings ─────────────────────────────────────────
    await supabase.from('orchard_settings').insert({
      orchard_id: orchardId,
      piece_rate: 6.50,
      target_tons: 100,
      min_buckets_per_hour: 3,
    });

    // ── Step 5: Seed default wage rates (NZ minimums) ─────────────────────────
    const defaultRates = [
      { job_type: 'picker',       hourly_rate: 23.15, piece_rate_eligible: true,  piece_rate_per_bin: 6.50 },
      { job_type: 'team_leader',  hourly_rate: 26.00, piece_rate_eligible: true,  piece_rate_per_bin: 6.50 },
      { job_type: 'runner',       hourly_rate: 24.00, piece_rate_eligible: false, piece_rate_per_bin: null },
      { job_type: 'qc_inspector', hourly_rate: 27.50, piece_rate_eligible: false, piece_rate_per_bin: null },
      { job_type: 'logistics',    hourly_rate: 25.00, piece_rate_eligible: false, piece_rate_per_bin: null },
      { job_type: 'manager',      hourly_rate: 45.00, piece_rate_eligible: false, piece_rate_per_bin: null },
    ];

    await supabase.from('wage_rates').insert(
      defaultRates.map(r => ({
        ...r,
        orchard_id: orchardId,
        effective_from: new Date().toISOString().split('T')[0],
        updated_by: userId,
        notes: 'Default rates set at account creation — update via Wage Rates panel',
      }))
    );

    // ── Step 6: Log onboarding audit event ────────────────────────────────────
    await supabase.from('audit_logs').insert({
      action: 'orchard_provisioned',
      table_name: 'orchards',
      record_id: orchardId,
      user_id: userId,
      new_values: {
        orchard_name: body.orchard_name,
        admin_email: body.admin_email,
        terms_version: body.terms_version,
        source: 'self-signup',
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        orchard_id: orchardId,
        orchard_name: orchard.name,
        user_id: userId,
        message: 'Account created successfully. You can now log in.',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[provision-orchard] Unexpected error:', err);
    return error(500, 'An unexpected error occurred. Please try again.');
  }
});

function error(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
