// Offline, explicit regeneration after reviewing source/dependency changes. Never installs or imports a driver.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
assert.deepEqual(process.argv.slice(2), ['--write']);
const sha = value => createHash('sha256').update(value).digest('hex');
const prior = JSON.parse(fs.readFileSync(path.join(root, 'tools/oracle/expansion/service-source-pins.json')));
const proof = JSON.parse(fs.readFileSync(path.join(root, 'docs/engine-audit/results/payment-cache-pins-20261101/final-source-proof.json')));
const sources = { ...prior.domains.ziwei };
for (const file of ['worker/lib/ziwei-calculation-preparation.js', 'worker/lib/ziwei-execution-adapter.js']) sources[file] = proof.preserved[file];
for (const [file, expected] of Object.entries(sources)) assert.equal(sha(fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n')), expected, file);
for (const file of ['run.mjs', 'network.mjs', 'config.mjs', 'storage.mjs', 'scenario.mjs', 'fixtures.json']) {
  sources[`tools/oracle/isolated-db/${file}`] = sha(fs.readFileSync(path.join(here, file), 'utf8').replaceAll('\r\n', '\n'));
}
const packages = [], seen = new Map();
function walk(name, parent = null) {
  const from = parent ? path.join(seen.get(parent), 'package.json') : path.join(root, 'package.json');
  const require = createRequire(from); let directory;
  try { directory = path.dirname(require.resolve(`${name}/package.json`)); }
  catch { directory = path.dirname(require.resolve(name)); while (!fs.existsSync(path.join(directory, 'package.json'))) directory = path.dirname(directory); }
  directory = fs.realpathSync(directory);
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'))), key = `${metadata.name}@${metadata.version}`;
  if (seen.has(key)) { assert.equal(seen.get(key), directory); return; } seen.set(key, directory);
  assert.ok(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'CC0-1.0', 'Unlicense', '0BSD'].includes(metadata.license), key);
  const license = fs.readdirSync(directory).find(file => /^licen[cs]e(?:[.-]|$)/i.test(file)); assert.ok(license, key);
  const licenseText = fs.readFileSync(path.join(directory, license), 'utf8');
  assert.ok(/Permission is hereby granted|Apache License|Redistribution and use|ISC License|public domain/i.test(licenseText), key);
  const files = { [license]: sha(Buffer.from(licenseText)) };
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.isSymbolicLink()) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:[cm]?js|json)$/.test(entry.name)) files[path.relative(directory, file).replaceAll('\\', '/')] = sha(fs.readFileSync(file));
    }
  }
  visit(directory);
  packages.push({ key, name: metadata.name, version: metadata.version, license: metadata.license, licenseFile: license, parent, files });
  console.log(JSON.stringify({ name, version: metadata.version, license: metadata.license, licenseFile: license, verifiedText: licenseText.slice(0, 90), files: Object.keys(files).length }));
  for (const dependency of Object.keys(metadata.dependencies || {})) walk(dependency, key);
}
walk('mongodb');
fs.writeFileSync(path.join(here, 'pins.json'), JSON.stringify({ schema: 1, sources, packages }, null, 2) + '\n');
console.log(JSON.stringify({ sources: Object.keys(sources).length, packages: packages.length, optionalPeers: 'not allowed by module resolver' }));
