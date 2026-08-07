/**
 * @jest-environment node
 *
 * 수비학 × 타로 결합 엔진 회귀 테스트.
 * 유료 상담의 품질이 전적으로 이 결정론 엔진에서 나오므로, 계산이 틀리거나
 * 주제별 문구가 다시 하드코딩되는 것을 여기서 막는다.
 */

const { execFileSync } = require("child_process");

function runModule(body) {
  const source = `
    import {
      buildAttunedDeck,
      buildFallbackInterpretation,
      buildNumerologyContext,
      drawFromAttunedDeck,
      SPREAD_POSITIONS,
      TAROT_CARDS,
    } from "./lib/tarot/numerology-tarot.mjs";
    import {
      buildQuintessence,
      getCardNumerology,
      reduceNumber,
      resolveNumberRelation,
    } from "./lib/tarot/numerology-tarot-synthesis.mjs";
    const now = new Date("2026-08-07T09:00:00");
    ${body}
  `;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: process.cwd(),
    encoding: "utf8",
  }));
}

function buildReading(topic, question, seed = "s1") {
  return runModule(`
    const numerology = buildNumerologyContext({ birthDate: "1994-03-21", topic: ${JSON.stringify(topic)}, now });
    const deck = buildAttunedDeck({ numerology, topic: ${JSON.stringify(topic)}, birthDate: "1994-03-21", name: "서연", sessionSeed: ${JSON.stringify(seed)}, now });
    const cards = drawFromAttunedDeck(deck, 5, ${JSON.stringify(topic)});
    const reading = buildFallbackInterpretation({
      numerology, cards, topic: ${JSON.stringify(topic)}, name: "서연", question: ${JSON.stringify(question)},
    });
    process.stdout.write(JSON.stringify({ numerology, cards, reading }));
  `);
}

describe("카드 → 수 변환", () => {
  test("아르카나 번호를 산술적으로 축약한다 (17 → 8, 0은 미확정)", () => {
    const result = runModule(`
      process.stdout.write(JSON.stringify({
        star: getCardNumerology(TAROT_CARDS.find((c) => c.id === 17)),
        fool: getCardNumerology(TAROT_CARDS.find((c) => c.id === 0)),
        hermit: getCardNumerology(TAROT_CARDS.find((c) => c.id === 9)),
        world: getCardNumerology(TAROT_CARDS.find((c) => c.id === 21)),
      }));
    `);
    expect(result.star.reducedNumber).toBe(8);
    expect(result.hermit.reducedNumber).toBe(9);
    expect(result.world.reducedNumber).toBe(3);
    expect(result.fool.isZero).toBe(true);
    expect(result.fool.reducedNumber).toBe(0);
  });

  test("본문의 '수로 줄이면 N'이 아르카나 번호의 실제 축약값과 일치한다", () => {
    // 회귀: 예전에는 card.numbers(함께 품은 수)를 축약값처럼 써서
    // "17번 카드, 수로 줄이면 11" 같은 계산이 틀린 문장이 나왔다.
    const { reading } = buildReading("money", "올해 안에 대출을 갚을 수 있을까요?");
    for (const card of reading.cards) {
      const match = /(\d+)번 카드, 수로 줄이면 (\d+)/.exec(card.numerologyBridge || "");
      if (!match) continue;
      const arcana = Number(match[1]);
      const reduced = Number(match[2]);
      const expected = arcana <= 9 ? arcana : String(arcana).split("").reduce((s, d) => s + Number(d), 0);
      expect(reduced).toBe(expected);
    }
  });
});

describe("관계 판정", () => {
  test("공명·보완·긴장·중립을 서로 다르게 판정한다", () => {
    const result = runModule(`
      const card = (n) => ({ allNumbers: [n], reducedNumber: n, isZero: false });
      process.stdout.write(JSON.stringify({
        resonance: resolveNumberRelation(card(6), { lifePathNumber: 6 }),
        tension: resolveNumberRelation(card(4), { lifePathNumber: 5 }),
        complement: resolveNumberRelation(card(3), { lifePathNumber: 7 }),
        neutral: resolveNumberRelation(card(3), { lifePathNumber: 5 }),
      }));
    `);
    expect(result.resonance.type).toBe("resonance");
    expect(result.tension.type).toBe("tension");
    expect(result.tension.note).toBeTruthy();
    expect(result.complement.type).toBe("complement");
    expect(result.neutral.type).toBe("neutral");
  });

  test("0번 바보는 관계를 판정하지 않고 '열림'으로 둔다", () => {
    // 회귀: 배지에는 '긴장'이 뜨는데 본문은 "아직 정해지지 않았다"고 말해 서로 어긋났다.
    const result = runModule(`
      const fool = getCardNumerology(TAROT_CARDS.find((c) => c.id === 0));
      process.stdout.write(JSON.stringify(resolveNumberRelation(fool, { lifePathNumber: 11, personalDayNumber: 3, questionNumber: 6 })));
    `);
    expect(result.type).toBe("open");
    expect(result.typeLabel).toBe("열림");
  });

  test("관계 유형마다 다른 문장을 만든다", () => {
    const { reading } = buildReading("love", "지금 관계가 어떻게 흘러갈까요?");
    const bridges = reading.cards.map((c) => c.numerologyBridge);
    expect(new Set(bridges).size).toBe(bridges.length);
  });
});

describe("스프레드 총합수(Quintessence)", () => {
  test("카드 번호 합을 21 이하로 축약하고 해당 메이저 아르카나를 고른다", () => {
    const result = runModule(`
      const pick = (ids) => ids.map((id) => ({ card: TAROT_CARDS.find((c) => c.id === id) }));
      process.stdout.write(JSON.stringify({
        // 17+9+6+8+5 = 45 → 4+5 = 9
        a: buildQuintessence(pick([17, 9, 6, 8, 5]), TAROT_CARDS),
        // 1+2+3+4+5 = 15 (21 이하라 그대로)
        b: buildQuintessence(pick([1, 2, 3, 4, 5]), TAROT_CARDS),
      }));
    `);
    expect(result.a.rawSum).toBe(45);
    expect(result.a.arcanaNumber).toBe(9);
    expect(result.a.cardName).toBe("은둔자");
    expect(result.b.rawSum).toBe(15);
    expect(result.b.arcanaNumber).toBe(15);
    expect(result.b.cardName).toBe("악마");
  });

  test("리딩에 총합수와 그 조언이 실려 나온다", () => {
    const { reading } = buildReading("career", "이직을 준비해도 될까요?");
    expect(reading.quintessence).toBeTruthy();
    expect(reading.quintessence.headline).toContain("다섯 장을 모두 더하면");
    expect(reading.directAnswer).toContain(reading.quintessence.headline);
    // 총합수의 행동 지시가 다음 행동 맨 앞에 온다.
    expect(reading.nextActions[0]).toBe(reading.quintessence.advice);
  });
});

describe("포지션 문구", () => {
  test("9개 주제 모두 자기 스프레드 이름을 쓴다 (연애 문구 하드코딩 회귀 방지)", () => {
    const topics = ["love", "reunion", "feelings", "career", "money", "relationship", "health", "move", "general"];
    for (const topic of topics) {
      const { reading } = buildReading(topic, "지금 흐름이 궁금합니다.");
      const positions = runModule(`process.stdout.write(JSON.stringify(SPREAD_POSITIONS[${JSON.stringify(topic)}]));`);
      reading.cards.forEach((card, idx) => {
        expect(card.positionTitle).toBe(positions[idx]);
        expect(card.contextualInterpretation).toContain(positions[idx]);
      });
      if (topic !== "love") {
        // 예전에는 모든 주제에서 이 연애 스프레드 문구가 나왔다.
        const joined = reading.cards.map((c) => c.contextualInterpretation).join(" ");
        expect(joined).not.toContain("현재 마음과 출발점");
      }
    }
  });

  test("오늘수가 결과의 기준 수 목록에 포함된다", () => {
    // 오늘수는 계산만 하고 결과에 내보내지 않던 값이다.
    const { reading } = buildReading("health", "컨디션을 회복하려면 무엇부터 바꿔야 할까요?");
    const labels = reading.numerologyInsight.relevantNumbers.map((n) => n.label);
    expect(labels).toEqual(expect.arrayContaining(["생명수", "오늘수", "질문수"]));
  });
});

describe("조율된 덱과 직접 뽑기", () => {
  test("메이저 아르카나 22장 전체를 중복 없이 순서화한다", () => {
    const result = runModule(`
      const numerology = buildNumerologyContext({ birthDate: "1994-03-21", topic: "love", now });
      const deck = buildAttunedDeck({ numerology, topic: "love", birthDate: "1994-03-21", name: "서연", sessionSeed: "a", now });
      process.stdout.write(JSON.stringify({
        size: deck.size,
        uniqueIds: new Set(deck.order.map((x) => x.card.id)).size,
        orientations: new Set(deck.order.map((x) => x.orientation)).size,
      }));
    `);
    expect(result.size).toBe(22);
    expect(result.uniqueIds).toBe(22);
    expect(result.orientations).toBeGreaterThanOrEqual(1);
  });

  test("세션 시드가 바뀌면 다시 섞인다 (같은 날 항상 같은 카드였던 문제)", () => {
    const result = runModule(`
      const numerology = buildNumerologyContext({ birthDate: "1994-03-21", topic: "love", now });
      const mk = (seed) => drawFromAttunedDeck(
        buildAttunedDeck({ numerology, topic: "love", birthDate: "1994-03-21", name: "서연", sessionSeed: seed, now }), 5, "love",
      ).map((x) => x.card.id);
      process.stdout.write(JSON.stringify({ a: mk("a"), b: mk("b") }));
    `);
    expect(result.a).not.toEqual(result.b);
  });

  test("누른 만큼만 스프레드 자리에 놓는다", () => {
    const result = runModule(`
      const numerology = buildNumerologyContext({ birthDate: "1994-03-21", topic: "money", now });
      const deck = buildAttunedDeck({ numerology, topic: "money", sessionSeed: "x", now });
      process.stdout.write(JSON.stringify({
        three: drawFromAttunedDeck(deck, 3, "money").map((c) => c.positionLabel),
        five: drawFromAttunedDeck(deck, 5, "money").length,
        over: drawFromAttunedDeck(deck, 9, "money").length,
      }));
    `);
    expect(result.three).toHaveLength(3);
    expect(result.five).toBe(5);
    expect(result.over).toBe(5);
  });
});
