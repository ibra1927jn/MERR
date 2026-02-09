import { offlineService } from './offline.service';

// Debounce Cache (In-Memory)
const scanHistory = new Map<string, number>();
const scannedCodes = new Set<string>(); // Track all scanned codes in this session
const DEBOUNCE_MS = 5000; // 5 seconds - prevents accidental double-scans as per pilot requirements

export const productionService = {
    /**
     * Core Production Logic: Scanner Entry Point
     * Handles Debounce, Validation, and Persistence (via SyncService)
     */
    async scanSticker(code: string, orchardId: string, quality: 'A' | 'B' | 'C' | 'reject' = 'A', binId?: string, scannedBy?: string) {
        const now = Date.now();
        console.log(`[Production] Scanning: ${code} @ ${orchardId}, bin: ${binId}`);

        // 1. Validation: Basic Format
        if (!code || code.length < 3) {
            return { success: false, error: 'Código inválido (muy corto)' };
        }

        // 2. Check if this exact code was already scanned in this session
        if (scannedCodes.has(code)) {
            console.warn(`[Production] DUPLICATE BLOCKED: ${code} was already scanned in this session`);
            return { success: false, error: 'DUPLICADO: Este bucket ya fue escaneado', isDuplicate: true };
        }

        // 3. Debounce (Anti-Accidental Double-Tap within 30 seconds)
        const lastScan = scanHistory.get(code);
        if (lastScan && (now - lastScan < DEBOUNCE_MS)) {
            console.warn(`[Production] Duplicate scan prevented for ${code} (within ${DEBOUNCE_MS}ms)`);
            return { success: false, error: 'DUPLICADO: Escaneado recientemente', isDuplicate: true };
        }

        // 4. OFFLINE VALIDATION (The "Gatekeeper")
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

        // Update History & Mark as Scanned
        scanHistory.set(code, now);
        scannedCodes.add(code); // ✅ Permanently mark this code as scanned

        // 5. Persistence Barrier (Offline Service via Dexie)
        // We use offlineService to ensure data integrity in IndexedDB
        try {
            await offlineService.queueBucketScan(
                code,
                quality,
                orchardId,
                undefined, // Row number resolution could be added here if needed
                binId,
                scannedBy
            );

            return { success: true, message: 'Registrado correctamente' };
        } catch (e: any) {
            console.error("[Production] Critical Error:", e);
            return { success: false, error: 'Error de Almacenamiento' };
        }
    },

    // Clear history (e.g., if user manually reset or starts new shift)
    clearHistory() {
        scanHistory.clear();
        scannedCodes.clear();
        console.log('[Production] Scan history cleared');
    }
};
