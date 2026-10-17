import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHoneyEconomy } from '../../scripts/report-honey-economy.mjs';
test('issuance, individual redemptions and measured AI costs are distinct; missing cost is not zero', () => {
  const result = summarizeHoneyEconomy({ ledgers: [
    { type: 'attendance', amount: 1 }, { type: 'attendance', amount: 0 },
    { type: 'spend', featureKey: 'section_summary', amount: 60 },
    { type: 'spend', featureKey: 'section_summary', amount: 60 },
    { type: 'unlock_request', amount: 0 },
  ], aiRuns: [{ featureKey: 'honey-letter', costKRW: 12 }, { featureKey: 'honey-letter' }] });
  assert.equal(result.attendanceIssued, 1);
  assert.deepEqual(result.spentByContent.section_summary, { uses: 2, honey: 120 });
  assert.deepEqual(result.aiPerks['honey-letter'], { runs: 2, knownCostKRW: 12, unmeasuredRuns: 1 });
});
