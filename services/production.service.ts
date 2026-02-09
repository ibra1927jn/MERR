import { syncService } from './sync.service';
import { offlineService } from './offline.service';

// Debounce Cache (In-Memory)
const scanHistory = new Map<string, number>();
const DEBOUNCE_MS = 5000; // 5 seconds double-scan prevention

export const productionService = {
    /**
     * Core Production Logic: Scanner Entry Point
     * Handles Debounce, Validation, and Persistence (via SyncService)
     */
    async scanSticker(code: string, orchardId: string, quality: 'A' | 'B' | 'C' | 'reject' = 'A', binId?: string, scannedBy?: string) {
        const now = Date.now();
        console.log(`[Production] Scanning: ${code} @ ${orchardId}`);

        // 1. Validation: Basic Format
        if (!code || code.length < 3) {
            return { success: false, error: 'Código inválido (muy corto)' };
        }

        // 2. Debounce (Anti-Duplicate / "Double Tap" prevention)
        const lastScan = scanHistory.get(code);
        if (lastScan && (now - lastScan < DEBOUNCE_MS)) {
            console.warn(`[Production] Duplicate scan prevented for ${code}`);
            return { success: false, error: 'DUPLICADO: Elemento escaneado recientemente', isDuplicate: true };
        }

        // 3. OFFLINE VALIDATION (The "Gatekeeper")
        try {
            const roster = await offlineService.getCachedRoster(orchardId);

            if (roster && roster.length > 0) {
                const isValid = roster.some((p: any) => p.id === code || p.picker_id === code);

                if (!isValid) {
                    console.warn(`[Production] Code ${code} not in roster. Proceeding with caution...`);
                    // IMPORTANT: We allow it so the Runner can keep working. 
                    // Resolution will happen at the sync/ledger layer.
                }
            } else {
                console.warn("[Production] Roster cache empty, allowing scan primarily");
            }
        } catch (valError) {
            console.error("Validation failed", valError);
        }

        // Update History
        scanHistory.set(code, now);

        // 3. Persistence Barrier (Sync Service)
        // We delegate the actual "Storage" to the infrastructure layer
        try {
            const queueId = syncService.addToQueue('SCAN', {
                picker_id: code,
                quality_grade: quality,
                orchard_id: orchardId,
                bin_id: binId,
                scanned_by: scannedBy
            });

            return { success: true, queueId, message: 'Registrado correctamente' };
        } catch (e: any) {
            console.error("[Production] Critical Error:", e);
            return { success: false, error: 'Error de Almacenamiento' };
        }
    },

    // Clear history (e.g., if user manually reset)
    clearHistory() {
        scanHistory.clear();
    }
};
