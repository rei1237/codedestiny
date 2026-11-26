// NormalizedChart 어댑터. 소비처마다 다른 명식 모양을 신살 규칙이 읽는 한 모양으로 맞춘다.
//
// 받는 모양(어느 것이든):
//   { pillars: { year, month, day, hour }, timeUnknown?, luck?: { daewoon, sewoon, wolwoon } }
//   { y, m, d, h }                       (natal-core normalizeChart 모양, 각 { g, j })
//   { year, month, day, hour }
//   luckRows: [{ scope: 'daewoon'|'sewoon'|'wolwoon'|'대운'|'세운'|'월운', stem, branch, year?, month?, age? }]
// 기둥 하나는 '甲子'·'갑자' 문자열, { stem, branch }·{ g, j }·{ gan, zhi }·{ ganji } 어느 것이든 된다(한자·한글).
// 운 라벨은 숫자(year·month·age)만 받는다. 자유 문자열 라벨은 직렬화로 새지 않게 버린다.
import { STEM_ORDER, BRANCH_ORDER, STEM_KO, BRANCH_KO } from './tables.mjs';
import { NATAL_PILLARS, LUCK_PILLARS } from './catalog.mjs';

const STEM_BY_KO = Object.fromEntries(Object.entries(STEM_KO).map(([han, ko]) => [ko, han]));
const BRANCH_BY_KO = Object.fromEntries(Object.entries(BRANCH_KO).map(([han, ko]) => [ko, han]));
const SCOPE_ALIASES = Object.freeze({
  daewoon: 'daewoon', 대운: 'daewoon', decade: 'daewoon', major: 'daewoon',
  sewoon: 'sewoon', 세운: 'sewoon', year: 'sewoon', annual: 'sewoon', 연운: 'sewoon',
  wolwoon: 'wolwoon', 월운: 'wolwoon', month: 'wolwoon', monthly: 'wolwoon',
});

const toStem = (value) => {
  const text = String(value ?? '').trim();
  if (STEM_ORDER.includes(text)) return text;
  return STEM_BY_KO[text] || '';
};
const toBranch = (value) => {
  const text = String(value ?? '').trim();
  if (BRANCH_ORDER.includes(text)) return text;
  return BRANCH_BY_KO[text] || '';
};

/** 기둥 하나를 { stem, branch, ganji } 로. 읽을 수 없으면 null. */
export function readPillar(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const chars = [...value.trim()];
    if (chars.length !== 2) return null;
    const stem = toStem(chars[0]);
    const branch = toBranch(chars[1]);
    return stem && branch ? { stem, branch, ganji: stem + branch } : null;
  }
  if (typeof value !== 'object') return null;
  if (typeof value.ganji === 'string') {
    const fromGanji = readPillar(value.ganji);
    if (fromGanji) return fromGanji;
  }
  const stem = toStem(value.stem ?? value.g ?? value.gan ?? value.heavenlyStem);
  const branch = toBranch(value.branch ?? value.j ?? value.zhi ?? value.earthlyBranch);
  return stem && branch ? { stem, branch, ganji: stem + branch } : null;
}

const finiteInt = (value) => (Number.isFinite(Number(value)) && value !== '' && value !== null ? Math.trunc(Number(value)) : null);

function readLuckRow(row, scope, index) {
  const pillar = readPillar(row);
  if (!pillar) return null;
  const out = { pillar: scope, index, ...pillar };
  const year = finiteInt(row?.year);
  const month = finiteInt(row?.month);
  const age = finiteInt(row?.age ?? row?.startAge);
  if (year !== null && year >= 1000 && year <= 9999) out.year = year;
  if (month !== null && month >= 1 && month <= 12) out.month = month;
  if (age !== null && age >= 0 && age <= 150) out.age = age;
  return out;
}

function collectLuck(input) {
  const rows = [];
  const counters = { daewoon: 0, sewoon: 0, wolwoon: 0 };
  const push = (row, scopeRaw) => {
    const scope = SCOPE_ALIASES[String(scopeRaw ?? '').trim()] || '';
    if (!scope) return;
    const parsed = readLuckRow(row, scope, counters[scope]);
    if (!parsed) return;
    counters[scope] += 1;
    rows.push(parsed);
  };
  const luck = input?.luck;
  if (luck && typeof luck === 'object' && !Array.isArray(luck)) {
    for (const scope of LUCK_PILLARS) {
      const value = luck[scope];
      if (Array.isArray(value)) value.forEach((row) => push(row, scope));
      else if (value) push(value, scope);
    }
  }
  const list = Array.isArray(input?.luckRows) ? input.luckRows : Array.isArray(luck) ? luck : [];
  for (const row of list) push(row, row?.scope ?? row?.pillar ?? row?.kind);
  return rows;
}

/**
 * 어떤 명식 입력이든 신살 계산용 모양으로 바꾼다. 던지지 않는다.
 * @returns {{ valid: boolean, timeUnknown: boolean, natal: { year, month, day, hour }, luck: Array }}
 */
export function normalizeShinsalChart(input) {
  const source = input && typeof input === 'object' ? input : {};
  const pillars = source.pillars && typeof source.pillars === 'object' ? source.pillars : source;
  const pick = (long, short) => readPillar(pillars[long] ?? pillars[short]);
  const natal = { year: pick('year', 'y'), month: pick('month', 'm'), day: pick('day', 'd'), hour: pick('hour', 'h') };
  const flagged = source.timeUnknown === true || source.hourUnknown === true || source.unknownTime === true
    || pillars.timeUnknown === true;
  const timeUnknown = flagged || !natal.hour;
  if (timeUnknown) natal.hour = null;
  const valid = Boolean(natal.year && natal.month && natal.day);
  return { valid, timeUnknown, natal, luck: valid ? collectLuck(source) : [] };
}

/** 원국 기둥 목록(시주 미상이면 제외). */
export const natalTargets = (chart) => NATAL_PILLARS
  .filter((pillar) => chart.natal[pillar])
  .map((pillar) => ({ pillar, ...chart.natal[pillar] }));
