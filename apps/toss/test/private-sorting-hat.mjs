import assert from 'node:assert/strict';
export async function verifySortingHat(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(22000);
 try{
  const enter=async()=>{
   await page.goto(origin);await page.locator('.world-entry-yeongnyangi').click();
   const room=page.getByRole('button',{name:/영냥이의 방/});
   if(!await room.isVisible())for(const summary of await page.locator('.world-disclosure>summary').all())await summary.click();
   await room.click();await page.locator('[data-hat-entry]').click();await page.waitForURL(/\/yeongnyangi\/hat\//);
  };
  const sort=async()=>{
   await page.getByRole('button',{name:'모자 써보기',exact:true}).click();
   await page.getByRole('button',{name:'이야기 건너뛰기'}).click();
   await page.getByRole('heading',{name:'새벽첨탑',exact:true}).first().waitFor();
  };
  await enter();
  await page.getByText('로그인 후 무료 · 멸치 차감 없이 이용해요').waitFor();
  const directory=page.locator('details').filter({has:page.getByText('여섯 기숙사 둘러보기',{exact:true})});
  await directory.locator('summary').click();
  assert.equal(await directory.locator('article').count(),6);
  for(const art of await directory.locator('img').all())await art.evaluate(async img=>{img.loading='eager';await img.decode();});
  await page.getByRole('button',{name:'로그인하고 모자 써보기'}).click();await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
  await page.waitForURL(/\/yeongnyangi\/hat\//);await sort();
  await page.getByText('확인할 수 있는 출생 정보로 읽은 참고 배정이에요.').waitFor();
  await page.getByText('모자가 남긴 너의 첫인상').waitFor();
  await page.getByText('배정의 바탕, 간단히 보기').click();
  await page.getByText(/자미두수은 이번 해석에서 제외했어요/).waitFor();
  await page.getByRole('button',{name:'내 기숙사 이미지 저장하기'}).click();
  await page.waitForFunction(()=>localStorage.getItem('private-hat-save'));
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('private-hat-save'))),{fileName:'영냥이의-모자-새벽첨탑.png',width:1080,height:1400});
  await page.getByRole('button',{name:'기숙사 이야기 공유하기'}).click();
  await page.waitForFunction(()=>localStorage.getItem('private-hat-share'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('private-hat-share')),'영냥이의 모자 · 새벽첨탑\n완벽한 지도보다, 너의 첫걸음.');
  await enter();await sort();await page.getByText('확인할 수 있는 출생 정보로 읽은 참고 배정이에요.').waitFor();
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await page.getByRole('button',{name:'로그인하고 모자 써보기'}).waitFor();
  assert.equal(await page.locator('#hat-result-title').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('private-hat-save')),null);
 }finally{await page.close();}
}
