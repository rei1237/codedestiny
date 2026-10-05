import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
const compiled=await build({stdin:{contents:`
 import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
 import Journey from './app/yeongnyangi/_components/RelationshipJourney';
 export {relationshipCopyFor} from './app/yeongnyangi/_lib/relationship-locales';
 export {relationshipMethodCopy} from './app/yeongnyangi/_lib/relationship-method-copy';
 export {chartTerm} from './app/yeongnyangi/_lib/reading-chart-copy';
 export {tarotConsultations,tarotConsultationSpread} from './worker/yeongnyangi/fortune/tarot/consultation-contract';
 export const render=(locale,stage)=>renderToStaticMarkup(React.createElement(Journey,{locale,stage,setStage:()=>{},questionId:'feelings',onQuestion:()=>{},participants:{self:'Alex',partner:'Sam'},onParticipants:()=>{},profileState:{profiles:[],profileId:'',guest:true,loading:false,error:'',select:()=>{},refresh:async()=>{}},partnerId:'',onPartner:()=>{},onEngine:()=>{}}));
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',
 banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/relationship-test.cjs');"},
 plugins:[{name:'render-fixtures',setup(b){
  b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
  b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"import React from 'react';export default function Image({priority,fill,...props}){return React.createElement('img',props)}",loader:'js',resolveDir:process.cwd()}));
 }}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for(const locale of RUNTIME_LOCALES){
 test(`${locale}: relationship questions, people and methods render in the selected language`,()=>{
  const copy=m.relationshipCopyFor(locale),method=m.relationshipMethodCopy(locale);
  assert.equal(method.questions.length,6);
  assert.equal(Object.keys(method.advice).length,6);
  for(const stage of ['question','people','engine']){
   const html=m.render(locale,stage);
   assert.ok(html.includes(`lang="${locale}"`));
   if(locale!=='ko')assert.doesNotMatch(html,/[가-힣]/u,`${locale}/${stage}`);
  }
  for(const value of Object.values(copy))assert.ok(Array.isArray(value)?value.length===3:typeof value==='string'&&value.trim());
  for(const kind of Object.keys(m.tarotConsultations))for(const position of m.tarotConsultationSpread(kind).positions){
   const label=m.chartTerm(position.label,locale);
   assert.ok(label.trim());
   if(locale!=='ko')assert.doesNotMatch(label,/[가-힣]/u,`${locale}/${kind}/${position.key}`);
   else assert.equal(label,position.label);
  }
 });
}
