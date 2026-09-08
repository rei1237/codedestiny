import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickWins, scoreOpportunity, weights } from './growth-cycle.mjs';
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
