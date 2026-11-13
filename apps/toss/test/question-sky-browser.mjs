import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
const privateDir=process.env.TOSS_PRIVATE_SKY_DIST;
let runtime,origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
if(privateDir){
 const folder=resolve(privateDir),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
 runtime=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;
  try{const file=resolve(folder,'.'+(extname(path)?path:'/index.html'));if(!file.startsWith(folder+sep))throw Error('outside');
   res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(await readFile(file));
  }catch{res.end();}
 });await new Promise(done=>runtime.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+runtime.address().port;
}
const browser=await chromium.launch({channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 if(privateDir)await ctx.addInitScript(()=>{
  window.__appsInTossConstants={operationalEnvironment:'sandbox',safeAreaInsets:{top:0,bottom:12,left:0,right:0},schemeUri:'intoss://ai-saju-studio',locale:'ko-KR',platformOS:'android',tossAppVersion:'5.300.0'};
  const handlers={__subscribeAppEvent:()=>null,__unsubscribeAppEvent:()=>null,getStorageItem:()=>null,getPendingOrders:()=>({orders:[]})};
  window.__bridgeMethods__=Object.keys(handlers);window.ReactNativeWebView={postMessage(raw){
   const {type,body,bridgeId}=JSON.parse(raw);if(type!=='bridge')return;const {method,eventId}=body;
   if(!Object.hasOwn(handlers,method))throw Error('Unexpected native operation '+method);
   queueMicrotask(()=>window.nativeEmitterMap[bridgeId].emit(method+'-'+eventId,handlers[method]()));
  }};
 });
 let p=await ctx.newPage();p.on('pageerror',e=>console.error(e.message));
 const question='새 업무를 맡기 전에 어떤 점을 확인해야 할까요?';
 async function enter(label){
  await p.goto(origin);await p.locator('.world-entry-yeongnyangi').click({timeout:10000}).catch(async error=>{console.error((await p.locator('body').innerText()).slice(0,600));throw error;});
  await p.getByRole('button',{name:new RegExp('^'+label)}).click();
 }
 async function fill(){
  if(privateDir){await p.getByRole('button',{name:'모의 예시 입력하기'}).click();await p.locator('form button[type=submit]').last().click();return;}
  await p.locator('#sky-question').fill(question);await p.locator('#sky-topic').selectOption('work');
  await p.locator('#sky-city').selectOption('seoul');
  await p.locator('#sky-time').fill(new Date(Date.now()-86400000).toISOString().slice(0,16));
  await p.locator('form button[type=submit]').last().click();
 }
 await enter('영냥 호라리');await fill();
 await p.getByText(/Swiss Ephemeris|레기오몬타누스|Regiomontanus/).first().waitFor();
 await enter('영냥 신점');await fill();
 await p.getByRole('button',{name:'토스로 로그인하기'}).click();
 await p.locator('#sky-question').waitFor();assert.equal(await p.locator('#sky-question').inputValue(),question);
 await p.locator('form button[type=submit]').last().click();await p.waitForURL('**/checkout/**');
 await p.evaluate(()=>localStorage.setItem('toss-offline-generation-delay-ms','700'));
 await p.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
 await p.waitForURL('**/yeongnyangi/result/**');const result=p.url();
 await p.close();p=await ctx.newPage();await p.goto(origin);await p.locator('.world-entry-yeongnyangi').click({timeout:10000}).catch(async error=>{console.error((await p.locator('body').innerText()).slice(0,600));throw error;});
 await p.getByRole('link',{name:'영냥이 보관함'}).click();await p.locator('a[href*="/yeongnyangi/result/"]').first().click();
 await p.locator('#sky-followup').fill('언제 상황을 다시 살펴보면 좋을까요?');
 await p.getByRole('button',{name:'심화 질문 보내기'}).click();
 await p.getByText('이번 상담에 포함된 심화 질문을 모두 사용했어.').waitFor();
 await p.reload();await p.getByText('이번 상담에 포함된 심화 질문을 모두 사용했어.').waitFor();
 const state=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),privateDir?'consultations':'toss-offline-fixture');
 assert.equal(state.orders.length,1);assert.equal(state.fortunes.length,1);
 const row=state.fortunes[0][1];assert.equal(row.generationCount,1);assert.equal(row.sku,'mock-yeongnyangi-prashna');
 assert.equal(row.fortune.chapters.length,2);assert.equal(row.fortune.product.priceKRW,1);
 await p.goto(origin);await p.getByRole('button',{name:'내 정보',exact:true}).click();
 await p.getByRole('button',{name:'로그아웃',exact:true}).click();await p.getByText('로그아웃했어요.').waitFor();
 if(privateDir)await p.locator('#private-simulation-person').selectOption('B');
 else await p.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
 await enter('영냥 신점');await fill();await p.getByRole('button',{name:'토스로 로그인하기'}).click();
 await p.locator('#sky-question').waitFor();await p.goto(result);
 await p.locator('[role=alert]').first().waitFor();assert.doesNotMatch(await p.locator('body').innerText(),/영냥이의 첫 답변입니다/);
 console.log('PASS '+(privateDir?'packaged reference horary and Prashna':'guest local Swiss horary and Prashna')+', mock purchase, interrupted generation, owned archive, single follow-up, stored chapters and account denial.');
}finally{await browser.close();if(runtime)await new Promise(done=>runtime.close(done));}
