import test from "node:test";
import assert from "node:assert/strict";
import {
  SERP_TITLE_WIDTH_LIMIT,
  TITLE_VARIANTS,
  buildFortuneTitle,
  serpTitleWidth,
  titleVariantFor,
} from "../../lib/fortune/seo-title.mjs";

const ANIMALS = ["쥐띠", "소띠", "범띠", "토끼띠", "용띠", "뱀띠", "말띠", "양띠", "원숭이띠", "닭띠", "개띠", "돼지띠"];
const ZODIACS = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];

const PERIODS = [
  { periodTitle: "오늘의", dateLabel: "10월 3일", year: 2026 },
  { periodTitle: "내일의", dateLabel: "10월 28일", year: 2026 },
  { periodTitle: "이번 주", dateLabel: "10월 26~11월 1일", year: null },
  { periodTitle: "이번 주", dateLabel: "12월 28~1월 3일", year: null },
  { periodTitle: "이번 달", dateLabel: "2026년 10월", year: null },
];

function allTitles(variantOf) {
  const out = [];
  for (const names of [ANIMALS, ZODIACS]) {
    names.forEach((name, index) => {
      for (const period of PERIODS) {
        out.push({
          name,
          variant: variantOf(index),
          title: buildFortuneTitle({
            ...period,
            name,
            score: 10,
            variant: variantOf(index),
            fallback: "FALLBACK",
          }),
        });
      }
    });
  }
  return out;
}

test("패턴은 같은 종류(띠·별자리) 12개 안에서 4개씩 고르게 돌아간다", () => {
  const counts = Object.fromEntries(TITLE_VARIANTS.map((v) => [v, 0]));
  for (let i = 0; i < 12; i += 1) counts[titleVariantFor(i)] += 1;
  assert.deepEqual(Object.values(counts), [4, 4, 4]);
});

test("모든 sign × 기간 × 패턴 조합이 SERP 폭 게이트(60)를 넘지 않는다", () => {
  for (const variant of TITLE_VARIANTS) {
    for (const { name, title } of allTitles(() => variant)) {
      assert.notEqual(title, "FALLBACK", `${name}/${variant}: 후보가 전부 폭을 넘어 폴백이 쓰였다`);
      assert.ok(
        serpTitleWidth(title) <= SERP_TITLE_WIDTH_LIMIT,
        `${title} 폭 ${serpTitleWidth(title)} > ${SERP_TITLE_WIDTH_LIMIT}`,
      );
    }
  }
});

test("제목은 검색어 앞부분('{이름} {기간} 운세')으로 시작한다", () => {
  const title = buildFortuneTitle({
    name: "범띠",
    periodTitle: "오늘의",
    dateLabel: "10월 3일",
    year: 2026,
    score: 7,
    variant: "benefit",
    fallback: "FALLBACK",
  });
  assert.ok(title.startsWith("범띠 오늘의 운세 "), title);
  assert.ok(title.includes("2026년 10월 3일"), title);
  assert.ok(title.includes("총운 7/10"), title);
});

test("신뢰 패턴은 '감수' 같은 검수 표현을 쓰지 않는다 (founder.ts: AI 결과를 사람이 검수하지 않는다)", () => {
  for (const { title } of allTitles(() => "trust")) {
    assert.ok(!/감수|검수|적중|맞춘/.test(title), title);
    assert.ok(/명리학자(가 만든| 운영)/.test(title), title);
  }
});

test("모든 후보가 폭을 넘으면 호출부가 준 폴백을 그대로 쓴다", () => {
  const title = buildFortuneTitle({
    name: "아주아주아주아주아주아주긴이름자리",
    periodTitle: "이번 주",
    dateLabel: "10월 26~11월 1일",
    year: null,
    score: 5,
    variant: "trust",
    fallback: "기존 제목",
  });
  assert.equal(title, "기존 제목");
});

test("같은 날 같은 종류 12쪽의 제목이 서로 다르다", () => {
  const titles = ANIMALS.map((name, index) =>
    buildFortuneTitle({
      name,
      periodTitle: "오늘의",
      dateLabel: "10월 3일",
      year: 2026,
      score: 6,
      variant: titleVariantFor(index),
      fallback: "FALLBACK",
    }),
  );
  assert.equal(new Set(titles).size, 12);
  assert.equal(new Set(titles.map((t) => t.split(" | ")[1])).size > 3, true, "꼬리가 sign 마다 똑같이 반복된다");
});
