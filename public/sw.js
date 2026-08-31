const CACHE_VERSION = 'cronometro-pwa-v3';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './icon.png'
];

// Install: precache core shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache asset fetch warning:', err);
      });
    })
  );
});

// Activate: clean up previous caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler with dedicated strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only intercept standard GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Strategy 1: For HTML page navigation, use Network-First
  // This ensures newly deployed builds are immediately loaded instead of stale HTML with old bundle hashes
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('./index.html') || await caches.match('./');
          return fallback || Response.error();
        })
    );
    return;
  }

  // Strategy 2: For static assets (JS, CSS, Images, Icons, Fonts), use Stale-While-Revalidate / Cache-First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, return undefined so cachedResponse is used or fails gracefully
          return null;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
