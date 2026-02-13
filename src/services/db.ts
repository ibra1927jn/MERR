import Dexie, { Table } from 'dexie';
import { HarvestSettings, Picker } from '../types';

export interface QueuedBucket {
    id: string; // UUID from Store
    picker_id: string; // The UUID
    orchard_id: string; // CRUCIAL: No olvidar este campo
    quality_grade: 'A' | 'B' | 'C' | 'reject';
    timestamp: string;
    synced: number; // 0 = pending, 1 = synced, -1 = error
    row_number?: number;
    failure_reason?: string;
}

export interface QueuedMessage {
    id: string; // UUID
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
    profile?: Picker; // Full user object (optional if storing roster)
    roster?: Picker[]; // Full roster list (optional if storing single user)
    orchard_id: string;
    timestamp: number;
}

export interface CachedSettings {
    id: string; // usually 'current'
    settings: HarvestSettings;
    timestamp: number;
}

export class HarvestDB extends Dexie {
    bucket_queue!: Table<QueuedBucket, string>;
    message_queue!: Table<QueuedMessage, string>;
    user_cache!: Table<CachedUser, string>;
    settings_cache!: Table<CachedSettings, string>;
    runners_cache!: Table<unknown, string>;

    constructor() {
        super('HarvestProDB');
        this.version(3).stores({
            bucket_queue: 'id, picker_id, orchard_id, synced',
            message_queue: 'id, recipient_id, synced',
            user_cache: 'id',
            settings_cache: 'id',
            runners_cache: 'id'
        });
        // v4: compound indexes for high-volume queries (450+ pickers, ~20k+ buckets)
        this.version(4).stores({
            bucket_queue: 'id, picker_id, orchard_id, synced, [orchard_id+synced], [picker_id+synced], timestamp',
            message_queue: 'id, recipient_id, synced, [recipient_id+synced], timestamp',
            user_cache: 'id',
            settings_cache: 'id',
            runners_cache: 'id'
        });
    }
}

export const db = new HarvestDB();
