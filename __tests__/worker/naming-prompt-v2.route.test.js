/** @jest-environment node */
import { jest } from "@jest/globals";
// 작명 v2 라우트 배선(설계서 §10). 엔진·서술 로직은 __tests__/ui/naming-engine*.test.mjs 가 실제 모듈로 검사한다 —
// jest 는 TS 를 못 읽으므로 여기서는 service.ts 를 손 가짜로 바꾸고, 라우트의 판 선택·저장·직렬화·무료 경로만 본다.

const uid="64b7f2a1c3d4e5f601234567";
let settleStuck,route,settleDue,docs,provider,userId,authCalls,fetchBlock,candidateCount,passRefund,revoked,cardPayment,cardRefund;
const clone=v=>v==null?v:structuredClone(v);
const get=(d,k)=>k.split('.').reduce((v,p)=>v?.[p],d);
function set(d,k,v){const keys=k.split('.');const end=keys.pop();let o=d;for(const key of keys)o=o[key]??={};o[end]=clone(v);}
function matches(d,f){return Object.entries(f).every(([k,v])=>{
 if(k==='$or')return v.some(x=>matches(d,x));
 const value=get(d,k);if(v&&typeof v==='object'&&!(v instanceof Date)){
 if('$exists'in v)return (value!==undefined&&value!==null)===v.$exists;if('$lte'in v)return value!=null&&new Date(value)<=new Date(v.$lte);
 if('$in'in v)return v.$in.includes(value);if('$nin'in v)return !v.$nin.includes(value);if('$ne'in v)return value!==v.$ne;
 }return String(value)===String(v);
});}
function query(v){return {lean:async()=>clone(v),sort(){return this;},select(){return this;},limit(){return this;}};}
const model={
 find:f=>query(docs.filter(d=>matches(d,f))),
 findOne:f=>{if(f.status?.$in?.includes('refunded'))return query(null);return query(docs.find(d=>matches(d,f))||null);},
 findOneAndUpdate:(f,u,o={})=>{
  let doc=docs.find(d=>matches(d,f)),before=clone(doc);
  if(!doc&&o.upsert){doc={...clone(u.$setOnInsert),_id:'record'};docs.push(doc);}
  if(doc){for(const[k,v]of Object.entries(u.$set||{}))set(doc,k,v);if(o.timestamps!==false)doc.updatedAt=new Date();}
  return query(o.returnDocument==='before'?before:doc||null);
 },
 updateOne:async(f,u)=>{const doc=docs.find(d=>matches(d,f));if(doc)for(const[k,v]of Object.entries(u.$set||{}))set(doc,k,v);return {modifiedCount:doc?1:0};},
};

const ENGINE_VERSION='naming-engine-v2-test';
const candidates=n=>Array.from({length:n},(_,i)=>({rank:i+1,hangul:`후보${i+1}`,hanja:'瑞潤',chars:[],grids:{won:15,hyeong:23,i:16,jeong:31}}));
const viewOf=(tier,n)=>({engineVersion:ENGINE_VERSION,dataVersion:'data-test',schoolPreset:'kr-modern',inputHash:'engine-hash',tier,relaxationStage:0,
 surname:{hangul:'김',hanja:'金',strokes:[8],compound:false,source:'test'},saju:{useful:['water'],caution:['fire'],derivedSupport:[],timeUnknown:false,jongConditional:false},notices:[],candidates:candidates(n)});
const displayEvidence={engineVersion:ENGINE_VERSION,pillars:{y:{g:'을',j:'해',gE:'wood'},m:{g:'경',j:'진',gE:'metal'},d:{g:'임',j:'자',gE:'water'},h:{g:'을',j:'사',gE:'wood'}},
 natal:{counts:{wood:2,fire:1,earth:1,metal:1,water:3}},power:{yongshin:['fire'],kijishin:['water']},johu:{},jong:{}};
const engine={
 prepareNamingV2:jest.fn(()=>({view:viewOf('paid',candidateCount),displayEvidence:clone(displayEvidence)})),
 namingBasisV2:jest.fn(()=>({view:viewOf('free',5),displayEvidence:clone(displayEvidence)})),
 buildNamingV2Prompt:jest.fn((view,saju,prefs)=>`V2PROMPT ${view.engineVersion} ${prefs.genderLabel} ${saju.source}`),
 initialDeliveryV2:view=>({version:2,attempts:{},chapters:{},candidates:{cards:view.candidates.map(c=>({name:c.hangul})),finalPick:null},narration:null}),
 // 요청당 한 부분만 쓴다: 서술 → 1장 … 8장.
 generateNamingWaveV2:async(snapshot,checkpoint,deps)=>{
  const state=clone(snapshot.delivery?.version===2?snapshot.delivery:engine.initialDeliveryV2(snapshot.engine));
  const part=!state.narration?'narration':String([1,2,3,4,5,6,7,8].find(id=>!state.chapters[id]));
  const ai=await deps.call(`prompt ${part}`,part,9500);
  if(part==='narration')state.narration={names:[],letters:[{rank:1,letter:ai.text}]};
  else state.chapters[part]={id:Number(part),title:deps.chapterTitles[Number(part)-1],body:ai.text,source:'llm'};
  await checkpoint(clone(state));
  return {state,limited:false};
 },
 namingReportCompleteV2:state=>[1,2,3,4,5,6,7,8].every(id=>state?.chapters?.[id]),
 confirmedEmptyNamingFailureV2:()=>false,
 namingChaptersTextV2:(chapters={})=>Object.values(chapters).map(c=>c.body).join('\n\n'),
};

beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 const passConsumption=await import('../../worker/lib/pass-consumption.js');
 jest.unstable_mockModule('../../worker/lib/pass-consumption.js',()=>({...passConsumption,refundPassUseEvidence:(...args)=>passRefund(...args)}));
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_e,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>{authCalls++;return {userId};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,PaidExecutionRecord:model,
  PointHistory:{findOne:f=>query(f.$and?null:{_id:uid,metadata:{accessMethod:'PASS',requestId:'original-paid'}}),updateOne:async()=>({})},
  Payment:{findOne:f=>query(cardPayment&&f.$or?.some(c=>c.merchantUid===cardPayment.merchantUid)?cardPayment:null),findByIdAndUpdate:()=>query(null)},
  MonthlyCreditLedger:{findOne:()=>query(null),updateOne:async()=>({})},
 }));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 jest.unstable_mockModule('../../worker/lib/monthly-credit-store.js',()=>({restoreMonthlyCreditLot:async()=>({})}));
 jest.unstable_mockModule('../../worker/naming-engine/service.ts',()=>engine);
 const revocation=await import('../../worker/lib/paid-result-revocation.js');
 jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({...revocation,isPaidResultRevoked:async()=>revoked}));
 jest.unstable_mockModule('../../worker/lib/payment-refund.js',()=>({autoRefundSinglePaymentDeliveryFailure:(...args)=>cardRefund(...args)}));
 ({handleNamingPromptRoutes:route,settleDueNamingRetryRefunds:settleDue,settleStuckDelivery:settleStuck}=await import('../../worker/routes/naming-prompt.js'));
});
beforeEach(()=>{docs=[];userId=uid;authCalls=0;candidateCount=12;passRefund=jest.fn(async()=>({refunded:true}));revoked=false;cardPayment=null;cardRefund=jest.fn(async()=>({refunded:true}));
 for(const fn of [engine.prepareNamingV2,engine.namingBasisV2,engine.buildNamingV2Prompt])fn.mockClear();
 provider=jest.fn(async(_env,prompt,options)=>{
  expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);
  const group=options.logContext.sectionGroup;
  if(group.startsWith('v2:'))return {ok:true,provider:'gemini',text:`${group} 서술 본문`};
  if(group==='candidates')return {ok:true,provider:'gemini',text:'[이름카드]\n'+['서윤','서연','지우','지유','소율'].map(name=>`후보: ${name} | 뜻: 이름의 의미 | 총평: 생활 속에서 부르기 좋은 이름`).join('\n')+'\n최종: 서윤 | 이유: 가족의 선호와 어울립니다.\n[/이름카드]'};
  return {ok:true,provider:'gemini',text:JSON.stringify({title:`검증 ${group}장`,body:Array.from({length:65},(_,i)=>`${group}장 ${i}번째 이름의 의미와 소리 흐름은 계산된 근거와 일상에서의 사용 조건을 함께 살펴보고 판단합니다. `).join(''),evidenceHash:prompt.match(/"evidenceHash":"([a-f0-9]+)"/)[1]})};
 });
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('External fetch blocked');});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore();});

const BASE={gender:'F',birthDate:'1995-04-18',birthTime:'09:00',calendarType:'solar',familyName:'김'};
const post=(path,body)=>route(new Request(`https://mock.test/api/naming-prompt${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{});
const start=(input=BASE)=>post('/generate',{requestId:'original-paid',input});
const resume=()=>post('/generate',{resumeExecutionId:docs[0].executionId});
const groups=()=>provider.mock.calls.map(([,,options])=>options.logContext.sectionGroup);
async function runToCompletion(first){let res=await first();for(let n=0;n<12&&res.status===202;n++)res=await resume();return res;}

it('성 한자 입력의 새 회차는 v2 판으로 서술을 받고, 저장·응답에 엔진 요약을 싣는다',async()=>{
 const res=await runToCompletion(()=>start({...BASE,surnameHanja:'金',avoidChars:'凶,死 凶'}));
 expect(res.status).toBe(201);
 expect(groups()).toEqual(['v2:narration',...[1,2,3,4,5,6,7,8].map(id=>`v2:${id}`)]);
 expect(engine.prepareNamingV2).toHaveBeenCalledTimes(1);
 const saved=docs[0].result.namingPrompt;
 expect(saved).toMatchObject({engineVersion:ENGINE_VERSION,generatedPrompt:`V2PROMPT ${ENGINE_VERSION} 여성 naming-engine-v2`,sajuSnapshot:{source:'naming-engine-v2'}});
 expect(saved.inputSnapshot).toMatchObject({surnameHanja:'金',avoidChars:['凶','死'].sort(),fixedChar:null});
 expect(saved.delivery.version).toBe(2);
 const {result}=await res.json();
 expect(result).toMatchObject({engineVersion:ENGINE_VERSION,narration:{letters:[{rank:1,letter:'v2:narration 서술 본문'}]}});
 expect(result.engine.candidates).toHaveLength(12);expect(result.nameCards).toHaveLength(12);
 const again=await route(new Request(`https://mock.test/api/naming-prompt/result/${docs[0].executionId}`),{});
 expect((await again.json()).result.engineVersion).toBe(ENGINE_VERSION);
});

it('성 한자가 없는 회차는 v1 그대로이고 엔진을 부르지 않는다',async()=>{
 const res=await runToCompletion(()=>start());
 expect(res.status).toBe(201);
 expect(groups()[0]).toBe('candidates');expect(groups().some(group=>group.startsWith('v2:'))).toBe(false);
 expect(engine.prepareNamingV2).not.toHaveBeenCalled();
 expect(docs[0].result.namingPrompt.engineVersion).toBeUndefined();expect(docs[0].result.namingPrompt.delivery.version).toBe(1);
 const {result}=await res.json();
 expect(result).not.toHaveProperty('engineVersion');expect(result).not.toHaveProperty('engine');
});

it('진행 중이던 v1 레코드는 v1 판으로 이어진다',async()=>{
 expect((await start()).status).toBe(202);expect(docs[0].result.namingPrompt).not.toHaveProperty('engineVersion');
 expect((await resume()).status).toBe(202);
 expect(groups()).toEqual(['candidates','1']);expect(engine.prepareNamingV2).not.toHaveBeenCalled();
});

it('무료 /basis 는 로그인 없이 엔진 5개를 주고 LLM·저장을 하지 않는다',async()=>{
 const res=await post('/basis',{input:{...BASE,surnameHanja:'金'}});
 expect(res.status).toBe(200);
 const body=await res.json();
 expect(body).toMatchObject({ok:true,engineVersion:ENGINE_VERSION,dataVersion:'data-test',schoolPreset:'kr-modern',saju:{useful:['water'],pillars:{d:{g:'임'}}}});
 expect(body.candidates).toHaveLength(5);
 expect(authCalls).toBe(0);expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);
 const missing=await post('/basis',{input:BASE});
 expect(missing.status).toBe(400);expect((await missing.json()).code).toBe('NAMING_SURNAME_HANJA_REQUIRED');
});

it('결제 전 checkout 이 엔진 후보 수를 확인하고, v1 입력의 해시는 바뀌지 않는다',async()=>{
 const v2=await post('/checkout',{input:{...BASE,surnameHanja:'金'}});
 expect(v2.status).toBe(200);expect((await v2.json()).engineVersion).toBe(ENGINE_VERSION);
 const plain=await (await post('/checkout',{input:BASE})).json();
 const empty=await (await post('/checkout',{input:{...BASE,surnameHanja:' ',avoidChars:[],engineMode:'',schoolPreset:''}})).json();
 expect(plain).not.toHaveProperty('engineVersion');expect(empty.inputHash).toBe(plain.inputHash);
 candidateCount=2;
 const few=await post('/checkout',{input:{...BASE,surnameHanja:'金'}});
 expect(few.status).toBe(400);expect((await few.json()).code).toBe('NAMING_ENGINE_TOO_FEW');
});

it('직접 고른 이름(nameStrategy choose)은 한글 이름을 엔진에 넘기고, 추천(기본)은 해시 키를 더하지 않는다',async()=>{
 const V2={...BASE,surnameHanja:'金'};
 const chosen=await post('/checkout',{input:{...V2,nameStrategy:'choose',desiredNames:['서윤',{hangul:'하은'}]}});
 expect(chosen.status).toBe(200);
 expect(engine.prepareNamingV2.mock.calls[0][0]).toMatchObject({nameStrategy:'choose',desiredNames:[{hangul:'서윤'},{hangul:'하은'}]});
 const base=await (await post('/checkout',{input:V2})).json();
 const recommend=await (await post('/checkout',{input:{...V2,nameStrategy:'recommend'}})).json();
 expect(engine.prepareNamingV2.mock.calls[1][0]).not.toHaveProperty('nameStrategy');
 expect(recommend.inputHash).toBe(base.inputHash);expect((await chosen.json()).inputHash).not.toBe(base.inputHash);
});

it.each([
 [{avoidChars:'凶'},'NAMING_SURNAME_HANJA_REQUIRED'],
 [{nameStrategy:'choose',desiredNames:['서윤']},'NAMING_SURNAME_HANJA_REQUIRED'],
 [{surnameHanja:'金',nameStrategy:'choose'},'NAMING_DESIRED_NAMES_INVALID'],
 [{surnameHanja:'金',nameStrategy:'choose',desiredNames:['서윤아']},'NAMING_DESIRED_NAMES_INVALID'],
 [{surnameHanja:'Kim'},'NAMING_SURNAME_HANJA_INVALID'],
 [{surnameHanja:'金',nameLength:3},'NAMING_ENGINE_NAME_LENGTH'],
])('v2 입력 %j 는 결제 전에 400 %s',async(extra,code)=>{
 const res=await post('/checkout',{input:{...BASE,...extra}});
 expect(res.status).toBe(400);expect((await res.json()).code).toBe(code);expect(engine.prepareNamingV2).not.toHaveBeenCalled();
});

// 2026-11-20 R10 다시 시도 우선(사용자 결정 "다시 시도+7일 환불 도입"): 본문을 끝내 받지 못한 웹 회차는 바로 환불하지 않고
// 추가 결제·차감 없는 다시 시도를 연다. 환불은 고객 요청 또는 생성 + 7일 뒤 크론이 맡는다.
const DAY=86400000;
const getResult=id=>route(new Request(`https://mock.test/api/naming-prompt/result/${id}`),{});
async function failOnce(){provider.mockImplementation(async()=>({ok:true,text:'{}'}));return runToCompletion(()=>start());}
const heldDoc=(access,{createdAt=new Date(Date.now()-DAY),refundAt=new Date(createdAt.getTime()+7*DAY),...extra}={})=>({_id:'held',executionId:'exec-held',userId:uid,featureId:'premium-naming-prompt',
 status:'generation_failed',createdAt,updatedAt:new Date(Date.now()-3600000),...extra,
 result:{namingPrompt:{access,inputSnapshot:BASE,generatedResult:'',delivery:{version:1,attempts:{candidates:2},invalidAttempts:{candidates:2},chapters:{},candidates:null},limited:true,
  retryable:{since:createdAt,refundAt,code:'NAMING_RESULT_TOO_SHORT'}}}});
const PASS_ACCESS={accessMethod:'pass',accessType:'membership_pass',evidenceId:'ev-1',paymentId:'',requestId:'original-paid'};
const CARD_ACCESS={accessMethod:'single',accessType:'single_purchase',evidenceId:'merchant-1',paymentId:'merchant-1',requestId:'merchant-1'};

it('본문을 끝내 받지 못한 웹 회차는 환불하지 않고 생성 + 7일 다시 시도 창으로 보류한다',async()=>{
 const res=await failOnce();
 expect(res.status).toBe(503);
 expect(passRefund).not.toHaveBeenCalled();
 const body=await res.json();
 expect(body).toMatchObject({ok:false,reason:'LLM_ERROR',refunded:false,retry:{available:true,sessionId:docs[0].executionId}});
 expect(new Date(body.retry.refundAt).getTime()).toBe(new Date(docs[0].createdAt).getTime()+7*DAY);
 expect(docs[0].status).toBe('generation_failed');
 expect(docs[0].result.namingPrompt.retryable).toMatchObject({code:'NAMING_RESULT_TOO_SHORT'});
 const again=await getResult(docs[0].executionId);
 expect(again.status).toBe(503);expect((await again.json()).retry).toMatchObject({available:true});
});

it('다시 시도는 같은 회차의 시도 예산만 새로 열어 추가 차감 없이 끝까지 생성한다',async()=>{
 const good=provider.getMockImplementation();
 await failOnce();
 const executionId=docs[0].executionId;
 provider.mockImplementation(good);
 const res=await runToCompletion(()=>post('/retry',{executionId}));
 expect(res.status).toBe(201);
 expect(docs[0].status).toBe('completed');
 expect(docs[0].result.namingPrompt.retryable.reopens).toBe(1);
 expect(passRefund).not.toHaveBeenCalled();
});

it('철회된 결제 건은 다시 시도를 열지 않는다(409)',async()=>{
 await failOnce();
 revoked=true;
 const res=await post('/retry',{executionId:docs[0].executionId});
 expect(res.status).toBe(409);
 expect(docs[0].status).toBe('generation_failed');expect(docs[0].result.namingPrompt.retryable.reopens).toBeUndefined();
});

it('환불 요청은 이용권 회차의 차감을 증빙으로 되돌리고 회차를 환불로 닫는다',async()=>{
 await failOnce();
 const res=await post('/refund-request',{executionId:docs[0].executionId});
 expect(res.status).toBe(200);
 expect(await res.json()).toMatchObject({ok:true,refunded:true,refundStatus:'refunded'});
 expect(passRefund).toHaveBeenCalledTimes(1);
 expect(passRefund).toHaveBeenCalledWith(expect.objectContaining({featureKey:'premium-naming-prompt',requestId:'original-paid'}));
 expect(docs[0].status).toBe('refunded');
 expect(docs[0].result.namingPrompt.retryable).toMatchObject({refundReason:'CUSTOMER_REQUEST',refundStatus:'refunded'});
 expect((await post('/retry',{executionId:docs[0].executionId})).status).toBe(409);
});

it('단건 카드 회차의 환불 요청은 결제 취소를 부르고, 취소가 실패하면 정산 표시 없이 크론에 맡긴다',async()=>{
 cardPayment={_id:'pay-1',userId:uid,merchantUid:'merchant-1',featureKey:'premium-naming-prompt',status:'paid'};
 docs.push(heldDoc(CARD_ACCESS));
 cardRefund.mockResolvedValueOnce({refunded:false,refundFailed:true,reason:'PG_DOWN'});
 const failed=await (await post('/refund-request',{executionId:'exec-held'})).json();
 expect(failed).toMatchObject({ok:true,refunded:false,refundStatus:'failed'});
 expect(docs[0].status).toBe('generation_failed');expect(docs[0].result.namingPrompt.retryable.refundSettledAt).toBeUndefined();
 const outcomes=await settleDue({});
 expect(outcomes).toEqual([{service:'naming-prompt',refundStatus:'refunded'}]);
 expect(cardRefund).toHaveBeenCalledTimes(2);
 expect(cardRefund.mock.calls[1][1]).toMatchObject({merchantUid:'merchant-1'});
 expect(docs[0].status).toBe('refunded');expect(passRefund).not.toHaveBeenCalled();
});

it('환불 크론은 생성 + 7일이 지난 보류만 닫아 정산하고, 창 안의 보류와 살아 있는 생성은 건드리지 않는다',async()=>{
 const old=new Date(Date.now()-8*DAY);
 docs.push(heldDoc(PASS_ACCESS,{createdAt:old}));
 docs.push({...heldDoc(PASS_ACCESS),_id:'open',executionId:'exec-open'});
 docs.push({...heldDoc(PASS_ACCESS,{createdAt:old}),_id:'live',executionId:'exec-live',status:'generating',updatedAt:new Date()});
 const outcomes=await settleDue({});
 expect(outcomes).toEqual([{service:'naming-prompt',refundStatus:'refunded'}]);
 expect(passRefund).toHaveBeenCalledTimes(1);
 expect(docs.map(d=>d.status)).toEqual(['refunded','generation_failed','generating']);
 expect(docs[0].result.namingPrompt.retryable.refundReason).toBe('RETRY_WINDOW_EXPIRED');
});

// 2026-11-22 D2: 복구 크론의 정체 확정. 창 안은 다시 시도 가능(장·접근 증빙 보존, 환불 없음), 창이 지나면 기존 보류 환불(settleNamingRetryRefund).
const stalledDoc=(opts={})=>{const doc=heldDoc(PASS_ACCESS,opts);doc.status='partial';delete doc.result.namingPrompt.retryable;doc.updatedAt=new Date(Date.now()-300000);return doc;};
const quietWarn=async work=>{const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});try{return await work();}finally{warn.mockRestore();}};
it('정체 확정은 창 안의 작명 회차를 환불 없이 다시 시도 가능으로 둔다',async()=>{
 docs.push(stalledDoc());
 const out=await quietWarn(()=>settleStuck({},{doc:{executionId:'exec-held',userId:uid},now:Date.now()}));
 expect(out.outcome).toBe('retryable');
 expect(docs[0].status).toBe('generation_failed');
 expect(docs[0].result.namingPrompt.retryable).toMatchObject({code:'DELIVERY_STUCK'});
 expect(new Date(docs[0].result.namingPrompt.retryable.refundAt).getTime()).toBe(new Date(docs[0].createdAt).getTime()+7*DAY);
 expect(docs[0].result.namingPrompt.access).toEqual(PASS_ACCESS);
 expect(passRefund).not.toHaveBeenCalled();
 expect((await getResult('exec-held')).status).toBe(503);
});
it('정체 확정은 창이 지난 작명 회차를 기존 보류 환불로 한 번만 정산한다',async()=>{
 docs.push(stalledDoc({createdAt:new Date(Date.now()-8*DAY)}));
 const out=await quietWarn(()=>settleStuck({},{doc:{executionId:'exec-held',userId:uid},now:Date.now()}));
 expect(out).toEqual({outcome:'generation_failed',refundStatus:'refunded'});
 expect(passRefund).toHaveBeenCalledTimes(1);
 expect(docs[0].status).toBe('refunded');
 expect(docs[0].result.namingPrompt.retryable.refundReason).toBe('RETRY_WINDOW_EXPIRED');
 await settleDue({});expect(passRefund).toHaveBeenCalledTimes(1);
});
it('정체 확정은 살아 있는 생성·토스 회차·완성 회차를 건드리지 않는다',async()=>{
 docs.push(stalledDoc());docs[0].updatedAt=new Date();
 const doc={executionId:'exec-held',userId:uid};
 expect((await settleStuck({},{doc,now:Date.now()})).outcome).toBe('leased');
 docs[0].updatedAt=new Date(Date.now()-300000);docs[0].result.namingPrompt.tossIntentId='t'.repeat(64);
 expect((await quietWarn(()=>settleStuck({},{doc,now:Date.now()}))).outcome).toBe('unsettled');
 expect(docs[0].status).toBe('partial');
 delete docs[0].result.namingPrompt.tossIntentId;docs[0].status='completed';
 expect((await settleStuck({},{doc,now:Date.now()})).outcome).toBe('progressed');
 expect(passRefund).not.toHaveBeenCalled();
});
