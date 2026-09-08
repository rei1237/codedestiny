const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");

test("공개 페이지 공통 헤더와 푸터가 꽃돼지 브랜드를 공유한다", () => {
  const header = read("app/components/GlobalHeader.tsx");
  const footer = read("app/components/SiteFooterHub.jsx");
  const localeFooter = read("app/components/LocaleFooterHub.jsx");

  for (const source of [header, footer, localeFooter]) {
    assert.match(source, /\/icons\/app-logo-512\.webp/);
    assert.match(source, /CODE DESTINY/);
  }
  assert.match(header, /꿀꿀 운세/);
  assert.match(footer, /오늘의 마음이 조금 가벼워지는 곳/);
});

test("유명인 사주 상세도 공통 사이트 헤더와 푸터를 숨기지 않는다", () => {
  const detail = read("app/insights/famous-saju/[slug]/page.tsx");

  assert.doesNotMatch(detail, /body:has\(main\[data-famous-saju-detail\]\) > header/);
  assert.doesNotMatch(detail, /body:has\(main\[data-famous-saju-detail\]\) > footer/);
});

test("다국어 기능 소개는 꽃돼지 읽기 템플릿을 공유한다", () => {
  const introduction = read("app/components/PublicFeatureIntroduction.jsx");

  assert.match(introduction, /PublicFeatureIntroduction\.module\.css/);
  assert.match(introduction, /\/icons\/app-logo-512\.webp/);
  assert.match(introduction, /className=\{styles\.content\}/);
  assert.match(introduction, /<details className=\{styles\.faq\}>/);
});

test("다국어 공통 크롬은 URL 로케일과 정책 정본 경로를 공유한다", () => {
  const header = read("app/components/GlobalHeader.tsx");
  const footer = read("app/components/LocaleFooterHub.jsx");
  const disclaimer = read("app/components/DisclaimerBanner.jsx");
  const routes = read("lib/i18n/routes.ts");

  assert.match(header, /getLocalizedPublicHref/);
  assert.match(header, /toPublicRouteLocale/);
  assert.match(header, /brandTagline/);
  assert.match(footer, /getLocalizedPublicHref/);
  assert.doesNotMatch(footer, /function localizedPolicyHref/);

  assert.match(disclaimer, /import \{ useLocale \}/);
  assert.match(disclaimer, /const locale = useLocale\(\)/);
  assert.doesNotMatch(disclaimer, /getCurrentLoadingLocale/);

  assert.match(routes, /export function getLocalizedPublicHref/);
  assert.match(routes, /I18N_POLICY_ROUTE_MAP\[policyKey\]\[locale\]/);
  assert.match(routes, /TRUST_LOCALES\.includes\(locale\)/);
});
