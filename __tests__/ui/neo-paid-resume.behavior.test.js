const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = fs.readFileSync('src/features/neo-war-room/paid-delivery.ts', 'utf8');
function fixture() {
  const calls = [], progress = []; let current = true;
  const ctx = { exports: {}, document: { visibilityState: 'visible' }, navigator: { onLine: true }, window: { setTimeout: callback => callback() }, require: () => ({ authFetch: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: init?.method ? 200 : 202, json: async () => ({ ok: true, sessionId: 'original-server-id', status: init?.method ? 'completed' : 'partial' }) };
  } }) };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { ctx, calls, progress, changeOwner: () => { current = false; }, run: (phase = 'briefing') => ctx.exports.receiveNeoBriefing('original-server-id', data => progress.push(data), () => current, '', phase) };
}
test('actual delivery loop reads saved partial and continues with the original server ID', async () => { const f = fixture(); assert.equal((await f.run()).status, 'completed'); assert.equal(f.progress[0].status, 'partial'); assert.equal(JSON.parse(f.calls[1].init.body).sessionId, 'original-server-id'); assert.equal(f.calls.length, 2); });
test('hidden or offline clients do not begin new generation', async () => { for (const hidden of [true, false]) { const f = fixture(); if (hidden) f.ctx.document.visibilityState = 'hidden'; else f.ctx.navigator.onLine = false; await assert.rejects(f.run, /GENERATION_PENDING/); assert.equal(f.calls.length, 0); } });
test('a changed account cannot receive or resume another result', async () => { const f = fixture(); f.changeOwner(); await assert.rejects(f.run, /ACCOUNT_CHANGED/); assert.equal(f.calls.length, 0); });
test('storage failures preserve partial delivery with bounded retries', async () => {
  const f = fixture(); let posts = 0;
  f.ctx.require = () => ({ authFetch: async (_url, init) => { if (init?.method) { posts++; return { ok: false, status: 503, json: async () => ({ ok: false, retryable: true, reason: 'RESULT_STORAGE_UNAVAILABLE' }) }; } return { ok: true, status: 202, json: async () => ({ ok: true, status: 'partial', sessionId: 'original-server-id' }) }; } });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { ...f.ctx });
  await assert.rejects(f.run, /GENERATION_PENDING/); assert.equal(posts, 6); assert.equal(f.progress.length, 6);
});

test('a completed initial report does not stop a pending refinement', async () => {
 const f=fixture();let posts=0;const paths=[];
 f.ctx.require=()=>({authFetch:async(url,init)=>{paths.push(url);if(init?.method)posts++;return{ok:true,status:init?.method&&posts<2?202:200,json:async()=>({ok:true,status:'completed',sessionId:'original-server-id',refinementStatus:posts>=2?'completed':'generating'})}}});
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{...f.ctx});
 assert.equal((await f.run('refinement')).refinementStatus,'completed');assert.equal(posts,2);assert.equal(paths.filter(path=>path.endsWith('/refine')).length,2);assert.equal(paths.some(path=>path.endsWith('/start')),false);
});

for(const phase of ['briefing','refinement'])for(const boundary of ['read','resume'])for(const code of ['ORDER_REFUNDED','ORDER_MISMATCH','REQUEST_INPUT_MISMATCH'])test(`native ${phase} ${boundary}: ${code} stops without retries or a new request`,async()=>{
 const f=fixture(),calls=[];
 f.ctx.require=()=>({authFetch:async(url,init)=>{
  calls.push({url,init});
  if(boundary==='resume'&&!init?.method)return {ok:true,status:202,json:async()=>({ok:true,sessionId:'original-server-id',status:'partial'})};
  return {ok:false,status:code==='ORDER_MISMATCH'?403:409,json:async()=>({ok:false,reason:code})};
 }});
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{...f.ctx});
 await assert.rejects(()=>f.run(phase),new RegExp(code));
 assert.equal(calls.length,boundary==='read'?1:2);
 assert.equal(f.progress.length,boundary==='read'?0:1);
});
