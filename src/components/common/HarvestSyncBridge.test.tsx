/**
 * HarvestSyncBridge — Invisible sync bridge tests
 */
import { describe, it, expect } from 'vitest';

describe('HarvestSyncBridge', () => {
    it('module exports HarvestSyncBridge', async () => {
        // Dynamic import to avoid hook issues in test environment
        const mod = await import('./HarvestSyncBridge');
        expect(typeof mod.HarvestSyncBridge).toBe('function');
    });
});
