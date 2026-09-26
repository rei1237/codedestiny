/** @jest-environment node */
import { jest } from '@jest/globals';
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
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,getOptionalUserFromRequest:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/paid-feature-access.js',()=>({PAID_FEATURE_ACCESS_USER_PROJECTION:{},canAccessPaidFeature:async()=>({allowed:false,reason:'PAYMENT_REQUIRED'})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:async(_env,input)=>{proofs.push(input);return {proven:mode==='denied'?false:true,source:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:(...args)=>provider(...args)}));
 ({handleDreamRoutes:route}=await import('../../worker/routes/dream.js'));
});
let proofs=[];
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;mode='pass';proofs=[];
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);expect(options.thinkingBudget).toBe(0);
 const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)[1],label=prompt.split('[이번 호출]\n')[1].split('\n')[0].replace(/[.!?]/g,'');
 return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:Array.from({length:25},(_,i)=>`${label} ${i}번째 관찰에서는 꿈의 장면과 마음의 리듬을 함께 살펴보며 안정과 회복의 조건을 확인할 수 있습니다. ${label} ${i}번째 성찰은 현실에서 경험한 감정과 꿈속 표현의 차이를 기록하고 여러 가능한 의미를 비교해 보는 방법입니다.`).join('\n\n')})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const original=()=>({requestId:'original-paid-dream',transactionId:'paid-'+mode,dreamText:'따뜻한 봄 햇살 아래에서 친구를 만나 행복하고 평온했던 꿈입니다.',intake:{desiredOutcome:'마음을 이해하기',relationshipContext:'오래된 친구'}});
const post=body=>route(new Request('https://mock.test/api/dream/psycho-analysis',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
async function finish(){let response;for(let i=0;i<8;i++){response=await resume();if(response.status!==202)break;}return response;}
test.each(['pass','monthly','single'])('%s creates five saved chapters and reopens without new generation',async access=>{
 mode=access;expect((await start()).status).toBe(202);const response=await finish();expect(response.status).toBe(200);const data=await response.json();expect(data).toMatchObject({status:'completed',saved:true,quality:{ok:true,fallbackUsed:false}});expect(data.chapters).toHaveLength(5);expect(data.record.markdown).toContain('Chapter 5. 현실 조언과 치유의 방향');expect(provider).toHaveBeenCalledTimes(10);expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(10);expect(proofs.every(proof=>proof.requestId==='original-paid-dream'&&proof.coinPrice===30)).toBe(true);
});
test.each(['pass','monthly','single'].flatMap(mode=>['throw','null','confirm'].map(fault=>[mode,fault])))('%s final save %s reuses all chapters without regeneration',async(access,fail)=>{
 mode=access;await start();fault={kind:fail};const response=await finish();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true,ok:false,resultId:docs[0].executionKey});const calls=provider.mock.calls.length;expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(calls);
});
test.each(['throw','null','confirm'])('checkpoint %s stops before any provider call',async fail=>{
 fault={kind:fail,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(202);
});
test.each(['short','missing','wrong-facts','truncated','interrupted','mock','tone'])('%s chapter remains pending while valid parts are preserved',async fail=>{
 const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(fail==='interrupted')throw Error('network lost');const ai=await base(...args),value=JSON.parse(ai.text);if(fail==='short')value.body='짧음';if(fail==='missing')delete value.body;if(fail==='wrong-facts')value.evidenceHash='wrong';if(fail==='tone')value.body=value.body.replaceAll('안정과 회복','불안과 붕괴');return {...ai,truncated:fail==='truncated',isMock:fail==='mock',text:JSON.stringify(value)};});
 expect((await start()).status).toBe(202);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(11);
});
test('owner, input, revoked payment and rejected new/resumed access are enforced',async()=>{
 mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='pass';await start();userId='other';expect((await resume()).status).toBe(404);userId=owner;expect((await post({...original(),dreamText:'달라진 꿈의 내용을 적어 봅니다.'})).status).toBe(409);mode='denied';expect((await resume()).status).toBe(402);mode='pass';revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);
});
test('server pending lookup, original locale and concurrent requests preserve the same four provider calls',async()=>{
 const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const pause=new Promise(resolve=>{release=resolve;}),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await pause;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&provider.mock.calls.length<4;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();await first;expect(locales).toEqual(['ja','ja','ja','ja']);const response=await route(new Request('https://mock.test/api/dream/psycho-result'),{});expect(response.status).toBe(202);expect((await response.json()).record.markdown).toContain('Chapter 1.');expect(provider).toHaveBeenCalledTimes(4);
});
test('unknown interruption has a per-part three-call limit without false completion or refund',async()=>{
 provider.mockImplementation(async()=>({ok:false}));await start();for(let i=0;i<10;i++)await resume();expect(provider).toHaveBeenCalledTimes(30);expect(Object.values(docs[0].metadata.paidNarrative.attempts).every(count=>count===3)).toBe(true);expect(docs[0].status).toBe('pending');expect(docs[0].premiumStatus).toBe('generating');
});

test('provider model override, bounded timeout and original intake survive checkpointing',async()=>{
 const response=await route(new Request('https://mock.test/api/dream/psycho-analysis',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(original())}),{DREAM_PSYCHO_GEMINI_MODEL:'configured-model',DREAM_PSYCHO_PROVIDER_TIMEOUT_MS:999999});
 expect(response.status).toBe(202);expect(provider.mock.calls[0][1]).toContain('오래된 친구');expect(provider.mock.calls[0][2]).toMatchObject({model:'configured-model',timeoutMs:45000,thinkingBudget:0,maxOutputTokens:9500});
});
