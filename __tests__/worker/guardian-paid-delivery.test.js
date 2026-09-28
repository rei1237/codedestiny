/** @jest-environment node */
import { jest } from '@jest/globals';
import { HttpError } from '../../worker/lib/http.js';
let delivery,guardianNarrativeAdapter;
let docs,provider,revoked,userId,fault,lost,external,kind,mode;
const owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
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
// A structurally complete answer whose visible text is about chars long, with
// numbered sentences so the repeated-passage check never trips.
const answer=(chars,tag='a')=>{const fields=['openingLine','innerState','coreReading','topicAdvice','cautionPattern','luckyAction'],each=Math.ceil(chars/6),out={title:'상담'};
 fields.forEach(field=>{let text='';for(let i=0;text.length<each;i++)text+=`${tag} ${field} ${i}번째 문장은 계산 근거와 생활 장면을 이어서 설명합니다. `;out[field]=text.slice(0,each).trim();});
 return {...out,evidenceLines:['근거 하나','근거 둘','근거 셋'],followUpQuestions:['다음 질문 하나','다음 질문 둘','다음 질문 셋'],premiumCta:{reason:''}};};
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>{if(mode==='denied')throw new HttpError(403,'payment denied');return {ok:true,accessType:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({deliverGuardianPaid:delivery,guardianNarrativeAdapter}=await import('../../worker/lib/guardian-paid-delivery.js'));
});
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;mode='paid';
 provider=jest.fn(async()=>({usedFallback:false,deliverable:true,result:answer(3000)}));
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
test.each(['fallback','mock','invalid'])('%s is retained as incomplete, never sold as successful',async kind=>{provider.mockResolvedValue({result:{coreReading:'not a live paid answer'},usedFallback:kind==='fallback',isMock:kind==='mock',deliverable:kind!=='invalid'});for(let i=0;i<3;i++)expect(await start()).toMatchObject({ok:false,status:202});expect((await start()).retryable).toBe(false);expect(provider).toHaveBeenCalledTimes(2);expect(docs[0].premiumStatus).toBe('generating');});
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
test('short complete answer is delivered on its first attempt without a length repair',async()=>{
 provider.mockResolvedValueOnce({usedFallback:false,deliverable:true,lengthDraft:true,result:answer(1500,'draft')});
 expect(await start()).toMatchObject({ok:true,status:200,saved:true});
 expect(JSON.parse(docs[0].metadata.paidNarrative.parts.answer).coreReading).toContain('draft');
 expect(await start()).toMatchObject({ok:true,saved:true});expect(provider).toHaveBeenCalledTimes(1);
});
test('the first usable answer completes before an unnecessary repair can replace it',async()=>{
 provider.mockResolvedValueOnce({usedFallback:false,deliverable:true,result:answer(1800,'first')}).mockResolvedValueOnce({usedFallback:false,deliverable:true,result:answer(1200,'second')});
 await start();const result=await start();
 expect(result).toMatchObject({ok:true,status:200,saved:true});
 expect(JSON.parse(docs[0].metadata.paidNarrative.parts.answer).coreReading).toContain('first');expect(docs[0].premiumStatus).toBe('completed');expect(provider).toHaveBeenCalledTimes(1);
});
test('an incomplete short answer is never kept as a draft',async()=>{
 const {evidenceLines,...missing}=answer(1500);provider.mockResolvedValueOnce({usedFallback:false,deliverable:true,result:missing});
 expect(await start()).toMatchObject({ok:false,status:202});expect(docs[0].metadata.paidNarrative.drafts?.answer).toBeFalsy();
});
test('a record seeded before the draft contract keeps the producer rejection',async()=>{
 const generator=jest.fn(async()=>({deliverable:false}));
 await guardianNarrativeAdapter({NODE_ENV:'test'},owner,generator).produce({id:'answer',minChars:1},{input,context:{},body:{requestId:'legacy-request'},drafts:{answer:'{}'}});
 expect(generator.mock.calls[0][0].acceptShortDraft).toBeUndefined();expect(generator.mock.calls[0][0].repairDraft).toBeUndefined();
});
test('length metadata does not prevent delivery or leak to the displayed answer',async()=>{
 const draft=answer(2560,'lifted');draft.premiumCta={reason:'정규화 과정에서 채워진 폴백 사유 문구가 이 초안의 길이를 기준 위로 올립니다.'};
 provider.mockResolvedValue({usedFallback:false,deliverable:true,lengthDraft:true,result:draft});
 await start();await start();const result=await start();
 expect(result).toMatchObject({ok:true,status:200,saved:true});expect(docs[0].premiumStatus).toBe('completed');
 expect(result.result).not.toHaveProperty('lengthDraft');expect(provider).toHaveBeenCalledTimes(1);
});
