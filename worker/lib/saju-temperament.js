import { SHI_SHEN, WU_XING_GAN, WU_XING_ZHI, ZHI_HIDE_GAN } from '../../lib/saju/myeongri-tables.js';

// Interpretation only: canonical table lookups on already calculated pillars. No calendar,
// power/yongshin calculation, probability, or provider calls belong here.
export const SAJU_TEMPERAMENT_VERSION = 'saju-temperament-20261102-v1';
export const SAJU_TEMPERAMENT_RULE = '타고난 성향은 계산 사실과 전통 해석을 구분하여 욕구 → 선택 습관 → 강점 → 과할 때의 그림자 → 조절법으로 설명한다. 겉 글자 3개 이상은 분포상 발달이지 곧 과다·문제 성향이라는 뜻이 아니다. 월령·정편 구성·기존 신강약·종격·투간·제화의 확인 범위를 함께 읽는다. 오행은 일간 기준 십성의 역할을 보완하며, 과한 힘은 조절되지 않으면 부족할 때와 비슷한 어려움으로 나타날 수 있다. 없는 십성을 능력·도덕성의 결여로 읽지 않는다. 재성의 손익 집착·눈앞의 이익 추구, 식상의 호기심·새 자극·즉각적 만족 추구는 근거가 허용하는 조건부 행동 경향으로 풀고 도파민 수치·중독·질환·인격을 판정하지 않는다. 성향 장에서 총론을 설명하고 후속 장에서는 질문에 적용하며 반복하지 않는다.';

const FAMILIES = { 비겁:['비견','겁재'], 식상:['식신','상관'], 재성:['정재','편재'], 관성:['정관','편관'], 인성:['정인','편인'] };
const GOD_KO = { 比肩:'비견', 劫财:'겁재', 食神:'식신', 伤官:'상관', 正财:'정재', 偏财:'편재', 正官:'정관', 七杀:'편관', 正印:'정인', 偏印:'편인' };
const ELEMENT_KO = { 木:'목', 火:'화', 土:'토', 金:'금', 水:'수' };
const POSITIONS = ['year','month','day','hour'];
const SHORT = {year:'y',month:'m',day:'d',hour:'h'};
const POS_KO = {year:'년주',month:'월주',day:'일주',hour:'시주'};
const STEM_CN = '甲乙丙丁戊己庚辛壬癸', STEM_KO = '갑을병정무기경신임계';
const BRANCH_CN = '子丑寅卯辰巳午未申酉戌亥', BRANCH_KO = '자축인묘진사오미신유술해';
const list = value => Array.isArray(value) ? value : [];
const familyOf = god => Object.keys(FAMILIES).find(f => FAMILIES[f].includes(god));
const godFor = (day, stem) => GOD_KO[SHI_SHEN[day + stem]] || '';
const normalizeChar = (value, ko, cn) => ko.includes(value) && value ? cn[ko.indexOf(value)] : value;

// Each god has its own desire, choice pattern, strength, conditional shadow and concrete adjustment.
const TRAITS = {
  비견:['스스로 결정하고 내 몫을 지키려는 욕구','독립적으로 판단하고 직접 해보는 선택','자립심과 꾸준히 버티는 힘','주관이 굳어 도움이나 다른 의견까지 거절하기 쉬움','혼자 결정할 일과 도움받을 일을 나누고 반대 의견 한 가지를 확인한다'],
  겁재:['경쟁 속에서 존재감을 확인하고 사람과 함께 움직이려는 욕구','기회와 사람에 빠르게 합류하는 선택','승부 감각과 사람을 모으는 추진력','비교와 승부에 매여 지출·약속·공동 자금의 경계를 놓치기 쉬움','비교 대상을 줄이고 공동 지출과 역할은 시작 전에 문서로 정한다'],
  식신:['즐거움과 편안함 속에서 내 것을 만들어내려는 욕구','취향에 맞는 일을 반복하고 결과물을 쌓는 선택','꾸준한 창작과 생활의 만족을 만드는 힘','즉각적인 만족과 편안함에 머물러 싫은 일의 마무리를 미루기 쉬움','즐기는 시간과 완성할 시간을 나누고 작은 결과물 하나를 끝낸다'],
  상관:['새로운 자극을 탐색하고 내 생각을 자유롭게 표현하려는 욕구','호기심을 따라 실험하고 기존 방식에 질문하는 선택','표현력과 독창성, 불편한 점을 개선하는 힘','빠른 반응과 자극을 좇아 싫증이 나거나 말이 실행보다 앞서기 쉬움','새 일을 추가하기 전 기존 일 하나를 마치고 중요한 말은 한 번 정리해 전한다'],
  정재:['안정적인 기반을 확보하고 가진 것을 지키려는 욕구','비용과 효용을 비교하고 예측 가능한 것을 고르는 선택','현실 감각과 관리·축적·약속 이행 능력','손익과 통제에 매여 작은 손해도 견디기 어렵거나 눈앞의 이익을 우선하기 쉬움','단기 손익과 장기 가치를 따로 적고 돈으로 재지 않을 기준을 정한다'],
  편재:['기회를 포착하고 자원을 넓게 움직이려는 욕구','사람과 거래·새 기회에 자원을 배분하는 선택','판세를 읽는 유연성과 자원 운용 능력','눈앞의 이익이나 큰 기회에 끌려 일을 벌이고 감당할 범위를 넘기기 쉬움','새 기회마다 쓸 시간·자원의 상한과 중단 기준을 먼저 정한다'],
  정관:['신뢰받는 역할과 분명한 기준을 지키려는 욕구','절차와 책임을 확인한 뒤 움직이는 선택','성실함과 일관성, 공동의 기준을 지키는 힘','평가와 기대에 매여 실수를 과하게 경계하거나 판단이 경직되기 쉬움','남의 기대와 내 책임을 나누고 충분히 괜찮은 완료 기준을 정한다'],
  편관:['위험을 통제하고 어려운 상황을 돌파하려는 욕구','긴장 속에서도 빠르게 결단하고 책임지는 선택','위기 대응과 집중력, 어려운 과제를 맡는 힘','긴장을 풀지 못해 자신과 주변을 몰아붙이거나 통제하려 하기 쉬움','대응할 위험과 내려놓을 위험을 구분하고 긴장을 끝내는 휴식 시간을 확보한다'],
  정인:['이해받고 충분히 이해한 뒤 안정적으로 움직이려는 욕구','배우고 확인하며 안전한 바탕을 마련하는 선택','학습과 수용, 경험을 정리하고 돌보는 힘','보호와 확인을 기다리며 준비가 길어지고 실행을 늦추기 쉬움','더 알아볼 항목을 제한하고 배운 것 하나를 작은 행동으로 옮긴다'],
  편인:['남들이 놓친 의미를 찾고 나만의 관점을 지키려는 욕구','직관적으로 탐구하고 익숙한 설명을 다시 살피는 선택','통찰과 독창적인 탐구, 미세한 차이를 읽는 힘','해석과 의심이 많아 생각이 복잡해지고 실행이나 교류를 피하기 쉬움','추측과 확인된 사실을 나누고 생각 하나를 실제 관찰로 확인한다'],
};

function pillarOf(chart, position) {
  const source = chart.pillars?.[position] ?? chart.pillars?.[SHORT[position]] ?? chart[`${position}Pillar`];
  const raw = source?.ganji || source;
  const stem = typeof raw === 'string' ? raw[0] : raw?.stem || raw?.gan || raw?.g;
  const branch = typeof raw === 'string' ? raw[1] : raw?.branch || raw?.zhi || raw?.ji || raw?.j;
  const normalizedStem = normalizeChar(stem || '', STEM_KO, STEM_CN);
  const normalizedBranch = normalizeChar(branch || '', BRANCH_KO, BRANCH_CN);
  return {stem:WU_XING_GAN[normalizedStem] ? normalizedStem : '',branch:WU_XING_ZHI[normalizedBranch] ? normalizedBranch : ''};
}

function strengthContext(family, developed, isStrong, jong) {
  if (jong) return '종격 후보의 성립·확인 상태를 먼저 따른다. 일반격의 과다 억제나 재다신약 설명을 자동 적용하지 않는다.';
  if (isStrong === null) return '신강약 근거 미제공: 욕구의 방향만 읽고 감당 능력이나 소모 정도는 확정하지 않는다.';
  if (!developed) return '분포상 발달 기준 미만: 해당 십성의 존재만으로 그림자를 중심 성격으로 확대하지 않는다.';
  const contexts = {
    비겁: isStrong ? '주도성이 경쟁·고집으로 치우치는 조건을 살핀다.' : '비겁이 자립과 버팀을 돕는 면을 먼저 읽고 경쟁·갈등으로 단정하지 않는다.',
    식상: isStrong ? '표현과 생산성을 살릴 여지가 있다. 자극 추구·산만함은 마무리와 조절 조건이 약할 때의 그림자다.' : '밖으로 쏟는 표현과 활동이 부담·소모로 이어질 수 있다. 흥미가 많아도 지속할 체력과 일정을 함께 살핀다.',
    재성: isStrong ? '자원을 다룰 여지를 먼저 읽는다. 관리 능력을 집착으로 바꾸지 말고 손익·확장에 치우치는 조건을 짚는다.' : '재다신약의 구조 후보: 성과와 자원을 챙기려는 욕구가 감당 능력보다 앞설 때 부담·손익에 쫓기는 양상을 살핀다. 가난이나 손실을 확정하지 않는다.',
    관성: isStrong ? '책임과 규율을 실행력으로 쓰는 면과 기준이 경직되는 조건을 함께 읽는다.' : '기대와 책임이 압박으로 느껴질 조건을 살피고 맡는 범위와 도움받을 통로를 설명한다.',
    인성: isStrong ? '배움과 준비가 실행을 대신하는 조건을 살피고 표현·결과물로 연결할 방법을 제시한다.' : '학습·쉼·도움이 버팀을 보완하는 면을 먼저 읽고 의존·게으름으로 단정하지 않는다.',
  };
  return contexts[family];
}

/** Accepts only computed chart facts (life-book, screen or myeongsik fact snapshot). */
export function buildSajuTemperamentProfile(chart = {}) {
  const timeUnknown = chart.timeUnknown === true || chart.birthTimeUnknown === true || chart.calculationMeta?.timeUnknown === true;
  const pillars = Object.fromEntries(POSITIONS.map(p => [p, p === 'hour' && timeUnknown ? {stem:'',branch:''} : pillarOf(chart,p)]));
  const dayMaster = pillars.day.stem || (typeof chart.dayMaster === 'string' ? chart.dayMaster[0] : chart.dayMaster?.stem) || '';
  const byPillar = chart.tenGodsByPillar || {};
  const power = chart.strengthHeuristic || chart.power || chart.natalAnalysis?.power || (typeof chart.strength === 'object' ? chart.strength : null) || chart.seasonalBalance?.runtimeInterpretation || {};
  // Some existing prompt digests retain only the canonical strength sentence. Read its exact
  // prefix; do not infer strength from an element count or arbitrary descriptive prose.
  const canonicalStrength = typeof chart.strength === 'string' ? /^억부 기준 (신강|신약):/.exec(chart.strength) : null;
  const jong = chart.jong || chart.natalAnalysis?.jong || {isJong:typeof chart.strength === 'string' && chart.strength.includes('종격은 후보')};
  const isStrong = typeof power.isStrong === 'boolean' ? power.isStrong : canonicalStrength ? canonicalStrength[1] === '신강' : null;
  const surface = {}, hidden = {}, positions = {}, elements = {};
  let monthMain = '';
  const add = (counts, god) => { if (TRAITS[god]) counts[god] = (counts[god] || 0) + 1; };
  for (const position of POSITIONS) {
    if (position === 'hour' && timeUnknown) continue;
    const {stem,branch} = pillars[position], supplied = byPillar[position];
    for (const element of [WU_XING_GAN[stem],WU_XING_ZHI[branch]]) if (element) elements[element] = (elements[element] || 0) + 1;
    const hiddenGods = branch && dayMaster
      ? list(ZHI_HIDE_GAN[branch]).map(h => godFor(dayMaster,h))
      : list(supplied?.hiddenStemTenGods).map(h => h.tenGod);
    const branchGod = branch && dayMaster ? hiddenGods[0] : supplied?.primaryHiddenTenGod || list(supplied?.branchTenGods)[0];
    const stemGod = position === 'day' ? '' : stem && dayMaster ? godFor(dayMaster,stem) : supplied?.stemTenGod;
    for (const [side,god] of [['천간',stemGod],['지지 본기',branchGod]]) {
      if (!TRAITS[god]) continue;
      add(surface,god);
      (positions[god] ||= []).push({pillar:position,side});
    }
    hiddenGods.forEach(g => add(hidden,g));
    if (position === 'month') monthMain = branchGod || '';
  }
  if (!Object.keys(surface).length && !Object.keys(hidden).length) return null;
  const advanced = chart.advancedFactors || chart.majorStructures || {};
  const families = Object.entries(FAMILIES).map(([family,gods]) => {
    const visible = gods.reduce((n,g) => n + (surface[g] || 0),0);
    const latent = gods.reduce((n,g) => n + (hidden[g] || 0),0);
    return {family,visible,hidden:latent,state:visible >= 3 ? '발달' : visible ? '보통' : latent ? '잠재' : '겉·지장간에서 미관측',
      monthMain:gods.includes(monthMain), interpretation:strengthContext(family,visible >= 3,isStrong,jong.isJong === true)};
  });
  const tenGods = Object.entries(TRAITS).filter(([god]) => surface[god] || hidden[god]).map(([god,values]) => ({
    god,family:familyOf(god),facts:{visible:surface[god] || 0,hidden:hidden[god] || 0,positions:positions[god] || [],monthMain:god === monthMain,
      natalExposures:list(advanced.hiddenStemExposures).filter(row => row.exposedInNatalHeavenlyStem === true && (list(row.tenGods).includes(god) || godFor(dayMaster,row.hiddenStem) === god)).map(row => ({stem:row.hiddenStem,positions:row.exposedNatalPositions})),
    },
    interpretation:Object.fromEntries(['desire','choice','strength','shadow','action'].map((key,i) => [key,values[i]])),
  }));
  const dayElement = WU_XING_GAN[dayMaster];
  const elementRoles = Object.entries(elements).map(([element,count]) => {
    const stem = Object.keys(WU_XING_GAN).find(s => WU_XING_GAN[s] === element);
    return {element:ELEMENT_KO[element],count,family:familyOf(godFor(dayMaster,stem)),includesDayMaster:element === dayElement};
  });
  const top = Math.max(...families.map(f => f.visible));
  return {version:SAJU_TEMPERAMENT_VERSION,
    facts:{dayMaster,monthMain,isStrong,visibleCount:Object.values(surface).reduce((a,b) => a+b,0),elementRoles,
      missingPillars:POSITIONS.filter(p => !pillars[p].stem && !pillars[p].branch && (!byPillar[p] || p === 'hour' && timeUnknown)),
      jongCandidate:jong.isJong === true,jongConfirmed:jong.confirmedByUser === true,
      timeUnknown:timeUnknown || !pillars.hour.stem && !byPillar.hour,rooting:'지장간의 존재만으로 통근의 성립·강도를 확정하지 않음'},
    families,tenGods,leading:families.filter(f => f.visible === top && top > 0).map(f => f.family),
    // Co-presence is not a proven structure or an automatically effective remedy.
    coPresence:[['식상','재성'],['관성','인성'],['식상','인성'],['비겁','재성']].filter(pair => pair.every(f => families.find(row => row.family === f).visible > 0)),
    rule:SAJU_TEMPERAMENT_RULE,
  };
}

/** Compact, self-contained prompt projection; keep qualifiers alongside every reading lens. */
export function sajuTemperamentPromptLines(chart = {}) {
  const profile = chart.version === SAJU_TEMPERAMENT_VERSION ? chart : buildSajuTemperamentProfile(chart);
  if (!profile) return [];
  const {facts} = profile;
  // Keep tied leaders and the monthly role. These are reading priorities, not a new strength score.
  const focused = new Set([...profile.leading,...profile.families.filter(f => f.monthMain).map(f => f.family)]);
  const selected = profile.tenGods.filter(g => focused.has(g.family) && g.facts.visible > 0);
  return [
    '[사주 성향 해석 근거]',
    `일간 ${facts.dayMaster || '미제공'} · 월지 본기 십성 ${facts.monthMain || '미제공'} · 기존 억부 ${facts.isStrong === null ? '미제공' : facts.isStrong ? '신강' : '신약'} · 일간을 제외한 겉 십성 ${facts.visibleCount}개. 지장간 개수는 겉 개수에 더하지 않는다.`,
    ...(facts.timeUnknown ? ['시주 미상: 시주를 제외한 잠정 성향이며 숨은 시간 정보로 보완하지 않는다.'] : []),
    ...(facts.missingPillars.some(p => p !== 'hour') ? [`미제공 자리: ${facts.missingPillars.map(p => POS_KO[p]).join('·')}. 제공된 자리만의 부분 해석이며 전체 원국의 성향으로 확대하지 않는다.`] : []),
    ...(facts.jongCandidate ? [`종격 ${facts.jongConfirmed ? '생활 이력 확인됨' : '후보·성립 확인 필요'}: 일반격의 과다 억제 해석을 자동 적용하지 않는다.`] : []),
    ...profile.families.filter(f => focused.has(f.family)).map(f => `${f.family}: 겉 ${f.visible}개(${f.state}), 지장간 ${f.hidden}개${f.monthMain ? ', 월지 본기 역할' : ''}. ${f.interpretation}`),
    ...selected.map(({god,facts:f,interpretation:t}) => `${god}[${f.positions.map(p => POS_KO[p.pillar]+p.side).join('·')}]: 욕구=${t.desire}; 선택=${t.choice}; 강점=${t.strength}; 과할 때=${t.shadow}; 조절=${t.action}.`),
    ...selected.filter(g => g.facts.natalExposures.length).map(g => `${g.god}의 제공된 원국 투간: ${g.facts.natalExposures.map(e => e.stem).join('·')}. 운에서만 투출한 근거를 타고난 성향으로 바꾸지 않는다.`),
    ...(profile.tenGods.some(g => !g.facts.visible) ? [`지장간에만 관측: ${profile.tenGods.filter(g => !g.facts.visible).map(g => g.god).join('·')}. 일상 성격의 주된 증거로 확대하거나 없다고 단정하지 않는다.`] : []),
    `오행 역할(겉 글자만): ${facts.elementRoles.map(e => `${e.element} ${e.count}개=${e.family}${e.includesDayMaster ? '(일간 자체 포함)' : ''}`).join(' · ')}. 같은 오행도 일간에 따라 역할이 달라진다.`,
    ...(profile.coPresence.length ? [`함께 관측된 역할: ${profile.coPresence.map(p => p.join('·')).join(', ')}. 생재·제화의 성립이나 완화 효과는 월령·위치·기존 강약 등 실제 근거로 따로 확인하며 공존만으로 확정하지 않는다.`] : []),
    facts.rooting,
    SAJU_TEMPERAMENT_RULE,
  ];
}
