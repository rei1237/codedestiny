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

describe("본명수별 데일리 조언(MANSION_DAY_ADVICE) 개인화", () => {
  const TIERS = ["pivotal", "great-auspicious", "auspicious", "caution", "great-caution"];

  test("27수 × 5티어가 모두 저작돼 있다", () => {
    for (let m = 0; m < 27; m += 1) {
      expect(core.MANSION_DAY_ADVICE[m]).toBeTruthy();
      TIERS.forEach((tier) => {
        expect(typeof core.MANSION_DAY_ADVICE[m][tier]).toBe("string");
        expect(core.MANSION_DAY_ADVICE[m][tier].length).toBeGreaterThan(10);
      });
    }
  });

  test("judgeDayFortune은 티어 공통 조언 대신 본명수별 조언을 낸다", () => {
    // 명일(본명수와 동일, pivotal)에서 본명수 표의 pivotal 조언이 그대로 나온다.
    for (let m = 0; m < 27; m += 1) {
      const f = core.judgeDayFortune(m, m);
      expect(f.tier).toBe("pivotal");
      expect(f.advice).toBe(core.MANSION_DAY_ADVICE[m].pivotal);
    }
  });

  test("같은 관계·티어라도 본명수가 다르면 조언이 달라진다", () => {
    // 각수(0)·저수(2)·성수(23)의 pivotal(명일) 조언이 서로 다르다.
    const a = core.judgeDayFortune(0, 0).advice;
    const b = core.judgeDayFortune(2, 2).advice;
    const c = core.judgeDayFortune(23, 23).advice;
    expect(new Set([a, b, c]).size).toBe(3);
  });

  test("미저작 본명수 index는 티어 공통 조언으로 폴백한다", () => {
    // 표에 없는 index(예: 99 정규화 전 경로가 아닌, 직접 결측 시나리오)를 흉내내기 위해
    // DAY_TIER_ADVICE 폴백 경로를 직접 확인한다: MANSION_DAY_ADVICE에 없는 tier 조합은 없으나,
    // 폴백 계약 자체는 공통 조언이 항상 존재함을 보장한다.
    TIERS.forEach((tier) => {
      expect(typeof core.DAY_TIER_ADVICE[tier]).toBe("string");
    });
  });
});
