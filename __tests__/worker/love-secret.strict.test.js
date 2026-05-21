/**
 * @jest-environment node
 */

let __loveSecretTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __loveSecretTestUtils = mod.__loveSecretTestUtils;
});

function makeSajuData() {
  return [
    "【분석 대상 정보】",
    "이름: 테스트A",
    "성별: 여성",
    "생년월일: 1992년 6월 15일",
    "출생 시각: 12시 30분",
    "",
    "【사주 원국(四柱)】",
    "년주(年柱): 壬申",
    "월주(月柱): 丁巳",
    "일주(日柱): 辛酉",
    "시주(時柱): 甲午",
    "",
    "【오행(五行) 분포】",
    "목(木):22.2 화(火):11.1 토(土):22.2 금(金):33.3 수(水):11.1",
    "용신(用神): fire, wood",
    "기신(忌神): metal",
    "일간(日干): 辛",
    "신강/신약: 신강",
    "",
    "【십성(十星) 분포】",
    "비견: 3",
    "겁재: 1",
    "식신: 2",
    "상관: 1",
    "편재: 1",
    "정재: 2",
    "편관: 1",
    "정관: 2",
    "편인: 0",
    "정인: 1",
    "",
    "【신살(神殺) 계산 결과 — 정확한 로직으로 도출】",
    "보유 신살: 도화살(桃花殺), 홍염살(紅艶殺), 화개살(華蓋殺), 역마살(驛馬殺)",
    "",
    "【대운(大運) 흐름】",
    "23세: 丙辰",
    "33세: 乙卯",
    "43세: 甲寅",
  ].join("\n");
}

function makeSajuDataWithSeason({
  name = "테스트B",
  gender = "남성",
  monthBranch = "寅",
  dayGanji = "甲寅",
  fire = 22.2,
  water = 11.1,
  metal = 22.2,
  wood = 33.3,
  earth = 11.1,
} = {}) {
  return [
    "【분석 대상 정보】",
    `이름: ${name}`,
    `성별: ${gender}`,
    "생년월일: 1991년 2월 21일",
    "출생 시각: 08시 15분",
    "",
    "【사주 원국(四柱)】",
    "년주(年柱): 辛未",
    `월주(月柱): 丙${monthBranch}`,
    `일주(日柱): ${dayGanji}`,
    "시주(時柱): 丁卯",
    "",
    "【오행(五行) 분포】",
    `목(木):${wood} 화(火):${fire} 토(土):${earth} 금(金):${metal} 수(水):${water}`,
    "용신(用神): water, wood",
    "기신(忌神): fire",
    "일간(日干): 甲",
    "신강/신약: 신약",
    "",
    "【십성(十星) 분포】",
    "비견: 2",
    "겁재: 1",
    "식신: 2",
    "상관: 1",
    "편재: 1",
    "정재: 1",
    "편관: 2",
    "정관: 1",
    "편인: 1",
    "정인: 1",
    "",
    "【신살(神殺) 계산 결과 — 정확한 로직으로 도출】",
    "보유 신살: 도화살(桃花殺), 화개살(華蓋殺), 역마살(驛馬殺)",
    "",
    "【대운(大運) 흐름】",
    "24세: 乙丑",
    "34세: 甲子",
    "44세: 癸亥",
  ].join("\n");
}

describe("Love Secret Strict Tests", () => {
  test("A. canonicalSajuLoveReport가 필수 필드를 채워야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      { sajuData: makeSajuData(), mode: "solo", name: "테스트A", gender: "F" },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30, name: "테스트A", gender: "F" },
      { mode: "solo" }
    );

    const validation = __loveSecretTestUtils.validateCanonicalSajuLoveReport(canonical);
    expect(canonical.reportType).toBe("saju-love-premium");
    expect(validation.hasPersonAFourPillars).toBe(true);
    expect(validation.hasFiveElements).toBe(true);
    expect(validation.hasTenGods).toBe(true);
  });

  test("B. 금지 신살 언급(괴강살/양인살)을 탐지해야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      { sajuData: makeSajuData(), mode: "solo" },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "solo" }
    );

    expect(__loveSecretTestUtils.hasInvalidLoveShinsalMention("이 명식에는 괴강살과 양인살이 강합니다.", canonical)).toBe(true);
    expect(__loveSecretTestUtils.hasInvalidLoveShinsalMention("도화살과 홍염살의 작동 조건을 설명합니다.", canonical)).toBe(false);
  });

  test("C. 품질 게이트는 금지 패딩/구조 누락/근거 부족을 잡아야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      { sajuData: makeSajuData(), mode: "solo" },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "solo" }
    );

    const lowQuality = [
      "### 1. 사용 데이터 요약표",
      "짧은 글",
      "심화 상담 메모 1",
      "### 핵심 요약 5줄",
    ].join("\n");

    const result = __loveSecretTestUtils.evaluateLoveSecretQuality(lowQuality, 1, canonical, [], 4000);
    expect(result.ok).toBe(false);
    expect(result.failedChecks).toContain("QUALITY_GATE_A_MIN_LENGTH");
    expect(result.failedChecks).toContain("QUALITY_GATE_C_NO_DEEP_MEMO");
  });

  test("D. 데이터 근거 카운트는 최소 7개 이상 판단 가능해야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      { sajuData: makeSajuData(), mode: "solo" },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "solo" }
    );

    const evidenceText = [
      "년주 壬申, 월주 丁巳, 일주 辛酉, 시주 甲午를 기준으로 해석합니다.",
      "일간 辛, 일지 酉, 월지 巳와 신강 구조를 전제로 설명합니다.",
      "현재 대운 乙卯, 용신 화/목, 도화살과 홍염살의 작동을 함께 봅니다.",
    ].join("\n");

    expect(__loveSecretTestUtils.countLoveDataEvidence(evidenceText, canonical, 1)).toBeGreaterThanOrEqual(7);
  });

  test("E. 궁합 모드 canonical에는 johuCompatibility/intimacyCompatibility가 포함되어야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuData(),
        partnerData: makeSajuDataWithSeason({ monthBranch: "酉", dayGanji: "乙酉" }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );

    expect(canonical.compatibility.enabled).toBe(true);
    expect(canonical.compatibility.johuCompatibility.enabled).toBe(true);
    expect(Number.isFinite(canonical.compatibility.intimacyCompatibility.score)).toBe(true);
    expect(canonical.validation.hasJohuCompatibility).toBe(true);
    expect(canonical.validation.hasIntimacyCompatibility).toBe(true);
  });

  test("F. chapterPlanning은 chapter6에 조후 중심 mustUseData를 포함해야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuData(),
        partnerData: makeSajuDataWithSeason({ monthBranch: "寅", dayGanji: "丙寅" }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );

    const ch6 = canonical.chapterPlanning.chapter6;
    expect(ch6.title).toContain("친밀감");
    expect(ch6.mustUseData).toContain("personA.johu");
    expect(ch6.mustUseData).toContain("personB.johu");
    expect(ch6.mustUseData).toContain("compatibility.johuCompatibility");
    expect(ch6.dataDrivenSections.length).toBeGreaterThan(0);
  });

  test("G. chapter6 payload는 johuData/requiredDataPoints를 실어야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuData(),
        partnerData: makeSajuDataWithSeason({ monthBranch: "子", dayGanji: "壬子" }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );
    const payload = __loveSecretTestUtils.buildLoveSecretChapterPayload(
      { mode: "compatibility" },
      { title: "테스트7" },
      6,
      canonical,
      4200
    );

    expect(payload.chapterTitle).toBe("테스트7");
    expect(payload.johuData).toBeTruthy();
    expect(payload.requiredDataPoints).toContain("compatibility.johuCompatibility.temperatureBalance");
    expect(payload.chapterSpecificSections.length).toBeGreaterThan(0);
  });

  test("H. Chapter6은 6000자 미만이면 QUALITY_GATE_J를 실패해야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuData(),
        partnerData: makeSajuDataWithSeason({ monthBranch: "酉", dayGanji: "乙酉" }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );
    const shortText = "### 1. 사용 데이터 요약표\n|항목|값|\n|---|---|\n|월지|酉|\n" + "조후 건조 습윤 한 열 월지 계절 화 수 ".repeat(80);
    const quality = __loveSecretTestUtils.evaluateLoveSecretQuality(shortText, 6, canonical, [], 4000);
    expect(quality.failedChecks).toContain("QUALITY_GATE_J_CH7_MIN_LENGTH_6000");
  });

  test("I. 궁합 모드 Chapter6은 압축 흐름이 없으면 QUALITY_GATE_S를 실패해야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuData(),
        partnerData: makeSajuDataWithSeason({ monthBranch: "寅", dayGanji: "甲寅" }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );
    const noTableText = [
      "나: 봄의 기운으로 빠른 개방",
      "상대: 가을의 기운으로 절제된 표현",
      "조후 건조 습윤 한 열 월지 계절 화 수를 모두 반영",
      "배우자궁 일지 합 충 형 파 해를 종합",
      "### 핵심 요약 5줄",
    ].join("\n") + "\n" + "반복이 아닌 상세 분석 문장 ".repeat(400);
    const quality = __loveSecretTestUtils.evaluateLoveSecretQuality(noTableText, 6, canonical, [], 4000);
    expect(quality.failedChecks).toContain("QUALITY_GATE_S_COMPAT_COMPRESSED_FLOW");
  });

  test("J. Chapter6은 기후 키워드가 부족하면 QUALITY_GATE_M을 실패해야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuData(),
        partnerData: makeSajuDataWithSeason({ monthBranch: "午", dayGanji: "丁午" }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );
    const lowClimate = [
      "### 1. 사용 데이터 요약표",
      "|항목|값|",
      "|---|---|",
      "|월지|午|",
      "나: 상대와 합이 있으나 표현 방식이 다름",
      "상대: 일지 충이 있어 갈등 리듬이 생김",
      "### 핵심 요약 5줄",
    ].join("\n") + "\n" + "분석 문장 ".repeat(650);
    const quality = __loveSecretTestUtils.evaluateLoveSecretQuality(lowClimate, 6, canonical, [], 4000);
    expect(quality.failedChecks).toContain("QUALITY_GATE_M_CH7_CLIMATE_TERMS");
  });

  test("K. Chapter6은 노골적 성 표현을 QUALITY_GATE_P로 차단해야 한다", () => {
    const canonical = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuData(),
        partnerData: makeSajuDataWithSeason({ monthBranch: "子", dayGanji: "壬子" }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );
    const explicitText = [
      "### 1. 사용 데이터 요약표",
      "|항목|값|",
      "|---|---|",
      "|월지|子|",
      "나: 조후 건조 습윤 한 열 월지 계절 화 수를 반영",
      "상대: 배우자궁 일지 합 충 형 파 해를 반영",
      "성행위에서 체위와 삽입의 궁합이 강하다.",
      "### 핵심 요약 5줄",
    ].join("\n") + "\n" + "상세 분석 ".repeat(700);
    const quality = __loveSecretTestUtils.evaluateLoveSecretQuality(explicitText, 6, canonical, [], 4000);
    expect(quality.failedChecks).toContain("QUALITY_GATE_P_CH7_NO_EXPLICIT_SEXUAL");
  });

  test("L. 계절 페어(봄+가을, 여름+겨울)와 과열/건조 리스크를 계산해야 한다", () => {
    const canonicalSpringAutumn = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuDataWithSeason({ monthBranch: "寅", dayGanji: "甲寅", fire: 10, water: 35, metal: 20, wood: 25, earth: 10 }),
        partnerData: makeSajuDataWithSeason({ monthBranch: "酉", dayGanji: "辛酉", fire: 35, water: 5, metal: 35, wood: 10, earth: 15 }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );

    const canonicalSummerWinter = __loveSecretTestUtils.buildCanonicalSajuLoveReport(
      {
        sajuData: makeSajuDataWithSeason({ monthBranch: "午", dayGanji: "丙午", fire: 40, water: 5, metal: 15, wood: 20, earth: 20 }),
        partnerData: makeSajuDataWithSeason({ monthBranch: "子", dayGanji: "壬子", fire: 5, water: 40, metal: 20, wood: 15, earth: 20 }),
        mode: "compatibility",
      },
      { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      { mode: "compatibility" }
    );

    expect(canonicalSpringAutumn.compatibility.johuCompatibility.seasonalCompatibility.seasonPair).toBe("autumn+spring");
    expect(canonicalSummerWinter.compatibility.johuCompatibility.seasonalCompatibility.seasonPair).toBe("summer+winter");

    const risk = canonicalSpringAutumn.compatibility.johuCompatibility.riskFactors.join(" ");
    expect(typeof risk).toBe("string");
    expect(canonicalSummerWinter.compatibility.intimacyCompatibility.score).toBeGreaterThanOrEqual(0);
  });
});
