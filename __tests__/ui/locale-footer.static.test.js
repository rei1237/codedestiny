const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

/**
 * 로케일 푸터(C안) 회귀 가드.
 *
 * 배경: 로케일 페이지의 고유 본문은 400~560자인데 AppChrome 이 붙이던 공통 한국어 블록이
 * 2,291자였다(2026-08-15 실측). 그래서 /ja·/zh·/zh-tw·/en 이 서로 near-duplicate 였고
 * Google 이 언어를 판정하지 못했다. 이 파일은 그 수정이 조용히 되돌아가는 4가지 경로를 막는다.
 *
 * __tests__/ui/*.test.js 글롭에 자동 편입되므로 새 npm 스크립트가 필요 없다
 * (verify-guard-wiring 무영향 — 신규 CI 게이트를 만들지 않는다).
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

/** `export const X = [...]` / `{...}` 를 괄호 균형으로 잘라 온다(이름 grep 으로 판단하지 않는다). */
function sliceBalanced(source, startMarker, open, close) {
  const startIndex = source.indexOf(startMarker);
  assert.ok(startIndex >= 0, `${startMarker} 를 찾지 못했다`);
  const openIndex = source.indexOf(open, startIndex);
  assert.ok(openIndex >= 0, `${startMarker} 뒤의 ${open} 를 찾지 못했다`);
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  throw new Error(`${startMarker} 의 ${open}${close} 균형이 맞지 않는다`);
}

function hrefsIn(block) {
  return new Set([...block.matchAll(/["'](\/[^"']*)["']/g)].map((m) => m[1]));
}

test("로케일 프리픽스와 레이아웃 파일이 1:1 이다", () => {
  const locales = read("lib/i18n/locales.ts");

  // 프리픽스는 LOCALE_CONFIG 에서 파생돼야 한다 — 손으로 열거하면 여기와 AppChrome 이 갈라진다.
  assert.ok(
    locales.includes("export const LOCALE_ROUTE_PREFIXES"),
    "LOCALE_ROUTE_PREFIXES 가 없다",
  );
  assert.ok(
    /LOCALE_ROUTE_PREFIXES[^=]*=\s*LOCALES[\s\S]{0,200}LOCALE_CONFIG\[locale\]\.pathPrefix/.test(locales),
    "LOCALE_ROUTE_PREFIXES 가 LOCALE_CONFIG 에서 파생되지 않는다(하드코딩 금지)",
  );

  const prefixes = [...read("lib/i18n/locales.ts").matchAll(/pathPrefix:\s*"([^"]*)"/g)]
    .map((m) => m[1])
    .filter(Boolean);
  assert.deepEqual(prefixes.sort(), ["/en", "/ja", "/zh", "/zh-tw"]);

  // 동적 [locale] 레이아웃이 프리픽스 전체를 덮는다.
  assert.ok(fs.existsSync(path.join(ROOT, "app/[locale]/layout.js")), "app/[locale]/layout.js 가 없다");

  // 리터럴 세그먼트 라우트는 [locale] 레이아웃을 못 받으므로 자기 레이아웃이 있어야 한다.
  // (없으면 AppChrome 은 한국어 푸터를 건너뛰는데 로케일 푸터도 안 붙어 1,800자 게이트에서 죽는다.)
  for (const prefix of prefixes) {
    const literalDir = path.join(ROOT, "app", prefix.replace(/^\//, ""));
    if (!fs.existsSync(literalDir)) continue;
    assert.ok(
      fs.existsSync(path.join(literalDir, "layout.js")) || fs.existsSync(path.join(literalDir, "layout.tsx")),
      `app${prefix}/ 가 리터럴 라우트로 존재하는데 layout 이 없다 — 그 하위는 푸터가 통째로 사라진다`,
    );
  }
});

test("푸터 카피는 5개 로케일이 모두 채워져 있고 ko 외에는 한국어가 없다", () => {
  const copy = read("lib/i18n/siteFooterHubCopy.ts");

  // ko 폴백 문법 금지 — verify-locale-table-coverage 가 이 문법을 보고 12개 로케일을 요구한다.
  assert.ok(!/\|\|\s*(SITE_FOOTER_HUB_)?COPY\.ko/.test(copy), "|| COPY.ko 폴백이 있다");
  assert.ok(!/\?\?\s*(SITE_FOOTER_HUB_)?COPY\.ko/.test(copy), "?? COPY.ko 폴백이 있다");
  assert.ok(!copy.startsWith("﻿"), "UTF-8 BOM 이 있다 — 모지바케 게이트에 걸린다");

  const table = sliceBalanced(copy, "export const SITE_FOOTER_HUB_COPY", "{", "}");
  for (const locale of ["ko", "ja", "zh", '"zh-TW"', "en"]) {
    assert.ok(table.includes(`${locale}: {`), `${locale} 로케일 블록이 없다`);
  }

  // ko 블록만 잘라내고 남은 부분에 한글이 있으면 번역이 빠진 것이다.
  const koStart = table.indexOf("ko: {");
  const koBlock = sliceBalanced(table.slice(koStart), "ko: {", "{", "}");
  const withoutKo = table.replace(koBlock, "");
  const leftoverHangul = withoutKo.match(/[가-힣]+/g) || [];
  // 사업자 정보 '값'은 등록 원문이라 LocaleFooterHub 쪽에 있고 이 표에는 없어야 한다.
  assert.deepEqual(
    leftoverHangul,
    [],
    `ko 외 로케일에 한국어가 남아 있다: ${leftoverHangul.slice(0, 8).join(", ")}`,
  );
});

test("LocaleFooterHub 는 SiteFooterHub 의 내부 링크를 하나도 잃지 않는다", () => {
  const koFooter = read("app/components/SiteFooterHub.jsx");
  const localeCopy = read("lib/i18n/siteFooterHubCopy.ts");

  const koSeo = hrefsIn(sliceBalanced(koFooter, "const SEO_LINK_GROUPS", "[", "]"));
  const koPolicy = hrefsIn(sliceBalanced(koFooter, "const POLICY_LINKS", "[", "]"));
  const localeSeo = hrefsIn(sliceBalanced(localeCopy, "export const FOOTER_LINK_GROUPS", "[", "]"));
  const localePolicy = hrefsIn(sliceBalanced(localeCopy, "export const FOOTER_POLICY_HREFS", "[", "]"));

  assert.ok(koSeo.size >= 40, `SiteFooterHub SEO 링크가 ${koSeo.size}개뿐이다 — 파싱이 깨졌다`);

  const missingSeo = [...koSeo].filter((href) => !localeSeo.has(href));
  assert.deepEqual(missingSeo, [], `로케일 푸터에 빠진 SEO 링크: ${missingSeo.join(", ")}`);

  const missingPolicy = [...koPolicy].filter((href) => !localePolicy.has(href));
  assert.deepEqual(missingPolicy, [], `로케일 푸터에 빠진 정책 링크: ${missingPolicy.join(", ")}`);

  // 라벨이 비면 빈 앵커가 나가므로 href 마다 5개 로케일 전부 라벨이 있어야 한다.
  const table = sliceBalanced(localeCopy, "export const SITE_FOOTER_HUB_COPY", "{", "}");
  const localeBlocks = ["ko", "ja", "zh", "zh-TW", "en"].map((locale) => {
    const marker = locale === "zh-TW" ? '"zh-TW": {' : `${locale}: {`;
    return { locale, block: sliceBalanced(table.slice(table.indexOf(marker)), marker, "{", "}") };
  });
  for (const { locale, block } of localeBlocks) {
    const labels = sliceBalanced(block, "linkLabels:", "{", "}");
    for (const href of localeSeo) {
      assert.ok(labels.includes(`"${href}":`), `${locale} 의 linkLabels 에 ${href} 라벨이 없다`);
    }
    const policyLabels = sliceBalanced(block, "policyLabels:", "{", "}");
    for (const href of localePolicy) {
      assert.ok(policyLabels.includes(`"${href}":`), `${locale} 의 policyLabels 에 ${href} 라벨이 없다`);
    }
  }
});

test("AppChrome 은 로케일 경로에서만 한국어 푸터를 건너뛴다", () => {
  const chrome = read("app/components/AppChrome.tsx");

  assert.ok(
    chrome.includes("{!hideChrome && !isLocaleRoute && <SiteFooterHub />"),
    "AppChrome 이 로케일 경로에서 한국어 푸터를 건너뛰지 않는다 — 푸터가 두 개가 된다",
  );
  assert.ok(
    chrome.includes("localeFromPathname(pathname)"),
    "isLocaleRoute 가 공유 헬퍼로 계산되지 않는다 — 프리픽스 목록이 두 곳에 생긴다",
  );
  // 한국어 페이지는 무변경이어야 한다.
  assert.ok(chrome.includes("{!hideChrome && <GlobalHeader />"));
  assert.ok(chrome.includes("{!hideChrome && <DisclaimerBanner />"));
});

test("LocaleFooterHub 는 서버 컴포넌트이고 법률 번역을 새로 만들지 않는다", () => {
  const footer = read("app/components/LocaleFooterHub.jsx");

  // 'use client' 가 붙는 순간 번역 테이블이 클라이언트 번들로 간다(A안이 기각된 이유).
  assert.ok(!/^\s*["']use client["']/m.test(footer), "LocaleFooterHub 에 'use client' 가 붙었다");

  // 환불 본문은 이용약관 12조를 그대로 읽어야 한다 — 요약하면 1,800자 게이트 마진이 사라진다.
  assert.ok(footer.includes("getRefundSection(locale)"), "환불 본문을 getRefundSection 으로 읽지 않는다");
  assert.ok(
    footer.includes("LEGAL_TRANSLATION_NOTICE"),
    "기계 보조 번역 고지를 공유 상수에서 읽지 않는다",
  );

  // SocialFooter 는 한국어 푸터와 공유하는 컴포넌트다. 카피를 안 넘기면 로케일 페이지에
  // "유튜브·쓰레드·인스타그램·블로그"가 한국어로 남는다(2026-08-16 실측으로 발견).
  assert.ok(
    /<SocialFooter\s+copy=\{copy\.social\}/.test(footer),
    "LocaleFooterHub 가 SocialFooter 에 로케일 카피를 넘기지 않는다",
  );
});

test("클라이언트 번들에 로케일 카피 테이블이 새지 않는다", () => {
  // 🔴 이 테스트가 막는 회귀: SocialFooter 는 SiteFooterHub -> AppChrome("use client") 경로에 있어
  // 클라이언트 번들에 포함된다. 거기서 5개 로케일 카피 테이블을 import 하면 layout 청크가
  // 41,007B -> 63,469B(+22KB)로 커진다(2026-08-16 실측). 로케일 페이지는 429개 중 41개인데
  // 비용은 전 사용자가 낸다 — 핸드오프에서 A안이 기각된 바로 그 이유다.
  for (const rel of ["app/_components/SocialFooter.js", "app/components/SiteFooterHub.jsx"]) {
    const source = read(rel);
    assert.ok(
      !/from\s+["'][^"']*siteFooterHubCopy["']/.test(source),
      `${rel} 이 siteFooterHubCopy 를 import 한다 — 클라이언트 번들로 5개 로케일 표가 통째로 들어간다`,
    );
  }

  // 카피 소비는 서버 전용 컴포넌트에서만 일어나야 한다.
  assert.ok(
    /from\s+["'][^"']*siteFooterHubCopy["']/.test(read("app/components/LocaleFooterHub.jsx")),
    "LocaleFooterHub 가 카피 테이블을 읽지 않는다",
  );

  // 주석의 한국어는 사용자에게 나가지 않으므로 걷어내고 코드만 본다.
  const socialCode = read("app/_components/SocialFooter.js")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
  const socialHangul = socialCode.match(/[가-힣]+/g) || [];
  assert.deepEqual(
    socialHangul,
    [],
    `SocialFooter 코드에 한국어 리터럴이 남아 있다(카피는 호출자가 prop 으로 넘긴다): ${socialHangul.join(", ")}`,
  );
});
