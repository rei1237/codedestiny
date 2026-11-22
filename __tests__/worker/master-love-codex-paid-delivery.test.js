/** @jest-environment node */
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let docs, fault, lostConfirmation, route, provider, refund, owner, blocked, fetchBlock, revokedSource;
const uid='64b7f2a1c3d4e5f601234567';
it('archive requires all distinct purchased chapters, not just a completed status or count', async () => {
  const { isCodexArchiveComplete, __masterLoveCodexTestUtils: utils } = await import('../../worker/routes/master-love-codex.js');
  for (const mode of ['solo', 'compat']) {
    const chapters = utils.MODES[mode].chapters.map(spec => ({ id: spec.id, chars: spec.minChars, ok: true }));
    const doc = { mode, status: 'completed', chapters };
    expect(isCodexArchiveComplete(doc)).toBe(true);
    expect(isCodexArchiveComplete({ ...doc, status: 'generating' })).toBe(false);
    expect(isCodexArchiveComplete({ ...doc, chapters: chapters.slice(1) })).toBe(false);
    expect(isCodexArchiveComplete({ ...doc, chapters: chapters.map(() => chapters[0]) })).toBe(false);
    expect(isCodexArchiveComplete({ ...doc, chapters: chapters.map((row, i) => i ? row : { ...row, chars: 0 }) })).toBe(false);
  }
});
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
const get = (doc, key) => key.split(".").reduce((value, field) => value?.[field], doc);
function assign(doc, fields) { for (const [key,value] of Object.entries(fields)) { const keys=key.split("."); let target=doc; for(const part of keys.slice(0,-1)) target=target[part] ||= {}; target[keys.at(-1)]=clone(value); } }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    if (key === "$and") return value.every(row => matches(doc, row));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("$ne" in value) return get(doc, key) !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(get(doc, key));
      if ("$in" in value) return value.$in.includes(get(doc, key));
      if ("$exists" in value) return (get(doc, key) !== undefined) === value.$exists;
      if ("$lt" in value) return new Date(get(doc, key)) < value.$lt;
      if ("$lte" in value) return new Date(get(doc, key)) <= value.$lte;
      if ("$gt" in value) return new Date(get(doc, key)) > value.$gt;
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
    if (fault && (fault.status || fault.chapterCount) && fault.kind !== "usage" && (fault.chapterCount ? update.$set.sections?.length === fault.chapterCount : update.$set.status === fault.status)) {
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
    if (fault && (fault.status ? update.$set.status === fault.status : update.$set.deliveryMeta?.savedChapters?.length === fault.count)) {
      const value=fault; fault=null;
      if(value.kind==='throw') throw new Error('storage unavailable');
      if(value.kind==='null') return null;
      if(value.kind==='confirm') lostConfirmation=true;
    }
    const doc=docs.find(row=>matches(row,filter));
    if(doc) assign(doc,update.$set);
    if(doc) for(const key of Object.keys(update.$unset||{})){const keys=key.split(".");const parent=keys.slice(0,-1).reduce((v,f)=>v?.[f],doc);if(parent)delete parent[keys.at(-1)];}
    return{matchedCount:doc?1:0,modifiedCount:doc?1:0};
  },
};


beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js');const auth=await import('../../worker/lib/auth.js');const models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_e,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,getOptionalUserFromRequest:async()=>({userId:owner}),getAccessTokenSecret:()=> 'test-only'}));
 jest.unstable_mockModule('../../worker/lib/jwt.js',()=>({signJwt:async()=> 'test-token',verifyJwt:async()=>({})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,MasterLoveCodexSession:model,Payment:{findOne:()=>query(blocked?{}:null)},PaidExecutionRecord:{findOne:()=>query(revokedSource===0?{}:null),updateOne:async()=>({matchedCount:1})},PointHistory:{findOne:()=>query(revokedSource===1?{}:null)},MonthlyCreditLedger:{findOne:()=>query(revokedSource===2?{}:null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:async()=>{throw new Error('Live provider blocked')}}));
 ({handleMasterLoveCodexRoutes:route}=await import('../../worker/routes/master-love-codex.js'));
});
beforeEach(()=>{
 owner=uid;blocked=false;revokedSource=-1;fault=null;lostConfirmation=false;
 docs=[{id:'saved-codex',userId:uid,idempotencyKey:'original-run',billingRequestId:'original-run',paymentId:'original-payment',inputHash:'original-input',mode:'solo',accessType:'paid',status:'generating',chapters:[],generationProgress:null}];
 refund=jest.fn(async()=>({refunded:false}));
 provider=jest.fn(async(_env,{chapter})=>{let body='';for(let i=0;body.length<(chapter.minChars||2400)+300;i++)body+=`${chapter.id}의 ${i}번째 계산 근거를 바탕으로 생활에서 반복되는 선택과 반대 조건을 구체적으로 살펴보고 실행할 행동을 정합니다.\n`;return{status:'ok',chapter:{id:chapter.id,title:chapter.title,order:chapter.order,symbol:chapter.symbol,body,chars:body.length,ok:true}}});
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
// 환불 한 바퀴 = 코인 → 월정석 → 결제 취소(같은 모의 함수, 각각 refunded:false 라 셋 다 불린다).
const REFUND_CHAIN = 3;
// R7 (2026-11-19) 다시 시도 먼저: 결제(생성 시작) 후 7일 안의 최종 실패는 환불 대신 무료 다시 시도 보류. 즉시 환불을 보는 테스트는 창 밖 세션으로 고정한다.
const pastRetryWindow = () => new Date(Date.now() - 8 * 86400000);
async function generate(extra = {}){return route(new Request('https://mock.test/api/master-love-codex/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:'saved-codex'})}),{},{generateChapter:provider,refundPassCoverage:refund,runCoinRefund:refund,runMonthlyCreditRefund:refund,runPaymentCancel:refund,...extra})}
it('preserves a 19/20 compat book without granting calls beyond its exhausted budget', async () => {
  const { __masterLoveCodexTestUtils: utils, diagnoseCodexSession, isCodexArchiveComplete } = await import('../../worker/routes/master-love-codex.js');
  const { planCodexReopen } = await import('../../worker/lib/master-love-codex-recovery-task.js');
  const chapters = [];
  for (const chapter of utils.MODES.compat.chapters.filter(row => row.id !== 'self')) chapters.push((await provider({}, { chapter })).chapter);
  provider.mockClear();
  Object.assign(docs[0], { mode: 'compat', status: 'generation_failed', chapters,
    deliveryMeta: { savedChapters: chapters, attempts: { self: 4 }, failures: { self: 4 }, reviewRequired: true,
      errors: { self: { code: 'LLM_PARTNER_EVIDENCE_MISSING' } }, reviewReason: 'GENERATION_BUDGET_EXCEEDED' } });
  const originalBodies = chapters.map(row => row.body);
  const plan = planCodexReopen(docs[0], diagnoseCodexSession);
  expect(plan).toBeNull();
  await generate();
  expect(provider).not.toHaveBeenCalled();
  expect(docs[0].chapters.filter(row => row.id !== 'self').map(row => row.body)).toEqual(originalBodies);
  expect(isCodexArchiveComplete(docs[0])).toBe(false);
  expect(docs[0].paymentId).toBe('original-payment');
  expect(refund).not.toHaveBeenCalled();
});
for(const accessType of ['pass','monthly_credit','paid'])it(`${accessType} completes five bounded waves with original evidence`,async()=>{docs[0].accessType=accessType;for(let i=0;i<5;i++)expect((await generate()).status).toBe(i<4?202:200);expect(provider).toHaveBeenCalledTimes(20);expect(docs[0].status).toBe('completed');expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(20);expect(refund).not.toHaveBeenCalled()});
for(const status of ['delivery_pending','completed'])for(const kind of ['throw','null','confirm'])it(`${status} ${kind} preserves generated book`,async()=>{for(let i=0;i<4;i++)await generate();fault={status,kind};const res=await generate();expect(res.status).toBe(503);expect(await res.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true,resultId:'saved-codex'});expect(refund).not.toHaveBeenCalled();expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(20)});
it('saves siblings after the first chapter fails',async()=>{provider.mockImplementationOnce(async()=>({status:'fallback'}));expect((await generate()).status).toBe(202);expect(docs[0].chapters).toHaveLength(3);expect(docs[0].deliveryMeta.savedChapters).toHaveLength(3);for(let i=0;i<5;i++)await generate();expect(provider).toHaveBeenCalledTimes(21);expect(docs[0].chapters).toHaveLength(20);expect(refund).not.toHaveBeenCalled()});
it('checkpoint exception does not refund and siblings remain saved',async()=>{fault={count:1,kind:'throw'};expect((await generate()).status).toBe(503);expect(docs[0].deliveryMeta.savedChapters).toHaveLength(4);expect(refund).not.toHaveBeenCalled();for(let i=0;i<4;i++)await generate();expect(provider).toHaveBeenCalledTimes(20)});
it('another owner and refunded payment cannot generate',async()=>{owner='other';expect((await generate()).status).toBe(404);owner=uid;blocked=true;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('refunded pass or monthly balance cannot be reused',async()=>{for(const field of ['passRefund','billingRefund']){docs[0][field]={refundedAt:new Date()};expect((await generate()).status).toBe(402);delete docs[0][field]}expect(provider).not.toHaveBeenCalled()});
it('concurrent requests cannot generate the same chapters twice',async()=>{const results=await Promise.all([generate(),generate()]);expect(results.map(r=>r.status).sort()).toEqual([202,409]);expect(provider).toHaveBeenCalledTimes(4)});
it('legacy completed books remain readable without new quality checks',async()=>{docs[0].status='completed';docs[0].chapters=[{id:'old',body:'과거 구매 결과',ok:true}];expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled()});

for(const source of [0,1,2])it(`rejects refunded execution or balance ledger ${source}`,async()=>{revokedSource=source;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('uncertain exhausted calls do not trigger more LLM or a refund',async()=>{await generate();const ids=docs[0].deliveryMeta.savedChapters.map(row=>row.id);const {__masterLoveCodexTestUtils:utils}=await import('../../worker/routes/master-love-codex.js');const next=utils.MODES.solo.chapters.find(row=>!ids.includes(row.id));docs[0].deliveryMeta.attempts[next.id]=4;
 // 소진된 장은 다시 호출되지 않지만, 그 한 장이 나머지 장의 생성을 멈추지도 않는다.
 expect((await generate()).status).toBe(202);expect(provider.mock.calls.some(([,input])=>input.chapter.id===next.id)).toBe(false);
 expect(docs[0].deliveryMeta.savedChapters).toHaveLength(8);expect(refund).not.toHaveBeenCalled()});

for (const state of ['deferred']) it(`${state} confirmed refusals preserve the same paid book past three waves with durable backoff`, async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async () => ({ status: state, failure: { code: 'LLM_PROVIDER_UNAVAILABLE', kind: state === 'deferred' ? 'deferred' : 'provider_rejected' } }));
  for (let wave = 0; wave < 4; wave++) {
    expect((await generate()).status).toBe(503);
    expect(Object.values(docs[0].deliveryMeta.attempts).every(value => value === 0)).toBe(true);
    const calls = provider.mock.calls.length;
    expect((await generate()).status).toBe(503);
    expect(provider).toHaveBeenCalledTimes(calls);
    docs[0].deliveryMeta.nextAttemptAt = null;
  }
  expect(refund).not.toHaveBeenCalled();
  provider.mockImplementation(normal);
  for (let wave = 0; wave < 5; wave++) await generate();
  expect(docs[0].status).toBe('completed');
  expect(docs[0].paymentId).toBe('original-payment');
});

// S16 (2026-11-19): 공급자 거절도 장당 4회 상한 — 소진되면 부분 전달 없이 최종 실패 + 자동 환불(1회).
it('provider refusals consume at most four attempts per chapter, then close with one refund and no body', async () => {
  docs[0].createdAt = pastRetryWindow();
  provider.mockImplementation(async () => ({ status: 'retryable', failure: { code: 'LLM_PROVIDER_UNAVAILABLE', kind: 'provider_rejected' } }));
  for (let wave = 0; wave < 20; wave++) { await generate(); docs[0].deliveryMeta.nextAttemptAt = null; }
  expect(Object.values(docs[0].deliveryMeta.attempts).every(value => value === 4)).toBe(true);
  const calls = provider.mock.calls.length;
  expect(calls).toBe(80);
  const closed = await generate();
  expect(closed.status).toBe(503);
  expect(await closed.json()).toMatchObject({ status: 'generation_failed', retryable: false, reason: 'GENERATION_FAILED_REFUNDED', chapters: [], loveDna: null });
  expect(docs[0].status).toBe('generation_failed');
  expect(docs[0].deliveryMeta.reviewReason).toBe('DELIVERY_FAILED');
  expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
  await generate();
  expect(provider).toHaveBeenCalledTimes(calls);
  expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
  expect(docs[0].paymentId).toBe('original-payment');
});

it('public progress publishes every saved sibling in order and never the lock token', async () => {
  provider.mockImplementationOnce(async () => ({ status: 'fallback' }));
  const payload = await (await generate()).json();
  // S16: 완료 전 응답은 본문 없이 개수·상태만 싣는다.
  expect(payload.chapters).toEqual([]);
  expect(payload.loveDna ?? null).toBe(null);
  expect(payload.generationProgress).toMatchObject({ completed: 3, readable: 0, total: 20, validated: 3, finalized: 0, percent: 14, step: 'retrying' });
  expect(payload.generationProgress.currentChapter.order).toBe(1);
  expect(payload.generationProgress.lockToken).toBeUndefined();
});

for (const mode of ['solo', 'compat']) it(`${mode} starts with one stored chapter and reopens all 20 required IDs without calls`, async () => {
  docs[0].mode = mode;
  const { __masterLoveCodexTestUtils: utils } = await import('../../worker/routes/master-love-codex.js');
  const first = utils.MODES[mode].chapters[0];
  docs[0].chapters = [(await provider({}, { chapter: first })).chapter]; provider.mockClear();
  for (let wave = 0; wave < 5; wave++) await generate();
  expect(provider).toHaveBeenCalledTimes(19);
  const reopen = await route(new Request('https://mock.test/api/master-love-codex/session?sessionId=saved-codex'), {});
  expect((await reopen.json()).chapters.map(row => row.id)).toEqual(utils.MODES[mode].chapters.map(row => row.id));
  expect(provider).toHaveBeenCalledTimes(19); expect(refund).not.toHaveBeenCalled();
});

it('chapter two failure preserves later IDs and passes its correction into the next wave', async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (env, input) => input.chapter.order === 2 && !docs[0].deliveryMeta?.errors?.[input.chapter.id]
    ? { status: 'fallback', failure: { code: 'LLM_OUTPUT_TRUNCATED', kind: 'quality' } } : normal(env, input));
  const payload = await (await generate()).json();
  expect(payload.generationProgress).toMatchObject({ completed: 3, readable: 0 });
  await generate();
  expect(provider.mock.calls.find(([, input], index) => index >= 4 && input.chapter.order === 2)[1].previousError).toBe('LLM_OUTPUT_TRUNCATED');
  expect(provider.mock.calls.filter(([, input]) => input.chapter.order === 3)).toHaveLength(1);
});

// 불확실 호출의 상한은 "장당 4회"다(S16) — 앞 장이 소진돼도 남은 장을 계속 시도한다(전면 장애 시 최대 20×4회,
// outages 백오프가 간격을 벌린다). 전부 소진되면 최종 실패 + 자동 환불(1회), 본문은 내보내지 않는다.
it('ambiguous provider timeouts stay capped at four attempts a chapter and then refund once', async () => {
  docs[0].createdAt = pastRetryWindow();
  provider.mockImplementation(async () => ({ status: 'retryable', failure: { code: 'LLM_TIMEOUT_UNCERTAIN', kind: 'uncertain' } }));
  for (let wave = 0; wave < 20; wave++) { expect((await generate()).status).toBe(503); docs[0].deliveryMeta.nextAttemptAt = null; }
  expect(provider).toHaveBeenCalledTimes(80);
  const payload = await (await generate()).json();
  expect(payload.retryable).toBe(false); expect(payload.reason).toBe('GENERATION_FAILED_REFUNDED');
  expect(payload.chapters).toEqual([]);
  await generate(); expect(provider).toHaveBeenCalledTimes(80); expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
});

it('expired batch lock resumes without repeating accepted chapters', async () => {
  await generate(); docs[0].generationProgress.lockedAt = new Date(Date.now() - 120001);
  docs[0].generationProgress.lockToken = 'dead-document';
  expect((await generate()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(8);
});

it.each([false, true])('a validated stable cache resolves uncertain exhausted storage, short=%s', async short => {
  const { __masterLoveCodexTestUtils: utils } = await import('../../worker/routes/master-love-codex.js');
  const { buildCodexEvidence } = await import('../../worker/lib/master-love-codex-evidence.js');
  const { buildCodexStagingChapter } = await import('../../worker/lib/master-love-codex-quality.js');
  const { calculateLifeBookAiSaju } = await import('../../worker/lib/life-book-ai-saju.js');
  const { calculateZiweiAiChart } = await import('../../worker/lib/ziwei-ai-chart.js');
  const birthInfo = { birthDate: '1990-05-12', birthTime: '09:30', gender: 'female', calendarType: 'solar' };
  docs[0].sajuResult = calculateLifeBookAiSaju(birthInfo, { year: 2026 });
  docs[0].ziweiChart = calculateZiweiAiChart({ birthInfo }, { year: 2026 });
  const chapter = utils.MODES.solo.chapters[0], parsed = buildCodexStagingChapter(chapter, utils.MODES.solo.dnaMetrics);
  let sentence = 0;
  parsed.body = parsed.body.replace(/([^.!?。！？\n]+)([.!?。！？\n]|$)/g, (_all, text, separator) => `[mock ${sentence++}] ${text}${separator}`);
  const contract = buildCodexEvidence({ chapter, saju: docs[0].sajuResult, ziweiChart: docs[0].ziweiChart });
  parsed.evidence = contract.records.map(record => ({ evidenceId: record.id, subject: record.subject, system: record.system,
    period: record.period, certainty: record.certainty, label: record.path, explanation: '모의 근거' }));
  parsed.crossChecks = contract.crossChecks.map(record => ({ id: record.id, status: record.status, explanation: '모의 판정' }));
  if (short) parsed.body = lengthCandidate(chapter, 650).chapter.body;
  docs[0].deliveryMeta = { attempts: { [chapter.id]: 3 } };
  const chapterSnapshotStore = { get: jest.fn(async () => ({ text: JSON.stringify({ parsed, chapter: { id: chapter.id, body: 'untrusted copy' } }) })) };
  expect((await generate({ chapterSnapshotStore })).status).toBe(202);
  expect(provider).toHaveBeenCalledTimes(4);
  expect(provider.mock.calls.some(([, input]) => input.chapter.id === chapter.id)).toBe(false);
  expect(docs[0].chapters[0].body).toBe(parsed.body.trim());
  expect(docs[0].deliveryMeta.reviewRequired).not.toBe(true); expect(refund).not.toHaveBeenCalled();
});

// ─── 부분 생성 회귀(2026-09-19) ────────────────────────────────────────────────
// 한 장이 막혀도 나머지 장이 저장·노출되고, 생성은 남은 장에서 이어진다.
const reopen = async (env = {}) => (await route(new Request('https://mock.test/api/master-love-codex/session?sessionId=saved-codex'), env)).json();
const utils = async () => (await import('../../worker/routes/master-love-codex.js')).__masterLoveCodexTestUtils;

// I. DB 에 유효한 장이 여럿인데 API 가 "1장부터 끊기지 않는 앞 구간"만 내보내던 경로.
it('publishes every validated chapter while an earlier chapter is still missing', async () => {
  provider.mockImplementationOnce(async () => ({ status: 'fallback', failure: { code: 'LLM_QUALITY_FAILED', kind: 'quality' } }));
  const payload = await (await generate()).json();
  // S16: 검증된 장은 저장·집계되지만 본문은 완료 뒤에만 나간다.
  expect(payload.chapters).toEqual([]);
  expect(payload.status).toBe('generating');
  expect(payload.generationProgress).toMatchObject({ completed: 3, readable: 0, total: 20, validated: 3, finalized: 0, percent: 14, step: 'retrying' });
  expect(payload.generationProgress.lockToken).toBeUndefined();
  expect(payload.outline).toHaveLength(20);
  expect(payload.outline.map(row => row.state).slice(0, 5)).toEqual(['retrying', 'ready', 'ready', 'ready', 'pending']);
  expect(payload.outline.some(row => row.body || row.content)).toBe(false);
});

// C. 1장만 저장된 세션은 어떤 경로에서도 완료·100% 로 보이지 않는다.
it('a book with one stored chapter never reads as complete or 100%', async () => {
  const { MODES } = await utils();
  docs[0].chapters = [(await provider({}, { chapter: MODES.solo.chapters[0] })).chapter];
  const payload = await reopen();
  expect(payload.status).toBe('generating');
  expect(payload.chapters).toHaveLength(0);
  expect(payload.totalChapters).toBe(20);
  expect(payload.generationProgress).toMatchObject({ validated: 1, finalized: 0, total: 20, percent: 4 });
});

// ④ 전 장이 저장됐어도 완료 확정이 성립하기 전에는 100% 가 되지 않는다.
it('holds back 100% until the server finalizes completion', async () => {
  for (let wave = 0; wave < 4; wave++) await generate();
  fault = { status: 'completed', kind: 'null' };
  expect((await generate()).status).toBe(503);
  const payload = await reopen();
  expect(payload.status).not.toBe('completed');
  expect(payload.chapters).toHaveLength(0);
  expect(payload.generationProgress).toMatchObject({ validated: 20, finalized: 0, percent: 95, step: 'finalizing' });
});

// A·E. 상한을 소진한 장이 나머지 19장의 생성을 막지 않는다. S16: 남은 장이 전부 끝나면 부분 전달 대신 최종 실패 + 자동 환불.
it('a chapter that exhausts its attempts does not stop the remaining chapters', async () => {
  docs[0].createdAt = pastRetryWindow();
  const { MODES } = await utils();
  const stuck = MODES.solo.chapters[1];
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (env, input) => input.chapter.id === stuck.id
    ? { status: 'fallback', failure: { code: 'LLM_QUALITY_FAILED', kind: 'quality' } } : normal(env, input));
  for (let wave = 0; wave < 6; wave++) expect((await generate()).status).toBe(202);
  expect(docs[0].deliveryMeta.attempts[stuck.id]).toBe(4);
  expect(docs[0].chapters).toHaveLength(19);
  expect(docs[0].status).toBe('generating');
  const closed = await generate();
  expect(closed.status).toBe(503);
  expect(await closed.json()).toMatchObject({ status: 'generation_failed', retryable: false, reason: 'GENERATION_FAILED_REFUNDED', chapters: [] });
  expect(docs[0].status).toBe('generation_failed');
  expect(docs[0].deliveryMeta).toMatchObject({ reviewRequired: true, reviewReason: 'DELIVERY_FAILED', exhaustedChapterIds: [stuck.id] });
  expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
  const payload = await reopen();
  expect(payload.chapters).toEqual([]);
  expect(payload.status).toBe('generation_failed');
  expect(payload.retryable).toBe(false);
  await generate();
  expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
});

// §4. 구매 시점 구성이 세션에 고정되어, 이후 상품 구성 변경이 진행 중인 책을 바꾸지 못한다.
it('pins the purchased chapter list so a later product change cannot resize a running book', async () => {
  const { MODES } = await utils();
  const originalProvider = provider.getMockImplementation();
  provider.mockImplementation((env, input) => originalProvider(env, { ...input, chapter: { ...input.chapter, minChars: 4000 } }));
  docs[0].deliveryMeta = { manifest: { mode: 'solo', chapterIds: MODES.solo.chapters.slice(0, 8).map(row => row.id), version: 'test-v1' } };
  for (let wave = 0; wave < 2; wave++) await generate();
  expect(provider).toHaveBeenCalledTimes(8);
  expect(docs[0].status).toBe('completed');
  const payload = await reopen();
  expect(payload.totalChapters).toBe(8);
  expect(payload.generationProgress).toMatchObject({ total: 8, validated: 8, finalized: 1, percent: 100 });
});

for (const mode of ['solo', 'compat']) it(`${mode} completes actual route generation and new-document reading with staging-only fixtures`, async () => {
  docs[0].mode = mode;
  const env = { APP_ENV: 'staging', STAGING_LLM_MOCK_ENABLED: 'true', WORKERS_AI_ENABLED: 'false' };
  const request = () => new Request('https://mock.test/api/master-love-codex/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 'saved-codex' }) });
  for (let wave = 0; wave < 5; wave++) expect((await route(request(), env)).status).toBe(wave === 4 ? 200 : 202);
  const reopened = await route(new Request('https://mock.test/api/master-love-codex/session?sessionId=saved-codex'), env);
  const payload = await reopened.json();
  expect(payload.status).toBe('completed'); expect(payload.chapters).toHaveLength(20);
  expect(provider).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled();
});

it('public progress ignores duplicate IDs, apology text and stale numeric counters', async () => {
  await generate(); const first = docs[0].chapters[0];
  docs[0].chapters = [first];
  docs[0].deliveryMeta.savedChapters = [first, first, { ...first, id: 'unknown' }, { ...docs[0].chapters[0], id: 'temperament', ok: false }];
  docs[0].generationProgress.completed = 19;
  const payload = await (await route(new Request('https://mock.test/api/master-love-codex/session?sessionId=saved-codex'), {})).json();
  expect(payload.generationProgress).toMatchObject({ completed: 1, readable: 0, total: 20, validated: 1, finalized: 0, percent: 4 });
  expect(payload.chapters).toHaveLength(0);
});

// Real chapters share chart facts. Dedupe must cut those repeats without failing the chapter.
for (const [name, ratio, lead] of [
  ['shared evidence sentences near the floor', 0.76, ''],
  ['a repeated sentence that starts with a chapter reference', 1.1, '제1장에서 본 것처럼 일간은 관계의 속도를 먼저 살피는 편입니다.'],
]) it(`completes the book when later chapters repeat ${name}`, async () => {
  const { hasRepeatedReportPassage } = await import('../../worker/lib/paid-report-quality.js');
  const shared = ['출생시각을 모르는 명반은 정오를 가정해 계산했으므로 시주에 기대는 해석은 참고로만 읽어 주세요.',
    '일간과 배우자궁의 관계는 이 책 전체에서 같은 계산 결과를 바탕으로 다른 장면에 적용합니다.',
    '점수는 해석을 돕는 지표일 뿐이며 관계의 성공 확률이나 심리검사 결과를 뜻하지 않습니다.'];
  provider.mockImplementation(async (_env, { chapter }) => {
    const target = Math.ceil((chapter.minChars || 2400) * ratio);
    let body = lead ? `${lead} ${chapter.id} 장은 같은 근거를 이 장의 생활 장면으로 옮겨 다시 읽어 봅니다.\n` : `${shared.join('\n')}\n`;
    for (let i = 0; body.length < target; i++) body += `${chapter.id}의 ${i}번째 고유 근거로 생활 장면과 대응을 구체적으로 정리합니다.\n`;
    return { status: 'ok', chapter: { id: chapter.id, title: chapter.title, order: chapter.order, symbol: chapter.symbol, body, chars: body.length, ok: true } };
  });
  for (let wave = 0; wave < 12 && docs[0].status !== 'completed'; wave++) await generate();
  expect(docs[0].deliveryMeta.reviewRequired).not.toBe(true);
  expect(docs[0].status).toBe('completed');
  expect(docs[0].chapters).toHaveLength(20);
  // Under minChars (ratio 0.76) only the four shortest chapters get one length repair each (rule L2 + F19 cap).
  expect(provider).toHaveBeenCalledTimes(ratio < 1 ? 20 + 4 : 20); // F19: at most 4 repairs per book
  expect(hasRepeatedReportPassage(docs[0].chapters.map(row => row.body).join('\n'))).toBe(false);
  expect(refund).not.toHaveBeenCalled();
});


function lengthCandidate(chapter, target, tag = "초안") {
  let body = "";
  for (let i = 0; body.length < target; i++) body += `${chapter.id} ${tag} ${i}번째 계산 근거는 관계의 속도를 살펴보고 서로 다른 선택과 행동을 검토하는 장면입니다.\n`;
  return { status: 'ok', chapter: { id: chapter.id, order: chapter.order, title: chapter.title, symbol: chapter.symbol, body, chars: body.length, ok: true } };
}

for (const mode of ['solo', 'compat']) for (const repair of ['shorter', 'longer', 'empty', 'invalid', 'repeated']) {
  it(`${mode} preserves the longest valid short draft after one ${repair} repair`, async () => {
    const { MODES } = await utils(); docs[0].mode = mode;
    const first = MODES[mode].chapters[0];
    const normal = provider.getMockImplementation();
    let draftCalls = 0;
    provider.mockImplementation(async (env, input) => {
      if (input.chapter.id !== first.id) return normal(env, input);
      draftCalls++;
      if (draftCalls === 1) return lengthCandidate(first, 650);
      expect(docs[0].deliveryMeta.attempts[`${first.id}:lengthRepair`]).toBe(1);
      expect(input.previousError).toBe('LLM_OUTPUT_TOO_SHORT');
      if (repair === 'invalid') return { status: 'fallback', failure: { kind: 'quality', code: 'LLM_EVIDENCE_INVALID' } };
      if (repair === 'empty') return { status: 'ok', chapter: { ...lengthCandidate(first, 1).chapter, body: '' } };
      if (repair === 'repeated') return { status: 'ok', chapter: { ...lengthCandidate(first, 1).chapter, body: docs[0].chapters.find(row => row.id !== first.id).body } };
      return lengthCandidate(first, repair === 'longer' ? 1100 : 300, '보강');
    });
    for (let wave = 0; wave < 8 && docs[0].status !== 'completed'; wave++) await generate();
    expect(docs[0].status).toBe('completed');
    expect(draftCalls).toBe(2);
    const { isCodexArchiveComplete } = await import('../../worker/routes/master-love-codex.js');
    expect(isCodexArchiveComplete(docs[0])).toBe(true);
    expect(isCodexArchiveComplete({ ...docs[0], chapters: docs[0].chapters.slice(1) })).toBe(false);
    const body = docs[0].chapters.find(row => row.id === first.id).body;
    expect(body).toBe(lengthCandidate(first, repair === 'longer' ? 1100 : 650, repair === 'longer' ? '보강' : '초안').chapter.body.trim());
    expect(docs[0].deliveryMeta.failures[first.id] || 0).toBe(0);
    expect(refund).not.toHaveBeenCalled();
  });
}

// R3/R4 (2026-10-09): chapters at 73~76% of minChars cleared the 0.7 acceptance floor and
// shipped without the one length repair rule L2 promises.
it('sends a chapter above the acceptance floor but under minChars through one length repair within the cap', async () => {
  const { MODES } = await utils();
  const first = MODES.solo.chapters[0];
  const normal = provider.getMockImplementation();
  const calls = [];
  provider.mockImplementation(async (env, input) => {
    if (input.chapter.id !== first.id) return normal(env, input);
    calls.push(input.previousError);
    return lengthCandidate(first, Math.ceil(first.minChars * (calls.length === 1 ? 0.75 : 1.05)), calls.length === 1 ? '초안' : '보강');
  });
  for (let wave = 0; wave < 10 && docs[0].status !== 'completed'; wave++) await generate();
  expect(docs[0].status).toBe('completed');
  expect(calls).toEqual(['', 'LLM_OUTPUT_TOO_SHORT']);
  expect(docs[0].deliveryMeta.attempts[first.id]).toBe(2);
  expect(docs[0].deliveryMeta.attempts[`${first.id}:lengthRepair`]).toBe(1);
  expect(docs[0].chapters.find(row => row.id === first.id).body).toBe(lengthCandidate(first, Math.ceil(first.minChars * 1.05), '보강').chapter.body.trim());
  expect(provider).toHaveBeenCalledTimes(21);
  expect(refund).not.toHaveBeenCalled();
});

it('resumes a lost final length-repair reservation without another provider call', async () => {
  const { MODES } = await utils();
  const rows = await Promise.all(MODES.solo.chapters.map(async chapter => (await provider({}, { chapter })).chapter));
  const first = MODES.solo.chapters[0];
  rows[0] = { ...lengthCandidate(first, 700).chapter, lengthDraft: true };
  docs[0].chapters = rows;
  docs[0].deliveryMeta = { savedChapters: rows, attempts: { [first.id]: 3, [`${first.id}:lengthRepair`]: 1 } };
  provider.mockClear();
  expect((await generate()).status).toBe(200);
  expect(provider).not.toHaveBeenCalled();
  expect(docs[0].chapters[0].body).toBe(rows[0].body);
  expect(refund).not.toHaveBeenCalled();
});

it('accepts a structurally valid short chapter on its last existing attempt', async () => {
  const { MODES, CHAPTER_ATTEMPT_LIMIT } = await utils(); const first = MODES.solo.chapters[0];
  docs[0].deliveryMeta = { attempts: { [first.id]: CHAPTER_ATTEMPT_LIMIT - 1 } };
  provider.mockImplementationOnce(async () => lengthCandidate(first, 700));
  for (let wave = 0; wave < 5; wave++) await generate();
  expect(docs[0].status).toBe('completed');
  expect(provider.mock.calls.filter(([, input]) => input.chapter.id === first.id)).toHaveLength(1);
  expect(refund).not.toHaveBeenCalled();
});

it('delivers all usable short chapters after at most four shortest-first length repairs per book (F19)', async () => {
  provider.mockImplementation(async (_env, { chapter }) => lengthCandidate(chapter, 650));
  for (let wave = 0; wave < 12 && docs[0].status !== 'completed'; wave++) await generate();
  expect(docs[0].status).toBe('completed');
  expect(docs[0].chapters).toHaveLength(20);
  expect(provider).toHaveBeenCalledTimes(24);
  expect((await generate()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(24);
  expect(refund).not.toHaveBeenCalled();
});

it('resumes total shortfall with remaining chapter reservations and completes after useful expansion', async () => {
  const { MODES } = await utils();
  const rows = MODES.solo.chapters.map(chapter => ({ ...lengthCandidate(chapter, 650).chapter, lengthDraft: true }));
  docs[0].chapters = rows;
  docs[0].deliveryMeta = { savedChapters: rows, attempts: Object.fromEntries(MODES.solo.chapters.flatMap(chapter => [[chapter.id, 2], [`${chapter.id}:lengthRepair`, 1]])) };
  for (let wave = 0; wave < 5 && docs[0].status !== 'completed'; wave++) await generate();
  expect(docs[0].status).toBe('completed');
  expect(provider.mock.calls.length).toBeLessThanOrEqual(20);
  expect(refund).not.toHaveBeenCalled();
});


it('keeps draft markers in Mixed delivery metadata while strict chapter persistence stays compatible', async () => {
  provider.mockImplementationOnce(async (_env, { chapter }) => lengthCandidate(chapter, 650));
  expect((await generate()).status).toBe(202);
  expect(docs[0].chapters.every(row => !Object.hasOwn(row, 'lengthDraft'))).toBe(true);
  expect(docs[0].deliveryMeta.savedChapters[0].lengthDraft).toBe(true);
  const payload = await reopen();
  // S16: 초안 표식은 저장에만 남고, 완료 전 응답에는 본문이 없다.
  expect(payload.chapters).toEqual([]);
  expect(payload.generationProgress.validated).toBe(4);
});

for (const floor of ['paid body', 'legacy aggregate']) it(`keeps the independent ${floor} total floor after individual repair`, async () => {
  const { MODES } = await utils();
  const { countPaidReportBodyChars } = await import('../../worker/lib/paid-report-quality.js');
  const { diagnoseCodexSession } = await import('../../worker/routes/master-love-codex.js');
  const rows = MODES.solo.chapters.map(chapter => {
    const row = lengthCandidate(chapter, floor === 'paid body' ? 1000 : 1400).chapter;
    row.body = floor === 'paid body' ? Array.from(row.body).join(' ') : row.body.replace(/\s/g, '');
    return { ...row, chars: row.body.length, lengthDraft: true };
  });
  docs[0].chapters = rows;
  docs[0].deliveryMeta = { savedChapters: rows, attempts: Object.fromEntries(MODES.solo.chapters.flatMap(chapter => [[chapter.id, 3], [`${chapter.id}:lengthRepair`, 1]])) };
  const raw = rows.reduce((sum, row) => sum + row.body.length, 0);
  const body = countPaidReportBodyChars(rows.map(row => row.body).join('\n'));
  const legacy = MODES.solo.chapters.reduce((sum, chapter) => sum + Math.ceil(chapter.minChars * 0.5), 0);
  if (floor === 'paid body') { expect(raw).toBeGreaterThan(legacy); expect(body).toBeLessThan(20000); }
  else { expect(raw).toBeLessThan(legacy); expect(body).toBeGreaterThanOrEqual(20000); }
  expect(diagnoseCodexSession(docs[0]).exhausted).toHaveLength(0);
  expect((await generate()).status).toBe(200);
  expect(docs[0].status).toBe('completed');
  expect(provider).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled();
});

it('resumed waves retain the frozen question snapshot and bind checkpoints to its content hash', async () => {
 const consultation={version:'codex-consultation-v1',referenceDate:'2026-10-14',relationship:'reunion',questions:[{id:'q1',text:'다시 연락해도 될까요?',chapterOrder:15}],periods:[],years:[],records:[]};
 docs[0].consultation=consultation;
 docs[0].consultationHash='question-content-a';
 await generate();
 expect(provider).toHaveBeenCalled();
 const first=provider.mock.calls[0][1];
 expect(first.consultation).toEqual(consultation);
 const keyA=first.snapshotKey;
 const chapterId=first.chapter.id;
 docs[0].chapters=[];
 docs[0].deliveryMeta={};
 docs[0].generationProgress=null;
 docs[0].consultationHash='question-content-b';
 provider.mockClear();
 await generate();
 const next=provider.mock.calls.find(([,args])=>args.chapter.id===chapterId)[1];
 expect(next.consultation).toEqual(consultation);
 expect(next.snapshotKey).not.toBe(keyA);
 expect(refund).not.toHaveBeenCalled();
});

// S16 (2026-11-19): 완료 전 응답은 본문 0 · 완료 응답은 전 장 본문을 한 번에 싣는다.
it('withholds every body until completion, then delivers the whole book at once', async () => {
  for (let wave = 0; wave < 4; wave++) {
    const payload = await (await generate()).json();
    expect(payload.status).not.toBe('completed');
    expect(payload.chapters).toEqual([]);
    expect(payload.loveDna ?? null).toBe(null);
    expect((await reopen()).chapters).toEqual([]);
  }
  const done = await (await generate()).json();
  expect(done.status).toBe('completed');
  const { MODES } = await utils();
  const payload = await reopen();
  expect(payload.status).toBe('completed');
  expect(payload.chapters.map(row => row.id)).toEqual(MODES.solo.chapters.map(row => row.id));
  expect(payload.chapters.every(row => typeof row.body === 'string' && row.body.length > 0 && row.title)).toBe(true);
  expect(payload.generationProgress).toMatchObject({ validated: 20, finalized: 1, percent: 100 });
  expect(refund).not.toHaveBeenCalled();
});

// ─── R7 (2026-11-19) 다시 시도 먼저 ───────────────────────────────────────────
// 웹 결제의 최종 실패는 창(생성 + 7일) 안이면 환불하지 않고 다시 시도 보류로 둔다. 다시 시도는 결제 확인·차감 없이 열리고,
// 고객이 환불을 고르거나 창이 지나면 기존 환불 경로를 1회 돈다. 토스 네이티브는 기존대로 즉시 정산한다.
const post = (path, body = { sessionId: 'saved-codex' }) => route(new Request(`https://mock.test/api/master-love-codex/${path}`, { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), {}, { generateChapter: provider, refundPassCoverage: refund,
  runCoinRefund: refund, runMonthlyCreditRefund: refund, runPaymentCancel: refund });
async function holdOneChapter() {
  const { MODES } = await utils();
  const stuck = MODES.solo.chapters[1];
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (env, input) => input.chapter.id === stuck.id
    ? { status: 'fallback', failure: { code: 'LLM_QUALITY_FAILED', kind: 'quality' } } : normal(env, input));
  for (let wave = 0; wave < 6; wave++) await generate();
  const closed = await generate();
  provider.mockImplementation(normal);
  return { stuck, closed };
}

it('R7 holds a final failure inside the window for a free retry instead of refunding', async () => {
  docs[0].createdAt = new Date(Date.now() - 86400000);
  const { stuck, closed } = await holdOneChapter();
  expect(closed.status).toBe(503);
  const body = await closed.json();
  expect(body).toMatchObject({ status: 'generation_failed', retryable: false, reason: 'RETRY_AVAILABLE', chapters: [], loveDna: null,
    retry: { available: true, sessionId: 'saved-codex' } });
  expect(new Date(body.retry.refundAt).getTime()).toBe(docs[0].createdAt.getTime() + 7 * 86400000);
  expect(docs[0].status).toBe('generation_failed');
  expect(docs[0].deliveryMeta).toMatchObject({ reviewRequired: true, reviewReason: 'RETRY_AVAILABLE', exhaustedChapterIds: [stuck.id] });
  expect(refund).not.toHaveBeenCalled();
  const payload = await reopen();
  expect(payload).toMatchObject({ status: 'generation_failed', retryable: false, reason: 'RETRY_AVAILABLE', chapters: [], retry: { available: true } });
  const calls = provider.mock.calls.length;
  expect((await generate()).status).toBe(503);
  expect(provider).toHaveBeenCalledTimes(calls);
  expect(refund).not.toHaveBeenCalled();
});

it('R7 retry reopens the held book without payment, finishes it and keeps the refund deadline', async () => {
  docs[0].createdAt = new Date(Date.now() - 86400000);
  const { stuck } = await holdOneChapter();
  const refundAt = new Date(docs[0].deliveryMeta.retryable.refundAt).getTime();
  const reopened = await post('retry');
  expect(reopened.status).toBe(202);
  expect(await reopened.json()).toMatchObject({ ok: true, status: 'generating', retryable: true, accessToken: 'test-token' });
  expect(docs[0].status).toBe('generating');
  expect(docs[0].deliveryMeta.reviewRequired).toBe(false);
  expect(docs[0].deliveryMeta.reviewReason).toBeUndefined();
  expect(docs[0].deliveryMeta.attempts[stuck.id]).toBe(0);
  expect(docs[0].deliveryMeta.retryable.reopens).toBe(1);
  expect((await generate()).status).toBe(200);
  expect(docs[0].status).toBe('completed');
  expect(new Date(docs[0].deliveryMeta.retryable.refundAt).getTime()).toBe(refundAt);
  expect(refund).not.toHaveBeenCalled();
  expect(docs[0].paymentId).toBe('original-payment');
});

it('R7 refund request settles the hold once and closes retry', async () => {
  docs[0].createdAt = new Date(Date.now() - 86400000);
  await holdOneChapter();
  const requested = await post('refund-request');
  expect(requested.status).toBe(200);
  expect(await requested.json()).toMatchObject({ ok: true, sessionId: 'saved-codex' });
  expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
  expect(docs[0].deliveryMeta).toMatchObject({ reviewRequired: true, reviewReason: 'DELIVERY_FAILED' });
  expect(docs[0].deliveryMeta.retryable.refundRequestedAt).toBeTruthy();
  expect((await reopen()).reason).toBe('GENERATION_FAILED_REFUNDED');
  expect((await post('retry')).status).toBe(409);
  expect((await post('refund-request')).status).toBe(200);
  expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
  expect(docs[0].status).toBe('generation_failed');
});

it('R7 an expired window refunds on retry instead of reopening', async () => {
  docs[0].createdAt = new Date(Date.now() - 86400000);
  await holdOneChapter();
  docs[0].deliveryMeta.retryable.refundAt = new Date(Date.now() - 1000);
  const res = await post('retry');
  expect(res.status).toBe(409);
  expect((await res.json()).reason).toBe('RETRY_WINDOW_EXPIRED');
  expect(docs[0].status).toBe('generation_failed');
  expect(docs[0].deliveryMeta.reviewReason).toBe('DELIVERY_FAILED');
  expect(refund).toHaveBeenCalledTimes(REFUND_CHAIN);
});

it('R7 another owner cannot retry or request a refund, and a live book has nothing to retry', async () => {
  docs[0].createdAt = new Date(Date.now() - 86400000);
  expect((await post('retry')).status).toBe(409);
  expect((await post('refund-request')).status).toBe(409);
  await holdOneChapter();
  owner = 'other';
  expect((await post('retry')).status).toBe(404);
  expect((await post('refund-request')).status).toBe(404);
  owner = uid;
  expect(docs[0].deliveryMeta.reviewReason).toBe('RETRY_AVAILABLE');
  expect(refund).not.toHaveBeenCalled();
});

it('R7 a Toss native session keeps the immediate settlement path', async () => {
  const { settleCodexFinalFailure } = await utils();
  Object.assign(docs[0], { createdAt: new Date(), deliveryMeta: { tossIntentId: 'toss-intent' }, generationProgress: { lockToken: 'held' } });
  const settled = await settleCodexFinalFailure({}, { sessionId: 'saved-codex', userId: uid, filter: { id: 'saved-codex', userId: uid },
    doc: docs[0], reason: 'SERVICE_GENERATION_FAILED', exhaustedChapterIds: [], dependencies: { refundPassCoverage: refund,
      runCoinRefund: refund, runMonthlyCreditRefund: refund, runPaymentCancel: refund } });
  expect(settled.held).toBeFalsy();
  expect(docs[0].deliveryMeta.reviewReason).toBe('DELIVERY_FAILED');
  expect(docs[0].deliveryMeta.retryable).toBeUndefined();
});

// Trait-First(2026-11-22 게이트 B): 세션에 저장된 값만 따르고, 개인판 1장(gate)에 사실만 넣는다.
describe('Trait-First (TRAIT_FIRST_SAJU)', () => {
  it('old sessions without the key stay off; a pinned session forwards v1 and a per-user seed', async () => {
    expect((await generate()).status).toBe(202);
    expect(provider.mock.calls.length).toBeGreaterThan(0);
    expect(provider.mock.calls.every(([, input]) => !('traitFirst' in input))).toBe(true);
    provider.mockClear();
    Object.assign(docs[0], { chapters: [], status: 'generating', deliveryMeta: { traitFirst: 'v1' } });
    expect((await generate()).status).toBe(202);
    expect(provider.mock.calls.every(([, input]) => input.traitFirst === 'v1' && input.traitSeed === `${uid}|master-love-codex`)).toBe(true);
  });
  it('fact lines go to the solo gate chapter only, without the usage-rule line, and never for approved saju or other locales', async () => {
    const { codexTraitFacts } = await import('../../worker/routes/master-love-codex.js');
    const solo = await import('../../worker/lib/master-love-codex-prompt.mjs');
    const { calculateLifeBookAiSaju } = await import('../../worker/lib/life-book-ai-saju.js');
    const saju = calculateLifeBookAiSaju({ birthDate: '1990-05-12', birthTime: '09:30', gender: 'female', calendarType: 'solar' }, { year: 2026 });
    const on = { traitFirst: 'v1', traitSeed: 'u|master-love-codex', locale: 'ko' };
    for (const chapter of solo.MASTER_LOVE_CODEX_CHAPTERS_V2) {
      const base = solo.buildMasterLoveCodexChapterPrompt({ saju, ziweiChart: {}, birthInfo: {}, chapter, evidenceProvided: true });
      expect(solo.buildMasterLoveCodexChapterPrompt({ saju, ziweiChart: {}, birthInfo: {}, chapter, evidenceProvided: true, traitFacts: [] })).toBe(base);
      const facts = codexTraitFacts(saju, chapter, on);
      if (chapter.id !== 'gate') { expect(facts).toEqual([]); continue; }
      expect(facts[0]).toBe('[타고난 성향 핵심 근거]');
      expect(facts.some(line => line.startsWith('사용 규칙:'))).toBe(false);
      const withFacts = solo.buildMasterLoveCodexChapterPrompt({ saju, ziweiChart: {}, birthInfo: {}, chapter, evidenceProvided: true, traitFacts: facts });
      expect(withFacts.replace(`\n${facts.filter(Boolean).join('\n')}`, '')).toBe(base);
    }
    const gate = solo.MASTER_LOVE_CODEX_CHAPTERS_V2.find(chapter => chapter.id === 'gate');
    expect(codexTraitFacts(saju, gate, { ...on, traitFirst: null })).toEqual([]);
    expect(codexTraitFacts(saju, gate, { ...on, locale: 'en' })).toEqual([]);
    expect(codexTraitFacts({ ...saju, approvedSaju: { gyeokguk: '정관격' } }, gate, on)).toEqual([]);
  });
});
