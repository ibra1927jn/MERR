/**
 * Push Repository — Domain queries for push_subscriptions table
 *
 * Encapsulates all direct Supabase access for push notification subscriptions.
 * Used by push.service.ts to persist/remove Web Push subscriptions.
 */
import { supabase } from '@/services/supabase';

export interface PushSubscriptionRecord {
    user_id: string;
    endpoint: string;
    keys_p256dh: string;
    keys_auth: string;
    user_agent: string;
}

export const pushRepository = {
    /** Upsert a push subscription for a user (idempotent by user_id + endpoint) */
    async upsert(record: PushSubscriptionRecord): Promise<{ error: unknown }> {
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert(record, { onConflict: 'user_id,endpoint' });
        return { error };
    },

    /** Delete a push subscription by user_id and endpoint */
    async delete(userId: string, endpoint: string): Promise<void> {
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', endpoint);
    },
};
