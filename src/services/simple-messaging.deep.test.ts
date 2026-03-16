/**
 * Deep tests for simple-messaging.service.ts
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/services/supabase', () => ({
    supabase: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
}));

import { simpleMessagingService } from './simple-messaging.service';

describe('simpleMessagingService', () => {
    it('module exports simpleMessagingService', () => {
        expect(simpleMessagingService).toBeDefined();
        expect(typeof simpleMessagingService).toBe('object');
    });

    it('has messaging methods', () => {
        const methods = Object.keys(simpleMessagingService);
        expect(methods.length).toBeGreaterThan(0);
    });
});
