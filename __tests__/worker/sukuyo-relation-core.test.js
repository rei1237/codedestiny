/**
 * @jest-environment node
 */

let core;
let aiCalc;
let premium;

beforeAll(async () => {
  core = await import("../../worker/lib/sukuyo-relation-core.js");
  aiCalc = await import("../../worker/lib/sukuyo-ai-calculation.js");
  premium = await import("../../worker/lib/sukuyo-premium.js");
});

describe("sukuyo 관계 명칭 정본화 (위성 → 성위)", () => {
  test("relationFromForwardDistance는 6번째 관계를 성위(成危)로 낸다", () => {
    [4, 5, 13, 14, 22, 23].forEach((d) => {
      const rel = core.relationFromForwardDistance(d);
      expect(rel.relationType).toBe("성위");
      expect(rel.relationTypeHan).toBe("成危");
    });
    // 어디에도 "위성"이 남지 않는다.
    for (let d = 0; d < 27; d += 1) {
      expect(core.relationFromForwardDistance(d).relationType).not.toBe("위성");
    }
  });

  test("두 소비 모듈이 core의 정본 성위를 그대로 통과시킨다", () => {
    const c = aiCalc.buildSukuyoAiCompatibility({ index: 0 }, { index: 4 });
    expect(c.relationType).toBe("성위");
    expect(premium.relationFromForwardDistance(4).relationType).toBe("성위");
  });

  test("6종 관계 전체 매핑이 유지된다", () => {
    expect(core.relationFromForwardDistance(0).relationType).toBe("명");
    expect(core.relationFromForwardDistance(9).relationType).toBe("업태");
    expect(core.relationFromForwardDistance(1).relationType).toBe("영친");
    expect(core.relationFromForwardDistance(2).relationType).toBe("우쇠");
    expect(core.relationFromForwardDistance(3).relationType).toBe("안괴");
    expect(core.relationFromForwardDistance(4).relationType).toBe("성위");
  });
});

describe("judgeDayFortune 날짜별 길흉", () => {
  test("명일(본명수와 동일)은 pivotal", () => {
    const f = core.judgeDayFortune(5, 5);
    expect(f.tier).toBe("pivotal");
    expect(f.relationType).toBe("명");
  });

  test("업태 거리(9,18)는 대흉(great-caution)", () => {
    [9, 18].forEach((d) => {
      const f = core.judgeDayFortune(0, d);
      expect(f.tier).toBe("great-caution");
      expect(f.relationType).toBe("업태");
    });
  });

  test("영/친(영친 거리)은 길 이상, 영 자리는 대길", () => {
    // d=8,17,26 → bRole 영 → great-auspicious
    [8, 17, 26].forEach((d) => {
      expect(core.judgeDayFortune(0, d).tier).toBe("great-auspicious");
    });
    // d=1,10,19 → bRole 친 → auspicious
    [1, 10, 19].forEach((d) => {
      expect(core.judgeDayFortune(0, d).tier).toBe("auspicious");
    });
  });

  test("우쇠/안괴/성위는 방향에 따라 길·흉이 갈린다", () => {
    // 우쇠: bRole 쇠(흉) vs 우(길)
    expect(core.judgeDayFortune(0, 2).tier).toBe("caution"); // bRole 쇠
    expect(core.judgeDayFortune(0, 7).tier).toBe("auspicious"); // bRole 우
    // 안괴: bRole 괴(흉) vs 안(길)
    expect(core.judgeDayFortune(0, 3).tier).toBe("caution"); // bRole 괴
    expect(core.judgeDayFortune(0, 6).tier).toBe("auspicious"); // bRole 안
    // 성위: bRole 성(길) vs 위(흉)
    expect(core.judgeDayFortune(0, 4).tier).toBe("auspicious"); // bRole 성
    expect(core.judgeDayFortune(0, 5).tier).toBe("caution"); // bRole 위
  });

  test("27일 전체가 5개 tier 중 하나로 결정론적으로 분류된다(평일 없음)", () => {
    const allowed = new Set(["pivotal", "great-auspicious", "auspicious", "caution", "great-caution"]);
    for (let d = 0; d < 27; d += 1) {
      const f = core.judgeDayFortune(10, (10 + d) % 27);
      expect(allowed.has(f.tier)).toBe(true);
      expect(typeof f.headline).toBe("string");
      expect(typeof f.advice).toBe("string");
    }
  });

  test("유효하지 않은 인덱스는 null", () => {
    expect(core.judgeDayFortune(null, 3)).toBeNull();
    expect(core.judgeDayFortune(3, undefined)).toBeNull();
  });
});
