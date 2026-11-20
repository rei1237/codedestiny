/** @jest-environment node */
import { jest } from "@jest/globals";
import sift from "sift";
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));


const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 운명의 업", calendarType: "solar", focusArea: "overall", accessType: "pass" };
let settleDue, recordCancel, utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation, passRefund, consume, accessQueue, passOrder, withdrawn;
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
  find: filter => {
    const local = v => Object.prototype.toString.call(v) === "[object Date]" ? new Date(v.getTime()) : Array.isArray(v) ? v.map(local) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, local(x)])) : v;
    const rows = JSON.stringify(filter || {}).includes("llmMeta") ? docs.filter(doc => sift(filter)(local(doc))) : [];
    return { sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => clone(rows) };
  },
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
    consumePassForFeature: (...args) => consume(...args), refundPassUseEvidence: async (...args) => passRefund(...args) }));
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const entitlement = await import("../../worker/lib/entitlement-policy.js");

  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, KarmaDestinyAiConsultation: model,
    User: { findById: () => query({ _id: uid, role: "user" }), findOne: () => query({ _id: uid, role: "user", status: withdrawn ? "withdrawn" : "active" }), updateOne: (...args) => refund(...args) },
    ServiceExecutionTransaction: { find: () => ({ sort() { return this; }, limit() { return this; }, lean: async () => [] }) },
    PaidExecutionRecord: { updateOne: async (...args) => { recordCancel(...args); return { modifiedCount: 1 }; }, findOne: filter => query(blocked === 0 ? {} : mode === "deferred" && filter.status.$in.includes("generating") ? { _id: uid, requestId: "original-paid-request", status: "generating", accessMethod: "pass" } : null) },
    Payment: { findOne: filter => query(filter.paymentType === "membership_pass" ? passOrder : blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: accessQueue.length ? accessQueue.shift() : mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: (...args) => provider(...args) }));
  const calc = await import("../../worker/lib/karma-destiny-ai-calculations.js");
  jest.unstable_mockModule("../../worker/lib/karma-destiny-ai-calculations.js", () => ({ ...calc, buildKarmaDestinyIntegratedResult: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({ BILLING_SNAPSHOT_USER_PROJECTION: "id", handleBillingRoutes: async request => { const payload = await request.json(); if (request.url.endsWith("/cancel")) refund(payload); else usage(payload); return new Response(JSON.stringify({ ok: true })); } }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleKarmaDestinyAiRoutes: route, __karmaDestinyAiTestUtils: utils, settleDueKarmaRetryRefunds: settleDue } = await import("../../worker/routes/karma-destiny-ai.js"));
});
beforeEach(() => {
  accessQueue = []; passOrder = null; withdrawn = false; docs = []; recordCancel = jest.fn(); fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({})); passRefund = jest.fn(async () => ({ refunded: true })); consume = jest.fn(async () => ({ covered: true }));
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
for (const paid of ["pass", "monthly", "paid", "deferred"]) it(`${paid}: four bounded waves preserve chapters and original usage key`, async () => {
  mode = paid; expect((await start()).status).toBe(202);
  for (let wave=0;wave<3;wave++) { expect((await batch()).status).toBe(202); expect(docs[0].chapters).toHaveLength((wave+1)*4); expect(usage).not.toHaveBeenCalled(); }
  expect((await batch()).status).toBe(200); expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(16); expect(chart).toHaveBeenCalledTimes(1);
  expect(docs[0].chapters[0].id).toBe("chapter-00"); expect(docs[0].llmMeta.chapterPlanVersion).toBe(2);
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(16); expect(refund).not.toHaveBeenCalled();
});
for(const status of ["delivery_pending","completed"]) for(const kind of ["null","throw","confirm"]) it(`${status} ${kind}: storage failure preserves generated report`,async()=>{
  mode="deferred"; await start(); for(let i=0;i<3;i++) await batch(); fault={status,kind}; const response=await batch(); expect(response.status).toBe(503); expect(await response.json()).toMatchObject({reason:"RESULT_STORAGE_UNAVAILABLE",retryable:true}); expect(refund).not.toHaveBeenCalled(); const calls=provider.mock.calls.length; fault=null;
  expect((await batch()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(calls);
});
it("one interrupted chapter does not discard its successful siblings",async()=>{
  await start(); const base=provider.getMockImplementation(); provider.mockImplementation(async(...args)=>args[2].cache.keyExtra.endsWith('chapter-02')?{ok:false}:base(...args));
  expect((await batch()).status).toBe(202); expect(docs[0].chapters.map(c=>c.id)).toEqual(['chapter-00','chapter-01','chapter-03']); const first=structuredClone(docs[0].chapters[0]);
  provider.mockImplementation(base); expect((await batch()).status).toBe(202); expect(docs[0].chapters[0]).toEqual(first); expect(provider.mock.calls.filter(c=>c[2].cache.keyExtra.endsWith('chapter-00'))).toHaveLength(1);
});
for(const store of [0,1,2,3]) it(`revoked store ${store} blocks resume before provider`,async()=>{ await start(); blocked=store; expect((await batch()).status).toBe(402); expect(provider).not.toHaveBeenCalled(); });
// 2026-11-08 분량은 절대 전달을 막지 않는다: 짧아도 형식이 맞는 본문은 두 번째(마지막) 시도에서 다듬어 실린다.
it("short valid output is delivered on the last attempt instead of failing",async()=>{await start(); provider.mockImplementation(async(_env,_prompt,options)=>({ok:true,text:JSON.stringify({content:`${options.cache.keyExtra.slice(-10)} 짧은 본문입니다.`})}));for(let i=0;i<12&&docs[0].status!=='completed';i++) expect((await batch()).status).not.toBe(503);expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(34);expect(refund).not.toHaveBeenCalled();});
// 본문이 세 번 다 오지 않으면 실패한다. 2026-11-20 R10: 환불 대신 7일 동안 무료 다시 시도로 보류한다(차감·환불 없음).
it("a chapter that never returns text fails after three attempts and is never charged",async()=>{await start(); provider.mockImplementation(async()=>({ok:false}));for(let i=0;i<2;i++) expect((await batch()).status).toBe(202);const held=await batch();expect(held.status).toBe(503);expect(await held.json()).toMatchObject({reason:"LLM_ERROR",refunded:false,retry:{available:true}});expect(provider).toHaveBeenCalledTimes(12);expect(usage).not.toHaveBeenCalled();expect(passRefund).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();});
it("late pass settlement denial still delivers the finished report",async()=>{
  const warn=jest.spyOn(console,"warn").mockImplementation(()=>{});
  mode="pass"; await start(); for(let i=0;i<3;i++) await batch(); consume.mockResolvedValue({covered:false,reason:"monthly_pass_limit_exceeded"});
  expect((await batch()).status).toBe(200);
  expect(docs[0]).toMatchObject({status:"completed",llmMeta:{usageSettlement:"failed",usageSettlementReason:"MONTHLY_PASS_LIMIT_EXCEEDED"}});
  expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledTimes(16);
  expect(warn).toHaveBeenCalledWith("paid_delivery_usage_settlement_failed",expect.objectContaining({service:"karma-destiny-ai",reason:"MONTHLY_PASS_LIMIT_EXCEEDED"}));
  warn.mockRestore();
});
it("delivers the finished report when the pass recheck before delivery is denied by the pass limit",async()=>{
  const warn=jest.spyOn(console,"warn").mockImplementation(()=>{});
  mode="pass"; await start(); for(let i=0;i<3;i++) await batch(); accessQueue=[true,false];
  expect((await batch()).status).toBe(200);
  expect(docs[0]).toMatchObject({status:"completed",llmMeta:{usageSettlement:"failed",usageSettlementReason:"PAYMENT_REQUIRED"}});
  expect(consume).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith("paid_delivery_usage_settlement_failed",expect.objectContaining({service:"karma-destiny-ai",stage:"access_recheck"}));
  warn.mockRestore();
});
async function karmaPendingAfterStorageLoss(){mode="pass";await start();for(let i=0;i<3;i++)await batch();fault={status:"completed",kind:"null"};expect((await batch()).status).toBe(503);expect(docs[0].status).toBe("delivery_pending");fault=null;mode="none";}
it("resumes a delivery_pending pass report when the pass is now exhausted",async()=>{
  const warn=jest.spyOn(console,"warn").mockImplementation(()=>{});
  await karmaPendingAfterStorageLoss(); const calls=provider.mock.calls.length; const consumed=consume.mock.calls.length;
  expect((await batch()).status).toBe(200);
  expect(docs[0]).toMatchObject({status:"completed",llmMeta:{usageSettlement:"failed"}});
  expect(provider).toHaveBeenCalledTimes(calls); expect(consume).toHaveBeenCalledTimes(consumed); expect(refund).not.toHaveBeenCalled();
  warn.mockRestore();
});
for(const [label,setup] of [["refunded pass order",()=>{passOrder={}}],["withdrawn member",()=>{withdrawn=true}],["refunded use marker",()=>{blocked=2}]])it(`does not deliver a delivery_pending pass report after ${label}`,async()=>{
  await karmaPendingAfterStorageLoss(); setup();
  expect((await batch()).status).toBe(402); expect(docs[0].status).toBe("delivery_pending"); expect(docs[0].llmMeta.usageSettlement).toBeUndefined();
});
it("late pass settlement transient error leaves delivery_pending",async()=>{
  mode="pass"; await start(); for(let i=0;i<3;i++) await batch(); consume.mockRejectedValueOnce(new Error("mock pass db down"));
  expect((await batch()).status).toBe(503); expect(docs[0].status).toBe("delivery_pending"); expect(refund).not.toHaveBeenCalled();
  expect((await batch()).status).toBe(200); expect(docs[0].status).toBe("completed"); expect(docs[0].llmMeta.usageSettlement).toBeUndefined();
});
it("apply response loss leaves delivery_pending and retries the same key",async()=>{mode="deferred";await start();for(let i=0;i<3;i++)await batch();usage.mockImplementationOnce(()=>{throw new Error('response lost')});expect((await batch()).status).toBe(503);const calls=provider.mock.calls.length;expect(docs[0].status).toBe('delivery_pending');expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(calls);expect(usage.mock.calls.map(c=>c[0].requestId)).toEqual(['original-paid-request','original-paid-request']);expect(refund).not.toHaveBeenCalled();});

it("server discovery is account-scoped, preserves old completed results, and blocks them after cancellation",async()=>{await start();const id=docs[0].id;let response=await route(new Request('https://mock.test/api/karma-destiny-ai/result'),{});expect(response.status).toBe(202);expect((await response.json()).sessionId).toBe(id);userId='64b7f2a1c3d4e5f601234568';expect((await batch()).status).toBe(404);userId=uid;docs[0].status='completed';docs[0].chapters=[];expect((await route(new Request(`https://mock.test/api/karma-destiny-ai/result?sessionId=${id}`),{})).status).toBe(200);blocked=0;expect((await route(new Request(`https://mock.test/api/karma-destiny-ai/result?sessionId=${id}`),{})).status).toBe(403);});
it("fresh lease blocks duplicate generation, stale lease resumes only missing chapters",async()=>{await start();docs[0].generationProgress.lockToken='another';docs[0].generationProgress.lockedAt=new Date();expect((await batch()).status).toBe(202);expect(provider).not.toHaveBeenCalled();docs[0].generationProgress.lockedAt=new Date(Date.now()-121000);expect((await batch()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);});
it("cancellation after the final provider response prevents apply",async()=>{mode='deferred';await start();for(let i=0;i<3;i++)await batch();const base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{const value=await base(...args);blocked=0;return value;});expect((await batch()).status).toBe(402);expect(docs[0].status).toBe('delivery_pending');expect(usage).not.toHaveBeenCalled();});

it("checkpoint null preserves successful siblings and retries only the unsaved chapter",async()=>{await start();fault={chapterCount:2,kind:'null'};const response=await batch();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE'});const ids=docs[0].chapters.map(c=>c.id);expect(ids).toHaveLength(3);const calls=provider.mock.calls.length;expect((await batch()).status).toBe(202);for(const id of ids)expect(provider.mock.calls.slice(calls).some(c=>c[2].cache.keyExtra.endsWith(id))).toBe(false);expect(refund).not.toHaveBeenCalled();});
it("calculation storage failure resumes from original server input",async()=>{fault={status:'generating',kind:'null'};expect((await start()).status).toBe(503);expect(docs[0].integratedResult).toBeUndefined();docs[0].updatedAt=new Date(Date.now()-121000);expect((await batch()).status).toBe(202);expect(docs[0].integratedResult).toBeTruthy();expect(docs[0].idempotencyKey).toBe('original-paid-request');expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();});

for (const repair of ['shorter', 'empty', 'repeated']) it(`length repair ${repair} keeps the valid karma draft and completes`, async () => {
  await start();
  const base = provider.getMockImplementation(); let calls = 0;
  provider.mockImplementation(async (...args) => {
    const result = await base(...args); const payload = JSON.parse(result.text);
    if (payload.id === 'chapter-01') {
      calls++;
      payload.content = calls === 1 ? prose('saved-short', 700)
        : repair === 'shorter' ? prose('replacement-short', 400)
        : repair === 'empty' ? '' : prose('repeated', 100).repeat(30);
    }
    return { ...result, text: JSON.stringify(payload) };
  });
  await batch(); const draft = docs[0].chapters.find(row => row.id === 'chapter-01').content;
  expect(draft).toContain('saved-short');
  for (let i = 0; i < 6 && docs[0].status !== 'completed'; i++) await batch();
  expect(docs[0].status).toBe('completed'); expect(calls).toBe(1);
  expect(docs[0].chapters.find(row => row.id === 'chapter-01').content).toBe(draft);
  expect(docs[0].llmMeta.attempts['chapter-01']).toBe(1);
  expect(refund).not.toHaveBeenCalled();
});
it('reserved karma length repair resumes a saved draft without another provider call', async () => {
  await start(); for (let i = 0; i < 4; i++) await batch();
  docs[0].status = 'partial'; docs[0].chapters[0].content = prose('saved-short', 700);
  docs[0].llmMeta.attempts['chapter-01:lengthRepair'] = 1;
  docs[0].llmMeta.attempts['chapter-01'] = 2;
  provider.mockClear(); expect((await batch()).status).toBe(200);
  expect(provider).not.toHaveBeenCalled();
});

it('karma accepts a structurally valid short final attempt without changing total gates', async () => {
  await start(); for (let i = 0; i < 4; i++) await batch();
  docs[0].status = 'partial'; docs[0].chapters = docs[0].chapters.filter(row => row.id !== 'chapter-01');
  docs[0].llmMeta.attempts['chapter-01'] = 1;
  const base = provider.getMockImplementation(); provider.mockClear();
  provider.mockImplementation(async (...args) => { const result = await base(...args); const payload = JSON.parse(result.text); payload.content = prose('last-valid', 700); return { ...result, text: JSON.stringify(payload) }; });
  expect((await batch()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(1);
  expect(docs[0].llmMeta.attempts['chapter-01']).toBe(2); expect(refund).not.toHaveBeenCalled();
});

it('a chapter cut at the token cap retries once with double the budget and still delivers', async () => {
  await start(); const base = provider.getMockImplementation(); const budgets = [];
  provider.mockImplementation(async (...args) => {
    if (!args[2].cache.keyExtra.endsWith('chapter-02')) return base(...args);
    budgets.push(args[2].maxOutputTokens); const result = await base(...args);
    return budgets.length === 1 ? { ...result, truncated: true, finishReason: 'MAX_TOKENS' } : result;
  });
  for (let i = 0; i < 6 && docs[0].status !== 'completed'; i++) await batch();
  expect(budgets).toEqual([7875, 15750]); expect(docs[0].status).toBe('completed'); expect(refund).not.toHaveBeenCalled();
});

// 2026-10-16: 결제 1건 = 리포트 1건. 같은 결제를 요청 키만 바꿔 다시 내밀면 409, 계산도 다시 돌지 않는다.
it('keeps empty relationship input compatible, but binds a changed scene to its request', async () => {
  const original = utils.normalizeConsultationInput(body);
  expect(utils.normalizeConsultationInput({ ...body, relationshipContext: {} }).inputHash).toBe(original.inputHash);
  expect(utils.normalizeConsultationInput({ ...body, relationshipContext: { scene: 'x'.repeat(501) } }).ok).toBe(false);
  const relationshipContext = { person: 'A', relationship: '동료', scene: '부탁을 계속 떠맡습니다', myResponse: '거절하지 못합니다', wish: '거절의 기준' };
  expect((await start({ relationshipContext })).status).toBe(202);
  expect(docs[0].integratedResult.relationshipAnalysis.context).toEqual(relationshipContext);
  expect(docs[0].integratedResult.relationshipAnalysis.partnerChartAvailable).toBe(false);
  const changed = await start({ relationshipContext: { ...relationshipContext, scene: '다른 상황' } });
  expect(changed.status).toBe(409);
  expect(chart).toHaveBeenCalledTimes(1);
  const definition = utils.PREMIUM_CHAPTERS.find(row => row.id === 'chapter-05');
  const prompt = utils.buildChapterPrompt(docs[0], definition);
  expect(prompt).toContain('부탁을 계속 떠맡습니다');
  expect(prompt).toContain('초기에 놓치는 신호');
  expect(prompt).toContain('saju');
  expect(prompt).not.toContain('"confidence":"none","basisPaths"');
  expect(utils.buildSystemPrompt()).toContain('개인 relationAxis는 특정 상대와의 궁합이 아닙니다');
});

for (const paid of ["paid", "monthly", "deferred"]) it(`${paid}: the same billing evidence cannot open a second report under a new key`, async () => {
  mode = paid; expect((await start()).status).toBe(202); expect(chart).toHaveBeenCalledTimes(1);
  const reused = await route(new Request("https://mock.test/api/karma-destiny-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "another-request" }, body: JSON.stringify(body) }), {});
  expect(reused.status).toBe(409); expect(await reused.json()).toMatchObject({ code: "EVIDENCE_ALREADY_USED" });
  expect(chart).toHaveBeenCalledTimes(1); expect(docs).toHaveLength(1);
  expect((await start()).status).not.toBe(409);
});

// 2026-11-20 R10 다시 시도 우선(사용자 결정 "7일간 차감 보류"): 실패는 7일 동안 무료 다시 시도로 보류한다.
// 보류 중에는 이용권 복원·보류 차감 취소를 하지 않고, 다시 시도가 성공하면 차감을 확정한다. 환불 요청·7일 경과 때만 정리한다.
describe("R10 retry-first hold", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const post = (path, sessionId) => route(new Request(`https://mock.test/api/karma-destiny-ai${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) }), {});
  async function hold() {
    await start(); const base = provider.getMockImplementation(); provider.mockImplementation(async () => ({ ok: false }));
    for (let i = 0; i < 2; i++) await batch();
    const held = await batch(); provider.mockImplementation(base); return held;
  }
  for (const paid of ["pass", "deferred"]) it(`${paid}: a held failure keeps billing and a free retry completes and confirms the charge`, async () => {
    mode = paid; const held = await hold(); const payload = await held.json(); const id = docs[0].id;
    expect(held.status).toBe(503);
    expect(payload).toMatchObject({ ok: false, reason: "LLM_ERROR", refunded: false, sessionId: id, retry: { available: true, sessionId: id } });
    expect(payload.retryable).toBeUndefined();
    expect(new Date(payload.retry.refundAt).getTime()).toBe(new Date(docs[0].createdAt).getTime() + 7 * DAY);
    expect(passRefund).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled(); expect(recordCancel).not.toHaveBeenCalled();
    const result = await route(new Request(`https://mock.test/api/karma-destiny-ai/result?sessionId=${id}`), {});
    expect(result.status).toBe(409); expect(await result.json()).toMatchObject({ status: "generation_failed", retry: { available: true } });
    const again = await batch(); expect(again.status).toBe(409); expect(await again.json()).toMatchObject({ retry: { available: true } });
    expect((await post("/retry", id)).status).toBe(202);
    let last; for (let i = 0; i < 6 && last?.status !== 200; i++) last = await batch();
    expect(last.status).toBe(200); expect(docs[0].status).toBe("completed");
    expect(passRefund).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled(); expect(recordCancel).not.toHaveBeenCalled();
    if (paid === "deferred") expect(usage).toHaveBeenCalledWith(expect.objectContaining({ requestId: "original-paid-request" }));
  });
  it("a refund request restores the pass once and closes the retry", async () => {
    await hold(); const id = docs[0].id;
    expect(await (await post("/refund-request", id)).json()).toMatchObject({ ok: true, refunded: true, refundStatus: "refunded" });
    expect(await (await post("/refund-request", id)).json()).toMatchObject({ refundStatus: "refunded" });
    expect(passRefund).toHaveBeenCalledTimes(1);
    expect(passRefund).toHaveBeenCalledWith(expect.objectContaining({ featureKey: "karma-destiny-ai-consultation", requestId: "original-paid-request" }));
    const retry = await post("/retry", id); expect(retry.status).toBe(409); expect(await retry.json()).toMatchObject({ reason: "REFUND_STARTED" });
  });
  it("a refund request cancels the held deferred usage instead of charging it", async () => {
    mode = "deferred"; passRefund.mockImplementation(async () => ({ refunded: false }));
    await hold(); const id = docs[0].id;
    expect(await (await post("/refund-request", id)).json()).toMatchObject({ ok: true, refunded: false, refundStatus: "usage_cancelled" });
    expect(recordCancel).toHaveBeenCalledTimes(1);
    expect(recordCancel.mock.calls[0][1]).toMatchObject({ $set: { status: "generation_failed" } });
    expect(usage).not.toHaveBeenCalled();
  });
  it("a pass restore failure leaves the refund unsettled for the cron", async () => {
    await hold(); const id = docs[0].id; passRefund.mockRejectedValueOnce(new Error("pass db down"));
    expect(await (await post("/refund-request", id)).json()).toMatchObject({ ok: true, refunded: false });
    expect(docs[0].llmMeta.retryable.refundSettledAt).toBeUndefined();
    expect(await settleDue({}, {})).toEqual([{ service: "karma-destiny-ai", refundStatus: "refunded" }]);
    expect(passRefund).toHaveBeenCalledTimes(2);
  });
  it("the cron closes the hold after seven days and refunds once", async () => {
    await hold();
    expect(await settleDue({}, {})).toEqual([]); expect(passRefund).not.toHaveBeenCalled();
    expect(await settleDue({}, { now: Date.now() + 8 * DAY })).toEqual([{ service: "karma-destiny-ai", refundStatus: "refunded" }]);
    expect(docs[0].generationError.code).toBe("RETRY_WINDOW_EXPIRED"); expect(passRefund).toHaveBeenCalledTimes(1);
    expect(await settleDue({}, { now: Date.now() + 9 * DAY })).toEqual([]); expect(passRefund).toHaveBeenCalledTimes(1);
  });
  it("a calculation error keeps the immediate restore", async () => {
    chart.mockImplementation(async () => { throw Object.assign(new Error("calc"), { code: "CALCULATION_ERROR" }); });
    expect((await start()).status).toBe(422);
    expect(docs[0].llmMeta.retryable).toBeUndefined(); expect(passRefund).toHaveBeenCalledTimes(1);
  });
});
