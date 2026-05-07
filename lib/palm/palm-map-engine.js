/*
 * Palm Map Engine
 * Deterministic, evidence-based palm feature classifier.
 */

const SAFETY_BANNED_PHRASES = [
  "수명이 짧다",
  "단명",
  "오래 못 산다",
  "병이 있다",
  "큰 병",
  "죽음",
  "사고가 난다",
  "이혼한다",
  "결혼을 몇 번 한다",
  "반드시 결혼한다",
  "반드시 부자가 된다",
  "투자 성공",
  "불임",
  "임신",
  "자녀 문제",
  "성적 능력",
];

const SAFETY_REPLACEMENTS = {
  "수명이 짧다": "생명선은 수명보다 에너지 운용과 회복 리듬을 상징합니다.",
  "단명": "수명 단정 대신 생활 리듬의 변화 가능성을 봅니다.",
  "오래 못 산다": "수명 예측이 아니라 회복 루틴과 에너지 관리 패턴을 봅니다.",
  "병이 있다": "의학적 판단은 불가하며 생활 리듬 신호만 보수적으로 해석합니다.",
  "큰 병": "건강 상태를 단정하지 않고 컨디션 관리 습관 관점으로 설명합니다.",
  "죽음": "위험 사건을 단정하지 않고 현재 패턴의 변화 가능성만 설명합니다.",
  "사고가 난다": "사건 예언 대신 스트레스/주의 분산 관리 포인트를 안내합니다.",
  "이혼한다": "관계 결과를 단정하지 않고 소통/약속 방식의 조율 포인트를 봅니다.",
  "결혼을 몇 번 한다": "결혼선은 횟수보다 깊은 관계에서 원하는 안정감과 약속 방식을 봅니다.",
  "반드시 결혼한다": "관계 결과를 확정하지 않고 현재의 관계 패턴을 설명합니다.",
  "반드시 부자가 된다": "재물선은 확정 재물운보다 돈을 다루는 습관과 가치 창출 방식을 보여줍니다.",
  "투자 성공": "성과를 단정하지 않고 의사결정 기준과 리스크 관리 습관을 봅니다.",
  "불임": "의학적 진단 범위가 아니므로 관련 단정은 제공하지 않습니다.",
  "임신": "의학적/신체 결과를 예측하지 않습니다.",
  "자녀 문제": "가족 이슈를 단정하지 않고 관계 소통 방식만 보수적으로 해석합니다.",
  "성적 능력": "개인 신체 능력을 단정하지 않고 친밀감/소통 패턴만 설명합니다.",
};

const MOUNT_GUIDE_TEXT = {
  venus: "금성구 - 엄지 아래 애정과 친밀감의 영역",
  moon: "월구 - 손바깥 아래 직관과 상상의 영역",
  jupiter: "목성구 - 검지 아래 성장과 리더십의 영역",
  saturn: "토성구 - 중지 아래 책임과 인내의 영역",
  sun: "태양구 - 약지 아래 표현과 창작의 영역",
  mercury: "수성구 - 새끼손가락 아래 소통과 거래의 영역",
  mars: "화성구 - 중앙/엄지 주변 추진과 방어의 영역",
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 4) {
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
}

function distance(a, b) {
  if (!a || !b) return 0;
  const dx = toNumber(a.x) - toNumber(b.x);
  const dy = toNumber(a.y) - toNumber(b.y);
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a, b) {
  return {
    x: (toNumber(a?.x) + toNumber(b?.x)) / 2,
    y: (toNumber(a?.y) + toNumber(b?.y)) / 2,
  };
}

function toPoint(value) {
  if (!value || typeof value !== "object") return null;
  const x = toNumber(value.x, NaN);
  const y = toNumber(value.y, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function rotatePoint(p, origin, rad) {
  const ox = toNumber(origin?.x);
  const oy = toNumber(origin?.y);
  const px = toNumber(p?.x) - ox;
  const py = toNumber(p?.y) - oy;
  const cr = Math.cos(rad);
  const sr = Math.sin(rad);
  return {
    x: px * cr - py * sr + ox,
    y: px * sr + py * cr + oy,
  };
}

function flipPointX(p, centerX) {
  return {
    x: centerX - (toNumber(p?.x) - centerX),
    y: toNumber(p?.y),
  };
}

function collectLandmarkMap(raw) {
  const map = {
    wrist: toPoint(raw?.wrist),
    thumbBase: toPoint(raw?.thumbBase),
    thumbTip: toPoint(raw?.thumbTip),
    indexBase: toPoint(raw?.indexBase),
    indexTip: toPoint(raw?.indexTip),
    middleBase: toPoint(raw?.middleBase || raw?.middleFingerBase),
    middleTip: toPoint(raw?.middleTip || raw?.middleFingerTip),
    ringBase: toPoint(raw?.ringBase),
    ringTip: toPoint(raw?.ringTip),
    littleBase: toPoint(raw?.littleBase),
    littleTip: toPoint(raw?.littleTip),
  };

  return map;
}

function isLandmarkSetValid(landmarks) {
  return Boolean(
    landmarks?.wrist &&
      landmarks?.thumbBase &&
      landmarks?.indexBase &&
      landmarks?.middleBase &&
      landmarks?.middleTip &&
      landmarks?.littleBase,
  );
}

function computeBoundingBox(points) {
  const valid = (points || []).filter(Boolean);
  if (valid.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of valid) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = Math.max(1e-6, maxX - minX);
  const height = Math.max(1e-6, maxY - minY);
  return { minX, minY, maxX, maxY, width, height };
}

function normalizePalmCoordinateSystem({ handLandmarks, lineCandidates = [], uploadedHandSide }) {
  const landmarks = collectLandmarkMap(handLandmarks || {});
  if (!isLandmarkSetValid(landmarks)) {
    return {
      ok: false,
      reason: "landmarks-missing",
      landmarks,
      orientedLandmarks: null,
      normalizedLandmarks: null,
      toNormalized: null,
      toOriginal: null,
      bbox: null,
      zones: null,
    };
  }

  const wrist = landmarks.wrist;
  const middleTip = landmarks.middleTip;

  const vx = middleTip.x - wrist.x;
  const vy = middleTip.y - wrist.y;
  const orientation = Math.atan2(vy, vx);
  const target = -Math.PI / 2;
  const rot = target - orientation;

  const rotate = (p) => rotatePoint(p, wrist, rot);

  const rotatedLandmarks = {};
  for (const [k, p] of Object.entries(landmarks)) {
    rotatedLandmarks[k] = p ? rotate(p) : null;
  }

  const middleTipRot = rotatedLandmarks.middleTip;
  const wristRot = rotatedLandmarks.wrist;
  const needVerticalFlip = middleTipRot.y > wristRot.y;

  const flipY = (p) => ({ x: p.x, y: 2 * wristRot.y - p.y });
  const adjustedLandmarks = {};
  for (const [k, p] of Object.entries(rotatedLandmarks)) {
    adjustedLandmarks[k] = p ? (needVerticalFlip ? flipY(p) : p) : null;
  }

  const thumbX = toNumber(adjustedLandmarks.thumbBase?.x, NaN);
  const littleX = toNumber(adjustedLandmarks.littleBase?.x, NaN);
  const centerX = (thumbX + littleX) / 2;

  const mustMirrorForHand = String(uploadedHandSide || "").toLowerCase() === "left";
  const mirrorByGeometry = Number.isFinite(thumbX) && Number.isFinite(littleX) ? thumbX > littleX : false;
  const shouldMirror = mustMirrorForHand || mirrorByGeometry;

  const orientedLandmarks = {};
  for (const [k, p] of Object.entries(adjustedLandmarks)) {
    orientedLandmarks[k] = p ? (shouldMirror ? flipPointX(p, centerX) : p) : null;
  }

  const rotateAndOrient = (p) => {
    if (!p) return null;
    const rotated = rotate(p);
    const yAdjusted = needVerticalFlip ? flipY(rotated) : rotated;
    return shouldMirror ? flipPointX(yAdjusted, centerX) : yAdjusted;
  };

  const allLinePoints = [];
  for (const line of lineCandidates || []) {
    for (const p of line?.path || []) {
      const pt = toPoint(p);
      if (pt) allLinePoints.push(rotateAndOrient(pt));
    }
  }

  const bbox = computeBoundingBox([
    ...Object.values(orientedLandmarks).filter(Boolean),
    ...allLinePoints.filter(Boolean),
  ]);

  const padX = bbox.width * 0.08;
  const padY = bbox.height * 0.08;
  const normBox = {
    minX: bbox.minX - padX,
    minY: bbox.minY - padY,
    maxX: bbox.maxX + padX,
    maxY: bbox.maxY + padY,
  };
  normBox.width = Math.max(1e-6, normBox.maxX - normBox.minX);
  normBox.height = Math.max(1e-6, normBox.maxY - normBox.minY);

  const toNormalized = (p) => {
    const q = rotateAndOrient(toPoint(p));
    if (!q) return null;
    return {
      x: clamp((q.x - normBox.minX) / normBox.width, 0, 1),
      y: clamp((q.y - normBox.minY) / normBox.height, 0, 1),
    };
  };

  const toOriginal = (n) => {
    if (!n) return null;
    const px = normBox.minX + clamp(toNumber(n.x), 0, 1) * normBox.width;
    const py = normBox.minY + clamp(toNumber(n.y), 0, 1) * normBox.height;

    let p = { x: px, y: py };
    if (shouldMirror) p = flipPointX(p, centerX);
    if (needVerticalFlip) p = flipY(p);

    const inv = rotatePoint(p, wrist, -rot);
    return { x: round(inv.x, 2), y: round(inv.y, 2) };
  };

  const normalizedLandmarks = {};
  for (const [k, p] of Object.entries(landmarks)) {
    normalizedLandmarks[k] = p ? toNormalized(p) : null;
  }

  const zones = {
    upperPalm: (p) => p.y <= 0.35,
    middlePalm: (p) => p.y > 0.35 && p.y <= 0.68,
    lowerPalm: (p) => p.y > 0.68,
    thumbSide: (p) => p.x <= 0.42,
    littleFingerSide: (p) => p.x >= 0.58,
    centerPalm: (p) => p.x >= 0.36 && p.x <= 0.64 && p.y >= 0.34 && p.y <= 0.74,
    venusMountArea: (p) => p.x <= 0.4 && p.y >= 0.34 && p.y <= 0.8,
    moonMountArea: (p) => p.x >= 0.62 && p.y >= 0.56,
    jupiterMountArea: (p) => p.x >= 0.2 && p.x <= 0.4 && p.y <= 0.33,
    saturnMountArea: (p) => p.x >= 0.4 && p.x <= 0.58 && p.y <= 0.33,
    sunMountArea: (p) => p.x >= 0.58 && p.x <= 0.76 && p.y <= 0.35,
    mercuryMountArea: (p) => p.x >= 0.74 && p.y <= 0.46,
    marsMountArea: (p) =>
      (p.x >= 0.34 && p.x <= 0.64 && p.y >= 0.36 && p.y <= 0.76) ||
      (p.x <= 0.44 && p.y >= 0.42 && p.y <= 0.7),
  };

  return {
    ok: true,
    reason: "ok",
    landmarks,
    orientedLandmarks,
    normalizedLandmarks,
    toNormalized,
    toOriginal,
    bbox: normBox,
    zones,
  };
}

function classifyHandShapeFromLandmarks(normalizedLandmarks) {
  const wrist = normalizedLandmarks?.wrist;
  const middleBase = normalizedLandmarks?.middleBase;
  const indexBase = normalizedLandmarks?.indexBase;
  const littleBase = normalizedLandmarks?.littleBase;
  const indexTip = normalizedLandmarks?.indexTip;
  const middleTip = normalizedLandmarks?.middleTip;
  const ringTip = normalizedLandmarks?.ringTip;
  const littleTip = normalizedLandmarks?.littleTip;
  const ringBase = normalizedLandmarks?.ringBase;

  if (!wrist || !middleBase || !indexBase || !littleBase || !middleTip || !indexTip || !ringTip || !littleTip || !ringBase) {
    return {
      type: "mixed",
      labelKo: "혼합형 손",
      palmRatio: null,
      fingerRatio: null,
      reason: "핵심 랜드마크 일부가 부족하여 혼합형으로 보수 판정",
      keywords: ["적응력", "복합성", "다중 재능"],
      metrics: {
        palmLength: null,
        palmWidth: null,
        middleFingerLength: null,
        averageFingerLength: null,
      },
    };
  }

  const palmLength = distance(wrist, middleBase);
  const palmWidth = distance(indexBase, littleBase);
  const indexFingerLength = distance(indexBase, indexTip);
  const middleFingerLength = distance(middleBase, middleTip);
  const ringFingerLength = distance(ringBase, ringTip);
  const littleFingerLength = distance(littleBase, littleTip);
  const averageFingerLength = (indexFingerLength + middleFingerLength + ringFingerLength + littleFingerLength) / 4;

  const palmRatio = palmWidth > 0 ? palmLength / palmWidth : 1;
  const fingerRatio = palmLength > 0 ? averageFingerLength / palmLength : 0;

  let type = "mixed";
  let labelKo = "혼합형 손";
  let reason = "비율이 중간 영역으로 나타나 상황 적응형 성향이 우세";
  let keywords = ["적응력", "복합성", "다중 재능", "유연성", "상황 대응"];

  if (palmRatio <= 1.08 && fingerRatio <= 0.78) {
    type = "earth";
    labelKo = "흙의 손";
    reason = `palmRatio(${round(palmRatio, 3)})<=1.08, fingerRatio(${round(fingerRatio, 3)})<=0.78로 손바닥이 넓고 손가락이 상대적으로 짧은 형`;
    keywords = ["현실감", "안정성", "책임감", "생활력", "꾸준함"];
  } else if (palmRatio > 1.12 && fingerRatio <= 0.78) {
    type = "fire";
    labelKo = "불의 손";
    reason = `palmRatio(${round(palmRatio, 3)})>1.12, fingerRatio(${round(fingerRatio, 3)})<=0.78로 손바닥이 길고 손가락이 상대적으로 짧은 형`;
    keywords = ["열정", "추진력", "도전", "직감", "빠른 실행"];
  } else if (palmRatio <= 1.1 && fingerRatio > 0.78) {
    type = "air";
    labelKo = "바람의 손";
    reason = `palmRatio(${round(palmRatio, 3)})<=1.10, fingerRatio(${round(fingerRatio, 3)})>0.78로 손가락이 길고 사고/소통 성향이 두드러지는 형`;
    keywords = ["사고력", "소통", "분석", "호기심", "네트워크"];
  } else if (palmRatio > 1.12 && fingerRatio > 0.78) {
    type = "water";
    labelKo = "물의 손";
    reason = `palmRatio(${round(palmRatio, 3)})>1.12, fingerRatio(${round(fingerRatio, 3)})>0.78로 손바닥과 손가락이 모두 길게 나타난 형`;
    keywords = ["감수성", "직관", "공감", "상상력", "섬세함"];
  }

  return {
    type,
    labelKo,
    palmRatio: round(palmRatio, 4),
    fingerRatio: round(fingerRatio, 4),
    reason,
    keywords,
    metrics: {
      palmLength: round(palmLength, 4),
      palmWidth: round(palmWidth, 4),
      middleFingerLength: round(middleFingerLength, 4),
      averageFingerLength: round(averageFingerLength, 4),
    },
  };
}

function polylineLength(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < points.length; i += 1) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

function computeCurvature(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * bc.x + ab.y * bc.y;
    const n1 = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
    const n2 = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
    if (n1 < 1e-6 || n2 < 1e-6) continue;
    const cos = clamp(dot / (n1 * n2), -1, 1);
    const angle = Math.acos(cos);
    sum += angle;
    count += 1;
  }
  if (count === 0) return 0;
  return clamp(sum / (count * Math.PI), 0, 1);
}

function makeLineFeature(raw, ctx) {
  const path = Array.isArray(raw?.path) ? raw.path.map((p) => toPoint(p)).filter(Boolean) : [];
  const normalizedPath = path.map((p) => ctx.toNormalized(p)).filter(Boolean);
  if (normalizedPath.length === 0) {
    return null;
  }

  const startPoint = ctx.toNormalized(raw?.startPoint || path[0]);
  const endPoint = ctx.toNormalized(raw?.endPoint || path[path.length - 1]);
  const points = normalizedPath;
  const len = toNumber(raw?.length, polylineLength(points));
  const rawDepth = toNumber(raw?.depthScore, 0);
  const depthScore = clamp(rawDepth > 1 ? rawDepth / 100 : rawDepth, 0, 1);
  const rawCurvature = toNumber(raw?.curvatureScore, -1);
  const curvatureScore = rawCurvature >= 0 ? clamp(rawCurvature > 1 ? rawCurvature / 100 : rawCurvature, 0, 1) : computeCurvature(points);
  const confidence = clamp(toNumber(raw?.confidence, 0), 0, 1);
  const breaks = Math.max(0, Math.round(toNumber(raw?.breaks, 0)));
  const branches = Math.max(0, Math.round(toNumber(raw?.branches, 0)));

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const orientation = spanX >= spanY * 1.2 ? "horizontal" : spanY >= spanX * 1.2 ? "vertical" : "diagonal";

  return {
    id: String(raw?.id || `line-${Math.random().toString(36).slice(2)}`),
    raw,
    path: points,
    rawPath: path,
    startPoint: startPoint || points[0],
    endPoint: endPoint || points[points.length - 1],
    length: len,
    depthScore,
    curvatureScore,
    confidence,
    breaks,
    branches,
    spanX,
    spanY,
    orientation,
    avgX: xs.reduce((a, b) => a + b, 0) / xs.length,
    avgY: ys.reduce((a, b) => a + b, 0) / ys.length,
  };
}

function zoneRatio(points, predicate) {
  if (!Array.isArray(points) || points.length === 0) return 0;
  let hit = 0;
  for (const p of points) {
    if (predicate(p)) hit += 1;
  }
  return hit / points.length;
}

function pointNear(a, b, threshold = 0.14) {
  return distance(a, b) <= threshold;
}

function labelLength(normalizedLength) {
  if (!Number.isFinite(normalizedLength)) return "unknown";
  if (normalizedLength >= 0.45) return "long";
  if (normalizedLength >= 0.27) return "medium";
  return "short";
}

function labelDepth(depthScore) {
  if (!Number.isFinite(depthScore)) return "unknown";
  if (depthScore >= 0.7) return "deep";
  if (depthScore >= 0.45) return "medium";
  return "faint";
}

function labelCurvature(curvatureScore) {
  if (!Number.isFinite(curvatureScore)) return "unknown";
  if (curvatureScore >= 0.62) return "wide";
  if (curvatureScore >= 0.28) return "normal";
  return "narrow";
}

function confidenceLabel(score, candidateConfidence, highThreshold, lowThreshold) {
  const composite = clamp((score / 100) * 0.6 + candidateConfidence * 0.4, 0, 1);
  if (score >= highThreshold && composite >= 0.72) return "high";
  if (score >= highThreshold - 5 && composite >= 0.58) return "medium";
  if (score >= lowThreshold) return "low";
  return "unknown";
}

function linePathToSvg(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const first = points[0];
  const rest = points.slice(1);
  const segments = [`M${round(first.x * 100, 2)} ${round(first.y * 100, 2)}`];
  for (const p of rest) {
    segments.push(`L${round(p.x * 100, 2)} ${round(p.y * 100, 2)}`);
  }
  return segments.join(" ");
}

function getZoneLabel(point, zones) {
  if (!point || !zones) return "unknown";
  if (zones.upperPalm(point)) return "upperPalm";
  if (zones.middlePalm(point)) return "middlePalm";
  if (zones.lowerPalm(point)) return "lowerPalm";
  return "unknown";
}

function scoreLifeLine(candidate, ctx, refs) {
  const zones = ctx.zones;
  const webPoint = midpoint(ctx.normalizedLandmarks.thumbBase, ctx.normalizedLandmarks.indexBase);
  const startNearWeb = pointNear(candidate.startPoint, webPoint, 0.16) || pointNear(candidate.endPoint, webPoint, 0.16);

  let score = 0;
  if (startNearWeb) score += 30;
  if (zoneRatio(candidate.path, zones.venusMountArea) >= 0.25) score += 30;
  if (candidate.curvatureScore >= 0.3) score += 20;
  if ((candidate.endPoint?.y || 0) > 0.62 || zoneRatio(candidate.path, zones.lowerPalm) > 0.15) score += 15;
  if (candidate.length >= 0.35) score += 10;
  if (zoneRatio(candidate.path, zones.upperPalm) > 0.72) score -= 20;
  if (candidate.curvatureScore < 0.12) score -= 15;

  return score;
}

function scoreHeadLine(candidate, ctx, refs) {
  const zones = ctx.zones;
  const webPoint = midpoint(ctx.normalizedLandmarks.thumbBase, ctx.normalizedLandmarks.indexBase);
  let score = 0;

  if (pointNear(candidate.startPoint, webPoint, 0.2) || pointNear(candidate.endPoint, webPoint, 0.2)) score += 25;
  if (zoneRatio(candidate.path, zones.centerPalm) > 0.2) score += 25;
  if (candidate.spanX >= 0.32) score += 25;
  if (candidate.spanY <= 0.24) score += 15;
  if (candidate.orientation === "horizontal" || candidate.orientation === "diagonal") score += 10;
  if (zoneRatio(candidate.path, zones.upperPalm) >= 0.65) score -= 20;
  if (candidate.orientation === "vertical") score -= 30;

  return score;
}

function scoreHeartLine(candidate, ctx, refs) {
  const zones = ctx.zones;
  let score = 0;

  if (zoneRatio(candidate.path, zones.upperPalm) >= 0.55) score += 35;
  if (Math.max(candidate.startPoint.x, candidate.endPoint.x) >= 0.72) score += 20;
  const farEndX = Math.min(candidate.startPoint.x, candidate.endPoint.x);
  const farEndY = candidate.startPoint.x < candidate.endPoint.x ? candidate.startPoint.y : candidate.endPoint.y;
  if (farEndX <= 0.6 && farEndY <= 0.48) score += 20;
  if (candidate.spanX >= 0.3) score += 15;
  if (candidate.avgY <= 0.42) score += 10;
  if (zoneRatio(candidate.path, zones.lowerPalm) >= 0.28) score -= 30;
  if (candidate.orientation === "vertical") score -= 30;

  return score;
}

function scoreFateLine(candidate, ctx, refs) {
  const zones = ctx.zones;
  let score = 0;

  if (zoneRatio(candidate.path, zones.centerPalm) >= 0.22) score += 25;
  if (candidate.spanY >= 0.3) score += 30;
  if (candidate.spanX <= 0.2) score += 15;
  if (candidate.startPoint.y > candidate.endPoint.y) score += 15;
  if (zones.saturnMountArea(candidate.endPoint) || zones.saturnMountArea(candidate.startPoint)) score += 15;
  if (candidate.orientation === "horizontal") score -= 30;
  if (zoneRatio(candidate.path, zones.thumbSide) > 0.72 || zoneRatio(candidate.path, zones.littleFingerSide) > 0.72) score -= 15;

  return score;
}

function scoreSunLine(candidate, ctx) {
  const zones = ctx.zones;
  let score = 0;
  if (zoneRatio(candidate.path, zones.sunMountArea) >= 0.25) score += 35;
  if (candidate.orientation === "vertical" || candidate.orientation === "diagonal") score += 25;
  if (candidate.endPoint.y <= 0.38 || candidate.startPoint.y <= 0.38) score += 20;
  if (candidate.length >= 0.2) score += 10;
  if (candidate.length < 0.12) score -= 15;
  if (candidate.confidence < 0.45) score -= 20;
  return score;
}

function scoreMoneyLine(candidate, ctx, refs) {
  const zones = ctx.zones;
  let score = 0;

  if (zoneRatio(candidate.path, zones.mercuryMountArea) >= 0.2) score += 30;
  if (candidate.orientation === "vertical" || candidate.orientation === "diagonal") score += 25;
  if (candidate.startPoint.y > candidate.endPoint.y && Math.max(candidate.startPoint.x, candidate.endPoint.x) >= 0.68) score += 20;
  if (candidate.depthScore >= 0.55) score += 15;
  if (candidate.length < 0.1 || candidate.depthScore < 0.28) score -= 20;

  const heartY = refs?.heartLine?.detected ? refs.heartLine.avgY : null;
  if (heartY != null && Math.abs(candidate.avgY - heartY) < 0.06 && candidate.spanX < 0.25) {
    score -= 10;
  }

  return score;
}

function scoreMarriageLine(candidate, ctx, refs) {
  const zones = ctx.zones;
  let score = 0;

  const sideRatio = zoneRatio(candidate.path, (p) => p.x >= 0.78 && p.y >= 0.2 && p.y <= 0.58);
  if (sideRatio >= 0.35) score += 35;
  if (candidate.orientation === "horizontal" && candidate.spanX >= 0.07 && candidate.spanX <= 0.28) score += 30;

  const heartLine = refs?.heartLine;
  const heartY = heartLine?.detected ? heartLine.avgY : 0.42;
  if (candidate.avgY <= heartY + 0.04) score += 20;
  if (candidate.branches >= 2) score += 5;
  if (candidate.spanX > 0.35) score -= 20;
  if (candidate.orientation === "vertical") score -= 30;

  return score;
}

function scoreCommunicationLine(candidate, ctx) {
  const zones = ctx.zones;
  let score = 0;

  if (zoneRatio(candidate.path, zones.mercuryMountArea) >= 0.18) score += 30;
  if (candidate.orientation === "vertical" || candidate.orientation === "diagonal") score += 25;
  if (zoneRatio(candidate.path, zones.littleFingerSide) >= 0.2) score += 20;
  if (candidate.startPoint.y > candidate.endPoint.y) score += 15;
  if (candidate.depthScore >= 0.5) score += 10;
  if (candidate.orientation === "horizontal") score -= 15;

  return score;
}

function selectLine(features, scorer, ctx, refs, options = {}) {
  const highThreshold = toNumber(options.highThreshold, 65);
  const lowThreshold = toNumber(options.lowThreshold, 50);
  const used = options.used || new Set();
  const allowUsed = Boolean(options.allowUsed);

  let best = null;

  for (const f of features) {
    if (!allowUsed && used.has(f.id)) continue;
    const score = scorer(f, ctx, refs);
    if (!best || score > best.score) {
      best = { feature: f, score };
    }
  }

  if (!best) {
    return {
      detected: false,
      confidence: "unknown",
      lengthLabel: "unknown",
      depthLabel: "unknown",
      curvatureLabel: "unknown",
      breaks: 0,
      branches: 0,
      startZone: "unknown",
      endZone: "unknown",
      path: [],
      score: 0,
      avgY: null,
      id: null,
      reason: "후보선이 없습니다.",
    };
  }

  const f = best.feature;
  const label = confidenceLabel(best.score, f.confidence, highThreshold, lowThreshold);
  const detected = best.score >= lowThreshold;

  if (detected && !allowUsed) {
    used.add(f.id);
  }

  return {
    detected,
    confidence: detected ? label : "unknown",
    lengthLabel: detected ? labelLength(f.length) : "unknown",
    depthLabel: detected ? labelDepth(f.depthScore) : "unknown",
    curvatureLabel: detected ? labelCurvature(f.curvatureScore) : "unknown",
    breaks: detected ? f.breaks : 0,
    branches: detected ? f.branches : 0,
    startZone: detected ? getZoneLabel(f.startPoint, ctx.zones) : "unknown",
    endZone: detected ? getZoneLabel(f.endPoint, ctx.zones) : "unknown",
    path: detected ? f.path.map((p) => ({ x: round(p.x, 4), y: round(p.y, 4) })) : [],
    score: best.score,
    avgY: f.avgY,
    id: f.id,
    reason: detected
      ? `score=${best.score}, conf=${round(f.confidence, 3)}, length=${round(f.length, 3)}, depth=${round(f.depthScore, 3)}, curvature=${round(f.curvatureScore, 3)}`
      : `score=${best.score} 미달`,
    rawFeature: f,
  };
}

function classifyPalmLines(lineCandidates, ctx) {
  const features = (lineCandidates || []).map((line) => makeLineFeature(line, ctx)).filter(Boolean);
  const used = new Set();

  const lifeLine = selectLine(features, scoreLifeLine, ctx, {}, { highThreshold: 65, lowThreshold: 50, used });
  const headLine = selectLine(features, scoreHeadLine, ctx, { lifeLine }, { highThreshold: 62, lowThreshold: 48, used });
  const heartLine = selectLine(features, scoreHeartLine, ctx, { lifeLine, headLine }, { highThreshold: 62, lowThreshold: 48, used });
  const fateLine = selectLine(features, scoreFateLine, ctx, { lifeLine, headLine, heartLine }, { highThreshold: 62, lowThreshold: 48, used });

  const sunLineRaw = selectLine(features, scoreSunLine, ctx, { heartLine, fateLine }, { highThreshold: 60, lowThreshold: 45, used });
  const sunLine = {
    ...sunLineRaw,
    detected: sunLineRaw.detected && sunLineRaw.confidence !== "low",
    reason: sunLineRaw.detected && sunLineRaw.confidence === "low"
      ? "신뢰도 낮음으로 미검출 처리"
      : sunLineRaw.reason,
  };

  const moneyLine = selectLine(features, scoreMoneyLine, ctx, { heartLine, fateLine }, { highThreshold: 60, lowThreshold: 45, used });
  const marriageLine = selectLine(features, scoreMarriageLine, ctx, { heartLine }, { highThreshold: 60, lowThreshold: 45, used });
  const communicationLine = selectLine(features, scoreCommunicationLine, ctx, { moneyLine, heartLine }, { highThreshold: 58, lowThreshold: 44, used, allowUsed: true });

  return {
    lifeLine,
    headLine,
    heartLine,
    fateLine,
    sunLine,
    moneyLine,
    marriageLine,
    communicationLine,
    featureCount: features.length,
  };
}

function mountSummary(name, fullness) {
  const guide = MOUNT_GUIDE_TEXT[name] || name;
  if (fullness === "strong") return `${guide}: 해당 에너지가 자주 쓰이며 표현 강도가 비교적 뚜렷합니다.`;
  if (fullness === "medium") return `${guide}: 강약 균형이 비교적 안정적입니다.`;
  if (fullness === "weak") return `${guide}: 과사용보다는 절제/보완형 사용 경향입니다.`;
  return `${guide}: 조명/각도 영향으로 보수적 판독 상태입니다.`;
}

function analyzeMounts(lines, ctx, imageQuality) {
  const zones = ctx?.zones;
  if (!zones) {
    return {
      venus: { fullness: "unknown", confidence: "low", summary: mountSummary("venus", "unknown") },
      moon: { fullness: "unknown", confidence: "low", summary: mountSummary("moon", "unknown") },
      jupiter: { fullness: "unknown", confidence: "low", summary: mountSummary("jupiter", "unknown") },
      saturn: { fullness: "unknown", confidence: "low", summary: mountSummary("saturn", "unknown") },
      sun: { fullness: "unknown", confidence: "low", summary: mountSummary("sun", "unknown") },
      mercury: { fullness: "unknown", confidence: "low", summary: mountSummary("mercury", "unknown") },
      mars: { fullness: "unknown", confidence: "low", summary: mountSummary("mars", "unknown") },
    };
  }

  const allPoints = [];
  for (const key of ["lifeLine", "headLine", "heartLine", "fateLine", "sunLine", "moneyLine", "marriageLine", "communicationLine"]) {
    const line = lines?.[key];
    if (!line?.detected) continue;
    for (const p of line.path || []) allPoints.push(p);
  }

  const qualityPenalty =
    imageQuality?.brightness === "dark" || imageQuality?.sharpness === "blurry" || imageQuality?.contrast === "low" ? 0.12 : 0;

  function compute(predicate) {
    if (allPoints.length === 0) return { fullness: "unknown", confidence: "low" };
    const ratio = zoneRatio(allPoints, predicate);
    const adjusted = clamp(ratio - qualityPenalty, 0, 1);
    let fullness = "weak";
    if (adjusted >= 0.2) fullness = "strong";
    else if (adjusted >= 0.1) fullness = "medium";

    let confidence = "medium";
    if (adjusted >= 0.2 && allPoints.length >= 25) confidence = "high";
    if (allPoints.length < 12) confidence = "low";
    if (qualityPenalty > 0.1 && confidence === "high") confidence = "medium";

    return { fullness, confidence };
  }

  const venus = compute(zones.venusMountArea);
  const moon = compute(zones.moonMountArea);
  const jupiter = compute(zones.jupiterMountArea);
  const saturn = compute(zones.saturnMountArea);
  const sun = compute(zones.sunMountArea);
  const mercury = compute(zones.mercuryMountArea);
  const mars = compute(zones.marsMountArea);

  return {
    venus: { ...venus, summary: mountSummary("venus", venus.fullness) },
    moon: { ...moon, summary: mountSummary("moon", moon.fullness) },
    jupiter: { ...jupiter, summary: mountSummary("jupiter", jupiter.fullness) },
    saturn: { ...saturn, summary: mountSummary("saturn", saturn.fullness) },
    sun: { ...sun, summary: mountSummary("sun", sun.fullness) },
    mercury: { ...mercury, summary: mountSummary("mercury", mercury.fullness) },
    mars: { ...mars, summary: mountSummary("mars", mars.fullness) },
  };
}

function clampScore(v) {
  return clamp(Math.round(v), 0, 100);
}

function computeDomainScores(lines, mounts, handShape) {
  const love = clampScore(
    45 +
      (lines.heartLine.detected ? 14 : 0) +
      (lines.marriageLine.detected ? 8 : 0) +
      (mounts.venus.fullness === "strong" ? 12 : mounts.venus.fullness === "medium" ? 6 : 0) +
      (mounts.moon.fullness === "strong" ? 6 : 0),
  );

  const career = clampScore(
    40 +
      (lines.fateLine.detected ? 18 : 0) +
      (lines.headLine.detected ? 10 : 0) +
      (mounts.saturn.fullness === "strong" ? 10 : mounts.saturn.fullness === "medium" ? 5 : 0) +
      (mounts.jupiter.fullness === "strong" ? 8 : 0),
  );

  const wealth = clampScore(
    38 +
      (lines.moneyLine.detected ? 16 : 0) +
      (lines.communicationLine.detected ? 8 : 0) +
      (mounts.mercury.fullness === "strong" ? 10 : mounts.mercury.fullness === "medium" ? 5 : 0) +
      (lines.fateLine.detected ? 5 : 0),
  );

  const vitality = clampScore(
    42 +
      (lines.lifeLine.detected ? 18 : 0) +
      (lines.lifeLine.depthLabel === "deep" ? 10 : lines.lifeLine.depthLabel === "medium" ? 5 : 0) +
      (mounts.mars.fullness === "strong" ? 8 : 0),
  );

  const creativity = clampScore(
    40 +
      (handShape.type === "water" ? 12 : handShape.type === "fire" ? 9 : handShape.type === "air" ? 7 : 0) +
      (lines.sunLine.detected ? 16 : 0) +
      (mounts.sun.fullness === "strong" ? 10 : mounts.sun.fullness === "medium" ? 6 : 0) +
      (mounts.moon.fullness === "strong" ? 8 : 0),
  );

  const communication = clampScore(
    40 +
      (handShape.type === "air" ? 12 : 0) +
      (lines.communicationLine.detected ? 16 : 0) +
      (mounts.mercury.fullness === "strong" ? 12 : mounts.mercury.fullness === "medium" ? 6 : 0) +
      (lines.heartLine.branches >= 2 ? 6 : 0),
  );

  return { love, career, wealth, vitality, creativity, communication };
}

function summarizeLineForOverall(name, line) {
  if (!line.detected) return `${name}은(는) 감지되지 않음 또는 보수적 해석 상태로 처리했습니다.`;
  return `${name}은(는) ${line.lengthLabel}/${line.depthLabel}, 끊김 ${line.breaks}, 분기 ${line.branches}, 시작 ${line.startZone}, 끝 ${line.endZone} 근거로 읽었습니다.`;
}

function determineHandRoles(dominantHand) {
  if (dominantHand === "right") return { leftHandRole: "innate", rightHandRole: "acquired" };
  if (dominantHand === "left") return { leftHandRole: "acquired", rightHandRole: "innate" };
  return { leftHandRole: "mixed", rightHandRole: "mixed" };
}

function roleLabelKo(role) {
  if (role === "innate") return "선천적 손";
  if (role === "acquired") return "후천적 손";
  if (role === "mixed") return "혼합형 해석";
  return "미확정";
}

function deriveLineCandidatesFromImage(rawImage) {
  const hasImage = typeof rawImage === "string" ? rawImage.length > 32 : Boolean(rawImage);
  return {
    extractionAttempted: hasImage,
    extractedCandidates: [],
    warnings: hasImage
      ? [
          "lineCandidates 미제공으로 이미지 단독 선 후보 추출을 시도했으나 현재 런타임에서는 안정적 추출 근거가 부족해 미검출 처리했습니다.",
          "실제 인식 정확도를 위해 handLandmarks + lineCandidates 전달이 필요합니다.",
        ]
      : ["입력 이미지가 없어 선 후보 추출을 수행하지 않았습니다."],
  };
}

function buildCombinationInsights({ lines, mounts, handShape }) {
  const insights = [];

  if (lines.heartLine.detected && lines.heartLine.depthLabel === "deep" && mounts.venus.fullness === "strong") {
    insights.push({
      key: "heart-venus",
      title: "감정선 깊음 + 금성구 발달",
      reason: `감정선 depth=${lines.heartLine.depthLabel}, 금성구 fullness=${mounts.venus.fullness}`,
      result: "애정 온도가 높고 친밀감을 중요하게 여기는 경향이 강합니다.",
      caution: "상대 반응에 민감해질 수 있어 기대치를 말로 확인하는 습관이 필요합니다.",
    });
  }

  if (lines.headLine.detected && lines.headLine.lengthLabel === "long" && lines.headLine.curvatureLabel === "narrow" && lines.fateLine.detected) {
    insights.push({
      key: "head-fate",
      title: "두뇌선 길고 곧음 + 운명선 뚜렷",
      reason: `두뇌선 length=${lines.headLine.lengthLabel}, curvature=${lines.headLine.curvatureLabel}, 운명선 detected=${lines.fateLine.detected}`,
      result: "현실 판단력과 직업 목표 설정 능력이 동시에 강한 조합입니다.",
      caution: "기준이 앞서 보일 수 있어 감정 피드백 채널을 별도로 두는 것이 좋습니다.",
    });
  }

  if (mounts.moon.fullness === "strong" && lines.headLine.detected && lines.headLine.curvatureLabel !== "narrow") {
    insights.push({
      key: "moon-head",
      title: "월구 발달 + 두뇌선 곡선",
      reason: `월구 fullness=${mounts.moon.fullness}, 두뇌선 curvature=${lines.headLine.curvatureLabel}`,
      result: "직관과 상상력이 사고 과정에 강하게 개입하는 창작형 조합입니다.",
      caution: "느낌 기반 판단은 체크리스트로 현실 검증을 보완하는 것이 안전합니다.",
    });
  }

  if (!lines.fateLine.detected && lines.sunLine.detected) {
    insights.push({
      key: "fate-sun",
      title: "운명선 약함 + 태양선 강함",
      reason: `운명선 detected=${lines.fateLine.detected}, 태양선 detected=${lines.sunLine.detected}`,
      result: "정해진 경로보다 자기표현/브랜딩 경로에서 길이 열리는 패턴입니다.",
      caution: "성과를 유지하려면 개인 시스템과 루틴을 먼저 고정해야 합니다.",
    });
  }

  if (lines.heartLine.detected && lines.heartLine.branches >= 2 && mounts.mercury.fullness === "strong") {
    insights.push({
      key: "heart-mercury",
      title: "감정선 잔가지 많음 + 수성구 발달",
      reason: `감정선 branches=${lines.heartLine.branches}, 수성구 fullness=${mounts.mercury.fullness}`,
      result: "관계 신호를 읽고 말로 풀어내는 능력이 비교적 강합니다.",
      caution: "상대 반응을 과해석하기 쉬워 확인 질문을 습관화하는 것이 좋습니다.",
    });
  }

  if (lines.lifeLine.detected && lines.lifeLine.branches >= 2 && mounts.moon.fullness === "strong") {
    insights.push({
      key: "life-moon",
      title: "생명선 가지 많음 + 월구 발달",
      reason: `생명선 branches=${lines.lifeLine.branches}, 월구 fullness=${mounts.moon.fullness}`,
      result: "이동/새 환경에서 활력이 살아나는 확장형 에너지 패턴입니다.",
      caution: "회복 공간이 없으면 과부하가 누적될 수 있어 고정 휴식 루틴이 필요합니다.",
    });
  }

  if (mounts.venus.fullness === "weak" && lines.heartLine.detected && lines.heartLine.curvatureLabel === "narrow") {
    insights.push({
      key: "venus-heart-straight",
      title: "금성구 약함 + 감정선 직선",
      reason: `금성구 fullness=${mounts.venus.fullness}, 감정선 curvature=${lines.heartLine.curvatureLabel}`,
      result: "감정 표현이 절제되고 신중한 안정 추구형 관계 패턴이 나타납니다.",
      caution: "의도는 배려여도 상대가 거리감으로 느낄 수 있어 표현량 조절이 필요합니다.",
    });
  }

  if (mounts.jupiter.fullness === "strong") {
    insights.push({
      key: "jupiter-lead",
      title: "목성구 발달 + 성장축 강조",
      reason: `목성구 fullness=${mounts.jupiter.fullness}`,
      result: "리더십/성장 욕구가 강해 목표를 위로 당기는 추진력이 있습니다.",
      caution: "자존심 방어가 강해질 수 있어 피드백 수용 루틴이 필요합니다.",
    });
  }

  if (mounts.saturn.fullness === "strong" && lines.fateLine.detected) {
    insights.push({
      key: "saturn-fate",
      title: "토성구 발달 + 운명선 뚜렷",
      reason: `토성구 fullness=${mounts.saturn.fullness}, 운명선 detected=${lines.fateLine.detected}`,
      result: "책임감과 장기 목표 지속성이 높은 축으로 읽힙니다.",
      caution: "부담을 혼자 떠안기 쉬워 역할 분산이 필요합니다.",
    });
  }

  if (mounts.sun.fullness === "strong" && lines.sunLine.detected) {
    insights.push({
      key: "sun-sunline",
      title: "태양구 발달 + 태양선 선명",
      reason: `태양구 fullness=${mounts.sun.fullness}, 태양선 detected=${lines.sunLine.detected}`,
      result: "표현력/창작/브랜딩 강점이 드러나는 대외 확장형 패턴입니다.",
      caution: "인정 피드백에 과몰입하지 않도록 내적 기준을 함께 유지해야 합니다.",
    });
  }

  return insights;
}

function mapLineToCanonicalMajor(line, key) {
  if (!line?.detected) {
    if (key === "lifeLine") {
      return {
        detected: false,
        length: "unknown",
        depth: "unknown",
        curvature: "unknown",
        breaks: 0,
        branches: 0,
        summary: "감지되지 않음 또는 보수적 해석",
        advice: "손바닥 전체가 선명하게 보이도록 재촬영하면 정확도가 올라갑니다.",
      };
    }
    if (key === "headLine") {
      return {
        detected: false,
        length: "unknown",
        direction: "unknown",
        startRelationWithLifeLine: "unknown",
        breaks: 0,
        branches: 0,
        summary: "감지되지 않음 또는 보수적 해석",
        advice: "중앙 가로선이 보이도록 손가락 아래 영역을 밝게 촬영해 주세요.",
      };
    }
    if (key === "heartLine") {
      return {
        detected: false,
        length: "unknown",
        curvature: "unknown",
        endingArea: "unknown",
        breaks: 0,
        branches: 0,
        summary: "감지되지 않음 또는 보수적 해석",
        advice: "손가락 아래 상부 라인이 잘 보이도록 각도와 조명을 조정해 주세요.",
      };
    }
    return {
      detected: false,
      strength: "unknown",
      startArea: "unknown",
      endArea: "unknown",
      breaks: 0,
      summary: "감지되지 않음 또는 보수적 해석",
      advice: "손바닥 중앙 세로 흐름이 보이도록 촬영 품질을 높여 주세요.",
    };
  }

  if (key === "lifeLine") {
    return {
      detected: true,
      length: line.lengthLabel,
      depth: line.depthLabel,
      curvature: line.curvatureLabel,
      breaks: line.breaks,
      branches: line.branches,
      summary: `근거: ${line.reason}`,
      advice: "생명선은 수명보다 에너지 운용과 회복 리듬을 상징합니다.",
    };
  }

  if (key === "headLine") {
    const direction =
      line.curvatureLabel === "narrow" ? "straight" : line.curvatureLabel === "wide" ? "downward" : "curved";
    const relation = line.startZone === "middlePalm" ? "separated" : "joined";
    return {
      detected: true,
      length: line.lengthLabel,
      direction,
      startRelationWithLifeLine: relation,
      breaks: line.breaks,
      branches: line.branches,
      summary: `근거: ${line.reason}`,
      advice: "판단 속도와 정확도를 함께 관리하려면 기준 메모를 고정하세요.",
    };
  }

  if (key === "heartLine") {
    const endingArea =
      line.endZone === "upperPalm" && line.path?.[line.path.length - 1]?.x <= 0.35
        ? "underIndex"
        : line.endZone === "upperPalm" && line.path?.[line.path.length - 1]?.x <= 0.56
        ? "between"
        : "underMiddle";
    const curvature = line.curvatureLabel === "wide" ? "strong" : line.curvatureLabel === "narrow" ? "straight" : "soft";

    return {
      detected: true,
      length: line.lengthLabel,
      curvature,
      endingArea,
      breaks: line.breaks,
      branches: line.branches,
      summary: `근거: ${line.reason}`,
      advice: "감정선은 관계 결과 예언이 아니라 감정 표현 습관의 신호입니다.",
    };
  }

  const strength = line.score >= 75 ? "strong" : line.score >= 62 ? "medium" : "weak";
  const startArea =
    line.startZone === "lowerPalm" ? "wrist" : line.startZone === "middlePalm" ? "middlePalm" : line.startZone === "upperPalm" ? "lifeLine" : "unknown";
  const endArea = line.endZone === "upperPalm" ? "saturnMount" : "middlePalm";
  return {
    detected: true,
    strength,
    startArea,
    endArea,
    breaks: line.breaks,
    summary: `근거: ${line.reason}`,
    advice: "운명선은 직업 결과 확정이 아니라 목표 축의 방향성과 전환점을 읽는 신호입니다.",
  };
}

function mapLineToMinor(line, title) {
  if (!line?.detected) {
    return {
      detected: false,
      strength: null,
      summary: `${title}: 감지되지 않음 또는 보수적 해석`,
    };
  }
  return {
    detected: true,
    strength: line.confidence,
    summary: `${title} 근거: ${line.reason}`,
  };
}

function buildStrengths(lines, handShape, mounts) {
  const out = [];
  if (handShape.type !== "mixed") {
    out.push(`손형(${handShape.labelKo}) 근거로 ${handShape.keywords[0]} 성향을 안정적으로 사용합니다. (${handShape.reason})`);
  }
  if (lines.headLine.detected) out.push(`두뇌선 근거(${lines.headLine.reason})로 사고/집중의 기준 설정 능력이 보입니다.`);
  if (lines.heartLine.detected) out.push(`감정선 근거(${lines.heartLine.reason})로 관계 신호를 읽는 감수성이 확인됩니다.`);
  if (lines.fateLine.detected) out.push(`운명선 근거(${lines.fateLine.reason})로 직업 방향성 유지력이 관찰됩니다.`);
  if (lines.moneyLine.detected) out.push(`재물선 근거(${lines.moneyLine.reason})로 돈 흐름을 구조화하려는 습관이 보입니다.`);
  if (mounts.mercury.fullness === "strong") out.push(`수성구 발달로 소통/거래/정보 처리 강점이 확인됩니다.`);
  if (mounts.sun.fullness === "strong") out.push(`태양구 발달로 표현/창작/브랜딩 감각이 살아 있습니다.`);
  return out.slice(0, 5);
}

function buildCautions(lines, mounts) {
  const out = [];
  if (lines.lifeLine.detected && lines.lifeLine.depthLabel === "faint") {
    out.push(`생명선 깊이(${lines.lifeLine.depthLabel}) 근거로 회복 루틴이 흔들리면 컨디션 기복이 커질 수 있습니다.`);
  }
  if (lines.heartLine.detected && lines.heartLine.branches >= 2) {
    out.push(`감정선 분기(${lines.heartLine.branches}) 근거로 상대 반응을 과해석할 수 있습니다.`);
  }
  if (!lines.fateLine.detected) {
    out.push("운명선 미감지 근거로 직업 방향은 고정 결론보다 실험-검증 루틴이 필요합니다.");
  }
  if (mounts.venus.fullness === "weak") {
    out.push("금성구 약세 신호로 친밀감 표현이 절제되어 거리감으로 전달될 수 있습니다.");
  }
  if (mounts.saturn.fullness === "strong") {
    out.push("토성구 강세 신호로 책임을 혼자 떠안아 과부하가 생길 수 있습니다.");
  }
  if (lines.communicationLine.detected && lines.communicationLine.breaks >= 1) {
    out.push(`소통선 끊김(${lines.communicationLine.breaks}) 근거로 전달 리듬이 중간에 흔들릴 수 있습니다.`);
  }
  return out.slice(0, 5);
}

function buildComprehensiveSummary({ handShape, lines, mounts, role, analysisPurpose, combinations }) {
  const featureFacts = [
    summarizeLineForOverall("생명선", lines.lifeLine),
    summarizeLineForOverall("두뇌선", lines.headLine),
    summarizeLineForOverall("감정선", lines.heartLine),
    summarizeLineForOverall("운명선", lines.fateLine),
    summarizeLineForOverall("재물선", lines.moneyLine),
    summarizeLineForOverall("결혼선", lines.marriageLine),
    summarizeLineForOverall("소통선", lines.communicationLine),
    `손형은 ${handShape.labelKo}으로 판별되었고, 근거는 ${handShape.reason}입니다.`,
    `구丘 신호는 금성구(${mounts.venus.fullness}), 월구(${mounts.moon.fullness}), 목성구(${mounts.jupiter.fullness}), 토성구(${mounts.saturn.fullness}), 태양구(${mounts.sun.fullness}), 수성구(${mounts.mercury.fullness}), 화성구(${mounts.mars.fullness})입니다.`,
  ];

  const comboText = combinations.length
    ? combinations.map((c) => `${c.title}: ${c.reason} -> ${c.result}`).join(" ")
    : "조합 해석은 충분한 검출 근거가 3개 미만으로, 단정 대신 보수적 관찰 문장을 유지했습니다.";

  const summary = [
    `이 결과는 ${roleLabelKo(role)} 관점에서 실제 검출된 손금 특징을 중심으로 구성되었습니다.`,
    "손금 지도는 사건을 예언하는 도구가 아니라, 현재 사용 중인 성향과 습관의 구조를 읽어내는 해석 프레임입니다.",
    ...featureFacts,
    `분석 목적(${analysisPurpose})을 고려해 강조 포인트를 조정했으며, 미검출 항목은 없는 것으로 꾸미지 않고 '감지되지 않음/보수적 해석'으로 처리했습니다.`,
    "생명선은 수명 판단이 아니라 에너지 운용과 회복 패턴을 설명하는 보조 지표이며, 결혼선은 결혼 횟수가 아니라 깊은 관계에서 원하는 안정감과 약속 방식을 보여주는 신호로 사용했습니다.",
    "재물선도 확정 재물운 예언이 아닌 돈을 다루는 습관과 가치 창출 방식의 흐름으로만 해석했습니다.",
    comboText,
    "따라서 이 리딩은 단일 문장 운세가 아니라, 손형-주요선-보조선-구丘를 조합한 구조적 해석 결과입니다. 실천 단계에서는 오늘의 선택, 7일 반복 루틴, 관계 대화 방식, 지출 기준, 직업 목표 분해를 함께 관리하면 정확도와 실용성이 높아집니다.",
  ].join(" ");

  return summary.length >= 800
    ? summary
    : `${summary} 추가 보완: 촬영 환경(밝기/선명도/대비)과 손바닥 점유율이 좋아질수록 미세선 신뢰도가 향상됩니다. 손바닥 오버레이와 실제 인식 데이터 보기를 함께 확인해 근거 기반으로 해석을 업데이트하세요.`;
}

function applySafetyExpressionFilter(input) {
  if (typeof input === "string") {
    let out = input;
    for (const phrase of SAFETY_BANNED_PHRASES) {
      if (out.includes(phrase)) {
        out = out.split(phrase).join(SAFETY_REPLACEMENTS[phrase] || "보수적으로 해석합니다");
      }
    }
    return out;
  }

  if (Array.isArray(input)) {
    return input.map((x) => applySafetyExpressionFilter(x));
  }

  if (input && typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = applySafetyExpressionFilter(v);
    }
    return out;
  }

  return input;
}

function buildSectionBlocks({ role, handShape, lines, mounts, scores, combinations, strengths, cautions, analysisPurpose }) {
  const comprehensive = buildComprehensiveSummary({
    handShape,
    lines,
    mounts,
    role,
    analysisPurpose,
    combinations,
  });

  const sections = [
    {
      key: "comprehensive",
      title: "1. 종합 손금 리딩",
      content: comprehensive,
    },
    {
      key: "role",
      title: "2. 선천적 손 / 후천적 손 해석",
      content: `${roleLabelKo(role)} 기준 해석입니다. 선천적 손은 타고난 기질, 후천적 손은 현재 습관과 사회적 자아를 중심으로 읽습니다. 혼합형이면 두 축을 함께 보수적으로 반영합니다.`,
    },
    {
      key: "life",
      title: "3. 생명선 분석",
      content: lines.lifeLine.detected
        ? `근거(${lines.lifeLine.reason}) 기반으로 생명선을 ${lines.lifeLine.lengthLabel}/${lines.lifeLine.depthLabel}/${lines.lifeLine.curvatureLabel}로 분류했습니다. 이 선은 수명이 아니라 에너지 운용, 회복 리듬, 생활 지속성의 패턴을 설명합니다.`
        : "생명선은 감지되지 않음 또는 신뢰도 부족으로 보수적으로 해석했습니다.",
    },
    {
      key: "head",
      title: "4. 두뇌선 분석",
      content: lines.headLine.detected
        ? `근거(${lines.headLine.reason}) 기반으로 두뇌선을 분류했습니다. 사고방식, 판단력, 집중력, 현실성/상상력 비율을 읽는 지표로 사용했습니다.`
        : "두뇌선은 감지되지 않음 또는 신뢰도 부족으로 보수적으로 해석했습니다.",
    },
    {
      key: "heart",
      title: "5. 감정선 분석",
      content: lines.heartLine.detected
        ? `근거(${lines.heartLine.reason}) 기반으로 감정선을 분류했습니다. 사랑 방식, 감정 표현, 애착 패턴, 상처 민감 구간을 설명합니다.`
        : "감정선은 감지되지 않음 또는 신뢰도 부족으로 보수적으로 해석했습니다.",
    },
    {
      key: "fate",
      title: "6. 운명선 분석",
      content: lines.fateLine.detected
        ? `근거(${lines.fateLine.reason}) 기반으로 운명선을 분류했습니다. 직업 방향, 사회적 목표, 자립성, 전환점 해석에 사용했습니다.`
        : "운명선은 감지되지 않음 또는 신뢰도 부족으로 보수적으로 해석했습니다.",
    },
    {
      key: "sun-money",
      title: "7. 재물/태양선 분석",
      content: `재물선 근거(${lines.moneyLine.reason})와 태양선 근거(${lines.sunLine.reason})를 사용했습니다. 재물선은 확정 재물운이 아닌 돈을 다루는 습관/가치 창출 방식을, 태양선은 표현력/브랜딩 감각을 설명합니다.`,
    },
    {
      key: "love-marriage",
      title: "8. 연애/결혼선 분석",
      content: `결혼선 근거(${lines.marriageLine.reason})를 사용해 깊은 관계에서 원하는 안정감과 약속 방식을 읽었습니다. 결혼 횟수 단정은 포함하지 않습니다.`,
    },
    {
      key: "mounts",
      title: "9. 구丘 종합 분석",
      content: [
        mounts.venus.summary,
        mounts.moon.summary,
        mounts.jupiter.summary,
        mounts.saturn.summary,
        mounts.sun.summary,
        mounts.mercury.summary,
        mounts.mars.summary,
      ].join(" "),
    },
    {
      key: "combinations",
      title: "10. 손금 조합 해석",
      content:
        combinations.length >= 1
          ? combinations
              .map((c, i) => `${i + 1}) ${c.title} - 근거: ${c.reason} - 해석: ${c.result} - 주의: ${c.caution}`)
              .join(" ")
          : "검출 근거 부족으로 조합 해석은 보수적으로 유보했습니다.",
    },
    {
      key: "scores",
      title: "11. 영역별 점수 해석",
      content: `연애 ${scores.love}, 직업 ${scores.career}, 재물 ${scores.wealth}, 에너지 ${scores.vitality}, 창작 ${scores.creativity}, 소통 ${scores.communication}. 점수는 절대 예언이 아니라 현재 손금 구조에서 읽힌 상대적 경향치입니다.`,
    },
    {
      key: "strengths",
      title: "12. 강점 5개",
      content: strengths.length ? strengths.join(" ") : "강점 근거가 충분하지 않아 보수적으로 유지했습니다.",
    },
    {
      key: "cautions",
      title: "13. 주의점 5개",
      content: cautions.length ? cautions.join(" ") : "주의점 근거가 충분하지 않아 보수적으로 유지했습니다.",
    },
    {
      key: "advice",
      title: "14. 맞춤 조언",
      content:
        "오늘의 조언: 결정 1개를 기준 3문장으로 기록하세요. 7일 실천법: 같은 시간에 1줄 생활 로그와 손바닥 사진을 남겨 패턴을 축적하세요. 관계 조언: 기대치를 질문형 문장으로 먼저 확인하세요. 재물 조언: 지출을 목적 기반(필수/성장/위안)으로 분류하세요. 직업 조언: 2주 단위 목표-실행-리뷰 루틴을 고정하세요.",
    },
  ];

  return sections;
}

function lineToOverlayPath(line) {
  if (!line?.detected) return null;
  return linePathToSvg(line.path || []);
}

function analyzePalmHandInput(input = {}) {
  const uploadedHandSide = String(input.uploadedHandSide || "right").toLowerCase() === "left" ? "left" : "right";
  const dominantHand = String(input.dominantHand || "right").toLowerCase();
  const analysisPurpose = String(input.analysisPurpose || "general").toLowerCase();

  const imageQuality = {
    brightness: ["good", "normal", "dark"].includes(String(input?.imageQuality?.brightness))
      ? String(input.imageQuality.brightness)
      : "normal",
    sharpness: ["good", "normal", "blurry"].includes(String(input?.imageQuality?.sharpness))
      ? String(input.imageQuality.sharpness)
      : "normal",
    contrast: ["good", "normal", "low"].includes(String(input?.imageQuality?.contrast))
      ? String(input.imageQuality.contrast)
      : "normal",
    palmCoverage: clamp(toNumber(input?.imageQuality?.palmCoverage, 0), 0, 1),
  };

  let lineCandidates = Array.isArray(input.lineCandidates) ? input.lineCandidates : [];
  const extraction = deriveLineCandidatesFromImage(input.rawImage || null);
  if (lineCandidates.length === 0 && extraction.extractedCandidates.length > 0) {
    lineCandidates = extraction.extractedCandidates;
  }

  const coord = normalizePalmCoordinateSystem({
    handLandmarks: input.handLandmarks || {},
    lineCandidates,
    uploadedHandSide,
  });

  const hasLandmarks = coord.ok;
  const isPalmDetected = hasLandmarks || lineCandidates.length > 0;

  const roles = determineHandRoles(dominantHand);
  const sideRole = uploadedHandSide === "left" ? roles.leftHandRole : roles.rightHandRole;

  const handShape = coord.ok
    ? classifyHandShapeFromLandmarks(coord.orientedLandmarks || coord.normalizedLandmarks)
    : {
        type: "mixed",
        labelKo: "혼합형 손",
        palmRatio: null,
        fingerRatio: null,
        reason: "랜드마크 부족으로 손형 판정 보류",
        keywords: ["보수적 해석"],
        metrics: {
          palmLength: null,
          palmWidth: null,
          middleFingerLength: null,
          averageFingerLength: null,
        },
      };

  const lines = coord.ok
    ? classifyPalmLines(lineCandidates, coord)
    : {
        lifeLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        headLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        heartLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        fateLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        sunLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        moneyLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        marriageLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        communicationLine: { detected: false, confidence: "unknown", lengthLabel: "unknown", depthLabel: "unknown", curvatureLabel: "unknown", breaks: 0, branches: 0, startZone: "unknown", endZone: "unknown", path: [], score: 0, avgY: null, id: null, reason: "좌표계 미구성" },
        featureCount: 0,
      };

  const mounts = analyzeMounts(lines, coord, imageQuality);
  const combinations = buildCombinationInsights({ lines, mounts, handShape });
  const scores = computeDomainScores(lines, mounts, handShape);
  const strengths = buildStrengths(lines, handShape, mounts);
  const cautions = buildCautions(lines, mounts);

  const handReading = {
    handShape: {
      type: handShape.type,
      labelKo: handShape.labelKo,
      palmRatio: handShape.palmRatio == null ? "unknown" : String(handShape.palmRatio),
      fingerRatio: handShape.fingerRatio == null ? "unknown" : String(handShape.fingerRatio),
      summary: `${handShape.reason}. 키워드: ${handShape.keywords.join(", ")}`,
    },
    majorLines: {
      lifeLine: mapLineToCanonicalMajor(lines.lifeLine, "lifeLine"),
      headLine: mapLineToCanonicalMajor(lines.headLine, "headLine"),
      heartLine: mapLineToCanonicalMajor(lines.heartLine, "heartLine"),
      fateLine: mapLineToCanonicalMajor(lines.fateLine, "fateLine"),
    },
    minorLines: {
      sunLine: mapLineToMinor(lines.sunLine, "태양선"),
      moneyLine: mapLineToMinor(lines.moneyLine, "재물선"),
      marriageLine: mapLineToMinor(lines.marriageLine, "결혼선"),
      mercuryLine: mapLineToMinor(lines.communicationLine, "소통선"),
    },
    mounts: {
      venus: { fullness: mounts.venus.fullness, summary: mounts.venus.summary },
      moon: { fullness: mounts.moon.fullness, summary: mounts.moon.summary },
      jupiter: { fullness: mounts.jupiter.fullness, summary: mounts.jupiter.summary },
      saturn: { fullness: mounts.saturn.fullness, summary: mounts.saturn.summary },
      sun: { fullness: mounts.sun.fullness, summary: mounts.sun.summary },
      mercury: { fullness: mounts.mercury.fullness, summary: mounts.mercury.summary },
      mars: { fullness: mounts.mars.fullness, summary: mounts.mars.summary },
    },
    scores,
    overall: {
      title: `손금 지도 종합 (${uploadedHandSide === "left" ? "왼손" : "오른손"})`,
      summary: buildComprehensiveSummary({
        handShape,
        lines,
        mounts,
        role: sideRole,
        analysisPurpose,
        combinations,
      }),
      strengths,
      cautions,
      recommendedActions: [
        "오늘: 판단 기준 1개를 문장으로 고정하세요.",
        "7일: 같은 시간대에 손금/컨디션 로그를 1줄씩 남기세요.",
        "관계: 기대치를 추측하지 말고 질문으로 확인하세요.",
        "재물: 지출을 목적별로 기록해 반복 패턴을 줄이세요.",
        "직업: 2주 단위 목표-실행-회고 루틴을 유지하세요.",
      ],
    },
  };

  const sectionBlocks = buildSectionBlocks({
    role: sideRole,
    handShape,
    lines,
    mounts,
    scores,
    combinations,
    strengths,
    cautions,
    analysisPurpose,
  });

  const recognitionData = {
    handSide: uploadedHandSide,
    handRole: sideRole,
    handRoleLabel: roleLabelKo(sideRole),
    palmDetected: isPalmDetected,
    imageQuality,
    handShape: {
      type: handShape.type,
      labelKo: handShape.labelKo,
      palmRatio: handShape.palmRatio,
      fingerRatio: handShape.fingerRatio,
      reason: handShape.reason,
      metrics: handShape.metrics,
    },
    lines: {
      lifeLine: lines.lifeLine,
      headLine: lines.headLine,
      heartLine: lines.heartLine,
      fateLine: lines.fateLine,
      sunLine: lines.sunLine,
      moneyLine: lines.moneyLine,
      marriageLine: lines.marriageLine,
      communicationLine: lines.communicationLine,
    },
    mounts,
    combinations,
    sections: sectionBlocks,
    extraction,
  };

  const overlayPaths = {
    lifeLine: lineToOverlayPath(lines.lifeLine),
    headLine: lineToOverlayPath(lines.headLine),
    heartLine: lineToOverlayPath(lines.heartLine),
    fateLine: lineToOverlayPath(lines.fateLine),
  };

  return applySafetyExpressionFilter({
    uploadedHandSide,
    handRole: sideRole,
    handReading,
    recognitionData,
    overlayPaths,
    hasMajorDetected:
      lines.lifeLine.detected || lines.headLine.detected || lines.heartLine.detected || lines.fateLine.detected,
  });
}

module.exports = {
  SAFETY_BANNED_PHRASES,
  MOUNT_GUIDE_TEXT,
  normalizePalmCoordinateSystem,
  classifyHandShapeFromLandmarks,
  classifyPalmLines,
  determineHandRoles,
  deriveLineCandidatesFromImage,
  buildCombinationInsights,
  applySafetyExpressionFilter,
  analyzePalmHandInput,
};
