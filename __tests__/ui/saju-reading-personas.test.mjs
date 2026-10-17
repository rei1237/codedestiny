import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';
// 대운 풀이(buildCycle·cycleMarkup)는 서버 유료 렌더러로 옮겼다. 같은 정본을 서버 런타임에서 꺼내 검사한다.
import { createSajuSectionRuntime } from '../../worker/lib/saju-section/runtime.generated.mjs';

const context=vm.createContext({});
vm.runInContext(readFileSync('js/core/saju/reading-personas.js','utf8'),context);
const api=context.SajuReadingPresentation;
const cycleApi=createSajuSectionRuntime({window:{location:{search:'',pathname:'/',hostname:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},cdGetCurrentLanguage:()=>'ko'},document:{cookie:'',body:{classList:{contains:()=>false}},documentElement:{classList:{contains:()=>false}},getElementById:()=>null},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},neo:false,lang:'ko'}).window.SajuReadingPresentation;
const fixture={p:{d:{g:'辛',j:'酉',gE:'metal'}},natal:{dominant:'metal',ratios:{wood:33.33,fire:11.11,earth:11.11,metal:44.44,water:0}},ten:{'비견':2,'정재':1},johu:{type:'neutral',score:-2,moistCnt:1,dryCnt:3},power:{score:60,isStrong:true,yongshin:['fire']},jong:{isJong:false},flow:[{kind:'year',g:'丙',j:'午',score:70}]};
test('persona changes the reading, never mutates the chart or access input',()=>{
  const original=JSON.stringify(fixture);
  const yeon=api.build(fixture,'pig','ko'),neo=api.build(fixture,'neo','ko');
  assert.equal(JSON.stringify(fixture),original);
  assert.deepEqual(yeon.ratios,neo.ratios);
  // 숫자 근거는 같고 꼬리 설명만 화자 말투로 달라진다.
  assert.equal(yeon.elements.evidence.split('. ')[0],neo.elements.evidence.split('. ')[0]);
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
  // 저장하는 것은 연이/영냥이 화자 선택 하나뿐이다(풀이 결과는 저장하지 않는다).
  assert.deepEqual(source.match(/(local|session)Storage\.setItem\([^,]*/g),['localStorage.setItem(PERSONA_KEY']);
  assert.match(source,/PERSONA_KEY = 'cdSajuPersonaV1'/);
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
  assert.equal(api.build(data,'neo','ko').climate.blocks[0].text,api.copy('ko').neutralNeo);
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
  // 영냥이는 반말로 판단 → 이해 → 작은 행동을 권한다. 사자 시절 말투는 남기지 않는다.
  assert.match(neo.paragraphs.join(''),/해 봐|돌아봐|떠올려 봐/);
  assert.match(neo.signature,/영냥이/);
  assert.doesNotMatch(neo.paragraphs.join(''),/작전|팩폭|사자|갈기|확인해라/);
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
  const first=cycleApi.buildCycle(cycleFixture,'pig');
  const other=structuredClone(cycleFixture);other.day='甲';other.month='午';other.power.isStrong=false;other.climate='hot';other.stem.god='비견';other.branch.god='상관';other.relations=[];
  const second=cycleApi.buildCycle(other,'pig');
  assert.notEqual(first.sections[0].text,second.sections[0].text);
  assert.notEqual(first.sections[1].text,second.sections[1].text);
  assert.notEqual(first.sections[5].text,second.sections[5].text);
  assert.match(first.sections[4].text,/일주.*子/);
  assert.match(second.sections[4].text,/별도로 표시되지/);
  other.stem={char:'壬',element:'water',god:'편인',balance:'bad'};
  assert.notEqual(cycleApi.buildCycle(other,'pig').sections[5].text,second.sections[5].text);
  assert.equal(JSON.stringify(cycleFixture),original);
  // 기존 9장 + SajuReadingDepth 실천 2장 + 선택지 비교·건강과 회복 2장.
  assert.equal(first.sections.length,13);
  assert.deepEqual(Array.from(first.sections.slice(-2),section=>section.title),['선택지 비교 — 넓힐 것과 남겨둘 것','건강과 회복 — 감당할 수 있는 생활 리듬']);
});
test('cycle voices share evidence, honor uncertainty and escape rendered facts',()=>{
  const yeon=cycleApi.buildCycle(cycleFixture,'pig'),neo=cycleApi.buildCycle(cycleFixture,'neo');
  assert.notEqual(yeon.intro,neo.intro);
  // 같은 관계 근거를 각자 말투로 읽는다.
  for(const fact of ['午','일주','子','지충(地支)'])assert.ok(yeon.sections[4].text.includes(fact)&&neo.sections[4].text.includes(fact),fact);
  assert.doesNotMatch(neo.sections[4].text,/(요|니다)\./);
  const unknown=structuredClone(cycleFixture);unknown.unknown=true;unknown.jong={isJong:true,isGaJong:true};unknown.day='<script>alert(1)</script>';
  const report=cycleApi.buildCycle(unknown,'neo');assert.match(report.warning,/출생시간 미상/);assert.match(report.sections[0].text,/가종격/);
  assert.doesNotMatch(cycleApi.cycleMarkup(unknown,'pig'),/<script>/);
  assert.match(cycleApi.cycleMarkup(unknown,'pig'),/&lt;script&gt;/);
  assert.equal(cycleApi.buildCycle(null,'pig'),null);
});


test('cycle explains only supplied roots and hidden stems, filtering unknown-hour roots',()=>{
  const input=structuredClone(cycleFixture);
  input.stem.roots=[{position:'월주',branch:'寅',hiddenStem:'甲'},{position:'시주',branch:'亥',hiddenStem:'甲'}];
  input.branch.hiddenStems=[{stem:'丁',god:'편관',layer:'본기'},{stem:'己',god:'편인',layer:'여기'}];
  const before=JSON.stringify(input);
  const report=cycleApi.buildCycle(input,'pig');
  assert.match(report.sections[1].text,/월주 寅 속 甲/);
  assert.match(report.sections[2].text,/丁\(편관 · 본기\).*己\(편인 · 여기\)/);
  assert.equal(JSON.stringify(input),before);
  input.unknown=true;
  assert.doesNotMatch(cycleApi.buildCycle(input,'pig').sections[1].text,/시주 亥/);
  const unavailable=cycleApi.buildCycle(cycleFixture,'pig');
  assert.doesNotMatch(unavailable.sections[1].text,/통근은 천간이/);
  assert.doesNotMatch(unavailable.sections[2].text,/이번 지지에서 제공된 장간은/);
});

test('cycle distinguishes an observed combination from verified transformation and explains other relations',()=>{
  const input=structuredClone(cycleFixture);
  input.relations=[{src:'甲',partner:'己',type:'간합(天干)',hapEl:'earth',transformed:false,positions:['월주'],conditions:['월령의 지원 미확인']}];
  const candidate=cycleApi.buildCycle(input,'pig').sections[4].text;
  assert.match(candidate,/합화 후보/);
  assert.match(candidate,/합이 있다는 것과 다른 오행으로 합화하는 것은 다릅니다/);
  assert.doesNotMatch(candidate,/합화 조건이 함께 확인/);
  input.relations[0].transformed=true;input.relations[0].conditions=['월령의 지원 확인'];
  assert.match(cycleApi.buildCycle(input,'pig').sections[4].text,/합화 조건이 함께 확인/);
  for(const type of ['형(刑)','파(破)','해(害)']){
    input.relations=[{src:'午',partner:'午',type,positions:['일주']}];
    assert.doesNotMatch(cycleApi.buildCycle(input,'pig').sections[4].text,/합은 글자들이/);
  }
});

test('cycle retains traditional interpretation with different support and burden conditions',()=>{
  const input=structuredClone(cycleFixture);input.stem.god='겁재';input.stem.balance='good';
  const supportive=cycleApi.buildCycle(input,'pig').sections[1].text;
  input.stem.balance='bad';
  const demanding=cycleApi.buildCycle(input,'pig').sections[1].text;
  assert.notEqual(supportive,demanding);
  assert.match(supportive,/지원/);
  assert.match(demanding,/동업.*마찰/);
  assert.match(demanding,/재성이 감당할.*식상.*관성/);
  assert.equal(cycleApi.buildCycle(input,'pig').sections.length,13);
  assert.doesNotMatch(JSON.stringify(cycleApi.buildCycle(input,'pig')),/제련발복|보석용해|치명적 흉운/);
});


test('matching cycle roles do not repeat a definition, and missing strength stays unknown',()=>{
  const input=structuredClone(cycleFixture);input.branch.god=input.stem.god;input.power={};
  const report=cycleApi.buildCycle(input,'pig');
  assert.match(report.sections[0].text,/강약을 확인할 자료가 없어/);
  assert.match(report.sections[2].text,/생활의 기반에서도 반복/);
  assert.equal(report.sections.map(s=>s.text).join('').split('정재가 있다고 재산이 안정되는 것은 아닙니다.').length,2);
});
