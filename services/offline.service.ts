// =============================================
// OFFLINE SERVICE - Manejo de datos sin conexión (IndexedDB)
// =============================================
import { db, OfflineAction } from './db';

export const offlineService = {
  // Verificar si estamos online
  isOnline(): boolean {
    return navigator.onLine;
  },

  // Agregar acción a la cola offline
  async queueAction(actionType: string, payload: any): Promise<void> {
    try {
      await db.offlineActions.add({
        actionId: Math.random().toString(36).substring(2, 11),
        actionType,
        payload,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0
      });
      console.log(`[Offline] Queued action: ${actionType}`);
    } catch (error) {
      console.error('[Offline] Error queuing action:', error);
    }
  },

  // Obtener acciones pendientes
  async getPendingActions(): Promise<OfflineAction[]> {
    return await db.offlineActions.where('synced').equals(false as any).toArray(); // Dexie boolean casting
  },

  // Marcar acción como sincronizada
  async markSynced(id: number): Promise<void> {
    await db.offlineActions.update(id, { synced: true });
  },

  // Eliminar acción
  async removeAction(id: number): Promise<void> {
    await db.offlineActions.delete(id);
  },

  // Limpiar acciones sincronizadas
  async clearSyncedActions(): Promise<void> {
    await db.offlineActions.where('synced').equals(true as any).delete();
  },

  // Obtener conteo de acciones pendientes
  async getPendingCount(): Promise<number> {
    return await db.offlineActions.where('synced').equals(false as any).count();
  },

  // Guardar datos localmente (Cache)
  async saveLocal(key: string, data: any): Promise<void> {
    try {
      await db.cachedData.put({
        key,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Offline] Error saving local data:', error);
    }
  },

  // Obtener datos guardados localmente
  async getLocal(key: string): Promise<any | null> {
    try {
      const record = await db.cachedData.get(key);
      return record ? record.data : null;
    } catch {
      return null;
    }
  },

  // Guardar imagen (Blob)
  async storeImage(id: string, blob: Blob): Promise<void> {
    await db.images.put({
      id,
      blob,
      timestamp: new Date().toISOString(),
      synced: false
    });
  },

  // Obtener imagen
  async getImage(id: string): Promise<Blob | undefined> {
    const record = await db.images.get(id);
    return record?.blob;
  }
};

// Listener para cuando vuelve la conexión
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const count = await offlineService.getPendingCount();
    console.log('[Offline] Connection restored. Pending actions:', count);
    // Here we would trigger the sync process
  });
}

export default offlineService;
