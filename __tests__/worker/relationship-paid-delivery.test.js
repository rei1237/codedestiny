/** @jest-environment node */
import { jest } from '@jest/globals';
let route, docs, provider, accessMode, revoked, userId, fault, lost, fetchBlock, refunds, closes;
const user='64b7f2a1c3d4e5f601234567';
const clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);}
 return value===null?actual==null:JSON.stringify(actual)===JSON.stringify(value);
});}
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}
 if(doc.sections)doc.sections.forEach((section,i)=>{section._id='mongo-subdoc-'+i;});
 if(doc.character)doc.character._id='mongo-character';
}
const model={
 findOne:filter=>{if(lost){lost=false;return query(null);}return query(docs.find(doc=>matches(doc,filter))||null);},
 findOneAndUpdate:(filter,update,options={})=>{
  if(fault&&(fault.metadata?Boolean(update.$set?.llmMeta):update.$set?.status===fault.status)){const failure=fault;fault=null;if(failure.kind==='throw')throw Error('storage');if(failure.kind==='null')return query(null);if(failure.kind==='confirm')lost=true;}
  let doc=docs.find(doc=>matches(doc,filter));
  if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}
  if(doc){patch(doc,update.$set||{});doc.updatedAt=new Date();}return query(doc||null);
 },
 updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};},
};
function prose(id){return Array.from({length:50},(_,n)=>`${id}의 ${n}번째 상황에서는 관계를 바라보는 관점과 감정을 표현하는 조건을 구체적으로 살펴봅니다. ${id}에서 ${n}번째 사례를 단정하지 않고 서로 다른 생활 리듬과 대화를 확인하는 행동을 제시합니다.`).join('\n\n');}
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),structured=await import('../../worker/lib/structured-consultation.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,getOptionalUserFromRequest:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:async()=>({proven:true,source:accessMode,transactionId:'original-'+accessMode})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,RelationshipBoundaryTest:model,
  PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)},
 }));
 jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({...structured,callGeminiJsonWithRetry:(...args)=>provider(...args)}));
 jest.unstable_mockModule('../../worker/lib/service-execution-task.js',()=>({startServiceExecution:async()=>({}),completeServiceExecution:async()=>{expect(docs[0].status).toBe('completed');closes++;},failServiceExecution:async()=>{expect(docs[0].status).toBe('generation_failed');refunds++;return {};}}));
 ({handleRelationshipBoundaryTestRoutes:route}=await import('../../worker/routes/relationship-boundary-test.js'));
});
beforeEach(()=>{docs=[];accessMode='pass';revoked=false;userId=user;fault=null;lost=false;refunds=0;closes=0;
 provider=jest.fn(async(_env,prompt,options)=>{
  expect(options.timeoutMs).toBe(45000);expect(options.attempts).toBe(1);expect(options.fallbackToWorkersAI).toBe(false);
  const evidenceHash=prompt.match(/evidenceHash[":\s]+([a-f0-9]{64})/)[1];
  const part=prompt.match(/이번 호출은 (\d+)장 중 (\d)\/2/);
  return {ok:true,provider:'gemini',text:JSON.stringify(part?{evidenceHash,body:prose(part[1]+'-'+part[2])}:{evidenceHash,character:{title:'대화를 이어 가는 사람',caption:'계산된 근거와 관계의 조건을 살펴봅니다.'},summary:'사주의 근거를 바탕으로 선택 조건을 살펴봅니다.',finalMessage:'상대를 단정하지 말고 함께 대화해 보세요.'})};
 });
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore();});
const body={idempotencyKey:'original-paid-request',targetInfo:{gender:'female',birthDate:'1990-01-01',birthTime:'12:00',calendarType:'solar',birthTimeUnknown:false,isLeapMonth:false}};
const post=value=>route(new Request('https://mock.test/api/relationship-boundary-test/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}),{});
const start=()=>post(body);
const resume=()=>post({resumeSessionId:docs[0].id});
test.each(['pass','monthly','single'])('%s checkpoints eleven parts and reopens completed without generation',async mode=>{
 accessMode=mode;expect((await start()).status).toBe(202);expect((await resume()).status).toBe(202);expect((await resume()).status).toBe(200);
 expect(provider).toHaveBeenCalledTimes(11);expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(11);expect(refunds).toBe(0);expect(closes).toBe(1);
});
test.each(['pass','monthly','single'].flatMap(mode=>['throw','null','confirm'].map(kind=>[mode,kind])))('%s final storage %s never refunds or regenerates',async(mode,kind)=>{
 accessMode=mode;await start();await resume();fault={kind,status:'completed'};
 const response=await resume();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].id});expect(refunds).toBe(0);
 expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(11);
});
test.each(['throw','null','confirm'])('checkpoint %s starts no provider before verified persistence',async kind=>{
 fault={kind,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect(refunds).toBe(0);
 expect((await resume()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);
});
test.each(['short','fact','repeat','interrupted'])('%s part alone is regenerated',async kind=>{
 const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{
  if(kind==='interrupted')throw Error('connection lost');
  const response=await base(...args),value=JSON.parse(response.text);
  if(kind==='short')value.body='짧은 본문';if(kind==='fact')value.evidenceHash='changed';if(kind==='repeat')value.body='반복되는 문장을 분량으로 인정하지 않습니다. '.repeat(150);
  return {...response,text:JSON.stringify(value)};
 });
 await start();expect(Object.keys(docs[0].llmMeta.delivery.parts)).toHaveLength(3);await resume();await resume();
 expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(12);expect(refunds).toBe(0);
});
test('original owner, input, language and cancelled proof survive resume',async()=>{
 const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');const locales=[],base=provider.getMockImplementation();provider.mockImplementation((...args)=>{locales.push(getAmbientAiLocale());return base(...args);});
 await runWithAiLocale('en',start);userId='other';expect((await resume()).status).toBe(404);userId=user;
 expect((await post({...body,targetInfo:{...body.targetInfo,birthDate:'1991-01-01'}})).status).toBe(409);
 await runWithAiLocale('ko',resume);expect(locales).toEqual(Array(8).fill('en'));revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(8);
});
test('server-only recovery and concurrent resumes preserve one lease',async()=>{
 await start();const found=await route(new Request('https://mock.test/api/relationship-boundary-test/result?pending=1'),{});expect(found.status).toBe(202);expect((await found.json()).resumeBody).toEqual({resumeSessionId:docs[0].id});
 let release;const pause=new Promise(resolve=>{release=resolve;}),base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{await pause;return base(...args);});
 const first=resume(),second=resume();for(let n=0;n<100&&provider.mock.calls.length<8;n++)await new Promise(resolve=>setImmediate(resolve));expect(provider).toHaveBeenCalledTimes(8);release();expect((await first).status).toBe(202);expect((await second).status).toBe(202);
});
test('historical short completed result retains its original contract',async()=>{
 await start();docs[0].status='completed';docs[0].summary='old short';docs[0].llmMeta=null;provider.mockClear();const response=await resume();expect(response.status).toBe(200);expect((await response.json()).summary).toBe('old short');expect(provider).not.toHaveBeenCalled();
});
test('unknown provider interruption is bounded without a generation-failure refund',async()=>{
 provider.mockImplementation(()=>{throw Error('response lost');});await start();await resume();const response=await resume();
 expect(response.status).toBe(202);expect((await response.json()).retryable).toBe(false);expect(provider).toHaveBeenCalledTimes(12);expect(refunds).toBe(0);
});
test('known invalid generation refunds only after failure state is verified',async()=>{
 provider.mockImplementation(async()=>({ok:true,provider:'gemini',text:'{}'}));await start();await resume();const response=await resume();
 expect(response.status).toBe(503);expect((await response.json()).reason).toBe('GENERATION_FAILED');expect(refunds).toBe(1);
});
test('query-shaped ids are rejected before storage lookup',async()=>{
 expect((await post({resumeSessionId:{$ne:null}})).status).toBe(422);
 expect((await post({...body,idempotencyKey:{$ne:null}})).status).toBe(422);expect(docs).toHaveLength(0);
});
test('new report completion uses the 19999 / 20000 body-character boundary',async()=>{
 const {relationshipDeliveryComplete}=await import('../../worker/lib/relationship-report-delivery.js');
 const parts=Object.fromEntries(Array.from({length:10},(_,i)=>[String(i),{body:'가'.repeat(2000)}]));parts.frame={summary:'요약'};
 expect(relationshipDeliveryComplete({parts})).toBe(true);parts['0'].body=parts['0'].body.slice(1);expect(relationshipDeliveryComplete({parts})).toBe(false);
});
