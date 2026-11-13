import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4394);
const browser=await chromium.launch({channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await ctx.newPage();page.setDefaultTimeout(60000);
 async function catalog(){await page.goto(origin);await page.locator('.world-entry-ggulggul').click();return page.getByRole('searchbox',{name:'운세 찾기'});}
 let input=await catalog();
 for(const kind of ['rooms','books','reports']){
   const section=page.locator('.directory-'+kind);await section.scrollIntoViewIfNeeded();
   await section.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
   if(process.env.DIRECTORY_SCREENSHOTS)await section.screenshot({path:process.env.DIRECTORY_SCREENSHOTS+'/'+kind+'.png'});
 }
 const total=await page.locator('.directory-list button').count();
 assert.ok(total>60);
 await input.fill('손금');await page.getByRole('status').filter({hasText:'검색 결과 1개'}).waitFor();
 await page.getByRole('button',{name:'내 손금 리포트',exact:true}).click();await page.waitForURL('**/palm-reading/');
 input=await catalog();await input.fill('작 명');await page.getByRole('button',{name:'사주 작명첩',exact:true}).click();await page.waitForURL('**/naming-ai/');
 input=await catalog();await input.fill('네오');
 assert.ok(await page.locator('.directory-list button').count()>=4);
 await page.getByRole('button',{name:/네오 · 팩폭 전략실/}).click();await page.waitForURL('**/neo-operation-room/');
 input=await catalog();await input.fill('작전실');await page.getByRole('button',{name:'네오 작전 결정서 · 이메일 상담',exact:true}).click();await page.waitForURL('**/neo-consultation/');
 input=await catalog();await input.fill('서재 웹툰');await page.getByRole('button',{name:/달빛 상담 웹툰 서가/}).click();await page.waitForURL('**/consultations/stories');
 input=await catalog();await input.fill('찾을수없는테스트');await page.getByRole('status').filter({hasText:'일치하는 운세가 없어요'}).waitFor();assert.equal(await page.locator('.directory-list button').count(),0);
 await page.getByRole('button',{name:'검색어 지우기'}).click();assert.equal(await page.locator('.directory-list button').count(),total);assert.ok(await input.evaluate(i=>i===document.activeElement));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS 360px home: '+total+' searchable destinations, palm/naming/Neo strategy+email/books actual routes, artwork and empty results.');
}finally{await browser.close();}
