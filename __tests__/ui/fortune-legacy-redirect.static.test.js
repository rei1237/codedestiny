/**
 * public/_worker.js 의 /fortune/** 레거시 리다이렉트 매처.
 *
 * 이 매처는 `_redirects` 예산(첫 102개 규칙만 적용된다 — 2026-08-16 실측)에 들어가지 못한
 * 108개 리다이렉트를 대신한다. 여기서 지켜야 하는 계약은 하나다:
 *   **살아 있는 사이트맵 라우트를 절대 삼키지 않는다.**
 * 리다이렉트는 정적 에셋을 이기므로(실측), 매칭이 한 칸만 넓어져도
 * /fortune/{period}/{sign}/ 96개가 통째로 색인에서 사라진다.
 *
 * _worker.js 는 ESM 이고 레포는 commonjs 라 require 할 수 없다. 그래서 소스에서 해당
 * 선언부만 잘라 vm 으로 평가한다 — access-store.static.test.js 와 같은 방식이다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const workerSource = fs.readFileSync(path.join(root, "public/_worker.js"), "utf8");

const startMarker = "const FORTUNE_PERIODS =";
const endMarker = "\n}\n";
const start = workerSource.indexOf(startMarker);
assert.notEqual(start, -1, "public/_worker.js 에서 FORTUNE_PERIODS 선언을 찾지 못했다");
const functionStart = workerSource.indexOf("function fortuneLegacyTarget", start);
assert.notEqual(functionStart, -1, "public/_worker.js 에서 fortuneLegacyTarget 을 찾지 못했다");
const end = workerSource.indexOf(endMarker, functionStart);
assert.notEqual(end, -1, "fortuneLegacyTarget 본문의 끝을 찾지 못했다");

const sandbox = { module: {} };
vm.createContext(sandbox);
vm.runInContext(
  `${workerSource.slice(start, end + endMarker.length)}\nmodule.exports = fortuneLegacyTarget;`,
  sandbox,
);
const fortuneLegacyTarget = sandbox.module.exports;

test("구 정적 셸 .html 은 App Router 경로로 보낸다", () => {
  assert.equal(fortuneLegacyTarget("/fortune/today/aries.html"), "/fortune/today/aries/");
  assert.equal(fortuneLegacyTarget("/fortune/tomorrow/pig.html"), "/fortune/tomorrow/pig/");
  assert.equal(fortuneLegacyTarget("/fortune/weekly/rat.html"), "/fortune/weekly/rat/");
  assert.equal(fortuneLegacyTarget("/fortune/monthly/aquarius.html"), "/fortune/monthly/aquarius/");
});

test("삭제된 운세 시스템 페이지는 체계별 정본 허브로 보낸다", () => {
  assert.equal(fortuneLegacyTarget("/fortune/today/sukuyo/"), "/sukuyo/");
  assert.equal(fortuneLegacyTarget("/fortune/monthly/sukuyo/anything/deeper"), "/sukuyo/");
  assert.equal(fortuneLegacyTarget("/fortune/weekly/vedic"), "/vedic/");
  assert.equal(fortuneLegacyTarget("/fortune/tomorrow/ziwei/x"), "/ziwei/");
});

test("🔴 살아 있는 라우트는 하나도 매칭하지 않는다", () => {
  for (const livePath of [
    "/fortune/",
    "/fortune/today/",
    "/fortune/today/aries/",
    "/fortune/monthly/pig/",
    "/fortune/weekly/capricorn/",
    "/fortune/sikojen-povailu/",
    "/fortune/share/",
  ]) {
    assert.equal(fortuneLegacyTarget(livePath), null, `${livePath} 는 리다이렉트되면 안 된다`);
  }
});

test("사이트맵 전체와 교집합이 0이다", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].replace(/^https?:\/\/[^/]+/, ""),
  );
  assert.ok(paths.length > 0, "사이트맵에서 URL 을 읽지 못했다");
  const swallowed = paths.filter((livePath) => fortuneLegacyTarget(livePath) !== null);
  assert.deepEqual(swallowed, [], `사이트맵 라우트를 삼킨다: ${swallowed.slice(0, 5).join(", ")}`);
});

test("기간이 아닌 세그먼트는 건드리지 않는다", () => {
  assert.equal(fortuneLegacyTarget("/fortune/yearly/aries.html"), null);
  assert.equal(fortuneLegacyTarget("/fortune/aries.html"), null);
  assert.equal(fortuneLegacyTarget("/insights/today/aries.html"), null);
  assert.equal(fortuneLegacyTarget("/"), null);
});
