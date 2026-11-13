import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4393),web='https://code-destiny.com';
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
 const visits=[],unexpected=[];
 await context.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.origin===origin)return route.continue();
   if(u.origin===web&&request.isNavigationRequest()&&request.method()==='GET'){
     const headers=await request.allHeaders();assert.ok(!headers.authorization);assert.ok(!headers.referer);
     visits.push(u.pathname+u.search);
     return route.fulfill({contentType:'text/html',body:'<p>Mock of web account login boundary</p>'});
   }
   if(request.method()!=='GET')unexpected.push(u.pathname);
   return route.abort();
 });
 const p=await context.newPage();p.setDefaultTimeout(75000);
 await p.goto(origin);await p.getByRole('button',{name:'내 정보',exact:true}).click();
 async function openLink(label,expected){
   const link=p.getByRole('link',{name:label,exact:true});
   assert.equal(await link.getAttribute('href'),web+expected);
   const pop=context.waitForEvent('page');await link.click();const page=await pop;await page.waitForURL(web+expected);await page.locator('p').waitFor();
   assert.equal(page.url(),web+expected);assert.ok(await page.evaluate(()=>window.opener===null));await page.close();
 }
 await p.getByText('웹 이용권·월정석 내역',{exact:true}).click();await openLink('웹 이용 내역 열기','/points/history/');
 await p.goto(origin);await p.locator('.world-entry-ggulggul').click();await p.getByRole('button',{name:/자미두수 상세 풀이/}).click();
 await p.getByText('기존 운명의 섬 상담',{exact:true}).click();
 await openLink('웹 구매 기록 열기','/records/');await openLink('웹 12궁 심층 리포트 확인','/island-consult/?view=report');
 assert.deepEqual(visits,['/points/history/','/records/','/island-consult/?view=report']);assert.deepEqual(unexpected,[]);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS 360px settings and Ziwei routes → separate web history and archive only. No identity, referer, purchase URL or POST forwarded.');
}finally{await browser.close();}
