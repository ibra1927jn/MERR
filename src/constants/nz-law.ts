/**
 * nz-law.ts — New Zealand Employment Law Constants
 *
 * ⚠️ These are LEGAL FLOOR values, NOT operational rates.
 * Operational wage rates are configured per job type in the database
 * (wage_rates table) and editable from Admin/HR Settings.
 *
 * Update this file annually when NZ Minimum Wage Orders change:
 * https://www.employment.govt.nz/hours-and-wages/pay/minimum-wage/minimum-wage-rates
 */

/**
 * Legal NZ minimum wage from 1 April 2025 (Minimum Wage Order 2025)
 * Nota: $23.15/hr se mantuvo igual que 2024. Nombre actualizado para claridad.
 * Para tasas fiscales versionadas ver: config/nz-tax-rates.ts
 */
export const NZ_MINIMUM_WAGE_2025 = 23.15; // $/hr
/** @deprecated Usa NZ_MINIMUM_WAGE_2025 — alias para compatibilidad */
export const NZ_MINIMUM_WAGE_2024 = NZ_MINIMUM_WAGE_2025;

/** Starting-out / training wage (80% of adult minimum) */
export const NZ_STARTING_OUT_WAGE_2025 = 18.52; // $/hr
/** @deprecated Usa NZ_STARTING_OUT_WAGE_2025 */
export const NZ_STARTING_OUT_WAGE_2024 = NZ_STARTING_OUT_WAGE_2025;

/** Default piece rate per bin — used only as fallback when DB settings are unavailable offline */
export const NZ_DEFAULT_PIECE_RATE = 6.5; // $/bin

/** Maximum daily work hours before mandatory rest (NZ H&S Act) */
export const NZ_MAX_DAILY_HOURS = 12;

/** Rest break: 10 min paid for every 2 hours worked (Employment Relations Act 2000) */
export const NZ_REST_BREAK_INTERVAL_HOURS = 2;
export const NZ_REST_BREAK_DURATION_MINUTES = 10;

/** Meal break: 30 min (may be unpaid) for every 4 hours worked */
export const NZ_MEAL_BREAK_INTERVAL_HOURS = 4;
export const NZ_MEAL_BREAK_DURATION_MINUTES = 30;

/** KiwiSaver employee contribution rates available (3%, 4%, 6%, 8%, 10%) */
export const NZ_KIWISAVER_RATES = [0.03, 0.04, 0.06, 0.08, 0.10] as const;
export const NZ_KIWISAVER_EMPLOYER_MIN = 0.03;

/**
 * Default wage rates per job type — these are the DB fallback values
 * used when the `wage_rates` table hasn't been configured yet.
 * Admin/HR updates these via the Settings → Wage Rates panel.
 */
export const NZ_DEFAULT_WAGE_RATES: WageRateDefaults = {
  picker:           23.15,  // Minimum wage floor
  team_leader:      26.00,  // Typically $2-5 above minimum
  runner:           24.00,  // Runner premium
  qc_inspector:     27.50,  // Skilled role
  logistics:        25.00,  // Logistics
  hr_admin:         32.00,  // Salaried
  manager:          45.00,  // Salaried
  admin:            35.00,  // Salaried
};

export type JobType = keyof typeof NZ_DEFAULT_WAGE_RATES;

export interface WageRateDefaults {
  picker: number;
  team_leader: number;
  runner: number;
  qc_inspector: number;
  logistics: number;
  hr_admin: number;
  manager: number;
  admin: number;
}
