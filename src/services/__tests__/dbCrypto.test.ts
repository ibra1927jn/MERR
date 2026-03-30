/**
 * dbCrypto — Unit Tests
 *
 * Tests for transparent encryption layer for IndexedDB (Dexie).
 * Uses Web Crypto API polyfill since jsdom doesn't include crypto.subtle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Web Crypto polyfill for jsdom
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// ── Mocks ──────────────────────────────────────────

const mockSyncMeta = {
  get: vi.fn(),
  put: vi.fn(),
};

vi.mock('@/services/db', () => ({
  db: {
    sync_meta: mockSyncMeta,
    table: vi.fn(() => ({ update: vi.fn() })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  encryptValue,
  decryptValue,
  encryptRecord,
  decryptRecord,
  initCrypto,
} from '../dbCrypto';

// ── Tests ──────────────────────────────────────────

describe('dbCrypto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Return no existing salt so a fresh one is created
    mockSyncMeta.get.mockResolvedValue(null);
    mockSyncMeta.put.mockResolvedValue(undefined);
  });

  describe('encryptValue / decryptValue round-trip', () => {
    it('encrypts and decrypts successfully', async () => {
      const plaintext = 'Hello, HarvestPro NZ!';
      const encrypted = await encryptValue(plaintext);
      const decrypted = await decryptValue(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('round-trips special characters', async () => {
      const plaintext = 'Te Reo Maori: kia ora! 🍒 & <html>';
      const encrypted = await encryptValue(plaintext);
      const decrypted = await decryptValue(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('round-trips JSON strings', async () => {
      const obj = { name: 'Test User', role: 'picker', settings: [1, 2, 3] };
      const plaintext = JSON.stringify(obj);
      const encrypted = await encryptValue(plaintext);
      const decrypted = await decryptValue(encrypted);

      expect(JSON.parse(decrypted)).toEqual(obj);
    });
  });

  describe('encryptValue', () => {
    it('produces v2: prefix', async () => {
      const encrypted = await encryptValue('test');

      expect(encrypted.startsWith('v2:')).toBe(true);
    });

    it('produces different ciphertext each time (random IV)', async () => {
      const a = await encryptValue('same input');
      const b = await encryptValue('same input');

      expect(a).not.toBe(b);
    });
  });

  describe('decryptValue', () => {
    it('handles empty string', async () => {
      const result = await decryptValue('');

      expect(result).toBe('');
    });

    it('passes through legacy v1 (U2F) strings', async () => {
      const legacyValue = 'U2FsdGVkX1+somelegacydata==';
      const result = await decryptValue(legacyValue);

      expect(result).toBe(legacyValue);
    });

    it('passes through plaintext (no prefix)', async () => {
      const plaintext = 'just a regular string';
      const result = await decryptValue(plaintext);

      expect(result).toBe(plaintext);
    });
  });

  describe('encryptRecord', () => {
    it('skips tables not in SENSITIVE_FIELDS', async () => {
      const record = { id: '1', name: 'Alice', data: 'public info' };
      const result = await encryptRecord('unknown_table', record);

      expect(result).toEqual(record);
    });

    it('encrypts fields listed for known table', async () => {
      const record = {
        id: '1',
        profile: JSON.stringify({ name: 'Alice', email: 'alice@test.com' }),
        roster: 'some roster data',
      };

      const result = await encryptRecord('user_cache', record);

      expect(result.id).toBe('1'); // IDs not encrypted
      expect(result.profile).not.toBe(record.profile);
      expect((result.profile as string).startsWith('v2:')).toBe(true);
      expect((result.roster as string).startsWith('v2:')).toBe(true);
    });

    it('does not encrypt null or undefined fields', async () => {
      const record = {
        id: '1',
        profile: null,
        roster: undefined,
      };

      const result = await encryptRecord('user_cache', record);

      expect(result.profile).toBeNull();
      expect(result.roster).toBeUndefined();
    });

    it('encrypts message_queue content field', async () => {
      const record = {
        id: 'msg-1',
        content: 'Hello there, this is a private message',
      };

      const result = await encryptRecord('message_queue', record);

      expect(result.id).toBe('msg-1');
      expect((result.content as string).startsWith('v2:')).toBe(true);
    });
  });

  describe('decryptRecord', () => {
    it('decrypts encrypted fields', async () => {
      const original = {
        id: '1',
        profile: JSON.stringify({ name: 'Alice' }),
        roster: 'morning shift',
      };

      // Encrypt first
      const encrypted = await encryptRecord('user_cache', original);

      // Then decrypt
      const decrypted = await decryptRecord('user_cache', encrypted);

      // profile was JSON, so decryptRecord JSON.parses it
      expect(decrypted.profile).toEqual({ name: 'Alice' });
      expect(decrypted.roster).toBe('morning shift');
      expect(decrypted.id).toBe('1');
    });

    it('returns record unchanged for unknown table', async () => {
      const record = { id: '1', data: 'test' };
      const result = await decryptRecord('unknown_table', record);

      expect(result).toEqual(record);
    });

    it('handles null record', async () => {
      const result = await decryptRecord('user_cache', null as any);

      expect(result).toBeNull();
    });
  });

  describe('initCrypto', () => {
    it('runs without error', async () => {
      await expect(initCrypto()).resolves.toBeUndefined();
    });
  });
});
