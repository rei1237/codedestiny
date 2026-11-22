import assert from 'node:assert/strict';

export async function verifyMoonlitLotus(origin,context,{privateAccounts=true}={}){
 const page=await context.newPage();
 page.setDefaultTimeout(18000);
 const errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/__lotus-art/')&&r.status()>=400)missing.push(r.url());});
 const button=name=>page.getByRole('button',{name,exact:true});
 const feature=id=>page.locator('[data-moonlit-feature="'+id+'"]').click();
 const enter=async()=>{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('searchbox').fill('달빛 연화당');await page.locator('.directory-list button').filter({hasText:'달빛 연화당'}).click();
  await page.locator('[data-step="enter"]').waitFor();
 };
 const browse=async()=>{await button('연화당 둘러보기').first().click();await page.locator('[data-scene]').waitFor();};
 const pray=async text=>{await feature('prayer');await page.getByLabel('오늘의 기도').fill(text);await button('기도를 마음에 담기').click();await page.getByText('나의 기록에 조용히 담았어요.',{exact:true}).waitFor();};
 const signIn=async()=>{
  await page.goto(origin);
  await page.locator('.account-entry').waitFor();
  const login=button('토스 로그인');
  if(await login.count()){await login.click();await button('토스로 로그인하기').click();}
  await button('구매 기록').first().waitFor();
 };
 const switchAccount=async id=>{await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption(id)]);await signIn();await enter();await browse();await feature('records');};
 try{
  await enter();await button('빠르게 진행').click();await button('참배 시작하기').click();
  for(const step of ['breathe','incense','bow']){await page.locator('[data-step="'+step+'"]').waitFor();await button('건너뛰기').click();}
  await page.locator('#ritual-wish').fill('달빛을 보며 잠시 쉬기');await page.locator('[data-step="wish"] section button:not([aria-label])').filter({hasText:/연등.*(보내|띄우)/}).click();
  await page.locator('[data-step="dedication"]').waitFor();await browse();
  for(const scene of ['courtyard','hall','pond']){
   await page.getByLabel('장소 선택').selectOption(scene);
   for(const [action,view] of [[null,'front'],['왼편에서 보기','left'],['왼편에서 보기','left-wide'],['정면','front'],['오른편에서 보기','right'],['오른편에서 보기','right-wide'],['정면','front']]){
    if(action)await button(action).click();
    const img=page.locator('[data-scene="'+scene+'"][data-view="'+view+'"] picture img').first();
    await img.waitFor();await img.evaluate(node=>node.decode());
   }
  }
  await feature('custom');const choices=page.locator('[data-companion-choice]');await choices.first().waitFor();assert.equal(await choices.count(),15);
  for(const choice of await choices.all()){await choice.click();assert.equal(await choice.getAttribute('aria-pressed'),'true');await choice.locator('img').evaluate(img=>img.decode());}
  await feature('bow');await page.locator('section[data-activity="bow"]').waitFor();
  await pray('게스트 연화당의 기도');await feature('records');await page.getByText('게스트 연화당의 기도',{exact:true}).waitFor();
  await page.reload();await page.getByText('게스트 연화당의 기도',{exact:true}).waitFor();
  await button('공간 메뉴 열기').click();await button('인증샷 꾸미기').click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.locator('canvas').waitFor();
  if(privateAccounts){await button('PNG로 저장하기').click();await page.waitForFunction(()=>Number(JSON.parse(sessionStorage.getItem('private-lotus-save'))?.width)>0);}
  await button('사진 꾸미기 닫기').click();await feature('info');await page.getByRole('link',{name:/연이가 쉬어가는 이야기/}).click();
  const cuts=page.locator('figure[data-chapter] img');await cuts.first().waitFor();assert.equal(await cuts.count(),15);
  for(const cut of await cuts.all()){await cut.scrollIntoViewIfNeeded();await cut.evaluate(img=>img.decode());}
  if(privateAccounts){
   await signIn();await enter();await browse();await feature('records');await page.getByRole('heading',{name:'마음을 담을 빈 페이지'}).waitFor();
   await pray('A 연화당 기도');await switchAccount('B');await page.getByRole('heading',{name:'마음을 담을 빈 페이지'}).waitFor();await pray('B 연화당 기도');
   await switchAccount('A');await page.getByText('A 연화당 기도',{exact:true}).waitFor();assert.equal(await page.getByText('B 연화당 기도',{exact:true}).count(),0);
   await page.goto(origin);await button('설정·고객지원').click();await button('연결 해제와 탈퇴').click();await button('토스 연결 해제').click();
   await page.getByText('토스 연결을 해제했어요.',{exact:true}).waitFor();await signIn();await enter();await browse();await feature('records');await page.getByRole('heading',{name:'마음을 담을 빈 페이지'}).waitFor();
   await switchAccount('B');await page.getByText('B 연화당 기도',{exact:true}).waitFor();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length||0),0);
  console.log('Moonlit Lotus',privateAccounts?'private A/B unlink and local PNG':'offline guest','6 ritual steps, 3 scenes × 5 views, 15 companions, prayer reopen, 15 story cuts, 0 orders');
 }catch(error){console.error('Moonlit',page.url(),errors,missing,(await page.locator('body').innerText()).slice(-1100));throw error;}
 finally{await page.close();}
}
