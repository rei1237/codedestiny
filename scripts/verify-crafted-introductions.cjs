const fs=require('fs');const {chromium}=require('playwright');
const origin='http://127.0.0.1:14330';
const requested=process.argv.find(arg=>arg.startsWith('--product='))?.slice(10);
async function setup(browser){
 const {FEATURE_KEY_PRICE_TABLE}=await import('../worker/lib/paid-feature-registry.js');
 const pricing={data:{legacyFeatureTable:Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey,entry])=>({featureKey,...entry}))}};
 const page=await browser.newPage({viewport:{width:390,height:900},locale:'ko-KR',reducedMotion:'reduce'});
 await page.routeWebSocket('**',s=>s.close());
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname==='/api/billing/features')return r.fulfill({json:pricing});if(u.pathname.startsWith('/api/'))return r.fulfill({json:{ok:true,authenticated:true,user:{id:'mock-detail-user',name:'검수'},profiles:[],unlocks:[],data:{}}});return r.continue();});
 return page;
}
async function capture(page,id,surface,detail,cta){
 const out='docs/product-details/verification/'+id+'/'+surface;fs.mkdirSync(out,{recursive:true});
 const rows=[];
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});
  let index=0;
  for(const img of await detail.locator('img').all()){
   await img.evaluate(el=>el.scrollIntoView({block:'center'}));await img.evaluate(el=>el.decode());
   if(width===360&&(['animal-destiny','animal-totem-basic','animal-totem-deep'].includes(id)||[0,4,9].includes(index)))await page.screenshot({path:out+'/panel-'+(index+1)+'-360.png'});
   index++;
  }
  await detail.locator('.craftedDetailNotice').evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/notice-'+width+'.png'});
  await cta.evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/cta-'+width+'.png'});
  rows.push(await detail.evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...el.querySelectorAll('img')].map(img=>({loaded:img.naturalWidth===1080,width:img.clientWidth,left:img.getBoundingClientRect().left,right:img.getBoundingClientRect().right}))})));
 }
 await page.setViewportSize({width:360,height:900});
 await detail.locator('.craftedDetailTranscript>summary').click();
 await detail.locator('.craftedDetailTranscript section').nth(7).evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/transcript-360.png'});
 await detail.locator('.craftedDetailTranscript>summary').click();
 await page.route('**/missing-crafted-test.webp',r=>r.fulfill({status:404,body:''}));await detail.locator('img').first().evaluate(img=>{img.loading='eager';img.src='/missing-crafted-test.webp';});
 await detail.locator('.craftedDetailTranscript[open]').waitFor();
 const result={id,surface,rows,missingImageOpensTranscript:true,mode:'Local mock; prices from local registry; no external traffic, payment, or LLM',entryEvidence:surface==='popup'&&id==='love-secret'?'Existing popup entry invoked directly; render evidence, not isolated click evidence':'Existing UI'};fs.writeFileSync(out+'/verification.json',JSON.stringify(result,null,2)+'\n');
 if(rows.some(r=>r.scrollWidth>r.width||r.images.some(i=>!i.loaded||i.left<0||i.right>r.width)))throw Error(id+' '+surface+' bounds');
 console.log(id,surface,rows.map(r=>[r.width,r.images[0].width]));
}
(async()=>{const browser=await chromium.launch();try{
 for(const [slug,ids] of (process.argv.includes('--popups-only')?[]:[['olympus-oracle',['olympus-oracle']],['nakshatra-muhurta',['nakshatra-muhurta']],['animal-destiny',['animal-destiny']],['animal-totem',['animal-totem-basic','animal-totem-deep']],['life-book-ai',['life-book']],['love-secret-ai',['love-secret']],['master-love-codex',['master-love-codex','master-love-codex-compat']],['fusion-fortune',['fusion-fortune']],['fortune-chat',['chat-yeoni','chat-neo']],['neo-operation-room',['neo-operation-room']],['fortune-tea-house',['tea-saju','tea-saju-compat','tea-sukuyo','tea-tarot-three','tea-tarot-five']]])){
  for(const [index,id] of ids.entries()){
   if(requested&&requested!==id)continue;
   const p=await setup(browser);await p.goto(origin+'/features/'+slug+'/',{timeout:120000});
   if(ids.length>1)await p.locator('.craftedEdition>summary').nth(index).click();
   const detail=p.locator('.craftedDetail').nth(index);await detail.locator('img').first().waitFor();
   await capture(p,id,'introduction',detail,p.locator('[data-fortune-hero-action]'));await p.close();
  }
 }
 for(const [id,selector,resultPage] of [['life-fortune','[data-feature-key="life-fortune-ai-consultation"]',false],['life-book','[data-feature-key="life-book-ai-consultation"]',true],['love-secret','[data-action="goLoveSecretAi"]',true]]){
  if(requested&&requested!==id)continue;
  if(process.argv.includes('--love-only')&&id!=='love-secret')continue;
  const p=await setup(browser);await p.goto(origin+'/ggulggul/'+(resultPage?'?action=cdOneStepFreeSajuEntry':'?lang=ko'),{timeout:120000});
  if(resultPage){await p.locator('#nameInput').fill('검수');await p.locator('#birthDate').fill('1990-01-15');await p.locator('#btnF').click();await p.locator('#run-btn').click();await p.getByRole('button',{name:'동의하고 결과 보기',exact:true}).click();}
  await p.waitForFunction(()=>typeof window._cdOpenTilePreview==='function');
  if(id==='life-fortune'){await p.evaluate(()=>window.__cdOpenGarden());await p.locator('[data-target="premiumVvipCollection"]').click();}
  console.log('opening popup',id);
  const tile=p.locator(selector).first();await tile.waitFor({state:'attached',timeout:60000});await tile.scrollIntoViewIfNeeded();await p.waitForTimeout(500);
  // The isolated result-page mock click did not open this popup. Exercise the
  // same existing popup entry directly; this is render evidence, not click evidence.
  if(id==='love-secret'){const opened=await tile.evaluate(el=>window._cdOpenTilePreview(el));if(!opened)throw Error('Existing popup entry declined');}
  else await tile.click({timeout:60000});
  const host=p.locator('#tilePvwOverlay [data-crafted-introduction]');await host.waitFor({timeout:60000}).catch(async e=>{console.log(await p.evaluate(()=>({url:location.href,overlay:document.querySelector("#tilePvwOverlay")?.className,host:document.querySelector("[data-feature-visual-host]")?.innerText.slice(0,500)})));throw e;});
  const index=id==='master-love-codex-compat'?1:0;
  if(id.startsWith('master-love-codex'))await host.locator('.craftedEdition>summary').nth(index).click();
  const detail=host.locator('.craftedDetail').nth(index);
  await p.waitForFunction(()=>{const button=document.querySelector('[data-feature-visual-host] [data-fortune-hero-action] button');return button&&!button.disabled&&!button.textContent.includes('가격 확인');});
  await capture(p,id,'popup',detail,host.locator('[data-fortune-hero-action]'));await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
