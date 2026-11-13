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
  async function fill(group,date,city,unknown){
    await group.getByLabel('양력 생년월일').fill(date);
    if(unknown)await group.getByLabel('태어난 시각을 몰라요').check();
    else await group.getByLabel('태어난 시각',{exact:true}).fill('12:20');
    await group.getByLabel('태어난 도시와 국가').selectOption(city);
  }
  await open('나의 나크샤트라');
  await fill(page.getByRole('group',{name:'나의 출생 정보'}),'1986-03-04','서울, 한국',true);
  await page.getByRole('button',{name:'내 별 읽기'}).click();
  const topics=page.getByRole('region',{name:'주제별 나의 별 읽기'});
  await topics.waitFor();
  const moon=page.getByRole('region',{name:/오늘의 달/});
  await moon.waitFor();assert.ok(await moon.locator('p').count()>=3);
  assert.equal(await topics.getByRole('article').count(),5);
  await topics.getByRole('article').last().getByText('이 해석의 근거 보기').click();
  await page.getByText('계산 근거',{exact:true}).click();
  await page.getByText(/출생 시각 미상 · 모의 달 구간/).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')||'{}').loggedIn===true),false);
  await open('나크샤트라 동서 궁합');
  await page.getByRole('button',{name:'토스 로그인하고 궁합 보기'}).click();
  await page.getByRole('button',{name:'토스로 로그인하기'}).click();
  await fill(page.getByRole('group',{name:'나의 출생 정보'}),'1986-03-04','서울, 한국',true);
  await fill(page.getByRole('group',{name:'상대의 출생 정보'}),'1990-08-16','Delhi, India',false);
  await page.getByRole('button',{name:'두 사람의 별 읽기'}).click();
  for(const name of [/통합 총평/,/인도 아쉬타쿠타/,/동양 숙요 격각/])await page.getByRole('heading',{name}).waitFor();
  const india=page.getByRole('heading',{name:/인도 아쉬타쿠타/}).locator('xpath=ancestor::section[1]');
  assert.equal(await india.locator('div.border-b').count(),8);
  assert.equal(await page.locator('a[href^="http"]').count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),0);
  await page.getByRole('button',{name:'다른 상대와 다시 보기'}).click();
  assert.equal(await page.getByRole('group',{name:'상대의 출생 정보'}).getByLabel('양력 생년월일').inputValue(),'1990-08-16');
  console.log('PASS 360px anonymous natal five original topics and evidence, authenticated pair inputs, 8 kuta scores, Eastern relation, no payment.');
}finally{await browser.close();}
