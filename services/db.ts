import Dexie, { Table } from 'dexie';
import { HarvestSettings } from '../types';

// Exportamos las interfaces que 'offline.service.ts' necesita
export interface QueuedBucket {
    id?: number;
    picker_id: string;
    orchard_id: string;
    quality_grade: 'A' | 'B' | 'C' | 'reject';
    timestamp: string;
    synced: number;
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
    synced: number;
    priority?: string;
    failure_reason?: string;
}

export interface CachedUser {
    id: string;
    profile?: any;
    roster?: any[];
    orchard_id: string;
    timestamp: number;
}

export interface CachedSettings {
    id: string;
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
    synced: number;
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

        // VERSIÓN 5: Integramos todo para que no haya conflictos
        this.version(5).stores({
            bucket_queue: '++id, picker_id, orchard_id, synced',
            message_queue: '++id, recipient_id, synced',
            user_cache: 'id',
            settings_cache: 'id',
            runners_cache: 'id',
            telemetry_logs: '++id, level, context, synced'
        }).upgrade(tx => {
            // Limpiamos cachés para evitar datos corruptos antiguos
            return Promise.all([
                tx.table('user_cache').clear(),
                tx.table('settings_cache').clear(),
                tx.table('runners_cache').clear()
            ]);
        });
    }
}

export const db = new HarvestDB();

// AUTO-REPARACIÓN: Si algo falla al abrir (ej: conflicto v2 vs v5), borra y reinicia.
db.open().catch(async (err) => {
    console.error("Fallo crítico en DB. Reseteando...", err);
    await Dexie.delete('HarvestProDB');
    window.location.reload();
});
