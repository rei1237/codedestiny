/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/worker/sukuyo-premium.strict.test.js --testEnvironment node
 */

let __sukuyoTestUtils;

let buildSukuyoFromLunarV2;
let getSukuyoChapterMetaV2;
let buildCanonicalSukuyoCompatibility;
let validateCanonicalSukuyoCompatibility;
let buildSukuyoDataSummaryTable;
let detectSukuyoRepeatedSentences;
let validateSukuyoChapterText;

function makeInput(overrides = {}) {
  return {
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: 9,
    ...overrides,
  };
}

function calcBasicScreenIndex(lunarMonth, lunarDay) {
  const monthStart = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];
  const start = monthStart[lunarMonth - 1] ?? 11;
  return (start + lunarDay - 1) % 27;
}

function findSukuyoByIndex(targetIndex) {
  const target = ((Number(targetIndex) % 27) + 27) % 27;
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= 30; day += 1) {
      const s = buildSukuyoFromLunarV2(month, day, { source: "test" });
      if (s && Number(s.index) === target) return s;
    }
  }
  throw new Error(`Unable to find sukuyo index ${target}`);
}

function makeCanonicalByIndices(aIndex, bIndex) {
  return buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: "A",
    personAInput: makeInput({ year: 1992, month: 6, day: 15 }),
    personASukuyo: findSukuyoByIndex(aIndex),
    personBName: "B",
    personBInput: makeInput({ year: 1990, month: 10, day: 2, hour: 9, minute: 0 }),
    personBSukuyo: findSukuyoByIndex(bIndex),
    calendarSource: "test",
    methodVersion: "test-v1",
  });
}

function makeCanonicalCompatibility() {
  const personAInput = makeInput({ year: 1992, month: 6, day: 15 });
  const personBInput = makeInput({ year: 1990, month: 10, day: 2, hour: 9, minute: 0 });
  const personASukuyo = buildSukuyoFromLunarV2(5, 17, { source: "test" });
  const personBSukuyo = buildSukuyoFromLunarV2(8, 9, { source: "test" });

  return buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: "A",
    personAInput,
    personASukuyo,
    personBName: "B",
    personBInput,
    personBSukuyo,
    calendarSource: "test",
    methodVersion: "test-v1",
  });
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __sukuyoTestUtils = mod.__sukuyoTestUtils;

  ({
    buildSukuyoFromLunarV2,
    getSukuyoChapterMetaV2,
    buildCanonicalSukuyoCompatibility,
    validateCanonicalSukuyoCompatibility,
    buildSukuyoDataSummaryTable,
    detectSukuyoRepeatedSentences,
    validateSukuyoChapterText,
  } = __sukuyoTestUtils);
});

describe("Sukuyo Premium Strict Tests (A~J)", () => {
  test("A. 기본 화면 공식과 canonical personA 숙 index/name이 일치해야 한다", () => {
    const lunarMonth = 5;
    const lunarDay = 17;
    const sukuyo = buildSukuyoFromLunarV2(lunarMonth, lunarDay, { source: "test" });

    expect(sukuyo.index).toBe(calcBasicScreenIndex(lunarMonth, lunarDay));
    expect(typeof sukuyo.nameKo).toBe("string");
    expect(sukuyo.nameKo.length).toBeGreaterThan(0);
  });

  test("B. 기본 화면 공식과 canonical personB 숙 index/name이 일치해야 한다", () => {
    const lunarMonth = 8;
    const lunarDay = 9;
    const sukuyo = buildSukuyoFromLunarV2(lunarMonth, lunarDay, { source: "test" });

    expect(sukuyo.index).toBe(calcBasicScreenIndex(lunarMonth, lunarDay));
    expect(typeof sukuyo.nameKo).toBe("string");
    expect(sukuyo.nameKo.length).toBeGreaterThan(0);
  });

  test("C. 두 사람 index로 계산한 거리/유형이 canonical compatibility에 반영되어야 한다", () => {
    const canonical = makeCanonicalCompatibility();
    const c = canonical.compatibility;

    expect(Number.isFinite(c.forwardDistance)).toBe(true);
    expect(Number.isFinite(c.reverseDistance)).toBe(true);
    expect(Number.isFinite(c.shortestDistance)).toBe(true);
    expect(typeof c.relationType).toBe("string");
    expect(c.relationType.length).toBeGreaterThan(0);
    expect(Number.isFinite(Number(c.compatibilityIndex))).toBe(true);
    expect(typeof c.distanceMetrics?.resonanceCode).toBe("string");
    expect(typeof c.roleActionGuide?.meAction).toBe("string");
    expect(typeof c.elementHarmony?.relation).toBe("string");
    expect(typeof c.strengthShadowMap?.complementSummary).toBe("string");
  });

  test("D. A→B/B→A 방향값은 모두 존재하고 합이 27 또는 0이어야 한다", () => {
    const canonical = makeCanonicalCompatibility();
    const c = canonical.compatibility;

    expect(c.directionFromAToB).toContain("+");
    expect(c.directionFromBToA).toContain("+");

    const sum = Number(c.forwardDistance) + Number(c.reverseDistance);
    expect(sum === 27 || sum === 0).toBe(true);
  });

  test("E. relationType은 허용된 6종 중 하나여야 한다", () => {
    const canonical = makeCanonicalCompatibility();
    const allowed = new Set(["명", "업태", "영친", "안괴", "우쇠", "위성"]);
    expect(allowed.has(canonical.compatibility.relationType)).toBe(true);
  });

  test("F. 챕터 메타는 개인 12장 / 궁합 12장으로 유지되어야 한다", () => {
    const personal = getSukuyoChapterMetaV2("personal");
    const compatibility = getSukuyoChapterMetaV2("compatibility");

    expect(personal).toHaveLength(12);
    expect(compatibility).toHaveLength(12);
  });

  test("G. 동일 30자 이상 문장 2회 반복은 탐지되어야 한다", () => {
    const repeated = "두 사람의 관계는 감정 반응과 거리 조절 규칙을 합의할 때 안정적으로 유지될 수 있습니다";
    const text = `${repeated}.\n다른 문장입니다.\n${repeated}.`;
    const hits = detectSukuyoRepeatedSentences(text, 30);
    expect(hits.length).toBeGreaterThan(0);
  });

  test("H. 금지 문구가 포함되면 챕터 검증은 실패해야 한다", () => {
    const canonical = makeCanonicalCompatibility();
    const text = [
      buildSukuyoDataSummaryTable(canonical),
      "## 1. 이 챕터의 핵심 결론",
      "A와 B의 관계는 영친 구조입니다.",
      "## 2. 상세 해석",
      "류宿은 달의 리듬과 관계의 반복 패턴을 통해 삶을 읽는 숙요점 데이터입니다.",
      "## 3. 현실 장면",
      "일상 대화에서 거리감이 줄어드는 장면을 관찰합니다.",
      "## 4. 위험 패턴",
      "역할 고정이 강해지면 오해가 커집니다.",
      "## 5. 조율 전략",
      "감정과 일정 기준을 분리해 합의합니다.",
      "## 6. 챕터 요약",
      "관계 유형, 거리, 역할을 실행 규칙으로 번역해야 합니다.",
    ].join("\n\n");

    const result = validateSukuyoChapterText(text, canonical, "compatibility", 10, []);
    expect(result.isValid).toBe(false);
    expect(result.details.forbiddenUsed.length).toBeGreaterThan(0);
  });

  test("I. host 데이터가 누락되면 strict validation은 실패해야 한다", () => {
    const broken = makeCanonicalCompatibility();
    broken.personB.sukuyo.index = null;
    broken.personB.birth.lunarDate = null;

    const result = validateCanonicalSukuyoCompatibility(broken);
    expect(result.hasPersonBHost).toBe(false);
    expect(result.missingFields).toContain("personB.sukuyo.index");
    expect(result.missingFields).toContain("personB.birth.lunarDate");
  });

  test("J. lunarDate/sukuyoIndex 누락 시 missingFields에 반드시 기록되어야 한다", () => {
    const broken = makeCanonicalCompatibility();
    broken.personA.birth.lunarDate = null;
    broken.personA.sukuyo.index = null;

    const result = validateCanonicalSukuyoCompatibility(broken);
    expect(result.missingFields).toContain("personA.birth.lunarDate");
    expect(result.missingFields).toContain("personA.sukuyo.index");
  });

  test("K. 같은 관계 유형(영친)이라도 거리/방향이 다르면 궁합 지수와 변형 키가 달라야 한다", () => {
    const aIndex = calcBasicScreenIndex(5, 17);
    const nearCanonical = makeCanonicalByIndices(aIndex, (aIndex + 1) % 27); // 영친
    const midCanonical = makeCanonicalByIndices(aIndex, (aIndex + 8) % 27); // 영친

    const nearComp = nearCanonical.compatibility;
    const midComp = midCanonical.compatibility;

    expect(nearComp.relationType).toBe("영친");
    expect(midComp.relationType).toBe("영친");
    expect(nearComp.compatibilityIndex).not.toBe(midComp.compatibilityIndex);
    expect(nearComp.relationVariant).not.toBe(midComp.relationVariant);
  });
});
