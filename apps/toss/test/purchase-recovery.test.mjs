import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {createRequire} from 'node:module';
import path from 'node:path';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const require=createRequire(import.meta.url),Module=require('node:module');const {build}=require('esbuild');

async function adapter(available=true,authenticated=false){
 const state={orders:[],ack:[],requests:[],reply:()=>({}),failAck:false};
 globalThis.tossRecoveryTest=state;
 const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/platform.ts')],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'offline-sdk',setup(b){
  b.onResolve({filter:/^(@apps-in-toss\/web-framework|\.\/release)$/},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='./release'?'export const SERVICE_AVAILABLE='+available+';':`
   export const Environment={environment:'sandbox'},isMinVersionSupported=versions=>{const s=globalThis.tossRecoveryTest;s.minimumVersions=versions;if(s.versionProbeFailure)throw s.versionProbeFailure;return s.versionSupported!==false;},TossAuth={login:async()=>({authorizationCode:'mock',referrer:'SANDBOX'})},Storage={getItem:async()=>{const s=globalThis.tossRecoveryTest,value=s.stored||null;if(s.getStarted)s.getStarted();if(s.getWait)await s.getWait;return value;},removeItem:async()=>{const s=globalThis.tossRecoveryTest;if(s.removeFailure)throw s.removeFailure;if(s.removeError)throw Error('storage remove failed');if(s.removeStarted)s.removeStarted();if(s.removeWait)await s.removeWait;s.stored=null;},setItem:async(_key,value)=>{const s=globalThis.tossRecoveryTest;if(s.setStarted)s.setStarted();if(s.setWait)await s.setWait;if(s.storageFailure)throw s.storageFailure;if(s.setError||s.failSetFor===value)throw Error('storage unavailable');s.stored=value;}},Share={};
   const productList=async()=>{const s=globalThis.tossRecoveryTest;s.productListCalls=(s.productListCalls||0)+1;if(s.productListError)throw s.productListError;return {products:[]};};productList.isSupported=()=>{if(globalThis.tossRecoveryTest.productSupportThrows)throw Error('bridge unavailable');return globalThis.tossRecoveryTest.supportProductList!==false;};const buy=options=>{const s=globalThis.tossRecoveryTest;s.purchaseOptions=options;if(s.synchronousThrow)throw Object.assign(Error('NETWORK_ERROR'),{code:'NETWORK_ERROR'});if(s.synchronousCancel)options.onError({code:'USER_CANCELED'});return ()=>{s.cleanupCount=(s.cleanupCount||0)+1;};};buy.isSupported=()=>true;
   const pending=async()=>{const s=globalThis.tossRecoveryTest;s.pendingCalls=(s.pendingCalls||0)+1;if(s.pendingStarted)s.pendingStarted();if(s.pendingWait)await s.pendingWait;return s.malformed?undefined:{orders:s.orders};};pending.isSupported=()=>globalThis.tossRecoveryTest.supportPending!==false;const complete=async({params})=>{const s=globalThis.tossRecoveryTest;s.ack.push(params.orderId);if(s.ackStarted)s.ackStarted();if(s.ackWait)await s.ackWait;return !s.failAck;};complete.isSupported=()=>globalThis.tossRecoveryTest.supportComplete!==false;export const IAP={createOneTimePurchaseOrder:buy,getPendingOrders:pending,completeProductGrant:complete,getProductItemList:productList};
  `}));
 }}]});
 const loaded=new Module('purchase-recovery-check.cjs');loaded._compile(bundle.outputFiles[0].text,loaded.id);
 if(authenticated){const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({token:'fixture-token'});try{await loaded.exports.login();}finally{globalThis.fetch=previous;}}
 // Existing grant tests start with a verified session; raw callers below exercise failures and races.
 const withSession=buy=>(...args)=>{const before=globalThis.fetch;globalThis.fetch=(url,...rest)=>new URL(url).pathname.endsWith('/session')?Promise.resolve(Response.json({authenticated:true})):before(url,...rest);try{return buy(...args);}finally{globalThis.fetch=before;}};
 return {state,saleProducts:loaded.exports.saleProducts,nativeSaleProducts:loaded.exports.nativeSaleProducts,tarotLibraryProducts:loaded.exports.tarotLibraryProducts,restore:loaded.exports.restorePurchases,auto:loaded.exports.recoverAfterAuthentication,purchase:withSession(loaded.exports.purchase),purchaseTarot:withSession(loaded.exports.purchaseTarotLibrary),rawPurchase:loaded.exports.purchase,rawTarot:loaded.exports.purchaseTarotLibrary,login:loaded.exports.login,logout:loaded.exports.logout,unlinkCurrentSession:loaded.exports.unlinkCurrentSession,clearSession:loaded.exports.clearSession,api:loaded.exports.api,canonical:loaded.exports.canonicalResponse,onInvalidated:loaded.exports.onSessionInvalidated,restoreSession:loaded.exports.restoreSession};
}

test('pending purchases use server-owned product routing and acknowledge durable grants only',async()=>{
 const {state,restore}=await adapter(true,true),previous=globalThis.fetch;
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
 const {state,restore}=await adapter(true,true),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];state.failAck=true;
 globalThis.fetch=async()=>Response.json({orderId:'saved',entitlement:'granted',durable:true});
 try{assert.deepEqual(await restore(),{recovered:0,failed:1,denied:0});}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('access denial is distinguished and does not prevent recovery of another order',async()=>{
 const {state,restore}=await adapter(true,true),previous=globalThis.fetch;
 state.orders=[{orderId:'denied',sku:'first'},{orderId:'saved',sku:'second'}];
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);return body.orderId==='denied'?Response.json({error:'ORDER_OWNERSHIP_MISMATCH'},{status:403}):Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{assert.deepEqual(await restore(),{recovered:1,failed:0,denied:1});assert.deepEqual(state.ack,['saved']);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('simultaneous recovery requests share one attempt and later retries remain possible',async()=>{
 const {state,restore}=await adapter(true,true),previous=globalThis.fetch;
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
 const {state,restore,auto}=await adapter(true,true),previous=globalThis.fetch;
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
 const {state,restore,purchase,purchaseTarot}=await adapter(true,true),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];let release;
 const gate=new Promise(resolve=>{release=resolve;});
 globalThis.fetch=async()=>{await gate;return Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{
  const recovery=restore();
  for(const buy of [purchase,purchaseTarot])assert.throws(()=>buy({sku:'mock'},'request',()=>{},()=>{}),error=>error.code==='RECOVERY_IN_PROGRESS');
  assert.equal(state.purchaseOptions,undefined);release();await recovery;
  purchase({sku:'mock'},'request',()=>{},()=>{});await tick();assert.ok(state.purchaseOptions);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const unsupported of ['supportPending','supportComplete'])test(unsupported+' prevents both recovery and new purchases',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(true,true);state[unsupported]=false;
 try{
  await assert.rejects(restore(),error=>error.code==='IAP_NOT_SUPPORTED');
  for(const buy of [purchase,purchaseTarot])assert.throws(()=>buy({sku:'mock'},'request',()=>{},()=>{}),error=>error.code==='IAP_NOT_SUPPORTED');
  assert.equal(state.pendingCalls,undefined);assert.equal(state.purchaseOptions,undefined);
 }finally{delete globalThis.tossRecoveryTest;}
});

for(const condition of ['versionSupported','versionProbeFailure'])test(condition+' blocks both purchase types while existing orders remain recoverable',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(true,true),previous=globalThis.fetch;
 const denial=Object.assign(new Error('denied'),{code:'ACCESS_DENIED',status:403});state[condition]=condition==='versionSupported'?false:denial;state.orders=[{orderId:'saved',sku:'fixture'}];
 globalThis.fetch=async()=>Response.json({orderId:'saved',entitlement:'granted',durable:true});
 try{
  assert.deepEqual(await restore(),{recovered:1,failed:0,denied:0});assert.deepEqual(state.ack,['saved']);
  for(const buy of [purchase,purchaseTarot])assert.throws(()=>buy({sku:'fixture'},'request',()=>{},()=>{}),error=>condition==='versionSupported'?error.code==='IAP_NOT_SUPPORTED':error===denial&&error.code==='ACCESS_DENIED'&&error.status===403);
  assert.deepEqual(state.minimumVersions,{android:'5.231.1',ios:'5.230.0'});assert.equal(state.purchaseOptions,undefined);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a malformed or failed recovery blocks purchase until a successful retry',async()=>{
 const {state,restore,purchase}=await adapter(true,true);state.malformed=true;
 try{
  await assert.rejects(restore(),error=>error.code==='RECOVERY_STATUS_UNAVAILABLE');
  assert.throws(()=>purchase({sku:'mock'},'request',()=>{},()=>{}),error=>error.code==='RECOVERY_REQUIRED');
  state.malformed=false;await restore();purchase({sku:'mock'},'request',()=>{},()=>{});await tick();assert.ok(state.purchaseOptions);
 }finally{delete globalThis.tossRecoveryTest;}
});

test('a changed session cannot acknowledge an earlier session recovery',async()=>{
 const {state,restore,login}=await adapter(true,true),previous=globalThis.fetch;
 state.orders=[{orderId:'saved',sku:'tarot'}];let release,started;
 const gate=new Promise(resolve=>{release=resolve;}),requestStarted=new Promise(resolve=>{started=resolve;});
 globalThis.fetch=async(url)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:'new-session'});started();await gate;return Response.json({orderId:'saved',entitlement:'granted',durable:true});};
 try{
  const recovery=restore();await requestStarted;await login();release();
  await assert.rejects(recovery,error=>error.code==='SESSION_CHANGED'&&error.status===409);assert.deepEqual(state.ack,[]);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an old unauthorized response does not clear a newer login',async()=>{
 const {state,restore,login,api}=await adapter(true,true),previous=globalThis.fetch;
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
 const {state,restore}=await adapter(true,true),previous=globalThis.fetch;
 state.orders=[{orderId:'expired',sku:'first'},{orderId:'later',sku:'second'}];
 globalThis.fetch=async(_url,options)=>{state.requests.push(JSON.parse(options.body));return Response.json({error:'SESSION_EXPIRED'},{status:401});};
 try{
  await assert.rejects(restore(),error=>error.code==='SESSION_EXPIRED'&&error.status===401);
  assert.equal(state.requests.length,1);assert.deepEqual(state.ack,[]);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['purchase','purchaseTarot'])test(kind+' refuses SDK success without a durable matching grant and settles once',async()=>{
 const adapterResult=await adapter(true,true),{state}=adapterResult,previous=globalThis.fetch;await adapterResult.restore();
 let done=0;const errors=[];
 globalThis.fetch=async()=>Response.json({orderId:'order',requestId:'other-request',entitlement:'granted',durable:kind==='purchase'});
 try{
  adapterResult[kind]({sku:'mock'},kind==='purchase'?'request':{},()=>done++,error=>errors.push(error));await tick();
  assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'order'}),false);
  state.purchaseOptions.onEvent({type:'success'});state.purchaseOptions.onEvent({type:'success'});
  assert.equal(done,0);assert.equal(errors.length,1);assert.equal(errors[0].code,'GRANT_NOT_DURABLE');
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});
for(const kind of ['purchase','purchaseTarot'])test(kind+' completes only after durable grant, with duplicate event ignored',async()=>{
 const adapterResult=await adapter(true,true),{state}=adapterResult,previous=globalThis.fetch;await adapterResult.restore();let done=0;
 globalThis.fetch=async()=>Response.json({orderId:'order',requestId:'request',entitlement:'granted',durable:true});
 try{
  adapterResult[kind]({sku:'mock'},kind==='purchase'?'request':{},()=>done++,error=>assert.fail(error));await tick();
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
 try{await login();state.removeWait=wait;state.removeStarted=started;const request=canonical('/canonical/records',new Request('https://miniapp.example/api/records'));await begun;assert.equal(invalidations,1);const newLogin=login();await new Promise(r=>setImmediate(r));release();await assert.rejects(request,e=>e.code==='SESSION_CHANGED');await newLogin;await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');assert.equal(invalidations,1);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
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

test('an old logout response cannot clear a newer login',async()=>{
 const {state,login,logout,api}=await adapter(),previous=globalThis.fetch;let release,started,logins=0,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});if(p.endsWith('/logout')){started();await wait;return Response.json({ok:true});}seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();const oldLogout=logout();await begun;await login();release();await assert.rejects(oldLogout,e=>e.code==='SESSION_CHANGED');await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an earlier login response cannot overwrite a later login',async()=>{
 const {state,login,api}=await adapter(),previous=globalThis.fetch;let release,started,logins=0,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login')){if(++logins===1){started();await wait;return Response.json({token:'old-session'});}return Response.json({token:'new-session'});}seen=options.headers.Authorization;return Response.json({ok:true});};
 try{const oldLogin=login();await begun;await login();release();await assert.rejects(oldLogin,e=>e.code==='SESSION_CHANGED');await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an older login finishing storage cannot report success after a newer login',async()=>{
 const {state,login,api}=await adapter(),previous=globalThis.fetch;let release,started,logins=0,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});state.setWait=wait;state.setStarted=started;globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});seen=options.headers.Authorization;return Response.json({ok:true});};
 try{const oldLogin=login();await begun;const newLogin=login();await new Promise(r=>setImmediate(r));state.setWait=null;release();await assert.rejects(oldLogin,e=>e.code==='SESSION_CHANGED');await newLogin;await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('explicit session clearing cancels an earlier in-flight login',async()=>{
 const {state,login,clearSession}=await adapter(),previous=globalThis.fetch;let release,started;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async()=>{started();await wait;return Response.json({token:'old-session'});};
 try{const pending=login();await begun;await clearSession();release();await assert.rejects(pending,e=>e.code==='SESSION_CHANGED');assert.equal(state.stored,null);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['api','canonical'])test('old '+kind+' success cannot disclose data into a newer session',async()=>{
 const {login,api,canonical}=await adapter(),previous=globalThis.fetch;let release,started,logins=0,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});if(p.endsWith('/old-data')||p.endsWith('/canonical/records')){started();await wait;return Response.json({secret:'old-account'});}seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();const pending=kind==='api'?api('/old-data'):canonical('/canonical/records',new Request('https://miniapp.example/api/records'));await begun;await login();release();await assert.rejects(pending,e=>e.code==='SESSION_CHANGED'&&e.status===409);await api('/session');assert.equal(seen,'Bearer new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('old API data parsed after account change is discarded',async()=>{
 const {login,api}=await adapter(),previous=globalThis.fetch;let release,started,logins=0;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async url=>{const p=new URL(url).pathname;if(p.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});if(p.endsWith('/old-data'))return {ok:true,status:200,json:async()=>{started();await wait;return {secret:'old-account'};}};return Response.json({ok:true});};
 try{await login();const pending=api('/old-data');await begun;await login();release();await assert.rejects(pending,e=>e.code==='SESSION_CHANGED'&&e.status===409);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an old unlink response cannot clear a newer login',async()=>{
 const {state,login,unlinkCurrentSession,api}=await adapter(),previous=globalThis.fetch;let release,started,logins=0,seen='';const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});if(p.endsWith('/unlink')){started();await wait;return Response.json({remoteUnlink:'completed'});}seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();const oldUnlink=unlinkCurrentSession();await begun;await login();release();await assert.rejects(oldUnlink,e=>e.code==='SESSION_CHANGED');await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('current-session unlink clears its token only after the server confirms',async()=>{
 const {state,login,unlinkCurrentSession}=await adapter(),previous=globalThis.fetch;globalThis.fetch=async url=>new URL(url).pathname.endsWith('/login')?Response.json({token:'current-session'}):Response.json({remoteUnlink:'completed'});
 try{await login();assert.equal((await unlinkCurrentSession()).remoteUnlink,'completed');assert.equal(state.stored,null);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a non-JSON 403 preserves permission denial without clearing the session',async()=>{
 const {state,login,api,onInvalidated}=await adapter(),previous=globalThis.fetch;let invalidations=0;onInvalidated(()=>invalidations++);globalThis.fetch=async url=>new URL(url).pathname.endsWith('/login')?Response.json({token:'current-session'}):new Response('gateway refusal',{status:403});
 try{await login();await assert.rejects(api('/result'),e=>e.code==='ACCESS_DENIED'&&e.status===403);assert.equal(state.stored,'current-session');assert.equal(invalidations,0);}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a late parsed 401 cannot invalidate a newer login',async()=>{
 const {state,login,api}=await adapter(),previous=globalThis.fetch;let release,started,logins=0;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async url=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:++logins===1?'old-session':'new-session'});return {status:401,ok:false,json:async()=>{started();await wait;return {error:'SESSION_EXPIRED'};}};};
 try{await login();const pending=api('/old-denied');await begun;await login();release();await assert.rejects(pending,e=>e.code==='SESSION_CHANGED'&&e.status===409);assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['logout','unlink'])test('old '+kind+' cannot cancel a newer login already in progress',async()=>{
 const {state,login,logout,unlinkCurrentSession,api}=await adapter(),previous=globalThis.fetch;let releaseOld,releaseLogin,oldStarted,loginStarted,logins=0,seen='';const oldWait=new Promise(r=>{releaseOld=r}),loginWait=new Promise(r=>{releaseLogin=r}),oldBegun=new Promise(r=>{oldStarted=r}),loginBegun=new Promise(r=>{loginStarted=r});globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login')){if(++logins===1)return Response.json({token:'old-session'});loginStarted();await loginWait;return Response.json({token:'new-session'});}if(p.endsWith('/logout')||p.endsWith('/unlink')){oldStarted();await oldWait;return Response.json({remoteUnlink:'completed'});}seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();const old=kind==='logout'?logout():unlinkCurrentSession();await oldBegun;const newer=login();await loginBegun;releaseOld();await assert.rejects(old,e=>e.code==='SESSION_CHANGED');releaseLogin();await newer;await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an old 401 cannot invalidate a newer login already in progress',async()=>{
 const {state,login,canonical,onInvalidated,api}=await adapter(),previous=globalThis.fetch;let releaseOld,releaseLogin,oldStarted,loginStarted,logins=0,seen='',invalidations=0;const oldWait=new Promise(r=>{releaseOld=r}),loginWait=new Promise(r=>{releaseLogin=r}),oldBegun=new Promise(r=>{oldStarted=r}),loginBegun=new Promise(r=>{loginStarted=r});onInvalidated(()=>invalidations++);globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login')){if(++logins===1)return Response.json({token:'old-session'});loginStarted();await loginWait;return Response.json({token:'new-session'});}if(p.endsWith('/canonical/records')){oldStarted();await oldWait;return Response.json({error:'SESSION_EXPIRED'},{status:401});}seen=options.headers.Authorization;return Response.json({ok:true});};
 try{await login();const old=canonical('/canonical/records',new Request('https://miniapp.example/api/records'));await oldBegun;const newer=login();await loginBegun;releaseOld();await assert.rejects(old,e=>e.code==='SESSION_CHANGED');assert.equal(invalidations,0);releaseLogin();await newer;await api('/session');assert.equal(seen,'Bearer new-session');assert.equal(state.stored,'new-session');}finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a second purchase call while the native sheet is open is refused',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(true,true),previous=globalThis.fetch;
 try{await restore();purchase({sku:'first'},'request',()=>{},()=>{});await tick();const first=state.purchaseOptions;assert.throws(()=>purchaseTarot({sku:'second'},'input',()=>{},()=>{}),error=>error.code==='PAYMENT_IN_PROGRESS');assert.equal(state.purchaseOptions,first);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['consultation','tarot'])test(kind+' checkout exit blocks another purchase even after empty recovery',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(true,true),previous=globalThis.fetch;let reported;
 try{await restore();if(kind==='consultation')purchase({sku:'first'},'request',()=>{},e=>{reported=e;});else purchaseTarot({sku:'first'},'input',()=>{},e=>{reported=e;});await tick();state.purchaseOptions.onError({code:'USER_CANCELED'});assert.equal(reported.code,'PAYMENT_STATUS_UNCERTAIN');assert.throws(()=>purchase({sku:'second'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');await restore();assert.throws(()=>purchaseTarot({sku:'second'},'input',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('abandoning an open purchase blocks another even after an empty recovery',async()=>{
 const {state,restore,purchase}=await adapter(true,true),previous=globalThis.fetch;
 try{await restore();const cleanup=purchase({sku:'first'},'request',()=>{},()=>{});await tick();const first=state.purchaseOptions;await assert.rejects(restore(),e=>e.code==='PAYMENT_IN_PROGRESS');cleanup();assert.throws(()=>purchase({sku:'second'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');assert.equal(await first.options.processProductGrant({orderId:'old'}),false);await restore();assert.throws(()=>purchase({sku:'second'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('old cleanup cannot release the lock of a later purchase',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(true,true),previous=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({orderId:'paid',requestId:'request',entitlement:'granted',durable:true});
 try{await restore();const oldCleanup=purchase({sku:'first'},'request',()=>{},()=>{});await tick();assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'paid'}),true);state.purchaseOptions.onEvent({type:'success'});purchaseTarot({sku:'second'},'input',()=>{},()=>{});oldCleanup();assert.throws(()=>purchase({sku:'third'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_IN_PROGRESS');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a purchase completed after switching accounts cannot navigate to the old result',async()=>{
 const {state,restore,purchase,login}=await adapter(),previous=globalThis.fetch;let sessions=0,done=0,error;
 globalThis.fetch=async(url)=>new URL(url).pathname.endsWith('/login')?Response.json({token:'user-'+ ++sessions}):Response.json({orderId:'paid',requestId:'request',entitlement:'granted',durable:true});
 try{await login();await restore();purchase({sku:'first'},'request',()=>done++,e=>{error=e;});await tick();assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'paid'}),true);await login();state.purchaseOptions.onEvent({type:'success'});assert.equal(done,0);assert.equal(error.code,'SESSION_CHANGED');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('synchronous SDK cancellation cleans up once and blocks retry',async()=>{
 const {state,restore,purchase}=await adapter(true,true),previous=globalThis.fetch;let errors=0;
 try{await restore();state.synchronousCancel=true;const oldCleanup=purchase({sku:'first'},'request',()=>{},()=>errors++);await tick();assert.equal(errors,1);assert.equal(state.cleanupCount,1);oldCleanup();assert.equal(state.cleanupCount,1);state.synchronousCancel=false;assert.throws(()=>purchase({sku:'second'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('reentrant payment during media pause cannot open a second native sheet',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(true,true),previous=globalThis.fetch,previousDocument=globalThis.document;let blocked;
 try{await restore();globalThis.document={visibilityState:'visible',querySelectorAll:()=>[{paused:false,pause(){try{purchaseTarot({sku:'second'},'input',()=>{},()=>{});}catch(error){blocked=error.code;}},isConnected:false}]};purchase({sku:'first'},'request',()=>{},()=>{});assert.equal(blocked,'PAYMENT_IN_PROGRESS');await tick();assert.equal(state.purchaseOptions.options.sku,'first');state.purchaseOptions.onError({code:'USER_CANCELED'});}
 finally{globalThis.fetch=previous;globalThis.document=previousDocument;delete globalThis.tossRecoveryTest;}
});

test('a grant response after leaving the screen is not acknowledged early',async()=>{
 const {state,restore,purchase}=await adapter(true,true),previous=globalThis.fetch;let release,started;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});
 globalThis.fetch=async()=>{started();await wait;return Response.json({orderId:'paid',requestId:'request',entitlement:'granted',durable:true});};
 try{await restore();const cleanup=purchase({sku:'first'},'request',()=>assert.fail('late success'),()=>{});await tick();const grant=state.purchaseOptions.options.processProductGrant({orderId:'paid'});await begun;cleanup();release();assert.equal(await grant,false);assert.throws(()=>purchase({sku:'second'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a cancellation after grant started remains uncertain and does not report a clean cancellation',async()=>{
 const {state,restore,purchase}=await adapter(true,true),previous=globalThis.fetch;let release,started,reported;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});
 globalThis.fetch=async()=>{started();await wait;return Response.json({orderId:'paid',requestId:'request',entitlement:'granted',durable:true});};
 try{await restore();purchase({sku:'first'},'request',()=>{},error=>{reported=error;});await tick();const grant=state.purchaseOptions.options.processProductGrant({orderId:'paid'});await begun;state.purchaseOptions.onError({code:'USER_CANCELED'});assert.equal(reported.code,'PAYMENT_STATUS_UNCERTAIN');assert.throws(()=>purchase({sku:'second'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');release();assert.equal(await grant,false);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('synchronous SDK failure blocks another payment even after an empty recovery',async()=>{
 const {state,restore,purchase}=await adapter(true,true),previous=globalThis.fetch;
 try{await restore();state.synchronousThrow=true;let failure;purchase({sku:'first'},'request',()=>{},e=>{failure=e});await tick();assert.equal(failure.code,'NETWORK_ERROR');await restore();state.synchronousThrow=false;assert.throws(()=>purchase({sku:'second'},'request',()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('failed session storage must not leave the failed login active',async()=>{
 const {state,login,api}=await adapter(),previous=globalThis.fetch;state.setError=true;let seen;
 globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:'failed-session'});seen=options.headers.Authorization||null;return Response.json({ok:true});};
 try{await assert.rejects(login(),e=>e.code==='SESSION_STORAGE_FAILED');await api('/session');assert.equal(seen,null);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('failed login storage clears previous stored token and notifies the shell',async()=>{
 const {state,login,onInvalidated}=await adapter(),previous=globalThis.fetch;let notified=0;state.stored='previous';state.setError=true;onInvalidated(()=>notified++);globalThis.fetch=async()=>Response.json({token:'failed-session'});
 try{await assert.rejects(login(),e=>e.code==='SESSION_STORAGE_FAILED');assert.equal(state.stored,null);assert.equal(notified,1);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an old failed storage write cannot invalidate a newer pending login',async()=>{
 const {state,login,api,onInvalidated}=await adapter(),previous=globalThis.fetch;let release,started,logins=0,notified=0,seen;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});state.setWait=wait;state.setStarted=started;state.failSetFor='old';onInvalidated(()=>notified++);
 globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:++logins===1?'old':'new'});seen=options.headers.Authorization;return Response.json({ok:true});};
 try{const old=login();await begun;const newer=login();release();await assert.rejects(old,e=>e.code==='SESSION_CHANGED');await newer;await api('/session');assert.equal(seen,'Bearer new');assert.equal(state.stored,'new');assert.equal(notified,0);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('failed storage removal still clears the in-memory token and notifies the shell',async()=>{
 const {state,login,api,onInvalidated}=await adapter(),previous=globalThis.fetch;let notified=0,seen;state.stored='previous';state.setError=true;state.removeError=true;onInvalidated(()=>notified++);
 globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:'failed-session'});seen=options.headers.Authorization||null;return Response.json({ok:true});};
 try{await assert.rejects(login(),e=>e.code==='SESSION_STORAGE_FAILED');await api('/session');assert.equal(seen,null);assert.equal(notified,1);assert.equal(state.stored,'previous');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('the shell is invalidated before delayed storage cleanup completes',async()=>{
 const {state,login,onInvalidated}=await adapter(),previous=globalThis.fetch;let release,started,notified=0;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});state.setError=true;state.removeWait=wait;state.removeStarted=started;onInvalidated(()=>notified++);globalThis.fetch=async()=>Response.json({token:'failed-session'});
 try{const pending=login();await begun;assert.equal(notified,1);release();await assert.rejects(pending,e=>e.code==='SESSION_STORAGE_FAILED');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('storage permission denial keeps its status and code while discarding the session',async()=>{
 const {state,login,api}=await adapter(),previous=globalThis.fetch;let seen;state.storageFailure={status:403,code:'STORAGE_DENIED'};globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/login'))return Response.json({token:'failed-session'});seen=options.headers.Authorization||null;return Response.json({ok:true});};
 try{await assert.rejects(login(),e=>e.status===403&&e.code==='STORAGE_DENIED');await api('/session');assert.equal(seen,null);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('current 401 clears the UI even when stored-token removal fails',async()=>{
 const {state,login,api,onInvalidated}=await adapter(),previous=globalThis.fetch;let notified=0,seen;onInvalidated(()=>notified++);globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;if(p.endsWith('/login'))return Response.json({token:'active'});if(p.endsWith('/expired'))return Response.json({error:'SESSION_EXPIRED'},{status:401});seen=options.headers.Authorization||null;return Response.json({ok:true});};
 try{await login();state.removeError=true;await assert.rejects(api('/expired'),e=>e.status===401&&e.code==='SESSION_EXPIRED');await api('/session');assert.equal(seen,null);assert.equal(notified,1);assert.equal(state.stored,'active');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a 403 while removing an expired token stays an explicit permission error',async()=>{
 const {state,login,api,onInvalidated}=await adapter(),previous=globalThis.fetch;let notified=0;onInvalidated(()=>notified++);globalThis.fetch=async(url)=>new URL(url).pathname.endsWith('/login')?Response.json({token:'active'}):Response.json({error:'SESSION_EXPIRED'},{status:401});
 try{await login();state.removeFailure={status:403,code:'STORAGE_DENIED'};await assert.rejects(api('/expired'),e=>e.status===403&&e.code==='STORAGE_DENIED');assert.equal(notified,1);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('permission denial during cleanup of a failed login remains explicit',async()=>{
 const {state,login}=await adapter(),previous=globalThis.fetch;state.setError=true;state.removeFailure={status:403,code:'STORAGE_DENIED'};globalThis.fetch=async()=>Response.json({token:'failed'});
 try{await assert.rejects(login(),e=>e.status===403&&e.code==='STORAGE_DENIED');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a 401 during cleanup retains its specific authentication code',async()=>{
 const {state,login,api}=await adapter(),previous=globalThis.fetch;globalThis.fetch=async(url)=>new URL(url).pathname.endsWith('/login')?Response.json({token:'active'}):Response.json({error:'SESSION_EXPIRED'},{status:401});
 try{await login();state.removeFailure={status:401,code:'STORAGE_AUTH_REQUIRED'};await assert.rejects(api('/expired'),e=>e.status===401&&e.code==='STORAGE_AUTH_REQUIRED');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('an SDK storage error retains its original code',async()=>{
 const {state,login}=await adapter(),previous=globalThis.fetch;state.storageFailure={code:'UNSUPPORTED_APP_VERSION'};globalThis.fetch=async()=>Response.json({token:'failed'});
 try{await assert.rejects(login(),e=>e.code==='UNSUPPORTED_APP_VERSION');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('recovery acknowledgement finishing after account switch cannot update the new session',async()=>{
 const {state,login,restore}=await adapter(),previous=globalThis.fetch;let release,started,logins=0;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});state.orders=[{orderId:'saved',sku:'mock'}];state.ackWait=wait;state.ackStarted=started;globalThis.fetch=async(url)=>new URL(url).pathname.endsWith('/login')?Response.json({token:++logins===1?'old':'new'}):Response.json({orderId:'saved',entitlement:'granted',durable:true});
 try{await login();const pending=restore();await begun;await login();release();await assert.rejects(pending,e=>e.code==='SESSION_CHANGED');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('re-login requires a fresh recovery even when a token value repeats',async()=>{
 const {state,login,restore,purchase}=await adapter(),previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({token:'same-token'});
 try{await login();await restore();await login();assert.throws(()=>purchase({sku:'mock'},'request',()=>{},()=>{}),e=>e.code==='RECOVERY_REQUIRED');assert.equal(state.purchaseOptions,undefined);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a guest must never open the native purchase sheet',async()=>{
 const {state,restore,purchase,purchaseTarot}=await adapter(),previous=globalThis.fetch;
 try{await assert.rejects(restore(),e=>e.code==='LOGIN_REQUIRED');assert.equal(state.pendingCalls,undefined);assert.throws(()=>purchase({sku:'mock'},'request',()=>{},()=>{}),e=>e.code==='LOGIN_REQUIRED');assert.throws(()=>purchaseTarot({sku:'mock'},'input',()=>{},()=>{}),e=>e.code==='LOGIN_REQUIRED');assert.equal(state.purchaseOptions,undefined);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('a repeated token does not reuse an earlier session recovery',async()=>{
 const {state,login,restore}=await adapter(),previous=globalThis.fetch;let release,started;const wait=new Promise(r=>{release=r}),begun=new Promise(r=>{started=r});globalThis.fetch=async()=>Response.json({token:'same-token'});
 try{await login();state.pendingWait=wait;state.pendingStarted=started;const old=restore();await begun;await login();const newer=restore();assert.notEqual(old,newer);release();await assert.rejects(old,e=>e.code==='SESSION_CHANGED');assert.deepEqual(await newer,{recovered:0,failed:0,denied:0});assert.equal(state.pendingCalls,2);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('unsupported product-list SDK is rejected before catalog or SDK calls',async()=>{
 const {state,saleProducts,nativeSaleProducts,tarotLibraryProducts}=await adapter(),previous=globalThis.fetch;state.supportProductList=false;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected catalog call');};
 try{for(const read of [saleProducts,nativeSaleProducts,tarotLibraryProducts])await assert.rejects(read(),e=>e.code==='IAP_NOT_SUPPORTED');assert.equal(state.productListCalls,undefined);assert.equal(calls,0);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('product-list SDK version error retains its original update guidance',async()=>{
 const {state,saleProducts}=await adapter(),previous=globalThis.fetch;state.productListError={code:'UNSUPPORTED_APP_VERSION',message:'토스 앱을 최신 버전으로 업데이트해 주세요.'};globalThis.fetch=async()=>Response.json({products:[]});
 try{await assert.rejects(saleProducts(),e=>e.code==='UNSUPPORTED_APP_VERSION'&&e.message==='토스 앱을 최신 버전으로 업데이트해 주세요.');}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('product-list support probe failures do not open the catalog',async()=>{
 const {state,saleProducts}=await adapter(),previous=globalThis.fetch;state.productSupportThrows=true;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected catalog call');};
 try{await assert.rejects(saleProducts(),e=>e.code==='IAP_NOT_SUPPORTED');assert.equal(state.productListCalls,undefined);assert.equal(calls,0);}
 finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['rawPurchase','rawTarot'])for(const status of [401,403,200])test(kind+' blocks purchase when session verification fails '+status,async()=>{
 const a=await adapter(true,true),{state}=a,previous=globalThis.fetch;let error;await a.restore();
 globalThis.fetch=async url=>{assert.match(new URL(url).pathname,/\/session$/);return status===200?Response.json({authenticated:false}):Response.json({error:status===401?'SESSION_EXPIRED':'ACCESS_DENIED'},{status});};
 try{
  await new Promise((resolve,reject)=>a[kind]({sku:'mock'},kind==='rawPurchase'?'request':{},()=>reject(Error('unexpected purchase')),failure=>{error=failure;resolve();}));
  assert.equal(error.code,status===401?'SESSION_EXPIRED':status===403?'ACCESS_DENIED':'SESSION_CHECK_FAILED');
  assert.equal(state.purchaseOptions,undefined);
  if(status===401)assert.equal(state.stored,null);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('leaving during session verification never opens a sheet or blocks a later retry',async()=>{
 const a=await adapter(true,true),{state}=a,previous=globalThis.fetch;let release,callback=false;await a.restore();
 globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});
 try{
  const cleanup=a.rawPurchase({sku:'mock'},'request',()=>{callback=true},()=>{callback=true});cleanup();release(Response.json({authenticated:true}));await tick();
  assert.equal(callback,false);assert.equal(state.purchaseOptions,undefined);
  globalThis.fetch=async()=>Response.json({authenticated:true});a.rawPurchase({sku:'mock'},'request',()=>{},()=>{});await tick();
  assert.equal(state.purchaseOptions.options.sku,'mock');state.purchaseOptions.onError({code:'USER_CANCELED'});
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

test('network failure before opening the sheet permits a later verified retry',async()=>{
 const a=await adapter(true,true),{state}=a,previous=globalThis.fetch;await a.restore();
 const failure=new TypeError('network offline');globalThis.fetch=async()=>{throw failure;};
 try{
  const observed=await new Promise((resolve,reject)=>a.rawPurchase({sku:'mock'},'request',()=>reject(Error('unexpected purchase')),resolve));
  assert.equal(observed,failure);assert.equal(state.purchaseOptions,undefined);
  globalThis.fetch=async()=>Response.json({authenticated:true});a.rawPurchase({sku:'mock'},'request',()=>{},()=>{});await tick();
  assert.equal(state.purchaseOptions.options.sku,'mock');state.purchaseOptions.onError({code:'USER_CANCELED'});
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const authenticated of [true,false])test('an in-flight login prevents the previous account from opening a purchase sheet '+authenticated,async()=>{
 const a=await adapter(true,true),{state}=a,previous=globalThis.fetch;await a.restore();let finishSession,finishLogin,loginStarted;
 const loginBegun=new Promise(resolve=>{loginStarted=resolve;});
 globalThis.fetch=url=>new URL(url).pathname.endsWith('/login')?new Promise(resolve=>{finishLogin=resolve;loginStarted();}):new Promise(resolve=>{finishSession=resolve;});
 try{
  const attempt=new Promise((resolve,reject)=>a.rawPurchase({sku:'mock'},'request',()=>reject(Error('unexpected purchase')),resolve));
  const login=a.login();await loginBegun;finishSession(Response.json({authenticated}));const error=await attempt;
  assert.equal(error.code,'SESSION_CHANGED');assert.equal(state.purchaseOptions,undefined);finishLogin(Response.json({token:'new-session'}));await login;
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['rawPurchase','rawTarot'])test(kind+' does not acknowledge or navigate while a newer login is pending',async()=>{
 const a=await adapter(true,true),{state}=a,previous=globalThis.fetch;await a.restore();let releaseGrant,grantStarted,releaseLogin,loginStarted,done=0,reported;
 const grantBegun=new Promise(resolve=>{grantStarted=resolve}),loginBegun=new Promise(resolve=>{loginStarted=resolve;});
 globalThis.fetch=url=>{const path=new URL(url).pathname;if(path.endsWith('/session'))return Promise.resolve(Response.json({authenticated:true}));if(path.endsWith('/login'))return new Promise(resolve=>{releaseLogin=resolve;loginStarted();});return new Promise(resolve=>{releaseGrant=resolve;grantStarted();});};
 try{
  a[kind]({sku:'mock'},kind==='rawPurchase'?'request':{},()=>{done++},error=>{reported=error});await tick();
  const grant=state.purchaseOptions.options.processProductGrant({orderId:'paid'});await grantBegun;const login=a.login();await loginBegun;
  releaseGrant(Response.json({orderId:'paid',requestId:'request',entitlement:'granted',durable:true}));assert.equal(await grant,false);
  state.purchaseOptions.onError({code:'PRODUCT_NOT_GRANTED_BY_PARTNER'});assert.equal(done,0);assert.equal(reported.code,'SESSION_CHANGED');
  releaseLogin(Response.json({token:'new-session'}));await login;
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});

for(const kind of ['rawPurchase','rawTarot'])test(kind+' ignores SDK success if a newer login starts after the grant',async()=>{
 const a=await adapter(true,true),{state}=a,previous=globalThis.fetch;await a.restore();let releaseLogin,loginStarted,done=0,reported;
 const loginBegun=new Promise(resolve=>{loginStarted=resolve;});
 globalThis.fetch=url=>{const path=new URL(url).pathname;if(path.endsWith('/session'))return Promise.resolve(Response.json({authenticated:true}));if(path.endsWith('/login'))return new Promise(resolve=>{releaseLogin=resolve;loginStarted();});return Promise.resolve(Response.json({orderId:'paid',requestId:'request',entitlement:'granted',durable:true}));};
 try{
  a[kind]({sku:'mock'},kind==='rawPurchase'?'request':{},()=>{done++},error=>{reported=error});await tick();
  assert.equal(await state.purchaseOptions.options.processProductGrant({orderId:'paid'}),true);
  const login=a.login();await loginBegun;state.purchaseOptions.onEvent({type:'success'});
  assert.equal(done,0);assert.equal(reported.code,'SESSION_CHANGED');releaseLogin(Response.json({token:'new-session'}));await login;
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});


test('session verification blocks a concurrent purchase before the SDK opens',async()=>{
 const a=await adapter(true,true),{state}=a,previous=globalThis.fetch;await a.restore();let release;
 globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});
 try{
  const cleanup=a.rawPurchase({sku:'first'},'request',()=>{},()=>{});
  assert.throws(()=>a.rawTarot({sku:'second'},{},()=>{},()=>{}),e=>e.code==='PAYMENT_IN_PROGRESS');
  assert.equal(state.purchaseOptions,undefined);cleanup();release(Response.json({authenticated:true}));await tick();
  assert.equal(state.purchaseOptions,undefined);
 }finally{globalThis.fetch=previous;delete globalThis.tossRecoveryTest;}
});
