import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {extractOmikujiEngine} from '../service/omikuji-engine-loader.mjs';

const root=path.resolve(import.meta.dirname,'../../..');
const html=await readFile(path.join(root,'public/emoi_omikuji_v2.html'),'utf8');
const source=extractOmikujiEngine(html);
const engine=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const require=createRequire(new URL('../package.json',import.meta.url));
const Module=require('node:module'),React=require('react'),{createRoot}=require('react-dom/client'),{Simulate}=require('react-dom/test-utils');
const sdk=`export class SetClipboardTextPermissionError extends Error{};export const Clipboard={setText:Object.assign(async text=>{if(await globalThis.__omikuji.copy(text)==='denied')throw new SetClipboardTextPermissionError();},{openPermissionDialog:async()=>globalThis.__omikuji.permission()})};export const Share={createLink:async input=>globalThis.__omikuji.link(input),sendMessage:async input=>globalThis.__omikuji.share(input)};`;
const bundle=await build({entryPoints:[path.join(root,'apps/toss/service/TossOmikuji.jsx')],bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react/jsx-runtime'],plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/^virtual:omikuji-engine$/},()=>({path:'engine',namespace:'fixture'}));b.onResolve({filter:/^@apps-in-toss\/web-framework$/},()=>({path:'sdk',namespace:'fixture'}));b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='engine'?source:args.path==='sdk'?sdk:'',loader:'js'}));}}]});
const loaded=new Module(path.join(root,'omikuji-fixture.cjs'));loaded.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);const Component=loaded.exports.default;

test('canonical engine is deterministic and rejects unexpected DOM access or changed boundaries',()=>{
 const input={question:'이 관계를 어떻게 이어갈까요?',category:'연애',emotion:'불안',tone:'따뜻하게',emojiTheme:'벚꽃',reroll:0};
 assert.deepEqual(engine.generateEmojiOmikujiResult(input),engine.generateEmojiOmikujiResult(input));
 assert.ok(engine.generateEmojiOmikujiResult(input).sectionCards.length>0);
 assert.throws(()=>extractOmikujiEngine(html.replace('    function formatDateLabel()', '    function changedBoundary()')));
 assert.throws(()=>extractOmikujiEngine(html.replace('    const STOPWORDS =','    document.body;\n    const STOPWORDS =').replace('    const CATEGORY_ALIASES =','    document.body;\n    const CATEGORY_ALIASES =')));
});

async function fixture(scope='user:first'){
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/omikuji/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.IS_REACT_ACT_ENVIRONMENT=true;dom.window.scrollTo=()=>{};
 const calls=[];globalThis.__omikuji={copy:async value=>calls.push(['copy',value]),permission:async()=>{},link:async value=>{calls.push(['link',value]);return 'https://toss.test/link';},share:async value=>calls.push(['share',value])};
 const rootNode=createRoot(document.getElementById('root'));
 const render=async value=>React.act(async()=>rootNode.render(React.createElement(Component,{key:value,scope:value})));
 const unmount=async()=>React.act(async()=>rootNode.render(null));
 const click=async text=>{const node=[...document.querySelectorAll('button')].find(item=>item.textContent===text);assert.ok(node,'missing button '+text);await React.act(async()=>node.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
 const question=async value=>{const node=document.querySelector('textarea');await React.act(async()=>Simulate.change(node,{target:{value}}));};
 await render(scope);
 return {dom,calls,render,unmount,click,question,close:async()=>{await React.act(async()=>rootNode.unmount());dom.window.close();delete globalThis.__omikuji;delete globalThis.sessionStorage;}};
}

test('direct entry, form, local result, native back, reentry and account isolation',async()=>{
 const ctx=await fixture();try{
  await ctx.click('마음 고르고 제비 뽑기');assert.equal([...document.querySelectorAll('button')].some(item=>item.textContent==='뒤로'),false);await ctx.click('제비통 흔들어 뽑기');assert.match(document.body.textContent,/질문을 적어 주세요/);
  await ctx.question('오늘의 마음은 어떤가요?');await ctx.click('제비통 흔들어 뽑기');assert.match(document.body.textContent,/오늘의 마음은 어떤가요/);assert.doesNotMatch(document.body.textContent,/AI 텍스트 이모지/);
  const back=new ctx.dom.window.Event('code-destiny:toss-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(back));assert.equal(back.defaultPrevented,true);assert.equal(document.querySelector('textarea').value,'오늘의 마음은 어떤가요?');
  await ctx.unmount();await ctx.render('user:first');assert.match(document.body.textContent,/오늘의 마음은 어떤가요/);
  await ctx.render('user:second');assert.doesNotMatch(document.body.textContent,/오늘의 마음은 어떤가요/);assert.match(document.body.textContent,/마음 고르고 제비 뽑기/);await ctx.render('user:first');assert.match(document.body.textContent,/오늘의 마음은 어떤가요/);
 }finally{await ctx.close();}
});

test('copy and native share use explicit actions and a Toss deep link without the question',async()=>{
 const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('나의 사적인 질문');await ctx.click('제비통 흔들어 뽑기');await ctx.click('부적 설명 복사하기');await ctx.click('결과 공유하기');
  assert.equal(ctx.calls[0][0],'copy');assert.deepEqual(ctx.calls[1],['link',{path:'intoss://ai-saju-studio/omikuji/'}]);assert.match(ctx.calls[2][1].message,/https:\/\/toss\.test\/link/);assert.doesNotMatch(ctx.calls[2][1].message,/나의 사적인 질문/);
 }finally{await ctx.close();}
});

test('permission denial is distinct and denied dialog keeps the recovery action',async()=>{
 const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('고민');await ctx.click('제비통 흔들어 뽑기');globalThis.__omikuji.copy=async()=>'denied';globalThis.__omikuji.permission=async()=>'denied';await ctx.click('결과 복사하기');assert.match(document.body.textContent,/클립보드 쓰기 권한/);await ctx.click('클립보드 권한 확인하기');assert.match(document.body.textContent,/권한이 없어 복사할 수 없어요/);assert.ok([...document.querySelectorAll('button')].some(item=>item.textContent==='클립보드 권한 확인하기'));
 }finally{await ctx.close();}
});

test('a late share-link response cannot share the previous account result',async()=>{
 const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('고민');await ctx.click('제비통 흔들어 뽑기');let finish;globalThis.__omikuji.link=()=>new Promise(resolve=>{finish=resolve;});await ctx.click('결과 공유하기');await ctx.render('user:second');await React.act(async()=>finish('https://toss.test/late'));assert.equal(ctx.calls.some(item=>item[0]==='share'),false);
 }finally{await ctx.close();}
});

test('reroll is saved and storage failure is visible without losing the current result',async()=>{
 const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('고민');await ctx.click('제비통 흔들어 뽑기');await ctx.click('다시 뽑기');assert.equal(JSON.parse(sessionStorage.getItem('toss:omikuji-session:v1:'+encodeURIComponent('user:first'))).input.reroll,1);
  const prototype=Object.getPrototypeOf(sessionStorage),original=prototype.setItem;prototype.setItem=()=>{throw new Error('storage unavailable');};try{await ctx.click('다시 뽑기');assert.match(document.body.textContent,/결과를 저장하지 못했어요/);assert.match(document.body.textContent,/고민/);}finally{prototype.setItem=original;}
 }finally{await ctx.close();}
});

test('a guest cannot restore or erase an account result and is told the result is temporary',async()=>{
 const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('첫 계정의 질문');await ctx.click('제비통 흔들어 뽑기');await ctx.render('guest');assert.doesNotMatch(document.body.textContent,/첫 계정의 질문/);await ctx.click('마음 고르고 제비 뽑기');await ctx.question('비회원 질문');await ctx.click('제비통 흔들어 뽑기');assert.match(document.body.textContent,/화면을 닫으면 결과가 사라져요/);await ctx.unmount();await ctx.render('guest');assert.doesNotMatch(document.body.textContent,/비회원 질문/);await ctx.render('user:first');assert.match(document.body.textContent,/첫 계정의 질문/);
 }finally{await ctx.close();}
});

test('duplicate share clicks issue one bridge request and back cancels a late share sheet',async()=>{const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('고민');await ctx.click('제비통 흔들어 뽑기');let finish,count=0;globalThis.__omikuji.link=()=>{count++;return new Promise(resolve=>{finish=resolve;});};const button=[...document.querySelectorAll('button')].find(item=>item.textContent==='결과 공유하기');await React.act(async()=>{button.click();button.click();});assert.equal(count,1);assert.equal(button.disabled,true);const event=new ctx.dom.window.Event('code-destiny:toss-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(event));assert.equal(event.defaultPrevented,true);await React.act(async()=>finish('https://toss.test/late'));assert.equal(ctx.calls.some(item=>item[0]==='share'),false);assert.ok(document.querySelector('textarea'));}finally{await ctx.close();}});
test('structured permission and version errors remain distinct from generic bridge failures',async()=>{const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('고민');await ctx.click('제비통 흔들어 뽑기');globalThis.__omikuji.copy=async()=>{throw {status:403};};await ctx.click('결과 복사하기');assert.match(document.body.textContent,/클립보드 쓰기 권한/);globalThis.__omikuji.link=async()=>{throw {code:'UNSUPPORTED_APP_VERSION'};};await ctx.click('결과 공유하기');assert.match(document.body.textContent,/토스 앱을 업데이트/);}finally{await ctx.close();}});
test('duplicate copy clicks issue one clipboard call',async()=>{const ctx=await fixture();try{await ctx.click('마음 고르고 제비 뽑기');await ctx.question('고민');await ctx.click('제비통 흔들어 뽑기');let finish,count=0;globalThis.__omikuji.copy=()=>{count++;return new Promise(resolve=>{finish=resolve;});};const button=[...document.querySelectorAll('button')].find(item=>item.textContent==='결과 복사하기');await React.act(async()=>{button.click();button.click();});assert.equal(count,1);assert.equal(button.disabled,true);await React.act(async()=>finish());assert.match(document.body.textContent,/복사했어요/);}finally{await ctx.close();}});
