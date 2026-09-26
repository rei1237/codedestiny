/** @jest-environment node */
import { jest } from "@jest/globals";

const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 차트 해석" };
let route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation;
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("$ne" in value) return doc[key] !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(doc[key]);
      if ("$in" in value) return value.$in.includes(doc[key]);
      if ("$exists" in value) return (doc[key] !== undefined) === value.$exists;
      if ("$lt" in value) return new Date(doc[key]) < value.$lt;
    }
    return String(doc[key]) === String(value);
  });
}
const model = {
  findOne: filter => { if (lostConfirmation) { lostConfirmation = false; return query(null); } return query(docs.find(doc => matches(doc, filter)) || null); },
  create: async fields => {
    if (docs.some(doc => doc.userId === fields.userId && doc.idempotencyKey === fields.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = { ...clone(fields), createdAt: new Date(), updatedAt: new Date() }; docs.push(doc); return clone(doc);
  },
  findOneAndUpdate: (filter, update) => {
    if (fault && update.$set.status === fault.status) {
      const current = fault; fault = null;
      if (current.kind === "throw") throw new Error("mock storage");
      if (current.kind === "null") return query(null);
      if (current.kind === "confirm") lostConfirmation = true;
    }
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
function prose(seed, length = 3650) {
  let text = `## 분석 ${seed}\n${seed}번의 태양 달 상승궁 수성 금성 화성 목성 토성 원소 균형 하우스 트랜짓 선택 기준 실천 루틴.\n`;
  for (let i = 0; text.replace(/\s/g, "").length < length; i++) text += `${seed}번 분석의 ${i}번째 관찰에서는 계산된 배치를 기준으로 생활의 선택을 살핍니다. `;
  return text;
}
beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const access = await import("../../worker/lib/paid-feature-access.js");
  const gemini = await import("../../worker/lib/gemini.js");
  const swiss = await import("../../worker/lib/swiss-ephemeris.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId, authUserDoc: { _id: userId } }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, AstrologyAiConsultation: model,
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null), findOneAndUpdate: (...args) => { usage(...args); return query({}); } },
    Payment: { findOne: filter => query(blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null) },
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({ ...access, canAccessPaidFeature: async () => ({ allowed: mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? {} : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ ...gemini, callGeminiText: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({ ...swiss, getSwissWesternChart: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({ startServiceExecution: async () => ({}), completeServiceExecution: async () => ({}), failServiceExecution: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  ({ handleAstrologyAiRoutes: route } = await import("../../worker/routes/astrology-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({}));
  let count = 0;
  provider = jest.fn(async (_env, _prompt, options) => {
    expect(options.attempts).toBe(1); expect(options.timeoutMs).toBeLessThanOrEqual(45000);
    return { ok: true, provider: "gemini", model: "fixture", text: prose(++count) };
  });
  chart = jest.fn(async () => ({ planets: { Sun: { sign: 0, degree: 5, longitude: 5 }, Moon: { sign: 1, degree: 6, longitude: 36 } }, aspects: [], houseCusps: [] }));
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
for (const flags of [{ truncated: true }, { finishReason: "length" }]) it(`does not save a long clipped section as complete: ${JSON.stringify(flags)}`, async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => ({ ...await normal(...args), ...flags }));
  expect((await start()).status).toBe(202);
  expect(Object.keys(docs[0].llmMeta.sections)).toHaveLength(0);
  provider.mockImplementation(normal);
  for (let wave = 0; wave < 3; wave++) await start();
  expect(docs[0].status).toBe("completed");
});
async function start(extra = {}) {
  return route(new Request("https://mock.test/api/astrology-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, ...extra }) }), {});
}
for (const paid of ["pass", "monthly", "paid"]) it(`${paid}: reuses sections and calculation across three requests`, async () => {
  mode = paid;
  let response = await start(); expect(response.status).toBe(202);
  const partial = await response.json(); expect(partial.completedSections).toHaveLength(2); expect(usage).not.toHaveBeenCalled();
  response = await start({ resumeSessionId: partial.sessionId }); expect(response.status).toBe(202);
  response = await start({ resumeSessionId: partial.sessionId }); expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ saved: true, status: "completed", sessionId: partial.sessionId });
  expect(provider).toHaveBeenCalledTimes(6); expect(chart).toHaveBeenCalledTimes(2); expect(refund).not.toHaveBeenCalled();
});
for (const status of ["delivery_pending", "completed"]) for (const kind of ["null", "throw", "confirm"]) it(`${status} storage ${kind} is retryable and never refunded`, async () => {
  await start(); await start(); fault = { status, kind };
  const response = await start(); expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ reason: "RESULT_STORAGE_UNAVAILABLE", retryable: true });
  expect(refund).not.toHaveBeenCalled(); expect(usage).not.toHaveBeenCalled();
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(6);
});
it("stops after three short section attempts", async () => {
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 3; i++) expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(503); expect(provider).toHaveBeenCalledTimes(6);
  expect((await start()).status).toBe(409);
});
for (const index of [0, 1, 2, 3]) it(`rejects revoked proof source ${index}`, async () => {
  await start(); blocked = index;
  expect((await start()).status).toBe(402); expect(provider).toHaveBeenCalledTimes(2);
});
it("rejects another account resume and preserves historical results", async () => {
  const partial = await (await start()).json(); userId = "another-user";
  expect((await start({ resumeSessionId: partial.sessionId })).status).toBe(404);
  userId = uid; docs[0].status = "completed"; docs[0].messages = [{ role: "assistant", content: "과거 구매본" }];
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(2);
});
it("serializes concurrent requests with the stored lease", async () => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const original = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => { await held; return original(...args); });
  const first = start();
  for (let i = 0; i < 200 && provider.mock.calls.length < 2; i++) await new Promise(resolve => setImmediate(resolve));
  expect(provider).toHaveBeenCalledTimes(2);
  expect((await start()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(2);
  release(); expect((await first).status).toBe(202);
});
it("returns a saved result when usage bookkeeping fails", async () => {
  await start(); await start(); usage.mockImplementation(() => { throw new Error("bookkeeping unavailable"); });
  expect((await start()).status).toBe(200); expect(docs[0].status).toBe("completed"); expect(refund).not.toHaveBeenCalled();
});
it("discovers the owned pending result after a new login", async () => {
  const payload = await (await start()).json();
  const getPending = () => route(new Request("https://mock.test/api/astrology-ai/pending"), {});
  expect(await (await getPending()).json()).toMatchObject({ sessionId: payload.sessionId });
  userId = "another-user";
  expect(await (await getPending()).json()).toMatchObject({ sessionId: "" });
});

for (const repair of ["shorter", "repeated", "empty", "truncated", "throw"]) it(`preserves the longer valid short draft after one ${repair} repair`, async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const call = provider.mock.calls.length;
    if (call === 1) return { ok: true, provider: "gemini", text: prose("초안", 3000) };
    if (call === 3) {
      expect(args[1]).toContain("[보강 요청]");
      if (repair === "throw") throw new Error("provider unavailable");
      const text = repair === "empty" ? "" : repair === "repeated" ? prose("반복", 4500) + prose("반복", 4500) : prose("보강", 2800);
      return { ok: true, provider: "gemini", text, truncated: repair === "truncated" };
    }
    return normal(...args);
  });
  expect((await start()).status).toBe(202);
  const [key] = Object.keys(docs[0].llmMeta.sections);
  const draft = clone(docs[0].llmMeta.sections[key]);
  for (let i = 0; i < 4 && docs[0].status !== "completed"; i++) await start();
  expect(docs[0].status).toBe("completed");
  expect(docs[0].llmMeta.sections[key]).toEqual(draft);
  expect(docs[0].llmMeta.attempts[key]).toBe(2);
  expect(provider).toHaveBeenCalledTimes(7); expect(refund).not.toHaveBeenCalled();
});
it("accepts a valid short section on the last attempt after structural failures", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => provider.mock.calls.length <= 4
    ? { ok: true, text: "", provider: "gemini" }
    : provider.mock.calls.length <= 6 ? { ok: true, text: prose(`최종${provider.mock.calls.length}`, 3000), provider: "gemini" } : normal(...args));
  for (let i = 0; i < 6 && docs[0]?.status !== "completed"; i++) await start();
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(10);
});
it("trims overlong sections without rejecting or regenerating them", async () => {
  provider.mockImplementation(async () => ({ ok: true, provider: "gemini", text: prose(`상한${provider.mock.calls.length}`, 6500) }));
  for (let i = 0; i < 3; i++) await start();
  const { countPaidReportBodyChars } = await import("../../worker/lib/paid-report-quality.js");
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(6);
  for (const row of Object.values(docs[0].llmMeta.sections)) expect(countPaidReportBodyChars(row.text)).toBeLessThanOrEqual(6000);
});
it("keeps the 20000 total floor and bounds total-shortfall calls", async () => {
  provider.mockImplementation(async () => ({ ok: true, provider: "gemini", text: prose(`부족${provider.mock.calls.length}`, 1000) }));
  for (let i = 0; i < 12; i++) expect((await start()).status).toBe(202);
  expect(provider).toHaveBeenCalledTimes(18); expect(docs[0].status).not.toBe("completed");
  expect(usage).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled();
});
