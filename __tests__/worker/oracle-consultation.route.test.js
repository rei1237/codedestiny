/** @jest-environment node */
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from '@jest/globals';
// Multi-part stress fixture; the default one-part contract has separate coverage.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let route,docs,provider,revoked,userId,fault,lost,external,kind,mode,authError;
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
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>{if(authError)throw authError;return {userId};}}));
 jest.unstable_mockModule('../../worker/lib/paid-feature-access.js',()=>({PAID_FEATURE_ACCESS_USER_PROJECTION:{},canAccessPaidFeature:async()=>({allowed:mode==='pass'})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>withSettle({logPerUsePaymentProof:()=>{},verifyPerUsePayment:async(_env,body)=>{proofs.push(body);return {proven:mode==='unavailable'?null:mode!=='denied',source:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:(...args)=>provider(...args)}));
 ({handleTarotRoutes:route}=await import('../../worker/routes/tarot.js'));
});
let proofs=[];
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;mode='pass';proofs=[];authError=null;
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
 const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)?.[1],label=prompt.match(/\[이번 부분 ([^\]]+)\]/)[1].replaceAll('.', '-');
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
test.each(['short','missing','wrong-facts','truncated','interrupted','mock'])('%s preserves usable raw text and retries only an unusable answer',async kind=>{const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(kind==='interrupted')throw Error('lost');const ai=await base(...args),value=JSON.parse(ai.text);if(kind==='short')value.body='짧음';if(kind==='missing')delete value.body;if(kind==='wrong-facts')value.evidenceHash='wrong';return {...ai,truncated:kind==='truncated',isMock:kind==='mock',text:JSON.stringify(value)};});expect((await start()).status).toBe(202);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(kind==='truncated'?4:3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(kind==='truncated'?17:18);});
test('original owner, input and revoked/denied evidence are enforced',async()=>{mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='pass';await start();userId='other';expect((await resume()).status).toBe(404);userId=owner;expect((await post({...original(),question:'변경한 질문입니다.'})).status).toBe(409);mode='denied';expect((await resume()).status).toBe(402);mode='pass';revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);});
test('concurrent original requests share a lease and retain original locale',async()=>{const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const hold=new Promise(resolve=>release=resolve),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await hold;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&provider.mock.calls.length<4;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();await first;expect(locales).toEqual(['ja','ja','ja','ja']);const pending=await route(new Request('https://mock.test/api/tarot/oracle-result'),{});expect(pending.status).toBe(202);expect((await pending.json()).locale).toBe('ja');expect(provider).toHaveBeenCalledTimes(4);});
test('provider interruptions have two attempts per part without false refund or completion',async()=>{provider.mockResolvedValue({ok:false});await start();for(let i=0;i<17;i++)await resume();expect(provider).toHaveBeenCalledTimes(34);expect(docs[0].status).toBe('pending');expect(Object.values(docs[0].metadata.paidNarrative.attempts).every(n=>n===2)).toBe(true);});

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

// B1a/B1b: no hash to copy, a one-paragraph card is split, the closing part keeps its scope.
test('prompts carry no evidence hash and the closing part is scoped',async()=>{
 await start();await finish();const prompts=provider.mock.calls.map(call=>call[1]);
 expect(prompts.some(prompt=>/[a-f0-9]{64}/.test(prompt))).toBe(false);
 expect(prompts.find(prompt=>prompt.includes('[이번 부분 closingLine]'))).toContain('요약해 다시 쓰지 않고');
});
test('a one-paragraph card answer is split instead of buying it again',async()=>{
 const base=provider.getMockImplementation();
 provider.mockImplementation(async(...args)=>{const ai=await base(...args),value=JSON.parse(ai.text);if(args[1].includes('[이번 부분 card.0.0]'))value.body=value.body.replace(/\n\s*\n/g,' ');return {...ai,text:JSON.stringify(value)};});
 await start();expect((await finish()).status).toBe(200);
 expect(provider.mock.calls.filter(call=>call[1].includes('[이번 부분 card.0.0]'))).toHaveLength(1);
 expect(docs[0].metadata.paidNarrative.parts['card.0.0'].split('\n\n')).toHaveLength(2);
});
test('a sentence repeated from an earlier part is removed instead of buying the part again',async()=>{
 const base=provider.getMockImplementation(),lead='이 배열은 지금 선택을 서두르기보다 조건을 확인하라는 신호로 읽는 편이 안전합니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args),value=JSON.parse(ai.text);if(/\[이번 부분 (coreQuestion|closingLine)\]/.test(args[1]))value.body=lead+'\n\n'+value.body;return {...ai,text:JSON.stringify(value)};});
 await start();expect((await finish()).status).toBe(200);
 expect(provider.mock.calls.filter(call=>call[1].includes('[이번 부분 closingLine]'))).toHaveLength(1);
 expect(Object.values(docs[0].metadata.paidNarrative.parts).join('\n').split(lead)).toHaveLength(2);
});
test('every part carries the shared tarot rules and each card part pins its own position, card and orientation',async()=>{
 const {TAROT_SHARED_RULE_PARAGRAPH}=await import('../../lib/tarot/paid-reading-contract.mjs'),{getTarotCardByAnyId}=await import('../../lib/tarot/tarot-cards.mjs');
 await start();expect((await finish()).status).toBe(200);
 const prompts=provider.mock.calls.map(call=>call[1]);
 for(const prompt of prompts)expect(prompt).toContain(TAROT_SHARED_RULE_PARAGRAPH);
 original().cards.forEach((card,i)=>{
  const pin=prompts.find(text=>text.includes(`[이번 부분 card.${i}.0]`)).match(/\[이 부분의 카드\][^\n]*/)?.[0];
  expect(pin).toContain(card.positionLabel);
  expect(pin).toContain(`${getTarotCardByAnyId(card.cardId).nameKo} ${card.orientation==='reversed'?'역방향':'정방향'}`);
  expect(pin.match(/[정역]방향/g)).toHaveLength(1);
 });
});
const inject=(id,sentence,times)=>{const base=provider.getMockImplementation();let left=times;
 provider.mockImplementation(async(...args)=>{const ai=await base(...args);if(!args[1].includes(`[이번 부분 ${id}]`)||left<=0)return ai;left-=1;
  const value=JSON.parse(ai.text);value.body=`${sentence}\n\n${value.body}`;return {...ai,text:JSON.stringify(value)};});};
const callsFor=id=>provider.mock.calls.filter(call=>call[1].includes(`[이번 부분 ${id}]`)).length;
test.each([['TAROT_UNDRAWN_CARD','탑 카드가 이 선택의 결말을 말합니다.'],['TAROT_ORIENTATION_MISMATCH','바보 정방향이 지금의 선택을 보여 줍니다.']])('a %s answer is bought once more and never saved',async(_code,sentence)=>{
 inject('card.0.0',sentence,1);await start();expect((await finish()).status).toBe(200);
 expect(callsFor('card.0.0')).toBe(2);expect(docs[0].metadata.paidNarrative.parts['card.0.0']).not.toContain(sentence);
});
test('a generic position word next to a drawn card is not a violation',async()=>{
 const sentence='미래를 생각할 때 바보 역방향은 서두르지 말라고 말합니다.';
 inject('card.0.0',sentence,1);await start();expect((await finish()).status).toBe(200);
 expect(callsFor('card.0.0')).toBe(1);expect(docs[0].metadata.paidNarrative.parts['card.0.0']).toContain(sentence);
});
// The automated eval rubric (fixtures/yeongnyangi-tarot-eval) on the delivered prose: every submitted position and card
// is named, and a forbidden claim a part carries reaches the reader, so the rubric must see it in the saved text.
const pinned=prompt=>{const [,label,named]=prompt.match(/\[이 부분의 카드\] 위치 "([^"]+)"[^:]*: ([^.]+)\./)||[];return label?`${label} 자리의 ${named} 카드가 지금의 조건을 비춥니다. `:'';};
test('the delivered oracle consultation passes the eval rubric, and the rubric sees a forbidden claim a part carries',async()=>{
 const {scoreReading}=await import('../fixtures/yeongnyangi-tarot-eval/cases.mjs'),{getTarotCardByAnyId}=await import('../../lib/tarot/tarot-cards.mjs');
 const base=provider.getMockImplementation(),claim='3월 5일에 결과가 나옵니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args),value=JSON.parse(ai.text);value.body=pinned(args[1])+value.body;
  if(args[1].includes('[이번 부분 timeline.near]'))value.body=`${claim} ${value.body}`;return {...ai,text:JSON.stringify(value)};});
 await start();const data=await (await finish()).json();
 const prompt={savedCardsOnly:original().cards.map(card=>({positionLabel:card.positionLabel,name:getTarotCardByAnyId(card.cardId).nameKo}))};
 const text=data.sections.map(section=>section.body).join('\n\n');
 expect(scoreReading(text.replace(claim,''),prompt,{id:'oracle-route'})).toEqual({pass:true,findings:[]});
 expect(scoreReading(text,prompt,{id:'oracle-route'}).findings).toEqual([{rule:'fixed-date',detail:'3월 5일'}]);
 expect(provider).toHaveBeenCalledTimes(17);
});
// 분량은 가격 대비 목표다: 5,000원(1~7장) 약 9,000자, 10,000원(8~14장) 약 12,000~14,000자.
test.each([[1,8000,10000],[4,8000,10000],[7,8000,10000],[8,11500,14000],[10,11500,14000],[11,11500,14000],[14,11500,14000]])('%s cards seed part targets within the tier length (%s~%s)',async(count,low,high)=>{
 const {seedTarotOracleNarrative}=await import('../../worker/lib/tarot-oracle-delivery.js');
 const seeded=seedTarotOracleNarrative({...original(),cards:Array.from({length:count},(_,i)=>({cardId:`M${String(i).padStart(2,'0')}`,orientation:'upright',positionLabel:`위치${i+1}`}))},{});
 const total=seeded.tasks.reduce((sum,task)=>sum+task.minChars,0);
 expect(total).toBeGreaterThanOrEqual(low);expect(total).toBeLessThanOrEqual(high);
});
test('a short complete part is delivered without a repair call',async()=>{
 const base=provider.getMockImplementation(),short='질문의 기준은 지금 선택의 속도입니다.\n\n카드의 흐름을 그 기준으로 읽습니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args);if(!args[1].includes('[이번 부분 coreQuestion]'))return ai;return {...ai,text:JSON.stringify({body:short})};});
 await start();expect((await finish()).status).toBe(200);
 expect(docs[0].metadata.paidNarrative.parts.coreQuestion).toBe(short);expect(callsFor('coreQuestion')).toBe(1);expect(provider).toHaveBeenCalledTimes(17);
});
