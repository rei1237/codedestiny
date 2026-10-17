const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('destiny-island.html','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,25));
test('free island opens static reading, records visits, and ignores a closed year request',async()=>{
 const {handleZiweiIslandRoutes}=await import('../../worker/routes/ziwei-island.js');
 const profile={name:'테스트',birthDate:'1990-05-14',birthTime:'09:30',gender:'female',calendarType:'solar'};
 const response=await handleZiweiIslandRoutes(new Request('https://mock.test/api/ziwei-island/blueprint',{method:'POST',body:JSON.stringify(profile)}),{});
 const data=await response.json();assert.equal(data.ok,true);
 const dom=new JSDOM(source,{url:'https://mock.test',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.matchMedia=()=>({matches:true,addEventListener(){}});w.Audio=class{addEventListener(){} pause(){} load(){} play(){return Promise.resolve();}};
 let resolveYear;w.fetch=async(_url,options)=>{const body=JSON.parse(options.body);if(body.date==='2027-07-01')return new Promise(resolve=>{resolveYear=()=>resolve({ok:true,json:async()=>data});});return {ok:true,json:async()=>data};};
 w.localStorage.setItem('FORTUNE_APP_USER_PROFILES.list::guest',JSON.stringify([profile]));w.localStorage.setItem('cdIsland:v1',JSON.stringify({hasSeenIntro:true,bgm:false,exp:0,quests:{},streak:{}}));
 try{
  for(const script of w.document.querySelectorAll('script'))w.eval(script.textContent);
  w.document.querySelector('.gate-card-item').click();await tick();
  const dock=w.document.querySelectorAll('#palaceDock button');assert.equal(dock.length,12);dock[0].click();
  assert.ok(w.document.querySelectorAll('.reading-section').length>=3);assert.equal(w.document.querySelector('#visitCount').textContent,'1/12');
  assert.equal(w.document.querySelector('#travelStatus').hidden,true,'reduced motion arrives immediately');
  w.document.querySelector('#sheetPalaceDesc [data-close]').click();w.document.querySelector('#btnTiming').click();
  const year=w.document.querySelector('#timingYear');year.value='2027';year.dispatchEvent(new w.Event('change'));assert.equal(year.disabled,true);
  w.document.querySelector('#sheetPalaceDesc [data-close]').click();resolveYear();await tick();assert.equal(w.document.querySelector('#sheetPalaceDesc').classList.contains('on'),false);
  assert.equal(w.document.querySelector('a[href*="island-consult"]'),null);
 } finally {w.close();}
});
