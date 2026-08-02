import { createHttpError, handleRouteError, json, methodNotAllowed } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import palmMapEngine from "../../lib/palm/palm-map-engine.js";
import bothHandsComparisonLib from "../../lib/palm/both-hands-comparison.js";
import {
  analyzeHandWithGeminiVision,
  buildPalmDeepConsult,
  majorLineDetectedCount,
  resolveAnalysisMode,
  visionToSideAnalysis,
} from "../lib/palm-vision.js";

const { analyzePalmHandInput, applySafetyExpressionFilter } = palmMapEngine;
const { buildBothHandsComparison } = bothHandsComparisonLib;

// 이미지 2장이 base64 로 오므로 본문이 크다. 상한이 없으면 무제한 메모리 유입 경로가 된다.
// 클라이언트 상한(파일당 25MB) × 2 를 base64 팽창(4/3)까지 감안한 값.
const MAX_REQUEST_BODY_BYTES = 72 * 1024 * 1024;

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

function hasImage(sideData) {
  return typeof sideData?.image === "string" && sideData.image.length > 32;
}

/**
 * 본문 크기 상한을 건 JSON 리더.
 * 공용 readJson 은 무제한 request.text() 라 이 라우트(이미지 2장)에는 쓰지 않는다.
 */
async function readJsonWithLimit(request, maxBytes) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw createHttpError(413, "이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.", {
      code: "IMAGE_TOO_LARGE",
    });
  }

  const text = await request.text();
  if (text.length > maxBytes) {
    throw createHttpError(413, "이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.", {
      code: "IMAGE_TOO_LARGE",
    });
  }
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch (e) {
    throw createHttpError(400, "Request body must be valid JSON.", { code: "INVALID_JSON" });
  }
}

/**
 * 인증 게이트.
 * 🔴 DB 일시 장애를 확정 401 로 세탁하지 않는다 — 로그인 유저가 게스트로 강등되면
 *    결제/이용권 경로가 통째로 어긋난다. 인프라 오류는 503 으로 표면화한다.
 */
async function requirePalmAuth(request, env) {
  try {
    return await requireAuth(request, env);
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      throw createHttpError(503, "일시적인 접속 문제로 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.", {
        code: "AUTH_TEMPORARILY_UNAVAILABLE",
      });
    }
    throw createHttpError(401, "로그인이 필요합니다.", { code: "LOGIN_REQUIRED" });
  }
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
    specialPatterns: params.specialPatterns,
    validation: {
      hasPalm: false,
      hasEnoughQuality: false,
      hasMajorLines: false,
      missingFields: [],
    },
  };

  const missingFields = [];
  const hasPalm = canonical.handContext.uploadedHands.length > 0 && canonical.imageQuality.isPalmDetected === true;
  if (!hasPalm) missingFields.push("handContext.uploadedHands");

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

  const qualityByImage =
    canonical.imageQuality.isPalmDetected &&
    canonical.imageQuality.sharpness !== "blurry" &&
    canonical.imageQuality.brightness !== "dark" &&
    canonical.imageQuality.palmCoverage >= 0.42;

  const hasEnoughQuality = qualityByImage || hasMajorLines;

  if (!canonical.imageQuality.isPalmDetected) missingFields.push("imageQuality.isPalmDetected");
  if (!hasMajorLines && canonical.imageQuality.palmCoverage < 0.42) {
    missingFields.push("imageQuality.palmCoverage");
  }

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
    // 🔴 인증 필수. 이 라우트는 Gemini Vision(사진 최대 2장)을 태우는 유료 경로라,
    //    무인증이면 무제한 무과금 비용 경로가 된다.
    await requirePalmAuth(request, env);

    const body = await readJsonWithLimit(request, MAX_REQUEST_BODY_BYTES);

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

    // 결정론 엔진(선 후보 기반). Gemini 가 실패했을 때의 degrade 대상이자
    // 오버레이 좌표(overlayPaths)의 공급원이다 — Gemini 는 좌표를 주지 않는다.
    const runLocalEngine = (side, input) =>
      analyzePalmHandInput({
        uploadedHandSide: side,
        dominantHand: payload.dominantHand,
        analysisPurpose: payload.analysisPurpose,
        rawImage: input.image,
        imageQuality: input.quality,
        handLandmarks: input.landmarks,
        lineCandidates: input.candidates,
      });

    // 이미지가 있는 손은 Gemini Vision 으로 판독한다. 양손이면 병렬.
    // 실패는 null 로 떨어지고(모듈 내부에서 로깅), 아래에서 결정론 엔진으로 degrade 한다.
    const [leftVision, rightVision] = await Promise.all([
      hasImage(leftInput)
        ? analyzeHandWithGeminiVision(env, leftInput.image, "left", payload.analysisPurpose, trace)
        : Promise.resolve(null),
      hasImage(rightInput)
        ? analyzeHandWithGeminiVision(env, rightInput.image, "right", payload.analysisPurpose, trace)
        : Promise.resolve(null),
    ]);

    const buildSideAnalysis = (side, input, vision) => {
      if (!hasMeaningfulInput(input)) return null;

      const local = runLocalEngine(side, input);
      const visionSide = visionToSideAnalysis(vision, side);

      // Gemini 가 "손이 아니다"라고 명시적으로 판정하면 그 판정을 존중한다.
      // 결정론 엔진은 조작 랜드마크만으로도 palmDetected 를 내주기 때문에,
      // 이걸 안 막으면 손이 아닌 사진에도 판독이 나온다.
      const visionRejected = Boolean(vision) && vision.palmDetected === false;

      // Gemini 판독 성공 → Gemini 를 본문으로, 로컬 엔진은 좌표/보조 데이터로 사용.
      if (visionSide?.palmDetected) {
        return {
          side,
          source: "gemini",
          handReading: visionSide.handReading,
          recognitionData: {
            ...visionSide.recognitionData,
            extraction: local?.recognitionData?.extraction || null,
            sections: local?.recognitionData?.sections || [],
          },
          overlayPaths: local?.overlayPaths || null,
          hasMajorDetected: majorLineDetectedCount(visionSide.handReading) > 0,
          handRole: local?.handRole || "unknown",
          purposeAnalysis: visionSide.purposeAnalysis,
          specialMarks: visionSide.specialMarks,
          qualityScore: visionSide.qualityScore,
          notPalmReason: "",
        };
      }

      return {
        side,
        source: visionRejected ? "vision-rejected" : "local",
        handReading: local.handReading,
        recognitionData: visionRejected
          ? { ...local.recognitionData, palmDetected: false }
          : local.recognitionData,
        overlayPaths: local.overlayPaths,
        hasMajorDetected: visionRejected ? false : local.hasMajorDetected,
        handRole: local.handRole,
        purposeAnalysis: null,
        specialMarks: [],
        qualityScore: 0,
        notPalmReason: visionRejected ? String(vision.notPalmReason || "") : "",
      };
    };

    const analyses = [
      buildSideAnalysis("left", leftInput, leftVision),
      buildSideAnalysis("right", rightInput, rightVision),
    ].filter(Boolean);

    const palmDetectedAny = analyses.some((a) => a?.recognitionData?.palmDetected);
    if (!palmDetectedAny) {
      // Gemini 가 이유를 말해줬으면 그대로 전달한다("손이 아닌 사진입니다" 등).
      // 종전에는 어떤 경우든 "손바닥 인식에 실패했습니다" 하나뿐이라 사용자가
      // 무엇을 고쳐야 하는지 알 수 없었다.
      const visionReason = analyses.map((a) => a.notPalmReason).find((reason) => reason) || "";
      return json(
        {
          ok: false,
          code: "PALM_NOT_DETECTED",
          reasonCode: "NO_PALM",
          error: visionReason || "손바닥 인식에 실패했습니다.",
          reason: visionReason,
          checks: analyses.map((item) => ({
            side: item.side,
            source: item.source,
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
          reasonCode: "LOW_CONFIDENCE",
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

    const patternByCode = new Map();
    const mergePattern = (item, labelKey) => {
      if (!item || typeof item !== "object") return;
      const code = String(item.code || "").trim();
      if (!code) return;
      const confidence = Number(item.confidence || 0);
      const prev = patternByCode.get(code);
      if (prev && Number(prev.confidence || 0) >= confidence) return;
      patternByCode.set(code, {
        code,
        label: String(item[labelKey] || item.label || item.labelKo || code),
        detected: true,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        summary: String(item.summary || ""),
        location: String(item.location || ""),
      });
    };

    for (const analysis of analyses) {
      for (const item of analysis?.recognitionData?.specialPatterns?.detected || []) {
        mergePattern(item, "label");
      }
      // Gemini 가 본 문양(십자문·삼각문·별문·섬문·사각문·격자문).
      // palm-vision 에서 detected!==true 또는 confidence<=0 인 항목은 이미 걸러져 온다.
      for (const item of analysis?.specialMarks || []) {
        mergePattern(item, "labelKo");
      }
    }

    const specialPatterns = {
      detected: Array.from(patternByCode.values()),
      summary:
        patternByCode.size > 0
          ? Array.from(patternByCode.values())
              .map((item) => String(item.label || item.code))
              .join(", ")
          : "특수 손금은 이번 분석에서 명확히 감지되지 않았습니다.",
    };

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
      specialPatterns,
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

    const usedVision = analyses.some((a) => a.source === "gemini");
    const primaryAnalysis = analyses.find((a) => a.side === primarySide) || analyses[0] || null;
    const qualityScore = Math.max(0, ...analyses.map((a) => Number(a.qualityScore) || 0));
    const mode = resolveAnalysisMode({
      palmDetected: true,
      qualityScore: qualityScore || (canonical.validation.hasEnoughQuality ? 0.62 : 0.45),
      majorLineCount: Math.max(
        majorLineDetectedCount(leftHandReading),
        majorLineDetectedCount(rightHandReading),
      ),
    });

    // 심층 해석. 구 palm-reading-ai-consult(별도 5,000원 과금)가 하던 일을 기본 분석에 통합했다.
    // 🔴 실패해도 throw 하지 않는다 — 결제된 요청은 결과를 반드시 전달한다(degrade-not-throw).
    //    해석이 비면 클라이언트가 기존 로컬 템플릿으로 폴백하므로 화면이 비지 않는다.
    const deepConsult = await buildPalmDeepConsult(
      env,
      {
        analysisPurpose: payload.analysisPurpose,
        dominantHand: payload.dominantHand,
        uploadedHands,
        leftHandRole: leftAnalysis?.handRole || "unknown",
        rightHandRole: rightAnalysis?.handRole || "unknown",
        mode,
        qualityScore,
        leftHandReading,
        rightHandReading,
        bothHandsComparison,
        specialMarks: specialPatterns.detected,
        missingData: canonical.validation.missingFields,
      },
      trace,
    ).catch((error) => {
      console.warn("[palm] deep consult threw", { message: error?.message });
      return null;
    });

    // 안전 표현 필터를 LLM 산출물에도 적용한다(수명/질병 단정 등).
    // 결정론 엔진 텍스트에만 걸려 있던 가드를 Gemini 문장에도 동일하게 건다.
    const consultText = deepConsult?.text ? applySafetyExpressionFilter(deepConsult.text) : "";

    const purposeAnalysis = primaryAnalysis?.purposeAnalysis
      || analyses.find((a) => a.purposeAnalysis)?.purposeAnalysis
      || null;

    return json({
      ...canonical,
      interpretation: consultText
        ? {
            oneLiner: "",
            focusSummary: "",
            sections: [],
            cards: [],
            consultText,
            policy: {
              imageDirectVisionUsed: usedVision,
              provider: deepConsult?.provider || "",
            },
          }
        : null,
      purposeAnalysis,
      overlayPaths,
      overlayPathsBySide,
      recognitionData,
      specialPatterns,
      resultSections,
      missingData: canonical.validation.missingFields,
      warnings: imageQuality.warnings || [],
      mode,
      visionUsed: usedVision,
      qualityScore,
    });
  } catch (error) {
    return handleRouteError(error, { request, env, trace });
  }
}
