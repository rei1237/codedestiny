const test = require('node:test');
const assert = require('node:assert/strict');
const api = import('../../lib/naming-paid-reader.js');
function harness(replies) {
  const calls = [], shown = [];
  const reply = async (kind, body) => { calls.push({kind, body}); const value = replies.shift(); if (value instanceof Error) throw value; return value; };
  return {calls, shown, options: {get: id => reply('get', id), post: body => reply('post', body), show: body => shown.push(body), active: () => true, visible: () => true, wait: async () => {}}};
}
test('stored execution resumes chapters and recovers a lost apply response without checkout', async () => {
  const {runNamingReader} = await api;
  const h = harness([
    {status:202,data:{result:{status:'partial'},resumeBody:{resumeExecutionId:'original-id'}}},
    {status:503,data:{ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE'}},
    {status:202,data:{result:{status:'partial'},resumeBody:{resumeExecutionId:'original-id'}}},
    {status:201,data:{ok:true,result:{status:'completed'}}},
  ]);
  assert.equal(await runNamingReader('original-id', h.options),true);
  assert.deepEqual(h.calls.map(row=>row.kind),['get','post','get','post']);
  for (const row of h.calls.filter(row=>row.kind==='post')) assert.deepEqual(row.body,{resumeExecutionId:'original-id'});
  assert.equal(h.shown.length,3);
});
test('account change discards late results; background state starts no wave', async () => {
  const {runNamingReader} = await api;
  const h=harness([]); let active=true; h.options.active=()=>active;
  h.options.get=async()=>{active=false;return {status:200,data:{ok:true,result:{status:'completed'}}};};
  assert.equal(await runNamingReader('original-id',h.options),false); assert.equal(h.shown.length,0);
  const hidden=harness([]); hidden.options.visible=()=>false;
  assert.equal(await runNamingReader('original-id',hidden.options),false); assert.equal(hidden.calls.length,0);
});
test('legacy completed results open and bounded failures never acknowledge completion',async()=>{
  const {runNamingReader}=await api;
  const legacy=harness([{status:200,data:{ok:true,result:{generatedResult:'historical short report'}}}]);
  assert.equal(await runNamingReader('old-id',legacy.options),true);
  const failed=harness(Array.from({length:4},()=>new Error('offline')));
  await assert.rejects(runNamingReader('saved-id',failed.options),/offline/);assert.equal(failed.calls.length,4);
  const revoked=harness([{status:403,data:{ok:false,message:'revoked'}}]);
  await assert.rejects(runNamingReader('saved-id',revoked.options),/revoked/);assert.equal(revoked.calls.length,1);
});
