// Compiled local pages, synthetic account/profile data only. Never forwards API traffic.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { SNU_SAJU_FEATURES } from '../js/core/snu-campus-policy.mjs';

const root=process.cwd(), output=resolve('.tmp/snulife-ui');
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/api/')){res.writeHead(503);res.end('{"ok":false,"code":"MOCK_ROUTE_NOT_IMPLEMENTED"}');return;}
  const leaf=path==='/ggulggul/'?'index.html':decodeURIComponent(path.slice(1))+(path.endsWith('/')?'index.html':'');
  for(const base of path==='/ggulggul/'?[root]:[resolve('out'),resolve('public')]){
    const file=resolve(base,leaf);if(!file.startsWith(base+sep))continue;
    try{const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(bytes);return;}catch{/* Next local asset location. */}
  }res.writeHead(404);res.end();
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const rows=[];
let activePage;
try{
  await mkdir(output,{recursive:true});
  for(const width of [360,390,430,1280]){
    const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
    let guest=false, verified=false, bound='', claims=0, unlocks=0;
    let user={id:'fixture-member',_id:'fixture-member',name:'화면 검증',email:'fixture@example.test'};
    const profiles=[{id:'fixture-other',profileId:'fixture-other',name:'다른 프로필',birthDate:'1992-06-17',birth:{year:1992,month:6,day:17,hour:14,minute:0},gender:'F',location:{lat:37.5,lng:127,tzOffset:9}}, {id:'fixture-gift',profileId:'fixture-gift',name:'본인 선물 프로필',birthDate:'1990-05-15',birth:{year:1990,month:5,day:15,hour:12,minute:0},gender:'F',location:{lat:37.5,lng:127,tzOffset:9}}];
    const status=()=>({ok:true,eligibleEmail:false,verified,profileId:bound||null,features:SNU_SAJU_FEATURES,unlockedFeatureKeys:bound?SNU_SAJU_FEATURES.map(x=>x.featureKey):[]});
    await context.addInitScript(user=>{localStorage.setItem('fortune_auth_user',JSON.stringify(user));localStorage.setItem('fortune_auth_token','fixture-only');sessionStorage.setItem('privacyAgreed','true');},user);
    const routeFixture=async route=>{
      const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
      if(!url.pathname.startsWith('/api/'))return route.continue();
      const path=url.pathname,body=route.request().postDataJSON()||{};
      const send=(json,status=200)=>route.fulfill({status,json});
      if(guest)return send({ok:false,authenticated:false,code:'UNAUTHORIZED'},401);
      if(path==='/api/auth/me')return send({ok:true,authenticated:true,user});
      if(path==='/api/auth/refresh')return send({ok:true,authenticated:true,user,token:'fixture-only'});
      if(path.endsWith('/snu/status'))return send(status());
      if(path.endsWith('/snu/code')){claims++;if(body.code!=='FIXTURE-CODE')return send({ok:false,code:'SNULIFE_CODE_INVALID',message:'SNULIFE 게시물의 제휴 코드를 다시 확인해 주세요.'},400);verified=true;return send(status());}
      if(path.endsWith('/snu/unlock')){unlocks++;if(!verified||body.profileId!=='fixture-gift')return send({ok:false,code:'INVALID_PROFILE'},403);bound=body.profileId;return send({...status(),complete:true});}
      if(path==='/api/profile'||path==='/api/yeongnyangi/profiles')return send({ok:true,profiles,currentId:'fixture-other'});
      if(path.startsWith('/api/profile/'))return send({ok:true,profile:profiles.find(x=>x.id===path.split('/').pop())});
      if(path==='/api/activation-rewards/status')return send({ok:true,accountId:user.id,tutorial:{eligible:false},wallet:{balance:0},policy:{},recommendations:[]});
      if(path==='/api/saju/section')return send({ok:true,unlocked:true,featureKey:body.featureKey,html:'<article class="saju-summary-report"><h3>지금의 흐름</h3><p>프로필에 연결된 풀이 검증입니다.</p></article>'});
      if(path.includes('access-state'))return send({ok:true,userId:user.id,profileId:bound||'fixture-other',currentProfileId:bound||'fixture-other',authority:'server',completeness:'full',degraded:false,unlockMap:Object.fromEntries(SNU_SAJU_FEATURES.map(x=>[x.featureKey,true]))});
      return send({ok:false,code:'MOCK_ROUTE_NOT_IMPLEMENTED'},503);
    };
    await context.route('**/*',routeFixture);
    const page=await context.newPage();activePage=page;page.setDefaultTimeout(20000);
    await page.goto(origin+'/snu/',{waitUntil:'networkidle'});
    const essential=page.getByRole('button',{name:'필수만 사용',exact:true});if(await essential.isVisible())await essential.click();
    await page.getByLabel('제휴 코드',{exact:true}).fill('WRONG');
    await page.getByRole('button',{name:'제휴 코드 등록하기',exact:true}).click();
    await page.locator('[data-error-code="SNULIFE_CODE_INVALID"]').waitFor();
    await page.getByLabel('제휴 코드',{exact:true}).fill('FIXTURE-CODE');
    await page.getByRole('button',{name:'제휴 코드 등록하기',exact:true}).click();
    await page.getByLabel('본인 프로필',{exact:true}).selectOption('fixture-gift');
    const open=page.getByRole('button',{name:'이 프로필로 사주 선물 열기',exact:true});
    assert(await open.isDisabled(),'confirmation must precede the grant');
    await page.screenshot({path:resolve(output,`snu-confirm-${width}.png`),fullPage:true});
    await page.getByRole('checkbox').focus();await page.keyboard.press('Space');await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').innerText(),'이 프로필로 사주 선물 열기');await page.keyboard.press('Enter');
    const result=page.getByRole('link',{name:'내 사주와 열린 콘텐츠 보기',exact:true});await result.waitFor();
    assert.equal(await page.locator('[aria-current="step"] > span:last-child').innerText(),'풀이 보기');
    await page.waitForFunction(()=>document.activeElement?.textContent==='사주 선물을 열었어요');
    assert((await result.getAttribute('href')).includes('entry=snulife'));
    assert.equal(unlocks,1);assert.equal(claims,2);
    await page.reload({waitUntil:'networkidle'});await result.waitFor();assert.equal(unlocks,1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, follow');
    await page.screenshot({path:resolve(output,`snu-complete-${width}.png`),fullPage:true});
    // The general current profile is deliberately different. The entry must refresh and pin the server gift profile.
    await result.click();
    await page.waitForFunction(()=>window.__cdGetCurrentDestinyProfile?.()?.id==='fixture-gift',undefined,{timeout:60000});
    await page.waitForFunction(()=>window.G_PILLARS,undefined,{timeout:60000});
    await page.locator('#snuReadingContents').waitFor({timeout:60000});
    await page.locator('#sajuCalcLoadingOverlay').waitFor({state:'hidden',timeout:60000});
    await page.locator('.cd-boot-gate__veil').waitFor({state:'hidden',timeout:60000});
    await page.locator('#resultPage').waitFor({state:'visible'});
    await page.locator('#snuReadingContents').evaluate(node=>{node.open=true;node.scrollIntoView({block:'start',behavior:'instant'});});
    assert.equal(await page.locator('#snuReadingContents nav a').count(),SNU_SAJU_FEATURES.length);
    assert(await page.locator('#snuReadingContents nav a').first().isVisible());
    assert.equal(await page.locator('.saju-reading-toc').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await page.locator('#cdActivationGuide').count(),0,'completed reading must not receive an unrelated reward invitation');
    await page.screenshot({path:resolve(output,`snu-reading-${width}.png`)});
    await page.goto(origin+'/snu/',{waitUntil:'networkidle'});await result.waitFor();
    guest=true;
    await page.evaluate(()=>{localStorage.removeItem('fortune_auth_user');localStorage.removeItem('fortune_auth_token');window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{event:'logout'}}));});
    await page.getByRole('link',{name:'가입·로그인하기',exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'내 사주와 열린 콘텐츠 보기',exact:true}).count(),0);
    await context.close();
    // A separate account with a registered but unopened gift still needs its reminder.
    guest=false;bound='';user={...user,id:'fixture-pending',_id:'fixture-pending',email:'pending@example.test'};
    const pendingContext=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
    await pendingContext.addInitScript(user=>{localStorage.setItem('fortune_auth_user',JSON.stringify(user));localStorage.setItem('fortune_auth_token','fixture-only');sessionStorage.setItem('privacyAgreed','true');},user);
    await pendingContext.route('**/*',routeFixture);
    const pendingPage=await pendingContext.newPage();activePage=pendingPage;
    await pendingPage.goto(origin+'/ggulggul/',{waitUntil:'networkidle'});
    const pendingConsent=pendingPage.getByRole('button',{name:'필수만 사용',exact:true});if(await pendingConsent.isVisible())await pendingConsent.click();
    const welcomeClose=pendingPage.locator('dialog[open] [data-first-close]:visible').first();if(await welcomeClose.isVisible())await welcomeClose.click();
    await pendingPage.locator('.cd-boot-gate__veil').waitFor({state:'hidden',timeout:60000});
    const guideAction=pendingPage.locator('#cdActivationGuide a[href="/snu/"]');await guideAction.waitFor({state:'visible'});
    assert(await guideAction.evaluate(link=>{const box=link.getBoundingClientRect();const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);return hit===link||link.contains(hit);}), 'the pending gift reminder must remain above the fixed navigation');
    assert.equal(unlocks,1,'a reminder must not grant a second gift');
    await pendingPage.screenshot({path:resolve(output,`snu-partial-reminder-${width}.png`)});
    rows.push({width,claims,unlocks,profile:'fixture-gift',shortcuts:SNU_SAJU_FEATURES.length,overflow:false,completedGuideHidden:true,guideActionUncovered:true,logoutCleared:true,keyboardGrant:true,focusMoved:true});
    await pendingContext.close();
  }
  await writeFile(resolve(output,'proof.json'),JSON.stringify(rows,null,2));
  await Promise.all(['failure.json','failure.png'].map(name=>rm(resolve(output,name),{force:true})));
  console.log(JSON.stringify(rows));
}catch(error){
  if(activePage&&!activePage.isClosed()){
    await activePage.screenshot({path:resolve(output,'failure.png'),fullPage:true});
    await writeFile(resolve(output,'failure.json'),JSON.stringify({url:activePage.url(),text:(await activePage.locator('body').innerText()).slice(0,8000),error:String(error)},null,2));
  }throw error;
}finally{await browser.close();await new Promise(done=>server.close(done));}
