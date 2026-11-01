import { readRows, writer, equal, ziweiDifferences } from './io.mjs';
import { verifyLicenses } from '../verify-licenses.mjs';
import { blockNetwork } from '../network-guard.mjs';
import { runOracle } from '../oracles.mjs';
import { projectOracle, projectZiwei } from './projection.mjs';

verifyLicenses(); blockNetwork();
const { astro } = await import('iztro');
const { solarToLunar, apparentSolarLongitude } = await import('manseryeok');
const inputs = new Map(); for await (const row of readRows('inputs.jsonl.gz')) inputs.set(row.id, row);
const output = writer('controls.jsonl.gz'); let count = 0;
for (let shard = 0; shard < 4; shard++) for await (const row of readRows(`node-${shard}.jsonl.gz`)) {
  const input = inputs.get(row.id).input, control = { id: row.id };
  if (row.saju.status === 'ok' && row.manseryeokMatched.status === 'ok' && !equal(row.saju.pillars, row.manseryeokMatched.facts.pillars)) {
    // 127 degrees produces an exact -32/-2 minute offset, matching the
    // service's documented nearest-minute rounding of Seoul 126.978 degrees.
    try { control.sajuRounded = projectOracle(await runOracle('manseryeok', { ...input, place: { ...input.place, longitude: 127 }, options: { dayBoundary: 'jasi', solarCorrection: 'local-mean' } })); }
    catch (error) { control.sajuRounded = { status: 'error', error: error.message }; }
  }
  const z = row.iztroMatched;
  if (ziweiDifferences(row.ziwei, z).length && z?.controlInput) {
    try {
      const [year, month, day] = z.controlInput.date.split('-').map(Number);
      const korean = solarToLunar(year, month, day);
      const lunarInput = { ...z.controlInput, calendar: 'lunar', date: `${korean.year}-${String(korean.month).padStart(2, '0')}-${String(korean.day).padStart(2, '0')}`, leapMonth: korean.isLeapMonth };
      const r = await runOracle('iztro', lunarInput);
      const hour = Number(lunarInput.time.slice(0, 2)), timeIndex = hour === 0 ? 0 : hour === 23 ? 12 : Math.floor((hour + 1) / 2);
      // Read oracle echo to distinguish valid Korean dates that the Chinese
      // lunar calendar normalizes silently. No service lunar values are used.
      const chart = astro.byLunar(lunarInput.date, timeIndex, input.gender === 'male' ? '男' : '女', lunarInput.leapMonth, true, 'zh-CN');
      const echo = chart.rawDates.lunarDate;
      control.ziweiKoreanCalendar = { ...projectZiwei(r), controlInput: lunarInput, lunarEcho: echo,
        echoMatches: echo.lunarYear === korean.year && echo.lunarMonth === korean.month && echo.lunarDay === korean.day && Boolean(echo.isLeap) === korean.isLeapMonth,
        yearlyGanji: chart.rawDates.chineseDate.yearly.join(''), independentLunar: korean };
    } catch (error) { control.ziweiKoreanCalendar = { status: 'error', error: error.message }; }
  }
  if (Object.keys(control).length > 1) { await output.write(control); count++; }
}
await output.write({ id: 'astronomy-2011-ipdong', basis: 'manseryeok apparentSolarLongitude public Meeus model; not Swiss and not majority voting', samples: ['2011-11-07T18:35:00Z', '2011-11-08T00:26:00Z'].map(utc => ({ utc, longitude: apparentSolarLongitude(Date.parse(utc)), target: 225 })) });
await output.close(); console.log(JSON.stringify({ controls: count, complete: true }));
