import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { paidDetailsIdentity } from '../../lib/idol-chemi/paid-details-key.mjs';
import { readOrSaveBiasDetails } from '../../worker/lib/destiny-bias-paid-details.js';
import { isStoredChemiReport } from '../../lib/records/stored-bias-shape.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const bundle = await build({ stdin: { contents: `export {buildChemiReport} from './app/saju/destiny-bias/engine/chemiReportBridge.ts'; export {resolvePartner,listRosterGroups,listGroupMembers} from './lib/idol-chemi/index.js';`, resolveDir: root, loader: 'ts' },
  bundle: true, write: false, format: 'iife', globalName: 'M', platform: 'node', alias: { '@': root }, logLevel: 'error' });
const engine = new Function(bundle.outputFiles[0].text + ';return M;')();
const group = engine.listRosterGroups()[0];
const member = engine.listGroupMembers(group.id)[0];
const partner = engine.resolvePartner({ kind: 'roster', id: member.id });
const report = engine.buildChemiReport({ user: { birthDate: '1990-05-17', calendarType: 'solar' }, partner, referenceDate: '2026-11-09' });
const input = { birthDate: '19900517', calendarType: 'solar', partner: { kind: 'roster', id: partner.id }, report };

function fixture() {
  const rows = [], calls = { proof: 0, save: 0 };
  const deps = {
    find: async query => rows.find(row => row.userId === query.userId && row.metadata.biasInputHash === query['metadata.biasInputHash']),
    revoked: async () => false,
    signature: value => value,
    prove: async () => { calls.proof++; return { proven: true, source: 'payment', transactionId: 'payment-1' }; },
    save: async value => {
      calls.save++;
      let row = rows.find(row => row.userId === value.userId && row.executionKey === value.executionKey);
      if (!row) { row = structuredClone(value); rows.push(row); }
      return row;
    },
  };
  return { rows, calls, deps, run: async (body = input, userId = 'account-a', save = true) => { const identity = await paidDetailsIdentity(body); const {birthDate, calendarType, ...wire} = body; return readOrSaveBiasDetails({ userId, input: { ...wire, inputHash: identity.hash }, save }, deps); } };
}

test('normalization keeps the same retry key; partner and calendar changes separate purchases', async () => {
  const a = await paidDetailsIdentity(input);
  assert.deepEqual(a, await paidDetailsIdentity({ ...input, birthDate: '1990-05-17' }));
  assert.notEqual(a.hash, (await paidDetailsIdentity({ ...input, calendarType: 'lunar' })).hash);
  assert.notEqual(a.hash, (await paidDetailsIdentity({ ...input, partner: { ...input.partner, id: 'another' } })).hash);
  assert.doesNotMatch(a.requestId, /19900517/);
});

test('paid original is restored after refresh without proof, charge or regeneration', async () => {
  assert.ok(isStoredChemiReport(report));
  assert.ok(Buffer.byteLength(JSON.stringify(input)) < 65536);
  const f = fixture();
  assert.equal((await f.run()).status, 200);
  const original = structuredClone(f.rows[0].metadata.chemiReport);
  const response = await f.run({ ...input, report: { ...report, totalScore: 1 } }, 'account-a', false);
  assert.deepEqual(response.body.report, original);
  assert.deepEqual(f.calls, { proof: 1, save: 1 });
  assert.equal(f.rows[0].preserveOriginal, true);
  assert.doesNotMatch(JSON.stringify(f.rows[0]), /1990-05-17|19900517/);
});

test('lookup cannot expose another account or write results', async () => {
  const f = fixture(); await f.run();
  assert.equal((await f.run(input, 'account-b', false)).body.found, false);
  assert.deepEqual(f.calls, { proof: 1, save: 1 });
});

test('refund blocks stored original without another payment', async () => {
  const f = fixture(); await f.run(); f.deps.revoked = async () => true;
  assert.equal((await f.run()).body.error.code, 'RESULT_REVOKED');
  assert.deepEqual(f.calls, { proof: 1, save: 1 });
});

test('missing payment and DB failure never save or silently consume a pass', async () => {
  const f = fixture();
  f.deps.prove = async args => { assert.equal(args.requireExisting, true); return { proven: false }; };
  assert.equal((await f.run()).body.error.code, 'PAYMENT_NOT_VERIFIED');
  f.deps.prove = async () => ({ proven: null });
  assert.equal((await f.run()).status, 503);
  assert.equal(f.calls.save, 0);
});

test('one receipt cannot grant a second birthday; retry preserves the first original', async () => {
  const f = fixture(); const receipt = { ...input, requestId: 'paid-redirect:receipt-0001' };
  assert.equal((await f.run(receipt)).status, 200);
  assert.equal((await f.run({ ...receipt, birthDate: '19910517' })).body.error.code, 'RECEIPT_ALREADY_USED');
  assert.equal((await f.run({ ...receipt, requestId: 'another-alias:receipt-0001', birthDate: '19920517' })).body.error.code, 'RECEIPT_ALREADY_USED');
  assert.deepEqual(f.rows[0].metadata.chemiReport, report);
});
