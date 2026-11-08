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
 const blueprintFetch=w.fetch;w.fetch=async(url,options)=>{assert.ok(String(url).endsWith('/api/ziwei-island/blueprint'),'섬은 정적 명반 해설만 요청한다');return blueprintFetch(url,options);};
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

test('island produces all twelve static palace readings without a provider or database',async()=>{
 const {handleZiweiIslandRoutes}=await import('../../worker/routes/ziwei-island.js');
 const {PALACE_CONSULT}=await import('../../worker/lib/island/consult/palace-prompts.js');
 const offlineEnv=new Proxy({}, {get(_target,key){if(/API_KEY|^AI$|MONGO|DATABASE/.test(String(key)))throw new Error(`Unexpected external dependency: ${String(key)}`);return undefined;}});
 for(const birthTimeUnknown of [false,true]){
  const input={birthDate:'1990-05-14',birthTime:'09:30',birthTimeUnknown,gender:'female',calendarType:'solar',date:'2026-11-09'};
  const generate=async()=>{
   const response=await handleZiweiIslandRoutes(new Request('https://mock.test/api/ziwei-island/blueprint',{method:'POST',body:JSON.stringify(input)}),offlineEnv);
   assert.equal(response.status,200);return (await response.json()).blueprint.reading;
  };
  const reading=await generate();assert.deepEqual(await generate(),reading);
  for(const [key,config]of Object.entries(PALACE_CONSULT)){
   assert.ok(reading.palaces[key],`${key} 해설 누락`);
   assert.deepEqual(reading.palaces[key].sections.map(section=>section.key),config.sections.map(([id])=>id));
   for(const section of reading.palaces[key].sections)assert.ok(section.body.trim().length>=40,`${key}/${section.key} 빈 본문`);
  }
 }
});
