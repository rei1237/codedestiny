import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');

async function adapter(available=true){
 const state={orders:[],ack:[],requests:[],reply:()=>({}),failAck:false};
 globalThis.tossRecoveryTest=state;
 const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/platform.ts')],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'offline-sdk',setup(b){
  b.onResolve({filter:/^(@apps-in-toss\/web-framework|\.\/release)$/},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./release'?'export const SERVICE_AVAILABLE='+available+';':`
   export const Environment={environment:'sandbox'},TossAuth={login:async()=>({authorizationCode:'mock',referrer:'SANDBOX'})},Storage={getItem:async()=>{const s=globalThis.tossRecoveryTest,value=s.stored||null;if(s.getStarted)s.getStarted();if(s.getWait)await s.getWait;return value;},removeItem:async()=>{const s=globalThis.tossRecoveryTest;if(s.removeStarted)s.removeStarted();if(s.removeWait)await s.removeWait;s.stored=null;},setItem:async(_key,value)=>{globalThis.tossRecoveryTest.stored=value;}},Share={};
   const buy=options=>{globalThis.tossRecoveryTest.purchaseOptions=options;return ()=>{};};buy.isSupported=()=>true;
   const pending=async()=>{const s=globalThis.tossRecoveryTest;s.pendingCalls=(s.pendingCalls||0)+1;return s.malformed?undefined:{orders:s.orders};};pending.isSupported=()=>globalThis.tossRecoveryTest.supportPending!==false;const complete=async({params})=>{const s=globalThis.tossRecoveryTest;s.ack.push(params.orderId);return !s.failAck;};complete.isSupported=()=>globalThis.tossRecoveryTest.supportComplete!==false;export const IAP={createOneTimePurchaseOrder:buy,getPendingOrders:pending,completeProductGrant:complete};
  `}));
 }}]});
 const loaded=new Module('purchase-recovery-check.cjs');loaded._compile(bundle.outputFiles[0].text,loaded.id);
 return {state,restore:loaded.exports.restorePurchases,auto:loaded.exports.recoverAfterAuthentication,purchase:loaded.exports.purchase,purchaseTarot:loaded.exports.purchaseTarotLibrary,login:loaded.exports.login,api:loaded.exports.api,canonical:loaded.exports.canonicalResponse,onInvalidated:loaded.exports.onSessionInvalidated,restoreSession:loaded.exports.restoreSession};
}

test('pending purchases use server-owned product routing and acknowledge durable grants only',async()=>{
 const {state,restore}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'},{orderId:'unconfirmed',sku:'consultation'},{orderId:'failed',sku:'other'}];
 globalThis.fetch=async(url,options)=>{
  assert.equal(new URL(url).pathname,'/api/toss/orders/restore');
  const body=JSON.parse(options.body);state.requests.push(body);
  if(body.orderId==='failed')return Response.json({error:'TOSS_PARTNER_UNAVAILABLE'},{status:503});
  return Response.json({orderId:body.orderId,entitlement:'granted',durable:body.orderId==='saved'});
 };
 try{
  assert.deepEqual(await restore(),{recovered:1,failed:2,denied:0});
  assert.deepEqual(state.ack,['saved']);assert.equal(state.requests.length,3);
  assert.ok(state.requests.every(body=>Object.keys(body).sort().join(',')==='orderId,sku'));
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an SDK acknowledgement failure remains recoverable and is never counted as success',async()=>{
 const {state,restore}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];state.failAck=true;
 globalThis.fetch=async()=>Response.json({orderId:'saved',entitlement:'granted',durable:true});
 try{assert.deepEqual(await restore(),{recovered:0,failed:1,denied:0});}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('access denial is distinguished and does not prevent recovery of another order',async()=>{
 const {state,restore}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'denied',sku:'first'},{orderId:'saved',sku:'second'}];
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);return body.orderId==='denied'?Response.json({error:'ORDER_OWNERSHIP_MISMATCH'},{status:403}):Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{assert.deepEqual(await restore(),{recovered:1,failed:0,denied:1});assert.deepEqual(state.ack,['saved']);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('simultaneous recovery requests share one attempt and later retries remain possible',async()=>{
 const {state,restore}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];let release;
 const gate=new Promise(resolve=>{release=resolve;});
 globalThis.fetch=async()=>{await gate;return Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{
  const first=restore(),second=restore();assert.equal(first,second);release();
  assert.deepEqual(await first,{recovered:1,failed:0,denied:0});assert.equal(state.pendingCalls,1);assert.deepEqual(state.ack,['saved']);
  state.orders=[];assert.deepEqual(await restore(),{recovered:0,failed:0,denied:0});assert.equal(state.pendingCalls,2);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('automatic recovery waits for authentication and shares an overlapping manual recovery',async()=>{
 const {state,restore,auto}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];let release;
 const gate=new Promise(resolve=>{release=resolve;});
 globalThis.fetch=async()=>{await gate;return Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{
  assert.equal(await auto(false),'');assert.equal(state.pendingCalls,undefined);
  const automatic=auto(true),manual=restore();release();
  assert.match(await automatic,/1건 복구/);assert.equal((await manual).recovered,1);
  assert.equal(state.pendingCalls,1);assert.deepEqual(state.ack,['saved']);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('new purchases wait for pending-order recovery to finish',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];let release;
 const gate=new Promise(resolve=>{release=resolve;});
 globalThis.fetch=async()=>{await gate;return Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{
  const recovery=restore();
  for(const buy of [purchase,purchaseTarot])assert.throws(()=>buy({sku:'mock'},'request',()=>{},()=>{}),error=>error.code==='RECOVERY_IN_PROGRESS');
  assert.equal(state.purchaseOptions,undefined);release();await recovery;
  purchase({sku:'mock'},'request',()=>{},()=>{});assert.ok(state.purchaseOptions);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const unsupported of ['supportPending','supportComplete'])test(unsupported+' prevents both recovery and new purchases',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter();state[unsupported]=false;
 try{
  await assert.rejects(restore(),error=>error.code==='IAP_NOT_SUPPORTED');
  for(const buy of [purchase,purchaseTarot])assert.throws(()=>buy({sku:'mock'},'request',()=>{},()=>{}),error=>error.code==='IAP_NOT_SUPPORTED');
  assert.equal(state.pendingCalls,undefined);assert.equal(state.purchaseOptions,undefined);
 }finally{delete globalThis.tossRecoveryTest;}
});

test('a malformed or failed recovery blocks purchase until a successful retry',async()=>{
 const {state,restore,purchase}=await adapter();state.malformed=true;
 try{
  await assert.rejects(restore(),error=>error.code==='RECOVERY_STATUS_UNAVAILABLE');
  assert.throws(()=>purchase({sku:'mock'},'request',()=>{},()=>{}),error=>error.code==='RECOVERY_REQUIRED');
  state.malformed=false;await restore();purchase({sku:'mock'},'request',()=>{},()=>{});assert.ok(state.purchaseOptions);
 }finally{delete globalThis.tossRecoveryTest;}
});

test('a changed session cannot acknowledge an earlier session recovery',async()=>{
 const {state,restore,login}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];let release,started;
 const gate=new Promise(resolve=>{release=resolve;}),requestStarted=new Promise(resolve=>{started=resolve;});
 globalThis.fetch=async(url)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:'new-session'});started();await gate;return Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{
  const recovery=restore();await requestStarted;await login();release();
  await assert.rejects(recovery,error=>error.code==='SESSION_CHANGED'&&error.status===409);assert.deepEqual(state.ack,[]);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an old unauthorized response does not clear a newer login',async()=>{
 const {state,restore,login,api}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'old',sku:'tarot'}];let release,started,authorization='';
 const gate=new Promise(resolve=>{release=resolve;}),requestStarted=new Promise(resolve=>{started=resolve;});
 globalThis.fetch=async(url,options)=>{
  const pathname=new URL(url).pathname;
  if(pathname.endsWith('/login'))return Response.json({token:'new-session'});
  if(pathname.endsWith('/orders/restore')){started();await gate;return Response.json({error:'SESSION_EXPIRED'},{status:401});}
  authorization=options.headers.Authorization;return Response.json({ok:true});
 };
 try{
  const recovery=restore();await requestStarted;await login();release();await assert.rejects(recovery);
  await api('/session');assert.equal(authorization,'Bearer new-session');assert.deepEqual(state.ack,[]);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('expired login stops recovery and preserves the authentication error',async()=>{
 const {state,restore}=await adapter(),previous=globalThis.fetch;
 state.orders=[{orderId:'expired',sku:'first'},{orderId:'later',sku:'second'}];
 globalThis.fetch=async(_url,options)=>{state.requests.push(JSON.parse(options.body));return Response.json({error:'SESSION_EXPIRED'},{status:401});};
 try{
  await assert.rejects(restore(),error=>error.code==='SESSION_EXPIRED'&&error.status===401);
  assert.equal(state.requests.length,1);assert.deepEqual(state.ack,[]);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['purchase','purchaseTarot'])test(kind+' refuses SDK success without a durable matching grant and settles once',async()=>{
 const adapterResult=await adapter(),{state}=adapterResult,previous=globalThis.fetch;await adapterResult.restore();
 let done=0;const errors=[];
 globalThis.fetch=async()=>Response.json({orderId:'order',requestId:'other-request',entitlement:'granted',durable:kind==='purchase'});
 try{
  adapterResult[kind]({sku:'mock'},kind==='purchase'?'request':{},()=>done++,error=>errors.push(error));
  assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'order'}),false);
  state.purchaseOptions.onEvent({type:'success'});state.purchaseOptions.onEvent({type:'success'});
  assert.equal(done,0);assert.equal(errors.length,1);assert.equal(errors[0].code,'GRANT_NOT_DURABLE');
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});
for(const kind of ['purchase','purchaseTarot'])test(kind+' completes only after durable grant, with duplicate event ignored',async()=>{
 const adapterResult=await adapter(),{state}=adapterResult,previous=globalThis.fetch;await adapterResult.restore();let done=0;
 globalThis.fetch=async()=>Response.json({orderId:'order',requestId:'request',entitlement:'granted',durable:true});
 try{
  adapterResult[kind]({sku:'mock'},kind==='purchase'?'request':{},()=>done++,error=>assert.fail(error));
  assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'order'}),true);
  assert.equal(done,0);state.purchaseOptions.onEvent({type:'success'});state.purchaseOptions.onEvent({type:'success'});assert.equal(done,1);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});
test('disabled release cannot even open the native payment sheet',async()=>{
 const {state,purchase,purchaseTarot}=await adapter(false);
 try{for(const buy of [purchase,purchaseTarot])assert.throws(()=>buy({sku:'mock'},'request',()=>{},()=>{}),/TOSS_RELEASE_PENDING/);assert.equal(state.purchaseOptions,undefined);}
 finally{delete globalThis.tossRecoveryTest;}
});

test('old canonical 401 cannot invalidate a newer login',async()=>{
 const {state,login,canonical,onInvalidated,api}=await adapter(),previous=globalThis.fetch;let release,started,invalidations=0,logins=0,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});onInvalidated(()=>invalidations++);
 globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});if(p.endsWith('/canonical/records')){started();await wait;return Response.json({error:'SESSION_EXPIRED'},{status:401});}seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();const request=canonical('/canonical/records',new Request('https://miniapp.example/api/records'));await begun;await login();release();await assert.rejects(request,e=>e.code==='SESSION_CHANGED'&&e.status===409);await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');assert.equal(invalidations,0);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('current canonical 401 clears only the current session and notifies once',async()=>{
 const {state,login,canonical,onInvalidated}=await adapter(),previous=globalThis.fetch;let invalidations=0;onInvalidated(()=>invalidations++);globalThis.fetch=async url=>new URL(url).pathname.endsWith('/login')?Response.json({token:'old-session'}):Response.json({error:'SESSION_EXPIRED'},{status:401});
 try{await login();const response=await canonical('/canonical/records',new Request('https://miniapp.example/api/records'));assert.equal(response.status,401);assert.equal(state.stored,null);assert.equal(invalidations,1);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('delayed storage removal cannot erase or invalidate a newer login',async()=>{
 const {state,login,canonical,onInvalidated,api}=await adapter(),previous=globalThis.fetch;let release,started,invalidations=0,logins=0,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});onInvalidated(()=>invalidations++);globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});if(p.endsWith('/canonical/records'))return Response.json({error:'SESSION_EXPIRED'},{status:401});seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();state.removeWait=wait;state.removeStarted=started;const request=canonical('/canonical/records',new Request('https://miniapp.example/api/records'));await begun;const newLogin=login();await new Promise(r=>setImmediate(r));release();await assert.rejects(request,e=>e.code==='SESSION_CHANGED');await newLogin;await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');assert.equal(invalidations,0);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a delayed session restore does not overwrite a newer login',async()=>{
 const {state,login,restoreSession,api}=await adapter(),previous=globalThis.fetch;let release,started,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});state.stored='old-session';state.getWait=wait;state.getStarted=started;globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:'new-session'});seen=options.headers.Authorization;return Response.json({ok:true});};
 try{const oldRestore=restoreSession();await begun;await login();release();assert.equal(await oldRestore,true);await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a failed UI listener does not hide the session expiration',async()=>{
 const {login,canonical,onInvalidated}=await adapter(),previous=globalThis.fetch;onInvalidated(()=>{throw Error('listener error');});globalThis.fetch=async url=>new URL(url).pathname.endsWith('/login')?Response.json({token:'current-session'}):Response.json({error:'SESSION_EXPIRED'},{status:401});
 try{await login();const response=await canonical('/canonical/records',new Request('https://miniapp.example/api/records'));assert.equal(response.status,401);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a non-JSON 401 still expires the current session and reports authentication',async()=>{
 const {state,login,api,onInvalidated}=await adapter(),previous=globalThis.fetch;let invalidations=0;onInvalidated(()=>invalidations++);globalThis.fetch=async url=>new URL(url).pathname.endsWith('/login')?Response.json({token:'current-session'}):new Response('gateway failure',{status:401});
 try{await login();await assert.rejects(api('/session'),e=>e.code==='SESSION_EXPIRED'&&e.status===401);assert.equal(state.stored,null);assert.equal(invalidations,1);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a rejected new login does not discard an existing authenticated session',async()=>{
 const {state,login,api,onInvalidated}=await adapter(),previous=globalThis.fetch;let logins=0,invalidations=0,seen='';onInvalidated(()=>invalidations++);globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/login'))return ++logins===1?Response.json({token:'old-session'}):Response.json({error:'TOSS_TOKEN_INVALID'},{status:401});seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();await assert.rejects(login(),e=>e.code==='TOSS_TOKEN_INVALID'&&e.status===401);await api('/session');assert.equal(seen,'Bearer old-session');assert.equal(state.stored,'old-session');assert.equal(invalidations,0);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});
