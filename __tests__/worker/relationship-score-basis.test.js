/** @jest-environment node */
// 장별 근거·점수 계산 보존 대조: 저장될 본문이 실제로 계산된 확정 점수를 지키는지 검사한다.
// 계산기(calculateLoveSecretAiSaju·scoreBoundary)를 대역하지 않고 실제 명식을 태운다.
import { jest } from '@jest/globals';
let route, docs, provider, userId, wrongScorePart, silentPart;
const user='64b7f2a1c3d4e5f601234567';
const clone=value=>structuredClone(value);
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>{
 if(key==='$or')return value.some(item=>matches(doc,item));const actual=get(doc,key);
 if(value&&typeof value==='object'&&!(value instanceof Date)){if('$exists'in value)return Boolean(actual!==undefined)===value.$exists;if('$in'in value)return value.$in.includes(actual);}
 return value===null?actual==null:JSON.stringify(actual)===JSON.stringify(value);
});}
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}}
const model={
 findOne:filter=>query(docs.find(doc=>matches(doc,filter))||null),
 findOneAndUpdate:(filter,update,options={})=>{
  let doc=docs.find(doc=>matches(doc,filter));
  if(!doc&&options.upsert){doc={...clone(update.$setOnInsert),_id:'record'};docs.push(doc);}
  if(doc){patch(doc,update.$set||{});doc.updatedAt=new Date();}return query(doc||null);
 },
 updateOne:async(filter,update)=>{const doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});return {modifiedCount:doc?1:0};},
};
function prose(seed){return Array.from({length:50},(_,n)=>`${seed}의 ${n}번째 상황에서는 관계를 바라보는 관점과 감정을 표현하는 조건을 구체적으로 살펴봅니다. ${seed}에서 ${n}번째 사례를 단정하지 않고 서로 다른 생활 리듬과 대화를 확인하는 행동을 제시합니다.`).join('\n\n');}
// 프롬프트의 [확정 점수] 줄에서 계산된 점수를 읽는다. 게이트가 대조해야 할 값과 같은 출처다.
function fixedScore(prompt){return Number(prompt.match(/\[확정 점수\] (\d{1,3})\/100/)[1]);}
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),structured=await import('../../worker/lib/structured-consultation.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,getOptionalUserFromRequest:async()=>({userId})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:async()=>({proven:true,source:'single',transactionId:'original-single'})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,RelationshipBoundaryTest:model,
  PaidExecutionRecord:{findOne:()=>query(null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)},
 }));
 jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({...structured,callGeminiJsonWithRetry:(...args)=>provider(...args)}));
 jest.unstable_mockModule('../../worker/lib/service-execution-task.js',()=>({startServiceExecution:async()=>({}),completeServiceExecution:async()=>({}),failServiceExecution:async()=>({refundStatus:'refunded'})}));
 ({handleRelationshipBoundaryTestRoutes:route}=await import('../../worker/routes/relationship-boundary-test.js'));
});
beforeEach(()=>{docs=[];userId=user;wrongScorePart=null;silentPart=null;
 provider=jest.fn(async(_env,prompt)=>{
  const evidenceHash=prompt.match(/evidenceHash[":\s]+([a-f0-9]{64})/)[1];
  const part=prompt.match(/이번 호출은 (\d+)장 중 (\d)\/2/);
  if(!part)return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,character:{title:'대화를 이어 가는 사람',caption:'계산된 근거와 관계의 조건을 살펴봅니다.'},summary:`확정 점수 ${fixedScore(prompt)}점을 기준으로 선택 조건을 살펴봅니다.`,finalMessage:'상대를 단정하지 말고 함께 대화해 보세요.'})};
  const id=String((Number(part[1])-1)*2+Number(part[2])-1),score=fixedScore(prompt);
  // 위조 본문은 계산된 확정 점수 대신 다른 점수를 말하거나, 점수를 한 번도 말하지 않는다.
  const cite=id===wrongScorePart?`이 사람의 바람끼 점수는 ${score===92?41:92}점입니다. `:id===silentPart?'':`확정 점수 ${score}점을 그대로 이어서 읽습니다. `;
  return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:cite+prose(part[1]+'-'+part[2])})};
 });
});
const body={idempotencyKey:'score-basis-request',targetInfo:{gender:'female',birthDate:'1990-01-01',birthTime:'12:00',calendarType:'solar',birthTimeUnknown:false,isLeapMonth:false}};
const post=value=>route(new Request('https://mock.test/api/relationship-boundary-test/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}),{});
// 200 이 나오거나 재시도 예산이 소진될 때까지 이어서 돌린다.
async function deliver(){let response=await post(body);
 for(let n=0;n<8&&response.status===202;n++)response=await post({resumeSessionId:docs[0].id});
 return response;}

test('every target carries an integer fixed score the body can be checked against',async()=>{
 const {__relationshipBoundaryTestTestUtils:utils}=await import('../../worker/routes/relationship-boundary-test.js');
 const {calculateLoveSecretAiSaju}=await import('../../worker/lib/love-secret-ai-calculation.js');
 const {relationshipScoreAnchor}=await import('../../worker/lib/relationship-report-delivery.js');
 for(const birthDate of ['1972-03-03','1980-07-21','1988-02-29','1990-01-01','1996-11-12','2001-05-28'])for(const gender of ['female','male']){
  const input=utils.normalize({targetInfo:{gender,birthDate,birthTime:'09:10',calendarType:'solar',birthTimeUnknown:false,isLeapMonth:false}});
  expect(input.ok).toBe(true);
  const boundary=utils.scoreBoundary(calculateLoveSecretAiSaju(input.normalized));
  expect(Number.isInteger(boundary.score)).toBe(true);
  const framePrompt=utils.prompt(calculateLoveSecretAiSaju(input.normalized),boundary,gender);
  expect(framePrompt).toContain(`[확정 점수] ${boundary.score}/100`);
  expect(relationshipScoreAnchor({scoreAnchor:{score:boundary.score}})).toBe(boundary.score);
  expect(relationshipScoreAnchor({framePrompt})).toBe(boundary.score);
 }
 expect(relationshipScoreAnchor({})).toBe(null);
});

test('a body that states a different score than the calculation is refunded instead of delivered',async()=>{
 wrongScorePart='0';
 const response=await deliver();
 expect(response.status).toBe(503);
 expect(await response.json()).toMatchObject({reason:'GENERATION_FAILED',retryable:false,refunded:true});
 expect(docs[0].status).toBe('generation_failed');
 const delivery=docs[0].llmMeta.delivery;
 expect(Object.keys(delivery.parts)).not.toContain('0');
 expect(delivery.attempts['0']).toBe(3);
 expect(delivery.invalidAttempts['0']).toBe(3);
 // 거절은 그 part 만 막고 이미 저장된 나머지 아홉 개는 보존된다.
 expect(Object.keys(delivery.parts)).toEqual(['1','2','3','4','5','6','7','8','9']);
});

test('an evidence half that never states the fixed score is refunded instead of delivered',async()=>{
 silentPart='2';
 const response=await deliver();
 expect(response.status).toBe(503);
 expect(await response.json()).toMatchObject({reason:'GENERATION_FAILED',refunded:true});
 const delivery=docs[0].llmMeta.delivery;
 expect(Object.keys(delivery.parts)).not.toContain('2');
 expect(delivery.invalidAttempts['2']).toBe(3);
});

test('an advice half may omit the score as its own instruction requires',async()=>{
 silentPart='3';
 const response=await deliver();
 expect(response.status).toBe(200);
 expect(docs[0].status).toBe('completed');
 expect(provider).toHaveBeenCalledTimes(11);
});

test('bodies that keep the fixed score complete without extra provider calls',async()=>{
 const response=await deliver();
 expect(response.status).toBe(200);
 expect(docs[0].status).toBe('completed');
 expect(docs[0].score).toBe(38);
 expect(provider).toHaveBeenCalledTimes(11);
});
