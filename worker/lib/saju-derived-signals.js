import { buildLuckNatalInteractions } from './life-book-ai-saju.js';
import { canonicalPreventionPillar, preventionPillarDetails } from './fortune-prevention.js';

// Deterministic interpretation packets derived from already calculated saju facts. No LLM, no new
// calendar math: element ratios, ten gods, shinsal and luck interactions all come from the engine.
export const SAJU_SIGNALS_VERSION = 'saju-signals-20261004-v1';

const ELEMENTS = ['wood','fire','earth','metal','water'];
const EL_KO = {wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
const rows = value => Array.isArray(value) ? value : [];
const POSITIONS = ['year','month','day','hour'];
const POS_KO = {year:'년주',month:'월주',day:'일주',hour:'시주'};

// Same thresholds as the Myeongri health report (js/entertain-engine.js getHealthState).
const EXCESS_RATIO = 29;
const DEFICIENT_RATIO = 16;
const TEMPERAMENT = {
  wood:{excess:'곧게 뻗어 나가려는 추진력과 성장 욕구가 강하다. 계획과 아이디어가 많고 자존심이 곧은 편이지만, 뜻대로 되지 않으면 조급함과 고집으로 드러나기 쉽다.',
    none:'새로 시작하는 힘보다 이미 있는 것을 다듬는 쪽이 편하다. 방향을 정하는 데 시간이 걸릴 수 있어 작은 시작 장치가 도움이 된다.'},
  fire:{excess:'밝고 표현이 빠르며 사람과 분위기를 달구는 열정이 크다. 판단과 감정의 속도가 빨라 들뜨거나 쉽게 식는 기복, 마무리의 약함이 그림자다.',
    none:'감정을 겉으로 드러내기보다 안에서 정리하는 편이다. 표현과 자기 알림이 늦어 실력보다 덜 보일 수 있다.'},
  earth:{excess:'신중하고 듬직하며 신용과 책임을 중시한다. 사람과 일을 품는 중재력이 있지만 변화에 느리고 생각과 걱정이 많아 결정을 미루거나 고집스러워 보일 수 있다.',
    none:'중심을 잡아 주는 기운이 약해 생활 리듬과 우선순위가 쉽게 흔들릴 수 있다. 규칙적인 루틴이 바탕을 대신 세워 준다.'},
  metal:{excess:'원칙과 결단력, 의리가 분명하다. 맺고 끊음이 확실하고 기준이 높아 일 처리가 깔끔하지만 말이 날카롭거나 완벽주의와 비판으로 자신과 남을 몰아붙이기 쉽다.',
    none:'결단과 마무리보다 여지를 남기는 쪽을 택하기 쉽다. 거절과 정리가 어려워 경계를 의식적으로 세우는 연습이 필요하다.'},
  water:{excess:'생각이 깊고 유연하며 흐름과 사람의 속을 읽는 지혜가 있다. 다만 생각에 잠겨 실행이 늦거나 속을 잘 드러내지 않고 불안이 길게 이어질 수 있다.',
    none:'깊이 머무르기보다 바로 움직이는 편이라 쉼과 성찰의 시간이 부족해지기 쉽다. 의식적으로 멈추는 시간을 두면 판단이 깊어진다.'},
};

/** @param {{ratios?:Record<string,number>|object,counts?:Record<string,number>,dominant?:string}} [fiveElements] */
export function buildElementProfile(fiveElements = {}) {
  const ratios = fiveElements.ratios || {}, counts = fiveElements.counts || {};
  const elements = ELEMENTS.map(element => {
    const ratio = Math.round(Number(ratios[element] || 0) * 10) / 10, count = Number(counts[element] || 0);
    const state = count === 0 ? '결핍' : ratio >= EXCESS_RATIO ? '과다' : ratio <= DEFICIENT_RATIO ? '부족' : '균형';
    return {element, label:EL_KO[element], count, ratio, state};
  });
  // balance (counts and states) and traits (temperament prose) are separate keys so a reading can cite one without the other.
  const traits = elements.filter(e => e.state === '과다' || e.state === '결핍').map(({element, label, state}) =>
    ({element, label, state, temperament:TEMPERAMENT[element][state === '과다' ? 'excess' : 'none']}));
  return {version:SAJU_SIGNALS_VERSION, elements,
    balance:{
      excess:elements.filter(e => e.state === '과다').map(e => e.element),
      missing:elements.filter(e => e.state === '결핍').map(e => e.element),
      weak:elements.filter(e => e.state === '부족').map(e => e.element)},
    traits,
    rule:`비율 ${EXCESS_RATIO}% 이상은 과다, ${DEFICIENT_RATIO}% 이하는 부족, 개수 0은 결핍이다. 과다 오행의 기질은 강점과 그림자를 함께 읽고, 개수만으로 신강·신약이나 용신을 확정하지 않는다.`};
}

const FAMILIES = {
  비겁:['비견','겁재'], 식상:['식신','상관'], 재성:['편재','정재'], 관성:['편관','정관'], 인성:['편인','정인'],
};
const FAMILY_MEANING = {
  비겁:{over:'주관과 자존심이 두드러지고 혼자 해내는 힘이 크다. 몫을 두고 사람과 부딪히기 쉬워 공동 자금과 동업은 규칙부터 정해야 한다.', none:'독자 추진력보다 주변과 맞추는 조율에 강하다. 지칠 때 기댈 협력자가 필요하다.'},
  식상:{over:'표현과 재능, 말과 아이디어가 풍성하다. 힘을 밖으로 많이 내보내 쉽게 지치므로 시작보다 마무리에 일정을 배정해야 한다.', none:'생각을 밖으로 꺼내는 통로가 좁다. 기록·발표처럼 표현 루틴을 일부러 만들면 좋다.', weak:'신약과 겹치면 설기(洩氣)가 과하다고 본다. 휴식과 학습(인성)으로 보충한다.'},
  재성:{over:'현실 감각과 관리 능력이 두드러지고 챙길 일과 사람이 많아 바쁘기 쉽다.', none:'돈 자체보다 의미와 사람을 좇는다. 재무 감각은 습관과 도구로 보완한다.', weak:'신약과 겹치면 재다신약(財多身弱)이라 한다. 감당할 수 있는 만큼만 맡을 때 재물이 온전히 남는다.'},
  관성:{over:'책임과 기대가 무겁게 느껴지기 쉽다. 역할의 경계와 기준을 분명히 하는 것이 힘이 된다.', none:'틀에 매이지 않는 자유로움이 크다. 스스로 정한 마감과 규칙이 중심을 대신 잡아 준다.', weak:'신약과 겹치면 압박이 스트레스로 체감되기 쉽다(관살태과). 배움·쉼·조언자(인성)가 압박을 힘으로 바꾸는 통로다.'},
  인성:{over:'생각과 배움이 깊다. 받는 것에 익숙해지면 실행이 늦어질 수 있다.', none:'후원보다 직접 부딪혀 배운다. 쉬어 가는 시간과 믿을 만한 조언자를 일부러 챙겨야 한다.', strong:'신강과 겹치면 배운 것을 현실의 결과물(재성)로 바꾸는 일이 균형을 잡아 준다.'},
};
const COMBOS = [
  {name:'식상생재', test:n => (n.식신 || n.상관) && (n.편재 || n.정재), meaning:'재능과 표현이 수입과 성과로 이어지는 연결'},
  {name:'관인상생', test:n => (n.편관 || n.정관) && (n.편인 || n.정인), meaning:'책임이 배움으로, 배움이 실력과 평판으로 이어지는 연결'},
  {name:'식신제살', test:n => n.식신 && n.편관, meaning:'압박을 실력과 기술로 풀어내는 구조'},
  {name:'상관견관', test:n => n.상관 && n.정관, meaning:'규칙과 내 생각이 부딪히기 쉬워 절차를 갖춘 의견 표현이 필요한 구조'},
  {name:'관살혼잡', test:n => n.편관 && n.정관, meaning:'책임과 역할이 여러 갈래로 겹치기 쉬워 우선순위 고정이 필요한 구조'},
];

/** @param {{tenGodsByPillar?:Record<string,any>, tenGods?:Record<string,number>|object, strength?:{isStrong?:boolean}}} [input] */
export function buildTenGodProfile({ tenGodsByPillar = {}, tenGods = {}, strength = {} } = {}) {
  const surface = {}, hidden = {}, where = {};
  const add = (map, god, n = 1) => { if (god && god !== '일간') map[god] = (map[god] || 0) + n; };
  for (const position of POSITIONS) {
    const p = tenGodsByPillar?.[position];
    if (!p) continue;
    const branchGod = p.primaryHiddenTenGod || rows(p.branchTenGods)[0];
    for (const [side, god] of [['천간', p.stemTenGod], ['지지', branchGod]]) {
      if (!god || god === '일간') continue;
      add(surface, god);
      (where[god] = where[god] || []).push(`${POS_KO[position]} ${side}`);
    }
    for (const h of rows(p.hiddenStemTenGods)) add(hidden, h.tenGod);
  }
  const visibleCount = Object.values(surface).reduce((a, b) => a + b, 0);
  const isStrong = typeof strength.isStrong === 'boolean' ? strength.isStrong : null;
  const families = Object.entries(FAMILIES).map(([family, gods]) => {
    const s = gods.reduce((n, g) => n + (surface[g] || 0), 0), h = gods.reduce((n, g) => n + (hidden[g] || 0), 0);
    const weight = Math.round(gods.reduce((n, g) => n + Number(tenGods[g] || 0), 0) * 100) / 100;
    const m = FAMILY_MEANING[family];
    const state = s >= 3 ? '발달' : s === 0 ? (h ? '잠재' : '부재') : '보통';
    const note = state === '발달' ? [m.over, isStrong === false && m.weak, isStrong === true && m.strong].filter(Boolean).join(' ')
      : state === '부재' ? m.none : state === '잠재' ? `겉 글자에는 없고 지장간에 ${h}개 있다. 필요할 때 늦게 꺼내 쓰는 잠재력으로 읽는다.` : undefined;
    return {family, gods, visible:s, hidden:h, weight, state, ...(note ? {note} : {})};
  });
  const combos = COMBOS.filter(c => c.test(surface)).map(c => ({name:c.name, meaning:c.meaning, status:'구조 후보'}));
  const fam = Object.fromEntries(families.map(f => [f.family, f]));
  if (fam.비겁.visible >= 3 && fam.재성.visible >= 1) combos.push({name:'군겁쟁재', meaning:'비겁이 많고 재성이 드러나 몫과 돈을 두고 경쟁이 생기기 쉬운 구조', status:'구조 후보'});
  if (fam.재성.visible >= 3 && isStrong === false) combos.push({name:'재다신약', meaning:'재성이 많은데 일간의 힘이 약해 맡는 범위를 감당 가능한 수준으로 줄여야 하는 구조', status:'강약 판단과 함께 성립'});
  const top = Math.max(...families.map(f => f.visible));
  return {version:SAJU_SIGNALS_VERSION, visibleCount, surface, hidden, where, families,
    leading:families.filter(f => f.visible === top && top > 0).map(f => f.family), combos,
    rule:'겉 글자는 일간을 뺀 천간과 각 지지의 본기 십성이다. 3개 이상은 발달, 0개는 부재(지장간에만 있으면 잠재)다. 조합은 겉 글자 공존 기준의 구조 후보이며 위치·통근·강약에 따라 작동 강도가 다르다. 개수는 우열이나 성공 확률이 아니다.'};
}

const SAENGJI = '寅申巳亥';
const ADJACENT = [['year','month'],['month','day'],['day','hour']];
const branchOf = target => String(target || '')[0];
const clashesOf = interactions => rows(interactions?.branchClashes).map(c => ({label:c.label, pillars:c.pillars, values:c.values}));

/** @param {{pillars?:Record<string,string|null>, natalInteractions?:object, shinsal?:any, yearlyLuck?:any[]|null, majorLuck?:any}} [input] */
export function buildMovementSignals({ pillars = {}, natalInteractions = {}, shinsal = {}, yearlyLuck = null, majorLuck = null } = {}) {
  const details = preventionPillarDetails(pillars);
  const present = POSITIONS.filter(p => details[p]);
  const saengji = present.filter(p => SAENGJI.includes(details[p].earthlyBranch)).map(p => ({position:p, branch:details[p].earthlyBranch}));
  const horse = shinsal?.byName?.['역마살'];
  const yeokmaTargets = rows(horse?.targets).map(branchOf).filter(Boolean);
  const yeokma = {present:horse?.present === true, targets:yeokmaTargets, hits:rows(horse?.hits).map(h => ({position:h.position, branch:h.branch, source:h.source}))};
  const stemGroups = {};
  for (const p of present) (stemGroups[details[p].heavenlyStem] = stemGroups[details[p].heavenlyStem] || []).push(p);
  const stemRepeats = Object.entries(stemGroups).filter(([, ps]) => ps.length >= 2)
    .map(([stem, positions]) => ({stem, positions, adjacent:ADJACENT.some(([a, b]) => positions.includes(a) && positions.includes(b))}));
  const natalClashes = clashesOf(natalInteractions);
  const indicators = {stemRepeat:stemRepeats.length > 0, yeokmaOrSaengji:yeokma.present || saengji.length >= 2, clash:natalClashes.length > 0};
  const hits = Object.values(indicators).filter(Boolean).length;
  const periods = [];
  for (const row of rows(yearlyLuck)) {
    const branch = row.earthlyBranch || canonicalPreventionPillar(row.pillar)[1];
    const stem = row.heavenlyStem || canonicalPreventionPillar(row.pillar)[0];
    const clashes = clashesOf(row.natalInteractions);
    const flags = {
      clash:clashes.length > 0, yeokmaYear:yeokmaTargets.includes(branch), saengjiYear:SAENGJI.includes(branch),
      stemEcho:present.filter(p => details[p].heavenlyStem === stem),
    };
    if (flags.clash || flags.yeokmaYear || flags.stemEcho.length) periods.push({kind:'year', year:row.year, pillar:row.pillar, clashes, ...flags});
  }
  const current = majorLuck?.currentCycle;
  const majorPillar = canonicalPreventionPillar(current?.pillar);
  const major = majorPillar ? {pillar:current.pillar, ageRange:current.ageRange || current.startAge && `${current.startAge}-${current.endAge}` || undefined,
    clashes:clashesOf(buildLuckNatalInteractions(majorPillar, details)), yeokma:yeokmaTargets.includes(majorPillar[1]), saengji:SAENGJI.includes(majorPillar[1])} : null;
  return {version:SAJU_SIGNALS_VERSION,
    natal:{saengji, yeokma, stemRepeats, clashes:natalClashes},
    overseas:{indicators, strength:hits >= 2 ? '뚜렷' : hits === 1 ? '일부' : '약함',
      rule:'해외·원거리 이동은 천간 병존, 역마 또는 생지 발달, 지지충(축미충 등 6충 모두)을 함께 본다. 둘 이상이 겹칠 때 뚜렷하다고 읽는다.'},
    periods, ...(major ? {majorLuck:major} : {}),
    rule:'충은 자리·환경·관계의 이동과 변동으로 읽고, 병존은 같은 기운이 반복되어 한곳에 머물기 어려운 결로 읽는다. 인신사해의 개수는 역마 성립이나 세력을 뜻하지 않는다. 이동수는 이사·이직·출장·유학·해외 활동처럼 활동 범위가 바뀌는 흐름이며 사고나 사건을 예언하지 않는다.',
    ...(rows(yearlyLuck).length ? {} : {limitation:'출생시간이 없거나 운 자료가 없어 해마다의 이동 시기는 다루지 않는다.'})};
}

// Traditional spouse star: wealth for men, officer for women; the 정 star is the marriage star proper.
// Without a stated gender no spouse star is read, so the periods carry only 도화·홍염 and the day branch.
const SPOUSE_STAR = {
  male:{family:'재성', main:'정재', gods:['정재','편재']},
  female:{family:'관성', main:'정관', gods:['정관','편관']},
};
const targetsOf = (shinsal, name) => rows(shinsal?.byName?.[name]?.targets).map(branchOf).filter(Boolean);
const dayLinks = (interactions, key) => rows(interactions?.[key]).filter(c => rows(c.pillars).includes('day')).map(c => `일지 ${c.label}`);
const luckStars = (row, gods) => [...new Set([row?.stemTenGod, rows(row?.hiddenStems)[0]?.tenGod])].filter(g => gods.includes(g));

/** @param {{gender?:string, tenGodsByPillar?:Record<string,any>, shinsal?:any, yearlyLuck?:any[]|null, majorLuck?:any}} [input] */
export function buildRomanceTiming({ gender = '', tenGodsByPillar = {}, shinsal = {}, yearlyLuck = null, majorLuck = null } = {}) {
  const spouse = SPOUSE_STAR[gender] || null;
  const peach = targetsOf(shinsal, '도화살'), hongyeom = targetsOf(shinsal, '홍염살');
  const natalStars = spouse ? POSITIONS.flatMap(p => {
    const x = tenGodsByPillar?.[p];
    return x ? [[`${POS_KO[p]} 천간`, x.stemTenGod], [`${POS_KO[p]} 지지`, x.primaryHiddenTenGod]]
      .filter(([, god]) => spouse.gods.includes(god)).map(([where, god]) => ({where, god})) : [];
  }) : [];
  const love = [], marriage = [];
  for (const row of rows(yearlyLuck)) {
    const branch = row.earthlyBranch || canonicalPreventionPillar(row.pillar)[1];
    const combine = dayLinks(row.natalInteractions, 'branchCombinations');
    const loveSignals = [...(spouse ? luckStars(row, spouse.gods).map(g => `배우자성 ${g}`) : []),
      ...(peach.includes(branch) ? ['도화가 드는 해'] : []), ...(hongyeom.includes(branch) ? ['홍염이 드는 해'] : []), ...combine];
    const marriageSignals = [...(spouse ? luckStars(row, [spouse.main]).map(g => `정배우자성 ${g}`) : []),
      ...combine, ...dayLinks(row.natalInteractions, 'branchClashes')];
    if (loveSignals.length) love.push({year:row.year, pillar:row.pillar, signals:loveSignals});
    if (marriageSignals.length) marriage.push({year:row.year, pillar:row.pillar, signals:marriageSignals});
  }
  const current = majorLuck?.currentCycle;
  const next = current ? rows(majorLuck?.cycles).find(c => c.index === current.index + 1) : null;
  const cycle = c => c?.pillar ? {pillar:c.pillar, ageRange:`${c.startAge}-${c.endAge}`,
    signals:[...(spouse ? luckStars(c, spouse.gods).map(g => `배우자성 ${g}`) : []),
      ...dayLinks(c.natalInteractions, 'branchCombinations'), ...dayLinks(c.natalInteractions, 'branchClashes')]} : null;
  const major = current ? {current:cycle(current), ...(next ? {next:cycle(next)} : {})} : null;
  return {version:SAJU_SIGNALS_VERSION,
    spouseStar:spouse ? {...spouse, natal:natalStars} : null,
    attraction:{peach, hongyeom},
    love, marriage, ...(major?.current ? {majorLuck:major} : {}),
    rule:'배우자성은 남성 재성·여성 관성으로 보는 전통 기준이고, 일지는 배우자 자리다. 연애 신호는 배우자성·도화·홍염·일지 합이 드는 해, 결혼 신호는 정배우자성과 일지 합·충이 드는 해다. 일지 충은 배우자 자리의 변동(결혼·동거·이사·관계 재정비)으로 읽는다. 신호는 인연이 움직일 계기이며 만남·결혼·이별을 확정하지 않고, 비혼·동성 관계에 같은 기준을 강요하지 않는다.',
    ...(spouse ? {} : {limitation:'성별 정보가 없어 배우자성은 판정하지 않는다.'}),
    ...(rows(yearlyLuck).length ? {} : {periodLimitation:'출생시간이 없거나 운 자료가 없어 해마다의 연애·결혼 시기는 다루지 않는다.'})};
}

const HEALTH_ELEMENT = {
  wood:{rhythm:'간담 리듬', excess:'계획은 많지만 몸이 따라오지 않아 목과 어깨의 긴장, 조급함, 답답함이 생활 신호로 나타나기 쉽다.', weak:'시작 에너지가 부족하거나 회복 루틴을 잡기 어려울 수 있다.',
    excessSignals:['해야 할 일이 많아 머릿속이 바쁘다','목과 어깨가 쉽게 굳는 느낌이 든다'], weakSignals:['시작이 늦어지고 미루는 일이 많아진다','결정이 느려지고 방향감이 흐려진다'],
    care:['오늘 할 일을 하나만 줄이기','목·어깨 이완 스트레칭','짧은 산책'], avoid:['과한 일정','밤늦은 화면 사용']},
  fire:{rhythm:'심장·소장 리듬', excess:'몸과 마음이 쉽게 달아오르고 늦은 시간까지 흥분이 가라앉지 않는 생활 신호가 나타나기 쉽다.', weak:'의욕과 표현력이 줄어들고 몸이 무기력하게 느껴질 수 있다.',
    excessSignals:['마음이 들떠 쉽게 가라앉지 않는다','잠들기 전까지 생각과 감정이 활발하다'], weakSignals:['의욕이 잘 올라오지 않는다','즐거운 일에도 반응이 약하다'],
    care:['낮 시간 햇빛 보기','가벼운 리듬 운동','자기 전 조명 낮추기'], avoid:['늦은 밤 카페인','무리한 약속']},
  earth:{rhythm:'비위 리듬', excess:'몸과 마음이 무겁고 생각이 많아져 움직임이 둔해질 수 있다.', weak:'생활 중심이 흔들리고 식사나 휴식 시간이 불규칙해지기 쉽다.',
    excessSignals:['몸이 무겁고 움직임이 둔하다','생각이 많아져 결정을 미룬다'], weakSignals:['식사 시간이 불규칙하다','작은 변화에도 쉽게 흔들린다'],
    care:['따뜻하고 단순한 식사','식사 시간을 일정하게 맞추기','느린 산책'], avoid:['식사 거르기','걱정 반복']},
  metal:{rhythm:'폐·대장 리듬', excess:'기준이 높아지고 몸이 경직되기 쉽다. 완벽하게 해내려는 마음보다 여백이 중요하다.', weak:'생활의 경계와 정리 리듬이 흐려질 수 있다.',
    excessSignals:['기준을 낮추기 어렵다','쉬는 중에도 머릿속 검열이 계속된다'], weakSignals:['생활 공간이 쉽게 흐트러진다','호흡이 얕아진 듯한 느낌이 있다'],
    care:['깊은 호흡 3분','책상 위 한 구역 정리','실내 환기와 습도 관리'], avoid:['완벽주의','건조한 환경 방치']},
  water:{rhythm:'신장·방광 리듬', excess:'생각이 깊어지고 몸이 무겁게 가라앉는 느낌이 들 수 있다. 따뜻한 움직임과 햇빛이 균형을 잡아 준다.', weak:'회복감이 부족하고 수면 리듬이 흔들리기 쉽다.',
    excessSignals:['생각이 깊어져 쉽게 빠져나오기 어렵다','늦은 밤 걱정이 길어진다'], weakSignals:['잠을 자도 회복감이 부족하다','밤 시간이 불규칙해진다'],
    care:['취침 시간 앞당기기','하체 따뜻하게 하기','따뜻한 물 천천히 마시기'], avoid:['밤샘','늦은 밤 고민']},
};
const DAY_MASTER_VIEW = {
  甲:{tendency:'앞으로 뻗어 나가려는 힘이 강해 목표와 방향성이 컨디션에 큰 영향을 준다.', stress:'막힘이 생기면 목·어깨 긴장, 답답함, 조급함으로 생활 신호가 나타나기 쉽다.'},
  乙:{tendency:'환경의 영향을 섬세하게 받으며 부드럽게 적응할 때 컨디션이 살아난다.', stress:'관계나 환경의 압박이 커지면 몸이 쉽게 굳고 마음이 예민해질 수 있다.'},
  丙:{tendency:'밝은 에너지와 표현력이 강해 사람과 활동 속에서 기운을 얻기 쉽다.', stress:'과열되면 수면 리듬이 흐트러지고 감정이 쉽게 달아오를 수 있다.'},
  丁:{tendency:'감정의 온도와 집중력이 컨디션에 큰 영향을 준다.', stress:'마음이 오래 타오르면 피로가 누적되고 작은 말에도 예민해질 수 있다.'},
  戊:{tendency:'버티는 힘이 강하지만 한 번 무거워지면 회복 속도가 늦어질 수 있다.', stress:'책임이 쌓이면 몸이 무겁고 움직임이 둔해지는 생활 신호가 나타날 수 있다.'},
  己:{tendency:'섬세하게 돌보고 정리하는 힘이 있지만 걱정이 많아지면 몸의 중심이 흔들리기 쉽다.', stress:'생각 과다, 식사 불규칙 같은 생활 신호로 나타날 수 있다.'},
  庚:{tendency:'기준과 결단력이 강해 목표를 향해 밀고 가는 힘이 좋다.', stress:'기준이 과해지면 몸이 경직되고 호흡이 얕아지는 느낌이 생길 수 있다.'},
  辛:{tendency:'감각과 기준이 섬세해 작은 변화에도 민감하게 반응할 수 있다.', stress:'예민함, 완벽주의, 건조한 환경에 대한 피로감이 생활 신호로 나타날 수 있다.'},
  壬:{tendency:'생각의 폭이 넓고 흐름을 읽는 힘이 좋지만 과하면 깊은 생각에 잠기기 쉽다.', stress:'밤 시간 고민, 수면 리듬 흔들림, 몸이 가라앉는 느낌이 나타날 수 있다.'},
  癸:{tendency:'감수성과 직감이 섬세해 주변 분위기의 영향을 많이 받을 수 있다.', stress:'불안, 차가운 느낌, 작은 변화에 대한 피로감이 생활 신호로 나타날 수 있다.'},
};
const JOHU_TEMPERATURE = {
  hot:{summary:'화와 목의 상승성이 빨라 몸과 마음이 쉽게 달아오르는 흐름이다.', care:'수의 휴식과 금의 호흡을 먼저 세우면 과열된 기운이 가라앉는다.'},
  warm:{summary:'따뜻한 편이라 활동성이 좋지만 과열되기 쉽다.', care:'수면과 수분 같은 식히는 루틴을 꾸준히 둔다.'},
  cool:{summary:'서늘한 편이라 몸의 속도가 느려지고 회복감이 늦게 올라올 수 있다.', care:'화의 온기와 목의 가벼운 움직임을 더한다.'},
  cold:{summary:'수와 금의 수렴성이 깊어 몸의 속도가 느려지고 회복감이 늦게 올라오는 흐름이다.', care:'화의 온기와 목의 가벼운 움직임을 더하면 닫힌 리듬이 천천히 열린다.'},
};
const JOHU_MOISTURE = {
  dry:{summary:'금의 수렴성과 화의 열감이 겹치면 호흡·피부 컨디션과 목·어깨의 긴장이 쉽게 굳을 수 있다.', care:'수분, 습도, 호흡, 부드러운 스트레칭이 마른 기운을 풀어 준다.'},
  wet:{summary:'수와 토의 머무름이 깊어지면 몸이 무겁고 생각이 오래 고이는 생활 신호가 떠오를 수 있다.', care:'가벼운 걷기, 단순한 식사, 공간 정리가 정체된 기운을 움직인다.'},
};
export const SAJU_HEALTH_DISCLAIMER = '명리학적 관점에서 오행 균형, 생활 리듬, 컨디션 흐름을 살핀 운세 콘텐츠입니다. 의학적 진단이나 치료를 대체하지 않으며, 실제 건강 문제가 있거나 지속적인 통증·불편감이 있다면 반드시 전문 의료진과 상담하세요.';

/** @param {{fiveElements?:object, seasonalBalance?:any, dayMaster?:string, elementProfile?:any}} [input] */
export function buildSajuHealthBasis({ fiveElements = {}, seasonalBalance = {}, dayMaster = '', elementProfile } = {}) {
  const profile = elementProfile || buildElementProfile(fiveElements);
  const focus = profile.elements.filter(e => e.state !== '균형').map(e => {
    const k = HEALTH_ELEMENT[e.element], excess = e.state === '과다';
    return {element:e.element, label:e.label, state:e.state, rhythm:k.rhythm, message:excess ? k.excess : k.weak,
      signals:excess ? k.excessSignals : k.weakSignals, care:k.care, avoid:k.avoid};
  });
  const temperature = JOHU_TEMPERATURE[seasonalBalance?.type], moisture = JOHU_MOISTURE[seasonalBalance?.moistType];
  return {version:SAJU_SIGNALS_VERSION, focus,
    dayMaster:DAY_MASTER_VIEW[dayMaster] ? {stem:dayMaster, ...DAY_MASTER_VIEW[dayMaster]} : null,
    climate:{type:seasonalBalance?.type || null, moistType:seasonalBalance?.moistType || null, ...(temperature ? {temperature} : {}), ...(moisture ? {moisture} : {})},
    rule:'장부 이름은 오행의 상징적 생활 리듬이다. 질병·진단·치료·복약을 말하지 않고 수면·식사·움직임·휴식 습관으로만 설명한다. 걱정되는 증상은 의료진 확인을 권한다.',
    disclaimer:SAJU_HEALTH_DISCLAIMER};
}
