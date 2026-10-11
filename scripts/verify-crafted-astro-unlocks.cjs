const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright');
const origin='http://127.0.0.1:14330',products={astro_basic_deep_pack:'astro-basic-deep',astro_career_talent_deep:'astro-career-talent',astro_growth_shadow_deep:'astro-growth-shadow',astro_stellar_career_room:'astro-stellar-career',astro_stellar_relationship_room:'astro-stellar-relationship',astro_stellar_growth_room:'astro-stellar-growth',astro_stellar_talent_room:'astro-stellar-talent',astro_talent_attraction_deep:'astro-talent-attraction',astro_relationship_deep:'astro-relationship'};
(async()=>{const browser=await chromium.launch();try{
 for(const [key,id]of Object.entries(products)){
  if(process.argv[2]&&process.argv[2]!==id)continue;
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});const requests=[];
  await page.routeWebSocket('**',s=>s.close());
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname==='/api/astro/basic-deep'){requests.push(u.pathname);return r.fulfill({status:402,json:{ok:false,featureKey:'astro_basic_deep_pack',coinPrice:10,amountKRW:1000}});}if(u.pathname.startsWith('/api/'))return r.fulfill({json:u.pathname==='/api/auth/me'?{ok:true,authenticated:true,user:{id:'mock-detail-user',name:'검수'}}:{ok:true,profiles:[],unlocks:[],data:{}}});return r.continue();});
  await page.goto(origin+'/ggulggul/?action=cdOneStepFreeSajuEntry',{timeout:120000});await page.locator('#nameInput').fill('검수');await page.locator('#birthDate').fill('1990-01-15');await page.locator('#btnF').click();await page.locator('#run-btn').click();await page.getByRole('button',{name:'동의하고 결과 보기',exact:true}).click();
  await page.waitForFunction(()=>typeof window.openAstroModal==='function');await page.evaluate(()=>window.openAstroModal());
  // These older SKUs exist only in the shipped renderer fallback. Exercise
  // that exact path explicitly; do not mistake the normal stellar-room SKUs for them.
  if(['astro_career_talent_deep','astro_growth_shadow_deep','astro_talent_attraction_deep','astro_relationship_deep'].includes(key)){await page.waitForFunction(()=>typeof window.renderAstroInsight==='function');await page.evaluate(()=>{window.renderAstroInsightLegacyNeon=()=>{throw Error('MOCK_LEGACY_RENDER_FAILURE')};window.renderAstroInsight();});}
  const detail=page.locator('[data-astro-crafted="'+key+'"]');await detail.waitFor({timeout:60000});await detail.locator(':scope>summary').click();await detail.locator('img').first().waitFor();
  await page.addStyleTag({content:'button[aria-label="개발 결제 테스터"]{display:none!important}'});
  const dir='docs/product-details/verification/'+id;const rows=[];
  for(const width of [360,390,430,1280]){
   await page.setViewportSize({width,height:900});let n=0;
   for(const img of await detail.locator('img').all()){await img.evaluate(e=>e.scrollIntoView({block:'center'}));await img.evaluate(e=>e.decode());n++;if(width===360){
    await page.waitForFunction(()=>[...document.querySelectorAll('.astro-crafted[open] img')].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}).every(i=>i.complete&&i.naturalWidth>0));
    await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.astro-crafted[open] img')].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}).map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    await page.screenshot({path:dir+'/native-360-panel-'+n+'.png'});
   }}
   const notice=detail.locator('.craftedDetailNotice');await notice.evaluate(e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:dir+'/native-notice-'+width+'.png'});
   const cta=key==='astro_basic_deep_pack'?page.locator('[data-astro-server-detail] [data-unlock-key="'+key+'"]'):page.locator('#astroPaidGate_'+key+' button[data-unlock-key]');await cta.evaluate(e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:dir+'/native-cta-'+width+'.png'});
   const row=await detail.evaluate(e=>({width:innerWidth,ancestors:(()=>{let a=[],n=e;while(n&&a.length<7){a.push({tag:n.tagName,cls:n.className,width:n.clientWidth});n=n.parentElement}return a})(),images:[...e.querySelectorAll('img')].map(i=>({loaded:i.naturalWidth===1080,left:i.getBoundingClientRect().left,right:i.getBoundingClientRect().right,width:i.clientWidth}))}));assert(row.images.every(i=>i.loaded&&i.left>=0&&i.right<=width));rows.push(row);
  }
  await page.setViewportSize({width:360,height:900});await detail.locator('.craftedDetailTranscript>summary').click();await detail.locator('.craftedDetailTranscript section').nth(4).evaluate(e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:dir+'/native-transcript.png'});await detail.locator('.craftedDetailTranscript>summary').click();
  await page.route('**/missing-crafted-test.webp',r=>r.fulfill({status:404,body:''}));await detail.locator('img').first().evaluate(i=>{i.loading='eager';i.src='/missing-crafted-test.webp';});await detail.locator('.craftedDetailTranscript[open]').waitFor();
  fs.writeFileSync(dir+'/mobile.json',JSON.stringify({rows,fallback:true,entry:!['astro_career_talent_deep','astro_growth_shadow_deep','astro_talent_attraction_deep','astro_relationship_deep'].includes(key)?'Existing openAstroModal invoked after mock saju input; render evidence, not isolated tile click':'Existing fallback renderer forced by mocked legacy renderer failure; these are not normal stellar-room SKUs',requests,mode:'All API mocked; basic-deep 402 pricing mock; no live purchase/LLM; production-hidden dev tester excluded'},null,2)+'\n');console.log(id,rows.map(r=>[r.width,r.images[0].width]));await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
