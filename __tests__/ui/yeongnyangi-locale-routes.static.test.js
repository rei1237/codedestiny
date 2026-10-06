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

test("Ggulggul home styles trust links and routes translated Yeongnyangi", () => {
  const shell = read("templates/home-funnel.html");
  const css = read("styles/home-funnel.css");
  const languageRuntime = read("js/cd-lang-native.js");
  assert.match(shell, /href="\/insights\/presidential-saju-public-records\/"/);
  assert.match(shell, /data-cd-localized-route="yeongnyangi"/);
  assert.match(css, /\.cdh-public-bridges/);
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
    assert.ok(shell.includes(`href="${path}" data-cd-localized-route="yeongnyangi"`), `${locale} shell is missing its localized inbound link`);
  }
});
