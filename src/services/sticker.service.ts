// =============================================
// STICKER SCANNING SERVICE
// =============================================
// Servicio para gestionar escaneos de stickers y prevenir duplicados
// El código del sticker contiene el ID del picker al inicio
// Ejemplo: 2662200498 donde 26220 es el picker_id

import { supabase } from './supabase';
import { todayNZST } from '@/utils/nzst';

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
    // Eliminar espacios y caracteres no numéricos
    const cleanCode = stickerCode.replace(/\D/g, '');

    // El picker_id son los primeros 5 dígitos
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
            console.error('[StickerService] Error checking sticker:', error);
            // THROW error to let caller handle it (e.g., offline mode)
            throw error;
        }

        return data !== null;
    } catch (error) {
        console.error('[StickerService] Exception checking sticker:', error);
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

        // 1. Verificar si ya fue escaneado
        try {
            const alreadyScanned = await checkStickerScanned(normalizedCode);
            if (alreadyScanned) {
                return {
                    success: false,
                    error: `❌ Este sticker ya fue escaneado: ${normalizedCode}`
                };
            }
        } catch (error: unknown) {
            // Check if it's a network error (e.g. Failed to fetch)
            if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
                // If offline, we can't check duplicates. 
                // We return a special error or just proceed to try insert (which will also fail and trigger offline queue in Context)
                // We throw to let the Context catch it and queue it
                throw new Error('OFFLINE_MODE');
            }
            // Other errors, rethrow
            throw error;
        }

        // 2. Extraer picker_id del código
        const pickerId = extractPickerIdFromSticker(normalizedCode);

        // 3. Insertar en la base de datos
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
            // Si es error de duplicado (constraint unique), mostrar mensaje apropiado
            if (error.code === '23505') {
                return {
                    success: false,
                    error: `❌ Este sticker ya fue escaneado: ${normalizedCode}`
                };
            }
            console.error('[StickerService] Error inserting sticker:', error);
            // Throw to trigger offline handling if it's a connection error
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
            pickerId: pickerId || undefined,
            sticker: data
        };
    } catch (error: unknown) {
        if (error.message === 'OFFLINE_MODE' || error.message?.includes('Failed to fetch')) {
            return {
                success: false,
                error: 'OFFLINE_MODE' // Special flag for Context
            };
        }
        console.error('[StickerService] Exception scanning sticker:', error);
        return {
            success: false,
            error: `Error inesperado: ${error.message}`
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

        // Total de todos los tiempos
        const { count: totalCount } = await supabase
            .from('scanned_stickers')
            .select('*', { count: 'exact', head: true })
            .eq('team_leader_id', teamLeaderId);

        // Total de hoy
        const { count: todayCount } = await supabase
            .from('scanned_stickers')
            .select('*', { count: 'exact', head: true })
            .eq('team_leader_id', teamLeaderId)
            .gte('scanned_at', `${today}T00:00:00`)
            .lte('scanned_at', `${today}T23:59:59`);

        return {
            totalBuckets: totalCount || 0,
            todayBuckets: todayCount || 0
        };
    } catch (error) {
        console.error('[StickerService] Error getting stats:', error);
        return { totalBuckets: 0, todayBuckets: 0 };
    }
};

/**
 * Obtiene los buckets escaneados hoy por picker_id
 */
export const getTodayBucketsByPicker = async (pickerId: string): Promise<number> => {
    try {
        const today = todayNZST();

        const { count } = await supabase
            .from('scanned_stickers')
            .select('*', { count: 'exact', head: true })
            .eq('picker_id', pickerId)
            .gte('scanned_at', `${today}T00:00:00`)
            .lte('scanned_at', `${today}T23:59:59`);

        return count || 0;
    } catch (error) {
        console.error('[StickerService] Error getting picker buckets:', error);
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