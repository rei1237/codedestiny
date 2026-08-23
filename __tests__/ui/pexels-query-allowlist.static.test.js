/**
 * `/api/pexels-image` 허용목록 ↔ 클라이언트 문구의 드리프트 가드.
 *
 * 워커는 `?query=` 를 허용목록으로만 받는다. 목록에 없으면 거부가 아니라 섹션 기본값으로
 * 접히므로, 드리프트가 나도 500 이 뜨지 않고 **해당 인물 카드만 조용히 일반 우주 이미지로
 * 바뀐다.** 조용하기 때문에 여기서 잡는다.
 *
 * 허용목록을 둔 이유: 이 라우트는 인증도 레이트리밋도 없는데, 캐시 키가 사용자 쿼리에서
 * 파생되고 미스마다 Pexels 유료 쿼터를 태웠다. 목록이 상류 호출 종류를 상수 개수로 묶는다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const clientSource = fs.readFileSync(path.join(root, "js/inline/saju-core-bootstrap.js"), "utf8");
const workerSource = fs.readFileSync(path.join(root, "worker/index.js"), "utf8");

/** 한 줄에서 첫 따옴표 쌍 안의 값을 꺼낸다(정규식 없이 — 이스케이프가 없는 리터럴만 대상). */
function quoted(line) {
  for (const quote of ["'", '"']) {
    const start = line.indexOf(quote);
    if (start === -1) continue;
    const end = line.indexOf(quote, start + 1);
    if (end > start) return line.slice(start + 1, end);
  }
  return "";
}

function sliceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `블록 시작을 찾지 못했다: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `블록 끝을 찾지 못했다: ${endMarker}`);
  return source.slice(start, end);
}

const clientQueries = sliceBlock(clientSource, "function _famousPexelsQuery(", "\n}")
  .split("\n")
  // 대부분이 `if (...) return '문구';` 한 줄이라 startsWith 로는 마지막 한 줄만 잡힌다.
  .filter((line) => line.includes("return "))
  .map(quoted)
  .filter(Boolean);

const workerQueries = sliceBlock(workerSource, "const PEXELS_FAMOUS_QUERIES = [", "];")
  .split("\n")
  .filter((line) => line.trim().startsWith('"'))
  .map(quoted)
  .filter(Boolean);

test("클라이언트가 보내는 문구가 하나도 빠짐없이 워커 허용목록에 있다", () => {
  assert.ok(clientQueries.length >= 5, `_famousPexelsQuery 의 문구를 못 읽었다 (${clientQueries.length}개)`);
  const allowed = new Set(workerQueries);
  const missing = clientQueries.filter((query) => !allowed.has(query));
  assert.deepEqual(
    missing,
    [],
    `워커 PEXELS_FAMOUS_QUERIES 에 없는 클라이언트 문구가 있다 — 해당 카드가 조용히 기본 이미지로 바뀐다: ${missing.join(" | ")}`,
  );
});

test("워커 허용목록에 클라이언트가 더 이상 보내지 않는 문구가 남아 있지 않다", () => {
  const sent = new Set(clientQueries);
  const stale = workerQueries.filter((query) => !sent.has(query));
  assert.deepEqual(stale, [], `클라이언트가 보내지 않는 죽은 문구: ${stale.join(" | ")}`);
});

test("허용목록이 실제로 쿼리 판정에 쓰인다", () => {
  assert.ok(
    workerSource.includes("PEXELS_ALLOWED_QUERIES.has(query)"),
    "normalizePexelsQuery 가 허용목록을 거치지 않는다 — 목록만 남고 게이트가 사라졌다",
  );
});

test("이미지 캐시에 상한이 선언돼 있다", () => {
  assert.ok(
    workerSource.includes("PEXELS_IMAGE_ROUTE_CACHE_MAX_ENTRIES"),
    "PEXELS_IMAGE_ROUTE_CACHE 의 상한이 사라졌다 — 맵이 다시 무한히 자란다",
  );
});
