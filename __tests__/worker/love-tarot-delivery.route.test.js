/** @jest-environment node */
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from '@jest/globals';
// Multi-part stress fixture; the default one-part contract has separate coverage.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let draws,paidTarotDrawKey,route,docs,provider,revoked,userId,fault,lost,external,kind,mode,authError;
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
// The server-held draws (worker/lib/paid-tarot-draw-store.js) in memory.
const drawStore={findOne:async filter=>clone(draws.find(doc=>matches(doc,filter))||null),updateOne:async(filter,update,options={})=>{let doc=draws.find(doc=>matches(doc,filter));if(!doc&&options.upsert){doc=clone(update.$setOnInsert);draws.push(doc);}else if(doc)patch(doc,update.$set||{});return {matchedCount:doc?1:0};}};
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>{if(authError)throw authError;return {userId};}}));
 jest.unstable_mockModule('../../worker/lib/paid-feature-access.js',()=>({PAID_FEATURE_ACCESS_USER_PROJECTION:{},canAccessPaidFeature:async()=>({allowed:mode==='pass'})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>withSettle({logPerUsePaymentProof:()=>{},verifyPerUsePayment:async(_env,body)=>{proofs.push(body);return {proven:mode==='unavailable'?null:mode!=='denied',source:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/paid-tarot-draw-store.js',()=>({paidTarotDrawCollection:async()=>drawStore}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:(...args)=>provider(...args)}));
 ({handleTarotRoutes:route}=await import('../../worker/routes/tarot.js'));
 ({paidTarotDrawKey}=await import('../../worker/lib/paid-tarot-draw.js'));
});
let proofs=[];
test.each(['single', 'excess'])('matrix %s paragraphs are saved and reopened without an extra call',async format=>{
 const base=provider.getMockImplementation(),originals={};
 provider.mockImplementation(async(...args)=>{
  const ai=await base(...args),value=JSON.parse(ai.text),id=args[1].match(/\[이번 부분 ([^\]]+)\]/)[1];
  if(id==='matrix'){
   value.body=format==='single'?value.body.replace(/\n\s*\n/g,' '):value.body.replace(/\. /g,'.\n\n');
   originals[id]=value.body;
  }
  return {...ai,text:JSON.stringify(value)};
 });
 await start();const response=await finish();expect(response.status).toBe(200);
 const data=await response.json(),state=docs[0].metadata.paidNarrative;
 for(const [id,body]of Object.entries(originals)){
  expect(state.parts[id].split('\n\n')).toHaveLength(8);
  expect(state.parts[id].replace(/\s/g,'')).toBe(body.replace(/\s/g,''));
 }
 expect((await (await resume()).json()).reading).toEqual(data.reading);
 expect(provider).toHaveBeenCalledTimes(9);
});
beforeEach(()=>{docs=[];draws=[{_id:paidTarotDrawKey('tarot-love-relationship','original-love-draw'),featureKey:'tarot-love-relationship',drawId:'original-love-draw',owner:'',cards:DRAWN}];revoked=false;userId=owner;fault=null;lost=false;mode='pass';proofs=[];authError=null;
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
 const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)?.[1],label=prompt.match(/\[이번 부분 ([^\]]+)\]/)[1].replaceAll('.', '-');
 const lines=Array.from({length:65},(_,i)=>`${label} ${i}번째 해석은 세 형상의 관계에 비추어 지금의 선택을 검토하는 과정이며 확정된 사건을 예언하지 않습니다. ${label} ${i}번째 관찰에서는 생활 속 조건과 실천의 결과를 기록하며 자신에게 맞는 방향을 선택할 수 있습니다.`);const body=label==='matrix'?Array.from({length:8},(_,g)=>lines.slice(g*8,(g+1)*8).join(' ')).filter(Boolean).join('\n\n'):lines.join('\n\n');return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
// The paid body names the server draw its cards came from (worker/lib/paid-tarot-draw.js).
const DRAWN=Array.from({length:6},(_,i)=>({cardId:`M${String(i).padStart(2,'0')}`,orientation:i%2?'reversed':'upright'}));
const original=()=>({requestId:'original-paid-love-tarot',drawId:'original-love-draw',transactionId:'paid-'+mode,userQuestion:'두 사람의 관계를 어떻게 이해하면 좋을까요?',cards:Array.from({length:6},(_,i)=>({cardId:`M${String(i).padStart(2,'0')}`,position:`position_${i+1}`,orientation:i%2?'reversed':'upright'}))});
const post=body=>route(new Request('https://mock.test/api/tarot/love-reading',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
const finish=async()=>{let result;for(let i=0;i<8;i++){result=await resume();if(result.status!==202)return result;}return result;};
test.each(['pass','monthly','single'])('%s saves and reopens all nine parts without regeneration',async pay=>{mode=pay;expect((await start()).status).toBe(202);const result=await finish();expect(result.status).toBe(200);const data=await result.json();expect(data.saved).toBe(true);expect(data.readingSource).toBe('llm');expect(provider).toHaveBeenCalledTimes(9);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9);expect(proofs.every(p=>p.requestId===original().requestId)).toBe(true);});
test.each(['pass','monthly','single'].flatMap(pay=>['throw','null','confirm'].map(kind=>[pay,kind])))('%s final storage %s retains generated parts',async(pay,kind)=>{mode=pay;await start();fault={kind};const failed=await finish();expect(failed.status).toBe(503);expect(await failed.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9);});
test.each(['throw','null','confirm'])('checkpoint %s stops before provider',async kind=>{fault={kind,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(202);});
test.each(['short','missing','wrong-facts','truncated','interrupted','mock'])('%s preserves usable raw text and retries only an unusable answer',async kind=>{const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(kind==='interrupted')throw Error('lost');const ai=await base(...args),value=JSON.parse(ai.text);if(kind==='short')value.body='짧음';if(kind==='missing')delete value.body;if(kind==='wrong-facts')value.evidenceHash='wrong';return {...ai,truncated:kind==='truncated',isMock:kind==='mock',text:JSON.stringify(value)};});expect((await start()).status).toBe(202);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(kind==='truncated'?4:3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(kind==='truncated'?9:10);});
test('original owner, input and revoked/denied evidence are enforced',async()=>{mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='pass';await start();userId='other';expect((await resume()).status).toBe(404);userId=owner;expect((await post({...original(),userQuestion:'변경한 질문입니다.'})).status).toBe(409);mode='denied';expect((await resume()).status).toBe(402);mode='pass';revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);});
test('concurrent original requests share a lease and retain original locale',async()=>{const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const hold=new Promise(resolve=>release=resolve),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await hold;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&provider.mock.calls.length<4;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();await first;expect(locales).toEqual(['ja','ja','ja','ja']);const pending=await route(new Request('https://mock.test/api/tarot/love-result'),{});expect(pending.status).toBe(202);expect((await pending.json()).locale).toBe('ja');expect(provider).toHaveBeenCalledTimes(4);});
test('provider interruptions have two attempts per part without false refund or completion',async()=>{provider.mockResolvedValue({ok:false});await start();for(let i=0;i<20;i++)await resume();expect(provider).toHaveBeenCalledTimes(18);expect(docs[0].status).toBe('pending');expect(Object.values(docs[0].metadata.paidNarrative.attempts).every(n=>n===2)).toBe(true);});

test('invalid card is rejected before provider and storage',async()=>{expect((await post({...original(),cards:original().cards.map((card,i)=>i?card:{...card,cardId:'INVALID'})})).status).toBe(400);expect(docs).toHaveLength(0);expect(provider).not.toHaveBeenCalled();});
test.each([
 ['a swapped card',body=>{body.cards[0]={...body.cards[0],cardId:'M21'};},400,'TAROT_CARDS_FORGED'],
 ['a flipped orientation',body=>{body.cards[1]={...body.cards[1],orientation:'upright'};},400,'TAROT_CARDS_FORGED'],
 ['no draw id',body=>{delete body.drawId;},409,'TAROT_DRAW_REQUIRED'],
 ['an unknown draw',body=>{body.drawId='never-dealt-draw';},409,'TAROT_DRAW_REQUIRED'],
 ['a draw another account used',()=>{draws[0].owner='someone-else';},403,'TAROT_DRAW_OWNER_MISMATCH'],
])('%s is refused before the provider and storage',async(_name,change,status,reason)=>{const body=original();change(body);const response=await post(body);expect(response.status).toBe(status);expect((await response.json()).reason).toBe(reason);expect(docs).toHaveLength(0);expect(provider).not.toHaveBeenCalled();});
test('the paid draw deals six server cards once, and the reading binds them to its owner',async()=>{
 const deal=body=>route(new Request('https://mock.test/api/tarot/paid-draw',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({featureKey:'tarot-love-relationship',...body})}),{});
 const first=await (await deal({drawId:'fresh-love-draw',auto:true})).json();expect(first.cards).toHaveLength(6);
 expect(first.cards.every((card,i)=>card.position==='self_view_of_other'||i)).toBe(true);
 expect((await (await deal({drawId:'fresh-love-draw',picks:[0,1,2,3,4,5]})).json()).cards).toEqual(first.cards);
 for(const body of [{drawId:'short',auto:true},{drawId:'repeat-love-draw',picks:[1,1,2,3,4,5]},{featureKey:'tarot-oracle',drawId:'oracle-love-draw',auto:true}])expect((await deal(body)).status).toBe(400);
 expect((await post({...original(),drawId:'fresh-love-draw',cards:first.cards.map(({cardId,position,orientation})=>({cardId,position,orientation}))})).status).toBe(202);
 expect(draws.find(draw=>draw.drawId==='fresh-love-draw').owner).toBe(owner);
});
test('unavailable payment lookup is 503 and never generates',async()=>{mode='unavailable';expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();});

test.each([401,403,503])('authentication status %s prevents provider calls',async status=>{authError=Object.assign(Error('auth'),{status});expect((await start()).status).toBe(status);expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);});

test('all six original cards and directions retain generated meanings and advice',async()=>{await start();const data=await (await finish()).json();expect(data.reading.positionBreakdown).toHaveLength(6);const base=docs[0].metadata.paidNarrative.base.reading;for(let i=0;i<6;i++){expect(data.reading.positionBreakdown[i].orientation).toBe(base.positionBreakdown[i].orientation);for(const key of ['detail','relationshipInsight','advice','caution'])expect(data.reading.positionBreakdown[i][key]).toBeTruthy();}expect(data.reading.finalAdvice.nextSevenDays).toBeTruthy();});


test('foreign generated prose survives checkpoint, rendering and reopening without default padding',async()=>{
 const {runWithAiLocale}=await import('../../worker/lib/ai-locale-context.js');
 provider.mockImplementation(async(_env,prompt)=>{
  const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)?.[1],label=prompt.match(/\[이번 부분 ([^\]]+)\]/)[1];
  const lines=Array.from({length:65},(_,i)=>`${label} observation ${i}: Compare the card position with the practical information available about your relationship before deciding what to ask. ${label} reflection ${i}: Describe a small reversible step and record how both people respond without treating a possible pattern as a certain prediction.`);
  const body=label==='matrix'?Array.from({length:8},(_,g)=>lines.slice(g*8,(g+1)*8).join(' ')).join('\n\n'):lines.join('\n\n');
  return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body})};
 });
 await runWithAiLocale('en',start);const response=await finish();expect(response.status).toBe(200);const data=await response.json();
 const parts=docs[0].metadata.paidNarrative.parts;
 expect(data.locale).toBe('en');expect(data.reading.overallVibe).toBe(parts.overview.split('\n\n')[0]);expect(data.reading.finalAdvice.nextSevenDays).toBe(parts.final.split('\n\n')[3]);
 for(let i=0;i<6;i++){
  const row=data.reading.positionBreakdown[i];expect([row.detail,row.relationshipInsight,row.advice,row.caution].join('\n\n')).toBe(parts[`card-${i}`]);
 }
 expect(data.deliverySections.map(s=>s.body).join('')).not.toMatch(/[가-힣]/);
 const reopened=await (await resume()).json();expect(reopened.reading).toEqual(data.reading);expect(provider).toHaveBeenCalledTimes(9);
});

test('a record saved with the former 21 part ids still renders every field',async()=>{
 await start();await finish();const state=structuredClone(docs[0].metadata.paidNarrative),parts=state.parts,split=id=>parts[id].split('\n\n');
 const legacy={};
 for(let i=0;i<6;i++){const p=split(`card-${i}`);legacy[`card-${i}-meaning`]=p.slice(0,2).join('\n\n');legacy[`card-${i}-action`]=p.slice(2).join('\n\n');}
 ['overallVibe','deepReading','realityAndFuture'].forEach((id,i)=>{legacy[id]=split('overview')[i];});
 ['instantMission','conversationTip','relationshipBoundary','nextSevenDays'].forEach((id,i)=>{legacy[id]=split('final')[i];});
 legacy['matrix-0']=split('matrix').slice(0,4).join('\n\n');legacy['matrix-1']=split('matrix').slice(4).join('\n\n');
 const {loveTarotNarrativeAdapter}=await import('../../worker/lib/love-tarot-delivery.js'),{render}=loveTarotNarrativeAdapter({});
 expect(render({...state,parts:legacy}).reading).toEqual(render(state).reading);
});
test('each of the nine parts carries its scope and no evidence hash',async()=>{
 await start();await finish();const prompts=provider.mock.calls.map(call=>call[1]);
 expect(docs[0].metadata.paidNarrative.tasks.map(task=>task.id)).toEqual(['card-0','card-1','card-2','card-3','card-4','card-5','overview','final','matrix']);
 expect(prompts.some(prompt=>/[a-f0-9]{64}/.test(prompt))).toBe(false);
 expect(prompts.find(prompt=>prompt.includes('[이번 부분 matrix]'))).toContain('인물 카드가 주는 신호');
});
test('a sentence repeated from an earlier card is removed instead of buying a new card',async()=>{
 const base=provider.getMockImplementation(),lead='두 사람은 서로의 속도를 확인하기 전까지 결론을 미루는 편이 안전하다고 카드가 말합니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args),value=JSON.parse(ai.text);if(/\[이번 부분 card-[01]\]/.test(args[1]))value.body=lead+'\n\n'+value.body;return {...ai,text:JSON.stringify(value)};});
 await start();expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9);
 expect(Object.values(docs[0].metadata.paidNarrative.parts).join('\n').split(lead)).toHaveLength(2);
});
test('every part carries the shared tarot rules and each card part pins its own position, card and orientation',async()=>{
 const {TAROT_SHARED_RULE_PARAGRAPH}=await import('../../lib/tarot/paid-reading-contract.mjs'),{getTarotCardByAnyId}=await import('../../lib/tarot/tarot-cards.mjs');
 await start();expect((await finish()).status).toBe(200);
 const prompts=provider.mock.calls.map(call=>call[1]),rows=docs[0].metadata.paidNarrative.base.reading.positionBreakdown;
 for(const prompt of prompts)expect(prompt).toContain(TAROT_SHARED_RULE_PARAGRAPH);
 DRAWN.forEach((card,i)=>{
  const pin=prompts.find(text=>text.includes(`[이번 부분 card-${i}]`)).match(/\[이 부분의 카드\][^\n]*/)?.[0];
  expect(pin).toContain(rows[i].positionTitle);
  expect(pin).toContain(`${getTarotCardByAnyId(card.cardId).nameKo} ${card.orientation==='reversed'?'역방향':'정방향'}`);
  expect(pin.match(/[정역]방향/g)).toHaveLength(1);
 });
});
// A part that names an undrawn card, flips an orientation or moves a card to another position is a
// failed attempt: it is bought once more within the two-attempt cap, never saved.
const inject=(id,sentence,times)=>{const base=provider.getMockImplementation();let left=times;
 provider.mockImplementation(async(...args)=>{const ai=await base(...args);if(!args[1].includes(`[이번 부분 ${id}]`)||left<=0)return ai;left-=1;
  const value=JSON.parse(ai.text);value.body=`${sentence}\n\n${value.body}`;return {...ai,text:JSON.stringify(value)};});};
const callsFor=id=>provider.mock.calls.filter(call=>call[1].includes(`[이번 부분 ${id}]`)).length;
test.each([['TAROT_UNDRAWN_CARD','탑 카드가 이 관계의 결말을 말합니다.'],['TAROT_ORIENTATION_MISMATCH','마법사 정방향이 상대의 시선을 보여 줍니다.'],
 ['TAROT_POSITION_MISMATCH','상대가 나를 바라보는 마음의 바보 카드가 말합니다.']])('a %s answer is bought once more and never saved',async(_code,sentence)=>{
 inject('card-0',sentence,1);await start();expect((await finish()).status).toBe(200);
 expect(callsFor('card-0')).toBe(2);expect(provider).toHaveBeenCalledTimes(10);expect(docs[0].metadata.paidNarrative.parts['card-0']).not.toContain(sentence);
});
test('a part whose two answers both name an undrawn card stops at the cap without saving it',async()=>{
 inject('card-0','탑 카드가 이 관계의 결말을 말합니다.',Infinity);await start();await finish();
 const state=docs[0].metadata.paidNarrative;expect(callsFor('card-0')).toBe(2);expect(state.parts['card-0']).toBeUndefined();expect(state.attempts['card-0']).toBe(2);expect(docs[0].status).not.toBe('success');
});
// The automated eval rubric (fixtures/yeongnyangi-tarot-eval) on the delivered prose: every stored position and card
// is named, and a forbidden claim a part carries reaches the reader, so the rubric must see it in the saved text.
const pinned=prompt=>{const [,label,named]=prompt.match(/\[이 부분의 카드\] 위치 "([^"]+)"[^:]*: ([^.]+)\./)||[];return label?`${label} 자리의 ${named} 카드가 지금의 조건을 비춥니다. `:'';};
test('the delivered love reading passes the eval rubric, and the rubric sees a forbidden claim a part carries',async()=>{
 const {scoreReading}=await import('../fixtures/yeongnyangi-tarot-eval/cases.mjs'),{getTarotCardByAnyId}=await import('../../lib/tarot/tarot-cards.mjs');
 const base=provider.getMockImplementation(),claim='두 사람이 다시 가까워질 확률은 70%입니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args),value=JSON.parse(ai.text);value.body=pinned(args[1])+value.body;
  if(args[1].includes('[이번 부분 final]'))value.body=`${claim} ${value.body}`;return {...ai,text:JSON.stringify(value)};});
 await start();const data=await (await finish()).json();
 const prompt={savedCardsOnly:docs[0].metadata.paidNarrative.base.reading.positionBreakdown.map(row=>({positionLabel:row.positionTitle,name:getTarotCardByAnyId(row.cardId).nameKo}))};
 const text=data.deliverySections.map(section=>section.body).join('\n\n');
 expect(scoreReading(text.replace(claim,''),prompt,{id:'love-route'})).toEqual({pass:true,findings:[]});
 expect(scoreReading(text,prompt,{id:'love-route'}).findings.map(f=>f.rule)).toEqual(['probability']);
 expect(provider).toHaveBeenCalledTimes(9);
});
// A tab opened before the server draw shipped can still post without drawId. The draw is checked before any payment
// proof is read, so a pass is never consumed for a request that cannot run, and a redraw under the same requestId
// completes on the payment already made.
test.each([
 ['no draw id',body=>{delete body.drawId;},409],
 ['a swapped card',body=>{body.cards[0]={...body.cards[0],cardId:'M21'};},400],
 ['a draw another account used',()=>{draws[0].owner='someone-else';},403],
])('%s is refused before any payment proof is read',async(_name,change,status)=>{mode='single';const body=original();change(body);expect((await post(body)).status).toBe(status);expect(proofs).toHaveLength(0);});
test('a redraw under the same request id completes on the original payment',async()=>{
 mode='single';const stale=original();delete stale.drawId;expect((await post(stale)).status).toBe(409);
 expect((await post(original())).status).toBe(202);expect((await finish()).status).toBe(200);
 expect(proofs.length).toBeGreaterThan(0);expect(proofs.every(p=>p.requestId===original().requestId)).toBe(true);
});
// 3,000원 상품: 부분 목표 합계 약 9,000자. 분량은 목표이며 짧아도 완결된 부분은 재구매 없이 전달한다.
test('part targets total ~9,000 chars and a short complete part is delivered without a repair call',async()=>{
 const base=provider.getMockImplementation(),short='관계의 온도는 조심스럽게 따뜻합니다.\n\n겉모습보다 속마음이 더 가까이 다가가 있습니다.\n\n현실 조건을 먼저 확인하는 흐름입니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args);if(!args[1].includes('[이번 부분 overview]'))return ai;return {...ai,text:JSON.stringify({body:short})};});
 await start();expect((await finish()).status).toBe(200);
 const state=docs[0].metadata.paidNarrative,total=state.tasks.reduce((sum,task)=>sum+task.minChars,0);
 expect(total).toBeGreaterThanOrEqual(12000);expect(total).toBeLessThanOrEqual(14000);
 expect(state.parts.overview).toBe(short);expect(callsFor('overview')).toBe(1);expect(provider).toHaveBeenCalledTimes(9);
});
