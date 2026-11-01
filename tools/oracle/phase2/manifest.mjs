import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { OUTPUT } from './corpus.mjs';
import { REPO } from '../service-runner.mjs';
import { readRows } from './io.mjs';

const files = [], ids = new Set(), nodeIds = new Set(), pythonIds = new Set();
let candidateObservations = 0;
for (const name of fs.readdirSync(OUTPUT).sort()) {
  if (name === 'manifest.json') continue;
  if (name.endsWith('.partial')) throw new Error(`INCOMPLETE_ARTIFACT: ${name}`);
  const target = path.join(OUTPUT, name);
  if (!fs.statSync(target).isFile()) continue;
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(target)) hash.update(chunk);
  const item = { file: name, bytes: fs.statSync(target).size, sha256: hash.digest('hex') };
  if (name.endsWith('.jsonl.gz')) {
    item.rows = 0;
    for await (const row of readRows(name)) {
      item.rows++;
      const set = name === 'inputs.jsonl.gz' ? ids : /^node-\d/.test(name) ? nodeIds : name === 'python.jsonl.gz' ? pythonIds : null;
      if (set) { assert.ok(!set.has(row.id), `DUPLICATE: ${name}/${row.id}`); set.add(row.id); }
      if (name === 'a-candidates.jsonl.gz') { assert.equal(row.category, 'A'); assert.ok(row.input && row.expected && row.requiredEvidence && row.impact); candidateObservations++; }
    }
  } else if (name.endsWith('.json')) JSON.parse(fs.readFileSync(target, 'utf8'));
  files.push(item);
}
assert.equal(ids.size, 22711);
assert.deepEqual([...nodeIds].sort(), [...ids].sort());
assert.deepEqual([...pythonIds].sort(), [...ids].sort());
const summary = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'summary-final.json')));
assert.equal(candidateObservations, summary.categories.A);
const artifacts = Object.fromEntries(files.map(f => [f.file, f]));
assert.equal(artifacts['observations.jsonl.gz'].rows, artifacts['observations-final.jsonl.gz'].rows);
assert.equal(artifacts['observations-final.jsonl.gz'].rows, Object.values(summary.categories).reduce((a, b) => a + b, 0));
const sources = ['__tests__/fixtures/korean-calendar/kasi-samples.json', '__tests__/fixtures/korean-calendar/kasi-24divisions.json', 'tools/oracle/service-source-pins.json', 'tools/oracle/source-pins.json', 'tools/oracle/contract.mjs'];
const sourceHashes = sources.map(file => ({ file, sha256: createHash('sha256').update(fs.readFileSync(path.join(REPO, file))).digest('hex') }));
const result = { status: 'verified', serviceBase: '20904183a1b0276584ed6f74313bf1e6cdeaf442', phase1Base: '8f5bd649b89cd6c5c8acf442faf2d2c508715bb2',
  corpusSize: ids.size, seed: '0x20261101', files, sourceHashes,
  chronology: 'node-* and controls/summary were captured before the contract.mjs historical offset seconds correction. adjudication/final classification preserve those originals and replay only 135 initial A input IDs. Re-running the corrected harness need not reproduce the provisional controls byte-for-byte.',
  checks: ['gzip/JSON parsing', 'unique complete Node/Python input IDs', 'A evidence fields', 'initial/final observation count conservation', 'final category counts'],
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) };
fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ verified: true, files: files.length, corpusSize: ids.size, candidateObservations, bytes: result.totalBytes }));
