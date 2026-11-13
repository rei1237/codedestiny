import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
let page;
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  page=await context.newPage();page.setDefaultTimeout(20000);
  const open=async()=>{
    await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
    await page.getByRole('searchbox').fill('숙요점 궁합 전문가');
    await page.getByRole('button',{name:/숙요점 궁합 전문가/}).click();
  };
  const login=async()=>{await page.getByRole('link',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.locator('#self-birth-date').waitFor();};
  await open();await login();
  await page.locator('#self-birth-date').fill('19900102');await page.locator('#partner-birth-date').fill('19930914');
  const buy=page.getByRole('button',{name:'두 사람의 인연 읽기'}).first();
  await page.getByText('1원',{exact:true}).first().waitFor();await buy.click();
  await page.waitForURL(url=>url.searchParams.has('cid'),{timeout:40000});
  const resultUrl=page.url(),stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')));
  const first=await stored();assert.equal(first.orders.length,1);assert.equal(first.intents.length,1);
  const result=first.intents[0][1].result;assert.equal(result.personB.birthDate,'1993-09-14');
  await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();
  await page.getByRole('button',{name:/기록 보관함|구매 기록/}).first().click();
  await page.locator('button.record').first().click();await page.waitForURL(resultUrl);
  await page.getByText(/테스트 전용 예시/).first().waitFor();
  await page.reload();await page.getByText(/테스트 전용 예시/).first().waitFor();
  assert.deepEqual((await stored()).intents,first.intents);
  await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
  await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));await open();await login();
  await page.goto(resultUrl);await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal(await page.getByText(/테스트 전용 예시/).count(),0);
  console.log('PASS Sukuyo expert: home, two birth inputs, mock login and purchase, stored original, purchase history after restart, foreign receipt denied');
}catch(error){console.error(page?.url(),(await page?.locator('body').innerText().catch(()=>''))?.slice(-2200));throw error;}finally{await browser.close();}

