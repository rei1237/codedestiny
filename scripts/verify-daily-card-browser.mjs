// 홈 「내 캐릭터 출석부」 브라우저 검수(mock API). 사용: node scripts/verify-daily-card-browser.mjs http://127.0.0.1:<port>
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const base = process.argv[2];
assert.equal(new URL(base).hostname, '127.0.0.1');
const out = 'build-cache/daily-card';
mkdirSync(out, { recursive: true });
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const month = today.slice(0, 7);
const earlier = Number(today.slice(8)) > 2 ? [{ day: `${month}-01`, bonus: false }, { day: `${month}-02`, bonus: true }] : [];
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const context = await browser.newContext({ viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce' });
  let signedIn=false, failSave=false, failProfile=false, failSpirit=false, equippedId='spirit-03';
  let profiles=[], currentId='', attended=false, balance=7, posts=0;
  const user={id:'daily-test',_id:'daily-test',name:'검수'};
  const honey=()=>({ok:true,day:today,balance,attended,streak:attended?4:3,streakEvery:5,streakBonus:4,attendanceEvery:1,nextBonusIn:attended?1:2,promptCost:1,
    monthDays:[...earlier,...(attended?[{day:today,bonus:false}]:[])]});
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
      if(url.pathname==='/api/honey/attendance'){
        if(route.request().method()==='POST'){
          posts+=1;
          const awarded=!attended; if(awarded){attended=true;balance+=1;}
          return route.fulfill({json:{...honey(),awarded,rewarded:awarded?1:0,bonus:0}});
        }
        return route.fulfill({json:honey()});
      }
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
      return route.fulfill({json:{ok:true,products:[],progress:{currentLevel:3,currentLevelExp:40,nextLevelExp:100}}});
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
  const card=page.locator('#homeDailyCard');
  assert.equal(await card.locator('dialog, [role="dialog"]').count(),0,'출석부는 팝업을 쓰지 않는다');
  assert.equal(await page.locator('img[src*="/images/home/forest/"]').count(),0,'숲 그림이 남아 있으면 안 된다');
  await card.getByRole('heading',{name:'내 캐릭터 출석부',exact:true,level:2}).waitFor();
  const guestCreate=card.getByRole('link',{name:'가입하고 카드 만들기',exact:true});
  const goToLogin=new URL(await guestCreate.getAttribute('href'),base);
  assert.equal(goToLogin.pathname,'/login/');
  assert.equal(goToLogin.searchParams.get('next'),'/#daily-home-title');
  await card.getByText('프로필 카드 예시',{exact:true}).waitFor();
  await card.getByRole('heading',{name:`${Number(month.slice(5))}월 출석 도장`}).waitFor();
  await card.getByRole('link',{name:'로그인하고 출석 도장 찍기'}).waitFor();
  await card.getByRole('button',{name:'이 퀘스트 받기',exact:true}).waitFor();
  await card.screenshot({path:`${out}/guest-390.png`});
  await guestCreate.click();await page.waitForURL(u=>u.pathname==='/login/');
  console.log('PASS guest sees example card, month calendar, quests and sign-in with the card return URL');

  signedIn=true;
  await context.addInitScript(user=>{
    localStorage.setItem('fortune_auth_user',JSON.stringify(user));
    localStorage.setItem('fortune_auth_token','daily-mock-token');
  },user);
  await page.goto(base+goToLogin.searchParams.get('next'),{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#home-question + button:not(:disabled)',{state:'attached'});
  await card.locator('[data-daily-balance]').filter({hasText:'7방울'}).waitFor();
  const cardTop=await card.evaluate(el=>el.getBoundingClientRect().top);
  assert(Math.abs(cardTop)<80,`로그인 복귀는 출석부로 내려온다 (top=${cardTop})`);
  const days=card.getByRole('list',{name:/출석 달력/});
  assert.equal(await days.locator('li[data-stamped]').count(),earlier.length);
  assert.equal(await days.locator('li[data-bonus]').count(),earlier.filter(d=>d.bonus).length);
  await card.getByRole('button',{name:'출석 도장 찍기'}).click();
  await card.getByRole('button',{name:'오늘 출석 도장 완료'}).waitFor();
  await card.getByText('꿀방울 1개를 받았어요.').waitFor();
  await card.locator('[data-daily-balance]').filter({hasText:'8방울'}).waitFor();
  assert.equal(await days.locator('li[data-today][data-stamped]').count(),1);
  assert.equal(await days.locator('li[data-stamped]').count(),earlier.length+1);
  assert.equal(await card.locator('ol[aria-label^="연속 출석"] li[data-filled]').count(),4);
  assert.equal(posts,1);
  await card.getByText(/오늘 도장/).first().waitFor();
  console.log('PASS login return lands on the card; check-in stamps today, updates balance and streak gauge (mock API)');

  await card.getByRole('button',{name:'이 퀘스트 받기',exact:true}).click();
  await card.getByRole('button',{name:'실천 완료하기',exact:true}).click();
  await card.getByRole('button',{name:'완료 · 되돌리기',exact:true}).waitFor();
  await card.getByRole('button',{name:'한 줄 쓰기',exact:true}).click();
  await card.getByRole('textbox',{name:'오늘 한 줄'}).fill('출석부 검수 한 줄');
  await card.getByRole('textbox',{name:'오늘 한 줄'}).blur();
  await card.getByText('오늘의 한 줄을 남겼어요',{exact:true}).waitFor();
  assert.match(await card.locator('header').first().innerText(),/3\s*\/3/);
  console.log('PASS today quests: small action accepted and completed, one-line record saved, 3/3 stamps');

  const create=card.getByRole('button',{name:'첫 카드 만들기',exact:true});
  await create.click();
  const frame=page.frameLocator('#homeDailyCard iframe');
  await frame.locator('#nameInput').fill('취소할 카드');
  await card.getByRole('button',{name:'출석부로 돌아가기',exact:true}).click();
  await page.waitForFunction(el=>el===document.activeElement,await create.elementHandle(),{timeout:3500}).catch(async error=>{
    console.error('Editor cancel focus:',await page.evaluate(()=>[document.activeElement?.tagName,document.activeElement?.textContent?.slice(0,100)]));throw error;
  });
  console.log('PASS cancelling embedded editor returns focus to the card button');
  await create.click();
  await frame.locator('#nameInput').waitFor();
  await page.evaluate(()=>window.postMessage({type:'cd:forest-card',state:'saved'},location.origin));
  assert.equal(await card.locator('iframe').count(),1,'다른 창의 메시지는 무시한다');
  await page.frames().find(f=>f.url().includes('forestCard=')).evaluate(()=>parent.postMessage({type:'cd:forest-card',state:'saved'},location.origin));
  await card.locator('iframe').waitFor({state:'detached'});
  await create.click();
  await card.locator('iframe').scrollIntoViewIfNeeded();
  await frame.locator('#nameInput').fill('나의 출석');
  await frame.locator('#birthDate').fill('1990-01-02');
  page.on('dialog',dialog=>{console.log('DIALOG',dialog.message());void dialog.accept();});
  failSave=true;
  await frame.locator('#dpSaveBtn').click();
  await card.getByRole('button',{name:'출석부로 돌아가기',exact:true}).waitFor({state:'visible'});
  await frame.locator('#dpSaveBtn:not([disabled])').waitFor();
  assert.equal(profiles.length,0);
  assert.equal(await card.locator('iframe').count(),1);
  await card.locator('iframe').scrollIntoViewIfNeeded();
  await frame.locator('#dpSaveBtn').focus();
  failSave=false;
  await frame.locator('#dpSaveBtn').press('Enter');
  await card.locator('iframe').waitFor({state:'detached'});
  assert.equal(profiles.length,1);
  await card.getByText('나의 출석 카드',{exact:true}).waitFor();
  console.log('PASS actual create request, failed save preserves editor, retry and server-confirmed return (mock APIs)');

  profiles.push({...profiles[0],id:'second',profileId:'second',name:'두 번째',birth:{...profiles[0].birth,year:1991,month:2,day:3}});
  await card.getByRole('button',{name:'카드 바꾸기',exact:true}).click();
  await card.locator('iframe').scrollIntoViewIfNeeded();
  await frame.locator('[data-profile-id="second"]').click();
  await card.locator('iframe').waitFor({state:'detached'});
  assert.equal(currentId,'second');
  async function confirmPortrait(sprite, cardName) {
    await card.getByText(cardName+' 카드',{exact:true}).waitFor();
    const handle=await card.elementHandle();
    await page.waitForFunction(([root,id])=>[...root.querySelectorAll('img,[role="img"]')].some(el=>{
      const rect=el.getBoundingClientRect();
      const src=el.currentSrc || getComputedStyle(el).backgroundImage;
      return rect.width>=48 && rect.height>=48 && src.includes('/'+id+'.webp');
    }),[handle,sprite]);
    await handle.dispose();
  }
  await confirmPortrait('spirit-03','두 번째');
  const identity=card.locator('[data-daily-profile="second"]');
  assert.match(await identity.innerText(),/일주 동물 · 강아지/);
  assert.match(await identity.innerText(),/장착 정령 · 초승달 토끼/);
  assert.match(await identity.innerText(),/갑술 · 목/);
  assert.match(await identity.innerText(),/Lv\.3/);
  await card.screenshot({path:`${out}/member-equipped-390.png`});
  console.log('PASS second of two profiles selected; equipped spirit and day animal shown together with level');

  equippedId=null;
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await card.scrollIntoViewIfNeeded();
  await confirmPortrait('animal-dog','두 번째');
  console.log('PASS unequipped spirit falls back to the day animal');
  for (const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:844});
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({path:`${out}/card-${width}.png`});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px 가로 넘침`);
    assert(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${width}px 카드 넘침`);
  }
  await page.setViewportSize({width:390,height:844});
  failSpirit=true;
  await page.reload({waitUntil:'domcontentloaded'});await card.scrollIntoViewIfNeeded();
  const retryPortrait=card.getByRole('button',{name:'캐릭터 다시 불러오기',exact:true});
  await retryPortrait.waitFor();
  assert.equal(await card.locator('[data-character-id]').count(),0);
  failSpirit=false;await retryPortrait.click();
  await confirmPortrait('animal-dog','두 번째');
  failProfile=true;
  await page.reload({waitUntil:'domcontentloaded'});await card.scrollIntoViewIfNeeded();
  const retry=card.getByRole('button',{name:'카드 다시 불러오기',exact:true});
  await retry.waitFor();assert.equal(await guestCreate.count(),0);
  failProfile=false;await retry.click();
  await confirmPortrait('animal-dog','두 번째');
  console.log('PASS profile lookup failure shows retry, preserves membership and recovers selected portrait');

  await page.goto(base+'/diary/',{waitUntil:'domcontentloaded'});
  const diaryCard=page.locator('[data-daily-card="diary"]');
  await diaryCard.getByRole('heading',{name:'내 캐릭터 출석부',level:2}).waitFor();
  await diaryCard.getByRole('button',{name:'오늘 출석 도장 완료'}).waitFor();
  assert.equal(await page.locator('dialog').count(),0);
  await diaryCard.screenshot({path:`${out}/diary-390.png`});
  console.log('PASS /diary/ shows the same card inline with today stamped');
} finally { await browser.close(); }
