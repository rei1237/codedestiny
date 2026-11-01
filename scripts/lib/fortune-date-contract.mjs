// Public generated HTML only. This guard never generates dates, readings or data packages.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'parse5';
import { kstYmdToday, kstYmdNextDay, kstYmdPreviousDay, kstWeekStartYmd, kstMonthStartYmd } from './fortune-date.mjs';
import { parseJsonLdDate } from '../seo/health-policy.mjs';

const PERIOD_TEXT = { today: '오늘의', tomorrow: '내일의', weekly: '이번 주', monthly: '이번 달' };
const compact = text => String(text || '').replace(/\s+/g, '');
const textOf = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(textOf).join(' ');
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const kstYmdOf = ms => new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
const short = ymd => `${Number(ymd.slice(5, 7))}월${Number(ymd.slice(8, 10))}일`;
function expectedLabels(period, businessDate, periodDate) {
  const date = periodDate || (period === 'today' ? businessDate : period === 'tomorrow' ? kstYmdNextDay(businessDate) : period === 'weekly' ? kstWeekStartYmd(businessDate) : period === 'monthly' ? kstMonthStartYmd(businessDate) : null);
  if (!date) throw new Error(`Unknown fortune period: ${period}`);
  if (period === 'monthly') {
    const label = `${Number(date.slice(0, 4))}년${Number(date.slice(5, 7))}월`;
    return { date, title: label, body: label };
  }
  if (period === 'weekly') {
    let end = date;
    for (let day = 0; day < 6; day++) end = kstYmdNextDay(end);
    const title = date.slice(0, 7) === end.slice(0, 7)
      ? `${short(date).replace(/일$/, '')}~${Number(end.slice(8, 10))}일`
      : `${short(date).replace(/일$/, '')}~${short(end)}`;
    return { date, title, body: `${short(date)}~${short(end)}` };
  }
  return { date, title: short(date), body: `${Number(date.slice(0, 4))}년${short(date)}` };
}

// buildTime: 산출물을 만든 시각의 상한. 기본값은 검사 시각이다 — 검사는 늘 빌드 뒤에 돌므로(now ≥ 빌드 시각)
// 빌드 직후 postbuild 든, 며칠 지난 dist 든 그대로 맞다. Article 날짜 규칙은 lib/fortune/article-dates.mjs.
export function verifyFortuneDateContract(html, { period, businessDate = kstYmdToday(), periodDate, buildTime = new Date() }) {
  const buildMs = buildTime instanceof Date ? buildTime.getTime() : Number.NaN;
  if (!Number.isFinite(buildMs)) throw new Error(`Fortune date contract: buildTime is not a valid Date: ${buildTime}`);
  const expected = expectedLabels(period, businessDate, periodDate);
  const evidence = { titles: [], h1: [], times: [], articles: [] };
  function addArticles(value) {
    if (Array.isArray(value)) return value.forEach(addArticles);
    if (!value || typeof value !== 'object') return;
    if ([value['@type']].flat().includes('Article')) evidence.articles.push({ headline: value.headline, datePublished: value.datePublished, dateModified: value.dateModified });
    if (value['@graph']) addArticles(value['@graph']);
  }
  function visit(node, hidden = false) {
    const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
    const invisible = hidden || attrs['aria-hidden'] === 'true' || /(?:^|\s)sr-only(?:\s|$)/.test(attrs.class || '') || (Object.hasOwn(attrs, 'hidden') && !/^S:/.test(attrs.id || ''));
    if (node.tagName === 'title') evidence.titles.push(textOf(node).trim());
    if (node.tagName === 'h1' && !invisible) evidence.h1.push(textOf(node).trim());
    if (node.tagName === 'time' && Object.hasOwn(attrs, 'data-cd-fortune-range-marker') && !invisible) evidence.times.push({ dateTime: attrs.datetime, text: textOf(node).trim() });
    if (node.tagName === 'script' && attrs.type === 'application/ld+json') { try { addArticles(JSON.parse(textOf(node))); } catch {} }
    for (const child of node.childNodes || []) visit(child, invisible);
  }
  visit(parse(html));
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const title = compact(evidence.titles[0]);
  check(evidence.titles.length === 1 && title.includes(expected.title), `title date must contain ${expected.title}`);
  check(title.includes(compact(PERIOD_TEXT[period])), `title period must be ${PERIOD_TEXT[period]}`);
  const titleYears = [...title.matchAll(/(\d{4})년/g)].map(match => match[1]);
  check(titleYears.every(year => year === expected.date.slice(0, 4)), `title year must agree with ${expected.date}`);
  check(evidence.h1.length === 1 && compact(evidence.h1[0]).includes(compact(PERIOD_TEXT[period])), `visible H1 period must be ${PERIOD_TEXT[period]}`);
  // H1 intentionally names the period without duplicating the date; its adjacent visible
  // time carries the precise range. If a date is added to H1 later, it must also agree.
  const h1 = compact(evidence.h1[0]);
  if (/\d{1,2}월/.test(h1)) check(h1.includes(expected.title) || h1.includes(expected.body), 'H1 date conflicts with the current range');
  check(evidence.times.length === 1, 'exactly one visible fortune range time is required');
  check(evidence.times[0]?.dateTime === expected.date, `body time datetime must be ${expected.date}`);
  check(compact(evidence.times[0]?.text).includes(expected.body), `visible body range must contain ${expected.body}`);
  check(evidence.articles.length === 1, 'exactly one Article is required');
  // 내일 운세는 대상일 전날 빌드되므로 발행 시각이 전날이다(min(대상일 00:00 KST, 빌드 시각)).
  const published = parseJsonLdDate(evidence.articles[0]?.datePublished);
  const modified = parseJsonLdDate(evidence.articles[0]?.dateModified);
  check(published !== null, 'Article datePublished must be an ISO 8601 date-time');
  check(published === null || published <= buildMs, 'Article datePublished must not be after build time');
  check(published !== null && [expected.date, kstYmdPreviousDay(expected.date)].includes(kstYmdOf(published)), `Article datePublished must be ${expected.date} or the day before`);
  check(modified !== null && published !== null && published <= modified && modified <= buildMs, 'Article dateModified is required and must be within publish..build');
  check(compact(evidence.articles[0]?.headline) === title, 'Article headline and title must agree');
  return { ok: failures.length === 0, expectedDate: expected.date, failures, evidence };
}

export function resolveFortuneBuildDateContext({ rootDir, now = new Date() }) {
  const clockDate = kstYmdToday(now);
  let manifest = null;
  try {
    const parsed = JSON.parse(readFileSync(resolve(rootDir, 'fortune/data/run-manifest.json'), 'utf8'));
    if (['today', 'tomorrow', 'weekly', 'monthly'].every(key => typeof parsed?.[key] === 'string')) manifest = parsed;
  } catch {}
  // Match the existing renderers: daily-data resolves its manifest, whereas
  // range-data derives week/month ranges from its current KST clock. Environment
  // variables used by publishing/gen-daily are not renderer date overrides.
  const dates = {
    today: manifest?.today || clockDate,
    tomorrow: manifest?.tomorrow || kstYmdNextDay(clockDate),
    weekly: kstWeekStartYmd(clockDate),
    monthly: kstMonthStartYmd(clockDate),
  };
  for (const value of Object.values(dates)) kstYmdNextDay(value); // Validate before inspecting output.
  return { dailySource: manifest ? 'fortune/data/run-manifest.json' : 'KST clock fallback', businessDate: dates.today, rangeBusinessDate: clockDate, dates };
}

export function verifyFortuneBuildDates({ rootDir, outputDir, dateContext = resolveFortuneBuildDateContext({ rootDir }), periods, signIds }) {
  const read = relative => readFileSync(resolve(rootDir, relative), 'utf8');
  if (!periods) {
    const match = read('lib/fortune/periods.ts').match(/FORTUNE_PERIOD_IDS[^=]*=\s*\[([^\]]*)\]/);
    periods = match ? [...match[1].matchAll(/"([a-z]+)"/g)].map(item => item[1]) : [];
  }
  if (!signIds) signIds = [...read('lib/fortune/sign-profiles.ts').matchAll(/^\s{4}id:\s*"([a-z]+)",/gm)].map(item => item[1]);
  if (periods.length !== 4 || signIds.length !== 24) throw new Error('Fortune date contract: source period/sign discovery failed');
  if (!/WEEK_STARTS_ON_MONDAY\s*=\s*true/.test(read('lib/fortune/range-data.ts'))) throw new Error('Fortune week convention changed; date guard must be updated');
  const failures = [];
  for (const period of periods) for (const sign of signIds) {
    const route = `/fortune/${period}/${sign}/`;
    let html;
    try { html = readFileSync(resolve(rootDir, outputDir, 'fortune', period, sign, 'index.html'), 'utf8'); }
    catch { failures.push(`${route}: generated HTML missing`); continue; }
    const result = verifyFortuneDateContract(html, { period, periodDate: dateContext.dates[period] });
    failures.push(...result.failures.map(message => `${route}: ${message}`));
  }
  return { ok: failures.length === 0, ...dateContext, count: periods.length * signIds.length, failures };
}
