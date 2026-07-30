// CMS 읽기 전용 캐시 계층.
//
// 목적은 두 가지다.
//   ① Mongo 왕복을 줄여 관리자 목록/공개 번들이 즉시 뜨게 한다.
//   ② Atlas 가 잠깐 흔들릴 때 503 으로 화면을 죽이는 대신, 마지막으로 성공한 응답을 그대로 돌려준다.
//      (기존 /api/admin/site-content/overrides 가 캐시도 stale 폴백도 없어 DB 블립마다 화면이 통째로
//       비었던 것이 이 모듈의 존재 이유다.)
//
// 🔴 재시도는 여기서 하지 않는다. 호출부가 이미 withMongoRetry 로 감싸고 있고, 재시도를 두 겹으로
//    걸면 효과는 그대로면서 시도·재연결 횟수만 배가된다(CLAUDE.md 코딩 원칙 6).
//    이 모듈은 "재시도까지 끝난 결과"를 캐시하고, 그게 실패했을 때만 stale 을 꺼낸다.

const CACHE_ORIGIN = "https://cms-cache.code-destiny.internal";
const STORED_AT_HEADER = "x-cms-cached-at";
const MEMO_MAX_ENTRIES = 64;

/** 아이솔레이트 수명 동안만 사는 1차 캐시. Cache API 왕복조차 아끼는 용도. */
const memo = new Map();

function nowMs() {
  return Date.now();
}

function cacheRequestFor(key) {
  return new Request(`${CACHE_ORIGIN}/${encodeURIComponent(String(key || ""))}`, { method: "GET" });
}

function rememberInMemo(key, value, storedAt) {
  if (memo.has(key)) memo.delete(key);
  memo.set(key, { value, storedAt });
  while (memo.size > MEMO_MAX_ENTRIES) {
    const oldestKey = memo.keys().next().value;
    if (oldestKey === undefined) break;
    memo.delete(oldestKey);
  }
}

function readMemo(key, maxAgeMs) {
  const hit = memo.get(key);
  if (!hit) return null;
  // 경계는 >= 로 본다. > 로 두면 ttlSeconds: 0(항상 갱신)이 같은 밀리초 안에서 신선하다고 판정된다.
  if (nowMs() - hit.storedAt >= maxAgeMs) return null;
  return hit;
}

async function readEdgeCache(key, maxAgeMs) {
  if (typeof caches === "undefined" || !caches?.default) return null;

  try {
    const response = await caches.default.match(cacheRequestFor(key));
    if (!response) return null;

    const storedAt = Number(response.headers.get(STORED_AT_HEADER) || 0);
    if (!Number.isFinite(storedAt) || storedAt <= 0) return null;
    if (nowMs() - storedAt >= maxAgeMs) return null;

    const value = await response.json();
    return { value, storedAt };
  } catch (e) {
    return null;
  }
}

async function writeEdgeCache(key, value, storedAt, ttlSeconds) {
  if (typeof caches === "undefined" || !caches?.default) return;

  try {
    const body = JSON.stringify(value);
    await caches.default.put(cacheRequestFor(key), new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Cache API 자체 만료는 stale 폴백 여유분까지 살려둔다. 신선도 판정은 storedAt 으로 한다.
        "cache-control": `public, max-age=${Math.max(60, Math.floor(ttlSeconds))}`,
        [STORED_AT_HEADER]: String(storedAt),
      },
    }));
  } catch (e) {
    // 캐시 쓰기 실패는 조회 결과에 영향을 주지 않는다.
  }
}

/**
 * load() 결과를 캐시하고, load() 가 실패하면 만료된 캐시라도 꺼내 돌려준다.
 *
 * @returns {Promise<{ value: any, stale: boolean, cachedAt: number|null }>}
 * @throws load() 가 실패했고 쓸 수 있는 stale 값도 없을 때만 원래 에러를 그대로 던진다.
 */
export async function readCmsThroughCache({ key, ttlSeconds = 30, staleTtlSeconds = 900, load }) {
  const cacheKey = String(key || "");
  const freshMaxAgeMs = Math.max(0, ttlSeconds) * 1000;
  const staleMaxAgeMs = Math.max(freshMaxAgeMs, staleTtlSeconds * 1000);

  const memoFresh = readMemo(cacheKey, freshMaxAgeMs);
  if (memoFresh) return { value: memoFresh.value, stale: false, cachedAt: memoFresh.storedAt };

  const edgeFresh = await readEdgeCache(cacheKey, freshMaxAgeMs);
  if (edgeFresh) {
    rememberInMemo(cacheKey, edgeFresh.value, edgeFresh.storedAt);
    return { value: edgeFresh.value, stale: false, cachedAt: edgeFresh.storedAt };
  }

  try {
    const value = await load();
    const storedAt = nowMs();
    rememberInMemo(cacheKey, value, storedAt);
    await writeEdgeCache(cacheKey, value, storedAt, Math.max(ttlSeconds, staleTtlSeconds));
    return { value, stale: false, cachedAt: storedAt };
  } catch (error) {
    const memoStale = readMemo(cacheKey, staleMaxAgeMs);
    if (memoStale) return { value: memoStale.value, stale: true, cachedAt: memoStale.storedAt };

    const edgeStale = await readEdgeCache(cacheKey, staleMaxAgeMs);
    if (edgeStale) {
      rememberInMemo(cacheKey, edgeStale.value, edgeStale.storedAt);
      return { value: edgeStale.value, stale: true, cachedAt: edgeStale.storedAt };
    }

    throw error;
  }
}

/** 발행 직후 호출해 해당 키를 즉시 무효화한다. 접두사만 주면 아이솔레이트 메모는 접두사 일치로 지운다. */
export async function purgeCmsCache(keys = []) {
  const list = Array.isArray(keys) ? keys : [keys];

  for (const rawKey of list) {
    const key = String(rawKey || "");
    if (!key) continue;

    for (const memoKey of Array.from(memo.keys())) {
      if (memoKey === key || memoKey.startsWith(`${key}:`)) memo.delete(memoKey);
    }

    if (typeof caches === "undefined" || !caches?.default) continue;
    try {
      await caches.default.delete(cacheRequestFor(key));
    } catch (e) {
      // 삭제 실패는 TTL 만료로 자연 해소된다.
    }
  }
}
