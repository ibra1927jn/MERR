// =============================================
// OFFLINE SERVICE - Manejo de datos sin conexión
// =============================================

// Interfaz para acciones offline
interface OfflineAction {
  id: string;
  action: string;
  payload: any;
  timestamp: string;
  synced: boolean;
}

// Almacenamiento simple usando localStorage
const STORAGE_KEY = 'harvestpro_offline_queue';

export const offlineService = {
  // Verificar si estamos online
  isOnline(): boolean {
    return navigator.onLine;
  },

  // Agregar acción a la cola offline
  async queueAction(action: string, payload: any): Promise<void> {
    try {
      const queue = this.getQueue();

      const newAction: OfflineAction = {
        id: Math.random().toString(36).substring(2, 11),
        action,
        payload,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      queue.push(newAction);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

      console.log(`[Offline] Queued action: ${action}`);
    } catch (error) {
      console.error('[Offline] Error queuing action:', error);
    }
  },

  // Obtener cola de acciones pendientes
  getQueue(): OfflineAction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Obtener acciones no sincronizadas
  getPendingActions(): OfflineAction[] {
    return this.getQueue().filter(action => !action.synced);
  },

  // Procesar acciones pendientes con un handler específico de dominio
  async processPendingActions(
    handler: (action: OfflineAction) => Promise<void>
  ): Promise<void> {
    const pending = this.getPendingActions();
    for (const action of pending) {
      try {
        await handler(action);
        this.markSynced(action.id);
      } catch (error) {
        console.error('[Offline] Error processing action, will retry later:', action.action, error);
      }
    }
  },

  // Marcar acción como sincronizada
  markSynced(actionId: string): void {
    try {
      const queue = this.getQueue();
      const updated = queue.map(action =>
        action.id === actionId ? { ...action, synced: true } : action
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[Offline] Error marking action as synced:', error);
    }
  },

  // Limpiar acciones ya sincronizadas
  clearSyncedActions(): void {
    try {
      const queue = this.getQueue();
      const pending = queue.filter(action => !action.synced);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    } catch (error) {
      console.error('[Offline] Error clearing synced actions:', error);
    }
  },

  // Limpiar toda la cola
  clearQueue(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[Offline] Error clearing queue:', error);
    }
  },

  // Obtener conteo de acciones pendientes
  getPendingCount(): number {
    return this.getPendingActions().length;
  },

  // Guardar datos localmente (para caché)
  saveLocal(key: string, data: any): void {
    try {
      localStorage.setItem(`harvestpro_cache_${key}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[Offline] Error saving local data:', error);
    }
  },

  // Obtener datos guardados localmente
  getLocal(key: string): any | null {
    try {
      const stored = localStorage.getItem(`harvestpro_cache_${key}`);
      if (stored) {
        const { data } = JSON.parse(stored);
        return data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Verificar si hay datos en caché válidos (menos de 1 hora)
  hasValidCache(key: string, maxAgeMinutes: number = 60): boolean {
    try {
      const stored = localStorage.getItem(`harvestpro_cache_${key}`);
      if (stored) {
        const { timestamp } = JSON.parse(stored);
        const age = (new Date().getTime() - new Date(timestamp).getTime()) / 60000;
        return age < maxAgeMinutes;
      }
      return false;
    } catch {
      return false;
    }
  },
};

// Listener para cuando vuelve la conexión
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline] Connection restored. Pending actions:', offlineService.getPendingCount());
  });

  window.addEventListener('offline', () => {
    console.log('[Offline] Connection lost. Actions will be queued.');
  });
}

export default offlineService;