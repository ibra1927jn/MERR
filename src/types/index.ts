/**
 * types/ barrel — STR-03: Single authoritative source for all app types.
 * 
 * Import from '@/types' to get all types:
 *   - app.types.ts     ? application domain types (Picker, HarvestSettings, etc.)
 *   - database.types.ts ? Supabase DB schema (auto-generated)
 *   - result.ts         ? Result<T,E> utility type
 */
export * from './app.types';
export * from './result';
// Note: database.types.ts intentionally excluded from barrel (very large, Tree-shaken per consumer)
