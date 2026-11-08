/** @jest-environment node */
import { jest } from "@jest/globals";
// 운명의 업 V2(16장) 구성 동작 — 2026-11-08 "분량 부족으로 실패가 나와서 전달이 안되는 일이 없도록"
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));


const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 운명의 업", calendarType: "solar", focusArea: "overall", accessType: "pass" };
let utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation;
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
const get = (doc, key) => key.split(".").reduce((value, field) => value?.[field], doc);
function assign(doc, fields) { for (const [key,value] of Object.entries(fields)) { const keys=key.split("."); let target=doc; for(const part of keys.slice(0,-1)) target=target[part] ||= {}; target[keys.at(-1)]=clone(value); } }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("$ne" in value) return get(doc, key) !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(get(doc, key));
      if ("$in" in value) return value.$in.includes(get(doc, key));
      if ("$exists" in value) return (get(doc, key) !== undefined) === value.$exists;
      if ("$lt" in value) return new Date(get(doc, key)) < value.$lt;
    }
    return String(get(doc, key)) === String(value);
  });
}
const model = {
  findOne: filter => { if (lostConfirmation) { lostConfirmation = false; return query(null); } return query(docs.find(doc => matches(doc, filter)) || null); },
  create: async fields => {
    if (docs.some(doc => doc.userId === fields.userId && doc.idempotencyKey === fields.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = { ...clone(fields), createdAt: new Date(), updatedAt: new Date() }; docs.push(doc); return clone(doc);
  },
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
  findOneAndUpdate: (filter, update) => {
    if (fault && (fault.chapterCount ? update.$set.chapters?.length === fault.chapterCount : update.$set.status === fault.status)) {
      const current = fault; fault = null;
      if (current.kind === "throw") throw new Error("mock storage");
      if (current.kind === "null") return query(null);
      if (current.kind === "confirm") lostConfirmation = true;
    }
    const doc = docs.find(row => matches(row, filter));
    if (doc) assign(doc, { ...update.$set, updatedAt: new Date() });
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    const doc = docs.find(row => matches(row, filter));
    if (doc) assign(doc, update.$set);
    return { modifiedCount: doc ? 1 : 0 };
  },
};

function prose(seed, length) {
  let value = `${seed} 양자리 라그나와 Ashwini의 계산 근거를 살펴봅니다. `;
  for (let i = 0; value.replace(/\s/g, "").length < length; i++) value += `${seed}의 ${i}번째 관찰은 현재 생활에서 반복되는 선택을 돌아보고 작은 행동으로 확인하는 과정을 설명합니다. `;
  return value;
}
beforeAll(async () => {
  const pass = await import("../../worker/lib/pass-consumption.js");
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ ...pass,
    consumePassForFeature: async () => ({ covered: true }) }));
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const entitlement = await import("../../worker/lib/entitlement-policy.js");

  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, KarmaDestinyAiConsultation: model,
    User: { findById: () => query({ _id: uid, role: "user" }), updateOne: (...args) => refund(...args) },
    ServiceExecutionTransaction: { find: () => ({ sort() { return this; }, limit() { return this; }, lean: async () => [] }) },
    PaidExecutionRecord: { findOne: filter => query(blocked === 0 ? {} : mode === "deferred" && filter.status.$in.includes("generating") ? { _id: uid, requestId: "original-paid-request", status: "generating", accessMethod: "pass" } : null) },
    Payment: { findOne: filter => query(blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: (...args) => provider(...args) }));
  const calc = await import("../../worker/lib/karma-destiny-ai-calculations.js");
  jest.unstable_mockModule("../../worker/lib/karma-destiny-ai-calculations.js", () => ({ ...calc, buildKarmaDestinyIntegratedResult: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({ BILLING_SNAPSHOT_USER_PROJECTION: "id", handleBillingRoutes: async request => { const payload = await request.json(); if (request.url.endsWith("/cancel")) refund(payload); else usage(payload); return new Response(JSON.stringify({ ok: true })); } }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleKarmaDestinyAiRoutes: route, __karmaDestinyAiTestUtils: utils } = await import("../../worker/routes/karma-destiny-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({}));
  provider = jest.fn(async (_env, prompt, options) => {
    expect(options.timeoutMs).toBe(45000); expect(options.fallbackToWorkersAI).toBe(false);
    const id = options.cache.keyExtra.match(/chapter-(chapter-\d+)/)[1];
    const definition = utils.PREMIUM_CHAPTERS_V2.find(row => row.id === id);
    return { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ id, title: definition.title, content: prose(id, 2250), summary: `${id}에서 확인한 선택`, keyTakeaways: [`${id} 기준 확인`, `${id} 상황 기록`, `${id} 행동 실험`], highlightQuotes: [] }) };
  });
  chart = jest.fn(async () => ({ lenses: { saju: { confidence: "high", data: { dayMaster: "갑" } }, ziwei: { confidence: "none" }, vedic: { confidence: "none" }, western: { confidence: "none" }, sukuyo: { confidence: "none" } }, synthesis: {}, saju: { dayMaster: "갑" } }));
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
async function start(extra = {}) {
  return route(new Request("https://mock.test/api/karma-destiny-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, ...extra }) }), {});
}


async function batch() { return route(new Request("https://mock.test/api/karma-destiny-ai/generate-batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: docs[0]?.id }) }), {}); }
const QUESTION = "올해 이직을 해도 될지 너무 고민입니다";
const payload = (id, content, extra = {}) => ({ ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ id, title: id, content, summary: `${id} 요약`, keyTakeaways: [`${id} 하나`, `${id} 둘`, `${id} 셋`], highlightQuotes: [], ...extra }) });
const idOf = options => options.cache.keyExtra.match(/chapter-(chapter-\d+)/)[1];
async function runToEnd(limit = 20) { let last; for (let i = 0; i < limit && docs[0].status !== "completed"; i++) { last = await batch(); expect(last.status).not.toBe(503); } return last; }

it("V2 plan has 16 chapters with chapter-00 first and chapter-01 as the only question owner; V1 stays 15", () => {
  expect(utils.PREMIUM_CHAPTERS).toHaveLength(15);
  expect(utils.PREMIUM_CHAPTERS_V2).toHaveLength(16);
  expect(utils.PREMIUM_CHAPTERS_V2.map(c => c.id)).toEqual(Array.from({ length: 16 }, (_, i) => `chapter-${String(i).padStart(2, "0")}`));
  expect(utils.PREMIUM_CHAPTERS_V2.filter(c => c.questionOwner).map(c => c.id)).toEqual(["chapter-01"]);
  expect(utils.karmaPlanVersion({})).toBe(1);
  expect(utils.karmaPlanVersion({ llmMeta: { chapterPlanVersion: 2 } })).toBe(2);
  expect(utils.chapterMaxOutputTokens(utils.PREMIUM_CHAPTERS[1])).toBe(7000);
  expect(utils.chapterMaxOutputTokens(utils.PREMIUM_CHAPTERS_V2[2])).toBeGreaterThan(7000);
});

it("new sessions start on plan 2 and only the owner chapter quotes the question", async () => {
  await start({ question: QUESTION });
  expect(docs[0].llmMeta.chapterPlanVersion).toBe(2);
  expect(docs[0].generationProgress.totalChapters ?? docs[0].generationProgress.total).toBe(16);
  const prompt = id => utils.buildChapterPrompt(docs[0], utils.PREMIUM_CHAPTERS_V2.find(c => c.id === id), {});
  expect(prompt("chapter-01").split(QUESTION)).toHaveLength(2);
  expect(prompt("chapter-05")).not.toContain(QUESTION);
  expect(prompt("chapter-05")).toContain("질문 배경");
  expect(prompt("chapter-00")).toContain("질문 처리");
  expect(prompt("chapter-00")).toContain("이 장의 시선");
  const v1 = utils.buildChapterPrompt(docs[0], utils.PREMIUM_CHAPTERS[0], {});
  expect(v1).toContain(`현재 질문: ${QUESTION}`);
  expect(v1).not.toMatch(/이 장의 시선|질문 배경|질문 처리/);
  expect(utils.buildSystemPrompt("initial")).toBe(utils.buildSystemPrompt("initial", null, 1));
});

it("soft issues flag register drift and question re-quoting only on V2 definitions", () => {
  const yo = Array.from({ length: 8 }, (_, i) => `${i}번째 장면에서 마음이 천천히 움직이는 흐름이 보여요.`).join(" ");
  const def = utils.PREMIUM_CHAPTERS_V2[5];
  expect(utils.detectKarmaSoftIssues(yo, def, "").map(i => i.code)).toEqual(["REGISTER_DRIFT"]);
  expect(utils.detectKarmaSoftIssues(yo, utils.PREMIUM_CHAPTERS[4], "")).toEqual([]);
  const requote = `당신은 ${QUESTION}라고 물었습니다. 이 장은 다른 흐름을 봅니다.`;
  expect(utils.detectKarmaSoftIssues(requote, def, QUESTION).map(i => i.code)).toEqual(["QUESTION_REQUOTED"]);
  expect(utils.detectKarmaSoftIssues(requote, utils.PREMIUM_CHAPTERS_V2[1], QUESTION)).toEqual([]);
});

it("a chapter that keeps drifting is repaired twice then scrubbed and delivered, never refunded", async () => {
  await start();
  const base = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => idOf(args[2]) === "chapter-05" ? payload("chapter-05", prose("chapter-05", 2250).replace(/설명합니다\./g, "설명해요.")) : base(...args));
  await runToEnd();
  expect(docs[0].status).toBe("completed");
  expect(docs[0].chapters.map(c => c.id)).toContain("chapter-05");
  expect(docs[0].llmMeta.attempts["chapter-05:scrubbed"]).toBe(1);
  expect(provider.mock.calls.filter(c => idOf(c[2]) === "chapter-05").length).toBeLessThanOrEqual(3);
  expect(refund).not.toHaveBeenCalled();
});

it("a chapter that repeats another chapter is deduped and kept, not dropped", async () => {
  await start();
  const base = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => idOf(args[2]) === "chapter-07" ? payload("chapter-07", `${prose("chapter-03", 2250)} ${prose("chapter-07", 2250)}`) : base(...args));
  await runToEnd();
  expect(docs[0].status).toBe("completed");
  const seventh = docs[0].chapters.find(c => c.id === "chapter-07");
  expect(seventh.content).toContain("상담 항목-07의");
  expect(seventh.content).not.toContain("상담 항목-03의 0번째");
  expect(refund).not.toHaveBeenCalled();
});

it("short reports run at most two length repairs and are still delivered", async () => {
  await start();
  provider.mockImplementation(async (_env, _prompt, options) => payload(idOf(options), prose(idOf(options), 1200)));
  await runToEnd();
  expect(docs[0].status).toBe("completed");
  expect(docs[0].llmMeta.attempts.lengthRepairRounds).toBe(2);
  expect(provider).toHaveBeenCalledTimes(18);
  expect(refund).not.toHaveBeenCalled();
});

it("assembly dedupe removes sentences already said by an earlier chapter and keeps emptied chapters intact", () => {
  const shared = "이 문장은 앞 장과 뒤 장에 똑같이 들어간 꽤 긴 관찰 문장입니다.";
  const out = utils.dedupeKarmaAssembly([
    { id: "chapter-02", order: 3, content: shared },
    { id: "chapter-01", order: 2, content: `${shared} 첫 장만의 고유한 관찰을 길게 적어 둔 문장입니다.` },
    { id: "chapter-03", order: 4, content: `${shared} 셋째 장만의 고유한 관찰을 길게 적어 둔 문장입니다.` },
  ]);
  expect(out.map(c => c.id)).toEqual(["chapter-01", "chapter-02", "chapter-03"]);
  expect(out[1].content).toBe(shared);
  expect(out[2].content).not.toContain(shared);
});

it("an in-flight V1 session without a stored plan version keeps the 15-chapter plan", async () => {
  await start();
  delete docs[0].llmMeta.chapterPlanVersion;
  await runToEnd();
  expect(docs[0].status).toBe("completed");
  expect(docs[0].chapters).toHaveLength(15);
  expect(docs[0].chapters.map(c => c.id)).not.toContain("chapter-00");
});
