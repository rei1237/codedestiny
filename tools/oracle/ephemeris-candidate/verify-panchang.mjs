import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';

const library = './node_modules/astronomy-engine/esm/astronomy.js';
const files = [
  library, './imd-origin.mjs', '../../../lib/vedicCalculator.js',
  ...['vedic-derived-calculations', 'sukuyo-coordinate', 'sukuyo-premium', 'sukuyo-relation-core', 'cms-record-store']
    .map(name => '../../../worker/lib/' + name + '.js'),
];
const allowed = new Set(files.map(file => new URL(file, import.meta.url).href));
registerHooks({ resolve(specifier, context, next) {
  if (!specifier.startsWith('.') || !allowed.has(new URL(specifier, context.parentURL).href)) {
    throw Error('UNREVIEWED_PANCHANG_IMPORT: ' + specifier);
  }
  return next(specifier, context);
} });
globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
const Astronomy = await import(library);
const { imdOriginLongitude } = await import('./imd-origin.mjs');
const { lahiriAyanamsha } = await import('../../../lib/vedicCalculator.js');
const { nakshatraInfo } = await import('../../../worker/lib/vedic-derived-calculations.js');
const { buildSukuyoFromMoonLongitude } = await import('../../../worker/lib/sukuyo-coordinate.js');

const raw = fs.readFileSync(new URL('./panchang-1948.json', import.meta.url));
const { months } = JSON.parse(raw);
const wrap = degrees => ((degrees % 360) + 360) % 360;
const signed = degrees => wrap(degrees + 180) - 180;
const round = n => Math.round(n * 1e5) / 1e5;
const minutesPerDay = 1440;

function compare(offset) {
  function moon(jd) {
    const utc = new Date(Math.round((jd - 2440587.5) * 864e5));
    return wrap(Astronomy.Ecliptic(Astronomy.GeoVector('Moon', utc, true)).elon - offset(jd));
  }

  const timeErrors = [], offsetErrors = [], exceptions = [];
  const days = new Set(), transitions = new Set();
  let oneMinuteSidesWrong = 0, sukuyoOffsetMappingMismatch = 0, allDay = 0;
  for (const month of months) {
    offsetErrors.push(Math.abs(offset(month.dates[0]) - month.firstDayAyanamsaDeg) * 60);
    for (const day of month.dates) {
      assert.ok(!days.has(day));
      days.add(day);
    }
    allDay += month.allDay.length;
    for (const [midnight, endStar, hour, minute] of month.events) {
      const jd = midnight + (hour * 60 + minute - 330) / minutesPerDay;
      transitions.add(endStar);
      const target = endStar * 360 / 27;
      let lo = jd - 0.5, hi = jd + 0.5;
      if (signed(moon(lo) - target) > 0 || signed(moon(hi) - target) < 0) {
        exceptions.push({ source: month.url, midnight, endStar, hour, minute, reason: 'no matching crossing within 12 hours' });
        continue;
      }
      for (let i = 0; i < 23; i++) {
        const mid = (lo + hi) / 2;
        if (signed(moon(mid) - target) > 0) hi = mid;
        else lo = mid;
      }
      const errorMinutes = ((lo + hi) / 2 - jd) * minutesPerDay;
      timeErrors.push(Math.abs(errorMinutes));
      if (Math.abs(errorMinutes) > 2) {
        exceptions.push({ source: month.url, midnight, endStar, hour, minute, errorMinutes: round(errorMinutes) });
      }
      const left = moon(jd - 1 / minutesPerDay), right = moon(jd + 1 / minutesPerDay);
      const before = nakshatraInfo(left), after = nakshatraInfo(right);
      if (before.index !== endStar - 1 || before.pada !== 4 || after.index !== endStar % 27 || after.pada !== 1) {
        oneMinuteSidesWrong++;
      }
      if (buildSukuyoFromMoonLongitude(left).index !== (endStar - 1 + 16) % 27 ||
          buildSukuyoFromMoonLongitude(right).index !== (endStar + 16) % 27) {
        sukuyoOffsetMappingMismatch++;
      }
    }
  }
  assert.equal(days.size, 365);
  assert.equal(transitions.size, 27);
  timeErrors.sort((a, b) => a - b);
  return {
    days: days.size, publishedTimedEnds: months.reduce((n, month) => n + month.events.length, 0),
    daysWithAllDayLabel: allDay, locatedEnds: timeErrors.length,
    monthlyAyanamsaMaxArcmin: round(Math.max(...offsetErrors)),
    endTimeMaxMinutes: round(timeErrors.at(-1)),
    endTimeP95Minutes: round(timeErrors[Math.ceil(timeErrors.length * 0.95) - 1]),
    oneMinuteSidesWrong, sukuyoOffsetMappingMismatch, exceptions,
  };
}

const result = {
  schema: 'imd-nakshatra-comparison-v2',
  fixtureHash: createHash('sha256').update(raw).digest('hex'),
  legacyApproximation: compare(lahiriAyanamsha),
  imd1956TrueEcliptic: compare(imdOriginLongitude),
};
const file = new URL('./panchang-results.json', import.meta.url);
if (process.argv.includes('--record')) fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
else assert.deepEqual(result, JSON.parse(fs.readFileSync(file)));
console.log(JSON.stringify(result));
