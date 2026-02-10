/**
 * SERVICE WORKER V5.1 - Fix de Conexión a Base de Datos
 */
const CACHE_NAME = 'merr-v5.1-connectivity-fix'; // SUBIMOS VERSIÓN
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. IGNORAR PETICIONES EXTERNAS (Supabase, APIs, etc.)
    // Esto permite que la app hable directo con la BD sin que el SW moleste.
    if (!url.origin.includes(self.location.origin)) {
        return;
    }

    // 2. Solo nos importan los GET
    if (request.method !== 'GET') return;

    // 3. ESTRATEGIA: RED PRIMERO para navegación (HTML/JS)
    if (request.mode === 'navigate' || request.url.endsWith('.js') || request.url.endsWith('.css')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request)
                        .then((cachedResponse) => {
                            if (cachedResponse) return cachedResponse;
                            if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
                            return null;
                        });
                })
        );
        return;
    }

    // 4. Para imágenes y otros assets: Caché Primero
    event.respondWith(
        caches.match(request).then((response) => response || fetch(request))
    );
});
