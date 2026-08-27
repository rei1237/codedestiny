/* ═══════════════════════════════════════════════════════════════
   SIBYL SYSTEM ENGINE
   사이버펑크 진로 적성 × 운명 스캔 시스템 — 사주 팔자 정밀 진단
   Based on: G_PILLARS / G_NATAL / G_JONG / G_JOHU internal data
═══════════════════════════════════════════════════════════════ */
(function(window) {
  'use strict';

var SIBYL_TEXT_TRANSLATIONS = {
  ko: {
    "sibyl.title.001": "CH.01 시빌라 코어 매트릭스",
    "sibyl.title.002": "CH.02 위험 계수 정밀 분석",
    "sibyl.title.003": "CH.03 적성 계수 정밀 분석",
    "sibyl.title.004": "CH.04 주도 십성과 행동 패턴",
    "sibyl.title.005": "CH.05 오행 밸런스와 에너지 설계",
    "sibyl.title.006": "CH.06 10년 위험 계수 그래프 해설",
    "sibyl.title.007": "CH.07 월별 리스크 플래너",
    "sibyl.title.008": "CH.08 관계와 애정 패턴",
    "sibyl.title.009": "CH.09 재물과 직업 전략",
    "sibyl.title.010": "CH.10 최종 실행 가이드",
    "sibyl.message.001": "API 요청에 실패했습니다.",
    "sibyl.label.001": "중립",
    "sibyl.title.011": "코어 안정도",
    "sibyl.title.012": "커리어 실행력",
    "sibyl.title.013": "재정 운용력",
    "sibyl.title.014": "관계/협업",
    "sibyl.title.015": "회복 탄성",
    "sibyl.title.016": "퀀텀 명리 정합",
    "sibyl.title.017": "CH.01 시빌라 코어 매트릭스",
    "sibyl.title.018": "CH.02 위험 계수 정밀 분석",
    "sibyl.title.019": "CH.03 적성 계수 정밀 분석",
    "sibyl.title.020": "CH.04 주도 십성과 행동 패턴",
    "sibyl.title.021": "CH.05 오행 밸런스와 에너지 설계",
    "sibyl.title.022": "CH.06 10년 위험 계수 그래프 해설",
    "sibyl.title.023": "CH.07 월별 리스크 플래너",
    "sibyl.title.024": "CH.08 관계와 애정 패턴",
    "sibyl.title.025": "CH.09 재물과 직업 전략",
    "sibyl.title.026": "CH.10 최종 실행 가이드",
    "sibyl.title.027": "[식신 주도] 자연스러운 베풂의 관계",
    "sibyl.title.028": "[상관 주도] 도발적·자기주장 강한 관계",
    "sibyl.title.029": "[편재 주도] 확산적·통제적 대인 에너지",
    "sibyl.title.030": "[정재 주도] 신중하고 헌신적인 관계",
    "sibyl.title.031": "[편관 주도] 카리스마적·지배적 대인 구조",
    "sibyl.title.032": "[정관 주도] 원칙·책임 중심 관계",
    "sibyl.title.033": "[편인 주도] 독창적·거리감 있는 관계 패턴",
    "sibyl.title.034": "[정인 주도] 학습·지원 중심의 관계 구조",
    "sibyl.title.035": "[비견 주도] 독립적·경쟁적 대인 에너지",
    "sibyl.title.036": "[겁재 주도] 생존형·전략적 관계 패턴",
    "sibyl.title.037": "자수(子水) — 시작의 원점",
    "sibyl.title.038": "축토(丑土) — 봉인된 보고(寶庫)",
    "sibyl.title.039": "인목(寅木) — 점화의 씨앗",
    "sibyl.title.040": "묘목(卯木) — 조용한 날(刃)",
    "sibyl.title.041": "진토(辰土) — 용의 창고(水庫)",
    "sibyl.title.042": "사화(巳火) — 기폭 회로",
    "sibyl.title.043": "오화(午火) — 태양의 정점",
    "sibyl.title.044": "미토(未土) — 여름의 황혼",
    "sibyl.title.045": "신금(申金) — 냉각의 칼",
    "sibyl.title.046": "유금(酉金) — 순수한 날끝",
    "sibyl.title.047": "술토(戌土) — 화의 무덤",
    "sibyl.title.048": "해수(亥水) — 심층 회로",
    "sibyl.message.002": "결제 가격 정보가 올바르지 않습니다.",
    "sibyl.message.003": "결제가 취소되었습니다.",
    "sibyl.message.004": "원화 결제 확인이 필요합니다.",
    "sibyl.message.005": "잠금 해제 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    "sibyl.message.006": "리포트 생성 결과가 기준을 충족하지 못했습니다.",
    "sibyl.title.049": "안정 성장 모드 — 현 궤도 정밀 유지",
    "sibyl.title.050": "위험 조정 모드 — 실행 순서 재배치",
    "sibyl.title.051": "집중 재정비 모드 — 구조 리셋 필요",
  }
};

function _sibylText(key) {
  var ko = SIBYL_TEXT_TRANSLATIONS.ko[key] || '';
  try {
    if (typeof window !== 'undefined' && window && typeof window.cdTranslate === 'function') {
      return window.cdTranslate(key, {}, ko);
    }
  } catch (_) {}
  return ko || 'Translation pending';
}

  /* ── 상수 ── */
  var SIBYL_REPORT_CACHE_VERSION = '20260522-local-dominator-v1';
  var SIBYL_REPORT_CACHE_NS = 'cd_sibyl_report_cache';
  var SIBYL_FEATURE_KEY = 'premium-sibyl-dominator';
  var SIBYL_FEATURE_REASON = '시빌라 도미네이터 리포트';
  var SIBYL_MIN_PREMIUM_CHAPTER_CHARS = 300;
  var SIBYL_MIN_PREMIUM_TOTAL_CHARS = 20000;
  var SIBYL_PREMIUM_CHAPTER_META = [
    { key: 'coreMatrix', title: _sibylText("sibyl.title.001"), focus: '입력 사주·일간·지배 오행·주도 십성·핵심 점수 종합' },
    { key: 'riskAnalysis', title: _sibylText("sibyl.title.002"), focus: '위험 점수 산출 근거와 충돌·변동성 분해' },
    { key: 'aptitudeAnalysis', title: _sibylText("sibyl.title.003"), focus: '적성 요소와 성장·수익화 전략' },
    { key: 'tenGodPattern', title: _sibylText("sibyl.title.004"), focus: '주도 십성 기반 행동·관계·의사결정 패턴' },
    { key: 'elementBalance', title: _sibylText("sibyl.title.005"), focus: '오행 과부족, 보완 루틴, 환경 설계' },
    { key: 'yearlyFlow', title: _sibylText("sibyl.title.006"), focus: '연도별 위험/기회 흐름과 실행 타이밍' },
    { key: 'monthlyPlanner', title: _sibylText("sibyl.title.007"), focus: '12개월 위험/엔진/배터리 기반 월별 운영 플랜' },
    { key: 'relationship', title: _sibylText("sibyl.title.008"), focus: '관계 충돌 패턴과 파트너십 운영' },
    { key: 'moneyCareer', title: _sibylText("sibyl.title.009"), focus: '재정 운용·직업 선택·리스크 대응' },
    { key: 'finalMessage', title: _sibylText("sibyl.title.010"), focus: '핵심 결론과 7/30/90일 실행 원칙' }
  ];
  var SIBYL_PREMIUM_CHAPTER_KEYS = SIBYL_PREMIUM_CHAPTER_META.map(function(item) { return item.key; });
  var SibylState = Object.freeze({
    LOADING: 'LOADING',
    READY: 'READY',
    PROCESSING_PAYMENT: 'PROCESSING_PAYMENT',
    GENERATING_REPORT: 'GENERATING_REPORT',
    ERROR: 'ERROR'
  });
  var _sibylUiState = SibylState.LOADING;
  var _sibylLastPaidContext = null;
  // 결제 진입 병목 완화: 모달 오픈 시 받은 unlock-status/가격을 짧게 재사용해
  // 버튼 클릭 시 중복 왕복을 없앤다.
  var SIBYL_UNLOCK_STATUS_TTL_MS = 15000;
  var _sibylUnlockStatusCache = null; // { key, at, promise }
  var _sibylPricingPrefetch = null;   // { key, promise }
  var SIBYL_DEFAULT_RISK_SCORE = 45;
  var SIBYL_DEFAULT_APTITUDE_SCORE = 520;
  var SIBYL_DEFAULT_STABILITY_SCORE = 55;
  var SIBYL_DEFAULT_RELATIONSHIP_SCORE = 58;
  var SIBYL_DEFAULT_WEALTH_SCORE = 56;
  var SIBYL_DEFAULT_CAREER_SCORE = 60;
  var SIBYL_PRIMARY_TENGOD_FALLBACK = '중심 기질 분석 중';
  var SIBYL_CORE_MATRIX_FALLBACK = '사주 코어 매트릭스 데이터를 보강해 기본 분석을 재구성했습니다. 핵심 축은 유지되며, 누락 필드는 안전한 기준값으로 보정됩니다.';
  var SIBYL_FORBIDDEN_REPORT_PATTERNS = [
    /실행\s*보강\s*메모\s*R\d*/i,
    /자동\s*복구\s*생성/i,
    /핵심\s*신호를\s*바탕으로\s*현재\s*흐름을\s*구조적으로\s*해석합니다/i,
    /이번\s*해석은\s*단정\s*예언이\s*아니라/i,
    /1단계\s*실행\s*포인트/i,
    /점수\s*해석을\s*행동\s*루틴으로\s*전환하고\s*7일\s*단위로\s*점검합니다/i,
    /위험\s*계수\s*47\s*,?\s*적성\s*계수\s*608\s*기준으로\s*운영\s*강도를\s*조절합니다/i,
    /사주\s*질문\s*프롬프트\s*만들기/i,
    /결과\s*기반\s*고품질\s*질문/i,
    /생성\s*비용\s*:\s*10,?000원/i,
    /아래\s*내용을\s*AI에게\s*그대로\s*붙여넣어\s*질문해보세요/i,
    /연이의\s*편지/i
  ];
  var SIBYL_CHAPTER_CATEGORY_HINTS = {
    coreMatrix: ['입력', '지배 오행', '주도 십성', '위험 계수', '적성 계수', '신뢰도'],
    riskAnalysis: ['리스크', '오행 불균형', '십성', '충·형·파·해', '대운·세운', '월별 변동성'],
    aptitudeAnalysis: ['Career', 'Wealth', 'Execution', 'Social', 'Recovery', '적성'],
    tenGodPattern: ['주도 십성', '비견', '재성', '관성', '인성', '행동 패턴'],
    elementBalance: ['오행 분포', '지배 오행', '유리 오행', '주의 오행', '용신', '기신'],
    yearlyFlow: ['10년', '연도', '위험', '기회', '세운', '대운'],
    monthlyPlanner: ['월별', 'M01', '리스크 밴드', '포커스', '주의', '대응'],
    relationship: ['관계', '애정', '연애', '협업', '갈등', '회복'],
    moneyCareer: ['직업', '커리어', '재물', '수익', '실행 전략', '30일'],
    finalMessage: ['최종', '7일', '30일', '90일', '개운', '실전 선언문']
  };

  /* 십성 → 섹터 매핑 */
  var TENSTAR_SECTOR = {
    '식신': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: '개발자, 콘텐츠 크리에이터, 작가, 디자이너, 예술가' },
    '상관': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: '개발자, 콘텐츠 크리에이터, 작가, 디자이너, 예술가' },
    '편재': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '자산 운용, 데이터 분석, 유통망 관리, 투자 전략' },
    '정재': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '자산 운용, 회계, 재무 기획, 경영 관리' },
    '편관': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '공공기관, 대기업 관리직, 법조계, 군·경 전문직' },
    '정관': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '공무원, 대기업 임원, 법률 전문가, 교육 행정' },
    '편인': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '연구원, 기획자, 전문 상담가, 전략 분석가' },
    '정인': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '교수, 연구원, 컨설턴트, 심리 상담사, 전략가' },
    '비견': { sector: 'INDEPENDENCE FORCE', eng: 'Independence Force', jobs: '1인 기업, 창업자, 독립 컨설턴트, 자영업자' },
    '겁재': { sector: 'COMPETITION SECTOR', eng: 'Competition Sector', jobs: '스포츠, 경쟁 산업, 영업·마케팅, 중개업' }
  };

  /* 오행 인덱스 */
  var EL_ORDER = ['wood','fire','earth','metal','water'];
  var EL_KR = { wood:'목(木)', fire:'화(火)', earth:'토(土)', metal:'금(金)', water:'수(水)' };
  var EL_BALANCE_LABEL = { wood:'목', fire:'화', earth:'토', metal:'금', water:'수' };
  var EL_COLOR = { wood:'#39ff14', fire:'#ff6a00', earth:'#ffd700', metal:'#c8e0ff', water:'#00bfff' };
  var EL_DESTINY_HUE = {
    wood:  { name:'제이드 그린 (Jade Green)',   hex:'#39ff14', status:'clear' },
    fire:  { name:'카이버 레드 (Khyber Red)',    hex:'#ff4500', status:'varied' },
    earth: { name:'골든 카멜 (Golden Camel)',    hex:'#ffd700', status:'varied' },
    metal: { name:'아크틱 실버 (Arctic Silver)', hex:'#b0c8e0', status:'clear' },
    water: { name:'딥 오션 블루 (Deep Ocean Blue)', hex:'#00bfff', status:'clear' }
  };

  function _isSibylDevMode() {
    try {
      if (window && window.__CD_ENV && String(window.__CD_ENV).toLowerCase() === 'development') return true;
    } catch (_) {}
    try {
      var host = String(window.location && window.location.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    } catch (_) {}
    return false;
  }

  function _sibylDevDebug(label, payload) {
    if (!_isSibylDevMode() || typeof console === 'undefined' || typeof console.debug !== 'function') return;
    console.debug(label, payload);
  }

  function _sibylDevWarn(label, payload) {
    if (!_isSibylDevMode() || typeof console === 'undefined' || typeof console.warn !== 'function') return;
    console.warn(label, payload);
  }

  function _sibylLogInfo(label, payload) {
    if (typeof console === 'undefined' || typeof console.info !== 'function') return;
    console.info(label, payload);
  }

  function _sibylLogWarn(label, payload) {
    if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
    console.warn(label, payload);
  }

  function _sibylLogError(label, error) {
    if (typeof console === 'undefined' || typeof console.error !== 'function') return;
    console.error(label, error);
  }

  function _safeText(value, fallback) {
    var text = String(value == null ? '' : value).trim();
    return text || String(fallback || '').trim();
  }

  function _safeScore(value, fallback, min, max) {
    var num = Number(value);
    if (!Number.isFinite(num)) num = Number(fallback);
    if (!Number.isFinite(num)) num = 0;
    return _clamp(Math.round(num), Number(min), Number(max));
  }

  /* 비겁 과다 임계 */
  var BIJAB_WARN_THRESHOLD = 3;

  /* ── 일간별 타고난 기질 데이터 ── */
  var DAYGAN_NATURE = {
    '甲': { name:'갑목(甲木)', type:'직진 리더형',
      nature:'큰 나무처럼 위로만 성장하려는 기질을 타고났습니다. 강한 목표 의식과 선구자 정신이 두드러지며, 한번 방향을 잡으면 거침없이 나아가는 돌파력이 있습니다. 조직 내에서 자연스럽게 리더 역할을 맡게 되나, 유연성 부족으로 신중한 협상이나 우회 전략에서 약점이 드러납니다.',
      strength:'개척·창업·오피니언 리더·기획 총괄·비전 제시',
      weakness:'고집으로 인한 팀 갈등, 단기 이익 무시, 타협 거부로 기회 상실',
      career:'창업자, CEO, 정치인, 스포츠 감독, 건축가, 대형 프로젝트 디렉터' },
    '乙': { name:'을목(乙木)', type:'유연 전략형',
      nature:'덩굴처럼 어떤 환경에서도 살아남는 적응력과 인내력을 타고났습니다. 직접 충돌보다 측면 우회와 인맥 활용을 통해 원하는 결과를 얻어내는 전략적 본능이 있습니다. 감성 지능이 높아 인간관계에서 강점을 발휘하나, 우유부단함과 의존성이 결정적 순간에 발목을 잡을 수 있습니다.',
      strength:'관계 구축·협상·마케팅·외교·문화 기획·예술 경영',
      weakness:'결단 지연, 주도권 회피, 강자에 대한 지나친 의존',
      career:'외교관, 마케터, 상담사, 예술가, 중재인, PR 전문가' },
    '丙': { name:'병화(丙火)', type:'열정 확산형',
      nature:'태양처럼 주변 전체를 밝히려는 에너지가 넘칩니다. 명확한 비전과 폭발적인 에너지로 그룹 전체에 동기를 부여하는 천부적 자질을 가지고 있습니다. 너무 많은 프로젝트에 동시에 에너지를 분산시켜 완료율이 낮아지거나, 지나친 자기 과신으로 리스크 관리에 실패하는 패턴이 반복됩니다.',
      strength:'리더십·동기부여·대규모 기획·미디어·퍼포먼스',
      weakness:'에너지 분산, 실행력 약화, 번아웃, 리스크 과소평가',
      career:'이벤트 기획자, 배우, 강연가, 영업 총괄, 엔터테인먼트 PD' },
    '丁': { name:'정화(丁火)', type:'정밀 집중형',
      nature:'촛불처럼 작지만 정확한 지점을 깊이 파고드는 집중력이 탁월합니다. 넓게 퍼지기보다 특정 분야에 올인하는 성향이며, 심층 분석과 장인 정신이 두드러집니다. 자신의 전문 영역 밖에서는 자신감이 급격히 하락하고, 번아웃 이후 회복이 느린 것이 구조적 약점입니다.',
      strength:'전문화·연구개발·데이터 분석·정밀 기술·예술 장인',
      weakness:'시야 협소, 외부 피드백 거부, 번아웃 후 슬럼프',
      career:'연구원, 외과의사, 장인, 데이터 사이언티스트, 성악가, 심리치료사' },
    '戊': { name:'무토(戊土)', type:'안정 수용형',
      nature:'큰 산처럼 변동 없이 주변을 지탱하는 안정감과 포용력이 특징입니다. 조직의 실질적인 허리 역할을 수행하며, 위기 상황에서 침착함을 유지하는 능력이 뛰어납니다. 변화에 대한 저항감이 강해 디지털 전환이나 빠른 시장 변화에 뒤처지는 위험이 있으며, 결단력 부족이 성장의 상한선을 만들 수 있습니다.',
      strength:'조직 관리·재무 안정·부동산·장기 투자·전통 산업',
      weakness:'변화 저항, 보수적 판단, 혁신 기회 상실',
      career:'관리자, 부동산업, 공무원, 금융 관리직, 전통 제조업' },
    '己': { name:'기토(己土)', type:'세밀 관리형',
      nature:'경작지처럼 세밀하게 일을 다듬고 완성하는 꼼꼼함이 두드러집니다. 높은 기준과 완성도 추구로 품질에서 강점을 발휘하나, 완벽주의가 지연과 인간관계 마찰을 유발합니다. 내향적 성향으로 자기 PR에 약해 능력 대비 저평가 받을 가능성이 구조적으로 내재합니다.',
      strength:'품질 관리·편집·감사·교육·데이터 정리·세부 기획',
      weakness:'완벽주의로 인한 번아웃, 자기 PR 약함, 결정 지연',
      career:'에디터, 회계사, 감사관, 교사, QA 전문가, 가이드' },
    '庚': { name:'경금(庚金)', type:'단칠 결단형',
      nature:'강철처럼 단단한 의지와 즉각적인 결단력이 특징입니다. 복잡한 상황도 단순화하여 신속히 처리하는 능력이 매우 뛰어나며, 원칙과 규율을 중시합니다. 타인의 감정을 충분히 배려하지 않는 날카로운 직설 화법이 불필요한 적대 관계를 형성하고, 유연성 부족이 협력 기반 업무에서 마찰을 일으킵니다.',
      strength:'단호한 결단·구조 개혁·법집행·경쟁 산업',
      weakness:'감성 지능 부족, 대인 마찰, 협업 기피, 반감 축적',
      career:'군인, 경찰, 법률가, 운동선수, 구조조정 전문가, 외과의사' },
    '辛': { name:'신금(辛金)', type:'정밀 심미형',
      nature:'보석처럼 날카로운 심미안과 정제된 취향을 가지고 있습니다. 외형적 완성도와 세련미에 탁월한 감각이 있으며, 감지력과 분석력이 매우 예리합니다. 타인의 시선에 지나치게 민감하여 비판에 상처받기 쉽고, 자존심 보호를 위해 솔직한 피드백 요청을 회피하는 경향이 반복적인 성장 정체를 만듭니다.',
      strength:'디자인·미학·패션·심미적 품질·정밀 분석·심리 통찰',
      weakness:'비판에 과민, 자존심으로 인한 학습 차단, 완벽주의 지연',
      career:'디자이너, 심리상담사, 보석 전문가, 성형외과 전문의, 큐레이터, 패션 디렉터' },
    '壬': { name:'임수(壬水)', type:'유동 지략형',
      nature:'큰 강처럼 상황에 따라 방향을 바꾸는 지략과 응용력이 특출합니다. 빠른 상황 판단과 핵심 파악 능력이 있으며, 다양한 분야를 넘나드는 크로스오버 역량이 강점입니다. 깊이 없이 표면만 훑고 다음으로 넘어가는 패턴이 한 분야에서의 전문성 구축을 방해하며, 산만함이 장기 프로젝트 완성에 걸림돌이 됩니다.',
      strength:'전략 기획·다분야 컨설팅·무역·미디어·네트워킹',
      weakness:'일관성 부족, 집중력 분산, 전문성 결여로 파트너 신뢰 약화',
      career:'전략 컨설턴트, 무역업, 저널리스트, 외교관, 투자 분석가' },
    '癸': { name:'계수(癸水)', type:'심층 통찰형',
      nature:'이슬처럼 소리 없이 침투하는 직관과 심층 통찰력이 특징입니다. 겉으로 드러나지 않는 내면의 진실을 감지하는 능력이 매우 뛰어나며, 섬세한 감수성으로 예술·치유·연구 분야에서 두각을 나타냅니다. 자기 노출을 꺼리는 내향성이 기회 어필을 방해하며, 지나친 수동성이 능력에 비해 낮은 사회적 위치로 이어지는 위험이 있습니다.',
      strength:'심리 분석·연구·예술 창작·치유·비밀 정보 관리',
      weakness:'수동적 관계, 기회 어필 미흡, 감정 소진, 과도한 내향성',
      career:'심리상담사, 작가, 순수 예술가, 연구원, 의료인, 영성 지도자' }
  };

  /* ── 십성별 심층 직업 성향 ── */
  var TENSTAR_NATURE = {
    '식신': { profile:'식신(食神)이 주도하는 명식입니다. 창의적 표현 욕구가 강하며 타인에게 풍요를 베푸는 에너지가 작동합니다.',
      pro:'창의적 발상과 실행력이 결합된 타입으로 아이디어를 수익으로 전환하는 능력이 있습니다. 일을 즐기면서 하는 성향으로 번아웃 내성이 상대적으로 높습니다.',
      con:'이상이 높아 현실적 제약을 무시하고 리스크를 과소평가하는 경향이 있습니다. 창작·표현에 치우쳐 관리·통제 영역에서 조직 마찰이 생깁니다.' },
    '상관': { profile:'상관(傷官)이 주도하는 명식입니다. 기존 규칙과 권위에 도전하는 에너지가 강하며 독창적 접근으로 시장을 흔드는 잠재력이 있습니다.',
      pro:'탁월한 언변과 아이디어로 대중을 설득하는 능력이 있으며, 관행을 파괴하는 혁신 역량이 뛰어납니다.',
      con:'상사나 조직 규율에 대한 반발이 잦아 직장 내 갈등이 구조적으로 발생합니다. 충동적 발언이 관계를 돌이킬 수 없이 훼손할 수 있습니다.' },
    '편재': { profile:'편재(偏財)가 주도하는 명식입니다. 빠른 시장 감지와 투기적 행동력이 특징으로, 기회를 포착해 단기에 수익화하는 에너지가 강합니다.',
      pro:'빠른 판단력과 영업력, 다양한 분야에서 돈의 흐름을 감지하는 능력이 탁월합니다.',
      con:'장기 일관성이 약하며 리스크 과다 노출로 인한 큰 손실 경험이 내재합니다. 타인 통제 욕구가 분쟁을 야기합니다.' },
    '정재': { profile:'정재(正財)가 주도하는 명식입니다. 안정적 축재와 현실 원칙에 입각한 재물 관리가 강점입니다.',
      pro:'성실함과 원칙 준수로 꾸준한 성과를 쌓으며, 재물에 대한 현실적 관리 능력이 우수합니다.',
      con:'지나친 안전 지향으로 고수익 기회를 스스로 차단하는 패턴이 나타납니다. 변화 저항이 시공(市空)을 놓치게 합니다.' },
    '편관': { profile:'편관(偏官)이 주도하는 명식입니다. 극한 압박에도 굴하지 않는 강철 멘탈과 리더십 카리스마가 두드러집니다.',
      pro:'위기 상황에서 빛나는 결단력과 통솔력이 있으며, 규율·권위 기반 조직에서 최상위 성과를 냅니다.',
      con:'과도한 긴장 지속으로 심신 소진이 빠르게 옵니다. 권위에 대한 과민 반응이 불필요한 대립을 만듭니다.' },
    '정관': { profile:'정관(正官)이 주도하는 명식입니다. 원칙·절차·체계를 중시하며 공식적인 권위 구조에서 두각을 나타내는 에너지입니다.',
      pro:'신뢰성과 책임감이 높아 장기적으로 사회적 위상을 쌓는 데 유리합니다. 규정 내에서 탁월한 실행 능력을 발휘합니다.',
      con:'지나친 완벽주의와 완고한 원칙주의가 유연한 대처를 방해하여 변화가 빠른 환경에서 뒤처질 수 있습니다.' },
    '편인': { profile:'편인(偏印)이 주도하는 명식입니다. 비선형적 사고와 독창적 학습 방식이 강점이며, 직관과 영감이 주된 에너지원입니다.',
      pro:'기존 지식을 독특한 방식으로 재조합하는 창의적 문제해결 능력이 있으며, 예술·심리·연구 분야에서 남다른 통찰을 발휘합니다.',
      con:'집중력이 일관되지 않아 중도 이탈이 잦고, 현실적 실행보다 이상적 구상에 머무는 시간이 과도합니다.' },
    '정인': { profile:'정인(正印)이 주도하는 명식입니다. 체계적 학습과 지식 축적에 천부적 자질이 있으며, 전문성을 사회적 권위로 전환하는 에너지가 강합니다.',
      pro:'깊이 있는 지식과 논리적 체계성이 강점이며, 교육·연구·상담 분야에서 장기적인 신뢰를 구축합니다.',
      con:'학습에 과도하게 안주하여 실전 경험 부족으로 이어질 수 있습니다. 새로운 환경 적응 속도가 느립니다.' },
    '비견': { profile:'비견(比肩)이 주도하는 명식입니다. 독립적 정체성과 자립 에너지가 매우 강하며, 스스로의 힘으로 세상을 개척하려는 욕구가 뚜렷합니다.',
      pro:'자기 주도성과 독립적 실행력이 탁월하여 1인 기업·프리랜서·자영업에서 강점을 발휘합니다.',
      con:'협력 기피와 독단적 판단이 불필요한 고립을 만들며, 재물에 대한 무관심이 경제적 불안정으로 이어질 수 있습니다.' },
    '겁재': { profile:'겁재(劫財)가 주도하는 명식입니다. 경쟁에서 살아남는 강렬한 생존 에너지와 추진력이 두드러집니다.',
      pro:'극한 경쟁 환경에서 오히려 역량이 폭발하며, 영업·스포츠·투기적 사업에서 뛰어난 성과를 냅니다.',
      con:'경쟁이 기본값이 되어 파트너십을 필요로 하는 분야에서 반복적으로 실패합니다. 감정 기복이 판단력을 흐립니다.' }
  };

  /* 천간 / 지지 십성 계산 보조 */
  var GAN_EL = {
    '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth',
    '己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water'
  };
  var JI_EL = {
    '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth','巳':'fire',
    '午':'fire','未':'earth','申':'metal','酉':'metal','戌':'earth','亥':'water'
  };
  var POLARITY_YIN  = ['乙','丁','己','辛','癸'];
  var EL_CYCLE = ['wood','fire','earth','metal','water'];

  /* 십성 계산 */
  function _calcTenStar(dayGan, targetChar) {
    var dayEl = GAN_EL[dayGan];
    var tEl   = GAN_EL[targetChar] || JI_EL[targetChar];
    if (!dayEl || !tEl) return null;
    var dayIdx = EL_CYCLE.indexOf(dayEl);
    var tIdx   = EL_CYCLE.indexOf(tEl);
    var diff   = (tIdx - dayIdx + 5) % 5;
    var daySame = POLARITY_YIN.indexOf(dayGan) >= 0;
    var tSame   = POLARITY_YIN.indexOf(targetChar) >= 0;
    var samePol = (daySame === tSame);
    if (diff === 0) return samePol ? '비견' : '겁재';
    if (diff === 1) return samePol ? '식신' : '상관';
    if (diff === 2) return samePol ? '편재' : '정재';
    if (diff === 3) return samePol ? '편관' : '정관';
    if (diff === 4) return samePol ? '편인' : '정인';
    return null;
  }

  /* 현재 프로필 읽기 */
  function _getCurrentProfile() {
    try {
      var p = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
        || window.__cdCurrentDestinyProfile
        || null;
      if (p && (!p.birth || !p.birth.year)) p = null;
      return p;
    } catch(e) { return null; }
  }

  function _normalizePillarsShape(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var src = raw;
    if (src.year && !src.y) {
      src = {
        y: { g: src.year && src.year.g, j: src.year && src.year.j },
        m: { g: src.month && src.month.g, j: src.month && src.month.j },
        d: { g: src.day && src.day.g, j: src.day && src.day.j },
        h: { g: src.hour && src.hour.g, j: src.hour && src.hour.j }
      };
    }

    var out = {
      y: Object.assign({}, src.y || {}),
      m: Object.assign({}, src.m || {}),
      d: Object.assign({}, src.d || {}),
      h: Object.assign({}, src.h || {})
    };

    var hasAny = !!(
      out.y.g || out.y.j || out.m.g || out.m.j || out.d.g || out.d.j || out.h.g || out.h.j
    );
    return hasAny ? out : null;
  }

  function _ensurePillarsWithProfileFallback(rawPillars, profile) {
    var normalized = _normalizePillarsShape(rawPillars) || _normalizePillarsShape(window.G_PILLARS || null);

    var hasCore = !!(normalized && normalized.y && normalized.y.g && normalized.y.j && normalized.m && normalized.m.g && normalized.m.j && normalized.d && normalized.d.g && normalized.d.j);
    var hasHour = !!(normalized && normalized.h && normalized.h.g && normalized.h.j);
    if (hasCore && hasHour) return normalized;

    if (profile && profile.birth && typeof window.computeProfileForModal === 'function') {
      try {
        var computed = window.computeProfileForModal(profile);
        var recomputed = _normalizePillarsShape((computed && computed.p) || window.G_PILLARS || null);
        if (recomputed && recomputed.d && recomputed.d.g && recomputed.d.j) {
          return recomputed;
        }
      } catch (_) {}
    }

    return normalized;
  }

  function _pillarChars(p) {
    var pp = _normalizePillarsShape(p) || { y: {}, m: {}, d: {}, h: {} };
    return {
      y: pp.y || {},
      m: pp.m || {},
      d: pp.d || {},
      h: pp.h || {}
    };
  }

  function _sibylHash(text) {
    var src = String(text || '');
    var hash = 2166136261;
    for (var i = 0; i < src.length; i += 1) {
      hash ^= src.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function _sibylStableProfileCacheScope(profile) {
    if (!profile || !profile.birth) return '';
    var b = profile.birth || {};
    return [
      b.year || '', b.month || '', b.day || '', b.hour || '', b.minute || '',
      profile.gender || ''
    ].join('|');
  }

  function _sibylLegacyProfileCacheScope(profile) {
    if (!profile || !profile.birth) return '';
    var b = profile.birth || {};
    return [
      profile.id || '',
      b.year || '', b.month || '', b.day || '', b.hour || '', b.minute || '',
      profile.gender || ''
    ].join('|');
  }

  function _sibylProfileCacheKey(profile) {
    var scope = _sibylStableProfileCacheScope(profile);
    return scope ? SIBYL_REPORT_CACHE_NS + ':' + _sibylHash(scope) : '';
  }

  function _sibylLegacyProfileCacheKey(profile) {
    var scope = _sibylLegacyProfileCacheScope(profile);
    return scope ? SIBYL_REPORT_CACHE_NS + ':' + _sibylHash(scope) : '';
  }

  function _sibylProfileCacheKeyCandidates(profile) {
    var keys = [
      _sibylProfileCacheKey(profile),
      _sibylLegacyProfileCacheKey(profile)
    ].filter(Boolean);
    return keys.filter(function(key, idx) { return keys.indexOf(key) === idx; });
  }

  function _readSibylCachedReportByKey(key) {
    if (!key) return null;
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      // Keep previously generated reports accessible even after cache version bumps.
      if (parsed.version && parsed.version !== SIBYL_REPORT_CACHE_VERSION) {
        _sibylLogWarn('[SIBYL] cache version mismatch, using legacy payload if valid', {
          cachedVersion: String(parsed.version || ''),
          expectedVersion: SIBYL_REPORT_CACHE_VERSION
        });
      }
      if (!parsed.reportData || !Array.isArray(parsed.reportData.chapters) || !parsed.reportData.chapters.length) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function _loadSibylCachedReport(profile) {
    var keys = _sibylProfileCacheKeyCandidates(profile);
    for (var i = 0; i < keys.length; i += 1) {
      var cached = _readSibylCachedReportByKey(keys[i]);
      if (cached) return cached;
    }
    return null;
  }

  function _saveSibylCachedReport(profile, reportData, analysisData) {
    var key = _sibylProfileCacheKey(profile);
    if (!key || !reportData || !Array.isArray(reportData.chapters) || !reportData.chapters.length) return false;
    var payload = {
      version: SIBYL_REPORT_CACHE_VERSION,
      savedAt: Date.now(),
      reportData: {
        source: reportData.source || 'gemini',
        model: reportData.model || '',
        totalChars: Number(reportData.totalChars || 0),
        minTotalChars: Number(reportData.minTotalChars || 0),
        chapterMap: reportData.chapterMap && typeof reportData.chapterMap === 'object' ? reportData.chapterMap : null,
        chapters: reportData.chapters,
        canonicalData: reportData.canonicalData || null,
        monthlyRiskPlan: reportData.monthlyRiskPlan || null,
        annualRiskPlan: reportData.annualRiskPlan || null,
        riskBreakdown: reportData.riskBreakdown || null,
        aptitudeComponents: reportData.aptitudeComponents || null,
        quantumDiagnostics: reportData.quantumDiagnostics || null,
        categoryMatrix: reportData.categoryMatrix || null
      },
      analysisData: {
        pillars: analysisData && analysisData.pillars ? analysisData.pillars : null,
        domEl: analysisData && analysisData.domEl,
        dominant: analysisData && analysisData.dominant,
        coeff: analysisData && analysisData.coeff,
        risk: analysisData && analysisData.risk
      }
    };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (_) {
      return false;
    }
  }

  function _syncSibylUnlockButton(profile, unlockStatus) {
    var btn = _q('sbUnlockBtn');
    if (!btn) return;
    var cached = _loadSibylCachedReport(profile);
    if (cached) {
      btn.textContent = '⚡ 저장된 DOMINATOR 리포트 열기';
      btn.disabled = false;
      return;
    }

    if (unlockStatus && unlockStatus.ok) {
      if (unlockStatus.unlocked) {
        btn.textContent = '⚡ 저장된 DOMINATOR 리포트 열기';
        btn.disabled = false;
        return;
      }
      btn.textContent = '⚡ EXECUTE DOMINATOR — 10,000원';
      btn.disabled = false;
      return;
    }

    btn.textContent = '⚡ EXECUTE DOMINATOR — 10,000원';
    btn.disabled = false;
  }

  function _openCachedDominatorReport(profile, fallbackAnalysis) {
    var cached = _loadSibylCachedReport(profile);
    if (!cached || !cached.reportData) return false;

    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.add('sb-hidden');
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');

    var analysis = cached.analysisData || fallbackAnalysis || {};
    var canonicalData = (cached.reportData && cached.reportData.canonicalData)
      || (analysis && analysis.canonicalData)
      || null;
    var shaped = _shapeSibylPremiumReport(cached.reportData, canonicalData);
    var validation = _validateSibylPremiumChapterMap(shaped && shaped.chapterMap);
    if (!validation.ok) return false;

    _renderDominatorReport(shaped, analysis);
    _saveSibylCachedReport(profile, shaped, analysis);
    return true;
  }

  async function _openCachedDominatorReportIfUnlocked(profile, fallbackAnalysis) {
    if (_openCachedDominatorReport(profile, fallbackAnalysis)) {
      _syncSibylUnlockButton(profile, { ok: true, unlocked: true });
      if (!_isAdminBypassUser()) {
        _resolveSibylUnlockStatus(profile).then(function(unlockStatus) {
          _syncSibylUnlockButton(profile, unlockStatus);
        }).catch(function(err) {
          _sibylLogWarn('[SIBYL] unlock-state post-cache check failed', {
            code: String(err && err.code || ''),
            message: String(err && err.message || '')
          });
        });
      }
      return true;
    }

    if (_isAdminBypassUser()) return false;

    var unlockStatus = await _resolveSibylUnlockStatus(profile);
    _syncSibylUnlockButton(profile, unlockStatus);
    if (!(unlockStatus && unlockStatus.ok && unlockStatus.unlocked)) return false;
    return _openCachedDominatorReport(profile, fallbackAnalysis);
  }

  /* G_PILLARS → 십성 카운트 */
  function _analyzeTenStars(p) {
    var ps = _pillarChars(p);
    if (!ps.d || !ps.d.g) return {};
    var dayGan = ps.d.g;
    var chars = [ps.y.g, ps.y.j, ps.m.g, ps.m.j, ps.d.j, ps.h.g, ps.h.j];
    // 일지(日支)도 포함, 월지 지장간은 단순화 — 지지 자체만 사용
    var counts = {};
    chars.forEach(function(c) {
      var ts = _calcTenStar(dayGan, c);
      if (ts) counts[ts] = (counts[ts] || 0) + 1;
    });
    return counts;
  }

  /* 주도 십성 (가장 많은 것) */
  function _dominantTenStar(counts) {
    var best = null, bestN = 0;
    Object.keys(counts).forEach(function(k) {
      if (counts[k] > bestN) { bestN = counts[k]; best = k; }
    });
    return best || '중립';
  }

  /* 비겁 카운트 */
  function _bijabCount(counts) {
    return (counts['비견']||0) + (counts['겁재']||0);
  }

  function _clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function _createRequestId(prefix) {
    return String(prefix || 'sibyl') + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 10);
  }

  function _buildApiCandidates(path) {
    var normalizedPath = String(path || '/').trim();
    if (normalizedPath.charAt(0) !== '/') normalizedPath = '/' + normalizedPath;

    var seen = Object.create(null);
    var out = [];
    function push(raw) {
      var value = String(raw || '').trim();
      if (!value || seen[value]) return;
      seen[value] = true;
      out.push(value);
    }

    push(normalizedPath);
    try {
      if (window && window.__CD_API_BASE_URL) {
        push(String(window.__CD_API_BASE_URL).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    try {
      if (window && window.CODE_DESTINY_API_BASE_URL) {
        push(String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    try {
      if (window && window.__CF_PAGES_API_BASE_URL) {
        push(String(window.__CF_PAGES_API_BASE_URL).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    try {
      var customBase = localStorage.getItem('fortune_api_base_url');
      if (customBase) push(String(customBase).replace(/\/+$/, '') + normalizedPath);
    } catch (_) {}
    try {
      if (window && window.location && window.location.origin) {
        push(String(window.location.origin).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    return out;
  }

  async function _fetchApiJson(path, options) {
    var candidates = _buildApiCandidates(path);
    var init = Object.assign({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {}
    }, options || {});
    var timeoutMs = Math.max(1000, Number(init && init.timeoutMs || 12000));
    delete init.timeoutMs;
    init.headers = Object.assign({}, init.headers || {});

    if (init.body && !init.headers['Content-Type']) {
      init.headers['Content-Type'] = 'application/json';
    }

    var lastResult = null;
    for (var i = 0; i < candidates.length; i += 1) {
      var url = candidates[i];
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function() {
        if (controller) {
          try { controller.abort(); } catch (_) {}
        }
      }, timeoutMs);
      if (controller) init.signal = controller.signal;
      try {
        var res = await fetch(url, init);
        var payload = {};
        try { payload = await res.clone().json(); } catch (_) { payload = {}; }
        var result = {
          ok: res.ok,
          status: res.status,
          payload: payload,
          url: url
        };
        if (res.ok) return result;
        lastResult = result;
        if (res.status !== 404) return result;
      } catch (error) {
        var message = String(error && error.message || 'network-error');
        var isAbort = String(error && error.name || '').toLowerCase() === 'aborterror';
        lastResult = {
          ok: false,
          status: 0,
          payload: { error: { code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR', message: isAbort ? ('request-timeout-' + timeoutMs + 'ms') : message } },
          url: url
        };
      } finally {
        clearTimeout(timer);
      }
    }

    return lastResult || {
      ok: false,
      status: 0,
      payload: { error: { code: 'NETWORK_ERROR', message: _sibylText("sibyl.message.001") } },
      url: String(path || '')
    };
  }

  function _extractApiData(payload) {
    if (!payload || typeof payload !== 'object') return {};
    if (payload.data && typeof payload.data === 'object') return payload.data;
    return payload;
  }

  function _safeErrorMessage(responseLike) {
    var payload = responseLike && responseLike.payload;
    if (!payload || typeof payload !== 'object') return '';
    if (payload.error && typeof payload.error.message === 'string') return payload.error.message.trim();
    if (typeof payload.message === 'string') return payload.message.trim();
    return '';
  }

  function _toFriendlySibylErrorMessage(error, fallback) {
    var code = String(error && error.code || '').toUpperCase();
    var status = Number(error && error.status || 0);
    var msg = String(error && error.message || '').toLowerCase();

    if (code === 'AUTH_REQUIRED' || code === 'UNAUTHORIZED' || status === 401 || status === 403) {
      return '로그인이 필요합니다. 로그인 후 다시 시도해 주세요.';
    }
    if (code === 'INSUFFICIENT_BALANCE' || msg.indexOf('insufficient') >= 0) {
      return '원화 결제 확인이 필요합니다. 결제 후 다시 시도해 주세요.';
    }
    if (code === 'PRICE_NOT_FOUND' || code === 'UNKNOWN_FEATURE_KEY') {
      return '결제 가격 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code === 'NETWORK_ERROR' || status === 0) {
      return '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.';
    }
    return fallback || '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function _setSibylErrorMessage(text) {
    var errMsg = _q('sbErrorMsg');
    if (!errMsg) return;
    errMsg.textContent = text || '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function _setSibylState(nextState, message) {
    _sibylUiState = nextState;
    var genEl = _q('sbGenerating');
    var errEl = _q('sbErrorState');
    var statusEl = _q('sbGenStatus');

    if (nextState === SibylState.ERROR) {
      if (genEl) genEl.classList.add('sb-hidden');
      if (errEl) errEl.classList.remove('sb-hidden');
      _setSibylErrorMessage(message || '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (errEl) errEl.classList.add('sb-hidden');

    if (nextState === SibylState.GENERATING_REPORT) {
      if (genEl) genEl.classList.remove('sb-hidden');
      if (statusEl) statusEl.textContent = message || '>> 시빌라 리포트를 생성하는 중입니다…';
      return;
    }

    if (nextState === SibylState.PROCESSING_PAYMENT) {
      if (genEl) genEl.classList.add('sb-hidden');
      if (statusEl) statusEl.textContent = message || '>> 결제 상태를 확인하는 중입니다…';
      return;
    }

    if (nextState === SibylState.READY) {
      if (genEl) genEl.classList.add('sb-hidden');
      return;
    }

    if (nextState === SibylState.LOADING) {
      if (genEl) genEl.classList.add('sb-hidden');
    }
  }

  function _mean(nums) {
    if (!Array.isArray(nums) || !nums.length) return 0;
    return nums.reduce(function(sum, n) { return sum + Number(n || 0); }, 0) / nums.length;
  }

  function _stddev(nums) {
    if (!Array.isArray(nums) || nums.length < 2) return 0;
    var mu = _mean(nums);
    var variance = nums.reduce(function(sum, n) {
      var v = Number(n || 0) - mu;
      return sum + (v * v);
    }, 0) / nums.length;
    return Math.sqrt(variance);
  }

  function _profileAge(profile) {
    try {
      var p = profile || _getCurrentProfile() || {};
      var b = p.birth || {};
      var y = Number(b.year || 0);
      if (!Number.isFinite(y) || y < 1900) return 30;
      var now = new Date();
      var age = now.getFullYear() - y + 1;
      return _clamp(Math.round(age), 1, 120);
    } catch (_) {
      return 30;
    }
  }

  function _evalDaewunBridge(gan, zhi) {
    try {
      if (!gan || !zhi) throw new Error('invalid-ganzhi');
      var fn = (typeof window.evalDaewun === 'function')
        ? window.evalDaewun
        : (typeof evalDaewun === 'function' ? evalDaewun : null);
      if (!fn) throw new Error('evalDaewun-unavailable');
      var ev = fn(gan, zhi) || {};
      var score = Number(ev.score);
      if (!Number.isFinite(score)) score = 50;
      var normalizedScore = _clamp(Math.round(score), 0, 100);
      return {
        score: normalizedScore,
        label: ev.label || (normalizedScore >= 70 ? '호조' : normalizedScore >= 45 ? '무난' : '경계'),
        cls: ev.cls || 'neutral',
        evalSummary: ev.evalSummary || (gan + zhi + ' 기운을 기본 리스크 스코어로 반영했습니다.'),
        hasChungBonus: !!ev.hasChungBonus,
        hasChungPenalty: !!ev.hasChungPenalty
      };
    } catch (err) {
      console.warn('[Sibyl] evalDaewun bridge fallback:', err && err.message ? err.message : err);
      return {
        score: 50,
        label: _sibylText("sibyl.label.001"),
        cls: 'neutral',
        evalSummary: String(gan || '') + String(zhi || '') + ' 기준 기본 스코어(50)로 보정했습니다.',
        hasChungBonus: false,
        hasChungPenalty: false
      };
    }
  }

  function _normalizeGanZhiPair(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      if (value.length >= 2) return { g: value.charAt(0), j: value.charAt(1) };
      return null;
    }
    if (typeof value === 'object') {
      var g = value.g || value.gan || value[0];
      var j = value.j || value.zhi || value[1];
      if (g && j) return { g: String(g), j: String(j) };
    }
    return null;
  }

  function _getMonthGanZhiFor(year, month) {
    try {
      if (typeof window.getMonthGanZhi === 'function') {
        var fromFn = _normalizeGanZhiPair(window.getMonthGanZhi(year, month));
        if (fromFn) return fromFn;
      }
    } catch (_) {}
    /* 위 getMonthGanZhi(사주 엔진)가 없을 때의 폴백. 🔴 예전에는 lunar-javascript EightChar 이었는데
       그것은 중국 표준시(UTC+8) 기준이라 절기가 CST 23시대에 든 해에서 월건 경계가 하루 어긋난다.
       한국 음양력 코어는 사주 엔진이 쓰는 것과 같은 KST 절기표라 두 경로의 답이 같아진다.
       근거: docs/handoff/korean-calendar-migration-2026-08-27.md */
    try {
      var core = (typeof window !== 'undefined' && window.KoreanCalendar) || null;
      if (core && typeof core.ganji === 'function') {
        var gz = core.ganji({ year: year, month: month, day: 15, hour: 12, minute: 0 });
        if (gz) return { g: core.STEM_HANJA[gz.month.stemIndex], j: core.BRANCH_HANJA[gz.month.branchIndex] };
      }
    } catch (_) {}

    var monthZhi = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
    var yz = monthZhi[(month - 1 + 12) % 12];
    var ygz = _getYearGanZhi(year);
    return { g: ygz.gan, j: yz };
  }

  function _analyzeFortuneBridge(gz, pillars, label) {
    var pair = _normalizeGanZhiPair(gz) || { g: '', j: '' };
    var pillarChars = _pillarChars(pillars);
    var dayGan = pillarChars && pillarChars.d && pillarChars.d.g;
    var fallbackGGod = (dayGan && pair.g) ? (_calcTenStar(dayGan, pair.g) || '중립') : '중립';
    var fallbackJGod = (dayGan && pair.j) ? (_calcTenStar(dayGan, pair.j) || '중립') : '중립';

    try {
      if (!pair) throw new Error('invalid-gz');
      var fn = (typeof window.analyzeFortuneGZ === 'function')
        ? window.analyzeFortuneGZ
        : (typeof analyzeFortuneGZ === 'function' ? analyzeFortuneGZ : null);
      if (!fn) throw new Error('analyzeFortuneGZ-unavailable');
      var res = fn(pair, pillars, label || '시빌라 월운') || {};
      var battery = Number.isFinite(Number(res.batteryPercent)) ? _clamp(Math.round(Number(res.batteryPercent)), 0, 100) : 50;
      return {
        grade: res.grade || (battery >= 70 ? '호조' : battery >= 45 ? '무난' : '경계'),
        icon: res.icon || '⛅',
        batteryPercent: battery,
        adviceItems: Array.isArray(res.adviceItems) ? res.adviceItems : [],
        luckyEl: res.luckyEl || null,
        gGod: res.gGod || fallbackGGod,
        jGod: res.jGod || fallbackJGod
      };
    } catch (err) {
      var ev = _evalDaewunBridge(pair.g, pair.j);
      var fallbackBattery = _clamp(Math.round(Number(ev && ev.score || 50)), 0, 100);
      return {
        grade: fallbackBattery >= 70 ? '호조' : fallbackBattery >= 45 ? '무난' : '경계',
        icon: '⚠️',
        batteryPercent: fallbackBattery,
        adviceItems: [{
          type: 'guide',
          body: (label || '월운') + '은 ' + fallbackGGod + '/' + fallbackJGod + ' 축으로 기본 보정해 반영했습니다.'
        }],
        luckyEl: null,
        gGod: fallbackGGod,
        jGod: fallbackJGod
      };
    }
  }

  function _pickDaewunForAge(age, daewunList) {
    if (!Array.isArray(daewunList) || !daewunList.length) return null;
    var list = daewunList.slice().sort(function(a, b) { return a.age - b.age; });
    var current = null;
    for (var i = 0; i < list.length; i += 1) {
      var st = Number(list[i].age || 0);
      var next = (i < list.length - 1) ? Number(list[i + 1].age || 999) : 999;
      if (age >= st && age < next) {
        current = list[i];
        break;
      }
    }
    return current || list[list.length - 1];
  }

  function _collectCollisionSignals(pillars, year) {
    var out = {
      chungCount: 0,
      hyungCount: 0,
      paCount: 0,
      haeCount: 0,
      score: 0,
      notes: []
    };
    if (!pillars || !pillars.d || !pillars.m) return out;

    var yZhi = _getYearGanZhi(year).zhi;
    var branches = [pillars.y && pillars.y.j, pillars.m && pillars.m.j, pillars.d && pillars.d.j, pillars.h && pillars.h.j].filter(Boolean);

    var CHONG = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };
    var PA = { '子':'酉','酉':'子','卯':'午','午':'卯','辰':'丑','丑':'辰','未':'戌','戌':'未','寅':'亥','亥':'寅','巳':'申','申':'巳' };
    var HAE = { '子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅','卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉' };

    branches.forEach(function(z) {
      if (CHONG[z] === yZhi) {
        out.chungCount += 1;
        out.notes.push('연지(' + yZhi + ')가 원국 ' + z + '과 충(沖)');
      }
      if (PA[z] === yZhi) {
        out.paCount += 1;
        out.notes.push('연지(' + yZhi + ')가 원국 ' + z + '과 파(破)');
      }
      if (HAE[z] === yZhi) {
        out.haeCount += 1;
        out.notes.push('연지(' + yZhi + ')가 원국 ' + z + '과 해(害)');
      }
    });

    var set = branches.concat([yZhi]);
    var hasInSaShin = ['寅', '巳', '申'].every(function(z) { return set.indexOf(z) >= 0; });
    var hasChukSulMi = ['丑', '戌', '未'].every(function(z) { return set.indexOf(z) >= 0; });
    if (hasInSaShin) {
      out.hyungCount += 2;
      out.notes.push('인사신(寅巳申) 삼형 성립');
    }
    if (hasChukSulMi) {
      out.hyungCount += 2;
      out.notes.push('축술미(丑戌未) 삼형 성립');
    }

    out.score = _clamp(out.chungCount * 18 + out.hyungCount * 12 + out.paCount * 10 + out.haeCount * 8, 0, 100);
    return out;
  }

  function _resolveSeasonFromMonthBranch(monthBranch) {
    var branch = String(monthBranch || '').trim();
    if (branch === '寅' || branch === '卯' || branch === '辰') return 'spring';
    if (branch === '巳' || branch === '午' || branch === '未') return 'summer';
    if (branch === '申' || branch === '酉' || branch === '戌') return 'autumn';
    if (branch === '亥' || branch === '子' || branch === '丑') return 'winter';
    return 'unknown';
  }

  function _normalizeJohuType(typeRaw, climateType, season) {
    var typeText = String(typeRaw || '').trim().toLowerCase();
    if (typeText === 'hot' || typeText === 'warm' || typeText === 'neutral' || typeText === 'cool' || typeText === 'cold') {
      return typeText;
    }

    var climate = String(climateType || '').trim().toLowerCase();
    if (climate.indexOf('hot') >= 0) return 'hot';
    if (climate.indexOf('cold') >= 0) return 'cold';
    if (climate.indexOf('warm') >= 0) return 'warm';
    if (climate.indexOf('cool') >= 0) return 'cool';
    if (climate.indexOf('balanced') >= 0 || climate.indexOf('neutral') >= 0) return 'neutral';

    if (season === 'summer') return 'warm';
    if (season === 'winter') return 'cool';
    return 'neutral';
  }

  function _normalizeJohuMoistType(moistTypeRaw, moistureProfile, climateType) {
    var moistText = String(moistTypeRaw || '').trim().toLowerCase();
    if (moistText === 'dry' || moistText === 'wet' || moistText === 'balanced') {
      return moistText;
    }

    var profile = (moistureProfile && typeof moistureProfile === 'object') ? moistureProfile : null;
    var dryness = Number(profile && profile.dryness || 0);
    var moisture = Number(profile && profile.moisture || 0);
    if (Number.isFinite(dryness) && Number.isFinite(moisture)) {
      if (dryness - moisture >= 4) return 'dry';
      if (moisture - dryness >= 4) return 'wet';
    }

    var climate = String(climateType || '').trim().toLowerCase();
    if (climate.indexOf('dry') >= 0) return 'dry';
    if (climate.indexOf('wet') >= 0 || climate.indexOf('moist') >= 0) return 'wet';
    return 'balanced';
  }

  function _createFallbackJohu(normalized) {
    var pillars = normalized && normalized.pillars;
    var dist = normalized && normalized.dist;
    var monthBranch = String(pillars && pillars.m && pillars.m.j || '').trim();
    var season = _resolveSeasonFromMonthBranch(monthBranch);

    var fire = Number(dist && dist.fire || 0);
    var water = Number(dist && dist.water || 0);
    var wood = Number(dist && dist.wood || 0);
    var metal = Number(dist && dist.metal || 0);

    var seasonalOffset = 0;
    if (season === 'summer') seasonalOffset = 2;
    else if (season === 'winter') seasonalOffset = -2;
    else if (season === 'spring') seasonalOffset = 1;
    else if (season === 'autumn') seasonalOffset = -1;

    var heatDelta = (fire - water) + seasonalOffset;
    var type = 'neutral';
    if (heatDelta >= 3) type = 'hot';
    else if (heatDelta >= 1) type = 'warm';
    else if (heatDelta <= -3) type = 'cold';
    else if (heatDelta <= -1) type = 'cool';

    var moistDelta = (water + wood) - (fire + metal);
    var moistType = 'balanced';
    if (moistDelta >= 2) moistType = 'wet';
    else if (moistDelta <= -2) moistType = 'dry';

    var climateType = type + '-' + moistType;
    var advice;
    if (type === 'hot' || type === 'warm') {
      advice = '열기 완화를 위해 수(水)·금(金) 보완 루틴이 필요합니다.';
    } else if (type === 'cold' || type === 'cool') {
      advice = '한기 완화를 위해 화(火)·목(木) 보완 루틴이 필요합니다.';
    } else {
      advice = '한난 균형은 중립이나 월별 변동성 관리가 필요합니다.';
    }

    return {
      score: Math.round(heatDelta * 1.8),
      type: type,
      moistType: moistType,
      climateType: climateType,
      season: season,
      birthSeason: season,
      monthBranch: monthBranch,
      advice: advice,
      source: 'fallback-derived',
      hasFallback: true,
      confidence: 'low'
    };
  }

  function _normalizeJohu(rawJohu, normalized) {
    var raw = (rawJohu && typeof rawJohu === 'object') ? rawJohu : null;
    if (!raw) return _createFallbackJohu(normalized);

    var monthBranch = String(raw.monthBranch || (normalized && normalized.pillars && normalized.pillars.m && normalized.pillars.m.j) || '').trim();
    var season = _safeText(raw.season || raw.birthSeason, _resolveSeasonFromMonthBranch(monthBranch));
    var climateType = _safeText(raw.climateType, '');
    var type = _normalizeJohuType(raw.type, climateType, season);
    var moistType = _normalizeJohuMoistType(raw.moistType, raw.moistureProfile, climateType);

    var normalizedJohu = {
      score: Number.isFinite(Number(raw.score)) ? Number(raw.score) : Math.round(((type === 'hot' || type === 'warm') ? 3 : (type === 'cold' || type === 'cool') ? -3 : 0)),
      type: type,
      moistType: moistType,
      climateType: climateType || (type + '-' + moistType),
      season: season,
      birthSeason: _safeText(raw.birthSeason, season),
      monthBranch: monthBranch,
      advice: _safeText(raw.advice, '조후 데이터 일부가 부족하여 보수적으로 해석합니다.'),
      source: _safeText(raw.source, 'provided'),
      hasFallback: false,
      confidence: _safeText(raw.confidence, 'high')
    };

    if (!raw.type && !raw.climateType && !raw.moistType) {
      var fallback = _createFallbackJohu(normalized);
      normalizedJohu.type = fallback.type;
      normalizedJohu.moistType = fallback.moistType;
      normalizedJohu.climateType = fallback.climateType;
      normalizedJohu.hasFallback = true;
      normalizedJohu.confidence = 'low';
      normalizedJohu.source = 'fallback-derived';
    }

    return normalizedJohu;
  }

  function _normalizeSibylInput(payload, analysisData) {
    var profile = (payload && payload.profile) || _getCurrentProfile() || null;
    var rawPillars = (payload && payload.pillars) || (analysisData && analysisData.pillars) || window.G_PILLARS || null;
    var pillars = _ensurePillarsWithProfileFallback(rawPillars, profile);

    var integrity = { ok: true, messages: [] };
    if (!pillars || !pillars.d || !pillars.d.g || !pillars.d.j) {
      integrity.ok = false;
      integrity.messages.push('사주 원국 일주 정보가 누락되었습니다.');
    }
    if (!pillars || !pillars.y || !pillars.y.g || !pillars.y.j || !pillars.m || !pillars.m.g || !pillars.m.j) {
      integrity.ok = false;
      integrity.messages.push('연주/월주 데이터가 불완전하여 일부 해석은 보수적으로 처리됩니다.');
    }
    if (!pillars || !pillars.h || !pillars.h.g || !pillars.h.j) {
      integrity.messages.push('출생 시각 데이터가 불완전하여 시주 기반 정밀도가 낮아졌습니다.');
    }

    var dist = _ohaengDist(pillars);
    if (!dist.total) {
      integrity.ok = false;
      integrity.messages.push('오행 분포 계산값이 비어 있습니다.');
    }

    var counts = _analyzeTenStars(pillars || window.G_PILLARS || {});
    var dominantTenStar = _dominantTenStar(counts);
    var hasTenStarSignal = Object.keys(counts || {}).some(function(k) { return Number(counts[k] || 0) > 0; });
    if (!hasTenStarSignal) {
      integrity.messages.push('주도 십성을 확정할 데이터가 부족합니다.');
    }

    var domEl = (payload && payload.dominantEl) || (analysisData && analysisData.domEl) || _dominantEl(dist);
    var dayMaster = String(pillars && pillars.d && pillars.d.g || '').trim();
    var rawJohu = (payload && payload.johu) || (analysisData && analysisData.johu) || window.G_JOHU || null;
    var johu = _normalizeJohu(rawJohu, { pillars: pillars, dist: dist, dominantEl: domEl });
    if (johu && johu.hasFallback) {
      integrity.messages.push('조후 데이터가 일부 부족하여 계절/오행 기반 추정치를 사용했습니다.');
    }
    var currentYear = _toInt((payload && payload.currentYear) || new Date().getFullYear(), new Date().getFullYear());
    var currentAge = _profileAge(profile);

    var daewunRaw = Array.isArray(window.G_DAEWUN) ? window.G_DAEWUN : [];
    var daewunList = daewunRaw.map(function(item) {
      var age = Number(item && item.age);
      var g = item && item.g;
      var j = item && item.j;
      if (!Number.isFinite(age) || !g || !j) return null;
      var ev = _evalDaewunBridge(g, j);
      return {
        age: age,
        g: g,
        j: j,
        score: ev.score,
        label: ev.label,
        summary: ev.evalSummary,
        hasChungBonus: ev.hasChungBonus,
        hasChungPenalty: ev.hasChungPenalty
      };
    }).filter(Boolean).sort(function(a, b) { return a.age - b.age; });

    if (!daewunList.length) {
      integrity.messages.push('대운 배열(window.G_DAEWUN)이 비어 있어 연동 강도가 낮습니다.');
    }

    var rawSourceStatus = (payload && payload.sourceStatus) || (analysisData && analysisData.sourceStatus) || {};

    return {
      profile: profile,
      pillars: pillars,
      dayMaster: dayMaster,
      dist: dist,
      tenStarCounts: counts,
      dominantTenStar: dominantTenStar,
      dominantEl: domEl,
      currentYear: currentYear,
      currentAge: currentAge,
      power: window.G_POWER || null,
      jong: window.G_JONG || null,
      johu: johu,
      daewunList: daewunList,
      sourceStatus: {
        hasKasi: Boolean(rawSourceStatus && rawSourceStatus.hasKasi),
        hasSolarTerms: Boolean(rawSourceStatus && rawSourceStatus.hasSolarTerms),
        hasLunar: Boolean(rawSourceStatus && rawSourceStatus.hasLunar),
        fallbackUsed: Boolean((rawSourceStatus && rawSourceStatus.fallbackUsed) || (johu && johu.hasFallback))
      },
      integrity: integrity
    };
  }

  function normalizeSibylInput(rawInput) {
    var input = rawInput || {};
    var genderRaw = String(input.gender || '').trim().toLowerCase();
    var gender = 'unknown';
    if (genderRaw === 'm' || genderRaw === 'male' || genderRaw === 'man' || genderRaw === '남' || genderRaw === '남성') gender = 'male';
    if (genderRaw === 'f' || genderRaw === 'female' || genderRaw === 'woman' || genderRaw === '여' || genderRaw === '여성') gender = 'female';

    var birthDate = _safeText(input.birthDate, '입력값 확인 필요');
    var birthTime = _safeText(input.birthTime, '시간 미상');
    var calendarType = String(input.calendarType || 'solar').toLowerCase() === 'lunar' ? 'lunar' : 'solar';

    return {
      birthDate: birthDate,
      birthTime: birthTime,
      gender: gender,
      calendarType: calendarType
    };
  }

  function classifySibylMode(scores, context) {
    var riskScore = _safeScore(scores && scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var stabilityScore = _safeScore(scores && scores.stabilityScore, SIBYL_DEFAULT_STABILITY_SCORE, 0, 100);
    var dominantElement = _safeText(context && context.dominantElement, 'water');
    var primaryTenGod = _safeText(context && context.primaryTenGod, SIBYL_PRIMARY_TENGOD_FALLBACK);

    var mode = 'growth';
    if (riskScore < 30) mode = 'stability';
    else if (riskScore < 55) mode = 'growth';
    else if (riskScore < 75) mode = 'warning';
    else mode = stabilityScore >= 46 ? 'breakthrough' : 'dominator';

    var riskLevel = 'medium';
    if (riskScore < 30) riskLevel = 'low';
    else if (riskScore < 55) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    var modeTitleMap = {
      stability: '안정 유지 모드',
      growth: '성장 가속 모드',
      warning: '리스크 경계 모드',
      breakthrough: '돌파 재편 모드',
      dominator: '도미네이터 모드'
    };

    var subtitle = (EL_KR[dominantElement] || dominantElement) + ' 중심 축 · ' + primaryTenGod + ' 패턴';
    var coreMessage = '핵심 축은 ' + (EL_KR[dominantElement] || dominantElement) + '이며, ' + primaryTenGod + ' 성향을 실행 루틴으로 연결할 때 점수 대비 성과가 안정됩니다.';
    var warningMessage = riskScore >= 65
      ? '고위험 구간은 결정 지연 규칙과 손실 차단 체크리스트를 먼저 적용하세요.'
      : '중립~경계 구간에서는 확장보다 검증 루프를 짧게 유지하세요.';
    var opportunityMessage = riskScore < 45
      ? '안정 구간에서 핵심 과제 1개를 집중 실행하면 성장 효율이 큽니다.'
      : '저위험 월을 선별해 공격 실행, 고위험 월은 방어 운용으로 분리하세요.';

    return {
      mode: mode,
      riskLevel: riskLevel,
      title: modeTitleMap[mode] || '성장 가속 모드',
      subtitle: subtitle,
      coreMessage: coreMessage,
      warningMessage: warningMessage,
      opportunityMessage: opportunityMessage
    };
  }

  function calculateSibylScores(normalized, riskBreakdown, aptData) {
    var riskScore = _safeScore(riskBreakdown && riskBreakdown.total, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var aptitudeScore = _safeScore(aptData && aptData.score, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
    var components = (aptData && aptData.components) || {};
    var careerScore = _safeScore(components.career, SIBYL_DEFAULT_CAREER_SCORE, 0, 100);
    var wealthScore = _safeScore(components.wealth, SIBYL_DEFAULT_WEALTH_SCORE, 0, 100);
    var relationshipScore = _safeScore(components.social, SIBYL_DEFAULT_RELATIONSHIP_SCORE, 0, 100);
    var stabilityScore = _safeScore(100 - riskScore + Math.round((components.recovery || 50) * 0.2), SIBYL_DEFAULT_STABILITY_SCORE, 0, 100);

    return {
      riskScore: riskScore,
      aptitudeScore: aptitudeScore,
      stabilityScore: stabilityScore,
      relationshipScore: relationshipScore,
      wealthScore: wealthScore,
      careerScore: careerScore
    };
  }

  function buildSibylReportSeed(profile) {
    var p = profile || {};
    var classification = p.classification || {};
    var saju = p.saju || {};
    var scores = p.scores || {};
    var keyRisk = _safeScore(scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);

    var keywords = [
      _safeText(classification.mode, 'growth'),
      _safeText(saju.dominantElement, 'water'),
      _safeText(saju.tenGods && saju.tenGods.primary, SIBYL_PRIMARY_TENGOD_FALLBACK)
    ];

    return {
      keywords: keywords,
      strengths: [
        '핵심 오행 축이 명확하여 의사결정 기준을 세우기 쉽습니다.',
        '적성 계수를 실전 루틴으로 전환하면 성과 재현성이 높아집니다.'
      ],
      weaknesses: [
        keyRisk >= 65 ? '리스크 신호가 높은 달에는 과속 판단으로 손실이 확대될 수 있습니다.' : '중립 구간에서 우선순위 분산 시 성과 집중도가 낮아질 수 있습니다.',
        '관계/협업 규칙이 모호하면 십성 강점이 갈등으로 전환될 수 있습니다.'
      ],
      cautionPeriods: [
        '리스크 상위 월',
        '충형파해 충돌 신호가 겹치는 구간'
      ],
      recommendedActions: [
        '30일 단위로 실행 KPI 1개와 방어 규칙 2개를 고정하세요.',
        '고위험 구간에는 결정 지연(24시간)과 문서 합의 절차를 적용하세요.',
        '안정 구간에는 핵심 과제를 단일 트랙으로 밀어 성과를 고정하세요.'
      ]
    };
  }

  function mapSajuToSibylProfile(normalized, scores, classification, yearlyFlow, monthlyPlan) {
    var norm = normalized || {};
    var profile = norm.profile || {};
    var birth = profile.birth || {};
    var pillars = _pillarChars(norm.pillars || window.G_PILLARS || {});
    var dist = norm.dist || { wood:0, fire:0, earth:0, metal:0, water:0, total:0 };
    var tenStarCounts = norm.tenStarCounts || {};

    var weakElement = EL_ORDER.slice().sort(function(a, b) {
      return Number(dist[a] || 0) - Number(dist[b] || 0);
    })[0] || _safeText(norm.dominantEl, 'water');

    var input = normalizeSibylInput({
      birthDate: [birth.year || '', birth.month || '', birth.day || ''].filter(Boolean).join('-') || '입력값 확인 필요',
      birthTime: (String(birth.hour || '').trim() !== '' ? String(birth.hour).padStart(2, '0') : '??') + ':' + (String(birth.minute || '').trim() !== '' ? String(birth.minute).padStart(2, '0') : '??'),
      gender: profile.gender || 'unknown',
      calendarType: profile.calendarType || 'solar'
    });

    var base = {
      input: input,
      saju: {
        yearPillar: _safePillarLabel(pillars.y),
        monthPillar: _safePillarLabel(pillars.m),
        dayPillar: _safePillarLabel(pillars.d),
        hourPillar: _safePillarLabel(pillars.h),
        dayMaster: _safeText(pillars.d && pillars.d.g, '미상'),
        dayMasterElement: _safeText(GAN_EL[pillars.d && pillars.d.g], _safeText(norm.dominantEl, 'water')),
        dominantElement: _safeText(norm.dominantEl, _dominantEl(dist)),
        weakElement: _safeText(weakElement, _safeText(norm.dominantEl, 'water')),
        tenGods: {
          primary: _safeText(norm.dominantTenStar, SIBYL_PRIMARY_TENGOD_FALLBACK),
          secondary: Object.keys(tenStarCounts).sort(function(a, b) {
            return Number(tenStarCounts[b] || 0) - Number(tenStarCounts[a] || 0);
          }).filter(function(key) { return key !== norm.dominantTenStar; })[0] || '',
          distribution: Object.assign({}, tenStarCounts)
        },
        fiveElements: {
          wood: _safeScore(dist.wood, 0, 0, 99),
          fire: _safeScore(dist.fire, 0, 0, 99),
          earth: _safeScore(dist.earth, 0, 0, 99),
          metal: _safeScore(dist.metal, 0, 0, 99),
          water: _safeScore(dist.water, 0, 0, 99)
        }
      },
      scores: Object.assign({}, scores),
      classification: Object.assign({}, classification),
      basicSections: {
        coreMatrix: '일간 ' + _safeText(pillars.d && pillars.d.g, '미상') + ', 지배 오행 ' + (_safeText(EL_KR[norm.dominantEl], _safeText(norm.dominantEl, 'water'))) + ', 주도 십성 ' + _safeText(norm.dominantTenStar, SIBYL_PRIMARY_TENGOD_FALLBACK) + '을 중심축으로 현재 운세 구조를 해석합니다.',
        riskPattern: '위험 계수는 오행 편중, 십성 과부하, 충형파해, 대운·세운 충돌, 월 변동성을 결합해 산출했습니다.',
        aptitudePattern: '적성 계수는 career·wealth·execution·social·recovery 5축을 합산한 0~999 스케일입니다.',
        relationshipPattern: '관계 패턴은 주도 십성의 장점/그림자를 분리해 갈등 유발 조건과 회복 루틴을 제시합니다.',
        wealthPattern: '재물 패턴은 수익 기회와 손실 방어를 분리해 월별 운용 우선순위를 안내합니다.',
        careerPattern: '직업/진로 패턴은 지배 오행과 십성 조합에 맞춘 실행 창을 제안합니다.',
        timingAdvice: '고위험 구간은 수비, 저위험 구간은 실행 강화라는 이중 리듬 전략을 유지하세요.'
      },
      reportSeed: {},
      yearlyFlow: Array.isArray(yearlyFlow) ? yearlyFlow.slice(0, 10) : [],
      monthlyFlow: Array.isArray(monthlyPlan) ? monthlyPlan.slice(0, 12) : [],
      debug: {
        source: norm.integrity && norm.integrity.ok ? 'local-engine' : 'fallback',
        missingFields: [],
        warnings: (norm.integrity && Array.isArray(norm.integrity.messages)) ? norm.integrity.messages.slice(0, 10) : []
      }
    };

    base.reportSeed = buildSibylReportSeed(base);
    return base;
  }

  function sanitizeSibylProfile(profile) {
    var src = profile || {};
    var out = JSON.parse(JSON.stringify(src || {}));
    out.input = normalizeSibylInput(out.input || {});
    out.saju = out.saju || {};
    out.saju.tenGods = out.saju.tenGods || {};
    out.saju.fiveElements = out.saju.fiveElements || {};
    out.scores = out.scores || {};
    out.classification = out.classification || {};
    out.basicSections = out.basicSections || {};
    out.reportSeed = out.reportSeed || buildSibylReportSeed(out);
    out.debug = out.debug || { source: 'fallback', missingFields: [], warnings: [] };

    out.saju.dominantElement = _safeText(out.saju.dominantElement, _safeText(out.saju.dayMasterElement, 'water'));
    out.saju.weakElement = _safeText(out.saju.weakElement, out.saju.dominantElement);
    out.saju.tenGods.primary = _safeText(out.saju.tenGods.primary, SIBYL_PRIMARY_TENGOD_FALLBACK);
    out.saju.tenGods.secondary = _safeText(out.saju.tenGods.secondary, '');
    out.saju.tenGods.distribution = out.saju.tenGods.distribution && typeof out.saju.tenGods.distribution === 'object'
      ? out.saju.tenGods.distribution
      : {};

    out.scores.riskScore = _safeScore(out.scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    out.scores.aptitudeScore = _safeScore(out.scores.aptitudeScore, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
    out.scores.stabilityScore = _safeScore(out.scores.stabilityScore, SIBYL_DEFAULT_STABILITY_SCORE, 0, 100);
    out.scores.relationshipScore = _safeScore(out.scores.relationshipScore, SIBYL_DEFAULT_RELATIONSHIP_SCORE, 0, 100);
    out.scores.wealthScore = _safeScore(out.scores.wealthScore, SIBYL_DEFAULT_WEALTH_SCORE, 0, 100);
    out.scores.careerScore = _safeScore(out.scores.careerScore, SIBYL_DEFAULT_CAREER_SCORE, 0, 100);

    out.classification.mode = _safeText(out.classification.mode, 'growth');
    out.classification.riskLevel = _safeText(out.classification.riskLevel, 'medium');
    out.classification.title = _safeText(out.classification.title, '성장 가속 모드');
    out.classification.subtitle = _safeText(out.classification.subtitle, '핵심 축 정렬 중');
    out.classification.coreMessage = _safeText(out.classification.coreMessage, '핵심 점수를 실행 루틴으로 연결하면 변동성이 줄어듭니다.');
    out.classification.warningMessage = _safeText(out.classification.warningMessage, '고위험 구간은 방어 규칙을 먼저 적용하세요.');
    out.classification.opportunityMessage = _safeText(out.classification.opportunityMessage, '저위험 구간은 핵심 과제를 전진 배치하세요.');

    out.basicSections.coreMatrix = _safeText(out.basicSections.coreMatrix, SIBYL_CORE_MATRIX_FALLBACK);
    out.basicSections.riskPattern = _safeText(out.basicSections.riskPattern, '위험 패턴 데이터를 점검 중입니다. 현재 보수적 분석값으로 표시합니다.');
    out.basicSections.aptitudePattern = _safeText(out.basicSections.aptitudePattern, '적성 패턴 데이터를 점검 중입니다.');
    out.basicSections.relationshipPattern = _safeText(out.basicSections.relationshipPattern, '관계 패턴은 주도 십성 기준으로 보정했습니다.');
    out.basicSections.wealthPattern = _safeText(out.basicSections.wealthPattern, '재물 패턴은 방어 우선 기준으로 보정했습니다.');
    out.basicSections.careerPattern = _safeText(out.basicSections.careerPattern, '진로 패턴은 지배 오행 기준으로 보정했습니다.');
    out.basicSections.timingAdvice = _safeText(out.basicSections.timingAdvice, '고위험 수비 / 저위험 실행 이중 리듬을 유지하세요.');

    if (!Array.isArray(out.reportSeed.keywords)) out.reportSeed.keywords = [];
    if (!Array.isArray(out.reportSeed.strengths)) out.reportSeed.strengths = [];
    if (!Array.isArray(out.reportSeed.weaknesses)) out.reportSeed.weaknesses = [];
    if (!Array.isArray(out.reportSeed.cautionPeriods)) out.reportSeed.cautionPeriods = [];
    if (!Array.isArray(out.reportSeed.recommendedActions)) out.reportSeed.recommendedActions = [];

    if (!Array.isArray(out.debug.missingFields)) out.debug.missingFields = [];
    if (!Array.isArray(out.debug.warnings)) out.debug.warnings = [];
    return out;
  }

  function validateSibylProfile(profile) {
    var p = profile || {};
    var missingFields = [];

    function ensure(condition, key) {
      if (!condition) missingFields.push(key);
    }

    ensure(_safeText(p.input && p.input.birthDate, '') !== '', 'input.birthDate');
    ensure(_safeText(p.input && p.input.gender, '') !== '', 'input.gender');
    ensure(_safeText(p.saju && p.saju.dominantElement, '') !== '', 'saju.dominantElement');
    ensure(_safeText(p.saju && p.saju.tenGods && p.saju.tenGods.primary, '') !== '', 'saju.tenGods.primary');
    ensure(Number.isFinite(Number(p.scores && p.scores.riskScore)), 'scores.riskScore');
    ensure(Number.isFinite(Number(p.scores && p.scores.aptitudeScore)), 'scores.aptitudeScore');
    ensure(_safeText(p.classification && p.classification.mode, '') !== '', 'classification.mode');
    ensure(_safeText(p.classification && p.classification.title, '') !== '', 'classification.title');
    ensure(_safeText(p.basicSections && p.basicSections.coreMatrix, '') !== '', 'basicSections.coreMatrix');

    return {
      ok: missingFields.length === 0,
      missingFields: missingFields,
      warnings: missingFields.map(function(key) { return key + ' 누락'; })
    };
  }

  function buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan) {
    var scores = calculateSibylScores(normalized, riskBreakdown, aptData);
    var classification = classifySibylMode(scores, {
      dominantElement: normalized && normalized.dominantEl,
      primaryTenGod: normalized && normalized.dominantTenStar
    });

    var yearlyFlow = Array.isArray(annualPlan) ? annualPlan.slice(0, 10).map(function(item, index) {
      var rs = _safeScore(item && item.risk, 42 + index * 2, 0, 100);
      return {
        year: Number(item && item.year || (new Date().getFullYear() + index)),
        pillar: _safeText(item && item.ganZhi, '미상'),
        riskScore: rs,
        opportunityScore: _safeScore(100 - rs, 50, 0, 100),
        warning: _safeText(item && item.summary, classification.warningMessage),
        advice: _safeText(item && item.playbook, classification.opportunityMessage)
      };
    }) : [];

    var mapped = mapSajuToSibylProfile(normalized, scores, classification, yearlyFlow, monthlyPlan);
    var sanitized = sanitizeSibylProfile(mapped);
    var validation = validateSibylProfile(sanitized);
    sanitized.debug.missingFields = validation.missingFields.slice();
    sanitized.debug.warnings = sanitized.debug.warnings.concat(validation.warnings);

    _sibylDevDebug('[SIBYL] input', sanitized.input);
    _sibylDevDebug('[SIBYL] normalizedProfile', sanitized);
    if (validation.missingFields.length) {
      _sibylDevWarn('[SIBYL] missingFields', validation.missingFields);
    }

    return sanitized;
  }

  function _safePillarLabel(pair) {
    if (!pair || typeof pair !== 'object') return '미상';
    var g = String(pair.g || '').trim();
    var j = String(pair.j || '').trim();
    if (g && j) return g + j;
    return '미상';
  }

  function _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan) {
    var profile = buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    var riskParts = riskBreakdown && riskBreakdown.parts ? riskBreakdown.parts : {};
    var aptitudeComponents = aptData && aptData.components ? aptData.components : {};
    var supporting = Object.keys(profile.saju.tenGods.distribution || {}).filter(function(key) {
      return key !== profile.saju.tenGods.primary && Number(profile.saju.tenGods.distribution[key] || 0) >= 2;
    }).slice(0, 3);
    var lacking = Object.keys(TENSTAR_SECTOR).filter(function(key) {
      return Number(profile.saju.tenGods.distribution[key] || 0) <= 0;
    }).slice(0, 3);

    return {
      input: profile.input,
      saju: {
        yearPillar: profile.saju.yearPillar,
        monthPillar: profile.saju.monthPillar,
        dayPillar: profile.saju.dayPillar,
        hourPillar: profile.saju.hourPillar,
        dayMaster: profile.saju.dayMaster,
        dayMasterElement: profile.saju.dayMasterElement,
        dominantElement: profile.saju.dominantElement,
        weakElement: profile.saju.weakElement,
        favorableElements: ((normalized && normalized.power && Array.isArray(normalized.power.yongshin)) ? normalized.power.yongshin : []).slice(0, 3),
        unfavorableElements: ((normalized && normalized.power && Array.isArray(normalized.power.kijishin)) ? normalized.power.kijishin : []).slice(0, 3),
        tenGods: profile.saju.tenGods,
        tenGodSummary: {
          dominantTenGod: profile.saju.tenGods.primary,
          supportingTenGods: supporting,
          lackingTenGods: lacking
        },
        fiveElements: profile.saju.fiveElements
      },
      scores: profile.scores,
      classification: profile.classification,
      basicSections: profile.basicSections,
      reportSeed: profile.reportSeed,
      sibyl: {
        mode: profile.classification.mode,
        modeTitle: profile.classification.title,
        modeDescription: profile.classification.subtitle,
        riskScore: profile.scores.riskScore,
        aptitudeScore: profile.scores.aptitudeScore,
        dominantTenGod: profile.saju.tenGods.primary,
        dominantElement: profile.saju.dominantElement,
        warningKeywords: Object.keys(riskParts).sort(function(a, b) { return Number(riskParts[b] || 0) - Number(riskParts[a] || 0); }).slice(0, 3),
        strengthKeywords: Object.keys(aptitudeComponents).sort(function(a, b) { return Number(aptitudeComponents[b] || 0) - Number(aptitudeComponents[a] || 0); }).slice(0, 3),
        coreMessage: profile.classification.coreMessage,
        lifeStrategy: profile.basicSections.timingAdvice
      },
      yearlyFlow: Array.isArray(profile.yearlyFlow) ? profile.yearlyFlow.slice(0, 10) : [],
      monthlyFlow: Array.isArray(profile.monthlyFlow) ? profile.monthlyFlow.slice(0, 12) : [],
      debug: profile.debug,
      normalizedProfile: profile
    };
  }

  function _buildCanonicalFallbackChapter(chapterMeta, canonicalData, index) {
    var sibyl = canonicalData && canonicalData.sibyl ? canonicalData.sibyl : {};
    var saju = canonicalData && canonicalData.saju ? canonicalData.saju : {};
    var yearly = canonicalData && Array.isArray(canonicalData.yearlyFlow) ? canonicalData.yearlyFlow : [];
    var yearPreview = yearly.slice(0, 3).map(function(item) {
      return String(item.year) + '년 위험 ' + item.riskScore + ' / 기회 ' + item.opportunityScore;
    }).join(' · ');

    var text = [
      chapterMeta.title,
      chapterMeta.focus,
      '일간 ' + (saju.dayMaster || '미상') + ', 지배 오행 ' + (sibyl.dominantElement || '미상') + ', 주도 십성 ' + (sibyl.dominantTenGod || '미상') + '을 중심으로 분석합니다.',
      '위험 계수 ' + _clamp(Number(sibyl.riskScore || 35), 5, 99) + ' / 적성 계수 ' + _clamp(Number(sibyl.aptitudeScore || 420), 100, 999) + ' 기준으로 조건-행동-결과 프레임을 적용합니다.',
      '연간 흐름 요약: ' + (yearPreview || '연간 흐름 데이터 점검 필요') + '.',
      '실행 규칙: 고위험에서는 손실 차단, 저위험에서는 집중 실행, 중립 구간에서는 검증 루프를 짧게 유지하세요.',
      '실패 방지 체크리스트: 1) 의사결정 전제 기록 2) 7일 점검 3) 30일 보정 4) 90일 리밸런싱.'
    ].join('\n\n');

    var guard = 0;
    while (text.length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS && guard < 4) {
      text += '\n\n' + '추가 해설 ' + (guard + 1) + ': 점수 해석보다 실행 순서를 먼저 고정하고, 지표를 매주 갱신하세요. 동일한 사주 구조에서도 실행 루틴이 달라지면 위험 체감이 크게 달라집니다.';
      guard += 1;
    }

    return text;
  }

  function _chapterMapFromReport(reportData) {
    var map = Object.create(null);
    if (reportData && reportData.chapterMap && typeof reportData.chapterMap === 'object') {
      SIBYL_PREMIUM_CHAPTER_KEYS.forEach(function(key) {
        map[key] = String(reportData.chapterMap[key] || '').trim();
      });
      return map;
    }
    if (reportData && Array.isArray(reportData.chapters)) {
      SIBYL_PREMIUM_CHAPTER_META.forEach(function(meta, idx) {
        var ch = reportData.chapters[idx] || {};
        map[meta.key] = String(ch.content || ch.text || '').trim();
      });
    }
    return map;
  }

  function _validateSibylPremiumChapterMap(chapterMap) {
    for (var i = 0; i < SIBYL_PREMIUM_CHAPTER_KEYS.length; i += 1) {
      var key = SIBYL_PREMIUM_CHAPTER_KEYS[i];
      var content = String(chapterMap && chapterMap[key] || '').trim();
      if (content.length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS) {
        return { ok: false, key: key };
      }
    }
    return { ok: true };
  }

  function _dedupeSibylWordsInLine(line) {
    var tokens = String(line || '').split(/\s+/).filter(Boolean);
    if (!tokens.length) return '';
    var out = [];
    var prev = '';
    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      var norm = token.toLowerCase();
      if (norm === prev) continue;
      out.push(token);
      prev = norm;
    }
    return out.join(' ');
  }

  function _sanitizeSibylChapterContent(content) {
    var lines = String(content || '').replace(/\r/g, '').split('\n');
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < lines.length; i += 1) {
      var raw = lines[i];
      var dedupedLine = _dedupeSibylWordsInLine(raw);
      var trim = dedupedLine.trim();
      if (!trim) {
        if (out.length && out[out.length - 1] !== '') out.push('');
        continue;
      }
      var blocked = SIBYL_FORBIDDEN_REPORT_PATTERNS.some(function(rx) { return rx.test(trim); });
      if (blocked) continue;
      var key = trim.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(dedupedLine);
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n');
  }

  function _countSibylPlaceholdersInText(text) {
    var source = String(text || '');
    var count = 0;
    SIBYL_FORBIDDEN_REPORT_PATTERNS.forEach(function(rx) {
      var m = source.match(new RegExp(rx.source, 'gi'));
      if (m && m.length) count += m.length;
    });
    return count;
  }

  function dedupeSibylReportText(report) {
    if (!report || !Array.isArray(report.chapters)) return report;
    var seen = Object.create(null);
    var duplicateCount = 0;
    report.chapters = report.chapters.map(function(ch) {
      var lines = String(ch && ch.content || '').replace(/\r/g, '').split('\n');
      var kept = [];
      for (var i = 0; i < lines.length; i += 1) {
        var line = String(lines[i] || '').trim();
        if (!line) {
          if (kept.length && kept[kept.length - 1] !== '') kept.push('');
          continue;
        }
        var normalized = line.toLowerCase();
        if (seen[normalized]) {
          duplicateCount += 1;
          continue;
        }
        seen[normalized] = true;
        kept.push(line);
      }
      var cleanContent = _sanitizeSibylChapterContent(kept.join('\n'));
      return Object.assign({}, ch, { content: cleanContent });
    });
    report.__duplicateSentenceCount = duplicateCount;
    return report;
  }

  function assertNoPlaceholderText(report) {
    if (!report || !Array.isArray(report.chapters)) return { ok: true, placeholderCount: 0 };
    var total = report.chapters.reduce(function(sum, ch) {
      return sum + _countSibylPlaceholdersInText(ch && ch.content || '');
    }, 0);
    return { ok: total === 0, placeholderCount: total };
  }

  function assertChapterCategoryMatch(report) {
    if (!report || !Array.isArray(report.chapters)) return { ok: false, warnings: ['chapters missing'] };
    var warnings = [];
    report.chapters.forEach(function(ch) {
      var key = String(ch && ch.key || '').trim();
      var hints = SIBYL_CHAPTER_CATEGORY_HINTS[key] || [];
      if (!hints.length) return;
      var body = String(ch && ch.content || '');
      var hit = hints.reduce(function(sum, token) {
        return sum + (body.indexOf(token) >= 0 ? 1 : 0);
      }, 0);
      if (hit < 2) warnings.push(key + ':category-match-low');
    });
    return { ok: warnings.length === 0, warnings: warnings };
  }

  function validateSibylReportSections(report) {
    if (!report || !Array.isArray(report.chapters)) {
      return { ok: false, reason: 'chapters-missing' };
    }
    if (report.chapters.length !== 10) {
      return { ok: false, reason: 'chapter-count', count: report.chapters.length };
    }
    for (var i = 0; i < report.chapters.length; i += 1) {
      var ch = report.chapters[i] || {};
      var body = String(ch.content || '');
      var sectionCount = (body.match(/(^##\s+|^-\s+)/gm) || []).length;
      if (sectionCount < 5) {
        return { ok: false, reason: 'category-count', key: ch.key, count: sectionCount };
      }
      if (_countSibylPlaceholdersInText(body) > 0) {
        return { ok: false, reason: 'placeholder', key: ch.key };
      }
    }
    return { ok: true };
  }

  function _ensureSibylPremiumTotalChars(chapters, minTotalChars, canonicalData) {
    var list = Array.isArray(chapters) ? chapters : [];
    var minChars = _toInt(minTotalChars, SIBYL_MIN_PREMIUM_TOTAL_CHARS);
    if (minChars < SIBYL_MIN_PREMIUM_TOTAL_CHARS) minChars = SIBYL_MIN_PREMIUM_TOTAL_CHARS;
    var total = list.reduce(function(sum, chapter) { return sum + String(chapter && chapter.content || '').length; }, 0);
    if (!list.length || total >= minChars) return { chapters: list, totalChars: total };

    // 품질 보존 우선: 임의 filler로 길이를 강제로 채우지 않는다.
    return { chapters: list, totalChars: total };
  }

  // RISK COMMAND CENTER가 읽는 6개 분석 데이터셋(monthlyRiskPlan/annualRiskPlan/riskBreakdown/
  // aptitudeComponents/quantumDiagnostics/categoryMatrix)이 리포트에 없으면(구버전 캐시 등)
  // 라이브 분석(window._sibylCurrentData)·canonicalData로 재구성해 채운다. 이미 있으면 무변경.
  function _ensureSibylReportAnalytics(reportData, canonicalData) {
    if (!reportData || typeof reportData !== 'object') return reportData;
    var complete = reportData.monthlyRiskPlan && reportData.annualRiskPlan && reportData.riskBreakdown
      && reportData.aptitudeComponents && reportData.quantumDiagnostics && reportData.categoryMatrix;
    if (complete) return reportData;

    try {
      var data = window._sibylCurrentData || {};
      var canon = canonicalData || reportData.canonicalData || data.canonicalData || null;
      var profile = (typeof _getCurrentProfile === 'function') ? _getCurrentProfile() : null;
      var pillars = _ensurePillarsWithProfileFallback(data.pillars || window.G_PILLARS, profile);

      var normalized = data.normalized;
      if (!normalized) {
        var np = sanitizeSibylProfile((canon && canon.normalizedProfile) || data.normalizedProfile || {});
        var ps = _pillarChars(pillars);
        var payload = {
          profile: profile,
          pillars: pillars ? {
            year:  { g: ps.y.g || '', j: ps.y.j || '' },
            month: { g: ps.m.g || '', j: ps.m.j || '' },
            day:   { g: ps.d.g || '', j: ps.d.j || '' },
            hour:  { g: ps.h.g || '', j: ps.h.j || '' }
          } : null,
          natal: data.dist || null,
          dominantEl: _safeText(np && np.saju && np.saju.dominantElement, data.domEl || null),
          dominantTenStar: _safeText(np && np.saju && np.saju.tenGods && np.saju.tenGods.primary, data.dominant || null),
          aptCoeff: _safeScore(np && np.scores && np.scores.aptitudeScore, data.coeff || SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999),
          riskScore: _safeScore(np && np.scores && np.scores.riskScore, data.risk || SIBYL_DEFAULT_RISK_SCORE, 0, 100),
          gender: (profile && profile.gender) || 'F',
          currentYear: new Date().getFullYear()
        };
        normalized = _normalizeSibylInput(payload, data);
      }
      if (!normalized) return reportData;

      var year = normalized.currentYear || new Date().getFullYear();
      var annualPlan = (Array.isArray(reportData.annualRiskPlan) && reportData.annualRiskPlan.length) ? reportData.annualRiskPlan
        : (Array.isArray(data.annualPreview) ? data.annualPreview : _buildAnnualRiskPlan(normalized, year));
      var monthlyPlan = (Array.isArray(reportData.monthlyRiskPlan) && reportData.monthlyRiskPlan.length) ? reportData.monthlyRiskPlan
        : (Array.isArray(data.monthlyPreview) ? data.monthlyPreview
          : _buildMonthlyRiskPlan(pillars, normalized.dominantEl, normalized.dominantTenStar, 45, year, normalized));
      var riskBreakdown = reportData.riskBreakdown || data.riskBreakdown
        || _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, _collectCollisionSignals(pillars, year));
      var aptComponents = reportData.aptitudeComponents || data.aptitudeComponents;
      var aptData;
      if (aptComponents) {
        aptData = { score: _safeScore(data.coeff, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999), components: aptComponents };
      } else {
        aptData = _calcAptitudeComponents(normalized, riskBreakdown);
        aptComponents = aptData.components;
      }
      var quantum = reportData.quantumDiagnostics || _collectQuantumDiagnostics(normalized);
      var categoryMatrix = (Array.isArray(reportData.categoryMatrix) && reportData.categoryMatrix.length)
        ? reportData.categoryMatrix
        : _buildCategoryMatrix(riskBreakdown, aptData, quantum, annualPlan, monthlyPlan);

      reportData.monthlyRiskPlan = monthlyPlan;
      reportData.annualRiskPlan = annualPlan;
      reportData.riskBreakdown = riskBreakdown;
      reportData.aptitudeComponents = aptComponents;
      reportData.quantumDiagnostics = quantum;
      reportData.categoryMatrix = categoryMatrix;
    } catch (e) {
      if (typeof _sibylLogWarn === 'function') _sibylLogWarn('[SIBYL] analytics reconstruct failed', { message: String(e && e.message || '') });
    }
    return reportData;
  }

  function _shapeSibylPremiumReport(reportData, canonicalData) {
    var source = reportData && typeof reportData === 'object' ? Object.assign({}, reportData) : {};
    var map = _chapterMapFromReport(source);

    SIBYL_PREMIUM_CHAPTER_META.forEach(function(meta, idx) {
      var current = String(map[meta.key] || '').trim();
      if (current.length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS) {
        var fallbackText = _buildCanonicalFallbackChapter(meta, canonicalData, idx);
        map[meta.key] = current ? (current + '\n\n' + fallbackText) : fallbackText;
      }
      if (String(map[meta.key] || '').trim().length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS) {
        map[meta.key] = _buildCanonicalFallbackChapter(meta, canonicalData, idx + 20);
      }
    });

    var chapters = SIBYL_PREMIUM_CHAPTER_META.map(function(meta) {
      return {
        key: meta.key,
        title: meta.title,
        content: _sanitizeSibylChapterContent(String(map[meta.key] || '').trim())
      };
    });

    var shapedTotals = _ensureSibylPremiumTotalChars(chapters, Number(source.minTotalChars || 0), canonicalData);
    chapters = shapedTotals.chapters;
    chapters.forEach(function(chapter) {
      map[chapter.key] = String(chapter.content || '').trim();
    });

    var shaped = { chapters: chapters };
    dedupeSibylReportText(shaped);
    chapters = shaped.chapters;
    chapters.forEach(function(chapter) {
      map[chapter.key] = String(chapter.content || '').trim();
    });

    source.chapterMap = map;
    source.chapters = chapters;
    source.categoryCount = chapters.length;
    source.categories = SIBYL_PREMIUM_CHAPTER_META.map(function(item) { return item.title; });
    source.totalChars = shapedTotals.totalChars;
    source.minTotalChars = Math.max(_toInt(source.minTotalChars, 0), SIBYL_MIN_PREMIUM_TOTAL_CHARS);
    source.canonicalData = canonicalData || source.canonicalData || null;
    _ensureSibylReportAnalytics(source, source.canonicalData);

    var placeholderState = assertNoPlaceholderText(source);
    var chapterMatchState = assertChapterCategoryMatch(source);
    var sectionState = validateSibylReportSections(source);
    source.__placeholderCount = placeholderState.placeholderCount;
    source.__chapterMatchWarnings = chapterMatchState.warnings || [];
    source.__sectionValidation = sectionState;

    return source;
  }

  function _riskElementImbalance(dist) {
    if (!dist || !dist.total) return 55;
    var ideal = dist.total / 5;
    var absSum = EL_ORDER.reduce(function(sum, el) {
      return sum + Math.abs((dist[el] || 0) - ideal);
    }, 0);
    var voidCount = EL_ORDER.filter(function(el) { return (dist[el] || 0) === 0; }).length;
    var maxEl = _dominantEl(dist);
    var concentration = (dist[maxEl] || 0) / dist.total;
    var score = (absSum / (ideal * 5)) * 58 + (voidCount * 14) + (concentration >= 0.55 ? 10 : 0);
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskTenStarOverload(counts) {
    var keys = Object.keys(counts || {});
    if (!keys.length) return 48;
    var values = keys.map(function(k) { return Number(counts[k] || 0); });
    var maxV = Math.max.apply(null, values);
    var minV = Math.min.apply(null, values);
    var spread = maxV - minV;
    var skew = _stddev(values);
    var overloadStars = values.filter(function(v) { return v >= 3; }).length;
    var score = spread * 13 + skew * 16 + overloadStars * 10;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskCollision(conflict) {
    if (!conflict) return 40;
    var score = (conflict.chungCount || 0) * 20
      + (conflict.hyungCount || 0) * 14
      + (conflict.paCount || 0) * 10
      + (conflict.haeCount || 0) * 8;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskDaewunSeunConflict(annualPlan) {
    if (!Array.isArray(annualPlan) || !annualPlan.length) return 52;
    var risks = annualPlan.map(function(y) { return Number(y.risk || 0); });
    var avg = _mean(risks);
    var peak = Math.max.apply(null, risks);
    var trough = Math.min.apply(null, risks);
    var swing = peak - trough;
    var shockYears = annualPlan.filter(function(y) { return Number(y.shock || 0) >= 1; }).length;
    var score = avg * 0.55 + swing * 0.35 + shockYears * 6;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskMonthlyVolatility(monthlyPlan) {
    if (!Array.isArray(monthlyPlan) || !monthlyPlan.length) return 50;
    var risks = monthlyPlan.map(function(m) { return Number(m.risk || 0); });
    var sigma = _stddev(risks);
    var swing = Math.max.apply(null, risks) - Math.min.apply(null, risks);
    var highCount = monthlyPlan.filter(function(m) { return Number(m.risk || 0) >= 70; }).length;
    var score = sigma * 3.2 + swing * 0.55 + highCount * 4.5;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskJohuStress(johu, monthlyPlan) {
    var base = 35;
    if (johu && (johu.type === 'hot' || johu.type === 'cold')) base += 22;
    if (johu && (johu.moistType === 'dry' || johu.moistType === 'wet')) base += 12;
    if (Array.isArray(monthlyPlan) && monthlyPlan.length) {
      var lowBattery = monthlyPlan.filter(function(m) { return Number(m.battery || 0) < 45; }).length;
      base += lowBattery * 3;
    }
    return _clamp(Math.round(base), 0, 100);
  }

  function _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflictSignals) {
    var partElement = _riskElementImbalance(normalized && normalized.dist);
    var partTenStar = _riskTenStarOverload(normalized && normalized.tenStarCounts);
    var partCollision = _riskCollision(conflictSignals || (normalized && normalized.collisionSignals));
    var partDaewun = _riskDaewunSeunConflict(annualPlan || (normalized && normalized.annualPlan));
    var partMonthly = _riskMonthlyVolatility(monthlyPlan || (normalized && normalized.monthlyPlan));
    var partJohu = _riskJohuStress(normalized && normalized.johu, monthlyPlan || (normalized && normalized.monthlyPlan));

    var total = Math.round(
      partElement * 0.22
      + partTenStar * 0.16
      + partCollision * 0.18
      + partDaewun * 0.20
      + partMonthly * 0.14
      + partJohu * 0.10
    );

    var label = total >= 75 ? '고위험' : total >= 55 ? '경계' : total >= 35 ? '중립' : '안정';
    return {
      total: _clamp(total, 5, 99),
      label: label,
      parts: {
        elementImbalance: partElement,
        tenStarOverload: partTenStar,
        collision: partCollision,
        daewunSeunConflict: partDaewun,
        monthlyVolatility: partMonthly,
        johuStress: partJohu
      }
    };
  }

  function _calcAptitudeComponents(normalized, riskBreakdown) {
    var counts = (normalized && normalized.tenStarCounts) || {};
    var dist = (normalized && normalized.dist) || { wood:0, fire:0, earth:0, metal:0, water:0, total:1 };
    var total = Math.max(1, Number(dist.total || 1));
    var power = normalized && normalized.power;
    var jong = normalized && normalized.jong;
    var johu = (normalized && normalized.johu) || _createFallbackJohu(normalized || null);
    var riskParts = (riskBreakdown && riskBreakdown.parts) || {};

    var career = 35
      + (counts['정관'] || 0) * 8
      + (counts['편관'] || 0) * 7
      + (counts['식신'] || 0) * 5
      + (power && power.isStrong ? 5 : 0)
      - Math.round((riskParts.collision || 0) * 0.08);

    var wealth = 32
      + (counts['편재'] || 0) * 10
      + (counts['정재'] || 0) * 9
      + (counts['식신'] || 0) * 4
      - (counts['겁재'] || 0) * 5
      - Math.round((riskParts.monthlyVolatility || 0) * 0.06);

    var execution = 34
      + (counts['비견'] || 0) * 6
      + (counts['정관'] || 0) * 5
      + (counts['상관'] || 0) * 4
      + (power && power.isStrong ? 6 : -2)
      - Math.round((riskParts.tenStarOverload || 0) * 0.08);

    var social = 33
      + (counts['정인'] || 0) * 5
      + (counts['식신'] || 0) * 5
      + (counts['정재'] || 0) * 3
      - (counts['편관'] || 0) * 2
      - Math.round((riskParts.collision || 0) * 0.07);

    var recovery = 30
      + (counts['정인'] || 0) * 8
      + (counts['편인'] || 0) * 6
      + (johu && (johu.type === 'neutral' || johu.type === 'cool' || johu.type === 'warm') ? 6 : 0)
      + (jong && jong.isJong ? 4 : 0)
      - Math.round((riskParts.johuStress || 0) * 0.09);

    var components = {
      career: _clamp(Math.round(career), 5, 99),
      wealth: _clamp(Math.round(wealth), 5, 99),
      execution: _clamp(Math.round(execution), 5, 99),
      social: _clamp(Math.round(social), 5, 99),
      recovery: _clamp(Math.round(recovery), 5, 99)
    };

    var weighted = components.career * 0.26
      + components.wealth * 0.22
      + components.execution * 0.21
      + components.social * 0.16
      + components.recovery * 0.15;

    var harmony = 100 - _stddev([
      components.career,
      components.wealth,
      components.execution,
      components.social,
      components.recovery
    ]);

    var score = Math.round(120 + weighted * 8.4 + harmony * 1.6);
    return {
      score: _clamp(score, 100, 999),
      components: components
    };
  }

  function _toRiskBand(score) {
    var n = Number(score || 0);
    if (n >= 75) return '고위험';
    if (n >= 55) return '경계';
    if (n >= 35) return '중립';
    return '안정';
  }

  function _collectQuantumDiagnostics(normalized) {
    var pillars = normalized && normalized.pillars;
    var jg = normalized && normalized.jong;
    var pw = normalized && normalized.power;
    var jh = normalized && normalized.johu;
    var quantumFn = (typeof window.getQuantumElType === 'function')
      ? window.getQuantumElType
      : (typeof getQuantumElType === 'function' ? getQuantumElType : null);
    var dist = normalized && normalized.dist ? normalized.dist : null;
    var ranked = EL_ORDER.map(function(el) {
      return { el: el, value: Number(dist && dist[el] || 0) };
    }).sort(function(a, b) { return a.value - b.value; });
    var fallbackGoodEls = ranked.slice(0, 2).map(function(item) { return item.el; });
    var fallbackBadEls = ranked.slice(-2).map(function(item) { return item.el; });

    var roles = EL_ORDER.map(function(el) {
      var raw = 'neutral';
      if (quantumFn && pillars) {
        try {
          raw = quantumFn(el, pillars, jg, pw, jh) || 'neutral';
        } catch (_) {
          raw = 'neutral';
        }
      }
      if (raw === 'neutral' && dist && Number(dist.total || 0) > 0) {
        if (fallbackGoodEls.indexOf(el) >= 0) raw = 'good';
        else if (fallbackBadEls.indexOf(el) >= 0) raw = 'bad';
      }
      var roleLabel = raw === 'good' ? '유리' : raw === 'bad' ? '주의' : '중립';
      return {
        el: el,
        label: EL_KR[el] || el,
        role: raw,
        roleLabel: roleLabel
      };
    });

    var favorable = roles.filter(function(item) { return item.role === 'good'; }).map(function(item) { return item.label; });
    var caution = roles.filter(function(item) { return item.role === 'bad'; }).map(function(item) { return item.label; });
    var yongshin = (pw && Array.isArray(pw.yongshin) && pw.yongshin.length)
      ? pw.yongshin.slice()
      : favorable.slice();
    var kishin = (pw && Array.isArray(pw.kijishin) && pw.kijishin.length)
      ? pw.kijishin.slice()
      : caution.slice();

    return {
      mode: jg && jg.isJong ? (jg.name || '종격') : '억부+조후',
      johuType: (jh && jh.type) || 'neutral',
      yongshin: yongshin,
      kishin: kishin,
      roles: roles,
      favorableElements: favorable,
      cautionElements: caution
    };
  }

  function _buildCategoryMatrix(riskBreakdown, aptData, quantumDiagnostics, annualPlan, monthlyPlan) {
    var parts = (riskBreakdown && riskBreakdown.parts) || {};
    var apt = (aptData && aptData.components) || {};
    var annual = Array.isArray(annualPlan) ? annualPlan : [];
    var monthly = Array.isArray(monthlyPlan) ? monthlyPlan : [];

    var annualPeak = annual.length ? Math.max.apply(null, annual.map(function(item) { return Number(item.risk || 0); })) : 50;
    var annualLow = annual.length ? Math.min.apply(null, annual.map(function(item) { return Number(item.risk || 0); })) : 50;
    var monthlyPeak = monthly.length ? Math.max.apply(null, monthly.map(function(item) { return Number(item.risk || 0); })) : 50;
    var quantumGood = quantumDiagnostics && Array.isArray(quantumDiagnostics.roles)
      ? quantumDiagnostics.roles.filter(function(item) { return item.role === 'good'; }).length
      : 0;
    var quantumBad = quantumDiagnostics && Array.isArray(quantumDiagnostics.roles)
      ? quantumDiagnostics.roles.filter(function(item) { return item.role === 'bad'; }).length
      : 0;
    var quantumScore = _clamp(55 + (quantumGood * 12) - (quantumBad * 14), 5, 99);

    return [
      {
        key: 'core',
        title: _sibylText("sibyl.title.011"),
        score: _clamp(100 - ((parts.elementImbalance || 50) * 0.45 + (parts.tenStarOverload || 50) * 0.55), 5, 99),
        summary: '오행 편차와 십성 과부하를 합쳐 기본 체질의 흔들림 강도를 산출합니다.',
        action: '고위험 월에는 의사결정 지연 규칙을 강제하고, 안정 월에 성장 과제를 배치하세요.'
      },
      {
        key: 'career',
        title: _sibylText("sibyl.title.012"),
        score: _clamp((apt.career || 0) * 0.6 + (apt.execution || 0) * 0.4, 5, 99),
        summary: '커리어/실행 축을 결합해 실제 성과 전환 가능성을 봅니다.',
        action: '연간 피크 리스크(' + annualPeak + ') 전후에는 확장보다 검증 중심으로 운용하세요.'
      },
      {
        key: 'money',
        title: _sibylText("sibyl.title.013"),
        score: _clamp((apt.wealth || 0) - (parts.monthlyVolatility || 0) * 0.22, 5, 99),
        summary: '재물 포착력에서 월 변동성을 차감해 실수익 지속성을 계산합니다.',
        action: '월간 최고 리스크(' + monthlyPeak + ') 구간은 방어, 저점 구간은 확장으로 분리하세요.'
      },
      {
        key: 'relationship',
        title: _sibylText("sibyl.title.014"),
        score: _clamp((apt.social || 0) - (parts.collision || 0) * 0.25, 5, 99),
        summary: '사회성 점수에서 충형파해 충돌 강도를 보정한 협업 신뢰 지표입니다.',
        action: '갈등 고조 구간에는 문자 기록 기반 합의로 오해 비용을 줄이세요.'
      },
      {
        key: 'recovery',
        title: _sibylText("sibyl.title.015"),
        score: _clamp((apt.recovery || 0) - (parts.johuStress || 0) * 0.22, 5, 99),
        summary: '회복력과 조후 스트레스를 합쳐 번아웃 위험을 계량화합니다.',
        action: '연간 저점(' + annualLow + ') 시기 전에 회복 루틴을 선배치하세요.'
      },
      {
        key: 'quantum',
        title: _sibylText("sibyl.title.016"),
        score: quantumScore,
        summary: '조후/종격/억부를 통합한 오행 유불리를 5원소 단위로 압축한 지표입니다.',
        action: '유리 오행(' + ((quantumDiagnostics && quantumDiagnostics.favorableElements || []).join(', ') || '없음') + ') 중심으로 환경과 일정 리듬을 맞추세요.'
      }
    ].map(function(item) {
      return Object.assign({}, item, { band: _toRiskBand(100 - item.score) });
    });
  }

  /* 적성 계수 (100~999 스케일) */
  function _aptCoeff(dominant, counts, normalized, riskBreakdown) {
    var norm = normalized || {
      tenStarCounts: counts || {},
      dist: _ohaengDist((normalized && normalized.pillars) || window.G_PILLARS || null),
      power: window.G_POWER || null,
      jong: window.G_JONG || null,
      johu: window.G_JOHU || null
    };
    var apt = _calcAptitudeComponents(norm, riskBreakdown || null);
    return apt.score;
  }

  /* 오행 분포 (G_NATAL or 직접 계산) */
  function _ohaengDist(p) {
    var natal = window.G_NATAL;
    if (natal && natal.el) {
      var el = natal.el;
      var total = (el.wood||0)+(el.fire||0)+(el.earth||0)+(el.metal||0)+(el.water||0);
      if (total > 0) return { wood:el.wood||0, fire:el.fire||0, earth:el.earth||0, metal:el.metal||0, water:el.water||0, total:total };
    }
    // 직접 계산 fallback
    var dist = { wood:0, fire:0, earth:0, metal:0, water:0, total:0 };
    if (!p) return dist;
    var ps = _pillarChars(p);
    var chars = [ps.y.g, ps.y.j, ps.m.g, ps.m.j, ps.d.g, ps.d.j, ps.h.g, ps.h.j];
    chars.forEach(function(c) {
      var el = GAN_EL[c] || JI_EL[c];
      if (el) { dist[el]++; dist.total++; }
    });
    return dist;
  }

  /* 주도 오행 */
  function _dominantEl(dist) {
    var best='wood'; var bestN=0;
    EL_ORDER.forEach(function(k){ if((dist[k]||0)>bestN){bestN=dist[k];best=k;} });
    return best;
  }

  /* 오행 명료도 (Clear vs Cloudy) — 가장 강한 오행의 지배율 */
  function _hueClarityStatus(dist) {
    if (!dist.total) return 'unknown';
    var dominant = _dominantEl(dist);
    var ratio = (dist[dominant] || 0) / dist.total;
    // 특정 오행 40% 이상이면 Clear, 과다(55%+) 또는 결핍(0) 오행이 있으면 Cloudy
    var hasVoid = EL_ORDER.some(function(k){ return (dist[k]||0) === 0; });
    if (hasVoid) return 'cloudy';
    if (ratio >= 0.55) return 'cloudy';
    return 'clear';
  }

  function _buildAnnualRiskPlan(normalized, year) {
    var plan = [];
    var baseYear = _toInt(year, new Date().getFullYear());
    var currentAge = _toInt((normalized && normalized.currentAge) || 30, 30);
    var daewunList = (normalized && normalized.daewunList) || [];

    for (var i = 0; i < 10; i += 1) {
      var y = baseYear + i;
      var yz = _getYearGanZhi(y);
      var yearEv = _evalDaewunBridge(yz.gan, yz.zhi);
      var dw = _pickDaewunForAge(currentAge + i, daewunList);
      var dwScore = dw ? Number(dw.score || 50) : 50;
      var conflict = normalized && normalized.pillars ? _collectCollisionSignals(normalized.pillars, y) : { score: 0 };
      var shock = (yearEv.hasChungPenalty ? 1 : 0) + ((conflict.chungCount || 0) >= 1 ? 1 : 0);

      var risk = Math.round(
        (100 - yearEv.score) * 0.56
        + (100 - dwScore) * 0.34
        + Number(conflict.score || 0) * 0.10
      );
      risk = _clamp(risk + (shock * 4), 8, 96);

      plan.push({
        year: y,
        ganZhi: yz.label,
        yearScore: yearEv.score,
        daewunScore: _clamp(Math.round(dwScore), 0, 100),
        risk: risk,
        score: 100 - risk,
        shock: shock,
        summary: (function() {
          var base = String(yearEv.evalSummary || '').trim();
          if (base && base.indexOf('데이터 부족') < 0) return base;
          var dayGan = normalized && normalized.pillars && normalized.pillars.d && normalized.pillars.d.g;
          var ganGod = (dayGan && _calcTenStar(dayGan, yz.gan)) || '중립';
          var zhiGod = (dayGan && _calcTenStar(dayGan, yz.zhi)) || '중립';
          return yz.label + '년은 ' + ganGod + '/' + zhiGod + ' 축 중심의 기본 운용 구간입니다.';
        })(),
        daewunLabel: dw ? (dw.g + dw.j) : (yz.label + ' 기준'),
        conflictNotes: conflict.notes || []
      });
    }

    return plan;
  }

  /* 현재 연도 기준 위험 계수 계산 */
  function _calcRiskCoeff(p, normalizedOpt) {
    var normalized = normalizedOpt || _normalizeSibylInput({ pillars: p }, { pillars: p });
    var annualPlan = _buildAnnualRiskPlan(normalized, normalized.currentYear || new Date().getFullYear());
    var monthlyPlan = _buildMonthlyRiskPlan(
      normalized.pillars,
      normalized.dominantEl,
      normalized.dominantTenStar,
      45,
      normalized.currentYear || new Date().getFullYear(),
      normalized
    );
    var conflict = _collectCollisionSignals(normalized.pillars, normalized.currentYear || new Date().getFullYear());
    var breakdown = _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflict);
    return breakdown.total;
  }

  /* 위험 계수 → Dominator 모드 */
  function _dominatorMode(riskScore) {
    if (riskScore <= 30) return 'nle';
    if (riskScore <= 60) return 'le';
    return 'dd';
  }

  function _toInt(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }

  function _getYearGanZhi(year) {
    var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    var g = GAN[(year - 4 + 6000) % 10];
    var z = ZHI[(year - 4 + 6000) % 12];
    return { gan: g, zhi: z, label: g + z };
  }

  function _buildMonthlyRiskPlan(pillars, dominantEl, dominantTenStar, baseRisk, year, normalized) {
    var plan = [];
    var p = pillars || (normalized && normalized.pillars) || window.G_PILLARS || null;
    var y = _toInt(year, new Date().getFullYear());
    var base = _toInt(baseRisk, 45);
    var dayZhi = p && p.d ? p.d.j : null;
    var monthZhi = p && p.m ? p.m.j : null;
    var focusMap = {
      1: '신호 수집', 2: '관계 조율', 3: '자금 통제', 4: '실행 속도 조절',
      5: '권한 분배', 6: '중간 점검', 7: '리스크 절연', 8: '성과 확정',
      9: '협업 재배치', 10: '중장기 설계', 11: '소진 방지', 12: '연말 정산'
    };
    var monthNarrative = [
      '초기 조건을 정돈해야 이후 변동성을 흡수할 수 있습니다.',
      '대인 의사결정에서 속도보다 합의 품질을 우선해야 합니다.',
      '현금 흐름의 체온을 안정시키는 달입니다.',
      '성과 욕심이 커지는 만큼 안전장치가 필요합니다.',
      '권한과 책임의 경계를 명확히 해야 손실을 막습니다.',
      '중간 점검을 통해 잘못된 가정을 조기에 수정해야 합니다.',
      '외부 변수 유입이 많아 방어 전략이 핵심이 됩니다.',
      '집중 실행으로 성과를 고정하기 좋은 구간입니다.',
      '협업 구조를 재배치하면 마찰 비용이 크게 줄어듭니다.',
      '내년을 위한 자원 재배분이 필요한 달입니다.',
      '체력과 감정 회복 루틴을 먼저 확보해야 합니다.',
      '연말 결산과 정리가 다음 사이클의 출발점을 만듭니다.'
    ];

    var CHONG = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };

    for (var month = 1; month <= 12; month += 1) {
      var gz = _getMonthGanZhiFor(y, month);
      var ev = _evalDaewunBridge(gz.g, gz.j);
      var fortune = _analyzeFortuneBridge(gz, p, y + '년 ' + month + '월');
      var battery = Number(fortune.batteryPercent || 50);

      var structural = 0;
      if (dayZhi && CHONG[dayZhi] === gz.j) structural += 12;
      if (monthZhi && CHONG[monthZhi] === gz.j) structural += 8;
      if (ev.hasChungPenalty) structural += 10;
      if (ev.hasChungBonus) structural -= 8;

      var risk = Math.round(
        (100 - ev.score) * 0.56
        + (100 - battery) * 0.24
        + base * 0.20
        + structural
      );
      risk = _clamp(risk, 8, 95);

      var caution = (fortune.grade || '무난') + ' · ' + (fortune.gGod || '중립') + '/' + (fortune.jGod || '중립');
      if (risk >= 70) caution += ' · 충돌 고조 구간';
      if (dominantTenStar === '비견' || dominantTenStar === '겁재') caution += ' · 독단 경계';
      if (dominantTenStar === '편관' || dominantTenStar === '정관') caution += ' · 권위 마찰 경계';

      var countermeasure;
      if (risk >= 75) {
        countermeasure = '의사결정을 24시간 유예하고 계약/금전은 2중 검토. 핵심 관계는 문자 기록으로 분쟁 여지를 차단하세요.';
      } else if (risk >= 55) {
        countermeasure = '주간 목표를 3개로 제한하고, 일정·지출·대화를 같은 날 점검하세요. 실행보다 조정의 비중을 높이세요.';
      } else {
        countermeasure = '강점 실행 창입니다. ' + focusMap[month] + '에 집중하고 성과 로그를 남겨 다음 달 변동성 완충 자산으로 전환하세요.';
      }

      plan.push({
        month: month,
        year: y,
        ganZhi: gz.g + gz.j,
        monthZhi: gz.j,
        risk: risk,
        engineScore: ev.score,
        battery: battery,
        caution: caution,
        countermeasure: countermeasure,
        focus: focusMap[month],
        summary: monthNarrative[month - 1],
        checkpoints: [
          month + '월 핵심 KPI 2개만 유지',
          '관계 갈등 신호 48시간 이내 해소',
          '주간 회복 루틴 최소 2회 고정'
        ],
        adviceItems: fortune.adviceItems || []
      });
    }
    return plan;
  }

  function _buildLocalDominatorReport(payload, analysisData) {
    var profile = payload && payload.profile ? payload.profile : {};
    var year = _toInt(payload && payload.currentYear, new Date().getFullYear());

    var normalized = _normalizeSibylInput(payload || {}, analysisData || {});
    var dominantTenStar = normalized.dominantTenStar || SIBYL_PRIMARY_TENGOD_FALLBACK;
    var dominantEl = normalized.dominantEl || 'water';

    var monthlyPlan = _buildMonthlyRiskPlan(
      normalized.pillars,
      dominantEl,
      dominantTenStar,
      _toInt(payload && payload.riskScore, 45),
      year,
      normalized
    );
    var annualPlan = _buildAnnualRiskPlan(normalized, year);
    var conflictSignals = _collectCollisionSignals(normalized.pillars, year);
    var riskBreakdown = _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflictSignals);
    var aptData = _calcAptitudeComponents(normalized, riskBreakdown);
    var normalizedProfile = buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    var validation = validateSibylProfile(normalizedProfile);

    var risk = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var coeff = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.aptitudeScore, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
    dominantTenStar = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.tenGods && normalizedProfile.saju.tenGods.primary, dominantTenStar);
    dominantEl = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.dominantElement, dominantEl);
    var quantumDiagnostics = _collectQuantumDiagnostics(normalized);
    var categoryMatrix = _buildCategoryMatrix(riskBreakdown, aptData, quantumDiagnostics, annualPlan, monthlyPlan);

    var topRiskMonths = monthlyPlan.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var lowRiskMonths = monthlyPlan.slice().sort(function(a, b) { return a.risk - b.risk; }).slice(0, 3);
    var topRiskYears = annualPlan.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var lowRiskYears = annualPlan.slice().sort(function(a, b) { return a.risk - b.risk; }).slice(0, 3);

    normalized.monthlyPlan = monthlyPlan;
    normalized.annualPlan = annualPlan;
    normalized.collisionSignals = conflictSignals;

    var chapter1 = [
      '## 핵심 진단 요약',
      '- 입력 사주: ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.birthDate, '입력값 확인 필요') + ' ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.birthTime, '시간 미상') + ' / ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.gender, 'unknown'),
      '- 지배 오행: ' + (EL_KR[dominantEl] || dominantEl),
      '- 주도 십성: ' + dominantTenStar,
      '- 적성 계수: ' + coeff + ' / 999',
      '- 위험 계수: ' + risk + ' / 100 (' + riskBreakdown.label + ')',
      '- 데이터 신뢰도: ' + (validation.ok ? '양호' : '보강 필요'),
      '',
      '## 데이터 신뢰도 경고',
      ((validation.missingFields.length || (normalizedProfile.debug && normalizedProfile.debug.warnings && normalizedProfile.debug.warnings.length))
        ? ([]
          .concat(validation.missingFields.map(function(msg) { return msg + ' 누락'; }))
          .concat(normalizedProfile.debug && normalizedProfile.debug.warnings ? normalizedProfile.debug.warnings : [])
          .slice(0, 8)
          .map(function(msg) { return '- ' + msg; }).join('\n'))
        : '- 핵심 계산 필드가 정상적으로 연결되어 있습니다.'),
      '',
      '## 리스크 6분해 결과',
      '- 오행 불균형: ' + riskBreakdown.parts.elementImbalance,
      '- 십성과부하: ' + riskBreakdown.parts.tenStarOverload,
      '- 충·형·파·해: ' + riskBreakdown.parts.collision,
      '- 대운·세운 충돌: ' + riskBreakdown.parts.daewunSeunConflict,
      '- 월별 변동성: ' + riskBreakdown.parts.monthlyVolatility,
      '- 조후 스트레스: ' + riskBreakdown.parts.johuStress,
      '',
      '이 수치는 단일 점수 요약이 아니라, 실제 엔진 데이터(대운평가/월운평가)를 기반으로 위험의 출처를 분리한 결과입니다. 따라서 점수 변화가 생기면 어떤 하위 축이 움직였는지 즉시 추적할 수 있습니다.'
    ].join('\n');

    var chapter2 = [
      '## 오행 불균형 상세',
      '- 목(木): ' + (normalized.dist.wood || 0) + ' / 화(火): ' + (normalized.dist.fire || 0) + ' / 토(土): ' + (normalized.dist.earth || 0) + ' / 금(金): ' + (normalized.dist.metal || 0) + ' / 수(水): ' + (normalized.dist.water || 0),
      '- 총합 기준 편차가 클수록 스트레스 사건이 특정 축으로 몰립니다.',
      '- 결핍 오행은 대응 루틴을 만들어 보강하지 않으면, 세운 충격이 올 때 방어층이 급격히 얇아집니다.',
      '',
      '## 십성 구조와 직업적 긴장',
      '- 비견/겁재 합: ' + _bijabCount(normalized.tenStarCounts),
      '- 재성 합: ' + ((normalized.tenStarCounts['편재'] || 0) + (normalized.tenStarCounts['정재'] || 0)),
      '- 관성 합: ' + ((normalized.tenStarCounts['편관'] || 0) + (normalized.tenStarCounts['정관'] || 0)),
      '- 인성 합: ' + ((normalized.tenStarCounts['편인'] || 0) + (normalized.tenStarCounts['정인'] || 0)),
      '',
      '십성 과부하 구간은 장점이 아닌 병목으로 작동합니다. 예를 들어 비겁이 과하면 실행력이 높아도 협업 비용이 커지고, 관성이 과하면 안정성은 높아도 변화 대응 속도가 느려집니다. 이번 리포트는 이 병목을 월별/연별 타이밍과 연결해 언제 수비하고 언제 밀어야 하는지 제시합니다.'
    ].join('\n');

    var chapter3 = [
      '## 적성 5요소 프로파일',
      '- Career: ' + aptData.components.career,
      '- Wealth: ' + aptData.components.wealth,
      '- Execution: ' + aptData.components.execution,
      '- Social: ' + aptData.components.social,
      '- Recovery: ' + aptData.components.recovery,
      '',
      '## 실행 전략',
      '- 커리어와 실행 점수가 높으면 프로젝트 주도권을 직접 가져가되, 사회 점수가 낮은 달에는 합의 지연 비용을 고려해야 합니다.',
      '- 재물 점수는 기회 포착력보다 손실 회피력과 함께 읽어야 합니다. 고점 월에는 확대, 저점 월에는 유동성 확보를 우선하십시오.',
      '- 회복 점수는 단순 휴식 지표가 아니라 성과 지속성 지표입니다. 회복이 낮은 구간에서 무리하면 다음 분기의 실행 점수까지 연쇄 하락합니다.',
      '',
      '즉, 적성 계수 999 스케일은 화려한 숫자보다 배분 전략에 의미가 있습니다. 같은 점수라도 구성요소가 다르면 처방이 완전히 달라집니다.'
    ].join('\n');

    var chapter4 = [
      '## 주도 십성 요약',
      '- 주도 십성: ' + dominantTenStar,
      '- 비견/겁재 합: ' + _bijabCount(normalized.tenStarCounts),
      '- 재성 합: ' + ((normalized.tenStarCounts['편재'] || 0) + (normalized.tenStarCounts['정재'] || 0)),
      '- 관성 합: ' + ((normalized.tenStarCounts['편관'] || 0) + (normalized.tenStarCounts['정관'] || 0)),
      '- 인성 합: ' + ((normalized.tenStarCounts['편인'] || 0) + (normalized.tenStarCounts['정인'] || 0)),
      '',
      '## 행동 패턴 해석',
      '- 업무 패턴: 주도 십성이 강한 구간에서 실행 속도는 빨라지나, 검증 단계를 생략하면 재작업 비용이 커집니다.',
      '- 관계 패턴: 비겁/관성 균형이 무너지면 설득보다 대립으로 흐르기 쉬워 기록 기반 합의가 필요합니다.',
      '- 돈/결정 패턴: 재성 대비 관성 비율이 낮은 달에는 이익보다 손실 방어 규칙을 먼저 고정해야 합니다.',
      '- 감정 흔들림 반응: 회복 점수가 내려가는 달에는 결정을 하루 지연해 오류 확률을 줄이세요.',
      '',
      '## 주도 십성을 좋게 쓰는 방법',
      '- 강점 축은 주간 단위 실행 목표 1개로 집중하고, 약점 축은 체크리스트 자동화로 보완합니다.',
      '- 과잉 작동 신호가 보이면 일정/대화/의사결정 속도를 분리해 동시 리스크를 낮춥니다.'
    ].join('\n');

    var annualNarrative = annualPlan.map(function(item, idx) {
      var rank = idx + 1;
      var riskBand = item.risk >= 75 ? '고위험' : item.risk >= 55 ? '경계' : item.risk >= 35 ? '중립' : '안정';
      var playbook = item.risk >= 70
        ? '수비 우선: 신규 확장보다 리스크 절연, 계약은 분할 체결.'
        : item.risk >= 50
          ? '균형 운용: 실행과 검증을 5:5로 배분.'
          : '공격 운용: 핵심 과제 1개를 강하게 밀어 성과 고정.';
      var note = item.conflictNotes && item.conflictNotes.length
        ? item.conflictNotes.slice(0, 2).join(' / ')
        : '직격 충형파해는 제한적.';
      return [
        '## Y' + rank + ' · ' + item.year + '년 (' + item.ganZhi + ')',
        '- 통합 위험: ' + item.risk + ' (' + riskBand + ')',
        '- 세운 점수: ' + item.yearScore + ' / 대운 점수: ' + item.daewunScore + ' [' + item.daewunLabel + ']',
        '- 충격 신호: ' + item.shock + '단계',
        '- 핵심 관찰: ' + note,
        '- 실행 지침: ' + playbook,
        '- 요약: ' + item.summary
      ].join('\n');
    }).join('\n\n');

    var monthlyNarrative = monthlyPlan.map(function(item) {
      var band = item.risk >= 75 ? '고위험' : item.risk >= 55 ? '경계' : item.risk >= 35 ? '중립' : '안정';
      var tactical = item.risk >= 70
        ? '중요 안건은 24시간 숙성 후 확정.'
        : item.risk >= 50
          ? '주간 우선순위 3개 이하 유지.'
          : '확신 구간 과제를 전진 배치.';
      var advice = (item.adviceItems && item.adviceItems.length)
        ? String(item.adviceItems[0].body || '').replace(/\s+/g, ' ').trim()
        : '월운 조언 데이터 없음';
      return [
        '## M' + String(item.month).padStart(2, '0') + ' · ' + item.month + '월 (' + item.ganZhi + ')',
        '- 위험 ' + item.risk + ' / 엔진점수 ' + item.engineScore + ' / 배터리 ' + item.battery,
        '- 리스크 밴드: ' + band,
        '- 포커스: ' + item.focus,
        '- 주의: ' + item.caution,
        '- 대응: ' + item.countermeasure,
        '- 전략 키워드: ' + tactical,
        '- 월간 코멘트: ' + item.summary,
        '- 엔진 조언: ' + advice
      ].join('\n');
    }).join('\n\n');

    var chapter5 = [
      '## 오행 분포',
      '- 목(木): ' + (normalized.dist.wood || 0) + ' / 화(火): ' + (normalized.dist.fire || 0) + ' / 토(土): ' + (normalized.dist.earth || 0) + ' / 금(金): ' + (normalized.dist.metal || 0) + ' / 수(水): ' + (normalized.dist.water || 0),
      '- 지배 오행: ' + (EL_KR[dominantEl] || dominantEl),
      '- 과다/결핍 축은 월별 집중력과 회복력에 직접 영향을 줍니다.',
      '',
      '## 퀀텀 오행 유불리',
      '- 유리 오행: ' + ((quantumDiagnostics.favorableElements || []).join(', ') || '중립(추정)'),
      '- 주의 오행: ' + ((quantumDiagnostics.cautionElements || []).join(', ') || '중립(추정)'),
      '- 용신 배열: ' + ((quantumDiagnostics.yongshin || []).join(', ') || '중립(추정)'),
      '- 기신 배열: ' + ((quantumDiagnostics.kishin || []).join(', ') || '중립(추정)'),
      '',
      '## 환경/루틴 설계',
      '- 유리 오행에 맞춘 작업 환경을 주간 루틴에 고정해 에너지 누수를 줄입니다.',
      '- 주의 오행이 강한 달에는 대면 일정과 고난도 결정을 분산 배치합니다.'
    ].join('\n');

    var chapter6 = [
      '## 10년 리스크 맵 (실연동)',
      annualNarrative,
      '',
      '## 최고 위험 3개 연도',
      topRiskYears.map(function(yItem) { return '- ' + yItem.year + '년: 위험 ' + yItem.risk + ' (' + yItem.ganZhi + ')'; }).join('\n'),
      '',
      '## 안정 3개 연도',
      lowRiskYears.map(function(yItem) { return '- ' + yItem.year + '년: 위험 ' + yItem.risk + ' (' + yItem.ganZhi + ')'; }).join('\n')
    ].join('\n');

    var chapter7 = [
      '## 월별 리스크 플래너 (12개월)',
      monthlyNarrative,
      '',
      '## 고위험 3개월',
      topRiskMonths.map(function(mItem) { return '- ' + mItem.month + '월: 위험 ' + mItem.risk + ' · ' + mItem.focus; }).join('\n'),
      '',
      '## 안정 3개월',
      lowRiskMonths.map(function(mItem) { return '- ' + mItem.month + '월: 위험 ' + mItem.risk + ' · ' + mItem.focus; }).join('\n')
    ].join('\n');

    var chapter8 = [
      '## 관계 기본 성향',
      '- Social 점수: ' + aptData.components.social,
      '- 주도 십성: ' + dominantTenStar,
      '- 충·형·파·해 신호: 충 ' + (conflictSignals.chungCount || 0) + ' / 형 ' + (conflictSignals.hyungCount || 0) + ' / 파 ' + (conflictSignals.paCount || 0) + ' / 해 ' + (conflictSignals.haeCount || 0),
      '',
      '## 관계/애정 패턴',
      '- 가까워질 때: 공통 목표가 분명할수록 신뢰 형성이 빠릅니다.',
      '- 멀어질 때: 피로가 누적된 달에는 설명 생략으로 오해가 커지기 쉽습니다.',
      '- 갈등 지점: 고위험 월에는 속도전 대화보다 확인형 대화가 유리합니다.',
      '- 협업 주의: 역할/완료 기준을 먼저 문서화하면 재충돌을 줄일 수 있습니다.',
      '- 회복 전략: 회복 점수 저점 달에는 관계 이슈를 일괄 처리하지 말고 우선순위를 분리하세요.'
    ].join('\n');

    var chapter9 = [
      '## 직업/재물 전략 요약',
      '- Career: ' + aptData.components.career + ' / Wealth: ' + aptData.components.wealth + ' / Execution: ' + aptData.components.execution,
      '- 위험 계수: ' + risk + ' / 적성 계수: ' + coeff,
      '',
      '## 분야별 실행 매뉴얼',
      '- 직업 성향: 주도 십성과 실행 점수 축을 기준으로 역할을 좁혀 성과를 고정합니다.',
      '- 수익 전략: 고위험 월에는 현금흐름 방어, 안정 월에는 고효율 채널 확장을 적용합니다.',
      '- 손실 패턴: 변동성 상위 월에 다중 의사결정을 겹치지 않는 것이 핵심입니다.',
      '- 프로젝트 운영: 단독/협업 비율을 월별 리스크 밴드에 맞춰 동적으로 조정합니다.',
      '',
      '## 30/90/180일 실행 전략',
      '- 30일: 손실 누수 차단(계약 검토 루틴, 의사결정 로그화).',
      '- 90일: 성과 고정(핵심 프로젝트 1개 집중, 협업 규칙 명문화).',
      '- 180일: 포트폴리오 재편(강점 영역 확장 + 고위험 업무 자동화).'
    ].join('\n');

    var chapter10 = [
      '## 최종 시빌라 메시지',
      '- 지금 가장 중요한 위험 축: ' + (riskBreakdown.parts.daewunSeunConflict >= riskBreakdown.parts.elementImbalance ? '대운·세운 충돌' : '오행 불균형'),
      '- 지금 가장 강한 기회 축: ' + Object.keys(aptData.components || {}).sort(function(a, b) { return (aptData.components[b] || 0) - (aptData.components[a] || 0); }).slice(0, 1).join(', '),
      '- 당장 바꿔야 할 1가지: 고위험 월 의사결정 지연 규칙(24시간) 적용.',
      '- 당장 강화해야 할 1가지: 안정 월 핵심 과제 단일트랙 집중.',
      '',
      '## 실행 루틴',
      '- 7일: 위험 상위 신호 1개만 추적하며 일정 충돌 제거.',
      '- 30일: 손실/성과 지표 1개씩 고정하고 루틴 유지율 점검.',
      '- 90일: 전략 유지/폐기 항목을 분리해 운영 규칙 업데이트.',
      '',
      '## 개운 처방전',
      '- 주도 십성 ' + dominantTenStar + ' 강점은 유지하되 과잉 구간에서 속도보다 검증을 우선합니다.',
      '- 유리 오행(' + ((quantumDiagnostics.favorableElements || []).join(', ') || '중립') + ') 중심의 환경·루틴을 고정합니다.',
      '',
      '실전 선언문: "고위험 구간에는 방어를 우선하고, 저위험 구간에는 집중 실행한다. 분석 결과를 행동 규칙으로 전환한다."'
    ].join('\n');

    var canonicalData = _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);

    var chapters = [
      { key: 'coreMatrix', title: _sibylText("sibyl.title.017"), content: chapter1 },
      { key: 'riskAnalysis', title: _sibylText("sibyl.title.018"), content: chapter2 },
      { key: 'aptitudeAnalysis', title: _sibylText("sibyl.title.019"), content: chapter3 },
      { key: 'tenGodPattern', title: _sibylText("sibyl.title.020"), content: chapter4 },
      { key: 'elementBalance', title: _sibylText("sibyl.title.021"), content: chapter5 },
      { key: 'yearlyFlow', title: _sibylText("sibyl.title.022"), content: chapter6 },
      { key: 'monthlyPlanner', title: _sibylText("sibyl.title.023"), content: chapter7 },
      { key: 'relationship', title: _sibylText("sibyl.title.024"), content: chapter8 },
      { key: 'moneyCareer', title: _sibylText("sibyl.title.025"), content: chapter9 },
      { key: 'finalMessage', title: _sibylText("sibyl.title.026"), content: chapter10 }
    ];

    var localTotals = _ensureSibylPremiumTotalChars(chapters, SIBYL_MIN_PREMIUM_TOTAL_CHARS, canonicalData);
    chapters = localTotals.chapters.map(function(ch) {
      return {
        key: ch.key,
        title: ch.title,
        content: _sanitizeSibylChapterContent(String(ch.content || '').trim())
      };
    });

    var chapterMap = {};
    chapters.forEach(function(ch) {
      chapterMap[ch.key] = String(ch.content || '').trim();
    });

    var qualityState = {
      chapters: chapters,
      chapterMap: chapterMap
    };
    dedupeSibylReportText(qualityState);
    chapters = qualityState.chapters;
    chapterMap = {};
    chapters.forEach(function(ch) {
      chapterMap[ch.key] = String(ch.content || '').trim();
    });

    var placeholderCheck = assertNoPlaceholderText(qualityState);
    var chapterMatchCheck = assertChapterCategoryMatch(qualityState);
    var sectionCheck = validateSibylReportSections(qualityState);

    if (_isSibylDevMode()) {
      _sibylLogInfo('[SibylReport] seed resolved', {
        dominantEl: dominantEl,
        dominantTenStar: dominantTenStar,
        risk: risk,
        aptitude: coeff
      });
      _sibylLogInfo('[SibylReport] chapter count', chapters.length);
      _sibylLogInfo('[SibylReport] chart slots', ['risk-breakdown', 'aptitude-profile', 'quantum-element-balance', 'ten-year-risk-map', 'monthly-risk-planner']);
      _sibylLogInfo('[SibylReport] placeholder count', placeholderCheck.placeholderCount);
      _sibylLogInfo('[SibylReport] duplicate sentence count', qualityState.__duplicateSentenceCount || 0);
      _sibylLogInfo('[SibylReport] render body isolated', true);
      if (!chapterMatchCheck.ok) _sibylLogWarn('[SibylReport] chapter-category warnings', chapterMatchCheck.warnings);
      if (!sectionCheck.ok) _sibylLogWarn('[SibylReport] section validation warning', sectionCheck);
    }

    var totalChars = localTotals.totalChars;

    return {
      source: 'local-saju-engine-bridge',
      model: 'local',
      totalChars: totalChars,
      minTotalChars: SIBYL_MIN_PREMIUM_TOTAL_CHARS,
      generatedAt: Date.now(),
      riskScore: risk,
      aptCoeff: coeff,
      dominantTenStar: dominantTenStar,
      dominantEl: dominantEl,
      monthlyRiskPlan: monthlyPlan,
      annualRiskPlan: annualPlan,
      riskBreakdown: riskBreakdown,
      aptitudeComponents: aptData.components,
      quantumDiagnostics: quantumDiagnostics,
      categoryMatrix: categoryMatrix,
      integrity: normalized.integrity,
      chartSlots: {
        riskBreakdown: 'risk-breakdown',
        aptitudeProfile: 'aptitude-profile',
        quantumElementBalance: 'quantum-element-balance',
        tenYearRiskMap: 'ten-year-risk-map',
        monthlyRiskPlanner: 'monthly-risk-planner'
      },
      chapterMap: chapterMap,
      canonicalData: canonicalData,
      chapters: chapters
    };
  }

  /* 10년 위험 그래프 데이터 */
  function _buildRiskGraph(pOrNormalized, annualPlan) {
    if (Array.isArray(annualPlan) && annualPlan.length) {
      return annualPlan.map(function(item) {
        return {
          year: item.year,
          zhi: (item.ganZhi || '').slice(1),
          risk: _clamp(Math.round(item.risk), 8, 96)
        };
      });
    }

    var normalized = (pOrNormalized && pOrNormalized.pillars)
      ? pOrNormalized
      : _normalizeSibylInput({ pillars: pOrNormalized }, { pillars: pOrNormalized });
    var plan = _buildAnnualRiskPlan(normalized, normalized.currentYear || new Date().getFullYear());
    return plan.map(function(item) {
      return {
        year: item.year,
        zhi: (item.ganZhi || '').slice(1),
        risk: _clamp(Math.round(item.risk), 8, 96)
      };
    });
  }

  /* SVG 그래프 렌더링 */
  function _renderRiskSVG(data, svgEl) {
    var W = 680, H = 160, PAD = { l: 40, r: 20, t: 20, b: 30 };
    var n = data.length;
    var xs = W - PAD.l - PAD.r;
    var ys = H - PAD.t - PAD.b;
    var pts = data.map(function(d, i) {
      var x = PAD.l + (i / (n - 1)) * xs;
      var y = PAD.t + (1 - d.risk / 100) * ys;
      return { x: x, y: y, d: d };
    });

    var fillPath = 'M ' + pts.map(function(p){ return p.x+' '+p.y; }).join(' L ') + ' L ' + (PAD.l + xs) + ' ' + (H - PAD.b) + ' L ' + PAD.l + ' ' + (H - PAD.b) + ' Z';
    var linePath = 'M ' + pts.map(function(p){ return p.x+' '+p.y; }).join(' L ');

    var svgContent = '<defs>'
      + '<linearGradient id="sbRiskGrad" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#ff2143" stop-opacity="0.5"/>'
      + '<stop offset="100%" stop-color="#ff2143" stop-opacity="0"/>'
      + '</linearGradient>'
      + '</defs>'
      // Grid lines
      + [25,50,75].map(function(v) {
          var gy = PAD.t + (1 - v/100) * ys;
          return '<line x1="'+PAD.l+'" y1="'+gy+'" x2="'+(PAD.l+xs)+'" y2="'+gy+'" stroke="rgba(0,200,255,0.1)" stroke-dasharray="4,4"/>'
               + '<text x="'+(PAD.l - 4)+'" y="'+(gy+4)+'" fill="rgba(0,200,255,0.4)" font-size="9" text-anchor="end" font-family="monospace">'+v+'</text>';
        }).join('')
      // Area
      + '<path d="'+fillPath+'" fill="url(#sbRiskGrad)"/>'
      // Line
      + '<path d="'+linePath+'" fill="none" stroke="#ff4560" stroke-width="2" stroke-linejoin="round"/>'
      // Dots
      + pts.map(function(pt) {
          var r = pt.d.risk >= 60 ? 5 : 3.5;
          var c = pt.d.risk >= 70 ? '#ff2143' : pt.d.risk >= 50 ? '#ffb800' : '#00c8ff';
          var label = pt.d.year.toString().slice(2) + '/' + pt.d.zhi;
          return '<circle cx="'+pt.x+'" cy="'+pt.y+'" r="'+r+'" fill="'+c+'" stroke="#000814" stroke-width="1.5"/>'
               + '<text x="'+pt.x+'" y="'+(H - PAD.b + 16)+'" fill="rgba(150,200,220,0.7)" font-size="8" text-anchor="middle" font-family="monospace">'+label+'</text>';
        }).join('');

    svgEl.setAttribute('viewBox', '0 0 '+W+' '+H);
    svgEl.innerHTML = svgContent;
  }

  /* 비겁 과다 경보 — 일간 천간 직접 추출, G_POWER 의존 제거 */
  function _buildSmartWarning(pillars, dominant, counts, dist) {
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* ① 일간 원소: 천간에서 직접 계산 (G_POWER 미로딩 시에도 정확) */
    var dayGan = pillars && pillars.d && pillars.d.g;
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaeCount = jaeEl ? (dist[jaeEl] || 0) : 0;
    var jaePct   = Math.round(jaeCount / total * 100);
    /* ② 신강/신약: G_POWER 우선, 없으면 생아+비겁 원소 비율 계산 */
    var isStrong;
    if (power && typeof power.isStrong === 'boolean') {
      isStrong = power.isStrong;
    } else {
      var PAIEL_W = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
      var parElW = PAIEL_W[dayEl];
      var friendW = (dist[dayEl] || 0) + (parElW ? (dist[parElW] || 0) : 0);
      isStrong = (friendW * 2 >= total);
    }
    var bc = (counts['비견'] || 0) + (counts['겁재'] || 0);
    /* 비겁 과다: G_POWER.isStrong + 원소 비율 25% 이상 OR 십성 카운트 3개 이상 */
    if ((isStrong && bijabPct >= 25) || bc >= BIJAB_WARN_THRESHOLD) {
      if (jaeCount === 0) {
        return '비겁(比劫) 극강 + 재성(財星) 완전 공망. 강한 일간 에너지의 출구가 막혀 있습니다 — 독단, 고집, 재물 무감각이 동시에 구조화됩니다. 가장 강한 원국이 가장 위험한 패턴이 되는 역설입니다.';
      }
      if (jaePct < 15) {
        return '비겁(比劫) 과잉 경보. [동류 원소 비중 ' + bijabPct + '%] 재물 에너지(' + (EL_KR[jaeEl] || jaeEl) + ' ' + jaePct + '%)가 심각하게 취약합니다. 독단적 판단 반복과 조언 거부 패턴이 장기 고립과 경제적 정체로 이어질 수 있습니다.';
      }
      return '비겁(比劫) 과다 경보. [동류 원소 비중 ' + bijabPct + '%] 독단적 판단과 협력 거부 성향이 팀 기반 업무에서 반복적 마찰을 일으킵니다. 강점이 반복되면 독이 됩니다.';
    }
    /* 관성 압박: 신약한데 관성이 주도하는 경우 */
    if (!isStrong && (dominant === '편관' || dominant === '정관')) {
      return '관성(官星) 압박 감지. 규율·통제 에너지가 약한 일간을 제압하고 있습니다. 과도한 완벽주의·자기비판·상급자 눈치가 자발적 성장 동력을 차단할 수 있습니다.';
    }
    /* 재성 과중: 실제로 재성 원소 비중 + 십성 카운트 모두 높을 때만 경고 */
    var jaeStarCount = (counts['편재'] || 0) + (counts['정재'] || 0);
    if (!isStrong && jaeStarCount >= 2 && jaePct >= 25) {
      return '재성(財星) 과중 경보. 재물 에너지 비중(' + jaePct + '%)이 일간을 압박합니다. 금전·통제 욕구가 인간관계를 소모시키고 지속 가능성을 저하시킵니다.';
    }
    return null;
  }
  /* 하위 호환: 구버전 호출부 대응 */
  function _bijabWarning(counts, dominant) {
    return _buildSmartWarning(null, dominant, counts, _ohaengDist(window.G_PILLARS));
  }

  /* ── 무료 성향 분석 HTML 빌드 (1000자+) ── */
  function _buildNatureAnalysis(pillars, dist, dominant, counts) {
    var dayGan = pillars && pillars.d && pillars.d.g;
    var nature = (dayGan && DAYGAN_NATURE[dayGan]) || DAYGAN_NATURE['壬'];
    var tenNature = (dominant && TENSTAR_NATURE[dominant]) || TENSTAR_NATURE['편재'];
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* 일간 원소 직접 추출 */
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaePct = jaeEl ? Math.round((dist[jaeEl] || 0) / total * 100) : 0;
    /* 신강/신약 fallback */
    var isStrong;
    if (power && typeof power.isStrong === 'boolean') {
      isStrong = power.isStrong;
    } else {
      var PAIEL_N = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
      var parElN = PAIEL_N[dayEl];
      var friendCntN = (dist[dayEl] || 0) + (parElN ? (dist[parElN] || 0) : 0);
      isStrong = (friendCntN * 2 >= total);
    }
    var powerScore = power ? (power.score || 0) : 0;
    var powerLabel = isStrong
      ? '신강(身强)' + (powerScore ? ' ' + powerScore + '점' : '') + ' — 일간 에너지 과잉, 설기(泄氣)·억제 필요'
      : '신약(身弱)' + (powerScore ? ' ' + powerScore + '점' : '') + ' — 일간 에너지 부족, 생조(生助) 필요';
    var bc = (counts['비견'] || 0) + (counts['겁재'] || 0);
    var html = '';

    /* ■ Block 1: 일간 기질 */
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ INNATE DISPOSITION — 타고난 기질 분석</div>'
      + '<div class="sb-nature-label">' + nature.name + ' &nbsp;&middot;&nbsp; <span class="sb-nature-type">' + nature.type + '</span></div>'
      + '<p class="sb-nature-body">' + nature.nature + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">직업 강점</span><span class="sb-nature-val">' + nature.strength + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">구조적 약점</span><span class="sb-nature-val sb-nature-val--warn">' + nature.weakness + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">적합 직군</span><span class="sb-nature-val">' + nature.career + '</span></div>'
      + '</div>';

    /* ■ Block 2: 십성 에너지 벡터 */
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ TENSTAR VECTOR — 주도 십성 [' + dominant + '] 직업 에너지</div>'
      + '<p class="sb-nature-body">' + tenNature.profile + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">핵심 역량</span><span class="sb-nature-val">' + tenNature.pro + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">⚠ 주의 패턴</span><span class="sb-nature-val sb-nature-val--warn">' + tenNature.con + '</span></div>'
      + '</div>';

    /* ■ Block 2-B: 십성 분포 기반 인간관계 패턴 분석 */
    (function() {
      var RELATIONSHIP_PATTERN = {
        '식신': { title:_sibylText("sibyl.title.027"), pattern:'관계에서 먼저 주는 역할을 맡아 상대를 편안하게 만드는 에너지를 타고났습니다. 식신이 강한 사람은 대화 중 상대를 웃게 만들고, 아이디어와 유머로 분위기를 이끄는 능력이 있어 자연스럽게 인기를 끕니다. 그러나 지나치게 베풀다 보면 에너지가 소진되고, 보상을 기대하지 않는 척하면서도 내면에 쌓이는 아쉬움이 관계 균열의 씨앗이 됩니다. 직접 요청 대신 돌려 말하는 방식으로 욕구를 표현하는 패턴이 반복되면 파트너가 진짜 필요를 파악하지 못해 단절이 심화됩니다. 인간관계에서 자신의 한계를 명확히 설정하는 "No 연습"이 장기 관계 지속성에 결정적입니다.', warning:'기대와 실망의 반복으로 인한 피로 누적. 베풂의 한계 설정 훈련이 필수.' },
        '상관': { title:_sibylText("sibyl.title.028"), pattern:'상관이 주도하는 명식은 인간관계에서 타인의 불합리함을 즉시 지적하고, 권위에 도전하는 에너지가 강합니다. 날카로운 언어적 표현력으로 상대를 압도하지만, 그 과정에서 의도치 않게 깊은 상처를 남기는 경우가 반복됩니다. 상급자·선배·부모와의 관계에서 구조적 충돌이 일어나기 쉬우며, 자신도 모르게 관계의 규칙을 어기는 패턴이 진로·인간관계 단절의 주요 원인이 됩니다. 한편, 자신과 비슷한 독립 성향의 파트너와는 극도로 강력한 시너지를 낼 수 있습니다. 관계에서 "충분히 생각하고 말하기"를 의식적으로 훈련하는 것이 생존 전략입니다.', warning:'권위 충돌과 충동 발언으로 인한 관계 파괴 패턴. 인내심 훈련이 핵심.' },
        '편재': { title:_sibylText("sibyl.title.029"), pattern:'편재가 주도하는 명식은 넓고 빠르게 인맥을 확장하지만, 깊이 있는 단일 관계 유지에 어려움이 있습니다. 상대를 자신의 기준으로 통제하거나 관리하려는 본능적 욕구가 있어, 관계가 깊어질수록 파트너에게 압박감을 줄 수 있습니다. 재물과 이해관계를 기반으로 관계를 개설하고 유지하는 패턴이 있어, 이익이 사라지면 관계도 흐릿해지는 구조가 내재해 있습니다. 감성적 공감보다 실용적 거래 언어가 자연스러우며, 이것이 장기 감성 파트너십에서 마찰 원인이 됩니다. 비이해관계 기반 관계를 의도적으로 구축하는 노력이 중요합니다.', warning:'인맥 관리의 도구화 경향. 감성 공감 능력 의식적 개발이 필요.' },
        '정재': { title:_sibylText("sibyl.title.030"), pattern:'정재가 강한 명식은 약속을 지키고 책임을 다하는 신뢰 기반 관계를 선호합니다. 관계를 함부로 맺지 않고, 소수의 깊고 안정적인 인연을 장기간 유지하는 성향이 있습니다. 그러나 변화에 대한 저항감이 강해, 관계에서 새로운 역동이나 갈등이 생겨도 기존 패턴을 고수하는 경향이 있습니다. 상대의 작은 실수나 불일치를 오래 기억하고 내면에 누적하는 성향이, 어느 순간 예상치 못한 폭발로 이어지는 것이 이 명식의 관계 위험 패턴입니다. 불만을 조기에 언어로 꺼내는 연습이 관계 안전망을 강화합니다.', warning:'내면 누적 후 폭발 패턴. 불만 조기 언어화 훈련이 필수.' },
        '편관': { title:_sibylText("sibyl.title.031"), pattern:'편관이 주도하는 명식은 강렬한 존재감과 카리스마로 주변을 압도하지만, 이것이 관계에서 과도한 지배 욕구로 표현될 때 상대에게 억압감을 줍니다. 관계를 수직적 서열로 인식하는 경향이 있어, 평등한 수평 관계를 설정하는 것 자체가 낯설고 불편하게 느껴질 수 있습니다. 편관이 강한 사람에게 지지와 인정을 받기 위해 주변인들이 지나치게 눈치를 보는 관계 생태계가 형성되기 쉽습니다. 충(衝) 에너지가 강한 시기에는 관계에서 폭발적 갈등 또는 완전 단절이 일어날 수 있습니다. 심리적 안전 환경을 의식적으로 만들어 상대가 솔직할 수 있는 구조를 구축하는 것이 관계 장수의 핵심입니다.', warning:'수직적 관계 구조로 인한 고립 위험. 취약성 표현 연습이 관계 회복력을 높인다.' },
        '정관': { title:_sibylText("sibyl.title.032"), pattern:'정관이 강한 명식은 명확한 역할 분담과 원칙을 중시하며, 상대에게도 동일한 수준의 책임감을 요구합니다. 이 기준을 충족하는 파트너와는 매우 안정적이고 지속적인 관계를 형성하지만, 기준에 미달하는 상대에 대해서는 빠르게 신뢰를 거두는 패턴이 나타납니다. 원칙 준수에 대한 집착이 타인의 실수에 대한 용인 폭을 좁혀, 관계에서 과도한 판단자 역할을 맡게 되는 것이 주요 위험입니다. 스스로에게 부과하는 과도한 책임감이 만성 스트레스로 연결되며, 이것이 가까운 관계에서 냉담함 또는 비판으로 투영됩니다. 불완전한 타인을 수용하는 관용 연습이 관계를 더 풍요롭게 만듭니다.', warning:'과도한 기준 적용으로 인한 관계 단절. 불완전성 수용 훈련이 관건.' },
        '편인': { title:_sibylText("sibyl.title.033"), pattern:'편인이 강한 명식은 깊이 있는 지적 교류를 선호하며, 평범한 일상적 대화에 쉽게 지루함을 느낍니다. 자신만의 내면 세계가 풍부하여 필요 이상으로 타인과 의존적 관계를 만들지 않으려 하는데, 이것이 외부에서는 냉담하거나 거만하게 보일 수 있습니다. 편인의 독특한 시각이 소수의 깊은 인연에게는 굉장한 매력이 되지만, 다수에게는 이해하기 어려운 사람으로 분류됩니다. 아이디어가 충분히 무르익기 전에 관계에서 이탈하는 패턴이 반복되어, 장기 파트너십 형성에 구조적 어려움이 있습니다. 일관성 있는 관계 유지 의도를 의식적으로 표현하는 노력이 필요합니다.', warning:'예측 불가한 이탈 패턴으로 인한 신뢰 구축 어려움. 일관성 훈련이 핵심.' },
        '정인': { title:_sibylText("sibyl.title.034"), pattern:'정인이 강한 명식은 조언하고 가르치고 지원하는 역할에서 관계의 의미를 찾습니다. 타인의 성장을 돕는 데서 만족을 얻어 교육·상담·지도 관계에서 빛을 발합니다. 그러나 지나친 보호와 지원이 상대의 자율성을 침해하는 방향으로 흐를 때, 의존-갈등 구조가 형성됩니다. 상대가 독립을 선언했을 때 받게 되는 심리적 공허감이 관계에서 반복적인 매달림 패턴으로 이어질 수 있습니다. 또한, 지식과 경험을 과하게 공유하려는 성향이 상대에게 강요로 느껴지는 것이 관계 마찰의 주요 원인입니다.', warning:'의존 구조 형성 후 갈등. 상대 자율성 존중과 역할 분리가 관건.' },
        '비견': { title:_sibylText("sibyl.title.035"), pattern:'비견이 강한 명식은 관계에서 강한 자아 경계선을 유지하며, 상대와 동등한 위치에 있어야 편안함을 느낍니다. 자신의 영역에 침범을 허용하지 않는 자율성이 강한 파트너를 선택하는 경향이 있으며, 이 경우 서로를 존중하지만 정서적으로 깊이 연결되지 않는 관계 스타일이 형성됩니다. 비견 과다 명식은 재성(財星)이 약해지는 구조로, 금전 감각 둔화와 이성 파트너십 이슈가 동시에 나타나기 쉽습니다. 관계 내에서 경쟁 심리가 발동하면 파트너를 협력자가 아닌 경쟁자로 인식하기 시작하며, 이것이 가장 깊은 관계를 무너뜨리는 패턴입니다.', warning:'파트너를 경쟁자로 인식하는 패턴 위험. 협력 언어 구사 훈련이 핵심.' },
        '겁재': { title:_sibylText("sibyl.title.036"), pattern:'겁재가 강한 명식은 관계에서도 경쟁 우위를 확보하려는 본능적 전략이 작동합니다. 상대의 자원·정보·영향력을 취하려는 에너지가 무의식적으로 발동되어, 주변에서 손해 보는 느낌을 받는 경우가 반복됩니다. 단기적으로 관계에서 우위를 점하지만, 장기적으로 신뢰를 잃어 파트너십 기반이 흔들리는 패턴이 구조화됩니다. 감정 기복이 관계에서 예측 불가한 반응으로 나타나 상대를 불안하게 만들 수 있습니다. 신뢰 우선·경쟁 후순위 원칙을 의식적으로 관계에 적용하는 것이 관계 장기화의 핵심입니다.', warning:'신뢰 기반 손상 구조 반복. 의도적 신뢰 구축 행동이 관계 지속성 결정.' }
      };
      var relData = RELATIONSHIP_PATTERN[dominant] || RELATIONSHIP_PATTERN['편재'];
      html += '<div class="sb-nature-block">'
        + '<div class="sb-nature-tag">■ RELATIONSHIP MATRIX — 인간관계 & 소통 패턴 분석</div>'
        + '<div class="sb-nature-label">' + relData.title + '</div>'
        + '<p class="sb-nature-body">' + relData.pattern + '</p>'
        + '<div class="sb-nature-row"><span class="sb-nature-key">⚠ 관계 위험 포인트</span><span class="sb-nature-val sb-nature-val--warn">' + relData.warning + '</span></div>';
      // 십성 분포 기반 추가 분석
      var bijabN = (counts['비견']||0) + (counts['겁재']||0);
      var jaeN   = (counts['편재']||0) + (counts['정재']||0);
      var gwanN  = (counts['편관']||0) + (counts['정관']||0);
      var sikN   = (counts['식신']||0) + (counts['상관']||0);
      var inN    = (counts['편인']||0) + (counts['정인']||0);
      var patterns = [];
      if (bijabN >= 3) patterns.push('비겁 ' + bijabN + '개 과잉 → 독립·경쟁 에너지 폭주, 협력 관계 마찰 구조적 위험');
      if (gwanN >= 3) patterns.push('관성 ' + gwanN + '개 집중 → 직업·외부 평가 압박이 친밀 관계를 희생시키는 패턴');
      if (jaeN >= 3) patterns.push('재성 ' + jaeN + '개 과다 → 이해·실리 기반 관계 편중, 감성 파트너십 약화');
      if (sikN >= 3) patterns.push('식상 ' + sikN + '개 → 표현 과잉, 상대 피로감 누적. 경청·침묵의 비율 재조정 필요');
      if (inN >= 3) patterns.push('인성 ' + inN + '개 → 지식 우위 패턴 주의. 지원-의존 관계 외에 수평 관계 구축 의식적 노력 필요');
      if (patterns.length) {
        html += '<div class="sb-nature-row"><span class="sb-nature-key">십성 분포 경보</span><span class="sb-nature-val sb-nature-val--warn">' + patterns.join(' / ') + '</span></div>';
      }
      html += '<div class="sb-nature-row"><span class="sb-nature-key">소통 스타일 팁</span><span class="sb-nature-val">'
        + (dominant === '식신' || dominant === '상관' ? '풍부한 공감 언어를 강점으로 활용하되, 상대가 말할 공간을 먼저 만드세요.' :
           dominant === '편관' || dominant === '정관' ? '목표 중심 대화가 자연스럽지만, 감성적 안전 표현을 병행해 관계 온도를 유지하세요.' :
           dominant === '편재' || dominant === '정재' ? '실용적 언어가 강점이지만, 의도 없는 대화 시간을 정기적으로 가지면 관계 깊이가 달라집니다.' :
           dominant === '편인' || dominant === '정인' ? '깊은 통찰을 나눌 수 있는 소수 파트너에게 집중하고, 그 관계를 장기 투자 관점으로 관리하세요.' :
           '관계에서 취약성을 표현하는 연습이 신뢰 구축의 가장 빠른 경로입니다.')
        + '</span></div>'
        + '</div>';
    })();

    /* ■ Block 3: 억부 진단 */
    var kwanStarCount = (counts['편관'] || 0) + (counts['정관'] || 0);
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ POWER SCAN — 억부(抑扶) 진단</div>'
      + '<div class="sb-nature-power">▶ ' + powerLabel + '</div>';
    if (isStrong && bijabPct >= 25) {
      html += '<p class="sb-nature-body sb-nature-alert">⚠ 일간 과강 경보: 동류 원소 비중 ' + bijabPct + '%.'
        + (jaePct < 15
          ? ' 재성(' + (EL_KR[jaeEl] || '') + ') ' + jaePct + '% — 재물·현실 감각·이성 에너지가 심각하게 취약합니다. 강한 자아가 현실 감각보다 앞서면, 능력 대비 경제적 성과가 구조적으로 저하됩니다.'
          : ' 강한 독립 에너지가 협력 기반 업무에서 반복 마찰을 일으킵니다. 의도적 협력 훈련 없이 리더십을 발휘하면 팀이 아니라 적을 만드는 구조입니다.')
        + '</p>';
    } else if (!isStrong) {
      if (kwanStarCount >= 2) {
        html += '<p class="sb-nature-body sb-nature-alert">⚠ 관성(官星) 과압 구조: 편관이 ' + kwanStarCount + '개 이상 집중되어 일간을 지속적으로 제압합니다. '
          + '외부 권위에 대한 과도한 압박, 만성 긴장, 자기비판 반복이 내면에 누적됩니다. '
          + '이 에너지를 방치하면 번아웃 → 갑작스러운 이탈 → 사회적 고립 순서로 진행됩니다. '
          + '관인상생(官印相生) — 인성(印星)이 관성의 압박을 지식·자격으로 승화하는 구조를 만드는 것이 유일한 출구입니다.</p>';
      } else {
        html += '<p class="sb-nature-body">신약(身弱) 구조. 주도적 실행보다 전문성 심화와 지원 기반 구축이 우선 전략입니다. 무리한 독립 창업보다 조직 내 전문직에서 역량을 검증한 뒤 독립하는 것이 장기 안전입니다.</p>';
      }
    } else {
      html += '<p class="sb-nature-body">오행 균형이 비교적 양호합니다. 대운·세운의 변화에 따라 전략을 유연하게 조정하십시오.</p>';
    }
    html += '</div>';

    /* ■ Block 4: 시스템 어드바이저리 (유료 유도) */
    var yr0 = new Date().getFullYear();
    var YRNAME0 = { 2025:'을사(乙巳)', 2026:'병오(丙午)', 2027:'정미(丁未)', 2028:'무신(戊申)', 2029:'기유(己酉)', 2030:'경술(庚戌)' };
    var yrLabel0 = (YRNAME0[yr0] || yr0 + '년');
    var GAN_CHONG0 = { '甲':'庚','庚':'甲','乙':'辛','辛':'乙','丙':'壬','壬':'丙','丁':'癸','癸':'丁' };
    var YEAR_GAN0 = { 2025:'乙', 2026:'丙', 2027:'丁', 2028:'戊', 2029:'己', 2030:'庚' };
    var yearGan0 = YEAR_GAN0[yr0] || '丙';
    var hasGanChong0 = dayGan && GAN_CHONG0[yearGan0] === dayGan;
    var ctaExtra = hasGanChong0
      ? '특히 ' + yr0 + ' ' + yrLabel0 + ' 세운 천간(' + yearGan0 + ')이 당신의 일간(' + dayGan + ')과 <strong>직격 천간 충</strong>을 이루고 있습니다. 이 해에 진로·관계·정체성의 근본적 재편이 일어날 가능성이 높습니다. '
      : '';
    html += '<div class="sb-nature-block sb-nature-block--cta">'
      + '<div class="sb-nature-tag">■ SYSTEM ADVISORY — 분석 심화 안내</div>'
      + '<p class="sb-nature-body">' + ctaExtra
      + '위 데이터는 원국의 <strong>정적 구조 분석</strong>입니다. 실제 운명은 <strong>현재 어느 대운에 위치하는지</strong>에 따라 완전히 달라집니다. '
      + '<strong>10년 위험 계수 그래프</strong>, 직업 전환 최적 타이밍, 관계 리스크, '
      + '개운 처방전은 <em class="sb-nature-hl">DOMINATOR REPORT</em>에서만 열람됩니다.</p>'
      + '<div class="sb-nature-cta-hint">▼ 하단 ⚡ EXECUTE DOMINATOR (10,000원) 으로 전체 리포트 열람</div>'
      + '</div>';

    return html;
  }

  /* ── YEAR PULSE — 세운 충형 에너지 스캔 ── */
  var YEAR_GAN_TBL = { 2024:'甲', 2025:'乙', 2026:'丙', 2027:'丁', 2028:'戊', 2029:'己', 2030:'庚', 2031:'辛', 2032:'壬', 2033:'癸' };
  var YEAR_ZHI_TBL = { 2024:'辰', 2025:'巳', 2026:'午', 2027:'未', 2028:'申', 2029:'酉', 2030:'戌', 2031:'亥', 2032:'子', 2033:'丑' };
  var YEAR_NAME_TBL = { 2024:'갑진', 2025:'을사', 2026:'병오', 2027:'정미', 2028:'무신', 2029:'기유', 2030:'경술', 2031:'신해', 2032:'임자', 2033:'계축' };
  var ZHI_CHONG_TBL = { '子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳' };
  var ZHI_HE6_TBL = { '子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午' };
  var GAN_CHONG_TBL = { '甲':'庚','庚':'甲','乙':'辛','辛':'乙','丙':'壬','壬':'丙','丁':'癸','癸':'丁' };
  var BANHE_SETS = [[['寅','午','戌'],'화(火)局'],[['申','子','辰'],'수(水)局'],[['亥','卯','未'],'목(木)局'],[['巳','酉','丑'],'금(金)局']];

  function _buildYearPulseHTML(pillars) {
    if (!pillars || !pillars.d) return '';
    var yr = new Date().getFullYear();
    var yg = YEAR_GAN_TBL[yr]; var yz = YEAR_ZHI_TBL[yr]; var yn = YEAR_NAME_TBL[yr];
    if (!yg || !yz) return '';
    var dg = pillars.d.g; var dj = pillars.d.j;
    var mj = pillars.m && pillars.m.j;
    var yj_g = pillars.y && pillars.y.j;
    var signals = [];
    /* 천간 충 */
    if (GAN_CHONG_TBL[yg] === dg) {
      var ts = null; try { ts = _calcTenStar(dg, yg); } catch(e) {}
      signals.push({ lv:'danger', msg:'⚡ ' + yr + ' ' + yn + '년 — 세운 천간(' + yg + ')이 일간(' + dg + ')과 <strong>직격 천간 충</strong>. [' + (ts || '충') + '] 진로·정체성·핵심 관계에 근본적 흔들림이 발생합니다. 기존 안정 기반(직장·파트너십·거주지)에 예측 불가 균열 가능성.' });
    }
    /* 일지 충 */
    if (ZHI_CHONG_TBL[yz] === dj) {
      signals.push({ lv:'danger', msg:'⚡ 일지(' + dj + ')·세운지(' + yz + ') <strong>지지 충</strong>. 배우자·감정 기반·건강(심신)에 직접 충격 에너지가 유입됩니다. 이별, 이사, 수술 이벤트 발생 가능성 증가.' });
    }
    /* 월지 충 */
    if (mj && ZHI_CHONG_TBL[yz] === mj) {
      signals.push({ lv:'warn', msg:'▲ 월지(' + mj + ')·세운지(' + yz + ') 충. 직업·재정 기반에 변동 에너지 유입. 이직·전직·사업 재편 가능성 상승.' });
    }
    /* 연지 충 */
    if (yj_g && ZHI_CHONG_TBL[yz] === yj_g) {
      signals.push({ lv:'warn', msg:'▲ 연지(' + yj_g + ')·세운지(' + yz + ') 충. 가족·뿌리·고향과 연관된 변화 에너지 감지.' });
    }
    /* 일지 합 → 귀인 */
    if (ZHI_HE6_TBL[yz] === dj) {
      signals.push({ lv:'ok', msg:'✦ 세운지(' + yz + ')·일지(' + dj + ') 육합(六合). ' + yr + '년 귀인·파트너십 형성 에너지 상승. 중요한 인연이 열릴 수 있습니다.' });
    }
    /* 반합 */
    BANHE_SETS.forEach(function(g) {
      var trio = g[0]; var nm = g[1];
      if (trio.indexOf(yz) >= 0 && (trio.indexOf(dj) >= 0 || trio.indexOf(mj) >= 0)) {
        var effMap = { '화(火)局':'재성(財星) 활성화 — 재물·명예 기회 유입.', '수(水)局':'비겁 강화 — 독립 의지 상승, 협력 마찰 증가.', '목(木)局':'식상 폭발 — 창작·표현·자녀 에너지 급증.', '금(金)局':'인성 강화 — 학문·자격·귀인 지원 증폭.' };
        signals.push({ lv:'info', msg:'◈ 세운지(' + yz + ')와 명식이 <strong>' + nm + '</strong> 형성. ' + (effMap[nm] || '') });
      }
    });
    if (!signals.length) {
      signals.push({ lv:'neutral', msg:'▷ ' + yr + ' ' + yn + '년 — 명식에 직격 충형 없음. 일간 에너지 보존 상태. 내공 축적 적기.' });
    }
    var html = '<div class="sb-nature-block sb-ypulse-block">';
    html += '<div class="sb-nature-tag">■ YEAR PULSE — ' + yr + ' ' + yn + '년 세운 충격 스캔</div>';
    signals.forEach(function(s) {
      html += '<div class="sb-ypulse-row sb-ypulse-' + s.lv + '">' + s.msg + '</div>';
    });
    html += '<div class="sb-ypulse-cta">&#9660; 세운 위기 완화 전략·3년 변곡점·개운 처방은 <strong>DOMINATOR REPORT</strong>에서만 확인됩니다.</div>';
    html += '</div>';
    return html;
  }

  /* ── INNER PALACE SCAN — 일지(日支) 비밀궁 분석 ── */
  var DAY_BRANCH_ORACLE = {
    '子':{ code:'AQUA_SEED_v1', title:_sibylText("sibyl.title.037"), oracle:'가장 순수한 시작 에너지. 잠재력은 무한하지만 방향 없이는 증발합니다. 내면의 깊은 지성은 구조를 스스로 만들어야만 외부 세계와 연결됩니다.', spouse:'배우자궁 에너지: 비겁 계열 → 파트너가 경쟁자가 될 수 있음. 독립적 파트너 선호 필연.' },
    '丑':{ code:'EARTH_VAULT_v2', title:_sibylText("sibyl.title.038"), oracle:'닫힌 금고. 표면은 둔하지만 내부에 황금 맥이 흐릅니다. 열리는 데 시간이 걸리지만, 한 번 개방되면 막을 수 없습니다.', spouse:'배우자궁 에너지: 관성+비겁+인성 혼재 → 헌신-갈등 주기 반복.' },
    '寅':{ code:'WOOD_IGNITION_v3', title:_sibylText("sibyl.title.039"), oracle:'봄의 첫 파열. 강렬한 시작 에너지가 항상 폭발을 준비합니다. 시작은 훌륭하지만 완주 본능을 별도로 키워야 합니다.', spouse:'배우자궁 에너지: 식상+재성+관성 혼재 → 활발하지만 제어 어려운 파트너.' },
    '卯':{ code:'SOFT_BLADE_v4', title:_sibylText("sibyl.title.040"), oracle:'보이지 않게 날카로운 목 에너지. 타인의 감정을 정확히 수신하는 이 안테나가 무기가 되거나 상처가 됩니다.', spouse:'배우자궁 에너지: 비겁 계열 → 독립적이고 경쟁적인 파트너.' },
    '辰':{ code:'DRAGON_VAULT_v5', title:_sibylText("sibyl.title.041"), oracle:'모든 오행을 저장하는 수고(水庫). 표면은 土이지만 내부에 水·木·土가 공존합니다. 이 복잡한 내면이 창의적 탄력성과 예측 불가한 심리 변동을 동시에 만듭니다. 압박이 강할수록 내면에서 무언가 폭발합니다.', spouse:'배우자궁 에너지: 편관+상관+겁재 혼재 → 통제-자유 갈등 구조 내재.' },
    '巳':{ code:'FIRE_CIRCUIT_v6', title:_sibylText("sibyl.title.042"), oracle:'봉인된 화기가 폭발 직전 상태. 표현 채널만 확보되면 불길처럼 번집니다. 통제 없는 열정은 모든 것을 태울 수 있습니다.', spouse:'배우자궁 에너지: 재성+관성+인성 혼재 → 능력 있는 파트너, 소유욕 충돌.' },
    '午':{ code:'SOLAR_PEAK_v7', title:_sibylText("sibyl.title.043"), oracle:'최고조의 빛. 화려하지만 빠르게 소진됩니다. 무대 없이는 에너지가 내부로 향해 자기파괴적이 됩니다.', spouse:'배우자궁 에너지: 재성+편관+정재 혼재 → 화려하지만 변덕스러운 파트너 인연.' },
    '未':{ code:'EARTH_DUSK_v8', title:_sibylText("sibyl.title.044"), oracle:'풍요롭지만 소진된 에너지. 주는 데 익숙하지만 받는 法을 배우지 않으면 에너지 고갈이 반복됩니다.', spouse:'배우자궁 에너지: 관성+상관+재성 혼재 → 섬세하고 감성적인 파트너, 독립성 요구.' },
    '申':{ code:'METAL_ZERO_v9', title:_sibylText("sibyl.title.045"), oracle:'감정 없이 상황을 해부하는 냉정한 분석 에너지. 이 냉정함이 문제 해결의 무기이자, 타인과의 감정 연결을 끊는 장벽입니다.', spouse:'배우자궁 에너지: 인성+비겁+관성 혼재 → 지적이고 독립적인 파트너.' },
    '酉':{ code:'PURE_EDGE_v10', title:_sibylText("sibyl.title.046"), oracle:'불순물을 허용하지 않는 완벽주의 에너지. 탁월한 완성도를 만들지만, 기준 차이로 인한 실망과 고립이 반복됩니다.', spouse:'배우자궁 에너지: 비겁 계열 → 서로 독립을 추구하는 파트너 구조.' },
    '戌':{ code:'FIRE_TOMB_v11', title:_sibylText("sibyl.title.047"), oracle:'화기의 창고이자 무덤. 평시에는 잠재력이 숨어 과소평가받지만, 폭발하면 걷잡을 수 없습니다.', spouse:'배우자궁 에너지: 관성+인성+재성 혼재 → 능력 있고 신뢰할 수 있는 파트너.' },
    '亥':{ code:'DEEP_CIRCUIT_v12', title:_sibylText("sibyl.title.048"), oracle:'가장 깊은 수(水)의 근원. 무한한 잠재력이 보이지 않는 곳에 있습니다. 직관이 뛰어나지만 깊은 내향성으로 이 능력을 세상과 연결하는 것이 영구 과제입니다.', spouse:'배우자궁 에너지: 비겁+식신 계열 → 자유롭고 창의적인 파트너, 구속 거부.' }
  };

  function _buildDayBranchScan(pillars) {
    if (!pillars || !pillars.d) return '';
    var dj = pillars.d.j;
    var info = DAY_BRANCH_ORACLE[dj];
    if (!info) return '';
    var html = '<div class="sb-nature-block sb-dbs-block">';
    html += '<div class="sb-nature-tag">■ INNER PALACE SCAN — 일지(日支) ' + dj + ' 비밀궁 분석</div>';
    html += '<div class="sb-dbs-header">';
    html += '<span class="sb-dbs-chip">SOUL CHIP: ' + info.code + '</span>';
    html += '<span class="sb-dbs-title">' + info.title + '</span>';
    html += '</div>';
    html += '<p class="sb-nature-body">' + info.oracle + '</p>';
    html += '<div class="sb-nature-row"><span class="sb-nature-key">배우자궁</span><span class="sb-nature-val sb-nature-val--warn">' + info.spouse + '</span></div>';
    html += '<div class="sb-dbs-cta">&#9660; 현재 운에서 이 에너지가 어떻게 발동하는지, 인연·직업 최적 타이밍은 <strong>DOMINATOR REPORT</strong>에서 확인하세요.</div>';
    html += '</div>';
    return html;
  }

  function _buildSibylRecoveryOverview(pillars, knownRisk, knownCoeff) {
    var core = pillars || window.G_PILLARS || null;
    var dist;
    var counts;
    var domEl;
    var dominant;
    var risk = _safeScore(knownRisk, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var coeff = _safeScore(knownCoeff, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);

    try { dist = _ohaengDist(core); } catch (_) { dist = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1, total: 5 }; }
    try { counts = _analyzeTenStars(core); } catch (_) { counts = {}; }
    try { domEl = _dominantEl(dist); } catch (_) { domEl = 'water'; }
    dominant = _safeText(_dominantTenStar(counts), SIBYL_PRIMARY_TENGOD_FALLBACK);

    var monthly = [];
    try {
      monthly = _buildMonthlyRiskPlan(core, domEl, dominant, risk, new Date().getFullYear(), {
        pillars: core,
        dominantEl: domEl,
        dominantTenStar: dominant
      }) || [];
    } catch (_) {
      monthly = [];
    }

    if (!Array.isArray(monthly) || !monthly.length) {
      monthly = [
        { month: 1, risk: risk, focus: '기본 루틴 고정', caution: '의사결정 속도 과열 주의' },
        { month: 2, risk: _clamp(risk + 6, 0, 100), focus: '관계 커뮤니케이션 점검', caution: '감정 반응 누적 주의' },
        { month: 3, risk: _clamp(risk - 4, 0, 100), focus: '성과 정리/확장', caution: '무리한 확장 주의' }
      ];
    }

    var ordered = monthly.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var riskTone = risk >= 70 ? 'high' : (risk >= 45 ? 'medium' : 'low');
    var riskHeadline = riskTone === 'high'
      ? '단기 변동성이 높은 구간입니다. 과속 의사결정에 주의하세요.'
      : (riskTone === 'medium'
        ? '핵심 루틴을 유지하면 안정권 진입이 가능한 구간입니다.'
        : '안정 흐름이 우세한 구간입니다. 확장은 단계적으로 진행하세요.');
    var action = dominant === '편관' || dominant === '정관'
      ? '규칙·검증 기반 실행을 유지하고, 관계 대화는 결론보다 맥락 설명을 먼저 배치하세요.'
      : dominant === '편재' || dominant === '정재'
        ? '재정·일정 로그를 같은 주기에 묶어 누수부터 차단하고, 안정 월에만 확장하세요.'
        : '강점 축을 한 번에 하나만 밀고, 주간 회복 루틴을 고정해 변동성을 먼저 줄이세요.';

    return {
      risk: risk,
      coeff: coeff,
      dominant: dominant,
      domEl: domEl,
      topMonths: ordered,
      riskTone: riskTone,
      riskHeadline: riskHeadline,
      action: action,
    };
  }

  function _buildSibylRecoveryHtml(overview) {
    var esc = function(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
    var tone = overview.riskTone || (overview.risk >= 70 ? 'high' : (overview.risk >= 45 ? 'medium' : 'low'));
    var toneLabel = tone === 'high' ? '주의 강화 구간' : (tone === 'medium' ? '균형 점검 구간' : '안정 구간');
    var monthCards = (overview.topMonths || []).map(function(item) {
      var monthValue = Number(item && item.month);
      var monthLabel = (isFinite(monthValue) ? monthValue : 0);
      var riskValue = _safeScore(item && item.risk, overview.risk, 0, 100);
      var focusText = esc(item && item.focus || '핵심 루틴 유지');
      var cautionText = esc(item && item.caution || '변동성 모니터링');
      return ''
        + '<article class="sb-free-recovery-month-card">'
        + '<div class="sb-free-recovery-month-head">'
        + '<span class="sb-free-recovery-month-label">' + String(monthLabel).padStart(2, '0') + '월</span>'
        + '<span class="sb-free-recovery-month-risk">위험 ' + riskValue + '</span>'
        + '</div>'
        + '<p class="sb-free-recovery-month-focus">' + focusText + '</p>'
        + '<p class="sb-free-recovery-month-caution">주의: ' + cautionText + '</p>'
        + '</article>';
    }).join('');
    if (!monthCards) {
      monthCards = '<div class="sb-free-recovery-month-empty">월별 위험 데이터를 계산 중입니다.</div>';
    }

    return ''
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ CORE MATRIX — 무료 기본 결과</div>'
      + '<div class="sb-free-recovery-chips">'
      + '<span class="sb-free-recovery-chip sb-free-recovery-chip--mode">RECOVERY MODE</span>'
      + '<span class="sb-free-recovery-chip sb-free-recovery-chip--risk-' + tone + '">' + toneLabel + '</span>'
      + '</div>'
      + '<p class="sb-nature-body">기본 계산 엔진을 복구 모드로 전환해 무료 결과를 우선 제공합니다. 유료 도미네이터 리포트와 별개로 핵심 지표는 계속 확인할 수 있습니다.</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">위험 계수</span><span class="sb-nature-val sb-nature-val--warn">' + overview.risk + ' / 100</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">적성 계수</span><span class="sb-nature-val">' + overview.coeff + ' / 999</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">주도 십성</span><span class="sb-nature-val">' + overview.dominant + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">지배 오행</span><span class="sb-nature-val">' + (EL_KR[overview.domEl] || overview.domEl) + '</span></div>'
      + '<p class="sb-nature-body">' + esc(overview.riskHeadline || '') + '</p>'
      + '</div>'
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ TIMING SNAPSHOT — 월별 위험 상위 구간</div>'
      + '<div class="sb-free-recovery-month-grid">' + monthCards + '</div>'
      + '</div>'
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">■ ACTION GUIDE — 무료 실행 가이드</div>'
      + '<p class="sb-nature-body">' + overview.action + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">유료와 구분</span><span class="sb-nature-val">무료는 요약/기본 지표, 10,000원은 10챕터 장문 리포트 잠금 해제 전용입니다.</span></div>'
      + '<ul class="sb-free-recovery-checklist">'
      + '<li>무료 결과는 기본 지표와 월별 우선순위를 지속 제공합니다.</li>'
      + '<li>유료 10,000원은 도미네이터 10챕터 리포트 잠금 해제 전용입니다.</li>'
      + '<li>복구 모드 해제 후 상세 계산 결과가 자동으로 갱신됩니다.</li>'
      + '</ul>'
      + '</div>';
  }

  /* ── 개운법 생성 (용신 기반) ── */
  function _buildRemedies(dominant, dominantEl) {
    var remedyMap = {
      wood: ['환경: 동쪽 방향 정리·활성화, 초록 계열 식물 배치', '행동: 새벽 산책·스트레칭으로 목(木) 에너지 충전', '색상: 초록·청색 계열 의류·소품 활용', '식이: 신맛 음식(레몬, 녹차, 발효 음료) 섭취'],
      fire: ['환경: 조도 높은 밝은 공간에서 활동', '행동: 활발한 네트워킹·대화로 화(火) 기운 증폭', '색상: 적색·오렌지 계열 포인트', '식이: 쓴맛 식품(아메리카노, 쑥, 여주) 권장'],
      earth: ['환경: 황색·갈색 계열 인테리어, 도자기 소품 배치', '행동: 꾸준한 루틴 유지, 새로운 자격증·학습으로 토(土) 강화', '색상: 황토·베이지 계열', '식이: 단맛 음식(고구마, 꿀, 대추) 적절히'],
      metal: ['환경: 서쪽·북서쪽 공간 정리정돈, 은·흰색 계열', '행동: 규율·원칙 강화, 명상·집중 훈련', '색상: 흰색·회색·은색 계열 의류', '식이: 매운맛 식품(고추, 생강, 마늘) 적절히'],
      water: ['환경: 북쪽 창가 작업 공간, 블루 계열 소품', '행동: 연구·학습·독서로 수(水) 에너지 축적', '색상: 검정·진남색 계열 포인트', '식이: 짠맛 식품(정제 소금, 된장, 미역) 균형']
    };
    var base = remedyMap[dominantEl] || remedyMap.water;
    // 십성별 추가 처방
    var extraMap = {
      '식신': '식신·상관 에너지: 창의 활동(글쓰기·음악·예술)에 정기적 투자로 재능 채널링',
      '편관': '편관 강화 시기: 규칙적인 운동 루틴으로 관성(官星)의 압박 에너지를 긍정 해소',
      '정관': '정관 안정기: 공식 자격증·직함 취득으로 관성의 정당성 강화',
      '편재': '편재 활성화: 단기 재테크보다 장기 자산 배분으로 재물 분산 리스크 관리',
      '편인': '편인 강화: 전문 자격·심화 학습으로 인성(印星) 지식 자산을 현금 흐름과 연결'
    };
    var extra = extraMap[dominant];
    if (extra) base = [extra].concat(base);
    return base.slice(0, 4);
  }

  /* ─────────────────────────────────
     UI 업데이트 헬퍼
  ───────────────────────────────── */
  function _q(id) { return document.getElementById(id); }
  function _t(id, text) { var el = _q(id); if (el) el.textContent = text; }
  function _html(id, html) { var el = _q(id); if (el) el.innerHTML = html; }

  /* ── 스캔 애니메이션 (초고속 프리미엄 최적화 - 병목 체감 완전 제거) ── */
  function _runScanAnim(onDone) {
    var scanSec = _q('sb-scan-section');
    if (scanSec) scanSec.classList.remove('sb-hidden');
 
    var barIds = ['sbBarOhaeng','sbBarTenstar','sbBarRisk','sbBarApt','sbBarHue'];
    var targets = [100, 100, 100, 100, 100];
    // 초고속 스캔 애니메이션으로 딜레이 차단 (0.6초 이내 완료)
    barIds.forEach(function(id, i) {
      var fill = _q(id);
      if (!fill) return;
      var delay = i * 80;
      setTimeout(function() {
        fill.style.width = targets[i] + '%';
        var pct = _q(id + 'Pct');
        if (pct) {
          var start = 0, end = targets[i], dur = 350;
          var startTime = null;
          function step(ts) {
            if (!startTime) startTime = ts;
            var prog = Math.min((ts - startTime) / dur, 1);
            pct.textContent = Math.floor(prog * end) + '%';
            if (prog < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
      }, delay);
    });
 
    setTimeout(function() {
      if (scanSec) scanSec.classList.add('sb-hidden');
      if (onDone) onDone();
    }, 600);
  }

  /* ── 무료 섹션 렌더링 ── */
  function _renderFreeSection(pillars, natal) {
    try {
      var normalized = _normalizeSibylInput({ pillars: pillars }, { pillars: pillars });
      _sibylLogInfo('[SIBYL] normalized input', normalized);
      if (normalized && normalized.sourceStatus && normalized.sourceStatus.fallbackUsed) {
        _sibylLogWarn('[SIBYL] KASI fallback used', {
          reason: 'normalized.sourceStatus.fallbackUsed',
          sourceStatus: normalized.sourceStatus
        });
      }
      var corePillars = normalized.pillars || pillars || window.G_PILLARS;
      var dist = normalized.dist || _ohaengDist(corePillars);
      var domEl = normalized.dominantEl || _dominantEl(dist);
      var clarity = _hueClarityStatus(dist);
      var hueData = EL_DESTINY_HUE[domEl] || EL_DESTINY_HUE.water;

      // Ohaeng bars
      EL_ORDER.forEach(function(el) {
        var pct = dist.total > 0 ? Math.round((dist[el]||0) / dist.total * 100) : 0;
        var fill = _q('sbOhaengFill_' + el);
        var pctEl = _q('sbOhaengPct_' + el);
        if (fill) setTimeout(function(){ fill.style.width = pct + '%'; }, 100);
        if (pctEl) pctEl.textContent = pct + '%';
      });

      // Destiny Hue swatch
      var swatch = _q('sbHueSwatch');
      if (swatch) swatch.style.background = hueData.hex;

      _t('sbHueName', hueData.name + ' · ' + EL_KR[domEl]);
      var statusEl = _q('sbHueStatus');
      if (statusEl) {
        statusEl.textContent = clarity === 'clear' ? '▶ 클리어(Clear) — 오행 균형도 양호' : '▶ 탁함(Cloudy) — 오행 편중 또는 결핍 감지';
        statusEl.className = 'sb-hue-status sb-hue-status--' + (clarity === 'clear' ? 'clear' : 'cloudy');
      }

      // Pillar display
      if (corePillars) {
        var cp = _pillarChars(corePillars);
        var cols = [
          { id:'sbPillarYanG', val:cp.y.g }, { id:'sbPillarYanJ', val:cp.y.j },
          { id:'sbPillarMoG',  val:cp.m.g }, { id:'sbPillarMoJ',  val:cp.m.j },
          { id:'sbPillarDaG',  val:cp.d.g }, { id:'sbPillarDaJ',  val:cp.d.j },
          { id:'sbPillarSiG',  val:cp.h.g }, { id:'sbPillarSiJ',  val:cp.h.j }
        ];
        cols.forEach(function(c){ _t(c.id, c.val || '미정'); });
      }

      var counts = normalized.tenStarCounts || {};
      var dominant = normalized.dominantTenStar || SIBYL_PRIMARY_TENGOD_FALLBACK;
      var secData = TENSTAR_SECTOR[dominant] || TENSTAR_SECTOR['편재'];
      var annualPreview = _buildAnnualRiskPlan(normalized, normalized.currentYear || new Date().getFullYear());
      var monthlyPreview = _buildMonthlyRiskPlan(
        corePillars,
        domEl,
        dominant,
        45,
        normalized.currentYear || new Date().getFullYear(),
        normalized
      );
      var conflictSignals = _collectCollisionSignals(corePillars, normalized.currentYear || new Date().getFullYear());
      var riskBreakdown = _calcRiskBreakdown(normalized, monthlyPreview, annualPreview, conflictSignals);
      var aptData = _calcAptitudeComponents(normalized, riskBreakdown);
      var canonicalData = _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPreview, monthlyPreview);
      var normalizedProfile = sanitizeSibylProfile((canonicalData && canonicalData.normalizedProfile) || canonicalData || {});
      var coeff = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.aptitudeScore, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
      var risk = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
      var profileDominant = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.tenGods && normalizedProfile.saju.tenGods.primary, dominant);
      var profileDominantEl = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.dominantElement, domEl);
      dominant = profileDominant;

      var metricsPreview = _q('sbFreeSection') && _q('sbFreeSection').querySelector('.sb-metrics-preview');
      if (metricsPreview) {
        metricsPreview.classList.add('sb-metrics-preview--expanded');
        metricsPreview.innerHTML = ''
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">위험 계수</div>'
          + '<div class="sb-metric-value" id="sbRiskBasicEl"><span id="sbRiskBasic">--</span></div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">적성 계수</div>'
          + '<div class="sb-metric-value sb-metric-value--ok"><span id="sbAptMetric">--</span></div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">Career</div>'
          + '<div class="sb-metric-value" id="sbCareerComp">--</div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">Wealth</div>'
          + '<div class="sb-metric-value" id="sbWealthComp">--</div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">충·형·파·해</div>'
          + '<div class="sb-metric-value" id="sbRiskCollision">--</div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">월 변동성</div>'
          + '<div class="sb-metric-value" id="sbRiskVolatility">--</div>'
          + '</div>';
      }

      _t('sbAptCoeff', coeff);
      _t('sbAptMetric', coeff);
      _t('sbCareerComp', aptData.components.career);
      _t('sbWealthComp', aptData.components.wealth);
      _t('sbRiskCollision', riskBreakdown.parts.collision);
      _t('sbRiskVolatility', riskBreakdown.parts.monthlyVolatility);
      _t('sbSectorName', secData.sector);
      _t('sbSectorJobs', secData.jobs);
      _t('sbSectorTenstar', '주도 십성: ' + profileDominant);

      // Caution / Warning — G_POWER 기반 스마트 경보
      var warn = _buildSmartWarning(corePillars, dominant, counts, dist);
      var warnEl = _q('sbCautionArea');
      if (warnEl) {
        if (warn) {
          warnEl.classList.remove('sb-hidden');
          _t('sbCautionText', '⚠ ALERT: ' + warn);
        } else {
          warnEl.classList.add('sb-hidden');
        }
      }

      // Risk gauge (basic)
      _t('sbRiskBasic', risk);
      var riskEl = _q('sbRiskBasicEl');
      if (riskEl) {
        riskEl.className = 'sb-metric-value' + (risk >= 70 ? ' sb-metric-value--danger' : risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
      }

      // Save current analysis state
      window._sibylCurrentData = {
        pillars: corePillars,
        dist: dist, domEl: profileDominantEl, dominant: profileDominant, coeff: coeff,
        risk: risk,
        counts: counts,
        riskBreakdown: riskBreakdown,
        aptitudeComponents: aptData.components,
        monthlyPreview: monthlyPreview,
        annualPreview: annualPreview,
        normalized: normalized,
        canonicalData: canonicalData,
        normalizedProfile: normalizedProfile
      };

      if (normalizedProfile && normalizedProfile.debug && Array.isArray(normalizedProfile.debug.missingFields) && normalizedProfile.debug.missingFields.length) {
        _sibylDevWarn('[SIBYL] missingFields', normalizedProfile.debug.missingFields);
      }

      // Nature + Year Pulse + Inner Palace 전체 렌더
      var natSec = _q('sbNatureSection');
      if (natSec) {
        var p0 = corePillars;
        natSec.innerHTML = _buildNatureAnalysis(p0, dist, dominant, counts)
          + _buildYearPulseHTML(p0)
          + _buildDayBranchScan(p0);
      }

      var freeSec = _q('sbFreeSection');
      if (freeSec) freeSec.classList.remove('sb-hidden');
      freeSec && freeSec.classList.add('sb-fadein');
      _setSibylState(SibylState.READY);
    } catch (err) {
      _sibylLogWarn('[SIBYL] KASI fallback used', {
        reason: String(err && err.message || 'FREE_SECTION_RENDER_ERROR')
      });
      // Fail-open: 무료 결과는 항상 카테고리형으로 노출하고, 에러 오버레이로 가리지 않는다.
      // 복구 모드 자체도 예외가 나면 섹션을 반드시 노출
      var freeSecFallback = _q('sbFreeSection');
      if (freeSecFallback) {
        freeSecFallback.classList.remove('sb-hidden');
        freeSecFallback.classList.add('sb-fadein');
      }
      try {
        var recovery = _buildSibylRecoveryOverview(pillars, window._sibylCurrentData && window._sibylCurrentData.risk, window._sibylCurrentData && window._sibylCurrentData.coeff);

        _t('sbSectorName', 'FREE BASIC RESULT MODE');
        _t('sbSectorJobs', '복구 모드로 무료 핵심 결과를 우선 제공합니다. 유료 잠금 해제 리포트와 분리되어 동작합니다.');
        _t('sbSectorTenstar', '주도 십성: ' + recovery.dominant);
        _t('sbHueStatus', '▶ 복구 모드(Recovery) — 무료 기본 지표를 우선 제공합니다.');
        _t('sbRiskBasic', recovery.risk);
        _t('sbAptCoeff', recovery.coeff);
        _t('sbAptMetric', recovery.coeff);

        var riskElFallback = _q('sbRiskBasicEl');
        if (riskElFallback) {
          riskElFallback.className = 'sb-metric-value' + (recovery.risk >= 70 ? ' sb-metric-value--danger' : recovery.risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
        }

        var natSecFallback = _q('sbNatureSection');
        if (natSecFallback) {
          natSecFallback.innerHTML = _buildSibylRecoveryHtml(recovery);
        }

        var cautionFallback = _q('sbCautionArea');
        if (cautionFallback) {
          cautionFallback.classList.remove('sb-hidden');
        }
        _t('sbCautionText', '⚠ 일부 계산 데이터가 지연되어 복구 모드로 표시 중입니다. 무료 기본 결과는 유지되며 유료 잠금 해제 흐름과 분리됩니다.');

        window._sibylCurrentData = Object.assign({}, window._sibylCurrentData || {}, {
          pillars: pillars || (window._sibylCurrentData && window._sibylCurrentData.pillars) || window.G_PILLARS || null,
          risk: recovery.risk,
          coeff: recovery.coeff,
          dominant: recovery.dominant,
          domEl: recovery.domEl,
          recoveryMode: true,
          recoveryReason: String(err && err.message || 'FREE_SECTION_RENDER_ERROR')
        });

        if (_isSibylDevMode()) {
          _sibylDevWarn('[SIBYL] free-recovery-fail-open', {
            reason: String(err && err.message || ''),
            risk: recovery.risk,
            coeff: recovery.coeff,
            dominant: recovery.dominant,
          });
        }
      } catch (recoveryErr) {
        // 복구 모드 자체도 실패한 경우 - sbFreeSection만 확실히 노출하고 기본 메시지 표시
        _sibylLogWarn('[SIBYL] recovery mode also failed', { reason: String(recoveryErr && recoveryErr.message || '') });
        _t('sbSectorName', '기본 운세 분석');
        _t('sbSectorJobs', '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        _t('sbRiskBasic', '—');
        _t('sbAptCoeff', '—');
      }
      _setSibylState(SibylState.READY);
    }
  }

  function _isAdminBypassUser() {
    try {
      if (typeof window.__cdIsAdminLikeUser === 'function' && window.__cdIsAdminLikeUser()) return true;
    } catch (_) {}
    try {
      if (window.__cdAdminBypass === true) return true;
    } catch (_) {}
    try {
      if (typeof window.isAdminUser === 'function' && window.isAdminUser()) return true;
    } catch (_) {}
    return false;
  }

  function _toApiError(result, fallbackMessage) {
    var payload = result && result.payload ? result.payload : {};
    return {
      status: Number(result && result.status || 0),
      code: String(payload && payload.error && payload.error.code || '').trim() || 'SERVER_ERROR',
      message: _safeErrorMessage(result) || fallbackMessage || '요청 처리 중 오류가 발생했습니다.'
    };
  }

  async function _resolveSibylPricing() {
    var featureRes = await _fetchApiJson('/api/billing/features?featureKey=' + encodeURIComponent(SIBYL_FEATURE_KEY));
    if (!featureRes.ok) {
      throw _toApiError(featureRes, '결제 가격 정보를 불러오지 못했습니다.');
    }
    var featureData = _extractApiData(featureRes.payload);
    var pricing = featureData && featureData.pricing ? featureData.pricing : null;
    var cost = Number(pricing && pricing.cost || 0);
    var reason = String(pricing && pricing.reason || SIBYL_FEATURE_REASON).trim();
    if (!Number.isFinite(cost) || cost <= 0 || !reason) {
      throw { status: 422, code: 'PRICE_NOT_FOUND', message: _sibylText("sibyl.message.002") };
    }
    return {
      featureKey: String(pricing.featureKey || SIBYL_FEATURE_KEY),
      cost: Math.floor(cost),
      reason: reason
    };
  }

  // 결제창 진입 지연 완화: 모달 오픈 시 가격을 미리 받아 두고 게이트에서 재사용.
  function _prefetchSibylPricing(profile) {
    var key = _sibylProfileCacheKey(profile) || 'account';
    if (_sibylPricingPrefetch && _sibylPricingPrefetch.key === key) return _sibylPricingPrefetch.promise;
    var promise = _resolveSibylPricing().catch(function(err) {
      // 실패 시 프리페치 캐시를 비워 게이트에서 정식 조회하도록 한다.
      if (_sibylPricingPrefetch && _sibylPricingPrefetch.key === key) _sibylPricingPrefetch = null;
      throw err;
    });
    _sibylPricingPrefetch = { key: key, promise: promise };
    return promise;
  }

  async function _fetchSibylUnlockStatus() {
    var accessStore = window.CodeDestinyAccessStore;
    if (accessStore && typeof accessStore.getAccessDecision === 'function') {
      var storeResult = await accessStore.getAccessDecision({
        featureKey: SIBYL_FEATURE_KEY,
        reason: 'sibyl-access',
        authenticated: true,
      });
      var payload = storeResult && storeResult.payload && typeof storeResult.payload === 'object' ? storeResult.payload : {};
      var data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
      var decision = data.accessDecision && typeof data.accessDecision === 'object' ? data.accessDecision : {};
      var unlocked = Boolean(
        data.unlocked === true
        || data.alreadyUnlocked === true
        || data.canAccess === true
        || decision.accessGranted === true
        || typeof accessStore.isUnlocked === 'function' && accessStore.isUnlocked(SIBYL_FEATURE_KEY),
      );
      if (storeResult && storeResult.ok === false && !unlocked) {
        return { ok: false, status: storeResult.status || 0, error: { code: 'ACCESS_STORE_DEGRADED' } };
      }
      return {
        ok: true,
        unlocked: unlocked,
        pricing: data.pricing || null,
        currentBalance: Number(data.currentBalance || data.monthlyBalance || 0),
      };
    }
    return { ok: false, status: 0, error: { code: 'ACCESS_STORE_UNAVAILABLE' } };
    /*
    var statusRes = await _fetchApiJson('/api/billing/unlock-status?featureKey=' + encodeURIComponent(SIBYL_FEATURE_KEY));
    if (!statusRes.ok) {
      return {
        ok: false,
        status: Number(statusRes.status || 0),
        error: _toApiError(statusRes, '잠금 해제 상태를 확인하지 못했습니다.')
      };
    }

    var statusData = _extractApiData(statusRes.payload);
    return {
      ok: true,
      unlocked: Boolean(statusData && statusData.unlocked),
      pricing: statusData && statusData.pricing ? statusData.pricing : null,
      currentBalance: Number(statusData && statusData.currentBalance || 0)
    };
    */
  }

  // unlock-status는 계정 단위라 짧은 TTL 캐시로 재사용한다.
  // opts.force=true면 캐시 무시(결제 직후 등), opts.profile은 캐시 키 스코프.
  function _resolveSibylUnlockStatus(profile, opts) {
    var options = opts || {};
    var key = _sibylProfileCacheKey(profile) || 'account';
    var now = Date.now();
    if (!options.force
      && _sibylUnlockStatusCache
      && _sibylUnlockStatusCache.key === key
      && (now - _sibylUnlockStatusCache.at) < SIBYL_UNLOCK_STATUS_TTL_MS) {
      return _sibylUnlockStatusCache.promise;
    }
    var promise = _fetchSibylUnlockStatus().then(function(status) {
      // 실패 응답은 캐시하지 않아 다음 시도에서 재조회되게 한다.
      if (!status || !status.ok) {
        if (_sibylUnlockStatusCache && _sibylUnlockStatusCache.key === key) _sibylUnlockStatusCache = null;
      }
      return status;
    });
    _sibylUnlockStatusCache = { key: key, at: now, promise: promise };
    return promise;
  }

  function _invalidateSibylUnlockStatusCache() {
    _sibylUnlockStatusCache = null;
  }

  // 다른 화면(정적 셸 결제 게이트·React 페이지)에서 해금이 확정되면 이 캐시도 함께 버린다.
  // 그러지 않으면 최대 15초 동안 방금 산 콘텐츠가 잠금으로 보인다.
  try {
    window.addEventListener('cd:unlocks-changed', _invalidateSibylUnlockStatusCache);
  } catch (_sibylUnlockEventErr) {}

  function _isSibylMembershipPassPayload(payload) {
    var data = _extractApiData(payload || {});
    var consume = data && data.consume && typeof data.consume === 'object' ? data.consume : {};
    var accessGrant = data && data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var values = [
      data && data.freeBySubscription === true ? 'membership_pass' : '',
      data && data.alreadyUnlocked === true ? 'already_unlocked' : '',
      data && data.__cdPassGateResolved === true ? 'membership_pass' : '',
      data && data.accessType,
      data && data.transactionType,
      data && data.accessMethod,
      data && data.paymentMethod,
      consume.accessType,
      consume.transactionType,
      consume.accessMethod,
      consume.paymentMethod,
      accessGrant.accessType,
      accessGrant.transactionType,
      accessGrant.accessMethod,
      accessGrant.paymentMethod
    ];
    return values.some(function(value) {
      var key = String(value || '').toLowerCase();
      return key === 'membership_pass' || key === 'pass' || key === 'already_unlocked';
    });
  }

  async function _runSibylCoinGate(payloadHash) {
    var pricing;
    if (_sibylPricingPrefetch && _sibylPricingPrefetch.promise) {
      try { pricing = await _sibylPricingPrefetch.promise; }
      catch (_) { pricing = await _resolveSibylPricing(); }
    } else {
      pricing = await _resolveSibylPricing();
    }
    var requestId = _createRequestId('sibyl-coin-gate');

    if (typeof window._cdOpenPaidServiceGate === 'function') {
      return await new Promise(function(resolve, reject) {
        var settled = false;
        function finish(payload) {
          if (settled) return;
          settled = true;
          var gatePayload = payload && typeof payload === 'object' ? payload : {};
          resolve({
            requestId: String(gatePayload.requestId || requestId),
            pricing: pricing,
            consumePayload: gatePayload,
            bypass: _isSibylMembershipPassPayload(gatePayload)
          });
        }
        function fail(error) {
          if (settled) return;
          settled = true;
          reject(error || { status: 402, code: 'PAYMENT_CANCELLED', message: '결제가 취소되었습니다.' });
        }
        var gatePromise;
        try {
          gatePromise = window._cdOpenPaidServiceGate({
            title: pricing.reason,
            reason: pricing.reason,
            coinPrice: pricing.cost,
            cost: pricing.cost,
            featureKey: pricing.featureKey,
            requestId: requestId,
            payloadHash: String(payloadHash || '').slice(0, 120),
            onGranted: function(transactionId, payload) {
              var grantedPayload = payload && typeof payload === 'object' ? payload : {};
              if (!grantedPayload.transactionId && transactionId) grantedPayload.transactionId = String(transactionId);
              finish(grantedPayload);
            },
            onPassApplied: function(access) {
              finish((access && (access.payload || access.rawPayload)) || access || {});
            },
            onCancel: fail
          });
        } catch (error) {
          fail(error);
          return;
        }
        if (gatePromise && typeof gatePromise.then === 'function') {
          gatePromise.then(function(payload) {
            if (payload === null || payload === undefined) fail({ status: 402, code: 'PAYMENT_CANCELLED', message: _sibylText("sibyl.message.003") });
            else finish(payload);
          }).catch(fail);
        }
      });
    }

    throw { status: 503, code: 'PAYMENT_GATE_UNAVAILABLE', message: '결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.' };
  }

  async function _requestSibylRefund(paymentContext, failReason) {
    if (!paymentContext || paymentContext.bypass || paymentContext.refundAttempted) {
      return { ok: false, skipped: true };
    }
    paymentContext.refundAttempted = true;

    var pricing = paymentContext.pricing || {};
    var consumeData = _extractApiData(paymentContext.consumePayload || {});
    var consumePayload = consumeData && consumeData.consume ? consumeData.consume : {};
    var txId = String(
      consumePayload.transactionId
      || consumePayload.pointHistoryId
      || consumePayload._id
      || ''
    ).trim();

    var refundRes = await _fetchApiJson('/api/billing/refund', {
      method: 'POST',
      body: JSON.stringify({
        cost: Number(pricing.cost || 100),
        featureKey: String(pricing.featureKey || SIBYL_FEATURE_KEY),
        sourceTransactionId: txId || undefined,
        requestId: _createRequestId((paymentContext.requestId || 'sibyl') + '-refund'),
        reason: String(failReason || '시빌라 리포트 생성 실패 자동 환급').slice(0, 120)
      })
    });

    return refundRes;
  }

  /* ── 결제 확인 후 도미네이터 리포트 호출 ── */
  async function _unlockDominator() {
    var btn = _q('sbUnlockBtn');

    function _restoreUnlockBtn() {
      _syncSibylUnlockButton(_getCurrentProfile());
      _setSibylState(SibylState.READY);
    }

    if (btn) { btn.disabled = true; btn.textContent = '>> PROCESSING…'; }

    var currentProfile = _getCurrentProfile();
    var currentData = window._sibylCurrentData || {};

    if (_openCachedDominatorReport(currentProfile, currentData)) {
      _restoreUnlockBtn();
      return;
    }

    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.add('sb-hidden');

    var payloadHash = _sibylHash(JSON.stringify({
      profileId: currentProfile && currentProfile.id,
      birth: currentProfile && currentProfile.birth,
      dominant: currentData && currentData.dominant,
      domEl: currentData && currentData.domEl,
      risk: currentData && currentData.risk,
      coeff: currentData && currentData.coeff
    }));

    var paymentContext = null;

    try {
      if (_isAdminBypassUser()) {
        paymentContext = {
          bypass: true,
          requestId: _createRequestId('sibyl-admin-bypass'),
          pricing: {
            featureKey: SIBYL_FEATURE_KEY,
            cost: 100,
            reason: SIBYL_FEATURE_REASON
          },
          consumePayload: {}
        };
      } else {
        _setSibylState(SibylState.PROCESSING_PAYMENT, '>> 결제 상태를 확인하는 중입니다…');
        // 모달 오픈 시 조회한 unlock-status를 재사용(중복 왕복 제거).
        var unlockStatus = await _resolveSibylUnlockStatus(currentProfile);

        if (!unlockStatus || !unlockStatus.ok) {
          if (_openCachedDominatorReport(currentProfile, currentData)) {
            _restoreUnlockBtn();
            return;
          }
          throw (unlockStatus && unlockStatus.error) || {
            status: 503,
            code: 'UNLOCK_STATUS_UNAVAILABLE',
            message: _sibylText("sibyl.message.005")
          };
        }

        if (unlockStatus && unlockStatus.ok && unlockStatus.unlocked) {
          if (_openCachedDominatorReport(currentProfile, currentData)) {
            _restoreUnlockBtn();
            return;
          }
          paymentContext = {
            bypass: true,
            unlocked: true,
            requestId: _createRequestId('sibyl-unlocked-reopen'),
            pricing: {
              featureKey: String((unlockStatus.pricing && unlockStatus.pricing.featureKey) || SIBYL_FEATURE_KEY),
              cost: Number((unlockStatus.pricing && unlockStatus.pricing.cost) || 100),
              reason: String((unlockStatus.pricing && unlockStatus.pricing.reason) || SIBYL_FEATURE_REASON)
            },
            consumePayload: {}
          };
        } else {
          paymentContext = await _runSibylCoinGate(payloadHash);
        }
      }

      _sibylLastPaidContext = paymentContext;
      _setSibylState(SibylState.GENERATING_REPORT, '>> 도미네이터 리포트를 생성하는 중입니다…');
      await _generateDominatorReport(paymentContext);
      // 신규 결제/이용권 통과 후 서버 잠금해제 상태를 재조회해 버튼을 즉시 갱신
      // (다른 기기/캐시 삭제 후에도 "저장된 리포트 열기"로 유지되도록).
      if (!_isAdminBypassUser() && !(paymentContext && paymentContext.unlocked)) {
        _invalidateSibylUnlockStatusCache();
        _resolveSibylUnlockStatus(currentProfile, { force: true }).then(function(st) {
          _syncSibylUnlockButton(currentProfile, st);
        }).catch(function() {});
      }
      _restoreUnlockBtn();
    } catch (error) {
      _sibylLogError('[SIBYL] premium unlock failed', error);

      if (paymentContext && !paymentContext.bypass) {
        try {
          await _requestSibylRefund(paymentContext, '시빌라 리포트 생성 실패 자동 환급');
        } catch (refundErr) {
          _sibylLogError('[SIBYL] premium unlock failed', refundErr);
        }
      }

      var userMessage = _toFriendlySibylErrorMessage(error, '시빌라 리포트를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      _setSibylState(SibylState.ERROR, userMessage);
      _restoreUnlockBtn();
    }
  }

  /* ── 도미네이터 리포트 생성 (로컬 계산 고정) ── */
  async function _generateDominatorReport(paymentContext) {
    var data = window._sibylCurrentData || {};
    var profile = _getCurrentProfile();
    var pillars = _ensurePillarsWithProfileFallback(data.pillars || window.G_PILLARS, profile);
    var ps = _pillarChars(pillars);
    var normalizedProfile = sanitizeSibylProfile(
      data.normalizedProfile
      || (data.canonicalData && data.canonicalData.normalizedProfile)
      || {}
    );

    // Build local payload
    var payload = {
      profile: profile,
      pillars: pillars ? {
        year:  { g: ps.y.g || '', j: ps.y.j || '' },
        month: { g: ps.m.g || '', j: ps.m.j || '' },
        day:   { g: ps.d.g || '', j: ps.d.j || '' },
        hour:  { g: ps.h.g || '', j: ps.h.j || '' }
      } : null,
      natal: data.dist || null,
      dominantEl: _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.dominantElement, data.domEl || null),
      dominantTenStar: _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.tenGods && normalizedProfile.saju.tenGods.primary, data.dominant || null),
      aptCoeff: _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.aptitudeScore, data.coeff || SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999),
      riskScore: _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.riskScore, data.risk || SIBYL_DEFAULT_RISK_SCORE, 0, 100),
      gender: (profile && profile.gender) || 'F',
      currentYear: new Date().getFullYear(),
      requestId: paymentContext && paymentContext.requestId ? paymentContext.requestId : '',
      kasiContext: (window.G_KASI_CONTEXT && typeof window.G_KASI_CONTEXT === 'object') ? {
        solar: window.G_KASI_CONTEXT.solar || null,
        lunar: window.G_KASI_CONTEXT.lunar || null,
        ganji: window.G_KASI_CONTEXT.ganji || null,
        solarTerms: window.G_KASI_CONTEXT.solarTerms || null,
        calendarType: window.G_KASI_CONTEXT.calendarType || null,
        source: window.G_KASI_CONTEXT.source || null
      } : null
    };

    var normalized = data.normalized || _normalizeSibylInput(payload, data);
    var annualPlan = Array.isArray(data.annualPreview) ? data.annualPreview : _buildAnnualRiskPlan(normalized, payload.currentYear);
    var monthlyPlan = Array.isArray(data.monthlyPreview) ? data.monthlyPreview : _buildMonthlyRiskPlan(pillars, payload.dominantEl || normalized.dominantEl, payload.dominantTenStar || normalized.dominantTenStar, payload.riskScore || 45, payload.currentYear, normalized);
    var conflictSignals = _collectCollisionSignals(pillars, payload.currentYear);
    var riskBreakdown = data.riskBreakdown || _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflictSignals);
    var aptData = { score: payload.aptCoeff || 0, components: data.aptitudeComponents || null };
    if (!aptData.components) {
      aptData = _calcAptitudeComponents(normalized, riskBreakdown);
      payload.aptCoeff = aptData.score;
    }

    var canonicalData = data.canonicalData || _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    if (!canonicalData.normalizedProfile || !canonicalData.normalizedProfile.scores) {
      canonicalData.normalizedProfile = buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    }
    payload.normalizedProfile = canonicalData.normalizedProfile;
    payload.canonicalData = canonicalData;

    // Progress animation
    var genBar = _q('sbGenBarFill');
    var genStatus = _q('sbGenStatus');
    var stages = [
      { pct:10, msg:'>> 팔자 원국 파싱 중…' },
      { pct:25, msg:'>> 사주 명식 오행 분포 분석 중…' },
      { pct:40, msg:'>> 격국·용신 계산 엔진 가동…' },
      { pct:55, msg:'>> 대운·세운 위험 인자 처리 중…' },
      { pct:70, msg:'>> 도미네이터 리포트 생성 중…' },
      { pct:85, msg:'>> 진로 적성 벡터 최적화 중…' },
      { pct:95, msg:'>> 최종 리포트 컴파일 중…' }
    ];
    var stageIdx = 0;
    function _advanceStage() {
      if (stageIdx < stages.length) {
        var s = stages[stageIdx++];
        if (genBar) genBar.style.width = s.pct + '%';
        if (genStatus) genStatus.textContent = s.msg;
      }
    }
    _advanceStage();
    var stageTimer = setInterval(_advanceStage, 2000);

    try {
      if (!payload.pillars || !payload.pillars.day || !payload.pillars.day.g) {
        throw new Error('사주 원국 데이터가 비어 있습니다. 먼저 사주 분석을 완료해 주세요.');
      }

      await new Promise(function (r) { setTimeout(r, 240); });
      var reportData = _shapeSibylPremiumReport(_buildLocalDominatorReport(payload, data), canonicalData);

      var finalValidation = _validateSibylPremiumChapterMap(reportData.chapterMap);
      if (!finalValidation.ok) {
        throw {
          status: 422,
          code: 'SIBYL_REPORT_INVALID',
          message: _sibylText("sibyl.message.006")
        };
      }

      _saveSibylCachedReport(profile, reportData, data);

      clearInterval(stageTimer);
      if (genBar) genBar.style.width = '100%';
      _renderDominatorReport(reportData, data);
      _setSibylState(SibylState.READY);

    } catch(e) {
      clearInterval(stageTimer);
      throw e;
    }
  }

  function _renderMonthlyRiskPanel(monthlyPlan) {
    if (!Array.isArray(monthlyPlan) || !monthlyPlan.length) return '';
    var cards = monthlyPlan.map(function(item) {
      var tone = item.risk >= 70 ? 'danger' : item.risk >= 50 ? 'warn' : 'ok';
      return '<article class="sb-monthly-card sb-monthly-card--' + tone + '">'
        + '<div class="sb-monthly-card-head">'
        + '<span class="sb-monthly-month">' + String(item.month).padStart(2, '0') + '월</span>'
        + '<span class="sb-monthly-risk">위험 ' + item.risk + '</span>'
        + '</div>'
        + (item.caution ? '<div class="sb-monthly-label">주의</div><p class="sb-monthly-text">' + item.caution + '</p>' : '')
        + (item.countermeasure ? '<div class="sb-monthly-label">대책</div><p class="sb-monthly-text">' + item.countermeasure + '</p>' : '')
        + '</article>';
    }).join('');
    return '<section class="sb-monthly-wrap">'
      + '<div class="sb-monthly-title">MONTHLY RISK TACTICS · 월별 운세/위험 대책</div>'
      + '<div class="sb-monthly-grid">' + cards + '</div>'
      + '</section>';
  }

  function _renderDominatorInsightPanel(reportData) {
    if (!reportData) return '';
    var monthly = Array.isArray(reportData.monthlyRiskPlan) ? reportData.monthlyRiskPlan : [];
    var annual = Array.isArray(reportData.annualRiskPlan) ? reportData.annualRiskPlan : [];
    var categoryMatrix = Array.isArray(reportData.categoryMatrix) ? reportData.categoryMatrix : [];
    var quantum = reportData.quantumDiagnostics || {};
    var parts = reportData.riskBreakdown && reportData.riskBreakdown.parts ? reportData.riskBreakdown.parts : {};
    var apt = reportData.aptitudeComponents || {};

    var topMonths = monthly.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var stableMonths = monthly.slice().sort(function(a, b) { return a.risk - b.risk; }).slice(0, 3);
    var topYears = annual.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);

    var strips = monthly.map(function(item) {
      var tone = item.risk >= 70 ? 'danger' : item.risk >= 50 ? 'warn' : 'ok';
      return '<div class="sb-risk-strip-item sb-risk-strip-item--' + tone + '">'
        + '<span class="sb-risk-strip-month">' + String(item.month).padStart(2, '0') + '월</span>'
        + '<span class="sb-risk-strip-bar"><i style="width:' + _clamp(item.risk, 5, 95) + '%"></i></span>'
        + '<span class="sb-risk-strip-value">' + item.risk + '</span>'
        + '</div>';
    }).join('');

    var radarRows = [
      { k: 'Career', v: apt.career || 0 },
      { k: 'Wealth', v: apt.wealth || 0 },
      { k: 'Execution', v: apt.execution || 0 },
      { k: 'Social', v: apt.social || 0 },
      { k: 'Recovery', v: apt.recovery || 0 }
    ].map(function(row) {
      return '<div class="sb-radar-row">'
        + '<span class="sb-radar-key">' + row.k + '</span>'
        + '<span class="sb-radar-bar"><i style="width:' + _clamp(row.v, 4, 99) + '%"></i></span>'
        + '<span class="sb-radar-value">' + row.v + '</span>'
        + '</div>';
    }).join('');

    var accordion = topYears.map(function(item, idx) {
      var notes = Array.isArray(item.conflictNotes) && item.conflictNotes.length
        ? item.conflictNotes.join(' / ')
        : '직격 충형파해 메모 없음';
      return '<details class="sb-insight-acc" ' + (idx === 0 ? 'open' : '') + '>'
        + '<summary>' + item.year + '년 · 위험 ' + item.risk + ' · ' + item.ganZhi + '</summary>'
        + '<div class="sb-insight-acc-body">'
        + '<p>세운 점수 ' + item.yearScore + ', 대운 점수 ' + item.daewunScore + ', 충격 단계 ' + item.shock + '.</p>'
        + '<p>충돌 신호: ' + notes + '</p>'
        + '<p>실행 요약: ' + (item.summary || '기본 리스크 기준 운용 권장') + '</p>'
        + '</div>'
        + '</details>';
    }).join('');

    var categoryCards = categoryMatrix.map(function(item) {
      var tone = item.score >= 75 ? 'ok' : item.score >= 55 ? 'warn' : 'danger';
      return '<article class="sb-cat-card sb-cat-card--' + tone + '">'
        + '<div class="sb-cat-card-head">'
        + '<h5>' + item.title + '</h5>'
        + '<span class="sb-cat-score">' + Math.round(item.score) + '</span>'
        + '</div>'
        + '<p class="sb-cat-summary">' + item.summary + '</p>'
        + '<p class="sb-cat-action">' + item.action + '</p>'
        + '</article>';
    }).join('');

    var quantumRows = Array.isArray(quantum.roles)
      ? quantum.roles.map(function(role) {
          var tone = role.role === 'good' ? 'ok' : role.role === 'bad' ? 'danger' : 'neutral';
          return '<span class="sb-quantum-chip sb-quantum-chip--' + tone + '">' + role.label + ' · ' + role.roleLabel + '</span>';
        }).join('')
      : '';

    return '<section class="sb-insight-panel">'
      + '<div class="sb-insight-head">RISK COMMAND CENTER</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>월별 위험 스트립</h4>'
      + '<div class="sb-risk-strip">' + strips + '</div>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>적성 레이다(5축)</h4>'
      + '<div class="sb-radar-wrap">' + radarRows + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>상위 위험 월 TOP3</h4>'
      + '<ul class="sb-insight-list">' + topMonths.map(function(m) { return '<li>' + m.month + '월 · 위험 ' + m.risk + (m.focus ? ' · ' + m.focus : '') + '</li>'; }).join('') + '</ul>'
      + '<h4>안정 월 TOP3</h4>'
      + '<ul class="sb-insight-list">' + stableMonths.map(function(m) { return '<li>' + m.month + '월 · 위험 ' + m.risk + (m.focus ? ' · ' + m.focus : '') + '</li>'; }).join('') + '</ul>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>카테고리 매트릭스</h4>'
      + '<div class="sb-cat-grid">' + categoryCards + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>리스크 하위요인</h4>'
      + '<ul class="sb-insight-list">'
      + '<li>오행 불균형: ' + (parts.elementImbalance || 0) + '</li>'
      + '<li>십성 과부하: ' + (parts.tenStarOverload || 0) + '</li>'
      + '<li>충·형·파·해: ' + (parts.collision || 0) + '</li>'
      + '<li>대운·세운 충돌: ' + (parts.daewunSeunConflict || 0) + '</li>'
      + '<li>월 변동성: ' + (parts.monthlyVolatility || 0) + '</li>'
      + '<li>조후 스트레스: ' + (parts.johuStress || 0) + '</li>'
      + '</ul>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>퀀텀 오행 진단</h4>'
      + '<ul class="sb-insight-list">'
      + '<li>모드: ' + (quantum.mode || '억부+조후') + '</li>'
      + '<li>조후 타입: ' + (quantum.johuType || 'neutral') + '</li>'
      + '<li>유리 오행: ' + ((quantum.favorableElements || []).join(', ') || '중립(추정)') + '</li>'
      + '<li>주의 오행: ' + ((quantum.cautionElements || []).join(', ') || '중립(추정)') + '</li>'
      + '</ul>'
      + '<div class="sb-quantum-chip-wrap">' + quantumRows + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid sb-insight-grid--single">'
      + '<article class="sb-insight-box">'
      + '<h4>고위험 연도 상세 아코디언</h4>'
      + accordion
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box sb-insight-box--warn"><h4>경고 박스</h4><p>고위험 월에는 결정 지연 규칙(24시간)과 문서 기반 합의 절차를 강제하세요.</p></article>'
      + '<article class="sb-insight-box sb-insight-box--plan"><h4>전략 박스</h4><p>안정 월에는 핵심 과제 1개를 전진 배치해 성과를 고정하고, 경계 월에는 검증 단계 비중을 늘리세요.</p></article>'
      + '<article class="sb-insight-box sb-insight-box--routine"><h4>루틴 박스</h4><p>주 2회 회복 루틴(수면/운동/비워두기)을 캘린더 고정하면 월 변동성 충격을 흡수할 수 있습니다.</p></article>'
      + '</div>'
      + '</section>';
  }

  function _renderChapterBodyRich(text) {
    var src = String(text || '').replace(/\r/g, '');
    var lines = src.split('\n');
    var html = [];
    var listBuf = [];

    function flushList() {
      if (!listBuf.length) return;
      html.push('<ul class="sb-chapter-list">' + listBuf.map(function(item) {
        return '<li>' + item + '</li>';
      }).join('') + '</ul>');
      listBuf = [];
    }

    lines.forEach(function(raw) {
      var line = String(raw || '').trim();
      if (!line) {
        flushList();
        return;
      }
      if (line.indexOf('## ') === 0) {
        flushList();
        html.push('<h4 class="sb-chapter-subtitle">' + line.slice(3) + '</h4>');
        return;
      }
      if (line.indexOf('- ') === 0) {
        listBuf.push(line.slice(2));
        return;
      }
      flushList();
      html.push('<p>' + line + '</p>');
    });
    flushList();
    return html.join('');
  }

  /* ── 도미네이터 리포트 렌더링 ── */
  function _renderDominatorReport(reportData, analysisData) {
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');

    var domSec = _q('sbDominatorSection');
    if (domSec) {
      domSec.classList.remove('sb-hidden');
      domSec.classList.add('sb-fadein');
    }

    var reportProfile = sanitizeSibylProfile(
      (reportData && reportData.canonicalData && reportData.canonicalData.normalizedProfile)
      || (analysisData && analysisData.normalizedProfile)
      || {}
    );
    var risk = _safeScore(
      (reportData && reportData.riskBreakdown && Number(reportData.riskBreakdown.total))
      || (reportProfile && reportProfile.scores && reportProfile.scores.riskScore)
      || Number(analysisData && analysisData.risk),
      SIBYL_DEFAULT_RISK_SCORE,
      0,
      100
    );
    var coeff = _safeScore(
      (reportData && Number(reportData.aptCoeff))
      || (reportProfile && reportProfile.scores && reportProfile.scores.aptitudeScore)
      || Number(analysisData && analysisData.coeff),
      SIBYL_DEFAULT_APTITUDE_SCORE,
      0,
      999
    );
    var dominant = _safeText(
      (reportData && reportData.dominantTenStar)
      || (reportProfile && reportProfile.saju && reportProfile.saju.tenGods && reportProfile.saju.tenGods.primary)
      || (analysisData && analysisData.dominant),
      SIBYL_PRIMARY_TENGOD_FALLBACK
    );
    var dominantEl = _safeText(
      (reportData && reportData.dominantEl)
      || (reportProfile && reportProfile.saju && reportProfile.saju.dominantElement)
      || (analysisData && analysisData.domEl),
      'water'
    );
    var mode = _dominatorMode(risk);

    // Dominator Mode Banner
    var modeMeta = {
      nle: { cls:'nle', tag:'MODE: STABLE GROWTH TRACK', title:_sibylText("sibyl.title.049"), desc:'현재 흐름은 안정 구간입니다. 성과를 키우기보다 재현 가능한 루틴을 고정해 변동성을 낮추는 것이 가장 효과적입니다.' },
      le:  { cls:'le',  tag:'MODE: RISK ADJUSTMENT TRACK', title:_sibylText("sibyl.title.050"), desc:'경계 신호가 감지된 구간입니다. 중요한 결정은 검증 단계를 먼저 두고, 실행 강도를 조절해 손실 구간을 짧게 관리하세요.' },
      dd:  { cls:'dd',  tag:'MODE: INTENSIVE RESET TRACK', title:_sibylText("sibyl.title.051"), desc:'고위험 변동 구간입니다. 기존 방식의 전면 중단이 아니라 핵심 프로세스를 재정렬해 리스크를 줄이고 회복력을 우선 확보하세요.' }
    };
    var mm = modeMeta[mode];
    var modeBanner = _q('sbDominatorModeBanner');
    if (modeBanner) {
      modeBanner.className = 'sb-dominator-mode sb-dominator-mode--' + mm.cls;
      modeBanner.innerHTML =
        '<div class="sb-dominator-mode-tag">' + mm.tag + '</div>'
        + '<div class="sb-dominator-mode-title">' + mm.title + '</div>'
        + '<div class="sb-dominator-mode-desc">' + mm.desc + '</div>';
    }

    // 10-year Risk Graph
    var svgEl = _q('sbRiskGraphSVG');
    if (svgEl && (analysisData && analysisData.pillars)) {
      var graphData = _buildRiskGraph(analysisData.pillars, reportData && reportData.annualRiskPlan);
      _renderRiskSVG(graphData, svgEl);
    }

    var metricsRow = domSec ? domSec.querySelector('.sb-metrics-row') : null;
    if (metricsRow) {
      metricsRow.classList.add('sb-metrics-row--expanded');
      var parts = reportData && reportData.riskBreakdown ? reportData.riskBreakdown.parts : null;
      metricsRow.innerHTML = ''
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">위험 계수</div>'
        + '<div class="sb-metric-value" id="sbDomRiskEl"><span id="sbDomRisk">0</span></div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">적성 계수</div>'
        + '<div class="sb-metric-value sb-metric-value--ok" id="sbDomCoeff">' + coeff + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">주도 십성</div>'
        + '<div class="sb-metric-value" id="sbDomSector">' + dominant + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">충·형·파·해</div>'
        + '<div class="sb-metric-value">' + (parts ? parts.collision : 0) + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">대운·세운 충돌</div>'
        + '<div class="sb-metric-value">' + (parts ? parts.daewunSeunConflict : 0) + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">월 변동성</div>'
        + '<div class="sb-metric-value">' + (parts ? parts.monthlyVolatility : 0) + '</div>'
        + '</div>';
    }

    // Metrics row
    _t('sbDomRisk', risk);
    var rEl = _q('sbDomRiskEl');
    if (rEl) rEl.className = 'sb-metric-value' + (risk >= 70 ? ' sb-metric-value--danger' : risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
    _t('sbDomCoeff', coeff);
    _t('sbDomSector', dominant);

    // Remedies
    var remedies = _buildRemedies(dominant, dominantEl);
    var remedyEl = _q('sbRemedyList');
    if (remedyEl) {
      remedyEl.innerHTML = remedies.map(function(r){
        return '<div class="sb-remedy-item">'+r+'</div>';
      }).join('');
    }

    // Report chapters
    var chaptersEl = _q('sbReportChapters');
    if (chaptersEl && reportData && reportData.chapters) {
      chaptersEl.id = 'sibyl-system-report-body';
      chaptersEl.setAttribute('data-report-scope', 'sibyl-only');
      chaptersEl.innerHTML = '';
      var insightWrap = document.createElement('div');
      insightWrap.className = 'sb-report-insight';
      insightWrap.innerHTML = _renderDominatorInsightPanel(reportData);
      chaptersEl.appendChild(insightWrap);
      if (Array.isArray(reportData.monthlyRiskPlan) && reportData.monthlyRiskPlan.length) {
        var monthlyWrap = document.createElement('div');
        monthlyWrap.className = 'sb-report-monthly';
        monthlyWrap.innerHTML = _renderMonthlyRiskPanel(reportData.monthlyRiskPlan);
        chaptersEl.appendChild(monthlyWrap);
      }
      if (Array.isArray(reportData.chapters) && reportData.chapters.length) {
        var jumpNav = document.createElement('nav');
        jumpNav.className = 'sb-chapter-jump';
        jumpNav.setAttribute('aria-label', '리포트 챕터 바로가기');
        jumpNav.innerHTML = reportData.chapters.map(function(ch, i) {
          var shortTitle = _sibylChapterShortTitle(ch.title || ('CH' + String(i + 1)));
          return '<button type="button" class="sb-chapter-jump-btn" data-target="sbChapter_' + i + '" data-idx="' + i + '">'
            + '<span class="sb-chapter-jump-num">' + String(i + 1).padStart(2, '0') + '</span>'
            + '<span class="sb-chapter-jump-label">' + shortTitle + '</span>'
            + '</button>';
        }).join('');
        chaptersEl.appendChild(jumpNav);

        if (!chaptersEl.__sbJumpBound) {
          chaptersEl.addEventListener('click', function(ev) {
            var btn = ev.target && ev.target.closest ? ev.target.closest('.sb-chapter-jump-btn') : null;
            if (!btn) return;
            var targetId = btn.getAttribute('data-target');
            if (!targetId) return;
            var target = document.getElementById(targetId);
            if (target && typeof target.scrollIntoView === 'function') {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
          chaptersEl.__sbJumpBound = true;
        }
      }
      reportData.chapters.forEach(function(ch, i) {
        var div = document.createElement('div');
        div.className = 'sb-report-chapter';
        div.id = 'sbChapter_' + i;
        div.innerHTML = '<div class="sb-chapter-header">'
          + '<span class="sb-chapter-num">CH.' + String(i+1).padStart(2,'0') + '</span>'
          + '<span class="sb-chapter-title">' + _sibylChapterShortTitle(ch.title) + '</span>'
          + '</div>'
          + '<div class="sb-chapter-body" id="sbChapBody_'+i+'"></div>';
        chaptersEl.appendChild(div);
        var target = _q('sbChapBody_'+i);
        if (target) target.innerHTML = _renderChapterBodyRich(ch.content || '');
      });
      _setupSibylChapterSpy(chaptersEl, jumpNav, reportData.chapters.length);
      if (_isSibylDevMode()) {
        _sibylLogInfo('[SibylReport] render body isolated', chaptersEl.id === 'sibyl-system-report-body');
      }
    } else if (chaptersEl && reportData && reportData.text) {
      // Fallback: single text block
      chaptersEl.innerHTML = '<div class="sb-report-chapter"><div class="sb-chapter-body" id="sbChapBodyMain"></div></div>';
      _typewriterEffect('sbChapBodyMain', reportData.text, 0);
    }
  }

  // 챕터 제목 앞의 "CH.01 " / "CH01 · " 접두어 제거 — 번호 칩/헤더 번호와 중복 방지.
  function _sibylChapterShortTitle(title) {
    return String(title || '').replace(/^CH\.?\s*\d+\s*[·\-]?\s*/i, '').trim();
  }

  // 챕터 스크롤스파이: 모달 스크롤러(.sb-panel) 안에서 현재 보는 챕터의 점프 칩을
  // 활성화(.is-active)하고, 레일 안에서 가로로만 가운데 정렬(페이지 스크롤 없음).
  function _setupSibylChapterSpy(chaptersEl, jumpNav, count) {
    if (!jumpNav || !count) return;
    try {
      if (chaptersEl && chaptersEl.__sbSpy && typeof chaptersEl.__sbSpy.disconnect === 'function') chaptersEl.__sbSpy.disconnect();
    } catch (_) {}
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var buttons = jumpNav.querySelectorAll('.sb-chapter-jump-btn');
    var scroller = document.querySelector('#sibylModal .sb-panel');
    var current = -1;
    function setActive(idx) {
      if (idx === current) return;
      current = idx;
      for (var b = 0; b < buttons.length; b += 1) {
        var on = Number(buttons[b].getAttribute('data-idx')) === idx;
        buttons[b].classList.toggle('is-active', on);
        if (on) {
          buttons[b].setAttribute('aria-current', 'true');
          var t = buttons[b].offsetLeft - (jumpNav.clientWidth / 2) + (buttons[b].clientWidth / 2);
          if (typeof jumpNav.scrollTo === 'function') jumpNav.scrollTo({ left: t, behavior: reduceMotion ? 'auto' : 'smooth' });
          else jumpNav.scrollLeft = t;
        } else {
          buttons[b].removeAttribute('aria-current');
        }
      }
    }
    if (!('IntersectionObserver' in window) || !scroller) { setActive(0); return; }
    var ratios = {};
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        var idx = Number(String(e.target.id).replace('sbChapter_', ''));
        ratios[idx] = e.isIntersecting ? e.intersectionRatio : 0;
      });
      var best = -1, bestRatio = -1;
      Object.keys(ratios).forEach(function(k) { if (ratios[k] > bestRatio) { bestRatio = ratios[k]; best = Number(k); } });
      if (best >= 0 && bestRatio > 0) setActive(best);
    }, { root: scroller, rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.2, 0.6, 1] });
    for (var i = 0; i < count; i += 1) {
      var el = document.getElementById('sbChapter_' + i);
      if (el) obs.observe(el);
    }
    if (chaptersEl) chaptersEl.__sbSpy = obs;
    setActive(0);
  }

  /* ── 타자기 효과 ── */
  function _typewriterEffect(elId, text, startDelay) {
    var el = _q(elId);
    if (!el) return;
    // For large texts - perform chunked rendering (performance)
    var CHUNK = 120;
    var pos = 0;
    el.innerHTML = '';
    function write() {
      if (pos >= text.length) return;
      el.innerHTML += text.slice(pos, pos + CHUNK).replace(/\n/g, '<br>');
      pos += CHUNK;
      if (pos < text.length) requestAnimationFrame(write);
    }
    setTimeout(write, startDelay || 0);
  }

  /* ── 메인 열기/닫기 ── */
  window.openSibylModal = function() {
    var modal = _q('sibylModal');
    if (!modal) return;
    _setSibylState(SibylState.LOADING);
    _sibylLastPaidContext = null;

    // Reset state
    var scanSec = _q('sb-scan-section');
    if (scanSec) scanSec.classList.remove('sb-hidden');
    var freeSec = _q('sbFreeSection');
    if (freeSec) freeSec.classList.add('sb-hidden');
    var premSec = _q('sbPremiumSection');
    if (premSec) premSec.classList.remove('sb-hidden');
    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.remove('sb-hidden');
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');
    var domSec = _q('sbDominatorSection');
    if (domSec) domSec.classList.add('sb-hidden');
    var errEl = _q('sbErrorState');
    if (errEl) errEl.classList.add('sb-hidden');

    // Check profile
    var profile = _getCurrentProfile();
    var pillars = window.G_PILLARS || null;
    var natal = window.G_NATAL || null;

    var noProfile = _q('sbNoProfile');
    var contentArea = _q('sbContentArea');

    if (!profile && !pillars) {
      if (noProfile) noProfile.classList.remove('sb-hidden');
      if (contentArea) contentArea.classList.add('sb-hidden');
      if (scanSec) scanSec.classList.add('sb-hidden');
    } else {
      if (noProfile) noProfile.classList.add('sb-hidden');
      if (contentArea) contentArea.classList.remove('sb-hidden');

      // If no G_PILLARS yet, compute from profile
      if (!pillars && profile && typeof window.computeProfileForModal === 'function') {
        var computed = window.computeProfileForModal(profile);
        if (computed) {
          pillars = computed.p || window.G_PILLARS;
          natal = computed.natal || window.G_NATAL;
        }
      }

      // Update profile display
      var profileChip = _q('sbProfileChip');
      if (profileChip && profile && profile.birth) {
        var b = profile.birth;
        profileChip.textContent = '대상: ' + (b.year || '--') + '.' + (b.month || '--') + '.' + (b.day || '--') + ' · ' + ((profile.gender || 'F') === 'M' ? '남성' : '여성');
      }

      // 결제 진입 지연 완화: 가격을 미리 백그라운드로 받아 둔다(게이트에서 재사용).
      if (!_isAdminBypassUser()) {
        _prefetchSibylPricing(profile).catch(function() {});
      }

      // Run scan animation then render free section
      _runScanAnim(function() {
        _renderFreeSection(pillars, natal);
        _syncSibylUnlockButton(profile);
        _openCachedDominatorReportIfUnlocked(profile, window._sibylCurrentData || {}).catch(function(err) {
          _sibylLogWarn('[SIBYL] unlock-state precheck failed', {
            code: String(err && err.code || ''),
            message: String(err && err.message || '')
          });
          _syncSibylUnlockButton(profile);
        });
      });
    }

    // 모바일 백스택(js/mobile-backstack-navigation.js closeAllKnownOverlays)은 오버레이를
    // 인라인 style 로 감춘다. 인라인이 #sibylModal.sb-open{display:flex} 를 이기므로,
    // 여는 쪽이 자기 가시성을 직접 회수하지 않으면 한 번 감춰진 뒤로는 영영 안 열린다.
    modal.style.display = '';
    modal.style.visibility = '';
    modal.style.pointerEvents = '';
    modal.removeAttribute('aria-hidden');
    modal.classList.add('sb-open');
    document.body.style.overflow = 'hidden';
    _bindSibylScrollLockGuard();

    // 터치 탭은 활성 요소를 남기지 않아 activeElement 가 <html> 또는 <body> 가 된다.
    // 그걸 그대로 저장하면 닫을 때 포커스가 문서 최상단으로 떨어져 복귀가 무의미해지므로,
    // 실제 포커스 가능한 요소일 때만 쓰고 아니면 진입 타일로 되돌린다.
    // 모달 안의 요소는 "여는 쪽"이 될 수 없다 — 탭 한 번에 이 함수가 두 번 불리면
    // 두 번째 호출이 이미 포커스된 .sb-panel 을 opener 로 잡아, 닫을 때 숨겨진 패널로
    // 포커스를 되돌리려다 body 로 떨어진다.
    var activeEl = document.activeElement;
    var focusableOpener = activeEl
      && activeEl !== document.body
      && activeEl !== document.documentElement
      && !modal.contains(activeEl)
      && typeof activeEl.focus === 'function';
    _sibylOpener = focusableOpener ? activeEl : document.querySelector('[data-action="openSibylModal"]');
    document.addEventListener('keydown', _onSibylKeydown);
    var panel = modal.querySelector('.sb-panel');
    if (panel && typeof panel.focus === 'function') {
      try { panel.focus({ preventScroll: true }); } catch (_) { panel.focus(); }
    }
  };

  // 다른 모달(js/iching-modal.js 등)과 같은 방식: 모달별 Escape 핸들러.
  var _sibylOpener = null;
  function _onSibylKeydown(event) {
    if (!event || (event.key !== 'Escape' && event.key !== 'Esc')) return;
    var modal = _q('sibylModal');
    if (!modal || !modal.classList.contains('sb-open')) return;
    event.preventDefault();
    window.closeSibylModal();
  }

  // 모달을 정상 close 하지 않고 이탈(페이지 이동/뒤로가기/해시 변경)해도
  // 스크롤락(body overflow:hidden)이 영구히 남지 않도록 하는 이중 안전장치.
  function _bindSibylScrollLockGuard() {
    if (window.__cdSibylScrollGuardBound) return;
    window.__cdSibylScrollGuardBound = true;
    var releaseIfClosed = function() {
      var modal = _q('sibylModal');
      if (modal && modal.classList.contains('sb-open')) return;
      try { document.body.style.overflow = ''; } catch (_) {}
    };
    window.addEventListener('pagehide', function() {
      try { document.body.style.overflow = ''; } catch (_) {}
    });
    window.addEventListener('popstate', releaseIfClosed);
    window.addEventListener('hashchange', releaseIfClosed);
  }

  window.closeSibylModal = function() {
    var modal = _q('sibylModal');
    if (!modal) return;
    modal.classList.remove('sb-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    document.removeEventListener('keydown', _onSibylKeydown);
    // 셸에도 Escape 핸들러가 있어 같은 프레임에서 포커스를 다시 만진다.
    // 여기서 바로 되돌리면 그쪽에 덮여 포커스가 body 로 떨어지므로, 동기 핸들러가 모두
    // 끝난 뒤에 복귀시킨다. 그 사이 모달이 다시 열렸다면 복귀를 포기한다.
    var opener = _sibylOpener;
    _sibylOpener = null;
    if (!opener || typeof opener.focus !== 'function') return;
    setTimeout(function() {
      var reopened = modal.classList.contains('sb-open');
      if (reopened || !document.contains(opener)) return;
      try { opener.focus({ preventScroll: true }); } catch (_) { opener.focus(); }
    }, 0);
  };

  /* ── Unlock dominator (exposed) ── */
  window._sibylUnlockDominator = function() {
    _unlockDominator().catch(function(e) {
      _sibylLogError('[SIBYL] premium unlock failed', e);
      _setSibylState(SibylState.ERROR, _toFriendlySibylErrorMessage(e, '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'));
      var genEl = _q('sbGenerating');
      if (genEl) genEl.classList.add('sb-hidden');
    });
  };

  window._sibylRetryDominator = function() {
    if (!_sibylLastPaidContext && !_isAdminBypassUser()) {
      _setSibylState(SibylState.ERROR, '재시도 전에 결제를 다시 진행해 주세요.');
      return;
    }

    _setSibylState(SibylState.GENERATING_REPORT, '>> 리포트 생성을 재시도하는 중입니다…');
    _generateDominatorReport(_sibylLastPaidContext).catch(function(e) {
      _sibylLogError('[SIBYL] premium unlock failed', e);
      _setSibylState(SibylState.ERROR, _toFriendlySibylErrorMessage(e, '재시도에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
    });
  };

  /* Action handler integration */
  document.addEventListener('DOMContentLoaded', function() {
    // Touch/click delegation is already in index.html — register lazy loader
    if (!window.__cdLazyActionLoaders) window.__cdLazyActionLoaders = {};
    window.__cdLazyActionLoaders['openSibylModal'] = function() {
      // Already loaded
    };
    window.__cdLazyActionLoaders['closeSibylModal'] = function() {};
  });

  // Expose for tile preview data
  window._sibylSystemReady = true;

}(window));
