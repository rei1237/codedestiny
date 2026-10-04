// Non-identifying browser fixtures. Never contact a database or provider.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { RECORD_SERVICES, savedRecordPath } from '../../lib/records/service-registry.js';
import { getMasterLoveCodexPlan } from '../../worker/lib/master-love-codex-prompt.mjs';
const origin = process.env.RECORDS_TEST_ORIGIN || 'http://127.0.0.1:3194';
const detailOnly = process.env.RECORDS_TEST_DETAIL_ONLY;
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const out = path.resolve('build-cache/records-hub'); fs.mkdirSync(out,{recursive:true});
const user = {id:'64b7f2a1c3d4e5f601234567',_id:'64b7f2a1c3d4e5f601234567',name:'화면 검증',email:'fixture@example.invalid',hasLocalAuth:true};
const record = (source,id='fixture',extra={}) => {
  const service=RECORD_SERVICES.find(row=>row.id===source);
  return {id,source,key:source+':'+id,serviceId:service.featureKey,serviceName:service.name,title:'[화면 검증] '+service.name,question:'저장된 질문으로 앞으로의 선택을 정리하고 싶어요.',createdAt:'2026-10-01T01:00:00Z',status:'completed',character:service.character||'',group:service.group,href:savedRecordPath(source,id),startHref:service.href,nativeHref:'',...extra};
};
const items=Array.from({length:24},(_,index)=>record(['neo','fusion','codex','chat'][index%4],String(index),{group:index%4===3?'chat':'report',title:`[화면 검증 ${index+1}] 긴 제목과 저장된 질문을 여러 줄에 걸쳐 읽는 비식별 상담 기록`,question:'계획 '+index+' · 실제 사용자의 정보가 없는 화면 검증 질문입니다.'}));
const text='[화면 검증] 저장된 내용만 표시하는 비식별 예시입니다. 실제 상담 결과가 아닙니다.';
const fusion={title:'초융합 저장 결과',openingMessage:text,executiveSummary:text,closingMessage:text,timingAndAction:{title:'다음 행동',content:text,luckyActions:['계획 정리'],cautionPatterns:['속도 조절']}};
for(const key of ['sajuSection','ziweiSection','vedicSection','sukuyoSection','astrologySection','tarotSection','integratedReading'])fusion[key]={title:key+' 저장 섹션',content:text,keyPoints:[text]};
const codex=getMasterLoveCodexPlan().chapters.map((chapter,index)=>({...chapter,order:index+1,body:text,ok:true}));
const tea={resultId:'tea-fixture',sessionTitle:'[화면 검증] 연이의 상담 기록',questionSummary:text,consultationMode:'tarot',teaCup:{id:'lotus-moon',name:'연꽃',topic:'선택',reading:text},saju:{available:false,title:'사주',summary:'',keyPoints:[]},tarot:{cardId:'major-0',number:0,nameKo:'바보',nameEn:'The Fool',orientation:'upright',keywords:['시작'],meaning:text,reading:text},emotionAnalysis:[],yeoniReading:{intro:text,main:text,advice:text,caution:text},synthesis:{title:'종합',summary:text,sajuTarotBridge:''},choiceSimulation:[],actionPrescription:text,luckyKeywords:['정리'],closingLine:text,honeyLetterPending:true};
const details={
  neo:{record:record('neo'),content:{id:'fixture',status:'completed',selectedMethod:'saju',question:text,initialBriefing:{operationTitle:'저장된 작전',frontlineSummary:text,bluntTruth:text,actionOrders:['기록 확인'],tsundereClosing:text},refinedOrder:{operationTitle:'최종 작전',verdict:{statement:text},thirtyDayStrategy:['계획 정리'],tsundereClosing:text}}},
  fusion:{record:record('fusion'),content:{result:fusion}},
  codex:{record:record('codex'),content:{id:'fixture',status:'completed',chapters:codex,totalCharCount:codex.reduce((n,row)=>n+row.body.length,0)}},
  chat:{record:record('chat','fixture',{status:'conversation'}),content:{characterId:'yeoni',messages:[{speaker:'user',text:'저장된 질문'},{speaker:'assistant',text:'저장된 답변',detail:'대화의 전체 상세 내용'}]}},
  'chat-consultation':{record:record('chat-consultation'),content:{id:'fixture',persona:'neo',state:'COMPLETED',paid:true,locale:'ko',manifest:[{id:'one',title:'저장된 첫 상담',theme:'flow'},{id:'two',title:'저장된 마지막 상담',theme:'action'}],consultation:{question:text},product:{systems:['saju']},chapters:[{summary:'첫 상담 전체 요약',analysis:[text],advice:[text],persona:text},{summary:'마지막 상담 전체 요약',analysis:['마지막 상담 전체 본문'],advice:[text],persona:text}]}},
  tea:{record:record('tea','tea-fixture',{nativeHref:'/fortune-tea-house/?resultId=tea-fixture'}),content:tea},
  legacy:{record:record('astrology'),content:{id:'',chapters:[{title:'첫 장',body:'첫 장 전체 내용'},{title:'마지막 장',body:'마지막 장 전체 내용'}],chart:{planets:[{name:'Sun',degree:12}]},html:'<table><tr><td>저장된 표</td></tr></table><script>window.fixtureXss=true</script>'}},
  partial:{record:record('fusion','partial',{status:'partial'}),content:{chapters:[{title:'첫 장',body:'부분 저장 내용'}]}},
};
// Compile the small set of routes before exercising browser history. A cold
// development compiler can invalidate its own manifest during a redirect.
for(const pathname of ['/consultations/','/records/','/records/view/','/fortune-tea-house/']) {
  let response;
  for(let attempt=0;attempt<3;attempt++) {
    response=await fetch(origin+pathname);
    await response.text();
    if(response.ok)break;
  }
  assert.ok(response?.ok,`local fixture route failed to warm: ${pathname}`);
}
const browser=await chromium.launch({headless:true}); const evidence=[];
let debugState;
async function contextFor(width,scenario='normal') {
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',serviceWorkers:'block',isMobile:width<500,hasTouch:width<500});
  await context.addInitScript(({user,guest})=>{localStorage.setItem('fortuneThemeModeStateV1','pig');if(!guest){localStorage.setItem('fortune_auth_user',JSON.stringify(user));localStorage.setItem('fortune_auth_token','mock-token');}}, {user,guest:scenario==='guest'});
  const seen=[],forbidden=[],errors=[];
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    // Local, non-identifying portrait fixture for the same Codex character.
    // Production R2 asset availability is not tested by this offline run.
    if(url.origin!==origin) {
      if(decodeURIComponent(url.pathname).includes('CodeDestinyNovel/'))return route.fulfill({contentType:'image/webp',body:fs.readFileSync('public/fuctionassets/러브 코드/여_박지은.webp')});
      return route.abort();
    }
    if(!url.pathname.startsWith('/api/'))return route.continue();
    seen.push({method:request.method(),path:url.pathname});
    if(request.method()!=='GET'||/(generate|activate|ensure-access|consume|checkout|payments|honey-letter)/.test(url.pathname))forbidden.push({method:request.method(),path:url.pathname});
    let data={ok:true,mock:true};let status=200;
    if(url.pathname==='/api/auth/me')data=scenario==='guest'?{ok:true,authenticated:false}:{ok:true,authenticated:true,user};
    else if(url.pathname==='/api/records') {
      if(scenario==='error'){status=503;data={ok:false,failures:[{source:'neo',name:'네오'}]};}
      else {
        let selected=scenario==='empty'?[]:items;
        if(url.searchParams.get('q'))selected=selected.filter(row=>(row.title+row.question).includes(url.searchParams.get('q')));
        if(url.searchParams.get('group')&&url.searchParams.get('group')!=='all')selected=selected.filter(row=>row.group===url.searchParams.get('group'));
        const offset=Number(url.searchParams.get('cursor')||0);
        data={ok:true,items:selected.slice(offset,offset+10),failures:scenario==='partial-error'?[{source:'fusion',name:'초융합 운세'}]:[],nextCursor:offset+10<selected.length?String(offset+10):scenario==='partial-error'?'24':null};
      }
    } else if(url.pathname==='/api/records/detail')data={ok:true,...details[url.searchParams.get('id')==='partial'?'partial':url.searchParams.get('source')==='astrology'?'legacy':url.searchParams.get('source')]};
    else if(url.pathname.startsWith('/api/fortune-tea-house/results/'))data={ok:true,result:tea};
    else if(url.pathname.startsWith('/api/profile'))data={ok:true,profiles:[],currentId:''};
    else if(/subscription|access-state|pass/.test(url.pathname))data={ok:true,user,subscription:{tier:'none',isActive:false},access:{unlocked:[],features:{}},entitlements:[]};
    return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const page=await context.newPage();page.setDefaultNavigationTimeout(120000);page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
  if(detailOnly)page.on('response',response=>{if(response.url().includes('/api/records/detail'))void response.json().then(data=>console.log('Fixture detail',response.status(),data.record?.status,Object.keys(data.content||{})));});
  debugState={context,page,seen,forbidden,errors};return debugState;
}
async function bounds(page,width) {
  await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom)>=110);
  const box=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,bottom:parseFloat(getComputedStyle(document.querySelector('main')).paddingBottom)}));
  assert.ok(box.scroll<=width+1,`overflow ${box.scroll} > ${width}`);assert.ok(box.bottom>=110,'navigation safe spacing');return box;
}
try {
  for(const width of detailOnly?[]:[360,390,430,1280].filter(width=>!process.env.RECORDS_TEST_WIDTH||width===Number(process.env.RECORDS_TEST_WIDTH))) {
    const state=await contextFor(width);const {page,context}=state;
    await page.goto(origin+'/consultations/',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'지금, 어떤 답이 필요한가요?'}).waitFor();
    for(const source of RECORD_SERVICES.filter(row=>row.featured))assert.equal(await page.locator(`main a[href="${source.href}"]`).count(),1);
    assert.ok((await page.locator('main').innerText()).indexOf('연이의 운명 찻집')<(await page.locator('main').innerText()).indexOf('캐릭터와 대화하기'));
    await page.locator('nav.cd-mnav a[data-nav-key="consult"][aria-current="page"]').waitFor();
    const hubBounds=await bounds(page,width);await page.screenshot({path:path.join(out,`hub-${width}.png`),fullPage:true});
    await page.goto(origin+'/records/',{waitUntil:'domcontentloaded'});await page.locator('main article').first().waitFor();assert.equal(await page.locator('main article').count(),10);
    const archiveBounds=await bounds(page,width);await page.screenshot({path:path.join(out,`archive-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'기록 더 보기'}).click();await page.waitForFunction(()=>document.querySelectorAll('main article').length===20);
    const hrefs=await page.locator('main article a').evaluateAll(nodes=>nodes.map(node=>node.href));assert.equal(new Set(hrefs).size,20);
    await page.getByRole('searchbox').fill('계획');await page.waitForTimeout(500);await page.locator('main article').first().waitFor();
    await page.locator('main article a').nth(4).scrollIntoViewIfNeeded();await page.waitForTimeout(100);const readingTop=await page.evaluate(()=>scrollY);
    await page.locator('main article a').nth(4).click();await page.waitForFunction(()=>document.querySelector('main h1')?.textContent.includes('[화면 검증]'));
    await page.goBack({waitUntil:'domcontentloaded'});try{await page.locator('main article').first().waitFor();}catch(error){console.log('Back restoration failure',width,page.url(),await page.locator('main').innerText(),state.errors,state.seen);throw error;}assert.equal(await page.getByRole('searchbox').inputValue(),'계획');await page.waitForTimeout(300);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-readingTop)<60,`archive scroll restored ${readingTop}`);
    await page.getByRole('button',{name:'대화 상담',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('main article').length===6);
    assert.equal(await page.locator('main article a[href*="source=chat"] ').count(),6);
    await page.locator('main article a').first().click();await page.getByText('대화의 전체 상세 내용',{exact:true}).waitFor();await page.goBack({waitUntil:'domcontentloaded'});await page.locator('main article').first().waitFor();assert.equal(await page.getByRole('button',{name:'대화 상담',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('searchbox').focus();assert.notEqual(await page.locator('main label').first().evaluate(node=>getComputedStyle(node).outlineStyle),'none');
    assert.equal(state.errors.length,0,JSON.stringify(state.errors));assert.equal(state.forbidden.length,0,JSON.stringify(state.forbidden));
    evidence.push({scenario:'layout-navigation-restore',width,hubBounds,archiveBounds,api:state.seen,passed:true});await context.close();
  }
  for(const scenario of detailOnly?[]:['guest','empty','error','partial-error']) {
    const state=await contextFor(390,scenario);await state.page.goto(origin+'/records/',{waitUntil:'domcontentloaded'});
    const expected={guest:'내 기록을 보려면 로그인해 주세요',empty:'아직 보관된 기록이 없어요',error:'기록을 불러오지 못했어요','partial-error':'일부 기록을 확인하지 못했어요'}[scenario];await state.page.getByText(expected,{exact:true}).waitFor();
    if(scenario==='partial-error')assert.equal(await state.page.locator('main article').count(),10);
    if(scenario==='error')assert.equal(await state.page.getByText('아직 보관된 기록이 없어요',{exact:true}).count(),0);
    await state.page.screenshot({path:path.join(out,`archive-${scenario}.png`),fullPage:true});evidence.push({scenario,passed:true,api:state.seen});await state.context.close();
  }
  for(const source of ['neo','fusion','codex','chat','chat-consultation','tea','astrology','partial'].filter(source=>!detailOnly||source===detailOnly)) {
    const state=await contextFor(390);const actual=source==='partial'?'fusion':source;
    await state.page.goto(origin+savedRecordPath(actual,source==='tea'?'tea-fixture':source==='partial'?'partial':'fixture'),{waitUntil:'domcontentloaded'});
    if(source==='tea')await state.page.getByText('[화면 검증] 연이의 상담 기록',{exact:true}).waitFor();
    else if(source==='codex')await state.page.waitForSelector('#master-love-codex-document');
    else if(source==='neo')await state.page.getByText('저장된 작전',{exact:true}).first().waitFor();
    else if(source==='fusion')await state.page.getByText('sajuSection 저장 섹션',{exact:true}).waitFor();
    else if(source==='chat')await state.page.getByText('대화의 전체 상세 내용',{exact:true}).waitFor();
    else if(source==='chat-consultation')await state.page.getByText('마지막 상담 전체 본문',{exact:true}).waitFor();
    else if(source==='partial'){try{await state.page.getByText('부분 저장 내용',{exact:true}).waitFor();}catch(error){console.log('Partial fixture failure',await state.page.locator('main').innerText(),state.errors,state.seen);throw error;}}
    else {await state.page.getByText('마지막 장 전체 내용',{exact:true}).waitFor();assert.equal(await state.page.locator('td').filter({hasText:'저장된 표'}).count(),1);assert.equal(await state.page.evaluate(()=>window.fixtureXss),undefined);}
    await state.page.reload({waitUntil:'domcontentloaded'});
    await state.page.waitForTimeout(2000);assert.equal(state.errors.length,0,JSON.stringify(state.errors));assert.equal(state.forbidden.length,0,JSON.stringify(state.forbidden));
    if(source==='neo')assert.equal(await state.page.getByText('selected Method',{exact:true}).count(),0);
    if(source==='codex')await state.page.waitForFunction(()=>Array.from(document.images).filter(img=>img.src.includes('CodeDestinyNovel')).every(img=>img.complete&&img.naturalWidth>0));
    await bounds(state.page,390);await state.page.screenshot({path:path.join(out,`reading-${source}.png`),fullPage:true});evidence.push({scenario:'direct-refresh-'+source,passed:true,...(source==='codex'?{portrait:'offline local character fixture; production R2 unverified'}:{}),api:state.seen});await state.context.close();
  }
} catch(error){console.log('Fixture browser failure',debugState?.page.url(),debugState?.errors,debugState?.seen,await debugState?.page.locator('body').innerText());throw error;}
finally {fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(evidence,null,2));await browser.close();}
console.log(`PASS ${evidence.length} browser scenarios — fixtures only; provider/payment/write requests zero.`);
