/**
 * API Schemas — Zod runtime validation for external data boundaries
 *
 * These schemas validate data coming from:
 * - Supabase Edge Functions (payroll, attendance, etc.)
 * - Supabase DB queries (picker lists, settings)
 *
 * Why: TypeScript `as T` casts provide zero runtime safety.
 * A malformed Edge Function response will silently corrupt state.
 * Zod catches this at the boundary and provides actionable error messages.
 */
import { z } from 'zod';

// ── Payroll Boundaries ─────────────────────────────

export const PickerBreakdownSchema = z.object({
    picker_id: z.string().min(1),
    picker_name: z.string(),
    buckets: z.number().int().nonnegative(),
    hours_worked: z.number().nonnegative(),
    piece_rate_earnings: z.number().nonnegative(),
    hourly_rate: z.number().nonnegative(),
    minimum_required: z.number().nonnegative(),
    top_up_required: z.number().nonnegative(),
    total_earnings: z.number().nonnegative(),
    is_below_minimum: z.boolean(),
});

export const PayrollResultSchema = z.object({
    orchard_id: z.string().min(1),
    date_range: z.object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    summary: z.object({
        total_buckets: z.number().int().nonnegative(),
        total_hours: z.number().nonnegative(),
        total_piece_rate_earnings: z.number().nonnegative(),
        total_top_up: z.number().nonnegative(),
        total_earnings: z.number().nonnegative(),
    }),
    compliance: z.object({
        workers_below_minimum: z.number().int().nonnegative(),
        workers_total: z.number().int().nonnegative(),
        compliance_rate: z.number().min(0).max(100),
    }),
    picker_breakdown: z.array(PickerBreakdownSchema),
    settings: z.object({
        bucket_rate: z.number().positive(),
        min_wage_rate: z.number().positive(),
    }),
});

// ── Attendance Boundaries ──────────────────────────

export const CheckInResponseSchema = z.object({
    picker_id: z.string().min(1),
    status: z.string(),
    id: z.string().min(1),
    already_checked_in: z.boolean(),
});

export const CheckOutResponseSchema = z.object({
    id: z.string().min(1),
    picker_id: z.string().min(1),
    check_out_time: z.string(),
    hours_worked: z.number().nonnegative(),
});

// ── Picker Boundaries ──────────────────────────────

export const PickerSchema = z.object({
    id: z.string().min(1),
    name: z.string(),
    picker_id: z.string().nullable().optional(),
    role: z.string().default('picker'),
    status: z.string().default('active'),
    orchard_id: z.string().min(1).nullable().optional(),
    team_leader_id: z.string().min(1).nullable().optional(),
    current_row: z.number().int().nullable().optional(),
    safety_verified: z.boolean().nullable().optional(),
});

// ── Safe Parse Helper ──────────────────────────────

/**
 * Validate external data against a Zod schema.
 * On failure, logs the error and throws with a descriptive message.
 *
 * @example
 *   const data = await edgeFunctionsRepository.invoke('payroll', body);
 *   return validateResponse(PayrollResultSchema, data, 'calculatePayroll');
 */
export function validateResponse<T>(
    schema: z.ZodType<T>,
    data: unknown,
    operationName: string
): T {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    // Log detailed validation errors for debugging
    const issues = result.error.issues
        .map(i => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n');
    const errorMsg = `[Zod] ${operationName} response validation failed:\n${issues}`;
    console.error(errorMsg);

    throw new Error(`Invalid ${operationName} response from server`);
}
