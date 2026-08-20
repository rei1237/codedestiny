/**
 * @jest-environment node
 *
 * GET /api/auth/me 엣지 캐시의 **동작** 계약.
 *
 * 정적 단언(scripts/verify-auth-p0p1-regression.mjs)은 안전조건이 소스에 남아 있는지만 본다.
 * 여기서는 실제로 캐시를 태워서, 틀렸을 때 실제로 일어나는 일 — **남의 세션이 보이는 것**과
 * **남의 Set-Cookie 가 재생되는 것** — 이 일어나지 않음을 확인한다.
 */

let handleMeThroughEdgeCache;
let ME_CACHE_REFRESH_HEADER;

/** caches.default 대역. 본문은 한 번만 읽히므로 텍스트로 보관하고 match 마다 새 Response 를 만든다. */
function installFakeEdgeCache() {
  const store = new Map();
  globalThis.caches = {
    default: {
      async match(request) {
        const hit = store.get(request.url);
        if (!hit) return null;
        return new Response(hit.body, { headers: hit.headers });
      },
      async put(request, response) {
        store.set(request.url, {
          body: await response.text(),
          headers: Object.fromEntries(response.headers.entries()),
        });
      },
      async delete(request) {
        return store.delete(request.url);
      },
    },
  };
  return store;
}

/** 호출 횟수를 세는 handleMe 대역. */
function countingHandler(build) {
  const calls = [];
  const handler = async (request) => {
    calls.push(request);
    return build(request, calls.length);
  };
  handler.calls = calls;
  return handler;
}

function meRequest(headers = {}) {
  return new Request("https://example.com/api/auth/me", { method: "GET", headers });
}

function authedResponse(name, init = {}) {
  return new Response(JSON.stringify({ ok: true, authenticated: true, user: { name } }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init.headers || {}) },
    ...(init.status ? { status: init.status } : {}),
  });
}

beforeAll(async () => {
  const mod = await import("../../worker/lib/auth-me-cache.js");
  handleMeThroughEdgeCache = mod.handleMeThroughEdgeCache;
  ME_CACHE_REFRESH_HEADER = mod.ME_CACHE_REFRESH_HEADER;
});

beforeEach(() => {
  installFakeEdgeCache();
});

describe("auth/me 엣지 캐시", () => {
  test("같은 자격증명은 두 번째부터 DB 를 타지 않는다", async () => {
    const handler = countingHandler(() => authedResponse("네오"));
    const headers = { Cookie: "fortune_access_token=tok-same-credential-1" };

    const first = await handleMeThroughEdgeCache(meRequest(headers), {}, handler);
    const second = await handleMeThroughEdgeCache(meRequest(headers), {}, handler);

    expect(handler.calls).toHaveLength(1);
    expect(first.headers.get("X-CD-Cache")).toBe("miss");
    expect(second.headers.get("X-CD-Cache")).toBe("hit");
    expect((await second.json()).user.name).toBe("네오");
  });

  test("🔴 자격증명이 다르면 절대 서로의 응답을 받지 않는다", async () => {
    const handler = countingHandler((request) => {
      const cookie = request.headers.get("cookie") || "";
      return authedResponse(cookie.includes("aaa") ? "사용자A" : "사용자B");
    });

    const a = await handleMeThroughEdgeCache(meRequest({ Cookie: "fortune_access_token=aaa-cross-user" }), {}, handler);
    const b = await handleMeThroughEdgeCache(meRequest({ Cookie: "fortune_access_token=bbb-cross-user" }), {}, handler);

    expect(handler.calls).toHaveLength(2);
    expect((await a.json()).user.name).toBe("사용자A");
    expect((await b.json()).user.name).toBe("사용자B");
  });

  test("🔴 Authorization 만 다른 경우도 키가 갈린다", async () => {
    const handler = countingHandler((request) => {
      const auth = request.headers.get("authorization") || "";
      return authedResponse(auth.endsWith("-one") ? "토큰1" : "토큰2");
    });
    const cookie = "fortune_access_token=shared-cookie-value";

    const one = await handleMeThroughEdgeCache(meRequest({ Cookie: cookie, Authorization: "Bearer t-one" }), {}, handler);
    const two = await handleMeThroughEdgeCache(meRequest({ Cookie: cookie, Authorization: "Bearer t-two" }), {}, handler);

    expect(handler.calls).toHaveLength(2);
    expect((await one.json()).user.name).toBe("토큰1");
    expect((await two.json()).user.name).toBe("토큰2");
  });

  test("🔴 Set-Cookie 가 붙은 응답은 캐시하지 않는다(refresh 회전이 재생되면 안 된다)", async () => {
    const handler = countingHandler((_request, n) =>
      authedResponse(`회전${n}`, { headers: { "Set-Cookie": `fortune_refresh_token=rotated-${n}; Path=/` } }));
    const headers = { Cookie: "fortune_access_token=tok-rotating-session" };

    const first = await handleMeThroughEdgeCache(meRequest(headers), {}, handler);
    const second = await handleMeThroughEdgeCache(meRequest(headers), {}, handler);

    expect(handler.calls).toHaveLength(2);
    expect(first.headers.get("set-cookie")).toContain("rotated-1");
    expect(second.headers.get("set-cookie")).toContain("rotated-2");
  });

  test("401 과 게스트 200 은 캐시하지 않고 원본 그대로 통과한다", async () => {
    const unauthorized = countingHandler(() =>
      new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED" }), { status: 401 }));
    const guest = countingHandler(() =>
      new Response(JSON.stringify({ ok: true, authenticated: false, user: null }), { status: 200 }));

    const a1 = await handleMeThroughEdgeCache(meRequest({ Cookie: "c=expired-token-x" }), {}, unauthorized);
    await handleMeThroughEdgeCache(meRequest({ Cookie: "c=expired-token-x" }), {}, unauthorized);
    const b1 = await handleMeThroughEdgeCache(meRequest({ Cookie: "c=guest-token-y" }), {}, guest);
    await handleMeThroughEdgeCache(meRequest({ Cookie: "c=guest-token-y" }), {}, guest);

    expect(unauthorized.calls).toHaveLength(2);
    expect(guest.calls).toHaveLength(2);
    expect(a1.status).toBe(401);
    expect((await b1.json()).authenticated).toBe(false);
  });

  test("🔴 강제 새로고침 헤더는 캐시를 비우고 우회한다(결제 직후 정합성)", async () => {
    const handler = countingHandler((_request, n) => authedResponse(n === 1 ? "결제전" : "결제후"));
    const headers = { Cookie: "fortune_access_token=tok-after-payment" };

    await handleMeThroughEdgeCache(meRequest(headers), {}, handler);
    const forced = await handleMeThroughEdgeCache(
      meRequest({ ...headers, [ME_CACHE_REFRESH_HEADER]: "1" }), {}, handler);
    const afterForced = await handleMeThroughEdgeCache(meRequest(headers), {}, handler);

    expect((await forced.json()).user.name).toBe("결제후");
    // 강제 새로고침이 캐시를 지웠으므로 그 다음 일반 요청도 옛 값을 받지 않는다.
    expect(handler.calls).toHaveLength(3);
    expect((await afterForced.json()).user.name).toBe("결제후");
  });

  test("자격증명이 아예 없으면 캐시 경로를 타지 않는다", async () => {
    const handler = countingHandler(() =>
      new Response(JSON.stringify({ ok: true, authenticated: false, user: null }), { status: 200 }));

    const response = await handleMeThroughEdgeCache(meRequest(), {}, handler);
    await handleMeThroughEdgeCache(meRequest(), {}, handler);

    expect(handler.calls).toHaveLength(2);
    expect(response.headers.get("X-CD-Cache")).toBeNull();
  });

  test("handler 가 던지면 캐시가 삼키지 않고 그대로 전파한다", async () => {
    const handler = countingHandler(() => { throw new Error("MONGO_DOWN"); });
    await expect(
      handleMeThroughEdgeCache(meRequest({ Cookie: "c=throwing-path-z" }), {}, handler),
    ).rejects.toThrow(/MONGO_DOWN/);
  });
});
