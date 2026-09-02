/**
 * 초융합 결제 화면의 가치 섹션이 셸 카피 정본만 읽는지 고정한다.
 *
 * 왜 필요한가: `app/fusion-fortune/FusionValuePreview.tsx` 는 셸
 * `FEATURE_MARKETING_COPY['/fusion-fortune']` 의 문장을 손으로 베낀 사본을 들고 있었다.
 * 셸이 저작을 갱신하는 동안 그 사본만 그대로 남아, 같은 상품이 홈 상세 시트와 결제 화면에서
 * 서로 다른 신뢰 문구를 말했다(실측: trustNotes 4줄 중 1줄이 갈려 있었다). 사본을 지우는
 * 것만으로는 부족하다 — 다음 세션이 "한 줄만 여기서 고치면 되는데" 로 같은 포크를 다시 만든다.
 *
 * 🔴 가드 자리: `verify:feature-marketing-schema` 는 `scripts/verify-guard-wiring.mjs` 에
 * "배선 후보(미승인)" 으로 선언돼 CI 에서 돌지 않는다. `test:node` 는 pr-ci fast 잡에서
 * 상시 돌므로 여기에 둔다(선례: `feature-marketing-copy-generated.static.test.js`).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_REL = "app/fusion-fortune/FusionValuePreview.tsx";
const COPY_KEY = "/fusion-fortune";

const source = readFileSync(path.resolve(ROOT, SOURCE_REL), "utf8");
const book = JSON.parse(readFileSync(path.resolve(ROOT, "lib/marketing/feature-marketing-copy.generated.json"), "utf8"));
const entry = book.items[COPY_KEY];

/* 2~3글자 조각("시기"·"분량"·"없음")은 결과 구성 목록 같은 무관한 문장에도 흔히 들어간다.
   포크 재발을 보려는 것이므로 문장 길이 이상만 본다. */
const SENTENCE_MIN = 12;

function canonicalSentences() {
  assert.ok(entry, `${COPY_KEY}: 생성 JSON 에 카피 항목이 없습니다 — 셸 키가 바뀌었는지 확인하세요.`);
  const copy = entry.copy || {};
  const rows = (copy.valueCompare && copy.valueCompare.rows) || [];
  return [
    copy.previewText,
    ...(copy.answersQuestions || []),
    ...(copy.trustNotes || []),
    ...rows.flatMap((row) => [row.axis, row.free, row.premium]),
  ].filter((line) => typeof line === "string" && line.length >= SENTENCE_MIN);
}

test("셸 카피 항목이 화면이 읽는 네 필드를 모두 채우고 있다", () => {
  assert.ok(entry, `${COPY_KEY}: 생성 JSON 에 카피 항목이 없습니다.`);
  const copy = entry.copy || {};
  assert.ok(
    typeof copy.previewText === "string" && copy.previewText.length > 0,
    `${COPY_KEY}.previewText 가 비었습니다 — 결제 화면 리드 문단이 통째로 빕니다.`,
  );
  assert.ok((copy.answersQuestions || []).length > 0, `${COPY_KEY}.answersQuestions 가 비었습니다.`);
  assert.ok((copy.trustNotes || []).length > 0, `${COPY_KEY}.trustNotes 가 비었습니다.`);
  assert.ok(
    ((copy.valueCompare || {}).rows || []).length > 0,
    `${COPY_KEY}.valueCompare.rows 가 비었습니다 — 무료/유료 비교표가 머리글만 남습니다.`,
  );
});

test("가치 섹션이 생성 JSON 을 읽는다", () => {
  assert.match(
    source,
    /import\s+\w+\s+from\s+"@\/lib\/marketing\/feature-marketing-copy\.generated\.json"/,
    `${SOURCE_REL} 가 생성 카피 JSON 을 import 하지 않습니다 — 문구 정본은 셸입니다.`,
  );
  assert.ok(
    source.includes(`items["${COPY_KEY}"]`),
    `${SOURCE_REL} 가 items["${COPY_KEY}"] 를 읽지 않습니다 — 카피 키가 바뀌었다면 셸과 함께 고치세요.`,
  );
});

test("서버 컴포넌트로 남아 있다", () => {
  assert.ok(
    !/^\s*["']use client["']/m.test(source),
    `${SOURCE_REL} 에 "use client" 가 붙으면 400KB 생성 JSON 이 클라이언트 번들에 실립니다.`,
  );
});

test("손으로 베낀 카피 사본이 다시 생기지 않았다", () => {
  for (const name of ["ANSWERS_QUESTIONS", "VALUE_COMPARE", "TRUST_NOTES"]) {
    assert.ok(
      !new RegExp(`const\\s+${name}\\b`).test(source),
      `${SOURCE_REL} 에 ${name} 사본이 다시 생겼습니다 — 셸 정본(생성 JSON)에서 읽으세요.`,
    );
  }
  const sentences = canonicalSentences();
  assert.ok(sentences.length > 0, "대조할 셸 문장을 하나도 못 모았습니다 — 이 검사가 무의미해집니다.");
  const inlined = sentences.filter((line) => source.includes(line));
  assert.deepEqual(
    inlined,
    [],
    `${SOURCE_REL} 에 셸 카피 문장이 축자로 박혀 있습니다(셸만 고치면 이 화면은 안 바뀝니다): ${inlined.join(" / ")}`,
  );
});

test("결과 구성 목록은 셸 카피가 아니라 렌더 순서로 남아 있다", () => {
  assert.match(
    source,
    /const\s+RESULT_BLOCKS\b/,
    `${SOURCE_REL} 의 RESULT_BLOCKS 는 FusionResultThread 의 렌더 순서입니다 — 마케팅 카피로 대체하지 마세요.`,
  );
  assert.ok(
    !/\.analysisSteps\b/.test(source),
    `${SOURCE_REL} 가 카피의 analysisSteps(7개 체계 요약)로 결과 구성 목록을 대체했습니다 — 실제 렌더 블록은 그것과 다릅니다.`,
  );
});
