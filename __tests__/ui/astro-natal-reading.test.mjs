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

// Visible text of the story fragment, one line per element; sentences of 15+ characters are what a reader would notice repeating.
const storyText = model => reading.render(model).replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const sentencesOf = text => text.split(/\n+/).flatMap(l => l.split(/(?<=[.?!])\s+/)).map(s => s.trim()).filter(s => s.length >= 15 && !s.includes('·'));
const BANNED = [/Placidus|Whole Sign|플라시더스|홀사인|\d+H\b/, /체감:|큰 흐름:|키워드:|자세히 보기/, /어스펙트|오브|orb|룰러/i, /\([A-Z][a-z]+\)/, /\)\)/, /^\d\)|\([a-c]\)/m, /#\S/];

test('every verdict can be turned into a "…지만" clause', () => {
  const { SIGN_STYLE, PROF, contrast } = reading._calc;
  const gists = Object.values(SIGN_STYLE).flatMap(rows => rows.map(r => r[0])).concat(PROF.map(r => r[0]));
  assert.equal(gists.length, 84);
  for (const g of gists) assert.ok(contrast(g) && contrast(g).endsWith('지만'), g);
  assert.equal(contrast('천천히 깊어지는 오래가는 사랑을 원해요'), '천천히 깊어지는 오래가는 사랑을 원하지만');
  assert.equal(contrast('말이 잘 통하는 사람에게 먼저 끌려요'), '말이 잘 통하는 사람에게 먼저 끌리지만');
  assert.equal(contrast('올해는 시야를 넓히는 해예요'), '올해는 시야를 넓히는 해이지만');
});

test('the first layer reads in plain words, says no sentence twice and stays short', () => {
  for (const tag of Object.keys(charts)) {
    for (const model of [timed(tag), untimed(tag)]) {
      const text = storyText(model), seen = new Set();
      for (const banned of BANNED) assert.doesNotMatch(text, banned, `${tag} ${banned}`);
      for (const s of sentencesOf(text)) {
        assert.ok(!seen.has(s), `${tag} repeats: ${s}`); seen.add(s);
        assert.ok(s.length <= 64, `${tag} too long: ${s}`);
      }
      assert.ok(model.categories.every(c => c.bullets.length === 3 && c.conclusion && c.scene && c.action), tag);
    }
  }
});

test('b1, b2 and b3 get different verdicts in at least five of six areas', () => {
  const verdicts = ['b1', 'b2', 'b3'].map(tag => timed(tag).categories.map(c => c.conclusion));
  const distinct = verdicts[0].filter((_, i) => new Set(verdicts.map(v => v[i])).size === 3).length;
  assert.ok(distinct >= 5, String(distinct));
});

test('without a birth time the story names no house, first impression or MC and notes the missing time once', () => {
  for (const tag of Object.keys(charts)) {
    const model = untimed(tag), text = storyText(model), note = model.notes.timeNote;
    assert.ok(note, tag);
    assert.equal(text.split(note).length - 1, 1, tag);
    assert.doesNotMatch(text.replace(note, ''), /번째 집|첫인상|사회에서 보이는/, tag);
    assert.equal(timed(tag).notes.timeNote, null, tag);
  }
  // A Moon that changed sign that day is never read from one sign alone.
  const b1 = untimed('b1'), heal = b1.categories.find(c => c.id === 'heal');
  assert.match(heal.conclusion, /진심 어린 인정.*세심한 배려/);
  assert.equal(heal.fit, null);
  assert.match(heal.caution, /인정받고 싶은 조급함.*완벽주의/);
});

test('the chart table shows each position as sign and 20°36′, houses only with a time, and the house footnote only when systems differ', () => {
  for (const tag of Object.keys(charts)) {
    const m = timed(tag), html = reading.renderChart(m);
    for (const p of m.planets) assert.ok(html.includes(p.sign + '</span> <span class="as-deg">' + p.degText + '</span>'), tag + ' ' + p.body);
    assert.equal((html.match(/<td class="as-num">/g) || []).length, m.planets.length + 2, tag);
    assert.equal(html.includes('as-foot'), m.planets.some(p => p.house !== p.wholeHouse), tag);
    const u = untimed(tag), uh = reading.renderChart(u);
    assert.doesNotMatch(uh, /as-num|as-wheel-cusp|as-wheel-axis|ASC|MC|as-foot/, tag);
    assert.equal(uh.includes('또는'), !!u.notes.moonSigns, tag);
  }
  const same = timed('b1');
  same.planets.forEach(p => { p.wholeHouse = p.house; });
  assert.doesNotMatch(reading.renderChart(same), /as-foot/);
  assert.equal(reading._calc.degText(20.6), '20°36′');
});

// The deep layer minus its "how it was computed" fold, which is the one place method names are allowed.
const deepText = model => reading.renderDeep(model).replace(/<details class="as-calc">[\s\S]*?<\/details>/, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

test('the deep layer reads every planet and the closest aspects without repeating the story', () => {
  for (const tag of Object.keys(charts)) {
    for (const model of [timed(tag), untimed(tag)]) {
      const d = model.deep, text = deepText(model);
      assert.deepEqual(plain(d.planets.map(p => p.body)), BODIES, tag);
      for (const p of d.planets) assert.ok(p.line && p.text.length >= 2 && p.text.length <= 3, `${tag} ${p.body}`);
      assert.ok(d.talk.length <= 5 && d.talk.every((t, i) => BODIES.includes(t.a) && BODIES.includes(t.b) && (!i || d.talk[i - 1].orb <= t.orb)), tag);
      for (const banned of BANNED) assert.doesNotMatch(text, banned, `${tag} ${banned}`);
      // Sentences only: aspect-type labels such as "부딪히며 키우는 사이(사각)" may repeat.
      const all = sentencesOf(storyText(model) + '\n' + text).filter(s => s.endsWith('.'));
      assert.equal(new Set(all).size, all.length, `${tag} ${all.filter((s, i) => all.indexOf(s) !== i)}`);
    }
  }
});

test('the deep layer gives periods only with a birth time and names no house without one', () => {
  for (const tag of Object.keys(charts)) {
    const t = timed(tag).deep, u = untimed(tag);
    assert.deepEqual(plain(t.periods.items.map(i => i.key)), ['firdaria', 'profection'], tag);
    assert.equal(u.deep.periods.items.length, 0, tag);
    assert.ok(u.deep.periods.timeless, tag);
    assert.doesNotMatch(deepText(u), /번째 집|첫인상|사회에서 보이는|MC/, tag);
    assert.ok(u.deep.calc.some(c => c.includes('정오')) && !u.deep.calc.some(c => /플라시더스|75년/.test(c)), tag);
  }
});
