import { strict as assert } from "node:assert";
import {
  calculateFourTransformations,
  normalizePalaceName,
} from "./ziwei-advanced-normalization";
import {
  calculateZiweiChart,
  normalizeZiweiForAdvancedReport,
  validateAdvancedZiweiResult,
} from "./ziwei-engine";
import type { ZiweiPalace } from "./ziwei-types";

function renderPalaceInterpretation(palace: {
  name: string;
  mainStars?: unknown[] | null;
  fourTransformations?: unknown[] | null;
}): string {
  if (palace.mainStars === undefined || palace.mainStars === null) {
    return "명반 계산 데이터가 불완전합니다.";
  }
  if (palace.mainStars.length === 0) {
    return "이 궁은 주성이 직접 자리하지 않는 무주성궁입니다.";
  }
  if (palace.fourTransformations === undefined || palace.fourTransformations === null) {
    return "명반 계산 데이터가 불완전합니다.";
  }
  if (palace.fourTransformations.length === 0) {
    return "이 궁에는 생년사화가 직접 들어오지 않았습니다.";
  }
  return "정상 해석";
}

function makePalacesForSihuaTest() {
  return [
    { index: 0, name: "명궁", branch: "자", mainStars: [{ name: "거문" }] },
    { index: 1, name: "형제궁", branch: "축", mainStars: [{ name: "태양" }] },
    { index: 2, name: "부부궁", branch: "인", mainStars: [{ name: "문곡" }] },
    { index: 3, name: "자녀궁", branch: "묘", mainStars: [{ name: "문창" }] },
  ];
}

export function runZiweiAdvancedSelfTests() {
  // 테스트 1: 사화 계산 테스트
  const palaces = makePalacesForSihuaTest();
  const t = calculateFourTransformations({ yearStem: "신", palaces });
  assert.equal(t.byType.록?.starName, "거문");
  assert.equal(t.byType.권?.starName, "태양");
  assert.equal(t.byType.과?.starName, "문곡");
  assert.equal(t.byType.기?.starName, "문창");

  // 테스트 2: 무주성궁은 오류가 아님
  const emptyMain = {
    name: "형제궁",
    mainStars: [] as unknown[],
    fourTransformations: [],
  };
  assert.equal(emptyMain.mainStars.length === 0, true);
  assert.equal(renderPalaceInterpretation(emptyMain).includes("주성이 비어 있어 보수적으로"), false);
  assert.equal(renderPalaceInterpretation(emptyMain).includes("무주성궁"), true);

  // 테스트 3: 사화 직접 없음은 오류가 아님
  const noDirectSihua = {
    name: "자녀궁",
    mainStars: [{ name: "천동" }],
    fourTransformations: [] as unknown[],
  };
  assert.equal(renderPalaceInterpretation(noDirectSihua).includes("사화 정보가 없어"), false);
  assert.equal(renderPalaceInterpretation(noDirectSihua).includes("생년사화가 직접 들어오지"), true);

  // 테스트 4: 부처궁/부부궁 정규화
  assert.equal(normalizePalaceName("부처궁"), "부부궁");
  assert.equal(normalizePalaceName("배우자궁"), "부부궁");

  // 테스트 5: 심화 결과 모든 궁 필수 필드 보장
  const base = calculateZiweiChart({
    name: "테스트",
    birthYear: 1992,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 12,
    birthMinute: 0,
    unknownHour: false,
    gender: "F",
    calendarType: "solar",
    isLeapMonth: false,
    birthPlace: "서울",
    timezone: "Asia/Seoul",
  });
  const normalized = normalizeZiweiForAdvancedReport(base);
  const validation = validateAdvancedZiweiResult(normalized);
  assert.equal(validation.valid, true);

  normalized.palaces.forEach((palace: ZiweiPalace) => {
    assert.ok(palace.name);
    assert.ok(palace.branch);
    assert.equal(Array.isArray(palace.mainStars), true);
    assert.equal(Array.isArray(palace.fourTransformations), true);
    assert.ok(palace.sanFangSiZheng);
  });
}
