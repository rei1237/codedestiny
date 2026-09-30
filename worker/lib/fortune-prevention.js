import { buildNatalInteractions, buildLuckNatalInteractions, tenGodFor, buildHiddenStemDetails } from './life-book-ai-saju.js';

export const PREVENTION_VERSION = 'prevention-20260930-v1';
export const PREVENTION_TITLE = '조심해야 할 흐름과 나를 지키는 선택';
export function hasUnsupportedPreventionClaim(text) {
  return /(?:반드시|무조건|틀림없이).{0,25}(?:사고|이별|손실|질병).{0,12}(?:난다|납니다|생긴다|생깁니다|발생|겪게)|(?:사고|이별|손실|질병).{0,12}(?:반드시|무조건|틀림없이).{0,12}(?:발생|생긴다|생깁니다|납니다)|도파민\s*(?:수치|분비량).{0,12}(?:높습니다|낮습니다|증가합니다|감소합니다)|\b(?:you will definitely|you are guaranteed to).{0,30}(?:accident|breakup|disease|loss)|\byour dopamine (?:level|levels).{0,15}(?:high|low|increase|decrease)/i.test(text);
}
export const PREVENTION_RULES = '제공된 근거에서 질문과 관련된 주의점을 최대 3개 고른다. 근거→기회와 부담의 양면→현실에서 확인할 신호→피할 행동과 대안→완충 조건과 한계를 설명한다. 자료가 적으면 개수를 채우지 않고, 자료 부족을 안전 보장으로 바꾸지 않는다. 주의점은 전통적 해석의 가능성이며 실제 사고·질병·이별·손실의 발생이나 확률이 아니다. 갈등과 새로움은 활력이 될 수도 있지만 불안정과 소진이 될 수도 있다. 끌림의 강도와 관계의 안정성을 구분한다. 도파민 수치·중독·정신질환을 판단하지 않고 긴장과 새로움이 강한 끌림처럼 느껴지는 패턴으로 설명한다. 갈등을 사랑의 증거로 미화하거나 감시·시험·원치 않는 연락을 권하지 않는다. 사주 밖의 체계에 용신이나 형충파해를 적용하지 않는다. 근거가 허용하는 대상과 기간만 설명하며 원국 내 관계와 두 사람 간 관계를 혼동하지 않는다. 모든 제목과 본문은 요청된 출력 언어로 작성한다.';
const ELEMENTS = ['wood','fire','earth','metal','water'];
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const KO_STEMS = '갑을병정무기경신임계';
const KO_BRANCHES = '자축인묘진사오미신유술해';
const tensionKeys = ['stemClashes','branchClashes','branchHarms','branchBreaks','branchPunishments'];
const supportKeys = ['stemCombinations','branchCombinations','threeHarmony','directionalGroups'];
const rows = value => Array.isArray(value) ? value : [];
export function canonicalPreventionPillar(value) {
  const s = String(value || '');
  const stem = STEMS.includes(s[0]) ? s[0] : STEMS[KO_STEMS.indexOf(s[0])];
  const branch = BRANCHES.includes(s[1]) ? s[1] : BRANCHES[KO_BRANCHES.indexOf(s[1])];
  return stem && branch ? stem + branch : '';
}
export function preventionPillarDetails(pillars = {}) {
  const day = canonicalPreventionPillar(pillars.day)[0];
  return Object.fromEntries(Object.entries(pillars).flatMap(([key, value]) => {
    if (!['year','month','day','hour'].includes(key)) return [];
    const pillar = canonicalPreventionPillar(value);
    return pillar ? [[key, {pillar, heavenlyStem:pillar[0], earthlyBranch:pillar[1],
      stemTenGod:key === 'day' ? '일간' : tenGodFor(day,pillar[0]), hiddenStems:buildHiddenStemDetails(day,pillar[1])}]] : [];
  }));
}
export function preventionTiming(interactions = {}, beneficial = false, burdensome = false) {
  // A combination alone does not establish benefit: it may also bind an unfavorable element.
  const support = beneficial;
  const tension = burdensome || tensionKeys.some(key => rows(interactions[key]).length);
  return support && tension ? '기회와 주의' : tension ? '주의' : support ? '기회' : '정비';
}

// This is an interpretation packet, not an event probability or a second yongshin calculator.
// Callers opt in only for new readings; old purchase facts are never recalculated.
/** @param {{pillars?: object, strength?: object, jong?: object, shinsal?: object, periods?: Array<{kind:string,pillar:string,year?:number,month?:number,start?:string,end?:string}>, subject?:string}} [options] */
export function buildSajuPrevention({ pillars = {}, strength = {}, jong = {}, shinsal = {}, periods = [], subject = 'self' } = {}) {
  const details = preventionPillarDetails(pillars);
  const natal = buildNatalInteractions(details);
  const balance = {
    helpfulElements:rows(strength.yongshin), burdensomeElements:rows(strength.kijishin),
    isStrong:typeof strength.isStrong === 'boolean' ? strength.isStrong : null,
    conditional:true, unresolvedPattern:jong.confirmationRequired === true,
    rule:'용신·기신은 기존 억부·조후 판단의 조건부 후보다. 흉신 분류와 기신은 동의어가 아니다. 합은 자동 합화·길운이 아니며 완충 관계도 긴장을 없애지 않는다.',
  };
  const candidates = [];
  const emit = (key, period, anchors, opportunity, burden, observe, action, limit) => candidates.push({
    key, system:'saju', subject, period, anchors, opportunity, burden, observe, action,
    buffering:balance, limitation:limit,
  });
  const interaction = (relations, period) => {
    const tensions = tensionKeys.flatMap(key => rows(relations[key]).map(value => ({kind:key,...value})));
    if (!tensions.length) return;
    const maoWu = tensions.some(value => value.label === '묘오파');
    emit(maoWu ? 'mao-wu-break' : 'interaction-tension', period,
      {tensions, support:supportKeys.flatMap(key => rows(relations[key]).map(value => ({kind:key,...value})))},
      '변화와 새로운 자극을 통해 오래된 방식이나 관계의 속도를 조정할 여지',
      maoWu ? '관계의 빠른 몰입과 온도 변화, 서두른 확신과 약속 변경이 부담이 될 가능성' : '서로 다른 요구가 부딪혀 갈등·일정 변경·결정 압박으로 느껴질 가능성',
      '빠른 확신 뒤 관심이 식는지, 다툼과 화해의 강렬함을 안정감으로 오해하는지, 일정 변경이 반복되는지 확인',
      '큰 약속은 감정이 가라앉은 뒤 다시 확인하고 연락·지출·일정의 속도를 합의한다. 중요한 변경은 확인할 항목을 적고 결정한다.',
      '관계의 성립은 계산 사실이지만 사건 예측은 아니다. 묘오파/오묘파는 같은 관계이며 단독으로 성격·이별을 확정하지 않는다. 완전 성립한 형·삼합·방합만 포함한다.');
  };
  interaction(natal, {kind:'natal'});
  for (const period of periods) {
    const pillar = canonicalPreventionPillar(period.pillar);
    if (!pillar) continue;
    interaction(buildLuckNatalInteractions(pillar,details,{includeGroups:true}), {kind:period.kind, year:period.year, month:period.month, start:period.start, end:period.end, pillar});
  }
  const visible = Object.entries(details).filter(([key,d]) => key !== 'day' && d.stemTenGod === '편관');
  if (visible.length) {
    const positions = visible.map(([position,d]) => {
      const element = ELEMENTS[Math.floor(STEMS.indexOf(d.heavenlyStem)/2)];
      return {position,pillar:d.pillar,element,
        rootedAt:Object.entries(details).filter(([,x])=>rows(x.hiddenStems).some(h=>h.stem===d.heavenlyStem)).map(([key])=>key),
        role:balance.helpfulElements.includes(element)&&balance.burdensomeElements.includes(element)?'mixed':balance.helpfulElements.includes(element)?'support':balance.burdensomeElements.includes(element)?'burden':'undetermined'};
    });
    emit('visible-pyeongwan',{kind:'natal'},{positions,month:details.month,dayMaster:details.day?.heavenlyStem},
      '책임을 명확히 하고 압박 속에서 실행력을 발휘하는 방향',
      '감당할 범위를 넘겨 책임을 떠안거나 자신과 상대를 통제하려 할 때 긴장이 누적되는 방향',
      '마감과 상대 반응에 지나치게 매달리는지, 휴식과 역할 분담을 미루는지 확인',
      '맡을 일과 맡지 않을 일을 구분하고 관계에서는 요구보다 합의할 기준을 먼저 정한다.',
      '천간 편관과 지장간 편관은 구분한다. 월령·통근·강약·용신 판단을 함께 검토한다. 식신제살·살인상생의 성립은 여기서 검증하지 않았으므로 명명하거나 효과를 확정하지 않는다.');
  }
  const moving = Object.entries(details).filter(([,d]) => '寅申巳亥'.includes(d.earthlyBranch)).map(([position,d])=>({position,branch:d.earthlyBranch}));
  const horse = shinsal.byName?.['역마살'];
  if (moving.length >= 2 || horse?.present === true) emit('movement',{kind:'natal'},{branches:moving,yeokma:horse?.present===true?horse:null},
    '새로운 장소와 역할에서 활력을 얻고 활동 범위를 조정할 여지',
    '변화를 연달아 택하거나 무리한 이동 일정을 잡을 때 준비와 회복이 부족해질 가능성',
    '일정을 빠듯하게 잡는지, 피로한 상태에서 이동을 서두르는지 확인',
    '이동 전 일정과 준비물을 확인하고 휴식과 지연에 대응할 여유를 둔다.',
    '인신사해의 개수는 역마 성립이나 세력을 뜻하지 않는다. 인신충·사해충·인사신형은 별도 계산 근거로만 설명하며 사고를 예언하지 않는다.');
  // Visible ten-god patterns are observations, never automatic 재다신약/상관견관/식신제살 verdicts.
  const gods = Object.entries(details).filter(([key])=>key!=='day').map(([position,d])=>({position,name:d.stemTenGod}));
  if (gods.length) emit('resource-balance',{kind:'natal'},{visibleTenGods:gods,month:details.month},
    '표현·학습·경쟁·자원 관리의 강점을 역할에 맞게 사용하는 방향',
    '강점이 과해져 확장과 지출을 서두르거나, 경쟁·말의 마찰·준비만 하며 미루는 습관으로 이어지는 조건',
    '실제 있는 십성 근거와 질문에 맞는 패턴 하나만 골라 확인',
    '돈은 감당할 범위, 말은 전달 목적, 일은 마감과 책임 범위를 먼저 확인한다.',
    '십성의 단순 존재·개수로 복합 격이나 신강약을 확정하지 않는다. 없는 십성의 위험을 붙이지 않는다.');
  return {version:PREVENTION_VERSION,balance,candidates,limitation:'전통 명리의 조건부 해석이며 위험 확률이 아니다. 생시·판정 근거가 부족한 부분은 확정하지 않는다.'};
}
