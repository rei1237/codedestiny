import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { OUTPUT } from './corpus.mjs';
import { readRows, equal } from './io.mjs';
import { REPO } from '../service-runner.mjs';

const wanted = new Set(['kasi-000000', 'kasi-000001', 'edge-001146', 'random-002711', 'random-012711', 'random-022710']);
const inputs = new Map(), actual = new Map();
for await (const r of readRows('inputs.jsonl.gz')) if (wanted.has(r.id)) inputs.set(r.id, r.input);
for await (const r of readRows('python.jsonl.gz')) if (wanted.has(r.id)) actual.set(r.id, r.koreanSaju);
const canonical = school => {
  const result = structuredClone(school);
  for (const star of result?.stars ?? []) star.locations?.sort((a, b) => a.name.localeCompare(b.name));
  return result;
};
const cases = []; let initialFailure;
for (const [id, input] of inputs) {
  const executable = path.join(REPO, 'tools/oracle-py/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const result = spawnSync(executable, ['-I', '-X', 'utf8', path.join(REPO, 'tools/oracle-py/runner.py')], { input: JSON.stringify(input), encoding: 'utf8', timeout: 30000, windowsHide: true });
  if (result.status !== 0) throw new Error(`${id}: ${result.error?.message ?? result.stdout}`);
  const fresh = JSON.parse(result.stdout), previous = actual.get(id);
  const factsEqual = equal(fresh.facts, previous.facts), schoolEqual = equal(canonical(fresh.school), canonical(previous.school));
  if (!factsEqual || !schoolEqual) throw new Error(`SEMANTIC_DRIFT: ${id}`);
  const rawSchoolEqual = equal(fresh.school, previous.school);
  cases.push({ id, factsEqual, schoolEqualAfterLocationSetSort: schoolEqual, rawSchoolEqual });
  if (!rawSchoolEqual && !initialFailure) {
    const index = fresh.school.stars.findIndex((star, i) => !equal(star.locations, previous.school.stars[i].locations));
    initialFailure = { id, kind: 'location array order only', batch: previous.school.stars[index].locations.map(p => p.name), fresh: fresh.school.stars[index].locations.map(p => p.name) };
  }
}
if (cases.length !== wanted.size) throw new Error('VALIDATION_CASE_MISSING');
fs.writeFileSync(path.join(OUTPUT, 'python-cache-validation.json'), JSON.stringify({ cases, passed: cases.length, method: 'fresh isolated CLI facts exact; school.stars[*].locations treated as a set, raw results preserved', initialFailure }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: cases.length, rawOrderDifferences: cases.filter(c => !c.rawSchoolEqual).length }));
