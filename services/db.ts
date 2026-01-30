import Dexie, { Table } from 'dexie';

// Interfaces for DB tables
export interface OfflineAction {
  id?: number; // Auto-incremented
  actionId: string;
  actionType: string;
  payload: any;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

export interface CachedData {
  key: string;
  data: any;
  timestamp: string;
}

export interface StoredImage {
  id: string;
  blob: Blob;
  timestamp: string;
  synced: boolean;
}

export class HarvestDB extends Dexie {
  offlineActions!: Table<OfflineAction>;
  cachedData!: Table<CachedData>;
  images!: Table<StoredImage>;

  constructor() {
    super('HarvestProDB');

    this.version(1).stores({
      offlineActions: '++id, actionId, synced, timestamp',
      cachedData: 'key, timestamp',
      images: 'id, synced, timestamp'
    });
  }
}

export const db = new HarvestDB();
