// Reproducible offline projection of captured authority evidence into runtime data.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';
const file = path.join(REPO, 'docs/engine-audit/results/implementation-20261101/verified-authorities.json');
const bytes = fs.readFileSync(file), data = JSON.parse(bytes);
const text = [
  '// Generated from captured KASI/JPL evidence by tools/oracle/implementation/build-authorities.mjs. Separate from the legacy table.',
  `export const VERIFIED_AUTHORITY_VERSION = ${JSON.stringify(data.version)};`,
  `export const VERIFIED_AUTHORITY_FINGERPRINT = ${JSON.stringify(createHash('sha256').update(bytes).digest('hex'))};`,
  `export const VERIFIED_TERM_YEARS = Object.freeze(${JSON.stringify(data.termYears)});`,
  `export const VERIFIED_NODE_TERMS = Object.freeze(${JSON.stringify(data.terms)}.map(Object.freeze));`,
  `export const VERIFIED_LUNAR_MONTHS = Object.freeze(${JSON.stringify(data.months)}.map(Object.freeze));`,
  '',
].join('\n');
const target = path.join(REPO, 'lib/korean-calendar/authority-data.generated.js');
if (process.argv.includes('--check')) { if (fs.readFileSync(target, 'utf8') !== text) throw new Error('AUTHORITY_DATA_STALE'); }
else fs.writeFileSync(target, text);
console.log(`authority data ${process.argv.includes('--check') ? 'verified' : 'generated'}`);
