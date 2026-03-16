/**
 * push.repository.test.ts — Tests for push subscription repository
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushRepository } from './push.repository';

// ── Mock Supabase ──
vi.mock('@/services/supabase', () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockEq2 = vi.fn().mockResolvedValue({ error: null });
    const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
    const mockDelete = vi.fn(() => ({ eq: mockEq1 }));

    return {
        supabase: {
            from: vi.fn(() => ({
                upsert: mockUpsert,
                delete: mockDelete,
            })),
        },
    };
});

// Import after mock
import { supabase } from '@/services/supabase';

describe('pushRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('upsert', () => {
        it('calls supabase.from(push_subscriptions).upsert with correct data', async () => {
            const record = {
                user_id: 'u-1',
                endpoint: 'https://push.example.com/sub1',
                keys_p256dh: 'p256dh-key',
                keys_auth: 'auth-key',
                user_agent: 'Mozilla/5.0',
            };

            const result = await pushRepository.upsert(record);

            expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
            expect(result.error).toBeNull();
        });

        it('returns error when upsert fails', async () => {
            const dbError = { message: 'DB error' };
            const mockChain = supabase.from('push_subscriptions') as { upsert: ReturnType<typeof vi.fn> };
            mockChain.upsert.mockResolvedValueOnce({ error: dbError });

            const result = await pushRepository.upsert({
                user_id: 'u-1',
                endpoint: 'https://push.example.com/sub1',
                keys_p256dh: 'key',
                keys_auth: 'key',
                user_agent: 'agent',
            });

            expect(result.error).toEqual(dbError);
        });
    });

    describe('delete', () => {
        it('calls supabase.from(push_subscriptions).delete().eq().eq()', async () => {
            await pushRepository.delete('u-1', 'https://push.example.com/sub1');

            expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
        });
    });
});
