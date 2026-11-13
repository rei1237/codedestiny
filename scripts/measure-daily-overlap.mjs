#!/usr/bin/env node
/**
 * 오늘/내일 운세 상세 24쌍(띠 12 + 별자리 12)의 SSR 본문 중복을 잰다.
 *
 * 방법(SEO 묶음 ⑤ 2026-11-09 측정과 같은 정의):
 *   - 각 페이지 HTML의 <main> 텍스트에서 script/style/svg/nav 를 빼고 공백을 정규화한다.
 *   - 공백 기준 5단어 shingle 집합을 만들고 Jaccard = |A∩B| / |A∪B| 를 잰다.
 *   - 같은 정의로 min-set 공유율(|A∩B| / min(|A|,|B|))도 함께 남기되, 목표 판정은 Jaccard 로만 한다.
 *   - 내일 본문에서 '오늘 일진'·'오늘'이 남은 문단을 함께 기록한다(다른 기간 링크는 nav 가 아니라 별도 집계).
 *
 * 사용:
 *   node scripts/measure-daily-overlap.mjs --base http://127.0.0.1:PORT [--out file.json] [--html-dir dir] [--max 0.30]
 *   node scripts/measure-daily-overlap.mjs --html-dir dir   (저장된 today_<sign>.html / tomorrow_<sign>.html 재측정)
 * --max 를 주면 최대 Jaccard 가 그 값 이상일 때 exit 1.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { parse } = require('parse5');

export const DAILY_SIGNS = [
  'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig',
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const SKIP = new Set(['script', 'style', 'svg', 'nav', 'template']);
const findAll = (node, tag) => [...(node.tagName === tag ? [node] : []), ...(node.childNodes || []).flatMap((c) => findAll(c, tag))];
const textOf = (node) => SKIP.has(node.tagName) ? '' : node.nodeName === '#text' ? node.value : (node.childNodes || []).map(textOf).join(' ');
const clean = (s) => s.replace(/\s+/g, ' ').trim();

export function mainText(html) {
  const main = findAll(parse(html), 'main')[0];
  if (!main) throw new Error('No <main> in HTML');
  return { main, body: clean(textOf(main)) };
}

export function shingles(text, size = 5) {
  const words = clean(text).split(' ').filter(Boolean);
  const out = new Set();
  for (let i = 0; i <= words.length - size; i += 1) out.add(words.slice(i, i + size).join(' '));
  return out;
}

export function overlap(a, b) {
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  const union = a.size + b.size - shared;
  return { shared, jaccard: union ? shared / union : 0, minSet: Math.min(a.size, b.size) ? shared / Math.min(a.size, b.size) : 0 };
}

export function measurePair(todayHtml, tomorrowHtml) {
  const today = mainText(todayHtml);
  const tomorrow = mainText(tomorrowHtml);
  const words5 = overlap(shingles(today.body), shingles(tomorrow.body));
  const paragraphs = findAll(tomorrow.main, 'p').map((p) => clean(textOf(p)));
  return {
    words5,
    todayMainCharacters: today.body.length,
    tomorrowMainCharacters: tomorrow.body.length,
    tomorrowTodayIljin: (tomorrow.body.match(/오늘 ?일진/g) || []).length,
    tomorrowTodayOccurrences: (tomorrow.body.match(/오늘/g) || []).length,
    tomorrowParagraphsWithToday: paragraphs.filter((t) => t.includes('오늘')),
  };
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

async function main() {
  const opt = args(process.argv.slice(2));
  if (!opt.base && !opt['html-dir']) throw new Error('--base 또는 --html-dir 가 필요합니다');
  if (opt['html-dir']) mkdirSync(opt['html-dir'], { recursive: true });
  const html = async (period, sign) => {
    const file = opt['html-dir'] ? join(opt['html-dir'], `${period}_${sign}.html`) : null;
    if (!opt.base) {
      if (!existsSync(file)) throw new Error(`missing ${file}`);
      return readFileSync(file, 'utf8');
    }
    const path = `/fortune/${period}/${sign}/`;
    const response = await fetch(new URL(path, opt.base));
    if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
    const body = await response.text();
    if (file) writeFileSync(file, body);
    return body;
  };
  const pairs = [];
  for (const sign of DAILY_SIGNS) {
    pairs.push({ sign, ...measurePair(await html('today', sign), await html('tomorrow', sign)) });
  }
  const summary = {
    pairs: pairs.length,
    maximumJaccard: Math.max(...pairs.map((p) => p.words5.jaccard)),
    meanJaccard: pairs.reduce((sum, p) => sum + p.words5.jaccard, 0) / pairs.length,
    pairsAtOrAbove30: pairs.filter((p) => p.words5.jaccard >= 0.3).length,
    pairsAtOrAbove50: pairs.filter((p) => p.words5.jaccard >= 0.5).length,
    maximumMinSet: Math.max(...pairs.map((p) => p.words5.minSet)),
    minimumTomorrowCharacters: Math.min(...pairs.map((p) => p.tomorrowMainCharacters)),
    tomorrowTodayIljin: pairs.reduce((sum, p) => sum + p.tomorrowTodayIljin, 0),
    tomorrowParagraphsWithToday: pairs.reduce((sum, p) => sum + p.tomorrowParagraphsWithToday.length, 0),
  };
  const record = {
    observedAt: new Date().toISOString(),
    source: opt.base || opt['html-dir'],
    method: 'SSR <main> text excluding script/style/svg/nav/template; whitespace 5-word shingle sets; Jaccard (target) plus min-set share',
    summary,
    pairs: pairs.map(({ sign, words5, tomorrowMainCharacters, tomorrowTodayIljin, tomorrowParagraphsWithToday }) => ({ sign, jaccard: Number(words5.jaccard.toFixed(4)), minSet: Number(words5.minSet.toFixed(4)), tomorrowMainCharacters, tomorrowTodayIljin, tomorrowParagraphsWithToday })),
  };
  if (opt.out) writeFileSync(opt.out, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify({ summary, perSign: record.pairs.map((p) => `${p.sign} ${(p.jaccard * 100).toFixed(2)}%`) }, null, 2));
  if (opt.max && summary.maximumJaccard >= Number(opt.max)) {
    console.error(`[measure-daily-overlap] maximum Jaccard ${(summary.maximumJaccard * 100).toFixed(2)}% >= ${(Number(opt.max) * 100).toFixed(0)}%`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file:///${process.argv[1].replaceAll('\\', '/')}` || process.argv[1]?.endsWith('measure-daily-overlap.mjs')) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
