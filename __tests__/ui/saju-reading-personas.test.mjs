import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';

const context=vm.createContext({});
vm.runInContext(readFileSync('js/core/saju/reading-personas.js','utf8'),context);
const api=context.SajuReadingPresentation;
const fixture={p:{d:{g:'辛',j:'酉',gE:'metal'}},natal:{dominant:'metal',ratios:{wood:33.33,fire:11.11,earth:11.11,metal:44.44,water:0}},ten:{'비견':2,'정재':1},johu:{type:'neutral',score:-2,moistCnt:1,dryCnt:3},power:{score:60,isStrong:true,yongshin:['fire']},jong:{isJong:false},flow:[{kind:'year',g:'丙',j:'午',score:70}]};
test('persona changes the reading, never mutates the chart or access input',()=>{
  const original=JSON.stringify(fixture);
  const yeon=api.build(fixture,'pig','ko'),neo=api.build(fixture,'neo','ko');
  assert.equal(JSON.stringify(fixture),original);
  assert.deepEqual(yeon.ratios,neo.ratios);
  assert.equal(yeon.elements.evidence,neo.elements.evidence);
  assert.notDeepEqual(yeon.elements.blocks,neo.elements.blocks);
  assert.notDeepEqual(yeon.day.blocks,neo.day.blocks);
  assert.notDeepEqual(yeon.ten[0].reading.blocks,neo.ten[0].reading.blocks);
  assert.notDeepEqual(yeon.flow[0].blocks,neo.flow[0].blocks);
});
test('different facts change the reading; ties and unknown birth time are explicit',()=>{
  const other=structuredClone(fixture);other.natal={dominant:'wood',ratios:{wood:50,fire:20,earth:10,metal:10,water:10}};other.p.d={g:'甲',j:'子',gE:'wood'};other.unknown=true;other.power.isStrong=false;
  const a=api.build(fixture,'neo','ko'),b=api.build(other,'neo','ko');
  assert.notEqual(a.elements.blocks[0].text,b.elements.blocks[0].text);
  assert.notEqual(a.day.blocks[0].text,b.day.blocks[0].text);
  assert.notEqual(a.strength.blocks[0].text,b.strength.blocks[0].text);
  assert.equal(b.unknown,true);assert.match(b.warning,/정오/);
  other.natal.ratios={wood:20,fire:20,earth:20,metal:20,water:20};
  assert.match(api.build(other,'pig','ko').elements.blocks[0].text,/여러 오행/);
});
test('the display layer cannot call an LLM, payment, or recalculate a chart',()=>{
  const source=readFileSync('js/core/saju/reading-personas.js','utf8');
  assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|calculate|evalDaewun|renderDailyMonthlyFortune)\s*\(/);
  assert.doesNotMatch(source,/localStorage\.setItem|sessionStorage\.setItem/);
});
test('static prices are generated from billing, and samples remain outside locked bodies',()=>{
  const html=readFileSync('index.html','utf8');
  for(const key of ['section_daewun','section_summary']){
    const price=getBillingFeaturePricing({featureKey:key}).pricing;
    const prices=[...html.matchAll(new RegExp(`data-saju-price-key="${key}"[^>]*>([^<]+)`,'g'))];
    assert.ok(prices.length>=2);
    prices.forEach(m=>assert.equal(m[1],price.amountKRW.toLocaleString('ko-KR')+'원'));
    const buttons=[...html.matchAll(new RegExp(`<button[^>]*data-unlock-key="${key}"[^>]*>`,'g'))];
    buttons.forEach(m=>assert.match(m[0],new RegExp(`data-unlock-cost="${price.cost}"`)));
  }
});
test('new non-Korean copy does not fall back to Korean',()=>{
  for(const lang of ['en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms']){
    const model=api.build(fixture,'neo',lang);
    const visible=[model.elements,model.day,model.climate,model.strength,...model.flow,...model.ten.map(t=>t.reading)];
    assert.doesNotMatch(JSON.stringify(visible),/[가-힣]/);
  }
});

test('seasonal assessment follows engine type, including the neutral band',()=>{
  const data=structuredClone(fixture);data.johu.score=1;data.johu.type='neutral';
  assert.equal(api.build(data,'neo','ko').climate.blocks[0].text,api.copy('ko').neutral);
});
