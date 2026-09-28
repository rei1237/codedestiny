/** @jest-environment node */
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let route,run,docs,provider,revoked,fault,lost,external;
const owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function test1(actual,cond){
 if(cond===null)return actual==null;
 if(cond&&typeof cond==='object'&&!(cond instanceof Date)&&Object.keys(cond).every(op=>op.startsWith('$')))return Object.entries(cond).every(([op,value])=>{
  if(op==='$exists')return (actual!==undefined)===value;if(op==='$in')return value.includes(actual);if(op==='$ne')return JSON.stringify(actual)!==JSON.stringify(value);
  if(actual==null)return false;const a=new Date(actual).getTime(),b=new Date(value).getTime();
  if(op==='$gt')return a>b;if(op==='$lte')return a<=b;if(op==='$gte')return a>=b;throw Error('unsupported '+op);});
 return JSON.stringify(actual)===JSON.stringify(cond);
}
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>key==='$or'?value.some(item=>matches(doc,item)):key==='$and'?value.every(item=>matches(doc,item)):test1(get(doc,key),value));}
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}}
const model={find:filter=>{let rows=docs.filter(doc=>matches(doc,filter)),n=Infinity;const chain={sort(){rows.sort((a,b)=>a.timeoutAt-b.timeoutAt);return chain;},limit(value){n=value;return chain;},select(){return chain;},lean:async()=>clone(rows.slice(0,n))};return chain;},
 findOne:filter=>{if(lost){lost=false;return query(null);}return query(docs.find(doc=>matches(doc,filter))||null);},
 findOneAndUpdate:(filter,update,options={})=>{
  if(fault&&update.$set?.metadata){const failure=fault;fault=null;if(failure==='throw')throw Error('storage');if(failure==='null')return query(null);if(failure==='confirm')lost=true;}
  let doc=docs.find(doc=>matches(doc,filter));if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}if(doc)patch(doc,update.$set||{});return query(doc||null);
 },updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};}};
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId:owner})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>({ok:true})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({handleOracleRoutes:route}=await import('../../worker/routes/oracle.js'));
 ({runPaidNarrativeRecovery:run}=await import('../../worker/lib/paid-narrative-recovery-task.js'));
});
const good=async(_env,prompt)=>{const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)[1],label=prompt.split('[이번 호출 범위] ')[1].split(':')[0];
 return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:Array.from({length:65},(_,i)=>`${label} ${i}번째 해석은 세 형상의 관계에 비추어 지금의 선택을 검토하는 과정이며 확정된 사건을 예언하지 않습니다. ${label} ${i}번째 관찰에서는 생활 속 조건과 실천의 결과를 기록하며 자신에게 맞는 방향을 선택할 수 있습니다.`).join('\n\n')})};};
beforeEach(()=>{docs=[];revoked=false;fault=null;lost=false;provider=jest.fn(good);
 external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const labels=()=>provider.mock.calls.map(call=>call[1].split('[이번 호출 범위] ')[1].split(':')[0]);
const start=async()=>{await route(new Request('https://mock.test/api/oracle/geomancy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:'original-paid-geomancy',question:'비공개 질문을 해석해 주세요',theme:'sultan',cards:{judge:{english:'Fortuna Major',korean:'대길'},cause:{english:'Via',korean:'길'},flow:{english:'Populus',korean:'군중'}}})}),{});
 expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(4);docs[0].timeoutAt=new Date();};
const missing=()=>docs[0].metadata.paidNarrative.tasks.map(task=>task.id).filter(id=>!docs[0].metadata.paidNarrative.parts[id]);

test('cron calls are labelled server_* in token logs while browser calls keep their labels',async()=>{
 const {getPaidGenerationContext}=await import('../../worker/lib/paid-generation-context.js'),sources=[];
 provider=jest.fn(async(...args)=>{sources.push(getPaidGenerationContext()?.generationSource);return good(...args);});
 await start();const log=jest.spyOn(console,'log').mockImplementation(()=>{});await run({});log.mockRestore();
 expect(sources.slice(0,4)).toEqual(Array(4).fill('initial'));
 expect(sources.length).toBeGreaterThan(4);expect(new Set(sources.slice(4))).toEqual(new Set(['server_initial']));
});

test('a left execution resumes only its missing parts and completes after the confirming read',async()=>{
 await start();const saved=clone(docs[0].metadata.paidNarrative.parts),left=missing(),log=jest.spyOn(console,'log').mockImplementation(()=>{});
 expect((await run({})).outcomes).toEqual([{executionKey:docs[0].executionKey,featureKey:'geomancy',outcome:'completed'}]);
 expect(labels().slice(4).sort()).toEqual([...left].sort());expect(docs[0]).toMatchObject({status:'success',premiumStatus:'completed'});
 for(const [id,body] of Object.entries(saved))expect(docs[0].metadata.paidNarrative.parts[id]).toBe(body);
 expect(JSON.stringify(log.mock.calls)).not.toContain('비공개');log.mockRestore();
 const read=await route(new Request('https://mock.test/api/oracle/result?resultId='+encodeURIComponent(docs[0].executionKey)),{});
 expect(read.status).toBe(200);expect(await read.json()).toMatchObject({status:'completed',saved:true});expect(provider).toHaveBeenCalledTimes(7);
});
test('a live browser lease is skipped and concurrent ticks never call a part twice',async()=>{
 await start();docs[0].lock={token:'browser',until:new Date(Date.now()+60000)};
 expect(await run({})).toMatchObject({scanned:0});expect(provider).toHaveBeenCalledTimes(4);
 docs[0].lock={token:'',until:null};await Promise.all([run({}),run({})]);
 expect(provider).toHaveBeenCalledTimes(7);expect(new Set(labels()).size).toBe(7);expect(docs[0].status).toBe('success');
});
test('a refunded payment stops before any provider call and leaves the record for review',async()=>{
 await start();revoked=true;
 expect((await run({})).outcomes[0].outcome).toBe('PAYMENT_REVOKED');expect(provider).toHaveBeenCalledTimes(4);
 expect(docs[0]).toMatchObject({status:'pending',metadata:{paidNarrativeRecovery:{reviewRequired:true}}});expect(docs[0].premiumStatus).not.toBe('completed');
 expect(await run({})).toMatchObject({scanned:0});
});
test.each(['throw','null','confirm'])('a lost %s save is not completion and backs off without the settlement counters',async kind=>{
 await start();fault=kind;const before=docs[0].retryCount;
 expect((await run({})).outcomes[0].outcome).toBe('RESULT_STORAGE_UNAVAILABLE');
 expect(docs[0].status).toBe('pending');expect(docs[0].retryCount).toBe(before);
 expect(docs[0].metadata.paidNarrativeRecovery).toMatchObject({errors:1,code:'RESULT_STORAGE_UNAVAILABLE'});
 expect(await run({})).toMatchObject({scanned:0});
 expect((await run({},{now:Date.now()+3600000})).outcomes[0].outcome).toBe('completed');expect(docs[0].metadata.paidNarrativeRecovery).toBeNull();
 expect(new Set(labels()).size).toBe(7);
});
test('a save after the lease moved to another worker is rejected',async()=>{
 await start();provider.mockImplementation(async(...args)=>{docs[0].lock={token:'other',until:new Date(Date.now()+60000)};return good(...args);});
 expect((await run({})).outcomes[0].outcome).toBe('RESULT_STORAGE_UNAVAILABLE');
 expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(4);expect(docs[0].status).toBe('pending');
 // The attempts save before the call clears the marker; no review or backoff
 // marker is written over another worker's live lease.
 expect(docs[0].metadata.paidNarrativeRecovery).toBeNull();
});
test('exhausted parts wait for review and the server never claims a refund',async()=>{
 await start();for(const id of missing())docs[0].metadata.paidNarrative.attempts[id]=2;provider.mockImplementation(async()=>({ok:false}));
 expect((await run({})).outcomes[0].outcome).toBe('review_required');expect(provider).toHaveBeenCalledTimes(7);
 expect(docs[0].metadata.paidNarrative).not.toHaveProperty('exhaustionClaimed');expect(docs[0].metadata.paidNarrative).not.toHaveProperty('failureResult');
 expect(docs[0].metadata.paidNarrativeRecovery).toMatchObject({reviewRequired:true});expect(await run({})).toMatchObject({scanned:0});
});
test('unregistered feature and report pairs are never selected',async()=>{
 const doc={_id:'follow-up',userId:owner,executionKey:'paid-narrative:follow-up',featureKey:'karma-destiny-ai-consultation',reportType:'expertFollowUp',status:'pending',
  timeoutAt:new Date(0),createdAt:new Date(),lock:{token:'',until:null},metadata:{paidNarrative:{tasks:[{id:'answer'}],parts:{},attempts:{}}}};
 docs.push(clone(doc));expect(await run({})).toMatchObject({scanned:0,outcomes:[]});expect(docs[0]).toEqual(doc);expect(provider).not.toHaveBeenCalled();
});
