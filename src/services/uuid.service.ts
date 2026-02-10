/**
 * UUID Service - Generates RFC4122 compliant UUIDs
 * Uses native crypto.randomUUID() with fallback for older browsers
 */

/**
 * Generate a UUID v4 compliant with RFC4122
 * Uses native crypto.randomUUID() when available
 */
export function generateUUID(): string {
    // Use native API if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Check if a string is a valid UUID format
 */
export function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Check if an ID is a temporary (non-UUID) ID
 * Temporary IDs are those generated with Math.random().toString(36)
 */
export function isTemporaryId(id: string): boolean {
    return !isValidUUID(id);
}

export default { generateUUID, isValidUUID, isTemporaryId };
