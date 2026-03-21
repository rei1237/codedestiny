/**
 * Chinese Astrology Data - 명리학 기본 데이터
 * 천간, 지지, 십성, 오행 관계, 동물띠 등
 */

/**
 * 천간(天干) - 10개
 * 각 천간: {e: 오행, y: 음양, n: 한글명}
 */
const GAN = {
  '甲': { e: 'wood', y: '+', n: '갑목' },
  '乙': { e: 'wood', y: '-', n: '을목' },
  '丙': { e: 'fire', y: '+', n: '병화' },
  '丁': { e: 'fire', y: '-', n: '정화' },
  '戊': { e: 'earth', y: '+', n: '무토' },
  '己': { e: 'earth', y: '-', n: '기토' },
  '庚': { e: 'metal', y: '+', n: '경금' },
  '辛': { e: 'metal', y: '-', n: '신금' },
  '壬': { e: 'water', y: '+', n: '임수' },
  '癸': { e: 'water', y: '-', n: '계수' }
};

/**
 * 지지(地支) - 12개
 * 각 지지: {e: 오행, y: 음양, a: 동물}
 */
const JI = {
  '子': { e: 'water', y: '-', a: '쥐' },
  '丑': { e: 'earth', y: '-', a: '소' },
  '寅': { e: 'wood', y: '+', a: '호랑이' },
  '卯': { e: 'wood', y: '-', a: '토끼' },
  '辰': { e: 'earth', y: '+', a: '용' },
  '巳': { e: 'fire', y: '+', a: '뱀' },
  '午': { e: 'fire', y: '-', a: '말' },
  '未': { e: 'earth', y: '-', a: '양' },
  '申': { e: 'metal', y: '+', a: '원숭이' },
  '酉': { e: 'metal', y: '-', a: '닭' },
  '戌': { e: 'earth', y: '+', a: '개' },
  '亥': { e: 'water', y: '+', a: '돼지' }
};

/**
 * 동물 이모지
 */
const ANIMAL_EMOJI = {
  '쥐': '🐭',
  '소': '🐄',
  '호랑이': '🐯',
  '토끼': '🐰',
  '용': '🐉',
  '뱀': '🐍',
  '말': '🐴',
  '양': '🐑',
  '원숭이': '🐵',
  '닭': '🐔',
  '개': '🐕',
  '돼지': '🐷'
};

/**
 * 오행 한글명
 */
const EL_K = {
  'wood': '목(木)',
  'fire': '화(火)',
  'earth': '토(土)',
  'metal': '금(金)',
  'water': '수(水)'
};

/**
 * 오행 이모지
 */
const EL_E = {
  'wood': '🌿',
  'fire': '🔥',
  'earth': '🌏',
  'metal': '✨',
  'water': '💧'
};

/**
 * 오행 상생(生) 관계
 * 목→화→토→금→수→목
 */
const SHENG = {
  'wood': 'fire',
  'fire': 'earth',
  'earth': 'metal',
  'metal': 'water',
  'water': 'wood'
};

/**
 * 오행 상극(剋) 관계
 * 목→토, 토→수, 수→화, 화→금, 금→목
 */
const KE = {
  'wood': 'earth',
  'fire': 'metal',
  'earth': 'water',
  'metal': 'wood',
  'water': 'fire'
};

/**
 * 주어진 오행을 극하는 오행을 반환
 */
function whoControls(e) {
  var k = Object.keys(KE);
  for (var i = 0; i < k.length; i++) {
    if (KE[k[i]] === e) return k[i];
  }
  return 'metal';
}

/**
 * 주어진 오행의 모체(부모) 오행을 반환
 */
function parentOf(e) {
  var k = Object.keys(SHENG);
  for (var i = 0; i < k.length; i++) {
    if (SHENG[k[i]] === e) return k[i];
  }
  return 'water';
}

/**
 * 십성(十星) DB
 * 각 십성: {emoji, desc, meaning}
 */
const TS_DB = {
  '비견': {
    emoji: '👬',
    desc: '나랑 똑같은 나의 분신!',
    meaning: '친구처럼 든든한 나와 같은 에너지'
  },
  '겁재': {
    emoji: '🥷',
    desc: '내 것을 뺏고 뺏기는 라이벌!',
    meaning: '경쟁하고 이겨내려는 불타는 에너지'
  },
  '식신': {
    emoji: '🍔',
    desc: '오물오물 맛있게 먹는 재능!',
    meaning: '즐겁게 표현하고 베푸는 행복한 에너지'
  },
  '상관': {
    emoji: '💥',
    desc: '규칙은 싫어! 내 멋대로 할래!',
    meaning: '틀을 깨고 창의적으로 바꾸는 에너지'
  },
  '편재': {
    emoji: '🎢',
    desc: '크게 놀고 크게 버는 통 큰 대장!',
    meaning: '넓은 세상을 누비고 지휘하는 에너지'
  },
  '정재': {
    emoji: '🐖',
    desc: '차곡차곡 알뜰살뜰 모으는 저금통!',
    meaning: '아끼고 소중히 다루는 성실한 에너지'
  },
  '편관': {
    emoji: '⚔️',
    desc: '엄격하고 무서운 호랑이 선생님!',
    meaning: '참아내고 책임지는 카리스마 에너지'
  },
  '정관': {
    emoji: '👑',
    desc: '칭찬받는 모범생 반장!',
    meaning: '바른 길로 이끌어주는 규칙의 에너지'
  },
  '편인': {
    emoji: '🔮',
    desc: '남들은 모르는 신비한 초능력!',
    meaning: '번뜩이는 아이디어와 독특한 재능 에너지'
  },
  '정인': {
    emoji: '🤱',
    desc: '따뜻하게 안아주는 엄마의 품!',
    meaning: '배우고 사랑받는 수용의 에너지'
  }
};

/**
 * 십성 상세 설명 (성격, 직업, 연애, 조언)
 */
const TS_DEEP = {
  '비견': {
    nature: '누구의 간섭도 받기 싫어하는 <b>자유로운 영혼</b>입니다. 겉으로는 조용해 보여도 속에는 "내가 최고"라는 자존심이 꽉 차 있습니다. 남 밑에서 일하기보다는 내 이름을 걸고 하는 일이 어울립니다.',
    career: '프리랜서, 전문직, 개인 사업, 예체능 분야 — 조직 생활보다는 독립적인 업무에서 빛납니다.',
    love: '<b>친구 같은 편안한 연애</b>를 선호합니다. 나를 구속하거나 집착하는 상대와는 절대 오래 못 갑니다. 서로의 사생활을 존중해주는 쿨한 사람과 잘 맞습니다.',
    advice: '고집이 너무 세면 주변 사람이 떠납니다. 가끔은 "내가 틀릴 수도 있다"고 생각하는 유연함이 성공의 열쇠입니다. 동업보다는 단독 행동이 유리합니다.'
  },
  // ... (나머지 십성 상세 정보는 원본과 동일)
};

/**
 * 지지별 특성
 */
const ZHI_FEAT = {
  '子': '쥐띠: 영리하고 순발력이 뛰어나다',
  '丑': '소띠: 근면성실하며 인내심이 강하다',
  '寅': '호랑이띠: 용맹하고 도전정신이 대단하다',
  '卯': '토끼띠: 온화하고 예민한 감성을 가졌다',
  '辰': '용띠: 권위와 통찰력을 갖추었다',
  '巳': '뱀띠: 신비롭고 직관력이 뛰어나다',
  '午': '말띠: 활발하고 자유로운 기운을 지녔다',
  '未': '양띠: 온순하고 협력적인 성향이다',
  '申': '원숭이띠: 영리하고 재치가 넘친다',
  '酉': '닭띠: 규칙적이고 철저한 성향이다',
  '戌': '개띠: 충성스럽고 정의감이 강하다',
  '亥': '돼지띠: 관대하고 포용력이 큰 편이다'
};

const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * Gan-Zhi 합(合) 관계
 */
const GANHE = {
  '甲': { '己': 'earth' },
  '己': { '甲': 'earth' },
  '乙': { '庚': 'metal' },
  '庚': { '乙': 'metal' },
  '丙': { '辛': 'water' },
  '辛': { '丙': 'water' },
  '丁': { '壬': 'wood' },
  '壬': { '丁': 'wood' },
  '戊': { '癸': 'fire' },
  '癸': { '戊': 'fire' }
};

/**
 * Gan 충(衝) 관계
 */
const GANCHONG = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸']
];

/**
 * Zhi 합(合) 관계
 */
const JIHE = {
  '子': { '丑': 'earth' },
  '丑': { '子': 'earth' },
  '寅': { '亥': 'wood' },
  '亥': { '寅': 'wood' },
  '卯': { '戌': 'fire' },
  '戌': { '卯': 'fire' },
  '辰': { '酉': 'metal' },
  '酉': { '辰': 'metal' },
  '巳': { '申': 'water' },
  '申': { '巳': 'water' },
  '午': { '未': 'fire' },
  '未': { '午': 'fire' }
};

/**
 * Zhi 충(衝) 관계
 */
const JICHONG = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥']
];

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAN, JI, ANIMAL_EMOJI, EL_K, EL_E,
    SHENG, KE, whoControls, parentOf,
    TS_DB, TS_DEEP, ZHI_FEAT, ZHI_LIST,
    GANHE, GANCHONG, JIHE, JICHONG
  };
}

// 전역 등록
try {
  window.GAN = GAN;
  window.JI = JI;
  window.SHENG = SHENG;
  window.KE = KE;
  window.TS_DB = TS_DB;
  window.whoControls = whoControls;
  window.parentOf = parentOf;
  window.ZHI_LIST = ZHI_LIST;
} catch (e) {}
