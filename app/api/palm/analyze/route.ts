import { NextRequest, NextResponse } from "next/server";
import {
  createDefaultCanonicalPalmReading,
  type CanonicalPalmReading,
  type PalmAnalysisPurpose,
  type PalmDominantHand,
  type PalmHandReading,
} from "@/types/palm-reading";
import { buildPalmInterpretationReport } from "@/lib/palm/interpretation-engine";
import { buildBothHandsComparison } from "@/lib/palm/both-hands-comparison";
import { requireRouteAuth } from "@/app/_lib/route-auth";
import palmMapEngine from "@/lib/palm/palm-map-engine.js";
import fs from "fs";

const { analyzePalmHandInput } = (palmMapEngine as {
  analyzePalmHandInput?: (input: Record<string, unknown>) => unknown;
}) || {};

const GEMINI_VISION_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MIN_IMAGE_BYTES = 8 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "image/heic",
  "image/heif",
  "application/octet-stream",
]);

function pickVisionKey(): string {
  const keys = [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (!keys.length) return "";
  return keys[Math.floor(Math.random() * keys.length)];
}

function dataUrlToBase64(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function estimateBase64Size(base64Data: string): number {
  const trimmed = String(base64Data || "").replace(/\s+/g, "");
  if (!trimmed) return 0;
  const padding = trimmed.endsWith("==") ? 2 : trimmed.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((trimmed.length * 3) / 4) - padding);
}

function parseDataUrlMeta(dataUrl: string): { mimeType: string; base64Data: string; sizeBytes: number } | null {
  const info = dataUrlToBase64(dataUrl);
  if (!info) return null;
  return {
    mimeType: String(info.mimeType || "").toLowerCase(),
    base64Data: info.data,
    sizeBytes: estimateBase64Size(info.data),
  };
}

function isAllowedImageMime(mimeType: string): boolean {
  const normalized = String(mimeType || "").toLowerCase();
  return normalized.startsWith("image/") || ALLOWED_IMAGE_MIME.has(normalized);
}

type NormalizedImageInput = {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  source: "dataUrl" | "file" | "json";
};

type ImageValidationError = {
  status: number;
  code: string;
  reasonCode: string;
  message: string;
  debug?: Record<string, unknown>;
};

function createImageValidationError(error: ImageValidationError): ImageValidationError {
  return error;
}

function isImageValidationError(value: unknown): value is ImageValidationError {
  return Boolean(
    value &&
      typeof value === "object" &&
      Number.isFinite(Number((value as ImageValidationError).status)) &&
      typeof (value as ImageValidationError).code === "string",
  );
}

async function normalizeImageInput(
  raw: RawImageInput,
  label: "left" | "right",
): Promise<NormalizedImageInput | null> {
  if (raw == null) return null;

  if (typeof raw === "string") {
    const dataUrl = raw.trim();
    if (!dataUrl) return null;
    const parsed = parseDataUrlMeta(dataUrl);
    if (!parsed) {
      throw createImageValidationError({
        status: 400,
        code: "INVALID_IMAGE_PAYLOAD",
        reasonCode: "INVALID_DATA_URL",
        message: `${label} 이미지 형식이 올바르지 않습니다.`,
      });
    }
    if (!isAllowedImageMime(parsed.mimeType)) {
      throw createImageValidationError({
        status: 415,
        code: "UNSUPPORTED_IMAGE_TYPE",
        reasonCode: "UNSUPPORTED_MIME_TYPE",
        message: `${label} 이미지 형식(${parsed.mimeType})은 지원되지 않습니다.`,
        debug: { mimeType: parsed.mimeType },
      });
    }
    if (parsed.sizeBytes > MAX_IMAGE_BYTES) {
      throw createImageValidationError({
        status: 413,
        code: "IMAGE_TOO_LARGE",
        reasonCode: "FILE_SIZE_LIMIT_EXCEEDED",
        message: `${label} 이미지 크기가 너무 큽니다. 25MB 이하 이미지를 선택해 주세요.`,
        debug: { sizeBytes: parsed.sizeBytes },
      });
    }
    if (parsed.sizeBytes > 0 && parsed.sizeBytes < MIN_IMAGE_BYTES) {
      throw createImageValidationError({
        status: 422,
        code: "IMAGE_TOO_SMALL",
        reasonCode: "IMAGE_TOO_SMALL",
        message: `${label} 이미지가 너무 작아 손바닥 분석이 어렵습니다.`,
        debug: { sizeBytes: parsed.sizeBytes },
      });
    }

    return {
      dataUrl,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.sizeBytes,
      source: "dataUrl",
    };
  }

  if (typeof File !== "undefined" && raw instanceof File) {
    const mimeType = String(raw.type || "application/octet-stream").toLowerCase();
    const sizeBytes = Number(raw.size || 0);
    if (!isAllowedImageMime(mimeType)) {
      throw createImageValidationError({
        status: 415,
        code: "UNSUPPORTED_IMAGE_TYPE",
        reasonCode: "UNSUPPORTED_MIME_TYPE",
        message: `${label} 이미지 형식(${mimeType || "unknown"})은 지원되지 않습니다.`,
        debug: { mimeType },
      });
    }
    if (sizeBytes > MAX_IMAGE_BYTES) {
      throw createImageValidationError({
        status: 413,
        code: "IMAGE_TOO_LARGE",
        reasonCode: "FILE_SIZE_LIMIT_EXCEEDED",
        message: `${label} 이미지 크기가 너무 큽니다. 25MB 이하 이미지를 선택해 주세요.`,
        debug: { sizeBytes },
      });
    }
    if (sizeBytes > 0 && sizeBytes < MIN_IMAGE_BYTES) {
      throw createImageValidationError({
        status: 422,
        code: "IMAGE_TOO_SMALL",
        reasonCode: "IMAGE_TOO_SMALL",
        message: `${label} 이미지가 너무 작아 손바닥 분석이 어렵습니다.`,
        debug: { sizeBytes },
      });
    }

    const base64 = toBase64(await raw.arrayBuffer());
    return {
      dataUrl: `data:${mimeType};base64,${base64}`,
      mimeType,
      sizeBytes,
      source: "file",
    };
  }

  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const dataUrl = typeof record.dataUrl === "string" ? record.dataUrl.trim() : "";
    if (dataUrl) {
      const parsed = parseDataUrlMeta(dataUrl);
      if (parsed) {
        if (!isAllowedImageMime(parsed.mimeType)) {
          throw createImageValidationError({
            status: 415,
            code: "UNSUPPORTED_IMAGE_TYPE",
            reasonCode: "UNSUPPORTED_MIME_TYPE",
            message: `${label} 이미지 형식(${parsed.mimeType})은 지원되지 않습니다.`,
            debug: { mimeType: parsed.mimeType },
          });
        }
        if (parsed.sizeBytes > MAX_IMAGE_BYTES) {
          throw createImageValidationError({
            status: 413,
            code: "IMAGE_TOO_LARGE",
            reasonCode: "FILE_SIZE_LIMIT_EXCEEDED",
            message: `${label} 이미지 크기가 너무 큽니다. 25MB 이하 이미지를 선택해 주세요.`,
            debug: { sizeBytes: parsed.sizeBytes },
          });
        }
        return {
          dataUrl,
          mimeType: parsed.mimeType,
          sizeBytes: parsed.sizeBytes,
          source: "json",
        };
      }
    }
  }

  throw createImageValidationError({
    status: 400,
    code: "INVALID_IMAGE_PAYLOAD",
    reasonCode: "INVALID_IMAGE_INPUT",
    message: `${label} 이미지 입력 형식을 처리할 수 없습니다.`,
  });
}

function shouldExposeDebug(): boolean {
  return process.env.NODE_ENV !== "production";
}

function errorResponse(input: {
  status: number;
  code: string;
  reasonCode: string;
  message: string;
  error?: string;
  debug?: Record<string, unknown>;
}) {
  const payload: Record<string, unknown> = {
    ok: false,
    code: input.code,
    error: input.error || input.code,
    reasonCode: input.reasonCode,
    message: input.message,
  };

  if (shouldExposeDebug() && input.debug && typeof input.debug === "object") {
    payload.debug = input.debug;
  }

  return NextResponse.json(payload, { status: input.status });
}

function extractDetectedLineKeys(handReading: PalmHandReading | null | undefined): string[] {
  if (!handReading || typeof handReading !== "object") return [];
  const major = handReading.majorLines || ({} as PalmHandReading["majorLines"]);
  const minor = handReading.minorLines || ({} as PalmHandReading["minorLines"]);
  const keys: string[] = [];
  if (major.lifeLine?.detected) keys.push("lifeLine");
  if (major.headLine?.detected) keys.push("headLine");
  if (major.heartLine?.detected) keys.push("heartLine");
  if (major.fateLine?.detected) keys.push("fateLine");
  if (minor.sunLine?.detected) keys.push("sunLine");
  if (minor.moneyLine?.detected) keys.push("moneyLine");
  if (minor.marriageLine?.detected) keys.push("marriageLine");
  return keys;
}

function qualityLabelToScore(value: string, kind: "brightness" | "sharpness"): number {
  const normalized = String(value || "").toLowerCase();
  if (kind === "brightness") {
    if (normalized === "good") return 1;
    if (normalized === "normal") return 0.72;
    return 0.28;
  }

  if (normalized === "good") return 1;
  if (normalized === "normal") return 0.74;
  return 0.25;
}

function computeQualityScore(input: {
  imageQuality?: Record<string, unknown> | null;
  detectedLineKeys?: string[];
  palmDetected?: boolean;
}): number {
  const imageQuality = (input.imageQuality || {}) as Record<string, unknown>;
  const lineCount = Math.max(0, Number(input.detectedLineKeys?.length || 0));
  const coverage = Math.max(0, Math.min(1, Number(imageQuality.palmCoverage || 0)));
  const brightnessScore = qualityLabelToScore(String(imageQuality.brightness || "normal"), "brightness");
  const sharpnessScore = qualityLabelToScore(String(imageQuality.sharpness || "normal"), "sharpness");
  const lineScore = Math.min(1, lineCount / 4);
  const detectedBonus = input.palmDetected ? 0.08 : 0;
  const score = coverage * 0.34 + brightnessScore * 0.2 + sharpnessScore * 0.2 + lineScore * 0.26 + detectedBonus;
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

function normalizeClientImageQuality(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const brightness = String(record.brightness || "normal").toLowerCase();
  const sharpness = String(record.sharpness || "normal").toLowerCase();
  const contrast = String(record.contrast || "normal").toLowerCase();
  const palmCoverage = Number(record.palmCoverage ?? 0);

  return {
    brightness: ["good", "normal", "dark"].includes(brightness) ? brightness : "normal",
    sharpness: ["good", "normal", "blurry"].includes(sharpness) ? sharpness : "normal",
    contrast: ["good", "normal", "low"].includes(contrast) ? contrast : "normal",
    palmCoverage: Number.isFinite(palmCoverage) ? Math.max(0, Math.min(1, palmCoverage)) : 0,
  };
}

function parseJsonObjectFromUnknown(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildSyntheticLandmarksFromBbox(input: {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}): Record<string, { x: number; y: number }> | null {
  const width = input.maxX - input.minX;
  const height = input.maxY - input.minY;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 20 || height < 20) return null;

  const x = input.minX;
  const y = input.minY;
  const w = width;
  const h = height;

  return {
    wrist: { x: x + w * 0.5, y: y + h * 0.98 },
    thumbBase: { x: x + w * 0.18, y: y + h * 0.58 },
    thumbTip: { x: x + w * 0.1, y: y + h * 0.24 },
    indexBase: { x: x + w * 0.28, y: y + h * 0.22 },
    indexTip: { x: x + w * 0.27, y: y + h * 0.04 },
    middleBase: { x: x + w * 0.5, y: y + h * 0.2 },
    middleTip: { x: x + w * 0.5, y: y + h * 0.02 },
    ringBase: { x: x + w * 0.68, y: y + h * 0.23 },
    ringTip: { x: x + w * 0.7, y: y + h * 0.05 },
    littleBase: { x: x + w * 0.83, y: y + h * 0.33 },
    littleTip: { x: x + w * 0.86, y: y + h * 0.12 },
  };
}

function estimateCurvatureFromPath(path: Array<{ x: number; y: number }>): number {
  if (!Array.isArray(path) || path.length < 3) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < path.length - 1; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const c = path[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    const n1 = Math.sqrt(abx * abx + aby * aby);
    const n2 = Math.sqrt(bcx * bcx + bcy * bcy);
    if (n1 < 1e-6 || n2 < 1e-6) continue;
    const dot = abx * bcx + aby * bcy;
    const cos = clampNumber(dot / (n1 * n2), -1, 1);
    sum += Math.acos(cos);
    count += 1;
  }
  if (count === 0) return 0;
  return clampNumber(sum / (count * Math.PI), 0, 1);
}

async function extractPalmAstroCandidatesFromImage(
  dataUrl: string,
): Promise<{
  lineCandidates: Array<Record<string, unknown>>;
  handLandmarks: Record<string, { x: number; y: number }> | null;
  palmCoverage: number;
  warnings: string[];
}> {
  const parsed = dataUrlToBase64(dataUrl);
  if (!parsed?.data) {
    return { lineCandidates: [], handLandmarks: null, palmCoverage: 0, warnings: ["invalid-data-url"] };
  }

  try {
    const { default: sharp } = await import("sharp");
    const inputBuffer = Buffer.from(parsed.data, "base64");
    const resized = await sharp(inputBuffer)
      .rotate()
      .grayscale()
      .normalise()
      .resize(384, 384, { fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const raw = resized.data as Buffer;
    const width = Number(resized.info?.width || 0);
    const height = Number(resized.info?.height || 0);
    const area = width * height;
    if (!width || !height || area <= 0 || raw.length < area) {
      return { lineCandidates: [], handLandmarks: null, palmCoverage: 0, warnings: ["decode-failed"] };
    }

    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < area; i += 1) {
      const v = raw[i];
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / area;
    const variance = Math.max(0, sumSq / area - mean * mean);
    const std = Math.sqrt(variance);
    const threshold = clampNumber(mean - Math.max(10, std * 0.35), 18, 205);

    const borderX = Math.floor(width * 0.05);
    const borderY = Math.floor(height * 0.05);
    const mask = new Uint8Array(area);
    let darkCount = 0;
    let darkMinX = Number.POSITIVE_INFINITY;
    let darkMinY = Number.POSITIVE_INFINITY;
    let darkMaxX = Number.NEGATIVE_INFINITY;
    let darkMaxY = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        const inBorder = x <= borderX || x >= width - borderX - 1 || y <= borderY || y >= height - borderY - 1;
        if (inBorder) continue;
        if (raw[idx] < threshold) {
          mask[idx] = 1;
          darkCount += 1;
          if (x < darkMinX) darkMinX = x;
          if (x > darkMaxX) darkMaxX = x;
          if (y < darkMinY) darkMinY = y;
          if (y > darkMaxY) darkMaxY = y;
        }
      }
    }

    const visited = new Uint8Array(area);
    const components: Array<{
      points: Array<{ x: number; y: number }>;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      meanValue: number;
    }> = [];

    const dirs = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];

    for (let y = borderY; y < height - borderY; y += 1) {
      for (let x = borderX; x < width - borderX; x += 1) {
        const startIdx = y * width + x;
        if (!mask[startIdx] || visited[startIdx]) continue;

        const queueX: number[] = [x];
        const queueY: number[] = [y];
        visited[startIdx] = 1;

        const points: Array<{ x: number; y: number }> = [];
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let componentSum = 0;

        for (let q = 0; q < queueX.length; q += 1) {
          const cx = queueX[q];
          const cy = queueY[q];
          const cidx = cy * width + cx;
          points.push({ x: cx, y: cy });
          componentSum += raw[cidx];
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < borderX || nx >= width - borderX || ny < borderY || ny >= height - borderY) continue;
            const nidx = ny * width + nx;
            if (!mask[nidx] || visited[nidx]) continue;
            visited[nidx] = 1;
            queueX.push(nx);
            queueY.push(ny);
          }
        }

        if (points.length < 60 || points.length > 26000) continue;
        components.push({
          points,
          minX,
          maxX,
          minY,
          maxY,
          meanValue: componentSum / points.length,
        });
      }
    }

    const candidates: Array<Record<string, unknown>> = [];

    for (const comp of components) {
      const compWidth = comp.maxX - comp.minX + 1;
      const compHeight = comp.maxY - comp.minY + 1;
      const ratio = compWidth / Math.max(1, compHeight);
      const elongated = ratio >= 1.2 || ratio <= 0.83;
      if (!elongated) continue;

      const horizontal = compWidth >= compHeight;
      const span = horizontal ? compWidth : compHeight;
      const bins = Math.max(10, Math.min(34, Math.floor(span / 5)));
      const agg = new Map<number, { sum: number; count: number }>();

      for (const p of comp.points) {
        const axis = horizontal ? p.x - comp.minX : p.y - comp.minY;
        const key = Math.max(0, Math.min(bins - 1, Math.floor((axis / Math.max(1, span)) * bins)));
        const val = horizontal ? p.y : p.x;
        const row = agg.get(key) || { sum: 0, count: 0 };
        row.sum += val;
        row.count += 1;
        agg.set(key, row);
      }

      const keys = Array.from(agg.keys()).sort((a, b) => a - b);
      if (keys.length < 5) continue;

      const path = keys.map((k) => {
        const row = agg.get(k)!;
        const center = row.sum / row.count;
        if (horizontal) {
          const x = comp.minX + (k + 0.5) * (span / bins);
          return { x: clampNumber(x, 0, width - 1), y: clampNumber(center, 0, height - 1) };
        }
        const y = comp.minY + (k + 0.5) * (span / bins);
        return { x: clampNumber(center, 0, width - 1), y: clampNumber(y, 0, height - 1) };
      });

      const first = path[0];
      const last = path[path.length - 1];
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const lineLength = Math.sqrt(dx * dx + dy * dy) / Math.max(1, Math.sqrt(width * width + height * height));
      const curvature = estimateCurvatureFromPath(path.map((p) => ({ x: p.x / width, y: p.y / height })));
      const depthScore = clampNumber((mean - comp.meanValue) / 85, 0.05, 0.98);
      const confidence = clampNumber(0.3 + lineLength * 0.7 + depthScore * 0.35 + (keys.length / bins) * 0.2, 0.15, 0.99);

      let breaks = 0;
      for (let i = 1; i < keys.length; i += 1) {
        if (keys[i] - keys[i - 1] > 2) breaks += 1;
      }

      const branches = (horizontal ? compHeight : compWidth) >= 18 ? 2 : 1;
      if (lineLength < 0.09) continue;

      candidates.push({
        id: `astro-${horizontal ? "h" : "v"}-${comp.minX}-${comp.minY}`,
        path,
        startPoint: first,
        endPoint: last,
        length: Number(lineLength.toFixed(4)),
        depthScore: Number(depthScore.toFixed(4)),
        curvatureScore: Number(curvature.toFixed(4)),
        branches,
        breaks,
        confidence: Number(confidence.toFixed(4)),
      });
    }

    candidates.sort((a, b) => Number((b.confidence as number) || 0) - Number((a.confidence as number) || 0));
    const trimmed = candidates.slice(0, 12);

    if (trimmed.length === 0) {
      const hasDarkBbox =
        Number.isFinite(darkMinX) &&
        Number.isFinite(darkMinY) &&
        Number.isFinite(darkMaxX) &&
        Number.isFinite(darkMaxY) &&
        darkMaxX > darkMinX &&
        darkMaxY > darkMinY;

      if (hasDarkBbox) {
        const bboxW = darkMaxX - darkMinX;
        const bboxH = darkMaxY - darkMinY;
        const coverage = darkCount / area;

        if (bboxW >= width * 0.34 && bboxH >= height * 0.42 && coverage >= 0.006) {
          const bx = darkMinX;
          const by = darkMinY;
          const bw = Math.max(10, bboxW);
          const bh = Math.max(10, bboxH);

          const template = [
            {
              id: "astro-template-life",
              path: [
                { x: bx + bw * 0.32, y: by + bh * 0.22 },
                { x: bx + bw * 0.24, y: by + bh * 0.37 },
                { x: bx + bw * 0.19, y: by + bh * 0.54 },
                { x: bx + bw * 0.22, y: by + bh * 0.72 },
                { x: bx + bw * 0.3, y: by + bh * 0.9 },
              ],
              startPoint: { x: bx + bw * 0.32, y: by + bh * 0.22 },
              endPoint: { x: bx + bw * 0.3, y: by + bh * 0.9 },
              length: 0.42,
              depthScore: 0.55,
              curvatureScore: 0.58,
              branches: 1,
              breaks: 0,
              confidence: 0.46,
            },
            {
              id: "astro-template-head",
              path: [
                { x: bx + bw * 0.34, y: by + bh * 0.44 },
                { x: bx + bw * 0.48, y: by + bh * 0.46 },
                { x: bx + bw * 0.63, y: by + bh * 0.48 },
                { x: bx + bw * 0.78, y: by + bh * 0.5 },
              ],
              startPoint: { x: bx + bw * 0.34, y: by + bh * 0.44 },
              endPoint: { x: bx + bw * 0.78, y: by + bh * 0.5 },
              length: 0.39,
              depthScore: 0.5,
              curvatureScore: 0.22,
              branches: 1,
              breaks: 0,
              confidence: 0.44,
            },
            {
              id: "astro-template-heart",
              path: [
                { x: bx + bw * 0.78, y: by + bh * 0.24 },
                { x: bx + bw * 0.63, y: by + bh * 0.22 },
                { x: bx + bw * 0.49, y: by + bh * 0.22 },
                { x: bx + bw * 0.34, y: by + bh * 0.25 },
              ],
              startPoint: { x: bx + bw * 0.78, y: by + bh * 0.24 },
              endPoint: { x: bx + bw * 0.34, y: by + bh * 0.25 },
              length: 0.37,
              depthScore: 0.5,
              curvatureScore: 0.36,
              branches: 1,
              breaks: 0,
              confidence: 0.43,
            },
          ];

          const handLandmarks = buildSyntheticLandmarksFromBbox({ minX: bx, maxX: bx + bw, minY: by, maxY: by + bh });
          return {
            lineCandidates: template,
            handLandmarks,
            palmCoverage: Number((darkCount / area).toFixed(4)),
            warnings: ["template-fallback"],
          };
        }
      }

      return {
        lineCandidates: [],
        handLandmarks: null,
        palmCoverage: Number((darkCount / area).toFixed(4)),
        warnings: ["no-candidates"],
      };
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const line of trimmed) {
      for (const p of (line.path as Array<{ x: number; y: number }>)) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }

    const handLandmarks = buildSyntheticLandmarksFromBbox({ minX, maxX, minY, maxY });

    return {
      lineCandidates: trimmed,
      handLandmarks,
      palmCoverage: Number((darkCount / area).toFixed(4)),
      warnings: [],
    };
  } catch (e) {
    return { lineCandidates: [], handLandmarks: null, palmCoverage: 0, warnings: ["extract-error"] };
  }
}

// Few-shot learning images
function getTrainingImages() {
  const results = [];
  try {
    const p1 = "C:\\Users\\Neo\\Desktop\\손금\\images.jpg";
    if (fs.existsSync(p1)) {
      results.push({
        text: "Reference Image 1: Learn from this typical palm line distribution.",
        inline_data: { mime_type: "image/jpeg", data: fs.readFileSync(p1).toString("base64") }
      });
    }
    const p2 = "C:\\Users\\Neo\\Desktop\\손금\\images (1).jpg";
    if (fs.existsSync(p2)) {
      results.push({
        text: "Reference Image 2: Learn from this alternate palm line structure.",
        inline_data: { mime_type: "image/jpeg", data: fs.readFileSync(p2).toString("base64") }
      });
    }
  } catch (e) {
    // Ignore errors in production
  }
  return results;
}

const PALM_VISION_SYSTEM_PROMPT = `당신은 전통 손금 및 현대 AI 손금(Palm-Astro) 융합 전문가입니다. 
업로드된 손바닥 사진을 보고 정밀하게 손금을 분석하세요. 
반드시 사진에 실제로 보이는 근거만 사용하고, 보이지 않는 정보는 추측하지 마세요.
감지되지 않은 항목은 detected=false 또는 strength=none으로 두세요.

[분석 원칙 - 중요]
1. 오직 '손금'에 대한 분석 결과만 풍부하고 정확하게 출력하세요. 쓸데없는 일반론이나 인사말은 제외하세요.
2. 초점이 맞지 않거나 보기 어려운 미세한 잔선(어려운 손금)은 억지로 찾지 마세요. 대신 누구나 식별하기 쉬운 **생명선, 감정선, 두뇌선, 재물선, 운명선** 등 가장 기본적이고 굵은 핵심 선들에 집중하여 분석의 품질을 대폭 높이십시오.
3. 각 기본 선들의 형태, 굵기, 길이, 곡률 등을 바탕으로 매우 풍부하고 이해하기 쉬운 상세한 결과를 도출하세요.
4. Palm-Astro-Application의 특성을 반영하여 다음 3가지 핵심 지표를 반드시 분석 내용에 포함하세요:
   - 우세선(Dominant Line): 생명선, 두뇌선, 감정선 중 가장 길고 뚜렷한 선 (예: "두뇌선 우세")
   - 손바닥 곡률 유형(Palm Type): 손금 선들의 전반적인 곡률(Curvature)에 따라 "곡선형/표현형(Curved/Expressive)", "균형형(Balanced)", "직선형/실용형(Straight/Practical)" 중 하나로 분류.
   - 직업 변화 지표(Career Shift Indicator): 두뇌선(Head Line)의 꺾임 각도와 생명선-두뇌선 교차점의 형태를 바탕으로 한 직업/진로 변경 가능성 유무.
5. 건강/수명/사고/재난을 단정하지 말고, 조언은 현실적인 행동 지침 중심으로 작성하세요.
6. 설명 없이 반드시 아래 JSON 형식으로만 응답하세요.

{
  "palmDetected": true,
  "handSide": "right 또는 left",
  "handShape": {
    "type": "earth|fire|air|water|mixed",
    "labelKo": "흙손|불손|바람손|물손|혼합형",
    "palmRatio": "wide|normal|narrow",
    "fingerRatio": "long|normal|short",
    "summary": "손 형태와 기질에 대한 아주 깊고 풍부한 설명 (3~4문장)"
  },
  "majorLines": {
    "lifeLine": { "detected": true, "length": "long|medium|short", "depth": "deep|medium|faint", "curvature": "wide|normal|narrow", "breaks": 0, "branches": 0, "summary": "생명선 심층 분석 (에너지, 생명력)", "advice": "건강 관리 조언" },
    "headLine": { "detected": true, "length": "long|medium|short", "direction": "straight|curved|downward", "startRelationWithLifeLine": "joined|separated", "breaks": 0, "branches": 0, "summary": "두뇌선 심층 분석 (사고방식, 커리어)", "advice": "사고력 활용 조언" },
    "heartLine": { "detected": true, "length": "long|medium|short", "curvature": "strong|soft|straight", "endingArea": "underIndex|underMiddle|between", "breaks": 0, "branches": 0, "summary": "감정선 심층 분석 (연애, 감정표현)", "advice": "인간관계 조언" },
    "fateLine": { "detected": true, "strength": "strong|medium|weak|none", "startArea": "wrist|lifeLine|moonMount|middlePalm", "endArea": "saturnMount|middlePalm", "breaks": 0, "summary": "운명선 심층 분석 (직업, 성공)", "advice": "목표 달성 조언" }
  },
  "minorLines": {
    "sunLine": { "detected": true, "strength": "strong|medium|weak|none", "summary": "태양선 심층 분석 (인기, 명예)" },
    "moneyLine": { "detected": true, "strength": "medium", "summary": "재물선 심층 분석 (재물 축적 패턴)" },
    "marriageLine": { "detected": true, "strength": "medium", "summary": "결혼선 심층 분석 (결혼/연애 성향)" },
    "mercuryLine": { "detected": true, "strength": "none", "summary": "수성선 심층 분석 (소통, 사업)" }
  },
  "mounts": {
    "venus": { "fullness": "strong|medium|weak", "summary": "금성구 (열정, 가족애) 분석" },
    "moon": { "fullness": "medium", "summary": "월구 (상상력, 직관) 분석" },
    "jupiter": { "fullness": "strong", "summary": "목성구 (리더십, 야망) 분석" },
    "saturn": { "fullness": "medium", "summary": "토성구 (인내, 책임감) 분석" },
    "sun": { "fullness": "medium", "summary": "태양구 (창조력, 성공) 분석" },
    "mercury": { "fullness": "medium", "summary": "수성구 (기지, 사업) 분석" },
    "mars": { "fullness": "medium", "summary": "화성구 (투지, 용기) 분석" }
  },
  "scores": {
    "love": 75, "career": 80, "wealth": 70, "vitality": 85, "creativity": 78, "communication": 72
  },
  "overall": {
    "title": "분석 결과를 관통하는 핵심 제목",
    "summary": "우세선(Dominant Line)과 손바닥 곡률 유형(Palm Type)을 포함한 손금 전체에 대한 종합 심층 설명 (5문장 이상)",
    "strengths": ["구체적인 강점1", "구체적인 강점2", "구체적인 강점3"],
    "cautions": ["직업 변화 지표(Career Shift Indicator)를 고려한 주의점1", "주의점2"],
    "recommendedActions": ["구체적인 실천사항1", "실천사항2"]
  },
  "imageQuality": {
    "brightness": "good|normal|dark",
    "sharpness": "good|normal|blurry",
    "palmCoverage": 0.85
  },
  "purposeAnalysis": {
    "summary": "선택된 분석 목적에 맞는 핵심 요약 (3~5문장)",
    "evidence": [
      { "label": "우세선(Dominant Line)", "text": "생명선/두뇌선/감정선 중 어느 선이 가장 두드러지는지 및 그 의미" },
      { "label": "곡률 기반 손금 유형(Palm Type)", "text": "곡선형(Expressive)/균형형(Balanced)/직선형(Practical) 판별 결과" },
      { "label": "커리어 변화 지표(Career Shift)", "text": "두뇌선의 각도와 교차점 분석을 통한 직업 변동성 유무 분석" }
    ],
    "details": "선택된 목적에 대한 매우 상세하고 풍부한 심층 분석 결과 (상담사가 직접 말하듯 풍부한 내용)",
    "cautions": ["목적에 따른 주의사항 1", "주의사항 2"],
    "actions": ["목적에 따른 행동 가이드 1", "행동 가이드 2"],
    "sections": [
      { "title": "목적 맞춤 심층 분석 1", "content": "매우 상세하고 전문적인 내용" },
      { "title": "목적 맞춤 심층 분석 2", "content": "매우 상세하고 전문적인 내용" }
    ]
  }
}`;

type VisionAnalysisResult = {
  handReading: PalmHandReading;
  palmDetected: boolean;
  imageQuality: Record<string, unknown>;
  purposeAnalysis: Record<string, unknown> | null;
  raw: unknown;
  detectedLineKeys: string[];
  qualityScore: number;
};

async function analyzeHandWithGeminiVision(
  imageDataUrl: string,
  declaredSide: "left" | "right",
  analysisPurpose: string,
): Promise<VisionAnalysisResult | null> {
  const key = pickVisionKey();
  if (!key) return null;

  const imageInfo = dataUrlToBase64(imageDataUrl);
  if (!imageInfo) return null;

  const model = "gemini-2.0-flash";
  const endpoint = GEMINI_VISION_ENDPOINT.replace("{model}", model);

  const purposeKo: Record<string, string> = {
    general: "전체 운세",
    love: "연애운",
    wealth: "재물운",
    career: "직업운",
    personality: "성격분석",
    relationship: "관계 패턴",
  };
  const purposeText = purposeKo[analysisPurpose] || "전체 운세";

  const userPrompt = `이 사진은 ${declaredSide === "right" ? "오른손" : "왼손"} 바닥입니다. 사용자의 분석 목적은 '${purposeText}'입니다. 이 목적에 맞춰 각 손금 영역을 깊이 있게 풀이하세요. 결과는 단순한 키워드 나열이 아니라, 전문가가 직접 대면 상담하듯 매우 길고 구체적이며 심층적인 문장으로 작성해야 합니다. 또한 반드시 우세선, 곡률 기반 손금 유형, 커리어 변화 지표 3가지를 명시하세요. 결과는 JSON으로만 응답하세요.`;

  const trainingImages = getTrainingImages();
  const parts = [
    { text: PALM_VISION_SYSTEM_PROMPT },
    ...trainingImages.flatMap(img => [{ text: img.text }, { inline_data: img.inline_data }]),
    { text: userPrompt },
    { inline_data: { mime_type: imageInfo.mimeType, data: imageInfo.data } },
  ];

  let payload: unknown;
  try {
    const res = await fetch(`${endpoint}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    });
    if (!res.ok) return null;
    payload = await res.json();
  } catch (e) {
    return null;
  }

  const text = extractGeminiText(payload);
  if (!text) return null;

  const jsonText = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const match = jsonText.match(/\{[\s\S]+\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch (e) {
      return null;
    }
  }

  const handReading = geminiResultToHandReading(parsed);
  const purposeAnalysis = asObj(parsed.purposeAnalysis);
  const iq = parsed.imageQuality as Record<string, unknown> | undefined;
  const detectedLineKeys = extractDetectedLineKeys(handReading);
  const palmDetectedExplicit = parsed.palmDetected === true;
  const palmDetected = palmDetectedExplicit || (parsed.palmDetected !== false && detectedLineKeys.length > 0);
  const imageQuality = {
    isPalmDetected: palmDetected,
    handSide: parsed.handSide || declaredSide,
    brightness: iq?.brightness || "normal",
    sharpness: iq?.sharpness || "normal",
    palmCoverage: Number(iq?.palmCoverage ?? (detectedLineKeys.length > 0 ? 0.58 : 0.36)),
    rotation: 0,
    warnings: [],
  };

  return {
    handReading,
    palmDetected,
    imageQuality,
    purposeAnalysis: Object.keys(purposeAnalysis).length > 0 ? purposeAnalysis : null,
    raw: parsed,
    detectedLineKeys,
    qualityScore: computeQualityScore({ imageQuality, detectedLineKeys, palmDetected }),
  };
}

function extractGeminiText(payload: unknown): string {
  const p = payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const lowered = v.trim().toLowerCase();
    if (lowered === "true" || lowered === "yes" || lowered === "y" || lowered === "1") return true;
    if (lowered === "false" || lowered === "no" || lowered === "n" || lowered === "0") return false;
  }
  return fallback;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function geminiResultToHandReading(g: Record<string, unknown>): PalmHandReading {
  const ml = asObj(g.majorLines);
  const ll = asObj(ml.lifeLine);
  const hl = asObj(ml.headLine);
  const htl = asObj(ml.heartLine);
  const fl = asObj(ml.fateLine);
  const mn = asObj(g.minorLines);
  const mt = asObj(g.mounts);
  const sc = asObj(g.scores);
  const ov = asObj(g.overall);
  const hs = asObj(g.handShape);

  return {
    handShape: {
      type: str(hs.type, "mixed") as PalmHandReading["handShape"]["type"],
      labelKo: str(hs.labelKo, "혼합형"),
      palmRatio: str(hs.palmRatio, "normal"),
      fingerRatio: str(hs.fingerRatio, "normal"),
      summary: str(hs.summary, "손 형태를 깊이 있게 분석했습니다."),
    },
    majorLines: {
      lifeLine: {
        detected: bool(ll.detected, false),
        length: str(ll.length, "medium") as PalmHandReading["majorLines"]["lifeLine"]["length"],
        depth: str(ll.depth, "medium") as PalmHandReading["majorLines"]["lifeLine"]["depth"],
        curvature: str(ll.curvature, "normal") as PalmHandReading["majorLines"]["lifeLine"]["curvature"],
        breaks: num(ll.breaks, 0),
        branches: num(ll.branches, 0),
        summary: str(ll.summary, "생명선을 감지했습니다."),
        advice: str(ll.advice, "규칙적인 생활 리듬을 유지하세요."),
      },
      headLine: {
        detected: bool(hl.detected, false),
        length: str(hl.length, "medium") as PalmHandReading["majorLines"]["headLine"]["length"],
        direction: str(hl.direction, "straight") as PalmHandReading["majorLines"]["headLine"]["direction"],
        startRelationWithLifeLine: str(hl.startRelationWithLifeLine, "joined") as PalmHandReading["majorLines"]["headLine"]["startRelationWithLifeLine"],
        breaks: num(hl.breaks, 0),
        branches: num(hl.branches, 0),
        summary: str(hl.summary, "두뇌선을 감지했습니다."),
        advice: str(hl.advice, "명확한 목표 설정이 도움이 됩니다."),
      },
      heartLine: {
        detected: bool(htl.detected, false),
        length: str(htl.length, "medium") as PalmHandReading["majorLines"]["heartLine"]["length"],
        curvature: str(htl.curvature, "soft") as PalmHandReading["majorLines"]["heartLine"]["curvature"],
        endingArea: str(htl.endingArea, "underMiddle") as PalmHandReading["majorLines"]["heartLine"]["endingArea"],
        breaks: num(htl.breaks, 0),
        branches: num(htl.branches, 0),
        summary: str(htl.summary, "감정선을 감지했습니다."),
        advice: str(htl.advice, "감정 표현을 솔직하게 하는 연습이 도움이 됩니다."),
      },
      fateLine: {
        detected: bool(fl.detected, false),
        strength: str(fl.strength, "medium") as PalmHandReading["majorLines"]["fateLine"]["strength"],
        startArea: str(fl.startArea, "wrist") as PalmHandReading["majorLines"]["fateLine"]["startArea"],
        endArea: str(fl.endArea, "saturnMount") as PalmHandReading["majorLines"]["fateLine"]["endArea"],
        breaks: num(fl.breaks, 0),
        summary: str(fl.summary, "운명선을 감지했습니다."),
        advice: str(fl.advice, "꾸준한 노력이 결실을 맺을 것입니다."),
      },
    },
    minorLines: {
      sunLine: {
        detected: bool(asObj(mn.sunLine).detected, false),
        strength: str(asObj(mn.sunLine).strength, null as unknown as string),
        summary: str(asObj(mn.sunLine).summary, "태양선을 분석했습니다."),
      },
      moneyLine: {
        detected: bool(asObj(mn.moneyLine).detected, false),
        strength: str(asObj(mn.moneyLine).strength, null as unknown as string),
        summary: str(asObj(mn.moneyLine).summary, "재물선을 분석했습니다."),
      },
      marriageLine: {
        detected: bool(asObj(mn.marriageLine).detected, false),
        strength: str(asObj(mn.marriageLine).strength, null as unknown as string),
        summary: str(asObj(mn.marriageLine).summary, "결혼선을 분석했습니다."),
      },
      mercuryLine: {
        detected: bool(asObj(mn.mercuryLine).detected, false),
        strength: str(asObj(mn.mercuryLine).strength, null as unknown as string),
        summary: str(asObj(mn.mercuryLine).summary, "수성선을 분석했습니다."),
      },
    },
    mounts: {
      venus: { fullness: str(asObj(mt.venus).fullness, "medium") as PalmHandReading["mounts"]["venus"]["fullness"], summary: str(asObj(mt.venus).summary, "") },
      moon: { fullness: str(asObj(mt.moon).fullness, "medium") as PalmHandReading["mounts"]["moon"]["fullness"], summary: str(asObj(mt.moon).summary, "") },
      jupiter: { fullness: str(asObj(mt.jupiter).fullness, "medium") as PalmHandReading["mounts"]["jupiter"]["fullness"], summary: str(asObj(mt.jupiter).summary, "") },
      saturn: { fullness: str(asObj(mt.saturn).fullness, "medium") as PalmHandReading["mounts"]["saturn"]["fullness"], summary: str(asObj(mt.saturn).summary, "") },
      sun: { fullness: str(asObj(mt.sun).fullness, "medium") as PalmHandReading["mounts"]["sun"]["fullness"], summary: str(asObj(mt.sun).summary, "") },
      mercury: { fullness: str(asObj(mt.mercury).fullness, "medium") as PalmHandReading["mounts"]["mercury"]["fullness"], summary: str(asObj(mt.mercury).summary, "") },
      mars: { fullness: str(asObj(mt.mars).fullness, "medium") as PalmHandReading["mounts"]["mars"]["fullness"], summary: str(asObj(mt.mars).summary, "") },
    },
    scores: {
      love: num(sc.love, null as unknown as number),
      career: num(sc.career, null as unknown as number),
      wealth: num(sc.wealth, null as unknown as number),
      vitality: num(sc.vitality, null as unknown as number),
      creativity: num(sc.creativity, null as unknown as number),
      communication: num(sc.communication, null as unknown as number),
    },
    overall: {
      title: str(ov.title, "손금 분석 결과"),
      summary: str(ov.summary, "손금을 분석했습니다."),
      strengths: asArr(ov.strengths).map((s) => String(s)),
      cautions: asArr(ov.cautions).map((s) => String(s)),
      recommendedActions: asArr(ov.recommendedActions).map((s) => String(s)),
    },
  };
}

export const runtime = "nodejs";
export const maxDuration = 45;

type RawImageInput = File | string | Record<string, unknown> | null | undefined;

type ParsedPayload = {
  uploadedHandSide: string;
  leftPalmImage: RawImageInput;
  rightPalmImage: RawImageInput;
  dominantHand: string;
  analysisPurpose: string;
  leftImageQuality: Record<string, unknown> | null;
  rightImageQuality: Record<string, unknown> | null;
};

function toNonEmptyString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeDominantHand(value: string): PalmDominantHand | null {
  const lowered = value.trim().toLowerCase();
  if (lowered === "right") return "right";
  if (lowered === "left") return "left";
  if (lowered === "both") return "both";
  return null;
}

function normalizeAnalysisPurpose(value: string): PalmAnalysisPurpose | null {
  const lowered = value.trim().toLowerCase();
  if (lowered === "overall") return "general";
  if (lowered === "general") return "general";
  if (lowered === "love") return "love";
  if (lowered === "wealth") return "wealth";
  if (lowered === "career") return "career";
  if (lowered === "personality") return "personality";
  if (lowered === "relationship") return "relationship";
  return null;
}

async function parsePayload(req: NextRequest): Promise<ParsedPayload> {
  const readFirst = (source: FormData | Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
      if (source instanceof FormData) {
        const value = source.get(key);
        if (value != null) return value;
      } else if (key in source) {
        const value = source[key];
        if (value != null) return value;
      }
    }
    return null;
  };

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    const uploadedHandSide = toNonEmptyString(readFirst(form, ["uploadedHandSide", "uploadedSide", "handSide", "side"]));
    const dominantHand = toNonEmptyString(readFirst(form, ["dominantHand", "handType", "handedness"]));
    const analysisPurpose = toNonEmptyString(readFirst(form, ["analysisPurpose", "purpose", "reportType"]));

    let leftPalmImage = (readFirst(form, ["leftPalmImage", "leftImage", "leftFile", "leftPhoto"]) as RawImageInput) ?? null;
    let rightPalmImage = (readFirst(form, ["rightPalmImage", "rightImage", "rightFile", "rightPhoto"]) as RawImageInput) ?? null;
    const singleImage = (readFirst(form, ["image", "file", "palmImage", "photo"]) as RawImageInput) ?? null;

    if (!leftPalmImage && !rightPalmImage && singleImage) {
      const side = uploadedHandSide.toLowerCase();
      if (side === "left") {
        leftPalmImage = singleImage;
      } else {
        rightPalmImage = singleImage;
      }
    }

    const leftImageQuality = parseJsonObjectFromUnknown(
      readFirst(form, ["leftImageQuality", "leftQuality", "imageQualityLeft", "qualityLeft"]),
    );
    const rightImageQuality = parseJsonObjectFromUnknown(
      readFirst(form, ["rightImageQuality", "rightQuality", "imageQualityRight", "qualityRight"]),
    );

    return {
      uploadedHandSide,
      leftPalmImage,
      rightPalmImage,
      dominantHand,
      analysisPurpose,
      leftImageQuality,
      rightImageQuality,
    };
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const uploadedHandSide = toNonEmptyString(
    readFirst(body, ["uploadedHandSide", "uploadedSide", "handSide", "side"]),
  );
  const dominantHand = toNonEmptyString(readFirst(body, ["dominantHand", "handType", "handedness"]));
  const analysisPurpose = toNonEmptyString(readFirst(body, ["analysisPurpose", "purpose", "reportType"]));

  let leftPalmImage = (readFirst(body, ["leftPalmImage", "leftImage", "leftFile", "leftPhoto"]) as RawImageInput) ?? null;
  let rightPalmImage = (readFirst(body, ["rightPalmImage", "rightImage", "rightFile", "rightPhoto"]) as RawImageInput) ?? null;
  const singleImage = (readFirst(body, ["image", "file", "palmImage", "photo"]) as RawImageInput) ?? null;

  if (!leftPalmImage && !rightPalmImage && singleImage) {
    const side = uploadedHandSide.toLowerCase();
    if (side === "left") {
      leftPalmImage = singleImage;
    } else {
      rightPalmImage = singleImage;
    }
  }

  return {
    uploadedHandSide,
    leftPalmImage,
    rightPalmImage,
    dominantHand,
    analysisPurpose,
    leftImageQuality: parseJsonObjectFromUnknown(readFirst(body, ["leftImageQuality", "leftQuality", "imageQualityLeft", "qualityLeft"])),
    rightImageQuality: parseJsonObjectFromUnknown(readFirst(body, ["rightImageQuality", "rightQuality", "imageQualityRight", "qualityRight"])),
  };
}

type SideAnalysisResult = {
  side: "left" | "right";
  source: "gemini" | "map_engine";
  handReading: PalmHandReading;
  palmDetected: boolean;
  detectedLineKeys: string[];
  imageQuality: Record<string, unknown>;
  purposeAnalysis: Record<string, unknown> | null;
  raw: unknown;
  recognitionData: Record<string, unknown>;
  qualityScore: number;
};

function detectPalmFromMapEngine(result: unknown): boolean {
  const normalizedResult = (result && typeof result === "object")
    ? (result as Record<string, unknown>)
    : {};
  const recognitionData = (normalizedResult.recognitionData && typeof normalizedResult.recognitionData === "object")
    ? (normalizedResult.recognitionData as Record<string, unknown>)
    : {};
  const lines = (recognitionData.lines && typeof recognitionData.lines === "object")
    ? (recognitionData.lines as Record<string, unknown>)
    : {};
  const lifeLine = (lines.lifeLine && typeof lines.lifeLine === "object")
    ? (lines.lifeLine as Record<string, unknown>)
    : {};
  const headLine = (lines.headLine && typeof lines.headLine === "object")
    ? (lines.headLine as Record<string, unknown>)
    : {};
  const heartLine = (lines.heartLine && typeof lines.heartLine === "object")
    ? (lines.heartLine as Record<string, unknown>)
    : {};
  const fateLine = (lines.fateLine && typeof lines.fateLine === "object")
    ? (lines.fateLine as Record<string, unknown>)
    : {};
  const majorDetected =
    Boolean(lifeLine.detected) ||
    Boolean(headLine.detected) ||
    Boolean(heartLine.detected) ||
    Boolean(fateLine.detected);
  const featureCount = Number(lines.featureCount || 0);
  const palmDetected = Boolean(recognitionData.palmDetected);
  return palmDetected || majorDetected || featureCount > 0;
}

async function analyzeHandWithLocalEngine(input: {
  imageDataUrl: string;
  side: "left" | "right";
  dominantHand: PalmDominantHand;
  analysisPurpose: PalmAnalysisPurpose;
  imageQuality?: Record<string, unknown> | null;
}): Promise<SideAnalysisResult | null> {
  if (typeof analyzePalmHandInput !== "function") return null;
  try {
    const extracted = await extractPalmAstroCandidatesFromImage(input.imageDataUrl);
    const normalizedQuality = normalizeClientImageQuality(input.imageQuality) || {
      brightness: "normal",
      sharpness: "normal",
      contrast: "normal",
      palmCoverage: 0.45,
    };

    const mergedQuality = {
      ...normalizedQuality,
      palmCoverage: Math.max(Number(normalizedQuality.palmCoverage || 0), Number(extracted.palmCoverage || 0)),
    };

    const localResultRaw = analyzePalmHandInput({
      uploadedHandSide: input.side,
      dominantHand: input.dominantHand,
      analysisPurpose: input.analysisPurpose,
      rawImage: input.imageDataUrl,
      imageQuality: mergedQuality,
      handLandmarks: extracted.handLandmarks || undefined,
      lineCandidates: extracted.lineCandidates,
    });

    if (!localResultRaw || typeof localResultRaw !== "object") return null;
    const localResult = localResultRaw as Record<string, unknown>;
    const handReadingValue = localResult.handReading;

    if (!handReadingValue || typeof handReadingValue !== "object") return null;

    const handReading = handReadingValue as PalmHandReading;
    const detectedLineKeys = extractDetectedLineKeys(handReading);
    const recognitionData =
      (localResult.recognitionData && typeof localResult.recognitionData === "object")
        ? (localResult.recognitionData as Record<string, unknown>)
        : null;
    const imageQuality =
      ((recognitionData?.imageQuality as Record<string, unknown> | undefined) ||
      mergedQuality);
    const palmDetected = detectPalmFromMapEngine(localResult);

    return {
      side: input.side,
      source: "map_engine",
      handReading,
      palmDetected,
      detectedLineKeys,
      imageQuality,
      purposeAnalysis: null,
      raw: localResult,
      recognitionData:
        recognitionData || {
          palmDetected,
          imageQuality,
        },
      qualityScore: computeQualityScore({ imageQuality, detectedLineKeys, palmDetected }),
    };
  } catch (e) {
    return null;
  }
}

function choosePreferredSideAnalysis(gemini: VisionAnalysisResult | null, local: SideAnalysisResult | null): SideAnalysisResult | null {
  if (gemini?.palmDetected) {
    return {
      side: String(gemini.imageQuality?.handSide || "right").toLowerCase() === "left" ? "left" : "right",
      source: "gemini",
      handReading: gemini.handReading,
      palmDetected: gemini.palmDetected,
      detectedLineKeys: gemini.detectedLineKeys,
      imageQuality: gemini.imageQuality,
      purposeAnalysis: gemini.purposeAnalysis,
      raw: gemini.raw,
      recognitionData: {
        palmDetected: gemini.palmDetected,
        imageQuality: gemini.imageQuality,
        visionSource: "gemini_palm_astro",
        detectedLines: gemini.detectedLineKeys,
      },
      qualityScore: gemini.qualityScore,
    };
  }

  if (local?.palmDetected) {
    return local;
  }

  if (gemini && gemini.detectedLineKeys.length > 0) {
    return {
      side: String(gemini.imageQuality?.handSide || "right").toLowerCase() === "left" ? "left" : "right",
      source: "gemini",
      handReading: gemini.handReading,
      palmDetected: true,
      detectedLineKeys: gemini.detectedLineKeys,
      imageQuality: gemini.imageQuality,
      purposeAnalysis: gemini.purposeAnalysis,
      raw: gemini.raw,
      recognitionData: {
        palmDetected: true,
        imageQuality: gemini.imageQuality,
        visionSource: "gemini_palm_astro",
        detectedLines: gemini.detectedLineKeys,
      },
      qualityScore: gemini.qualityScore,
    };
  }

  return null;
}

function majorLineDetectedCount(handReading: PalmHandReading | null | undefined): number {
  if (!handReading) return 0;
  const major = handReading.majorLines;
  return [major.lifeLine, major.headLine, major.heartLine, major.fateLine].filter((line) => Boolean(line?.detected)).length;
}

function resolveAnalysisMode(input: {
  palmDetected: boolean;
  qualityScore: number;
  majorLineCount: number;
}): "full" | "partial" | "fallback" {
  if (!input.palmDetected) return "fallback";
  if (input.majorLineCount >= 3 && input.qualityScore >= 0.62) return "full";
  if (input.majorLineCount >= 1 || input.qualityScore >= 0.45) return "partial";
  return "fallback";
}

function collectMissingData(handReading: PalmHandReading | null | undefined): string[] {
  if (!handReading) {
    return [
      "handShape",
      "lifeLine",
      "headLine",
      "heartLine",
      "fateLine",
      "sunLine",
      "moneyLine",
      "marriageLine",
      "mounts",
    ];
  }

  const missing: string[] = [];
  const major = handReading.majorLines;
  const minor = handReading.minorLines;

  if (!major.lifeLine?.detected) missing.push("lifeLine");
  if (!major.headLine?.detected) missing.push("headLine");
  if (!major.heartLine?.detected) missing.push("heartLine");
  if (!major.fateLine?.detected) missing.push("fateLine");
  if (!minor.sunLine?.detected) missing.push("sunLine");
  if (!minor.moneyLine?.detected) missing.push("moneyLine");
  if (!minor.marriageLine?.detected) missing.push("marriageLine");

  const mountMissing = ["venus", "jupiter", "saturn", "sun", "mercury", "moon", "mars"].filter((key) => {
    const item = (handReading.mounts as Record<string, { summary?: string }>)[key];
    return !item || !String(item.summary || "").trim();
  });
  if (mountMissing.length > 0) missing.push("mounts");

  return missing;
}

const MISSING_LABEL_MAP: Record<string, string> = {
  handShape: "손의 전체 흐름",
  lifeLine: "에너지 흐름",
  headLine: "생각 흐름",
  heartLine: "감정 흐름",
  fateLine: "일과 방향 흐름",
  sunLine: "표현 흐름",
  moneyLine: "돈 흐름",
  marriageLine: "관계 흐름",
  mounts: "보조 흐름",
};

function formatMissingForUser(missingData: string[]): string {
  const labels = missingData
    .map((key) => MISSING_LABEL_MAP[key] || key)
    .filter(Boolean)
    .slice(0, 5);
  if (labels.length === 0) return "";
  return `이번 사진에서는 ${labels.join(", ")}이(가) 또렷하게 보이지 않아 참고 흐름으로 안내해요.`;
}

function lineStrengthFromMajor(line: { depth?: string; curvature?: string } | null | undefined): "strong" | "medium" | "weak" | "unknown" {
  const depth = String(line?.depth || "").toLowerCase();
  if (depth === "deep") return "strong";
  if (depth === "medium") return "medium";
  if (depth === "faint") return "weak";
  return "unknown";
}

function clarityFromMajor(line: { depth?: string; breaks?: number } | null | undefined): "clear" | "soft" | "broken" | "unknown" {
  const breaks = Number(line?.breaks || 0);
  if (breaks > 0) return "broken";
  const depth = String(line?.depth || "").toLowerCase();
  if (depth === "deep") return "clear";
  if (depth === "medium") return "soft";
  return "unknown";
}

function normalizeLength(value: string): "long" | "medium" | "short" | "unknown" {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "long" || normalized === "medium" || normalized === "short") return normalized;
  return "unknown";
}

function lineFromMajor(line: {
  detected?: boolean;
  depth?: string;
  length?: string;
  summary?: string;
  breaks?: number;
}): {
  detected: boolean;
  strength: "strong" | "medium" | "weak" | "unknown";
  length: "long" | "medium" | "short" | "unknown";
  clarity: "clear" | "soft" | "broken" | "unknown";
  meaning: string;
} {
  return {
    detected: Boolean(line?.detected),
    strength: lineStrengthFromMajor(line),
    length: normalizeLength(String(line?.length || "unknown")),
    clarity: clarityFromMajor(line),
    meaning: String(line?.summary || "이미지 선명도 부족으로 판독 보류"),
  };
}

function lineFromMinor(line: {
  detected?: boolean;
  strength?: string | null;
  summary?: string;
}): {
  detected: boolean;
  strength: "strong" | "medium" | "weak" | "unknown";
  length: "long" | "medium" | "short" | "unknown";
  clarity: "clear" | "soft" | "broken" | "unknown";
  meaning: string;
} {
  const normalizedStrength = String(line?.strength || "").toLowerCase();
  return {
    detected: Boolean(line?.detected),
    strength:
      normalizedStrength === "strong" || normalizedStrength === "medium" || normalizedStrength === "weak"
        ? (normalizedStrength as "strong" | "medium" | "weak")
        : "unknown",
    length: "unknown",
    clarity: line?.detected ? "soft" : "unknown",
    meaning: String(line?.summary || "이미지 선명도 부족으로 판독 보류"),
  };
}

function toPurposeAnalysis(
  value: Record<string, unknown> | null | undefined,
): CanonicalPalmReading["purposeAnalysis"] | undefined {
  if (!value || typeof value !== "object") return undefined;

  const evidenceRaw = Array.isArray(value.evidence) ? value.evidence : [];
  const sectionsRaw = Array.isArray(value.sections) ? value.sections : [];

  return {
    summary: String(value.summary || ""),
    evidence: evidenceRaw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        return {
          label: String(row.label || ""),
          text: String(row.text || ""),
        };
      })
      .filter((item): item is { label: string; text: string } => Boolean(item && item.label && item.text)),
    details: String(value.details || ""),
    cautions: Array.isArray(value.cautions) ? value.cautions.map((item) => String(item)) : [],
    actions: Array.isArray(value.actions) ? value.actions.map((item) => String(item)) : [],
    sections: sectionsRaw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        return {
          title: String(row.title || ""),
          content: String(row.content || ""),
        };
      })
      .filter((item): item is { title: string; content: string } => Boolean(item && item.title && item.content)),
  };
}


export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (!auth.ok) {
      if ("response" in auth) {
        const authWithResponse = auth as { response?: NextResponse };
        if (authWithResponse.response) return authWithResponse.response;
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await parsePayload(req);
    const dominantHand = normalizeDominantHand(payload.dominantHand);
    const analysisPurpose = normalizeAnalysisPurpose(payload.analysisPurpose);

    if (!dominantHand) {
      return errorResponse({
        status: 400,
        code: "MISSING_DOMINANT_HAND",
        reasonCode: "MISSING_DOMINANT_HAND",
        message: "주로 사용하는 손 정보가 필요합니다.",
      });
    }
    if (!analysisPurpose) {
      return errorResponse({
        status: 400,
        code: "MISSING_ANALYSIS_PURPOSE",
        reasonCode: "MISSING_ANALYSIS_PURPOSE",
        message: "분석 목적 정보가 필요합니다.",
      });
    }

    let normalizedLeft: NormalizedImageInput | null = null;
    let normalizedRight: NormalizedImageInput | null = null;

    try {
      normalizedLeft = await normalizeImageInput(payload.leftPalmImage, "left");
      normalizedRight = await normalizeImageInput(payload.rightPalmImage, "right");
    } catch (error) {
      if (isImageValidationError(error)) {
        return errorResponse({
          status: error.status,
          code: error.code,
          reasonCode: error.reasonCode,
          message: error.message,
          debug: error.debug,
        });
      }
      throw error;
    }

    if (!normalizedLeft && !normalizedRight) {
      return errorResponse({
        status: 400,
        code: "MISSING_IMAGE",
        reasonCode: "MISSING_IMAGE",
        message: "손바닥 이미지가 필요합니다.",
      });
    }

    const hasVisionKey = Boolean(pickVisionKey());
    const leftQuality = normalizeClientImageQuality(payload.leftImageQuality);
    const rightQuality = normalizeClientImageQuality(payload.rightImageQuality);

    const [visionLeft, visionRight] = await Promise.all([
      normalizedLeft ? analyzeHandWithGeminiVision(normalizedLeft.dataUrl, "left", analysisPurpose).catch(() => null) : Promise.resolve(null),
      normalizedRight ? analyzeHandWithGeminiVision(normalizedRight.dataUrl, "right", analysisPurpose).catch(() => null) : Promise.resolve(null),
    ]);

    const [localLeft, localRight] = await Promise.all([
      normalizedLeft
        ? analyzeHandWithLocalEngine({
            imageDataUrl: normalizedLeft.dataUrl,
            side: "left",
            dominantHand,
            analysisPurpose,
            imageQuality: leftQuality,
          })
        : Promise.resolve(null),
      normalizedRight
        ? analyzeHandWithLocalEngine({
            imageDataUrl: normalizedRight.dataUrl,
            side: "right",
            dominantHand,
            analysisPurpose,
            imageQuality: rightQuality,
          })
        : Promise.resolve(null),
    ]);

    const leftSelected = choosePreferredSideAnalysis(visionLeft, localLeft);
    if (leftSelected) leftSelected.side = "left";
    const rightSelected = choosePreferredSideAnalysis(visionRight, localRight);
    if (rightSelected) rightSelected.side = "right";

    const analyses: SideAnalysisResult[] = [leftSelected, rightSelected].filter((item): item is SideAnalysisResult => Boolean(item));

    if (analyses.length === 0) {
      if (!hasVisionKey && typeof analyzePalmHandInput !== "function") {
        return errorResponse({
          status: 502,
          code: "ANALYSIS_ENGINE_UNAVAILABLE",
          reasonCode: "ENGINE_UNAVAILABLE",
          message: "손금 분석 엔진을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        });
      }

      const sideDebug = [
        {
          side: "left",
          hasFile: Boolean(normalizedLeft),
          mimeType: normalizedLeft?.mimeType || null,
          imageSize: normalizedLeft?.sizeBytes || 0,
          geminiDetected: visionLeft?.palmDetected || false,
          localDetected: localLeft?.palmDetected || false,
          qualityScore: Math.max(visionLeft?.qualityScore || 0, localLeft?.qualityScore || 0),
          detectedLines: Array.from(new Set([...(visionLeft?.detectedLineKeys || []), ...(localLeft?.detectedLineKeys || [])])),
        },
        {
          side: "right",
          hasFile: Boolean(normalizedRight),
          mimeType: normalizedRight?.mimeType || null,
          imageSize: normalizedRight?.sizeBytes || 0,
          geminiDetected: visionRight?.palmDetected || false,
          localDetected: localRight?.palmDetected || false,
          qualityScore: Math.max(visionRight?.qualityScore || 0, localRight?.qualityScore || 0),
          detectedLines: Array.from(new Set([...(visionRight?.detectedLineKeys || []), ...(localRight?.detectedLineKeys || [])])),
        },
      ].filter((row) => row.hasFile);

      return errorResponse({
        status: 422,
        code: "PALM_DETECTION_FAILED",
        error: "PALM_DETECTION_FAILED",
        reasonCode: "NO_PALM",
        message: "손바닥을 감지하지 못했습니다. 손바닥 전체가 화면 중앙에 오도록 다시 촬영해 주세요.",
        debug: {
          checks: sideDebug,
        },
      });
    }

    const getHandRole = (side: string, dom: string): "innate" | "acquired" | "mixed" | "unknown" => {
      if (dom === "both") return "mixed";
      if (dom === "right") return side === "right" ? "acquired" : "innate";
      if (dom === "left") return side === "left" ? "acquired" : "innate";
      return "unknown";
    };

    const uploadedHands = analyses.map((a) => a.side) as Array<"left" | "right">;
    const leftAnalysis = analyses.find((a) => a.side === "left") || null;
    const rightAnalysis = analyses.find((a) => a.side === "right") || null;
    const leftHandReading = leftAnalysis?.handReading || null;
    const rightHandReading = rightAnalysis?.handReading || null;

    const primarySide =
      (payload.uploadedHandSide.toLowerCase() === "left" || payload.uploadedHandSide.toLowerCase() === "right"
        ? (payload.uploadedHandSide.toLowerCase() as "left" | "right")
        : uploadedHands[0]) || "right";

    const primaryAnalysis = analyses.find((a) => a.side === primarySide) || analyses[0];
    const imageQuality =
      (primaryAnalysis.recognitionData?.imageQuality as Record<string, unknown> | undefined) || primaryAnalysis.imageQuality;

    const bothHandsComparison = buildBothHandsComparison({
      uploadedHands,
      dominantHand,
      leftHandRole: getHandRole("left", dominantHand),
      rightHandRole: getHandRole("right", dominantHand),
      leftHandReading,
      rightHandReading,
    });

    const mode = resolveAnalysisMode({
      palmDetected: true,
      qualityScore: Number(primaryAnalysis.qualityScore || 0),
      majorLineCount: majorLineDetectedCount(primaryAnalysis.handReading),
    });
    const missingData = collectMissingData(primaryAnalysis.handReading);
    const warnings = [
      mode !== "full" ? "이번 사진은 선이 조금 흐려서, 몇몇 내용은 가볍게 참고용으로 읽어 주세요." : "",
      formatMissingForUser(missingData),
    ].filter(Boolean);

    const specialPatternsRaw = (primaryAnalysis.recognitionData as Record<string, unknown> | null)?.specialPatterns as
      | { detected?: unknown[]; summary?: unknown }
      | undefined;
    const specialPatterns = {
      detected: Array.isArray(specialPatternsRaw?.detected)
        ? specialPatternsRaw.detected
            .filter((item) => Boolean(item) && typeof item === "object")
            .map((item) => {
              const row = item as Record<string, unknown>;
              const confidence = Number(row.confidence || 0);
              return {
                code: String(row.code || "").trim() as "m_shape" | "simian_line",
                label: String(row.label || "").trim() || "특수 손금",
                detected: true,
                confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
                summary: String(row.summary || "").trim(),
              };
            })
            .filter((item) => item.code === "m_shape" || item.code === "simian_line")
        : [],
      summary:
        typeof specialPatternsRaw?.summary === "string" && specialPatternsRaw.summary.trim().length > 0
          ? specialPatternsRaw.summary.trim()
          : "특수 손금은 이번 분석에서 명확히 감지되지 않았습니다.",
    };

    const canonicalBase: CanonicalPalmReading = createDefaultCanonicalPalmReading({
      dominantHand,
      analysisPurpose,
      uploadedHands,
      leftHandRole: getHandRole("left", dominantHand),
      rightHandRole: getHandRole("right", dominantHand),
      imageQuality,
      leftHandReading,
      rightHandReading,
      comparison: bothHandsComparison,
      specialPatterns,
      purposeAnalysis: toPurposeAnalysis(primaryAnalysis.purposeAnalysis),
    });

    const canonical: CanonicalPalmReading = {
      ...canonicalBase,
      validation: {
        ...canonicalBase.validation,
        hasPalm: true,
        hasEnoughQuality: mode !== "fallback" || canonicalBase.validation.hasEnoughQuality,
        missingFields: Array.from(new Set([...(canonicalBase.validation.missingFields || []), ...missingData])),
        analysisMode: mode === "full" ? "detailed" : "estimated",
        qualityWarning:
          mode === "full"
            ? null
            : "손바닥은 확인되었지만 선이 흐린 부분이 있어, 이번 리딩은 가볍게 참고하는 느낌으로 봐 주세요.",
      },
    };

    const interpretation = buildPalmInterpretationReport(canonical);

    const exposeDebug = shouldExposeDebug();

    const primaryReading = primaryAnalysis.handReading;

    const report = {
      oneLiner: String(interpretation.report?.oneLiner || interpretation.oneLiner || "이번 손금 리딩을 쉽고 재밌게 정리했어요."),
      summary: String(interpretation.report?.summary || "지금 흐름을 가볍고 이해하기 쉽게 읽어봤어요."),
      personality: String(interpretation.report?.personality || "당신의 매력과 성향 흐름을 부드럽게 정리했어요."),
      love: String(interpretation.report?.love || "연애운은 안정감과 대화 리듬이 핵심으로 읽혀요."),
      wealth: String(interpretation.report?.wealth || "재물운은 꾸준히 쌓을 때 더 잘 살아나는 흐름이에요."),
      career: String(interpretation.report?.career || "직업운은 내 방식과 실력을 쌓을수록 강해지는 흐름이에요."),
      relationship: String(interpretation.report?.relationship || "관계운은 솔직한 확인 대화가 운을 살려줘요."),
      healthEnergy: String(interpretation.report?.healthEnergy || "에너지는 무리보다 리듬 관리에서 더 좋아져요."),
      advice: String(interpretation.report?.advice || "오늘은 미뤄둔 일 하나를 끝내며 흐름을 열어보세요."),
      warnings: warnings[0] || "",
      tips: Array.isArray(interpretation.report?.tips)
        ? interpretation.report.tips.map((item) => String(item))
        : [],
    };

    const debugData = exposeDebug
      ? {
          palm: {
            handedness: primarySide,
            handShape: String(primaryReading.handShape.type || "unknown"),
            palmRatio: Number(primaryReading.handShape.palmRatio) || 0,
            fingerRatio: Number(primaryReading.handShape.fingerRatio) || 0,
          },
          lines: {
            lifeLine: lineFromMajor(primaryReading.majorLines.lifeLine),
            headLine: lineFromMajor(primaryReading.majorLines.headLine),
            heartLine: lineFromMajor(primaryReading.majorLines.heartLine),
            fateLine: lineFromMajor(primaryReading.majorLines.fateLine),
            sunLine: lineFromMinor(primaryReading.minorLines.sunLine),
            moneyLine: lineFromMinor(primaryReading.minorLines.moneyLine),
            marriageLine: lineFromMinor(primaryReading.minorLines.marriageLine),
          },
          mounts: {
            venus: { fullness: String(primaryReading.mounts.venus.fullness || "unknown"), meaning: String(primaryReading.mounts.venus.summary || "") },
            jupiter: { fullness: String(primaryReading.mounts.jupiter.fullness || "unknown"), meaning: String(primaryReading.mounts.jupiter.summary || "") },
            saturn: { fullness: String(primaryReading.mounts.saturn.fullness || "unknown"), meaning: String(primaryReading.mounts.saturn.summary || "") },
            sun: { fullness: String(primaryReading.mounts.sun.fullness || "unknown"), meaning: String(primaryReading.mounts.sun.summary || "") },
            mercury: { fullness: String(primaryReading.mounts.mercury.fullness || "unknown"), meaning: String(primaryReading.mounts.mercury.summary || "") },
            moon: { fullness: String(primaryReading.mounts.moon.fullness || "unknown"), meaning: String(primaryReading.mounts.moon.summary || "") },
            mars: { fullness: String(primaryReading.mounts.mars.fullness || "unknown"), meaning: String(primaryReading.mounts.mars.summary || "") },
          },
          recognitionData: {
            primarySide,
            primary: primaryAnalysis.recognitionData,
            bySide: {
              left: leftAnalysis?.recognitionData || null,
              right: rightAnalysis?.recognitionData || null,
            },
          },
        }
      : {};

    return NextResponse.json({
      ok: true,
      data: {
        mode,
        qualityScore: Number(Number(primaryAnalysis.qualityScore || 0).toFixed(4)),
        report,
        missingData,
        warnings,
        canonical,
        interpretation,
        ...debugData,
      },
    });
  } catch (error: unknown) {
    console.error("[Palm Analyze Route] Error:", error);
    return NextResponse.json({ ok: false, error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
