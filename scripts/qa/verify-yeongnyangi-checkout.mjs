// Real React flow; payment transport, profiles and API storage are loopback fixtures only.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yn-checkout-'));
const output=path.resolve('build-cache/yeongnyangi-checkout');fs.mkdirSync(output,{recursive:true});
let browser,server;
try{
 await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {setUser} from './app/_lib/auth-store';import Consultation from './app/yeongnyangi/_components/Consultation';import styles from './app/yeongnyangi/yeongnyangi.module.css';import './app/yeongnyangi/night-tokens.css';if(!sessionStorage.getItem('test-guest'))setUser({id:'intake-mock',name:'테스트'});else setUser(null);createRoot(document.getElementById('root')).render(<main className={styles.page} data-yn-night><Consultation/></main>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,outfile:path.join(temp,'fixture.js'),platform:'browser',jsx:'automatic',define:{'process.env':'{}'},plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^next\/(navigation|image|link)$/},args=>({path:args.path,namespace:'mock-next'}));
  b.onLoad({filter:/.*/,namespace:'mock-next'},args=>({loader:'tsx',resolveDir:process.cwd(),contents:args.path.endsWith('navigation')?"export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:()=>{},replace:()=>{},refresh:()=>{}});":"import React from 'react';export default function Component(p){return React.createElement('"+(args.path.endsWith('image')?'img':'a')+"',p)}"}));
  b.onLoad({filter:/app[\\/]_lib[\\/]billing-client\.ts$/},args=>({loader:'ts',contents:fs.readFileSync(args.path,'utf8').replace('export async function runPaidAccessGate(','async function fixtureOriginalGate(').replace('export async function fetchPaymentEligibility(','async function fixtureOriginalEligibility(')+`
  export async function runPaidAccessGate(input:any){(window as any).__payments.push(input);return {ok:false,status:402,error:{code:'PAYMENT_CANCELLED',message:'취소'}};}
  export async function fetchPaymentEligibility(){await new Promise(resolve=>setTimeout(resolve,600));if((window as any).__failEligibility)return {ok:false};return {ok:true,data:{pass:{tier:(window as any).__noFamily?'none':'family',hasActivePass:!(window as any).__noFamily,canUse:!(window as any).__noFamily},monthly:{balance:10000,canUse:true}}};}` }));
 }}]});
 const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
 const {products}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 server=createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/login')){res.end('<!doctype html><title>Mock login</title><p>Mock login</p>');return;}const file=pathname==='/fixture.js'||pathname==='/fixture.css'?path.join(temp,pathname.slice(1)):pathname.startsWith('/assets/')?path.resolve('public'+pathname):null;
  if(file&&fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/webp');res.end(fs.readFileSync(file));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><body style="margin:0;background:#211432"><div id="root"></div><script src="/fixture.js"></script></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});
 for(const width of [360,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  let missingProfile=false,hasPacks=false,guest=false;const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>{window.__payments=[];localStorage.setItem('fortune_auth_user',JSON.stringify({id:'intake-mock',name:'테스트'}));});
  const profile={id:'mock-profile',profileId:'mock-profile',name:'테스트 손님',gender:'F',birthDate:'1994-05-16',birth:{year:1994,month:5,day:16,hour:10,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',tz:'Asia/Seoul',lat:37.56,lng:126.97}};
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!==base)return route.abort();
   if(!url.pathname.startsWith('/api/'))return route.continue();
   if(guest&&(/profiles|auth/.test(url.pathname)))return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,code:'AUTH_REQUIRED'})});
   let data={ok:true};
   if(url.pathname==='/api/yeongnyangi/products')data={products:products.map(p=>({...p,available:true}))};
   else if(url.pathname==='/api/yeongnyangi/profiles')data={ok:true,profiles:missingProfile?[]:[profile],currentId:missingProfile?null:profile.id};
   else if(url.pathname.endsWith('/saju/jong-check'))data={check:null};
   else if(url.pathname.endsWith('/service-packs/wallet'))data={ok:true,packs:hasPacks&&url.searchParams.has('before')?[{entitlementId:'mock-pack',orderId:'mock-order',planId:'mock-plan',label:'고등어 5회 이용권',fishId:'mackerel',totalUses:5,remainingUses:3,expiresAt:'2099-01-01',status:'granted',available:true,unavailableReason:'',eligibleFeatureKeys:['yeongnyangi-saju-mackerel']}]:[],nextCursor:hasPacks&&!url.searchParams.has('before')?'second':null};
   else if(url.pathname.endsWith('/service-packs/quote'))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,code:'REQUEST_UNCERTAIN'})});
   else if(url.pathname==='/api/yeongnyangi/requests'){
    const body=route.request().postDataJSON();requests.push(body);const product=products.find(p=>p.id===body.productId);
    data={fortune:{id:'a'.repeat(64),product,productId:product.id,state:'CREATED',paid:false,locale:'ko',manifest:[],consultation:{question:body.question}}};
   }
   else if(url.pathname.includes('/auth/'))data={ok:true,user:{id:'intake-mock',name:'테스트'}};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(base+'/yeongnyangi/fortune/');
  await page.getByLabel('상담 질문',{exact:true}).fill('마음을 어떻게 표현하면 좋을까요?');
  await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();
  await page.getByRole('heading',{name:'마음을 맡길 준비'}).waitFor();
  assert.equal(requests.length,0,'opening checkout must not create or fund an order');
  assert.equal(await page.getByRole('button',{name:'이용권 확인 중',exact:true}).isDisabled(),true,'pending benefits cannot open a direct payment');
  const family=page.getByRole('radio',{name:/패밀리 이용권/});await family.waitFor();assert.equal(await family.isChecked(),true,'eligible Family is selected automatically');
  const pay=page.getByRole('button',{name:'상담 시작하기',exact:true});await pay.waitFor();
  await page.locator('img[src="/assets/yeongnyangi/checkout-moonblue.webp"]').evaluate(img=>img.decode());
  assert.equal(await page.evaluate(()=>window.__payments.length),0,'auto-selection must not consume a pass');
  await page.screenshot({path:path.join(output,`checkout-${width}.png`),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
  assert.ok((await pay.boundingBox()).height>=44);
  await pay.click();await page.getByText('결제를 취소했어요. 상담 내용은 그대로 남아 있어요.').waitFor();
  assert.equal(requests.length,1);assert.equal(requests[0].questionDecision.confirmed,true);
  assert.equal(await page.evaluate(()=>window.__payments[0].paymentMode),'MEMBERSHIP_PASS');
  await pay.click();await page.waitForFunction(()=>window.__payments.length===2);
  assert.equal(requests[0].consultationAttemptId,requests[1].consultationAttemptId,'cancel retry keeps the same prepared intention');
  await page.reload();await page.getByRole('heading',{name:'마음을 맡길 준비'}).waitFor();
  await page.getByText('질문 수정하기',{exact:true}).click();
  assert.equal(await page.locator('textarea').first().inputValue(),'마음을 어떻게 표현하면 좋을까요?');
  await family.waitFor();assert.equal(await family.isChecked(),true,'restore or automatically select an eligible pass');
  if(width===390){
   await page.locator('textarea').first().fill('새로운 관계에서 내 마음을 어떻게 표현할까요?');
   await pay.click();await page.getByText('결제를 취소했어요. 상담 내용은 그대로 남아 있어요.').waitFor();
   assert.notEqual(requests.at(-1).consultationAttemptId,requests[0].consultationAttemptId,'edited question gets a new intent');
   assert.ok(!page.url().includes(encodeURIComponent(requests.at(-1).question)));
   assert.equal(await page.getByRole('radio',{name:/월정석.*사용.*보유/}).count(),0,'mackerel keeps its moonstone exclusion');
   await page.getByText('상담 방식·깊이 변경하기',{exact:true}).click();await page.locator('input[value=salmon]').check();
   await page.getByRole('radio',{name:/월정석.*사용.*보유/}).check();
   await page.getByRole('button',{name:'상담 시작하기',exact:true}).focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>window.__payments.at(-1)?.paymentMode==='MOONLIGHT_STONE');
   await page.getByRole('radio',{name:/단건 결제/}).check();await page.getByRole('button',{name:'결제하고 상담 시작하기'}).click();
   await page.waitForFunction(()=>window.__payments.at(-1)?.allowedPaymentModes[0]==='direct');
   await page.reload();await page.getByRole('radio',{name:/패밀리 이용권/}).waitFor();
   assert.equal(await page.getByRole('radio',{name:/단건 결제/}).isChecked(),true,'explicit direct preference survives reload despite available Family');
   await page.getByText('상담 방식·깊이 변경하기',{exact:true}).click();await page.locator('input[value=mackerel]').check();
   const before=requests.length;missingProfile=true;await page.reload();await page.getByRole('heading',{name:'마음을 맡길 준비'}).waitFor();
   await page.getByRole('button',{name:'새 프로필 만들기',exact:true}).waitFor();
   await family.waitFor();assert.equal(await pay.isDisabled(),true);assert.equal(requests.length,before);
   missingProfile=false;await page.reload();await page.getByRole('heading',{name:'마음을 맡길 준비'}).waitFor();
   await page.getByRole('radio',{name:/패밀리 이용권/}).waitFor();await page.evaluate(()=>window.__failEligibility=true);
   await pay.click();await page.getByText('결제를 취소했어요. 상담 내용은 그대로 남아 있어요.').waitFor();
   await page.getByRole('button',{name:'보유 혜택 다시 확인하기'}).click();await page.getByText(/보유 혜택을 모두 확인하지 못했어요/).waitFor();
   assert.equal(await page.getByText('사용 가능한 패밀리 이용권이 없어요.').count(),0);
   await page.evaluate(()=>{window.__failEligibility=false;window.__noFamily=true;sessionStorage.removeItem('yeongnyangi:checkout-method');});hasPacks=true;
   await page.getByRole('button',{name:'다시 확인하기',exact:true}).click();
   await page.getByRole('radio',{name:/고등어 5회 이용권/}).waitFor();assert.equal(await page.getByRole('radio',{name:/고등어 5회 이용권/}).isChecked(),true,'applicable pack is selected when Family is unavailable');await page.getByRole('button',{name:'상담 시작하기',exact:true}).click();
   await page.getByText('이용권 적용 상태를 확인하지 못했어요. 같은 상담에서 다시 확인해 주세요.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'상담 시작하기',exact:true}).isEnabled(),true);
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('role')),'status','failed payment moves focus to recovery');
   await page.screenshot({path:path.join(output,'checkout-error-390.png'),fullPage:true});
   await page.getByText('질문의 주제와 범위 확인',{exact:true}).click();await page.getByLabel(/^주제/).selectOption('career');
   assert.equal(await page.getByRole('button',{name:'상담 시작하기',exact:true}).isDisabled(),true);
   await page.getByLabel('비교할 선택지 또는 준비 목표').fill('지금 회사와 새 회사');await page.getByLabel('꼭 지켜야 할 조건').fill('없음');await page.getByLabel('살펴볼 기간',{exact:true}).fill('올해 안');
   assert.equal(await page.getByRole('button',{name:'상담 시작하기',exact:true}).isEnabled(),true);
   guest=true;await page.evaluate(()=>{sessionStorage.setItem('test-guest','1');localStorage.clear();});await page.reload();
   await page.getByRole('button',{name:'로그인하고 이어가기',exact:true}).click();await page.waitForURL('**/login**');
   const draft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('yeongnyangi:consultation-login-draft')));assert.equal(draft.chatStep,'checkout');assert.ok(draft.question.includes('새로운 관계'));
   guest=false;await page.evaluate(()=>sessionStorage.removeItem('test-guest'));await page.goto(base+'/yeongnyangi/fortune/');await page.getByRole('heading',{name:'마음을 맡길 준비'}).waitFor();
   console.log('PASS guest login and restored question/product/context');
   console.log('PASS variants: edited intent, keyboard, moonstones, direct, missing profile, lookup error, wallet pagination, pack retry, required context');
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: immediate checkout, no early charge, Family choice, cancel/retry, reload, no overflow`);
  await context.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());fs.rmSync(temp,{recursive:true,force:true});}
