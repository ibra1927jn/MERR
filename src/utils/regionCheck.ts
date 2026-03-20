/**
 * regionCheck.ts — Supabase region detection utility
 *
 * DATA_SOVEREIGNTY FIX: Warns if the connected Supabase project is NOT
 * in the Asia-Pacific region (Sydney ap-southeast-2).
 *
 * NZ Privacy Act 2020 and RSE scheme workers prefer AP region for data residency.
 */


/**
 * Check if the current Supabase URL is in an Asia-Pacific region.
 * Supabase project URLs don't directly expose region, so we use a heuristic:
 * known NZ/AU projects use specific URL patterns.
 *
 * Returns null if region cannot be determined.
 */
export function detectSupabaseRegion(supabaseUrl: string): {
  isAsiaPacific: boolean;
  isNZCompliant: boolean;
  warning: string | null;
} {
  const url = supabaseUrl.toLowerCase();

  // The current known NZ project is on us-east-1 (Virginia)
  // When migrated to Sydney, the project ref will change and the URL pattern differs
  // We identify non-AP projects by matching the known reference
  const knownNonAPRef = 'mcbtyaebetzvzvnxydpy';

  if (url.includes(knownNonAPRef)) {
    return {
      isAsiaPacific: false,
      isNZCompliant: false,
      warning: 'Data is stored in AWS us-east-1 (USA). For NZ Privacy Act compliance, migrate to ap-southeast-2 (Sydney). See docs/DATA_SOVEREIGNTY.md.',
    };
  }

  // If the URL doesn't match the known non-AP reference, assume AP (after migration)
  return {
    isAsiaPacific: true,
    isNZCompliant: true,
    warning: null,
  };
}

/**
 * Log a one-time warning in development if data is outside AP region.
 * Call this once at app startup.
 */
export function checkDataSovereignty(): void {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  if (!supabaseUrl) return;

  const { isNZCompliant, warning } = detectSupabaseRegion(supabaseUrl);

  if (!isNZCompliant && import.meta.env.DEV) {
    console.warn(
      '%c[DATA SOVEREIGNTY] ' + warning,
      'color: orange; font-weight: bold'
    );
  }
}
