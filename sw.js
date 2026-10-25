/**
 * @file sw.js
 * Service Worker: Offline-first caching strategy for GitHub Pages.
 */

const CACHE_NAME = 'aici-webchem-colloids-v3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './404.html',
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
  './src/data/nanocarriers-data.mjs',
  './src/views/matrix-explorer.mjs',
  './src/views/brownian-tyndall-lab.mjs',
  './src/views/dlvo-coagulation-lab.mjs',
  './src/views/surface-adsorption-lab.mjs',
  './src/views/nanocarriers-lab.mjs',
  './src/views/case-diagnostics.mjs'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
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
  if (event.request.method !== 'GET') return;

  // Network First with Cache Fallback for instant updates and offline support
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
