// 원국 판정의 기초 표. 지장간 순서와 층 이름은 js/saju-engine.js CD_JANGGAN·cdJangganLayers와 같다.
export const STEM_ORDER = [...'甲乙丙丁戊己庚辛壬癸'];
export const BRANCH_ORDER = [...'子丑寅卯辰巳午未申酉戌亥'];
export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
export const EL_KO = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
export const EL_HAN = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

export const STEM_EL = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
export const STEM_YANG = { 甲: true, 乙: false, 丙: true, 丁: false, 戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false };
export const BRANCH_EL = { 子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire', 午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water' };

// 여기 → (중기) → 정기. 마지막 원소가 정기다.
export const HIDDEN = {
  子: ['壬', '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', '乙'], 辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'],
  午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'], 申: ['戊', '壬', '庚'], 酉: ['庚', '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
};

export const GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
export const CONTROLS = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };
export const parentOf = (el) => ELEMENTS.find((k) => GENERATES[k] === el) || '';
export const controllerOf = (el) => ELEMENTS.find((k) => CONTROLS[k] === el) || '';

// ROK-01 녹표 [R1, R2]: 戊祿巳·己祿午를 포함한다.
export const ROK = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
// YANGIN-01: 양간의 양인. 음간 양인은 이 프로필에서 쓰지 않는다.
export const YANGIN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };

export const STEM_HAP = { 甲: ['己', 'earth'], 己: ['甲', 'earth'], 乙: ['庚', 'metal'], 庚: ['乙', 'metal'], 丙: ['辛', 'water'], 辛: ['丙', 'water'], 丁: ['壬', 'wood'], 壬: ['丁', 'wood'], 戊: ['癸', 'fire'], 癸: ['戊', 'fire'] };
export const STEM_CHUNG = { 甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁' };
export const BRANCH_LIUHE = { 子: ['丑', 'earth'], 丑: ['子', 'earth'], 寅: ['亥', 'wood'], 亥: ['寅', 'wood'], 卯: ['戌', 'fire'], 戌: ['卯', 'fire'], 辰: ['酉', 'metal'], 酉: ['辰', 'metal'], 巳: ['申', 'water'], 申: ['巳', 'water'], 午: ['未', 'fire'], 未: ['午', 'fire'] };
export const BRANCH_CHUNG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
// members[1]이 왕지다. 반합은 왕지를 포함한 두 글자만 인정한다(sajuSamhapState와 같은 기준).
export const SAMHAP = [
  { members: ['申', '子', '辰'], el: 'water' }, { members: ['亥', '卯', '未'], el: 'wood' },
  { members: ['寅', '午', '戌'], el: 'fire' }, { members: ['巳', '酉', '丑'], el: 'metal' },
];
export const BANGHAP = [
  { members: ['寅', '卯', '辰'], el: 'wood' }, { members: ['巳', '午', '未'], el: 'fire' },
  { members: ['申', '酉', '戌'], el: 'metal' }, { members: ['亥', '子', '丑'], el: 'water' },
];

export const POSITIONS = ['y', 'm', 'd', 'h'];
export const POS_KO = { y: '년', m: '월', d: '일', h: '시' };

export function hiddenLayers(branch) {
  const list = HIDDEN[branch] || [];
  return list.map((stem, i) => ({ stem, el: STEM_EL[stem], layer: i === list.length - 1 ? '정기' : i === 0 ? '여기' : '중기' }));
}
export const mainHidden = (branch) => (HIDDEN[branch] || []).slice(-1)[0] || '';

// 일간 오행 기준 관계: self(비겁) parent(인성) output(식상) wealth(재성) officer(관살)
export function relationOf(dayEl, el) {
  if (!dayEl || !el) return '';
  if (el === dayEl) return 'self';
  if (GENERATES[el] === dayEl) return 'parent';
  if (GENERATES[dayEl] === el) return 'output';
  if (CONTROLS[dayEl] === el) return 'wealth';
  if (CONTROLS[el] === dayEl) return 'officer';
  return '';
}
export const RELATION_KO = { self: '비겁', parent: '인성', output: '식상', wealth: '재성', officer: '관살' };
const TEN_GOD = { self: ['비견', '겁재'], output: ['식신', '상관'], wealth: ['편재', '정재'], officer: ['편관', '정관'], parent: ['편인', '정인'] };
export function tenGod(dayStem, stem) {
  const rel = relationOf(STEM_EL[dayStem], STEM_EL[stem]);
  if (!rel) return '';
  return TEN_GOD[rel][STEM_YANG[dayStem] === STEM_YANG[stem] ? 0 : 1];
}
export const ELEMENT_OF_RELATION = (dayEl, rel) => ({
  self: dayEl, parent: parentOf(dayEl), output: GENERATES[dayEl], wealth: CONTROLS[dayEl], officer: controllerOf(dayEl),
})[rel] || '';
