import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const require=createRequire(import.meta.url), React=require('react'), {act}=require('react-dom/test-utils'),{createRoot}=require('react-dom/client');
const read=p=>fs.readFileSync(p,'utf8');
const field={primary:{score:70,key:'north'},sources:['saju'],timeline:Object.fromEntries(['d30','d90','y1','y3'].map(k=>[k,{momentum:70,weather:'clear'}]))};
const bundled=await build({stdin:{contents:['LifeVoyage','FutureSim','Crossroads'].map(n=>`export {${n}} from './app/destiny-compass/_components/${n}';`).join('\n'),resolveDir:process.cwd()},bundle:true,write:false,jsx:'automatic',format:'cjs',platform:'node',external:['react','react/jsx-runtime'],plugins:[{name:'fixtures',setup(b){
 b.onResolve({filter:/\.module\.css$/},()=>({path:'css',namespace:'fixture'}));
 b.onResolve({filter:/CraftedProductDisclosure|\/Starfield$|\/PigFace$/},()=>({path:'empty',namespace:'fixture'}));
 b.onResolve({filter:/_lib\/copy$/},()=>({path:'copy',namespace:'fixture'}));
 b.onResolve({filter:/_lib\/archive$/},()=>({path:'archive',namespace:'fixture'}));
 b.onResolve({filter:/i18n\/dictionary$/},()=>({path:'locale',namespace:'fixture'}));
 b.onResolve({filter:/auth-client$/},()=>({path:'auth',namespace:'fixture'}));
 b.onResolve({filter:/_engine\/crossroad$/},()=>({path:'crossroad',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:{css:'export default new Proxy({}, {get:(_,k)=>k});',empty:'export default ()=>null;export const Starfield=()=>null;export const PigFace=()=>null;',locale:'export const detectLocale=()=>"ko";',archive:'export const saveCompassArchive=(...a)=>globalThis.__archives.push(a);',auth:'export const AUTH_SESSION_INVALIDATED_EVENT="cd:auth-session-invalidated";export const authFetch=(...a)=>globalThis.__session(...a);',crossroad:'export const computeCrossroad=()=>({recommended:"a",options:[{id:"a",labelKey:"A",total:70,systemScores:{saju:70}},{id:"b",labelKey:"B",total:60,systemScores:{saju:60}}]});',copy:`const weather={clear:{label:'clear',head:'forecast'}};const c={lifeVoyageWeather:weather,futureSimWeather:weather,voyagePeriodLabel:{d30:'30',d90:'90',y1:'1',y3:'3'},futureSimStopLabel:{now:'now',d30:'30',d90:'90',y1:'1'},futureSimStopAriaLabel:()=>'',crossroadsHints:[],crossroadsResultPigLine:()=>'',systemLabel:{saju:'saju'}};export const useDestinyCompassCopy=()=>new Proxy(c,{get:(o,k)=>o[k]??k});`}[path]}));
}}]});const mod={exports:{}};new Function('require','module','exports',bundled.outputFiles[0].text)(require,mod,mod.exports);
for(const name of ['LifeVoyage','FutureSim','Crossroads']) test(name+' free clicks need login, reject late identity replies, and never create a paid archive',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__archives=[];let resolve,calls=0;globalThis.__session=()=>{calls++;return new Promise(r=>resolve=r)};
 const root=createRoot(document.getElementById('root'));const props={field,onBack:()=>{},...(name==='Crossroads'?{resumed:{a:'A',b:'B'}}:{})};
 await act(async()=>root.render(React.createElement(mod.exports[name],props)));
 if(name==='Crossroads')await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='compareAgainButton').click());
 let button=document.querySelector('[data-cd-reading-action]');await act(async()=>{button.click();button.click();});assert.equal(calls,1);
 await act(async()=>window.dispatchEvent(new window.Event('cd:auth-session-invalidated')));await act(async()=>resolve({ok:true,json:async()=>({authenticated:true,user:{id:'owner'}})}));assert.ok(document.querySelector('[data-cd-reading-action]'),'late old response remains closed');assert.equal(globalThis.__archives.length,0);
 if(name!=='Crossroads'){await act(async()=>document.querySelector('[data-cd-reading-action]').click());await act(async()=>resolve({ok:true,json:async()=>({authenticated:true,user:{id:'owner'}})}));assert.equal(document.querySelector('[data-cd-reading-action]'),null);assert.equal(globalThis.__archives.length,0);await act(async()=>document.dispatchEvent(new window.Event('destinyProfileChanged')));assert.ok(document.querySelector('[data-cd-reading-action]'));}
 await act(async()=>root.unmount());dom.window.close();
});
test('all five new React starts retain historical resumes without new payment or automatic paid receipt',()=>{
 for(const file of ['Crossroads','FutureSim','LifeVoyage']){const s=read('app/destiny-compass/_components/'+file+'.tsx');assert.ok(!s.includes('ensurePaidAccess('));assert.ok(s.includes('await hasFreeReadingSession()'));assert.ok(s.includes('if (!request.valid()) return;'));assert.ok(s.includes('if (!')&&s.includes('!paid'));assert.ok(s.includes('saveCompassArchive('));}
 const compass=read('app/destiny-compass/_components/CompassApp.tsx');for(const key of ['crossroads','future-sim','life-voyage','deep-report'])assert.ok(compass.includes('usePaidResume("destiny-compass-'+key+'"'));
 for(const p of ['app/saju/destiny-bias/DestinyBiasClient.tsx','app/today/TodayHubClient.tsx']){const s=read(p);assert.ok(!s.includes('ensurePaidAccess('));assert.ok(s.includes('usePaidResume('));assert.ok(s.includes('await hasFreeReadingSession()'));assert.ok(s.includes('useReadingIdentityReset('));}
 assert.ok(read('app/destiny-compass/_components/CompassReport.tsx').includes('destiny-compass-deep-report'));assert.ok(read('app/today/TodayHubClient.tsx').includes('DEEPER_LINKS'));
});
