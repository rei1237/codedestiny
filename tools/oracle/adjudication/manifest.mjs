// Hash captured evidence without fetching data or executing service engines.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { OUT } from './output.mjs';
import { REPO } from '../service-runner.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path.join(REPO, 'docs/engine-audit/results/phase2-20261101');
const priorManifest = JSON.parse(fs.readFileSync(path.join(prior, 'manifest.json')));
for (const entry of priorManifest.files) {
  const bytes = fs.readFileSync(path.join(prior, entry.file));
  assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256);
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
const files = walk(OUT).filter(f => path.basename(f) !== 'manifest.json').sort().map(file => {
  const bytes = fs.readFileSync(file), entry = { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
  if (entry.file.startsWith('sources/') && file.endsWith('.json')) {
    const source = JSON.parse(bytes);
    if (source.url) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:'); assert.ok(['astro.kasi.re.kr', 'ssd.jpl.nasa.gov'].includes(url.hostname));
      entry.url = source.url; entry.capturedAt = source.capturedAt;
    }
    if (source.bodySha256) assert.equal(sha(source.body), source.bodySha256);
  }
  return entry;
});
const manifest = { status: 'verified', serviceBase: priorManifest.serviceBase, phase2EvidenceCommit: '1b91faf5380e3ab07da71e3dc29f6a892d8bc448', priorManifestSha256: sha(fs.readFileSync(path.join(prior, 'manifest.json'))), priorFilesPreserved: priorManifest.files.length, files, totalBytes: files.reduce((n, f) => n + f.bytes, 0) };
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ files: files.length, bytes: manifest.totalBytes, priorFilesPreserved: manifest.priorFilesPreserved }));
