/**
 * @jest-environment node
 *
 * POST /api/sukuyo/<compat|compat-precision|nature-deep-dive|extreme-t>/archive — 숙요 유료 결과의 보관함 저장.
 * 결과는 브라우저가 계산하므로, 서버는 "이 사용자가 이 카드로 이 기능을 실제로 결제했는가"만 확인하고 저장한다.
 * 결제 requestId 는 클라이언트가 아니라 서버가 'sukuyo-paid:<featureKey>|<profileId>' 로 만든다.
 */

import { jest } from "@jest/globals";
import { computeBirthKey } from "../../worker/lib/birth-key.js";

const USER_ID = "507f1f77bcf86cd799439011";
const PROFILE_ID = "card-a";
const CARD = {
  userId: USER_ID,
  profileId: PROFILE_ID,
  name: "나의 카드",
  gender: "F",
  birth: { year: 1990, month: 5, day: 6, hour: 7, minute: 8, calType: "solar" },
};

const store = { executions: [] };
const verifyPerUsePayment = jest.fn();
const findActivePaidContentUnlock = jest.fn();
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

let handleSukuyoResultArchive;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: async () => ({}),
    withMongoRetry: async (_env, operation) => operation(),
    isTransientMongoError: () => false,
  }));
  await jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({ findActivePaidContentUnlock }));
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
  ({ handleSukuyoResultArchive } = await import("../../worker/routes/sukuyo-archive.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  store.executions = [];
  verifyPerUsePayment.mockResolvedValue({ proven: true, source: "payment", transactionId: "pay-1" });
  findActivePaidContentUnlock.mockResolvedValue(null);
});

function payload(overrides = {}) {
  return {
    profileId: PROFILE_ID,
    facts: { myMansion: "각숙", partnerMansion: "항숙", relationType: "안괴", relationTypeHan: "안괴", distanceLabel: "근거리", score: 72, secret: "버린다" },
    partner: { y: "1992", m: "3", d: "4", time: "12:00", cal: "solar", gender: "M" },
    sections: [{ title: "인연 요약", body: "서로 끌리지만 속도를 맞춰야 합니다." }],
    ...overrides,
  };
}

function save(body, slug = "compat") {
  const request = new Request(`https://example.com/api/sukuyo/${slug}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleSukuyoResultArchive(request, {}, slug);
}

test("결제가 확인되면 결제한 카드·출생정보와 함께 보관함 모양으로 저장한다", async () => {
  const response = await save(payload());

  expect(response.status).toBe(200);
  expect(verifyPerUsePayment).toHaveBeenCalledWith({}, expect.objectContaining({
    userId: USER_ID,
    featureKey: "compat-sukuyo-compatibility",
    requestId: `sukuyo-paid:compat-sukuyo-compatibility|${PROFILE_ID}`,
    requireExisting: true,
  }));
  expect(store.executions).toHaveLength(1);
  const [row] = store.executions;
  expect(row).toMatchObject({
    userId: USER_ID,
    featureKey: "compat-sukuyo-compatibility",
    profileId: PROFILE_ID,
    status: "success",
    premiumStatus: "completed",
    retentionUntil: null,
    idempotencyKey: `sukuyo-paid:compat-sukuyo-compatibility|${PROFILE_ID}`,
    paymentId: "pay-1",
  });
  expect(row.metadata.birthKey).toBe(computeBirthKey(CARD));
  expect(row.metadata.cardName).toBe("나의 카드");
  expect(row.metadata.archive.title).toBe("숙요점 궁합");
  expect(row.metadata.archive.result.sukuyoResult).toEqual({
    name: "나의 카드", mansion: "나 각숙 · 상대 항숙", relation: "안괴", relationType: "안괴", distance: "근거리", score: 72,
  });
  expect(row.metadata.archive.result.sections).toEqual([{ title: "인연 요약", body: "서로 끌리지만 속도를 맞춰야 합니다." }]);
  // 화이트리스트 밖의 키는 남기지 않는다.
  expect(JSON.stringify(row)).not.toContain("버린다");
});

test("결제가 확인되지 않으면 403 이고 아무것도 저장하지 않는다", async () => {
  verifyPerUsePayment.mockResolvedValue({ proven: false, reason: "NO_EXISTING_CONSUMPTION" });

  const response = await save(payload());

  expect(response.status).toBe(403);
  expect(findOneAndUpdate).not.toHaveBeenCalled();
  expect(store.executions).toHaveLength(0);
});

test("결제 확인이 DB 장애로 보류되면 403 이 아니라 503 이다", async () => {
  verifyPerUsePayment.mockResolvedValue({ proven: null, reason: "DB_DEGRADED" });

  expect((await save(payload())).status).toBe(503);
  expect(store.executions).toHaveLength(0);
});

test("같은 카드·같은 상대 입력을 다시 저장하면 1건만 남고, 상대가 바뀌면 새 기록이다", async () => {
  await save(payload());
  await save(payload({ sections: [{ title: "인연 요약", body: "다시 본 결과" }] }));
  expect(store.executions).toHaveLength(1);
  expect(store.executions[0].metadata.archive.result.sections[0].body).toBe("다시 본 결과");

  await save(payload({ partner: { y: "1993", m: "3", d: "4", time: "12:00", cal: "solar", gender: "M" } }));
  expect(store.executions).toHaveLength(2);
});

test("정밀 궁합은 자기 결제 키로 확인하고 따로 저장한다", async () => {
  await save(payload(), "compat");
  await save(payload(), "compat-precision");

  expect(verifyPerUsePayment.mock.calls[1][1]).toMatchObject({
    featureKey: "premium-sukuyo-compat-extra",
    requestId: `sukuyo-paid:premium-sukuyo-compat-extra|${PROFILE_ID}`,
  });
  expect(store.executions.map((row) => row.featureKey)).toEqual(["compat-sukuyo-compatibility", "premium-sukuyo-compat-extra"]);
});

test("HTML 이 든 결과·카드 없는 요청·너무 큰 요청은 결제 확인 전에 거절한다", async () => {
  expect((await save(payload({ sections: [{ title: "x", body: "<script>alert(1)</script>" }] }))).status).toBe(400);
  expect((await save(payload({ profileId: "" }))).status).toBe(400);
  expect((await save(payload({ sections: [{ title: "x", body: "가".repeat(70 * 1024) }] }))).status).toBe(413);
  expect(verifyPerUsePayment).not.toHaveBeenCalled();
  expect(store.executions).toHaveLength(0);
});

test("이용권 즉시 사용(accessMethod:'pass')은 사용 기록이 아직 없으면 같은 requestId 로 이용권을 직접 소비해 저장한다", async () => {
  verifyPerUsePayment
    .mockResolvedValueOnce({ proven: false, reason: "NO_EXISTING_CONSUMPTION" })
    .mockResolvedValueOnce({ proven: true, source: "pass" });

  const response = await save(payload({ accessMethod: "pass" }));

  expect(response.status).toBe(200);
  expect(verifyPerUsePayment).toHaveBeenCalledTimes(2);
  const [, fallback] = verifyPerUsePayment.mock.calls[1];
  expect(fallback).toMatchObject({ requestId: `sukuyo-paid:compat-sukuyo-compatibility|${PROFILE_ID}`, profileId: PROFILE_ID });
  expect(fallback.requireExisting).toBeUndefined();
  expect(store.executions[0].metadata.accessType).toBe("pass");
});

test("이용권 표시가 없는 요청은 기존 결제 증빙만 보고, 없으면 결제를 일으키지 않고 403 이다", async () => {
  verifyPerUsePayment.mockResolvedValue({ proven: false, reason: "NO_EXISTING_CONSUMPTION" });

  expect((await save(payload())).status).toBe(403);
  expect(verifyPerUsePayment).toHaveBeenCalledTimes(1);
});

function birthPayload(overrides = {}) {
  return {
    profileId: PROFILE_ID,
    facts: { myMansion: "각숙", moonTone: "차분한 달", mantra: "천천히 단단하게", dailyDate: "2026-10-11" },
    sections: [{ title: "천성의 빛", body: "핵심 파동은 꾸준함입니다." }],
    ...overrides,
  };
}

test("본성 심화는 이 카드 출생정보의 해금 행으로 확인하고, 해금 주문 번호를 환불 판정용으로 남긴다", async () => {
  findActivePaidContentUnlock.mockResolvedValue({ _id: "ent-1", orderId: "order-9", paymentId: "pay-9", source: "PASS" });

  const response = await save(birthPayload(), "nature-deep-dive");

  expect(response.status).toBe(200);
  expect(findActivePaidContentUnlock).toHaveBeenCalledWith({ userId: USER_ID, profileId: PROFILE_ID, featureKey: "sukuyo-nature-deep-dive" });
  expect(verifyPerUsePayment).not.toHaveBeenCalled();
  expect(store.executions[0]).toMatchObject({ featureKey: "sukuyo-nature-deep-dive", idempotencyKey: "order-9", paymentId: "pay-9" });
  expect(store.executions[0].metadata.archive.result.sukuyoResult).toEqual({ name: "나의 카드", mansion: "각숙" });
});

test("해금 행이 없으면 극T 결과는 저장하지 않는다", async () => {
  const response = await save({ profileId: PROFILE_ID, facts: { typeName: "냉철한 설계자", finalScore: 88 }, sections: [{ title: "관계 회로", body: "솔직함" }] }, "extreme-t");

  expect(response.status).toBe(403);
  expect(findActivePaidContentUnlock).toHaveBeenCalledWith(expect.objectContaining({ featureKey: "sukuyo-extreme-t-relationship" }));
  expect(store.executions).toHaveLength(0);
});
