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
 // 임베드에서는 등급 히어로 1장만 나오고 챕터 장면은 렌더하지 않는다(부모가 iframe 높이를
 // 콘텐츠 전체 높이로 맞춰 lazy 로딩도 sticky 도 성립하지 않기 때문).
 await page.setViewportSize({width:390,height:844});
 assert.equal(await frame.locator('.rt-scene').count(),0);
 assert.equal(await frame.locator('.rt-hero-scene img').count(),1);
 const hero=await frame.locator('.rt-hero-scene img').evaluate(el=>({src:el.getAttribute('src'),natural:el.naturalWidth}));
 // 인덱스/등급 매핑이 어긋나면 여기서 잡힌다(목의 grade 는 'medium').
 assert.ok(hero.src.includes('/images/relationship-boundary-test/medium.webp'),'hero must follow the grade: '+hero.src);
 assert.ok(hero.natural>0,'hero image must actually load');
 // aspect-ratio 로 높이를 미리 잡아 두었는지 — 이미지가 늦게 와도 높이가 흔들리면 안 된다.
 const before=await frame.locator('.rt-page').evaluate(el=>el.getBoundingClientRect().height);
 await page.waitForTimeout(800);
 const after=await frame.locator('.rt-page').evaluate(el=>el.getBoundingClientRect().height);
 assert.ok(Math.abs(after-before)<=2,'embedded height drifted after image load: '+before+' -> '+after);
 console.log('PASS embedded hero only, grade-mapped, no height drift',hero.src);

 // 독립 라우트: 챕터 장면 5장 + sticky 연출 + 결과 화면에서는 기존 표지를 쓰지 않는다.
 const solo=await context.newPage();solo.setDefaultTimeout(45000);
 await solo.goto(origin+'/relationship-boundary-test/',{waitUntil:'domcontentloaded'});
 await solo.locator('#target-birth-date').waitFor({state:'visible'});
 await solo.waitForFunction(()=>Boolean(window.__cdCheckoutEntry?.runPaidResume));
 const soloResumed=await solo.evaluate(()=>window.__cdCheckoutEntry.runPaidResume({kind:'relationship-boundary-test',action:'',args:{payload:JSON.stringify({idempotencyKey:'mock-reading',targetInfo:{gender:'female',birthDate:'1990-05-15',birthTimeUnknown:true,calendarType:'solar'}})}},null));
 assert.equal(soloResumed,true);
 await solo.locator('.rt-reading').waitFor({state:'visible'});
 assert.equal(await solo.locator('.rt-scene img').count(),5);
 assert.equal(await solo.locator('.rt-hero-scene img').count(),1);
 assert.equal(await solo.locator('.rt-visual').count(),0);
 // 🔴 .rt-shell 이 overflow:hidden 이면 스크롤 컨테이너가 되어 내부 sticky 가 영영 안 걸린다.
 assert.notEqual(await solo.locator('.rt-shell').evaluate(el=>getComputedStyle(el).overflowY),'hidden');
 assert.equal(await solo.locator('.rt-scene').first().evaluate(el=>getComputedStyle(el).position),'sticky');
 assert.equal(await solo.locator('.rt-reading').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
 console.log('PASS standalone storytelling scenes, sticky, no legacy cover');
 await solo.close();

 await page.evaluate(()=>{window.unlockedFeatureMap.section_summary=true;});
 await page.locator('#summaryGate button[data-unlock-key]').click();
 await page.locator('#summaryArea .saju-reading-depth').first().scrollIntoViewIfNeeded();
 await page.waitForTimeout(1500);
 const styles=await page.locator('#summaryArea .saju-summary-chapter__body').first().evaluate(el=>({maxHeight:getComputedStyle(el).maxHeight,height:el.getBoundingClientRect().height,opacity:getComputedStyle(el).opacity}));
 assert.equal(styles.maxHeight,'none');assert.equal(styles.opacity,'1');
 assert.equal(await page.locator('#summaryArea .btn-sub').count(),0);
 console.log('PASS expanded summary without secondary More collapse',styles);
}finally{await browser.close();}
