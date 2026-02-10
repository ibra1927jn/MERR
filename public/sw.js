/**
 * SERVICE WORKER V5 - Estrategia de Actualización Forzada
 */
const CACHE_NAME = 'merr-v5-stable-release'; // CAMBIO CRÍTICO: Nuevo nombre
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

// INSTALACIÓN: Forzar espera cero
self.addEventListener('install', (event) => {
    console.log('[SW] Installing V5...');
    self.skipWaiting(); // Obliga al SW a activarse inmediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching V5 assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
    );
});

// ACTIVACIÓN: Limpieza agresiva de versiones viejas
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating V5...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Toma control de las pestañas abiertas ya
    );
});

// ESTRATEGIA DE RED: Network First para navegación
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo nos importan los GET
    if (request.method !== 'GET') return;

    // ESTRATEGIA BLINDADA:
    // Si es una navegación (abrir la app) o un archivo JS/CSS crítico:
    // INTENTA RED PRIMERO. Si falla, solo entonces usa caché.
    if (request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request)
                        .then((cachedResponse) => {
                            if (cachedResponse) return cachedResponse;
                            // Si es navegación y no hay red ni caché, muestra offline
                            if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
                            return null;
                        });
                })
        );
        return;
    }

    // Para imágenes y otros assets estáticos: Cache First
    event.respondWith(
        caches.match(request).then((response) => response || fetch(request))
    );
});
