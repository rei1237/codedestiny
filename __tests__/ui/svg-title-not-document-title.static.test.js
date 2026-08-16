/**
 * SVG `<title>` 이 문서 `<title>` 로 집계되는 것을 막는다.
 *
 * 2026-08-16 실측: `/nakshatra/` 산출물에 `<title>` 이 3개였다 — Next metadata 1개 +
 * `<svg role="img">` 안의 2개. 네이버 서치어드바이저가 "`<title>` 요소가 2개 이상 발견" 으로
 * 잡은 것이 이것이다. 파서는 SVG 네임스페이스를 구분하지 않는다.
 *
 * `role="img"` 그래픽의 접근명은 `aria-label` 로도 똑같이 전달되므로, 접근성을 잃지 않고
 * 파서 오독만 없앨 수 있다. 아래 EXCEPTIONS 에 없는 새 `<title>` JSX 가 생기면 실패한다 —
 * 예외는 **인라인으로 사유와 함께** 선언해야 하고, 목록이 비면(=대상 발견 실패) 그것도 실패다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const SEARCH_DIRS = ["app", "components", "src"];

// 🔴 예외는 "왜 남겨 두는가" 를 적는다. 지금 하나뿐이고, 이건 문서 title 이 아니라
// 마우스 오버 툴팁이다 — 27개 수(宿) 각각의 한글 독음을 hover 로 보여준다.
// 없애면 그 툴팁이 사라지므로(기존 기능 제거) 사용자 판단 없이는 건드리지 않는다.
// 대신 이 예외가 선언돼 있다는 사실 자체가 "여기는 아직 남아 있다" 는 신호다.
const EXCEPTIONS = new Map([
  ["components/fortune/SukuyoWheel.tsx", "27수 세그먼트의 hover 툴팁 — 제거하면 UX 기능이 사라진다. 색인 영향은 /sukuyo-compatibility-ai 한 페이지"],
]);

function walk(dir, out = []) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx|jsx|js|ts)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const files = walk(SEARCH_DIRS[0]).concat(walk(SEARCH_DIRS[1]), walk(SEARCH_DIRS[2]));

test("검사 대상 파일을 실제로 찾았다 (fail-closed)", () => {
  assert.ok(files.length > 100, `대상이 ${files.length}개뿐이다 — 탐색이 깨졌다`);
});

test("선언된 예외는 실제로 아직 <title> 을 갖고 있다", () => {
  for (const [rel, reason] of EXCEPTIONS) {
    const full = path.join(root, rel);
    assert.ok(fs.existsSync(full), `예외 목록이 없는 파일을 가리킨다: ${rel}`);
    assert.match(
      fs.readFileSync(full, "utf8"),
      /<title>/,
      `${rel} 은 더 이상 <title> 이 없다 — 예외 선언을 지울 것 (${reason})`,
    );
  }
});

test("🔴 예외 밖에서 SVG <title> 이 새로 생기지 않는다", () => {
  const offenders = [];
  for (const rel of files) {
    const normalized = rel.split(path.sep).join("/");
    if (EXCEPTIONS.has(normalized)) continue;
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    if (/<title>/.test(source)) offenders.push(normalized);
  }
  assert.deepEqual(
    offenders,
    [],
    `SVG <title> 은 문서 title 로 집계된다. aria-label 로 옮길 것: ${offenders.join(", ")}`,
  );
});
