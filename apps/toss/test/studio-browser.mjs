// Run against the loopback-only dev:offline server with the shipping entry component.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4329';
const browser=await chromium.launch({channel:'chrome'});
async function account(){
 const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();
 page.setDefaultTimeout(45000);
 return page;
}
async function start(page){
 await page.goto(origin);
 await page.locator('.world-entry-yeongnyangi').click();
 await page.getByRole('button',{name:'사주 상담',exact:false}).first().click();
}
const question='새로운 업무에서 제 강점을 어떻게 활용할 수 있을까요?';
async function enter(page){
 await start(page);
 const field=page.locator('#yn-question');
 await field.fill(question);
 await page.setViewportSize({width:360,height:420});
 await page.getByRole('button',{name:'상담과 결제 확인하기'}).scrollIntoViewIfNeeded();
 assert.ok(await field.isVisible());
 await page.setViewportSize({width:360,height:740});
 await page.reload();
 await field.waitFor();
 assert.equal(await field.inputValue(),question);
 await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.waitForURL(/yeongnyangi\/fortune/);
 await page.locator('[data-yn-checkout]').waitFor();
}
try{
 const owner=await account();
 await enter(owner);
 assert.equal(await owner.evaluate(()=>window.innerWidth),360);
 assert.ok(await owner.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 const newProfile=owner.getByRole('button',{name:'새 프로필 만들기'});
 if(!await newProfile.isVisible())await owner.getByText(/상담 프로필 ·/).first().click();
 await owner.getByRole('button',{name:'새 프로필 만들기'}).click();
 const form=owner.locator('form').filter({has:owner.locator('input[name=name]')});
 await form.locator('input[name=name]').fill('모의 프로필');
 await form.locator('input[name=date]').fill('19900101');
 await form.locator('input[type=checkbox]').check();
 await form.locator('button[type=submit]').click();
 await form.waitFor({state:'hidden'});
 await owner.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
 await owner.waitForURL(/yeongnyangi\/result/);
 const resultUrl=owner.url();
 const chapter=owner.getByText(/이 문단은 화면과 구매 후 열람/).first();
 await chapter.waitFor();
 const original=await chapter.textContent();
 await owner.goto(origin);
 await owner.locator('.world-entry-yeongnyangi').click();
 await owner.getByRole('link',{name:'영냥이 보관함'}).click();
 await owner.locator('a[href*="/yeongnyangi/result/"]').first().click();
 await chapter.waitFor();
 assert.equal(await chapter.textContent(),original);
 assert.equal(new URL(owner.url()).searchParams.get('id'),new URL(resultUrl).searchParams.get('id'));
 const count=await owner.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length);
 assert.equal(count,1);
 const other=await account();
 await enter(other);
 await other.goto(resultUrl);
 await other.locator('[role=alert]').first().waitFor();
 assert.equal(await other.getByText(original,{exact:true}).count(),0);
 console.log('PASS 360px home, question draft, mock login, purchase, stored chapter, same-order library reread, second mock session denied');
}finally{await browser.close();}

