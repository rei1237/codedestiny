import { computeShinsal, serializeShinsalForPrompt } from './natal-core/index.mjs';

// 직렬화기가 자리 뒤에 붙이는 괄호 글자(천간·지지 1자 또는 간지 2자). hidePositionChars 가 지운다.
const POSITION_CHARS = /\([甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]{1,2}\)/g;

/**
 * 소비처 공용 신살 사실 블록. 차트를 정본 모듈로 계산해 프롬프트 블록 문자열을 만든다.
 * 던지지 않는다 — 계산이 안 되거나 남는 줄이 없으면 ''를 돌려주어 호출부는 블록만 빼고 진행한다.
 * 블록은 프롬프트를 만들 때만 붙인다(pin·digest·hash·facts 에 넣지 않는다).
 * @param {object} chart normalizeShinsalChart 가 받는 모양({ pillars, timeUnknown?, luck? | luckRows? })
 * @param {{ maxChars?: number, maxNatal?: number, maxLuck?: number, maxLineChars?: number, excludeRuleIds?: string[], hidePositionChars?: boolean }} [options]
 *   excludeRuleIds: 소비처가 이미 따로 출력하는 신살(예: 'gongmang')을 블록에서 뺀다.
 *   hidePositionChars: true 면 자리 뒤 괄호 글자('년지(丑)' → '년지', '일주(戊辰)' → '일주')를 지운다.
 *     4주 간지를 프롬프트에 나열하지 않는 소비처(네오)용이다. 지우기만 하므로 maxChars 보장은 그대로다.
 *     옵션을 주지 않은 소비처의 출력은 바이트 단위로 이전과 같다.
 * @returns {string}
 */
export function buildShinsalFactsBlock(chart, options = {}) {
  try {
    const { excludeRuleIds = [], hidePositionChars = false, ...limits } = options || {};
    const result = computeShinsal(chart);
    if (!result || result.valid !== true) return '';
    const drop = new Set(Array.isArray(excludeRuleIds) ? excludeRuleIds : []);
    const source = drop.size ? { ...result, hits: result.hits.filter((hit) => !drop.has(hit.ruleId)) } : result;
    const block = serializeShinsalForPrompt(source, limits);
    return hidePositionChars === true ? block.replace(POSITION_CHARS, '') : block;
  } catch {
    return '';
  }
}
