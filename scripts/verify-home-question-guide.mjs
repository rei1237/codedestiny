import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const [base,output]=process.argv.slice(2);
assert.equal(new URL(base).hostname,'127.0.0.1');
await mkdir(output,{recursive:true});
async function imageMetrics(locator) {
 const result=await locator.evaluate(async image=>{
   // Bring lazy images into range before decode. decode() alone does not start every lazy request.
   image.scrollIntoView({block:'center',behavior:'instant'});
   // A lazy image still waiting for its request rejects decode(); wait for its load first.
   if(!image.complete) await new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',()=>reject(new Error('image failed: '+image.src)),{once:true});});
   await image.decode();
   const source=await createImageBitmap(await fetch(image.currentSrc).then(response=>response.blob()));
   const {width:sourceWidth,height:sourceHeight}=source;
   source.close();
   const box=image.getBoundingClientRect();
   const url=new URL(image.currentSrc);
   return {asset:url.searchParams.get('url') || url.pathname,width:box.width,height:box.height,
     sourceWidth,sourceHeight};
 });
 assert(result.width>0 && result.height>0 && result.sourceWidth>0 && result.sourceHeight>0,'visible decoded art');
 return result;
}
const browser=await chromium.launch({channel:'chrome'});
try {
 const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>{
   const url=new URL(r.request().url());
   if(url.origin!==base)return r.abort();
   if(url.pathname.startsWith('/api/'))return r.fulfill({status:401,json:{ok:false}});
   return r.continue();
 });
 const page=await context.newPage();
 page.setDefaultTimeout(60000);
 const questionField=page.locator('#home-question');
 const openQuestions=async()=>{
   if(!await questionField.isVisible()) await page.locator('summary#homeCardTitle').click();
   await page.waitForSelector('#home-question:visible');
   await page.waitForSelector('form button:not(:disabled)');
 };
 const go=async()=>{await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('summary#homeCardTitle').waitFor();await page.waitForSelector('#home-question + button:not(:disabled)',{state:'attached'});};
 const btn=name=>page.getByRole('button',{name,exact:true});
 const fill=async(q)=>{await openQuestions();await questionField.fill(q);await btn('내 질문에 맞는 상담 찾기').click();};
 const shot=async(name)=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:output+'/'+name+'.png',style:'nextjs-portal{display:none}',scale:'css'});};
 await context.addCookies([{name:'cd_cookie_consent',value:'essential',url:base}]);
 await go();
 await openQuestions();
 const examples=page.locator('summary').filter({hasText:'예시 질문 보기'});
 if(!await btn('먼저 연락해도 될까요?').isVisible()) await examples.click();
 await btn('먼저 연락해도 될까요?').click();assert.equal(await page.locator('#home-question').inputValue(),'먼저 연락해도 될까요?');
 await fill(' ');await page.getByText('궁금한 내용을 한 줄 적어 주세요.').waitFor();await btn('먼저 연락해도 될까요?').click();
 await page.locator('#home-question').fill('');await page.locator('#home-question').blur();await shot('01-start');
 const trigger=page.getByRole('button',{name:/이용 안내 웹툰 보기/});
 const reader=page.getByRole('dialog');
 const draft='답장을 기다릴 때 지킬 기준이 궁금해요.';
 assert.equal(await trigger.locator('img').count(),1);
 for(const width of [360,390,430,1120]){
   await page.setViewportSize({width,height:width===360?740:844});
   await go();
   assert.equal(await questionField.isVisible(),false);
   const entries=page.locator('[data-home-card]');
   assert.equal(await entries.count(),2);
   const tutorial=await imageMetrics(trigger.locator('img'));
   assert(tutorial.width>=(width===360?140:150) && tutorial.height>=96,'tutorial artwork is large enough to recognize both guides');
   assert(tutorial.sourceWidth>=1.8*tutorial.width && tutorial.sourceHeight>=1.8*tutorial.height,'tutorial supplies a sharp high-density source');
   for(const card of await entries.locator('img').all()) await imageMetrics(card);
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   console.log('Tutorial at '+width+'px: '+Math.round(tutorial.width)+'×'+Math.round(tutorial.height)+' displayed, '+tutorial.sourceWidth+'×'+tutorial.sourceHeight+' intrinsic');
   const [left,right]=await Promise.all([entries.nth(0).boundingBox(),entries.nth(1).boundingBox()]);
   assert(left && right && left.x+left.width<=right.x+2 && Math.abs(left.y-right.y)<20,'both tarot cards are side by side');
   for(const box of [left,right,await trigger.boundingBox()]) assert(box && box.y>=0 && box.y+box.height<=page.viewportSize().height,'entry above first fold');
   assert(await trigger.evaluate(button=>{
     const rect=button.getBoundingClientRect();
     return button.contains(document.elementFromPoint(rect.x+rect.width/2,rect.bottom-4));
   }),'bottom navigation leaves the complete tutorial visible');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:output+'/entry-'+width+'.png',style:'nextjs-portal{display:none}',scale:'css'});
   await verifyShelf(width);
   await trigger.click();
   await reader.getByRole('button',{name:'내 질문 써보기'}).click();
   await page.waitForFunction(()=>document.activeElement?.id==='home-question');
   await questionField.fill(draft);
   await trigger.click();
   await reader.waitFor();
   assert.equal(await reader.locator('section').count(),7);
   assert.equal(await reader.locator('p[data-cat] b').first().innerText(),'영냥이','both guides speak');
   assert.equal(await reader.locator('p b').first().innerText(),'꽃돼지 연이');
   assert.equal(await reader.getByRole('link',{name:/마스터 상담 둘러보기/}).getAttribute('href'),'/consultations/');
   if(width===360){
     for(const [index,name] of [[0,'03-comic-first'],[4,'04-comic-profile'],[6,'05-comic-records']]){
       const panel=reader.locator('section').nth(index);
       await panel.locator('img').scrollIntoViewIfNeeded();
       await panel.locator('img').evaluate(img=>img.decode());
       await reader.evaluate((el,i)=>{el.scrollTop+=el.querySelectorAll('section')[i].getBoundingClientRect().top-el.querySelector('header').getBoundingClientRect().bottom-8;},index);
       await page.screenshot({path:output+'/'+name+'.png',style:'nextjs-portal{display:none}',scale:'css'});
     }
     await page.addStyleTag({content:'html {font-size:200% !important}'});
     assert(await reader.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
     await reader.getByRole('button',{name:'내 질문 써보기'}).click();
     await page.waitForFunction(()=>document.activeElement?.id==='home-question');
     await page.reload();await openQuestions();await questionField.fill(draft);await trigger.click();await reader.waitFor();
   }
   await page.keyboard.press('Escape');await reader.waitFor({state:'hidden'});
   assert(await trigger.evaluate(el=>el===document.activeElement));
   await trigger.click();await page.goBack();await reader.waitFor({state:'hidden'});
   assert.equal(await questionField.inputValue(),draft);
   await trigger.click();await reader.getByRole('button',{name:'내 질문 써보기'}).click();
   await page.waitForFunction(()=>document.activeElement?.id==='home-question');
   assert.equal(await questionField.inputValue(),draft);
   await btn('내 질문에 맞는 상담 찾기').click();
   await page.getByRole('heading',{name:'네오의 팩폭 전략실',exact:true,level:2}).waitFor();await btn('질문 수정하기').click();
 }
 await go();
 const firstStory=page.locator('section[aria-labelledby="homeStoryTitle"] a[data-story-id="yeongnyangi"]');
 await page.setViewportSize({width:390,height:844});
 await captureDailyCardAndInstall();
 await firstStory.click();
 await page.waitForURL(url=>/^\/yeongnyangi\/season-1\/ep\d+\/$/.test(url.pathname));
 await page.locator('[data-serial-episode] img').first().waitFor();
 await page.setViewportSize({width:360,height:800});
 console.log('PASS comic desktop/mobile, focus, back, zoom, draft submission');
 async function captureSection(section,name){
   await section.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
   await page.screenshot({path:output+'/'+name+'.png',style:'nextjs-portal{display:none}',scale:'css'});
 }
 async function verifyShelf(width){
   const shelf=page.locator('section[aria-labelledby="homeStoryTitle"]');
   const links=shelf.locator('a[data-story-id]:visible');
   const toggle=shelf.locator('summary').filter({hasText:'웹툰 전체 보기'});
   assert.equal(await links.count(),3);
   for(const image of await links.locator('img').all())await imageMetrics(image);
   for(const image of await toggle.locator('img').all())await imageMetrics(image);
   if(width===390) await captureSection(shelf,'shelf-390');
   await toggle.focus();
   await page.keyboard.press('Enter');
   assert.equal(await links.count(),15);
   const artwork=new Set();
   for(const link of await links.all()){
     const id=await link.getAttribute('data-story-id');
     const href=id==='yeongnyangi'?await link.getAttribute('href'):id==='heukwol'?'/heukwol/#heukwol-story':'/consultations/'+id+'/#story';
     assert.equal(await link.getAttribute('href'),href,id+' reader');
     if(id==='yeongnyangi')assert.match(href,/^\/yeongnyangi\/season-1\/ep\d+\/$/,'영냥이 card opens the latest episode');
     const image=link.locator('img');
     assert.equal(await image.count(),1,id+' has one cover');
     const art=await imageMetrics(image);
     assert(art.width>=80 && art.height>=64,id+' recognizable cover');
     assert(art.sourceWidth>=art.width && art.sourceHeight>=art.height,id+' cover native resolution');
     assert(!artwork.has(art.asset),id+' uses its own art');
     artwork.add(art.asset);
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'open shelf fits viewport');
   if(width===390)await captureSection(toggle,'shelf-open-390');
   await toggle.focus();
   await page.keyboard.press('Space');
   assert.equal(await links.count(),3);
   assert(await toggle.evaluate(el=>el===document.activeElement));
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 }
 async function captureDailyCardAndInstall(){
   const gate=page.locator('#homeDailyCard');
   assert.equal(await gate.locator('img[src*="/images/home/forest/"]').count(),0);
   await gate.scrollIntoViewIfNeeded();
   await gate.getByText('프로필 카드 예시',{exact:true}).waitFor();
   await gate.locator('[data-character-id]').evaluate(async el=>{
     const sprite=new Image();sprite.src=getComputedStyle(el).backgroundImage.slice(5,-2);await sprite.decode();
   });
   await captureSection(gate,'daily-card-example-390');
   const install=page.getByRole('complementary',{name:'홈 화면에 추가'});
   await imageMetrics(install.locator('img').first());
   const play=install.getByRole('link',{name:/Google Play/});
   assert.equal(await play.getAttribute('href'),'https://play.google.com/store/apps/details?id=com.codedestiny.app');
   await page.waitForFunction(()=>typeof window.__cdPwaLifecycle?.install==='function');
   await page.evaluate(()=>{
     const event=new Event('beforeinstallprompt',{cancelable:true});
     window.installPromptCount=0;
     event.prompt=()=>{window.installPromptCount++;return Promise.resolve()};
     event.userChoice=Promise.resolve({outcome:'dismissed'});
     window.dispatchEvent(event);
   });
   const add=install.getByRole('button',{name:/홈 화면에 추가/});
   for (const control of [add,play]){
     await control.waitFor();
     const box=await control.boundingBox();
     assert(box && box.height>=48 && box.x>=0 && box.x+box.width<=page.viewportSize().width);
     const lines=await control.evaluate(el=>{
       const text=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
       const tops=new Set();
       while(text.nextNode()){
         if(!text.currentNode.textContent.trim()) continue;
         const range=document.createRange();
         range.selectNodeContents(text.currentNode);
         for(const rect of range.getClientRects()) tops.add(Math.round(rect.top));
       }
       return tops.size;
     });
     assert.equal(lines,1,'mobile install label stays on a single line');
   }
   await captureSection(install,'install-390');
   await add.click();
   assert.equal(await page.evaluate(()=>window.installPromptCount),1,'manual PWA control invokes prompt once');
 }
 const cases=[
 ['헤어진 뒤 자꾸 제 탓 같아요. 마음을 좀 정리하고 싶어요.','연이의 운명의 찻집','/fortune-tea-house/','textarea,input'],
 ['연락을 한 번 더 할지, 여기서 멈출지 기준을 정하고 싶어요.','네오의 팩폭 전략실','/neo-operation-room/','#neo-operation-question'],
 ['사주로 제가 연애에서 반복하는 패턴을 알고 싶어요.','운세보는 영냥이','/yeongnyangi/fortune/','textarea'],
 ['위로보다 타로 카드로 지금 관계를 보고 싶어요.','우리는 무슨 사이? · 관계 타로','/tarot/love/',null]];
 for(const [i,[q,name,path,selector]] of cases.entries()){
   await go();await fill(q);await page.getByRole('heading',{name,exact:true,level:2}).waitFor();
   if(i===1)await shot('03-match');
   const link=page.locator('section[aria-labelledby="homeQuestionTitle"] a').first();await link.click({timeout:120000});
   await page.waitForURL(u=>u.pathname===path,{timeout:120000});assert(!decodeURIComponent(page.url()).includes(q));
   if(selector){
     await page.waitForFunction(([s,v])=>Array.from(document.querySelectorAll(s)).some(el=>el.value===v&&el.getBoundingClientRect().height>0),[selector,q],{timeout:60000});
     const field=page.locator(selector).filter({visible:true});for(const el of await field.all()){if(await el.inputValue()===q){await el.fill(q+' 수정');break;}}
   }else await page.locator('h1').first().waitFor();
   console.log('PASS',i+1,path,selector?'editable original':'menu');
 }
 // Verify the letter intake when the existing consultation-room flag is enabled, too.
 await context.route('**/api/fortune-chat/consultations/status',r=>r.fulfill({json:{enabled:true}}));
 await go();await fill(cases[0][0]);await page.getByRole('link',{name:'이 질문으로 연이와 상담하기'}).click();
 await page.waitForFunction(v=>document.querySelector('#yeoni-question')?.value===v,cases[0][0]);console.log('PASS letter intake flag');
 await go();await fill('연애가 고민이에요.');await shot('02-followup');await page.goBack();assert.equal(await page.locator('#home-question').inputValue(),'연애가 고민이에요.');
 await fill('연애가 고민이에요.');await btn('직접 답하기').click();await page.locator('#home-answer').fill('카드를 뽑아 지금 상황을 보고 싶어요.');await btn('답변 반영하기').click();
 await page.getByRole('heading',{name:cases[3][1],level:2}).waitFor();assert.equal(await page.getByRole('link',{name:'관계 타로 배열 보기'}).getAttribute('href'),'/tarot/love/');
 await btn('이전 답변 수정하기').click();assert.match(await page.locator('#home-answer').inputValue(),/카드/);await btn('판단할 기준을 세우고 싶어요.').click();await page.getByRole('heading',{name:cases[1][1],level:2}).waitFor();
 await btn('처음 질문 수정하기').click();await page.setViewportSize({width:360,height:390});const long='연락을 기다리며 '.repeat(60)+'기준이 필요해요.';await fill(long);assert.equal(await page.locator('section[aria-labelledby="homeQuestionTitle"] p').first().textContent(),long);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS 5 followup/edit/short viewport/long question');
 await go();await openQuestions();await page.getByText('운세 종류로 찾기',{exact:true}).click();await page.locator('details nav').getByRole('link',{name:'타로',exact:true}).click();await page.waitForURL('**/tarot/');await page.locator('h1').first().waitFor();console.log('PASS 6 /tarot/');
}finally{await browser.close();}
