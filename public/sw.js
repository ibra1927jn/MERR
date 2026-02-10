/**
 * SERVICE WORKER V5.1 - Connectivity Fix (Unlocked)
 * * Este Service Worker está diseñado para:
 * 1. Permitir libre paso a conexiones externas (Supabase/Auth).
 * 2. Forzar la actualización en los móviles eliminando la caché vieja.
 */

const CACHE_NAME = 'merr-pilot-v5.1-unlocked'; // NOMBRE CRÍTICO PARA EL RESET
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

// ==========================================
// 1. INSTALACIÓN (Forzar actualización inmediata)
// ==========================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing V5.1 Unlocked...');
    // Obliga al SW a activarse inmediatamente, sin esperar a que cierres la app
    self.skipWaiting(); 
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching App Shell');
                return cache.addAll(PRECACHE_ASSETS);
            })
    );
});

// ==========================================
// 2. ACTIVACIÓN (Borrado de basura vieja)
// ==========================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating & Cleaning old caches...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME) // Borra todo lo que no sea v5.1
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Toma control de las pestañas abiertas ya
    );
});

// ==========================================
// 3. INTERCEPTACIÓN DE RED (El "Portero")
// ==========================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 🚨 REGLA DE ORO: IGNORAR TRÁFICO EXTERNO 🚨
    // Esto permite que las llamadas a Supabase, Auth y APIs pasen directo
    // sin que el Service Worker las bloquee o intente cachearlas mal.
    if (!url.origin.includes(self.location.origin)) {
        return; // El SW se aparta y deja pasar la conexión
    }

    // Solo nos importan las peticiones GET para cachear
    if (request.method !== 'GET') {
        return;
    }

    // ESTRATEGIA 1: NETWORK FIRST (Red primero)
    // Para navegación (HTML), Scripts (.js) y Estilos (.css)
    // Intentamos ir a internet para tener siempre lo último. Si falla, usamos caché.
    if (request.mode === 'navigate' || request.url.endsWith('.js') || request.url.endsWith('.css')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // Si no hay internet, busca en caché
                    return caches.match(request)
                        .then((cachedResponse) => {
                            if (cachedResponse) return cachedResponse;
                            // Si es navegación y no hay nada, muestra la página offline
                            if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
                            return null;
                        });
                })
        );
        return;
    }

    // ESTRATEGIA 2: CACHE FIRST (Caché primero)
    // Para imágenes, iconos y fuentes. Carga rápido desde memoria.
    event.respondWith(
        caches.match(request).then((response) => {
            return response || fetch(request).then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});
