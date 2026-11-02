import assert from 'node:assert/strict';
import test from 'node:test';
import {EventEmitter} from 'node:events';
import {fixtures,settleApiFixture} from '../../scripts/lib/yeongnyangi-mobile-payment.mjs';

test('payment fixture recognises activation reads without granting rights or accepting writes',async()=>{
 const base='http://127.0.0.1:31999';
 let handler;
 const page=Object.assign(new EventEmitter(),{mainFrame:()=>frame,url:()=>base+'/yeongnyangi/result/',evaluate:async()=>300});
 const frame={url:()=>base+'/yeongnyangi/result/'};
 const context=Object.assign(new EventEmitter(),{
  setDefaultTimeout(){},setDefaultNavigationTimeout(){},
  async addCookies(){},async exposeBinding(){},async addInitScript(){},
  async newPage(){return page;},
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
  let release;
  const hold=new Promise(resolve=>{release=resolve;});
  const pending=handler({request:()=>({url:()=>base+'/api/activation-rewards/status',method:()=> 'GET'}),fulfill:()=>hold});
  await Promise.resolve();assert.equal(f.state.http.length,0,'HTTP proof requires completed fulfillment');release();await pending;
  const tracked={url:()=>base+'/api/activation-rewards/status',frame:()=>({page:()=>page}),failure:()=>({errorText:'net::ERR_ABORTED'})};
  context.emit('request',tracked);page.emit('framenavigated',frame);
  assert(f.state.apiInFlight.has(tracked),'Navigation is not request completion');context.emit('requestfailed',tracked);
  assert.equal(f.state.apiInFlight.size,0);
  const pageId=f.state.pageIds.get(page);
  const previousDocument={};f.state.apiInFlight.set(previousDocument,page);f.state.requestStartedAt.set(previousDocument,100);
  const paths=['/api/activation-rewards/status','/api/activation-rewards/snu/status'];
  f.state.http=paths.map(path=>({path,method:'GET',status:200,pageId,startedAt:100}));
  let settled=false;const drain=settleApiFixture(f).then(()=>{settled=true;});
  await new Promise(resolve=>setTimeout(resolve,30));assert.equal(settled,false,'Prior document responses cannot release a reload');
  const currentDocument={};f.state.apiInFlight.set(currentDocument,page);f.state.requestStartedAt.set(currentDocument,301);
  f.state.http.push(...paths.map(path=>({path,method:'GET',status:200,pageId,startedAt:301})));
  await new Promise(resolve=>setTimeout(resolve,30));assert.equal(settled,false,'Current document requests still block reload');
  f.state.apiInFlight.delete(currentDocument);await drain;assert(f.state.apiInFlight.has(previousDocument),'Old-document requests remain recorded without blocking the current one');
  const reward=await request('/api/activation-rewards/status');
  assert.equal(reward.status,200);assert.equal(reward.json.tutorial.eligible,false);
  assert.equal(reward.json.policy.review.trigger,'approved');assert.equal(typeof reward.json.policy.review.amount,'number');
  assert.equal(reward.json.firstPaid.receipt.status,'granted');assert.equal(reward.json.wallet.balance,0);
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
