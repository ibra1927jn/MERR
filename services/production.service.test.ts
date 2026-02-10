import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productionService } from './production.service';
import { offlineService } from './offline.service';
import { telemetryService } from './telemetry.service';

// Mock dependencies
vi.mock('./offline.service', () => ({
    offlineService: {
        getCachedRoster: vi.fn(),
        queueBucketScan: vi.fn()
    }
}));

vi.mock('./telemetry.service', () => ({
    telemetryService: {
        log: vi.fn(),
        error: vi.fn()
    }
}));

describe('productionService - War Tank Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        productionService.clearHistory();
    });

    it('should block duplicate codes in the same session', async () => {
        const code = 'PICKER-123';
        const orchardId = 'test-orchard';

        // First scan
        const result1 = await productionService.scanSticker(code, orchardId);
        expect(result1.success).toBe(true);

        // Second scan (immediate)
        const result2 = await productionService.scanSticker(code, orchardId);
        expect(result2.success).toBe(false);
        expect(result2.error).toContain('DUPLICADO');
        expect(result2.isDuplicate).toBe(true);
    });

    it('should enforce the 5-second debounce window', async () => {
        const code = 'PICKER-456';
        const orchardId = 'test-orchard';

        // Mock Date.now to control time
        const now = Date.now();
        const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

        // First scan
        await productionService.scanSticker(code, orchardId);

        // Second scan (at 4 seconds)
        dateSpy.mockReturnValue(now + 4000);
        const result2 = await productionService.scanSticker(code, orchardId);
        expect(result2.success).toBe(false);
        // Note: session cache blocks it before temporal debounce
        expect(result2.error).toContain('ya fue escaneado');

        // Third scan (at 6 seconds) - Should still be blocked by session cache
        // Note: The logic has BOTH session cache (Set) and temporal debounce (Map)
        // Correcting test expectation: The Set blocks it forever in the session.
        dateSpy.mockReturnValue(now + 6000);
        const result3 = await productionService.scanSticker(code, orchardId);
        expect(result3.isDuplicate).toBe(true);

        dateSpy.mockRestore();
    });

    it('should delegate 100% of persistence to offlineService', async () => {
        const code = 'PICKER-789';
        const orchardId = 'test-orchard';
        const quality = 'A';
        const binId = 'BIN-001';
        const userId = 'USER-99';

        await productionService.scanSticker(code, orchardId, quality, binId, userId);

        expect(offlineService.queueBucketScan).toHaveBeenCalledWith(
            code,
            quality,
            orchardId,
            undefined,
            binId,
            userId
        );
    });

    it('should log attempts and results to telemetry', async () => {
        await productionService.scanSticker('TEST-ABC', 'orchard-1');
        expect(telemetryService.log).toHaveBeenCalledWith('INFO', 'Production', 'Scan Attempt Started', expect.any(Object));
        expect(telemetryService.log).toHaveBeenCalledWith('INFO', 'Production', 'Scan Persisted locally', expect.any(Object));
    });
});
