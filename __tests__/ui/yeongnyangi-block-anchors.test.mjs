import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Block chart anchors: saju pillars, astrology/vedic points and sukuyo mansions are optional per-section hints
// taken from the stored chart, named exactly like the reading chart groups the screen highlights. Mock only, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/block-anchors';
 export {validateChapter} from './worker/yeongnyangi/providers/chapter';
 export {readingCharts} from './worker/yeongnyangi/fortune/reading-presentation';
 export {consultationManifest} from './worker/yeongnyangi/fortune/consultation-kinds';
 export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';
 export {products} from './worker/yeongnyangi/payments/catalog';
 export {domains} from './worker/yeongnyangi/fortune/index';
 `,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-block-anchors.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

const person=(birthDate,birthTime,gender)=>({birthDate,birthTime,calendarType:'solar',gender,birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}});
const A=person('1997-02-10','14:30','female'),B=person('1994-02-10','12:00','male');
const contexts={};
for(const d of ['saju','astrology','vedic','sukuyo']){
  const input=m.domains[d].validateInput({personA:A,personB:B,question:'예시',readingMode:d==='sukuyo'?undefined:'personal'});
  contexts[d]=m.domains[d].buildContext(await m.domains[d].calculate(input,{asOf:'2026-09-15T00:00:00Z'}));
}
const analysis={contexts,signals:[],themes:[],topicId:'general'};

test('anchor names come from the stored chart and match the chart groups the screen highlights',()=>{
  const anchors=m.blockAnchorNames(analysis);
  assert.deepEqual(anchors.pillars.slice(0,4),['년주','월주','일주','시주']);
  assert.ok(anchors.astroPoints.includes('태양')&&anchors.astroPoints.includes('상승점'));
  assert.ok(anchors.vedicPoints.includes('토성')&&anchors.vedicPoints.includes('라그나'));
  assert.deepEqual(anchors.mansions,['나의 본명숙','상대의 본명숙']);
  assert.equal(anchors.palaces,undefined);
  const charts=Object.fromEntries(m.readingCharts(analysis,[]).map(c=>[c.domain,c]));
  const labels=d=>new Set(charts[d].groups.map(g=>g.label));
  for(const name of anchors.pillars)assert.ok(labels('saju').has(name),name);
  for(const name of anchors.astroPoints)assert.ok(labels('astrology').has(name),name);
  for(const name of anchors.mansions)assert.ok(labels('sukuyo').has(name),name);
  const vedicItems=new Set(charts.vedic.groups.flatMap(g=>g.items.map(i=>i.label)));
  for(const name of anchors.vedicPoints.filter(n=>n!=='라그나'))assert.ok(vedicItems.has(name),name);
  assert.ok(charts.vedic.groups.some(g=>g.label.endsWith(' · 라그나')));
  // A chapter only gets the anchors of its own systems.
  assert.deepEqual(Object.keys(m.blockAnchorNames(analysis,['sukuyo','vedic'])).sort(),['mansions','vedicPoints']);
  assert.deepEqual(m.blockAnchorNames(analysis,['tarot']),{});
});

test('schema gains optional enums only for present anchors; required is untouched and plain schemas stay identical',()=>{
  const schema={type:'object',properties:{blocks:{type:'array',items:{type:'object',properties:{title:{type:'string'}},required:['title']}}}};
  const anchors=m.blockAnchorNames(analysis,['saju','sukuyo']),items=m.withBlockAnchorsSchema(schema,anchors).properties.blocks.items;
  assert.deepEqual(Object.keys(items.properties),['title','pillars','mansions']);
  assert.deepEqual(items.properties.pillars.items.enum,anchors.pillars);
  assert.equal(items.properties.mansions.maxItems,2);
  assert.deepEqual(items.required,['title']);
  assert.equal(m.withBlockAnchorsSchema(schema,{}),schema);
  // Ziwei keeps the S2 palaces property exactly.
  assert.deepEqual(Object.keys(m.withBlockAnchorsSchema(schema,{palaces:['명궁']}).properties.blocks.items.properties),['title','palaces']);
});

test('sanitize keeps only stored names, trims, dedupes, caps — and never rejects',()=>{
  const anchors=m.blockAnchorNames(analysis,['saju','astrology']);
  const out=m.sanitizeBlockAnchors({summary:'',blocks:[
    {title:'a',paragraphs:[],pillars:[' 일주','없는주','일주','월주','년주','시주','상대 일주'],astroPoints:['태양','명궁'],mansions:['나의 본명숙']},
    {title:'b',paragraphs:[],pillars:['없는주'],vedicPoints:'토성'},
  ]},anchors);
  assert.deepEqual(out.blocks,[{title:'a',paragraphs:[],pillars:['일주','월주','년주','시주'],astroPoints:['태양']},{title:'b',paragraphs:[]}]);
  const plain={summary:'',blocks:[{title:'c',paragraphs:[]}]};
  assert.equal(m.sanitizeBlockAnchors(plain,anchors),plain);
});

test('validateChapter keeps known pillars on a saju chapter and drops the rest',async()=>{
  const chapter=m.consultationManifest(m.products.find(p=>p.id==='saju_mackerel'),{id:'personal'})[0];
  const input={chapter,analysis:{...analysis,contexts:{saju:contexts.saju}},previous:[],locale:'ko'};
  const result=await new m.MockChapterProvider().generateChapter(input);
  const hinted={...result,blocks:result.blocks.map((b,i)=>i?{...b,astroPoints:['태양']}:{...b,pillars:['일주','없는주']})};
  const blocks=m.validateChapter(hinted,input).blocks;
  assert.deepEqual(blocks[0].pillars,['일주']);
  assert.ok(blocks.slice(1).every(b=>!('astroPoints' in b)));
});
