// =============================================
// STICKER SCANNING SERVICE
// =============================================
// Servicio para gestionar escaneos de stickers y prevenir duplicados
// El código del sticker contiene el ID del picker al inicio
// Ejemplo: 2662200498 donde 26220 es el picker_id

import { logger } from '@/utils/logger';
import { supabase } from './supabase';
import { todayNZST, toNZST } from '@/utils/nzst';

export interface ScannedSticker {
    id: string;
    sticker_code: string;
    picker_id: string | null;
    bin_id: string | null;
    scanned_by: string | null;
    team_leader_id: string | null;
    orchard_id: string | null;
    scanned_at: string;
    created_at: string;
}

export interface ScanResult {
    success: boolean;
    error?: string;
    pickerId?: string;
    sticker?: ScannedSticker;
}

/**
 * Extrae el picker_id del código del sticker
 * El formato del sticker es: [picker_id][número secuencial]
 * Ejemplo: 2662200498 -> picker_id = 26220
 * 
 * Asumimos que el picker_id es siempre 5 dígitos
 */
export const extractPickerIdFromSticker = (stickerCode: string): string | null => {
    // 🔧 L12: Strip non-digits first (consistent with scanSticker's normalize)
    const cleanCode = stickerCode.replace(/\D/g, '');

    // The picker_id are the first 5 digits
    if (cleanCode.length >= 5) {
        return cleanCode.substring(0, 5);
    }

    return null;
};

/**
 * Verifica si un sticker ya fue escaneado
 */
export const checkStickerScanned = async (stickerCode: string): Promise<boolean> => {
    try {
        const normalizedCode = stickerCode.trim().toUpperCase();

        const { data, error } = await supabase
            .from('scanned_stickers')
            .select('id')
            .eq('sticker_code', normalizedCode)
            .maybeSingle();

        if (error) {
            logger.error('[StickerService] Error checking sticker:', error);
            // THROW error to let caller handle it (e.g., offline mode)
            throw error;
        }

        return data !== null;
    } catch (error) {
        logger.error('[StickerService] Exception checking sticker:', error);
        throw error;
    }
};

/**
 * Registra un nuevo escaneo de sticker
 * Retorna error si el sticker ya fue escaneado
 */
export const scanSticker = async (
    stickerCode: string,
    binId: string,
    scannedByUserId?: string,
    teamLeaderId?: string,
    orchardId?: string
): Promise<ScanResult> => {
    try {
        const normalizedCode = stickerCode.trim().toUpperCase();

        // 🔧 V21: Validate picker_id BEFORE insert — prevents ghost scans with null picker
        const pickerId = extractPickerIdFromSticker(normalizedCode);
        if (!pickerId) {
            return {
                success: false,
                error: `❌ Código QR inválido (no se pudo extraer picker ID): ${normalizedCode}`
            };
        }

        // 🔧 V5: Removed pre-check SELECT (TOCTOU race condition).
        // We rely SOLELY on the DB unique constraint (23505) for dedup.
        // This eliminates the window where two concurrent scans both pass the check.

        // Insert directly — DB constraint handles duplicates atomically
        const { data, error } = await supabase
            .from('scanned_stickers')
            .insert([{
                sticker_code: normalizedCode,
                picker_id: pickerId,
                bin_id: binId,
                scanned_by: scannedByUserId,
                team_leader_id: teamLeaderId,
                orchard_id: orchardId,
            }])
            .select()
            .single();

        if (error) {
            // Duplicate sticker (constraint unique) — expected dedup path
            if (error.code === '23505') {
                return {
                    success: false,
                    error: `❌ Este sticker ya fue escaneado: ${normalizedCode}`
                };
            }
            logger.error('[StickerService] Error inserting sticker:', error);
            // Trigger offline handling if connection error
            if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
                throw new Error('OFFLINE_MODE');
            }
            return {
                success: false,
                error: `Error al registrar sticker: ${error.message}`
            };
        }

        return {
            success: true,
            pickerId,
            sticker: data
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage === 'OFFLINE_MODE' || errorMessage?.includes('Failed to fetch')) {
            return {
                success: false,
                error: 'OFFLINE_MODE' // Special flag for Context
            };
        }
        logger.error('[StickerService] Exception scanning sticker:', error);
        return {
            success: false,
            error: `Error inesperado: ${errorMessage}`
        };
    }
};

/**
 * Obtiene estadísticas de stickers escaneados para un team leader
 */
export const getTeamLeaderStats = async (teamLeaderId: string): Promise<{
    totalBuckets: number;
    todayBuckets: number;
}> => {
    try {
        const today = todayNZST();

        // 🔧 L13: Calculate NZST day boundaries as ISO timestamps
        // Without the offset, PostgreSQL parses the string as UTC, missing all morning scans
        const startOfDayNZ = new Date(`${today}T00:00:00`);
        const endOfDayNZ = new Date(`${today}T23:59:59`);
        const startISO = toNZST(startOfDayNZ);
        const endISO = toNZST(endOfDayNZ);

        // Total de todos los tiempos
        const { count: totalCount } = await supabase
            .from('scanned_stickers')
            .select('*', { count: 'exact', head: true })
            .eq('team_leader_id', teamLeaderId);

        // Total de hoy (with correct NZST offset)
        const { count: todayCount } = await supabase
            .from('scanned_stickers')
            .select('*', { count: 'exact', head: true })
            .eq('team_leader_id', teamLeaderId)
            .gte('scanned_at', startISO)
            .lte('scanned_at', endISO);

        return {
            totalBuckets: totalCount || 0,
            todayBuckets: todayCount || 0
        };
    } catch (error) {
        logger.error('[StickerService] Error getting stats:', error);
        return { totalBuckets: 0, todayBuckets: 0 };
    }
};

/**
 * Obtiene los buckets escaneados hoy por picker_id
 */
export const getTodayBucketsByPicker = async (pickerId: string): Promise<number> => {
    try {
        const today = todayNZST();

        // 🔧 L13: Use NZST offset to avoid missing morning scans
        const startOfDayNZ = new Date(`${today}T00:00:00`);
        const endOfDayNZ = new Date(`${today}T23:59:59`);
        const startISO = toNZST(startOfDayNZ);
        const endISO = toNZST(endOfDayNZ);

        const { count } = await supabase
            .from('scanned_stickers')
            .select('*', { count: 'exact', head: true })
            .eq('picker_id', pickerId)
            .gte('scanned_at', startISO)
            .lte('scanned_at', endISO);

        return count || 0;
    } catch (error) {
        logger.error('[StickerService] Error getting picker buckets:', error);
        return 0;
    }
};

export const stickerService = {
    extractPickerIdFromSticker,
    checkStickerScanned,
    scanSticker,
    getTeamLeaderStats,
    getTodayBucketsByPicker,
};

export default stickerService;
