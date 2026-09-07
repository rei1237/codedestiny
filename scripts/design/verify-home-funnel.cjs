// Uses the repository's mock dev server only; all non-local browser traffic is blocked.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.HOME_UI_ORIGIN || 'http://127.0.0.1:4180';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('Local mock origin required');
const out = path.resolve('build-cache/home-ui');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 try {
  for(const [width,height] of [[360,640],[390,844],[430,932],[1280,900]]) {
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   const blocked=[],errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1'){blocked.push(u.origin);return r.abort()}return r.continue()});
   await page.goto(origin+'/static/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof window.cdOneStepFreeSajuEntry==='function');
   await page.waitForTimeout(500);
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,ctas:[...document.querySelectorAll('.cdh-copy .cdh-actions a')].map(e=>({text:e.textContent.trim(),bottom:e.getBoundingClientRect().bottom,height:e.getBoundingClientRect().height})),navTop:document.querySelector('#cdMobileBottomNav').getBoundingClientRect().top}));
   assert(!geometry.overflow,`${width} overflow`);
   const canvas=await page.locator('#cdHomeFunnel').evaluate(e=>({width:e.getBoundingClientRect().width,font:getComputedStyle(e.querySelector('h1')).fontSize,columns:getComputedStyle(e.querySelector('.cdh-intents')).gridTemplateColumns.split(' ').length}));
   assert(canvas.width<=430 && canvas.font==='27px' && canvas.columns===1,`${width} shares the mobile layout`);
   assert(geometry.ctas.every(c=>c.bottom<=Math.min(height,geometry.navTop) && c.height>=44),`${width} first screen CTA`);
   assert(await page.locator('.cdh-copy .cdh-secondary').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'CTA is not occluded');
   assert(await page.locator('.cdh-login').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'Login is not occluded');
   assert.equal(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count(),0,'Finder renders only on request');
   await page.screenshot({path:path.join(out,`home-${width}.png`)});
   const masks = await page.evaluate(() => ({
    peony: getComputedStyle(document.querySelector('.cdh-peony')).maskImage,
    divider: getComputedStyle(document.querySelector('.cdh-section'), '::before').maskImage,
   }));
   assert(masks.peony !== 'none' && masks.divider !== 'none', 'Yehwa masks resolve on the new home');
   if(width===390){
    await page.evaluate(()=>{document.documentElement.classList.add('neo-mode');document.body.classList.add('neo-mode')});
    await page.screenshot({path:path.join(out,'home-neo-390.png')});
    await page.evaluate(()=>{document.documentElement.classList.remove('neo-mode');document.body.classList.remove('neo-mode')});
   }
   await page.locator('[data-cdh-free]').first().click();
   await page.waitForFunction(()=>document.querySelector('#destinyCardForm').getBoundingClientRect().height>0);
   await page.waitForTimeout(100);
   assert(await page.locator('#nameInput').isVisible(),'Original name input opens');
   assert(await page.locator('#birthDate').isVisible(),'Original birth input opens');
   await page.screenshot({path:path.join(out,`input-${width}.png`)});
   await page.locator('.cdh-input-return').click();
   await page.locator('.cdh-intent[href="#services"]').click();
   await page.waitForSelector('#fortuneGatewayRecs .fortune-gateway__rec');
   await page.locator('#fortuneGatewaySearch').fill('나크샤트라');
   await page.locator('[data-price="free"]').click();
   await page.waitForTimeout(400);
   assert(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count()>0,'Search and free price filter');
   await page.locator('#fortuneGatewaySearch').fill('없는서비스xyz');
   await page.waitForTimeout(400);
   assert.equal(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count(),0,'Empty search does not show paid recommendations');
   await page.screenshot({path:path.join(out,`search-${width}.png`)});
   results.push({width,height,geometry,canvas,freeInput:true,search:true,errors,externalBlocked:[...new Set(blocked)]});
   await page.close();
  }
  for(const route of ['terms-of-service','privacy-policy','refund-policy','contact-us','about','faq']) {
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const runtimeRequests=[];
   page.on('request',r=>{if(/\/_next\/|\/api\//.test(r.url()))runtimeRequests.push(r.url())});
   await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
   const response=await page.goto(origin+'/'+route+'/',{waitUntil:'load',timeout:90000});
   assert(response.ok(),route+' response');
   assert(await page.locator('body.cd-policy-static').count(),route+' standalone HTML');
   assert.equal(await page.locator('script[src*="_next"]').count(),0,route+' no React runtime');
   assert.deepEqual(runtimeRequests,[],route+' no framework/API requests');
   assert.equal(await page.locator('nav[aria-label="핵심 안내 바로가기"] a').count(),3,route+' summary cards');
   const broken=await page.locator('nav[aria-label="핵심 안내 바로가기"] a[href^="#"]').evaluateAll(nodes=>nodes.filter(e=>!document.getElementById(e.hash.slice(1))).map(e=>e.hash));
   assert.deepEqual(broken,[],route+' anchors');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');
   await page.locator('main h1').waitFor({state:'visible'});
   await page.waitForTimeout(1500);
   await page.screenshot({path:path.join(out,route+'.png')});
   if(route==='privacy-policy'){
    await page.locator('.policy-site-footer').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'privacy-footer.png')});
    await page.evaluate(()=>{document.documentElement.classList.add('neo-mode');window.scrollTo({top:0,behavior:'instant'})});
    await page.screenshot({path:path.join(out,'privacy-neo.png')});
   }
   await page.setViewportSize({width:1280,height:900});
   assert(await page.locator('main h1').evaluate(e=>e.closest('main').getBoundingClientRect().width<=430),route+' desktop mobile canvas');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' desktop overflow');
   results.push({route,status:response.status(),summaryCards:3,anchors:true,desktopMobileCanvas:true});
   await page.close();
  }
  // Original authentication/profile handlers with process-local HTTP fixtures.
  const member=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  let profiles=[],mutations=0;
  const user={id:'ui-fixture-user',_id:'ui-fixture-user',email:'ui@example.invalid',name:'화면 검증',nickname:'화면 검증',hasLocalAuth:true};
  await member.addInitScript(user=>{localStorage.setItem('fortune_auth_user',JSON.stringify(user));localStorage.setItem('fortune_auth_token','mock-ui-token');},user);
  await member.route('**/*',r=>{
   const u=new URL(r.request().url());
   if(u.hostname!=='127.0.0.1')return r.abort();
   if(!u.pathname.startsWith('/api/'))return r.continue();
   let data={ok:true};
   if(u.pathname==='/api/auth/me')data={ok:true,user};
   else if(u.pathname==='/api/profile'&&r.request().method()==='POST') {
    const body=r.request().postDataJSON();const p={...body.profile,id:body.profileId};profiles=[p];mutations++;data={ok:true,profile:p,profiles,currentId:p.id};
   }else if(u.pathname.startsWith('/api/profile'))data={ok:true,profiles,currentId:profiles[0]?.id||'',subscription:{tier:'none',isActive:false,profileLimit:1}};
   else if(/access-state|subscription|pass/.test(u.pathname))data={ok:true,user,profiles,currentId:profiles[0]?.id||'',subscription:{tier:'none',isActive:false},access:{unlocked:[],features:{}},entitlements:[]};
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  member.on('dialog',dialog=>dialog.type()==='confirm'?dialog.accept():dialog.dismiss());
  await member.goto(origin+'/static/index.html#cdServiceIndex',{waitUntil:'domcontentloaded'});
  await member.waitForSelector('#fortuneGatewayRecs .fortune-gateway__rec');
  assert(await member.locator('#cdhServices').isVisible(),'Legacy service deep link');
  await member.locator('#cdhServices a[href="#home"]').click();
  await member.waitForSelector('#cdAuthLogoutBtn',{state:'attached'});
  await member.locator('.cdh-account summary').click();
  assert(await member.locator('#cdAuthLogoutBtn').isVisible(),'Original logout control remains reachable');
  await member.locator('.cdh-account summary').click();
  await member.locator('[data-cdh-free]').first().click();
  await member.locator('#nameInput').fill('꽃길 테스트');
  await member.locator('#birthDate').fill('1995-05-15');
  await member.locator('#birthDate').dispatchEvent('change');
  await member.locator('#dpSaveBtn').click();
  await member.waitForFunction(()=>Object.keys(localStorage).some(k=>(localStorage.getItem(k)||'').includes('꽃길 테스트')),null,{timeout:15000});
  assert.equal(mutations,1,'Profile creation uses the original controller exactly once');
  await member.evaluate(()=>window.dpOpenList());
  await member.getByText('꽃길 테스트',{exact:false}).filter({visible:true}).first().waitFor();
  results.push({memberControls:true,profileSavedAndLoaded:true,mutations,legacySearchDeepLink:true,mockOnly:true});
  await member.close();
 } finally {fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(results,null,2));await browser.close()}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
