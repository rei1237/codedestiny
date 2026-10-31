/**
 * @jest-environment node
 *
 * 유료 결과 전달 검토 대기(R2) 운영자 알림 — 알림만 한다. 고객 결과 필드는 읽지도 쓰지도 않고,
 * 표식은 전달 성공 뒤에만 찍는다. DB 는 인메모리 모델 대역(연산자 의미는 fake-payment-db 의 구현을 쓴다).
 */
import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { matches, applyUpdate } from "../fixtures/fake-payment-db.mjs";

const NOW = new Date("2026-10-31T12:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms) => new Date(NOW.getTime() - ms);
const USER_ID = "507f1f77bcf86cd799439011";
const EMAIL = "buyer@example.com";
const SECRET = "SECRET-RESULT-BODY";
const BIRTH = "1990-01-01";

const getPath = (doc, path) => path.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), doc);
function setPath(doc, path, value) {
  const parts = path.split(".");
  let node = doc;
  for (const part of parts.slice(0, -1)) node = node[part] ||= {};
  node[parts.at(-1)] = value;
}

/** find().sort().limit().select().lean() 와 updateOne(filter, update, options) 만 흉내 낸다. select 에 없는 필드는 돌려주지 않는다. */
function fakeModel(rows) {
  const model = {
    rows, selects: [], limits: [],
    find(filter) {
      let list = rows.filter((row) => matches(row, filter));
      let select = null;
      const chain = {
        sort(spec) {
          const [key, dir] = Object.entries(spec)[0];
          list = [...list].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (dir < 0 ? -1 : 1));
          return chain;
        },
        limit(count) { model.limits.push(count); list = list.slice(0, count); return chain; },
        select(fields) { select = String(fields).split(/\s+/).filter(Boolean); model.selects.push(select); return chain; },
        async lean() {
          if (!select) return list.map((row) => structuredClone(row));
          return list.map((row) => {
            const out = { _id: row._id };
            for (const path of select) { const value = getPath(row, path); if (value !== undefined) setPath(out, path, structuredClone(value)); }
            return out;
          });
        },
      };
      return chain;
    },
    updateOne: jest.fn(async (filter, update) => {
      const hit = rows.find((row) => matches(row, filter));
      if (!hit) return { matchedCount: 0, modifiedCount: 0 };
      // Mongo 는 null·스칼라 부모 아래로 점 표기 $set 을 하면 던진다(없는 부모는 만들어 준다).
      for (const path of Object.keys(update.$set || {})) {
        const parts = path.split(".").slice(0, -1);
        let node = hit;
        for (const part of parts) {
          node = node?.[part];
          if (node === null || (node !== undefined && typeof node !== "object")) throw new Error(`Cannot create field in element {${part}: ${node}}`);
        }
      }
      applyUpdate(hit, update);
      return { matchedCount: 1, modifiedCount: 1 };
    }),
  };
  return model;
}

let fusion; let narrative; let ziwei;
const retry = jest.fn(async (_env, fn) => fn());
jest.unstable_mockModule("../../worker/lib/db.js", () => ({ connectDb: async () => {}, withMongoRetry: retry }));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  FusionFortuneConsultation: { find: (...args) => fusion.find(...args), updateOne: (...args) => fusion.updateOne(...args) },
  ServiceExecutionTransaction: { find: (...args) => narrative.find(...args), updateOne: (...args) => narrative.updateOne(...args) },
  ZiweiDeepReport: { find: (...args) => ziwei.find(...args), updateOne: (...args) => ziwei.updateOne(...args) },
}));
let alertDeliveryReviews;
beforeAll(async () => { ({ alertDeliveryReviews } = await import("../../worker/lib/delivery-review-alert.js")); });

const fusionRow = (id, overrides = {}) => ({
  _id: id, userId: USER_ID, createdAt: ago(5 * HOUR), status: "delivery_pending", featureKey: "fusion-fortune-consultation",
  result: { text: SECRET }, inputSummary: { birth: BIRTH, email: EMAIL }, llmMeta: { refundSkipped: "not_card_order" }, ...overrides,
});
const narrativeRow = (id, overrides = {}) => ({
  _id: id, userId: USER_ID, executionKey: `paid-narrative:${id}-12345678`, createdAt: ago(3 * HOUR), status: "pending", featureKey: "geomancy",
  serviceId: "geomancy-premium", paymentProvider: "portone", metadata: { paidNarrative: { parts: { a: SECRET } }, paidNarrativeRecovery: { reviewRequired: true, code: "DELIVERY_REVIEW_REQUIRED" } },
  ...overrides,
});
const ziweiRow = (id, overrides = {}) => ({
  _id: id, id: `zdr-${id}-87654321`, userId: USER_ID, createdAt: ago(26 * HOUR), status: "partial",
  chapters: [{ body: SECRET }], birthInfo: { birthDate: BIRTH }, llmMeta: { recovery: { reviewRequired: true } }, ...overrides,
});
const delivered = () => jest.fn(async () => ({ results: [{ ok: true }] }));
const notDelivered = () => jest.fn(async () => ({ results: [{ ok: false }] }));
const seed = ({ f = [], n = [], z = [] } = {}) => { fusion = fakeModel(f); narrative = fakeModel(n); ziwei = fakeModel(z); };

beforeEach(() => { retry.mockClear(); });

test("(a) 세 종류 각 1건 → 알림 1통에 3건, 표식 3건(종류별 표식 경로)", async () => {
  seed({ f: [fusionRow("f1")], n: [narrativeRow("n1")], z: [ziweiRow("z1")] });
  const send = delivered();
  expect(await alertDeliveryReviews({}, { now: NOW, send })).toEqual({ found: 3, delivered: true, marked: 3 });
  expect(send).toHaveBeenCalledTimes(1);
  const [, message] = send.mock.calls[0];
  expect(message.text).toContain("초융합");
  expect(message.text).toContain("서사형");
  expect(message.text).toContain("자미두수");
  expect(message.text).toContain("not_card_order");
  expect(message.text).toContain("DELIVERY_REVIEW_REQUIRED");
  expect(message.text).toContain("BUDGET_EXHAUSTED");
  expect(message.text).toContain("geomancy-premium");
  expect(message.text).toContain("5시간 0분");
  expect(fusion.rows[0].llmMeta.reviewAlertAt).toEqual(NOW);
  expect(narrative.rows[0].metadata.paidNarrativeRecovery.reviewAlertAt).toEqual(NOW);
  expect(ziwei.rows[0].llmMeta.recovery.reviewAlertAt).toEqual(NOW);
});

test("초융합: 카드가 아닌 주문(refundSkipped)과 reviewRequired(환불 시각 없음) 둘 다, 사유 코드는 refundSkipped 값 또는 REVIEW_REQUIRED", async () => {
  seed({ f: [
    fusionRow("f-skip"),
    fusionRow("f-review", { llmMeta: null, generationSnapshot: { recovery: { reviewRequired: true } } }),
    fusionRow("f-review-refundable", { llmMeta: { refundEligibleAt: ago(HOUR) }, generationSnapshot: { recovery: { reviewRequired: true } } }),
    fusionRow("f-plain", { llmMeta: {} }),
  ] });
  const send = delivered();
  expect(await alertDeliveryReviews({}, { now: NOW, send })).toMatchObject({ found: 2, delivered: true, marked: 2 });
  const { text } = send.mock.calls[0][1];
  expect(text).toContain("not_card_order");
  expect(text).toContain("REVIEW_REQUIRED");
  expect(fusion.rows.find((row) => row._id === "f-review-refundable").llmMeta.reviewAlertAt).toBeUndefined();
  expect(fusion.rows.find((row) => row._id === "f-plain").llmMeta.reviewAlertAt).toBeUndefined();
});

test("전달 전 상태만 본다 — 완료·환불 대기(generation_failed)·결과 전달이 끝난 건은 검토 대기로 알리지 않는다", async () => {
  seed({
    f: [fusionRow("f-done", { status: "completed" }), fusionRow("f-failed", { status: "generation_failed" }), fusionRow("f-open", { status: "partial" })],
    n: [narrativeRow("n-done", { status: "success" }), narrativeRow("n-refunded", { status: "refunded" })],
    z: [ziweiRow("z-done", { status: "completed" }), ziweiRow("z-failed", { status: "generation_failed" }), ziweiRow("z-open", { status: "generating" })],
  });
  expect(await alertDeliveryReviews({}, { now: NOW, send: delivered() })).toEqual({ found: 2, delivered: true, marked: 2 });
});

test("(b) 발송이 delivered:false 이면 표식 0건, 다음 호출에서 다시 조회된다", async () => {
  seed({ f: [fusionRow("f1")], n: [narrativeRow("n1")], z: [ziweiRow("z1")] });
  expect(await alertDeliveryReviews({}, { now: NOW, send: notDelivered() })).toEqual({ found: 3, delivered: false, marked: 0 });
  for (const model of [fusion, narrative, ziwei]) expect(model.updateOne).not.toHaveBeenCalled();
  const throwing = jest.fn(async () => { throw new Error("boom"); });
  expect(await alertDeliveryReviews({}, { now: NOW, send: throwing })).toEqual({ found: 3, delivered: false, marked: 0 });
  for (const model of [fusion, narrative, ziwei]) expect(model.updateOne).not.toHaveBeenCalled();
  expect(await alertDeliveryReviews({}, { now: new Date(NOW.getTime() + 600_000), send: delivered() })).toEqual({ found: 3, delivered: true, marked: 3 });
});

test("(c) 표식이 있는 건과 30일 넘은 건은 조회되지 않는다 — 다시 돌면 보내지 않는다", async () => {
  seed({
    f: [fusionRow("f-marked", { llmMeta: { refundSkipped: "not_card_order", reviewAlertAt: ago(DAY) } }), fusionRow("f-old", { createdAt: ago(31 * DAY) }), fusionRow("f-ok")],
    n: [narrativeRow("n-marked", { metadata: { paidNarrativeRecovery: { reviewRequired: true, code: "X", reviewAlertAt: ago(DAY) } } }), narrativeRow("n-old", { createdAt: ago(31 * DAY) })],
    z: [ziweiRow("z-marked", { llmMeta: { recovery: { reviewRequired: true, reviewAlertAt: ago(DAY) } } }), ziweiRow("z-old", { createdAt: ago(31 * DAY) })],
  });
  const send = delivered();
  expect(await alertDeliveryReviews({}, { now: NOW, send })).toEqual({ found: 1, delivered: true, marked: 1 });
  const again = delivered();
  expect(await alertDeliveryReviews({}, { now: NOW, send: again })).toEqual({ found: 0, delivered: false, marked: 0 });
  expect(again).not.toHaveBeenCalled();
});

test("(d) 본문과 제목에 userId·이메일·생년·결과 본문·전체 실행키가 없다(뒤 8자만)", async () => {
  seed({ f: [fusionRow("f1")], n: [narrativeRow("n1")], z: [ziweiRow("z1")] });
  const send = delivered();
  await alertDeliveryReviews({}, { now: NOW, send });
  const sent = JSON.stringify(send.mock.calls);
  for (const secret of [USER_ID, EMAIL, SECRET, BIRTH, "paid-narrative:n1-12345678", "zdr-z1-87654321"]) expect(sent).not.toContain(secret);
  expect(sent).toContain("...12345678");
  expect(sent).toContain("...87654321");
  // 조회도 결과·생년·사용자 필드를 가져오지 않는다.
  for (const model of [fusion, narrative, ziwei]) {
    expect(model.selects.length).toBeGreaterThan(0);
    expect(model.selects.flat().join(" ")).not.toMatch(/userId|result|chapters|birth|email|parts|body|rawResponses/i);
  }
});

test("(e) 표식 쓰기는 $set 표식 경로 하나뿐이다 — 결과·상태·updatedAt 을 건드리지 않는다", async () => {
  seed({ f: [fusionRow("f1")], n: [narrativeRow("n1")], z: [ziweiRow("z1")] });
  const before = structuredClone([fusion.rows, narrative.rows, ziwei.rows]);
  await alertDeliveryReviews({}, { now: NOW, send: delivered() });
  const expected = [[fusion, "llmMeta.reviewAlertAt"], [narrative, "metadata.paidNarrativeRecovery.reviewAlertAt"], [ziwei, "llmMeta.recovery.reviewAlertAt"]];
  // 초융합은 null 부모 CAS 를 먼저 걸고(객체 부모면 0건 매칭), 이어서 점 표기 CAS 를 건다.
  expect(fusion.updateOne).toHaveBeenCalledTimes(2);
  expect(fusion.updateOne.mock.calls[0][0]).toEqual({ _id: "f1", llmMeta: null });
  expect(fusion.updateOne.mock.calls[0][1]).toEqual({ $set: { llmMeta: { reviewAlertAt: NOW } } });
  expect(fusion.updateOne.mock.calls[0][2]).toEqual({ timestamps: false });
  for (const [model, path] of expected) {
    const [filter, update, options] = model.updateOne.mock.calls.at(-1);
    expect(Object.keys(update)).toEqual(["$set"]);
    expect(Object.keys(update.$set)).toEqual([path]);
    expect(options).toEqual({ timestamps: false });
    expect(filter).toMatchObject({ _id: expect.anything(), [path]: { $exists: false } });
  }
  // 표식 경로를 걷어내면 고객 문서는 처음과 같다.
  delete fusion.rows[0].llmMeta.reviewAlertAt;
  delete narrative.rows[0].metadata.paidNarrativeRecovery.reviewAlertAt;
  delete ziwei.rows[0].llmMeta.recovery.reviewAlertAt;
  expect([fusion.rows, narrative.rows, ziwei.rows]).toEqual(before);
  // 쓰기는 비멱등이라 재시도 0회로 감싼다.
  const writeCalls = retry.mock.calls.filter(([, , options]) => options?.retries === 0);
  expect(writeCalls).toHaveLength(4);
});

test("표식 CAS: 그 사이 다른 틱이 먼저 찍었으면 modifiedCount 0 이라 marked 에 세지 않는다", async () => {
  seed({ f: [fusionRow("f1")] });
  fusion.updateOne.mockImplementation(async () => ({ matchedCount: 0, modifiedCount: 0 }));
  expect(await alertDeliveryReviews({}, { now: NOW, send: delivered() })).toEqual({ found: 1, delivered: true, marked: 0 });
});

test("초융합 llmMeta 가 null 이어도(recovery 가 generationSnapshot 만 채운 건) 표식이 남고 다음 호출에서 조회되지 않는다", async () => {
  const row = fusionRow("f1", { llmMeta: null, generationSnapshot: { recovery: { reviewRequired: true } } });
  seed({ f: [row] });
  expect(await alertDeliveryReviews({}, { now: NOW, send: delivered() })).toEqual({ found: 1, delivered: true, marked: 1 });
  expect(fusion.rows[0].llmMeta).toEqual({ reviewAlertAt: NOW });
  expect(fusion.rows[0].generationSnapshot).toEqual({ recovery: { reviewRequired: true } });
  const send = delivered();
  expect(await alertDeliveryReviews({}, { now: NOW, send })).toEqual({ found: 0, delivered: false, marked: 0 });
  expect(send).not.toHaveBeenCalled();
});

test("한 건의 표식 쓰기가 던져도 나머지 건은 표식을 남기고, 실패는 루프 뒤에 다시 던져 크론 실패 알림이 보게 한다", async () => {
  seed({ f: [fusionRow("f1")], n: [narrativeRow("n1")], z: [ziweiRow("z1")] });
  narrative.updateOne.mockImplementationOnce(async () => { throw Object.assign(new Error("write failed"), { code: "MARK_FAILED" }); });
  await expect(alertDeliveryReviews({}, { now: NOW, send: delivered() })).rejects.toMatchObject({ code: "MARK_FAILED" });
  expect(fusion.rows[0].llmMeta.reviewAlertAt).toEqual(NOW);
  expect(ziwei.rows[0].llmMeta.recovery.reviewAlertAt).toEqual(NOW);
  expect(narrative.rows[0].metadata.paidNarrativeRecovery.reviewAlertAt).toBeUndefined();
  // 실패한 건만 다음 호출에서 다시 조회·표식된다.
  expect(await alertDeliveryReviews({}, { now: NOW, send: delivered() })).toEqual({ found: 1, delivered: true, marked: 1 });
});

test("종류당 limit(기본 20)과 본문 길이 한도 — 본문에 못 실은 건은 표식 없이 다음 호출로 간다", async () => {
  const many = Array.from({ length: 30 }, (_, i) => narrativeRow(`n${String(i).padStart(2, "0")}`, { featureKey: "k".repeat(70), serviceId: "s".repeat(100) }));
  seed({ n: many });
  const send = delivered();
  const first = await alertDeliveryReviews({}, { now: NOW, send });
  expect(narrative.limits).toEqual([20]);
  expect(first.found).toBe(20);
  const { text } = send.mock.calls[0][1];
  expect(text.length).toBeLessThanOrEqual(1900);
  expect(first.marked).toBeGreaterThan(0);
  expect(first.marked).toBeLessThan(20);
  expect(narrative.rows.filter((row) => row.metadata.paidNarrativeRecovery.reviewAlertAt).length).toBe(first.marked);
  expect(text).toContain(`(외 ${20 - first.marked}건은 다음 알림)`);
  seed({ f: [fusionRow("f1")] });
  await alertDeliveryReviews({}, { now: NOW, send: delivered(), limit: 5 });
  expect(fusion.limits).toEqual([5]);
});

test("조회 결과가 없으면 발송도 쓰기도 하지 않는다", async () => {
  seed();
  const send = delivered();
  expect(await alertDeliveryReviews({}, { now: NOW, send })).toEqual({ found: 0, delivered: false, marked: 0 });
  expect(send).not.toHaveBeenCalled();
});

test("10분 크론에 태스크로 연결돼 있고 실패는 Task 5 알림(tickFailed)을 탄다", () => {
  const source = readFileSync("worker/index.js", "utf8");
  const start = source.indexOf('import("./lib/delivery-review-alert.js")');
  expect(start).toBeGreaterThan(0);
  const block = source.slice(start - 40, start + 600);
  expect(block).toContain("trackTask(");
  expect(block).toContain("alertDeliveryReviews(env)");
  expect(block).toContain('console.error("[delivery-review-alert]');
  expect(block).toContain('tickFailed("delivery-review-alert"');
});
