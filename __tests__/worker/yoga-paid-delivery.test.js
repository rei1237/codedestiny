/** @jest-environment node */
import { jest } from '@jest/globals';
let route,docs,provider,revoked,userId,fault,lost,external,kind,mode;
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
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async(_env,_owner,_type,body)=>{proofs.push(body);return {ok:mode!=='denied',status:402};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:(...args)=>provider(...args)}));
 ({handleYogaGuruRoutes:route}=await import('../../worker/routes/yoga-guru.js'));
});
let proofs=[];
let duration=30;
function course(){return {course_metadata:{title:'맞춤 수련 안내',deity_theme:'고요한 성찰의 상징',duration_min:duration,intensity:'Beginner',focus_area:'몸과 마음의 이완',chakra_focus:'상징으로 살펴보는 주의 집중'},sequence:['Warmup','Asana','Pranayama','Relaxation'].map((type,i)=>({step_number:i+1,type,sanskrit_name:'Sukha practice '+i,english_name:'Guided practice '+i,duration_seconds:duration*15,instructions:Array.from({length:6},(_,j)=>`${i+1}단계 ${j+1}번째 안내에서는 움직임을 강요하지 않고 편안한 범위에서 자신의 상태를 관찰하세요. ${i+1}단계 ${j+1}번째 감각을 살피며 불편하면 쉬고 자연스러운 호흡으로 돌아옵니다.`),breathing_guide:i+'단계에서 편안한 자연 호흡',benefits_physical:i+'단계에서 긴장을 살펴보는 연습',benefits_spiritual:i+'단계에서 주의를 모으는 상징',caution:i+'단계에서도 불편하면 중단하세요.',visual_cue_ui:i+'단계의 차분한 시각적 안내'})),closing_mantra:'고요한 마음으로 수련을 마무리합니다.'};}
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;mode='pass';proofs=[];duration=30;provider=jest.fn(async(_env,_prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);return {ok:true,provider:'gemini',text:JSON.stringify(course())};});external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const original=()=>({requestId:'original-paid-yoga',transactionId:'paid-'+mode,systemPrompt:'개인화 코스를 JSON으로 만들어 주세요.',userPrompt:duration+'분 수련을 차분하게 안내해 주세요.',duration});
const post=body=>route(new Request('https://mock.test/api/yoga-guru',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
test.each(['pass','monthly','single'].flatMap(pay=>[30,60].map(minutes=>[pay,minutes])))('%s %i-minute course is saved and reopened without another provider',async(pay,minutes)=>{mode=pay;duration=minutes;const result=await start();expect(result.status).toBe(200);const data=await result.json();expect(data.saved).toBe(true);expect(data.course_metadata.duration_min).toBe(minutes);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(1);expect(proofs.every(p=>p.requestId===original().requestId)).toBe(true);});
test.each(['pass','monthly','single'].flatMap(pay=>['throw','null','confirm'].map(kind=>[pay,kind])))('%s final storage %s preserves the course',async(pay,kind)=>{mode=pay;fault={kind};const result=await start();expect(result.status).toBe(503);expect(await result.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE'});expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(1);});
test.each(['throw','null','confirm'])('checkpoint %s prevents any provider call',async kind=>{fault={kind,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(200);});
test.each(['short','missing','duration','order','truncated','interrupted','mock'])('%s is never presented as a fallback course',async kind=>{provider.mockImplementationOnce(async()=>{if(kind==='interrupted')throw Error('lost');const value=course();if(kind==='short')value.sequence.forEach(step=>step.instructions=['짧은 안내','아주 짧음']);if(kind==='missing')delete value.sequence[0].caution;if(kind==='duration')value.sequence[0].duration_seconds++;if(kind==='order')value.sequence[0].type='Asana';return {ok:true,truncated:kind==='truncated',isMock:kind==='mock',text:JSON.stringify(value)};});const partial=await start();expect(partial.status).toBe(202);expect((await partial.json()).source).toBe('pending');expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(2);});
test('owner, original request and payment revocation are checked again',async()=>{mode='denied';expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();mode='pass';await start();userId='other';expect((await resume()).status).toBe(404);userId=owner;expect((await post({...original(),userPrompt:'다른 코스'})).status).toBe(409);revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(1);});
test('concurrent requests and a different UI locale reuse the original course',async()=>{const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');let release;const hold=new Promise(resolve=>release=resolve),base=provider.getMockImplementation(),locales=[];provider.mockImplementation(async(...args)=>{locales.push(getAmbientAiLocale());await hold;return base(...args);});const first=runWithAiLocale('ja',start);for(let i=0;i<100&&!provider.mock.calls.length;i++)await new Promise(resolve=>setImmediate(resolve));expect((await start()).status).toBe(202);release();expect((await first).status).toBe(200);expect(locales).toEqual(['ja']);expect((await resume()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(1);});
test('three interruptions remain recoverable without false completion or refund',async()=>{provider.mockResolvedValue({ok:false});await start();for(let i=0;i<5;i++)await resume();expect(provider).toHaveBeenCalledTimes(3);expect(docs[0].status).toBe('pending');});
