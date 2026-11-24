/** @jest-environment node */
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let route, settleStuck, docs, provider, accessMode, revoked, userId, fault, fetchBlock, calls, lost, failExecution;
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
  // Mongoose timestamps add $set.updatedAt to every update; MongoDB rejects the same path in $setOnInsert (code 40).
  if(update.$setOnInsert&&'updatedAt'in update.$setOnInsert)throw Object.assign(Error('ConflictingUpdateOperators'),{code:40});
  if(fault&&(fault.metadata?Boolean(update.$set?.metadata):update.$set?.premiumStatus===fault.status)){const failure=fault;fault=null;if(failure.kind==='throw')throw Error('storage');if(failure.kind==='null')return query(null);if(failure.kind==='confirm')lost=true;}
  let doc=docs.find(doc=>matches(doc,filter));
  if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}
  if(doc){patch(doc,update.$set||{});doc.updatedAt=new Date();}return query(doc||null);
 },
 updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};},
};
function prose(id,field,count=14){return Array.from({length:count},(_,n)=>`${id} ${field} ${n}번째 카드의 상징을 실제 생활 속에서 받아들이는 조건과 서로 다른 반응을 살펴봅니다. ${id} ${field} ${n}번째 선택을 단정하기보다 대화를 통해 판단할 근거를 확인합니다.`).join('\n');}
// 본문은 계산된 카드·행성을 실제로 인용해야 통과한다(prompt의 cards= 줄이 유일한 출처).
function drawn(prompt,id){const found=prompt.match(new RegExp(`\\[${Number(id)+1}\\] ([^-]+) - ([^/|]+) / `));return `${found[1].trim()} 자리에서 ${found[2].trim()} 카드가 열립니다. `;}
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>({ok:true,accessType:accessMode,matchedTransactionId:'64b7f2a1c3d4e5f60123abcd'})}));
 const execution=await import('../../worker/lib/service-execution-task.js');
 jest.unstable_mockModule('../../worker/lib/service-execution-task.js',()=>({...execution,failServiceExecution:(...args)=>failExecution(...args)}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,
  PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)},
 }));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({handleCelestialHarmonyRoutes:route,settleStuckDelivery:settleStuck}=await import('../../worker/routes/celestial-harmony.js'));
});
beforeEach(()=>{docs=[];accessMode='pass';revoked=false;userId=user;fault=null;calls=[];lost=false;
 failExecution=jest.fn(async(_env,_user,payload)=>{const doc=docs.find(item=>item.executionKey===payload.executionKey);if(doc.lock?.token)throw Error('settlement needs a released lock');doc.status='refunded';return {ok:true,status:200,execution:{status:'refunded'},settlement:{ok:true,status:'refunded'}};});
 provider=jest.fn(async(_env,prompt,options)=>{
  expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);const id=options.logContext.sectionGroup;calls.push(id);
  let value;
  if(id==='summary'){
   value=Object.fromEntries(['overallTheme','strongestPlanetSignal','deepestShadow','soulLesson','integrationPath','finalOracle'].map(field=>[field,prose(id,field,20)]));
   value.insightMatrix=Object.fromEntries(['love','work','money','health'].map(field=>[field,prose(id,'matrix'+field,2)]));
   value.closingFortune=Object.fromEntries(['overall','love','work','money','health'].map(field=>[field,prose(id,'closing'+field,6)]));
   for(const field of ['planetHighlights','practices','ritualPlan'])value[field]=Array.from({length:3},(_,i)=>prose(id,field+i,1));
  }else{
   const evidence=JSON.parse(prompt.match(/대신 다음 단일 객체만 출력하세요\. (\{.*\})\./)[1]).evidence,cite=drawn(prompt,id);
   value={evidence,...Object.fromEntries(['cardMeaning','planetMeaning','archetypeReading','consciousMessage','unconsciousPattern','shadowWarning','soulLesson','integrationPractice'].map(field=>[field,cite+prose(id,field)]))};
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
 expect(docs[0].retentionUntil).toBeNull();
});
test('original locale survives a differently localized resume request',async()=>{
 const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');const locales=[],base=provider.getMockImplementation();provider.mockImplementation((...args)=>{locales.push(getAmbientAiLocale());return base(...args);});
 await runWithAiLocale('en',()=>start());await runWithAiLocale('ko',()=>resume());await runWithAiLocale('ja',()=>resume());
 expect(docs[0].premiumStatus).toBe('completed');expect(locales).toEqual(Array(12).fill('en'));
});
test.each(['fact','repeat'])('%s metadata is repaired locally while unusable repeated content gets one retry',async kind=>{
 const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{
  const ai=await base(...args),value=JSON.parse(ai.text);
  if(kind==='fact')value.evidence.planetId='invented';
  if(kind==='repeat')value.archetypeReading=prose('same','same',1).repeat(15);
  return {...ai,text:JSON.stringify(value)};
 });
 await start();expect(Object.keys(docs[0].metadata.celestialDelivery.delivery.parts)).toEqual(kind==='fact'?['0','1','2','3']:['1','2','3']);
 await resume();await resume();await resume();expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(kind==='fact'?12:13);
});
test('historical completed archives reopen without a new length gate or provider call',async()=>{
 docs.push({userId:user,executionKey:'legacy-execution',reportType:'celestialHarmony',featureKey:'tarot-celestial-harmony',reportId:body.reportId,status:'success',premiumStatus:'completed',metadata:{result:{summary:{overallTheme:'historical short report'},cards:body.cards,payment:{reportId:body.reportId}}}});
 const response=await start();expect(response.status).toBe(200);expect((await response.json()).result.summary.overallTheme).toBe('historical short report');expect(provider).not.toHaveBeenCalled();
});
test('provider overrides retain the short-call token and time ceiling',async()=>{
 const {generateCelestialWave}=await import('../../worker/lib/celestial-report-delivery.js');await start();
 const snapshot=docs[0].metadata.celestialDelivery;
 await generateCelestialWave({CELESTIAL_HARMONY_PROVIDER_TIMEOUT_MS:'90000',CELESTIAL_HARMONY_MAX_OUTPUT_TOKENS:'24000',CELESTIAL_HARMONY_TEMPERATURE:'0.4'},snapshot,async()=>{});
 expect(provider.mock.calls.at(-1)[2]).toMatchObject({timeoutMs:45000,maxOutputTokens:7000,temperature:0.4});
});
// A card whose six long fields are present but under 100 characters is a draft, not a failure.
const shorten=async(base,args,tag)=>{const ai=await base(...args),value=JSON.parse(ai.text);value.archetypeReading=fit(drawn(args[1],args[2].logContext.sectionGroup)+prose(tag,'archetype',1),60);return {...ai,text:JSON.stringify(value)};};
// 필드 길이를 공백 제외 정확히 n자로 맞춘다. 앞머리에 카드 인용이 들어가도 n은 유지된다.
const fit=(value,n)=>{let out='',count=0;for(const ch of value){if(count===n)break;out+=ch;if(!/\s/.test(ch))count++;}if(count<n)throw Error('fixture too short');return out;};
const BODY=['archetypeReading','consciousMessage','unconsciousPattern','shadowWarning','soulLesson','integrationPractice'];
const sized=(base,chars)=>async(...args)=>{const ai=await base(...args),id=args[2].logContext.sectionGroup;if(id==='summary')return ai;const value=JSON.parse(ai.text);for(const field of BODY)value[field]=fit(value[field],field==='archetypeReading'&&id==='0'?chars:120);return {...ai,text:JSON.stringify(value)};};
test('accepts a report with 11 cards at 120-char fields',async()=>{
 provider.mockImplementation(sized(provider.getMockImplementation(),120));
 await start();await resume();await resume();expect((await resume()).status).toBe(200);
 const state=docs[0].metadata.celestialDelivery.delivery;
 expect(docs[0].premiumStatus).toBe('completed');expect(Object.keys(state.parts)).toHaveLength(12);
 expect(Array.from({length:11},(_,i)=>state.short[String(i)])).toEqual(Array(11).fill(false));
});
// 전달 우선: 하한 미달은 초안 보완이나 환불이 아니라 짧은 완결본으로 저장한다.
test('delivers a field under the 100-char floor as a short part, without repair or refund',async()=>{
 provider.mockImplementation(sized(provider.getMockImplementation(),99));
 await start();await resume();await resume();expect((await resume()).status).toBe(200);
 const state=docs[0].metadata.celestialDelivery.delivery;
 expect(state.short['0']).toBe(true);expect(state.short['1']).toBe(false);expect(state.attempts['0:lengthRepair']).toBeUndefined();
 expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(12);
});
test('prompt asks for 130-150 chars per field',async()=>{
 await start();const prompt=provider.mock.calls.find(call=>call[2].logContext.sectionGroup==='0')[1];
 expect(prompt).toContain('목표 130~150자');expect(prompt).toContain('120자 이상');
 expect(prompt).not.toContain('500자');expect(prompt).not.toContain('650~750');
});
test('a short valid card is final on its first generation',async()=>{
 const base=provider.getMockImplementation();let repairPrompt='';
 provider.mockImplementation(async(...args)=>{
  if(args[2].logContext.sectionGroup!=='0')return base(...args);
  if(args[1].includes('[저장된 초안 보완]')){repairPrompt=args[1];return base(...args);}
  return shorten(base,args,'draft');
 });
 await start();const state=docs[0].metadata.celestialDelivery.delivery;
 expect(Object.keys(state.parts)).toEqual(['0','1','2','3']);expect(state.short['0']).toBe(true);
 await resume();await resume();expect((await resume()).status).toBe(200);
 expect(repairPrompt).toBe('');expect(docs[0].metadata.celestialDelivery.delivery.short['0']).toBe(true);
 expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(12);
});
test('rereading a short card never generates a length repair',async()=>{
 const base=provider.getMockImplementation();
 provider.mockImplementation(async(...args)=>args[2].logContext.sectionGroup==='0'?shorten(base,args,args[1].includes('[저장된 초안 보완]')?'repair longer text':'draft'):base(...args));
 await start();await resume();await resume();expect((await resume()).status).toBe(200);
 const state=docs[0].metadata.celestialDelivery.delivery;
 expect(state.attempts['0']).toBe(1);expect(state.attempts['0:lengthRepair']).toBeUndefined();expect(state.parts['0'].archetypeReading).toContain('draft');
 expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(12);
});
test('a usable complete report below the target is delivered without extra calls',async()=>{
 const base=provider.getMockImplementation();
 provider.mockImplementation(async(...args)=>{
  const ai=await base(...args),value=JSON.parse(ai.text),id=args[2].logContext.sectionGroup,tag='t'+id;
  if(id==='summary'){for(const field of ['overallTheme','strongestPlanetSignal','deepestShadow','soulLesson','integrationPath','finalOracle'])value[field]=prose(tag,field,1);}
  else for(const field of ['archetypeReading','consciousMessage','unconsciousPattern','shadowWarning','soulLesson','integrationPractice'])value[field]=(field==='archetypeReading'?drawn(args[1],id):'')+prose(tag,field,1);
  return {...ai,text:JSON.stringify(value)};
 });
 let last=await start();for(let n=0;n<10;n++)last=await resume();
 expect(Object.keys(docs[0].metadata.celestialDelivery.delivery.parts)).toEqual(Array.from({length:11},(_,i)=>String(i)).concat("summary"));
 expect(last.status).toBe(200);expect(await last.json()).toMatchObject({archiveSaved:true});
 expect(provider).toHaveBeenCalledTimes(12);expect(docs[0].premiumStatus).toBe('completed');
 await resume();expect(provider).toHaveBeenCalledTimes(12);
});

test('Toss uses the full web provider contract, checkpoints and original saved chapters',async()=>{
  const {generateTarotLibraryResult}=await import('../../worker/toss/tarot-library-generator.js');
  const input={question:'',cards:body.cards,goldenCardId:'M00'};
  const featureId='tarot-celestial-harmony',execution={orderId:'01900000-1111-7111-8111-000000000042',requestId:'toss-tarot:01900000-1111-7111-8111-000000000042',featureId};
  const options={env:{TAROT_CONSUMER_FACTS_V1:'true'},execution,owner:userId,verify:async()=>{},checkpoint:async state=>{execution.tossTarotCheckpoint=structuredClone(state);}};
  let result;
  for(let wave=0;wave<10;wave++){
    result=await generateTarotLibraryResult(featureId,input,options);
    if(!result.pending)break;
    expect(result.retryable).toBe(true);
  }
  expect(result.flowId).toBe(featureId);
  expect(result.reading.goldenCard.code).toBe('M00');
  expect(execution.tossTarotCheckpoint.prompt).toContain('The Fool');
  expect(result.cards).toHaveLength(11);
  expect(result.presentation.sections.length).toBeGreaterThanOrEqual(11);
  expect(result.presentation.sections.map(section=>section.body).join('').length).toBeGreaterThan(5000);
  const before=calls.length;
  expect((await generateTarotLibraryResult(featureId,input,options)).presentation).toEqual(result.presentation);
  expect(calls).toHaveLength(before);
});

// 2026-11-18 S5: 토스 경로도 한 파트가 두 번 실패했다고 검수 보류로 멈추지 않는다.
// 남은 파트를 끝까지 시도하고, 저장된 파트가 있으면 건너뛴 채 전달, 하나도 없을 때만 생성 실패로 닫는다.
const tossRun=async()=>{
 const {generateTarotLibraryResult}=await import('../../worker/toss/tarot-library-generator.js');
 const input={question:'',cards:body.cards,goldenCardId:'M00'},featureId='tarot-celestial-harmony';
 const execution={orderId:'01900000-1111-7111-8111-000000000043',requestId:'toss-tarot:01900000-1111-7111-8111-000000000043',featureId};
 const options={env:{TAROT_CONSUMER_FACTS_V1:'true'},execution,owner:userId,verify:async()=>{},checkpoint:async state=>{execution.tossTarotCheckpoint=structuredClone(state);}};
 const replies=[];
 for(let wave=0;wave<20;wave++){
  try{const result=await generateTarotLibraryResult(featureId,input,options);replies.push(result);if(!result.pending)break;}
  catch(error){replies.push({error});break;}
 }
 return replies;
};
test('Toss: a part failing both attempts is skipped and the saved parts are delivered',async()=>{
 const base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>args[2].logContext.sectionGroup==='5'?{ok:false,provider:'gemini',text:''}:base(...args));
 const replies=await tossRun();
 expect(replies.slice(0,-1).every(reply=>reply.pending===true&&reply.retryable===true)).toBe(true);
 const last=replies.at(-1);expect(last.error).toBeUndefined();expect(last.pending).toBeUndefined();
 expect(last.reading.meta).toMatchObject({deliveryStatus:'completed',skippedParts:['5']});
 expect(provider).toHaveBeenCalledTimes(13);
});
test('Toss: when no part could be generated the delivery fails instead of pausing for review',async()=>{
 provider.mockImplementation(async()=>({ok:false,provider:'gemini',text:''}));
 const replies=await tossRun();
 expect(replies.slice(0,-1).every(reply=>reply.pending===true&&reply.retryable===true)).toBe(true);
 expect(replies.at(-1).error?.code).toBe('CELESTIAL_GENERATION_FAILED');
 expect(provider).toHaveBeenCalledTimes(24);
});
// 2026-11-18 S3-K: 파트가 두 번 다 실패해도 partial 202 로 영구히 남지 않는다.
// 저장된 파트가 있으면 빈 파트를 건너뛰고 전달하고, 하나도 없을 때만 생성 실패로 닫으며 자동 환불한다.
const until=async(stop,limit=40)=>{const replies=[];let reply=await start();for(let n=0;n<limit;n++){const data=await reply.clone().json();replies.push({status:reply.status,data});if(stop(reply.status))break;reply=await resume();}return replies;};
test('a part that fails both attempts is skipped and the saved parts are delivered without a refund',async()=>{
 const base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>args[2].logContext.sectionGroup==='5'?{ok:false,provider:'gemini',text:''}:base(...args));
 const replies=await until(status=>status!==202);
 expect(replies.filter(reply=>reply.status===202).every(reply=>reply.data.retryable===true)).toBe(true);
 expect(replies.at(-1)).toMatchObject({status:200,data:{ok:true,archiveSaved:true}});
 expect(replies.at(-1).data.result.meta).toMatchObject({deliveryStatus:'completed',skippedParts:['5']});
 expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(13);expect(failExecution).not.toHaveBeenCalled();
});
test('when no part could be generated the request closes as generation_failed with an automatic refund',async()=>{
 accessMode='single';provider.mockImplementation(async()=>({ok:false,provider:'gemini',text:''}));
 const replies=await until(status=>status!==202);
 expect(replies.slice(0,-1).every(reply=>reply.status===202&&reply.data.retryable===true)).toBe(true);
 expect(replies.at(-1)).toMatchObject({status:503,data:{ok:false,retryable:false,code:'CELESTIAL_GENERATION_FAILED',refunded:true,resultId:docs[0].executionKey}});
 expect(provider).toHaveBeenCalledTimes(24);expect(failExecution).toHaveBeenCalledTimes(1);
 expect(failExecution.mock.calls[0][2]).toMatchObject({executionKey:docs[0].executionKey,forceRefundOnClose:true});
 expect(docs[0]).toMatchObject({sourceTransactionId:'64b7f2a1c3d4e5f60123abcd',cost:50,metadata:{billing:{requestId:body.requestId,reportId:body.reportId}}});
 const again=await resume();expect(again.status).toBe(503);expect(await again.json()).toMatchObject({code:'CELESTIAL_GENERATION_FAILED',refunded:true});
 const restored=await route(new Request('https://mock.test/api/celestial-harmony?resumeResultId='+encodeURIComponent(docs[0].executionKey)),{});
 expect(restored.status).toBe(503);expect(await restored.json()).toMatchObject({code:'CELESTIAL_GENERATION_FAILED',retryable:false});
 expect(provider).toHaveBeenCalledTimes(24);expect(failExecution).toHaveBeenCalledTimes(1);
});
test('a refund that could not settle is retried by the next request instead of staying open',async()=>{
 provider.mockImplementation(async()=>({ok:false,provider:'gemini',text:''}));const settle=failExecution.getMockImplementation();
 failExecution.mockImplementationOnce(async()=>{throw Error('settlement storage');});
 const replies=await until(status=>status!==202);
 expect(replies.at(-1)).toMatchObject({status:503,data:{code:'CELESTIAL_GENERATION_FAILED',refunded:false}});expect(docs[0].status).toBe('pending');
 failExecution.mockImplementation(settle);
 const retried=await resume();expect(await retried.json()).toMatchObject({code:'CELESTIAL_GENERATION_FAILED',refunded:true});
 expect(failExecution).toHaveBeenCalledTimes(2);expect(provider).toHaveBeenCalledTimes(24);
});
// 2026-11-24 정체 자동 확정: 복구 크론이 진전 없는 건을 넘기면 저장된 카드가 없는 결제 건은 소진 종결과 같은 증빙을 남기고 즉시 자동 환불한다.
const stuck=(now=Date.now()+3600000)=>settleStuck({},{doc:{userId:user,executionKey:docs[0].executionKey,status:'pending'},now});
test('a stalled checkpoint without a saved card closes with the stored evidence and an automatic refund',async()=>{
 accessMode='single';provider.mockImplementation(async()=>({ok:false,provider:'gemini',text:''}));
 expect((await start()).status).toBe(202);expect(docs[0].metadata.celestialDelivery.delivery.parts).toEqual({});expect(docs[0].sourceTransactionId).toBeUndefined();
 expect(await stuck(Date.now())).toEqual({outcome:'leased'});expect(failExecution).not.toHaveBeenCalled();
 const calls=provider.mock.calls.length;
 expect(await stuck()).toEqual({outcome:'generation_failed',refundStatus:'refunded'});
 expect(failExecution).toHaveBeenCalledTimes(1);expect(failExecution.mock.calls[0][2]).toMatchObject({executionKey:docs[0].executionKey,reasonCode:'CELESTIAL_GENERATION_FAILED',forceRefundOnClose:true});
 expect(docs[0]).toMatchObject({status:'refunded',sourceTransactionId:'64b7f2a1c3d4e5f60123abcd',cost:50,lock:{token:''},metadata:{celestialDelivery:{failed:true},billing:{requestId:body.requestId,reportId:body.reportId}}});
 expect(provider).toHaveBeenCalledTimes(calls);
 const again=await resume();expect(again.status).toBe(503);expect(await again.json()).toMatchObject({code:'CELESTIAL_GENERATION_FAILED',refunded:true});
 expect(await stuck()).toEqual({outcome:'progressed'});expect(failExecution).toHaveBeenCalledTimes(1);
});
test('a stalled refund that could not settle is closed again by the next stuck pass',async()=>{
 provider.mockImplementation(async()=>({ok:false,provider:'gemini',text:''}));await start();const settle=failExecution.getMockImplementation();
 failExecution.mockImplementationOnce(async()=>{throw Error('settlement storage');});
 expect(await stuck()).toEqual({outcome:'generation_failed',refundStatus:'pending'});expect(docs[0]).toMatchObject({status:'pending',metadata:{celestialDelivery:{failed:true}}});
 failExecution.mockImplementation(settle);
 expect(await stuck()).toEqual({outcome:'generation_failed',refundStatus:'refunded'});expect(docs[0].status).toBe('refunded');expect(failExecution).toHaveBeenCalledTimes(2);
});
test.each([['saved cards',()=>{}],['a revoked payment',()=>{revoked=true;}]])('a stalled checkpoint with %s is left to the resume path without a refund',async(_label,arrange)=>{
 await start();arrange();const saved=Object.keys(docs[0].metadata.celestialDelivery.delivery.parts).length;
 if(revoked)docs[0].metadata.celestialDelivery.delivery.parts={};else expect(saved).toBeGreaterThan(0);
 const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});
 try{expect(await stuck()).toEqual({outcome:'unsettled'});expect(warn).toHaveBeenCalledWith('paid_delivery_stuck_unsettled',expect.objectContaining({service:'celestial-harmony'}));}finally{warn.mockRestore();}
 expect(failExecution).not.toHaveBeenCalled();expect(docs[0]).toMatchObject({status:'pending'});expect(docs[0].metadata.celestialDelivery.failed).toBeUndefined();
});
