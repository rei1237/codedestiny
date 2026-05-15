/**
 * Palm UI state helpers used by UI and tests.
 */

function getPalmHandRoles(dominantHand) {
  if (dominantHand === "right") {
    return { leftHandRole: "innate", rightHandRole: "acquired" };
  }

  if (dominantHand === "left") {
    return { leftHandRole: "acquired", rightHandRole: "innate" };
  }

  if (dominantHand === "both") {
    return { leftHandRole: "mixed", rightHandRole: "mixed" };
  }

  return { leftHandRole: "unknown", rightHandRole: "unknown" };
}

function canStartPalmAnalysis(input) {
  const leftFile = input?.leftFile ?? null;
  const rightFile = input?.rightFile ?? null;
  const dominantHand = input?.dominantHand ?? "";
  const analysisPurpose = input?.analysisPurpose ?? "";
  const isSubmitting = Boolean(input?.isSubmitting);

  return Boolean((leftFile || rightFile) && dominantHand && analysisPurpose && !isSubmitting);
}

function mapPalmAnalyzeError(input) {
  const status = Number(input?.status || 0);
  const code = String(input?.code || "UNKNOWN_ERROR");
  const reasonCode = String(input?.reasonCode || "").toUpperCase();
  const message = String(input?.message || "분석 중 오류가 발생했습니다.");

  if (code === "LOGIN_REQUIRED" || status === 401) {
    return "로그인이 필요합니다. 로그인 후 다시 손금 분석을 시도해 주세요.";
  }

  if (code === "PALM_NOT_DETECTED" || code === "PALM_DETECTION_FAILED") {
    if (reasonCode === "LOW_CONFIDENCE") {
      return "손바닥이 또렷하게 보이지 않았어요. 손 전체가 화면 안에 들어오도록 밝은 곳에서 다시 찍어주세요.";
    }
    if (reasonCode === "NO_PALM") {
      return "이번 사진에서는 손바닥을 제대로 확인하기 어려웠어요. 손바닥을 활짝 펴고 그림자가 적은 곳에서 다시 촬영해 주세요.";
    }
    return "손바닥이 잘 보이지 않았어요. 손목부터 손가락 끝까지 화면에 담아 다시 촬영해 주세요.";
  }

  if (code === "IMAGE_QUALITY_LOW") {
    return "이번 사진만으로는 손금이 선명하게 보이지 않았어요. 밝은 곳에서 손바닥 전체가 또렷하게 보이게 다시 찍어주세요.";
  }

  if (code === "IMAGE_TOO_LARGE" || status === 413) {
    return "이미지 파일이 너무 큽니다. 25MB 이하 사진으로 다시 시도해 주세요.";
  }

  if (code === "UNSUPPORTED_IMAGE_TYPE" || status === 415) {
    return "지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP, HEIC/HEIF 사진을 업로드해 주세요.";
  }

  if (code === "IMAGE_TOO_SMALL") {
    return "손바닥이 화면에서 너무 작게 보여요. 손바닥을 더 크게 맞춰 다시 촬영해 주세요.";
  }

  if (status === 0) {
    return "요청이 취소되었습니다. 다시 분석을 시도해 주세요.";
  }

  return `분석 실패 (${status}/${code}): ${message}`;
}

function shouldShowPalmResult(canonicalPalmReading) {
  if (!canonicalPalmReading || typeof canonicalPalmReading !== "object") return false;
  const validation = canonicalPalmReading.validation;
  if (!validation || typeof validation !== "object") return false;
  return Boolean(validation.hasPalm);
}

function revokeObjectUrls(urls, revokeFn) {
  const disposer =
    typeof revokeFn === "function"
      ? revokeFn
      : typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function"
      ? URL.revokeObjectURL.bind(URL)
      : null;

  if (!disposer) return 0;

  let revoked = 0;
  for (const raw of urls || []) {
    if (typeof raw !== "string" || !raw) continue;
    disposer(raw);
    revoked += 1;
  }
  return revoked;
}

function createPalmUiResetSnapshot(options) {
  const keepSelection = Boolean(options?.keepSelection);
  return {
    leftHand: { file: null, previewUrl: null },
    rightHand: { file: null, previewUrl: null },
    analysisResult: null,
    isSubmitting: false,
    submitMessage: "",
    loadingPhaseIndex: 0,
    activeCardKey: "lifeLine",
    overlaySide: "right",
    dominantHand: keepSelection ? options?.dominantHand || "" : "",
    analysisPurpose: keepSelection ? options?.analysisPurpose || "" : "",
  };
}

module.exports = {
  getPalmHandRoles,
  canStartPalmAnalysis,
  mapPalmAnalyzeError,
  shouldShowPalmResult,
  revokeObjectUrls,
  createPalmUiResetSnapshot,
};
