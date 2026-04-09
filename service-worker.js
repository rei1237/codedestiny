/* Service Worker - kkul-mansaeryeok
  Versioned cache key derived from registration query (?v=...)
*/

const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_PREFIX = 'kkul-mansaeryeok-';
const CACHE_NAME = `${CACHE_PREFIX}${SW_VERSION}`;

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
          .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

function reportCriticalError(message, error) {
  if (!error) {
    console.error(`[SW] ${message}`);
    return;
  }
  console.error(`[SW] ${message}`, error);
}

self.addEventListener('error', event => {
  reportCriticalError('Unhandled runtime error', event && (event.error || event.message));
});

self.addEventListener('unhandledrejection', event => {
  reportCriticalError('Unhandled promise rejection', event && event.reason);
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
});

function createOfflineFallback(request) {
  if (request.mode === 'navigate' || request.destination === 'document') {
    return new Response(
      '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Offline</title></head><body><h1>오프라인 상태입니다.</h1><p>네트워크 연결 후 다시 시도해 주세요.</p></body></html>',
      {
        status: 503,
        statusText: 'offline_unavailable',
        headers: { 'content-type': 'text/html; charset=UTF-8' }
      }
    );
  }

  // ★ 204 No Content は body 不可 (Fetch spec) → null body を使用
  return new Response(null, { status: 204, statusText: 'offline_empty' });
}

async function safeNetworkFetch(request, options, fallbackStatusText) {
  try {
    return await fetch(request, options);
  } catch (error) {
    reportCriticalError(`Network fetch failed: ${fallbackStatusText}`, error);
    return new Response('', { status: 503, statusText: fallbackStatusText });
  }
}

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
  if (
    isSameOrigin &&
    (pathname === '/manifest.json' || pathname === '/manifest-samba.json')
  ) {
    return;
  }

  // /admin/* — 관리자 패널은 SW 캐싱을 완전히 우회해 항상 서버에서 직접 응답 받음
  // (SW 인터셉트로 인한 프로미스 reject → 네트워크 에러 방지)
  if (isSameOrigin && pathname.startsWith('/admin')) {
    return;
  }

  // HTML 문서는 항상 네트워크 우선(no-store)로 받아 구버전 셸 고착을 방지한다.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(safeNetworkFetch(event.request, { cache: 'no-store' }, 'offline_unavailable'));
    return;
  }

  // Kill-switch heartbeat must always hit network and never use cache fallback.
  if (requestUrl.origin === self.location.origin && requestUrl.pathname === '/status.json') {
    event.respondWith(safeNetworkFetch(event.request, { cache: 'no-store' }, 'status_unavailable'));
    return;
  }

  // Keep crawler-critical files network-direct to avoid stale/fallback responses.
  if (event.request.url.includes('/ads.txt') || event.request.url.includes('/robots.txt') || event.request.url.includes('/sitemap.xml')) return;
  if (event.request.url.includes('pagead') || event.request.url.includes('google-analytics')) return;
  if (isSameOrigin && pathname.startsWith('/api/')) return;
  if (event.request.url.includes('emailjs') || event.request.url.includes('api.')) return;
  // Tarot interactions must never display stale JS/CSS.
  if (
    isSameOrigin &&
    (
      requestUrl.pathname.includes('/js/tarot-') ||
      requestUrl.pathname.includes('/styles/tarot-')
    )
  ) {
    event.respondWith(safeNetworkFetch(event.request, { cache: 'no-store' }, 'tarot_asset_unavailable'));
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
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(async error => {
        reportCriticalError('Static asset no-store fetch failed', error);
        const cached = await caches.match(event.request);
        return cached || createOfflineFallback(event.request);
      })
    );
    return;
  }

  // Cross-origin requests: SW가 인터셉트하면 CORS 오류(TypeError: Failed to fetch)가 발생하므로
  // 동일 출처가 아닌 요청은 브라우저 기본 처리로 넘긴다.
  if (!isSameOrigin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const shouldCache =
          !pathname.endsWith('.html') &&
          !pathname.endsWith('.js') &&
          !pathname.endsWith('.css');
        if (shouldCache) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache)).catch(error => {
            reportCriticalError('Cache put failed', error);
          });
        }
        return response;
      })
      .catch(async error => {
        reportCriticalError('Network-first fetch failed', error);
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;
        }
        return createOfflineFallback(event.request);
      })
  );
});
