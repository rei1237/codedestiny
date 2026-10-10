const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const origin='http://127.0.0.1:14330';
(async()=>{
 const {FEATURE_KEY_PRICE_TABLE}=await import('../worker/lib/paid-feature-registry.js');
 const pricing={data:{legacyFeatureTable:Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey,entry])=>({featureKey,...entry}))}};
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:900},locale:'ko-KR',reducedMotion:'reduce'});
  const writes=[];
  await page.routeWebSocket('**',socket=>socket.close());
  await page.route('**/*',r=>{
   const u=new URL(r.request().url());
   if(u.origin!==origin){const file=path.join(process.cwd(),'public',decodeURIComponent(u.pathname));if(u.hostname==='assets.code-destiny.com'&&fs.existsSync(file))return r.fulfill({path:file});return r.abort();}
   if(u.pathname.startsWith('/api/')){
    if(r.request().method()!=='GET')writes.push({path:u.pathname,method:r.request().method()});
    if(u.pathname==='/api/billing/features')return r.fulfill({json:pricing});
    if(u.pathname==='/api/fortune-chat/consultations/status')return r.fulfill({json:{enabled:false}});
    if(u.pathname==='/api/fortune-chat/bootstrap')return r.fulfill({json:{session:{sessionId:'crafted-review',characterId:'yeoni',messages:[]},usage:{isLoggedIn:true,dailyFreeRemaining:0,guestFreeRemaining:0}}});
    return r.fulfill({json:{ok:true,authenticated:false,profiles:[],data:{}}});
   }
   return r.continue();
  });
  await page.goto(origin+'/fortune-chat/?lang=ko',{timeout:120000});
  const birth=page.locator('details').filter({has:page.getByText('생년 정보를 알려주세요',{exact:true})});
  if(await birth.getAttribute('open')!==null)await birth.locator('summary').click();
  for(const [variant,label] of [['yeoni','연이'],['neo','네오']]){
   const id='chat-'+variant,out='docs/product-details/verification/'+id;
   await page.locator('section[aria-label="상담자 선택"]').getByRole('button',{name:new RegExp(label)}).click();
   const disclosure=page.locator('[data-crafted-product-disclosure]');
   if(await disclosure.getAttribute('open')!==null)throw Error('Variant disclosure did not reset');
   await disclosure.locator('summary').click();
   const detail=disclosure.locator('.craftedDetail');await detail.locator('img').first().waitFor();
   if(!(await detail.locator('img').first().getAttribute('src')).includes('/'+id+'/'))throw Error('Wrong variant');
   const rows=[];
   for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:900});let index=0;
    for(const img of await detail.locator('img').all()){
     await img.evaluate(el=>el.scrollIntoView({block:'center'}));await img.evaluate(el=>el.decode());
     if(width===360)await page.screenshot({path:out+'/actual-360-panel-'+(++index)+'.png'});
    }
    await detail.locator('.craftedDetailNotice').evaluate(el=>el.scrollIntoView({block:'center'}));
    await page.screenshot({path:out+'/notice-'+width+'.png'});
    rows.push(await detail.evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...el.querySelectorAll('img')].map(img=>({loaded:img.naturalWidth===1080,width:img.clientWidth,left:img.getBoundingClientRect().left,right:img.getBoundingClientRect().right}))})));
    await disclosure.locator(':scope>summary').evaluate(el=>el.scrollIntoView({block:'start'}));
    await page.screenshot({path:out+'/cta-'+width+'.png'});
   }
   await page.setViewportSize({width:360,height:900});
   await detail.locator('.craftedDetailTranscript>summary').click();
   for(const index of [3,7]){await detail.locator('.craftedDetailTranscript section').nth(index).evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/transcript-viewport-'+(index+1)+'.png'});}
   await detail.locator('.craftedDetailTranscript>summary').click();
   await page.route('**/missing-crafted-test.webp',r=>r.fulfill({status:404,body:''}));
   await detail.locator('img').first().evaluate(img=>{img.loading='eager';img.src='/missing-crafted-test.webp';});
   await page.waitForFunction(()=>document.querySelector('.craftedDetailTranscript').open);
   const result={id,rows,variantResetsDisclosure:true,missingImageOpensTranscript:true,writes,mode:'All APIs including bootstrap mocked; local official asset mirrors; external traffic blocked; no payment or LLM; input send not invoked'};
   fs.writeFileSync(out+'/mobile.json',JSON.stringify(result,null,2)+'\n');
   if(rows.some(row=>row.scrollWidth>row.width||row.images.some(img=>!img.loaded||img.left<0||img.right>row.width)))throw Error(id+': bounds failure');
   console.log(id,rows.map(row=>({width:row.width,imageWidth:row.images[0].width})),writes);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
