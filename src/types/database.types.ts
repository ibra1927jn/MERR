/**
 * SUPABASE DATABASE TYPES
 * Strict type definitions for database responses
 * 
 * Type Safety Rules:
 * - UUID = string (subset with validation)
 * - Timestamps = ISO 8601 string
 * - Nullable fields explicitly marked with `| null`
 */

// ============================================
// PRIMITIVE TYPES
// ============================================

/** UUID type - string subset for type safety */
export type UUID = string;

/** ISO 8601 timestamp string */
export type Timestamp = string;

/** Quality grade enum */
export type QualityGrade = 'A' | 'B' | 'C' | 'reject';

/** User role enum */
export type UserRole = 'manager' | 'team_leader' | 'picker' | 'runner';

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface SupabaseUser {
    id: UUID;
    name: string;
    role: UserRole;
    email?: string;
    orchard_id?: UUID;
    team_leader_id?: UUID;
    created_at: Timestamp;
}

export interface SupabaseProfile {
    id: UUID;
    name: string;
    role: UserRole;
    orchard_id?: UUID | null;
    team_leader_id?: UUID | null;
}

// ============================================
// MESSAGING
// ============================================

export interface SupabaseChatMessage {
    id: UUID;
    conversation_id: UUID;
    sender_id: UUID;
    content: string;
    created_at: Timestamp;
    sender?: {
        name: string;
    } | null;
}

export interface SupabaseConversation {
    id: UUID;
    type: 'direct' | 'group';
    name?: string | null;
    participant_ids: UUID[];
    created_at: Timestamp;
    created_by: UUID;
}

// ============================================
// PICKERS & TEAM MANAGEMENT
// ============================================

export interface SupabasePicker {
    id: UUID;
    name: string;
    orchard_id: UUID;
    team_leader_id?: UUID | null;
    badge_id?: string | null;
    current_row?: number | null;
    created_at: Timestamp;
    is_active: boolean;
}

export interface SupabasePerformanceStat {
    picker_id: UUID;
    total_buckets: number;
    avg_quality: QualityGrade | null;
    total_earnings?: number;
    last_scan?: Timestamp | null;
}

// ============================================
// ATTENDANCE
// ============================================

export interface SupabaseAttendanceRecord {
    id: UUID;
    picker_id: UUID;
    orchard_id: UUID;
    check_in_time: Timestamp;
    check_out_time?: Timestamp | null;
    created_at: Timestamp;
}

export interface SupabaseAttendanceWithPicker {
    id: UUID;
    picker_id: UUID;
    orchard_id: UUID;
    check_in_time: Timestamp;
    check_out_time?: Timestamp | null;
    picker?: SupabasePicker | null;
}

// ============================================
// BUCKET EVENTS & ANALYTICS
// ============================================

export interface SupabaseBucketEvent {
    id: UUID;
    picker_id: UUID;
    quality_grade: QualityGrade;
    orchard_id: UUID;
    recorded_at: Timestamp;
    row_number?: number | null;
}

export interface SupabaseBucketRecord {
    id: UUID;
    picker_id: UUID;
    quality_grade: QualityGrade;
    timestamp: Timestamp;
    picker_name?: string;
    orchard_id?: UUID;
}

// ============================================
// TYPE GUARDS (User-Defined Type Guards)
// ============================================

/**
 * Type guard for SupabasePicker
 * Validates at runtime that object matches expected structure
 */
export function isSupabasePicker(item: unknown): item is SupabasePicker {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;

    return (
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.orchard_id === 'string' &&
        typeof obj.created_at === 'string' &&
        typeof obj.is_active === 'boolean'
    );
}

/**
 * Type guard for SupabaseUser
 */
export function isSupabaseUser(item: unknown): item is SupabaseUser {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;

    return (
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.role === 'string' &&
        typeof obj.created_at === 'string'
    );
}

/**
 * Type guard for SupabaseChatMessage
 */
export function isSupabaseChatMessage(item: unknown): item is SupabaseChatMessage {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;

    return (
        typeof obj.id === 'string' &&
        typeof obj.conversation_id === 'string' &&
        typeof obj.sender_id === 'string' &&
        typeof obj.content === 'string' &&
        typeof obj.created_at === 'string'
    );
}

/**
 * Type guard for SupabaseAttendanceRecord
 */
export function isSupabaseAttendanceRecord(item: unknown): item is SupabaseAttendanceRecord {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;

    return (
        typeof obj.id === 'string' &&
        typeof obj.picker_id === 'string' &&
        typeof obj.orchard_id === 'string' &&
        typeof obj.check_in_time === 'string' &&
        typeof obj.created_at === 'string'
    );
}

/**
 * Type guard for SupabasePerformanceStat
 */
export function isSupabasePerformanceStat(item: unknown): item is SupabasePerformanceStat {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;

    return (
        typeof obj.picker_id === 'string' &&
        typeof obj.total_buckets === 'number'
    );
}

// ============================================
// ARRAY TYPE GUARDS
// ============================================

/**
 * Validates array of SupabasePicker objects
 */
export function isSupabasePickerArray(items: unknown): items is SupabasePicker[] {
    return Array.isArray(items) && items.every(isSupabasePicker);
}

/**
 * Validates array of SupabaseUser objects
 */
export function isSupabaseUserArray(items: unknown): items is SupabaseUser[] {
    return Array.isArray(items) && items.every(isSupabaseUser);
}

/**
 * Validates array of SupabaseChatMessage objects
 */
export function isSupabaseChatMessageArray(items: unknown): items is SupabaseChatMessage[] {
    return Array.isArray(items) && items.every(isSupabaseChatMessage);
}
