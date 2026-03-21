/**
 * Saju Analysis Engine - 명리 분석 서비스
 * 의존성: js/data/chinese-astrology.js (GAN, JI, SHENG, KE)
 * 
 * 주요 기능:
 * 1. 조후(條候) 분석 - 한난(溫燥) 열균형
 * 2. 신강약(神强弱) 판정 - 용신/기신 선정
 * 3. 종격(從格) 감지 - 천간/지지 합/충 분석
 * 4. 십성(十星) 계산 - 일간과 대간지의 관계
 */

/**
 * 조후(條候) 분석
 * 한난(溫燥) 열균합과 습조(濕燥)를 판정합니다.
 * 
 * @param {Object} p - 사주 기둥 {y, m, d, h} 각각 {g, j, gE, jE}
 * @returns {Object} {
 *   type: 'hot'|'warm'|'neutral'|'cool'|'cold',
 *   score: number,
 *   advice: string,
 *   season: string,
 *   moistType: 'wet'|'dry'|'balanced',
 *   ...
 * }
 */
function analyzeJohu(p) {
  if (!p || !GAN || !JI) {
    return {
      type: 'neutral',
      score: 0,
      advice: '데이터 부족으로 분석 불가',
      season: '',
      moistType: 'balanced'
    };
  }

  var yg = p.y.g, yz = p.y.j, mg = p.m.g, mz = p.m.j, 
      dg = p.d.g, dz = p.d.j, hg = p.h.g, hz = p.h.j;
  
  var score = 0;
  var seasonMap = {
    '寅': '봄', '卯': '봄', '辰': '봄',
    '巳': '여름', '午': '여름', '未': '여름',
    '申': '가을', '酉': '가을', '戌': '가을',
    '亥': '겨울', '子': '겨울', '丑': '겨울'
  };
  var season = seasonMap[mz] || '봄';

  // 계절별 기본 점수
  if (season === '여름') score += 4;
  else if (season === '봄') score += 2;
  else if (season === '가을') score -= 2;
  else score -= 4;

  var fc = 0, wc = 0, wdc = 0, mc = 0;
  var moistCnt = 0, dryCnt = 0;

  // 각 기둥의 오행 분석
  [yg, yz, mg, mz, dg, dz, hg, hz].forEach(function(c) {
    if (!c) return;
    var g = GAN[c], j = JI[c];
    var e = (g || j || {}).e;
    
    if (e === 'fire') {
      score += 1.5;
      fc++;
      dryCnt++;
    } else if (e === 'water') {
      score -= 1.5;
      wc++;
      moistCnt++;
    } else if (e === 'wood') {
      score += 0.5;
      wdc++;
      moistCnt++;
    } else if (e === 'metal') {
      score -= 0.5;
      mc++;
      dryCnt++;
    }

    // 지지의 습조 특성
    if (j) {
      if (c === '辰' || c === '丑') moistCnt++;
      if (c === '戌' || c === '未') dryCnt++;
    }
  });

  var type, advice, badgeCls, badgeTxt;
  
  if (score >= 5) {
    type = 'hot';
    advice = '사주가 매우 뜨겁습니다. 水·金 기운이 절실히 필요합니다.';
    badgeCls = 'jb-hot';
    badgeTxt = '🔥 뜨거운 사주';
  } else if (score >= 2) {
    type = 'warm';
    advice = '사주가 따뜻한 편입니다. 水 기운으로 조절하면 좋습니다.';
    badgeCls = 'jb-warm';
    badgeTxt = '🌞 따뜻한 사주';
  } else if (score > -2) {
    type = 'neutral';
    advice = '사주의 온도가 시원하게 균형잡혀 있습니다. 계절 변화에 맞춰 음양을 조절하세요.';
    badgeCls = 'jb-neutral';
    badgeTxt = '🌤️ 시원한 사주';
  } else if (score > -5) {
    type = 'cool';
    advice = '사주가 서늘한 편입니다. 火·木 기운으로 온기를 보충하면 좋습니다.';
    badgeCls = 'jb-cool';
    badgeTxt = '🍃 서늘한 사주';
  } else {
    type = 'cold';
    advice = '사주가 매우 차갑습니다. 火·木 기운이 절실히 필요합니다.';
    badgeCls = 'jb-cold';
    badgeTxt = '❄️ 차가운 사주';
  }

  var moistType, moistAdvice;
  var diff = moistCnt - dryCnt;
  
  if (diff >= 3) {
    moistType = 'wet';
    moistAdvice = '사주에 습기가 많은 편입니다. 건조한 환경, 금(金)·불(火) 기운을 적절히 써주면 균형이 좋아집니다.';
  } else if (diff <= -3) {
    moistType = 'dry';
    moistAdvice = '사주가 건조한 편입니다. 물(水)·나무(木) 기운과 실제 수분(물·목욕·자연)을 통해 촉촉함을 채워주는 것이 좋습니다.';
  } else {
    moistType = 'balanced';
    moistAdvice = '습조(濕燥)는 비교적 균형잡힌 편입니다. 한난만 잘 맞춰주면 좋습니다.';
  }

  var improve = (type === 'hot' || type === 'warm')
    ? '시원하고 차가운 기운 필요. 북쪽 방향, 파란색·검은색 컬러, 수영·물가 활동.'
    : (type === 'cold' || type === 'cool')
    ? '따뜻하고 밝은 기운 필요. 남쪽 방향, 빨간색·주황색 컬러, 캠핑·BBQ 활동.'
    : '균형잡힌 사주입니다. 다양한 오행을 골고루 활용하세요.';

  return {
    score: score,
    type: type,
    advice: advice,
    badgeCls: badgeCls,
    badgeTxt: badgeTxt,
    improve: improve,
    season: season,
    fc: fc,
    wc: wc,
    wdc: wdc,
    mc: mc,
    moistType: moistType,
    moistAdvice: moistAdvice,
    moistCnt: moistCnt,
    dryCnt: dryCnt
  };
}

/**
 * 신강약(神强弱) 계산
 * 일간의 강약을 판정하고 용신(用神)과 기신(忌神)을 선정합니다.
 * 
 * @param {Object} p - 사주 기둥
 * @returns {Object} {
 *   isStrong: boolean,
 *   score: number,
 *   yongshin: Array (용신 오행),
 *   kijishin: Array (기신 오행),
 *   dayEl: string (일간 오행),
 *   parEl: string (일간의 모체 오행)
 * }
 */
function calcPower(p) {
  if (!p || !GAN || !SHENG || !KE || !window.whoControls || !window.parentOf) {
    return null;
  }

  var dg = p.d.g;
  var dayEl = GAN[dg] && GAN[dg].e;
  if (!dayEl) return null;

  var parEl = window.parentOf(dayEl);
  var score = 0;

  // 월지 영향
  var mjEl = JI[p.m.j] && JI[p.m.j].e;
  if (mjEl) {
    if (mjEl === dayEl) score += 40;
    else if (mjEl === parEl) score += 27;
    else if (KE[mjEl] === dayEl) score -= 27;
    else if (SHENG[dayEl] === mjEl) score -= 10;
  }

  // 일지 영향
  var djEl = JI[p.d.j] && JI[p.d.j].e;
  if (djEl) {
    if (djEl === dayEl || djEl === parEl) score += 13;
    else if (KE[djEl] === dayEl) score -= 9;
  }

  // 년간/년지, 월간, 시간/시지 영향
  [p.y.g, p.y.j, p.m.g, p.h.g, p.h.j].forEach(function(c) {
    if (!c) return;
    var ce = (GAN[c] && GAN[c].e) || (JI[c] && JI[c].e);
    if (!ce) return;
    
    if (ce === dayEl || ce === parEl) score += 7;
    else if (KE[ce] === dayEl) score -= 7;
  });

  var isStrong = score >= 30;
  var yongshin, kijishin;

  if (isStrong) {
    // 신강: 소비(瀉比)→재(財)→관(官/印) 순서로 선정
    var drain = SHENG[dayEl];  // 일간을 소비하는 오행
    var reEl = drain ? SHENG[drain] : null;  // 재(財) 다음
    var ctrlEl = window.whoControls(dayEl);  // 관(官/印) 역할
    yongshin = [drain, reEl, ctrlEl].filter(Boolean);
    kijishin = [dayEl, parEl].filter(Boolean);
  } else {
    // 신약: 비견→인(印) 순서로 선정
    yongshin = [dayEl, parEl].filter(Boolean);
    kijishin = [SHENG[dayEl], window.whoControls(dayEl)].filter(Boolean);
  }

  return {
    isStrong: isStrong,
    score: score,
    yongshin: yongshin,
    kijishin: kijishin,
    dayEl: dayEl,
    parEl: parEl
  };
}

/**
 * 종격(從格) 감지
 * 천간합/충과 지지합/충이 형성하는 특수 패턴을 분석합니다.
 * 
 * @param {Object} p - 사주 기둥
 * @returns {Object} {
 *   isJong: boolean,
 *   name: string,
 *   rules: Object,
 *   notes: Array
 * }
 */
function detectJong(p) {
  if (!p || !GAN || !JI) {
    return { isJong: false, name: '', rules: {}, notes: [] };
  }

  // 천간 합/충 정의
  var GANHE = {
    '甲': { '己': 'earth' }, '己': { '甲': 'earth' },
    '乙': { '庚': 'metal' }, '庚': { '乙': 'metal' },
    '丙': { '辛': 'water' }, '辛': { '丙': 'water' },
    '丁': { '壬': 'wood' }, '壬': { '丁': 'wood' },
    '戊': { '癸': 'fire' }, '癸': { '戊': 'fire' }
  };
  
  var GANCHONG = [
    ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']
  ];

  // 지지 합/충 정의
  var JIHE = {
    '子': { '丑': 'earth' }, '丑': { '子': 'earth' },
    '寅': { '亥': 'wood' }, '亥': { '寅': 'wood' },
    '卯': { '戌': 'fire' }, '戌': { '卯': 'fire' },
    '辰': { '酉': 'metal' }, '酉': { '辰': 'metal' },
    '巳': { '申': 'water' }, '申': { '巳': 'water' },
    '午': { '未': 'fire' }, '未': { '午': 'fire' }
  };

  var JICHONG = [
    ['子', '午'], ['丑', '未'], ['寅', '申'],
    ['卯', '酉'], ['辰', '戌'], ['巳', '亥']
  ];

  var gans = [p.y.g, p.m.g, p.d.g, p.h.g];
  var zhis = [p.y.j, p.m.j, p.d.j, p.h.j];

  // 천간 합/충 검사
  var ganHeCount = 0, ganChongCount = 0;
  for (var gi = 0; gi < gans.length; gi++) {
    for (var gj = gi + 1; gj < gans.length; gj++) {
      var g1 = gans[gi], g2 = gans[gj];
      if (!g1 || !g2) continue;
      if (GANHE[g1] && GANHE[g1][g2]) ganHeCount++;
    }
  }
  
  GANCHONG.forEach(function(pr) {
    if (gans.indexOf(pr[0]) >= 0 && gans.indexOf(pr[1]) >= 0) {
      ganChongCount++;
    }
  });

  // 지지 합/충 검사
  var jiHeCount = 0, jiChongCount = 0;
  for (var zi = 0; zi < zhis.length; zi++) {
    for (var zj = zi + 1; zj < zhis.length; zj++) {
      var z1 = zhis[zi], z2 = zhis[zj];
      if (!z1 || !z2) continue;
      if (JIHE[z1] && JIHE[z1][z2]) jiHeCount++;
    }
  }

  JICHONG.forEach(function(pr) {
    if (zhis.indexOf(pr[0]) >= 0 && zhis.indexOf(pr[1]) >= 0) {
      jiChongCount++;
    }
  });

  // 종격 판정 (수정된 원칙)
  // 원국 천간합: 합력이 충을 제압 (70% 이상)
  // 원국 지지합: 충 우선 (지지는 고정적)
  var isJong = false;
  var name = '';
  var notes = [];

  // 천간이 모두 한 종류로 합화된 경우
  if (ganHeCount >= 1) {
    isJong = true;
    name = '천간합격(天干合格)';
    notes.push('천간이 합화되어 종격 조건을 만족합니다.');
  }

  // 지지가 전부 특정 오행으로 귀일된 경우
  if (jiHeCount >= 2) {
    isJong = true;
    name = '지지합격(地支合格)';
    notes.push('지지가 합화되어 특정 오행으로 귀일됩니다.');
  }

  // 천간충과 지지충이 동시에 많은 경우
  if (ganChongCount >= 1 && jiChongCount >= 1) {
    notes.push('천간·지지가 충이 많아 일간이 극도로 약합니다.');
  }

  return {
    isJong: isJong,
    name: name,
    rules: {
      ganHeCount: ganHeCount,
      ganChongCount: ganChongCount,
      jiHeCount: jiHeCount,
      jiChongCount: jiChongCount
    },
    notes: notes
  };
}

/**
 * 십성(十星) 계산
 * 일간과 대상 간지의 관계로 십성을 판정합니다.
 * 
 * @param {string} dayGan - 일간 (예: '甲')
 * @param {string} target - 대상 간지 (예: '丙')
 * @returns {string} 십성 이름 (비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인)
 */
function getTenGod(dayGan, target) {
  if (!GAN || !JI || !dayGan || !target) {
    return '?';
  }

  var gOrJ = GAN[target] || JI[target];
  if (!GAN[dayGan] || !gOrJ) return '?';

  var els = ['wood', 'fire', 'earth', 'metal', 'water'];
  var dayEl = GAN[dayGan].e;
  var targetEl = gOrJ.e;
  
  var diff = (els.indexOf(targetEl) - els.indexOf(dayEl) + 5) % 5;
  var samePol = GAN[dayGan].y === gOrJ.y;

  var tenGods = {
    0: samePol ? '비견' : '겁재',
    1: samePol ? '식신' : '상관',
    2: samePol ? '편재' : '정재',
    3: samePol ? '편관' : '정관',
    4: samePol ? '편인' : '정인'
  };

  return tenGods[diff] || '?';
}

// 전역 등록
try {
  window.analyzeJohu = analyzeJohu;
  window.calcPower = calcPower;
  window.detectJong = detectJong;
  window.getTenGod = getTenGod;
} catch (e) {}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeJohu,
    calcPower,
    detectJong,
    getTenGod
  };
}
