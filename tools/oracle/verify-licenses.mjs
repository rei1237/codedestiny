import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const ALLOWED = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'CC0-1.0', 'Unlicense', '0BSD']);
export const FORBIDDEN = /(?:sweph|swisseph|swiss[-_]?ephemeris|pysweph|jyotish)/i;

// Read metadata only: no package code is loaded before this check.
export function verifyLicenses(root = ROOT) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const pins = JSON.parse(fs.readFileSync(path.join(root, 'source-pins.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const report = [];
  for (const [location, locked] of Object.entries(lock.packages)) {
    if (!location) continue;
    if (!location.startsWith('node_modules/') || location.includes('..') || FORBIDDEN.test(location) || !ALLOWED.has(locked.license)) {
      throw new Error(`LICENSE_GATE: ${location}`);
    }
    const name = location.slice('node_modules/'.length);
    const pin = pins.packages.find(row => row.name === name && row.version === locked.version);
    if (!pin || pin.integrity !== locked.integrity || pin.license !== locked.license) throw new Error(`PIN_MISMATCH: ${name}`);
    const directory = path.join(root, location);
    if (!fs.existsSync(directory)) {
      if (!locked.optional) throw new Error(`PACKAGE_MISSING: ${name}`);
      continue;
    }
    const realRoot = fs.realpathSync(path.join(root, 'node_modules')) + path.sep;
    if (!fs.realpathSync(directory).startsWith(realRoot)) throw new Error(`ISOLATION_ESCAPE: ${name}`);
    const installed = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
    if (installed.version !== locked.version || installed.license !== locked.license) throw new Error(`INSTALLED_METADATA_MISMATCH: ${name}`);
    const licenseFiles = fs.readdirSync(directory).filter(file => /^(license|licence|copying)/i.test(file));
    for (const file of licenseFiles) fs.readFileSync(path.join(directory, file), 'utf8');
    report.push({ name, version: installed.version, license: installed.license, metadata: `${location}/package.json`, licenseFiles: licenseFiles.map(file => `${location}/${file}`) });
  }
  for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    if (!report.some(row => row.name === name && row.version === version)) throw new Error(`DIRECT_PIN_MISMATCH: ${name}`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify({ status: 'ok', installed: verifyLicenses() }, null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
