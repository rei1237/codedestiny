/**
 * 유명인 사주 별칭 → 정본 리다이렉트 맵의 계약.
 *
 * 2026-06-04 `9396dc8ce` 가 정본만 프리렌더하도록 고치면서 별칭 URL 169개가 404 로 남았고,
 * `/famous-saju/<별칭>` 은 _redirects 의 :slug 규칙을 타고 그 404 로 들어갔다.
 * public/famous-saju-aliases.json 이 그 URL 을 회수한다.
 *
 * 여기서 지키는 것은 두 가지다:
 *   ① 별칭이 **살아 있는 정본 슬러그를 가리지 않는다** — 가리면 상세 페이지가 자기 자신으로
 *      301 되어 무한 루프가 된다.
 *   ② 목적지가 전부 실재하는 인물이다 — 아니면 301 이 404 로 들어간다(고치려던 그 결함).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const aliases = JSON.parse(fs.readFileSync(path.join(root, "public/famous-saju-aliases.json"), "utf8"));
const celebritySource = fs.readFileSync(path.join(root, "lib/famous-saju/celebrity-data.ts"), "utf8");

const seedBlock = celebritySource.slice(
  celebritySource.indexOf("const rawSeeds"),
  celebritySource.indexOf("const famousSajuOverrides"),
);
const canonicalSlugs = new Set(
  seedBlock
    .split("\n")
    .map((line) => (line.match(/^\s*\["([^"]+)",/) || [])[1])
    .filter(Boolean),
);

test("별칭 맵이 비어 있지 않다", () => {
  assert.ok(Object.keys(aliases).length > 0, "별칭 0개면 워커가 아무것도 회수하지 않는다");
  assert.ok(canonicalSlugs.size > 0, "celebrity-data.ts 파싱이 깨졌다");
});

test("🔴 별칭이 정본 슬러그를 가리지 않는다 (무한 루프 방지)", () => {
  const shadowing = Object.keys(aliases).filter((alias) => canonicalSlugs.has(alias));
  assert.deepEqual(shadowing, [], `살아 있는 상세 페이지를 가리는 별칭: ${shadowing.join(", ")}`);
});

test("모든 목적지가 실재하는 정본 인물이다", () => {
  const dangling = [...new Set(Object.values(aliases))].filter((slug) => !canonicalSlugs.has(slug));
  assert.deepEqual(dangling, [], `301 이 404 로 들어가는 목적지: ${dangling.join(", ")}`);
});

test("목적지가 다시 별칭이 아니다 (2홉 체인 방지)", () => {
  const chained = Object.entries(aliases).filter(([, target]) => aliases[target]);
  assert.deepEqual(chained, [], `리다이렉트가 두 번 걸리는 별칭: ${chained.map(([a]) => a).join(", ")}`);
});

test("워커가 이 맵을 같은 경로 규칙으로 읽는다", () => {
  const worker = fs.readFileSync(path.join(root, "public/_worker.js"), "utf8");
  assert.ok(worker.includes("famous-saju-aliases.json"), "워커가 별칭 맵을 읽지 않는다");
  assert.ok(
    worker.includes('const FAMOUS_SAJU_PREFIX = "/insights/famous-saju/"'),
    "워커의 접두사가 바뀌었다 — 맵의 키는 그 접두사 아래 한 세그먼트를 가정한다",
  );
  assert.ok(
    worker.includes("@routes-include: /insights/famous-saju/*"),
    "_routes.json 연결 마커가 없으면 워커가 이 경로에서 실행되지 않는다",
  );
});
