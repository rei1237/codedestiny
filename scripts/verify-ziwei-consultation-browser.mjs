import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ZIWEI_DEEP_CHAPTERS } from '../worker/lib/ziwei-deep-report-prompt.mjs';

const base=process.argv[2] || 'http://127.0.0.1:59211';
assert.equal(new URL(base).hostname,'127.0.0.1','local mock only');
const output=path.resolve('docs/design/ziwei-counseling/implementation');
await mkdir(output,{recursive:true});
const chapters=ZIWEI_DEEP_CHAPTERS.map((chapter,index)=>({id:chapter.id,title:chapter.title,chars:2400,body:`이것은 저장본 재열람을 확인하는 상담 예시입니다.\n\n${'내가 맡을 일과 함께 나눌 일을 구분하면, 혼자 버텨야 한다는 부담이 줄어들 수 있습니다. '.repeat(index===0?130:24)}\n\n${index+1}장 마지막 문장도 빠짐없이 남습니다.`}));
const browser=await chromium.launch({headless:true});
const errors=[],metrics=[],requests=[],diagnostics=[];
let historyMode='empty'; let fontFailure=true;
const fontFixtures = new Map();
async function mockPublicFont(route) {
  const url = route.request().url();
  if (!fontFixtures.has(url)) fontFixtures.set(url, fetch(url).then(async response => {
    assert.equal(response.status, 200, 'existing public font fixture');
    return Buffer.from(await response.arrayBuffer());
  }));
  return route.fulfill({ status: 200, contentType: url.endsWith('.ttf') ? 'font/ttf' : 'font/woff2', headers: { 'access-control-allow-origin': '*' }, body: await fontFixtures.get(url) });
}
try {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['warning','error'].includes(message.type()))diagnostics.push(message.text().slice(0,260));});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared=data;}});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});});
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.pathname.startsWith('/api/')) {
      requests.push(u.pathname);
      if(u.pathname==='/api/ziwei-deep-report/result') {
        if(historyMode==='error')return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"reason":"SERVER_ERROR"}'});
        if(u.searchParams.has('id'))return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,chapters:u.searchParams.get('id')==='partial'?chapters.slice(0,9):chapters,reportMeta:{label:'다른 프로필의 저장 상담서',generatedAt:'2026-09-08T00:00:00Z'}})});
        return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,reports:historyMode==='empty'?[]:[{id:'full',name:'저장된이름',topic:'재물',status:'complete',createdAt:'2026-09-08'},{id:'partial',name:'부분상담',topic:'일',status:'partial',createdAt:'2026-09-08'}]})});
      }
      return route.fulfill({contentType:'application/json',body:'{"ok":true,"user":null,"reports":[],"data":null}'});
    }
    if(u.hostname==='assets.code-destiny.com' && /(?:Mulmaru|Paperlogy-5Medium)\.ttf$/.test(u.pathname)) {
      if(fontFailure)return route.fulfill({status:503,body:'mock font failure'});
      // 공개 글꼴 바이트를 fixture로 제공한다. 운영 CORS 설정은 그대로 둔다.
      return mockPublicFont(route);
    }
    if(u.hostname==='assets.code-destiny.com' && u.pathname.startsWith('/fonts/'))return mockPublicFont(route);
    if(u.hostname==='127.0.0.1')return route.continue();
    return route.abort();
  });
  await page.goto(base+'/ziwei/chart/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('input[name="ziwei-topic"]').first().waitFor();
  await page.getByRole('button',{name:'심화 자미두수 상담 열기',exact:true}).click();
  await page.getByRole('alert').first().waitFor();
  await page.getByLabel('이름',{exact:true}).fill('서윤');
  await page.getByLabel('출생 연도',{exact:true}).fill('1990');
  await page.getByLabel('출생 월',{exact:true}).fill('5');
  await page.getByLabel('출생 일',{exact:true}).fill('15');
  await page.getByLabel('출생 시',{exact:true}).fill('10');
  await page.screenshot({path:path.join(output,'input-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'심화 자미두수 상담 열기',exact:true}).click();
  await page.locator('#ziwei-result-answer').waitFor();
  await page.evaluate(() => document.fonts.ready);
  for(const width of [360,390,430,768,1440]) {
    await page.setViewportSize({width,height:width<768?844:1000});
    const metric=await page.locator('#ziwei-result-answer').evaluate(el=>{
      const root=el.closest('section.fixed');root.scrollTop=0;
      const actions=el.querySelector('a').getBoundingClientRect();
      return {width:innerWidth,overflow:root.scrollWidth-root.clientWidth,scrollHeight:root.scrollHeight,heroActionBottom:actions.bottom};
    });
    assert.equal(metric.overflow,0,'overflow '+width);
    if(width===390)assert.ok(metric.heroActionBottom<844,'first viewport contains action');
    metrics.push(metric);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,`result-${width}.png`)});
  }
  assert.equal(await page.locator('#ziwei-result-track > details[open]').count(),1);
  for(const id of ['career','wealth','love','relationships','family','health','timing','life']) {
    if(id!=='life'||!(await page.locator('#ziwei-question-life').getAttribute('open')!==null))await page.locator(`#ziwei-question-${id}>summary`).click();
    await page.locator(`#ziwei-question-${id}[open]`).waitFor();
    assert.ok((await page.locator('#ziwei-result-answer h2').innerText()).length>20);
  }
  await page.locator('#ziwei-question-life').evaluate(el=>el.closest('section.fixed').scrollTop=0);
  await page.getByRole('button',{name:'요약 공유',exact:true}).click();
  const preview=await page.locator('dialog pre').innerText();
  assert.ok(!preview.includes('서윤')&&!preview.includes('1990')&&!preview.includes('token'));
  await page.getByRole('button',{name:'기기로 공유',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__shared.text),preview);
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancel','AbortError')}}));
  await page.getByRole('button',{name:'기기로 공유',exact:true}).click();
  assert.equal(await page.locator('dialog [role=status]').innerText(),'');
  await page.getByRole('button',{name:'복사하기',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__copied),preview);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('mock failure')}}}));
  await page.getByRole('button',{name:'복사하기',exact:true}).click();
  assert.match(await page.locator('dialog [role=status]').innerText(),/복사하지 못/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  await page.locator('#ziwei-question-life>summary').click();
  await page.getByRole('link',{name:'내 질문의 답 읽기',exact:true}).click();
  await page.locator('#ziwei-question-life[open]').waitFor();
  await page.locator('#ziwei-question-wealth>summary').click();
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#ziwei-question-wealth[open]').waitFor();
  await page.locator('#ziwei-question-wealth details>summary').click();
  await page.locator('#ziwei-question-wealth details button').first().click();
  assert.notEqual(await page.locator('#ziwei-result-deep').getAttribute('open'),null);
  await page.setViewportSize({width:360,height:844});
  assert.equal(await page.locator('#ziwei-result-chart').evaluate(el=>el.scrollWidth-el.clientWidth),0);
  await page.screenshot({path:path.join(output,'chart-mobile.png')});
  // 저장본을 현재 프로필 이름으로 다시 포장하지 않는다. 생성·결제는 호출하지 않는다.
  await page.getByRole('button',{name:'지난 리포트 다시 보기',exact:true}).first().click();
  await page.getByText('아직 저장된 리포트가 없습니다.',{exact:true}).waitFor();
  historyMode='error';
  await page.getByRole('button',{name:'지난 리포트 다시 보기',exact:true}).first().click();
  await page.getByRole('alert').filter({hasText:/상담|오류|문제|다시/}).first().waitFor();
  historyMode='full';
  await page.getByRole('button',{name:'지난 리포트 다시 보기',exact:true}).first().click();
  await page.getByRole('button',{name:/부분상담/}).click();
  await page.locator('#ziwei-deep-pdf-report').waitFor();
  assert.equal(await page.locator('#ziwei-deep-pdf-report article').count(),9);
  await page.getByRole('button',{name:'다른 질문으로 다시 상담하기',exact:true}).click();
  await page.getByRole('button',{name:'지난 리포트 다시 보기',exact:true}).first().click();
  await page.getByRole('button',{name:/저장된이름/}).click();
  await page.locator('#ziwei-deep-pdf-report').waitFor();
  assert.equal(await page.locator('#ziwei-deep-pdf-report article').count(),15);
  assert.equal(await page.locator('#ziwei-deep-pdf-report details[open]').count(),1);
  assert.ok(!(await page.locator('#ziwei-deep-pdf-report > section').innerText()).includes('서윤'));
  await page.getByRole('button',{name:'PDF 저장하기',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'PDF를 저장하지 못'}).waitFor();
  fontFailure=false;
  const downloadPromise=page.waitForEvent('download',{timeout:60000});
  await page.getByRole('button',{name:'PDF 저장하기',exact:true}).click();
  const download=await downloadPromise.catch(async error=>{ console.log(JSON.stringify({diagnostics,alert:await page.getByRole('alert').allTextContents()}));throw error; });
  await download.saveAs(path.join(output,'ziwei-mock-report.pdf'));
  await page.screenshot({path:path.join(output,'report-mobile.png')});
  // 프로필 전환과 진행 중 전환. 이전 주제·결과·개인 질문이 남지 않아야 한다.
  const profile={id:'next-profile',name:'긴이름'.repeat(22),birthYear:1985,birthMonth:11,birthDay:3,birthHour:6,birthMinute:0,gender:'M'};
  await page.evaluate(profile=>document.dispatchEvent(new CustomEvent('destinyProfileChanged',{detail:{profile},bubbles:true})),profile);
  await page.locator('input[name="ziwei-topic"]').first().waitFor();
  assert.equal(await page.locator('#ziwei-result-answer').count(),0);
  await page.getByRole('button',{name:'심화 자미두수 상담 열기',exact:true}).click();
  await page.locator('#ziwei-result-answer').waitFor();
  assert.equal(await page.locator('#ziwei-result-answer').evaluate(el=>{const root=el.closest('section.fixed');return root.scrollWidth-root.clientWidth}),0);
  // 실제 document 프로필 이벤트와 계산 중 전환을 검증한다.
  const nextProfile={id:'last-profile',name:'마지막프로필',birthYear:1992,birthMonth:6,birthDay:10,birthHour:8,gender:'F'};
  await page.evaluate(profile=>document.dispatchEvent(new CustomEvent('destinyProfileChanged',{detail:{profile},bubbles:true})),{...profile,id:'compute-race',name:'계산중프로필'});
  await page.locator('input[name="ziwei-topic"]').first().waitFor();
  await page.getByRole('button',{name:'심화 자미두수 상담 열기',exact:true}).click();
  await page.getByRole('progressbar').waitFor();
  await page.screenshot({path:path.join(output,'loading-mobile.png')});
  await page.evaluate(profile=>document.dispatchEvent(new CustomEvent('destinyProfileChanged',{detail:{profile},bubbles:true})),nextProfile);
  await page.locator('input[name="ziwei-topic"]').first().waitFor();
  assert.equal(await page.getByLabel('이름',{exact:true}).inputValue(),'마지막프로필');
  await page.waitForTimeout(3600);
  assert.equal(await page.locator('#ziwei-result-answer').count(),0,'cancelled computation stays cancelled');
  await page.getByRole('checkbox').first().check();
  assert.equal(await page.getByLabel('출생 시',{exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'심화 자미두수 상담 열기',exact:true}).click();
  await page.locator('#ziwei-result-answer').waitFor();
  await page.evaluate(()=>location.hash='ziwei-result-chart');
  await page.locator('#ziwei-result-deep[open]').waitFor();
  await page.locator('#ziwei-result-answer').evaluate(el=>el.closest('section.fixed').scrollTop=0);
  await page.getByRole('button',{name:'요약 공유',exact:true}).click();
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__fallback=text;}}});});
  await page.getByRole('button',{name:'기기로 공유',exact:true}).click();
  assert.ok((await page.evaluate(()=>window.__fallback)).includes('https://code-destiny.com/ziwei/chart'));
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'요약 공유',exact:true}).focus();
  const focus=await page.getByRole('button',{name:'요약 공유',exact:true}).evaluate(el=>({outline:getComputedStyle(el).outlineStyle,height:el.getBoundingClientRect().height}));
  assert.equal(focus.outline,'solid'); assert.ok(focus.height>=44);
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert.ok(!requests.some(url=>/prepare|generate|payment|checkout/.test(url)),'no generation/payment requests');
  await writeFile(path.join(output,'browser-metrics.json'),JSON.stringify({metrics,errors,requests,checks:['input validation','5 widths','8 questions','chart links','share success/cancel/copy failure','refresh topic','legacy 15 chapters','collapsed export','font failure and retry','profile switch and in-flight cancellation','long name','unknown hour','real profile event','partial and failed history','keyboard focus','44px CTA','reduced motion','share unsupported fallback','legacy chart anchor']},null,2));
  console.log(JSON.stringify({pass:true,metrics,errors}));
} finally {await browser.close();}
