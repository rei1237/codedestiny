import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// locales.ts·routes.ts·seo.ts 는 확장자 없는 상대 import 를 쓴다("./seo.v2" 포함). 노드가 .ts 를 찾도록 후보를 더한다.
register(`data:text/javascript,${encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); } catch (error) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!relative || [".ts", ".tsx", ".mjs", ".js", ".json"].some((ext) => specifier.endsWith(ext))) throw error;
    for (const suffix of [".ts", ".mjs", ".js"]) { try { return await next(specifier + suffix, context); } catch {} }
    throw error;
  }
}`)}`);

const { HREFLANG_CODES, alternatesFor, toNextLanguages, localeSiblings } = await import("../../lib/seo/hreflang.mjs");
const localeData = await import("../../lib/i18n/locale-data.mjs");

const ORIGIN = "https://code-destiny.com";
const codes = (list) => list.map((alt) => alt.hreflang);
const allowAll = { isIndexable: () => true };

test("HREFLANG_CODES keeps one code per language plus scope-widening aliases", () => {
  assert.deepEqual(HREFLANG_CODES, {
    ko: ["ko"], ja: ["ja"], en: ["en"], zh: ["zh-CN", "zh", "zh-Hans"], "zh-TW": ["zh-TW", "zh-Hant"],
  });
});

test("home cluster keeps /ggulggul/ as ko and x-default without regional duplicates", () => {
  const list = alternatesFor(localeData.I18N_ROUTE_MAP.home);
  assert.deepEqual(codes(list), ["ko", "ja", "zh-CN", "zh", "zh-Hans", "zh-TW", "zh-Hant", "en", "x-default"]);
  const xDefault = list.filter((alt) => alt.hreflang === "x-default");
  assert.equal(xDefault.length, 1);
  assert.equal(xDefault[0].href, `${ORIGIN}/ggulggul/`);
  for (const dropped of ["ko-KR", "ja-JP", "en-US"]) assert.ok(!codes(list).includes(dropped), dropped);
  assert.equal(list.find((alt) => alt.hreflang === "zh-TW").href, `${ORIGIN}/zh-tw/`);
});

test("drops noindex sibling", () => {
  const list = alternatesFor({ ko: "/x", en: "/en/x", ja: "/ja/x" }, { isIndexable: (path) => path !== "/en/x" });
  assert.deepEqual(codes(list), ["ko", "ja", "x-default"]);
});

test("default isIndexable comes from the index ledger", () => {
  const list = alternatesFor({ ko: "/fortune/date/2026-11-08", en: "/en/fortune/today" });
  assert.deepEqual(list, []);
});

test("zh-tw key forms", () => {
  const forms = [
    { ko: "/a", "zh-TW": "/zh-tw/a" },
    { ko: "/a", "zh-tw": "/zh-tw/a" },
    { ko: "/a", "zh-Hant": "/zh-tw/a/" },
  ];
  for (const routes of forms) {
    const list = alternatesFor(routes, allowAll);
    assert.deepEqual(codes(list), ["ko", "zh-TW", "zh-Hant", "x-default"], JSON.stringify(routes));
    assert.equal(list[1].href, `${ORIGIN}/zh-tw/a/`);
  }
  const simplified = alternatesFor({ ko: "/a", "zh-CN": "/zh/a", "x-default": "/ignored" }, allowAll);
  assert.deepEqual(codes(simplified), ["ko", "zh-CN", "zh", "zh-Hans", "x-default"]);
  assert.equal(simplified.at(-1).href, `${ORIGIN}/a/`);
});

test("fewer than two languages yields no alternates; no ko means no x-default", () => {
  assert.deepEqual(alternatesFor({ ko: "/a" }, allowAll), []);
  assert.deepEqual(alternatesFor({ ko: "/a", en: "/en/a" }, { isIndexable: (path) => path === "/a" }), []);
  assert.deepEqual(codes(alternatesFor({ en: "/en/a", ja: "/ja/a" }, allowAll)), ["ja", "en"]);
});

test("hrefs are absolute with a trailing slash except file paths", () => {
  const list = alternatesFor({ ko: "/a?x=1", en: "https://code-destiny.com//en/a.html" }, allowAll);
  assert.equal(list[0].href, `${ORIGIN}/a/`);
  assert.equal(list[1].href, `${ORIGIN}/en/a.html`);
});

test("toNextLanguages and localeSiblings", () => {
  assert.deepEqual(toNextLanguages([{ hreflang: "ko", href: "u1" }, { hreflang: "x-default", href: "u1" }]), { ko: "u1", "x-default": "u1" });
  assert.deepEqual(localeSiblings("/fortune/today"), {
    ko: "/fortune/today", ja: "/ja/fortune/today", zh: "/zh/fortune/today", "zh-TW": "/zh-tw/fortune/today", en: "/en/fortune/today",
  });
  assert.deepEqual(localeSiblings("/fortune/today/", ["ko", "en"]), { ko: "/fortune/today/", en: "/en/fortune/today/" });
});

test("locales.ts and routes.ts export the same values as before (alias field aside)", async () => {
  const locales = await import("../../lib/i18n/locales.ts");
  const routes = await import("../../lib/i18n/routes.ts");
  assert.deepEqual([...locales.LOCALES], ["ko", "ja", "zh", "zh-TW", "en"]);
  assert.deepEqual([...locales.PUBLIC_LOCALES], ["ja", "zh", "zh-TW", "en"]);
  assert.deepEqual([...locales.SEO_INDEXABLE_LOCALES], ["ko", "ja", "zh", "zh-TW", "en"]);
  const before = {
    ko: { label: "한국어", htmlLang: "ko", pathPrefix: "", siteName: "꿀꿀 운세", ogLocale: "ko_KR", hrefLang: "ko" },
    ja: { label: "日本語", htmlLang: "ja-JP", pathPrefix: "/ja", siteName: "꿀꿀 운세", ogLocale: "ja_JP", hrefLang: "ja" },
    zh: { label: "中文(简体)", htmlLang: "zh-CN", pathPrefix: "/zh", siteName: "꿀꿀 운세", ogLocale: "zh_CN", hrefLang: "zh-CN" },
    "zh-TW": { label: "中文(繁體)", htmlLang: "zh-TW", pathPrefix: "/zh-tw", siteName: "꿀꿀 운세", ogLocale: "zh_TW", hrefLang: "zh-TW" },
    en: { label: "English", htmlLang: "en", pathPrefix: "/en", siteName: "꿀꿀 운세", ogLocale: "en_US", hrefLang: "en" },
  };
  const withoutAliases = Object.fromEntries(Object.entries(locales.LOCALE_CONFIG).map(([key, { hrefLangAliases, ...rest }]) => [key, rest]));
  assert.deepEqual(withoutAliases, before);
  // 예전 별칭 표기도 계속 로케일로 되돌린다(og:locale 이 바뀌지 않게).
  for (const [tag, locale] of [["ko-KR", "ko"], ["ja-JP", "ja"], ["en-US", "en"], ["zh-Hans", "zh"], ["zh-Hant", "zh-TW"], ["zh", "zh"]]) {
    assert.equal(locales.resolveLocaleTag(tag), locale, tag);
  }
  assert.deepEqual(routes.I18N_ROUTE_MAP, localeData.I18N_ROUTE_MAP);
  assert.equal(routes.I18N_ROUTE_MAP.home.ko, "/ggulggul");
  assert.equal(routes.I18N_ROUTE_MAP.insightZiweiBasics["zh-TW"], "/zh-tw/insights/ziwei-basics-tw");
  assert.deepEqual([...routes.I18N_ROUTE_KEYS], Object.keys(localeData.I18N_ROUTE_MAP));
});

test("Korean fortune period and sign pages emit x-default through the shared builder", async () => {
  const { readFileSync } = await import("node:fs");
  for (const file of ["app/fortune/[period]/page.tsx", "app/fortune/[period]/[sign]/page.tsx"]) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    assert.match(source, /hreflang:\s*localeSiblings\(seo\.path\)/, file);
  }
  const { buildSeoMetadata } = await import("../../lib/seo.ts");
  const meta = buildSeoMetadata({ path: "/fortune/today", title: "t", description: "d", hreflang: localeSiblings("/fortune/today") });
  assert.deepEqual(meta.alternates.languages, toNextLanguages(alternatesFor(localeSiblings("/fortune/today"))));
  assert.equal(meta.alternates.languages["x-default"], `${ORIGIN}/fortune/today/`);
  assert.equal(meta.alternates.languages["zh-CN"], `${ORIGIN}/zh/fortune/today/`);
});

test("generatePageMetadata and createI18nMetadata emit the same set as alternatesFor", async () => {
  const { generatePageMetadata } = await import("../../lib/generate-page-metadata.ts");
  const { createI18nMetadata } = await import("../../lib/seo/createI18nMetadata.ts");
  const { I18N_POLICY_ROUTE_MAP } = await import("../../lib/i18n/routes.ts");
  const policy = generatePageMetadata({ path: "/privacy", title: "t", description: "d", hreflangPaths: I18N_POLICY_ROUTE_MAP.privacy });
  assert.deepEqual(policy.alternates.languages, toNextLanguages(alternatesFor(I18N_POLICY_ROUTE_MAP.privacy)));
  const routes = localeData.I18N_ROUTE_MAP.today;
  const i18n = createI18nMetadata({ locale: "ja", routeByLocale: routes, title: "t", description: "d" });
  assert.deepEqual(i18n.alternates.languages, toNextLanguages(alternatesFor(routes)));
  assert.equal(i18n.alternates.canonical, `${ORIGIN}/ja/today/`);
});
