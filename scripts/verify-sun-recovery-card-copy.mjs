// 태양 회복 타로(healing_rising_four_card) 카드 문장 회귀 검증.
//
// 과거 결함: SUN_RECOVERY_CARD_COPY가 156개 조합 중 4개만 갖고 있어 나머지가 수트 5개
// 버킷으로 폴백했고, 그 결과 소드 14장 전부가 동일한 "오늘의 회복 행동"을 출력했다.
//
//   1. 커버리지 — TAROT_CARDS 78장 × 정/역 = 156개 조합 전부 엔트리 존재
//   2. 형식 — 필드 5종 존재, keywords 정확히 3개, 최소 길이 충족
//   3. 중복 0 — 실제 리딩 파이프라인 출력 기준으로 4개 텍스트 필드가 156개 전부 상이
//   4. 폴백 미발동 — 156개 조합 어디에서도 HEALING_SUIT_COPY 문장이 나오지 않음
//   5. 원문 보존 — cleanHealingLanguage 치환에 걸리는 어휘가 집필 원문에 없음
//   6. 키워드 분산 — 같은 키워드가 과도하게 재사용되지 않음
//   7. 최악 케이스 — 같은 수트 4장을 뽑아도 카드 문장·회복 루틴이 서로 다름
import assert from "node:assert/strict";
import { TAROT_CARDS } from "../lib/tarot/tarot-cards.mjs";
import { SUN_RECOVERY_CARD_COPY } from "../lib/tarot/sun-recovery-card-copy.mjs";
import {
  interpretTarotReading,
  buildLegacyReadingPayload,
  normalizeDrawnCardsForSpread,
} from "../lib/tarot/tarot-interpretation-engine.mjs";

const SPREAD = "healing_rising_four_card";
const ORIENTATIONS = ["upright", "reversed"];
const TEXT_FIELDS = ["shortMessage", "meaning", "shadow", "recoveryAdvice"];
const MIN_LENGTH = { shortMessage: 20, meaning: 80, shadow: 18, recoveryAdvice: 25 };

const squash = (value) => String(value || "").replace(/\s+/g, " ").trim();

function readHealing(drawn) {
  const normalized = normalizeDrawnCardsForSpread(SPREAD, drawn);
  const interpreted = interpretTarotReading({
    serviceKey: "verify-sun-recovery",
    questionType: "healing",
    spreadId: SPREAD,
    drawnCards: normalized,
  });
  return buildLegacyReadingPayload(interpreted, { spreadId: SPREAD });
}

// ── 1~2. 커버리지 & 형식 ──
assert.equal(TAROT_CARDS.length, 78, "카드 DB가 78장이어야 함");
const expectedCombos = TAROT_CARDS.length * ORIENTATIONS.length;
let comboCount = 0;

for (const card of TAROT_CARDS) {
  const entry = SUN_RECOVERY_CARD_COPY[card.code];
  assert.ok(entry, `회복 문장 누락: ${card.code} (${card.nameKo})`);
  for (const orientation of ORIENTATIONS) {
    const copy = entry[orientation];
    assert.ok(copy, `회복 문장 누락: ${card.code}.${orientation} (${card.nameKo})`);
    comboCount += 1;

    assert.ok(Array.isArray(copy.keywords), `keywords 배열 아님: ${card.code}.${orientation}`);
    assert.equal(copy.keywords.length, 3, `keywords는 정확히 3개여야 함: ${card.code}.${orientation}`);
    for (const keyword of copy.keywords) {
      assert.ok(squash(keyword).length >= 2, `빈 키워드: ${card.code}.${orientation}`);
    }
    for (const field of TEXT_FIELDS) {
      const text = squash(copy[field]);
      assert.ok(
        text.length >= MIN_LENGTH[field],
        `${field}가 너무 짧음(${text.length}자 < ${MIN_LENGTH[field]}): ${card.code}.${orientation}`,
      );
    }
  }
}
assert.equal(comboCount, expectedCombos, `156개 조합이 모두 있어야 함 (현재 ${comboCount})`);

// ── 3~5. 실제 리딩 파이프라인을 156회 통과시켜 검사 ──
// 폴백이 내보내는 문장(HEALING_SUIT_COPY)의 지문. 하나라도 출력되면 테이블에 구멍이 있다는 뜻이다.
const FALLBACK_MARKERS = [
  "오늘 스쳐 간 감정에 이름을 붙이고",
  "복잡한 생각은 잠시 내려두고, 내 몸이 편안함을 느낄",
  "내가 본 실제 사실",
  "해야 할 일의 긴 목록에서 오늘은 단 하나만 고르고",
  "큰 변화의 의미를 오늘 다 해석하려 들지 말고",
  "정방향은 이미 회복을 향한 작은 빛이 켜져 있으며",
  "역방향은 마음이 늦어졌다는 뜻이 아니라",
];

const seen = new Map(TEXT_FIELDS.map((field) => [field, new Map()]));
const keywordUsage = new Map();

for (const card of TAROT_CARDS) {
  for (const orientation of ORIENTATIONS) {
    const label = `${card.code}.${orientation}(${card.nameKo})`;
    const reading = readHealing([
      { cardId: card.id, orientation },
      { cardId: "major_fool", orientation: "upright" },
      { cardId: "major_magician", orientation: "upright" },
      { cardId: "major_high_priestess", orientation: "upright" },
    ]);
    const item = reading.cardReadings[0];
    const authored = SUN_RECOVERY_CARD_COPY[card.code][orientation];

    for (const field of TEXT_FIELDS) {
      const output = squash(item[field]);

      // 4. 폴백 미발동
      for (const marker of FALLBACK_MARKERS) {
        assert.ok(
          !output.includes(marker),
          `수트 폴백 문장이 출력됨 — ${label}.${field}에 "${marker}"`,
        );
      }

      // 5. 원문 보존: 출력이 집필 원문과 같아야 cleanHealingLanguage 치환에 안 걸린 것이다.
      assert.equal(
        output,
        squash(authored[field]),
        `cleanHealingLanguage 치환에 걸림 — ${label}.${field}. 치환 대상 어휘를 원문에서 빼세요.`,
      );

      // 3. 중복 0
      const bucket = seen.get(field);
      const previous = bucket.get(output);
      assert.ok(!previous, `${field} 문장 중복 — ${previous} 와 ${label} 이 동일`);
      bucket.set(output, label);
    }

    for (const keyword of authored.keywords) {
      keywordUsage.set(keyword, (keywordUsage.get(keyword) || 0) + 1);
    }
  }
}

for (const [field, bucket] of seen) {
  assert.equal(bucket.size, expectedCombos, `${field}가 156개 전부 달라야 함 (현재 ${bucket.size}종)`);
}

// ── 6. 키워드 분산 ──
const KEYWORD_REUSE_LIMIT = 4;
for (const [keyword, count] of keywordUsage) {
  assert.ok(
    count <= KEYWORD_REUSE_LIMIT,
    `키워드 "${keyword}"가 ${count}개 조합에서 재사용됨(상한 ${KEYWORD_REUSE_LIMIT}) — 카드 고유성이 흐려집니다.`,
  );
}

// ── 7. 최악 케이스: 같은 수트 4장 ──
// 과거 이 조합에서 4장이 완전히 같은 조언을 출력했다. 사용자가 제보한 소드3·소드2를 포함한다.
const worstCases = [
  { name: "소드 4장", ids: ["swords_three", "swords_two", "swords_nine", "swords_four"] },
  { name: "컵 4장", ids: ["cups_five", "cups_eight", "cups_two", "cups_ten"] },
  { name: "메이저 4장", ids: ["major_devil", "major_tower", "major_moon", "major_death"] },
];

for (const worst of worstCases) {
  const reading = readHealing(worst.ids.map((cardId, idx) => ({
    cardId,
    orientation: idx % 2 === 0 ? "upright" : "reversed",
  })));

  for (const field of [...TEXT_FIELDS, "keywords"]) {
    const values = reading.cardReadings.map((item) => (
      Array.isArray(item[field]) ? item[field].join("|") : squash(item[field])
    ));
    assert.equal(
      new Set(values).size,
      values.length,
      `${worst.name} 리딩에서 ${field}가 중복됨 — ${JSON.stringify(values)}`,
    );
  }

  const routines = reading.recoveryRoutines || [];
  assert.equal(routines.length, 3, `${worst.name}: 회복 루틴은 3개여야 함`);
  for (const key of ["title", "action"]) {
    const values = routines.map((item) => squash(item[key]));
    assert.equal(
      new Set(values).size,
      values.length,
      `${worst.name}: 회복 루틴 ${key}가 중복됨 — ${JSON.stringify(values)}`,
    );
  }
}

// 서로 다른 수트 구성이면 루틴도 달라져야 한다(카드 무관 고정 루틴 회귀 방지).
const swordsRoutines = readHealing([
  { cardId: "swords_three", orientation: "upright" },
  { cardId: "swords_two", orientation: "upright" },
  { cardId: "swords_nine", orientation: "upright" },
  { cardId: "swords_four", orientation: "upright" },
]).recoveryRoutines.map((item) => item.title).join("|");
const pentaclesRoutines = readHealing([
  { cardId: "pentacles_three", orientation: "upright" },
  { cardId: "pentacles_eight", orientation: "upright" },
  { cardId: "pentacles_nine", orientation: "upright" },
  { cardId: "pentacles_four", orientation: "upright" },
]).recoveryRoutines.map((item) => item.title).join("|");
assert.notEqual(
  swordsRoutines,
  pentaclesRoutines,
  "수트 구성이 달라도 회복 루틴이 동일 — 루틴이 다시 카드 무관 고정으로 돌아갔습니다.",
);

console.log(
  `verify-sun-recovery-card-copy: OK (${expectedCombos}개 조합 커버리지·중복 0·폴백 미발동·원문 보존·루틴 카드 반응 모두 통과)`,
);
