/**
 * Fortune Tama Service Worker
 * - HTML/navigation: network-first with cache fallback
 * - Static assets: cache-first with versioned cache
 * - Activate: delete old cache versions
 */

const CACHE_PREFIX = 'fortune-tama';
const CACHE_VERSION = 'v5-20260511';
const HTML_CACHE = `${CACHE_PREFIX}-html-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const OFFLINE_HTML =
  '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오프라인</title></head><body><h1>오프라인 상태입니다.</h1><p>네트워크 연결 후 다시 시도해 주세요.</p></body></html>';

const PRECACHE_STATIC = [
  '/tadagochi.html',
  '/manifest-tadagochi.json',
  '/icons/fortune-tama-180.png',
  '/icons/fortune-tama-96.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(`${CACHE_PREFIX}-`) &&
                key !== HTML_CACHE &&
                key !== STATIC_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'content-type': 'text/html; charset=UTF-8' }
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const destination = event.request.destination;
  const isDocument =
    event.request.mode === 'navigate' ||
    destination === 'document' ||
    url.pathname.endsWith('.html');

  if (isDocument) {
    event.respondWith(networkFirst(event.request, HTML_CACHE));
    return;
  }

  const isStaticAsset =
    destination === 'image' ||
    destination === 'style' ||
    destination === 'script' ||
    destination === 'font' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fuctionassets/');

  if (isStaticAsset) {
    event.respondWith(
      cacheFirst(event.request, STATIC_CACHE).catch(() =>
        fetch(event.request)
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || new Response(null, { status: 204, statusText: 'offline_empty' });
    })
  );
});
