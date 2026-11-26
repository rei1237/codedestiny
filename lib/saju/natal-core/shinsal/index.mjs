// 정본 신살 모듈. 원국 4주 + 대운·세운·월운에 대해 결정적으로 신살을 계산한다.
// NATAL_CORE_VERSION 과 별개로 SHINSAL_VERSION 을 둔다(SAJU_TOMB_VERSION 패턴). 결과는 해시·다이제스트에 넣지 않는다.
// computeShinsal 은 던지지 않는다. 읽을 수 없는 명식이면 valid:false 와 빈 목록을 돌려준다.
import { normalizeShinsalChart } from './chart.mjs';
import { CATALOG_BY_ID, PILLAR_ORDER, POSITION_ORDER, NATAL_PILLARS, SHINSAL_CATALOG } from './catalog.mjs';
import { evaluateTwelve } from './rules/twelve.mjs';
import { evaluateGwiin } from './rules/gwiin.mjs';
import { evaluateGil } from './rules/gil.mjs';
import { evaluateHyung } from './rules/hyung.mjs';
import { evaluateRelations } from './rules/relation.mjs';
import { hiddenStemsOf, unseongOf, nayinOf } from './tables.mjs';
import { serializeShinsalResult } from './serialize.mjs';

export { normalizeShinsalChart } from './chart.mjs';
export { SHINSAL_CATALOG, CATALOG_BY_ID as SHINSAL_CATALOG_BY_ID } from './catalog.mjs';
export { SHINSAL_COPY_KO, getShinsalCopy } from './copy.ko.mjs';
export {
  SHINSAL_PROMPT_HEADER, SHINSAL_PROMPT_FOOTER, SHINSAL_TIME_UNKNOWN_LINE, DEFAULT_SERIALIZE_OPTIONS,
} from './serialize.mjs';

export const SHINSAL_VERSION = 'shinsal-v1';

/** 학파 이견은 옵션으로. 기본값은 지시서 표(2026-11-26) 기준. */
export const DEFAULT_SHINSAL_OPTIONS = Object.freeze({
  twelveBasis: 'both', // 'yearBranch' | 'dayBranch' | 'both'
  yanginYinStems: false, // 음간 양인(乙辰·丁未·己未·辛戌·癸丑) 포함
  hyeonchimIncludeMi: false, // 현침 지지에 未 포함
  goegangIncludeMuSul: true, // 괴강에 戊戌 포함
  gongmangYearBasis: false, // 년주 공망 병행
  cheoneulGengInO: false, // 천을귀인 庚 = 寅午 학파
  hakdangMuShin: false, // 학당귀인 戊 = 申(수토동법)
  gwiinYearStem: false, // 귀인을 년간 기준으로도 병행
  unseongMode: 'bong', // 12운성 'bong'(일간 기준 봉법) | 'geo'(각 기둥 천간 거법)
  showHanja: true, // 화면 표시용(계산에는 영향 없음)
  expertMode: false, // 화면 표시용(계산에는 영향 없음)
});

const TWELVE_BASES = new Set(['yearBranch', 'dayBranch', 'both']);
const UNSEONG_MODES = new Set(['bong', 'geo']);

/** 알 수 없는 키는 버리고 타입을 맞춘다. */
export function resolveShinsalOptions(options) {
  const source = options && typeof options === 'object' ? options : {};
  const out = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SHINSAL_OPTIONS)) {
    const value = source[key];
    if (key === 'twelveBasis') out[key] = TWELVE_BASES.has(value) ? value : fallback;
    else if (key === 'unseongMode') out[key] = UNSEONG_MODES.has(value) ? value : fallback;
    else out[key] = typeof value === 'boolean' ? value : fallback;
  }
  return Object.freeze(out);
}

export const SHINSAL_TIME_UNKNOWN = Object.freeze({ pillar: 'hour', reason: 'birth-time-unknown', label: '시간 미상으로 표시 불가' });

const BASIS_SORT = ['dayStem', 'yearStem', 'monthBranch', 'yearBranch', 'dayBranch', 'dayPillar', 'yearPillar', 'pillar', 'char', 'pair', 'stemPair', 'triad'];
const pairText = (hit) => (hit.pair ? hit.pair.map((node) => `${node.pillar}:${node.luckIndex ?? ''}:${node.char}`).join('/') : '');
const sortKey = (hit) => [
  CATALOG_BY_ID[hit.ruleId].catalogIndex,
  BASIS_SORT.indexOf(hit.basisKey),
  PILLAR_ORDER.indexOf(hit.pillar),
  hit.luckIndex ?? -1,
  POSITION_ORDER.indexOf(hit.position),
  hit.char,
  hit.detail || '',
  pairText(hit),
];
function compareHits(a, b) {
  const x = sortKey(a);
  const y = sortKey(b);
  for (let i = 0; i < x.length; i += 1) {
    if (x[i] < y[i]) return -1;
    if (x[i] > y[i]) return 1;
  }
  return 0;
}
function tidy(hits) {
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    if (CATALOG_BY_ID[hit.ruleId]?.hidden) continue;
    const key = sortKey(hit).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out.sort(compareHits);
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function pillarInfo(pillar, dayStem, mode) {
  if (!pillar) return null;
  const bong = unseongOf(dayStem, pillar.branch);
  const geo = unseongOf(pillar.stem, pillar.branch);
  return {
    stem: pillar.stem,
    branch: pillar.branch,
    ganji: pillar.ganji,
    hiddenStems: hiddenStemsOf(pillar.branch),
    unseong: { bong, geo, selected: mode === 'geo' ? geo : bong },
    nayin: nayinOf(pillar.ganji),
  };
}

function touches(hit, pillar) {
  if (hit.pair) return hit.pair.some((node) => node.pillar === pillar && node.luckIndex === undefined);
  return hit.pillar === pillar && hit.luckIndex === undefined;
}

function emptyResult(opts, timeUnknown) {
  return deepFreeze({
    version: SHINSAL_VERSION,
    valid: false,
    timeUnknown: timeUnknown ? { ...SHINSAL_TIME_UNKNOWN } : false,
    options: opts,
    hits: [],
    relations: [],
    perPillar: { year: [], month: [], day: [], hour: timeUnknown ? null : [], luck: [] },
    pillars: { year: null, month: null, day: null, hour: null },
  });
}

/**
 * @param {object} input 명식(normalizeShinsalChart 가 받는 어느 모양이든)
 * @param {Partial<typeof DEFAULT_SHINSAL_OPTIONS>} [options]
 * @returns {Readonly<{ version: string, valid: boolean, timeUnknown: false | typeof SHINSAL_TIME_UNKNOWN, options: object,
 *   hits: ShinsalHit[], relations: ShinsalHit[], perPillar: object, pillars: object }>}
 */
export function computeShinsal(input, options) {
  const opts = resolveShinsalOptions(options);
  let chart;
  try {
    chart = normalizeShinsalChart(input);
  } catch {
    return emptyResult(opts, false);
  }
  if (!chart.valid) return emptyResult(opts, chart.timeUnknown);
  try {
    const hits = tidy([
      ...evaluateGwiin(chart, opts),
      ...evaluateGil(chart, opts),
      ...evaluateTwelve(chart, opts),
      ...evaluateHyung(chart, opts),
    ]);
    const relations = tidy(evaluateRelations(chart, opts));
    const dayStem = chart.natal.day.stem;
    const perPillar = {};
    for (const pillar of NATAL_PILLARS) {
      perPillar[pillar] = chart.natal[pillar] ? hits.filter((hit) => touches(hit, pillar)) : null;
    }
    perPillar.luck = chart.luck.map((row) => ({
      ...row,
      hits: hits.filter((hit) => hit.pillar === row.pillar && hit.luckIndex === row.index),
    }));
    const pillars = Object.fromEntries(NATAL_PILLARS.map((pillar) => [pillar, pillarInfo(chart.natal[pillar], dayStem, opts.unseongMode)]));
    return deepFreeze({
      version: SHINSAL_VERSION,
      valid: true,
      timeUnknown: chart.timeUnknown ? { ...SHINSAL_TIME_UNKNOWN } : false,
      options: opts,
      hits,
      relations,
      perPillar,
      pillars,
    });
  } catch {
    return emptyResult(opts, chart.timeUnknown);
  }
}

/**
 * 프롬프트 블록. computeShinsal 결과나 명식 입력 어느 것이든 받는다. 던지지 않고, 실패하면 ''.
 * @param {object} source computeShinsal 결과 또는 명식 입력
 * @param {{ maxChars?: number, maxNatal?: number, maxLuck?: number } & Partial<typeof DEFAULT_SHINSAL_OPTIONS>} [options]
 */
export function serializeShinsalForPrompt(source, options = {}) {
  try {
    const result = source && source.version === SHINSAL_VERSION && Array.isArray(source.hits) ? source : computeShinsal(source, options);
    return serializeShinsalResult(result, options || {});
  } catch {
    return '';
  }
}

/** 화면용 카탈로그 조회(숨김 항목 제외). */
export const visibleShinsalCatalog = () => SHINSAL_CATALOG.filter((entry) => !entry.hidden);
