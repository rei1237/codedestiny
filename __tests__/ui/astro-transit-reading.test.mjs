import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// The today card: AstroTransits.today() (positions from astronomy-engine) → AstroTransitReading.today()/renderToday().
const A = createRequire(import.meta.url)('astronomy-engine');
const context = vm.createContext({});
vm.runInContext(readFileSync('js/core/astro/transits.js', 'utf8'), context);
vm.runInContext(readFileSync('js/core/astro/transit-reading.js', 'utf8'), context);
const T = context.AstroTransits, R = context.AstroTransitReading;
const charts = JSON.parse(readFileSync('__tests__/fixtures/astro-natal-charts.json', 'utf8'));
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const lonsAt = ms => {
  const t = A.MakeTime(new Date(ms)), out = {};
  for (const b of BODIES) out[b] = A.Ecliptic(A.GeoVector(b, t, true)).elon;
  return out;
};
const plain = v => JSON.parse(JSON.stringify(v));
const card = (natal, day) => R.today(T.today(natal, { today: day, lonsAt }));
const DAYS = ['2026-10-04', '2026-10-07', '2026-10-12', '2026-10-24', '2027-01-15'];
const natals = Object.keys(charts).flatMap(k => [T.natalOf(charts[k].chart, true), T.natalOf(charts[k].noon, false)]);
// Body text only: the "왜 이렇게 봤나요" fold is where planet-aspect names, degrees and house numbers may appear.
const bodyText = html => html.replace(/<details class="as-why">[\s\S]*?<\/details>/g, '').replace(/<[^>]+>/g, '\n');

test('a different date changes the sentences and scores; the same date repeats them exactly', () => {
  const natal = natals[0];
  const a = card(natal, '2026-10-04'), b = card(natal, '2026-10-07');
  assert.notDeepEqual(plain(a.moon), plain(b.moon));
  assert.notDeepEqual(plain(a.cats.map(c => c.score)), plain(b.cats.map(c => c.score)));
  assert.notEqual(a.headline + a.hits.map(h => h.text).join(), b.headline + b.hits.map(h => h.text).join());
  assert.equal(R.renderToday(a), R.renderToday(card(natal, '2026-10-04')));
});

test('the card body is plain words: no degrees, house numbers, abbreviations or template holes', () => {
  const banned = [/°/, /번째 집/, /하우스/, /H \//, /체감:/, /큰 흐름:/, /Placidus/, /\bMC\b/, /\bASC\b/, /Desc/, /\{|\}/, /undefined|NaN|null/, /보이드/];
  for (const natal of natals) {
    for (const day of DAYS) {
      const html = R.renderToday(card(natal, day)), body = bodyText(html);
      for (const re of banned) assert.ok(!re.test(body), `${day} ${re}: ${body.match(re) && body.slice(Math.max(0, body.search(re) - 40), body.search(re) + 40)}`);
      assert.match(html, /<details class="as-why"><summary>왜 이렇게 봤나요<\/summary>/);
    }
  }
});

test('no sentence repeats inside one card, and each picked sky event is a different planet', () => {
  for (const natal of natals) {
    for (const day of DAYS) {
      const d = card(natal, day);
      const lines = [d.headline, ...d.moon, ...d.voids, ...d.hits.flatMap(h => [h.text, h.action]), ...d.notes, ...d.cats.map(c => c.line)];
      const sentences = lines.flatMap(l => l.split(/(?<=[.요])\s+/)).map(s => s.trim()).filter(Boolean);
      assert.equal(new Set(sentences).size, sentences.length, `${day}: ${sentences.filter((s, i) => sentences.indexOf(s) !== i)}`);
      assert.equal(new Set(d.hits.map(h => h.key.split('-')[0])).size, d.hits.length);
      assert.ok(d.hits.length <= 3);
      assert.deepEqual(plain(d.cats.map(c => c.id)), ['love', 'work', 'money', 'people', 'condition']);
    }
  }
});

test('without a birth time the card skips the life-area line and asks for the time', () => {
  const timed = card(T.natalOf(charts.b1.chart, true), '2026-10-04');
  const untimed = card(T.natalOf(charts.b1.noon, false), '2026-10-04');
  assert.ok(timed.moon.some(l => l.includes('영역을 지나요')));
  assert.ok(!untimed.moon.some(l => l.includes('영역을 지나요')));
  assert.equal(timed.timeNote, '');
  assert.match(untimed.timeNote, /출생 시간을 넣으면/);
  assert.ok(untimed.hits.every(h => !/첫인상|일과 평판/.test(h.text.split(' — ')[0])));
});

test('times read the way people say them and particles follow the last syllable', () => {
  const { clock, josa, dateLabel } = R._text;
  assert.equal(clock('00:00'), '자정');
  assert.equal(clock('12:00'), '정오');
  assert.equal(clock('00:21'), '새벽 0시 21분');
  assert.equal(clock('09:05'), '오전 9시 5분');
  assert.equal(clock('15:00'), '오후 3시');
  assert.equal(josa('금성', '과', '와'), '금성과');
  assert.equal(josa('첫인상', '을', '를'), '첫인상을');
  assert.equal(josa('일과 평판', '과', '와'), '일과 평판과');
  assert.equal(dateLabel('2026-10-04'), '10월 4일 일요일');
});

// The paid 12-month flow: AstroTransits.period() + natal periods → AstroTransitReading.year()/renderYear().
vm.runInContext(readFileSync('js/core/astro/natal-reading.js', 'utf8'), context);
const N = context.AstroNatalReading;
const yearOf = (key, timeKnown, day) => {
  const c = charts[key], chart = timeKnown ? c.chart : c.noon;
  const periods = N.build(chart, { timeKnown, today: day, birth: c.birth, moonDay: c.moonDay }).periods;
  return R.year(T.period(T.natalOf(chart, timeKnown), { today: day, lonsAt, tz: 9 }), { periods, birth: c.birth });
};
const YEARS = [['b1', true, '2026-10-04'], ['b1', false, '2026-10-04'], ['b2', true, '2027-03-15'], ['x5', false, '2026-12-28']].map(([k, tk, d]) => ({ k, tk, d, y: yearOf(k, tk, d) }));

test('the year runs 12 calendar months from today, each with one to three dated lines', () => {
  for (const { d, y } of YEARS) {
    assert.equal(y.from, d);
    assert.equal(y.months.length, 12);
    assert.equal(y.months[0].key, d.slice(0, 7));
    assert.equal(y.months.filter(m => m.level === 'top').length <= 1, true);
    for (const m of y.months) {
      assert.match(m.label, /^\d{4}년 \d{1,2}월$/);
      assert.ok(m.items.length >= 1 && m.items.length <= 3, `${m.key}: ${m.items.length}`);
    }
    // Every "when" a reader sees carries a year: big events, field lines and theme lines all start with one.
    for (const b of y.big) { assert.match(b.range, /\d{4}년 \d{1,2}월 \d{1,2}일|앞으로 12개월/); assert.match(b.peak, /\d{4}년 \d{1,2}월 \d{1,2}일/); }
    for (const f of y.fields) for (const l of [...f.good, ...f.caution]) assert.match(l, /^(\d{4}년 \d{1,2}월 \d{1,2}일|지금 ~ \d{4}년|앞으로 12개월|.+ 쪽은 )/, l);
  }
});

test('the free preview names only the month, never the planet or the life area', () => {
  for (const { y } of YEARS) {
    const head = R.renderYearSection(y, '');
    assert.match(y.preview.line, /^앞으로 12개월 중 가장 큰 변화는 \d{4}년 \d{1,2}월에 와요\.$|잔잔하게/);
    assert.ok(!/태양|달의|수성|금성|화성|목성|토성|천왕성|해왕성|명왕성|첫인상|평판|역행|일식|월식/.test(bodyText(head)), bodyText(head));
    assert.match(head, /^<section class="as-reading as-year" id="asYear"/);
  }
});

test('the locked body is plain words with no repeats inside a month or a field', () => {
  const banned = [/°/, /번째 집/, /하우스/, /H \//, /체감:/, /큰 흐름:/, /Placidus/, /\bMC\b/, /\bASC\b/, /Desc/, /\{|\}/, /undefined|NaN|null/, /프로펙션|피르다리아|트랜짓/];
  for (const { k, y } of YEARS) {
    const body = bodyText(R.renderYear(y));
    for (const re of banned) assert.ok(!re.test(body), `${k} ${re}: ${body.match(re) && body.slice(Math.max(0, body.search(re) - 40), body.search(re) + 40)}`);
    const groups = [...y.months.map(m => m.items), ...y.fields.flatMap(f => [f.good, f.caution]), y.theme];
    for (const lines of groups) {
      const tails = lines.flatMap(l => l.split(' — ').slice(1)).flatMap(l => l.split(/(?<=[.요])\s+/)).filter(s => !/^가장 강한 날/.test(s));
      assert.equal(new Set(tails).size, tails.length, `${k}: ${tails.filter((s, i) => tails.indexOf(s) !== i)}`);
      assert.equal(new Set(lines).size, lines.length);
    }
  }
});

test('without a birth time the year skips angle events and the yearly theme, and asks for the time', () => {
  const timed = YEARS[0].y, untimed = YEARS[1].y;
  assert.ok(timed.theme.length >= 2);
  assert.equal(timed.timeNote, '');
  assert.equal(untimed.theme.length, 0);
  assert.match(untimed.timeNote, /출생 시간을 넣으면/);
  assert.ok(!bodyText(R.renderYear(untimed)).replace(untimed.timeNote, '').match(/첫인상|일과 평판과|일과 평판을/));
});

test('a different start date moves the window and the dated lines; the same date repeats them exactly', () => {
  const a = YEARS[0].y, later = yearOf('b1', true, '2027-03-15');
  assert.notEqual(a.rangeLabel, later.rangeLabel);
  assert.notDeepEqual(plain(a.months.map(m => m.items)), plain(later.months.map(m => m.items)));
  assert.equal(R.renderYear(a), R.renderYear(yearOf('b1', true, '2026-10-04')));
  assert.equal(R._text.span('2026-10-04', '2026-12-05'), '2026년 10월 4일 ~ 12월 5일');
  assert.equal(R._text.span('2026-10-04', '2027-01-05'), '2026년 10월 4일 ~ 2027년 1월 5일');
});
