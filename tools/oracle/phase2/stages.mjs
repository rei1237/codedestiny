import { readRows, writer, equal } from './io.mjs';
import { buildAdapter, evaluateBundle, verifyServiceSources } from '../service-runner.mjs';
import { verifyLicenses } from '../verify-licenses.mjs';
import { blockNetwork } from '../network-guard.mjs';

process.env.TZ = 'UTC'; verifyLicenses(); blockNetwork();
const py = new Map();
for await (const row of readRows('python.jsonl.gz')) if (row.koreanSaju.status === 'ok') py.set(row.id, { pillars: row.koreanSaju.facts.pillars, stages: row.koreanSaju.school.twelveStages });
const bundle = await buildAdapter('saju', undefined, 'resolveAnimalTwelveResult');
verifyServiceSources('saju', bundle.sources);
const output = writer('twelve-stages.jsonl.gz');
const koStem = '갑을병정무기경신임계', hanStem = '甲乙丙丁戊己庚辛壬癸', koBranch = '자축인묘진사오미신유술해', hanBranch = '子丑寅卯辰巳午未申酉戌亥';
let count = 0;
for (let shard = 0; shard < 4; shard++) for await (const row of readRows(`node-${shard}.jsonl.gz`)) {
  if (count >= 500) break;
  const p = py.get(row.id);
  if (row.saju.status !== 'ok' || !p || !equal(row.saju.pillars, p.pillars)) continue;
  const pillars = Object.fromEntries(Object.entries(row.saju.pillars).map(([key, value]) => [key, value ? { stem: koStem[hanStem.indexOf(value[0])], branch: koBranch[hanBranch.indexOf(value[1])] } : null]));
  // Existing result overload only. No birthDate is passed, so the public
  // adapter cannot select fetchSajuEngineResult or its KASI prefetch branch.
  const result = await evaluateBundle(bundle.code, { pillars, dayStem: pillars.day.stem }, '2026-11-01');
  await output.write({ id: row.id, publicInterface: 'sajuAdapter.ts::resolveAnimalTwelveResult(existingResult)', service: { ok: result.ok, allStages: result.allStages, error: result.error }, oracle: p.stages, sharedPillars: p.pillars });
  count++;
}
await output.close(); console.log(JSON.stringify({ twelveStageCases: count }));
