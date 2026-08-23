/**
 * 인덱스 드롭 마이그레이션의 안전 조건 가드.
 *
 * 이 스크립트는 저장소에서 유일하게 **인덱스를 지우는** 코드다. 잘못 지우면 되돌리는 비용이
 * 크고(재빌드), 유니크를 지우면 되돌려도 그 사이 들어온 중복이 남는다. 그래서 "무엇을 지우는가"
 * 보다 "무엇을 절대 안 지키면 안 되는가"를 여기서 고정한다.
 *
 * 🔴 특히 unique 차단이 핵심이다. $indexStats 의 accesses.ops 는 **조회 계획에 쓰인 횟수**라,
 *    쓰기 시 유니크 제약 강제는 여기 잡히지 않는다. 그래서 살아 있는 제약이 ops=0 으로 보인다 —
 *    2026-08-24 실측에서 pointhistories.dedupeKey_1 · content_entitlements.permanent_unlock_identity
 *    · payments 의 멱등 인덱스가 전부 ops=0 이었다. ops 만 보고 지우면 그것들이 사라진다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(
  path.join(root, "scripts/migrations/20260824-drop-unused-secondary-indexes.mjs"),
  "utf8",
);

test("제약 인덱스 4종과 _id_ 를 모두 차단한다", () => {
  const required = [
    ['found.name === "_id_"', "_id_"],
    ["found.unique === true", "unique"],
    ["found.expireAfterSeconds !== undefined", "TTL"],
    ["found.partialFilterExpression !== undefined", "partial"],
    ["found.sparse === true", "sparse"],
  ];
  for (const [needle, label] of required) {
    assert.ok(source.includes(needle), `${label} 차단이 사라졌다 — ops=0 만 보고 제약을 지우게 된다`);
  }
});

test("사용 중인 인덱스는 드롭하지 않는다", () => {
  assert.ok(source.includes("if (ops !== 0)"), "ops>0 인덱스를 드롭하지 않는다는 검사가 사라졌다");
  assert.ok(source.includes("$indexStats"), "런타임 사용량 확인이 사라졌다 — 목록만 믿게 된다");
});

test("관측 창이 짧으면 드롭하지 않는다", () => {
  // 카운터는 노드 재시작·페일오버·인덱스 재생성에서 0으로 돌아간다. 그 직후의 ops=0 은
  // "안 쓰인다"가 아니라 "방금 세기 시작했다"이다.
  assert.ok(source.includes("MIN_OBSERVATION_DAYS"), "최소 관측 기간 검사가 사라졌다");
  assert.match(source, /days < MIN_OBSERVATION_DAYS/, "관측 기간 비교가 사라졌다");
  const declared = source.match(/const MIN_OBSERVATION_DAYS = (\d+)/);
  assert.ok(declared, "MIN_OBSERVATION_DAYS 선언을 못 찾았다");
  assert.ok(Number(declared[1]) >= 7, `관측 기간이 너무 짧다 (${declared[1]}일)`);
});

test("접두 중복 주장은 런타임에 실제로 접두인지 확인한다", () => {
  // 덮는 인덱스가 사라졌는데 목록만 남아 있으면, 중복이 아니라 유일한 인덱스를 지우게 된다.
  assert.ok(source.includes("findCoveringIndex"), "접두 확인 함수가 사라졌다");
  assert.match(
    source,
    /if \(!covering\)[\s\S]{0,120}blocked: true/,
    "덮는 인덱스가 없을 때 차단하지 않는다",
  );
});

test("목록과 실제 상태가 어긋나면 실패로 끝낸다", () => {
  assert.match(
    source,
    /if \(blocked > 0\) process\.exitCode = 1/,
    "차단이 있어도 성공으로 보고한다 — 목록이 조용히 썩는다",
  );
});

test("드롭 대상에 제약 인덱스 이름이 섞여 있지 않다", () => {
  // 2026-08-24 실측에서 ops=0 이었던 살아 있는 제약들. 목록에 이름으로도 들어오면 안 된다.
  const forbidden = [
    "dedupeKey_1",
    "permanent_unlock_identity",
    "userId_1_idempotencyKey_1_paymentType_1",
    "expiresAt_1",
  ];
  const targets = source.slice(source.indexOf("const TARGETS = ["), source.indexOf("/** 키가 후보"));
  for (const name of forbidden) {
    assert.ok(!targets.includes(`"${name}"`), `제약 인덱스가 드롭 목록에 있다: ${name}`);
  }
});
