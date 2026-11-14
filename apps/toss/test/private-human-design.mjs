import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
export async function verifyHumanDesign(origin,context){
 let page=await context.newPage();page.setDefaultTimeout(35000);
 const directory=async(title)=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(title);await page.locator('.directory-list button').filter({hasText:title}).first().click();};
 const shot=async(name)=>{if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'human-design-'+name+'.png')});}};
 const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
 const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
 try{
  await directory('휴먼 디자인');await page.getByRole('button',{name:'토스 로그인하고 살펴보기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'차트 살펴보기'}).waitFor();
  // Create a time-known owned profile through the existing profile form.
  await directory('흑월의 경고 상담');await page.getByRole('button',{name:'새 프로필 만들기'}).click();
  const form=page.locator('form').filter({has:page.locator('input[name=name]')});
  await form.locator('input[name=name]').fill('모의 생시');await form.locator('input[name=date]').fill('19900101');await form.getByPlaceholder('08:35').fill('0835');await form.locator('button[type=submit]').click();await form.waitFor({state:'hidden'});
  await directory('휴먼 디자인');await page.getByRole('button',{name:'내 프로필 확인하기'}).click();
  const profile=page.getByRole('region',{name:'휴먼 디자인 저장 프로필'}).locator('select');await profile.selectOption({index:1});
  assert.equal(await page.getByLabel('태어난 시각',{exact:true}).inputValue(),'08:35');await page.getByRole('button',{name:'차트 살펴보기'}).click();await page.locator('#hd-manual-title').waitFor();
  assert.equal(await page.locator('polygon[data-center]').count(),9);
  await page.waitForFunction(()=>{const svg=document.querySelector('[aria-label="휴먼 디자인 차트"] svg');return svg&&svg.getAnimations({subtree:true}).every(animation=>animation.playState==='finished');});
  for(const id of ['hd-type','hd-profile','hd-centers','hd-channels','hd-gates'])assert.equal(await page.locator('#'+id).count(),1);
  assert.equal((await ledger()).orders.length,0);
  for(const width of [360,390,430]){await page.setViewportSize({width,height:740});await page.locator('[aria-label="휴먼 디자인 차트"] svg').first().evaluate(el=>window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-64,behavior:'instant'}));await fits();await shot('free-'+width);}
  await page.getByRole('link',{name:'휴먼 디자인 프리미엄 리포트',exact:true}).click();
  await page.locator('#human-design-report-profile').selectOption({index:2});
  assert.equal(await page.getByLabel('태어난 시각',{exact:true}).inputValue(),'08:35');
  for(const width of [360,390,430]){await page.setViewportSize({width,height:740});await page.getByLabel('태어난 날짜',{exact:true}).scrollIntoViewIfNeeded();await fits();await shot('input-'+width);}
  await page.reload();assert.equal(await page.getByLabel('태어난 시각',{exact:true}).inputValue(),'08:35');
  await page.getByRole('button',{name:'리포트 시작하기',exact:true}).click();await page.waitForURL(/intentId=/);
  const id=new URL(page.url()).searchParams.get('intentId'),ownedUrl=page.url();assert.ok(id);
  await page.close();page=await context.newPage();page.setDefaultTimeout(35000);
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();await page.locator('article a[href*="'+id+'"]').last().click();
  await page.locator('section[id^=hd-ch-]').last().waitFor();assert.equal(await page.locator('section[id^=hd-ch-]').count(),18);
  const original=await page.locator('article').innerText();assert.match(original,/모의 결과/);
  for(const width of [360,390,430]){await page.setViewportSize({width,height:740});await page.locator('section[id^=hd-ch-]').first().scrollIntoViewIfNeeded();await fits();await shot('report-'+width);}
  const saved=await ledger();assert.equal(saved.orders.length,1);assert.equal(saved.intents[0][1].generationCount,1);
  await page.reload();await page.locator('section[id^=hd-ch-]').last().waitFor();assert.equal(await page.locator('article').innerText(),original);assert.deepEqual(await ledger(),saved);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await directory('휴먼 디자인');await page.getByRole('button',{name:'토스 로그인하고 살펴보기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'차트 살펴보기'}).waitFor();
  await page.goto(ownedUrl);await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal(await page.locator('section[id^=hd-ch-]').count(),0);assert.equal((await ledger()).orders.length,0);
  console.log('PASS Human Design AIT: 360/390/430px home, owned profile, free guide, mock purchase, 18 source chapters, archive/restart same original, one generation, account B denied');
 }catch(error){console.error('human-design',page.url(),(await page.locator('body').innerText()).slice(-2400));throw error;}
}
