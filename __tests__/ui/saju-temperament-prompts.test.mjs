import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {calculateLifeBookAiSaju} from '../../worker/lib/life-book-ai-saju.js';
import {buildSajuMyeongsikFactSnapshot} from '../../worker/lib/saju-ai-prompt.js';
import {buildLoveSecretGroupFacts,compactSajuForFollowUp} from '../../worker/lib/love-secret-ai-facts.js';
import {projectFusionFortuneContextForPrompt,buildFusionSectionGroupPrompt,fusionGroupsForStage} from '../../worker/lib/fusion-fortune-prompt.js';
import {formatGuardianFortuneContextForPrompt} from '../../worker/lib/guardian-fortune-prompt.js';
import {buildNeoInitialSectionPrompt,NEO_INITIAL_SECTIONS} from '../../worker/lib/neo-operation-room-prompt.js';
import {buildSajuCompatFactsBlock} from '../../worker/lib/saju-compat-prompts.js';
import {normalizeSajuCompatInput} from '../../worker/lib/saju-compat-schema.js';
import {requestBody} from '../fixtures/saju-compat-llm-fixture.mjs';
import {formatSajuForPrompt} from '../../worker/lib/master-love-codex-prompt.mjs';
import {buildCodexEvidence,formatCodexEvidence} from '../../worker/lib/master-love-codex-evidence.js';
import {buildSajuTemperamentProfile,sajuTemperamentPromptLines} from '../../worker/lib/saju-temperament.js';

// Build real TS/route prompt entrypoints in memory. The network guard stays installed;
// no provider, paid operation, or DB method is invoked by these tests.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`
export {saju} from './worker/yeongnyangi/fortune/saju';
export {buildPrompt} from './worker/yeongnyangi/fortune/shared/prompt';
export {explanationFacts} from './worker/yeongnyangi/fortune/shared/privacy';
export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7';
export {resolveV7Ledger,selectV7Facts} from './worker/yeongnyangi/fortune/reading-v7-ledger';
export {products} from './worker/yeongnyangi/payments/catalog';
export {buildEvidencePacket} from './worker/yeongnyangi/fortune/ask/packet';
export {__lifeBookAiTestUtils as life} from './worker/routes/life-book-ai';
export {__newYearAiTestUtils as newYear} from './worker/routes/new-year-ai';
export {__fortuneTeaHouseTestUtils as tea} from './worker/routes/fortune-tea-house';
export {__neoOperationRoomTestUtils as neo} from './worker/routes/neo-operation-room';
export {__karmaDestinyAiTestUtils as karma} from './worker/routes/karma-destiny-ai';
export {buildGeneratedPrompt as naming} from './worker/routes/naming-prompt';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('saju-temperament-prompts.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const birth={birthDate:'1997-02-10',birthTime:'14:30',gender:'female',calendarType:'solar'};
const chart=calculateLifeBookAiSaju(birth);
const marker='[사주 성향 해석 근거]';
const counted=Object.fromEntries(['year','month','day','hour'].map(k=>[k,chart[k+'Pillar']]));
const input=m.saju.validateInput({personA:birth,question:'타고난 성향과 일의 선택을 어떻게 살피면 좋을까요?',readingMode:'personal'});
const context=m.saju.buildContext(await m.saju.calculate(input,{asOf:'2026-11-02'}));

test('Yeongnyangi standard prompt carries compact temperament and its conditions through the privacy boundary',()=>{
  const prompt=m.buildPrompt(input,context,'salmon','사주 상담',['타고난 기질']);
  const f=prompt.calculatedData.facts.find(f=>f.label==='tenGodProfile');
  const lens=f.value.temperament.lines.join('\n');
  assert.match(lens,/일간을 제외한 겉 십성 7개/);
  assert.match(lens,/욕구=.+; 선택=.+; 강점=.+; 과할 때=.+; 조절=/);
  assert.match(lens,/지장간 개수는 겉 개수에 더하지 않는다/);
  const full=context.facts.find(f=>f.label==='tenGodProfile').value.temperament;
  assert.deepEqual(f.value.temperament.lines,sajuTemperamentPromptLines(full),'services share the same reading basis');
  assert.ok(JSON.stringify(f.value.temperament).length<JSON.stringify(full).length);
  assert.match(prompt.system,/욕구 → 선택 습관/);
  assert.doesNotMatch(JSON.stringify(prompt.calculatedData),/1997-02-10|14:30/);
});

test('compact explanation evidence preserves unknown-time and jong-candidate limitations',()=>{
  const full=buildSajuTemperamentProfile({...chart,timeUnknown:true,jong:{isJong:true,confirmedByUser:false}});
  const compact=m.explanationFacts({temperament:full,birthDate:'1997-02-10'});
  const text=JSON.stringify(compact);
  assert.match(text,/시주 미상/);
  assert.match(text,/종격 후보·성립 확인 필요/);
  assert.match(text,/일반격의 과다 억제 해석을 자동 적용하지 않는다/);
  assert.doesNotMatch(text,/1997-02-10/);
});

test('Yeongnyangi question evidence keeps personality conditions and v7 gives the owner the complete profile',()=>{
  const packet=m.buildEvidencePacket({contexts:{saju:context},today:'2026-11-02',tier:'salmon',birthTimeKnown:true});
  const atom=packet.facts.find(f=>f.label==='tenGodProfile');
  const lens=atom.value.temperament.lines.join('\n');
  assert.match(lens,/월지 본기 십성 \S+/);
  assert.match(lens,/기존 억부 (신강|신약)/);
  assert.match(lens,/월령·위치·기존 강약/);
  const product=m.products.find(p=>p.domain==='saju'&&p.fishId==='salmon'&&p.readingKind==='single');
  const chapters=m.readingManifestV7(product,{id:'personal'});
  const resolved=m.resolveV7Ledger(chapters,context,{asOf:'2026-11-02'});
  const owner=resolved.chapters.find(c=>c.owns.some(ref=>ref==='tenGodProfile'||ref.includes('tenGodProfile')));
  assert.ok(owner);
  const facts=m.explanationFacts(m.selectV7Facts(context,owner,{asOf:'2026-11-02',ledger:resolved.ledger}));
  assert.ok(facts.some(f=>JSON.stringify(f.value).includes('saju-temperament-20261102-v1')));
});

test('expert fact card and life-book sliced section use the same actual role evidence',()=>{
  const {factCard}=buildSajuMyeongsikFactSnapshot({sajuResult:{pillars:Object.fromEntries(Object.entries(counted).map(([k,ganji])=>[k,{ganji}]))},power:chart.natalAnalysis.power});
  assert.ok(factCard.includes(marker));
  const section={kind:'chapter',index:1,title:'성격과 마음의 결',evidenceRefs:['tenGods'],targetChars:1500,minChars:800};
  const slice=m.life.pickSajuSlice(chart,section.evidenceRefs);
  const prompt=m.life.buildSectionPrompt({birthInfo:birth},slice,section);
  assert.ok(prompt.includes(marker));
  assert.match(prompt,/기존 억부 (신강|신약)/);
  assert.match(prompt,/오행 역할\(겉 글자만\)/);
});

test('new-year common facts reach both initial and continuation prompt paths without adding predictions',()=>{
  const data=m.newYear.calculateNewYearFortuneData({birthInfo:birth,targetYear:2027});
  const facts=m.newYear.buildCanonicalNewYearFacts(data).join('\n');
  assert.ok(facts.includes(marker));
  assert.match(facts,/월지 본기 십성/);
  assert.equal(m.newYear.buildFirstPrompt({birthInfo:birth,targetYear:2027},data).split(marker).length-1,1);
});

test('love core, self and follow-up scope independent profiles to each supplied person',()=>{
  const partner=calculateLifeBookAiSaju({...birth,birthDate:'1988-05-20'});
  const result={myChart:chart,partnerChart:partner};
  for(const key of ['core','self','partner','risk','action']){
    const facts=buildLoveSecretGroupFacts(result,key);
    assert.ok(facts.나의성향근거.includes(marker));
    assert.ok(facts.상대성향근거.includes(marker));
    assert.notDeepEqual(facts.나의성향근거,facts.상대성향근거);
  }
  assert.ok(compactSajuForFollowUp(result).나의성향근거.includes(marker));
  assert.equal(buildLoveSecretGroupFacts({myChart:chart},'partner').상대성향근거,undefined);
});

test('tea myeongsik projection carries temperament and time-unknown request removes the hour',()=>{
  const saju={pillars:counted,dayMaster:chart.dayMaster,daewoon:[]};
  const known=m.tea.buildSajuFactInput({consultationMode:'saju'},saju,{},{});
  assert.ok(known.myeongsikFacts.temperament.includes(marker));
  const unknown=m.tea.buildSajuFactInput({consultationMode:'saju',birthTimeUnknown:true},saju,{},{});
  const text=unknown.myeongsikFacts.temperament.join('\n');
  assert.match(text,/겉 십성 5개/);
  assert.match(text,/시주 미상/);
  assert.doesNotMatch(text,/\[.*시주천간/);
});

test('neo innate chapter receives temperament; timing chapter keeps its assigned evidence boundary',()=>{
  const summary=m.neo.summarizeSaju(chart);
  const ctx={selectedMethod:'saju',methodSummary:summary,topic:'career',question:'나의 강점은 무엇인가요?'};
  const innate=buildNeoInitialSectionPrompt(NEO_INITIAL_SECTIONS.find(s=>s.id==='innateCore'),ctx);
  assert.ok(innate.includes(marker));
  const timing=buildNeoInitialSectionPrompt(NEO_INITIAL_SECTIONS.find(s=>s.id==='topicTiming'),ctx);
  assert.ok(!timing.includes(marker));
});

test('fusion and guardian provider projections retain only calculated temperament, and other systems get none',()=>{
  const source={pillars:counted,dayMaster:chart.dayMaster,expertEvidence:{seasonalBalance:chart.seasonalBalance},birthDate:'PRIVATE',latitude:987.123};
  const fusion={contextVersion:2,birthTimeKnown:true,systems:{saju:source,ziwei:{lifePalaceSummary:'명궁'}}};
  const projected=projectFusionFortuneContextForPrompt(fusion);
  assert.ok(projected.systems.saju.temperament.includes(marker));
  assert.equal(projected.systems.ziwei.temperament,undefined);
  const group=fusionGroupsForStage(1,fusion).find(g=>g.id==='saju');
  assert.ok(JSON.stringify(buildFusionSectionGroupPrompt({context:fusion,group})).includes(marker));
  assert.doesNotMatch(JSON.stringify(projected),/PRIVATE|987\.123/);
  const guardian=JSON.parse(formatGuardianFortuneContextForPrompt({inputSummary:{category:'saju',topic:'mind'},availableSystems:['saju'],saju:source}));
  assert.ok(guardian.adapters.saju.temperament.includes(marker));
});

test('basic saju compatibility keeps separate temperament profiles without changing scores',()=>{
  const raw=requestBody('戊辰 己丑 甲戌 丙午','丙午 丁巳 甲午 丙寅');
  const input=normalizeSajuCompatInput(raw);
  const block=JSON.parse(buildSajuCompatFactsBlock(input));
  assert.ok(block['성향 해석 근거']['당신'].includes(marker));
  assert.ok(block['성향 해석 근거']['상대'].includes(marker));
  assert.notDeepEqual(block['성향 해석 근거']['당신'],block['성향 해석 근거']['상대']);
  assert.equal(block['점수']['표시 점수(100점 만점)'],input.facts.score.display);
});

test('master love evidence preserves each subjects scope and marks the traditional reading provisional',()=>{
  const partner=calculateLifeBookAiSaju({...birth,birthDate:'1988-05-20'});
  const chapter={id:'temperament',sajuFocus:['일간','십성 분포'],ziweiPalaces:[],evidenceSubjects:['self']};
  const evidence=buildCodexEvidence({chapter,saju:chart,partnerSaju:partner});
  const lens=evidence.records.find(r=>r.path==='temperament');
  assert.equal(lens.subject,'self');
  assert.equal(lens.certainty,'provisional');
  assert.equal(lens.value.kind,'traditional-interpretation');
  assert.ok(formatCodexEvidence(evidence).includes(marker));
  assert.ok(!evidence.records.some(r=>r.subject==='partner'));
  assert.ok(formatSajuForPrompt(chart).includes(marker));
  assert.ok(!formatSajuForPrompt(chart,true).includes(marker));
});

test('karma saju lead uses only packed chart facts and naming reuses the canonical interpretation',()=>{
  const block={id:'saju',confidence:'high',data:{...chart,pillars:counted},provisionalFields:[],notCalculated:[]};
  const digest=m.karma.buildLensDigest({lenses:{saju:block}},{id:'innate',leadLens:'saju',supportLens:[]});
  assert.ok(digest.includes(marker));
  assert.ok(!m.karma.buildLensDigest({lenses:{saju:{...block,confidence:'none'}}},{leadLens:'saju',supportLens:[]}).includes(marker));
  const prompt=m.naming({desiredSyllables:[],requiredSyllables:[],blockedSyllables:[],preferredImage:[],desiredNames:[],birthTimeUnknown:false},
    {...chart,source:'test',raw:{mainShellEvidence:{power:chart.natalAnalysis.power,jong:chart.natalAnalysis.jong}}},'ko');
  assert.ok(prompt.includes(marker));
});
