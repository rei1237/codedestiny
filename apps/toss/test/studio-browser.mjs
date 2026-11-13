// Run against the loopback-only dev:offline server with the shipping entry component.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
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
 const next=page.getByRole('button',{name:'상담과 결제 확인하기'});
 await field.focus();await next.scrollIntoViewIfNeeded();
 const box=await next.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=421);
 assert.equal(await field.inputValue(),question);
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
 await owner.evaluate(()=>localStorage.setItem('toss-offline-generation-delay-ms','8000'));
 await owner.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
 await owner.waitForURL(/yeongnyangi\/result/);
 const resultUrl=owner.url();
 assert.equal(await owner.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).fortunes[0][1].fortune.state),'GENERATING');
 const context=owner.context();
 await owner.close();
 const reopened=await context.newPage();
 reopened.setDefaultTimeout(45000);
 await reopened.goto(origin);
 await reopened.locator('.world-entry-yeongnyangi').click();
 await reopened.getByRole('link',{name:'영냥이 보관함'}).click();
 await reopened.locator('a[href*="/yeongnyangi/result/"]').first().click();
 const chapter=reopened.getByText(/이 문단은 화면과 구매 후 열람/).first();
 await chapter.waitFor();
 const original=await chapter.textContent();
 await reopened.reload();
 await chapter.waitFor();
 assert.equal(await chapter.textContent(),original);
 assert.equal(new URL(reopened.url()).searchParams.get('id'),new URL(resultUrl).searchParams.get('id'));
 const counts=()=>reopened.evaluate(()=>{const data=JSON.parse(localStorage.getItem('toss-offline-fixture'));return [data.orders.length,data.fortunes.length,data.fortunes[0][1].generationCount];});
 assert.deepEqual(await counts(),[1,1,1]);
 await reopened.goto(origin);
 await reopened.getByRole('button',{name:'내 정보',exact:true}).click();
 await reopened.getByRole('button',{name:'로그아웃',exact:true}).click();
 await reopened.getByText('로그아웃했어요.').waitFor();
 await reopened.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
 await enter(reopened);
 const identity=await reopened.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture-2')).loggedIn);
 assert.equal(identity,true);
 await reopened.goto(resultUrl);
 await reopened.locator('[role=alert]').first().waitFor();
 assert.equal(await reopened.getByText(original,{exact:true}).count(),0);
 assert.deepEqual(await counts(),[1,1,1]);
 console.log('PASS 360px home → question and birth → virtual order → close during generation → same-account library and stored chapter. One request, one order, one job. Second signed-in person denied the same URL on the same device.');
}finally{await browser.close();}

