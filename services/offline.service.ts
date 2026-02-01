// =============================================
// OFFLINE SERVICE - Manejo de datos sin conexión (IndexedDB via Dexie)
// =============================================
import { db, OfflineAction, OfflinePhoto } from './db';

export const offlineService = {
  // Verificar si estamos online
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  // Agregar acción a la cola offline
  async queueAction(action: string, payload: any): Promise<void> {
    try {
      const newAction: OfflineAction = {
        id: Math.random().toString(36).substring(2, 11),
        action,
        payload,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      await db.offlineActions.add(newAction);
      console.log(`[Offline] Queued action (IndexedDB): ${action}`);
    } catch (error) {
      console.error('[Offline] Error queuing action:', error);
    }
  },

  // Agregar foto a la cola offline
  async queuePhoto(bucketId: string, blob: Blob): Promise<void> {
    try {
      const newPhoto: OfflinePhoto = {
        id: Math.random().toString(36).substring(2, 11),
        bucketId,
        blob,
        type: blob.type,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      await db.offlinePhotos.add(newPhoto);
      console.log(`[Offline] Queued photo for bucket: ${bucketId}`);
    } catch (error) {
      console.error('[Offline] Error queuing photo:', error);
    }
  },

  // Obtener acciones no sincronizadas
  async getPendingActions(): Promise<OfflineAction[]> {
    return await db.offlineActions.where('synced').equals(0).toArray();
  },

  // Obtener fotos no sincronizadas
  async getPendingPhotos(): Promise<OfflinePhoto[]> {
    return await db.offlinePhotos.where('synced').equals(0).toArray();
  },

  // Marcar acción como sincronizada
  async markSynced(actionId: string): Promise<void> {
    try {
      await db.offlineActions.update(actionId, { synced: true });
    } catch (error) {
      console.error('[Offline] Error marking action as synced:', error);
    }
  },

  // Marcar foto como sincronizada
  async markPhotoSynced(photoId: string): Promise<void> {
    try {
      await db.offlinePhotos.update(photoId, { synced: true });
    } catch (error) {
      console.error('[Offline] Error marking photo as synced:', error);
    }
  },

  // Limpiar datos ya sincronizados
  async clearSyncedData(): Promise<void> {
    try {
      await db.offlineActions.where('synced').equals(1).delete();
      await db.offlinePhotos.where('synced').equals(1).delete();
    } catch (error) {
      console.error('[Offline] Error clearing synced data:', error);
    }
  },

  // Limpiar toda la base de datos local
  async clearAll(): Promise<void> {
    try {
      await db.offlineActions.clear();
      await db.offlinePhotos.clear();
      await db.localCache.clear();
    } catch (error) {
      console.error('[Offline] Error clearing database:', error);
    }
  },

  // Obtener conteo de pendientes
  async getPendingCount(): Promise<number> {
    const actions = await db.offlineActions.where('synced').equals(0).count();
    const photos = await db.offlinePhotos.where('synced').equals(0).count();
    return actions + photos;
  },

  // Guardar datos localmente (para caché)
  async saveLocal(key: string, data: any): Promise<void> {
    try {
      await db.localCache.put({
        key,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Offline] Error saving local cache:', error);
    }
  },

  // Obtener datos guardados localmente
  async getLocal(key: string): Promise<any | null> {
    try {
      const cached = await db.localCache.get(key);
      return cached ? cached.data : null;
    } catch {
      return null;
    }
  },

  // Verificar si hay datos en caché válidos
  async hasValidCache(key: string, maxAgeMinutes: number = 60): Promise<boolean> {
    try {
      const cached = await db.localCache.get(key);
      if (cached) {
        const age = (new Date().getTime() - new Date(cached.timestamp).getTime()) / 60000;
        return age < maxAgeMinutes;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Migración desde localStorage a IndexedDB (se corre una vez)
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const legacyQueue = localStorage.getItem('harvestpro_offline_queue');
      if (legacyQueue) {
        const actions = JSON.parse(legacyQueue);
        for (const action of actions) {
          await db.offlineActions.add(action);
        }
        localStorage.removeItem('harvestpro_offline_queue');
        console.log('[Offline] Migrated legacy queue to IndexedDB');
      }
    } catch (error) {
      console.error('[Offline] Migration error:', error);
    }
  }
};

// Listeners
if (typeof window !== 'undefined') {
  offlineService.migrateFromLocalStorage();

  window.addEventListener('online', async () => {
    const count = await offlineService.getPendingCount();
    console.log('[Offline] Connection restored. Pending items:', count);
  });

  window.addEventListener('offline', () => {
    console.log('[Offline] Connection lost. Actions will be queued in IndexedDB.');
  });
}

export default offlineService;