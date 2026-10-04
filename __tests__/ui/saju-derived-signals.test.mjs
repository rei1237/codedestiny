import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAJU_HEALTH_DISCLAIMER, buildElementProfile, buildMovementSignals, buildSajuHealthBasis, buildTenGodProfile,
} from '../../worker/lib/saju-derived-signals.js';

const earthHeavy = {ratios:{wood:11.1, fire:11.1, earth:44.4, metal:0, water:33.3}, counts:{wood:1, fire:1, earth:4, metal:0, water:3}};
const byElement = profile => Object.fromEntries(profile.elements.map(e => [e.element, e]));

test('element profile: earth excess carries its temperament, zero metal is missing, thin elements are weak', () => {
  const profile = buildElementProfile(earthHeavy);
  const e = byElement(profile);
  assert.equal(e.earth.state, '과다');
  assert.match(e.earth.temperament, /신중|듬직/);
  assert.equal(e.metal.state, '결핍');
  assert.match(e.metal.temperament, /경계/);
  assert.deepEqual(profile.excess, ['earth', 'water']);
  assert.deepEqual(profile.missing, ['metal']);
  assert.deepEqual(profile.weak, ['wood', 'fire']);
  assert.equal(e.wood.temperament, undefined);
});

test('element profile: wood and metal excess describe their own temperament', () => {
  const wood = byElement(buildElementProfile({ratios:{wood:33.3, fire:22.2, earth:22.2, metal:11.1, water:11.1}, counts:{wood:3, fire:2, earth:2, metal:1, water:1}}));
  assert.equal(wood.wood.state, '과다');
  assert.match(wood.wood.temperament, /추진력/);
  const metal = byElement(buildElementProfile({ratios:{wood:11.1, fire:22.2, earth:22.2, metal:33.3, water:11.1}, counts:{wood:1, fire:2, earth:2, metal:3, water:1}}));
  assert.equal(metal.metal.state, '과다');
  assert.match(metal.metal.temperament, /원칙/);
});

test('ten-god profile: visible officer cluster is developed, weak self adds the pressure note, combos come from surface stems', () => {
  const profile = buildTenGodProfile({
    tenGodsByPillar:{
      year:{stemTenGod:'편관', primaryHiddenTenGod:'편관', hiddenStemTenGods:[{tenGod:'편관'}, {tenGod:'정인'}]},
      month:{stemTenGod:'정관', primaryHiddenTenGod:'편관', hiddenStemTenGods:[{tenGod:'편관'}]},
      day:{stemTenGod:'일간', primaryHiddenTenGod:'식신', hiddenStemTenGods:[{tenGod:'식신'}]},
      hour:{stemTenGod:'편재', primaryHiddenTenGod:'겁재', hiddenStemTenGods:[{tenGod:'겁재'}]},
    },
    strength:{isStrong:false},
  });
  const fam = Object.fromEntries(profile.families.map(f => [f.family, f]));
  assert.equal(profile.visibleCount, 7);
  assert.equal(fam.관성.visible, 4);
  assert.equal(fam.관성.state, '발달');
  assert.match(fam.관성.note, /관살태과/);
  assert.equal(fam.인성.state, '잠재');
  assert.deepEqual(profile.leading, ['관성']);
  assert.deepEqual(profile.combos.map(c => c.name), ['식상생재', '식신제살', '관살혼잡']);
  assert.deepEqual(profile.where.편관, ['년주 천간', '년주 지지', '월주 지지']);
});

test('ten-god profile: crowded peers over visible wealth and wealth over a weak self are flagged only when they hold', () => {
  const tenGodsByPillar = {
    year:{stemTenGod:'비견', primaryHiddenTenGod:'편재'},
    month:{stemTenGod:'겁재', primaryHiddenTenGod:'정재'},
    day:{stemTenGod:'일간', primaryHiddenTenGod:'비견'},
    hour:{stemTenGod:'편재', primaryHiddenTenGod:'식신'},
  };
  const names = strength => buildTenGodProfile({tenGodsByPillar, strength}).combos.map(c => c.name);
  assert.ok(names({isStrong:false}).includes('군겁쟁재'));
  assert.ok(names({isStrong:false}).includes('재다신약'));
  assert.ok(!names({}).includes('재다신약'));
});

test('movement signals: chou-wei clash, adjacent repeated stems and horse star combine into the overseas reading and dated periods', () => {
  const movement = buildMovementSignals({
    pillars:{year:'丁丑', month:'壬寅', day:'壬申', hour:'丁未'},
    natalInteractions:{branchClashes:[{type:'clash', label:'축미충', pillars:['year', 'hour'], values:['丑', '未']}]},
    shinsal:{byName:{역마살:{present:true, targets:['巳(사)', '亥(해)'], hits:[]}}},
    yearlyLuck:[
      {year:2027, pillar:'丁未', natalInteractions:{branchClashes:[{label:'축미충', pillars:['year', 'luck'], values:['丑', '未']}]}},
      {year:2030, pillar:'庚戌', natalInteractions:{branchClashes:[]}},
      {year:2031, pillar:'辛亥', natalInteractions:{branchClashes:[]}},
    ],
    majorLuck:{currentCycle:{pillar:'乙巳', startAge:28, endAge:37}},
  });
  assert.deepEqual(movement.natal.clashes.map(c => c.label), ['축미충']);
  assert.deepEqual(movement.natal.stemRepeats.map(r => [r.stem, r.adjacent]), [['丁', false], ['壬', true]]);
  assert.deepEqual(movement.natal.saengji.map(s => s.branch), ['寅', '申']);
  assert.deepEqual(movement.overseas.indicators, {stemRepeat:true, yeokmaOrSaengji:true, clash:true});
  assert.equal(movement.overseas.strength, '뚜렷');
  assert.deepEqual(movement.periods.map(p => p.year), [2027, 2031]);
  const [y2027, y2031] = movement.periods;
  assert.equal(y2027.clash, true);
  assert.deepEqual(y2027.stemEcho, ['year', 'hour']);
  assert.equal(y2031.yeokmaYear, true);
  assert.equal(y2031.saengjiYear, true);
  assert.deepEqual([movement.majorLuck.ageRange, movement.majorLuck.yeokma, movement.majorLuck.saengji], ['28-37', true, true]);
  assert.equal(movement.limitation, undefined);
});

test('movement signals: no luck data states the limitation and a quiet chart reads weak', () => {
  const movement = buildMovementSignals({pillars:{year:'甲子', month:'丙辰', day:'戊辰', hour:'辛酉'}});
  assert.equal(movement.overseas.strength, '약함');
  assert.deepEqual(movement.periods, []);
  assert.equal(movement.majorLuck, undefined);
  assert.match(movement.limitation, /이동 시기는 다루지 않는다/);
});

test('health basis: out-of-balance elements become rhythm and care notes with the report disclaimer and no medical claims', () => {
  const basis = buildSajuHealthBasis({fiveElements:earthHeavy, seasonalBalance:{type:'cold', moistType:'wet'}, dayMaster:'戊'});
  const focus = Object.fromEntries(basis.focus.map(f => [f.element, f]));
  assert.deepEqual(Object.keys(focus), ['wood', 'fire', 'earth', 'metal', 'water']);
  assert.equal(focus.earth.rhythm, '비위 리듬');
  assert.match(focus.earth.message, /무겁/);
  assert.match(focus.metal.message, /경계와 정리/);
  assert.equal(basis.dayMaster.stem, '戊');
  assert.ok(basis.climate.temperature && basis.climate.moisture);
  assert.equal(basis.disclaimer, SAJU_HEALTH_DISCLAIMER);
  const prose = JSON.stringify([basis.focus, basis.dayMaster, basis.climate]);
  assert.doesNotMatch(prose, /질환|질병|병에 걸|당뇨|고혈압|처방|복용/);
});
