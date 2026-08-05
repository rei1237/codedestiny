/* 리포트 대시보드 UI — 원본 saju-engine-continuation.js 에서 분리 (로직 동일)
 * 로드 순서: js/saju-engine.js → js/saju-engine-tarot-sukuyo-quantum.js → (본 파일) → js/saju-engine-continuation.js */
var REPORT_DASHBOARD_TEXT_TRANSLATIONS = {
  ko: {
    "rd.title.001": "사주 십이운성 동물 테스트",
    "rd.description.001": "내 사주의 십이운성 에너지가 동물 아키타입으로 열리며 성격 핵심·연애 패턴·직업 성향·관계 궁합·오늘의 행동 미션까지 한 번에 비춥니다.",
    "rd.cta.001": "🐾 나의 수호 동물 소환",
    "rd.title.002": "사주로 보는 인연의 장소",
    "rd.description.002": "사주 오행/용신 흐름으로 인연이 열리는 장소, 국가, 시기, 운명의 아이템을 감성 리포트로 제안합니다.",
    "rd.cta.002": "💞 내 인연의 장소 열기",
    "rd.title.003": "LOVE CODE",
    "rd.description.003": "사주 오행으로 상대방과 가장 닮은 연애 페르소나를 찾고, 선택형 데이트 시뮬레이션으로 케미를 확인합니다.",
    "rd.cta.003": "💕 러브 코드 잠금 해제",
    "rd.label.001": "나의 매력 클래스",
    "rd.cta.004": "✨ 매력 분석 자세히 보기",
    "rd.label.002": "퀀텀 명리 엔진",
    "rd.cta.005": "⚡ 퀀텀 명리 전체 열기",
    "rd.label.003": "명리 헬스 리포트",
    "rd.cta.006": "💚 건강 리포트 확인하기",
    "rd.label.004": "사주 AI 프롬프트",
    "rd.cta.007": "🤖 무료 프롬프트 보기",
    "rd.label.005": "인생 스킬 트리",
    "rd.cta.008": "🎮 스킬 트리 펼쳐보기",
    "rd.label.006": "극T 테스트",
    "rd.cta.009": "🧊 극T 테스트 결과 보기",
    "rd.label.007": "테토 vs 에겐",
    "rd.cta.010": "❤️ 테토/에겐 분석 보기",
    "rd.label.008": "사주로 보는 여행지",
    "rd.cta.011": "🗺️ 여행지 리포트 보기",
    "rd.label.009": "빌런 블랙리스트",
    "rd.cta.012": "⚠️ 빌런 리포트 열기",
    "rd.label.010": "퀀텀 로또 리포트",
    "rd.cta.013": "퀀텀 로또 리포트 보기",
    "rd.label.011": "사주 다이어리",
    "rd.cta.014": "📔 사주 다이어리 열기",
    "rd.label.012": "사주네컷 : 운명 필터",
    "rd.cta.015": "📸 사주네컷 열기",
    "rd.label.013": "시크릿 하우스 : 연애 시뮬",
    "rd.cta.016": "🏠 시크릿 하우스 입장",
    "rd.label.018": "나는 도파민 중독일까?",
    "rd.cta.017": "🧠 내 자극 지수 확인하기",
    "rd.label.014": "운명필터",
    "rd.title.004": "MZ 운명 필터 ON",
    "rd.label.015": "러브DM",
    "rd.title.005": "러브 시그널 네컷",
    "rd.label.016": "갓생루틴",
    "rd.title.006": "오늘의 갓생 체크인",
    "rd.label.017": "흑역사방지",
    "rd.title.007": "흑역사 방지 필터",
    "rd.title.008": "1. 본캐 Vibe 능력치",
    "rd.title.009": "2. 첫인상 vs 현인상",
    "rd.title.010": "3. 머릿속 브레인맵",
    "rd.title.011": "4. 오늘의 럭키비키",
    "rd.title.012": "1. 호감 첫 컷",
    "rd.title.013": "2. 플러팅 온도",
    "rd.title.014": "3. 마음 브레인맵",
    "rd.title.015": "4. 오늘의 러브 액션",
    "rd.title.016": "1. 오늘의 시작 버튼",
    "rd.title.017": "2. 일잘러 모드",
    "rd.title.018": "3. 집중력 충전팩",
    "rd.title.019": "4. 퇴근 전 럭키팩",
    "rd.title.020": "1. 급발진 경보",
    "rd.title.021": "2. 말실수 방지컷",
    "rd.title.022": "3. 지출 잠금컷",
    "rd.title.023": "4. 보호 주문",
    "rd.aria-label.001": "사주네컷 버전 선택",
    "rd.aria-label.002": "share hashtags",
    "rd.title.024": "사주네컷 : 운명 필터",
  }
};

function _reportDashboardText(key) {
  var ko = REPORT_DASHBOARD_TEXT_TRANSLATIONS.ko[key] || '';
  try {
    if (typeof window !== 'undefined' && window && typeof window.cdTranslate === 'function') {
      return window.cdTranslate(key, {}, ko);
    }
  } catch (_) {}
  return ko || 'Translation pending';
}


/* ══════════════════════════════════════════════
   리포트 대시보드 — 10개 분석 기능 카드 UI
   ══════════════════════════════════════════════ */
var SAJU_ANIMAL_TEST_FEATURE = {
  id: 'saju-animal-test',
  title: _reportDashboardText("rd.title.001"),
  shortTitle: '사주 동물 테스트',
  description: _reportDashboardText("rd.description.001"),
  category: 'fun-saju',
  group: '재미있는 사주 콘텐츠',
  href: '/saju/animal-destiny',
  emoji: '🐷🐱🦁',
  tags: ['십이운성', '동물점', '연애패턴', '직업성향', '오늘미션'],
  badge: 'NEW',
  enabled: true,
  requiresLogin: false,
  requiresProfile: false,
  cta: _reportDashboardText("rd.cta.001"),
  lockKey: 'animal-destiny-unlock',
  coinCost: 100,
  thumb: '동물점테스트.webp',
  action: 'openAnimalDestinyRoute',
  target: 'animalDestinyEntryCard'
};

var DESTINY_MEETING_PLACE_FEATURE = {
  id: 'destiny-meeting-place',
  title: _reportDashboardText("rd.title.002"),
  shortTitle: '인연의 장소',
  description: _reportDashboardText("rd.description.002"),
  category: 'fun-saju',
  group: '재미있는 사주 콘텐츠',
  href: '/saju/destiny-meeting-place',
  tags: ['인연운', '오행여행', '용신장소', '로맨스시기', '운명의아이템'],
  badge: 'NEW',
  enabled: true,
  requiresLogin: false,
  requiresProfile: false,
  cta: _reportDashboardText("rd.cta.002"),
  lockKey: 'destiny_meeting_place',
  coinCost: 100,
  mainLock: false,
  thumb: '사주로보는 인연의 장소.webp',
  action: 'openDestinyMeetingPlaceRoute',
  target: 'destinyMeetingPlaceEntryCard'
};

var LOVE_CODE_FEATURE = {
  id: 'love-code',
  title: _reportDashboardText("rd.title.003"),
  shortTitle: '러브 코드',
  description: _reportDashboardText("rd.description.003"),
  category: 'fun-saju',
  group: '재미있는 사주 콘텐츠',
  href: '/saju/love-simulation',
  tags: ['러브 코드', '연애 시뮬레이션', '오행 궁합', '소울메이트'],
  badge: 'LOCK',
  enabled: true,
  requiresLogin: true,
  requiresProfile: false,
  cta: _reportDashboardText("rd.cta.003"),
  lockKey: 'loveSimulation',
  coinCost: 100,
  thumb: 'love code.webp',
  action: 'openLoveSimulationRoute',
  target: 'loveCodeEntryCard'
};

var REPORT_CARDS = [
  { id:'meryok',     label:_reportDashboardText("rd.label.001"),      desc:'신살 스탯 · 도화 · 역마 지수를 확인해보세요.',          note:'요즘 왜 유독 시선이 꽂히는지, 내 매력 포인트를 한 번에 읽어드립니다.', cta:_reportDashboardText("rd.cta.004"), thumb:'meryok-new.webp', accent:'#f472b6', glow:'rgba(244,114,182,.55)', target:'specialCharmCard',   coinCost:30  },
  { id:'quantum',    thumb:'퀀텀 명리 엔진.webp', label:_reportDashboardText("rd.label.002"),        desc:'합화 우선 분석으로 나만의 천기 지도가 열립니다.',      note:'한 번 해금하면 합화·용신 보정·천기 전략 리포트 전체가 계속 머뭅니다.', cta:_reportDashboardText("rd.cta.005"),          accent:'#38bdf8', glow:'rgba(56,189,248,.55)',  target:'quantumCard',        lockKey:'rpt_quantumCard', coinCost:100, badge:'10,000원 · 영구 해금'  },
  { id:'sajuhealth', thumb:'명리 헬스 리포트.webp', label:_reportDashboardText("rd.label.003"),      desc:'오행 균형과 건강 약점 신호를 점검해보세요.',             note:'놓치기 쉬운 몸의 신호를 사주 관점으로 풀어, 수호 우선순위를 정리해드립니다.', cta:_reportDashboardText("rd.cta.006"),      accent:'#4ade80', glow:'rgba(74,222,128,.55)',  target:'healthReportCard',   coinCost:100  },
  { id:'sajuprompt', thumb:'사주 프롬프트.webp', label:_reportDashboardText("rd.label.004"),      desc:'물상·아바타·이상형 얼굴 등 무료 AI 이미지 프롬프트를 받아보세요.', note:'내 사주의 분위기를 다양한 컨셉의 이미지 프롬프트로 바로 가져갈 수 있습니다.', cta:_reportDashboardText("rd.cta.007"),    accent:'#c084fc', glow:'rgba(192,132,252,.55)', target:'aiPromptCard',       coinCost:0 },
  { id:'sajurpg',    thumb:'RPG 인생 스킬트리.webp', label:_reportDashboardText("rd.label.005"),        desc:'운명 RPG 스타일로 내 능력치 레벨을 확인합니다.',         note:'내 강점 스탯과 취약 스탯을 RPG처럼 시각화해 성장 루트를 제시합니다.', cta:_reportDashboardText("rd.cta.008"),        accent:'#fbbf24', glow:'rgba(251,191,36,.55)',  target:'skillTreeCard',      coinCost:30  },
  { id:'tbal',       thumb:'극T테스트.webp', label:_reportDashboardText("rd.label.006"),            desc:'The Frozen Logic, 내 논리 온도를 분석합니다.',          note:'감정보다 이성이 먼저 반응하는 순간, 당신의 판단 패턴을 콕 집어드립니다.', cta:_reportDashboardText("rd.cta.009"),      accent:'#67e8f9', glow:'rgba(103,232,249,.55)', target:'tTestCard',          coinCost:0   },
  { id:'tetoegen',   thumb:'테토VS에겐.webp', label:_reportDashboardText("rd.label.007"),          desc:'사주 기반으로 나의 매력 에너지 결을 분석합니다.',       note:'강하게 끌어당기는 타입인지, 부드럽게 스며드는 타입인지 매력 결을 보여드립니다.', cta:_reportDashboardText("rd.cta.010"),      accent:'#fb923c', glow:'rgba(251,146,60,.55)',  target:'hormone-vibe-section',coinCost:0  },
  { id:'trip',       thumb:'사주로 보는 여행지.webp', label:_reportDashboardText("rd.label.008"),     desc:'사주 오행 균형 기준으로 지금 맞는 여행지를 안내합니다.', note:'국내/해외 추천 좌표와 방향 포인트를 함께 확인해 이동 운을 끌어올려보세요.', cta:_reportDashboardText("rd.cta.011"),         accent:'#2dd4bf', glow:'rgba(45,212,191,.55)',  target:'energyCoordCard',    coinCost:50  },
  { id:'vilun',      label:_reportDashboardText("rd.label.009"),        desc:'내 인생을 흔드는 위험 유형을 분석합니다.',               note:'유난히 소모되는 관계의 패턴을 파악하고, 피해야 할 시그널을 정리해드립니다.', cta:_reportDashboardText("rd.cta.012"),          accent:'#f87171', thumb:'vilun-new.webp', glow:'rgba(248,113,113,.55)', target:'villainCard',         coinCost:50  },
  { id:'lotto',      thumb:'사주 로또.webp', label:_reportDashboardText("rd.label.010"),       desc:'사주 오행과 수리 상징으로 만든 재미용 번호가 떠오릅니다.',          note:'오늘 운의 파동과 맞는 상징 번호와 행운 루틴이 가볍게 머뭅니다.', cta:_reportDashboardText("rd.cta.013"),          accent:'#fde047', glow:'rgba(253,224,71,.55)',  target:'lottoCard',          coinCost:0   },
  { id:'fortunePlanner', thumb:'사주 다이어리.webp', label:'운세 플래너', desc:'일정·할 일·시간표에 오늘의 운 흐름을 함께 정리해보세요.', note:'누구나 무료로, 횟수 제한 없이 이 기기에 일정을 저장할 수 있습니다.', cta:'일정 보기', accent:'#818cf8', glow:'rgba(129,140,248,.55)', action:'openFortunePlanner', coinCost:0, badge:'무료' },
  { id:'4CUT',       thumb:'사주 네컷.webp', label:_reportDashboardText("rd.label.012"),   desc:'사주 데이터를 인생네컷 감성으로 재해석해 한 장에 담아보세요.', note:'킹받는데 공감되는 팩폭으로 네 컷을 완성했어요. 저장하고 카톡으로 바로 던져봐.', cta:_reportDashboardText("rd.cta.015"),            accent:'#f97316', glow:'rgba(249,115,22,.45)',  target:'sajuFourCutCard',    coinCost:0   },
  { id:'dopamine',   thumb:'도파민 중독.webp', label:_reportDashboardText("rd.label.018"), shortTitle:'도파민 중독 테스트', desc:'새로운 자극을 쫓는 타입인지, 안정을 더 사랑하는 타입인지 확인해보세요.', note:'자극 지수와 등급, 자극 레이더 8축, 몰입 분야, 오늘의 미션까지 한 번에 확인합니다.', cta:_reportDashboardText("rd.cta.017"), accent:'#e879f9', glow:'rgba(232,121,249,.5)', target:'dopamineCard', coinCost:0, badge:'NEW' },
  { id:'secretHouse', thumb:'시크릿 하우스.webp', label:_reportDashboardText("rd.label.013"), desc:'선택형 사주 연애 리얼리티로 엔딩 루트를 체험해보세요.', note:'자동 일간 연동 + 다중 엔딩 + 엔딩 카드 저장/공유까지 이어지는 몰입형 콘텐츠입니다.', cta:_reportDashboardText("rd.cta.016"), accent:'#f43f5e', glow:'rgba(244,63,94,.45)', target:'secretHouseEntryCard', action:'openSecretHouseRoute', coinCost:50 },
  { id: SAJU_ANIMAL_TEST_FEATURE.id, thumb: SAJU_ANIMAL_TEST_FEATURE.thumb, label: SAJU_ANIMAL_TEST_FEATURE.title, shortTitle: SAJU_ANIMAL_TEST_FEATURE.shortTitle, desc: SAJU_ANIMAL_TEST_FEATURE.description, note:'열두 운성의 기세를 동물 캐릭터로 매핑해 "왜 이 관계에서 힘든지"와 "지금 바로 써먹을 한 줄 행동"까지 재밌고 현실적으로 제시합니다.', cta: SAJU_ANIMAL_TEST_FEATURE.cta, accent:'#f59e0b', glow:'rgba(245,158,11,.45)', target: SAJU_ANIMAL_TEST_FEATURE.target, action: SAJU_ANIMAL_TEST_FEATURE.action, lockKey: SAJU_ANIMAL_TEST_FEATURE.lockKey, coinCost: SAJU_ANIMAL_TEST_FEATURE.coinCost, badge: SAJU_ANIMAL_TEST_FEATURE.badge, tags: SAJU_ANIMAL_TEST_FEATURE.tags, group: SAJU_ANIMAL_TEST_FEATURE.group },
  { id: DESTINY_MEETING_PLACE_FEATURE.id, thumb: DESTINY_MEETING_PLACE_FEATURE.thumb, label: DESTINY_MEETING_PLACE_FEATURE.title, shortTitle: DESTINY_MEETING_PLACE_FEATURE.shortTitle, desc: DESTINY_MEETING_PLACE_FEATURE.description, note:'이 페이지 단독으로 생년월일 입력부터 분석까지 실행하며, 인연 장소 TOP5·국가/도시·만남 타이밍·아이템·실천 플랜을 한 번에 제시합니다.', cta: DESTINY_MEETING_PLACE_FEATURE.cta, accent:'#c084fc', glow:'rgba(192,132,252,.45)', target: DESTINY_MEETING_PLACE_FEATURE.target, action: DESTINY_MEETING_PLACE_FEATURE.action, lockKey: DESTINY_MEETING_PLACE_FEATURE.lockKey, coinCost: DESTINY_MEETING_PLACE_FEATURE.coinCost, mainLock: DESTINY_MEETING_PLACE_FEATURE.mainLock, badge: DESTINY_MEETING_PLACE_FEATURE.badge, tags: DESTINY_MEETING_PLACE_FEATURE.tags, group: DESTINY_MEETING_PLACE_FEATURE.group },
  { id: LOVE_CODE_FEATURE.id, thumb: LOVE_CODE_FEATURE.thumb, label: LOVE_CODE_FEATURE.title, shortTitle: LOVE_CODE_FEATURE.shortTitle, desc: LOVE_CODE_FEATURE.description, note:'상대의 생년월일시를 입력하면 사주 오행·일간 흐름으로 가장 닮은 러브 코드 캐릭터를 찾고, 선택에 따라 관계 온도가 달라지는 가상 데이트를 엽니다.', cta: LOVE_CODE_FEATURE.cta, accent:'#f472b6', glow:'rgba(244,114,182,.48)', target: LOVE_CODE_FEATURE.target, action: LOVE_CODE_FEATURE.action, lockKey: LOVE_CODE_FEATURE.lockKey, coinCost: LOVE_CODE_FEATURE.coinCost, badge: LOVE_CODE_FEATURE.badge, tags: LOVE_CODE_FEATURE.tags, group: LOVE_CODE_FEATURE.group }
];

(function ensureSajuAnimalCardOrder() {
  var animalCard = null;
  var meetingPlaceCard = null;
  var loveCodeCard = null;
  var normalized = [];

  for (var i = 0; i < REPORT_CARDS.length; i += 1) {
    var item = REPORT_CARDS[i];
    if (!item) continue;
    if (item.id === SAJU_ANIMAL_TEST_FEATURE.id) {
      animalCard = item;
      continue;
    }
    if (item.id === DESTINY_MEETING_PLACE_FEATURE.id) {
      meetingPlaceCard = item;
      continue;
    }
    if (item.id === LOVE_CODE_FEATURE.id) {
      loveCodeCard = item;
      continue;
    }
    normalized.push(item);
  }

  if (!animalCard) {
    animalCard = {
      id: SAJU_ANIMAL_TEST_FEATURE.id,
      thumb: SAJU_ANIMAL_TEST_FEATURE.thumb,
      label: SAJU_ANIMAL_TEST_FEATURE.title,
      shortTitle: SAJU_ANIMAL_TEST_FEATURE.shortTitle,
      desc: SAJU_ANIMAL_TEST_FEATURE.description,
      note: '열두 운성의 기세를 동물 캐릭터로 매핑해 "왜 이 관계에서 힘든지"와 "지금 바로 써먹을 한 줄 행동"까지 재밌고 현실적으로 제시합니다.',
      cta: SAJU_ANIMAL_TEST_FEATURE.cta,
      accent: '#f59e0b',
      glow: 'rgba(245,158,11,.45)',
      target: SAJU_ANIMAL_TEST_FEATURE.target,
      action: SAJU_ANIMAL_TEST_FEATURE.action,
      lockKey: SAJU_ANIMAL_TEST_FEATURE.lockKey,
      coinCost: SAJU_ANIMAL_TEST_FEATURE.coinCost,
      badge: SAJU_ANIMAL_TEST_FEATURE.badge,
      tags: SAJU_ANIMAL_TEST_FEATURE.tags,
      group: SAJU_ANIMAL_TEST_FEATURE.group
    };
  }

  if (!meetingPlaceCard) {
    meetingPlaceCard = {
      id: DESTINY_MEETING_PLACE_FEATURE.id,
      thumb: DESTINY_MEETING_PLACE_FEATURE.thumb,
      label: DESTINY_MEETING_PLACE_FEATURE.title,
      shortTitle: DESTINY_MEETING_PLACE_FEATURE.shortTitle,
      desc: DESTINY_MEETING_PLACE_FEATURE.description,
      note: '이 페이지 단독으로 생년월일 입력부터 분석까지 실행하며, 인연 장소 TOP5·국가/도시·만남 타이밍·아이템·실천 플랜을 한 번에 제시합니다.',
      cta: DESTINY_MEETING_PLACE_FEATURE.cta,
      accent: '#c084fc',
      glow: 'rgba(192,132,252,.45)',
      target: DESTINY_MEETING_PLACE_FEATURE.target,
      action: DESTINY_MEETING_PLACE_FEATURE.action,
      lockKey: DESTINY_MEETING_PLACE_FEATURE.lockKey,
      coinCost: DESTINY_MEETING_PLACE_FEATURE.coinCost,
      mainLock: DESTINY_MEETING_PLACE_FEATURE.mainLock,
      badge: DESTINY_MEETING_PLACE_FEATURE.badge,
      tags: DESTINY_MEETING_PLACE_FEATURE.tags,
      group: DESTINY_MEETING_PLACE_FEATURE.group
    };
  }

  if (!loveCodeCard) {
    loveCodeCard = {
      id: LOVE_CODE_FEATURE.id,
      thumb: LOVE_CODE_FEATURE.thumb,
      label: LOVE_CODE_FEATURE.title,
      shortTitle: LOVE_CODE_FEATURE.shortTitle,
      desc: LOVE_CODE_FEATURE.description,
      note: '상대의 생년월일시를 입력하면 사주 오행·일간 흐름으로 가장 닮은 러브 코드 캐릭터를 찾고, 선택에 따라 관계 온도가 달라지는 가상 데이트를 엽니다.',
      cta: LOVE_CODE_FEATURE.cta,
      accent: '#f472b6',
      glow: 'rgba(244,114,182,.48)',
      target: LOVE_CODE_FEATURE.target,
      action: LOVE_CODE_FEATURE.action,
      lockKey: LOVE_CODE_FEATURE.lockKey,
      coinCost: LOVE_CODE_FEATURE.coinCost,
      badge: LOVE_CODE_FEATURE.badge,
      tags: LOVE_CODE_FEATURE.tags,
      group: LOVE_CODE_FEATURE.group
    };
  }

  var secretIdx = -1;
  for (var j = 0; j < normalized.length; j += 1) {
    if (normalized[j] && normalized[j].id === 'secretHouse') {
      secretIdx = j;
      break;
    }
  }

  if (secretIdx >= 0) {
    normalized.splice(secretIdx + 1, 0, animalCard);
    normalized.splice(secretIdx + 2, 0, meetingPlaceCard);
    normalized.splice(secretIdx + 3, 0, loveCodeCard);
  } else {
    normalized.push(animalCard);
    normalized.push(meetingPlaceCard);
    normalized.push(loveCodeCard);
  }

  REPORT_CARDS = normalized;
})();

(function ensureSajuAnimalCardRegistered() {
  var isLocalDebug = false;
  try {
    var host = String((window.location && window.location.hostname) || '');
    isLocalDebug = host === 'localhost' || host === '127.0.0.1';
  } catch (_) {
    isLocalDebug = false;
  }

  if (!isLocalDebug) return;

  var hasAnimalTest = REPORT_CARDS.some(function(item) {
    return item.id === SAJU_ANIMAL_TEST_FEATURE.id;
  });

  if (!hasAnimalTest && typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[FeatureRegistry] 사주 동물 테스트 카드가 재미있는 사주 콘텐츠에 등록되지 않았습니다.');
  }
})();

function _rptIsDirectAction(actionName) {
  return actionName === 'openFortunePlanner' || actionName === 'openSecretHouseRoute' || actionName === 'openAnimalDestinyRoute' || actionName === 'openDestinyMeetingPlaceRoute' || actionName === 'openLoveSimulationRoute';
}

window.openSecretHouseRoute = function() {
  var stem = '';
  try {
    stem = String(
      (window.G_PILLARS && window.G_PILLARS.d && window.G_PILLARS.d.g) ||
      window.DAY_GAN ||
      (window.__destinyFlowerSajuSnapshot && window.__destinyFlowerSajuSnapshot.dayStem) ||
      ''
    ).trim();
  } catch (_eStem) {
    stem = '';
  }
  var target = '/secret-house_real.html';
  if (/^[甲乙丙丁戊己庚辛壬癸]$/.test(stem)) {
    target += '?dayStem=' + encodeURIComponent(stem);
  }
  try {
    window.location.assign(target);
  } catch (e) {
    window.open(target, '_blank');
  }
};

window.openAnimalDestinyRoute = function() {
  var target = SAJU_ANIMAL_TEST_FEATURE.href || '/saju/animal-destiny';
  try {
    window.location.assign(target);
  } catch (e) {
    window.open(target, '_blank');
  }
};

window.openDestinyMeetingPlaceRoute = function() {
  var target = DESTINY_MEETING_PLACE_FEATURE.href || '/saju/destiny-meeting-place';
  try {
    window.location.assign(target);
  } catch (e) {
    window.open(target, '_blank');
  }
};

window.openLoveSimulationRoute = function() {
  var target = LOVE_CODE_FEATURE.href || '/saju/love-simulation';
  try {
    window.location.assign(target);
  } catch (e) {
    window.open(target, '_blank');
  }
};

var S4C_TAG_TEXT = '#사주네컷 #코드데스티니 #꿀꿀 만세력 #무료 사주 #무료 운세 #대박 운세 #신년운세 #성격테스트 #2026운세';
var _s4cCanvasLoader = null;
var S4C_TAG_LIST = ['#사주네컷', '#코드데스티니', '#꿀꿀만세력', '#무료사주', '#무료운세', '#대박운세', '#신년운세', '#성격테스트', '#2026운세'];
var S4C_VARIANT_STORAGE_KEY = 'cd_saju_fourcut_variant_v20260617_mz';

function _s4cGetVariantDefs() {
  return [
    { id: 'vibe', label: _reportDashboardText("rd.label.014"), title: _reportDashboardText("rd.title.004"), badge: '오늘 폼 체크', accent: '#ec4899', glow: 'rgba(236,72,153,.30)', icons: ['🪩', '🎭', '🧠', '🍀'] },
    { id: 'love', label: _reportDashboardText("rd.label.015"), title: _reportDashboardText("rd.title.005"), badge: '답장 온도', accent: '#f43f5e', glow: 'rgba(244,63,94,.28)', icons: ['💌', '💘', '🫧', '🌙'] },
    { id: 'routine', label: _reportDashboardText("rd.label.016"), title: _reportDashboardText("rd.title.006"), badge: '루틴 저장', accent: '#0ea5e9', glow: 'rgba(14,165,233,.28)', icons: ['📌', '⚡', '🧃', '🎧'] },
    { id: 'anti', label: _reportDashboardText("rd.label.017"), title: _reportDashboardText("rd.title.007"), badge: '급발진 잠금', accent: '#7c3aed', glow: 'rgba(124,58,237,.30)', icons: ['🚧', '🫠', '🧯', '🪬'] }
  ];
}

function _s4cGetActiveVariantId() {
  var fallback = 'vibe';
  var saved = '';
  try { saved = window.localStorage ? window.localStorage.getItem(S4C_VARIANT_STORAGE_KEY) : ''; } catch (e) {}
  var id = window.__sajuFourCutVariant || saved || fallback;
  var found = _s4cGetVariantDefs().some(function(v) { return v.id === id; });
  return found ? id : fallback;
}

function _s4cFindVariant(id) {
  var defs = _s4cGetVariantDefs();
  for (var i = 0; i < defs.length; i += 1) {
    if (defs[i].id === id) return defs[i];
  }
  return defs[0];
}

function _s4cEnsureExperienceStyles() {
  if (document.getElementById('s4c-experience-v20260617')) return;
  var style = document.createElement('style');
  style.id = 's4c-experience-v20260617';
  style.textContent = [
    '#reportDashboardCard .s4c-v2{--s4c-accent:#ec4899;--s4c-glow:rgba(236,72,153,.30);padding:0;border:0;background:linear-gradient(145deg,#0b1026 0%,#251548 42%,#fff6fb 42.2%,#f8fbff 100%);box-shadow:0 24px 54px rgba(12,16,40,.24),inset 0 1px 0 rgba(255,255,255,.70)}',
    '#reportDashboardCard .s4c-v2::before{opacity:.42;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.36) 1px,transparent 1.4px),radial-gradient(circle at 2px 2px,rgba(255,255,255,.16) .8px,transparent 1.2px);background-size:18px 18px,31px 31px}',
    '#reportDashboardCard .s4c-v2-shell{position:relative;z-index:1;padding:16px;display:grid;gap:14px}',
    '#reportDashboardCard .s4c-v2-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end;color:#fff}',
    '#reportDashboardCard .s4c-v2-kicker{display:inline-flex;width:max-content;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.12);padding:6px 10px;font-size:.68rem;font-weight:950;letter-spacing:.12em;color:#ffeafd;box-shadow:0 10px 24px rgba(0,0,0,.16)}',
    '#reportDashboardCard .s4c-v2-title{margin:8px 0 0;font-family:"NeoDunggeunmo","Galmuri9","Pretendard Variable",sans-serif;font-size:clamp(1.45rem,4.8vw,2.72rem);line-height:1.02;letter-spacing:0;color:#fff;text-shadow:0 2px 0 rgba(15,23,42,.72),0 0 24px var(--s4c-glow)}',
    '#reportDashboardCard .s4c-v2-sub{max-width:620px;margin:8px 0 0;color:rgba(255,255,255,.82);font-size:.9rem;line-height:1.55;font-weight:800}',
    '#reportDashboardCard .s4c-v2-sticker{width:78px;aspect-ratio:1;border-radius:24px;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#ffe4f3);border:2px solid rgba(255,255,255,.8);box-shadow:0 18px 34px rgba(0,0,0,.24),0 0 0 6px rgba(255,255,255,.12);font-size:2.2rem;transform:rotate(7deg)}',
    '#reportDashboardCard .s4c-variant-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
    '#reportDashboardCard .s4c-variant-btn{appearance:none;border:1px solid rgba(255,255,255,.72);border-radius:16px;background:rgba(255,255,255,.74);padding:10px 8px;text-align:left;color:#334155;font-size:.72rem;font-weight:950;line-height:1.25;box-shadow:0 10px 20px rgba(15,23,42,.08);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease}',
    '#reportDashboardCard .s4c-variant-btn:hover{transform:translateY(-1px);box-shadow:0 14px 24px rgba(15,23,42,.12)}',
    '#reportDashboardCard .s4c-variant-btn.is-active{background:#0f172a;color:#fff;border-color:#0f172a;box-shadow:0 14px 28px var(--s4c-glow)}',
    '#reportDashboardCard .s4c-variant-btn span{display:block;margin-top:4px;color:inherit;opacity:.68;font-size:.62rem;font-weight:900}',
    '#reportDashboardCard .s4c-v2 .s4c-capture{padding:12px;border-radius:28px;border:2px solid rgba(15,23,42,.92);background:linear-gradient(180deg,#ffffff 0%,#fff8fb 100%);box-shadow:0 20px 40px rgba(15,23,42,.18)}',
    '#reportDashboardCard .s4c-capture-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}',
    '#reportDashboardCard .s4c-brand{position:static;display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#0f172a;color:#fff;padding:7px 10px;font-size:.68rem;font-weight:950;letter-spacing:.12em}',
    '#reportDashboardCard .s4c-live-badge{display:inline-flex;align-items:center;border-radius:999px;background:color-mix(in srgb,var(--s4c-accent) 18%,#fff);border:1px solid color-mix(in srgb,var(--s4c-accent) 38%,#fff);color:color-mix(in srgb,var(--s4c-accent) 82%,#111827);padding:7px 10px;font-size:.68rem;font-weight:950}',
    '#reportDashboardCard .s4c-stage{display:grid;grid-template-columns:108px minmax(0,1fr);gap:10px;align-items:stretch}',
    '#reportDashboardCard .s4c-photo-strip{position:relative;overflow:hidden;border-radius:22px;background:#0f172a;border:2px solid #0f172a;padding:8px;display:grid;grid-template-rows:repeat(4,1fr);gap:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}',
    '#reportDashboardCard .s4c-photo-cell{border-radius:14px;background:linear-gradient(145deg,#fff,#ffe9f5);display:grid;place-items:center;color:#111827;font-size:1.45rem;box-shadow:inset 0 0 0 1px rgba(255,255,255,.72)}',
    '#reportDashboardCard .s4c-photo-ticket{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);border-radius:999px;background:rgba(255,255,255,.92);padding:4px 8px;color:#0f172a;font-size:.58rem;font-weight:950;letter-spacing:.08em;white-space:nowrap}',
    '#reportDashboardCard .s4c-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '#reportDashboardCard .s4c-v2 .s4c-frame{min-height:190px;border-radius:24px;border:2px solid rgba(15,23,42,.92);padding:13px;background:radial-gradient(circle at 88% 0%,color-mix(in srgb,var(--s4c-accent) 17%,transparent),transparent 34%),linear-gradient(180deg,#fff 0%,#fff9fd 100%);box-shadow:0 10px 20px rgba(15,23,42,.10)}',
    '#reportDashboardCard .s4c-v2 .s4c-frame::after{content:"";position:absolute;inset:8px;border-radius:18px;border:1px dashed color-mix(in srgb,var(--s4c-accent) 35%,transparent);pointer-events:none;opacity:.55}',
    '#reportDashboardCard .s4c-frame-head h4{font-family:"NeoDunggeunmo","Galmuri9","Pretendard Variable",sans-serif;font-size:.82rem;letter-spacing:0;color:#111827}',
    '#reportDashboardCard .s4c-v2 .s4c-frame-head span{display:inline-flex;width:34px;height:34px;margin:0;align-items:center;justify-content:center;border-radius:13px;background:#0f172a;color:#fff;font-size:1rem;box-shadow:0 8px 16px rgba(15,23,42,.20)}',
    '#reportDashboardCard .s4c-v2 .s4c-frame p{font-size:.98rem;line-height:1.42;font-weight:950;color:#0f172a}',
    '#reportDashboardCard .s4c-v2 .s4c-frame em{font-size:.76rem;line-height:1.55;color:rgba(15,23,42,.70);font-weight:800}',
    '#reportDashboardCard .s4c-mini-note{display:inline-flex;width:max-content;max-width:100%;margin-top:9px;border-radius:999px;background:#0f172a;color:#fff!important;padding:6px 9px;font-size:.64rem!important;font-weight:950}',
    '#reportDashboardCard .s4c-sticker-dock{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-radius:22px;background:rgba(255,255,255,.82);border:1px solid rgba(15,23,42,.10);padding:10px 12px;box-shadow:0 12px 24px rgba(15,23,42,.08)}',
    '#reportDashboardCard .s4c-sticker-next{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:16px;background:#fff;box-shadow:0 8px 18px rgba(15,23,42,.12);font-size:1.2rem}',
    '#reportDashboardCard .s4c-v2 .s4c-btn{border-radius:16px;height:44px;background:linear-gradient(135deg,var(--s4c-accent),#0ea5e9);font-weight:950;box-shadow:0 12px 24px var(--s4c-glow)}',
    '#reportDashboardCard .s4c-v2 .s4c-btn--kakao{background:linear-gradient(135deg,#111827,#334155)}',
    '@media (max-width:760px){#reportDashboardCard .s4c-v2-hero{grid-template-columns:1fr}#reportDashboardCard .s4c-v2-sticker{display:none}#reportDashboardCard .s4c-variant-row{grid-template-columns:repeat(2,minmax(0,1fr))}#reportDashboardCard .s4c-stage{grid-template-columns:1fr}#reportDashboardCard .s4c-photo-strip{grid-template-columns:repeat(4,1fr);grid-template-rows:1fr;min-height:76px}#reportDashboardCard .s4c-grid{grid-template-columns:1fr}#reportDashboardCard .s4c-v2 .s4c-frame{min-height:0}}'
  ].join('\n');
  document.head.appendChild(style);
}

function _s4cBuildVariantPanels(id, data) {
  var common = {
    vibe: [
      { icon: '🪩', title: _reportDashboardText("rd.title.008"), main: data.frame1, detail: data.frame1Detail, extra: 'radar', note: data.dayPillar + ' · ' + data.theme.name + ' 무드' },
      { icon: '🎭', title: _reportDashboardText("rd.title.009"), main: data.frame2, detail: data.frame2Detail, extra: 'compare', note: data.monthPillar + ' 분위기 리딩' },
      { icon: '🧠', title: _reportDashboardText("rd.title.010"), main: data.frame3[0].name + ' ' + data.frame3[0].pct + '% · ' + data.frame3[1].name + ' ' + data.frame3[1].pct + '%', detail: data.frame3Detail, extra: 'brain', note: '생각이 많을수록 기준 하나가 빛납니다' },
      { icon: '🍀', title: _reportDashboardText("rd.title.011"), main: data.frame4, detail: data.frame4Detail, extra: 'lucky', note: '한 줄 미션으로 갓생 스타트' }
    ],
    love: [
      { icon: '💌', title: _reportDashboardText("rd.title.012"), main: data.firstNow.first + ' → ' + data.firstNow.now, detail: data.firstNow.mood + '. 마음은 천천히 열릴수록 더 오래 머무릅니다.', extra: 'compare', note: '답장 텐션 과몰입 금지' },
      { icon: '💘', title: _reportDashboardText("rd.title.013"), main: data.frame2, detail: '가벼운 농담보다 정확한 타이밍이 호감을 살립니다. 오늘은 한 번 덜 말하고 한 번 더 들어주는 쪽으로 운이 흐릅니다.', extra: '', note: data.monthPillar + ' 관계 무드' },
      { icon: '🫧', title: _reportDashboardText("rd.title.014"), main: data.brain.biggest + ' ' + data.brain.biggestPct + '%', detail: '상대의 반응을 해석하기보다 내 리듬을 먼저 안정시키면 매력이 선명하게 남습니다.', extra: 'brain', note: data.brain.keyword },
      { icon: '🌙', title: _reportDashboardText("rd.title.015"), main: '짧고 다정한 한 문장', detail: '긴 설명 대신 "오늘 이거 보고 네 생각났어"처럼 부드러운 신호가 좋습니다. 과한 확인은 잠시 접어두세요.', extra: '', note: data.stickerName + ' 감성 보호막' }
    ],
    routine: [
      { icon: '📌', title: _reportDashboardText("rd.title.016"), main: data.frame1, detail: '가장 작은 일 하나를 먼저 닫으면 하루 전체의 흐름이 가볍게 열립니다.', extra: 'radar', note: '첫 25분이 운을 엽니다' },
      { icon: '⚡', title: _reportDashboardText("rd.title.017"), main: data.frame2, detail: data.frame2Detail, extra: '', note: '작업 순서 고정' },
      { icon: '🧃', title: _reportDashboardText("rd.title.018"), main: data.frame3[0].name + ' 에너지', detail: '알림을 줄이고, 물 한 잔과 함께 할 일 2개만 남기면 산만한 기운이 가라앉습니다.', extra: 'brain', note: data.brain.keyword },
      { icon: '🎧', title: _reportDashboardText("rd.title.019"), main: data.luckyPack.bgm, detail: data.frame4Detail, extra: 'lucky', note: data.luckyPack.spot }
    ],
    anti: [
      { icon: '🚧', title: _reportDashboardText("rd.title.020"), main: data.brain.keyword, detail: '오늘은 바로 답하기보다 한 박자 늦게 보내는 쪽에 운이 머뭅니다. 속도보다 품격이 먼저입니다.', extra: 'brain', note: '보내기 전 3초 멈춤' },
      { icon: '🫠', title: _reportDashboardText("rd.title.021"), main: data.firstNow.first + ' 오해 주의', detail: data.firstNow.mood + '. 장난처럼 던진 말도 깊게 남을 수 있으니 톤을 부드럽게 낮추세요.', extra: 'compare', note: '팩폭은 순화해서' },
      { icon: '🧯', title: _reportDashboardText("rd.title.022"), main: data.luckyPack.item + '만 허용', detail: '충동 결제는 운의 구멍이 되기 쉽습니다. 필요한 것 하나만 고르면 재물 흐름이 단정해집니다.', extra: '', note: '장바구니 24시간 보류' },
      { icon: '🪬', title: _reportDashboardText("rd.title.023"), main: data.frame4, detail: '오늘의 작은 의식은 나를 지키는 경계가 됩니다. 마음이 급할수록 더 천천히 움직이세요.', extra: 'lucky', note: data.theme.name + ' 수호 모드' }
    ]
  };
  return common[id] || common.vibe;
}

function _s4cRenderPanelExtra(panel, data) {
  if (panel.extra === 'radar') {
    return '<div class="s4c-radar-wrap">' + data.radarSvg + '<ul class="s4c-radar-legend">' + _s4cRenderVibeStatsLegend(data.vibeStats) + '</ul></div>';
  }
  if (panel.extra === 'compare') {
    return '<div class="s4c-compare"><div class="s4c-compare-item"><strong>첫 컷</strong><span>' + _s4cEscapeHtml(data.firstNow.first) + '</span></div><div class="s4c-compare-item"><strong>지금 컷</strong><span>' + _s4cEscapeHtml(data.firstNow.now) + '</span></div></div><div class="s4c-compare-mood">💬 ' + _s4cEscapeHtml(data.firstNow.mood) + '</div>';
  }
  if (panel.extra === 'brain') {
    return '<div class="s4c-brainmap"><div class="s4c-brain-core"><strong>' + _s4cEscapeHtml(data.brain.biggest) + '</strong><span>' + _s4cEscapeHtml(String(data.brain.biggestPct)) + '%</span></div>' + _s4cRenderBrainBubbles(data.brain) + '</div><div class="s4c-brain-note">🧩 지금 가장 큰 고민: ' + _s4cEscapeHtml(data.brain.keyword) + '</div>';
  }
  if (panel.extra === 'lucky') {
    return '<div class="s4c-lucky-pack"><div><strong>🧷 오늘의 행운 템</strong><span>' + _s4cEscapeHtml(data.luckyPack.item) + '</span></div><div><strong>🎵 오늘의 BGM</strong><span>' + _s4cEscapeHtml(data.luckyPack.bgm) + '</span></div><div><strong>📍 오늘의 에너지 스팟</strong><span>' + _s4cEscapeHtml(data.luckyPack.spot) + '</span></div></div>';
  }
  return '';
}

function _s4cRenderVariantButtons(activeId) {
  return _s4cGetVariantDefs().map(function(v) {
    return '<button type="button" class="s4c-variant-btn' + (v.id === activeId ? ' is-active' : '') + '" onclick="changeSajuFourCutVariant(this,\'' + _s4cEscapeHtml(v.id) + '\')" aria-pressed="' + (v.id === activeId ? 'true' : 'false') + '">' + _s4cEscapeHtml(v.label) + '<span>' + _s4cEscapeHtml(v.badge) + '</span></button>';
  }).join('');
}

function _s4cRenderFourPanels(panels, data) {
  return panels.map(function(panel) {
    return '<article class="s4c-frame"><div class="s4c-frame-head"><h4>' + _s4cEscapeHtml(panel.title) + '</h4><span>' + _s4cEscapeHtml(panel.icon) + '</span></div><p>' + _s4cEscapeHtml(panel.main) + '</p><em>' + _s4cEscapeHtml(panel.detail) + '</em>' + _s4cRenderPanelExtra(panel, data) + '<span class="s4c-mini-note">' + _s4cEscapeHtml(panel.note) + '</span></article>';
  }).join('');
}

window.changeSajuFourCutVariant = function(btn, variantId) {
  var id = String(variantId || 'vibe');
  window.__sajuFourCutVariant = id;
  try { if (window.localStorage) window.localStorage.setItem(S4C_VARIANT_STORAGE_KEY, id); } catch (e) {}
  renderSajuFourCutContent();
};

function _s4cEscapeHtml(raw) {
  return String(raw == null ? '' : raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _s4cPercent(v) {
  var n = Number(v || 0);
  if (!isFinite(n)) n = 0;
  return Math.max(0, Math.round(n));
}

function _s4cClamp(v, min, max) {
  var n = Number(v || 0);
  if (!isFinite(n)) n = min;
  return Math.max(min, Math.min(max, n));
}

function _s4cSeedFromText(text) {
  var s = String(text || 'seed');
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  }
  return h || 13579;
}

function _s4cPickBySeed(list, seed) {
  if (!Array.isArray(list) || !list.length) return '';
  var idx = Math.abs(Number(seed || 0)) % list.length;
  return list[idx];
}

function _s4cGetDominantElement() {
  var ratios = (window.G_NATAL && window.G_NATAL.ratios) || null;
  var els = ['wood', 'fire', 'earth', 'metal', 'water'];
  var best = { key: 'earth', val: -1 };
  els.forEach(function(el) {
    var score = Number(ratios && ratios[el]);
    if (!isFinite(score)) score = 0;
    if (score > best.val) best = { key: el, val: score };
  });
  return best.key;
}

function _s4cGetAnimalSticker(dayBranch) {
  var byBranch = {
    '子': '🐭', '丑': '🐮', '寅': '🐯', '卯': '🐰',
    '辰': '🐲', '巳': '🐍', '午': '🐴', '未': '🐑',
    '申': '🐵', '酉': '🐔', '戌': '🐶', '亥': '🐷'
  };
  var name = (window.JI && window.JI[dayBranch] && window.JI[dayBranch].a) ? window.JI[dayBranch].a : '';
  var emoji = (name && window.ANIMAL_EMOJI && window.ANIMAL_EMOJI[name]) ? window.ANIMAL_EMOJI[name] : '';
  return {
    emoji: emoji || byBranch[dayBranch] || '🐷',
    name: name || '돼지'
  };
}

function _s4cBuildTenGodMix(p) {
  if (!p || !p.d || !p.d.g || typeof window.getTenGod !== 'function') {
    return [
      { name: '식신', pct: 55, mz: '먹을 생각' },
      { name: '편인', pct: 45, mz: '망상 모드' }
    ];
  }
  var dg = p.d.g;
  var stars = [p.y && p.y.g, p.y && p.y.j, p.m && p.m.g, p.m && p.m.j, p.d && p.d.j, p.h && p.h.g, p.h && p.h.j]
    .filter(Boolean);
  var cnt = {};
  stars.forEach(function(c) {
    var t = window.getTenGod(dg, c);
    if (t && t !== '?') cnt[t] = (cnt[t] || 0) + 1;
  });
  var total = stars.length || 1;
  var mzMap = {
    '비견': '내 방식 고수',
    '겁재': '승부욕 ON',
    '식신': '먹을 생각',
    '상관': '드립 발사',
    '편재': '기회 레이더',
    '정재': '현실 계산기',
    '편관': '압박 돌파',
    '정관': '원칙 수호',
    '편인': '망상 모드',
    '정인': '공부 모드'
  };
  var list = Object.keys(cnt).map(function(k) {
    return { name: k, pct: _s4cPercent((cnt[k] / total) * 100), mz: mzMap[k] || '감정 롤러코스터' };
  }).sort(function(a, b) { return b.pct - a.pct; });

  if (!list.length) {
    return [
      { name: '식신', pct: 50, mz: '먹을 생각' },
      { name: '정인', pct: 50, mz: '공부 모드' }
    ];
  }
  if (list.length === 1) {
    list.push({ name: '정인', pct: Math.max(0, 100 - list[0].pct), mz: '공부 모드' });
  }
  return list;
}

function _s4cBuildVibeStats(dayStem, monthTenGod, dominant) {
  var baseByStem = {
    '甲': [86, 74, 82, 66, 78],
    '乙': [72, 88, 76, 81, 83],
    '丙': [79, 69, 92, 71, 75],
    '丁': [77, 84, 81, 79, 80],
    '戊': [68, 76, 72, 94, 73],
    '己': [71, 82, 69, 90, 77],
    '庚': [75, 70, 85, 87, 72],
    '辛': [90, 68, 78, 73, 88],
    '壬': [74, 78, 83, 75, 92],
    '癸': [84, 91, 70, 72, 86]
  };
  var labels = ['예민미', '의리', '미적감각', '현실력', '집중력'];
  var values = (baseByStem[dayStem] || [78, 80, 79, 77, 81]).slice();

  var modByTenGod = {
    '비견': [2, 6, 0, 2, 1],
    '겁재': [-1, 7, 1, -1, 2],
    '식신': [1, 2, 5, 1, -1],
    '상관': [4, -1, 6, -2, 1],
    '편재': [0, 3, 2, 4, -1],
    '정재': [-2, 1, 1, 6, 2],
    '편관': [-1, 2, 0, 5, 4],
    '정관': [-2, 1, -1, 6, 5],
    '편인': [5, 0, 2, -2, 4],
    '정인': [3, 1, 1, 1, 6]
  };
  var mod = modByTenGod[monthTenGod] || [0, 0, 0, 0, 0];
  for (var i = 0; i < values.length; i++) {
    values[i] = _s4cClamp(values[i] + mod[i], 58, 99);
  }

  if (dominant === 'water') values[0] = _s4cClamp(values[0] + 4, 58, 99);
  if (dominant === 'earth') values[3] = _s4cClamp(values[3] + 5, 58, 99);
  if (dominant === 'fire') values[2] = _s4cClamp(values[2] + 4, 58, 99);

  return labels.map(function(label, idx) {
    return { label: label, value: values[idx] };
  });
}

function _s4cBuildRadarSvg(stats) {
  var cx = 70;
  var cy = 70;
  var r = 52;
  var rings = [20, 32, 44, 52];
  var angleStep = (Math.PI * 2) / Math.max(1, stats.length);
  var grid = '';

  rings.forEach(function(rv) {
    var points = [];
    for (var i = 0; i < stats.length; i++) {
      var a = -Math.PI / 2 + i * angleStep;
      points.push((cx + Math.cos(a) * rv).toFixed(1) + ',' + (cy + Math.sin(a) * rv).toFixed(1));
    }
    grid += '<polygon class="s4c-radar-ring" points="' + points.join(' ') + '"></polygon>';
  });

  var spokes = '';
  var shapePoints = [];
  for (var j = 0; j < stats.length; j++) {
    var ang = -Math.PI / 2 + j * angleStep;
    var outerX = cx + Math.cos(ang) * r;
    var outerY = cy + Math.sin(ang) * r;
    spokes += '<line class="s4c-radar-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + outerX.toFixed(1) + '" y2="' + outerY.toFixed(1) + '"></line>';
    var rr = r * (_s4cClamp(stats[j].value, 0, 100) / 100);
    shapePoints.push((cx + Math.cos(ang) * rr).toFixed(1) + ',' + (cy + Math.sin(ang) * rr).toFixed(1));
  }

  return ''
    + '<svg class="s4c-radar" viewBox="0 0 140 140" aria-hidden="true">'
    + '<defs><linearGradient id="s4cRadarFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fb7185" stop-opacity="0.44"></stop><stop offset="100%" stop-color="#34d399" stop-opacity="0.30"></stop></linearGradient></defs>'
    + grid
    + spokes
    + '<polygon class="s4c-radar-shape" points="' + shapePoints.join(' ') + '"></polygon>'
    + '<polygon class="s4c-radar-fill" points="' + shapePoints.join(' ') + '"></polygon>'
    + '</svg>';
}

function _s4cBuildFirstVsNow(monthTenGod) {
  var table = {
    '비견': { first: '차가운 도시 사람', now: '지켜주는 의리파', mood: '필요한 순간엔 무조건 와주는 타입' },
    '겁재': { first: '도도한 리더상', now: '텐션 높은 팀장님', mood: '친해지면 말 많은 강아지 모드' },
    '식신': { first: '무해한 분위기', now: '생활력 만렙 메이트', mood: '챙김 스킬과 유머를 동시에 씀' },
    '상관': { first: '팩폭러 같음', now: '웃긴 감성러', mood: '센스 있는 농담으로 분위기 업' },
    '편재': { first: '인싸 기질', now: '기회 연결자', mood: '사람과 정보를 자연스럽게 잇는다' },
    '정재': { first: '성실한 모범생', now: '든든한 실속파', mood: '약속/일정/돈 감각이 안정적' },
    '편관': { first: '엄격해 보임', now: '압박 돌파형', mood: '위기 때 오히려 강해지는 편' },
    '정관': { first: '반듯한 이미지', now: '신뢰형 조율러', mood: '분위기와 규칙을 같이 잡는다' },
    '편인': { first: '조용한 미스터리', now: '아이디어 폭격기', mood: '남들이 못 본 포인트를 발견' },
    '정인': { first: '말끔한 엘리트', now: '다정한 조력자', mood: '설명력과 공감력이 둘 다 좋음' }
  };
  return table[monthTenGod] || { first: '차분한 첫인상', now: '친해지면 반전 매력', mood: '시간 갈수록 웃긴 포인트가 나온다' };
}

function _s4cBuildBrainMapData(tgList, dominant) {
  var biggest = (tgList[0] && tgList[0].name) ? tgList[0].name : '식신';
  var biggestPct = _s4cClamp((tgList[0] && tgList[0].pct) || 46, 30, 99);
  var satellites = [];
  var take = Math.min(4, Math.max(2, tgList.length - 1));
  for (var i = 1; i <= take; i++) {
    satellites.push({
      name: tgList[i] && tgList[i].name ? tgList[i].name : (i === 1 ? '편인' : '정인'),
      pct: _s4cClamp((tgList[i] && tgList[i].pct) || (35 - i * 3), 8, 55)
    });
  }
  var worryByElement = {
    wood: ['이번 주 발표 톤', '읽씹 아닌지 체크', '새 루틴 유지 가능성'],
    fire: ['과몰입 멈추기', '말이 너무 빨랐나?', '체력 방전 관리'],
    earth: ['지출 줄이기 미션', '할 일 우선순위', '약속 일정 조율'],
    metal: ['완벽주의 브레이크', '기준 낮추기 연습', '답장 문구 선택'],
    water: ['감정 과다해석 금지', '밤샘 생각 루프', '관계 거리 조절']
  };
  var worries = worryByElement[dominant] || worryByElement.earth;
  var keyword = _s4cPickBySeed(worries, _s4cSeedFromText(biggest + dominant + biggestPct));
  return {
    biggest: biggest,
    biggestPct: biggestPct,
    satellites: satellites,
    keyword: keyword
  };
}

function _s4cBuildLuckyPack(dayStem, dominant) {
  var items = ['🎒 캔버스 백', '🧦 포인트 양말', '📓 미니 다이어리', '🎧 노이즈캔슬링 이어폰', '🕶️ 틴트 선글라스'];
  var bgm = ['NewJeans - Super Shy', 'Crush - Rush Hour', '아이유 - Blueming', '잔나비 - 주저하는 연인들을 위해', 'AKMU - Love Lee'];
  var spots = ['햇살 들어오는 카페 창가', '동네 공원 벤치', '작은 독립서점', '강변 산책로', '조용한 루프탑'];
  var seed = _s4cSeedFromText(dayStem + dominant + Date.now());
  return {
    item: _s4cPickBySeed(items, seed),
    bgm: _s4cPickBySeed(bgm, seed + 3),
    spot: _s4cPickBySeed(spots, seed + 7)
  };
}

function _s4cDecorSvg(type) {
  if (type === 'heart') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.5-9.2-8.7C1.5 8 3.2 5 6.4 5c2 0 3.2 1 4.1 2.3C11.4 6 12.6 5 14.6 5c3.2 0 4.9 3 3.6 6.3C19.5 15.5 12 20 12 20z"></path></svg>';
  }
  if (type === 'star') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 5.4L20 8.1l-4 3.9.9 5.6L12 15l-4.9 2.6.9-5.6-4-3.9 5.4-.7L12 2z"></path></svg>';
  }
  if (type === 'cherry') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm7-1c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zM9 12c1.7-2.4 4.2-4.1 7.1-4.7L18 6c-3.8.5-7 2.6-9.1 5.7L9 12z"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><circle cx="9" cy="10" r="1.2" fill="#000"></circle><circle cx="15" cy="10" r="1.2" fill="#000"></circle><path d="M8.2 14.2c1 1.2 2.3 1.8 3.8 1.8s2.8-.6 3.8-1.8" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"></path></svg>';
}

function _s4cFrameDecorMarkup(frameSeed) {
  return '';
}

function _s4cBuildFrameData() {
  var p = window.G_PILLARS || {};
  var dayStem = (p.d && p.d.g) || '甲';
  var dayBranch = (p.d && p.d.j) || '子';
  var monthStem = (p.m && p.m.g) || '';
  var monthBranch = (p.m && p.m.j) || '';
  var dominant = _s4cGetDominantElement();
  var sticker = _s4cGetAnimalSticker(dayBranch);
  var tg = _s4cBuildTenGodMix(p);

  var elementTheme = {
    wood: { name: '목', bg: '#d9f99d', card: '#f7fee7', line: '#65a30d' },
    fire: { name: '화', bg: '#fbcfe8', card: '#fdf2f8', line: '#db2777' },
    earth: { name: '토', bg: '#f5e9d3', card: '#fff8ee', line: '#b45309' },
    metal: { name: '금', bg: '#f8fafc', card: '#ffffff', line: '#475569' },
    water: { name: '수', bg: '#1e3a8a', card: '#dbeafe', line: '#1d4ed8' }
  };

  var dayVibe = {
    '甲': "폼 미쳤다 소리 듣는 갑목 추진러",
    '乙': "눈치 빠르게 스며드는 을목 센스캐",
    '丙': "겉바속촉 매력 터지는 병화 인싸러",
    '丁': "조용히 판 키우는 정화 무드메이커",
    '戊': "판 깔아주고 끝내는 무토 리더형",
    '己': "생활 밀착형 디테일 끝판왕 기토형",
    '庚': "선 굵고 단단한 경금 직진러",
    '辛': "깔끔+예민미 장착한 신금 감각파",
    '壬': "스케일 크게 보는 임수 기획형",
    '癸': "잔잔한데 깊게 꽂히는 계수 공감형"
  };
  var dayDetailMap = {
    '甲': '친구들 사이에서는 그냥 실행버튼 자체야. 고민 오래 안 끌고 바로 움직이는데, 은근히 사람 마음까지 챙겨서 신뢰 스택이 계속 쌓이는 타입.',
    '乙': '처음에는 말수 적어 보여도 타이밍 잡는 감각이 미쳤어. 분위기 흐름 읽고 필요한 한마디를 콕 넣어서 게임 체인저 되는 편.',
    '丙': '에너지 자체가 밝아서 주변 텐션을 위로 끌어올려. 근데 마냥 가볍진 않고, 중요한 순간에는 생각보다 진지해서 반전 매력 제대로 터짐.',
    '丁': '겉으로는 차분한데 속으로는 불꽃처럼 디테일하게 계산해. 사람 기분도 잘 읽어서 팀플할 때 없어선 안 될 핵심 멤버 느낌.',
    '戊': '다들 흔들릴 때 기준점 잡아주는 안정형. 말 한마디에 무게가 있고 약속을 끝까지 지키는 편이라, 믿고 맡기는 사람으로 찍힌다.',
    '己': '작은 루틴 하나를 큰 결과로 바꾸는 생활형 천재. 티는 덜 나도 꾸준함과 현실감이 강해서 결국 성과를 제일 오래 끌고 가는 스타일.',
    '庚': '결정할 땐 빠르고 선명해. 우유부단한 거 제일 싫어해서 답답한 상황 정리해주는 해결사 역할을 자주 맡게 된다.',
    '辛': '정리력, 미감, 디테일이 기본값으로 탑재됨. 기준이 높은 편이라 까다로워 보일 수 있는데, 한 번 마음 열면 의리도 진짜 세다.',
    '壬': '큰 그림 보는 재능이 확실해서 멀리 내다보는 플랜을 잘 짜. 기회가 보이면 과감하게 베팅하고, 실패해도 다시 일어나는 탄성이 좋다.',
    '癸': '표현은 조용한데 관찰력은 풀파워. 사소한 감정 변화까지 캐치해서 공감해주기 때문에, 오래 갈 관계를 만드는 힘이 강하다.'
  };

  var monthTenGod = (monthStem && typeof window.getTenGod === 'function') ? window.getTenGod(dayStem, monthStem) : '';
  var monthView = {
    '비견': '일할 땐 AI, 놀 땐 파티피플',
    '겁재': '친해지면 기절하는 반전 매력',
    '식신': '맛집과 생산성 둘 다 챙기는 타입',
    '상관': '팩폭 날리는데 웃기게 하는 타입',
    '편재': '인맥에서 기회를 꺼내는 타입',
    '정재': '지갑 관리까지 갓생 찍는 타입',
    '편관': '프로젝트 급발진해도 결과 내는 타입',
    '정관': '룰 지키면서도 폼 미쳤다 듣는 타입',
    '편인': '뜬금 영감으로 판 뒤집는 타입',
    '정인': '디테일 메모로 팀 살리는 타입'
  };
  var monthDetailMap = {
    '비견': '밖에서는 독립적인 이미지가 강해 보여. "나 혼자도 잘해" 바이브가 있어서 처음엔 차가워 보일 수 있는데, 친해지면 의리로 끝까지 챙긴다.',
    '겁재': '분위기 장악력 있어서 모임에서 존재감 확실해. 텐션이 높을 때는 주도권을 꽉 잡는 스타일이라 주변이 자연스럽게 따라오게 된다.',
    '식신': '실무 감각이 좋아서 결과물을 안정적으로 뽑아내. 같이 일하면 편하고, 같이 놀면 더 편한 사람으로 기억되는 캐릭터.',
    '상관': '입담이 좋아서 재치 있는 팩폭 날리는 역할. 선 넘지 않는 센스만 챙기면 매력치가 급상승해서 호감도가 빠르게 오른다.',
    '편재': '사람 사이 연결을 잘해서 기회를 데려오는 타입. 정보, 네트워크, 타이밍을 묶어서 결과를 만드는 감각이 확실히 강하다.',
    '정재': '현실 감각이 좋아 보이는 신뢰형 이미지. 계획적으로 움직여서 "저 사람은 진짜 꾸준히 간다"라는 평가를 자주 듣는다.',
    '편관': '일 모드 들어가면 몰입도가 확 올라가서 존재감이 강해져. 압박 상황에서 오히려 집중력이 살아나는 편이라 해결사로 불린다.',
    '정관': '정돈된 말투와 책임감으로 안정적인 신뢰를 만든다. 기준이 명확해서 팀 분위기를 흐트러뜨리지 않고 방향을 잡아준다.',
    '편인': '독특한 시선이 있어서 아이디어가 신선하다는 말을 자주 듣는다. 남들이 놓친 포인트를 집어내는 통찰형 캐릭터.',
    '정인': '기본기가 좋아서 어디 가도 "믿고 맡길 수 있는 사람"으로 보인다. 배려와 설명력이 좋아 관계를 부드럽게 이어주는 타입.'
  };

  var luckyByElement = {
    wood: '초록 포인트 장착하고 미루던 일 1개만 끝내. 오히려 좋아. 끝나면 산책 12분으로 리프레시하면 집중력 폼 미쳤다.',
    fire: '핑크 아이템 하나 들고 아아 마시면서 할 일 3개 중 1개만 선빵쳐. 첫 스타트만 끊으면 럭키비키 모드가 바로 켜진다.',
    earth: '베이지 무드로 책상 10분 정리하고 메모 3줄 써. 루틴 하나만 고정하면 오늘 갓생 루프가 자동으로 돌아간다.',
    metal: '화이트 포인트 룩에 일정 2개만 칼같이 처리해. 디테일 챙긴 너 오늘 완전 일잘러 모드라 주변이 기절한다.',
    water: '네이비 포인트 + 잔잔한 플리 조합으로 25분 몰입 타이머 돌려. 깊게 파고드는 흐름이 오늘 대박 기회를 데려온다.'
  };

  var luckyElement = (window.G_POWER && Array.isArray(window.G_POWER.yongshin) && window.G_POWER.yongshin[0]) || dominant;
  var theme = elementTheme[dominant] || elementTheme.earth;
  var monthPillar = (monthStem || '') + (monthBranch || '');

  var frame1Detail = dayDetailMap[dayStem] || '겉보기에는 무난해 보여도 속으로는 기준이 꽤 단단한 편. 친해질수록 의외의 매력이 단계적으로 열리는 타입.';
  var frame2Detail = monthDetailMap[monthTenGod] || '처음엔 차분해 보여도 친해지면 텐션이 살아난다. 상황에 맞춰 캐릭터를 바꾸는 반전 매력이 분명한 편.';
  var tgA = tg[0] || { name: '식신', pct: 50, mz: '먹을 생각' };
  var tgB = tg[1] || { name: '정인', pct: 50, mz: '공부 모드' };
  var frame3Detail = tgA.name + ' ' + tgA.pct + '%(' + tgA.mz + ') + ' + tgB.name + ' ' + tgB.pct + '%(' + tgB.mz + ') 조합으로, 머릿속이 늘 멀티탭 상태야. 그래서 중요한 건 "한 번에 하나씩" 우선순위 잠금 걸어두는 것. 오늘은 알림 줄이고 25분 집중 2세트만 해도 체감 성과가 확 올라간다.';
  var frame4Detail = '오늘은 작은 완수에서 운이 커지는 날. 친구랑 수다 떨듯 가볍게 시작해도 되고, 핵심은 "첫 버튼 눌러서 흐름 켜기"야. 1개 끝내고 바로 체크 표시하면 동기부여가 계속 붙으니까, 오히려 느긋하게 가는 게 결과는 더 잘 나온다.';

  var firstNow = _s4cBuildFirstVsNow(monthTenGod);
  var vibeStats = _s4cBuildVibeStats(dayStem, monthTenGod, dominant);
  var brain = _s4cBuildBrainMapData(tg, dominant);
  var luckyPack = _s4cBuildLuckyPack(dayStem, dominant);

  return {
    theme: theme,
    dominantElement: dominant,
    stickerEmoji: sticker.emoji,
    stickerName: sticker.name,
    frame1: dayVibe[dayStem] || '오히려 좋아를 실천하는 균형형 인간',
    frame2: monthView[monthTenGod] || ('첫인상은 차분한데, ' + monthPillar + ' 포인트에서 반전 터지는 타입'),
    frame3: tg,
    frame4: luckyByElement[luckyElement] || luckyByElement[dominant] || luckyByElement.earth,
    frame1Detail: frame1Detail,
    frame2Detail: frame2Detail,
    frame3Detail: frame3Detail,
    frame4Detail: frame4Detail,
    monthPillar: monthPillar || '월주 대기',
    dayPillar: dayStem + dayBranch,
    vibeStats: vibeStats,
    radarSvg: _s4cBuildRadarSvg(vibeStats),
    firstNow: firstNow,
    brain: brain,
    luckyPack: luckyPack,
    stickerCatalog: ['💘', '⭐', '😊', '🍒', '🎀', '💿', '🫧', '📷'],
    stickerPack: ['🐔', '✨', '📸', '💘', '🎀', sticker.emoji || '🐷'],
    rare: (typeof window.__sajuFourCutRare === 'boolean') ? window.__sajuFourCutRare : (window.__sajuFourCutRare = (Math.random() < 0.01))
  };
}

function _s4cRenderVibeStatsLegend(stats) {
  return stats.map(function(s) {
    return '<li><strong>' + _s4cEscapeHtml(s.label) + '</strong><span>' + _s4cEscapeHtml(String(s.value)) + '%</span></li>';
  }).join('');
}

function _s4cRenderBrainBubbles(brain) {
  var bubbles = '';
  for (var i = 0; i < brain.satellites.length; i++) {
    var b = brain.satellites[i];
    bubbles += '<div class="s4c-brain-bubble s4c-brain-bubble-' + (i + 1) + '"><strong>' + _s4cEscapeHtml(b.name) + '</strong><span>' + _s4cEscapeHtml(String(b.pct)) + '%</span></div>';
  }
  return bubbles;
}

function _s4cBindStickerStudio(host) {
  if (!host) return;
  var capture = host.querySelector('[data-s4c-capture]');
  if (!capture) return;

  var dragging = null;

  function pointerPos(ev) {
    if (ev.touches && ev.touches[0]) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    if (ev.changedTouches && ev.changedTouches[0]) return { x: ev.changedTouches[0].clientX, y: ev.changedTouches[0].clientY };
    return { x: ev.clientX, y: ev.clientY };
  }

  function onMove(ev) {
    if (!dragging) return;
    ev.preventDefault();
    var pt = pointerPos(ev);
    var rect = capture.getBoundingClientRect();
    var x = _s4cClamp(pt.x - rect.left - dragging.offsetX, 0, rect.width - dragging.el.offsetWidth);
    var y = _s4cClamp(pt.y - rect.top - dragging.offsetY, 0, rect.height - dragging.el.offsetHeight);
    dragging.el.style.left = x + 'px';
    dragging.el.style.top = y + 'px';
  }

  function onUp() {
    dragging = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove, { passive: false });
    document.removeEventListener('touchend', onUp);
  }

  function bindStickerDrag(el) {
    if (!el) return;
    function start(ev) {
      ev.preventDefault();
      var pt = pointerPos(ev);
      var r = el.getBoundingClientRect();
      dragging = {
        el: el,
        offsetX: pt.x - r.left,
        offsetY: pt.y - r.top
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    }
    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: false });
  }

  Array.prototype.slice.call(host.querySelectorAll('.s4c-user-sticker')).forEach(bindStickerDrag);
  host.__s4cBindStickerDrag = bindStickerDrag;
}

window.addS4CSticker = function(btn) {
  var wrap = btn && btn.closest ? btn.closest('.s4c-wrap') : null;
  if (!wrap) return;
  var capture = wrap.querySelector('[data-s4c-capture]');
  var dock = wrap.querySelector('[data-s4c-sticker-dock]');
  if (!capture || !dock) return;

  var emoji = dock.getAttribute('data-next-sticker') || '💘';
  var catalog = ['💘', '⭐', '😊', '🍒', '🎀', '💿', '🫧', '📷'];
  var idx = catalog.indexOf(emoji);
  var next = catalog[(idx + 1 + catalog.length) % catalog.length];
  dock.setAttribute('data-next-sticker', next);
  var preview = wrap.querySelector('.s4c-sticker-next');
  if (preview) preview.textContent = next;

  var sticker = document.createElement('button');
  sticker.type = 'button';
  sticker.className = 's4c-user-sticker';
  sticker.textContent = emoji;
  sticker.setAttribute('aria-label', '이동 가능한 스티커');
  var offset = capture.querySelectorAll('.s4c-user-sticker').length;
  sticker.style.left = (12 + (offset % 5) * 26) + 'px';
  sticker.style.top = (12 + Math.floor(offset / 5) * 26) + 'px';
  capture.appendChild(sticker);

  if (typeof wrap.__s4cBindStickerDrag === 'function') {
    wrap.__s4cBindStickerDrag(sticker);
  }
};

function _s4cEnsureCanvasLib() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (_s4cCanvasLoader) return _s4cCanvasLoader;
  _s4cCanvasLoader = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.async = true;
    script.onload = function() { resolve(window.html2canvas); };
    script.onerror = function() { reject(new Error('html2canvas load failed')); };
    document.head.appendChild(script);
  });
  return _s4cCanvasLoader;
}

function _s4cCoverSrcCandidates() {
  return [
    '/fuctionassets/사주 네컷.webp',
    'fuctionassets/사주 네컷.webp',
    '/public/fuctionassets/사주 네컷.webp'
  ];
}

window.handleS4CCoverError = function(imgEl) {
  if (!imgEl) return;
  var tried = imgEl.dataset && imgEl.dataset.s4cTried ? String(imgEl.dataset.s4cTried) : '';
  var idx = tried ? Number(tried) : 0;
  var candidates = _s4cCoverSrcCandidates();
  if (idx < candidates.length - 1) {
    imgEl.dataset.s4cTried = String(idx + 1);
    imgEl.src = candidates[idx + 1];
    return;
  }
  imgEl.style.display = 'none';
};

function renderSajuFourCutContent() {
  var host = document.getElementById('sajuFourCutResult');
  if (!host) return;
  _s4cEnsureExperienceStyles();
  var data = _s4cBuildFrameData();
  var activeId = _s4cGetActiveVariantId();
  var variant = _s4cFindVariant(activeId);
  var panels = _s4cBuildVariantPanels(activeId, data);

  host.innerHTML = ''
    + '<div class="s4c-wrap s4c-tw s4c-v2 s4c-v2--' + _s4cEscapeHtml(activeId) + '" style="--s4c-bg:' + _s4cEscapeHtml(data.theme.bg) + ';--s4c-card:' + _s4cEscapeHtml(data.theme.card) + ';--s4c-line:' + _s4cEscapeHtml(data.theme.line) + ';--s4c-accent:' + _s4cEscapeHtml(variant.accent) + ';--s4c-glow:' + _s4cEscapeHtml(variant.glow) + ';">'
    + '  <div class="s4c-aurora s4c-aurora-a" aria-hidden="true"></div>'
    + '  <div class="s4c-aurora s4c-aurora-b" aria-hidden="true"></div>'
    + '  <div class="s4c-v2-shell">'
    + '    <div class="s4c-v2-hero">'
    + '      <div><span class="s4c-v2-kicker">✦ ' + _s4cEscapeHtml(variant.badge) + ' · ' + _s4cEscapeHtml(data.dayPillar) + '</span><h4 class="s4c-v2-title">' + _s4cEscapeHtml(variant.title) + '</h4><p class="s4c-v2-sub">' + _s4cEscapeHtml(data.stickerEmoji + ' ' + data.stickerName + ' 무드와 ' + data.theme.name + ' 기운이 오늘의 네 컷 위로 떠오릅니다. 원하는 버전을 눌러 스토리 감성으로 바로 갈아입혀 보세요.') + '</p></div>'
    + '      <div class="s4c-v2-sticker" aria-hidden="true">' + _s4cEscapeHtml(data.stickerEmoji) + '</div>'
    + '    </div>'
    + '    <div class="s4c-variant-row" aria-label=_reportDashboardText("rd.aria-label.001")>' + _s4cRenderVariantButtons(activeId) + '</div>'
    + '    <div class="s4c-capture' + (data.rare ? ' s4c-capture--rare' : '') + '" data-s4c-capture="1" data-s4c-variant="' + _s4cEscapeHtml(activeId) + '">'
    + '      <div class="s4c-capture-head"><div class="s4c-brand">CODE DESTINY · SAJU 4CUT</div><div class="s4c-live-badge">' + _s4cEscapeHtml(variant.label) + '</div></div>'
    + (data.rare ? '<div class="s4c-rare-card">✨ 대운 프리패스 카드 등장! 오늘 폼 미쳤다 ✨</div>' : '')
    + '      <div class="s4c-stage">'
    + '        <aside class="s4c-photo-strip" aria-hidden="true"><div class="s4c-photo-cell">' + _s4cEscapeHtml(variant.icons[0]) + '</div><div class="s4c-photo-cell">' + _s4cEscapeHtml(variant.icons[1]) + '</div><div class="s4c-photo-cell">' + _s4cEscapeHtml(variant.icons[2]) + '</div><div class="s4c-photo-cell">' + _s4cEscapeHtml(variant.icons[3]) + '</div><span class="s4c-photo-ticket">' + _s4cEscapeHtml(data.theme.name) + ' FILTER</span></aside>'
    + '        <div class="s4c-grid">' + _s4cRenderFourPanels(panels, data) + '</div>'
    + '      </div>'
    + '    </div>'
    + '    <div class="s4c-sticker-dock" data-s4c-sticker-dock="1" data-next-sticker="💘"><span class="s4c-sticker-next">💘</span><button type="button" class="s4c-btn s4c-btn--sticker" onclick="addS4CSticker(this)">스티커 붙이기</button><small>스티커를 붙인 뒤 캡처 영역에서 드래그하면 내 네컷으로 완성됩니다.</small></div>'
    + '    <div class="s4c-tags" aria-label=_reportDashboardText("rd.aria-label.002")>' + S4C_TAG_LIST.map(function(tag){ return '<span class="s4c-tag-chip">' + _s4cEscapeHtml(tag) + '</span>'; }).join('') + '</div>'
    + '    <div class="s4c-actions"><button type="button" class="s4c-btn" onclick="saveSajuFourCutImage(this)">네컷 이미지 저장</button><button type="button" class="s4c-btn s4c-btn--kakao" onclick="shareSajuFourCutKakao(this)">공유 문구 보내기</button></div>'
    + '  </div>'
    + '</div>';

  _s4cBindStickerStudio(host.firstElementChild);
}

window.saveSajuFourCutImage = function(btn) {
  var wrap = btn && btn.closest ? btn.closest('.s4c-wrap') : null;
  var capture = wrap ? wrap.querySelector('[data-s4c-capture]') : null;
  if (!capture) return;

  _s4cEnsureCanvasLib().then(function(html2canvas) {
    return html2canvas(capture, {
      scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
      useCORS: true,
      backgroundColor: null,
      logging: false
    });
  }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'saju-fourcut-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(function(err) {
    console.error('[SajuFourCut] 이미지 저장 실패:', err);
    alert('이미지 저장 중 오류가 났어. 잠깐 후 다시 눌러줘.');
  });
};

window.shareSajuFourCutKakao = function(btn) {
  var wrap = btn && btn.closest ? btn.closest('.s4c-wrap') : null;
  if (!wrap) return;

  var text = [
    '📸 사주네컷 : 운명 필터',
    '',
    '1) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(1) p') || {}).textContent || ''),
    '2) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(2) p') || {}).textContent || ''),
    '3) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(3) p') || {}).textContent || ''),
    '4) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(4) p') || {}).textContent || ''),
    '',
    S4C_TAG_TEXT,
    window.location.href
  ].join('\n');

  if (navigator.share) {
    navigator.share({
      title: _reportDashboardText("rd.title.024"),
      text: text,
      url: window.location.href
    }).catch(function(){});
    return;
  }

  var encoded = encodeURIComponent(text);
  var a = document.createElement('a');
  a.href = 'kakaotalk://send?text=' + encoded;
  a.click();

  setTimeout(function() {
    if (typeof window.copyToClipboard === 'function') {
      window.copyToClipboard(text, '카카오톡 앱이 없거나 PC라서 문구를 복사했어. 붙여넣기 하면 끝!');
    }
  }, 220);
};

function handleReportThumbError(imgEl) {
  if (!imgEl) return;
  if (imgEl.dataset && imgEl.dataset.assetFallbackTried !== '1') {
    var src = imgEl.getAttribute('src') || '';
    if (src.indexOf('/fuctionassets/') === 0) {
      imgEl.dataset.assetFallbackTried = '1';
      imgEl.src = src.replace('/fuctionassets/', 'fuctionassets/');
      return;
    }
    if (src.indexOf('fuctionassets/') === 0) {
      imgEl.dataset.assetFallbackTried = '1';
      imgEl.src = '/' + src;
      return;
    }
  }
  var wrap = imgEl.closest ? imgEl.closest('.rpt-v2-img-wrap') : imgEl.parentNode;
  if (wrap) wrap.style.display = 'none';

  var row = wrap && wrap.parentNode;
  if (!row || !row.classList || !row.classList.contains('rpt-v2-img-row')) return;

  var visibleCount = 0;
  for (var i = 0; i < row.children.length; i++) {
    if (row.children[i].style.display !== 'none') visibleCount += 1;
  }
  if (visibleCount === 0) row.style.display = 'none';
}

window.handleReportThumbError = handleReportThumbError;

function _sajuFunTryRecoverTargetCard(targetId) {
  if (!targetId) return false;

  try {
    var p = window.G_PILLARS || null;
    var natal = window.G_NATAL || null;
    var bazi = window.G_BAZI || null;
    var power = window.G_POWER || null;
    var johu = window.G_JOHU || null;
    var jong = window.G_JONG || null;

    switch (targetId) {
      case 'lottoCard':
        if (typeof renderLottoNumbers === 'function' && natal) renderLottoNumbers(natal, bazi);
        break;
      case 'quantumCard':
        if (typeof renderQuantumStrategy === 'function' && p && natal) renderQuantumStrategy(p, natal, bazi);
        break;
      case 'specialCharmCard':
        if (typeof renderSpecialCharm === 'function' && p && natal) renderSpecialCharm(p, natal);
        break;
      case 'healthReportCard':
        if (typeof renderHealthReport === 'function' && p && natal) renderHealthReport(p, natal, johu, power, jong);
        break;
      case 'skillTreeCard':
        if (typeof renderSkillTree === 'function' && p && natal) renderSkillTree(p, natal);
        break;
      case 'tTestCard':
        if (typeof renderTTest === 'function' && p && natal) renderTTest(p, natal, johu, power);
        break;
      case 'hormone-vibe-section':
        if (typeof renderHormoneVibe === 'function' && p && power) renderHormoneVibe(p, power);
        break;
      case 'energyCoordCard':
        if (typeof renderEnergyCoord === 'function' && natal) renderEnergyCoord(natal);
        break;
      case 'villainCard':
        if (typeof renderVillain === 'function' && p && power) renderVillain(p, power);
        break;
      case 'sajuFourCutCard':
        if (typeof renderSajuFourCutContent === 'function') renderSajuFourCutContent();
        break;
      case 'dopamineCard':
        if (typeof window.renderDopamineReport === 'function' && p && natal) window.renderDopamineReport(p, natal, power, johu);
        break;
      default:
        break;
    }
  } catch (recoverErr) {
    console.warn('[reportDashboard] 카드 복구 시도 실패:', targetId, recoverErr);
  }

  return !!document.getElementById(targetId);
}

function _sajuFunEnsureHealthReportRendered(targetEl) {
  if (!targetEl || targetEl.id !== 'healthReportCard') return false;
  var area = document.getElementById('healthReportSection');
  if (!area) return false;

  var html = String(area.innerHTML || '').trim();
  var text = String(area.textContent || '').replace(/\s+/g, ' ').trim();
  if (html.length >= 40 || text.length >= 20 || (area.children && area.children.length > 0)) return true;

  _sajuFunTryRecoverTargetCard('healthReportCard');

  html = String(area.innerHTML || '').trim();
  text = String(area.textContent || '').replace(/\s+/g, ' ').trim();
  return html.length >= 40 || text.length >= 20 || !!(area.children && area.children.length > 0);
}

/* 퀀텀 명리 엔진은 결과 계산 직후에는 스텁만 깔려 있다.
   카드를 실제로 여는 시점(= 잠금 게이트를 통과한 시점)에만 전체 판별을 돌린다. */
function _sajuFunEnsureQuantumBlockReady(block) {
  if (!block || block.id !== 'rpt-v2-section-quantumCard') return false;
  if (window.__cdQuantumRendered) return true;
  _sajuFunTryRecoverTargetCard('quantumCard');
  return !!window.__cdQuantumRendered;
}

function _sajuFunEnsureHealthReportBlockReady(block) {
  if (!block || block.id !== 'rpt-v2-section-healthReportCard') return false;
  var targetEl = block.querySelector ? block.querySelector('#healthReportCard') : null;
  var slot = document.getElementById('rpt-v2-body-healthReportCard');

  if (!targetEl) {
    targetEl = document.getElementById('healthReportCard');
    if (!targetEl) {
      _sajuFunTryRecoverTargetCard('healthReportCard');
      targetEl = document.getElementById('healthReportCard');
    }
  }

  if (!targetEl) return false;
  if (targetEl.style && targetEl.style.display === 'none') targetEl.style.display = '';
  if (slot && !slot.contains(targetEl)) {
    slot.innerHTML = '';
    slot.appendChild(targetEl);
  }

  var rendered = _sajuFunEnsureHealthReportRendered(targetEl);

  // 강제 reveal: IntersectionObserver가 감지하지 못한 .ent-reveal 요소를 즉시 표시
  if (rendered && block.querySelectorAll) {
    var revealEls = block.querySelectorAll('.ent-reveal:not(.is-visible)');
    for (var i = 0; i < revealEls.length; i += 1) {
      revealEls[i].classList.add('is-visible');
    }
  }

  return rendered;
}

function _sajuFunHasRenderableContent(targetEl) {
  if (!targetEl) return false;
  if (targetEl.id === 'healthReportCard' && _sajuFunEnsureHealthReportRendered(targetEl)) return true;
  var innerSection = targetEl.querySelector ? targetEl.querySelector('div[id]') : null;
  if (!innerSection) return true;

  var html = String(innerSection.innerHTML || '').trim();
  if (html.length >= 40) return true;

  var text = String(innerSection.textContent || '').replace(/\s+/g, ' ').trim();
  if (text.length >= 20) return true;

  if (innerSection.children && innerSection.children.length > 0) return true;
  return false;
}

function renderReportDashboard() {
  try { renderSajuFourCutContent(); } catch (fourCutErr) { console.warn('[SajuFourCut] 렌더 실패:', fourCutErr); }

  var container = document.getElementById('reportDashboard');
  var dashCard  = document.getElementById('reportDashboardCard');
  if (!container || !dashCard) return;
  dashCard.style.display = '';
  container.hidden = false;
  container.style.display = '';

  (function removeDashboardToggle() {
    var toggle = document.getElementById('reportDashboardToggle');
    if (toggle && toggle.parentNode) {
      toggle.parentNode.removeChild(toggle);
    }
  })();

  /* ── 이전 렌더에서 컨테이너 안으로 이동된 요소를 rescue zone으로 임시 이동 ──
     두 번째 이후 계산 시 container.innerHTML 교체로 파괴되는 것을 방지한다.   */
  (function rescueContainerChildren() {
    var zone = document.getElementById('_rptRescueZone');
    if (!zone) {
      zone = document.createElement('div');
      zone.id = '_rptRescueZone';
      zone.setAttribute('aria-hidden', 'true');
      zone.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;';
      document.body.appendChild(zone);
    }
    REPORT_CARDS.forEach(function(c) {
      if (_rptIsDirectAction(c.action)) return;
      try {
        var el = document.getElementById(c.target);
        if (el && container.contains(el)) {
          zone.appendChild(el); // 컨테이너에서 분리 — DOM상 살아있어 getElementById로 찾을 수 있음
        }
      } catch (eRescue) {}
    });
  })();

  /* ── 타겟 기준 중복 제거 블록 목록 생성 ── */
  var seenTargets = {};
  var blocks = [];
  REPORT_CARDS.forEach(function(c) {
    if (!seenTargets[c.target]) {
      seenTargets[c.target] = {
        images: [],
        target: c.target,
        action: c.action || '',
        title: c.label,
        preview: c.desc,
        note: c.note,
        cta: c.cta,
        accent: c.accent,
        glow: c.glow,
        shortTitle: c.shortTitle || '',
        badge: c.badge || '',
        tags: Array.isArray(c.tags) ? c.tags.slice(0, 5) : [],
        lockKey: c.lockKey || (c.target ? ('rpt_' + c.target) : ''),
        coinCost: Number(c.coinCost || 0),
        mainLock: c.mainLock !== false
      };
      blocks.push(seenTargets[c.target]);
    }
    seenTargets[c.target].images.push({ id: c.id, thumb: c.thumb || '', label: c.label, accent: c.accent });
  });

  /* ── 그리드 HTML 생성 ── */
  var gridHtml = '<div class="rpt-v2-grid">';
  blocks.forEach(function(b) {
    var sectionId = 'rpt-v2-section-' + b.target;
    var titleId = 'rpt-v2-title-' + b.target;
    gridHtml += '<section class="rpt-v2-block fortune-section" id="' + sectionId + '" aria-labelledby="' + titleId + '" style="border-color:' + b.accent + '44;">';

    /* 이미지 영역 — 이미지 짤림 없이 전체 표시 */
    gridHtml += '<div class="rpt-v2-img-row">';
    b.images.forEach(function(img) {
      var rawThumb = String(img.thumb || (img.id + '.webp'));
      var thumbSrc = '/fuctionassets/' + encodeURIComponent(rawThumb).replace(/%2F/g, '/');
      var tileWonPrice = (Number(b.coinCost || 0) * 100).toLocaleString('ko-KR') + '원';
      var tilePriceText = (b.coinCost > 0) ? (b.mainLock === false ? ('1회 ' + tileWonPrice) : ('🔒 ' + tileWonPrice + ' · 잠금 콘텐츠')) : '무료';
      var tilePriceClass = (b.coinCost > 0) ? (b.mainLock === false ? 'rpt-v2-price-badge is-per-use' : 'rpt-v2-price-badge') : 'rpt-v2-price-badge is-free';
      gridHtml += '<div class="rpt-v2-img-wrap">';
      gridHtml += '<img class="rpt-v2-img" src="' + thumbSrc + '" alt="' + img.label + '" loading="lazy" '
        + 'decoding="async" onerror="handleReportThumbError(this)">';
      gridHtml += '<span class="' + tilePriceClass + '">' + tilePriceText + '</span>';
      gridHtml += '</div>';
    });
    gridHtml += '</div>';

    /* 카드 헤더 + CTA */
    gridHtml += '<div class="rpt-v2-head">';
    gridHtml += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">';
    gridHtml += '<h3 id="' + titleId + '" class="sec-title rpt-v2-title">' + (b.shortTitle || b.title) + '</h3>';
    if (b.badge) {
      gridHtml += '<span style="display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;border-radius:999px;font-size:.68rem;font-weight:900;letter-spacing:.02em;color:#fff;background:linear-gradient(135deg,#22c55e 0%,#0ea5e9 100%);box-shadow:0 8px 16px rgba(14,165,233,.26);">' + b.badge + '</span>';
    }
    gridHtml += '</div>';
    gridHtml += '<p class="rpt-v2-preview">' + b.preview + '</p>';
    if (b.tags && b.tags.length) {
      gridHtml += '<p style="margin:2px 0 0;color:#f8d67f;font-size:.73rem;line-height:1.45;">' + b.tags.map(function(tag) { return '#' + tag; }).join(' · ') + '</p>';
    }
    gridHtml += '<p class="rpt-v2-note">' + (b.note || '지금 내 흐름과 맞는 인사이트를 펼쳐 확인해보세요.') + '</p>';
    var lockKey = b.lockKey || ('rpt_' + b.target);
    var shouldAttachTileLock = b.coinCost > 0 && b.mainLock !== false;
    var coinAttrs = shouldAttachTileLock ? (' data-tile-lock-key="' + lockKey + '" data-tile-lock-cost="' + b.coinCost + '"') : '';
    // 회당결제(mainLock:false) direct-action은 타일락 속성이 안 붙어 게이트가 안 돌던 dead-end를 막는다:
    // data-coin-cost/data-feature-key를 부여해 회당결제 게이트(_cdRunPerUseCoinGate)로 라우팅한다.
    if (!shouldAttachTileLock && b.coinCost > 0 && b.mainLock === false && _rptIsDirectAction(b.action)) {
      coinAttrs = ' data-coin-cost="' + b.coinCost + '" data-feature-key="' + lockKey + '"';
    }
    if (_rptIsDirectAction(b.action)) {
      gridHtml += '<button class="rpt-v2-toggle-btn" type="button" data-action="' + b.action + '"' + coinAttrs + ' aria-label="' + b.cta + '">';
      gridHtml += '<span class="rpt-v2-toggle-label">' + b.cta + '</span>';
      gridHtml += '</button>';
    } else {
      // 무료(비직접) 카드에도 기능 상세 프리뷰 팝업이 뜨도록 마커 부여:
      // data-feature-key=문구 조회 키, data-pvw-free=프리뷰 인터셉터 매칭용. 인라인 onclick은 유지(CTA 재클릭 시 토글).
      var freeAttrs = (b.coinCost > 0) ? '' : (' data-feature-key="rpt_' + b.target + '" data-pvw-free="1"');
      gridHtml += '<button class="rpt-v2-toggle-btn" type="button"' + (b.coinCost > 0 ? ' data-action="toggleRptCard"' : ' onclick="toggleReportFeatureCard(this)"') + coinAttrs + freeAttrs + ' aria-expanded="false" data-label="' + b.cta + '">';
      gridHtml += '<span class="rpt-v2-toggle-label">' + b.cta + '</span>';
      gridHtml += '<span class="rpt-v2-toggle-arrow" aria-hidden="true">▼</span>';
      gridHtml += '</button>';
    }
    gridHtml += '</div>';

    if (!_rptIsDirectAction(b.action)) {
      /* 토글 상세 영역 */
      gridHtml += '<div class="rpt-v2-detail" aria-hidden="true"><div class="rpt-v2-detail-inner">';

      /* 기능 콘텐츠 슬롯 */
      gridHtml += '<div class="rpt-v2-body" id="rpt-v2-body-' + b.target + '"></div>';
      gridHtml += '</div></div>';
    }
    gridHtml += '</section>';
  });
  gridHtml += '</div>';
  container.innerHTML = gridHtml;
  if (typeof window.applyTileLockVisuals === 'function') {
    try { window.applyTileLockVisuals(); } catch (lockVisualErr) {}
  }

  /* ── 기존 섹션을 슬롯 안으로 이동 ── */
  var pendingTargets = [];
  var recoverAttempted = {};
  var recoverEmptyAttempted = {};
  blocks.forEach(function(b) {
    if (_rptIsDirectAction(b.action)) return;

    var slot = document.getElementById('rpt-v2-body-' + b.target);
    var targetEl = document.getElementById(b.target);
    if (!targetEl && !recoverAttempted[b.target]) {
      recoverAttempted[b.target] = true;
      _sajuFunTryRecoverTargetCard(b.target);
      targetEl = document.getElementById(b.target);
    }
    if (slot && !targetEl) {
      slot.innerHTML = ''
        + '<div style="border:1px solid #e5e7eb;background:#f8fafc;border-radius:10px;padding:10px 12px;color:#334155;font-size:.84rem;line-height:1.6;">'
        + '<b>콘텐츠 준비 중입니다.</b><br>'
        + '잠시 후 자동으로 복원됩니다.'
        + '</div>';
      pendingTargets.push(b.target);
      return;
    }
    if (slot && targetEl) {
      if (!_sajuFunHasRenderableContent(targetEl) && !recoverEmptyAttempted[b.target]) {
        recoverEmptyAttempted[b.target] = true;
        _sajuFunTryRecoverTargetCard(b.target);
        targetEl = document.getElementById(b.target);
      }

      if (!targetEl || !_sajuFunHasRenderableContent(targetEl)) {
        slot.innerHTML = ''
          + '<div style="border:1px solid #e5e7eb;background:#f8fafc;border-radius:10px;padding:10px 12px;color:#334155;font-size:.84rem;line-height:1.6;">'
          + '<b>콘텐츠를 불러오는 중입니다.</b><br>'
          + '잠시 후 자동 반영됩니다. 바로 확인하려면 다시 분석하기를 눌러주세요.'
          + '</div>';
        pendingTargets.push(b.target);
        return;
      }

      /* 숨겨진 섹션도 대시보드 안에서 표시 */
      if (targetEl.style.display === 'none') {
        targetEl.style.display = '';
      }
      slot.appendChild(targetEl);
      _sajuFunForceRevealFateScroll(targetEl);
    }
  });

  if (pendingTargets.length) {
    var retryCount = 0;
    var maxRetry = 20;

    var retryAttach = function() {
      retryCount += 1;
      pendingTargets = pendingTargets.filter(function(targetId) {
        var slot = document.getElementById('rpt-v2-body-' + targetId);
        var targetEl = document.getElementById(targetId);
        if (!targetEl && !recoverAttempted[targetId]) {
          recoverAttempted[targetId] = true;
          _sajuFunTryRecoverTargetCard(targetId);
          targetEl = document.getElementById(targetId);
        }
        if (targetEl && !_sajuFunHasRenderableContent(targetEl) && !recoverEmptyAttempted[targetId]) {
          recoverEmptyAttempted[targetId] = true;
          _sajuFunTryRecoverTargetCard(targetId);
          targetEl = document.getElementById(targetId);
        }
        if (!slot || !targetEl || !_sajuFunHasRenderableContent(targetEl)) return true;

        if (targetEl.style.display === 'none') targetEl.style.display = '';
        slot.innerHTML = '';
        slot.appendChild(targetEl);
        _sajuFunForceRevealFateScroll(targetEl);
        return false;
      });

      if (pendingTargets.length && retryCount < maxRetry) {
        setTimeout(retryAttach, 260);
      }
    };

    setTimeout(retryAttach, 220);
  }
}

/* 대시보드 슬롯으로 이동된 콘텐츠 섹션은 스크롤 등장(fate-scroll) 숨김이 부적절하다.
   접힌 토글 안에서는 IntersectionObserver 리빌이 불안정해 opacity:0으로 남으므로 강제 해제한다. */
function _sajuFunForceRevealFateScroll(root) {
  if (!root || !root.classList) return;
  var nodes = [root];
  if (root.querySelectorAll) {
    var hidden = root.querySelectorAll('.fate-scroll-section-hidden');
    for (var i = 0; i < hidden.length; i++) nodes.push(hidden[i]);
  }
  nodes.forEach(function (el) {
    if (el.classList && el.classList.contains('fate-scroll-section-hidden')) {
      el.classList.remove('fate-scroll-section-hidden');
      el.classList.add('fate-scroll-section-visible');
    }
  });
}

function syncReportBlockHeight(block) {
  if (!block || !block.classList || !block.classList.contains('open')) return;
  var detail = block.querySelector('.rpt-v2-detail');
  var inner = block.querySelector('.rpt-v2-detail-inner');
  if (!detail || !inner) return;
  detail.style.setProperty('--rpt-open-height', (inner.scrollHeight + 6) + 'px');
}

var _rptHeightWatchers = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

function _bindReportHeightWatcher(block) {
  if (!_rptHeightWatchers || !block) return;
  if (_rptHeightWatchers.has(block)) return;

  var inner = block.querySelector('.rpt-v2-detail-inner');
  if (!inner) return;

  var rafId = 0;
  var schedule = function() {
    if (!block.classList || !block.classList.contains('open')) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function() {
      syncReportBlockHeight(block);
    });
  };

  var ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(schedule);
    ro.observe(inner);
  }

  var mo = null;
  if (typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver(schedule);
    mo.observe(inner, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  _rptHeightWatchers.set(block, { ro: ro, mo: mo });
}

function _unbindReportHeightWatcher(block) {
  if (!_rptHeightWatchers || !block) return;
  var watcher = _rptHeightWatchers.get(block);
  if (!watcher) return;
  if (watcher.ro) watcher.ro.disconnect();
  if (watcher.mo) watcher.mo.disconnect();
  _rptHeightWatchers.delete(block);
}

function syncReportHeightFromNode(node) {
  if (!node || !node.closest) return;
  var block = node.closest('.rpt-v2-block');
  syncReportBlockHeight(block);
}

function toggleReportFeatureCard(btn) {
  var block = btn.closest('.rpt-v2-block');
  if (!block) return;
  var open = block.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  var detail = block.querySelector('.rpt-v2-detail');
  if (detail) {
    detail.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      _sajuFunEnsureHealthReportBlockReady(block);
      _sajuFunEnsureQuantumBlockReady(block);
      _sajuFunForceRevealFateScroll(block);
      _bindReportHeightWatcher(block);
      syncReportBlockHeight(block);
    } else {
      _unbindReportHeightWatcher(block);
      detail.style.setProperty('--rpt-open-height', '0px');
    }
  }
  var label = btn.querySelector('.rpt-v2-toggle-label');
  var arrow = btn.querySelector('.rpt-v2-toggle-arrow');
  if (label) label.textContent = open ? '닫기' : (btn.dataset.label || '자세히 보기');
  if (arrow) arrow.textContent = open ? '▲' : '▼';

  if (open) {
    requestAnimationFrame(function(){ syncReportBlockHeight(block); });
    setTimeout(function(){ syncReportBlockHeight(block); }, 220);
    // 이 함수는 기능 상세 팝업 CTA('결과 보러가기')·결제 완료 직후에 호출된다.
    // 팝업이 화면을 덮고 있었으므로 펼쳐진 카드가 뷰포트 밖이면 아무 일도 안 일어난 것처럼 보인다.
    _sajuFunScrollBlockIntoView(block);
  }
}

function _sajuFunScrollBlockIntoView(block) {
  if (!block || typeof block.getBoundingClientRect !== 'function') return;
  requestAnimationFrame(function() {
    var rect = block.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (rect.top >= 0 && rect.top < viewportHeight * 0.5) return;
    try {
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      try { block.scrollIntoView(true); } catch (e2) {}
    }
  });
}
// 전역 노출 — _cdInvokeActionDirect('toggleRptCard') 에서 호출
window.toggleReportFeatureCard = toggleReportFeatureCard;

(function(){
  var resizeTicking = false;
  function onResize() {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function() {
      resizeTicking = false;
      document.querySelectorAll('.rpt-v2-block.open').forEach(function(block) {
        syncReportBlockHeight(block);
      });
    });
  }
  window.addEventListener('resize', onResize, { passive: true });
})();

function _sajuFunGetCurrentProfile() {
  try {
    if (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth) {
      return window.__cdActiveBirthProfile;
    }
  } catch (e0) {}

  try {
    if (window.DestinyProfileManager && window.DestinyProfileManager.storage && typeof window.DestinyProfileManager.storage.current === 'function') {
      return window.DestinyProfileManager.storage.current() || null;
    }
  } catch (e) {}

  try {
    return (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
      || window.__cdCurrentDestinyProfile
      || null;
  } catch (e2) {}

  return null;
}

function _sajuFunHasBirthCore(profile) {
  if (!profile || !profile.birth) return false;
  var b = profile.birth;
  var y = Number(b.year);
  var m = Number(b.month);
  var d = Number(b.day);
  return Number.isFinite(y) && y > 0 && Number.isFinite(m) && m >= 1 && m <= 12 && Number.isFinite(d) && d >= 1 && d <= 31;
}

function _sajuFunSetHint(message, tone) {
  var hint = document.getElementById('sajuFunProfileHint');
  if (!hint) return;
  hint.classList.remove('is-warning', 'is-success');
  if (tone === 'warning') hint.classList.add('is-warning');
  if (tone === 'success') hint.classList.add('is-success');
  hint.textContent = message;
}

function _sajuFunEnsureDashboardBlockOpen(targetEl) {
  if (!targetEl || !targetEl.closest) return targetEl;
  var block = targetEl.closest('.rpt-v2-block');
  if (!block) return targetEl;

  if (!block.classList.contains('open')) {
    var toggleBtn = block.querySelector('.rpt-v2-head .rpt-v2-toggle-btn');
    if (toggleBtn && typeof toggleReportFeatureCard === 'function') {
      try { toggleReportFeatureCard(toggleBtn); } catch (e) {}
    }
  }
  return block;
}

window.openSajuFunFeature = function(targetId, afterAction) {
  var profile = _sajuFunGetCurrentProfile();
  if (!_sajuFunHasBirthCore(profile)) {
    _sajuFunSetHint('⚠️ 사주 콘텐츠를 보려면 프로필 카드에 생년월일을 먼저 저장해 주세요. 입력 카드에서 저장 후 다시 눌러주세요.', 'warning');
    return;
  }

  _sajuFunSetHint('✅ 프로필 확인 완료. 사주 데이터를 불러온 뒤 선택한 콘텐츠로 이동합니다.', 'success');

  if (typeof window._dpOpenFortuneType === 'function') {
    try { window._dpOpenFortuneType('saju'); } catch (e) {}
  }

  var tries = 0;
  var maxTries = 12;
  var tick = function() {
    if (afterAction === 'openFortunePlanner' && typeof window.openFortunePlanner === 'function') {
      try { window.openFortunePlanner(); } catch (e2) {}
      return;
    }

    var target = targetId ? document.getElementById(targetId) : null;
    if (!target) {
      if (tries < maxTries) {
        tries += 1;
        setTimeout(tick, 260);
      }
      return;
    }

    if (target.style && target.style.display === 'none') target.style.display = '';
    if (targetId === 'healthReportCard') _sajuFunEnsureHealthReportRendered(target);
    var scrollTarget = _sajuFunEnsureDashboardBlockOpen(target) || target;
    try {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e3) {
      try { scrollTarget.scrollIntoView(true); } catch (e4) {}
    }
  };

  setTimeout(tick, 320);
};
