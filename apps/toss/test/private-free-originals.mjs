import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import example from '../private-simulation/free-original-examples.json' with {type:'json'};
import {vedicReadingModule} from '../canonical/vedic-reading.mjs';
import {vedicSourceBridge} from '../service/vedic-source-bridge.mjs';
const {createVedicReader}=await import('data:text/javascript;base64,'+Buffer.from(vedicReadingModule({factory:true})).toString('base64'));
const chartFor=payload=>{const reader=createVedicReader(vedicSourceBridge(payload.samples));return {reader,chart:reader.buildChart(payload.input,undefined,payload.natal||null)};};
const mine=chartFor(example.compatibility.mine),partner=chartFor(example.compatibility.partner);
const expectedCompatibility=mine.reader.renderVedicCompatibility(mine.chart,partner.chart,mine.reader.calcCompatibility(mine.chart.nak.name,partner.chart.nak.name));

export async function verifyPrivateFreeOriginals(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(25000);
 const capture=async name=>{if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,name+'.png'),fullPage:true});}};
 const home=async title=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(title);await page.locator('.directory-list button').filter({hasText:title}).first().click();};
 const sizes=async()=>{for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}};
 try{
  await home('베다점 출생차트');await page.getByRole('button',{name:'아쉬타쿠타 궁합',exact:true}).click();
  await page.getByRole('button',{name:'토스 로그인하고 궁합 살펴보기'}).click();await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
  await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await capture('vedic-compat-input');await page.getByRole('button',{name:'아쉬타쿠타 궁합 펼치기'}).click();await page.locator('.toss-vedic-reading').waitFor();
  const compatibility=await page.locator('.toss-vedic-reading').innerText();assert.match(compatibility,/36/);
  const originalText=await page.evaluate(html=>{const node=document.createElement('div');node.innerHTML=html;return node.textContent.replace(/\s+/g,' ').trim();},expectedCompatibility);
  assert.ok((await page.locator('.toss-vedic-reading > div').textContent()).replace(/\s+/g,' ').trim().includes(originalText));await capture('vedic-compat-result');await sizes();
  await page.getByRole('button',{name:'출생정보 다시 보기'}).click();assert.equal(await page.getByLabel('상대 이름',{exact:true}).inputValue(),'상대');await page.getByRole('button',{name:'아쉬타쿠타 궁합 펼치기'}).click();assert.equal(await page.locator('.toss-vedic-reading').innerText(),compatibility);
  await page.getByRole('button',{name:'프라슈나 질문 차트',exact:true}).click();await page.getByRole('button',{name:'계약',exact:true}).click();await page.getByLabel('위도',{exact:true}).fill('37.5665');await page.getByLabel('경도',{exact:true}).fill('126.978');await page.getByRole('button',{name:'질문 차트와 프롬프트 만들기'}).click();
  await page.getByRole('heading',{name:'질문한 순간'}).waitFor();assert.equal(await page.getByLabel('분석 프롬프트').inputValue(),example.prashna.promptText);await page.getByText('계산한 차트 펼치기',{exact:true}).click();assert.deepEqual(JSON.parse(await page.locator('pre').innerText()),example.prashna.chart);await capture('prashna-result');await sizes();
  await page.evaluate(()=>window.dispatchEvent(new Event('code-destiny:toss-back',{cancelable:true})));assert.equal(await page.getByLabel('위도',{exact:true}).inputValue(),'37.5665');
  await home('운명의 꽃');await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByRole('button',{name:'나의 꽃 살펴보기'}).click();await page.locator('.flower-result').nth(3).waitFor();
  for(const row of Object.values(example.flower.sources)){assert.equal(row.state,'ready');await page.getByRole('heading',{name:row.flower.name,exact:true}).first().waitFor();assert.ok((await page.locator('.flower-results').innerText()).includes(row.narrative));}
  for(const art of await page.locator('.flower-art').all())await art.evaluate(async image=>{await image.decode();if(!image.naturalWidth)throw Error('Flower image missing');});await capture('flower-result');await sizes();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(state.orders.length,0);assert.equal(state.loggedIn,true);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await home('운명의 꽃');await page.getByRole('button',{name:'토스 로그인하고 살펴보기'}).waitFor();assert.equal(await page.locator('.flower-result').count(),0);
  console.log('PASS private original Vedic compatibility/Prashna and four flowers, login/free policy, original copy, native back, account reset, 3 widths, zero orders');
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-1800));throw error;}finally{await page.close();}
}
