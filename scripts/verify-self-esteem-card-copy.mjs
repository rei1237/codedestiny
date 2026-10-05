// 자기 기준 회복 타로(정적 셸 자존감 모달) 카드별 문구 회귀 검증.
//
// 과거 결함: 리딩이 카드와 무관한 위치별 고정 템플릿이라, 어떤 카드를 뽑아도 거의 같은 문장이 나왔다.
// js/tarot-self-esteem-card-copy.js 가 156개 조합을 전부 갖고 서로 다른 문장을 유지하는지 지킨다.
//
//   1. 커버리지 — TAROT_CARDS 78장 × 정/역 = 156개 조합 전부 엔트리 존재
//   2. 형식 — keywords 정확히 3개, 텍스트 필드 4종 최소 길이 충족
//   3. 중복 0 — 텍스트 필드 4종이 156개 전부 상이
//   4. 금지 표현 — 이모지·확정 예언·공포 조장 어휘 없음
//   5. 키워드 분산 — 같은 키워드가 과도하게 재사용되지 않음
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { TAROT_CARDS } from "../lib/tarot/tarot-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "js", "tarot-self-esteem-card-copy.js");

// 브라우저 classic script 그대로 실행해 window.__TSE_CARD_COPY__ 를 읽는다.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(SOURCE, "utf8"), sandbox, { filename: SOURCE });
const COPY = sandbox.window.__TSE_CARD_COPY__;
assert.ok(COPY && typeof COPY === "object", "window.__TSE_CARD_COPY__ 가 정의되지 않음");

const ORIENTATIONS = ["upright", "reversed"];
const TEXT_FIELDS = ["mirror", "wound", "strength", "practice"];
const MIN_LENGTH = { mirror: 70, wound: 25, strength: 20, practice: 25 };
const FORBIDDEN = [
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
  /무조건/,
  /틀림없이/,
  /100\s*%/,
  /저주/,
  /불행해질/,
  /반드시\s*(?:이루어|일어|성공)/,
];

const squash = (value) => String(value || "").replace(/\s+/g, " ").trim();

assert.equal(TAROT_CARDS.length, 78, "카드 DB가 78장이어야 함");
const expectedCombos = TAROT_CARDS.length * ORIENTATIONS.length;
assert.equal(Object.keys(COPY).length, TAROT_CARDS.length, "문구 표의 카드 수가 카드 DB와 달라짐");

const seen = new Map(TEXT_FIELDS.map((field) => [field, new Map()]));
const keywordUsage = new Map();
let comboCount = 0;

for (const card of TAROT_CARDS) {
  const entry = COPY[card.code];
  assert.ok(entry, `자존감 문구 누락: ${card.code} (${card.nameKo})`);
  for (const orientation of ORIENTATIONS) {
    const label = `${card.code}.${orientation}(${card.nameKo})`;
    const copy = entry[orientation];
    assert.ok(copy, `자존감 문구 누락: ${label}`);
    comboCount += 1;

    assert.ok(Array.isArray(copy.keywords), `keywords 배열 아님: ${label}`);
    assert.equal(copy.keywords.length, 3, `keywords는 정확히 3개여야 함: ${label}`);
    for (const keyword of copy.keywords) {
      assert.ok(squash(keyword).length >= 2, `빈 키워드: ${label}`);
      keywordUsage.set(keyword, (keywordUsage.get(keyword) || 0) + 1);
    }

    for (const field of TEXT_FIELDS) {
      const text = squash(copy[field]);
      assert.ok(
        text.length >= MIN_LENGTH[field],
        `${field}가 너무 짧음(${text.length}자 < ${MIN_LENGTH[field]}): ${label}`,
      );
      for (const pattern of [...FORBIDDEN]) {
        assert.ok(!pattern.test(text), `금지 표현 ${pattern} — ${label}.${field}`);
      }
      const bucket = seen.get(field);
      const previous = bucket.get(text);
      assert.ok(!previous, `${field} 문장 중복 — ${previous} 와 ${label} 이 동일`);
      bucket.set(text, label);
    }
  }
}
assert.equal(comboCount, expectedCombos, `156개 조합이 모두 있어야 함 (현재 ${comboCount})`);

const KEYWORD_REUSE_LIMIT = 4;
for (const [keyword, count] of keywordUsage) {
  assert.ok(
    count <= KEYWORD_REUSE_LIMIT,
    `키워드 "${keyword}"가 ${count}개 조합에서 재사용됨(상한 ${KEYWORD_REUSE_LIMIT})`,
  );
}

console.log(
  `verify-self-esteem-card-copy: OK (${expectedCombos}개 조합 커버리지·형식·중복 0·금지 표현·키워드 분산 통과)`,
);
