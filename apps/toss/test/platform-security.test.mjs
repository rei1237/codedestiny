import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requireTossOrigin, checkOrder, validateLoginInput, analyticsEvent, assertGrantReceipt} from '../../../worker/toss/policy.js';
import {partnerRequest,loginIdentity,lookupOrder} from '../../../worker/toss/partner.js';
import {seal,unseal,identityId,callbackAuthorized} from '../../../worker/toss/crypto.js';
const orderId='01900000-1111-7111-8111-000000000001';
const env={TOSS_MTLS_EXPIRES_AT:'2099-01-01',TOSS_DATA_KEY:btoa('a'.repeat(32)),TOSS_IDENTITY_KEY:'b'.repeat(32)};
test('only exact app origins; no null, arbitrary subdomain or web cookies',()=>{
  assert.equal(requireTossOrigin('https://ai-saju-studio.apps.tossmini.com'),'https://ai-saju-studio.apps.tossmini.com');
  for(const origin of [null,'null','https://evil.apps.tossmini.com','https://ai-saju-studio.apps.tossmini.com.evil.test','https://code-destiny.com']) assert.throws(()=>requireTossOrigin(origin));
});
test('login requires an authorization code and documented referrer',()=>{
  assert.throws(()=>validateLoginInput({userId:'someone-else'}));
  assert.throws(()=>validateLoginInput({authorizationCode:'x',referrer:'WEB'}));
});
test('missing/expired mTLS fails closed without global fetch',async()=>{
  await assert.rejects(partnerRequest({},'token'),/NOT_CONFIGURED/);
  await assert.rejects(partnerRequest({TOSS_MTLS:{fetch:()=>assert.fail()},TOSS_MTLS_EXPIRES_AT:'2000-01-01'},'token'),/EXPIRED/);
});
test('login without email works; only verified userKey survives',async()=>{
  const calls=[];
  const local={...env,TOSS_MTLS:{fetch:async(url,init)=>{
    calls.push([url,init]);
    return Response.json({resultType:'SUCCESS',success:calls.length===1?{accessToken:'private'}:{userKey:123,email:null,birthday:'encrypted'}});
  }}};
  assert.deepEqual(await loginIdentity(local,{authorizationCode:'once',referrer:'DEFAULT'}),{userKey:'123',referrer:'DEFAULT'});
  assert.equal(calls[1][1].headers.Authorization,'Bearer private');
  assert.equal(calls[0][1].redirect,'error');
});
test('orders always carry server identity header; no unscoped query',async()=>{
  await assert.rejects(lookupOrder({...env,TOSS_MTLS:{fetch:()=>assert.fail()}},'',orderId));
  await lookupOrder({...env,TOSS_MTLS:{fetch:async(url,init)=>{
    assert.equal(init.headers['x-toss-user-key'],'123');
    assert.equal(JSON.parse(init.body).orderId,orderId);
    return Response.json({resultType:'SUCCESS',success:{orderId}});
  }}},'123',orderId);
});
for(const status of ['REFUNDED','FAILED','ORDER_IN_PROGRESS','NOT_FOUND','MINIAPP_MISMATCH','ERROR']) test(`no grant on ${status}`,()=>{
  assert.throws(()=>checkOrder({orderId,sku:'real',status},{orderId,sku:'real'}));
});
test('order and SKU must both match',()=>{
  assert.throws(()=>checkOrder({orderId,sku:'other',status:'PURCHASED'},{orderId,sku:'real'}));
  assert.throws(()=>checkOrder({orderId:'other',sku:'real',status:'PURCHASED'},{orderId,sku:'real'}));
  assert.equal(checkOrder({orderId,sku:'real',status:'PAYMENT_COMPLETED',amount:1},{orderId,sku:'real'}).amount,undefined);
});
test('job identifiers alone never mean durable grant',()=>{
  assert.equal(assertGrantReceipt({orderId,jobId:'job'},orderId),false);
  assert.equal(assertGrantReceipt({orderId,entitlement:'granted',durable:true},orderId),true);
});
test('sensitive analytics stripped and client cannot claim purchase conversion',()=>{
  assert.deepEqual(analyticsEvent('product_view',{productId:'saju_tuna',question:'private',birthDate:'secret',userKey:123}),{event:'product_view',source:'client',productId:'saju_tuna'});
  assert.throws(()=>analyticsEvent('purchase_verified',{}));
});
test('encrypted identity is authenticated, context-bound and non-deterministic',async()=>{
  const a=await seal(env,{userKey:'123'},'identity');
  const b=await seal(env,{userKey:'123'},'identity');
  assert.notEqual(a.data,b.data);
  assert.deepEqual(await unseal(env,a,'identity'),{userKey:'123'});
  await assert.rejects(unseal(env,a,'other'));
  assert.equal(await identityId(env,'123'),await identityId(env,'123'));
  assert.notEqual(await identityId(env,'123'),await identityId(env,'124'));
});
test('callback must use configured authorization',async()=>{
  assert.equal(await callbackAuthorized('Basic abc','Basic abc'),true);
  assert.equal(await callbackAuthorized('Basic def','Basic abc'),false);
  assert.equal(await callbackAuthorized('',''),false);
});
test('provider errors do not expose tokens or response text',async()=>{
  await assert.rejects(partnerRequest({...env,TOSS_MTLS:{fetch:async()=>{throw new Error('token secret');}}},'token'),e=>e.code==='TOSS_PARTNER_UNAVAILABLE'&&!e.message.includes('secret'));
});
