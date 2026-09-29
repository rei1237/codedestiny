import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
const bundle=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/reading-locale';
 export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';
 export * from './app/yeongnyangi/_lib/consultation-locale-copy';
 export {resolveReadingLanguage} from './app/yeongnyangi/_lib/use-reading-language';
 export {consultationInputCopy} from './app/yeongnyangi/_lib/consultation-input-copy';
 export {readingCopy} from './app/yeongnyangi/_lib/reading-copy';
 export {resultStateCopy} from './app/yeongnyangi/_lib/result-state-copy';
 export {shareCopy} from './app/yeongnyangi/_lib/share-copy';
 export {journeyCopy} from './app/yeongnyangi/_lib/journey-copy';
 export {chartCopy,visualCopy,chartTerm,chartLimitation} from './app/yeongnyangi/_lib/reading-chart-copy';
 export {tarotRitualCopy} from './app/yeongnyangi/_lib/tarot-ritual-copy';
 export {jongCheckCopy} from './app/yeongnyangi/_lib/jong-check-copy';
 export {getCheckoutCopy} from './app/checkout/checkout-copy';
 export {checkoutPath} from './app/yeongnyangi/_lib/api';
 import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
 import Select from './app/yeongnyangi/_components/ReadingLanguageSelect';
 export const renderSelect=(locale)=>renderToStaticMarkup(React.createElement(Select,{locale,siteLocale:locale,onChange:()=>{}}));
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,jsx:'automatic',
 banner:{js:"import {createRequire} from 'node:module';const require=createRequire(process.cwd()+'/locale-test.cjs');"},
 plugins:[{name:'styles',setup(build){build.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const chapter={id:'first',title:'선택의 조건',ordinal:0,part:'나의 운세',theme:'self',version:'destiny-book-v6',tier:'mackerel',minimumChars:40,targetChars:[100,200],systems:['tarot'],factSelectors:{tarot:['cards']},sections:[{id:'evidence',title:'근거',role:'interpretation',instruction:'근거 설명',minimumChars:20,targetChars:[40,100]},{id:'action',title:'실천',role:'action',instruction:'행동 조언',minimumChars:20,targetChars:[40,100]}]};
const analysis={contexts:{tarot:{domain:'tarot',engineVersion:'mock',calculatedAt:'2026-09-29',limitations:[],facts:[{id:'tarot.cards',label:'cards',value:['The Fool']}]}},themes:[],signals:[]};

test('reading locales and labels reuse the site runtime source of truth',()=>{
 assert.deepEqual(m.readingLocales,RUNTIME_LOCALES);
 assert.deepEqual(Object.keys(m.consultationLocaleCopies),RUNTIME_LOCALES);
});
for(const locale of RUNTIME_LOCALES)test(`${locale}: complete dropdown, localized purchase copy and actual mock chapter payload`,async()=>{
 const copy=m.consultationLocaleCopy(locale);
 for(const name of ['consultationInputCopy','readingCopy','resultStateCopy','shareCopy','journeyCopy','chartCopy','visualCopy','tarotRitualCopy','jongCheckCopy','getCheckoutCopy']){
  const native=m[name](locale),original=m[name]('ko');
  for(const key of Object.keys(original)){
   assert.equal(typeof native[key],typeof original[key],`${locale} ${name}.${key} is authored`);
   if(typeof native[key]==='string'){
    assert.ok(native[key].trim());if(locale!=='ko')assert.doesNotMatch(native[key],/[가-힣]/,`${locale} ${name}.${key}`);
   }
  }
 }
 if(!['ko','en'].includes(locale)){
  assert.notEqual(m.readingCopy(locale).contents,m.readingCopy('en').contents,'no English screen fallback');
  assert.notEqual(m.getCheckoutCopy(locale).title,m.getCheckoutCopy('en').title,'no English checkout fallback');
 }
 if(locale!=='ko')assert.doesNotMatch(m.chartLimitation('출생 차트 해석이며 실시간 트랜짓은 포함하지 않습니다.',locale),/[가-힣]/);
 let html;
 try {html=m.renderSelect(locale);} catch(error){throw new Error(error.message);}
 assert.equal((html.match(/<option /g)||[]).length,RUNTIME_LOCALES.length);
 for(const value of RUNTIME_LOCALES)assert.ok(html.includes(`value="${value}"`));
 assert.match(html,new RegExp(`value="${locale}"[^>]* selected`));
 for(const value of Object.values(copy).flat()){
  assert.ok(typeof value==='string'&&value.trim().length>0);
  if(locale!=='ko')assert.doesNotMatch(value,/[가-힣]/);
 }
 const result={title:copy.guideTitle,summary:copy.intro,persona:copy.guideIntro,analysis:[],example:'',advice:'',highlights:[],topics:[],sources:['tarot.cards'],blocks:[
  {id:'evidence',title:copy.methodTitle,paragraphs:[copy.method],sources:['tarot.cards']},
  {id:'action',title:copy.suitable,paragraphs:[copy.example],sources:['tarot.cards']},
 ]};
 let payload;
 const output=await new m.StructuredChapterProvider({generate:async request=>{payload=request;return {result,provider:'mock',model:'mock'};}}).generateChapter({locale,chapter,analysis,previous:[],outputContext:{priceLocale:'en',userCountryOrRegion:'CA'}});
 assert.equal(output.title,result.title);
 try {m.validateChapter(output,{locale,chapter,analysis,previous:[]});} catch(error){throw new Error(`${locale}: ${error.message}`);}
 const rules=JSON.parse(payload.domainRules);
 assert.equal(payload.locale,locale);
 assert.equal(rules.outputLocale,locale);
 assert.equal(rules.outputLanguageName,m.readingLanguageNames[locale]);
 assert.equal(rules.priceLocale,'en');assert.equal(rules.currency,'KRW');assert.equal(rules.userCountryOrRegion,'CA');assert.ok(rules.toneProfile.length>20);
 assert.match(payload.system,/selected result language takes priority/);
 assert.match(payload.system,/Never include Korean sentences/);
 if(locale!=='ko'){
  const mixed=structuredClone(result);mixed.blocks[0].paragraphs[0]+=' 상담 결과를 확인해 주세요.';
  assert.throws(()=>m.validateReadingLanguage(mixed,locale),/CHAPTER_LANGUAGE_MISMATCH/);
 }
 console.log(JSON.stringify({kind:'mock-payload',outputLocale:rules.outputLocale,outputLanguageName:rules.outputLanguageName,priceLocale:rules.priceLocale,toneProfile:rules.toneProfile}));
});
test('a separate result language preserves the UI language through checkout and return without changing the purchase',()=>{
 const row={id:'a'.repeat(64),locale:'ja',product:{cdFeatureKey:'yeongnyangi-saju-mackerel'}};
 const url=new URL(m.checkoutPath(row,'en'),'https://example.invalid');
 assert.equal(url.pathname,'/checkout/');assert.equal(url.searchParams.get('requestId'),row.id);
 assert.equal(url.searchParams.get('featureKey'),row.product.cdFeatureKey);
 assert.equal(url.searchParams.get('lang'),'en');
 assert.equal(new URL(url.searchParams.get('returnTo'),url.origin).searchParams.get('lang'),'en');
 assert.equal(row.locale,'ja','the persisted result language is unchanged');
 assert.equal(new URL(m.checkoutPath(row),url.origin).searchParams.get('lang'),'ja','legacy callers retain their original routing');
});

test('the actual auth request builder preserves every selected output language over an English site locale',async()=>{
 const source=ts.createSourceFile('auth-client.ts',readFileSync('app/_lib/auth-client.ts','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const requestBuilder=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='buildAuthRequest');
 assert.ok(requestBuilder);
 const compiled=await build({entryPoints:['app/yeongnyangi/_lib/api.ts'],bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'closed-auth-transport',setup(builder){builder.onLoad({filter:/[\\/]auth-client\.ts$/},()=>({loader:'ts',resolveDir:process.cwd()+'/app/_lib',contents:`
   import {AI_LOCALE_HEADER} from '../../lib/i18n/ai-locale.js';
   const readMobileAppAccessToken=()=>'',isMobileAppRuntime=()=>false,detectLocale=()=>'en';
   const isAuthoritativeAuthPath=()=>false,CACHE_REFRESH_HEADER='x-code-destiny-cache-refresh';
   ${requestBuilder.getText(source)}
   export async function authFetch(path,init){
    const request=buildAuthRequest('http://127.0.0.1'+path,init);
    return new Response(JSON.stringify({body:await request.json(),header:request.headers.get(AI_LOCALE_HEADER),credentials:request.credentials}));
   }
  `}));}}]});
 const client=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 for(const locale of RUNTIME_LOCALES){
  const result=await client.fortuneApi('requests',{locale,priceLocale:'en',productId:'saju_mackerel'});
  assert.equal(result.header,locale);assert.equal(result.body.locale,locale);
  assert.equal(result.body.priceLocale,'en');assert.equal(result.body.productId,'saju_mackerel');
  assert.equal(result.credentials,'include');
 }
});

test('unsupported UI locale selects visible English fallback; API refuses an implicit paid language substitution',()=>{
 assert.deepEqual(m.resolveReadingLanguage('pt-BR'),{locale:'en',fallback:true});
 assert.deepEqual(m.resolveReadingLanguage('zh-Hant'),{locale:'zh-TW',fallback:false});
 assert.deepEqual(m.resolveReadingLanguage('en-US'),{locale:'en',fallback:false});
 assert.throws(()=>m.readingLocale('pt-BR'),/READING_LOCALE_UNAVAILABLE/);
 assert.equal(m.readingOutputContext('fr',{priceLocale:'bad',userCountryOrRegion:'injected prompt'}).userCountryOrRegion,null);
});
test('ordinary consultation cannot regress to three options or reset the selected result language on a menu change',()=>{
 const ui=readFileSync('app/yeongnyangi/_components/Consultation.tsx','utf8');
 const service=readFileSync('worker/yeongnyangi/service.ts','utf8');
 assert.doesNotMatch(ui,/readingLocales\.slice|selectableLocales|setLocale\('en'\)/);
 assert.match(ui,/ReadingLanguageSelect/);
 assert.doesNotMatch(service,/!askEvidenceEnabled.*READING_LOCALE_UNAVAILABLE/);
 assert.match(service,/outputContext:row\.snapshot\.outputContext/);
 assert.match(service,/body\.mode && locale!=='ko'/,'out-of-scope symbolic safety stays Korean');
});
