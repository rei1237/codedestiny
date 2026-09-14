/** @jest-environment node */
import { jest } from '@jest/globals';
let route, docs, provider, accessMode, revoked, userId, fault, fetchBlock, calls, lost;
const user='64b7f2a1c3d4e5f601234567';
const clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);}
 return String(actual)===String(value);
});}
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}}
const model={
 findOne:filter=>{if(lost){lost=false;return query(null);}return query(docs.find(doc=>matches(doc,filter))||null);},
 findOneAndUpdate:(filter,update,options={})=>{
  if(fault&&(fault.metadata?Boolean(update.$set?.metadata):update.$set?.premiumStatus===fault.status)){const failure=fault;fault=null;if(failure.kind==='throw')throw Error('storage');if(failure.kind==='null')return query(null);if(failure.kind==='confirm')lost=true;}
  let doc=docs.find(doc=>matches(doc,filter));
  if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}
  if(doc){patch(doc,update.$set||{});doc.updatedAt=new Date();}return query(doc||null);
 },
 updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};},
};
function prose(id,field,count=14){return Array.from({length:count},(_,n)=>`${id} ${field} ${n}번째 카드의 상징을 실제 생활 속에서 받아들이는 조건과 서로 다른 반응을 살펴봅니다. ${id} ${field} ${n}번째 선택을 단정하기보다 대화를 통해 판단할 근거를 확인합니다.`).join('\n');}
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>({ok:true,accessType:accessMode})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,
  PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)},
 }));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({handleCelestialHarmonyRoutes:route}=await import('../../worker/routes/celestial-harmony.js'));
});
beforeEach(()=>{docs=[];accessMode='pass';revoked=false;userId=user;fault=null;calls=[];lost=false;
 provider=jest.fn(async(_env,prompt,options)=>{
  expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);const id=options.logContext.sectionGroup;calls.push(id);
  let value;
  if(id==='summary'){
   value=Object.fromEntries(['overallTheme','strongestPlanetSignal','deepestShadow','soulLesson','integrationPath','finalOracle'].map(field=>[field,prose(id,field,20)]));
   value.insightMatrix=Object.fromEntries(['love','work','money','health'].map(field=>[field,prose(id,'matrix'+field,2)]));
   value.closingFortune=Object.fromEntries(['overall','love','work','money','health'].map(field=>[field,prose(id,'closing'+field,6)]));
   for(const field of ['planetHighlights','practices','ritualPlan'])value[field]=Array.from({length:3},(_,i)=>prose(id,field+i,1));
  }else{
   const evidence=JSON.parse(prompt.match(/대신 다음 단일 객체만 출력하세요\. (\{.*\})\./)[1]).evidence;
   value={evidence,...Object.fromEntries(['cardMeaning','planetMeaning','archetypeReading','consciousMessage','unconsciousPattern','shadowWarning','soulLesson','integrationPractice'].map(field=>[field,prose(id,field)]))};
  }
  return {ok:true,provider:'gemini',text:JSON.stringify(value)};
 });
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore();});
const body={requestId:'original-paid-request',reportId:'paid-celestial-report',cards:['M17','M18','M01','M06','M15','M10','M11','M16','M02','M13','M19'].map((cardId,index)=>({cardId,orientation:index%2?'reversed':'upright'}))};
const post=value=>route(new Request('https://mock.test/api/celestial-harmony',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}),{});
const start=()=>post(body);
const resume=()=>post({resumeResultId:docs[0].executionKey});
test.each(['pass','monthly','single'])('%s completes persisted cards using the same paid request',async mode=>{
 accessMode=mode;expect((await start()).status).toBe(202);expect((await resume()).status).toBe(202);expect((await resume()).status).toBe(200);
 expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(12);expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(12);
});
test.each(['pass','monthly','single'].flatMap(mode=>['throw','null','confirm'].map(kind=>[mode,kind])))('%s final save %s reuses generated cards without another provider call',async(mode,kind)=>{
 accessMode=mode;await start();await resume();fault={kind,status:'completed'};const response=await resume();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});
 expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(12);
});
test('interrupted card only is regenerated; successful cards remain unchanged',async()=>{
 provider.mockImplementationOnce(()=>{throw Error('network lost');});await start();expect(Object.keys(docs[0].metadata.celestialDelivery.delivery.parts)).toHaveLength(3);
 await resume();await resume();await resume();expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(13);
});
test('owner, original spread and revocation are checked on resume',async()=>{
 await start();const id=docs[0].executionKey;userId='other-owner';expect((await resume()).status).toBe(404);userId=user;
 expect((await post({resumeResultId:id,cards:body.cards.slice().reverse()})).status).toBe(409);
 revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);
});
test('pending lookup recovers a server-only request',async()=>{
 await start();const response=await route(new Request('https://mock.test/api/celestial-harmony?pending=1'),{});
 expect(response.status).toBe(202);expect(await response.json()).toMatchObject({resumeBody:{resumeResultId:docs[0].executionKey},completedParts:['0','1','2','3']});
});
test.each(['throw','null','confirm'])('attempt checkpoint %s starts no provider call until confirmed',async kind=>{
 fault={kind,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();
 expect((await resume()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);
});
test('a concurrent request observes the original lease without generating again',async()=>{
 let release;const pause=new Promise(resolve=>{release=resolve;});const base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{await pause;return base(...args);});
 const running=start();for(let n=0;n<100&&provider.mock.calls.length<4;n++)await new Promise(resolve=>setImmediate(resolve));
 expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);release();expect((await running).status).toBe(202);
});
test('two simultaneous resumes cannot claim the same released lease even with equal timestamps',async()=>{
 await start();const base=provider.getMockImplementation();let release;
 const pause=new Promise(resolve=>{release=resolve;});provider.mockImplementation(async(...args)=>{await pause;return base(...args);});
 const first=resume(),second=resume();
 for(let n=0;n<100&&provider.mock.calls.length<8;n++)await new Promise(resolve=>setImmediate(resolve));
 expect(provider).toHaveBeenCalledTimes(8);release();
 expect((await first).status).toBe(202);expect((await second).status).toBe(202);
 expect(new Date(docs[0].retentionUntil)-new Date(docs[0].createdAt)).toBe(90*86400000);
});
test('original locale survives a differently localized resume request',async()=>{
 const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');const locales=[],base=provider.getMockImplementation();provider.mockImplementation((...args)=>{locales.push(getAmbientAiLocale());return base(...args);});
 await runWithAiLocale('en',()=>start());await runWithAiLocale('ko',()=>resume());await runWithAiLocale('ja',()=>resume());
 expect(docs[0].premiumStatus).toBe('completed');expect(locales).toEqual(Array(12).fill('en'));
});
test.each(['fact','short','repeat'])('%s failure preserves the other cards and repairs only the invalid card',async kind=>{
 const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{
  const ai=await base(...args),value=JSON.parse(ai.text);
  if(kind==='fact')value.evidence.planetId='invented';
  if(kind==='short')value.archetypeReading='짧은 결과';
  if(kind==='repeat')value.archetypeReading=prose('same','same',1).repeat(15);
  return {...ai,text:JSON.stringify(value)};
 });
 await start();expect(Object.keys(docs[0].metadata.celestialDelivery.delivery.parts)).toEqual(['1','2','3']);
 await resume();await resume();await resume();expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(13);
});
test('historical completed archives reopen without a new length gate or provider call',async()=>{
 docs.push({userId:user,executionKey:'legacy-execution',reportType:'celestialHarmony',featureKey:'tarot-celestial-harmony',reportId:body.reportId,status:'success',premiumStatus:'completed',metadata:{result:{summary:{overallTheme:'historical short report'},cards:body.cards,payment:{reportId:body.reportId}}}});
 const response=await start();expect(response.status).toBe(200);expect((await response.json()).result.summary.overallTheme).toBe('historical short report');expect(provider).not.toHaveBeenCalled();
});
test('provider overrides retain the short-call token and time ceiling',async()=>{
 const {generateCelestialWave}=await import('../../worker/lib/celestial-report-delivery.js');await start();
 const snapshot=docs[0].metadata.celestialDelivery;
 await generateCelestialWave({CELESTIAL_HARMONY_PROVIDER_TIMEOUT_MS:'90000',CELESTIAL_HARMONY_MAX_OUTPUT_TOKENS:'24000',CELESTIAL_HARMONY_TEMPERATURE:'0.4'},snapshot,async()=>{});
 expect(provider.mock.calls.at(-1)[2]).toMatchObject({timeoutMs:45000,maxOutputTokens:11000,temperature:0.4});
});
