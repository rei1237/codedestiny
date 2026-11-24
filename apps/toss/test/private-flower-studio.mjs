import assert from 'node:assert/strict';
import example from '../private-simulation/free-original-examples.json' with {type:'json'};

export async function verifyFlowerStudio(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(20000);
 async function enter(){
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
  await page.locator('#fortune-directory-query').fill('운명의 꽃');
  await page.getByRole('button',{name:/운명의 꽃/}).first().click();
 }
 try{
  await enter();await page.getByRole('button',{name:'토스 로그인하고 살펴보기'}).click();
  await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
  await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByRole('button',{name:'나의 꽃 살펴보기'}).click();
  const studio=page.getByRole('region',{name:'운명의 꽃 아틀리에'});
  const card=studio.getByRole('article',{name:'개화 해석'});
  const expected={};
  for(const [source,row] of Object.entries(example.flower.sources)){
   await studio.getByLabel('해석할 꽃').selectOption(source);
   await card.getByRole('heading',{name:row.flower.name,exact:true}).waitFor();
   const detail=card.locator('details').filter({hasText:'꽃이 피어난 근거와 실천'});if(!await detail.evaluate(e=>e.open))await detail.locator('summary').click();
   assert.ok((await detail.innerText()).includes(row.studio.matched.flower_data.relationship_theme));
   const prompts=card.locator('details').filter({hasText:'꽃 그림 프롬프트'});
   if(!await prompts.evaluate(e=>e.open))await prompts.locator('summary').click();
   const positive=await prompts.locator('.flower-prompt').first().innerText();
   assert.ok(positive.includes(row.flower.scientific_name));expected[source]=positive;
   await studio.getByRole('button',{name:'개화 기록에 저장'}).click();
   await studio.getByText('개화 기록에 저장했어요.').waitFor();
  }
  await card.getByRole('button',{name:'프롬프트 세트 복사'}).click();
  await page.waitForFunction(()=>localStorage.getItem('private-flower-copy')==='pack');
  await card.getByRole('button',{name:'꽃 이야기 공유하기'}).click();
  await page.waitForFunction(()=>localStorage.getItem('private-flower-share')==='opened');
  await enter();
  const history=studio.getByText('나의 개화 기록 4개',{exact:true});await history.click();
  await studio.getByRole('button',{name:/코스모스 · 사주/}).click();
  await card.getByRole('heading',{name:'코스모스'}).waitFor();
  await card.getByText('꽃 그림 프롬프트',{exact:true}).click();
  assert.equal(await card.locator('.flower-prompt').first().innerText(),expected.saju);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await enter();await page.getByRole('button',{name:'토스 로그인하고 살펴보기'}).click();await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
  await studio.getByText('나의 개화 기록 0개',{exact:true}).waitFor();assert.equal(await card.count(),0);
 }finally{await page.close();}
}
