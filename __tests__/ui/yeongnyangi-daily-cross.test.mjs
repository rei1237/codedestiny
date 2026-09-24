import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url), Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/daily-cross'; export {consultationClock,createConsultation,professionalEvidenceNames} from './worker/yeongnyangi/fortune/consultation'; export {questionFactSelectors,readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter'; export {products} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',loader:{'.wasm':'binary'}});
const loaded=new Module(path.resolve('daily-cross-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,loaded.id);
const {crossDailyFacts,computeCrossDaily,hubInput,consultationClock,createConsultation,professionalEvidenceNames,questionFactSelectors,readingManifest,products,StructuredChapterProvider}=loaded.exports;

const card=(system,extra={})=>({system,label:system,anchor:`${system} 기준`,headline:'오늘의 흐름',body:'차분히 점검한다.',tier:'good',tierLabel:'길',score:70,detail:'',personalized:true,highlights:['한 가지'],sections:[{key:'k',title:'t',lines:['l']}],...extra});
const fortunes={saju:card('saju'),sukuyo:card('sukuyo',{mansionIndex:4}),vedic:null,number:card('number')};
const luck=[{id:'saju.yearlyLuck',label:'yearlyLuck',value:[{year:2026},{year:2027}]},{id:'saju.monthlyLuck',label:'monthlyLuck',value:[{month:9}]},{id:'saju.majorLuck',label:'majorLuck',value:{currentCycle:{index:1}}}];

test('today cards become facts in the first system context without card chrome, and missing systems are skipped',()=>{
 const facts=crossDailyFacts('vedic',fortunes,luck);
 assert.deepEqual(facts.map(f=>f.id),['vedic.todaySaju','vedic.todaySukuyo','vedic.todayNumerology','vedic.sajuYearlyLuck','vedic.sajuMonthlyLuck']);
 for(const f of facts.slice(0,3))for(const key of ['system','label','personalized','mansionIndex'])assert.equal(key in f.value,false);
 assert.deepEqual(facts[3].value,[{year:2026}]);
 assert.ok(facts.every(f=>professionalEvidenceNames[f.label]));
 assert.doesNotMatch(JSON.stringify(facts)+['todaySaju','todaySukuyo','todayVedic','todayNumerology','sajuYearlyLuck','sajuMonthlyLuck'].map(k=>professionalEvidenceNames[k]).join(),/용신|희신|대운|마하다샤|안타르다샤|삼방사정|majorLuck/);
});

test('profile birth maps to the hub input shape',()=>{
 assert.deepEqual(hubInput({birthDate:'1990-05-14',birthTime:'09:30',calendarType:'lunar',leapMonth:true,gender:'male'}),{year:1990,month:5,day:14,hour:9,minute:30,timeUnknown:false,birthDate:'1990-05-14',birthTime:'09:30',calendarType:'lunar_leap',gender:'male'});
 assert.equal(hubInput({birthDate:'1990-05-14',calendarType:'solar'}).timeUnknown,true);
});

test('cross labels are selected only for the first system and never add major luck',()=>{
 const selected=questionFactSelectors(['vedic','saju'],'이직할까요?','general',['todaySaju','sajuYearlyLuck']);
 assert.ok(selected.vedic.includes('todaySaju'));assert.ok(!selected.saju.includes('todaySaju'));
 assert.ok(Object.values(selected).flat().every(s=>!/majorLuck/.test(s)));
});

test('a failed daily calculation yields no facts instead of blocking the consultation',async()=>{
 const facts=await computeCrossDaily({},{personA:{birthDate:'1990-05-14',birthTime:'09:30',calendarType:'solar',gender:'female'}},'2026-09-25',['vedic']);
 assert.ok(Array.isArray(facts));
});

test('question chapter prompt carries cross facts as citable evidence',async()=>{
 let prompt;
 const provider=new StructuredChapterProvider({generate:async request=>{prompt=request;return {result:{},provider:'mock',model:'mock'};}});
 const product=products.find(p=>p.id==='vedic_mackerel');
 const cross=crossDailyFacts('vedic',fortunes);
 const chapter={...readingManifest(product)[0],systems:['vedic'],factSelectors:questionFactSelectors(['vedic'],'이직할까요?','general',cross.map(f=>f.label))};
 const clock=consultationClock('Asia/Seoul',new Date('2026-09-24T23:00:00Z'));
 const consultation=createConsultation('이직할까요?','general',clock,[chapter]);
 const context={domain:'vedic',engineVersion:'mock',calculatedAt:clock.asOf,limitations:[],facts:[{id:'vedic.moon',label:'moon',value:{sign:'게자리'}},...cross]};
 await provider.generateChapter({chapter,analysis:{consultation,question:consultation.question,topicId:'general',contexts:{vedic:context},themes:[]},previous:[]});
 const ids=prompt.calculatedData.facts.map(f=>f.id);
 for(const f of cross)assert.ok(ids.includes(f.id),f.id);
 assert.ok(JSON.stringify(prompt.calculatedData).length<180000);
});
