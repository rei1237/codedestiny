// 프롬프트 주입용 신살 사실 블록. 결정적 출력, 줄 단위로만 버린다("외 N개" 꼬리 없음).
// 십성 용어·길흉 판정·"좋은/주의 운" 표현을 쓰지 않는다. 기준 글자(일간 甲 등)는 출력하지 않는다.
// 줄 순서: 원국은 일 > 월 > 년 > 시, 운은 세운 > 대운 > 월운. 실패하면 '' 을 돌려 블록만 빠진다.
import { CATALOG_BY_ID, BASIS_KO, POSITION_ORDER } from './catalog.mjs';

export const SHINSAL_PROMPT_HEADER = '[신살 계산값 — 서버 계산. 이 목록 밖의 신살은 쓰지 않는다]';
export const SHINSAL_PROMPT_FOOTER = '사용 규칙: 신살은 성향·경향의 보조 단서다. 사건·질병·길흉을 단정하지 않는다.';
export const SHINSAL_TIME_UNKNOWN_LINE = '- 시주: 출생 시간 미상이라 시주 신살은 계산하지 않았다';
export const DEFAULT_SERIALIZE_OPTIONS = Object.freeze({ maxChars: 900, maxNatal: 6, maxLuck: 3, maxLineChars: 80 });

const NATAL_RANK = Object.freeze({ day: 0, month: 1, year: 2, hour: 3 });
const SCOPE_RANK = Object.freeze({ sewoon: 0, daewoon: 1, wolwoon: 2 });
const PILLAR_KO = Object.freeze({ year: '년', month: '월', day: '일', hour: '시' });
const SCOPE_KO = Object.freeze({ daewoon: '대운', sewoon: '세운', wolwoon: '월운' });
const BASIS_ORDER = Object.freeze(['dayStem', 'yearStem', 'monthBranch', 'yearBranch', 'dayBranch', 'dayPillar', 'yearPillar', 'pillar', 'char', 'pair']);
const BASIS_WITH_GIJUN = new Set(['dayStem', 'yearStem', 'monthBranch', 'yearBranch', 'dayBranch', 'dayPillar', 'yearPillar']);
const POSITION_SUFFIX = Object.freeze({ stem: '간', branch: '지', pillar: '주' });
const LUCK_POSITION_KO = Object.freeze({ stem: '천간', branch: '지지', pillar: '간지' });

const isLuck = (pillar) => Object.prototype.hasOwnProperty.call(SCOPE_RANK, pillar);
const basisRank = (key) => (BASIS_ORDER.includes(key) ? BASIS_ORDER.indexOf(key) : BASIS_ORDER.length);
const basisText = (hit) => (BASIS_WITH_GIJUN.has(hit.basisKey) ? `${BASIS_KO[hit.basisKey]} 기준` : BASIS_KO[hit.basisKey] || '');
const displayName = (hit) => (hit.detail ? `${hit.name}(${hit.detail})` : hit.name);
const positionKind = (node, fallback) => (node.char.length === 2 ? 'pillar' : fallback);

function natalPosition(pillar, position, char) {
  return `${PILLAR_KO[pillar]}${POSITION_SUFFIX[position]}(${char})`;
}
function nodeText(node, position) {
  const kind = positionKind(node, position);
  return isLuck(node.pillar) ? `${LUCK_POSITION_KO[kind]}(${node.char})` : natalPosition(node.pillar, kind, node.char);
}
function scopeLabel(row) {
  const parts = [SCOPE_KO[row.pillar]];
  if (row.pillar === 'daewoon' && Number.isInteger(row.age)) parts.push(`${row.age}세`);
  if (row.pillar !== 'daewoon' && Number.isInteger(row.year)) parts.push(`${row.year}년`);
  if (row.pillar === 'wolwoon' && Number.isInteger(row.month)) parts.push(`${row.month}월`);
  parts.push(row.ganji);
  return parts.join(' ');
}
const ruleTier = (ruleId) => CATALOG_BY_ID[ruleId]?.tier ?? 9;
const ruleIndex = (ruleId) => CATALOG_BY_ID[ruleId]?.catalogIndex ?? 999;
const compare = (a, b) => {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};

function natalGroups(hits) {
  const groups = new Map();
  for (const hit of hits) {
    if (isLuck(hit.pillar)) continue;
    const key = `${hit.ruleId}|${hit.basisKey}|${hit.detail || ''}`;
    if (!groups.has(key)) groups.set(key, { sample: hit, items: new Map() });
    const nodes = hit.pair || [{ pillar: hit.pillar, char: hit.char }];
    const rank = Math.min(...nodes.map((node) => NATAL_RANK[node.pillar] ?? 9));
    const text = hit.pair
      ? nodes.map((node) => nodeText(node, hit.position)).join('·')
      : natalPosition(hit.pillar, hit.position, hit.char);
    const order = [rank, POSITION_ORDER.indexOf(hit.position), text];
    groups.get(key).items.set(text, order);
  }
  return [...groups.values()].map(({ sample, items }) => {
    const ordered = [...items.entries()].sort((x, y) => compare(x[1], y[1]));
    const separator = sample.pair ? ', ' : '·';
    const bestRank = ordered[0][1][0];
    return {
      line: `- ${displayName(sample)}: ${basisText(sample)}, ${ordered.map(([text]) => text).join(separator)}`,
      pick: [ruleTier(sample.ruleId), bestRank, ruleIndex(sample.ruleId), basisRank(sample.basisKey), sample.detail || ''],
      place: [bestRank, ruleTier(sample.ruleId), ruleIndex(sample.ruleId), basisRank(sample.basisKey), sample.detail || ''],
    };
  });
}

function luckGroups(hits, luckRows) {
  const rowOf = new Map(luckRows.map((row) => [`${row.pillar}|${row.index}`, row]));
  const groups = new Map();
  for (const hit of hits) {
    if (!isLuck(hit.pillar)) continue;
    const row = rowOf.get(`${hit.pillar}|${hit.luckIndex}`);
    if (!row) continue;
    const key = `${hit.pillar}|${hit.luckIndex}|${hit.ruleId}|${hit.basisKey}|${hit.detail || ''}`;
    if (!groups.has(key)) groups.set(key, { sample: hit, row, items: new Set() });
    if (hit.position === 'pillar' && !hit.pair) continue;
    const text = hit.pair ? hit.pair.map((node) => nodeText(node, hit.position)).join('·') : nodeText({ pillar: hit.pillar, char: hit.char }, hit.position);
    groups.get(key).items.add(text);
  }
  return [...groups.values()].map(({ sample, row, items }) => {
    const positions = [...items].sort();
    const head = `- ${scopeLabel(row)} · ${displayName(sample)}: ${basisText(sample)}`;
    return {
      line: positions.length ? `${head}, ${positions.join(', ')}` : head,
      pick: [SCOPE_RANK[row.pillar], row.index, ruleTier(sample.ruleId), ruleIndex(sample.ruleId), basisRank(sample.basisKey), sample.detail || ''],
    };
  });
}

const readLimit = (value, fallback) => (Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : fallback);

/**
 * computeShinsal 결과를 프롬프트 블록으로. 실패·빈 결과면 ''.
 * @param {object} result computeShinsal 결과
 * @param {{ maxChars?: number, maxNatal?: number, maxLuck?: number, maxLineChars?: number }} [options]
 */
export function serializeShinsalResult(result, options = {}) {
  if (!result || result.valid !== true || !Array.isArray(result.hits)) return '';
  const maxChars = readLimit(options.maxChars, DEFAULT_SERIALIZE_OPTIONS.maxChars);
  const maxNatal = readLimit(options.maxNatal, DEFAULT_SERIALIZE_OPTIONS.maxNatal);
  const maxLuck = readLimit(options.maxLuck, DEFAULT_SERIALIZE_OPTIONS.maxLuck);
  const maxLineChars = readLimit(options.maxLineChars, DEFAULT_SERIALIZE_OPTIONS.maxLineChars);
  const fits = (line) => line.length <= maxLineChars;

  const natal = natalGroups(result.hits).filter((group) => fits(group.line))
    .sort((a, b) => compare(a.pick, b.pick)).slice(0, maxNatal);
  const luckRows = Array.isArray(result.perPillar?.luck) ? result.perPillar.luck : [];
  const luck = luckGroups(result.hits, luckRows).filter((group) => fits(group.line))
    .sort((a, b) => compare(a.pick, b.pick)).slice(0, maxLuck);

  // keep: 앞쪽일수록 오래 남는다(시주 미상 안내 → 원국 선택 순 → 운 선택 순).
  const keep = [
    ...(result.timeUnknown ? [{ line: SHINSAL_TIME_UNKNOWN_LINE, slot: 1, place: [0] }] : []),
    ...natal.map((group) => ({ line: group.line, slot: 0, place: group.place })),
    ...luck.map((group, index) => ({ line: group.line, slot: 2, place: [index] })),
  ];
  const render = (items) => {
    const body = [...items].sort((a, b) => a.slot - b.slot || compare(a.place, b.place)).map((item) => item.line);
    return [SHINSAL_PROMPT_HEADER, ...body, SHINSAL_PROMPT_FOOTER].join('\n');
  };
  let items = keep;
  let text = render(items);
  while (items.length && text.length > maxChars) {
    items = items.slice(0, -1);
    text = render(items);
  }
  if (!items.length) return '';
  return text;
}
