/**
 * 결제창 진입·복귀·계측 공용 모듈(js/core/checkout-entry.js) 단위 검증.
 *
 * 세 렌더러(정적 셸·React·독립 정적)가 이 모듈 하나로 "이용권으로 구매" 카드를 처리하므로
 * 여기가 틀리면 세 곳이 함께 틀린다. 특히 다음 두 가지를 고정한다.
 *   1) 앱에서는 절대 /points 로 보내지 않는다 — 앱 번들에 /points 가 없어 빈 화면이 된다.
 *   2) 복귀 지점은 읽는 즉시 지워진다 — 안 지우면 목적지에서 다시 읽어 왕복 루프가 된다.
 */

const passVerdict = require("../../js/core/pass-verdict.js");
const checkoutEntry = require("../../js/core/checkout-entry.js");

function makeSessionStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    size: () => map.size,
  };
}

beforeEach(() => {
  globalThis.__cdPassVerdict = passVerdict;
  globalThis.sessionStorage = makeSessionStorage();
  globalThis.window = {};
});

afterEach(() => {
  delete globalThis.sessionStorage;
  delete globalThis.window;
});

describe("resolveStorePlan", () => {
  it("금액을 덮는 가장 낮은 등급을 고른다", () => {
    expect(checkoutEntry.resolveStorePlan(30)).toBe("standard");
    expect(checkoutEntry.resolveStorePlan(50)).toBe("premium");
    expect(checkoutEntry.resolveStorePlan(100)).toBe("vvip");
    expect(checkoutEntry.resolveStorePlan(500)).toBe("family");
  });

  it("이미 가진 등급 이하는 후보에서 뺀다(업그레이드 유도)", () => {
    expect(checkoutEntry.resolveStorePlan(30, "standard")).toBe("premium");
    expect(checkoutEntry.resolveStorePlan(30, "premium")).toBe("vvip");
    expect(checkoutEntry.resolveStorePlan(30, "vvip")).toBe("family");
    expect(checkoutEntry.resolveStorePlan(30, "family")).toBe("family");
  });

  it("판정 근거가 없으면 빈 문자열을 준다 — 임의로 family 를 들이밀지 않는다", () => {
    delete globalThis.__cdPassVerdict;
    expect(checkoutEntry.resolveStorePlan(30)).toBe("");
    expect(checkoutEntry.buildPassStoreUrl({ costCoins: 30 })).not.toContain("plan=");
  });
});

describe("buildPassStoreUrl", () => {
  it("cdco=1 이 붙어야 /points 가 결제 확인 모달을 자동으로 연다", () => {
    const url = checkoutEntry.buildPassStoreUrl({ costCoins: 50, source: "shell" });
    expect(url).toBe("/points?plan=premium&source=shell&cdco=1");
  });
});

describe("shouldUseAppStoreEntry", () => {
  it("앱 결제 가드가 설치돼 있으면 앱 경로", () => {
    globalThis.window.__cdAppPaymentGuard = { installed: true };
    expect(checkoutEntry.shouldUseAppStoreEntry()).toBe(true);
  });

  it("런타임 타깃이 mobile-app 이면 앱 경로", () => {
    globalThis.window.__CODE_DESTINY_RUNTIME_TARGET = "mobile-app";
    expect(checkoutEntry.shouldUseAppStoreEntry()).toBe(true);
  });

  it("웹에서는 false", () => {
    expect(checkoutEntry.shouldUseAppStoreEntry()).toBe(false);
  });
});

describe("복귀 지점", () => {
  it("읽는 즉시 지워진다(복귀 루프 방지)", () => {
    checkoutEntry.rememberCheckoutReturn({ url: "/saju", label: "사주" });
    expect(checkoutEntry.consumeCheckoutReturn()).toEqual({ url: "/saju", label: "사주", featureKey: "" });
    expect(checkoutEntry.consumeCheckoutReturn()).toBeNull();
    expect(globalThis.sessionStorage.size()).toBe(0);
  });

  it("30분이 지난 복귀 지점은 버린다", () => {
    checkoutEntry.rememberCheckoutReturn({ url: "/saju" });
    const key = checkoutEntry.RETURN_KEY;
    const stored = JSON.parse(globalThis.sessionStorage.getItem(key));
    stored.savedAt = Date.now() - (checkoutEntry.RETURN_TTL_MS + 1000);
    globalThis.sessionStorage.setItem(key, JSON.stringify(stored));
    expect(checkoutEntry.consumeCheckoutReturn()).toBeNull();
  });

  it("url 이 없으면 저장하지 않는다", () => {
    expect(checkoutEntry.rememberCheckoutReturn({ label: "사주" })).toBe(false);
    expect(globalThis.sessionStorage.size()).toBe(0);
  });
});

describe("trackCheckoutEvent", () => {
  afterEach(() => { delete globalThis.fetch; });

  it("화이트리스트에 없는 이벤트는 네트워크를 타지 않는다", () => {
    const fetchSpy = jest.fn(() => Promise.resolve({}));
    globalThis.fetch = fetchSpy;
    expect(checkoutEntry.trackCheckoutEvent("something_else", {})).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 🔴 /api/billing/* 은 requireJson 가드가 걸려 있고, 위반하면 400 일 뿐 아니라 addAbuseScore 까지
  // 올린다 — 계측이 공격 트래픽으로 집계돼 실제 사용자가 차단될 수 있다. 첫 배포에서 sendBeacon 의
  // text/plain 으로 나가 전 이벤트가 400 을 맞았던 자리라 content-type 을 여기서 고정한다.
  it("application/json 으로 보낸다(다른 타입은 워커 보안 가드가 400 + 어뷰즈 점수)", () => {
    const calls = [];
    globalThis.fetch = (url, init) => { calls.push({ url, init }); return Promise.resolve({}); };
    expect(checkoutEntry.trackCheckoutEvent("checkout_opened", {})).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].init.headers["Content-Type"]).toBe("application/json");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.keepalive).toBe(true);
    expect(calls[0].url).toContain("/api/billing/funnel-event");
  });

  it("개인식별자를 실어 보내지 않는다", () => {
    let body = "";
    globalThis.fetch = (_url, init) => { body = init.body; return Promise.resolve({}); };
    checkoutEntry.trackCheckoutEvent("checkout_option_click", {
      featureKey: "saju-deep",
      option: "pass",
      coinPrice: 50,
      userId: "leaked",
      email: "leaked@example.com",
    });
    const parsed = JSON.parse(body);
    expect(parsed).toMatchObject({ name: "checkout_option_click", featureKey: "saju-deep", option: "pass", coinPrice: 50 });
    expect(Object.keys(parsed)).not.toContain("userId");
    expect(Object.keys(parsed)).not.toContain("email");
  });

  it("계측 실패가 결제 경로로 새지 않는다", () => {
    globalThis.fetch = () => { throw new Error("network down"); };
    expect(() => checkoutEntry.trackCheckoutEvent("checkout_opened", {})).not.toThrow();
    expect(checkoutEntry.trackCheckoutEvent("checkout_opened", {})).toBe(false);
  });

  it("거부된 프로미스가 unhandled rejection 으로 새지 않는다", async () => {
    globalThis.fetch = () => Promise.reject(new Error("blocked"));
    expect(checkoutEntry.trackCheckoutEvent("checkout_opened", {})).toBe(true);
    await new Promise((resolve) => { setTimeout(resolve, 0); });
  });

  /**
   * 🔴 클라 화이트리스트와 서버 화이트리스트가 어긋나면 **조용히** 유실된다 —
   * 서버는 모르는 이벤트에도 204 를 돌려주고 클라는 응답을 읽지 않는다(둘 다 의도된 계약).
   * 그래서 "계측을 넣었는데 데이터가 안 쌓인다"가 아무 신호 없이 발생할 수 있다.
   * 이름을 배열에 나열하지 않고 **양쪽 소스에서 전수 추출해** 대조한다.
   */
  it("클라·서버 퍼널 이벤트 화이트리스트가 일치한다", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const root = path.resolve(__dirname, "../..");

    const clientSource = fs.readFileSync(path.join(root, "js/core/checkout-entry.js"), "utf8");
    const clientBlock = clientSource.slice(
      clientSource.indexOf("var FUNNEL_EVENTS = {"),
      clientSource.indexOf("};", clientSource.indexOf("var FUNNEL_EVENTS = {")),
    );
    const clientNames = (clientBlock.match(/^\s{4}(\w+): true,/gm) || [])
      .map((line) => line.trim().replace(": true,", ""));

    const serverSource = fs.readFileSync(path.join(root, "worker/routes/billing.js"), "utf8");
    const serverBlock = serverSource.slice(
      serverSource.indexOf("const CHECKOUT_FUNNEL_EVENT_NAMES = new Set(["),
      serverSource.indexOf("]);", serverSource.indexOf("const CHECKOUT_FUNNEL_EVENT_NAMES = new Set([")),
    );
    const serverNames = (serverBlock.match(/"(\w+)"/g) || []).map((quoted) => quoted.replace(/"/g, ""));

    expect(clientNames.length).toBeGreaterThan(0);
    expect(serverNames.length).toBeGreaterThan(0);
    expect([...clientNames].sort()).toEqual([...serverNames].sort());
  });
});
