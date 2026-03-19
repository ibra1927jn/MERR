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
 *   - Random salt stored in localStorage (not reconstructible)
 *
 * Architecture:
 *   - Only PII fields are encrypted (not IDs/indexes, which Dexie needs in plaintext)
 *   - Transparent: callers see plaintext, storage sees ciphertext
 *   - Backwards compatible: detects and passes through unencrypted legacy data
 */
import { logger } from '@/utils/logger';

// ── Constants ─────────────────────────────
const APP_SALT = 'HarvestPro-NZ-2026-v2'; // Versioned to distinguish from v1
const PBKDF2_ITERATIONS = 100_000;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const CIPHERTEXT_PREFIX = 'v2:'; // Prefix to distinguish v2 (Web Crypto) from v1 (crypto-js)

// ── Key Material ─────────────────────────────

/**
 * Get or create a random salt stored in localStorage.
 * Combined with a user passphrase or device entropy for key derivation.
 */
function getRandomSalt(): Uint8Array {
  const SALT_KEY = 'harvestpro_crypto_salt_v2';
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) {
    return new Uint8Array(stored.split(',').map(Number));
  }
  const salt = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(SALT_KEY, Array.from(salt).join(','));
  return salt;
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
  const salt = getRandomSalt();

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

    // Legacy v1 (crypto-js): starts with "U2F" — return as-is (migration)
    // After migration period, these can be re-encrypted on next write
    if (ciphertext.startsWith('U2F')) {
      logger.warn('[dbCrypto] Legacy v1 ciphertext detected — will re-encrypt on next write');
      return ciphertext; // Caller should trigger re-encryption
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
 * Encrypt sensitive fields in an object before storing to IndexedDB.
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
 */
export async function decryptRecord<T extends Record<string, unknown>>(
  tableName: string,
  record: T
): Promise<T> {
  const fields = SENSITIVE_FIELDS[tableName];
  if (!fields || !record) return record;

  const decrypted = { ...record };
  for (const field of fields) {
    if (typeof decrypted[field] === 'string') {
      const plaintext = await decryptValue(decrypted[field] as string);
      try {
        (decrypted as Record<string, unknown>)[field] = JSON.parse(plaintext);
      } catch {
        (decrypted as Record<string, unknown>)[field] = plaintext;
      }
    }
  }
  return decrypted;
}
