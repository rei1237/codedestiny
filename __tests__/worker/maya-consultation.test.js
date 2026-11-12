/** @jest-environment node */
import { jest } from '@jest/globals';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';
let handle, seed, db, owner, denied, revoked, failSave, provider, verify;
const original = () => ({ requestId: 'maya-one-question-123', year: 2026, month: 6, day: 21, birthDate: '1990-02-28', question: '이직을 준비할 때 무엇을 점검할까요?' });
const query = run => ({ select(){return this;}, sort(value){this.order=value;return this;}, limit(value){this.max=value;return this;},
  async lean(){return structuredClone(await run(this));} });
const executions = {
  findOne: filter => query(()=>db.findOne(null,filter)),
  find: filter => query(q=>db.find(null,filter,{sort:q.order,limit:q.max})),
  findOneAndUpdate: (filter,update,options) => query(()=>{ if(failSave && update.$set?.premiumStatus==='completed'){failSave=false;throw Error('storage reply lost');}return db.findOneAndUpdate(null,filter,update,options); }),
  updateOne: (filter,update) => db.updateOne(null,filter,update),
};
beforeAll(async()=>{
  const realDb=await import('../../worker/lib/db.js'),models=await import('../../worker/lib/models.js'),auth=await import('../../worker/lib/auth.js'),gemini=await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/db.js',()=>({...realDb,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
  jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:executions}));
  jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId:owner})}));
  jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isPaidResultRevoked:async()=>revoked}));
  jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:(...args)=>verify(...args)}));
  jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
  ({handleMayaConsultationRoutes:handle,seedMayaConsultation:seed}=await import('../../worker/routes/maya-consultation.js'));
});
beforeEach(()=>{
  db=makeFakePaymentDb({uniqueKeys:[['userId','executionKey']]});owner='user-a';denied=false;revoked=false;failSave=false;
  verify=jest.fn(async(_env,input)=>{expect(input.requireExisting).toBe(true);return denied?{proven:false}:{proven:true,source:'payment',transactionId:'one-paid-order'};});
  provider=jest.fn(async()=>({ok:true,provider:'gemini',text:JSON.stringify({body:'한 줄 답변: 이직을 확정하기 전에 역할과 생활 리듬이 맞는지 살펴보세요.\n\n촐킨의 7 Ok라는 계산값은 관계와 신뢰라는 상징을 떠올리게 합니다. 이를 성공 예측으로 보기보다 협업 과정에서 자신이 원하는 조건을 정리하는 질문으로 활용할 수 있어요.\n\n실천 조언: 지원 회사의 업무 범위와 현재의 강점을 비교해 보세요. 실제 조건이 다르다면 선택을 수정할 여지도 남겨 두는 편이 좋습니다.'})}));
});
const request=(path,body)=>new Request('https://mock.test/api/maya-consultation'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const post=body=>handle(request('',body),{});

test('질문·없는 날짜는 결제 확인 0회로 거절한다',async()=>{
  for(const patch of [{question:''},{month:13},{month:2,day:31},{birthDate:'2026-02-31'}]){
    const response=await post({...original(),...patch});expect(response.status).toBe(400);expect(await response.json()).toMatchObject({retryable:false});
  }
  expect(verify).not.toHaveBeenCalled();expect(provider).not.toHaveBeenCalled();expect(db.rows).toHaveLength(0);
});
test('클라이언트가 보낸 계산값 대신 공용 마야 달력 계산으로 질문 한 건을 상담한다',async()=>{
  const response=await post({...original(),facts:{tzolkin:'FORGED_CHART'}}),data=await response.json();
  expect(response.status).toBe(200);expect(data).toMatchObject({saved:true,status:'completed',consultation:{question:original().question,facts:{target:{tzolkin:{label:'7 Ok'}}}}});
  expect(provider.mock.calls[0][1]).toContain('7 Ok');expect(provider.mock.calls[0][1]).not.toContain('FORGED_CHART');
  expect(provider.mock.calls[0][2]).toMatchObject({fallbackToWorkersAI:false,timeoutMs:45000});
});
test('결제 증빙 없이는 생성하지 않는다',async()=>{
  denied=true;expect((await post(original())).status).toBe(402);expect(provider).not.toHaveBeenCalled();expect(db.rows).toHaveLength(0);
});
test('결제 하나의 질문·소유자·환불 경계를 지키며 저장된 답변을 재열람한다',async()=>{
  const first=await (await post(original())).json();expect((await post(original())).status).toBe(200);
  expect((await post({...original(),question:'다른 질문입니다.'})).status).toBe(409);
  expect((await post({...original(),requestId:'another-paid-request'})).status).toBe(409);
  expect((await handle(request('/result?resultId='+first.resultId),{})).status).toBe(200);
  owner='user-b';expect((await handle(request('/result?resultId='+first.resultId),{})).status).toBe(404);
  owner='user-a';revoked=true;expect((await handle(request('/result?resultId='+first.resultId),{})).status).toBe(403);
  expect(provider).toHaveBeenCalledTimes(1);
  revoked=false;verify.mockImplementation(async(_env,input)=>input.requestId===original().requestId?{proven:true,source:'pass'}:{proven:false});
  expect((await post({...original(),requestId:'new-request-for-old-pass',paymentId:original().requestId})).status).toBe(402);
});
test('일시 생성 실패는 같은 요청을 이어서 저장하고 새 결제를 요구하지 않는다',async()=>{
  provider.mockResolvedValueOnce({ok:false});const first=await post(original());expect(first.status).toBe(202);const pending=await first.json();
  const second=await post({resumeResultId:pending.resultId});expect(second.status).toBe(200);expect((await second.json()).resultId).toBe(pending.resultId);
  expect(db.rows).toHaveLength(1);expect(verify.mock.calls.every(([,input])=>input.requireExisting)).toBe(true);expect(provider).toHaveBeenCalledTimes(2);
});
test('최종 저장 실패는 저장된 본문으로 복구하며 LLM을 다시 호출하지 않는다',async()=>{
  failSave=true;const first=await post(original());expect(first.status).toBe(503);
  const second=await post(original());expect(second.status).toBe(200);expect((await second.json()).saved).toBe(true);expect(provider).toHaveBeenCalledTimes(1);
});
test('상담 이력은 현재 계정의 기록만 제공한다',async()=>{
  await post(original());const mine=await (await handle(request('/history'),{})).json();expect(mine.records).toHaveLength(1);expect(mine.records[0].question).toBe(original().question);
  owner='user-b';expect((await (await handle(request('/history'),{})).json()).records).toEqual([]);expect(provider).toHaveBeenCalledTimes(1);
});
