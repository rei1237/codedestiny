// 자격증명 단위 엣지 캐시. 지금 두 곳이 쓴다 — GET /api/auth/me, GET /api/profile.
//
// 왜 필요한가 (실측 2026-08-21, docs/context/ai-and-db.md "지리" 절):
//   이 두 요청이 각각 3.4초다. 그중 ~2.5초는 쿼리가 아니라 **Mongo 핸드셰이크**이고, 요청 컨텍스트가
//   끝나면 소켓이 못 쓰게 되는 Cloudflare 의 성질 때문에 **요청마다 새로 낸다**(8회 중 7회 실측).
//   워커는 LAX 에서 돌고 Atlas 는 서울에 있어 왕복 하나가 태평양을 두 번 건넌다. 같은 기법을
//   공개 API 에 썼을 때 3,474ms → 155ms(22배)였다. 둘 다 진입 경로라 곧 첫 화면 지연이다.
//
// 왜 공용 모듈인가: 두 라우트가 **같은 안전조건**을 필요로 한다. 각자 복사해 두면 나중에 한쪽이
//   조건 하나를 잃는다 — 그리고 그 조건들은 잃었을 때 **남의 세션이 보이는** 종류다.
//   mongoose 없이 단위 테스트로 못박을 수 있도록 라우트 밖에 둔다.
//   (테스트: __tests__/worker/credential-scoped-cache.test.js)
//
// 🔴 캐시 키는 **자격증명 표면 전체의 해시**다. 쿠키 이름을 손으로 고르지 말 것 —
//   새 인증 쿠키가 생겼을 때 키가 그대로면 그 순간 **다른 사용자의 응답이 재생된다.**
//   전체를 넣으면 최악이 캐시 미스뿐이고, 미스는 오늘과 같은 속도일 뿐이다.
//
// 🔴 캐시에 넣는 조건은 셋을 **모두** 만족할 때뿐이다:
//   ① status 200  ② Set-Cookie 없음  ③ isCacheable(body) 가 true
//   ②가 특히 중요하다. refresh 폴백 경로는 토큰을 회전시키며 쿠키를 굽는데, 그 응답을 캐시하면
//   **남의 요청에 남의 쿠키가 재생된다.** 401·degraded 응답도 캐시하지 않는다 —
//   그것들은 이미 DB 없이 빠르거나, 캐시하면 회복을 지연시킨다.
//
// 🔴 stale 폴백을 끈다(staleTtlSeconds === ttlSeconds). 공개 데이터는 낡아도 되지만 인증 상태는
//   아니다. DB 가 흔들리면 낡은 응답이 아니라 각 라우트의 기존 degraded 응답이 나가야 한다.
//
// 🔴 정합성 훅은 **이미 있는 강제 새로고침 헤더 하나**다. 셸(index.html 의 refreshHeader)과
//   React(app/_lib/auth-client.ts CACHE_REFRESH_HEADER)가 결제 확정·로그인 직후에 이 헤더를 붙여
//   보내므로, 여기서 캐시를 비우고 우회하면 "결제했는데 이용권이 안 붙는다"가 생기지 않는다.
//   🔴 이 분기를 지우지 말 것 — 지우면 최대 TTL 만큼 결제 결과가 안 보인다.
//   쓰기(프로필 카드 추가·삭제 등)는 그것과 별개로 purgeCredentialCache 로 자기 키를 지운다.

import { readCmsThroughCache, purgeCmsCache } from "./cms-cache.js";
import { json } from "./http.js";

export const CREDENTIAL_CACHE_TTL_SECONDS = 30;
export const CREDENTIAL_CACHE_REFRESH_HEADER = "x-code-destiny-cache-refresh";

/* 🔴 이 캐시를 쓰는 모든 키 접두사. 강제 새로고침이 오면 **전부** 지운다.
   그 헤더의 뜻은 "내 화면이 낡았다"이지 "이 엔드포인트만 낡았다"가 아니다. 결제 확정 직후
   클라이언트는 /api/auth/me 만 강제로 다시 부르는데, 같은 자격증명의 /api/profile 이 옛 구독
   상태를 들고 있으면 프로필 한도·카드 생성 가능 여부가 최대 TTL 만큼 어긋난다.
   🔴 새 접두사를 라우트에 쓰면 여기에도 넣어야 한다 — scripts/verify-credential-cache.mjs 가
   소스에서 전수로 찾아 미등록 접두사를 실패시킨다(손으로 쓴 목록이 가드가 되지 않도록). */
export const CREDENTIAL_CACHE_PREFIXES = Object.freeze(["auth-me:v1", "profile-list:v1"]);

const NOT_CACHEABLE = "CREDENTIAL_CACHE_NOT_CACHEABLE";

/** 자격증명이 아예 없는 요청. 캐시에 넣으면 모든 비로그인 요청이 키 하나를 공유하게 된다. */
function hasCredentials(request) {
  return Boolean(request.headers.get("authorization") || request.headers.get("cookie"));
}

/**
 * 자격증명 표면(Authorization + Cookie 헤더 원문) 전체를 SHA-256 해시해 키로 쓴다.
 * 원문은 키에 넣지 않는다 — 캐시 키는 로그·진단에 새기 쉬운 자리다.
 */
export async function credentialCacheKey(request, prefix) {
  const material = `${request.headers.get("authorization") || ""}\n${request.headers.get("cookie") || ""}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}:${hex}`;
}

/** 쓰기 직후에 자기 자격증명의 키를 지운다. 쓰기 요청이 같은 쿠키를 들고 오므로 키가 일치한다. */
export async function purgeCredentialCache(request, prefixes = []) {
  if (!hasCredentials(request)) return;
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  for (const prefix of list) {
    if (!prefix) continue;
    await purgeCmsCache([await credentialCacheKey(request, prefix)]);
  }
}

/**
 * handler 를 자격증명 단위 엣지 캐시로 감싼다. 캐시할 수 없는 응답은 **그대로 통과**시킨다.
 *
 * @param {object} options
 * @param {Request} options.request
 * @param {any} options.env
 * @param {string} options.prefix           캐시 키 접두사(라우트마다 다르게)
 * @param {() => Promise<Response>} options.handler
 * @param {(body: any) => boolean} options.isCacheable  본문 기준 캐시 가능 판정
 */
export async function readThroughCredentialCache({ request, env, prefix, handler, isCacheable }) {
  if (!hasCredentials(request)) return await handler(request, env);

  const key = await credentialCacheKey(request, prefix);

  if (request.headers.get(CREDENTIAL_CACHE_REFRESH_HEADER) === "1") {
    // 자기 키만이 아니라 이 자격증명의 **모든** 접두사를 지운다(위 CREDENTIAL_CACHE_PREFIXES 주석).
    await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
    return await handler(request, env);
  }

  // load 가 돌았는지로 hit/miss 를 가른다. 캐시 못 하는 응답은 passthrough 로 실어 낸다.
  let passthrough = null;
  let loaded = false;

  try {
    const { value } = await readCmsThroughCache({
      key,
      ttlSeconds: CREDENTIAL_CACHE_TTL_SECONDS,
      staleTtlSeconds: CREDENTIAL_CACHE_TTL_SECONDS,
      load: async () => {
        loaded = true;
        const response = await handler(request, env);
        if (response.status !== 200 || response.headers.has("set-cookie")) {
          passthrough = response;
          throw new Error(NOT_CACHEABLE);
        }
        const body = await response.clone().json().catch(() => null);
        if (!body || isCacheable(body) !== true) {
          passthrough = response;
          throw new Error(NOT_CACHEABLE);
        }
        return body;
      },
    });
    return json(value, { headers: { "X-CD-Cache": loaded ? "miss" : "hit" } });
  } catch (error) {
    if (passthrough) return passthrough;
    throw error;
  }
}
