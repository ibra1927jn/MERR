/**
 * API Key Service — Manage API keys for the public REST API
 *
 * Provides CRUD operations for API keys that third-party integrations
 * (Xero, Figured, MYOB, irrigation systems) use to authenticate
 * against the HarvestPro public API.
 *
 * @module services/api-keys.service
 */
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';

// =============================================
// TYPES
// =============================================

export type APIScope =
  | 'harvest:read'
  | 'harvest:write'
  | 'payroll:read'
  | 'payroll:export'
  | 'attendance:read'
  | 'bins:read'
  | 'qc:read'
  | 'mpi:export';

export interface APIKey {
  id: string;
  orchard_id: string;
  name: string;
  key_prefix: string; // First 8 chars for identification
  scopes: APIScope[];
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  request_count: number;
}

export interface CreateAPIKeyRequest {
  name: string;
  orchardId: string;
  scopes: APIScope[];
  expiresInDays?: number; // null = never expires
}

export interface CreateAPIKeyResponse {
  key: APIKey;
  /** Full API key — only shown once at creation time */
  fullKey: string;
}

// =============================================
// SERVICE
// =============================================

/** Generate a secure random API key */
function generateAPIKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const key = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  return `hpnz_${key}`;
}

/** SHA-256 hash for storage (never store raw keys) */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const apiKeysService = {
  /**
   * Create a new API key for an orchard.
   * Returns the full key only once — it's hashed before storage.
   */
  async createKey(request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> {
    const fullKey = generateAPIKey();
    const keyHash = await hashKey(fullKey);
    const keyPrefix = fullKey.slice(0, 13); // "hpnz_" + 8 chars

    const expiresAt = request.expiresInDays
      ? new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        orchard_id: request.orchardId,
        name: request.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: request.scopes,
        expires_at: expiresAt,
        is_active: true,
        request_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('[APIKeys] Failed to create key:', error);
      throw new Error('Failed to create API key');
    }

    logger.info(`[APIKeys] Created key "${request.name}" for orchard ${request.orchardId}`);

    return {
      key: {
        id: data.id,
        orchard_id: data.orchard_id,
        name: data.name,
        key_prefix: keyPrefix,
        scopes: data.scopes,
        created_at: data.created_at,
        expires_at: data.expires_at,
        last_used_at: null,
        is_active: true,
        request_count: 0,
      },
      fullKey,
    };
  },

  /**
   * List all API keys for an orchard (without hashes).
   */
  async listKeys(orchardId: string): Promise<APIKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select(
        'id, orchard_id, name, key_prefix, scopes, created_at, expires_at, last_used_at, is_active, request_count'
      )
      .eq('orchard_id', orchardId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[APIKeys] Failed to list keys:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Revoke an API key (soft-delete by setting is_active = false).
   */
  async revokeKey(keyId: string): Promise<void> {
    const { error } = await supabase.from('api_keys').update({ is_active: false }).eq('id', keyId);

    if (error) {
      logger.error('[APIKeys] Failed to revoke key:', error);
      throw new Error('Failed to revoke API key');
    }

    logger.info(`[APIKeys] Revoked key ${keyId}`);
  },

  /**
   * Delete an API key permanently.
   */
  async deleteKey(keyId: string): Promise<void> {
    const { error } = await supabase.from('api_keys').delete().eq('id', keyId);

    if (error) {
      logger.error('[APIKeys] Failed to delete key:', error);
      throw new Error('Failed to delete API key');
    }

    logger.info(`[APIKeys] Deleted key ${keyId}`);
  },

  /**
   * All available scopes with descriptions.
   */
  getAvailableScopes(): Array<{ scope: APIScope; label: string; description: string }> {
    return [
      {
        scope: 'harvest:read',
        label: 'Read Harvest',
        description: 'View bucket records and bin counts',
      },
      {
        scope: 'harvest:write',
        label: 'Write Harvest',
        description: 'Create bucket records via API',
      },
      {
        scope: 'payroll:read',
        label: 'Read Payroll',
        description: 'View payroll summaries and rates',
      },
      {
        scope: 'payroll:export',
        label: 'Export Payroll',
        description: 'Trigger Xero/PaySauce exports',
      },
      {
        scope: 'attendance:read',
        label: 'Read Attendance',
        description: 'View check-in/out records',
      },
      { scope: 'bins:read', label: 'Read Bins', description: 'View bin inventory and logistics' },
      { scope: 'qc:read', label: 'Read QC', description: 'View quality inspection results' },
      {
        scope: 'mpi:export',
        label: 'MPI Export',
        description: 'Generate MPI traceability reports',
      },
    ];
  },
};
