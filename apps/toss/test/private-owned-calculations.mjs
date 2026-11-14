import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';

// Exercise the shipped archive, keeping its explicitly labelled mock astronomy.
// These checks cover navigation/rendering/ownership, not astronomical accuracy.
export async function verifyOwnedCalculations(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(45000);
 const open=async title=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(title);await page.locator('.directory-list button').filter({hasText:title}).first().click();};
 const capture=async name=>{for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,name+'-'+width+'.png'),fullPage:true});}}};
 try{
  await open('나크샤트라 택일');await page.getByRole('button',{name:'토스 로그인하고 리포트 보기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
  await page.getByLabel('출생 프로필').selectOption('mock-profile');
  assert.equal(await page.getByLabel('택일 목적').locator('option').count(),6);
  await page.getByLabel('택일 목적').selectOption('moving');await page.getByLabel('살펴볼 시작일').fill('2026-11-14');await page.getByRole('button',{name:'택일 리포트 보기'}).click();
  await page.getByText('기간의 모든 날짜 · 60일',{exact:true}).click();
  const days=page.locator('details').filter({has:page.getByText('기간의 모든 날짜 · 60일',{exact:true})});assert.equal(await days.locator('p').count(),60);assert.match(await days.innerText(),/2027-01-12/);await capture('mansion-muhurta');
  await open('나크샤트라 VVIP 코덱스');await page.getByLabel('출생 프로필').selectOption('mock-profile');await page.getByRole('button',{name:'코덱스 펼치기'}).click();
  const terrain=page.locator('details').filter({hasText:'제3장 · 27수 지형에서의 내 자리'});await terrain.locator('summary').click();assert.equal(await terrain.locator('p b').count(),27);assert.equal(await page.locator('details.paper').count(),5);await capture('mansion-vvip');
  await open('나크샤트라 지배성 리포트');await page.getByLabel('출생 프로필').selectOption('mock-profile');await page.getByRole('button',{name:'리포트 펼치기'}).click();await page.locator('details.paper').first().waitFor();assert.equal(await page.locator('details.paper').count(),11);await capture('mansion-lord');
  await open('나크샤트라 다샤 인생지도');await page.getByLabel('출생 프로필').selectOption('mock-profile');await page.getByRole('button',{name:'리포트 펼치기'}).click();
  const timeline=page.getByRole('region',{name:'다샤 시기별 주기'});await timeline.waitFor();const periods=await timeline.locator('details').count();assert.ok(periods>=9);assert.equal(await timeline.locator('ul li').count(),periods*9);await capture('mansion-dasha');
  console.log('PASS private four mansion reports: owned profile, 60 days, 27 mansions, five/eleven chapters, full dasha timeline');

  await open('오늘의 운세');const systems=page.getByRole('region',{name:'네 체계의 운세'});await systems.getByLabel('상담 프로필').selectOption('mock-profile');
  for(const system of ['saju','sukuyo','vedic','number']){await systems.getByLabel('해석 체계').selectOption(system);await systems.locator('article h3').waitFor();assert.ok((await systems.locator('article').innerText()).length>20);}
  await systems.getByText('계산',{exact:true}).click();await systems.getByText('개인일수',{exact:true}).waitFor();
  await page.getByRole('button',{name:'오늘의 세 장 펼치기'}).click();for(let slot=1;slot<=3;slot++)await page.getByRole('button',{name:slot+'번째 카드 고르기',exact:true}).click();
  for(const label of ['오늘의 마음','마주할 흐름','작은 실천'])await page.getByRole('button',{name:label+' 자리의 카드 펼치기',exact:true}).click();
  const verdict=page.getByText('오늘 · 세 장을 모두 읽은 결론',{exact:true});await verdict.waitFor();const reading=await verdict.locator('..').innerText();
  assert.equal(await page.locator('#daily-tarot img').evaluateAll(async images=>{await Promise.all(images.map(image=>image.decode()));return images.every(image=>image.naturalWidth>0);}),true);await capture('today-cards');
  await page.reload();await verdict.waitFor();assert.equal(await verdict.locator('..').innerText(),reading);
  console.log('PASS private today: four mock systems, original number details, three original card images, saved same-account reading');

  await open('올림푸스 오늘의 신탁');await page.getByRole('button',{name:'내 신탁과 커플 궁합 보기'}).click();await page.getByLabel('저장된 프로필').selectOption('mock-profile');await page.getByLabel('태어난 시각 (선택)').fill('08:30');await page.getByRole('button',{name:'내 신탁 펼치기'}).click();
  await page.getByRole('heading',{name:'테스트 프로필의 신탁'}).waitFor();assert.equal(await page.locator('.planet-grid button').count(),8);await page.locator('.planet-grid button').last().click();
  await page.getByRole('tab',{name:'궁합 탭'}).click();await page.getByPlaceholder('상대방 이름').fill('모의 상대');await page.locator('input[type=date]').fill('1992-09-06');await page.getByRole('button',{name:'궁합 분석하기'}).click();await page.getByText('행성별 케미 분석',{exact:true}).waitFor();assert.equal(await page.locator('.compat-bar').count(),4);await capture('olympus-compat');
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger.orders.length,0);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await open('오늘의 운세');await page.getByRole('button',{name:'토스 로그인하고 카드 펼치기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'오늘의 세 장 펼치기'}).waitFor();assert.equal(await page.getByText('오늘 · 세 장을 모두 읽은 결론',{exact:true}).count(),0);
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')))).orders.length,0);
  console.log('PASS private Olympus: eight placements, partner four-part compatibility; zero purchases; account B does not inherit A cards');
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-1800));throw error;}finally{await page.close();}
}
