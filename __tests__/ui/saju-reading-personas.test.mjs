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

// Protect the requested long-form closing from a return to three analytical blocks.
test('closing is a personal letter with distinct, respectful persona voices',()=>{
  const yeon=api.build({...fixture,name:'민지'},'pig','ko').letter;
  const neo=api.build({...fixture,name:'민지'},'neo','ko').letter;
  assert.match(yeon.greeting,/민지님께/);
  assert.ok(yeon.paragraphs.join('').length>=900);
  assert.ok(yeon.paragraphs.length>=6);
  assert.match(yeon.paragraphs.join(''),/辛|보석/);
  assert.match(yeon.signature,/연이/);
  assert.match(neo.paragraphs.join(''),/작전|정리하자|확인해라/);
  assert.doesNotMatch(neo.paragraphs.join(''),/징징|똥고집|처듣|무적/);
  assert.notEqual(yeon.title,neo.title);
  assert.doesNotMatch(neo.paragraphs.join(''),/예요|있어요|보세요|하세요/);
  assert.equal(api.build(fixture,'pig','ko').letter.greeting,'이 편지를 읽는 당신께,');
  const other=structuredClone(fixture);other.p.d={g:'甲',j:'子',gE:'wood'};
  assert.notEqual(api.build(other,'pig','ko').letter.paragraphs[1],yeon.paragraphs[1]);
});

const cycleFixture={age:31,startYear:2020,day:'辛',month:'丑',dominant:'metal',power:{isStrong:true},jong:{isJong:false},climate:'cold',stem:{char:'甲',element:'wood',god:'정재',balance:'good'},branch:{char:'午',element:'fire',god:'편관',balance:'bad'},godCounts:{정재:1,편관:0},relations:[{src:'午',partner:'子',type:'지충(地支)',isChung:true,positions:['일주']}],unknown:false,next:{age:41,g:'乙',j:'未'}};
test('cycle consultation changes with natal facts and selected cycle without mutation',()=>{
  const original=JSON.stringify(cycleFixture);
  const first=api.buildCycle(cycleFixture,'pig');
  const other=structuredClone(cycleFixture);other.day='甲';other.month='午';other.power.isStrong=false;other.climate='hot';other.stem.god='비견';other.branch.god='상관';other.relations=[];
  const second=api.buildCycle(other,'pig');
  assert.notEqual(first.sections[0].text,second.sections[0].text);
  assert.notEqual(first.sections[1].text,second.sections[1].text);
  assert.notEqual(first.sections[5].text,second.sections[5].text);
  assert.match(first.sections[4].text,/일주.*子/);
  assert.match(second.sections[4].text,/별도로 표시되지/);
  other.stem={char:'壬',element:'water',god:'편인',balance:'bad'};
  assert.notEqual(api.buildCycle(other,'pig').sections[5].text,second.sections[5].text);
  assert.equal(JSON.stringify(cycleFixture),original);
  assert.equal(first.sections.length,9);
});
test('cycle voices share evidence, honor uncertainty and escape rendered facts',()=>{
  const yeon=api.buildCycle(cycleFixture,'pig'),neo=api.buildCycle(cycleFixture,'neo');
  assert.notEqual(yeon.intro,neo.intro);
  assert.deepEqual(yeon.sections[4],neo.sections[4]);
  const unknown=structuredClone(cycleFixture);unknown.unknown=true;unknown.jong={isJong:true,isGaJong:true};unknown.day='<script>alert(1)</script>';
  const report=api.buildCycle(unknown,'neo');assert.match(report.warning,/출생시간 미상/);assert.match(report.sections[0].text,/가종격/);
  assert.doesNotMatch(api.cycleMarkup(unknown,'pig'),/<script>/);
  assert.match(api.cycleMarkup(unknown,'pig'),/&lt;script&gt;/);
  assert.equal(api.buildCycle(null,'pig'),null);
});
