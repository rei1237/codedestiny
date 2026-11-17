import test from 'node:test';
import assert from 'node:assert/strict';
import { sajuLuckPeriods } from '../../lib/saju/luck-periods.mjs';
import { buildSajuAdvancedFactors } from '../../worker/lib/saju-ai-prompt.js';

const pillars = { y: { g: '甲', j: '子' }, m: { g: '丙', j: '寅' }, d: { g: '庚', j: '申' }, h: { g: '丁', j: '亥' } };
test('different decades cannot create a 辰戌 clash or opening', () => {
  const result = buildSajuAdvancedFactors({ pillars, daewoon: [{ pillar: '壬辰', startAge: 30 }, { pillar: '戊戌', startAge: 60 }] });
  assert.deepEqual(result.earthStorageOpenings, []);
  assert.equal(result.periods.length, 3);
});
test('different annual rows cannot create a clash or three-branch repetition', () => {
  const result = buildSajuAdvancedFactors({ pillars, yearlyLuck: [{ year: 2024, pillar: '甲辰' }, { year: 2036, pillar: '丙辰' }, { year: 2048, pillar: '戊辰' }, { year: 2030, pillar: '庚戌' }] });
  assert.equal(result.doChung.exists, false);
  assert.deepEqual(result.earthStorageOpenings, []);
});
test('annual joins only its dated decade; explicit incompatible rows are rejected', () => {
  const rows = [
    { scope: 'daewoon', stem: '壬', branch: '辰', startYear: 2020, endYear: 2029 },
    { scope: 'daewoon', stem: '戊', branch: '戌', startYear: 2050, endYear: 2059 },
    { scope: 'sewoon', stem: '庚', branch: '戌', year: 2026 },
  ];
  const periods = sajuLuckPeriods(rows);
  assert.deepEqual(periods.at(-1).rows, [rows[0], rows[2]]);
  assert.throws(() => sajuLuckPeriods(rows, { simultaneous: true }), /NON_SIMULTANEOUS/);
  assert.throws(() => sajuLuckPeriods([rows[1], rows[2]], { simultaneous: true }), /NON_SIMULTANEOUS/);
});
test('natal-only calculation is independent of wall clock and omits automatic annual luck', () => {
  const result = buildSajuAdvancedFactors({ pillars });
  assert.deepEqual(result.periods.map(row => row.period.id), ['natal']);
  assert.deepEqual(buildSajuAdvancedFactors({ pillars }, undefined, { luckRows: [] }).earthStorageOpenings, []);
});
test('natal plus the current decade still produces the real clash, with a period identity', () => {
  const result = buildSajuAdvancedFactors({ pillars: { ...pillars, h: { g: '戊', j: '戌' } }, daewoon: [{ pillar: '壬辰', startAge: 30 }] });
  assert.ok(result.earthStorageOpenings.some(row => row.sourceBranch === '戌' && row.triggerBranch === '辰' && row.period.id.includes('daewoon')));
});

test('dated handover takes precedence over coarse endYear when the same year spans two decades', () => {
  const before = {scope:'daewoon',stem:'壬',branch:'辰',startYear:2020,endYear:2029,startDate:'2020-05-10',endDate:'2030-05-09'};
  const after = {scope:'daewoon',stem:'癸',branch:'巳',startYear:2030,endYear:2039,startDate:'2030-05-10',endDate:'2040-05-09'};
  const year = {scope:'sewoon',stem:'庚',branch:'戌',year:2030};
  const frames = sajuLuckPeriods([before,after,year]).filter(p => p.rows.includes(year));
  assert.deepEqual(frames.map(p => p.rows), [[before,year],[after,year]]);
  assert.doesNotThrow(() => sajuLuckPeriods([before,year], {simultaneous:true}));
});
