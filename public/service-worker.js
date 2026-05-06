/* Service Worker — code-destiny
   v2: 완전 network-first, HTML 캐싱 전면 금지
   캐시 이름에 타임스탬프 포함 → 배포 시 자동 캐시 무효화
*/

const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_PREFIX = 'kkul-mansaeryeok-';
const CACHE_NAME = `${CACHE_PREFIX}${SW_VERSION}`;

// ── Install: 즉시 활성화 (waiting 없음) ─────────────────────────
self.addEventListener('install', (event) => {
  // precache 없음: 구버전 캐시 고착 방지
  self.skipWaiting();
});

// ── Activate: 이전 버전 캐시 전부 삭제 ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

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

// ── Message: SKIP_WAITING 지원 ────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event || !event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    event.waitUntil(
      Promise.resolve(self.skipWaiting()).then(() => self.clients.claim())
    );
  }
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
    pathname === '/manifest-samba.json' ||
    pathname === '/manifest-tadagochi.json'
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } })
      )
    );
    return;
  }

  // ★ JS/CSS 파일: no-store로 fetch (해시 없는 파일 구버전 방지)
  // _next/static/chunks/*.js 같은 해시 파일도 no-store → 브라우저 자체 캐시에 맡김
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.mjs')
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || createOfflineFallback(event.request);
      })
    );
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
