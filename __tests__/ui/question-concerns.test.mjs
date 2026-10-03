import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),Module=require('node:module');
const compiled=await build({stdin:{contents:"export * from './lib/fortune/question-journey';export {default as QuestionJourney} from './app/components/QuestionJourney';",resolveDir:process.cwd(),loader:'tsx'},jsx:'automatic',bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom'],plugins:[{name:'ui-mocks',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default new Proxy({},{get:(_,k)=>k})',loader:'js'}));b.onLoad({filter:/lib[\\/]analytics\.ts$/},()=>({contents:'export const trackEvent=(...args)=>globalThis.__events.push(args)',loader:'js'}));}}]});
const loaded=new Module(path.resolve('concerns-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(compiled.outputFiles[0].text,loaded.id);const m=loaded.exports;
test('102 unique concerns keep legacy identifiers, valid catalog contracts and searchable categories',()=>{
 assert.equal(m.concernGuides.length,102);assert.equal(new Set(m.concernGuides.map(q=>q.id)).size,102);assert.equal(new Set(m.concernGuides.map(q=>q.question)).size,102);
 // 2026-10-02 질문 우선: 대표 질문 8개는 꿀꿀 홈 질문 타일과 같은 카테고리·순서다.
 assert.deepEqual(m.questionGuides.map(q=>q.group),['사랑','재회','결혼','돈','일','미래','나 자신','인간관계']);assert.equal(m.concernGroups.length,10);
 for(const id of ['mind','reconnect','partner','money','career','ahead','choice','distance','money-ziwei','career-astrology','career-vedic'])assert.ok(m.getQuestionGuide(id));
 for(const q of m.concernGuides){assert.ok(m.questionOffer(q).chapters.length);assert.equal(m.getQuestionGuide(q.id),q);const params=new URL(m.questionCheckoutHref(q),'https://example.test').searchParams;assert.equal(params.get('questionId'),q.id);assert.equal(params.get('product'),q.productId);}
 assert.equal(m.filterConcerns('').length,102);assert.equal(m.filterConcerns('없는검색어xyz').length,0);assert.ok(m.filterConcerns('이직').length>0);assert.equal(m.concernGroups.reduce((n,g)=>n+m.filterConcerns('',g).length,0),102);
 for(const q of m.concernGuides.slice(m.questionGuides.length))assert.equal(m.questionOffer(q).kind.question,true);
});
test('search, empty state, categories, pagination and selected consultation work without logging search text',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test/yeongnyangi/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__events=[];
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(m.QuestionJourney)));
 const click=async el=>act(async()=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
 assert.equal(document.querySelectorAll('.results button').length,12);
 await click(document.querySelector('.more'));assert.equal(document.querySelectorAll('.results button').length,24);
 const search=document.querySelector('input');
 async function type(value){await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(search,value);search.dispatchEvent(new window.Event('input',{bubbles:true}));});}
 await type('없는검색어xyz');assert.equal(document.querySelectorAll('.results button').length,0);assert.match(document.body.textContent,/검색어를 줄이거나/);
 await type('이직');assert.ok(document.querySelectorAll('.results button').length>0);
 await type('');const select=document.querySelector('select');await act(async()=>{select.value='일상·균형';select.dispatchEvent(new window.Event('change',{bubbles:true}));});assert.equal(document.querySelectorAll('.results button').length,9);
 await click(document.querySelector('.results button'));assert.equal(document.querySelectorAll('.results button[aria-pressed=true]').length,1);assert.match(document.querySelector('#question-reading').textContent,/하루가 바쁜데/);assert.match(document.querySelector('#question-reading a').href,/questionId=daily-01/);
 assert.ok(!JSON.stringify(globalThis.__events).includes('없는검색어xyz'));assert.ok(!JSON.stringify(globalThis.__events).includes('하루가 바쁜데'));
 await act(async()=>root.unmount());dom.window.close();
});
