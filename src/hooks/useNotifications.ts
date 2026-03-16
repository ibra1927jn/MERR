/**
 * useNotifications — React hook for push notification management
 *
 * Combines push.service (Web Push / Service Worker) with
 * notification.service (local browser notifications / alert checks).
 *
 * Usage:
 *   const { isSupported, isSubscribed, subscribe, unsubscribe, prefs, ... } = useNotifications();
 */
import { useState, useEffect, useCallback } from 'react';
import { pushService } from '@/services/push.service';
import { notificationService } from '@/services/notification.service';

interface NotificationPrefs {
    enabled: boolean;
    types: Record<string, boolean>;
}

interface UseNotificationsReturn {
    /** Whether push notifications are supported in this browser */
    isSupported: boolean;
    /** Whether the user is currently subscribed to push */
    isSubscribed: boolean;
    /** Current permission state */
    permission: NotificationPermission | 'unsupported';
    /** Loading state while checking/subscribing */
    loading: boolean;
    /** Notification preferences */
    prefs: NotificationPrefs;
    /** Subscribe to push notifications */
    subscribe: () => Promise<boolean>;
    /** Unsubscribe from push notifications */
    unsubscribe: () => Promise<boolean>;
    /** Update alert type preferences */
    updatePrefs: (types: Partial<Record<string, boolean>>) => void;
    /** Send a test push notification */
    sendTest: () => Promise<boolean>;
    /** Toggle enabled state */
    toggleEnabled: () => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
        pushService.getPermissionState()
    );
    const [prefs, setPrefs] = useState<NotificationPrefs>(notificationService.getPrefs());

    const supported = pushService.isSupported();

    // Check subscription status on mount
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!supported) {
                if (mounted) setLoading(false);
                return;
            }
            try {
                const subscribed = await pushService.isSubscribed();
                if (mounted) {
                    setIsSubscribed(subscribed);
                    setPermission(pushService.getPermissionState());
                }
            } catch {
                // Silently handle — might not have SW registered yet
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [supported]);

    // Start/stop periodic alert checking based on prefs
    useEffect(() => {
        if (prefs.enabled) {
            notificationService.startChecking();
        } else {
            notificationService.stopChecking();
        }
        return () => notificationService.stopChecking();
    }, [prefs.enabled]);

    const subscribe = useCallback(async (): Promise<boolean> => {
        setLoading(true);
        try {
            const subscription = await pushService.subscribe();
            if (subscription) {
                setIsSubscribed(true);
                setPermission('granted');
                // Also enable local notifications
                await notificationService.setEnabled(true);
                setPrefs(notificationService.getPrefs());
                return true;
            }
            setPermission(pushService.getPermissionState());
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setLoading(true);
        try {
            const success = await pushService.unsubscribe();
            if (success) {
                setIsSubscribed(false);
                await notificationService.setEnabled(false);
                setPrefs(notificationService.getPrefs());
            }
            return success;
        } finally {
            setLoading(false);
        }
    }, []);

    const updatePrefs = useCallback((types: Partial<Record<string, boolean>>) => {
        notificationService.setAlertTypes(types as Record<string, boolean>);
        setPrefs(notificationService.getPrefs());
    }, []);

    const sendTest = useCallback(async (): Promise<boolean> => {
        // First try push, fallback to local
        if (isSubscribed) {
            return pushService.sendTestPush();
        }
        const notif = notificationService.sendTest();
        return notif !== null;
    }, [isSubscribed]);

    const toggleEnabled = useCallback(async (): Promise<boolean> => {
        if (prefs.enabled) {
            return unsubscribe();
        }
        return subscribe();
    }, [prefs.enabled, subscribe, unsubscribe]);

    return {
        isSupported: supported,
        isSubscribed,
        permission,
        loading,
        prefs,
        subscribe,
        unsubscribe,
        updatePrefs,
        sendTest,
        toggleEnabled,
    };
}
