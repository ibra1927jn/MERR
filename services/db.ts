import Dexie, { Table } from 'dexie';

export interface OfflineAction {
    id: string;
    action: string;
    payload: any;
    timestamp: string;
    synced: boolean;
}

export interface OfflinePhoto {
    id: string;
    bucketId: string;
    blob: Blob;
    type: string;
    timestamp: string;
    synced: boolean;
}

export interface LocalCache {
    key: string;
    data: any;
    timestamp: string;
}

export class HarvestProDB extends Dexie {
    offlineActions!: Table<OfflineAction>;
    offlinePhotos!: Table<OfflinePhoto>;
    localCache!: Table<LocalCache>;

    constructor() {
        super('HarvestProDB');
        this.version(1).stores({
            offlineActions: 'id, synced, action',
            offlinePhotos: 'id, bucketId, synced',
            localCache: 'key'
        });
    }
}

export const db = new HarvestProDB();
