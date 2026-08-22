/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/palm/palm-ui-requirements.test.js --testEnvironment node
 */

const fs = require("fs");
const path = require("path");

const {
  getPalmHandRoles,
  canStartPalmAnalysis,
  mapPalmAnalyzeError,
  shouldShowPalmResult,
  revokeObjectUrls,
  createPalmUiResetSnapshot,
} = require("../../lib/palm/palm-ui-state.js");
const { buildBothHandsComparison } = require("../../lib/palm/both-hands-comparison.js");

const mainPath = path.join(process.cwd(), "app", "palm-reading", "PalmDestinyMain.tsx");
const copyPath = path.join(process.cwd(), "app", "palm-reading", "_lib", "copy.ts");
const interpretationPath = path.join(process.cwd(), "lib", "palm", "interpretation-engine.ts");

function makeLine(overrides = {}) {
  return {
    detected: false,
    summary: "",
    advice: "",
    ...overrides,
  };
}

function makeHand(overrides = {}) {
  return {
    handShape: {
      type: "unknown",
      labelKo: "",
      palmRatio: "unknown",
      fingerRatio: "unknown",
      summary: "",
    },
    majorLines: {
      lifeLine: {
        ...makeLine({ length: "unknown", depth: "unknown", curvature: "unknown", breaks: 0, branches: 0 }),
      },
      headLine: {
        ...makeLine({ length: "unknown", direction: "unknown", startRelationWithLifeLine: "unknown", breaks: 0, branches: 0 }),
      },
      heartLine: {
        ...makeLine({ length: "unknown", curvature: "unknown", endingArea: "unknown", breaks: 0, branches: 0 }),
      },
      fateLine: {
        ...makeLine({ strength: "unknown", startArea: "unknown", endArea: "unknown", breaks: 0 }),
      },
    },
    minorLines: {
      sunLine: { detected: false, strength: null, summary: "" },
      moneyLine: { detected: false, strength: null, summary: "" },
      marriageLine: { detected: false, strength: null, summary: "" },
      mercuryLine: { detected: false, strength: null, summary: "" },
    },
    mounts: {
      venus: { fullness: "unknown", summary: "" },
      moon: { fullness: "unknown", summary: "" },
      jupiter: { fullness: "unknown", summary: "" },
      saturn: { fullness: "unknown", summary: "" },
      sun: { fullness: "unknown", summary: "" },
      mercury: { fullness: "unknown", summary: "" },
      mars: { fullness: "unknown", summary: "" },
    },
    scores: {
      love: null,
      career: null,
      wealth: null,
      vitality: null,
      creativity: null,
      communication: null,
    },
    overall: {
      title: "",
      summary: "",
      strengths: [],
      cautions: [],
      recommendedActions: [],
    },
    ...overrides,
  };
}

describe("Palm UI requirements", () => {
  test("Test A: 손바닥 이미지가 없으면 분석 버튼 활성 조건이 false다", () => {
    const canStart = canStartPalmAnalysis({
      leftFile: null,
      rightFile: null,
      dominantHand: "right",
      analysisPurpose: "general",
      isSubmitting: false,
    });

    expect(canStart).toBe(false);
  });

  test("Test B: 주로 쓰는 손 미선택이면 분석 버튼 활성 조건이 false다", () => {
    const canStart = canStartPalmAnalysis({
      leftFile: { name: "left.jpg" },
      rightFile: null,
      dominantHand: "",
      analysisPurpose: "general",
      isSubmitting: false,
    });

    expect(canStart).toBe(false);
  });

  test("Test C: 분석 목적 미선택이면 분석 버튼 활성 조건이 false다", () => {
    const canStart = canStartPalmAnalysis({
      leftFile: { name: "left.jpg" },
      rightFile: null,
      dominantHand: "left",
      analysisPurpose: "",
      isSubmitting: false,
    });

    expect(canStart).toBe(false);
  });

  test("Test D: 손바닥 인식 실패 코드면 실패 안내 문구가 나온다", () => {
    const msg = mapPalmAnalyzeError({
      status: 422,
      code: "PALM_NOT_DETECTED",
      message: "손바닥 인식에 실패했습니다.",
    });

    expect(msg).toContain("손바닥");
    expect(msg).toContain("다시");
  });

  test("Test E: 흐릿한 이미지 코드면 재촬영 안내 문구가 나온다", () => {
    const msg = mapPalmAnalyzeError({
      status: 423,
      code: "IMAGE_QUALITY_LOW",
      message: "이미지 품질이 부족합니다.",
    });

    expect(msg).toContain("선명");
    expect(msg).toContain("다시");
  });

  test("Test E-1: reasonCode=LOW_CONFIDENCE면 부분 분석 안내 문구가 나온다", () => {
    const msg = mapPalmAnalyzeError({
      status: 422,
      code: "PALM_DETECTION_FAILED",
      reasonCode: "LOW_CONFIDENCE",
      message: "손바닥은 감지되었지만 선명도가 낮습니다.",
    });

    expect(msg).toContain("손바닥");
    expect(msg).toContain("다시");
  });

  test("Test E-2: status=415면 지원 형식 안내 문구가 나온다", () => {
    const msg = mapPalmAnalyzeError({
      status: 415,
      code: "UNSUPPORTED_IMAGE_TYPE",
      message: "지원하지 않는 형식입니다.",
    });

    expect(msg).toContain("지원하지 않는 이미지 형식");
  });

  test("Test F: hasPalm=false면 결과 표시 조건이 false다", () => {
    expect(shouldShowPalmResult({ validation: { hasPalm: false } })).toBe(false);
    expect(shouldShowPalmResult({ validation: { hasPalm: true } })).toBe(true);
  });

  test("Test G: dominantHand=right 역할 매핑이 맞다", () => {
    const roles = getPalmHandRoles("right");
    expect(roles.rightHandRole).toBe("acquired");
    expect(roles.leftHandRole).toBe("innate");
  });

  test("Test H: dominantHand=left 역할 매핑이 맞다", () => {
    const roles = getPalmHandRoles("left");
    expect(roles.leftHandRole).toBe("acquired");
    expect(roles.rightHandRole).toBe("innate");
  });

  test("Test I: dominantHand=both 역할 매핑이 맞다", () => {
    const roles = getPalmHandRoles("both");
    expect(roles.leftHandRole).toBe("mixed");
    expect(roles.rightHandRole).toBe("mixed");
  });

  test("Test J: 양손 업로드 시 선천/현재 섹션 문구가 노출된다", () => {
    const result = buildBothHandsComparison({
      uploadedHands: ["left", "right"],
      dominantHand: "right",
      leftHandRole: "innate",
      rightHandRole: "acquired",
      leftHandReading: makeHand(),
      rightHandReading: makeHand(),
    });

    expect(result.innateSummary).toContain("타고난 당신의 손");
    expect(result.acquiredSummary).toContain("현재 살아가는 당신의 손");
  });

  test("Test K: 한 손 업로드여도 해당 손 역할 설명 문구가 노출된다", () => {
    const result = buildBothHandsComparison({
      uploadedHands: ["right"],
      dominantHand: "right",
      leftHandRole: "innate",
      rightHandRole: "acquired",
      leftHandReading: null,
      rightHandReading: makeHand(),
    });

    expect(result.enabled).toBe(false);
    expect(result.acquiredSummary).toContain("후천적 손");
  });

  test("Test L/M/N: 해석 엔진에 금지 단정 표현 필터 규칙이 포함된다", () => {
    const source = fs.readFileSync(interpretationPath, "utf8");

    expect(source).toContain("수명이 짧다");
    expect(source).toContain("결혼을 몇 번 한다");
    expect(source).toContain("반드시 부자가 된다");
    expect(source).toContain("단정할 수 없습니다");
  });

  test("Test O: 결과 화면에 PDF 다운로드 버튼 문자열이 없다", () => {
    const source = fs.readFileSync(mainPath, "utf8");
    expect(source.includes("PDF 다운로드")).toBe(false);
    expect(source.includes("pdfDownload")).toBe(false);
  });

  test("Test P: 모바일 360px 대응용 터치/스크롤 클래스가 유지된다", () => {
    const source = fs.readFileSync(mainPath, "utf8");

    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-h-[46px]");
  });

  test("Test Q: 다시 분석 리셋 스냅샷은 이전 결과를 초기화한다", () => {
    const reset = createPalmUiResetSnapshot({
      keepSelection: false,
      dominantHand: "right",
      analysisPurpose: "love",
    });

    expect(reset.analysisResult).toBe(null);
    expect(reset.isSubmitting).toBe(false);
    expect(reset.submitMessage).toBe("");
    expect(reset.dominantHand).toBe("");
    expect(reset.analysisPurpose).toBe("");
  });

  test("Test R: objectURL revoke 유틸은 화면 이탈 정리에서 URL을 해제한다", () => {
    const revoked = [];
    const revokeCount = revokeObjectUrls(["blob:a", null, "", "blob:b"], (url) => revoked.push(url));

    expect(revokeCount).toBe(2);
    expect(revoked).toEqual(["blob:a", "blob:b"]);
  });

  test("Test S: 카드 간 문장 중복 방지 후처리 연결이 존재한다", () => {
    const source = fs.readFileSync(interpretationPath, "utf8");

    expect(source).toContain("function enforceCardSentenceUniqueness");
    expect(source).toContain("const uniqueCards = enforceCardSentenceUniqueness(sanitizedCards)");
    expect(source).toContain("cards: uniqueCards");
  });

  test("Test T: 손금 화면에 전체화면 토글 버튼이 존재해야 한다", () => {
    // 🔴 2026-08-22 다국어화(_lib/copy.ts 도입)로 이 문구가 클라이언트 소스가 아니라 카피 모듈로 이동했다.
    const copySource = fs.readFileSync(copyPath, "utf8");

    expect(copySource).toContain("전체화면");
    expect(copySource).toContain("기본 화면");
  });

  test("Test U: 손금 결과 화면에 특수 손금 감지 섹션이 존재해야 한다", () => {
    const source = fs.readFileSync(mainPath, "utf8");
    const copySource = fs.readFileSync(copyPath, "utf8");

    expect(copySource).toContain("특수 손금 감지");
    expect(source).toContain("detectedSpecialPatterns");
  });
});
