/**
 * @file sw.js
 * Service Worker: Offline-first caching strategy for GitHub Pages.
 */

const CACHE_NAME = 'aici-webchem-colloids-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/tokens.css',
  './assets/css/layout.css',
  './assets/css/components.css',
  './assets/icons/icon.svg',
  './src/main.mjs',
  './src/core/router.mjs',
  './src/core/store.mjs',
  './src/core/security.mjs',
  './src/core/canvas-utils.mjs',
  './src/data/colloids-data.mjs',
  './src/data/cases-data.mjs',
  './src/views/matrix-explorer.mjs',
  './src/views/brownian-tyndall-lab.mjs',
  './src/views/dlvo-coagulation-lab.mjs',
  './src/views/surface-adsorption-lab.mjs',
  './src/views/case-diagnostics.mjs'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache immediately, fetch in background for cache revalidation
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If offline and request is for page, return cached index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
