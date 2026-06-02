/**
 * KASI Calendar Module - 한국 표준 고정밀 음양력 변환
 * KASI(한국천문연구원) 표준 기반
 * 
 * 용도: 생년월일 음양력 변환, 간지 계산, 계절 판정
 * 의존성: lunar-javascript CDN 라이브러리 (Solar, Lunar)
 */

const KASI_LOCAL_PATCH_STORAGE_KEY = 'kasi:local-calendar-patch:v1';
const KASI_LOCAL_PATCH_SEED = {
  solarToLunar: {
    '1997-02-10': { year: 1997, month: 1, day: 3, isLeap: false, source: 'kasi_seed' }
  },
  lunarToSolar: {
    '1997-01-03|0': { year: 1997, month: 2, day: 10, dateStr: '1997-02-10', source: 'kasi_seed' }
  }
};

/**
 * 내부 헬퍼: 숫자를 2자리 문자열로 변환
 */
function _kasiPad2(v) {
  return String(v).padStart(2, '0');
}

/**
 * 내부 헬퍼: 양력 키 생성
 */
function _kasiSolarKey(y, m, d) {
  return String(y) + '-' + _kasiPad2(m) + '-' + _kasiPad2(d);
}

/**
 * 내부 헬퍼: 음력 키 생성
 */
function _kasiLunarKey(y, m, d, isLeap) {
  return String(y) + '-' + _kasiPad2(m) + '-' + _kasiPad2(d) + '|' + (isLeap ? '1' : '0');
}

/**
 * 내부 헬퍼: 깊은 복사 (JSON 기반)
 */
function _clonePlain(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

/**
 * 내부 헬퍼: 로컬 패치 스토어 검증 및 갱신
 */
function _applyKasiSeedGuard(store) {
  if (!store || typeof store !== 'object') return false;
  var changed = false;

  if (!store.solarToLunar || typeof store.solarToLunar !== 'object') {
    store.solarToLunar = {};
    changed = true;
  }
  if (!store.lunarToSolar || typeof store.lunarToSolar !== 'object') {
    store.lunarToSolar = {};
    changed = true;
  }

  var seedSolar = KASI_LOCAL_PATCH_SEED.solarToLunar || {};
  Object.keys(seedSolar).forEach(function(key) {
    var seed = seedSolar[key] || {};
    var cur = store.solarToLunar[key] || {};
    if (
      cur.year !== seed.year ||
      cur.month !== seed.month ||
      cur.day !== seed.day ||
      !!cur.isLeap !== !!seed.isLeap
    ) {
      store.solarToLunar[key] = _clonePlain(seed);
      changed = true;
    }
  });

  var seedLunar = KASI_LOCAL_PATCH_SEED.lunarToSolar || {};
  Object.keys(seedLunar).forEach(function(key) {
    var seed = seedLunar[key] || {};
    var cur = store.lunarToSolar[key] || {};
    if (
      cur.year !== seed.year ||
      cur.month !== seed.month ||
      cur.day !== seed.day
    ) {
      store.lunarToSolar[key] = _clonePlain(seed);
      changed = true;
      return;
    }
    var seedDateStr = seed.dateStr || (String(seed.year) + '-' + _kasiPad2(seed.month) + '-' + _kasiPad2(seed.day));
    var curDateStr = cur.dateStr || (String(cur.year) + '-' + _kasiPad2(cur.month) + '-' + _kasiPad2(cur.day));
    if (curDateStr !== seedDateStr) {
      store.lunarToSolar[key] = _clonePlain(seed);
      changed = true;
    }
  });

  return changed;
}

/**
 * 로컬 패치 스토어 로드 (localStorage → 메모리)
 */
function _loadKasiLocalPatchStore() {
  var base = _clonePlain(KASI_LOCAL_PATCH_SEED);
  try {
    var raw = localStorage.getItem(KASI_LOCAL_PATCH_STORAGE_KEY);
    if (!raw) return base;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return base;
    base.solarToLunar = Object.assign({}, parsed.solarToLunar || {}, base.solarToLunar || {});
    base.lunarToSolar = Object.assign({}, parsed.lunarToSolar || {}, base.lunarToSolar || {});
    if (_applyKasiSeedGuard(base)) {
      _saveKasiLocalPatchStore(base);
    }
    return base;
  } catch (e) {
    return base;
  }
}

/**
 * 로컬 패치 스토어 저장 (메모리 → localStorage)
 */
function _saveKasiLocalPatchStore(store) {
  try {
    localStorage.setItem(KASI_LOCAL_PATCH_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {}
}

// 초기 로드
var _kasiLocalPatchStore = _loadKasiLocalPatchStore();

/**
 * 양력 → 음력 로컬 패치 조회
 */
function _getPatchedSolarToLunar(y, m, d) {
  var key = _kasiSolarKey(y, m, d);
  var row = _kasiLocalPatchStore && _kasiLocalPatchStore.solarToLunar ? _kasiLocalPatchStore.solarToLunar[key] : null;
  if (!row || !row.year || !row.month || !row.day) return null;
  return {
    year: row.year,
    month: row.month,
    day: row.day,
    isLeap: !!row.isLeap,
    source: row.source || 'local_patch'
  };
}

/**
 * 음력 → 양력 로컬 패치 조회
 */
function _getPatchedLunarToSolar(year, month, day, isLeap) {
  var key = _kasiLunarKey(year, month, day, !!isLeap);
  var row = _kasiLocalPatchStore && _kasiLocalPatchStore.lunarToSolar ? _kasiLocalPatchStore.lunarToSolar[key] : null;
  if (!row || !row.year || !row.month || !row.day) return null;
  return {
    year: row.year,
    month: row.month,
    day: row.day,
    dateStr: row.dateStr || (String(row.year) + '-' + _kasiPad2(row.month) + '-' + _kasiPad2(row.day)),
    source: row.source || 'local_patch'
  };
}

/**
 * 캘린더 기준일 등록 (로컬 패치 추가 및 저장)
 */
function rememberKasiCalendarReference(reference) {
  if (!reference || !reference.solar || !reference.lunar) return false;
  var sy = parseInt(reference.solar.year, 10);
  var sm = parseInt(reference.solar.month, 10);
  var sd = parseInt(reference.solar.day, 10);
  var ly = parseInt(reference.lunar.year, 10);
  var lm = parseInt(reference.lunar.month, 10);
  var ld = parseInt(reference.lunar.day, 10);
  var leap = !!reference.lunar.isLeap;
  if (!sy || !sm || !sd || !ly || !lm || !ld) return false;

  if (!_kasiLocalPatchStore || typeof _kasiLocalPatchStore !== 'object') {
    _kasiLocalPatchStore = _clonePlain(KASI_LOCAL_PATCH_SEED);
  }
  if (!_kasiLocalPatchStore.solarToLunar) _kasiLocalPatchStore.solarToLunar = {};
  if (!_kasiLocalPatchStore.lunarToSolar) _kasiLocalPatchStore.lunarToSolar = {};

  var source = reference.source || 'kasi_sync';
  _kasiLocalPatchStore.solarToLunar[_kasiSolarKey(sy, sm, sd)] = {
    year: ly,
    month: lm,
    day: ld,
    isLeap: leap,
    source: source
  };
  _kasiLocalPatchStore.lunarToSolar[_kasiLunarKey(ly, lm, ld, leap)] = {
    year: sy,
    month: sm,
    day: sd,
    dateStr: String(sy) + '-' + _kasiPad2(sm) + '-' + _kasiPad2(sd),
    source: source
  };

  _applyKasiSeedGuard(_kasiLocalPatchStore);
  _saveKasiLocalPatchStore(_kasiLocalPatchStore);
  return true;
}

/**
 * KasiEngine - 공개 API 인터페이스
 */
const KasiEngine = {
  /**
   * 양력 Date 객체를 음력으로 변환
   */
  solarToLunar: function(date) {
    if (!date) return null;
    let tDate = new Date(date.getTime());
    if (tDate.getHours() >= 23) {
      tDate.setDate(tDate.getDate() + 1); // 명리학 자시 경계일 보정
    }
    var y = tDate.getFullYear(), m = tDate.getMonth() + 1, d = tDate.getDate();
    var patched = _getPatchedSolarToLunar(y, m, d);
    if (patched) return patched;
    
    // lunar-javascript 라이브러리 의존
    if (typeof Solar === 'undefined' || typeof Solar.fromYmdHms === 'undefined') {
      return null;
    }
    var h = tDate.getHours(), min = tDate.getMinutes(), s = tDate.getSeconds();
    var solar = Solar.fromYmdHms(y, m, d, h, min, s);
    var lunar = solar.getLunar();
    return {
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()),
      day: lunar.getDay(),
      isLeap: lunar.getMonth() < 0
    };
  },

  /**
   * 음력(year, month, day, isLeap)을 양력으로 변환
   */
  lunarToSolar: function(year, month, day, isLeap) {
    var patched = _getPatchedLunarToSolar(year, month, day, !!isLeap);
    if (patched) return patched;
    
    if (typeof Lunar === 'undefined' || typeof Lunar.fromYmd === 'undefined') {
      return null;
    }
    var m = isLeap ? -Math.abs(month) : Math.abs(month);
    var lunar = Lunar.fromYmd(year, m, day);
    if (isLeap && (!lunar || Math.abs(lunar.getMonth()) !== Math.abs(month))) {
      lunar = Lunar.fromYmd(year, Math.abs(month), day);
    }
    var solar = lunar.getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
      dateStr: solar.getYear() + '-' + String(solar.getMonth()).padStart(2, '0') + '-' + String(solar.getDay()).padStart(2, '0')
    };
  },

  /**
   * 캘린더 기준일 등록
   */
  registerCalendarReference: function(reference) {
    return rememberKasiCalendarReference(reference);
  },

  /**
   * 주어진 날짜의 간지 계산
   */
  getGanji: function(date, options) {
    options = options || { yaja: true, leapMonthOption: 'prev' };
    if (!date) return null;
    if (typeof window !== 'undefined' && window.KasiCalendarService && typeof window.KasiCalendarService.computeGanjiFromDate === 'function') {
      var computed = window.KasiCalendarService.computeGanjiFromDate(date);
      if (computed && computed.year && computed.month && computed.day) {
        return {
          secha: computed.year,
          weolgeon: computed.month,
          iljin: computed.day,
          sigan: computed.hour || null,
          source: computed.source || 'validated-cache'
        };
      }
    }
    
    if (typeof Solar === 'undefined' || typeof Solar.fromYmdHms === 'undefined') {
      return null;
    }
    
    var tDate = new Date(date.getTime());
    var h = tDate.getHours();
    var min = tDate.getMinutes();

    if (h === 23 && min >= 30) {
      if (options.yaja) {
        tDate.setDate(tDate.getDate() + 1);
      }
    } else if (h === 23 && options.yaja) {
      tDate.setDate(tDate.getDate() + 1);
    }

    var solar = Solar.fromYmdHms(tDate.getFullYear(), tDate.getMonth() + 1, tDate.getDate(), tDate.getHours(), tDate.getMinutes(), tDate.getSeconds());
    var lunar = solar.getLunar();
    var baZi = lunar.getEightChar();
    
    let secha = baZi.getYear();
    let weolgeon = baZi.getMonth();
    let iljin = baZi.getDay();

    if (lunar.getMonth() < 0 && options.leapMonthOption === 'next') {
      let nextLunar = Lunar.fromYmd(lunar.getYear(), Math.abs(lunar.getMonth()) + 1, lunar.getDay());
      if(nextLunar) {
        weolgeon = nextLunar.getEightChar().getMonth();
      }
    }
    return { secha: secha, weolgeon: weolgeon, iljin: iljin };
  }
};

// 전역 등록
try {
  window.KasiEngine = KasiEngine;
} catch (e) {}

// 모듈 내보내기 (필요시)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    KasiEngine,
    rememberKasiCalendarReference,
    KASI_LOCAL_PATCH_STORAGE_KEY
  };
}
