/** @jest-environment node */
import { jest } from "@jest/globals";
const uid="64b7f2a1c3d4e5f601234567";
let route,docs,provider,fault,lost,refund,blocked,mode,userId,fetchBlock;
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
 findOne:f=>{if(lost){lost=false;return query(null);}if(f.status?.$in?.includes('refunded'))return query(blocked?{}:null);return query(docs.find(d=>matches(d,f))||null);},
 findOneAndUpdate:(f,u,o={})=>{
  if(fault&&u.$set?.status===fault.status){const fail=fault;fault=null;if(fail.kind==='throw')throw Error('storage');if(fail.kind==='null')return query(null);if(fail.kind==='confirm')lost=true;}
  let doc=docs.find(d=>matches(d,f)),before=clone(doc);
  if(!doc&&o.upsert){doc={...clone(u.$setOnInsert),_id:'record'};docs.push(doc);}
  if(doc){for(const[k,v]of Object.entries(u.$set||{}))set(doc,k,v);if(o.timestamps!==false)doc.updatedAt=new Date();}
  return query(o.returnDocument==='before'?before:doc||null);
 },
 updateOne:async(f,u)=>{const doc=docs.find(d=>matches(d,f));if(doc)for(const[k,v]of Object.entries(u.$set||{}))set(doc,k,v);return {modifiedCount:doc?1:0};},
};
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_e,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,PaidExecutionRecord:model,
  PointHistory:{findOne:f=>query(f.$and?null:{_id:uid,metadata:{accessMethod:mode,requestId:'original-paid'}}),updateOne:(...args)=>refund(...args)},
  Payment:{findOne:()=>query(null),findByIdAndUpdate:()=>query(null)},
  MonthlyCreditLedger:{findOne:()=>query(null),updateOne:(...args)=>refund(...args)},
 }));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 jest.unstable_mockModule('../../worker/lib/monthly-credit-store.js',()=>({restoreMonthlyCreditLot:(...args)=>refund(...args)}));
 ({handleNamingPromptRoutes:route}=await import('../../worker/routes/naming-prompt.js'));
});
beforeEach(()=>{docs=[];fault=null;lost=false;blocked=false;mode='PASS';userId=uid;refund=jest.fn();
 provider=jest.fn(async(_env,prompt,options)=>{
  expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);
  if(options.logContext.sectionGroup==='candidates')return {ok:true,provider:'gemini',text:'[이름카드]\n'+['서윤','서연','지우','지유','소율'].map(name=>`후보: ${name} | 뜻: 이름의 의미 | 총평: 생활 속에서 부르기 좋은 이름`).join('\n')+'\n최종: 서윤 | 이유: 가족의 선호와 어울립니다.\n[/이름카드]'};
  const id=options.logContext.sectionGroup;
  return {ok:true,provider:'gemini',text:JSON.stringify({title:`검증 ${id}장`,body:Array.from({length:65},(_,i)=>`${id}장 ${i}번째 이름의 의미와 소리 흐름은 계산된 근거와 일상에서의 사용 조건을 함께 살펴보고 판단합니다. `).join(''),evidenceHash:prompt.match(/"evidenceHash":"([a-f0-9]+)"/)[1]})};
 });
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('External fetch blocked');});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore();});
async function start(){return route(new Request('https://mock.test/api/naming-prompt/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:'original-paid',input:{gender:'F',birthDate:'1995-04-18',birthTime:'09:00',calendarType:'solar',familyName:'김'}})}),{});}
async function resume(extra={}){return route(new Request('https://mock.test/api/naming-prompt/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resumeExecutionId:docs[0].executionId,...extra})}),{});}
for(const access of ['PASS','MONTHLY','SINGLE'])it(`${access}: stored provider body is completed and replayed without regenerating`,async()=>{
 mode=access;expect((await start()).status).toBe(202);expect((await start()).status).toBe(202);const first=await start();expect(first.status).toBe(201);expect((await first.json()).result.generatedResult).toContain('이름의 의미');expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(9);
 expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9);expect(refund).not.toHaveBeenCalled();
});
for(const kind of ['throw','null','confirm'])it(`final ${kind} returns storage 503 and reuses the pending result`,async()=>{
 await start();await start();fault={status:'completed',kind};const first=await start();expect(first.status).toBe(503);expect(await first.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionId});
 expect(refund).not.toHaveBeenCalled();expect(docs[0].status).not.toBe('generation_failed');
 expect([200,201]).toContain((await start()).status);expect(provider).toHaveBeenCalledTimes(9);
});
it('generating prompt is never a customer completed result',async()=>{
 let release;const promise=new Promise(resolve=>{release=resolve;});const base=provider.getMockImplementation();provider.mockImplementation(async()=>{await promise;return base();});
 const running=start();for(let n=0;n<50&&!docs.length;n++)await new Promise(resolve=>setImmediate(resolve));
 const duplicate=await start();expect(duplicate.status).toBe(202);expect((await duplicate.json()).result).toBeUndefined();release();expect((await running).status).toBe(202);
});
it('revoked completion is not replayed',async()=>{await start();await start();await start();blocked=true;expect((await start()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(9);});
it('other owners cannot read generated results',async()=>{await start();userId='other-owner';const res=await route(new Request(`https://mock.test/api/naming-prompt/result/${docs[0].executionId}`),{});expect(res.status).toBe(404);});

it('successful chapters survive a provider interruption; only missing chapters resume',async()=>{
 await start();const base=provider.getMockImplementation();provider.mockImplementationOnce((...args)=>base(...args)).mockImplementationOnce(()=>{throw Error('disconnected');});
 expect((await start()).status).toBe(202);expect(Object.keys(docs[0].result.namingPrompt.delivery.chapters)).toHaveLength(3);
 await start();expect((await start()).status).toBe(201);expect(provider).toHaveBeenCalledTimes(10);
});
it('result GET restores partial body and input-free server resume id',async()=>{
 await start();await start();const id=docs[0].executionId;
 const response=await route(new Request(`https://mock.test/api/naming-prompt/result/${id}`),{});expect(response.status).toBe(202);
 expect(await response.json()).toMatchObject({resumeBody:{resumeExecutionId:id},result:{status:'partial',completedChapters:['1','2','3','4']}});
});
it('server-only resume keeps the original evidence and locale and refuses changed inputs',async()=>{
 await start();const original=clone(docs[0].result.namingPrompt);
 expect((await resume({locale:'en'})).status).toBe(202);
 expect(docs[0].result.namingPrompt.locale).toBe(original.locale);
 expect(docs[0].result.namingPrompt.access).toEqual(original.access);
 expect((await resume({input:{...original.inputSnapshot,familyName:'이'}})).status).toBe(409);
 expect((await resume()).status).toBe(201);expect(provider).toHaveBeenCalledTimes(9);
});
for(const kind of ['throw','null','confirm'])it(`checkpoint ${kind} prevents a false completion and resumes stored chapters`,async()=>{
 await start();fault={status:'partial',kind};expect((await resume()).status).toBe(503);
 expect(docs[0].status).not.toBe('completed');expect(refund).not.toHaveBeenCalled();
 for(let n=0;n<3&&docs[0].status!=='completed';n++)await resume();
 expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(9);
});
it('short or contradictory chapter evidence is not accepted and only that chapter is repaired',async()=>{
 await start();const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{
  const ai=await base(...args),value=JSON.parse(ai.text);value.evidenceHash='invented';return {...ai,text:JSON.stringify(value)};
 });
 expect((await resume()).status).toBe(202);expect(docs[0].result.namingPrompt.delivery.chapters[1]).toBeUndefined();
 await resume();await resume();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(10);
});
it('19999/20000 body boundary requires all eight named chapters',async()=>{
 const {namingReportComplete}=await import('../../worker/lib/naming-report-delivery.js');
 const chapters=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,{id:i+1,title:'제목',body:'가'.repeat(i?2500:2499)}]));
 expect(namingReportComplete({chapters})).toBe(false);chapters[1].body+='나';expect(namingReportComplete({chapters})).toBe(true);
 delete chapters[5];expect(namingReportComplete({chapters})).toBe(false);
});
