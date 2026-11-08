/**
 * 로케일 데이터 원본. 앱(lib/i18n/locales.ts·routes.ts 가 타입만 입혀 다시 내보낸다)과
 * 빌드 스크립트(scripts/generate-sitemap.mjs, lib/seo/hreflang.mjs)가 함께 읽는다.
 * Next(TS)와 Node 스크립트가 모두 읽으므로 의존성 없는 ESM 으로 둔다.
 *
 * hreflang 코드 규칙(설계 판단 8): 언어마다 대표 코드 1개(hrefLang)와 범위를 실제로 넓히는 별칭만 둔다.
 * ko-KR·ja-JP·en-US 는 대표 코드와 범위가 같아 뺐다. 그 표기는 legacyTags 로만 남겨 resolveLocaleTag 가
 * 계속 로케일로 되돌린다(og:locale·content-language 판정이 바뀌지 않게).
 */
export const LOCALES = Object.freeze(["ko", "ja", "zh", "zh-TW", "en"]);
export const PUBLIC_LOCALES = Object.freeze(["ja", "zh", "zh-TW", "en"]);
// 2026-07: 일본 오가닉 유입 확보를 위해 다국어 색인 개방.
// 2026-08: 대만 번체(zh-TW)를 zh(중국 간체)와 분리된 별도 로케일로 개방.
// ja/zh/zh-TW/en SSR 페이지(app/[locale]/*)는 네이티브 품질 번역이 완료된 상태
// (lib/seo/i18nKeywords.ts, lib/seo/i18nInsights.ts 참고).
export const SEO_INDEXABLE_LOCALES = Object.freeze(["ko", "ja", "zh", "zh-TW", "en"]);

export const LOCALE_DATA = Object.freeze({
  ko: Object.freeze({ htmlLang: "ko", pathPrefix: "", ogLocale: "ko_KR", hrefLang: "ko", hrefLangAliases: Object.freeze([]), legacyTags: Object.freeze(["ko-KR"]) }),
  ja: Object.freeze({ htmlLang: "ja-JP", pathPrefix: "/ja", ogLocale: "ja_JP", hrefLang: "ja", hrefLangAliases: Object.freeze([]), legacyTags: Object.freeze(["ja-JP"]) }),
  zh: Object.freeze({ htmlLang: "zh-CN", pathPrefix: "/zh", ogLocale: "zh_CN", hrefLang: "zh-CN", hrefLangAliases: Object.freeze(["zh", "zh-Hans"]), legacyTags: Object.freeze([]) }),
  "zh-TW": Object.freeze({ htmlLang: "zh-TW", pathPrefix: "/zh-tw", ogLocale: "zh_TW", hrefLang: "zh-TW", hrefLangAliases: Object.freeze(["zh-Hant"]), legacyTags: Object.freeze([]) }),
  en: Object.freeze({ htmlLang: "en", pathPrefix: "/en", ogLocale: "en_US", hrefLang: "en", hrefLangAliases: Object.freeze([]), legacyTags: Object.freeze(["en-US"]) }),
});

export const I18N_ROUTE_MAP = Object.freeze({
  home: Object.freeze({
    // These translated shells describe Flower Pig, whose Korean home is /ggulggul.
    // The Yeongnyangi root is a different service landing, not their translation.
    ko: "/ggulggul",
    ja: "/ja",
    zh: "/zh",
    "zh-TW": "/zh-tw",
    en: "/en",
  }),
  yeongnyangi: Object.freeze({ ko: "/yeongnyangi", ja: "/ja/yeongnyangi", zh: "/zh/yeongnyangi", "zh-TW": "/zh-tw/yeongnyangi", en: "/en/yeongnyangi" }),
  ziwei: Object.freeze({ ko: "/ziwei", ja: "/ja/ziwei", zh: "/zh/ziwei", "zh-TW": "/zh-tw/ziwei", en: "/en/ziwei" }),
  sukuyo: Object.freeze({ ko: "/sukuyo", ja: "/ja/sukuyo", zh: "/zh/sukuyo", "zh-TW": "/zh-tw/sukuyo", en: "/en/sukuyo" }),
  today: Object.freeze({ ko: "/today", ja: "/ja/today", zh: "/zh/today", "zh-TW": "/zh-tw/today", en: "/en/today" }),
  insights: Object.freeze({ ko: "/insights", ja: "/ja/insights", zh: "/zh/insights", "zh-TW": "/zh-tw/insights", en: "/en/insights" }),
  insightZiweiBasics: Object.freeze({
    ko: "/insights/ziwei-basics",
    ja: "/ja/insights/ziwei-basics-jp",
    zh: "/zh/insights/ziwei-basics-zh",
    "zh-TW": "/zh-tw/insights/ziwei-basics-tw",
    en: "/en/insights/ziwei-basics-en",
  }),
  insightSukuyoBasics: Object.freeze({
    ko: "/insights/sukuyo-basics",
    ja: "/ja/insights/sukuyo-basics-jp",
    zh: "/zh/insights/sukuyo-basics-zh",
    "zh-TW": "/zh-tw/insights/sukuyo-basics-tw",
    en: "/en/insights/sukuyo-basics-en",
  }),
});
