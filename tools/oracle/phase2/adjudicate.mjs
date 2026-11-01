import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readRows, writer, ziweiDifferences, equal } from './io.mjs';
import { REPO } from '../service-runner.mjs';
import { utcInstant } from '../contract.mjs';
import { runOracle } from '../oracles.mjs';
import { projectOracle, projectZiwei } from './projection.mjs';
import { verifyLicenses } from '../verify-licenses.mjs';
import { blockNetwork } from '../network-guard.mjs';

verifyLicenses(); blockNetwork();
const { astro } = await import('iztro');
const { solarToLunar } = await import('manseryeok');
const selected = new Set();
for await (const row of readRows('observations.jsonl.gz')) if (row.category === 'A') selected.add(row.id);
const cases = []; for await (const row of readRows('inputs.jsonl.gz')) if (selected.has(row.id)) cases.push(row);
const raw = new Map();
for (let shard = 0; shard < 4; shard++) for await (const row of readRows(`node-${shard}.jsonl.gz`)) if (selected.has(row.id)) raw.set(row.id, row);
function calendars(inputs) {
  const python = path.join(REPO, 'tools/oracle-py/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const result = spawnSync(python, ['-I', '-X', 'utf8', path.join(REPO, 'tools/oracle-py/calendar-batch.py')], { input: JSON.stringify(inputs), encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
  return JSON.parse(result.stdout);
}
const converted = calendars(cases.map(c => c.input));
const prepared = cases.map((c, index) => {
  const calendar = converted[index].calendar ?? raw.get(c.id).manseryeok.facts?.calendar;
  if (!calendar) throw new Error(`INDEPENDENT_CALENDAR_UNAVAILABLE: ${c.id}`);
  const solarInput = { ...c.input, date: calendar.solar, calendar: 'solar', leapMonth: false };
  const instant = utcInstant(solarInput);
  // Net local mean correction equals longitude*4 minus the complete civil offset,
  // including historical seconds and DST. No service output is used here.
  const correction = Math.round(c.input.place.longitude * 4 - instant.offsetMinutes);
  const wall = new Date(`${solarInput.date}T${c.input.time}:00Z`);
  wall.setUTCMinutes(wall.getUTCMinutes() + correction);
  if (wall.getUTCHours() === 23) { wall.setUTCDate(wall.getUTCDate() + 1); wall.setUTCHours(0, 0, 0, 0); }
  return { id: c.id, input: c.input, calendar, calendarSource: converted[index].calendar ? 'korean-saju' : 'manseryeok-fallback-python-out-of-range', solarInput, correction, offsetMinutes: instant.offsetMinutes,
    clockInput: { ...solarInput, date: wall.toISOString().slice(0, 10), time: wall.toISOString().slice(11, 16) } };
});
const correctedCalendars = calendars(prepared.map(p => p.clockInput));
const sink = writer('adjudication.jsonl.gz'); let resolvedZiwei = 0, resolvedSaju = 0;
for (let index = 0; index < prepared.length; index++) {
  const control = prepared[index], previous = raw.get(control.id);
  const fallback = correctedCalendars[index].calendar ? null : solarToLunar(...control.clockInput.date.split('-').map(Number));
  const korean = correctedCalendars[index].calendar?.lunar ?? { year: fallback.year, month: fallback.month, day: fallback.day, leapMonth: fallback.isLeapMonth };
  control.correctedCalendarSource = fallback ? 'manseryeok-fallback-python-out-of-range' : 'korean-saju';
  if (!korean) throw new Error(`CORRECTED_CALENDAR_UNAVAILABLE: ${control.id}`);
  const date = `${korean.year}-${String(korean.month).padStart(2, '0')}-${String(korean.day).padStart(2, '0')}`;
  const lunarInput = { ...control.clockInput, calendar: 'lunar', date, leapMonth: korean.leapMonth };
  try {
    const oracle = projectZiwei(await runOracle('iztro', lunarInput));
    const h = Number(lunarInput.time.slice(0, 2)), timeIndex = h === 0 ? 0 : h === 23 ? 12 : Math.floor((h + 1) / 2);
    const chart = astro.byLunar(date, timeIndex, control.input.gender === 'male' ? '男' : '女', korean.leapMonth, true, 'zh-CN');
    const echo = chart.rawDates.lunarDate;
    const echoMatches = echo.lunarYear === korean.year && echo.lunarMonth === korean.month && echo.lunarDay === korean.day && Boolean(echo.isLeap) === korean.leapMonth;
    control.ziwei = { ...oracle, controlInput: lunarInput, echo, echoMatches, yearlyGanji: chart.rawDates.chineseDate.yearly.join(''), differences: ziweiDifferences(previous.ziwei, oracle) };
    if (echoMatches && !control.ziwei.differences.length) resolvedZiwei++;
  } catch (error) { control.ziwei = { status: 'error', error: error.message }; }
  // Calendar-only change for saju: preserve original civil time, match rounding.
  try {
    control.saju = projectOracle(await runOracle('manseryeok', { ...control.solarInput, place: { ...control.input.place, longitude: 127 }, options: { dayBoundary: 'jasi', solarCorrection: 'local-mean' } }));
    control.saju.pillarsEqual = equal(control.saju.facts?.pillars, previous.saju.pillars);
    if (control.saju.pillarsEqual) resolvedSaju++;
  } catch (error) { control.saju = { status: 'error', error: error.message }; }
  await sink.write(control);
}
await sink.close();
console.log(JSON.stringify({ cases: cases.length, resolvedZiwei, resolvedSaju }));
