import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 const external=[];await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin)return route.continue();external.push(url.href);return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>console.error(e.message));
 const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:/운명의 나침반/}).click();};
 async function chart(testDraft=false){
   await page.locator('#compass-birth-date').fill('19900512');await page.locator('#compass-gender').selectOption('female');await page.getByRole('checkbox').first().check();
   await page.getByRole('button',{name:'이 정보로 나침반 맞추기'}).click();
   const map=page.locator('input[maxlength]').first();await map.fill('이직을 위해 지금 준비할 일은 무엇인가요');
   if(testDraft){await open();await page.getByRole('button',{name:'작성하던 질문 이어가기'}).click();assert.equal(await map.inputValue(),'이직을 위해 지금 준비할 일은 무엇인가요');}
   const island=page.locator('[style*="--island-art-mobile"]');
   const background=await island.evaluate(el=>getComputedStyle(el).backgroundImage);
   assert.match(background,/premium-destiny-island-mobile/);
   await island.evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.match(/url\("([^"]+)"\)/)[1];const image=new Image();image.src=url;await image.decode();});
   await map.press('Enter');await page.getByRole('button',{name:/결과 확인하기/}).waitFor();await page.getByRole('button',{name:/결과 확인하기/}).click({timeout:60000});
   await page.locator('[data-section="coordinate"] h1').waitFor();
 }
 await open();await chart(true);
 const primary=await page.locator('[data-section="coordinate"] h1').innerText();
 assert.equal(await page.locator('[data-section="coordinate"] span[class*="sysChipOn"]').count(),5);
 assert.equal(await page.locator('[data-section="flow"] [data-trend]').count(),6);
 await page.getByRole('button',{name:/오늘의 한 걸음/}).click();
 await page.locator('img[src$="neo.webp"]').evaluate(image=>image.decode());
 await page.getByRole('checkbox').first().click();await page.getByRole('button',{name:/목적지.*도착/}).click();
 await page.getByText('Destination Reached',{exact:true}).waitFor();
 await open();await page.getByRole('button',{name:'지난 나침반 결과 다시 보기'}).click();assert.equal(await page.locator('[data-section="coordinate"] h1').innerText(),primary);
 await page.getByRole('button',{name:/운명의 갈림길/}).click();await page.getByText('토스 계정으로 로그인하면 계산 결과를 열 수 있어요.').waitFor();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByLabel('갈림길 A 입력').waitFor();
 for(const [name,reveal] of [['운명의 갈림길','두 길 견주기'],['미래 시뮬레이션','미래 시뮬레이션 펼치기'],['삶의 항로','삶의 항로 펼치기']]){
   if(name!=='운명의 갈림길')await page.getByRole('button',{name:new RegExp(name)}).click();
   if(name==='운명의 갈림길'){await page.getByLabel('갈림길 A 입력').fill('새 회사');await page.getByLabel('갈림길 B 입력').fill('현 직장');}
   await page.getByRole('button',{name:new RegExp(reveal)}).click();
   if(name==='운명의 갈림길')await page.getByText('기운이 더 열린 쪽',{exact:true}).waitFor();
   else if(name==='미래 시뮬레이션')await page.getByRole('button',{name:/90일.*순항도/}).click();
   else await page.getByText('3년 뒤',{exact:true}).waitFor();
   await page.getByRole('button',{name:/나침반으로 돌아가기/}).click();
 }
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
 assert.deepEqual(external.filter(url=>!url.startsWith('data:')),[]);
 await page.evaluate(()=>localStorage.setItem('toss-offline-generation-delay-ms','500'));
 await page.getByRole('button',{name:/심층 리포트 열기/}).click();
 await page.waitForURL(/destiny-compass\?resultId=/);
 const result=page.url();
 await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();
 await page.getByRole('button',{name:/기록 보관함|구매 기록/}).first().click();await page.locator('button.record').first().click();
 await page.waitForURL(result);await page.getByText('10 / 10개 장 저장').waitFor();
 assert.equal(await page.locator('[data-saved-compass-chapter]').count(),10);
 const original=await page.locator('[data-saved-compass-chapter]').allInnerTexts();
 await page.reload();await page.getByText('10 / 10개 장 저장').waitFor();
 assert.deepEqual(await page.locator('[data-saved-compass-chapter]').allInnerTexts(),original);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),1);
 await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
 await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
 await open();await chart();await page.getByRole('button',{name:/토스 로그인하고 심층/}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:/심층 리포트 열기/}).waitFor();
 await page.goto(result);await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();
 assert.equal(await page.locator('[data-saved-compass-chapter]').count(),0);
 console.log('PASS 360px compass: public map and free chart, three signed-in free extensions, one synthetic purchase, restart and ten stored chapters; second owner denied.');
}finally{await browser.close();}
