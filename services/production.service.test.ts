import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productionService } from './production.service';
import { syncService } from './sync.service';
import { offlineService } from './offline.service';

// Mock dependencies
vi.mock('./sync.service', () => ({
    syncService: {
        addToQueue: vi.fn()
    }
}));

vi.mock('./offline.service', () => ({
    offlineService: {
        getCachedRoster: vi.fn()
    }
}));

describe('Production Logic (Phase 7) - Resilience & Validation', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        productionService.clearHistory();
    });

    it('Task 1: Should validate and queue a valid sticker', async () => {
        // Setup: Mock roster contains Picker 123
        (offlineService.getCachedRoster as any).mockResolvedValue([
            { id: 'uuid-1', picker_id: '123' }
        ]);
        (syncService.addToQueue as any).mockReturnValue('queue-uuid-1');

        // Execute scan
        const result = await productionService.scanSticker('123', 'orchard-A');

        // Verify Success
        expect(result.success).toBe(true);
        expect(result.queueId).toBe('queue-uuid-1');

        // Verify Persistence (Pillar 3)
        expect(syncService.addToQueue).toHaveBeenCalledWith('SCAN', expect.objectContaining({
            picker_id: '123',
            orchard_id: 'orchard-A',
            quality_grade: 'A'
        }));
    });

    it('Task 3: Should REJECT invalid codes (Backend Validation)', async () => {
        // Setup: Roster does NOT have '999'
        (offlineService.getCachedRoster as any).mockResolvedValue([
            { id: 'uuid-1', picker_id: '123' }
        ]);

        const result = await productionService.scanSticker('999', 'orchard-A');

        expect(result.success).toBe(false);
        expect(result.error).toContain('CÓDIGO DESCONOCIDO');
        expect(syncService.addToQueue).not.toHaveBeenCalled();
    });

    it('Task 1: Should ignore validation if roster cache is empty (Fail Open for Resilience)', async () => {
        // Setup: Empty Cache (e.g. first load offline)
        (offlineService.getCachedRoster as any).mockResolvedValue([]);

        const result = await productionService.scanSticker('999', 'orchard-A');

        // Current logic: Allows it but logs warning (Success=true)
        // Or maybe strictly validation? My code said "console.warn ... allowing scan primarily"
        expect(result.success).toBe(true);
    });

    it('Task 1: Should Prevent Double Scans (Debounce)', async () => {
        (offlineService.getCachedRoster as any).mockResolvedValue([
            { id: 'uuid-1', picker_id: '123' }
        ]);

        // Scan 1
        await productionService.scanSticker('123', 'orchard-A');

        // Scan 2 (Immediate)
        const result = await productionService.scanSticker('123', 'orchard-A');

        expect(result.success).toBe(false);
        expect(result.isDuplicate).toBe(true);
        expect(syncService.addToQueue).toHaveBeenCalledTimes(1); // Only once
    });
});
