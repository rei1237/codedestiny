import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';

const origin=process.env.YN_UI_ORIGIN;
assert.ok(origin&&/^http:\/\/127\.0\.0\.1:\d+$/.test(origin),'Set YN_UI_ORIGIN to the local mock dev server');
const baseline=process.argv.includes('--baseline');
const output='build-cache/yeongnyangi-profiles-ui';
mkdirSync(output,{recursive:true});
const profiles=[{id:'qa-one',profileId:'qa-one',name:'달빛 손님',birthDate:'1992-05-18',birth:{year:1992,month:5,day:18,timeUnknown:true},location:{label:'대한민국 부산'}},{id:'qa-two',profileId:'qa-two',name:'별빛 손님',birthDate:'1990-02-20',birth:{year:1990,month:2,day:20,timeUnknown:true},location:{label:'대한민국 서울'}}];
const browser=await chromium.launch({headless:true});
const reports=[];
const require=createRequire(import.meta.url),axe=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const available=['saju','ziwei','sukuyo','vedic','astrology','tarot'].flatMap(domain=>['mackerel','salmon','flounder','tuna'].map(fish=>({id:`${domain}_${fish}`,available:true}))).concat(['fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_astrology_tarot','fusion_all'].map(id=>({id,available:true})));
async function fixture(page,{delay=3000,profileDelay=0,list=profiles,unlocked=false,cached=null,failFirstSave=false,failFirstList=false,failAttendance=false,failProducts=false}={}){
 const control={list:[...list],owner:'qa-owner',saves:[],reads:0,loggedOut:false};
 await page.addInitScript(cached=>{localStorage.setItem('fortune_auth_user',JSON.stringify({id:'qa-owner',name:'테스트 손님'}));localStorage.setItem('fortune_auth_token','mock-yeongnyangi');if(cached)localStorage.setItem('FORTUNE_APP_USER_PROFILES.list::qa-owner',JSON.stringify(cached));},cached);
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.startsWith('/api/')){
   let body={ok:true},status=200;
   if(url.pathname==='/api/profile'||url.pathname==='/api/yeongnyangi/profiles'){
    const requestList=[...control.list],loggedOut=control.loggedOut;
    if(route.request().method()==='POST'){
     const input=route.request().postDataJSON().profile;control.saves.push(input);
     if(failFirstSave&&control.saves.length===1){status=503;body={ok:false,message:'잠시 후 다시 저장해 주세요.'};}
     else{const profile={...input,id:input.profileId,birthDate:`${input.birth.year}-${String(input.birth.month).padStart(2,'0')}-${String(input.birth.day).padStart(2,'0')}`};control.list.push(profile);body={ok:true,profile,profiles:control.list,currentId:profile.id};}
    }else{
     const ownList=url.pathname==='/api/yeongnyangi/profiles';
     if(ownList)control.reads++;const attempt=control.reads;
     await new Promise(resolve=>setTimeout(resolve,profileDelay));
     if(loggedOut){status=401;body={ok:false,message:'로그인이 필요해요.'};}
     else if(failFirstList&&ownList&&attempt===1){status=503;body={ok:false,message:'프로필 연결을 다시 확인해 주세요.'};}
     else body={ok:true,profiles:requestList,currentId:requestList[0]?.id||'',canCreateMore:true};
    }
   }else if(url.pathname.endsWith('/attendance')){
    await new Promise(resolve=>setTimeout(resolve,delay));status=failAttendance?503:200;body=failAttendance?{ok:false,message:'출석 조회 실패'}:{ok:true,day:'2026-09-16',balance:1,attended:true,unlocked};
   }else if(url.pathname.endsWith('/products')){
    await new Promise(resolve=>setTimeout(resolve,delay));status=failProducts?503:200;body=failProducts?{ok:false,message:'상품 조회 실패'}:{ok:true,products:available};
   }else if(url.pathname.includes('/free/reading'))body={ok:true,result:null};
   else if(url.pathname==='/api/auth/me')body={ok:true,user:{id:control.owner,name:'테스트 손님'}};
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  }
  if(url.origin!==new URL(origin).origin)return route.abort();
  return route.continue();
 });
 return control;
}
async function selectAndMeasure(page){
 const target=page.getByRole('button',{name:/별빛 손님/});
 try{await target.waitFor({timeout:15000});}catch(error){await page.screenshot({path:`${output}/failure.png`,fullPage:true});console.error(await page.locator('body').innerText());throw error;}
 await target.evaluate(node=>{
  window.__ynSelectionMs=null;
  node.addEventListener('click',()=>{
   const start=performance.now();
   const observer=new MutationObserver(()=>{if(node.getAttribute('aria-pressed')==='true'){window.__ynSelectionMs=performance.now()-start;observer.disconnect();}});
   observer.observe(node,{attributes:true,attributeFilter:['aria-pressed']});
  },{once:true});
 });
 await target.click();
 await page.waitForFunction(()=>window.__ynSelectionMs!==null);
 const elapsed=await page.evaluate(()=>window.__ynSelectionMs);
 assert.ok(elapsed<=100,`selection ${elapsed}ms exceeds 100ms`);
 return elapsed;
}
try{
 for(const path of ['room','fortune']){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await fixture(page,{unlocked:true});
  await page.goto(`${origin}/yeongnyangi/${path}/`,{waitUntil:'domcontentloaded'});
  const start=await page.evaluate(()=>performance.now());
  const picker=baseline?page.locator('select').filter({has:page.locator('option[value="qa-two"]')}).first():page.getByRole('button',{name:/별빛 손님/});
  await picker.waitFor();
  if(baseline)await picker.locator('option[value="qa-two"]').waitFor({state:'attached'});
  const visibleMs=await page.evaluate(value=>performance.now()-value,start);
  const selectionMs=baseline?(await picker.selectOption('qa-two'),null):await selectAndMeasure(page);
  reports.push({path,visibleMs,selectionMs});
  await page.screenshot({path:`${output}/${baseline?'baseline':'after'}-${path}.png`,fullPage:true});
  await page.close();
 }
 if(!baseline)assert.ok(reports.every(row=>row.visibleMs<2500),'profile waits for unrelated delayed request');
 if(!baseline){
  for(const viewport of [{width:360,height:800},{width:390,height:844},{width:430,height:900},{width:1440,height:1000}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await fixture(page,{delay:0,unlocked:true});await page.goto(`${origin}/yeongnyangi/fortune/`,{waitUntil:'domcontentloaded'});
   const selectionMs=await selectAndMeasure(page);
   for(const name of ['사주','자미두수','숙요','베다점','서양 점성술','타로','복합 운세']){
    await page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name,exact:true}).click();
    assert.equal(await page.getByRole('group',{name:'생선 상품'}).getByRole('button').count(),4);
    const choices=page.getByRole('group',{name:'생선 상품'}).getByRole('button');
    for(let i=0;i<4;i++){await choices.nth(i).click();assert.equal(await choices.nth(i).getAttribute('aria-pressed'),'true');}
   }
   await page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name:'타로',exact:true}).click();
   assert.equal(await page.getByRole('group',{name:'저장한 프로필'}).count(),0);
   assert.equal(await page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).isEnabled(),true);
   await page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name:'숙요',exact:true}).click();
   await page.getByLabel('궁합 상대 (선택)').selectOption('qa-one');
   await page.getByRole('button',{name:/달빛 손님.*1992/}).click();
   assert.equal(await page.getByLabel('궁합 상대 (선택)').inputValue(),'');
   assert.equal(await page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).isDisabled(),true);
   await page.getByLabel('출생시간 보완 (선택)').fill('09:30');
   assert.equal(await page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).isEnabled(),true);
   await page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name:'사주',exact:true}).click();
   const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,targets:[...document.querySelectorAll('main button')].filter(node=>node.offsetParent!==null).map(node=>node.getBoundingClientRect().height)}));
   assert.ok(metrics.overflow<=1,`overflow at ${viewport.width}`);assert.ok(metrics.targets.every(height=>height>=44),`small target at ${viewport.width}`);assert.deepEqual(errors,[]);
   await page.addScriptTag({content:axe});const accessibility=await page.evaluate(()=>axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
   assert.deepEqual(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
   await page.screenshot({path:`${output}/fortune-${viewport.width}.png`,fullPage:true});
   reports.push({viewport:viewport.width,selectionMs,overflow:metrics.overflow,axeViolations:accessibility.violations.length});await page.close();
  }
  for(const path of ['room','fortune']){
   const page=await browser.newPage();await fixture(page,{profileDelay:3000,cached:profiles});
   await page.goto(`${origin}/yeongnyangi/${path}/`,{waitUntil:'domcontentloaded'});await selectAndMeasure(page);
   await page.getByText('저장한 프로필부터 골라도 돼. 최신 목록을 확인하고 있어.').waitFor({state:'hidden'});
   assert.equal(await page.getByRole('button',{name:/별빛 손님/}).getAttribute('aria-pressed'),'true');await page.close();
  }
  const page=await browser.newPage();const control=await fixture(page,{delay:0,list:[],failFirstSave:true,failFirstList:true});
  await page.goto(`${origin}/yeongnyangi/fortune/`,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'프로필 다시 확인하기'}).click();
  await page.getByText('아직 저장한 프로필이 없어. 첫 이야기를 남겨줘.').waitFor();
  await page.getByRole('button',{name:'새 프로필 만들기'}).click();await page.getByLabel('이름',{exact:true}).fill('새로운 손님');
  await page.getByLabel('생년월일',{exact:true}).fill('1992-05-18');await page.getByLabel('출생시간을 몰라요').check();
  await page.getByRole('button',{name:'프로필 저장하기',exact:true}).click();await page.getByText('잠시 후 다시 저장해 주세요.').waitFor();
  await page.getByRole('button',{name:'프로필 저장하기',exact:true}).click();await page.getByRole('button',{name:/새로운 손님.*1992/}).waitFor();
  assert.equal(control.saves.length,2);assert.equal(control.saves[0].profileId,control.saves[1].profileId);
  assert.equal(await page.getByRole('button',{name:/새로운 손님.*1992/}).getAttribute('aria-pressed'),'true');
  control.list=[...profiles];control.owner='qa-next';
  await page.evaluate(()=>{localStorage.setItem('fortune_auth_user',JSON.stringify({id:'qa-next'}));window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{kind:'login'}}));});
  await page.getByRole('button',{name:/별빛 손님/}).waitFor();assert.equal(await page.getByRole('button',{name:/새로운 손님.*1992/}).count(),0);
  await page.getByRole('button',{name:/별빛 손님/}).click();control.list=[profiles[0]];
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{kind:'refresh'}})));
  await page.getByText('선택한 프로필을 찾지 못했어요. 함께 읽을 프로필을 다시 골라 주세요.').waitFor();
  control.loggedOut=true;
  await page.evaluate(()=>{localStorage.removeItem('fortune_auth_user');localStorage.removeItem('fortune_auth_token');window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{kind:'logout'}}));});
  await page.getByRole('button',{name:'로그인하고 프로필 보기'}).waitFor();assert.equal(await page.getByRole('button',{name:/달빛 손님.*1992/}).count(),0);await page.close();
  for(const path of ['room','fortune']){
   const page=await browser.newPage();await fixture(page,{delay:0,failAttendance:true,failProducts:true});await page.goto(`${origin}/yeongnyangi/${path}/`,{waitUntil:'domcontentloaded'});
   await selectAndMeasure(page);await page.close();
  }
  reports.push({scenarios:'empty, retry, stable save id, cached selection, removed selection, account switch, logout, independent failures',passed:true});
  const searchPage=await browser.newPage();
  const many=[...profiles,...Array.from({length:6},(_,i)=>({...profiles[0],id:`qa-extra-${i}`,profileId:`qa-extra-${i}`,name:`추가 손님 ${i}`}))];
  await fixture(searchPage,{delay:0,list:many});await searchPage.goto(`${origin}/yeongnyangi/fortune/`,{waitUntil:'domcontentloaded'});
  await searchPage.getByLabel('프로필 이름 검색').fill('별빛');
  assert.equal(await searchPage.getByRole('group',{name:'저장한 프로필'}).getByRole('button').count(),1);
  await searchPage.getByRole('button',{name:/별빛 손님/}).press('Space');
  assert.equal(await searchPage.getByRole('button',{name:/별빛 손님/}).getAttribute('aria-pressed'),'true');await searchPage.close();
 }
 writeFileSync(`${output}/${baseline?'baseline':'after'}.json`,JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports));
}finally{await browser.close();}
