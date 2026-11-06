// Adapter for new, version-pinned Sukuyo readings. Input is a validated civil time.
import * as A from 'astronomy-engine';
import { solarToLunar } from '../../lib/korean-calendar/index.js';
import { buildBirthTimeContext } from './birth-time-context.js';
import { buildSukuyoFromMoonLongitude } from './sukuyo-coordinate.js';

import { createImdSiderealProfile, SUKUYO_IMD_VERSION } from './imd-sidereal-profile.js';

const {moonForDate} = createImdSiderealProfile(A);
const verifiedDates = [
  [Date.UTC(2024,0,1), Date.UTC(2024,0,30,23)],
  [Date.UTC(2025,0,1), Date.UTC(2025,0,30,23)],
  // Keep only complete interior dates in the 1948 Saka almanac.
  [Date.UTC(2026,2,23), Date.UTC(2027,2,20)],
];
export function verifiedSukuyoForCivilTime(moment) {
  const { year, month, day, hour, minute, timezoneOffsetHours } = moment;
  const utcTimestamp = Date.UTC(year, month-1, day, hour, minute) - timezoneOffsetHours*3600000;
  if (!verifiedDates.some(([start,end]) => start <= utcTimestamp && utcTimestamp < end)) return null;
  const date = new Date(utcTimestamp);
  const moon = moonForDate(date);
  const span = 360/27, distance = Math.min(moon%span,span-moon%span);
  // Do not choose a mansion inside a 2 arcminute margin of either boundary.
  if (distance <= 2/60) return null;
  const normalized = {year,month,day,hour,minute,timezoneOffsetHours,utcTimestamp,utcIso:date.toISOString()};
  const julianDate = utcTimestamp/864e5+2440587.5;
  const lunar = solarToLunar(year,month,day);
  return buildSukuyoFromMoonLongitude(moon,{
    astronomyVersion:SUKUYO_IMD_VERSION, calculationBasis:'geocentric-sidereal-moon-imd1956',
    solarYear:year,solarMonth:month,solarDay:day,hour,minute,timezoneOffsetHours,
    utcTimestamp,utcIso:normalized.utcIso,julianDate,birthTimeKnown:true,
    birthTimeContext:buildBirthTimeContext(moment,normalized,julianDate),
    latitude:moment.latitude ?? null,longitude:moment.longitude ?? null,
    lunarYear:lunar?.lunarYear ?? null,lunarMonth:lunar?.lunarMonth ?? null,lunarDay:lunar?.lunarDay ?? null,isLeapMonth:Boolean(lunar?.isLeapMonth),
  });
}
