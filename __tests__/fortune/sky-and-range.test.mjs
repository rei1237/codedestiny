import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Seasons } from 'astronomy-engine';
import { sunSignForDate } from '../../scripts/lib/moon-sky.mjs';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';
const { loadWeekRange, loadMonthRange } = loadTsModule('lib/fortune/range-data.ts');
const { animalDayRelation, sunSignIdOf } = loadTsModule('lib/fortune/day-relation.ts');
const { SIGN_PROFILES } = loadTsModule('lib/fortune/sign-profiles.ts');
const { computeSignScore } = loadTsModule('lib/fortune/fortune-score.ts');
const { buildPeriodFaqs } = loadTsModule('lib/fortune/period-faqs.ts');

test('solar sign follows each year’s actual equinox/solstice at KST noon', () => {
  for (const year of [2023, 2024, 2025, 2026, 2027, 2028]) {
    const seasons = Seasons(year);
    for (const [key, before, after] of [
      ['mar_equinox', 'pisces', 'aries'], ['jun_solstice', 'gemini', 'cancer'],
      ['sep_equinox', 'virgo', 'libra'], ['dec_solstice', 'sagittarius', 'capricorn'],
    ]) {
      const boundary = seasons[key].date;
      const ymd = new Date(boundary.getTime() + 9 * 3600000).toISOString().slice(0, 10);
      const noon = new Date(`${ymd}T12:00:00+09:00`);
      assert.equal(sunSignIdOf(ymd), noon < boundary ? before : after, `${ymd} ${key}`);
    }
  }
});

test('invalid dates never silently become another solar sign or period', () => {
  for (const date of ['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '2026-1-1', 'invalid']) {
    assert.equal(sunSignForDate(date), null, date);
    assert.throws(() => loadWeekRange(date), RangeError);
    assert.throws(() => loadMonthRange(date), RangeError);
  }
  assert.equal(sunSignForDate('2024-02-29'), 'pisces');
});

test('explicit build anchor holds the same week/month across year and leap boundaries', () => {
  const week = loadWeekRange('2027-01-01');
  assert.equal(week.start, '2026-12-28');
  assert.equal(week.end, '2027-01-03');
  assert.equal(new Set(week.days.map(d => d.ymd)).size, 7);
  const leap = loadMonthRange('2024-02-29');
  assert.equal(leap.days.length, 29);
  assert.equal(leap.anchorYmd, '2024-02-29');
  assert.equal(loadMonthRange('2026-02-28').days.length, 28);
});

test('all 144 animal/day pairs preserve score bounds and avoid claiming completed trines', () => {
  const branches = [...'子丑寅卯辰巳午未申酉戌亥'];
  let partialTrines = 0;
  for (const profile of SIGN_PROFILES.filter(p => p.kind === 'animal')) {
    for (const branch of branches) {
      const relation = animalDayRelation(profile.id, `甲${branch}`);
      assert.ok(relation);
      const score = computeSignScore(profile, { ganji: `甲${branch}`, moonPhase: 'New moon', moonSign: 'Aries', ymd: '2026-03-21' });
      for (const axis of ['overall', 'love', 'money', 'health', 'work']) assert.ok(score[axis] >= 1 && score[axis] <= 10);
      if (relation.kind === 'trine') {
        partialTrines++;
        assert.match(relation.detail, /완성이나 합화를 확정하지/);
        assert.match(score.basis[0].value, /완성 여부는 미판정/);
      }
    }
  }
  assert.equal(partialTrines, 24);
});

test('96 Korean FAQs distinguish astrology from animal pillars and match visible search topics', () => {
  for (const profile of SIGN_PROFILES) for (const period of ['today', 'tomorrow', 'weekly', 'monthly']) {
    const faqs = buildPeriodFaqs(profile, period);
    assert.ok(faqs.some(f => /재물운/.test(f.question)));
    if (profile.kind === 'zodiac') {
      assert.match(faqs[0].answer, /태양·달/);
      assert.doesNotMatch(faqs[0].answer, /삼합|일진의 지지/);
    }
  }
  const source = readFileSync(new URL('../../lib/fortune/build-view.ts', import.meta.url), 'utf8');
  assert.match(source, /loadWeekRange\(resolvePeriodDate\("today"\)\)/);
  assert.match(source, /loadMonthRange\(resolvePeriodDate\("today"\)\)/);
});
