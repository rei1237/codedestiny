// Offline official snapshots. Uses existing TypeScript tooling, no isolated oracle packages.
import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';
import { buildZiweiAdapter } from '../../worker/lib/guardian-fortune/adapters/ziwei.js';
import { verifiedNodeTermWindow, DEFAULT_AUTHORITY_FLAGS } from '../../lib/korean-calendar/index.js';
const { computeNatalFromInput } = loadTsModule('app/saju/animal-destiny/lib/sajuAdapter.ts');
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/korean-calendar/authority-v2-golden.json', import.meta.url)));
const data = JSON.parse(fs.readFileSync(new URL('../../docs/engine-audit/results/implementation-20261101/verified-authorities.json', import.meta.url)));
const sajuInput = r => ({ birthDate: r.date, birthTime: r.time ?? '', calendarType: r.calendar, lunarLeap: r.leapMonth, gender: r.gender });
const termLookupAdapter = input => verifiedNodeTermWindow(input.instantUtcMs);
test('official 101-case snapshot regression uses public adapters only', async () => {
  assert.equal(fixture.cases.length, 101); let compared = 0;
  for (const row of fixture.cases) {
    let facts;
    if (row.domain === 'saju') {
      const raw = computeNatalFromInput(sajuInput(row.input), { authorityFlags: row.flags });
      facts = Object.fromEntries(Object.entries(raw.pillars).map(([key, p]) => [key, p ? '甲乙丙丁戊己庚辛壬癸'['갑을병정무기경신임계'.indexOf(p.stem)] + '子丑寅卯辰巳午未申酉戌亥'['자축인묘진사오미신유술해'.indexOf(p.branch)] : null]));
    } else {
      const raw = await buildZiweiAdapter({ birthDate: row.input.date, birthTime: row.input.time, hasBirthTime: true, calendarType: row.input.calendar, isLeapMonth: row.input.leapMonth, gender: row.input.gender, birthPlace: row.input.place, targetDate: row.input.referenceDate, topic: 'daily' }, { fusionExpert: true, authorityFlags: row.flags });
      const c = raw.expertEvidence;
      facts = { life: c.palaces.find(p => p.name === c.lifePalace).branchIndex, body: c.palaces.find(p => p.name === c.bodyPalace).branchIndex, bureau: c.bureau.number, stars: {}, decades: {}, hua: c.fourTransformations };
      for (const p of c.palaces) { for (const s of [...p.mainStars, ...p.assistantStars, ...p.maleficStars]) facts.stars[s] = p.branchIndex; facts.decades[p.branchIndex] = p.majorLuck.startAge; }
    }
    for (const [field, expected] of Object.entries(row.expected)) { assert.deepEqual(field.split('.').reduce((v, k) => v[k], facts), expected, row.id + ':' + field); compared++; }
  }
  assert.equal(compared, 1109);
});
test('all supported JPL node boundaries switch across ±1 second/±1 minute and reject unresolved subsecond instants', () => {
  let checked = 0;
  for (const term of data.terms.filter(t => data.termYears.includes(t.year))) {
    for (const offset of [1000, 60000]) {
      const before = termLookupAdapter({ instantUtcMs: term.utcMs - offset });
      const after = termLookupAdapter({ instantUtcMs: term.utcMs + offset });
      assert.notEqual(before.previous.utcMs, term.utcMs); assert.equal(after.previous.utcMs, term.utcMs);
    }
    assert.throws(() => termLookupAdapter({ instantUtcMs: term.utcMs }), /TERM_INSTANT_UNCERTAIN/); checked++;
  }
  assert.equal(checked, 168);
  assert.throws(() => termLookupAdapter({ instantUtcMs: NaN }), /INVALID_TERM_INSTANT/);
});
test('public default remains OFF and flags never mutate birth input or saved evidence', t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-01T00:00:00Z') });
  assert.deepEqual(DEFAULT_AUTHORITY_FLAGS, { sajuTermAuthorityV2: false, koreanCalendarAuthorityV2: false });
  const row = fixture.cases.find(r => r.domain === 'saju' && r.flags.koreanCalendarAuthorityV2);
  const input = Object.freeze(sajuInput(row.input));
  const original = computeNatalFromInput(input), stored = JSON.stringify(original);
  Object.freeze(original);
  const revised = computeNatalFromInput(input, { authorityFlags: row.flags });
  assert.equal(JSON.stringify(original), stored); assert.notEqual(revised.pillars.day.ganji, original.pillars.day.ganji);
  assert.deepEqual(computeNatalFromInput(input, { authorityFlags: DEFAULT_AUTHORITY_FLAGS }), original);
});

test('all 24 official months round-trip through solar/lunar public ziwei chart inputs', async () => {
  const common = { birthTime: '12:00', hasBirthTime: true, gender: 'female', birthPlace: { timezone: 'Asia/Seoul', longitude: 126.978, latitude: 37.5665 }, targetDate: '2026-11-01', topic: 'daily' };
  const options = { fusionExpert: true, authorityFlags: { koreanCalendarAuthorityV2: true } };
  let days = 0;
  for (const m of data.months) for (let day = 1; day <= m.length; day++) {
    const solarDate = new Date((m.startDay + day - 1) * 86400000).toISOString().slice(0, 10);
    const lunarDate = `${m.lunarYear}-${String(m.monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const solar = await buildZiweiAdapter({ ...common, birthDate: solarDate, calendarType: 'solar', isLeapMonth: false }, options);
    const lunar = await buildZiweiAdapter({ ...common, birthDate: lunarDate, calendarType: 'lunar', isLeapMonth: m.isLeap }, options);
    // Minor-luck seedYear remains the existing input-year school contract, outside CR-002.
    for (const field of ['palaces', 'lifePalace', 'bodyPalace', 'bureau', 'fourTransformations', 'majorLuck']) assert.deepEqual(solar.expertEvidence[field], lunar.expertEvidence[field], solarDate + ':' + field);
    assert.ok(solar.evidence.includes('ziwei.calendarAuthority.kasi-jpl-authority-20261101')); days++;
  }
  assert.equal(days, data.months.reduce((n, m) => n + m.length, 0));
});

test('four additional impact observations match KASI/JPL within the same approved defect families', () => {
  const extra = JSON.parse(fs.readFileSync(new URL('../fixtures/korean-calendar/authority-v2-impact-golden.json', import.meta.url)));
  assert.equal(extra.cases.length, 4);
  for (const row of extra.cases) {
    const raw = computeNatalFromInput(sajuInput(row.input), { authorityFlags: row.flags });
    for (const [field, expected] of Object.entries(row.expected)) {
      const p = raw.pillars[field];
      assert.equal('甲乙丙丁戊己庚辛壬癸'['갑을병정무기경신임계'.indexOf(p.stem)] + '子丑寅卯辰巳午未申酉戌亥'['자축인묘진사오미신유술해'.indexOf(p.branch)], expected, row.id + ':' + field);
    }
  }
});
