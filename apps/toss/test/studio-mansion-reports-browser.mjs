import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();
  const open=async title=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:new RegExp(title)}).click();};
  await open('나크샤트라 택일');
  await page.getByRole('button',{name:'토스 로그인하고 리포트 보기'}).click();
  await page.getByRole('button',{name:'토스로 로그인하기'}).click();
  await page.getByLabel('출생 프로필').selectOption('mock-profile');
  const purpose=page.getByLabel('택일 목적');
  assert.equal(await purpose.locator('option').count(),6);
  await purpose.selectOption('moving');await page.getByLabel('살펴볼 시작일').fill('2026-11-14');
  await page.getByRole('button',{name:'택일 리포트 보기'}).click();
  await page.getByText('기간의 모든 날짜 · 60일',{exact:true}).click();
  const days=page.locator('details').filter({has:page.getByText('기간의 모든 날짜 · 60일',{exact:true})});
  assert.equal(await days.locator('p').count(),60);
  assert.ok((await days.innerText()).includes('2027-01-12'));
  await page.getByText('추천 날짜',{exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
  await open('나크샤트라 VVIP 코덱스');
  await page.getByLabel('출생 프로필').selectOption('mock-profile');
  await page.getByRole('button',{name:'코덱스 펼치기'}).click();
  const terrain=page.locator('details').filter({hasText:'제3장 · 27수 지형에서의 내 자리'});
  await terrain.locator('summary').click();
  assert.equal(await terrain.locator('p b').count(),27);
  const chapters=page.locator('details.paper');
  assert.equal(await chapters.count(),5);
  await chapters.last().locator('summary').click();
  assert.ok(await chapters.last().getByRole('heading',{level:3}).count()>2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),0);
  console.log('PASS 360px guest → home → login → owned profile → 6 purposes, 60-day election → reopen home → VVIP five chapters, 27 mansions, no payment.');
}finally{await browser.close();}
