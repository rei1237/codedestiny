export function resultStorageUnavailable(resultId = "") {
  const error = new Error("결과 저장을 확인하지 못했어요. 같은 요청으로 다시 시도해 주세요.");
  error.code = "RESULT_STORAGE_UNAVAILABLE";
  error.status = 503;
  error.resultId = String(resultId || "");
  return error;
}

export function resultStorageFailurePayload(error) {
  return { ok: false, retryable: true, reason: "RESULT_STORAGE_UNAVAILABLE", resultId: String(error?.resultId || ""), message: "결과 저장을 확인하지 못했어요. 추가 결제 없이 같은 요청으로 다시 시도해 주세요." };
}
