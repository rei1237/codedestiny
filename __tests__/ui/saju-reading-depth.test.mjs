import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_KEYS, STEM_ORDER, MONTH_ORDER, dayReading, monthReading, buildDepthFacts, contextualReading, cycleActions, promptDepthLines } from '../../lib/saju/reading-depth.mjs';
import { buildSajuMyeongsikFactSnapshot, buildSajuAdvancedFactors } from '../../worker/lib/saju-ai-prompt.js';

const facts = (month='酉', unknown=false) => ({p:{y:{g:'戊',j:'辰'},m:{g:'辛',j:month},d:{g:'辛',j:'丑'},h:{g:'丙',j:'申'}},unknown,power:{isStrong:true,yongshin:['water']},johu:{type:'cold'},jong:{isJong:false}});
test('60 pillars retain eight distinct perspectives without truncation',()=>{
 assert.equal(new Set(DAY_KEYS).size,60);
 const summaries=new Set();
 for(const key of DAY_KEYS){const row=dayReading(key);assert.ok(row);assert.equal(row.sections.length,8);assert.equal(new Set(row.sections.map(s=>s.key)).size,8);summaries.add(row.summary);for(const s of row.sections)assert.ok(s.text.length>70);}
 assert.equal(summaries.size,60);assert.equal(dayReading('甲丑'),null);
});
test('120 solar-term month readings distinguish both the stem and month',()=>{
 const openings=new Set();
 for(const stem of STEM_ORDER) for(const month of MONTH_ORDER){const row=monthReading(stem,month);assert.ok(row);assert.match(row.basis,/절기/);assert.equal(row.sections.length,4);openings.add(row.sections[0].text);}
 assert.equal(openings.size,120);assert.notEqual(monthReading('辛','子').sections[0].text,monthReading('辛','丑').sections[0].text);
 assert.equal(monthReading('辛','12'),null);
});
test('same pillar changes with seasonal, strength and conflicting climate evidence',()=>{
 const cold=facts('子'),hot=facts('午');hot.johu.type='hot';hot.power.isStrong=false;
 assert.notDeepEqual(contextualReading(cold),contextualReading(hot));
 assert.match(contextualReading(cold).find(s=>s.key==='climate').text,/두 후보가 달라/);
 assert.match(contextualReading({...cold,unknown:true}).find(s=>s.key==='unknown').text,/시주는.*제외/);
 assert.ok(!buildDepthFacts({...cold,unknown:true}).roots.some(s=>s.startsWith('시주')));
});
test('display reuses the canonical prompt gyeokguk verdict',()=>{
 for(const stem of STEM_ORDER) for(const month of MONTH_ORDER){
  const input=facts(month); input.p.d.g=stem;
  const sajuResult={pillars:input.p,power:input.power,jong:input.jong};
  const server=buildSajuMyeongsikFactSnapshot({sajuResult,advancedFactors:buildSajuAdvancedFactors(sajuResult,{}),power:input.power,jong:input.jong});
  const actual=buildDepthFacts(input).gyeokguk;
  assert.equal(actual.finalGyeokguk,server.factSnapshot.majorStructures.gyeokguk.finalGyeokguk,stem+month);
 }
});
test('the same luck cycle gives different preparation and stopping conditions',()=>{
 const cycle={stem:{char:'甲',god:'정재',balance:'good'},branch:{char:'子',god:'식신',balance:'neutral'},power:{isStrong:true},depth:buildDepthFacts(facts())};
 const strong=cycleActions(cycle),weak=cycleActions({...cycle,power:{isStrong:false}});
 assert.notDeepEqual(strong,weak);assert.match(weak[0].text,/지원.*먼저/);assert.match(strong[1].text,/한 달 뒤/);
 assert.match(promptDepthLines('辛','酉').join(' '),/앞뒤 5년/);
});
test('unknown-hour prompt and display both exclude the placeholder hour from roots and structure',()=>{
 const input=facts('子',true),sajuResult={pillars:input.p,power:input.power,jong:input.jong,calculationMeta:{timeUnknown:true}};
 const advancedFactors=buildSajuAdvancedFactors(sajuResult,{});
 const server=buildSajuMyeongsikFactSnapshot({sajuResult,advancedFactors,power:input.power,jong:input.jong}).factSnapshot;
 assert.equal(server.pillars.hour,undefined);
 assert.equal(server.majorStructures.gyeokguk.finalGyeokguk,buildDepthFacts(input).gyeokguk.finalGyeokguk);
 assert.ok(!advancedFactors.hiddenStems.some(row=>row.position==='hour'));
});

// 공개 브라우저 번들(reading-depth-public.mjs)은 월령 제목·격국·뿌리·대운 행동만 싣고, 일주·월령 문장은 서버 전용 모듈에만 둔다.
test('public depth module matches the full module on month titles and gyeokguk without carrying paid sentences',async()=>{
 const pub=await import('../../lib/saju/reading-depth-public.mjs');
 const fs=await import('node:fs');
 assert.deepEqual(Object.keys(pub).sort(),['MONTH_ORDER','STEM_ORDER','buildDepthFacts','cycleActions','depthFactsWith','monthTitle']);
 for(const stem of STEM_ORDER) for(const month of MONTH_ORDER){
  const full=monthReading(stem,month),neo=monthReading(stem,month,'neo');
  assert.equal(pub.monthTitle(stem,month),full.title);assert.equal(pub.monthTitle(stem,month),neo.title);
 }
 assert.equal(pub.monthTitle('辛','12'),null);
 for(const month of MONTH_ORDER) for(const unknown of [false,true]){
  const input=facts(month,unknown),a=pub.buildDepthFacts(input),b=buildDepthFacts(input);
  assert.deepEqual({...a,month:undefined},{...b,month:undefined});
  assert.deepEqual(a.month,{title:b.month.title});
  assert.equal(Object.keys(a.month).join(),'title');
 }
 assert.equal(pub.buildDepthFacts({p:{}}),null);
 const cycle={stem:{char:'甲',god:'정재',balance:'good'},branch:{char:'子',god:'식신',balance:'neutral'},power:{isStrong:false},depth:pub.buildDepthFacts(facts())};
 assert.deepEqual(pub.cycleActions(cycle),cycleActions(cycle));assert.deepEqual(pub.cycleActions(cycle,'neo'),cycleActions(cycle,'neo'));
 // 생성된 공개 파일: 일주·월령 본문이 없다(월령 첫 문장·일주 요약 문장 표본).
 const generated=fs.readFileSync(new URL('../../js/core/saju/reading-depth.generated.js',import.meta.url),'utf8');
 for(const sample of [dayReading('辛丑').summary,monthReading('辛','酉').sections[0].text.slice(0,24),MONTH_ORDER.map(m=>monthReading('辛',m).sections[1].text.slice(0,20))[0]])assert.ok(!generated.includes(sample),sample);
 for(const key of ['PILLAR_NOTES','MONTH_NOTES','dayReading','monthReading','contextualReading','promptDepthLines'])assert.ok(!generated.includes(key),key);
});
