import assert from 'node:assert/strict';

export async function verifyYeonStarHug(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 const next=page.locator('.cd-yehwa-button--primary:visible').last();
 const enter=async()=>{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
  await page.locator('#fortune-directory-query').fill('연이의 마음 별자리');
  await page.getByRole('button',{name:/연이의 마음 별자리/}).click();
  await page.waitForURL(/\/yeon-star-hug\//);
 };
 try{
  await enter();
  await page.getByText('로그인 없이 무료로 볼 수 있어요.').waitFor();
  await page.getByRole('button',{name:'마음 별자리 시작'}).click();
  await page.locator('section[aria-labelledby="gf-title-emotion"] button').first().click();
  for(const step of ['name','date','time','confirm']){
   await page.locator('#gf-title-'+step).waitFor();await next.click();
  }
  await page.locator('#star-hug-sign').selectOption('물고기자리');await next.click();
  const concern=page.locator('#star-hug-concern');await concern.fill('요즘 새로운 일을 앞두고 마음이 바빠요.');
  await page.reload();await concern.waitFor();
  assert.equal(await concern.inputValue(),'요즘 새로운 일을 앞두고 마음이 바빠요.');
  await next.click();
  const save=page.getByRole('button',{name:'상징 카드 저장하기'});await save.waitFor();
  await save.click();await page.waitForFunction(()=>localStorage.getItem('private-star-hug-save'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('private-star-hug-save')),'yeon-heart-card-물고기자리-happy.svg');
  await page.getByRole('button',{name:'별자리 메시지 공유하기'}).click();
  await page.waitForFunction(()=>localStorage.getItem('private-star-hug-share')==='opened');
  const stored=()=>page.evaluate(()=>sessionStorage.getItem('toss:yeon-star-hug:guest:result'));
  const exact=await stored();const result=JSON.parse(exact);
  assert.equal(result.consultation.sign,'물고기자리');assert.ok(result.reading.categories.length>=4);
  const url=page.url();
  await page.reload();await save.waitFor();assert.equal(await stored(),exact);
  await page.getByText(result.reading.summary.description,{exact:true}).first().waitFor();
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await page.goto(url);await page.getByRole('button',{name:'마음 별자리 시작'}).waitFor();
  assert.equal(await stored(),null);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
}
