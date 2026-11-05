import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [base,output]=process.argv.slice(2);
assert.equal(new URL(base).hostname,'127.0.0.1');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const page=await context.newPage();
 page.setDefaultTimeout(60000);
 const go=async()=>{await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('form button:not(:disabled)');};
 const btn=name=>page.getByRole('button',{name,exact:true});
 const fill=async(q)=>{await page.locator('#home-question').fill(q);await btn('내 질문에 맞는 상담 찾기').click();};
 const shot=async(name)=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:output+'/'+name+'.png',style:'nextjs-portal{display:none}'});};
 await go();
 const consent=btn('필수만 사용');await consent.waitFor();await consent.click();
 await btn('먼저 연락해도 될까요?').click();assert.equal(await page.locator('#home-question').inputValue(),'먼저 연락해도 될까요?');
 await fill(' ');await page.getByText('궁금한 내용을 한 줄 적어 주세요.').waitFor();await btn('먼저 연락해도 될까요?').click();
 await page.locator('#home-question').fill('');await page.locator('#home-question').blur();await shot('01-start');
 const cases=[
 ['헤어진 뒤 자꾸 제 탓 같아요. 마음을 좀 정리하고 싶어요.','연이의 운명의 찻집','/fortune-tea-house/','textarea,input'],
 ['연락을 한 번 더 할지, 여기서 멈출지 기준을 정하고 싶어요.','네오의 팩폭 전략실','/neo-operation-room/','#neo-operation-question'],
 ['사주로 제가 연애에서 반복하는 패턴을 알고 싶어요.','운세보는 영냥이','/yeongnyangi/fortune/','textarea'],
 ['위로보다 타로 카드로 지금 관계를 보고 싶어요.','우리는 무슨 사이? · 관계 타로','/tarot/love/',null]];
 for(const [i,[q,name,path,selector]] of cases.entries()){
   await go();await fill(q);await page.getByRole('heading',{name,exact:true}).waitFor();
   if(i===1)await shot('03-match');
   const link=page.locator('section[aria-labelledby="homeCardTitle"] a').first();await link.click({timeout:120000});
   await page.waitForURL(u=>u.pathname===path,{timeout:120000});assert(!decodeURIComponent(page.url()).includes(q));
   if(selector){
     await page.waitForFunction(([s,v])=>Array.from(document.querySelectorAll(s)).some(el=>el.value===v&&el.getBoundingClientRect().height>0),[selector,q],{timeout:60000});
     const field=page.locator(selector).filter({visible:true});for(const el of await field.all()){if(await el.inputValue()===q){await el.fill(q+' 수정');break;}}
   }else await page.locator('h1').first().waitFor();
   console.log('PASS',i+1,path,selector?'editable original':'menu');
 }
 // Verify the letter intake when the existing consultation-room flag is enabled, too.
 await context.route('**/api/fortune-chat/consultations/status',r=>r.fulfill({json:{enabled:true}}));
 await go();await fill(cases[0][0]);await page.getByRole('link',{name:'이 질문으로 연이와 상담하기'}).click();
 await page.waitForFunction(v=>document.querySelector('#yeoni-question')?.value===v,cases[0][0]);console.log('PASS letter intake flag');
 await go();await fill('연애가 고민이에요.');await shot('02-followup');await page.goBack();assert.equal(await page.locator('#home-question').inputValue(),'연애가 고민이에요.');
 await fill('연애가 고민이에요.');await btn('직접 답하기').click();await page.locator('#home-answer').fill('카드를 뽑아 지금 상황을 보고 싶어요.');await btn('답변 반영하기').click();
 await page.getByRole('heading',{name:cases[3][1]}).waitFor();assert.equal(await page.getByRole('link',{name:'관계 타로 배열 보기'}).getAttribute('href'),'/tarot/love/');
 await btn('이전 답변 수정하기').click();assert.match(await page.locator('#home-answer').inputValue(),/카드/);await btn('판단할 기준을 세우고 싶어요.').click();await page.getByRole('heading',{name:cases[1][1]}).waitFor();
 await btn('처음 질문 수정하기').click();await page.setViewportSize({width:360,height:390});const long='연락을 기다리며 '.repeat(60)+'기준이 필요해요.';await fill(long);assert.equal(await page.locator('section[aria-labelledby="homeCardTitle"] p').first().textContent(),long);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS 5 followup/edit/short viewport/long question');
 await go();await page.getByText('운세 종류로 찾기',{exact:true}).click();await page.locator('details nav').getByRole('link',{name:'타로',exact:true}).click();await page.waitForURL('**/tarot/');await page.locator('h1').first().waitFor();console.log('PASS 6 /tarot/');
}finally{await browser.close();}
