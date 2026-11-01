import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync, createGzip } from 'node:zlib';
import { once } from 'node:events';
import { OUTPUT } from './corpus.mjs';
import { projectSaju, projectOracle, projectZiwei } from './projection.mjs';
import { prepareServiceRunner, buildAdapter, verifyServiceSources } from '../service-runner.mjs';
import { runOracle } from '../oracles.mjs';
import { verifyLicenses } from '../verify-licenses.mjs';
import { blockNetwork } from '../network-guard.mjs';
import { validateInput, utcInstant } from '../contract.mjs';

process.env.TZ = 'UTC';
const shard = Number(process.argv[2]), shards = Number(process.argv[3]);
if (!Number.isInteger(shard) || !Number.isInteger(shards) || shard < 0 || shard >= shards) throw new Error('BAD_SHARD');
verifyLicenses(); blockNetwork();
const saju = await prepareServiceRunner('saju'), ziwei = await prepareServiceRunner('ziwei');
const all = gunzipSync(fs.readFileSync(path.join(OUTPUT, 'inputs.jsonl.gz'))).toString('utf8').trim().split('\n').map(JSON.parse);
const rows = all.filter((_, index) => index % shards === shard);
const output = path.join(OUTPUT, `node-${shard}.jsonl.gz`);
if (fs.existsSync(output)) throw new Error('OUTPUT_EXISTS: preserve prior evidence');
const sink = fs.createWriteStream(output, { flags: 'wx' }), zip = createGzip(); zip.pipe(sink);
const attempt = async fn => { try { return await fn(); } catch (e) { return { status: 'error', error: e.message }; } };
const termYears = new Set();
const start = Date.now(); let done = 0;
for (const row of rows) {
  const input = validateInput(row.input), result = { id: row.id };
  result.saju = await attempt(async () => projectSaju(await saju(input)));
  result.ziwei = await attempt(async () => projectZiwei(await ziwei(input), true));
  const m = await attempt(() => runOracle('manseryeok', input));
  result.manseryeok = m.facts ? projectOracle(m) : m;
  if (m.facts?.solarTerms) {
    const year = +m.facts.calendar.solar.slice(0, 4);
    if (!termYears.has(year)) { result.oracleSolarTerms = { year, terms: m.facts.solarTerms }; termYears.add(year); }
  }
  result.lunar = await attempt(async () => projectOracle(await runOracle('lunar-javascript', input)));
  result.iztro = await attempt(async () => projectZiwei(await runOracle('iztro', input)));
  // Separate option-matched control. Never replace the original observations.
  result.manseryeokMatched = await attempt(async () => projectOracle(await runOracle('manseryeok', {
    ...input, place: { ...input.place, longitude: 126.978 }, options: { dayBoundary: 'jasi', solarCorrection: 'local-mean' },
  })));
  // Independent clock normalization for the iztro control: own oracle calendar
  // and IANA offset, not the service's returned date or lunar conversion.
  result.iztroMatched = await attempt(async () => {
    if (input.timeUnknown || input.gender === 'unknown' || !m.facts?.calendar?.solar) return { status: 'unsupported', reason: 'MATCHED_CLOCK_UNAVAILABLE' };
    const solarInput = { ...input, calendar: 'solar', date: m.facts.calendar.solar, leapMonth: false };
    const instant = utcInstant(solarInput);
    const zoneName = new Intl.DateTimeFormat('en-US', { timeZone: input.place.timezone, timeZoneName: 'long' }).formatToParts(instant.date).find(p => p.type === 'timeZoneName').value;
    const dst = /daylight|summer/i.test(zoneName) ? 60 : 0;
    const standard = instant.offsetMinutes - dst;
    const correction = Math.round((input.place.longitude - standard / 4) * 4 - dst);
    const wall = new Date(`${solarInput.date}T${input.time}:00Z`);
    wall.setUTCMinutes(wall.getUTCMinutes() + correction);
    if (wall.getUTCHours() === 23) { wall.setUTCDate(wall.getUTCDate() + 1); wall.setUTCHours(0, 0, 0, 0); }
    const adjusted = { ...solarInput, date: wall.toISOString().slice(0, 10), time: wall.toISOString().slice(11, 16) };
    const matched = projectZiwei(await runOracle('iztro', adjusted));
    return { ...matched, controlInput: adjusted, clock: { correction, dst, standard }, basis: 'independent manseryeok solar conversion + IANA local mean + explicit full-date 23h rollover; iztro own Chinese lunar calendar' };
  });
  if (!zip.write(JSON.stringify(result) + '\n')) await once(zip, 'drain');
  done++;
  if (done % 500 === 0) console.log(JSON.stringify({ shard, done, total: rows.length, elapsedSeconds: Math.round((Date.now() - start) / 1000) }));
}
for (const domain of ['saju', 'ziwei']) { const bundle = await buildAdapter(domain); verifyServiceSources(domain, bundle.sources); }
zip.end(); await once(sink, 'finish');
console.log(JSON.stringify({ shard, done, total: rows.length, complete: true, elapsedSeconds: Math.round((Date.now() - start) / 1000) }));
