/**
 * sw-egg.js — 운명의 알 다마고치 전용 Service Worker
 * 앱처럼 오프라인 캐싱 + 빠른 로딩 지원
 */
const CACHE_NAME = 'destiny-egg-v1';
const ASSETS_TO_CACHE = [
  '/destiny-egg',
  '/manifest-egg.json',
  '/fuctionassets/UNSETAMA2.webp',
  '/fuctionassets/unsetama.webp',
  '/icons/honeypig-192.png',
  '/icons/honeypig-512.png',
];

// 설치: 핵심 에셋 프리캐시
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // 일부 에셋 실패해도 설치 진행
      });
    })
  );
});

// 활성화: 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first (에셋) / Network-first (API/HTML)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청은 네트워크 우선
  if (url.pathname.startsWith('/api/')) return;

  // fuctionassets + 이미지는 캐시 우선
  if (
    url.pathname.startsWith('/fuctionassets/') ||
    url.pathname.startsWith('/icons/') ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // destiny-egg 페이지: network-first, 실패 시 캐시
  if (url.pathname === '/destiny-egg' || url.pathname === '/destiny-egg/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
