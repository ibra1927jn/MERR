/**
 * Auto-mock for dbCrypto module.
 * Used by vi.mock('../dbCrypto') — passthrough encryption for tests.
 * This avoids Web Crypto API dependency in jsdom/fake-indexeddb.
 */
export async function encryptRecord<T extends Record<string, unknown>>(
  _tableName: string,
  record: T
): Promise<T> {
  return record;
}

export async function decryptRecord<T extends Record<string, unknown>>(
  _tableName: string,
  record: T
): Promise<T> {
  return record;
}

export async function encryptValue(plaintext: string): Promise<string> {
  return plaintext;
}

export async function decryptValue(ciphertext: string): Promise<string> {
  return ciphertext;
}

export async function initCrypto(): Promise<void> {
  // no-op in tests
}
