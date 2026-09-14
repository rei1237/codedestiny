/** @jest-environment node */
import { jest } from '@jest/globals';
let docs,fault,lostConfirmation,route,provider,refund,owner,fetchBlock,revokedSource,specs;
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
 jest.unstable_mockModule('../../worker/lib/service-execution-task.js',()=>({startServiceExecution:async()=>({}),completeServiceExecution:async()=>({}),failServiceExecution:(...args)=>refund(...args)}));
 jest.unstable_mockModule('../../worker/lib/llm-cache-store.js',()=>({createLlmCacheStore:()=>null}));
 jest.unstable_mockModule('../../worker/lib/human-design-report-contract.js',()=>({...contract,requiredSubsectionIds:()=>[],validateHumanDesignReportSection:()=>({ok:true,issues:[],keptSubsections:[],evidence:[]})}));
 jest.unstable_mockModule('../../worker/lib/human-design-report-prompt.js',()=>({HD_REPORT_SECTION_TITLES:{},buildHumanDesignReportSectionPrompt:({spec})=>({prompt:spec.key,systemPrompt:'fixture'}),sectionDigest:()=>''}));
 ({handleHumanDesignReportRoutes:route}=await import('../../worker/routes/human-design-report.js'));
});
beforeEach(()=>{owner=uid;fault=null;lostConfirmation=false;revokedSource=-1;refund=jest.fn(async()=>({}));
 docs=[{id:'saved-hd',userId:uid,idempotencyKey:'original-request',billingRequestId:'original-request',status:'generating',locale:'ko',waveCount:0,lock:null,basis:{snapshot:{type:'Generator'},allowed:{all:[]}},sections:specs.map(spec=>({key:spec.key,order:spec.order,body:'',status:'pending',attempts:0}))}];
 provider=jest.fn(async(_env,key,options)=>{expect(options.attempts).toBe(1);expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);const spec=specs.find(row=>row.key===key);let body='';for(let i=0;body.replace(/\s/g,'').length<spec.minChars+100;i++)body+=`${key}의 ${i}번째 계산 근거와 생활 선택을 살펴보며 반대 조건과 구체적인 행동을 함께 설명합니다.\n`;return{ok:true,text:JSON.stringify({body,keyPoints:[]})}});
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
async function generate(extra={}){return route(new Request('https://mock.test/api/human-design-report/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reportId:'saved-hd',...extra})}),{})}
for(const accessType of ['pass','membership_credit','paid'])it(`${accessType} saves 18 units in five requests`,async()=>{docs[0].accessType=accessType;for(let i=0;i<5;i++)expect((await generate()).status).toBe(i<4?202:200);expect(docs[0].status).toBe('completed');expect(docs[0].totalChars).toBeGreaterThanOrEqual(20000);expect(provider).toHaveBeenCalledTimes(18);expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(18);expect(refund).not.toHaveBeenCalled()});
for(const status of ['delivery_pending','completed'])for(const kind of ['throw','null','confirm'])it(`${status} ${kind} never refunds or regenerates`,async()=>{for(let i=0;i<4;i++)await generate();fault={status,kind};const res=await generate();expect(res.status).toBe(503);expect(await res.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',resultId:'saved-hd',retryable:true});expect(refund).not.toHaveBeenCalled();expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(18)});
it('checkpoint failure preserves later siblings',async()=>{fault={count:1,kind:'throw'};expect((await generate()).status).toBe(503);expect(docs[0].sections.filter(row=>row.status==='ok')).toHaveLength(3);expect(refund).not.toHaveBeenCalled();for(let i=0;i<5;i++)await generate();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(19)});
for(const source of [0,1,2,3])it(`refunded source ${source} cannot resume`,async()=>{revokedSource=source;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('another account cannot resume',async()=>{owner='other';expect((await generate()).status).toBe(404);expect(provider).not.toHaveBeenCalled()});
it('concurrent requests hold the lease through checkpointing',async()=>{const result=await Promise.all([generate(),generate()]);expect(result.map(r=>r.status).sort()).toEqual([202,409]);expect(provider).toHaveBeenCalledTimes(4)});
it('GET does not refund a stale stored report',async()=>{docs[0].updatedAt=new Date(0);const res=await route(new Request('https://mock.test/api/human-design-report/result?reportId=saved-hd'),{});expect(res.status).toBe(202);expect(docs[0].status).toBe('generating');expect(refund).not.toHaveBeenCalled()});
it('historical completed body remains available without new length checks',async()=>{docs[0].status='completed';docs[0].sections=[];expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled()});

it('lost checkpoint confirmation preserves the written chapter and all siblings',async()=>{fault={count:1,kind:'confirm'};expect((await generate()).status).toBe(503);expect(docs[0].sections.filter(row=>row.status==='ok')).toHaveLength(4);for(let i=0;i<4;i++)await generate();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(18);expect(refund).not.toHaveBeenCalled()});
it('known empty failures exhaust the bounded budget and retain the existing refund policy',async()=>{provider.mockImplementation(async()=>({ok:false}));docs[0].waveCount=10;expect((await generate()).status).toBe(503);expect(docs[0].status).toBe('generation_failed');expect(refund).toHaveBeenCalledTimes(1);expect(docs[0].generationError.refunded).toBe(true);expect(provider).not.toHaveBeenCalled()});
it('unknown interrupted calls at the wave cap never turn into generation refunds',async()=>{docs[0].waveCount=10;docs[0].llmMeta={waveInFlight:true};const res=await generate();expect(res.status).toBe(503);expect(await res.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE'});expect(docs[0].status).toBe('generating');expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled()});
it('short outputs cannot complete even when the schema validator accepts them',async()=>{provider.mockImplementation(async()=>({ok:true,text:JSON.stringify({body:'짧은 본문',keyPoints:[]})}));await generate();expect(docs[0].sections.filter(row=>row.status==='ok')).toHaveLength(0);expect(docs[0].status).not.toBe('completed');expect(refund).not.toHaveBeenCalled()});
