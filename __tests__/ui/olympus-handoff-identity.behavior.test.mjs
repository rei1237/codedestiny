import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=fs.readFileSync('OlympusVIPLounge.jsx','utf8');
const code=ts.transpileModule(source.slice(source.indexOf('// A main-shell handoff')),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function events(){const map=new Map();return {addEventListener(n,f){const s=map.get(n)||new Set();s.add(f);map.set(n,s)},removeEventListener(n,f){map.get(n)?.delete(f)},dispatch(n,extra={}){for(const f of [...(map.get(n)||[])])f({type:n,...extra})}};}
const placements={sun:{key:'aries',deg:1}};
const input={name:'private A',date:'1990-05-15',time:'12:00',placements};
function fixture({handoff=false,response={ok:true,json:async()=>({ok:true,authenticated:true,user:{id:'user-one'}})}}={}){
  const state=[],refs=[],effects=[],timers=[],calls=[];let slot=0,refSlot=0,mounted=false;
  const localStorage=storage(),sessionStorage=storage(),window=events(),document=events();
  localStorage.setItem('fortune_auth_user',JSON.stringify({id:'user-one'}));
  const c=vm.createContext({exports:{},window,document,localStorage,sessionStorage,Promise,JSON,console,
    useState:init=>{const i=slot++;if(!(i in state))state[i]=init;return[state[i],v=>state[i]=v]},
    useRef:init=>{const i=refSlot++;return refs[i]||(refs[i]={current:init})},useEffect:fn=>{if(!mounted)effects.push(fn)},
    React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
    CSS:'',Cosmos:'Cosmos',Intro:'Intro',Input:'Input',OracleInput:'OracleInput',Loading:'Loading',TabResult:'TabResult',DailyOracleResult:'DailyOracleResult',
    calcPlacements:(_d,_t,name)=>({name}),buildSwissPayload:()=>({}),ensureOracleCompute:async()=>async()=>placements,
    getApiBaseUrl:()=>'',toAbsoluteApiUrl:p=>p,isMobileAppRuntime:()=>false,
    fetchWithTimeout:async(...args)=>{calls.push(args);return typeof response==='function'?response():response},
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length}
  });
  vm.runInContext(code,c);
  if(handoff){const owner={accountId:'user-one',storageIdentity:c.olympusStoredIdentity('user-one')};sessionStorage.setItem('OLYMPUS_ORACLE_PROFILE',JSON.stringify({...input,readingOwner:owner}));}
  let cleanups=[];
  const render=()=>{slot=0;refSlot=0;const tree=c.exports.default();if(!mounted){mounted=true;cleanups=effects.map(f=>f())}return tree};
  function child(type){const walk=n=>{if(!n||typeof n!=='object')return null;if(n.type===type)return n;for(const v of n.children||[]){const found=walk(v);if(found)return found}return null};const n=walk(render());assert.ok(n,type+' must render');return n.props;}
  return {c,state,refs,window,document,localStorage,sessionStorage,calls,render,child,timers,runWait(){for(const t of timers.splice(0))t.fn()},cleanup(){cleanups.forEach(f=>f())},replay(){cleanups.forEach(f=>f());cleanups=effects.map(f=>f())}};
}
async function settle(){for(let i=0;i<12;i++)await Promise.resolve()}
test('handoff-bound Olympus renders only after fresh exact-owner auth and clears result/daily on identity/navigation events',async()=>{
  for(const event of ['cd:auth-changed','cd:auth-session-invalidated','cd:profile-changed','destiny:profile-changed','cd:current-profile-changed','popstate','pagehide','storage','document-profile']){
    const h=fixture({handoff:true});h.render();h.runWait();await settle();assert.equal(h.state[0],'result');assert.equal(h.state[1].name,'private A');assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'/api/auth/me');assert.equal(h.calls[0][1].cache,'no-store');assert.equal(h.calls[0][1].headers['x-code-destiny-cache-refresh'],'1');
    if(event==='document-profile')h.document.dispatch('destinyProfileChanged');else h.window.dispatch(event,event==='storage'?{key:'fortune_auth_user'}:{});
    assert.equal(h.state[0],'intro',event);assert.equal(h.state[1],null,event);assert.equal(h.state[2],null,event);assert.equal(h.refs[1].current,null,event);
    h.child('Intro').onOracle();h.child('OracleInput').onSubmit({name:'daily A'});assert.equal(h.state[0],'daily');h.window.dispatch('cd:auth-session-invalidated');assert.equal(h.state[2],null);
  }
});
test('handoff auth failures do not display old data and direct manual Olympus remains public',async()=>{
  for(const response of [{ok:true,json:async()=>({user:{id:'user-one'}})},{ok:false,status:401},{ok:false,status:503},{ok:true,json:async()=>({ok:true,degraded:true,user:{id:'user-one'}})},{ok:true,json:async()=>({user:{id:'two'}})},{ok:true,json:async()=>({authenticated:false,user:{id:'user-one'}})}]){
    const h=fixture({handoff:true,response});h.render();h.runWait();await settle();assert.equal(h.state[0],'intro');assert.equal(h.state[1],null);assert.ok(h.state[3]);
    h.localStorage.removeItem('fortune_auth_user');h.child('Intro').onStart();h.child('Input').onSubmit({...input,name:'public manual'});h.runWait();await settle();assert.equal(h.state[0],'result');assert.equal(h.state[1].name,'public manual');assert.equal(h.calls.length,1,'Manual input performs no auth lookup');
  }
});
test('pending handoff auth/computation cannot reopen after auth/profile/back/unmount and newer input wins',async()=>{
  for(const event of ['cd:auth-session-invalidated','cd:profile-changed','popstate','unmount','silent-account','silent-profile']){
    let resolve;const h=fixture({handoff:true,response:()=>new Promise(r=>resolve=r)});h.render();await settle();
    if(event==='unmount')h.cleanup();else if(event==='silent-account')h.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'two'}));else if(event==='silent-profile')h.localStorage.setItem('FORTUNE_APP_USER_PROFILES.current::user-one','new-profile');else h.window.dispatch(event);
    resolve({ok:true,json:async()=>({authenticated:true,user:{id:'user-one'}})});h.runWait();await settle();assert.notEqual(h.state[0],'result',event);assert.equal(h.state[1],null,event);
  }
  const h=fixture();h.render();h.child('Intro').onStart();const onSubmit=h.child('Input').onSubmit;onSubmit({...input,name:'old'});onSubmit({...input,name:'new'});h.runWait();await settle();assert.equal(h.state[1].name,'new');h.child('TabResult').onReset();assert.equal(h.state[1],null);assert.equal(h.state[0],'intro');
});
test('StrictMode effect replay preserves only the current handoff; public direct entry makes no auth request',async()=>{
  const h=fixture({handoff:true});h.render();h.replay();h.runWait();await settle();assert.equal(h.state[0],'result');assert.equal(h.state[1].name,'private A');
  const direct=fixture();direct.render();assert.equal(direct.calls.length,0);assert.equal(direct.state[0],'intro');
});
test('same-account verified auth echo keeps a handoff, but logout and conflicting identity always clear it',async()=>{
  const h=fixture({handoff:true});h.render();h.window.dispatch('cd:auth-changed',{detail:{source:'auth-store',event:'login'}});h.runWait();await settle();assert.equal(h.state[0],'result');
  h.window.dispatch('cd:auth-changed',{detail:{authenticated:true,user:{id:'user-one'}}});assert.equal(h.state[0],'result');
  h.window.dispatch('cd:auth-changed',{detail:{authenticated:true,user:{id:'other'}}});assert.equal(h.state[0],'intro');assert.equal(h.state[1],null);
  const logout=fixture({handoff:true});logout.render();logout.runWait();await settle();logout.window.dispatch('cd:auth-changed',{detail:{source:'auth-store',event:'logout'}});assert.equal(logout.state[0],'intro');assert.equal(logout.state[1],null);
});
