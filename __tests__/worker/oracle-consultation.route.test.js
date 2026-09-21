/** @jest-environment node */
import { jest } from '@jest/globals';
let route,docs,provider,revoked,userId,fault,lost,external,kind,mode,authError;
let owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);}
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
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>{if(authError)throw authError;return {userId};}}));
 jest.unstable_mockModule('../../worker/lib/paid-feature-access.js',()=>({PAID_FEATURE_ACCESS_USER_PROJECTION:{},canAccessPaidFeature:async()=>({allowed:mode==='pass'})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({logPerUsePaymentProof:()=>{},verifyPerUsePayment:async(_env,body)=>{proofs.push(body);return {proven:mode==='unavailable'?null:mode!=='denied',source:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:(...args)=>provider(...args)}));
 ({handleTarotRoutes:route}=await import('../../worker/routes/tarot.js'));
});
let proofs=[];
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;mode='pass';proofs=[];authError=null;
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
 const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)[1],label=prompt.match(/\[이번 부분 ([^\]]+)\]/)[1].replaceAll('.', '-');
 return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:Array.from({length:65},(_,i)=>`${label} ${i}번째 해석은 세 형상의 관계에 비추어 지금의 선택을 검토하는 과정이며 확정된 사건을 예언하지 않습니다. ${label} ${i}번째 관찰에서는 생활 속 조건과 실천의 결과를 기록하며 자신에게 맞는 방향을 선택할 수 있습니다.`).join('\n\n')})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const original=()=>({requestId:'original-paid-oracle',transactionId:'paid-'+mode,spreadTitle:'세 카드의 흐름',category:'love',question:'어떤 선택을 하는 것이 좋을까요?',cards:[{cardId:'M06',orientation:'upright',positionLabel:'과거'},{cardId:'M00',orientation:'reversed',positionLabel:'현재'},{cardId:'M21',orientation:'upright',positionLabel:'미래'}]});
const post=body=>route(new Request('https://mock.test/api/tarot/oracle-consultation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
const finish=async()=>{let result;for(let i=0;i<8;i++){result=await resume();if(result.status!==202)return result;}return result;};
test.each(['pass','monthly','single'])('%s saves and reopens all seventeen parts without regeneration',async pay=>{mode=pay;expect((await start()).status).toBe(202);const result=await finish();expect(result.status).toBe(200);const data=await result.json();expect(data.saved).toBe(true);expect(data.source).toBe('llm');expect(provider).toHaveBeenCalledTimes(17);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(17);expect(proofs.every(p=>p.requestId===original().requestId)).toBe(true);});
test.each(['pass','monthly','single'].flatMap(pay=>['throw','null','confirm'].map(kind=>[pay,kind])))('%s final storage %s retains generated parts',async(pay,kind)=>{mode=pay;await start();fault={kind};const failed=await finish();expect(failed.status).toBe(503);expect(await failed.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(17);});
test.each(['throw','null','confirm'])('checkpoint %s stops before provider',async kind=>{fault={kind,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(202);});
test.each(['short','missing','wrong-facts','truncated','interrupted','mock'])('%s never becomes a completed fallback',async kind=>{const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(kind==='interrupted')throw Error('lost');const ai=await base(...args),value=JSON.parse(ai.text);if(kind==='short')value.body='짧음';if(kind==='missing')delete value.body;if(kind==='wrong-facts')value.evidenceHash='wrong';return {...ai,truncated:kind==='truncated',isMock:kind==='mock',text:JSON.stringify(value)};});expect((await start()).status).toBe(202);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(18);});
test('original owner, input and revoked/denied evidence are enforced',async()=>{mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='pass';await start();userId='other';expect((await resume()).status).toBe(404);userId=owner;expect((await post({...original(),question:'변경한 질문입니다.'})).status).toBe(409);mode='denied';expect((await resume()).status).toBe(402);mode='pass';revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);});
test('concurrent original requests share a lease and retain original locale',async()=>{const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const hold=new Promise(resolve=>release=resolve),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await hold;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&provider.mock.calls.length<4;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();await first;expect(locales).toEqual(['ja','ja','ja','ja']);const pending=await route(new Request('https://mock.test/api/tarot/oracle-result'),{});expect(pending.status).toBe(202);expect((await pending.json()).locale).toBe('ja');expect(provider).toHaveBeenCalledTimes(4);});
test('provider interruptions have three attempts per part without false refund or completion',async()=>{provider.mockResolvedValue({ok:false});await start();for(let i=0;i<17;i++)await resume();expect(provider).toHaveBeenCalledTimes(51);expect(docs[0].status).toBe('pending');expect(Object.values(docs[0].metadata.paidNarrative.attempts).every(n=>n===3)).toBe(true);});

test.each([1,4,7,10,14])('card count %s preserves canonical positions and tier on resume',async count=>{
 const body={...original(),cards:Array.from({length:count},(_,i)=>({cardId:`M${String(i).padStart(2,'0')}`,orientation:i%2?'reversed':'upright',positionLabel:`위치${i+1}`}))};
 mode='single';expect((await post(body)).status).toBe(202);const data=await (await finish()).json();expect(data.status).toBe('completed');expect(data.consultation.positionReadings).toHaveLength(count);expect(data.consultation.positionReadings.every((row,i)=>row.headline===body.cards[i].positionLabel&&row.positionAdvice&&row.reading)).toBe(true);
 expect(proofs.every(proof=>proof.requestId===body.requestId&&proof.featureKey===docs[0].featureKey)).toBe(true);
});
test.each([[8,'tarot-prompt-maker-deep'],[10,'tarot-prompt-maker-deep'],[11,'tarot-prompt-maker-master'],[14,'tarot-prompt-maker-master']])('paid boundary %s selects only %s and preserves every submitted position',async(count,featureKey)=>{
 const body={...original(),requestId:`boundary-${count}`,cards:Array.from({length:count},(_,i)=>({cardId:`M${String(i).padStart(2,'0')}`,orientation:i%2?'reversed':'upright',positionLabel:`경계 위치 ${i+1}`}))};
 mode='single';expect((await post(body)).status).toBe(202);
 const {FEATURE_KEY_PRICE_TABLE}=await import('../../worker/lib/paid-feature-registry.js');
 expect(proofs).toHaveLength(1);expect(proofs[0]).toMatchObject({requestId:body.requestId,featureKey,coinPrice:FEATURE_KEY_PRICE_TABLE[featureKey].cost});
 const completed=await finish();expect(completed.status).toBe(200);const data=await completed.json();
 expect(data.consultation.positionReadings).toHaveLength(count);
 expect(data.consultation.positionReadings.map(row=>row.headline)).toEqual(body.cards.map(card=>card.positionLabel));
 const providerCalls=provider.mock.calls.length;expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(providerCalls);
});
test('invalid card is rejected before payment, provider and storage',async()=>{expect((await post({...original(),cards:[{cardId:'INVALID'}]})).status).toBe(400);expect(docs).toHaveLength(0);expect(proofs).toHaveLength(0);expect(provider).not.toHaveBeenCalled();});
test('unavailable payment lookup is 503 and never generates',async()=>{mode='unavailable';expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();});

test.each([401,403,503])('authentication status %s prevents provider calls',async status=>{authError=Object.assign(Error('auth'),{status});expect((await start()).status).toBe(status);expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);});
test('a lower tier receipt cannot authorize fourteen cards',async()=>{mode='denied';const body={...original(),cards:Array.from({length:14},(_,i)=>({cardId:`M${String(i).padStart(2,'0')}`,orientation:'upright'}))};expect((await post(body)).status).toBe(402);expect(proofs[0].featureKey).toBe('tarot-prompt-maker-master');const {FEATURE_KEY_PRICE_TABLE}=await import('../../worker/lib/paid-feature-registry.js');expect(proofs[0].coinPrice).toBe(FEATURE_KEY_PRICE_TABLE['tarot-prompt-maker-master'].cost);expect(provider).not.toHaveBeenCalled();});
