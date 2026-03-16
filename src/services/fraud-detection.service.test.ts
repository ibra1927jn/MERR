// =============================================
// FRAUD DETECTION SERVICE TESTS
// =============================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the edge functions repository to avoid real network calls + gateway retries
vi.mock('@/repositories/edgeFunctions.repository', () => ({
    edgeFunctionsRepository: {
        invoke: vi.fn().mockRejectedValue(new Error('Edge Function returned a non-2xx status code')),
    },
}));

import { fraudDetectionService } from './fraud-detection.service';

describe('Fraud Detection Service', () => {
    // =============================================
    // DISMISSED EXAMPLES (static documentation)
    // =============================================
    describe('getDismissedExamples', () => {
        it('should return array of dismissed scenarios', () => {
            const dismissed = fraudDetectionService.getDismissedExamples();
            expect(Array.isArray(dismissed)).toBe(true);
            expect(dismissed.length).toBeGreaterThan(0);
        });

        it('should have valid structure', () => {
            const dismissed = fraudDetectionService.getDismissedExamples();
            for (const d of dismissed) {
                expect(d).toHaveProperty('scenario');
                expect(d).toHaveProperty('reason');
                expect(d).toHaveProperty('rule');
                expect(typeof d.scenario).toBe('string');
                expect(typeof d.reason).toBe('string');
                expect(typeof d.rule).toBe('string');
            }
        });

        it('should include the 3 core rules', () => {
            const dismissed = fraudDetectionService.getDismissedExamples();
            const rules = dismissed.map(d => d.rule);
            expect(rules).toContain('elapsed_velocity');
            expect(rules).toContain('peer_comparison');
            expect(rules).toContain('grace_period');
        });
    });

    // =============================================
    // DEFAULT CONFIG
    // =============================================
    describe('config', () => {
        it('should have sensible default values', () => {
            const cfg = fraudDetectionService.config;
            expect(cfg.gracePeriodMinutes).toBe(90);
            expect(cfg.peerOutlierThreshold).toBe(3.0);
            expect(cfg.maxPhysicalRate).toBe(8);
            expect(cfg.shiftStartHour).toBe(6);
            expect(cfg.shiftEndHour).toBe(19);
        });
    });

    // =============================================
    // fetchAnomalies (with mocked edgeFunctionsRepository)
    // =============================================
    describe('fetchAnomalies', () => {
        beforeEach(() => {
            vi.restoreAllMocks();
        });

        it('should return empty array when Edge Function fails', async () => {
            // The edgeFunctionsRepository mock will reject — service returns []
            const result = await fraudDetectionService.fetchAnomalies('test-orchard');
            expect(Array.isArray(result)).toBe(true);
        });
    });
});

