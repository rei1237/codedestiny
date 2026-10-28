const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("Yeongnyangi exposes canonical pages for the four public locales", () => {
  const routes = read("lib/i18n/routes.ts");
  const sitemap = read("scripts/generate-sitemap.mjs");
  const page = read("app/[locale]/yeongnyangi/page.tsx");
  const languagePaths = [
    ["en", "/en/yeongnyangi"],
    ["ja", "/ja/yeongnyangi"],
    ["zh", "/zh/yeongnyangi"],
    ["zh-TW", "/zh-tw/yeongnyangi"],
  ];

  assert.match(routes, /yeongnyangi:\s*\{/);
  assert.match(page, /generateStaticParams/);
  assert.match(page, /createI18nMetadata/);
  assert.match(page, /getAlternatesByRouteKey\('yeongnyangi'\)/);
  assert.match(sitemap, /paths:\s*\{\s*ko:\s*"\/yeongnyangi"/);
  for (const [locale, route] of languagePaths) {
    const property = locale === "zh-TW" ? '"zh-TW"' : locale;
    assert.ok(routes.includes(`${property}: "${route}"`), `${locale} route map missing ${route}`);
    assert.ok(sitemap.includes(`${property}: "${route}"`), `${locale} sitemap route missing ${route}`);
  }
});

test("Yeongnyangi locale selection preserves query and hash while using localized home routes", () => {
  const switcher = read("app/components/LocaleSwitcher.tsx");
  const readingLanguage = read("app/yeongnyangi/_lib/use-reading-language.ts");
  assert.match(switcher, /routeKey==='yeongnyangi'/);
  assert.match(switcher, /query\.set\('lang',locale\.code\)/);
  assert.match(switcher, /window\.location\.hash/);
  assert.match(readingLanguage, /localeFromPathname\(usePathname\(\)\|\|''\)/);
});

test("Ggulggul home routes translated Yeongnyangi", () => {
  // 2026-10-17 "직관성": 홈의 공개 기록·영냥이 다리 링크(.cdh-public-bridges)는 걷어냈다. 런타임 로케일 매핑은 남는다.
  const languageRuntime = read("js/cd-lang-native.js");
  assert.match(languageRuntime, /getLocalizedHomeHref/);
  for (const [locale, route] of [["ko", "/yeongnyangi/"], ["en", "/en/yeongnyangi/"], ["ja", "/ja/yeongnyangi/"], ["zh-CN", "/zh/yeongnyangi/"], ["zh-TW", "/zh-tw/yeongnyangi/"]]) {
    assert.ok(languageRuntime.includes(`${locale}: '${route}'`) || languageRuntime.includes(`'${locale}': '${route}'`), `${locale} runtime mapping missing`);
  }
});

test("localized static home pages link directly to their Yeongnyangi locale route", () => {
  const sync = read("scripts/sync-legacy-static-to-public.mjs");
  assert.match(sync, /localizedYeongnyangiPath/);
  for (const [locale, path] of [["en", "/en/yeongnyangi/"], ["ja", "/ja/yeongnyangi/"], ["zh", "/zh/yeongnyangi/"], ["zh-tw", "/zh-tw/yeongnyangi/"]]) {
    const shell = read(`public/${locale}/index.html`);
    // 홈 본문의 영냥이 링크는 걷어냈다(2026-10-17). 다시 생기면 로케일 경로를 가리켜야 한다.
    for (const [, href] of shell.matchAll(/href="([^"]*)" data-cd-localized-route="yeongnyangi"/g)) {
      assert.equal(href, path, `${locale} shell links Yeongnyangi outside its locale route`);
    }
  }
});
