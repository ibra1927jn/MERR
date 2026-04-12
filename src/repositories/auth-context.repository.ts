/**
 * Auth Context Repository — user profile lookups and registration queries
 */
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

export const authContextRepository = {
  /** Get user profile by ID with retry on 504/502/PGRST003.
   *  Máximo 3 intentos (0,1,2) — reducido desde 4 para minimizar presión sobre el connection pool. */
  async getUserProfile(userId: string) {
    let userData = null;
    let userError = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      logger.info(`[CONN-TRACE] getUserProfile intento ${attempt + 1}/3`);
      const result = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      userData = result.data;
      userError = result.error;
      if (userData || !userError) break;
      const errMsg = String(userError?.message || '').toLowerCase();
      const errCode = String(userError?.code || '');
      // PGRST002 = pool timeout, PGRST003 = statement timeout — ambos son transitorios
      const isRetriable =
        errCode === 'PGRST002' ||
        errCode === 'PGRST003' ||
        errMsg.includes('504') ||
        errMsg.includes('502') ||
        errMsg.includes('503') ||
        errMsg.includes('timeout') ||
        errMsg.includes('gateway') ||
        errMsg.includes('fetch') ||
        errMsg.includes('network');
      if (!isRetriable || attempt === 3) break;
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return { data: userData, error: userError };
  },

  /** Get first orchard id */
  async getFirstOrchardId() {
    const { data } = await supabase.from('orchards').select('id').limit(1).maybeSingle();
    return data?.id || null;
  },

  /** Get all orchards accessible to the user */
  async getAllOrchards() {
    const { data, error } = await supabase
      .from('orchards')
      .select('id, name, total_rows')
      .order('name');
    if (error) return [];
    return data || [];
  },

  /** Get orchard by ID */
  async getOrchardById(orchardId: string) {
    const { data } = await supabase
      .from('orchards')
      .select('id, name, total_rows')
      .eq('id', orchardId)
      .maybeSingle();
    return data;
  },

  /** Assign orchard to user */
  async assignOrchard(userId: string, orchardId: string) {
    await supabase.from('users').update({ orchard_id: orchardId }).eq('id', userId);
  },

  /** Check allowed_registrations whitelist */
  async checkWhitelist(email: string) {
    const { data, error } = await supabase
      .from('allowed_registrations')
      .select('id, role, orchard_id, used_at')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    return { data, error };
  },

  /** Insert new user profile */
  async insertUser(record: Record<string, unknown>) {
    await supabase.from('users').insert(record);
  },

  /** Mark registration as used */
  async markRegistrationUsed(registrationId: string) {
    await supabase
      .from('allowed_registrations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', registrationId);
  },
};
