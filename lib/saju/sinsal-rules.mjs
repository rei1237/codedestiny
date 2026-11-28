/**
 * 신살 해설 글(2026-11-22)에 싣는 규칙표의 정본.
 *
 * 계산 엔진이 아니다. 화면의 만세력(js/core/saju/manse-shinsal.js)과 사주 엔진
 * (app/saju/animal-destiny/engine/localSajuCalculator.ts)이 이미 쓰는 기준을 글에 옮기기 위한 데이터다.
 * 두 엔진과 같은지는 __tests__/saju/sinsal-rules.test.mjs 가 전수로 대조한다. 엔진은 고치지 않는다.
 * 상문살·조객살만 엔진에 없다 — 민속 통설로 표시하고 만세력에 나오지 않는다고 밝힌다.
 */
import { BRANCH_KO, BRANCH_ORDER, STEM_KO, STEM_ORDER } from './natal-core/tables.mjs';

const mod = (value, size) => ((value % size) + size) % size;
const shiftBranch = (branch, steps) => BRANCH_ORDER[mod(BRANCH_ORDER.indexOf(branch) + steps, 12)];

/** 삼합 그룹. 12신살 행은 twelveStart(겁살 자리)부터 지지 순서대로 돈다. */
export const SAMHAP_GROUPS = Object.freeze([
  Object.freeze({ key: 'water', label: '신자진(申子辰)', branches: Object.freeze(['申', '子', '辰']), dohwa: '酉', yeokma: '寅', hwagae: '辰', twelveStart: '巳' }),
  Object.freeze({ key: 'fire', label: '인오술(寅午戌)', branches: Object.freeze(['寅', '午', '戌']), dohwa: '卯', yeokma: '申', hwagae: '戌', twelveStart: '亥' }),
  Object.freeze({ key: 'metal', label: '사유축(巳酉丑)', branches: Object.freeze(['巳', '酉', '丑']), dohwa: '午', yeokma: '亥', hwagae: '丑', twelveStart: '寅' }),
  Object.freeze({ key: 'wood', label: '해묘미(亥卯未)', branches: Object.freeze(['亥', '卯', '未']), dohwa: '子', yeokma: '巳', hwagae: '未', twelveStart: '申' }),
]);

export const TWELVE_SINSAL_NAMES = Object.freeze(['겁살', '재살', '천살', '지살', '년살', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살']);

export const samhapGroup = (branch) => SAMHAP_GROUPS.find((group) => group.branches.includes(branch)) || null;
export const dohwaBranch = (reference) => samhapGroup(reference)?.dohwa || '';
export const yeokmaBranch = (reference) => samhapGroup(reference)?.yeokma || '';
export const hwagaeBranch = (reference) => samhapGroup(reference)?.hwagae || '';

/** 연지 기준 12신살 행: 겁살~화개살 순서의 지지 12개. */
export function twelveSinsalRow(yearBranch) {
  const group = samhapGroup(yearBranch);
  return group ? TWELVE_SINSAL_NAMES.map((_, index) => shiftBranch(group.twelveStart, index)) : [];
}

export function twelveSinsalName(yearBranch, targetBranch) {
  const index = twelveSinsalRow(yearBranch).indexOf(targetBranch);
  return index >= 0 ? TWELVE_SINSAL_NAMES[index] : '';
}

/** 일간 기준 표. 양인은 양간만 있다. */
export const YANGIN_BY_STEM = Object.freeze({ 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' });
export const HONGYEOM_BY_STEM = Object.freeze({ 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' });
export const CHEONEUL_BY_STEM = Object.freeze({ 甲: ['丑', '未'], 乙: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 戊: ['丑', '未'], 己: ['子', '申'], 庚: ['丑', '未'], 辛: ['寅', '午'], 壬: ['卯', '巳'], 癸: ['卯', '巳'] });

/** 간지 자체로 성립하는 살. 원국 네 기둥과 운의 간지에 그대로 대조한다. */
export const GOEGANG_GANJI = Object.freeze(['庚辰', '庚戌', '壬辰', '壬戌', '戊戌']);
export const BAEKHO_GANJI = Object.freeze(['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑']);

/** 일주가 속한 순(旬)의 공망 두 지지. */
export const GONGMANG_BY_SUN = Object.freeze([
  Object.freeze({ sun: '甲子', branches: Object.freeze(['戌', '亥']) }),
  Object.freeze({ sun: '甲戌', branches: Object.freeze(['申', '酉']) }),
  Object.freeze({ sun: '甲申', branches: Object.freeze(['午', '未']) }),
  Object.freeze({ sun: '甲午', branches: Object.freeze(['辰', '巳']) }),
  Object.freeze({ sun: '甲辰', branches: Object.freeze(['寅', '卯']) }),
  Object.freeze({ sun: '甲寅', branches: Object.freeze(['子', '丑']) }),
]);

export function sexagenaryIndex(stem, branch) {
  const s = STEM_ORDER.indexOf(stem);
  const b = BRANCH_ORDER.indexOf(branch);
  if (s < 0 || b < 0) return -1;
  for (let i = 0; i < 60; i += 1) if (i % 10 === s && i % 12 === b) return i;
  return -1;
}

export function gongmangBranches(dayStem, dayBranch) {
  const index = sexagenaryIndex(dayStem, dayBranch);
  return index < 0 ? [] : [...GONGMANG_BY_SUN[Math.floor(index / 10)].branches];
}

/** 지지 두 글자가 만나면 성립하는 쌍(순서 무관). */
export const GWIMUN_PAIRS = Object.freeze(['子酉', '丑午', '寅未', '卯申', '辰亥', '巳戌']);
export const WONJIN_PAIRS = Object.freeze(['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌']);
export const CHUNG_PAIRS = Object.freeze(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥']);
export const isPair = (pairs, a, b) => pairs.includes(a + b) || pairs.includes(b + a);

/** 민속 통설(엔진 미계산): 년지에서 두 칸 앞이 상문, 두 칸 뒤가 조객. */
export const sangmunBranch = (yearBranch) => (BRANCH_ORDER.includes(yearBranch) ? shiftBranch(yearBranch, 2) : '');
export const jogaekBranch = (yearBranch) => (BRANCH_ORDER.includes(yearBranch) ? shiftBranch(yearBranch, -2) : '');

const b = (branch) => (branch ? `${BRANCH_KO[branch]}(${branch})` : '-');
const s = (stem) => `${STEM_KO[stem]}(${stem})`;
const g = (ganji) => `${STEM_KO[ganji[0]]}${BRANCH_KO[ganji[1]]}(${ganji})`;
const pair = (value) => `${BRANCH_KO[value[0]]}${BRANCH_KO[value[1]]}(${value})`;

const groupTable = (field) => ({
  head: ['기준 지지(일지·년지)', '해당 지지'],
  rows: SAMHAP_GROUPS.map((group) => [group.label, b(group[field])]),
});

/** 글마다 싣는 규칙표. basis 는 표 아래 "이 사이트의 기준" 한 줄. */
export const SINSAL_RULES = Object.freeze({
  도화살: { ...groupTable('dohwa'), basis: '이 사이트의 사주·만세력은 일지와 년지 두 기준으로 도화살을 찾습니다.' },
  역마살: { ...groupTable('yeokma'), basis: '사주 풀이는 일지·년지 두 기준, 만세력 표는 년지 기준 12신살 행의 역마살 자리로 보여 줍니다.' },
  화개살: { ...groupTable('hwagae'), basis: '사주 풀이는 일지·년지 두 기준, 만세력 표는 년지 기준 12신살 행의 화개살 자리로 보여 줍니다.' },
  '12신살': {
    head: ['년지', ...TWELVE_SINSAL_NAMES],
    rows: SAMHAP_GROUPS.map((group) => [group.label, ...twelveSinsalRow(group.branches[0]).map(b)]),
    basis: '만세력의 12신살은 년지(태어난 해의 지지) 기준입니다.',
  },
  양인살: {
    head: ['일간', '양인 지지'],
    rows: Object.entries(YANGIN_BY_STEM).map(([stem, branch]) => [s(stem), b(branch)]),
    basis: '일간이 양간(갑·병·무·경·임)일 때만 봅니다. 음간에는 이 사이트가 양인살을 붙이지 않습니다.',
  },
  홍염살: {
    head: ['일간', '홍염 지지'],
    rows: Object.entries(HONGYEOM_BY_STEM).map(([stem, branch]) => [s(stem), b(branch)]),
    basis: '일간 한 글자로 홍염 지지를 정하고, 원국 네 지지 가운데 그 글자가 놓인 기둥을 표시합니다.',
  },
  천을귀인: {
    head: ['일간', '천을귀인 지지'],
    rows: Object.entries(CHEONEUL_BY_STEM).map(([stem, branches]) => [s(stem), branches.map(b).join(' · ')]),
    basis: '일간마다 귀인 지지가 둘씩 있으며, 원국 네 지지 가운데 하나라도 맞으면 표시합니다.',
  },
  괴강살: {
    head: ['간지', '구성'],
    rows: GOEGANG_GANJI.map((ganji) => [g(ganji), `${s(ganji[0])} + ${b(ganji[1])}`]),
    basis: '천간과 지지를 한 쌍으로 대조해 네 기둥 어디에든 이 다섯 간지가 있으면 표시합니다. 사주 풀이는 대운·세운 간지도 함께 봅니다.',
  },
  백호살: {
    head: ['간지', '구성'],
    rows: BAEKHO_GANJI.map((ganji) => [g(ganji), `${s(ganji[0])} + ${b(ganji[1])}`]),
    basis: '년·월·일·시 기둥 하나가 일곱 간지 중 하나와 그대로 같으면 백호살로 봅니다. 운에서 들어오는 간지는 사주 풀이가 따로 대조합니다.',
  },
  공망: {
    head: ['일주가 속한 순', '공망 지지'],
    rows: GONGMANG_BY_SUN.map((row) => [`${g(row.sun)}순`, row.branches.map(b).join(' · ')]),
    basis: '일주가 속한 순(旬)을 기준으로 원국의 다른 지지에서 찾습니다.',
  },
  귀문관살: {
    head: ['지지 쌍'],
    rows: GWIMUN_PAIRS.map((value) => [pair(value)]),
    basis: '원국 네 지지 중 아무 두 자리가 이 쌍을 이루면 함께 표시하며, 이웃한 기둥인지는 따지지 않습니다.',
  },
  원진살: {
    head: ['지지 쌍'],
    rows: WONJIN_PAIRS.map((value) => [pair(value)]),
    basis: '만세력은 원국 지지 두 개가 이 짝을 이룰 때 두 기둥을 표시하고, 띠궁합은 두 사람의 년지끼리 같은 표를 씁니다.',
  },
  상충: {
    head: ['지지 쌍(육충)'],
    rows: CHUNG_PAIRS.map((value) => [pair(value)]),
    basis: '서로 일곱 번째 자리에 있는 지지끼리 부딪는 관계입니다.',
  },
  상문살: {
    head: ['년지', '상문(두 칸 앞)', '조객(두 칸 뒤)'],
    rows: BRANCH_ORDER.map((branch) => [b(branch), b(sangmunBranch(branch)), b(jogaekBranch(branch))]),
    basis: '민속 통설의 계산법입니다. 이 사이트의 만세력과 사주 엔진은 상문살을 계산하지 않습니다.',
  },
});

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** insights 글 contentHtml 에 넣는 규칙표와 기준 한 줄. 없는 이름이면 오류(fail-closed). */
export function renderRuleTableHtml(name) {
  const rule = SINSAL_RULES[name];
  if (!rule) throw new Error(`Unknown sinsal rule: ${name}`);
  const head = rule.head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('');
  const body = rule.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><p><small>${escapeHtml(rule.basis)}</small></p>`;
}
