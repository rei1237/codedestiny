import fs from 'node:fs';
import path from 'node:path';
import { buildAdapter, verifyServiceSources, evaluateBundle } from '../service-runner.mjs';
import { OUT as out } from './output.mjs';
import { blockNetwork } from '../network-guard.mjs';

process.env.TZ = 'UTC'; blockNetwork();
const cases = JSON.parse(fs.readFileSync(path.join(out, 'requests.json'))).cases.filter(c => c.group === 'A-saju-residual');
const bundle = await buildAdapter('saju'); verifyServiceSources('saju', bundle.sources);
const results = [];
for (const c of cases) {
  const source = JSON.parse(fs.readFileSync(path.join(out, 'sources', `kasi-lunc-${c.input.date}.json`)));
  const official = JSON.parse(source.body).find(r => r.LUNC_LEAP_MM === '평');
  const context = { kasiSolarDate: { year: +official.SOLC_YYYY, month: +official.SOLC_MM, day: +official.SOLC_DD } };
  const input = { birthDate: c.input.date, birthTime: c.input.time, calendarType: c.input.calendar, lunarLeap: c.input.leapMonth, gender: c.input.gender };
  const raw = await evaluateBundle(bundle.code, input, c.input.referenceDate, context);
  results.push({ id: c.id, publicInput: input, suppliedContext: context, evidenceSolarDate: raw.calculationEvidence.solarDate,
    canonicalCivil: raw.calculationEvidence.canonicalNatal.civil, pillars: raw.pillars, official,
    sourceFiles: bundle.sources, note: 'No prefetch function/network was called; only official date in the existing second-argument contract. No timezone field was added.' });
}
fs.writeFileSync(path.join(out, 'prefetch-controls.json'), JSON.stringify({ results }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(results.map(r => ({ id: r.id, evidenceSolarDate: r.evidenceSolarDate, canonicalCivil: r.canonicalCivil, dayPillar: r.pillars.day }))));
