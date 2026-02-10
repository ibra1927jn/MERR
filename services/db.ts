import Dexie, { Table } from 'dexie';
import { HarvestSettings } from '../types';

// =============================================
// INTERFACES (Exportadas para que offline.service las vea)
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
}

export interface QueuedMessage {
    id?: number;
    channel_type: 'direct' | 'group' | 'team';
    recipient_id: string;
    sender_id: string;
    content: string;
    timestamp: string;
    synced: number;
}

export interface CachedUser {
    id: string;
    profile?: any;
    roster?: any[];
    orchard_id: string;
    timestamp: number;
}

export interface TelemetryLog {
    id?: number;
    level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    context: string;
    message: string;
    metadata?: any;
    timestamp: number;
    synced: number;
}

// =============================================
// BASE DE DATOS (Con todas las tablas recuperadas)
// =============================================
export class HarvestDB extends Dexie {
    bucket_queue!: Table<QueuedBucket, number>;
    message_queue!: Table<QueuedMessage, number>;
    user_cache!: Table<CachedUser, string>;
    settings_cache!: Table<any, string>;
    runners_cache!: Table<any, string>;
    telemetry_logs!: Table<TelemetryLog, number>;

    constructor() {
        super('HarvestProDB');

        // Versión 5: Recuperación de integridad y limpieza de piloto
        this.version(5).stores({
            bucket_queue: '++id, picker_id, orchard_id, synced',
            message_queue: '++id, recipient_id, synced',
            user_cache: 'id',
            settings_cache: 'id',
            runners_cache: 'id',
            telemetry_logs: '++id, level, context, synced'
        }).upgrade(tx => {
            // Limpieza de seguridad para asegurar que el piloto del jueves va con datos limpios
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
// AUTO-REPARACIÓN DE EMERGENCIA
// =============================================
db.open().catch(async (err) => {
    console.error("Fallo crítico en Dexie, reseteando motor local...", err);
    // Si la DB está corrupta, la borramos y forzamos recarga
    await Dexie.delete('HarvestProDB');
    window.location.reload();
});
