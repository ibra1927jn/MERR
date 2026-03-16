/**
 * Tests for picker-history.service.ts — import coverage
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
}));
vi.mock('@/utils/nzst', () => ({
    todayNZST: () => '2026-03-10',
    nowNZST: () => '2026-03-10T12:00:00+13:00',
}));

import { pickerHistoryService } from './picker-history.service';

describe('pickerHistoryService', () => {
    it('exports service object', () => {
        expect(pickerHistoryService).toBeDefined();
    });
});
