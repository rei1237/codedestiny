import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyFortuneDateContract, resolveFortuneBuildDateContext } from '../lib/fortune-date-contract.mjs';
import { fortuneArticleDates } from '../../lib/fortune/article-dates.mjs';

const fixture = ({ title = '쥐띠 내일의 운세 10월 19일 | 총운 7/10', h1 = '쥐띠 내일의 운세', date = '2026-10-19', label = '2026년 10월 19일', articleDate = date, published = `${articleDate}T00:00:00+09:00`, dateModified = published, headline = title, hidden = false } = {}) => `<html><head><title>${title}</title></head><body><main><header><time data-cd-fortune-range-marker datetime="${date}"${hidden ? ' hidden' : ''}>${label}</time><h1>${h1}</h1></header><p>날짜와 별자리의 계산 기준으로 정리한 공개 결과입니다.</p></main><script type="application/ld+json">${JSON.stringify({ '@type': 'Article', headline, datePublished: published, ...(dateModified === '' ? {} : { dateModified }) })}</script></body></html>`;
// 대상일(10-19) 09:00 KST 에 검사한다. 실제 시계에 기대지 않는다.
const inspect = html => verifyFortuneDateContract(html, { period: 'tomorrow', businessDate: '2026-10-18', buildTime: new Date('2026-10-19T00:00:00Z') });

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
  assert.ok(inspect(fixture({ articleDate: '2026-10-17' })).failures.some(message => message.includes('datePublished')));
  assert.ok(inspect(fixture({ hidden: true })).failures.some(message => message.includes('visible fortune range')));
  assert.ok(inspect(fixture({ headline: '쥐띠 내일의 운세 10월 18일' })).failures.some(message => message.includes('headline')));
  assert.ok(inspect(fixture({ title: '쥐띠 내일의 운세 2025년 10월 19일' })).failures.some(message => message.includes('title year')));
});

test('weekly and monthly ranges use the same calendar convention across month/year boundaries', () => {
  const weekly = fixture({ title: '쥐띠 이번 주 운세 10월 26~11월 1일', h1: '쥐띠 이번 주 운세', date: '2026-10-26', label: '10월 26일 ~ 11월 1일' });
  assert.deepEqual(verifyFortuneDateContract(weekly, { period: 'weekly', businessDate: '2026-11-01', buildTime: new Date('2026-11-01T14:00:00Z') }).failures, []);
  const monthly = fixture({ title: '쥐띠 이번 달 운세 2027년 1월', h1: '쥐띠 이번 달 운세', date: '2027-01-01', label: '2027년 1월' });
  assert.deepEqual(verifyFortuneDateContract(monthly, { period: 'monthly', businessDate: '2027-01-01', buildTime: new Date('2027-01-01T00:00:00Z') }).failures, []);
  const tomorrow = fixture({ title: '쥐띠 내일의 운세 1월 1일', date: '2027-01-01', label: '2027년 1월 1일', published: '2026-12-31T00:10:00+09:00' });
  assert.deepEqual(verifyFortuneDateContract(tomorrow, { period: 'tomorrow', businessDate: '2026-12-31', buildTime: new Date('2026-12-30T15:20:00Z') }).failures, []);
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

test('tomorrow Article published the day before at build time passes; future or missing dateModified fails', () => {
  const build = new Date('2026-10-18T06:00:00Z'); // 15:00 KST, 대상일 10-19 전날
  const ok = fixture({ published: '2026-10-18T15:00:00+09:00' });
  assert.deepEqual(verifyFortuneDateContract(ok, { period: 'tomorrow', businessDate: '2026-10-18', buildTime: build }).failures, []);
  const future = verifyFortuneDateContract(fixture(), { period: 'tomorrow', businessDate: '2026-10-18', buildTime: build });
  assert.ok(future.failures.some((m) => m.includes('after build time')));
  const missing = verifyFortuneDateContract(fixture({ dateModified: '' }), { period: 'tomorrow', businessDate: '2026-10-18', buildTime: new Date('2026-10-20T00:00:00Z') });
  assert.ok(missing.failures.some((m) => m.includes('dateModified')));
});

test('fortuneArticleDates clamps to build time across midnight, month and year boundaries', () => {
  assert.deepEqual(fortuneArticleDates('2027-01-01', new Date('2026-12-31T14:59:59Z')), { datePublished: '2026-12-31T23:59:59+09:00', dateModified: '2026-12-31T23:59:59+09:00' });
  assert.equal(fortuneArticleDates('2027-01-01', new Date('2026-12-31T15:05:00Z')).datePublished, '2027-01-01T00:00:00+09:00');
  assert.equal(fortuneArticleDates('2026-11', new Date('2026-11-01T00:00:00Z')).datePublished, '2026-11-01T00:00:00+09:00');
  assert.equal(fortuneArticleDates('2026-10-26', new Date('2026-11-01T14:00:00Z')).datePublished, '2026-10-26T00:00:00+09:00');
});

test('fortuneArticleDates: exact midnight, monthly year rollover, leap day, sub-second build time and invalid input', () => {
  // 대상일 00:00 KST 와 빌드 시각이 같으면 둘 다 그 순간이다(경계 포함).
  assert.deepEqual(fortuneArticleDates('2027-01', new Date('2026-12-31T15:00:00Z')), { datePublished: '2027-01-01T00:00:00+09:00', dateModified: '2027-01-01T00:00:00+09:00' });
  // 월간: 12월 31일 23:59 KST 빌드는 아직 12월이다.
  assert.equal(fortuneArticleDates('2026-12', new Date('2026-12-31T14:59:00Z')).datePublished, '2026-12-01T00:00:00+09:00');
  assert.equal(fortuneArticleDates('2028-02-29', new Date('2028-03-01T00:00:00Z')).datePublished, '2028-02-29T00:00:00+09:00');
  // 밀리초는 버린다(내림) — 문자열이 실제 빌드 시각보다 뒤가 되지 않는다.
  assert.equal(fortuneArticleDates('2026-10-19', new Date('2026-10-18T06:00:00.999Z')).dateModified, '2026-10-18T15:00:00+09:00');
  for (const bad of ['2026-13-01', '2026-02-30', '2026-1', '20261019', '2026-00', '']) assert.throws(() => fortuneArticleDates(bad, new Date()), /dateKey/, bad);
  assert.throws(() => fortuneArticleDates('2026-10-19', new Date('nope')), /now/);
});

test('date boundaries: pages rendered at 23:59 KST, just after midnight on a stale manifest, and on the 1st pass when verified later', () => {
  const page = (dateKey, renderedAt, extra) => {
    const dates = fortuneArticleDates(dateKey, renderedAt);
    return fixture({ ...extra, published: dates.datePublished, dateModified: dates.dateModified });
  };
  const tomorrowJan1 = { title: '쥐띠 내일의 운세 1월 1일', date: '2027-01-01', label: '2027년 1월 1일' };
  const todayDec31 = { title: '쥐띠 오늘의 운세 12월 31일', h1: '쥐띠 오늘의 운세', date: '2026-12-31', label: '2026년 12월 31일' };
  // ① 12-31 23:59:59 KST 렌더(매니페스트 today=12-31). 같은 순간과 자정을 넘긴 뒤(00:01:59) 검사한다.
  const late = new Date('2026-12-31T14:59:59Z');
  for (const verifiedAt of [late, new Date('2026-12-31T15:01:59Z')]) {
    assert.deepEqual(verifyFortuneDateContract(page('2027-01-01', late, tomorrowJan1), { period: 'tomorrow', periodDate: '2027-01-01', buildTime: verifiedAt }).failures, [], `tomorrow ${verifiedAt.toISOString()}`);
    assert.deepEqual(verifyFortuneDateContract(page('2026-12-31', late, todayDec31), { period: 'today', periodDate: '2026-12-31', buildTime: verifiedAt }).failures, [], `today ${verifiedAt.toISOString()}`);
  }
  // ② prebuild 는 12-31 에 매니페스트를 썼고 렌더는 01-01 00:00:30 KST 에 됐다(매니페스트가 아직 안 넘어감).
  const afterMidnight = new Date('2026-12-31T15:00:30Z');
  assert.deepEqual(verifyFortuneDateContract(page('2027-01-01', afterMidnight, tomorrowJan1), { period: 'tomorrow', periodDate: '2027-01-01', buildTime: afterMidnight }).failures, []);
  assert.deepEqual(verifyFortuneDateContract(page('2026-12-31', afterMidnight, todayDec31), { period: 'today', periodDate: '2026-12-31', buildTime: afterMidnight }).failures, []);
  // ③ 월간: 1일 00:00:00 KST 정각에 렌더하고 같은 순간 검사(같으면 통과). 연 경계.
  const jan1 = new Date('2026-12-31T15:00:00Z');
  const monthly = { title: '쥐띠 이번 달 운세 2027년 1월', h1: '쥐띠 이번 달 운세', date: '2027-01-01', label: '2027년 1월' };
  assert.deepEqual(verifyFortuneDateContract(page('2027-01', jan1, monthly), { period: 'monthly', periodDate: '2027-01-01', buildTime: jan1 }).failures, []);
  // ④ 주간: 일요일 23:59 KST 렌더, 월말을 넘는 주(10-26~11-01).
  const sunday = new Date('2026-11-01T14:59:00Z');
  const weekly = { title: '쥐띠 이번 주 운세 10월 26~11월 1일', h1: '쥐띠 이번 주 운세', date: '2026-10-26', label: '10월 26일 ~ 11월 1일' };
  assert.deepEqual(verifyFortuneDateContract(page('2026-10-26', sunday, weekly), { period: 'weekly', periodDate: '2026-10-26', buildTime: sunday }).failures, []);
  // ⑤ 오래된 dist 를 며칠 뒤 검사해도(now ≥ 빌드 시각) 통과한다.
  assert.deepEqual(verifyFortuneDateContract(page('2027-01-01', late, tomorrowJan1), { period: 'tomorrow', periodDate: '2027-01-01', buildTime: new Date('2027-01-05T00:00:00Z') }).failures, []);
  // 검사 시각이 렌더보다 1초라도 앞이면(시계가 거꾸로) 실패한다.
  const skew = verifyFortuneDateContract(page('2027-01-01', late, tomorrowJan1), { period: 'tomorrow', periodDate: '2027-01-01', buildTime: new Date('2026-12-31T14:59:58Z') });
  assert.ok(skew.failures.some((m) => m.includes('after build time')), skew.failures.join('; '));
});

test('Article dates: two days early, unparsable, dateModified before publish or after build are rejected; evidence carries dateModified', () => {
  const build = new Date('2026-10-19T00:00:00Z');
  const run = (extra) => verifyFortuneDateContract(fixture(extra), { period: 'tomorrow', businessDate: '2026-10-18', buildTime: build }).failures;
  assert.ok(run({ published: '2026-10-17T23:59:59+09:00' }).some((m) => m.includes('or the day before')));
  assert.ok(run({ published: '2026-10-18T00:00:00+09:00' }).every((m) => !m.includes('datePublished')));
  assert.ok(run({ published: 'October 19, 2026' }).some((m) => m.includes('datePublished')));
  assert.ok(run({ published: '2026-10-18T15:00:00+09:00', dateModified: '2026-10-18T14:00:00+09:00' }).some((m) => m.includes('dateModified')));
  assert.ok(run({ dateModified: '2026-10-19T09:00:01+09:00' }).some((m) => m.includes('dateModified')));
  assert.ok(run({ dateModified: 'soon' }).some((m) => m.includes('dateModified')));
  assert.deepEqual(run({ dateModified: '2026-10-19T09:00:00+09:00' }), []);
  // UTC 표기도 같은 순간으로 읽는다(10-18 15:00Z = 10-19 00:00 KST).
  assert.deepEqual(run({ published: '2026-10-18T15:00:00Z', dateModified: '2026-10-18T15:00:00.000Z' }), []);
  const result = verifyFortuneDateContract(fixture({ dateModified: '2026-10-19T08:00:00+09:00' }), { period: 'tomorrow', businessDate: '2026-10-18', buildTime: build });
  assert.equal(result.evidence.articles[0].dateModified, '2026-10-19T08:00:00+09:00');
});
