/**
 * Ziwei Doushu Engine - 자미두수 계산 엔진
 * 의존성: js/data/chinese-astrology.js, js/core/kasi/calendar.js
 * 
 * 주요 기능:
 * 1. 12궁(宮) 계산 - 명궁, 형제궁, 부모궁, ... , 자녀궁
 * 2. 14대성(十四主星) - 紫微, 天機, 太陽, 武曲, 天同, ...
 * 3. 사화(四化) - 化祿, 化權, 化科, 化忌
 * 4. 대한(大限) 추산 - 10年주기 운세
 */

/**
 * 12궁 이름 매핑
 */
var PALACE_NAMES = {
  1: '명궁(命宮)', 2: '형제궁(兄弟宮)', 3: '부모궁(父母宮)', 4: '재부궁(財帛宮)',
  5: '자녀궁(子女宮)', 6: '노복궁(奴僕宮)', 7: '부부궁(夫妻宮)', 8: '질병궁(疾厄宮)',
  9: '여행궁(遷移宮)', 10: '관로궁(官祿宮)', 11: '교양궁(交友宮)', 12: '재복궁(財福宮)'
};

/**
 * 28숙(二十八宿)을 12궁으로 맵핑하는 함수
 * 각 숙은 특정 궁에 대응됩니다.
 * 
 * @param {number} mansionIdx - 숙 인덱스 (0~27)
 * @returns {number} 궁 번호 (1~12)
 */
function getMansionPalace(mansionIdx) {
  if (typeof mansionIdx !== 'number' || mansionIdx < 0 || mansionIdx > 27) {
    return 1;
  }
  
  var mansionPalaceMap = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    1, 2, 3, 4
  ];
  
  return mansionPalaceMap[mansionIdx] || 1;
}

/**
 * 14대성 정의와 특성
 */
var FOURTEEN_STARS = {
  '紫微': {
    emoji: '👑', desc: '자미성', meaning: '제왕의 기운, 지도력', quality: '길함'
  },
  '天機': {
    emoji: '🧠', desc: '천기성', meaning: '지혜와 변화', quality: '길함'
  },
  '太陽': {
    emoji: '☀️', desc: '태양성', meaning: '밝음과 희망', quality: '길함'
  },
  '武曲': {
    emoji: '⚔️', desc: '무곡성', meaning: '결단력과 추진력', quality: '길함'
  },
  '天同': {
    emoji: '😊', desc: '천동성', meaning: '즐거움과 복락', quality: '길함'
  },
  '廉貞': {
    emoji: '🔥', desc: '염정성', meaning: '열정과 격정', quality: '중등'
  },
  '天府': {
    emoji: '💰', desc: '천부성', meaning: '풍요로움', quality: '길함'
  },
  '太陰': {
    emoji: '🌙', desc: '태음성', meaning: '부드러움과 배려', quality: '길함'
  },
  '貪狼': {
    emoji: '🐺', desc: '탐랑성', meaning: '욕심과 활동성', quality: '중등'
  },
  '巨門': {
    emoji: '🗣️', desc: '거문성', meaning: '말과 소통', quality: '중등'
  },
  '天相': {
    emoji: '🤝', desc: '천상성', meaning: '보필과 도움', quality: '길함'
  },
  '天梁': {
    emoji: '🏛️', desc: '천량성', meaning: '도움과 보호', quality: '길함'
  },
  '七殺': {
    emoji: '⚡', desc: '칠살성', meaning: '추진력과 도전', quality: '중등'
  },
  '破軍': {
    emoji: '💥', desc: '파군성', meaning: '변화와 파괴', quality: '불리'
  }
};

/**
 * 자미두수 명궁 계산
 * 음력 생월과 시간으로부터 명궁을 계산합니다.
 * 수프 체계: 자평(子平) 기준
 * 
 * @param {Object} lunarDate - {year, month, day} 음력 생년월일
 * @param {number} hour - 시간 (0~23)
 * @returns {Object} {
 *   mingGong: number (1~12),
 *   mingXing: Array (주성들),
 *   sihua: Object (사화 배치),
 *   palaces: Array (12궁 배열)
 * }
 */
function calcZiweiPalaces(lunarDate, hour) {
  if (!lunarDate || typeof lunarDate.month !== 'number' || typeof hour !== 'number') {
    return {
      mingGong: 1,
      mingXing: [],
      sihua: {},
      palaces: initPalaces()
    };
  }

  // 음력월과 시간으로부터 명궁 계산
  // 기본 공식: (음력월 + 시간대) mod 12
  var hourBucket = Math.floor(hour / 2);
  var mingGongIndex = (lunarDate.month - 1 + hourBucket) % 12;
  var mingGong = mingGongIndex + 1;

  // 12개 궁 초기화
  var palaces = initPalaces();

  // 명궁에 紫微를 배치 (기본 동의 계산 생략, 단순화)
  // 실제로는 더 복잡한 '斗數盤' 계산 필요
  var starOrder = [
    '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
    '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'
  ];

  // 紫微를 명궁에 배치
  var ziweiPos = mingGong;
  palaces[ziweiPos - 1].stars.push('紫微');

  // 다른 주성들을 순서대로 배치
  for (var i = 1; i < starOrder.length; i++) {
    var pos = (ziweiPos - 1 + i * 2) % 12; // 2칸씩 이동
    palaces[pos].stars.push(starOrder[i]);
  }

  // 사화(四化) 계산
  var sihua = calcSihua(lunarDate, hour);

  return {
    mingGong: mingGong,
    mingXing: palaces[mingGong - 1].stars,
    sihua: sihua,
    palaces: palaces
  };
}

/**
 * 12궁 초기화
 * 
 * @returns {Array} [
 *   {name, number, stars: [], sihua: {}},
 *   ...
 * ]
 */
function initPalaces() {
  var palaces = [];
  for (var i = 1; i <= 12; i++) {
    palaces.push({
      name: PALACE_NAMES[i],
      number: i,
      stars: [],
      sihua: {}
    });
  }
  return palaces;
}

/**
 * 사화(四化) 계산
 * 음력 월간과 시간대로부터 화祿, 化權, 化科, 化忌를 계산합니다.
 * 
 * @param {Object} lunarDate - {year, month, day}
 * @param {number} hour
 * @returns {Object} {
 *   lulu: {star, palace},        // 化祿 (재물과 복)
 *   huaquan: {star, palace},    // 化權 (권력과 통제)
 *   huake: {star, palace},      // 化科 (명성과 영예)
 *   huaji: {star, palace}       // 化忌 (손실과 고민)
 * }
 */
function calcSihua(lunarDate, hour) {
  if (!lunarDate) {
    return {
      lulu: { star: '?', palace: 1 },
      huaquan: { star: '?', palace: 2 },
      huake: { star: '?', palace: 3 },
      huaji: { star: '?', palace: 4 }
    };
  }

  // 월간(月干) 기반 사화 배치 (단순화된 알고리즘)
  var monthNum = (lunarDate.month || 1) - 1;
  var hourBucket = Math.floor(hour / 2);
  
  var luluPalace = (monthNum + 1) % 12;
  var huaquanPalace = (monthNum + 3) % 12;
  var huakePalace = (monthNum + 6) % 12;
  var huajiPalace = (monthNum + 9) % 12;

  return {
    lulu: {
      star: '化祿',
      palace: luluPalace + 1,
      meaning: '재물, 복락, 성취감'
    },
    huaquan: {
      star: '化權',
      palace: huaquanPalace + 1,
      meaning: '권력, 통제, 추진력'
    },
    huake: {
      star: '化科',
      palace: huakePalace + 1,
      meaning: '명성, 영예, 평판'
    },
    huaji: {
      star: '化忌',
      palace: huajiPalace + 1,
      meaning: '손실, 고민, 장애물'
    }
  };
}

/**
 * 별의 성격 판정
 * 해당 궁(宮)에 있을 때 별의 길흉을 평가합니다.
 * 
 * @param {string} star - 별 이름 (예: '紫微')
 * @param {number} palace - 궁 번호 (1~12)
 * @returns {Object} {
 *   quality: 'good'|'neutral'|'bad',
 *   meaning: string,
 *   tips: Array
 * }
 */
function evalStar(star, palace) {
  if (!FOURTEEN_STARS[star]) {
    return { quality: 'neutral', meaning: '?', tips: [] };
  }

  var s = FOURTEEN_STARS[star];
  var quality = s.quality === '길함' ? 'good' : s.quality === '불리' ? 'bad' : 'neutral';

  // 궁별 길흉 판정 (단순화된 규칙)
  var paladceGood = [1, 4, 7, 10];  // 명, 재, 부부, 관로궁
  var palaceNeutral = [2, 3, 5, 6, 9, 11, 12];
  var mutable = false;

  if (paladceGood.indexOf(palace) >= 0 && quality !== 'bad') {
    mutable = true;  // 길궁에 있으면 더 길해짐
  } else if (palaceNeutral.indexOf(palace) >= 0 && quality === 'bad') {
    mutable = true;  // 중립궁에 있으면 약화됨
  }

  return {
    quality: quality,
    meaning: s.desc + ' - ' + s.meaning,
    tips: [
      '이 별이 ' + PALACE_NAMES[palace] + '에 있습니다.',
      (quality === 'good' ? '길한 상징입니다.' : quality === 'bad' ? '주의가 필요합니다.' : '중성적 영향입니다.')
    ]
  };
}

/**
 * 대한(大限) 추산
 * 10年주기의 운세를 추산합니다.
 * 
 * @param {Object} lunarDate - {year, month, day}
 * @returns {Array} [
 *   {age: 10, startYear, decade: {...}},
 *   {age: 20, startYear, decade: {...}},
 *   ...
 * ]
 */
function calcDahuan(lunarDate) {
  if (!lunarDate || !lunarDate.year) {
    return [];
  }

  var dahuans = [];
  for (var i = 1; i <= 10; i++) {
    var age = i * 10;
    var startYear = lunarDate.year + age;
    
    dahuans.push({
      age: age,
      startYear: startYear,
      decade: '제' + i + '대한 (만' + age + '~' + (age + 9) + '세)',
      meaning: (age < 30 ? '초년기' : age < 60 ? '중년기' : '노년기') + '의 10年 운세'
    });
  }

  return dahuans;
}

/**
 * 자미두수 전체 차트 생성
 * 
 * @param {Object} opts - {
 *   lunarDate: {year, month, day},
 *   hour: number,
 *   minute: number
 * }
 * @returns {Object}
 */
function buildZiweiChart(opts) {
  if (!opts || !opts.lunarDate) {
    return null;
  }

  var palaces = calcZiweiPalaces(opts.lunarDate, opts.hour || 0);
  var dahuans = calcDahuan(opts.lunarDate);

  return {
    lunarDate: opts.lunarDate,
    hour: opts.hour || 0,
    minute: opts.minute || 0,
    mingGong: palaces.mingGong,
    mingXing: palaces.mingXing,
    palaces: palaces.palaces,
    sihua: palaces.sihua,
    dahuans: dahuans,
    timestamp: Date.now()
  };
}

// 전역 등록
try {
  window.calcZiweiPalaces = calcZiweiPalaces;
  window.evalStar = evalStar;
  window.calcDahuan = calcDahuan;
  window.buildZiweiChart = buildZiweiChart;
  window.initPalaces = initPalaces;
  window.getMansionPalace = getMansionPalace;
} catch (e) {}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calcZiweiPalaces,
    evalStar,
    calcDahuan,
    buildZiweiChart,
    initPalaces,
    getMansionPalace,
    FOURTEEN_STARS,
    PALACE_NAMES
  };
}
