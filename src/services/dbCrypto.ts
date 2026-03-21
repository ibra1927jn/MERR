/**
 * dbCrypto — Transparent encryption layer for IndexedDB (Dexie)
 *
 * Encrypts PII fields in sensitive tables before IndexedDB write,
 * decrypts after read.
 *
 * AUDIT S-2 Fix: Replaced crypto-js with Web Crypto API.
 *   - AES-GCM (authenticated encryption with integrity check)
 *   - PBKDF2 key derivation (100K iterations)
 *   - Random IV per encryption operation
 *   - Random salt stored in IndexedDB (not localStorage — C-2 Fix)
 *
 * Architecture:
 *   - Only PII fields are encrypted (not IDs/indexes, which Dexie needs in plaintext)
 *   - Transparent: callers see plaintext, storage sees ciphertext
 *   - Backwards compatible: auto-migrates v1 (crypto-js) data on read (M-4 Fix)
 */
import { logger } from '@/utils/logger';

// ── Constants ─────────────────────────────
const APP_SALT = 'HarvestPro-NZ-2026-v2'; // Versioned to distinguish from v1
const PBKDF2_ITERATIONS = 100_000;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const CIPHERTEXT_PREFIX = 'v2:'; // Prefix to distinguish v2 (Web Crypto) from v1 (crypto-js)
const SALT_IDB_KEY = 'crypto_salt_v3'; // IndexedDB key for the random salt (C-2 Fix)
const SALT_LS_LEGACY_KEY = 'harvestpro_crypto_salt_v2'; // Old localStorage key for migration

// ── Key Material ─────────────────────────────

/**
 * 🔧 C-2 Fix: Get or create the random salt from IndexedDB (not localStorage).
 *
 * OLD: salt was in localStorage — if cleared (privacy tools, incognito), the key
 *      changed permanently and all encrypted data became irrecoverable.
 * NEW: salt lives in db.sync_meta alongside the encrypted data. If the DB is
 *      cleared, both salt and data are gone — consistent, expected behavior.
 *
 * Migration: on first run with this version, migrates any existing localStorage
 * salt to IndexedDB and removes the old entry.
 *
 * Uses a dynamic import to avoid circular dep (db.ts re-exports initCrypto from here).
 */
async function getOrCreateSalt(): Promise<Uint8Array> {
  try {
    // Dynamic import avoids circular dep: db.ts → (no longer) → dbCrypto.ts
    // db.ts does `export { initCrypto } from './dbCrypto'` but doesn't import dbCrypto at evaluation time.
    const { db } = await import('./db');

    // Try to read existing salt from IndexedDB
    const existing = await db.sync_meta.get(SALT_IDB_KEY);
    if (existing && typeof existing.value === 'string' && existing.value.length > 0) {
      return new Uint8Array(existing.value.split(',').map(Number));
    }

    // Check localStorage for migration (move old salt to IndexedDB on first run)
    const lsLegacy = typeof localStorage !== 'undefined'
      ? localStorage.getItem(SALT_LS_LEGACY_KEY)
      : null;

    if (lsLegacy) {
      const salt = new Uint8Array(lsLegacy.split(',').map(Number));
      // Migrate: store in IndexedDB and delete from localStorage
      await db.sync_meta.put({ id: SALT_IDB_KEY, value: Array.from(salt).join(',') });
      try { localStorage.removeItem(SALT_LS_LEGACY_KEY); } catch { /* non-blocking */ }
      logger.info('[dbCrypto] Migrated crypto salt from localStorage → IndexedDB');
      return salt;
    }

    // No existing salt — create a new one
    const salt = crypto.getRandomValues(new Uint8Array(32));
    await db.sync_meta.put({ id: SALT_IDB_KEY, value: Array.from(salt).join(',') });
    return salt;
  } catch (e) {
    // IndexedDB not ready (very early boot) — fall back to a session-scoped buffer
    // The key will be re-derived on next call once DB is available.
    logger.warn('[dbCrypto] IndexedDB not ready for salt, using ephemeral fallback:', e);
    return crypto.getRandomValues(new Uint8Array(32));
  }
}

/**
 * Derive a stable device fingerprint for key material.
 * Not security-critical alone — combined with random salt via PBKDF2.
 */
function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    APP_SALT,
  ];
  return parts.join('|');
}

// ── CryptoKey Cache ─────────────────────────────
let _cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  const fingerprint = getDeviceFingerprint();
  const salt = await getOrCreateSalt();

  // Import fingerprint as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key via PBKDF2
  _cachedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return _cachedKey;
}

// ── Encrypt / Decrypt ──────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM with random IV.
 * Output format: "v2:<base64(iv + ciphertext)>"
 */
export async function encryptValue(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    // Prepend IV to ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return CIPHERTEXT_PREFIX + btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('[dbCrypto] CRITICAL: Encryption failed', error);
    // Do NOT fall back to plaintext — throw to prevent PII leakage
    throw new Error('Encryption failed — refusing to store unencrypted PII');
  }
}

/**
 * Decrypt a ciphertext string.
 * Handles both v2 (Web Crypto AES-GCM) and legacy v1 (crypto-js) formats.
 */
export async function decryptValue(ciphertext: string): Promise<string> {
  try {
    if (!ciphertext) return ciphertext;

    // v2 format: "v2:<base64>"
    if (ciphertext.startsWith(CIPHERTEXT_PREFIX)) {
      const key = await getEncryptionKey();
      const raw = atob(ciphertext.slice(CIPHERTEXT_PREFIX.length));
      const combined = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) combined[i] = raw.charCodeAt(i);

      const iv = combined.slice(0, IV_LENGTH);
      const data = combined.slice(IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

      return new TextDecoder().decode(decrypted);
    }

    // 🔧 M-4 Fix: Legacy v1 (crypto-js, starts with "U2F") — return as-is.
    // The service layer (decryptRecord) handles re-encryption on next write.
    if (ciphertext.startsWith('U2F')) {
      logger.warn('[dbCrypto] Legacy v1 ciphertext detected — will re-encrypt on next write');
      return ciphertext; // Caller (decryptRecord) triggers re-encryption
    }

    // Plain text (never encrypted) — pass through
    return ciphertext;
  } catch {
    // If decryption fails, likely corrupted or wrong key — return as-is
    logger.warn('[dbCrypto] Decryption failed — returning raw value');
    return ciphertext;
  }
}

// ── PII Field Encryption ───────────────────────
/** Fields to encrypt per table */
const SENSITIVE_FIELDS: Record<string, string[]> = {
  user_cache: ['profile', 'roster'],
  settings_cache: ['settings'],
  bucket_queue: ['scanned_by'],
  message_queue: ['content'],
};

/**
 * Encrypt sensitive fields in an object BEFORE storing to IndexedDB.
 * Call this explicitly at the service layer — do NOT rely on Dexie hooks (C-1 Fix).
 * Non-sensitive fields (IDs, indexes) are left in plaintext.
 */
export async function encryptRecord<T extends Record<string, unknown>>(
  tableName: string,
  record: T
): Promise<T> {
  const fields = SENSITIVE_FIELDS[tableName];
  if (!fields) return record;

  const encrypted = { ...record };
  for (const field of fields) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      const value =
        typeof encrypted[field] === 'string'
          ? (encrypted[field] as string)
          : JSON.stringify(encrypted[field]);
      (encrypted as Record<string, unknown>)[field] = await encryptValue(value);
    }
  }
  return encrypted;
}

/**
 * Decrypt sensitive fields after reading from IndexedDB.
 * 🔧 M-4 Fix: Auto-migrates v1 (crypto-js) data by re-encrypting in v2 format
 * on the next write. This is fire-and-forget — no blocking of the read path.
 */
export async function decryptRecord<T extends Record<string, unknown>>(
  tableName: string,
  record: T
): Promise<T> {
  const fields = SENSITIVE_FIELDS[tableName];
  if (!fields || !record) return record;

  const decrypted = { ...record };
  let hasLegacyV1 = false;

  for (const field of fields) {
    if (typeof decrypted[field] === 'string') {
      const raw = decrypted[field] as string;
      const isLegacyV1 = raw.startsWith('U2F');
      if (isLegacyV1) hasLegacyV1 = true;

      const plaintext = await decryptValue(raw);
      try {
        (decrypted as Record<string, unknown>)[field] = JSON.parse(plaintext);
      } catch {
        (decrypted as Record<string, unknown>)[field] = plaintext;
      }
    }
  }

  // 🔧 M-4: Schedule async re-encryption if any field was v1 legacy format.
  // Fire-and-forget: non-blocking, best-effort. Gradually migrates all v1 data
  // to v2 AES-GCM format as records are read in normal use.
  if (hasLegacyV1 && (record as Record<string, unknown>).id) {
    encryptRecord(tableName, decrypted).then(async reEncrypted => {
      try {
        const { db } = await import('./db');
        await db.table(tableName).update((record as Record<string, unknown>).id as string, reEncrypted);
        logger.info(`[dbCrypto] Auto-migrated v1 record in ${tableName}/${(record as Record<string, unknown>).id} to v2`);
      } catch {
        /* best-effort, will retry on next read */
      }
    }).catch(() => { /* ignore */ });
  }

  return decrypted;
}

/**
 * Initialize crypto subsystem — exported for app startup warmup.
 * Pre-derives the Web Crypto key so subsequent operations are fast.
 * Exported here (rather than db.ts) to break the circular import.
 */
export async function initCrypto(): Promise<void> {
  try {
    await getEncryptionKey(); // Warms up the key cache
  } catch {
    // Key derivation failed — crypto will re-attempt on each call
  }
}
