"use client";

import { useEffect, useRef, useState } from "react";
import { hardNavigateToShellHome } from "@/lib/navigation/shellHome";
import {
  createDefaultCanonicalPalmReading,
  type PalmAnalysisPurpose,
  type PalmDominantHand,
  type PalmHandRole,
  type PalmSpecialPattern,
} from "@/types/palm-reading";
import { computePalmRegion, detectPalmLandmarks, toEngineLandmarkMap } from "./palm-hand-landmarks";
import PalmLineOverlay, {
  type OverlayLineKey,
  type OverlayPathMap,
} from "@/app/palm-reading/PalmLineOverlay";
import palmUiState from "@/lib/palm/palm-ui-state";
import { buildPalmInterpretationReport } from "@/lib/palm/interpretation-engine";
import { holdPaidFeatureGateOpen, openPaidFeatureGate, releasePaidFeatureGate, runBillingCoinGate, updatePaidFeatureGate } from "@/app/_lib/billing-client";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";

const PALM_DESTINY_TEXT_TRANSLATIONS = {
  ko: {
    "palmDestiny.label.001": "선천적 손",
    "palmDestiny.description.001": "타고난 기질과 잠재력을 보여주는 손",
    "palmDestiny.label.002": "후천적 손",
    "palmDestiny.description.002": "현재의 성향과 살아온 흐름을 보여주는 손",
    "palmDestiny.label.003": "선후천 혼합 손",
    "palmDestiny.description.003": "선천성과 후천성이 함께 반영된 손",
    "palmDestiny.label.004": "미확정",
    "palmDestiny.description.004": "주로 쓰는 손 선택 후 판별됩니다.",
    "palmDestiny.label.005": "오른손",
    "palmDestiny.label.006": "왼손",
    "palmDestiny.label.007": "양손",
    "palmDestiny.label.008": "사진 흐름",
    "palmDestiny.label.009": "길이",
    "palmDestiny.label.010": "깊이",
    "palmDestiny.label.011": "곡선",
    "palmDestiny.label.012": "변화",
    "palmDestiny.label.013": "상태",
    "palmDestiny.label.014": "길이",
    "palmDestiny.label.015": "방향",
    "palmDestiny.label.016": "시작",
    "palmDestiny.label.017": "변화",
    "palmDestiny.label.018": "상태",
    "palmDestiny.label.019": "길이",
    "palmDestiny.label.020": "곡선",
    "palmDestiny.label.021": "끝맺음",
    "palmDestiny.label.022": "변화",
    "palmDestiny.label.023": "상태",
    "palmDestiny.label.024": "전환",
    "palmDestiny.label.025": "상태",
    "palmDestiny.label.026": "표현력",
    "palmDestiny.label.027": "리딩",
    "palmDestiny.label.028": "재물 흐름",
    "palmDestiny.label.029": "리딩",
    "palmDestiny.label.030": "관계 흐름",
    "palmDestiny.label.031": "리딩",
    "palmDestiny.label.032": "손 형태",
    "palmDestiny.label.033": "중심 포인트",
    "palmDestiny.label.034": "전체 결",
    "palmDestiny.title.001": "🌟 전체 운세",
    "palmDestiny.title.002": "💗 연애운",
    "palmDestiny.title.003": "💰 재물운",
    "palmDestiny.title.004": "🧭 직업운",
    "palmDestiny.title.005": "✨ 성격/매력",
    "palmDestiny.title.006": "🤝 관계운",
    "palmDestiny.message.001": "알 수 없는 오류",
    "palmDestiny.message.002": "이용권 확인 중",
    "palmDestiny.message.003": "손바닥 전체가 화면에 들어오지 않았습니다.",
    "palmDestiny.message.004": "요청이 취소되었습니다.",
    "palmDestiny.message.005": "네트워크/API 오류로 분석 요청에 실패했습니다.",
    "palmDestiny.error.001": "분석 결과 데이터가 준비되지 않았습니다.",
    "palmDestiny.message.006": "이용권 확인 중",
    "palmDestiny.error.002": "전문가 상담 생성 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요.",
    "palmDestiny.error.003": "전문가 상담 API 연결이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
    "palmDestiny.aria-label.001": "손바닥 바로 촬영하기",
    "palmDestiny.aria-label.002": "앨범에서 사진 선택하기",
    "palmDestiny.alt.001": "선택된 손바닥 미리보기",
  },
} as const;

function palmDestinyText(key: keyof typeof PALM_DESTINY_TEXT_TRANSLATIONS.ko) {
  return PALM_DESTINY_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

type HandSide = "left" | "right";
type DominantHand = PalmDominantHand;
type HandRole = PalmHandRole;
type AnalysisPurpose = PalmAnalysisPurpose;
type UploadSource = "camera" | "gallery";
type PalmFlowStep = "pick" | "preview" | "analyzing" | "result";
type PalmCardKey =
  | "lifeLine"
  | "headLine"
  | "heartLine"
  | "fateLine"
  | "sunLine"
  | "moneyLine"
  | "marriageLine"
  | "mounts";

type HandImageState = {
  file: File | null;
  previewUrl: string | null;
  /** 등록 시각(ms). 사용자가 어떤 사진을 언제 올렸는지 카드에서 확인할 수 있게 한다. */
  registeredAt: number | null;
};

type HandRoleResult = {
  leftHandRole: HandRole;
  rightHandRole: HandRole;
};

type QualityConfidence = "높음" | "보통" | "낮음";

type PalmImageQualityFeedback = {
  confidence: QualityConfidence;
  score: number;
  summary: string;
  warnings: string[];
  checks: {
    resolution: boolean;
    brightness: boolean;
    sharpness: boolean;
    palmLikely: boolean;
    fullPalmLikely: boolean;
    glareLow: boolean;
  };
  metrics: {
    width: number;
    height: number;
    brightnessMean: number;
    edgeStrength: number;
    glareRatio: number;
  };
};

type PalmVisionPoint = {
  x: number;
  y: number;
};

type PalmClientLineCandidate = {
  id: string;
  path: PalmVisionPoint[];
  startPoint: PalmVisionPoint;
  endPoint: PalmVisionPoint;
  depthScore: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  branches: number;
  breaks: number;
  confidence: number;
  evidenceScore?: number;
  edgeConsistency?: number;
  continuity?: number;
  guideDistance?: number;
  sourceKind?: "clientGuide";
};

type PalmClientVisionPayload = {
  handLandmarks: Record<string, PalmVisionPoint>;
  lineCandidates: PalmClientLineCandidate[];
};

/**
 * 업로드 시점 손 검출 결과.
 * - "detected": MediaPipe 가 손을 찾음 → 실좌표로 앵커링
 * - "no-hand": MediaPipe 가 돌았지만 손 없음 → 업로드 단계에서 거부(과금 이전)
 * - "unavailable": 검출기를 못 씀(CDN 차단 등) → 막지 않고 기존 근사 경로로 degrade
 */
type PalmLandmarkState = {
  status: "detected" | "no-hand" | "unavailable";
  landmarks: Record<string, PalmVisionPoint> | null;
  region: { minX: number; minY: number; width: number; height: number } | null;
  handedness: string;
};

type PalmSampleBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  confidence: number;
};

type PalmInterpretationCard = {
  key: PalmCardKey;
  title: string;
  oneLiner: string;
  details: string[];
  strengths: string[];
  cautions: string[];
  todayAdvice: string;
  sevenDayPractice: string;
  emphasisScore?: number;
};

type PalmInterpretationPayload = {
  generatedAt: string;
  analysisPurpose: AnalysisPurpose;
  tone: string;
  oneLiner?: string;
  focusSummary: string;
  sections?: Array<{
    key: string;
    title: string;
    summary: string;
    detail: string;
    advice: string;
  }>;
  report?: {
    oneLiner?: string;
    summary?: string;
    love?: string;
    wealth?: string;
    career?: string;
    personality?: string;
    healthEnergy?: string;
    relationship?: string;
    advice?: string;
    tips?: string[];
  };
  cards: PalmInterpretationCard[];
};

type CategoryConsultation = {
  key: AnalysisPurpose;
  title: string;
  summary: string;
  details: string[];
  actions: string[];
};

type AnalysisResultState = {
  mode: "full" | "partial" | "fallback";
  qualityScore: number;
  missingData: string[];
  warnings: string[];
  report: Record<string, unknown> | null;
  canonical: ReturnType<typeof createDefaultCanonicalPalmReading>;
  interpretation: PalmInterpretationPayload | null;
  /** 서버가 생성한 심층 해석문. 구 palm-reading-ai-consult(별도 과금)를 기본 분석에 통합한 것. */
  consultText: string;
  overlayPaths: OverlayPathMap;
  overlayPathsBySide: {
    left: OverlayPathMap | null;
    right: OverlayPathMap | null;
  };
  raw: unknown;
};

const {
  getPalmHandRoles,
  canStartPalmAnalysis,
  mapPalmAnalyzeError,
  shouldShowPalmResult,
  revokeObjectUrls,
} = palmUiState as {
  getPalmHandRoles: (dominantHand: DominantHand | "") => HandRoleResult;
  canStartPalmAnalysis: (input: {
    leftFile: File | null;
    rightFile: File | null;
    dominantHand: DominantHand | "";
    analysisPurpose: AnalysisPurpose | "";
    isSubmitting: boolean;
  }) => boolean;
  mapPalmAnalyzeError: (input: { status: number; code: string; message: string; reasonCode?: string; reason?: string }) => string;
  shouldShowPalmResult: (canonicalPalmReading: unknown) => boolean;
  revokeObjectUrls: (urls: Array<string | null | undefined>, revokeFn?: (url: string) => void) => number;
};

const HAND_ROLE_META: Record<HandRole, { label: string; description: string }> = {
  innate: {
    label: palmDestinyText("palmDestiny.label.001"),
    description: palmDestinyText("palmDestiny.description.001"),
  },
  acquired: {
    label: palmDestinyText("palmDestiny.label.002"),
    description: palmDestinyText("palmDestiny.description.002"),
  },
  mixed: {
    label: palmDestinyText("palmDestiny.label.003"),
    description: palmDestinyText("palmDestiny.description.003"),
  },
  unknown: {
    label: palmDestinyText("palmDestiny.label.004"),
    description: palmDestinyText("palmDestiny.description.004"),
  },
};

const DEFAULT_ANALYSIS_PURPOSE: AnalysisPurpose = "general";

// 손금은 판독 + 심층 해석을 한 번에 제공하는 단일 상품이므로 하위키는 general 하나다.
// 이전에는 purpose 별로 love/wealth/career/... 를 보냈는데, 그 키들은
// worker/lib/billing-feature-registry.js 에 존재한 적이 없다(가격 조회가 빈다).
// UI 가 purpose 를 general 로 고정해 두어 드러나지 않았을 뿐인 잠재 결함이라 여기서 정리한다.
const PALM_BILLING_SUB_FEATURE_KEY = "general";
const PALM_BILLING_CATEGORY_KEY = "palm-reading";
// 가격 정본은 서버 카테고리 표다(palm-reading.general → palm-reading-general = 100코인 / 10,000원).
// featureKey 가 아니라 categoryKey+subFeatureKey 로 풀리는 유일한 React 유료 경로라, 하위키가
// 어긋나면 여기서 null 이 되어 결제창이 0원으로 뜬다.
const PALM_BILLING_PRICING = resolveServerFeaturePricing({
  categoryKey: PALM_BILLING_CATEGORY_KEY,
  subFeatureKey: PALM_BILLING_SUB_FEATURE_KEY,
});

const DOMINANT_HAND_OPTIONS: Array<{ value: DominantHand; label: string }> = [
  { value: "right", label: palmDestinyText("palmDestiny.label.005") },
  { value: "left", label: palmDestinyText("palmDestiny.label.006") },
  { value: "both", label: palmDestinyText("palmDestiny.label.007") },
];

const DOMINANT_HAND_HINT_LABEL: Record<DominantHand, string> = {
  right: "오른손 중심 해석",
  left: "왼손 중심 해석",
  both: "양손 균형 해석",
};

const SHOOTING_GUIDES = [
  "손바닥을 활짝 펴고 손목까지 함께 담아 주세요.",
  "손가락을 자연스럽게 벌려 서로 겹치지 않게 해 주세요.",
  "창가나 밝은 조명 아래에서, 정면 플래시는 끄고 촬영해 주세요.",
  "손바닥이 화면 중앙을 꽉 채우도록 가까이 찍어 주세요.",
  "손등이 아니라 손금이 있는 손바닥 면을 촬영해 주세요.",
  "손을 카메라와 나란히 두어 기울어지지 않게 해 주세요.",
  "초점이 맞아 잔주름까지 보이는지 확인하고 촬영해 주세요.",
];

const LOADING_PHASES = [
  "손바닥 윤곽을 확인하고 있습니다.",
  "생명선·감정선·지능선을 찾고 있습니다.",
  "손의 형태와 전체 흐름을 분석하고 있습니다.",
  "카테고리별 상담 결과를 정리하고 있습니다.",
];

const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2048;

const FILE_EXTENSION_PATTERN = /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/i;

function getGalleryInputId(side: HandSide): string {
  return `palm-${side}-gallery-input`;
}

function getCameraInputId(side: HandSide): string {
  return `palm-${side}-camera-input`;
}

function isLikelyImageFile(file: File): boolean {
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime === "application/octet-stream") {
    return FILE_EXTENSION_PATTERN.test(String(file.name || ""));
  }
  return FILE_EXTENSION_PATTERN.test(String(file.name || ""));
}

function isHeicLikeFile(file: File): boolean {
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return mime.includes("heic") || mime.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
}

function toDominantHand(value: unknown): DominantHand | null {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "left" || raw === "right" || raw === "both") {
    return raw as DominantHand;
  }
  return null;
}

function toAnalysisPurpose(value: unknown): AnalysisPurpose | null {
  const raw = String(value || "").trim().toLowerCase();
  if (["general", "love", "wealth", "career", "personality", "relationship"].includes(raw)) {
    return raw as AnalysisPurpose;
  }
  return null;
}

function toHandRole(value: unknown): HandRole | null {
  const raw = String(value || "").trim().toLowerCase();
  if (["innate", "acquired", "mixed", "unknown"].includes(raw)) {
    return raw as HandRole;
  }
  return null;
}

async function loadImageForValidation(file: File): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("IMAGE_LOAD_TIMEOUT")), 8000);
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = objectUrl;
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("IMAGE_LOAD_FAILED"));
    };
  });

  return { image, objectUrl };
}

type ImageRenderer = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  cleanup: () => void;
};

async function createImageRenderer(file: File): Promise<ImageRenderer> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, width, height) => {
          ctx.drawImage(bitmap, 0, 0, width, height);
        },
        cleanup: () => {
          bitmap.close();
        },
      };
    } catch (e) {
      // fallback to Image element path
    }
  }

  const { image, objectUrl } = await loadImageForValidation(file);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    draw: (ctx, width, height) => {
      ctx.drawImage(image, 0, 0, width, height);
    },
    cleanup: () => {
      URL.revokeObjectURL(objectUrl);
    },
  };
}

async function resizeImageIfNeeded(file: File): Promise<File> {
  const renderer = await createImageRenderer(file);

  try {
    const width = renderer.width;
    const height = renderer.height;
    if (!width || !height) {
      throw new Error("IMAGE_SIZE_INVALID");
    }

    const longest = Math.max(width, height);
    const shouldTranscodeHeic = isHeicLikeFile(file);

    if (longest <= MAX_IMAGE_DIMENSION && !shouldTranscodeHeic) {
      return file;
    }

    const ratio = longest > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longest : 1;
    const nextWidth = Math.max(1, Math.round(width * ratio));
    const nextHeight = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
    }

    try {
      renderer.draw(ctx, nextWidth, nextHeight);

      const blob = await new Promise<Blob | null>((resolve) => {
        const timeout = window.setTimeout(() => resolve(null), 8000);
        canvas.toBlob((value) => {
          window.clearTimeout(timeout);
          resolve(value);
        }, "image/jpeg", 0.9);
      });

      if (!blob) {
        return file;
      }

      const dotIndex = file.name.lastIndexOf(".");
      const baseName = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
      return new File([blob], `${baseName}-optimized.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    renderer.cleanup();
  }
}

async function analyzeImageQuality(file: File): Promise<PalmImageQualityFeedback | null> {
  const renderer = await createImageRenderer(file);
  try {
    const width = renderer.width;
    const height = renderer.height;
    if (!width || !height) return null;

    const sampleWidth = 144;
    const sampleHeight = Math.max(1, Math.round((height / width) * sampleWidth));
    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    renderer.draw(ctx, sampleWidth, sampleHeight);

    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let luminanceSum = 0;
    let brightPixels = 0;
    let edgeAccumulator = 0;

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const idx = (y * sampleWidth + x) * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        luminanceSum += luma;
        if (luma >= 242) brightPixels += 1;

        if (x > 0) {
          const leftIdx = idx - 4;
          const leftLuma =
            0.299 * imageData[leftIdx] + 0.587 * imageData[leftIdx + 1] + 0.114 * imageData[leftIdx + 2];
          edgeAccumulator += Math.abs(luma - leftLuma);
        }
      }
    }

    const totalPixels = sampleWidth * sampleHeight;
    const averageLuminance = totalPixels > 0 ? luminanceSum / totalPixels : 0;
    const glareRatio = totalPixels > 0 ? brightPixels / totalPixels : 0;
    const edgeStrength = totalPixels > 0 ? edgeAccumulator / totalPixels : 0;
    const aspectRatio = width / Math.max(1, height);

    const checks = {
      resolution: Math.min(width, height) >= 720,
      brightness: averageLuminance >= 55 && averageLuminance <= 205,
      sharpness: edgeStrength >= 12,
      palmLikely: aspectRatio >= 0.55 && aspectRatio <= 1.75,
      fullPalmLikely: Math.min(width, height) >= 820,
      glareLow: glareRatio <= 0.16,
    };

    const score = Object.values(checks).filter(Boolean).length;
    const confidence: QualityConfidence = score >= 5 ? "높음" : score >= 3 ? "보통" : "낮음";
    const warnings = [
      !checks.resolution ? "해상도가 낮아 세부 손금 인식이 제한될 수 있습니다." : null,
      !checks.brightness ? "사진 밝기가 너무 어둡거나 밝습니다." : null,
      !checks.sharpness ? "사진이 흔들렸거나 초점이 흐릴 수 있습니다." : null,
      !checks.palmLikely ? "손바닥 구도가 기울어 손금 영역 추정이 어렵습니다." : null,
      !checks.fullPalmLikely ? "손목부터 손가락 끝까지 전체가 보이도록 촬영해 주세요." : null,
      !checks.glareLow ? "빛 반사가 강해 일부 선이 가려질 수 있습니다." : null,
    ].filter((item): item is string => Boolean(item));

    const summary =
      confidence === "높음"
        ? "분석 확신도 높음"
        : confidence === "보통"
        ? "분석 확신도 보통"
        : "분석 확신도 낮음: 사진의 빛이나 초점이 약해 일부 흐름은 참고용으로 읽습니다.";

    return {
      confidence,
      score,
      summary,
      warnings,
      checks,
      metrics: {
        width,
        height,
        brightnessMean: Number(averageLuminance.toFixed(2)),
        edgeStrength: Number(edgeStrength.toFixed(2)),
        glareRatio: Number(glareRatio.toFixed(4)),
      },
    };
  } finally {
    renderer.cleanup();
  }
}

function mirrorPalmX(value: number, side: HandSide): number {
  return side === "left" ? 1 - value : value;
}

function palmPointFromRatio(width: number, height: number, x: number, y: number, side: HandSide): PalmVisionPoint {
  return {
    x: Number((mirrorPalmX(x, side) * width).toFixed(2)),
    y: Number((y * height).toFixed(2)),
  };
}

function palmPointFromSampleBounds(
  imageWidth: number,
  imageHeight: number,
  sampleWidth: number,
  sampleHeight: number,
  bounds: PalmSampleBounds | null,
  x: number,
  y: number,
  side: HandSide,
): PalmVisionPoint {
  if (!bounds) {
    return palmPointFromRatio(imageWidth, imageHeight, x, y, side);
  }
  const localX = mirrorPalmX(x, side);
  return {
    x: Number((((bounds.minX + localX * bounds.width) / sampleWidth) * imageWidth).toFixed(2)),
    y: Number((((bounds.minY + y * bounds.height) / sampleHeight) * imageHeight).toFixed(2)),
  };
}

function buildApproxPalmLandmarks(
  width: number,
  height: number,
  side: HandSide,
  sampleWidth?: number,
  sampleHeight?: number,
  bounds?: PalmSampleBounds | null,
): Record<string, PalmVisionPoint> {
  const fromPalm = (x: number, y: number) =>
    sampleWidth && sampleHeight
      ? palmPointFromSampleBounds(width, height, sampleWidth, sampleHeight, bounds || null, x, y, side)
      : palmPointFromRatio(width, height, x, y, side);

  return {
    wrist: fromPalm(0.5, 0.92),
    thumbBase: fromPalm(0.24, 0.56),
    thumbTip: fromPalm(0.14, 0.32),
    indexBase: fromPalm(0.34, 0.22),
    indexTip: fromPalm(0.3, 0.04),
    middleBase: fromPalm(0.5, 0.2),
    middleTip: fromPalm(0.5, 0.02),
    ringBase: fromPalm(0.64, 0.22),
    ringTip: fromPalm(0.66, 0.05),
    littleBase: fromPalm(0.78, 0.28),
    littleTip: fromPalm(0.84, 0.1),
  };
}

function buildCandidateBox(path: PalmVisionPoint[]): PalmClientLineCandidate["boundingBox"] {
  const xs = path.map((point) => point.x);
  const ys = path.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: Number(minX.toFixed(2)),
    y: Number(minY.toFixed(2)),
    width: Number(Math.max(1, maxX - minX).toFixed(2)),
    height: Number(Math.max(1, maxY - minY).toFixed(2)),
  };
}

function detectPalmSampleBounds(data: Uint8ClampedArray, sampleWidth: number, sampleHeight: number): PalmSampleBounds | null {
  let minX = sampleWidth;
  let minY = sampleHeight;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = 0; y < sampleHeight; y += 2) {
    for (let x = 0; x < sampleWidth; x += 2) {
      const idx = (y * sampleWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const colorSpread = max - min;
      const warmSkinLike =
        luma >= 35 &&
        luma <= 236 &&
        r >= b * 0.85 &&
        g >= b * 0.72 &&
        r >= g * 0.72 &&
        colorSpread >= 8;
      const neutralPalmLike =
        luma >= 70 &&
        luma <= 226 &&
        r >= b * 0.82 &&
        g >= b * 0.78 &&
        colorSpread <= 72;
      const centerWeight =
        x >= sampleWidth * 0.05 &&
        x <= sampleWidth * 0.95 &&
        y >= sampleHeight * 0.02 &&
        y <= sampleHeight * 0.98;

      if (centerWeight && (warmSkinLike || neutralPalmLike)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        count += 1;
      }
    }
  }

  const samplePixels = Math.max(1, (sampleWidth / 2) * (sampleHeight / 2));
  const confidence = count / samplePixels;
  if (confidence < 0.035 || maxX <= minX || maxY <= minY) return null;

  const padX = Math.max(6, (maxX - minX) * 0.08);
  const padY = Math.max(8, (maxY - minY) * 0.08);
  const boundedMinX = Math.max(0, minX - padX);
  const boundedMinY = Math.max(0, minY - padY);
  const boundedMaxX = Math.min(sampleWidth - 1, maxX + padX);
  const boundedMaxY = Math.min(sampleHeight - 1, maxY + padY);

  return {
    minX: boundedMinX,
    minY: boundedMinY,
    maxX: boundedMaxX,
    maxY: boundedMaxY,
    width: Math.max(1, boundedMaxX - boundedMinX),
    height: Math.max(1, boundedMaxY - boundedMinY),
    confidence,
  };
}

/**
 * 업로드된 파일에서 실제 손 랜드마크를 검출한다.
 * MediaPipe 를 못 쓰는 환경에서는 "unavailable" 로 떨어져 기존 근사 경로가 그대로 돈다.
 */
async function detectHandForFile(file: File, side: HandSide): Promise<PalmLandmarkState> {
  const unavailable: PalmLandmarkState = { status: "unavailable", landmarks: null, region: null, handedness: "" };
  let renderer: Awaited<ReturnType<typeof createImageRenderer>> | null = null;
  try {
    renderer = await createImageRenderer(file);
    const canvas = document.createElement("canvas");
    canvas.width = renderer.width;
    canvas.height = renderer.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return unavailable;
    renderer.draw(ctx, renderer.width, renderer.height);

    const detection = await detectPalmLandmarks(canvas, renderer.width, renderer.height);
    canvas.width = 0;
    canvas.height = 0;

    if (detection.status === "no-hand") return { ...unavailable, status: "no-hand" };
    if (detection.status === "unavailable") return unavailable;

    return {
      status: "detected",
      landmarks: toEngineLandmarkMap(detection.result),
      region: computePalmRegion(detection.result),
      handedness: detection.result.handedness,
    };
  } catch (error) {
    console.warn("[palm] landmark detection error", { side, message: (error as Error)?.message });
    return unavailable;
  } finally {
    renderer?.cleanup();
  }
}

/**
 * 실측 손바닥 영역(원본 이미지 좌표)을 샘플 캔버스 좌표계로 변환한다.
 * 가이드 선을 실제 손 해부에 앵커링하기 위한 변환이다.
 */
function landmarkRegionToSampleBounds(
  landmarkState: PalmLandmarkState | null,
  width: number,
  height: number,
  sampleWidth: number,
  sampleHeight: number,
): PalmSampleBounds | null {
  const region = landmarkState?.status === "detected" ? landmarkState.region : null;
  if (!region || !width || !height) return null;

  const scaleX = sampleWidth / width;
  const scaleY = sampleHeight / height;
  const minX = region.minX * scaleX;
  const minY = region.minY * scaleY;
  const boundsWidth = region.width * scaleX;
  const boundsHeight = region.height * scaleY;
  if (boundsWidth <= 0 || boundsHeight <= 0) return null;

  return {
    minX,
    minY,
    maxX: minX + boundsWidth,
    maxY: minY + boundsHeight,
    width: boundsWidth,
    height: boundsHeight,
    // 실측 기반이므로 피부톤 추정보다 높은 신뢰도를 준다.
    confidence: 0.9,
  };
}

async function extractPalmVisionPayload(
  file: File,
  side: HandSide,
  landmarkState: PalmLandmarkState | null,
): Promise<PalmClientVisionPayload | null> {
  const renderer = await createImageRenderer(file);
  try {
    const width = renderer.width;
    const height = renderer.height;
    if (!width || !height) return null;

    const sampleWidth = 180;
    const sampleHeight = Math.max(1, Math.round((height / width) * sampleWidth));
    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    renderer.draw(ctx, sampleWidth, sampleHeight);
    const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    // 손바닥 영역: 실제 랜드마크가 있으면 그걸 쓴다(피부톤 추정보다 훨씬 정확하다).
    // 없으면 종전의 피부톤 bbox 로 degrade 한다.
    const palmBounds = landmarkRegionToSampleBounds(landmarkState, width, height, sampleWidth, sampleHeight)
      || detectPalmSampleBounds(data, sampleWidth, sampleHeight);
    const lumaAt = (x: number, y: number) => {
      const safeX = Math.max(0, Math.min(sampleWidth - 1, Math.round(x)));
      const safeY = Math.max(0, Math.min(sampleHeight - 1, Math.round(y)));
      const idx = (safeY * sampleWidth + safeX) * 4;
      return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    };
    const palmToSample = (xRatio: number, yRatio: number) => {
      if (!palmBounds) {
        return {
          x: mirrorPalmX(xRatio, side) * sampleWidth,
          y: yRatio * sampleHeight,
        };
      }
      return {
        x: palmBounds.minX + mirrorPalmX(xRatio, side) * palmBounds.width,
        y: palmBounds.minY + yRatio * palmBounds.height,
      };
    };
    const searchDarkPoint = (xRatio: number, yRatio: number, radius: number) => {
      const base = palmToSample(xRatio, yRatio);
      const baseX = base.x;
      const baseY = base.y;
      let best = { x: baseX, y: baseY, darkness: 0 };
      for (let y = Math.max(0, Math.round(baseY - radius)); y <= Math.min(sampleHeight - 1, Math.round(baseY + radius)); y += 1) {
        for (let x = Math.max(0, Math.round(baseX - radius)); x <= Math.min(sampleWidth - 1, Math.round(baseX + radius)); x += 1) {
          const center = lumaAt(x, y);
          const local =
            (lumaAt(x - 4, y) + lumaAt(x + 4, y) + lumaAt(x, y - 4) + lumaAt(x, y + 4)) / 4;
          const darkness = Math.max(0, local - center);
          if (darkness > best.darkness && center < 210) {
            best = { x, y, darkness };
          }
        }
      }
      const offset = Math.hypot(best.x - baseX, best.y - baseY) / Math.max(1, radius);
      return {
        point: {
          x: Number(((best.x / sampleWidth) * width).toFixed(2)),
          y: Number(((best.y / sampleHeight) * height).toFixed(2)),
        },
        darkness: best.darkness,
        offset: Number(Math.min(1, offset).toFixed(4)),
      };
    };

    const guides: Array<{
      id: string;
      kind: "major" | "minor";
      points: Array<{ x: number; y: number }>;
      branches?: number;
      radius?: number;
    }> = [
      {
        id: "client-life",
        kind: "major",
        points: [
          { x: 0.36, y: 0.24 },
          { x: 0.29, y: 0.38 },
          { x: 0.24, y: 0.54 },
          { x: 0.27, y: 0.72 },
          { x: 0.36, y: 0.88 },
        ],
        branches: 1,
        radius: 12,
      },
      {
        id: "client-head",
        kind: "major",
        points: [
          { x: 0.35, y: 0.4 },
          { x: 0.28, y: 0.43 },
          { x: 0.2, y: 0.47 },
          { x: 0.14, y: 0.51 },
        ],
        radius: 10,
      },
      {
        id: "client-heart",
        kind: "major",
        points: [
          { x: 0.82, y: 0.27 },
          { x: 0.68, y: 0.24 },
          { x: 0.54, y: 0.25 },
          { x: 0.38, y: 0.28 },
          { x: 0.22, y: 0.34 },
        ],
        branches: 1,
        radius: 11,
      },
      {
        id: "client-fate",
        kind: "major",
        points: [
          { x: 0.5, y: 0.88 },
          { x: 0.5, y: 0.72 },
          { x: 0.5, y: 0.56 },
          { x: 0.51, y: 0.4 },
          { x: 0.52, y: 0.24 },
        ],
        radius: 10,
      },
      {
        id: "client-money",
        kind: "minor",
        points: [
          { x: 0.64, y: 0.74 },
          { x: 0.72, y: 0.6 },
          { x: 0.8, y: 0.45 },
          { x: 0.86, y: 0.32 },
        ],
        branches: 1,
        radius: 9,
      },
      {
        id: "client-marriage",
        kind: "minor",
        points: [
          { x: 0.86, y: 0.36 },
          { x: 0.8, y: 0.36 },
          { x: 0.75, y: 0.37 },
        ],
        radius: 8,
      },
    ];

    const lineCandidates = guides
      .map((guide) => {
        const sampled = guide.points.map((point) => searchDarkPoint(point.x, point.y, guide.radius || 10));
        const avgDarkness = sampled.reduce((sum, item) => sum + item.darkness, 0) / Math.max(1, sampled.length);
        const edgeConsistency = sampled.filter((item) => item.darkness >= 8).length / Math.max(1, sampled.length);
        const continuity =
          sampled.length <= 1
            ? edgeConsistency
            : sampled
                .slice(1)
                .filter((item, index) => item.darkness >= 8 && sampled[index].darkness >= 8).length /
              Math.max(1, sampled.length - 1);
        const guideDistance = sampled.reduce((sum, item) => sum + item.offset, 0) / Math.max(1, sampled.length);
        const boundsBonus = palmBounds ? Math.min(0.08, palmBounds.confidence * 0.6) : -0.04;
        const evidenceScore = Math.max(
          0,
          Math.min(0.95, 0.28 + avgDarkness / 70 + edgeConsistency * 0.22 + continuity * 0.16 - guideDistance * 0.12 + boundsBonus),
        );
        const confidence = Math.max(0.2, Math.min(0.92, evidenceScore));
        const path = sampled.map((item) => item.point);
        return {
          id: guide.id,
          path,
          startPoint: path[0],
          endPoint: path[path.length - 1],
          depthScore: Math.max(0.2, Math.min(0.92, 0.26 + avgDarkness / 85 + edgeConsistency * 0.18 + boundsBonus)),
          boundingBox: buildCandidateBox(path),
          branches: guide.branches || 0,
          breaks: continuity < 0.45 ? 1 : 0,
          confidence,
          evidenceScore,
          edgeConsistency,
          continuity,
          guideDistance,
          sourceKind: "clientGuide" as const,
        };
      })
      .filter((candidate) => {
        const isMinor = candidate.id === "client-money" || candidate.id === "client-marriage";
        const requiredEvidence = isMinor ? 0.58 : 0.48;
        const requiredEdge = isMinor ? 0.55 : 0.45;
        const requiredContinuity = isMinor ? 0.45 : 0.35;
        return (
          candidate.path.length >= 3 &&
          candidate.evidenceScore >= requiredEvidence &&
          candidate.edgeConsistency >= requiredEdge &&
          candidate.continuity >= requiredContinuity
        );
      });

    canvas.width = 0;
    canvas.height = 0;

    return {
      // 실측 21점이 있으면 그것을, 없으면 종전의 근사 랜드마크를 보낸다.
      handLandmarks:
        landmarkState?.status === "detected" && landmarkState.landmarks
          ? landmarkState.landmarks
          : buildApproxPalmLandmarks(width, height, side, sampleWidth, sampleHeight, palmBounds),
      lineCandidates,
    };
  } finally {
    renderer.cleanup();
  }
}

function toApiImageQuality(quality: PalmImageQualityFeedback | null): Record<string, unknown> | null {
  if (!quality) return null;
  const brightness = quality.checks.brightness
    ? quality.metrics.brightnessMean > 160
      ? "good"
      : "normal"
    : "dark";
  const sharpness = quality.checks.sharpness
    ? quality.metrics.edgeStrength > 18
      ? "good"
      : "normal"
    : "blurry";
  const contrast = quality.checks.glareLow ? "normal" : "low";
  const palmCoverage = quality.checks.fullPalmLikely ? 0.72 : quality.checks.palmLikely ? 0.52 : 0.32;

  return {
    brightness,
    sharpness,
    contrast,
    palmCoverage,
  };
}

async function computeFileSignature(file: File): Promise<string> {
  const base = [file.name, file.size, file.lastModified, file.type].join("|");
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const chunk = await file.slice(0, 64 * 1024).arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", chunk);
      const short = Array.from(new Uint8Array(digest).slice(0, 8))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return `${base}|${short}`;
    }
  } catch (e) {
    // fall back to metadata-based signature
  }
  return base;
}

const CARD_KEY_TO_LABEL: Record<PalmCardKey, string> = {
  lifeLine: "🌱 에너지",
  headLine: "🧠 생각",
  heartLine: "💗 연애",
  fateLine: "🧭 진로",
  sunLine: "✨ 매력",
  moneyLine: "💰 재물",
  marriageLine: "🤝 관계",
  mounts: "🌟 종합",
};

const PURPOSE_LABEL_BY_KEY: Record<AnalysisPurpose, string> = {
  general: "전체 운세",
  love: "연애운",
  wealth: "재물운",
  career: "직업운",
  personality: "성격 분석",
  relationship: "관계 패턴",
};

const LINE_TO_CARD_KEY: Record<OverlayLineKey, PalmCardKey> = {
  lifeLine: "lifeLine",
  headLine: "headLine",
  heartLine: "heartLine",
  fateLine: "fateLine",
};

/**
 * 등록 시각 표기. 오늘이면 시:분만, 아니면 월/일까지.
 * 서버 렌더에는 등록된 사진이 없으므로(항상 null) 하이드레이션 불일치 걱정은 없다.
 */
function formatRegisteredAt(timestamp: number | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return sameDay ? `${time} 등록` : `${date.getMonth() + 1}/${date.getDate()} ${time} 등록`;
}

/**
 * 서버 심층 해석문 추출.
 * normalizeInterpretation 은 알려진 필드만 남기므로 consultText 는 여기서 따로 꺼낸다.
 */
function extractConsultText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const interpretation = root.interpretation;
  if (interpretation && typeof interpretation === "object") {
    const text = (interpretation as Record<string, unknown>).consultText;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  const direct = root.consultText;
  return typeof direct === "string" ? direct.trim() : "";
}

function normalizeInterpretation(payload: unknown): PalmInterpretationPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as Record<string, unknown>;
  if (!Array.isArray(rec.cards)) return null;

  const cards: PalmInterpretationCard[] = rec.cards
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const key = String(row.key || "") as PalmCardKey;
      if (!(key in CARD_KEY_TO_LABEL)) return null;
      const emphasisScore =
        typeof row.emphasisScore === "number" && Number.isFinite(row.emphasisScore)
          ? row.emphasisScore
          : undefined;
      return {
        key,
        title: String(row.title || CARD_KEY_TO_LABEL[key]),
        oneLiner: String(row.oneLiner || ""),
        details: Array.isArray(row.details) ? row.details.map((x) => String(x)) : [],
        strengths: Array.isArray(row.strengths) ? row.strengths.map((x) => String(x)) : [],
        cautions: Array.isArray(row.cautions) ? row.cautions.map((x) => String(x)) : [],
        todayAdvice: String(row.todayAdvice || ""),
        sevenDayPractice: String(row.sevenDayPractice || ""),
        ...(typeof emphasisScore === "number" ? { emphasisScore } : {}),
      };
    })
    .filter((x): x is PalmInterpretationCard => Boolean(x));

  if (cards.length === 0) return null;

  const sections = Array.isArray(rec.sections)
    ? rec.sections
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          return {
            key: String(row.key || "").trim(),
            title: String(row.title || "").trim(),
            summary: String(row.summary || "").trim(),
            detail: String(row.detail || "").trim(),
            advice: String(row.advice || "").trim(),
          };
        })
        .filter(
          (
            item,
          ): item is { key: string; title: string; summary: string; detail: string; advice: string } =>
            Boolean(item && item.key && item.title),
        )
    : [];

  const report =
    rec.report && typeof rec.report === "object"
      ? {
          oneLiner: String((rec.report as Record<string, unknown>).oneLiner || ""),
          summary: String((rec.report as Record<string, unknown>).summary || ""),
          love: String((rec.report as Record<string, unknown>).love || ""),
          wealth: String((rec.report as Record<string, unknown>).wealth || ""),
          career: String((rec.report as Record<string, unknown>).career || ""),
          personality: String((rec.report as Record<string, unknown>).personality || ""),
          healthEnergy: String((rec.report as Record<string, unknown>).healthEnergy || ""),
          relationship: String((rec.report as Record<string, unknown>).relationship || ""),
          advice: String((rec.report as Record<string, unknown>).advice || ""),
          tips: Array.isArray((rec.report as Record<string, unknown>).tips)
            ? ((rec.report as Record<string, unknown>).tips as unknown[]).map((item) => String(item))
            : [],
        }
      : undefined;

  return {
    generatedAt: String(rec.generatedAt || ""),
    analysisPurpose: (String(rec.analysisPurpose || "general") as AnalysisPurpose),
    tone: String(rec.tone || ""),
    oneLiner: String(rec.oneLiner || ""),
    focusSummary: String(rec.focusSummary || ""),
    ...(sections.length > 0 ? { sections } : {}),
    ...(report ? { report } : {}),
    cards,
  };
}

function normalizeEngineResultSections(payload: unknown): Array<{ key: string; title: string; summary: string; detail: string; advice: string }> {
  if (!Array.isArray(payload)) return [];
  const keyMap: Record<string, string> = {
    comprehensive: "overall",
    heart: "love",
    fate: "career",
    "sun-money": "wealth",
    role: "personality",
    "love-marriage": "relationship",
    advice: "advice",
  };

  return payload
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const sourceKey = String(row.key || "").trim();
      const key = keyMap[sourceKey] || sourceKey;
      const title = String(row.title || "").replace(/^\d+(?:-\d+)?\.\s*/, "").trim();
      const detail = String(row.content || row.detail || "").trim();
      if (!key || !title || !detail) return null;
      const summary = detail.split(/\s+/).slice(0, 28).join(" ").trim() || detail;
      return {
        key,
        title,
        summary,
        detail,
        advice: sourceKey === "advice" ? detail : "",
      };
    })
    .filter((item): item is { key: string; title: string; summary: string; detail: string; advice: string } => Boolean(item));
}

function mergeInterpretationSections(
  base: PalmInterpretationPayload,
  engineSections: Array<{ key: string; title: string; summary: string; detail: string; advice: string }>,
): PalmInterpretationPayload {
  if (engineSections.length === 0) return base;
  const byKey = new Map<string, { key: string; title: string; summary: string; detail: string; advice: string }>();
  for (const section of base.sections || []) {
    byKey.set(section.key, section);
  }
  for (const section of engineSections) {
    byKey.set(section.key, section);
  }
  return {
    ...base,
    focusSummary: engineSections.find((section) => section.key === "overall")?.summary || base.focusSummary,
    sections: Array.from(byKey.values()),
  };
}

function readPathValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const path = rec.path ?? rec.svgPath ?? rec.d;
    if (typeof path === "string" && path.trim()) return path.trim();
  }
  return null;
}

function pickPathByAliases(source: Record<string, unknown>, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const val = readPathValue(source[alias]);
    if (val) return val;
  }
  return undefined;
}

function extractOverlayPaths(payload: unknown): OverlayPathMap {
  if (!payload || typeof payload !== "object") return {};
  const rec = payload as Record<string, unknown>;

  const candidateSources = [
    rec.overlayPaths,
    rec.lineCoordinates,
    rec.linePaths,
    (rec.overlay as Record<string, unknown> | undefined)?.linePaths,
    (rec.overlay as Record<string, unknown> | undefined)?.paths,
    (rec.imageQuality as Record<string, unknown> | undefined)?.linePaths,
  ].filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object");

  const out: OverlayPathMap = {};

  for (const src of candidateSources) {
    out.lifeLine = out.lifeLine || pickPathByAliases(src, ["lifeLine", "lifeline", "life_line"]);
    out.headLine = out.headLine || pickPathByAliases(src, ["headLine", "headline", "head_line"]);
    out.heartLine = out.heartLine || pickPathByAliases(src, ["heartLine", "heartline", "heart_line"]);
    out.fateLine = out.fateLine || pickPathByAliases(src, ["fateLine", "fateline", "fate_line"]);
  }

  return out;
}

function extractOverlayPathsBySide(payload: unknown): { left: OverlayPathMap | null; right: OverlayPathMap | null } {
  if (!payload || typeof payload !== "object") {
    return { left: null, right: null };
  }

  const rec = payload as Record<string, unknown>;
  const map = rec.overlayPathsBySide;
  if (!map || typeof map !== "object") {
    return { left: null, right: null };
  }

  const sideMap = map as Record<string, unknown>;
  return {
    left: extractOverlayPaths(sideMap.left ?? null),
    right: extractOverlayPaths(sideMap.right ?? null),
  };
}

function uniqText(list: Array<string | null | undefined>, max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const text = String(item || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function formatLineLength(value: string | null | undefined): string {
  if (value === "long") return "길게 이어지는 흐름";
  if (value === "medium") return "균형 있게 이어지는 흐름";
  if (value === "short") return "짧게 집중되는 흐름";
  return "흐름이 약한 상태";
}

function formatLineDepth(value: string | null | undefined): string {
  if (value === "deep") return "선명한 결";
  if (value === "medium") return "균형 있는 결";
  if (value === "faint") return "잔잔한 결";
  return "옅게 보이는 결";
}

function formatLineCurvature(value: string | null | undefined): string {
  if (value === "wide" || value === "strong") return "부드럽게 감싸는 흐름";
  if (value === "normal" || value === "soft") return "자연스럽게 이어지는 흐름";
  if (value === "narrow" || value === "straight") return "곧고 절제된 흐름";
  return "완만한 흐름";
}

function formatHeadDirection(value: string | null | undefined): string {
  if (value === "straight") return "현실 판단 중심";
  if (value === "curved") return "감각과 상상력 중심";
  if (value === "downward") return "직관과 몰입 중심";
  return "균형형 사고";
}

function formatHeadLifeRelation(value: string | null | undefined): string {
  if (value === "joined") return "신중하게 시작하는 편";
  if (value === "separated") return "독립적으로 판단하는 편";
  return "상황을 보며 조절하는 편";
}

function formatHeartEnding(value: string | null | undefined): string {
  if (value === "underIndex") return "이상과 신뢰를 중시";
  if (value === "underMiddle") return "현실적 안정감을 중시";
  if (value === "between") return "마음과 현실의 균형";
  return "관계 온도를 천천히 확인";
}

function formatFateStrength(value: string | null | undefined): string {
  if (value === "strong") return "목표축이 선명한 흐름";
  if (value === "medium") return "방향을 다듬는 흐름";
  if (value === "weak" || value === "none") return "정해진 길보다 탐색이 강한 흐름";
  return "천천히 방향을 잡는 흐름";
}

function formatFateStart(value: string | null | undefined): string {
  if (value === "wrist") return "초기부터 꾸준히 쌓는 흐름";
  if (value === "lifeLine") return "생활 기반에서 길을 여는 흐름";
  if (value === "moonMount") return "사람과 환경에서 기회가 열리는 흐름";
  if (value === ["middle", "Palm"].join("")) return "경험 뒤 방향이 또렷해지는 흐름";
  return "상황에 맞춰 길을 찾는 흐름";
}

function formatLineChanges(branches?: number, breaks?: number): string {
  const branchCount = Math.max(0, Number(branches || 0));
  const breakCount = Math.max(0, Number(breaks || 0));
  if (branchCount > 0 && breakCount > 0) return `가지 ${branchCount}개 · 전환 ${breakCount}개`;
  if (branchCount > 0) return `가지 ${branchCount}개로 확장되는 결`;
  if (breakCount > 0) return `전환 ${breakCount}개가 보이는 결`;
  return "큰 흔들림 없이 이어지는 결";
}

function formatMinorStrength(value: string | null | undefined): string {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("high") || raw.includes("strong")) return "선명하게 살아 있는 흐름";
  if (raw.includes("medium") || raw.includes("normal")) return "균형 있게 보이는 흐름";
  if (raw.includes("low") || raw.includes("faint") || raw.includes("weak")) return "잔잔하게 보이는 흐름";
  return "은은하게 드러나는 흐름";
}

function summarizeMountFocus(reading: ReturnType<typeof createDefaultCanonicalPalmReading>["leftHandReading"]): string {
  if (!reading) return "손바닥 전체 흐름";
  const labelByKey: Record<string, string> = {
    venus: "애정",
    moon: "직관",
    jupiter: "성장",
    saturn: "책임",
    sun: "표현",
    mercury: "소통",
    mars: "추진",
  };
  const focused = Object.entries(reading.mounts)
    .filter(([, mount]) => mount.fullness === "strong" || mount.fullness === "medium")
    .map(([key]) => labelByKey[key] || key)
    .slice(0, 3);
  return focused.length > 0 ? focused.join(" · ") : "균형형";
}

function countReadablePalmSignals(reading: ReturnType<typeof createDefaultCanonicalPalmReading>["leftHandReading"]): number {
  if (!reading) return 0;
  const majorCount = Object.values(reading.majorLines).filter((line) => line.detected).length;
  const minorCount = Object.values(reading.minorLines).filter((line) => line.detected).length;
  return majorCount + minorCount;
}

function buildCardSignalFacts(
  key: PalmCardKey,
  reading: ReturnType<typeof createDefaultCanonicalPalmReading>["leftHandReading"],
): Array<{ label: string; value: string }> {
  if (!reading) {
    return [{ label: palmDestinyText("palmDestiny.label.008"), value: "손바닥 전체 흐름을 중심으로 읽었어요." }];
  }

  if (key === "lifeLine") {
    const line = reading.majorLines.lifeLine;
    return line.detected
      ? [
          { label: palmDestinyText("palmDestiny.label.009"), value: formatLineLength(line.length) },
          { label: palmDestinyText("palmDestiny.label.010"), value: formatLineDepth(line.depth) },
          { label: palmDestinyText("palmDestiny.label.011"), value: formatLineCurvature(line.curvature) },
          { label: palmDestinyText("palmDestiny.label.012"), value: formatLineChanges(line.branches, line.breaks) },
        ]
      : [{ label: palmDestinyText("palmDestiny.label.013"), value: "이번 사진에서는 생명선이 옅어 에너지 흐름을 넓게 읽었어요." }];
  }

  if (key === "headLine") {
    const line = reading.majorLines.headLine;
    return line.detected
      ? [
          { label: palmDestinyText("palmDestiny.label.014"), value: formatLineLength(line.length) },
          { label: palmDestinyText("palmDestiny.label.015"), value: formatHeadDirection(line.direction) },
          { label: palmDestinyText("palmDestiny.label.016"), value: formatHeadLifeRelation(line.startRelationWithLifeLine) },
          { label: palmDestinyText("palmDestiny.label.017"), value: formatLineChanges(line.branches, line.breaks) },
        ]
      : [{ label: palmDestinyText("palmDestiny.label.018"), value: "두뇌선이 옅어 손 형태와 주변 흐름까지 함께 읽었어요." }];
  }

  if (key === "heartLine") {
    const line = reading.majorLines.heartLine;
    return line.detected
      ? [
          { label: palmDestinyText("palmDestiny.label.019"), value: formatLineLength(line.length) },
          { label: palmDestinyText("palmDestiny.label.020"), value: formatLineCurvature(line.curvature) },
          { label: palmDestinyText("palmDestiny.label.021"), value: formatHeartEnding(line.endingArea) },
          { label: palmDestinyText("palmDestiny.label.022"), value: formatLineChanges(line.branches, line.breaks) },
        ]
      : [{ label: palmDestinyText("palmDestiny.label.023"), value: "감정선이 옅어 관계 온도는 조심스럽게 읽었어요." }];
  }

  if (key === "fateLine") {
    const line = reading.majorLines.fateLine;
    return line.detected
      ? [
          { label: "힘", value: formatFateStrength(line.strength) },
          { label: "시작", value: formatFateStart(line.startArea) },
          { label: palmDestinyText("palmDestiny.label.024"), value: formatLineChanges(0, line.breaks) },
        ]
      : [{ label: palmDestinyText("palmDestiny.label.025"), value: "운명선이 옅어 정해진 길보다 선택의 유연성을 중심으로 읽었어요." }];
  }

  if (key === "sunLine") {
    const line = reading.minorLines.sunLine;
    return [
      { label: palmDestinyText("palmDestiny.label.026"), value: formatMinorStrength(line.strength) },
      { label: palmDestinyText("palmDestiny.label.027"), value: line.summary || "이름을 걸고 보여주는 일에서 흐름을 키우는 손입니다." },
    ];
  }

  if (key === "moneyLine") {
    const line = reading.minorLines.moneyLine;
    return [
      { label: palmDestinyText("palmDestiny.label.028"), value: formatMinorStrength(line.strength) },
      { label: palmDestinyText("palmDestiny.label.029"), value: line.summary || "돈을 크게 단정하기보다 관리와 가치화 습관을 읽었습니다." },
    ];
  }

  if (key === "marriageLine") {
    const line = reading.minorLines.marriageLine;
    return [
      { label: palmDestinyText("palmDestiny.label.030"), value: formatMinorStrength(line.strength) },
      { label: palmDestinyText("palmDestiny.label.031"), value: line.summary || "관계의 횟수가 아니라 친밀감과 약속 방식을 읽었습니다." },
    ];
  }

  return [
    { label: palmDestinyText("palmDestiny.label.032"), value: reading.handShape.labelKo || "복합형" },
    { label: palmDestinyText("palmDestiny.label.033"), value: summarizeMountFocus(reading) },
    { label: palmDestinyText("palmDestiny.label.034"), value: reading.overall.summary || "손바닥 전체 흐름을 종합해 읽었습니다." },
  ];
}

function resultModeLabel(mode: AnalysisResultState["mode"]): string {
  if (mode === "full") return "정밀 리딩";
  if (mode === "partial") return "핵심 리딩";
  return "기본 리딩";
}

function buildInterpretationWithFallback(
  canonical: ReturnType<typeof createDefaultCanonicalPalmReading>,
  payload: unknown,
  resultSectionsPayload?: unknown,
): PalmInterpretationPayload | null {
  const normalized = normalizeInterpretation(payload);
  const engineSections = normalizeEngineResultSections(resultSectionsPayload);
  if (normalized?.cards?.length) return mergeInterpretationSections(normalized, engineSections);
  const fallback = normalizeInterpretation(buildPalmInterpretationReport(canonical));
  return fallback ? mergeInterpretationSections(fallback, engineSections) : null;
}

function pickSection(
  interpretation: PalmInterpretationPayload | null,
  key: string,
): { key: string; title: string; summary: string; detail: string; advice: string } | null {
  if (!Array.isArray(interpretation?.sections)) return null;
  return (
    interpretation.sections.find((section) => section.key === key) ||
    interpretation.sections.find((section) => section.key.toLowerCase() === key.toLowerCase()) ||
    null
  );
}

function buildCategoryConsultations(input: {
  report: Record<string, unknown> | null;
  interpretation: PalmInterpretationPayload | null;
}): CategoryConsultation[] {
  const report = input.report || {};
  const generalSection = pickSection(input.interpretation, "overall");
  const loveSection = pickSection(input.interpretation, "love");
  const wealthSection = pickSection(input.interpretation, "wealth");
  const careerSection = pickSection(input.interpretation, "career");
  const personalitySection = pickSection(input.interpretation, "personality");
  const relationshipSection = pickSection(input.interpretation, "relationship");
  const adviceSection = pickSection(input.interpretation, "advice");

  return [
    {
      key: "general",
      title: palmDestinyText("palmDestiny.title.001"),
      summary: String(report.summary || generalSection?.summary || "지금 흐름을 쉽게 정리한 손금 리딩이에요."),
      details: uniqText([
        String(report.oneLiner || ""),
        generalSection?.detail,
        String((input.interpretation?.focusSummary || "").trim()),
      ], 3),
      actions: uniqText([
        adviceSection?.advice,
        "오늘은 미뤄둔 일 하나를 끝내고 흐름을 열어 보세요.",
        "해석이 길어지면 짧게라도 확인 대화를 시작해 보세요.",
      ], 3),
    },
    {
      key: "love",
      title: palmDestinyText("palmDestiny.title.002"),
      summary: String(report.love || loveSection?.summary || "연애운은 안정감과 솔직한 대화가 핵심으로 보여요."),
      details: uniqText([loveSection?.detail, loveSection?.advice], 3),
      actions: uniqText([
        loveSection?.advice,
        adviceSection?.advice,
        "관계는 상대의 반응보다 내 톤을 먼저 정돈해 보세요.",
      ], 3),
    },
    {
      key: "wealth",
      title: palmDestinyText("palmDestiny.title.003"),
      summary: String(report.wealth || wealthSection?.summary || "재물운은 꾸준히 쌓을 때 힘이 붙는 흐름이에요."),
      details: uniqText([wealthSection?.detail, wealthSection?.advice], 3),
      actions: uniqText([
        wealthSection?.advice,
        adviceSection?.advice,
        "지출 기준선을 먼저 고치면 방향이 훨씬 빨리 선명해집니다.",
      ], 3),
    },
    {
      key: "career",
      title: palmDestinyText("palmDestiny.title.004"),
      summary: String(report.career || careerSection?.summary || "직업운은 내 방식과 실력을 쌓을수록 강해져요."),
      details: uniqText([careerSection?.detail, careerSection?.advice], 3),
      actions: uniqText([
        careerSection?.advice,
        adviceSection?.advice,
        "일정 단위를 짧게 쪼개서 실행 리듬을 만들면 성과가 붙습니다.",
      ], 3),
    },
    {
      key: "personality",
      title: palmDestinyText("palmDestiny.title.005"),
      summary: String(report.personality || personalitySection?.summary || "성격과 매력을 가볍게 정리한 리딩이에요."),
      details: uniqText([personalitySection?.detail, personalitySection?.advice], 3),
      actions: uniqText([
        personalitySection?.advice,
        adviceSection?.advice,
        "표현은 과장보다 일관성으로 가면 반응이 좋아집니다.",
      ], 3),
    },
    {
      key: "relationship",
      title: palmDestinyText("palmDestiny.title.006"),
      summary: String(report.relationship || relationshipSection?.summary || "관계운은 편안한 소통에서 더 좋아져요."),
      details: uniqText([relationshipSection?.detail, relationshipSection?.advice], 3),
      actions: uniqText([
        relationshipSection?.advice,
        adviceSection?.advice,
        "가장 중요한 것은 약속 하나를 지키는 패턴입니다.",
      ], 3),
    },
  ];
}

export default function PalmDestinyMain() {
  const [isImmersiveView, setIsImmersiveView] = useState(true);
  const [leftHand, setLeftHand] = useState<HandImageState>({ file: null, previewUrl: null, registeredAt: null });
  const [rightHand, setRightHand] = useState<HandImageState>({ file: null, previewUrl: null, registeredAt: null });
  const [dominantHand, setDominantHand] = useState<DominantHand | "">("");
  const [analysisPurpose, setAnalysisPurpose] = useState<AnalysisPurpose>(DEFAULT_ANALYSIS_PURPOSE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultState | null>(null);
  const [activeCardKey, setActiveCardKey] = useState<PalmCardKey>("lifeLine");
  const [overlaySide, setOverlaySide] = useState<HandSide>("right");
  const [selectedCaptureSide, setSelectedCaptureSide] = useState<HandSide>("right");
  const [lastSelectedSide, setLastSelectedSide] = useState<HandSide>("right");
  const [qualityFeedbackBySide, setQualityFeedbackBySide] = useState<Record<HandSide, PalmImageQualityFeedback | null>>({
    left: null,
    right: null,
  });
  const [landmarkStateBySide, setLandmarkStateBySide] = useState<Record<HandSide, PalmLandmarkState | null>>({
    left: null,
    right: null,
  });
  /** 저품질 경고를 사용자가 확인하고 그대로 진행하기로 한 경우. 새 사진을 올리면 해제된다. */
  const [qualityOverride, setQualityOverride] = useState(false);
  const [fileSignatureBySide, setFileSignatureBySide] = useState<Record<HandSide, string | null>>({
    left: null,
    right: null,
  });

  const leftUploadInputRef = useRef<HTMLInputElement>(null);
  const leftCameraInputRef = useRef<HTMLInputElement>(null);
  const rightUploadInputRef = useRef<HTMLInputElement>(null);
  const rightCameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const submitLockedRef = useRef(false);
  const requestIdRef = useRef(0);
  const inFlightSignatureRef = useRef<string | null>(null);
  const lastCompletedSignatureRef = useRef<string | null>(null);
  const lastCompletedAtRef = useRef(0);
  const previewUrlsRef = useRef<{ left: string | null; right: string | null }>({ left: null, right: null });
  const cardRefs = useRef<Record<PalmCardKey, HTMLDivElement | null>>({
    lifeLine: null,
    headLine: null,
    heartLine: null,
    fateLine: null,
    sunLine: null,
    moneyLine: null,
    marriageLine: null,
    mounts: null,
  });

  const handRoles = getPalmHandRoles(dominantHand);
  const activeAnalysisPurpose: AnalysisPurpose = analysisPurpose || DEFAULT_ANALYSIS_PURPOSE;
  const baseCanStartAnalysis = canStartPalmAnalysis({
    leftFile: leftHand.file,
    rightFile: rightHand.file,
    dominantHand,
    analysisPurpose: activeAnalysisPurpose,
    isSubmitting,
  });

  // 품질 사전점검이 '낮음'인 사진은 기본적으로 분석을 막는다.
  // 🔴 단 이 판정은 144px 샘플의 휴리스틱이라 오탐이 난다. 확정 차단으로 두면
  //    멀쩡한 사진을 든 유료 사용자가 빠져나갈 길이 없어진다(과거 정적 게이트
  //    leaf throw → alert 막다른 길 사고와 같은 형태). 사유를 보여준 뒤
  //    사용자가 직접 넘길 수 있는 경로를 항상 함께 둔다.
  const lowQualitySides = (["left", "right"] as HandSide[]).filter((side) => {
    const file = side === "left" ? leftHand.file : rightHand.file;
    return Boolean(file) && qualityFeedbackBySide[side]?.confidence === "낮음";
  });
  const isQualityBlocked = lowQualitySides.length > 0 && !qualityOverride;
  const canStartAnalysis = baseCanStartAnalysis && !isQualityBlocked;
  const hasAnyPreview = Boolean(leftHand.previewUrl || rightHand.previewUrl);
  const flowStep: PalmFlowStep = analysisResult ? "result" : isSubmitting ? "analyzing" : hasAnyPreview ? "preview" : "pick";

  const currentPreviewSide: HandSide =
    lastSelectedSide === "left" && leftHand.previewUrl
      ? "left"
      : lastSelectedSide === "right" && rightHand.previewUrl
      ? "right"
      : leftHand.previewUrl
      ? "left"
      : "right";

  const currentPreviewState = currentPreviewSide === "left" ? leftHand : rightHand;
  const currentQualityFeedback = qualityFeedbackBySide[currentPreviewSide];

  const interpretationCards = analysisResult?.interpretation?.cards ?? [];
  const activeHandReading = analysisResult
    ? (overlaySide === "left" ? analysisResult.canonical.leftHandReading : analysisResult.canonical.rightHandReading) ||
      analysisResult.canonical.rightHandReading ||
      analysisResult.canonical.leftHandReading
    : null;
  const activeHandRole = analysisResult
    ? overlaySide === "left"
      ? analysisResult.canonical.handContext.leftHandRole
      : analysisResult.canonical.handContext.rightHandRole
    : "unknown";
  const readableSignalCount = countReadablePalmSignals(activeHandReading);
  const resultOneLiner =
    analysisResult?.interpretation?.oneLiner ||
    String(analysisResult?.report?.oneLiner || "") ||
    "손바닥 전체 흐름을 읽어 지금 필요한 방향을 정리했어요.";
  const resultPrimaryAction =
    analysisResult?.interpretation?.report?.tips?.[0] ||
    String(analysisResult?.report?.advice || "") ||
    "오늘은 작은 행동 하나를 끝내며 흐름을 열어 보세요.";
  const resultPurposeLabel = analysisResult
    ? PURPOSE_LABEL_BY_KEY[analysisResult.canonical.profile.analysisPurpose] || "전체 운세"
    : "전체 운세";
  const categoryConsultations = analysisResult
    ? buildCategoryConsultations({
        report: analysisResult.report,
        interpretation: analysisResult.interpretation,
      })
    : [];
  const bothHandsComparison = analysisResult?.canonical.bothHandsComparison;
  const detectedSpecialPatterns: PalmSpecialPattern[] = Array.isArray(analysisResult?.canonical.specialPatterns?.detected)
    ? analysisResult.canonical.specialPatterns.detected
    : [];

  const pickedOverlayImage = overlaySide === "left" ? leftHand.previewUrl : rightHand.previewUrl;
  const overlayImageUrl = pickedOverlayImage || leftHand.previewUrl || rightHand.previewUrl || null;
  const overlayImageAlt =
    overlaySide === "left" ? "왼손 손바닥 오버레이" : overlaySide === "right" ? "오른손 손바닥 오버레이" : "손바닥 오버레이";

  const activeOverlayPaths: OverlayPathMap =
    (analysisResult?.overlayPathsBySide?.[overlaySide] as OverlayPathMap | null) || analysisResult?.overlayPaths || {};

  const hasCoordinatePaths = Boolean(
    analysisResult &&
      (activeOverlayPaths.lifeLine ||
        activeOverlayPaths.headLine ||
        activeOverlayPaths.heartLine ||
        activeOverlayPaths.fateLine),
  );

  const loadingPhaseText = LOADING_PHASES[loadingPhaseIndex] ?? LOADING_PHASES[0];

  useEffect(() => {
    previewUrlsRef.current = {
      left: leftHand.previewUrl,
      right: rightHand.previewUrl,
    };
  }, [leftHand.previewUrl, rightHand.previewUrl]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      const { left, right } = previewUrlsRef.current;
      revokeObjectUrls([left, right]);
    };
  }, []);

  useEffect(() => {
    if (!isSubmitting) {
      setLoadingPhaseIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 1300);

    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  const cancelInFlightRequest = () => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  };

  const resetAnalysisState = () => {
    setAnalysisResult(null);
    setSubmitMessage("");
    setIsSubmitting(false);
    submitLockedRef.current = false;
    setLoadingPhaseIndex(0);
    setActiveCardKey("lifeLine");
    setOverlaySide("right");
  };

  const resetSessionForReanalysis = (options?: {
    clearImages?: boolean;
    resetSelections?: boolean;
    keepMessage?: string;
  }) => {
    cancelInFlightRequest();
    requestIdRef.current += 1;

    const clearImages = Boolean(options?.clearImages);
    const resetSelections = Boolean(options?.resetSelections);

    inFlightSignatureRef.current = null;
    lastCompletedSignatureRef.current = null;
    lastCompletedAtRef.current = 0;

    if (clearImages) {
      revokeObjectUrls([leftHand.previewUrl, rightHand.previewUrl]);
      setLeftHand({ file: null, previewUrl: null, registeredAt: null });
      setRightHand({ file: null, previewUrl: null, registeredAt: null });
      setQualityFeedbackBySide({ left: null, right: null });
      setLandmarkStateBySide({ left: null, right: null });
      setQualityOverride(false);
      setFileSignatureBySide({ left: null, right: null });
      setLastSelectedSide("right");
    }

    if (resetSelections) {
      setDominantHand("");
      setAnalysisPurpose(DEFAULT_ANALYSIS_PURPOSE);
      setSelectedCaptureSide("right");
    }

    resetAnalysisState();
    if (typeof options?.keepMessage === "string") {
      setSubmitMessage(options.keepMessage);
    }
  };

  const setHandImage = (side: HandSide, file: File | null) => {
    const prevUrl = side === "left" ? leftHand.previewUrl : rightHand.previewUrl;
    if (prevUrl) {
      revokeObjectUrls([prevUrl]);
    }

    const nextState: HandImageState = file
      ? {
          file,
          previewUrl: URL.createObjectURL(file),
          registeredAt: Date.now(),
        }
      : {
          file: null,
          previewUrl: null,
          registeredAt: null,
        };

    if (side === "left") {
      setLeftHand(nextState);
      return;
    }

    setRightHand(nextState);
  };

  const handleImageSelected = async (file: File, side: HandSide, source: UploadSource) => {
    if (!file) {
      setSubmitMessage("사진을 선택하지 않았습니다. 손바닥 이미지를 다시 선택해 주세요.");
      return;
    }

    if (!isLikelyImageFile(file)) {
      setSubmitMessage("파일 형식을 지원하지 않습니다. JPG, PNG, WEBP, HEIC/HEIF 이미지를 선택해 주세요.");
      return;
    }

    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      setSubmitMessage("파일 크기가 너무 큽니다. 25MB 이하 이미지를 선택해 주세요.");
      return;
    }

    resetAnalysisState();

    let normalizedFile = file;
    let prepWarning = "";
    try {
      try {
        normalizedFile = await resizeImageIfNeeded(file);
      } catch (error) {
        normalizedFile = file;
        prepWarning =
          isHeicLikeFile(file)
            ? "이 기기에서는 HEIC/HEIF 미리보기 최적화가 제한됩니다. 원본 파일로 분석을 진행합니다."
            : `브라우저 전처리를 건너뛰고 원본으로 분석합니다. (${error instanceof Error ? error.message : "UNKNOWN_PREP_ERROR"})`;
      }

      const signature = await computeFileSignature(normalizedFile);

      setHandImage(side, normalizedFile);
      setFileSignatureBySide((prev) => ({
        ...prev,
        [side]: signature,
      }));
      setOverlaySide(side);
      setLastSelectedSide(side);

      let quality: PalmImageQualityFeedback | null = null;
      try {
        quality = await analyzeImageQuality(normalizedFile);
      } catch (e) {
        quality = null;
        if (!prepWarning) {
          prepWarning = "이 브라우저에서는 품질 사전점검이 제한되어 서버 분석 결과를 기준으로 안내합니다.";
        }
      }

      setQualityFeedbackBySide((prev) => ({
        ...prev,
        [side]: quality,
      }));

      // 실제 손 검출. 결과를 캐시해 분석 시작 때 재사용한다(같은 사진을 두 번 추론하지 않는다).
      const landmarkCheck = await detectHandForFile(normalizedFile, side);
      setLandmarkStateBySide((prev) => ({ ...prev, [side]: landmarkCheck }));
      // 새 사진이 들어왔으므로 이전 "그대로 진행" 판단은 무효다.
      setQualityOverride(false);

      // MediaPipe 가 실제로 돌았는데 손이 없으면 여기서 막는다 — 과금 이전 지점이다.
      // 검출기를 못 쓴 경우(CDN 차단 등)는 막지 않고 기존 경로로 진행한다.
      if (landmarkCheck.status === "no-hand") {
        setSubmitMessage(
          `${side === "left" ? "왼손" : "오른손"} 사진에서 손을 찾지 못했습니다. 손바닥을 펴고 손목부터 손가락 끝까지 화면에 담아 다시 촬영해 주세요.`,
        );
        return;
      }

      if (quality?.confidence === "낮음") {
        const warningSuffix = prepWarning ? ` ${prepWarning}` : "";
        setSubmitMessage(`분석은 가능하지만 사진이 조금 어둡거나 흐릴 수 있습니다. 결과는 참고용으로 확인해 주세요.${warningSuffix}`);
        return;
      }

      const sourceLabel = source === "camera" ? "카메라 촬영" : "앨범 선택";
      if (isHeicLikeFile(file) && normalizedFile.type === "image/jpeg") {
        setSubmitMessage(`${sourceLabel} HEIC 이미지를 분석용 JPEG로 변환했습니다. 미리보기 확인 후 분석을 시작해 주세요.`);
        return;
      }

      if (prepWarning) {
        setSubmitMessage(`${sourceLabel} 이미지를 불러왔습니다. ${prepWarning} 미리보기 확인 후 분석을 시작해 주세요.`);
        return;
      }

      setSubmitMessage(`${sourceLabel} 이미지를 불러왔습니다. 미리보기 확인 후 분석을 시작해 주세요.`);
    } catch (error) {
      setSubmitMessage(
        isHeicLikeFile(file)
          ? "HEIC/HEIF 이미지를 브라우저에서 해석하지 못했습니다. iPhone에서 JPG로 촬영하거나 변환 후 다시 선택해 주세요."
          : `이미지 로딩 실패: ${error instanceof Error ? error.message : palmDestinyText("palmDestiny.message.001")}. 다른 사진으로 다시 시도해 주세요.`,
      );
    }
  };

  const handleFileChange = async (side: HandSide, source: UploadSource, event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!picked) {
      setSubmitMessage("사진을 선택하지 않았습니다. 다시 시도해 주세요.");
      return;
    }

    await handleImageSelected(picked, side, source);
  };

  const clearHandImage = (side: HandSide) => {
    resetAnalysisState();
    setHandImage(side, null);
    setQualityFeedbackBySide((prev) => ({
      ...prev,
      [side]: null,
    }));
    setLandmarkStateBySide((prev) => ({
      ...prev,
      [side]: null,
    }));
    setQualityOverride(false);
    setFileSignatureBySide((prev) => ({
      ...prev,
      [side]: null,
    }));

    if (side === "left" && overlaySide === "left") {
      setOverlaySide("right");
    }
    if (side === "right" && overlaySide === "right") {
      setOverlaySide("left");
    }
  };

  const setCardRef = (key: PalmCardKey) => (node: HTMLDivElement | null) => {
    cardRefs.current[key] = node;
  };

  const scrollToCard = (key: PalmCardKey) => {
    setActiveCardKey(key);
    const node = cardRefs.current[key];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleOverlayLineSelect = (line: OverlayLineKey) => {
    const targetCard = LINE_TO_CARD_KEY[line];
    scrollToCard(targetCard);
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("이미지 인코딩에 실패했습니다."));
      reader.readAsDataURL(file);
    });

  const getClientAuthToken = (): string => {
    if (typeof window === "undefined") return "";
    try {
      return String(window.localStorage.getItem("fortune_auth_token") || "").trim();
    } catch (e) {
      return "";
    }
  };

  const handleStartAnalysis = async () => {
    if (!canStartAnalysis || submitLockedRef.current) return;

    const leftSig =
      fileSignatureBySide.left ||
      (leftHand.file
        ? `${leftHand.file.name}|${leftHand.file.size}|${leftHand.file.lastModified}|${leftHand.file.type}`
        : "none");
    const rightSig =
      fileSignatureBySide.right ||
      (rightHand.file
        ? `${rightHand.file.name}|${rightHand.file.size}|${rightHand.file.lastModified}|${rightHand.file.type}`
        : "none");
    const requestSignature = [dominantHand || "none", activeAnalysisPurpose || "none", leftSig, rightSig].join("::");

    if (inFlightSignatureRef.current === requestSignature) {
      setSubmitMessage("동일 이미지 분석이 이미 진행 중입니다. 잠시만 기다려 주세요.");
      return;
    }

    if (
      lastCompletedSignatureRef.current === requestSignature &&
      Date.now() - Number(lastCompletedAtRef.current || 0) < 1500
    ) {
      setSubmitMessage("같은 이미지 요청이 방금 처리되었습니다. 잠시 후 다시 시도하거나 사진을 변경해 주세요.");
      return;
    }

    submitLockedRef.current = true;
    inFlightSignatureRef.current = requestSignature;
    const initialSubFeatureKey = PALM_BILLING_SUB_FEATURE_KEY;
    const billingRequestId = `palm-reading:${initialSubFeatureKey}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    const handleCoinGateFailure = (coinGateResult: Awaited<ReturnType<typeof runBillingCoinGate>>, requestIdForGate: string) => {
      const coinGateCode = String(coinGateResult.error?.code || "").toUpperCase();
      const serverCost = Number(coinGateResult.data?.pricing?.cost || 0);
      const message =
        coinGateCode === "AUTH_REQUIRED"
          ? "로그인이 필요합니다. 로그인 후 다시 손금 분석을 시도해 주세요."
          : coinGateCode === "INSUFFICIENT_COINS"
          ? `결제 가능 금액이 부족합니다. ${serverCost}결제가 필요합니다.`
          : coinGateCode === "PRICE_NOT_FOUND"
          ? "손금 분석 가격표를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요."
          : coinGateResult.error?.message || "원화 결제에 실패했습니다.";

      updatePaidFeatureGate({
        categoryKey: "palm-reading",
        subFeatureKey: initialSubFeatureKey,
        requestId: requestIdForGate,
        status: "error",
        message,
      });
      setSubmitMessage(message);

      if (coinGateCode === "AUTH_REQUIRED" && typeof window !== "undefined") {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.setTimeout(() => {
          window.location.href = `/login?next=${next}`;
        }, 600);
      }
    };

    cancelInFlightRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setIsSubmitting(true);
      setAnalysisResult(null);
      setSubmitMessage("손바닥 이미지 품질을 확인하고 있습니다...");

      openPaidFeatureGate({
        categoryKey: "palm-reading",
        subFeatureKey: initialSubFeatureKey,
        requestId: billingRequestId,
        message: palmDestinyText("palmDestiny.message.002"),
      });
      holdPaidFeatureGateOpen({ requestId: billingRequestId, maxMs: 45000 });
      updatePaidFeatureGate({
        categoryKey: "palm-reading",
        subFeatureKey: initialSubFeatureKey,
        requestId: billingRequestId,
        message: "손바닥 사진을 분석하고 있어요",
      });

      const [leftPalmImage, rightPalmImage, leftVision, rightVision] = await Promise.all([
        leftHand.file ? fileToDataUrl(leftHand.file) : Promise.resolve(null),
        rightHand.file ? fileToDataUrl(rightHand.file) : Promise.resolve(null),
        leftHand.file
          ? extractPalmVisionPayload(leftHand.file, "left", landmarkStateBySide.left).catch(() => null)
          : Promise.resolve(null),
        rightHand.file
          ? extractPalmVisionPayload(rightHand.file, "right", landmarkStateBySide.right).catch(() => null)
          : Promise.resolve(null),
      ]);

      const requestBody = JSON.stringify({
        leftPalmImage,
        rightPalmImage,
        leftHandLandmarks: leftVision?.handLandmarks ?? null,
        rightHandLandmarks: rightVision?.handLandmarks ?? null,
        leftLineCandidates: leftVision?.lineCandidates ?? [],
        rightLineCandidates: rightVision?.lineCandidates ?? [],
        leftImageQuality: toApiImageQuality(qualityFeedbackBySide.left),
        rightImageQuality: toApiImageQuality(qualityFeedbackBySide.right),
        uploadedHandSide: leftHand.file && rightHand.file ? "both" : leftHand.file ? "left" : rightHand.file ? "right" : "",
        dominantHand,
        analysisPurpose: activeAnalysisPurpose,
      });

      setSubmitMessage("손바닥의 금빛 선을 읽고 있습니다...");

      let response = await fetch("/api/palm/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: requestBody,
      });

      if (response.status === 401) {
        const authToken = getClientAuthToken();
        if (authToken) {
          response = await fetch("/api/palm/analyze", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            signal: controller.signal,
            body: requestBody,
          });
        }
      }

      if (requestIdRef.current !== requestId) {
        return;
      }

      const data = await response.json().catch(() => ({}));
      const payloadRoot =
        data?.data && typeof data.data === "object"
          ? (data.data as Record<string, unknown>)
          : (data as Record<string, unknown>);

      if (!response.ok) {
        const code =
          typeof data?.code === "string"
            ? data.code
            : typeof data?.error === "string"
            ? data.error
            : "UNKNOWN_ERROR";
        const reasonCode =
          typeof data?.reasonCode === "string"
            ? data.reasonCode
            : typeof data?.data?.reasonCode === "string"
            ? data.data.reasonCode
            : "";
        const serverReason =
          typeof data?.reason === "string"
            ? data.reason
            : typeof data?.data?.reason === "string"
            ? data.data.reason
            : "";
        const message =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
            ? data.error
            : "분석 중 오류가 발생했습니다.";
        updatePaidFeatureGate({
          categoryKey: "palm-reading",
          subFeatureKey: initialSubFeatureKey,
          requestId: billingRequestId,
          status: "error",
          message: mapPalmAnalyzeError({ status: response.status, code, reasonCode, message, reason: serverReason }),
        });
        setSubmitMessage(mapPalmAnalyzeError({ status: response.status, code, reasonCode, message, reason: serverReason }));
        return;
      }

      const canonicalSource =
        payloadRoot?.canonical && typeof payloadRoot.canonical === "object"
          ? (payloadRoot.canonical as Record<string, unknown>)
          : payloadRoot;

      const profileSource = (canonicalSource?.profile as Record<string, unknown> | undefined) || undefined;
      const handContextSource = (canonicalSource?.handContext as Record<string, unknown> | undefined) || undefined;
      const uploadedHandsFromPayload: Array<"left" | "right"> = Array.isArray(handContextSource?.uploadedHands)
        ? handContextSource.uploadedHands.filter((item): item is "left" | "right" => item === "left" || item === "right")
        : [];

      const dominantHandFromPayload = toDominantHand(profileSource?.dominantHand);
      const analysisPurposeFromPayload = toAnalysisPurpose(profileSource?.analysisPurpose);
      const leftHandRoleFromPayload = toHandRole(handContextSource?.leftHandRole);
      const rightHandRoleFromPayload = toHandRole(handContextSource?.rightHandRole);
      const dominantForCanonical: DominantHand | null = dominantHandFromPayload ?? (dominantHand || null);
      const purposeForCanonical: AnalysisPurpose = analysisPurposeFromPayload || activeAnalysisPurpose;

      const imageQualityFromPayload =
        (canonicalSource?.imageQuality as ReturnType<typeof createDefaultCanonicalPalmReading>["imageQuality"] | undefined) ||
        undefined;
      const leftHandReadingFromPayload =
        (canonicalSource?.leftHandReading as ReturnType<typeof createDefaultCanonicalPalmReading>["leftHandReading"]) ||
        null;
      const rightHandReadingFromPayload =
        (canonicalSource?.rightHandReading as ReturnType<typeof createDefaultCanonicalPalmReading>["rightHandReading"]) ||
        null;
      const comparisonFromPayload =
        (canonicalSource?.bothHandsComparison as
          | ReturnType<typeof createDefaultCanonicalPalmReading>["bothHandsComparison"]
          | undefined) || undefined;
      const purposeAnalysisFromPayload =
        (canonicalSource?.purposeAnalysis as ReturnType<typeof createDefaultCanonicalPalmReading>["purposeAnalysis"]) ||
        undefined;
      const specialPatternsFromPayload =
        (canonicalSource?.specialPatterns as ReturnType<typeof createDefaultCanonicalPalmReading>["specialPatterns"]) ||
        undefined;

      const canonical = createDefaultCanonicalPalmReading({
        dominantHand: dominantForCanonical,
        analysisPurpose: purposeForCanonical,
        uploadedHands: uploadedHandsFromPayload,
        leftHandRole: leftHandRoleFromPayload ?? handRoles.leftHandRole,
        rightHandRole: rightHandRoleFromPayload ?? handRoles.rightHandRole,
        imageQuality: imageQualityFromPayload,
        leftHandReading: leftHandReadingFromPayload,
        rightHandReading: rightHandReadingFromPayload,
        comparison: comparisonFromPayload,
        specialPatterns: specialPatternsFromPayload,
        purposeAnalysis: purposeAnalysisFromPayload,
      });

      const interpretation = buildInterpretationWithFallback(canonical, payloadRoot?.interpretation, payloadRoot?.resultSections);
      const overlayPaths = extractOverlayPaths(payloadRoot?.overlayPaths ?? payloadRoot);
      const overlayPathsBySide = extractOverlayPathsBySide(payloadRoot);
      const modeFromPayload =
        payloadRoot?.mode === "full" || payloadRoot?.mode === "partial" || payloadRoot?.mode === "fallback"
          ? (payloadRoot.mode as "full" | "partial" | "fallback")
          : canonical.validation.analysisMode === "detailed"
          ? "full"
          : "partial";
      const qualityScore = Number(payloadRoot?.qualityScore ?? NaN);
      const safeQualityScore = Number.isFinite(qualityScore) ? qualityScore : 0;
      const missingData = Array.isArray(payloadRoot?.missingData)
        ? payloadRoot.missingData.map((item) => String(item))
        : [];
      const warnings = Array.isArray(payloadRoot?.warnings)
        ? payloadRoot.warnings.map((item) => String(item))
        : [];
      const reportPayload =
        payloadRoot?.report && typeof payloadRoot.report === "object"
          ? (payloadRoot.report as Record<string, unknown>)
          : null;

      if (!shouldShowPalmResult(canonical)) {
        setAnalysisResult(null);
        updatePaidFeatureGate({
          categoryKey: "palm-reading",
          subFeatureKey: initialSubFeatureKey,
          requestId: billingRequestId,
          status: "error",
          message: palmDestinyText("palmDestiny.message.003"),
        });
        setSubmitMessage("손바닥 전체가 화면에 들어오지 않았습니다. 손목부터 손가락 끝까지 보이게 다시 촬영해 주세요.");
        return;
      }

      setSubmitMessage("분석 결과를 확인했습니다. 결제를 확인하고 있습니다...");
      const coinGateResult = await runBillingCoinGate({
        categoryKey: PALM_BILLING_CATEGORY_KEY,
        subFeatureKey: initialSubFeatureKey,
        requestId: billingRequestId,
        payloadHash: `${requestSignature}:charge`,
        // 카테고리 표로도 풀리지만 명시해 둔다 — 결제창 금액의 근거를 호출부에서 읽을 수 있게.
        cost: PALM_BILLING_PRICING?.cost,
        coinPrice: PALM_BILLING_PRICING?.cost,
        amountKRW: PALM_BILLING_PRICING?.amountKRW,
      });

      if (!coinGateResult.ok) {
        handleCoinGateFailure(coinGateResult, billingRequestId);
        return;
      }

      try {
        const nextPoints = Number(
          coinGateResult.data?.balance
            ?? (coinGateResult.data?.user && (coinGateResult.data.user as Record<string, unknown>).points)
            ?? NaN,
        );
        if (typeof window !== "undefined" && Number.isFinite(nextPoints)) {
          window.localStorage.setItem("fortune_user_points", String(nextPoints));
          const rawUser = window.localStorage.getItem("fortune_auth_user") || "";
          const parsedUser = rawUser ? JSON.parse(rawUser) : {};
          parsedUser.points = nextPoints;
          window.localStorage.setItem("fortune_auth_user", JSON.stringify(parsedUser));
        }
      } catch (e) {
        // ignore client-side storage failures
      }

      setAnalysisResult({
        mode: modeFromPayload,
        qualityScore: safeQualityScore,
        missingData,
        warnings,
        report: reportPayload,
        canonical,
        interpretation,
        consultText: extractConsultText(payloadRoot),
        overlayPaths,
        overlayPathsBySide,
        raw: payloadRoot,
      });

      const firstKey = interpretation?.cards?.[0]?.key;
      if (firstKey && firstKey in CARD_KEY_TO_LABEL) {
        setActiveCardKey(firstKey as PalmCardKey);
      } else {
        setActiveCardKey("lifeLine");
      }

      if (rightHand.previewUrl && (dominantHand === "right" || !leftHand.previewUrl)) {
        setOverlaySide("right");
      } else if (leftHand.previewUrl) {
        setOverlaySide("left");
      }

      const qualityMessage =
        modeFromPayload === "full"
          ? "손바닥 인식이 완료되었습니다. 정밀 분석 결과가 생성되었습니다."
          : modeFromPayload === "partial"
          ? "손바닥은 감지되었고 부분 분석 결과가 생성되었습니다. 더 선명한 사진을 올리면 정확도가 올라갑니다."
          : "손바닥은 감지되었지만 선명도가 낮아 기본/보수 해석으로 결과를 생성했습니다.";
      setSubmitMessage(qualityMessage);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        updatePaidFeatureGate({
          categoryKey: "palm-reading",
          subFeatureKey: initialSubFeatureKey,
          requestId: billingRequestId,
          status: "error",
          message: palmDestinyText("palmDestiny.message.004"),
        });
        setSubmitMessage("요청이 취소되었습니다. 다시 분석을 시도해 주세요.");
        return;
      }

      if (error instanceof TypeError) {
        updatePaidFeatureGate({
          categoryKey: "palm-reading",
          subFeatureKey: initialSubFeatureKey,
          requestId: billingRequestId,
          status: "error",
          message: palmDestinyText("palmDestiny.message.005"),
        });
        setSubmitMessage("네트워크/API 오류로 분석 요청에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return;
      }

      updatePaidFeatureGate({
        categoryKey: "palm-reading",
        subFeatureKey: initialSubFeatureKey,
        requestId: billingRequestId,
        status: "error",
        message: `분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "unknown"}`,
      });
      setSubmitMessage(`분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      releasePaidFeatureGate(billingRequestId);
      if (requestIdRef.current === requestId) {
        setIsSubmitting(false);
        lastCompletedSignatureRef.current = requestSignature;
        lastCompletedAtRef.current = Date.now();
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      if (inFlightSignatureRef.current === requestSignature) {
        inFlightSignatureRef.current = null;
      }
      submitLockedRef.current = false;
    }
  };

  const handlePhotoReselect = () => {
    resetSessionForReanalysis({
      clearImages: true,
      resetSelections: false,
      keepMessage: "사진을 다시 선택해 손금 분석을 재시작할 수 있습니다.",
    });
  };

  const handleRetryWithOtherHand = () => {
    resetSessionForReanalysis({
      clearImages: false,
      resetSelections: true,
      keepMessage: "다른 손 기준으로 다시 보기 위해 주로 쓰는 손을 다시 선택해 주세요.",
    });
  };

  const handleBackToMain = () => {
    resetSessionForReanalysis({ clearImages: true, resetSelections: true });
    hardNavigateToShellHome();
  };

  const handleResetOnlyResult = () => {
    resetSessionForReanalysis({
      clearImages: false,
      resetSelections: false,
      keepMessage: "이전 분석 결과를 초기화했습니다. 같은 입력으로 다시 분석할 수 있습니다.",
    });
  };

  const renderInterpretationCard = (card: PalmInterpretationCard) => {
    const cardId = `palm-card-${card.key}`;
    const active = activeCardKey === card.key;
    const cardSignalFacts = buildCardSignalFacts(card.key, activeHandReading);

    return (
      <article
        key={card.key}
        id={cardId}
        ref={setCardRef(card.key)}
        className={`cd-oriental-card cd-fade-in rounded-2xl border p-4 md:p-5 ${
          active
            ? "border-[#c8a84b]/65"
            : "border-[#c8a84b]/25"
        }`}
        style={active ? {
          background: "linear-gradient(145deg, rgba(10,5,5,0.98), rgba(20,8,8,0.97))",
          boxShadow: "0 0 0 1px rgba(180,130,40,0.2), 0 0 28px rgba(139,0,0,0.2), inset 0 0 30px rgba(120,15,15,0.18)",
        } : {
          background: "linear-gradient(145deg, rgba(8,4,4,0.96), rgba(15,7,7,0.95))",
          boxShadow: "0 0 0 1px rgba(180,130,40,0.08)",
        }}
      >
        <header className="flex items-center justify-between gap-2 border-b border-[#c8a84b]/20 pb-3">
          <h4 className="text-sm font-black text-[#f5d987] md:text-base cd-oriental-headline">{card.title}</h4>
          <button
            type="button"
            onClick={() => setActiveCardKey(card.key)}
            className="cd-ghost-btn rounded-sm border border-[#c8a84b]/40 bg-[#0d0808] px-2 py-1 text-[11px] font-bold text-[#e8d090]"
          >
            선택
          </button>
        </header>

        <p className="mt-3 rounded-lg border border-[#9b1a1a]/40 bg-[#1a0808]/70 px-3 py-2 text-sm font-semibold leading-6 text-[#ffd8d0]">
          {card.oneLiner}
        </p>

        <section className="mt-3 rounded-lg border border-[#c8a84b]/22 bg-[#100808]/70 px-3 py-3">
          <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
            <span aria-hidden className="text-[8px]">◆</span>읽힌 신호
          </h5>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {cardSignalFacts.slice(0, 4).map((fact) => (
              <div key={`${card.key}-signal-${fact.label}`} className="rounded-lg border border-[#c8a84b]/16 bg-[#090505]/70 px-3 py-2">
                <p className="text-[11px] font-black text-[#f5d987]/90 md:text-xs">{fact.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#e8d8b0]/90 md:text-sm">{fact.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3">
          <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
            <span aria-hidden className="text-[8px]">◆</span>해석
          </h5>
          <ul className="mt-2 space-y-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
            {card.details.slice(0, 6).map((line, index) => (
              <li key={`${card.key}-detail-${index}`} className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/65 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <section>
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px] text-green-400/70">◆</span>살릴 힘
            </h5>
            <ul className="mt-2 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
              {card.strengths.slice(0, 3).map((line, index) => (
                <li key={`${card.key}-strength-${index}`} className="rounded-lg border border-[#4a7a30]/30 bg-[#0a1206]/60 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px] text-red-400/70">◆</span>조율할 점
            </h5>
            <ul className="mt-2 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
              {card.cautions.slice(0, 3).map((line, index) => (
                <li key={`${card.key}-caution-${index}`} className="rounded-lg border border-[#8b1a1a]/35 bg-[#140808]/60 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-3 space-y-2">
          <div className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px]">◆</span>오늘의 조언
            </h5>
            <p className="mt-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{card.todayAdvice}</p>
          </div>
          <div className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px]">◆</span>7일 실천법
            </h5>
            <p className="mt-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{card.sevenDayPractice}</p>
          </div>
        </section>
      </article>
    );
  };

  const renderHandUploader = (
    side: HandSide,
    state: HandImageState,
    uploadRef: React.RefObject<HTMLInputElement>,
    cameraRef: React.RefObject<HTMLInputElement>,
    title: string,
  ) => {
    const hasPreview = Boolean(state.previewUrl);
    const handName = side === "left" ? "왼손" : "오른손";
    const galleryInputId = getGalleryInputId(side);
    const cameraInputId = getCameraInputId(side);
    const role = side === "left" ? handRoles.leftHandRole : handRoles.rightHandRole;
    const roleMeta = HAND_ROLE_META[role];
    const registeredLabel = formatRegisteredAt(state.registeredAt);
    const landmarkState = landmarkStateBySide[side];
    const quality = qualityFeedbackBySide[side];
    const detectionBadge = landmarkState
      ? landmarkState.status === "detected"
        ? { text: "손 인식됨", className: "border-[#4f7a3a]/70 bg-[#12200f] text-[#c6e8ac]" }
        : { text: "손 위치 추정", className: "border-[#8a6a2a]/70 bg-[#241a08] text-[#f0cf9a]" }
      : null;
    const qualityBadge = quality
      ? {
          text: `사진 품질 ${quality.confidence}`,
          className:
            quality.confidence === "높음"
              ? "border-[#4f7a3a]/70 bg-[#12200f] text-[#c6e8ac]"
              : quality.confidence === "보통"
              ? "border-[#8a6a2a]/70 bg-[#241a08] text-[#f0cf9a]"
              : "border-[#9b1a1a]/70 bg-[#230a0a] text-[#ffc8c8]",
        }
      : null;
    const qualityReasons = quality && quality.confidence !== "높음" ? quality.warnings.slice(0, 3) : [];

    return (
      <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/45 bg-[linear-gradient(145deg,rgba(8,4,4,0.97),rgba(18,8,8,0.97))] p-4 md:p-5" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.14)" }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#f5d987] md:text-lg cd-oriental-headline">{title}</h2>
          <span className="rounded-sm border border-[#9b1a1a]/75 bg-[#4a0808]/80 px-2 py-1 text-[11px] font-bold tracking-[0.1em] text-[#ffc8c8]">
            손바닥 입력
          </span>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#d8c090]/80 md:text-sm">
          손바닥이 선명하게 보이는 사진을 업로드하거나 촬영해 주세요.
        </p>

        {hasPreview ? (
          <div className="mt-3 rounded-lg border border-[#c8a84b]/35 bg-[#0d0606]/80 px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 rounded-sm border border-[#4f7a3a]/70 bg-[#12200f] px-2 py-0.5 text-[11px] font-bold text-[#c6e8ac]">
                <span aria-hidden>✓</span> 등록 완료
              </span>
              {registeredLabel ? (
                <span className="text-[11px] text-[#d8c090]/80">{registeredLabel}</span>
              ) : null}
            </div>
            <p className="mt-2 text-xs font-bold text-[#f5d987] md:text-sm">
              {handName} · {roleMeta.label}
            </p>
            <p className="mt-1 text-xs text-[#d8c090]/80">{roleMeta.description}</p>

            {/* 실제 손 인식 결과와 품질 사전점검을 한자리에 모아 보여준다.
                Phase 1 에서 만든 검출 상태가 화면에 안 나와 사용자가 알 수 없었다. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detectionBadge ? (
                <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${detectionBadge.className}`}>
                  {detectionBadge.text}
                </span>
              ) : null}
              {qualityBadge ? (
                <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-bold ${qualityBadge.className}`}>
                  {qualityBadge.text}
                </span>
              ) : null}
            </div>

            {qualityReasons.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[11px] leading-5 text-[#f0cf9a]">
                {qualityReasons.map((reason) => (
                  <li key={reason}>· {reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* 액자형 업로드 영역 */}
        <div className="mt-4 overflow-hidden rounded-xl border-2 border-[#c8a84b]/50" style={{ background: "linear-gradient(140deg, #07040a 0%, #0d0606 60%, #100408 100%)", boxShadow: "inset 0 0 30px rgba(100,10,10,0.25), 0 0 0 1px rgba(180,130,40,0.08)" }}>
          {/* 코너 장식 */}
          <div className="relative">
            <span aria-hidden className="absolute left-2 top-2 text-[#c8a84b]/60 text-xs leading-none">╔</span>
            <span aria-hidden className="absolute right-2 top-2 text-[#c8a84b]/60 text-xs leading-none">╗</span>
            <span aria-hidden className="absolute left-2 bottom-2 text-[#c8a84b]/60 text-xs leading-none">╚</span>
            <span aria-hidden className="absolute right-2 bottom-2 text-[#c8a84b]/60 text-xs leading-none">╝</span>
          </div>
          <div className="relative flex min-h-[220px] items-center justify-center px-6 py-6">
            {hasPreview ? (
              <img
                src={state.previewUrl ?? ""}
                alt={`${title} 미리보기`}
                className="max-h-[300px] w-full rounded-lg object-contain"
                onError={() => {
                  setSubmitMessage(`${handName} 미리보기를 불러오지 못했습니다. JPG/PNG/WEBP 형식으로 다시 업로드해 주세요.`);
                }}
                style={{ border: "1px solid rgba(200,168,75,0.4)", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}
              />
            ) : (
              <div className="text-center text-[#c8a84b]">
                <p className="text-5xl opacity-60">🖐</p>
                <p className="mt-3 text-sm font-bold text-[#e8d090] md:text-base">{title} 이미지 미리보기</p>
                <p className="mt-1 text-xs text-[#c8a84b]/70 md:text-sm">업로드 후 이 영역에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 미등록일 때 '삭제'·'다시 선택'을 띄우면 눌러도 아무 일이 없는 죽은 버튼이 된다.
            상태에 따라 필요한 동작만 보여준다. */}
        <div className="cd-capture-actions mt-4">
          <label
            htmlFor={cameraInputId}
            className="cd-capture-cta cd-capture-actions__camera"
            aria-label={`${handName} ${hasPreview ? "다시 촬영" : "카메라 촬영"}`}
          >
            <span aria-hidden>📷</span> {hasPreview ? "다시 촬영" : "촬영하기"}
          </label>
          <label
            htmlFor={galleryInputId}
            className="cd-capture-cta cd-capture-actions__gallery"
            aria-label={`${handName} ${hasPreview ? "다른 사진 선택" : "앨범에서 사진 선택"}`}
          >
            <span aria-hidden>🖼️</span> {hasPreview ? "다른 사진 선택" : "앨범에서 선택"}
          </label>
        </div>

        {hasPreview ? (
          <button
            type="button"
            onClick={() => clearHandImage(side)}
            className="cd-red-btn mt-2 min-h-[44px] w-full rounded-lg border border-[#9b1a1a]/65 px-3 py-2 text-sm font-bold text-[#ffd8d8] transition"
            style={{ background: "linear-gradient(136deg, rgba(100,15,15,0.95), rgba(70,25,10,0.95))" }}
            aria-label={`${handName} 등록 사진 삭제`}
          >
            {handName} 사진 삭제
          </button>
        ) : null}

        <input
          id={galleryInputId}
          ref={uploadRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="sr-only"
          aria-label={`${handName} 앨범 파일 선택 입력`}
          onChange={(event) => {
            void handleFileChange(side, "gallery", event);
          }}
        />
        <input
          id={cameraInputId}
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={`${handName} 카메라 촬영 입력`}
          onChange={(event) => {
            void handleFileChange(side, "camera", event);
          }}
        />
      </section>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] text-[#f8edc8]">
      {/* 심홍색+금색 배경 분위기 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 75% 10%, rgba(180, 28, 28, 0.28), transparent 36%), radial-gradient(ellipse at 20% 85%, rgba(145, 20, 20, 0.22), transparent 40%), radial-gradient(ellipse at 50% 50%, rgba(8, 5, 2, 0.9), transparent 70%), linear-gradient(165deg, #030409 0%, #060c14 45%, #09040a 100%)",
        }}
      />
      {/* 비단 격자 — 조금 더 촘촘 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(212, 176, 92, 0.55) 0, rgba(212, 176, 92, 0.55) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(212, 176, 92, 0.35) 0, rgba(212, 176, 92, 0.35) 1px, transparent 1px, transparent 40px)",
        }}
      />
      {/* 사선 비단 문양 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(190, 24, 24, 0.5) 0, rgba(190, 24, 24, 0.5) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(-45deg, rgba(212, 176, 92, 0.4) 0, rgba(212, 176, 92, 0.4) 1px, transparent 1px, transparent 28px)",
        }}
      />
      {/* 별빛 점 장식 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 26%, rgba(255, 225, 140, 0.55) 0 1px, transparent 2px), radial-gradient(circle at 77% 31%, rgba(255, 225, 140, 0.42) 0 1px, transparent 2px), radial-gradient(circle at 52% 72%, rgba(255, 225, 140, 0.38) 0 1px, transparent 2px), radial-gradient(circle at 34% 58%, rgba(255, 225, 140, 0.32) 0 1px, transparent 2px), radial-gradient(circle at 88% 62%, rgba(255, 180, 140, 0.3) 0 1px, transparent 2px), radial-gradient(circle at 6% 48%, rgba(255, 200, 140, 0.28) 0 1px, transparent 2px)",
        }}
      />
      {/* 우상단 금빛 원형 후광 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(212,176,92,0.55) 0%, rgba(175,28,28,0.22) 45%, transparent 70%)",
          filter: "blur(12px)",
        }}
      />
      {/* 좌하단 홍색 후광 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(160,20,20,0.6) 0%, transparent 70%)",
          filter: "blur(18px)",
        }}
      />

      {isSubmitting ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#06060d]/92 px-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#c8a84b]/45 bg-[#0f0a12] p-6 text-center shadow-[0_14px_60px_rgba(0,0,0,0.55)]">
            <p className="text-2xl" aria-hidden>🖐</p>
            <p className="mt-2 text-sm font-bold tracking-[0.12em] text-[#f5d987]">손금 분석 진행 중</p>
            <p className="mt-4 text-base leading-7 text-[#f6e6c5]">{loadingPhaseText}</p>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#2b1b1b]" aria-hidden>
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#d4af37] to-[#b22222]" />
            </div>
          </div>
        </div>
      ) : null}

      <section className={`relative z-10 mx-auto flex min-h-screen w-full items-start pb-[calc(env(safe-area-inset-bottom)+20px)] ${
        isImmersiveView ? "max-w-none px-0 py-0" : "max-w-[1220px] px-3 py-4 md:px-6 md:py-6"
      } ${isImmersiveView ? "cd-immersive-shell" : ""}`}>
        <article
          aria-busy={isSubmitting}
          className={`cd-ink-card cd-hanji relative w-full overflow-hidden border-2 border-[#c8a84b]/55 bg-[linear-gradient(148deg,rgba(8,6,12,0.97),rgba(14,9,9,0.97)_50%,rgba(10,5,8,0.97)_100%)] shadow-[0_0_0_1px_rgba(180,130,40,0.2),0_32px_80px_rgba(0,0,0,0.75),inset_0_0_60px_rgba(140,20,20,0.08)] ${
            isImmersiveView ? "cd-immersive-card !rounded-none border-x-0 border-y-0 min-h-screen" : "rounded-[28px]"
          }`}
        >
          {isImmersiveView ? <div aria-hidden className="cd-immersive-aura pointer-events-none absolute inset-0" /> : null}
          {/* 카드 상단 금빛 장식선 */}
          <div aria-hidden className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, transparent, #c8a84b 20%, #f5d987 50%, #c8a84b 80%, transparent)" }} />

          <div className="relative border-b border-[#c8a84b]/25 px-5 py-8 md:px-10 md:py-12" style={{ background: "linear-gradient(180deg, rgba(120,15,15,0.18) 0%, transparent 60%)" }}>
            {/* 우상단 팔각 문양 */}
            <div
              aria-hidden
              className="cd-orbital-mark absolute right-6 top-6 h-20 w-20 opacity-30"
              style={{
                background: "conic-gradient(from 22.5deg, rgba(212,176,92,0.8) 0deg 45deg, transparent 45deg 90deg, rgba(212,176,92,0.8) 90deg 135deg, transparent 135deg 180deg, rgba(212,176,92,0.8) 180deg 225deg, transparent 225deg 270deg, rgba(212,176,92,0.8) 270deg 315deg, transparent 315deg 360deg)",
                clipPath: "circle(50%)",
              }}
            />
            <div
              aria-hidden
              className="absolute right-6 top-6 h-20 w-20 rounded-full opacity-20"
              style={{ border: "1.5px solid #d4b45c", boxShadow: "0 0 16px rgba(212,176,92,0.5)" }}
            />
            <button
              type="button"
              onClick={() => setIsImmersiveView((value) => !value)}
              aria-label={isImmersiveView ? "기본 화면으로 보기" : "전체화면으로 보기"}
              className="absolute left-4 top-4 rounded-lg border border-[#c8a84b]/35 bg-[#0d0808]/80 px-3 py-2 text-[11px] font-bold text-[#f5d987] transition hover:border-[#f5d987]/70 md:left-6 md:top-6"
            >
              {isImmersiveView ? "기본 화면" : "전체화면"}
            </button>

            <div className="flex items-center gap-3">
              <div aria-hidden className="h-px flex-1 opacity-50" style={{ background: "linear-gradient(90deg, transparent, #c8a84b)" }} />
              <span className="cd-badge inline-flex items-center rounded-sm border border-[#9b1a1a]/80 bg-[#5a0a0a]/80 px-4 py-1.5 text-[11px] font-bold tracking-[0.22em] text-[#ffc8c8]">
                掌 紋 運 命　PALM DESTINY
              </span>
              <div aria-hidden className="h-px flex-1 opacity-50" style={{ background: "linear-gradient(90deg, #c8a84b, transparent)" }} />
            </div>

            <h1
              className="cd-title mt-6 text-center text-5xl font-black leading-tight md:text-6xl"
              style={{
                fontFamily: "var(--font-display), 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
                background: "linear-gradient(175deg, #fff5d0 0%, #f5d987 35%, #c8a84b 65%, #8b6914 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
                filter: "drop-shadow(0 0 12px rgba(212,176,92,0.4))",
              }}
            >
              손금 지도
            </h1>
            <p className="mt-3 text-center text-sm font-semibold tracking-[0.22em] text-[#d4b45c] md:text-base cd-oriental-kicker">
              先天의 結 · 後天의 流
            </p>
            <div aria-hidden className="mx-auto mt-4 h-px max-w-xs" style={{ background: "linear-gradient(90deg, transparent, #c8a84b 30%, #f5d987 50%, #c8a84b 70%, transparent)" }} />
            <p className="mt-4 text-center text-base font-semibold text-[#eedad0] md:text-lg">
              손바닥에 새겨진 사랑 · 재물 · 직업 · 마음의 흐름을 읽다
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-7 text-[#f0e4cc]/85 md:text-base">
              손금은 수명이나 질병을 단정하는 도구가 아니라, 성향·관계·재물·직업 흐름을 상징적으로 읽는 지도입니다.
            </p>
            <p className="mx-auto mt-2 max-w-3xl text-center text-xs leading-6 text-[#e8d8b8]/75 md:text-sm">
              타고난 손과 살아온 손을 함께 읽습니다. 손바닥에는 본래의 기질과 지금의 발자취가 함께 새겨집니다.
            </p>
          </div>

          <div className="relative space-y-5 px-5 py-7 md:px-10 md:py-9">
            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(22,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
              <h2 className="text-base font-black text-[#f5d987] md:text-lg cd-oriental-headline">손바닥 촬영/업로드</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#f0dfc0]/90">손바닥이 화면 중앙에 오도록 촬영해 주세요. 밝은 곳에서 손 전체가 보이면 분석 정확도가 높아집니다.</p>

              {/* 한 손만으로도 분석된다는 사실을 명시한다.
                  종전에는 아래 '양손 비교 업로드(선택)' 제목으로만 암시돼, 양손을 다 올려야
                  하는 줄 알고 이탈하는 경로가 있었다. */}
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-[#c8a84b]/30 bg-[#0d0606]/70 px-3 py-2 text-xs leading-6 text-[#f0dfc0]/90 md:text-sm">
                <span className="font-black text-[#f5d987]">한 손만 등록해도 분석됩니다.</span>
                <span className="text-[#e8d8b0]/85">양손을 모두 등록하면 선천·후천을 비교한 해석이 더해집니다.</span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:w-fit">
                <button
                  type="button"
                  onClick={() => setSelectedCaptureSide("left")}
                  className={`cd-select-btn min-h-[46px] rounded-lg border px-3 py-2 text-sm font-bold ${
                    selectedCaptureSide === "left"
                      ? "border-[#f5d987]/80 bg-[#341111] text-[#fff5c8]"
                      : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                  }`}
                  aria-pressed={selectedCaptureSide === "left"}
                >
                  왼손 입력
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCaptureSide("right")}
                  className={`cd-select-btn min-h-[46px] rounded-lg border px-3 py-2 text-sm font-bold ${
                    selectedCaptureSide === "right"
                      ? "border-[#f5d987]/80 bg-[#341111] text-[#fff5c8]"
                      : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                  }`}
                  aria-pressed={selectedCaptureSide === "right"}
                >
                  오른손 입력
                </button>
              </div>

              {/* 순서·강조는 CSS 미디어쿼리가 정한다(터치=촬영 우선, 포인터=파일 선택 우선). */}
              <div className="cd-capture-actions mt-4">
                <label
                  htmlFor={getCameraInputId(selectedCaptureSide)}
                  className="cd-capture-cta cd-capture-actions__camera"
                  aria-label={palmDestinyText("palmDestiny.aria-label.001")}
                >
                  <span aria-hidden>📷</span> 손바닥 바로 촬영하기
                </label>
                <label
                  htmlFor={getGalleryInputId(selectedCaptureSide)}
                  className="cd-capture-cta cd-capture-actions__gallery"
                  aria-label={palmDestinyText("palmDestiny.aria-label.002")}
                >
                  <span aria-hidden>🖼️</span> 앨범에서 사진 선택하기
                </label>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#e8d8b0]/85">
                현재 선택 대상: <strong className="font-bold text-[#f5d987]">{selectedCaptureSide === "left" ? "왼손" : "오른손"}</strong>
              </p>

              <div className="mt-4 overflow-x-auto">
                <div className="inline-flex min-w-full items-center gap-2 rounded-lg border border-[#c8a84b]/25 bg-[#0d0606]/70 px-3 py-2 text-[11px] text-[#e8d8b0]/85 md:text-xs">
                  <span className={`rounded-full px-2 py-1 font-bold ${flowStep === "pick" ? "bg-[#5a1a00] text-[#ffe3a3]" : "bg-[#2a1f12] text-[#cfb67f]"}`}>1. 업로드</span>
                  <span>→</span>
                  <span className={`rounded-full px-2 py-1 font-bold ${flowStep === "preview" ? "bg-[#5a1a00] text-[#ffe3a3]" : "bg-[#2a1f12] text-[#cfb67f]"}`}>2. 미리보기/품질 안내</span>
                  <span>→</span>
                  <span className={`rounded-full px-2 py-1 font-bold ${flowStep === "analyzing" ? "bg-[#5a1a00] text-[#ffe3a3]" : "bg-[#2a1f12] text-[#cfb67f]"}`}>3. 분석</span>
                  <span>→</span>
                  <span className={`rounded-full px-2 py-1 font-bold ${flowStep === "result" ? "bg-[#5a1a00] text-[#ffe3a3]" : "bg-[#2a1f12] text-[#cfb67f]"}`}>4. 결과</span>
                </div>
              </div>

              {hasAnyPreview ? (
                <div className="mt-4 rounded-xl border border-[#c8a84b]/35 bg-[#0d0606]/80 p-3 md:p-4">
                  <p className="text-xs font-bold text-[#f5d987] md:text-sm">
                    {currentPreviewSide === "left" ? "왼손" : "오른손"} 미리보기
                  </p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-[#c8a84b]/30 bg-[#050304]">
                    {currentPreviewState.previewUrl ? (
                      <img
                        src={currentPreviewState.previewUrl}
                        alt={palmDestinyText("palmDestiny.alt.001")}
                        className="max-h-[340px] w-full object-contain"
                      />
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-xs leading-6 text-[#e8d8b0]/90 md:grid-cols-2 md:text-sm">
                    <p className="rounded-lg border border-[#c8a84b]/25 bg-[#0a0505]/70 px-3 py-2">손 전체가 보이나요?</p>
                    <p className="rounded-lg border border-[#c8a84b]/25 bg-[#0a0505]/70 px-3 py-2">손바닥 주름이 보이나요?</p>
                    <p className="rounded-lg border border-[#c8a84b]/25 bg-[#0a0505]/70 px-3 py-2">빛 반사가 심하지 않나요?</p>
                    <p className="rounded-lg border border-[#c8a84b]/25 bg-[#0a0505]/70 px-3 py-2">사진이 너무 흔들리지 않았나요?</p>
                  </div>

                  {currentQualityFeedback ? (
                    <div className="mt-3 rounded-lg border border-[#c8a84b]/30 bg-[#100707]/80 px-3 py-2">
                      <p className="text-xs font-bold text-[#f5d987] md:text-sm">{currentQualityFeedback.summary}</p>
                      {currentQualityFeedback.warnings.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs leading-6 text-[#ffd9c9] md:text-sm">
                          {currentQualityFeedback.warnings.map((warning) => (
                            <li key={warning}>• {warning}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-[#e8d8b0]/90 md:text-sm">품질 체크가 양호합니다. 이 사진으로 분석을 진행할 수 있습니다.</p>
                      )}

                      {/* 아래 CTA 가 비활성인 이유와 빠져나갈 길을 같은 자리에 둔다.
                          설명이 화면 아래쪽에만 있으면 비활성 버튼만 보고 이탈한다. */}
                      {isQualityBlocked ? (
                        <button
                          type="button"
                          onClick={() => setQualityOverride(true)}
                          className="cd-ghost-btn mt-3 min-h-[44px] w-full rounded-lg border border-[#c8a84b]/45 bg-[#0d0808] px-3 py-2 text-xs font-bold text-[#f0d9a2] md:text-sm"
                        >
                          이 사진 그대로 분석하기
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={handleStartAnalysis}
                      disabled={!canStartAnalysis}
                      className={`cd-main-cta min-h-[48px] rounded-lg border px-3 py-2 text-sm font-bold ${
                        canStartAnalysis
                          ? "border-[#d4af37]/70 bg-[linear-gradient(140deg,#8b0000_0%,#6b1a0a_35%,#5a1200_65%,#7a1800_100%)] text-[#fff8e0]"
                          : "cursor-not-allowed border-[#7a6020]/40 bg-[#2a2010] text-[#ccb67d]"
                      }`}
                    >
                      이 사진으로 분석하기
                    </button>
                    <label
                      htmlFor={getGalleryInputId(currentPreviewSide)}
                      className="cd-ghost-btn inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-sm font-bold text-[#e8d090]"
                    >
                      다른 사진 선택
                    </label>
                    <label
                      htmlFor={getCameraInputId(currentPreviewSide)}
                      className="cd-ghost-btn inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-lg border border-[#c8a84b]/40 bg-[#0e0608] px-3 py-2 text-sm font-bold text-[#e8d090]"
                    >
                      다시 촬영
                    </label>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/35 bg-[#0d0606]/70 p-4">
              <h3 className="text-sm font-black text-[#f5d987]">양손 비교 업로드(선택)</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-5">
                {renderHandUploader("left", leftHand, leftUploadInputRef, leftCameraInputRef, "왼손 이미지 업로드")}
                {renderHandUploader("right", rightHand, rightUploadInputRef, rightCameraInputRef, "오른손 이미지 업로드")}
              </div>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(20,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                <h2 className="text-base font-black text-[#f5d987] md:text-lg cd-oriental-headline">선천 · 후천 설명</h2>
              </div>
              <div className="mt-3 rounded-xl border border-[#9b1a1a]/60 bg-[#1e0808]/80 p-4 text-sm leading-7 text-[#ffe5c8]" style={{ boxShadow: "inset 0 0 20px rgba(100,10,10,0.3)" }}>
                <p>손금에서는 자주 쓰는 손을 <span className="font-bold text-[#f5d987]">후천적 손</span>, 자주 쓰지 않는 손을 <span className="font-bold text-[#f5d987]">선천적 손</span>으로 읽습니다.</p>
                <p className="mt-2">후천적 손은 현재의 성향과 삶의 흐름을, 선천적 손은 타고난 기질과 잠재력을 보여줍니다.</p>
                <p className="mt-2 font-semibold text-[#fde8c8]">선천의 결, 후천의 흐름을 함께 읽어 현실적인 방향을 제안합니다.</p>
              </div>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(18,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <fieldset>
                <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                  <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                  <legend className="text-base font-black text-[#f5d987] md:text-lg cd-oriental-headline">주로 쓰는 손 선택</legend>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DOMINANT_HAND_OPTIONS.map((option) => {
                    const active = dominantHand === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setDominantHand(option.value);
                          setSubmitMessage("");
                        }}
                        className={`cd-select-btn min-h-[48px] rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                          active
                            ? "cd-select-btn--active border-[#f5d987]/80 text-[#fff5c8]"
                            : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                        }`}
                        style={active ? { background: "linear-gradient(135deg, #5a1a00 0%, #3d1400 50%, #5a2800 100%)", boxShadow: "0 0 18px rgba(212,176,92,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                        aria-pressed={active}
                      >
                        <span className="block">{option.label}</span>
                        <span className="mt-0.5 block text-[11px] opacity-80">{DOMINANT_HAND_HINT_LABEL[option.value]}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-6 rounded-lg border border-[#b8871f]/25 bg-[#0d0808]/80 p-4">
                <p className="text-sm font-black text-[#f5d987] cd-oriental-kicker">
                  분석 목적은 전체 운세로 고정되어 있으며, 연애/재물/직업/성격/관계 카테고리를 한 번에 표시합니다.
                </p>
              </fieldset>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(18,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                <h2 className="text-base font-black text-[#f5d987] md:text-lg cd-oriental-headline">촬영 가이드</h2>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[#f0dfc0]/90">
                {SHOOTING_GUIDES.map((guide) => (
                  <li key={guide} className="flex items-start gap-3 rounded-lg border border-[#c8a84b]/20 bg-[#0d0606]/70 px-3 py-2">
                    <span className="mt-0.5 shrink-0 text-[10px] font-black text-[#d4b45c]">◆</span>
                    <span>{guide}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(20,8,8,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!canStartAnalysis}
                aria-disabled={!canStartAnalysis}
                className={`cd-main-cta inline-flex min-h-[56px] w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-black tracking-[0.08em] md:text-base ${
                  canStartAnalysis
                    ? "border-[#d4af37]/70 text-[#fff8e0]"
                    : "cursor-not-allowed border-[#7a6020]/40 text-[#c8b070] opacity-60"
                }`}
                style={canStartAnalysis ? {
                  background: "linear-gradient(140deg, #8b0000 0%, #6b1a0a 35%, #5a1200 65%, #7a1800 100%)",
                  boxShadow: "0 0 0 1px rgba(212,176,92,0.25), 0 12px 32px rgba(0,0,0,0.5), 0 0 24px rgba(139,0,0,0.4)",
                } : {
                  background: "linear-gradient(140deg, rgba(80,60,20,0.5), rgba(40,30,10,0.6))",
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="cd-spinner inline-block h-5 w-5 rounded-full border-2 border-[#f5d987]/30 border-t-[#f5d987]" />
                    손금 분석 진행 중...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span aria-hidden style={{ fontFamily: "serif" }}>☰</span>
                    손바닥 운명 지도 열기
                  </span>
                )}
              </button>

              {isQualityBlocked ? (
                <div
                  role="status"
                  className="mt-3 rounded-lg border border-[#9b1a1a]/60 bg-[#1e0808]/85 px-3 py-3"
                >
                  <p className="text-xs font-black text-[#ffd8d8] md:text-sm">
                    {lowQualitySides.map((side) => (side === "left" ? "왼손" : "오른손")).join("·")} 사진 품질이 낮게 측정됐습니다
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] leading-5 text-[#ffc8c8]/90 md:text-xs">
                    {Array.from(
                      new Set(lowQualitySides.flatMap((side) => qualityFeedbackBySide[side]?.warnings || [])),
                    )
                      .slice(0, 4)
                      .map((reason) => (
                        <li key={reason}>· {reason}</li>
                      ))}
                  </ul>
                  <p className="mt-2 text-[11px] leading-5 text-[#e8d8b0]/85 md:text-xs">
                    더 밝은 곳에서 손바닥 전체가 또렷하게 나오도록 다시 찍으면 해석이 훨씬 정확해집니다.
                  </p>
                  {/* 막다른 길 금지 — 사전점검은 휴리스틱이라 오탐이 난다.
                      사유를 본 뒤에는 사용자가 직접 진행을 선택할 수 있어야 한다. */}
                  <button
                    type="button"
                    onClick={() => setQualityOverride(true)}
                    className="cd-ghost-btn mt-3 min-h-[44px] w-full rounded-lg border border-[#c8a84b]/45 bg-[#0d0808] px-3 py-2 text-xs font-bold text-[#f0d9a2] md:text-sm"
                  >
                    이 사진 그대로 분석하기
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">
                  활성 조건: 왼손 또는 오른손 사진 1장 이상 + 주로 쓰는 손 선택
                </p>
              )}

              {(leftHand.file || rightHand.file) && dominantHand ? (
                <div className="mt-3 rounded-lg border border-[#c8a84b]/30 bg-[#0d0606]/70 px-3 py-2 text-xs text-[#e8d090]/90 md:text-sm">
                  <p>왼손 역할: <span className="font-bold text-[#f5d987]">{HAND_ROLE_META[handRoles.leftHandRole].label}</span></p>
                  <p className="mt-1">오른손 역할: <span className="font-bold text-[#f5d987]">{HAND_ROLE_META[handRoles.rightHandRole].label}</span></p>
                </div>
              ) : null}

              {submitMessage ? (
                <p role="alert" aria-live="polite" className="mt-3 rounded-lg border border-[#9b1a1a]/60 bg-[#1e0808]/80 px-3 py-2 text-xs leading-6 text-[#ffd8d8] md:text-sm">
                  {submitMessage}
                </p>
              ) : null}

              {isSubmitting ? (
                <div className="mt-3 rounded-lg border border-[#c8a84b]/30 bg-[#0d0606]/80 px-3 py-3 text-xs text-[#e8d090]/92 md:text-sm">
                  <p className="font-bold text-[#f5d987]">손바닥의 금빛 선을 읽고 있습니다...</p>
                  <p className="mt-1 text-[#e8d090]">{loadingPhaseText}</p>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handlePhotoReselect}
                  className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-sm font-bold text-[#e8d090]"
                >
                  사진 다시 선택
                </button>
                <button
                  type="button"
                  onClick={handleResetOnlyResult}
                  className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-sm font-bold text-[#e8d090]"
                >
                  다시 분석
                </button>
              </div>
            </section>

            {analysisResult ? (
              <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.98),rgba(20,8,8,0.97))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 40px rgba(120,15,15,0.14)" }}>
                <div className="mb-4 flex flex-col gap-3 border-b border-[#c8a84b]/25 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                      <h2 className="text-base font-black text-[#f5d987] md:text-lg cd-oriental-headline">손금 결과 오버레이</h2>
                    </div>
                    <p className="mt-1 text-xs text-[#d4b45c]/85">선천의 결, 후천의 흐름을 한 화면에서 비교합니다.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#c8a84b]/35 bg-[#0d0808]/80 px-2 py-1 text-[11px] font-bold text-[#e8d090]">
                      {hasCoordinatePaths ? "좌표 기반 + 일부 보정" : "상징적 안내 오버레이"}
                    </span>
                    <button
                      type="button"
                      onClick={handleRetryWithOtherHand}
                      className="cd-ghost-btn min-h-[40px] rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-xs font-bold text-[#e8d090]"
                    >
                      다른 손으로 다시 보기
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToMain}
                      className="cd-red-btn min-h-[40px] rounded-lg border border-[#9b1a1a]/70 px-3 py-2 text-xs font-bold text-[#ffd8d8]"
                      style={{ background: "linear-gradient(136deg, rgba(100,15,15,0.95), rgba(70,25,10,0.95))" }}
                    >
                      메인으로 돌아가기
                    </button>
                  </div>
                </div>

                <div className={`grid w-full max-w-full gap-4 overflow-hidden md:gap-6 ${
                  isImmersiveView ? "md:grid-cols-[minmax(360px,48vw)_1fr]" : "md:grid-cols-[minmax(300px,420px)_1fr]"
                }`}>
                  <aside className={`w-full overflow-hidden md:sticky md:self-start ${isImmersiveView ? "md:top-3" : "md:top-6"}`}>
                    {leftHand.previewUrl && rightHand.previewUrl ? (
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setOverlaySide("left")}
                          className={`cd-select-btn min-h-[44px] rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                            overlaySide === "left"
                              ? "border-[#f5d987]/70 text-[#fff5c8]"
                              : "border-[#c8a84b]/30 bg-[#0d0808] text-[#e8d090]"
                          }`}
                          style={overlaySide === "left" ? { background: "linear-gradient(135deg, #5a1a00 0%, #3d1400 50%, #5a2800 100%)", boxShadow: "0 0 18px rgba(212,176,92,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                        >
                          왼손 보기
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverlaySide("right")}
                          className={`cd-select-btn min-h-[44px] rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                            overlaySide === "right"
                              ? "border-[#f5d987]/70 text-[#fff5c8]"
                              : "border-[#c8a84b]/30 bg-[#0d0808] text-[#e8d090]"
                          }`}
                          style={overlaySide === "right" ? { background: "linear-gradient(135deg, #5a1a00 0%, #3d1400 50%, #5a2800 100%)", boxShadow: "0 0 18px rgba(212,176,92,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                        >
                          오른손 보기
                        </button>
                      </div>
                    ) : null}

                    <PalmLineOverlay
                      imageUrl={overlayImageUrl}
                      imageAlt={overlayImageAlt}
                      pathMap={activeOverlayPaths}
                      activeLine={activeCardKey in LINE_TO_CARD_KEY ? (activeCardKey as OverlayLineKey) : null}
                      immersive={isImmersiveView}
                      onSelectLine={handleOverlayLineSelect}
                    />
                  </aside>

                  <div className={`w-full max-w-full overflow-hidden ${isImmersiveView ? "space-y-5" : "space-y-4"}`}>
                    <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/85 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#c8a84b]/45 bg-[#1a1006] px-3 py-1 text-xs font-bold text-[#f5d987]">
                          {resultModeLabel(analysisResult.mode)}
                        </span>
                        <span className="rounded-full border border-[#c8a84b]/35 bg-[#120909] px-3 py-1 text-xs font-bold text-[#e8d090]">
                          {overlaySide === "left" ? "왼손" : "오른손"} · {HAND_ROLE_META[activeHandRole].label}
                        </span>
                        <span className="rounded-full border border-[#c8a84b]/35 bg-[#120909] px-3 py-1 text-xs font-bold text-[#e8d090]">
                          {resultPurposeLabel}
                        </span>
                      </div>

                      <div className="mt-3 border-b border-[#c8a84b]/18 pb-3">
                        <h3 className="text-base font-black leading-7 text-[#f5d987] md:text-lg cd-oriental-headline">
                          한눈에 보는 손금 리딩
                        </h3>
                        <p className="mt-2 text-sm font-semibold leading-7 text-[#ffe1d6] md:text-base">
                          {resultOneLiner}
                        </p>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-4">
                        <div className="rounded-lg border border-[#c8a84b]/20 bg-[#0d0606]/70 px-3 py-2">
                          <p className="text-[11px] font-black text-[#f5d987]/90 md:text-xs">읽힌 흐름</p>
                          <p className="mt-1 text-sm font-bold text-[#f7e5bd]">{readableSignalCount}개</p>
                        </div>
                        <div className="rounded-lg border border-[#c8a84b]/20 bg-[#0d0606]/70 px-3 py-2">
                          <p className="text-[11px] font-black text-[#f5d987]/90 md:text-xs">손 형태</p>
                          <p className="mt-1 text-xs leading-5 text-[#e8d8b0]/90 md:text-sm">
                            {activeHandReading?.handShape.labelKo || "복합형"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#c8a84b]/20 bg-[#0d0606]/70 px-3 py-2">
                          <p className="text-[11px] font-black text-[#f5d987]/90 md:text-xs">중심 포인트</p>
                          <p className="mt-1 text-xs leading-5 text-[#e8d8b0]/90 md:text-sm">{summarizeMountFocus(activeHandReading)}</p>
                        </div>
                        <div className="rounded-lg border border-[#4a7a30]/30 bg-[#091106]/70 px-3 py-2">
                          <p className="text-[11px] font-black text-[#9fe273] md:text-xs">오늘 행동</p>
                          <p className="mt-1 text-xs leading-5 text-[#e8d8b0]/90 md:text-sm">{resultPrimaryAction}</p>
                        </div>
                      </div>

                      {analysisResult.warnings.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-xs leading-6 text-[#ffd9c9] md:text-sm">
                          {analysisResult.warnings.map((warning) => (
                            <li key={`warn-${warning}`}>• {warning}</li>
                          ))}
                        </ul>
                      ) : null}

                      {detectedSpecialPatterns.length > 0 ? (
                        <section className="mt-3 rounded-lg border border-[#c8a84b]/30 bg-[#0d0606]/75 px-3 py-3">
                          <p className="text-xs font-black text-[#f5d987] md:text-sm">특수 손금 감지</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {detectedSpecialPatterns.map((pattern) => (
                              <span
                                key={`special-${pattern.code}`}
                                className="rounded-full border border-[#c8a84b]/45 bg-[#1a1006] px-3 py-1 text-[11px] font-bold text-[#f5d987]"
                              >
                                {pattern.label} ({Math.round(Number(pattern.confidence || 0) * 100)}%)
                              </span>
                            ))}
                          </div>
                          <ul className="mt-2 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                            {detectedSpecialPatterns.map((pattern) => (
                              <li key={`special-summary-${pattern.code}`}>• {pattern.summary}</li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      {analysisResult.missingData.length > 0 ? (
                        <div className="mt-3 rounded-lg border border-[#c8a84b]/20 bg-[#120909]/70 px-3 py-2">
                          <p className="text-xs font-bold text-[#f5d987] md:text-sm">사진 가이드</p>
                          <p className="mt-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                            손바닥 전체가 화면에 들어오고 그림자가 적으면 리딩이 훨씬 더 풍부해져요.
                          </p>
                        </div>
                      ) : null}
                    </section>

                    {analysisResult.canonical.validation.qualityWarning ? (
                      <div className="rounded-lg border border-[#b8860b]/60 bg-[#3a2800]/90 p-3 text-sm leading-6 text-[#ffd700] shadow-md">
                        ⚠️ {analysisResult.canonical.validation.qualityWarning}
                      </div>
                    ) : null}

                    {analysisResult.interpretation?.focusSummary ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 px-4 py-3">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base cd-oriental-headline">해석 중심</h3>
                        <p className="mt-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                          {analysisResult.interpretation.focusSummary}
                        </p>
                      </section>
                    ) : null}

                    {bothHandsComparison ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base cd-oriental-headline">선천 · 후천 비교 요약</h3>
                        <p className="mt-1 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">타고난 손과 살아온 손을 함께 읽습니다.</p>
                        <div className="mt-3 space-y-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.innateSummary}</p>
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.acquiredSummary}</p>
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.differenceSummary}</p>
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.growthSummary}</p>
                        </div>
                      </section>
                    ) : null}

                    {categoryConsultations.length > 0 ? (
                      <section className="space-y-3">
                        <div className="border-b border-[#c8a84b]/20 pb-2">
                          <h3 className="text-sm font-black text-[#f5d987] md:text-base cd-oriental-headline">카테고리 리포트 전체</h3>
                          <p className="mt-1 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">사랑, 재물, 직업, 성격, 관계의 흐름을 한 번에 펼쳐 읽습니다.</p>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {categoryConsultations.map((item) => (
                            <article key={`consult-${item.key}`} className="cd-oriental-card rounded-xl border border-[#c8a84b]/26 bg-[#0d0808]/82 p-4">
                              <h4 className="text-sm font-black text-[#f5d987] md:text-base cd-oriental-headline">{item.title}</h4>
                              <p className="mt-2 rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2 text-xs leading-6 text-[#e8d8b0]/92 md:text-sm">{item.summary}</p>

                              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                                <div>
                                  <p className="text-xs font-bold text-[#f5d987] md:text-sm">세부 흐름</p>
                                  <ul className="mt-1 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                                    {item.details.map((line) => (
                                      <li key={line}>• {line}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-[#8ade5f] md:text-sm">실천 제안</p>
                                  <ul className="mt-1 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                                    {item.actions.map((line) => (
                                      <li key={line}>• {line}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {analysisResult.report ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base cd-oriental-headline">🌙 한눈에 보는 손금 리딩</h3>
                        <div className="mt-3 grid gap-2 text-xs leading-6 text-[#e8d8b0]/90 md:grid-cols-2 md:text-sm">
                          {[
                            ["🌙 한 줄 요약", String(analysisResult.report.oneLiner || "이번 손금 흐름을 쉽고 재밌게 정리해 드렸어요.")],
                            ["🌟 전체 운세", String(analysisResult.report.summary || "지금은 내 리듬을 찾을수록 운이 안정되는 시기예요.")],
                            ["💗 연애운", String(analysisResult.report.love || "연애운은 솔직한 대화에서 더 좋아지는 흐름이에요.")],
                            ["💰 재물운", String(analysisResult.report.wealth || "재물운은 꾸준히 쌓을 때 더 잘 살아나요.")],
                            ["🧭 직업운", String(analysisResult.report.career || "직업운은 내 방식과 실력을 쌓을수록 강해져요.")],
                            ["✨ 성격/매력", String(analysisResult.report.personality || "묵직한 신뢰감이 당신의 매력 포인트예요.")],
                            ["🌱 건강/에너지", String(analysisResult.report.healthEnergy || "무리보다 리듬 관리가 운을 살려줘요.")],
                            ["🤝 관계운", String(analysisResult.report.relationship || "관계운은 편안한 소통에서 힘이 붙어요.")],
                            ["🔮 오늘의 조언", String(analysisResult.report.advice || "오늘은 미뤄둔 작은 일 하나를 끝내 보세요.")],
                          ].map(([label, text]) => (
                            <div key={`std-report-${label}`} className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/70 px-3 py-2">
                              <p className="text-xs font-black text-[#f5d987] md:text-sm">{label}</p>
                              <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{text}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section className="space-y-3 rounded-xl border border-[#f5d987]/30 bg-[linear-gradient(145deg,rgba(22,8,8,0.95),rgba(30,12,12,0.94))] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#c8a84b]/30 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-[#f5d987] md:text-base cd-oriental-headline">손금 전문가 심층 해석</h3>
                          <p className="mt-1 text-xs text-[#d4b45c]/85">판독 결과를 바탕으로 전문가가 항목별로 풀어 드립니다.</p>
                        </div>
                        <span className="rounded-full border border-[#f5d987]/45 bg-[#120909] px-2 py-1 text-[11px] font-bold text-[#f5d987]">포함</span>
                      </div>

                      {analysisResult.consultText ? (
                        <div className="rounded-lg border border-[#c8a84b]/35 bg-[#0d0606]/75 px-3 py-3">
                          <p className="whitespace-pre-wrap text-xs leading-7 text-[#e8d090] md:text-sm">
                            {analysisResult.consultText}
                          </p>
                        </div>
                      ) : (
                        <p className="rounded-lg border border-[#c8a84b]/30 bg-[#0d0606]/60 px-3 py-2 text-xs leading-6 text-[#d4b45c]/85">
                          이번 판독에서는 심층 해석문을 생성하지 못했습니다. 아래 항목별 리포트는 정상적으로 제공됩니다.
                        </p>
                      )}
                    </section>

                    <section className="space-y-4">
                      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                        {interpretationCards.map((card) => {
                          const active = activeCardKey === card.key;
                          return (
                            <button
                              key={`card-jump-${card.key}`}
                              type="button"
                              onClick={() => scrollToCard(card.key)}
                              className={`cd-select-btn min-h-[46px] shrink-0 rounded-lg border px-3 py-2 text-[12px] font-bold transition-all duration-200 ${
                                active
                                  ? "border-[#f5d987]/70 text-[#fff5c8]"
                                  : "border-[#c8a84b]/30 bg-[#0d0808] text-[#e8d090]"
                              }`}
                              style={active ? { background: "linear-gradient(135deg, #4d0f0f 0%, #370a0a 50%, #4d1f1f 100%)", boxShadow: "0 0 14px rgba(180,30,30,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                            >
                              {CARD_KEY_TO_LABEL[card.key]}
                            </button>
                          );
                        })}
                      </div>
                      {interpretationCards.map((card) => renderInterpretationCard(card))}
                    </section>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </article>
      </section>

      <style jsx global>{`
        .cd-immersive-shell {
          background:
            radial-gradient(1200px 500px at 8% -10%, rgba(180, 40, 30, 0.16), transparent 60%),
            radial-gradient(1000px 520px at 92% -6%, rgba(212, 176, 92, 0.16), transparent 62%),
            linear-gradient(180deg, rgba(4, 4, 8, 0.95), rgba(10, 6, 6, 0.96));
        }

        .cd-immersive-card {
          box-shadow:
            0 0 0 1px rgba(180, 130, 40, 0.28),
            0 38px 120px rgba(0, 0, 0, 0.78),
            inset 0 0 80px rgba(140, 20, 20, 0.16);
        }

        .cd-immersive-aura {
          background-image:
            radial-gradient(circle at 14% 18%, rgba(212, 176, 92, 0.12) 0 2px, transparent 3px),
            radial-gradient(circle at 82% 74%, rgba(212, 176, 92, 0.1) 0 1.8px, transparent 2.8px),
            radial-gradient(circle at 68% 22%, rgba(180, 34, 34, 0.1) 0 2.2px, transparent 3px),
            repeating-linear-gradient(90deg, rgba(212, 176, 92, 0.03) 0, rgba(212, 176, 92, 0.03) 1px, transparent 1px, transparent 28px);
          opacity: 0.85;
          animation: cdAuraDrift 16s ease-in-out infinite alternate;
        }

        @keyframes cdAuraDrift {
          from { transform: translate3d(0, 0, 0) scale(1); }
          to { transform: translate3d(0, -6px, 0) scale(1.012); }
        }

        .cd-orbital-mark {
          animation: cdOrbitalSpin 19s linear infinite;
          transform-origin: center;
        }

        @keyframes cdOrbitalSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ──────────── 동양 명품 카드 ──────────── */
        .cd-oriental-card {
          backdrop-filter: blur(4px);
          position: relative;
        }

        .cd-oriental-headline {
          font-family: var(--font-display), "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
          letter-spacing: 0.005em;
        }

        .cd-oriental-kicker,
        .cd-oriental-premium-btn {
          font-family: var(--font-premium), "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
        }

        @media (max-width: 767px) {
          .cd-oriental-card {
            backdrop-filter: none;
          }
        }

        /* 한지 질감 오버레이 */
        .cd-oriental-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background-image:
            radial-gradient(circle at 12% 20%, rgba(212, 176, 92, 0.09) 0 1px, transparent 2px),
            radial-gradient(circle at 78% 72%, rgba(212, 176, 92, 0.07) 0 1px, transparent 2px),
            repeating-linear-gradient(0deg, rgba(212, 176, 92, 0.025) 0, rgba(212, 176, 92, 0.025) 1px, transparent 1px, transparent 6px);
          opacity: 1;
        }

        /* 우상단 작은 금빛 도장 */
        .cd-oriental-card::after {
          content: "◈";
          position: absolute;
          right: 14px;
          top: 10px;
          font-size: 10px;
          color: rgba(200, 168, 75, 0.7);
          text-shadow: 0 0 6px rgba(200, 168, 75, 0.5);
          pointer-events: none;
          line-height: 1;
        }

        /* ──────────── 제목 금빛 광채 ──────────── */
        .cd-title {
          animation: cdTitleGlow 4s ease-in-out infinite alternate;
        }

        @keyframes cdTitleGlow {
          from { filter: drop-shadow(0 0 8px rgba(212, 176, 92, 0.3)); }
          to   { filter: drop-shadow(0 0 22px rgba(212, 176, 92, 0.6)); }
        }

        /* ──────────── 배지 ──────────── */
        .cd-badge {
          letter-spacing: 0.22em;
          position: relative;
        }

        /* ──────────── 선택 버튼 ──────────── */
        .cd-select-btn {
          transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
        }

        .cd-select-btn:hover {
          box-shadow: 0 0 16px rgba(200, 168, 75, 0.35);
          border-color: rgba(212, 176, 92, 0.65);
          transform: translateY(-1px);
        }

        .cd-select-btn--active {
          animation: cdSelectPulse 2.5s ease-in-out infinite alternate;
        }

        @keyframes cdSelectPulse {
          from { box-shadow: 0 0 14px rgba(200, 168, 75, 0.3), inset 0 -2px 0 rgba(245, 217, 135, 0.7); }
          to   { box-shadow: 0 0 26px rgba(200, 168, 75, 0.55), inset 0 -2px 0 rgba(245, 217, 135, 0.9); }
        }

        /* ──────────── 고스트 버튼 ──────────── */
        .cd-ghost-btn {
          transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .cd-ghost-btn:hover {
          box-shadow: 0 0 14px rgba(200, 168, 75, 0.28);
          border-color: rgba(212, 176, 92, 0.6);
          background: rgba(30, 15, 8, 0.9) !important;
          transform: translateY(-1px);
        }

        /* ──────────── 붉은 버튼 ──────────── */
        .cd-red-btn {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .cd-red-btn:hover {
          box-shadow: 0 0 18px rgba(155, 26, 26, 0.55);
          transform: translateY(-1px);
        }

        /* ──────────── 메인 CTA 버튼 ──────────── */
        .cd-main-cta {
          transition: box-shadow 0.28s ease, transform 0.28s ease;
          position: relative;
          overflow: hidden;
        }

        .cd-main-cta::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
          pointer-events: none;
        }

        .cd-main-cta:hover:not(:disabled) {
          box-shadow:
            0 0 0 1px rgba(212, 176, 92, 0.4),
            0 16px 36px rgba(0, 0, 0, 0.55),
            0 0 32px rgba(139, 0, 0, 0.5);
          transform: translateY(-2px);
        }

        .cd-main-cta:active:not(:disabled) {
          transform: translateY(0);
        }

        /* ──────────── 스피너 ──────────── */
        .cd-spinner {
          animation: cdSpin 0.9s linear infinite;
        }

        @keyframes cdSpin {
          to { transform: rotate(360deg); }
        }

        /* ──────────── 카드 페이드인 ──────────── */
        .cd-fade-in {
          animation: cdFadeIn 0.36s ease both;
        }

        @keyframes cdFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ──────────── 레거시 호환 ──────────── */
        .cd-ink-card { backdrop-filter: blur(2px); }
        .cd-gold-btn { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .cd-gold-btn:hover { box-shadow: 0 0 14px rgba(200,168,75,0.28); transform: translateY(-1px); }
        .cd-cta-btn { transition: box-shadow 0.24s ease, transform 0.24s ease; }
        .cd-cta-btn:hover:enabled { box-shadow: 0 0 16px rgba(212,176,92,0.32), 0 10px 24px rgba(0,0,0,0.28); transform: translateY(-1px); }
        .cd-soft-tab:hover { box-shadow: 0 0 10px rgba(200,168,75,0.22); }

        /* 촬영/앨범 버튼의 기기별 우선순위.
           JS 로 기기를 판별하면 SSR 과 클라이언트 첫 렌더가 어긋나(hydration mismatch)
           버튼이 한 번 튄다. 순서·강조를 CSS 미디어쿼리로만 처리해 그 문제를 피한다.
           너비가 아니라 포인터 종류로 가른다 — 좁은 데스크톱 창은 여전히 파일 선택이 맞다. */
        .cd-capture-actions { display: grid; gap: 12px; }
        @media (min-width: 640px) { .cd-capture-actions { grid-template-columns: 1fr 1fr; } }

        .cd-capture-cta {
          display: inline-flex;
          min-height: 52px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 12px;
          border: 1px solid rgba(200,168,75,0.45);
          background: #0d0808;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 900;
          color: #f0d9a2;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .cd-capture-cta:hover { box-shadow: 0 0 14px rgba(200,168,75,0.26); transform: translateY(-1px); }
        .cd-capture-cta:focus-visible { outline: 2px solid #f5d987; outline-offset: 2px; }

        /* 우선 수단은 실물 CTA 로, 보조 수단은 고스트로. */
        .cd-capture-cta--lead {
          border-color: rgba(212,175,55,0.7);
          background: linear-gradient(140deg, #8b0000 0%, #6b1a0a 35%, #5a1200 65%, #7a1800 100%);
          color: #fff8e0;
        }

        /* 터치 기기(휴대폰·태블릿): 촬영 우선 */
        @media (hover: none) and (pointer: coarse) {
          .cd-capture-actions__camera { order: 1; }
          .cd-capture-actions__gallery { order: 2; }
          .cd-capture-actions__camera.cd-capture-cta {
            border-color: rgba(212,175,55,0.7);
            background: linear-gradient(140deg, #8b0000 0%, #6b1a0a 35%, #5a1200 65%, #7a1800 100%);
            color: #fff8e0;
          }
        }
        /* 포인터 기기(데스크톱): 파일 선택 우선 — capture 속성이 파일 대화상자로 떨어지므로 */
        @media (hover: hover) and (pointer: fine) {
          .cd-capture-actions__gallery { order: 1; }
          .cd-capture-actions__camera { order: 2; }
          .cd-capture-actions__gallery.cd-capture-cta {
            border-color: rgba(212,175,55,0.7);
            background: linear-gradient(140deg, #8b0000 0%, #6b1a0a 35%, #5a1200 65%, #7a1800 100%);
            color: #fff8e0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cd-capture-cta { transition: none !important; transform: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cd-select-btn,
          .cd-ghost-btn,
          .cd-red-btn,
          .cd-main-cta,
          .cd-spinner,
          .cd-fade-in,
          .cd-title,
          .cd-select-btn--active,
          .cd-gold-btn,
          .cd-cta-btn,
          .cd-soft-tab {
            transition: none !important;
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}
