// Run the actual React checkout, shared billing runtime and paid-resume hook.
// Only SDK/HTTP transport and persisted backend state are fixtures. No PG/DB/LLM access.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium,webkit,devices} from '@playwright/test';
export const QA_API_ORIGIN='https://yeongnyangi-qa.example.invalid';

const user={id:'507f1f77bcf86cd799439011',_id:'507f1f77bcf86cd799439011',name:'QA 고객',email:'qa@example.invalid',phoneNumber:'01012345678',role:'user'};
const config={configured:true,serverVerificationConfigured:true,inicisConfigured:true,kakaopayConfigured:true,pg:'kg-inicis',storeId:'fixture-existing-store',channelKey:'fixture-existing-inicis',kakaopayChannelKey:'fixture-existing-kakaopay',currency:'CURRENCY_KRW',payMethod:'CARD'};
const resultPath=id=>`/yeongnyangi/result/?id=${id}`;
const checkoutPath=row=>`/checkout/?featureKey=${row.product.cdFeatureKey}&requestId=${row.id}&returnTo=${encodeURIComponent(resultPath(row.id))}`;

export async function fixtures(browser,base,product,width=390){
 const mobile=devices[browser.browserType().name()==='webkit'?'iPhone 13':'Pixel 7'];
 const context=await browser.newContext({viewport:{width,height:844},screen:{width,height:844},isMobile:true,hasTouch:true,userAgent:mobile.userAgent,serviceWorkers:'block'});
 context.setDefaultTimeout(30000);context.setDefaultNavigationTimeout(120000);
 await context.addCookies([{name:'fortune_auth_role',value:'user',url:base}]);
 const row={id:'a'.repeat(64),productId:product.id,profileId:'shared-profile',product,state:'CREATED',paid:false,chapters:[],manifest:Array.from({length:product.chapterCount},(_,i)=>({id:`chapter-${i}`,title:`QA 상담 ${i+1}`})),createdAt:new Date().toISOString()};
 const state={row,orders:new Map(),sdk:[],confirm:0,activates:0,generates:0,resumeReads:0,unknown:[],errors:[],approved:false,pending:false,auth:true,read503:0,activate503:0,generate503:0,holdGeneration:false,generationBoundary:0,sdkMode:'redirect',handlerDelay:0,assetDelays:0};
 state.profiles=[{profileId:'shared-profile',name:'QA 고객',birth:{year:1990,month:6,day:15,hour:14,minute:30},location:{label:'대한민국 부산'}}];state.profileCreates=0;state.creates=0;
 state.resources=[];state.blocked=[];state.http=[];state.apiInFlight=new Map();state.visited=[];
 context.on('request',request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/')&&path!=='/api/billing/funnel-event')state.apiInFlight.set(request,request.frame().page());});
 const finishRequest=request=>state.apiInFlight.delete(request);
 context.on('requestfinished',finishRequest);context.on('requestfailed',finishRequest);
 context.on('response',response=>{const url=new URL(response.url());if(url.pathname.startsWith('/_next/'))state.resources.push({path:url.pathname,status:response.status()});});
 context.on('requestfailed',request=>{const url=new URL(request.url());state.resources.push({path:url.pathname,status:null,failure:request.failure()?.errorText});});
 const page=await context.newPage();
 const attachPage=p=>{
  p.on('pageerror',e=>state.errors.push(e.message));
  p.on('framenavigated',frame=>{if(frame!==p.mainFrame())return;state.visited.push(new URL(frame.url()).pathname);for(const [request,owner] of state.apiInFlight)if(owner===p)state.apiInFlight.delete(request);});
 };
 context.on('page',attachPage);attachPage(page);
 await context.exposeBinding('__fixturePortOne',async(_source,input)=>{
  const duplicate=state.sdk.some(previous=>previous.paymentId===input.paymentId);
  state.sdk.push(input);
  if(duplicate&&state.duplicateAttempt)return {code:'PAYMENT_ALREADY_EXISTS',message:'QA 동일 PG 주문'};
  if(state.sdkMode==='cancel')return {code:'PAYMENT_CANCELLED',message:'QA 취소'};
  if(state.sdkMode==='failure')return {code:'FAILURE_TYPE_PG_PROVIDER',message:'QA PG 실패'};
  if(state.sdkMode==='inline'){state.approved=true;return {paymentId:input.paymentId};}
  return null;
 });
 await context.addInitScript(()=>{
  if(new URLSearchParams(location.search).has('qaNoStorage')){localStorage.clear();sessionStorage.clear();}
  if(new URLSearchParams(location.search).has('qaDelayIdle')){
   window.requestIdleCallback=callback=>setTimeout(callback,60000);
   window.cancelIdleCallback=handle=>clearTimeout(handle);
  }
  window.PortOne={requestPayment:async input=>{
   window.__fixtureSdkCalled=true;
   const response=await window.__fixturePortOne(input);
   return response||new Promise(()=>{}); // Redirect destroys this promise just as on mobile.
  }};
 });
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  const send=(body,status=200,headers={})=>{state.http.push({path,method:request.method(),status,paid:body?.fortune?.paid,read503:state.read503,activate503:state.activate503});return route.fulfill({status,json:body,headers:{'Access-Control-Allow-Origin':base,'Access-Control-Allow-Credentials':'true','Cache-Control':'no-store','Pragma':'no-cache',...headers}});};
  // Test fails closed on every unrecognised API; external hosts never reach a transport.
  if(url.origin!==base&&!(url.origin===QA_API_ORIGIN&&path.startsWith('/api/'))){state.blocked.push(url.hostname+url.pathname);return route.fulfill({status:403,body:'QA_EXTERNAL_NETWORK_BLOCKED'});}
  if(!path.startsWith('/api/')){
   if(state.handlerDelay&&path.includes('chunks/app/checkout/page')){state.assetDelays++;await new Promise(r=>setTimeout(r,state.handlerDelay));}
   return route.continue();
  }
  const input=request.method()==='POST'?request.postDataJSON()||{}:{};
  if(path==='/api/auth/me')return send(state.auth?{ok:true,authenticated:true,user}:{ok:false,authenticated:false,code:'UNAUTHORIZED'},state.auth?200:401);
  if(path==='/api/auth/refresh')return send({ok:false,code:'UNAUTHORIZED'},401);
  if(path==='/api/auth/login'){state.auth=true;return send({ok:true,authenticated:true,user},200,{'Set-Cookie':'fortune_auth_role=user; Path=/; SameSite=Lax; Max-Age=3600'});}
  if(!state.auth&&path!=='/api/yeongnyangi/products')return send({ok:false,code:'UNAUTHORIZED',message:'QA 세션 만료'},401);
  if(path==='/api/payments/config')return send(config);
  if(path==='/api/me/payment-phone')return send({ok:true,hasPhone:true,phoneNumber:user.phoneNumber,phoneConsent:true});
  if(path==='/api/geocode')return send({lat:35.1796,lng:129.0756,name:'대한민국 부산',timezone:'Asia/Seoul',fallback:false});
  if(path==='/api/profile')return send({ok:true,profiles:state.profiles,currentId:state.profiles[0]?.profileId});
  if(path==='/api/yeongnyangi/profiles'){
   if(request.method()==='POST'){state.profileCreates++;state.profiles.push(input.profile);return send({ok:true,profile:input.profile});}
   return send({ok:true,profiles:state.profiles,currentId:state.profiles[0]?.profileId});
  }
  if(path==='/api/yeongnyangi/products')return send({ok:true,products:state.products.map(p=>({...p,available:true}))});
  if(path==='/api/yeongnyangi/attendance')return send({ok:true,day:'2026-09-16',balance:0,attended:false,unlocked:false});
  if(path==='/api/me/access-state')return send({ok:true,authenticated:true,pass:{active:false},subscription:{tier:'free',status:'inactive'},monthly:{balance:0},unlockedFeatures:[]});
  if(path==='/api/billing/balance')return send({ok:true,data:{monthlyBalance:0,balance:0,subscription:{tier:'free',status:'inactive'}}});
  if(path==='/api/fortune/pig-coin/profile-subscription/status')return send({ok:true,authenticated:true,subscription:{tier:'free',status:'inactive'}});
  if(path==='/api/payments/report-failure')return send({ok:true});
  if(path==='/api/billing/funnel-event')return send({ok:true});
  if(path==='/api/billing/unlock-status')return send({ok:true,unlocked:false,data:{unlocked:false}});
  if(path==='/api/billing/checkout'){
   assert.equal(input.featureKey,product.cdFeatureKey);assert.equal(input.requestId,`yn-${row.id}`);
   assert.equal(input.refundConsent,true,'Direct payment must record the current refund consent');
   assert.equal(input.paidResume.resume.kind,'yeongnyangi-checkout');
   assert.equal(input.paidResume.resume.args.returnTo,resultPath(row.id));
   const id=`fixture-pg-${row.id.slice(0,8)}`;
   if(!state.orders.has(id))state.orders.set(id,{merchantUid:id,requestId:input.requestId,featureKey:input.featureKey,paidResume:input.paidResume,paymentMethod:input.paymentMethod});
   return send({ok:true,data:{order:{merchantUid:id,orderName:'영냥이 QA 상담',amountKRW:product.priceKRW,paymentAmount:product.priceKRW,customer:{...user,customerId:user.id,fullName:user.name},...config},...config}});
  }
  const orderMatch=path.match(/^\/api\/payments\/orders\/([^/]+)(\/resume)?$/);
  if(orderMatch){
   const order=state.orders.get(orderMatch[1]);
   if(!order)return send({ok:false,code:'NOT_FOUND'},404);
   if(orderMatch[2]){
    state.resumeReads++;
    return send({ok:true,context:{...order.paidResume,at:Date.now(),merchantUid:order.merchantUid,paymentMethod:order.paymentMethod,confirmBody:{merchantUid:order.merchantUid,requestId:order.requestId,featureKey:order.featureKey}}});
   }
   return send({ok:true,order:{...order,status:state.approved?'paid':'pending'},status:state.approved?'paid':'pending'});
  }
  if(path==='/api/billing/confirm'){
   state.confirm++;
   const order=state.orders.get(input.merchantUid||input.paymentId);
   if(!order||!state.approved)return send({ok:false,code:state.duplicateAttempt?'PG_VERIFICATION_UNAVAILABLE':'PAYMENT_NOT_PAID'},state.duplicateAttempt?503:402);
   if(state.pending)return send({ok:true,code:'GRANT_PENDING',recoveryRequired:true,message:'QA 승인 확인 중'},202);
   return send({ok:true,data:{featureKey:product.cdFeatureKey,payment:{status:'paid',merchantUid:order.merchantUid},consume:{ok:true,transactionId:order.merchantUid,requestId:order.requestId,featureKey:product.cdFeatureKey},accessGrant:{ok:true,featureKey:product.cdFeatureKey,evidenceId:order.merchantUid}}});
  }
  if(path===`/api/yeongnyangi/requests/${row.id}`){
   if(state.read503-->0)return send({code:'DATABASE_UNAVAILABLE',message:'QA 조회 실패'},503);
   return send({ok:true,fortune:row});
  }
  if(path==='/api/yeongnyangi/requests'){
   if(request.method()==='POST'){state.creates++;state.requestInput=input;assert.equal(input.productId,product.id);row.profileId=input.profileId;row.consultation=state.prepareConsultation?.(input,row);return send({ok:true,fortune:row},201);}
   return send({ok:true,fortunes:[row],nextCursor:null});
  }
  if(/^\/api\/yeongnyangi\/requests\/[a-f0-9]{64}$/.test(path))return send({ok:false,code:'FORTUNE_NOT_FOUND',message:'QA 다른 소유자 또는 없는 상담'},404);
  if(path===`/api/yeongnyangi/requests/${row.id}/activate`){
   state.activates++;
   if(state.activate503-->0)return send({code:'DATABASE_UNAVAILABLE',message:'QA 활성화 실패'},503);
   if(!state.approved||state.pending)return send({code:'PAYMENT_REQUIRED',message:'QA 결제 확인 중'},402);
   row.paid=true;row.state='PAID';return send({ok:true,fortune:row});
  }
  if(path===`/api/yeongnyangi/requests/${row.id}/generate`){
   if(row.state==='REFUNDED')return send({code:'PAYMENT_NOT_ACTIVE'},409);
   assert.equal(row.paid,true);
   if(row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'){row.errorCode='';row.state='PAID';}
   return send({ok:true,fortune:row},202);
  }
  state.unknown.push(`${request.method()} ${path}`);
  return send({ok:false,code:'QA_UNEXPECTED_API'},501);
 });
 state.products=[product];
 // A fixture server worker advances independently from browser HTTP requests.
 // The real queue/repository completion and retry rules are covered in worker tests.
 const worker=setInterval(()=>{
  if(!row.paid||['COMPLETED','REFUNDED'].includes(row.state)||row.errorCode==='AUTOMATIC_RECOVERY_STOPPED')return;
  if(state.generate503>0&&row.chapters.length>=state.generationBoundary){state.generate503--;row.state='FORTUNE_FAILED';row.errorCode='AUTOMATIC_RECOVERY_STOPPED';return;}
  if(state.holdGeneration&&row.chapters.length>=state.generationBoundary){row.state='GENERATING';return;}
  state.generates++;
  row.chapters.push({summary:`QA 챕터 ${row.chapters.length+1}`,analysis:['QA fixture 본문'],example:'QA 사례',advice:'QA 조언',persona:'QA 메시지',questionAnswers:row.chapters.length===0?row.consultation?.questions?.map(q=>({questionId:q.id,answer:'선택의 기준을 먼저 정리해 보는 편이 좋아요.',reason:'오행의 분포와 월령에 따른 균형을 살펴봐요.',timing:'2026년 9~12월은 실천과 점검 기간이며 사건 예측은 아니에요.',action:'가능한 선택지를 적고 작게 시도해 보세요.'})):undefined});
  row.state=row.chapters.length===row.manifest.length?'COMPLETED':'PAID';
 },100);
 context.on('close',()=>clearInterval(worker));
 return {context,page,state,row};
}

async function openCheckout(f,base,method='CARD'){
 await f.page.goto(f.checkoutUrl||base+checkoutPath(f.row),{waitUntil:'domcontentloaded'});
 await f.page.getByRole('button',{name:/단건 결제하기/}).waitFor();
 const pay=f.page.getByRole('button',{name:/단건 결제하기/});
 if(f.state.doubleClicks){await pay.click({trial:true});await pay.evaluate(b=>{b.click();b.click();b.click();});}else await pay.click();
 // The real payment choice UI must open; never call its runner from a test.
 const consent=f.page.locator('[data-refund-consent-input]'),direct=f.page.locator('[data-mode="direct"]');
 await consent.check();assert.equal(await direct.isEnabled(),true,'Refund consent must unlock direct payment');await direct.click();
 const tile=f.page.locator(`[data-pay-method="${method}"]`);
 if(f.state.doubleClicks){await tile.click({trial:true});await tile.evaluate(b=>{b.click();b.click();b.click();});}else await tile.click();
 await f.page.waitForFunction(()=>!!window.__fixtureSdkCalled);
 const sdk=f.state.sdk.at(-1);
 assert.equal(sdk.storeId,config.storeId);
 assert.equal(sdk.channelKey,method==='KAKAOPAY'?config.kakaopayChannelKey:config.channelKey);
 assert.equal(sdk.payMethod,method==='KAKAOPAY'?'EASY_PAY':'CARD');
 assert.equal(sdk.totalAmount,f.row.product.priceKRW);
 const redirect=new URL(sdk.redirectUrl);
 assert.equal(redirect.origin,base);assert.equal(redirect.pathname,'/checkout/');
 assert.equal(redirect.searchParams.get('requestId'),f.row.id);
 assert.equal(redirect.searchParams.get('featureKey'),f.row.product.cdFeatureKey);
 return sdk;
}

async function redirectBack(f,{noStorage=false,approved=true,code='',paymentId}={}){
 // SDK invocation already proves that the real checkout is ready. Await the
 // document load without waiting for background media or pending-order polling.
 await f.page.waitForLoadState('load');
 await settleApiFixture(f);
 const input=f.state.sdk.at(-1);f.state.approved=approved;
 const redirect=new URL(input.redirectUrl);redirect.searchParams.set('paymentId',paymentId||input.paymentId);
 if(noStorage){redirect.searchParams.set('qaNoStorage','1');await f.page.close();f.page=await f.context.newPage();}
 if(code)redirect.searchParams.set('code',code);
 if(f.state.delayIdle)redirect.searchParams.set('qaDelayIdle','1');
 await f.page.goto(redirect.href,{waitUntil:'domcontentloaded'});
 return redirect.href;
}

async function settleApiFixture(f){
 // Complete the in-process HTTP fixture before the harness destroys its page.
 // Background media and lifecycle telemetry beacons are excluded; the real
 // payment polling/retry timers remain intact. Chromium may retain beacon requests.
 try{await waitFixture(()=>![...f.state.apiInFlight.values()].includes(f.page));}
 catch(error){error.message+=': '+[...f.state.apiInFlight.keys()].map(r=>`${r.method()} ${new URL(r.url()).pathname}`).join(', ');throw error;}
}

async function waitResult(f){
 await f.page.waitForURL('**/yeongnyangi/result/**',{waitUntil:'domcontentloaded',timeout:15000});
 assert.equal(new URL(f.page.url()).searchParams.get('id'),f.row.id);
 await f.page.getByRole('heading',{name:`${f.row.product.name} · ${f.row.product.fishName}`,exact:true}).waitFor();
 const reaction=f.page.getByRole('status',{name:`${f.row.product.fishName} 수령 리액션`,exact:true});
 if(f.row.state==='REFUNDED')assert.equal(await reaction.count(),0,'Refunded consultations must not thank the customer for a fish');
 else {
  await reaction.waitFor();
  assert.equal(await reaction.getAttribute('data-fish-reaction'),f.row.product.fishId);
  await expectReactionAsset(reaction,f.row.product.reactionAsset);
 }
 assert.ok(f.state.confirm>0,'Return must execute shared server payment confirmation');
}

async function expectReactionAsset(reaction,expected){
 const source=await reaction.locator('img').getAttribute('src');
 assert.equal(new URL(source,'http://fixture.invalid').pathname,expected,'Paid result must show the selected fish reaction asset');
}

async function complete(f,{resume=false}={}){
 if(resume&&f.row.state!=='COMPLETED')await f.page.getByRole('button',{name:'기존 상담 복구하기',exact:true}).click();
 await f.page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
 assert.equal(f.row.chapters.length,f.row.manifest.length);
 assert.equal(f.state.generates,f.row.manifest.length,'Server worker must generate every missing chapter exactly once');
 const before=f.state.generates;
 await f.page.waitForLoadState('load');
 await settleApiFixture(f);
 await f.page.reload({waitUntil:'domcontentloaded'});
 await f.page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
 assert.equal(f.state.generates,before,'Completed consultation must not generate again on reload');
 assert.equal(f.state.orders.size,1);assert.equal(f.state.sdk.length,f.state.expectedSdk||1);
 assert.equal(new Set(f.state.sdk.map(call=>call.paymentId)).size,1,'All retries must share the same PG payment ID');
 assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}

async function waitFixture(predicate){
 const until=Date.now()+15000;
 while(!predicate()){assert.ok(Date.now()<until,'Fixture checkpoint timed out');await new Promise(r=>setTimeout(r,25));}
}

export async function verifyMobilePayments({base,products,systemNames}){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Mobile payment QA is loopback only');
 const pricingBuild=await build({stdin:{contents:"export {resolveServerFeaturePricing} from './lib/payment/server-feature-pricing';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
 const {resolveServerFeaturePricing}=await import('data:text/javascript;base64,'+Buffer.from(pricingBuild.outputFiles[0].text).toString('base64'));
 for(const p of products){const price=resolveServerFeaturePricing({featureKey:p.cdFeatureKey});assert.equal(price.amountKRW,p.priceKRW);}
 const report={status:'RUNNING',products:products.length,emulation:'mobile-device',mobileProfiles:{chromium:'Pixel 7',webkit:'iPhone 13'},cases:[],realPgCalls:0,realLlmCalls:0,productionDbWrites:0,limitations:['Fixture transport does not prove physical-device/PG approval or the historical staging Mongo 503 root cause.']};
 const filterText=process.argv.find(arg=>arg.startsWith('--payment-filter='))?.slice('--payment-filter='.length);
 const filter=filterText?new RegExp(filterText):null;
 const reportPath=`build-cache/yeongnyangi-mobile-payment${filterText?'-'+filterText.replace(/[^a-zA-Z0-9-]/g,'_'):''}.json`;
 report.filter=filterText||null;
 await mkdir('build-cache',{recursive:true});
 // Compile every local route before the acceptance matrix. Next dev can otherwise
 // rebuild shared chunk IDs while the browser is returning from the mock PG.
 for(const path of ['/checkout/','/yeongnyangi/result/','/yeongnyangi/','/yeongnyangi/fortune/','/yeongnyangi/room/','/yeongnyangi/library/','/login/']){
  const response=await fetch(base+path);assert.equal(response.status,200,`Local QA route must be ready: ${path}`);await response.text();
 }
 async function check(browser,name,product,width,run){
  if(filter&&!filter.test(name))return;
  console.log(`[yeongnyangi:payment] START ${name}`);
  const f=await fixtures(browser,base,product,width);f.state.products=products;
  f.page.setDefaultTimeout(30000);f.page.setDefaultNavigationTimeout(120000);
  try{
   await run(f);
   await f.page.waitForLoadState('load');
   await settleApiFixture(f);
   assert.deepEqual(f.state.unknown,[],'Unrecognised API must not silently succeed');
   const pageErrors=f.state.errors.filter(message=>{
    if(browser.browserType().name()!=='webkit')return true;
    // WebKit reports these checkout-page reads as access-control errors when the PG return navigation cancels them.
    const path=message.match(/^\/(?:127\.0\.0\.1|localhost):\d+(\/api\/[^ ]+) due to access control checks\.$/)?.[1];
    const navigationReads=new Set(['/api/me/access-state','/api/profile','/api/billing/balance']);
    return !path||!navigationReads.has(path);
   });
   assert.deepEqual(pageErrors,[],'Browser page errors');
   report.cases.push({name,status:'PASS',product:product.id,width,orders:f.state.orders.size,sdkCalls:f.state.sdk.length,confirmCalls:f.state.confirm,serverContextReads:f.state.resumeReads,chapters:f.row.chapters.length});
   console.log(`[yeongnyangi:payment] PASS ${name}`);
  }catch(error){
   report.cases.push({name,status:'FAIL',message:error.message,unknown:f.state.unknown,pageErrors:f.state.errors,url:f.page.url(),paid:f.row.paid,chapters:f.row.chapters.length,confirmCalls:f.state.confirm,activations:f.state.activates,http:f.state.http,resources:f.state.resources,blockedExternal:f.state.blocked});
   await f.page.screenshot({path:'build-cache/yeongnyangi-payment-failure.png',fullPage:true}).catch(()=>{});
   throw error;
  }finally{await f.context.close();}
 }
 try{
  for(const engine of [chromium,webkit]){
   const browser=await engine.launch({headless:true});
   try{
    for(const width of [360,390,430])for(const method of ['CARD','KAKAOPAY'])for(const noStorage of [false,true]){
     await check(browser,`${engine.name()}-${width}-${method}-${noStorage?'new-tab-no-storage':'redirect'}`,products[0],width,async f=>{
      await openCheckout(f,base,method);await redirectBack(f,{noStorage});await waitResult(f);await complete(f);
      if(noStorage)assert.ok(f.state.resumeReads>0,'Fresh tab must recover the server context');
     });
    }
    if(engine===chromium){
     for(const [index,p] of products.entries())await check(browser,`product-${p.id}`,p,390,async f=>{
      await openCheckout(f,base,index%2?'KAKAOPAY':'CARD');await redirectBack(f);await waitResult(f);await complete(f);
     });
    }
    await check(browser,`${engine.name()}-home-profile-catalog`,products[0],390,async f=>{
     f.state.profiles=[];
     await f.page.goto(base+'/yeongnyangi/');await f.page.getByRole('heading',{name:/사주보는 고양이/}).waitFor();
     assert.equal(await f.page.locator('.ynOriginal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(24, 19, 43)');
     await f.page.getByRole('button',{name:'영냥이 쓰다듬기'}).click();await f.page.getByText('쓰다듬는 건…',{exact:true}).waitFor();
     await f.page.waitForLoadState('load');
     await f.page.goto(base+'/yeongnyangi/fortune/');await f.page.getByRole('button',{name:'새 프로필 만들기'}).click();
     await f.page.getByLabel('이름',{exact:true}).fill('QA 고객');await f.page.getByLabel('생년월일',{exact:true}).fill('1990-06-15');
     await f.page.getByLabel('출생시간',{exact:true}).fill('14:30');await f.page.getByLabel('출생지역',{exact:true}).fill('부산');
     await f.page.getByRole('button',{name:'프로필 저장하기',exact:true}).click();await waitFixture(()=>f.state.profileCreates===1);
     let displayed=0;
     for(const [domain,label] of [...Object.entries(systemNames),['fusion','복합 운세']]){
      await f.page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name:label,exact:true}).click();
      const items=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.domain===domain&&p.readingKind==='single');
      const choices=f.page.getByRole('group',{name:'생선 상품'}).getByRole('button');assert.equal(await choices.count(),items.length);
      for(let i=0;i<items.length;i++){await choices.nth(i).click();assert.equal(await choices.nth(i).getAttribute('aria-pressed'),'true');assert.ok((await choices.nth(i).textContent()).includes(items[i].priceKRW.toLocaleString('ko-KR')));displayed++;}
     }
     assert.equal(displayed,28);
     await f.page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name:systemNames.saju,exact:true}).click();
     await f.page.getByRole('group',{name:'저장한 프로필'}).getByRole('button',{name:/QA 고객/}).click();
     await f.page.getByRole('group',{name:'상담 종류'}).getByRole('button',{name:/무엇이든 물어보기/}).click();
     await f.page.getByLabel('영냥이에게 궁금한 이야기').fill('올해의 흐름이 궁금해요.');await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
     await f.page.waitForURL('**/checkout/**');assert.equal(new URL(f.page.url()).searchParams.get('requestId'),f.row.id);assert.equal(f.state.creates,1);
     await f.page.waitForLoadState('load');
     await f.page.goto(base+'/yeongnyangi/room/#story');await f.page.getByRole('dialog',{name:'영냥이의 프롤로그'}).waitFor();
     // WebKit delivers cancelled errors from the previous documents after this multi-route QA flow has already reached the room.
     if(engine===webkit)f.state.errors.length=0;
     await f.page.getByRole('button',{name:'닫기',exact:true}).click();assert.equal(await f.page.getByRole('link',{name:/생선 상품과 상담 내용 살펴보기/}).getAttribute('href'),'/yeongnyangi/fortune/');
     assert.equal(await f.page.getByRole('group',{name:'무료 운세 16종'}).getByRole('button').count(),16);
     await f.page.screenshot({path:`build-cache/yeongnyangi-payment-${engine.name()}-home.png`,fullPage:true});
     assert.equal(f.state.sdk.length,0);assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    });
    for(const scenario of ['handler-delay','idle-return','no-redirect-poll','pending-webhook','read-503','activate-503','generation-failure','generation-interrupted','refund','foreign-request','foreign-order','wrong-product','external-return','abandon-back','abandon-from-result','tampered-url','reload-checkout','back-forward','double-click','concurrent-tabs','concurrent-pending-tabs','expired-login','pg-cancel-return','pg-failed-return','inline-payment','inline-cancel','inline-failure']){
     await check(browser,`${engine.name()}-${scenario}`,products[0],390,async f=>{
      if(scenario==='foreign-request'){
       await f.page.goto(base+checkoutPath(f.row).replace(f.row.id,'b'.repeat(64)));
       await f.page.locator('p[role="alert"]').waitFor();assert.equal(f.state.sdk.length,0);
       assert.equal(f.state.orders.size,0);return;
      }
      if(scenario==='wrong-product'){
       await f.page.goto(base+checkoutPath(f.row).replace(f.row.product.cdFeatureKey,products[1].cdFeatureKey));
       await f.page.getByText('선택한 상담과 생선이 달라요. 영냥이 방에서 다시 골라 주세요.').waitFor();assert.equal(f.state.sdk.length,0);return;
      }
      if(scenario==='external-return'){
       const target=new URL(base+checkoutPath(f.row));target.searchParams.set('returnTo','https://outside.example.invalid/');
       await f.page.goto(target.href);await f.page.getByRole('button',{name:/단건 결제하기/}).waitFor();
       // 결제를 그만두는 링크는 결제 "성공" 뒤 주소(미결제 결과 화면)가 아니라 영냥이 방·생선 고르기로 간다.
       assert.equal(await f.page.locator('a').filter({hasText:'← 영냥이 방'}).getAttribute('href'),'/yeongnyangi/');
       assert.equal(await f.page.locator('a').filter({hasText:'생선 다시 고르기'}).getAttribute('href'),'/yeongnyangi/fortune/');
       assert.equal(await f.page.locator('a[href*="outside.example.invalid"]').count(),0,'External returnTo must not reach any link');
       assert.equal(f.state.sdk.length,0);return;
      }
      if(scenario==='abandon-back'){
       // 결제창까지 갔다가 그만두면 직전 화면(상담 폼)으로 돌아간다. 미결제 결과 화면은 한 번도 거치지 않는다.
       await f.page.goto(base+'/yeongnyangi/fortune/');
       await f.page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name:systemNames.saju,exact:true}).click();
       await f.page.getByRole('group',{name:'저장한 프로필'}).getByRole('button',{name:/QA 고객/}).click();
       await f.page.getByRole('group',{name:'상담 종류'}).getByRole('button',{name:/무엇이든 물어보기/}).click();
       await f.page.getByLabel('영냥이에게 궁금한 이야기').fill('올해의 흐름이 궁금해요.');
       await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
       await f.page.waitForURL('**/checkout/**');await f.page.getByRole('button',{name:/단건 결제하기/}).waitFor();
       assert.equal(f.state.creates,1);
       await f.page.locator('a').filter({hasText:'← 영냥이 방'}).click();
       await f.page.waitForURL(url=>url.pathname==='/yeongnyangi/fortune/');
       await f.page.getByRole('heading',{name:'무엇부터 읽어볼까?'}).waitFor();
       assert.equal(f.state.creates,1);assert.equal(f.state.sdk.length,0);
       assert.equal(f.state.activates,0,'Leaving before paying must not open the unpaid result screen');
       assert.deepEqual(f.state.visited.filter(path=>path.startsWith('/yeongnyangi/result')),[],'Unpaid result must not be visited');return;
      }
      if(scenario==='abandon-from-result'){
       // 내 상담 기록 → 미결제 결과 → 결제 화면에서 그만두기: 결과 화면으로 되돌아가지 않고 영냥이 방으로 간다. 미결제 결과는 챕터 껍데기를 그리지 않는다.
       await f.page.goto(base+resultPath(f.row.id));
       await f.page.getByText('아직 확인된 결제가 없어요.',{exact:false}).waitFor();
       assert.equal(await f.page.getByText(/개 챕터 저장됨/).count(),0,'Unpaid result must not draw chapter progress');
       assert.equal(await f.page.getByRole('navigation',{name:'상담 목차'}).count(),0,'Unpaid result must not draw the table of contents');
       await f.page.getByRole('link',{name:'결제 내용 확인하기'}).click();
       await f.page.waitForURL('**/checkout/**');await f.page.getByRole('button',{name:/단건 결제하기/}).waitFor();
       await f.page.locator('a').filter({hasText:'← 영냥이 방'}).click();
       await f.page.waitForURL(url=>url.pathname==='/yeongnyangi/');
       assert.equal(f.state.sdk.length,0);
       // 페이지마다 하이드레이션 뒤 same-document replaceState 가 framenavigated 를 한 번 더 내므로 연속 중복은 접는다.
       assert.deepEqual(f.state.visited.filter((path,i,all)=>path!==all[i-1]),['/yeongnyangi/result/','/checkout/','/yeongnyangi/'],'Leaving checkout must not return to the unpaid result');return;
      }
      if(scenario==='double-click')f.state.doubleClicks=true;
      if(scenario==='tampered-url'){
       const target=new URL(base+checkoutPath(f.row));target.searchParams.set('amountKRW','1');target.searchParams.set('amount','1');target.searchParams.set('returnTo','//outside.example.invalid/');f.checkoutUrl=target.href;
      }
      if(scenario.startsWith('inline-'))f.state.sdkMode=scenario==='inline-payment'?'inline':scenario==='inline-cancel'?'cancel':'failure';
      await openCheckout(f,base,scenario==='no-redirect-poll'?'KAKAOPAY':'CARD');
      if(scenario==='generation-failure'){f.state.generate503=1;f.state.generationBoundary=1;}
      if(scenario==='generation-interrupted'){f.state.holdGeneration=true;f.state.generationBoundary=1;}
      if(scenario==='refund'){f.row.state='REFUNDED';f.row.paid=true;}
      if(scenario==='foreign-order'){
       const foreignId='fixture-pg-foreign-owner';
       await redirectBack(f,{noStorage:true,approved:false,paymentId:foreignId});
       await waitFixture(()=>f.state.http.some(r=>r.path===`/api/payments/orders/${foreignId}/resume`&&r.status===404));
       await f.page.getByRole('button',{name:/단건 결제하기/}).waitFor();
       assert.equal(new URL(f.page.url()).pathname,'/checkout/');assert.equal(new URL(f.page.url()).searchParams.get('requestId'),f.row.id);
       assert.equal(f.row.paid,false);assert.equal(f.state.generates,0);assert.equal(f.state.sdk.length,1);assert.equal(f.state.orders.size,1);return;
      }
      const activateFailure=scenario==='activate-503'?f.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/yeongnyangi/requests/${f.row.id}/activate`&&r.status()===503):null;
      if(activateFailure)f.state.activate503=1;
      if(scenario==='concurrent-pending-tabs'){
       f.state.duplicateAttempt=true;f.state.expectedSdk=2;
       const second=await f.context.newPage();await openCheckout({...f,page:second},base);
       await second.locator('p[role="alert"]').waitFor();assert.equal(f.state.orders.size,1);
       assert.equal(new Set(f.state.sdk.map(call=>call.paymentId)).size,1);assert.equal(f.row.paid,false);
       await second.close();
      }
      if(scenario==='inline-cancel'||scenario==='inline-failure'){
       await f.page.locator('p[role="alert"]').or(f.page.getByText('결제를 취소했어요. 준비되면 다시 눌러 주세요.')).first().waitFor();
       assert.equal(await f.page.getByRole('button',{name:/단건 결제하기/}).isEnabled(),true);
       await waitFixture(()=>f.state.sdk.length===1);
       assert.equal(f.state.confirm,0);assert.equal(f.row.paid,false);assert.equal(f.state.generates,0);return;
      }
      if(scenario==='no-redirect-poll'){
       // Wait for the actual first pending poll before approval; no timers are shortened.
       await f.page.waitForResponse(r=>/\/api\/payments\/orders\/[^/]+$/.test(new URL(r.url()).pathname));
       assert.equal(f.state.confirm,0);assert.equal(f.row.paid,false);f.state.approved=true;
      }else if(scenario==='pg-cancel-return'||scenario==='pg-failed-return'){
       f.page.on('dialog',d=>d.dismiss());
       await redirectBack(f,{approved:false,code:scenario==='pg-cancel-return'?'PAYMENT_CANCELLED':'FAILURE_TYPE_PG_PROVIDER'});
       await f.page.getByRole('button',{name:/단건 결제하기/}).waitFor();
       assert.equal(f.state.confirm,0);assert.equal(f.row.paid,false);assert.equal(f.state.generates,0);
       // PG 를 다녀온 뒤에는 직전 문서가 PG(또는 빈 값)라 뒤로가기 대신 영냥이 방으로 간다 — 미결제 결과 화면을 거치지 않는다.
       await f.page.locator('a').filter({hasText:'← 영냥이 방'}).click();await f.page.waitForURL(url=>url.pathname==='/yeongnyangi/');
       assert.deepEqual(f.state.visited.filter(path=>path.startsWith('/yeongnyangi/result')),[],'Unpaid result must not be visited');return;
      }else if(scenario!=='inline-payment'){
       if(scenario==='handler-delay')f.state.handlerDelay=1500;
       if(scenario==='idle-return')f.state.delayIdle=true;
       if(scenario==='pending-webhook')f.state.pending=true;
       if(scenario==='expired-login')f.state.auth=false;
       await redirectBack(f,{noStorage:scenario==='handler-delay'||scenario==='idle-return'});
      }
      if(scenario==='expired-login'){
       await f.page.waitForURL('**/login**');
       const next=new URL(f.page.url()).searchParams.get('next');
       assert.ok(next.includes(`/checkout/?`)&&next.includes(f.row.id));
       // Simulate reauthentication at its HTTP boundary; login UI is outside this payment test.
       await f.page.evaluate(()=>fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));
       await f.page.goto(base+next);
      }
      if(scenario==='pending-webhook'){
       await waitFixture(()=>f.state.confirm>0);
       assert.equal(new URL(f.page.url()).pathname,'/checkout/');assert.equal(f.row.paid,false);assert.equal(f.state.generates,0);
       f.state.pending=false;await f.page.reload({waitUntil:'domcontentloaded'});
      }
      if(activateFailure){
       await f.page.waitForURL('**/yeongnyangi/result/**',{waitUntil:'domcontentloaded'});await activateFailure;
       await waitFixture(()=>f.state.activates>=2);
       assert.equal(f.state.sdk.length,1);assert.equal(f.state.orders.size,1);assert.ok(f.state.confirm>0);
      }
      await waitResult(f);
      if(scenario==='handler-delay')assert.ok(f.state.assetDelays>0);
      if(scenario==='read-503'){
       assert.equal(f.row.paid,true);f.state.read503=100;
       const failed=f.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/yeongnyangi/requests/${f.row.id}`&&r.status()===503);
       await f.page.reload({waitUntil:'domcontentloaded'});await failed;await f.page.locator('p[role="alert"]').waitFor();
       assert.equal(f.state.sdk.length,1);assert.equal(f.state.orders.size,1);
       await f.page.waitForLoadState('load');
       const restored=f.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/yeongnyangi/requests/${f.row.id}`&&r.status()===200);
       f.state.read503=0;await restored;await f.page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
      }
      if(scenario==='generation-failure'){
       await f.page.locator('p[role="alert"]').waitFor();assert.equal(f.row.paid,true);assert.equal(f.state.sdk.length,1);assert.equal(f.row.chapters.length,1);
      }
      if(scenario==='generation-interrupted'){
       await waitFixture(()=>f.row.state==='GENERATING');assert.equal(f.row.chapters.length,1);
       await f.page.goto(base+'/yeongnyangi/library/');f.state.holdGeneration=false;f.row.state='PAID';
       await f.page.goto(base+resultPath(f.row.id));await f.page.getByRole('heading',{name:`${f.row.product.name} · ${f.row.product.fishName}`,exact:true}).waitFor();
      }
      if(scenario==='activate-503')assert.ok(f.state.activates>=2,'Activation failure must recover without another payment');
      if(scenario==='refund'){
       await f.page.getByText('환불된 상담이에요. 결제 내역에서 처리 상태를 확인해 주세요.').waitFor();
       assert.equal(await f.page.getByRole('button',{name:/상담 시작하기|상담 이어가기/}).count(),0);assert.equal(f.state.generates,0);return;
      }
      if(scenario==='reload-checkout'){
       await f.page.goto(base+checkoutPath(f.row));await waitResult(f);assert.equal(f.state.sdk.length,1);
      }
      if(scenario==='back-forward'){
       await f.page.goBack();await waitResult(f);assert.equal(f.state.sdk.length,1);
      }
      if(scenario==='concurrent-tabs'){
       const second=await f.context.newPage();await second.goto(base+checkoutPath(f.row));await second.waitForURL('**/yeongnyangi/result/**');
       assert.equal(f.state.orders.size,1);assert.equal(f.state.sdk.length,1);await second.close();
      }
      await complete(f,{resume:scenario==='generation-failure'});
      if(['double-click','concurrent-tabs','concurrent-pending-tabs'].includes(scenario)){
       assert.equal(f.state.generates,f.row.manifest.length,'Duplicate payment entry must not duplicate chapter generation');
      }
     });
    }
   }finally{await browser.close();}
  }
  assert.ok(report.cases.length>0,'Filter must select at least one scenario');report.status='PASS';
 }catch(error){report.status='FAIL';throw error;}
 finally{await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({status:report.status,cases:report.cases.length,products:report.products,realPgCalls:0,realLlmCalls:0,productionDbWrites:0}));
}
