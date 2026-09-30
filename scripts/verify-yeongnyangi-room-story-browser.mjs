import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.CD_ROOM_BASE_URL||'http://localhost:3126';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local mock verification only');
const output='tmp/neo-room-verification';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:mobile?'reduce':'no-preference'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let mode='success',unlocks=0,musicRequests=0;
  let attendance={day:new Date(Date.now()+9*3600000).toISOString().slice(0,10),balance:1,attended:true,unlocked:false};
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){
    const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname.endsWith('/free/unlock')){
     unlocks++;
     if(mode==='fail')return json({message:'테스트 연결 실패'},503);
     const newlyUnlocked=!attendance.unlocked;
     attendance={...attendance,balance:0,unlocked:true};return json({...attendance,newlyUnlocked});
    }
    if(url.pathname.endsWith('/attendance'))return json(attendance);
    if(url.pathname.endsWith('/free/reading'))return json({result:null});
    if(url.pathname.includes('/profiles'))return json({ok:true,profiles:[]});
    return json({ok:true,user:null,authenticated:false});
   }
   if(url.hostname==='music.code-destiny.com'||url.hostname==='assets.code-destiny.com'){if(url.pathname.endsWith('.mp3'))musicRequests++;return route.continue();}
   if(url.origin!==new URL(base).origin)return route.abort();
   return route.continue();
  });
  await page.addInitScript(()=>{const NativeAudio=window.Audio;window.__roomAudio=[];window.Audio=function(...args){const player=new NativeAudio(...args);window.__roomAudio.push(player);return player;};});
  await page.goto(`${base}/yeongnyangi/room/`,{waitUntil:'networkidle',timeout:120000});
  await page.getByRole('button',{name:'생선 보여주기',exact:true}).click();
  await page.getByText('그 크기로는 어림없… 앉아. 내가 방금 앉으라고 했나?',{exact:true}).waitFor();
  await page.getByRole('button',{name:'생선 보여주기',exact:true}).click();
  await page.getByText('이번엔 거절할 거야. …그건 고등어야? 아니, 그냥 확인한 거야.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'찻잔 내밀기',exact:true}).click();
  await page.getByText('사람일 땐 늘 차를 식혀 마셨는데.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'관계가 궁금해',exact:true}).click();
  await page.getByRole('button',{name:'사실과 추측을 하나씩 나누기',exact:false}).click();
  await page.getByText('“좋아. 오늘은 그만큼 움직인 네 편을 들어줘.”',{exact:true}).waitFor();
  assert.equal(unlocks,0,'room play never spends an anchovy');
  assert.equal(musicRequests,0,'no music fetched before opt-in');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-room.png`});
  await page.getByRole('button',{name:'BGM 켜기',exact:true}).click();
  await page.waitForFunction(()=>window.__roomAudio.some(audio=>!audio.paused&&audio.currentTime>0),{timeout:20000});
  await page.getByRole('button',{name:'네오의 이야기',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('heading',{name:'사람들은 그를 네오라고 불렀다'}).waitFor();
  for(let i=0;i<4;i++)await dialog.getByRole('button',{name:'다음 이야기',exact:true}).click();
  await dialog.getByRole('button',{name:'네오라고 불러준다',exact:true}).click();
  await dialog.getByText('그 이름… 아직 기억하는구나.',{exact:false}).waitFor();
  await dialog.locator('.story-reading').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-grief.png`});
  await dialog.getByRole('button',{name:'다음 이야기',exact:true}).click();
  await dialog.getByText('그렇다... 네오 그는 이제 생선만 보면 거부할 수 없는 몸이 되어버렸다...',{exact:true}).waitFor();
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-fish-curse.png`});
  for(let i=0;i<3;i++)await dialog.getByRole('button',{name:'다음 이야기',exact:true}).click();
  await dialog.getByRole('button',{name:'멸치로 오늘의 운세 보기',exact:true}).click();
  await dialog.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'daily');
  await page.getByRole('button',{name:'BGM 끄기',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__roomAudio.every(audio=>audio.paused)),true);
  mode='fail';
  await page.getByRole('button',{name:'멸치 1마리 건네기',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'테스트 연결 실패'}).waitFor();
  assert.equal(await page.locator('.anchovy-cat').getAttribute('class'),'anchovy-cat idle');
  mode='success';
  await page.getByRole('button',{name:'멸치 1마리 건네기',exact:true}).click();
  await page.locator('.anchovy-cat.unimpressed').waitFor();
  if(mobile)assert.equal(await page.locator('.anchovy-sigh').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.locator('.free-welcome').screenshot({path:`${output}/${mobile?'mobile':'desktop'}-anchovy.png`});
  await page.locator('.anchovy-cat.ready').waitFor();
  assert.equal(await page.getByRole('button',{name:'오늘의 16종 열림',exact:true}).isDisabled(),true);
  assert.equal(unlocks,2,'one rejected mock request and one successful mock request');
  await page.getByRole('button',{name:'네오의 이야기',exact:true}).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button',{name:'네오의 이야기',exact:true}).evaluate(el=>el===document.activeElement),true);
  assert.deepEqual(errors,[],'no browser runtime errors');
  results.push({viewport:mobile?'390x844':'1440x1000',reducedMotion:mobile,interactions:'pass',storyChoices:'pass',audio:'real CDN playback and pause passed',unlock:'mock failure/success passed',runtimeErrors:errors});
  await context.close();
 }
 console.log(JSON.stringify(results,null,2));
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
