import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';

const origin=process.env.YN_UI_ORIGIN||'http://127.0.0.1:3108';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('Only a loopback mock frontend is allowed.');
const output='build-cache/yeongnyangi-free-ui';mkdirSync(output,{recursive:true});
const result={category:'basic',day:'2026-09-16',title:'오늘의 운세',kind:'calculated',summary:'오늘은 네 기준을 차분히 세워보는 날이야.',paragraphs:['시작하고 뻗어나가려는 힘이 살아 있어.','다만 여러 일을 한꺼번에 벌이기보다 하나를 끝까지 정리해봐.','관계에서는 상대의 속도를 확인할 여지를 남겨두는 편이 좋아.','오늘 할 일 하나를 정하고, 끝낸 뒤 다음 선택으로 넘어가.'],basis:[{label:'나의 일간',value:'甲'},{label:'오늘의 일주',value:'丙午'}],limitations:['오늘의 사건을 확정하는 해석은 아닙니다.'],charts:[],prompt:'너는 영냥이, 도도하지만 다정한 달빛 점술방의 상담가다.',version:'anchovy-free-v2'};
const browser=await chromium.launch({headless:true}),failures=[];
const idleDialogue='……멸치 한 마리? 작네. 그래도 이야기는 제대로 봐줄게.';
const handoverDialogue='……이 작은 걸 나한테? 흠, 일단 받을게.';
async function fixture(viewport,options={}){
  const page=await browser.newPage({viewport,reducedMotion:options.reduced?'reduce':'no-preference'});
  let state={day:new Date(Date.now()+9*3600000).toISOString().slice(0,10),balance:options.balance??0,attended:false,unlocked:false};
  const calls={attendance:0,unlock:0,reading:0};
  page.on('pageerror',error=>failures.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('fortune_auth_user',JSON.stringify({id:'qa-owner',name:'달빛 손님'})));
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(url.origin!==origin)return route.abort('blockedbyclient');
    const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/auth/me')return options.guest?send({authenticated:false},401):send({authenticated:true,user:{id:'qa-owner',name:'달빛 손님'}});
    if(path==='/api/auth/refresh')return send({authenticated:false},401);
    if(path==='/api/profile'||path==='/api/yeongnyangi/profiles')return send({ok:true,profiles:[{id:'qa-profile',profileId:'qa-profile',name:'달빛 손님',birthDate:'1992-05-18'}],currentId:'qa-profile'});
    if(path==='/api/yeongnyangi/attendance'){
      if(request.method()==='GET')return send({ok:true,...state});
      calls.attendance++;
      if(options.fail)return send({message:'출석 연결을 마치지 못했어요. 다시 시도해 주세요.'},500);
      state={...state,attended:true,balance:state.balance+(options.duplicate?0:1)};
      return send({ok:true,...state,awarded:!options.duplicate});
    }
    if(path==='/api/yeongnyangi/free/unlock'){
      calls.unlock++;
      if(options.fail)return send({message:'이야기를 열지 못했어요. 다시 시도해 주세요.'},500);
      state={...state,unlocked:true,balance:state.balance-(options.duplicate?0:1)};
      return send({ok:true,...state,newlyUnlocked:!options.duplicate});
    }
    if(path==='/api/yeongnyangi/free/reading'){
      if(request.method()==='POST')calls.reading++;
      return send({ok:true,result:request.method()==='POST'?{...result,day:state.day}:null});
    }
    if(path.startsWith('/api/'))return send({ok:false},404);
    return route.continue();
  });
  return {page,calls};
}
async function catVisible(page){
  const cat=page.locator('.anchovy-cat > img:first-child');
  await expect(cat).toHaveAttribute('src','/assets/yeongnyangi/fish/reaction-anchovy.webp');
  assert.ok(await cat.evaluate(img=>img.complete&&img.naturalWidth>0),'reaction image missing');
}
try{
  for(const viewport of process.argv.includes('--scenarios-only')?[]:[{name:'mobile-360',width:360,height:800},{name:'mobile-390',width:390,height:844},{name:'mobile-430',width:430,height:932},{name:'tablet-768',width:768,height:1024},{name:'desktop-1280',width:1280,height:900}]){
    const {page,calls}=await fixture(viewport);
    await page.goto(`${origin}/yeongnyangi/`,{waitUntil:'networkidle'});
    await expect(page.locator('.header .session-controls')).toHaveAttribute('data-session-status','200');
    const account=page.locator('.header').getByRole('button',{name:'달빛 손님님 · 로그인됨'});
    await account.click();await expect(page.getByRole('navigation',{name:'내 계정'})).toBeVisible();await account.click();
    const nav=page.getByRole('navigation',{name:'주 메뉴'});
    await expect(nav).toBeVisible();
    assert.deepEqual(await nav.locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),['#readings','/yeongnyangi/room/','#recommendations']);
    assert.ok(await nav.locator('img').evaluateAll(nodes=>nodes.every(img=>img.complete&&img.naturalWidth>0)),'menu image missing');
    const headerMetrics=await page.evaluate(()=>{
      const rect=selector=>document.querySelector(selector).getBoundingClientRect(),nav=rect('.desktop-nav'),brand=rect('.header .brand');
      const actions=rect('.header-actions');
      return {overflow:document.documentElement.scrollWidth-innerWidth,navTop:nav.top,brandTop:brand.top,brandBottom:brand.bottom,actionsTop:actions.top,actionsBottom:actions.bottom,targets:[...document.querySelectorAll('.desktop-nav a')].map(node=>node.getBoundingClientRect().height)};
    });
    assert.ok(headerMetrics.overflow<=1,`${viewport.name} header overflow`);
    assert.ok(headerMetrics.targets.every(height=>height>=44),'menu touch targets');
    assert.ok(headerMetrics.actionsTop<headerMetrics.brandBottom&&headerMetrics.brandTop<headerMetrics.actionsBottom,'logo and account must share a row');
    if(viewport.width<1000)assert.ok(headerMetrics.navTop>=headerMetrics.brandBottom,'mobile menu must be below logo');
    const readings=nav.getByRole('link',{name:'운세 골라보기'});
    await readings.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert.equal(await readings.evaluate(node=>getComputedStyle(node).outlineStyle),'solid');
    await page.screenshot({path:`${output}/${viewport.name}-home.png`});
    await readings.click();await expect(page).toHaveURL(/#readings$/);
    await nav.getByRole('link',{name:'영냥이 추천'}).click();await expect(page).toHaveURL(/#recommendations$/);
    await nav.getByRole('link',{name:'영냥이의 방'}).click();await expect(page).toHaveURL(/\/yeongnyangi\/room\/$/);
    const section=page.locator('#daily');await section.scrollIntoViewIfNeeded();
    await expect(page.getByRole('button',{name:'출석하고 멸치 받기'})).toBeEnabled();
    await catVisible(page);await expect(page.locator('.anchovy-dialogue')).toHaveText(idleDialogue);
    assert.equal(await page.getByRole('group',{name:'무료 운세 16종'}).getByRole('button').count(),16);
    await page.getByRole('button',{name:'출석하고 멸치 받기'}).click();
    await expect(page.locator('.anchovy-award')).toBeVisible();
    await expect(page.locator('.anchovy-balance strong')).toHaveText('1마리');
    if(viewport.width===390)await section.screenshot({path:`${output}/mobile-390-award.png`});
    // Start the handover while the award timer is still running: its timer must be cancelled.
    await page.getByRole('button',{name:'멸치 1마리 건네기'}).click();
    await expect(page.locator('.anchovy-award')).toHaveCount(0);
    await expect(page.locator('.anchovy-dialogue')).toHaveText(handoverDialogue);
    await expect(page.locator('.anchovy-cat')).toHaveClass('anchovy-cat unimpressed');
    await section.screenshot({path:`${output}/${viewport.name}-handover.png`});
    await expect(page.locator('.anchovy-dialogue')).toHaveText(idleDialogue);
    await catVisible(page);await expect(page.locator('.anchovy-balance strong')).toHaveText('0마리');
    await page.getByRole('button',{name:'오늘의 이야기 읽기'}).click();
    await page.getByRole('heading',{name:'오늘의 운세'}).waitFor();
    const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,background:getComputedStyle(document.querySelector('#daily')).backgroundColor,cat:document.querySelector('.anchovy-cat > img').getBoundingClientRect().height,buttons:[...document.querySelectorAll('#daily button')].map(node=>node.getBoundingClientRect().height)}));
    assert.ok(metrics.overflow<=1,`${viewport.name} room overflow`);assert.match(metrics.background,/rgb\((38, 24, 52|44, 28, 64)\)/);assert.ok(metrics.buttons.every(height=>height>=40),`${viewport.name} small target`);
    assert.equal(metrics.cat,viewport.width<=640?190:240);
    assert.deepEqual(calls,{attendance:1,unlock:1,reading:1});
    await expect(page.getByRole('button',{name:'오늘 출석 완료'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'오늘의 16종 열림'})).toBeDisabled();
    console.log(JSON.stringify({viewport,headerMetrics,metrics,calls}));await page.close();
  }
  for(const options of [{duplicate:true,balance:1},{fail:true,balance:1},{reduced:true}]){
    const {page}=await fixture({width:390,height:844},options);
    await page.goto(`${origin}/yeongnyangi/room/`,{waitUntil:'networkidle'});await page.locator('#daily').scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'출석하고 멸치 받기'}).click();
    if(options.reduced){
      await expect(page.locator('.anchovy-award')).toBeVisible();assert.equal(await page.locator('.anchovy-award').evaluate(node=>getComputedStyle(node).animationName),'none');
      await expect(page.locator('.anchovy-award')).toHaveCount(0);
    }else{
      await expect(options.fail?page.locator('#daily').getByRole('alert'):page.locator('.free-status')).toContainText(options.fail?'출석 연결을 마치지 못했어요.':'오늘 출석은 이미 했어.');
      await expect(page.locator('.anchovy-award')).toHaveCount(0);
    }
    await page.getByRole('button',{name:'멸치 1마리 건네기'}).click();
    if(options.reduced){
      await expect(page.locator('.anchovy-dialogue')).toHaveText(handoverDialogue);await expect(page.locator('.incoming-anchovy')).toHaveCount(0);
      await page.evaluate(()=>window.dispatchEvent(new Event('cd:auth-changed')));
    }else await expect(options.fail?page.locator('#daily').getByRole('alert'):page.locator('.free-status')).toContainText(options.fail?'이야기를 열지 못했어요.':'오늘의 16종을 모두 열었어.');
    await expect(page.locator('.anchovy-cat')).toHaveClass('anchovy-cat idle');
    await expect(page.locator('.incoming-anchovy')).toHaveCount(0);await catVisible(page);
    console.log(JSON.stringify({scenario:options,status:'PASS'}));await page.close();
  }
  {
    const {page}=await fixture({width:360,height:800},{guest:true});
    await page.goto(`${origin}/yeongnyangi/`,{waitUntil:'networkidle'});
    await expect(page.locator('.header .session-controls')).toHaveAttribute('data-session-status','401');
    await page.locator('.header').getByRole('button',{name:'로그인',exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'닫기',exact:true}).click();
    await page.getByRole('button',{name:'알림 보기',exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'닫기',exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'guest header overflow');
    console.log(JSON.stringify({scenario:'guest login and notifications',status:'PASS'}));await page.close();
  }
  assert.deepEqual(failures,[]);console.log(JSON.stringify({status:'PASS',realPaidCalls:0,realDatabaseWrites:0}));
}finally{await browser.close();}
