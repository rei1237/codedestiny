const {chromium}=require('playwright');
const fs=require('fs');
const product=process.argv[2]||'saju-summary';
const key=product==='saju-daewun'?'section_daewun':'section_summary';
const card=product==='saju-daewun'?'daewunCard':'summaryCard';
const output='docs/product-details/verification/'+product;
const origin='http://127.0.0.1:14330';
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(url.pathname.startsWith('/api/'))return route.fulfill({status:200,json:url.pathname==='/api/auth/me'?{ok:true,authenticated:true,user:{id:'mock-detail-user',name:'검수'}}:{ok:true,profiles:[],unlocks:[],data:{}}});return route.continue();});
  await page.goto(origin+'/ggulggul/?action=cdOneStepFreeSajuEntry');
  await page.locator('#nameInput').fill('검수');
  await page.locator('#birthDate').fill('1990-01-15');
  await page.locator('#btnF').click();
  await page.locator('#run-btn').click();
  await page.getByRole('button',{name:'동의하고 결과 보기',exact:true}).click();
  const disclosure=page.locator('[data-saju-offer="'+key+'"] .saju-crafted-offer');
  await disclosure.waitFor({state:'visible',timeout:60000});
  await disclosure.locator(':scope > summary').click();
  await disclosure.locator('.craftedDetail img').first().waitFor();
  fs.mkdirSync(output,{recursive:true});const rows=[];
  for(const width of [360,390,430,1280]){
   await page.setViewportSize({width,height:900});
   for(const img of await disclosure.locator('.craftedDetail img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
   await disclosure.scrollIntoViewIfNeeded();
   await page.locator('#'+card).screenshot({path:output+'/mobile-'+width+'.png'});
   if(width===360){let n=0;for(const img of await disclosure.locator('.craftedDetail img').all()){await img.screenshot({path:output+'/actual-360-panel-'+(++n)+'.png'});}}
   await disclosure.locator('.craftedDetailNotice').scrollIntoViewIfNeeded();
   await page.locator('#'+card+' [data-unlock-key]').first().evaluate(el=>el.scrollIntoView({block:'center'}));
   await page.screenshot({path:output+'/footer-'+width+'.png'});
   rows.push(await disclosure.evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...el.querySelectorAll('.craftedDetail img')].map(i=>({loaded:i.naturalWidth===1080,width:i.clientWidth,left:i.getBoundingClientRect().left,right:i.getBoundingClientRect().right})),noticeSize:getComputedStyle(el.querySelector('.craftedDetailNotice')).fontSize,cta:!!el.closest('.card').querySelector('[data-unlock-key]')})));
  }
  await disclosure.locator('.craftedDetailTranscript > summary').click();
  await disclosure.locator('.craftedDetailTranscript').screenshot({path:output+'/transcript.png'});
  await disclosure.locator('.craftedDetailTranscript > summary').click();
  await disclosure.locator('.craftedDetail img').first().evaluate(i=>i.src='/missing-crafted-test.webp');
  await page.waitForFunction(key=>document.querySelector('[data-saju-offer="'+key+'"] .craftedDetailTranscript').open,key);
  fs.writeFileSync(output+'/fallback.json',JSON.stringify({missingImageOpensTranscript:true,mode:'mock; no payment/LLM'},null,2));
  fs.writeFileSync(output+'/mobile.json',JSON.stringify(rows,null,2));
  if(rows.some(r=>r.scrollWidth>r.width||r.images.some(i=>!i.loaded||i.left<0||i.right>r.width)))throw Error('Image bounds/load failure');
  console.log(JSON.stringify(rows.map(r=>({width:r.width,imageWidth:r.images[0].width,loaded:r.images.every(i=>i.loaded),noticeSize:r.noticeSize,cta:r.cta}))));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
