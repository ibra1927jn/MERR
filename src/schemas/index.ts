/**
 * schemas/ barrel — STR-14: consolidated schema index.
 *
 * Note: explicit named exports used because both zod.schemas and api.schemas
 * export members named 'PickerSchema' — the barrel keeps them distinct.
 * 
 * Import from '@/schemas/zod.schemas' or '@/schemas/api.schemas' directly
 * to avoid ambiguity, or use the named exports below.
 */

// Boundary input schemas (QR scanner, forms, Supabase responses from zod.schemas)
export {
  QRPayloadSchema, type QRPayload,
  PickerSchema as ZodPickerSchema, type ValidatedPicker,
  AttendanceRecordSchema, type ValidatedAttendance,
  HarvestSettingsSchema, type ValidatedSettings,
  safeParse, safeParseArray,
} from './zod.schemas';

// API response validation schemas
export * from './api.schemas';
