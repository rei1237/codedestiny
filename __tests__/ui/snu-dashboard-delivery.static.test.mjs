import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('SNULIFE deep links recover the owned deterministic card before scrolling an already-open block', async () => {
  const source = await readFile(new URL('../../js/core/saju/reportDashboard.js', import.meta.url), 'utf8');
  const start = source.indexOf('window.openSajuFunFeature = function(targetId, afterAction)');
  const end = source.indexOf('\n};', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const body = source.slice(start, end);
  const recover = body.indexOf('_sajuFunTryRecoverTargetCard(targetId)');
  const scroll = body.indexOf('_sajuFunEnsureDashboardBlockOpen(target)');
  assert.ok(recover > -1 && scroll > recover);
});
