const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const {chromium}=require(path.join(root,'node_modules/playwright'));
const out=path.join(root,'build-cache/destiny-anatomy');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname.endsWith('/'))pathname+='index.html';
 let p=path.resolve(root,'public','.'+pathname);
 if(!p.startsWith(path.resolve(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(p)){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',mime[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(4197,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[],apis=[];
 const HD={type:'TYPE_PROJECTOR',strategy:'STRATEGY_WAIT_FOR_INVITATION',authority:'AUTHORITY_EMOTIONAL',profile:'2/4',definition:'DEFINITION_SINGLE',definedCenters:['SOLAR_PLEXUS','THROAT','G'],channels:[{channelId:'12-22'}],activeGates:[12,22]};
 const VEDIC={ok:true,groups:[{key:'core',title:'',items:[{label:'라그나',value:'사자자리 (Leo)'},{label:'달의 라시',value:'게자리'},{label:'나크샤트라',value:'Pushya · 2파다'}]}]};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){
     apis.push({path:url.pathname,method:route.request().method()});
     if(url.pathname==='/api/human-design/chart' || url.pathname==='/api/vedic-ai/basis'){
       await new Promise(r=>setTimeout(r,700));
       return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.includes('human-design')?{ok:true,chart:HD}:VEDIC)});
     }
     return route.fulfill({status:401,contentType:'application/json',body:'{"ok":false,"error":"mock-auth"}'});
   }
   if(url.hostname!=='127.0.0.1'){
     const resized=url.pathname.match(/\/cdn-cgi\/image\/[^/]+\/(.+)$/);
     const p=path.resolve(root,'public',resized?resized[1]:'.'+url.pathname);
     if(p.startsWith(path.join(root,'public'))&&fs.existsSync(p)&&fs.statSync(p).isFile())return route.fulfill({path:p,contentType:mime[path.extname(p)]||'application/octet-stream'});
     return route.abort();
   }
   return route.continue();
 });
 await page.goto('http://127.0.0.1:4197/static/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(2500);
 // Invoke the existing free-saju entry controller; all calculation and rendering remain production code.
 await page.evaluate(()=>window.cdOneStepFreeSajuEntry());
 await page.locator('#nameInput').fill('미리보기');
 await page.locator('#birthDate').fill('1991-02-20');
 await page.locator('#birthTimeText').fill('08:30');
 await page.locator('#btnF').click();
 await page.evaluate(()=>{window.__dpVerifyResultSession=async()=> 'authenticated';window.__dpHasLoginSession=()=>false;});
 await page.locator('#run-btn').click();
 await page.locator('[data-action="agreeAndCalculate"]').click();
 await page.waitForTimeout(7500);
 // Capture the actual loading controller after the lazy saju engine has loaded.
 for(const width of [390,1280]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>window._sajuSetCalculationLoading(true,'calculating'));
  await page.locator('#sajuCalcLoadingOverlay img').evaluate(img=>img.decode());
  assert.equal(await page.locator('#sajuCalcLoadingOverlay img').evaluate(img=>getComputedStyle(img).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.screenshot({path:path.join(out,'flower-'+width+'.png')});
  await page.evaluate(()=>window._sajuSetCalculationLoading(false,'idle'));
 }
 await page.evaluate(()=>window._sajuSetCalculationLoading(true,'calculating'));
 await page.locator('#sajuCalcLoadingOverlay img').evaluate(img=>img.dispatchEvent(new Event('error')));
 assert.equal(await page.locator('#sajuCalcLoadingOverlay img').evaluate(img=>getComputedStyle(img).display),'none');
 assert.ok(await page.locator('#sajuCalcLoadingOverlay p').isVisible());
 await page.evaluate(()=>window._sajuSetCalculationLoading(false,'error'));
 await page.setViewportSize({width:390,height:844});

 const card=page.locator('#destinyAnatomyCard');
 await card.evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(400);
 await page.screenshot({path:path.join(out,'initial.png')});
 // content-visibility:auto can omit offscreen pixels from full-element captures.
 // Only disable that capture optimization; keep the real page, calculation and layout.
 await card.evaluate(el=>el.style.contentVisibility='visible');
 await card.screenshot({path:path.join(out,'card.png')});
 assert.equal(await card.evaluate(el=>el.previousElementSibling.id),'sajuCard');
 assert.equal(await page.locator('[data-da-report]').evaluate(el=>el.open),false);
 for(const width of [360,390,430,1280]) {
  await page.setViewportSize({width,height:900});
  await card.screenshot({path:path.join(out,'entry-'+width+'.png')});
  assert.ok((await card.boundingBox()).height<300);
 }
 await page.setViewportSize({width:390,height:900});
 await page.locator('[data-da-trigger]').focus(); await page.keyboard.press('Enter');
 await page.locator('[data-da-act="login"]').waitFor({state:'attached'});
 await page.locator('[data-da-chapter="recovery"] > summary').click();
 await page.locator('[data-da-entry="chakra-root"] > summary').click();
 await page.locator('[data-da-sec="habits"]').screenshot({path:path.join(out,'habits.png')});
 const dl=page.waitForEvent('download');await page.locator('[data-da-act="save"]').click();await (await dl).saveAs(path.join(out,'share-ko.png'));
 // Login fixture, real deferred layer fetch and late repaint.
 await page.evaluate(()=>{window.__dpHasLoginSession=()=>true;window.dispatchEvent(new Event('cd:saju-summary-ready'));});
 await page.locator('[data-da-trigger]').click();
 await page.locator('[data-da-chapter="recovery"] > summary').click();
 await page.waitForSelector('[data-da-view="both"]',{state:'attached'});
 assert.equal(await page.locator('[data-da-chapter="recovery"]').evaluate(el=>el.open),true);
 await page.locator('[data-da-view="both"]').click();
 assert.equal(await page.locator('[data-da-view="both"]').evaluate(el=>el===document.activeElement),true);
 await page.locator('[data-da-act="collapse"]').click();
 assert.equal(await page.locator('[data-da-report]').evaluate(el=>el.open),false);
 assert.equal(await page.locator('[data-da-trigger]').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('[data-da-chapter="recovery"]').evaluate(el=>el.open),true);
 const results=[];
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});
  for(const L of ['ko','en','ja','zh-CN','zh-TW']){
   await page.evaluate(L=>{window.cdGetCurrentLanguage=()=>L;document.documentElement.lang=L;window.dispatchEvent(new Event('cd:locale-ready'));},L);
   await page.waitForFunction(L=>document.querySelector('#destinyAnatomyCard').dataset.daLocale===L,L);
   await card.evaluate(el=>{el.style.contentVisibility='visible';el.querySelectorAll('details').forEach(d=>d.open=true);});
   await page.waitForTimeout(160);
   await page.locator('[data-da-sec="habits"]').scrollIntoViewIfNeeded();
   const measure=await card.evaluate(el=>{
    const box=el.getBoundingClientRect();
    const overflow=[...el.querySelectorAll('*')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&(r.right>box.right+2||r.left<box.left-2);}).map(n=>n.className?.baseVal||n.className||n.tagName).filter(n=>!String(n).includes('sr-only'));
    const smallTargets=[...el.querySelectorAll('button,summary')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.height<43;}).map(n=>n.textContent.slice(0,40));
    const opaqueArt=[...el.querySelectorAll('.da-illustration')].filter(n=>getComputedStyle(n).backgroundColor!=='rgba(0, 0, 0, 0)').map(n=>n.src);
    return {overflow,smallTargets,opaqueArt,centerCount:el.querySelectorAll('.da-hdg__center').length,chakraCount:el.querySelectorAll('.da-chakra').length,brokenImages:[...el.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),error:!!el.querySelector('.da-sec--error')};
   });
   results.push({width,locale:L,...measure});
   if(L==='ko'){
    await page.locator('.da-chart-links').screenshot({path:path.join(out,'links-'+width+'.png')});
    await page.locator('[data-da-sec="body"]').screenshot({path:path.join(out,'body-'+width+'.png')});
    await page.locator('[data-da-sec="vedic"]').screenshot({path:path.join(out,'vedic-'+width+'.png')});
    await page.locator('[data-da-sec="habits"]').screenshot({path:path.join(out,'habits-'+width+'.png')});
    await card.evaluate(el=>{el.querySelectorAll('details[data-da-chapter]').forEach(d=>d.open=false);el.scrollIntoView({block:'start'});});
    await page.evaluate(()=>window.scrollTo({top:window.scrollY+document.getElementById('destinyAnatomyCard').getBoundingClientRect().top-20,behavior:'instant'}));
    await page.locator('[data-da-sec="hero"]').screenshot({path:path.join(out,'hero-'+width+'.png')});
    await page.locator('[data-da-sec="brain"]').screenshot({path:path.join(out,'brain-'+width+'.png')});
    await page.evaluate(()=>window.scrollTo({top:window.scrollY+document.getElementById('destinyAnatomyCard').getBoundingClientRect().top-20,behavior:'instant'}));
    await page.waitForTimeout(180);await page.screenshot({path:path.join(out,'screen-'+width+'.png')});
   }
   if(width===390){
    for(const format of ['feed','story']) {
     await page.locator('[data-da-format="'+format+'"]').click();
     const d=page.waitForEvent('download');await page.locator('[data-da-act="save"]').click();
     await (await d).saveAs(path.join(out,'share-'+L+'-'+format+'.png'));
    }
   }
  }
 }
 const report={source:'real static shell, real saju calculation; authentication and chart responses mocked; all other API and external traffic blocked',capture:'content-visibility:auto optimization disabled for whole-element captures only',results,errors,apis};
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));
 console.log('verification',JSON.stringify({cases:results.length,defects:results.filter(r=>r.overflow.length||r.smallTargets.length||r.brokenImages.length||r.opaqueArt.length||r.error),errors}));
 assert.equal(apis.filter(r=>r.path.includes('/narrate')||/payments|checkout/.test(r.path)).length,0);
 assert.equal(results.filter(r=>r.overflow.length||r.smallTargets.length||r.brokenImages.length||r.opaqueArt.length||r.error).length,0);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
