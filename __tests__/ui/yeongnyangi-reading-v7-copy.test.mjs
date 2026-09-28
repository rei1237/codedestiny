import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Design §6-7 UI: the v7 chapter and part dictionary (ko·ja·en). Fail-closed — a new catalog entry without a
// dictionary entry, or a Korean title that drifts from the catalog, fails here instead of shipping a raw key.
// Flag OFF, no LLM: readingManifestV7 takes the flag as an argument (v7Applies(p,k,true)).
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export {readingV7Copy,v7Label,v7PartHead} from './app/yeongnyangi/_lib/reading-v7-copy'; export {readingManifestV7,V7_PARTS,V7_PART_ORDER} from './worker/yeongnyangi/fortune/reading-v7'; export {products} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-reading-v7-copy.test.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const LOCALES=['ko','ja','en'];
const TIERS=['salmon','flounder','tuna'];
const KINDS={saju:['personal','ask'],ziwei:['personal','ask'],vedic:['personal','ask'],astrology:['personal','ask'],sukuyo:['personal','ask'],tarot:['love','choice']};
const singles=m.products.filter(p=>p.readingKind==='single');
const chapters=Object.entries(KINDS).flatMap(([domain,kinds])=>kinds.flatMap(kind=>TIERS.flatMap(tier=>
 m.readingManifestV7(singles.find(p=>p.domain===domain&&p.fishId===tier),{id:kind}))));

test('every v7 chapter title has a ko/ja/en entry and ko matches the catalog', ()=>{
 assert.ok(chapters.length>100,`the catalog should cover every tier: ${chapters.length}`);
 for(const chapter of chapters){
  for(const locale of LOCALES){
   const label=m.v7Label(chapter.titleKey,locale);
   assert.ok(label,`${locale} title missing: ${chapter.titleKey}`);
  }
  assert.equal(m.v7Label(chapter.titleKey,'ko'),chapter.title,`ko title drifted: ${chapter.titleKey}`);
 }
});

test('every part has a ko/ja/en entry and ko matches V7_PARTS', ()=>{
 for(const part of m.V7_PART_ORDER){
  const key=`yeongnyangi.v7.part.${part}`;
  for(const locale of LOCALES)assert.ok(m.v7Label(key,locale),`${locale} part missing: ${key}`);
  assert.equal(m.v7Label(key,'ko'),m.V7_PARTS[part].label,`ko part drifted: ${key}`);
 }
});

test('the dictionary has no key the catalog never uses', ()=>{
 const used=new Set([...chapters.flatMap(c=>[c.titleKey,c.partKey]),...m.V7_PART_ORDER.map(p=>`yeongnyangi.v7.part.${p}`)]);
 const orphans=Object.keys(m.readingV7Copy('ko')).filter(key=>!used.has(key));
 assert.deepEqual(orphans,[],'remove dictionary entries the catalog dropped');
});

test('non-ko locales fall back to en, and ko needs no locale argument', ()=>{
 const key='yeongnyangi.v7.saju.anchor';
 assert.equal(m.v7Label(key,'zh-CN'),m.v7Label(key,'en'));
 assert.equal(m.v7Label(key),m.v7Label(key,'ko'));
 assert.notEqual(m.v7Label(key,'ja'),m.v7Label(key,'en'));
});

test('a chapter without partKey or titleKey produces no label and no part head', ()=>{
 const v6=[{id:'v6-01',title:'첫 장',part:'해석'},{id:'v6-02',title:'둘째 장',part:'해석'}];
 assert.equal(m.v7Label(undefined,'ko'),undefined);
 assert.equal(m.v7Label('yeongnyangi.v7.saju.unknownChapter','ko'),undefined);
 assert.equal(m.v7PartHead(v6,0,'ko'),undefined);
 assert.equal(m.v7PartHead(v6,1,'ko'),undefined);
});

test('the part head appears once per part, on its first chapter', ()=>{
 const tuna=m.readingManifestV7(singles.find(p=>p.domain==='saju'&&p.fishId==='tuna'),{id:'personal'});
 const heads=tuna.map((_,i)=>m.v7PartHead(tuna,i,'ko'));
 const parts=[...new Set(tuna.map(c=>c.partKey))];
 assert.equal(heads.filter(Boolean).length,parts.length,'one head per part');
 assert.equal(heads[0],'바탕');
 for(let i=1;i<tuna.length;i++){
  const repeated=tuna[i].partKey===tuna[i-1].partKey;
  assert.equal(Boolean(heads[i]),!repeated,`chapter ${i} head should ${repeated?'not ':''}render`);
 }
 assert.equal(m.v7PartHead(tuna,0,'ja'),'土台');
});
