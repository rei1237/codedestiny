import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickWins, scoreOpportunity, searchEvidence, weights } from './growth-cycle.mjs';
test('unknown metrics cannot make an outreach candidate ready', () => {
  assert.equal(scoreOpportunity({ ratings: {} }).contactReady, false);
  assert.equal(scoreOpportunity({ ratings: weights, reviewed: true }).score, 100);
  assert.equal(scoreOpportunity({ ratings: weights, reviewed: true, excluded: true }).contactReady, false);
  assert.throws(() => scoreOpportunity({ ratings: { relevance: 26 } }));
});
test('query and page aggregates are never fabricated into joined rows', () => {
  const result = quickWins([{ query: '숙요점 영친', impressions: 3, position: 8.7 },
    { page: '/sukuyo/', impressions: 8, position: 9.4 }, { query: 'unknown', impressions: null, position: 8 }]);
  assert.equal(result.length, 2);
  assert.equal(result[0].evidence, 'page-only');
  assert.equal(result[1].page, undefined);
});
test('recent account visits cannot refresh old search evidence', () => {
  const now = Date.parse('2026-09-14T12:00:00Z');
  const state = { observedAt: '2026-09-14', period: { end: '2026-09-01' },
    gscRows: [{ query: '숙요점', impressions: 100, position: 8 }] };
  assert.deepEqual(searchEvidence(state, now), { stale: true, quickWins: [] });
  state.period.end = '2026-09-11';
  assert.equal(searchEvidence(state, now).quickWins.length, 1);
  state.observedAt = '2026-09-01';
  assert.equal(searchEvidence(state, now).stale, true);
  state.observedAt = '2026-09-15';
  assert.throws(() => searchEvidence(state, now), /Invalid search evidence date/);
  state.observedAt = 'unknown';
  assert.throws(() => searchEvidence(state, now), /Invalid search evidence date/);
});
