export const PRASHNA_FIXTURE_USER_ID = "507f1f77bcf86cd799439011";
export const PRASHNA_FIXTURE_ORDER_ID = "prashna_fixture_order_20260915";
export const PRASHNA_FIXTURE_EXECUTION_ID = `vedic-prashna:${PRASHNA_FIXTURE_USER_ID}:${PRASHNA_FIXTURE_ORDER_ID}`;

export const PRASHNA_FIXTURE_SNAPSHOT = Object.freeze({
  orderId: PRASHNA_FIXTURE_ORDER_ID,
  question: "지금 준비하는 이직을 진행해도 괜찮을까요?",
  askedAt: "2026-09-15T03:00:00.000Z",
  latitude: 37.5665,
  longitude: 126.978,
  snapshotHash: "prashna-fixture-snapshot-hash",
});

export const PRASHNA_FIXTURE_RESULT = Object.freeze({
  resultId: "prashna_result_fixture_20260915",
  chart: {
    ascendant: "Virgo",
    moonNakshatra: "Punarvasu",
    questionLord: "Mercury",
  },
  promptText: "저장된 질문 시각과 위치, 프라슈나 차트 계산값만 사용하는 결정론 프롬프트입니다.",
});

export function createPaidPrashnaExecution(overrides = {}) {
  const { result: resultOverrides = {}, ...recordOverrides } = overrides;
  const status = overrides.status || "generation_failed";
  const updatedAt = overrides.updatedAt || new Date("2026-09-15T03:00:00.000Z");
  return {
    _id: "paid-execution-prashna-fixture",
    executionId: PRASHNA_FIXTURE_EXECUTION_ID,
    requestId: PRASHNA_FIXTURE_ORDER_ID,
    idempotencyKey: PRASHNA_FIXTURE_ORDER_ID,
    orderId: PRASHNA_FIXTURE_ORDER_ID,
    userId: PRASHNA_FIXTURE_USER_ID,
    featureId: "vedic_prashna_prompt",
    profileId: "prashna",
    accessMode: "per_use",
    accessMethod: "single",
    amountCoins: 50,
    amountKRW: 5000,
    paymentId: "paid-prashna-transaction",
    status,
    createdAt: new Date("2026-09-15T03:00:00.000Z"),
    consumedAt: new Date("2026-09-15T03:00:01.000Z"),
    updatedAt,
    resultId: "",
    result: {
      order: {
        orderId: PRASHNA_FIXTURE_ORDER_ID,
        productCode: "PRASHNA_PROMPT_1",
        productName: "프라슈나 프롬프트",
        amount: 5000,
        currency: "KRW",
        paymentType: "ONE_TIME",
        paymentStatus: "PAID",
        generationStatus: status === "generating" ? "CALCULATING" : "FAILED",
        paidAt: "2026-09-15T03:00:01.000Z",
      },
      snapshot: structuredClone(PRASHNA_FIXTURE_SNAPSHOT),
      billing: {
        requestId: PRASHNA_FIXTURE_ORDER_ID,
        sourceTransactionId: "paid-prashna-transaction",
        chargedCoins: 50,
      },
      ...resultOverrides,
    },
    ...recordOverrides,
  };
}
