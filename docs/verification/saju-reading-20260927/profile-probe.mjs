import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
const user={id:'saju-test-user',_id:'saju-test-user',name:'재열람 테스트',nickname:'재열람 테스트'};
const profile={id:'saju-profile',profileId:'saju-profile',name:'재열람 테스트',gender:'M',birthDate:'1991-02-20',birthTime:'12:00',calendarType:'solar',birth:{year:1991,month:2,day:20,hour:12,minute:0,calType:'solar'},location:{label:'서울',tz:'Asia/Seoul',lng:127,lat:37.5}};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(user=>{localStorage.setItem('fortune_auth_token','mock-local-fixture');localStorage.setItem('fortune_auth_user',JSON.stringify(user));localStorage.setItem('fortuneThemeModeStateV1','neo');},user);
 const calls=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return route.abort();if(u.pathname.startsWith('/api/')){calls.push({path:u.pathname,method:route.request().method()});if(u.pathname.startsWith('/api/auth/'))return route.fulfill({json:{ok:true,user}});if(u.pathname.startsWith('/api/profile'))return route.fulfill({json:{ok:true,currentId:profile.id,profiles:[profile],profile,subscription:{tier:'free',isActive:false,profileLimit:1}}});return route.fulfill({json:{ok:false,error:'MOCK_UNSUPPORTED'},status:404});}return route.continue();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:34350/ggulggul/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>document.querySelector('[aria-label="사주 분석 시작하기"]').click());
 await page.waitForFunction(()=>typeof dpLoadProfile==='function');
 await page.evaluate(()=>dpLoadProfile());
 await page.waitForFunction(()=>document.querySelector('.dp-fsel-btn--saju'));
 await page.locator('.dp-fsel-btn--saju').click();
 await page.waitForFunction(()=>window.G_PILLARS&&document.querySelector('#tsGrid [data-saju-god]'),{},{timeout:60000});
 assert.equal(await page.locator('#nameInput').inputValue(),profile.name);
 assert.equal(await page.locator('#sajuReadingHeader [data-saju-mode="neo"]').getAttribute('aria-pressed'),'true');
 const before=await page.evaluate(()=>JSON.stringify({p:G_PILLARS,n:G_NATAL}));
 await page.reload({waitUntil:'domcontentloaded'});await page.evaluate(()=>document.querySelector('[aria-label="사주 분석 시작하기"]').click());await page.waitForFunction(()=>typeof dpLoadProfile==='function');await page.evaluate(()=>dpLoadProfile());await page.waitForFunction(()=>document.querySelector('.dp-fsel-btn--saju'));await page.locator('.dp-fsel-btn--saju').click();await page.waitForFunction(()=>window.G_PILLARS&&document.querySelector('#tsGrid [data-saju-god]'),{},{timeout:60000});
 assert.equal(await page.evaluate(()=>JSON.stringify({p:G_PILLARS,n:G_NATAL})),before);
 assert.equal(await page.locator('#sajuReadingHeader [data-saju-mode="neo"]').getAttribute('aria-pressed'),'true');
 await page.locator('#sajuReadingHeader').scrollIntoViewIfNeeded();await page.screenshot({path:'.codex-saju-reading-shots/profile-reopen.png'});
 const mutations=calls.filter(c=>c.method!=='GET'&&!c.path.startsWith('/api/auth'));
 const result={signedIn:true,profileReopened:true,chartInvariant:true,currentMode:'neo',mutations};writeFileSync('.codex-saju-reading-shots/profile-reopen.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
