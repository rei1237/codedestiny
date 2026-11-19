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
const ROUND_HELPERS = ['TEA_GROUP_ATTEMPTS_PER_ROUND', 'TEA_MAX_ROUNDS'].map(name => constant(name).getText(ast).replace(/^const\b/, 'var'))
  .concat(['teaRound', 'teaGroupNeedsWork', 'teaGroupHasAttempts', 'teaCheckpointRetryable'].map(name => declaration(name).getText(ast))).join('\n');
let generation;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'runGeneration') generation = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(declaration('handleConsult'));

async function fixture({attempts = 1, round, checkpoint = true, token = 'held', failure} = {}) {
  const results = createStore();
  const saved = { first: { body: 'already delivered paid prose' } };
  const state = { requestBody: { requestId: 'original-purchase' }, groups: [{key:'first'}, {key:'missing'}], parts: saved, attempts: {first:1, missing:attempts}, repairs: [], ...(round ? {round} : {}) };
  await results.updateOne({_id:'stored'}, {$set:{userId:'owner',resultId:'result',status:'generating',generationLock:{token},...(checkpoint?{generationCheckpoint:state}:{})}}, {upsert:true});
  const cancel = jest.fn(async()=>({}));
  const refund = jest.fn(async()=>({}));
  const context = { Date, console, env:{}, auth:{userId:'owner'}, resultId:'result', requestId:'original-purchase', request:{},
    access:{auth:{userId:'owner'},deferredUsage:true}, generation:{lockToken:'held'}, consultRequest:{}, fallback:{}, body:{},
    honeyCollections:()=>({results}), withMongoRetry:async(_env,work)=>work(), cleanText:value=>String(value||''),
    teaNarrativeText:value=>JSON.stringify(value), json:(body,options)=>({body,status:options.status}),
    assertSajuCalculationBasis:()=>{}, assertSukuyoCalculationBasis:()=>{}, hasGeminiKey:()=>true,
    generateTeaCheckpoint:async()=>{throw failure || Object.assign(new Error('temporary interruption'),{code:'FORTUNE_TEA_HOUSE_LLM_RETRYABLE'});},
    callFortuneTeaDeferredUsageRoute:cancel, refundFortuneTeaHousePassSettlement:refund, releaseRequestBillingEvidence:async()=>({released:0}), evidenceIds:[],
  };
  vm.createContext(context);
  vm.runInContext(ROUND_HELPERS+'\n'+['teaCheckpointProgress','markFortuneTeaHouseGenerationFailed'].map(name=>declaration(name).getText(ast)).join('\n'),context);
  const run=vm.runInContext(`(${generation})`,context);
  return {run,cancel,refund,read:()=>results.findOne({_id:'stored'}),saved,state};
}

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

test('exhausted reservations remain bounded and retain the existing cancellation path',async()=>{
  const f=await fixture({attempts:9,round:3});
  expect((await f.run()).status).toBe(503);
  const row=await f.read();
  expect(row.status).toBe('generation_failed');
  expect(row.generationError.retryable).toBe(false);
  expect(row.generationCheckpoint).toEqual(f.state);
  expect(f.cancel).toHaveBeenCalledTimes(1);
  expect(f.refund).toHaveBeenCalledTimes(1);
});

test('the round cap ends as generation_failed with one refund and no body',async()=>{
  const failure=Object.assign(new Error('fortune tea house generation attempts exhausted'),{code:'FORTUNE_TEA_HOUSE_GENERATION_EXHAUSTED'});
  const f=await fixture({attempts:9,round:3,failure});
  const response=await f.run();
  expect(response.status).toBe(409);
  expect(response.body).toMatchObject({ok:false,retryable:false,status:'generation_failed',reason:'GENERATION_FAILED',resultId:'result'});
  expect(response.body.result).toBeUndefined();
  expect(response.body.completedSections).toBeUndefined();
  expect(JSON.stringify(response.body)).not.toContain('already delivered paid prose');
  const row=await f.read();
  expect(row.status).toBe('generation_failed');
  expect(row.generationError).toMatchObject({code:'FORTUNE_TEA_HOUSE_GENERATION_EXHAUSTED',retryable:false});
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
  expect((await f.read()).status).toBe('generation_failed');
  expect(f.cancel).toHaveBeenCalledTimes(1);
});
