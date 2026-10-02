/**
 * public/_worker.js 의 404 회수 리다이렉트 두 갈래.
 *   1. 폐지된 로케일 프리픽스(de-de·es-es·fr-fr·hi-in·ms-my·nl-nl) → 한국어 원본 / 영어 홈
 *   2. 30일 창 밖으로 밀려난 /fortune/date/<날짜>/<사인>/ → /fortune/today/<사인>/
 *
 * 2026-10-03 실측: 과거 사이트맵 URL 중 운영 404 가 973개였고 그중 684개가 (1), 252개가 (2)였다.
 *
 * 🔴 살아 있는 로케일(/en/ /ja/ /zh/ /zh-tw/)과 비슷한 이름을 삼키면 안 된다.
 * fortune-legacy-redirect.static.test.js 와 같은 방식으로 선언부만 잘라 vm 으로 평가한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const workerSource = fs.readFileSync(path.join(root, "public/_worker.js"), "utf8");

const start = workerSource.indexOf("const LEGACY_LOCALE_TARGETS =");
assert.notEqual(start, -1, "public/_worker.js 에서 LEGACY_LOCALE_TARGETS 를 찾지 못했다");
const lastFn = workerSource.indexOf("function expiredFortuneDateTarget", start);
assert.notEqual(lastFn, -1, "public/_worker.js 에서 expiredFortuneDateTarget 을 찾지 못했다");
const end = workerSource.indexOf("\n}\n", lastFn);
assert.notEqual(end, -1, "expiredFortuneDateTarget 본문의 끝을 찾지 못했다");

const sandbox = { module: {} };
vm.createContext(sandbox);
vm.runInContext(
  `${workerSource.slice(start, end + 3)}\nmodule.exports = { legacyLocaleTarget, expiredFortuneDateTarget };`,
  sandbox,
);
const { legacyLocaleTarget, expiredFortuneDateTarget } = sandbox.module.exports;

test("폐지 로케일 하위 경로는 프리픽스를 떼고 정본 슬래시를 붙인다", () => {
  assert.equal(legacyLocaleTarget("/de-de/insights/astrology-vs-saju-differences"), "/insights/astrology-vs-saju-differences/");
  assert.equal(legacyLocaleTarget("/nl-nl/tarot/love/"), "/tarot/love/");
  assert.equal(legacyLocaleTarget("/hi-in/about"), "/about/");
  assert.equal(legacyLocaleTarget("/ms-my/destiny-poker.html"), "/destiny-poker.html");
});

test("폐지 로케일 루트는 영어 홈으로 보낸다", () => {
  for (const locale of ["de-de", "es-es", "fr-fr", "hi-in", "ms-my", "nl-nl"]) {
    assert.equal(legacyLocaleTarget(`/${locale}`), "/en/");
    assert.equal(legacyLocaleTarget(`/${locale}/`), "/en/");
  }
});

test("기존 high-value 정확 매핑이 일반 규칙보다 먼저다", () => {
  assert.equal(legacyLocaleTarget("/de-de/high-value"), "/guides/");
  assert.equal(legacyLocaleTarget("/es-es/high-value/"), "/guides/");
});

test("🔴 살아 있는 경로와 비슷한 이름은 매칭하지 않는다", () => {
  for (const livePath of ["/", "/en/", "/ja/insights/x/", "/zh-tw/", "/de-den/", "/fr-fresh/", "/de/", "/saju/"]) {
    assert.equal(legacyLocaleTarget(livePath), null, livePath);
  }
});

test("날짜별 운세는 같은 사인의 오늘 운세로만 매핑한다", () => {
  assert.equal(expiredFortuneDateTarget("/fortune/date/2026-08-01/rat/"), "/fortune/today/rat/");
  assert.equal(expiredFortuneDateTarget("/fortune/date/2026-08-01/pig"), "/fortune/today/pig/");
  for (const other of ["/fortune/date/", "/fortune/date/2026-08-01/", "/fortune/today/rat/", "/fortune/date/2026-08-01/rat/extra/"]) {
    assert.equal(expiredFortuneDateTarget(other), null, other);
  }
});

test("날짜 리다이렉트는 자산 404 뒤에서만 실행된다(살아 있는 30일 창을 삼키지 않는다)", () => {
  const handler = workerSource.slice(workerSource.indexOf("export default {"));
  assert.match(handler, /assetResponse\.status === 404\)\s*\{\s*const expiredDateTarget = expiredFortuneDateTarget\(/);
});
