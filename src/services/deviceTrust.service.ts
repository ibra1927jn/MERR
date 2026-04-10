/**
 * deviceTrust.service.ts — Gestión de confianza de dispositivo para MFA
 *
 * Almacena un token de confianza que permite omitir MFA durante un TTL
 * configurable (por defecto 72h).
 *
 * Plataforma:
 *  - Web (PWA):  localStorage
 *  - Android:    @capacitor/preferences (persiste entre reinicios de la app)
 *
 * Seguridad:
 *  - El token es per-usuario: key = `mfa_device_trust_{userId}`
 *  - El token incluye expiresAt en ms — se invalida automáticamente en el cliente
 *  - No sustituye la validación server-side de la sesión Supabase
 *  - Se limpia en cada logout (llamar clearDeviceTrust al hacer signOut)
 */
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY_PREFIX = 'mfa_device_trust_';
export const DEFAULT_TTL_HOURS = 72;

interface DeviceTrustEntry {
  userId: string;
  expiresAt: number; // Unix timestamp ms
}

// ─── Platform-aware read/write ───────────────────────────────────────────────

async function readRaw(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

async function removeRaw(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Guarda un token de confianza para el dispositivo actual.
 * @param userId   ID del usuario autenticado
 * @param ttlHours Horas de validez (default: DEFAULT_TTL_HOURS = 72)
 */
export async function saveDeviceTrust(userId: string, ttlHours = DEFAULT_TTL_HOURS): Promise<void> {
  const entry: DeviceTrustEntry = {
    userId,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  await writeRaw(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(entry));
}

/**
 * Verifica si el dispositivo tiene confianza MFA válida para el usuario.
 * @returns true si hay un token no expirado para ese userId
 */
export async function isDeviceTrusted(userId: string): Promise<boolean> {
  try {
    const raw = await readRaw(`${STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return false;

    const entry: DeviceTrustEntry = JSON.parse(raw);
    if (entry.userId !== userId) return false;
    if (Date.now() > entry.expiresAt) {
      // Limpiar token expirado
      await removeRaw(`${STORAGE_KEY_PREFIX}${userId}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Elimina el token de confianza del dispositivo para el usuario.
 * Llamar siempre en signOut.
 */
export async function clearDeviceTrust(userId: string): Promise<void> {
  await removeRaw(`${STORAGE_KEY_PREFIX}${userId}`);
}
