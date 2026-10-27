const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
function compile(file,imports={}) {
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};
 vm.runInNewContext(compiled,{exports,require:name=>{
  if(name in imports)return imports[name];
  if(name.endsWith('.module.css'))return new Proxy({},{get:(_,key)=>String(key)});
  if(['react','react/jsx-runtime'].includes(name))return require(name);
  throw Error('Unexpected dependency: '+name);
 }});
 return exports;
}
const {recordsCopy}=compile('lib/records/copy.ts');
const reader=compile('lib/records/reader-copy.ts');
const content=compile('lib/records/reading-content.js');
test('Japanese archive states have complete translations rather than English fallbacks',()=>{
 const ko=recordsCopy('ko'),en=recordsCopy('en'),ja=recordsCopy('ja');
 assert.deepEqual(Object.keys(ja).sort(),Object.keys(ko).sort());
 for(const key of Object.keys(ko)) {
  assert.ok(ja[key].trim(),key);assert.notEqual(ja[key],en[key],key);assert.doesNotMatch(ja[key],/[가-힣]/,key);
 }
 assert.ok(ja.refundLead.includes('再度支払わず'));
});
test('all saved heading types have Japanese labels while keeping saved bodies and titles intact',()=>{
 const source=fs.readFileSync(path.join(root,'lib/records/reading-content.js'),'utf8');
 const titles=source.slice(source.indexOf('const TITLES'),source.indexOf('export function readingLabel'));
 const keys=[...titles.matchAll(/\b(\w+):\[/g)].map(match=>match[1]);
 assert.ok(keys.length>150);
 for(const key of keys) {
  assert.notEqual(content.readingLabel(key,'ja'),content.readingLabel(key,'en'),key);
  assert.doesNotMatch(content.readingLabel(key,'ja'),/[가-힣]/,key);
 }
 const saved={summary:'저장된 원문은 그대로',chapters:[{title:'Original title',body:'Original body'}]};
 const snapshot=JSON.stringify(saved);
 const result=content.readingSections(saved,{locale:'ja'});
 assert.ok(result.some(section=>section.title==='ひとこと要約'&&section.body==='저장된 원문은 그대로'));
 assert.ok(result.some(section=>section.title==='Original title'&&section.body==='Original body'));
 assert.equal(JSON.stringify(saved),snapshot);
});
test('saved report UI renders Japanese and English without changing recovery request code',()=>{
 for(const locale of ['ja','en']) {
  const Component=compile('app/records/view/SavedSibylReading.tsx',{
   '@/lib/i18n/useT':{useLocale:()=>locale}, '@/lib/records/reader-copy':reader,
   '@/lib/records/reading-content':content,
   '@/app/_lib/auth-client':{authFetch:()=>{throw Error('No network allowed');}},
   './SavedReadingParts':{SavedText:({text})=>React.createElement('p',null,text)},
  }).default;
  const value={title:'Saved title',profileId:'existing-profile',year:2026,chapters:[{title:'Saved chapter',content:'Saved body'}],analysis:{months:[{start:'2026-01-01',tensions:[]}],domains:[{id:'career',title:'Stored domain',periods:Array(12).fill({}),reasons:[{text:'Stored evidence',supports:['Stored support']}]}]}};
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(Component,{value})));
  assert.doesNotMatch(dom.window.document.body.textContent,/[가-힣]/);
  assert.ok(dom.window.document.body.textContent.includes('Saved body'));
  assert.ok(dom.window.document.querySelector('nav').getAttribute('aria-label').length);
  dom.window.close();
  const partial=new JSDOM(renderToStaticMarkup(React.createElement(Component,{value:{profileId:'existing-profile',year:2026}})));
  assert.doesNotMatch(partial.window.document.body.textContent,/[가-힣]/);
  assert.equal(partial.window.document.querySelector('button').textContent,reader.recordReaderCopy(locale).resume);
  partial.window.close();
 }
});
test('every Japanese consultation card has its own localized description',()=>{
 const {hubTranslations,expertCopy}=compile('app/consultations/consultation-copy.ts');
 for(const group of [hubTranslations,expertCopy])for(const id of Object.keys(group.en)) {
  assert.equal(group.ja[id]?.length,3,id);
  for(const text of group.ja[id]) {assert.ok(text.trim(),id);assert.doesNotMatch(text,/[가-힣]/,id);}
 }
});

test('saved chart captions use Japanese without modifying stored chart values',()=>{
 const charts=compile('app/records/view/SavedCharts.tsx',{
  'next/dynamic':{default:()=>()=>null}, '@/lib/i18n/useT':{useLocale:()=> 'ja'},
  '@/lib/records/reader-copy':reader, '@/lib/records/reading-content':content,
  '@/components/fortune/SajuPillarTable':{default:({pillars})=>React.createElement('div',null,pillars.map(p=>p.label).join(' '))},
  '@/app/components/ziwei/ZiweiPalaceGrid':{default:()=>null},
  './SavedReadingParts':{SavedText:({text})=>React.createElement('p',null,text)},
 });
 const saved={dayMaster:'甲',score:73};
 const html=renderToStaticMarkup(React.createElement(charts.SavedFacts,{value:saved}));
 assert.ok(html.includes('日主'));assert.ok(html.includes('保存されたスコア'));
 assert.ok(html.includes('甲'));assert.ok(html.includes('73'));
 assert.deepEqual(saved,{dayMaster:'甲',score:73});
 const cards=renderToStaticMarkup(React.createElement(charts.SavedCards,{value:[{orientation:'reversed',name:'Stored card',reading:'Original text'}],variant:'tarot'}));
 assert.ok(cards.includes('逆位置'));assert.ok(cards.includes('Original text'));assert.ok(cards.includes('カード'));
});
