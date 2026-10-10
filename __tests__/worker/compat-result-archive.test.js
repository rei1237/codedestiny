/**
 * @jest-environment node
 *
 * POST /api/compat-archive/<astro-synastry|astro-direct-synastry|ziwei-compat> — 점성술·자미두수 궁합 결과의 보관함 저장.
 * 상대가 매번 바뀌는 회당 결제라 requestId 는 셸이 결제마다 새로 만든다. 서버는 그 requestId 가
 * 이 사용자·이 기능의 결제인지 확인한 뒤에만 저장하고, 결제 1건 = 기록 1건이다.
 */

import { jest } from "@jest/globals";

const USER_ID = "507f1f77bcf86cd799439011";
const PROFILE_ID = "card-a";
const REQUEST_ID = "astro-synastry-paid:compat-astro-synastry:abc123def456";
const CARD = {
  userId: USER_ID,
  profileId: PROFILE_ID,
  name: "나의 카드",
  gender: "F",
  birth: { year: 1990, month: 5, day: 6, hour: 7, minute: 8, calType: "solar" },
};

const store = { executions: [] };
const verifyPerUsePayment = jest.fn();
const findOneAndUpdate = jest.fn((filter, update) => ({
  lean: async () => {
    let row = store.executions.find((doc) => doc.userId === filter.userId && doc.executionKey === filter.executionKey);
    if (!row) {
      row = { _id: `exec-${store.executions.length + 1}`, ...update.$setOnInsert };
      store.executions.push(row);
    }
    Object.assign(row, update.$set);
    return row;
  },
}));

let handleCompatResultArchiveRoutes;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: async () => ({}),
    withMongoRetry: async (_env, operation) => operation(),
  }));
  await jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    requireUserFromRequest: async () => ({ userId: USER_ID }),
  }));
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ProfileCard: {
      findOne: (filter) => ({ lean: async () => (filter.userId === USER_ID && filter.profileId === PROFILE_ID ? CARD : null) }),
    },
    ServiceExecutionTransaction: { findOneAndUpdate },
  }));
  await jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
    verifyPerUsePayment,
    logPerUsePaymentProof: () => {},
  }));
  ({ handleCompatResultArchiveRoutes } = await import("../../worker/routes/compat-result-archive.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  store.executions = [];
  verifyPerUsePayment.mockResolvedValue({ proven: true, source: "payment", transactionId: "pay-1" });
});

function payload(overrides = {}) {
  return {
    requestId: REQUEST_ID,
    profileId: PROFILE_ID,
    facts: { partnerName: "아이유", relationType: "소울메이트", score: 88, partnerSun: "황소자리", secret: "버린다" },
    sections: [{ title: "사랑", body: "서로의 속도를 존중하면 오래갑니다." }],
    ...overrides,
  };
}

function save(body, slug = "astro-synastry", method = "POST") {
  const request = new Request(`https://example.com/api/compat-archive/${slug}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
  return handleCompatResultArchiveRoutes(request, {});
}

test("결제가 확인되면 그 결제 requestId 로 보관함 모양으로 저장한다", async () => {
  const response = await save(payload());

  expect(response.status).toBe(200);
  expect(verifyPerUsePayment).toHaveBeenCalledTimes(1);
  expect(verifyPerUsePayment).toHaveBeenCalledWith({}, expect.objectContaining({
    userId: USER_ID,
    featureKey: "compat-astro-synastry",
    requestId: REQUEST_ID,
    requireExisting: true,
  }));
  const [row] = store.executions;
  expect(row).toMatchObject({
    featureKey: "compat-astro-synastry",
    profileId: PROFILE_ID,
    idempotencyKey: REQUEST_ID,
    paymentId: "pay-1",
    retentionUntil: null,
  });
  expect(row.metadata.cardName).toBe("나의 카드");
  expect(row.metadata.archive.targetName).toBe("아이유");
  expect(row.metadata.archive.result.astrologyChart).toEqual({ name: "아이유", relationType: "소울메이트", score: 88, sun: "황소자리" });
  expect(JSON.stringify(row)).not.toContain("버린다");
});

test("결제가 확인되지 않으면 403, DB 장애면 503 이고 저장하지 않는다", async () => {
  verifyPerUsePayment.mockResolvedValue({ proven: false, reason: "NO_EXISTING_CONSUMPTION" });
  expect((await save(payload())).status).toBe(403);
  verifyPerUsePayment.mockResolvedValue({ proven: null, reason: "DB_DEGRADED" });
  expect((await save(payload())).status).toBe(503);
  expect(store.executions).toHaveLength(0);
});

test("이용권 즉시 사용은 기록이 아직 없으면 같은 requestId 로 이용권 사용을 확정한다", async () => {
  verifyPerUsePayment
    .mockResolvedValueOnce({ proven: false, reason: "NO_EXISTING_CONSUMPTION" })
    .mockResolvedValueOnce({ proven: true, source: "pass", transactionId: "ph-1" });

  const response = await save(payload({ accessMethod: "pass" }), "ziwei-compat");

  expect(response.status).toBe(200);
  expect(verifyPerUsePayment).toHaveBeenCalledTimes(2);
  expect(verifyPerUsePayment.mock.calls[1][1]).toMatchObject({ featureKey: "compat-ziwei-compatibility", requestId: REQUEST_ID, profileId: PROFILE_ID });
  expect(verifyPerUsePayment.mock.calls[1][1].requireExisting).toBeUndefined();
  expect(store.executions[0].metadata.accessType).toBe("pass");
  expect(store.executions[0].metadata.archive.result.ziweiChart).toEqual({ name: "아이유", score: 88 });
});

test("결제가 다르면 기록도 따로, 같은 결제를 다시 저장하면 1건만 남는다", async () => {
  await save(payload());
  await save(payload({ sections: [{ title: "사랑", body: "다시 저장" }] }));
  expect(store.executions).toHaveLength(1);
  expect(store.executions[0].metadata.archive.result.sections[0].body).toBe("다시 저장");

  await save(payload({ requestId: "astro-synastry-paid:compat-astro-synastry:zzz999yyy888" }));
  expect(store.executions).toHaveLength(2);
});

test("requestId·점수·본문이 없거나 HTML 이 섞이면 400, 모르는 기능은 404, GET 은 405", async () => {
  expect((await save(payload({ requestId: "" }))).status).toBe(400);
  expect((await save(payload({ facts: { partnerName: "아이유" } }))).status).toBe(400);
  expect((await save(payload({ sections: [] }))).status).toBe(400);
  expect((await save(payload({ sections: [{ title: "x", body: "<img src=x>" }] }))).status).toBe(400);
  expect((await save(payload(), "palm")).status).toBe(404);
  expect((await save(null, "astro-synastry", "GET")).status).toBe(405);
  expect(verifyPerUsePayment).not.toHaveBeenCalled();
  expect(store.executions).toHaveLength(0);
});
