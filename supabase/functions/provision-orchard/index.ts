// provision-orchard/index.ts — Customer Onboarding Edge Function
// Creates a new orchard account with all required defaults in one atomic operation.
// Called from the public signup flow — no existing auth required.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handlePreflight } from '../_shared/security.ts';
import { z } from 'npm:zod@^3.22.4';

// Esquema de validacion con Zod para el request de provision
const ProvisionRequestSchema = z.object({
  orchard_name: z.string().min(1, 'orchard_name is required').trim(),
  orchard_address: z.string().trim().optional(),
  total_rows: z.number().int().positive().optional(),
  admin_email: z.string().email('Valid admin_email is required'),
  admin_password: z.string().min(8, 'admin_password must be at least 8 characters'),
  admin_name: z.string().min(1, 'admin_name is required').trim(),
  accepted_terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Service' }) }),
  accepted_privacy: z.literal(true, { errorMap: () => ({ message: 'You must accept the Privacy Policy' }) }),
  terms_version: z.string().min(1),
  privacy_version: z.string().min(1),
});

type _ProvisionRequest = z.infer<typeof ProvisionRequestSchema>;

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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse(new Error('Faltan variables de entorno del servidor'), origin, 'provision-orchard', 500);
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const rawBody = await req.json();

    // ── Validacion con Zod ────────────────────────────────────────────────
    const parseResult = ProvisionRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message ?? 'Invalid input';
      return err(400, firstError, headers);
    }
    const body = parseResult.data;

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
        name: body.orchard_name,
        address: body.orchard_address || null,
        total_rows: body.total_rows || 20,
        created_by: userId,
      })
      .select('id, name')
      .single();

    if (orchardError) {
      // Rollback: eliminar usuario creado
      await supabase.auth.admin.deleteUser(userId);
      return err(500, `Failed to create orchard: ${orchardError.message}`, headers);
    }

    const orchardId = orchard.id;

    // ── Steps 3-5: Membership, settings, wage rates (con rollback) ───────
    const { error: memberError } = await supabase.from('orchard_members').insert({
      orchard_id: orchardId,
      user_id: userId,
      role: 'admin',
      invited_by: userId,
    });

    if (memberError) {
      console.error('[provision-orchard] orchard_members insert failed:', memberError);
      // Rollback: eliminar orchard y usuario
      await supabase.from('orchards').delete().eq('id', orchardId);
      await supabase.auth.admin.deleteUser(userId);
      return err(500, 'Failed to set up orchard membership. Please try again.', headers);
    }

    const { error: settingsError } = await supabase.from('orchard_settings').insert({
      orchard_id: orchardId,
      piece_rate: 6.50,
      target_tons: 100,
      min_buckets_per_hour: 3,
    });

    if (settingsError) {
      console.error('[provision-orchard] orchard_settings insert failed:', settingsError);
      // Rollback: eliminar membership, orchard y usuario
      await supabase.from('orchard_members').delete().eq('orchard_id', orchardId);
      await supabase.from('orchards').delete().eq('id', orchardId);
      await supabase.auth.admin.deleteUser(userId);
      return err(500, 'Failed to create orchard settings. Please try again.', headers);
    }

    const effectiveDate = new Date().toISOString().split('T')[0];
    const { error: wageError } = await supabase.from('wage_rates').insert([
      { orchard_id: orchardId, job_type: 'picker',       hourly_rate: 23.15, piece_rate_eligible: true,  piece_rate_per_bin: 6.50, effective_from: effectiveDate, updated_by: userId },
      { orchard_id: orchardId, job_type: 'team_leader',  hourly_rate: 26.00, piece_rate_eligible: true,  piece_rate_per_bin: 6.50, effective_from: effectiveDate, updated_by: userId },
      { orchard_id: orchardId, job_type: 'runner',       hourly_rate: 24.00, piece_rate_eligible: false, piece_rate_per_bin: null,  effective_from: effectiveDate, updated_by: userId },
      { orchard_id: orchardId, job_type: 'manager',      hourly_rate: 45.00, piece_rate_eligible: false, piece_rate_per_bin: null,  effective_from: effectiveDate, updated_by: userId },
    ]);

    if (wageError) {
      console.error('[provision-orchard] wage_rates insert failed:', wageError);
      // Rollback: eliminar settings, membership, orchard y usuario
      await supabase.from('orchard_settings').delete().eq('orchard_id', orchardId);
      await supabase.from('orchard_members').delete().eq('orchard_id', orchardId);
      await supabase.from('orchards').delete().eq('id', orchardId);
      await supabase.auth.admin.deleteUser(userId);
      return err(500, 'Failed to create wage rates. Please try again.', headers);
    }

    // ── Step 6: Audit log (no-critico, no requiere rollback) ──────────────
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
    // Errores de Zod no capturados por safeParse (ej: JSON parse error)
    console.error('[provision-orchard] Unexpected error:', e);
    return err(500, 'An unexpected error occurred. Please try again.', headers);
  }
});

function err(status: number, message: string, headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
