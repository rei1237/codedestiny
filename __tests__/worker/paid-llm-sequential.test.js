/** @jest-environment node */
import { jest } from '@jest/globals';
import { PAID_LLM_PARTS_PER_REQUEST } from '../../worker/lib/sync-llm-timeout.js';
import {readFileSync} from 'node:fs';
let route,docs,provider,revoked,userId,fault,lost,external,kind,mode;
let owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
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
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async(_env,_owner,_type,body)=>{proofs.push(body);return {ok:mode!=='denied',status:402};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:(...args)=>provider(...args)}));
 ({handleOracleRoutes:route}=await import('../../worker/routes/oracle.js'));
});
let proofs=[];
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;mode='pass';proofs=[];
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
 const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)[1],label=prompt.split('[이번 호출 범위] ')[1].split('\n')[0];
 return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:Array.from({length:65},(_,i)=>`${label} ${i}번째 해석은 세 형상의 관계에 비추어 지금의 선택을 검토하는 과정이며 확정된 사건을 예언하지 않습니다. ${label} ${i}번째 관찰에서는 생활 속 조건과 실천의 결과를 기록하며 자신에게 맞는 방향을 선택할 수 있습니다.`).join('\n\n')})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const original=()=>({requestId:'original-paid-geomancy',transactionId:'paid-'+mode,question:'어떤 선택을 하는 것이 좋을까요?',theme:'sultan',cards:{judge:{english:'Fortuna Major',korean:'대길',meaning:'꾸준한 성장'},cause:{english:'Via',korean:'길'},flow:{english:'Populus',korean:'군중'}}});
const post=body=>route(new Request('https://mock.test/api/oracle/geomancy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
const finish=async()=>{let result;for(let i=0;i<4;i++){result=await resume();if(result.status===200)return result;}return result;};

test('default policy saves exactly one part per request and never calls a saved part twice',async()=>{
 expect(PAID_LLM_PARTS_PER_REQUEST).toBe(1);
 expect((await start()).status).toBe(202);
 expect(provider).toHaveBeenCalledTimes(1);
 expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(1);
 const first=provider.mock.calls[0][1];
 const total=docs[0].metadata.paidNarrative.tasks.length;
 for(let i=1;i<total;i++){
  const calls=provider.mock.calls.length;
  const result=await resume();
  expect(result.status).toBe(i===total-1?200:202);
  expect(provider.mock.calls.length-calls).toBe(1);
  expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(i+1);
 }
 expect(provider.mock.calls.slice(1).every(row=>row[1]!==first)).toBe(true);
 expect((await resume()).status).toBe(200);
 expect(provider).toHaveBeenCalledTimes(total);
});

test('a slow generation holds the lease and returns a saved partial before any next part starts',async()=>{
 let release;const hold=new Promise(resolve=>release=resolve),good=provider.getMockImplementation();
 provider.mockImplementation(async(...args)=>{await hold;return good(...args);});
 const running=start();
 for(let i=0;i<50&&!provider.mock.calls.length;i++)await new Promise(resolve=>setImmediate(resolve));
 expect(provider).toHaveBeenCalledTimes(1);
 const busy=await start();expect(busy.status).toBe(202);expect((await busy.json()).busy).toBe(true);
 expect(provider).toHaveBeenCalledTimes(1);
 release();expect((await running).status).toBe(202);
 expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(1);
});

test('structured repairs share one deadline and never retry a timed out provider',async()=>{
 const {callGeminiJsonWithRetry}=await import('../../worker/lib/structured-consultation.js');
 let now=1000;const time=jest.spyOn(Date,'now').mockImplementation(()=>now);
 try{
  provider.mockImplementation(async()=>{now+=600;return{ok:true,truncated:true,text:'{"body":"saved"}'};});
  const result=await callGeminiJsonWithRetry({},'synthetic',{attempts:3,timeoutMs:1000,baseTokens:2000});
  expect(result.text).toContain('saved');expect(provider).toHaveBeenCalledTimes(1);
  expect(result.rawText).toBe('{"body":"saved"}');
  expect(result.truncated).toBe(false);
  expect(provider.mock.calls.map(row=>row[2].timeoutMs)).toEqual([1000]);
  expect(provider.mock.calls.every(row=>row[2].maxProviderAttempts===1)).toBe(true);
  provider.mockClear();provider.mockResolvedValue({ok:false,error:'llm_failed',message:'provider timed out'});
  await callGeminiJsonWithRetry({},'synthetic',{attempts:3,timeoutMs:1000,baseTokens:2000});
  expect(provider).toHaveBeenCalledTimes(1);
 }finally{time.mockRestore();}
});

test('all durable multi-part dispatchers use the shared one-part policy',()=>{
 const files=['lib/paid-narrative-delivery.js','lib/celestial-report-delivery.js','lib/relationship-report-delivery.js',
  'lib/naming-report-delivery.js','lib/human-design-report-contract.js','routes/astrology-ai.js','routes/neo-operation-room.js',
  'routes/destiny-compass-ai.js','routes/ziwei-island-ai.js','routes/fortune-tea-house.js','routes/life-book-ai.js',
  'routes/nakshatra-ai.js','routes/ziwei-deep-report.js','routes/master-love-codex.js','routes/karma-destiny-ai.js'];
 for(const file of files){
  const source=readFileSync(new URL('../../worker/'+file,import.meta.url),'utf8');
  expect(source).toMatch(/import\s*\{[^}]*PAID_LLM_PARTS_PER_REQUEST[^}]*\}\s*from/);
  expect(source).toMatch(/(?:slice\(0,\s*PAID_LLM_PARTS_PER_REQUEST\)|(?:BATCH_SIZE|CONCURRENCY)\s*=\s*PAID_LLM_PARTS_PER_REQUEST)/);
 }
});

 test('structured helper never multiplies durable attempts and caps standalone failures at two',async()=>{
  const {callGeminiJsonWithRetry}=await import('../../worker/lib/structured-consultation.js');
  const {runWithPaidGenerationContext}=await import('../../worker/lib/paid-generation-context.js');
  provider.mockResolvedValue({ok:false,error:'unavailable'});
  await runWithPaidGenerationContext({requestId:'saved',attempt:1},()=>callGeminiJsonWithRetry({},'synthetic',{attempts:9,baseTokens:2000}));
  expect(provider).toHaveBeenCalledTimes(1);
  provider.mockClear();
  await callGeminiJsonWithRetry({},'synthetic',{attempts:9,baseTokens:2000});
  expect(provider).toHaveBeenCalledTimes(2);
 });
