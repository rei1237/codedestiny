/**
 * @jest-environment node
 *
 * 자격증명 단위 엣지 캐시의 **동작** 계약 (GET /api/auth/me · GET /api/profile 공용).
 *
 * 정적 단언(scripts/verify-credential-cache.mjs)은 안전조건이 소스에 남아 있는지만 본다.
 * 여기서는 실제로 캐시를 태워서, 틀렸을 때 실제로 일어나는 일 — **남의 세션이 보이는 것**과
 * **남의 Set-Cookie 가 재생되는 것** — 이 일어나지 않음을 확인한다.
 */

let readThroughCredentialCache;
let purgeCredentialCache;
let CREDENTIAL_CACHE_REFRESH_HEADER;
let CREDENTIAL_CACHE_PREFIXES;

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

/** 호출 횟수를 세는 라우트 핸들러 대역. */
function countingHandler(build) {
  const calls = [];
  const handler = async (request) => {
    calls.push(request);
    return build(request, calls.length);
  };
  handler.calls = calls;
  return handler;
}

function req(path, headers = {}, method = "GET") {
  return new Request(`https://example.com${path}`, { method, headers });
}

function authedResponse(name, extraHeaders = {}) {
  return new Response(JSON.stringify({ ok: true, authenticated: true, user: { name } }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

/** /api/auth/me 형태로 캐시를 태운다. */
function throughMe(request, handler) {
  return readThroughCredentialCache({
    request,
    env: {},
    prefix: "auth-me:v1",
    handler,
    isCacheable: (body) => body.authenticated === true,
  });
}

/** /api/profile 목록 형태로 캐시를 태운다. */
function throughProfileList(request, handler) {
  return readThroughCredentialCache({
    request,
    env: {},
    prefix: "profile-list:v1",
    handler,
    isCacheable: (body) => body.ok === true && Array.isArray(body.profiles),
  });
}

beforeAll(async () => {
  const mod = await import("../../worker/lib/credential-scoped-cache.js");
  readThroughCredentialCache = mod.readThroughCredentialCache;
  purgeCredentialCache = mod.purgeCredentialCache;
  CREDENTIAL_CACHE_REFRESH_HEADER = mod.CREDENTIAL_CACHE_REFRESH_HEADER;
  CREDENTIAL_CACHE_PREFIXES = mod.CREDENTIAL_CACHE_PREFIXES;
});

beforeEach(() => {
  installFakeEdgeCache();
});

describe("자격증명 단위 엣지 캐시", () => {
  test("같은 자격증명은 두 번째부터 DB 를 타지 않는다", async () => {
    const handler = countingHandler(() => authedResponse("네오"));
    const headers = { Cookie: "fortune_access_token=tok-same-credential-1" };

    const first = await throughMe(req("/api/auth/me", headers), handler);
    const second = await throughMe(req("/api/auth/me", headers), handler);

    expect(handler.calls).toHaveLength(1);
    expect(first.headers.get("X-CD-Cache")).toBe("miss");
    expect(second.headers.get("X-CD-Cache")).toBe("hit");
    expect((await second.json()).user.name).toBe("네오");
  });

  test("🔴 자격증명이 다르면 절대 서로의 응답을 받지 않는다", async () => {
    const handler = countingHandler((request) =>
      authedResponse((request.headers.get("cookie") || "").includes("aaa") ? "사용자A" : "사용자B"));

    const a = await throughMe(req("/api/auth/me", { Cookie: "fortune_access_token=aaa-cross-user" }), handler);
    const b = await throughMe(req("/api/auth/me", { Cookie: "fortune_access_token=bbb-cross-user" }), handler);

    expect(handler.calls).toHaveLength(2);
    expect((await a.json()).user.name).toBe("사용자A");
    expect((await b.json()).user.name).toBe("사용자B");
  });

  test("🔴 Authorization 만 다른 경우도 키가 갈린다", async () => {
    const handler = countingHandler((request) =>
      authedResponse((request.headers.get("authorization") || "").endsWith("-one") ? "토큰1" : "토큰2"));
    const cookie = "fortune_access_token=shared-cookie-value";

    const one = await throughMe(req("/api/auth/me", { Cookie: cookie, Authorization: "Bearer t-one" }), handler);
    const two = await throughMe(req("/api/auth/me", { Cookie: cookie, Authorization: "Bearer t-two" }), handler);

    expect(handler.calls).toHaveLength(2);
    expect((await one.json()).user.name).toBe("토큰1");
    expect((await two.json()).user.name).toBe("토큰2");
  });

  test("🔴 접두사가 다르면 같은 자격증명이라도 키가 갈린다", async () => {
    const meHandler = countingHandler(() => authedResponse("me-응답"));
    const listHandler = countingHandler(() =>
      new Response(JSON.stringify({ ok: true, profiles: [{ id: "p1" }] }), { status: 200 }));
    const headers = { Cookie: "fortune_access_token=tok-two-prefixes" };

    const me = await throughMe(req("/api/auth/me", headers), meHandler);
    const list = await throughProfileList(req("/api/profile", headers), listHandler);

    expect((await me.json()).user.name).toBe("me-응답");
    expect((await list.json()).profiles).toHaveLength(1);
  });

  test("🔴 Set-Cookie 가 붙은 응답은 캐시하지 않는다(refresh 회전이 재생되면 안 된다)", async () => {
    const handler = countingHandler((_request, n) =>
      authedResponse(`회전${n}`, { "Set-Cookie": `fortune_refresh_token=rotated-${n}; Path=/` }));
    const headers = { Cookie: "fortune_access_token=tok-rotating-session" };

    const first = await throughMe(req("/api/auth/me", headers), handler);
    const second = await throughMe(req("/api/auth/me", headers), handler);

    expect(handler.calls).toHaveLength(2);
    expect(first.headers.get("set-cookie")).toContain("rotated-1");
    expect(second.headers.get("set-cookie")).toContain("rotated-2");
  });

  test("401 과 게스트 200 은 캐시하지 않고 원본 그대로 통과한다", async () => {
    const unauthorized = countingHandler(() =>
      new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED" }), { status: 401 }));
    const guest = countingHandler(() =>
      new Response(JSON.stringify({ ok: true, authenticated: false, user: null }), { status: 200 }));

    const a1 = await throughMe(req("/api/auth/me", { Cookie: "c=expired-token-x" }), unauthorized);
    await throughMe(req("/api/auth/me", { Cookie: "c=expired-token-x" }), unauthorized);
    const b1 = await throughMe(req("/api/auth/me", { Cookie: "c=guest-token-y" }), guest);
    await throughMe(req("/api/auth/me", { Cookie: "c=guest-token-y" }), guest);

    expect(unauthorized.calls).toHaveLength(2);
    expect(guest.calls).toHaveLength(2);
    expect(a1.status).toBe(401);
    expect((await b1.json()).authenticated).toBe(false);
  });

  test("🔴 프로필 목록의 degraded(ok:false) 응답은 굳지 않는다", async () => {
    const handler = countingHandler((_request, n) => (n === 1
      ? new Response(JSON.stringify({ ok: false, degraded: true }), { status: 200 })
      : new Response(JSON.stringify({ ok: true, profiles: [{ id: "회복" }] }), { status: 200 })));
    const headers = { Cookie: "fortune_access_token=tok-degraded-list" };

    await throughProfileList(req("/api/profile", headers), handler);
    const recovered = await throughProfileList(req("/api/profile", headers), handler);

    expect(handler.calls).toHaveLength(2);
    expect((await recovered.json()).profiles[0].id).toBe("회복");
  });

  test("🔴 강제 새로고침 헤더는 **모든 접두사**를 비우고 우회한다(결제 직후 정합성)", async () => {
    const meHandler = countingHandler((_r, n) => authedResponse(n === 1 ? "결제전" : "결제후"));
    const listHandler = countingHandler((_r, n) =>
      new Response(JSON.stringify({ ok: true, profiles: [{ id: n === 1 ? "한도전" : "한도후" }] }), { status: 200 }));
    const headers = { Cookie: "fortune_access_token=tok-after-payment" };

    // 두 캐시를 모두 채운다.
    await throughMe(req("/api/auth/me", headers), meHandler);
    await throughProfileList(req("/api/profile", headers), listHandler);

    // 결제 직후 클라이언트는 /api/auth/me 만 강제로 다시 부른다.
    await throughMe(req("/api/auth/me", { ...headers, [CREDENTIAL_CACHE_REFRESH_HEADER]: "1" }), meHandler);

    // 그런데도 프로필 목록까지 새로 읽혀야 한다 — 구독 상태가 같이 바뀌기 때문이다.
    const list = await throughProfileList(req("/api/profile", headers), listHandler);
    expect((await list.json()).profiles[0].id).toBe("한도후");
    expect(listHandler.calls).toHaveLength(2);
  });

  test("🔴 쓰기 뒤 purge 는 같은 자격증명의 목록 캐시를 지운다", async () => {
    const handler = countingHandler((_r, n) =>
      new Response(JSON.stringify({ ok: true, profiles: n === 1 ? [{ id: "카드1" }] : [{ id: "카드1" }, { id: "카드2" }] }), { status: 200 }));
    const headers = { Cookie: "fortune_access_token=tok-after-write" };

    const before = await throughProfileList(req("/api/profile", headers), handler);
    expect((await before.json()).profiles).toHaveLength(1);

    await purgeCredentialCache(req("/api/profile", headers, "POST"), ["profile-list:v1"]);

    const after = await throughProfileList(req("/api/profile", headers), handler);
    expect((await after.json()).profiles).toHaveLength(2);
  });

  test("자격증명이 아예 없으면 캐시 경로를 타지 않는다", async () => {
    const handler = countingHandler(() =>
      new Response(JSON.stringify({ ok: true, authenticated: false, user: null }), { status: 200 }));

    const response = await throughMe(req("/api/auth/me"), handler);
    await throughMe(req("/api/auth/me"), handler);

    expect(handler.calls).toHaveLength(2);
    expect(response.headers.get("X-CD-Cache")).toBeNull();
  });

  test("handler 가 던지면 캐시가 삼키지 않고 그대로 전파한다", async () => {
    const handler = countingHandler(() => { throw new Error("MONGO_DOWN"); });
    await expect(
      throughMe(req("/api/auth/me", { Cookie: "c=throwing-path-z" }), handler),
    ).rejects.toThrow(/MONGO_DOWN/);
  });

  test("접두사 레지스트리는 두 라우트를 모두 담고 있다", () => {
    expect(CREDENTIAL_CACHE_PREFIXES).toContain("auth-me:v1");
    expect(CREDENTIAL_CACHE_PREFIXES).toContain("profile-list:v1");
  });
});
