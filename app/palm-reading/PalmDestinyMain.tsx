"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDefaultCanonicalPalmReading,
  type PalmAnalysisPurpose,
  type PalmDominantHand,
  type PalmHandRole,
} from "@/types/palm-reading";
import PalmLineOverlay, {
  type OverlayLineKey,
  type OverlayPathMap,
} from "@/app/palm-reading/PalmLineOverlay";
import palmUiState from "@/lib/palm/palm-ui-state";
import { buildPalmInterpretationReport } from "@/lib/palm/interpretation-engine";
import { fetchBillingFeaturePricing, runBillingCoinGate } from "@/app/_lib/billing-client";

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
  focusSummary: string;
  cards: PalmInterpretationCard[];
};

type CategoryConsultation = {
  key: AnalysisPurpose;
  title: string;
  summary: string;
  details: string[];
  actions: string[];
  confidence: "높음" | "중간" | "보수";
};

type AnalysisResultState = {
  mode: "full" | "partial" | "fallback";
  qualityScore: number;
  missingData: string[];
  warnings: string[];
  report: Record<string, unknown> | null;
  canonical: ReturnType<typeof createDefaultCanonicalPalmReading>;
  interpretation: PalmInterpretationPayload | null;
  overlayPaths: OverlayPathMap;
  overlayPathsBySide: {
    left: OverlayPathMap | null;
    right: OverlayPathMap | null;
  };
  recognitionData: Record<string, unknown> | null;
  resultSections: Array<{ key: string; title: string; content: string }>;
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
  mapPalmAnalyzeError: (input: { status: number; code: string; message: string; reasonCode?: string }) => string;
  shouldShowPalmResult: (canonicalPalmReading: unknown) => boolean;
  revokeObjectUrls: (urls: Array<string | null | undefined>, revokeFn?: (url: string) => void) => number;
};

const HAND_ROLE_META: Record<HandRole, { label: string; description: string }> = {
  innate: {
    label: "선천적 손",
    description: "타고난 기질과 잠재력을 보여주는 손",
  },
  acquired: {
    label: "후천적 손",
    description: "현재의 성향과 살아온 흐름을 보여주는 손",
  },
  mixed: {
    label: "mixed",
    description: "선천성과 후천성이 함께 반영된 손",
  },
  unknown: {
    label: "미확정",
    description: "주로 쓰는 손 선택 후 판별됩니다.",
  },
};

const PURPOSE_OPTIONS: Array<{ value: AnalysisPurpose; label: string }> = [
  { value: "general", label: "전체 운세" },
  { value: "love", label: "연애운" },
  { value: "wealth", label: "재물운" },
  { value: "career", label: "직업운" },
  { value: "personality", label: "성격 분석" },
  { value: "relationship", label: "관계 패턴" },
];

const PALM_PURPOSE_COIN_LABEL: Record<AnalysisPurpose, string> = {
  general: "50코인",
  love: "30코인",
  wealth: "30코인",
  career: "30코인",
  personality: "30코인",
  relationship: "30코인",
};

const PALM_BILLING_SUB_FEATURE_BY_PURPOSE: Record<AnalysisPurpose, string> = {
  general: "general",
  love: "love",
  wealth: "wealth",
  career: "career",
  personality: "personality",
  relationship: "relationship",
};

const DOMINANT_HAND_OPTIONS: Array<{ value: DominantHand; label: string }> = [
  { value: "right", label: "오른손" },
  { value: "left", label: "왼손" },
  { value: "both", label: "양손" },
];

const DOMINANT_HAND_HINT_LABEL: Record<DominantHand, string> = {
  right: "오른손 중심 해석",
  left: "왼손 중심 해석",
  both: "양손 균형 해석",
};

const SHOOTING_GUIDES = [
  "손바닥 전체가 보이게 촬영해 주세요.",
  "손가락을 자연스럽게 펼쳐 주세요.",
  "그림자가 너무 진하지 않게 밝은 곳에서 촬영해 주세요.",
  "손바닥이 화면 중앙에 오도록 촬영해 주세요.",
  "손등이 아니라 손바닥을 촬영해 주세요.",
  "손금이 흐릿하면 다시 촬영해 주세요.",
];

const LOADING_PHASES = [
  "손바닥 윤곽을 확인하고 있습니다.",
  "생명선·감정선·지능선을 찾고 있습니다.",
  "손의 형태와 구丘 영역을 분석하고 있습니다.",
  "카테고리별 상담 결과를 정리하고 있습니다.",
];

const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2048;

const FILE_EXTENSION_PATTERN = /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/i;

const PALM_TERM_GLOSSARY: Array<{ term: string; description: string }> = [
  { term: "생명선", description: "엄지 아래를 감싸 내려가는 선으로, 수명 예언이 아니라 에너지 운용과 회복 리듬을 봅니다." },
  { term: "감정선", description: "손가락 아래 가로선으로, 감정 표현 습관과 관계에서의 반응 패턴을 읽습니다." },
  { term: "지능선", description: "손바닥 중앙 가로선으로, 사고 방식·집중 패턴·판단 스타일을 설명합니다." },
  { term: "운명선", description: "손바닥 중앙 세로 흐름으로, 직업 방향성·책임감·사회적 목표를 봅니다." },
  { term: "결혼선", description: "새끼손가락 아래 짧은 선으로, 관계의 횟수 단정이 아니라 친밀감과 약속 방식을 읽습니다." },
  { term: "재물선", description: "수성구 방향 선으로, 돈의 절대량 예언이 아니라 자원 관리 습관을 해석합니다." },
  { term: "태양선", description: "약지 아래 세로선으로, 인지도·표현력·성과 가시화 성향을 봅니다." },
  { term: "건강선", description: "수성선 계열 보조선으로, 생활 리듬과 피로 누적 신호를 보조적으로 확인합니다." },
  { term: "금성구丘", description: "엄지 뿌리 주변 영역으로, 애정 표현·체력·정서적 온기를 봅니다." },
  { term: "목성구丘", description: "검지 아래 영역으로, 리더십·성장 욕구·목표 지향성을 읽습니다." },
  { term: "토성구丘", description: "중지 아래 영역으로, 책임감·지속성·현실 감각을 봅니다." },
  { term: "태양구丘", description: "약지 아래 영역으로, 창의 표현·평판·성과 노출 성향을 읽습니다." },
  { term: "수성구丘", description: "새끼손가락 아래 영역으로, 소통·협상·사업 감각을 봅니다." },
  { term: "월구丘", description: "손바닥 바깥 아래 영역으로, 상상력·직관·감수성 흐름을 봅니다." },
  { term: "화성구丘", description: "손바닥 중앙/측면 보조 영역으로, 추진력·인내·갈등 대응을 읽습니다." },
  { term: "흙의 손", description: "손바닥이 넓고 단단한 경향으로, 실행력과 현실 기반 판단이 강한 유형입니다." },
  { term: "불의 손", description: "손바닥이 길고 손가락이 비교적 짧아, 직감과 추진이 빠른 유형입니다." },
  { term: "물의 손", description: "손바닥과 손가락이 길고 부드러워, 감수성과 분위기 인지가 좋은 유형입니다." },
  { term: "공기의 손", description: "손가락이 길고 관찰력이 살아 있어, 분석/소통 중심의 유형입니다." },
];

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
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = objectUrl;
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
    } catch {
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

    renderer.draw(ctx, nextWidth, nextHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.9);
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
        ? "분석 신뢰도 높음"
        : confidence === "보통"
        ? "분석 신뢰도 보통"
        : "분석 신뢰도 낮음: 사진이 어둡거나 손금이 흐려 일부 결과는 참고용입니다.";

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
  } catch {
    // fall back to metadata-based signature
  }
  return base;
}

const CARD_KEY_TO_LABEL: Record<PalmCardKey, string> = {
  lifeLine: "생명선",
  headLine: "두뇌선",
  heartLine: "감정선",
  fateLine: "운명선",
  sunLine: "태양선",
  moneyLine: "재물선",
  marriageLine: "결혼선",
  mounts: "손바닥 구丘",
};

const LINE_TO_CARD_KEY: Record<OverlayLineKey, PalmCardKey> = {
  lifeLine: "lifeLine",
  headLine: "headLine",
  heartLine: "heartLine",
  fateLine: "fateLine",
};

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

  return {
    generatedAt: String(rec.generatedAt || ""),
    analysisPurpose: (String(rec.analysisPurpose || "general") as AnalysisPurpose),
    tone: String(rec.tone || ""),
    focusSummary: String(rec.focusSummary || ""),
    cards,
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

function pickPathByAliases(source: Record<string, unknown>, aliases: string[]): string | null {
  for (const alias of aliases) {
    const val = readPathValue(source[alias]);
    if (val) return val;
  }
  return null;
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

function normalizeResultSections(payload: unknown): Array<{ key: string; title: string; content: string }> {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const key = String(row.key || "").trim();
      const title = String(row.title || "").trim();
      const content = String(row.content || "").trim();
      if (!key || !title || !content) return null;
      return { key, title, content };
    })
    .filter((x): x is { key: string; title: string; content: string } => Boolean(x));
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

function scoreToNarrative(score: number | null | undefined, label: string): string {
  if (!Number.isFinite(Number(score))) return `${label} 점수 근거는 아직 보수적으로 유지됩니다.`;
  const value = Number(score);
  if (value >= 78) return `${label} 지표(${value})가 높아 강점을 바로 활용하기 좋은 구간입니다.`;
  if (value >= 60) return `${label} 지표(${value})가 안정권이며 루틴 유지 시 상승 여지가 큽니다.`;
  if (value >= 45) return `${label} 지표(${value})가 전환 구간이라 작은 습관 조정이 중요합니다.`;
  return `${label} 지표(${value})가 낮게 관찰되어 보수적 접근과 점진적 보완이 필요합니다.`;
}

function buildInterpretationWithFallback(
  canonical: ReturnType<typeof createDefaultCanonicalPalmReading>,
  payload: unknown,
): PalmInterpretationPayload | null {
  const normalized = normalizeInterpretation(payload);
  if (normalized?.cards?.length) return normalized;
  return normalizeInterpretation(buildPalmInterpretationReport(canonical));
}

function buildCategoryConsultations(
  canonical: ReturnType<typeof createDefaultCanonicalPalmReading>,
): CategoryConsultation[] {
  const dominant = canonical.profile.dominantHand;
  const primaryReading =
    dominant === "left"
      ? canonical.leftHandReading || canonical.rightHandReading
      : dominant === "right"
      ? canonical.rightHandReading || canonical.leftHandReading
      : canonical.rightHandReading || canonical.leftHandReading;

  const scores = primaryReading?.scores || {
    love: null,
    career: null,
    wealth: null,
    vitality: null,
    creativity: null,
    communication: null,
  };

  const confidence: CategoryConsultation["confidence"] = canonical.validation.hasEnoughQuality
    ? "높음"
    : canonical.validation.hasMajorLines
    ? "중간"
    : "보수";

  const overallSummary =
    primaryReading?.overall.summary ||
    canonical.bothHandsComparison.growthSummary ||
    "손형·주요선·보조선 조합에서 읽힌 현재 습관 흐름을 중심으로 해석합니다.";

  const loveDetails = uniqText([
    canonical.bothHandsComparison.loveSummary,
    primaryReading?.majorLines.heartLine.summary,
    primaryReading?.minorLines.marriageLine.summary,
    scoreToNarrative(scores.love, "연애"),
  ]);

  const wealthDetails = uniqText([
    canonical.bothHandsComparison.wealthSummary,
    primaryReading?.minorLines.moneyLine.summary,
    primaryReading?.minorLines.sunLine.summary,
    scoreToNarrative(scores.wealth, "재물"),
  ]);

  const careerDetails = uniqText([
    canonical.bothHandsComparison.careerSummary,
    primaryReading?.majorLines.fateLine.summary,
    primaryReading?.majorLines.headLine.summary,
    scoreToNarrative(scores.career, "직업"),
  ]);

  const personalityDetails = uniqText([
    primaryReading?.handShape.summary,
    primaryReading?.majorLines.headLine.summary,
    primaryReading?.majorLines.heartLine.summary,
    scoreToNarrative(scores.creativity, "창의"),
    scoreToNarrative(scores.communication, "소통"),
  ]);

  const relationshipDetails = uniqText([
    canonical.bothHandsComparison.differenceSummary,
    canonical.bothHandsComparison.growthSummary,
    primaryReading?.majorLines.heartLine.advice,
    primaryReading?.minorLines.marriageLine.summary,
    scoreToNarrative(scores.communication, "관계 소통"),
  ]);

  const baseActions = uniqText([
    ...(primaryReading?.overall.recommendedActions || []),
    "오늘의 관찰 1줄과 손바닥 사진 1장을 같은 시간에 기록해 패턴을 누적하세요.",
    "선택 기준을 문장으로 먼저 고정한 뒤 행동하면 해석 정확도가 올라갑니다.",
  ], 4);

  return [
    {
      key: "general",
      title: "전체 운세",
      summary: overallSummary,
      details: uniqText([
        scoreToNarrative(scores.vitality, "에너지"),
        scoreToNarrative(scores.love, "연애"),
        scoreToNarrative(scores.career, "직업"),
        scoreToNarrative(scores.wealth, "재물"),
      ]),
      actions: baseActions,
      confidence,
    },
    {
      key: "love",
      title: "연애운",
      summary: loveDetails[0] || "감정선과 관계선을 중심으로 현재 연애 패턴을 읽었습니다.",
      details: loveDetails,
      actions: uniqText([
        primaryReading?.majorLines.heartLine.advice,
        "기대치를 추측하지 말고 요청 문장으로 전달해 오해를 줄이세요.",
        "관계 대화 직후 감정 온도를 3단계로 기록해 반복 패턴을 파악하세요.",
      ], 3),
      confidence,
    },
    {
      key: "wealth",
      title: "재물운",
      summary: wealthDetails[0] || "재물선과 수성구 신호를 기준으로 돈 흐름 습관을 해석했습니다.",
      details: wealthDetails,
      actions: uniqText([
        "지출을 필수/성장/위안 3분류로 나누어 기록하세요.",
        "결제 전 목적 문장 1개를 먼저 쓰면 충동 소비를 줄일 수 있습니다.",
        "소액이라도 주 1회 가치 창출 활동을 고정하세요.",
      ], 3),
      confidence,
    },
    {
      key: "career",
      title: "직업운",
      summary: careerDetails[0] || "운명선과 두뇌선 근거로 직업 방향성의 안정도를 읽었습니다.",
      details: careerDetails,
      actions: uniqText([
        primaryReading?.majorLines.fateLine.advice,
        "2주 단위 목표-실행-회고 루틴을 캘린더에 고정하세요.",
        "중요 과제는 시작 전 성공 기준 1문장을 먼저 정의하세요.",
      ], 3),
      confidence,
    },
    {
      key: "personality",
      title: "성격 분석",
      summary: personalityDetails[0] || "손형과 두뇌선·감정선 조합으로 기본 성향을 해석했습니다.",
      details: personalityDetails,
      actions: uniqText([
        "결정 직전 망설임 포인트를 하루 1회 기록해 자기 패턴을 선명하게 보세요.",
        "집중 블록과 휴식 블록을 번갈아 고정해 사고 피로를 줄이세요.",
        "감정이 큰 날에는 결정을 하루 미루고 기준 문장을 다시 확인하세요.",
      ], 3),
      confidence,
    },
    {
      key: "relationship",
      title: "관계 패턴",
      summary: relationshipDetails[0] || "감정선·결혼선·양손 비교를 바탕으로 관계 리듬을 정리했습니다.",
      details: relationshipDetails,
      actions: uniqText([
        "갈등 상황에서는 해석보다 확인 질문을 먼저 던지세요.",
        "관계에서 지키고 싶은 약속 1개를 문장으로 합의하세요.",
        "불편했던 장면을 주 3회 기록해 반복 트리거를 줄이세요.",
      ], 3),
      confidence,
    },
  ];
}

export default function PalmDestinyMain() {
  const router = useRouter();
  const [leftHand, setLeftHand] = useState<HandImageState>({ file: null, previewUrl: null });
  const [rightHand, setRightHand] = useState<HandImageState>({ file: null, previewUrl: null });
  const [dominantHand, setDominantHand] = useState<DominantHand | "">("");
  const [analysisPurpose, setAnalysisPurpose] = useState<AnalysisPurpose | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultState | null>(null);
  const [activeCardKey, setActiveCardKey] = useState<PalmCardKey>("lifeLine");
  const [overlaySide, setOverlaySide] = useState<HandSide>("right");
  const [activeConsultationKey, setActiveConsultationKey] = useState<AnalysisPurpose>("general");
  const [selectedCaptureSide, setSelectedCaptureSide] = useState<HandSide>("right");
  const [lastSelectedSide, setLastSelectedSide] = useState<HandSide>("right");
  const [qualityFeedbackBySide, setQualityFeedbackBySide] = useState<Record<HandSide, PalmImageQualityFeedback | null>>({
    left: null,
    right: null,
  });
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
  const canStartAnalysis = canStartPalmAnalysis({
    leftFile: leftHand.file,
    rightFile: rightHand.file,
    dominantHand,
    analysisPurpose,
    isSubmitting,
  });
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
  const mobileFocusedCard = interpretationCards.find((item) => item.key === activeCardKey) ?? interpretationCards[0] ?? null;
  const categoryConsultations = analysisResult ? buildCategoryConsultations(analysisResult.canonical) : [];
  const mobileFocusedConsultation =
    categoryConsultations.find((item) => item.key === activeConsultationKey) || categoryConsultations[0] || null;
  const bothHandsComparison = analysisResult?.canonical.bothHandsComparison;
  const recognitionPrimary = (analysisResult?.recognitionData?.primary as Record<string, unknown> | undefined) || null;
  const recognitionBySide = (analysisResult?.recognitionData?.bySide as Record<string, unknown> | undefined) || null;
  const activeRecognition =
    (recognitionBySide?.[overlaySide] as Record<string, unknown> | undefined) ||
    (recognitionBySide?.left as Record<string, unknown> | undefined) ||
    (recognitionBySide?.right as Record<string, unknown> | undefined) ||
    recognitionPrimary;

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
    setActiveConsultationKey("general");
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
      setLeftHand({ file: null, previewUrl: null });
      setRightHand({ file: null, previewUrl: null });
      setQualityFeedbackBySide({ left: null, right: null });
      setFileSignatureBySide({ left: null, right: null });
      setLastSelectedSide("right");
    }

    if (resetSelections) {
      setDominantHand("");
      setAnalysisPurpose("");
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
        }
      : {
          file: null,
          previewUrl: null,
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
      } catch {
        quality = null;
        if (!prepWarning) {
          prepWarning = "이 브라우저에서는 품질 사전점검이 제한되어 서버 분석 결과를 기준으로 안내합니다.";
        }
      }

      setQualityFeedbackBySide((prev) => ({
        ...prev,
        [side]: quality,
      }));

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
          : `이미지 로딩 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}. 다른 사진으로 다시 시도해 주세요.`,
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
    } catch {
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
    const requestSignature = [dominantHand || "none", analysisPurpose || "none", leftSig, rightSig].join("::");

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

    cancelInFlightRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setIsSubmitting(true);
      setAnalysisResult(null);
      setSubmitMessage("손바닥 이미지 품질을 확인하고 있습니다...");
      const leftPalmImage = leftHand.file ? await fileToDataUrl(leftHand.file) : null;
      const rightPalmImage = rightHand.file ? await fileToDataUrl(rightHand.file) : null;

      const requestBody = JSON.stringify({
        leftPalmImage,
        rightPalmImage,
        leftImageQuality: toApiImageQuality(qualityFeedbackBySide.left),
        rightImageQuality: toApiImageQuality(qualityFeedbackBySide.right),
        uploadedHandSide: leftHand.file && rightHand.file ? "both" : leftHand.file ? "left" : rightHand.file ? "right" : "",
        dominantHand,
        analysisPurpose,
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
        const message =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
            ? data.error
            : "분석 중 오류가 발생했습니다.";
        setSubmitMessage(mapPalmAnalyzeError({ status: response.status, code, reasonCode, message }));
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
      const purposeForCanonical: AnalysisPurpose =
        analysisPurposeFromPayload ?? ((analysisPurpose || "general") as AnalysisPurpose);

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
        purposeAnalysis: purposeAnalysisFromPayload,
      });

      const interpretation = buildInterpretationWithFallback(canonical, payloadRoot?.interpretation);
      const overlayPaths = extractOverlayPaths(payloadRoot?.overlayPaths ?? payloadRoot);
      const overlayPathsBySide = extractOverlayPathsBySide(payloadRoot);
      const recognitionData =
        payloadRoot?.recognitionData && typeof payloadRoot.recognitionData === "object"
          ? (payloadRoot.recognitionData as Record<string, unknown>)
          : null;
      const resultSections = normalizeResultSections(payloadRoot?.resultSections);
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
        setSubmitMessage("손바닥 전체가 화면에 들어오지 않았습니다. 손목부터 손가락 끝까지 보이게 다시 촬영해 주세요.");
        return;
      }

      const selectedPurpose = purposeForCanonical || "general";
      const subFeatureKey = PALM_BILLING_SUB_FEATURE_BY_PURPOSE[selectedPurpose] || "general";
      const pricingResult = await fetchBillingFeaturePricing({
        categoryKey: "palm-reading",
        subFeatureKey,
      });

      if (!pricingResult.ok || !pricingResult.data?.pricing) {
        const pricingCode = String(pricingResult.error?.code || "").toUpperCase();
        if (pricingCode === "PRICE_NOT_FOUND") {
          setSubmitMessage("손금 분석 가격표를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        setSubmitMessage(pricingResult.error?.message || "결제 가격표 조회에 실패했습니다.");
        return;
      }

      const serverCost = Number(pricingResult.data.pricing.cost || 0);
      setSubmitMessage(`결제를 확인 중입니다... (${serverCost}코인)`);

      const coinGateResult = await runBillingCoinGate({
        categoryKey: "palm-reading",
        subFeatureKey,
        requestId: `palm-reading:${subFeatureKey}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        forceDeduct: true,
      });

      if (!coinGateResult.ok) {
        const coinGateCode = String(coinGateResult.error?.code || "").toUpperCase();
        if (coinGateCode === "AUTH_REQUIRED") {
          setSubmitMessage("로그인이 필요합니다. 로그인 후 다시 손금 분석을 시도해 주세요.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }

        if (coinGateCode === "INSUFFICIENT_COINS") {
          setSubmitMessage(`코인이 부족합니다. ${serverCost}코인이 필요합니다.`);
          return;
        }

        if (coinGateCode === "PRICE_NOT_FOUND") {
          setSubmitMessage("손금 분석 가격표를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        setSubmitMessage(coinGateResult.error?.message || "코인 결제에 실패했습니다.");
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
      } catch {
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
        overlayPaths,
        overlayPathsBySide,
        recognitionData,
        resultSections,
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
      setActiveConsultationKey((analysisPurpose as AnalysisPurpose) || "general");
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        setSubmitMessage("요청이 취소되었습니다. 다시 분석을 시도해 주세요.");
        return;
      }

      if (error instanceof TypeError) {
        setSubmitMessage("네트워크/API 오류로 분석 요청에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return;
      }

      setSubmitMessage(`분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
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
      keepMessage: "다른 손 기준으로 다시 보기 위해 주로 쓰는 손과 목적을 다시 선택해 주세요.",
    });
  };

  const handleBackToMain = () => {
    resetSessionForReanalysis({ clearImages: true, resetSelections: true });
    router.push("/");
  };

  const handleResetOnlyResult = () => {
    resetSessionForReanalysis({
      clearImages: false,
      resetSelections: false,
      keepMessage: "이전 분석 결과를 초기화했습니다. 같은 입력으로 다시 분석할 수 있습니다.",
    });
  };

  const renderInterpretationCard = (card: PalmInterpretationCard, compactMobile = false) => {
    const cardId = `palm-card-${card.key}`;
    const active = activeCardKey === card.key;

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
          <h4 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>{card.title}</h4>
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

        <section className="mt-3">
          <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
            <span aria-hidden className="text-[8px]">◆</span>상세 해석
          </h5>
          <ul className="mt-2 space-y-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
            {card.details.slice(0, 8).map((line, index) => (
              <li key={`${card.key}-detail-${index}`} className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/65 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <section>
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px] text-green-400/70">◆</span>장점 3개
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
              <span aria-hidden className="text-[8px] text-red-400/70">◆</span>주의점 3개
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

        {compactMobile ? null : (
          <p className="mt-3 text-[11px] text-[#c8a84b]/55 md:text-xs">카드 키: {card.key}</p>
        )}
      </article>
    );
  };

  const renderHandUploader = (
    side: HandSide,
    state: HandImageState,
    uploadRef: React.RefObject<HTMLInputElement | null>,
    cameraRef: React.RefObject<HTMLInputElement | null>,
    title: string,
  ) => {
    const hasPreview = Boolean(state.previewUrl);
    const handName = side === "left" ? "왼손" : "오른손";
    const galleryInputId = getGalleryInputId(side);
    const cameraInputId = getCameraInputId(side);
    const role = side === "left" ? handRoles.leftHandRole : handRoles.rightHandRole;
    const roleMeta = HAND_ROLE_META[role];

    return (
      <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/45 bg-[linear-gradient(145deg,rgba(8,4,4,0.97),rgba(18,8,8,0.97))] p-4 md:p-5" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.14)" }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>{title}</h2>
          <span className="rounded-sm border border-[#9b1a1a]/75 bg-[#4a0808]/80 px-2 py-1 text-[11px] font-bold tracking-[0.1em] text-[#ffc8c8]">
            손바닥 입력
          </span>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#d8c090]/80 md:text-sm">
          손바닥이 선명하게 보이는 사진을 업로드하거나 촬영해 주세요.
        </p>

        {hasPreview ? (
          <div className="mt-3 rounded-lg border border-[#c8a84b]/35 bg-[#0d0606]/80 px-3 py-2">
            <p className="text-xs font-bold text-[#f5d987] md:text-sm">
              {handName} · {roleMeta.label}
            </p>
            <p className="mt-1 text-xs text-[#d8c090]/80">{roleMeta.description}</p>
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

        <div className="mt-4 grid grid-cols-2 gap-2 md:gap-3">
          <label
            htmlFor={galleryInputId}
            className="cd-ghost-btn inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-center text-sm font-bold text-[#e8d090] transition"
            aria-label={`${handName} 앨범에서 사진 선택`}
          >
            이미지 업로드
          </label>
          <label
            htmlFor={cameraInputId}
            className="cd-ghost-btn inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-[#c8a84b]/40 bg-[#0e0608] px-3 py-2 text-center text-sm font-bold text-[#e8d090] transition"
            aria-label={`${handName} 카메라 촬영`}
          >
            실시간 촬영
          </label>
          <button
            type="button"
            onClick={() => clearHandImage(side)}
            className="cd-red-btn min-h-[44px] rounded-lg border border-[#9b1a1a]/65 px-3 py-2 text-sm font-bold text-[#ffd8d8] transition"
            style={{ background: "linear-gradient(136deg, rgba(100,15,15,0.95), rgba(70,25,10,0.95))" }}
          >
            이미지 삭제
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#100a06] px-3 py-2 text-sm font-bold text-[#e8d090] transition"
          >
            다시 선택
          </button>
        </div>

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

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1220px] items-start px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+20px)] md:px-6 md:py-6">
        <article aria-busy={isSubmitting} className="cd-ink-card cd-hanji relative w-full overflow-hidden rounded-[28px] border-2 border-[#c8a84b]/55 bg-[linear-gradient(148deg,rgba(8,6,12,0.97),rgba(14,9,9,0.97)_50%,rgba(10,5,8,0.97)_100%)] shadow-[0_0_0_1px_rgba(180,130,40,0.2),0_32px_80px_rgba(0,0,0,0.75),inset_0_0_60px_rgba(140,20,20,0.08)]">
          {/* 카드 상단 금빛 장식선 */}
          <div aria-hidden className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, transparent, #c8a84b 20%, #f5d987 50%, #c8a84b 80%, transparent)" }} />

          <div className="relative border-b border-[#c8a84b]/25 px-5 py-8 md:px-10 md:py-12" style={{ background: "linear-gradient(180deg, rgba(120,15,15,0.18) 0%, transparent 60%)" }}>
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#c8a84b]/25 bg-[#0d0808]/70 p-3 md:flex-row md:items-center md:justify-between md:p-4">
              <button
                type="button"
                onClick={handleBackToMain}
                className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/45 bg-[#0b0606] px-3 py-2 text-sm font-bold text-[#f3dca0]"
                aria-label="메인으로 이동"
              >
                ← 메인으로
              </button>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#f5d987] md:text-base">🖐 손금 분석</p>
                <p className="mt-1 text-xs leading-6 text-[#e7d6b5]/85 md:text-sm">
                  손바닥의 주요 선과 형태를 바탕으로 성향·관계·재물·직업 흐름을 읽어드립니다.
                </p>
              </div>
            </div>

            {/* 우상단 팔각 문양 */}
            <div
              aria-hidden
              className="absolute right-6 top-6 h-20 w-20 opacity-30"
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
                fontFamily: "'Noto Serif KR', 'Nanum Myeongjo', serif",
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
            <p className="mt-3 text-center text-sm font-semibold tracking-[0.22em] text-[#d4b45c] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>
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
                <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>손바닥 촬영/업로드</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#f0dfc0]/90">손바닥이 화면 중앙에 오도록 촬영해 주세요. 밝은 곳에서 손 전체가 보이면 분석 정확도가 높아집니다.</p>

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

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  htmlFor={getCameraInputId(selectedCaptureSide)}
                  className="cd-main-cta inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl border border-[#d4af37]/70 bg-[linear-gradient(140deg,#8b0000_0%,#6b1a0a_35%,#5a1200_65%,#7a1800_100%)] px-4 py-3 text-sm font-black text-[#fff8e0]"
                  aria-label="손바닥 바로 촬영하기"
                >
                  📷 손바닥 바로 촬영하기
                </label>
                <label
                  htmlFor={getGalleryInputId(selectedCaptureSide)}
                  className="cd-ghost-btn inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl border border-[#c8a84b]/45 bg-[#0d0808] px-4 py-3 text-sm font-black text-[#f0d9a2]"
                  aria-label="앨범에서 사진 선택하기"
                >
                  🖼️ 앨범에서 사진 선택하기
                </label>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#e8d8b0]/80">
                현재 선택 대상: {selectedCaptureSide === "left" ? "왼손" : "오른손"}. 데스크톱에서는 두 버튼 모두 파일 선택 창으로 동작합니다.
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
                        alt="선택된 손바닥 미리보기"
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
                <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>선천 · 후천 설명</h2>
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
                  <legend className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>주로 쓰는 손 선택</legend>
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

              <fieldset className="mt-6">
                <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                  <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                  <legend className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>분석 목적 선택</legend>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PURPOSE_OPTIONS.map((option) => {
                    const active = analysisPurpose === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setAnalysisPurpose(option.value);
                          setSubmitMessage("");
                        }}
                        className={`cd-select-btn min-h-[48px] rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                          active
                            ? "cd-select-btn--active border-[#f5d987]/80 text-[#fff5c8]"
                            : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                        }`}
                        style={active ? { background: "linear-gradient(135deg, #4d0f0f 0%, #370a0a 50%, #4d1f1f 100%)", boxShadow: "0 0 18px rgba(180,30,30,0.4), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(18,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>촬영 가이드</h2>
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

              <p className="mt-3 text-xs leading-6 text-[#d4b45c]/75 md:text-sm">
                활성 조건: 왼손 또는 오른손 이미지 1개 이상 + 주로 쓰는 손 선택 + 분석 목적 선택
              </p>

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
                      <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>손금 결과 오버레이</h2>
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

                <div className="grid w-full max-w-full gap-4 overflow-hidden md:grid-cols-[minmax(300px,420px)_1fr] md:gap-6">
                  <aside className="w-full overflow-hidden md:sticky md:top-6 md:self-start">
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
                      onSelectLine={handleOverlayLineSelect}
                    />
                  </aside>

                  <div className="w-full max-w-full space-y-4 overflow-hidden">
                    <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/85 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#c8a84b]/45 bg-[#1a1006] px-3 py-1 text-xs font-bold text-[#f5d987]">
                          분석 모드: {analysisResult.mode === "full" ? "정밀" : analysisResult.mode === "partial" ? "부분" : "기본"}
                        </span>
                        <span className="rounded-full border border-[#c8a84b]/30 bg-[#0d0606] px-3 py-1 text-xs font-bold text-[#e8d090]">
                          품질 점수: {(analysisResult.qualityScore * 100).toFixed(0)}점
                        </span>
                        {analysisResult.mode !== "full" ? (
                          <span className="rounded-full border border-[#b8860b]/55 bg-[#3a2800]/80 px-3 py-1 text-xs font-bold text-[#ffd98a]">
                            부분 분석 모드
                          </span>
                        ) : null}
                      </div>

                      {analysisResult.warnings.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-xs leading-6 text-[#ffd9c9] md:text-sm">
                          {analysisResult.warnings.map((warning) => (
                            <li key={`warn-${warning}`}>• {warning}</li>
                          ))}
                        </ul>
                      ) : null}

                      {analysisResult.missingData.length > 0 ? (
                        <div className="mt-3 rounded-lg border border-[#c8a84b]/20 bg-[#120909]/70 px-3 py-2">
                          <p className="text-xs font-bold text-[#f5d987] md:text-sm">판독 보류 항목</p>
                          <p className="mt-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                            {analysisResult.missingData.join(", ")} (이미지 선명도 부족으로 판독 보류)
                          </p>
                        </div>
                      ) : null}
                    </section>

                    {analysisResult.canonical.validation.qualityWarning ? (
                      <div className="rounded-lg border border-[#b8860b]/60 bg-[#3a2800]/90 p-3 text-sm leading-6 text-[#ffd700] shadow-md">
                        ⚠️ {analysisResult.canonical.validation.qualityWarning}
                      </div>
                    ) : null}

                    {analysisResult.canonical.purposeAnalysis ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/60 bg-[linear-gradient(145deg,rgba(15,8,8,0.98),rgba(25,10,10,0.97))] p-4 md:p-6 shadow-lg">
                        <div className="flex items-center gap-3 border-b border-[#c8a84b]/30 pb-4">
                          <div aria-hidden className="h-6 w-1.5 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                          <h2 className="text-lg font-black text-[#f5d987] md:text-xl" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                            {PURPOSE_OPTIONS.find(o => o.value === analysisPurpose)?.label || "선택된 목적"} 맞춤 정밀 분석
                          </h2>
                        </div>
                        
                        <div className="mt-5 space-y-6">
                          <div className="rounded-lg border border-[#c8a84b]/20 bg-[#0d0606]/80 p-4">
                            <h3 className="text-sm font-bold text-[#d4b45c]">핵심 요약</h3>
                            <p className="mt-2 text-sm leading-7 text-[#e8d8b0]/90">{analysisResult.canonical.purposeAnalysis.summary}</p>
                          </div>
                          
                          <div className="space-y-4">
                            {analysisResult.canonical.purposeAnalysis.sections?.map((sec: { title?: string; content?: string }, i: number) => (
                              <div key={`pa-sec-${i}`} className="overflow-hidden rounded-xl border border-[#c8a84b]/30 bg-[linear-gradient(180deg,rgba(20,8,8,0.9),rgba(13,6,6,0.95))] shadow-md">
                                <div className="border-b border-[#c8a84b]/20 bg-[#1a0a0a]/90 px-4 py-3">
                                  <h3 className="text-[15px] font-bold tracking-wide text-[#f5d987] md:text-base">{sec.title}</h3>
                                </div>
                                <div className="p-4 md:p-5">
                                  <p className="whitespace-pre-wrap text-[14px] leading-[1.8] text-[#e8d8b0]/95 md:text-[15px]">{sec.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-[#c8a84b]/20 bg-[#0d0606]/80 p-4">
                              <h3 className="text-sm font-bold text-[#f5d987]">손금 데이터 근거</h3>
                              <ul className="mt-2 space-y-2">
                                {analysisResult.canonical.purposeAnalysis.evidence?.map((ev: { label?: string; text?: string }, i: number) => (
                                  <li key={`ev-${i}`} className="text-sm leading-6 text-[#e8d8b0]/90">
                                    <span className="font-bold text-[#d4b45c]">[{ev.label}]</span> {ev.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="rounded-lg border border-[#8b1a1a]/35 bg-[#140808]/60 p-4">
                              <h3 className="text-sm font-bold text-[#ff7b7b]">주의할 점</h3>
                              <ul className="mt-2 space-y-2">
                                {analysisResult.canonical.purposeAnalysis.cautions?.map((c: string, i: number) => (
                                  <li key={`cau-${i}`} className="text-sm leading-6 text-[#e8d8b0]/90 list-disc ml-4">{c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-xl border border-[#c8a84b]/30 bg-[#0d0606]/80">
                            <div className="border-b border-[#c8a84b]/20 bg-[#1a0a0a]/90 px-4 py-3">
                              <h3 className="text-[15px] font-bold text-[#d4b45c]">종합 상세 해석</h3>
                            </div>
                            <div className="p-4 md:p-5">
                              <p className="whitespace-pre-wrap text-[14px] leading-[1.8] text-[#e8d8b0]/95 md:text-[15px]">{analysisResult.canonical.purposeAnalysis.details}</p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-[#4a7a30]/30 bg-[linear-gradient(145deg,rgba(10,18,6,0.9),rgba(15,25,10,0.8))] p-4 shadow-md md:p-5">
                            <h3 className="text-sm font-bold text-[#8ade5f]">앞으로의 활용법 & 실천 가이드</h3>
                            <div className="mt-3 space-y-3">
                              {analysisResult.canonical.purposeAnalysis.actions?.map((act: string, i: number) => (
                                <div key={`act-${i}`} className="flex gap-3">
                                  <span className="text-[#8ade5f]">◆</span>
                                  <p className="text-sm leading-7 text-[#e8d8b0]/90">{act}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {analysisResult.interpretation?.focusSummary ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 px-4 py-3">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>해석 중심</h3>
                        <p className="mt-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                          {analysisResult.interpretation.focusSummary}
                        </p>
                      </section>
                    ) : null}

                    {bothHandsComparison ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>선천 · 후천 비교 요약</h3>
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
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>카테고리 리포트 탭</h3>
                        <div className="mt-3 overflow-x-auto">
                          <div className="inline-flex min-w-full gap-2 pb-1">
                            {categoryConsultations.map((item) => {
                              const active = activeConsultationKey === item.key;
                              return (
                                <button
                                  key={`consult-${item.key}`}
                                  type="button"
                                  onClick={() => setActiveConsultationKey(item.key)}
                                  className={`cd-select-btn min-h-[46px] shrink-0 rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                                    active
                                      ? "border-[#f5d987]/80 bg-[#401515] text-[#fff5c8]"
                                      : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                                  }`}
                                  aria-pressed={active}
                                >
                                  {item.title}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => setActiveConsultationKey("general")}
                              className={`cd-select-btn min-h-[46px] shrink-0 rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                                activeConsultationKey === "general"
                                  ? "border-[#f5d987]/80 bg-[#401515] text-[#fff5c8]"
                                  : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                              }`}
                            >
                              손금 근거
                            </button>
                          </div>
                        </div>

                        {mobileFocusedConsultation ? (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/70 px-3 py-2">
                              <p className="text-xs font-bold text-[#f5d987] md:text-sm">요약</p>
                              <p className="mt-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{mobileFocusedConsultation.summary}</p>
                            </div>
                            <div className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/70 px-3 py-2">
                              <p className="text-xs font-bold text-[#f5d987] md:text-sm">분석 신뢰도: {mobileFocusedConsultation.confidence}</p>
                              <ul className="mt-1 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                                {mobileFocusedConsultation.details.map((line) => (
                                  <li key={line}>• {line}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-[#4a7a30]/35 bg-[#091106]/70 px-3 py-2">
                              <p className="text-xs font-bold text-[#8ade5f] md:text-sm">실천 제안</p>
                              <ul className="mt-1 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                                {mobileFocusedConsultation.actions.map((line) => (
                                  <li key={line}>• {line}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : null}
                      </section>
                    ) : null}

                    {analysisResult.report ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>표준 리포트 요약</h3>
                        <div className="mt-3 grid gap-2 text-xs leading-6 text-[#e8d8b0]/90 md:grid-cols-2 md:text-sm">
                          {[
                            ["전체 운세", String(analysisResult.report.summary || "이미지 선명도 부족으로 판독 보류")],
                            ["성격 분석", String(analysisResult.report.personality || "이미지 선명도 부족으로 판독 보류")],
                            ["연애운", String(analysisResult.report.love || "이미지 선명도 부족으로 판독 보류")],
                            ["재물운", String(analysisResult.report.wealth || "이미지 선명도 부족으로 판독 보류")],
                            ["직업운", String(analysisResult.report.career || "이미지 선명도 부족으로 판독 보류")],
                            ["인간관계", String(analysisResult.report.relationship || "이미지 선명도 부족으로 판독 보류")],
                            ["건강/에너지 경향", String(analysisResult.report.healthEnergy || "이미지 선명도 부족으로 판독 보류")],
                            ["현재 시기 조언", String(analysisResult.report.advice || "더 선명한 사진을 올리면 세부 정확도가 올라갑니다.")],
                            ["주의할 점", String(analysisResult.report.warnings || "이미지 선명도 부족으로 일부 항목은 추정 기반입니다.")],
                          ].map(([label, text]) => (
                            <div key={`std-report-${label}`} className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/70 px-3 py-2">
                              <p className="text-xs font-black text-[#f5d987] md:text-sm">{label}</p>
                              <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{text}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                      <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>손금 용어 설명</h3>
                      <div className="mt-3 space-y-2">
                        {PALM_TERM_GLOSSARY.map((item) => (
                          <details key={item.term} className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/75 px-3 py-2">
                            <summary className="cursor-pointer text-xs font-black text-[#f5d987] md:text-sm">{item.term}</summary>
                            <p className="mt-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{item.description}</p>
                          </details>
                        ))}
                      </div>
                    </section>

                    {analysisResult.resultSections.length > 0 ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>해석 섹션 아코디언</h3>
                        <p className="mt-1 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">카드/탭과 별개로 전체 14개 구조 리딩을 접기/펼치기로 확인할 수 있습니다.</p>
                        <div className="mt-3 space-y-2">
                          {analysisResult.resultSections.map((section) => (
                            <details
                              key={`section-${section.key}`}
                              className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/75 px-3 py-2"
                            >
                              <summary className="cursor-pointer text-xs font-black text-[#f5d987] md:text-sm">{section.title}</summary>
                              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{section.content}</p>
                            </details>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {activeRecognition ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/85 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>실제 인식 데이터 보기</h3>
                        <p className="mt-1 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">감지된 값만 보여주며, 미감지 항목은 감지되지 않음/unknown으로 유지합니다.</p>

                        <div className="mt-3 grid gap-2 text-xs leading-6 text-[#e8d8b0]/90 md:grid-cols-2 md:text-sm">
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">손바닥 감지 여부: {String(activeRecognition.palmDetected ?? false)}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">왼손/오른손 판별: {String(activeRecognition.handSide ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">선천적/후천적 손 여부: {String(activeRecognition.handRoleLabel ?? "미확정")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">이미지 밝기: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.brightness ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">이미지 선명도: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.sharpness ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">손바닥 점유율: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.palmCoverage ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">손형 판별값: {String((activeRecognition.handShape as Record<string, unknown> | undefined)?.type ?? "unknown")} / palmRatio={String((activeRecognition.handShape as Record<string, unknown> | undefined)?.palmRatio ?? "unknown")} / fingerRatio={String((activeRecognition.handShape as Record<string, unknown> | undefined)?.fingerRatio ?? "unknown")}</p>
                        </div>

                        <div className="mt-3 space-y-2">
                          {[
                            ["생명선", "lifeLine"],
                            ["두뇌선", "headLine"],
                            ["감정선", "heartLine"],
                            ["운명선", "fateLine"],
                            ["태양선", "sunLine"],
                            ["재물선", "moneyLine"],
                            ["결혼선", "marriageLine"],
                            ["소통선", "communicationLine"],
                          ].map(([label, key]) => {
                            const line = ((activeRecognition.lines as Record<string, unknown> | undefined)?.[key] || {}) as Record<string, unknown>;
                            const path = Array.isArray(line.path) ? (line.path as Array<unknown>) : [];
                            return (
                              <details key={`line-${key}`} className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/75 px-3 py-2">
                                <summary className="cursor-pointer text-xs font-black text-[#f5d987] md:text-sm">{label} 측정값</summary>
                                <div className="mt-2 grid gap-1 text-xs leading-6 text-[#e8d8b0]/90 md:grid-cols-2 md:text-sm">
                                  <p>감지 상태: {String(line.detected ?? false)}</p>
                                  <p>신뢰도: {String(line.confidence ?? "unknown")}</p>
                                  <p>normalizedLength: {String(line.normalizedLength ?? 0)}</p>
                                  <p>길이: {String(line.lengthLabel ?? "unknown")}</p>
                                  <p>depthScore: {String(line.depthScore ?? 0)}</p>
                                  <p>선명도: {String(line.depthLabel ?? "unknown")}</p>
                                  <p>curvatureScore: {String(line.curvatureScore ?? 0)}</p>
                                  <p>곡률: {String(line.curvatureLabel ?? "unknown")}</p>
                                  <p>끊김: {String(line.breaks ?? 0)}</p>
                                  <p>분기: {String(line.branches ?? 0)}</p>
                                  <p>시작 영역: {String(line.startZone ?? "unknown")}</p>
                                  <p>끝 영역: {String(line.endZone ?? "unknown")}</p>
                                  <p>variant: {String(line.variant ?? "unknown")}</p>
                                </div>
                                <details className="mt-2 rounded-md border border-[#c8a84b]/18 bg-[#0d0606]/60 px-2 py-1">
                                  <summary className="cursor-pointer text-[11px] font-bold text-[#d4b45c] md:text-xs">path 좌표 접기/펼치기</summary>
                                  <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-all text-[10px] text-[#d8c89a]/85 md:text-[11px]">
                                    {path.length > 0 ? JSON.stringify(path, null, 2) : "[]"}
                                  </pre>
                                </details>
                              </details>
                            );
                          })}
                        </div>

                        <details className="mt-3 rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/75 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-black text-[#f5d987] md:text-sm">구丘 분석값</summary>
                          <div className="mt-2 grid gap-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                            {[
                              ["금성구", "venus"],
                              ["월구", "moon"],
                              ["목성구", "jupiter"],
                              ["토성구", "saturn"],
                              ["태양구", "sun"],
                              ["수성구", "mercury"],
                              ["화성구", "mars"],
                            ].map(([label, key]) => {
                              const mount = ((activeRecognition.mounts as Record<string, unknown> | undefined)?.[key] || {}) as Record<string, unknown>;
                              return (
                                <p key={`mount-${key}`}>
                                  {label}: fullness={String(mount.fullness ?? "unknown")}, confidence={String(mount.confidence ?? "low")} - {String(mount.summary ?? "보수적 해석")}
                                </p>
                              );
                            })}
                          </div>
                        </details>
                      </section>
                    ) : null}

                    <section className="md:hidden">
                      <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto pb-1">
                        {interpretationCards.map((card) => {
                          const active = activeCardKey === card.key;
                          return (
                            <button
                              key={`mobile-tab-${card.key}`}
                              type="button"
                              onClick={() => setActiveCardKey(card.key)}
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
                      {mobileFocusedCard ? renderInterpretationCard(mobileFocusedCard, true) : null}
                    </section>

                    <section className="hidden space-y-4 md:block">
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
        /* ──────────── 동양 명품 카드 ──────────── */
        .cd-oriental-card {
          backdrop-filter: blur(4px);
          position: relative;
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
