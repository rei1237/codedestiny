import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const origin=process.env.GIFT_UI_ORIGIN || 'http://127.0.0.1:18290';
if (!['127.0.0.1','localhost'].includes(new URL(origin).hostname)) throw new Error('Gift UI tests require loopback mock server');
const out='.cache/gift-ui'; mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const summary=[];
try {
 for(const width of [360,390,430,1280]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  let claimed=0;
  const gift={giftId:'gift_test',orderId:'test',status:'PAID',senderName:'달빛 친구',recipientName:'소중한 당신',giftMessage:'올해 좋은 일만 생기길. 당신의 새로운 시작을 응원해요.',expiresAt:'2027-09-09T00:00:00Z',tokenVersion:0,product:{name:'스탠다드 30일',tier:'standard',durationDays:30,wonPrice:9900}};
  await context.route('**/*', async route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='127.0.0.1') return route.abort();
   const send=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,...data})});
   if(u.pathname==='/api/payments/gifts/preview') return send({gift});
   if(u.pathname==='/api/payments/gifts/account') return send({displayName:'수령 테스트 계정'});
   if(u.pathname==='/api/payments/gifts/claim') {claimed++;return send({gift:{...gift,status:'CLAIMED'}});}
   if(u.pathname==='/api/payments/subscription/confirm') return send({purchaseType:'GIFT'});
   if(u.pathname==='/api/payments/gifts/gift_test') return send({gift});
   if(u.pathname==='/api/payments/gifts/gift_test/link') return send({gift:{...gift,tokenVersion:1,hasLink:true},claimPath:'/gift/claim#token='+'a'.repeat(64)});
   if(['/api/payments/gifts/sent','/api/payments/gifts/received'].includes(u.pathname)) return send({gifts:[gift],nextCursor:null});
   return route.continue();
  });
  const page=await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('cancelled','AbortError'); } }); });
  await page.goto(origin+'/gift/claim#token='+'a'.repeat(64));
  await page.getByRole('button',{name:'이 계정으로 선물 받기'}).waitFor({timeout:90000});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Horizontal overflow '+width);
  await page.screenshot({path:`${out}/claim-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'이 계정으로 선물 받기'}).click();
  await page.getByText('선물을 받았어요. 이용권이 계정에 적용되었습니다.').waitFor();
  if(claimed!==1) throw new Error('Duplicate UI claim');
  await page.goto(origin+'/gift/complete?orderId=test');
  await page.getByRole('heading',{name:'선물이 준비되었습니다'}).waitFor({timeout:90000});
  await page.getByRole('button',{name:'선물 링크 만들기'}).click();
  await page.getByRole('button',{name:'카카오톡으로 보내기'}).waitFor();
  await page.getByRole('button',{name:'공유하기',exact:true}).click();
  if(await page.getByText('선물 링크를 복사했어요.').count()) throw new Error('Share cancellation must not copy');
  await page.screenshot({path:`${out}/complete-${width}.png`,fullPage:true});
  await page.goto(origin+'/gift/box');
  await page.getByRole('heading',{name:'스탠다드 30일'}).waitFor({timeout:90000});
  await page.getByRole('button',{name:'받은 선물',exact:true}).click();
  await page.getByText('달빛 친구님이 보낸 선물').waitFor();
  await page.screenshot({path:`${out}/box-${width}.png`,fullPage:true});
  summary.push({width,claimCalls:claimed,overflow:false,surfaces:['claim','complete','box']});
  await context.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:844}});
 let authenticated=false, contextSaved=false, resumed=false;
 const g={giftId:'gift_login',status:'PAID',senderName:'친구',recipientName:'',giftMessage:'',product:{name:'30일 이용권',tier:'standard',durationDays:30,wonPrice:9900}};
 await c.route('**/*', async route=>{
  const u=new URL(route.request().url());
  if(u.hostname!=='127.0.0.1') return route.abort();
  const send=(status,data,headers={})=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(data)});
  if(u.pathname==='/api/payments/gifts/preview') {const body=route.request().postDataJSON();resumed=resumed||(!body.token&&contextSaved);return send(200,{gift:g});}
  if(u.pathname==='/api/payments/gifts/account') return send(authenticated?200:401,{displayName:'복귀 계정'});
  if(u.pathname==='/api/payments/gifts/context') {contextSaved=true;return send(200,{ok:true},{'Set-Cookie':'cd_gift_context=test-context; Path=/api/payments/gifts; HttpOnly; SameSite=Lax'});}
  if(u.pathname==='/api/payments/gifts/claim') return send(200,{gift:{...g,status:'CLAIMED'}});
  return route.continue();
 });
 const p=await c.newPage();
 await p.goto(origin+'/gift/claim#token='+'a'.repeat(64));
 await p.getByRole('button',{name:'로그인하고 선물 받기'}).click();
 await p.waitForURL(url => url.pathname.replace(/\/$/, '') === '/login');
 const login=new URL(p.url());
 if(login.href.includes('token=')||login.searchParams.get('next')!=='/gift/claim'||!contextSaved) throw new Error('Lost or exposed gift login context');
 // Simulate successful provider callback into the actual next route, with browser storage cleared.
 authenticated=true;
 await p.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 await p.goto(origin+login.searchParams.get('next'));
 await p.getByRole('button',{name:'이 계정으로 선물 받기'}).waitFor();
 if(!resumed) throw new Error('Server gift context not restored');
 await p.getByRole('button',{name:'이 계정으로 선물 받기'}).click();
 await p.getByText('선물을 받았어요. 이용권이 계정에 적용되었습니다.').waitFor();
 summary.push({loginContext:true,storageLoss:true,shareCancellation:true});
 await c.close();
 writeFileSync(`${out}/results.json`,JSON.stringify(summary,null,2));
 console.log(summary);
} finally {await browser.close();}
