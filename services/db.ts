import Dexie, { Table } from 'dexie';
import { Picker, HarvestSettings } from '../types';

export interface QueuedBucket {
    id?: number;
    picker_id: string; // The UUID
    quality_grade: 'A' | 'B' | 'C' | 'reject';
    timestamp: string;
    synced: boolean;
    row_number?: number;
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
    user_cache!: Table<CachedUser, string>;
    settings_cache!: Table<CachedSettings, string>;

    constructor() {
        super('HarvestProDB');
        this.version(1).stores({
            bucket_queue: '++id, picker_id, synced, timestamp',
            user_cache: 'id',
            settings_cache: 'id'
        });
    }
}

export const db = new HarvestDB();
