const test = require('node:test');
const assert = require('node:assert/strict');
const api = import('../../lib/island-paid-delivery.js');
const initial = { idempotencyKey: 'original-paid', payload: { palaceKey: '명궁' }, extra: { paymentId: 'original-receipt' } };
function harness(replies) {
  const posts=[], saved=[], shown=[];
  return { posts,saved,shown, options: {
    post: async body => { posts.push(body); const reply = replies.shift(); if (reply instanceof Error) throw reply; return reply; },
    persist: value => saved.push(structuredClone(value)), display: value => shown.push(value), active: () => true, visible: () => true, wait: async () => {},
  } };
}
test('same paid request continues 202 parts and storage 503 until verified completed', async () => {
  const {runIslandDelivery}=await api;
  const h=harness([
    {status:202,data:{ok:true,retryable:true,sessionId:'saved-id',consultation:{status:'partial'}}},
    {status:503,data:{ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:'saved-id'}},
    {status:200,data:{ok:true,consultation:{status:'completed'}}},
  ]);
  assert.equal(await runIslandDelivery(initial,h.options),true);
  assert.equal(h.shown.length,2);assert.equal(h.posts.length,3);
  for(const body of h.posts){assert.equal(body.idempotencyKey,'original-paid');assert.equal(body.paymentId,'original-receipt');}
  assert.equal(h.posts[1].resumeSessionId,'saved-id');
});
test('owner switch discards late body and hidden/offline state starts no provider wave', async () => {
  const {runIslandDelivery}=await api;let active=true;
  const h=harness([]);h.options.active=()=>active;
  h.options.post=async()=>{active=false;return {status:200,data:{ok:true,consultation:{status:'completed'}}};};
  assert.equal(await runIslandDelivery(initial,h.options),false);assert.equal(h.shown.length,0);
  const hidden=harness([]);hidden.options.visible=()=>false;
  assert.equal(await runIslandDelivery(initial,hidden.options),false);assert.equal(hidden.posts.length,0);assert.equal(hidden.saved.length,1);
});
test('persistent receipt is account scoped and cleared only by its owner',async()=>{
  const {readIslandDelivery,writeIslandDelivery,clearIslandDelivery}=await api;
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  writeIslandDelivery('a',initial,storage);assert.equal(readIslandDelivery('b',storage),null);assert.equal(readIslandDelivery('',storage),null);
  clearIslandDelivery('b',storage);assert.deepEqual(readIslandDelivery('a',storage),initial);
  clearIslandDelivery('a',storage);assert.equal(readIslandDelivery('a',storage),null);
});
test('lost network response is bounded and nonretryable failure never acknowledges paid resume',async()=>{
  const {runIslandDelivery}=await api;
  const h=harness(Array.from({length:4},()=>new Error('offline')));
  await assert.rejects(runIslandDelivery(initial,h.options),/offline/);assert.equal(h.posts.length,4);assert.equal(h.saved.length,1);
  const revoked=harness([{status:403,data:{ok:false,retryable:false,message:'revoked'}}]);
  await assert.rejects(runIslandDelivery(initial,revoked.options),/revoked/);assert.equal(revoked.posts.length,1);
});
