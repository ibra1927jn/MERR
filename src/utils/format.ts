/**
 * format.ts — Shared formatting utilities for NZD currency, dates, and numbers
 *
 * PERF-1 FIX: All monetary values must go through formatNZD() — never plain
 * `$${value.toFixed(2)}` which ignores locale, currency symbol, and grouping.
 *
 * PERF-2 FIX: All dates use Intl.DateTimeFormat('en-NZ') for consistency across
 * the app — eliminates mixed browser-default locale rendering.
 */

/** Format a number as NZD currency — e.g. 23.15 → "$23.15" */
export function formatNZD(amount: number, showCents = true): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

/** Format NZD without the $ sign — useful for table cells already in NZD context */
export function formatNZDRaw(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('en-NZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Format a date string or Date as NZ short date — e.g. "20/03/2026" */
export function formatDateNZ(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-NZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Pacific/Auckland',
  }).format(d);
}

/** Format as NZ long date — e.g. "20 March 2026" */
export function formatDateLongNZ(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Pacific/Auckland',
  }).format(d);
}

/** Format as NZ date + time — e.g. "20/03/2026, 9:45 am" */
export function formatDateTimeNZ(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-NZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Pacific/Auckland',
  }).format(d);
}

/** Format a duration in decimal hours as "Xh Ym" — e.g. 8.75 → "8h 45m" */
export function formatHours(decimalHours: number): string {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format a rate as "$/hr" — e.g. 23.15 → "$23.15/hr" */
export function formatHourlyRate(rate: number): string {
  return `${formatNZD(rate)}/hr`;
}

/** Format a piece rate as "$/bin" — e.g. 6.50 → "$6.50/bin" */
export function formatPieceRate(rate: number): string {
  return `${formatNZD(rate)}/bin`;
}

/** Format % with 1 decimal — e.g. 98.333 → "98.3%" */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
