import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSearchObservations } from './search-evaluation.mjs';

const actual = { provider: 'google', queryId: 'B01', phase: 'before', status: 'observed', method: 'ui', observedAt: '2026-10-31T06:00:00Z',
  evidence: { url: 'https://www.google.com/search?q=example', text: 'Actual captured result', sources: ['https://code-destiny.com/'] },
  assessment: { officialUrl: true }, reasons: { officialUrl: 'Official URL appeared as a result link, not necessarily as an AI citation.' } };
test('brand and nonbrand have separate denominators and unknown prices stay unknown', () => {
  const r = evaluateSearchObservations([actual, { provider:'google',queryId:'N01',phase:'before',status:'not_run' }]);
  const brand = r.summary.find(row => row.phase === 'before' && row.provider === 'google' && row.group === 'brand');
  const nonbrand = r.summary.find(row => row.phase === 'before' && row.provider === 'google' && row.group === 'nonbrand');
  assert.deepEqual(brand.criteria.officialUrl, { passed:1,evaluated:1 });
  assert.deepEqual(brand.criteria.priceAccuracy, { passed:0,evaluated:0 });
  assert.equal(nonbrand.observed, 0);
  assert.equal(r.rows[0].assessment.nonbrandDiscovery, null);
});
test('mock and inaccessible answers are never counted as actual search outcomes', () => {
  assert.throws(() => evaluateSearchObservations([{ ...actual, mock:true }]), /actual/);
  assert.throws(() => evaluateSearchObservations([{ ...actual, status:'blocked' }]), /cannot receive scores/);
  assert.throws(() => evaluateSearchObservations([{ ...actual, method:'generated_example' }]), /actual/);
});
test('evidence, identity and unique sample keys are required', () => {
  assert.throws(() => evaluateSearchObservations([{ ...actual, evidence:{ url:actual.evidence.url,text:'' } }]), /evidence/);
  assert.throws(() => evaluateSearchObservations([{ ...actual, reasons:{} }]), /criterion evidence/);
  assert.throws(() => evaluateSearchObservations([actual,actual]), /Duplicate/);
  assert.throws(() => evaluateSearchObservations([{ ...actual, queryId:'unknown' }]), /Unknown/);
});
test('day precision is retained without inventing an exact observation time', () => {
  const dated = { ...actual, observedAt: undefined, observedOn: '2026-10-31' };
  assert.equal(evaluateSearchObservations([dated]).rows[0].observedOn, '2026-10-31');
  assert.throws(() => evaluateSearchObservations([{ ...dated, observedOn: '' }]), /observation/);
});
