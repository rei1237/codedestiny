/**
 * Fortune Tama Service Worker v1.0
 * Provides offline support and caching for the Fortune Tama PWA
 */

const CACHE_NAME = 'fortune-tama-v3';

const PRECACHE_URLS = [
  '/tadagochi.html',
  '/manifest-tadagochi.json',
  '/icons/fortune-tama-96.png',
  '/icons/fortune-tama-192.png',
  '/icons/fortune-tama-180.png',
];

// Install: pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Partial failure is OK — continue install
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first with cache fallback (stale-while-revalidate for icons)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (Gemini API, fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // Icons & manifest: cache-first (they don't change often)
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest-tadagochi.json') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML & other pages: network-first
  if (url.pathname === '/tadagochi.html' || url.pathname === '/tadagochi') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('/tadagochi.html'))
    );
  }
});
