/**
 * @jest-environment node
 *
 * 결제 후 리포트가 영영 생성되지 않던 고착의 회귀 테스트.
 *
 * `handleStart` 는 예전에 `$setOnInsert` upsert 하나로 문서를 썼다. 그런데 $setOnInsert 는
 * **이미 있는 문서에는 아무것도 쓰지 못한다.** 한 번 `generation_failed` 로 닫힌 리포트는
 * reportKey 가 결정적이라 다시 결제해도 같은 문서를 만나 닫힌 채로 남았고, 응답만
 * `status:"generating"` 이라 거짓말을 했다. 이어지는 /generate 는 즉시 409
 * GENERATION_ALREADY_FAILED 를 돌려줬고 사용자는 두 번째 결제금까지 낸 채 잠금 화면으로
 * 되돌아왔다.
 *
 * 🔴 이 파일에서 가장 중요한 단언은 "waveCount 가 0 으로 돌아왔다" 와 "billingRequestId 가
 *    이번 requestId 로 갱신됐다" 둘이다. 앞엣것을 놓치면 소진된 웨이브 카운트가 그대로 남아
 *    첫 웨이브부터 상한에 걸리고, 뒤엣것을 놓치면 이후 환불이 **이미 환불된 옛 실행**을 닫아
 *    이번 결제금이 영영 돌아가지 않는다.
 *
 * 🔴 updateOne 대역이 "$setOnInsert 는 기존 문서에 아무것도 쓰지 않는다" 를 그대로 흉내낸다 —
 *    그 의미를 무르게 하면 이 테스트는 옛 코드도 통과시킨다(가드가 아니게 된다).
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

/** 차트 계산은 이 테스트의 대상이 아니다 — 아카이브가 있으면 라우트는 재계산하지 않는다. */
const CALCULATION = { calculationVersion: "hd-test", type: "Generator" };

let handleHumanDesignReportRoutes;
let sectionCount;
let reports;
let calculations;
let verifyPerUsePaymentMock;
let startServiceExecutionMock;
let calculateHumanDesignChartMock;
let callGeminiJsonWithRetryMock;

/** `await findOne(...)` 와 `await findOne(...).lean()` 을 둘 다 지원해야 한다. */
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
        const target = reports.find((doc) => matchesFilter(doc, filter));
        if (target) {
          // 🔴 $setOnInsert 만 온 경우는 **아무것도 쓰지 않는다** — 실제 Mongo 와 같다.
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

  verifyPerUsePaymentMock = jest.fn(async () => ({
    proven: true,
    source: "coin",
    transactionId: "tx-1",
  }));
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
    verifyPerUsePayment: verifyPerUsePaymentMock,
    logPerUsePaymentProof: jest.fn(() => {}),
  }));

  startServiceExecutionMock = jest.fn(async () => ({}));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({
    startServiceExecution: startServiceExecutionMock,
    completeServiceExecution: jest.fn(async () => ({})),
    failServiceExecution: jest.fn(async () => ({})),
  }));

  calculateHumanDesignChartMock = jest.fn(async () => CALCULATION);
  jest.unstable_mockModule("../../worker/lib/human-design-ephemeris.js", () => ({
    calculateHumanDesignChart: calculateHumanDesignChartMock,
  }));

  // 🔴 /start 는 LLM 을 부르지 않는다. 부르면 테스트가 즉시 깨지도록 던지는 대역을 둔다.
  callGeminiJsonWithRetryMock = jest.fn(async () => {
    throw new Error("과금 LLM 실호출 금지 — /start 는 LLM 을 부르지 않는다");
  });
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({
    callGeminiJsonWithRetry: callGeminiJsonWithRetryMock,
  }));

  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({
    createLlmCacheStore: () => null,
  }));

  // 🔴 계약 모듈은 **통째로 대역하지 않는다** — 섹션 목록·상한 같은 상수가 통째로 사라지면
  //    이 테스트가 지키려는 계약 자체가 없어진다. 순수 조립 함수 둘만 덮는다.
  const actualContract = await import("../../worker/lib/human-design-report-contract.js");
  sectionCount = actualContract.HD_REPORT_SECTIONS.length;
  jest.unstable_mockModule("../../worker/lib/human-design-report-contract.js", () => ({
    ...actualContract,
    buildHumanDesignFactSnapshot: () => ({ type: "Generator", authority: "Sacral" }),
    buildAllowedIds: () => ({ gates: [], channels: [], centers: [], all: ["G1"] }),
  }));

  const mod = await import("../../worker/routes/human-design-report.js");
  handleHumanDesignReportRoutes = mod.handleHumanDesignReportRoutes;
});

beforeEach(() => {
  reports.length = 0;
  // 아카이브는 비워 둔다 — 차트 재계산 경로를 타든 아카이브를 타든 이 테스트의 대상은 저장부다.
  calculations.length = 0;
  verifyPerUsePaymentMock.mockClear();
  startServiceExecutionMock.mockClear();
  calculateHumanDesignChartMock.mockClear();
  callGeminiJsonWithRetryMock.mockClear();
});

/** 첫 결제로 문서를 만든 뒤, 웨이브를 다 써서 닫힌 상태(= 사고 재현 지점)로 만든다. */
async function startThenClose(requestId) {
  const response = await handleHumanDesignReportRoutes(startRequest(requestId), ENV);
  expect(response.status).toBe(200);
  expect(reports).toHaveLength(1);
  const doc = reports[0];
  Object.assign(doc, {
    status: "generation_failed",
    waveCount: 10,
    providerCallCount: 41,
    totalChars: 980,
    degraded: true,
    qualityIssues: ["SECTION_TOO_SHORT"],
    lock: { holder: "wave-abc", expiresAt: new Date(Date.now() + 90000) },
    generationError: "WAVES_EXHAUSTED",
    completedAt: new Date(),
    sections: doc.sections.map((section) => ({ ...section, status: "degraded", body: "짧은 본문" })),
  });
  // 여기까지는 준비다 — 이어지는 단언은 **두 번째 결제**만 세야 한다.
  verifyPerUsePaymentMock.mockClear();
  startServiceExecutionMock.mockClear();
  return doc;
}

test("첫 결제는 문서를 새로 만들고 환불 가능 실행을 연다", async () => {
  const response = await handleHumanDesignReportRoutes(startRequest("req-1"), ENV);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ ok: true, reused: false, status: "generating" });
  expect(body.progress).toEqual({ completed: 0, total: sectionCount });
  expect(reports).toHaveLength(1);
  expect(reports[0].billingRequestId).toBe("req-1");
  expect(startServiceExecutionMock).toHaveBeenCalledTimes(1);
  expect(startServiceExecutionMock.mock.calls[0][2].executionKey).toBe("human-design-report:req-1");
  expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});

test("🔴 generation_failed 문서에 /start 를 다시 부르면 되살아난다", async () => {
  await startThenClose("req-1");

  const response = await handleHumanDesignReportRoutes(startRequest("req-2"), ENV);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ ok: true, reused: false, status: "generating" });

  // 문서가 하나뿐이어야 한다 — reportKey 가 결정적이라 새로 만들어지면 unique index 가 막는다.
  expect(reports).toHaveLength(1);
  const doc = reports[0];
  expect(doc.status).toBe("generating");
  // 🔴 소진된 웨이브 카운트가 남으면 claimWave 상한에 첫 웨이브부터 걸린다.
  expect(doc.waveCount).toBe(0);
  expect(doc.lock).toBeNull();
  expect(doc.generationError).toBeNull();
  expect(doc.completedAt).toBeNull();
  expect(doc.degraded).toBe(false);
  expect(doc.qualityIssues).toEqual([]);
  expect(doc.providerCallCount).toBe(0);
  expect(doc.totalChars).toBe(0);
  // 🔴 옛 requestId 를 남기면 이후 환불이 이미 환불된 실행을 닫고 이번 결제금은 안 돌아온다.
  expect(doc.billingRequestId).toBe("req-2");
  expect(doc.sections).toHaveLength(sectionCount);
  expect(doc.sections.every((section) => section.status === "pending")).toBe(true);
  expect(doc.sections.every((section) => section.body === "")).toBe(true);

  // 재결제이므로 증빙을 다시 확인하고, 이번 결제분으로 환불 가능 실행을 새로 연다.
  expect(verifyPerUsePaymentMock).toHaveBeenCalledTimes(1);
  expect(startServiceExecutionMock).toHaveBeenCalledTimes(1);
  expect(startServiceExecutionMock.mock.calls[0][2].executionKey).toBe("human-design-report:req-2");
  expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});

test("이미 만든 리포트는 결제 검사 없이 그대로 다시 열린다(재열람 무과금)", async () => {
  await handleHumanDesignReportRoutes(startRequest("req-1"), ENV);
  reports[0].status = "completed";
  verifyPerUsePaymentMock.mockClear();
  startServiceExecutionMock.mockClear();

  const response = await handleHumanDesignReportRoutes(startRequest("req-2"), ENV);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ ok: true, reused: true });
  expect(verifyPerUsePaymentMock).not.toHaveBeenCalled();
  expect(startServiceExecutionMock).not.toHaveBeenCalled();
  // 재열람은 문서를 건드리지 않는다.
  expect(reports[0].billingRequestId).toBe("req-1");
});
