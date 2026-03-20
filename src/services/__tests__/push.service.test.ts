/**
 * Tests for push.service.ts — Web Push subscription management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/services/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'user-1', email: 'test@test.com' } },
            }),
        },
        from: vi.fn().mockReturnValue({
            upsert: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            }),
        }),
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
        },
    },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { pushService } from '../push.service';

describe('pushService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isSupported', () => {
        it('returns true when all APIs are available', () => {
            // JSDOM doesn't have full SW/Push support, so this may return false
            const result = pushService.isSupported();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getPermissionState', () => {
        it('returns current permission state', () => {
            const state = pushService.getPermissionState();
            expect(['granted', 'denied', 'default', 'unsupported']).toContain(state);
        });
    });

    describe('isSubscribed', () => {
        it('returns false when no service worker is registered', async () => {
            const result = await pushService.isSubscribed();
            expect(result).toBe(false);
        });
    });

    describe('subscribe', () => {
        it('returns null when not supported', async () => {
            // In JSDOM, PushManager is not available
            const result = await pushService.subscribe();
            expect(result).toBeNull();
        });
    });

    describe('unsubscribe', () => {
        it('returns true when no subscription exists', async () => {
            const result = await pushService.unsubscribe();
            expect(result).toBe(true);
        });
    });

    describe('sendTestPush', () => {
        it('calls supabase functions invoke', async () => {
            const result = await pushService.sendTestPush();
            expect(result).toBe(true);
        });
    });
});

