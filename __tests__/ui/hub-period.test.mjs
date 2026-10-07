import test from 'node:test';
import assert from 'node:assert/strict';
import { hubDay, labelHubPeriod } from '../../lib/fortune/hub-period.mjs';
test('KST day selection handles midnight, month/year rollover and leap day', () => {
  for (const [instant, today, tomorrow] of [
    ['2026-12-31T14:59:59Z', {year:2026,month:12,day:31}, {year:2027,month:1,day:1}],
    ['2026-12-31T15:00:00Z', {year:2027,month:1,day:1}, {year:2027,month:1,day:2}],
    ['2028-02-28T03:00:00Z', {year:2028,month:2,day:28}, {year:2028,month:2,day:29}],
  ]) {
    assert.deepEqual(hubDay('today', new Date(instant)), today);
    assert.deepEqual(hubDay('tomorrow', new Date(instant)), tomorrow);
  }
});
test('tomorrow display adapter preserves scores, dates and the engine result', () => {
  const original = {date:'2026-10-09', systems:{saju:{headline:'오늘의 일진',score:70,sections:[{lines:['오늘 할 일']}]},vedic:null}};
  const next = labelHubPeriod(original,'tomorrow','ko');
  assert.equal(next.systems.saju.headline,'내일의 일진');
  assert.equal(next.systems.saju.score,70);
  assert.equal(next.date,original.date);
  assert.equal(original.systems.saju.headline,'오늘의 일진');
  assert.equal(labelHubPeriod(original,'today','ko'),original);
});
