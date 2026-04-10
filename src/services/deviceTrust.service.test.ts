/**
 * deviceTrust.service.test.ts — Tests para la lógica de confianza de dispositivo MFA
 *
 * Verifica:
 * - saveDeviceTrust: guarda token con expiresAt correcto
 * - isDeviceTrusted: válido, expirado, user incorrecto, sin token
 * - clearDeviceTrust: elimina el token
 * - Limpieza automática de tokens expirados
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

import { Capacitor } from '@capacitor/core';
import {
  saveDeviceTrust,
  isDeviceTrusted,
  clearDeviceTrust,
  DEFAULT_TTL_HOURS,
} from './deviceTrust.service';

const mockIsNative = Capacitor.isNativePlatform as ReturnType<typeof vi.fn>;

// ─── localStorage mock ───────────────────────────────────────────────────────

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('deviceTrust.service (web/localStorage)', () => {
  beforeEach(() => {
    mockIsNative.mockReturnValue(false);
    localStorageMock.clear();
    vi.clearAllMocks();
    // Re-register mock after clear
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── saveDeviceTrust ────────────────────────────────────────────────────

  describe('saveDeviceTrust', () => {
    it('guarda un token en localStorage con la clave correcta', async () => {
      await saveDeviceTrust('user-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mfa_device_trust_user-123',
        expect.any(String)
      );
    });

    it('el token incluye userId y expiresAt calculado correctamente', async () => {
      vi.useFakeTimers();
      const now = 1_000_000_000_000;
      vi.setSystemTime(now);

      await saveDeviceTrust('user-abc', 24);

      const raw = store['mfa_device_trust_user-abc'];
      const entry = JSON.parse(raw);
      expect(entry.userId).toBe('user-abc');
      expect(entry.expiresAt).toBe(now + 24 * 60 * 60 * 1000);
    });

    it(`usa DEFAULT_TTL_HOURS (${DEFAULT_TTL_HOURS}h) cuando no se especifica TTL`, async () => {
      vi.useFakeTimers();
      const now = 2_000_000_000_000;
      vi.setSystemTime(now);

      await saveDeviceTrust('user-xyz');

      const entry = JSON.parse(store['mfa_device_trust_user-xyz']);
      expect(entry.expiresAt).toBe(now + DEFAULT_TTL_HOURS * 60 * 60 * 1000);
    });
  });

  // ─── isDeviceTrusted ────────────────────────────────────────────────────

  describe('isDeviceTrusted', () => {
    it('devuelve true si el token existe y no ha expirado', async () => {
      vi.useFakeTimers();
      const now = 1_000_000_000_000;
      vi.setSystemTime(now);
      await saveDeviceTrust('user-123', 72);

      // Avanzar 1h — sigue válido
      vi.setSystemTime(now + 1 * 60 * 60 * 1000);
      const result = await isDeviceTrusted('user-123');
      expect(result).toBe(true);
    });

    it('devuelve false si el token ha expirado', async () => {
      vi.useFakeTimers();
      const now = 1_000_000_000_000;
      vi.setSystemTime(now);
      await saveDeviceTrust('user-123', 1); // 1 hora de TTL

      // Avanzar 2h — expirado
      vi.setSystemTime(now + 2 * 60 * 60 * 1000);
      const result = await isDeviceTrusted('user-123');
      expect(result).toBe(false);
    });

    it('limpia el token expirado automáticamente', async () => {
      vi.useFakeTimers();
      const now = 1_000_000_000_000;
      vi.setSystemTime(now);
      await saveDeviceTrust('user-123', 1);

      vi.setSystemTime(now + 2 * 60 * 60 * 1000);
      await isDeviceTrusted('user-123');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mfa_device_trust_user-123');
    });

    it('devuelve false si no hay token guardado', async () => {
      const result = await isDeviceTrusted('user-no-token');
      expect(result).toBe(false);
    });

    it('devuelve false si el userId no coincide (token de otro usuario)', async () => {
      // Escribir manualmente un token con userId diferente
      store['mfa_device_trust_user-hacker'] = JSON.stringify({
        userId: 'user-legit',
        expiresAt: Date.now() + 999_999_999,
      });

      const result = await isDeviceTrusted('user-hacker');
      expect(result).toBe(false);
    });

    it('devuelve false si el JSON está corrupto (fail safe)', async () => {
      store['mfa_device_trust_user-bad'] = 'not-valid-json{{{{';
      const result = await isDeviceTrusted('user-bad');
      expect(result).toBe(false);
    });
  });

  // ─── clearDeviceTrust ───────────────────────────────────────────────────

  describe('clearDeviceTrust', () => {
    it('elimina el token del localStorage', async () => {
      await saveDeviceTrust('user-123');
      await clearDeviceTrust('user-123');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mfa_device_trust_user-123');
    });

    it('después de clear, isDeviceTrusted devuelve false', async () => {
      await saveDeviceTrust('user-123', 72);
      await clearDeviceTrust('user-123');

      const result = await isDeviceTrusted('user-123');
      expect(result).toBe(false);
    });

    it('no lanza error si no hay token que eliminar', async () => {
      await expect(clearDeviceTrust('user-inexistente')).resolves.not.toThrow();
    });
  });

  // ─── Aislamiento por usuario ─────────────────────────────────────────────

  describe('aislamiento por usuario', () => {
    it('tokens de distintos usuarios son independientes', async () => {
      vi.useFakeTimers();
      const now = 1_000_000_000_000;
      vi.setSystemTime(now);

      await saveDeviceTrust('user-A', 72);
      await saveDeviceTrust('user-B', 1);

      // B expira, A no
      vi.setSystemTime(now + 2 * 60 * 60 * 1000);

      expect(await isDeviceTrusted('user-A')).toBe(true);
      expect(await isDeviceTrusted('user-B')).toBe(false);
    });

    it('clearDeviceTrust solo borra el token del usuario especificado', async () => {
      await saveDeviceTrust('user-A', 72);
      await saveDeviceTrust('user-B', 72);

      await clearDeviceTrust('user-A');

      expect(await isDeviceTrusted('user-A')).toBe(false);
      expect(await isDeviceTrusted('user-B')).toBe(true);
    });
  });
});
