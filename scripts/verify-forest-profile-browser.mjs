import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const base = process.argv[2];
assert.equal(new URL(base).hostname, '127.0.0.1');
mkdirSync('build-cache/forest-profile', { recursive: true });
const browser = await chromium.launch({headless:true});
try {
  const context = await browser.newContext({ viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce' });
  let signedIn=false, failSave=false;
  let profiles=[], currentId='';
  const user={id:'forest-test',_id:'forest-test',name:'검수'};
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.abort();
    if(url.pathname==='/api/rpg/character-preview')return route.fulfill({status:503,json:{ok:false,message:'검수 환경에서는 캐릭터 해석을 생략합니다.'}});
    if (signedIn && url.pathname.startsWith('/api/')) {
      if(url.pathname==='/api/auth/me')return route.fulfill({json:{ok:true,user}});
      if(url.pathname==='/api/honey/attendance')return route.fulfill({json:{ok:true,balance:0,attended:false,streak:0,streakEvery:5,streakBonus:4,attendanceEvery:1,nextBonusIn:5,promptCost:1}});
      if(url.pathname==='/api/profile' && route.request().method()==='POST'){
        if(failSave)return route.fulfill({status:400,json:{ok:false,message:'검수 저장 실패'}});
        const body=route.request().postDataJSON();
        const profile={...body.profile,id:body.profileId};
        profiles.push(profile);currentId=profile.id;
        return route.fulfill({json:{ok:true,profile,profiles,currentId}});
      }
      if(url.pathname==='/api/profile/current' && route.request().method()==='PATCH'){
        currentId=route.request().postDataJSON().currentId;
        return route.fulfill({json:{ok:true,currentId,profiles}});
      }
      if(url.pathname==='/api/profile')return route.fulfill({json:{ok:true,profiles,currentId,profileAccess:{mode:'multi'}}});
      return route.fulfill({json:{ok:true,products:[],progress:{currentLevel:1,currentLevelExp:0,nextLevelExp:100}}});
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({status:401,json:{ok:false}});
    if (url.pathname === '/ggulggul/') return route.fulfill({contentType:'text/html',body:readFileSync('public/ggulggul/index.html')});
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror', error=>console.error(error.stack));
  page.setDefaultTimeout(45000);
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
  const consent=page.getByRole('button',{name:'필수만 사용',exact:true});
  await consent.waitFor({state:'visible'});
  await consent.click();
  await page.locator('#daily-home-title').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'프로필 카드 열기',exact:true}).waitFor({state:'visible'});
  await page.getByRole('button',{name:'숲길 들어가기',exact:true}).click();
  const walk=page.locator('dialog[open]');
  await walk.getByRole('button',{name:'오솔길',exact:true}).click().catch(async error => {
    console.log((await page.locator('body').innerText()).slice(-4000));
    await page.screenshot({path:'build-cache/forest-profile/failure.png'}); throw error;
  });
  const openCard=walk.getByRole('button',{name:'프로필 카드 열기',exact:true});
  await openCard.click();
  const frame=page.frameLocator('dialog[open] iframe');
  await frame.locator('#dpListInner .dp-list-empty-cta').waitFor({state:'visible'}).catch(async error=>{
    for(const f of page.frames()) console.log(f.url(), await f.evaluate(()=>({text:document.body.innerText.slice(-1200),open:typeof window.dpOpenList,html:document.documentElement.className})));
    await page.screenshot({path:'build-cache/forest-profile/frame-failure.png'}); throw error;
  });
  await walk.locator('iframe').scrollIntoViewIfNeeded();
  await page.screenshot({path:'build-cache/forest-profile/before-edit.png'});
  await frame.locator('#dpListInner .dp-list-empty-cta').click();
  await frame.locator('#dpFormHost:not([hidden])').waitFor({state:'visible'});
  await frame.locator('#nameInput').scrollIntoViewIfNeeded();
  await frame.locator('#nameInput').fill('숲길 검수');
  assert.equal(await frame.locator('#nameInput').inputValue(),'숲길 검수');
  await page.screenshot({path:'build-cache/forest-profile/editor-390.png'});
  await walk.getByRole('button',{name:'숲길로 돌아가기',exact:true}).click();
  assert.equal(await walk.locator('[aria-current="step"]').innerText(),'오솔길');
  assert.equal(await openCard.evaluate(el=>el===document.activeElement),true);
  console.log('PASS real legacy profile editor embedded; cancel retains forest step and focus');

  // Completion protocol is accepted only from this panel's same-origin frame.
  await openCard.click();
  await frame.locator('#dpListSheet').waitFor({state:'visible'});
  await page.evaluate(()=>window.postMessage({type:'cd:forest-card',state:'saved'},location.origin));
  assert.equal(await walk.locator('iframe').count(),1);
  await page.frames().find(f=>f.url().includes('forestCard=')).evaluate(()=>parent.postMessage({type:'cd:forest-card',state:'saved'},location.origin));
  await walk.locator('iframe').waitFor({state:'detached'});
  assert.equal(await walk.locator('[aria-current="step"]').innerText(),'오솔길');
  console.log('PASS completion source validation and same-step return (mock completion)');

  signedIn=true;
  await context.addInitScript(user=>{
    localStorage.setItem('fortune_auth_user',JSON.stringify(user));
    localStorage.setItem('fortune_auth_token','forest-mock-token');
  },user);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#daily-home-title').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'첫 프로필 카드 만들기',exact:true}).waitFor();
  await page.getByRole('button',{name:'숲길 들어가기',exact:true}).click();
  await walk.getByRole('button',{name:'오솔길',exact:true}).click();
  await walk.getByRole('button',{name:'첫 프로필 카드 만들기',exact:true}).click();
  await walk.locator('iframe').scrollIntoViewIfNeeded();
  await frame.locator('#nameInput').fill('나의 숲길');
  await frame.locator('#birthDate').fill('1990-01-02');
  page.on('dialog',dialog=>{console.log('DIALOG',dialog.message());void dialog.accept();});
  failSave=true;
  await frame.locator('#dpSaveBtn').click();
  await walk.getByRole('button',{name:'숲길로 돌아가기',exact:true}).waitFor({state:'visible'});
  await frame.locator('#dpSaveBtn:not([disabled])').waitFor();
  assert.equal(profiles.length,0);
  assert.equal(await walk.locator('iframe').count(),1);
  await walk.locator('iframe').scrollIntoViewIfNeeded();
  await frame.locator('#dpSaveBtn').focus();

  failSave=false;
  await frame.locator('#dpSaveBtn').press('Enter');
  await walk.locator('iframe').waitFor({state:'detached'});
  assert.equal(profiles.length,1);
  await walk.getByText('나의 숲길 카드',{exact:true}).filter({visible:true}).waitFor();
  assert.equal(await walk.locator('[aria-current="step"]').innerText(),'오솔길');
  console.log('PASS actual create request, failed save preserves editor, retry and server-confirmed return (mock APIs)');
  profiles.push({...profiles[0],id:'second',profileId:'second',name:'두 번째'});
  await walk.getByRole('button',{name:'카드 바꾸기',exact:true}).click();
  await walk.locator('iframe').scrollIntoViewIfNeeded();
  await frame.locator('[data-profile-id="second"]').click();
  await walk.locator('iframe').waitFor({state:'detached'});
  assert.equal(currentId,'second');
  await walk.getByText('두 번째 카드',{exact:true}).filter({visible:true}).waitFor();
  assert.equal(await walk.locator('[aria-current="step"]').innerText(),'오솔길');
  console.log('PASS server-confirmed existing profile selection keeps forest step (mock API)');
  for (const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:844});
    await page.screenshot({path:'build-cache/forest-profile/forest-'+width+'.png'});
    assert(await walk.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  }
} finally { await browser.close(); }
