import { getSwissMoonLongitudes } from './swiss-ephemeris.js';
import { buildSukuyoFromMoonLongitude } from './sukuyo-coordinate.js';
import { judgeDayFortune } from './sukuyo-relation-core.js';

const WINDOW_DAYS = 30;
const GOOD = new Set(['great-auspicious', 'auspicious']);
const CAUTION = new Set(['caution', 'great-caution']);
const both = (row, tiers) => tiers.has(row.user.tier) && tiers.has(row.partner.tier);
const sum = row => row.user.score + row.partner.score;
const byDate = (a, b) => a.date.localeCompare(b.date);
const tally = (rows, who) => ({
  good: rows.filter(row => GOOD.has(row[who].tier)).length,
  caution: rows.filter(row => CAUTION.has(row[who].tier)).length,
  special: rows.filter(row => row[who].tier === 'pivotal').length,
});
const dayFact = row => ({
  date: row.date,
  dayMansion: row.dayMansion,
  user: `${row.user.tierLabel} · ${row.user.bRole}의 자리`,
  partner: `${row.partner.tierLabel} · ${row.partner.bRole}의 자리`,
});

const scanDays = todayKst => {
  const base = Date.parse(`${todayKst}T00:00:00Z`);
  return Number.isFinite(base) ? Array.from({ length: WINDOW_DAYS * 3 }, (_, i) => new Date(base + i * 86400000)) : [];
};

// Three 30-day windows of day mansions from `todayKst`, on the same basis as the sukuyo calendar
// (moon's sidereal longitude at 12:00 KST), judged against each person's natal mansion.
// Returns null when any day cannot be resolved so callers fall back to undated wording.
export async function buildTeaSukuyoMonthlyRhythm(env, userIndex, partnerIndex, { todayKst, requestUrl } = {}) {
  const days = scanDays(todayKst);
  if (!Number.isInteger(userIndex) || !Number.isInteger(partnerIndex) || !days.length) return null;
  const longitudes = await getSwissMoonLongitudes(env, days.map(day => ({
    year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate(), hour: 12, minute: 0, timezone: 9,
  })), { requestUrl });
  return teaSukuyoRhythmFromLongitudes(todayKst, longitudes, userIndex, partnerIndex);
}

// `longitudes[i]` is the moon's sidereal longitude at 12:00 KST on day i from `todayKst`.
export function teaSukuyoRhythmFromLongitudes(todayKst, longitudes, userIndex, partnerIndex) {
  const days = scanDays(todayKst);
  if (!days.length || longitudes?.length !== days.length) return null;
  const rows = days.map((day, i) => {
    const mansion = Number.isFinite(longitudes[i]) ? buildSukuyoFromMoonLongitude(longitudes[i]) : null;
    const user = judgeDayFortune(userIndex, mansion?.index);
    const partner = judgeDayFortune(partnerIndex, mansion?.index);
    return user && partner ? { date: day.toISOString().slice(0, 10), dayMansion: `${mansion.nameKo}숙`, user, partner } : null;
  });
  if (rows.some(row => !row)) return null;
  return {
    basis: '날마다 정오(KST) 달이 머무는 수(宿)를 구해, 두 사람 각자의 본명숙에 대해 그날이 어떤 자리인지 판정한 값',
    windows: [0, 1, 2].map(i => {
      const list = rows.slice(i * WINDOW_DAYS, (i + 1) * WINDOW_DAYS);
      return {
        startsOn: list[0].date,
        endsOn: list.at(-1).date,
        user: tally(list, 'user'),
        partner: tally(list, 'partner'),
        sharedGood: list.filter(row => both(row, GOOD)).length,
        sharedCaution: list.filter(row => both(row, CAUTION)).length,
      };
    }),
    bestSharedDays: rows.filter(row => both(row, GOOD)).sort((a, b) => sum(b) - sum(a) || byDate(a, b)).slice(0, 3).sort(byDate).map(dayFact),
    cautionSharedDays: rows.filter(row => both(row, CAUTION)).sort((a, b) => sum(a) - sum(b) || byDate(a, b)).slice(0, 2).sort(byDate).map(dayFact),
  };
}
