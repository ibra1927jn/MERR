import Dexie, { Table } from 'dexie';
import { HarvestSettings } from '../types';

// =============================================
// 1. INTERFACES (Necesarias para que compile offline.service.ts)
// =============================================
export interface QueuedBucket {
    id?: number;
    picker_id: string;
    orchard_id: string;
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
    profile?: any; // Full user object
    roster?: any[]; // Full roster list
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

// =============================================
// 2. DEFINICIÓN DE LA BASE DE DATOS (Versión 5)
// =============================================
export class HarvestDB extends Dexie {
    // Declaración de tablas para TypeScript
    bucket_queue!: Table<QueuedBucket, number>;
    message_queue!: Table<QueuedMessage, number>;
    user_cache!: Table<CachedUser, string>;
    settings_cache!: Table<CachedSettings, string>;
    runners_cache!: Table<any, string>;
    telemetry_logs!: Table<TelemetryLog, number>;

    constructor() {
        super('HarvestProDB');

        // VERSIÓN 5: Schema completo y limpieza preventiva
        this.version(5).stores({
            bucket_queue: '++id, picker_id, orchard_id, synced',
            message_queue: '++id, recipient_id, synced',
            user_cache: 'id',
            settings_cache: 'id',
            runners_cache: 'id',
            telemetry_logs: '++id, level, context, synced'
        }).upgrade(tx => {
            // Limpiar cachés viejas al actualizar versión
            return Promise.all([
                tx.table('user_cache').clear(),
                tx.table('settings_cache').clear(),
                tx.table('runners_cache').clear()
            ]);
        });
    }
}

export const db = new HarvestDB();

// =============================================
// 3. SISTEMA DE AUTO-REPARACIÓN DE EMERGENCIA
// =============================================
// Si hay conflicto de versiones (ej: navegador tiene v5 pero código espera v2),
// esto borra la base de datos y recarga la página automáticamente.
db.open().catch(async (err) => {
    console.error("CRITICAL DB ERROR: Resetting database...", err);
    try {
        await Dexie.delete('HarvestProDB');
        window.location.reload();
    } catch (e) {
        console.error("Failed to reset DB:", e);
    }
});
