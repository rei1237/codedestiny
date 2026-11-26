import { computeShinsal, serializeShinsalForPrompt } from './natal-core/index.mjs';

/**
 * 소비처 공용 신살 사실 블록. 차트를 정본 모듈로 계산해 프롬프트 블록 문자열을 만든다.
 * 던지지 않는다 — 계산이 안 되거나 남는 줄이 없으면 ''를 돌려주어 호출부는 블록만 빼고 진행한다.
 * 블록은 프롬프트를 만들 때만 붙인다(pin·digest·hash·facts 에 넣지 않는다).
 * @param {object} chart normalizeShinsalChart 가 받는 모양({ pillars, timeUnknown?, luck? | luckRows? })
 * @param {{ maxChars?: number, maxNatal?: number, maxLuck?: number, maxLineChars?: number, excludeRuleIds?: string[] }} [options]
 *   excludeRuleIds: 소비처가 이미 따로 출력하는 신살(예: 'gongmang')을 블록에서 뺀다.
 * @returns {string}
 */
export function buildShinsalFactsBlock(chart, options = {}) {
  try {
    const { excludeRuleIds = [], ...limits } = options || {};
    const result = computeShinsal(chart);
    if (!result || result.valid !== true) return '';
    const drop = new Set(Array.isArray(excludeRuleIds) ? excludeRuleIds : []);
    const source = drop.size ? { ...result, hits: result.hits.filter((hit) => !drop.has(hit.ruleId)) } : result;
    return serializeShinsalForPrompt(source, limits);
  } catch {
    return '';
  }
}
