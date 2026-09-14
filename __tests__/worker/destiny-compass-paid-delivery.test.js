/** @jest-environment node */
import { jest } from '@jest/globals';
let docs,fault,lostConfirmation,route,provider,refund,owner,fetchBlock,revokedSource,specs,access,complete;
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
 const db=await import('../../worker/lib/db.js'); const auth=await import('../../worker/lib/auth.js'); const models=await import('../../worker/lib/models.js'); const contract=await import('../../worker/lib/destiny-compass-report-contract.js'); specs=contract.COMPASS_SECTIONS;
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
const requestInput=()=>({idempotencyKey:'original-request',requestId:'original-request',transactionId:'original-receipt',question:'생활의 선택',emotion:'calm',field:{seed:'sensitive-seed',primary:{key:'career',score:60,band:'steady'},directions:[]},evidencePack:{systems:[{system:'saju',items:[{id:'saju.dayMaster',term:'일간',detail:'갑'}]}]}});
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
