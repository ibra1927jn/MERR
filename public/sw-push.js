/**
 * Service Worker — Push Notification Handler
 * 
 * Runs in the background, even when the app is closed.
 * Receives push events from the Web Push API and shows native notifications.
 */

/* eslint-disable no-restricted-globals */

// Type assertion for Service Worker global scope
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

// ── Push Event Handler ────────────────────────────────
sw.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const payload = event.data.json();

        const title = payload.title || 'HarvestPro NZ';
        const options = {
            body: payload.body || '',
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: payload.tag || 'harvestpro-notification',
            data: {
                url: payload.url || '/',
                type: payload.type || 'general',
                ...payload.data,
            },
            // Vibration pattern for mobile
            vibrate: [100, 50, 100],
            // Actions for interactive notifications
            actions: payload.actions || [],
            // Keep notification until user interacts
            requireInteraction: payload.requireInteraction || false,
            // Timestamp
            timestamp: payload.timestamp || Date.now(),
        };

        event.waitUntil(sw.registration.showNotification(title, options));
    } catch (err) {
        console.error('[SW Push] Failed to show notification:', err);
        // Fallback: show a generic notification
        event.waitUntil(
            sw.registration.showNotification('HarvestPro NZ', {
                body: event.data?.text() || 'New notification',
                icon: '/icons/icon-192x192.png',
            })
        );
    }
});

// ── Notification Click Handler ────────────────────────
sw.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    // Focus existing tab or open new one
    event.waitUntil(
        sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Try to focus an existing window
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // Open new window if none found
            return sw.clients.openWindow(url);
        })
    );
});

// ── Notification Close Handler (for analytics) ───────
sw.addEventListener('notificationclose', (event) => {
    console.info('[SW Push] Notification closed:', event.notification.tag);
});

// ── Push Subscription Change Handler ─────────────────
sw.addEventListener('pushsubscriptionchange', (event) => {
    console.info('[SW Push] Subscription changed, re-subscribing...');
    event.waitUntil(
        sw.registration.pushManager.subscribe(event.oldSubscription?.options || {
            userVisibleOnly: true,
        }).then((subscription) => {
            // Send new subscription to server
            return fetch('/api/push-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription),
            });
        })
    );
});
