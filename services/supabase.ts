// =============================================
// CLIENTE SUPABASE ÚNICO
// =============================================
// IMPORTANTE: Este archivo SOLO exporta el cliente.
// NO crear contextos ni providers aquí.
// Todos los demás archivos deben importar desde aquí.
// =============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciales desde variables de entorno (con fallback para desarrollo)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mcbtyaebetzvzvnxydpy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYnR5YWViZXR6dnp2bnh5ZHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTQyNDIsImV4cCI6MjA4NDA3MDI0Mn0.GGLGSms0HE5o3R_MjbitUIqy0Dw4fdkrEEaVx_B7NhQ';

// Custom storage adapter using sessionStorage for independent tab sessions
// Each tab will have its own session, not shared with other tabs
const sessionStorageAdapter = {
  getItem: (key: string) => {
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
  },
};

// Generate unique storageKey per tab to prevent BroadcastChannel sync
// BroadcastChannel uses storageKey as the channel name, so unique keys = no sync
const tabId = sessionStorage.getItem('harvestpro_tab_id') || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
sessionStorage.setItem('harvestpro_tab_id', tabId);

// Cliente único - NO crear más instancias en otros archivos
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: sessionStorageAdapter,
    storageKey: `sb-harvestpro-auth-${tabId}`, // Unique per tab to disable BroadcastChannel sync
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Exportar URL y KEY por si se necesitan en algún lugar
export { SUPABASE_URL, SUPABASE_ANON_KEY };
