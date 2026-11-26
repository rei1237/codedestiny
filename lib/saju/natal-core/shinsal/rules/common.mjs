// 규칙 공통: 적중(hit) 모양과 대상 순회. 규칙 파일은 표 조회만 하고 모양은 여기서 맞춘다.
import { CATALOG_BY_ID, BASIS_KO } from '../catalog.mjs';
import { natalTargets } from '../chart.mjs';

/**
 * @typedef {{ ruleId: string, name: string, category: string, pillar: string, position: 'stem'|'branch'|'pillar',
 *   char: string, basis: string, basisKey: string, basisChar: string, polarity: 'good'|'neutral'|'caution',
 *   luckIndex?: number, pair?: Array<{ pillar: string, char: string, luckIndex?: number }>, detail?: string, emphasis?: boolean }} ShinsalHit
 */
export function makeHit(ruleId, { pillar, position, char, basisKey, basisChar = '', luckIndex, pair, detail, emphasis }) {
  const entry = CATALOG_BY_ID[ruleId];
  if (!entry) throw new Error(`unknown shinsal rule ${ruleId}`);
  const hit = {
    ruleId,
    name: entry.name,
    category: entry.category,
    pillar,
    position,
    char,
    basis: `${BASIS_KO[basisKey] || basisKey}${basisChar ? ` ${basisChar}` : ''}`,
    basisKey,
    basisChar,
    polarity: entry.polarity,
  };
  if (Number.isInteger(luckIndex)) hit.luckIndex = luckIndex;
  if (pair) hit.pair = pair;
  if (detail) hit.detail = detail;
  if (emphasis) hit.emphasis = true;
  return hit;
}

const luckIndexOf = (target) => (Number.isInteger(target.index) ? target.index : undefined);

/** 원국(+선택 시 운) 기둥 목록. 운 기둥은 luckIndex 를 갖는다. */
export function targetsOf(chart, { luck = true } = {}) {
  const natal = natalTargets(chart).map((target) => ({ ...target, luckIndex: undefined }));
  if (!luck) return natal;
  return [...natal, ...chart.luck.map((row) => ({ pillar: row.pillar, stem: row.stem, branch: row.branch, ganji: row.ganji, luckIndex: luckIndexOf(row) }))];
}

/** 원국 기둥 짝(i<j) + 운×원국 짝. 운끼리는 짝짓지 않는다. */
export function pairsOf(chart, { luck = true } = {}) {
  const natal = targetsOf(chart, { luck: false });
  const pairs = [];
  for (let i = 0; i < natal.length; i += 1) {
    for (let j = i + 1; j < natal.length; j += 1) pairs.push([natal[i], natal[j]]);
  }
  if (luck) {
    for (const row of targetsOf(chart).filter((target) => target.luckIndex !== undefined)) {
      for (const target of natal) pairs.push([row, target]);
    }
  }
  return pairs;
}

export const pairNode = (target, char) => (target.luckIndex === undefined
  ? { pillar: target.pillar, char }
  : { pillar: target.pillar, char, luckIndex: target.luckIndex });

export const pairKey = (a, b) => a + b;
export const inPairs = (pairs, a, b) => pairs.includes(a + b) || pairs.includes(b + a);
