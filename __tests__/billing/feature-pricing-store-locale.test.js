/**
 * 타일 가격 배지의 로케일 표기 검증(js/core/feature-pricing-store.js).
 *
 * 왜 필요한가:
 *   `/api/billing/features` 는 displayPrice 를 "30,000원" 으로 굳혀 보낸다
 *   (worker/lib/billing-feature-registry.js toPricingShape). 그 응답은 가격이 국가 불변이라
 *   캐시되므로 **서버에서 로케일별 문자열을 만들 수 없다** — 만들면 캐시가 로케일마다 갈라진다.
 *   그래서 로케일 반영은 이 스토어의 몫이고, 여기가 서버 문자열을 그대로 통과시키면
 *   영어·일본어 화면의 타일 배지에 "30,000원" 이 그대로 나간다.
 *
 * 무엇을 고정하는가:
 *   ① 서버가 ko-KR 문자열을 보내도 화면 로케일 표기가 이긴다
 *   ② 한국어 화면의 표기는 종전과 완전히 같다
 *   ③ checkout-entry 가 아직 안 붙었으면 한국어 표기로 물러난다(빈칸이 되지 않는다)
 *   ④ 마크업 시딩 경로도 같은 정본을 탄다
 */

const fs = require("node:fs");
const path = require("node:path");

const checkoutEntry = require("../../js/core/checkout-entry.js");

const STORE_SRC = fs.readFileSync(
  path.resolve(__dirname, "../../js/core/feature-pricing-store.js"),
  "utf8",
);

const DICTIONARIES = {
  en: JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/i18n/en.json"), "utf8")),
  ja: JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/i18n/ja.json"), "utf8")),
  ko: JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/i18n/ko.json"), "utf8")),
};

/**
 * 🔴 checkoutText 는 globalThis.cdTranslate(key, vars, fallback) 를 본다(window 가 아니다).
 *    window.cdTranslate 로 만들면 전 로케일이 ko 폴백으로 떨어져 오진이 난다.
 */
function useLocale(lang) {
  globalThis.window.cdGetCurrentLanguage = () => lang;
  const dictionary = DICTIONARIES[lang];
  globalThis.cdTranslate = (key, vars, fallback) => {
    const value = key.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), dictionary);
    const template = typeof value === "string" ? value : fallback;
    return String(template == null ? "" : template)
      .replace(/\{(\w+)\}/g, (match, name) => (vars && vars[name] !== undefined ? String(vars[name]) : match));
  };
}

/** 브라우저 classic script 와 같은 계약으로 로드한다 — IIFE 가 전역 window 를 인자로 받는다. */
function loadStore({ attachCheckoutEntry = true, tiles = [] } = {}) {
  if (attachCheckoutEntry) globalThis.window.__cdCheckoutEntry = checkoutEntry;
  const documentStub = { querySelectorAll: () => tiles };
  // eslint-disable-next-line no-new-func
  new Function("window", "document", STORE_SRC)(globalThis.window, documentStub);
  return globalThis.window.CodeDestinyFeaturePricingStore;
}

/** 서버 응답을 흉내 낸다. 진짜 Response 를 쓴다 — 손수 만든 봉투는 네트워크 오류로 접힌다. */
function stubCatalogFetch(entries) {
  globalThis.window.fetch = () => Promise.resolve(new Response(
    JSON.stringify({ data: { legacyFeatureTable: entries } }),
    { status: 200, headers: { "content-type": "application/json" } },
  ));
}

/** 서버가 실제로 내려보내는 모양 — displayPrice 가 ko-KR 로 굳어 있다. */
const SERVER_ENTRY = {
  featureKey: "vedic-ai-consultation",
  amountKRW: 30000,
  coinPrice: 300,
  displayPrice: "30,000원",
};

beforeEach(() => {
  globalThis.window = {};
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.cdTranslate;
});

describe("타일 가격 배지 — 서버의 ko-KR 문자열보다 화면 로케일이 이긴다", () => {
  test.each([
    ["ko", "30,000원"],
    ["en", "30,000 KRW"],
    ["ja", "30,000ウォン"],
  ])("%s 화면에서는 %s 로 그린다", async (lang, expected) => {
    useLocale(lang);
    const store = loadStore();
    stubCatalogFetch([SERVER_ENTRY]);

    const entry = await store.getOrLoad("vedic-ai-consultation");

    expect([lang, entry.displayPrice]).toEqual([lang, expected]);
    // 금액 자체는 손대지 않는다 — 환산도 반올림도 없다.
    expect(entry.amountKRW).toBe(30000);
  });

  test("checkout-entry 가 아직 안 붙었으면 한국어 표기로 물러난다(빈칸이 되지 않는다)", async () => {
    useLocale("en");
    const store = loadStore({ attachCheckoutEntry: false });
    stubCatalogFetch([SERVER_ENTRY]);

    const entry = await store.getOrLoad("vedic-ai-consultation");

    expect(entry.displayPrice).toBe("30,000원");
  });

  test("마크업 시딩 경로도 같은 정본을 탄다", () => {
    useLocale("en");
    const attributes = { "data-feature-key": "ziwei-ai-consultation", "data-price-krw": "30000" };
    const tile = {
      getAttribute: (name) => (name in attributes ? attributes[name] : null),
      setAttribute: () => {},
    };
    const store = loadStore({ tiles: [tile] });

    expect(store.get("ziwei-ai-consultation").displayPrice).toBe("30,000 KRW");
  });

  test("로케일이 바뀌면 읽을 때마다 다시 그린다 — 캐시된 옛 표기가 남지 않는다", async () => {
    useLocale("en");
    const store = loadStore();
    stubCatalogFetch([SERVER_ENTRY]);
    await store.getOrLoad("vedic-ai-consultation");

    useLocale("ja");

    expect(store.get("vedic-ai-consultation").displayPrice).toBe("30,000ウォン");
  });
});
