/**
 * Bayniks Logistics - Progressive Web App (PWA) Service Worker
 * Version: 2.0.0 (Clean Cache Purge Edition)
 * Strategy: Network-First for all navigations and assets to prevent stale UI caching
 */

const CACHE_NAME = 'bayniks-pwa-v2';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// 1. Install Event: Skip waiting immediately & precache essential metadata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Wipe out all stale caches (including bayniks-pwa-v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network-First for all navigation requests and dynamic assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Network-First for navigation (HTML pages) and dynamic routes
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/track/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          if (url.pathname.startsWith('/api/')) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: 'Device is offline.',
                isOffline: true,
              }),
              { headers: { 'Content-Type': 'application/json' }, status: 503 }
            );
          }
          return new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Network-First for scripts & stylesheets to prevent stale bundle lock
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// 4. Message Event: Handle client ping/broadcasts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

