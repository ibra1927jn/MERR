/**
 * Sync Service - Last Write Wins (LWW) Conflict Resolution Strategy
 * Handles offline data synchronization with Supabase
 */

import { supabase } from './supabase';

// Types for sync operations
interface SyncableRecord {
    id: string;
    updated_at: string;
    [key: string]: unknown;
}

interface SyncOperation {
    id: string;
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    data: Record<string, unknown>;
    timestamp: string;
    synced: boolean;
    retryCount: number;
}

interface ConflictResult {
    resolved: boolean;
    winner: 'local' | 'remote';
    mergedData?: Record<string, unknown>;
}

// IndexedDB for offline queue
const DB_NAME = 'harvestpro-sync';
const DB_VERSION = 1;
const SYNC_QUEUE_STORE = 'sync_queue';
const LAST_SYNC_STORE = 'last_sync';

class SyncService {
    private db: IDBDatabase | null = null;
    private isOnline: boolean = navigator.onLine;
    private syncInProgress: boolean = false;

    constructor() {
        this.initDB();
        this.setupNetworkListeners();
    }

    /**
     * Initialize IndexedDB for offline queue storage
     */
    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Sync queue store
                if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
                    const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
                    syncStore.createIndex('synced', 'synced', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Last sync timestamps store
                if (!db.objectStoreNames.contains(LAST_SYNC_STORE)) {
                    db.createObjectStore(LAST_SYNC_STORE, { keyPath: 'table' });
                }
            };
        });
    }

    /**
     * Setup network status listeners
     */
    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            console.log('[Sync] Back online - triggering sync');
            this.isOnline = true;
            this.syncAll();
        });

        window.addEventListener('offline', () => {
            console.log('[Sync] Gone offline - queueing operations');
            this.isOnline = false;
        });

        // Listen for service worker sync messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'SYNC_TRIGGERED') {
                    this.syncAll();
                }
            });
        }
    }

    /**
     * Add operation to sync queue (when offline)
     */
    async queueOperation(
        table: string,
        operation: 'INSERT' | 'UPDATE' | 'DELETE',
        data: Record<string, unknown>
    ): Promise<void> {
        if (!this.db) await this.initDB();

        const syncOp: SyncOperation = {
            id: `${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            table,
            operation,
            data: {
                ...data,
                updated_at: new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            synced: false,
            retryCount: 0
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(SYNC_QUEUE_STORE);
            const request = store.add(syncOp);

            request.onsuccess = () => {
                console.log('[Sync] Operation queued:', syncOp.id);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get pending sync operations
     */
    async getPendingOperations(): Promise<SyncOperation[]> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(SYNC_QUEUE_STORE);
            const index = store.index('synced');
            const request = index.getAll(IDBKeyRange.only(false));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Last Write Wins (LWW) conflict resolution
     */
    resolveConflict(
        localData: SyncableRecord,
        remoteData: SyncableRecord
    ): ConflictResult {
        const localTime = new Date(localData.updated_at).getTime();
        const remoteTime = new Date(remoteData.updated_at).getTime();

        if (localTime >= remoteTime) {
            // Local wins - use local data
            return {
                resolved: true,
                winner: 'local',
                mergedData: localData
            };
        } else {
            // Remote wins - use remote data
            return {
                resolved: true,
                winner: 'remote',
                mergedData: remoteData
            };
        }
    }

    /**
     * Sync a single operation with conflict resolution
     */
    async syncOperation(op: SyncOperation): Promise<boolean> {
        try {
            const { table, operation, data } = op;

            if (operation === 'INSERT') {
                // For inserts, use upsert to handle duplicates
                const { error } = await supabase
                    .from(table)
                    .upsert(data as Record<string, unknown>, { onConflict: 'id' });

                if (error) throw error;
            } else if (operation === 'UPDATE') {
                // Check for conflicts before updating
                const { data: remoteData, error: fetchError } = await supabase
                    .from(table)
                    .select('*')
                    .eq('id', data.id)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    throw fetchError;
                }

                if (remoteData) {
                    // Conflict resolution using LWW
                    const conflict = this.resolveConflict(
                        data as SyncableRecord,
                        remoteData as SyncableRecord
                    );

                    if (conflict.winner === 'local') {
                        const { error } = await supabase
                            .from(table)
                            .update(conflict.mergedData!)
                            .eq('id', data.id);

                        if (error) throw error;
                    }
                    // If remote wins, we don't update (remote already has newer data)
                } else {
                    // Record doesn't exist remotely, insert it
                    const { error } = await supabase
                        .from(table)
                        .insert(data as Record<string, unknown>);

                    if (error) throw error;
                }
            } else if (operation === 'DELETE') {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', data.id);

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('[Sync] Operation failed:', error);
            return false;
        }
    }

    /**
     * Mark operation as synced
     */
    async markSynced(opId: string): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(SYNC_QUEUE_STORE);
            const getRequest = store.get(opId);

            getRequest.onsuccess = () => {
                const op = getRequest.result;
                if (op) {
                    op.synced = true;
                    const putRequest = store.put(op);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Increment retry count for failed operation
     */
    async incrementRetry(opId: string): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(SYNC_QUEUE_STORE);
            const getRequest = store.get(opId);

            getRequest.onsuccess = () => {
                const op = getRequest.result;
                if (op) {
                    op.retryCount += 1;
                    const putRequest = store.put(op);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Sync all pending operations
     */
    async syncAll(): Promise<{ success: number; failed: number }> {
        if (!this.isOnline || this.syncInProgress) {
            return { success: 0, failed: 0 };
        }

        this.syncInProgress = true;
        let success = 0;
        let failed = 0;

        try {
            const pendingOps = await this.getPendingOperations();
            console.log(`[Sync] Processing ${pendingOps.length} pending operations`);

            // Sort by timestamp to maintain order
            pendingOps.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            for (const op of pendingOps) {
                // Skip operations that have failed too many times
                if (op.retryCount >= 5) {
                    console.warn('[Sync] Skipping operation with too many retries:', op.id);
                    continue;
                }

                const synced = await this.syncOperation(op);

                if (synced) {
                    await this.markSynced(op.id);
                    success++;
                } else {
                    await this.incrementRetry(op.id);
                    failed++;
                }
            }

            // Update last sync timestamp
            await this.updateLastSync();

        } catch (error) {
            console.error('[Sync] Sync all failed:', error);
        } finally {
            this.syncInProgress = false;
        }

        console.log(`[Sync] Complete: ${success} success, ${failed} failed`);
        return { success, failed };
    }

    /**
     * Update last sync timestamp
     */
    private async updateLastSync(): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([LAST_SYNC_STORE], 'readwrite');
            const store = transaction.objectStore(LAST_SYNC_STORE);
            const request = store.put({
                table: 'global',
                timestamp: new Date().toISOString()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get last sync timestamp
     */
    async getLastSync(): Promise<string | null> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([LAST_SYNC_STORE], 'readonly');
            const store = transaction.objectStore(LAST_SYNC_STORE);
            const request = store.get('global');

            request.onsuccess = () => {
                resolve(request.result?.timestamp || null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clean up synced operations older than specified days
     */
    async cleanupSyncedOperations(olderThanDays: number = 7): Promise<void> {
        if (!this.db) await this.initDB();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(SYNC_QUEUE_STORE);
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const op = cursor.value as SyncOperation;
                    if (op.synced && new Date(op.timestamp) < cutoffDate) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get sync status
     */
    getSyncStatus(): { isOnline: boolean; syncInProgress: boolean } {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress
        };
    }

    /**
     * Register for background sync (if supported)
     */
    async registerBackgroundSync(): Promise<boolean> {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-harvest-data');
                console.log('[Sync] Background sync registered');
                return true;
            } catch (error) {
                console.warn('[Sync] Background sync not available:', error);
                return false;
            }
        }
        return false;
    }
}

// Export singleton instance
export const syncService = new SyncService();
export type { SyncOperation, SyncableRecord, ConflictResult };
