import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();
  const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:/디비야 요가/}).click();};
  const login=async()=>{await page.getByRole('button',{name:'토스 로그인하고 수련 입력하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();};
  const mood=page.getByLabel('오늘의 몸과 마음');
  const frame=page.frameLocator('iframe[title="단계별 수련 지도"]');
  await open();await login();
  let firstResult='';
  for(const minutes of [30,60]){
    const text='테스트 · '+minutes+'분 동안 마음을 차분하게 정리하고 싶어요.';
    await mood.fill(text);
    await page.getByRole('radio',{name:new RegExp(minutes+'분')}).check();
    await open();assert.equal(await mood.inputValue(),text);
    await page.evaluate(()=>localStorage.setItem('toss-offline-generation-delay-ms','1500'));
    await page.getByRole('button',{name:'나의 수련 코스 만들기'}).click();
    await page.waitForURL(/yoga-guru\?resultId=/);
    const resultUrl=page.url();if(!firstResult)firstResult=resultUrl;
    await page.getByText('구매한 수련 코스를 준비하고 있어요.',{exact:true}).waitFor();
    await page.goto(origin);
    await page.getByRole('button',{name:'내 정보',exact:true}).click();
    await page.getByRole('button',{name:/기록 보관함|구매 기록/}).first().click();
    await page.locator('button.record').first().click();await page.waitForURL(resultUrl);
    await frame.getByText('테스트 전용 '+minutes+'분 수련',{exact:true}).waitFor();
    assert.equal(await frame.locator('.step-card').count(),4);
    await frame.locator('.step-header').nth(3).click();
    await frame.locator('.step-card.expanded').last().getByText('모의 단계 안내 4',{exact:true}).waitFor();
    await frame.locator('#musicToggleBtn').click();
    await frame.locator('#musicNextBtn').click();
    await frame.getByText('Lotus Moon Chamber',{exact:true}).first().waitFor();
    await page.reload();
    await frame.locator('.step-card.expanded').getByText('모의 단계 안내 4',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await open();
  }
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),2);
  await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
  await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
  await open();await login();assert.equal(await mood.inputValue(),'');
  await page.goto(firstResult);await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal(await page.locator('iframe[title="단계별 수련 지도"]').count(),0);
  console.log('PASS 360px yoga: home → login → saved mood and 30/60 minutes → synthetic IAP → leave → owned record → original steps, music and restored position → second owner denied.');
}finally{await browser.close();}

