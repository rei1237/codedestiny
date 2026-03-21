/**
 * Ziwei Doushu Engine - saju-engine 호환 출력 스키마 제공
 *
 * 핵심 목표:
 * 1) Solar/KASI 기반으로 음력/간지 산출
 * 2) saju-engine이 기대하는 구조(palacesByIndex, stars, juInfo, daHanList...)를 반환
 * 3) 레거시 호출 방식(calcZiweiPalaces(lunarDate, hour))도 하위 호환
 */

var ZW_ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
var ZW_GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
var ZW_PALACE_ORDER = ['명궁', '형제궁', '부처궁', '자녀궁', '재백궁', '질액궁', '천이궁', '노복궁', '관록궁', '전택궁', '복덕궁', '부모궁'];

var FOURTEEN_STARS = {
  '紫微': { quality: '길함' }, '天機': { quality: '길함' }, '太陽': { quality: '길함' },
  '武曲': { quality: '길함' }, '天同': { quality: '길함' }, '廉貞': { quality: '중등' },
  '天府': { quality: '길함' }, '太陰': { quality: '길함' }, '貪狼': { quality: '중등' },
  '巨門': { quality: '중등' }, '天相': { quality: '길함' }, '天梁': { quality: '길함' },
  '七殺': { quality: '중등' }, '破軍': { quality: '불리' }
};

function getMansionPalace(mansionIdx) {
  if (typeof mansionIdx !== 'number' || mansionIdx < 0 || mansionIdx > 27) return 1;
  var mansionPalaceMap = [1,2,3,4,5,6,7,8,9,10,11,12,1,2,3,4,5,6,7,8,9,10,11,12,1,2,3,4];
  return mansionPalaceMap[mansionIdx] || 1;
}

function _zwNormalizeInput(yearOrLunarDate, monthOrHour, day, hour, minute) {
  if (typeof yearOrLunarDate === 'number') {
    return {
      year: Number(yearOrLunarDate),
      month: Number(monthOrHour),
      day: Number(day || 1),
      hour: Number(hour || 0),
      minute: Number(minute || 0)
    };
  }

  var ld = yearOrLunarDate || {};
  return {
    year: Number(ld.year || new Date().getFullYear()),
    month: Number(ld.month || 1),
    day: Number(ld.day || 1),
    hour: Number(monthOrHour || 0),
    minute: Number(minute || 0)
  };
}

function _zwBuildFallbackResult(input) {
  var stars = {};
  for (var i = 0; i < 12; i++) stars[i] = { main: [], aux: [], bad: [] };

  var palaces = {};
  var palacesByIndex = [];
  for (var p = 0; p < 12; p++) {
    palaces[ZW_PALACE_ORDER[p]] = ZW_ZHI_LIST[p];
    palacesByIndex[p] = ZW_PALACE_ORDER[p];
  }

  return {
    lunarMonth: input.month,
    lunarDay: input.day,
    isLeap: false,
    yearGan: '甲',
    meng: '子',
    shen: '午',
    palaces: palaces,
    gongGan: {},
    palacesByIndex: palacesByIndex,
    stars: stars,
    juInfo: '금4국(金四局)',
    daHan: {},
    daHanList: [],
    sihuaData: {},
    direction: 1,
    ju: 4,
    palaceStarData: [],
    calcMeta: {
      lunarMonth: input.month,
      lunarDay: input.day,
      hourBranch: ZW_ZHI_LIST[0],
      hourIndex: 0,
      lifeFormula: 'fallback',
      bodyFormula: 'fallback'
    }
  };
}

function _zwToSymbol(strength) {
  if (typeof zwStrengthToSymbol === 'function') return zwStrengthToSymbol(strength);
  var m = { '묘': '◎', '왕': '○', '평': '▲', '리': '△', '함': 'X' };
  return m[strength] || '▲';
}

function _zwComputeStrength(starName, gZhi, borrowed, ctx) {
  if (typeof zwComputeStarStrength === 'function') {
    return zwComputeStarStrength(starName, gZhi, borrowed, ctx) || '평';
  }
  return borrowed ? '리' : '평';
}

function _zwParseRows(list, gZhi, borrowedByTag, ctx) {
  return (list || []).map(function(raw) {
    var hasHwaGi = /化忌/.test(raw || '');
    var plain = String(raw || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    var borrowedFlag = borrowedByTag ? /\(차성\)|\b차성\b/.test(plain) : false;
    var starName = plain
      .replace(/\(차성\)/g, '')
      .replace(/化祿|化權|化科|化忌/g, '')
      .replace(/[◎○▲△X]/g, '')
      .trim()
      .split(' ')[0];
    if (!starName) return null;

    var strength = _zwComputeStrength(starName, gZhi, borrowedFlag, ctx);
    if (hasHwaGi && strength === '묘') strength = '왕';
    return {
      name: starName,
      strength: strength,
      symbol: _zwToSymbol(strength),
      borrowed: !!borrowedFlag
    };
  }).filter(function(v) { return !!v; });
}

function calcZiweiPalaces(yearOrLunarDate, monthOrHour, day, hour, minute) {
  var input = _zwNormalizeInput(yearOrLunarDate, monthOrHour, day, hour, minute);

  if (!input.year || !input.month || !input.day) {
    return _zwBuildFallbackResult(input);
  }

  var solar = null;
  var lunar = null;
  try {
    if (typeof Solar !== 'undefined' && Solar && typeof Solar.fromYmdHms === 'function') {
      solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);
      lunar = solar.getLunar();
    }
  } catch (e) {}

  if (!lunar) {
    return _zwBuildFallbackResult(input);
  }

  var baseDate = new Date(input.year, input.month - 1, input.day, input.hour || 0, input.minute || 0, 0);
  var kasiLunar = null;
  try {
    if (typeof KasiEngine !== 'undefined' && KasiEngine && typeof KasiEngine.solarToLunar === 'function') {
      kasiLunar = KasiEngine.solarToLunar(baseDate);
    }
  } catch (e) {}

  var lmonth = (kasiLunar && kasiLunar.month) ? Math.abs(Number(kasiLunar.month)) : Math.abs(lunar.getMonth());
  var lday = (kasiLunar && kasiLunar.day) ? Number(kasiLunar.day) : lunar.getDay();
  var isLeap = (kasiLunar && kasiLunar.isLeap != null)
    ? !!kasiLunar.isLeap
    : (typeof lunar.isLeap === 'function' ? lunar.isLeap() : (lunar.getIsLeap ? lunar.getIsLeap() : false));

  var yearGan = lunar.getYearGan();
  var yearZhi = lunar.getYearZhi();
  try {
    if (typeof KasiEngine !== 'undefined' && KasiEngine && typeof KasiEngine.getGanji === 'function') {
      var kGanji = KasiEngine.getGanji(baseDate);
      if (kGanji && kGanji.secha && String(kGanji.secha).length >= 2) {
        yearGan = String(kGanji.secha).charAt(0) || yearGan;
        yearZhi = String(kGanji.secha).charAt(1) || yearZhi;
      }
    }
  } catch (e) {}

  var hourIdx = (input.hour === 23 || input.hour === 0) ? 0 : Math.floor((input.hour + 1) / 2);
  var hourBranch = ZW_ZHI_LIST[hourIdx];

  var mengBaseIdx = (2 + lmonth - 1) % 12;
  var mengIdx = (mengBaseIdx - hourIdx + 12) % 12;
  var shenIdx = (mengBaseIdx + hourIdx) % 12;

  var palaces = {};
  var palacesByIndex = [];
  for (var i = 0; i < 12; i++) {
    var bIdx = (mengIdx - i + 120) % 12;
    palaces[ZW_PALACE_ORDER[i]] = ZW_ZHI_LIST[bIdx];
    palacesByIndex[bIdx] = ZW_PALACE_ORDER[i];
  }

  var yg = ZW_GAN_LIST.indexOf(yearGan);
  if (yg < 0) yg = 0;
  var inStart = [2, 4, 6, 8, 0][((yg % 5) + 5) % 5];
  var gongGan = {};
  for (var z = 0; z < 12; z++) gongGan[ZW_ZHI_LIST[z]] = ZW_GAN_LIST[(inStart + (z - 2 + 12) % 12) % 10];

  var mgGan = gongGan[ZW_ZHI_LIST[mengIdx]];
  var sMap = { '甲': 1, '乙': 1, '丙': 2, '丁': 2, '戊': 3, '己': 3, '庚': 4, '辛': 4, '壬': 5, '癸': 5 };
  var bMap = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3 };
  var wVal = (sMap[mgGan] || 2) + bMap[mengIdx];
  if (wVal > 5) wVal -= 5;

  var juMap = { 1: 3, 2: 4, 3: 2, 4: 6, 5: 5 };
  var ju = juMap[wVal] || 4;
  var juNames = {
    2: '수2국(水二局)',
    3: '목3국(木三局)',
    4: '금4국(金四局)',
    5: '토5국(土五局)',
    6: '화6국(火六局)'
  };

  var q = Math.floor(lday / ju);
  var r = lday % ju;
  var add = 0;
  if (r !== 0) {
    add = ju - r;
    q = Math.floor((lday + add) / ju);
  }
  var pos = q;
  if (add > 0) pos = (add % 2 === 1) ? (q - add) : (q + add);
  while (pos <= 0) pos += 12;
  while (pos > 12) pos -= 12;

  var zPos = (pos + 1) % 12;
  var fPos = (16 - zPos) % 12;

  var stars = {};
  for (i = 0; i < 12; i++) stars[i] = { main: [], aux: [], bad: [] };

  stars[zPos].main.push('紫微');
  stars[(zPos + 11) % 12].main.push('天機');
  stars[(zPos + 9) % 12].main.push('太陽');
  stars[(zPos + 8) % 12].main.push('武曲');
  stars[(zPos + 7) % 12].main.push('天同');
  stars[(zPos + 4) % 12].main.push('廉貞');

  stars[fPos].main.push('天府');
  stars[(fPos + 1) % 12].main.push('太陰');
  stars[(fPos + 2) % 12].main.push('貪狼');
  stars[(fPos + 3) % 12].main.push('巨門');
  stars[(fPos + 4) % 12].main.push('天相');
  stars[(fPos + 5) % 12].main.push('天梁');
  stars[(fPos + 6) % 12].main.push('七殺');
  stars[(fPos + 10) % 12].main.push('破軍');

  stars[(10 - hourIdx + 12) % 12].aux.push('文昌');
  stars[(4 + hourIdx) % 12].aux.push('文曲');
  stars[(4 + lmonth - 1) % 12].aux.push('左輔');
  stars[(10 - (lmonth - 1) + 12) % 12].aux.push('右弼');

  var yangMap = { '甲': 3, '乙': 4, '丙': 6, '丁': 7, '戊': 6, '己': 7, '庚': 9, '辛': 10, '壬': 0, '癸': 1 };
  var tuoMap = { '甲': 1, '乙': 2, '丙': 4, '丁': 5, '戊': 4, '己': 5, '庚': 7, '辛': 8, '壬': 10, '癸': 11 };
  if (yearGan in yangMap) {
    stars[yangMap[yearGan]].bad.push('擎羊');
    stars[tuoMap[yearGan]].bad.push('陀羅');
  }
  stars[(11 - hourIdx + 12) % 12].bad.push('地空');
  stars[(11 + hourIdx) % 12].bad.push('地劫');

  var maMap = { '申': 2, '子': 2, '辰': 2, '寅': 5, '午': 5, '戌': 5, '亥': 8, '卯': 8, '未': 8, '巳': 11, '酉': 11, '丑': 11 };
  if (maMap[yearZhi] !== undefined) stars[maMap[yearZhi]].aux.push('天馬');

  var luCunMap = { '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5, '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0 };
  var luCunZhi = luCunMap[yearGan];
  if (luCunZhi !== undefined) stars[luCunZhi].aux.push('祿存');

  var sihuaMap = {
    '甲': { '廉貞': '化祿', '破軍': '化權', '武曲': '化科', '太陽': '化忌' },
    '乙': { '天機': '化祿', '天梁': '化權', '紫微': '化科', '太陰': '化忌' },
    '丙': { '天同': '化祿', '天機': '化權', '文昌': '化科', '廉貞': '化忌' },
    '丁': { '太陰': '化祿', '天同': '化權', '天機': '化科', '巨門': '化忌' },
    '戊': { '貪狼': '化祿', '太陰': '化權', '右弼': '化科', '天機': '化忌' },
    '己': { '武曲': '化祿', '貪狼': '化權', '天梁': '化科', '文曲': '化忌' },
    '庚': { '太陽': '化祿', '武曲': '化權', '太陰': '化科', '天同': '化忌' },
    '辛': { '巨門': '化祿', '太陽': '化權', '文曲': '化科', '文昌': '化忌' },
    '壬': { '天梁': '化祿', '紫微': '化權', '左輔': '化科', '武曲': '化忌' },
    '癸': { '破軍': '化祿', '巨門': '化權', '太陰': '化科', '貪狼': '化忌' }
  };

  var curSihua = sihuaMap[yearGan] || null;
  var sihuaData = {};
  if (curSihua) {
    for (var sName in curSihua) {
      for (var si = 0; si < 12; si++) {
        if (stars[si].main.indexOf(sName) >= 0 || stars[si].aux.indexOf(sName) >= 0) {
          sihuaData[sName] = { type: curSihua[sName], palaceIdx: si, palaceName: palacesByIndex[si] || '' };
          break;
        }
      }
    }

    for (i = 0; i < 12; i++) {
      for (var j = 0; j < stars[i].main.length; j++) {
        var sMain = stars[i].main[j];
        if (curSihua[sMain]) stars[i].main[j] = sMain + ' <span style="color:' + (curSihua[sMain] === '化忌' ? '#FF5252' : '#3399FF') + ';font-weight:900;font-size:0.75rem;margin-left:3px;">' + curSihua[sMain] + '</span>';
      }
      for (j = 0; j < stars[i].aux.length; j++) {
        var sAux = stars[i].aux[j];
        if (curSihua[sAux]) stars[i].aux[j] = sAux + ' <span style="color:' + (curSihua[sAux] === '化忌' ? '#FF5252' : '#3399FF') + ';font-weight:900;font-size:0.7rem;margin-left:3px;">' + curSihua[sAux] + '</span>';
      }
    }
  }

  var borrowed = [];
  for (i = 0; i < 12; i++) {
    if (stars[i].main.length === 0) {
      var opp = (i + 6) % 12;
      borrowed[i] = stars[opp].main.map(function(s) {
        return s + '<span style="font-size:0.5rem;opacity:0.6;margin-left:3px;font-weight:600;color:#a1a1aa">(차성)</span>';
      });
    }
  }
  for (i = 0; i < 12; i++) {
    if (borrowed[i]) stars[i].borrowedMain = [].concat(borrowed[i]);
  }

  var isYangYear = ({ '甲': 1, '乙': -1, '丙': 1, '丁': -1, '戊': 1, '己': -1, '庚': 1, '辛': -1, '壬': 1, '癸': -1 }[yearGan] || 1) > 0;
  var isMale = (typeof GENDER !== 'undefined') ? (GENDER === 'M') : true;
  var direction = (isYangYear === isMale) ? 1 : -1;

  var daHan = {};
  var daHanList = [];
  for (var k = 0; k < 12; k++) {
    var currBIdx = (mengIdx + k * direction + 120) % 12;
    var startAge = ju + k * 10;
    var endAge = startAge + 9;
    daHan[currBIdx] = startAge + '~' + endAge;
    daHanList.push({
      order: k,
      idx: currBIdx,
      palaceName: palacesByIndex[currBIdx] || ('제' + (k + 1) + '궁'),
      startAge: startAge,
      endAge: endAge,
      zhi: ZW_ZHI_LIST[currBIdx]
    });
  }

  var palaceStarData = [];
  for (var pi = 0; pi < 12; pi++) {
    var gName = palacesByIndex[pi] || '';
    var gZhi = ZW_ZHI_LIST[pi];
    var mainSource = (stars[pi] && stars[pi].main && stars[pi].main.length) ? stars[pi].main : ((stars[pi] && stars[pi].borrowedMain) || []);

    var ctx = {
      hourIndex: hourIdx,
      lunarMonth: lmonth,
      yearGan: yearGan,
      luCunZhiIdx: (luCunZhi !== undefined ? luCunZhi : -1)
    };

    palaceStarData.push({
      palace: gName,
      branch: gZhi,
      stars: _zwParseRows(mainSource, gZhi, true, ctx),
      auxStars: _zwParseRows((stars[pi] && stars[pi].aux) ? stars[pi].aux : [], gZhi, false, ctx),
      badStars: _zwParseRows((stars[pi] && stars[pi].bad) ? stars[pi].bad : [], gZhi, false, ctx)
    });
  }

  return {
    lunarMonth: lmonth,
    lunarDay: lday,
    isLeap: isLeap,
    yearGan: yearGan,
    meng: ZW_ZHI_LIST[mengIdx],
    shen: ZW_ZHI_LIST[shenIdx],
    palaces: palaces,
    gongGan: gongGan,
    palacesByIndex: palacesByIndex,
    stars: stars,
    juInfo: juNames[ju] || juNames[4],
    daHan: daHan,
    daHanList: daHanList,
    sihuaData: sihuaData,
    direction: direction,
    ju: ju,
    palaceStarData: palaceStarData,
    calcMeta: {
      lunarMonth: lmonth,
      lunarDay: lday,
      hourBranch: hourBranch,
      hourIndex: hourIdx,
      lifeFormula: '명궁 = (寅궁기점 - 시지index) mod 12',
      bodyFormula: '신궁 = (寅궁기점 + 시지index) mod 12'
    }
  };
}

function evalStar(star, palace) {
  var key = (typeof star === 'string') ? star.replace(/<[^>]*>/g, '').trim() : '';
  var info = FOURTEEN_STARS[key] || null;
  if (!info) return { quality: 'neutral', meaning: key || '?', tips: [] };
  var quality = info.quality === '길함' ? 'good' : (info.quality === '불리' ? 'bad' : 'neutral');
  return {
    quality: quality,
    meaning: key,
    tips: ['자미두수 주성의 성향을 함께 해석하세요.']
  };
}

function calcDahuan(lunarDate) {
  if (!lunarDate || !lunarDate.year) return [];
  var out = [];
  for (var i = 1; i <= 10; i++) {
    var age = i * 10;
    out.push({
      age: age,
      startYear: lunarDate.year + age,
      decade: '제' + i + '대한 (만' + age + '~' + (age + 9) + '세)',
      meaning: (age < 30 ? '초년기' : age < 60 ? '중년기' : '노년기') + ' 운세 흐름'
    });
  }
  return out;
}

function buildZiweiChart(opts) {
  if (!opts) return null;
  var ld = opts.lunarDate || { year: opts.year, month: opts.month, day: opts.day };
  var p = calcZiweiPalaces(ld.year, ld.month, ld.day, opts.hour || 0, opts.minute || 0);
  return {
    lunarDate: ld,
    hour: opts.hour || 0,
    minute: opts.minute || 0,
    mingGong: p && p.meng,
    mingXing: p && p.stars ? p.stars : [],
    palaces: p && p.palaces,
    sihua: p && p.sihuaData,
    dahuans: p && p.daHanList ? p.daHanList : calcDahuan(ld),
    timestamp: Date.now()
  };
}

try {
  window.calcZiweiPalaces = calcZiweiPalaces;
  window.evalStar = evalStar;
  window.calcDahuan = calcDahuan;
  window.buildZiweiChart = buildZiweiChart;
  window.getMansionPalace = getMansionPalace;
} catch (e) {}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calcZiweiPalaces: calcZiweiPalaces,
    evalStar: evalStar,
    calcDahuan: calcDahuan,
    buildZiweiChart: buildZiweiChart,
    getMansionPalace: getMansionPalace,
    FOURTEEN_STARS: FOURTEEN_STARS
  };
}
