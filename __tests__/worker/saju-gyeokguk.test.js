/**
 * @jest-environment node
 */

let gyeokguk;

beforeAll(async () => {
  gyeokguk = await import("../../worker/lib/saju-gyeokguk.js");
});

describe("saju-gyeokguk: 십이운성 조견표", () => {
  test("js/saju-engine.js E12_MAP 스팟체크와 일치한다", () => {
    const cases = [
      ["甲", "亥", "장생"],
      ["甲", "子", "목욕"],
      ["甲", "寅", "건록"],
      ["甲", "卯", "제왕"],
      ["乙", "午", "장생"],
      ["丙", "巳", "건록"],
      ["己", "午", "건록"],
      ["庚", "申", "건록"],
      ["辛", "酉", "건록"],
      ["壬", "子", "제왕"],
      ["癸", "子", "건록"],
    ];
    cases.forEach(([stem, branch, expected]) => {
      expect(gyeokguk.getTwelveLifeStage(stem, branch)).toBe(expected);
    });
  });

  test("미상 입력은 빈 문자열", () => {
    expect(gyeokguk.getTwelveLifeStage("", "寅")).toBe("");
    expect(gyeokguk.getTwelveLifeStage("甲", "")).toBe("");
  });

  test("4주 십이운성 배열을 만든다", () => {
    const rows = gyeokguk.buildTwelveLifeStagesForPillars(
      [
        { position: "year", stem: "辛", branch: "未" },
        { position: "month", stem: "庚", branch: "寅" },
        { position: "day", stem: "甲", branch: "辰" },
        { position: "hour", stem: "戊", branch: "辰" },
      ],
      "甲",
    );
    expect(rows.find((r) => r.position === "year").stageKo).toBe("묘");
    expect(rows.find((r) => r.position === "month").stageKo).toBe("건록");
    expect(rows.find((r) => r.position === "day").stageKo).toBe("쇠");
  });
});

describe("saju-gyeokguk: 격국 판정", () => {
  const pillars = (extra = {}) => ({
    year: { position: "year", stem: "辛", branch: "未" },
    month: { position: "month", stem: "庚", branch: "寅" },
    day: { position: "day", stem: "甲", branch: "辰" },
    hour: { position: "hour", stem: "戊", branch: "辰" },
    ...extra,
  });

  function hiddenFor(dayStem, rows) {
    // 간이 지장간(정기만) — 테스트용 최소 구성
    const HIDDEN = {
      寅: [{ stem: "甲", layer: "정기", weight: 60 }, { stem: "丙", layer: "중기", weight: 30 }, { stem: "戊", layer: "여기", weight: 10 }],
      酉: [{ stem: "辛", layer: "정기", weight: 100 }],
      未: [{ stem: "己", layer: "정기", weight: 60 }, { stem: "丁", layer: "중기", weight: 30 }, { stem: "乙", layer: "여기", weight: 10 }],
      辰: [{ stem: "戊", layer: "정기", weight: 60 }, { stem: "乙", layer: "중기", weight: 30 }, { stem: "癸", layer: "여기", weight: 10 }],
    };
    const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
    const CON = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
    const EL = { 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" };
    const POL = { 甲: "yang", 乙: "yin", 丙: "yang", 丁: "yin", 戊: "yang", 己: "yin", 庚: "yang", 辛: "yin", 壬: "yang", 癸: "yin" };
    const tenGod = (day, target) => {
      const de = EL[day], te = EL[target];
      const same = POL[day] === POL[target];
      if (de === te) return same ? "비견" : "겁재";
      if (GEN[de] === te) return same ? "식신" : "상관";
      if (GEN[te] === de) return same ? "편인" : "정인";
      if (CON[de] === te) return same ? "편재" : "정재";
      if (CON[te] === de) return same ? "편관" : "정관";
      return "";
    };
    return rows.flatMap((row) => (HIDDEN[row.branch] || []).map((h) => ({
      position: row.position,
      branch: row.branch,
      hiddenStem: h.stem,
      layer: h.layer,
      weight: h.weight,
      tenGodFromDayMaster: tenGod(dayStem, h.stem),
    })));
  }

  test("甲 일간 寅월(본기 비견=건록) → 건록격", () => {
    const rows = Object.values(pillars());
    const result = gyeokguk.buildGyeokgukAnalysis({
      pillarRows: rows,
      dayStem: "甲",
      hiddenStems: hiddenFor("甲", rows),
      hiddenStemExposures: [],
    });
    expect(result.finalGyeokguk).toBe("건록격");
    expect(result.finalType).toBe("특수격");
  });

  test("甲 일간 酉월(본기 辛=정관) + 辛 투출 → 정관격", () => {
    const rows = Object.values(pillars({
      year: { position: "year", stem: "辛", branch: "未" },
      month: { position: "month", stem: "乙", branch: "酉" },
    }));
    const result = gyeokguk.buildGyeokgukAnalysis({
      pillarRows: rows,
      dayStem: "甲",
      hiddenStems: hiddenFor("甲", rows),
      hiddenStemExposures: [{ hiddenStem: "辛", exposedInNatalHeavenlyStem: true }],
    });
    expect(result.finalGyeokguk).toBe("정관격");
    expect(result.finalType).toBe("일반격");
    expect(result.confident).toBe(true);
  });

  test("종격이면 jong.name을 존중한다", () => {
    const rows = Object.values(pillars());
    const result = gyeokguk.buildGyeokgukAnalysis({
      pillarRows: rows,
      dayStem: "甲",
      hiddenStems: hiddenFor("甲", rows),
      jong: { isJong: true, name: "종재격" },
    });
    expect(result.finalGyeokguk).toBe("종재격");
    expect(result.finalType).toBe("특수격");
  });

  test("입력이 비어도 예외 없이 참고 등급을 반환한다", () => {
    const result = gyeokguk.buildGyeokgukAnalysis({});
    expect(result.finalType).toBe("참고");
    expect(result.luckTiming.note).toContain("참고용");
  });
});
