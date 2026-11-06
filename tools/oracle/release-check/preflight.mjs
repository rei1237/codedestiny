// Pre-install inspection only. Never import a package, run a lifecycle script or read secrets.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const approved = new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','CC0-1.0','Unlicense','0BSD']);
const prohibited = /sweph|swisseph|swiss[-_ ]?ephemeris|swissephsharp|@swisseph\/|(?:^|\/)jyotish(?:$|[@/.-])/i;
const manifestGroups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

export function inspectLock(manifest, lock) {
  const violations = [];
  if (manifest.workspaces || lock.packages?.['']?.workspaces) violations.push({ issue: 'workspace-review' });
  if (![2, 3].includes(lock.lockfileVersion) || !lock.packages?.['']) throw Error('Expected npm lockfile v2/v3 with a root entry');
  const lifecycle = ['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare'];
  for (const hook of lifecycle) if (manifest.scripts?.[hook]) violations.push({ name: hook, issue: 'install-script-review' });
  for (const group of manifestGroups) {
    const declarations = manifest[group] || {}, locked = lock.packages[''][group] || {};
    for (const name of new Set([...Object.keys(declarations), ...Object.keys(locked)])) {
      if (declarations[name] !== locked[name]) violations.push({ name, issue: 'manifest-lock-mismatch' });
      if (prohibited.test(name + '/' + declarations[name])) violations.push({ name, issue: 'prohibited-declaration' });
      if (declarations[name] && !lock.packages['node_modules/' + name]) violations.push({ name, issue: 'missing-lock-entry' });
    }
  }
  for (const [location, pkg] of Object.entries(lock.packages)) {
    if (!location) continue;
    const name = pkg.name || location.split('node_modules/').at(-1);
    const dependencies = manifestGroups.flatMap(group => Object.entries(pkg[group] || {}).map(([key, spec]) => key + '/' + spec));
    if ([location, name, pkg.resolved || '', ...dependencies].some(value => prohibited.test(value))) violations.push({ name, issue: 'prohibited-package' });
    // Only a directly recognized SPDX value passes automatically. Compound or
    // missing metadata requires a documented license review before installation.
    if (!approved.has(pkg.license)) violations.push({ name, issue: 'license-review', license: pkg.license || null });
    if (pkg.hasInstallScript) violations.push({ name, issue: 'install-script-review' });
    if (pkg.link || !/^https:\/\/registry\.npmjs\.org\//.test(pkg.resolved || '') || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(pkg.integrity || ''))
      violations.push({ name, issue: 'source-review' });
  }
  return violations;
}

export function inspectAssets(directory) {
  const findings = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) findings.push({ file, issue: 'artifact-link-review' });
      else if (entry.isDirectory()) visit(file);
      else if (prohibited.test(path.relative(directory, file)) || /\.(?:se1|se2)$/i.test(file)) findings.push({ file, issue: 'prohibited-asset' });
      else if (/\.wasm$/i.test(file)) findings.push({ file, issue: 'wasm-origin-review' });
    }
  }
  visit(directory);
  return findings;
}

export function inspectProject(root) {
  if (!fs.existsSync(path.join(root, 'package-lock.json'))) return [{ issue: 'missing-lockfile' }];
  const json = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const findings = inspectLock(json('package.json'), json('package-lock.json'));
  for (const folder of ['js/vendor', 'public']) {
    const dir = path.join(root, folder);
    if (fs.existsSync(dir)) findings.push(...inspectAssets(dir));
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const findings = inspectProject(path.resolve(process.argv[2] || '.'));
  const counts = {};
  for (const row of findings) counts[row.issue] = (counts[row.issue] || 0) + 1;
  console.log(JSON.stringify({ manifestAndAssetsPass: !findings.length, counts,
    prohibited: findings.filter(row => row.issue.startsWith('prohibited')) }, null, 2));
  if (findings.length) process.exitCode = 1;
}
