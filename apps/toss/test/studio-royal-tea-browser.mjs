import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {royalTeaModule} from '../canonical/royal-tea.mjs';
const {readRoyalTea,INTENTS}=await import('data:text/javascript;base64,'+Buffer.from(royalTeaModule()).toString('base64'));
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  const paths=[];await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();paths.push(url.pathname);return route.continue();});
  const page=await context.newPage();await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:/영국 홍차점/}).click();
  const topic=page.getByLabel('질문 영역');await topic.waitFor();
  const key=await page.evaluate(()=>localStorage.getItem('royal_tea_guest_key'));
  const serials=new Set();
  for(const {id} of INTENTS){
    await topic.selectOption(id);await page.getByRole('button',{name:'찻잔 읽기'}).click();
    const original=readRoyalTea(id,key);serials.add(original.serial);
    const report=page.getByRole('article',{name:original.title});
    await report.waitFor();assert.equal(await report.locator('.cert-zone').count(),3);assert.equal(await report.locator('.cert-block__title').count(),5);
    assert.equal(await report.locator('.cert-cupmap').count(),1);assert.ok((await report.innerText()).includes(original.serial));
    assert.equal(await report.locator('a,script,iframe,[onclick]').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    await page.getByRole('button',{name:'다른 질문으로 읽기'}).click();
  }
  assert.equal(serials.size,5);await page.reload();await topic.selectOption('work');await page.getByRole('button',{name:'찻잔 읽기'}).click();
  assert.ok((await page.getByRole('article').innerText()).includes(readRoyalTea('work',key).serial));
  assert.notEqual(readRoyalTea('work','u:test-account').serial,readRoyalTea('work',key).serial);
  assert.equal(paths.some(path=>/\/auth\/me|\/checkout|\/orders\//.test(path)),false);
  console.log('PASS five guest tea questions → original cup map/three zones/eight sections → relaunch same KST certificate.');
}finally{await browser.close();}
