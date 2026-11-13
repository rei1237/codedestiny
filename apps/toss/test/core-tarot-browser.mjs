import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4396';
if(new URL(origin).hostname!=='127.0.0.1')throw Error('Loopback only');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,locale:'ko-KR',reducedMotion:'reduce'});
  const writes=[],errors=[];
  await context.route('**/*',route=>{
    const req=route.request();
    if(req.method()==='POST')writes.push(req.url());
    return new URL(req.url()).origin===origin?route.continue():route.abort();
  });
  const page=await context.newPage();
  // The native shell dispatches the overlay event first, then a page event if it was unhandled.
  const nativeBack=()=>page.evaluate(()=>{
    if(window.dispatchEvent(new Event('code-destiny:toss-overlay-back',{cancelable:true})))window.dispatchEvent(new Event('code-destiny:toss-back',{cancelable:true}));
  });
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  page.setDefaultTimeout(20000);
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:/타로 리딩/}).first().click();
  await page.getByRole('button',{name:/오늘의 타로/}).click();
  for(const label of ['오늘의 운세','연애운','재회운','직장·커리어운','재물운','건강운','시험·합격운','대인관계운']){
    await page.getByRole('button',{name:label,exact:true}).click();
    await page.getByRole('heading',{name:'십성 작동 방식'}).waitFor();
    assert.ok((await page.locator('article').filter({hasText:'봉인 오라클'}).innerText()).length>20);
    await page.waitForFunction(()=>document.querySelector('.paper img')?.naturalWidth>0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'다른 분야 보기'}).click();
  }
  await page.getByRole('button',{name:'리딩 목록'}).click();
  await page.getByRole('button',{name:/태양 회복 타로/}).click();
  await page.getByRole('button',{name:'태양 리딩 시작'}).click();
  for(let i=0;i<4;i++)await page.getByRole('button',{name:new RegExp('^'+(i+1)+'\\. ')}).click();
  await page.getByRole('button',{name:'회복 리딩 열기',exact:true}).click();
  const prompt=page.locator('#tarotHealingAiPromptOutput');
  await prompt.waitFor({state:'attached'});
  assert.ok((await prompt.inputValue()).length>500);
  assert.equal(await page.locator('article').count()>=7,true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await nativeBack();
  await page.getByRole('heading',{name:'카드를 하나씩 열어보세요'}).waitFor();
  await page.getByRole('button',{name:'홈',exact:true}).click();
  await page.getByRole('button',{name:/자기 기준 회복 타로/}).click();
  const frame=page.frameLocator('iframe[title="다시 내 편에 서는 타로"]');
  await frame.getByRole('button',{name:/다시 내 편에 서기/}).click();
  for(let i=1;i<=5;i++)await frame.getByRole('button',{name:i+'번째 카드',exact:true}).click();
  await frame.getByRole('button',{name:'오늘의 기준 열기'}).click();
  await frame.getByRole('heading',{name:'다시 세워지는 나의 기준'}).waitFor();
  const self=frame.locator('#tarotSelfEsteemAiPromptOutput');
  assert.ok((await self.inputValue()).length>800);
  assert.equal(await frame.locator('.tarot-self-esteem-slot.has-flipped').count(),5);
  assert.ok(await self.evaluate(el=>el.ownerDocument.documentElement.scrollWidth<=el.ownerDocument.defaultView.innerWidth));
  await frame.getByRole('button',{name:'새 기준으로 다시 보기'}).click();
  await frame.getByRole('button',{name:/다시 내 편에 서기/}).waitFor();
  await nativeBack();
  await page.getByRole('heading',{name:'카드에 담긴, 나의 이야기'}).waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log('PASS 360px ordinary home: all eight one-card categories, original four sun cards, five self-esteem positions, both generated prompts and restart, no writes.');
}finally{await browser.close();}
