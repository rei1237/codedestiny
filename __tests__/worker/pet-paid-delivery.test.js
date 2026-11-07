/** @jest-environment node */
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

import { HttpError } from '../../worker/lib/http.js';
let route,lab,seedPet,docs,provider,revoked,userId,fault,lost,external,kind,mode;
const owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));if(key==='$nor')return !value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);if('$ne'in value)return actual!==value.$ne;if('$gt'in value)return new Date(actual)>new Date(value.$gt);}
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
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),structured=await import('../../worker/lib/structured-consultation.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>{if(mode==='denied')throw new HttpError(403,'payment denied');return {ok:true,accessType:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({...structured,callGeminiJsonWithRetry:(...args)=>provider(...args)}));
 ({handlePetSajuAiRoutes:route,buildAdminLabPrompt:lab,seedPetNarrative:seedPet}=await import('../../worker/routes/pet-saju-ai.js'));
});
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;kind='report';mode='pass';
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.attempts).toBe(1);expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
  const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)?.[1],label=prompt.split('[이번 호출 범위]\n')[1].split('\n')[0].replace(/[.!?]/g,'');
  return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:Array.from({length:45},(_,i)=>`${label} ${i}번째 사례는 생활의 리듬과 각자의 반응을 함께 살펴보며 적용 조건을 확인합니다. ${label} ${i}번째 선택에서는 관찰된 행동과 휴식의 차이를 바탕으로 일상을 조정할 수 있습니다.`).join('\n\n')})};
 });external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});
const pet={name:'나비',species:'cat',birthDate:'2020-01-01',birthTimeUnknown:true,breed:'generic'};
const original=()=>({requestId:'original-paid-request',date:'2026-09-15',transactionId:'paid-'+mode,...(kind==='report'?{pet}:{petA:pet,petB:{...pet,name:'달이',birthDate:'2021-02-02'}})});
const post=body=>route(new Request('https://mock.test/api/pet-saju-ai/'+kind,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
async function nativeFixture(overrides={}){
 const {runPaidNarrativeDelivery}=await import('../../worker/lib/paid-narrative-delivery.js'),{petNarrativeAdapter}=await import('../../worker/routes/pet-saju-ai.js');
 const input={requestId:'toss-paid-pet-request',date:'2026-09-15',pet},verify=jest.fn(async()=>{});
 const adapter={...petNarrativeAdapter({},'petSajuReport'),featureKey:'pet-saju-ai-consultation',generationOrigin:'toss',verify,seed:value=>seedPet('report',value),...overrides};
 const run=(body=input,method='POST')=>runPaidNarrativeDelivery(new Request('https://mock.test'+(method==='GET'?(body.pending?'?pending=1':'?resultId='+encodeURIComponent(body.resultId)):''),{method}),{},{userId:owner},method==='GET'?{}:body,adapter);
 return {input,verify,adapter,run};
}
test('Toss paid narrative stores an explicit server-owned source and rechecks before delivering partials',async()=>{
 const native=await nativeFixture(),response=await native.run();expect(response.status).toBe(202);expect(docs[0].metadata.tossPaidNarrative).toBe(true);expect(docs[0].metadata.paidNarrative.input.accessSource).toBe('toss');expect(native.verify.mock.calls.length).toBeGreaterThanOrEqual(3);expect(provider).toHaveBeenCalledTimes(4);
 const web=await route(new Request('https://mock.test/api/pet-saju-ai/result?kind=report&resultId='+encodeURIComponent(docs[0].executionKey)),{});expect(web.status).toBe(404);expect(provider).toHaveBeenCalledTimes(4);
});
test('Toss access refuses a web-funded saved narrative even when the owner matches',async()=>{
 await start();const id=docs[0].executionKey,count=provider.mock.calls.length,native=await nativeFixture();const response=await native.run({resultId:id},'GET');expect(response.status).toBe(404);expect(native.verify).not.toHaveBeenCalled();expect(provider).toHaveBeenCalledTimes(count);
});
test('a user-controlled source field in a web narrative is not treated as a Toss order',async()=>{
 const {runPaidNarrativeDelivery}=await import('../../worker/lib/paid-narrative-delivery.js');
 const adapter={featureKey:'web-feature',reportType:'webReport',verify:async()=>{},seed:async()=>({input:{accessSource:'toss'},tasks:[{id:'answer',minChars:10}]}),produce:async()=>null,render:()=>({})};
 const request=new Request('https://mock.test/web',{method:'POST'}),body={requestId:'user-controlled-source'};
 expect((await runPaidNarrativeDelivery(request,{},{userId:owner},body,adapter)).status).toBe(202);
 const saved=docs[0];expect(saved.metadata.tossPaidNarrative).toBeUndefined();
 expect((await runPaidNarrativeDelivery(new Request('https://mock.test/web?resultId='+encodeURIComponent(saved.executionKey)),{},{userId:owner},{},adapter)).status).toBe(202);
});
test('pending lookup selects the newest eligible source without hiding another source',async()=>{
 await start();const webId=docs[0].executionKey,native=await nativeFixture();await native.run();const tossId=docs[1].executionKey;docs.reverse();const web=await route(new Request('https://mock.test/api/pet-saju-ai/result?kind=report&pending=1'),{});expect(web.status).toBe(202);expect((await web.json()).resultId).toBe(webId);docs.reverse();const toss=await native.run({pending:true},'GET');expect(toss.status).toBe(202);expect((await toss.json()).resultId).toBe(tossId);
});
test('Toss denial before generation preserves its error and never creates a record',async()=>{
 const deny=Object.assign(new Error('ACCESS_DENIED'),{status:403,code:'ACCESS_DENIED'}),native=await nativeFixture({verify:jest.fn(async()=>{throw deny;})});await expect(native.run()).rejects.toBe(deny);expect(docs).toHaveLength(0);expect(provider).not.toHaveBeenCalled();
});
test('Toss denial after insertion releases its lease without starting a provider',async()=>{
 const deny=Object.assign(new Error('SESSION_EXPIRED'),{status:401,code:'SESSION_EXPIRED'}),verify=jest.fn(async()=>{if(verify.mock.calls.length===2)throw deny;}),native=await nativeFixture({verify});await expect(native.run()).rejects.toBe(deny);expect(docs).toHaveLength(1);expect(docs[0].lock.token).toBe('');expect(provider).not.toHaveBeenCalled();
});
test('Toss denial after a checkpoint never returns its saved partial',async()=>{
 const deny=Object.assign(new Error('ORDER_REFUNDED'),{status:409,code:'ORDER_REFUNDED'}),verify=jest.fn(async()=>{if(verify.mock.calls.length===3)throw deny;}),native=await nativeFixture({verify});await expect(native.run()).rejects.toBe(deny);expect(provider).toHaveBeenCalledTimes(4);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(4);expect(docs[0].lock.token).toBe('');
});
test('Toss saved result rechecks its order even if a stale web proof exists',async()=>{
 const native=await nativeFixture();let response=await native.run();for(let i=0;i<8&&response.status===202;i++)response=await native.run({resumeResultId:docs[0].executionKey});expect(response.status).toBe(200);docs[0].metadata.paidNarrativeProof={source:'web',transactionId:'unrelated'};const deny=Object.assign(new Error('ACCESS_DENIED'),{status:403,code:'ACCESS_DENIED'});native.adapter.verify=jest.fn(async()=>{throw deny;});const count=provider.mock.calls.length;await expect(native.run({resultId:docs[0].executionKey},'GET')).rejects.toBe(deny);expect(provider).toHaveBeenCalledTimes(count);
});
test('Toss exhaustion remains a review state and never invokes the web refund hook',async()=>{
 provider.mockResolvedValue({ok:false});const refund=jest.fn(),native=await nativeFixture({onExhausted:refund});await native.run();for(const task of docs[0].metadata.paidNarrative.tasks)docs[0].metadata.paidNarrative.attempts[task.id]=2;const result=await native.run({resumeResultId:docs[0].executionKey});expect(result.status).toBe(202);expect(await result.json()).toMatchObject({reviewRequired:true,retryable:false});expect(refund).not.toHaveBeenCalled();
});
test('Toss scheduled recovery requires fresh order verification before any provider call',async()=>{
 const native=await nativeFixture();await native.run();const count=provider.mock.calls.length,{resumePaidNarrativeOnServer}=await import('../../worker/lib/paid-narrative-delivery.js');await expect(resumePaidNarrativeOnServer({},docs[0],native.adapter)).rejects.toMatchObject({code:'TOSS_RECOVERY_UNAVAILABLE'});expect(provider).toHaveBeenCalledTimes(count);
 const deny=Object.assign(new Error('ORDER_REFUNDED'),{status:409,code:'ORDER_REFUNDED'}),verifyRecovery=jest.fn(async()=>{throw deny;});await expect(resumePaidNarrativeOnServer({},docs[0],{...native.adapter,verifyRecovery})).rejects.toBe(deny);expect(provider).toHaveBeenCalledTimes(count);
});
test('authorized Toss scheduled recovery rechecks before and after saving partials',async()=>{
 const native=await nativeFixture();await native.run();const count=provider.mock.calls.length,{resumePaidNarrativeOnServer}=await import('../../worker/lib/paid-narrative-delivery.js'),verifyRecovery=jest.fn(async()=>{});const response=await resumePaidNarrativeOnServer({},docs[0],{...native.adapter,verifyRecovery});expect(response.status).toBe(202);expect(provider).toHaveBeenCalledTimes(count+4);expect(verifyRecovery.mock.calls.length).toBeGreaterThanOrEqual(2);
});
test('access rejection prevents initial and resumed provider calls',async()=>{
 mode='denied';expect((await start()).status).toBe(403);expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);
 mode='pass';await start();const calls=provider.mock.calls.length;mode='denied';expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(calls);
});
async function finish(){let response;for(let n=0;n<8;n++){response=await resume();if(response.status!==202)break;}return response;}
test.each(['report','compat'].flatMap(type=>['pass','monthly','single'].map(mode=>[type,mode])))('%s %s saves a real report and reopens without regeneration',async(type,access)=>{
 kind=type;mode=access;expect((await start()).status).toBe(202);expect((await finish()).status).toBe(200);const count=provider.mock.calls.length;
 expect(count).toBe(docs[0].metadata.paidNarrative.tasks.length);expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);
});
test.each(['report','compat'].flatMap(type=>['pass','monthly','single'].flatMap(mode=>['throw','null','confirm'].map(fault=>[type,mode,fault]))))('%s %s final save %s returns storage failure and reuses every generated part',async(type,access,fail)=>{
 kind=type;mode=access;await start();fault={kind:fail};const response=await finish();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:docs[0].executionKey});
 const count=provider.mock.calls.length;expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);
});
test.each(['throw','null','confirm'])('checkpoint %s confirms storage before any provider call',async fail=>{
 fault={kind:fail,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect((await resume()).status).toBe(202);
});
test.each(['short','fact','missing','interrupted'])('%s output cannot become a completed deterministic fallback',async fail=>{
 const base=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{if(fail==='interrupted')throw Error('network lost');const response=await base(...args),value=JSON.parse(response.text);if(fail==='short')value.body='짧은 결과';if(fail==='fact')value.evidenceHash='changed';if(fail==='missing')delete value.body;return {...response,text:JSON.stringify(value)};});
 await start();expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(docs[0].metadata.paidNarrative.tasks.length+1);
});
test('owner, product, cancelled proof and frozen original input are enforced',async()=>{
 await start();const id=docs[0].executionKey;userId='other-owner';expect((await resume()).status).toBe(404);userId=owner;kind='compat';expect((await post({resumeResultId:id})).status).toBe(404);kind='report';expect((await post({...original(),pet:{...pet,name:'다른 아이'}})).status).toBe(409);revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);
});
test('server pending lookup and simultaneous resumes use a single lease',async()=>{
 await start();const found=await route(new Request('https://mock.test/api/pet-saju-ai/result?kind=report&pending=1'),{});expect(found.status).toBe(202);expect((await found.json()).resumeBody).toEqual({resumeResultId:docs[0].executionKey});
 let release;const pause=new Promise(resolve=>{release=resolve;}),base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{await pause;return base(...args);});const first=resume(),second=resume();for(let i=0;i<100&&provider.mock.calls.length<8;i++)await new Promise(resolve=>setImmediate(resolve));expect(provider).toHaveBeenCalledTimes(8);release();expect((await first).status).toBe(202);expect((await second).status).toBe(202);
});
test('original locale persists across differently localized resumes',async()=>{
 const {runWithAiLocale,getAmbientAiLocale}=await import('../../worker/lib/ai-locale-context.js');const locales=[],base=provider.getMockImplementation();provider.mockImplementation((...args)=>{locales.push(getAmbientAiLocale());return base(...args);});await runWithAiLocale('ja',start);await runWithAiLocale('ko',finish);expect(locales.every(locale=>locale==='ja')).toBe(true);expect(docs[0].premiumStatus).toBe('completed');
});
const SCHEMA_KEYS={report:['personality','habitats','plays','coach','care','closing'],compat:['verdict','overview','dimensions','places','cautions','routine']};
test.each(['report','compat'])('%s part prompts carry the facts without the whole-report JSON schema',async type=>{
 kind=type;await start();const prompts=provider.mock.calls.map(call=>call[1]);expect(prompts.length).toBeGreaterThan(0);
 for(const prompt of prompts){expect(prompt).toContain('[사실]');expect(prompt).not.toContain('JSON 스키마');for(const key of SCHEMA_KEYS[type])expect(prompt).not.toContain(`"${key}"`);}
});
test('admin prompt lab shows the production report seed',async()=>{
 const body={...original(),pet};expect(lab(body).prompt).toBe((await seedPet('report',body)).prompt);
});
test('a JSON report body is not a part, and its text is delivered on the last attempt',async()=>{
 const base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{const response=await base(...args),value=JSON.parse(response.text);value.body=JSON.stringify({personality:value.body.split('\n\n'),habitats:[{id:'sunny-window',reading:'창가 자리'}]});return {...response,text:JSON.stringify(value)};});
 await start();expect(provider).toHaveBeenCalledTimes(4);expect(docs[0].metadata.paidNarrative.parts).toEqual({});
 expect((await finish()).status).toBe(200);const {parts,tasks}=docs[0].metadata.paidNarrative;expect(provider).toHaveBeenCalledTimes(tasks.length*2);
 for(const task of tasks){expect(parts[task.id]).not.toMatch(/^\s*[\[{]|"personality"|sunny-window/);expect(parts[task.id]).toContain('번째 사례는');}
});
test.each(['report','compat'])('%s part targets add up to about 12,000–14,000 chars for a 5,000-won product',async type=>{
 kind=type;const total=(await seedPet(type,original())).tasks.reduce((sum,task)=>sum+task.minChars,0);expect(total).toBeGreaterThanOrEqual(12000);expect(total).toBeLessThanOrEqual(14000);
});
// 실호출(2026-10-12)에서 13부분 중 9부분이 문단 없는 한 덩어리였다. 화면은 부분마다 한 블록(pre-line)이라 렌더가 문장 끝에서 나눈다.
test('a long one-paragraph part renders as sentence-bounded paragraphs without changing the text',async()=>{
 const {renderPetNarrative}=await import('../../worker/lib/pet-report-delivery.js');
 const {blueprint}=seedPet('report',original()),wall=Array.from({length:30},(_,i)=>`보리는 ${i}번째 상황에서 활동과 휴식의 균형을 살펴야 합니다.`).join(' '),split='첫 문단입니다.\n\n둘째 문단입니다.';
 const report=renderPetNarrative({kind:'report',blueprint,parts:{'personality:0':wall,'personality:1':split,coach:'짧은 조언입니다. 오늘은 쉬세요.'}}).report;
 const paras=report.personality[0].split('\n\n');
 expect(paras.length).toBeGreaterThanOrEqual(3);expect(paras.every(p=>p.length<=600&&/[.!?]$/.test(p))).toBe(true);
 expect(paras.join(' ')).toBe(wall);expect(report.personality[1]).toBe(split);expect(report.coach).toBe('짧은 조언입니다. 오늘은 쉬세요.');
});

test('pet prompts translate the controlling relation into care instead of human wealth',()=>{
 const seeded=seedPet('report',{date:'2026-10-11',pet:{species:'dog',name:'보리',gender:'male',neutered:true,birthDate:'2021-05-14',birthTimeUnknown:true,activityLevel:'high',environment:'balanced',companion:'alone'}});
 expect(seeded.systemPrompt).toContain('재물운');
 expect(seeded.systemPrompt).toContain('적용하거나');
 expect(seeded.prompt).not.toMatch(/부족 기운과의 관계: 재(?:\n|$)/);
 expect(seeded.prompt).toContain('금전 해석 아님');
});
