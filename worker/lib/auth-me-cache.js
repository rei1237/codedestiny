// GET /api/auth/me 의 엣지 캐시.
//
// 왜 필요한가 (실측 2026-08-21, docs/context/ai-and-db.md "지리" 절):
//   이 요청 하나가 3.4초다. 그중 ~2.5초는 쿼리가 아니라 **Mongo 핸드셰이크**이고, 요청 컨텍스트가
//   끝나면 소켓이 못 쓰게 되는 Cloudflare 의 성질 때문에 **요청마다 새로 낸다**(8회 중 7회 실측).
//   워커는 LAX 에서 돌고 Atlas 는 서울에 있어 왕복 하나가 태평양을 두 번 건넌다. 같은 기법을
//   공개 API 에 썼을 때 3,474ms → 155ms(22배)였고, 진입 경로에서는 이 왕복이 곧 첫 화면 지연이다.
//
// 왜 별도 모듈인가: 이 로직은 **틀리면 남의 세션이 보이는** 종류라 mongoose 없이 단위 테스트로
//   못박을 수 있어야 한다. auth.js 안에 두면 라우트 전체를 세우지 않고는 못 짚는다.
//   (테스트: __tests__/worker/auth-me-edge-cache.test.js)
//
// 🔴 캐시 키는 **자격증명 표면 전체의 해시**다. 쿠키 이름을 손으로 고르지 말 것 —
//   새 인증 쿠키가 생겼을 때 키가 그대로면 그 순간 **다른 사용자의 응답이 재생된다.**
//   전체를 넣으면 최악이 캐시 미스뿐이고, 미스는 오늘과 같은 속도일 뿐이다.
//
// 🔴 캐시에 넣는 조건은 셋을 **모두** 만족할 때뿐이다:
//   ① status 200  ② Set-Cookie 없음  ③ 본문 authenticated === true
//   ②가 특히 중요하다. refresh 폴백 경로는 토큰을 회전시키며 쿠키를 굽는데, 그 응답을 캐시하면
//   **남의 요청에 남의 쿠키가 재생된다.** 401·degraded·게스트 응답은 캐시하지 않는다 —
//   그것들은 이미 DB 없이 빠르거나, 캐시하면 회복을 지연시킨다.
//
// 🔴 stale 폴백을 끈다(staleTtlSeconds === ttlSeconds). 공개 데이터는 낡아도 되지만 인증 상태는
//   아니다. DB 가 흔들리면 낡은 인증이 아니라 handleMe 의 기존 degraded 응답이 나가야 한다.
//
// 🔴 정합성 훅은 **이미 있는 강제 새로고침 헤더 하나**다. 셸(index.html 의 refreshHeader)과
//   React(app/_lib/auth-client.ts CACHE_REFRESH_HEADER)가 결제 확정·로그인 직후에 이 헤더를 붙여
//   보내므로, 여기서 캐시를 비우고 우회하면 "결제했는데 이용권이 안 붙는다"가 생기지 않는다.
//   🔴 이 분기를 지우지 말 것 — 지우면 최대 TTL 만큼 결제 결과가 안 보인다.

import { readCmsThroughCache, purgeCmsCache } from "./cms-cache.js";
import { json } from "./http.js";

export const ME_CACHE_TTL_SECONDS = 30;
export const ME_CACHE_REFRESH_HEADER = "x-code-destiny-cache-refresh";

const NOT_CACHEABLE = "AUTH_ME_NOT_CACHEABLE";

/**
 * 자격증명 표면(Authorization + Cookie 헤더 원문) 전체를 SHA-256 해시해 키로 쓴다.
 * 원문은 키에 넣지 않는다 — 캐시 키는 로그·진단에 새기 쉬운 자리다.
 */
export async function meCacheKey(request) {
  const material = `${request.headers.get("authorization") || ""}\n${request.headers.get("cookie") || ""}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `auth-me:v1:${hex}`;
}

/**
 * handler(=handleMe) 를 엣지 캐시로 감싼다. 캐시할 수 없는 응답은 **그대로 통과**시킨다.
 *
 * @param {Request} request
 * @param {any} env
 * @param {(request: Request, env: any) => Promise<Response>} handler
 */
export async function handleMeThroughEdgeCache(request, env, handler) {
  // 자격증명이 아예 없으면 handleMe 가 DB 없이 즉시 게스트로 답한다. 캐시할 이유가 없고,
  // 넣으면 모든 비로그인 요청이 같은 키 하나를 공유하게 된다.
  if (!request.headers.get("authorization") && !request.headers.get("cookie")) {
    return await handler(request, env);
  }

  const key = await meCacheKey(request);

  if (request.headers.get(ME_CACHE_REFRESH_HEADER) === "1") {
    await purgeCmsCache([key]);
    return await handler(request, env);
  }

  // load 가 돌았는지로 hit/miss 를 가른다. 캐시 못 하는 응답은 passthrough 로 실어 낸다.
  let passthrough = null;
  let loaded = false;

  try {
    const { value } = await readCmsThroughCache({
      key,
      ttlSeconds: ME_CACHE_TTL_SECONDS,
      staleTtlSeconds: ME_CACHE_TTL_SECONDS,
      load: async () => {
        loaded = true;
        const response = await handler(request, env);
        if (response.status !== 200 || response.headers.has("set-cookie")) {
          passthrough = response;
          throw new Error(NOT_CACHEABLE);
        }
        const body = await response.clone().json().catch(() => null);
        if (!body || body.authenticated !== true) {
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
