import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/ask/packet';
 export * from './worker/yeongnyangi/fortune/ask/window';
 export * from './worker/yeongnyangi/fortune/ask/categories';
 export * from './worker/yeongnyangi/fortune/ask/wrappers';
 export * from './worker/yeongnyangi/fortune/ask/tarot';
 export {domains} from './worker/yeongnyangi/fortune';
 export {buildSubDasha} from './worker/lib/vedic-derived-calculations.js';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,
  loader:{'.wasm':'binary'},logLevel:'silent'});
const loaded=new Module(path.resolve('ask-evidence-tests.cjs'));
loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {buildEvidencePacket,sliceEvidencePacket,evidenceWindow,periodOverlaps,canonicalAskCategory,domains,
  calculateAskTarot,extendAskLocalTiming,projectAskCompatibility,projectAskWesternTransit,vedicPeriods,contextValues}=loaded.exports;
const today='2026-09-26';
const birth={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',
  birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const ctx=(domain,values)=>({domain,engineVersion:'fixture-v1',calculatedAt:today,limitations:[],
  facts:Object.entries(values).map(([label,value])=>({id:domain+'.'+label,label,value}))});
const packet=(contexts,extra={})=>buildEvidencePacket({contexts,today,tier:'tuna',birthTimeKnown:true,...extra});
const natal={pillars:{year:'丁丑',month:'壬寅',day:'癸未',hour:'己未'},dayMaster:'癸',
  majorLuck:{cycles:[{pillar:'壬子'}]},yearlyLuck:[{year:2026,pillar:'丙午',majorLuckPillar:'壬子'}]};

test('six engine fixed projections preserve their source system and school',()=>{
  const fixtures={
    saju:natal,ziwei:{lifePalace:'명궁',palaces:[{name:'명궁',mainStars:['천량'],majorLuck:{startAge:2}}]},
    astrology:{planets:{Sun:{longitude:321,house:9}},ascendant:{sign:'Gemini'}},
    sukuyo:{personA:{nameHan:'婁',index:15,latitude:37.5,birthDate:'1997-02-10'}},
    vedic:{moon:{longitude:68.1,nakshatra:'Mrigashira'},divisionalCharts:{d9:[{name:'Sun',sign:'Leo'}]}},
    tarot:{spreadId:'three_card_cause_process_outcome',cards:[{cardId:'major_00',positionKey:'cause',orientation:'upright'}]},
  };
  for(const [system,values] of Object.entries(fixtures)) {
    const result=packet({[system]:ctx(system,values)});
    assert.deepEqual(result.engines,[system]);assert.ok(result.schools[system]);
    assert.ok(result.facts.length);assert.ok(result.facts.every(f=>f.source.system===system));
    assert.equal(new Set([...result.facts,...result.timing].map(f=>f.id)).size,result.facts.length+result.timing.length);
    assert.doesNotMatch(JSON.stringify(result),/majorLuck|birthDate|latitude/);
  }
  assert.deepEqual(packet({saju:ctx('saju',natal)}).facts.map(f=>[f.id,f.label,f.value]),[
    ['F001','dayMaster','癸'],['F002','pillars.day','癸未'],['F003','pillars.hour','己未'],
    ['F004','pillars.month','壬寅'],['F005','pillars.year','丁丑'],
  ]);
});

test('ID assignment is independent of context and fact iteration order and category slicing',()=>{
  const a=ctx('saju',natal),b=ctx('astrology',{planets:{Sun:{longitude:12}},synastry:{crossAspects:[{type:'합'}]}});
  const options={partnerTimeKnown:true};
  const full=packet({saju:a,astrology:b},options);
  const reordered=packet({astrology:{...b,facts:[...b.facts].reverse()},saju:{...a,facts:[...a.facts].reverse()}},options);
  assert.deepEqual(reordered,full);
  const slice=sliceEvidencePacket(full,'career');
  assert.ok(slice.facts.length<full.facts.length);
  for(const f of slice.facts)assert.deepEqual(f,full.facts.find(old=>old.id===f.id));
  assert.equal(full.facts.some(f=>f.label==='synastry'),true);
});

test('cross-system daily facts keep their true source and cannot become month or year evidence',()=>{
  const result=packet({tarot:ctx('tarot',{todaySaju:{pillar:'甲子'},todayVedic:{tithi:8},
    todayNumerology:{personalDay:3},sajuYearlyLuck:[{year:2026,pillar:'丙午'}]})});
  assert.deepEqual(result.timing.map(f=>[f.source.system,f.label,f.resolution]),[
    ['numerology','todayNumerology','day'],['saju','todaySaju','day'],
    ['saju','yearlyLuck.2026','year'],['vedic','todayVedic','day'],
  ]);
  assert.ok(result.timing.filter(f=>f.resolution==='day').every(f=>f.from===today&&f.to===today));
});

test('window uses calendar boundaries and rejects impossible dates',()=>{
  assert.deepEqual(evidenceWindow(today),{from:'2025-09-01',to:'2028-09-30'});
  assert.deepEqual(evidenceWindow('2024-02-29'),{from:'2023-02-01',to:'2026-02-28'});
  assert.throws(()=>evidenceWindow('2026-02-30'));
  assert.equal(periodOverlaps('2026-13','2026-13',evidenceWindow(today)),false);
  assert.equal(periodOverlaps('2028','2028',evidenceWindow(today)),true);
  assert.equal(periodOverlaps('2029','2029',evidenceWindow(today)),false);
});

test('solar terms and transits remain points; unrelated years are excluded',()=>{
  const result=packet({saju:ctx('saju',{yearlyLuck:[{year:2024},{year:2026},{year:2030}],
    monthlyLuck:[{start:{year:2026,month:9,day:7,hour:23,minute:41},pillar:'丁酉'}]}),
    astrology:ctx('astrology',{transits:{date:today,aspects:[{type:'conjunction',orb:1}]}})});
  assert.equal(result.timing.length,3);
  const term=result.timing.find(f=>f.label.startsWith('monthlyLuck'));
  assert.equal(term.from,'2026-09-07T23:41:00+09:00');assert.equal(term.to,term.from);
  assert.equal(term.resolution,'instant');
});

test('unknown birth time drops house, mansion, precise period and embedded hour evidence',()=>{
  const result=packet({
    saju:ctx('saju',{...natal,tenGodsByPillar:{year:'인성',hour:'재성'},todaySukuyo:{nameHan:'婁'}}),
    astrology:ctx('astrology',{ascendant:{sign:'Gemini'},planets:{Moon:{longitude:10}}}),
    vedic:ctx('vedic',{lagna:{sign:'Cancer'},divisionalCharts:{d9:{Sun:'Leo'}},
      vimshottariDasha:{currentAntardasha:{lord:'Moon',startDate:'2026-01-01',endDate:'2027-01-01'}}}),
    tarot:ctx('tarot',{cards:[{cardId:'major_00',positionKey:'cause'}],todayNumerology:{personalDay:2}}),
  },{birthTimeKnown:false});
  assert.equal(result.reliability.time_dependent_fields_valid,false);
  assert.ok(result.facts.some(f=>f.label==='pillars.day'));
  assert.ok(result.facts.some(f=>f.source.system==='tarot'));
  assert.ok(result.timing.every(f=>f.source.system==='numerology'));
  assert.doesNotMatch(JSON.stringify(result.facts),/pillars.hour|"hour"|longitude|lagna|d9/);
  assert.ok(result.reliability.notes.some(n=>n.code==='BIRTH_TIME_UNKNOWN'));
});

test('professional boundaries and embedded decade cycles are enforced before slicing',()=>{
  const context=ctx('vedic',{moon:{sign:'Aries'},yogas:[{name:'test'}],divisionalCharts:{d9:{}},
    vimshottariDasha:{currentMahadasha:{lord:'Venus'},currentAntardasha:{lord:'Moon',startDate:'2026-01-01',endDate:'2027-01-01'}}});
  const limited=packet({vedic:context},{tier:'mackerel'}),full=packet({vedic:context});
  assert.equal(limited.timing.length,0);assert.equal(limited.facts.length,1);
  assert.equal(full.timing.length,1);
  assert.doesNotMatch(JSON.stringify(full),/currentMahadasha|majorLuck/);
});

test('partner and transit precision cannot be inferred from unrelated flags',()=>{
  const western=ctx('astrology',{synastry:{crossAspects:[{type:'合'}]}});
  assert.equal(packet({astrology:western}).facts.length,0);
  assert.equal(packet({astrology:western},{partnerTimeKnown:false}).facts.length,0);
  assert.equal(packet({astrology:western},{partnerTimeKnown:true}).facts.length,1);
  const vedic=ctx('vedic',{transits:{calculatedAt:today,gochara:{Moon:{sign:'Aries'}}}});
  assert.equal(packet({vedic}).timing.length,0);
  assert.throws(()=>projectAskWesternTransit(western,{source:'fallback',fallbackUsed:true,planets:{}},today));
});

test('tarot server wrapper draws unique canonical cards without Math.random and preserves positions',()=>{
  const random=Math.random;Math.random=()=>{throw new Error('insecure RNG');};
  try {
    for(const spreadId of ['three_card_cause_process_outcome','relationship_six_card']) {
      const value=contextValues(calculateAskTarot({question:'어떤 선택을 할까요?',spreadId}));
      assert.equal(value.cards.length,spreadId.startsWith('three')?3:6);
      assert.equal(new Set(value.cards.map(c=>c.cardId)).size,value.cards.length);
      assert.equal(new Set(value.cards.map(c=>c.positionKey)).size,value.cards.length);
      assert.ok(value.cards.every(c=>['upright','reversed'].includes(c.orientation)&&c.nameKo&&c.imageUrl));
    }
  } finally {Math.random=random;}
});

test('actual saju and ziwei engines supply the complete local query window without mutation',async()=>{
  const input={personA:birth,question:'올해의 일은?',readingMode:'personal'};
  const normalized={saju:domains.saju.validateInput(input),ziwei:domains.ziwei.validateInput(input)};
  const contexts={};
  for(const id of ['saju','ziwei'])contexts[id]=await domains[id].calculate(normalized[id],{asOf:today});
  const before=structuredClone(contexts);
  const expanded=await extendAskLocalTiming(contexts,normalized,today);
  assert.deepEqual(contexts,before);
  for(const id of ['saju','ziwei'])assert.deepEqual(contextValues(expanded[id]).yearlyLuck.map(v=>v.year),[2025,2026,2027,2028]);
  assert.equal(contextValues(expanded.saju).monthlyLuck.length,48);
  const out=packet(expanded);
  assert.ok(out.timing.some(f=>f.from.startsWith('2025')));
  assert.ok(out.timing.some(f=>f.from.startsWith('2028')));
  assert.doesNotMatch(JSON.stringify(out),/majorLuck/);
});

test('three-level Vedic dasha reuses engine boundaries within the existing professional tier',()=>{
  const chart=ctx('vedic',{vimshottariDasha:{periods:[{lord:'Venus',startDate:'2020-01-01',endDate:'2040-01-01'}]}});
  const periods=vedicPeriods(chart,evidenceWindow(today));
  assert.ok(periods.some(p=>p.level==='mahadasha'));
  assert.ok(periods.some(p=>p.level==='antardasha'));
  assert.ok(periods.some(p=>p.level==='pratyantar'));
  assert.ok(periods.every(p=>Date.parse(p.start)<Date.parse(p.end)));
  const out=packet({vedic:ctx('vedic',{dashaPeriods:periods})});
  assert.equal(out.timing.length,periods.length);
  assert.ok(out.timing.every(p=>p.resolution==='period'));
});

test('lunar input preserves engine facts without leaking raw calendar data',async()=>{
  for(const system of ['saju','ziwei']) {
    const lunar=domains[system].validateInput({personA:{...birth,birthDate:'1997-01-03',calendarType:'lunar'},question:'올해의 흐름'});
    const context=await domains[system].calculate(lunar,{asOf:today});
    const out=packet({[system]:context});
    assert.ok(out.facts.length);
    assert.doesNotMatch(JSON.stringify(out),/birthDate|calendarType|solarYear|lunarDate/);
    const values=contextValues(context);
    if(system==='saju')assert.equal(out.facts.find(f=>f.label==='pillars.day').value,values.pillars.day);
    else assert.deepEqual(out.facts.find(f=>f.label==='lifePalace').value,values.lifePalace);
  }
});

test('existing western synastry and Vedic compatibility calculators provide facts without invented probabilities',()=>{
  const western=ctx('astrology',{planets:{Sun:{longitude:10},Moon:{longitude:40},Venus:{longitude:60},Mars:{longitude:90}},houseCusps:Array.from({length:12},(_,i)=>i*30)});
  const partner=ctx('astrology',{planets:{Sun:{longitude:12},Moon:{longitude:100},Venus:{longitude:120},Mars:{longitude:150}},houseCusps:Array.from({length:12},(_,i)=>i*30)});
  const syn=projectAskCompatibility(western,partner);
  assert.ok(syn.value.crossAspects.length);
  const v=projectAskCompatibility(ctx('vedic',{moon:{longitude:10}}),ctx('vedic',{moon:{longitude:40}}));
  assert.equal(v.value.max,36);
  const out=packet({vedic:ctx('vedic',{ashtakuta:v.value})},{partnerTimeKnown:true});
  assert.doesNotMatch(JSON.stringify(out.facts),/"pct"|"verdict"|"doshas"/);
  assert.equal(out.facts[0].value.max,36);
});

test('legacy topics remain compatible without classifying healing as medical',()=>{
  assert.equal(canonicalAskCategory('healing'),'self');
  assert.equal(canonicalAskCategory('relationship'),'relationships');
  assert.equal(canonicalAskCategory('reunion'),'reunion');
  assert.equal(canonicalAskCategory('unknown'),'other');
});
