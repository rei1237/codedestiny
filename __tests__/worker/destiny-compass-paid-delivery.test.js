/** @jest-environment node */
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let docs,fault,lostConfirmation,route,provider,refund,owner,fetchBlock,revokedSource,specs,access,complete,realContract;
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
    if (fault && (fault.status || fault.chapterCount) && fault.kind !== "usage" && (fault.chapterCount ? update.$set.sections?.length === fault.chapterCount : update.$set?.status === fault.status)) {
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
    if (fault && (fault.status ? update.$set?.status === fault.status : update.$set.sections?.filter(row=>row.status==='ok').length === fault.count)) {
      const value=fault; fault=null;
      if(value.kind==='throw') throw new Error('storage unavailable');
      if(value.kind==='null') return null;
      if(value.kind==='confirm') lostConfirmation=true;
    }
    let doc=docs.find(row=>matches(row,filter));
    if(!doc && update.$setOnInsert) { doc=clone(update.$setOnInsert); docs.push(doc); return{upsertedCount:1}; }
    if(doc && update.$set) assign(doc,update.$set);
    return{matchedCount:doc?1:0};
  },
};



beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'); const auth=await import('../../worker/lib/auth.js'); const models=await import('../../worker/lib/models.js'); const contract=await import('../../worker/lib/destiny-compass-report-contract.js'); specs=contract.COMPASS_SECTIONS;realContract=contract;
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId:owner})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,DestinyCompassReport:model,
 PaidExecutionRecord:{findOne:()=>query(revokedSource===0?{}:null)},Payment:{findOne:()=>query(revokedSource===1?{}:null)},PointHistory:{findOne:()=>query(revokedSource===2?{}:null)},MonthlyCreditLedger:{findOne:()=>query(revokedSource===3?{}:null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:(...args)=>provider(...args)}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:(...args)=>access(...args)}));
 jest.unstable_mockModule('../../worker/lib/service-execution-task.js',()=>({startServiceExecution:async()=>({execution:{}}),completeServiceExecution:(...args)=>complete(...args),failServiceExecution:(...args)=>refund(...args)}));
 jest.unstable_mockModule('../../worker/lib/llm-cache-store.js',()=>({createLlmCacheStore:()=>null}));
 jest.unstable_mockModule('../../worker/lib/cms-prompts.js',()=>({cmsPromptText:(_env,_key,value)=>value}));
 jest.unstable_mockModule('../../worker/lib/destiny-compass-report-contract.js',()=>({...contract,buildCompassSectionPrompt:({spec})=>spec.key,validateCompassSection:()=>[],buildAllowedLabels:()=>[],buildCompassBasisPayload:()=>({}),computeSystemStars:()=>[],resolveGrounds:()=>[],splitGroundsLine:text=>({body:text,evidenceIds:[]})}));
 ({handleDestinyCompassAiRoutes:route}=await import('../../worker/routes/destiny-compass-ai.js'));
});
const requestInput=()=>({idempotencyKey:'original-request',requestId:'original-request',transactionId:'original-receipt',question:'생활의 선택',emotion:'calm',field:{seed:'sensitive-seed',primary:{key:'career',score:60,band:'steady'},directions:[]},evidencePack:{systems:[{system:'saju',items:[{id:'saju.dayMaster',term:'일간',detail:'갑'}]},
  // 체계 섹션(사주·자미·숙요·타로)의 근거는 다 있어야 한다 — 하나라도 비면 라우트가 생성 전에 끊는다.
  {system:'ziwei',items:[{id:'ziwei.ming',term:'명궁',detail:'자미'}]},{system:'sukuyo',items:[{id:'sukuyo.mansion',term:'본명숙',detail:'각수'}]},
  {system:'tarot',items:[{id:'tarot.card',term:'태양',detail:'정위'}]},{system:'vedic',items:[{id:'vedic.vara',term:'바라',detail:'수요일'}]}]}});
beforeEach(()=>{owner=uid;fault=null;lostConfirmation=false;revokedSource=-1;refund=jest.fn(async()=>({ok:true}));complete=jest.fn(async()=>({}));access=jest.fn(async()=>({ok:true,accessType:'pass',matchedTransactionId:'original-receipt'}));
 docs=[{id:'saved-compass',userId:uid,idempotencyKey:'original-request',status:'generating',lock:null,sections:[],llmMeta:{attempts:{},failures:{}},...requestInput()}];
 provider=jest.fn(async(_env,key,options)=>{expect(options.timeoutMs).toBe(42000);expect(options.fallbackToWorkersAI).toBe(false);const spec=specs.find(row=>row.key===key);let text='';for(let i=0;text.replace(/\s/g,'').length<spec.minChars+100;i++)text+=`${key}의 ${i}번째 계산 근거와 생활 선택을 살펴보며 반대 조건과 구체적인 행동을 함께 설명합니다.\n`;return{ok:true,text}});
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
async function generate(){return route(new Request('https://mock.test/api/destiny-compass-ai/report/continue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:'saved-compass'})}),{})}
for(const accessType of ['pass','membership_credit','paid'])it(`${accessType} delivers ten sections in three bounded requests`,async()=>{docs[0].accessType=accessType;for(let i=0;i<3;i++)expect((await generate()).status).toBe(i<2?202:200);expect(provider).toHaveBeenCalledTimes(10);expect(complete).toHaveBeenCalledTimes(1);expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(10);expect(access).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled()});
for(const status of ['delivery_pending','completed'])for(const kind of ['throw','null','confirm'])it(`${status} ${kind} reuses all saved text`,async()=>{await generate();await generate();fault={status,kind};const response=await generate();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',resultId:'saved-compass'});expect(refund).not.toHaveBeenCalled();expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(10)});
for(const kind of ['throw','confirm'])it(`checkpoint ${kind} preserves siblings`,async()=>{fault={count:1,kind};expect((await generate()).status).toBe(503);expect(docs[0].sections.filter(row=>row.status==='ok')).toHaveLength(4);await generate();await generate();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(10)});
for(const source of [0,1,2,3])it(`revoked source ${source} is denied`,async()=>{revokedSource=source;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('other account cannot read or resume',async()=>{owner='other';expect((await generate()).status).toBe(404);expect(provider).not.toHaveBeenCalled()});
it('concurrent generation is locked',async()=>{const responses=await Promise.all([generate(),generate()]);expect(responses.map(row=>row.status).sort()).toEqual([202,409]);expect(provider).toHaveBeenCalledTimes(4)});
it('unknown exhausted attempts never refund or generate',async()=>{docs[0].llmMeta.attempts={[specs[0].key]:3};const response=await generate();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE'});expect(refund).not.toHaveBeenCalled();expect(provider).not.toHaveBeenCalled()});
it('short results remain partial and complete bookkeeping never runs',async()=>{provider.mockImplementation(async()=>({ok:true,text:'짧은 본문'}));expect((await generate()).status).toBe(202);expect(docs[0].sections.every(row=>row.status==='degraded')).toBe(true);expect(complete).not.toHaveBeenCalled()});
it('new request is seeded before provider work and reused before another access check',async()=>{docs=[];const req=()=>new Request('https://mock.test/api/destiny-compass-ai/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestInput())});expect((await route(req(),{})).status).toBe(202);expect(docs[0].field.seed).not.toBe('sensitive-seed');expect(docs[0].llmMeta.requestId).toBe('original-request');expect((await route(req(),{})).status).toBe(202);expect(access).toHaveBeenCalledTimes(1);expect(provider).toHaveBeenCalledTimes(8)});
it('historical completion bypasses new quality limits',async()=>{docs[0].status='completed';expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled()});

it('null initial storage never starts a provider call',async()=>{docs=[];const original=model.updateOne;model.updateOne=async()=>null;try{const response=await route(new Request('https://mock.test/api/destiny-compass-ai/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestInput())}),{});expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE'});expect(provider).not.toHaveBeenCalled()}finally{model.updateOne=original}});
it('completion bookkeeping failure does not hide the saved result',async()=>{complete.mockRejectedValueOnce(Error('bookkeeping offline'));await generate();await generate();expect((await generate()).status).toBe(200);expect(docs[0].status).toBe('completed');expect(refund).not.toHaveBeenCalled()});
it('known empty failures use the original bounded failure refund',async()=>{docs[0].llmMeta={attempts:{[specs[0].key]:3},failures:{[specs[0].key]:3}};expect((await generate()).status).toBe(503);expect(refund).toHaveBeenCalledTimes(1);expect(provider).not.toHaveBeenCalled()});
function p3Text(key, size) { return key + Array.from({ length: size - key.length }, (_, i) => String.fromCharCode(0xac00 + i % 11172)).join(''); }
for (const repair of ['shorter', 'empty', 'truncated', 'repeat']) it(`P3 retains the longest short draft after ${repair} reinforcement`, async () => {
 docs[0].sections=specs.map((spec,i)=>({key:spec.key,title:spec.title,order:spec.order,body:p3Text(spec.key,i?2300:500),status:'ok'}));
 docs[0].llmMeta.attempts={[specs[0].key]:1};
 provider.mockImplementation(async()=>({ok:repair!=='empty',truncated:repair==='truncated',text:repair==='empty'?'':repair==='repeat'?docs[0].sections[1].body:p3Text(specs[0].key,400)}));
 expect((await generate()).status).toBe(200); expect(docs[0].sections[0].body).toBe(p3Text(specs[0].key,500));
 expect(docs[0].llmMeta.attempts[specs[0].key]).toBe(1);expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();
});
it('P3 total-only repair uses remaining budget, then stops without completion or refund',async()=>{
 docs[0].sections=specs.map(spec=>({key:spec.key,title:spec.title,order:spec.order,body:p3Text(spec.key,1999),status:'ok'}));
 docs[0].llmMeta.attempts=Object.fromEntries(specs.map(spec=>[spec.key,3]));
 expect((await generate()).status).toBe(200); expect(provider).not.toHaveBeenCalled();expect(complete).toHaveBeenCalledTimes(1);expect(refund).not.toHaveBeenCalled();
 docs[0].llmMeta.attempts[specs[0].key]=2;docs[0].llmMeta.attempts[`${specs[0].key}:lengthRepair`]=1;
 provider.mockResolvedValue({ok:true,text:p3Text(specs[0].key,2500)});
 expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled();
});
it('P3 bounds oversized text and rejects repetition hidden beyond the ceiling',async()=>{
 const spec=specs[0]; const good=p3Text(spec.key,5000);
 provider.mockImplementation(async(_env,key)=>({ok:true,text:key===spec.key?good:p3Text(key,2300)}));
 await generate();expect(docs[0].sections.find(row=>row.key===spec.key).body.length).toBe(spec.maxChars);
 docs[0].sections=[];docs[0].llmMeta={attempts:{},failures:{}};
 provider.mockImplementation(async(_env,key)=>({ok:true,text:key===spec.key?`${good}.\n${good}.`:p3Text(key,2300)}));
 await generate();expect(docs[0].sections.find(row=>row.key===spec.key).status).toBe('degraded');
});
it('P3 lost repair checkpoint resumes from the reserved repair without another provider call', async()=>{
 docs[0].sections=specs.map((spec,i)=>({key:spec.key,title:spec.title,order:spec.order,body:p3Text(spec.key,i?2300:500),status:'ok'}));
 docs[0].llmMeta.attempts={[specs[0].key]:1};fault={status:'completed',kind:'throw'};
 expect((await generate()).status).toBe(503);expect(docs[0].llmMeta.attempts[specs[0].key]).toBe(1);
 expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();
});
it('a section cut at the token limit retries once with a doubled budget',async()=>{
 const {COMPASS_SECTION_MAX_OUTPUT_TOKENS:tokens}=await import('../../worker/lib/destiny-compass-report-contract.js');
 const base=provider.getMockImplementation(),key=specs[0].key;let cut=false;
 provider.mockImplementation(async(...args)=>{if(args[1]===key&&!cut){cut=true;return {ok:true,truncated:true,text:'잘린 본문은 문장 중간에서'};}return base(...args);});
 for(let i=0;i<4&&docs[0].status!=='completed';i++)await generate();
 expect(docs[0].status).toBe('completed');expect(refund).not.toHaveBeenCalled();
 expect(provider.mock.calls.filter(call=>call[1]===key).map(call=>call[2].maxOutputTokens)).toEqual([tokens,tokens*2]);
 expect(provider.mock.calls.filter(call=>call[1]!==key).every(call=>call[2].maxOutputTokens===tokens)).toBe(true);
});
it('destiny compass delivers a result at the new target',async()=>{
 expect(specs).toHaveLength(10);for(const spec of specs){expect(spec.targetMinChars).toBe(1200);expect(spec.minChars).toBeLessThanOrEqual(960);}
 provider.mockImplementation(async(_env,key)=>{let text='';for(let i=0;text.replace(/\s/g,'').length<1200;i++)text+=`${key}의 ${i}번째 계산 근거와 생활 선택을 살펴보며 반대 조건과 구체적인 행동을 함께 설명합니다.\n`;return{ok:true,text}});
 for(let i=0;i<3;i++)await generate();
 expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(10);expect(refund).not.toHaveBeenCalled();
});

describe('delivery plan 2 (new sessions only)',()=>{
 const long=(key,size)=>{let text='';for(let i=0;text.replace(/\s/g,'').length<size;i++)text+=`${key}의 ${i}번째 계산 근거와 생활 선택을 살펴보며 반대 조건과 구체적인 행동을 함께 설명합니다.\n`;return text;};
 async function run(max=20){let response;for(let i=0;i<max;i++){response=await generate();if(response.status!==202)break;}return response;}
 beforeEach(()=>{docs[0].llmMeta.deliveryPlanVersion=2;});
 it('delivers scrubbed drafts after the last attempt instead of holding the report',async()=>{
  provider.mockImplementation(async(_env,key)=>({ok:true,text:`${key} 짧은 본문입니다.`}));
  const response=await run();expect(response.status).toBe(200);
  expect(docs[0].status).toBe('completed');expect(docs[0].sections).toHaveLength(10);expect(docs[0].sections.every(row=>row.status==='degraded')).toBe(true);
  expect(provider).toHaveBeenCalledTimes(20);expect(complete).toHaveBeenCalledTimes(1);expect(refund).not.toHaveBeenCalled();
  expect((await response.json()).degraded).toBe(true);
 });
 it('gives an empty section one rescue call, then delivers without dropping the others',async()=>{
  const base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>args[1]==='opening'?{ok:false,text:''}:base(...args));
  expect((await run()).status).toBe(200);
  expect(provider.mock.calls.filter(call=>call[1]==='opening')).toHaveLength(3);
  expect(docs[0].sections).toHaveLength(9);expect(docs[0].llmMeta.qualityIssues).toContain('section_missing:opening');expect(refund).not.toHaveBeenCalled();
 });
 it('refunds only when every section is empty',async()=>{
  provider.mockImplementation(async()=>({ok:false,text:''}));
  const response=await run();expect(response.status).toBe(503);expect(docs[0].status).toBe('generation_failed');expect(refund).toHaveBeenCalledTimes(1);expect(complete).not.toHaveBeenCalled();
 });
 it('repairs only sections below the length floor, shortest first, at most three',async()=>{
  const sizes={opening:300,saju_reading:400,ziwei_reading:500,sukuyo_reading:600};
  provider.mockImplementation(async(_env,key,options)=>({ok:true,text:long(key,(sizes[key]&&!provider.mock.calls.filter(call=>call[1]===key).slice(0,-1).length)?sizes[key]:1100)}));
  expect((await run()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(13);
  const repaired=Object.keys(docs[0].llmMeta.attempts).filter(key=>key.endsWith(':softRepair')).map(key=>key.split(':')[0]).sort();
  expect(repaired).toEqual(['opening','saju_reading','ziwei_reading'].sort());expect(docs[0].llmMeta.softRepairsUsed).toBe(3);
  expect(docs[0].sections.find(row=>row.key==='sukuyo_reading').status).toBe('ok');expect(refund).not.toHaveBeenCalled();
 });
 it('drops a sentence repeated across sections instead of blocking completion',async()=>{
  const shared='모든 섹션에 똑같이 붙은 이 문장은 리포트 전체에서 한 번만 남아야 하는 반복 문장입니다.';
  provider.mockImplementation(async(_env,key)=>({ok:true,text:`${long(key,1100)}${shared}`}));
  expect((await run()).status).toBe(200);
  expect(docs[0].sections.filter(row=>row.body.includes(shared))).toHaveLength(1);expect(complete).toHaveBeenCalledTimes(1);
 });
 it('new sessions are seeded as plan 2 and the raw question stays in the opening prompt only',()=>{
  const input={field:{seed:'x',primary:{key:'career',score:60,band:'steady'},directions:[],timeline:{}},evidencePack:requestInput().evidencePack,question:'이직해도 될까요',emotion:'calm',questionOpeningOnly:true};
  input.basisPayload=realContract.buildCompassBasisPayload(input);
  const prompts=specs.map(spec=>realContract.buildCompassSectionPrompt({...input,spec}));
  expect(prompts.filter(prompt=>prompt.includes('이직해도 될까요'))).toHaveLength(1);expect(prompts[0]).toContain('이직해도 될까요');
  expect(prompts.slice(1).every(prompt=>prompt.includes('첫 장에서 이미 다뤘다'))).toBe(true);
 });
 it('seeds plan 2 for a new request',async()=>{docs=[];await route(new Request('https://mock.test/api/destiny-compass-ai/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestInput())}),{});expect(docs[0].llmMeta.deliveryPlanVersion).toBe(2);
  docs=[];await route(new Request('https://mock.test/api/destiny-compass-ai/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestInput())}),{COMPASS_REPORT_DELIVERY_V2_ENABLED:'false'});expect(docs[0].llmMeta.deliveryPlanVersion).toBeUndefined();});
});

it('reopens native chapters with the same native authority and no web payment or regeneration',async()=>{
  docs=[];
  const {deliverNativeCompassReport,normalizeCompassReportInput}=await import('../../worker/routes/destiny-compass-ai.js');
  const raw=normalizeCompassReportInput(requestInput());
  const auth={userId:uid,nativeReportId:'tossdc_123',inputHash:'native-proof',assertTossReport:jest.fn(async doc=>{
    expect(doc.accessType).toBe('toss');
    expect(doc.llmMeta.tossInputHash).toBe('native-proof');
    expect(doc.llmMeta.transactionId).toBe('toss-order');
  })};
  const run=async write=>deliverNativeCompassReport({},auth,raw,'toss-order',write);
  expect((await run(false)).status).toBe(202);
  for(let i=0;i<3;i++)await run(true);
  const saved=await (await run(false)).json();
  expect(saved.status).toBe('completed');
  expect(saved.sections).toHaveLength(10);
  expect(provider).toHaveBeenCalledTimes(10);
  expect(complete).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();expect(access).not.toHaveBeenCalled();
  expect(auth.assertTossReport).toHaveBeenCalled();
  const web=await route(new Request('https://mock.test/api/destiny-compass-ai/result?id='+saved.reportId),{});
  expect(web.status).toBe(404);
  const forged=await route(new Request('https://mock.test/api/destiny-compass-ai/report/continue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:saved.reportId})}),{});
  expect(forged.status).toBe(402);
  await expect(deliverNativeCompassReport({}, {...auth,assertTossReport:async()=>{throw Error('ORDER_REFUNDED');}}, raw,'toss-order',false)).rejects.toThrow('ORDER_REFUNDED');
});
