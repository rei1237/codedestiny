/** @jest-environment node */
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
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
test.each(['single', 'excess'])('summary %s paragraphs are saved and reopened without an extra call',async format=>{
 const base=provider.getMockImplementation();let originalSummary;
 provider.mockImplementation(async(...args)=>{
  const ai=await base(...args),value=JSON.parse(ai.text),id=args[1].match(/\[이번 부분 ([^\]]+)\]/)[1];
  if(id==='summary'){
   value.body=format==='single'?value.body.replace(/\n\s*\n/g,' '):value.body.replace(/\. /g,'.\n\n');
   originalSummary=value.body;
  }
  return {...ai,text:JSON.stringify(value)};
 });
 await start();const response=await finish();expect(response.status).toBe(200);
 const data=await response.json(),state=docs[0].metadata.paidNarrative;
 expect(state.parts.summary.split('\n\n')).toHaveLength(10);
 expect(state.parts.summary.replace(/\s/g,'')).toBe(originalSummary.replace(/\s/g,''));
 expect((await (await resume()).json()).reading).toEqual(data.reading);
 expect(provider).toHaveBeenCalledTimes(9);
});
beforeEach(()=>{docs=[];draws=[{_id:paidTarotDrawKey('tarot-mindscan','original-mindscan-draw'),featureKey:'tarot-mindscan',drawId:'original-mindscan-draw',owner:'',cards:DRAWN}];revoked=false;userId=owner;fault=null;lost=false;mode='pass';proofs=[];authError=null;
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
 const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)?.[1],label=prompt.match(/\[이번 부분 ([^\]]+)\]/)[1].replaceAll('.', '-');
 const lines=Array.from({length:65},(_,i)=>`${label} ${i}번째 해석은 세 형상의 관계에 비추어 지금의 선택을 검토하는 과정이며 확정된 사건을 예언하지 않습니다. ${label} ${i}번째 관찰에서는 생활 속 조건과 실천의 결과를 기록하며 자신에게 맞는 방향을 선택할 수 있습니다.`);const body=label==='summary'?Array.from({length:10},(_,g)=>lines.slice(g*7,(g+1)*7).join(' ')).filter(Boolean).join('\n\n'):lines.join('\n\n');return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
// The paid body names the server draw its pairs came from: five main then five sub cards.
const DRAWN=Array.from({length:10},(_,i)=>({cardId:`M${String(i).padStart(2,'0')}`,orientation:'upright'}));
const original=()=>({requestId:'original-paid-mindscan',drawId:'original-mindscan-draw',transactionId:'paid-'+mode,question:'어떤 선택을 하는 것이 좋을까요?',pairs:Array.from({length:5},(_,i)=>({slot:i+1,positionId:['top','left','center','right','bottom'][i],mainCardId:i,subCardId:i+5}))});
const post=body=>route(new Request('https://mock.test/api/tarot/mindscan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
const finish=async()=>{let result;for(let i=0;i<8;i++){result=await resume();if(result.status!==202)return result;}return result;};
test.each(['pass','monthly','single'])('%s saves and reopens all nine parts (one per position) without regeneration',async pay=>{mode=pay;expect((await start()).status).toBe(202);const result=await finish();expect(result.status).toBe(200);const data=await result.json();expect(data.saved).toBe(true);expect(data.source).toBe('llm');expect(provider).toHaveBeenCalledTimes(9);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9);expect(proofs.every(p=>p.requestId===original().requestId)).toBe(true);});
test.each(['pass','monthly','single'].flatMap(pay=>['throw','null','confirm'].map(kind=>[pay,kind])))('%s final storage %s retains generated parts',async(pay,kind)=>{mode=pay;await start();fault={kind};const failed=await finish();expect(failed.status).toBe(503);expect(await failed.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9);});
test.each(['throw','null','confirm'])('checkpoint %s stops before provider',async kind=>{fault={kind,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(202);});
test.each(['short','missing','wrong-facts','truncated','interrupted','mock'])('%s preserves usable raw text and retries only an unusable answer',async kind=>{const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(kind==='interrupted')throw Error('lost');const ai=await base(...args),value=JSON.parse(ai.text);if(kind==='short')value.body='짧음';if(kind==='missing')delete value.body;if(kind==='wrong-facts')value.evidenceHash='wrong';return {...ai,truncated:kind==='truncated',isMock:kind==='mock',text:JSON.stringify(value)};});expect((await start()).status).toBe(202);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(kind==='truncated'?4:3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(kind==='truncated'?9:10);});
test('original owner, input and revoked/denied evidence are enforced',async()=>{mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='pass';await start();userId='other';expect((await resume()).status).toBe(404);userId=owner;expect((await post({...original(),question:'변경한 질문입니다.'})).status).toBe(409);mode='denied';expect((await resume()).status).toBe(402);mode='pass';revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);});
test('concurrent original requests share a lease and retain original locale',async()=>{const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const hold=new Promise(resolve=>release=resolve),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await hold;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&provider.mock.calls.length<4;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();await first;expect(locales).toEqual(['ja','ja','ja','ja']);const pending=await route(new Request('https://mock.test/api/tarot/mindscan-result'),{});expect(pending.status).toBe(202);expect((await pending.json()).locale).toBe('ja');expect(provider).toHaveBeenCalledTimes(4);});
test('provider interruptions have two attempts per part without false refund or completion',async()=>{provider.mockResolvedValue({ok:false});await start();for(let i=0;i<20;i++)await resume();expect(provider).toHaveBeenCalledTimes(18);expect(docs[0].status).toBe('pending');expect(Object.values(docs[0].metadata.paidNarrative.attempts).every(n=>n===2)).toBe(true);});

test('invalid card is rejected before provider and storage',async()=>{expect((await post({...original(),pairs:original().pairs.map((pair,i)=>i?pair:{...pair,mainCardId:'INVALID'})})).status).toBe(400);expect(docs).toHaveLength(0);expect(provider).not.toHaveBeenCalled();});
test.each([
 ['a swapped main card',body=>{body.pairs[0]={...body.pairs[0],mainCardId:21};},400,'TAROT_CARDS_FORGED'],
 ['main and sub swapped',body=>{body.pairs[4]={...body.pairs[4],mainCardId:9,subCardId:4};},400,'TAROT_CARDS_FORGED'],
 ['no draw id',body=>{delete body.drawId;},409,'TAROT_DRAW_REQUIRED'],
 ['a draw another account used',()=>{draws[0].owner='someone-else';},403,'TAROT_DRAW_OWNER_MISMATCH'],
])('%s is refused before the provider and storage',async(_name,change,status,reason)=>{const body=original();change(body);const response=await post(body);expect(response.status).toBe(status);expect((await response.json()).reason).toBe(reason);expect(docs).toHaveLength(0);expect(provider).not.toHaveBeenCalled();});
test('the paid draw deals the ten picked slots once, and a reading with them is accepted',async()=>{
 const deal=body=>route(new Request('https://mock.test/api/tarot/paid-draw',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({featureKey:'tarot-mindscan',...body})}),{});
 const picks=[3,7,11,0,23,5,9,14,18,2],first=await (await deal({drawId:'fresh-mindscan-draw',picks})).json();
 expect(first.cards).toHaveLength(10);expect(new Set(first.cards.map(card=>card.cardId)).size).toBe(10);
 expect((await (await deal({drawId:'fresh-mindscan-draw',picks:[...picks].reverse()})).json()).cards).toEqual(first.cards);
 expect((await deal({drawId:'other-mindscan-draw',picks:picks.slice(0,6)})).status).toBe(400);
 const pairs=original().pairs.map((pair,i)=>({...pair,mainCardId:first.cards[i].numericId,subCardId:first.cards[i+5].numericId}));
 expect((await post({...original(),drawId:'fresh-mindscan-draw',pairs})).status).toBe(202);
});
test('unavailable payment lookup is 503 and never generates',async()=>{mode='unavailable';expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();});

test.each([401,403,503])('authentication status %s prevents provider calls',async status=>{authError=Object.assign(Error('auth'),{status});expect((await start()).status).toBe(status);expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);});

test('all five drawn positions retain original cards, orientation and complete generated fields',async()=>{await start();const data=await (await finish()).json();expect(data.reading.sections).toHaveLength(5);const state=docs[0].metadata.paidNarrative;for(let i=0;i<5;i++){expect(data.reading.sections[i].orientation).toBe(state.base.sections[i].orientation);for(const key of ['cardMeaning','positionMeaning','emotionalReading','hiddenMessage','caution','advice'])expect(data.reading.sections[i][key]).toBeTruthy();}expect(data.reading.summaryCard.recommendedAction).toBeTruthy();});

// Five pairs are dealt and read in five positions, top to bottom as the screen lays them out, so no card is read twice.
test('each dealt card is read in exactly one position, in screen order',async()=>{
 await start();expect((await finish()).status).toBe(200);
 const sections=docs[0].metadata.paidNarrative.sectionInputs;
 expect(sections.map(section=>section.positionLabel)).toEqual(['겉으로 보이는 태도','상대의 현재 마음','상대가 망설이는 이유','드러나지 않은 마음의 결','관계가 향하는 흐름']);
 expect(new Set(sections.flatMap(section=>[section.mainCard.nameKo,section.subCard.nameKo])).size).toBe(10);
 expect(provider).toHaveBeenCalledTimes(9);
});

// B1b: a 64-char hash copy dropped a usable answer; the server now binds it.
test('prompts carry no evidence hash and a reused card sentence is removed, not re-bought',async()=>{
 const base=provider.getMockImplementation(),lead='상대는 지금 연락의 속도를 스스로 정하고 싶어 하는 상태로 읽힙니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args),value=JSON.parse(ai.text);if(/\[이번 부분 section-[01]\]/.test(args[1]))value.body=lead+'\n\n'+value.body;return {...ai,text:JSON.stringify(value)};});
 await start();expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9);
 expect(provider.mock.calls.some(call=>/[a-f0-9]{64}/.test(call[1]))).toBe(false);
 expect(Object.values(docs[0].metadata.paidNarrative.parts).join('\n').split(lead)).toHaveLength(2);
});
test('every part carries the shared tarot rules and each section part pins its own position, cards and orientation',async()=>{
 const {TAROT_SHARED_RULE_PARAGRAPH}=await import('../../lib/tarot/paid-reading-contract.mjs');
 await start();expect((await finish()).status).toBe(200);
 const prompts=provider.mock.calls.map(call=>call[1]),sections=docs[0].metadata.paidNarrative.sectionInputs;
 for(const prompt of prompts)expect(prompt).toContain(TAROT_SHARED_RULE_PARAGRAPH);
 expect(sections).toHaveLength(5);
 sections.forEach((section,i)=>{
  const pin=prompts.find(text=>text.includes(`[이번 부분 section-${i}]`)).match(/\[이 부분의 카드\][^\n]*/)?.[0];
  expect(pin).toContain(section.positionLabel);
  expect(pin).toContain(`메인 ${section.mainCard.nameKo} ${section.orientation==='reversed'?'역방향':'정방향'}`);
  expect(pin).toContain(`보조 ${section.subCard.nameKo}`);
 });
});
const inject=(id,sentence,times)=>{const base=provider.getMockImplementation();let left=times;
 provider.mockImplementation(async(...args)=>{const ai=await base(...args);if(!args[1].includes(`[이번 부분 ${id}]`)||left<=0)return ai;left-=1;
  const value=JSON.parse(ai.text);value.body=`${sentence}\n\n${value.body}`;return {...ai,text:JSON.stringify(value)};});};
const callsFor=id=>provider.mock.calls.filter(call=>call[1].includes(`[이번 부분 ${id}]`)).length;
// 마법사 is dealt only reversed.
test.each([['TAROT_UNDRAWN_CARD','탑 카드가 이 마음의 결말을 말합니다.'],['TAROT_ORIENTATION_MISMATCH','마법사 정방향이 상대의 태도를 보여 줍니다.']])('a %s answer is bought once more and never saved',async(_code,sentence)=>{
 inject('section-0',sentence,1);await start();expect((await finish()).status).toBe(200);
 expect(callsFor('section-0')).toBe(2);expect(docs[0].metadata.paidNarrative.parts['section-0']).not.toContain(sentence);
});
// The automated eval rubric (fixtures/yeongnyangi-tarot-eval) on the delivered prose: every stored position and its main
// and sub card are named, and a forbidden claim a part carries reaches the reader, so the rubric must see it in the saved text.
const pinned=prompt=>{const [,label,named]=prompt.match(/\[이 부분의 카드\] 위치 "([^"]+)"[^:]*: ([^.]+)\./)||[];return label?`${label} 자리의 ${named} 카드가 지금의 조건을 비춥니다. `:'';};
test('the delivered mindscan reading passes the eval rubric, and the rubric sees a forbidden claim a part carries',async()=>{
 const {scoreReading}=await import('../fixtures/yeongnyangi-tarot-eval/cases.mjs');
 const base=provider.getMockImplementation(),claim='상대에게 다른 사람이 생겼을 수 있습니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args),value=JSON.parse(ai.text);value.body=pinned(args[1])+value.body;
  if(args[1].includes('[이번 부분 closing]'))value.body=`${claim} ${value.body}`;return {...ai,text:JSON.stringify(value)};});
 await start();const data=await (await finish()).json();
 const prompt={savedCardsOnly:docs[0].metadata.paidNarrative.sectionInputs.flatMap(section=>[section.mainCard,section.subCard].map(card=>({positionLabel:section.positionLabel,name:card.nameKo})))};
 const text=data.deliverySections.map(section=>section.body).join('\n\n');
 expect(scoreReading(text.replace(claim,''),prompt,{id:'mindscan-route'})).toEqual({pass:true,findings:[]});
 expect(scoreReading(text,prompt,{id:'mindscan-route'}).findings).toEqual([{rule:'invented-third-party',detail:'다른 사람이 생겼'}]);
 expect(provider).toHaveBeenCalledTimes(9);
});
// A tab opened before the server draw shipped can still post without drawId. The draw is checked before any payment
// proof is read, so a pass is never consumed for a request that cannot run, and a redraw under the same requestId
// completes on the payment already made.
test.each([
 ['no draw id',body=>{delete body.drawId;},409],
 ['a swapped main card',body=>{body.pairs[0]={...body.pairs[0],mainCardId:21};},400],
 ['a draw another account used',()=>{draws[0].owner='someone-else';},403],
])('%s is refused before any payment proof is read',async(_name,change,status)=>{mode='single';const body=original();change(body);expect((await post(body)).status).toBe(status);expect(proofs).toHaveLength(0);});
test('a redraw under the same request id completes on the original payment',async()=>{
 mode='single';const stale=original();delete stale.drawId;expect((await post(stale)).status).toBe(409);
 expect((await post(original())).status).toBe(202);expect((await finish()).status).toBe(200);
 expect(proofs.length).toBeGreaterThan(0);expect(proofs.every(p=>p.requestId===original().requestId)).toBe(true);
});
// 3,000원 상품: 부분 목표 합계 약 9,000자. 분량은 목표이며 짧아도 완결된 부분은 재구매 없이 전달한다.
test('part targets total ~9,000 chars and a short complete part is delivered without a repair call',async()=>{
 const base=provider.getMockImplementation(),short='질문의 핵심은 연락의 속도입니다.\n\n다섯 위치를 함께 읽으며 조건을 확인합니다.';
 provider.mockImplementation(async(...args)=>{const ai=await base(...args);if(!args[1].includes('[이번 부분 intro]'))return ai;return {...ai,text:JSON.stringify({body:short})};});
 await start();expect((await finish()).status).toBe(200);
 const state=docs[0].metadata.paidNarrative,total=state.tasks.reduce((sum,task)=>sum+task.minChars,0);
 expect(total).toBeGreaterThanOrEqual(12000);expect(total).toBeLessThanOrEqual(14000);
 expect(state.parts.intro).toBe(short);expect(callsFor('intro')).toBe(1);expect(provider).toHaveBeenCalledTimes(9);
});
// A state seeded before the merge keeps its three parts per position and renders the same fields.
test('a legacy state with three parts per position still renders every field',async()=>{
 const {mindscanNarrativeAdapter}=await import('../../worker/lib/mindscan-delivery.js');
 await start();expect((await finish()).status).toBe(200);
 const state=structuredClone(docs[0].metadata.paidNarrative);
 for(let i=0;i<5;i++){delete state.parts[`section-${i}`];for(const key of ['meaning','emotion','action'])state.parts[`section-${i}-${key}`]=`${key} 첫 문단입니다.\n\n${key} 둘째 문단입니다.`;}
 const section=mindscanNarrativeAdapter({}).render(state).reading.sections[0];
 expect(section).toMatchObject({cardMeaning:'meaning 첫 문단입니다.',positionMeaning:'meaning 둘째 문단입니다.',emotionalReading:'emotion 첫 문단입니다.',hiddenMessage:'emotion 둘째 문단입니다.',caution:'action 첫 문단입니다.',advice:'action 둘째 문단입니다.'});
});
