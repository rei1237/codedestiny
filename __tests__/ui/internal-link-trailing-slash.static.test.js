const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

/**
 * next.config.mjs 가 `trailingSlash: true` 라 슬래시 없는 내부 링크는 전부 308 을 한 번 탄다.
 * 크롤 예산이 두 배로 나가므로 셸·푸터의 내부 링크에는 슬래시를 붙여 둔다.
 *
 * 이 판정은 scripts 의 변환 규칙과 같아야 한다: 확장자 경로(`/ifa-oracle.html`)와
 * 이미 슬래시로 끝나는 경로, 루트, 외부/프로토콜 상대 URL 은 대상이 아니다.
 */
function needsTrailingSlash(value) {
  const raw = String(value || "");
  if (!raw.startsWith("/") || raw.startsWith("//")) return false;
  const cut = raw.search(/[?#]/);
  const pathname = cut < 0 ? raw : raw.slice(0, cut);
  if (pathname === "/" || pathname === "") return false;
  if (pathname.endsWith("/")) return false;
  return !/\.[a-z0-9]+$/i.test(pathname);
}

function offenders(source, pattern) {
  const out = [];
  const re = new RegExp(pattern, "g");
  let match;
  while ((match = re.exec(source)) !== null) {
    if (needsTrailingSlash(match[1])) out.push(match[1]);
  }
  return [...new Set(out)];
}

test("홈 셸의 내부 링크에는 후행 슬래시가 붙어 있다", () => {
  const shell = read("index.html");

  for (const [label, pattern] of [
    ["href", '\\shref="([^"]*)"'],
    ["data-fallback-href", '\\sdata-fallback-href="([^"]*)"'],
    ["data-service-detail-href", '\\sdata-service-detail-href="([^"]*)"'],
  ]) {
    const found = offenders(shell, pattern);
    assert.deepEqual(
      found,
      [],
      `index.html 의 ${label} 에 슬래시 없는 내부 링크가 있다(각각 308 을 한 번 탄다): ${found.join(" ")}`,
    );
  }
});

test("푸터 링크에는 후행 슬래시가 붙어 있다", () => {
  // 두 파일이 같이 가야 한다 — locale-footer.static.test.js 가 두 집합이 일치하는지 본다.
  const footer = offenders(read("app/components/SiteFooterHub.jsx"), '\\bhref:\\s*"([^"]*)"');
  assert.deepEqual(footer, [], `SiteFooterHub 에 슬래시 없는 링크가 있다: ${footer.join(" ")}`);

  const copy = offenders(read("lib/i18n/siteFooterHubCopy.ts"), '"(/[^"]*)"');
  assert.deepEqual(copy, [], `siteFooterHubCopy 에 슬래시 없는 링크가 있다: ${copy.join(" ")}`);
});

/**
 * 🔴 이 테스트가 지키는 회귀에는 **에러도 로그도 없다.**
 *
 * cdResolveLocalizedFeatureHref 는 경로를 `=== '/insights'` 처럼 슬래시 없는 값과 비교한다.
 * 내부 링크에 슬래시를 붙이면서 이 비교를 함께 고치지 않으면 전부 조용히 false 가 되고,
 * ja/zh/en 사용자가 자기 언어 페이지 대신 한국어 페이지로 간다. 사용자 제보로만 발견된다.
 *
 * 반대로 비교하려고 슬래시를 떼어 그 값을 그대로 이동 경로로 쓰면 이번엔 308 을 한 번 더 탄다.
 * 그래서 비교용(comparePath)과 이동용(basePath)을 분리했고, 여기서 그 동작을 직접 실행해 본다.
 */
function loadLocaleHrefResolver() {
  const source = read("js/core/index-inline-runtime.js");
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

test("로케일 링크 재작성이 후행 슬래시를 보존하면서 언어 프리픽스를 붙인다", () => {
  const resolve = loadLocaleHrefResolver();

  // 슬래시가 붙은 링크도 로케일 페이지로 가야 한다(안 고치면 한국어 페이지로 샌다).
  const ja = resolve("/insights/", "ja");
  assert.notEqual(ja, "/insights/", "슬래시가 붙으면 로케일 재작성이 통째로 죽는다");
  assert.ok(ja.endsWith("/insights/"), `이동 경로의 후행 슬래시가 사라졌다(308 을 한 번 더 탄다): ${ja}`);

  const zh = resolve("/insights/", "zh");
  assert.notEqual(zh, "/insights/");
  assert.ok(zh.endsWith("/insights/"), `후행 슬래시가 사라졌다: ${zh}`);

  // 이미 로케일 프리픽스가 붙은 링크도 슬래시를 잃지 않는다.
  assert.equal(resolve("/ja/insights/", "ja"), "/ja/insights/");

  // 한국어는 프리픽스가 없으므로 그대로 둔다.
  assert.equal(resolve("/insights/", "ko"), "/insights/");

  // 대상이 아닌 경로는 건드리지 않는다.
  assert.equal(resolve("/saju/", "ja"), "/saju/");

  // standalone HTML 경로는 쿼리로 언어를 넘긴다 — 슬래시가 붙어도 판정이 살아 있어야 한다.
  assert.match(resolve("/vedic-ai/", "ja"), /^\/vedic-ai\/\?lang=ja$/);
});
