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
    // 2026-08-24 적용 가격 범위: standard 50 · premium 100 · vvip 200 코인(family 상한 없음).
    // 경계 금액과 그 바로 위를 함께 재서 "가장 낮은 등급"의 의미를 고정한다.
    expect(checkoutEntry.resolveStorePlan(50)).toBe("standard");
    expect(checkoutEntry.resolveStorePlan(51)).toBe("premium");
    expect(checkoutEntry.resolveStorePlan(100)).toBe("premium");
    expect(checkoutEntry.resolveStorePlan(101)).toBe("vvip");
    expect(checkoutEntry.resolveStorePlan(200)).toBe("vvip");
    expect(checkoutEntry.resolveStorePlan(201)).toBe("family");
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

describe("buildPaymentChoiceCardsHtml", () => {
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
  const baseCtx = { escape, recommendLabel: "추천", goLabel: "이 방법으로 열기" };

  function threeCards(overrides = {}) {
    return {
      pass: { allow: true, dataMode: "pass-store", glyph: "🎫", badgeLabel: "이용권", titleHtml: "이용권으로 열기", descHtml: "설명", ...overrides.pass },
      direct: { allow: true, dataMode: "direct", glyph: "💳", badgeLabel: "카드", titleHtml: "이번 콘텐츠만", descHtml: "설명", ...overrides.direct },
      monthly: { allow: true, dataMode: "monthly", glyph: "🌙", badgeLabel: "월정석", titleHtml: "월정석으로 열기", descHtml: "설명", ...overrides.monthly },
    };
  }

  it("order 순서대로 카드를 이어 붙인다", () => {
    const html = checkoutEntry.buildPaymentChoiceCardsHtml({
      ...baseCtx,
      order: ["monthly", "direct", "pass"],
      recommendedOption: "monthly",
      cards: threeCards(),
    });
    const positions = ["monthly", "direct", "pass-store"].map((mode) => html.indexOf(`data-mode="${mode}"`));
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
  });

  it("allow:false 인 카드는 렌더되지 않는다(빈 문자열)", () => {
    const html = checkoutEntry.buildPaymentChoiceCardsHtml({
      ...baseCtx,
      order: ["pass", "direct", "monthly"],
      recommendedOption: "direct",
      cards: threeCards({ monthly: { allow: false } }),
    });
    expect(html).not.toContain('data-mode="monthly"');
    expect(html).toContain('data-mode="pass-store"');
    expect(html).toContain('data-mode="direct"');
  });

  it("추천 카드에만 --recommended 클래스와 추천 배지가 붙는다", () => {
    const html = checkoutEntry.buildPaymentChoiceCardsHtml({
      ...baseCtx,
      order: ["pass", "direct", "monthly"],
      recommendedOption: "direct",
      cards: threeCards(),
    });
    expect((html.match(/cd-direct-payment-option--recommended/g) || []).length).toBe(1);
    expect((html.match(/cd-direct-payment-recommend/g) || []).length).toBe(1);
    expect((html.match(/cd-direct-payment-option--secondary/g) || []).length).toBe(2);
  });

  it("배지·추천·go 라벨을 이스케이프한다(badgeLabel 은 함수가 이스케이프)", () => {
    const html = checkoutEntry.buildPaymentChoiceCardsHtml({
      ...baseCtx,
      order: ["direct"],
      recommendedOption: "direct",
      cards: { direct: { allow: true, dataMode: "direct", glyph: "💳", badgeLabel: '<b>"badge"</b>', titleHtml: "t", descHtml: "d" } },
    });
    expect(html).toContain(escape('<b>"badge"</b>'));
    expect(html).not.toContain('<b>"badge"</b>');
  });

  it("extraClass·extraDataAttrs·ariaLabel·descAttr·afterHtml 을 그대로 반영한다", () => {
    const html = checkoutEntry.buildPaymentChoiceCardsHtml({
      ...baseCtx,
      order: ["monthly"],
      recommendedOption: "",
      cards: {
        monthly: {
          allow: true,
          dataMode: "monthly",
          extraClass: " is-disabled",
          extraDataAttrs: ' data-monthly-option disabled aria-disabled="true"',
          ariaLabel: "월정석 (잔량 부족)",
          descAttr: " data-monthly-hint",
          afterHtml: "<button data-monthly-balance-check></button>",
          glyph: "🌙",
          badgeLabel: "월정석",
          titleHtml: "월정석으로 열기",
          descHtml: "설명",
        },
      },
    });
    expect(html).toContain("is-disabled");
    expect(html).toContain('data-monthly-option disabled aria-disabled="true"');
    expect(html).toContain(`aria-label="${escape("월정석 (잔량 부족)")}"`);
    expect(html).toContain("data-monthly-hint");
    expect(html).toContain("<button data-monthly-balance-check></button>");
  });
});

describe("buildPassStoreUrl", () => {
  it("cdco=1 이 붙어야 /points 가 결제 확인 모달을 자동으로 연다", () => {
    // 50코인(5,000원)은 standard 적용 범위 안이라 가장 낮은 등급이 실린다.
    const url = checkoutEntry.buildPassStoreUrl({ costCoins: 50, source: "shell" });
    expect(url).toBe("/points?plan=standard&source=shell&cdco=1");
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

describe("해외카드 결제 — 참고 환산과 원화 청구 고지", () => {
  // 🔴 checkoutText 는 globalThis.cdTranslate(key, vars, fallback) 를 본다(window 가 아니다).
  //    조회기가 없으면 ko 폴백을 그대로 쓴다 — 실제 런타임과 같은 계약으로 흉내 낸다.
  function useLocale(lang, dictionary) {
    globalThis.window.cdGetCurrentLanguage = () => lang;
    if (!dictionary) {
      delete globalThis.cdTranslate;
      return;
    }
    globalThis.cdTranslate = (key, vars, fallback) => {
      const value = key.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), dictionary);
      const template = typeof value === "string" ? value : fallback;
      return String(template == null ? "" : template)
        .replace(/\{(\w+)\}/g, (match, name) => (vars && vars[name] !== undefined ? String(vars[name]) : match));
    };
  }

  afterEach(() => {
    delete globalThis.cdTranslate;
  });

  test("한국어 화면에서는 고지도 개산가도 렌더하지 않는다(국내 사용자에게는 노이즈)", () => {
    useLocale("ko");
    expect(checkoutEntry.formatReferenceAmount(10000)).toBe("");
    expect(checkoutEntry.buildOverseasChargeNoticeHtml({ amountKrw: 10000 })).toBe("");
  });

  test("비한국어 화면에서는 로케일별 통화로 개산가를 낸다", () => {
    const expected = { en: "$7.4", ja: "¥1,100", "zh-CN": "¥53", "zh-TW": "NT$230" };
    for (const [lang, value] of Object.entries(expected)) {
      useLocale(lang);
      expect([lang, checkoutEntry.formatReferenceAmount(10000)]).toEqual([lang, value]);
    }
  });

  test("개산가는 유효숫자 2자리다 — 확정가처럼 보이면 안 된다", () => {
    useLocale("en");
    // 1350원/USD 기준. 자릿수가 늘면 $7.41 처럼 '정확한 판매가'로 읽힌다.
    expect(checkoutEntry.formatReferenceAmount(1000)).toBe("$0.74");
    expect(checkoutEntry.formatReferenceAmount(10000)).toBe("$7.4");
    expect(checkoutEntry.formatReferenceAmount(30000)).toBe("$22");
    expect(checkoutEntry.formatReferenceAmount(149000)).toBe("$110");
  });

  test("금액이 없거나 잘못되면 개산가는 비고, 고지는 그대로 뜬다", () => {
    useLocale("en");
    for (const bad of [0, -1, NaN, undefined, null, "abc"]) {
      expect(checkoutEntry.formatReferenceAmount(bad)).toBe("");
    }
    const html = checkoutEntry.buildOverseasChargeNoticeHtml({ amountKrw: 0 });
    expect(html).toContain("cd-direct-payment-legal");
    expect(html).not.toContain("approx");
  });

  test("환산표에 없는 로케일은 개산가 없이 고지만 낸다", () => {
    useLocale("xx-YY");
    expect(checkoutEntry.formatReferenceAmount(10000)).toBe("");
    expect(checkoutEntry.buildOverseasChargeNoticeHtml({ amountKrw: 10000 })).toContain("cd-direct-payment-legal");
  });

  test("사전이 로드된 로케일은 그 사전 문구를 쓴다", () => {
    const nodeFs = require("node:fs");
    const nodePath = require("node:path");
    const repoRoot = nodePath.resolve(__dirname, "../..");
    const en = JSON.parse(nodeFs.readFileSync(nodePath.join(repoRoot, "public/i18n/en.json"), "utf8"));
    useLocale("en", en);
    const html = checkoutEntry.buildOverseasChargeNoticeHtml({ amountKrw: 10000 });
    expect(html).toContain(en.payment.overseas.chargedInKrw);
    expect(html).toContain("approx. $7.4");
    expect(html).not.toContain("원화");
  });

  test("조회기가 없으면 ko 폴백으로 안전하게 떨어진다", () => {
    useLocale("en");
    const html = checkoutEntry.buildOverseasChargeNoticeHtml({ amountKrw: 10000 });
    expect(html).toContain("원화(KRW)");
  });

  test("🔴 고지 노드에 data-mode 를 붙이지 않는다 — 붙이면 누를 때 결제창이 닫힌다", () => {
    useLocale("en");
    expect(checkoutEntry.buildOverseasChargeNoticeHtml({ amountKrw: 10000 })).not.toContain("data-mode");
  });

  test("환산 기준 시점이 선언돼 있다(언제 잰 환율인지 알 수 있어야 한다)", () => {
    expect(checkoutEntry.REFERENCE_FX_AS_OF).toMatch(/^\d{4}-\d{2}$/);
  });
});
