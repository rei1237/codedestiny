import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),Module=require('node:module');
const compiled=await build({stdin:{contents:"export * from './lib/fortune/question-journey';export * from './lib/fortune/question-entry';export {default as QuestionJourney} from './app/components/QuestionJourney';",resolveDir:process.cwd(),loader:'tsx'},jsx:'automatic',bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom'],plugins:[{name:'ui-mocks',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default new Proxy({},{get:(_,k)=>k})',loader:'js'}));b.onLoad({filter:/lib[\\/]analytics\.ts$/},()=>({contents:'export const trackEvent=(...args)=>globalThis.__events.push(args)',loader:'js'}));}}]});
const loaded=new Module(path.resolve('concerns-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(compiled.outputFiles[0].text,loaded.id);const m=loaded.exports;
test('103 unique concerns keep legacy identifiers, valid catalog contracts and searchable categories',()=>{
 assert.equal(m.concernGuides.length,103);assert.equal(new Set(m.concernGuides.map(q=>q.id)).size,103);assert.equal(new Set(m.concernGuides.map(q=>q.question)).size,103);
 // 2026-10-02 질문 우선: 대표 질문 8개는 꿀꿀 홈 질문 타일과 같은 카테고리·순서다.
 assert.deepEqual(m.questionGuides.map(q=>q.group),['사랑','재회','결혼','돈','일','미래','나 자신','인간관계']);assert.equal(m.concernGroups.length,10);
 for(const id of ['mind','reconnect','partner','money','career','ahead','choice','distance','money-ziwei','career-astrology','career-vedic'])assert.ok(m.getQuestionGuide(id));
 for(const q of m.concernGuides){assert.ok(m.questionOffer(q).chapters.length);assert.equal(m.getQuestionGuide(q.id),q);const params=new URL(m.questionCheckoutHref(q),'https://example.test').searchParams;assert.equal(params.get('questionId'),q.id);assert.equal(params.get('flow'),'question');assert.equal(params.get('domain'),m.questionOffer(q).product.domain);assert.equal(params.has('consultationKind'),false);}
 assert.equal(m.filterConcerns('').length,103);assert.equal(m.filterConcerns('없는검색어xyz').length,0);assert.ok(m.filterConcerns('이직').length>0);assert.equal(m.concernGroups.reduce((n,g)=>n+m.filterConcerns('',g).length,0),103);
 for(const q of m.concernGuides.filter(q=>q.id!=='marriage-compatibility').slice(m.questionGuides.length))assert.equal(m.questionOffer(q).kind.question,true);
});
test('question entry quotes the scope price and leaves confirmation to the user',()=>{
 for(const [id,fish,price] of [['mind','mackerel',10000],['career','salmon',15000],['money','salmon',15000],['distance','flounder',20000]]){
  const entry=m.questionScopeEntry(m.getQuestionGuide(id));
  assert.equal(entry.product.fishId,fish);assert.equal(entry.product.priceKRW,price);
  assert.equal(entry.decision.confirmed,false);assert.ok(entry.plan.missing.length>0);
 }
 assert.equal(m.anythingConsultationHref,'/yeongnyangi/fortune/');
});

test('direct recommended questions keep the old solo marriage link and use the existing pair intake for the new one',()=>{
 const questions=m.homeRecommendedQuestions;
 assert.deepEqual(questions.map(q=>q.id),['money','marriage-compatibility','career','reconnect']);
 assert.deepEqual(questions.map(q=>q.question),['내가 어떻게 하면 돈을 많이 벌 수 있을까?','그 사람과 나는 결혼할 궁합일까?','이직은 지금 하는 게 좋을까, 조금 더 기다릴까?','그 사람은 다시 연락해올까?']);
 const solo=m.getQuestionGuide('partner');
 assert.equal(solo.question,'오래 함께할 사람은 어떤 사람일까?');
 assert.equal(m.questionScopeEntry(solo).decision.target,'self');
 const pair=m.getQuestionGuide('marriage-compatibility');
 assert.equal(pair,questions[1]);
 assert.ok(m.filterConcerns('결혼할 궁합','결혼·동행').includes(pair));
 assert.equal(m.questionOffer(pair).kind.partner,true);
 for(const domain of [undefined,'saju','ziwei','sukuyo','vedic','astrology','tarot']){
  const {decision,plan,product}=m.questionScopeEntry(pair,domain);
  assert.equal(decision.category,'compatibility');
  assert.equal(decision.target,'pair');
  assert.equal(decision.relationshipType,undefined);
  assert.equal(decision.confirmed,false);
  assert.equal(plan.fish,'flounder');
  assert.ok(plan.missing.some(message=>message.includes('관계 유형')));
  assert.equal(plan.unsupported,undefined);
  assert.equal(product.id,(domain||'saju')+'_flounder');
  const params=new URL(m.questionCheckoutHref(pair,domain),'https://example.test').searchParams;
  assert.deepEqual(Object.fromEntries(params),{flow:'question',domain:domain||'saju',questionId:pair.id});
 }
 assert.equal(m.questionScopeEntry(questions[0]).decision.category,'money');
 assert.equal(m.questionScopeEntry(questions[2]).decision.category,'job_change');
 const reconnect=m.questionScopeEntry(questions[3]);
 assert.equal(reconnect.decision.category,'reunion');
 assert.equal(reconnect.decision.target,'self');
 assert.equal(reconnect.plan.fish,'mackerel');
 assert.equal(reconnect.product.id,'tarot_mackerel');
 assert.deepEqual(Object.fromEntries(new URL(m.questionCheckoutHref(questions[3]),'https://example.test').searchParams),{flow:'question',domain:'tarot',questionId:'reconnect'});
 assert.match(readFileSync('app/yeongnyangi/_components/Consultation.tsx','utf8'),/setQuestion\(entryQuestion.question\);setScopeDraft\(entry.decision\)/);
 assert.match(readFileSync('app/yeongnyangi/_components/QuestionCheckout.tsx','utf8'),/decision.target==='pair'&&<label>두 사람의 관계<select/);
});
test('home question links quote the same recommended product as the question entry',()=>{
 const html=readFileSync('index.html','utf8');
 const links=[...html.matchAll(/<a\b[^>]*href="\/yeongnyangi\/\?question=([^"&#]+)[^"]*"[^>]*data-cd-price-key="([^"]+)"[^>]*>/g)];
 // 2026-10-17 "직관성": 홈의 질문 링크는 걷어냈다. 다시 생기면 질문 입구와 같은 상품을 가리켜야 한다.
 for(const [,id,key] of links)assert.equal(key,m.questionScopeEntry(m.getQuestionGuide(id)).product.cdFeatureKey,id);
});
test('search, empty state, categories, pagination and selected consultation work without logging search text',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test/yeongnyangi/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.__events=[];
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(m.QuestionJourney)));
 const click=async el=>act(async()=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
 assert.equal(document.querySelectorAll('.results button').length,12);
 const visible=[...document.querySelectorAll('.choices button')];
 assert.deepEqual(visible.map(button=>button.querySelector('.questionText > span').textContent),m.homeRecommendedQuestions.map(q=>q.question));
 await click(visible[1]);
 assert.equal(document.querySelector('#question-reading h3').textContent,'그 사람과 나는 결혼할 궁합일까?');
 const pairHref=new URL(document.querySelector('#question-reading a').href);
 assert.deepEqual(Object.fromEntries(pairHref.searchParams),{flow:'question',domain:'saju',questionId:'marriage-compatibility'});
 await click(document.querySelector('.more'));assert.equal(document.querySelectorAll('.results button').length,24);
 const search=document.querySelector('#concern-search');
 async function type(value){await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(search,value);search.dispatchEvent(new window.Event('input',{bubbles:true}));});}
 await type('없는검색어xyz');assert.equal(document.querySelectorAll('.results button').length,0);assert.match(document.body.textContent,/검색어를 줄이거나/);
 await type('이직');assert.ok(document.querySelectorAll('.results button').length>0);
 await type('');const select=document.querySelector('select');await act(async()=>{select.value='일상·균형';select.dispatchEvent(new window.Event('change',{bubbles:true}));});assert.equal(document.querySelectorAll('.results button').length,9);
 await click(document.querySelector('.results button'));assert.equal(document.querySelectorAll('.results button[aria-pressed=true]').length,1);assert.match(document.querySelector('#question-reading').textContent,/하루가 바쁜데/);assert.match(document.querySelector('#question-reading a').href,/questionId=daily-01/);
 assert.ok(!JSON.stringify(globalThis.__events).includes('없는검색어xyz'));assert.ok(!JSON.stringify(globalThis.__events).includes('하루가 바쁜데'));
 await act(async()=>root.unmount());dom.window.close();
});

test('explicit inline system applies to prepared and curated questions without placing typed text in the URL',()=>{
 const dom=new JSDOM('',{url:'https://example.test/yeongnyangi/'});
 globalThis.sessionStorage=dom.window.sessionStorage;
 const question='유지해야 하는 가상의 고민';
 for(const domain of ['saju','ziwei','sukuyo','vedic','astrology','tarot']){
  assert.equal(m.saveQuestionEntry(question,domain),true);
  const url=new URL(m.questionEntryHref(domain),'https://example.test');
  const draft=JSON.parse(dom.window.sessionStorage.getItem(m.CONSULTATION_DRAFT_KEY));
  assert.equal(url.searchParams.get('domain'),domain);assert.equal(url.searchParams.get('flow'),'question');
  assert.deepEqual([...url.searchParams.keys()],['flow','domain']);
  assert.equal(draft.path,url.pathname+url.search);assert.equal(draft.question,question);
  const q=m.getQuestionGuide('reconnect'),entry=m.questionScopeEntry(q,domain);
  assert.equal(entry.product.domain,domain);assert.equal(entry.decision.confirmed,false);
  const href=new URL(m.questionCheckoutHref(q,domain),'https://example.test');
  assert.equal(href.searchParams.get('questionId'),q.id);assert.equal(href.searchParams.get('domain'),domain);
 }
 assert.equal(m.questionEntryHref(),m.QUESTION_ENTRY_HREF);
 assert.equal(m.questionScopeEntry(m.getQuestionGuide('reconnect')).domain,'tarot');
 assert.match(readFileSync('app/yeongnyangi/_components/Consultation.tsx','utf8'),/questionScopeEntry\(entryQuestion,selected.readingKind==='single'&&params.has\('domain'\)\?selected.domain:undefined\)/);
 delete globalThis.sessionStorage;dom.window.close();
});
