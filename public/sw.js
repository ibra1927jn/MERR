// HarvestPro NZ Service Worker - MERR Protocol V2
const CACHE_NAME = 'merr-pilot-v2-hardened';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/premium.css',
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing pilot-hardened service worker...');
    self.skipWaiting(); // Force update immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching app shell');
                return cache.addAll(PRECACHE_ASSETS);
            })
    );
});

// Activate event - clean up old caches IMMEDIATELY
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating pilot-hardened service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] PURGING OLD CACHE:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Claiming clients...');
            return self.clients.claim();
        })
    );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests (APIs, CDNs for fonts, etc.)
    if (!url.origin.includes(self.location.origin)) {
        return;
    }

    // For API requests - Network only with offline queue
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkOnly(request));
        return;
    }

    // For ALL HTML/JS FILES - Force NetworkFirst (PILOTO SEGURO)
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstWithOfflineFallback(request));
        return;
    }

    // For other static assets (CSS, images) - Cache first, network fallback
    event.respondWith(cacheFirst(request));
});

// Network first strategy with offline fallback
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        // Cache the response for future use
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache...');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Return offline page for navigation requests
        return caches.match(OFFLINE_URL);
    }
}

// Cache first strategy
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.log('[SW] Fetch failed for:', request.url);
        return new Response('Offline', { status: 503 });
    }
}

// Network only strategy
async function networkOnly(request) {
    try {
        return await fetch(request);
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);
    if (event.tag === 'sync-harvest-data') {
        event.waitUntil(syncHarvestData());
    }
});

// Sync offline data when back online
async function syncHarvestData() {
    console.log('[SW] Syncing harvest data...');
    // This will be handled by the app's IndexedDB sync logic
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_TRIGGERED' });
    });
}

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nueva notificación de HarvestPro',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'HarvestPro NZ', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});
