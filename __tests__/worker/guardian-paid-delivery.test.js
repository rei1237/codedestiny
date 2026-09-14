/** @jest-environment node */
import { jest } from '@jest/globals';
import { HttpError } from '../../worker/lib/http.js';
let delivery;
let docs,provider,revoked,userId,fault,lost,external,kind,mode;
const owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
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
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>{if(mode==='denied')throw new HttpError(403,'payment denied');return {ok:true,accessType:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({deliverGuardianPaid:delivery}=await import('../../worker/lib/guardian-paid-delivery.js'));
});
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;mode='paid';
 provider=jest.fn(async()=>({usedFallback:false,deliverable:true,result:{openingLine:'저장된 대화 시작',coreReading:'계산 근거를 바탕으로 읽은 원래 상담 본문',luckyAction:'마지막 조언입니다.'}}));
 external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});


const input={birthDate:'1990-01-01',category:'saju',topic:'daily',mode:'yeoni',locale:'ko',targetDate:'2026-09-15',concern:'어떤 선택을 준비할까요?'};
const access=async()=>mode==='denied'?{ok:false}:{ok:true};
const start=(extra={})=>delivery({env:{NODE_ENV:'test'},input,userId,requestId:'paid-guardian-original',resolvePaidAccess:access,contextBuilder:async()=>({ok:true,context:{availableSystems:['saju'],dayMaster:'갑목'}}),generator:(...args)=>provider(...args),...extra});
test('completed paid response survives response loss and process recreation',async()=>{expect(await start()).toMatchObject({ok:true,status:200,saved:true,generationSource:'paid'});expect(await start({resumeOnly:true,input:{...input,concern:'수정된 입력'}})).toMatchObject({ok:true,status:200,saved:true});expect(provider).toHaveBeenCalledTimes(1);expect(docs[0].metadata.paidNarrative.input.concern).toBe(input.concern);});
test.each(['throw','null','confirm'])('final save %s preserves generated answer',async kind=>{fault={kind};expect(await start()).toMatchObject({ok:false,status:503,paymentRetainedForRetry:true});expect(await start({resumeOnly:true})).toMatchObject({ok:true,saved:true});expect(provider).toHaveBeenCalledTimes(1);});
test.each(['throw','null','confirm'])('checkpoint %s stops generation and can retry the original turn',async kind=>{fault={kind,metadata:true};expect(await start()).toMatchObject({ok:false,status:503});expect(provider).not.toHaveBeenCalled();expect(await start()).toMatchObject({ok:true,saved:true});});
test('payment rejection, cancellation and foreign user cannot read the answer',async()=>{await start();mode='denied';expect(await start({resumeOnly:true})).toMatchObject({status:403});mode='paid';revoked=true;expect(await start()).toMatchObject({status:403});userId='other';expect(await start({resumeOnly:true})).toBeNull();expect(provider).toHaveBeenCalledTimes(1);});
test.each(['fallback','mock','invalid'])('%s is retained as incomplete, never sold as successful',async kind=>{provider.mockResolvedValue({result:{coreReading:'not a live paid answer'},usedFallback:kind==='fallback',isMock:kind==='mock',deliverable:kind!=='invalid'});for(let i=0;i<3;i++)expect(await start()).toMatchObject({ok:false,status:202});expect((await start()).retryable).toBe(false);expect(provider).toHaveBeenCalledTimes(3);expect(docs[0].premiumStatus).toBe('generating');});
test('disabled live configuration never falls back to a mock paid result',async()=>{expect(await start({env:{}})).toMatchObject({ok:false,status:503,error:'LLM_NOT_CONFIGURED'});expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);});
test('overlapping paid requests share the claim',async()=>{let release;const pause=new Promise(resolve=>release=resolve),original=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{await pause;return original(...args);});const one=start();for(let i=0;i<30&&!provider.mock.calls.length;i++)await new Promise(resolve=>setImmediate(resolve));expect(await start()).toMatchObject({status:202,busy:true});release();expect(await one).toMatchObject({saved:true});expect(provider).toHaveBeenCalledTimes(1);});

test('real generation entry resumes the paid receipt before reserving another turn',async()=>{
 const {generateGuardianFortuneRequest}=await import('../../worker/lib/guardian-fortune-generate.js');
 const {createMemoryGuardianFortuneStore}=await import('../../worker/lib/guardian-fortune-usage.js');
 const store=createMemoryGuardianFortuneStore();await store.reserveDaily(owner,'2026-09-15');await store.commitDaily(owner,'2026-09-15');
 const options={input,userId:owner,requestId:'paid-guardian-original',dateKey:'2026-09-15',store,resolvePaidAccess:access,paidDelivery:args=>start(args)};
 expect(await generateGuardianFortuneRequest(options)).toMatchObject({ok:true,saved:true,generationSource:'paid'});
 expect(await generateGuardianFortuneRequest(options)).toMatchObject({ok:true,saved:true});expect(provider).toHaveBeenCalledTimes(1);
 expect((await store.findAttempt('paid-guardian-original')).status).toBe('completed');
});
test('server-owned latest lookup returns the saved paid turn without browser input',async()=>{await start();expect(await start({readOnly:true,requestId:undefined,input:undefined})).toMatchObject({ok:true,saved:true,requestId:'paid-guardian-original'});expect(provider).toHaveBeenCalledTimes(1);});
