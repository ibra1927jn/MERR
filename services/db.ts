import Dexie, { Table } from 'dexie';
import { HarvestSettings } from '../types';

export interface QueuedBucket {
    id?: number;
    picker_id: string; // The UUID
    orchard_id: string; // CRUCIAL: No olvidar este campo
    quality_grade: 'A' | 'B' | 'C' | 'reject';
    timestamp: string;
    synced: number; // 0 = pending, 1 = synced, -1 = error
    row_number?: number;
    bin_id?: string;
    scanned_by?: string;
    failure_reason?: string;
}

export interface QueuedMessage {
    id?: number;
    channel_type: 'direct' | 'group' | 'team';
    recipient_id: string;
    sender_id: string;
    content: string;
    timestamp: string;
    synced: number; // 0 = pending, 1 = synced, -1 = error
    priority?: string;
    failure_reason?: string;
}

export interface CachedUser {
    id: string; // usually 'current' or 'roster_ORCHARDID'
    profile?: any; // Full user object (optional if storing roster)
    roster?: any[]; // Full roster list (optional if storing single user)
    orchard_id: string;
    timestamp: number;
}

export interface CachedSettings {
    id: string; // usually 'current'
    settings: HarvestSettings;
    timestamp: number;
}

export interface TelemetryLog {
    id?: number;
    level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    context: string;
    message: string;
    metadata?: any;
    timestamp: number;
    synced: number; // 0 = pending, 1 = synced
}

export class HarvestDB extends Dexie {
    bucket_queue!: Table<QueuedBucket, number>;
    message_queue!: Table<QueuedMessage, number>;
    user_cache!: Table<CachedUser, string>;
    settings_cache!: Table<CachedSettings, string>;
    runners_cache!: Table<any, string>;
    telemetry_logs!: Table<TelemetryLog, number>;

    constructor() {
        super('HarvestProDB');

        // Version 4: Forced Cache Clearing for pilot-hardening branch
        this.version(4).stores({
            bucket_queue: '++id, picker_id, orchard_id, synced',
            message_queue: '++id, recipient_id, synced',
            user_cache: 'id',
            settings_cache: 'id',
            runners_cache: 'id',
            telemetry_logs: '++id, level, context, synced'
        }).upgrade(tx => {
            // Force clear caches on version bump to ensure fresh pilot data
            return Promise.all([
                tx.table('user_cache').clear(),
                tx.table('settings_cache').clear(),
                tx.table('runners_cache').clear()
            ]);
        });
    }
}

// Initialize and open
export const db = new HarvestDB();

// AUTO-REPARACIÓN CRÍTICA
db.open().catch(async (err) => {
    console.error("Fallo crítico en Dexie, limpiando motor...", err);
    await db.delete();
    window.location.reload();
});
