/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/palm/both-hands-comparison.test.js --testEnvironment node
 */

const { buildBothHandsComparison } = require("../../lib/palm/both-hands-comparison.js");

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

describe("Palm both-hands comparison", () => {
  test("한 손 업로드면 enabled=false와 역할 안내 문구를 반환한다", () => {
    const rightHand = makeHand();

    const result = buildBothHandsComparison({
      uploadedHands: ["right"],
      dominantHand: "right",
      leftHandRole: "innate",
      rightHandRole: "acquired",
      leftHandReading: null,
      rightHandReading: rightHand,
    });

    expect(result.enabled).toBe(false);
    expect(result.acquiredSummary).toContain("현재 살아가는 당신의 손");
    expect(result.acquiredSummary).toContain("오른손");
    expect(result.acquiredSummary).toContain("후천적 손");
  });

  test("양손 비교 시 생명선/두뇌선/운명선 비교 규칙 문구를 생성한다", () => {
    const innate = makeHand({
      majorLines: {
        lifeLine: makeLine({ detected: true, depth: "deep", length: "long", curvature: "wide", breaks: 0, branches: 1 }),
        headLine: makeLine({ detected: true, direction: "curved", startRelationWithLifeLine: "joined", length: "long", breaks: 0, branches: 1 }),
        heartLine: makeLine({ detected: true, length: "long", curvature: "strong", endingArea: "underIndex", breaks: 0, branches: 2 }),
        fateLine: makeLine({ detected: true, strength: "weak", startArea: "lifeLine", endArea: "middlePalm", breaks: 1 }),
      },
      minorLines: {
        sunLine: { detected: true, strength: "weak", summary: "" },
        moneyLine: { detected: true, strength: "weak", summary: "" },
        marriageLine: { detected: true, strength: "weak", summary: "" },
        mercuryLine: { detected: false, strength: null, summary: "" },
      },
      mounts: {
        venus: { fullness: "medium", summary: "" },
        moon: { fullness: "unknown", summary: "" },
        jupiter: { fullness: "unknown", summary: "" },
        saturn: { fullness: "unknown", summary: "" },
        sun: { fullness: "unknown", summary: "" },
        mercury: { fullness: "weak", summary: "" },
        mars: { fullness: "unknown", summary: "" },
      },
    });

    const acquired = makeHand({
      majorLines: {
        lifeLine: makeLine({ detected: true, depth: "faint", length: "medium", curvature: "normal", breaks: 1, branches: 0 }),
        headLine: makeLine({ detected: true, direction: "straight", startRelationWithLifeLine: "separated", length: "medium", breaks: 0, branches: 0 }),
        heartLine: makeLine({ detected: true, length: "medium", curvature: "soft", endingArea: "between", breaks: 1, branches: 0 }),
        fateLine: makeLine({ detected: true, strength: "strong", startArea: "wrist", endArea: "saturnMount", breaks: 0 }),
      },
      minorLines: {
        sunLine: { detected: true, strength: "strong", summary: "" },
        moneyLine: { detected: true, strength: "strong", summary: "" },
        marriageLine: { detected: true, strength: "strong", summary: "" },
        mercuryLine: { detected: false, strength: null, summary: "" },
      },
      mounts: {
        venus: { fullness: "strong", summary: "" },
        moon: { fullness: "unknown", summary: "" },
        jupiter: { fullness: "unknown", summary: "" },
        saturn: { fullness: "unknown", summary: "" },
        sun: { fullness: "unknown", summary: "" },
        mercury: { fullness: "strong", summary: "" },
        mars: { fullness: "unknown", summary: "" },
      },
    });

    const result = buildBothHandsComparison({
      uploadedHands: ["left", "right"],
      dominantHand: "right",
      leftHandRole: "innate",
      rightHandRole: "acquired",
      leftHandReading: innate,
      rightHandReading: acquired,
    });

    expect(result.enabled).toBe(true);
    expect(result.innateSummary).toContain("타고난 당신의 손");
    expect(result.acquiredSummary).toContain("현재 살아가는 당신의 손");
    expect(result.differenceSummary).toContain("본래 회복력은 좋지만 현재는 에너지 소모가 커진 상태");
    expect(result.differenceSummary).toContain("본래 감수성이 강하지만 현재는 현실 판단이 강화됨");
    expect(result.differenceSummary).toContain("현재 삶에서 목표의식과 사회적 방향성이 강화됨");
  });

  test("dominantHand=both면 비교를 보수적으로 유보한다", () => {
    const result = buildBothHandsComparison({
      uploadedHands: ["left", "right"],
      dominantHand: "both",
      leftHandRole: "mixed",
      rightHandRole: "mixed",
      leftHandReading: makeHand(),
      rightHandReading: makeHand(),
    });

    expect(result.enabled).toBe(false);
    expect(result.innateSummary).toContain("dominantHand가 both");
    expect(result.differenceSummary).toContain("양손 고정 해석을 피하기 위해 비교를 제한");
  });
});
