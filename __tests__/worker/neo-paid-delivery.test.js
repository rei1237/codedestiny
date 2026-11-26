/** @jest-environment node */
import { jest } from "@jest/globals";
import { AI_OUTPUT_LOCALES } from '../../lib/i18n/ai-locale.js';
import { getAmbientAiLocale, runWithAiLocale } from '../../worker/lib/ai-locale-context.js';
import { TossError } from '../../worker/toss/policy.js';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

const uid = "64b7f2a1c3d4e5f601234567";
const body = { idempotencyKey: "original-paid-request", selectedMethod: "saju", topic: "relationship", intensity: "standard", question: "반복되는 관계 선택을 구체적으로 살펴보고 싶습니다.", birthInput: { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", calendarType: "solar" } };
let recoveryBind, resumeNeo, utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation, passRefund;
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
      if ("$lte" in value) return new Date(get(doc, key)) <= value.$lte;
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
    if (fault?.refinementStatus && update.$set.refinementStatus === fault.refinementStatus) {
      const current=fault; fault=null;
      if(current.kind==='throw') throw new Error('mock refinement storage');
      if(current.kind==='null') return query(null);
      if(current.kind==='confirm') lostConfirmation=true;
    }
    if (fault && (fault.status || fault.chapterCount) && fault.kind !== "usage" && (fault.chapterCount ? Object.keys(update.$set.llmMeta?.sections || {}).length === fault.chapterCount : update.$set.status === fault.status)) {
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
    if (fault?.kind === 'usage' && update.$set.usageAppliedAt) { fault=null; throw new Error('apply response lost'); }
    const doc = docs.find(row => matches(row, filter));
    if (doc) assign(doc, update.$set);
    return { modifiedCount: doc ? 1 : 0 };
  },
};

function prose(seed, length) {
  let value = `${seed} 양자리 라그나와 Ashwini의 계산 근거를 살펴본다. `;
  for (let i = 0; value.replace(/\s/g, "").length < length; i++) value += `${seed}의 ${i}번째 관찰은 현재 생활에서 반복되는 선택을 돌아보고 작은 행동으로 확인하는 과정을 설명한다. `;
  return value;
}
let definitions, refinedDefinitions;
beforeAll(async () => {
  const passConsumption = await import("../../worker/lib/pass-consumption.js");
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ ...passConsumption, refundPassUseEvidence: (...args) => passRefund(...args) }));
  jest.unstable_mockModule('../../worker/toss/native-neo.js',()=>({bindNativeNeoRecovery:(...args)=>recoveryBind(...args)}));
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId, role: "user" }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, NeoOperationRoomConsultation: model,
    User: { findById: () => query({ role: "user" }) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null), findOneAndUpdate: (...args) => { usage(...args); return query({}); } },
    Payment: { findOne: filter => query(filter.status?.$in?.includes("refunded") ? (blocked === 1 ? {} : null) : mode === "paid" ? { _id: uid, merchantUid: "paid-original" } : null) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null) },
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({ canAccessPaidFeature: async () => ({ allowed: mode === "pass", accessSource: "family_pass" }), PAID_FEATURE_ACCESS_USER_PROJECTION: "id" }));
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({ settlePerUseAccessDecision: async (_env, args) => ({ allowed: args?.decision?.allowed === true, source: "pass", reason: args?.decision?.allowed ? "" : "PAYMENT_REQUIRED" }) }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? {} : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/life-book-ai-saju.js", () => ({ calculateLifeBookAiSaju: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({ startServiceExecution: async () => ({}), completeServiceExecution: async () => ({}), failServiceExecution: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ NEO_INITIAL_SECTIONS: definitions, NEO_REFINED_SECTIONS: refinedDefinitions } = await import("../../worker/lib/neo-operation-room-prompt.js"));
  ({ handleNeoOperationRoomRoutes: route, resumeConsultationOnServer: resumeNeo, __neoOperationRoomTestUtils: utils } = await import("../../worker/routes/neo-operation-room.js"));
});
function fixture(section) {
  const shape = structuredClone(section.schema);
  for (const [path, count] of Object.entries(section.counts || {})) {
    const keys = path.split('.'); let obj = shape; for (const key of keys.slice(0,-1)) obj = obj[key];
    const list = obj[keys.at(-1)]; while(list.length < count) list.push(structuredClone(list[0]));
  }
  let fields=0;
  function walk(value, key='', path='', fill=false) {
    if(Array.isArray(value)) return value.map((item,i)=>walk(item,'',path+i,fill));
    if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v,k,path+k,fill)]));
    if(typeof value==='number') return value;
    if(key === 'status') return '방향은 맞지만 부족하다';
    if(/^(title|operationTitle|name|label|method|area|palace)$/.test(key)) return "제목" + Array.from(section.id+path).map(c=>String.fromCharCode(0xac00+c.charCodeAt(0))).join("");
    if(!fill) { fields++; return value; }
    return prose(Array.from(section.id+path).map(c=>String.fromCharCode(0xac00+c.charCodeAt(0))).join(""), Math.ceil(section.minChars * 1.3 / fields));
  }
  walk(shape);
  return walk(shape,'','',true);
}
beforeEach(() => {
 docs=[];fault=null;lostConfirmation=false;blocked=-1;mode='pass';userId=uid;usage=jest.fn();refund=jest.fn(async()=>({}));passRefund=jest.fn(async()=>({refunded:true}));chart=jest.fn(async()=>({}));
 provider=jest.fn(async(_env,prompt,options)=>{
   expect(options.timeoutMs).toBeLessThanOrEqual(45000);
   // 2026-11-19 S16: 라운드(4회)의 마지막 시도만 Workers AI 폴백을 허용한다(하한 = 챕터 최소의 30%). 그 밖의 시도는 Gemini 만.
   if(options.finalProviderAttempt){expect(options.fallbackToWorkersAI).toBeUndefined();expect(options.fallbackMinChars).toBeGreaterThan(0);}
   else expect(options.fallbackToWorkersAI).toBe(false);
   const section=[...definitions,...refinedDefinitions].find(row=>prompt.includes(`제목: ${row.title}\n`));
   return {ok:true,provider:'gemini',model:'fixture',text:JSON.stringify(fixture(section))};
 });
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
async function post(path, payload) { return route(new Request(`https://mock.test/api/neo-operation-room/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload || {sessionId:docs[0].id})}),{}); }
async function start(extra) { return route(new Request('https://mock.test/api/neo-operation-room/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(extra || (docs[0] ? {sessionId:docs[0].id}:body))}),{}); }
for(const paid of ['pass','monthly','paid']) it(`${paid}: four waves save and reuse all fourteen sections`,async()=>{
 mode=paid;
 for(let i=0;i<3;i++){const response=await start();expect(await response.clone().json()).toMatchObject({ok:true});expect(response.status).toBe(202);expect(Object.keys(docs[0].llmMeta.sections)).toHaveLength((i+1)*4);expect(usage).not.toHaveBeenCalled();}
 const response=await start(); expect(await response.clone().json()).toMatchObject({status:'completed'});expect(response.status).toBe(200);expect(provider).toHaveBeenCalledTimes(14);expect(chart).toHaveBeenCalledTimes(1);
 expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(14);
});
for(const status of ['delivery_pending','completed']) for(const kind of ['null','throw','confirm']) it(`${status} ${kind} preserves paid generation`,async()=>{
 for(let i=0;i<3;i++)await start();fault={status,kind};let response=await start();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true,resultId:docs[0].id});expect(refund).not.toHaveBeenCalled();const count=provider.mock.calls.length;fault=null;expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);
});
for(const store of [0,1,2,3]) it(`revoked store ${store} rejects resume`,async()=>{await start();blocked=store;const count=provider.mock.calls.length;expect((await start()).status).toBe(402);expect(provider).toHaveBeenCalledTimes(count)});
it('bookkeeping failure does not hide completed delivery',async()=>{usage.mockImplementation(()=>{throw new Error('ledger unavailable')});for(let i=0;i<3;i++)await start();expect((await start()).status).toBe(200);expect(docs[0].status).toBe('completed')});
// 2026-11-19 S16: 챕터 시도 상한은 라운드 4회 × 2라운드 = 8회. 소진되면 축소 전달 없이 generation_failed.
// 2026-11-19 R2b 다시 시도 우선: 웹 첫 브리핑 실패는 바로 환불하지 않고 무료 다시 시도를 연다. 환불은 고객 요청 때 한 번.
it('short generation has a cumulative limit and no completion reward',async()=>{provider.mockImplementation(async()=>({ok:true,text:'{"short":"empty"}'}));for(let i=0;i<8;i++)expect((await start()).status).toBe(202);const failed=await start();expect(failed.status).toBe(503);expect(await failed.json()).toMatchObject({reason:'LLM_ERROR',refunded:false,retry:{available:true,sessionId:docs[0].id}});expect(provider).toHaveBeenCalledTimes(32);expect(docs[0].status).toBe('generation_failed');expect(docs[0].llmMeta.retryable.refundAt).toBeTruthy();expect(usage).not.toHaveBeenCalled();expect(passRefund).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();
 const asked=await post('refund-request');expect(asked.status).toBe(200);expect(await asked.json()).toMatchObject({ok:true,sessionId:docs[0].id});expect(passRefund).toHaveBeenCalledTimes(1);expect(passRefund).toHaveBeenCalledWith(expect.objectContaining({featureKey:"neo-operation-room-consultation",requestId:"original-paid-request"}));expect(docs[0].llmMeta.refundEligibleAt).toBeTruthy();expect(docs[0].llmMeta.retryable.refundSettledAt).toBeTruthy();
 expect((await post('refund-request')).status).not.toBe(500);expect(passRefund).toHaveBeenCalledTimes(1);expect((await post('retry')).status).toBe(409);expect(provider).toHaveBeenCalledTimes(32)});
it.each([
  ['unsupported-location token count', { ok: false, error: 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE', providerCode: 'GEMINI_PRECONDITION_FAILED', status: 400, retryable: false }, 11],
  ['generation timeout', { ok: false, error: 'LLM_GENERATION_TIMEOUT' }, 8],
])('%s: only a call Gemini never billed hands its chapter attempt back (2026-10-30 HKG refund)', async (_name, failure, pendingWaves) => {
  mode = 'paid'; provider.mockImplementation(async () => failure);
  for (let i = 0; i < pendingWaves; i++) expect((await start()).status).toBe(202);
  const failed = await start();
  expect(failed.status).toBe(503);
  expect(await failed.json()).toMatchObject({ refunded: false, retry: { available: true } });
  expect(provider).toHaveBeenCalledTimes(pendingWaves * 4);
  expect(refund.mock.calls.filter(call => call[4] === 'neo_operation_room_generation')).toHaveLength(0);
  expect(usage).not.toHaveBeenCalled();
});
it('lease and ownership prevent concurrent and cross-account calls',async()=>{await start();const count=provider.mock.calls.length;docs[0].llmMeta.lockToken='other';docs[0].llmMeta.lockedAt=new Date();expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(count);userId='other';expect((await start()).status).toBe(404);userId=uid;docs[0].llmMeta.lockedAt=new Date(Date.now()-121000);expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(count+4)});
it('checkpoint null keeps successful siblings',async()=>{fault={chapterCount:2,kind:'null'};expect((await start()).status).toBe(503);expect(Object.keys(docs[0].llmMeta.sections)).toHaveLength(3);expect(refund).not.toHaveBeenCalled();expect((await start()).status).toBe(202)});
it('apply response loss resumes the saved result without another generation',async()=>{for(let i=0;i<3;i++)await start();fault={kind:'usage'};expect((await start()).status).toBe(503);expect(docs[0].status).toBe('delivery_pending');expect(refund).not.toHaveBeenCalled();const count=provider.mock.calls.length;expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count)});
it('truncated output keeps the other sections and retries only the missing one',async()=>{const original=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{const value=await original(...args);return args[1].includes(`제목: ${definitions[1].title}\n`)?{...value,truncated:true}:value});expect((await start()).status).toBe(202);expect(Object.keys(docs[0].llmMeta.sections)).toEqual(['opening','innateStrength','topicStyle']);provider.mockImplementation(original);expect((await start()).status).toBe(202);expect(provider.mock.calls.filter(call=>call[1].includes(`제목: ${definitions[0].title}\n`))).toHaveLength(1)});
it('a truncated section retries with double the output budget instead of failing at the same cap',async()=>{const original=provider.getMockImplementation();const title=`제목: ${definitions[1].title}\n`;let cut=0;provider.mockImplementation(async(...args)=>{const value=await original(...args);return args[1].includes(title)&&!cut++?{...value,truncated:true}:value});for(let i=0;i<2;i++)expect((await start()).status).toBe(202);const budgets=calls=>calls.map(call=>call[2].maxOutputTokens);expect(budgets(provider.mock.calls.filter(call=>call[1].includes(title)))).toEqual([8192,16384]);expect(new Set(budgets(provider.mock.calls.filter(call=>!call[1].includes(title))))).toEqual(new Set([8192]));expect(docs[0].llmMeta.sections[definitions[1].id]).toBeTruthy()});
// 2026-11-18 S3-H: 마지막 시도는 Workers AI 폴백(하한 30%)을 열고, 되풀이 문장 때문에 초안 전체를 버리지 않는다.
// 2026-11-19 S16: "마지막 시도"는 라운드(4회)의 마지막이다. 그 전 시도는 Gemini 만, 출력 예산은 줄이지 않는다.
it('only the final checkpoint attempt allows the Workers AI fallback, gated by 30% of the chapter minimum', async () => {
  const normal = provider.getMockImplementation(); const section = definitions[0]; let tries = 0;
  provider.mockImplementation(async (...args) => {
    if (!args[1].includes(`제목: ${section.title}\n`)) return normal(...args);
    tries++;
    return tries <= 3 ? { ok: true, provider: 'gemini', text: '{}' } : normal(...args);
  });
  for (let i = 0; i < 10 && docs[0]?.status !== 'completed'; i++) await start();
  expect(docs[0].status).toBe('completed');
  const options = provider.mock.calls.filter(call => call[1].includes(`제목: ${section.title}\n`)).map(call => call[2]);
  expect(options).toHaveLength(4);
  // S11 Gemini 우선: 첫 시도는 Gemini 만(finalProviderAttempt:false), 라운드 마지막 시도만 Gemini 실패 뒤 보조 모델.
  expect(options[0]).toMatchObject({ fallbackToWorkersAI: false, finalProviderAttempt: false, maxOutputTokens: 8192 });
  for (const retry of options.slice(1, 3)) expect(retry).toMatchObject({ fallbackToWorkersAI: false, finalProviderAttempt: false, maxOutputTokens: 16384 });
  expect(options[3].fallbackToWorkersAI).toBeUndefined();
  expect(options[3].finalProviderAttempt).toBe(true);
  expect(options[3].maxOutputTokens).toBe(16384);
  expect(options[3].fallbackMinChars).toBe(Math.round(section.minChars * 0.3));
  expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
});
const REPEATED = '같은 문장이 되풀이되면 보고서 전체가 반려되던 결함을 확인하는 고정 문장이다.';
const firstBodyKey = section => Object.keys(section.schema)[0] === 'operationTitle' ? ['neoOpening'] : [Object.keys(section.schema)[0], 'description'];
function withRepeat(section, parsed, copies) {
  const path = firstBodyKey(section); let target = parsed;
  for (const key of path.slice(0, -1)) target = target[key];
  target[path.at(-1)] = `${Array(copies).fill(REPEATED).join(' ')} ${target[path.at(-1)]}`;
  return parsed;
}
const countRepeated = value => JSON.stringify(value).split(REPEATED).length - 1;
for (const kind of ['inside one section', 'across sections']) it(`a final-attempt draft repeating a sentence ${kind} is delivered with the copy dropped instead of refunding`, async () => {
  const normal = provider.getMockImplementation(); const targets = kind === 'inside one section' ? [definitions[0]] : [definitions[0], definitions[1]];
  provider.mockImplementation(async (...args) => {
    const section = targets.find(row => args[1].includes(`제목: ${row.title}\n`));
    if (!section) return normal(...args);
    return { ok: true, provider: 'gemini', text: JSON.stringify(withRepeat(section, fixture(section), kind === 'inside one section' ? 2 : 1)) };
  });
  for (let i = 0; i < 7 && docs[0]?.status !== 'completed'; i++) await start();
  expect(docs[0].status).toBe('completed');
  expect(countRepeated(docs[0].initialBriefing)).toBe(1);
  expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
  expect(usage).toHaveBeenCalledTimes(1);
});
it('server discovery is owned and historical completed reports bypass new quality rules',async()=>{await start();let response=await route(new Request('https://mock.test/api/neo-operation-room/result'),{});expect(response.status).toBe(202);expect((await response.json()).initialBriefing).toBeUndefined();const id=docs[0].id;userId='other';expect((await route(new Request(`https://mock.test/api/neo-operation-room/result?attemptId=${id}`),{})).status).toBe(404);userId=uid;docs[0].status='completed';docs[0].initialBriefing={old:'short'};blocked=1;expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(4)});
it('cancellation after generation prevents completion bookkeeping',async()=>{for(let i=0;i<3;i++)await start();const original=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{const value=await original(...args);blocked=0;return value});expect((await start()).status).toBe(402);expect(docs[0].status).toBe('delivery_pending');expect(usage).not.toHaveBeenCalled()});
it('overlapping requests acquire only one generation lease',async()=>{let release;const gate=new Promise(resolve=>{release=resolve});const original=provider.getMockImplementation();let enter;const entered=new Promise(resolve=>{enter=resolve});provider.mockImplementation(async(...args)=>{enter();await gate;return original(...args)});const first=start();await entered;expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);release();expect((await first).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4)});

// 2026-11-19 S16 "전체 완료 후 한 번에" — 완료 전 응답은 진행 수·식별자만, 완료 때 전체 본문을 한 번에.
const NEO_BODY_KEYS = ['compatScores','methodSummary','initialBriefing','realityCheck','refinedOrder','refinementHistory','versionHistory','messages'];
it('an in-progress response carries progress and ids only; completion delivers the full body at once', async () => {
  const { isNeoOperationRoomComplete } = await import('../../worker/routes/neo-operation-room.js');
  const first = await start(); expect(first.status).toBe(202);
  for (const payload of [await first.json(), await (await route(new Request(`https://mock.test/api/neo-operation-room/result?attemptId=${docs[0].id}`), {})).json()]) {
    for (const key of NEO_BODY_KEYS) expect(payload).not.toHaveProperty(key);
    expect(payload.pendingRefinedOrder ?? null).toBeNull();
    expect(payload).toMatchObject({ sessionId: docs[0].id, completedChapters: expect.any(Array), totalChapters: 14 });
    expect(payload.completedChapters).toHaveLength(4);
    expect(JSON.stringify(payload)).not.toContain('번째 관찰은');
  }
  expect(isNeoOperationRoomComplete(docs[0])).toBe(false);
  let response; for (let i = 0; i < 3; i++) response = await start();
  expect(response.status).toBe(200);
  const done = await response.json();
  expect(done.status).toBe('completed'); expect(JSON.stringify(done.initialBriefing)).toContain('번째 관찰은');
  expect(isNeoOperationRoomComplete(docs[0])).toBe(true);
});
it('one exhausted section never completes as a reduced report: retried to the cap, then a free retry completes it with no refund and one usage', async () => {
  mode = 'paid'; const normal = provider.getMockImplementation(); const section = definitions[5];
  provider.mockImplementation(async (...args) => args[1].includes(`제목: ${section.title}\n`) ? { ok: true, provider: 'gemini', text: '{}' } : normal(...args));
  let response;
  for (let i = 0; i < 20; i++) { response = await start(); expect(docs[0].status).not.toBe('completed'); if (response.status !== 202) break; }
  expect(response.status).toBe(503);
  const payload = await response.json();
  expect(docs[0].status).toBe('generation_failed');
  expect(provider.mock.calls.filter(call => call[1].includes(`제목: ${section.title}\n`))).toHaveLength(8);
  expect(JSON.stringify(payload)).not.toContain('번째 관찰은');
  for (const key of NEO_BODY_KEYS) expect(payload).not.toHaveProperty(key);
  const cardRefunds = () => refund.mock.calls.filter(call => call[4] === 'neo_operation_room_generation');
  expect(cardRefunds()).toHaveLength(0); expect(usage).not.toHaveBeenCalled();
  const again = await start(); expect(again.status).toBe(409); const blockedBody = await again.json();
  expect(blockedBody).toMatchObject({ reason: 'LLM_ERROR', retry: { available: true, sessionId: docs[0].id } }); expect(JSON.stringify(blockedBody)).not.toContain('번째 관찰은');
  const polled = await route(new Request(`https://mock.test/api/neo-operation-room/result?attemptId=${docs[0].id}`), {});
  expect(polled.status).toBe(409); expect(await polled.json()).toMatchObject({ retry: { available: true } });
  provider.mockImplementation(normal);
  response = await post('retry');
  for (let i = 0; i < 5 && response.status === 202; i++) response = await start();
  expect(response.status).toBe(200); expect(docs[0].status).toBe('completed');
  expect(cardRefunds()).toHaveLength(0); expect(refund).not.toHaveBeenCalled(); expect(usage).toHaveBeenCalledTimes(1);
  expect(docs[0].llmMeta.retryable.reopens).toBe(1);
});
it('a retry is closed to other accounts, to native Toss and after the window', async () => {
  provider.mockImplementation(async () => ({ ok: true, text: '{"short":"empty"}' }));
  for (let i = 0; i < 9; i++) await start();
  expect(docs[0].status).toBe('generation_failed'); const calls = provider.mock.calls.length;
  userId = 'other'; expect((await post('retry')).status).toBe(404); expect((await post('refund-request')).status).toBe(404); userId = uid;
  docs[0].llmMeta.retryable.refundAt = new Date(Date.now() - 1000);
  const expired = await post('retry'); expect(expired.status).toBe(409); expect(await expired.json()).toMatchObject({ reason: 'RETRY_WINDOW_EXPIRED' });
  expect(provider).toHaveBeenCalledTimes(calls); expect(docs[0].status).toBe('generation_failed'); expect(passRefund).not.toHaveBeenCalled();
});
it('a stored native Toss record keeps the immediate refund on terminal failure', async () => {
  provider.mockImplementation(async () => ({ ok: true, text: '{"short":"empty"}' }));
  expect((await start()).status).toBe(202); docs[0].llmMeta.tossNative = true;
  let response; for (let i = 0; i < 8; i++) response = await start();
  expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty('retry');
  expect(docs[0].status).toBe('generation_failed'); expect(docs[0].llmMeta.retryable).toBeUndefined();
  expect(passRefund).toHaveBeenCalledTimes(1);
});
describe('settleDueNeoRetryRefunds (recovery cron, retry window expiry)', () => {
  let due, realFind;
  beforeAll(async () => { ({ settleDueNeoRetryRefunds: due } = await import('../../worker/routes/neo-operation-room.js')); });
  beforeEach(() => { realFind = model.find; model.find = filter => { const rows = docs.filter(doc => matches(doc, filter)); const chain = { sort: () => chain, limit: () => chain, select: () => chain, lean: async () => clone(rows) }; return chain; }; });
  afterEach(() => { model.find = realFind; });
  const fail = async () => { provider.mockImplementation(async () => ({ ok: true, text: '{"short":"empty"}' })); for (let i = 0; i < 9; i++) await start(); expect(docs[0].status).toBe('generation_failed'); };
  it('nothing is refunded inside the window', async () => {
    await fail();
    expect(await due({}, { model })).toEqual([]);
    expect(passRefund).not.toHaveBeenCalled(); expect(docs[0].llmMeta.refundEligibleAt).toBeUndefined();
  });
  it('after the window the failure is refunded once and never again', async () => {
    await fail(); const after = new Date(docs[0].llmMeta.retryable.refundAt).getTime() + 1000;
    expect(await due({}, { now: after, model })).toEqual([{ service: 'neo-operation-room', refundStatus: 'refunded' }]);
    expect(passRefund).toHaveBeenCalledTimes(1);
    expect(docs[0].llmMeta).toMatchObject({ refundEligibleAt: expect.any(String), retryable: { refundReason: 'RETRY_WINDOW_EXPIRED', refundStatus: 'refunded' } });
    expect(await due({}, { now: after, model })).toEqual([]);
    expect(passRefund).toHaveBeenCalledTimes(1);
    expect((await post('retry')).status).toBe(409);
  });
  it('a reopened retry abandoned past the window is closed and refunded', async () => {
    await fail(); expect((await post('retry')).status).toBe(202); expect(docs[0].status).toBe('partial');
    const after = new Date(docs[0].llmMeta.retryable.refundAt).getTime() + 1000;
    expect(await due({}, { now: after, model })).toEqual([{ service: 'neo-operation-room', refundStatus: 'refunded' }]);
    expect(docs[0].status).toBe('generation_failed'); expect(passRefund).toHaveBeenCalledTimes(1);
  });
  it('a failed refund stays due for the next cron run', async () => {
    mode = 'paid'; await fail(); refund.mockImplementation(async () => { throw new Error('pg down'); });
    const after = new Date(docs[0].llmMeta.retryable.refundAt).getTime() + 1000;
    expect(await due({}, { now: after, model })).toEqual([{ service: 'neo-operation-room', refundStatus: 'failed' }]);
    expect(docs[0].llmMeta.retryable.refundSettledAt).toBeUndefined();
    refund.mockImplementation(async () => ({ refunded: true }));
    expect(await due({}, { now: after, model })).toEqual([{ service: 'neo-operation-room', refundStatus: 'refunded' }]);
    expect(await due({}, { now: after, model })).toEqual([]);
  });
});
it('a second attempt at 0.6x of the chapter minimum is accepted and delivered', async () => {
  const normal = provider.getMockImplementation(); const section = definitions[0]; let tries = 0;
  provider.mockImplementation(async (...args) => {
    if (!args[1].includes(`제목: ${section.title}\n`)) return normal(...args);
    tries++;
    return { ok: true, provider: 'gemini', text: tries === 1 ? '{}' : JSON.stringify(fixture({ ...section, minChars: section.minChars * 0.6 })) };
  });
  for (let i = 0; i < 7 && docs[0]?.status !== 'completed'; i++) await start();
  expect(docs[0].status).toBe('completed'); expect(tries).toBe(2);
  expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
});
describe('settleStuckDelivery (recovery cron stuck settlement)', () => {
  let settle;
  beforeAll(async () => { ({ settleStuckDelivery: settle } = await import('../../worker/routes/neo-operation-room.js')); });
  const later = () => Date.now() + 10 * 60 * 1000;
  // 이 대역의 Payment 조회는 paid 모드에서 늘 회수됨으로 보이므로(회수 건은 기존 확정) 이용권으로 본다.
  it('inside the retry window a stalled pass generation becomes a free retry, not a refund', async () => {
    expect((await start()).status).toBe(202);
    const result = await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model });
    expect(result).toEqual({ outcome: 'retryable', refundAt: expect.any(String) });
    expect(docs[0]).toMatchObject({ status: 'generation_failed', generationError: { code: 'DELIVERY_STUCK' } });
    expect(docs[0].llmMeta.retryable.code).toBe('DELIVERY_STUCK');
    expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
    expect(await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model })).toEqual({ outcome: 'progressed' });
  });
  it('after the retry window a stalled paid generation is generation_failed with one card refund, never twice and never with a body', async () => {
    mode = 'paid'; refund.mockImplementation(async () => ({ refunded: true }));
    expect((await start()).status).toBe(202);
    docs[0].createdAt = new Date(Date.now() - 8 * 86400000);
    const result = await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model });
    expect(result).toEqual({ outcome: 'generation_failed', refundStatus: 'refunded' });
    expect(docs[0].status).toBe('generation_failed');
    expect(docs[0].generationError.code).toBe('DELIVERY_STUCK');
    const cardRefunds = () => refund.mock.calls.filter(call => call[4] === 'neo_operation_room_generation');
    expect(cardRefunds()).toHaveLength(1);
    expect(await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model })).toEqual({ outcome: 'progressed' });
    expect(cardRefunds()).toHaveLength(1);
  });
  it('a live lease is left to the running generation', async () => {
    expect((await start()).status).toBe(202);
    const status = docs[0].status; docs[0].llmMeta.lockedAt = new Date(); docs[0].llmMeta.lockToken = 'live';
    expect(await settle({}, { doc: { id: docs[0].id, userId: uid }, model })).toEqual({ outcome: 'leased' });
    expect(docs[0].status).toBe(status); expect(passRefund).not.toHaveBeenCalled();
  });
  it('rescues a complete delivery_pending record without another generation', async () => {
    for (let i = 0; i < 3; i++) await start();
    fault = { kind: 'usage' }; expect((await start()).status).toBe(503); expect(docs[0].status).toBe('delivery_pending');
    const calls = provider.mock.calls.length;
    expect(await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model })).toEqual({ outcome: 'rescued' });
    expect(docs[0].status).toBe('completed'); expect(provider).toHaveBeenCalledTimes(calls);
    expect(passRefund).not.toHaveBeenCalled();
  });
  it('an incomplete delivery_pending record is not rescued: retryable inside the window, the pass is restored after it', async () => {
    for (let i = 0; i < 3; i++) await start();
    fault = { kind: 'usage' }; await start();
    const sections = docs[0].llmMeta.sections; docs[0].llmMeta.sections = Object.fromEntries(Object.entries(sections).slice(0, 4));
    expect((await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model })).outcome).toBe('retryable');
    expect(passRefund).not.toHaveBeenCalled();
    docs[0].status = 'delivery_pending'; delete docs[0].llmMeta.retryable; docs[0].createdAt = new Date(Date.now() - 8 * 86400000);
    const result = await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model });
    expect(result.outcome).toBe('generation_failed');
    expect(docs[0].status).toBe('generation_failed'); expect(passRefund).toHaveBeenCalledTimes(1);
  });
  it('a native Toss stall keeps the existing immediate settlement', async () => {
    expect((await start()).status).toBe(202); docs[0].llmMeta.tossNative = true;
    expect((await settle({}, { doc: { id: docs[0].id, userId: uid }, now: later(), model })).outcome).toBe('generation_failed');
    expect(docs[0].llmMeta.retryable).toBeUndefined();
  });
});

async function refine(extra) { return route(new Request('https://mock.test/api/neo-operation-room/refine',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(extra || {sessionId:docs[0].id})}),{}); }
async function initialComplete() { for(let i=0;i<4;i++) await start(); expect(docs[0].status).toBe('completed'); }
it.each(AI_OUTPUT_LOCALES)('retains purchase locale %s through resume and reality checks',async(locale)=>{
 const seen=[],original=provider.getMockImplementation();
 provider.mockImplementation((...args)=>{seen.push(getAmbientAiLocale());return original(...args);});
 await runWithAiLocale(locale,start);
 expect(docs[0].llmMeta.locale).toBe(locale);
 expect(docs[0].llmMeta.resumeBody.locale).toBe(locale);
 await runWithAiLocale(locale==='ko'?'ja':'ko',initialComplete);
 expect(seen.length).toBeGreaterThan(4);
 expect(seen.every(value=>value===locale)).toBe(true);
 await runWithAiLocale('ko',()=>refine({sessionId:docs[0].id,freeform:'작은 행동부터 바꾸겠습니다.'}));
 await runWithAiLocale('en',()=>refine());
 expect(docs[0].refinementStatus).toBe('completed');
 expect(seen.every(value=>value===locale)).toBe(true);
 expect(usage).toHaveBeenCalledTimes(1);
 const calls=provider.mock.calls.length;
 await runWithAiLocale('ja',start);
 expect(provider).toHaveBeenCalledTimes(calls);
});
it('two reality-check rounds preserve both answers and block a third without provider calls',async()=>{
 await initialComplete();
 const initial=structuredClone(docs[0].initialBriefing);
 for(const freeform of ['첫 번째로 작은 행동부터 바꾸겠습니다.','실행해 보니 시간 제약이 있어 다른 방법이 궁금합니다.']){
  await refine({sessionId:docs[0].id,freeform});
  for(let i=0;i<4&&docs[0].refinementStatus!=='completed';i++)await refine();
  expect(docs[0].refinementStatus).toBe('completed');
 }
 expect(docs[0].initialBriefing).toEqual(initial);
 expect(docs[0].llmMeta.refinementHistory).toHaveLength(2);
 expect(docs[0].llmMeta.refinementHistory[0].realityCheck.freeform).toContain('첫 번째');
 const calls=provider.mock.calls.length;
 const duplicate=await refine();expect(duplicate.status).toBe(200);
 expect(await duplicate.json()).toMatchObject({refinementAllowance:{limit:2,used:2,remaining:0}});
 expect((await refine({sessionId:docs[0].id,freeform:'세 번째 질문입니다.'})).status).toBe(409);
 expect(provider).toHaveBeenCalledTimes(calls);
});
// 계약(ai-and-db.md:125): 짧은 초안은 기존 2회 상한 안에서 분량 보강을 딱 한 번 받고,
// 보강이 더 나쁘면 저장된 초안을 그대로 배달한다(bbeeaf78a 의 "보강 없음"을 되돌림).
for (const repair of ['shorter', 'empty', 'repeated']) it(`repairs the short initial draft once and keeps it after a ${repair} repair`, async () => {
  const normal = provider.getMockImplementation(); const section = definitions[0]; let tries = 0, draft;
  provider.mockImplementation(async (...args) => {
    if (!args[1].includes(`제목: ${section.title}\n`)) return normal(...args);
    tries++;
    const parsed = fixture({ ...section, minChars: section.minChars * (tries === 1 ? 0.45 : 0.2) });
    if (tries === 1) draft = parsed;
    if (tries > 1 && repair === 'empty') return { ok: true, provider: 'gemini', text: '{}' };
    if (tries > 1 && repair === 'repeated') return { ok: true, provider: 'gemini', text: JSON.stringify({ ...parsed, description: prose('동일문장', 180).repeat(30) }) };
    return { ok: true, provider: 'gemini', text: JSON.stringify(parsed) };
  });
  await start(); expect(docs[0].llmMeta.sections[section.id]?.parsed).toEqual(draft);
  for (let i = 0; i < 7 && docs[0].status !== 'completed'; i++) await start();
  expect(docs[0].status).toBe('completed'); expect(tries).toBe(2);
  expect(docs[0].llmMeta.sections[section.id].parsed).toEqual(draft);
  expect(docs[0].llmMeta.attempts[section.id]).toBe(2);
  expect(docs[0].llmMeta.attempts[`${section.id}:lengthRepair`]).toBe(1);
});
it('gives every usable short section exactly one repair inside the two-attempt cap, then delivers', async () => {
  // 0.45 배율이면 meta(750자)는 고정 필드만으로 이미 하한을 넘는다. 14챕터 모두 미달이 되도록 0.3 을 쓴다.
  const prompts = [];
  provider.mockImplementation(async (_env, prompt) => {
    prompts.push(prompt);
    const section = definitions.find(row => prompt.includes(`제목: ${row.title}\n`));
    return { ok: true, provider: 'gemini', text: JSON.stringify(fixture({ ...section, minChars: section.minChars * 0.3 })) };
  });
  for (let i = 0; i < 7; i++) expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(definitions.length * 2);
  expect(prompts.filter(prompt => prompt.includes('[분량 보강]'))).toHaveLength(definitions.length);
  for (const section of definitions) expect(docs[0].llmMeta.attempts[section.id]).toBe(2);
  expect(usage).toHaveBeenCalledTimes(1); expect(refund).not.toHaveBeenCalled();
});
it('repairs a full-length section written in the formal register once, then keeps the banmal rewrite', async () => {
  const normal = provider.getMockImplementation(); const section = definitions[0]; let tries = 0, repairPrompt = '';
  provider.mockImplementation(async (...args) => {
    if (!args[1].includes(`제목: ${section.title}\n`)) return normal(...args);
    tries++;
    const text = JSON.stringify(fixture(section));
    if (tries === 1) return { ok: true, provider: 'gemini', text: text.replaceAll('살펴본다.', '살펴봅니다.').replaceAll('설명한다.', '설명합니다.') };
    repairPrompt = args[1];
    return { ok: true, provider: 'gemini', text };
  });
  for (let i = 0; i < 7 && docs[0]?.status !== 'completed'; i++) await start();
  expect(docs[0].status).toBe('completed'); expect(tries).toBe(2);
  expect(repairPrompt).toContain('[어조 보강]');
  expect(repairPrompt).not.toContain('[분량 보강]');
  expect(JSON.stringify(docs[0].initialBriefing)).not.toContain('설명합니다');
});
for (const stage of ['reserved', 'last']) it(`initial short draft respects the ${stage} attempt`, async () => {
  const normal = provider.getMockImplementation(); const section = definitions[0]; let tries = 0;
  provider.mockImplementation(async (...args) => {
    if (!args[1].includes(`제목: ${section.title}\n`)) return normal(...args);
    tries++;
    return { ok: true, provider: 'gemini', text: stage === 'last' && tries < 2 ? '{}' : JSON.stringify(fixture({ ...section, minChars: section.minChars * 0.45 })) };
  });
  await start();
  if (stage === 'reserved') { docs[0].llmMeta.attempts[section.id] = 2; docs[0].llmMeta.attempts[`${section.id}:lengthRepair`] = 1; }
  for (let i = 0; i < 7 && docs[0].status !== 'completed'; i++) await start();
  expect(docs[0].status).toBe('completed'); expect(tries).toBe(stage === 'last' ? 2 : 1);
});
it('refinement delivers a valid short draft without a length repair', async () => {
  await initialComplete(); const section = refinedDefinitions[0]; const normal = provider.getMockImplementation(); let tries = 0, draft;
  provider.mockImplementation(async (...args) => {
    if (!args[1].includes(`제목: ${section.title}\n`)) return normal(...args);
    tries++; const parsed = fixture({ ...section, minChars: section.minChars * (tries === 1 ? 0.45 : 0.2) });
    if (tries === 1) draft = parsed;
    return { ok: true, provider: 'gemini', text: JSON.stringify(parsed) };
  });
  await refine({ sessionId: docs[0].id, freeform: '작은 선택부터 바꾸겠습니다.' });
  for (let i = 0; i < 5 && docs[0].refinementStatus !== 'completed'; i++) await refine();
  expect(docs[0].refinementStatus).toBe('completed'); expect(tries).toBe(1);
  expect(docs[0].llmMeta.refinement.sections[section.id].parsed).toEqual(draft);
  expect(usage).toHaveBeenCalledTimes(1);
});
it('refinement saves four sections per request and reuses the same answer',async()=>{await initialComplete();const initial=structuredClone(docs[0].initialBriefing);expect((await refine({sessionId:docs[0].id,freeform:'이제 작은 선택부터 바꿔보겠습니다.'})).status).toBe(202);expect(Object.keys(docs[0].llmMeta.refinement.sections)).toHaveLength(4);const response=await refine();expect(await response.clone().json()).toMatchObject({refinementStatus:'completed'});expect(response.status).toBe(200);expect(provider).toHaveBeenCalledTimes(22);expect(docs[0].initialBriefing).toEqual(initial);expect((await refine()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(22);expect(usage).toHaveBeenCalledTimes(1)});
for(const kind of ['null','throw','confirm']) it(`refinement final ${kind} preserves the initial report and saved sections`,async()=>{await initialComplete();const initial=structuredClone(docs[0].initialBriefing);await refine({sessionId:docs[0].id,freeform:'우선 작은 선택을 바꾸겠습니다.'});fault={refinementStatus:'completed',kind};const response=await refine();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true});expect(docs[0].status).toBe('completed');expect(docs[0].initialBriefing).toEqual(initial);const calls=provider.mock.calls.length;expect((await refine()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(calls);expect(refund).not.toHaveBeenCalled();expect(docs[0].versionHistory).toHaveLength(1)});
// 2026-11-19 S16: 수정 명령서는 포함 상품이다. 상한(8회) 소진은 조용한 실패가 아니라 재요청 안내 + 포함 횟수 보존이고,
// 같은 답변으로 다시 요청하면 시도 수를 새로 받아 끝까지 완성한다. 첫 브리핑 결제는 회수하지 않는다(재열람 보존).
it('refinement short output is bounded and never changes completed initial delivery',async()=>{await initialComplete();const normal=provider.getMockImplementation();const initial=structuredClone(docs[0].initialBriefing);provider.mockImplementation(async()=>({ok:true,text:'{"short":"empty"}'}));expect((await refine({sessionId:docs[0].id,freeform:'작게 바꾸겠습니다.'})).status).toBe(202);for(let i=0;i<7;i++)expect((await refine()).status).toBe(202);const failed=await refine();expect(failed.status).toBe(503);expect(await failed.json()).toMatchObject({reason:'LLM_ERROR',retryable:true,refinementStatus:'generation_failed',refinementAllowance:{limit:2,used:0,remaining:2}});expect(docs[0].status).toBe('completed');expect(docs[0].initialBriefing).toEqual(initial);expect(docs[0].refinementStatus).toBe('generation_failed');expect(provider).toHaveBeenCalledTimes(46);expect(refund).not.toHaveBeenCalled();
 provider.mockImplementation(normal);
 await refine({sessionId:docs[0].id,freeform:'작게 바꾸겠습니다.'});
 for(let i=0;i<4&&docs[0].refinementStatus!=='completed';i++)await refine();
 expect(docs[0].refinementStatus).toBe('completed');expect(docs[0].llmMeta.refinementHistory).toHaveLength(1);expect(docs[0].initialBriefing).toEqual(initial);expect(refund).not.toHaveBeenCalled()});
it('refinement lease, owner and revoked proof block extra provider calls',async()=>{await initialComplete();await refine({sessionId:docs[0].id,freeform:'작은 선택부터 바꿉니다.'});const calls=provider.mock.calls.length;docs[0].llmMeta.refineLockedAt=new Date();docs[0].llmMeta.refineLockToken='other';expect((await refine()).status).toBe(202);userId='other';expect((await refine()).status).toBe(404);userId=uid;blocked=0;expect((await refine()).status).toBe(402);expect(provider).toHaveBeenCalledTimes(calls)});
it('saju basis and fallback card name only the day pillar, never all four pillars',async()=>{const {buildNeoBasisPayload}=await import('../../worker/lib/neo-operation-room-basis.js');const summary=utils.summarizeSaju({yearPillar:'갑자',monthPillar:'을축',dayPillar:'병인',hourPillar:'정묘',dayMaster:'병'});const core=buildNeoBasisPayload(summary).groups.find(group=>group.key==='core');const text=[summary.evidenceSummary,...core.items.map(item=>`${item.label} ${item.value}`)].join('\n');expect(text).toContain('병인');expect(text).not.toMatch(/갑자|을축|정묘|네 기둥|연월일시/)});

it('native Toss runs the original saved briefing and two reality checks, blocks revoked early rereads and never uses web refunds',async()=>{
 const {bindNativeTossRequest}=await import('../../worker/toss/native-context.js');
 const {nativeNeoContract}=await import('../../worker/routes/neo-operation-room.js');
 const contract=nativeNeoContract(body);let revoked=false;
 userId='unrelated-web-user';mode='none';
 const assertStored=jest.fn(async doc=>{
  if(revoked)throw Object.assign(new Error('ORDER_REFUNDED'),{code:'ORDER_REFUNDED',status:409});
  expect(doc.userId).toBe(uid);expect(doc.inputHash).toBe(contract.inputHash);expect(doc.paymentId).toBe('toss-original-order');
 });
 const access=jest.fn(async (_body,normalized,key)=>{
  if(revoked)return {ok:false};
  expect(key).toBe(contract.requestId);expect(normalized.inputHash).toBe(contract.inputHash);
  return {ok:true,accessType:'paid',source:'toss',paymentId:'toss-original-order'};
 });
 const call=async(path,input)=>{
  const request=new Request('https://mock.test/api/neo-operation-room'+path,{method:input?'POST':'GET',headers:{'content-type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});
  bindNativeTossRequest(request,{auth:{userId:uid,tossNative:true},access,assertStored});
  return route(request,{});
 };
 for(let i=0;i<4;i++)expect((await call('/start',docs[0]?{sessionId:docs[0].id}:body)).status).toBe(i===3?200:202);
 expect(docs[0].status).toBe('completed');expect(docs[0].llmMeta.tossNative).toBe(true);
 recoveryBind=jest.fn(async(_request,_env,stored)=>{expect(stored.paymentId).toBe('toss-original-order');throw new Error('NATIVE_RECOVERY_REACHED');});
 await expect(resumeNeo({}, {id:docs[0].id,userId:uid})).rejects.toThrow('NATIVE_RECOVERY_REACHED');
 expect(recoveryBind).toHaveBeenCalledTimes(1);
 expect(provider).toHaveBeenCalledTimes(14);
 const initial=clone(docs[0].initialBriefing),sessionId=docs[0].id;
 const saved=await (await call('/result?attemptId='+sessionId)).json();expect(saved.initialBriefing).toEqual(initial);
 for(const freeform of ['작은 선택부터 다시 정리하겠습니다.','이번에는 관계의 속도를 살펴보겠습니다.']){
  expect((await call('/refine',{sessionId,freeform})).status).toBe(202);
  expect((await call('/refine',{sessionId})).status).toBe(200);
 }
 expect(provider).toHaveBeenCalledTimes(30);expect(docs[0].initialBriefing).toEqual(initial);
 expect((await call('/refine',{sessionId,freeform:'새로운 세 번째 질문입니다.'})).status).toBe(409);
 expect(usage).toHaveBeenCalledTimes(1);expect(refund).not.toHaveBeenCalled();
 revoked=true;
 for(const [path,input] of [['/result?attemptId='+sessionId,null],['/start',{sessionId}],['/refine',{sessionId}]]){
  const response=await call(path,input);expect(response.status).toBe(409);expect((await response.json()).reason).toBe('ORDER_REFUNDED');
 }
 expect(provider).toHaveBeenCalledTimes(30);expect(assertStored).toHaveBeenCalled();
});

for(const stage of ['initial','refine']) it.each([
 ['ORDER_REFUNDED',409],['SESSION_EXPIRED',401],['ORDER_MISMATCH',403],
 ['PARTNER_RATE_LIMITED',429],['PARTNER_UNAVAILABLE',502],['storage',503],
])(`native Toss ${stage}: final authority failure %s preserves checkpoints for verified resume`,async(code,status)=>{
 const {bindNativeTossRequest}=await import('../../worker/toss/native-context.js');
 let deny=false;
 const access=jest.fn(async()=>{
  if(deny)throw code==='storage'?new Error('private database failure'):new TossError(code,status);
  return {ok:true,accessType:'paid',source:'toss',paymentId:'toss-original-order'};
 });
 const call=async(path,input)=>{
  const request=new Request('https://mock.test/api/neo-operation-room'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
  bindNativeTossRequest(request,{auth:{userId:uid,tossNative:true},access,assertStored:async doc=>{
   expect(doc.userId).toBe(uid);expect(doc.paymentId).toBe('toss-original-order');
  }});
  return route(request,{});
 };
 for(let i=0;i<(stage==='initial'?3:4);i++)await call('/start',docs[0]?{sessionId:docs[0].id}:body);
 const sessionId=docs[0].id,initial=clone(docs[0].initialBriefing);
 if(stage==='refine')expect((await call('/refine',{sessionId,freeform:'작은 선택부터 바꾸겠습니다.'})).status).toBe(202);
 const original=provider.getMockImplementation();
 provider.mockImplementation(async(...args)=>{const result=await original(...args);deny=true;return result;});
 const path=stage==='initial'?'/start':'/refine';
 const response=await call(path,{sessionId});
 expect(response.status).toBe(status);
 const payload=await response.json();
 expect(payload.reason).toBe(code==='storage'?'RESULT_STORAGE_UNAVAILABLE':code);
 expect(JSON.stringify(payload)).not.toContain('private database');
 expect(docs[0].status).toBe(stage==='initial'?'delivery_pending':'completed');
 if(stage==='refine'){
  expect(docs[0].initialBriefing).toEqual(initial);
  expect(docs[0].refinementStatus).toBe('generating');
  expect(docs[0].llmMeta.refinementHistory||[]).toHaveLength(0);
 }
 const calls=provider.mock.calls.length;deny=false;
 expect((await call(path,{sessionId})).status).toBe(200);
 expect(provider).toHaveBeenCalledTimes(calls);
 expect(docs[0].status).toBe('completed');
 if(stage==='refine')expect(docs[0].llmMeta.refinementHistory).toHaveLength(1);
 expect(refund).not.toHaveBeenCalled();
});

// S7 신살 블록(SAJU_SHINSAL_FACTS_V1 'neo'): 사주 새 세션만 llmMeta.shinsalFacts 로 고정하고, 핀과 플래그가 모두 맞을 때만 core 챕터 프롬프트에 붙인다.
// 블록은 저장하지 않고 프롬프트 때만 만든다 — 이어쓰기·현실 점검·플래그 전환에도 결제·완성 흐름(14+8 호출, 사용 1회, 환불 0)이 같다.
describe('S7 shinsal facts block', () => {
 const HEADER='[신살 계산값';
 const sajuChart={yearPillar:'庚午',monthPillar:'辛巳',dayPillar:'甲子',hourPillar:'丙寅',dayMaster:'甲'};
 const core=section=>section.basisGroups==='*'||section.basisGroups.includes('core');
 const sectionOf=prompt=>[...definitions,...refinedDefinitions].find(row=>prompt.includes(`제목: ${row.title}\n`));
 const prependToProse=(value,text)=>{let done=false;const walk=node=>{if(done||!node||typeof node!=='object')return;for(const key of Object.keys(node)){if(done)return;if(typeof node[key]==='string'&&node[key].length>50){node[key]=`${text} ${node[key]}`;done=true;}else walk(node[key]);}};walk(value);return value;};
 // quote 'line': 블록을 받은 챕터가 신살 한 줄을 근거로 인용한다(실제 답의 모양). 'all': 목록 전체와 사용 규칙을 매 챕터 그대로 옮긴다(최악).
 async function run(createFlag,resumeFlag,quote='line'){
  const env={SAJU_SHINSAL_FACTS_V1:createFlag};
  chart.mockImplementation(()=>clone(sajuChart));
  const original=provider.getMockImplementation();
  provider.mockImplementation(async(...args)=>{
   const value=await original(...args),at=args[1].indexOf(HEADER);
   const lines=at<0?[]:args[1].slice(at).split('\n').slice(1).filter(line=>/^(- |사용 규칙)/.test(line)).map(line=>line.replace(/^- /,''));
   const cited=quote==='all'?lines.join(' '):(lines[0]?`${lines[0]}.`:'');
   return {...value,text:JSON.stringify(prependToProse(JSON.parse(value.text),`일주 甲子를 근거로 본다. ${cited}`.trim()))};
  });
  const call=(path,payload)=>route(new Request(`https://mock.test/api/neo-operation-room/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),env);
  expect((await call('start',body)).status).toBe(202);
  const created=provider.mock.calls.length;
  env.SAJU_SHINSAL_FACTS_V1=resumeFlag;
  let response;
  for(let i=0;i<8&&docs[0].status!=='completed';i++){response=await call('start',{sessionId:docs[0].id});expect([409,500,503]).not.toContain(response.status);}
  expect(response.status).toBe(200);
  expect((await call('refine',{sessionId:docs[0].id,freeform:'작은 선택부터 바꾸겠습니다.'})).status).toBe(202);
  for(let i=0;i<6&&docs[0].refinementStatus!=='completed';i++){response=await call('refine',{sessionId:docs[0].id});expect([409,500,503]).not.toContain(response.status);}
  expect(response.status).toBe(200);
  expect(docs[0].status).toBe('completed');expect(docs[0].refinementStatus).toBe('completed');
  expect(usage).toHaveBeenCalledTimes(1);expect(refund).not.toHaveBeenCalled();
  expect(JSON.stringify(docs[0])).not.toContain(HEADER);
  const seen=provider.mock.calls.map(([,prompt])=>({section:sectionOf(prompt),blocks:prompt.split(HEADER).length-1}));
  return {pin:docs[0].llmMeta.shinsalFacts,seen,created,calls:provider.mock.calls.length};
 }
 it('a pinned saju session adds the block once to every core chapter and nothing else', async()=>{
  const {pin,seen,calls}=await run('neo','neo');
  expect(pin).toBe('shinsal-facts-v1');
  expect(calls).toBe(22);
  for(const {section,blocks} of seen)expect(blocks).toBe(core(section)?1:0);
  expect(seen.filter(row=>row.blocks).length).toBe(15);
 });
 it('a legacy session stays off after the flag turns on', async()=>{
  const {pin,seen,calls}=await run('','neo');
  expect(pin).toBeUndefined();
  expect(calls).toBe(22);
  for(const {blocks} of seen)expect(blocks).toBe(0);
 });
 it('turning the flag off drops the block from the next wave, the reality check included', async()=>{
  const {pin,seen,created,calls}=await run('true','');
  expect(pin).toBe('shinsal-facts-v1');
  expect(calls).toBe(22);
  expect(seen.slice(0,created).some(row=>row.blocks===1)).toBe(true);
  for(const {blocks} of seen.slice(created))expect(blocks).toBe(0);
 });
 it('another consumer id does not pin neo', async()=>{
  const {pin,seen,calls}=await run('new-year','new-year');
  expect(pin).toBeUndefined();
  expect(calls).toBe(22);
  for(const {blocks} of seen)expect(blocks).toBe(0);
 });
 // 기존 되풀이 검사가 같은 문장을 반려하고, 기존 2회차 정리(dedupe)가 되살린다 — 호출은 늘어도 전달은 끝난다.
 it('copying the whole block into every chapter still delivers the paid consultation', async()=>{
  const {calls}=await run('neo','neo','all');
  expect(calls).toBeGreaterThan(22);
 });
});
