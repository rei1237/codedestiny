import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Fixture charts are calcAstroSwissChartOrThrow(...) results dumped once from the browser (Swiss wasm, Placidus):
// b1 1990-10-14 14:30 Seoul, b2 1985-03-02 06:10 Busan, b3 2001-07-21 22:45 Seoul, x1–x12 more Seoul births.
// `noon` is the same day at 12:00 (what the page uses without a birth time); moonDay is the Moon's sign at 00:00 and 23:59.
const source = readFileSync('js/core/astro/natal-reading.js', 'utf8');
const charts = JSON.parse(readFileSync('__tests__/fixtures/astro-natal-charts.json', 'utf8'));
const context = vm.createContext({});
vm.runInContext(source, context);
const reading = context.AstroNatalReading;
const TODAY = '2026-10-04';
const SIGN = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const plain = v => JSON.parse(JSON.stringify(v));
const timed = tag => reading.build(charts[tag].chart, { timeKnown: true, today: TODAY, name: '테스트', birth: charts[tag].birth });
const untimed = tag => reading.build(charts[tag].noon, { timeKnown: false, today: TODAY, birth: charts[tag].birth, moonDay: charts[tag].moonDay });
const lonOf = (chart, body) => {
  const p = body === 'Sun' ? chart.sun : body === 'Moon' ? chart.moon : body === 'ASC' ? chart.asc : body === 'MC' ? chart.mc : chart.planets[body].sign;
  return (p.idx * 30 + p.deg) % 360;
};
// Independent Placidus lookup: the house whose cusp is the last one passed going round the zodiac.
const houseOf = (chart, lon) => {
  const c = chart.houseCuspsLon;
  let best = 0, bestOff = 361;
  c.forEach((cusp, i) => { const off = (lon - cusp + 360) % 360; if (off < bestOff) { bestOff = off; best = i; } });
  return best + 1;
};
const evidenceOf = model => model.categories.flatMap(c => c.factors.flatMap(f => f.ev));

test('the same chart and date give the same model', () => {
  for (const tag of Object.keys(charts)) {
    assert.deepEqual(plain(timed(tag)), plain(timed(tag)), tag);
    assert.deepEqual(plain(untimed(tag)), plain(untimed(tag)), tag);
  }
});

test('evidence signs and houses match the chart', () => {
  for (const tag of Object.keys(charts)) {
    const chart = charts[tag].chart;
    for (const ev of evidenceOf(timed(tag))) {
      if (BODIES.includes(ev.body)) {
        const lon = lonOf(chart, ev.body);
        assert.equal(ev.signIdx, Math.floor(lon / 30), `${tag} ${ev.body} sign`);
        assert.equal(ev.house, houseOf(chart, lon), `${tag} ${ev.body} house`);
        assert.ok(ev.label.includes(SIGN[ev.signIdx]) && ev.label.includes(ev.house + '번째 집'), `${tag} ${ev.label}`);
      } else if (ev.body === 'house') {
        assert.equal(ev.signIdx, Math.floor(chart.houseCuspsLon[ev.house - 1] / 30), `${tag} cusp ${ev.house}`);
        assert.ok(ev.label.startsWith(ev.house + '번째 집 · ' + SIGN[ev.signIdx]), `${tag} ${ev.label}`);
      } else if (ev.body === 'ASC' || ev.body === 'MC') {
        assert.equal(ev.signIdx, chart[ev.body.toLowerCase()].idx, `${tag} ${ev.body}`);
        assert.ok(ev.label.includes(SIGN[ev.signIdx]), `${tag} ${ev.label}`);
      }
      if (ev.aspect) {
        const angle = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }[ev.aspect.type];
        let d = Math.abs(lonOf(chart, ev.body) - lonOf(chart, ev.aspect.with)); if (d > 180) d = 360 - d;
        assert.ok(Math.abs(Math.abs(d - angle) - ev.aspect.orb) < 0.06, `${tag} ${ev.body}-${ev.aspect.with} orb`);
      }
    }
  }
});

test('every category leads with its anchor and gives three factors for a timed chart', () => {
  for (const tag of Object.keys(charts)) {
    const model = timed(tag);
    assert.deepEqual(plain(model.categories.map(c => c.id)), ['love', 'money', 'people', 'work', 'heal', 'growth']);
    for (const c of model.categories) {
      assert.equal(c.factors.length, 3, `${tag} ${c.id}`);
      assert.ok(c.factors[0].data.anchor, `${tag} ${c.id} anchor`);
      assert.ok(c.factors.every(f => f.ev.length >= 1), `${tag} ${c.id} evidence`);
    }
  }
});

test('traditional dignities, rulers and the 1990 chart periods are computed by the rules', () => {
  const { dignity, RULER } = reading._calc;
  assert.equal(dignity('Venus', 6), 5); assert.equal(dignity('Venus', 11), 4); assert.equal(dignity('Venus', 0), -5); assert.equal(dignity('Venus', 5), -4);
  assert.equal(dignity('Mercury', 5), 5); assert.equal(dignity('Mercury', 11), -5); assert.equal(dignity('Uranus', 10), 0);
  assert.equal(RULER[10], 'Saturn'); assert.equal(RULER[7], 'Mars'); assert.equal(RULER[11], 'Jupiter');
  // b1: Sun in the 8th house (above the horizon) → day chart; age 35 on 2026-10-04 (birthday 10-14 not reached).
  const p = timed('b1').periods;
  assert.equal(p.sect, 'day'); assert.equal(p.age, 35);
  // Profection: 35 % 12 = 11 → 12th house from an Aquarius ASC = Capricorn, ruled by Saturn.
  assert.deepEqual(plain(p.profection), { age: 35, house: 12, signIdx: 9, lord: 'Saturn' });
  // Day firdaria: Sun 10, Venus 8, Mercury 13, then Moon 9 (ages 31–40); Moon sub-periods start Moon, Saturn, Jupiter, Mars.
  assert.equal(p.firdaria.current.lord, 'Moon'); assert.equal(p.firdaria.current.fromYear, 2021); assert.equal(p.firdaria.current.toYear, 2030);
  assert.equal(p.firdaria.current.sub.lord, 'Mars'); assert.equal(p.firdaria.next.lord, 'Saturn');
  // b3 is born at night: the Moon opens the night sequence.
  assert.equal(timed('b3').periods.sect, 'night'); assert.equal(timed('b3').periods.firdaria.list[0].lord, 'Moon');
});

test('without a birth time no house, first-impression, MC or period claim is made', () => {
  for (const tag of Object.keys(charts)) {
    const model = untimed(tag);
    assert.equal(model.timeKnown, false);
    assert.equal(model.periods.profection, null); assert.equal(model.periods.firdaria, null); assert.equal(model.periods.sect, null);
    assert.ok(model.planets.every(p => p.house === null && p.wholeHouse === null), tag);
    assert.ok(!model.cover.big3.some(b => b.key === 'ASC'), tag);
    for (const ev of evidenceOf(model)) {
      assert.equal(ev.house, undefined, `${tag} ${ev.label}`);
      assert.ok(!['ASC', 'MC', 'house', 'profection', 'firdaria'].includes(ev.body), `${tag} ${ev.body}`);
      assert.doesNotMatch(ev.label, /번째 집|첫인상|사회에서 보이는/, `${tag} ${ev.label}`);
    }
    assert.ok(!model.aspects.some(a => ['Moon', 'ASC', 'MC'].includes(a.a) || ['Moon', 'ASC', 'MC'].includes(a.b)), tag);
    assert.ok(model.categories.every(c => c.factors.length === 3), tag);
  }
  // b1's Moon changes sign that day (Leo → Virgo): both signs are named, never just one.
  const b1 = untimed('b1');
  assert.deepEqual(plain(b1.cover.big3[1].signs), [4, 5]);
  assert.ok(evidenceOf(b1).filter(ev => ev.body === 'Moon').every(ev => ev.label.includes('사자자리 또는 처녀자리')));
});

test('the module stays pure: no clock, randomness, storage, DOM or requests', () => {
  for (const banned of [/new Date\(/, /Date\.now/, /Math\.random/, /\bfetch\(/, /XMLHttpRequest/, /localStorage|sessionStorage/, /\bdocument\./]) {
    assert.doesNotMatch(source, banned, String(banned));
  }
});
