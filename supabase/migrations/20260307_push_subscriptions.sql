-- Push Notification Subscriptions
-- Stores Web Push API subscriptions per user for background notifications.
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Prevent duplicate subscriptions for same endpoint
    UNIQUE(user_id, endpoint)
);
-- Fast lookup by user_id (for sending push to specific users)
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
-- RLS: users can only manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
-- Service role can read all subscriptions (for server-side push sending)
CREATE POLICY "Service role can read all subscriptions" ON push_subscriptions FOR
SELECT USING (auth.role() = 'service_role');