import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`export {default as Location} from './app/components/CurrentLocationButton';export {default as Continuation} from './app/components/FreePromptContinuation';export {withContinuation} from './lib/fortune/prompt-continuation';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react/jsx-runtime']});
const loaded=new Module(path.resolve('location-ui-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const api=loaded.exports,React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
async function surface(Component,props,geolocation){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
 Object.defineProperty(navigator,'geolocation',{value:geolocation,configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Component,props)));
 return {click:async(text)=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));assert.ok(button,text);await act(async()=>{button.click();await new Promise(resolve=>setTimeout(resolve,0));});},close:async()=>{await act(async()=>root.unmount());dom.window.close();}};
}
test('geolocation asks only on click and applies only after birthplace confirmation',async()=>{
 let calls=0,applied=null,network=0;
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{network++;assert.equal(url,'/api/yeongnyangi/location');assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).source,'geolocation');return {ok:true,json:async()=>({location:{name:'동의한 현재 위치',latitude:37.5,longitude:127,timezone:'Asia/Seoul',accuracy:20,source:'geolocation'}})};};
 const view=await surface(api.Location,{onLocation:value=>{applied=value;}},{getCurrentPosition:resolve=>{calls++;resolve({coords:{latitude:37.5,longitude:127,accuracy:20}});}});
 try{
  assert.equal(calls,0);await view.click('현재 위치 가져오기');assert.equal(calls,1);assert.equal(network,1);assert.equal(applied,null);
  assert.match(document.body.textContent,/태어난 장소와 같은/);await view.click('출생 장소가 맞아요');assert.equal(applied.timezone,'Asia/Seoul');
 }finally{await view.close();globalThis.fetch=originalFetch;}
});
test('denial and timeout preserve existing value and offer city entry',async()=>{
 for(const code of [1,3]){
  let applied=false;
  const view=await surface(api.Location,{onLocation:()=>{applied=true;},purpose:'question'},{getCurrentPosition:(_,reject)=>reject({code})});
  try{await view.click('현재 위치 가져오기');assert.equal(applied,false);assert.match(document.querySelector('[role="alert"]').textContent,/도시/);}finally{await view.close();}
 }
});
test('all free exports retain facts, copy continuation and handle clipboard denial',async()=>{
 const prompt='[확정 계산 데이터] Moon 15°; 사용자 질문: 이직 선택';let copied='';
 const view=await surface(api.Continuation,{prompt});
 Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{copied=value;}},configurable:true});
 try{
  await view.click('상담 프롬프트 복사하기');assert.ok(copied.startsWith(prompt));assert.match(copied,/후속 질문/);assert.equal(api.withContinuation(copied),copied);
  const links=[...document.querySelectorAll('a')];assert.equal(links.length,2);assert.ok(links.every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&!a.search));
  navigator.clipboard.writeText=async()=>{throw new Error('denied');};await view.click('복사했어요');assert.match(document.querySelector('[role="alert"]').textContent,/직접 선택/);assert.equal(document.querySelector('details').open,true);
 }finally{await view.close();}
});
