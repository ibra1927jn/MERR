/**
 * push.service.ts — Web Push Subscription Management
 *
 * Manages the lifecycle of push notification subscriptions:
 *  - Registers a dedicated push Service Worker
 *  - Creates/stores PushSubscription via Web Push API
 *  - Syncs subscription with Supabase via pushRepository
 *  - VAPID public key from environment
 *
 * Works alongside VitePWA's Workbox SW (separate SW for push).
 */
import { supabase } from '@/services/supabase';
import { pushRepository } from '@/repositories/push.repository';
import { logger } from '@/utils/logger';

// VAPID public key — set in .env as VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const SW_PATH = '/sw-push.js';

/** Convert URL-safe base64 to Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/** Check if push notifications are supported in this browser */
function isSupported(): boolean {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/** Get or register the push Service Worker */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
        // Check if already registered
        const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
        if (existing) return existing;

        // Register new
        const registration = await navigator.serviceWorker.register(SW_PATH, {
            scope: '/',
        });
        logger.info('[PushService] Service Worker registered');
        return registration;
    } catch (err) {
        logger.error('[PushService] SW registration failed:', err);
        return null;
    }
}

/** Get the current push subscription, if any */
async function getSubscription(): Promise<PushSubscription | null> {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;
    return registration.pushManager.getSubscription();
}

/** Subscribe to push notifications */
async function subscribe(): Promise<PushSubscription | null> {
    if (!isSupported()) {
        logger.warn('[PushService] Push not supported');
        return null;
    }

    if (!VAPID_PUBLIC_KEY) {
        logger.warn('[PushService] VAPID public key not configured');
        return null;
    }

    // Request permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        logger.warn('[PushService] Permission denied');
        return null;
    }

    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;

    try {
        // Wait for SW to be ready
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });

        // Store subscription in Supabase
        await saveSubscription(subscription);

        logger.info('[PushService] Subscribed to push');
        return subscription;
    } catch (err) {
        logger.error('[PushService] Subscribe failed:', err);
        return null;
    }
}

/** Unsubscribe from push notifications */
async function unsubscribe(): Promise<boolean> {
    const subscription = await getSubscription();
    if (!subscription) return true;

    try {
        await subscription.unsubscribe();
        await removeSubscription(subscription.endpoint);
        logger.info('[PushService] Unsubscribed from push');
        return true;
    } catch (err) {
        logger.error('[PushService] Unsubscribe failed:', err);
        return false;
    }
}

/** Save push subscription to Supabase via repository */
async function saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const keys = subscription.toJSON().keys;
    if (!keys) return;

    const { error } = await pushRepository.upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys_p256dh: keys.p256dh!,
        keys_auth: keys.auth!,
        user_agent: navigator.userAgent,
    });

    if (error) {
        logger.error('[PushService] Failed to save subscription:', error);
    }
}

/** Remove push subscription from Supabase via repository */
async function removeSubscription(endpoint: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await pushRepository.delete(user.id, endpoint);
}

/** Check if currently subscribed */
async function isSubscribed(): Promise<boolean> {
    const subscription = await getSubscription();
    return subscription !== null;
}

/** Get current permission state */
function getPermissionState(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

/** Send a test push notification (via Edge Function) */
async function sendTestPush(): Promise<boolean> {
    try {
        const { error } = await supabase.functions.invoke('send-push', {
            body: {
                action: 'test',
                title: '🍒 HarvestPro Push Test',
                body: 'Push notifications are working! You\'ll receive alerts even when the app is closed.',
            },
        });
        return !error;
    } catch {
        return false;
    }
}

export const pushService = {
    isSupported,
    subscribe,
    unsubscribe,
    isSubscribed,
    getPermissionState,
    getSubscription,
    sendTestPush,
};
