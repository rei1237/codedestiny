/**
 * iOS 앱 인증 브리지(2026-11-20, iOS Phase 5) 계약.
 *   ① iOS 의 구글·네이버·카카오는 Browser(SFSafariViewController)가 아니라 ASWebAuthenticationSession
 *      (CodeDestinyAuth.startOAuth)으로 연다. 안드로이드는 종전대로 Browser.open 이다.
 *   ② 사용자가 시트를 닫으면(AUTH_CANCELLED) 오류 안내를 띄우지 않는다.
 *   ③ Apple 은 iOS 에서 네이티브 시트 → /api/auth/oauth/apple/native → 기존 /oauth/complete 교환이다.
 *   ④ 오류 분류: 401 만 "다시 로그인" 문구, 503·네트워크는 "잠시 후 다시" 문구.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const bridgeSource = fs.readFileSync(path.join(root, "scripts/app-native-bridge.js"), "utf8");

function runBridge({ platform, auth, browser, fetchImpl }) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    // capacitor:// 는 jsdom 에서 불투명 출처라 localStorage 가 막힌다. 출처 판정은 이 테스트의 대상이 아니다.
    url: "https://localhost/login/",
    runScripts: "outside-only",
  });
  const calls = [];
  dom.window.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
    if (!fetchImpl) throw new Error("network forbidden");
    return fetchImpl(String(url), init);
  };
  dom.window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => platform,
    Plugins: { ...(auth ? { CodeDestinyAuth: auth } : {}), ...(browser ? { Browser: browser } : {}) },
  };
  dom.window.eval(bridgeSource);
  return { dom, calls };
}

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const toastText = (dom) => String(dom.window.document.getElementById("cdAppToast")?.textContent || "");

test("iOS 소셜 로그인은 ASWebAuthenticationSession 으로, 안드로이드는 Browser 로 연다", async () => {
  const started = [];
  const opened = [];
  const ios = runBridge({
    platform: "ios",
    auth: { startOAuth: async (input) => { started.push(input.url); return { completed: true }; } },
    browser: { open: async (input) => { opened.push(input.url); } },
  });
  try {
    const result = await ios.dom.window.CodeDestinyNative.openAuth({ provider: "kakao", nextPath: "/records/" });
    assert.equal(result.ok, true);
    assert.equal(opened.length, 0);
    assert.equal(started.length, 1);
    const url = new URL(started[0]);
    assert.equal(url.pathname, "/api/auth/oauth/kakao/start");
    assert.equal(url.protocol, "https:");
  } finally { ios.dom.window.close(); }

  const android = runBridge({
    platform: "android",
    auth: { startOAuth: async (input) => { started.push(input.url); } },
    browser: { open: async (input) => { opened.push(input.url); } },
  });
  try {
    await android.dom.window.CodeDestinyNative.openAuth({ provider: "google" });
    assert.equal(started.length, 1, "안드로이드는 iOS 플러그인을 쓰지 않는다");
    assert.equal(opened.length, 1);
  } finally { android.dom.window.close(); }
});

test("사용자가 인증 시트를 닫으면 오류 안내 없이 끝난다", async () => {
  const { dom } = runBridge({
    platform: "ios",
    auth: { startOAuth: async () => { throw Object.assign(new Error("cancelled"), { code: "AUTH_CANCELLED" }); } },
  });
  try {
    const result = await dom.window.CodeDestinyNative.openAuth({ provider: "naver" });
    assert.equal(result.code, "AUTH_CANCELLED");
    assert.equal(toastText(dom), "");
  } finally { dom.window.close(); }
});

const appleCredential = {
  identityToken: "id.token.sig",
  authorizationCode: "code-1",
  rawNonce: "raw-nonce",
  user: "001234.apple-sub.0001",
  givenName: "",
  familyName: "",
};

test("Apple 은 iOS 에서 네이티브 시트 → native 교환 → /oauth/complete 순서로 로그인한다", async () => {
  const { dom, calls } = runBridge({
    platform: "ios",
    auth: { startOAuth: async () => ({}), signInWithApple: async () => appleCredential },
    fetchImpl: async (url) => {
      if (url.endsWith("/api/auth/oauth/apple/native")) return jsonResponse(200, { ok: true, socialGrant: "grant-1", nextPath: "/records/" });
      if (url.endsWith("/api/auth/oauth/complete")) return jsonResponse(200, { ok: true, accessToken: "access-1", refreshToken: "refresh-1", user: { id: "u1" } });
      return jsonResponse(404, {});
    },
  });
  try {
    const result = await dom.window.CodeDestinyNative.openAuth({ provider: "apple", nextPath: "/records/" });
    assert.equal(result.ok, true);
    const native = calls.find((c) => c.url.endsWith("/api/auth/oauth/apple/native"));
    assert.equal(native.body.rawNonce, "raw-nonce");
    assert.equal(native.body.identityToken, "id.token.sig");
    const complete = calls.find((c) => c.url.endsWith("/api/auth/oauth/complete"));
    assert.equal(complete.body.socialGrant, "grant-1");
    assert.equal(dom.window.localStorage.getItem("fortune_auth_token"), "access-1");
    assert.equal(dom.window.localStorage.getItem("cd_apple_user_id"), appleCredential.user);
  } finally { dom.window.close(); }
});

for (const [label, status, expectRetry] of [["401", 401, false], ["503", 503, true]]) {
  test(`교환이 ${label} 이면 ${expectRetry ? "재시도" : "다시 로그인"} 안내를 띄우고 토큰을 저장하지 않는다`, async () => {
    const { dom } = runBridge({
      platform: "ios",
      auth: { startOAuth: async () => ({}), signInWithApple: async () => appleCredential },
      fetchImpl: async (url) => {
        if (url.endsWith("/api/auth/oauth/apple/native")) return jsonResponse(200, { ok: true, socialGrant: "grant-1", nextPath: "/" });
        return jsonResponse(status, { ok: false, code: status === 401 ? "invalid_social_grant" : "auth_unavailable" });
      },
    });
    try {
      const result = await dom.window.CodeDestinyNative.openAuth({ provider: "apple" });
      assert.equal(result.ok, false);
      assert.equal(dom.window.localStorage.getItem("fortune_auth_token"), null);
      const text = toastText(dom);
      assert.ok(text, "안내가 보여야 한다");
      if (expectRetry) {
        assert.doesNotMatch(text, /invalid_social_grant/);
        assert.doesNotMatch(text, /auth_unavailable/, "일시 장애를 로그인 실패 사유처럼 보이지 않는다");
      } else {
        assert.match(text, /invalid_social_grant/);
      }
    } finally { dom.window.close(); }
  });
}

test("네트워크가 끊겨 native 교환에 실패해도 재시도 안내다", async () => {
  const { dom } = runBridge({
    platform: "ios",
    auth: { startOAuth: async () => ({}), signInWithApple: async () => appleCredential },
  });
  try {
    const result = await dom.window.CodeDestinyNative.openAuth({ provider: "apple" });
    assert.equal(result.code, "APPLE_EXCHANGE_FAILED");
    assert.ok(toastText(dom));
    assert.doesNotMatch(toastText(dom), /network forbidden/);
  } finally { dom.window.close(); }
});

test("안드로이드에서 apple 은 네이티브 시트로 가지 않는다", async () => {
  let asked = false;
  const { dom } = runBridge({
    platform: "android",
    auth: { startOAuth: async () => ({}), signInWithApple: async () => { asked = true; return appleCredential; } },
    browser: { open: async () => {} },
  });
  try {
    const result = await dom.window.CodeDestinyNative.openAuth({ provider: "apple" });
    assert.equal(asked, false);
    assert.equal(result.ok, false);
  } finally { dom.window.close(); }
});
