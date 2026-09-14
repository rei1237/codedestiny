/** @jest-environment node */
import { jest } from '@jest/globals';
import { HttpError } from '../../worker/lib/http.js';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let delivery, readRequest, refund, consume;
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
 ({deliverFeatureQuestion:delivery,readFeatureQuestionRequest:readRequest}=await import('../../worker/lib/feature-question-delivery.js'));
});
beforeEach(()=>{docs=[];revoked=false;userId=owner;fault=null;lost=false;kind='Astrology';mode='pass';
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
  const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)[1],label=prompt.match(/\[이번 부분: (part-\d+)\]/)[1];
  return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,claims:[{factId:'fact-1',value:'Sun'}],body:Array.from({length:45},(_,i)=>`${label} ${i}번째 사례는 생활의 리듬과 각자의 반응을 함께 살펴보며 적용 조건을 확인합니다. ${label} ${i}번째 선택에서는 관찰된 행동과 휴식의 차이를 바탕으로 일상을 조정할 수 있습니다.`).join('\n\n')})};
 });refund=jest.fn(async()=>new Response(JSON.stringify({ok:true}),{status:200}));consume=jest.fn(async()=>new Response(JSON.stringify({chargedCoins:200,transactionId:'original-payment',user:{points:0},passRefund:mode==='pass'?{cycleKey:'cycle',cost:200}:null}),{status:200}));external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(external).not.toHaveBeenCalled();external.mockRestore();});

const source=fs.readFileSync('worker/routes/fortune.js','utf8'),ast=ts.createSourceFile('fortune.js',source,99,true,1);
function handler(){
 const feature=kind.toLowerCase()+'_ai_prompt_generator';
 const built={prompt:'원래 계산 근거를 해설하는 질문 상담'.repeat(10),digestSource:'original-calculation',title:'전문가 상담'};
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
test.each(['Astrology','Vedic','Ziwei','Sukuyo'].flatMap(kind=>['pass','monthly','single'].map(mode=>[kind,mode])))('%s %s confirms ten parts and reopens without another generation',async(type,access)=>{
 kind=type;mode=access;expect((await start()).status).toBe(202);const full=await finish();expect(full.status).toBe(200);expect(await full.json()).toMatchObject({saved:true,status:'completed'});expect(provider).toHaveBeenCalledTimes(10);expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(10);expect(refund).not.toHaveBeenCalled();
 const sent=await consume.mock.calls[0][0].json();expect(sent).toMatchObject({requireExistingPaidAccess:true,requestId:'original-paid-request'});
});
test.each(['throw','null','confirm'])('final save %s preserves paid body and restores without another generation',async fail=>{await start();fault={kind:fail};expect((await finish()).status).toBe(503);expect(refund).not.toHaveBeenCalled();const count=provider.mock.calls.length;expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);});
test.each(['throw','null','confirm'])('checkpoint %s stops before the provider',async fail=>{fault={kind:fail,metadata:true};expect((await start()).status).toBe(503);expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();});
test.each(['short','hash','claim','truncated'])('%s cannot complete a paid report',async failure=>{
 const good=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{const response=await good(...args),value=JSON.parse(response.text);if(failure==='short')value.body='짧은 답변.';if(failure==='hash')value.evidenceHash='wrong';if(failure==='claim')value.claims[0].value='Moon';return {...response,truncated:failure==='truncated',text:JSON.stringify(value)};});await start();expect(Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(3);expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(11);
});
test('rejected access, wrong owner and revocation prevent provider calls',async()=>{consume.mockResolvedValueOnce(new Response('{}',{status:402}));expect((await start()).status).toBe(402);expect(provider).not.toHaveBeenCalled();await start();userId='other-owner';expect((await resume()).status).toBe(404);userId=owner;revoked=true;expect((await resume()).status).toBe(403);expect(provider).toHaveBeenCalledTimes(4);});
test('same input key cannot substitute new calculations',async()=>{await start();expect((await post({...original(),question:'다른 질문으로 바꾸었습니다.'})).status).toBe(409);expect(provider).toHaveBeenCalledTimes(4);});
test.each(['monthly','single','pass'])('exhausted %s refund runs once despite a repeated request',async access=>{kind=access==='pass'?'Ziwei':'Astrology';mode=access;provider.mockResolvedValue({ok:false});await start();expect((await finish()).status).toBe(500);expect((await resume()).status).toBe(500);expect(refund).toHaveBeenCalledTimes(1);});
