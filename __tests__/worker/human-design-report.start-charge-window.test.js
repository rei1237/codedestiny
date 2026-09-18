/**
 * @jest-environment node
 *
 * 결제는 됐는데 되돌릴 자리가 없던 창의 회귀 테스트.
 *
 * verifyPerUsePayment 는 조회 전용이 아니다 — 코인/이용권으로 통과시키면 그 자리에서 차감한다.
 * 예전에는 그 호출과 openRefundableExecution 사이에 실패 반환이 셋 있었고, 셋 다 차감만 남기고
 * 실행 기록 없이 끝났다(2026-09-19 실측: verify 1회 / start 0회):
 *   ① 502 EPHEMERIS_UNAVAILABLE  — 차트 계산 예외
 *   ② 500 CALCULATION_INCOMPLETE — 확정표 조립 fail-closed
 *   ③ 503                        — 저장부 resultStorageUnavailable
 * 기록이 없으면 만료 스윕(sweepStaleServiceExecutions)도 잠글 건이 없어 회수 경로가 아예 없다.
 *
 * 🔴 그래서 실행 기록은 **증빙 직후** 열려야 한다. 열리는 위치를 저장부 뒤로 되돌리면 ①②③ 이
 *    함께 깨진다 — 이 파일이 지키는 것은 "환불이 배선돼 있다" 가 아니라 "차감과 기록 사이에
 *    실패 창이 없다" 이다.
 *
 * 🔴 확정표 조립 함수(buildHumanDesignFactSnapshot/buildAllowedIds)는 **대역하지 않는다**.
 *    start-revive 스위트가 그 둘을 덮기 때문에 fail-closed 경로가 거기서는 증명되지 않는다.
 */
import { jest } from "@jest/globals";

const USER_ID = "64b7f2a1c3d4e5f601234567";
const ENV = { GEMINIF_API_KEY: "test-key" };

const BIRTH = {
  birthDate: "1991-02-20",
  birthTime: "08:30",
  timezone: "Asia/Seoul",
  calendar: "solar",
  city: "전주",
  country: "KR",
};

/** ensureHumanDesignCalculationPresence 를 통과하는 온전한 차트. */
const COMPLETE_CALCULATION = {
  calculationVersion: "hd-test",
  type: "Generator",
  strategy: "응답하기",
  authority: "Sacral",
  profile: "3/5",
  definition: "Single",
  signature: "Satisfaction",
  notSelfTheme: "Frustration",
  activations: Array.from({ length: 26 }, (_, i) => ({ gate: (i % 64) + 1, line: (i % 6) + 1 })),
  definedCenters: ["Sacral", "Root"],
  channels: [{ channelId: "34-57" }],
  incarnationCross: { gates: [13, 7, 1, 2] },
};

/** 계산이 덜 된 차트 — 확정표 조립이 거부해야 한다. */
const INCOMPLETE_CALCULATION = { calculationVersion: "hd-test", type: "Generator" };

let handleHumanDesignReportRoutes;
let reports;
let calculations;
let verifyPerUsePaymentMock;
let startServiceExecutionMock;
let failServiceExecutionMock;
let calculateHumanDesignChartMock;
let storageWriteMode;

function thenableWithLean(value) {
  const promise = Promise.resolve(value);
  promise.lean = () => Promise.resolve(value);
  return promise;
}

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([field, value]) => String(doc[field]) === String(value));
}

function startRequest(requestId) {
  return new Request("https://example.com/api/human-design-report/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ birth: BIRTH, locale: "ko", requestId }),
  });
}

beforeAll(async () => {
  reports = [];
  calculations = [];
  storageWriteMode = "ok";

  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    requireAuth: jest.fn(async () => ({ userId: USER_ID, role: "user" })),
    isAuthDbInfraError: () => false,
  }));

  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => {}),
    withMongoRetry: async (_env, op) => op(),
    isTransientMongoError: () => false,
  }));

  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    HumanDesignReport: {
      findOne(filter) {
        return thenableWithLean(reports.find((doc) => matchesFilter(doc, filter)) || null);
      },
      async updateOne(filter, update, options = {}) {
        if (storageWriteMode === "miss") return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        const target = reports.find((doc) => matchesFilter(doc, filter));
        if (target) {
          if (update.$set) Object.assign(target, update.$set);
          return { matchedCount: 1, modifiedCount: update.$set ? 1 : 0, upsertedCount: 0 };
        }
        if (options.upsert && update.$setOnInsert) {
          reports.push({ ...update.$setOnInsert });
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      },
      findOneAndUpdate() {
        return thenableWithLean(null);
      },
    },
    HumanDesignCalculation: {
      findOne(filter) {
        return thenableWithLean(calculations.find((doc) => matchesFilter(doc, filter)) || null);
      },
    },
  }));

  // 🔴 코인 차감이 **이미 일어난** 통과를 흉내낸다 — transactionId 가 그 증거다.
  verifyPerUsePaymentMock = jest.fn(async () => ({
    proven: true,
    source: "coin",
    transactionId: "tx-charged",
  }));
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
    verifyPerUsePayment: verifyPerUsePaymentMock,
    logPerUsePaymentProof: jest.fn(() => {}),
  }));

  startServiceExecutionMock = jest.fn(async () => ({}));
  failServiceExecutionMock = jest.fn(async () => ({}));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({
    startServiceExecution: startServiceExecutionMock,
    completeServiceExecution: jest.fn(async () => ({})),
    failServiceExecution: failServiceExecutionMock,
  }));

  calculateHumanDesignChartMock = jest.fn(async () => COMPLETE_CALCULATION);
  jest.unstable_mockModule("../../worker/lib/human-design-ephemeris.js", () => ({
    calculateHumanDesignChart: calculateHumanDesignChartMock,
  }));

  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({
    callGeminiJsonWithRetry: jest.fn(async () => {
      throw new Error("과금 LLM 실호출 금지 — /start 는 LLM 을 부르지 않는다");
    }),
  }));

  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({
    createLlmCacheStore: () => null,
  }));

  jest.unstable_mockModule("../../worker/lib/paid-result-revocation.js", () => ({
    isPaidResultRevoked: async () => false,
    isStoredPaidResultRevoked: async () => false,
  }));

  const mod = await import("../../worker/routes/human-design-report.js");
  handleHumanDesignReportRoutes = mod.handleHumanDesignReportRoutes;
});

beforeEach(() => {
  reports.length = 0;
  calculations.length = 0;
  storageWriteMode = "ok";
  calculateHumanDesignChartMock.mockReset();
  calculateHumanDesignChartMock.mockResolvedValue(COMPLETE_CALCULATION);
  verifyPerUsePaymentMock.mockClear();
  startServiceExecutionMock.mockClear();
  failServiceExecutionMock.mockClear();
});

test("기준: 온전한 차트면 확정표가 조립되고 환불 가능 실행이 열린다", async () => {
  const response = await handleHumanDesignReportRoutes(startRequest("req-ok"), ENV);
  expect(response.status).toBe(200);
  expect(verifyPerUsePaymentMock).toHaveBeenCalledTimes(1);
  expect(startServiceExecutionMock).toHaveBeenCalledTimes(1);
});

test("① 차트 계산이 실패하면 차감을 그 자리에서 되돌린다", async () => {
  calculateHumanDesignChartMock.mockRejectedValue(new Error("ephemeris down"));

  const response = await handleHumanDesignReportRoutes(startRequest("req-ephemeris"), ENV);
  const body = await response.json();

  expect(response.status).toBe(502);
  expect(body.reason).toBe("EPHEMERIS_UNAVAILABLE");
  // 차감은 이미 일어났고 —
  expect(verifyPerUsePaymentMock).toHaveBeenCalledTimes(1);
  // 되돌릴 자리가 열려 있고 —
  expect(startServiceExecutionMock).toHaveBeenCalledTimes(1);
  // 실제로 되돌아갔다.
  expect(failServiceExecutionMock).toHaveBeenCalledTimes(1);
  expect(failServiceExecutionMock.mock.calls[0][2]).toMatchObject({
    executionKey: "human-design-report:req-ephemeris",
    forceRefundOnClose: true,
  });
});

test("② 확정표 조립이 거부하면 차감을 그 자리에서 되돌린다", async () => {
  calculateHumanDesignChartMock.mockResolvedValue(INCOMPLETE_CALCULATION);

  const response = await handleHumanDesignReportRoutes(startRequest("req-incomplete"), ENV);
  const body = await response.json();

  expect(response.status).toBe(500);
  expect(body.reason).toBe("CALCULATION_INCOMPLETE");
  expect(verifyPerUsePaymentMock).toHaveBeenCalledTimes(1);
  expect(startServiceExecutionMock).toHaveBeenCalledTimes(1);
  expect(failServiceExecutionMock).toHaveBeenCalledTimes(1);
  expect(failServiceExecutionMock.mock.calls[0][2]).toMatchObject({
    executionKey: "human-design-report:req-incomplete",
    forceRefundOnClose: true,
  });
});

test("③ 저장부가 실패하면 즉시 환불하지 않되 만료 스윕이 주울 실행 기록은 남긴다", async () => {
  storageWriteMode = "miss";

  const response = await handleHumanDesignReportRoutes(startRequest("req-storage"), ENV);

  expect(response.status).toBe(503);
  expect(verifyPerUsePaymentMock).toHaveBeenCalledTimes(1);
  // 🔴 기록이 없으면 sweepStaleServiceExecutions 가 잠글 건이 없어 차감이 고아가 된다.
  expect(startServiceExecutionMock).toHaveBeenCalledTimes(1);
  // 🔴 쓰기가 들어갔는지 모르는 창이라 즉시 환불은 하지 않는다(무료 리포트가 되는 길).
  expect(failServiceExecutionMock).not.toHaveBeenCalled();
});

test("차감이 없는 통과(관리자 등)는 실행 기록도 환불도 만들지 않는다", async () => {
  verifyPerUsePaymentMock.mockResolvedValueOnce({ proven: true, source: "admin", transactionId: "" });
  calculateHumanDesignChartMock.mockRejectedValue(new Error("ephemeris down"));

  const response = await handleHumanDesignReportRoutes(startRequest("req-admin"), ENV);

  expect(response.status).toBe(502);
  expect(startServiceExecutionMock).not.toHaveBeenCalled();
  expect(failServiceExecutionMock).not.toHaveBeenCalled();
});
