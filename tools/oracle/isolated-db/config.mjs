import { createHash } from 'node:crypto';

export const COLLECTIONS = Object.freeze({ preparations: 'ziweiCalculationPreparations', consultations: 'ziweiAiConsultations' });
export const LIMITS = Object.freeze({ preparations: 4, consultations: 2, insertAttempts: 26, reads: 160 });
export const FEATURE = 'ziwei-ai-consultation';
export const PROTOCOL = 'ziwei-prepared-v1';
export const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const digest = value => createHash('sha256').update(stable(value)).digest('hex');
export function fail(code) { throw Object.assign(new Error(code), { code }); }
export function check(condition, code = 'AUDIT_ASSERTION_FAILED') { if (!condition) fail(code); }
export function parseArgs(args) {
  const out = { mode: 'mock', runId: 'syntheticlocal01' }, seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const key = { '--mode': 'mode', '--run-id': 'runId', '--approval': 'approval' }[args[i]];
    check(key && !seen.has(key) && args[i + 1] && !args[i + 1].startsWith('--'), 'AUDIT_ARGUMENTS_INVALID');
    seen.add(key); out[key] = args[i + 1];
  }
  check(['plan', 'mock', 'check-driver', 'db'].includes(out.mode), 'AUDIT_ARGUMENTS_INVALID');
  check(/^[a-z0-9]{8,24}$/.test(out.runId), 'AUDIT_RUN_ID_INVALID');
  check(out.mode === 'db' ? Boolean(out.approval && seen.has('runId')) : !out.approval, 'AUDIT_APPROVAL_REQUIRED');
  return out;
}
export function validateApproval(approval, runId, sourceDigest, readUri, now = Date.now()) {
  check(approval?.approved === true && approval.scope === 'isolated-db-write-cr006'
    && approval.runId === runId && approval.sourceDigest === sourceDigest
    && approval.dedicatedDisposableInstance === true && approval.allowCreateCollections === true, 'AUDIT_APPROVAL_REQUIRED');
  const expiry = Date.parse(approval.expiresAt);
  check(Number.isFinite(expiry) && expiry > now && expiry - now <= 3600000, 'AUDIT_APPROVAL_EXPIRED');
  check(stable(approval.limits) === stable(LIMITS), 'AUDIT_LIMITS_INVALID');
  const target = approval.target;
  check(target?.host === '127.0.0.1' && Number.isInteger(target.port) && target.port >= 1024 && target.port <= 65535
    && target.database === `cd_engine_audit_cr006_${runId}`, 'AUDIT_TARGET_INVALID');
  const uri = readUri();
  let parsed;
  try { parsed = new URL(uri); } catch { fail('AUDIT_TARGET_INVALID'); }
  check(parsed.protocol === 'mongodb:' && parsed.hostname === target.host && Number(parsed.port) === target.port
    && parsed.pathname === `/${target.database}` && !parsed.search && !parsed.hash, 'AUDIT_TARGET_INVALID');
  return { uri, ...target };
}
export function createCases(runId, fixture) {
  check(fixture.schema === 'cr006-synthetic-db-v1' && fixture.syntheticOnly === true && fixture.concurrency === 20
    && stable(fixture.limits) === stable(LIMITS), 'AUDIT_FIXTURE_INVALID');
  const owner = `audit-${runId}-a`, other = `audit-${runId}-b`;
  const input = { birthInfo: fixture.birthInfo, topic: fixture.topic, userQuestion: fixture.userQuestion };
  const base = { userId: owner, input, inputHash: digest(input), rawBody: { calculationProtocol: PROTOCOL }, action: 'prepare', year: fixture.year, calendarAuthorityV2: false };
  const entries = Object.fromEntries(['main', 'lost', 'corrupt', 'missing'].map(key => [key, { ...base, requestId: `audit-${runId}-${key}` }]));
  entries.other = { ...entries.main, userId: other };
  const ids = Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, digest([FEATURE, value.userId, value.requestId])]));
  return { entries, ids, input, owner, other, consultationIds: [`audit-${runId}-saved-paid`, `audit-${runId}-partial`] };
}
