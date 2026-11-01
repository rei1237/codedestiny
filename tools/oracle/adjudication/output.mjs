import path from 'node:path';
import { REPO } from '../service-runner.mjs';

const results = path.join(REPO, 'docs/engine-audit/results');
export const OUT = path.resolve(REPO, process.env.ORACLE_ADJUDICATION_OUTPUT ?? 'docs/engine-audit/results/adjudication-20261101');
const relative = path.relative(results, OUT);
if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('OUTPUT_MUST_BE_A_NEW_AUDIT_RESULTS_SUBDIRECTORY');
