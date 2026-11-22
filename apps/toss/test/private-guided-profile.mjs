import assert from 'node:assert/strict';

export async function verifyGuidedProfile(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const openForm=async()=>{const section=page.locator('details').filter({has:page.locator('summary').filter({hasText:'상담 프로필'})});await section.waitFor();if(!await section.evaluate(el=>el.open))await section.locator('summary').click();const add=page.getByRole('button',{name:'다른 사람 출생정보 입력',exact:true});await page.locator('input[name=name]').or(add).first().waitFor();if(await add.isVisible())await add.click();};
 const enter=async()=>{
  await page.goto(origin);await page.locator('.world-entry-yeongnyangi').click();
  for(const section of await page.locator('.world-disclosure>summary').all())await section.click();
  await page.getByRole('button',{name:/서양 점성술 상담/}).first().click();
  await page.locator('#yn-question').fill('지금 준비할 일을 차근차근 알고 싶어요.');
  await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();
  await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
  await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
  await page.waitForURL(/yeongnyangi\/fortune/);
 };
 try{
  await enter();await openForm();
  await page.locator('input[name=name]').fill('모의 계정 A 작성 중');
  await page.getByRole('button',{name:'다음',exact:true}).click();
  await page.locator('input[name=date]').fill('19900101');
  await page.locator('select[name=calendar]').selectOption('lunar_leap');
  await page.getByRole('button',{name:'다음',exact:true}).click();
  await page.locator('[data-profile-step="2"] input[type=checkbox]').check();
  await page.getByRole('button',{name:'다음',exact:true}).click();
  const route=page.url();await page.reload();
  await page.locator('[data-profile-step="3"]:not([hidden])').waitFor();
  assert.equal(await page.locator('input[name=name]').inputValue(),'모의 계정 A 작성 중');
  assert.equal(await page.locator('select[name=calendar]').inputValue(),'lunar_leap');
  assert.equal(await page.locator('aside[aria-label="상담과 결제 요약"]').isVisible(),false);
  await page.evaluate(()=>window.dispatchEvent(new Event('code-destiny:toss-overlay-back',{cancelable:true})));
  await page.locator('[data-profile-step="2"]:not([hidden])').waitFor();
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await enter();await openForm();
  assert.equal(page.url(),route);assert.equal(await page.locator('input[name=name]').inputValue(),'');
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('A')]);
  await page.goto(route);await page.locator('[data-profile-step="2"]:not([hidden])').waitFor();
  assert.equal(await page.locator('input[name=name]').inputValue(),'모의 계정 A 작성 중');
  await page.getByRole('button',{name:'다음',exact:true}).click();
  await page.getByRole('button',{name:'저장하고 계속',exact:true}).click();
  const edit=page.getByRole('button',{name:'선택한 프로필 수정',exact:true});await edit.click();
  assert.equal(await page.locator('input[name=name]').inputValue(),'모의 계정 A 작성 중');
  await page.locator('input[name=name]').fill('모의 계정 A 수정');
  for(let step=0;step<3;step++)await page.getByRole('button',{name:'다음',exact:true}).click();
  await page.getByRole('button',{name:'저장하고 계속',exact:true}).click();
  await page.getByRole('button',{name:/모의 계정 A 수정/}).waitFor();
  await page.reload();
  const profileSection=page.locator('details').filter({has:page.locator('summary').filter({hasText:'상담 프로필'})});
  await profileSection.waitFor();if(!await profileSection.evaluate(el=>el.open))await profileSection.locator('summary').click();
  assert.equal(await page.getByRole('button',{name:/모의 계정 A 수정/}).count(),1);
  assert.equal(await page.getByRole('button',{name:/모의 계정 A 작성 중/}).count(),0);
  console.log('PASS selected owner profile creation, selection, correction and saved list after relaunch');
  console.log('PASS guided profile: home entry, 4 steps, reload, native back, A/B account isolation, A draft restored');
 }catch(error){console.error('guided profile',page.url(),(await page.locator('body').innerText()).slice(-2400));throw error;}finally{await page.close();}
}
