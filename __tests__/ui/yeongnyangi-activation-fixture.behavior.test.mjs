import assert from 'node:assert/strict';
import test from 'node:test';
import {EventEmitter} from 'node:events';
import {fixtures} from '../../scripts/lib/yeongnyangi-mobile-payment.mjs';

test('payment fixture recognises activation reads without granting rights or accepting writes',async()=>{
 const base='http://127.0.0.1:31999';
 let handler;
 const context=Object.assign(new EventEmitter(),{
  setDefaultTimeout(){},setDefaultNavigationTimeout(){},
  async addCookies(){},async exposeBinding(){},async addInitScript(){},
  async newPage(){return {on(){}};},
  async route(_pattern,callback){handler=callback;},
  async close(){this.emit('close');},
 });
 const browser={browserType:()=>({name:()=> 'chromium'}),newContext:async()=>context};
 const f=await fixtures(browser,base,{id:'fixture-no-purchase',chapterCount:0});
 const request=async(path,method='GET')=>{
  let result;
  await handler({request:()=>({url:()=>base+path,method:()=>method,postDataJSON:()=>({})}),fulfill:async response=>{result=response;}});
  return result;
 };
 try{
  const reward=await request('/api/activation-rewards/status');
  assert.equal(reward.status,200);assert.equal(reward.json.tutorial.eligible,false);
  const campus=await request('/api/activation-rewards/snu/status');
  assert.equal(campus.status,200);assert.equal(campus.json.verified,false);assert.equal(campus.json.complete,false);
  assert.deepEqual(campus.json.unlockedFeatureKeys,[]);assert.deepEqual(f.state.unknown,[]);
  assert.equal(f.state.orders.size,0);assert.equal(f.state.monthlyDeductions,0);
  assert.equal((await request('/api/activation-rewards/status','POST')).status,501);
  assert.equal((await request('/api/activation-rewards/snu/status','POST')).status,501);
  assert.equal((await request('/api/activation-rewards/not-fixtured')).status,501);
  assert.deepEqual(f.state.unknown,['POST /api/activation-rewards/status','POST /api/activation-rewards/snu/status','GET /api/activation-rewards/not-fixtured']);
  f.state.auth=false;
  assert.equal((await request('/api/activation-rewards/status')).status,401);
  assert.equal((await request('/api/activation-rewards/snu/status')).status,401);
 }finally{await context.close();}
});
