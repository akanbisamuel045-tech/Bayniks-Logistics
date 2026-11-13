'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Instantly delete any stale PWA caches so browser always displays the fresh UI
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          for (const name of cacheNames) {
            if (name !== 'bayniks-pwa-v2') {
              caches.delete(name);
            }
          }
        });
      }

      // 2. Register fresh Service Worker and trigger update
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            reg.update();
          })
          .catch((err) => {
            console.warn('[SW] Registration notice:', err);
          });
      }
    }
  }, []);

  return null;
}

