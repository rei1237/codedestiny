/* Service Worker - kkul-mansaeryeok
  Versioned cache key derived from registration query (?v=...)
*/

const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `kkul-mansaeryeok-${SW_VERSION}`;

const PRECACHE_URLS = [
  // Cloudflare/WAF가 manifest 요청을 특정 경로/헤더 조합에서 403으로 차단하는 케이스가 있어,
  // SW install 단계의 프리캐시는 제거하고 브라우저의 기본 요청으로 처리되도록 둡니다.
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
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

self.addEventListener('message', event => {
  if (!event || !event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    event.waitUntil(
      Promise.resolve(self.skipWaiting()).then(() => self.clients.claim())
    );
  }
});

/* Network-First: always try network, fall back to cache */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const pathname = requestUrl.pathname.toLowerCase();
  const isSameOrigin = requestUrl.origin === self.location.origin;

  // manifest(.json)는 SW가 프록시하지 않도록 제외합니다.
  // (SW fetch 중간에서 403/HTML 응답이 섞이면 manifest 로드 실패 및 PWA 동작 문제로 이어질 수 있음)
  if (
    isSameOrigin &&
    (pathname === '/manifest.json' || pathname === '/manifest-samba.json')
  ) {
    return;
  }

  // HTML 문서는 항상 네트워크 우선(no-store)로 받아 구버전 셸 고착을 방지한다.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(
        () => new Response('', { status: 503, statusText: 'offline_unavailable' })
      )
    );
    return;
  }

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
    isSameOrigin &&
    (
      requestUrl.pathname.includes('/js/tarot-') ||
      requestUrl.pathname.includes('/styles/tarot-')
    )
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Unversioned JS/CSS should never be stored by SW to avoid stale deploys on normal mode.
  if (
    isSameOrigin &&
    (
      event.request.destination === 'script' ||
      event.request.destination === 'style' ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.css')
    )
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const shouldCache =
        !pathname.endsWith('.html') &&
        !pathname.endsWith('.js') &&
        !pathname.endsWith('.css');
      if (shouldCache) {
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const home = await caches.match('/');
        if (home) return home;
      }
      return new Response('', { status: 503, statusText: 'offline_unavailable' });
    })
  );
});
