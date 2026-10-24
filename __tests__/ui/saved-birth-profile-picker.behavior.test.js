const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {JSDOM}=require('jsdom');
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
function runtime(fetch){
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,allowJs:true}}).outputText;
  const req=id=>{
   if(id.endsWith('auth-client'))return {authFetch:fetch};
   if(id.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
   if(!id.startsWith('.')&&!id.startsWith('@/'))return require(id);
   const base=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(file),id);
   const target=[base,base+'.ts',base+'.tsx',base+'.js',path.join(base,'index.js')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
   if(!target)throw Error('missing '+base);return load(target);
  };
  new Function('require','module','exports',source)(req,module,module.exports);return module.exports;
 }
 return load(path.resolve('app/components/SavedBirthProfilePicker.tsx')).default;
}
async function mount(fetch,profiles,calendarMode,onSelected){
 const dom=new JSDOM('<!doctype html><html lang="ko"><body><div id="root"></div></body></html>',{url:'https://example.invalid'});
 for(const key of ['window','document','localStorage','sessionStorage','Event'])global[key]=dom.window[key];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 localStorage.setItem('fortune_auth_user',JSON.stringify({id:'owner'}));
 if(profiles)localStorage.setItem('FORTUNE_APP_USER_PROFILES.list::owner',JSON.stringify(profiles));
 const Picker=runtime(fetch),root=createRoot(document.getElementById('root')),choices=[];
 await act(async()=>root.render(React.createElement(React.Fragment,null,React.createElement(Picker,{label:'본인',calendarMode,onSelect:seed=>{choices[0]=seed;return onSelected?.(seed);}}),React.createElement(Picker,{label:'상대',calendarMode,onSelect:seed=>choices[1]=seed}))));
 return {choices,async choose(index,id){await act(async()=>{const select=document.querySelectorAll('select')[index];select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));});},async close(){await act(async()=>root.unmount());dom.window.close();}};
}
const cards=[{id:'a',name:'본인 예시',birthDate:'1990-01-01',birthTime:'00:00',gender:'female',location:{label:'New York, USA',lat:40.7,lng:-74,tz:'America/New_York'}},{id:'b',name:'상대 예시',birthDate:'1992-02-02',timeUnknown:true}];
test('two subjects are independent, clear missing details and never mutate saved profiles',async()=>{
 const ui=await mount(()=>{throw Error('cached choices must not fetch')},cards);
 try {
  const before=JSON.stringify({...localStorage});
  await ui.choose(0,'a');await ui.choose(1,'b');
  assert.equal(ui.choices[0].birthTime,'00:00');assert.equal(ui.choices[0].timezone,'America/New_York');assert.equal(ui.choices[1].birthTimeUnknown,true);
  await ui.choose(0,'b');assert.equal(ui.choices[0].timezone,'');assert.equal(ui.choices[0].latitude,'');assert.equal(ui.choices[0].birthTime,'');
  assert.equal(JSON.stringify({...localStorage}),before);
 } finally {await ui.close();}
});
test('an old account response cannot reappear after logout',async()=>{
 const pending=[];const ui=await mount((url,options)=>{assert.equal(url,'/api/profile');assert.equal(options.method,'GET');return new Promise(resolve=>pending.push(resolve));});
 try {
  await act(async()=>{localStorage.removeItem('fortune_auth_user');window.dispatchEvent(new Event('cd:auth-changed'));});
  await act(async()=>{for(const resolve of pending)resolve({ok:true,json:async()=>({profiles:cards})});});
  assert.equal(document.querySelectorAll('select').length,0);assert.match(document.body.textContent,/로그인하면/);
 } finally {await ui.close();}
});
test('profile lookup failure leaves manual input guidance and a refresh action',async()=>{
 const ui=await mount(async()=>({ok:false,json:async()=>({})}));
 try {assert.match(document.body.textContent,/직접 입력/);assert.equal(document.querySelectorAll('button').length,2);}finally{await ui.close();}
});

test('lunar leap birthday converts to the equivalent solar date without changing the card',async()=>{
 const leap={id:'leap',name:'윤달 예시',birthDate:'2017-05-01',calType:'lunar_leap',timeUnknown:true};
 const ui=await mount(()=>{throw Error('no fetch')},[leap],'lunar');
 try {await ui.choose(0,'leap');assert.equal(ui.choices[0].birthDate,'2017-06-24');assert.equal(ui.choices[0].calendarType,'solar');assert.equal(ui.choices[0].isLeapMonth,false);assert.equal(JSON.parse(localStorage.getItem('FORTUNE_APP_USER_PROFILES.list::owner'))[0].calType,'lunar_leap');}finally{await ui.close();}
});

test('switching to manual input cancels the pending selection indicator',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});
 const ui=await mount(()=>{throw Error('no fetch')},cards,undefined,()=>pending);
 try {await ui.choose(0,'a');assert.match(document.querySelector('[data-saved-birth-profile]').textContent,/프로필 확인 중/);await ui.choose(0,'');assert.doesNotMatch(document.querySelector('[data-saved-birth-profile]').textContent,/프로필 확인 중/);await act(async()=>finish());}finally{await ui.close();}
});
