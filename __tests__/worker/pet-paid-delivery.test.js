/** @jest-environment node */
import { jest } from '@jest/globals';
import { HttpError } from '../../worker/lib/http.js';
let route,docs,provider,revoked,userId,fault,lost,external,kind,mode;
const owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);if('$gt'in value)return new Date(actual)>new Date(value.$gt);}
 return value===null?actual==null:JSON.stringify(actual)===JSON.stringify(value);
});}
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}}
const model={findOne:filter=>{if(lost){lost=false;return query(null);}return query(docs.find(doc=>matches(doc,filter))||null);},
 findOneAndUpdate:(filter,update,options={})=>{
  if(fault&&(fault.metadata?Boolean(update.$set?.metadata):update.$set?.premiumStatus==='completed')){const failure=fault;fault=null;if(failure.kind==='throw')throw Error('storage');if(failure.kind==='null')return query(null);if(failure.kind==='confirm')lost=true;}
  let doc=docs.find(doc=>matches(doc,filter));if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}if(doc)patch(doc,update.$set||{});return query(doc||null);
 },updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};}};
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),structured=await import('../../worker/lib/structured-consultation.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>{if(mode==='denied')throw new HttpError(403,'payment denied');return {ok:true,accessType:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({...structured,callGeminiJsonWithRetry:(...args)=>provider(...args)}));
 ({handlePetSajuAiRoutes:route}=await import('../../worker/routes/pet-saju-ai.js'));
});
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;kind='report';mode='pass';
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.attempts).toBe(1);expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
  const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)[1],label=prompt.split('[이번 호출 범위]\n')[1].split('\n')[0].replace(/[.!?]/g,'');
  return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:Array.from({length:45},(_,i)=>`${label} ${i}번째 사례는 생활의 리듬과 각자의 반응을 함께 살펴보며 적용 조건을 확인합니다. ${label} ${i}번째 선택에서는 관찰된 행동과 휴식의 차이를 바탕으로 일상을 조정할 수 있습니다.`).join('\n\n')})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const pet={name:'나비',species:'cat',birthDate:'2020-01-01',birthTimeUnknown:true,breed:'generic'};
const original=()=>({requestId:'original-paid-request',date:'2026-09-15',transactionId:'paid-'+mode,...(kind==='report'?{pet}:{petA:pet,petB:{...pet,name:'달이',birthDate:'2021-02-02'}})});
const post=body=>route(new Request('https://mock.test/api/pet-saju-ai/'+kind,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
test('access rejection prevents initial and resumed provider calls',async()=>{
 mode='denied';expect((await start()).status).toBe(403);expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);
 mode='pass';await start();const calls=provider.mock.calls.length;mode='denied';expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(calls);
});
async function finish(){let response;for(let n=0;n<8;n++){response=await resume();if(response.status!==202)break;}return response;}
test.each(['report','compat'].flatMap(type=>['pass','monthly','single'].map(mode=>[type,mode])))('%s %s saves a real report and reopens without regeneration',async(type,access)=>{
 kind=type;mode=access;expect((await start()).status).toBe(202);expect((await finish()).status).toBe(200);const count=provider.mock.calls.length;
 expect(count).toBe(docs[0].metadata.paidNarrative.tasks.length);expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);
});
test.each(['report','compat'].flatMap(type=>['pass','monthly','single'].flatMap(mode=>['throw','null','confirm'].map(fault=>[type,mode,fault]))))('%s %s final save %s returns storage failure and reuses every generated part',async(type,access,fail)=>{
 kind=type;mode=access;await start();fault={kind:fail};const response=await finish();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});
 const count=provider.mock.calls.length;expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);
});
test.each(['throw','null','confirm'])('checkpoint %s confirms storage before any provider call',async fail=>{
 fault={kind:fail,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(202);
});
test.each(['short','fact','missing','interrupted'])('%s output cannot become a completed deterministic fallback',async fail=>{
 const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(fail==='interrupted')throw Error('network lost');const response=await base(...args),value=JSON.parse(response.text);if(fail==='short')value.body='짧은 결과';if(fail==='fact')value.evidenceHash='changed';if(fail==='missing')delete value.body;return {...response,text:JSON.stringify(value)};});
 await start();expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(docs[0].metadata.paidNarrative.tasks.length+1);
});
test('owner, product, cancelled proof and frozen original input are enforced',async()=>{
 await start();const id=docs[0].executionKey;userId='other-owner';expect((await resume()).status).toBe(404);userId=owner;kind='compat';expect((await post({resumeResultId:id})).status).toBe(404);kind='report';expect((await post({...original(),pet:{...pet,name:'다른 아이'}})).status).toBe(409);revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);
});
test('server pending lookup and simultaneous resumes use a single lease',async()=>{
 await start();const found=await route(new Request('https://mock.test/api/pet-saju-ai/result?kind=report&pending=1'),{});expect(found.status).toBe(202);expect((await found.json()).resumeBody).toEqual({resumeResultId:docs[0].executionKey});
 let release;const pause=new Promise(resolve=>{release=resolve;}),base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{await pause;return base(...args);});const first=resume(),second=resume();for(let i=0;i<100&&provider.mock.calls.length<8;i++)await new Promise(resolve=>setImmediate(resolve));expect(provider).toHaveBeenCalledTimes(8);release();expect((await first).status).toBe(202);expect((await second).status).toBe(202);
});
test('original locale persists across differently localized resumes',async()=>{
 const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');const locales=[],base=provider.getMockImplementation();provider.mockImplementation((...args)=>{locales.push(getAmbientAiLocale());return base(...args);});await runWithAiLocale('ja',start);await runWithAiLocale('ko',finish);expect(locales.every(locale=>locale==='ja')).toBe(true);expect(docs[0].premiumStatus).toBe('completed');
});
