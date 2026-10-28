const fs=require('fs');
const {chromium}=require('playwright');
const origin='http://127.0.0.1:14330';
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const [id,label] of [['master-love-codex','개인판 상세 안내'],['master-love-codex-compat','궁합판 상세 안내']]){
   const out='docs/product-details/verification/'+id;
   const page=await browser.newPage({viewport:{width:390,height:900},locale:'ko-KR',reducedMotion:'reduce'});
   await page.routeWebSocket('**',socket=>socket.close());
   await page.route('**/*',r=>{
    const url=new URL(r.request().url());
    if(url.origin!==origin)return r.abort();
    if(url.pathname.startsWith('/api/'))return r.fulfill({json:{ok:true,authenticated:false,profiles:[],sessions:[],orders:[],data:{}}});
    return r.continue();
   });
   await page.goto(origin+'/master-love-codex/?lang=ko',{timeout:120000});
   const region=page.getByRole('region',{name:label});
   await region.locator('summary').first().click();
   const detail=region.locator('.craftedDetail');
   await detail.locator('img').first().waitFor();
   const rows=[];
   const bar=page.locator('[class*=floatingBar]');
   if(await bar.evaluate(el=>getComputedStyle(el).visibility)!=='hidden')throw Error('Foreign floating CTA visible while reading');
   for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:900});
    let index=0;
    for(const img of await detail.locator('img').all()){
     await img.evaluate(el=>el.scrollIntoView({block:"center"}));await img.evaluate(el=>el.decode());
     if(width===360)await img.screenshot({path:out+'/actual-360-panel-'+(++index)+'.png'});
    }
    await page.evaluate(()=>document.activeElement?.blur());
    await detail.screenshot({path:out+'/actual-'+width+'.png'});
    await detail.locator('.craftedDetailNotice').evaluate(el=>el.scrollIntoView({block:'center'}));
    await page.screenshot({path:out+'/notice-'+width+'.png'});
    await page.locator('#codex-reading-options article').nth(id.endsWith('compat')?0:1).evaluate(el=>el.scrollIntoView({block:'center'}));
    await page.screenshot({path:out+'/cta-'+width+'.png'});
    rows.push(await detail.evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...el.querySelectorAll('img')].map(img=>({loaded:img.naturalWidth===1080,width:img.clientWidth,left:img.getBoundingClientRect().left,right:img.getBoundingClientRect().right}))})));
   }
   const plan=id.endsWith('compat')?'compat':'solo';
   await region.locator('a[href="#codex-plan-'+plan+'"]').click();
   if(!page.url().endsWith('#codex-plan-'+plan))throw Error('Wrong offer return target');
   await detail.locator('.craftedDetailTranscript>summary').click();
   await detail.locator('.craftedDetailTranscript').screenshot({path:out+'/transcript.png'});
   await detail.locator('.craftedDetailTranscript>summary').click();
   await detail.locator('img').first().evaluate(img=>{img.loading='eager';img.src='/missing-crafted-test.webp';});
   await page.waitForFunction(()=>[...document.querySelectorAll('.craftedDetailTranscript')].some(el=>el.open));
   fs.writeFileSync(out+'/mobile.json',JSON.stringify({id,rows,missingImageOpensTranscript:true,foreignFloatingCtaHidden:true,returnTarget:plan,mode:'mock; all APIs mocked; external traffic and HMR blocked; no payment or LLM'},null,2)+'\n');
   if(rows.some(row=>row.scrollWidth>row.width||row.images.some(img=>!img.loaded||img.left<0||img.right>row.width)))throw Error(id+': bounds failure');
   console.log(id,rows.map(row=>({width:row.width,imageWidth:row.images[0].width})));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
