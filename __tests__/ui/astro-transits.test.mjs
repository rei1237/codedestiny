import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Positions come from astronomy-engine (a dev dependency the repo already uses at build time), injected as lonsAt.
// Expected dates are published ephemeris facts (retrograde stations, ingresses, eclipses), checked to ±1 day in KST.
const A = createRequire(import.meta.url)('astronomy-engine');
const source = readFileSync('js/core/astro/transits.js', 'utf8');
const charts = JSON.parse(readFileSync('__tests__/fixtures/astro-natal-charts.json', 'utf8'));
const context = vm.createContext({});
vm.runInContext(source, context);
const T = context.AstroTransits;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const lonsAt = ms => {
  const t = A.MakeTime(new Date(ms)), out = {};
  for (const b of BODIES) out[b] = A.Ecliptic(A.GeoVector(b, t, true)).elon;
  return out;
};
const plain = v => JSON.parse(JSON.stringify(v));
const dayGap = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
const near = (got, want, label) => assert.ok(got && dayGap(got, want) <= 1, `${label}: got ${got}, want ${want}±1`);

const TODAY = '2026-10-04';
const natal = T.natalOf(charts.b1.chart, true);
const untimed = T.natalOf(charts.b1.noon, false);
const year = T.period(natal, { today: '2026-01-01', lonsAt });

test('retrograde stations of 2026 match the published dates', () => {
  const span = body => year.retroPeriods.filter(r => r.body === body).map(r => [r.start.date, r.end.date]);
  const mercury = span('Mercury');
  [['2026-02-26', '2026-03-20'], ['2026-06-29', '2026-07-23'], ['2026-10-24', '2026-11-13']].forEach(([s, e], i) => {
    near(mercury[i] && mercury[i][0], s, `Mercury Rx ${i} start`);
    near(mercury[i] && mercury[i][1], e, `Mercury Rx ${i} end`);
  });
  const venus = span('Venus')[0];
  near(venus && venus[0], '2026-10-03', 'Venus Rx start');
  near(venus && venus[1], '2026-11-14', 'Venus Rx end');
  const mars = T.period(natal, { today: '2026-12-01', lonsAt }).retroPeriods.filter(r => r.body === 'Mars')[0];
  near(mars && mars.start.date, '2027-01-10', 'Mars Rx start');
  near(mars && mars.end.date, '2027-04-01', 'Mars Rx end');
});

test('outer-planet ingresses of 2026 match the published dates', () => {
  const first = (body, signIdx) => (year.ingresses.find(i => i.body === body && i.signIdx === signIdx && !i.back) || {}).at;
  near(first('Neptune', 0) && first('Neptune', 0).date, '2026-01-26', 'Neptune → Aries');
  near(first('Saturn', 0) && first('Saturn', 0).date, '2026-02-14', 'Saturn → Aries');
  near(first('Uranus', 2) && first('Uranus', 2).date, '2026-04-26', 'Uranus → Gemini');
  near(first('Jupiter', 4) && first('Jupiter', 4).date, '2026-06-30', 'Jupiter → Leo');
});

test('eclipses in the window come from the table and match the published dates', () => {
  // 2026-08-12 17:45 UTC is 08-13 02:45 in KST.
  assert.deepEqual(plain(year.eclipses.map(e => [e.at.date, e.kind, e.type])), [
    ['2026-02-17', 'solar', 'annular'], ['2026-03-03', 'lunar', 'total'],
    ['2026-08-13', 'solar', 'total'], ['2026-08-28', 'lunar', 'partial']
  ]);
});

test('the embedded eclipse table equals a fresh astronomy-engine search', () => {
  const rows = [], end = Date.parse('2037-01-01T00:00:00Z'), start = A.MakeTime(new Date('2024-01-01T00:00:00Z'));
  const lon = (body, t) => Math.round(A.Ecliptic(A.GeoVector(body, t, true)).elon * 100) / 100;
  for (let s = A.SearchGlobalSolarEclipse(start); s.peak.date.getTime() < end; s = A.NextGlobalSolarEclipse(s.peak)) rows.push([s.peak.date.toISOString().slice(0, 16), 'solar', s.kind, lon('Sun', s.peak)]);
  for (let l = A.SearchLunarEclipse(start); l.peak.date.getTime() < end; l = A.NextLunarEclipse(l.peak)) rows.push([l.peak.date.toISOString().slice(0, 16), 'lunar', l.kind, lon('Moon', l.peak)]);
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(plain(T._calc.ECLIPSES), rows);
});

test('new and full moons are about 29.5 days apart and alternate', () => {
  const ls = year.lunations;
  assert.ok(ls.length >= 24 && ls.length <= 26, String(ls.length));
  for (let i = 2; i < ls.length; i++) {
    assert.notEqual(ls[i].kind, ls[i - 1].kind);
    const d = dayGap(ls[i].at.date, ls[i - 2].at.date);
    assert.ok(d >= 28 && d <= 31, `${ls[i - 2].at.date} → ${ls[i].at.date}`);
  }
});

test('timeline events carry dated windows inside the orb and stay inside the 12 months', () => {
  const r = T.period(natal, { today: TODAY, lonsAt });
  assert.equal(r.from, TODAY);
  assert.equal(r.to, '2027-10-03');
  assert.ok(r.events.length > 0);
  for (const e of r.events) {
    assert.ok(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(e.transit));
    assert.ok(e.start.ms <= e.peak.ms + 86400000 && e.peak.ms <= e.end.ms + 86400000, JSON.stringify(e));
    assert.ok(e.end.date >= r.from && e.start.date <= r.to, JSON.stringify(e));
    assert.ok(e.closestOrb <= 3);
    for (const x of e.exacts) {
      const p = lonsAt(x.ms)[e.transit], n = natal.points[e.natal];
      const want = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }[e.type];
      const d = Math.abs(((p - n + 540) % 360) - 180);
      assert.ok(Math.abs(d - want) < 0.05, `${e.transit} ${e.type} ${e.natal} exact ${x.date}: off ${Math.abs(d - want)}`);
    }
  }
  assert.ok(r.top.length >= 1 && r.top.length <= 5);
});

test('a different date gives a different window and the same date gives the same model', () => {
  const a = T.period(natal, { today: TODAY, lonsAt }), b = T.period(natal, { today: '2027-03-01', lonsAt });
  assert.notDeepEqual(plain(a.events), plain(b.events));
  assert.deepEqual(plain(a), plain(T.period(natal, { today: TODAY, lonsAt })));
  assert.deepEqual(plain(T.today(natal, { today: TODAY, lonsAt })), plain(T.today(natal, { today: TODAY, lonsAt })));
  assert.notDeepEqual(plain(T.today(natal, { today: TODAY, lonsAt }).moon), plain(T.today(natal, { today: '2026-10-05', lonsAt }).moon));
});

test('today: the Moon sign, phase and sign change agree with direct positions', () => {
  for (const day of ['2026-10-04', '2026-10-10', '2026-10-18', '2026-10-26']) {
    const r = T.today(natal, { today: day, lonsAt });
    const noon = Date.parse(day + 'T03:00:00Z'), L = lonsAt(noon);
    assert.equal(r.moon.signIdx, Math.floor(L.Moon / 30), day);
    assert.equal(r.sun.signIdx, Math.floor(L.Sun / 30), day);
    const start = Date.parse(day + 'T00:00:00+09:00'), end = start + 86400000;
    const changes = Math.floor(lonsAt(start).Moon / 30) !== Math.floor(lonsAt(end - 60000).Moon / 30);
    assert.equal(!!r.moon.ingress, changes, day);
    if (r.moon.ingress) {
      const t = r.moon.ingress.at.ms;
      assert.equal(Math.floor(lonsAt(t + 120000).Moon / 30), r.moon.ingress.signIdx, day);
      assert.notEqual(Math.floor(lonsAt(t - 120000).Moon / 30), r.moon.ingress.signIdx, day);
    }
    for (const v of r.moon.voids) assert.ok(v.from.ms <= v.to.ms && v.inDay.from.date === day, JSON.stringify(v));
  }
  const fullDay = year.lunations.find(l => l.kind === 'full' && l.at.date >= '2026-10-01');
  assert.equal(T.today(natal, { today: fullDay.at.date, lonsAt }).moon.phase, 'full');
});

test('today: hits are within the orb, sorted by strength, and scores stay in range', () => {
  const r = T.today(natal, { today: TODAY, lonsAt });
  for (let i = 1; i < r.hits.length; i++) assert.ok(r.hits[i - 1].strength >= r.hits[i].strength);
  assert.ok(r.top.length <= 3);
  for (const k of ['love', 'work', 'money', 'people', 'condition']) assert.ok(r.scores[k] >= 32 && r.scores[k] <= 95, k);
  assert.ok(r.retro.includes('Venus'), 'Venus is retrograde on 2026-10-04');
});

test('without a birth time the Moon, ASC, MC and houses are left out', () => {
  assert.equal(untimed.timeKnown, false);
  assert.equal(untimed.cusps, null);
  for (const k of ['Moon', 'ASC', 'MC']) assert.equal(untimed.points[k], undefined, k);
  const y = T.period(untimed, { today: TODAY, lonsAt }), d = T.today(untimed, { today: TODAY, lonsAt });
  assert.ok(y.events.every(e => !['Moon', 'ASC', 'MC'].includes(e.natal) && e.house === null));
  assert.ok(d.hits.every(h => !['Moon', 'ASC', 'MC'].includes(h.natal)));
  assert.equal(d.moon.house, null);
  assert.ok(natal.timeKnown && natal.cusps.length === 12 && natal.points.ASC != null);
});

test('lonsFromChart reads the chart shape the page already has', () => {
  const lons = T.lonsFromChart(charts.b1.chart);
  for (const b of BODIES) assert.ok(Math.abs(lons[b] - natal.points[b]) < 1e-9 || b === 'Moon', b);
  assert.throws(() => T.today(natal, { today: TODAY }), /lonsAt/);
  assert.throws(() => T.period(natal, { today: '2026/10/04', lonsAt }), /YYYY-MM-DD/);
});
