import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const base = process.argv[2];
assert.equal(new URL(base).hostname, '127.0.0.1');
mkdirSync('build-cache/forest-profile', { recursive: true });
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const context = await browser.newContext({ viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce' });
  let signedIn=false, failSave=false, failProfile=false, failSpirit=false, equippedId='spirit-03';
  let profiles=[], currentId='';
  const user={id:'forest-test',_id:'forest-test',name:'검수'};
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.abort();
    if(signedIn && url.pathname==='/api/rpg/character-preview'){
      const second=route.request().postDataJSON().birthDate==='1991-02-03';
      const character=second?{id:'animal-dog',name:'강아지',ganji:'갑술',element:'목'}:{id:'animal-rabbit',name:'토끼',ganji:'을묘',element:'목'};
      return route.fulfill({json:{ok:true,character,fortune:null}});
    }
    if(failSpirit && url.pathname==='/api/rpg/characters')return route.fulfill({status:503,json:{ok:false}});
    if(signedIn && url.pathname==='/api/rpg/characters')return route.fulfill({json:{ok:true,equippedId,ownedIds:['spirit-03'],balance:0}});
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
      if(failProfile && url.pathname==='/api/profile')return route.fulfill({status:503,json:{ok:false}});
      if(url.pathname==='/api/profile')return route.fulfill({json:{ok:true,profiles,currentId,profileAccess:{mode:'multi'}}});
      return route.fulfill({json:{ok:true,products:[],progress:{currentLevel:1,currentLevelExp:0,nextLevelExp:100}}});
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({status:401,json:{ok:false}});
    if (url.pathname === '/ggulggul/') return route.fulfill({contentType:'text/html',body:readFileSync('public/ggulggul/index.html')});
    return route.continue();
  });
  await context.addCookies([{name:'cd_cookie_consent',value:'essential',url:base}]);
  const page=await context.newPage();
  page.on('pageerror', error=>console.error(error.stack));
  page.setDefaultTimeout(45000);
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForSelector('#home-question + button:not(:disabled)',{state:'attached'});
  await page.locator('#daily-home-title').scrollIntoViewIfNeeded();
  const gate=page.locator('#homeForest');
  const walk=page.locator('dialog[open]');
  const guestCreate=gate.getByRole('link',{name:'가입하고 카드 만들기',exact:true});
  const goToLogin=new URL(await guestCreate.getAttribute('href'),base);
  assert.equal(goToLogin.pathname,'/login/');
  assert.equal(goToLogin.searchParams.get('next'),'/#daily-home-title');
  await gate.getByRole('heading',{name:'프로필 카드와 출석 혜택',exact:true}).waitFor();
  await gate.getByText('프로필 카드 예시',{exact:true}).waitFor();
  await gate.getByRole('button',{name:'출석 혜택 둘러보기',exact:true}).click();
  await walk.getByRole('heading',{name:'프로필 카드와 출석 혜택',exact:true}).waitFor();
  await walk.getByRole('button',{name:'오솔길',exact:true}).click();
  await walk.getByRole('heading',{name:'둘째 걸음, 작은 실천'}).waitFor();
  await walk.getByRole('button',{name:'닫기',exact:true}).click();
  await guestCreate.click();await page.waitForURL(u=>u.pathname==='/login/');
  console.log('PASS guest sees the example, can walk and can choose sign-in with the forest return URL');
  signedIn=true;
  await context.addInitScript(user=>{
    localStorage.setItem('fortune_auth_user',JSON.stringify(user));
    localStorage.setItem('fortune_auth_token','forest-mock-token');
  },user);
  await page.goto(base+goToLogin.searchParams.get('next'),{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#home-question + button:not(:disabled)',{state:'attached'});
  await walk.waitFor().catch(async error=>{
    console.error('Forest return',page.url(),(await page.locator('body').innerText()).slice(0,600));
    await page.screenshot({path:'build-cache/forest-profile/login-return-failure.png'});
    throw error;
  });
  await walk.getByRole('button',{name:'오솔길',exact:true}).click();
  const create=walk.getByRole('button',{name:'첫 카드 만들기',exact:true});
  await create.click();
  const frame=page.frameLocator('dialog[open] iframe');
  await frame.locator('#nameInput').fill('취소할 카드');
  await walk.getByRole('button',{name:'숲길로 돌아가기',exact:true}).click();
  assert.equal(await walk.locator('[aria-current="step"]').innerText(),'오솔길');
  await page.waitForFunction(el=>el===document.activeElement,await create.elementHandle(),{timeout:3500}).catch(async error=>{
    console.error('Editor cancel focus:',await page.evaluate(()=>[document.activeElement?.tagName,document.activeElement?.textContent?.slice(0,100)]));throw error;
  });
  console.log('PASS login return and cancelling embedded editor keeps the current forest step and focus');
  await create.click();
  await frame.locator('#nameInput').waitFor();
  await page.evaluate(()=>window.postMessage({type:'cd:forest-card',state:'saved'},location.origin));
  assert.equal(await walk.locator('iframe').count(),1);
  await page.frames().find(f=>f.url().includes('forestCard=')).evaluate(()=>parent.postMessage({type:'cd:forest-card',state:'saved'},location.origin));
  await walk.locator('iframe').waitFor({state:'detached'});
  assert.equal(await walk.locator('[aria-current="step"]').innerText(),'오솔길');
  await create.click();
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
  profiles.push({...profiles[0],id:'second',profileId:'second',name:'두 번째',birth:{...profiles[0].birth,year:1991,month:2,day:3}});
  await walk.getByRole('button',{name:'카드 바꾸기',exact:true}).click();
  await walk.locator('iframe').scrollIntoViewIfNeeded();
  await frame.locator('[data-profile-id="second"]').click();
  await walk.locator('iframe').waitFor({state:'detached'});
  assert.equal(currentId,'second');
  await walk.getByText('두 번째 카드',{exact:true}).filter({visible:true}).waitFor();
  assert.equal(await walk.locator('[aria-current="step"]').innerText(),'오솔길');
  console.log('PASS server-confirmed existing profile selection keeps forest step (mock API)');
  async function confirmPortrait(container, sprite, cardName) {
    await container.getByText(cardName+' 카드',{exact:true}).filter({visible:true}).waitFor();
    const handle=await container.elementHandle();
    await page.waitForFunction(([root,id])=>[...root.querySelectorAll('img,[role="img"]')].some(el=>{
      const rect=el.getBoundingClientRect();
      const src=el.currentSrc || getComputedStyle(el).backgroundImage;
      return rect.width>=48 && rect.height>=48 && src.includes('/'+id+'.webp');
    }),[handle,sprite]);
    await handle.dispose();
  }
  async function confirmSteps(sprite, label) {
    for (const step of ['등불','오솔길','샘터','숲 지도']) {
      await walk.getByRole('navigation',{name:'숲길 걸음'}).getByRole('button',{name:step,exact:true}).click();
      await confirmPortrait(walk,sprite,label);
    }
  }
  await confirmSteps('spirit-03','두 번째');
  await walk.getByRole('button',{name:'오솔길',exact:true}).click();
  const identity=walk.locator('[data-forest-profile="second"]');
  assert.match(await identity.innerText(),/일주 동물 · 강아지/);
  assert.match(await identity.innerText(),/장착 정령 · 초승달 토끼/);
  assert.match(await identity.innerText(),/갑술 · 목/);
  await page.screenshot({path:'build-cache/forest-profile/member-equipped-path.png',style:'nextjs-portal{display:none}'});
  await walk.getByRole('button',{name:'닫기',exact:true}).click();
  await walk.waitFor({state:'hidden'});
  await confirmPortrait(gate,'spirit-03','두 번째');
  await gate.scrollIntoViewIfNeeded();await page.screenshot({path:'build-cache/forest-profile/member-equipped.png',style:'nextjs-portal{display:none}'});
  equippedId=null;
  // Re-enter from the public home, independent of the previous login return fragment.
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await gate.scrollIntoViewIfNeeded();
  await confirmPortrait(gate,'animal-dog','두 번째');
  await gate.getByRole('button',{name:'출석 혜택 확인하기',exact:true}).click();
  await confirmSteps('animal-dog','두 번째');
  console.log('PASS selected second profile, equipped spirit and unequipped day animal at gate, lantern, path, spring and map');
  for (const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:844});
    await walk.getByRole('button',{name:'오솔길',exact:true}).click();
    await page.screenshot({path:'build-cache/forest-profile/forest-'+width+'.png'});
    assert(await walk.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  }
  await walk.getByRole('button',{name:'닫기',exact:true}).click();
  failSpirit=true;
  await page.reload({waitUntil:'domcontentloaded'});await gate.scrollIntoViewIfNeeded();
  const retryPortrait=gate.getByRole('button',{name:'캐릭터 다시 불러오기',exact:true});
  await retryPortrait.waitFor();
  assert.equal(await gate.locator('[data-character-id]').count(),0);
  failSpirit=false;await retryPortrait.click();
  await confirmPortrait(gate,'animal-dog','두 번째');
  failProfile=true;
  await page.reload({waitUntil:'domcontentloaded'});await gate.scrollIntoViewIfNeeded();
  const retry=gate.getByRole('button',{name:'카드 다시 불러오기',exact:true});
  await retry.waitFor();assert.equal(await guestCreate.count(),0);
  failProfile=false;await retry.click();
  await confirmPortrait(gate,'animal-dog','두 번째');
  console.log('PASS profile lookup failure shows retry, preserves membership and recovers selected portrait');
} finally { await browser.close(); }
