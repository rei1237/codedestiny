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
 const lines=Array.from({length:65},(_,i)=>`${label} ${i}번째 해석은 세 형상의 관계에 비추어 지금의 선택을 검토하는 과정이며 확정된 사건을 예언하지 않습니다. ${label} ${i}번째 관찰에서는 생활 속 조건과 실천의 결과를 기록하며 자신에게 맞는 방향을 선택할 수 있습니다.`);const body=label==='summary'?Array.from({length:10},(_,g)=>lines.slice(g*7,(g+1)*7).join(' ')).filter(Boolean).join('\n\n'):lines.join('\n\n');return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const original=()=>({requestId:'original-paid-mindscan',transactionId:'paid-'+mode,question:'어떤 선택을 하는 것이 좋을까요?',pairs:Array.from({length:5},(_,i)=>({slot:i+1,positionId:['top','left','center','right','bottom'][i],mainCardId:i,subCardId:i+5}))});
const post=body=>route(new Request('https://mock.test/api/tarot/mindscan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
const finish=async()=>{let result;for(let i=0;i<8;i++){result=await resume();if(result.status!==202)return result;}return result;};
test.each(['pass','monthly','single'])('%s saves and reopens all twenty-five parts without regeneration',async pay=>{mode=pay;expect((await start()).status).toBe(202);const result=await finish();expect(result.status).toBe(200);const data=await result.json();expect(data.saved).toBe(true);expect(data.source).toBe('llm');expect(provider).toHaveBeenCalledTimes(25);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(25);expect(proofs.every(p=>p.requestId===original().requestId)).toBe(true);});
test.each(['pass','monthly','single'].flatMap(pay=>['throw','null','confirm'].map(kind=>[pay,kind])))('%s final storage %s retains generated parts',async(pay,kind)=>{mode=pay;await start();fault={kind};const failed=await finish();expect(failed.status).toBe(503);expect(await failed.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(25);});
test.each(['throw','null','confirm'])('checkpoint %s stops before provider',async kind=>{fault={kind,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(202);});
test.each(['short','missing','wrong-facts','truncated','interrupted','mock'])('%s never becomes a completed fallback',async kind=>{const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(kind==='interrupted')throw Error('lost');const ai=await base(...args),value=JSON.parse(ai.text);if(kind==='short')value.body='짧음';if(kind==='missing')delete value.body;if(kind==='wrong-facts')value.evidenceHash='wrong';return {...ai,truncated:kind==='truncated',isMock:kind==='mock',text:JSON.stringify(value)};});expect((await start()).status).toBe(202);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(26);});
test('original owner, input and revoked/denied evidence are enforced',async()=>{mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='pass';await start();userId='other';expect((await resume()).status).toBe(404);userId=owner;expect((await post({...original(),question:'변경한 질문입니다.'})).status).toBe(409);mode='denied';expect((await resume()).status).toBe(402);mode='pass';revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);});
test('concurrent original requests share a lease and retain original locale',async()=>{const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const hold=new Promise(resolve=>release=resolve),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await hold;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&provider.mock.calls.length<4;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();await first;expect(locales).toEqual(['ja','ja','ja','ja']);const pending=await route(new Request('https://mock.test/api/tarot/mindscan-result'),{});expect(pending.status).toBe(202);expect((await pending.json()).locale).toBe('ja');expect(provider).toHaveBeenCalledTimes(4);});
test('provider interruptions have three attempts per part without false refund or completion',async()=>{provider.mockResolvedValue({ok:false});await start();for(let i=0;i<20;i++)await resume();expect(provider).toHaveBeenCalledTimes(75);expect(docs[0].status).toBe('pending');expect(Object.values(docs[0].metadata.paidNarrative.attempts).every(n=>n===3)).toBe(true);});

test('invalid card is rejected before provider and storage',async()=>{expect((await post({...original(),pairs:original().pairs.map((pair,i)=>i?pair:{...pair,mainCardId:'INVALID'})})).status).toBe(400);expect(docs).toHaveLength(0);expect(provider).not.toHaveBeenCalled();});
test('unavailable payment lookup is 503 and never generates',async()=>{mode='unavailable';expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();});

test.each([401,403,503])('authentication status %s prevents provider calls',async status=>{authError=Object.assign(Error('auth'),{status});expect((await start()).status).toBe(status);expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);});

test('all seven derived positions retain original cards, orientation and complete generated fields',async()=>{await start();const data=await (await finish()).json();expect(data.reading.sections).toHaveLength(7);const state=docs[0].metadata.paidNarrative;for(let i=0;i<7;i++){expect(data.reading.sections[i].orientation).toBe(state.base.sections[i].orientation);for(const key of ['cardMeaning','positionMeaning','emotionalReading','hiddenMessage','caution','advice'])expect(data.reading.sections[i][key]).toBeTruthy();}expect(data.reading.summaryCard.recommendedAction).toBeTruthy();});
