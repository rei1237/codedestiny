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
  const message = String(input?.message || "분석 중 오류가 발생했습니다.");

  if (code === "PALM_NOT_DETECTED") {
    return "손바닥 인식 실패: 손등/얼굴/배경 이미지일 수 있습니다. 손바닥 전체가 보이도록 다시 촬영해 주세요.";
  }

  if (code === "IMAGE_QUALITY_LOW") {
    return "이미지가 흐리거나 어두워 재촬영이 필요합니다. 밝은 환경에서 손바닥 선이 선명하게 보이도록 다시 촬영해 주세요.";
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
