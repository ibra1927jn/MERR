/**
 * _shared/cors.ts — CORS headers for Supabase Edge Functions
 * Re-exports the CORS utilities from _shared/security.ts for backward compatibility.
 * Import this in any Edge Function that needs CORS support.
 */
export { corsHeaders, handlePreflight } from './security.ts';
