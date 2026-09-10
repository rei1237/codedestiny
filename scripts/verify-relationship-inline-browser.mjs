import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin=process.argv[2] || 'http://127.0.0.1:3107';
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname==='/api/relationship-boundary-test/generate')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,sessionId:'mock-reading',score:52,grade:'medium',character:{title:'관계를 읽는 시간',caption:'회귀 검증용 결과'},scoreFactors:['서로의 약속과 생활 리듬을 살펴봅니다.'],summary:'관계의 흐름을 함께 살펴봅니다.',sections:Array.from({length:5},(_,i)=>({title:'관계의 장면 '+(i+1),body:Array.from({length:12},(_,j)=>('검증 문단 '+(j+1)+'. 서로의 마음과 생활 리듬을 존중하고 대화로 경계를 정하는 모습을 살펴봅니다. ').repeat(6)).join('\n\n')})),finalMessage:'서로 존중하는 대화를 이어 가세요.'})});if(url.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"unlocks":[],"profiles":[]}'});return url.origin===origin && ['GET','HEAD'].includes(route.request().method())?route.continue():route.abort();});
 await context.addInitScript(()=>sessionStorage.setItem('privacyAgreed','true'));
 const page=await context.newPage();page.setDefaultTimeout(45000);page.on('dialog',d=>d.dismiss());
 await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#cdQuickServices a[href*="cdOneStepFreeSajuEntry"]').click();
 await page.locator('#nameInput').fill('회귀검증');await page.locator('#birthDate').fill('1990-05-15');await page.locator('#run-btn').click();
 const block=page.locator('#rpt-v2-section-relationshipBoundaryTestEntry');await block.waitFor();
 assert.equal(await page.locator('#relationshipTemptationCard').count(),0);
 assert.equal(await page.getByRole('heading',{name:'그 사람의 바람끼는?',exact:true}).count(),1);
 await block.locator('.rpt-v2-toggle-btn').click();
 const frame=page.frameLocator('[data-relationship-card-frame]');
 await frame.locator('#target-birth-date').waitFor({state:'visible'});
 await frame.getByRole('button',{name:'여성',exact:true}).click();
 await frame.locator('#target-birth-date').fill('19900515');
 await frame.getByLabel('출생 시각을 모릅니다').check();
 assert.equal(page.url(),origin+'/index.html');
 await block.scrollIntoViewIfNeeded();
 console.log('PASS one service, inline target input, no route navigation');
 const child=page.frames().find(f=>f.url().includes('/relationship-boundary-test/inline'));
 const resumed=await child.evaluate(()=>window.__cdCheckoutEntry.runPaidResume({kind:'relationship-boundary-test',action:'',args:{payload:JSON.stringify({idempotencyKey:'mock-reading',targetInfo:{gender:'female',birthDate:'1990-05-15',birthTimeUnknown:true,calendarType:'solar'}})}},null));
 assert.equal(resumed,true);
 await frame.locator('.rt-reading').waitFor({state:'visible'});
 for(const width of [360,390,430,1280]) {
  await page.setViewportSize({width,height:900});
  await page.waitForTimeout(500);
  const m=await frame.locator('.rt-reading').evaluate(el=>({length:el.textContent.length,overflow:el.scrollWidth>el.clientWidth+1,height:el.getBoundingClientRect().height}));
  assert.ok(m.length>=15000);assert.equal(m.overflow,false);
  const heights=await page.locator('[data-relationship-card-frame]').evaluate(el=>({frame:el.getBoundingClientRect().height,body:el.contentDocument.querySelector('.rt-page').getBoundingClientRect().height}));
  assert.ok(heights.frame>=heights.body-2);
  console.log('PASS inline 15000+ reading',width,m.length,heights);
 }
 await page.evaluate(()=>{window.unlockedFeatureMap.section_summary=true;});
 await page.locator('#summaryGate button[data-unlock-key]').click();
 await page.locator('#summaryArea .saju-reading-depth').first().scrollIntoViewIfNeeded();
 await page.waitForTimeout(1500);
 const styles=await page.locator('#summaryArea .saju-summary-chapter__body').first().evaluate(el=>({maxHeight:getComputedStyle(el).maxHeight,height:el.getBoundingClientRect().height,opacity:getComputedStyle(el).opacity}));
 assert.equal(styles.maxHeight,'none');assert.equal(styles.opacity,'1');
 assert.equal(await page.locator('#summaryArea .btn-sub').count(),0);
 console.log('PASS expanded summary without secondary More collapse',styles);
}finally{await browser.close();}
