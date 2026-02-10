// =============================================
// CLIENTE SUPABASE ÚNICO
// =============================================
// IMPORTANTE: Este archivo SOLO exporta el cliente.
// NO crear contextos ni providers aquí.
// Todos los demás archivos deben importar desde aquí.
// =============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config.service';

// Get configuration (will throw in production if env vars missing)
const config = getConfig();
const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;

// Generate unique storageKey per tab to prevent BroadcastChannel sync
// BroadcastChannel uses storageKey as the channel name, so unique keys = no sync
const tabId = localStorage.getItem('harvestpro_tab_id') || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem('harvestpro_tab_id', tabId);

// Cliente único - NO crear más instancias en otros archivos
// Uses localStorage so sessions survive tab close/reopen (critical for field workers in low-signal zones)
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
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
