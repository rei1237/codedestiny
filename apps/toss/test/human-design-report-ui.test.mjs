import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import path from 'node:path';import {createRequire} from 'node:module';
import {privateHumanDesign} from '../private-simulation/human-design.mjs';import {reportContents} from '../../../lib/human-design/report-sections.js';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),repo=path.resolve(import.meta.dirname,'../../..');
const dom=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true,url:'https://mock.invalid/human-design/report/?intentId='+ 'd'.repeat(64)});
for(const key of ['window','document','location','localStorage','navigator'])Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{createRoot}=require('react-dom/client');globalThis.__hdUi={owner:'A',calls:[],result:null};
const bundle=await build({entryPoints:[path.join(repo,'apps/toss/service/TossHumanDesignReport.tsx')],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',alias:{'@':repo},external:['react','react/jsx-runtime'],plugins:[{name:'hd-ui-boundaries',setup(b){
 b.onResolve({filter:/^(?:@\/app\/_lib\/auth-store|\.\.\/src\/platform|\.\/TossTeaPrice|\.\/TossAstrologyProfilePicker|\.\/native-report-checkout|\.\.\/src\/media)$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.includes('auth-store')?'const s=globalThis.__hdUi;export const getAuthState=()=>({user:s.owner?{id:s.owner}:null}),useAuthStore=()=>({isAuthenticated:Boolean(s.owner)});':a.path.endsWith('/media')?'export const saveReportPdf=async()=>{};':a.path.endsWith('/platform')?'export const paymentRequiresReview=()=>false;export const api=async(path,body)=>{globalThis.__hdUi.calls.push({path,body});return typeof globalThis.__hdUi.result==="function"?globalThis.__hdUi.result(path,body):globalThis.__hdUi.result;};':a.path.includes('checkout')?'export const checkoutReport=async()=>{throw Error("unexpected checkout");};':'export default ()=>null;'}));
 b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
}}]});
const loaded=new Module(path.join(repo,'apps/toss/hd-report-ui.cjs'));loaded.paths=Module._nodeModulePaths(path.join(repo,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const Screen=loaded.exports.default;
const {chart}=await (await privateHumanDesign({birthDate:'1990-01-01',birthTime:'08:35',timezone:'Asia/Seoul'})).json();
const result={chart,reportId:'saved',locale:'ko',status:'completed',progress:{completed:18,total:18},sections:reportContents('ko').map(item=>({...item,body:'[모의] 저장한 원문',subsections:[],keyPoints:[],evidence:[]}))};
test('premium uses original 18-chapter renderer and never generates again for a completed result',async()=>{
 globalThis.__hdUi.result=result;const root=createRoot(document.getElementById('root'));
 try{await React.act(async()=>root.render(React.createElement(Screen)));assert.equal(document.querySelectorAll('section[id^=hd-ch-]').length,18);assert.equal(globalThis.__hdUi.calls.length,1);assert.equal(globalThis.__hdUi.calls[0].body,undefined);assert.ok(document.body.textContent.includes('[모의] 저장한 원문'));
 globalThis.__hdUi.owner='';await React.act(async()=>root.render(React.createElement(Screen)));assert.equal(document.querySelectorAll('section[id^=hd-ch-]').length,0);assert.match(document.body.textContent,/토스로 로그인하기/);
 }finally{await React.act(()=>root.unmount());}
});

test('explicit continuation posts once after initial partial GET and then preserves completed reread',async()=>{
 const state=globalThis.__hdUi;state.owner='A';state.calls=[];state.result=(_path,body)=>body===undefined?{...result,status:'partial',sections:result.sections.slice(0,2)}:result;
 const root=createRoot(document.getElementById('root'));
 try{await React.act(async()=>root.render(React.createElement(Screen)));assert.equal(state.calls.length,1);assert.equal(state.calls[0].body,undefined);
  await React.act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='저장한 리포트 이어서 열기').click());
  assert.equal(state.calls.length,2);assert.deepEqual(state.calls[1].body,{});assert.equal(document.querySelectorAll('section[id^=hd-ch-]').length,18);
 }finally{await React.act(()=>root.unmount());}
});
for(const code of ['GENERATION_ALREADY_FAILED','REPORT_UNDELIVERABLE','ORDER_REFUNDED'])test(`terminal ${code} does not offer a new generation`,async()=>{
 const state=globalThis.__hdUi;state.owner='A';state.calls=[];state.result=()=>{throw {code};};const root=createRoot(document.getElementById('root'));
 try{await React.act(async()=>root.render(React.createElement(Screen)));assert.equal(state.calls.length,1);assert.equal([...document.querySelectorAll('button')].some(button=>button.textContent==='저장한 리포트 이어서 열기'),false);assert.equal(document.querySelectorAll('section[id^=hd-ch-]').length,0);}
 finally{await React.act(()=>root.unmount());}
});
