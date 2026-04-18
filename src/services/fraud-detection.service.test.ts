/**
 * fraud-detection.service — bridge a edge function detect-anomalies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { edgeFunctionsRepository } from '@/repositories/edge-functions.repository';
import { fraudDetectionService } from './fraud-detection.service';

beforeEach(() => vi.restoreAllMocks());

describe('fraudDetectionService.fetchAnomalies', () => {
    const validResponse = {
        anomalies: [
            {
                id: 'a1',
                type: 'peer_outlier',
                severity: 'high',
                pickerId: 'p1',
                pickerName: 'Alice',
                detail: '3x peer avg',
                timestamp: '2026-04-18T09:00:00Z',
                evidence: { rate: 120 },
                rule: 'peer_comparison',
            },
        ],
        stats: { total: 1, high: 1, medium: 0, low: 0 },
    };

    it('devuelve anomalies parseadas por Zod', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: validResponse,
            error: null,
        });
        const anomalies = await fraudDetectionService.fetchAnomalies('o1');
        expect(anomalies).toHaveLength(1);
        expect(anomalies[0].id).toBe('a1');
    });

    it('[] cuando edge function devuelve error', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: null,
            error: { message: 'rls' },
        });
        expect(await fraudDetectionService.fetchAnomalies('o1')).toEqual([]);
    });

    it('[] cuando invoke throws (network)', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockRejectedValue(new Error('net'));
        expect(await fraudDetectionService.fetchAnomalies('o1')).toEqual([]);
    });

    it('[] cuando data no pasa schema (fallback safe)', async () => {
        vi.spyOn(edgeFunctionsRepository, 'invoke').mockResolvedValue({
            data: { garbage: true },
            error: null,
        });
        expect(await fraudDetectionService.fetchAnomalies('o1')).toEqual([]);
    });

    it('pasa orchard_id a la edge function', async () => {
        const spy = vi
            .spyOn(edgeFunctionsRepository, 'invoke')
            .mockResolvedValue({ data: validResponse, error: null });
        await fraudDetectionService.fetchAnomalies('orchard-xyz');
        expect(spy).toHaveBeenCalledWith('detect-anomalies', { orchard_id: 'orchard-xyz' });
    });
});

describe('fraudDetectionService.getDismissedExamples', () => {
    it('devuelve 3 ejemplos con scenario/reason/rule', () => {
        const examples = fraudDetectionService.getDismissedExamples();
        expect(examples).toHaveLength(3);
        for (const e of examples) {
            expect(e.scenario).toBeTruthy();
            expect(e.reason).toBeTruthy();
            expect(e.rule).toBeTruthy();
        }
    });

    it('incluye ejemplos elapsed_velocity, peer_comparison y grace_period', () => {
        const rules = fraudDetectionService.getDismissedExamples().map((e) => e.rule);
        expect(rules).toContain('elapsed_velocity');
        expect(rules).toContain('peer_comparison');
        expect(rules).toContain('grace_period');
    });
});
