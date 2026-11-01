// Freeze only officially adjudicated fields. CI consumes this file, never the oracle packages.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';
const source = fs.readFileSync(path.join(REPO, 'docs/engine-audit/results/adjudication-20261101/decisions-official.json'));
const rows = JSON.parse(source).results;
const golden = { sourceSha256: createHash('sha256').update(source).digest('hex'), basis: 'KASI official lunar conversion and NASA/JPL DE441 adjudication, 2026-11-01; future epochs are prediction-versioned.', cases: rows.map(r => ({ id: r.id, domain: r.group.startsWith('A-saju') ? 'saju' : 'ziwei', input: r.input, flags: r.defect === 'TERM_INGRESS_PRECISION' ? { sajuTermAuthorityV2: true } : { koreanCalendarAuthorityV2: true }, expected: Object.fromEntries(r.verifiedFields.map(f => [f.field, f.expected])) })) };
const target = path.join(REPO, '__tests__/fixtures/korean-calendar/authority-v2-golden.json');
const text = JSON.stringify(golden, null, 2) + '\n';
if (process.argv.includes('--check')) { if (fs.readFileSync(target, 'utf8') !== text) throw new Error('AUTHORITY_GOLDEN_DRIFT'); }
else fs.writeFileSync(target, text, { flag: 'wx' });
console.log('Official golden: 101 inputs / 1109 expected fields.');
