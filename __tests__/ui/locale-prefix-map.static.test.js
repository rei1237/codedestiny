const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

/** lib/i18n/locales.ts 가 로케일 프리픽스의 정본이다. 손으로 적지 않고 거기서 뽑는다. */
function canonicalPrefixes() {
  const prefixes = [...read("lib/i18n/locales.ts").matchAll(/pathPrefix:\s*"([^"]*)"/g)]
    .map((m) => m[1])
    .filter(Boolean);
  assert.ok(prefixes.length > 0, "lib/i18n/locales.ts 에서 pathPrefix 를 찾지 못했다");
  return new Set(prefixes);
}

function runtimeSource() {
  return read("js/core/index-inline-runtime.js");
}

/** 셸 언어 전환기가 실제로 제공하는 언어. 목록을 두 벌로 만들지 않는다. */
function switcherLanguages() {
  const langs = [...read("index.html").matchAll(/data-lang="([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(langs.length > 0, "index.html 에서 data-lang 을 찾지 못했다");
  return [...new Set(langs)];
}

function loadResolver() {
  const source = runtimeSource();
  const start = source.indexOf("function cdNormalizeLang");
  const end = source.indexOf("function cdRetargetLocaleSensitiveLinks");
  assert.ok(start >= 0 && end > start, "로케일 링크 해석 구간을 찾지 못했다");

  const context = {
    window: { location: { origin: "https://code-destiny.com", search: "" } },
    URL,
    URLSearchParams,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${source.slice(start, end)}\nglobalThis.__resolve = cdResolveLocalizedFeatureHref;`, context);
  return context.__resolve;
}

/**
 * 🔴 이 테스트가 지키는 회귀는 **로그도 에러도 남기지 않는다.**
 *
 * __cdLocalePrefixMap 은 오래도록 `/ja-jp`·`/zh-cn`·`/en-us` 라는 구 프리픽스를 들고 있었다.
 * 그 경로에는 산출물이 없어서 public/_redirects 가 301 로 받아 줬고(= 링크마다 왕복 한 번 추가),
 * 리다이렉트 규칙조차 없던 hi·es·fr·de·nl·ms 는 그냥 404 였다. 그 여섯은 셸 언어 전환기가
 * 실제로 제공하는 값이라 사용자가 고를 수 있었다.
 */
test("로케일 프리픽스 지도가 locales.ts 정본과 일치한다", () => {
  const source = runtimeSource();
  const start = source.indexOf("var __cdLocalePrefixMap = {");
  assert.ok(start >= 0, "__cdLocalePrefixMap 을 찾지 못했다");
  const block = source.slice(start, source.indexOf("};", start));

  const values = [...block.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(values.length > 0, "__cdLocalePrefixMap 이 비어 있다");

  const canonical = canonicalPrefixes();
  const strays = values.filter((value) => !canonical.has(value));
  assert.deepEqual(
    strays,
    [],
    `로케일 라우트가 아닌 프리픽스가 있다(구 프리픽스는 301, 없는 것은 404 로 간다): ${strays.join(" ")}`,
  );
});

test("언어 전환기가 제공하는 모든 언어가 실재하는 경로로 간다", () => {
  const resolve = loadResolver();
  const canonical = canonicalPrefixes();

  for (const lang of switcherLanguages()) {
    const resolved = resolve("/insights/", lang);
    const prefix = resolved.startsWith("/insights/") ? "" : resolved.slice(0, resolved.indexOf("/insights/"));

    assert.ok(
      prefix === "" || canonical.has(prefix),
      `${lang}: ${resolved} — 로케일 라우트가 아닌 프리픽스로 보낸다(없는 페이지로 간다)`,
    );
  }
});

test("로케일 빌드가 있는 경로만 언어 프리픽스를 받는다", () => {
  const resolve = loadResolver();

  // /insights 는 ja·zh·en 산출물이 전부 있다(2026-08-16 실측).
  assert.equal(resolve("/insights/", "ja"), "/ja/insights/");
  assert.equal(resolve("/insights/", "zh"), "/zh/insights/");
  assert.equal(resolve("/insights/", "en"), "/en/insights/");

  // 이 셋은 로케일 산출물이 없다 — 프리픽스를 붙이면 없는 주소가 된다.
  for (const route of ["/oracle/rune/", "/olympus/", "/oracle/sikojen-povailu/"]) {
    assert.equal(
      resolve(route, "ja"),
      route,
      `${route} 는 로케일 빌드가 없으므로 한국어 경로 그대로 둬야 한다`,
    );
  }
});
