import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import ReadingBook from './app/yeongnyangi/_components/ReadingBook';export const render=row=>renderToStaticMarkup(React.createElement(ReadingBook,{row}));import ReadingLoading from './app/yeongnyangi/_components/ReadingLoading';export const renderLoading=props=>renderToStaticMarkup(React.createElement(ReadingLoading,props));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/reading-focus-test.cjs');"},plugins:[{name:'styles',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));b.onResolve({filter:/^next\/image$/},()=>({path:'next-image',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"import React from 'react';export default function Image({unoptimized,fetchPriority,...props}){return React.createElement('img',{...props,fetchpriority:fetchPriority})}",loader:'js',resolveDir:process.cwd()}));}}]});
const {render,renderLoading}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const question={id:'q1',text:'MY ORIGINAL QUESTION'};
const answer={questionId:'q1',answer:'SAVED ANSWER',reason:'SAVED REASON',timing:'SAVED TIMING',action:'SAVED ACTION'};
const fixture=()=>({product:{readingKind:'single'},id:'a'.repeat(64),locale:'ko',state:'COMPLETED',paid:true,manifest:[{id:'first',title:'첫 해석',ordinal:0,theme:'self'}],consultation:{questions:[question],question:question.text},chapters:[{summary:'SAVED SUMMARY',advice:'SAVED ADVICE',analysis:['SAVED DETAIL'],example:'SAVED EXAMPLE',persona:'SAVED PERSONA',highlights:['SAVED HIGHLIGHT'],questionAnswers:[answer]}],charts:[]});
const count=(html,text)=>html.split(text).length-1;
test('the first saved answer leads once while every owned answer field remains readable and immutable',()=>{
 const row=fixture();const before=JSON.stringify(row);const html=render(row);
 for(const text of [question.text,...Object.values(answer).slice(1),'SAVED SUMMARY','SAVED ADVICE','SAVED DETAIL','SAVED EXAMPLE','SAVED PERSONA','SAVED HIGHLIGHT'])assert.equal(count(html,text),1,text);
 assert.ok(html.indexOf('SAVED ANSWER')<html.indexOf('<nav'));
 assert.ok(html.indexOf('SAVED ACTION')<html.indexOf('<article'));
 assert.equal(JSON.stringify(row),before);
});
test('limited and care answers keep their existing safety guidance next to the leading answer',()=>{
 for(const mode of ['limited','care']){const row=fixture();row.chapters[0].questionAnswers=[{...answer,mode}];const html=render(row);assert.match(html,new RegExp(`data-mode="${mode}" role="note"`));assert.equal(count(html,'SAVED ANSWER'),1);}
});
test('legacy readings without structured answers retain one summary, advice, highlights and all detailed paragraphs',()=>{
 const row=fixture();delete row.chapters[0].questionAnswers;row.consultation={};row.state='FORTUNE_FAILED';row.errorCode='GENERATION_REVIEW_REQUIRED';const html=render(row);
 for(const text of ['SAVED SUMMARY','SAVED ADVICE','SAVED DETAIL','SAVED EXAMPLE','SAVED PERSONA','SAVED HIGHLIGHT'])assert.equal(count(html,text),1,text);
 assert.doesNotMatch(html,/data-mode=/);
});
test('additional questions keep their independent answers in the detailed chapter',()=>{
 const row=fixture();row.consultation.questions.push({id:'q2',text:'SECOND QUESTION'});row.chapters[0].questionAnswers.push({...answer,questionId:'q2',answer:'SECOND ANSWER'});const html=render(row);
 assert.equal(count(html,'SAVED ANSWER'),1);assert.equal(count(html,'SECOND ANSWER'),1);assert.ok(html.indexOf('SECOND ANSWER')>html.indexOf('<article'));
});
// 영냥이 기다리는 화면: 장 수는 서버가 돌려준 manifest·chapters 로만, 경과 시간은 알림 영역 밖에, 퍼센트는 없다.
const live=html=>html.match(/<div role="status" aria-live="polite"[^>]*>([\s\S]*?)<\/div>/)[1];
const manifest=['첫 장','둘째 장','셋째 장'].map((title,ordinal)=>({id:`c${ordinal}`,title,ordinal,part:'p',theme:'self'}));
test('waiting screen shows elapsed time outside the live region only when the result poll asks for it',()=>{
 const html=renderLoading({stage:'generating',saved:1,total:3,manifest,locale:'ko',timing:true});
 assert.match(html,/기다린 시간 <time[^>]*>0:00<\/time>/);assert.doesNotMatch(live(html),/0:00/);
 assert.doesNotMatch(renderLoading({stage:'generating',locale:'ko'}),/<time/);
});
test('waiting screen counts chapters only from the returned manifest and chapters',()=>{
 const html=renderLoading({stage:'generating',saved:1,total:3,manifest,locale:'ko',timing:true});
 assert.match(live(html),/2번째 장 쓰는 중 · 전체 3장/);assert.match(live(html),/둘째 장/);assert.match(html,/data-reading-count="determinate"/);
 assert.doesNotMatch(live(renderLoading({stage:'generating',saved:1,total:3,locale:'ko'})),/둘째 장/);
 const none=renderLoading({stage:'generating',locale:'ko',timing:true});
 assert.match(none,/data-reading-count="indeterminate"/);assert.doesNotMatch(live(none),/번째 장|\d+\s*\/\s*\d+/);
});
test('waiting screen never invents a percentage',()=>{
 for(const props of [{saved:0,total:3},{saved:2,total:3},{}])assert.doesNotMatch(renderLoading({stage:'generating',locale:'ko',manifest,timing:true,...props}),/\d\s*%/);
});
test('waiting screen tells the reader in 영냥이 반말 that closing the window is safe',()=>{
 assert.match(renderLoading({stage:'generating',saved:1,total:3,locale:'ko',timing:true}),/창을 닫아도 괜찮아\. 남은 장은 서버가 이어서 써\./);
 assert.doesNotMatch(renderLoading({stage:'verifying',saved:3,total:3,locale:'ko',timing:true}),/창을 닫아도/);
});
