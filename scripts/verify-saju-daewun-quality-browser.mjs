import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

// Real local calculation + mock access only. No provider, payment or remote application request is allowed.
const root=process.cwd();
const directory=resolve(tmpdir(), 'cd-saju-daewun-quality-'+process.pid);
await mkdir(directory,{recursive:true});
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/api/auth/me'){
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({ok:true,authenticated:true,user:{id:'daeun-quality-fixture',name:'대운검증'}}));return;
  }
  if(pathname.startsWith('/api/')){
    res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true,"unlocks":[],"profiles":[]}');return;
  }
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{
    const data=await readFile(file).catch(()=>readFile(resolve(root,'public','.'+pathname)));
    res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.wasm':'application/wasm','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');
    res.end(data);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const results=[];
let activePage;
try{
  for(const width of [375,1280]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[],externalRequests=[],paidRequests=[];
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==origin){externalRequests.push(url.origin);return route.abort();}
      if(request.method()!=='GET'&&/\/api\/(?:billing|payments|.*generate|.*ai)(?:\/|$)/.test(url.pathname))paidRequests.push(url.pathname);
      return route.continue();
    });
    // .card·.rpt-v2-block 은 content-visibility:auto 라 뷰포트 밖이면 하위를 건너뛴다 — innerText 는 비고 max-height 전환·높이 측정은 멈춘다.
    // 읽거나 높이를 기다리는 요소는 대기 조건 안에서 뷰포트로 옮기고(true 일 때만 통과) 같은 평가에서 값을 돌려준다.
    await context.addInitScript(()=>{
      sessionStorage.setItem('privacyAgreed','true');
      window.__cdVerifyInView=el=>{const top=el.getBoundingClientRect().top;if(top<-2||top>=innerHeight/2){el.scrollIntoView({block:'start',behavior:'instant'});return false;}return true;};
    });
    const page=await context.newPage();activePage=page;
    page.on('dialog',dialog=>dialog.dismiss());
    page.on('pageerror',error=>{if(!/^(?:Error:\s*)?google_translate_script_failed$/.test(error.message))errors.push(error.message);});
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    // 무료 사주 카드(퀵 서비스)는 연이의 정원 안이다 — 사용자처럼 정원을 먼저 연다.
    if (await page.locator('#cdhMore:not([open]) > summary').count()) await page.locator('#cdhMore > summary').click();
    await page.locator('#cdQuickServices a[data-action="cdOneStepFreeSajuEntry"]').click();
    await page.locator('#nameInput').fill('대운검증');
    await page.locator('#birthDate').fill('1990-05-15');
    await page.locator('#birthTimeText').fill('08:35');
    await page.locator('#birthTimeText').press('Tab');
    await page.locator('#run-btn').click();
    await page.waitForFunction(()=>window.G_PILLARS&&window.G_NATAL&&window.__cdLastDaewunBazi&&window.SajuReadingPresentation,undefined,{timeout:30000});
    assert.equal(await page.evaluate(()=>window.__cdSajuTimeUnknown),false,'known time remains known');
    assert.equal(await page.locator('#dwGrid .dw-item').count(),0,'paid cycle rows remain absent before mock unlock');
    const prices=await page.locator('[data-saju-price-key="section_daewun"]').allTextContents();
    assert.ok(prices.length>=2);assert.ok(prices.every(price=>price==='5,000원'),JSON.stringify(prices));
    await page.evaluate(()=>{
      window.unlockedFeatureMap.section_daewun=true;
      window.dispatchEvent(new CustomEvent('cd:unlocks-changed',{detail:{source:'daeun-quality-local-fixture',unlockedFeatureMap:window.unlockedFeatureMap}}));
      renderDaewun(window.__cdLastDaewunBazi);
      const rows=window.G_DAEWUN;
      const selected=rows.find(row=>_getDwHapResults(row.g,row.j).some(relation=>!relation.isChung))||rows[0];
      const ev=evalDaewun(selected.g,selected.j);
      showDwDetail(selected.age,selected.g,selected.j,ev.label,ev.score);
    });
    await page.locator('#dwDetail .saju-cycle-guide').waitFor({state:'visible'});
    const guide=page.locator('#dwDetail .saju-cycle-guide');
    const content=await (await page.waitForFunction(()=>{const el=document.querySelector('.saju-cycle-guide');return !!el&&window.__cdVerifyInView(el)&&el.innerText.length>500&&el.innerText;})).jsonValue();
    assert.equal(await guide.locator('dt').count(),9);
    assert.equal(await page.locator('#yearList .year-row').count(),10);
    assert.match(content,/이번 지지에서 제공된 장간은/);
    assert.match(content,/통근/);
    assert.match(content,/합화 후보|합화 조건이 함께 확인/);
    assert.doesNotMatch(await page.locator('#daewunCard').innerText(),/제련\s*발복|보석\s*용해|치명적 흉운|나대지/);
    const annual=await page.locator('#yearList .yr-content').allTextContents();
    assert.equal(annual.filter(text=>/대운 속 .* 세운입니다/.test(text)).length,10);
    const quantum=await page.evaluate(()=>{
      const calls=[],original=window._getDwHapResults;
      window._getDwHapResults=function(g,j,reference){const rows=original(g,j,reference);calls.push({g,j,rows});return rows;};
      try{renderQuantumStrategy(G_PILLARS,G_NATAL,window.__cdLastDaewunBazi);}finally{window._getDwHapResults=original;}
      const current=window.G_DAEWUN.find(row=>CURRENT_AGE>=row.age&&CURRENT_AGE<=row.age+9);
      const currentCall=current?calls.find(call=>call.g===current.g&&call.j===current.j):null;
      return {current,expected:current?original(current.g,current.j):[],actual:currentCall?currentCall.rows:[],calls:calls.map(call=>({g:call.g,j:call.j,count:call.rows.length})),text:document.getElementById('quantumSection').textContent,events:Array.from(document.querySelectorAll('#quantumSection .qm-section')).find(section=>section.querySelector('.qm-sec-title')?.textContent.startsWith('운의 관계'))?.querySelectorAll('.qm-hap-card').length||0};
    });
    assert.ok(quantum.current,'a current cycle was calculated');
    assert.deepEqual(quantum.actual,quantum.expected,'quantum consumes the same evaluated relationship rows');
    assert.ok(quantum.calls.length>=2,'quantum reads both major and annual luck from the shared collector');
    assert.equal(quantum.events,quantum.calls.slice(0,2).reduce((sum,call)=>sum+call.count,0));
    assert.match(quantum.text,/합·합화·충/);
    assert.doesNotMatch(quantum.text,/제련\s*발복|보석\s*용해|치명적 흉운|나대지/);
    await guide.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await page.waitForFunction(()=>document.querySelector('.saju-cycle-guide')?.getBoundingClientRect().height>0);
    const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+2,guide:document.querySelector('.saju-cycle-guide').scrollWidth>document.querySelector('.saju-cycle-guide').clientWidth+2}));
    assert.deepEqual(overflow,{page:false,guide:false});
    await page.screenshot({path:resolve(directory,'daeun-'+width+'.png')});
    await page.locator('#yearList .year-row').first().evaluate(el=>{toggleYear(el);el.scrollIntoView({block:'start',behavior:'instant'});});
    await page.waitForFunction(()=>document.querySelector('#yearList .year-sub')?.getBoundingClientRect().height>200);
    await page.screenshot({path:resolve(directory,'annual-'+width+'.png')});
    // Open the existing dashboard control too; rendered HTML inside its closed detail is not visual proof.
    await page.locator('#rpt-v2-section-quantumCard').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await page.waitForFunction(()=>document.getElementById('rpt-v2-section-quantumCard')?.innerText.length>30);
    await page.evaluate(()=>{
      window.unlockedFeatureMap.rpt_quantumCard=true;
      const block=document.getElementById('rpt-v2-section-quantumCard');
      if(!block.classList.contains('open'))toggleReportFeatureCard(block.querySelector('.rpt-v2-toggle-btn'));
    });
    // 펼치면 위쪽 블록 높이가 바뀌어 블록이 화면 밖으로 밀릴 수 있으므로 열린 뒤에도 뷰포트 안에서 높이를 기다린다.
    await page.waitForFunction(()=>{
      const block=document.getElementById('rpt-v2-section-quantumCard');
      return window.__cdVerifyInView(block)&&block.querySelector('.rpt-v2-detail').getBoundingClientRect().height>400;
    });
    const quantumRelationships=page.locator('#quantumSection .qm-section').filter({has:page.locator('.qm-sec-title',{hasText:'운의 관계 — 합·합화·충(沖) 조건'})});
    await quantumRelationships.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await page.waitForFunction(()=>{
      const section=Array.from(document.querySelectorAll('#quantumSection .qm-section')).find(item=>item.querySelector('.qm-sec-title')?.textContent.startsWith('운의 관계'));
      if(!section)return false;
      return window.__cdVerifyInView(section)&&section.getBoundingClientRect().height>100&&section.checkVisibility({checkVisibilityCSS:true});
    });
    await page.screenshot({path:resolve(directory,'quantum-'+width+'.png')});
    // Real recalculation through the same input form, using its unknown-time control.
    await page.evaluate(()=>{document.getElementById('birthTimeTip').click();});
    // calculate() 는 결과 대시보드를 다시 그리며 iframe 을 교체한다. 그 사이 열려 있는 evaluate 가 컨텍스트 소멸로 끊기므로 완료 신호만 기다린다.
    await page.evaluate(()=>{window.__cdVerifyCalcDone=false;calculate().finally(()=>{window.__cdVerifyCalcDone=true;});});
    await page.waitForFunction(()=>window.__cdVerifyCalcDone===true&&window.__cdSajuTimeUnknown===true);
    await page.evaluate(()=>{window.unlockedFeatureMap.section_daewun=true;renderDaewun(window.__cdLastDaewunBazi);renderQuantumStrategy(G_PILLARS,G_NATAL,window.__cdLastDaewunBazi);});
    const unknown=await page.evaluate(()=>({rows:window.G_DAEWUN,text:document.getElementById('dwGrid').textContent,quantum:document.getElementById('quantumSection').textContent}));
    assert.deepEqual(unknown.rows,[],'unknown hour does not fabricate a start age');
    assert.match(unknown.text,/출생 시간을 알 수 없어/);
    assert.match(unknown.quantum,/대운의 정확한 시작 시점과 현재 구간은 확정하지 않습니다/);
    assert.deepEqual(errors,[],'no unexpected runtime exceptions');
    assert.deepEqual(paidRequests,[],'no paid generation or payment request was triggered');
    results.push({width,chapters:9,annualRows:10,prices,relationCounts:quantum.calls,overflow,unknownHourRows:unknown.rows.length,unexpectedErrors:errors,paidRequests,blockedExternalOrigins:[...new Set(externalRequests)]});
    await context.close();
  }
  await writeFile(resolve(directory,'metrics.json'),JSON.stringify({evidence:'local browser; actual calculation; mock access; physicalDevice:false',results},null,2));
  console.log(JSON.stringify({directory,results},null,2));
}catch(error){
  if(activePage&&!activePage.isClosed())await activePage.screenshot({path:resolve(directory,'failure.png')}).catch(()=>{});
  if(activePage&&!activePage.isClosed())console.error(JSON.stringify(await activePage.evaluate(()=>['rpt-v2-section-quantumCard','quantumCard','quantumSection'].map(id=>{const el=document.getElementById(id);return {id,rect:el?.getBoundingClientRect().toJSON(),ancestors:el?Array.from((function*(node){while(node){yield node;node=node.parentElement;}})(el)).map(node=>({id:node.id,cls:node.className,display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility,height:node.getBoundingClientRect().height})):[]};}))));
  console.error('DAEUN QUALITY ARTIFACTS: '+directory);throw error;
}finally{await browser.close();await new Promise(done=>server.close(done));}
