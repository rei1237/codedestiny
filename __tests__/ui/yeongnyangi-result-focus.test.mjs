import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import ReadingBook from './app/yeongnyangi/_components/ReadingBook';export const render=row=>renderToStaticMarkup(React.createElement(ReadingBook,{row}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/reading-focus-test.cjs');"},plugins:[{name:'styles',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
const {render}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const question={id:'q1',text:'MY ORIGINAL QUESTION'};
const answer={questionId:'q1',answer:'SAVED ANSWER',reason:'SAVED REASON',timing:'SAVED TIMING',action:'SAVED ACTION'};
const fixture=()=>({id:'a'.repeat(64),locale:'ko',state:'COMPLETED',paid:true,manifest:[{id:'first',title:'첫 해석',ordinal:0,theme:'self'}],consultation:{questions:[question],question:question.text},chapters:[{summary:'SAVED SUMMARY',advice:'SAVED ADVICE',analysis:['SAVED DETAIL'],example:'SAVED EXAMPLE',persona:'SAVED PERSONA',highlights:['SAVED HIGHLIGHT'],questionAnswers:[answer]}],charts:[]});
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
