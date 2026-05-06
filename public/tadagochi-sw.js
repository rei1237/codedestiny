/**
 * Fortune Tama Service Worker — 캐시 무효화 버전
 *
 * 이 Service Worker는 더 이상 어떤 리소스도 캐시하지 않습니다.
 * HTML 문서 고착(구버전 페이지 표시) 문제를 완전히 방지하기 위해
 * 모든 요청을 네트워크에서 직접 받습니다.
 *
 * - HTML: 항상 network-only (캐시 금지)
 * - 아이콘/매니페스트: network-first, 실패 시에만 캐시 fallback
 * - 기타: 네트워크 우선
 */

const CACHE_NAME = 'fortune-tama-v4-nocache';

// Install: 기존 캐시 전부 삭제 후 즉시 활성화
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.skipWaiting())
  );
});

// Activate: 잔여 캐시 삭제 후 즉시 클라이언트 제어권 획득
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: 모든 요청을 네트워크에서 직접 처리 (캐시 저장 없음)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 크로스오리진 요청은 SW가 인터셉트하지 않음
  if (url.origin !== self.location.origin) return;

  // HTML 문서, SPA navigation — 항상 network-only (절대 캐시 금지)
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return new Response(
          '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>오프라인</title></head><body><h1>오프라인 상태입니다.</h1><p>네트워크 연결 후 다시 시도해 주세요.</p></body></html>',
          { status: 503, headers: { 'content-type': 'text/html; charset=UTF-8' } }
        );
      })
    );
    return;
  }

  // 그 외 모든 요청: 네트워크 우선, 실패 시 204 반환 (캐시 저장 없음)
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(null, { status: 204, statusText: 'offline_empty' });
    })
  );
});
