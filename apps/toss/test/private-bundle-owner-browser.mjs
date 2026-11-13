// Replay a portable release archive with the native bridge and API intercepted.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {extname} from 'node:path';
import {chromium} from 'playwright';
import {createOfflineFixtureApi} from './offline/fixture.mjs';
const [file,version='new']=process.argv.slice(2);
const require=createRequire(import.meta.url);
const sdk=createRequire(require.resolve('@apps-in-toss/cli/package.json'));
const reader=sdk('@apps-in-toss/ait-format').AppsInTossBundle.reader(readFileSync(file));
const origin='http://127.0.0.1:4333';
const entries=new Map(reader.bundle.index.map(i=>[i.name,i]));
assert.equal(reader.appName,'ai-saju-studio');
assert.ok([...entries.keys()].every(name=>!name.includes(String.fromCharCode(92))));
const sources=entries;
const assetCache=new Map();
const memory=new Map(),api=createOfflineFixtureApi({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)});
const base='https://code-destiny.com/api/toss';
const post=(path,body)=>api.handle(new Request(base+path,{method:'POST',headers:{Authorization:'Bearer local-mock-token','content-type':'application/json'},body:JSON.stringify(body)}));
await post('/login',{});
const {fortune}=await (await post('/canonical/yeongnyangi/requests',{productId:'saju_mackerel',profileId:'mock-profile',question:'테스트용 질문',consultationAttemptId:'seed-existing'})).json();
assert.equal((await post('/orders/grant',{requestId:fortune.id,sku:'mock-saju_mackerel',orderId:'existing-test-order'})).status,200);
await post('/logout',{});
const browser=await chromium.launch({channel:'chrome'});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.avif':'image/avif'};
let lastPage;try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block'});
 const requests=[];
 let disconnectResults=false,failedReads=0;
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===origin){
   let name='sources'+decodeURIComponent(url.pathname);
   if(!sources.has(name)&&req.isNavigationRequest())name='sources/index.html';
   if(!sources.has(name))return route.fulfill({status:404,body:''});
   if(!assetCache.has(name))assetCache.set(name,Promise.resolve(reader.readEntry(name)).then(bytes=>Buffer.from(bytes)));
   return route.fulfill({body:await assetCache.get(name),contentType:mime[extname(name)]||'application/octet-stream'});
  }
  if(!url.href.startsWith(base+'/'))return route.abort();
  const cors={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
  requests.push(req.method()+' '+url.pathname);
  if(disconnectResults&&req.method()==='GET'&&url.pathname.includes(fortune.id)){failedReads++;return route.abort('internetdisconnected');}
  const response=await api.handle(new Request(url,{method:req.method(),headers:req.headers(),body:req.postData()||undefined}));
  return route.fulfill({status:response.status,headers:{...cors,'content-type':'application/json'},body:await response.text()});
 });
 await context.addInitScript(()=>{
  window.__appsInTossConstants={operationalEnvironment:'sandbox',safeAreaInsets:{top:0,bottom:0,left:0,right:0},schemeUri:'intoss://ai-saju-studio',locale:'ko-KR',platformOS:'android',tossAppVersion:'5.300.0'};
  const handlers={
   __subscribeAppEvent:()=>null,__unsubscribeAppEvent:()=>null,
   appLogin:()=>({authorizationCode:'local-fake',referrer:'SANDBOX'}),
   getStorageItem:({key})=>localStorage.getItem('mock-sdk:'+key),
   setStorageItem:({key,value})=>localStorage.setItem('mock-sdk:'+key,value),
   removeStorageItem:({key})=>localStorage.removeItem('mock-sdk:'+key),
   getCompletedOrRefundedOrders:()=>({orders:[]}),getPendingOrders:()=>({orders:[]})
  };
  window.__bridgeMethods__=Object.keys(handlers);
  window.ReactNativeWebView={postMessage(raw){
   const {type,body,bridgeId}=JSON.parse(raw);if(type!=='bridge')return;
   const {method,eventId,args}=body;
   if(!Object.hasOwn(handlers,method))throw new Error('Unexpected SDK call: '+method);
   const value=handlers[method](...args);
   queueMicrotask(()=>window.nativeEmitterMap[bridgeId].emit(method+'-'+eventId,value));
  }};
 });
 const page=await context.newPage();lastPage=page;page.setDefaultTimeout(60000);
 page.on('pageerror',e=>console.warn('pageerror',String(e).slice(0,220)));
 await page.goto(origin);
 if(version==='old')await page.getByRole('link',{name:/영냥이 사주 상담/}).click();
 else{await page.locator('.world-entry-yeongnyangi').click();await page.getByRole('button',{name:/사주 상담/}).first().click();}
 await page.locator('#yn-question').fill('지금 제 강점을 어떻게 살려볼까요?');
 await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.waitForURL(/yeongnyangi\/fortune/);
 if(version==='old'){await page.locator('#yn-question').fill('지금 제 강점을 어떻게 살려볼까요?');await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();}
 const pay=page.getByRole('button',{name:'단건 결제로 상담 시작하기'});
 await pay.waitFor();
 assert.equal(await pay.isDisabled(),true);
 await page.goto(origin);
 if(version==='old'){
   await page.getByRole('link',{name:'기록 보관함'}).click();
   await page.locator('button.record').first().click();
 }else{
   await page.locator('.world-entry-yeongnyangi').click();
   await page.getByRole('link',{name:'영냥이 보관함'}).click();
   await page.locator('a[href*="'+fortune.id+'"]').first().click();
 }
 await page.getByText(/이 문단은 화면과 구매 후 열람/).first().waitFor();
 assert.equal(requests.filter(p=>p.includes('/orders/grant')||p.endsWith('/generate')).length,0);
 const resultUrl=page.url();
 const original=await page.getByText(/이 문단은 화면과 구매 후 열람/).first().textContent();
 await page.close();
 const reopened=await context.newPage();lastPage=reopened;reopened.setDefaultTimeout(60000);
 await reopened.goto(origin);
 if(version==='new'){
  await reopened.locator('.world-entry-yeongnyangi').click();
  await reopened.getByRole('link',{name:'영냥이 보관함'}).click();
  disconnectResults=true;
  const resultLink=reopened.locator('a[href*="'+fortune.id+'"]').first();
  const disconnected=reopened.waitForEvent('requestfailed',{predicate:r=>r.url().startsWith(base)&&r.url().includes(fortune.id)});
  await resultLink.click();await disconnected;
  assert.equal(await reopened.getByText(original,{exact:true}).count(),0);
  disconnectResults=false;
  await reopened.reload();
  assert.ok(failedReads>0);
  assert.equal(await reopened.getByText(original,{exact:true}).first().textContent(),original);
  await reopened.goto(origin);
  await reopened.getByRole('button',{name:'내 정보',exact:true}).click();
  await reopened.getByRole('button',{name:'로그아웃',exact:true}).click();
  await reopened.getByText('로그아웃했어요.').waitFor();
  memory.set('toss-offline-login-person','second');
  await reopened.goto(origin);
  await reopened.locator('.world-entry-yeongnyangi').click();
  await reopened.getByRole('button',{name:/사주 상담/}).first().click();
  await reopened.locator('#yn-question').fill('다른 계정으로 로그인해서 제 질문을 준비할게요.');
  await reopened.getByRole('button',{name:'상담과 결제 확인하기'}).click();
  await reopened.getByRole('button',{name:'토스로 로그인하기'}).click();
  await reopened.getByRole('button',{name:'토스로 로그인하기'}).click();
  await reopened.waitForURL(/yeongnyangi\/fortune/);
  assert.equal(JSON.parse(memory.get('toss-offline-fixture-2')).loggedIn,true);
  const durable=JSON.parse(memory.get('toss-offline-fixture'));
  assert.equal(durable.orders.length,1);assert.equal(durable.fortunes[0][1].generationCount,1);
  await reopened.goto(resultUrl);
  await reopened.locator('[role=alert]').first().waitFor();
  assert.equal(await reopened.getByText(original,{exact:true}).count(),0);
 }
 assert.equal(requests.filter(p=>p.includes('/orders/grant')||p.endsWith('/generate')).length,0);
 console.log(JSON.stringify({file,version,deploymentId:reader.deploymentId,paidButtonDisabled:true,ownedStoredResult:true,secondPersonDenied:version==='new',interruptedResultReads:failedReads,apiCalls:requests.length,newCharges:0}));
}catch(error){console.warn(lastPage?.url(),(await lastPage?.locator('body').innerText())?.slice(-1600));throw error;}finally{await browser.close();}
