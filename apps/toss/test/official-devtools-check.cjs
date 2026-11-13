const {createRequire,Module}=require('node:module'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname, '../../..');
require(repo+'/scripts/lib/mock-network-guard.cjs');
const appRequire=createRequire(repo+'/apps/toss/package.json'),{build}=appRequire('esbuild'),{JSDOM}=appRequire('jsdom');
const dom=new JSDOM('',{url:'http://localhost/'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.localStorage=dom.window.localStorage;globalThis.navigator=dom.window.navigator;globalThis.CustomEvent=dom.window.CustomEvent;
const mock=appRequire.resolve('@apps-in-toss/devtools/mock/3x').replaceAll('\\','/');
(async()=>{
 const code=`export * from ${JSON.stringify(repo+'/apps/toss/src/platform.ts')}; export {IAP,aitState} from ${JSON.stringify(mock)};`;
 const bundle=await build({stdin:{contents:code,resolveDir:repo,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline-boundaries',setup(b){b.onResolve({filter:/^@apps-in-toss\/web-framework$/},()=>({path:mock}));b.onResolve({filter:/^\.\/release$/},()=>({path:'release',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const SERVICE_AVAILABLE=true;export const NEW_PURCHASES_AVAILABLE=true;'}));}}]});
 const loaded=new Module(path.join(repo,'toss-official-devtools-mock.cjs'));loaded.paths=Module._nodeModulePaths(repo+'/apps/toss');loaded._compile(bundle.outputFiles[0].text,loaded.id);const app=loaded.exports;
 const {createOfflineFixtureApi}=await import('./offline/fixture.mjs');
 const {reviewSdkProducts,offlineCatalog}=await import('./offline/review-fixture.mjs');
 const fixture=()=>createOfflineFixtureApi(dom.window.localStorage);
 let backend=fixture(), dropReceipt=false;
 globalThis.fetch=async(url,options)=>{
   const request=new Request(url,options), endpoint=new URL(request.url);
   assert.equal(endpoint.origin,'https://code-destiny.com');
   assert.ok(endpoint.pathname.startsWith('/api/toss/'));
   const response=await backend.handle(request);
   if(dropReceipt&&response.ok&&endpoint.pathname.endsWith('/orders/grant')){
     dropReceipt=false;
     return Response.json({error:'MOCK_RECEIPT_LOST'},{status:503});
   }
   return response;
 };
 app.aitState.patch('iap',{products:reviewSdkProducts,nextResult:'success',pendingOrders:[],completedOrders:[]});
 await app.login();
 assert.deepEqual(await app.restorePurchases(),{recovered:0,failed:0,denied:0});
 const products=await app.saleProducts();
 const studioSkus=new Set(offlineCatalog.map(product=>product.sku));
 assert.deepEqual(products.map(p=>[p.sku,p.displayAmount]),reviewSdkProducts.filter(p=>studioSkus.has(p.sku)).map(p=>[p.sku,p.displayAmount]));
 const rooms=await app.nativeSaleProducts();
 assert.ok(rooms.some(p=>p.sku==='mock-unregistered-room-tea'&&p.displayAmount==='1원'));
 const createLetter=async()=>{
   const reply=await app.api('/canonical/fortune-chat/consultations',{question:'오프라인 테스트 질문',persona:'yeoni'});
   return reply.consultation.id;
 };
 const letter=products.find(p=>p.id==='yeoni:chat_saju');
 const firstId=await createLetter();
 await new Promise((resolve,reject)=>app.purchase(letter,firstId,resolve,reject));
 assert.equal(backend.state.orders.size,1);
 assert.match(app.aitState.state.iap.completedOrders[0].orderId,/^mock-order-/);

 const interruptedId=await createLetter();
 dropReceipt=true;
 const pending=new Promise(resolve=>{
   const off=app.aitState.subscribe(()=>{if(app.aitState.state.iap.pendingOrders.length){off();resolve();}});
 });
 await new Promise((resolve,reject)=>app.purchase(letter,interruptedId,()=>reject(Error('unexpected success')),resolve));
 await pending;
 backend=fixture();
 assert.deepEqual(await app.restorePurchases(),{recovered:1,failed:0,denied:0});
 assert.deepEqual(await app.restorePurchases(),{recovered:0,failed:0,denied:0});
 const library=await app.api('/library');
 assert.deepEqual(library.purchases.map(row=>row.requestId),[firstId,interruptedId]);
 assert.equal(backend.state.orders.size,2);
 assert.throws(()=>app.purchase(letter,interruptedId,()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');
 const unlinkedOrder={orderId:'mock-order-without-local-grant',sku:letter.sku};
 app.aitState.patch('iap',{pendingOrders:[unlinkedOrder]});
 assert.deepEqual(await app.restorePurchases(),{recovered:0,failed:0,denied:1});
 assert.equal(app.aitState.state.iap.pendingOrders[0].orderId,unlinkedOrder.orderId);
 assert.equal(backend.state.orders.size,2);

 const cancelModule=new Module(path.join(repo,'toss-official-cancel-mock.cjs'));
 cancelModule.paths=loaded.paths;cancelModule._compile(bundle.outputFiles[0].text,cancelModule.id);
 const cancelApp=cancelModule.exports;
 cancelApp.aitState.patch('iap',{products:reviewSdkProducts,nextResult:'USER_CANCELED',pendingOrders:[],completedOrders:[]});
 await cancelApp.login();await cancelApp.restorePurchases();
 const canceledId=await createLetter();
 await new Promise((resolve,reject)=>cancelApp.purchase(letter,canceledId,()=>reject(Error('unexpected success')),error=>{
   try{assert.equal(error.code,'PAYMENT_STATUS_UNCERTAIN');resolve();}catch(e){reject(e);}
 }));
 assert.equal(backend.state.orders.size,2);
 assert.equal(backend.state.letters.get(canceledId).paid,false);
 assert.throws(()=>cancelApp.purchase(letter,canceledId,()=>{},()=>{}),e=>e.code==='PAYMENT_STATUS_UNCERTAIN');
 console.log('Official devtools 3.9 mock: five review prices, letter purchase, canceled checkout, lost receipt and idempotent restoration PASS.');
})().catch(e=>{console.error(e);process.exitCode=1});
