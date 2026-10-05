import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {yeongnyangiSpreads} from '../../lib/tarot/yeongnyangi-spread-catalog.mjs';
import {tarotQuestionPresets,recommendTarotSpread,questionFeatures} from '../../lib/tarot/yeongnyangi-spread-recommend.mjs';
import {getYeongnyangiDeckText} from '../../lib/tarot/yeongnyangi-deck-copy.mjs';
const bundle=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/reading-locale';
 export {hasUnsupportedLocalizedClaim as hasLocalizedUnsupportedClaim} from './worker/yeongnyangi/fortune/localized-claims';
 export {validateReadingQuality} from './worker/yeongnyangi/fortune/reading-quality';
 export * from './worker/yeongnyangi/fortune/tarot/reading-vocabulary';
 export {validateTarotChapter,isCrisisQuestion} from './worker/yeongnyangi/fortune/tarot/master-reading';
 export {chartLimitation} from './app/yeongnyangi/_lib/reading-chart-copy';
 export * from './worker/yeongnyangi/fortune/tarot/consultation-contract';
 export * from './app/yeongnyangi/_lib/relationship-copy';
 export {relationshipCopyFor} from './app/yeongnyangi/_lib/relationship-locales';
 export * from './lib/tarot/yeongnyangi-display-locales';
 export * from './app/yeongnyangi/_lib/tarot-spread-locales';

 export {tarotPlanCopy} from './app/yeongnyangi/_lib/tarot-plan-locales';
 export * from './app/yeongnyangi/_lib/consultation-kind-copy';
 import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
 import Relationship from './app/yeongnyangi/_components/RelationshipJourney';
 import Planner,{emptyTarotPlan} from './app/yeongnyangi/_components/tarot/TarotSpreadPlanner';
 export const renderRelationship=locale=>renderToStaticMarkup(<Relationship locale={locale} stage="question" setStage={()=>{}} questionId="" onQuestion={()=>{}} participants={{self:'',partner:''}} onParticipants={()=>{}} profileState={{profiles:[],guest:true}} partnerId="" onPartner={()=>{}} onEngine={()=>{}}/>);
 export const renderPlanner=locale=>renderToStaticMarkup(<Planner locale={locale} question="" onQuestion={()=>{}} plan={emptyTarotPlan} onPlan={()=>{}} tier="tuna" onTier={()=>{}}/>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',
 banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/locale-test.cjs');"},
 plugins:[{name:'render-boundaries',setup(b){
  b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
  b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"import React from 'react';export default function Image(p){return React.createElement('img',p);}",loader:'js',resolveDir:process.cwd()}));
 }}]});
const temp=mkdtempSync(join(tmpdir(),'yn-locale-'));
let m;
try{const file=join(temp,'fixture.mjs');writeFileSync(file,bundle.outputFiles[0].text);m=await import(pathToFileURL(file).href);}finally{rmSync(temp,{recursive:true,force:true});}
const native=m.readingLocales.filter(l=>l!=='ko');
const bad={en:'You will develop cancer.',ja:'あなたは病気になります。','zh-CN':'你将患上癌症。','zh-TW':'你將患上癌症。',vi:'Bạn sẽ mắc ung thư.',hi:'आपको कैंसर होगा।',es:'Tendrás cáncer.',fr:'Vous développerez un cancer.',de:'Du wirst Krebs bekommen.',nl:'Je zult kanker krijgen.',ms:'Anda akan menghidap kanser.'};
const safe={en:'This reading cannot diagnose disease.',ja:'この鑑定は病気を診断しません。','zh-CN':'本解读不能诊断疾病。','zh-TW':'本解讀不能診斷疾病。',vi:'Bài luận không chẩn đoán bệnh.',hi:'यह पाठ बीमारी का निदान नहीं करता।',es:'Esta lectura no diagnostica enfermedades.',fr:'Cette lecture ne diagnostique pas de maladie.',de:'Diese Deutung diagnostiziert keine Krankheit.',nl:'Deze lezing stelt geen diagnose.',ms:'Bacaan ini bukan diagnosis penyakit.'};
for(const locale of native)test(`${locale}: complete menus, relationship journey, spreads and input choices`,()=>{
 assert.equal(m.additionalKindDescriptions[locale].length,m.additionalKindIds.length);
 const copy=m.relationshipCopyFor(locale);
 for(const key of Object.keys(m.relationshipCopy)){
  assert.ok(copy[key],`${locale}/${key}`);
  assert.doesNotMatch(JSON.stringify(copy[key]),/[가-힣]/);
 }
 for(const spread of yeongnyangiSpreads){
  const localized=m.localizedSpread(spread,locale);
  assert.equal(localized.id,spread.id);
  assert.deepEqual(localized.layout,spread.layout);
  assert.deepEqual(localized.positions.map(p=>[p.id,p.drawOrder,p.readOrder]),spread.positions.map(p=>[p.id,p.drawOrder,p.readOrder]));
  assert.doesNotMatch(localized.title+localized.summary+localized.positions.map(p=>p.label+p.question).join(''),/[가-힣]|undefined/);
 }
 for(const preset of m.tarotPlanCopy(locale).presets)assert.doesNotMatch(preset.question,/[가-힣]/);
 for(const label of [...Object.values(m.tarotPlanCopy(locale).periods),...Object.values(m.tarotPlanCopy(locale).relations)])assert.doesNotMatch(label,/[가-힣]/);
 assert.doesNotMatch(m.renderRelationship(locale),/[가-힣]/);
 assert.doesNotMatch(m.renderPlanner(locale),/[가-힣]|undefined/);
 for(const id of Object.keys(m.tarotConsultations))for(const position of m.tarotConsultationSpread(id).positions)assert.doesNotMatch(m.localizedTarotPosition(position.label,locale),/[가-힣]/);
 for(const limit of ['부부궁은 부처궁(夫妻宮)과 같은 자리입니다. 자녀궁으로 임신·출산 가능성을 판정하지 않습니다.','해외 출생은 출생지 진태양시와 한국 음양력 코어를 사용합니다. 균시차는 일 단위 근사이며 경계 시각 해석에는 주의가 필요합니다.'])assert.doesNotMatch(m.chartLimitation(limit,locale),/[가-힣]/);
});

test('healing safety routes native crisis questions without classifying ordinary reflection as a crisis',()=>{
 for(const question of ['I want to kill myself','死にたい','我想结束生命','我想結束生命','Tôi muốn tự tử','मैं आत्महत्या करना चाहता हूँ','Quiero matarme','Je veux me tuer','Ich will mich töten','Ik wil mezelf doden','Saya mahu bunuh diri'])assert.equal(m.isCrisisQuestion(question),true,question);
 for(const question of ['I want to take better care of myself','Je veux prendre soin de moi','Ich brauche eine Pause','Mahu berehat'])assert.equal(m.isCrisisQuestion(question),false,question);
});
test('every catalog row covers exactly eleven non-Korean locales',()=>{
 for(const [id,row] of Object.entries(m.tarotCatalogRows))assert.equal(row.split('|').length,native.length,id);
});
test('native free-text questions select the existing job-change and month layouts',()=>{
 for(const question of ['Should I change jobs?','転職を考えています','想换工作','想換工作','Tôi muốn đổi việc','नौकरी बदलनी चाहिए?','¿Debo cambiar de trabajo?','Dois-je changer de travail ?','Ich überlege einen Jobwechsel','Zal ik van baan veranderen?','Patutkah saya bertukar kerja?'])assert.equal(recommendTarotSpread({question,fishId:'tuna'}).primary,'yn_stay_leave_nine',question);
 for(const question of ['next month','来月','下个月','下個月','tháng tới','आने वाले महीने','próximo mes','mois prochain','kommenden Monat','komende maand','bulan hadapan'])assert.equal(questionFeatures({question}).period,'month',question);
});
for(const locale of native)test(`${locale}: diagnoses rejected, reflective health copy accepted`,()=>{
 assert.equal(m.hasLocalizedUnsupportedClaim(bad[locale],locale),true);
 assert.equal(m.hasLocalizedUnsupportedClaim(safe[locale],locale),false);
 assert.equal(m.hasLocalizedUnsupportedClaim(m.additionalKindDescriptions[locale][0],locale),false);
 const body={title:bad[locale],summary:safe[locale],persona:'',analysis:[],example:'',advice:'',highlights:[],sources:['saju.healthBasis'],blocks:[{title:'1',paragraphs:[safe[locale]],sources:['saju.healthBasis']},{title:'2',paragraphs:[m.additionalKindDescriptions[locale][0]],sources:['saju.healthBasis']}]};
 assert.throws(()=>m.validateReadingQuality(body,{version:'destiny-book-v4',tier:'mackerel',minimumChars:0},[],locale),/UNSUPPORTED_READING_CLAIM/);
 assert.doesNotThrow(()=>m.validateReadingQuality({...body,title:'Health'},{version:'destiny-book-v4',tier:'mackerel',minimumChars:0},[],locale));
});
const prose=summary=>({title:'',summary,persona:'',analysis:[],highlights:[],topics:[],blocks:[]});
const context={domain:'tarot',facts:[{id:'tarot.cards',label:'cards',value:[{cardId:'M00',orientation:'upright'}]}]};
for(const locale of native)test(`${locale}: saved card/orientation checks survive translation`,()=>{
 const [up,down]=m.tarotOrientation[locale];
 const name=code=>getYeongnyangiDeckText(`tarot.${code}.name`,locale);
 assert.doesNotThrow(()=>m.validateTarotChapter(prose(`${name('M00')} (${up})`),context,locale));
 assert.throws(()=>m.validateTarotChapter(prose(`${name('M00')} (${down})`),context,locale),/TAROT_ORIENTATION_MISMATCH/);
 assert.throws(()=>m.validateTarotChapter(prose(`${name('M01')} (${up})`),context,locale),/TAROT_UNDRAWN_CARD/);
 for(let i=0;i<22;i++)assert.ok(name(`M${String(i).padStart(2,'0')}`));
 for(const suit of ['W','C','S','P'])for(let i=1;i<=14;i++)assert.ok(name(`${suit}${String(i).padStart(2,'0')}`));
});
