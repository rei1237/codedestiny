const fs = require('fs');
const {chromium} = require('playwright');
const origin = 'http://127.0.0.1:14330';
(async () => {
 const browser = await chromium.launch();
 try {
  for (const [id,route] of [['fusion-fortune','/fusion-fortune/']]) {
   console.log('checking '+id);
   const out='docs/product-details/verification/'+id;
   const page=await browser.newPage({viewport:{width:390,height:900},locale:'ko-KR',reducedMotion:'reduce'});
   await page.routeWebSocket('**',socket=>socket.close());
   await page.route('**/*',r=>{
    const u=new URL(r.request().url());
    if(u.origin!==origin)return r.abort();
    if(u.pathname.startsWith('/api/'))return r.fulfill({json:{ok:true,authenticated:false,profiles:[],data:{}}});
    return r.continue();
   });
   await page.goto(origin+route+'?lang=ko',{timeout:120000});
   await page.getByText('이 상담을 글과 그림으로 자세히 보기',{exact:true}).click();
   const detail=page.locator('.craftedDetail');
   await detail.locator('img').first().waitFor();
   const rows=[];
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
    const cta=page.locator('a[href="#fusion-form"]').first();
    await cta.evaluate(el=>el.scrollIntoView({block:'center'}));
    await page.screenshot({path:out+'/cta-'+width+'.png'});
    rows.push(await detail.evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...el.querySelectorAll('img')].map(img=>({loaded:img.naturalWidth===1080,width:img.clientWidth,left:img.getBoundingClientRect().left,right:img.getBoundingClientRect().right}))})));
   }
   await detail.locator('.craftedDetailTranscript>summary').click();
   await detail.locator('.craftedDetailTranscript').screenshot({path:out+'/transcript.png'});
   await page.setViewportSize({width:360,height:900});
   for(const index of [2,7,9]){await detail.locator('.craftedDetailTranscript section').nth(index).evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/transcript-viewport-'+(index+1)+'.png'});}
   await detail.locator('.craftedDetailTranscript>summary').click();
   await detail.locator('img').first().scrollIntoViewIfNeeded();
   await detail.locator('img').first().evaluate(img=>{img.loading='eager';img.src='/missing-crafted-test.webp';});
   await page.waitForFunction(()=>document.querySelector('.craftedDetailTranscript').open);
   const result={id,rows,missingImageOpensTranscript:true,mode:'mock; all APIs mocked; external traffic and HMR blocked; no payment or LLM'};
   fs.writeFileSync(out+'/mobile.json',JSON.stringify(result,null,2)+'\n');
   if(rows.some(row=>row.scrollWidth>row.width||row.images.some(img=>!img.loaded||img.left<0||img.right>row.width)))throw Error(id+': image bounds failure');
   console.log(rows.map(row=>({width:row.width,imageWidth:row.images[0].width})));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
