/* Service Worker — code-destiny
   v2: 완전 network-first, HTML 캐싱 전면 금지
   캐시 이름에 타임스탬프 포함 → 배포 시 자동 캐시 무효화
*/

const SW_VERSION = 'moon-library-1';
const CACHE_PREFIX = 'kkul-mansaeryeok-';
const CACHE_NAME = `${CACHE_PREFIX}${SW_VERSION}`;

// Wait normally. Existing tabs retain their assets and controller until consent.
self.addEventListener('install', () => {});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

// ── Error 보고 ────────────────────────────────────────────────
function reportError(message, error) {
  if (error) {
    console.error(`[SW] ${message}`, error);
  } else {
    console.error(`[SW] ${message}`);
  }
}

self.addEventListener('error', (event) => {
  reportError('Unhandled runtime error', event && (event.error || event.message));
});

self.addEventListener('unhandledrejection', (event) => {
  reportError('Unhandled promise rejection', event && event.reason);
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
});

// Ask EVERY current window, including older clients. Silence is unsafe.
self.addEventListener('message', event => {
 if (event.data?.type === 'CD_VERSION') { event.ports[0]?.postMessage({version:SW_VERSION}); return; }
 if (event.data?.type !== 'CD_ACTIVATE_SAFE' || !event.ports[0]) return;
 event.waitUntil((async () => {
  const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const results = await Promise.all(clients.map(client => new Promise(resolve => {
   const channel = new MessageChannel();
   const timer = setTimeout(() => {channel.port1.close();resolve(false);},2500);
   channel.port1.onmessage = reply => {clearTimeout(timer);channel.port1.close();resolve(reply.data?.safe === true);};
   client.postMessage({type:'CD_CHECK_SAFE'},[channel.port2]);
  })));
  const current = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const safe = clients.length > 0 && results.every(Boolean) && current.every(c => clients.some(old => old.id === c.id));
  event.ports[0].postMessage({safe});
  if(safe) await self.skipWaiting();
 })());
});

// ── Offline fallback 응답 생성 ────────────────────────────────
function createOfflineFallback(request) {
  if (request.mode === 'navigate' || request.destination === 'document') {
    return new Response(
      '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>오프라인</title></head><body><h1>오프라인 상태입니다.</h1><p>네트워크 연결 후 다시 시도해 주세요.</p></body></html>',
      {
        status: 503,
        statusText: 'offline_unavailable',
        headers: { 'content-type': 'text/html; charset=UTF-8' },
      }
    );
  }
  return new Response(null, { status: 204, statusText: 'offline_empty' });
}

// ── Fetch: 모든 요청 network-first, HTML은 network-only ───────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const pathname = requestUrl.pathname.toLowerCase();
  const isSameOrigin = requestUrl.origin === self.location.origin;

  // 크로스오리진: SW 인터셉트 금지 (CORS 오류 방지)
  if (!isSameOrigin) return;

  // /admin/*: 항상 네트워크 직접
  if (pathname.startsWith('/admin')) return;

  // /api/*: 캐시 없이 네트워크 직접
  if (pathname.startsWith('/api/')) return;

  // 크롤러 핵심 파일: 네트워크 직접
  if (
    pathname === '/ads.txt' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) return;

  // 광고/분석: 네트워크 직접
  if (
    event.request.url.includes('pagead') ||
    event.request.url.includes('google-analytics') ||
    event.request.url.includes('emailjs') ||
    event.request.url.includes('api.')
  ) return;

  // ★ HTML 문서 / navigation 요청: 절대 캐시 금지, network-only
  // index.html, SPA shell, 모든 .html 파일 포함
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    pathname === '/' ||
    pathname.endsWith('.html') ||
    pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        createOfflineFallback(event.request)
      )
    );
    return;
  }

  // ★ version.json, status.json, manifest.json: 항상 네트워크, 캐시 금지
  if (
    pathname === '/version.json' ||
    pathname === '/status.json' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest-neo.json'
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } })
      )
    );
    return;
  }

  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.mjs')
  ) {
    return;
  }

  // 이미지·폰트·기타 정적 assets: network-first, 실패 시 캐시 fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        // 이미지/폰트만 캐시 (HTML·JS·CSS는 위에서 이미 처리됨)
        const shouldCache =
          event.request.destination === 'image' ||
          event.request.destination === 'font';
        if (shouldCache) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return createOfflineFallback(event.request);
      })
  );
});
