/** @jest-environment node */
import { jest } from '@jest/globals';
let route,docs,provider,revoked,userId,fault,lost,external,kind,mode;
let serial=0;let owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
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
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:async(_env,input)=>{proofs.push(input);return {proven:mode==='denied'?false:true,source:mode};},logPerUsePaymentProof:()=>{}}));
 jest.unstable_mockModule('../../worker/lib/cms-prompts.js',()=>({cmsPromptText:async(_env,_key,fallback)=>fallback}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({...structured,callGeminiJsonWithRetry:(...args)=>provider(...args)}));
 ({handleAnimalTotemRoutes:route}=await import('../../worker/routes/animal-totem.js'));
});
let proofs=[];
const prose=(label,n)=>Array.from({length:n},(_,i)=>`${label} ${i}번째 상황에서는 자신의 감정을 살피고 대화의 속도와 생활의 리듬을 확인하며 서로에게 필요한 간격을 선택해 보세요.`).join('\n\n');
beforeEach(()=>{docs=[];revoked=false;owner='64b7f2a1c3d4e5f6'+String(++serial).padStart(8,'0');userId=owner;fault=null;lost=false;kind='three';mode='pass';proofs=[];
 provider=jest.fn(async(_env,_prompt,options)=>{expect(options.attempts).toBe(1);expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
 const input=docs[0].metadata.paidNarrative.input;
 return {ok:true,provider:'gemini',text:JSON.stringify({opening:prose('시작',2),question_answer:prose('본문',30),closing:prose('맺음',2),card_bridges:input.cards.map(card=>({slot:card.slot,line:prose(card.animalName,1)})),action_plan:[prose('메모',1),prose('산책',1),prose('휴식',1)],shadow_gift_synthesis:input.mode==='five'?prose('통합',3):''})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const slots={one:['today_guide'],three:['past_wound','present_energy','integration_path'],five:['mind','heart','shadow','gift','next_action']};
const ids=['cat','squirrel','bluebird','puppy','rabbit'];
const original=()=>({mode:kind,requestId:'original-paid-request',transactionId:'paid-'+mode,question:'관계에서 나를 지키는 방법',cards:slots[kind].map((slot,i)=>({slot,animalId:ids[i],essence:'관찰과 여유',actions:['산책하기']}))});
const post=body=>route(new Request('https://mock.test/api/animal-totem/reading',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({mode:kind,resumeResultId:docs[0].executionKey});
const getResult=()=>route(new Request('https://mock.test/api/animal-totem/result?mode='+kind),{});
test.each(['one','three','five'].flatMap(kind=>['pass','monthly','single'].map(mode=>[kind,mode])))('%s %s persists the complete LLM narrative and reuses the same result',async(type,access)=>{
 kind=type;mode=access;const response=await start();expect(response.status).toBe(200);expect(await response.json()).toMatchObject({saved:true,status:'completed',source:'llm'});expect((await start()).status).toBe(200);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(1);expect(proofs.every(proof=>proof.requestId==='original-paid-request')).toBe(true);
});
test.each(['pass','monthly','single'].flatMap(mode=>['throw','null','confirm'].map(fault=>[mode,fault])))('%s final storage %s returns 503 and retries without another provider call',async(access,fail)=>{
 mode=access;fault={kind:fail};const response=await start();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(1);
});
test.each(['throw','null','confirm'])('checkpoint %s stops before provider execution',async fail=>{
 fault={kind:fail,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(200);
});
test.each(['short','missing','wrong-slot','invented-animal','interrupted','truncated'])('%s is pending and never a completed template',async fail=>{
 const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(fail==='interrupted')throw Error('lost');const ai=await base(...args),value=JSON.parse(ai.text);if(fail==='short')value.question_answer='짧음';if(fail==='missing')delete value.action_plan;if(fail==='wrong-slot')value.card_bridges[0].slot='invented';if(fail==='invented-animal')value.closing=prose('호랑이',2);return {...ai,truncated:fail==='truncated',text:JSON.stringify(value)};});
 const first=await start();expect(first.status).toBe(202);expect(await first.json()).toMatchObject({source:'pending',narrative:null,saved:false});expect((await getResult()).status).toBe(202);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(2);
});
test('three attempts are bounded and preserve a pending result without refund',async()=>{
 provider.mockImplementation(async()=>({ok:false}));await start();await resume();const result=await resume();expect(result.status).toBe(202);expect(await result.json()).toMatchObject({retryable:false});await resume();expect(provider).toHaveBeenCalledTimes(3);expect(docs[0].status).toBe('pending');
});
test('ownership, product, changed input and revoked proofs are enforced',async()=>{
 await start();userId='another';expect((await resume()).status).toBe(404);userId=owner;kind='five';expect((await resume()).status).toBe(404);kind='three';expect((await post({...original(),question:'다른 질문'})).status).toBe(409);revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(1);
});
test('initial and resumed payment rejection prevent provider execution',async()=>{
 mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='single';await start();mode='denied';expect((await resume()).status).toBe(402);expect(provider).toHaveBeenCalledTimes(1);
});
test('concurrent requests share the lease and original locale',async()=>{
 const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const pause=new Promise(resolve=>{release=resolve;}),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await pause;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&!provider.mock.calls.length;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();expect((await first).status).toBe(200);expect(provider).toHaveBeenCalledTimes(1);expect(locales).toEqual(['ja']);
});
