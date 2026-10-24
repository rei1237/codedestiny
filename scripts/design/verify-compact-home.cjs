const {createRequire}=require('node:module');
const req=createRequire(process.cwd()+'/package.json');
const {chromium}=req('playwright');
const {createServer}=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=process.cwd(), output=process.argv[2]||path.join(root,'build-cache/compact-home'), phase=process.argv[3]||'after';
const baselineFiles=new Set(['/index.html','/styles/home-funnel.css','/styles/saju-reading.css','/js/core/home-funnel.js']);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 if(pathname==='/api/honey/attendance'){response.writeHead(401,{'Content-Type':'application/json'});response.end(JSON.stringify({ok:false}));return;}
 if(pathname==='/api/honey/catalog'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({ok:true,products:[]}));return;}
 if(pathname.startsWith('/api/')){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({ok:true,authenticated:false,user:null,profiles:[],items:[],unlocks:[]}));return;}
 const local=(pathname==='/'||pathname==='/ggulggul/')?'/index.html':pathname;
 const file=path.resolve(root,'.'+local);
 if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
 try{const body=phase==='before'&&baselineFiles.has(local)?require('node:child_process').execFileSync('git',['show','5862684ab:'+local.slice(1)],{cwd:root,maxBuffer:10*1024*1024}):await fs.readFile(file).catch(()=>fs.readFile(path.join(root,'public',local)));response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');response.end(body);}catch{response.writeHead(404);response.end();}
});
(async()=>{
 await fs.mkdir(output,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true});const rows=[];
 try{for(const width of [360,390,430,1440]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('cd:first-visit:v1:ggulggul:guest',JSON.stringify({status:'dismissed',step:0})));
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/ggulggul/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof window.__cdOpenGarden==='function',{timeout:30000});
 await page.locator('#cdConcernPick').scrollIntoViewIfNeeded();
 await page.waitForTimeout(600);
 const metrics=await page.evaluate(()=>{
 const box=s=>{const e=document.querySelector(s);const b=e.getBoundingClientRect();return {width:b.width,height:b.height,top:b.top+scrollY}};
 return {innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-innerWidth,consult:box('.cdh-consult'),cat:box('#cdConcernPick .cd-concern__cards'),image:box('.cd-concern__card-media'),gateway:box('#cdhGatewaySlot'),ancestors:Array.from((function*(e){while(e){yield e;e=e.parentElement}})(document.querySelector('.cd-concern__cards'))).slice(0,8).map(e=>({id:e.id,c:e.className,w:e.getBoundingClientRect().width,cssWidth:getComputedStyle(e).width,zoom:getComputedStyle(e).zoom}))};
 });
 await page.locator('#cdConcernPick').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
 await page.screenshot({path:path.join(output,`${phase}-questions-viewport-${width}.png`)});
 await page.locator('#cdConcernPick').screenshot({path:path.join(output,`${phase}-questions-${width}.png`)});
 await page.locator(phase==='before'?'.cdh-consult':'.cdh-consult-browser').screenshot({path:path.join(output,`${phase}-consult-${width}.png`)});
 console.log(JSON.stringify({width,phase,...metrics}));
 if(phase==='after'){
  assert(metrics.overflow<=1,`page overflow ${width}: ${metrics.overflow}`);
  const headingGap=await page.locator('#cdConcernPick').evaluate(el=>el.querySelector('h2').getBoundingClientRect().top-el.getBoundingClientRect().top);
  assert(headingGap<40,`unexpected empty space above concern heading: ${headingGap}`);
  if(width<600)assert(metrics.image.width>=130,`image too small ${width}`);
  if(width<600){
    const rail=page.locator('.cd-concern__cards');
    await page.locator('[data-concern-next]').click();
    await page.waitForFunction(()=>document.querySelector('.cd-concern__cards').scrollLeft>0);
    assert(!(await page.locator('[data-concern-prev]').isDisabled()));
    await rail.evaluate(el=>{el.scrollLeft=0;});
  }
  const tabs=page.locator('[data-consult-tab]');assert.equal(await tabs.count(),3);
  for(let i=0;i<3;i++){await tabs.nth(i).click();assert.equal(await tabs.nth(i).getAttribute('aria-selected'),'true');assert.equal(await page.locator('.cdh-consult > [role=tabpanel]:visible').count(),1);await page.locator('.cdh-consult-browser').screenshot({path:path.join(output,`after-consult-${i}-${width}.png`)});}
  await tabs.nth(0).focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
  for(const id of ['money','relationship','love']){const b=page.locator(`[data-cd-concern="${id}"]`);if(await b.count()){await b.click();assert.equal(await b.getAttribute('aria-expanded'),'true');assert(await page.locator(`[data-cd-concern-panel="${id}"]`).isVisible());}}
  await page.evaluate(()=>{document.documentElement.classList.add('neo-mode');document.body.classList.add('neo-mode');});
  await page.locator('#cdConcernPick').screenshot({path:path.join(output,`after-dark-questions-${width}.png`)});
  // Stable visual fixture for shared guide primitives; no first-visit state or real account calls.
  await page.evaluate(()=>{
    const guide=document.createElement('section');guide.id='guidanceDesignFixture';guide.className='cd-first';guide.style.cssText='max-width:900px;margin:24px auto;padding:16px';
    guide.innerHTML='<nav class="cd-first__scene-nav" aria-label="이용 순서"><button aria-pressed="true"><span>1</span>프로필</button><button aria-pressed="false"><span>2</span>무료 사주</button><button aria-pressed="false"><span>3</span>더 깊게</button></nav><div class="cd-first__scene"><img class="cd-guide__art" src="/images/yeoni/welcome/yeoni-welcome-v1-320.webp" width="160" height="160" alt="연이"><div class="cd-first__speech"><span class="cd-first__speaker">연이가 안내해 드릴게요</span><h2>당신의 이야기를 들려주세요.</h2><p>반가워요, 연이예요. 생년월일과 양력·음력부터 차근차근 확인해요. 이미 만든 프로필이 있다면 골라주세요. 태어난 시간을 몰라도 화면의 안내에 따라 시작할 수 있어요.</p><button type="button">다음 이야기 →</button></div></div>';
    document.getElementById('cdHomeFunnel').prepend(guide);
    for(const b of guide.querySelectorAll('nav button'))b.addEventListener('click',()=>{for(const other of guide.querySelectorAll('nav button'))other.setAttribute('aria-pressed',String(other===b));});
  });
  for(const dark of [false,true]){
    await page.evaluate(dark=>{document.documentElement.classList.toggle('neo-mode',dark);document.body.classList.toggle('neo-mode',dark);},dark);
    const guide=page.locator('#guidanceDesignFixture');await guide.scrollIntoViewIfNeeded();
    const checks=await guide.evaluate(el=>({image:getComputedStyle(el.querySelector('img')).backgroundColor,buttons:[...el.querySelectorAll('button')].map(b=>({h:b.getBoundingClientRect().height,font:getComputedStyle(b).fontFamily,wrap:b.scrollWidth<=b.clientWidth+1})),overflow:el.scrollWidth<=el.clientWidth}));
    assert.equal(checks.image,'rgba(0, 0, 0, 0)');assert((await guide.locator('img').boundingBox()).width<=180);assert(checks.overflow);assert(checks.buttons.every(b=>b.h>=44&&b.font.includes('CodeDestinyBody')&&b.wrap));
    await guide.screenshot({path:path.join(output,'after-guide-'+(dark?'neo':'yeoni')+'-'+width+'.png')});
  }
  await page.locator('#guidanceDesignFixture').evaluate(el=>el.remove());
  const liveGuide=page.locator('#cdHomeFunnel .cd-first .cd-first__story');
  assert.equal(await liveGuide.count(),1,'first-visit guide is mounted');
  {
    for(const dark of [false,true]) {
      await page.evaluate(d=>{document.documentElement.classList.toggle('neo-mode',d);document.body.classList.toggle('neo-mode',d);},dark);
      await liveGuide.scrollIntoViewIfNeeded();
      assert.equal(await liveGuide.locator('p').first().evaluate(el=>getComputedStyle(el).fontSize),'16px');
      assert.equal(await liveGuide.locator('img').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
      assert(await liveGuide.locator('img').first().evaluate(el=>el.complete&&el.naturalWidth>0));
      await liveGuide.screenshot({path:path.join(output,`after-live-guide-${dark?'neo':'yeoni'}-${width}.png`)});
    }
  }
  // Display-only reading fixture: existing rendered anchor targets, no fortune/payment API call.
  await page.evaluate(()=>{window.__cdMobileHomeLazyMount?.mount('resultPage');document.getElementById('inputPage').style.display='none';const r=document.getElementById('resultPage');r.style.display='block';document.documentElement.classList.remove('neo-mode');document.body.classList.remove('neo-mode');for(const id of ['sajuCard','iljuCard','tenshinCard','johuCard','ukbuCard']){const el=document.getElementById(id);el.style.display='block';el.style.minHeight='600px';}window.scrollTo(0,0);});
  await page.locator('.saju-reading-nav').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  const nav=page.locator('.saju-reading-nav');assert(await nav.isVisible());
  for (const id of ['iljuCard','tenshinCard','ukbuCard']) {
    const link=nav.locator(`a[href="#${id}"]`);
    await link.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const target=await page.locator('#'+id).boundingBox(), bar=await nav.boundingBox();
    assert(target.y>=bar.y+bar.height-3, `${id} hidden behind navigation at ${width}`);
    assert.equal(await link.getAttribute('aria-current'),'location');
    assert.equal(await page.evaluate(()=>document.activeElement.id),id);
  }
  await page.screenshot({path:path.join(output,`after-saju-${width}.png`)});
 }
 if(phase==='after')assert.deepEqual(errors,[], 'no browser errors');
 rows.push({width,...metrics,errors});await context.close();
 }}finally{await browser.close();server.close();}
 await fs.writeFile(path.join(output,phase+'-metrics.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
