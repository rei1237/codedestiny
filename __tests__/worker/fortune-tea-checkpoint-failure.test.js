/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const createStore = require('../fixtures/fortune-tea-result-store.cjs');
const source = fs.readFileSync(path.join(__dirname, '../../worker/routes/fortune-tea-house.js'), 'utf8');
const ast = ts.createSourceFile('tea.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
const constant = name => ast.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(ast) === name));
const ROUND_HELPERS = ['TEA_GROUP_ATTEMPTS_PER_ROUND', 'TEA_MAX_ROUNDS', 'TEA_RETRY_DETERMINISTIC', 'TEA_RETRY_HELD_MESSAGE'].map(name => constant(name).getText(ast).replace(/^const\b/, 'var'))
  .concat(['teaRound', 'teaGroupNeedsWork', 'teaGroupHasAttempts', 'teaCheckpointRetryable', 'teaRetryHoldAt', 'teaRetryMarker', 'teaRetryHeldBody'].map(name => declaration(name).getText(ast))).join('\n');
let generation;
let heldResubmit;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'runGeneration') generation = node.initializer.getText(ast);
  if (ts.isIfStatement(node) && node.expression.getText(ast) === 'generation.retryHold') heldResubmit = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(declaration('handleConsult'));
const DAY = 86400000;
const CREATED = new Date(Date.now() - 3600000);

async function fixture({attempts = 1, round, checkpoint = true, token = 'held', failure, createdAt = CREATED, tossNative = false, marker} = {}) {
  const results = createStore();
  const saved = { first: { body: 'already delivered paid prose' } };
  const state = { requestBody: { requestId: 'original-purchase' }, groups: [{key:'first'}, {key:'missing'}], parts: saved, attempts: {first:1, missing:attempts}, repairs: [], ...(round ? {round} : {}) };
  await results.updateOne({_id:'stored'}, {$set:{userId:'owner',resultId:'result',status:'generating',createdAt,generationLock:{token},...(checkpoint?{generationCheckpoint:state}:{}),...(marker?{llmMeta:{retryable:marker}}:{})}}, {upsert:true});
  const cancel = jest.fn(async()=>({}));
  const refund = jest.fn(async()=>({}));
  const release = jest.fn(async()=>({released:0}));
  const auth = {userId:'owner',...(tossNative?{tossNative:true}:{})};
  const context = { Date, console, env:{}, auth, resultId:'result', requestId:'original-purchase', request:{},
    access:{auth,deferredUsage:true}, generation:{lockToken:'held'}, consultRequest:{}, fallback:{}, body:{},
    honeyCollections:()=>({results}), withMongoRetry:async(_env,work)=>work(), cleanText:(value,max=500)=>String(value||'').slice(0,max),
    teaNarrativeText:value=>JSON.stringify(value), json:(body,options)=>({body,status:options.status}),
    retryRefundAt:(doc,now=Date.now())=>new Date((doc?.createdAt?new Date(doc.createdAt).getTime():now)+7*DAY),
    assertSajuCalculationBasis:()=>{}, assertSukuyoCalculationBasis:()=>{}, hasGeminiKey:()=>true,
    generateTeaCheckpoint:async()=>{throw failure || Object.assign(new Error('temporary interruption'),{code:'FORTUNE_TEA_HOUSE_LLM_RETRYABLE'});},
    callFortuneTeaDeferredUsageRoute:cancel, refundFortuneTeaHousePassSettlement:refund, releaseRequestBillingEvidence:release, evidenceIds:['pay-1'],
  };
  vm.createContext(context);
  vm.runInContext(ROUND_HELPERS+'\n'+['teaCheckpointProgress','markFortuneTeaHouseGenerationFailed'].map(name=>declaration(name).getText(ast)).join('\n'),context);
  const run=vm.runInContext(`(${generation})`,context);
  return {run,cancel,refund,release,context,read:()=>results.findOne({_id:'stored'}),saved,state};
}
const exhausted=()=>Object.assign(new Error('fortune tea house generation attempts exhausted'),{code:'FORTUNE_TEA_HOUSE_GENERATION_EXHAUSTED'});

test('a provider interruption preserves the checkpoint for cron without cancelling the purchase',async()=>{
  const f=await fixture();
  const response=await f.run();
  expect(response.status).toBe(202);
  expect(response.body).toMatchObject({status:'partial',retryable:true,resultId:'result',completedCount:1,totalSections:2});
  // S16: 완성 전 응답에는 본문이 없다 — 진행 수와 식별자만.
  expect(JSON.stringify(response.body)).not.toContain('already delivered paid prose');
  expect(response.body.completedSections).toEqual([{key:'first'}]);
  const row=await f.read();
  expect(row.status).toBe('partial');
  expect(row.generationCheckpoint).toEqual(f.state);
  expect(row.generationLock).toBeUndefined();
  expect(f.cancel).not.toHaveBeenCalled();
});

test('a group that used up one round still retries in the next round instead of failing',async()=>{
  const f=await fixture({attempts:3});
  const response=await f.run();
  expect(response.status).toBe(202);
  expect(response.body).toMatchObject({status:'partial',retryable:true});
  expect(f.cancel).not.toHaveBeenCalled();
  expect(f.refund).not.toHaveBeenCalled();
});

// R7: 종결 실패는 바로 환불하지 않고 다시 시도 보류로 둔다. 환불 시각은 생성 + 7일이다.
test('exhausted reservations are held for a free retry without refund, cancel or evidence release',async()=>{
  const f=await fixture({attempts:9,round:3});
  const response=await f.run();
  expect(response.status).toBe(409);
  expect(response.body).toMatchObject({ok:false,retryable:false,status:'generation_failed',reason:'RETRY_AVAILABLE',resultId:'result',refunded:false,
    retry:{available:true,resultId:'result',refundAt:new Date(CREATED.getTime()+7*DAY).toISOString()}});
  const row=await f.read();
  expect(row.status).toBe('generation_failed');
  expect(row.generationError.retryable).toBe(false);
  expect(row.generationCheckpoint).toEqual(f.state);
  expect(new Date(row.llmMeta.retryable.refundAt).getTime()).toBe(CREATED.getTime()+7*DAY);
  expect(row.llmMeta.retryable).toMatchObject({code:'FORTUNE_TEA_HOUSE_LLM_RETRYABLE',evidenceIds:['pay-1'],reopens:0});
  expect(f.cancel).not.toHaveBeenCalled();
  expect(f.refund).not.toHaveBeenCalled();
  expect(f.release).not.toHaveBeenCalled();
});

test('the round cap is held as a retry offer with no body',async()=>{
  const f=await fixture({attempts:9,round:3,failure:exhausted()});
  const response=await f.run();
  expect(response.status).toBe(409);
  expect(response.body).toMatchObject({ok:false,status:'generation_failed',reason:'RETRY_AVAILABLE',retry:{available:true}});
  expect(response.body.message).toContain('추가 결제·차감 없이 다시 시도');
  expect(response.body.result).toBeUndefined();
  expect(response.body.completedSections).toBeUndefined();
  expect(JSON.stringify(response.body)).not.toContain('already delivered paid prose');
  const row=await f.read();
  expect(row.generationError).toMatchObject({code:'FORTUNE_TEA_HOUSE_GENERATION_EXHAUSTED',retryable:false});
  expect(f.refund).not.toHaveBeenCalled();
  expect(f.cancel).not.toHaveBeenCalled();
});

test('a second failure after a reopen keeps the first refund deadline and reopen count',async()=>{
  const first=new Date(CREATED.getTime()+7*DAY-60000);
  const f=await fixture({attempts:9,round:3,failure:exhausted(),marker:{since:CREATED,refundAt:first,code:'FORTUNE_TEA_HOUSE_GENERATION_EXHAUSTED',evidenceIds:['pay-0'],reopens:2,reopenedAt:new Date()}});
  const response=await f.run();
  expect(response.body.retry.refundAt).toBe(first.toISOString());
  const row=await f.read();
  expect(new Date(row.llmMeta.retryable.refundAt).getTime()).toBe(first.getTime());
  expect(row.llmMeta.retryable).toMatchObject({reopens:2,evidenceIds:['pay-0']});
  expect(f.refund).not.toHaveBeenCalled();
});

test('Toss native consultations keep the immediate refund at the round cap',async()=>{
  const f=await fixture({attempts:9,round:3,failure:exhausted(),tossNative:true});
  const response=await f.run();
  expect(response.status).toBe(409);
  expect(response.body).toMatchObject({ok:false,retryable:false,status:'generation_failed',reason:'GENERATION_FAILED',resultId:'result'});
  const row=await f.read();
  expect(row.status).toBe('generation_failed');
  expect(row.llmMeta).toBeUndefined();
  expect(f.refund).toHaveBeenCalledTimes(1);
  expect(f.cancel).toHaveBeenCalledTimes(1);
  expect(f.release).toHaveBeenCalledTimes(1);
});

test('after the 7-day window a terminal failure refunds at once',async()=>{
  const f=await fixture({attempts:9,round:3,failure:exhausted(),createdAt:new Date(Date.now()-8*DAY)});
  const response=await f.run();
  expect(response.body.reason).toBe('GENERATION_FAILED');
  expect((await f.read()).llmMeta).toBeUndefined();
  expect(f.refund).toHaveBeenCalledTimes(1);
  expect(f.cancel).toHaveBeenCalledTimes(1);
});

test('a deterministic calculation failure still refunds at once',async()=>{
  const f=await fixture({failure:Object.assign(new Error('basis missing'),{code:'FORTUNE_TEA_HOUSE_SAJU_BASIS_MISSING'})});
  await expect(f.run()).rejects.toThrow('basis missing');
  const row=await f.read();
  expect(row.status).toBe('generation_failed');
  expect(row.llmMeta).toBeUndefined();
  expect(f.refund).toHaveBeenCalledTimes(1);
  expect(f.cancel).toHaveBeenCalledTimes(1);
});

test('a stale worker cannot cancel or modify a different lease owner',async()=>{
  const f=await fixture({token:'another-worker'});
  await f.run();
  expect((await f.read()).generationLock.token).toBe('another-worker');
  expect(f.cancel).not.toHaveBeenCalled();
});

test('legacy missing-input failure is not silently opted into automatic paid generation',async()=>{
  const f=await fixture({checkpoint:false});
  await f.run();
  const row=await f.read();
  expect(row.status).toBe('generation_failed');
  expect(row.llmMeta).toBeUndefined();
  expect(f.cancel).toHaveBeenCalledTimes(1);
});

// R7: 보류 중 같은 요청의 재제출은 증빙(같은 요청의 replay)을 풀지 않는다. 표식에 증빙이 없으면(정체 보류) 표식에 남겨 정산 때 푼다.
test('a held re-submission never releases the payment evidence and records it on an empty marker',async()=>{
  for(const kept of [[],['pay-0']]){
    const f=await fixture({marker:{refundAt:new Date(Date.now()+DAY),code:'DELIVERY_STUCK',evidenceIds:kept,reopens:0}});
    const doc=await f.read();
    const context={...f.context,generation:{retryHold:{refundAt:'2026-11-27T00:00:00.000Z'},doc},access:{auth:{userId:'owner'}},evidenceIds:['pay-1']};
    vm.createContext(context);
    vm.runInContext(ROUND_HELPERS,context);
    const response=await vm.runInContext('(async()=>{'+heldResubmit+'})()',context);
    expect(response).toMatchObject({status:409,body:{reason:'RETRY_AVAILABLE',refunded:false}});
    expect(f.release).not.toHaveBeenCalled();
    expect((await f.read()).llmMeta.retryable.evidenceIds).toEqual(kept.length?kept:['pay-1']);
  }
});
