import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readDailyOracle} from '../../../lib/fortune/olympus-daily.mjs';

const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  const requests=[];
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    requests.push(url.pathname);
    return route.continue();
  });
  const page=await context.newPage();
  await page.clock.install({time:new Date(2026,10,14,12)});
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:/올림푸스 오늘의 신탁/}).click();
  const submit=page.getByRole('button',{name:'신탁 듣기'});
  await submit.click();
  assert.equal(await page.getByLabel('생년월일').evaluate(input=>input.validity.valueMissing),true);
  for(const date of ['1993-03-21','1993-03-20']){
    const {signInfo,element,oracle}=readDailyOracle(date,new Date(2026,10,14,12));
    await page.getByLabel('생년월일').fill(date);
    await submit.click();
    const result=page.getByRole('article');
    await result.getByRole('heading',{name:signInfo.name+'의 오늘'}).waitFor();
    for(const value of [element.faction,oracle.theme,oracle.prophecy,oracle.action,oracle.lucky,String(oracle.num),oracle.time]){
      assert.ok((await result.innerText()).includes(value),value);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    await page.getByRole('button',{name:'다른 별자리 보기'}).click();
  }
  assert.equal(requests.some(path=>/\/orders\/|\/checkout|\/auth\/me/.test(path)),false);
  console.log('PASS Olympus guest home → manual date → two boundary signs, original daily prophecy, action and all luck fields; no checkout.');
}finally{await browser.close();}
