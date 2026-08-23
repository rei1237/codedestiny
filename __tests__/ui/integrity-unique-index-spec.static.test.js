/**
 * 정합성 유니크 인덱스 마이그레이션 ↔ 스키마 선언의 드리프트 가드.
 *
 * 🔴 같은 키를 **다른 옵션**으로 만들면 IndexOptionsConflict 로 죽는다. 이 레포에는 이미 그
 * 전례가 있다 — 20260802 과 20260810 이 pointhistories 에 같은 키를 다른 이름으로 선언해 두었고,
 * 지금 실물에는 후자만 존재한다. 마이그레이션이 worker/lib/models.js 의 선언과 어긋나면 운영자가
 * 승인까지 받고 실행한 뒤에야 그 사실을 알게 된다.
 *
 * 여기서는 실 DB 없이 확인할 수 있는 것만 본다 — 스키마 선언과 마이그레이션 소스가 같은 이름·같은
 * unique·같은 partialFilterExpression 을 말하는가.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const models = fs.readFileSync(path.join(root, "worker/lib/models.js"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "scripts/migrations/20260824-add-integrity-unique-indexes.mjs"),
  "utf8",
);

/** 공백만 제거해 비교한다 — 줄바꿈·들여쓰기 차이로 오탐이 나면 가드를 아무도 안 믿는다. */
function squash(value) {
  return value.replace(/\s+/g, "");
}

function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${label}: 시작 마커를 못 찾았다 (${startMarker})`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${label}: 끝 마커를 못 찾았다 (${endMarker})`);
  return source.slice(start, end);
}

test("paid_execution_records 의 partialFilterExpression 이 스키마 선언과 같다", () => {
  const declared = sliceBetween(
    models,
    'name: "paymentId_unique_nonempty"',
    ");",
    "models.js paidExecutionRecord",
  );
  const used = sliceBetween(
    migration,
    'name: "paymentId_unique_nonempty"',
    "groupKey",
    "migration paid_execution_records",
  );

  const filter = 'paymentId:{$exists:true,$type:"string",$gt:""}';
  assert.ok(squash(declared).includes(filter), `스키마 선언이 바뀌었다 — 마이그레이션도 함께 고칠 것: ${filter}`);
  assert.ok(squash(used).includes(filter), `마이그레이션의 partialFilterExpression 이 스키마와 어긋난다: ${filter}`);
  assert.ok(squash(declared).includes("unique:true"), "스키마 선언에서 unique 가 사라졌다");
  assert.ok(squash(used).includes("unique:true"), "마이그레이션에서 unique 가 사라졌다 — 제약이 아니라 그냥 인덱스가 된다");
});

test("astrologyAiConsultations.id 는 필드레벨 unique 이고 마이그레이션도 partial 을 붙이지 않는다", () => {
  const idField = sliceBetween(
    models,
    "const astrologyAiConsultationSchema",
    "userId:",
    "models.js astrologyAiConsultation",
  );
  assert.ok(squash(idField).includes("unique:true"), "astrologyAiConsultations.id 의 unique 선언이 사라졌다");

  const target = sliceBetween(
    migration,
    'label: "astrologyAiConsultations.id_1"',
    "},\n];",
    "migration astrologyAiConsultations",
  );
  assert.ok(squash(target).includes('options:{name:"id_1",unique:true}'), "마이그레이션의 옵션이 스키마와 어긋난다");
  // 🔴 스키마가 partial 을 안 쓰므로 여기도 붙이면 안 된다 — 붙이면 선언과 실물이 갈라진다.
  assert.ok(!target.includes("partialFilterExpression"), "필드레벨 선언에 없는 partialFilterExpression 이 붙었다");
});

test("두 항목 모두 중복 사전 스캔을 거친다", () => {
  // 중복이 있으면 createIndex 는 E11000 으로 죽는다. 사전 스캔이 빠지면 운영자는 어느 행이
  // 막고 있는지 모른 채 맨 드라이버 오류만 본다.
  assert.ok(migration.includes("scanDuplicates(target)"), "중복 사전 스캔 호출이 사라졌다");
  assert.match(
    migration,
    /if \(duplicateGroups > 0\)[\s\S]{0,120}return false/,
    "중복이 있는데도 인덱스 생성으로 넘어간다",
  );
  // 중복 정리는 정책 판단이라 이 스크립트가 하지 않는다.
  assert.ok(!/deleteOne|deleteMany|updateMany/.test(migration), "마이그레이션이 문서를 지우거나 고친다 — 정책 판단을 코드가 대신하면 안 된다");
});
