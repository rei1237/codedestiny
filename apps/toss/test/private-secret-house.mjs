import assert from 'node:assert/strict';
export async function verifyPrivateSecretHouse(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(12000);
 try{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('button',{name:/^사주 리포트/}).click();
  await page.getByLabel('풀이 선택').selectOption('rpt_secretHouseEntryCard');
  await page.getByRole('button',{name:'선택한 풀이 보기'}).click();
  const frame=page.frameLocator('iframe[title="시크릿 하우스 합숙"]');
  await frame.getByRole('button',{name:/나의 운명 찾기/}).click();
  await frame.locator('.stem-card').first().waitFor({state:'visible'});console.log('Secret House entered');
  await frame.locator('.stem-card').first().click();await frame.locator('#stemConfBtn').click();
  assert.equal(await frame.locator('.char-card').count(),5);
  console.log('Secret House portraits');for(const portrait of await frame.locator('.char-portrait img').all()){await portrait.scrollIntoViewIfNeeded();await portrait.evaluate(img=>Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Image decode: '+img.currentSrc+' '+img.loading)),8000))]));}
  console.log('Secret House images decoded');await frame.getByRole('button',{name:/합숙 시작하기/}).click();await frame.locator('#screen-scene.active').waitFor();
  for(let step=0;step<170;step++){if(step%10===0)console.log('Secret House step',step);
   if(await frame.locator('#screen-final.active').count())break;
   const action=frame.locator('#rxnOverlay.show button, #screen-scene.active #choices .choice-btn:not(:disabled), #screen-scene.active #sceneQ.typing').first();
   await action.waitFor({state:'visible'});await action.click();
   if(await frame.locator('#screen-final .final-card').count())break;
  }
  await frame.locator('#screen-final.active .final-card').first().click();await frame.locator('#revealBtn').click();
  await frame.locator('#screen-result.active #resCard').waitFor();assert.ok((await frame.locator('#resCard').innerText()).length>100);
  await frame.getByRole('button',{name:/다시 도전/}).click();await frame.getByRole('button',{name:/나의 운명 찾기/}).waitFor();
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger?.orders?.length||0,0);assert.equal(ledger?.loggedIn||false,false);
  console.log('PASS private Secret House: guest home, five decoded original portraits, original choices/reactions/ending, restart, no orders');
 }finally{await page.close();}
}
