/**
 * dbCrypto — Transparent encryption layer for IndexedDB (Dexie)
 *
 * Encrypts PII fields in sensitive tables before IndexedDB write,
 * decrypts after read. Uses AES-256 via crypto-js.
 *
 * Architecture:
 *   - Encryption key derived from a device-specific fingerprint + app constant
 *   - Only PII fields are encrypted (not IDs/indexes, which Dexie needs in plaintext)
 *   - Transparent: callers see plaintext, storage sees ciphertext
 */
import CryptoJS from 'crypto-js';
import { logger } from '@/utils/logger';

// ── Key Derivation ─────────────────────────────
// The key is derived from a stable device fingerprint + app salt.
// This prevents cross-device decryption (stolen DB file is useless).
const APP_SALT = 'HarvestPro-NZ-2026-Encryption';

function getDeviceFingerprint(): string {
    // Combine stable browser properties for a device-unique key
    const parts = [
        navigator.userAgent,
        navigator.language,
        screen.width.toString(),
        screen.height.toString(),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    ];
    return parts.join('|');
}

let _cachedKey: string | null = null;

function getEncryptionKey(): string {
    if (_cachedKey) return _cachedKey;
    const fingerprint = getDeviceFingerprint();
    _cachedKey = CryptoJS.PBKDF2(fingerprint, APP_SALT, {
        keySize: 256 / 32,
        iterations: 1000,
    }).toString();
    return _cachedKey;
}

// ── Encrypt / Decrypt ──────────────────────────

export function encryptValue(plaintext: string): string {
    try {
        return CryptoJS.AES.encrypt(plaintext, getEncryptionKey()).toString();
    } catch (error) {
        logger.error('[dbCrypto] Encryption failed', error);
        return plaintext; // Fallback: store unencrypted rather than lose data
    }
}

export function decryptValue(ciphertext: string): string {
    try {
        // Quick check: if it doesn't look like ciphertext, return as-is
        // (handles migration from unencrypted data)
        if (!ciphertext || !ciphertext.startsWith('U2F')) {
            return ciphertext;
        }
        const bytes = CryptoJS.AES.decrypt(ciphertext, getEncryptionKey());
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || ciphertext; // Fallback if decryption yields empty
    } catch {
        // Likely unencrypted legacy data — return as-is
        return ciphertext;
    }
}

// ── PII Field Encryption ───────────────────────
// Only encrypt fields that contain PII. IDs and indexes stay plaintext
// because Dexie needs them for querying.

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
export function encryptRecord<T extends Record<string, unknown>>(
    tableName: string,
    record: T
): T {
    const fields = SENSITIVE_FIELDS[tableName];
    if (!fields) return record; // Table has no sensitive fields

    const encrypted = { ...record };
    for (const field of fields) {
        if (encrypted[field] !== undefined && encrypted[field] !== null) {
            const value = typeof encrypted[field] === 'string'
                ? encrypted[field] as string
                : JSON.stringify(encrypted[field]);
            (encrypted as Record<string, unknown>)[field] = encryptValue(value);
        }
    }
    return encrypted;
}

/**
 * Decrypt sensitive fields after reading from IndexedDB.
 */
export function decryptRecord<T extends Record<string, unknown>>(
    tableName: string,
    record: T
): T {
    const fields = SENSITIVE_FIELDS[tableName];
    if (!fields || !record) return record;

    const decrypted = { ...record };
    for (const field of fields) {
        if (typeof decrypted[field] === 'string') {
            const plaintext = decryptValue(decrypted[field] as string);
            // Try to parse back to object if it was JSON-serialized
            try {
                (decrypted as Record<string, unknown>)[field] = JSON.parse(plaintext);
            } catch {
                (decrypted as Record<string, unknown>)[field] = plaintext;
            }
        }
    }
    return decrypted;
}
