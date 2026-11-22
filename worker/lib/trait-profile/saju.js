// Trait-First 1차 사주 TraitProfile 추출기. 순수 함수 — 엔진·DB·LLM 을 부르지 않는다.
// 계산 사실은 기존 buildSajuTemperamentProfile(십성 분포·월지 본기·신강약·시주 미상)과
// buildElementProfile(오행 29%·16%, 비율이 있을 때만)에서만 가져온다. 희신은 넣지 않는다(게이트 A).
import { buildSajuTemperamentProfile, SAJU_TEMPERAMENT_VERSION } from '../saju-temperament.js';
import { buildElementProfile } from '../saju-derived-signals.js';
import { DAY_MASTER_KB, FAMILY_KB, TEN_GOD_SCENES, TENSION_KB, SAJU_TRAIT_KB_VERSION } from './saju-kb.js';

export const TRAIT_PROFILE_VERSION = 'trait-profile-20261122-v1';
export const TRAIT_FIRST_META = 'v1';
const MAX_FACTS = 8;
const EL_KO = {wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
const STEM_ELEMENT = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'};
const STEM_KO = {甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계'};
const ELEMENT_KEYWORDS = {
  wood:{excess:['성장 욕구','추진력','조급함'], none:['시작을 망설임']},
  fire:{excess:['열정','빠른 표현','기복'], none:['표현을 아낌']},
  earth:{excess:['신용','중재','변화에 느림'], none:['중심 잡기']},
  metal:{excess:['결단','원칙','날카로움'], none:['거절이 어려움']},
  water:{excess:['깊은 생각','유연함','속을 덜 드러냄'], none:['멈춤 없는 직진']},
};

/** FNV-1a 32bit. 같은 seed 면 같은 선택 — 서비스마다 장면 재료를 다르게 고르기 위한 결정적 해시. */
export function traitSeedHash(seed = '') {
  let h = 0x811c9dc5;
  for (const ch of String(seed)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

function pick(list, seed, n) {
  const rows = Array.isArray(list) ? list : [];
  if (rows.length <= n) return [...rows];
  const start = traitSeedHash(seed) % rows.length;
  return Array.from({length:n}, (_, i) => rows[(start + i) % rows.length]);
}

// 받침 여부로 조사를 고른다(관성이·식상과). 한글이 아니면 받침 없음으로 본다.
const josa = (word, withBatchim, without) => { const c = String(word).slice(-1).charCodeAt(0) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? withBatchim : without; };

const hasRatios = fiveElements => {
  const ratios = fiveElements?.ratios;
  return !!ratios && typeof ratios === 'object' && Object.values(ratios).some(v => Number(v) > 0);
};

/**
 * @param {object} chart buildSajuTemperamentProfile 이 받는 계산 사실(인생의 책·화면·명식 스냅샷).
 * @param {{seed?:string, fiveElements?:object}} [options] seed = userId + featureId 등. fiveElements 는 비율이 있을 때만 쓴다.
 * @returns {null|{version:string,engine:'saju',headline:object,facts:object[],tensions:object[],dataQuality:'full'|'partial'}}
 */
export function buildSajuTraitProfile(chart = {}, options = {}) {
  const temperament = chart?.version === SAJU_TEMPERAMENT_VERSION ? chart : buildSajuTemperamentProfile(chart || {});
  if (!temperament) return null;
  const seed = String(options.seed || '');
  const {facts} = temperament;
  const facts_ = [];
  const dm = DAY_MASTER_KB[facts.dayMaster];
  if (!dm) return null;
  facts_.push({key:`saju.dayMaster.${facts.dayMaster}`, layer:'core', label:dm.label,
    evidence:`일간이 ${facts.dayMaster}(${STEM_KO[facts.dayMaster]}${STEM_ELEMENT[facts.dayMaster]}), ${dm.symbol}`,
    keywords:[...dm.keywords], light:pick(dm.light, `${seed}|dm.light`, 3), shadow:pick(dm.shadow, `${seed}|dm.shadow`, 2),
    scenes:pick(dm.scenes, `${seed}|dm.scenes`, 2), weight:1});

  for (const family of temperament.families) {
    const kb = FAMILY_KB[family.family];
    if (!kb) continue;
    const absent = family.visible === 0 && family.hidden === 0;
    const latent = family.visible === 0 && family.hidden > 0;
    const developed = family.state === '발달';
    if (!developed && !absent && !latent && !family.monthMain) continue;
    const kind = developed ? 'developed' : absent ? 'absent' : latent ? 'latent' : 'developed';
    const entry = kb[kind];
    const gods = temperament.tenGods.filter(g => g.family === family.family && g.facts.visible > 0);
    const godScenes = gods.flatMap(g => TEN_GOD_SCENES[g.god] || []);
    const stateLabel = developed ? '발달' : absent ? '없음' : latent ? '지장간에만' : '월지 본기';
    facts_.push({key:`saju.tenGodFamily.${family.family}.${kind === 'developed' && !developed ? 'monthMain' : kind}`,
      layer:developed ? 'strong' : absent ? 'contrast' : 'support',
      label:`${family.family} ${stateLabel}`,
      evidence:absent ? `${family.family}${josa(family.family,"이","가")} 겉 글자와 지장간 모두에서 보이지 않음`
        : latent ? `${family.family}${josa(family.family,"이","가")} 겉에는 없고 지장간에 ${family.hidden}개`
        : `${family.family}${josa(family.family,"이","가")} 겉 글자에 ${family.visible}개${family.monthMain ? ', 월지 본기 역할' : ''}`,
      keywords:[...entry.keywords], light:[...entry.light], shadow:[...entry.shadow],
      scenes:pick([...godScenes, ...entry.scenes], `${seed}|${family.family}`, 2),
      subKeys:gods.map(g => g.god),
      interpretation:family.interpretation,
      weight:developed ? (family.monthMain ? 0.9 : 0.8) : absent ? 0.7 : family.monthMain ? 0.65 : 0.5});
  }

  const fiveElements = options.fiveElements || chart?.fiveElements;
  if (hasRatios(fiveElements)) {
    const element = buildElementProfile(fiveElements);
    for (const trait of element.traits) {
      const state = trait.state === '과다' ? 'excess' : 'none';
      facts_.push({key:`saju.element.${trait.element}.${state}`, layer:state === 'excess' ? 'strong' : 'contrast',
        label:`오행 ${EL_KO[trait.element]} ${trait.state}`,
        evidence:`오행 ${EL_KO[trait.element]} ${trait.state === '과다' ? `비율 ${element.elements.find(e => e.element === trait.element)?.ratio}%` : '0개'}`,
        keywords:[...ELEMENT_KEYWORDS[trait.element][state]], light:[], shadow:[], scenes:[],
        interpretation:trait.temperament, weight:state === 'excess' ? 0.6 : 0.55});
    }
  }

  if (facts.isStrong !== null && !facts.jongCandidate) {
    facts_.push({key:`saju.strength.${facts.isStrong ? 'strong' : 'weak'}`, layer:'support',
      label:facts.isStrong ? '신강' : '신약', evidence:`기존 억부 판단 ${facts.isStrong ? '신강' : '신약'}`,
      keywords:facts.isStrong ? ['내 뜻대로 밀고 가는 힘'] : ['협력 속에서 힘이 남'],
      light:[], shadow:[], scenes:[], weight:0.4});
  }

  const sorted = facts_.sort((a, b) => b.weight - a.weight || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).slice(0, MAX_FACTS);
  const tensions = temperament.coPresence.map(([a, b]) => ({a, b, synthesis:TENSION_KB[`${a}|${b}`] || ''})).filter(t => t.synthesis);
  const partial = facts.timeUnknown || facts.missingPillars.length > 0;
  return {version:TRAIT_PROFILE_VERSION, kbVersion:SAJU_TRAIT_KB_VERSION, engine:'saju',
    headline:sorted[0], facts:sorted, tensions, dataQuality:partial ? 'partial' : 'full',
    timeUnknown:facts.timeUnknown === true};
}

/**
 * 프롬프트용 근거 블록(한국어 라벨만). 어조는 서비스별 화자 규칙이 맡는다(게이트 B 설계 제약 1).
 * 이 블록은 근거와 재료만 담고, 분량·장 구조·형식 지시는 넣지 않는다(설계 제약 3).
 */
export function sajuTraitProfilePromptLines(profile) {
  if (!profile || profile.engine !== 'saju' || !profile.headline) return [];
  const row = f => {
    const parts = [`${f.label} — 근거: ${f.evidence}`];
    if (f.keywords?.length) parts.push(`키워드: ${f.keywords.join('·')}`);
    if (f.light?.length) parts.push(`밝은 면: ${f.light.join('·')}`);
    if (f.shadow?.length) parts.push(`그림자: ${f.shadow.join('·')}`);
    if (f.scenes?.length) parts.push(`장면 재료: ${f.scenes.join(' / ')}`);
    return `- ${parts.join(' | ')}`;
  };
  return [
    '[타고난 성향 핵심 근거]',
    `가장 먼저 짚을 성향: ${profile.headline.label} (${profile.headline.evidence})`,
    ...profile.facts.map(row),
    ...(profile.tensions.length ? ['겉과 속이 갈리는 지점:', ...profile.tensions.map(t => `- ${t.a}${josa(t.a,"과","와")} ${t.b}: ${t.synthesis}`)] : []),
    ...(profile.dataQuality === 'partial' ? ['출생 시각 또는 일부 자리가 없어 제공된 자리만의 성향이다. 빈 자리를 추측해 채우지 않는다.'] : []),
    '사용 규칙: 성향 장은 위의 가장 먼저 짚을 성향부터 근거와 함께 분명하게 짚는다. 위 근거에 없는 성향·용어를 만들지 않는다. 키워드·장면 재료는 그대로 옮기지 말고 이 사람의 상황에 맞는 말로 다시 쓴다. 대괄호 제목·라벨·키 이름을 결과에 인용하지 않는다. 성격·기질·행동 습관만 말하고 건강·질병·사고·이혼을 확정하지 않는다. 근거가 있는 성향은 "~하는 편입니다"처럼 분명히 말하고 "경향이 있을 수 있습니다"·"일 수도 있어요" 같은 겹친 완곡은 쓰지 않는다(운명·성패를 단정하지 않는 규칙은 그대로다).',
  ];
}

const HEDGES = ['일 수도 있어요', '경향이 있을 수 있습니다', '개인차가 있지만', '참고용으로', '때로는 외향적이고 때로는 내향적'];

// 겹친 완곡("경향"+"수 있다")만 뜻이 같은 한 겹 완곡으로 줄인다. 다른 완곡은 문맥 없이 고치면 뜻이 바뀌어 손대지 않는다.
// 결정적 교정이다 — 거부·재시도·전달 판정에 쓰지 않는다(2026-11-22 네오: 품질이 다소 안 맞아도 결제 후 결과는 제공).
const DOUBLE_HEDGE_FIXES = [
  [/경향이 있을 수 있습니다/g, '경향이 있습니다'],
  [/경향이 있을 수 있어요/g, '경향이 있어요'],
  [/경향이 있을 수도 있습니다/g, '경향이 있습니다'],
  [/경향이 있을 수도 있어요/g, '경향이 있어요'],
];
export function softenTraitDoubleHedges(text) {
  if (typeof text !== 'string' || !text) return text;
  return DOUBLE_HEDGE_FIXES.reduce((out, [from, to]) => out.replace(from, to), text);
}

/**
 * Shadow 검증기 — 기록만 한다. 반환값으로 전달·완성 판정·환불을 바꾸지 않는다(설계 제약 4).
 * @returns {{ok:boolean, issues:string[]}}
 */
export function checkTraitFirstSection(text, profile) {
  const issues = [];
  const body = typeof text === 'string' ? text : '';
  if (!profile?.headline) return {ok:true, issues};
  if (!body.trim()) return {ok:false, issues:['empty_section']};
  const stem = /^saju\.dayMaster\.(.)$/.exec(profile.headline.key || '')?.[1];
  const terms = [profile.headline.label, ...(profile.headline.keywords || []), stem ? `${STEM_KO[stem]}${STEM_ELEMENT[stem]}` : '', stem || ''].filter(Boolean);
  if (!terms.some(t => body.includes(t))) issues.push('headline_missing');
  for (const h of HEDGES) if (body.includes(h)) issues.push(`hedge:${h}`);
  if (/\[타고난 성향|saju\.(dayMaster|tenGodFamily|element|strength)/.test(body)) issues.push('label_leak');
  return {ok:issues.length === 0, issues};
}
