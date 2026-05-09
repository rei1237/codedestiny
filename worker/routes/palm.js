import { createHttpError, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import palmMapEngine from "../../lib/palm/palm-map-engine.js";
import bothHandsComparisonLib from "../../lib/palm/both-hands-comparison.js";

const { analyzePalmHandInput } = palmMapEngine;
const { buildBothHandsComparison } = bothHandsComparisonLib;

function normalizeDominantHand(value) {
  const lowered = String(value || "").trim().toLowerCase();
  if (lowered === "left" || lowered === "right" || lowered === "both") return lowered;
  return null;
}

function normalizeAnalysisPurpose(value) {
  const lowered = String(value || "").trim().toLowerCase();
  if (lowered === "overall") return "general";
  if (["general", "love", "wealth", "career", "personality", "relationship"].includes(lowered)) return lowered;
  return null;
}

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function toCandidateArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
}

function hasMeaningfulInput(sideData) {
  return Boolean(sideData.image || sideData.landmarks || sideData.candidates.length > 0);
}

function toSide(payload, side) {
  return {
    image: side === "left" ? payload.leftPalmImage : payload.rightPalmImage,
    landmarks: side === "left" ? payload.leftHandLandmarks : payload.rightHandLandmarks,
    candidates: side === "left" ? payload.leftLineCandidates : payload.rightLineCandidates,
    quality: side === "left" ? payload.leftImageQuality : payload.rightImageQuality,
  };
}

function isEnoughQuality(recognition) {
  const q = recognition?.imageQuality || {};
  return Boolean(
    recognition?.palmDetected &&
      q.brightness !== "dark" &&
      q.sharpness !== "blurry" &&
      q.contrast !== "low" &&
      Number(q.palmCoverage || 0) >= 0.42,
  );
}

function pickRepresentativeImageQuality(analyses) {
  const hasPalm = analyses.some((a) => a?.recognitionData?.palmDetected);
  const preferred =
    analyses.find((a) => isEnoughQuality(a.recognitionData)) ||
    analyses.find((a) => a?.recognitionData?.palmDetected) ||
    analyses[0];
  const q = preferred?.recognitionData?.imageQuality || {};
  const warnings = [];
  for (let i = 0; i < analyses.length; i += 1) {
    const list = analyses[i]?.recognitionData?.extraction?.warnings;
    if (Array.isArray(list)) warnings.push(...list.map((w) => String(w)));
  }

  return {
    isPalmDetected: hasPalm,
    handSide: analyses.length === 2 ? "unknown" : analyses[0]?.side || "unknown",
    brightness: q.brightness || "normal",
    sharpness: q.sharpness || "normal",
    palmCoverage: Number(q.palmCoverage || 0),
    rotation: Number(q.rotation || 0),
    warnings,
  };
}

function buildCanonical(params) {
  const canonical = {
    reportType: "palm-reading",
    profile: {
      dominantHand: params.dominantHand,
      analysisPurpose: params.analysisPurpose,
    },
    handContext: {
      uploadedHands: params.uploadedHands,
      leftHandRole: params.leftHandRole,
      rightHandRole: params.rightHandRole,
      interpretationBasis: {
        innateMeaning: "타고난 기질, 잠재력, 본래 성향, 무의식적 패턴",
        acquiredMeaning: "현재의 성향, 후천적 변화, 사회적 자아, 현재 삶의 흐름",
        mixedMeaning: "선천성과 후천성이 함께 반영된 손",
      },
    },
    imageQuality: params.imageQuality,
    leftHandReading: params.leftHandReading,
    rightHandReading: params.rightHandReading,
    bothHandsComparison: params.bothHandsComparison,
    validation: {
      hasPalm: false,
      hasEnoughQuality: false,
      hasMajorLines: false,
      missingFields: [],
    },
  };

  const missingFields = [];
  const hasPalm = canonical.handContext.uploadedHands.length > 0;
  if (!hasPalm) missingFields.push("handContext.uploadedHands");

  const hasEnoughQuality =
    canonical.imageQuality.isPalmDetected &&
    canonical.imageQuality.sharpness !== "blurry" &&
    canonical.imageQuality.brightness !== "dark" &&
    canonical.imageQuality.palmCoverage >= 0.42;

  if (!canonical.imageQuality.isPalmDetected) missingFields.push("imageQuality.isPalmDetected");
  if (canonical.imageQuality.palmCoverage < 0.42) missingFields.push("imageQuality.palmCoverage");

  const hasLeftMajor =
    canonical.leftHandReading?.majorLines?.lifeLine?.detected ||
    canonical.leftHandReading?.majorLines?.headLine?.detected ||
    canonical.leftHandReading?.majorLines?.heartLine?.detected ||
    canonical.leftHandReading?.majorLines?.fateLine?.detected ||
    false;

  const hasRightMajor =
    canonical.rightHandReading?.majorLines?.lifeLine?.detected ||
    canonical.rightHandReading?.majorLines?.headLine?.detected ||
    canonical.rightHandReading?.majorLines?.heartLine?.detected ||
    canonical.rightHandReading?.majorLines?.fateLine?.detected ||
    false;

  const hasMajorLines = hasLeftMajor || hasRightMajor;
  if (!hasMajorLines) missingFields.push("majorLines");

  canonical.validation = {
    hasPalm,
    hasEnoughQuality,
    hasMajorLines,
    missingFields,
  };

  return canonical;
}

export async function handlePalmRoutes(request, env) {
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed();
  }

  const trace = {
    route: "palm",
    method: request.method,
  };

  try {
    const body = await readJson(request);

    const payload = {
      leftPalmImage: body.leftPalmImage ?? null,
      rightPalmImage: body.rightPalmImage ?? null,
      leftHandLandmarks: toObject(body.leftHandLandmarks),
      rightHandLandmarks: toObject(body.rightHandLandmarks),
      leftLineCandidates: toCandidateArray(body.leftLineCandidates),
      rightLineCandidates: toCandidateArray(body.rightLineCandidates),
      leftImageQuality: toObject(body.leftImageQuality),
      rightImageQuality: toObject(body.rightImageQuality),
      dominantHand: normalizeDominantHand(body.dominantHand),
      analysisPurpose: normalizeAnalysisPurpose(body.analysisPurpose),
    };

    if (!payload.dominantHand) {
      throw createHttpError(400, "dominantHand 입력이 필요합니다.", { code: "MISSING_DOMINANT_HAND" });
    }
    if (!payload.analysisPurpose) {
      throw createHttpError(400, "analysisPurpose 입력이 필요합니다.", { code: "MISSING_ANALYSIS_PURPOSE" });
    }

    const leftInput = toSide(payload, "left");
    const rightInput = toSide(payload, "right");

    if (!hasMeaningfulInput(leftInput) && !hasMeaningfulInput(rightInput)) {
      throw createHttpError(400, "left/right 입력 중 최소 하나는 이미지 또는 인식 데이터(lineCandidates/handLandmarks)가 필요합니다.", {
        code: "MISSING_IMAGE",
      });
    }

    const analyses = [];

    if (hasMeaningfulInput(leftInput)) {
      const left = analyzePalmHandInput({
        uploadedHandSide: "left",
        dominantHand: payload.dominantHand,
        analysisPurpose: payload.analysisPurpose,
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
        dominantHand: payload.dominantHand,
        analysisPurpose: payload.analysisPurpose,
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
      return json(
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
      return json(
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

    const uploadedHands = analyses.map((a) => a.side);
    const leftAnalysis = analyses.find((a) => a.side === "left") || null;
    const rightAnalysis = analyses.find((a) => a.side === "right") || null;

    const leftHandReading = leftAnalysis?.handReading || null;
    const rightHandReading = rightAnalysis?.handReading || null;

    const imageQuality = pickRepresentativeImageQuality(analyses);
    const bothHandsComparison = buildBothHandsComparison({
      uploadedHands,
      dominantHand: payload.dominantHand,
      leftHandRole: leftAnalysis?.handRole || "unknown",
      rightHandRole: rightAnalysis?.handRole || "unknown",
      leftHandReading,
      rightHandReading,
    });

    const primarySide = uploadedHands[0] || "right";
    const primaryRecognition = analyses.find((a) => a.side === primarySide)?.recognitionData || analyses[0]?.recognitionData || null;

    const canonical = buildCanonical({
      dominantHand: payload.dominantHand,
      analysisPurpose: payload.analysisPurpose,
      uploadedHands,
      leftHandRole: leftAnalysis?.handRole || "unknown",
      rightHandRole: rightAnalysis?.handRole || "unknown",
      imageQuality,
      leftHandReading,
      rightHandReading,
      bothHandsComparison,
    });

    const overlayPathsBySide = {
      left: leftAnalysis?.overlayPaths || null,
      right: rightAnalysis?.overlayPaths || null,
    };

    const overlayPaths = overlayPathsBySide[primarySide] || leftAnalysis?.overlayPaths || rightAnalysis?.overlayPaths || null;

    const recognitionData = {
      primarySide,
      primary: primaryRecognition,
      bySide: {
        left: leftAnalysis?.recognitionData || null,
        right: rightAnalysis?.recognitionData || null,
      },
    };

    const resultSections = Array.isArray(primaryRecognition?.sections) ? primaryRecognition.sections : [];

    return json({
      ...canonical,
      interpretation: null,
      overlayPaths,
      overlayPathsBySide,
      recognitionData,
      resultSections,
    });
  } catch (error) {
    return handleRouteError(error, { request, env, trace });
  }
}
