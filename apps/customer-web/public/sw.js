/**
 * Bayniks Logistics - Progressive Web App (PWA) & TWA Service Worker
 * Version: 1.0.0
 * Strategy: Cache-first for core static assets, Network-first for dynamic API & order telemetry
 */

const CACHE_NAME = 'bayniks-pwa-v1';
const OFFLINE_FALLBACK_URL = '/';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// 1. Install Event: Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching asset failed (ignorable during build):', err);
      });
    })
  );
  // Force active immediately
  self.skipWaiting();
});

// 2. Activate Event: Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Network-first for API/navigation, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Network-First for API calls & dynamic tracking routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/track/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, check cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return simulated offline JSON payload for API
          if (url.pathname.startsWith('/api/')) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: 'Device is offline. Connecting to Nigerian telecommunications network...',
                isOffline: true,
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }
            );
          }
          // Fallback to cached root shell
          return caches.match(OFFLINE_FALLBACK_URL);
        })
    );
    return;
  }

  // Cache-First (Stale-While-Revalidate) for static assets (_next/static, fonts, icons)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Return cached if available, else fallback
          return cachedResponse || caches.match(OFFLINE_FALLBACK_URL);
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Message Event: Handle client ping/broadcasts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

