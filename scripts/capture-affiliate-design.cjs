let activeBrowser;
(async()=>{
 const {chromium}=await import('playwright');const {build}=await import('esbuild');const {default:assert}=await import('node:assert/strict');const fs=await import('node:fs');const path=await import('node:path');await import('./lib/mock-network-guard.cjs');
 const base=process.env.RECOMMENDATIONS_PREVIEW_URL||'http://127.0.0.1:18177';
 assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const out=path.resolve(process.env.AFFILIATE_CAPTURE_DIR||'.tmp/affiliate-qa');fs.mkdirSync(out,{recursive:true});
 const products=[{id:'mock-book',providerId:'coupang',title:'검증용 독서 도구',category:'books',reason:'집중하는 독서 시간을 위한 선택이에요.',imageUrl:'/images/mock-affiliate-book.png',affiliateUrl:'https://link.coupang.com/a/FixtureOnly',price:null},{id:'mock-bookmark',providerId:'aliexpress',title:'검증용 책갈피',category:'books',reason:'읽던 곳을 표시하고 다음 독서를 이어가세요.',imageUrl:'/images/mock-affiliate-ali.png',affiliateUrl:'https://s.click.aliexpress.com/e/_FixtureOnly',price:null}];
 const compiled=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{RecommendationResult}from'./app/components/recommendations/RecommendationSurface';const root=createRoot(document.getElementById('root'));let key=0;window.renderAd=props=>root.render(<RecommendationResult key={++key} service="legacy-saju" practiceTags={['focus']} {...props}/>);window.renderAd({});`,loader:'jsx',resolveDir:process.cwd()},bundle:true,format:'esm',write:false,outdir:out,jsx:'automatic',plugins:[{name:'isolated-local-dependencies',setup(b){b.onResolve({filter:/^@\/app\/_lib\/api-config$/},()=>({path:'api',namespace:'stub'}));b.onResolve({filter:/^@\/lib\/i18n\/dictionary$/},()=>({path:'locale',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='api'?`export const getApiBaseUrl=()=>'';`:`export const detectLocale=()=> 'ko';export const normalizeLocale=x=>x;`,loader:'js'}));}}]});
 const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).text,css=compiled.outputFiles.find(f=>f.path.endsWith('.css')).text;
 const browser=await chromium.launch({headless:true}),results=[],errors=[];let enabled=true,broken=false;
 activeBrowser=browser;
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return route.abort();
  if(u.pathname==='/__affiliate-test/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ko"><head><style>*{box-sizing:border-box}body{margin:0}html{--font-body:"Malgun Gothic",sans-serif;--font-display:"Malgun Gothic",serif}</style><link rel="stylesheet" href="/styles/theme-tokens.css"><link rel="stylesheet" href="/__affiliate-test/bundle.css"></head><body><main id="root"></main><script type="module" src="/__affiliate-test/bundle.js"></script></body></html>'});
  if(u.pathname==='/__affiliate-test/bundle.js')return route.fulfill({contentType:'application/javascript',body:js});
  if(u.pathname==='/__affiliate-test/bundle.css')return route.fulfill({contentType:'text/css',body:css});
  if(u.pathname.startsWith('/images/mock-affiliate-')){if(broken)return route.fulfill({status:404,body:''});const image=fs.existsSync('.tmp/atomic-habits-ko.jpg')?fs.readFileSync('.tmp/atomic-habits-ko.jpg'):Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="white"/><text x="35" y="160" font-size="28">MOCK PRODUCT</text></svg>');return route.fulfill({contentType:fs.existsSync('.tmp/atomic-habits-ko.jpg')?'image/jpeg':'image/svg+xml',body:image});}
  if(u.pathname==='/api/recommendations')return route.fulfill({json:{enabled,products:enabled?products:[]}});
  if(u.pathname.startsWith('/api/recommendations/events'))throw Error('automation must not send ad events');
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const brand of ['ggulggul','yeongnyangi','neo']){
  await page.goto(base+'/__affiliate-test/');await page.waitForFunction(()=>typeof window.renderAd==='function');await page.evaluate(brand=>window.renderAd({brand}),brand);
  const slot=page.locator('[data-recommendation-block]');await slot.locator('article').first().waitFor();
  for(const width of [360,390,430,1280]){await page.setViewportSize({width,height:900});await slot.scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('[data-recommendation-product] img')].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await slot.locator('article').count(),2);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await slot.screenshot({path:path.join(out,brand+'-'+width+'.png')});results.push({brand,width,cards:2,overflow:false});}
 }
 await page.evaluate(()=>window.renderAd({completed:false}));await page.locator('[data-recommendation-block]').waitFor({state:'detached'});
 await page.evaluate(()=>window.renderAd({source:'article'}));await page.locator('[data-recommendation-block]').waitFor({state:'detached'});
 const failedResponse=page.waitForResponse(r=>r.url().includes('/images/mock-affiliate-')&&r.status()===404);broken=true;await page.evaluate(()=>window.renderAd({}));await failedResponse;await page.waitForFunction(()=>!document.querySelector('[data-recommendation-block]'));broken=false;
 for(const route of ['/','/ggulggul/']){
  await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000});const slot=page.locator('[data-recommendation-placement="footer"]');await slot.waitFor({timeout:120000});assert.equal(await slot.locator('article').count(),2);await slot.scrollIntoViewIfNeeded();await slot.screenshot({path:path.join(out,route==='/'?'home-footer.png':'shell-footer.png')});
  if(route==='/ggulggul/'){await page.evaluate(()=>{document.getElementById('inputPage').style.display='none';document.getElementById('resultPage').style.display='block';});await page.locator('[data-affiliate-home-slot]').waitFor({state:'hidden'});}
 }
 enabled=false;const offResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/recommendations');await page.goto(base+'/');await offResponse;await page.waitForFunction(()=>!document.querySelector('[data-recommendation-block]'));assert.equal(await page.locator('[data-recommendation-product]').count(),0);
 await browser.close();fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({results,errors,off:true,failedImagesHidden:true,incompleteHidden:true,articleHidden:true,homeAndShell:true,externalRequestsBlocked:true},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({captures:out,cases:results.length,errors}));
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1;});
