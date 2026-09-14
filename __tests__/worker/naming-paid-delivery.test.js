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
 provider=jest.fn(async()=>({ok:true,provider:'gemini',text:Array.from({length:8},(_,n)=>`## ${n+1}. 검증 장\n`+Array.from({length:25},(_,i)=>`${n}장 ${i}번째 이름의 의미와 소리 흐름은 계산된 근거와 일상에서의 사용 조건을 함께 살펴보고 판단합니다. `).join('')).join('\n\n')}));
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('External fetch blocked');});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore();});
async function start(){return route(new Request('https://mock.test/api/naming-prompt/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:'original-paid',input:{gender:'F',birthDate:'1995-04-18',birthTime:'09:00',calendarType:'solar',familyName:'김'}})}),{});}
for(const access of ['PASS','MONTHLY','SINGLE'])it(`${access}: stored provider body is completed and replayed without regenerating`,async()=>{
 mode=access;const first=await start();expect(first.status).toBe(201);expect((await first.json()).result.generatedResult).toContain('이름의 의미');expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(1);
 expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(1);expect(refund).not.toHaveBeenCalled();
});
for(const kind of ['throw','null','confirm'])it(`final ${kind} returns storage 503 and reuses the pending result`,async()=>{
 fault={status:'completed',kind};const first=await start();expect(first.status).toBe(503);expect(await first.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionId});
 expect(refund).not.toHaveBeenCalled();expect(docs[0].status).not.toBe('generation_failed');
 expect([200,201]).toContain((await start()).status);expect(provider).toHaveBeenCalledTimes(1);
});
it('generating prompt is never a customer completed result',async()=>{
 let release;const promise=new Promise(resolve=>{release=resolve;});const base=provider.getMockImplementation();provider.mockImplementation(async()=>{await promise;return base();});
 const running=start();for(let n=0;n<50&&!docs.length;n++)await new Promise(resolve=>setImmediate(resolve));
 const duplicate=await start();expect(duplicate.status).toBe(202);expect((await duplicate.json()).result).toBeUndefined();release();expect((await running).status).toBe(201);
});
it('revoked completion is not replayed',async()=>{await start();blocked=true;expect((await start()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(1);});
it('other owners cannot read generated results',async()=>{await start();userId='other-owner';const res=await route(new Request(`https://mock.test/api/naming-prompt/result/${docs[0].executionId}`),{});expect(res.status).toBe(404);});
