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
  it("화이트리스트에 없는 이벤트는 네트워크를 타지 않는다", () => {
    const sendBeacon = jest.fn(() => true);
    globalThis.navigator = { sendBeacon };
    expect(checkoutEntry.trackCheckoutEvent("something_else", {})).toBe(false);
    expect(sendBeacon).not.toHaveBeenCalled();
    delete globalThis.navigator;
  });

  it("개인식별자를 실어 보내지 않는다", () => {
    let body = "";
    globalThis.Blob = class { constructor(parts) { body = parts.join(""); } };
    globalThis.navigator = { sendBeacon: () => true };
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
    delete globalThis.navigator;
    delete globalThis.Blob;
  });

  it("계측 실패가 결제 경로로 새지 않는다", () => {
    globalThis.navigator = { sendBeacon: () => { throw new Error("beacon down"); } };
    globalThis.Blob = class {};
    expect(() => checkoutEntry.trackCheckoutEvent("checkout_opened", {})).not.toThrow();
    expect(checkoutEntry.trackCheckoutEvent("checkout_opened", {})).toBe(false);
    delete globalThis.navigator;
    delete globalThis.Blob;
  });
});
