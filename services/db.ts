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
    id: string;
    profile: any; // Full user object
    orchard_id: string;
    timestamp: number;
}

export interface CachedSettings {
    id: string; // usually 'current'
    settings: HarvestSettings;
    timestamp: number;
}

export class HarvestDB extends Dexie {
    bucket_queue!: Table<QueuedBucket, number>;
    message_queue!: Table<QueuedMessage, number>;
    user_cache!: Table<CachedUser, string>;
    settings_cache!: Table<CachedSettings, string>;
    runners_cache!: Table<any, string>;

    constructor() {
        super('HarvestProDB');
        this.version(2).stores({
            bucket_queue: '++id, picker_id, orchard_id, synced',
            message_queue: '++id, recipient_id, synced',
            user_cache: 'id',
            settings_cache: 'id',
            runners_cache: 'id'
        });
    }
}

export const db = new HarvestDB();
