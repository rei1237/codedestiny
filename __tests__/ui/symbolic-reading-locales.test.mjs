import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
const compiled=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/symbolic-locale';
 export {questionSkyTwoStageManifest} from './worker/yeongnyangi/fortune/question-sky-reading';
 export {questionSkyCalculationInput} from './worker/yeongnyangi/fortune/question-sky-locale-input';
 export {questionScopes} from './worker/yeongnyangi/fortune/question-sky';
 export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';
 export {spiritEvidence} from './worker/yeongnyangi/fortune/spirit';
 export {nativeSymbolicCopy,symbolicCopyKeys,symbolicCopyRows} from './lib/fortune/symbolic-copy-data';
 export {questionSkyCopyFor} from './app/yeongnyangi/_lib/question-sky-copy';
 export {withContinuation} from './lib/fortune/prompt-continuation';
 import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
 import Sky from './app/yeongnyangi/_components/QuestionSkyConsultation';
 import Spirit from './app/yeongnyangi/_components/SpiritConsultation';
 import Result from './app/yeongnyangi/_components/SpiritResult';
 import Entry from './app/yeongnyangi/_components/QuestionSkyEntry';
 import Continuation from './app/components/FreePromptContinuation';
 export const render=(locale,kind)=>{globalThis.__symbolicLocale=locale;
  const row={locale,id:'mock-reading',state:'COMPLETED',chapters:[{title:locale==='ko'?'결과':'Yeongnyangi',summary:'',blocks:[],persona:''}],manifest:[{id:'first',title:'기존 한국어 제목'}],consultation:{question:'',topicId:'general',timezone:'UTC',questionSky:{mode:'prashna-v1',askedAt:'2026-10-05T00:00:00Z',cityName:'서울',relationship:''}}};
  return renderToStaticMarkup(kind==='sky'?<Sky mode="prashna-v1"/>:kind==='horary'?<Sky mode="horary-v1"/>:kind==='spirit'?<Spirit/>:kind==='entry'?<Entry locale={locale}/>:kind==='continuation'?<Continuation locale={locale} prompt="Fixture only"/>:<Result row={row} onRow={()=>{}}/>);
 };
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',loader:{'.wasm':'binary'},banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/symbolic-native-tests.cjs');"},plugins:[{name:'ui-fixtures',setup(b){
 b.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
 b.onLoad({filter:/use-reading-language\.ts$/},()=>({contents:"export const useReadingLanguage=()=>({locale:globalThis.__symbolicLocale,siteLocale:globalThis.__symbolicLocale,setLocale:()=>{},fallback:false});export const readingPrice=(n,l)=>new Intl.NumberFormat(l,{style:'currency',currency:'KRW'}).format(n);",loader:'js'}));
}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const context={domain:'saju',engineVersion:'mock',calculatedAt:'2026-10-05',limitations:[],facts:[{id:'saju.fiveElements',label:'fiveElements',value:{counts:{wood:3,fire:1,earth:1,metal:1,water:1}}}]};
const chapter={id:'first',title:'나의 선택',ordinal:0,theme:'self',part:'나의 선택',version:'destiny-book-v4',tier:'mackerel',minimumChars:10,targetChars:[100,200],systems:['saju'],factSelectors:{saju:['fiveElements']},requiredSections:['근거','실천']};
const analysis={contexts:{saju:context},signals:[],themes:[],question:'How can I choose?',consultation:{question:'How can I choose?',questions:[{id:'q1',chapterId:'first',text:'How can I choose?'}],spirit:{boundary:true,relationship:'self',topic:'general',situation:''}}};
function body(locale){const t=m.nativeSymbolicCopy(locale);return {title:t.title,summary:t.intro,persona:t.spiritIntro,analysis:[],example:t.situationHint,advice:m.symbolicLocaleNotices(locale).boundary,highlights:[],topics:[],sources:['saju.fiveElements'],blocks:[{id:'symbolic-1',title:t.answer,paragraphs:[t.description],sources:['saju.fiveElements']},{id:'symbolic-2',title:t.other,paragraphs:[t.spiritScope],sources:['saju.fiveElements']}],questionAnswers:[{questionId:'q1',answer:t.description,reason:t.spiritScope,timing:m.symbolicLocaleNotices(locale).timing,action:t.situationHint}],internalBasis:{questionAnswers:[{questionId:'q1',factIds:['saju.fiveElements'],sources:['saju.fiveElements'],timingIds:[],evidenceStatus:'grounded'}]}};}
for(const locale of RUNTIME_LOCALES){
 test(`${locale}: symbolic inputs, entry, reread and external AI controls render without Korean fallback`,()=>{
  if(locale!=='ko'){assert.equal(m.symbolicCopyRows[locale].length,m.symbolicCopyKeys.length);assert.ok(m.symbolicCopyRows[locale].every(s=>typeof s==='string'&&s.trim()));}
  for(const kind of ['sky','horary','spirit','entry','result','continuation']){
   const html=m.render(locale,kind).replace(/<pre[\s\S]*?<\/pre>/g,'').replace(/<select[^>]*id="reading-language"[\s\S]*?<\/select>/g,'');
   assert.ok(html.length>200);
   if(locale!=='ko')assert.doesNotMatch(html,/[가-힣]/u,locale+'/'+kind);
  }
 });
 if(locale==='ko')continue;
 test(`${locale}: provider and save validator preserve native headings, ordered sections, question citations and exact timing notice`,async()=>{
  const value=body(locale),input={locale,chapter,analysis,previous:[]};
  let request;await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:value,provider:'mock',model:'fixture'};}}).generateChapter(input);
  assert.equal(request.locale,locale);assert.equal(request.maxProviderAttempts,1);
  const rules=JSON.parse(request.domainRules);assert.match(rules.spiritContract.evidence,/Translate/);
  assert.deepEqual(request.outputSchema.properties.blocks.items.properties.id.enum,['symbolic-1','symbolic-2']);
  assert.ok(request.outputSchema.required.includes('internalBasis'));
  assert.deepEqual(request.outputSchema.properties.internalBasis.properties.questionAnswers.items.properties.questionId.enum,['q1']);
  assert.equal(m.validateChapter(value,input).title,value.title);
  const check=v=>m.validateSymbolicLocale(v,m.spiritEvidence(context),chapter,locale,'spirit',true);
  for(const mutate of [v=>v.blocks.reverse(),v=>v.blocks[0].sources=[],v=>v.blocks[0].sources=['invented'],v=>v.internalBasis=undefined,v=>v.internalBasis.questionAnswers=[null],v=>v.internalBasis.questionAnswers[0].factIds=[],v=>v.internalBasis.questionAnswers[0].timingIds=['invented'],v=>v.questionAnswers[0].timing='2027-01-01',v=>v.advice='No boundary sentence']){
   const invalid=structuredClone(value);mutate(invalid);assert.throws(()=>check(invalid));
  }
  const prompt=m.withContinuation('Fixture only',locale);assert.equal(m.withContinuation(prompt,locale),prompt);assert.match(prompt,/ENTIRE|output|jawapan|response/i);
 });
}
test('question-specific source IDs cannot be reassigned to another question',()=>{
 const value=body('en'),ctx={...context,facts:[{id:'saju.fiveElements',label:'fixture',value:{questionId:'q2'}}]};
 assert.throws(()=>m.validateSymbolicLocale(value,ctx,chapter,'en','sky',true),/SPIRIT_ANSWER_EVIDENCE_MISSING/);
});

for(const locale of RUNTIME_LOCALES.filter(l=>l!=='ko'))test(locale+': current two-stage sky contract validates native results without question replay',async()=>{
 const t=m.nativeSymbolicCopy(locale),ctx={...context,domain:'vedic',facts:[{id:'vedic.question-q1',label:'question evidence',value:{questionId:'q1',patterns:[]}}]};
 const spec=m.questionSkyTwoStageManifest(ctx)[0];spec.minimumChars=10;spec.sections=spec.sections.map(s=>({...s,minimumChars:10}));
 const value={title:t.title,summary:t.intro,persona:t.spiritIntro,analysis:[],example:'',advice:'',highlights:[],topics:[],sources:['vedic.question-q1'],blocks:spec.sections.map((s,i)=>({id:s.id,title:[t.answer,t.topic,t.other][i],paragraphs:[[t.description,t.timeHint,t.cityHint][i]+(i===2?' '+m.symbolicLocaleNotices(locale).boundary:'')],sources:['vedic.question-q1']})),followUpSuggestions:[t.questionHint,t.followupHint,t.situationHint],visualSlots:{opening:'mystic'}};
 const input={locale,chapter:spec,analysis:{contexts:{vedic:ctx},themes:[],signals:[],question:'Fixture original question?',consultation:{questions:[],questionSky:{mode:'prashna-v1',boundary:true,evidenceVersion:spec.version}}},previous:[]};
 assert.equal(m.validateChapter(value,input).title,t.title);
 let request;await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:value,provider:'mock',model:'fixture'};}}).generateChapter(input);
 assert.deepEqual(request.outputSchema.properties.blocks.items.properties.id.enum,['verdict','evidence','action']);
 assert.equal(request.outputSchema.required.includes('questionAnswers'),false);
 assert.equal(request.outputSchema.required.includes('internalBasis'),false);
 assert.equal(JSON.parse(request.domainRules).questionSkyContract.boundary.includes(m.symbolicLocaleNotices(locale).boundary),true);
});
test('native question classification adapts explicit cues without changing saved input or chart parameters',()=>{
 const examples={en:['Should I change my job?','Friends'],ja:['転職を考えていますか？','友人'],'zh-CN':['工作如何选择？','朋友'],'zh-TW':['工作如何選擇？','朋友'],vi:['Công việc nên chọn thế nào?','Bạn bè'],hi:['नौकरी कैसे चुनूँ?','मित्र'],es:['¿Qué trabajo elegir?','Amistad'],fr:['Quel travail choisir?','Amitié'],de:['Welche Arbeit passt?','Freundschaft'],nl:['Welke baan past?','Vrienden'],ms:['Kerja mana sesuai?','Rakan']};
 for(const [locale,[question,relationship]] of Object.entries(examples)){
  const input={mode:'prashna-v1',question,relationship,topic:'money',cityId:'seoul',localTime:'2026-10-05T10:00',situation:'',boundary:false};
  const before=structuredClone(input),adapted=m.questionSkyCalculationInput(input,locale);
  assert.deepEqual(input,before);assert.equal(adapted.cityId,input.cityId);assert.equal(adapted.localTime,input.localTime);assert.equal(adapted.relationship,'친구');
  assert.deepEqual(m.questionScopes(adapted)[0].houses,[10]);
 }
 const unknown={question:'???',relationship:'unclassified',topic:'general'};
 assert.equal(m.questionSkyCalculationInput(unknown,'ko'),unknown);
 assert.ok(m.questionScopes(m.questionSkyCalculationInput({...unknown,question:'Unclear choice'},'en'))[0].ambiguous);
});
