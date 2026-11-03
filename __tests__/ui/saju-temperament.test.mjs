import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSajuTemperamentProfile as profile, sajuTemperamentPromptLines as lines, SAJU_TEMPERAMENT_RULE } from '../../worker/lib/saju-temperament.js';
import { buildTenGodProfile } from '../../worker/lib/saju-derived-signals.js';
import { calculateLifeBookAiSaju, tenGodFor } from '../../worker/lib/life-book-ai-saju.js';
import { buildSajuMyeongsikFactSnapshot } from '../../worker/lib/saju-ai-prompt.js';

const wealth = {pillars:{year:'戊辰',month:'己丑',day:'甲戌',hour:'丙午'}};
const food = {pillars:{year:'丙午',month:'丁巳',day:'甲午',hour:'丙寅'}};
const family = (p,name) => p.families.find(f => f.family === name);
const trait = (p,god) => p.tenGods.find(g => g.god === god);

test('same wealth distribution distinguishes capacity, desire and shadow without predicting money', () => {
  const strong = profile({...wealth,power:{isStrong:true}}), weak = profile({...wealth,power:{isStrong:false}});
  assert.equal(family(strong,'재성').visible,5);
  assert.deepEqual(strong.facts.elementRoles,weak.facts.elementRoles);
  assert.match(family(strong,'재성').interpretation,/자원을 다룰 여지/);
  assert.match(family(weak,'재성').interpretation,/재다신약의 구조 후보/);
  assert.match(trait(strong,'정재').interpretation.shadow,/손익과 통제/);
  assert.match(trait(strong,'편재').interpretation.shadow,/눈앞의 이익/);
  assert.notEqual(trait(strong,'정재').interpretation.choice,trait(strong,'편재').interpretation.choice);
});

test('same food distribution distinguishes sustained production from depletion and food from expression', () => {
  const strong = profile({...food,power:{isStrong:true}}), weak = profile({...food,power:{isStrong:false}});
  assert.equal(family(strong,'식상').visible,family(weak,'식상').visible);
  assert.match(family(strong,'식상').interpretation,/표현과 생산성/);
  assert.match(family(weak,'식상').interpretation,/부담·소모/);
  assert.match(trait(strong,'식신').interpretation.desire,/즐거움과 편안함/);
  assert.match(trait(strong,'상관').interpretation.desire,/새로운 자극/);
  assert.match(trait(strong,'상관').interpretation.shadow,/싫증/);
});

test('all ten individual gods agree with the canonical ten-god table and offer all five editorial roles', () => {
  const seen = new Set();
  for (const stem of '甲乙丙丁戊己庚辛壬癸') {
    const p = profile({pillars:{year:stem+'子',month:'甲寅',day:'甲辰'}});
    const god = tenGodFor('甲',stem);
    const t = trait(p,god);
    seen.add(god);
    assert.ok(t.facts.positions.some(pos => pos.pillar === 'year' && pos.side === '천간'));
    assert.deepEqual(Object.keys(t.interpretation),['desire','choice','strength','shadow','action']);
    assert.ok(Object.values(t.interpretation).every(text => typeof text === 'string' && text.length > 8));
  }
  assert.equal(seen.size,10);
});

test('same earth distribution changes role with the day master rather than copying one earth personality', () => {
  const wood = profile(wealth), fire = profile({pillars:{...wealth.pillars,day:'丙戌'}});
  const earth = p => p.facts.elementRoles.find(e => e.element === '토');
  assert.equal(earth(wood).count,earth(fire).count);
  assert.equal(earth(wood).family,'재성');
  assert.equal(earth(fire).family,'식상');
});

test('moving the same pillars into the month changes monthly evidence without changing counts', () => {
  const a = profile({pillars:{year:'丙寅',month:'己丑',day:'甲戌',hour:'戊辰'}});
  const b = profile({pillars:{year:'己丑',month:'丙寅',day:'甲戌',hour:'戊辰'}});
  assert.deepEqual(a.families.map(f => f.visible),b.families.map(f => f.visible));
  assert.equal(a.facts.monthMain,'정재');
  assert.equal(b.facts.monthMain,'비견');
  assert.match(lines(b).join('\n'),/비겁:.*월지 본기 역할/);
});

test('surface counts exclude self and hidden stems; unknown time excludes supplied hour entirely', () => {
  const full = profile(wealth), unknown = profile({...wealth,timeUnknown:true});
  assert.equal(full.facts.visibleCount,7);
  assert.equal(unknown.facts.visibleCount,5);
  assert.equal(full.facts.elementRoles.reduce((n,e) => n+e.count,0),8);
  assert.equal(unknown.facts.elementRoles.reduce((n,e) => n+e.count,0),6);
  assert.ok(unknown.tenGods.every(g => g.facts.positions.every(p => p.pillar !== 'hour')));
  assert.match(lines({...wealth,timeUnknown:true}).join('\n'),/시주 미상/);
});

test('latent-only gods are not missing or a main observed personality; absence does not imply inability', () => {
  const p = profile(wealth);
  assert.equal(family(p,'인성').state,'잠재');
  assert.equal(trait(p,'정인').facts.visible,0);
  const text = lines(p).join('\n');
  assert.match(text,/지장간에만 관측/);
  assert.doesNotMatch(text,/정인\[.*욕구=/);
  assert.match(text,/능력·도덕성의 결여로 읽지 않는다/);
});

test('unconfirmed and confirmed jong candidates both avoid automatic ordinary-chart suppression', () => {
  for (const confirmedByUser of [false,true]) {
    const p = profile({...wealth,power:{isStrong:false},jong:{isJong:true,confirmedByUser}});
    assert.match(family(p,'재성').interpretation,/종격 후보/);
    assert.doesNotMatch(family(p,'재성').interpretation,/재다신약의 구조 후보/);
    assert.equal(p.facts.jongConfirmed,confirmedByUser);
  }
});

test('missing charts and power stay unknown; canonical strength text is read without free-form guessing', () => {
  assert.equal(profile({}),null);
  assert.deepEqual(lines({}),[]);
  assert.equal(profile(wealth).facts.isStrong,null);
  assert.equal(profile({...wealth,strength:'매우 강한 사람'}).facts.isStrong,null);
  assert.equal(profile({...wealth,strength:'억부 기준 신약: 일간을 돕는 기운이 약한 편'}).facts.isStrong,false);
  assert.equal(profile({...wealth,power:{isStrong:true},strength:'억부 기준 신약: 참고'}).facts.isStrong,true);
  const partial = {monthPillar:'己丑',dayPillar:'甲戌',hourPillar:'출생시간 미입력'};
  assert.deepEqual(profile(partial).facts.missingPillars,['year','hour']);
  assert.match(lines(partial).join('\n'),/부분 해석/);
});

test('all tied families remain priorities and co-presence is never a proven remedy', () => {
  const p = profile({timeUnknown:true,pillars:{year:'甲辰',month:'丙子',day:'甲申'}});
  assert.ok(p.leading.length > 1);
  const text = lines(p).join('\n');
  for (const name of p.leading) assert.ok(text.includes(`${name}:`));
  assert.match(text,/공존만으로 확정하지 않는다/);
});

test('only supplied natal exposure is cited; luck-only exposure cannot become a natal trait', () => {
  const p = profile({...wealth,advancedFactors:{hiddenStemExposures:[
    {hiddenStem:'己',exposedInNatalHeavenlyStem:true,exposedNatalPositions:['월간']},
    {hiddenStem:'戊',exposedInNatalHeavenlyStem:false,exposedByLuckStem:true,exposedLuckPositions:['2040년']},
  ]}});
  assert.equal(trait(p,'정재').facts.natalExposures.length,1);
  assert.equal(trait(p,'편재').facts.natalExposures.length,0);
  const text = lines(p).join('\n');
  assert.match(text,/제공된 원국 투간: 己/);
  assert.doesNotMatch(text,/2040/);
  assert.match(text,/통근의 성립·강도를 확정하지 않음/);
});

test('life-book, canonical fact snapshot, Korean and short-pillar adapters retain the same facts', () => {
  const chart = calculateLifeBookAiSaju({birthDate:'1997-02-10',birthTime:'14:30',gender:'female',calendarType:'solar'});
  const {factSnapshot} = buildSajuMyeongsikFactSnapshot({sajuResult:{pillars:Object.fromEntries(['year','month','day','hour'].map(k=>[k,{ganji:chart[k+'Pillar']}]))},power:chart.natalAnalysis.power,jong:chart.natalAnalysis.jong});
  assert.deepEqual(profile(chart).facts,profile(factSnapshot).facts);
  const short = {pillars:{y:{g:'戊',j:'辰'},m:{g:'己',j:'丑'},d:{g:'甲',j:'戌'},h:{g:'丙',j:'午'}}};
  const korean = {pillars:{year:'무진',month:'기축',day:'갑술',hour:'병오'}};
  assert.deepEqual(profile(short).facts,profile(korean).facts);
  assert.deepEqual(profile(short).facts,profile(wealth).facts);
});

test('existing ten-god profile gains temperament without replacing its distribution or exposing raw data', () => {
  const chart = calculateLifeBookAiSaju({birthDate:'1997-02-10',birthTime:'14:30',gender:'female',calendarType:'solar'});
  const old = buildTenGodProfile({tenGodsByPillar:chart.tenGodsByPillar,tenGods:chart.tenGods,strength:chart.natalAnalysis.power});
  const extended = buildTenGodProfile({...chart,strength:chart.natalAnalysis.power,birthDate:'PRIVATE_DATE',latitude:987.123});
  assert.deepEqual(old.surface,extended.surface);
  assert.deepEqual(old.leading,extended.leading);
  assert.equal(extended.temperament.facts.visibleCount,7);
  assert.doesNotMatch(JSON.stringify(extended),/PRIVATE_DATE|987\.123/);
  assert.match(SAJU_TEMPERAMENT_RULE,/도파민 수치·중독·질환·인격을 판정하지 않는다/);
});
