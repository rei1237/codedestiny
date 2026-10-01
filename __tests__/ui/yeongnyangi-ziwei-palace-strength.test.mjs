import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Ziwei palace facts: canonical strengths, facing/trine/flank relations and rule-backed notes reach every tier.
// The stored context is never rewritten; enrichment happens where facts are consumed. Mock only, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/ziwei/reading-facts';
 export {ZIWEI_READING_FRAME} from './worker/yeongnyangi/fortune/ziwei/reading-rules';
 export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts';
 export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7';
 export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';
 export {consultationManifest} from './worker/yeongnyangi/fortune/consultation-kinds';
 export {buildPreventionFact} from './worker/yeongnyangi/fortune/prevention';
 export {calculateRelationshipZiwei,extendRelationshipContext} from './worker/yeongnyangi/fortune/relationship-calculation';
 export {validateChapter} from './worker/yeongnyangi/providers/chapter';
 export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';
 export {products} from './worker/yeongnyangi/payments/catalog';
 export {domains} from './worker/yeongnyangi/fortune/index';
 `,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-ziwei-palace-strength.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

// 로직 검증용 합성 — 실제 성립 명반 아님. Palace i sits on branch i so relations are plain index arithmetic.
const NAMES=['명궁','형제궁','부부궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
const chart=(seats={})=>NAMES.map((name,b)=>({name,branchIndex:b,mainStars:[],assistantStars:[],maleficStars:[],transformations:[],brightness:{legacy:'평'},...seats[b]}));
const at=(palaces,b)=>m.enrichZiweiPalaces(palaces)[b];
const rules=(palaces,b)=>m.traceZiweiPalaceNotes(palaces)[b].notes.map(n=>n.ruleId);
const ADDED=['strengths','facing','trines','flanks','oppositeReference','readingNotes'];

test('only the grade changes the reading: 태양 묘 under 경양 is strong-with-friction, 함 is pressure or support',()=>{
  const bright=chart({3:{mainStars:['태양'],maleficStars:['경양']}});
  const dark=chart({0:{mainStars:['태양'],maleficStars:['경양']}});
  const lifted=chart({0:{mainStars:['태양'],transformations:['화록:태양']}});
  assert.deepEqual(at(bright,3).strengths,[{star:'태양',grade:'묘'},{star:'경양',grade:'함'}]);
  assert.deepEqual(at(dark,0).strengths,[{star:'태양',grade:'함'},{star:'경양',grade:'함'}]);
  assert.deepEqual(rules(bright,3),['zw.strength.malefic','zw.malefic.grade']);
  assert.deepEqual(rules(dark,0),['zw.xian.pressure','zw.sunmoon','zw.malefic.grade']);
  assert.deepEqual(rules(lifted,0),['zw.xian.support','zw.sunmoon']);
  assert.match(at(bright,3).readingNotes[0],/^태양\(묘\): .*본궁의 경양/);
  assert.match(at(lifted,0).readingNotes[0],/^태양\(함\): .*보완 — 화록\(태양\).*실패로 보지 않는다/);
});

test('two main stars keep their own grades and are never averaged',()=>{
  const p=at(chart({1:{mainStars:['자미','파군']}}),1);
  assert.deepEqual(p.strengths,[{star:'자미',grade:'묘'},{star:'파군',grade:'왕'}]);
  assert.ok(p.readingNotes.includes('주성 둘 — 자미(묘) · 파군(왕): 강약이 달라 각각 따로 읽는다.'));
});

test('an empty palace borrows the facing stars at their own seat and grade without adopting them',()=>{
  const palaces=chart({3:{mainStars:['태양']}}),p=at(palaces,9);
  assert.deepEqual(p.mainStars,[]);
  assert.deepEqual(p.strengths,[]);
  // 태양 is 묘 on 卯 (where it sits) and 평 on 酉 (the empty palace); the reference must keep 묘.
  assert.deepEqual(p.oppositeReference,{palace:'자녀궁',stars:['태양(묘)'],use:'본궁 별이 아니라 참고로만 빌려 봄'});
  assert.ok(rules(palaces,9).includes('zw.empty'));
  assert.match(p.readingNotes.at(-1),/대궁 자녀궁의 태양\(묘\)를 참고로만 빌려 본다.*불운으로 보지 않는다/);
});

test('facing, trines and flanks are branch arithmetic for all twelve palaces',()=>{
  const all=m.enrichZiweiPalaces(chart());
  for(let b=0;b<12;b++){
    assert.equal(all[b].facing.palace,NAMES[(b+6)%12]);
    assert.deepEqual(all[b].trines.map(t=>t.palace),[NAMES[(b+4)%12],NAMES[(b+8)%12]]);
  }
  const flanked=chart({4:{maleficStars:['경양']},5:{mainStars:['천동']},6:{maleficStars:['타라']}});
  assert.deepEqual(at(flanked,5).flanks,[{pair:'경양·타라',kind:'조이는 협(夾) — 압박 조건으로만 읽는다'}]);
  assert.ok(rules(flanked,5).includes('zw.flank'));
  assert.deepEqual(at(flanked,1).facing,{palace:'노복궁',stars:[]});
  assert.deepEqual(at(flanked,1).trines[0],{palace:'질액궁',stars:['천동(묘)']});
});

test('stars without a classical strength line get no grade, and enrichment is idempotent and non-mutating',()=>{
  const palaces=chart({2:{mainStars:['염정'],assistantStars:['좌보','우필','천괴','녹존','문창'],maleficStars:['지공','지겁']}});
  const before=JSON.stringify(palaces),once=m.enrichZiweiPalaces(palaces);
  assert.deepEqual(once[2].strengths,[{star:'염정',grade:'묘'},{star:'문창',grade:'함'}]);
  assert.equal(JSON.stringify(palaces),before);
  assert.deepEqual(m.enrichZiweiPalaces(once),once);
  for(const p of once)assert.ok(!('brightness' in p));
});

const asOf='2026-09-15T00:00:00Z';
const timed={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const engine=m.domains.ziwei;
const stored=engine.buildContext(await engine.calculate(engine.validateInput({personA:timed,question:'요즘 마음이 가는 사람과 앞으로 어떻게 될까요?',readingMode:'personal'}),{asOf}));
const self=m.calculateRelationshipZiwei(timed,asOf.slice(0,10));
const partner=m.calculateRelationshipZiwei({...timed,birthDate:'1994-07-21',birthTime:'08:10',gender:'male'},asOf.slice(0,10));
const pair=m.extendRelationshipContext(self,partner,asOf.slice(0,10));
const LEAK=/"brightness"|\bzw\.|https?:|wikisource|iztro|紫微斗數全書/;

test('real engine: stored context keeps legacy brightness, the enriched copy only adds the palace fact keys',()=>{
  const snapshot=structuredClone(stored),enriched=m.enrichZiweiContext(stored);
  assert.deepEqual(stored,snapshot);
  const original=stored.facts.find(f=>f.label==='palaces').value,palaces=enriched.facts.find(f=>f.label==='palaces').value;
  assert.ok(original.every(p=>'brightness' in p));
  for(const [i,p] of palaces.entries()){
    const added=Object.keys(p).filter(k=>!(k in original[i])),removed=Object.keys(original[i]).filter(k=>!(k in p));
    assert.ok(added.every(k=>ADDED.includes(k)),`${p.name} added ${added}`);
    assert.deepEqual(removed,['brightness']);
    assert.ok(p.strengths.every(s=>/^(자미|천기|태양|무곡|천동|염정|천부|태음|탐랑|거문|천상|천량|칠살|파군|문창|문곡|경양|타라|화성|영성)$/.test(s.star)));
  }
  assert.ok(palaces.some(p=>p.transformations?.length&&p.strengths.length));
  assert.doesNotMatch(JSON.stringify(enriched),LEAK);
  assert.doesNotMatch(m.ZIWEI_READING_FRAME,LEAK);
  assert.doesNotMatch(JSON.stringify(m.enrichZiweiContext(pair)),LEAK);
  assert.deepEqual(m.enrichZiweiContext(m.enrichZiweiContext(stored)),enriched);
});

const single=fish=>m.products.find(p=>p.id===`ziwei_${fish}`);
// Mackerel stays on v6; salmon and flounder get v7, whose chapters are resolved to ledger IDs at prepare.
const manifests=[
  ['v6 mackerel',m.consultationManifest(single('mackerel'),{id:'personal'})],
  ...['salmon','flounder'].map(fish=>[`v7 ${fish}`,m.resolveV7Ledger(m.readingManifestV7(single(fish),{id:'personal'}),stored,{asOf}).chapters]),
];
for(const [name,manifest] of manifests){
  test(`${name} chapter facts carry strengths, facing/trines and natal sihua; 삼방사정 is no longer a tier violation`,async()=>{
    const facts=JSON.stringify(manifest.flatMap(c=>m.selectChapterFacts(stored,c)));
    for(const key of ['"strengths"','"facing"','"trines"','"transformations"','"readingNotes"'])assert.ok(facts.includes(key),`${name} ${key}`);
    assert.doesNotMatch(facts,LEAK);
    const chapter=manifest[0],input={chapter,analysis:{contexts:{ziwei:stored},signals:[],themes:[],topicId:'general'},previous:[],locale:'ko'};
    const result=await new m.MockChapterProvider().generateChapter(input);
    assert.doesNotThrow(()=>m.validateChapter({...result,summary:'삼방사정으로 보면 관록궁과 재백궁이 명궁을 받쳐 줍니다.'},input));
    assert.throws(()=>m.validateChapter({...result,summary:'대운을 설명합니다.'},input),/TIER_SCOPE_VIOLATION/);
  });
}

test('flounder prevention keeps each palace natal sihua but strips the annual sihua timeline',()=>{
  const fact=m.buildPreventionFact(pair,'flounder'),anchors=fact.value.anchors;
  const basis=anchors.find(a=>a.label==='relationshipBasis').value;
  assert.ok(basis.self.palaces.some(p=>p.transformations?.length));
  const timing=anchors.find(a=>a.label==='relationshipTiming').value;
  assert.ok(timing.self.annual.length&&timing.self.annual.every(y=>!('transformations' in y)));
  const premium=m.buildPreventionFact(pair,'tuna').value.anchors.find(a=>a.label==='relationshipTiming').value;
  assert.ok(premium.self.annual.every(y=>y.transformations.length===4));
});
