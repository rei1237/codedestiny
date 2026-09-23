/** @jest-environment node */
// 30행 운명의 섬 12궁 심층 상담 — 계산 근거 대조.
// 기존 ziwei-island-paid-delivery.test.js 는 calculateZiweiAiChart 를 "명궁 하나 + 주성 자미" 스텁으로
// 대역한다. 그 대역된 자리가 사각이라 실제 명반에서만 나오는 무주성(주성 없는 궁)을 한 번도 태우지
// 못했다. 이 스위트는 명반 계산기를 대역하지 않는다 — 실제 계산기가 만든 명반으로만 판정한다.
import { jest } from "@jest/globals";
import { countPaidReportBodyChars } from "../../worker/lib/paid-report-quality.js";

const uid = "64b7f2a1c3d4e5f601234567";
const coinId = "64b7f2a1c3d4e5f6a1b2c3d4";
// 실측 고정 입력: 1988-02-29 출생시간 미상 → 실제 명반에서 명궁이 무주성이다(아래 전제 단언으로 고정).
const birth = { name: "검사", gender: "male", birthDate: "1988-02-29", birthTimeUnknown: true, calendarType: "solar" };

let route, chartOf, palaceEvidenceOf, docs, points, provider, userId, refundMarks, fetchBlock;

const clone = value => (value == null ? value : structuredClone(value));
function readPath(doc, path) { return String(path).split(".").reduce((current, key) => current?.[key], doc); }
function setPath(doc, path, value) {
  const keys = String(path).split(".");
  const last = keys.pop();
  let cursor = doc;
  for (const key of keys) cursor = cursor[key] ??= {};
  cursor[last] = value;
}
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = result.limit = () => result; return result; }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    if (key === "$and") return value.every(row => matches(doc, row));
    const actual = readPath(doc, key);
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      if ("$ne" in value) return actual !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(actual);
      if ("$in" in value) return value.$in.includes(actual);
      if ("$exists" in value) return (actual !== undefined) === value.$exists;
      if ("$lt" in value) return new Date(actual) < value.$lt;
    }
    return String(actual) === String(value);
  });
}
const consultation = {
  findOne: filter => query(docs.find(doc => matches(doc, filter)) || null),
  create: async fields => {
    if (docs.some(doc => doc.userId === fields.userId && doc.idempotencyKey === fields.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = { usageAppliedAt: null, ...clone(fields), createdAt: new Date(), updatedAt: new Date() };
    docs.push(doc);
    return clone(doc);
  },
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
  findOneAndUpdate: (filter, update) => {
    const doc = docs.find(row => matches(row, filter));
    if (doc) Object.assign(doc, clone(update.$set), { updatedAt: new Date() });
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    const doc = docs.find(row => matches(row, filter));
    if (doc) Object.assign(doc, clone(update.$set));
    return { modifiedCount: doc ? 1 : 0 };
  },
};
const pointHistory = {
  findOne: filter => query(points.find(row => matches(row, filter)) || null),
  updateOne: async (filter, update) => {
    const row = points.find(item => matches(item, filter));
    if (!row) return { modifiedCount: 0 };
    Object.entries(update.$set).forEach(([key, value]) => setPath(row, key, value));
    if (update.$set["metadata.refundedForServiceExecution"] === true) refundMarks += 1;
    return { modifiedCount: 1 };
  },
  updateMany: async () => ({ modifiedCount: 0 }),
  create: async fields => { points.push(clone(fields)); return clone(fields); },
};

beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const entitlement = await import("../../worker/lib/entitlement-policy.js");
  const structured = await import("../../worker/lib/structured-consultation.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ...models,
    ZiweiAiConsultation: consultation,
    User: { findById: () => query({ _id: uid, role: "user" }), findByIdAndUpdate: () => query({ points: 800 }), updateOne: async () => ({}) },
    PaidExecutionRecord: { findOne: () => query(null) },
    Payment: { findOne: () => query(null), updateOne: async () => ({}), findByIdAndUpdate: () => query(null) },
    PointHistory: pointHistory,
    MonthlyCreditLedger: { findOne: () => query(null), updateOne: async () => ({}) },
  }));
  // 이용권·월정석은 닫고 코인 선차감 증빙만 남긴다 — 환불이 실제로 걸리는 유일한 경로다.
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: false }) }));
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ consumePassForFeature: async () => ({ covered: true }), passDenialCode: () => "" }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ fetchPortOnePayment: () => { throw new Error("PG blocked"); }, getPortOnePublicConfig: () => { throw new Error("PG blocked"); }, getPortOneConfig: () => { throw new Error("PG blocked"); } }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => null }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({ ...structured, callGeminiJsonWithRetry: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleZiweiIslandAiRoutes: route } = await import("../../worker/routes/ziwei-island-ai.js"));
  ({ calculateZiweiAiChart: chartOf } = await import("../../worker/lib/ziwei-ai-chart.js"));
  ({ palaceEvidence: palaceEvidenceOf } = await import("../../worker/lib/island/consult/palace-delivery.js"));
});

beforeEach(() => {
  docs = []; userId = uid; refundMarks = 0;
  points = [{ _id: coinId, userId: uid, kind: "deduct", featureKey: "ziwei-island-palace-consult", delta: -200, metadata: { requestId: "original-paid-request", purchaseId: "original-paid-request" } }];
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });

/** 프롬프트가 건네준 확정값을 그대로 되돌려주고, 본문에는 지정한 별만 쓰는 모델 대역. */
function modelCiting(stars) {
  return jest.fn(async (_env, prompt, options) => {
    const echoed = JSON.parse(prompt.match(/"evidence":(\{[^}]*\})\}\./)[1]);
    const seed = options.logContext.sectionGroup;
    let text = `${seed} 부분이에요. ${stars.join("·")}의 결을 중심으로 이 궁을 읽어 드릴게요. `;
    for (let index = 0; countPaidReportBodyChars(text) < 2700; index += 1) {
      text += `${seed}의 ${index}번째 관찰에서는 ${stars[index % stars.length]}이(가) 만드는 흐름을 살피고, 그 자리에서 오늘 실천할 수 있는 작은 선택 ${index}가지를 골라 정리해 보았어요. `;
    }
    return { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ body: text, evidence: echoed }) };
  });
}
function start(extra = {}) {
  return route(new Request("https://mock.test/api/ziwei-island-ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" },
    body: JSON.stringify({ ...birth, accessType: "coin", ...extra }),
  }), {});
}
function realChart() { return chartOf({ palaceKey: "명궁", birthInfo: birth }, { year: new Date().getFullYear() }); }
function triadStars(chart, palaceKey) { return [...new Set(chart?.sanFangSiZheng?.byPalace?.[palaceKey]?.mainStars || [])]; }

it("전제: 실제 명반에서 명궁은 무주성이고 삼방사정 주성은 존재한다", () => {
  const chart = realChart();
  expect(palaceEvidenceOf("명궁", chart).mainStars).toEqual([]);
  expect(palaceEvidenceOf("명궁", chart).daeun).toBeTruthy();
  expect(triadStars(chart, "명궁").length).toBeGreaterThan(0);
});

it("무주성 궁: 명반에 없는 주성만 인용한 본문은 유료 완주하지 못하고 환불된다", async () => {
  const chart = realChart();
  const invented = ["자미", "천부", "무곡"].filter(star => !triadStars(chart, "명궁").includes(star));
  expect(invented.length).toBeGreaterThan(0);
  provider = modelCiting(invented);
  expect((await start({ palaceKey: "명궁" })).status).toBe(202);
  expect((await start({ palaceKey: "명궁" })).status).toBe(202);
  const exhausted = await start({ palaceKey: "명궁" });
  expect(exhausted.status).toBe(503);
  expect(await exhausted.json()).toMatchObject({ ok: false, reason: "LLM_ERROR" });
  expect(docs[0].status).toBe("generation_failed");
  expect(refundMarks).toBe(1);
});

it("과차단 아님 — 무주성 궁도 삼방사정 주성을 인용하면 정상 완주한다", async () => {
  const chart = realChart();
  provider = modelCiting(triadStars(chart, "명궁").slice(0, 2));
  expect((await start({ palaceKey: "명궁" })).status).toBe(202);
  const second = await start({ palaceKey: "명궁" });
  expect(second.status).toBe(200);
  expect(await second.json()).toMatchObject({ consultation: { saved: true, status: "completed" } });
  expect(refundMarks).toBe(0);
});

it("대조할 확정값이 없는 저장 명반은 제공자를 부르기 전에 422 로 닫고 선차감을 되돌린다", async () => {
  const chart = realChart();
  provider = modelCiting(triadStars(chart, "명궁").slice(0, 1));
  expect((await start({ palaceKey: "명궁" })).status).toBe(202);
  const calls = provider.mock.calls.length;
  // 저장된 명반에서 인용 기준(주성·삼방사정 주성)을 모두 지운다 — 요청은 그대로다.
  docs[0].llmMeta.chart = { ...docs[0].llmMeta.chart, palaces: docs[0].llmMeta.chart.palaces.map(palace => ({ ...palace, mainStars: [] })), sanFangSiZheng: { byPalace: {} } };
  const closed = await start({ palaceKey: "명궁" });
  expect(closed.status).toBe(422);
  expect(await closed.json()).toMatchObject({ ok: false, retryable: false, reason: "CALCULATION_INCOMPLETE" });
  expect(provider).toHaveBeenCalledTimes(calls);
  expect(refundMarks).toBe(1);
});

it("주성이 있는 궁은 자기 주성 인용으로 종전대로 완주한다", async () => {
  const chart = realChart();
  const own = palaceEvidenceOf("재백궁", chart).mainStars;
  expect(own.length).toBeGreaterThan(0);
  provider = modelCiting(own);
  expect((await start({ palaceKey: "재백궁" })).status).toBe(202);
  expect((await start({ palaceKey: "재백궁" })).status).toBe(200);
  expect(refundMarks).toBe(0);
});
