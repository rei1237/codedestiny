/** @jest-environment node */
import { jest } from '@jest/globals';
let docs, fault, lostConfirmation, route, provider, refund, owner, blocked, fetchBlock, revokedSource;
const uid='64b7f2a1c3d4e5f601234567';
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
    return{matchedCount:doc?1:0};
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
async function generate(extra = {}){return route(new Request('https://mock.test/api/master-love-codex/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:'saved-codex'})}),{},{generateChapter:provider,refundPassCoverage:refund,runCoinRefund:refund,runMonthlyCreditRefund:refund,runPaymentCancel:refund,...extra})}
for(const accessType of ['pass','monthly_credit','paid'])it(`${accessType} completes five bounded waves with original evidence`,async()=>{docs[0].accessType=accessType;for(let i=0;i<5;i++)expect((await generate()).status).toBe(i<4?202:200);expect(provider).toHaveBeenCalledTimes(20);expect(docs[0].status).toBe('completed');expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(20);expect(refund).not.toHaveBeenCalled()});
for(const status of ['delivery_pending','completed'])for(const kind of ['throw','null','confirm'])it(`${status} ${kind} preserves generated book`,async()=>{for(let i=0;i<4;i++)await generate();fault={status,kind};const res=await generate();expect(res.status).toBe(503);expect(await res.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true,resultId:'saved-codex'});expect(refund).not.toHaveBeenCalled();expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(20)});
it('saves siblings after the first chapter fails',async()=>{provider.mockImplementationOnce(async()=>({status:'fallback'}));expect((await generate()).status).toBe(202);expect(docs[0].chapters).toHaveLength(0);expect(docs[0].deliveryMeta.savedChapters).toHaveLength(3);for(let i=0;i<5;i++)await generate();expect(provider).toHaveBeenCalledTimes(21);expect(docs[0].chapters).toHaveLength(20);expect(refund).not.toHaveBeenCalled()});
it('checkpoint exception does not refund and siblings remain saved',async()=>{fault={count:1,kind:'throw'};expect((await generate()).status).toBe(503);expect(docs[0].deliveryMeta.savedChapters).toHaveLength(4);expect(refund).not.toHaveBeenCalled();for(let i=0;i<4;i++)await generate();expect(provider).toHaveBeenCalledTimes(20)});
it('another owner and refunded payment cannot generate',async()=>{owner='other';expect((await generate()).status).toBe(404);owner=uid;blocked=true;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('refunded pass or monthly balance cannot be reused',async()=>{for(const field of ['passRefund','billingRefund']){docs[0][field]={refundedAt:new Date()};expect((await generate()).status).toBe(402);delete docs[0][field]}expect(provider).not.toHaveBeenCalled()});
it('concurrent requests cannot generate the same chapters twice',async()=>{const results=await Promise.all([generate(),generate()]);expect(results.map(r=>r.status).sort()).toEqual([202,409]);expect(provider).toHaveBeenCalledTimes(4)});
it('legacy completed books remain readable without new quality checks',async()=>{docs[0].status='completed';docs[0].chapters=[{id:'old',body:'과거 구매 결과',ok:true}];expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled()});

for(const source of [0,1,2])it(`rejects refunded execution or balance ledger ${source}`,async()=>{revokedSource=source;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('uncertain exhausted calls do not trigger more LLM or a refund',async()=>{await generate();const ids=docs[0].deliveryMeta.savedChapters.map(row=>row.id);const {__masterLoveCodexTestUtils:utils}=await import('../../worker/routes/master-love-codex.js');const next=utils.MODES.solo.chapters.find(row=>!ids.includes(row.id));docs[0].deliveryMeta.attempts[next.id]=3;expect((await generate()).status).toBe(503);expect(provider).toHaveBeenCalledTimes(4);expect(refund).not.toHaveBeenCalled()});

for (const state of ['retryable', 'deferred']) it(`${state} confirmed refusals preserve the same paid book past three waves with durable backoff`, async () => {
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

it('public progress counts saved siblings without publishing an out-of-order book', async () => {
  provider.mockImplementationOnce(async () => ({ status: 'fallback' }));
  const payload = await (await generate()).json();
  expect(payload.chapters).toHaveLength(0);
  expect(payload.generationProgress).toEqual({ completed: 3, readable: 0, total: 20 });
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
  expect(payload.generationProgress).toMatchObject({ completed: 3, readable: 1 });
  await generate();
  expect(provider.mock.calls.find(([, input], index) => index >= 4 && input.chapter.order === 2)[1].previousError).toBe('LLM_OUTPUT_TRUNCATED');
  expect(provider.mock.calls.filter(([, input]) => input.chapter.order === 3)).toHaveLength(1);
});

it('ambiguous provider timeouts spend the shared budget and stop without refund', async () => {
  provider.mockImplementation(async () => ({ status: 'retryable', failure: { code: 'LLM_TIMEOUT_UNCERTAIN', kind: 'uncertain' } }));
  for (let wave = 0; wave < 3; wave++) { await generate(); docs[0].deliveryMeta.nextAttemptAt = null; }
  const payload = await (await generate()).json();
  expect(payload.retryable).toBe(false); expect(payload.reason).toBe('GENERATION_BUDGET_EXCEEDED');
  await generate(); expect(provider).toHaveBeenCalledTimes(12); expect(refund).not.toHaveBeenCalled();
});

it('expired batch lock resumes without repeating accepted chapters', async () => {
  await generate(); docs[0].generationProgress.lockedAt = new Date(Date.now() - 120001);
  docs[0].generationProgress.lockToken = 'dead-document';
  expect((await generate()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(8);
});

it('a validated stable cache resolves uncertain exhausted storage without another chapter call', async () => {
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
  docs[0].deliveryMeta = { attempts: { [chapter.id]: 3 } };
  const chapterSnapshotStore = { get: jest.fn(async () => ({ text: JSON.stringify({ parsed, chapter: { id: chapter.id, body: 'untrusted copy' } }) })) };
  expect((await generate({ chapterSnapshotStore })).status).toBe(202);
  expect(provider).toHaveBeenCalledTimes(4);
  expect(provider.mock.calls.some(([, input]) => input.chapter.id === chapter.id)).toBe(false);
  expect(docs[0].chapters[0].body).toBe(parsed.body.trim());
  expect(docs[0].deliveryMeta.reviewRequired).not.toBe(true); expect(refund).not.toHaveBeenCalled();
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
  expect(payload.generationProgress).toEqual({ completed: 1, readable: 1, total: 20 }); expect(payload.chapters).toHaveLength(1);
});
