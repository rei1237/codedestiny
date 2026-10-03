/** @jest-environment node */
import { jest } from "@jest/globals";
// 작명 v2 라우트 배선(설계서 §10). 엔진·서술 로직은 __tests__/ui/naming-engine*.test.mjs 가 실제 모듈로 검사한다 —
// jest 는 TS 를 못 읽으므로 여기서는 service.ts 를 손 가짜로 바꾸고, 라우트의 판 선택·저장·직렬화·무료 경로만 본다.

const uid="64b7f2a1c3d4e5f601234567";
let route,docs,provider,userId,authCalls,fetchBlock,candidateCount;
const clone=v=>v==null?v:structuredClone(v);
const get=(d,k)=>k.split('.').reduce((v,p)=>v?.[p],d);
function set(d,k,v){const keys=k.split('.');const end=keys.pop();let o=d;for(const key of keys)o=o[key]??={};o[end]=clone(v);}
function matches(d,f){return Object.entries(f).every(([k,v])=>{
 if(k==='$or')return v.some(x=>matches(d,x));
 const value=get(d,k);if(v&&typeof v==='object'&&!(v instanceof Date)){
 if('$in'in v)return v.$in.includes(value);if('$nin'in v)return !v.$nin.includes(value);if('$ne'in v)return value!==v.$ne;
 }return String(value)===String(v);
});}
function query(v){return {lean:async()=>clone(v),sort(){return this;},select(){return this;}};}
const model={
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
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_e,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>{authCalls++;return {userId};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,PaidExecutionRecord:model,
  PointHistory:{findOne:f=>query(f.$and?null:{_id:uid,metadata:{accessMethod:'PASS',requestId:'original-paid'}}),updateOne:async()=>({})},
  Payment:{findOne:()=>query(null),findByIdAndUpdate:()=>query(null)},
  MonthlyCreditLedger:{findOne:()=>query(null),updateOne:async()=>({})},
 }));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 jest.unstable_mockModule('../../worker/lib/monthly-credit-store.js',()=>({restoreMonthlyCreditLot:async()=>({})}));
 jest.unstable_mockModule('../../worker/naming-engine/service.ts',()=>engine);
 ({handleNamingPromptRoutes:route}=await import('../../worker/routes/naming-prompt.js'));
});
beforeEach(()=>{docs=[];userId=uid;authCalls=0;candidateCount=12;
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

it.each([
 [{avoidChars:'凶'},'NAMING_SURNAME_HANJA_REQUIRED'],
 [{surnameHanja:'Kim'},'NAMING_SURNAME_HANJA_INVALID'],
 [{surnameHanja:'金',nameLength:3},'NAMING_ENGINE_NAME_LENGTH'],
])('v2 입력 %j 는 결제 전에 400 %s',async(extra,code)=>{
 const res=await post('/checkout',{input:{...BASE,...extra}});
 expect(res.status).toBe(400);expect((await res.json()).code).toBe(code);expect(engine.prepareNamingV2).not.toHaveBeenCalled();
});
