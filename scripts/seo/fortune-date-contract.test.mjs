import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyFortuneDateContract, resolveFortuneBuildDateContext } from '../lib/fortune-date-contract.mjs';

const fixture = ({ title = '쥐띠 내일의 운세 10월 19일 | 총운 7/10', h1 = '쥐띠 내일의 운세', date = '2026-10-19', label = '2026년 10월 19일', articleDate = date, headline = title, hidden = false } = {}) => `<html><head><title>${title}</title></head><body><main><header><time data-cd-fortune-range-marker datetime="${date}"${hidden ? ' hidden' : ''}>${label}</time><h1>${h1}</h1></header><p>날짜와 별자리의 계산 기준으로 정리한 공개 결과입니다.</p></main><script type="application/ld+json">${JSON.stringify({ '@type': 'Article', headline, datePublished: `${articleDate}T00:00:00+09:00` })}</script></body></html>`;
const inspect = html => verifyFortuneDateContract(html, { period: 'tomorrow', businessDate: '2026-10-18' });

test('same business date agrees across rendered title, H1 period, visible time and Article', () => {
  assert.deepEqual(inspect(fixture()).failures, []);
});

test('fresh schema cannot hide a stale title or stale visible body range', () => {
  const staleTitle = inspect(fixture({ title: '쥐띠 내일의 운세 10월 18일 | 총운 7/10' }));
  assert.ok(staleTitle.failures.some(message => message.startsWith('title date')));
  const staleBody = inspect(fixture({ label: '2026년 10월 18일' }));
  assert.ok(staleBody.failures.some(message => message.startsWith('visible body range')));
  const staleTime = inspect(fixture({ date: '2026-10-18', articleDate: '2026-10-19' }));
  assert.ok(staleTime.failures.some(message => message.startsWith('body time datetime')));
});

test('H1 period, schema date, hidden date and mismatched headline are independently rejected', () => {
  assert.ok(inspect(fixture({ h1: '쥐띠 오늘의 운세' })).failures.some(message => message.includes('H1 period')));
  assert.ok(inspect(fixture({ articleDate: '2026-10-18' })).failures.some(message => message.includes('datePublished')));
  assert.ok(inspect(fixture({ hidden: true })).failures.some(message => message.includes('visible fortune range')));
  assert.ok(inspect(fixture({ headline: '쥐띠 내일의 운세 10월 18일' })).failures.some(message => message.includes('headline')));
  assert.ok(inspect(fixture({ title: '쥐띠 내일의 운세 2025년 10월 19일' })).failures.some(message => message.includes('title year')));
});

test('weekly and monthly ranges use the same calendar convention across month/year boundaries', () => {
  const weekly = fixture({ title: '쥐띠 이번 주 운세 10월 26~11월 1일', h1: '쥐띠 이번 주 운세', date: '2026-10-26', label: '10월 26일 ~ 11월 1일' });
  assert.deepEqual(verifyFortuneDateContract(weekly, { period: 'weekly', businessDate: '2026-11-01' }).failures, []);
  const monthly = fixture({ title: '쥐띠 이번 달 운세 2027년 1월', h1: '쥐띠 이번 달 운세', date: '2027-01-01', label: '2027년 1월' });
  assert.deepEqual(verifyFortuneDateContract(monthly, { period: 'monthly', businessDate: '2027-01-01' }).failures, []);
  const tomorrow = fixture({ title: '쥐띠 내일의 운세 1월 1일', date: '2027-01-01', label: '2027년 1월 1일' });
  assert.deepEqual(verifyFortuneDateContract(tomorrow, { period: 'tomorrow', businessDate: '2026-12-31' }).failures, []);
});

test('build guard follows the daily manifest across midnight while range renderer keeps its KST clock', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'cd-fortune-date-contract-'));
  try {
    mkdirSync(join(rootDir, 'fortune/data'), { recursive: true });
    const file = join(rootDir, 'fortune/data/run-manifest.json');
    writeFileSync(file, JSON.stringify({ today: '2026-12-31', tomorrow: '2027-01-01', weekly: '2026-12-28', monthly: '2026-12-01' }));
    const context = resolveFortuneBuildDateContext({ rootDir, now: new Date('2026-12-31T15:01:00Z') });
    assert.equal(context.dailySource, 'fortune/data/run-manifest.json');
    assert.deepEqual(context.dates, { today: '2026-12-31', tomorrow: '2027-01-01', weekly: '2026-12-28', monthly: '2027-01-01' });
    writeFileSync(file, JSON.stringify({ today: '2026-12-31' }));
    const partial = resolveFortuneBuildDateContext({ rootDir, now: new Date('2026-12-31T15:01:00Z') });
    assert.equal(partial.dailySource, 'KST clock fallback', 'partial manifests must be rejected just like daily-data.ts');
    assert.equal(partial.dates.today, '2027-01-01');
  } finally { rmSync(rootDir, { recursive: true, force: true }); }
});
