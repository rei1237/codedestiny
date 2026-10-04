/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const createStore = require('../fixtures/fortune-tea-result-store.cjs');
const source = fs.readFileSync(path.join(__dirname, '../../worker/routes/fortune-tea-house.js'), 'utf8');
const ast = ts.createSourceFile('tea.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
let generation;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'runGeneration') generation = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(declaration('handleConsult'));

async function fixture({attempts = 1, checkpoint = true, token = 'held'} = {}) {
  const results = createStore();
  const saved = { first: { body: 'already delivered paid prose' } };
  const state = { requestBody: { requestId: 'original-purchase' }, groups: [{key:'first'}, {key:'missing'}], parts: saved, attempts: {first:1, missing:attempts}, repairs: [] };
  await results.updateOne({_id:'stored'}, {$set:{userId:'owner',resultId:'result',status:'generating',generationLock:{token},...(checkpoint?{generationCheckpoint:state}:{})}}, {upsert:true});
  const cancel = jest.fn(async()=>({}));
  const context = { Date, console, env:{}, auth:{userId:'owner'}, resultId:'result', requestId:'original-purchase', request:{},
    access:{auth:{userId:'owner'},deferredUsage:true}, generation:{lockToken:'held'}, consultRequest:{}, fallback:{}, body:{},
    honeyCollections:()=>({results}), withMongoRetry:async(_env,work)=>work(), cleanText:value=>String(value||''),
    teaNarrativeText:value=>JSON.stringify(value), json:(body,options)=>({body,status:options.status}),
    assertSajuCalculationBasis:()=>{}, assertSukuyoCalculationBasis:()=>{}, hasGeminiKey:()=>true,
    generateTeaCheckpoint:async()=>{throw Object.assign(new Error('temporary interruption'),{code:'FORTUNE_TEA_HOUSE_LLM_RETRYABLE'});},
    callFortuneTeaDeferredUsageRoute:cancel,
  };
  vm.createContext(context);
  vm.runInContext(['teaCheckpointProgress','markFortuneTeaHouseGenerationFailed'].map(name=>declaration(name).getText(ast)).join('\n'),context);
  const run=vm.runInContext(`(${generation})`,context);
  return {run,cancel,read:()=>results.findOne({_id:'stored'}),saved,state};
}

test('a provider interruption preserves the checkpoint for cron without cancelling the purchase',async()=>{
  const f=await fixture();
  const response=await f.run();
  expect(response.status).toBe(202);
  expect(response.body).toMatchObject({status:'partial',retryable:true,resultId:'result'});
  const row=await f.read();
  expect(row.status).toBe('partial');
  expect(row.generationCheckpoint).toEqual(f.state);
  expect(row.generationLock).toBeUndefined();
  expect(f.cancel).not.toHaveBeenCalled();
});

test('exhausted reservations remain bounded and retain the existing cancellation path',async()=>{
  const f=await fixture({attempts:2});
  expect((await f.run()).status).toBe(503);
  const row=await f.read();
  expect(row.status).toBe('generation_failed');
  expect(row.generationError.retryable).toBe(false);
  expect(row.generationCheckpoint).toEqual(f.state);
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
