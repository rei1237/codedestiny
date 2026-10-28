/** @jest-environment node */
import { jest } from '@jest/globals';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

import { HttpError } from '../../worker/lib/http.js';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { BSON } from 'mongodb';
let delivery, readRequest, refund, consume;
let docs,provider,revoked,userId,fault,lost,external,kind,mode,builtExtra,bsonRoundTrip;
const owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);if('$gt'in value)return new Date(actual)>new Date(value.$gt);}
 return value===null?actual==null:JSON.stringify(actual)===JSON.stringify(value);
});}
const query=value=>({lean:async()=>bsonRoundTrip&&value ? BSON.deserialize(BSON.serialize(value,{ignoreUndefined:false})) : clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}}
const model={findOne:filter=>{if(lost){lost=false;return query(null);}return query(docs.find(doc=>matches(doc,filter))||null);},
 findOneAndUpdate:(filter,update,options={})=>{
  if(fault&&(fault.metadata?Boolean(update.$set?.metadata):update.$set?.premiumStatus==='completed')){const failure=fault;fault=null;if(failure.kind==='throw')throw Error('storage');if(failure.kind==='null')return query(null);if(failure.kind==='confirm')lost=true;}
  let doc=docs.find(doc=>matches(doc,filter));if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}if(doc)patch(doc,update.$set||{});return query(doc||null);
 },updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};}};
beforeAll(async()=>{
 jest.unstable_mockModule('../../worker/lib/cms-prompts.js',()=>({cmsPromptText:async(_env,_key,fallback)=>fallback}));
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>{if(mode==='denied')throw new HttpError(403,'payment denied');return {ok:true,accessType:mode};}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({deliverFeatureQuestion:delivery,readFeatureQuestionRequest:readRequest}=await import('../../worker/lib/feature-question-delivery.js'));
});
beforeEach(()=>{docs=[];bsonRoundTrip=false;builtExtra={};revoked=false;userId=owner;fault=null;lost=false;kind='Astrology';mode='pass';
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
  const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)?.[1],label=prompt.match(/\[이번 부분: (part-\d+)\]/)[1];
  return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,claims:[{factId:'fact-1',value:'Sun'}],body:Array.from({length:45},(_,i)=>`${label} ${i}번째 사례는 생활의 리듬과 각자의 반응을 함께 살펴보며 적용 조건을 확인합니다. ${label} ${i}번째 선택에서는 관찰된 행동과 휴식의 차이를 바탕으로 일상을 조정할 수 있습니다.`).join('\n\n')})};
 });refund=jest.fn(async()=>new Response(JSON.stringify({ok:true}),{status:200}));consume=jest.fn(async()=>new Response(JSON.stringify({chargedCoins:200,transactionId:'original-payment',user:{points:0},passRefund:mode==='pass'?{cycleKey:'cycle',cost:200}:null}),{status:200}));external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});

const source=fs.readFileSync('worker/routes/fortune.js','utf8'),ast=ts.createSourceFile('fortune.js',source,99,true,1);
function handler(){
 const feature=kind.toLowerCase()+'_ai_prompt_generator';
 const built={prompt:'원래 계산 근거를 해설하는 질문 상담'.repeat(10),digestSource:'original-calculation',title:'전문가 상담',...builtExtra};
 const context=vm.createContext({Request,Response,Headers,Date,console:{error(){}},
  readFeatureQuestionRequest:readRequest,deliverFeatureQuestion:delivery,
  enrichAstrologyPromptResultWithSwiss:async value=>value,primePromptTemplateOverrides:async()=>{},
  sha256Hex:async()=> 'a'.repeat(64),readAIPromptRequestId:(body,fallback)=>body.requestId||fallback,
  handlePigCoinConsume:(...args)=>consume(...args),handlePigCoinRefund:(...args)=>refund(...args),
  readSajuAIPromptPointRefundContext:()=>({isPointSpend:mode==='monthly',isCardSpend:mode==='single'}),
  refundAIPromptCardPaymentOnFailure:async()=>{await refund();return {refunded:true};},
  refundPassCoverage:async()=>{await refund();return {refunded:true};},
  withMongoRetry:async(_env,fn)=>fn(),findAIPromptPaidAccessEvidence:async()=>({ok:true}),
  isAIPromptTransientDbError:()=>true,buildAIPromptRetryMessage:()=> '다시 확인해 주세요.',
  buildAIPromptRetryDetails:value=>({...value,paymentRetainedForRetry:!value.refundOk}),
  json:(data,init)=>new Response(JSON.stringify(data),init),
  [kind.toUpperCase()+'_AI_PROMPT_FEATURE_KEY']:feature,[kind.toUpperCase()+'_AI_PROMPT_PRICE']:200,
  ['build'+kind+'AIPrompt']:()=>built,['build'+kind+'AIPromptWithDomain']:()=>built,
  ['map'+kind+'ConsumeFailure']:response=>response,
  ['build'+kind+'AIPromptError']:(code,message,status,extra)=>new Response(JSON.stringify({ok:false,code,message,...extra}),{status}),
 });
 vm.runInContext(ast.statements.find(n=>n.name?.text==='handle'+kind+'AIPrompt').getText(ast),context);
 return context['handle'+kind+'AIPrompt'];
}
const original=()=>({requestId:'original-paid-request',question:'현재 선택을 어떻게 준비할까요?',astrologyResult:{planet:'Sun'},vedicResult:{planet:'Sun'},chartResult:{planet:'Sun'},basicResult:{planet:'Sun'},transactionId:'original-payment'});
const post=body=>handler()(new Request('https://mock.test/api/fortune/'+kind.toLowerCase()+'/ai-prompt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{userId},{});
const start=()=>post(original()),resume=()=>post({resumeResultId:docs[0].executionKey});
async function finish(){let response;for(let i=0;i<8;i++){response=await resume();if(response.status!==202)break;}return response;}

test('missing paragraph punctuation is corrected and persisted without regeneration or refund',async()=>{
 const base=provider.getMockImplementation();
 provider.mockImplementation(async(...args)=>{
  const ai=await base(...args),value=JSON.parse(ai.text);
  value.body=value.body.replace(/\.(?=\n|$)/g,'');
  return {...ai,text:JSON.stringify(value)};
 });
 await start();expect((await finish()).status).toBe(200);
 const parts=docs[0].metadata.paidNarrative.parts;
 expect(Object.values(parts).every(body=>body.split('\n\n').every(p=>p.endsWith('.')))).toBe(true);
 expect((await resume()).status).toBe(200);
 expect(provider).toHaveBeenCalledTimes(10);expect(refund).not.toHaveBeenCalled();
});

test('structured claims retain both numeric and textual calculation evidence', async()=>{
 await start();
 const schema = provider.mock.calls[0][2].responseSchema;
 expect(schema.properties.claims.items.properties.value).toEqual({anyOf:[{type:'STRING'},{type:'NUMBER'}]});
 expect(schema.properties.evidenceHash).toBeUndefined();expect(schema.properties.claims.maxItems).toBe(5);
});
test.each(['Astrology','Vedic','Ziwei','Sukuyo'].flatMap(kind=>['pass','monthly','single'].map(mode=>[kind,mode])))('%s %s confirms ten parts and reopens without another generation',async(type,access)=>{
 kind=type;mode=access;expect((await start()).status).toBe(202);const full=await finish();expect(full.status).toBe(200);expect(await full.json()).toMatchObject({saved:true,status:'completed'});expect(provider).toHaveBeenCalledTimes(10);expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(10);expect(refund).not.toHaveBeenCalled();
 const sent=await consume.mock.calls[0][0].json();expect(sent).toMatchObject({requireExistingPaidAccess:true,requestId:'original-paid-request'});
});
test.each(['throw','null','confirm'])('final save %s preserves paid body and restores without another generation',async fail=>{await start();fault={kind:fail};expect((await finish()).status).toBe(503);expect(refund).not.toHaveBeenCalled();const count=provider.mock.calls.length;expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);});
test.each(['throw','null','confirm'])('checkpoint %s stops before the provider',async fail=>{fault={kind:fail,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();});
test.each(['short','hash','claim','truncated'])('%s is repaired locally when the answer remains usable',async failure=>{
 const good=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{const response=await good(...args),value=JSON.parse(response.text);if(failure==='short')value.body='짧은 답변.';if(failure==='hash')value.evidenceHash='wrong';if(failure==='claim')value.claims[0].value='Moon';return {...response,truncated:failure==='truncated',text:JSON.stringify(value)};});await start();const recoverable=['claim','truncated'].includes(failure);expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(recoverable?4:3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(recoverable?10:11);
});
test('rejected access, wrong owner and revocation prevent provider calls',async()=>{consume.mockResolvedValueOnce(new Response('{}',{status:402}));expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();await start();userId='other-owner';expect((await resume()).status).toBe(404);userId=owner;revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);});
test('same input key cannot substitute new calculations',async()=>{await start();expect((await post({...original(),question:'다른 질문으로 바꾸었습니다.'})).status).toBe(409);expect(provider).toHaveBeenCalledTimes(4);});
test.each([['monthly','Astrology'],['single','Astrology'],['pass','Ziwei'],['pass','Sukuyo'],['pass','Vedic']])('exhausted %s %s refund runs once despite a repeated request',async(access,type)=>{kind=type;mode=access;provider.mockResolvedValue({ok:false});await start();expect((await finish()).status).toBe(500);expect((await resume()).status).toBe(500);expect(refund).toHaveBeenCalledTimes(1);});
test.each(['Astrology','Vedic','Ziwei','Sukuyo'].flatMap(type=>['pass','monthly','single'].map(access=>[type,access])))('%s %s preserves saved parts when a later part exhausts',async(type,access)=>{
 kind=type;mode=access;expect((await start()).status).toBe(202);
 const before=clone(docs[0].metadata.paidNarrative.parts);expect(Object.keys(before)).toHaveLength(4);
 provider.mockResolvedValue({ok:false});await resume();const response=await resume();
 expect(response.status).toBe(202);expect(await response.json()).toMatchObject({status:'partial',reviewRequired:true,retryable:false,paymentRetainedForRetry:true});
 expect(docs[0].metadata.paidNarrative.parts).toEqual(before);expect(refund).not.toHaveBeenCalled();
 const count=provider.mock.calls.length;const again=await resume();expect(again.status).toBe(202);
 expect(provider).toHaveBeenCalledTimes(count);expect(refund).not.toHaveBeenCalled();
});

test('a complete short part is repaired once before it is accepted',async()=>{
 const good=provider.getMockImplementation();
 provider.mockImplementationOnce(async(...args)=>{const response=await good(...args),value=JSON.parse(response.text);value.body=value.body.split('\n\n').slice(0,6).join('\n\n');return {...response,text:JSON.stringify(value)};});
 await start();
 const state=docs[0].metadata.paidNarrative;
 expect(state.parts['part-1']).toBeUndefined();expect(state.drafts['part-1']).toBeTruthy();
 expect((await finish()).status).toBe(200);
 expect(provider.mock.calls.filter(([,prompt])=>prompt.includes('[저장된 초안 보완]'))).toHaveLength(1);
 expect(provider).toHaveBeenCalledTimes(11);expect(refund).not.toHaveBeenCalled();
});
test('the provider never copies the purchase hash and HTML paragraphs are stored as text',async()=>{
 const good=provider.getMockImplementation();
 provider.mockImplementationOnce(async(...args)=>{const response=await good(...args),value=JSON.parse(response.text);
  value.body=value.body.split('\n\n').map((p,i)=>i===3?'<p>**4주 실행 계획:**</p>':`<p>${p.replace('. ','.<br><br>')}</p>`).join('');return {...response,text:JSON.stringify(value)};});
 await start();
 const [,prompt]=provider.mock.calls[0],state=docs[0].metadata.paidNarrative,part=state.parts['part-1'];
 expect(prompt).not.toContain(state.evidenceHash);
 expect(part).not.toMatch(/<\/?(?:p|br|div)\b/);expect(part).toContain('**4주 실행 계획:**');expect(part).not.toMatch(/:\*\*\./);
 expect(part.split('\n\n').length).toBeGreaterThan(45);
});
test('a sentence already used by an earlier part is removed instead of discarding the new part',async()=>{
 const good=provider.getMockImplementation(),lead='질문의 결론은 지금의 역할을 넓히면서 이직 조건을 함께 점검하는 쪽이 유리하다는 것입니다.';
 provider.mockImplementation(async(...args)=>{const response=await good(...args),value=JSON.parse(response.text);value.body=`${lead} ${value.body}`;return {...response,text:JSON.stringify(value)};});
 await start();expect((await finish()).status).toBe(200);
 const all=Object.values(docs[0].metadata.paidNarrative.parts).join('\n');
 expect(all.split('질문의 결론은').length-1).toBe(1);expect(provider).toHaveBeenCalledTimes(10);
});
test('a part keeps its own scope, the reference date and the earlier conclusion',async()=>{
 await start();await finish();
 const prompts=provider.mock.calls.map(([,prompt])=>prompt),state=docs[0].metadata.paidNarrative;
 expect(prompts[0]).toMatch(/\[이번 부분: part-1\][^\n]*한 줄 답변[^\n]*첫 문장/);
 expect(prompts[0]).toMatch(/\[기준일\] \d{4}-\d{2}-\d{2}/);
 expect(prompts[4]).toContain('[앞 부분 요지]');expect(prompts[4]).toContain(state.parts['part-1'].split(/(?<=\.)\s/)[0]);
 expect(prompts[1]).not.toContain('[앞 부분 요지]');
});
test('a part cut after a comma is shortened to its last sentence and repaired',async()=>{
 const good=provider.getMockImplementation();
 provider.mockImplementationOnce(async(...args)=>{const response=await good(...args),value=JSON.parse(response.text);value.body=value.body.split('\n\n').slice(0,6).join('\n\n')+' 지금의 목표를 재정의한다면,';return {...response,text:JSON.stringify(value)};});
 await start();
 expect(docs[0].metadata.paidNarrative.drafts['part-1']).not.toMatch(/,\.?$/);
 expect(docs[0].metadata.paidNarrative.parts['part-1']).toBeUndefined();
});
test('calculated facts never carry birth input',async()=>{
 const {questionFacts}=await import('../../worker/lib/feature-question-delivery.js');
 const rows=questionFacts({user:{birthYear:1990,gender:'M'},vedicResult:{profile:{birth:{year:1990,lat:37.5}},lagna:{sign:'Pisces'}},mingGong:'戌'});
 expect(rows.map(row=>row.path)).toEqual(['chart.vedicResult.lagna.sign','chart.mingGong']);
});

test.each(['Astrology','Ziwei'])('%s completes through BSON serialization with absent optional fields',async type=>{
 kind=type;bsonRoundTrip=true;builtExtra={compatibilityHint:undefined};
 expect((await start()).status).toBe(202);
 expect((await finish()).status).toBe(200);
 const count=provider.mock.calls.length;
 expect((await resume()).status).toBe(200);
 expect(provider).toHaveBeenCalledTimes(count);expect(refund).not.toHaveBeenCalled();
});

test('live defects are removed before punctuation and persistence',async()=>{
 const good=provider.getMockImplementation();
 provider.mockImplementationOnce(async(...args)=>{const response=await good(...args),value=JSON.parse(response.text);
  value.body+='\n\n달의 근거(fact-71, fact-74)를 확인해요.\n\n첫째, 매일 아침 거울을 보며 자신에게.\n\n예를 들어, 상대방의 고민을 들어줄 때';
  return {...response,text:JSON.stringify(value)};
 });
 await start();const body=docs[0].metadata.paidNarrative.parts['part-1'];
 expect(body).toContain('달의 근거를 확인해요.');
 expect(body).not.toMatch(/fact-\d+|자신에게\.|들어줄 때/);
});
test('vedic paid facts lead with the computed house rulers',async()=>{
 kind='Vedic';builtExtra={houseRulers:{화성:'2H·9H',달:'5H'}};await start();
 expect(provider.mock.calls[0][1]).toContain('[{"id":"fact-1","path":"chart.houseRulers.화성","value":"2H·9H"},{"id":"fact-2","path":"chart.houseRulers.달","value":"5H"},');
});
test('sukuyo paid facts drop the date-seeded daily signal',async()=>{
 kind='Sukuyo';await post({...original(),basicResult:{planet:'Sun',daily:{overall:78,insight:'오늘 돈을 다루는 습관을 점검하세요.'}}});
 const prompt=provider.mock.calls[0][1];
 expect(prompt).toContain('"path":"chart.basicResult.planet"');expect(prompt).not.toMatch(/daily|돈을 다루는/);
});

test.each([['Ziwei','무성'],['Sukuyo','서한비'],['Astrology','윤달'],['Vedic','윤달 · 베다점']])('%s sends its master voice to every actual generation and resumed part',async(type,name)=>{
 kind=type;await start();await finish();
 expect(provider).toHaveBeenCalledTimes(10);
 for(const call of provider.mock.calls){
  expect(call[2].systemPrompt).toContain('[상담자 페르소나 — '+name+']');
  expect(call[2].systemPrompt).toContain('각 점술 체계를 섞지 말고');
  expect(call[2].systemPrompt).toContain('말투');
 }
 expect(refund).not.toHaveBeenCalled();
});
