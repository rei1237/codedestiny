import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';
const out = path.join(REPO, 'docs/engine-audit/results/implementation-20261101');
const sha = value => createHash('sha256').update(value).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(out, name)));
const pinBytes = fs.readFileSync(path.join(REPO, 'tools/oracle/implementation/service-source-pins.json'));
const pins = JSON.parse(pinBytes);
for (const files of Object.values(pins.domains)) for (const [file, hash] of Object.entries(files)) assert.equal(sha(fs.readFileSync(path.join(REPO, file), 'utf8').replaceAll('\r\n', '\n')), hash);
const impact = [0, 1, 2, 3].map(n => read(`impact-${n}.json`));
assert.ok(impact.every(r => r.sourcePinHash === sha(pinBytes) && r.offDifferences.length === 0 && r.enabledErrors.length === 0));
const summary = {
  status: 'implemented-default-off-local-only', baselineCommit: pins.baselineCommit, sourcePinHash: sha(pinBytes),
  originalRegression: { cases: read('regression-101.json').cases, fields: read('regression-101.json').verifiedFields },
  randomInputs: impact.reduce((n, r) => n + r.randomInputs, 0), offComparisons: 40000, offDifferences: 0,
  enabled: Object.fromEntries(['saju', 'ziwei'].map(d => [d, impact.reduce((n, r) => n + r.enabled[d], 0)])),
  changedFacts: Object.fromEntries(['saju', 'ziwei'].map(d => [d, impact.reduce((n, r) => n + r.changedFacts[d], 0)])),
  additionalConfirmedSameFamilies: read('additional-impact-adjudication.json').cases.length,
  schemaChanges: false, savedResultsRecalculated: false, swissExecuted: false, push: false, deploy: false,
};
assert.equal(summary.randomInputs, 20000); assert.equal(summary.originalRegression.cases, 101); assert.equal(summary.originalRegression.fields, 1109);
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
const preserved = [];
for (const dir of ['phase2-20261101', 'adjudication-20261101']) {
  const root = path.join(REPO, 'docs/engine-audit/results', dir), manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  for (const e of manifest.files) { const bytes = fs.readFileSync(path.join(root, e.file)); assert.equal(bytes.length, e.bytes); assert.equal(sha(bytes), e.sha256); }
  preserved.push({ directory: dir, files: manifest.files.length, manifestSha256: sha(fs.readFileSync(path.join(root, 'manifest.json'))) });
}
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
assert.ok(!walk(out).some(f => /progress-|\.partial$/.test(path.basename(f))));
const files = walk(out).filter(f => path.basename(f) !== 'manifest.json').sort().map(file => {
  const bytes = fs.readFileSync(file); return { file: path.relative(out, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
});
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ preserved, files, totalBytes: files.reduce((n, f) => n + f.bytes, 0) }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...summary, evidenceFiles: files.length, evidenceBytes: files.reduce((n, f) => n + f.bytes, 0), priorFilesPreserved: preserved.reduce((n, r) => n + r.files, 0) }));
