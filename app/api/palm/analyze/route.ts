import { NextRequest, NextResponse } from "next/server";
import {
  createDefaultCanonicalPalmReading,
  type CanonicalPalmReading,
  type PalmAnalysisPurpose,
  type PalmDominantHand,
} from "@/types/palm-reading";
import { buildPalmInterpretationReport } from "@/lib/palm/interpretation-engine";
import { buildBothHandsComparison } from "@/lib/palm/both-hands-comparison";
import { analyzePalmHandInput } from "@/lib/palm/palm-map-engine";
import { requireRouteAuth } from "@/app/_lib/route-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

type RawImageInput = File | string | Record<string, unknown> | null | undefined;

type ParsedPayload = {
  uploadedHandSide: string;
  leftPalmImage: RawImageInput;
  rightPalmImage: RawImageInput;
  leftHandLandmarks: Record<string, unknown> | null;
  rightHandLandmarks: Record<string, unknown> | null;
  leftLineCandidates: Array<Record<string, unknown>>;
  rightLineCandidates: Array<Record<string, unknown>>;
  leftImageQuality: Record<string, unknown> | null;
  rightImageQuality: Record<string, unknown> | null;
  handLandmarks: Record<string, unknown> | null;
  lineCandidates: Array<Record<string, unknown>>;
  imageQuality: Record<string, unknown> | null;
  dominantHand: string;
  analysisPurpose: string;
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

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toCandidateArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

async function parsePayload(req: NextRequest): Promise<ParsedPayload> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return {
      uploadedHandSide: toNonEmptyString(form.get("uploadedHandSide")),
      leftPalmImage: (form.get("leftPalmImage") as RawImageInput) ?? null,
      rightPalmImage: (form.get("rightPalmImage") as RawImageInput) ?? null,
      leftHandLandmarks: toObject(form.get("leftHandLandmarks")),
      rightHandLandmarks: toObject(form.get("rightHandLandmarks")),
      leftLineCandidates: toCandidateArray(form.get("leftLineCandidates")),
      rightLineCandidates: toCandidateArray(form.get("rightLineCandidates")),
      leftImageQuality: toObject(form.get("leftImageQuality")),
      rightImageQuality: toObject(form.get("rightImageQuality")),
      handLandmarks: toObject(form.get("handLandmarks")),
      lineCandidates: toCandidateArray(form.get("lineCandidates")),
      imageQuality: toObject(form.get("imageQuality")),
      dominantHand: toNonEmptyString(form.get("dominantHand")),
      analysisPurpose: toNonEmptyString(form.get("analysisPurpose")),
    };
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  return {
    uploadedHandSide: toNonEmptyString(body.uploadedHandSide),
    leftPalmImage: (body.leftPalmImage as RawImageInput) ?? null,
    rightPalmImage: (body.rightPalmImage as RawImageInput) ?? null,
    leftHandLandmarks: toObject(body.leftHandLandmarks),
    rightHandLandmarks: toObject(body.rightHandLandmarks),
    leftLineCandidates: toCandidateArray(body.leftLineCandidates),
    rightLineCandidates: toCandidateArray(body.rightLineCandidates),
    leftImageQuality: toObject(body.leftImageQuality),
    rightImageQuality: toObject(body.rightImageQuality),
    handLandmarks: toObject(body.handLandmarks),
    lineCandidates: toCandidateArray(body.lineCandidates),
    imageQuality: toObject(body.imageQuality),
    dominantHand: toNonEmptyString(body.dominantHand),
    analysisPurpose: toNonEmptyString(body.analysisPurpose),
  };
}

function hasMeaningfulInput(sideData: {
  image: RawImageInput;
  landmarks: Record<string, unknown> | null;
  candidates: Array<Record<string, unknown>>;
}) {
  return Boolean(sideData.image || sideData.landmarks || sideData.candidates.length > 0);
}

function toSide(side: "left" | "right", payload: ParsedPayload) {
  const genericSide = payload.uploadedHandSide.toLowerCase();
  const useGeneric = genericSide === side;

  const image = side === "left" ? payload.leftPalmImage : payload.rightPalmImage;
  const landmarks =
    (side === "left" ? payload.leftHandLandmarks : payload.rightHandLandmarks) || (useGeneric ? payload.handLandmarks : null);
  const candidates =
    (side === "left" ? payload.leftLineCandidates : payload.rightLineCandidates) || (useGeneric ? payload.lineCandidates : []);
  const quality =
    (side === "left" ? payload.leftImageQuality : payload.rightImageQuality) || (useGeneric ? payload.imageQuality : null);

  return {
    image,
    landmarks,
    candidates,
    quality,
  };
}

function isEnoughQuality(recognition: any) {
  const q = recognition?.imageQuality || {};
  return Boolean(
    recognition?.palmDetected &&
      q.brightness !== "dark" &&
      q.sharpness !== "blurry" &&
      q.contrast !== "low" &&
      Number(q.palmCoverage || 0) >= 0.42,
  );
}

function pickRepresentativeImageQuality(analyses: Array<{ side: "left" | "right"; recognitionData: any }>) {
  const hasPalm = analyses.some((a) => a?.recognitionData?.palmDetected);
  const preferred = analyses.find((a) => isEnoughQuality(a.recognitionData)) || analyses.find((a) => a?.recognitionData?.palmDetected) || analyses[0];
  const q = preferred?.recognitionData?.imageQuality || {};
  const warnings: string[] = [];
  for (const entry of analyses) {
    const list = entry?.recognitionData?.extraction?.warnings;
    if (Array.isArray(list)) {
      warnings.push(...list.map((w) => String(w)));
    }
  }
  return {
    isPalmDetected: hasPalm,
    handSide: analyses.length === 2 ? "unknown" : analyses[0]?.side || "unknown",
    brightness: q.brightness || "normal",
    sharpness: q.sharpness || "normal",
    palmCoverage: Number(q.palmCoverage || 0),
    rotation: 0,
    warnings,
  } as const;
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (!auth.ok) return auth.response;

    const payload = await parsePayload(req);
    const dominantHand = normalizeDominantHand(payload.dominantHand);
    const analysisPurpose = normalizeAnalysisPurpose(payload.analysisPurpose);

    const leftInput = toSide("left", payload);
    const rightInput = toSide("right", payload);

    if (!hasMeaningfulInput(leftInput) && !hasMeaningfulInput(rightInput)) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_IMAGE",
          error: "left/right 입력 중 최소 하나는 이미지 또는 인식 데이터(lineCandidates/handLandmarks)가 필요합니다.",
        },
        { status: 400 },
      );
    }

    if (!dominantHand) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_DOMINANT_HAND",
          error: "dominantHand 입력이 필요합니다.",
        },
        { status: 400 },
      );
    }

    if (!analysisPurpose) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_ANALYSIS_PURPOSE",
          error: "analysisPurpose 입력이 필요합니다.",
        },
        { status: 400 },
      );
    }

    const analyses: Array<{
      side: "left" | "right";
      handReading: any;
      recognitionData: any;
      overlayPaths: any;
      hasMajorDetected: boolean;
      handRole: string;
    }> = [];

    if (hasMeaningfulInput(leftInput)) {
      const left = analyzePalmHandInput({
        uploadedHandSide: "left",
        dominantHand,
        analysisPurpose,
        rawImage: leftInput.image,
        imageQuality: leftInput.quality,
        handLandmarks: leftInput.landmarks,
        lineCandidates: leftInput.candidates,
      });
      analyses.push({
        side: "left",
        handReading: left.handReading,
        recognitionData: left.recognitionData,
        overlayPaths: left.overlayPaths,
        hasMajorDetected: left.hasMajorDetected,
        handRole: left.handRole,
      });
    }

    if (hasMeaningfulInput(rightInput)) {
      const right = analyzePalmHandInput({
        uploadedHandSide: "right",
        dominantHand,
        analysisPurpose,
        rawImage: rightInput.image,
        imageQuality: rightInput.quality,
        handLandmarks: rightInput.landmarks,
        lineCandidates: rightInput.candidates,
      });
      analyses.push({
        side: "right",
        handReading: right.handReading,
        recognitionData: right.recognitionData,
        overlayPaths: right.overlayPaths,
        hasMajorDetected: right.hasMajorDetected,
        handRole: right.handRole,
      });
    }

    const palmDetectedAny = analyses.some((a) => a?.recognitionData?.palmDetected);
    if (!palmDetectedAny) {
      return NextResponse.json(
        {
          ok: false,
          code: "PALM_NOT_DETECTED",
          error: "손바닥 인식에 실패했습니다.",
          checks: analyses.map((item) => ({
            side: item.side,
            isPalmDetected: item?.recognitionData?.palmDetected,
            warnings: item?.recognitionData?.extraction?.warnings || [],
          })),
        },
        { status: 422 },
      );
    }

    const hasEnoughQualityAny = analyses.some((a) => isEnoughQuality(a.recognitionData));
    const hasLineEvidenceAny = analyses.some((a) => a.hasMajorDetected);
    if (!hasEnoughQualityAny && !hasLineEvidenceAny) {
      return NextResponse.json(
        {
          ok: false,
          code: "IMAGE_QUALITY_LOW",
          error: "이미지 품질이 부족합니다.",
          checks: analyses.map((item) => ({
            side: item.side,
            brightness: item?.recognitionData?.imageQuality?.brightness,
            sharpness: item?.recognitionData?.imageQuality?.sharpness,
            palmCoverage: item?.recognitionData?.imageQuality?.palmCoverage,
            warnings: item?.recognitionData?.extraction?.warnings || [],
          })),
        },
        { status: 423 },
      );
    }

    const uploadedHands = analyses.map((a) => a.side) as Array<"left" | "right">;
    const leftAnalysis = analyses.find((a) => a.side === "left") || null;
    const rightAnalysis = analyses.find((a) => a.side === "right") || null;

    const leftHandReading = leftAnalysis?.handReading || null;
    const rightHandReading = rightAnalysis?.handReading || null;

    const imageQuality = pickRepresentativeImageQuality(analyses as any);
    const bothHandsComparison = buildBothHandsComparison({
      uploadedHands,
      dominantHand,
      leftHandRole: leftAnalysis?.handRole || "unknown",
      rightHandRole: rightAnalysis?.handRole || "unknown",
      leftHandReading,
      rightHandReading,
    });

    const primarySide =
      (payload.uploadedHandSide.toLowerCase() === "left" || payload.uploadedHandSide.toLowerCase() === "right"
        ? (payload.uploadedHandSide.toLowerCase() as "left" | "right")
        : uploadedHands[0]) || "right";

    const primaryRecognition =
      analyses.find((a) => a.side === primarySide)?.recognitionData || analyses[0]?.recognitionData || null;

    const canonical: CanonicalPalmReading = createDefaultCanonicalPalmReading({
      dominantHand,
      analysisPurpose,
      uploadedHands,
      leftHandRole: leftAnalysis?.handRole || "unknown",
      rightHandRole: rightAnalysis?.handRole || "unknown",
      imageQuality,
      leftHandReading,
      rightHandReading,
      comparison: bothHandsComparison,
    });

    const interpretation = buildPalmInterpretationReport(canonical);

    const overlayPathsBySide = {
      left: leftAnalysis?.overlayPaths || null,
      right: rightAnalysis?.overlayPaths || null,
    };

    const overlayPaths =
      overlayPathsBySide[primarySide] || leftAnalysis?.overlayPaths || rightAnalysis?.overlayPaths || null;

    const recognitionData = {
      primarySide,
      primary: primaryRecognition,
      bySide: {
        left: leftAnalysis?.recognitionData || null,
        right: rightAnalysis?.recognitionData || null,
      },
    };

    const resultSections = Array.isArray(primaryRecognition?.sections) ? primaryRecognition.sections : [];

    return NextResponse.json({
      ...canonical,
      interpretation,
      overlayPaths,
      overlayPathsBySide,
      recognitionData,
      resultSections,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
