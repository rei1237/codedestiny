import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
import {yeongnyangiSpreads} from '../../lib/tarot/yeongnyangi-spread-catalog.mjs';
const compiled=await build({stdin:{contents:`
 import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
 import Planner,{emptyTarotPlan,plannedSpread} from './app/yeongnyangi/_components/tarot/TarotSpreadPlanner';
 import Pick from './app/yeongnyangi/_components/tarot/TarotCardPick';
 import {TarotSpreadResult} from './app/yeongnyangi/_components/tarot/TarotSpreadReveal';
 export {tarotSpreadCopyFor} from './app/yeongnyangi/_lib/tarot-spread-locales';
 export {localizedTarotSpread} from './app/yeongnyangi/_lib/tarot-spread-catalog-locales';
 export {tarotPlanCopy,localizedTarotRecommendation} from './app/yeongnyangi/_lib/tarot-plan-locales';
 export const render=(locale,spread,mode)=>{
  const stored={...spread,deckSize:78,drawn:false,inputs:{period:'month'}};
  const cards=Object.fromEntries(spread.positions.map(p=>[p.id,{cardCode:'M00',reversed:false}]));
  const element=mode==='pick'?React.createElement(Pick,{row:{id:'test',locale},spread:stored,siteLocale:locale,onRow:()=>{}}):mode==='result'?React.createElement(TarotSpreadResult,{spread:stored,cards,locale}):React.createElement(Planner,{locale,question:'A or B?',plan:{...emptyTarotPlan,spreadId:spread.id,manual:true},onQuestion:()=>{},onPlan:()=>{},tier:'tuna',onTier:()=>{}});
  return renderToStaticMarkup(element);
 };
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/spread-locales-test.cjs');"},plugins:[{name:'render-fixtures',setup(b){
 b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
 b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"import React from 'react';export default function Image({priority,fill,...props}){return React.createElement('img',props)}",loader:'js',resolveDir:process.cwd()}));
}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for(const locale of RUNTIME_LOCALES)test(`${locale}: every spread keeps its saved geometry and renders native order, pick and reread screens`,()=>{
 const before=JSON.stringify(yeongnyangiSpreads),copy=m.tarotSpreadCopyFor(locale),plan=m.tarotPlanCopy(locale);
 assert.equal(plan.presets.length,9);
 for(const value of Object.values(copy)){
  const text=typeof value==='function'?value('Sample',7):value;
  assert.ok(text.trim());assert.doesNotMatch(text,/undefined|\{\w+\}/);
  if(locale!=='ko')assert.doesNotMatch(text,/[가-힣]/u);
 }
 for(const spread of yeongnyangiSpreads){
  const view=m.localizedTarotSpread(spread,locale);
  assert.equal(view.id,spread.id);assert.equal(view.version,spread.version);assert.deepEqual(view.layout,spread.layout);
  assert.deepEqual(view.positions.map(({label,question,...p})=>p),spread.positions.map(({label,question,...p})=>p));
  for(const mode of ['pick','result']){
   const html=m.render(locale,spread,mode);
   assert.ok(html.includes(`lang="${locale}"`));
   if(locale!=='ko')assert.doesNotMatch(html,/[가-힣]/u,`${locale}/${spread.id}/${mode}`);
  }
 }
 const planner=m.render(locale,yeongnyangiSpreads[0],'planner');
 if(locale!=='ko')assert.doesNotMatch(planner,/[가-힣]/u,`${locale}/planner`);
 assert.equal(JSON.stringify(yeongnyangiSpreads),before,'display localization must not mutate saved evidence');
 for(const preset of plan.presets){
  const explicit=m.localizedTarotRecommendation({presetId:preset.id,question:preset.question,tier:'tuna'},locale);
  assert.ok(explicit.primary);
 }
});
test('foreign free-text recommendation cues stay outside the submitted question and respect direct inputs',()=>{
 for(const locale of RUNTIME_LOCALES.filter(l=>l!=='ko')){
  const plan=m.tarotPlanCopy(locale);
  const question=plan.presets.find(p=>p.id==='job_change').question;
  const input={question,tier:'tuna'};
  assert.equal(m.localizedTarotRecommendation(input,locale).primary,'yn_stay_leave_nine',locale);
  assert.equal(input.question,question);
  assert.equal(m.localizedTarotRecommendation({question:'A vs B',options:{a:'Stay',b:'Leave'},tier:'tuna'},locale).primary,'yn_ab_seven');
 }
});
