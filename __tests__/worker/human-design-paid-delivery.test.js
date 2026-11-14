/** @jest-environment node */
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let validate,closed,docs,fault,lostConfirmation,route,provider,refund,owner,fetchBlock,revokedSource,specs;
const uid='64b7f2a1c3d4e5f601234567';
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
    if (doc) { assign(doc, { ...update.$set, updatedAt: new Date() }); if(update.$inc) for(const [key,value] of Object.entries(update.$inc)) doc[key]=(doc[key]||0)+value; }
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    if (fault && (fault.status ? update.$set.status === fault.status : update.$set.sections?.filter(row=>row.status==='ok').length === fault.count)) {
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
 const db=await import('../../worker/lib/db.js');const auth=await import('../../worker/lib/auth.js');const models=await import('../../worker/lib/models.js');const contract=await import('../../worker/lib/human-design-report-contract.js');specs=contract.HD_REPORT_SECTIONS;
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_e,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId:owner})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,HumanDesignReport:model,
 PaidExecutionRecord:{findOne:()=>query(revokedSource===0?{}:null)},Payment:{findOne:()=>query(revokedSource===1?{}:null)},PointHistory:{findOne:()=>query(revokedSource===2?{}:null)},MonthlyCreditLedger:{findOne:()=>query(revokedSource===3?{}:null)}}));
 jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({callGeminiJsonWithRetry:(...args)=>provider(...args)}));
 jest.unstable_mockModule('../../worker/lib/service-execution-task.js',()=>({startServiceExecution:async()=>({}),completeServiceExecution:async()=>{closed++;return{}},failServiceExecution:(...args)=>refund(...args)}));
 jest.unstable_mockModule('../../worker/lib/llm-cache-store.js',()=>({createLlmCacheStore:()=>null}));
 jest.unstable_mockModule('../../worker/lib/human-design-report-contract.js',()=>({...contract,requiredSubsectionIds:()=>[],validateHumanDesignReportSection:(...args)=>validate(...args)}));
 jest.unstable_mockModule('../../worker/lib/human-design-report-prompt.js',()=>({HD_REPORT_SECTION_TITLES:{},buildHumanDesignReportSectionPrompt:({spec})=>({prompt:spec.key,systemPrompt:'fixture'}),sectionDigest:()=>''}));
 ({handleHumanDesignReportRoutes:route}=await import('../../worker/routes/human-design-report.js'));
});
beforeEach(()=>{validate=()=>({ok:true,issues:[],keptSubsections:[],evidence:[]});closed=0;owner=uid;fault=null;lostConfirmation=false;revokedSource=-1;refund=jest.fn(async()=>({}));
 docs=[{id:'saved-hd',userId:uid,idempotencyKey:'original-request',billingRequestId:'original-request',status:'generating',locale:'ko',waveCount:0,lock:null,basis:{snapshot:{type:'Generator'},allowed:{all:[]}},sections:specs.map(spec=>({key:spec.key,order:spec.order,body:'',status:'pending',attempts:0}))}];
 provider=jest.fn(async(_env,key,options)=>{expect(options.attempts).toBe(1);expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);const spec=specs.find(row=>row.key===key);let body='';for(let i=0;body.replace(/\s/g,'').length<spec.minChars+100;i++)body+=`${key}의 ${i}번째 계산 근거와 생활 선택을 살펴보며 반대 조건과 구체적인 행동을 함께 설명합니다.\n`;return{ok:true,text:JSON.stringify({body,keyPoints:[]})}});
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
async function generate(extra={}){return route(new Request('https://mock.test/api/human-design-report/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:'saved-hd',...extra})}),{})}
for(const outcome of ['empty','completed','storage-failure'])it(`Toss plan 2 ${outcome} retains native proof and never enters web settlement`,async()=>{
 const {bindNativeTossRequest}=await import('../../worker/toss/native-context.js');
 const assertStored=jest.fn(async doc=>{expect(doc.accessSource).toBe('toss');expect(doc.paymentId).toBe('native-order');});
 Object.assign(docs[0],{deliveryPlanVersion:2,accessSource:'toss',paymentId:'native-order',waveCount:40});
 if(outcome!=='empty')docs[0].sections.forEach(row=>Object.assign(row,{body:row.key+' 저장한 본문입니다.',status:'ok'}));
 if(outcome==='storage-failure')fault={status:'completed',kind:'throw'};
 const call=async()=>{const request=new Request('https://mock.test/api/human-design-report/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:'saved-hd'})});bindNativeTossRequest(request,{auth:{userId:uid},assertStored});return route(request,{});};
 const response=await call();
 expect(response.status).toBe(outcome==='completed'?200:503);
 expect(refund).not.toHaveBeenCalled();expect(closed).toBe(0);expect(provider).not.toHaveBeenCalled();
 expect(assertStored).toHaveBeenCalled();expect(docs[0].lock).toBe(null);
 if(outcome==='empty')expect(docs[0].generationError.refunded).not.toBe(true);
 if(outcome==='storage-failure'){expect((await call()).status).toBe(200);expect(refund).not.toHaveBeenCalled();expect(closed).toBe(0);expect(provider).not.toHaveBeenCalled();}
});
for(const accessType of ['pass','membership_credit','paid'])it(`${accessType} saves 18 units in five requests`,async()=>{docs[0].accessType=accessType;for(let i=0;i<5;i++)expect((await generate()).status).toBe(i<4?202:200);expect(docs[0].status).toBe('completed');expect(docs[0].totalChars).toBeGreaterThanOrEqual(7400);expect(provider).toHaveBeenCalledTimes(18);expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(18);expect(refund).not.toHaveBeenCalled()});
for(const status of ['delivery_pending','completed'])for(const kind of ['throw','null','confirm'])it(`${status} ${kind} never refunds or regenerates`,async()=>{for(let i=0;i<4;i++)await generate();fault={status,kind};const res=await generate();expect(res.status).toBe(503);expect(await res.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',resultId:'saved-hd',retryable:true});expect(refund).not.toHaveBeenCalled();expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(18)});
it('checkpoint failure preserves later siblings',async()=>{fault={count:1,kind:'throw'};expect((await generate()).status).toBe(503);expect(docs[0].sections.filter(row=>row.status==='ok')).toHaveLength(3);expect(refund).not.toHaveBeenCalled();for(let i=0;i<5;i++)await generate();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(19)});
for(const source of [0,1,2,3])it(`refunded source ${source} cannot resume`,async()=>{revokedSource=source;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('another account cannot resume',async()=>{owner='other';expect((await generate()).status).toBe(404);expect(provider).not.toHaveBeenCalled()});
it('concurrent requests hold the lease through checkpointing',async()=>{const result=await Promise.all([generate(),generate()]);expect(result.map(r=>r.status).sort()).toEqual([202,409]);expect(provider).toHaveBeenCalledTimes(4)});
it('GET does not refund a stale stored report',async()=>{docs[0].updatedAt=new Date(0);const res=await route(new Request('https://mock.test/api/human-design-report/result?reportId=saved-hd'),{});expect(res.status).toBe(202);expect(docs[0].status).toBe('generating');expect(refund).not.toHaveBeenCalled()});
it('historical completed body remains available without new length checks',async()=>{docs[0].status='completed';docs[0].sections=[];expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled()});

it('lost checkpoint confirmation preserves the written chapter and all siblings',async()=>{fault={count:1,kind:'confirm'};expect((await generate()).status).toBe(503);expect(docs[0].sections.filter(row=>row.status==='ok')).toHaveLength(4);for(let i=0;i<4;i++)await generate();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(18);expect(refund).not.toHaveBeenCalled()});
it('known empty failures exhaust the bounded budget and retain the existing refund policy',async()=>{provider.mockImplementation(async()=>({ok:false}));docs[0].waveCount=40;expect((await generate()).status).toBe(503);expect(docs[0].status).toBe('generation_failed');expect(refund).toHaveBeenCalledTimes(1);expect(docs[0].generationError.refunded).toBe(true);expect(provider).not.toHaveBeenCalled()});
it('unknown interrupted calls at the wave cap never turn into generation refunds',async()=>{docs[0].waveCount=40;docs[0].llmMeta={waveInFlight:true};const res=await generate();expect(res.status).toBe(503);expect(await res.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE'});expect(docs[0].status).toBe('generating');expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled()});
it('short outputs cannot complete even when the schema validator accepts them',async()=>{provider.mockImplementation(async()=>({ok:true,text:JSON.stringify({body:'짧은 본문',keyPoints:[]})}));await generate();expect(docs[0].sections.filter(row=>row.status==='ok')).toHaveLength(0);expect(docs[0].status).not.toBe('completed');expect(refund).not.toHaveBeenCalled()});

for (const repair of ['shorter', 'empty', 'repeated']) it(`HD ${repair} repair preserves its valid short draft`, async () => {
  const base = provider.getMockImplementation(); let calls = 0;
  provider.mockImplementation(async (...args) => {
    if (args[1] !== specs[0].key) return base(...args);
    calls++;
    const body = calls === 1 ? '생활에서 선택을 관찰하고 그 의미를 차분히 돌아봅니다. 반복되는 상황을 기록하고 다른 조건에서는 어떤 선택이 나을지 비교해 보세요.'
      : repair === 'shorter' ? '선택을 관찰합니다.' : repair === 'empty' ? ''
      : '생활에서 선택을 관찰하고 그 의미를 차분히 돌아보며 반복되는 상황을 기록합니다. '.repeat(80);
    return { ok: true, text: JSON.stringify({ body, keyPoints: [] }) };
  });
  await generate(); const draft = docs[0].sections[0].body;
  for (let i = 0; i < 8 && docs[0].status !== 'completed'; i++) await generate();
  expect(docs[0].status).toBe('completed'); expect(calls).toBe(1);
  expect(docs[0].sections[0].body).toBe(draft); expect(refund).not.toHaveBeenCalled();
});
it('HD reserved length repair completes from its saved draft after interruption', async () => {
  for (let i = 0; i < 5; i++) await generate();
  docs[0].status = 'generating'; docs[0].sections[0] = { ...docs[0].sections[0], body: '의미 있는 선택을 관찰합니다. 주변의 기대와 자신의 필요를 구분하고 작은 행동을 통해 편안한 방향을 찾아보세요.', status: 'degraded', issues: ['body_minimum_not_met'], attempts: 2, lengthRepair: true };
  provider.mockClear(); expect((await generate()).status).toBe(200); expect(provider).not.toHaveBeenCalled();
});
it('HD completes all usable sections without a total-length repair', async () => {
  provider.mockImplementation(async (_env, key) => ({ ok: true, text: JSON.stringify({ body: `${key} 의미 있는 선택을 관찰합니다. ${key} 주변의 기대와 자신의 필요를 구분하세요. ${key} 작은 행동을 통해 편안한 방향을 찾아보세요.`, keyPoints: [] }) }));
  for (let i = 0; i < 12; i++) await generate();
  expect(docs[0].status).toBe('completed');
  expect(Math.max(...docs[0].sections.map(row => row.attempts))).toBeLessThanOrEqual(2);
});

it('HD accepts a usable short response within two attempts', async () => {
  for (let i = 0; i < 5; i++) await generate();
  docs[0].status = 'generating'; docs[0].sections[0] = { ...docs[0].sections[0], body: '', status: 'pending', issues: ['ai_unavailable'], attempts: 1 };
  provider.mockClear(); provider.mockImplementation(async () => ({ ok: true, text: JSON.stringify({ body: '삶에서 선택의 의미를 돌아보고 작은 행동으로 확인합니다. 다른 사람의 속도에 맞추기 전에 자신의 필요와 감정을 정리해 보세요.', keyPoints: [] }) }));
  expect((await generate()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(1);
  expect(docs[0].sections[0].attempts).toBe(2);
});

it('quality resume cannot reset a spent chapter budget',async()=>{
 docs[0].status='partial';docs[0].sections.forEach(row=>row.attempts=2);
 await generate({resumeQuality:true});expect(provider).not.toHaveBeenCalled();expect(docs[0].sections.every(row=>row.attempts===2)).toBe(true);
});
it('server completes the saved report without browser authentication or another purchase',async()=>{
 await generate();const {resumeConsultationOnServer}=await import('../../worker/routes/human-design-report.js');
 for(let i=0;i<5&&docs[0].status!=='completed';i++)await resumeConsultationOnServer({},docs[0]);
 expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(18);expect(refund).not.toHaveBeenCalled();
});
it('human design delivers a result at the new target',async()=>{
 const {HD_REPORT_TARGET_CHARS,HD_REPORT_DELIVER_MIN_TOTAL_CHARS}=await import('../../worker/lib/human-design-report-contract.js');
 expect(HD_REPORT_TARGET_CHARS).toBe(12000);expect(HD_REPORT_DELIVER_MIN_TOTAL_CHARS).toBeLessThan(12000);
 const total=specs.reduce((sum,spec)=>sum+Math.ceil(spec.minChars/0.8),0);expect(total).toBeGreaterThanOrEqual(12000);expect(total).toBeLessThan(12600);
 provider.mockImplementation(async(_env,key)=>{const spec=specs.find(row=>row.key===key);let body='';for(let i=0;body.replace(/\s/g,'').length<Math.ceil(spec.minChars/0.8);i++)body+=`${key}의 ${i}번째 계산 근거와 생활 선택을 살펴보며 반대 조건과 구체적인 행동을 함께 설명합니다.\n`;return{ok:true,text:JSON.stringify({body,keyPoints:[]})}});
 for(let i=0;i<5;i++)await generate();
 expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(18);expect(refund).not.toHaveBeenCalled();
});

describe('delivery plan 2 (new sessions only)', () => {
  const v2 = () => { docs[0].deliveryPlanVersion = 2; docs[0].lengthRepairsUsed = 0; };
  async function drive(max = 20) { for (let i = 0; i < max && !['completed', 'generation_failed'].includes(docs[0].status); i++) await generate(); }
  const bodyOf = key => docs[0].sections.find(row => row.key === key).body;

  it('a section whose last attempt still fails validation is scrubbed and delivered, not paused', async () => {
    v2();
    docs[0].basis.snapshot = { type: 'Generator', profile: '1/3', channels: [] }; docs[0].basis.allowed = { all: [], openCenters: [] };
    const base = provider.getMockImplementation();
    provider.mockImplementation(async (...args) => {
      const out = await base(...args); if (args[1] !== 'type') return out;
      const parsed = JSON.parse(out.text); parsed.body = `${parsed.body}당신의 프로파일은 3/5 라서 실험이 많습니다.\n`; return { ok: true, text: JSON.stringify(parsed) };
    });
    validate = (payload, options) => options.spec.key === 'type' ? { ok: false, issues: ['foreign_profile:3/5'], keptSubsections: [], evidence: [] } : { ok: true, issues: [], keptSubsections: [], evidence: [] };
    await drive();
    expect(docs[0].status).toBe('completed'); expect(docs[0].degraded).toBe(true);
    expect(bodyOf('type')).not.toContain('3/5'); expect(bodyOf('type').length).toBeGreaterThan(200);
    expect(refund).not.toHaveBeenCalled(); expect(closed).toBe(1);
  });

  it('a section with no text after its attempts gets one rescue call, then the rest is delivered', async () => {
    v2(); const base = provider.getMockImplementation();
    provider.mockImplementation(async (...args) => args[1] === 'channels' ? { ok: false, error: 'timeout' } : base(...args));
    await drive();
    expect(docs[0].status).toBe('completed'); expect(docs[0].degraded).toBe(true);
    expect(provider.mock.calls.filter(call => call[1] === 'channels')).toHaveLength(3);
    expect(docs[0].sections.filter(row => row.body).length).toBe(17);
    expect(refund).not.toHaveBeenCalled(); expect(closed).toBe(1);
  });

  it('refunds only when every section is empty', async () => {
    v2(); provider.mockImplementation(async () => ({ ok: false, error: 'down' }));
    await drive(30);
    expect(docs[0].status).toBe('generation_failed'); expect(refund).toHaveBeenCalledTimes(1); expect(closed).toBe(0);
  });

  it('short but readable sections are delivered (V1 would refund below the 400-char floor)', async () => {
    v2(); provider.mockImplementation(async (_e, key) => ({ ok: true, text: JSON.stringify({ body: `${key} 오늘 선택을 천천히 관찰하고 작은 행동으로 확인해 보세요. 마음이 편한 쪽을 고르세요.`, keyPoints: [] }) }));
    await drive(30);
    expect(docs[0].status).toBe('completed'); expect(docs[0].sections.every(row => row.body)).toBe(true);
    expect(refund).not.toHaveBeenCalled(); expect(closed).toBe(1);
  });

  it('length repair runs only for sections below the floor, shortest first, at most four per report', async () => {
    v2(); const base = provider.getMockImplementation(); const shortKeys = ['type', 'profile', 'channels', 'lifeWork', 'lifeSelf', 'practicalGuide'];
    const shortBody = (key, n) => `${key} ${'선택을 관찰하고 작은 행동으로 확인해 보세요. '.repeat(n)}`;
    provider.mockImplementation(async (...args) => {
      const key = args[1]; if (!shortKeys.includes(key)) return base(...args);
      const prior = docs[0].sections.find(row => row.key === key);
      if (prior.attempts > 1) return base(...args);
      return { ok: true, text: JSON.stringify({ body: shortBody(key, 3 + shortKeys.indexOf(key)), keyPoints: [] }) };
    });
    await drive(30);
    expect(docs[0].status).toBe('completed');
    const repaired = provider.mock.calls.map(call => call[1]).filter((key, i, all) => all.indexOf(key) !== i);
    expect(repaired.sort()).toEqual(['channels', 'profile', 'type', 'lifeWork'].sort());
    expect(provider).toHaveBeenCalledTimes(22); expect(docs[0].lengthRepairsUsed).toBe(4);
    expect(refund).not.toHaveBeenCalled();
  });

  it('a sentence repeated across accepted sections is removed instead of blocking completion', async () => {
    v2(); const base = provider.getMockImplementation(); const shared = '반복되는 이 문장은 모든 장에 똑같이 들어가 완성을 막던 바로 그 문장입니다.';
    provider.mockImplementation(async (...args) => { const out = JSON.parse((await base(...args)).text); out.body = `${shared}\n${out.body}`; return { ok: true, text: JSON.stringify(out) }; });
    await drive();
    expect(docs[0].status).toBe('completed');
    expect(docs[0].sections.filter(row => row.body.includes(shared))).toHaveLength(1);
    expect(refund).not.toHaveBeenCalled();
  });
});
