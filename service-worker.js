/* Service Worker - kkul-mansaeryeok
  Cache version: v15 (Network-First strategy)
*/

const CACHE_NAME = 'kkul-mansaeryeok-v15';
const IS_LOCALHOST = /^(localhost|127\.0\.0\.1|::1)$/i.test(self.location.hostname || '');

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Serif+KR:wght@400;700&family=Cinzel:wght@400;700&family=Cinzel+Decorative:wght@700;900&family=Noto+Sans+KR:wght@300;400;700&display=swap'
];

self.addEventListener('install', event => {
  if (IS_LOCALHOST) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  if (IS_LOCALHOST) {
    event.waitUntil(
      caches.keys().then(cacheNames =>
        Promise.all(cacheNames.map(name => caches.delete(name)))
      ).then(() => self.registration.unregister())
    );
    return;
  }
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

/* Network-First: always try network, fall back to cache */
self.addEventListener('fetch', event => {
  if (IS_LOCALHOST) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);

  // Kill-switch heartbeat must always hit network and never use cache fallback.
  if (requestUrl.origin === self.location.origin && requestUrl.pathname === '/status.json') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(
        () => new Response('', { status: 503, statusText: 'status_unavailable' })
      )
    );
    return;
  }

  // Keep crawler-critical files network-direct to avoid stale/fallback responses.
  if (event.request.url.includes('/ads.txt') || event.request.url.includes('/robots.txt') || event.request.url.includes('/sitemap.xml')) return;
  if (event.request.url.includes('pagead') || event.request.url.includes('google-analytics')) return;
  if (event.request.url.includes('emailjs') || event.request.url.includes('api.')) return;
  // Tarot interactions must never display stale JS/CSS.
  if (
    requestUrl.origin === self.location.origin &&
    (
      requestUrl.pathname.includes('/js/tarot-') ||
      requestUrl.pathname.includes('/styles/tarot-')
    )
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Birth/profile-driven engines must not use stale cache, otherwise input bindings can break.
  if (
    requestUrl.origin === self.location.origin &&
    (
      requestUrl.pathname === '/js/saju-engine.js' ||
      requestUrl.pathname === '/js/saju-engine-continuation.js' ||
      requestUrl.pathname === '/js/destiny-profile.js' ||
      requestUrl.pathname === '/js/core/index-inline-runtime.js' ||
      requestUrl.pathname === '/js/core/saju/modalProfileState.js' ||
      requestUrl.pathname === '/styles/fortune-ui.css' ||
      requestUrl.pathname === '/css/index-inline-extracted.css'
    )
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const toCache = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
      return response;
    }).catch(() =>
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('/index.html');
      })
    )
  );
});
