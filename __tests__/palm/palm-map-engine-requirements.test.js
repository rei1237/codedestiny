/**
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");

const {
  analyzePalmHandInput,
  normalizePalmCoordinateSystem,
  applySafetyExpressionFilter,
} = require("../../lib/palm/palm-map-engine.js");

function buildLandmarks({ palmLength, palmWidth, fingerAvg, middleLen }) {
  const halfPalm = palmWidth / 2;
  return {
    wrist: { x: 0, y: palmLength },
    thumbBase: { x: -halfPalm + 12, y: palmLength * 0.34 },
    thumbTip: { x: -halfPalm + 2, y: palmLength * 0.05 },
    indexBase: { x: -halfPalm, y: 0 },
    indexTip: { x: -halfPalm, y: -fingerAvg },
    middleBase: { x: 0, y: 0 },
    middleTip: { x: 0, y: -middleLen },
    ringBase: { x: palmWidth * 0.2, y: 0 },
    ringTip: { x: palmWidth * 0.2, y: -fingerAvg },
    littleBase: { x: halfPalm, y: 0 },
    littleTip: { x: halfPalm, y: -fingerAvg * 0.88 },
  };
}

function makeShapeInput(shape) {
  const map = {
    earth: { palmLength: 100, palmWidth: 108, fingerAvg: 70, middleLen: 72 },
    fire: { palmLength: 125, palmWidth: 100, fingerAvg: 92, middleLen: 96 },
    air: { palmLength: 104, palmWidth: 101, fingerAvg: 88, middleLen: 92 },
    water: { palmLength: 130, palmWidth: 101, fingerAvg: 108, middleLen: 114 },
  };

  return {
    dominantHand: "right",
    uploadedHandSide: "right",
    analysisPurpose: "general",
    imageQuality: {
      brightness: "good",
      sharpness: "good",
      contrast: "good",
      palmCoverage: 0.88,
    },
    handLandmarks: buildLandmarks(map[shape]),
    lineCandidates: [],
  };
}

function makeCandidate(id, normPath, ctx, overrides = {}) {
  const rawPath = normPath.map((p) => ctx.toOriginal(p));
  return {
    id,
    path: rawPath,
    startPoint: rawPath[0],
    endPoint: rawPath[rawPath.length - 1],
    length: overrides.length || 0.5,
    depthScore: overrides.depthScore == null ? 0.78 : overrides.depthScore,
    curvatureScore: overrides.curvatureScore == null ? 0.52 : overrides.curvatureScore,
    boundingBox: { x: 0, y: 0, width: 10, height: 10 },
    branches: overrides.branches == null ? 1 : overrides.branches,
    breaks: overrides.breaks == null ? 0 : overrides.breaks,
    confidence: overrides.confidence == null ? 0.91 : overrides.confidence,
  };
}

function makeLineRichInput({ dominantHand = "right", uploadedHandSide = "right" } = {}) {
  const handLandmarks = buildLandmarks({ palmLength: 122, palmWidth: 102, fingerAvg: 92, middleLen: 102 });
  const ctx = normalizePalmCoordinateSystem({ handLandmarks, lineCandidates: [], uploadedHandSide });

  const life = makeCandidate(
    "life",
    [
      { x: 0.36, y: 0.19 },
      { x: 0.27, y: 0.31 },
      { x: 0.22, y: 0.47 },
      { x: 0.24, y: 0.66 },
      { x: 0.31, y: 0.86 },
    ],
    ctx,
    { length: 0.62, depthScore: 0.81, curvatureScore: 0.64, branches: 3 },
  );

  const head = makeCandidate(
    "head",
    [
      { x: 0.35, y: 0.38 },
      { x: 0.27, y: 0.42 },
      { x: 0.18, y: 0.46 },
    ],
    ctx,
    { length: 0.49, depthScore: 0.74, curvatureScore: 0.18 },
  );

  const heart = makeCandidate(
    "heart",
    [
      { x: 0.84, y: 0.23 },
      { x: 0.71, y: 0.21 },
      { x: 0.56, y: 0.22 },
      { x: 0.38, y: 0.24 },
      { x: 0.23, y: 0.29 },
    ],
    ctx,
    { length: 0.57, depthScore: 0.82, curvatureScore: 0.42, branches: 3 },
  );

  const fate = makeCandidate(
    "fate",
    [
      { x: 0.50, y: 0.86 },
      { x: 0.50, y: 0.72 },
      { x: 0.50, y: 0.56 },
      { x: 0.50, y: 0.38 },
      { x: 0.51, y: 0.20 },
    ],
    ctx,
    { length: 0.64, depthScore: 0.76, curvatureScore: 0.12 },
  );

  const sun = makeCandidate(
    "sun",
    [
      { x: 0.66, y: 0.57 },
      { x: 0.66, y: 0.45 },
      { x: 0.66, y: 0.30 },
      { x: 0.66, y: 0.19 },
    ],
    ctx,
    { length: 0.36, depthScore: 0.7, curvatureScore: 0.1, confidence: 0.93 },
  );

  const money = makeCandidate(
    "money",
    [
      { x: 0.65, y: 0.74 },
      { x: 0.73, y: 0.59 },
      { x: 0.80, y: 0.44 },
      { x: 0.85, y: 0.30 },
    ],
    ctx,
    { length: 0.43, depthScore: 0.75, curvatureScore: 0.28, branches: 2 },
  );

  const marriage = makeCandidate(
    "marriage",
    [
      { x: 0.86, y: 0.33 },
      { x: 0.80, y: 0.33 },
      { x: 0.77, y: 0.34 },
    ],
    ctx,
    { length: 0.18, depthScore: 0.66, curvatureScore: 0.1, branches: 1 },
  );

  const comm = makeCandidate(
    "comm",
    [
      { x: 0.82, y: 0.64 },
      { x: 0.82, y: 0.52 },
      { x: 0.83, y: 0.38 },
      { x: 0.84, y: 0.25 },
    ],
    ctx,
    { length: 0.38, depthScore: 0.72, curvatureScore: 0.16, breaks: 1 },
  );

  return {
    dominantHand,
    uploadedHandSide,
    analysisPurpose: "general",
    imageQuality: {
      brightness: "good",
      sharpness: "good",
      contrast: "good",
      palmCoverage: 0.87,
    },
    handLandmarks,
    lineCandidates: [life, head, heart, fate, sun, money, marriage, comm],
  };
}

describe("Palm map engine requirements", () => {
  test("Test A: 흙의 손 조건에 맞는 입력이면 handShape.type이 earth가 되어야 한다", () => {
    const result = analyzePalmHandInput(makeShapeInput("earth"));
    expect(result.handReading.handShape.type).toBe("earth");
  });

  test("Test B: 불의 손 조건에 맞는 입력이면 handShape.type이 fire가 되어야 한다", () => {
    const result = analyzePalmHandInput(makeShapeInput("fire"));
    expect(result.handReading.handShape.type).toBe("fire");
  });

  test("Test C: 바람의 손 조건에 맞는 입력이면 handShape.type이 air가 되어야 한다", () => {
    const result = analyzePalmHandInput(makeShapeInput("air"));
    expect(result.handReading.handShape.type).toBe("air");
  });

  test("Test D: 물의 손 조건에 맞는 입력이면 handShape.type이 water가 되어야 한다", () => {
    const result = analyzePalmHandInput(makeShapeInput("water"));
    expect(result.handReading.handShape.type).toBe("water");
  });

  test("Test E: 엄지와 검지 사이 시작 + 금성구 곡선은 생명선으로 분류되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    expect(result.recognitionData.lines.lifeLine.detected).toBe(true);
  });

  test("Test F: 손바닥 중앙 가로선은 두뇌선으로 분류되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    expect(result.recognitionData.lines.headLine.detected).toBe(true);
  });

  test("Test G: 손가락 아래 위쪽 가로선은 감정선으로 분류되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    expect(result.recognitionData.lines.heartLine.detected).toBe(true);
  });

  test("Test H: 중앙 세로 상승선은 운명선으로 분류되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    expect(result.recognitionData.lines.fateLine.detected).toBe(true);
  });

  test("Test I: 수성구 부근 짧은 가로선은 결혼선 후보로 분류되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    expect(result.recognitionData.lines.marriageLine.detected).toBe(true);
  });

  test("Test J: 수성구 방향 세로/사선은 재물선 후보로 분류되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    expect(result.recognitionData.lines.moneyLine.detected).toBe(true);
  });

  test("Test K: 결혼선 해석에 결혼 횟수 단정이 나오면 실패해야 한다", () => {
    const unsafe = "결혼을 몇 번 한다";
    const safe = applySafetyExpressionFilter(unsafe);
    expect(safe).not.toContain("결혼을 몇 번 한다");
  });

  test("Test L: 생명선 해석에 수명 단정이 나오면 실패해야 한다", () => {
    const unsafe = "수명이 짧다";
    const safe = applySafetyExpressionFilter(unsafe);
    expect(safe).not.toContain("수명이 짧다");
  });

  test("Test M: 재물선 해석에 확정 재물 예언이 나오면 실패해야 한다", () => {
    const unsafe = "반드시 부자가 된다";
    const safe = applySafetyExpressionFilter(unsafe);
    expect(safe).not.toContain("반드시 부자가 된다");
  });

  test("Test N: 금성구/월구/목성구/토성구/태양구/수성구/화성구가 결과에 표시되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    const mounts = result.recognitionData.mounts;
    expect(mounts.venus).toBeTruthy();
    expect(mounts.moon).toBeTruthy();
    expect(mounts.jupiter).toBeTruthy();
    expect(mounts.saturn).toBeTruthy();
    expect(mounts.sun).toBeTruthy();
    expect(mounts.mercury).toBeTruthy();
    expect(mounts.mars).toBeTruthy();
  });

  test("Test O: 구丘 설명이 결과 화면에 포함되어야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    const mountSummary = result.handReading.mounts.venus.summary;
    expect(mountSummary).toContain("금성구");
  });

  test("Test P: 감지되지 않은 선은 detected=false와 unknown 값을 가져야 한다", () => {
    const input = makeShapeInput("earth");
    const result = analyzePalmHandInput(input);
    const life = result.recognitionData.lines.lifeLine;
    expect(life.detected).toBe(false);
    expect(life.confidence).toBe("unknown");
    expect(life.lengthLabel).toBe("unknown");
  });

  test("Test Q: 조합 해석은 실제 감지된 특징만 사용해야 한다", () => {
    const result = analyzePalmHandInput(makeLineRichInput());
    const combos = result.recognitionData.combinations;
    expect(combos.length).toBeGreaterThanOrEqual(1);

    const detectedLines = result.recognitionData.lines;
    for (const combo of combos) {
      if (combo.key === "fate-sun") {
        expect(detectedLines.sunLine.detected).toBe(true);
      }
      if (combo.key === "heart-venus") {
        expect(detectedLines.heartLine.detected).toBe(true);
      }
      if (combo.key === "heart-mercury") {
        expect(detectedLines.heartLine.detected).toBe(true);
      }
    }
  });

  test("Test R: 오른손잡이는 오른손 후천적 손, 왼손 선천적 손으로 판별되어야 한다", () => {
    const right = analyzePalmHandInput(makeLineRichInput({ dominantHand: "right", uploadedHandSide: "right" }));
    const left = analyzePalmHandInput(makeLineRichInput({ dominantHand: "right", uploadedHandSide: "left" }));

    expect(right.handRole).toBe("acquired");
    expect(left.handRole).toBe("innate");
  });

  test("Test S: 왼손잡이는 왼손 후천적 손, 오른손 선천적 손으로 판별되어야 한다", () => {
    const left = analyzePalmHandInput(makeLineRichInput({ dominantHand: "left", uploadedHandSide: "left" }));
    const right = analyzePalmHandInput(makeLineRichInput({ dominantHand: "left", uploadedHandSide: "right" }));

    expect(left.handRole).toBe("acquired");
    expect(right.handRole).toBe("innate");
  });

  test("Test T: 사용자 화면에는 디버그/검출 용어가 노출되지 않아야 한다", () => {
    const uiPath = path.join(process.cwd(), "app", "palm-reading", "PalmDestinyMain.tsx");
    const source = fs.readFileSync(uiPath, "utf8");

    expect(source).not.toContain("실제 인식 데이터 보기");
    expect(source).not.toContain("손금 용어 설명");
    expect(source).not.toContain("해석 섹션 아코디언");
    expect(source).not.toMatch(/palmRatio|fingerRatio|upperPalm|middlePalm|lowerPalm|검출 근거|보수적 해석|감지되지 않음/);
  });
});
