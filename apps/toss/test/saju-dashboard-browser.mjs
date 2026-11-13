import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4397';
assert.equal(new URL(origin).hostname,'127.0.0.1');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:360,height:760},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error')console.log('console',msg.text().slice(0,220));});
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(origin);const button=text=>page.getByRole('button',{name:text});
 await button(/운세 골라보기/).click();await button(/^기본 사주/).click();await page.getByLabel('태어난 날짜',{exact:true}).fill('1992-05-07');
 await page.getByLabel('태어난 시각',{exact:true}).fill('08:30');await page.getByLabel('출생 도시').selectOption('서울');
 await button('나의 명식 보기').click();
 for(const [label,selector] of [['극T 테스트','.t-summary-card'],['테토 vs 에겐','[data-tetogen-premium-report]'],['사주네컷 · 운명 필터','.s4c-frame'],['도파민·집중력과 공부법','#dp-study-title'],['퀀텀 로또 리포트','#lottoRitualReportArea:not([hidden])'],['사주 AI 프롬프트','[data-saju-image-prompt]']]){
   await button(label).click();
   if(label.includes('네컷')){await button(/러브DM/).click();await button('스티커 붙이기').click();}
   if(label.includes('도파민'))await button('나의 몰입과 공부법 보기').click();
   if(label.includes('프롬프트')){await page.getByLabel('그림 프롬프트에 사용하는 성별').selectOption('F');await page.getByLabel('그림 주제').selectOption('avatar');assert.equal(await page.getByLabel('그림 주제').locator('option').count(),13);}
   if(label.includes('테토'))await page.locator('#hormoneVibeResult summary').click();
   if(label.includes('로또')){await page.getByLabel('대운 계산에 사용하는 성별').selectOption('M');await button('이번 주 상징 번호 열기').click();await button(/달빛 럭키 리추얼 리포트/).click();}
   await page.locator(selector).first().waitFor({state:'visible',timeout:15000});
   assert.deepEqual(await page.evaluate(()=>[innerWidth,document.documentElement.scrollWidth]),[360,360]);
   console.log(label,'360px');
   await button('다른 사주 풀이 보기').click();
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
