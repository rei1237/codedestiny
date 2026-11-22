import assert from 'node:assert/strict';
import {FREE_PROMO_GROUPS} from '../../../lib/marketing/free-promo.mjs';
import {freeFortuneHref} from '../src/free-fortune-routes.mjs';

export async function verifyFreeHub(origin,context){
 const page=await context.newPage();
 try{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:/무료 운세 전체 보기/}).click();
  await page.getByRole('heading',{name:'무료 운세 전체 목록'}).waitFor();
  for(const group of FREE_PROMO_GROUPS){
   const item=page.locator('[data-free-item="'+group.items[0].id+'"]');
   await item.locator('xpath=ancestor::details/summary').click();
   for(const feature of group.items){
    const target=freeFortuneHref(feature),card=page.locator('[data-free-item="'+feature.id+'"]');
    assert.equal(await card.isVisible(),true,feature.id);
    assert.equal(await card.getAttribute('href'),target,feature.id);
    await card.locator('img').evaluate(img=>img.decode());
   }
  }
  const headings={skillTree:/사주 리포트/,natal:/사주 리포트/,seasonRhythm:/사주 리포트/,bias:/최애/,animal:/동물점/,compat:/두 사람의 사주 궁합/,manse:/만세력/,today:/오늘 운세/,career:/나의 일 스타일/,tarot:/오늘의 타로/,ziwei:/자미두수/,sukuyo:/숙요점/,vedic:/베다/,astro:/서양 점성술/,humanDesign:/휴먼 디자인/,promptHub:/프롬프트/};
  for(const feature of FREE_PROMO_GROUPS.flatMap(group=>group.items)){
   const card=page.locator('[data-free-item="'+feature.id+'"]');
   if(!await card.isVisible())await card.locator('xpath=ancestor::details/summary').click();
   await card.click();
   await page.waitForURL(url=>url.pathname+url.search===freeFortuneHref(feature));
   await page.getByRole('heading',{name:headings[feature.id]||/기본 사주/}).first().waitFor();
   if(['skillTree','natal','seasonRhythm'].includes(feature.id))assert.equal(await page.getByLabel('풀이 선택').inputValue(),feature.id==='skillTree'?'rpt_skillTreeCard':'saju_natal_reading');
   await page.goBack();await page.getByRole('heading',{name:'무료 운세 전체 목록'}).waitFor();
  }
  const compatibility=page.locator('[data-free-item=compat]');
  if(!await compatibility.isVisible())await compatibility.locator('xpath=ancestor::details/summary').click();
  await compatibility.click();
  for(const [label,date] of [['나의 출생정보','1990-08-20'],['상대의 출생정보','1989-05-06']]){
   const area=page.getByRole('group',{name:label});await area.getByLabel('태어난 날짜').fill(date);await area.getByLabel('출생 도시').selectOption('서울');await area.getByRole('checkbox').check();
  }
  await page.getByLabel('상대의 이름이나 호칭').fill('달빛');await page.getByLabel('관계 유형').selectOption('friend');
  await page.getByRole('button',{name:'기본 궁합 보기'}).click();
  await page.locator('.compat-grade-label').filter({hasText:'달빛'}).waitFor();await page.locator('.pastlife-cross-title').first().waitFor();
  assert.equal(await page.getByText('토스로 궁합 열기').count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length||0),0);
  await page.getByRole('link',{name:'무료 운세 목록 보기'}).click();
  await page.locator('details').filter({has:page.locator('[data-free-item=brain]')}).locator('summary').click();
  await page.locator('[data-free-item=brain]').click();
  await page.getByLabel('태어난 날짜').fill('1992-05-07');await page.getByLabel('출생 도시').selectOption('서울');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'나의 명식 보기'}).click();
  await page.locator('#daBrainTitle').waitFor();assert.equal(await page.locator('[data-da-engine]').count(),5);
  await page.locator('[data-da-engine] summary').first().click();assert.equal(await page.locator('[data-da-engine][open]').count(),1);
  assert.equal(await page.locator('[data-da-act=login]').count(),0);
  await page.getByRole('button',{name:'출생정보 다시 보기'}).click();await page.getByRole('checkbox').uncheck();
  await page.getByLabel('태어난 시각',{exact:true}).fill('08:30');await page.getByRole('button',{name:'나의 명식 보기'}).click();
  await page.locator('[data-da-act=login]').first().click();
  await page.getByLabel('베다 차트의 출생 성별').selectOption('female');
  await page.getByRole('button',{name:'휴먼 디자인·베다 함께 보기'}).click();
  await page.locator('#daVedicTitle').waitFor();await page.locator('[data-da-view=both]').click();
  assert.equal(await page.locator('[data-da-view=both]').getAttribute('aria-pressed'),'true');
  await page.getByLabel('결과 이미지 형식').selectOption('story');
  await page.getByRole('button',{name:'뇌구조 이미지 저장'}).click();
  await page.getByText('뇌구조 이미지를 저장했어요.').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('private-file-saves')||'[]').at(-1)?.height),1920);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length||0),0);
 }finally{await page.close();}
}
