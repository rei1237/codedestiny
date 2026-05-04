/* 사주 엔진 코어 (1/4). 이어서: js/saju-engine-tarot-sukuyo-quantum.js → js/core/saju/reportDashboard.js → js/saju-engine-continuation.js */
/* ═══════════════════════════════════════
   STEP 1: CDN 폴백 라이브러리 로딩
═══════════════════════════════════════ */
var CDN_URLS=[
  'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js',
  'https://unpkg.com/lunar-javascript@latest/lunar.js',
  'https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js',
  'https://unpkg.com/lunar-javascript/lunar.js',
  'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.min.js',
  'https://unpkg.com/lunar-javascript@latest/lunar.min.js'
];
var tried=0;
var __libReady = false;
var __libLoading = false;
var __pendingAutoCalculation = false;
var __pendingAutoBirthSnapshot = null;

function _captureBirthFormSnapshot() {
  try {
    var dateEl = document.getElementById('birthDate');
    var hourEl = document.getElementById('birthHour');
    var minuteEl = document.getElementById('birthMinute');
    var countryEl = document.getElementById('birthCountry');
    var calType = 'solar';
    var calTypeBtns = document.getElementsByName('calType');
    for (var i = 0; i < calTypeBtns.length; i++) {
      if (calTypeBtns[i].checked) {
        calType = calTypeBtns[i].value;
        break;
      }
    }

    var hourVal = hourEl ? String(hourEl.value || '').trim() : '';
    var minuteVal = minuteEl ? String(minuteEl.value || '').trim() : '';
    var profileBirth = null;
    try {
      profileBirth = window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth;
    } catch (_) {}
    if (hourVal === '' && profileBirth && profileBirth.hour != null) hourVal = String(profileBirth.hour);
    if (minuteVal === '' && profileBirth && profileBirth.minute != null) minuteVal = String(profileBirth.minute);

    return {
      birthDate: dateEl ? String(dateEl.value || '') : '',
      birthHour: hourVal,
      birthMinute: minuteVal,
      birthCountry: countryEl ? String(countryEl.value || '') : '',
      calType: calType
    };
  } catch (_) {
    return null;
  }
}

function _applyBirthFormSnapshot(snapshot) {
  if (!snapshot) return;
  try {
    var dateEl = document.getElementById('birthDate');
    var hourEl = document.getElementById('birthHour');
    var minuteEl = document.getElementById('birthMinute');
    var countryEl = document.getElementById('birthCountry');
    if (dateEl && snapshot.birthDate) dateEl.value = snapshot.birthDate;
    if (hourEl && snapshot.birthHour !== '') hourEl.value = snapshot.birthHour;
    if (minuteEl && snapshot.birthMinute !== '') minuteEl.value = snapshot.birthMinute;
    if (countryEl && snapshot.birthCountry) countryEl.value = snapshot.birthCountry;

    if (snapshot.calType) {
      var calTypeBtns = document.getElementsByName('calType');
      for (var i = 0; i < calTypeBtns.length; i++) {
        calTypeBtns[i].checked = (calTypeBtns[i].value === snapshot.calType);
      }
    }
  } catch (_) {}
}

function _setRunButtonToRetry() {
  var btnEl = document.getElementById('run-btn');
  if (!btnEl) return;
  btnEl.disabled = false;
  btnEl.textContent = '🔄 라이브러리 다시 시도';
  btnEl.onclick = function() {
    retrySajuLibraryLoad();
  };
}

window.retrySajuLibraryLoad = function() {
  if (__libLoading) return;
  tried = 0;
  __libReady = false;
  __libLoading = true;

  var btnEl = document.getElementById('run-btn');
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '🔄 라이브러리 재시도 중...';
  }

  loadNext();
};

function _hideLibOverlay() {
  var ov = document.getElementById('lib-overlay');
  if (!ov) return;
  ov.style.display = 'none';
  ov.classList.add('done');
  if (ov.parentNode) {
    ov.parentNode.removeChild(ov);
  }
}

/**
 * [Backend Engine] 한국 표준 고정밀 음양력 변환 성궁 진법
 * KASI(한국천문연구원) 표준 음양력 변환 데이터 및 1분 1초 24절기 오차 보정 반영
 */
var KASI_LOCAL_PATCH_STORAGE_KEY = 'kasi:local-calendar-patch:v1';
var KASI_LOCAL_PATCH_SEED = {
  solarToLunar: {
    '1997-02-10': { year: 1997, month: 1, day: 3, isLeap: false, source: 'kasi_seed' }
  },
  lunarToSolar: {
    '1997-01-03|0': { year: 1997, month: 2, day: 10, dateStr: '1997-02-10', source: 'kasi_seed' }
  }
};

function _kasiPad2(v) {
  return String(v).padStart(2, '0');
}

function _kasiSolarKey(y, m, d) {
  return String(y) + '-' + _kasiPad2(m) + '-' + _kasiPad2(d);
}

function _kasiLunarKey(y, m, d, isLeap) {
  return String(y) + '-' + _kasiPad2(m) + '-' + _kasiPad2(d) + '|' + (isLeap ? '1' : '0');
}

function _clonePlain(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

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

function _saveKasiLocalPatchStore(store) {
  try {
    localStorage.setItem(KASI_LOCAL_PATCH_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {}
}

var _kasiLocalPatchStore = _loadKasiLocalPatchStore();

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

function _getPatchedLunarToSolar(year, month, day, isLeap) {
  var key = _kasiLunarKey(year, month, day, isLeap);
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

const KasiEngine = {
    solarToLunar: function(date) {
        if (!date) return null;
        let tDate = new Date(date.getTime());
        if (tDate.getHours() >= 23) {
            tDate.setDate(tDate.getDate() + 1); // 명리학 자시 경계일 보정
        }
        var y = tDate.getFullYear(), m = tDate.getMonth() + 1, d = tDate.getDate();
        var patched = _getPatchedSolarToLunar(y, m, d);
        if (patched) return patched;
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
    lunarToSolar: function(year, month, day, isLeap) {
      var patched = _getPatchedLunarToSolar(year, month, day, !!isLeap);
      if (patched) return patched;
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
        registerCalendarReference: function(reference) {
          return rememberKasiCalendarReference(reference);
        },
    getGanji: function(date, options = { yaja: true, leapMonthOption: 'prev' }) {
        if (!date) return null;
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

    try { window.KasiEngine = KasiEngine; } catch (e) {}

function getActualSolarDate(dateStr, typeStr) {
    if(!dateStr) return null;
    var parts = dateStr.split('-').map(Number);
    if(parts.length < 3) return null;
    var y = parts[0], m = parts[1], d = parts[2];
    if(typeStr === 'solar') return { y: y, m: m, d: d, dateStr: dateStr };
    try {
        var isLeap = (typeStr === 'lunar_leap');
        var converted = KasiEngine.lunarToSolar(y, m, d, isLeap);
        return { y: converted.year, m: converted.month, d: converted.day, dateStr: converted.dateStr };
    } catch(e) { console.error(e); return null; }
}

var KASI_GAN_MAP = {
  '甲':'甲','乙':'乙','丙':'丙','丁':'丁','戊':'戊','己':'己','庚':'庚','辛':'辛','壬':'壬','癸':'癸',
  '갑':'甲','을':'乙','병':'丙','정':'丁','무':'戊','기':'己','경':'庚','신':'辛','임':'壬','계':'癸'
};
var KASI_JI_MAP = {
  '子':'子','丑':'丑','寅':'寅','卯':'卯','辰':'辰','巳':'巳','午':'午','未':'未','申':'申','酉':'酉','戌':'戌','亥':'亥',
  '자':'子','축':'丑','인':'寅','묘':'卯','진':'辰','사':'巳','오':'午','미':'未','신':'申','유':'酉','술':'戌','해':'亥'
};

function parseKasiGanjiPair(raw) {
  if (!raw) return null;
  var s = String(raw).replace(/\s+/g, '').trim();
  if (!s) return null;

  var g = null;
  var j = null;
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if (!g && KASI_GAN_MAP[ch]) {
      g = KASI_GAN_MAP[ch];
      continue;
    }
    if (!j && KASI_JI_MAP[ch]) {
      j = KASI_JI_MAP[ch];
      continue;
    }
    if (g && j) break;
  }
  if (!g || !j) return null;
  return { g: g, j: j };
}

async function resolveKasiDateContextSafe(input, options) {
  if (!window.KasiCalendarService || typeof window.KasiCalendarService.resolveDateContext !== 'function') return null;
  try {
    return await window.KasiCalendarService.resolveDateContext(input, options || {});
  } catch (e) {
    console.warn('[KASI] resolveDateContext failed:', e);
    return null;
  }
}

function normalizeCalendarTypeInput(typeVal) {
  var t = String(typeVal || '').trim().toLowerCase();
  if (t === 'lunar' || t === '음력') return 'lunar';
  if (t === 'lunar_leap' || t === '윤달' || t === '음력윤달' || t === 'leap') return 'lunar_leap';
  return 'solar';
}

function buildFallbackDateContext(input, reason) {
  try {
    var calType = normalizeCalendarTypeInput(input.calendarType || input.calType || 'solar');
    var year = parseInt(input.year, 10);
    var month = parseInt(input.month, 10);
    var day = parseInt(input.day, 10);
    var hour = parseInt(input.hour, 10);
    var minute = parseInt(input.minute, 10);
    var second = parseInt(input.second, 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    if (isNaN(hour)) hour = 12;
    if (isNaN(minute)) minute = 0;
    if (isNaN(second)) second = 0;

    var solarDate = null;
    var lunarObj = null;
    var hasSolarLib = (typeof Solar !== 'undefined' && typeof Solar.fromYmdHms === 'function');
    var hasLunarLib = (typeof Lunar !== 'undefined' && typeof Lunar.fromYmd === 'function');
    var canUseEngine = (typeof KasiEngine !== 'undefined');

    function isValidLunar(obj) {
      return !!(obj && obj.year && obj.month && obj.day);
    }

    function safeSolarToLunar(dateObj) {
      if (!dateObj || isNaN(dateObj.getTime())) return null;
      try {
        if (canUseEngine && typeof KasiEngine.solarToLunar === 'function') {
          var byEngine = KasiEngine.solarToLunar(dateObj);
          if (isValidLunar(byEngine)) return byEngine;
        }
      } catch (_e0) {}
      try {
        if (hasSolarLib) {
          var s = Solar.fromYmdHms(
            dateObj.getFullYear(),
            dateObj.getMonth() + 1,
            dateObj.getDate(),
            dateObj.getHours(),
            dateObj.getMinutes(),
            dateObj.getSeconds()
          );
          var l = s && s.getLunar ? s.getLunar() : null;
          if (l && typeof l.getYear === 'function') {
            return {
              year: l.getYear(),
              month: Math.abs(l.getMonth()),
              day: l.getDay(),
              isLeap: l.getMonth() < 0
            };
          }
        }
      } catch (_e1) {}
      return null;
    }

    function safeLunarToSolar(y, mo, da, isLeap) {
      try {
        if (canUseEngine && typeof KasiEngine.lunarToSolar === 'function') {
          var conv = KasiEngine.lunarToSolar(y, mo, da, isLeap);
          if (conv && conv.year && conv.month && conv.day) return conv;
        }
      } catch (_e2) {}
      try {
        if (hasLunarLib) {
          var lm = isLeap ? -Math.abs(mo) : Math.abs(mo);
          var lobj = Lunar.fromYmd(y, lm, da);
          if (!lobj && isLeap) {
            lobj = Lunar.fromYmd(y, Math.abs(mo), da);
          }
          var sobj = lobj && lobj.getSolar ? lobj.getSolar() : null;
          if (sobj && typeof sobj.getYear === 'function') {
            return {
              year: sobj.getYear(),
              month: sobj.getMonth(),
              day: sobj.getDay(),
              dateStr: sobj.getYear() + '-' + String(sobj.getMonth()).padStart(2, '0') + '-' + String(sobj.getDay()).padStart(2, '0')
            };
          }
        }
      } catch (_e3) {}
      return null;
    }

    if (calType === 'solar') {
      solarDate = new Date(year, month - 1, day, hour, minute, second);
      lunarObj = safeSolarToLunar(solarDate);
    } else {
      var conv = safeLunarToSolar(year, month, day, calType === 'lunar_leap');
      if (!conv) return null;
      solarDate = new Date(conv.year, conv.month - 1, conv.day, hour, minute, second);
      lunarObj = {
        year: year,
        month: month,
        day: day,
        isLeap: calType === 'lunar_leap'
      };
    }
    if (!solarDate || isNaN(solarDate.getTime())) return null;
    if (!isValidLunar(lunarObj)) {
      lunarObj = safeSolarToLunar(solarDate);
    }
    if (!isValidLunar(lunarObj)) return null;

    var gj = null;
    try {
      if (canUseEngine && typeof KasiEngine.getGanji === 'function') {
        gj = KasiEngine.getGanji(solarDate);
      }
    } catch (_e) {}
    if (!gj || !gj.secha || !gj.weolgeon || !gj.iljin) {
      try {
        if (hasSolarLib) {
          var _solar = Solar.fromYmdHms(
            solarDate.getFullYear(),
            solarDate.getMonth() + 1,
            solarDate.getDate(),
            solarDate.getHours(),
            solarDate.getMinutes(),
            solarDate.getSeconds()
          );
          var _lunar = _solar && _solar.getLunar ? _solar.getLunar() : null;
          var _bazi = _lunar && _lunar.getEightChar ? _lunar.getEightChar() : null;
          if (_bazi) {
            gj = { secha: _bazi.getYear(), weolgeon: _bazi.getMonth(), iljin: _bazi.getDay() };
          }
        }
      } catch (_e4) {}
    }

    return {
      source: 'fallback',
      input: {
        calendarType: calType,
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        second: second,
        latitude: input.latitude,
        longitude: input.longitude,
        tzOffsetHours: input.tzOffsetHours
      },
      solar: {
        year: solarDate.getFullYear(),
        month: solarDate.getMonth() + 1,
        day: solarDate.getDate(),
        hour: solarDate.getHours(),
        minute: solarDate.getMinutes(),
        second: solarDate.getSeconds()
      },
      lunar: {
        year: lunarObj && lunarObj.year,
        month: lunarObj && lunarObj.month,
        day: lunarObj && lunarObj.day,
        isLeap: !!(lunarObj && lunarObj.isLeap)
      },
      ganji: {
        year: gj && gj.secha,
        month: gj && gj.weolgeon,
        day: gj && gj.iljin
      },
      meta: {
        fallbackUsed: true,
        diagnostics: [reason || 'local fallback used']
      }
    };
  } catch (e) {
    console.warn('[KASI] buildFallbackDateContext failed:', e);
    return null;
  }
}

async function resolvePrimaryCalendarContext(input, options) {
  options = options || {};
  var norm = Object.assign({}, input || {});
  norm.calendarType = normalizeCalendarTypeInput(norm.calendarType || norm.calType || 'solar');

  var hasCompleteCalendar = function(ctx) {
    return !!(ctx && ctx.solar && ctx.lunar && ctx.solar.year && ctx.solar.month && ctx.solar.day && ctx.lunar.year && ctx.lunar.month && ctx.lunar.day);
  };

  var localOnly = (options.localOnly === true);
  var localCtx = buildFallbackDateContext(norm, localOnly ? 'local-only mode' : 'kasi fallback');

  if (localOnly && hasCompleteCalendar(localCtx)) {
    return localCtx;
  }

  var ctx = await resolveKasiDateContextSafe(norm, options || {});
  var isValid = hasCompleteCalendar(ctx);
  if (isValid) {
    try {
      if (KasiEngine && typeof KasiEngine.registerCalendarReference === 'function') {
        KasiEngine.registerCalendarReference({
          solar: {
            year: ctx.solar.year,
            month: ctx.solar.month,
            day: ctx.solar.day
          },
          lunar: {
            year: ctx.lunar.year,
            month: ctx.lunar.month,
            day: ctx.lunar.day,
            isLeap: !!ctx.lunar.isLeap
          },
          source: 'kasi_primary'
        });
      }
    } catch (e) {
      console.warn('[KASI] local engine sync failed:', e && e.message ? e.message : e);
    }
    return ctx;
  }

  if (hasCompleteCalendar(localCtx)) {
    try {
      if (ctx && ctx.meta && Array.isArray(ctx.meta.diagnostics)) {
        localCtx.meta = localCtx.meta || {};
        localCtx.meta.diagnostics = (localCtx.meta.diagnostics || []).concat(['kasi-invalid-fallback']);
      }
    } catch (_e5) {}
    return localCtx;
  }

  var fallbackReason = ctx ? 'kasi response invalid' : 'kasi unavailable';
  var fallback = buildFallbackDateContext(norm, fallbackReason);
  if (fallback) return fallback;
  return ctx;
}

async function getActualSolarDateWithContext(dateStr, typeStr, options) {
  if (!dateStr) return null;
  var parts = String(dateStr).split('-').map(function(v) { return parseInt(v, 10); });
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
  var opts = options || {};
  var ctx = await resolvePrimaryCalendarContext({
    calendarType: normalizeCalendarTypeInput(typeStr || 'solar'),
    year: parts[0],
    month: parts[1],
    day: parts[2],
    hour: (opts.hour != null ? opts.hour : 12),
    minute: (opts.minute != null ? opts.minute : 0),
    second: (opts.second != null ? opts.second : 0),
    latitude: (opts.latitude != null ? opts.latitude : 37.5665),
    longitude: (opts.longitude != null ? opts.longitude : 126.9780),
    tzOffsetHours: (opts.tzOffsetHours != null ? opts.tzOffsetHours : 9)
  }, { setCurrent: opts.setCurrent !== false });

  if (ctx && ctx.solar && ctx.solar.year && ctx.solar.month && ctx.solar.day) {
    return {
      y: ctx.solar.year,
      m: ctx.solar.month,
      d: ctx.solar.day,
      dateStr: String(ctx.solar.year) + '-' + String(ctx.solar.month).padStart(2, '0') + '-' + String(ctx.solar.day).padStart(2, '0'),
      context: ctx,
      source: ctx.source || 'kasi'
    };
  }

  return getActualSolarDate(dateStr, normalizeCalendarTypeInput(typeStr || 'solar'));
}

function _zwCompatPalSnapshotLite(zwData, palaceName) {
  if (!zwData || !zwData.palacesByIndex || !zwData.stars) {
    return { main: [], aux: [], bad: [] };
  }
  var idx = zwData.palacesByIndex.indexOf(palaceName);
  if (idx < 0 && palaceName === '부처궁') idx = zwData.palacesByIndex.indexOf('부부궁');
  if (idx < 0 && palaceName === '부부궁') idx = zwData.palacesByIndex.indexOf('부처궁');
  if (idx < 0) return { main: [], aux: [], bad: [] };

  var st = zwData.stars[idx] || { main: [], aux: [], bad: [], borrowedMain: [] };
  var normalize = function(arr) {
    return (arr || []).map(function(v) {
      return String(v || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/화록|화권|화과|화기|\(차성\)/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')[0];
    }).filter(Boolean);
  };

  var main = normalize((st.main && st.main.length) ? st.main : (st.borrowedMain || []));
  return {
    main: main,
    aux: normalize(st.aux || []),
    bad: normalize(st.bad || [])
  };
}

var __compatLiteMemo = new Map();
var __compatLiteMemoMax = 120;

function _compatLiteBirthKey(birth) {
  if (!birth) return 'none';
  return [
    birth.year || 0,
    birth.month || 0,
    birth.day || 0,
    birth.hour || 0,
    birth.minute || 0,
    birth.lat || 0,
    birth.lon || 0,
    birth.tz || 0
  ].join('|');
}

function _compatLiteGet(key) {
  if (!__compatLiteMemo.has(key)) return null;
  var cached = __compatLiteMemo.get(key);
  __compatLiteMemo.delete(key);
  __compatLiteMemo.set(key, cached);
  return cached;
}

function _compatLiteSet(key, value) {
  __compatLiteMemo.set(key, value);
  if (__compatLiteMemo.size > __compatLiteMemoMax) {
    var oldestKey = __compatLiteMemo.keys().next().value;
    __compatLiteMemo.delete(oldestKey);
  }
  return value;
}

function resetCompatLiteMemo() {
  __compatLiteMemo.clear();
}

window.resetCompatLiteMemo = resetCompatLiteMemo;

function computeZiweiCompatLite(meBirth, partnerBirth) {
  try {
    if (!meBirth || !partnerBirth) return { score: 50, source: 'none' };

    var ziweiKey = [
      'ziwei-lite',
      _compatLiteBirthKey(meBirth),
      _compatLiteBirthKey(partnerBirth)
    ].join('::');
    var ziweiCached = _compatLiteGet(ziweiKey);
    if (ziweiCached) return ziweiCached;

    var meData = window._currentZiweiData || calcZiweiPalaces(meBirth.year, meBirth.month, meBirth.day, meBirth.hour, meBirth.minute);
    var youData = calcZiweiPalaces(partnerBirth.year, partnerBirth.month, partnerBirth.day, partnerBirth.hour, partnerBirth.minute);

    var mePal = {
      meng: _zwCompatPalSnapshotLite(meData, '명궁'),
      spouse: _zwCompatPalSnapshotLite(meData, '부처궁'),
      bok: _zwCompatPalSnapshotLite(meData, '복덕궁'),
      wealth: _zwCompatPalSnapshotLite(meData, '재백궁'),
      job: _zwCompatPalSnapshotLite(meData, '관록궁')
    };
    var youPal = {
      meng: _zwCompatPalSnapshotLite(youData, '명궁'),
      spouse: _zwCompatPalSnapshotLite(youData, '부처궁'),
      bok: _zwCompatPalSnapshotLite(youData, '복덕궁'),
      wealth: _zwCompatPalSnapshotLite(youData, '재백궁'),
      job: _zwCompatPalSnapshotLite(youData, '관록궁')
    };

    var intersect = function(a, b) {
      var m = Object.create(null);
      (a || []).forEach(function(v) { m[v] = 1; });
      var c = 0;
      (b || []).forEach(function(v) { if (m[v]) c += 1; });
      return c;
    };

    var pairScore = function(a, b, base, mw, aw, bw) {
      var mainMatch = intersect(a.main, b.main);
      var auxMatch = intersect(a.aux, b.aux);
      var badMix = (a.bad.length + b.bad.length);
      var s = base + mainMatch * mw + auxMatch * aw - badMix * bw;
      return Math.max(20, Math.min(96, Math.round(s)));
    };

    var love = pairScore(mePal.spouse, youPal.spouse, 52, 12, 4, 2.2);
    var marriage = pairScore(mePal.bok, youPal.bok, 50, 10, 4, 1.8);
    var work = pairScore(mePal.job, youPal.job, 49, 11, 4, 2.1);
    var money = pairScore(mePal.wealth, youPal.wealth, 50, 11, 4, 2.0);
    var persona = pairScore(mePal.meng, youPal.meng, 50, 10, 4, 1.9);

    var finalScore = Math.round((love * 0.30) + (marriage * 0.20) + (work * 0.20) + (money * 0.15) + (persona * 0.15));
    return _compatLiteSet(ziweiKey, { score: Math.max(20, Math.min(96, finalScore)), source: 'ziwei-lite' });
  } catch (e) {
    console.warn('[ZiweiLiteCompat] failed:', e);
    return { score: 50, source: 'fallback' };
  }
}

function computeAstroCompatLite(meBirth, partnerBirth) {
  try {
    if (!meBirth || !partnerBirth || typeof AstroEngine === 'undefined' || typeof AstroEngine.calcAll !== 'function') {
      return { score: 50, source: 'none' };
    }

    var hs = (window.ASTRO_HOUSE_SYSTEM || 'P');
    var astroKey = [
      'astro-lite',
      hs,
      _compatLiteBirthKey(meBirth),
      _compatLiteBirthKey(partnerBirth)
    ].join('::');
    var astroCached = _compatLiteGet(astroKey);
    if (astroCached) return astroCached;

    var meLocalHour = (meBirth.hour || 0) + ((meBirth.minute || 0) / 60);
    var youLocalHour = (partnerBirth.hour || 0) + ((partnerBirth.minute || 0) / 60);
    var meChart = AstroEngine.calcAll(meBirth.year, meBirth.month, meBirth.day, meLocalHour, meBirth.lat || 37.5665, meBirth.lon || 126.9780, meBirth.tz || 9, { houseSystem: hs });
    var youChart = AstroEngine.calcAll(partnerBirth.year, partnerBirth.month, partnerBirth.day, youLocalHour, partnerBirth.lat || 37.5665, partnerBirth.lon || 126.9780, partnerBirth.tz || 9, { houseSystem: hs });

    var signIdx = function(chartObj, key) {
      if (key === 'Sun') return (chartObj.sun && chartObj.sun.idx != null) ? chartObj.sun.idx : null;
      if (key === 'Moon') return (chartObj.moon && chartObj.moon.idx != null) ? chartObj.moon.idx : null;
      return (chartObj.planets && chartObj.planets[key] && chartObj.planets[key].sign && chartObj.planets[key].sign.idx != null)
        ? chartObj.planets[key].sign.idx : null;
    };
    var pairRelScore = function(a, b) {
      if (a == null || b == null) return 0;
      var d = Math.abs(a - b);
      if (d > 6) d = 12 - d;
      if (d === 0) return 11;
      if (d === 2 || d === 4) return 9;
      if (d === 1 || d === 5) return 5;
      if (d === 3) return -4;
      if (d === 6) return -6;
      return 0;
    };

    var meSun = signIdx(meChart, 'Sun');
    var meMoon = signIdx(meChart, 'Moon');
    var meVenus = signIdx(meChart, 'Venus');
    var meMars = signIdx(meChart, 'Mars');
    var youSun = signIdx(youChart, 'Sun');
    var youMoon = signIdx(youChart, 'Moon');
    var youVenus = signIdx(youChart, 'Venus');
    var youMars = signIdx(youChart, 'Mars');

    var raw = 50;
    raw += pairRelScore(meSun, youSun) * 1.1;
    raw += pairRelScore(meMoon, youMoon) * 1.35;
    raw += pairRelScore(meVenus, youMars) * 1.4;
    raw += pairRelScore(meMars, youVenus) * 1.3;
    raw += pairRelScore(meMoon, youSun) * 0.9;
    raw += pairRelScore(meSun, youMoon) * 0.9;

    var score = Math.max(20, Math.min(96, Math.round(raw)));
    return _compatLiteSet(astroKey, { score: score, source: 'astro-lite' });
  } catch (e) {
    console.warn('[AstroLiteCompat] failed:', e);
    return { score: 50, source: 'fallback' };
  }
}

var _lunarPreviewRequestSeq = 0;
window.updateLunarPreview = function(dateId, radioName, previewId) {
    var dateEl = document.getElementById(dateId);
    var pEl = document.getElementById(previewId);
    if(!dateEl || !pEl) return;

    var dVal = dateEl.value;
    var rBtns = document.getElementsByName(radioName);
    var typeVal = 'solar';
    for(var i=0; i<rBtns.length; i++) { if(rBtns[i].checked) { typeVal = rBtns[i].value; break; } }
    if(!dVal || typeVal === 'solar') { pEl.classList.remove('form-lunar-preview--active'); pEl.style.display = 'none'; return; }

    var reqSeq = ++_lunarPreviewRequestSeq;
    pEl.classList.add('form-lunar-preview--active');
    pEl.style.display = 'block';
    pEl.innerHTML = '<span class="input-section-skeleton input-section-skeleton--lunar" aria-hidden="true"></span>';

    getActualSolarDateWithContext(dVal, typeVal, { setCurrent: false }).then(function(actualDates) {
      if (reqSeq !== _lunarPreviewRequestSeq) return;
      if(actualDates) {
        var isLeapStr = typeVal === 'lunar_leap' ? '(윤달)' : '(평달)';
        pEl.classList.add('form-lunar-preview--active');
        pEl.style.display = 'block';
        pEl.innerHTML = `➡ 변환 완료: 양력 <strong>${actualDates.y}년 ${actualDates.m}월 ${actualDates.d}일</strong> / 음력${isLeapStr} <strong>${dVal.split('-')[0]}년 ${dVal.split('-')[1]}월 ${dVal.split('-')[2]}일</strong>`;
      } else {
        pEl.classList.remove('form-lunar-preview--active');
        pEl.style.display = 'none';
      }
    }).catch(function(err) {
      if (reqSeq !== _lunarPreviewRequestSeq) return;
      console.warn('[KASI] lunar preview fallback:', err);
      pEl.classList.remove('form-lunar-preview--active');
      pEl.style.display = 'none';
    });
};

function loadNext(){
  __libLoading = true;
  if(tried>=CDN_URLS.length){
    __libLoading = false;
    var msgEl = document.getElementById('lib-msg');
    var subEl = document.getElementById('lib-sub');
    var btnEl = document.getElementById('run-btn');
    if (msgEl) msgEl.textContent='❌ 라이브러리 로드 실패';
    if (subEl) subEl.textContent='새로고침 후 다시 시도해주세요';
    if (btnEl) btnEl.textContent='⚠️ 로드 실패 (다시 시도)';
    setTimeout(function(){ _hideLibOverlay(); }, 900);
    _setRunButtonToRetry();
    return;
  }
  var url=CDN_URLS[tried];
  var sub = document.getElementById('lib-sub');
  if (sub) sub.textContent='CDN '+(tried+1)+'/'+CDN_URLS.length+' 시도 중...';
  tried++;
  var done = false;
  var s=document.createElement('script');s.src=url;s.async=false;
  var failTimer = setTimeout(function(){
    if (done) return;
    done = true;
    try { if (s && s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
    loadNext();
  }, 6000);

  s.onload=function(){
    if (done) return;
    done = true;
    clearTimeout(failTimer);
    waitForSolar(0);
  };
  s.onerror=function(){
    if (done) return;
    done = true;
    clearTimeout(failTimer);
    loadNext();
  };
  document.head.appendChild(s);
}
function waitForSolar(n){
  if(n>30){loadNext();return;}
  if(typeof Solar!=='undefined'&&typeof Solar.fromYmdHms==='function'){onLibReady();}
  else{setTimeout(function(){waitForSolar(n+1);},100);}
}
function onLibReady(){
  __libLoading = false;
  __libReady = true;
  _hideLibOverlay();
  var btn=document.getElementById('run-btn');
  if (btn) {
    btn.disabled=false;
    btn.textContent='무료로 사주 보기 →';
    /* INP: onclick은 data-action 경로를 타지 않으므로 동일하게 한 틱 지연 */
    btn.onclick = function () { setTimeout(checkPrivacyAndCalculate, 0); };
  }

  if (__pendingAutoCalculation) {
    __pendingAutoCalculation = false;
    setTimeout(function() {
      try {
        if (typeof checkPrivacyAndCalculate === 'function') {
          _applyBirthFormSnapshot(__pendingAutoBirthSnapshot);
          __pendingAutoBirthSnapshot = null;
          checkPrivacyAndCalculate();
        }
      } catch (e) {
        console.error('[saju] pending auto calculation failed', e);
      }
    }, 0);
  }
}

/* 라이브러리 오버레이 잔존 방지: 15초 경과 시 강제 해제 */
setTimeout(function(){ _hideLibOverlay(); }, 15000);

/* ═══════════════════════════════════════
   STEP 2: 명리학 데이터
═══════════════════════════════════════ */
var GAN={
  '甲':{e:'wood',y:'+',n:'갑목'},'乙':{e:'wood',y:'-',n:'을목'},
  '丙':{e:'fire',y:'+',n:'병화'},'丁':{e:'fire',y:'-',n:'정화'},
  '戊':{e:'earth',y:'+',n:'무토'},'己':{e:'earth',y:'-',n:'기토'},
  '庚':{e:'metal',y:'+',n:'경금'},'辛':{e:'metal',y:'-',n:'신금'},
  '壬':{e:'water',y:'+',n:'임수'},'癸':{e:'water',y:'-',n:'계수'}
};
var JI={
  '子':{e:'water',y:'-',a:'쥐'},'丑':{e:'earth',y:'-',a:'소'},
  '寅':{e:'wood',y:'+',a:'호랑이'},'卯':{e:'wood',y:'-',a:'토끼'},
  '辰':{e:'earth',y:'+',a:'용'},'巳':{e:'fire',y:'+',a:'뱀'},
  '午':{e:'fire',y:'-',a:'말'},'未':{e:'earth',y:'-',a:'양'},
  '申':{e:'metal',y:'+',a:'원숭이'},'酉':{e:'metal',y:'-',a:'닭'},
  '戌':{e:'earth',y:'+',a:'개'},'亥':{e:'water',y:'+',a:'돼지'}
};
var ANIMAL_EMOJI={쥐:'🐭',소:'🐄',호랑이:'🐯',토끼:'🐰',용:'🐉',뱀:'🐍',말:'🐴',양:'🐑',원숭이:'🐵',닭:'🐔',개:'🐕',돼지:'🐷'};
var EL_K={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
var EL_E={wood:'🌿',fire:'🔥',earth:'🌏',metal:'✨',water:'💧'};
var SHENG={wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'};
var KE={wood:'earth',fire:'metal',earth:'water',metal:'wood',water:'fire'};
function whoControls(e){var k=Object.keys(KE);for(var i=0;i<k.length;i++){if(KE[k[i]]===e)return k[i];}return 'metal';}
function parentOf(e){var k=Object.keys(SHENG);for(var i=0;i<k.length;i++){if(SHENG[k[i]]===e)return k[i];}return 'water';}

/* ─── 십성 DB ─── */
var TS_DB={
  '비견':{emoji:'👬',desc:'나랑 똑같은 나의 분신!',meaning:'친구처럼 든든한 나와 같은 에너지'},
  '겁재':{emoji:'🥷',desc:'내 것을 뺏고 뺏기는 라이벌!',meaning:'경쟁하고 이겨내려는 불타는 에너지'},
  '식신':{emoji:'🍔',desc:'오물오물 맛있게 먹는 재능!',meaning:'즐겁게 표현하고 베푸는 행복한 에너지'},
  '상관':{emoji:'💥',desc:'규칙은 싫어! 내 멋대로 할래!',meaning:'틀을 깨고 창의적으로 바꾸는 에너지'},
  '편재':{emoji:'🎢',desc:'크게 놀고 크게 버는 통 큰 대장!',meaning:'넓은 세상을 누비고 지휘하는 에너지'},
  '정재':{emoji:'🐖',desc:'차곡차곡 알뜰살뜰 모으는 저금통!',meaning:'아끼고 소중히 다루는 성실한 에너지'},
  '편관':{emoji:'⚔️',desc:'엄격하고 무서운 호랑이 선생님!',meaning:'참아내고 책임지는 카리스마 에너지'},
  '정관':{emoji:'👑',desc:'칭찬받는 모범생 반장!',meaning:'바른 길로 이끌어주는 규칙의 에너지'},
  '편인':{emoji:'🔮',desc:'남들은 모르는 신비한 초능력!',meaning:'번뜩이는 아이디어와 독특한 재능 에너지'},
  '정인':{emoji:'🤱',desc:'따뜻하게 안아주는 엄마의 품!',meaning:'배우고 사랑받는 수용의 에너지'}
};
var TS_DEEP={
  '비견':{nature:'누구의 간섭도 받기 싫어하는 <b>자유로운 영혼</b>입니다. 겉으로는 조용해 보여도 속에는 "내가 최고"라는 자존심이 꽉 차 있습니다. 남 밑에서 일하기보다는 내 이름을 걸고 하는 일이 어울립니다.',career:'프리랜서, 전문직, 개인 사업, 예체능 분야 — 조직 생활보다는 독립적인 업무에서 빛납니다.',love:'<b>친구 같은 편안한 연애</b>를 선호합니다. 나를 구속하거나 집착하는 상대와는 절대 오래 못 갑니다. 서로의 사생활을 존중해주는 쿨한 사람과 잘 맞습니다.',advice:'고집이 너무 세면 주변 사람이 떠납니다. 가끔은 "내가 틀릴 수도 있다"고 생각하는 유연함이 성공의 열쇠입니다. 동업보다는 단독 행동이 유리합니다.'},
  '겁재':{nature:'승부욕의 화신입니다. <b>"지면 잠이 안 오는"</b> 성격이죠. 겉으로는 웃고 있어도 속으로는 상대를 이길 천기를 짜고 있습니다. 리더십이 있고 사람을 모으는 재주가 탁월합니다.',career:'스포츠 에이전트, 엔터테인먼트, 투기성 사업, 정치, 영업직에서 두각을 나타냅니다.',love:'<b>드라마틱하고 화려한 연애</b>를 꿈꿉니다. 경쟁자가 있는 이성을 쟁취했을 때 큰 희열을 느낍니다.',advice:'도박이나 무리한 투자는 패가망신의 지름길입니다. 돈은 들어오는데 나가는 구멍이 큽니다. 강제 저축 성궁 진법을 만드세요.'},
  '식신':{nature:'천성이 <b>낙천적이고 베푸는 것</b>을 좋아합니다. "좋은 게 좋은 거지"라는 마인드로 주변 사람들을 편안하게 해줍니다. 미식가가 많고 손재주가 뛰어납니다.',career:'요식업, 교육, 육아 관련, 디자이너, 연구원 — 내가 좋아하는 일을 해야 능력이 폭발합니다.',love:'<b>엄마/아빠처럼 챙겨주는 연애</b>를 합니다. 맛있는 거 같이 먹으러 다니는 데이트를 가장 좋아합니다.',advice:'너무 퍼주다가 이용당할 수 있으니 사람을 가려 사귀세요. 게을러지기 쉬우니 규칙적인 운동이 필수입니다.'},
  '상관':{nature:'머리 회전이 비상하게 빠르고 <b>말재주가 뛰어난 천재형</b>입니다. 부조리한 것을 보면 참지 못하고 들이받는 반항아 기질로 "트러블 메이커"가 되기도 합니다.',career:'언론인, 변호사, 컨설턴트, 유튜버, 마케터, 예능인 — 창의적 표현이 허용되는 분야에서 폭발합니다.',love:'<b>티키타카가 잘 되는 지적인 사람</b>에게 끌립니다. 지루하거나 꼰대 같은 사람은 1분도 못 견딥니다.',advice:'말 한마디로 천냥 빚을 갚지만, 말 한마디로 적을 만듭니다. 화가 났을 때 3초만 쉬고 말하세요.'},
  '편재':{nature:'스케일이 크고 <b>공간 지각 능력이 뛰어난 사업가</b>입니다. 작은 돈에 연연하지 않고 큰 그림을 그립니다. 유머 감각이 있고 노는 것을 좋아해 주변에 사람이 끊이지 않습니다.',career:'무역, 유통, 금융 투자, 해외 관련 사업, 건설업에서 큰 성과를 냅니다.',love:'<b>즐겁고 화끈한 연애</b>를 추구합니다. 이벤트의 제왕이며 상대방을 즐겁게 해줍니다.',advice:'계획 없는 소비나 유흥을 조심하세요. 현금보다는 부동산 같이 묶어두는 자산이 좋습니다.'},
  '정재':{nature:'세상에서 가장 <b>성실하고 꼼꼼한 사람</b>입니다. 돌다리도 두들겨 보고 건너는 신중함이 있습니다. 1원 하나도 허투루 쓰지 않는 경제 관념이 투철합니다.',career:'회계사, 은행원, 공무원, 경리, 약사 — 안정적인 월급이 나오는 체계적인 조직이 최적입니다.',love:'<b>신뢰와 안정을 최우선</b>으로 합니다. 결혼을 전제로 한 진지한 만남을 선호합니다. 가정적인 최고의 배우자감입니다.',advice:'너무 계산적이면 인간미가 없어 보입니다. 가끔은 이유 없이 낭만을 즐겨보세요.'},
  '편관':{nature:'자존심과 명예를 목숨보다 소중히 여깁니다. <b>"나를 따르라"</b>는 카리스마가 있고, 힘든 일도 묵묵히 견뎌내는 인내심이 대단합니다. 의협심이 강합니다.',career:'군인, 경찰, 검찰, 경호, 외과의사, 특수 기술직에서 영웅적인 활약을 합니다.',love:'<b>나를 존경해주는 사람</b>을 원합니다. 한번 마음을 주면 끝까지 책임집니다.',advice:'스트레스를 속으로 삭이다가 병이 납니다. 운동이나 취미로 에너지를 발산하세요.'},
  '정관':{nature:'법 없이도 살 수 있는 <b>바른 생활 사나이/숙녀</b>입니다. 규칙과 원칙을 중요시하고 어디서나 "믿을 수 있는 사람"이라는 평을 듣습니다.',career:'행정 공무원, 교사, 대기업 직원, 공공기관 — 체계가 잡힌 조직에서 진가를 발휘합니다.',love:'<b>단정하고 예의 바른 사람</b>에게 호감을 느낍니다. 부모님이 좋아할 1등 신랑/신붓감입니다.',advice:'융통성이 부족해 "답답하다"는 소리를 들을 수 있습니다. 너무 남의 시선을 의식하지 마세요.'},
  '편인':{nature:'남들이 보지 못하는 세상을 보는 <b>직관력과 영감</b>이 뛰어납니다. 눈치가 100단이고 신비로운 매력이 있습니다. 약간 4차원적이거나 철학적인 생각에 잠길 때가 많습니다.',career:'역술가, 심리학자, 종교인, 작가, 연구직, IT 개발자 — 비범한 통찰력이 필요한 분야가 천직입니다.',love:'<b>영혼이 통하는 소울메이트</b>를 찾습니다. 조건보다는 "느낌(Feel)"이 중요합니다.',advice:'생각만 하다가 기회를 놓칩니다. 머릿속 아이디어를 현실로 옮기는 실행력을 기르세요.'},
  '정인':{nature:'마음이 따뜻하고 <b>사랑받을 자격이 충분한 사람</b>입니다. 지적 호기심이 많고 배우는 것을 좋아합니다. 윗사람의 혜택을 많이 받고 인복이 좋습니다.',career:'교수, 교사, 학자, 상담가, 부동산 임대업 — 배우고 가르치는 환경에서 최상의 성과를 냅니다.',love:'<b>다정하게 보살펴주는 사람</b>을 좋아합니다. 정신적인 교감을 중요시하며 칭찬과 인정에 약합니다.',advice:'받는 것에만 익숙해지면 의존적인 사람이 됩니다. 스스로 결정하는 자립심을 키우세요.'}
};

/* ─── 건강 & 개운 DB ─── */
var HEALTH_DATA={
  wood:{weak:'간, 담낭, 신경계, 근육',food:'녹색 채소(브로콜리, 시금치), 신맛 과일(매실, 레몬), 닭고기',advice:'화를 참으면 간이 상합니다. 등산이나 산림욕이 최고의 보약입니다.'},
  fire:{weak:'심장, 혈관, 소장, 시력',food:'붉은색 음식(토마토, 사과, 대추), 쓴맛(다크초콜릿, 커피 적당량)',advice:'급한 성격이 심장에 무리를 줍니다. 명상과 심호흡을 자주 하세요.'},
  earth:{weak:'위장, 비장, 소화기, 허리',food:'노란색 음식(단호박, 고구마, 바나나), 단맛(꿀, 엿)',advice:'생각이 너무 많으면 위가 탈이 납니다. 규칙적인 식사가 생명입니다.'},
  metal:{weak:'폐, 호흡기, 대장, 피부',food:'흰색 음식(배, 도라지, 무, 마늘), 매운맛(생강, 파)',advice:'건조한 환경은 피하세요. 물을 자주 마시고 피부 보습에 신경 쓰세요.'},
  water:{weak:'신장, 방광, 자궁/전립선, 귀',food:'검은색 음식(검은콩, 미역, 김, 흑미), 짠맛(적당한 해산물)',advice:'몸이 차가워지기 쉽습니다. 반신욕이나 족욕으로 체온을 높이세요.'}
};
var GAEUN_TIPS={
  wood:{color:'흰색/메탈톤',place:'정리정돈, 미니멀 공간',action:'규칙, 루틴, 성문 점검표',food:'매운맛(생강/파) + 흰색 음식(배/무)'},
  fire:{color:'붉은색/주황색',place:'활기찬 공간, 남향',action:'운동, 사교 활동, 도전적인 일',food:'붉은 음식(토마토/사과) + 쓴맛(다크초콜릿/커피)'},
  earth:{color:'노랑/주황',place:'편안한 공간, 햇볕 잘 드는 곳',action:'휴식/여가, 소화에 좋은 활동',food:'노란 음식(바나나/호박) + 단맛(꿀/엿)'},
  metal:{color:'회색/흰색',place:'깔끔한 공간, 서향',action:'정리/청소, 원칙 세우기',food:'매운맛(생강/파) + 흰색 음식(배/무)'},
  water:{color:'블루/네이비',place:'차분한 물가, 서늘한 환경',action:'호흡/명상, 속도 조절',food:'검은 음식(김/미역/흑미) + 짠맛 적당히'}};

var TRAVEL_DB={
  water:{
    title:'시원한 물(水) 기운 여행',
    icon:'💧',
    vibe:'바다와 호수, 강가에서 몸과 마음을 식혀주는 여행',
    domestic:['제주 바다와 협재·함덕 해변 산책','강릉·속초 동해 바다 드라이브','가평·양평 북한강·남한강 수변 카페'],
    abroad:['발리·푸켓 등 동남아 휴양지','몰디브·괌 같은 리조트 여행','스위스 인터라켄 호수 전망 여행']
  },
  fire:{
    title:'따스한 불(火) 기운 여행',
    icon:'🔥',
    vibe:'햇살과 사람 온기가 느껴지는 도시·축제 여행',
    domestic:['서울·부산 야경 나들이와 야시장','여수·부산 밤바다 감성 여행','대구·광주 등 로컬 먹거리 탐방'],
    abroad:['도쿄·오사카 도시 야경 여행','스페인 바르셀로나·세비야 감성 여행','미국 라스베이거스·LA 야경 드라이브']
  },
  wood:{
    title:'푸른 나무(木) 기운 여행',
    icon:'🌿',
    vibe:'숲과 산, 초록 자연 속에서 재충전하는 여행',
    domestic:['지리산·설악산 국립공원 숲길 트레킹','강원도 평창·인제 숲속 펜션','제주 곶자왈·사려니숲길 산책'],
    abroad:['스위스 알프스 트레킹','캐나다 밴프·레이크루이스 숲과 호수 여행','뉴질랜드 자연 풍경 드라이브']
  },
  metal:{
    title:'깔끔한 금(金) 기운 여행',
    icon:'✨',
    vibe:'정리된 도시 풍경과 미술·건축을 즐기는 여행',
    domestic:['서울 성수·한남 감성 거리 산책','부산 해운대·센텀 현대적 도심 산책','판교·광교 호수공원과 카페 거리'],
    abroad:['일본 도쿄·교토 미술관 여행','싱가포르 도시 야경과 가든스 바이 더 베이','파리·런던 미술관 중심 시티투어']
  },
  earth:{
    title:'포근한 토(土) 기운 여행',
    icon:'🌏',
    vibe:'대지의 안정감이 느껴지는 한옥·사찰·온천 여행',
    domestic:['경주·전주 한옥마을 골목 여행','양산 통도사·합천 해인사 사찰 산책','덕구·석암 온천 등 온천 힐링 여행'],
    abroad:['일본 하코네·벳푸 온천 여행','대만 베이터우 온천과 골목 산책','이탈리아 토스카나 시골 마을 드라이브']
  }
};

var ENERGY_COORD_DB={
  wood:{
    direction:'동쪽(東方)',dirEmoji:'🌱',
    theme:'울창한 수림·수직 생장·에코 에너지',
    domestic:[
      {icon:'🎋',name:'담양 죽녹원·대숲',coord:'35.3108°N 126.9884°E',desc:'동아시아 최대 대나무 숲. 수직 상승하는 목(木) 기운이 극도로 농축된 공간. 새벽 안개 속 바람 소리가 기운을 정화합니다.'},
      {icon:'🌲',name:'인제 원대리 자작나무숲',coord:'38.0643°N 128.1791°E',desc:'하얀 자작나무들이 하늘을 향해 뻗은 정북 에너지 정점. 목(木) 충전에 정렬된 강원 내륙 에너지 벨트.'},
      {icon:'🌿',name:'제주 곶자왈 에코로드',coord:'33.3617°N 126.2744°E',desc:'화산암 위 원시 밀림. 끊임없이 재생하는 생명 기운의 집약지. 조천·구좌 방면이 목 기운 극대화 포인트.'},
      {icon:'🍵',name:'보성 대한다원 녹차밭',coord:'34.7619°N 127.0800°E',desc:'끝없이 펼쳐진 푸른 녹차밭. 땅의 수분을 머금고 자라난 생명력이 목(木) 에너지를 부드럽게 채워줍니다.'},
      {icon:'🌳',name:'포천 국립수목원 (광릉숲)',coord:'37.7533°N 127.1733°E',desc:'수백 년간 보존된 원시림. 거대한 고목들이 뿜어내는 묵직하고 깊은 목(木) 기운을 온몸으로 흡수할 수 있습니다.'}
    ],
    global:[
      {icon:'🍁',name:'캐나다 밴쿠버 스탠리파크',coord:'49.3012°N 123.1417°W',desc:'도심 속 400헥타르 원시림. 태평양 수분을 머금은 목(木) 기운이 가장 순도 높게 응집된 지구상 좌표.'},
      {icon:'🌸',name:'일본 교토 아라시야마 대숲',coord:'35.0166°N 135.6686°E',desc:'죽림(竹林)이 만드는 초록 진동. 천년 고도의 수직 목 에너지와 전통 문화가 융합된 한반도 정동방향 에너지 포인트.'},
      {icon:'🌳',name:'브라질 마나우스 아마존',coord:'3.1019°S 60.0250°W',desc:'지구의 폐라 불리는 아마존. 인류 역사상 가장 강렬한 목(木) 에너지 발신지. 극한 목 기운 충전의 최종 목적지.'},
      {icon:'🌲',name:'미국 캘리포니아 레드우드 국립공원',coord:'41.3000°N 124.0000°W',desc:'세계에서 가장 키가 큰 나무들의 군락지. 하늘을 찌를 듯 솟아오른 거목들이 압도적인 목(木) 에너지를 방사합니다.'},
      {icon:'🌲',name:'독일 슈바르츠발트 (흑림)',coord:'48.3000°N 8.1500°E',desc:'빽빽한 전나무 숲이 끝없이 이어진 검은 숲. 차분하고 깊이 있는 목(木) 기운이 내면의 성장을 돕습니다.'}
    ]
  },
  fire:{
    direction:'남쪽(南方)',dirEmoji:'🔥',
    theme:'화산 지형·예술 도시·야경 에너지',
    domestic:[
      {icon:'🌋',name:'제주 성산일출봉 화산 지대',coord:'33.4581°N 126.9424°E',desc:'10만년 전 화산 폭발로 생성된 응회암 지형. 해가 처음 뜨는 방위와 화산 지열이 결합된 화(火) 에너지의 성지. 일출 시 기운 최고점.'},
      {icon:'🎆',name:'여수 밤바다 돌산공원',coord:'34.7461°N 127.7389°E',desc:'남해 위 찬란한 야경. 물 위 반사된 불(火) 에너지가 증폭되는 지형학적 조건. 여수 남향 기운이 화 용신을 극대화.'},
      {icon:'🎨',name:'부산 감천문화마을 야경',coord:'35.0975°N 129.0106°E',desc:'산 경사면 위 색채 예술 마을. 남쪽 바다를 향해 열린 지형이 화(火) 기운을 안정 흡수. 예술적 열정·시각 에너지 충전지.'},
      {icon:'🗼',name:'서울 남산타워 야경',coord:'37.5511°N 126.9882°E',desc:'도심 한가운데 우뚝 솟은 불의 상징. 수많은 불빛이 모여 강력한 화(火) 에너지를 발산하는 수도의 심장부.'},
      {icon:'🌅',name:'포항 호미곶 해맞이 광장',coord:'36.0772°N 129.5683°E',desc:'한반도에서 가장 먼저 해가 뜨는 곳. 떠오르는 태양의 폭발적인 양(陽) 기운과 화(火) 에너지를 직접 수신합니다.'}
    ],
    global:[
      {icon:'🌺',name:'하와이 빅아일랜드 킬라우에아',coord:'19.4210°N 155.2872°W',desc:'현재도 활동 중인 지구상 가장 강력한 화(火) 에너지 방사 좌표. 용암이 바다를 만나는 지점에서 화(火)·수(水) 기운이 교차.'},
      {icon:'🏛️',name:'스페인 바르셀로나 가우디 예술도시',coord:'41.3851°N 2.1734°E',desc:'불꽃을 닮은 건축물의 도시. 지중해 태양이 내리쬐는 남유럽 최고의 화(火) 기운 도시. 창의성과 열정 에너지 집중 충전.'},
      {icon:'🌋',name:'이탈리아 에트나 화산·나폴리',coord:'37.7551°N 14.9961°E',desc:'유럽 최대 활화산과 나폴리 열정 문화가 결합. 지중해 연안 남쪽 에너지 집중 포인트. 화(火) 기운을 근원에서 충전.'},
      {icon:'🏜️',name:'아랍에미리트 두바이 사막 사파리',coord:'25.2048°N 55.2708°E',desc:'작열하는 태양과 뜨거운 모래바람. 극한의 열기가 응축된 사막에서 순수한 화(火) 에너지를 경험할 수 있습니다.'},
      {icon:'🌃',name:'싱가포르 마리나 베이 샌즈 야경',coord:'1.2834°N 103.8607°E',desc:'적도 부근의 뜨거운 기후와 화려한 인공 조명이 결합된 현대적 화(火) 에너지의 결정체.'}
    ]
  },
  earth:{
    direction:'중앙·동북·서남',dirEmoji:'🌏',
    theme:'황토 대지·고대 유적·역사 에너지',
    domestic:[
      {icon:'🏯',name:'경주 반월성·첨성대 고도(古都)',coord:'35.8347°N 129.2239°E',desc:'천년 신라 왕도의 황토 대지. 역사적 시공간이 응축된 토(土) 기운의 정수. 봄·가을 황혼 무렵 반월성 토성(土城) 에너지 최고조.'},
      {icon:'🧱',name:'전주 한옥마을 황토 골목',coord:'35.8151°N 127.1530°E',desc:'황토 담벽과 기와가 만드는 토(土) 에너지 밀집 구역. 600년 역사의 전통 지기(地氣)가 살아있는 공간. 새벽 골목길에서 대지 기운 충전.'},
      {icon:'⛰️',name:'충청 금산 대둔산 황금 암반',coord:'36.1082°N 127.3064°E',desc:'풍수지리상 충청 내륙의 중심부. 황금 암반 노출 지형이 토(土) 기운을 지표에서 직접 방사. 고요한 대지 에너지의 집약처.'},
      {icon:'🛖',name:'안동 하회마을',coord:'36.5388°N 128.5196°E',desc:'낙동강이 감싸 안은 명당. 오랜 세월 다져진 흙과 전통 가옥이 뿜어내는 안정적이고 중후한 토(土) 기운.'},
      {icon:'🌾',name:'순천만 습지 갈대밭',coord:'34.8850°N 127.5080°E',desc:'광활한 갯벌과 대지가 만나는 생명의 요람. 습토(濕土)의 기운이 강해 메마른 사주에 윤택한 토(土) 에너지를 공급합니다.'}
    ],
    global:[
      {icon:'🏔️',name:'페루 마추픽추 황토 고원',coord:'13.1631°S 72.5450°W',desc:'해발 2,430m 황토 암반 위 잉카 성채. 지구 중심의 대지 에너지가 수직 상승하는 지점. 토(土) 기운을 지구 규모로 체험할 수 있는 최강 좌표.'},
      {icon:'🐉',name:'중국 시안 황토고원·병마용',coord:'34.3853°N 109.2732°E',desc:'중원(中原) 황토의 심장. 수천 년 토(土) 에너지가 대지에 농축된 문명의 발원지. 황토고원 특유의 중후한 땅 기운이 안정과 실력을 키웁니다.'},
      {icon:'🗿',name:'이집트 룩소르 사막 고대 신전',coord:'25.6872°N 32.6396°E',desc:'나일강 유역 건조 황토 대지의 에너지 집중처. 3,000년 역사 에너지가 사막 무풍지대에 보존. 안정·뿌리 기운이 필요한 토(土) 용신 최적 해외지.'},
      {icon:'🏜️',name:'미국 그랜드 캐니언',coord:'36.1069°N 112.1129°W',desc:'수억 년의 지층이 그대로 드러난 대자연의 경이. 지구의 뼈대와 살을 직접 마주하며 거대한 토(土) 에너지를 흡수합니다.'},
      {icon:'🎈',name:'튀르키예 카파도키아 기암괴석',coord:'38.6431°N 34.8289°E',desc:'화산재가 굳어 만들어진 응회암 지대. 대지의 기운이 독특한 형태로 솟아오른 토(土) 에너지의 신비로운 결절지.'}
    ]
  },
  metal:{
    direction:'서쪽(西方)',dirEmoji:'💎',
    theme:'견고한 암석산·첨단 테크·순수 금속 에너지',
    domestic:[
      {icon:'🏔️',name:'설악산 울산바위 암릉',coord:'38.1247°N 128.4649°E',desc:'화강암 거대 암괴가 수직으로 솟은 한반도 최강의 금(金) 에너지 좌표. 서쪽 능선 일몰 시 금속 진동 극대화. 단단하고 날카로운 기운 충전에 국내 최적.'},
      {icon:'⛰️',name:'가야산 만물상 암석 능선',coord:'35.7997°N 128.1052°E',desc:'억겁의 세월이 갈아낸 날카로운 암릉. 풍수지리상 한반도 서남권 금(金) 기운 집중처. 가을 서늘한 공기가 금속 에너지를 정제.'},
      {icon:'🏭',name:'포항 포스코 제철 에너지 도시',coord:'36.0192°N 129.3435°E',desc:'국내 최대 철강 산업 도시. 인공 금 기운이 집약된 현대판 금속 에너지 필드. 실용·기술·첨단 금(金) 에너지 보충에 특화된 이색 에너지 좌표.'},
      {icon:'🏢',name:'서울 동대문 DDP',coord:'37.5665°N 127.0090°E',desc:'거대한 금속 우주선 같은 미래 지향적 건축물. 차갑고 매끄러운 금속 표면이 발산하는 현대적 금(金) 에너지.'},
      {icon:'🌉',name:'부산 마린시티와 광안대교',coord:'35.1532°N 129.1189°E',desc:'강철로 엮인 거대 교량과 마천루 숲. 바다 위로 뻗은 금속 구조물들이 결단력과 성취의 금(金) 기운을 증폭시킵니다.'}
    ],
    global:[
      {icon:'🏔️',name:'스위스 체르마트 마터호른',coord:'45.9763°N 7.6586°E',desc:'알프스 화강암 봉우리의 왕. 해발 4,478m 피라미드형 암산이 방사하는 금(金) 에너지는 지구상 최고 순도. 극한의 정밀함·결단력 기운 충전지.'},
      {icon:'💻',name:'미국 실리콘밸리 팔로알토',coord:'37.4419°N 122.1430°W',desc:'인류 최고의 테크놀로지 에너지 집약 도시. 첨단·정밀·혁신의 금(金) 기운을 현대적 방식으로 체험. 한반도 기준 정서(正西) 방향 에너지 보정 라인.'},
      {icon:'💎',name:'남아공 요하네스버그 금광 지대',coord:'26.2041°S 28.0473°E',desc:'인류 역사상 최대 금광 매장 지대. 지하에서 천연 순금이 방사하는 순수 금(金) 에너지 원천. 재물 운·명예 운·결단력 강화에 직효하는 극한 금속 에너지 성지.'},
      {icon:'🗼',name:'프랑스 파리 에펠탑',coord:'48.8584°N 2.2945°E',desc:'철골 구조의 미학적 정점. 차가운 철이 예술로 승화된 공간으로, 세련되고 날카로운 금(金) 에너지를 충전합니다.'},
      {icon:'🏙️',name:'아랍에미리트 부르즈 할리파',coord:'25.1972°N 55.2744°E',desc:'하늘을 찌르는 세계 최고층 금속 마천루. 인간의 기술력과 금속 에너지가 결합된 수직 상승의 결정체.'}
    ]
  },
  water:{
    direction:'북쪽(北方)',dirEmoji:'🌊',
    theme:'심해·광활한 호수·안개 항구 에너지',
    domestic:[
      {icon:'🌊',name:'강원 화진포 석호(潟湖)',coord:'38.5711°N 128.4269°E',desc:'동해와 만나는 희귀 석호 지형. 막힌 물과 열린 바다가 교차하며 수(水) 에너지가 중첩 농축. 새벽 안개가 지혜·직관력을 극적으로 끌어올립니다.'},
      {icon:'🚢',name:'보성·고흥 다도해 안개 항구',coord:'34.7714°N 127.0738°E',desc:'남해 다도해의 안개는 수(水) 에너지가 응결된 자연의 결정체. 안개 낀 항구 특유의 깊은 기운이 지혜·탐구 에너지를 충전.'},
      {icon:'💧',name:'제주 세화·성산 용천수 올레길',coord:'33.4595°N 126.9185°E',desc:'화산 지하에서 솟아나는 원시 청정 용천수. 지구 내부 수맥 에너지가 지표로 직접 솟구치는 수(水) 에너지 정점. 미천굴·세화해변 연계 루트 추천.'},
      {icon:'🏖️',name:'강릉 경포대와 동해바다',coord:'37.8055°N 128.9078°E',desc:'끝없이 펼쳐진 푸른 바다와 거대한 호수. 탁 트인 수(水) 기운이 막힌 흐름을 뚫어주고 유연한 사고를 돕습니다.'},
      {icon:'🏝️',name:'통영 한려수도 해상공원',coord:'34.8406°N 128.4302°E',desc:'수많은 섬 사이로 흐르는 잔잔한 바닷물. 깊고 고요한 수(水) 에너지가 내면의 평화와 지혜를 일깨웁니다.'}
    ],
    global:[
      {icon:'🏔️',name:'노르웨이 게이랑에르 피요르드',coord:'62.1006°N 7.2053°E',desc:'빙하가 수백만 년에 걸쳐 파낸 세계 최고급 수(水) 에너지 협곡. 폭포수와 짙푸른 피요르드가 만드는 물의 진동은 지구상 가장 순수한 수 기운.'},
      {icon:'🌋',name:'아이슬란드 블루라군·레이캬비크',coord:'63.8804°N 22.4495°W',desc:'지열 온천과 빙하 용융수가 결합된 기묘한 수 에너지 결절지. 오로라와 풍성한 수 기운이 공존하는 지구 최북단 에너지 체험지. 심층 직관 활성화.'},
      {icon:'🏞️',name:'캐나다 밴프 레이크루이즈',coord:'51.4254°N 116.1773°W',desc:'빙하가 녹아 만든 에메랄드빛 호수. 3면이 설산으로 둘러싸인 에너지 집중 그릇형 지형. 맑고 냉정한 수(水) 기운이 지혜·천기적 사고를 업그레이드.'},
      {icon:'🛶',name:'이탈리아 베네치아 운하',coord:'45.4408°N 12.3155°E',desc:'도시 전체가 물 위에 떠 있는 수(水) 에너지의 성지. 끊임없이 흐르는 물길이 유연성과 소통의 기운을 극대화합니다.'},
      {icon:'🏝️',name:'몰디브 산호초 바다',coord:'3.2028°N 73.2207°E',desc:'투명하고 맑은 인도양의 바다. 정화와 치유의 수(水) 에너지가 가득하여 지친 심신을 완벽하게 리셋해줍니다.'}
    ]
  }
};

var HEALTH_FOOD_DB = {
  wood: [
    {name:'부추무침', ingredients:'부추, 식초', reason:'간의 해독을 돕고 신맛이 목(木) 기운을 깨웁니다.'},
    {name:'매실차', ingredients:'매실, 꿀', reason:'신맛이 간담을 튼튼하게 하고 피로를 풀어줍니다.'},
    {name:'닭가슴살 샐러드', ingredients:'닭가슴살, 양상추', reason:'푸른 채소가 목(木) 에너지를 직접적으로 공급합니다.'},
    {name:'미나리 삼겹살', ingredients:'미나리, 돼지고기', reason:'미나리의 해독 작용이 간 기능을 극대화합니다.'},
    {name:'키위 스무디', ingredients:'키위, 사과', reason:'상큼한 신맛과 푸른색이 목(木) 기운을 보충합니다.'},
    {name:'시금치 나물', ingredients:'시금치, 참기름', reason:'철분과 푸른 에너지가 피를 맑게 하고 간을 돕습니다.'},
    {name:'브로콜리 스프', ingredients:'브로콜리, 우유', reason:'항산화 성분이 간의 부담을 덜어줍니다.'},
    {name:'쑥떡', ingredients:'쑥, 찹쌀', reason:'봄의 생명력을 담은 쑥이 목(木) 기운을 강하게 채웁니다.'},
    {name:'포도즙', ingredients:'포도', reason:'신맛과 단맛의 조화가 간의 피로를 회복시킵니다.'},
    {name:'녹즙', ingredients:'케일, 샐러리', reason:'응축된 엽록소가 목(木) 에너지의 정수를 제공합니다.'},
    {name:'오미자차', ingredients:'오미자', reason:'다섯 가지 맛 중 신맛이 간을 보강하는 데 탁월합니다.'},
    {name:'냉이 된장국', ingredients:'냉이, 된장', reason:'봄나물의 쌉싸름한 맛이 목(木) 기운을 소생시킵니다.'},
    {name:'똠얌꿍', ingredients:'새우, 레몬그라스, 라임', reason:'강렬한 신맛(목)과 허브가 정체된 기운을 뚫어줍니다.'},
    {name:'과카몰리', ingredients:'아보카도, 고수, 라임즙', reason:'아보카도의 푸른 에너지와 라임의 신맛이 훌륭한 목(木) 보충제입니다.'},
    {name:'바질 페스토 파스타', ingredients:'바질, 잣, 올리브유', reason:'푸른 허브의 짙은 향이 간담을 깨우고 활력을 줍니다.'},
    {name:'세비체', ingredients:'해산물, 레몬/라임즙', reason:'날것의 생생한 기운과 강한 신맛이 목(木) 에너지를 직접 주입합니다.'},
    {name:'그린 커리', ingredients:'청양고추, 코코넛밀크', reason:'푸른 향신료의 에너지가 우울감을 날려버립니다.'},
    {name:'청사과 에이드', ingredients:'청사과, 무탄산/탄산수', reason:'청량한 신맛이 뇌를 깨우고 간의 기운을 원활하게 합니다.'},
    {name:'샐러리 스틱과 후무스', ingredients:'샐러리, 병아리콩', reason:'위로 뻗는 샐러리의 에너지가 목(木) 기운을 채워줍니다.'},
    {name:'피스타치오 젤라또', ingredients:'피스타치오, 우유', reason:'푸른 견과류의 에너지가 목(木) 기운을 달콤하게 채웁니다.'},
    {name:'솜땀 (풋파파야 샐러드)', ingredients:'풋파파야, 라임, 피쉬소스', reason:'아삭한 식감과 새콤한 맛이 생기를 돋웁니다.'}
  ],
  fire: [
    {name:'토마토 스튜', ingredients:'토마토, 올리브유', reason:'붉은색 라이코펜이 심장 혈관을 튼튼하게 합니다.'},
    {name:'홍삼 달인 물', ingredients:'홍삼', reason:'따뜻한 성질과 쓴맛이 심장(火)에 활력을 불어넣습니다.'},
    {name:'구기자차', ingredients:'구기자', reason:'붉은 열매가 혈액 순환을 돕고 심장 열을 다스립니다.'},
    {name:'마라탕', ingredients:'마라 소스, 청경채', reason:'매운맛과 열기가 화(火) 에너지를 폭발적으로 끌어올립니다.'},
    {name:'수박 화채', ingredients:'수박, 얼음', reason:'붉은색이 심장을 돕고 수분이 과도한 열을 식혀줍니다.'},
    {name:'자몽 에이드', ingredients:'자몽, 탄산수', reason:'특유의 쓴맛이 심장(火) 기운을 안정시킵니다.'},
    {name:'소고기 육회', ingredients:'소고기, 배', reason:'붉은 살코기가 심장과 혈액에 직접적인 에너지를 줍니다.'},
    {name:'석류 주스', ingredients:'석류', reason:'붉은 빛깔과 새콤달콤함이 심장 혈관에 생기를 줍니다.'},
    {name:'체리 타르트', ingredients:'체리, 밀가루', reason:'붉은 과일이 화(火) 기운을 부드럽게 보충합니다.'},
    {name:'매운 떡볶이', ingredients:'고추장, 떡', reason:'강렬한 매운맛이 땀을 내어 화(火) 에너지를 순환시킵니다.'},
    {name:'팥죽', ingredients:'붉은 팥, 새알심', reason:'붉은 팥이 심장의 열을 내리고 부기를 빼줍니다.'},
    {name:'영지버섯 즙', ingredients:'영지버섯', reason:'쓴맛이 심장을 편안하게 하고 정신을 맑게 합니다.'},
    {name:'칠리 콘 카르네', ingredients:'소고기, 칠리빈, 토마토', reason:'뜨거운 열기와 붉은 콩이 화(火) 기운을 강력하게 자극합니다.'},
    {name:'볼로네제 파스타', ingredients:'소고기 다짐육, 토마토 소스', reason:'붉은 소스가 심혈관계를 부드럽게 돕습니다.'},
    {name:'탄두리 치킨', ingredients:'닭고기, 붉은 향신료(파프리카 가루)', reason:'화덕의 열기와 붉은 향신료가 화(火) 에너지를 폭발시킵니다.'},
    {name:'아라비아따 펜네', ingredients:'펜네, 토마토, 페퍼론치노', reason:'매콤하고 붉은 소스가 심장의 열정을 되찾아 줍니다.'},
    {name:'카카오 85% 다크초콜릿', ingredients:'카카오 매스', reason:'진한 쓴맛이 심장을 안정시키고 집중력을 높여줍니다.'},
    {name:'에스프레소(혹은 디카페인)', ingredients:'원두', reason:'커피 특유의 쓴맛은 화(火) 기운을 깨우는 특효약입니다.'},
    {name:'레드 와인', ingredients:'포도', reason:'적당량의 붉은 와인은 심장병을 예방하고 열을 보충합니다.'},
    {name:'고추장 삼겹살', ingredients:'삼겹살, 고추장 양념', reason:'직화로 굽는 매콤한 고기가 심장의 에너지를 최고조로 끌어올립니다.'},
    {name:'가스파초 (냉토마토스프)', ingredients:'토마토, 양파, 식초', reason:'시원한 붉은색 채소가 화(火)의 긍정적인 면만 흡수하게 돕습니다.'}
  ],
  earth: [
    {name:'단호박죽', ingredients:'단호박, 찹쌀', reason:'노란색과 단맛이 비위(土)를 편안하게 감싸줍니다.'},
    {name:'고구마 맛탕', ingredients:'고구마, 꿀', reason:'천연 단맛이 소화기를 튼튼하게 하고 에너지를 줍니다.'},
    {name:'청국장 찌개', ingredients:'청국장, 두부', reason:'발효된 콩의 흙(土) 기운이 장내 환경을 안정시킵니다.'},
    {name:'카레라이스', ingredients:'강황, 감자', reason:'노란 강황이 위장을 따뜻하게 하고 소화를 돕습니다.'},
    {name:'바나나 스무디', ingredients:'바나나, 우유', reason:'부드러운 단맛이 비위(土)의 긴장을 풀어줍니다.'},
    {name:'옥수수 버터구이', ingredients:'옥수수, 버터', reason:'노란 알맹이가 토(土) 에너지를 든든하게 채워줍니다.'},
    {name:'감자전', ingredients:'감자, 식용유', reason:'땅속에서 자란 감자가 비위를 보강하는 훌륭한 식재료입니다.'},
    {name:'소고기 뭇국', ingredients:'소고기, 무', reason:'소고기의 단맛이 위장을 튼튼하게 하고 기력을 올립니다.'},
    {name:'마즙', ingredients:'마, 꿀', reason:'끈적한 뮤신 성분이 위벽을 보호하고 토(土) 기운을 생장시킵니다.'},
    {name:'된장찌개', ingredients:'된장, 애호박', reason:'전통 발효 식품이 흙의 기운을 몸속 깊이 전달합니다.'},
    {name:'율무차', ingredients:'율무', reason:'비위를 튼튼하게 하고 몸의 습기를 제거하는 데 탁월합니다.'},
    {name:'꿀물', ingredients:'천연 꿀', reason:'순수한 단맛이 소화기에 즉각적인 에너지를 공급합니다.'},
    {name:'망고 크레페', ingredients:'망고, 생크림', reason:'달콤하고 노란 과육이 위장을 부드럽게 달래줍니다.'},
    {name:'펌킨 파이', ingredients:'호박, 시나몬', reason:'구워낸 호박의 단맛(土)이 마음을 편안하게 만듭니다.'},
    {name:'버터 치킨 커리', ingredients:'치킨, 마크니 향신료', reason:'진하고 노란 향신료가 비위를 덥혀 에너지를 응집합니다.'},
    {name:'오므라이스', ingredients:'계란, 볶음밥', reason:'노란 계란 이불이 소화기를 부드럽게 코팅해줍니다.'},
    {name:'파에야', ingredients:'새우, 사프란, 쌀', reason:'노란 사프란과 쌀(土)이 위장을 든든하게 채웁니다.'},
    {name:'꿀 케이크 (메도빅)', ingredients:'꿀, 스폰지케이크', reason:'꿀의 쫀득한 단맛이 체력을 급격히 끌어올립니다.'},
    {name:'파인애플 볶음밥', ingredients:'파인애플, 밥', reason:'소화를 돕는 파인애플과 탄수화물의 이상적인 토(土) 조합입니다.'},
    {name:'크림 브륄레', ingredients:'바닐라 빔, 달걀 노른자', reason:'노른자의 영양과 위에 올라간 설탕이 위장에 온기를 줍니다.'},
    {name:'에그 타르트', ingredients:'계란, 페이스트리', reason:'노랗고 달콤한 디저트가 무너진 중심(土)을 잡아줍니다.'}
  ],
  metal: [
    {name:'도라지 무침', ingredients:'도라지, 고추장', reason:'흰색과 매운맛이 폐(金)와 기관지를 튼튼하게 합니다.'},
    {name:'배숙', ingredients:'배, 꿀', reason:'흰 과육이 폐의 열을 내리고 기침을 멎게 합니다.'},
    {name:'양파 볶음', ingredients:'양파, 간장', reason:'매운맛이 땀을 내어 폐(金) 기운을 순환시킵니다.'},
    {name:'마늘 통구이', ingredients:'마늘, 올리브유', reason:'강력한 매운맛이 금(金) 에너지를 응축시켜 면역력을 높입니다.'},
    {name:'닭백숙', ingredients:'닭고기, 인삼', reason:'흰 고기가 폐를 보하고 기력을 끌어올립니다.'},
    {name:'백김치', ingredients:'배추, 소금', reason:'자극적이지 않은 흰 채소가 대장(金) 환경을 개선합니다.'},
    {name:'치즈 샐러드', ingredients:'치즈, 토마토', reason:'흰 유제품이 금(金) 기운을 부드럽게 보충합니다.'},
    {name:'생강차', ingredients:'생강, 대추', reason:'알싸한 매운맛이 폐를 따뜻하게 하고 감기를 예방합니다.'},
    {name:'무생채', ingredients:'무, 파', reason:'흰색 채소가 소화를 돕고 폐의 기운을 맑게 합니다.'},
    {name:'우유 한 잔', ingredients:'우유', reason:'순백의 에너지가 금(金) 기운을 차분하게 채워줍니다.'},
    {name:'더덕구이', ingredients:'더덕, 참기름', reason:'기관지 점막을 튼튼하게 하여 폐(金)를 보호합니다.'},
    {name:'연근 무침', ingredients:'연근, 흑임자', reason:'흰 뿌리채소가 폐의 진액을 보충해줍니다.'},
    {name:'크램 차우더', ingredients:'조개스프, 크림, 감자', reason:'흰 진액이 폐와 대장의 건조함을 막아줍니다.'},
    {name:'알리오 올리오 파스타', ingredients:'마늘 듬뿍, 올리브유', reason:'마늘의 매운맛(金)이 호흡기에 활력을 줍니다.'},
    {name:'콜리플라워 퓨레', ingredients:'콜리플라워, 버터', reason:'뛰어난 흰색 채소가 묵직하게 폐를 윤택하게 합니다.'},
    {name:'까르보나라 파스타', ingredients:'치즈, 베이컨', reason:'흰 소스의 진한 에너지가 금(金)의 에너지를 다집니다.'},
    {name:'갈릭 버터 새우', ingredients:'마늘, 새우', reason:'마늘(金)과 해산물이 결합해 면역력을 배가시킵니다.'},
    {name:'화이트 와인', ingredients:'청포도', reason:'맑은 백포도주가 스트레스를 가라앉히고 순환을 돕습니다.'},
    {name:'대구 오븐 구이', ingredients:'흰살 생선, 레몬', reason:'기름기 없는 흰 살(金)이 맑은 에너지를 공급합니다.'},
    {name:'잣죽', ingredients:'잣, 쌀', reason:'폐를 윤택하게 하는 잣(金)과 흰빛이 호흡기 최고 보약입니다.'},
    {name:'바닐라 아이스크림', ingredients:'바닐라, 크림', reason:'부드러운 백색 단맛이 금(金) 성향의 예민함을 녹여냅니다.'}
  ],
  water: [
    {name:'미역국', ingredients:'미역, 소고기', reason:'검은 해조류와 짠맛이 신장(水) 기운을 강하게 보충합니다.'},
    {name:'검은콩 밥', ingredients:'검은콩, 쌀', reason:'블랙푸드의 대명사로 신장과 방광을 튼튼하게 합니다.'},
    {name:'장어 구이', ingredients:'장어, 생강', reason:'물속의 강한 스태미나가 수(水) 에너지를 폭발시킵니다.'},
    {name:'흑임자죽', ingredients:'검은깨, 쌀', reason:'검은깨가 신장의 정수(精水)를 채워 노화를 방지합니다.'},
    {name:'해물탕', ingredients:'오징어, 새우', reason:'바다의 짠맛과 에너지가 수(水) 기운을 직접적으로 공급합니다.'},
    {name:'굴 국밥', ingredients:'굴, 부추', reason:'바다의 우유라 불리며 신장의 음기를 보충하는 최고 식재료입니다.'},
    {name:'전복 버터구이', ingredients:'전복, 버터', reason:'깊은 바다의 에너지가 수(水) 기운을 고급스럽게 채웁니다.'},
    {name:'다시마 쌈', ingredients:'다시마, 초장', reason:'해조류의 미네랄이 신장(水) 기능을 원활하게 합니다.'},
    {name:'김부각', ingredients:'김, 찹쌀', reason:'가볍게 즐길 수 있는 블랙푸드로 수(水) 기운을 돕습니다.'},
    {name:'오징어 먹물 파스타', ingredients:'오징어 먹물, 면', reason:'검은 먹물이 신장(水) 에너지를 시각적, 미각적으로 채웁니다.'},
    {name:'돼지고기 수육', ingredients:'돼지고기, 된장', reason:'돼지고기는 수(水)에 배속되어 신장의 진액을 보충합니다.'},
    {name:'우엉차', ingredients:'우엉', reason:'신장 기능을 도와 이뇨 작용을 원활하게 합니다.'},
    {name:'캐비어 까나페', ingredients:'캐비어, 크래커', reason:'응축된 바다의 짠맛과 생명력이 훌륭한 수(水) 자원입니다.'},
    {name:'메밀 소바', ingredients:'메밀면, 쯔유', reason:'쯔유의 짭짤함과 차가운 성질이 끓어오르는 열을 잠재웁니다.'},
    {name:'연어 스테이크', ingredients:'연어, 딜(허브)', reason:'깊은 물속을 헤엄치는 연어의 기름기가 수(水)를 채웁니다.'},
    {name:'클램 차우더 조개찜', ingredients:'바지락, 화이트와인', reason:'조개의 감칠맛과 짠기운이 신장을 보양합니다.'},
    {name:'참치 포케', ingredients:'생참치, 간장소스, 해조류', reason:'심해의 생명력과 간장의 짠맛이 아주 좋은 조화를 이룹니다.'},
    {name:'블랙 올리브 타페나드', ingredients:'블랙 올리브, 케이퍼', reason:'짭조름한 검은 올리브 페이스트가 수(水) 에너지를 돋웁니다.'},
    {name:'아사이볼', ingredients:'아사이베리, 견과류', reason:'보랏빛/검은색 항산화 베리가 신장과 혈관을 청소해줍니다.'},
    {name:'간장 게장', ingredients:'꽃게, 간장', reason:'전통 짠맛의 최강자로 잃어버린 수(水) 기운의 입맛을 되찾습니다.'},
    {name:'프레첼', ingredients:'밀가루, 굵은 소금', reason:'표면의 소금(수) 알갱이가 즉각적으로 짠맛을 전달하여 갈증을 풉니다.'}
  ]
};

var HEALTH_EXERCISE_DB = {
  wood: {
    name: '유연성 & 스트레칭',
    desc: '목(木) 기운은 뻗어나가는 성질이 있습니다. 근육과 인대를 길게 늘려주는 운동이 좋습니다.',
    types: ['요가', '필라테스', '맨몸 스트레칭', '가벼운 등산', '숲속 산책'],
    stretch: '양팔을 위로 쭉 뻗고 옆구리를 길게 늘려주는 "반달 자세"로 간/담 경락을 자극하세요.'
  },
  fire: {
    name: '심박수 UP 유산소',
    desc: '화(火) 기운은 폭발하고 땀을 내는 성질입니다. 심장을 뛰게 하는 동적인 운동이 좋습니다.',
    types: ['러닝', '에어로빅', '줌바 댄스', '테니스', '배드민턴'],
    stretch: '가슴을 활짝 펴고 등 뒤로 깍지를 끼는 "가슴 열기 스트레칭"으로 심장 경락을 열어주세요.'
  },
  earth: {
    name: '코어 & 그라운딩',
    desc: '토(土) 기운은 중심을 잡고 안정시키는 성질입니다. 코어를 단련하고 땅과 접지하는 운동이 좋습니다.',
    types: ['플랭크', '맨발 걷기(어싱)', '클라이밍', '웨이트 트레이닝', '코어 밸런스'],
    stretch: '바닥에 누워 무릎을 가슴으로 당기는 "바람 빼기 자세"로 비위(소화기)를 편안하게 마사지하세요.'
  },
  metal: {
    name: '호흡 & 집중력',
    desc: '금(金) 기운은 수렴하고 규칙적인 성질입니다. 호흡을 통제하고 집중력을 요하는 운동이 좋습니다.',
    types: ['명상 호흡', '검도', '복싱', '자전거 타기', '기공/태극권'],
    stretch: '양팔을 뒤로 뻗어 가슴과 어깨 앞쪽을 늘려주는 동작으로 폐활량을 극대화하세요.'
  },
  water: {
    name: '수중 운동 & 이완',
    desc: '수(水) 기운은 흐르고 유연한 성질입니다. 물과 함께하거나 관절에 무리가 없는 운동이 좋습니다.',
    types: ['수영', '아쿠아로빅', '서핑', '반신욕 후 스트레칭', '태극권'],
    stretch: '앉아서 발끝을 향해 상체를 숙이는 "전굴 자세"로 허리와 신장(방광) 경락을 이완시키세요.'
  }
};

var GAEUN_DB={
  fire:{
    good:{love:'열정적인 만남의 시기. 적극적으로 다가가세요. 붉은색 계열 의상이 매력을 높입니다.',wealth:'사업 확장, 투자 적기. 특히 IT, 에너지 분야가 유망합니다.',relationship:'리더십이 빛나는 시기. 주변에 긍정 에너지를 나눠주세요.',career:'승진, 이직 기회가 많습니다. 프레젠테이션 능력을 발휘하세요.',health:'심장, 혈압 수호 중요. 과로 주의하고 충분한 휴식 필요.',lifestyle:'남향 거실, 붉은색 소품, 캠핑이나 BBQ 등 불을 다루는 여가활동 추천.'},
    bad:{love:'감정 기복 주의. 급하게 결정하지 말고 시간을 두고 판단하세요.',wealth:'충동 소비 경계. 투기적 투자는 피하고 안전자산 선호.',relationship:'말다툼 조심. 한 템포 쉬었다 대화하는 습관 기르기.',career:'상사와 충돌 가능성. 감정 조절 필수. 멘토 조언 구하기.',health:'스트레스성 두통, 불면증 주의. 명상, 요가로 마음 다스리기.',lifestyle:'시원한 수영, 물가 산책 추천. 파란색, 검은색 의상으로 기운 조절.'}
  },
  water:{
    good:{love:'깊이 있는 감정 교류의 시기. 진실된 대화로 관계 깊어집니다.',wealth:'유통, 물류, 콘텐츠 분야 투자 유망. 현금 유동성 확보 시기.',relationship:'경청 능력이 빛나며 신뢰 쌓기 좋은 때. 네트워킹 활발.',career:'기획, 천기 업무에서 역량 발휘. 해외 업무 기회 증가.',health:'신장, 방광 케어. 충분한 수분 섭취와 따뜻하게 보온.',lifestyle:'북향 공간, 검은색·파란색 인테리어. 온천, 해변 여행 추천.'},
    bad:{love:'우유부단함 주의. 명확한 의사표현 필요. 과거에 얽매이지 말기.',wealth:'돈의 흐름 불안정. 과소비 경계하고 비상금 확보.',relationship:'소극적 태도 개선 필요. 먼저 다가가는 용기 내기.',career:'우울감, 무기력 주의. 작은 목표 설정하고 성취감 쌓기.',health:'냉증, 순환기 계통 주의. 운동으로 체온 올리고 따뜻한 음식 섭취.',lifestyle:'햇볕 쬐기, 따뜻한 차 마시기. 붉은색 계열 소품으로 활력 더하기.'}
  },
  wood:{
    good:{love:'자연스러운 만남과 성장하는 관계. 함께 배우고 발전하는 커플.',wealth:'교육, 문화, 바이오 분야 투자 유망. 장기 성장 천기 수립.',relationship:'포용력으로 주변을 편안하게. 멘토 역할 기회 많음.',career:'새로운 프로젝트 시작 적기. 학습, 자격증 취득 추천.',health:'간, 담낭 건강 수호. 스트레칭과 요가로 유연성 키우기.',lifestyle:'동향 공간, 녹색 식물 키우기. 숲속 산책, 등산 추천.'},
    bad:{love:'이상만 높고 실천 부족 주의. 현실적 선택과 행동 필요.',wealth:'계획만 세우고 실행 부족. 작은 것부터 시작하기.',relationship:'고집 부리지 말고 타협점 찾기. 유연한 사고 필요.',career:'완벽주의 버리기. 70% 완성도에서 실행하는 용기.',health:'소화기 계통 주의. 과식 피하고 규칙적 식사 습관.',lifestyle:'금속 소품 활용. 서쪽 햇살 받기. 미니멀 라이프스타일 지향.'}
  },
  metal:{
    good:{love:'명확한 관계 정립 시기. 결혼, 약속 등 확정적 결정 적기.',wealth:'금융, 부동산, 법률 분야 기회. 계약서 검토 철저히.',relationship:'원칙과 공정함으로 신뢰 얻음. 중재자 역할 적합.',career:'수호, 감독 업무 역량 발휘. 성궁 진법 구축 프로젝트 성공.',health:'폐, 대장 건강 챙기기. 호흡기 질환 예방 필수.',lifestyle:'서향 공간, 흰색·회색 인테리어. 정리정돈으로 기운 상승.'},
    bad:{love:'너무 차갑거나 냉정한 태도 주의. 감성적 교류 노력.',wealth:'지나친 절약은 독. 필요한 곳엔 과감한 투자 필요.',relationship:'비판적 시선 줄이기. 칭찬과 격려 먼저 하기.',career:'융통성 부족 개선. 때론 원칙보다 관계가 중요.',health:'건조함 주의. 가습기 사용, 수분 크림으로 보습.',lifestyle:'따뜻한 색감 소품 추가. 감성 영화, 음악으로 마음 열기.'}
  },
  earth:{
    good:{love:'안정적 관계 유지. 가족 같은 편안함. 동거, 결혼 적기.',wealth:'부동산, 건설, 식품 분야 유망. 저축과 자산 축적 시기.',relationship:'신뢰받는 조력자. 주변의 든든한 버팀목 역할.',career:'꾸준함이 인정받음. 장기 프로젝트 완수 능력 발휘.',health:'위장, 비장 건강 챙기기. 규칙적 생활 습관 중요.',lifestyle:'중앙 배치, 노란색·갈색 톤 인테리어. 도예, 요리 취미 추천.'},
    bad:{love:'지루함 탈피 필요. 새로운 데이트 코스, 이벤트 기획.',wealth:'변화 두려워 말기. 새로운 수익 모델 탐색 필요.',relationship:'폐쇄적 태도 개선. 새로운 인맥 형성 노력.',career:'안주하지 말고 도전. 자기계발 투자 시작.',health:'체중 수호, 당뇨 주의. 유산소 운동 규칙적으로.',lifestyle:'활동적 여가 늘리기. 여행, 새로운 장소 탐험 추천.'}
  }
};

/* ─── 자미두수 12궁 데이터 ─── */
var MING_GONG={
  '寅':{title:'자미(紫微) — 지도자형',desc:'뛰어난 카리스마와 주체성을 타고났습니다. 어떤 상황에서도 중심을 잡는 리더십이 자연스럽게 발휘되며, 사람들은 무의식적으로 당신에게 기대고 싶어합니다. 완고함이 인간관계의 장벽이 될 수 있으니 부드러움을 배울 때 진정한 어른이 됩니다.',tags:['지도자','카리스마','독립심']},
  '卯':{title:'탐랑(貪狼) — 매력·창조형',desc:'넘치는 감각과 예술적 재능이 당신의 무기입니다. 사람을 자연스럽게 끌어당기는 매력이 있고 새로운 것을 탐구하는 에너지가 강합니다. 즐거움을 좇다 방향성을 잃을 수 있으니 목표의식을 함께 가지는 것이 핵심입니다.',tags:['매력','탐구심','창조성']},
  '辰':{title:'거문(巨門) — 통찰·분석형',desc:'깊은 사고력과 예리한 통찰력을 지닌 분석가입니다. 진실을 꿰뚫는 언어와 글쓰기에 재능이 있으며 한번 믿음이 쌓이면 평생의 신뢰 관계를 만들어냅니다. 의심이 많아 좋은 기회를 흘려보낼 수 있으니 직관도 함께 믿어주세요.',tags:['통찰','분석','언어력']},
  '巳':{title:'천상(天相) — 조화·협력형',desc:'사람과 사람을 잇는 뛰어난 조화로움이 있습니다. 공정하고 따뜻한 성품으로 모든 이에게 신뢰를 받으며 갈등을 중재하는 능력이 탁월합니다. 남을 위해 자신을 희생하는 경향이 있으니 자신의 경계를 지키는 연습이 필요합니다.',tags:['조화','공정함','배려']},
  '午':{title:'천동(天同) — 평화·행복형',desc:'삶의 행복과 감사를 자연스럽게 느끼는 특별한 능력을 가졌습니다. 낙천적인 기운으로 주변을 밝히며 순수함이 평생의 매력 포인트입니다. 안주하려는 성향이 있어 때로는 스스로를 더 밀어붙이는 용기가 필요합니다.',tags:['평화','낙천성','순수함']},
  '未':{title:'염정(廉貞) — 열정·천기형',desc:'강렬한 열정과 냉철한 천기가 공존하는 독특한 조합입니다. 목표를 향한 집념이 강하고 불의에 맞서는 용기가 있습니다. 흑백논리가 강해 관계에서 상처를 주고받을 수 있으니 유연함을 키워가세요.',tags:['열정','천기','추진력']},
  '申':{title:'천부(天府) — 풍요·안정형',desc:'자연스럽게 풍요를 끌어당기는 복의 기운을 타고났습니다. 현실적인 판단력이 뛰어나고 재물을 다루는 감각이 좋습니다. 변화보다 안정을 선호하는 보수적 성향이 있어 새로운 기회 앞에서 용기 있는 한 걸음이 필요합니다.',tags:['풍요','안정','현실감각']},
  '酉':{title:'태음(太陰) — 감수성·직관형',desc:'섬세한 감수성과 깊은 내면세계를 가진 분입니다. 아름다움을 발견하는 눈이 탁월하고 강한 직관으로 상황의 본질을 꿰뚫습니다. 감정의 파도가 클 수 있으니 자신의 감정을 창의적으로 표현하는 출구를 만들어두세요.',tags:['감수성','직관','심미안']},
  '戌':{title:'탐랑 변형 — 도전·개혁형',desc:'기존 틀을 깨는 혁신적인 에너지가 넘칩니다. 새로운 분야에 대한 탐구심과 도전 정신이 강하며 예상치 못한 방향에서 성공을 거두는 경우가 많습니다. 끈기를 기른다면 독보적인 위치를 만들 수 있습니다.',tags:['도전','혁신','탐구']},
  '亥':{title:'무곡(武曲) — 독립·실행형',desc:'강인한 의지와 독립적인 실행력을 타고난 행동파입니다. 말보다 행동으로 증명하는 스타일이며 한번 결심하면 끝까지 밀고 나가는 뚝심이 있습니다. 고집이 세어 도움을 거절하는 경향이 있으니 때로는 타인의 손을 잡는 여유를 가져보세요.',tags:['독립심','실행력','뚝심']},
  '子':{title:'파군(破軍) — 변혁·개척형',desc:'현 상태에 안주하지 않는 강렬한 개척자의 기질이 있습니다. 낡은 것을 부수고 새로운 세계를 여는 선구자 타입으로 인생의 굵직한 변환점에서 빛나는 분입니다. 파괴적인 에너지를 창조적으로 전환하는 법을 익힐 때 진가를 발휘합니다.',tags:['개척','변혁','선구자']},
  '丑':{title:'천기(天機) — 지혜·천기형',desc:'민첩한 두뇌와 뛰어난 천기적 사고를 가진 분입니다. 다양한 분야에 폭넓은 지식을 갖추고 상황 변화에 빠르게 적응합니다. 생각이 너무 많아 산만해 보일 수 있으니 집중하고 싶은 한 가지를 깊게 파고드는 시간이 필요합니다.',tags:['지혜','민첩성','천기']}
};
var BODEOK={
  wood:{star:'천기성(天機星)',title:'성장과 탐구에서 행복 찾기',desc:'새로운 지식을 습득하고 자연과 가까이할 때 가장 큰 정신적 충만함을 느끼는 유형입니다. 독서, 여행, 배움의 연속이 당신의 영혼을 살찌웁니다. 정체되어 있다고 느낄 때가 가장 힘든 시기이므로 항상 성장의 방향을 향해 있어야 합니다.'},
  fire:{star:'태양성(太陽星)',title:'표현과 나눔에서 행복 찾기',desc:'자신의 생각과 열정을 표현하고 주변에 에너지를 나눌 때 행복을 느끼는 유형입니다. 무대나 무언가를 이끄는 역할에서 생동감이 솟구칩니다. 인정받고 싶은 욕구가 강하니 그 에너지를 긍정적 방향으로 활용하세요.'},
  earth:{star:'천부성(天府星)',title:'안정과 풍요에서 행복 찾기',desc:'실질적인 안정감과 물질적 풍요에서 정신적 평화를 얻는 현실주의형입니다. 가족과 함께하는 일상, 맛있는 음식, 안락한 공간이 당신에게 가장 소중한 행복입니다. 무리한 모험보다 꾸준한 축적이 삶을 빛나게 합니다.'},
  metal:{star:'무곡성(武曲星)',title:'성취와 완성에서 행복 찾기',desc:'목표를 달성하고 자신이 세운 기준에 도달했을 때 가장 큰 만족감을 느끼는 유형입니다. 명예와 성과에 대한 욕구가 강하며, 자신이 만든 것에 자부심을 갖습니다. 과정보다 결과에 집착하는 경향이 있으니 여정 자체도 즐기는 연습이 필요합니다.'},
  water:{star:'천동성(天同星)',title:'교류와 감성에서 행복 찾기',desc:'사람들과의 깊은 감정적 교류와 예술적 감수성에서 정신적 행복을 찾는 유형입니다. 음악, 문학, 영화가 당신의 영혼에 깊이 닿습니다. 고독을 즐길 줄 알면서도 진심으로 연결되는 관계 하나하나가 소중한 보물입니다.'}
};
var JAEBAEK={
  wood:{star:'탐랑성(貪狼星)',title:'성장 분야에서 재물이 온다',desc:'교육, 문화, 바이오, 친환경 분야에서 부를 창출하는 운입니다. 장기적 관점으로 키워나가는 사업이나 투자가 맞으며, 단기 투기는 피하는 것이 좋습니다. 지식과 네트워크가 돈이 되는 구조입니다.'},
  fire:{star:'태양성(太陽星)',title:'열정과 표현력이 재물로 연결된다',desc:'IT, 에너지, 미디어, 엔터테인먼트 분야에서 큰 수익을 낼 수 있는 운입니다. 자신의 능력을 적극적으로 알리고 브랜드화하는 것이 부의 핵심 천기입니다. 리더십을 발휘할 때 재물이 따라옵니다.'},
  earth:{star:'천부성(天府星)',title:'부동산과 실물자산에서 복이 온다',desc:'부동산, 식품, 건설, 농업 관련 분야에서 안정적인 수익을 기대할 수 있는 운입니다. 급격한 투기보다 착실한 저축과 실물 자산 축적이 진정한 부를 만들어줍니다.'},
  metal:{star:'무곡성(武曲星)',title:'전문성과 규율에서 재물이 온다',desc:'금융, 법률, 의료, 정밀 기술 분야에서 두각을 나타내는 운입니다. 전문 자격증과 신뢰가 가장 강력한 수입원이 됩니다. 계약과 법적 근거를 철저히 확인하는 습관이 재산 보호의 핵심입니다.'},
  water:{star:'천동성(天同星)',title:'유통과 흐름에서 재물이 온다',desc:'유통, 무역, 관광, 콘텐츠 플랫폼 분야에서 수익 기회가 많습니다. 돈의 흐름을 읽는 감각이 뛰어나며, 적절한 현금 유동성 수호가 재물의 핵심입니다. 인맥이 재물로 이어지는 구조입니다.'}
};
var GWALROK={
  strong:{star:'칠살성(七殺星)',title:'독립과 개척으로 성공',desc:'강한 주체성을 가진 당신은 남의 지시를 받기보다 자신만의 영역을 구축할 때 진정한 능력을 발휘합니다. 창업, 프리랜서, 전문직이 맞으며 자신의 이름을 건 사업에서 빛납니다. 강한 에너지를 사회로 발산하는 구조가 최고의 성공 공식입니다.'},
  weak:{star:'태음성(太陰星)',title:'협력과 신뢰로 성공',desc:'뛰어난 공감 능력과 섬세한 감수성이 당신의 직업적 무기입니다. 팀워크와 협력 구조 안에서 조력자를 만날 때 성과가 극대화됩니다. 상담, 교육, 예술, 서비스직에서 천재성을 발휘합니다.'},
  jong:{star:'자미성(紫微星)',title:'한 분야 집중으로 정상에 선다',desc:'한 가지 오행이 압도적으로 지배하는 종격 사주는 그 방향으로만 집중할 때 최고의 성과를 냅니다. 분산하지 말고 자신이 타고난 강점 한 가지를 극한까지 발전시키세요. 역발상과 전문성이 당신을 정상에 세울 것입니다.'}
};
var BUCHEO={
  F:{star:'정관성(正官星)',title:'다정하고 책임감 강한 배우자 인연',desc:'여성의 부처궁에는 믿음직스럽고 사회적으로 안정된 배우자 인연이 흐릅니다. 처음 만났을 때 설레기보다 시간이 지날수록 더 소중해지는 타입의 인연입니다. 인연은 예상치 못한 일상 속에서 자연스럽게 찾아옵니다.'},
  M:{star:'정관성(正官星)',title:'신뢰와 책임감 있는 배우자 인연',desc:'남성의 부처궁에는 자신을 현실적으로 지지해주고 안정감을 주는 배우자 인연이 흐릅니다. 도덕적이고 예의 바른 분이 나타날 가능성이 높습니다. 너무 이상형에 집착하기보다 꾸준히 곁에서 성장하는 관계를 소중히 여기세요.'}
};

var BUMOGUN={
  wood:{star:'천기성(天機星)',title:'성장 지향형 부모·선배 인연',
    desc:'부모님과 선배로부터 지식, 교육, 성장 기회를 받는 유형입니다. 배움을 중시하고 새로운 가능성을 열어주는 귀인이 나타납니다. 부모님은 자녀의 독립심과 자율성을 존중하는 편이며, 적절한 시기에 중요한 조언을 건네줍니다. 선배들과의 관계에서도 멘토-멘티의 긍정적인 에너지가 흐르며, 위로부터의 지원이 성장의 발판이 됩니다.',
    note:'부모·선배와의 관계에서 받는 가르침을 소중히 여기고 적극 흡수할 것을 권합니다.'},
  fire:{star:'태양성(太陽星)',title:'활동적·사교적 부모·선배 인연',
    desc:'부모님과 선배로부터 열정과 사회성을 물려받는 유형입니다. 사교적이고 활동적인 부모님 덕분에 다양한 인맥과 기회를 접하게 됩니다. 집안 분위기가 활기차고 대외적으로 인정받는 경우가 많습니다. 선배들은 진취적인 도전 정신을 자극해주는 존재입니다. 다만 부모님의 기대가 높을 수 있어 때로는 압박을 느낄 수 있습니다.',
    note:'부모님의 사회적 인맥이 당신에게 중요한 기회가 됩니다. 긍정적으로 활용하세요.'},
  earth:{star:'천부성(天府星)',title:'안정·헌신형 부모·선배 인연',
    desc:'부모님과 선배로부터 헌신과 안정의 기운을 받는 유형입니다. 부모님은 현실적이고 실용적인 지원을 아끼지 않으며, 물질적·정서적으로 든든한 버팀목이 됩니다. 가업을 잇거나 부모님의 기반을 계승하는 경우도 있습니다. 선배들과의 관계에서는 신뢰와 안정을 기반으로 한 장기적인 유대감이 형성됩니다.',
    note:'부모님의 실질적인 도움이 인생의 중요한 자원이 됩니다. 효도와 감사를 잊지 마세요.'},
  metal:{star:'무곡성(武曲星)',title:'원칙·엄격형 부모·선배 인연',
    desc:'부모님과 선배로부터 엄격함과 원칙을 배우는 유형입니다. 다소 엄격한 가정환경에서 자란 경우가 많으며, 이것이 강한 자기 수호 능력과 책임감의 원천이 됩니다. 부모님의 높은 기준이 부담스러울 수 있지만, 결국 사회에서 빛나는 경쟁력으로 이어집니다. 선배들과는 공식적이고 수직적인 관계에서 성장합니다.',
    note:'부모님의 엄격한 가르침이 오히려 당신을 강하게 만든 힘입니다.'},
  water:{star:'천동성(天同星)',title:'감성·지지형 부모·선배 인연',
    desc:'부모님과 선배로부터 감성적 공감과 정서적 지지를 받는 유형입니다. 부모님은 자녀의 감정을 세심하게 살피고 마음의 짐을 함께 나누는 타입입니다. 예술적 감수성이나 창의성을 인정받고 자란 경우가 많습니다. 선배들과의 관계에서도 감정적 유대가 깊고, 힘든 시기에 진심어린 위로를 받는 인연이 따릅니다.',
    note:'부모님의 정서적 지지가 당신의 큰 힘입니다. 마음을 열고 소통하면 더 큰 사랑을 받습니다.'}
};
var JANYEOGUN_DATA={
  wood:{star:'탐랑성(貪狼星)',title:'성장·창의형 자녀·후배 인연',
    desc:'자녀 및 후배는 호기심이 왕성하고 창의적인 유형이 인연으로 연결됩니다. 새로운 것을 탐구하고 자유롭게 성장하도록 지지해주는 것이 좋습니다. 자녀는 교육, 예술, 창작 분야에서 뛰어난 잠재력을 보일 수 있습니다. 후배들과의 관계에서는 당신의 경험을 나누고 함께 성장하는 동반자적 유대가 형성됩니다.',
    note:'자녀와 후배의 창의성을 억누르지 말고 다양한 경험의 기회를 열어주세요.'},
  fire:{star:'태양성(太陽星)',title:'활동적·리더형 자녀·후배 인연',
    desc:'자녀 및 후배는 활발하고 리더십 기질을 타고난 경우가 많습니다. 사교성이 뛰어나고 주변의 주목을 받는 타입과 인연을 맺습니다. 자녀가 사회적으로 두각을 나타낼 가능성이 높으며, 든든한 지원자가 되어주면 그 빛이 더욱 발합니다. 후배들에게는 활력 넘치는 멘토로 기억될 것입니다.',
    note:'자녀·후배의 에너지를 긍정적으로 활용하고 사회 진출을 지원해주세요.'},
  earth:{star:'천부성(天府星)',title:'안정·현실형 자녀·후배 인연',
    desc:'자녀 및 후배는 현실적이고 성실한 성격의 유형이 인연으로 다가옵니다. 안정을 추구하고 착실하게 성장하는 스타일이며, 일찍부터 실용적인 가치관을 형성합니다. 자녀는 부모의 현실적 지원 덕분에 탄탄한 기반을 갖출 수 있습니다. 후배들과는 믿음직스럽고 신뢰를 바탕으로 한 관계가 이어집니다.',
    note:'자녀·후배에게 안정적인 환경과 실질적인 지원을 아끼지 마세요.'},
  metal:{star:'무곡성(武曲星)',title:'독립적·원칙형 자녀·후배 인연',
    desc:'자녀 및 후배는 독립심이 강하고 원칙에 철저한 유형이 많습니다. 자기 주관이 뚜렷하여 간섭보다는 믿음과 존중으로 접근해야 합니다. 경쟁적인 환경에서 빛나는 성취욕을 가진 자녀가 인연으로 연결됩니다. 후배들에게는 명확한 기준과 공정한 태도로 대하면 진심 어린 신뢰를 얻게 됩니다.',
    note:'자녀·후배의 독립심을 존중하되, 필요할 때 원칙과 방향을 제시해주세요.'},
  water:{star:'천동성(天同星)',title:'감수성·사려형 자녀·후배 인연',
    desc:'자녀 및 후배는 감수성이 풍부하고 배려심 깊은 유형과 인연을 맺습니다. 예술적 재능이나 공감 능력이 뛰어난 자녀가 연결될 가능성이 높습니다. 감정적으로 섬세하니 따뜻하고 지지적인 환경을 만들어주는 것이 중요합니다. 후배들과의 관계에서는 정서적 유대가 깊고 진심 어린 소통이 이루어집니다.',
    note:'자녀·후배의 감수성과 내면세계를 존중하고 정서적 지원을 충분히 해주세요.'}
};

var GENDER='F', USER_NAME='', BIRTH_YEAR=0, DAY_GAN='', JOHU_TYPE='', JOHU_SCORE=0, CURRENT_AGE=0;
var G_POWER=null, G_JONG=null, G_JOHU=null;
var G_PILLARS=null, G_NATAL=null, G_BAZI=null;
window._ziweiBirth={year:0,month:0,day:0,hour:12,minute:0};
window._astroBirth={year:0,month:0,day:0,hour:12,minute:0,lat:37.6,lon:127.0,tz:9};

function _dfSafeNumber(v, fallback) {
  var n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function _dfCloneElementWeights(natal) {
  var zero = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (!natal || !natal.ratios || typeof natal.ratios !== 'object') return zero;
  return {
    wood: Number(_dfSafeNumber(natal.ratios.wood, 0).toFixed(1)),
    fire: Number(_dfSafeNumber(natal.ratios.fire, 0).toFixed(1)),
    earth: Number(_dfSafeNumber(natal.ratios.earth, 0).toFixed(1)),
    metal: Number(_dfSafeNumber(natal.ratios.metal, 0).toFixed(1)),
    water: Number(_dfSafeNumber(natal.ratios.water, 0).toFixed(1))
  };
}

function _dfSeasonFromMonthBranch(branch) {
  if (branch === '寅' || branch === '卯' || branch === '辰') return 'Spring';
  if (branch === '巳' || branch === '午' || branch === '未') return 'Summer';
  if (branch === '申' || branch === '酉' || branch === '戌') return 'Autumn';
  if (branch === '亥' || branch === '子' || branch === '丑') return 'Winter';
  return '';
}

function _dfInferWaterLevel(weights, johuType) {
  var water = _dfSafeNumber(weights && weights.water, 0);
  if (johuType === 'hot' || johuType === 'warm') {
    return water >= 22 ? 'balanced' : 'low';
  }
  if (johuType === 'cold' || johuType === 'cool') {
    return water >= 20 ? 'high' : 'balanced';
  }
  if (water >= 28) return 'high';
  if (water <= 15) return 'low';
  return 'balanced';
}

function _dfInferEnvironment(weights, season) {
  var wood = _dfSafeNumber(weights && weights.wood, 0);
  var fire = _dfSafeNumber(weights && weights.fire, 0);
  var earth = _dfSafeNumber(weights && weights.earth, 0);
  var metal = _dfSafeNumber(weights && weights.metal, 0);
  var water = _dfSafeNumber(weights && weights.water, 0);

  if (water >= 30) return season === 'Winter' ? 'Lake' : 'Pond';
  if (metal >= 30 && earth >= 22) return 'Rock';
  if (fire >= 32 && water <= 15) return 'Desert';
  if (wood >= 30) return 'Forest';
  if (earth >= 30) return 'Field';
  return 'Garden';
}

function _dfArrayCopy(v) {
  return Array.isArray(v) ? v.slice() : [];
}

function _syncDestinyFlowerSajuSnapshot(reason) {
  try {
    if (!G_PILLARS || !G_NATAL) return null;
    var weights = _dfCloneElementWeights(G_NATAL);
    var season = _dfSeasonFromMonthBranch(G_PILLARS.m && G_PILLARS.m.j) || '';
    var johuType = (G_JOHU && G_JOHU.type) ? String(G_JOHU.type) : '';
    var waterLevel = _dfInferWaterLevel(weights, johuType);
    var environment = _dfInferEnvironment(weights, season);
    var yongshin = _dfArrayCopy(G_POWER && G_POWER.yongshin);
    var kishin = _dfArrayCopy(G_POWER && G_POWER.kijishin);
    var dayStem = (G_PILLARS.d && G_PILLARS.d.g) || DAY_GAN || '';
    var dayStemElement = (G_PILLARS.d && G_PILLARS.d.gE) || '';
    // snapshot birth must align with profile.birth (civil/original time),
    // otherwise sameBirth() rejects snapshot due minute/hour mismatch.
    var birth = window._astroBirth || window._ziweiBirth || {};

    var snapshot = {
      updatedAt: new Date().toISOString(),
      reason: reason || 'runtime-sync',
      name: USER_NAME || '',
      gender: GENDER || '',
      birth: {
        year: _dfSafeNumber(birth.year, 0),
        month: _dfSafeNumber(birth.month, 0),
        day: _dfSafeNumber(birth.day, 0),
        hour: _dfSafeNumber(birth.hour, 12),
        minute: _dfSafeNumber(birth.minute, 0)
      },
      elementWeights: weights,
      dayStem: dayStem,
      dayStemElement: dayStemElement,
      season: season,
      environment: environment,
      water_level: waterLevel,
      analysis: {
        elementWeights: weights,
        season: season,
        environment: environment,
        water_level: waterLevel,
        dayStem: dayStem,
        dayStemElement: dayStemElement,
        yongshin_elements: yongshin,
        kishin_elements: kishin,
        isStrong: !!(G_POWER && G_POWER.isStrong),
        power_label: (G_POWER && typeof G_POWER.isStrong === 'boolean') ? (G_POWER.isStrong ? '신강' : '신약') : '',
        johuType: johuType,
        isJong: !!(G_JONG && G_JONG.isJong),
        jongName: (G_JONG && G_JONG.name) ? G_JONG.name : ''
      },
      saju: {
        elementWeights: weights,
        season: season,
        environment: environment,
        water_level: waterLevel,
        dayStem: dayStem,
        dayStemElement: dayStemElement,
        yongshin_elements: yongshin,
        kishin_elements: kishin,
        is_strong: !!(G_POWER && G_POWER.isStrong),
        power_label: (G_POWER && typeof G_POWER.isStrong === 'boolean') ? (G_POWER.isStrong ? '신강' : '신약') : '',
        johu_type: johuType,
        notes: []
      }
    };

    if (snapshot.analysis.isJong && snapshot.analysis.jongName) {
      snapshot.saju.notes.push('종격 판정: ' + snapshot.analysis.jongName);
    }
    if (johuType) {
      snapshot.saju.notes.push('조후 판정: ' + johuType);
    }

    window.__destinyFlowerSajuSnapshot = snapshot;
    return snapshot;
  } catch (syncErr) {
    console.warn('[DestinyFlower] 사주 스냅샷 동기화 실패:', syncErr);
    return null;
  }
}

function _clearDestinyFlowerSajuSnapshot() {
  try {
    window.__destinyFlowerSajuSnapshot = null;
  } catch (e) {}
}

/* ── 모달 전용: 분석 페이지 이동 없이 프로필 데이터로 전역 변수 계산 ── */
window.computeProfileForModal = function(profile) {
  if (!profile || !profile.birth) return false;
  var b = profile.birth, l = profile.location || {};
  var year = b.year, month = b.month, day = b.day;
  var calType = b.calType || 'solar';
  if ((calType === 'lunar' || calType === 'lunar_leap') && year && month && day && KasiEngine && typeof KasiEngine.lunarToSolar === 'function') {
    try {
      var conv = KasiEngine.lunarToSolar(year, month, day, calType === 'lunar_leap');
      if (conv && conv.year && conv.month && conv.day) {
        year = Number(conv.year);
        month = Number(conv.month);
        day = Number(conv.day);
      }
    } catch (e) {}
  }
  var hour   = (b.hour   != null) ? b.hour   : 12;
  var minute = (b.minute != null) ? b.minute : 0;
  var lat    = (l.lat    != null) ? l.lat    : 37.6;
  var lng    = (l.lng    != null) ? l.lng    : 127.0;
  var baseTzOff = (l.baseTzOffset != null) ? l.baseTzOffset : ((l.tzOffset != null) ? l.tzOffset : 9);
  var tzName = l.tz || 'Asia/Seoul';
  var resolvedTz = resolveBirthTimezoneOffset(year, month, day, hour, minute, tzName, baseTzOff);
  var tzOff  = resolvedTz.tzOffsetHours;

  // 점성술은 표준시(민간시각) 기준으로 계산한다.
  window._astroBirth = {
    year: year, month: month, day: day,
    hour: hour, minute: minute,
    lat: lat, lon: lng, tz: tzOff
  };

  /* 진태양시 보정 */
  var corrH = hour, corrM = minute;
  if (window.DestinyProfileManager && window.DestinyProfileManager.calcTrueSolarOffset) {
    var offMin = window.DestinyProfileManager.calcTrueSolarOffset(lng, tzOff);
    var total  = ((hour * 60 + minute - offMin) % 1440 + 1440) % 1440;
    corrH = Math.floor(total / 60);
    corrM = total % 60;
  }

  window._ziweiBirth = { year: year, month: month, day: day,
    hour: corrH, minute: corrM, lat: lat, lon: lng, tz: tzOff };

  if (typeof setGender === 'function') setGender(profile.gender || 'F');
  GENDER = profile.gender || 'F';

  if (typeof Solar === 'undefined' || typeof Solar.fromYmdHms !== 'function') return false;
  try {
    var solar = Solar.fromYmdHms(year, month, day, corrH, corrM, 0);
    var bazi  = solar.getLunar().getEightChar();
    try {
      var _d  = new Date(year, month - 1, day, corrH, corrM);
      var _gj = KasiEngine.getGanji(_d);
      if (_gj && _gj.secha && _gj.weolgeon && _gj.iljin) {
        bazi.getYearGan  = function() { return _gj.secha[0]; };
        bazi.getYearZhi  = function() { return _gj.secha[1]; };
        bazi.getMonthGan = function() { return _gj.weolgeon[0]; };
        bazi.getMonthZhi = function() { return _gj.weolgeon[1]; };
        bazi.getDayGan   = function() { return _gj.iljin[0]; };
        bazi.getDayZhi   = function() { return _gj.iljin[1]; };
      }
    } catch(e) {}

    var yg=bazi.getYearGan(), yz=bazi.getYearZhi();
    var mg=bazi.getMonthGan(), mz=bazi.getMonthZhi();
    var dg=bazi.getDayGan(),   dz=bazi.getDayZhi();
    var hg=bazi.getTimeGan(),  hz=bazi.getTimeZhi();
    var p = {
      y:{g:yg,j:yz,gE:(GAN[yg]||{}).e,jE:(JI[yz]||{}).e},
      m:{g:mg,j:mz,gE:(GAN[mg]||{}).e,jE:(JI[mz]||{}).e},
      d:{g:dg,j:dz,gE:(GAN[dg]||{}).e,jE:(JI[dz]||{}).e},
      h:{g:hg,j:hz,gE:(GAN[hg]||{}).e,jE:(JI[hz]||{}).e}
    };
    var natal = calcNatalElement(p);
    G_PILLARS = p;  G_NATAL = natal;  G_BAZI = bazi;
    if (typeof analyzeJohu === 'function') G_JOHU = analyzeJohu(p);
    if (typeof calcPower  === 'function') G_POWER = calcPower(p);
    if (typeof detectJong === 'function') G_JONG = detectJong(p);
    _syncDestinyFlowerSajuSnapshot('modal-profile');
    return { p: p, natal: natal, bazi: bazi };
  } catch(e) {
    console.error('[Modal] 프로필 계산 오류:', e);
    return false;
  }
};
const ZHI_FEAT={
  '子':'쥐띠: 영리하고 순발력이 뛰어나다',
  '丑':'소띠: 근면성실하며 인내심이 강하다',
  '寅':'호랑이띠: 용맹하고 도전정신이 대단하다',
  '卯':'토끼띠: 온화하고 예민한 감성을 가졌다',
  '辰':'용띠: 권위와 통찰력을 갖추었다',
  '巳':'뱀띠: 신비롭고 직관력이 뛰어나다',
  '午':'말띠: 활발하고 자유로운 기운을 지녔다',
  '未':'양띠: 온순하고 협력적인 성향이다',
  '申':'원숭이띠: 영리하고 재치가 넘친다',
  '酉':'닭띠: 규칙적이고 철저한 성향이다',
  '戌':'개띠: 충성스럽고 정의감이 강하다',
  '亥':'돼지띠: 관대하고 포용력이 큰 편이다'
};
const ZHI_LIST=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
function zwDisplayPalaceName(name){
  return name === '부처궁' ? '부부궁' : name;
}

function calcZiweiPalaces(year, month, day, hour, minute) {
  var solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  var lunar = solar.getLunar();
  var baseDate = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
  var kasiLunar = null;
  try {
    if (KasiEngine && typeof KasiEngine.solarToLunar === 'function') {
      kasiLunar = KasiEngine.solarToLunar(baseDate);
    }
  } catch (_kasiLunarErr) {}

  var lmonth = (kasiLunar && kasiLunar.month) ? Math.abs(Number(kasiLunar.month)) : Math.abs(lunar.getMonth());
  var lday = (kasiLunar && kasiLunar.day) ? Number(kasiLunar.day) : lunar.getDay();
  var isLeap = (kasiLunar && kasiLunar.isLeap != null)
    ? !!kasiLunar.isLeap
    : (typeof lunar.isLeap === 'function' ? lunar.isLeap() : (lunar.getIsLeap ? lunar.getIsLeap() : false));
  var yearGan = lunar.getYearGan();
  var yearZhi = lunar.getYearZhi();
  try {
    if (KasiEngine && typeof KasiEngine.getGanji === 'function') {
      var _kasiGanji = KasiEngine.getGanji(baseDate);
      if (_kasiGanji && _kasiGanji.secha && String(_kasiGanji.secha).length >= 2) {
        yearGan = String(_kasiGanji.secha).charAt(0) || yearGan;
        yearZhi = String(_kasiGanji.secha).charAt(1) || yearZhi;
      }
    }
  } catch (_kasiGanjiErr) {}
  
  var h = hour;
  var hourIdx = (h === 23 || h === 0) ? 0 : Math.floor((h + 1) / 2);
  var hourBranch = ZHI_LIST[hourIdx];
  
  var mengBaseIdx = (2 + lmonth - 1) % 12;
  // 명궁: 월궁 기점에서 시지를 역행 반영 (전통 자미두수 배궁)
  var mengIdx = (mengBaseIdx - hourIdx + 12) % 12;
  // 신궁: 월궁 기점에서 시지를 순행 반영
  var shenIdx = (mengBaseIdx + hourIdx) % 12;

  var PALACE_NAMES = ['명궁','형제궁','부처궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
  var palaces = {};
    var palacesByIndex = [];
  for(var i=0; i<12; i++) {
    var bIdx = (mengIdx - i + 120) % 12;
    palaces[PALACE_NAMES[i]] = ZHI_LIST[bIdx];
    palacesByIndex[bIdx] = PALACE_NAMES[i];
  }

  var GAN_LIST_ZW = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var yg = GAN_LIST_ZW.indexOf(yearGan);
  var inStart = [2, 4, 6, 8, 0][((yg % 5) + 5) % 5];
  var gongGan = {};
  for(var z=0; z<12; z++) gongGan[ZHI_LIST[z]] = GAN_LIST_ZW[(inStart + (z - 2 + 12) % 12) % 10];

  var mgGan = gongGan[ZHI_LIST[mengIdx]];
  var mgZhiIdx = mengIdx;
  var sMap = {'甲':1,'乙':1,'丙':2,'丁':2,'戊':3,'己':3,'庚':4,'辛':4,'壬':5,'癸':5};
  var bMap = {0:1,1:1,2:2,3:2,4:3,5:3,6:1,7:1,8:2,9:2,10:3,11:3};
  var wVal = sMap[mgGan] + bMap[mgZhiIdx];
  if(wVal > 5) wVal -= 5;
  var juMap = {1:3, 2:4, 3:2, 4:6, 5:5};
  var ju = juMap[wVal] || 4;
  var juNames = {2:'수2국(水二局)', 3:'목3국(木三局)', 4:'금4국(金四局)', 5:'토5국(土五局)', 6:'화6국(火六局)'};
  var q = Math.floor(lday / ju);
  var r = lday % ju;
  var add = 0;
  if (r !== 0) {
      add = ju - r;
      q = Math.floor((lday + add) / ju);
  }
  var pos = q; 
  if (add > 0) {
      if (add % 2 === 1) pos = q - add;
      else pos = q + add;
  }
  while(pos <= 0) pos += 12;
  while(pos > 12) pos -= 12;
  var zPos = (pos + 1) % 12;

  var fPos = (16 - zPos) % 12;

  var stars = {};
  for(var i=0; i<12; i++) stars[i] = { main:[], aux:[], bad:[] };

  stars[zPos].main.push('자미');
  stars[(zPos + 11) % 12].main.push('천기');
  stars[(zPos + 9) % 12].main.push('태양');
  stars[(zPos + 8) % 12].main.push('무곡');
  stars[(zPos + 7) % 12].main.push('천동');
  stars[(zPos + 4) % 12].main.push('염정');

  stars[fPos].main.push('천부');
  stars[(fPos + 1) % 12].main.push('태음');
  stars[(fPos + 2) % 12].main.push('탐랑');
  stars[(fPos + 3) % 12].main.push('거문');
  stars[(fPos + 4) % 12].main.push('천상');
  stars[(fPos + 5) % 12].main.push('천량');
  stars[(fPos + 6) % 12].main.push('칠살');
  stars[(fPos + 10) % 12].main.push('파군');

  stars[(10 - hourIdx + 12) % 12].aux.push('문창');
  stars[(4 + hourIdx) % 12].aux.push('문곡');
  stars[(4 + lmonth - 1) % 12].aux.push('좌보');
  stars[(10 - (lmonth - 1) + 12) % 12].aux.push('우필');
  
  var yangMap = {'甲':3,'乙':4,'丙':6,'丁':7,'戊':6,'己':7,'庚':9,'辛':10,'壬':0,'癸':1};
  var tuoMap = {'甲':1,'乙':2,'丙':4,'丁':5,'戊':4,'己':5,'庚':7,'辛':8,'壬':10,'癸':11};
  if(yearGan in yangMap) {
    stars[yangMap[yearGan]].bad.push('경양');
    stars[tuoMap[yearGan]].bad.push('타라');
  }
  
  stars[(11 - hourIdx + 12) % 12].bad.push('지공');
  stars[(11 + hourIdx) % 12].bad.push('지겁');

  var maMap = {'申':2,'子':2,'辰':2, '亥':5,'卯':5,'未':5, '寅':8,'午':8,'戌':8, '巳':11,'酉':11,'丑':11};
  var tianMaZhi = maMap[yearZhi];
  if (tianMaZhi !== undefined) stars[tianMaZhi].aux.push('천마');

  var luCunMap = {'甲':2,'乙':3,'丙':5,'丁':6,'戊':5,'己':6,'庚':8,'辛':9,'壬':11,'癸':0};
  var luCunZhi = luCunMap[yearGan];
  if (luCunZhi !== undefined) stars[luCunZhi].aux.push('녹존');

  // 천괴/천월은 연간 규칙표를 따르며, 辛년은 寅(천괴)·午(천월)로 배치한다.
  var kuiMap = {'甲':1,'乙':0,'丙':11,'丁':11,'戊':1,'己':0,'庚':1,'辛':2,'壬':3,'癸':3};
  var yueMap = {'甲':7,'乙':8,'丙':9,'丁':9,'戊':7,'己':8,'庚':7,'辛':6,'壬':5,'癸':5};
  var kuiZhi = kuiMap[yearGan];
  var yueZhi = yueMap[yearGan];
  if(kuiZhi !== undefined) stars[kuiZhi].aux.push('천괴');
  if(yueZhi !== undefined) stars[yueZhi].aux.push('천월');

  var hlStart = {
      '寅':{h:1, l:3}, '午':{h:1, l:3}, '戌':{h:1, l:3},
      '申':{h:2, l:10}, '子':{h:2, l:10}, '辰':{h:2, l:10},
      '巳':{h:3, l:10}, '酉':{h:3, l:10}, '丑':{h:3, l:10},
      '亥':{h:9, l:10}, '卯':{h:9, l:10}, '未':{h:9, l:10}
  };
  if (hlStart[yearZhi]) {
      var huoZhi = (hlStart[yearZhi].h + hourIdx) % 12;
      var lingZhi = (hlStart[yearZhi].l + hourIdx) % 12;
      stars[huoZhi].bad.push('화성');
      stars[lingZhi].bad.push('영성');
  }

  var sihuaMap = {
    '甲': { '염정': '화록', '파군': '화권', '무곡': '화과', '태양': '화기' },
    '乙': { '천기': '화록', '천량': '화권', '자미': '화과', '태음': '화기' },
    '丙': { '천동': '화록', '천기': '화권', '문창': '화과', '염정': '화기' },
    '丁': { '태음': '화록', '천동': '화권', '천기': '화과', '거문': '화기' },
    '戊': { '탐랑': '화록', '태음': '화권', '우필': '화과', '천기': '화기' },
    '己': { '무곡': '화록', '탐랑': '화권', '천량': '화과', '문곡': '화기' },
    '庚': { '태양': '화록', '무곡': '화권', '태음': '화과', '천동': '화기' },
    '辛': { '거문': '화록', '태양': '화권', '문곡': '화과', '문창': '화기' },
    '壬': { '천량': '화록', '자미': '화권', '좌보': '화과', '무곡': '화기' },
    '癸': { '파군': '화록', '거문': '화권', '태음': '화과', '탐랑': '화기' }
  };
  var curSihua = sihuaMap[yearGan];
  // 화사(四化) 독립 데이터 추출 — HTML 임베드 전에 stars 원본에서 계산
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
  }
  if (curSihua) {
    for (var i = 0; i < 12; i++) {
        for (var j = 0; j < stars[i].main.length; j++) {
            var sn = stars[i].main[j];
            if (curSihua[sn]) {
                var sh = curSihua[sn];
                var col = (sh === '화기') ? '#FF5252' : '#3399FF';
                stars[i].main[j] = sn + ' <span style="color:'+col+';font-weight:900;font-size:0.75rem;margin-left:3px;">' + sh + '</span>';
            }
        }
        for (var j = 0; j < stars[i].aux.length; j++) {
            var sn = stars[i].aux[j];
            if (curSihua[sn]) {
                var sh = curSihua[sn];
                var col = (sh === '화기') ? '#FF5252' : '#3399FF';
                stars[i].aux[j] = sn + ' <span style="color:'+col+';font-weight:900;font-size:0.7rem;margin-left:3px;">' + sh + '</span>';
            }
        }
    }
  }

  var borrowed = [];
  for(var i=0; i<12; i++) {
    if(stars[i].main.length === 0) {
      var opp = (i + 6) % 12;
      borrowed[i] = stars[opp].main.map(function(s) { 
        return s + '<span style="font-size:0.5rem;opacity:0.6;margin-left:3px;font-weight:600;color:#a1a1aa">(차성)</span>'; 
      });
    }
  }
  for(var i=0; i<12; i++) {
    if(borrowed[i]) {
        // 원성(main)을 덮어쓰지 않고 차성 전용 슬롯에 분리 저장
        stars[i].borrowedMain = [].concat(borrowed[i]);
    }
  }

  var isYangYear = {'甲':1,'乙':-1,'丙':1,'丁':-1,'戊':1,'己':-1,'庚':1,'辛':-1,'壬':1,'癸':-1}[yearGan] > 0;
  var isMale = typeof GENDER !== 'undefined' ? (GENDER === 'M') : true;
  var direction = (isYangYear === isMale) ? 1 : -1;
  var daHan = {};
  var daHanList = [];
  for(var k=0; k<12; k++) {
    var currBIdx = (mengIdx + k * direction + 120) % 12;
    var startAge = ju + k * 10;
    var endAge = startAge + 9;
    daHan[currBIdx] = startAge + '~' + endAge;
    daHanList.push({
      order: k,
      idx: currBIdx,
      palaceName: palacesByIndex[currBIdx] || ('제'+(k+1)+'대한'),
      startAge: startAge,
      endAge: endAge,
      zhi: ZHI_LIST[currBIdx]
    });
  }

  var palaceStarData = [];
  for (var pi = 0; pi < 12; pi++) {
    var gName = palacesByIndex[pi] || '';
    var gZhi = ZHI_LIST[pi];
    function parseStarRows(list, borrowedByTag){
      return (list || []).map(function(raw){
        var hasHwaGi = /화기/.test(raw || '');
        var plain = (raw || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        var borrowedFlag = borrowedByTag ? /\(차성\)|\b차성\b/.test(plain) : false;
        var starName = plain
          .replace(/\(차성\)/g,'')
          .replace(/화록|화권|화과|화기/g,'')
          .replace(/◎|△|▲/g,'')
          .replace(/(^|\s)[O○X](?=\s|$)/g,' ')
          .trim()
          .split(' ')[0];
        if(!starName) return null;
        var strength = zwComputeStarStrength(starName, gZhi, borrowedFlag, {
          hourIndex: hourIdx,
          lunarMonth: lmonth,
          yearGan: yearGan,
          luCunZhiIdx: (luCunZhi !== undefined ? luCunZhi : -1)
        }) || '평';
        if (hasHwaGi) {
          var normalized = zwNormalizeStrength(strength);
          if (starName === '거문') {
            // 거문 화기는 현실 리스크를 동반하되, 본래 광휘(묘/왕)는 즉시 붕괴시키지 않는다.
            var downGeomun = {'묘':'묘','왕':'왕','평':'리','리':'함','함':'함'};
            strength = downGeomun[normalized] || normalized;
          } else {
            var down = {'묘':'평','왕':'리','평':'함','리':'함','함':'함'};
            strength = down[normalized] || normalized;
          }
        }
        return {
          name: starName,
          strength: strength,
          symbol: zwStrengthToSymbol(strength),
          borrowed: !!borrowedFlag
        };
      }).filter(function(v){ return !!v; });
    }
    var mainSource = [];
    if(stars[pi] && stars[pi].main && stars[pi].main.length) mainSource = stars[pi].main;
    else if(stars[pi] && stars[pi].borrowedMain && stars[pi].borrowedMain.length) mainSource = stars[pi].borrowedMain;
    var mainRows = parseStarRows(mainSource, true);
    var auxRows = parseStarRows(stars[pi] && stars[pi].aux ? stars[pi].aux : [], false);
    var badRows = parseStarRows(stars[pi] && stars[pi].bad ? stars[pi].bad : [], false);

    palaceStarData.push({
      palace: gName,
      branch: gZhi,
      stars: mainRows,
      auxStars: auxRows,
      badStars: badRows
    });
  }

  return {
    lunarMonth: lmonth, lunarDay: lday, isLeap: isLeap, yearGan: yearGan,
    meng: ZHI_LIST[mengIdx], shen: ZHI_LIST[shenIdx],
    palaces: palaces, gongGan: gongGan,
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
      lifeFormula: '명궁 = (월궁기점 - 시지index) mod 12',
      bodyFormula: '신궁 = (월궁기점 + 시지index) mod 12'
    }
  };
}

/* ═══════════════════════════════════════
   STEP 4: 유틸 함수
═══════════════════════════════════════ */
function setGender(g){
  GENDER=g;
  window._gender=g;
  document.getElementById('btnM').classList.toggle('on',g==='M');
  document.getElementById('btnF').classList.toggle('on',g==='F');
}
function getTenGod(dayGan,target){
  var gOrJ=GAN[target]||JI[target];
  if(!GAN[dayGan]||!gOrJ)return'?';
  var els=['wood','fire','earth','metal','water'];
  var diff=(els.indexOf(gOrJ.e)-els.indexOf(GAN[dayGan].e)+5)%5;
  var samePol=GAN[dayGan].y===gOrJ.y;
  return({0:samePol?'비견':'겁재',1:samePol?'식신':'상관',2:samePol?'편재':'정재',3:samePol?'편관':'정관',4:samePol?'편인':'정인'})[diff]||'?';
}

function parseTimeZoneOffsetName(name) {
  if (!name) return null;
  var m = String(name).match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!m) return null;
  var sign = m[1] === '-' ? -1 : 1;
  var hh = parseInt(m[2], 10) || 0;
  var mm = parseInt(m[3] || '0', 10) || 0;
  return sign * (hh + mm / 60);
}

function getTimeZoneOffsetHoursAtDate(year, month, day, hour, minute, tz, fallbackOffsetHours) {
  var fallback = (typeof fallbackOffsetHours === 'number' && !isNaN(fallbackOffsetHours)) ? fallbackOffsetHours : 9;
  if (!tz || typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return fallback;
  try {
    var probeUtc = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 12, minute || 0, 0));
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset'
    });
    var parts = fmt.formatToParts(probeUtc);
    var tzName = '';
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === 'timeZoneName') {
        tzName = parts[i].value || '';
        break;
      }
    }
    var parsed = parseTimeZoneOffsetName(tzName);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function resolveBirthTimezoneOffset(year, month, day, hour, minute, tz, baseOffsetHours) {
  var base = (typeof baseOffsetHours === 'number' && !isNaN(baseOffsetHours)) ? baseOffsetHours : 9;
  var effective = getTimeZoneOffsetHoursAtDate(year, month, day, hour, minute, tz, base);
  var dstMinutes = Math.round((effective - base) * 60);
  return {
    tzOffsetHours: effective,
    baseOffsetHours: base,
    dstMinutes: dstMinutes,
    isDstApplied: dstMinutes !== 0
  };
}

// 출생지 선택 정확도 향상: 국가 단위가 아닌 주/도시 단위 IANA 타임존 적용
var BIRTH_PLACE_GROUPS = [
  { label:'대한민국 (시/군 단위)', places:[
    {label:'대한민국 · 서울', tz:'Asia/Seoul', lon:126.9780, lat:37.5665, tzOff:9, def:true},
    {label:'대한민국 · 부산', tz:'Asia/Seoul', lon:129.0756, lat:35.1796, tzOff:9},
    {label:'대한민국 · 인천', tz:'Asia/Seoul', lon:126.7052, lat:37.4563, tzOff:9},
    {label:'대한민국 · 대구', tz:'Asia/Seoul', lon:128.6014, lat:35.8714, tzOff:9},
    {label:'대한민국 · 광주', tz:'Asia/Seoul', lon:126.8526, lat:35.1595, tzOff:9},
    {label:'대한민국 · 대전', tz:'Asia/Seoul', lon:127.3845, lat:36.3504, tzOff:9},
    {label:'대한민국 · 울산', tz:'Asia/Seoul', lon:129.3114, lat:35.5384, tzOff:9},
    {label:'대한민국 · 경기도 · 성남시', tz:'Asia/Seoul', lon:127.1267, lat:37.4200, tzOff:9},
    {label:'대한민국 · 경기도 · 용인시', tz:'Asia/Seoul', lon:127.1776, lat:37.2411, tzOff:9},
    {label:'대한민국 · 경기도 · 고양시', tz:'Asia/Seoul', lon:126.8320, lat:37.6584, tzOff:9},
    {label:'대한민국 · 경기도 · 화성시', tz:'Asia/Seoul', lon:126.8312, lat:37.1995, tzOff:9},
    {label:'대한민국 · 경기도 · 양평군', tz:'Asia/Seoul', lon:127.4870, lat:37.4918, tzOff:9},
    {label:'대한민국 · 경기도 · 가평군', tz:'Asia/Seoul', lon:127.5107, lat:37.8315, tzOff:9},
    {label:'대한민국 · 강원특별자치도 · 춘천시', tz:'Asia/Seoul', lon:127.7298, lat:37.8813, tzOff:9},
    {label:'대한민국 · 강원특별자치도 · 강릉시', tz:'Asia/Seoul', lon:128.8761, lat:37.7519, tzOff:9},
    {label:'대한민국 · 강원특별자치도 · 평창군', tz:'Asia/Seoul', lon:128.3904, lat:37.3705, tzOff:9},
    {label:'대한민국 · 수원', tz:'Asia/Seoul', lon:127.0286, lat:37.2636, tzOff:9},
    {label:'대한민국 · 충청북도 · 청주시', tz:'Asia/Seoul', lon:127.4890, lat:36.6424, tzOff:9},
    {label:'대한민국 · 충청북도 · 충주시', tz:'Asia/Seoul', lon:127.9259, lat:36.9910, tzOff:9},
    {label:'대한민국 · 충청북도 · 제천시', tz:'Asia/Seoul', lon:128.1940, lat:37.1326, tzOff:9},
    {label:'대한민국 · 충청남도 · 천안시', tz:'Asia/Seoul', lon:127.1522, lat:36.8151, tzOff:9},
    {label:'대한민국 · 충청남도 · 공주시', tz:'Asia/Seoul', lon:127.1190, lat:36.4465, tzOff:9},
    {label:'대한민국 · 충청남도 · 서산시', tz:'Asia/Seoul', lon:126.4522, lat:36.7849, tzOff:9},
    {label:'대한민국 · 전주', tz:'Asia/Seoul', lon:127.1480, lat:35.8242, tzOff:9},
    {label:'대한민국 · 전라북도 · 군산시', tz:'Asia/Seoul', lon:126.7368, lat:35.9677, tzOff:9},
    {label:'대한민국 · 전라북도 · 남원시', tz:'Asia/Seoul', lon:127.3903, lat:35.4164, tzOff:9},
    {label:'대한민국 · 전라남도 · 목포시', tz:'Asia/Seoul', lon:126.3922, lat:34.8118, tzOff:9},
    {label:'대한민국 · 전라남도 · 여수시', tz:'Asia/Seoul', lon:127.6622, lat:34.7604, tzOff:9},
    {label:'대한민국 · 전라남도 · 해남군', tz:'Asia/Seoul', lon:126.5989, lat:34.5742, tzOff:9},
    {label:'대한민국 · 경상북도 · 포항시', tz:'Asia/Seoul', lon:129.3435, lat:36.0190, tzOff:9},
    {label:'대한민국 · 경상북도 · 안동시', tz:'Asia/Seoul', lon:128.7294, lat:36.5684, tzOff:9},
    {label:'대한민국 · 경상북도 · 경주시', tz:'Asia/Seoul', lon:129.2247, lat:35.8562, tzOff:9},
    {label:'대한민국 · 경상남도 · 창원시', tz:'Asia/Seoul', lon:128.6811, lat:35.2285, tzOff:9},
    {label:'대한민국 · 경상남도 · 진주시', tz:'Asia/Seoul', lon:128.1076, lat:35.1799, tzOff:9},
    {label:'대한민국 · 경상남도 · 거창군', tz:'Asia/Seoul', lon:127.9099, lat:35.6867, tzOff:9},
    {label:'대한민국 · 제주특별자치도 · 제주시', tz:'Asia/Seoul', lon:126.5312, lat:33.4996, tzOff:9},
    {label:'대한민국 · 제주특별자치도 · 서귀포시', tz:'Asia/Seoul', lon:126.5600, lat:33.2541, tzOff:9},
    {label:'대한민국 · 제주', tz:'Asia/Seoul', lon:126.5312, lat:33.4996, tzOff:9}
  ]},
  { label:'미국 (주/도시)', places:[
    {label:'미국 · 뉴욕주 · 뉴욕', tz:'America/New_York', lon:-74.0060, lat:40.7128, tzOff:-5},
    {label:'미국 · 매사추세츠주 · 보스턴', tz:'America/New_York', lon:-71.0589, lat:42.3601, tzOff:-5},
    {label:'미국 · 플로리다주 · 마이애미', tz:'America/New_York', lon:-80.1918, lat:25.7617, tzOff:-5},
    {label:'미국 · 조지아주 · 애틀랜타', tz:'America/New_York', lon:-84.3880, lat:33.7490, tzOff:-5},
    {label:'미국 · 일리노이주 · 시카고', tz:'America/Chicago', lon:-87.6298, lat:41.8781, tzOff:-6},
    {label:'미국 · 텍사스주 · 댈러스', tz:'America/Chicago', lon:-96.7970, lat:32.7767, tzOff:-6},
    {label:'미국 · 텍사스주 · 휴스턴', tz:'America/Chicago', lon:-95.3698, lat:29.7604, tzOff:-6},
    {label:'미국 · 콜로라도주 · 덴버', tz:'America/Denver', lon:-104.9903, lat:39.7392, tzOff:-7},
    {label:'미국 · 애리조나주 · 피닉스', tz:'America/Phoenix', lon:-112.0740, lat:33.4484, tzOff:-7},
    {label:'미국 · 유타주 · 솔트레이크시티', tz:'America/Denver', lon:-111.8910, lat:40.7608, tzOff:-7},
    {label:'미국 · 캘리포니아주 · 로스앤젤레스', tz:'America/Los_Angeles', lon:-118.2437, lat:34.0522, tzOff:-8},
    {label:'미국 · 캘리포니아주 · 샌프란시스코', tz:'America/Los_Angeles', lon:-122.4194, lat:37.7749, tzOff:-8},
    {label:'미국 · 워싱턴주 · 시애틀', tz:'America/Los_Angeles', lon:-122.3321, lat:47.6062, tzOff:-8},
    {label:'미국 · 알래스카주 · 앵커리지', tz:'America/Anchorage', lon:-149.9003, lat:61.2181, tzOff:-9},
    {label:'미국 · 하와이주 · 호놀룰루', tz:'Pacific/Honolulu', lon:-157.8583, lat:21.3069, tzOff:-10}
  ]},
  { label:'캐나다 (주/도시)', places:[
    {label:'캐나다 · 온타리오주 · 토론토', tz:'America/Toronto', lon:-79.3832, lat:43.6532, tzOff:-5},
    {label:'캐나다 · 퀘벡주 · 몬트리올', tz:'America/Montreal', lon:-73.5673, lat:45.5017, tzOff:-5},
    {label:'캐나다 · 브리티시컬럼비아주 · 밴쿠버', tz:'America/Vancouver', lon:-123.1207, lat:49.2827, tzOff:-8},
    {label:'캐나다 · 앨버타주 · 캘거리', tz:'America/Edmonton', lon:-114.0719, lat:51.0447, tzOff:-7},
    {label:'캐나다 · 매니토바주 · 위니펙', tz:'America/Winnipeg', lon:-97.1384, lat:49.8951, tzOff:-6},
    {label:'캐나다 · 노바스코샤주 · 핼리팩스', tz:'America/Halifax', lon:-63.5752, lat:44.6488, tzOff:-4}
  ]},
  { label:'동아시아/동남아시아', places:[
    {label:'일본 · 도쿄', tz:'Asia/Tokyo', lon:139.6917, lat:35.6895, tzOff:9},
    {label:'일본 · 오사카', tz:'Asia/Tokyo', lon:135.5023, lat:34.6937, tzOff:9},
    {label:'일본 · 삿포로', tz:'Asia/Tokyo', lon:141.3545, lat:43.0618, tzOff:9},
    {label:'중국 · 베이징', tz:'Asia/Shanghai', lon:116.4074, lat:39.9042, tzOff:8},
    {label:'중국 · 상하이', tz:'Asia/Shanghai', lon:121.4737, lat:31.2304, tzOff:8},
    {label:'중국 · 광저우', tz:'Asia/Shanghai', lon:113.2644, lat:23.1291, tzOff:8},
    {label:'대만 · 타이베이', tz:'Asia/Taipei', lon:121.5654, lat:25.0330, tzOff:8},
    {label:'홍콩 · 홍콩섬', tz:'Asia/Hong_Kong', lon:114.1694, lat:22.3193, tzOff:8},
    {label:'싱가포르 · 싱가포르', tz:'Asia/Singapore', lon:103.8198, lat:1.3521, tzOff:8},
    {label:'태국 · 방콕', tz:'Asia/Bangkok', lon:100.5018, lat:13.7563, tzOff:7},
    {label:'베트남 · 하노이', tz:'Asia/Ho_Chi_Minh', lon:105.8342, lat:21.0278, tzOff:7},
    {label:'베트남 · 호찌민', tz:'Asia/Ho_Chi_Minh', lon:106.6297, lat:10.8231, tzOff:7},
    {label:'인도네시아 · 자카르타', tz:'Asia/Jakarta', lon:106.8456, lat:-6.2088, tzOff:7},
    {label:'인도네시아 · 발리(덴파사르)', tz:'Asia/Makassar', lon:115.2167, lat:-8.6500, tzOff:8},
    {label:'필리핀 · 마닐라', tz:'Asia/Manila', lon:120.9842, lat:14.5995, tzOff:8}
  ]},
  { label:'남아시아/중동', places:[
    {label:'인도 · 뉴델리', tz:'Asia/Kolkata', lon:77.1025, lat:28.7041, tzOff:5.5},
    {label:'인도 · 뭄바이', tz:'Asia/Kolkata', lon:72.8777, lat:19.0760, tzOff:5.5},
    {label:'인도 · 벵갈루루', tz:'Asia/Kolkata', lon:77.5946, lat:12.9716, tzOff:5.5},
    {label:'인도 · 콜카타', tz:'Asia/Kolkata', lon:88.3639, lat:22.5726, tzOff:5.5},
    {label:'파키스탄 · 카라치', tz:'Asia/Karachi', lon:67.0011, lat:24.8607, tzOff:5},
    {label:'방글라데시 · 다카', tz:'Asia/Dhaka', lon:90.4125, lat:23.8103, tzOff:6},
    {label:'네팔 · 카트만두', tz:'Asia/Kathmandu', lon:85.3240, lat:27.7172, tzOff:5.75},
    {label:'UAE · 두바이', tz:'Asia/Dubai', lon:55.2708, lat:25.2048, tzOff:4},
    {label:'사우디 · 리야드', tz:'Asia/Riyadh', lon:46.6753, lat:24.7136, tzOff:3},
    {label:'이란 · 테헤란', tz:'Asia/Tehran', lon:51.3890, lat:35.6892, tzOff:3.5},
    {label:'이스라엘 · 예루살렘', tz:'Asia/Jerusalem', lon:35.2137, lat:31.7683, tzOff:2},
    {label:'터키 · 이스탄불', tz:'Europe/Istanbul', lon:28.9784, lat:41.0082, tzOff:3}
  ]},
  { label:'유럽/오세아니아/중남미', places:[
    {label:'영국 · 런던', tz:'Europe/London', lon:-0.1276, lat:51.5074, tzOff:0},
    {label:'프랑스 · 파리', tz:'Europe/Paris', lon:2.3522, lat:48.8566, tzOff:1},
    {label:'독일 · 베를린', tz:'Europe/Berlin', lon:13.4050, lat:52.5200, tzOff:1},
    {label:'이탈리아 · 로마', tz:'Europe/Rome', lon:12.4964, lat:41.9028, tzOff:1},
    {label:'스페인 · 마드리드', tz:'Europe/Madrid', lon:-3.7038, lat:40.4168, tzOff:1},
    {label:'러시아 · 모스크바', tz:'Europe/Moscow', lon:37.6173, lat:55.7558, tzOff:3},
    {label:'호주 · 시드니(NSW)', tz:'Australia/Sydney', lon:151.2093, lat:-33.8688, tzOff:10},
    {label:'호주 · 멜버른(VIC)', tz:'Australia/Melbourne', lon:144.9631, lat:-37.8136, tzOff:10},
    {label:'호주 · 브리즈번(QLD)', tz:'Australia/Brisbane', lon:153.0251, lat:-27.4698, tzOff:10},
    {label:'호주 · 퍼스(WA)', tz:'Australia/Perth', lon:115.8605, lat:-31.9505, tzOff:8},
    {label:'호주 · 애들레이드(SA)', tz:'Australia/Adelaide', lon:138.6007, lat:-34.9285, tzOff:9.5},
    {label:'호주 · 다윈(NT)', tz:'Australia/Darwin', lon:130.8456, lat:-12.4634, tzOff:9.5},
    {label:'뉴질랜드 · 오클랜드', tz:'Pacific/Auckland', lon:174.7633, lat:-36.8485, tzOff:12},
    {label:'브라질 · 상파울루', tz:'America/Sao_Paulo', lon:-46.6333, lat:-23.5505, tzOff:-3},
    {label:'브라질 · 리우데자네이루', tz:'America/Sao_Paulo', lon:-43.1729, lat:-22.9068, tzOff:-3},
    {label:'아르헨티나 · 부에노스아이레스', tz:'America/Argentina/Buenos_Aires', lon:-58.3816, lat:-34.6037, tzOff:-3},
    {label:'칠레 · 산티아고', tz:'America/Santiago', lon:-70.6693, lat:-33.4489, tzOff:-4},
    {label:'멕시코 · 멕시코시티', tz:'America/Mexico_City', lon:-99.1332, lat:19.4326, tzOff:-6},
    {label:'페루 · 리마', tz:'America/Lima', lon:-77.0428, lat:-12.0464, tzOff:-5}
  ]}
];

function populateBirthCountrySelector() {
  var sel = document.getElementById('birthCountry');
  if (!sel) return;

  var prev = sel.options && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
  var prevKey = prev
    ? [prev.value, prev.getAttribute('data-long'), prev.getAttribute('data-lat')].join('|')
    : '';

  var defaultKey = '';
  var frag = document.createDocumentFragment();

  BIRTH_PLACE_GROUPS.forEach(function(group) {
    var og = document.createElement('optgroup');
    og.label = group.label;
    (group.places || []).forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.tz;
      opt.textContent = p.label;
      opt.setAttribute('data-long', String(p.lon));
      opt.setAttribute('data-lat', String(p.lat));
      opt.setAttribute('data-tz', String(p.tzOff));
      opt.setAttribute('data-base-tz', String(p.tzOff));
      var key = [p.tz, String(p.lon), String(p.lat)].join('|');
      if (p.def) defaultKey = key;
      og.appendChild(opt);
    });
    frag.appendChild(og);
  });

  sel.innerHTML = '';
  sel.appendChild(frag);

  var targetKey = prevKey || defaultKey;
  var found = false;
  for (var i = 0; i < sel.options.length; i++) {
    var o = sel.options[i];
    var k = [o.value, o.getAttribute('data-long'), o.getAttribute('data-lat')].join('|');
    if (k === targetKey) {
      sel.selectedIndex = i;
      found = true;
      break;
    }
  }
  if (!found && sel.options.length > 0) sel.selectedIndex = 0;
}

/* 임의 select 엘리먼트에 출생지 목록 채우기 (모달 전용) */
window.populateCountrySelectById = function(selId, selectedLabel) {
  var sel = document.getElementById(selId);
  if (!sel) return;
  var frag = document.createDocumentFragment();
  var defTz = '';
  BIRTH_PLACE_GROUPS.forEach(function(group) {
    var og = document.createElement('optgroup');
    og.label = group.label;
    (group.places || []).forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.tz;
      opt.textContent = p.label;
      opt.setAttribute('data-long', String(p.lon));
      opt.setAttribute('data-lat', String(p.lat));
      opt.setAttribute('data-tz', String(p.tzOff));
      opt.setAttribute('data-base-tz', String(p.tzOff));
      if (p.def) defTz = p.tz;
      og.appendChild(opt);
    });
    frag.appendChild(og);
  });
  sel.innerHTML = '';
  sel.appendChild(frag);
  var found = false;
  if (selectedLabel) {
    for (var i = 0; i < sel.options.length; i++) {
      if ((sel.options[i].textContent || '').trim() === selectedLabel.trim()) {
        sel.selectedIndex = i; found = true; break;
      }
    }
  }
  if (!found && defTz) {
    for (var j = 0; j < sel.options.length; j++) {
      if (sel.options[j].value === defTz) { sel.selectedIndex = j; break; }
    }
  }
};

function initSelectors(){
  populateBirthCountrySelector();

  var hSel=document.getElementById('birthHour'),mSel=document.getElementById('birthMinute');
  if (hSel && mSel) {
    var prevH = hSel.value;
    var prevM = mSel.value;
    var profileBirth = null;
    try {
      profileBirth = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth)
        || (window.__destinyFlowerSajuSnapshot && window.__destinyFlowerSajuSnapshot.birth)
        || null;
    } catch (_) {}
    var fallbackH = '12';
    var fallbackM = '0';
    var nextH = (prevH !== '' && prevH !== null)
      ? prevH
      : (profileBirth && profileBirth.hour != null ? String(Number(profileBirth.hour)) : fallbackH);
    var nextM = (prevM !== '' && prevM !== null)
      ? prevM
      : (profileBirth && profileBirth.minute != null ? String(Number(profileBirth.minute)) : fallbackM);
    if (isNaN(parseInt(nextH, 10)) || Number(nextH) < 0 || Number(nextH) > 23) nextH = fallbackH;
    if (isNaN(parseInt(nextM, 10)) || Number(nextM) < 0 || Number(nextM) > 59) nextM = fallbackM;
    var hBuf = '';
    for (var h = 0; h < 24; h++) hBuf += '<option value="' + h + '">' + (h < 10 ? '0' : '') + h + '시</option>';
    hSel.innerHTML = hBuf;
    hSel.value = String(parseInt(nextH, 10));
    var mBuf = '';
    for (var m = 0; m < 60; m++) mBuf += '<option value="' + m + '">' + (m < 10 ? '0' : '') + m + '분</option>';
    mSel.innerHTML = mBuf;
    mSel.value = String(parseInt(nextM, 10));
  }

  var ch=document.getElementById('compatBirthHour');
  var cm=document.getElementById('compatBirthMinute');
  if(ch&&cm){
    var chBuf = '';
    for(var h2=0;h2<24;h2++) chBuf += '<option value="'+h2+'">'+(h2<10?'0':'')+h2+'시</option>';
    ch.innerHTML = chBuf;
    ch.value='12';
    var cmBuf = '';
    for(var m2=0;m2<60;m2++) cmBuf += '<option value="'+m2+'">'+(m2<10?'0':'')+m2+'분</option>';
    cm.innerHTML = cmBuf;
    cm.value='0';
  }

  /* 시간 보정 미리보기 업데이트 — 초기 부트 시 UI 활성화 */
  try {
    if (typeof updateCorrectedTimePreview === 'function') {
      updateCorrectedTimePreview();
    }
  } catch (e) {
    console.error('[initSelectors] updateCorrectedTimePreview 실패:', e);
    /* 실패 시에도 로딩 상태 해제 */
    var infoDiv = document.getElementById('timeCorrectionInfo');
    if (infoDiv) {
      infoDiv.classList.remove('time-correction-info--loading');
      infoDiv.setAttribute('aria-busy', 'false');
      infoDiv.innerHTML = '🌍 시간 보정 정보를 불러올 수 없습니다. 새로고침 후 다시 시도해주세요.';
    }
  }

  /* 성별 초기값 설정 (입력 폼 활성화) */
  if (typeof GENDER === 'undefined' || !GENDER) {
    window.GENDER = 'F';
    window._gender = 'F';
  }
}

function updateCorrectedTimePreview(){
  var countrySel = document.getElementById('birthCountry');
  var infoDiv = document.getElementById('timeCorrectionInfo');
  
  if(!countrySel || !infoDiv) return;

  var opt = countrySel.options[countrySel.selectedIndex];
  if (!opt) return;

  var bLong = parseFloat(opt.getAttribute('data-long'));
  var baseTz = parseFloat(opt.getAttribute('data-base-tz') || opt.getAttribute('data-tz') || '9');
  var birthDate = (document.getElementById('birthDate') || {}).value || '';
  var birthHour = parseInt((document.getElementById('birthHour') || {}).value || '12', 10);
  var birthMinute = parseInt((document.getElementById('birthMinute') || {}).value || '0', 10);

  var y = 2000, m = 1, d = 1;
  if (birthDate) {
    var parts = birthDate.split('-');
    y = parseInt(parts[0], 10) || y;
    m = parseInt(parts[1], 10) || m;
    d = parseInt(parts[2], 10) || d;
  }

  var resolved = resolveBirthTimezoneOffset(
    y, m, d,
    isNaN(birthHour) ? 12 : birthHour,
    isNaN(birthMinute) ? 0 : birthMinute,
    countrySel.value,
    isNaN(baseTz) ? 9 : baseTz
  );

  var effTz = resolved.tzOffsetHours;
  var stdLong = effTz * 15;
  var lngOffsetMin = Math.round((stdLong - bLong) * 4);
  var dstText = resolved.isDstApplied
    ? ('DST ' + (resolved.dstMinutes > 0 ? '+' : '') + resolved.dstMinutes + '분 적용')
    : 'DST 미적용';

  infoDiv.style.display = 'block';
  infoDiv.classList.remove('time-correction-info--loading');
  infoDiv.setAttribute('aria-busy', 'false');
  infoDiv.innerHTML = '🌍 <b>시간 보정 미리보기</b><br>'
    + '<span style="font-size:0.75rem;">기준 UTC' + (effTz >= 0 ? '+' : '') + effTz
    + ' (표준 UTC' + (resolved.baseOffsetHours >= 0 ? '+' : '') + resolved.baseOffsetHours + ', ' + dstText + ')<br>'
    + '표준자오선 ' + stdLong.toFixed(2) + '° vs 실제경도 ' + bLong.toFixed(4) + '° → 경도 보정 '
    + (lngOffsetMin >= 0 ? '+' : '') + lngOffsetMin + '분</span>';
}

/* ═══════════════════════════════════════
   STEP 5: 명리학 분석 엔진
═══════════════════════════════════════ */

/* ─ 조후 분석 ─ */
function analyzeJohu(p){
  var yg=p.y.g,yz=p.y.j,mg=p.m.g,mz=p.m.j,dg=p.d.g,dz=p.d.j,hg=p.h.g,hz=p.h.j;
  var score=0;
  var seasonMap={'寅':'봄','卯':'봄','辰':'봄','巳':'여름','午':'여름','未':'여름','申':'가을','酉':'가을','戌':'가을','亥':'겨울','子':'겨울','丑':'겨울'};
  var season=seasonMap[mz]||'봄';
  if(season==='여름')score+=4;else if(season==='봄')score+=2;else if(season==='가을')score-=2;else score-=4;
  var fc=0,wc=0,wdc=0,mc=0;
  var moistCnt=0,dryCnt=0;
  [yg,yz,mg,mz,dg,dz,hg,hz].forEach(function(c){
    var g=GAN[c],j=JI[c];
    var e=(g||j||{}).e;
    if(e==='fire'){score+=1.5;fc++;dryCnt++;}else if(e==='water'){score-=1.5;wc++;moistCnt++;}
    else if(e==='wood'){score+=0.5;wdc++;moistCnt++;}
    else if(e==='metal'){score-=0.5;mc++;dryCnt++;}
    if(j){
      if(c==='辰'||c==='丑')moistCnt++;
      if(c==='戌'||c==='未')dryCnt++;
    }
  });
  var type,advice,badgeCls,badgeTxt;
  if(score>=5){type='hot';advice='사주가 매우 뜨겁습니다. 水·金 기운이 절실히 필요합니다.';badgeCls='jb-hot';badgeTxt='🔥 뜨거운 사주';}
  else if(score>=2){type='warm';advice='사주가 따뜻한 편입니다. 水 기운으로 조절하면 좋습니다.';badgeCls='jb-warm';badgeTxt='🌞 따뜻한 사주';}
  else if(score>=-2){type='neutral';advice='사주의 온도가 시원하게 균형잡혀 있습니다. 계절 변화에 맞춰 음양을 조절하세요.';badgeCls='jb-neutral';badgeTxt='🌤️ 시원한 사주';}
  else if(score>=-5){type='cool';advice='사주가 서늘한 편입니다. 火·木 기운으로 온기를 보충하면 좋습니다.';badgeCls='jb-cool';badgeTxt='🍃 서늘한 사주';}
  else{type='cold';advice='사주가 매우 차갑습니다. 火·木 기운이 절실히 필요합니다.';badgeCls='jb-cold';badgeTxt='❄️ 차가운 사주';}
  var moistType,moistAdvice;
  var diff=moistCnt-dryCnt;
  if(diff>=3){moistType='wet';moistAdvice='사주에 습기가 많은 편입니다. 건조한 환경, 금(金)·불(火) 기운을 적절히 써주면 균형이 좋아집니다.';}
  else if(diff<=-3){moistType='dry';moistAdvice='사주가 건조한 편입니다. 물(水)·나무(木) 기운과 실제 수분(물·목욕·자연)을 통해 촉촉함을 채워주는 것이 좋습니다.';}
  else{moistType='balanced';moistAdvice='습조(濕燥)는 비교적 균형잡힌 편입니다. 한난만 잘 맞춰주면 좋습니다.';}
  var improve=(type==='hot'||type==='warm')
    ?'시원하고 차가운 기운 필요. 북쪽 방향, 파란색·검은색 컬러, 수영·물가 활동.'
    :(type==='cold'||type==='cool')
    ?'따뜻하고 밝은 기운 필요. 남쪽 방향, 빨간색·주황색 컬러, 캠핑·BBQ 활동.'
    :'균형잡힌 사주입니다. 다양한 오행을 골고루 활용하세요.';
  return{
    score:score,
    type:type,
    advice:advice,
    badgeCls:badgeCls,
    badgeTxt:badgeTxt,
    improve:improve,
    season:season,
    fc:fc,wc:wc,wdc:wdc,mc:mc,
    moistType:moistType,
    moistAdvice:moistAdvice,
    moistCnt:moistCnt,
    dryCnt:dryCnt
  };
}

/* ─ 억부(신강/신약) 계산 ─ */
function calcPower(p){
  var dg=p.d.g,dayEl=GAN[dg]&&GAN[dg].e;
  if(!dayEl)return null;
  var parEl=parentOf(dayEl);
  var score=0;
  var mjEl=JI[p.m.j]&&JI[p.m.j].e;
  if(mjEl){
    if(mjEl===dayEl)score+=40;
    else if(mjEl===parEl)score+=27;
    else if(KE[mjEl]===dayEl)score-=27;
    else if(SHENG[dayEl]===mjEl)score-=10;
  }
  var djEl=JI[p.d.j]&&JI[p.d.j].e;
  if(djEl){
    if(djEl===dayEl||djEl===parEl)score+=13;
    else if(KE[djEl]===dayEl)score-=9;
  }
  [p.y.g,p.y.j,p.m.g,p.h.g,p.h.j].forEach(function(c){
    if(!c)return;
    var ce=(GAN[c]&&GAN[c].e)||(JI[c]&&JI[c].e);if(!ce)return;
    if(ce===dayEl||ce===parEl)score+=7;
    else if(KE[ce]===dayEl)score-=7;
  });
  var isStrong=score>=30;
  var yongshin,kijishin;
  if(isStrong){
    var drain=SHENG[dayEl];
    var reEl=drain?SHENG[drain]:null;
    var ctrlEl=whoControls(dayEl);
    yongshin=[drain,reEl,ctrlEl].filter(Boolean);
    kijishin=[dayEl,parEl].filter(Boolean);
  }else{
    yongshin=[dayEl,parEl].filter(Boolean);
    kijishin=[SHENG[dayEl],whoControls(dayEl)].filter(Boolean);
  }
  return{isStrong:isStrong,score:score,yongshin:yongshin,kijishin:kijishin,dayEl:dayEl,parEl:parEl};
}

/* ─ 종격(從格) 감지 — 천간합/충·지지합/충 반영, 70% 기준 ─ */
function detectJong(p){
  var GANHE={
    '甲':{'己':'earth'},'己':{'甲':'earth'},
    '乙':{'庚':'metal'},'庚':{'乙':'metal'},
    '丙':{'辛':'water'},'辛':{'丙':'water'},
    '丁':{'壬':'wood'},'壬':{'丁':'wood'},
    '戊':{'癸':'fire'},'癸':{'戊':'fire'}
  };
  var GANCHONG=[['甲','庚'],['乙','辛'],['丙','壬'],['丁','癸']];
  var JIHE={
    '子':{'丑':'earth'},'丑':{'子':'earth'},
    '寅':{'亥':'wood'},'亥':{'寅':'wood'},
    '卯':{'戌':'fire'},'戌':{'卯':'fire'},
    '辰':{'酉':'metal'},'酉':{'辰':'metal'},
    '巳':{'申':'water'},'申':{'巳':'water'},
    '午':{'未':'fire'},'未':{'午':'fire'}
  };
  var JICHONG=[['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];

  var gans=[p.y.g,p.m.g,p.d.g,p.h.g];
  var zhis=[p.y.j,p.m.j,p.d.j,p.h.j];

  var ganChongSet={};
  GANCHONG.forEach(function(pr){
    if(gans.indexOf(pr[0])>=0&&gans.indexOf(pr[1])>=0){
      ganChongSet[pr[0]]=true; ganChongSet[pr[1]]=true;
    }
  });
  var jiChongSet={};
  JICHONG.forEach(function(pr){
    if(zhis.indexOf(pr[0])>=0&&zhis.indexOf(pr[1])>=0){
      jiChongSet[pr[0]]=true; jiChongSet[pr[1]]=true;
    }
  });

  // ── 원국 원칙: 합의 힘이 충보다 강하다 ──────────────────────────
  // 천간합이 성립하면 충을 제압하여 합화된 오행으로 변환한다.
  // 합화된 천간은 ganChongSet에서 제거 → 이미 합으로 묶인 천간에 대한 충은 무효.
  var ganElMap={};
  gans.forEach(function(g){if(g&&GAN[g])ganElMap[g]=GAN[g].e;});
  var ganHeMerged={};
  for(var gi=0;gi<gans.length;gi++){
    for(var gj=gi+1;gj<gans.length;gj++){
      var g1=gans[gi],g2=gans[gj];
      if(!g1||!g2)continue;
      if(GANHE[g1]&&GANHE[g1][g2]){
        // 원국 천간합 우선 원칙: 충 여부 관계없이 합화 무조건 적용
        ganElMap[g1]=GANHE[g1][g2]; ganElMap[g2]=GANHE[g1][g2];
        ganHeMerged[g1]=true; ganHeMerged[g2]=true;
        // 합화된 천간은 충 대상에서 제외 (합이 충을 제압)
        delete ganChongSet[g1]; delete ganChongSet[g2];
      }
    }
  }
  var jiElMap={};
  zhis.forEach(function(z){if(z&&JI[z])jiElMap[z]=JI[z].e;});
  var jiHeMerged={}; // 지지합은 충 우선 원칙 미적용 — jiChongSet 가드 유지
  for(var zi=0;zi<zhis.length;zi++){
    for(var zj=zi+1;zj<zhis.length;zj++){
      var z1=zhis[zi],z2=zhis[zj];
      if(!z1||!z2)continue;
      if(JIHE[z1]&&JIHE[z1][z2]){
        if(!jiChongSet[z1] && !jiChongSet[z2]){
          jiElMap[z1]=JIHE[z1][z2]; jiElMap[z2]=JIHE[z1][z2];
          jiHeMerged[z1]=true; jiHeMerged[z2]=true;
        }
      }
    }
  }

  var cnt={wood:0,fire:0,earth:0,metal:0,water:0};
  gans.forEach(function(g){var e=ganElMap[g];if(e&&cnt[e]!==undefined)cnt[e]++;});
  zhis.forEach(function(z){var e=jiElMap[z];if(e&&cnt[e]!==undefined)cnt[e]++;});
  if(p.m.j){var mje=jiElMap[p.m.j];if(mje&&cnt[mje]!==undefined)cnt[mje]++;}

  var total=9;
  var dom1='wood',max1=0;
  Object.keys(cnt).forEach(function(e){if(cnt[e]>max1){max1=cnt[e];dom1=e;}});
  var dom2='wood',max2=0;
  Object.keys(cnt).forEach(function(e){
    var par=parentOf(e);
    var c2=cnt[e]+(par?cnt[par]:0);
    if(c2>max2){max2=c2;dom2=e;}
  });
  var pct1=max1/total*100, pct2=max2/total*100;
  var dayEl=GAN[p.d.g]&&GAN[p.d.g].e;

  // ── 종격 판정 임계값: 80%+ 진종격 / 70~80% 가종격 ──────────────
  var JONG_TRUE_THRESHOLD = 80;
  var JONG_GA_THRESHOLD   = 70;
  var HWA_GA_THRESHOLD    = 75; // 합화格: 75%+ 성립 (가화格 시작)
  var HWA_TRUE_THRESHOLD  = 80; // 합화格: 80%+ 진화格 / 75~80% 가화格

  // ── 합화格(化格) 특별 판별: 일간이 천간합화에 참여한 경우 ──────────
  // 예) 戊癸합화火: 癸 일간이 합화 → 합화된 오행+모(母)오행 기준으로 화格 판별
  var dayGanChar = p.d.g;
  if(ganHeMerged[dayGanChar]) {
    var hwaDom = ganElMap[dayGanChar]; // 합화된 오행
    var hwaPar = parentOf(hwaDom);    // 합화오행을 생하는 부모 오행
    var hwaCnt = (cnt[hwaDom]||0) + (hwaPar ? (cnt[hwaPar]||0) : 0);
    var hwaPct = hwaCnt / total * 100;
    if(hwaPct >= HWA_GA_THRESHOLD) {
      var hwaIsGaJong = (hwaPct < HWA_TRUE_THRESHOLD); // 75~80% = 가화格
      var hwaName = (hwaIsGaJong ? '가' : '') + '화格(化格)';
      return {
        isJong: true,
        isGaJong: hwaIsGaJong,
        dominant: hwaDom,
        parEl: hwaPar,
        pct: hwaPct.toFixed(0),
        name: hwaName,
        dayEl: dayEl,
        heHaPriority: true,
        ganHeMerged: ganHeMerged,
        jiHeMerged: jiHeMerged
      };
    }
  }

  var maxPct = Math.max(pct1, pct2);
  // ── 단일 오행이 70% 미만이면 절대 종격 판별 모달을 띄우지 않음 ──
  if(pct1 < JONG_GA_THRESHOLD) return{isJong:false};
  if(maxPct >= JONG_GA_THRESHOLD) {
    var dominant = pct1>=pct2 ? dom1 : dom2;
    var pct = maxPct;
    var parEl = parentOf(dominant);
    var isGaJong = (pct < JONG_TRUE_THRESHOLD); // 70~80% = 가종격

    var jongName;
    if(dominant === dayEl) {
      var J_MAP = {'wood':'곡직격(曲直格)','fire':'염상격(炎上格)','earth':'가색격(稼穡格)','metal':'종혁격(從革格)','water':'윤하격(潤下格)'};
      jongName = (isGaJong ? '가(假)' : '') + (J_MAP[dayEl] || '종왕격(從旺格)');
    } else if(parEl === dayEl) {
      jongName = (isGaJong ? '가' : '') + '종아격(從兒格)';
    } else if(dominant === parentOf(dayEl)) {
      jongName = (isGaJong ? '가' : '') + '종강격(從强格)';
    } else if(KE[dayEl] === dominant) {
      jongName = (isGaJong ? '가' : '') + '종재격(從財格)';
    } else if(KE[dominant] === dayEl) {
      jongName = (isGaJong ? '가' : '') + '종살격(從殺格)';
    } else {
      jongName = (isGaJong ? '가' : '') + '화격(化格)';
    }

    // 합화 우선 여부
    var hadChongOverride = (Object.keys(ganHeMerged).length > 0 || Object.keys(jiHeMerged).length > 0) &&
      (GANCHONG.some(function(pr){return gans.indexOf(pr[0])>=0&&gans.indexOf(pr[1])>=0;}) ||
       JICHONG.some(function(pr){return zhis.indexOf(pr[0])>=0&&zhis.indexOf(pr[1])>=0;}));

    var jongResult = {
      isJong: true,          // 가종격도 isJong=true — 대운/세운 평가에 동일 적용
      isGaJong: isGaJong,    // 가종격 여부 (60~70%)
      dominant: dominant, parEl: parEl, pct: pct.toFixed(0), name: jongName, dayEl: dayEl,
      heHaPriority: hadChongOverride,
      ganHeMerged: ganHeMerged,
      jiHeMerged: jiHeMerged
    };

    // ── 가종격은 대운 조건에 따라 진종격으로 전환될 수 있음 ──────────
    // 진종격(70%+) 이상도 반대세력 뿌리 검증
    var myForceCount = (cnt[dayEl]||0) + (cnt[parentOf(dayEl)]||0);
    var myForcePct   = (myForceCount / total) * 100;
    var isFollowingOthers = (jongName.indexOf('종아격')>=0 || jongName.indexOf('종재격')>=0 || jongName.indexOf('종살격')>=0 || jongName.indexOf('화격')>=0);
    var JANGGAN_DB = {
      '子':['壬','癸'], '丑':['癸','辛','己'], '寅':['戊','丙','甲'], '卯':['甲','乙'], '辰':['乙','癸','戊'], '巳':['戊','庚','丙'],
      '午':['丙','己','丁'], '未':['丁','乙','己'], '申':['戊','壬','庚'], '酉':['庚','辛'], '戌':['辛','丁','戊'], '亥':['戊','甲','壬']
    };
    var rootElements = [dayEl, parentOf(dayEl)];
    var hasRootInJanggan = false;
    [p.y.j, p.m.j, p.d.j, p.h.j].forEach(function(z){
      if(!z) return;
      (JANGGAN_DB[z]||[]).forEach(function(jgGan){
        if(GAN[jgGan] && rootElements.indexOf(GAN[jgGan].e)>=0) hasRootInJanggan = true;
      });
    });

    // 가종격은 별도 'pending' 없이 바로 isGaJong=true로 처리
    // 진종격이라도 반대세력이 뚜렷하면 가종격으로 격하
    if(!isGaJong) {
      var opposingPct = ((total - myForceCount) / total) * 100;
      if (isFollowingOthers && (myForcePct >= 21 || hasRootInJanggan)) {
        jongResult.isGaJong = true;
        jongResult.name = '가(假)' + jongName;
      } else if (!isFollowingOthers && opposingPct >= 21) {
        jongResult.isGaJong = true;
        jongResult.name = '가(假)' + jongName;
      }
    }

    return jongResult;
  }
  return{isJong:false};
}

/* ─ 오행 분포 ─ */
function calcNatalElement(p){
  var cnt={wood:0,fire:0,earth:0,metal:0,water:0};
  [p.y.g,p.y.j,p.m.g,p.m.j,p.d.g,p.d.j,p.h.g,p.h.j].forEach(function(e){
    var inf=GAN[e]||JI[e];if(inf&&inf.e)cnt[inf.e]++;
  });
  if(p.m.j&&JI[p.m.j])cnt[JI[p.m.j].e]++;
  var total=Object.values(cnt).reduce(function(a,b){return a+b;},0)||1;
  var ratios={};for(var k in cnt)ratios[k]=cnt[k]/total*100;
  var dominant='wood',max=0;
  for(var k2 in cnt){if(cnt[k2]>max){max=cnt[k2];dominant=k2;}}
  return{dominant:dominant,ratios:ratios,counts:cnt};
}

/* ─ 퀀텀 오행 평가 함수 (조후 우선, 종격/억부 반영) ─ */
function getQuantumElType(el, p, jg, pw, jh){
  if(!el)return 'neutral';
  if(jg&&jg.isJong){
    if(el===jg.dominant||el===jg.parEl)return 'good';
    if(el===whoControls(jg.dominant))return 'bad';
    return 'neutral';
  }
  
  var isJohuGood = false;
  var isJohuBad = false;
  
  var mz = p.m.j;
  if(mz==='亥' || mz==='子' || mz==='丑' || mz==='寅'){
    if(el==='fire') isJohuGood = true;
    if(el==='water') isJohuBad = true;
  } else if(mz==='巳' || mz==='午' || mz==='未'){
    if(el==='water') isJohuGood = true;
    if(el==='fire') isJohuBad = true;
  }

  if(jh){
    if(jh.type==='hot' || jh.type==='warm'){
      if(el==='water' || el==='metal') isJohuGood = true;
      if(el==='fire' || el==='wood') isJohuBad = true;
    } else if(jh.type==='cold' || jh.type==='cool'){
      if(el==='fire' || el==='wood') isJohuGood = true;
      if(el==='water' || el==='metal') isJohuBad = true;
    }
  }
  
  var isEokbuGood = pw && pw.yongshin.indexOf(el)>=0;
  var isEokbuBad = pw && pw.kijishin.indexOf(el)>=0;

  if(isJohuGood && isEokbuGood) return 'good';
  if(isJohuBad && isEokbuBad) return 'bad';
  if(isJohuGood) return 'good'; 
  if(isJohuBad) return 'bad';
  if(isEokbuGood) return 'good';
  if(isEokbuBad) return 'bad';

  return 'neutral';
}

var __evalDaewunMemo = new Map();
var __evalDaewunContextVersion = 0;

function resetEvalDaewunMemo() {
  __evalDaewunContextVersion += 1;
  __evalDaewunMemo.clear();
}

/* ─ 대운 통합 평가: 퀀텀 명리 엔진(조후 우선, 합화 반영) ─ */
function evalDaewun(ganChar,zhiChar){
  var cacheKey = __evalDaewunContextVersion + '|' + ganChar + '|' + zhiChar;
  if (__evalDaewunMemo.has(cacheKey)) {
    return __evalDaewunMemo.get(cacheKey);
  }

  var pw=G_POWER,jg=G_JONG,jh=G_JOHU,p0=G_PILLARS;
  var score=50; // 기본 점수 50점
  var ganEl=(GAN[ganChar]||{}).e||'earth';
  var zhiEl=(JI[zhiChar]||{}).e||'earth';

  var GANHE_Q={'甲':{'己':'earth'},'己':{'甲':'earth'},'乙':{'庚':'metal'},'庚':{'乙':'metal'},'丙':{'辛':'water'},'辛':{'丙':'water'},'丁':{'壬':'wood'},'壬':{'丁':'wood'},'戊':{'癸':'fire'},'癸':{'戊':'fire'}};
  var JIHE_Q={'子':{'丑':'earth'},'丑':{'子':'earth'},'寅':{'亥':'wood'},'亥':{'寅':'wood'},'卯':{'戌':'fire'},'戌':{'卯':'fire'},'辰':{'酉':'metal'},'酉':{'辰':'metal'},'巳':{'申':'water'},'申':{'巳':'water'},'午':{'未':'fire'},'未':{'午':'fire'}};

  var origGans=p0 ? [p0.y.g,p0.m.g,p0.d.g,p0.h.g].filter(Boolean) : [];
  var origZhis=p0 ? [p0.y.j,p0.m.j,p0.d.j,p0.h.j].filter(Boolean) : [];

  var finalGanEl = ganEl;
  origGans.forEach(function(og){
    if(!og)return;
    if(GANHE_Q[ganChar]&&GANHE_Q[ganChar][og]) { finalGanEl = GANHE_Q[ganChar][og]; }
    else if(GANHE_Q[og]&&GANHE_Q[og][ganChar]) { finalGanEl = GANHE_Q[og][ganChar]; }
  });

  var finalZhiEl = zhiEl;
  origZhis.forEach(function(oz){
    if(!oz)return;
    if(JIHE_Q[zhiChar]&&JIHE_Q[zhiChar][oz]) { finalZhiEl = JIHE_Q[zhiChar][oz]; }
    else if(JIHE_Q[oz]&&JIHE_Q[oz][zhiChar]) { finalZhiEl = JIHE_Q[oz][zhiChar]; }
  });

  var johuScore = 0;
  var isCold = false;
  var isHot = false;
  
  if(jh){
    if(jh.type === 'cold' || jh.type === 'cool') isCold = true;
    if(jh.type === 'hot' || jh.type === 'warm') isHot = true;
  } else if(p0 && p0.m && p0.m.j) {
    var mz = p0.m.j;
    if(mz==='亥' || mz==='子' || mz==='丑' || mz==='寅') isCold = true;
    if(mz==='巳' || mz==='午' || mz==='未') isHot = true;
  }

  function getJohuScore(el, isZhi, charStr) {
    var s = 0;
    var w = isZhi ? 1.5 : 1; // 지지가 천간보다 1.5배 영향력
    if (isCold) {
      if (el === 'fire') s = 10 * w; // 화 대운: 최고점 (+10, +20)
      else if (el === 'earth') {
        if (isZhi && (charStr === '未' || charStr === '戌')) s = 8 * w; // 조토: 제습 (+16)
        else s = 5 * w; // 일반 토 (+5, +10)
      }
      else if (el === 'wood') s = 3 * w;
      else if (el === 'metal') s = -3 * w;
      else if (el === 'water') s = -10 * w; // 수 대운: 최하점 (-10, -20)
    } else if (isHot) {
      if (el === 'water') s = 10 * w; // 수 대운: 최고점 (+10, +20)
      else if (el === 'metal') s = 5 * w;
      else if (el === 'earth') {
        if (isZhi && (charStr === '辰' || charStr === '丑')) s = 5 * w; // 습토 (+10)
        else if (isZhi && (charStr === '未' || charStr === '戌')) s = -8 * w; // 조토 (-16)
        else s = -3 * w;
      }
      else if (el === 'wood') s = -3 * w;
      else if (el === 'fire') s = -10 * w; // 화 대운: 최하점 (-10, -20)
    }
    return s;
  }

  var ganJohu = getJohuScore(finalGanEl, false, ganChar);
  var zhiJohu = getJohuScore(finalZhiEl, true, zhiChar);

  function getEokbuScore(el, isZhi) {
    var s = 0;
    // 종格: 종格격에서 지지가 더 중요 — 가중치 상향 (지지 15점, 천간 10점)
    var w = jg && jg.isJong ? (isZhi ? 15 : 10) : (isZhi ? 12 : 8);
    if (jg && jg.isJong) {
      if (el === jg.dominant || el === jg.parEl) s = w;
      else if (el === whoControls(jg.dominant)) s = -w;
      // 종재격/가종재격: 인성(일간을 生하는 오행)도 기신 — 일간 강화 → 재성 극 위험
      if (jg.name && jg.name.indexOf('종재격') >= 0 && jg.dayEl) {
        if (el === parentOf(jg.dayEl)) s = -w;
      }
    } else if (pw) {
      if (pw.yongshin.indexOf(el) >= 0) s = w;
      else if (pw.kijishin.indexOf(el) >= 0) s = -w;
    }
    return s;
  }

  var ganEokbu = getEokbuScore(finalGanEl, false);
  var zhiEokbu = getEokbuScore(finalZhiEl, true);

  var ganScore = ganJohu + ganEokbu;
  var zhiScore = zhiJohu + zhiEokbu;

  var GAN_CHUNG = {'甲':'庚', '庚':'甲', '乙':'辛', '辛':'乙', '丙':'壬', '壬':'丙', '丁':'癸', '癸':'丁'};
  var ZHI_CHUNG = {'子':'午', '午':'子', '丑':'未', '未':'丑', '寅':'申', '申':'寅', '卯':'酉', '酉':'卯', '辰':'戌', '戌':'辰', '巳':'亥', '亥':'巳'};

  var chungBonus = 0;
  var hasChungBonus = false;
  var chungBonusText = "";
  var chungPenalty = 0;
  var hasChungPenalty = false;
  var chungPenaltyText = "";

  function isFavorable(el, isZhi, charStr) {
    return (getJohuScore(el, isZhi, charStr) + getEokbuScore(el, isZhi)) > 0;
  }
  function isUnfavorable(el, isZhi, charStr) {
    return (getJohuScore(el, isZhi, charStr) + getEokbuScore(el, isZhi)) < 0;
  }

  var isMetalDM = p0 && (p0.d.g === '庚' || p0.d.g === '辛');
  var isFireFavorable = false;
  if(pw) isFireFavorable = pw.yongshin.indexOf('fire')>=0 || isFavorable('fire', false, '丙');
  if(jg && jg.isJong) isFireFavorable = isFireFavorable || jg.dominant==='fire' || jg.parEl==='fire';
  
  function checkSMFW(srcChar, targetChar) {
    if(!isMetalDM || !isFireFavorable) return false;
    var srcEl = (GAN[srcChar] || JI[srcChar] || {}).e;
    var tgtEl = (GAN[targetChar] || JI[targetChar] || {}).e;
    return (srcEl === 'fire' && tgtEl === 'water') || (srcEl === 'water' && tgtEl === 'fire');
  }

  var isDM_Sin = p0 && p0.d.g === '辛';
  if (isDM_Sin && ganChar === '丁') {
    var hasWood = (zhiEl === 'wood');
    if (!hasWood) {
      origGans.forEach(function(g) { if((GAN[g]||{}).e === 'wood') hasWood = true; });
      origZhis.forEach(function(z) { if((JI[z]||{}).e === 'wood') hasWood = true; });
    }
    
    chungPenalty -= 15;
    hasChungPenalty = true;
    var sinDingText = "⚠️ <b>편관(丁)의 위협!</b> 신금(辛) 일간에게 정화(丁)는 완성된 보석을 녹이는 화로불과 같아 본질을 훼손합니다. 신강하더라도 병화(丙)와 달리 대단히 부정적으로 작용하므로, 성급한 나섬을 피하고 토(土)의 보호막 뒤로 숨어야 하는 시기입니다.";
    
    if (hasWood) {
      chungPenalty -= 40; // 강력한 추가 감점
      sinDingText += " 설상가상으로 <b>토(土)를 극하는 목(木) 기운</b>이 함께 작용해 나를 지켜줄 방패막이마저 뚫렸습니다. 관재구설, 극심한 스트레스, 손재수 및 파재가 우려되니 각별히 수성하십시오!";
    }
    
    if (chungPenaltyText) {
      chungPenaltyText += "<br><br>" + sinDingText;
    } else {
      chungPenaltyText = sinDingText;
    }
  }

  // 원국 합화된 천간 목록 (합으로 이미 묶인 천간과의 충은 무효)
  var natalGanHeMerged = (jg && jg.ganHeMerged) ? jg.ganHeMerged : {};
  var natalJiHeMerged  = (jg && jg.jiHeMerged)  ? jg.jiHeMerged  : {};

  if (GAN_CHUNG[ganChar] && origGans.indexOf(GAN_CHUNG[ganChar]) >= 0) {
    var tChar = GAN_CHUNG[ganChar];
    // 원국에서 합화된 천간이면 충 자체가 무효 (합이 충을 제압)
    if (natalGanHeMerged[tChar]) {
      // 합화된 천간은 충의 대상이 아님 — 스킵
    } else {
    var tEl = (GAN[tChar] || {}).e || 'earth';
    var isSpecialGan = checkSMFW(ganChar, tChar);

    if (isSpecialGan) {
      chungBonus += 25;
      hasChungBonus = true;
      chungBonusText = "🔥 <b>화련진금(火鍊眞金) 발복!</b> 금(金) 일간이 꼭 필요한 화(火)를 쓰는 중에 수(水)와 극렬히 충돌합니다. 파극이 아니라 물과 불이 교차하며 강철을 벼려내는 담금질의 시간이 되어 역경을 뚫고 찬란한 대성취를 이룹니다.";
    } else if (ganScore > 0 && isUnfavorable(tEl, false, tChar)) {
      chungBonus += 15;
      hasChungBonus = true;
      chungBonusText = "💥 <b>흉신 파기!</b> 고통의 사슬이 끊어지며 천간에 새로운 길이 열립니다. 사주를 옥죄던 원국의 기신(" + tChar + ")이 용신의 일격(沖)을 받아 산산조각 났습니다. 우주의 억압이 풀리는 극적인 발복의 시기입니다.";
    } else if (ganScore < 0 && isFavorable(tEl, false, tChar)) {
      chungPenalty -= 15;
      hasChungPenalty = true;
      chungPenaltyText = "⚠️ <b>용신 파손!</b> 영혼의 보호막이 깨지는 치명적 흉운. 믿었던 천간 용신(" + tChar + ")이 흉신의 강한 타격을 받았습니다. 방어막을 치고 수성에 집중해야 합니다.";
    } else if (ganScore > 0 && ganEl !== finalGanEl) {
      chungBonus += 10;
      hasChungBonus = true;
      chungBonusText = "✨ <b>합화 용신 보너스!</b> 불리했던 흉신이 합으로 묶이며 용신으로 돌변했습니다. 위기가 기회로 뒤바뀌는 횡재수입니다.";
    }
    } // else (합화 안된 천간) 블록 닫기
  }

  if (ZHI_CHUNG[zhiChar] && origZhis.indexOf(ZHI_CHUNG[zhiChar]) >= 0) {
    var tChar = ZHI_CHUNG[zhiChar];
    // 지지충은 합>충 원칙 미적용 — 기존 로직 유지
    var tEl = (JI[tChar] || {}).e || 'earth';
    var isSpecialZhi = checkSMFW(zhiChar, tChar);

    if (isSpecialZhi) {
      chungBonus += 30;
      hasChungBonus = true;
      chungBonusText += (chungBonusText?"<br><br>":"") + "🔥 <b>수화기제(水火旣濟) 대발복!</b> 지지에서 일어나는 물과 불의 거대한 충돌이 도리어 금(金) 일간의 제련을 완성시킵니다. 혼란과 시련 속에 가장 위대한 성과가 탄생하는 통쾌한 일발역전입니다.";
    } else if (zhiScore > 0 && isUnfavorable(tEl, true, tChar)) {
      chungBonus += 20;
      hasChungBonus = true;
      var tJohu = getJohuScore(tEl, true, tChar);
      if(tJohu < -5) {
        chungBonusText += (chungBonusText?"<br><br>":"") + "💥 <b>조후 흉신 파기!</b> 가혹한 계절 같던 조후 흉신(" + tChar + ")을 대운의 조후 용신(" + zhiChar + ")이 충극하여 깨부숩니다. 길었던 고통의 터널을 벗어나 새 길이 열립니다!";
      } else {
        chungBonusText += (chungBonusText?"<br><br>":"") + "💥 <b>지장 흉신 파기!</b> 거대한 성취의 서막. 내 현실을 막던 원국의 기신(" + tChar + ")이 용신(" + zhiChar + ")에 의해 산산조각 나며 통쾌한 일발 역전이 일어납니다.";
      }
    } else if (zhiScore < 0 && isFavorable(tEl, true, tChar)) {
      chungPenalty -= 20;
      hasChungPenalty = true;
      chungPenaltyText += (chungPenaltyText?"<br><br>":"") + "⚠️ <b>지지 용신 붕괴!</b> 나의 현실을 든든하게 받쳐주던 지지 용신(" + tChar + ")이 흉신(" + zhiChar + ")의 타격에 무너집니다. 구설수, 손재수, 사고를 절대 주의하십시오.";
    } else if (zhiScore > 0 && zhiEl !== finalZhiEl) {
      chungBonus += 15;
      hasChungBonus = true;
      chungBonusText += (chungBonusText?"<br><br>":"") + "✨ <b>지지 합화 명국!</b> 치명적인 기신이 귀인의 개입(合)으로 묶여 해결되며 안정과 뜻밖의 성취를 얻습니다.";
    }
  }

  // ── 지지 육합(六合) 보너스: 대운 지지가 원국과 합하여 용신 오행 강화 ──
  var JIHE_BNS = {
    '子':{'丑':'earth'},'丑':{'子':'earth'},
    '寅':{'亥':'wood'},'亥':{'寅':'wood'},
    '卯':{'戌':'fire'},'戌':{'卯':'fire'},
    '辰':{'酉':'metal'},'酉':{'辰':'metal'},
    '巳':{'申':'water'},'申':{'巳':'water'},
    '午':{'未':'fire'},'未':{'午':'fire'}
  };
  var jiheBonus = 0;
  var hasJiheBonus = false;
  var jiheBonusTxt = '';
  if(JIHE_BNS[zhiChar]) {
    origZhis.forEach(function(oz){
      if(!oz || !JIHE_BNS[zhiChar][oz]) return;
      var heEl = JIHE_BNS[zhiChar][oz];
      var bs = isFavorable(heEl, true, zhiChar) ? 10 : (isUnfavorable(heEl, true, zhiChar) ? -10 : 0);
      if(bs > 0){
        jiheBonus += bs; hasJiheBonus = true;
        jiheBonusTxt += '🔗 <b>지지 육합('+zhiChar+oz+') 강화!</b> '+(EL_K[heEl]||heEl)+' 오행이 합으로 강화됩니다.';
      } else if(bs < 0){
        jiheBonus += bs;
        jiheBonusTxt += '⚠️ 지지 육합으로 기신 오행 강화.';
      }
    });
  }

  // ── 삼합(三合) 보너스: 대운 지지가 원국과 삼합/반합 형성 ──
  var SAMHAP = [
    {m:['申','子','辰'], el:'water'},
    {m:['亥','卯','未'], el:'wood'},
    {m:['寅','午','戌'], el:'fire'},
    {m:['巳','酉','丑'], el:'metal'}
  ];
  var samhapBonus = 0;
  var hasSamhapBonus = false;
  var samhapBonusTxt = '';
  SAMHAP.forEach(function(sh){
    if(sh.m.indexOf(zhiChar) < 0) return;
    var matchCnt = 0;
    origZhis.forEach(function(oz){ if(oz && sh.m.indexOf(oz) >= 0) matchCnt++; });
    if(matchCnt >= 2) { // 삼합 완성 (원국 2개 + 대운 1개)
      var bs = isFavorable(sh.el, true, zhiChar) ? 22 : (isUnfavorable(sh.el, true, zhiChar) ? -22 : 0);
      if(bs > 0){
        samhapBonus += bs; hasSamhapBonus = true;
        samhapBonusTxt = '⭐ <b>삼합(三合) 대발복!</b> '+zhiChar+'이 원국과 삼합을 이뤄 '+(EL_K[sh.el]||sh.el)+' 오행이 최강으로 강화됩니다!';
      } else if(bs < 0){
        samhapBonus += bs;
        samhapBonusTxt = '⚠️ <b>삼합 기신 강화!</b> 삼합으로 흉신 오행이 집중됩니다.';
      }
    } else if(matchCnt >= 1) { // 반합
      var bs2 = isFavorable(sh.el, true, zhiChar) ? 10 : (isUnfavorable(sh.el, true, zhiChar) ? -10 : 0);
      if(bs2 !== 0){
        samhapBonus += bs2;
        if(bs2 > 0){ hasSamhapBonus = true; samhapBonusTxt += '🌀 <b>반합 강화</b>: '+(EL_K[sh.el]||sh.el)+' 기운 증폭.'; }
      }
    }
  });

  score += ganScore + zhiScore + chungBonus + chungPenalty + jiheBonus + samhapBonus;

  // evalSummary에 합/삼합 정보 추가용 플래그 저장
  var _jiheTxt = jiheBonusTxt;
  var _samhapTxt = samhapBonusTxt;

  score = Math.max(0, Math.min(100, Math.round(score)));

  var label,cls,tagCls,emoji;
  if(score>=80){label='🌟 최고의 운';cls='excellent';tagCls='tag-best';emoji='🌟';}
  else if(score>=60){label='😊 좋은 운';cls='good';tagCls='tag-good';emoji='😊';}
  else if(score>=40){label='🙂 보통 운';cls='neutral';tagCls='tag-ok';emoji='🙂';}
  else if(score>=20){label='⚠️ 주의 운';cls='caution';tagCls='tag-caut';emoji='⚠️';}
  else{label='🌧️ 역경 운';cls='bad';tagCls='tag-bad';emoji='🌧️';}

  var evalSummary = "";
  if(jg && jg.isJong) {
    var jongLabel = jg.isGaJong ? '가종격' : '종격';
    if(ganEokbu > 0 || zhiEokbu > 0) evalSummary = '🌀 '+jongLabel+'('+( EL_K[jg.dominant]||'')+') 강화운';
    else if(ganEokbu < 0 || zhiEokbu < 0) evalSummary = '⚠️ '+jongLabel+' 약화운';
    else evalSummary = '🙂 '+jongLabel+' 중립운';
  } else {
    var pos = []; var neg = [];
    if(ganJohu > 0 || zhiJohu > 5) pos.push("조후용신"); 
    if(ganJohu < 0 || zhiJohu < -5) neg.push("조후기신");
    if(ganEokbu > 0 || zhiEokbu > 5) pos.push("억부희용"); 
    if(ganEokbu < 0 || zhiEokbu < -5) neg.push("억부기구");
    
    if(pos.length && !neg.length) evalSummary = "🌟 " + pos.join("+") + " 대운";
    else if(!pos.length && neg.length) evalSummary = "🌧️ " + neg.join("+") + " 대운";
    else if(pos.length && neg.length) evalSummary = "⚖️ 복합운 (" + pos[0] + " 외)";
    else evalSummary = "🙂 평운";
  }
  if(hasChungBonus) evalSummary = "💥[흉신파기] " + evalSummary;
  if(hasChungPenalty) evalSummary = "⚠️[용신파손] " + evalSummary;
  if(hasSamhapBonus) evalSummary = "⭐[삼합발복] " + evalSummary;
  else if(hasJiheBonus) evalSummary = "🔗[육합강화] " + evalSummary;

  // 종격 강화/약화/중립 판정 (카드 색상·배지에 활용)
  var jongStrength = null;
  if(jg && jg.isJong) {
    if(ganEokbu > 0 || zhiEokbu > 0) jongStrength = 'strengthen';
    else if(ganEokbu < 0 || zhiEokbu < 0) jongStrength = 'weaken';
    else jongStrength = 'neutral';
  }

  var result = {score:score,label:label,cls:cls,tagCls:tagCls,emoji:emoji,
    hasChungBonus:hasChungBonus,hasChungPenalty:hasChungPenalty,
    chungBonusText:chungBonusText,chungPenaltyText:chungPenaltyText,
    hasJiheBonus:hasJiheBonus, jiheBonusTxt:_jiheTxt,
    hasSamhapBonus:hasSamhapBonus, samhapBonusTxt:_samhapTxt,
    evalSummary:evalSummary, jongStrength:jongStrength};

  __evalDaewunMemo.set(cacheKey, result);
  return result;
}

/* ─── NEO_GAEUN_DB — 쌈바 팩폭 어투 대운 해석 ─── */
var NEO_GAEUN_DB={
  fire:{
    good:{love:'열정 지수 MAX. 지금 움직이지 않으면 기회는 사라진다. 주도적으로 어필하거나 포기하거나, 선택해라.',wealth:'확장 에너지 고조. IT·에너지·미디어 섹터에 자금을 투입할 타이밍이다. 망설임이 최대 그림자 파동다.',relationship:'리더십 발동 조건 성립. 팀을 이끌어라. 에너지를 나눠주는 게 아니라 방향을 제시해라.',career:'승진·이직 창이 열렸다. 프레젠테이션을 망치면 자업자득이니 준비하고 들어가라.',health:'심장·혈압이 과부하 직전이다. 과로하면 성과도 같이 무너진다. 지금 당장 수면 시간을 확보해라.',lifestyle:'과열을 식혀라. 수기(水氣) 공간·파란 계열 소품·물가 산책이 운 조절의 정답이다.'},
    bad:{love:'감정 불안정 경보. 충동적 결정은 관계를 날려버린다. 생각하고 말해라.',wealth:'충동 소비·투기성 베팅은 자살행위다. 안전자산으로 포트폴리오를 재편해라.',relationship:'날선 발언이 관계를 망가뜨린다. 말하기 전에 3초 멈춰라. 이게 천기가다.',career:'상사와의 충돌은 패착이다. 이기고 싶으면 실력으로만 증명해라.',health:'스트레스 누적이 임계점이다. 명상·호흡법을 즉시 도입하지 않으면 몸이 먼저 파업한다.',lifestyle:'수기(水氣) 보완 필수다. 온도를 낮추고 파란색 계열로 환경을 바꿔라.'}
  },
  water:{
    good:{love:'감정 깊이와 소통 능력이 정점이다. 진짜 대화를 시작하면 관계가 다음 단계로 간다.',wealth:'유통·물류·콘텐츠 플랫폼에서 현금 흐름이 열린다. 유동성을 확보하고 흐름을 타라.',relationship:'경청 모드 활성화. 신뢰는 지금 쌓지 않으면 다음 판에 없다.',career:'기획·천기 업무에서 압도적 퍼포먼스를 낼 수 있다. 해외 채널도 열어봐라.',health:'신장·방광이 약점이다. 수분 섭취량을 지금 당장 늘리고 체온을 유지해라.',lifestyle:'북향·검정·네이비 인테리어. 온천·해변이 에너지 리셋에 최적이다.'},
    bad:{love:'우유부단함은 상대방을 지치게 만든다. 지금 "예스"냐 "노"냐 결정을 내려라.',wealth:'돈이 줄줄 새고 있다. 비상금 계좌 분리가 지금 당장 해야 할 일 1순위다.',relationship:'소극적 태도는 고립을 자초한다. 불편해도 먼저 연락해라.',career:'무기력·우울은 선택이 아니라 증상이다. 작은 할 일 목록부터 시작해서 뇌를 가동시켜라.',health:'냉증·순환기 이상 신호가 켜졌다. 운동으로 체온 올리는 것이 최선의 처방이다.',lifestyle:'햇볕·따뜻한 음료·붉은 소품이 필수 처방이다. 지금 당장 적용해라.'}
  },
  wood:{
    good:{love:'자연스러운 성장 기반 관계가 형성된다. 함께 목표를 향해 달리는 파트너를 찾아라.',wealth:'교육·바이오·친환경이 황금 시장이다. 장기 포지션으로 가져가라.',relationship:'포용력 UP, 멘토 포지션이 열렸다. 그 역할을 회피하지 마라.',career:'새 프로젝트 돌입 타이밍이다. 자격증·스킬 업에 투자하면 ROI가 높다.',health:'간·담낭이 신호를 보낸다. 스트레칭·요가를 루틴에 넣어라.',lifestyle:'동향 빛·녹색 식물·숲 산책. 이 조합이 에너지 충전 공식이다.'},
    bad:{love:'이상만 높고 실행이 없다면 관계는 진전이 없다. 행동하거나 포기하거나.',wealth:'계획만 쌓이고 실행이 없으면 기회비용만 는다. 지금 당장 하나라도 시작해라.',relationship:'고집은 인간관계를 좁게 만든다. 타협은 패배가 아니라 전술이다.',career:'70% 완성도로 내보내는 용기가 없으면 아무것도 완성되지 않는다.',health:'소화기 과부하 경보. 과식을 멈추고 식사 간격을 규칙화해라.',lifestyle:'금기운 소품으로 결단력을 보완해라. 완벽주의 내려놓기가 최우선 천기가다.'}
  },
  metal:{
    good:{love:'관계 정립 타이밍이다. 결혼·약속 등 확정적 결정을 내릴 명분이 충분하다.',wealth:'금융·부동산·법률 섹터에서 계약 기회가 열린다. 서류는 반드시 꼼꼼히 검토해라.',relationship:'공정한 원칙주의가 신뢰를 만든다. 중재자 포지션을 적극 활용해라.',career:'성궁 진법 구축·수호·감독 역할에서 성과가 나온다. 이것이 당신의 영험 지표다.',health:'폐·대장 수호가 필수다. 호흡기 예방 루틴을 지금 세워라.',lifestyle:'서향·흰색·회색 미니멀 공간. 정리정돈이 운기를 올리는 가장 빠른 방법이다.'},
    bad:{love:'냉정함이 상대를 밀쳐낸다. 감정 표현을 억지로라도 연습해야 한다.',wealth:'지나친 절약은 기회비용을 키운다. 수익성 있는 곳엔 과감히 투자해라.',relationship:'비판은 독이다. 칭찬 1 비판 0.5 비율로 즉시 조정해라.',career:'융통성 결여가 팀 역량을 갉아먹는다. 상황 판단이 원칙보다 앞서야 할 때가 있다.',health:'건조증이 온몸에서 나타난다. 수분 보충·보습을 즉시 루틴화해라.',lifestyle:'따뜻한 색감·감성 콘텐츠로 딱딱한 에너지를 풀어라. 이건 선택이 아니라 필수다.'}
  },
  earth:{
    good:{love:'안정적·장기적 관계가 열린다. 동거·결혼을 검토하기 좋은 타이밍이다.',wealth:'부동산·건설·식품 분야에서 자산 축적 흐름이 형성된다. 저축 먼저, 투자는 그 다음이다.',relationship:'신뢰받는 조력자 포지션 확보. 당신이 든든한 버팀목이 되는 시기다.',career:'꾸준함이 성과로 전환되는 구간이다. 장기 프로젝트 완수 능력을 증명해라.',health:'위장·비장 수호 구간이다. 불규칙 식사·야식을 즉시 끊어라.',lifestyle:'중앙 배치·노란색·갈색 공간. 도예·요리가 土기운 충전에 가장 효율적이다.'},
    bad:{love:'지루함은 관계를 갉아먹는다. 새로운 데이트·서프라이즈 이벤트를 당장 기획해라.',wealth:'변화 회피가 손실을 키운다. 새로운 수익 모델 탐색을 지금 시작해라.',relationship:'폐쇄적 태도가 인맥을 좁힌다. 불편해도 새로운 네트워크에 발을 들여라.',career:'현재 자리에 안주하면 도태된다. 자기계발 투자를 지금 시작해라.',health:'체중·혈당 수호 구간이다. 유산소 운동을 주 3회 이상 강제해라.',lifestyle:'활동적 여가·여행으로 정체된 에너지를 타파해라. 지금 당장 계획을 세워라.'}
  }
};

function getDetailedGaeun(element,isGood){
  if(NEO_MODE && NEO_GAEUN_DB[element]){
    return NEO_GAEUN_DB[element][isGood?'good':'bad'];
  }
  return(GAEUN_DB[element]||GAEUN_DB.earth)[isGood?'good':'bad'];
}
function getGaeunTips(strongE){
  var ctrl=whoControls(strongE);
  var drain=SHENG[strongE];
  return{controller:ctrl,drain:drain,ctips:GAEUN_TIPS[ctrl]||GAEUN_TIPS.metal,dtips:GAEUN_TIPS[drain]||GAEUN_TIPS.fire};
}

/* ═ 종격 감별 UI (Interactive Jong-gyeok) ═ */
function extractSixPastTestingYears(jongResult, p) {
  var yongshin = [jongResult.dominant, jongResult.parEl];
  if(jongResult.name.indexOf('종아')>-1) yongshin.push(KE[jongResult.dayEl]); // 식상 생재
  if(jongResult.name.indexOf('종재')>-1) yongshin.push(SHENG[jongResult.dominant]); // 식상 생재
  if(jongResult.name.indexOf('종살')>-1) yongshin.push(KE[jongResult.dayEl]); // 재성 생살
  
  var kishin = [whoControls(jongResult.dominant)];
  var JongSelfNames = ['종강격', '곡직격', '염상격', '가색격', '종혁격', '윤하격', '종왕격'];
  var isFollowingSelf = false;
  JongSelfNames.forEach(function(n) { if(jongResult.name.indexOf(n)>-1) isFollowingSelf = true; });

  if (!isFollowingSelf) {
      kishin.push(jongResult.dayEl, parentOf(jongResult.dayEl));
  } else {
      kishin.push(KE[jongResult.dayEl], SHENG[jongResult.dayEl], whoControls(jongResult.dayEl));
  }

  var cY = new Date().getFullYear();
  var candidates = [];
  var GAN_E = { '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth','己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water' };
  var ZHI_E = { '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth','巳':'fire','午':'fire','未':'earth','申':'metal','酉':'metal','戌':'earth','亥':'water' };
  var gArr = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var zArr = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  
  var birthYear = p.y.y ? parseInt(p.y.y) : (cY - 30);
  for(var i=cY-25; i<=cY-1; i++) {
      var diff = i - 1984; // 1984년 甲子년 기준
      var gId = (diff % 10 + 10) % 10;
      var zId = (diff % 12 + 12) % 12;
      if (gId < 0) gId += 10;
      if (zId < 0) zId += 12;
      var g = gArr[gId]; var z = zArr[zId];
      if (i - birthYear > 8) { // 8살 이전 과거는 제외
          candidates.push({y: i, g:g, z:z, gE:GAN_E[g], zE:ZHI_E[z]});
      }
  }
  
  candidates.reverse();
  
  var bestYears = [];
  var worstYears = [];
  
  candidates.forEach(function(c) {
      if(bestYears.length < 3 && yongshin.indexOf(c.gE)>-1 && yongshin.indexOf(c.zE)>-1) bestYears.push(c);
  });
  candidates.forEach(function(c) {
      if(bestYears.length < 3 && !bestYears.includes(c) && (yongshin.indexOf(c.zE)>-1 || yongshin.indexOf(c.gE)>-1)) bestYears.push(c);
  });

  candidates.forEach(function(c) {
      if(worstYears.length < 3 && kishin.indexOf(c.gE)>-1 && kishin.indexOf(c.zE)>-1 && !bestYears.includes(c)) worstYears.push(c);
  });
  candidates.forEach(function(c) {
      if(worstYears.length < 3 && !worstYears.includes(c) && !bestYears.includes(c) && (kishin.indexOf(c.zE)>-1 || kishin.indexOf(c.gE)>-1)) worstYears.push(c);
  });

  return {best: bestYears.sort(function(a,b){return a.y-b.y;}), worst: worstYears.sort(function(a,b){return a.y-b.y;})};
}

function showJongVerificationModal(jongResult, p) {
  return new Promise(function(resolve) {
      var parsedYrs = extractSixPastTestingYears(jongResult, p);
      var bestText = parsedYrs.best.map(function(y){return y.y+"년(" + y.g + y.z + ")"}).join(', ');
      var worstText = parsedYrs.worst.map(function(y){return y.y+"년(" + y.g + y.z + ")"}).join(', ');
      
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(4px); padding:20px;';
      
      var box = document.createElement('div');
      box.style.cssText = 'background:#1a1a2e; color:#e2e8f0; max-width:700px; width:100%; border-radius:12px; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5); border:1px solid #c084fc; max-height: 90vh; overflow-y: auto;';
      var descText = jongResult.isGaJong
        ? '이 명식은 <b>' + jongResult.name + '</b>일 가능성이 있습니다. 지배 오행의 강도가 70~80% 이상 수준으로, 실제 삶의 흐름과 대조해 종격 여부를 한 번 더 검증합니다.<br><br><b style="color:#f472b6;">아래 대표 연도들의 길흉이 종격 패턴과 일치하면 가종격으로 확정됩니다.</b>'
        : '이 명식은 <b>' + jongResult.name + '</b>일 가능성이 있습니다. 일간을 돕는 기운이나 반대 세력이 내장되어 있어 진종격(眞從格) 여부를 판별해야 합니다.<br><br><b style="color:#f472b6;">정확한 판별을 위해 다음 연도들의 길흉을 확인해 주십시오.</b>';
      box.innerHTML = `
          <div style="font-size:1.3rem; font-weight:bold; color:#c084fc; margin-bottom:14px; text-align:center;">
              <i class="fa fa-balance-scale"></i> ${jongResult.isGaJong ? '가종격(假從格)' : '종격(從格)'} 정밀 판별
          </div>
          <div style="font-size:0.95rem; line-height:1.6; color:#cbd5e1; margin-bottom:20px; text-align:justify;">
              ${descText}
          </div>
          
          <div style="background:#0f172a; padding:16px; border-radius:8px; border:1px solid #334155; margin-bottom:16px;">
              <div style="font-weight:bold; color:#10b981; margin-bottom:10px; font-size:1.05rem;">[길운의 시기 대조]</div>
              <div style="color:#94a3b8; font-size:0.9rem; margin-bottom:12px;">대상 연도: ${bestText}</div>
              <div style="color:#e2e8f0; font-size:0.95rem; margin-bottom:12px;">"이 시기에 사회적 성취가 수월하게 좋았고 심리적으로 안정되었습니까?"</div>
              <div style="display:flex; gap:12px;">
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="best_ans" value="yes" checked> <span style="font-size:1rem; color:#a7f3d0; font-weight:bold;">예, 맞습니다.</span></label>
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="best_ans" value="no"> <span style="font-size:1rem;">아니오</span></label>
              </div>
          </div>

          <div style="background:#0f172a; padding:16px; border-radius:8px; border:1px solid #334155; margin-bottom:24px;">
              <div style="font-weight:bold; color:#ef4444; margin-bottom:10px; font-size:1.05rem;">[흉운의 시기 대조]</div>
              <div style="color:#94a3b8; font-size:0.9rem; margin-bottom:12px;">대상 연도: ${worstText}</div>
              <div style="color:#e2e8f0; font-size:0.95rem; margin-bottom:12px;">"이 시기에 건강, 재물, 혹은 관계의 극심한 부침이 있었습니까?"</div>
              <div style="display:flex; gap:12px;">
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="worst_ans" value="yes" checked> <span style="font-size:1rem; color:#fca5a5; font-weight:bold;">예, 맞습니다.</span></label>
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="worst_ans" value="no"> <span style="font-size:1rem;">아니오</span></label>
              </div>
          </div>

          <button id="btnJongSubmit" style="width:100%; padding:15px; background:linear-gradient(135deg, #a855f7, #7e22ce); border:none; border-radius:8px; color:#fff; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 12px rgba(168,85,247,0.3);">최종 격국 확정</button>
      `;
      
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      document.getElementById('btnJongSubmit').onclick = function() {
          var bestAns = document.querySelector('input[name="best_ans"]:checked').value;
          var worstAns = document.querySelector('input[name="worst_ans"]:checked').value;

          document.body.removeChild(overlay);

          if (bestAns === 'yes' && worstAns === 'yes') {
              jongResult.isJong = true;
              var confirmLabel = jongResult.isGaJong ? '가종격 확정' : '종격 확정';
              jongResult.verifiedText = "<span style='color:#a855f7'>[" + confirmLabel + "]</span> 과거의 길흉 화복을 대조한 결과, 해당 오행에 종(從)하는 "+jongResult.name+"의 운세 흐름이 일치함이 검증되었습니다.";
              resolve(jongResult);
          } else {
              resolve({isJong: false, verifiedText: "<span style='color:#3b82f6'>[일반 내격 전환]</span> 과거 운세 흐름이 종격의 길흉과 일치하지 않아 일반격(내격)으로 회귀하여 재분석하였습니다."});
          }
      };
  });
}

/* ═══════════════════════════════════════
   개인정보 동의 모달 제어
═══════════════════════════════════════ */
var FORTUNE_COST_POINTS = 0;
var __fortuneConsumeInFlight = false;

function formatPointAmount(points){
  var n = Number(points || 0);
  if (!Number.isFinite(n)) n = 0;
  if (n <= 0) return '무료';
  return n.toLocaleString('ko-KR') + 'P';
}

function getFortuneApiBaseUrl(){
  if (typeof window !== 'undefined') {
    if (window.CODE_DESTINY_API_BASE_URL) return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '');
    var custom = localStorage.getItem('fortune_api_base_url');
    if (custom) return String(custom).replace(/\/+$/, '');
    var host = String(location.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000';
    if (host === 'api.code-destiny.com') return location.origin;
    if (host.endsWith('.pages.dev')) return 'https://code-destiny.com';
    return location.origin;
  }
  return 'http://localhost:4000';
}

function getFortuneAuthToken(){
  try {
    return localStorage.getItem('fortune_auth_token') || '';
  } catch(e) {
    return '';
  }
}

function getStoredAuthUser(){
  try {
    var raw = localStorage.getItem('fortune_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function isGuestFortuneModeEnabled(){
  return window.__ALLOW_GUEST_FORTUNE !== false;
}

function updateFortunePointNotice(points){
  var costEl = document.getElementById('fortuneCostLabel');
  if (costEl) costEl.textContent = formatPointAmount(FORTUNE_COST_POINTS);

  var currentEl = document.getElementById('fortuneCurrentPoints');
  if (!currentEl) return;

  if (typeof points === 'number' && Number.isFinite(points)) {
    currentEl.textContent = formatPointAmount(points);
    return;
  }

  var user = getStoredAuthUser();
  if (user && typeof user.points === 'number') {
    currentEl.textContent = formatPointAmount(user.points);
  } else {
    currentEl.textContent = isGuestFortuneModeEnabled() ? '비회원 무료 이용' : '로그인 후 확인';
  }
}

function redirectToLoginForFortune(){
  var nextPath = encodeURIComponent('/');
  window.location.href = '/login?next=' + nextPath;
}

function redirectToPointRecharge(){
  var nextPath = encodeURIComponent('/');
  window.location.href = '/points?next=' + nextPath;
}

function showFortuneConfirmModal(costPoints){
  return new Promise(function(resolve){
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(3,7,18,.68);display:flex;align-items:center;justify-content:center;padding:18px;';

    var box = document.createElement('div');
    box.style.cssText = 'width:min(420px,92vw);border-radius:16px;border:1px solid rgba(167,139,250,.45);background:linear-gradient(160deg,rgba(30,27,75,.98),rgba(76,29,149,.96));box-shadow:0 12px 40px rgba(88,28,135,.45);padding:18px;color:#f5f3ff;';
    box.innerHTML = ''
      + '<div style="font-size:.76rem;letter-spacing:.2em;color:#c4b5fd;font-weight:700;margin-bottom:8px;">TWILIGHT POINT CHECK</div>'
      + '<div style="font-size:1rem;line-height:1.55;color:#ede9fe;margin-bottom:14px;">'
      + formatPointAmount(costPoints).replace('P',' 포인트')
      + '가 차감됩니다. 계속하시겠습니까?'
      + '</div>'
      + '<div style="display:flex;gap:10px;">'
      + '<button id="fortunePointCancelBtn" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(221,214,254,.45);background:rgba(30,41,59,.45);color:#e2e8f0;font-weight:700;cursor:pointer;">취소</button>'
      + '<button id="fortunePointConfirmBtn" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(196,181,253,.6);background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 0 18px rgba(168,85,247,.45);">계속하기</button>'
      + '</div>';

    function close(answer){
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(answer);
    }

    box.querySelector('#fortunePointCancelBtn').onclick = function(){ close(false); };
    box.querySelector('#fortunePointConfirmBtn').onclick = function(){ close(true); };
    overlay.onclick = function(e){ if (e.target === overlay) close(false); };

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

async function checkFortunePointEligibility(){
  updateFortunePointNotice();
  return true;
}

async function consumeFortunePointAfterCalculation(){
  updateFortunePointNotice();
  return true;
}

async function checkPrivacyAndCalculate() {
  sessionStorage.setItem('privacyAgreed', 'true');
  await startSajuCalculationFlow();
}

function closePrivacyModal() {
  var modal = document.getElementById('privacy-modal-overlay');
  if (modal) modal.classList.remove('show');
}

async function agreeAndCalculate() {
  sessionStorage.setItem('privacyAgreed', 'true');
  closePrivacyModal();
  await startSajuCalculationFlow();
}

async function startSajuCalculationFlow() {
  if(typeof Solar==='undefined'||typeof Solar.fromYmdHms!=='function'){
    __pendingAutoBirthSnapshot = _captureBirthFormSnapshot();
    __pendingAutoCalculation = true;
    if (!__libLoading && !__libReady) {
      retrySajuLibraryLoad();
    }
    return;
  }
  __pendingAutoCalculation = false;
  var bd=document.getElementById('birthDate').value;
  if(!bd){alert('생년월일을 입력하세요');return;}

  var canProceed = await checkFortunePointEligibility();
  if (!canProceed) return;

  // 만세력 책 로더 기능 제거: 클릭 즉시 계산 실행
  var _spinner = document.getElementById('sajuLoadingSpinner');
  if (_spinner) _spinner.classList.add('loading-spinner--visible');
  try {
    await calculate();
  } catch (calcErr) {
    console.error('[saju] calculate flow failed', calcErr);
    if (_spinner) _spinner.classList.remove('loading-spinner--visible');
    return;
  }
  if (_spinner) _spinner.classList.remove('loading-spinner--visible');

  var resultPage = document.getElementById('resultPage');
  var isResultVisible = !!(resultPage && resultPage.style.display !== 'none');
  if (!isResultVisible) return;

  await consumeFortunePointAfterCalculation();
}

setTimeout(function(){
  try { updateFortunePointNotice(); } catch(e) {}
}, 0);

function runDeferredSajuTasks(taskList) {
  if (!Array.isArray(taskList) || !taskList.length) return;
  var idx = 0;

  function scheduleNext() {
    if (idx >= taskList.length) return;
    var task = taskList[idx++];
    setTimeout(function() {
      try { task(); } catch (e) { console.error('[saju] deferred task error', e); }
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(scheduleNext);
      } else {
        setTimeout(scheduleNext, 0);
      }
    }, 0);
  }

  scheduleNext();
}

/* ═══════════════════════════════════════
   STEP 6: 메인 계산
═══════════════════════════════════════ */
async function calculate(){
  if(typeof Solar==='undefined'||typeof Solar.fromYmdHms!=='function'){
    alert('라이브러리가 아직 로딩 중입니다. 잠시 후 다시 시도해주세요 🐷');return;
  }
  var existingCharm=document.getElementById('specialCharmCard');
  if(existingCharm)existingCharm.remove();

  /* ── 재계산 전 대시보드 카드 원위치 복귀 ─────────────────────────────────
     이전 renderReportDashboard() 호출로 카드들이 대시보드 슬롯 또는 rescue
     zone으로 이동되어 있으면, render 함수들이 getElementById로 카드를 정상
     탐색할 수 있도록 resultPage 레벨로 복귀시키고 숨긴다. 이렇게 하면 두
     번째 이후 계산도 첫 번째 계산과 동일한 초기 상태에서 시작된다. ─── */
  (function _resetDashboardBeforeCalc() {
    try {
      var _rc = document.getElementById('reportDashboard');
      var _rd = document.getElementById('reportDashboardCard');
      var _rz = document.getElementById('_rptRescueZone');
      var _rp = document.getElementById('resultPage');
      ['lottoCard','quantumCard','healthReportCard','skillTreeCard',
       'tTestCard','hormone-vibe-section','energyCoordCard',
       'villainCard','sajuFourCutCard','aiPromptCard'].forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        if ((_rc && _rc.contains(el)) || (_rz && _rz.contains(el))) {
          if (_rp) _rp.appendChild(el);
          el.style.display = 'none';
        }
      });
      if (_rc) _rc.innerHTML = '';
      if (_rd) _rd.style.display = 'none';
      if (_rz) _rz.innerHTML = '';
    } catch (_e) {}
  })();

  USER_NAME=document.getElementById('nameInput').value.trim()||'사용자';
  var bd=document.getElementById('birthDate').value;
  if(!bd){alert('생년월일을 입력하세요');return;}
  
  var calTypeBtns = document.getElementsByName('calType');
  var calType = 'solar';
  for(var i=0; i<calTypeBtns.length; i++) { if(calTypeBtns[i].checked) { calType = calTypeBtns[i].value; break; } }

  var hourEl=document.getElementById('birthHour');
  var minuteEl=document.getElementById('birthMinute');
  var _hRaw=parseInt(hourEl ? hourEl.value : '',10);
  var _mRaw=parseInt(minuteEl ? minuteEl.value : '',10);
  if(isNaN(_hRaw)){
    _hRaw = 12;
    if (hourEl) hourEl.value = '12';
  }else if(_hRaw<0 || _hRaw>23){
    alert('출생 시간을 정확히 선택해주세요.');
    if(hourEl) hourEl.focus();
    return;
  }
  if(isNaN(_mRaw)){
    _mRaw = 0;
    if (minuteEl) minuteEl.value = '0';
  }else if(_mRaw<0 || _mRaw>59){
    alert('출생 분을 정확히 선택해주세요.');
    if(minuteEl) minuteEl.focus();
    return;
  }
  var hour=_hRaw;
  var minute=_mRaw;

  var countrySel = document.getElementById('birthCountry');
  var opt = countrySel ? countrySel.options[countrySel.selectedIndex] : null;
  var bLong = opt ? parseFloat(opt.getAttribute('data-long')) : 127.0;
  var bLat  = opt ? parseFloat(opt.getAttribute('data-lat'))  : 37.6;
  var bBaseTzOff = opt ? parseFloat(opt.getAttribute('data-base-tz') || opt.getAttribute('data-tz') || '9') : 9;

  var actualDateInfo = await getActualSolarDateWithContext(bd, calType, {
    hour: hour,
    minute: minute,
    second: 0,
    latitude: bLat,
    longitude: bLong,
    tzOffsetHours: bBaseTzOff,
    setCurrent: true
  });
  if(!actualDateInfo) { alert('날짜 변환에 실패했습니다. 다시 확인해주세요.'); return; }

  var primaryDateCtx = actualDateInfo.context || null;
  var year=actualDateInfo.y, month=actualDateInfo.m, day=actualDateInfo.d;
  var inputTimeStr = String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00';

  var bTz = countrySel ? countrySel.value : 'Asia/Seoul';
  var tzResolved = resolveBirthTimezoneOffset(year, month, day, hour, minute, bTz, bBaseTzOff);
  var bTzOff = tzResolved.tzOffsetHours;
  var stdLong = bTzOff * 15;
  var lngOffsetMinutes = Math.round((stdLong - bLong) * 4);

  var correctedHour = hour, correctedMinute = minute;
  var correctionMsg = "";
  var resultObj = {
    finalAdjustedTime: '',
    offsetDetails: {
      longitudeOffset: lngOffsetMinutes,
      dstOffset: tzResolved.dstMinutes,
      totalCorrection: lngOffsetMinutes,
      isDstApplied: tzResolved.isDstApplied,
      baseOffsetHours: tzResolved.baseOffsetHours,
      effectiveOffsetHours: tzResolved.tzOffsetHours
    }
  };
  var correctedTotal = ((hour * 60 + minute - lngOffsetMinutes) % 1440 + 1440) % 1440;
  correctedHour = Math.floor(correctedTotal / 60);
  correctedMinute = correctedTotal % 60;
  resultObj.finalAdjustedTime = String(correctedHour).padStart(2, '0') + ':' + String(correctedMinute).padStart(2, '0');

  correctionMsg = `<li><span class="hero-correction-label">시간 보정 내역</span> 입력시간: ${inputTimeStr} → 보정시간: ${resultObj.finalAdjustedTime}</li>`
                + `<li>출생지: ${opt ? opt.text : bTz}</li>`
                + `<li>시간대: UTC${bTzOff >= 0 ? '+' : ''}${bTzOff} (표준 UTC${tzResolved.baseOffsetHours >= 0 ? '+' : ''}${tzResolved.baseOffsetHours})</li>`
                + `<li>경도 보정: ${lngOffsetMinutes}분 (기준경도 ${stdLong}° vs 실제경도 ${bLong}°)</li>`
                + `<li>서머타임(DST) 적용: ${tzResolved.dstMinutes}분</li>`
                + `<li>총 보정 시간: ${lngOffsetMinutes}분</li>`;

  // 점성술 계산 전용 원본(표준시) 출생 데이터
  window._astroBirth={year:year,month:month,day:day,hour:hour,minute:minute,lat:bLat,lon:bLong,tz:bTzOff};

  window._ziweiBirth={year:year,month:month,day:day,hour:correctedHour,minute:correctedMinute,lat:bLat,lon:bLong,tz:bTzOff};
  window._ziweiInputMeta={
    calType: calType,
    kasiSource: primaryDateCtx && primaryDateCtx.source ? primaryDateCtx.source : 'unknown',
    kasiDiagnostics: (primaryDateCtx && primaryDateCtx.meta && Array.isArray(primaryDateCtx.meta.diagnostics)) ? primaryDateCtx.meta.diagnostics.slice() : [],
    inputDate: { year: year, month: month, day: day, hour: hour, minute: minute },
    correctedTime: { hour: correctedHour, minute: correctedMinute },
    placeLabel: opt ? opt.text : '',
    timezone: bTz,
    longitude: bLong,
    latitude: bLat,
    dstOffsetMinutes: (resultObj && resultObj.offsetDetails) ? resultObj.offsetDetails.dstOffset : 0,
    totalCorrectionMinutes: (resultObj && resultObj.offsetDetails) ? resultObj.offsetDetails.totalCorrection : 0
  };
  window.__cdActiveBirthProfile = {
    name: USER_NAME || (document.getElementById('nameInput') && document.getElementById('nameInput').value) || '나',
    gender: GENDER || window._gender || 'F',
    birth: {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      calType: calType
    },
    location: {
      label: opt ? opt.text : '대한민국 (서울)',
      tz: bTz || 'Asia/Seoul',
      lng: bLong,
      lat: bLat,
      tzOffset: bTzOff,
      baseTzOffset: tzResolved.baseOffsetHours,
      dstMinutes: tzResolved.dstMinutes
    }
  };
  try {
    document.dispatchEvent(new CustomEvent('destinyProfileChanged', {
      detail: {
        profile: window.__cdActiveBirthProfile,
        source: 'manual-input'
      }
    }));
  } catch (eDispatch) {
    console.warn('[saju] destinyProfileChanged dispatch skipped:', eDispatch);
  }
  BIRTH_YEAR=year;
  CURRENT_AGE=new Date().getFullYear()-year+1;

  try{
    var solar=Solar.fromYmdHms(year,month,day,correctedHour,correctedMinute,0);
    var bazi=solar.getLunar().getEightChar();

    var kasiYearPair = primaryDateCtx && primaryDateCtx.ganji ? parseKasiGanjiPair(primaryDateCtx.ganji.year) : null;
    var kasiMonthPair = primaryDateCtx && primaryDateCtx.ganji ? parseKasiGanjiPair(primaryDateCtx.ganji.month) : null;
    var kasiDayPair = primaryDateCtx && primaryDateCtx.ganji ? parseKasiGanjiPair(primaryDateCtx.ganji.day) : null;
    if (kasiYearPair && kasiMonthPair && kasiDayPair) {
      bazi.getYearGan = function() { return kasiYearPair.g; };
      bazi.getYearZhi = function() { return kasiYearPair.j; };
      bazi.getMonthGan = function() { return kasiMonthPair.g; };
      bazi.getMonthZhi = function() { return kasiMonthPair.j; };
      bazi.getDayGan = function() { return kasiDayPair.g; };
      bazi.getDayZhi = function() { return kasiDayPair.j; };
    } else {
      try {
        var _d = new Date(year, month-1, day, correctedHour, correctedMinute);
        var _gj = KasiEngine.getGanji(_d);
        if (_gj && _gj.secha && _gj.weolgeon && _gj.iljin) {
            bazi.getYearGan = function() { return _gj.secha[0]; };
            bazi.getYearZhi = function() { return _gj.secha[1]; };
            bazi.getMonthGan = function() { return _gj.weolgeon[0]; };
            bazi.getMonthZhi = function() { return _gj.weolgeon[1]; };
            bazi.getDayGan = function() { return _gj.iljin[0]; };
            bazi.getDayZhi = function() { return _gj.iljin[1]; };
        }
      } catch(e) {}
    }
    
    var yg=bazi.getYearGan(),yz=bazi.getYearZhi();
    var mg=bazi.getMonthGan(),mz=bazi.getMonthZhi();
    var dg=bazi.getDayGan(),dz=bazi.getDayZhi();
    var hg=bazi.getTimeGan(),hz=bazi.getTimeZhi();
    DAY_GAN=dg;

    var p={
      y:{g:yg,j:yz,gE:(GAN[yg]||{}).e,jE:(JI[yz]||{}).e},
      m:{g:mg,j:mz,gE:(GAN[mg]||{}).e,jE:(JI[mz]||{}).e},
      d:{g:dg,j:dz,gE:(GAN[dg]||{}).e,jE:(JI[dz]||{}).e},
      h:{g:hg,j:hz,gE:(GAN[hg]||{}).e,jE:(JI[hz]||{}).e}
    };

    var natal=calcNatalElement(p);
    var johu=analyzeJohu(p);
    G_PILLARS=p;
    G_NATAL=natal;
    G_JOHU=johu; JOHU_TYPE=johu.type; JOHU_SCORE=johu.score;
    G_POWER=calcPower(p);
    
    var _tj = detectJong(p);
    // 종격/가종격 모두 검증 모달로 사용자 확인
    if (_tj.isJong) {
      _tj = await showJongVerificationModal(_tj, p);
    }
    G_JONG = _tj;

    G_BAZI=bazi;
    resetEvalDaewunMemo();
    _syncDestinyFlowerSajuSnapshot('full-analysis');

    var inputPageEl = document.getElementById('inputPage');
    var resultPageEl = document.getElementById('resultPage');
    var letterBoxEl = document.getElementById('letterBox');
    var emailSubBoxEl = document.getElementById('emailSubBox');
    var btnNewSajuEl = document.getElementById('btnNewSaju');
    if (inputPageEl) inputPageEl.style.display = 'none';
    if (resultPageEl) resultPageEl.style.display = 'block';
    // 오버레이 닫기는 startSajuCalculationFlow의 Promise.all에서 처리
    if (letterBoxEl) letterBoxEl.style.display = 'block';
    if (emailSubBoxEl) emailSubBoxEl.style.display = 'block';
    if (btnNewSajuEl) btnNewSajuEl.style.display = 'block';
    requestAnimationFrame(function () {
      setTimeout(function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    });

    var animal=(JI[yz]||{}).a||'';
    var dayAnimal=(JI[dz]||{}).a||'';
    document.getElementById('heroAnimal').textContent=(ANIMAL_EMOJI[dayAnimal]||ANIMAL_EMOJI[animal]||'🐷');
    document.getElementById('heroName').textContent=USER_NAME;
    
    var timeCorrectionStr = "";
    if(correctionMsg) {
      timeCorrectionStr = `<section class="hero-correction-card" aria-label="진태양시 자동 변환 적용">
                            <h4 class="hero-correction-title"><i class="fa fa-clock-o" aria-hidden="true"></i> 진태양시 자동 변환 적용</h4>
                            <ul class="hero-correction-list">${correctionMsg}</ul>
                           </section>`;
    }

    var lunarInfo = '';
    var lunarDateObj = null;
    try {
      if (primaryDateCtx && primaryDateCtx.lunar && primaryDateCtx.lunar.year && primaryDateCtx.lunar.month && primaryDateCtx.lunar.day) {
        lunarDateObj = {
          year: primaryDateCtx.lunar.year,
          month: primaryDateCtx.lunar.month,
          day: primaryDateCtx.lunar.day,
          isLeap: !!primaryDateCtx.lunar.isLeap
        };
      }
      if (!lunarDateObj) {
        lunarDateObj = KasiEngine.solarToLunar(new Date(year, month-1, day, correctedHour, correctedMinute));
      }
      var leapStr = lunarDateObj.isLeap ? '(윤달)' : '(평달)';
      lunarInfo = `<div class="hero-lunar-row"><span class="hero-lunar-label">입춘기준 년도</span><span class="hero-lunar-value">${bazi.getYearGan()}${bazi.getYearZhi()}년</span></div>`
               + `<div class="hero-lunar-row"><span class="hero-lunar-label">음력</span><span class="hero-lunar-value">${lunarDateObj.year}년 ${lunarDateObj.month}월 ${lunarDateObj.day}일 ${leapStr}</span></div>`;
    } catch(e) {}

    var countryText = document.getElementById('birthCountry').options[document.getElementById('birthCountry').selectedIndex].text;
    document.getElementById('heroSub').innerHTML=
      '<div class="hero-sub-grid">'
      + '<div class="hero-meta-row hero-meta-row--birth">'+year+'년 '+month+'월 '+day+'일 '+hour+'시 '+minute+'분 <span class="hero-meta-place">(' + countryText + ')</span></div>'
      + (lunarInfo ? ('<div class="hero-divider"></div><div class="hero-lunar-wrap">'+lunarInfo+'</div>') : '')
      + '<div class="hero-divider"></div>'
      + '<div class="hero-meta-row hero-meta-row--identity">'+(GENDER==='M'?'남성':'여성')+' · '+animal+'띠 · 일지 '+dz+'('+dayAnimal+') · 만 '+(CURRENT_AGE-1)+'세</div>'
      + '</div>'
      + timeCorrectionStr;

    try { renderManse(p); } catch(e) { console.error('Manse 에러:', e); }
    try { renderIlju(p); } catch(e) { console.error('Ilju 에러:', e); }
    try { renderTenshin(p); } catch(e) { console.error('Tenshin 에러:', e); }
    try { renderJohu(johu); } catch(e) { console.error('Johu 에러:', e); }
    try { renderUkbu(p); } catch(e) { console.error('Ukbu 에러:', e); }
    try { renderAstroInsight(); } catch(e) { console.error('AstroInsight 에러:', e); }
    try { renderSkillTree(p,natal); } catch(e) { console.error('SkillTree 에러:', e); }
    try { renderSummary(p,johu,natal); } catch(e) { console.error('Summary 에러:', e); }
    try { renderEnergyCoord(natal); } catch(e) { console.error('EnergyCoord 에러:', e); }
    try { renderHealthReport(p, natal, johu, G_POWER, G_JONG); } catch(e) { console.error('HealthReport 에러:', e); }
    try { renderTTest(p, natal, johu, G_POWER); } catch(e) { console.error('TTest 에러:', e, e.stack); }
    runDeferredSajuTasks([
      function() { try { renderLottoNumbers(natal, bazi); } catch(e) { console.error('LottoNumbers 에러:', e); } },
      function() { try { renderSukuyo(p, natal, bazi, typeof lunarDateObj !== 'undefined' ? lunarDateObj : null); } catch(e) { console.error('Sukuyo 에러:', e); } },
      function() { try { renderQuantumStrategy(p, natal, bazi); } catch(e) { console.error('QuantumStrategy 에러:', e); } },
      function() { try { renderSpecialCharm(p, natal); } catch(e) { console.error('SpecialCharm 에러:', e); } },
      function() { try { renderDaewun(bazi); } catch(e) { console.error('Daewun 에러:', e, e.stack); } },
      function() {
        try {
          var _dailyMonthlyPromise = renderDailyMonthlyFortune(p);
          if (_dailyMonthlyPromise && typeof _dailyMonthlyPromise.catch === 'function') {
            _dailyMonthlyPromise.catch(function(e){ console.error('DailyMonthlyFortune 에러:', e, e && e.stack); });
          }
        } catch(e) { console.error('DailyMonthlyFortune 에러:', e, e && e.stack); }
      },
      function() { try { renderLetter(p); } catch(e) { console.error('Letter 에러:', e); } },
      function() { try { renderTodayDestinyCard(p); } catch(e) { console.error('TodayDestinyCard 에러:', e); } },
      function() { try { findSimilarCelebs(p); } catch(e) { console.error('SimilarCelebs 에러:', e); } },
      function() { try { renderVillain(p, G_POWER); } catch(e) { console.error('Villain 에러:', e); } },
      function() { try { renderHormoneVibe(p, G_POWER); } catch(e) { console.error('HormoneVibe 에러:', e, e.stack); } },
      function() { try { renderReportDashboard(); } catch(e) { console.error('ReportDashboard 에러:', e); }
      }
    ]);
    var ss=document.getElementById('shareSection');if(ss)ss.style.display='block';
    document.getElementById('dwDetail').innerHTML='';
    document.getElementById('dwDetail').classList.remove('show');

    document.getElementById('currentAgeInfo').innerHTML=
      '<b>현재 나이:</b> 만 '+(CURRENT_AGE-1)+'세 — '+
      (G_JONG&&G_JONG.isJong&&G_JONG.isGaJong?'<b style="color:#7B1FA2">가종격(假從格) 사주</b> <span style="font-size:.75rem;color:#9C27B0">('+G_JONG.name+')</span> — 지배 오행 중심 판단':
       G_JONG&&G_JONG.isJong?'<b style="color:#9C27B0">종격(眞從格) 사주</b> — 지배 오행 중심 판단':
        G_POWER&&G_POWER.isStrong?'<b style="color:#FF8BA7">신강 사주</b> — 억부+조후 통합 판단':
        '<b style="color:#2196F3">신약 사주</b> — 억부+조후 통합 판단');

  }catch(err){
    console.error(err);
    alert('사주 계산 오류: '+err.message);
    // 계산 실패 시에도 결과 페이지 표시 (사용자가 에러 메시지 읽고 다시 시도할 수 있도록)
    try {
      var _rp = document.getElementById('resultPage');
      var _ip = document.getElementById('inputPage');
      if (_rp) _rp.style.display = 'block';
      if (_ip) _ip.style.display = 'none';
    } catch (_) {}
  }
}

/* ─── 사주 아바타 & 이상형 AI 프롬프트 생성 ─── */
function generateAvatarPrompt(p){
  var avatarMap={
    '甲':'Elegant spring deer with soft pastel green and cream colors, delicate antlers, gentle eyes, surrounded by leaves and flowers, cute nature spirit, watercolor style, whimsical, botanical aesthetic',
    '乙':'Graceful climbing cat with pastel pink and sage green tones, flexible pose, dreamy expression, wrapped in climbing vines, mystical energy, soft illustration style, enchanting atmosphere',
    '丙':'Radiant phoenix or fire bird with golden pastel yellow and coral hues, flowing feathers, bright joyful eyes, surrounded by gentle flames and light, warmth and vitality, storybook illustration',
    '丁':'Soft warm rabbit with pastel rose pink and peach tones, glowing eyes, cozy expression, holding a small lamp or candle, intimate and nurturing energy, gentle illustration style',
    '戊':'Sturdy gentle mammoth or earth bear with cream, warm brown, and earthy beige tones, grounded presence, protective aura, surrounded by mountains or earth elements, stable and comforting',
    '己':'Nurturing honey bee or butterfly with pastel golden yellow and blush pink, delicate wings, caring expression, pollinating flowers, connecting energy, soft botanical illustration',
    '庚':'Sleek silver wolf or snow leopard with cool silver-white and soft purple tones, sharp elegant features, noble bearing, pristine mountain landscape, refined and precise',
    '辛':'Delicate white peacock or swan with pale silver, lavender and white tones, intricate beautiful patterns, perfectionist energy, jewel-like details, elegant illustration style',
    '壬':'Flowing water dragon or graceful whale with cool blue and silver tones, fluid curves, wise gentle eyes, surrounded by water elements, serene mysterious energy, flowing watercolor style',
    '癸':'Tiny silver droplet sprite or frost fairy with pale blue and white tones, delicate translucent quality, soft glowing presence, crystalline atmosphere, dreamy ethereal illustration'
  };
  var prompt = avatarMap[p.d.g] || 'cute magical animal character, pastel colors, soft illustration, enchanting, whimsical, kawaii style, high quality, 8k';
  return prompt;
}

function generateIdealPartnerPrompt(p, natal){
  var dg=p.d.g, dj=p.d.j;
  var el=(GAN[dg]&&GAN[dg].e)||'earth';
  var elName={wood:'목(우드톤)',fire:'화(웜톤)',earth:'토(어스톤)',metal:'금(실버톤)',water:'수(쿨톤)'};
  
  var temperTypeMap={
    hot:{mood:'열정적 에너지',feature:'밝은 얼굴빛, 생생한 눈, 따뜻한 미소'},
    warm:{mood:'따뜻하고 편안한',feature:'친근한 온기, 편안한 눈빛, 자연스러운 미소'},
    cool:{mood:'차분하고 신비로운',feature:'세련된 분위기, 깊이 있는 눈, 우아한 자태'},
    cold:{mood:'정적인 매력',feature:'신비로운 분위기, 고요한 기품, 깊이 있는 표정'}
  };
  
  var tempType='warm';
  if(['丙','丁','巳'].indexOf(dg)>=0) tempType='hot';
  else if(['子','壬','癸','亥'].indexOf(dg)>=0) tempType='cold';
  
  var tempDesc=temperTypeMap[tempType]||temperTypeMap.warm;
  
  var partnerGender=GENDER==='F'?'handsome man':'beautiful woman';
  
  var prompt='portrait of '+partnerGender+' with '+tempDesc.mood+' aura, '+
    'wearing '+elName[el]+' color clothing, '+tempDesc.feature+', '+
    'soft natural makeup, elegant sophisticated look, warm ambient lighting, '+
    'professional portrait photography, soft focus background, natural skin texture, '+
    'korean beauty style, high quality, 8k resolution --ar 3:4';
  
  return prompt;
}

/* ─── 심화 매력 분석 & AI 물상 렌더링 (초디테일 버전) ─── */
function renderSpecialCharm(p, natal) {
  /* ── 1. 기초 데이터 ── */
  var branches  = [p.y.j, p.m.j, p.d.j, p.h.j];
  var counts    = (natal&&natal.counts)?natal.counts:{wood:0,fire:0,earth:0,metal:0,water:0};
  var dominant  = (natal&&natal.dominant)?natal.dominant:'earth';
  var dayEl     = ((GAN[p.d.g]||{}).e)||'earth';
  var total     = Math.max(1, counts.wood+counts.fire+counts.earth+counts.metal+counts.water);

  /* ── 2. 신살 스탯 계산 ── */
  var taoSet  = ['子','午','卯','酉'];
  var taoHit  = branches.filter(function(b){return taoSet.indexOf(b)>=0;}).length;
  var taoPct  = Math.min(100, taoHit*22 + (taoSet.indexOf(p.d.j)>=0 ? 25 : 0));

  var yemSet  = ['寅','申','巳','亥'];
  var yemHit  = branches.filter(function(b){return yemSet.indexOf(b)>=0;}).length;
  var yemNY   = (yemSet.indexOf(p.y.j)>=0?1:0)+(yemSet.indexOf(p.m.j)>=0?1:0);
  var yemPct  = Math.min(100, yemHit*20 + yemNY*15);

  var hwaSet  = ['辰','戌','丑','未'];
  var hwaHit  = branches.filter(function(b){return hwaSet.indexOf(b)>=0;}).length;
  var hwaPct  = Math.min(100, hwaHit*22 + (hwaHit>=2?18:0));

  /* ── 3. 매력 클래스 결정 ── */
  var maxStat = Math.max(taoPct, yemPct, hwaPct);
  var cls;
  if(taoPct===maxStat && taoPct>=40){
    if(dominant==='fire') cls={icon:'🔥',name:'태양 아래의 승부사',sub:'방에 들어서는 순간 공기가 바뀝니다. 당신의 존재 자체가 가장 강력한 무기입니다.'};
    else if(dominant==='water') cls={icon:'🌊',name:'물 속의 인어',sub:'다가가기 어렵지만 한 번 빠지면 헤어나올 수 없는 치명적 매력의 소유자입니다.'};
    else cls={icon:'🌹',name:'치명적 유혹자',sub:'원하든 원치 않든 주변을 끌어당기는 자기장이 상시 작동 중입니다.'};
  } else if(yemPct===maxStat && yemPct>=40){
    if(dominant==='metal') cls={icon:'⚔️',name:'경계 없는 개척자',sub:'좁은 무대에 가둘 수 없는 사람. 더 넓은 세계에서 진가를 발휘합니다.'};
    else cls={icon:'🌪️',name:'역동적인 방랑자',sub:'멈추는 순간 매력이 반감됩니다. 에너지 자체가 당신의 가장 큰 무기입니다.'};
  } else if(hwaPct===maxStat && hwaPct>=40){
    if(dominant==='water') cls={icon:'🔮',name:'베일에 싸인 철학자',sub:'쉽게 읽히지 않는 깊이가 상대방을 계속 궁금하게 만드는 트랩 매력입니다.'};
    else cls={icon:'🪷',name:'고독한 예술가',sub:'내면의 풍경이 너무 깊어 통하는 사람이 드물지만, 한 번 연결되면 강렬합니다.'};
  } else if(dominant==='metal'){
    cls={icon:'💎',name:'차가운 도시의 세련미',sub:'함부로 다가가기 힘든 분위기와 날카로운 안목이 당신을 희귀하게 만듭니다.'};
  } else if(dominant==='fire'){
    cls={icon:'🌟',name:'압도적 화려함',sub:'분위기를 바꾸는 타입. 열정과 표현력이 곧 매력입니다.'};
  } else if(dominant==='wood'){
    cls={icon:'🌿',name:'자연스러운 청량미',sub:'꾸미지 않아도 빛나는 순수함으로 사람들 마음에 스며드는 타입입니다.'};
  } else if(dominant==='water'){
    cls={icon:'💧',name:'위험한 신비로움',sub:'깊이를 알 수 없는 눈빛과 조용한 카리스마가 상대방의 경계를 무너뜨립니다.'};
  } else {
    cls={icon:'🗿',name:'중독성 강한 안정감',sub:'어딜 가나 묵직한 신뢰감을 주는 사람. 시간이 지날수록 매력이 진해지는 타입입니다.'};
  }

  /* ── 4. 오행 마그네티즘 ── */
  var magMeta = {
    wood: {icon:'🌿', name:'목(木) — 자연스러운 청량미', pct:Math.round((counts.wood||0)/total*100),
           desc:'순수하고 생동감 넘치는 청춘 에너지. 상대를 편안하게 만드는 배려와 따뜻한 공감력이 핵심 매력입니다.'},
    fire: {icon:'🔥', name:'화(火) — 압도적 화려함', pct:Math.round((counts.fire||0)/total*100),
           desc:'화려하고 열정적으로 주변을 태우는 에너지. 리액션과 전달력이 뛰어나 첫인상에서 강한 호감을 남깁니다.'},
    earth:{icon:'⛰️', name:'토(土) — 중독성 안정감', pct:Math.round((counts.earth||0)/total*100),
           desc:'묵직하고 믿음직해 기댈 곳을 주는 중독성 안정감. 오래 곁에 있고 싶게 만드는 포근한 신뢰 매력입니다.'},
    metal:{icon:'🗡️', name:'금(金) — 차가운 세련미', pct:Math.round((counts.metal||0)/total*100),
           desc:'날카롭고 세련되어 함부로 다가가기 힘든 분위기. 기준이 높아 선택받은 기분을 주는 희귀 매력입니다.'},
    water:{icon:'🌊', name:'수(水) — 위험한 신비로움', pct:Math.round((counts.water||0)/total*100),
           desc:'깊이를 알 수 없는 눈빛과 지적 아우라. 상대를 계속 궁금하게 만드는 트랩형 카리스마입니다.'}
  };

  /* ── 5. 팩폭 ── */
  var bombs = [];
  if(taoPct>=60) bombs.push('도화 기운이 넘쳐 의도치 않은 시그널을 남발하고 있진 않은지 점검하세요. 가볍게 보일 수 있습니다.');
  if(yemPct>=60) bombs.push('역마 에너지가 강해 한 곳에 뿌리내리기 어렵습니다. 상대는 당신이 언제 떠날지 항상 불안해합니다.');
  if(hwaPct>=60) bombs.push('화개가 강하면 현실보다 이상 세계에 빠지기 쉽습니다. 깊이는 매력이지만 소통 단절로 이어질 수 있습니다.');
  if(dominant==='metal') bombs.push('세련된 건 알겠는데, 옆에 있으면 베일 것 같습니다. 능동적인 온기 표현이 없으면 차갑게 읽힙니다.');
  if(dominant==='fire'&&(counts.fire||0)>=3) bombs.push('에너지가 너무 강해 상대방이 압도당하거나 지칩니다. 공간을 주는 것도 매력 천기입니다.');
  if(dominant==='water'&&(counts.water||0)>=3) bombs.push('신비로움이 지나치면 답답함으로 읽힙니다. 먼저 열어 보이는 용기가 관계를 한 단계 깊게 합니다.');
  if(bombs.length===0) bombs.push('치명적 약점은 없지만, 모든 매력을 풀가동하려면 자신의 색깔을 더 선명하게 드러내는 연습이 필요합니다.');

  /* ── 6. 극대화 천기 ── */
  var strategies = [];
  if(taoPct>=40){
    strategies.push('연애: 첫인상보다 꾸준한 관심 표현이 효과적입니다. 도화 매력은 시작은 강하지만 지속이 관건입니다.');
    strategies.push('비즈니스: 얼굴이 곧 브랜드입니다. 영상 콘텐츠·강연·퍼블릭 페이스 포지셔닝이 최적의 무대입니다.');
  }
  if(yemPct>=40){
    strategies.push('연애: 새로운 경험을 함께하는 데이트가 최고의 매력 발산법입니다. 일상 패턴화를 경계하세요.');
    strategies.push('비즈니스: 해외·다분야·네트워킹 업무에서 강점이 폭발합니다. 크로스오버 커리어가 천직입니다.');
  }
  if(hwaPct>=40){
    strategies.push('연애: 깊이 있는 대화와 공통 관심사(예술·철학·영성)로 연결되는 관계가 오래갑니다.');
    strategies.push('비즈니스: 크리에이티브·상담·연구직에서 화개 에너지가 빛납니다. 독창성 자체가 경쟁력입니다.');
  }
  if(strategies.length===0){
    strategies.push('오행 균형이 잡혀 있어 상황에 맞게 매력을 조절하는 카멜레온 천기가 유리합니다.');
    strategies.push('특정 매력을 강화하려면 도화(스타일·외모) · 역마(적극성·모험) · 화개(깊이·예술) 중 하나를 의도적으로 키우세요.');
  }

  /* ── 7. HTML 조립 ── */
  var magRow = '';
  ['wood','fire','earth','metal','water'].forEach(function(e){
    var m = magMeta[e];
    var isActive = (e===dominant || e===dayEl);
    var lvl = m.pct>=33?'🔥 강함':m.pct>=20?'활성':m.pct>=10?'기본':'잠재';
    magRow += '<div class="cs-mag-item'+(isActive?' cs-active':'')+'">'+
      '<div class="cs-mag-head">'+
        '<span class="cs-mag-name">'+m.icon+' '+m.name+'</span>'+
        '<span class="cs-mag-level">'+lvl+' ('+m.pct+'%)</span>'+
      '</div>'+
      '<div class="cs-mag-desc">'+m.desc+'</div>'+
    '</div>';
  });

  var bombRows = bombs.map(function(f){return '<div class="cs-factbomb-item">'+f+'</div>';}).join('');
  var stratRows = strategies.map(function(s){return '<div class="cs-strategy-item">'+s+'</div>';}).join('');

  /* ── AI 프롬프트 ── */
  var musangMap={'甲':'Majestic Ancient Tree','乙':'Delicate Flower Garden','丙':'Bright Warm Sun',
    '丁':'Twinkling Candlelight','戊':'Golden High Mountain','己':'Cozy Garden Soil',
    '庚':'Strong Silver Rock','辛':'Sparkling Jewelry','壬':'Deep Blue Ocean','癸':'Soft Misty Rain'};
  var prompt=(musangMap[p.d.g]||'Poetic Nature Landscape')+', beautiful landscape painting, soft pastel colors, atmospheric lighting, high-detail scenic view, poetic and serene, high quality, 8k --ar 16:9';
  var safePrompt=prompt.replace(/'/g,"\\'");

  var html =
    '<div id="specialCharmCard" style="margin-top:15px">'+
    /* ===== 스탯 카드 ===== */
    '<div class="cscard">'+
      /* 매력 클래스 헤더 */
      '<div class="cs-class-wrap">'+
        '<span class="cs-class-icon">'+cls.icon+'</span>'+
        '<div class="cs-class-label">나의 매력 클래스</div>'+
        '<div class="cs-class-name">'+cls.name+'</div>'+
        '<div class="cs-class-sub">'+cls.sub+'</div>'+
      '</div>'+
      '<div class="cs-divider"></div>'+
      /* 3대 신살 스탯바 */
      '<div class="cs-stat-section">'+
        '<div class="cs-stat-title">⚡ 3대 매력 신살(神殺) 스탯</div>'+
        '<div class="cs-stat-row">'+
          '<div class="cs-stat-head"><span class="cs-stat-name">🌸 도화살(桃花殺)</span><span class="cs-stat-pct">'+taoPct+'%</span></div>'+
          '<div class="cs-stat-keyword">치명적 존재감 · 시선 집중 · 유혹 · 인기 · 연예인 기질</div>'+
          '<div class="cs-bar-bg"><div class="cs-bar-fill cs-bar-taohua" style="width:'+taoPct+'%"></div></div>'+
        '</div>'+
        '<div class="cs-stat-row" style="margin-top:10px">'+
          '<div class="cs-stat-head"><span class="cs-stat-name">🌪️ 역마살(驛馬殺)</span><span class="cs-stat-pct">'+yemPct+'%</span></div>'+
          '<div class="cs-stat-keyword">역동적 에너지 · 활력 · 개척자 · 글로벌 감각 · 모험</div>'+
          '<div class="cs-bar-bg"><div class="cs-bar-fill cs-bar-yemma" style="width:'+yemPct+'%"></div></div>'+
        '</div>'+
        '<div class="cs-stat-row" style="margin-top:10px">'+
          '<div class="cs-stat-head"><span class="cs-stat-name">🔮 화개살(華蓋殺)</span><span class="cs-stat-pct">'+hwaPct+'%</span></div>'+
          '<div class="cs-stat-keyword">예술적 고독 · 신비로움 · 철학 · 직관 · 묘한 끌림</div>'+
          '<div class="cs-bar-bg"><div class="cs-bar-fill cs-bar-hwagae" style="width:'+hwaPct+'%"></div></div>'+
        '</div>'+
      '</div>'+
      '<div class="cs-divider"></div>'+
      /* 오행 마그네티즘 */
      '<div class="cs-mag-title">🌈 오행 매력 마그네티즘(Magnetism)</div>'+
      '<div class="cs-mag-row">'+magRow+'</div>'+
      '<div class="cs-divider"></div>'+
      /* 팩폭 */
      '<div class="cs-factbomb">'+
        '<div class="cs-factbomb-title">💥 팩폭 — 당신이 착각하고 있는 것들</div>'+
        bombRows+
      '</div>'+
      /* 극대화 천기 */
      '<div class="cs-strategy">'+
        '<div class="cs-strategy-title">🚀 매력 극대화 천기 처방전</div>'+
        stratRows+
      '</div>'+
    '</div>';

  var aiPromptHtml = 
    '<div id="aiPromptCard" style="margin-top:15px">'+
    /* AI 프롬프트 박스들 */
    '<div class="prem-box" style="background:#fff;border:1px solid #FFB7B2;">'+
      '<span class="prem-title" style="color:#FF8BA7;">🎨 맞춤형 사주 물상 AI 프롬프트</span>'+
      '<p style="font-size:0.8rem;color:#888;margin-bottom:10px;">이 문구를 복사해 AI(미드저니 등)에게 풍경화 스타일 물상을 요청해보세요.</p>'+
      '<div style="background:#FFF5F8;padding:12px;border-radius:10px;font-size:0.85rem;border:1px dashed #FF8BA7;word-break:break-all;color:#555;">'+prompt+'</div>'+
      '<button class="btn-sub" style="margin-top:10px;padding:10px;font-size:0.8rem;background:#FF8BA7;color:white;border:none;border-radius:8px;" onclick="navigator.clipboard.writeText(\''+safePrompt+'\').then(function(){alert(\'✨ 프롬프트가 복사되었습니다!\');})">📋 프롬프트 복사하기</button>'+
    '</div>'+
    '<div class="prem-box" style="background:linear-gradient(135deg,#FCE4EC,#F3E5F5);margin-top:12px;border:1.5px solid #E91E63;">'+
      '<span class="prem-title" style="color:#C2185B;">🐾 내 사주 아바타 — 귀여운 동물 캐릭터</span>'+
      '<p style="font-size:0.8rem;color:#555;margin-bottom:10px;">타고난 사주 기운을 귀여운 동물로 표현했습니다.</p>'+
      '<div style="background:rgba(255,255,255,.8);padding:12px;border-radius:10px;font-size:0.85rem;border:1px dashed #E879A4;word-break:break-all;color:#555;">'+generateAvatarPrompt(p)+'</div>'+
      '<button class="btn-sub" style="margin-top:10px;padding:10px;font-size:0.8rem;background:#E879A4;color:white;border:none;border-radius:8px;" onclick="navigator.clipboard.writeText(\''+generateAvatarPrompt(p).replace(/'/g,"\\'")+'\').then(function(){alert(\'✨ 아바타 프롬프트가 복사되었습니다!\');})">📋 아바타 프롬프트 복사</button>'+
    '</div>'+
    '<div class="prem-box" style="background:linear-gradient(135deg,#E1F5FE,#F0F4C3);margin-top:12px;border:1.5px solid #0277BD;">'+
      '<span class="prem-title" style="color:#01579B;">💕 내 이상형 얼굴 — 사주 궁합 기반 AI 초상화</span>'+
      '<p style="font-size:0.8rem;color:#555;margin-bottom:10px;">당신의 사주와 잘 맞는 이상형의 특징을 반영한 얼굴 초상화 프롬프트입니다.</p>'+
      '<div style="background:rgba(255,255,255,.8);padding:12px;border-radius:10px;font-size:0.85rem;border:1px dashed #4FC3F7;word-break:break-all;color:#555;">'+generateIdealPartnerPrompt(p,natal)+'</div>'+
      '<button class="btn-sub" style="margin-top:10px;padding:10px;font-size:0.8rem;background:#4FC3F7;color:white;border:none;border-radius:8px;" onclick="navigator.clipboard.writeText(\''+generateIdealPartnerPrompt(p,natal).replace(/'/g,"\\'")+'\').then(function(){alert(\'✨ 이상형 프롬프트가 복사되었습니다!\');})">📋 이상형 프롬프트 복사</button>'+
    '</div>'+
    '</div>';

  var existing = document.getElementById('specialCharmCard');
  if(existing) existing.remove();
  
  var existingAi = document.getElementById('aiPromptCard');
  if(existingAi) existingAi.remove();
  
  document.getElementById('dailyMonthlyCard').insertAdjacentHTML('afterend', html);
  document.getElementById('specialCharmCard').insertAdjacentHTML('afterend', aiPromptHtml);
}

/* ═══════════════════════════════════════
   STEP 7: 렌더 함수
═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   [NEW] 60갑자 일주(Day Pillar) 초정밀 프로파일링 (Auto-Generated Premium 60 Gapja DB)
═══════════════════════════════════════ */
const ILJU_DB = (function() {
  const STEMS = {
      "甲": ["갑목", "거목, 우뚝 솟은 큰 나무", "독립심과 리더십, 위로 뻗어나가는 기상", "당당하고 곧은 체형과 강직한 눈빛"],
      "乙": ["을목", "넝쿨, 아름다운 꽃과 화초", "뛰어난 생명력과 유연성, 부드러운 카리스마", "부드러운 곡선미를 지닌 매력적인 인상"],
      "丙": ["병화", "태양, 세상을 비추는 강렬한 빛", "솔직함과 뜨거운 열정, 명랑하고 뒤끝 없는 성품", "환하고 이목구비가 뚜렷하며 화려한 분위기"],
      "丁": ["정화", "달빛, 세상을 데우는 따뜻한 모닥불", "따뜻한 배려심과 내면의 은근한 집념, 섬세함", "온화하고 은은하면서도 은근히 신비로운 눈빛"],
      "戊": ["무토", "큰 산, 만물을 품는 광활한 대지", "압도적인 포용력과 신중함, 묵직한 책임감", "듬직하고 신뢰감을 주며 흔들림 없이 안정감 있는 체격"],
      "己": ["기토", "전답, 생명을 길러내는 비옥한 평야", "어머니 같은 자애로움과 실용적 실속, 치밀함", "부드럽고 편안한 인상과 둥글둥글한 느낌"],
      "庚": ["경금", "큰 바위, 아직 제련되지 않은 거친 철", "의리와 결단력, 강직하고 타협을 모르는 소신", "단단하고 카리스마 넘치며 선이 굵은 외모"],
      "辛": ["신금", "보석, 정밀하게 세공되어 빛나는 귀금속", "예리한 직관과 완벽주의, 까다롭고 정밀한 미감", "군더더기 없이 세련되고 차가운 도시적 이미지, 깔끔한 체형"],
      "壬": ["임수", "바다, 도도하게 흐르는 깊고 거대한 강물", "지혜와 포용력, 속을 알 수 없는 거대한 스케일", "깊고 유연하며 여유로운 분위기와 호탕한 인상"],
      "癸": ["계수", "이슬비, 만물을 고루 적시는 맑은 옹달샘", "환경에 순응하며 스며드는 소통력과 빛나는 총명함", "맑고 여린 듯하면서도 다정다감한 느낌, 촉촉한 눈망울"]
  };

  const BRANCHES = {
      "子": ["자수", "한겨울의 맑은 물", "깊은 통찰력, 비밀스러움, 뛰어난 환경 적응력", "차분하면서도 속내의 깊이를 다 알 수 없는 총명한 눈빛"],
      "丑": ["축토", "생명을 잉태한 얼어붙은 흙", "초인적인 인내와 끈기, 묵묵한 내면의 저장력", "쉽게 흔들리지 않는 우직함과 내면의 단단한 골격"],
      "寅": ["인목", "만물이 소생하는 역동적인 봄나무", "새로운 시작, 권력 지향적인 진취성과 돌파력", "당당한 걸음걸이와 상대를 압도하는 카리스마 넘치는 아우라"],
      "卯": ["묘목", "생기발랄하게 피어나는 완연한 봄꽃", "발랄함과 끝없는 성장 욕구, 뛰어난 미적 감각과 세심함", "유연하고 부드러운 곡선미와 매력적이고 자연스러운 미소"],
      "辰": ["진토", "변화무쌍한 늦봄의 물 머금은 땅", "원대한 이상주의, 만물을 아우르는 두둑한 배짱", "어느 자리에서나 존재감을 확실히 드러내는 다부지고 여유로운 자태"],
      "巳": ["사화", "만물을 철저히 달구는 초여름의 불꽃", "폭발적인 활동성과 열정, 목표를 향한 예리한 완벽주의", "날카롭고 예리한 시선과 지적이면서도 세련된 인상"],
      "午": ["오화", "강렬하게 타오르는 한여름의 맹렬한 불", "화려함과 폭발적인 에너지, 명랑한 외향성과 성급함", "어딜 가나 시선을 끄는 화려하고 밝은 분위기, 이목구비가 뚜렷한 호감형"],
      "未": ["미토", "결실을 앞둔 늦여름의 메마른 땅", "희생정신과 달관, 고요함 속에 꽁꽁 감춘 뜨거운 고집", "온화해 보이지만 결코 꺾이지 않는 단단하고 강인한 아우라"],
      "申": ["신금", "가을의 시작을 선언하는 견고한 바위", "다재다능한 수완과 칼같은 결단력, 자유로운 역마성", "민첩해 보이는 체형과 야무지고 날카롭게 지적인 인상"],
      "酉": ["유금", "차갑게 빛나는 완연한 가을의 보석", "치밀한 정밀함과 완벽주의, 예민한 직관력과 철저한 공사 구분", "군더더기 없이 깔끔하고 극도로 섬세한 도시적 외모"],
      "戌": ["술토", "만물을 수렴하는 늦가을의 쓸쓸한 땅", "의리와 책임감, 강한 보호 본능과 깊은 철학적 사유", "듬직하면서도 속을 지나치게 내비치지 않는 진중하고 부드러운 표정"],
      "亥": ["해수", "생명 탄생을 품은 초겨울의 넓은 호수", "방대한 수용력과 포용의 리더십, 철학적이고 깊은 탐구심", "여유롭고 넉넉한 분위기와 상대를 한없이 편안하게 끌어안는 기운"]
  };

  const gapja_list = [
      "甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉",
      "甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未",
      "甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳",
      "甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯",
      "甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑",
      "甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"
  ];

  const E12_MAP = {
      "甲亥":"장생", "甲子":"목욕", "甲丑":"관대", "甲寅":"건록", "甲卯":"제왕", "甲辰":"쇠", "甲巳":"병", "甲午":"사", "甲未":"묘", "甲申":"절", "甲酉":"태", "甲戌":"양",
      "乙午":"장생", "乙巳":"목욕", "乙辰":"관대", "乙卯":"건록", "乙寅":"제왕", "乙丑":"쇠", "乙子":"병", "乙亥":"사", "乙戌":"묘", "乙酉":"절", "乙申":"태", "乙未":"양",
      "丙寅":"장생", "丙卯":"목욕", "丙辰":"관대", "丙巳":"건록", "丙午":"제왕", "丙未":"쇠", "丙申":"병", "丙酉":"사", "丙戌":"묘", "丙亥":"절", "丙子":"태", "丙丑":"양",
      "戊寅":"장생", "戊卯":"목욕", "戊辰":"관대", "戊巳":"건록", "戊午":"제왕", "戊未":"쇠", "戊申":"병", "戊酉":"사", "戊戌":"묘", "戊亥":"절", "戊子":"태", "戊丑":"양",
      "丁酉":"장생", "丁申":"목욕", "丁未":"관대", "丁午":"건록", "丁巳":"제왕", "丁辰":"쇠", "丁卯":"병", "丁寅":"사", "丁丑":"묘", "丁子":"절", "丁亥":"태", "丁戌":"양",
      "己酉":"장생", "己申":"목욕", "己未":"관대", "己午":"건록", "己巳":"제왕", "己辰":"쇠", "己卯":"병", "己寅":"사", "己丑":"묘", "己子":"절", "己亥":"태", "己戌":"양",
      "庚巳":"장생", "庚午":"목욕", "庚未":"관대", "庚申":"건록", "庚酉":"제왕", "庚戌":"쇠", "庚亥":"병", "庚子":"사", "庚丑":"묘", "庚寅":"절", "庚卯":"태", "庚辰":"양",
      "辛子":"장생", "辛亥":"목욕", "辛戌":"관대", "辛酉":"건록", "辛申":"제왕", "辛未":"쇠", "辛午":"병", "辛巳":"사", "辛辰":"묘", "辛卯":"절", "辛寅":"태", "辛丑":"양",
      "壬申":"장생", "壬酉":"목욕", "壬戌":"관대", "壬亥":"건록", "壬子":"제왕", "壬丑":"쇠", "壬寅":"병", "壬卯":"사", "壬辰":"묘", "壬巳":"절", "壬午":"태", "壬未":"양",
      "癸卯":"장생", "癸寅":"목욕", "癸丑":"관대", "癸子":"건록", "癸亥":"제왕", "癸戌":"쇠", "癸酉":"병", "癸申":"사", "癸未":"묘", "癸午":"절", "癸巳":"태", "癸辰":"양"
  };

  const SG = {"甲":{e:0,y:1},"乙":{e:0,y:-1},"丙":{e:1,y:1},"丁":{e:1,y:-1},"戊":{e:2,y:1},"己":{e:2,y:-1},"庚":{e:3,y:1},"辛":{e:3,y:-1},"壬":{e:4,y:1},"癸":{e:4,y:-1}};
  const SJ = {"子":{e:4,y:-1},"丑":{e:2,y:-1},"寅":{e:0,y:1},"卯":{e:0,y:-1},"辰":{e:2,y:1},"巳":{e:1,y:1},"午":{e:1,y:-1},"未":{e:2,y:-1},"申":{e:3,y:1},"酉":{e:3,y:-1},"戌":{e:2,y:1},"亥":{e:4,y:1}};
  
  const TEN_NAMES = [
    ["비견","겁재"],
    ["식신","상관"],
    ["편재","정재"],
    ["편관","정관"],
    ["편인","정인"]
  ];

  function calcTenGod(ds, tc) {
      let me = SG[ds], tg = SJ[tc];
      if(!me || !tg) return "십성";
      let diff = (tg.e - me.e + 5) % 5;
      let isYinYangDiff = (me.y !== tg.y) ? 1 : 0;
      return TEN_NAMES[diff][isYinYangDiff];
  }

  const STEM_KR = {"甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무","己":"기","庚":"경","辛":"신","壬":"임","癸":"계"};
  const BRANCH_KR = {"子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사","午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해"};

  function generate(g, j) {
      let key = g + j;
      let sInfo = STEMS[g];
      let bInfo = BRANCHES[j];
      let e12Key = g + j; 
      let e12 = E12_MAP[e12Key] || "알수없음";
      let tenGod = calcTenGod(g, j);

      let s1 = sInfo[2].split(',')[0];
      let b1 = bInfo[2].split(',')[0];

      let krName = (STEM_KR[g] || g) + (BRANCH_KR[j] || j);
      let name = `${krName}(${key})일주`;
      
      let symbol = `${sInfo[1]}과(와) ${bInfo[1]}의 절묘한 만남.\n* 이미지: 천간의 조화로 인해 은연 중에 ${sInfo[3]}이 분명히 나타나며, 지지의 성향으로 ${bInfo[3]}의 감각적인 분위기가 짙게 녹아들어 특유의 고급스러운 매력을 자아냅니다.`;
      
      let summary = `천간의 "${s1}" 특성과 지지의 "${b1}" 성향이 매우 아름답게 조화를 이룹니다. 일지 '${tenGod}'의 핵심 에너지와 십이운성 '${e12}'의 역동성을 동시에 지닌, 무척이나 입체적이고 흡인력 넘치는 성향의 소유자입니다.`;
      
      let personality = `겉으로는 ${sInfo[1]}처럼 ${sInfo[2]}의 긍정적 측면을 유감없이 발휘하나, 그 깊은 내면에는 ${bInfo[2]}의 기질이 강렬하게 꿈틀대고 있습니다. 십이운성 '${e12}'지에 놓임에 따라 개개인의 무의식적인 잠재력이 크게 증폭되며, 일지 '${tenGod}'의 핵심 작용 덕분에 자신이 목표한 바에 대한 대단한 집념과 재능을 발휘합니다. 때때로 본인만의 확고한 주관이나 완벽주의가 주변과 부딪힐 수도 있지만, 이는 곧 세상 누구도 쉽게 모방할 수 없는 일주 본인만의 독보적인 카리스마와 뚜렷한 개성으로 멋지게 승화됩니다.`;
      
      let specialTraits = [];
      if (["庚辰","庚戌","戊戌","壬辰"].includes(key)) {
          specialTraits.push("특히 명리학적 관점에서 강력한 괴강살(魁罡殺)의 파동을 품고 있어, 어떠한 인생의 위기나 막막한 난관 앞에서도 절대 굴복하지 않고 과감하게 돌파해 나가는 폭발적인 리더십과 내면의 야성이 깊게 자리 잡고 있습니다.");
      }
      if (["甲辰","乙未","丙戌","丁丑","戊辰","壬戌","癸丑"].includes(key)) {
          specialTraits.push("또한 백호대살(白虎大殺) 특유의 압도적인 아우라를 지녀, 평소엔 점잖고 양보심이 깊어 보일지라도 생사가 걸린 결정적 승부처나 치열한 경쟁 상황에서는 엄청난 호승심과 끝 모를 저력을 뽐냅니다.");
      }
      if (["甲寅","乙卯","丙午","丁巳","戊辰","戊戌","己丑","己未","庚申","辛酉","壬子","癸亥"].includes(key)) {
          specialTraits.push("더불어 천간과 지지의 오행이 동일한 간여지동(干與支同)의 단단한 구조를 취하고 있어, 겉과 속이 완전하게 일치하며 어떠한 외압에도 결코 꺾이지 않는 강철 같은 자아와 주체성을 굳건히 자랑합니다.");
      }
      if (["甲午","丙寅","丁未","戊辰","庚戌","辛酉","壬子"].includes(key)) {
          specialTraits.push("자연스레 피어나는 홍염살(紅艶殺)의 기운 덕분에, 가만히 미소 짓고만 있어도 타인을 부드럽게 끌어당기는 묘한 매력과 애교가 넘치며 대인관계와 사회생활에서 확고한 인기의 우위를 다집니다.");
      }
      if(specialTraits.length > 0) personality += " " + specialTraits.join(" ");

      let prof = "본인만의 전문 기술과 거침없는 독립적인 돌파력";
      if (["비견","겁재"].includes(tenGod)) prof = "누구에게도 굽히지 않는 막강한 독립심과 자수성가의 돌파력, 조직을 앞에서 이끄는 리더십";
      if (["식신","상관"].includes(tenGod)) prof = "마르지 않는 기발하고 창의적인 발상, 뛰어난 예술적 식견 및 표현력, 대중을 움직이는 유려한 언변";
      if (["편재","정재"].includes(tenGod)) prof = "남다른 공간지각력과 예리한 판단력, 탁월한 재무적 융통성과 시대의 흐름을 읽는 타고난 사업 감각";
      if (["편관","정관"].includes(tenGod)) prof = "타의 추종을 불허하는 강인한 책임감과 완벽한 성궁 진법 장악력, 투철한 원칙주의와 사람을 다루는 통솔력";
      if (["편인","정인"].includes(tenGod)) prof = "하나를 깊이 있게 파고드는 압도적인 학구열과 날카로운 지적 통찰력, 교육 및 고도의 천기 기획력";

      let professional = `개인의 고유한 기질을 가장 자유롭고 온전하게 뿜어낼 수 있는 환경일수록 당신의 진가가 찬란하게 빛납니다. ${prof}을 강하게 요하는 직무(전문직, 사업가, 교육, 기획 창작 분야 등)에서 큰 성공과 성취를 달성하며, 답답하고 구속적인 환경보다는 본인의 특별한 비전과 능력을 확실하게 인정받고 독립적인 마스터로서 조직을 이끌어갈 수 있는 진취적인 무대를 갈망합니다.`;

      let relationship = `연애와 결혼, 평생의 반려자를 택하는 일에 있어서는 일지 '${tenGod}'의 영향을 십분 받아 자기만의 확고한 심리적 가치관을 고수하거나 처음에는 다소 까다로운 면모를 보일 수 있습니다. 하지만 한 번 내 사람이라고 정하여 진실하고 깊은 인연을 맺고 나면, ${s1}처럼 조건조차 완전히 초월한 따뜻한 애정과 무한한 헌신을 아낌없이 나눕니다. 상대를 본인의 통제하에 두려 하기보다, 있는 그대로 각자의 세계를 인정해 주고 깊이 존중해 주는 성숙한 상대를 만났을 때 비로소 가장 안정되고 영속적인 행복을 만끽할 수 있습니다.`;

      let advice = `십이운성 '${e12}'(이)가 뿜어내는 섬세하면서도 역동적인 에너지의 파동을 다스리기 위해, 매일의 바쁘고 숨 가쁜 일상 속에서도 반드시 한 템포 깊숙이 쉬어가는 명상이나 혼자만의 휴식 시간이 절실하게 필요합니다. 나와 생각이 다른 타인을 넉넉히 수용하는 따뜻한 관용의 그릇을 넓히고, 내면의 넘쳐흐르는 강한 에너지를 건강하게 쏟아낼 수 있는 나만의 '생산적인 취미(운동, 집중 독서, 예술 창작 등)'를 갖추게 된다면 당신은 더 넓은 사회적 명예성취뿐만 아니라 인생 전체를 관통하는 진정한 내면의 완전한 평안을 함께 누리게 될 것입니다.`;

      let details = `[일지 구조 정밀 분석] 지지 ${j}(${bInfo[0]}) - 내재된 핵심 십성: ${tenGod} / 생명력의 순환(십이운성): ${e12}\n일지 지장간 깊은 곳에 은밀히 숨겨진 오행들의 치밀하고 정밀한 상호 작용이 당신 삶의 무의식적인 끌림과 본능적 동기로 매우 강력하게, 그리고 지속적으로 작동하고 있습니다.`;

      return {
          name, symbol, summary, personality, professional, relationship, advice, details
      };
  }

  const db = {};
  gapja_list.forEach(g => {
      db[g] = generate(g[0], g[1]);
  });
  db._stems = STEMS;
  db._branches = BRANCHES;
  return db;
})();

function toggleIljuDetail(){
  const detail = document.getElementById('iljuDetailWrap');
  const btn = document.getElementById('iljuToggleBtn');
  const card = document.getElementById('iljuCard');
  if(!detail) return;
  if(detail.style.maxHeight === '0px' || detail.style.maxHeight === ''){
    detail.style.maxHeight = (detail.scrollHeight + 12) + 'px';
    btn.innerHTML = '상세 분석 접기 ▲';
    if(card) card.classList.add('open-detail');
  } else {
    detail.style.maxHeight = '0px';
    btn.innerHTML = '상세 분석 보기 ▼';
    if(card) card.classList.remove('open-detail');
  }
}

function iljuSanitizeText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function iljuSentenceList(text) {
  var clean = iljuSanitizeText(text);
  if (!clean) return [];
  clean = clean
    .replace(/\.\s+/g, '.|')
    .replace(/!\s+/g, '!|')
    .replace(/\?\s+/g, '?|')
    .replace(/다\.\s+/g, '다.|');
  return clean.split('|').map(function(s) {
    return s.trim();
  }).filter(Boolean);
}

function iljuBullets(text, maxCount) {
  var lines = iljuSentenceList(text);
  if (!lines.length) return [];
  return lines.slice(0, maxCount || 3);
}

function iljuEscapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iljuSetList(id, items, fallback) {
  var el = document.getElementById(id);
  if (!el) return;
  var safeItems = (items && items.length) ? items : [fallback || '분석 정보가 준비되는 중입니다.'];
  el.innerHTML = safeItems.map(function(item) {
    return '<li>' + iljuEscapeHtml(item) + '</li>';
  }).join('');
}

function iljuSetBar(barId, valId, value) {
  var bar = document.getElementById(barId);
  var label = document.getElementById(valId);
  var v = Math.max(0, Math.min(100, Math.round(value || 0)));
  if (bar) bar.style.width = v + '%';
  if (label) label.innerText = v + '%';
}

function buildIljuElementScores(pillars) {
  var stemElMap = { '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth','己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water' };
  var branchElMap = { '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth','巳':'fire','午':'fire','未':'earth','申':'metal','酉':'metal','戌':'earth','亥':'water' };
  var elements = ['wood', 'fire', 'earth', 'metal', 'water'];
  var counts = { wood:0, fire:0, earth:0, metal:0, water:0 };
  var scorePairs = [];
  var totalCount = 0;

  var stems = [
    pillars && pillars.y ? pillars.y.g : null,
    pillars && pillars.m ? pillars.m.g : null,
    pillars && pillars.d ? pillars.d.g : null,
    pillars && pillars.h ? pillars.h.g : null
  ];
  var branches = [
    pillars && pillars.y ? pillars.y.j : null,
    pillars && pillars.m ? pillars.m.j : null,
    pillars && pillars.d ? pillars.d.j : null,
    pillars && pillars.h ? pillars.h.j : null
  ];

  stems.forEach(function(stem) {
    var el = stemElMap[stem];
    if (!el) return;
    counts[el] += 1;
    totalCount += 1;
  });
  branches.forEach(function(branch) {
    var el = branchElMap[branch];
    if (!el) return;
    counts[el] += 1;
    totalCount += 1;
  });

  if (!totalCount) {
    return { wood:0, fire:0, earth:0, metal:0, water:0 };
  }

  elements.forEach(function(el) {
    var raw = (counts[el] / totalCount) * 100;
    scorePairs.push({ key: el, base: Math.floor(raw), frac: raw - Math.floor(raw) });
  });

  var used = 0;
  scorePairs.forEach(function(item) { used += item.base; });
  var remainder = 100 - used;

  // Floor rounding 이후 남은 퍼센트를 큰 소수점 순서대로 배분해 합계 100%를 맞춘다.
  if (remainder > 0) {
    scorePairs.sort(function(a, b) { return b.frac - a.frac; });
    for (var i = 0; i < remainder; i++) {
      scorePairs[i % scorePairs.length].base += 1;
    }
  }

  var result = { wood:0, fire:0, earth:0, metal:0, water:0 };
  scorePairs.forEach(function(item) {
    result[item.key] = item.base;
  });
  return result;
}

function buildIljuKeywords(key, data, stem, branch, elementLabel) {
  var animalMap = { '子':'쥐', '丑':'소', '寅':'호랑이', '卯':'토끼', '辰':'용', '巳':'뱀', '午':'말', '未':'양', '申':'원숭이', '酉':'닭', '戌':'개', '亥':'돼지' };
  var stemTraits = {
    '甲':['리더십','직진성'], '乙':['유연성','섬세함'], '丙':['열정','표현력'], '丁':['공감력','집중력'],
    '戊':['안정감','책임감'], '己':['실용성','배려력'], '庚':['결단력','추진력'], '辛':['정교함','완성도'],
    '壬':['포용력','통찰력'], '癸':['적응력','직관력']
  };

  var tags = [];
  tags.push((key || '') + ' 일주');
  if (elementLabel) tags.push(elementLabel + ' 중심');
  if (animalMap[branch]) tags.push(animalMap[branch] + ' 기운');
  (stemTraits[stem] || []).forEach(function(t) { tags.push(t); });

  if (data && data.details) {
    var tg = data.details.match(/핵심 십성:\s*([^\/\n]+)/);
    var e12 = data.details.match(/십이운성\):\s*([^\n]+)/);
    if (tg && tg[1]) tags.push(tg[1].trim());
    if (e12 && e12[1]) tags.push('십이운성 ' + e12[1].trim());
  }

  var uniq = [];
  tags.forEach(function(t) {
    if (!t) return;
    if (uniq.indexOf(t) === -1) uniq.push(t);
  });
  return uniq.slice(0, 7);
}

function renderIlju(p){
  const iljuCard = document.getElementById('iljuCard');
  if(!iljuCard) return;
  if(!p || !p.d || !p.d.g || !p.d.j) {
    iljuCard.style.display = 'none';
    return;
  }
  
  const key = p.d.g + p.d.j;
  
  const data = ILJU_DB[key];
  const rawName = data && data.name ? data.name : (key + '일주');
  const nameMatch = rawName.match(/^([^\(]+)\(([^\)]+)\)일주$/);
  const mainName = nameMatch ? (nameMatch[1] + '일주') : rawName;
  const hanjaName = nameMatch ? ('(' + nameMatch[2] + ')') : ('(' + key + ')');
  const animalMap = { '子': ['🐭','쥐'], '丑': ['🐮','소'], '寅': ['🐯','호랑이'], '卯': ['🐰','토끼'], '辰': ['🐉','용'], '巳': ['🐍','뱀'], '午': ['🐴','말'], '未': ['🐑','양'], '申': ['🐵','원숭이'], '酉': ['🐔','닭'], '戌': ['🐶','개'], '亥': ['🐷','돼지'] };
  const stemElementMap = { '甲':['wood','목(木)'], '乙':['wood','목(木)'], '丙':['fire','화(火)'], '丁':['fire','화(火)'], '戊':['earth','토(土)'], '己':['earth','토(土)'], '庚':['metal','금(金)'], '辛':['metal','금(金)'], '壬':['water','수(水)'], '癸':['water','수(水)'] };
  const elementTheme = {
    wood: { accent:'#2e7d32', soft:'#e8f5e9' },
    fire: { accent:'#c62828', soft:'#ffebee' },
    earth: { accent:'#8d6e63', soft:'#fff3e0' },
    metal: { accent:'#78909c', soft:'#eceff1' },
    water: { accent:'#1565c0', soft:'#e3f2fd' }
  };
  
  iljuCard.style.display = 'block';
  
  const detail = document.getElementById('iljuDetailWrap');
  const btn = document.getElementById('iljuToggleBtn');
  if(detail) detail.style.maxHeight = '0px';
  if(btn) btn.innerHTML = '상세 분석 보기 ▼';

  var elementInfo = stemElementMap[p.d.g] || ['wood', '목(木)'];
  var theme = elementTheme[elementInfo[0]] || elementTheme.wood;
  iljuCard.style.setProperty('--ilju-accent', theme.accent);
  iljuCard.style.setProperty('--ilju-soft', theme.soft);

  var animal = animalMap[p.d.j] || ['✨','상징'];
  var nameMainEl = document.getElementById('iljuNameMain');
  var nameHanjaEl = document.getElementById('iljuNameHanja');
  var badgeEl = document.getElementById('iljuElementBadge');
  var animalEl = document.getElementById('iljuHeroAnimal');
  var animalLabelEl = document.getElementById('iljuHeroAnimalLabel');
  if (nameMainEl) nameMainEl.innerText = mainName;
  if (nameHanjaEl) nameHanjaEl.innerText = hanjaName;
  if (badgeEl) badgeEl.innerText = elementInfo[1] + ' 에너지 중심';
  if (animalEl) animalEl.innerText = animal[0];
  if (animalLabelEl) animalLabelEl.innerText = animal[1] + ' 상징';

  var summaryLines = data ? iljuBullets(data.summary, 3) : ['일주는 나의 본질을 보여주는 핵심 축입니다.', '일간과 일지의 조합으로 성향이 형성됩니다.', '요약/상세/조언 순서로 읽어보세요.'];
  var detailSource = data ? ((data.personality || '') + ' ' + (data.professional || '') + ' ' + (data.relationship || '')) : '상세 분석 데이터가 업데이트되는 중입니다.';
  var detailLines = iljuBullets(detailSource, 4);
  var adviceLines = data ? iljuBullets(data.advice, 3) : ['하루 루틴을 짧게 기록하며 감정과 판단 흐름을 점검해 보세요.', '강점은 더 선명하게, 취약점은 부드럽게 보완하는 천기가 좋습니다.'];

  iljuSetList('iljuSummaryList', summaryLines, '핵심 요약 데이터가 준비 중입니다.');
  iljuSetList('iljuDetailList', detailLines, '상세 분석 데이터가 준비 중입니다.');
  iljuSetList('iljuAdviceList', adviceLines, '맞춤 조언 데이터가 준비 중입니다.');

  var keywords = buildIljuKeywords(key, data, p.d.g, p.d.j, elementInfo[1]);
  var keywordWrap = document.getElementById('iljuKeywords');
  if (keywordWrap) {
    keywordWrap.innerHTML = keywords.map(function(k) {
      return '<span class="ilju-v2-chip">#' + iljuEscapeHtml(k) + '</span>';
    }).join('');
  }

  var scores = buildIljuElementScores(p);
  iljuSetBar('iljuWoodBar', 'iljuWoodVal', scores.wood);
  iljuSetBar('iljuFireBar', 'iljuFireVal', scores.fire);
  iljuSetBar('iljuEarthBar', 'iljuEarthVal', scores.earth);
  iljuSetBar('iljuMetalBar', 'iljuMetalVal', scores.metal);
  iljuSetBar('iljuWaterBar', 'iljuWaterVal', scores.water);

  var detailsInfo = document.getElementById('iljuDetailsInfo');
  if (detailsInfo) {
    detailsInfo.innerText = data && data.details
      ? 'ⓘ 전문 용어 참고: ' + iljuSanitizeText(data.details)
      : 'ⓘ 일간(' + p.d.g + ') · 일지(' + p.d.j + ') 기반 기본 분석';
  }
}

/* ═══════════════════════════════════════
   [NEW] 글자 클릭 시 60갑자 및 천간지지 상세 모달 출력
═══════════════════════════════════════ */
function showCharDetail(clickedChar, charType, g, j, posLabel, isDayStem) {
  const isStem = charType === 'stem';
  const key = g + j;
  const gapjaData = ILJU_DB[key];
  const stemsData = ILJU_DB._stems;
  const branchesData = ILJU_DB._branches;
  
  if(!gapjaData) return;
  
  let modalBox = document.getElementById('modalBody');
  if(!modalBox) return;
  
  let charName = "", charSymbol = "", charDesc = "", charLook = "";
  if(isStem && stemsData && stemsData[clickedChar]){
      charName = stemsData[clickedChar][0];
      charSymbol = stemsData[clickedChar][1];
      charDesc = stemsData[clickedChar][2];
      charLook = stemsData[clickedChar][3];
  } else if(!isStem && branchesData && branchesData[clickedChar]) {
      charName = branchesData[clickedChar][0];
      charSymbol = branchesData[clickedChar][1];
      charDesc = branchesData[clickedChar][2];
      charLook = branchesData[clickedChar][3];
  }

  let extra = "";
  if (isDayStem) {
    extra = `<div style="background:#FFF0F5; color:#D81B60; padding:12px; border-radius:8px; margin-bottom:15px; font-weight:bold; font-size:1.0rem; border:1px solid #FFCDD2; line-height:1.4; word-break:keep-all;">
      ✨ [일간(Day Stem) 특별 분석] ✨<br/>
      일간 <b>${clickedChar}</b>(은)는 사주팔자에서 <b>'나 자신(본질)'</b>을 상징하는 가장 핵심적인 글자입니다. 이 기운이 전체 운명을 주도적으로 이끌어갑니다!</div>`;
  }

  let charHtml = ``;
  if(charName) {
      charHtml = `<div class="prem-box" style="margin-bottom:15px; border-color:#FFB6C1;">
        <span class="prem-title" style="background:#FF4081; color:#fff; border:none; padding:4px 10px; border-radius:12px;">✨ '${clickedChar}'(${charName})의 고유 특성</span>
        <div class="prem-text" style="margin-top:10px;">
            <b>• 물상(상징):</b> ${charSymbol}<br/>
            <b>• 기질/성향:</b> ${charDesc}<br/>
            <b>• 이미지:</b> ${charLook}
        </div>
      </div>`;
  }

let html = ``;

    if (posLabel === '일주') {
        html = `<div style="text-align:center;margin-bottom:15px;">
          <div style="font-size:0.9rem; color:#888; margin-bottom:5px;">[${posLabel}] 소속 60갑자 조합</div>
          <h2 style="color:var(--pink);font-size:1.8rem;margin-bottom:5px; margin-top:5px;">${key}(${key})</h2>
          <div style="color:#666;font-size:0.95rem; word-break:keep-all;">${gapjaData.symbol}</div>
        </div>
        ${extra}
        ${charHtml}
        
        <div class="prem-box"><span class="prem-title">🔑 요약</span><div class="prem-text">${gapjaData.summary}</div></div>
        <div class="prem-box"><span class="prem-title">🦁 성향 및 기질</span><div class="prem-text">${gapjaData.personality}</div></div>
        <div class="prem-box"><span class="prem-title">💼 직업 및 적성</span><div class="prem-text">${gapjaData.professional}</div></div>
        <div class="prem-box"><span class="prem-title">💘 인간관계</span><div class="prem-text">${gapjaData.relationship}</div></div>
        <div class="prem-box" style="background:#FFFDE7;border-color:#FFF59D">
            <span class="prem-title" style="border-color:#FBC02D;color:#E65100">🍀 조언</span>
            <div class="prem-text" style="font-weight:700;color:#E65100">"${gapjaData.advice}"</div>
        </div>
        <div style="font-size:0.8rem;color:#999;margin-top:10px;text-align:center;">${(gapjaData.details||"").replace(/\n/g, '<br/>')}</div>`;
    } else {
        html = `<div style="text-align:center;margin-bottom:15px;">
          <div style="font-size:0.9rem; color:#888; margin-bottom:5px;">[${posLabel}] 의 ${isStem ? '천간' : '지지'}</div>
          <h2 style="color:var(--pink);font-size:1.8rem;margin-bottom:5px; margin-top:5px;">${clickedChar}</h2>
        </div>
        ${charHtml}`;
    }

  modalBox.innerHTML = html;
  
  const tsModal = document.getElementById('tsModal');
  if(tsModal) tsModal.classList.add('show');
}

function renderManse(p){
  var cols=[{l:'시주',g:p.h.g,j:p.h.j},{l:'일주',g:p.d.g,j:p.d.j},{l:'월주',g:p.m.g,j:p.m.j},{l:'년주',g:p.y.g,j:p.y.j}];
  var h='';
  cols.forEach(function(c){
    var gd=GAN[c.g]||{e:'metal',y:'+',n:'?'},jd=JI[c.j]||{e:'water',y:'+',a:'?'};
    var gGod=c.l==='일주'?'일간':getTenGod(p.d.g,c.g);
    var jGod=getTenGod(p.d.g,c.j);
    
    var isDayStem = (c.l==='일주');
    h+='<div class="pillar">'+
      '<div class="pillar-head">'+c.l+'</div>'+
      '<div class="ten-god-badge'+(isDayStem?' day':'')+'">'+gGod+'</div>'+
      '<div class="char-box bg-'+gd.e+'" onclick="showCharDetail(\''+c.g+'\', \'stem\', \''+c.g+'\', \''+c.j+'\', \''+c.l+'\', '+isDayStem+')">'+c.g+'</div>'+
      '<div class="yang-yin">'+(gd.y==='+'?'양':'음')+' '+gd.n+'</div>'+
      '<div class="ten-god-badge">'+jGod+'</div>'+
      '<div class="char-box bg-'+jd.e+'" onclick="showCharDetail(\''+c.j+'\', \'branch\', \''+c.g+'\', \''+c.j+'\', \''+c.l+'\', false)">'+c.j+'</div>'+
      '<div class="yang-yin">'+(jd.y==='+'?'양':'음')+' '+jd.a+'</div>'+
      '</div>';
  });
  document.getElementById('manseGrid').innerHTML=h;
  var manseSlot = document.querySelector('#sajuCard .saju-manse-slot');
  var manseSk = document.getElementById('sajuManseSkeleton');
  if (manseSlot) manseSlot.classList.add('saju-manse-slot--ready');
  if (manseSk) manseSk.setAttribute('hidden', '');
}

function renderTenshin(p){
  var tsSet=new Set();
  var dg=p.d.g;
  [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
    var t=getTenGod(dg,c);if(t&&t!=='?')tsSet.add(t);
  });
  var h='';
  tsSet.forEach(function(t){
    var info=TS_DB[t];if(!info)return;
    h+='<div class="ts-card" onclick="showTsDetail(\''+t+'\')">'+
      '<div class="ts-emoji">'+info.emoji+'</div>'+
      '<div class="ts-name">'+t+'</div>'+
      '<div class="ts-desc">'+info.desc+'</div>'+
      '<div class="ts-hint">자세히 보기 →</div>'+
      '</div>';
  });
  document.getElementById('tsGrid').innerHTML=h;
}

function renderJohu(johu) {
    let tempRaw = Math.max(-6, Math.min(6, johu.score));
    let tempPct = ((tempRaw + 6) / 12) * 100;
    
    let diffRaw = 0;
    if (johu.moistCnt !== undefined && johu.dryCnt !== undefined) {
        diffRaw = johu.moistCnt - johu.dryCnt; 
    }
    let humidRaw = Math.max(-4, Math.min(4, diffRaw)); 
    let humidPct = ((humidRaw + 4) / 8) * 100;

    let isCold = tempRaw < 0;
    let isDry = humidRaw < 0;
    let isWet = humidRaw >= 0;

    let envTitle = "";
    let envDesc = "";
    let envEmoji = "";

    if (isCold && isDry) {
        envEmoji = "";
        envTitle = "정갈하고 고요한 겨울 산장";
        envDesc = "냉철한 이성과 맺고 끊음이 확실한 미니멀리스트. 불필요한 감정이나 인간관계를 철저히 배제하고, 나만의 독립적이고 평온한 세계에서 최고의 효율을 발휘합니다.<br><br><b> 비즈니스/실무:</b> 데이터 분석, 기획, 혼자 깊게 파고드는 연구 직무에 정렬.<br><b> 연애:</b> 선을 넘지 않는 깔끔한 매너와 신뢰감이 생명.";
    } else if (isCold && isWet) {
        envEmoji = "";
        envTitle = "은은한 물안개가 피어오르는 새벽 호수";
        envDesc = "차분하면서도 포용력이 깊은 내면의 소유자. 겉으로는 조용해 보이지만 수많은 생각과 감정이 유기적으로 연결되어 있습니다. 은밀한 정보나 마음을 나누는 관계에서 깊은 능력을 발휘합니다.<br><br><b> 비즈니스/실무:</b> 상담, 심리, 예술, 사람의 이면을 통찰하는 기획 직무.<br><b> 연애:</b> 천천히 스며드는 이심전심의 사랑.";
    } else if (!isCold && isDry) {
        envEmoji = "";
        envTitle = "태양이 작열하는 뜨거운 대자연의 사막";
        envDesc = "강렬한 목표 의식과 담백한 성격의 소유자. 한 번 목표를 정하면 앞만 보고 직진하며, 뒤끝이 없습니다. 강한 열정과 빠른 결단력이 필요한 곳에서 탁월한 성과를 냅니다.<br><br><b> 비즈니스/실무:</b> 스타트업 창업, 세일즈, 단기 프로젝트 리더, 감사/평가 직무.<br><b> 연애:</b> 화끈하게 타오르고 깔끔하게 인정하는 쿨한 타이프.";
    } else {
        envEmoji = "";
        envTitle = "생명력이 넘치는 다이내믹한 열대 우림";
        envDesc = "사람들과의 소통과 성장을 갈망하는 '풀 가동 모드'. 호기심이 많고 친화력이 뛰어나며, 복잡한 인적 네트워크 속에서 무한한 에너지를 교류하며 뻗어 나갑니다.<br><br><b> 비즈니스/실무:</b> HR, 교육, 마케팅, 변호사, 작가, 다수의 사람과 협업하는 커뮤니케이터.<br><b> 연애:</b> 감정 표현이 풍부하고 함께 경험하며 커가는 연애.";
    }

    const contentHTML = `
    <div style="font-family: 'Pretendard', sans-serif; font-size: 0.95rem; color: #333;">
        
        <!-- 한난조습 설명 아코디언 영역 -->
        <div style="margin-bottom: 20px;">
          <button type="button" class="johu-info-btn" onclick="const content = document.getElementById('johuExplanation'); const icon = document.getElementById('johuAccordionIcon'); if(content.style.display === 'none'){ content.style.display = 'block'; content.style.opacity = 1; content.style.transform = 'translateY(0)'; icon.style.transform = 'rotate(180deg)'; } else { content.style.display = 'none'; content.style.opacity = 0; content.style.transform = 'translateY(-10px)'; icon.style.transform = 'rotate(0deg)'; }">
            <span class="johu-info-btn__label">한난조습이란 무엇인가요?</span>
            <span id="johuAccordionIcon" class="johu-info-btn__icon">▼</span>
          </button>
            
            <div id="johuExplanation" style="display: none; opacity: 0; transform: translateY(-10px); transition: opacity 0.3s ease, transform 0.3s ease; background: #F8FDFF; border: 1px solid #CFD8DC; border-radius: 12px; padding: 20px; margin-top: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <p style="margin: 0 0 16px 0; line-height: 1.6; color: #455A64; font-size: 0.9rem;">
                    <b>한난조습(기후)</b>은 사주의 <b>온도(차고 뜨거움)</b>와 <b>습도(건조하고 촉촉함)</b>를 의미합니다.<br>
                    자연의 계절과 날씨처럼, 우리 내면에도 기후가 존재합니다. 자신의 기후를 알면 내가 어떤 환경에서 가장 빛나고 편안한지 알 수 있습니다.
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: rgba(227, 242, 253, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #1976D2;">
                        <div style="font-weight: 700; color: #1565C0; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;"><span style="font-size: 1.1rem;"></span> 한 (차가움)</div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">겨울의 응축된 기운. 차분하고 신중하며, 내면을 다지는 이성적 모드.</div>
                    </div>
                    <div style="background: rgba(255, 235, 238, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #D32F2F;">
                        <div style="font-weight: 700; color: #C62828; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">뜨거움 (난) <span style="font-size: 1.1rem;"></span></div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">여름의 발산하는 기운. 열정적이고 외향적이며, 밖으로 뻗어나가는 풀가동 모드.</div>
                    </div>
                    <div style="background: rgba(255, 243, 224, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #F57C00;">
                        <div style="font-weight: 700; color: #E65100; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;"><span style="font-size: 1.1rem;"></span> 조 (건조함)</div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">가을의 단단한 기운. 맺고 끊음이 확실하며, 독립적이고 군더더기 없는 미니멀리스트.</div>
                    </div>
                    <div style="background: rgba(232, 245, 233, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #388E3C;">
                        <div style="font-weight: 700; color: #2E7D32; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">촉촉함 (습) <span style="font-size: 1.1rem;"></span></div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">봄의 얽히는 기운. 친화력과 공감 능력이 뛰어나며, 주변과 함께 성장하는 커뮤니케이터.</div>
                    </div>
                </div>
            </div>
        </div>

        <div style="background: linear-gradient(120deg, #F0F4FF, #F9F1FD); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.04); cursor: pointer; transition: transform 0.2s;" onclick="this.style.transform='scale(1.02)'; setTimeout(()=>this.style.transform='scale(1)', 200)">
            <div style="font-size: 3rem; margin-bottom: 8px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.1));">${envEmoji}</div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #8A63A5; margin-bottom: 6px; letter-spacing: 0.05em;">조후, 인생 환경 진단</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #2C3E50; margin-bottom: 12px;">${envTitle}</div>
            <div style="font-size: 0.9rem; line-height: 1.6; color: #505F6E; text-align: left; background: rgba(255,255,255,0.6); padding: 12px 16px; border-radius: 12px;">${envDesc}</div>
            <div style="display:flex; justify-content: center; gap: 8px; margin-top: 15px;">
                <span class="johu-badge ${johu.badgeCls}">${johu.badgeTxt}</span>
                <span class="johu-badge" style="background: ${isWet ? '#E3F2FD' : '#FFF3E0'}; color: ${isWet ? '#1565C0' : '#E65100'}">${isWet ? ' 촉촉한 편' : ' 건조한 편'}</span>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px; background: #FAFAFA; padding: 20px; border-radius: 16px; border: 1px solid #EEE;">
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 800; font-size: 0.9rem;">
                    <span style="color: #1976D2; display: flex; align-items: center; gap: 4px;" title=" 에너지 절약 모드. 내면 지향적, 신중함."><span style="font-size: 1.1rem;"></span> 차가움 (寒)</span>
                    <span style="color: #E53935; display: flex; align-items: center; gap: 4px;" title=" 풀 가동 모드. 외향적, 열정적.">뜨거움 (暖) <span style="font-size: 1.1rem;"></span></span>
                </div>
                <div style="position: relative; height: 16px; background: linear-gradient(to right, #64B5F6 0%, #E0E0E0 50%, #EF5350 100%); border-radius: 10px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="position: absolute; left: calc(${tempPct}% - 4px); top: 0; bottom: 0; width: 8px; background: #FFF; border-radius: 4px; box-shadow: 0 0 4px rgba(0,0,0,0.5); border: 2px solid #333; z-index: 2; transition: left 1s ease-out;"></div>
                </div>
                <div style="text-align: center; font-size: 0.8rem; margin-top: 8px; color: #777;">
                    현재 온도: <strong style="color: #333; font-size: 0.95rem;">${johu.score > 0 ? '+' : ''}${johu.score.toFixed(1)}</strong>
                </div>
            </div>
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 800; font-size: 0.9rem;">
                    <span style="color: #F57F17; display: flex; align-items: center; gap: 4px;" title=" 깔끔한 미니멀리스트. 독립적, 맺고 끊음."><span style="font-size: 1.1rem;"></span> 건조함 (燥)</span>
                    <span style="color: #388E3C; display: flex; align-items: center; gap: 4px;" title=" 함께 성장하는 정글. 친화력, 연결성.">촉촉함 (濕) <span style="font-size: 1.1rem;"></span></span>
                </div>
                <div style="position: relative; height: 16px; background: linear-gradient(to right, #FFB74D 0%, #E0E0E0 50%, #81C784 100%); border-radius: 10px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="position: absolute; left: calc(${humidPct}% - 4px); top: 0; bottom: 0; width: 8px; background: #FFF; border-radius: 4px; box-shadow: 0 0 4px rgba(0,0,0,0.5); border: 2px solid #333; z-index: 2; transition: left 1s ease-out;"></div>
                </div>
                <div style="text-align: center; font-size: 0.8rem; margin-top: 8px; color: #777;">
                    현재 속성: 건조 ${johu.dryCnt || 0} / 습 ${johu.moistCnt || 0} <span style="font-size: 0.8rem; color:#888;">(편차: ${diffRaw > 0 ? '+' : ''}${diffRaw})</span>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px;">
                <div style="text-align:center; background:rgba(255,235,238,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(239,154,154,.4);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#C62828;">화(火)</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.fc}</div>
                </div>
                <div style="text-align:center; background:rgba(227,242,253,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(144,202,249,.4);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#1565C0;">수(水)</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.wc}</div>
                </div>
                <div style="text-align:center; background:rgba(232,245,233,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(165,214,167,.4);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#2E7D32;">목(木)</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.wdc}</div>
                </div>
                <div style="text-align:center; background:rgba(245,245,245,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(207,216,220,.6);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#546E7A;">금(金)</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.mc}</div>
                </div>
            </div>
        </div>
        <div style="background: rgba(255,255,255,0.8); border-left: 3px solid #8A63A5; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 16px; font-size: 0.85rem; line-height: 1.7; color: #444;">
            <b>🌿 조후 밸런스 처방</b>
            ${(function(){
              var t = johu.type;
              var m = johu.moistType;
              var rows = [];

              // ── 온도 처방 (6종 명확 구분) ──
              if(t === 'hot'){
                rows.push('<div style="margin-top:10px; background:#FFF3E0; border-radius:8px; padding:10px 12px; border-left:3px solid #EF6C00;"><b style="color:#BF360C;">🔥 뜨거운 사주 처방</b><br>火 기운이 과잉입니다. <b>水·金</b> 기운을 적극 보충해야 합니다.<br>· 추천 색상: 파란색·검은색·흰색<br>· 추천 방향: 북쪽·서쪽<br>· 추천 활동: 수영, 물가 산책, 냉탕·족욕, 명상<br>· 주의: 과격한 운동·뜨거운 환경·붉은 컬러 과용 자제</div>');
              } else if(t === 'warm'){
                rows.push('<div style="margin-top:10px; background:#FFF8E1; border-radius:8px; padding:10px 12px; border-left:3px solid #F9A825;"><b style="color:#F57F17;">🌞 따뜻한 사주 처방</b><br>열기가 다소 강합니다. <b>水</b> 기운으로 균형을 잡으면 좋습니다.<br>· 추천 색상: 파란색·하늘색·민트<br>· 추천 방향: 북쪽<br>· 추천 활동: 물 자주 마시기, 계곡·바다 나들이, 쿨다운 스트레칭<br>· 주의: 과음·과식·야식 자제</div>');
              } else if(t === 'neutral'){
                rows.push('<div style="margin-top:10px; background:#E8F5E9; border-radius:8px; padding:10px 12px; border-left:3px solid #43A047;"><b style="color:#2E7D32;">🌤️ 시원한(균형) 사주 처방</b><br>온도 균형이 양호합니다. 계절 변화와 습도에 맞춰 세밀하게 조절하세요.<br>· 오행을 고루 활용하는 멀티플레이어 천기 유효<br>· 봄·가을: 木·金 기운 활용, 여름: 水 보충, 겨울: 火·木 보충<br>· 다양한 환경 변화에 유연하게 적응하는 것이 개운의 핵심</div>');
              } else if(t === 'cool'){
                rows.push('<div style="margin-top:10px; background:#E3F2FD; border-radius:8px; padding:10px 12px; border-left:3px solid #1976D2;"><b style="color:#0D47A1;">🍃 서늘한 사주 처방</b><br>온기가 다소 부족합니다. <b>火·木</b> 기운으로 보충하면 좋습니다.<br>· 추천 색상: 주황색·녹색·붉은 계열<br>· 추천 방향: 남쪽·동쪽<br>· 추천 활동: 햇빛 쬐기, 온탕·반신욕, 스트레칭·요가<br>· 주의: 찬 음식·냉방 과다 노출 자제</div>');
              } else if(t === 'cold'){
                rows.push('<div style="margin-top:10px; background:#E8EAF6; border-radius:8px; padding:10px 12px; border-left:3px solid #3949AB;"><b style="color:#1A237E;">❄️ 차가운 사주 처방</b><br>水·金 기운이 과잉입니다. <b>火·木</b> 기운이 절실히 필요합니다.<br>· 추천 색상: 빨간색·주황색·연두색<br>· 추천 방향: 남쪽·동쪽<br>· 추천 활동: 따뜻한 음식·온탕, 유산소 운동으로 체온 올리기, 햇빛 충분히 쬐기<br>· 주의: 냉수욕·과한 냉방·어두운 색상 과다 사용 자제</div>');
              }

              // ── 습조 처방 (건조함 별도 강조) ──
              if(m === 'dry'){
                rows.push('<div style="margin-top:8px; background:#FFF3E0; border-radius:8px; padding:10px 12px; border-left:3px solid #F57C00;"><b style="color:#E65100;">🏜️ 건조한 사주 추가 처방</b><br>습기가 부족합니다. <b>水·木</b> 기운과 실제 수분 보충이 필요합니다.<br>· 물 충분히 마시기(하루 1.5L 이상), 가습기 사용<br>· 목욕·족욕·수영·자연(숲·물가) 자주 접하기<br>· 촉촉한 생활 환경(식물 키우기, 수족관 등) 조성</div>');
              } else if(m === 'wet'){
                rows.push('<div style="margin-top:8px; background:#E8F5E9; border-radius:8px; padding:10px 12px; border-left:3px solid #388E3C;"><b style="color:#2E7D32;">💧 촉촉한 사주 보완 처방</b><br>습기가 많습니다. <b>金·火</b> 기운으로 건조함을 추가해 균형을 맞추세요.<br>· 환기 자주 하기, 건조한 환경 조성<br>· 흰색·금색 소품 활용, 서쪽 방향 에너지 활용<br>· 규칙적인 생활로 끈적한 감정·관계의 경계선 명확히 하기</div>');
              } else {
                rows.push('<div style="margin-top:8px; background:#F3E5F5; border-radius:8px; padding:10px 12px; border-left:3px solid #8E24AA;"><b style="color:#6A1B9A;">⚖️ 습조(濕燥) 균형 유지</b><br>습도 균형이 양호합니다. 현재 생활 패턴을 유지하면서 온도 처방에 집중하세요.</div>');
              }

              return rows.join('');
            })()}
        </div>
    </div>
    `;

    document.getElementById('johuMeter').innerHTML = '';
    document.getElementById('johuContent').innerHTML = contentHTML;
}

function renderUkbu(p){
  var pw=G_POWER,jg=G_JONG,dg=p.d.g;
  var dayEl=(GAN[dg]&&GAN[dg].e)||'earth';
  var html='';

  if(jg&&jg.isJong){
    html+='<div class="jong-box">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">'+
      '<span class="power-badge pb-jong">🌀 '+jg.name+'</span>'+
      '<span style="font-size:.85rem;font-weight:700;color:#6A1B9A">'+EL_E[jg.dominant]+' '+EL_K[jg.dominant]+' '+jg.pct+'% 지배</span>'+
      '</div>'+
      '<div style="font-size:.84rem;color:#4A148C;line-height:1.78">'+
      '<b>종격 사주</b>는 일반 억부법이 적용되지 않습니다.<br>'+
      EL_K[jg.dominant]+' 기운이 <b>더 강해지는 대운</b>이 길(吉), <b>약해지는 대운</b>이 흉(凶)입니다.<br>'+
      '<span style="color:#9C27B0">→ 당신의 강점인 '+EL_K[jg.dominant]+' 에너지를 극한까지 활용하는 것이 성공의 열쇠입니다.</span>'+
      '</div>'+
      '</div>';
  }

  if(pw){
    var boxCls=jg&&jg.isJong?'':(pw.isStrong?'ukbu-strong':'ukbu-weak');
    html+='<div class="ukbu-box '+boxCls+'">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">'+
      '<span class="power-badge '+(pw.isStrong?'pb-strong':'pb-weak')+'">'+(pw.isStrong?'🔥 신강(身强)':'💧 신약(身弱)')+' '+pw.score+'점</span>'+
      '<span style="font-size:.82rem;color:#555">'+(pw.isStrong?'에너지가 넘치는 주체적 성격':'섬세하고 공감 능력이 탁월한 성격')+'</span>'+
      '</div>'+
      '<div style="font-size:.84rem;color:#555;line-height:1.78">'+
      '<b>'+((GAN[dg]&&GAN[dg].n)||dg)+' 일간</b>으로 '+(pw.isStrong
        ?'타고난 에너지가 왕성합니다. 설기·극(剋) 운에서 사회적 유연함과 인간관계가 꽃을 피웁니다.'
        :'섬세한 감수성이 특별한 매력입니다. 생(生)·비(比) 운에서 자존감이 높아지고 귀인이 나타납니다.')+
      '</div>'+
      '<div class="yn-row">'+
      '🌟 <b>용신:</b> '+
      (jg&&jg.isJong
        ?[jg.dominant,jg.parEl].filter(Boolean).map(function(e){return EL_E[e]+EL_K[e];}).join(' ')
        :pw.yongshin.map(function(e){return EL_E[e]+EL_K[e];}).join(' &nbsp;'))+
      ' &nbsp;&nbsp; 🚧 <b>기신:</b> '+
      (jg&&jg.isJong?'약화 기운 주의'
        :pw.kijishin.map(function(e){return EL_E[e]+EL_K[e];}).join(' &nbsp;'))+
      '</div>'+
      '</div>';
  }

  document.getElementById('ukbuSection').innerHTML=html;
}

/* ─── 60갑자 일주 고유능력 DB (INNATE ABILITY) ─── */
var ILJU_INNATE_DB = {
  // ═══ 甲 (갑목·거목) 일주 ═══
  "甲子":{i:"🌑",n:"심연의 뿌리",sub:"甲子 · 어둠 속의 거목",d:"한겨울 밤, 얼어붙은 땅 아래서도 묵묵히 뿌리를 내리는 거목. 남들이 포기할 때 홀로 기회를 포착하는 극강의 생존 직감이 발동한다. 위기 상황에서 오히려 냉정해지며 역전의 한 수를 찾아낸다."},
  "甲寅":{i:"🦁",n:"숲의 군왕",sub:"甲寅 · 간여지동의 패왕",d:"천간과 지지 모두 목(木)! 가만히 서 있기만 해도 숲 전체가 고개를 숙이는 압도적 카리스마. 태어난 순간부터 리더의 DNA가 새겨져 있으며, 어떤 조직에 들어가도 결국 꼭대기에 오르게 되는 왕의 기운을 타고났다."},
  "甲辰":{i:"🐉",n:"승천하는 용",sub:"甲辰 · 거목이 용을 만나다",d:"나무가 비 머금은 땅에서 폭발적으로 성장하듯, 원대한 꿈을 현실로 끌어당기는 이상실현력이 극대화된다. 스케일이 남다르며 작은 것에 연연하지 않는 대인배 기질이 발동한다."},
  "甲午":{i:"🔥",n:"타오르는 거목",sub:"甲午 · 홍염의 불나무",d:"나무에 불이 붙으면? 주변 모든 것을 환하게 밝히는 거대한 횃불이 된다! 뜨거운 열정으로 주변인까지 감화시키는 전염성 에너지를 뿜으며, 홍염살 특유의 묘한 색기까지 겸비한다."},
  "甲申":{i:"🪓",n:"도끼를 맞는 나무",sub:"甲申 · 시련 내성 MAX",d:"금(金)이 목(木)을 치는 편관 구조! 역경과 시련이 끊이지 않지만, 맞으면 맞을수록 나이테가 단단해지는 불사신 체질. 남들보다 10배 힘든 인생을 살지만 결국 최후의 승자가 된다."},
  "甲戌":{i:"🐺",n:"고독한 파수꾼",sub:"甲戌 · 황야의 수호자",d:"늦가을 쓸쓸한 들판에 홀로 서 있는 거목처럼 의리와 철학의 최후의 보루. 주변이 무너져도 절대 흔들리지 않는 정신력의 소유자이며, 지킬 것은 목숨 걸고 지키는 수호 본능이 발동한다."},

  // ═══ 乙 (을목·넝쿨/꽃) 일주 ═══
  "乙丑":{i:"🌱",n:"인고의 새싹",sub:"乙丑 · 동토를 뚫는 생명력",d:"꽁꽁 얼어붙은 흙 속에서도 어떻게든 싹을 틔우는 경이로운 생명력! 환경이 아무리 척박해도 끈질기게 살아남으며, 고생 끝에 낙이 오는 대기만성형 운명의 주인공이다."},
  "乙卯":{i:"🌸",n:"만개의 매혹",sub:"乙卯 · 간여지동의 꽃밭",d:"천간·지지 모두 꽃! 존재 자체로 주변을 아름답게 물들이는 마성의 매력 보유자. 사람을 끌어당기는 힘이 비현실적으로 강하며, 미적 감각과 패션 센스가 DNA에 새겨져 있다."},
  "乙巳":{i:"🔱",n:"불꽃 매화",sub:"乙巳 · 부드러운 독침",d:"꽃 같은 외모 뒤에 숨겨진 날카로운 승부근성! 겉으로는 웃으면서 속으로는 치밀하게 계산하는 천기가 기질이 있으며, 결정적 순간에 아무도 예상 못 한 카드를 꺼내든다."},
  "乙未":{i:"🏡",n:"낙원의 정원사",sub:"乙未 · 메마른 땅의 녹화술",d:"아무것도 자라지 않는 메마른 땅에서도 풍요로운 정원을 만들어내는 녹화 능력! 사람이든 조직이든 관계든, 손대는 것마다 싱그럽게 성장시키는 마법의 손을 가졌다."},
  "乙酉":{i:"💎",n:"보석을 감은 넝쿨",sub:"乙酉 · 극한의 탐미주의",d:"가을 보석을 감아 올리는 넝쿨처럼, 아름다움에 대한 집착이 예술의 경지에 이른다. 미적 안목과 완벽주의가 합쳐져 '못생긴 것은 존재해선 안 된다'는 철학이 발동한다."},
  "乙亥":{i:"🌿",n:"의존의 덩쿨",sub:"乙亥 · 기생하여 정복하다",d:"호수 위를 뒤덮는 넝쿨처럼 상대방의 자원과 기운을 자연스럽게 자기 것으로 흡수하는 능력! 약해 보이지만 결국 숙주보다 더 커져서 전체를 장악하는 조용한 지배자이다."},

  // ═══ 丙 (병화·태양) 일주 ═══
  "丙寅":{i:"🌅",n:"동틀녘의 신호탄",sub:"丙寅 · 새벽을 여는 태양",d:"봄기운 위에 태양이 떠오르는 형상! 무엇이든 시작하면 주변까지 덩달아 활기가 차오르는 시동 에너지가 폭발한다. '일단 시작해!'가 좌우명이며, 행동력으로 세상을 바꾸는 개척자 본능이 깨어난다."},
  "丙辰":{i:"☀️",n:"용을 탄 태양",sub:"丙辰 · 우주급 비전",d:"태양이 용의 등에 올라타면? 상상의 스케일 자체가 우주적이 된다! 남들이 '현실적으로…'라 말할 때 혼자 다른 차원의 그림을 그리며, 놀랍게도 그것이 현실이 되어버리는 비전의 소유자."},
  "丙午":{i:"💥",n:"핵폭발 카리스마",sub:"丙午 · 간여지동의 태양신",d:"태양 위에 태양! 가는 곳마다 주인공 보정이 자동 발동하며 존재감이 999를 찍는다. 홍염살까지 겹쳐 이성을 자석처럼 끌어당기는 극강 매력까지 보유. 단, 너무 뜨거워서 본인도 가끔 타버린다."},
  "丙申":{i:"⚒️",n:"용광로",sub:"丙申 · 쇠도 녹이는 불꽃",d:"태양이 금속을 녹여 원하는 형태로 주조하는 능력! 완고한 상대도, 불가능해 보이는 프로젝트도 뜨거운 열정 하나로 녹여서 내 뜻대로 빚어버리는 압도적 추진력이 발동한다."},
  "丙戌":{i:"🌇",n:"석양의 전사",sub:"丙戌 · 장렬한 마무리",d:"지는 해가 하늘 전체를 물들이듯, 끝맺음을 아름답고 강렬하게 장식하는 마무리 달인. 프로젝트든 관계든 시작보다 끝이 더 화려하며, 뒤돌아서는 모습마저 드라마틱하다."},
  "丙子":{i:"🌊",n:"수면 위의 태양",sub:"丙子 · 감성과 이성의 공존",d:"뜨거운 태양과 차가운 겨울 물의 동거! 극단적인 감성과 냉철한 이성이 한 몸에 공존하는 양면의 천재. 예술적 감수성과 논리적 분석력을 동시에 가동시키는 멀티코어 프로세서 두뇌."},

  // ═══ 丁 (정화·촛불/달빛) 일주 ═══
  "丁丑":{i:"🕯️",n:"얼어붙은 심장의 온기",sub:"丁丑 · 냉철함 속 뜨거운 불씨",d:"겉은 차갑고 무덤덤해 보이지만, 내면 깊은 곳에서 꺼지지 않는 뜨거운 불씨가 타오른다. 감정을 드러내지 않는 포커페이스 뒤에 숨은 열정과 집념이 결정적 순간에 폭발한다."},
  "丁卯":{i:"🦋",n:"촛불 위의 나비",sub:"丁卯 · 은은한 매혹술",d:"나비가 촛불에 이끌리듯 사람을 은은하게 끌어당기는 묘한 매혹의 기운이 발산된다. 자극적인 매력이 아닌 잔잔한 끌림으로 상대의 마음을 녹이며, 예술적 감성이 천재급이다."},
  "丁巳":{i:"🔥",n:"영원의 불꽃",sub:"丁巳 · 절대 꺼지지 않는 집념",d:"천간·지지 모두 불! 한번 점화되면 절대 꺼지지 않는 집념의 화신. 목표를 정하면 지옥이 열려도 멈추지 않으며, 그 뜨거운 열정은 주변까지 불타오르게 만든다."},
  "丁未":{i:"🏮",n:"온기의 등불",sub:"丁未 · 치유의 빛",d:"늦여름 밤 길을 밝히는 따뜻한 등불처럼 주변 사람들의 마음을 따뜻하게 감싸는 힐링 오라가 상시 발동한다. 곁에 있으면 이유 없이 편안해지는 치유 능력자."},
  "丁酉":{i:"🦅",n:"돈의 흐름을 보는 매의 눈",sub:"丁酉 · 재물 투시력",d:"촛불이 보석을 비추면 숨겨진 균열까지 보이듯, 돈과 재물의 흐름을 꿰뚫어보는 비범한 투시력이 발동한다! 어디에 투자해야 하는지, 언제 빠져야 하는지 본능적으로 감지하는 재테크 천재."},
  "丁亥":{i:"🌌",n:"안개 속의 길잡이",sub:"丁亥 · 어둠을 밝히는 안내자",d:"초겨울 짙은 안개 속에서 홀로 빛나는 촛불! 모두가 길을 잃고 헤맬 때 유일하게 방향을 제시하는 지혜의 안내자. 카오스 상황에서 발동하는 위기수호 능력이 탁월하다."},

  // ═══ 戊 (무토·큰 산) 일주 ═══
  "戊寅":{i:"🏔️",n:"산림의 군주",sub:"戊寅 · 만물을 거느리는 제왕",d:"큰 산에 울창한 숲이 뒤덮인 형상! 자원을 모으고 사람을 거느리며 영토를 확장하는 타고난 경영 감각이 DNA에 새겨져 있다. 가만히 있어도 사람과 기회가 알아서 모여든다."},
  "戊辰":{i:"🌋",n:"대륙의 주인",sub:"戊辰 · 만물을 품는 포용의 땅",d:"간여지동의 토(土)! 대지 위에 대지, 끝이 보이지 않는 광활한 포용력으로 만물을 품는다. 작은 것에 흔들리지 않는 묵직한 중심 장악력이 상시 발동하며, 주변의 갈등까지 흡수해버린다."},
  "戊午":{i:"🌋",n:"활화산",sub:"戊午 · 폭발 대기 상태",d:"평소엔 조용하고 듬직한 산이지만… 한번 터지면 용암이 세상을 뒤덮는다! 인내의 한계를 넘으면 발동하는 초절정 파괴력. 화가 나면 감당 불가, 하지만 그 에너지가 곧 성공의 원동력."},
  "戊申":{i:"🏰",n:"철벽 요새",sub:"戊申 · 절대 무너지지 않는 방어력",d:"큰 산 위에 금속 갑옷까지 입은 난공불락의 요새! 멘탈이 절대 흔들리지 않으며, 어떤 비난·악재·위기가 와도 표정 하나 변하지 않는 극강의 철벽 멘탈 보유자."},
  "戊戌":{i:"🛡️",n:"대지의 결계",sub:"戊戌 · 수호 본능 발동",d:"간여지동의 토(土)! 내 영역 안에 들어온 것은 반드시 지킨다는 압도적 수호 본능. 가족·조직·국가 단위로 보호막을 펼치며, 결계 안의 것들은 어떤 외부 공격도 튕겨낸다."},
  "戊子":{i:"🔮",n:"지하수맥 탐지기",sub:"戊子 · 보이지 않는 것을 감지",d:"큰 산 아래 흐르는 지하수처럼 눈에 보이지 않는 기회와 위험을 본능적으로 감지하는 제6감이 발동한다. '뭔가 이상한데…'라는 직감이 항상 적중하는 초자연적 센서 탑재."},

  // ═══ 己 (기토·전답/비옥한 땅) 일주 ═══
  "己丑":{i:"❄️",n:"동토의 씨앗",sub:"己丑 · 최강의 인내력",d:"가장 추운 겨울 땅속에 파묻힌 씨앗! 아무도 알아주지 않는 긴 겨울을 견뎌내고 마침내 봄에 가장 아름다운 꽃을 피운다. 대기만성의 끝판왕이며, 인내력 스탯이 우주 최강."},
  "己卯":{i:"🌷",n:"비옥한 화원",sub:"己卯 · 심은 것은 반드시 피운다",d:"비옥한 전답에 봄꽃이 가득! 사람이든 사업이든 관계든, 한번 심은 것은 반드시 꽃피우는 재배 능력이 발동한다. 주변 사람의 잠재력을 끌어올리는 인재 육성 본능도 탑재."},
  "己巳":{i:"🏺",n:"도자기 가마",sub:"己巳 · 흙을 예술로 변환",d:"흙(己)과 불(巳)의 조화! 지극히 평범한 재료를 세상에 하나뿐인 명품으로 변환하는 연금술이 발동한다. 남들이 버린 것에서 가치를 발견하고, 하찮은 것을 귀하게 만드는 천재."},
  "己未":{i:"🤱",n:"어머니의 대지",sub:"己未 · 간여지동의 무한 포용",d:"천간·지지 모두 토(土)! 무한한 인내와 희생으로 주변 모든 것을 받아주는 어머니 대지. 듬직한 버팀목이 돼주며 곁에 있으면 불안 게이지가 0으로 수렴한다."},
  "己酉":{i:"🔍",n:"원석 감별사",sub:"己酉 · 숨겨진 가치를 꿰뚫다",d:"비옥한 땅 속에 묻힌 보석을 귀신같이 찾아내는 감별 능력! 사람의 숨겨진 재능, 사업의 숨은 기회, 물건의 진짜 가치를 단번에 꿰뚫어보는 '가치 투시'가 상시 발동한다."},
  "己亥":{i:"🌿",n:"늪의 치유사",sub:"己亥 · 상처를 감싸안는 포용",d:"따뜻한 흙이 차가운 물을 품듯, 상처받은 영혼을 감싸안고 치유하는 포용의 달인. 곁에 있으면 이유 없이 마음이 편해지며, 사람들이 힘들 때 가장 먼저 찾는 인간 안식처."},

  // ═══ 庚 (경금·큰 바위/거친 철) 일주 ═══
  "庚寅":{i:"⛏️",n:"개척의 도끼",sub:"庚寅 · 미개척지를 여는 파이오니어",d:"단단한 쇠가 울창한 숲을 만나면? 길이 없는 곳에 길을 내는 파이오니어 정신이 발동! 아무도 가지 않은 길에서 기회를 찾으며, 위험을 무릅쓰는 도전정신이 남다르다."},
  "庚辰":{i:"🐲",n:"용의 비늘갑옷",sub:"庚辰 · 괴강살의 무적 방어막",d:"괴강살(魁罡殺)의 폭발적 에너지! 어떤 공격이 들어와도 용의 비늘처럼 전부 튕겨내는 무적의 방어막이 발동한다. 위기 상황에서만 깨어나는 잠든 용의 기운이 체내에 흐르고 있다."},
  "庚午":{i:"⚔️",n:"벼려진 명검",sub:"庚午 · 불에 단련된 검",d:"불(午) 속에서 단련된 금속(庚)은 천하의 명검이 된다! 시련과 고난이 많을수록 더욱 날카로워지는 정신력. 인생이 힘들 때야말로 이 능력이 최대 출력으로 가동된다."},
  "庚申":{i:"⚡",n:"강철 폭풍",sub:"庚申 · 간여지동의 속도전",d:"천간·지지 모두 금(金)! 결정의 순간 0.1초의 망설임도 없는 번개 같은 실행력이 발동한다. '고민은 사치다'가 체화된 인물이며, 속전속결로 전장을 평정하는 전광석화의 전사."},
  "庚戌":{i:"🗿",n:"철의 장막",sub:"庚戌 · 괴강살의 불굴 의지",d:"괴강살의 두 번째 형태! 한번 정한 원칙은 하늘이 두 쪽 나도 절대 양보하지 않는 극강 고집이 발동한다. 신념을 위해선 세상 전체와도 맞서는 불굴의 의지를 지녔다."},
  "庚子":{i:"❄️",n:"냉철한 칼날",sub:"庚子 · 감정 제로의 분석력",d:"차가운 금속이 겨울 물에 씻기면 세상에서 가장 날카로운 칼날이 된다! 감정 개입 0%, 극한의 이성적 판단력이 발동하며, 모든 상황을 데이터로 분석하는 인간 컴퓨터."},

  // ═══ 辛 (신금·보석/귀금속) 일주 ═══
  "辛丑":{i:"💠",n:"원석의 인내",sub:"辛丑 · 세공되기까지의 고통",d:"다이아몬드가 되려면 수만 기압의 압력을 견뎌야 한다! 세상이 자신의 가치를 알아주기까지의 긴 인고의 시간을 견디는 극강 인내심. 고통을 겪을수록 보석의 빛이 밝아진다."},
  "辛卯":{i:"🥀",n:"이슬에 젖은 칼날",sub:"辛卯 · 아름다움 속의 독설",d:"꽃 위에 놓인 칼날처럼 아름다운 외모 속에 숨겨진 날카로운 혀! 예쁜 얼굴로 미소 짓다가 한마디로 상대의 급소를 찌르는 독설 스킬이 발동한다. 단, 본인은 전혀 악의 없음."},
  "辛巳":{i:"🔥",n:"용광로의 금",sub:"辛巳 · 불에 단련될수록 빛나다",d:"보석이 불 속에 들어가면 불순물이 타버리고 순금만 남는다! 시련과 역경이 올수록 본질만 남아 더 순수하고 강하게 빛나는 성장형 능력이 발동한다."},
  "辛未":{i:"🏜️",n:"사막의 다이아몬드",sub:"辛未 · 역경 속에서 빛나다",d:"아무것도 없는 메마른 사막에서 홀로 빛나는 다이아몬드! 환경이 척박할수록, 역경이 거셀수록 오히려 더 찬란하게 빛나는 역설적 빛 방출 능력이 발동한다."},
  "辛酉":{i:"👑",n:"절대 미감",sub:"辛酉 · 간여지동의 심미안",d:"천간·지지 모두 금(金)! 예술적 감각과 심미안이 인간 한계를 넘어선 극한의 미적 천재. '아름답지 않은 것은 존재할 가치가 없다'는 철학이 체내에서 상시 가동된다."},
  "辛亥":{i:"🌊",n:"심해의 진주",sub:"辛亥 · 깊은 곳의 빛나는 지혜",d:"바다 깊은 곳에서 홀로 빛나는 진주처럼, 조용히 내면을 가꿔 놀라운 지혜와 통찰을 축적하는 능력이 발동한다. 말이 적지만 한마디가 천금의 가치를 지닌 침묵의 현자."},

  // ═══ 壬 (임수·바다/대하) 일주 ═══
  "壬寅":{i:"🧭",n:"항해의 나침반",sub:"壬寅 · 미지의 바다를 탐험하다",d:"거대한 바다가 봄나무를 만나 새로운 대륙을 향해 항해를 시작한다! 미지의 영역에 대한 두려움이 제로이며, 모험과 도전에서 쾌감을 느끼는 타고난 탐험가 본능이 발동한다."},
  "壬辰":{i:"🌊",n:"쓰나미",sub:"壬辰 · 괴강살의 파괴적 추진력",d:"괴강살의 바다 버전! 한번 움직이기로 결심하면 해일처럼 모든 것을 휩쓸어버리는 파괴적 추진력이 발동한다. 평소엔 잔잔한 호수지만, 각성하면 세상을 뒤흔드는 대재앙급 에너지."},
  "壬午":{i:"🚂",n:"증기 기관",sub:"壬午 · 물+불의 무한 동력",d:"물(壬)과 불(午)이 만나면 증기가 된다! 상반된 에너지의 폭발적 변환으로 무한 동력을 생성하는 능력이 발동. 남들이 지칠 때도 혼자 달리는 무한 체력과 정신력의 소유자."},
  "壬申":{i:"🌊",n:"청룡폭포",sub:"壬申 · 높은 곳에서 쏟아지는 물",d:"높은 절벽에서 쏟아지는 폭포수처럼 막힘이 없는 실행력! 결정하면 0.5초 안에 행동으로 옮기며, 중간에 방해물이 나타나면 돌아가는 게 아니라 부수고 직진한다."},
  "壬戌":{i:"🏞️",n:"댐의 저력",sub:"壬戌 · 괴강살의 에너지 축적",d:"괴강살의 천기가 버전! 거대한 댐처럼 에너지를 끝없이 축적했다가 최적의 타이밍에 수문을 열어 폭발시키는 천기적 능력. 준비된 한 방이 세상을 바꾸는 결정타가 된다."},
  "壬子":{i:"🐋",n:"심해의 제왕",sub:"壬子 · 간여지동의 무한 심연",d:"천간·지지 모두 수(水)! 깊이를 알 수 없는 압도적 내면 세계를 보유한 심해의 지배자. 속마음을 절대 드러내지 않으며, 그 미스터리함이 오히려 사람을 끌어당기는 블랙홀이 된다."},

  // ═══ 癸 (계수·이슬비/옹달샘) 일주 ═══
  "癸丑":{i:"🧊",n:"얼음 아래 흐르는 물",sub:"癸丑 · 정적 속의 역동",d:"겉은 완전히 얼어붙어 미동도 없지만, 얼음 아래에서는 끊임없이 물이 흐르고 있다! 표정은 무(無)인데 머릿속은 슈퍼컴퓨터가 돌아가는 스텔스 두뇌 가동 능력."},
  "癸卯":{i:"🌧️",n:"봄비의 축복",sub:"癸卯 · 주변을 성장시키는 빗물",d:"따스한 봄비가 꽃밭을 적시듯 주변 사람 모두의 성장을 촉진하는 자양분 공급 능력! 옆에 있으면 왠지 모르게 자기계발 의욕이 솟구치며, 인재를 키우는 천재 멘토."},
  "癸巳":{i:"🌈",n:"무지개 생성기",sub:"癸巳 · 물과 빛의 교차점",d:"물(癸)과 불(巳)이 교차하면 무지개가 탄생한다! 상반된 것들을 조합해 아무도 예상 못 한 환상적인 아이디어를 창출하는 능력이 발동. 발상의 전환이 일상인 창의력 폭주형."},
  "癸未":{i:"🏝️",n:"사막의 오아시스",sub:"癸未 · 극한 환경 적응력",d:"뜨겁고 메마른 사막 한복판에서도 살아남는 극한의 적응 능력! 어떤 열악한 환경에 던져져도 물 한 모금으로 살아남으며, 위기를 안식처로 바꾸는 서바이벌 천재."},
  "癸酉":{i:"🔬",n:"이슬의 렌즈",sub:"癸酉 · 진실을 확대하는 물방울",d:"이슬방울이 렌즈가 되어 보이지 않는 진실까지 확대해 보여주는 통찰력! 대화 한마디, 표정 하나에서 상대방의 진짜 속마음을 읽어내는 인간 거짓말 탐지기 능력이 발동."},
  "癸亥":{i:"♾️",n:"무한의 수원",sub:"癸亥 · 간여지동의 무한 영감",d:"천간·지지 모두 수(水)! 마르지 않는 영원한 영감의 원천을 보유한 창조력의 화신. 아이디어가 끊임없이 샘솟으며, 하나의 생각에서 수천 가지 가능성이 파생되는 무한 사고 체계."}
};

/* ─── 인생 스킬 트리 RPG ─── */
function _buildHeroSVG(elColor){
  var c={wood:'#4CAF50',fire:'#FF5722',earth:'#8D6E63',metal:'#78909C',water:'#1E88E5'}[elColor]||'#7B1FA2';
  var c2={wood:'#81C784',fire:'#FF8A65',earth:'#BCAAA4',metal:'#B0BEC5',water:'#64B5F6'}[elColor]||'#CE93D8';
  var c3={wood:'#2E7D32',fire:'#BF360C',earth:'#4E342E',metal:'#37474F',water:'#0D47A1'}[elColor]||'#4A148C';
  return '<div class="sk-hero-wrap">'
    +'<div class="sk-hero-glow" style="background:'+c+'"></div>'
    +'<svg class="sk-hero-svg" viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">'

    /* ── 바닥 그림자 ── */
    +'<ellipse cx="30" cy="76" rx="16" ry="3" fill="rgba(0,0,0,.15)"/>'

    /* ── 방패 (왼쪽, 뒷레이어) ── */
    +'<ellipse cx="8" cy="46" rx="7" ry="8.5" fill="'+c3+'"/>'
    +'<ellipse cx="8" cy="46" rx="5.5" ry="7" fill="'+c2+'"/>'
    +'<polygon points="8,40 11.5,46 8,52 4.5,46" fill="#FFD700" opacity=".7"/>'
    +'<circle cx="8" cy="46" r="1.5" fill="#FFD700"/>'

    /* ── 왼팔 ── */
    +'<rect x="11" y="40" width="9" height="6" rx="3" fill="#FFD596"/>'

    /* ── 검 (오른쪽, 뒷레이어) ── */
    +'<rect x="49" y="8" width="4" height="30" rx="2" fill="#B0BEC5"/>'
    +'<rect x="49" y="8" width="2" height="30" rx="1" fill="#E0E0E0" opacity=".5"/>'
    +'<rect x="46" y="36" width="10" height="3" rx="1.5" fill="#FFD700"/>'
    +'<rect x="50" y="39" width="2" height="5" rx="1" fill="#8D6E63"/>'
    +'<ellipse cx="51" cy="7" rx="2.5" ry="2" fill="'+c2+'"/>'
    +'<circle cx="55" cy="5" r="1.5" fill="#FFD700" opacity=".8"/>'
    +'<circle cx="48" cy="3" r="1" fill="#fff" opacity=".6"/>'
    +'<circle cx="57" cy="11" r="1" fill="'+c2+'" opacity=".6"/>'

    /* ── 오른팔 + 손 ── */
    +'<rect x="42" y="40" width="9" height="6" rx="3" fill="#FFD596"/>'
    +'<circle cx="50" cy="42" r="3" fill="#FFD596"/>'

    /* ── 다리 ── */
    +'<rect x="22" y="56" width="8" height="12" rx="3" fill="'+c3+'"/>'
    +'<rect x="32" y="56" width="8" height="12" rx="3" fill="'+c3+'"/>'

    /* ── 부츠 ── */
    +'<rect x="20" y="66" width="11" height="7" rx="3.5" fill="#4E342E"/>'
    +'<rect x="31" y="66" width="11" height="7" rx="3.5" fill="#4E342E"/>'
    +'<rect x="20" y="66" width="11" height="2.5" rx="1" fill="#6D4C41"/>'
    +'<rect x="31" y="66" width="11" height="2.5" rx="1" fill="#6D4C41"/>'

    /* ── 몸통 (튜닉) ── */
    +'<rect x="18" y="34" width="26" height="24" rx="4" fill="'+c+'"/>'
    +'<polygon points="31,37 35,48 27,48" fill="'+c2+'" opacity=".45"/>'
    +'<rect x="25" y="34" width="12" height="3" rx="1.5" fill="'+c2+'"/>'
    +'<rect x="17" y="54" width="28" height="4" rx="2" fill="#5D4037"/>'
    +'<rect x="28" y="54" width="6" height="4" fill="#FFD700"/>'

    /* ── 목 ── */
    +'<rect x="27" y="31" width="8" height="5" rx="2" fill="#FFD596"/>'

    /* ── 머리카락 (모자 아래) ── */
    +'<ellipse cx="31" cy="14" rx="12" ry="5" fill="'+c+'"/>'

    /* ── 얼굴 ── */
    +'<ellipse cx="31" cy="20" rx="12" ry="12" fill="#FFD596"/>'

    /* ── 엘프 귀 ── */
    +'<polygon points="17,19 10,14 18,24" fill="#FFD596"/>'
    +'<polygon points="45,19 52,14 44,24" fill="#FFD596"/>'
    +'<line x1="13" y1="16" x2="18" y2="22" stroke="#FFCC80" stroke-width=".7" opacity=".6"/>'
    +'<line x1="49" y1="16" x2="44" y2="22" stroke="#FFCC80" stroke-width=".7" opacity=".6"/>'

    /* ── 모자 (젤다 스타일 뾰족 캡) ── */
    +'<polygon points="19,14 31,1 43,14" fill="'+c+'"/>'
    +'<polygon points="31,1 29,3 19,14 21,14" fill="'+c2+'" opacity=".3"/>'
    +'<polygon points="19,14 13,6 7,10 15,15" fill="'+c+'"/>'
    +'<circle cx="7" cy="10" r="2.5" fill="'+c2+'"/>'
    +'<rect x="18" y="13" width="26" height="3" rx="1.5" fill="'+c2+'"/>'

    /* ── 눈 (커다란 치비 눈) ── */
    +'<ellipse cx="25" cy="20" rx="3.5" ry="4" fill="#1A237E"/>'
    +'<ellipse cx="37" cy="20" rx="3.5" ry="4" fill="#1A237E"/>'
    +'<circle cx="24" cy="19" r="1.5" fill="#fff"/>'
    +'<circle cx="36" cy="19" r="1.5" fill="#fff"/>'
    +'<circle cx="26" cy="21" r=".7" fill="rgba(255,255,255,.4)"/>'
    +'<circle cx="38" cy="21" r=".7" fill="rgba(255,255,255,.4)"/>'

    /* ── 눈썹 ── */
    +'<rect x="22" y="15" width="7" height="1.2" rx=".6" fill="#333" opacity=".6"/>'
    +'<rect x="34" y="15" width="7" height="1.2" rx=".6" fill="#333" opacity=".6"/>'

    /* ── 코 ── */
    +'<ellipse cx="31" cy="23" rx="1" ry=".7" fill="rgba(0,0,0,.08)"/>'

    /* ── 미소 ── */
    +'<path d="M27,26 Q31,29 35,26" stroke="rgba(0,0,0,.18)" stroke-width="1" fill="none" stroke-linecap="round"/>'

    /* ── 볼터치 ── */
    +'<ellipse cx="22" cy="24" rx="3" ry="1.5" fill="rgba(255,100,100,.15)"/>'
    +'<ellipse cx="40" cy="24" rx="3" ry="1.5" fill="rgba(255,100,100,.15)"/>'

    +'</svg>'
    +'</div>';
}

function renderSkillTree(p, natal){
  var area=document.getElementById('skillTreeSection');
  if(!area)return;
  var dg=p.d.g;
  var pw=G_POWER, jg=G_JONG;
  var dayEl=(GAN[dg]&&GAN[dg].e)||'earth';
  var tsCnt={};
  [p.y.g,p.y.j,p.m.g,p.m.j,p.h.g,p.h.j].forEach(function(c){
    var t=getTenGod(dg,c);
    if(t&&t!=='?'&&t!=='일간')tsCnt[t]=(tsCnt[t]||0)+1;
  });
  var grp={
    bija:(tsCnt['비견']||0)+(tsCnt['겁재']||0),
    sik:(tsCnt['식신']||0)+(tsCnt['상관']||0),
    jae:(tsCnt['편재']||0)+(tsCnt['정재']||0),
    gwan:(tsCnt['편관']||0)+(tsCnt['정관']||0),
    inp:(tsCnt['편인']||0)+(tsCnt['정인']||0)
  };
  var topGrp='bija',topVal=0;
  for(var gk in grp){if(grp[gk]>topVal){topVal=grp[gk];topGrp=gk;}}
  var clsMap={
    '甲':{base:'봄의 개척자',emoji:'🗡️'},
    '乙':{base:'바람의 탐험가',emoji:'🏹'},
    '丙':{base:'태양의 마법사',emoji:'🔥'},
    '丁':{base:'불꽃의 치유사',emoji:'✨'},
    '戊':{base:'대지의 파수꾼',emoji:'🛡️'},
    '己':{base:'땅의 연금술사',emoji:'⚗️'},
    '庚':{base:'강철의 기사',emoji:'⚔️'},
    '辛':{base:'수정의 암살자',emoji:'🔮'},
    '壬':{base:'심해의 현자',emoji:'🌊'},
    '癸':{base:'안개의 신관',emoji:'🌙'}
  };
  var sufMap={bija:'독립 영웅',sik:'창조 마에스트로',jae:'황금 군주',gwan:'규율의 지배자',inp:'위대한 현자'};
  var cls=clsMap[dg]||{base:'신비의 모험가',emoji:'⚡'};
  var coreClass=cls.emoji+' '+cls.base+' / '+sufMap[topGrp];
  var lv=Math.min(99,Math.max(1,CURRENT_AGE-1));
  var expPct=(lv%10)*10;
  var elColor={wood:'#4CAF50',fire:'#FF5722',earth:'#A1887F',metal:'#78909C',water:'#1E88E5'};
  var elIcon={wood:'🌿',fire:'🔥',earth:'⛰️',metal:'⚔️',water:'💧'};
  var elName={wood:'창의력',fire:'카리스마',earth:'안정성',metal:'결단력',water:'직관력'};
  var statBars='';
  ['wood','fire','earth','metal','water'].forEach(function(el){
    var pct=Math.round(natal.ratios[el]||0);
    statBars+='<div class="sk-stat-row">'
      +'<div class="sk-stat-label">'+elIcon[el]+' '+elName[el]+'</div>'
      +'<div class="sk-stat-bar-wrap"><div class="sk-stat-bar-fill" style="width:'+pct+'%;background:'+elColor[el]+'"></div></div>'
      +'<div class="sk-stat-val">'+pct+'%</div>'
      +'</div>';
  });
  var skillDB={
    bija:{m:{i:'⚔️',n:'자아 결집',d:'홀로서기의 전투 기술. 독립 의지와 경쟁 에너지를 극한으로 끌어올린다.',tp:'ACTIVE'},o:{i:'🛡️',n:'자아회복',d:'쓰러져도 다시 일어서는 끈질긴 생명력 패시브.'}},
    sik:{m:{i:'🎨',n:'표현의 연금술',d:'아이디어를 황금으로 변환하는 창조 마법. 말·글·예술이 최강 무기가 된다.',tp:'ACTIVE'},o:{i:'💡',n:'창조적 폭발',d:'식상 에너지가 정점에 달할 때 폭발적 혁신이 터진다.'}},
    jae:{m:{i:'💰',n:'황금의 손',d:'재원을 끌어당기고 기회를 현금화하는 절대 스킬. 타이밍이 생명.',tp:'ACTIVE'},o:{i:'📈',n:'자원 정렬',d:'가진 것을 최대로 쥐어짜는 효율 극대화 패시브.'}},
    gwan:{m:{i:'👑',n:'절대 규율',d:'조직을 통솔하고 질서를 세우는 지배자의 권능. 카리스마 +100.',tp:'ACTIVE'},o:{i:'🌟',n:'지배자의 오라',d:'존재 자체로 신뢰와 권위를 발산하는 상시 발동 패시브.'}},
    inp:{m:{i:'📚',n:'지혜의 결정',d:'깊은 사유와 통찰로 본질을 꿰뚫는 앎의 권능. 경험치 2배 획득.',tp:'ACTIVE'},o:{i:'💫',n:'생명력 회복',d:'인성 기운이 몸과 마음을 끊임없이 재충전하는 회복 스킬.'}}
  };
  var lockedDB={
    bija:{i:'🔒',n:'동료 결집',d:'비겁 약함 → 타인과 협력하는 힘 잠김. 친구·동료 네트워크 구축이 해금 키.'},
    sik:{i:'🔒',n:'표현의 연금술',d:'식상 약함 → 자기표현·창의력 잠김. 말하기·글쓰기·예술 투자로 해금 가능.'},
    jae:{i:'🔒',n:'황금의 손',d:'재성 약함 → 재물 스킬 잠김. 재무 지식·투자 공부로 해금 가능.'},
    gwan:{i:'🔒',n:'사회적 방패',d:'관성 약함 → 조직·규율 스킬 잠김. 책임감·약속 지키기로 해금 가능.'},
    inp:{i:'🔒',n:'지혜의 기록',d:'인성 약함 → 학습·수용 스킬 잠김. 꾸준한 독서와 공부가 해금의 열쇠.'}
  };
  var masterSk=skillDB[topGrp].m;
  var ownedHtml='';
  for(var gok in grp){
    if(gok!==topGrp&&grp[gok]>=1){
      var osk=skillDB[gok].o;
      ownedHtml+='<div class="sk-item sk-owned"><span class="sk-icon">'+osk.i+'</span><div><div class="sk-name">'+osk.n+'</div><div class="sk-desc">'+osk.d+'</div></div></div>';
    }
  }
  if(!ownedHtml)ownedHtml='<div style="font-size:.75rem;color:rgba(255,255,255,.3);padding:6px 0">추가 보유 스킬 없음</div>';
  var lockedHtml='';
  for(var glk in grp){
    if(grp[glk]===0){
      var lsk=lockedDB[glk];
      lockedHtml+='<div class="sk-item sk-locked"><span class="sk-icon">🔒</span><div><div class="sk-name">'+lsk.n+' <span style="font-size:.62rem;color:rgba(255,255,255,.3);font-weight:400">[잠김]</span></div><div class="sk-desc">'+lsk.d+'</div></div></div>';
    }
  }
  if(!lockedHtml)lockedHtml='<div style="font-size:.75rem;color:rgba(255,255,255,.3);padding:6px 0">잠긴 스킬 없음 🎉</div>';
  var yongshinList=(pw&&pw.yongshin)||[];
  var isSeGood=yongshinList.indexOf('fire')>=0||(jg&&jg.isJong&&jg.dominant==='fire');
  var levelUpText=isSeGood
    ?'2026년 <b>丙午 세운</b>은 당신의 용신인 <b>화(火)</b> 기운이 강하게 지원한다. 이번 해는 <span class="sk-hl">적극 행동 시즌</span> — <b>'+masterSk.n+'</b> 스킬을 최대 활용해 사회적 도전·투자·전진을 감행하라. 운이 등을 밀어줄 때 밀어야 레벨업이 된다.'
    :'2026년 <b>丙午 세운</b>의 火 기운이 당신 사주 구조에 부담을 준다. 무리한 확장보다 <span class="sk-hl">잠긴 스킬 해금 집중</span>이 천기가다. 내실을 다지며 경험치를 쌓아두면 2027년 이후 폭발적 성장이 가능하다.';
  var heroSVG=_buildHeroSVG(dayEl);
  // ─── 일주 고유능력 (INNATE ABILITY) 조회 ───
  var iljuKey=p.d.g+p.d.j;
  var innateData=ILJU_INNATE_DB[iljuKey];
  var innateHtml='';
  if(innateData){
    innateHtml='<div class="sk-innate-section">'
      +'<div class="sk-innate-label">🧬 INNATE ABILITY — 일주 고유능력</div>'
      +'<div class="sk-innate-item">'
      +'<span class="sk-innate-icon">'+innateData.i+'</span>'
      +'<div>'
      +'<div class="sk-innate-name">'+innateData.n+' <span class="sk-innate-type">PASSIVE</span></div>'
      +'<div class="sk-innate-sub">'+innateData.sub+'</div>'
      +'<div class="sk-innate-desc">'+innateData.d+'</div>'
      +'</div>'
      +'</div>'
      +'</div>';
  }
  area.innerHTML='<div class="skill-wrap">'
    +'<div class="sk-header">'
    +'<div>'
    +'<div class="sk-game-badge">⚡ SAJU RPG SYSTEM</div>'
    +'<div class="sk-main-title">인생 스킬 트리</div>'
    +'<div class="sk-sub-title">運命 SKILL TREE · 사주 기반 캐릭터 시트</div>'
    +'</div>'
    +heroSVG
    +'</div>'
    +'<div class="sk-sheet">'
    +'<div>'
    +'<div class="sk-class-label">CORE CLASS</div>'
    +'<div class="sk-class-name">'+coreClass+'</div>'
    +'<div class="sk-level-wrap">'
    +'<div class="sk-lv-badge">LV. <span>'+lv+'</span></div>'
    +'<div class="sk-exp-wrap"><div class="sk-exp-bar" style="width:'+expPct+'%"></div></div>'
    +'<div class="sk-exp-label">EXP '+expPct+' / 100 &nbsp;→&nbsp; LV.'+(lv+1)+'</div>'
    +'</div>'
    +'<div class="sk-day-badge">일간: <b>'+dg+'</b> ('+((GAN[dg]||{}).n||'')+') &nbsp;·&nbsp; '+(pw&&pw.isStrong?'⬆️ 신강':'⬇️ 신약')+(jg&&jg.isJong?' &nbsp;·&nbsp; 🌀 종격':'')+'</div>'
    +'</div>'
    +'<div>'
    +'<div class="sk-stat-title">📊 오행 스탯</div>'
    +statBars
    +'</div>'
    +'</div>'
    +innateHtml
    +'<div class="sk-tree-wrap">'
    +'<div class="sk-tree-section">'
    +'<div class="sk-tree-label">⭐ MASTER SKILL</div>'
    +'<div class="sk-item sk-master"><span class="sk-icon">'+masterSk.i+'</span><div><div class="sk-name">'+masterSk.n+' <span class="sk-type-badge">'+(masterSk.tp||'ACTIVE')+'</span></div><div class="sk-desc">'+masterSk.d+'</div></div></div>'
    +'</div>'
    +'<div class="sk-tree-section">'
    +'<div class="sk-tree-label">✅ OWNED SKILLS</div>'
    +ownedHtml
    +'</div>'
    +'<div class="sk-tree-section">'
    +'<div class="sk-tree-label">🔒 LOCKED SKILLS</div>'
    +lockedHtml
    +'</div>'
    +'</div>'
    +'<div class="sk-levelup">'
    +'<div class="sk-levelup-title">🎯 2026 레벨업 천기 (丙午 세운 기준)</div>'
    +'<div class="sk-levelup-text">'+levelUpText+'</div>'
    +'</div>'
    +'</div>';
}

/* ═══════════════════════════════════════════════════════════════
   AstroEngine — Jean Meeus "Astronomical Algorithms" 2nd Ed. 기반
   태양 정확도 ≈0.01°  달 ≈0.3°  행성 ≈0.5–1°
   ΔT 보정(Terrestrial Time) + Placidus 하우스 + 역행 판별 포함
   ═══════════════════════════════════════════════════════════════ */
var AstroEngine = (function(){
  var R2D=180/Math.PI, D2R=Math.PI/180;
  function rev(x){return x-Math.floor(x/360)*360;}

  /* ── 줄리안력 (JD) ── */
  function JD(Y,M,D,ut){
    if(M<=2){Y--;M+=12;}
    var A=Math.floor(Y/100),B=2-A+Math.floor(A/4);
    return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+D+ut/24+B-1524.5;
  }

  /* ── Delta T (ΔT) 다항식, 오차 <1초 (1800–2050) ── */
  function deltaT(y){
    if(y<948) return 2177+497*(y-600)/100+44.1*Math.pow((y-600)/100,2);
    if(y<1600){var u=(y-1000)/100;return 1574-556*u+71.23*u*u+0.319*u*u*u;}
    if(y<1700){var u=y-1600;return 120-0.9808*u-0.01532*u*u+u*u*u/7129;}
    if(y<1800){var u=y-1700;return 8.83+0.1603*u-0.0059285*u*u+0.00013336*u*u*u-Math.pow(u,4)/1174000;}
    if(y<1860){var u=y-1800;return 13.72-0.332447*u+0.0068612*u*u+0.0041116*u*u*u-0.00037436*Math.pow(u,4)+0.0000121272*Math.pow(u,5)-1.699e-7*Math.pow(u,6)+8.75e-10*Math.pow(u,7);}
    if(y<1900){var u=y-1860;return 7.62+0.5737*u-0.251754*u*u+0.01680668*u*u*u-0.0004473624*Math.pow(u,4)+Math.pow(u,5)/233174;}
    if(y<1920){var u=y-1900;return -2.79+1.494119*u-0.0598939*u*u+0.0061966*u*u*u-0.000197*Math.pow(u,4);}
    if(y<1941){var u=y-1920;return 21.20+0.84493*u-0.076100*u*u+0.0020936*u*u*u;}
    if(y<1961){var u=y-1950;return 29.07+0.407*u-u*u/233+u*u*u/2547;}
    if(y<1986){var u=y-1975;return 45.45+1.067*u-u*u/260-u*u*u/718;}
    if(y<2005){var u=y-2000;return 63.86+0.3345*u-0.060374*u*u+0.0017275*u*u*u+0.00065181*Math.pow(u,4)+2.373599e-5*Math.pow(u,5);}
    if(y<2050){var u=y-2000;return 62.92+0.32217*u+0.005589*u*u;}
    return -20+32*Math.pow((y-1820)/100,2);
  }

  /* ── 황도 경사각 ε (장동 포함, 정확도 0.001°) ── */
  function obliquity(T){
    var eps0=23+26/60+21.448/3600-(46.8150/3600)*T-(0.00059/3600)*T*T+(0.001813/3600)*T*T*T;
    var omega=rev(125.04452-1934.136261*T);
    return eps0+0.00256*Math.cos(omega*D2R);
  }

  /* ── 태양 황경 (VSOP87 간략, 정확도 0.01°) ── */
  function sunLon(jdTT){
    var T=(jdTT-2451545.0)/36525, T2=T*T;
    var L0=rev(280.46646+36000.76983*T+0.0003032*T2);
    var M=rev(357.52911+35999.05029*T-0.0001537*T2), Mr=M*D2R;
    var C=(1.914602-0.004817*T-0.000014*T2)*Math.sin(Mr)
         +(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
    var omega=rev(125.04-1934.136*T);
    return rev(L0+C-0.00569-0.00478*Math.sin(omega*D2R));
  }

  /* ── 달 황경 (Jean Meeus Ch.47 18-term, 정확도 0.3°) ── */
  function moonLon(jdTT){
    var T=(jdTT-2451545.0)/36525, T2=T*T, T3=T2*T;
    var D=rev(297.85036+445267.111480*T-0.0019142*T2+T3/189474);
    var M=rev(357.52772+35999.050340*T-0.0001603*T2-T3/300000);
    var Mp=rev(134.96298+477198.867398*T+0.0086972*T2+T3/56250);
    var F=rev(93.27191+483202.017538*T-0.0036825*T2+T3/327270);
    var O=rev(125.04452-1934.136261*T+0.0020708*T2+T3/450000);
    var Lp=rev(218.3165+481267.8813*T);
    var E=1-0.002516*T-0.0000074*T2;
    var terms=[[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],
               [0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],
               [2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],
               [0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,-2,10980],[4,0,-1,0,10675],
               [0,0,3,0,10034],[4,0,-2,0,8548]];
    var Dr=D*D2R,Mr=M*D2R,Mpr=Mp*D2R,Fr=F*D2R;
    var sumL=0;
    for(var i=0;i<terms.length;i++){
      var t=terms[i], Ef=(t[1]!==0)?Math.pow(E,Math.abs(t[1])):1;
      sumL+=t[4]*Ef*Math.sin(t[0]*Dr+t[1]*Mr+t[2]*Mpr+t[3]*Fr);
    }
    sumL+=3958*Math.sin(O*D2R)+1962*Math.sin((Lp-F)*D2R)+318*Math.sin((O+960)*D2R);
    return rev(Lp+sumL/1e6);
  }

  /* ── 케플러 방정식 풀이 (반복법, 수렴 <6회) ── */
  function kepler(M,e){
    var Mr=rev(M)*D2R, E=Mr;
    for(var i=0;i<50;i++){var dE=(Mr-E+e*Math.sin(E))/(1-e*Math.cos(E));E+=dE;if(Math.abs(dE)<1e-12)break;}
    return 2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),Math.sqrt(1-e)*Math.cos(E/2))*R2D;
  }

  /* ── 행성 황경 (저궤도 요소 + 지구중심 변환, 하드코딩 없이 계산) ── */
  var ORBITAL_ELEMENTS={
    Mercury:{N:[48.3313,3.24587e-5],i:[7.0047,5.0e-8],w:[29.1241,1.01444e-5],a:[0.387098,0],e:[0.205635,5.59e-10],M:[168.6562,4.0923344368]},
    Venus:{N:[76.6799,2.4659e-5],i:[3.3946,2.75e-8],w:[54.8910,1.38374e-5],a:[0.72333,0],e:[0.006773,-1.302e-9],M:[48.0052,1.6021302244]},
    Earth:{N:[0,0],i:[0,0],w:[282.9404,4.70935e-5],a:[1.0,0],e:[0.016709,-1.151e-9],M:[356.0470,0.9856002585]},
    Mars:{N:[49.5574,2.11081e-5],i:[1.8497,-1.78e-8],w:[286.5016,2.92961e-5],a:[1.523688,0],e:[0.093405,2.516e-9],M:[18.6021,0.5240207766]},
    Jupiter:{N:[100.4542,2.76854e-5],i:[1.3030,-1.557e-7],w:[273.8777,1.64505e-5],a:[5.20256,0],e:[0.048498,4.469e-9],M:[19.8950,0.0830853001]},
    Saturn:{N:[113.6634,2.3898e-5],i:[2.4886,-1.081e-7],w:[339.3939,2.97661e-5],a:[9.55475,0],e:[0.055546,-9.499e-9],M:[316.9670,0.0334442282]},
    Uranus:{N:[74.0005,1.3978e-5],i:[0.7733,1.9e-8],w:[96.6612,3.0565e-5],a:[19.18171,-1.55e-8],e:[0.047318,7.45e-9],M:[142.5905,0.011725806]},
    Neptune:{N:[131.7806,3.0173e-5],i:[1.77,-2.55e-7],w:[272.8461,-6.027e-6],a:[30.05826,3.313e-8],e:[0.008606,2.15e-9],M:[260.2471,0.005995147]},
    Pluto:{N:[110.30347,0],i:[17.14175,0],w:[113.76329,0],a:[39.48168677,0],e:[0.24880766,0],M:[14.53,0.00396]}
  };

  function daysFromJ2000(jd){
    return jd - 2451543.5;
  }

  function solveEccentricAnomaly(Mdeg,e){
    var M=rev(Mdeg)*D2R;
    var E=M + e*Math.sin(M)*(1+e*Math.cos(M));
    for(var i=0;i<15;i++){
      var dE=(E - e*Math.sin(E) - M)/(1 - e*Math.cos(E));
      E-=dE;
      if(Math.abs(dE) < 1e-10) break;
    }
    return E;
  }

  function sinDeg(x){ return Math.sin(x*D2R); }
  function cosDeg(x){ return Math.cos(x*D2R); }

  function heliocentricRect(name,d){
    var el=ORBITAL_ELEMENTS[name];
    var N=rev(el.N[0] + el.N[1]*d)*D2R;
    var i=rev(el.i[0] + el.i[1]*d)*D2R;
    var w=rev(el.w[0] + el.w[1]*d)*D2R;
    var a=el.a[0] + el.a[1]*d;
    var e=el.e[0] + el.e[1]*d;
    var M=rev(el.M[0] + el.M[1]*d);
    var E=solveEccentricAnomaly(M,e);

    var xv=a*(Math.cos(E)-e);
    var yv=a*(Math.sqrt(1-e*e)*Math.sin(E));
    var v=Math.atan2(yv,xv);
    var r=Math.sqrt(xv*xv + yv*yv);

    var xh=r*(Math.cos(N)*Math.cos(v+w)-Math.sin(N)*Math.sin(v+w)*Math.cos(i));
    var yh=r*(Math.sin(N)*Math.cos(v+w)+Math.cos(N)*Math.sin(v+w)*Math.cos(i));
    var zh=r*(Math.sin(v+w)*Math.sin(i));
    return {x:xh,y:yh,z:zh};
  }

  function rectToSpherical(rect){
    var r=Math.sqrt(rect.x*rect.x + rect.y*rect.y + rect.z*rect.z);
    var lon=rev(Math.atan2(rect.y,rect.x)*R2D);
    var lat=Math.atan2(rect.z,Math.sqrt(rect.x*rect.x + rect.y*rect.y))*R2D;
    return {lon:lon,lat:lat,r:r};
  }

  function sphericalToRect(lon,lat,r){
    var lr=lon*D2R, br=lat*D2R;
    var cb=Math.cos(br);
    return {
      x:r*Math.cos(lr)*cb,
      y:r*Math.sin(lr)*cb,
      z:r*Math.sin(br)
    };
  }

  // Schlyter-style perturbation corrections (degrees) for better minute-level agreement.
  function perturbPlanetLon(name,d,meanAnomaly){
    var Ms=rev(ORBITAL_ELEMENTS.Earth.M[0] + ORBITAL_ELEMENTS.Earth.M[1]*d);
    var Mv=rev(ORBITAL_ELEMENTS.Venus.M[0] + ORBITAL_ELEMENTS.Venus.M[1]*d);
    var Mm=rev(ORBITAL_ELEMENTS.Mars.M[0] + ORBITAL_ELEMENTS.Mars.M[1]*d);
    var Mj=rev(ORBITAL_ELEMENTS.Jupiter.M[0] + ORBITAL_ELEMENTS.Jupiter.M[1]*d);
    var Msa=rev(ORBITAL_ELEMENTS.Saturn.M[0] + ORBITAL_ELEMENTS.Saturn.M[1]*d);
    var Mu=rev(ORBITAL_ELEMENTS.Uranus.M[0] + ORBITAL_ELEMENTS.Uranus.M[1]*d);

    var dLon=0;
    if(name==='Mercury'){
      dLon += 0.00204*cosDeg(5*Mv - 2*meanAnomaly + 12.220);
      dLon += 0.00103*cosDeg(2*Mv - meanAnomaly - 160.692);
      dLon += 0.00091*cosDeg(2*Mv - 3*meanAnomaly + 37.003);
      dLon += 0.00078*cosDeg(5*Mv - 3*meanAnomaly + 10.137);
    } else if(name==='Venus'){
      dLon += 0.00313*cosDeg(2*Ms - 2*meanAnomaly - 148.225);
      dLon += 0.00198*cosDeg(3*Ms - 3*meanAnomaly + 2.565);
      dLon += 0.00136*cosDeg(Ms - meanAnomaly - 119.107);
      dLon += 0.00096*cosDeg(3*Ms - 2*meanAnomaly - 135.912);
      dLon += 0.00082*cosDeg(Mj - meanAnomaly - 208.087);
    } else if(name==='Mars'){
      dLon += 0.00705*cosDeg(Mj - Mm - 48.958);
      dLon += 0.00607*cosDeg(2*Mj - Mm - 188.350);
      dLon += 0.00445*cosDeg(2*Mj - 2*Mm - 191.897);
      dLon += 0.00388*cosDeg(Mm - 2*Mj + 20.495);
      dLon += 0.00238*cosDeg(Ms - Mm + 158.638);
      dLon += 0.00204*cosDeg(2*Ms - Mm + 154.093);
      dLon += 0.00177*cosDeg(Mm - Mv + 179.531);
      dLon += 0.00136*cosDeg(2*Ms - 2*Mm + 95.528);
      dLon += 0.00104*cosDeg(Mj + 17.618);
      dLon += 0.00083*cosDeg(2*Mj - Mv + 8.479);
      dLon += 0.00053*cosDeg(Mj - 2*Mm + 121.551);
      dLon += 0.00043*cosDeg(2*Ms - Mv + 129.152);
      dLon += 0.00026*cosDeg(Ms + Mj - Mm + 168.229);
    } else if(name==='Jupiter'){
      dLon += -0.332*sinDeg(2*Mj - 5*Msa - 67.6);
      dLon += -0.056*sinDeg(2*Mj - 2*Msa + 21);
      dLon += 0.042*sinDeg(3*Mj - 5*Msa + 21);
      dLon += -0.036*sinDeg(Mj - 2*Msa);
      dLon += 0.022*cosDeg(Mj - Msa);
      dLon += 0.023*sinDeg(2*Mj - 3*Msa + 52);
      dLon += -0.016*sinDeg(Mj - 5*Msa - 69);
    }
    return dLon;
  }

  function correctedHeliocentricRect(name,d){
    var rect=heliocentricRect(name,d);
    if(name==='Pluto' || name==='Saturn' || name==='Uranus' || name==='Neptune' || name==='Earth') return rect;
    var sph=rectToSpherical(rect);
    var meanAnomaly=rev(ORBITAL_ELEMENTS[name].M[0] + ORBITAL_ELEMENTS[name].M[1]*d);
    var corrLon=rev(sph.lon + perturbPlanetLon(name,d,meanAnomaly));
    return sphericalToRect(corrLon,sph.lat,sph.r);
  }

  function geocentricPlanetLon(jdUT,name){
    var d=daysFromJ2000(jdUT);
    var earth=heliocentricRect('Earth',d);
    var p=correctedHeliocentricRect(name,d);

    var xg=p.x-earth.x;
    var yg=p.y-earth.y;
    var zg=p.z-earth.z;

    // Light-time correction improves fast-moving planets (especially inner planets).
    var delta=Math.sqrt(xg*xg + yg*yg + zg*zg);
    var ltDays=delta*0.0057755183;
    if(ltDays>1e-6){
      var pLt=correctedHeliocentricRect(name,d-ltDays);
      xg=pLt.x-earth.x;
      yg=pLt.y-earth.y;
    }
    return rev(Math.atan2(yg,xg)*R2D);
  }

  function planetPositions(jdUT){
    var res={};
    ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].forEach(function(name){
      var nowLon=geocentricPlanetLon(jdUT,name);
      var prevLon=geocentricPlanetLon(jdUT-1,name);
      var drift=rev(nowLon - prevLon + 180) - 180;
      res[name]={lon:nowLon, retrograde:(drift<0)};
    });
    return res;
  }

  /* ── 그리니치 항성시 → 지방 항성시 → RAMC (degrees) ── */
  function localSidereal(jdUT,lon){
    var T=(jdUT-2451545.0)/36525;
    var GMST=280.46061837+360.98564736629*(jdUT-2451545.0)+0.000387933*T*T-T*T*T/38710000;
    return rev(GMST+lon);
  }

  /* ── Placidus 하우스 커스프 ── */
  function placidusHouses(ramc,lat,eps){
    var ramcR=ramc*D2R, latR=lat*D2R, epsR=eps*D2R;
    // MC: tan(MC)=tan(RAMC)/cos(ε)
    var MC=rev(Math.atan2(Math.tan(ramcR),Math.cos(epsR))*R2D);
    if(Math.cos(ramcR)<0) MC=rev(MC+180);
    // ASC: 구면삼각법 (정밀 교정 - Meeus 사분면 보정)
    var y = Math.cos(ramcR);
    var x = -Math.sin(ramcR)*Math.cos(epsR) - Math.tan(latR)*Math.sin(epsR);
    var ASC = rev(Math.atan2(y, x)*R2D);
    // 고위도 폴백 (|lat|≥65°)
    if(Math.abs(lat)>=65) ASC=rev(MC+90);
    // 11/12 커스프 반복법 (Placidus)
    function cusp(frac){
      var c=rev(MC+frac*60);
      for(var i=0;i<12;i++){
        var ra=Math.atan2(Math.sin(c*D2R),(Math.cos(c*D2R)*Math.cos(epsR)+Math.tan(latR)*Math.sin(epsR)))*R2D;
        ra=rev(ra); if(Math.cos(c*D2R)<0) ra=rev(ra+180);
        var dRA=rev(ra-ramc); c=rev(ra-frac*dRA);
      }
      return rev(c);
    }
    var h11=(Math.abs(lat)<65)?cusp(1/3):rev(MC+30);
    var h12=(Math.abs(lat)<65)?cusp(2/3):rev(MC+60);
    return {MC:MC,ASC:ASC,h11:h11,h12:h12,h2:rev(h12+180),h3:rev(h11+180),IC:rev(MC+180),DESC:rev(ASC+180)};
  }

  /* ── 황경 → 별자리 변환 ── */
  var SIGNS=['양자리(♈)','황소자리(♉)','쌍둥이자리(♊)','게자리(♋)','사자자리(♌)','처녀자리(♍)','천칭자리(♎)','전갈자리(♏)','사수자리(♐)','염소자리(♑)','물병자리(♒)','물고기자리(♓)'];
  function toSign(lon){
    lon=rev(lon);
    var idx=Math.floor(lon/30);
    var degWhole = Math.floor(lon % 30);
    // Add tiny epsilon to prevent 9°09' being rendered as 9°08' from floating-point drift.
    var minWhole = Math.floor((((lon % 30) - degWhole) * 60) + 1e-9);
    var display = SIGNS[idx] + ' ' + degWhole + '° ' + minWhole + '\'';
    return { sign: display, _baseSign: SIGNS[idx], idx: Math.min(idx, 11), deg: (lon % 30) };
  }

  /* ── 메인 계산 ── */
  function calcAll(year,mon,day,localHour,lat,lon,tzOff){
    // UTC = 표준시 기준 현지 시각 - 표준시 오프셋
    var utc=localHour-tzOff;
    var Y=year,M=mon,D=day;
    // 날짜 경계 처리
    if(utc<0){utc+=24;D--;if(D<1){M--;if(M<1){M=12;Y--;}var dp=[0,31,(Y%4===0&&(Y%100!==0||Y%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];D=dp[M];}}
    if(utc>=24){utc-=24;D++;}

    // 경도 기반 지방시 보정 (표준자오선 대비) — 하우스/LST 검증용
    var stdLon = (tzOff || 0) * 15;
    var lonCorrMin = (lon - stdLon) * 4; // 1도 = 4분
    var utcLmt = utc + lonCorrMin / 60;
    var Yl=Y, Ml=M, Dl=D;
    if(utcLmt<0){utcLmt+=24;Dl--;if(Dl<1){Ml--;if(Ml<1){Ml=12;Yl--;}var dpl=[0,31,(Yl%4===0&&(Yl%100!==0||Yl%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];Dl=dpl[Ml];}}
    if(utcLmt>=24){utcLmt-=24;Dl++;}

    var jdUT=JD(Y,M,D,utc);
    var jdUTLmt=JD(Yl,Ml,Dl,utcLmt);
    var dT=deltaT(year);
    var jdTT=jdUT+dT/86400;
    var T=(jdTT-2451545.0)/36525;
    var eps=obliquity(T);
    var sLon=sunLon(jdTT);
    var mLon=moonLon(jdTT);
    var planets=planetPositions(jdUT);
    // 경도 보정 적용 방식: LMT(UTC) + 표준자오선 = 지역 항성시
    var ramc=localSidereal(jdUTLmt,stdLon);
    var houses=placidusHouses(ramc,lat,eps);

    // Lots: Part of Fortune / Part of Spirit (day-night formula)
    var isDayBirth = (localHour >= 6 && localHour < 18);
    var fortunaLon = rev(houses.ASC + (isDayBirth ? (mLon - sLon) : (sLon - mLon)));
    var spiritLon  = rev(houses.ASC + (isDayBirth ? (sLon - mLon) : (mLon - sLon)));

    // Whole Sign 하우스 병기
    var ascIdx=Math.floor(rev(houses.ASC)/30);
    var wsCusps=[];
    for(var hi=0;hi<12;hi++) wsCusps.push(rev((ascIdx+hi)*30));
    var pSigns={};
    Object.keys(planets).forEach(function(n){
      pSigns[n]={sign:toSign(planets[n].lon),retro:planets[n].retrograde};
    });
    return {
      jdUT:jdUT, jdTT:jdTT, dT:Math.round(dT), eps:Math.round(eps*100)/100,
      sun:toSign(sLon), moon:toSign(mLon),
      asc:toSign(houses.ASC), mc:toSign(houses.MC),
      desc:toSign(houses.DESC), ic:toSign(houses.IC),
      h11:toSign(houses.h11), h12:toSign(houses.h12),
      h2:toSign(houses.h2), h3:toSign(houses.h3),
      planets:pSigns, ramc:Math.round(ramc*100)/100,
      lots:{
        fortuna:toSign(fortunaLon),
        spirit:toSign(spiritLon),
        isDay:isDayBirth
      },
      wholeSign:{
        h1:toSign(wsCusps[0]), h2:toSign(wsCusps[1]), h3:toSign(wsCusps[2]),
        h4:toSign(wsCusps[3]), h5:toSign(wsCusps[4]), h6:toSign(wsCusps[5]),
        h7:toSign(wsCusps[6]), h8:toSign(wsCusps[7]), h9:toSign(wsCusps[8]),
        h10:toSign(wsCusps[9]), h11:toSign(wsCusps[10]), h12:toSign(wsCusps[11])
      },
      debug:{
        utcCivilDateY:Y,
        utcCivilDateM:M,
        utcCivilDateD:D,
        utcCivilHour:Math.round(utc*1000000)/1000000,
        utcLmtDateY:Yl,
        utcLmtDateM:Ml,
        utcLmtDateD:Dl,
        utcLmtHour:Math.round(utcLmt*1000000)/1000000,
        longitudeCorrectionMin:Math.round(lonCorrMin*100)/100,
        stdLongitude:stdLon,
        usedLongitude:lon,
        jdUTLmt:jdUTLmt
      }
    };
  }

  return {calcAll:calcAll, toSign:toSign, deltaT:deltaT};
})();
/* ═══════════════════════════ END AstroEngine ═══════════════════════════════ */

  /* High-Precision wrapper with SwissEph interface + structured natal JSON output */
  (function(){
    var LegacyAstroEngine = AstroEngine;
    var PLANET_ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    var DEFAULT_ORBS = { conjunction:8, opposition:8, trine:7, square:7, sextile:5, quincunx:3 };

    function revDeg(x){ return ((x % 360) + 360) % 360; }
    function angularDistance(a,b){ var d=Math.abs(revDeg(a)-revDeg(b)); return d>180 ? 360-d : d; }

    function calcJulianDayUTC(year, month, day, hourUTC){
      if(month<=2){ year-=1; month+=12; }
      var A=Math.floor(year/100), B=2-A+Math.floor(A/4);
      return Math.floor(365.25*(year+4716))+Math.floor(30.6001*(month+1))+day+(hourUTC/24)+B-1524.5;
    }

    function calcDeltaTSeconds(y){
      if (LegacyAstroEngine && typeof LegacyAstroEngine.deltaT === 'function') return LegacyAstroEngine.deltaT(y);
      if(y<2050){var u=y-2000;return 62.92+0.32217*u+0.005589*u*u;}
      return 69;
    }

    function normalizeLocalToUTC(year, month, day, localHour, tzOffset){
      var utcHour = localHour - tzOffset;
      var yy=year, mm=month, dd=day;
      if(utcHour<0){
        utcHour+=24; dd-=1;
        if(dd<1){
          mm-=1; if(mm<1){mm=12;yy-=1;}
          var md=[0,31,(yy%4===0&&(yy%100!==0||yy%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
          dd=md[mm];
        }
      }
      if(utcHour>=24){ utcHour-=24; dd+=1; }
      return { year:yy, month:mm, day:dd, utcHour:utcHour };
    }

    function inferWholeSignHouse(ascLon, bodyLon){
      var ascSign=Math.floor(revDeg(ascLon)/30), bodySign=Math.floor(revDeg(bodyLon)/30);
      return ((bodySign-ascSign+12)%12)+1;
    }

    function computeAspects(planetsDeg, orbs){
      var orb=Object.assign({}, DEFAULT_ORBS, orbs||{});
      var defs=[
        {name:'Conjunction',angle:0,orb:orb.conjunction},
        {name:'Sextile',angle:60,orb:orb.sextile},
        {name:'Square',angle:90,orb:orb.square},
        {name:'Trine',angle:120,orb:orb.trine},
        {name:'Quincunx',angle:150,orb:orb.quincunx},
        {name:'Opposition',angle:180,orb:orb.opposition}
      ];
      var keys=Object.keys(planetsDeg||{}), out=[];
      for(var i=0;i<keys.length;i++){
        for(var j=i+1;j<keys.length;j++){
          var p1=keys[i],p2=keys[j],dist=angularDistance(planetsDeg[p1],planetsDeg[p2]);
          for(var k=0;k<defs.length;k++){
            var a=defs[k], delta=Math.abs(dist-a.angle);
            if(delta<=a.orb){
              out.push({p1:p1,p2:p2,aspect:a.name,exact:a.angle,orb:Number(delta.toFixed(4)),distance:Number(dist.toFixed(4))});
              break;
            }
          }
        }
      }
      return out;
    }

    function buildPlanetJson(chart){
      var out=[];
      var ascLon=chart.asc&&chart.asc.idx!=null ? (chart.asc.idx*30+(chart.asc.deg||0)) : 0;
      var degrees={ Sun:chart.sun.idx*30+(chart.sun.deg||0), Moon:chart.moon.idx*30+(chart.moon.deg||0) };
      out.push({planet:'Sun',degree:Number(degrees.Sun.toFixed(4)),house:inferWholeSignHouse(ascLon,degrees.Sun),is_retrograde:false});
      out.push({planet:'Moon',degree:Number(degrees.Moon.toFixed(4)),house:inferWholeSignHouse(ascLon,degrees.Moon),is_retrograde:false});
      PLANET_ORDER.slice(2).forEach(function(name){
        var p=chart.planets&&chart.planets[name];
        if(!p||!p.sign)return;
        var lon=p.sign.idx*30+(p.sign.deg||0);
        degrees[name]=lon;
        out.push({planet:name,degree:Number(lon.toFixed(4)),house:inferWholeSignHouse(ascLon,lon),is_retrograde:!!p.retro});
      });
      return { planets:out, degrees:degrees };
    }

    function sweValueAt(res, idx){
      if(!res) return null;
      if(Array.isArray(res)) return res[idx];
      if(Array.isArray(res.data)) return res.data[idx];
      if(Array.isArray(res.xx)) return res.xx[idx];
      if(Array.isArray(res.return)) return res.return[idx];
      if(Array.isArray(res.result)) return res.result[idx];
      if(typeof res.longitude === 'number' && idx===0) return res.longitude;
      if(typeof res.speedLongitude === 'number' && idx===3) return res.speedLongitude;
      return null;
    }

    function safeNumber(v, fallback){
      var n = Number(v);
      return isNaN(n) ? fallback : n;
    }

    function callSweCalcUt(swe, jdUT, planetId, flags){
      try {
        var fn = swe.swe_calc_ut || swe.calc_ut;
        if (typeof fn !== 'function') return null;
        var r = fn.call(swe, jdUT, planetId, flags);
        if (r != null) return r;
      } catch(e) {}
      return null;
    }

    function callSweHouses(swe, jdUT, lat, lon, houseSystem){
      var hsys = (houseSystem || 'P');
      try {
        if (typeof swe.swe_houses_ex === 'function') {
          var rh = swe.swe_houses_ex(jdUT, 0, lat, lon, hsys);
          if (rh) return rh;
        }
      } catch(e) {}
      try {
        if (typeof swe.swe_houses === 'function') {
          var r = swe.swe_houses(jdUT, lat, lon, hsys);
          if (r) return r;
        }
      } catch(e2) {}
      return null;
    }

    function mapPlanetId(swe, name){
      var key = {
        Sun:'SE_SUN', Moon:'SE_MOON', Mercury:'SE_MERCURY', Venus:'SE_VENUS', Mars:'SE_MARS',
        Jupiter:'SE_JUPITER', Saturn:'SE_SATURN', Uranus:'SE_URANUS', Neptune:'SE_NEPTUNE', Pluto:'SE_PLUTO'
      }[name];
      return swe && typeof swe[key] === 'number' ? swe[key] : null;
    }

    function buildSwissChartFromRaw(raw, housesRaw, jdUT, jdTT, dt, houseSystem){
      var lonBy = {};
      var planets = {};

      PLANET_ORDER.forEach(function(name){
        var p = raw[name];
        if (!p) return;
        var lon = revDeg(safeNumber(sweValueAt(p,0), 0));
        var speed = safeNumber(sweValueAt(p,3), 0);
        lonBy[name] = lon;
        if (name !== 'Sun' && name !== 'Moon') {
          planets[name] = { sign: LegacyAstroEngine.toSign(lon), retro: speed < 0 };
        }
      });

      var ascLon = null, mcLon = null;
      if (housesRaw) {
        if (Array.isArray(housesRaw.ascmc)) {
          ascLon = housesRaw.ascmc[0];
          mcLon = housesRaw.ascmc[1];
        } else if (Array.isArray(housesRaw.ascendant)) {
          ascLon = housesRaw.ascendant[0];
        }
        if (housesRaw.ascendant != null && !Array.isArray(housesRaw.ascendant)) ascLon = housesRaw.ascendant;
        if (housesRaw.mc != null) mcLon = housesRaw.mc;
        if (housesRaw.midheaven != null) mcLon = housesRaw.midheaven;
      }
      if (ascLon == null || mcLon == null) {
        return null;
      }

      var asc = LegacyAstroEngine.toSign(revDeg(ascLon));
      var mc  = LegacyAstroEngine.toSign(revDeg(mcLon));
      var wsCusps=[];
      for (var i=0;i<12;i++) wsCusps.push(revDeg((asc.idx + i) * 30));

      return {
        jdUT: jdUT,
        jdTT: jdTT,
        dT: Math.round(dt),
        deltaT: Number(dt.toFixed(3)),
        sun: LegacyAstroEngine.toSign(lonBy.Sun || 0),
        moon: LegacyAstroEngine.toSign(lonBy.Moon || 0),
        asc: asc,
        mc: mc,
        desc: LegacyAstroEngine.toSign(revDeg((ascLon || 0) + 180)),
        ic: LegacyAstroEngine.toSign(revDeg((mcLon || 0) + 180)),
        planets: planets,
        wholeSign:{
          h1:LegacyAstroEngine.toSign(wsCusps[0]), h2:LegacyAstroEngine.toSign(wsCusps[1]), h3:LegacyAstroEngine.toSign(wsCusps[2]),
          h4:LegacyAstroEngine.toSign(wsCusps[3]), h5:LegacyAstroEngine.toSign(wsCusps[4]), h6:LegacyAstroEngine.toSign(wsCusps[5]),
          h7:LegacyAstroEngine.toSign(wsCusps[6]), h8:LegacyAstroEngine.toSign(wsCusps[7]), h9:LegacyAstroEngine.toSign(wsCusps[8]),
          h10:LegacyAstroEngine.toSign(wsCusps[9]), h11:LegacyAstroEngine.toSign(wsCusps[10]), h12:LegacyAstroEngine.toSign(wsCusps[11])
        },
        natal: { meta: { precisionMode: 'swisseph', houseSystem: houseSystem || 'P' } }
      };
    }

    // SwissEph adapter entrypoint.
    function trySwissEphChart(input){
      var swe=window.swisseph||window.Swe||window.swe||null;
      if(!swe) return null;
      try{
        if(typeof swe.calc_ut!=='function' && typeof swe.swe_calc_ut!=='function') return null;
        var flagSpeed = (typeof swe.SEFLG_SPEED === 'number') ? swe.SEFLG_SPEED : 256;
        var flagSwiss = (typeof swe.SEFLG_SWIEPH === 'number') ? swe.SEFLG_SWIEPH : 2;
        var flags = flagSpeed | flagSwiss;

        var raw = {};
        for (var i=0;i<PLANET_ORDER.length;i++) {
          var name = PLANET_ORDER[i];
          var pid = mapPlanetId(swe, name);
          if (pid == null) return null;
          var pRes = callSweCalcUt(swe, input.jdUT, pid, flags);
          if (!pRes) return null;
          raw[name] = pRes;
        }

        var housesRaw = callSweHouses(swe, input.jdUT, input.lat, input.lon, input.houseSystem || 'P');
        var built = buildSwissChartFromRaw(raw, housesRaw, input.jdUT, input.jdTT, input.deltaT || 0, input.houseSystem || 'P');
        return built;
      }catch(e){
        return null;
      }
    }

    function calcAll(year,mon,day,localHour,lat,lon,tzOff,options){
      var opts=options||{};
      var strictPrecision = (window.ASTRO_STRICT_PRECISION !== undefined) ? !!window.ASTRO_STRICT_PRECISION : false;
      var n=normalizeLocalToUTC(year,mon,day,localHour,tzOff||0);
      var jdUT=calcJulianDayUTC(n.year,n.month,n.day,n.utcHour);
      var dt=calcDeltaTSeconds(year + (mon-0.5)/12);
      var jdTT=jdUT + dt/86400;

      var swiss=trySwissEphChart({year:year,month:mon,day:day,localHour:localHour,lat:lat,lon:lon,tzOff:tzOff,jdUT:jdUT,jdTT:jdTT,deltaT:dt,houseSystem:opts.houseSystem||'P'});
      if(!swiss && strictPrecision){
        throw new Error('High-precision astrology requires Swiss Ephemeris adapter. Set window.ASTRO_STRICT_PRECISION=false to temporarily allow legacy fallback.');
      }
      var base=swiss || LegacyAstroEngine.calcAll(year,mon,day,localHour,lat,lon,tzOff);
      var structured=buildPlanetJson(base);

      base.jdUT=jdUT;
      base.jdTT=jdTT;
      base.deltaT=Number(dt.toFixed(3));
      base.natal={
        meta:{
          precisionMode: swiss ? 'swisseph' : 'legacy-fallback',
          houseSystem: opts.houseSystem || 'P',
          geocodingSpec:{ provider:'Nominatim|Google|Mapbox', input:'{ city, region, country }', output:'{ lat, lon, iana_tz }' }
        },
        planets: structured.planets,
        aspects: computeAspects(structured.degrees, opts.orbs || {})
      };
      return base;
    }

    AstroEngine = {
      calcAll: calcAll,
      toSign: LegacyAstroEngine.toSign,
      deltaT: calcDeltaTSeconds,
      toNatalJSON: function(year,mon,day,localHour,lat,lon,tzOff,options){
        var chart=calcAll(year,mon,day,localHour,lat,lon,tzOff,options);
        var mode = chart && chart.natal && chart.natal.meta ? chart.natal.meta.precisionMode : '';
        if (mode !== 'swisseph') {
          throw new Error('toNatalJSON requires SwissEph mode. precisionMode=' + (mode || 'unknown'));
        }
        return {
          meta: chart.natal.meta,
          jdUT: Number(chart.jdUT.toFixed(6)),
          jdTT: Number(chart.jdTT.toFixed(6)),
          deltaT: chart.deltaT,
          data: chart.natal.planets,
          aspects: chart.natal.aspects
        };
      }
    };
  })();

const astrologer = {
    signs: ['양자리(♈)', '황소자리(♉)', '쌍둥이자리(♊)', '게자리(♋)', '사자자리(♌)', '처녀자리(♍)', '천칭자리(♎)', '전갈자리(♏)', '사수자리(♐)', '염소자리(♑)', '물병자리(♒)', '물고기자리(♓)'],
    elements: ['불(Fire)', '흙(Earth)', '공기(Air)', '물(Water)'],
    modalities: ['활동궁(Cardinal)', '고정궁(Fixed)', '변통궁(Mutable)'],
  houses: ['1 하우스 (자아/외모)', '2 하우스 (가치/재물)', '3 하우스 (소통/학습)', '4 하우스 (뿌리/가정)', '5 하우스 (창조/연애)', '6 하우스 (노동/건강)', '7 하우스 (관계/파트너)', '8 하우스 (변환/공유자산)', '9 하우스 (철학/확장)', '10 하우스 (성취/천직)', '11 하우스 (비전/네트워크)', '12 하우스 (무의식/영성)']
};

function calcAstroApiChartOrThrow(year, month, day, localHour, lat, lon, tz, houseSystem) {
  var hs = houseSystem || (window.ASTRO_HOUSE_SYSTEM || 'P');
  var chart = AstroEngine.calcAll(year, month, day, localHour, lat, lon, tz, { houseSystem: hs });
  var mode = chart && chart.natal && chart.natal.meta ? chart.natal.meta.precisionMode : 'unknown';
  // legacy-fallback(Jean Meeus 기반)도 허용 — SwissEph WASM 미로드 시에도 천문 계산 진행
  if (mode !== 'swisseph' && mode !== 'legacy-fallback') {
    throw new Error('SwissEph API 결과가 준비되지 않았습니다. precisionMode=' + mode);
  }
  return chart;
}

function renderAstroApiUnavailable(reason) {
  var area = document.getElementById('astroResult');
  if (!area) return;
  var msg = String(reason || 'SwissEph API 초기화 실패')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  area.innerHTML = ''
    + '<div class="astro-body astro-readable cosmic-theme star-container" id="astroBodyWrap" style="background:linear-gradient(180deg,#060a16 0%,#0d1428 50%,#121a32 100%);border-radius:20px;padding:12px;">'
    + '<div class="astro-section" style="border:1px solid rgba(248,113,113,.4);background:linear-gradient(160deg,rgba(30,10,20,.78),rgba(20,20,45,.88));border-radius:16px;padding:14px;">'
    + '<div class="astro-subhead" style="color:#fecdd3;margin-bottom:8px;">🛰 점성술 엔진 연결 중</div>'
    + '<div class="astro-desc" style="line-height:1.75;">'
    + '<p style="margin:0;color:#ffe4e6;">아직 코즈믹 데이터가 완전히 연결되지 않았어요. 잠시 후 다시 시도하면 정상 반영됩니다.</p>'
    + '<p style="margin:8px 0 0 0;color:#fecdd3;"><b>참고 로그:</b> ' + msg + '</p>'
    + '<p style="margin:8px 0 0 0;color:#cbd5e1;">지금은 급하게 새로고침 1회 후 다시 열면 복구되는 케이스가 가장 많아요.</p>'
    + '</div></div></div>';
}

function renderAstroInsight() {
  var birth = window._astroBirth || window._ziweiBirth || { year:2000, month:1, day:1, hour:12, minute:0, lat:37.6, lon:127.0, tz:9 };
    var y = birth.year, m = birth.month, d = birth.day;
    var h = (birth.hour != null ? birth.hour : 12);
    var min = (birth.minute != null ? birth.minute : 0);
    var lat = birth.lat || 37.6, lon = birth.lon || 127.0, tz = (birth.tz != null ? birth.tz : 9);
    /* ── AstroEngine 천체역학 계산 (Jean Meeus 기반) ── */
    var houseSystem = (window.ASTRO_HOUSE_SYSTEM || 'P');
    var chart, chartNow;
    try {
      chart = calcAstroApiChartOrThrow(y, m, d, h + min / 60, lat, lon, tz, houseSystem);
      var now = new Date();
      chartNow = calcAstroApiChartOrThrow(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, lat, lon, tz, houseSystem);
    } catch (apiErr) {
      renderAstroApiUnavailable(apiErr && apiErr.message ? apiErr.message : apiErr);
      return;
    }

    /* ── 현재 날짜 목성 트랜짓 (실시간) ── */
    var now = new Date();
    var jupiterTransit = chartNow.planets.Jupiter.sign.sign;
    var jupiterIndex = (chartNow.planets.Jupiter && chartNow.planets.Jupiter.sign && chartNow.planets.Jupiter.sign.idx != null)
      ? chartNow.planets.Jupiter.sign.idx : 0;

    /* ── 별자리 인덱스 매핑 ── */
    var sunIndex  = (chart.sun  && chart.sun.idx  != null) ? chart.sun.idx  : 0;
    var moonIndex = (chart.moon && chart.moon.idx != null) ? chart.moon.idx : 0;
    var ascIndex  = (chart.asc  && chart.asc.idx  != null) ? chart.asc.idx  : 0;
    var mcIndex   = (chart.mc   && chart.mc.idx   != null) ? chart.mc.idx   : 0;

    /* ── 텍스트 해석 (계산 기반 + 일부 기존 인터프리테이션 활용) ── */
    var descIndex = (ascIndex + 6) % 12;
    var h6Index   = (ascIndex + 5) % 12;
    var chartRulerByAsc = [
      '화성(Mars)', '금성(Venus)', '수성(Mercury)', '달(Moon)',
      '태양(Sun)', '수성(Mercury)', '금성(Venus)', '화성/명왕성(Mars/Pluto)',
      '목성(Jupiter)', '토성(Saturn)', '토성/천왕성(Saturn/Uranus)', '목성/해왕성(Jupiter/Neptune)'
    ];
    var chartRuler = chartRulerByAsc[ascIndex] || '미확인';

    /* ── Jupiter 트랜짓 메시지 (astrologer 배열 재사용) ── */
    var transitMsg = [
      "새 판 짜는 시즌이에요. 시작 버튼 누르면 속도 제대로 붙습니다. 🔥",
      "돈·안정·생활 퀄리티를 천천히 올리기 좋은 흐름이에요. 꾸준함이 승리합니다. 💸",
      "연락운과 아이디어 운이 살아나요. 말 한마디, 글 한 줄이 기회를 데려옵니다. 📱",
      "집·가족·마음 컨디션 정비에 별빛이 실려요. 내 편 공간을 먼저 챙겨보세요. 🏡",
      "무대 체질 ON. 나를 보여줄수록 반응이 오는 시기예요. ✨",
      "루틴 정리하면 성과가 터집니다. 작은 습관이 큰 차이를 만들어요. ✅",
      "관계운 상승 구간. 혼자보다 함께할 때 레벨업이 빠릅니다. 🤝",
      "깊은 감정 정리 + 재정 점검이 동시에 필요한 시기. 정면돌파가 약이 돼요. 🦂",
      "시야가 넓어지는 시즌. 여행·공부·도전에서 운의 문이 열립니다. 🌍",
      "커리어 집중 모드. 책임감이 곧 실적으로 바뀌는 타이밍이에요. 🏆",
      "사람과 프로젝트가 미래를 키워줘요. 커뮤니티에 답이 있습니다. 🧠",
      "잠깐 느리게 가도 좋아요. 내면 정리 후에 다음 점프가 더 크게 옵니다. 🌊"
    ];

    var sunArchetypeByIdx = [
      '개척형 주도성', '축적형 안정성', '연결형 지성', '보호형 정서성',
      '표현형 창조성', '개선형 분석성', '조율형 균형감', '심층형 통찰력',
      '확장형 비전성', '구조형 책임감', '혁신형 독립성', '공감형 직관성'
    ];
    var sunStrategyByIdx = [
      '빠른 시작 후 주간 점검으로 방향 오차를 줄이기',
      '중장기 누적 목표를 수치화해 꾸준히 축적하기',
      '정보 수집-정리-발신 루프를 짧게 유지하기',
      '정서 안전을 확보한 뒤 실행 강도를 올리기',
      '결과물을 공개 무대에 정기적으로 노출하기',
      '품질 기준을 단계화해 과부하 없이 개선하기',
      '의사결정 기한을 명시해 조율 지연을 줄이기',
      '핵심 과제를 좁혀 깊이 파고들기',
      '큰 그림을 분기 계획으로 쪼개 실행하기',
      '반복 가능한 성궁 진법과 표준 절차를 먼저 만들기',
      '기존 방식에 실험 슬롯을 넣어 혁신하기',
      '직관 신호를 기록하고 검증 루틴으로 연결하기'
    ];

    var sunSign  = chart.sun.sign;
    var moonSign = chart.moon.sign;
    var ascSign  = chart.asc.sign;
    var mcSign   = chart.mc.sign;
    var descSign = (chart.desc && chart.desc.sign) ? chart.desc.sign : astrologer.signs[descIndex];
    var h6Sign   = (chart.wholeSign && chart.wholeSign.h6 && chart.wholeSign.h6.sign) ? chart.wholeSign.h6.sign : astrologer.signs[h6Index];
    var saturnSign = chart.planets.Saturn ? chart.planets.Saturn.sign.sign : astrologer.signs[0];
    var venusSign  = chart.planets.Venus  ? chart.planets.Venus.sign.sign  : astrologer.signs[0];
    var marsSign   = chart.planets.Mars   ? chart.planets.Mars.sign.sign   : astrologer.signs[0];
    var mercurySign = chart.planets.Mercury ? chart.planets.Mercury.sign.sign : astrologer.signs[0];
    var jupiterSign = chart.planets.Jupiter ? chart.planets.Jupiter.sign.sign : astrologer.signs[0];
    var uranusSign  = chart.planets.Uranus  ? chart.planets.Uranus.sign.sign  : astrologer.signs[0];
    var neptuneSign = chart.planets.Neptune ? chart.planets.Neptune.sign.sign : astrologer.signs[0];
    var plutoSign   = chart.planets.Pluto   ? chart.planets.Pluto.sign.sign   : astrologer.signs[0];
    var fortunaSign = (chart.lots && chart.lots.fortuna) ? chart.lots.fortuna.sign : '-';
    var spiritSign  = (chart.lots && chart.lots.spirit)  ? chart.lots.spirit.sign  : '-';

    var sunDeg  = chart.sun.deg  != null ? ' <span style="color:#94a3b8;font-size:0.78rem">'+chart.sun.deg.toFixed(2)+'°</span>' : '';
    var moonDeg = chart.moon.deg != null ? ' <span style="color:#94a3b8;font-size:0.78rem">'+chart.moon.deg.toFixed(2)+'°</span>' : '';

    var vmAspect = '';
    var vi = chart.planets.Venus && chart.planets.Venus.sign ? chart.planets.Venus.sign.idx : 0;
    var mi2 = chart.planets.Mars && chart.planets.Mars.sign ? chart.planets.Mars.sign.idx : 0;
    if(vi===mi2) vmAspect = "<span class='aspect-hl'>[같은 리듬]</span> 마음 가는 포인트와 행동 타이밍이 잘 맞아, 빠르게 가까워지는 스타일이에요. 💞";
    else if((vi-mi2+12)%12===6) vmAspect = "<span class='aspect-hl'>[밀당 리듬]</span> 끌림은 강한데 방식이 달라요. 대화 템포만 맞추면 훨씬 편해집니다. ⚖️";
    var venusMarsSignGap = (vi - mi2 + 12) % 12;
    var vmFallbackByGap = {
      0:'금성-화성이 같은 사인에 있어 감정 표현과 행동이 같은 리듬으로 동기화됩니다.',
      2:'좋아하는 방식과 행동 타이밍이 부드럽게 이어져요. 데이트가 자연스럽게 흘러갑니다.',
      3:'서로 매력은 큰데 방식 차이도 커요. 룰을 먼저 정하면 다툼이 줄어요.',
      4:'표현과 행동이 안정적으로 맞물리는 편이라 오래 가는 관계에 유리해요.',
      6:'강한 끌림 + 강한 온도차 조합이에요. 잠깐 멈춤 대화가 관계를 지켜줍니다.'
    };
    var vmCalcFallback = vmFallbackByGap[venusMarsSignGap] || ('서로의 템포가 다른 날이에요. 급하게 결론 내기보다 한 박자 쉬어가면 훨씬 좋아요.');

    var masterInsight = '';

    
    /* ── 4원소 실시간 계산 ── */
    /* toSign() 반환 구조: { sign:"양자리(♈) 5° 23'", _baseSign:"양자리(♈)", idx:0, deg:5.3 }
       chart.sun/moon/asc/mc 는 toSign 객체 그 자체이므로 .idx 를 직접 사용 */
    var ELEM_BY_IDX = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];
    var elemCount = { fire:0, earth:0, air:0, water:0 };
    function _addElem(signObj){ if(signObj && signObj.idx != null) elemCount[ELEM_BY_IDX[signObj.idx]]++; }
    _addElem(chart.sun); _addElem(chart.moon); _addElem(chart.asc); _addElem(chart.mc);
    ['Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function(pn){
        if(chart.planets[pn]) _addElem(chart.planets[pn].sign);
    });
    var elemTotal = elemCount.fire+elemCount.earth+elemCount.air+elemCount.water || 1;
    var elemPct = {
        fire:  Math.round(elemCount.fire  /elemTotal*100),
        earth: Math.round(elemCount.earth /elemTotal*100),
        air:   Math.round(elemCount.air   /elemTotal*100),
        water: Math.round(elemCount.water /elemTotal*100)
    };
    var elemDominant = Object.keys(elemCount).reduce(function(a,b){ return elemCount[a]>=elemCount[b]?a:b; });
    var elemDomNames = { fire:'🔥 불(Fire)의 시대', earth:'🌿 흙(Earth)의 번영', air:'💨 공기(Air)의 지성', water:'💧 물(Water)의 감성' };
    var elemDomDesc  = {
        fire:  '창조, 열정, 직관이 넘치는 영혼. 행동이 먼저이고 생각은 나중.',
        earth: '물질적 현실 감각과 인내가 최강 무기. 꾸준함이 부를 쌓는다.',
        air:   '논리와 언어, 소통으로 세상을 이끄는 지식인 기질.',
        water: '감수성과 영성이 폭발하는 직관의 달인. 타인의 감정에 즉각 공명.'
    };
    var MODALITY_BY_IDX = ['cardinal','fixed','mutable','cardinal','fixed','mutable','cardinal','fixed','mutable','cardinal','fixed','mutable'];
    var modalityCount = { cardinal:0, fixed:0, mutable:0 };
    function _addModality(signObj){
      if(signObj && signObj.idx != null) modalityCount[MODALITY_BY_IDX[signObj.idx]]++;
    }
    _addModality(chart.sun); _addModality(chart.moon); _addModality(chart.asc); _addModality(chart.mc);
    ['Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function(pn){
      if(chart.planets[pn]) _addModality(chart.planets[pn].sign);
    });
    var modalityDominant = Object.keys(modalityCount).reduce(function(a,b){ return modalityCount[a] >= modalityCount[b] ? a : b; });
    var modalityNames = { cardinal:'활동궁(Cardinal)', fixed:'고정궁(Fixed)', mutable:'변통궁(Mutable)' };
    var modalityAdvice = {
      cardinal:'시작 능력이 강합니다. 2주 점검 루틴을 붙이면 중도 이탈을 줄일 수 있습니다.',
      fixed:'지속성과 내구성이 강합니다. 관성 과잉을 막기 위해 분기별 실험 1개를 고정하세요.',
      mutable:'적응성과 전환이 빠릅니다. 우선순위 3개 제한 규칙을 두면 산만함을 줄일 수 있습니다.'
    };

    /* ── 피르다리아 계산 (Chaldean order) ── */
    var FIRDARIA_DAY = [
        {planet:'☀ 태양(Sun)',    years:10, kr:'태양',  theme:'자아 확립·명예·창조력의 시대. 당신이 주인공이 될 무대가 펼쳐집니다.',
         detail:'태양 피르다리아는 당신 인생의 황금기 서막입니다. 이 10년은 자신의 이름을 세상에 각인시켜야 할 운명적 시간대입니다. 그동안 숨죽이고 있던 재능과 야망을 드디어 공개 무대에 올려야 합니다. 리더십과 창조력이 절정에 달하며, 최고 결정권자나 권위 있는 인물과의 만남이 잦아집니다. 지금 승진·독립 창업·대형 프로젝트 도전을 미루는 것은 우주의 흐름을 역행하는 것입니다.',
         career:'직장인이라면 지금이 승진·이동·대형 프로젝트 주도를 위해 손을 드는 시기입니다. 창업자라면 브랜드 공식화, 대외 홍보, 투자 유치 협상이 가장 유리한 국면입니다. 예술·엔터·정치·경영 리더 트랙에서 독보적 성과가 나옵니다.',
         love:'연애에서는 자신감 넘치는 태도로 먼저 적극적으로 어필해야 합니다. 대등한 파트너십보다 내가 빛나는 관계를 원하게 되므로, 상대방의 자존심을 배려하는 소통이 장기 연애의 핵심입니다.',
         caution:'지나친 자기중심적 독주로 팀원이나 파트너와 갈등을 일으킬 수 있습니다. 명예욕이 앞서 무리한 확장을 하면 소진 번아웃이 옵니다. 건강에서는 심장·혈압·눈을 정기 체크하십시오.',
         advice:'매년 생일 전후로 새로운 목표를 공개 선언하세요. 멘토 또는 선배와의 관계를 적극적으로 구축하고, 이름이 드러나는 공식 석상에 자주 참여하는 것이 운을 끌어당기는 비결입니다.'},
        {planet:'♀ 금성(Venus)',  years:8,  kr:'금성',  theme:'사랑·미적 성취·재물의 꽃이 활짝 피는 달콤한 시기.',
         detail:'금성 피르다리아는 인생에서 가장 풍요롭고 감미로운 8년입니다. 아름다움·사랑·예술·재물이 자석처럼 당신에게 끌려옵니다. 결혼·동거·진지한 연애가 이 기간에 가장 많이 시작되고, 미적 감각이 폭발하여 패션·음악·디자인에서 탁월한 안목이 열립니다. 인간관계에서 마찰이 줄고, 주변 사람들이 당신을 유독 매력적으로 느낍니다.',
         career:'예술·뷰티·패션·인테리어·부동산·금융·서비스 업종에서 빛납니다. 협업 프리젠테이션, 공동 창작, 파트너십 계약에 유리한 타이밍입니다. 자신의 심미안을 콘텐츠화하는 것(브랜드·유튜브·전시)이 수익으로 직결됩니다.',
         love:'평생 가장 달콤한 연애 또는 결혼 시기입니다. 외모와 매력이 최고점에 달하며, 원하는 사람에게 적극 다가가면 성사율이 높습니다. 단, 쾌락 추구가 과하면 불필요한 스캔들로 이어질 수 있습니다.',
         caution:'지출이 수입을 초과하는 사치, 연애에서의 우유부단함, 감성적 판단으로 인한 비즈니스 실수를 조심하십시오. 당이나 지방 위주의 음식으로 혈당·체중 수호가 느슨해질 수 있습니다.',
         advice:'지금 미뤄왔던 자기 계발(언어·예술·요리·음악)을 시작하세요. 주거 환경을 아름답게 정비하면 운이 따라옵니다. 좋아하는 사람에게 고백은 빠를수록 좋습니다.'},
        {planet:'☿ 수성(Mercury)',years:13, kr:'수성',  theme:'학습·커뮤니케이션·계약과 협상의 시대. 언어가 곧 권력.',
         detail:'수성 피르다리아는 13년이라는 긴 호흡의 지식·언어·네트워크의 시대입니다. 말 한마디, 글 한 줄이 운명을 바꾸는 시기입니다. 계약·협상·학습·자격증·이동이 폭발적으로 증가하며, 다양한 분야의 정보를 습득하고 이를 연결하는 능력이 강화됩니다. 쌍둥이자리·처녀자리 에너지가 전면에 부각됩니다.',
         career:'작가·강사·컨설턴트·영업·마케터·번역·IT 개발·미디어 분야에서 두각을 나타냅니다. 자격증과 기술을 쌓기 가장 좋은 시간입니다. 단기 프로젝트와 복수의 수입원 구조를 실험하기에 유리합니다.',
         love:'감정 표현보다 지적 대화가 풍부한 관계에서 설렘을 느낍니다. SNS·앱·친구 소개 등 디지털 채널을 통한 인연이 활발합니다. 단, 말이 많아지면 오해도 늘어나므로 신중한 언어 선택이 중요합니다.',
         caution:'산만함·집중력 분산·계약 실수가 잦습니다. 너무 많은 일을 동시에 벌여 완성도가 낮아질 위험이 있습니다. 자율신경·수면·호흡기를 돌보세요.',
         advice:'블로그·유튜브·책 출간 등 자신만의 지식 플랫폼을 이쪽 기간 중 반드시 구축하세요. 자격증 및 공인 시험 도전에 가장 유리한 타이밍입니다. 계약서는 반드시 꼼꼼히 검토하십시오.'},
        {planet:'☽ 달(Moon)',     years:9,  kr:'달',    theme:'내면의 감정을 정화하고 가정·모성·직관이 빛나는 시기.',
         detail:'달 피르다리아는 외부가 아닌 내면으로 시선을 돌리는 9년입니다. 감정·직관·가정·모성·무의식이 주인공이 되는 조용하지만 강력한 내적 성장의 시간입니다. 어머니·여성 인물과의 관계가 부각되고, 꿈과 직감이 비상하게 예리해집니다. 주거 이동·가족 관련 이슈·임신·출산이 이 기간에 집중됩니다.',
         career:'교육·상담·복지·요식업·인테리어·부동산·모성 관련 산업에서 운이 강합니다. 큰 도약보다는 탄탄한 내실을 쌓는 시기입니다. 직감을 경영 판단에 적극 활용하세요.',
         love:'감정적 유대와 안정감을 최우선시하게 됩니다. 오래된 인연이 재결합하거나, 깊이 있는 관계로 발전하는 시기입니다. 가족의 의견이 연애·결혼 결정에 큰 영향을 미칩니다.',
         caution:'감정 기복이 심해지고, 과거의 상처가 다시 올라옵니다. 타인의 감정에 지나치게 동화되어 에너지가 소진될 수 있습니다. 신경성 위장 장애와 수분 불균형을 주의하세요.',
         advice:'일기 쓰기·명상·요리·원예 등 감성 치유 루틴을 확립하세요. 가족과의 시간을 의도적으로 늘리면 심리적 안정과 함께 운이 열립니다. 심리 상담을 받는 것도 이 기간에 큰 효과를 발휘합니다.'},
        {planet:'♄ 토성(Saturn)', years:11, kr:'토성',  theme:'시련과 인내, 그 끝에 단단한 전문성이 완성되는 여정.',
         detail:'토성 피르다리아는 인생에서 가장 혹독하고 동시에 가장 단단해지는 11년입니다. 지름길은 없습니다. 책임·규율·인내·현실 직시라는 토성의 수업이 삶의 모든 영역에서 청구서를 들이밉니다. 그러나 이 시간을 성실하게 버텨낸 자만이 이후 목성 피르다리아의 폭발적 성장을 맞이할 수 있습니다. 대기만성형 성공의 씨앗이 뿌려지는 시기입니다.',
         career:'권위·자격·전문성을 확고히 하는 데 집중하세요. 빠른 성과보다 장기 포트폴리오 구축이 핵심입니다. 공무원·법조·건축·금융·의료 등 규율이 강한 분야에서 역량이 인정받습니다.',
         love:'진지하고 책임감 있는 사람에게 끌리게 됩니다. 가벼운 연애보다는 미래를 함께 그릴 수 있는 파트너를 원합니다. 결혼을 앞두거나, 기존 관계의 무게감이 증가합니다.',
         caution:'지나친 완벽주의·자기 비하·고독감이 번아웃으로 이어지기 쉽습니다. 무릎·척추·치아·피부 등 뼈와 피부 계통 건강에 유의하세요.',
         advice:'지금 어렵고 느리게 느껴지는 것이 정상입니다. 포기하지 마세요 — 지금 쌓는 전문성이 다음 10년의 거대한 자산이 됩니다. 멘토를 찾고, 장기 계획 수립에 집중하는 것이 가장 현명한 천기입니다.'},
        {planet:'♃ 목성(Jupiter)',years:12, kr:'목성',  theme:'확장·행운·성장의 정점. 씨앗이 거목으로 자라나는 시절.',
         detail:'목성 피르다리아는 인생 최고의 행운 기간입니다. 토성이 뿌린 씨앗이 드디어 거대한 결실로 돌아오는 12년입니다. 기회가 넘쳐나고, 문이 전방위적으로 열립니다. 해외·학문·출판·법률·종교·철학·대기업 진출 등 스케일의 확장이 일어납니다. 귀인을 가장 많이 만나는 시기이자, 타이밍 하나로 인생이 도약하는 황금기입니다.',
         career:'이 기간에 도전하지 않으면 후회합니다. 창업·해외 진출·투자·승진·출판·강연 등 모든 확장 행보에 우주가 뒤를 받쳐줍니다. 과감한 선택이 과감한 결실을 낳습니다.',
         love:'삶의 기준을 높여주는 격이 있는 이성과의 만남이 많아집니다. 해외 인연, 종교·학문적 배경이 다른 파트너와의 만남도 가능합니다. 결혼과 동반자 관계에서 큰 발전이 이루어지는 시기입니다.',
         caution:'지나친 낙관으로 무리한 도박·과소비·과장된 계획이 역풍을 부릅니다. 살이 찌기 쉬운 시기이므로 식이 조절이 필요합니다. 간과 허벅지 부위 건강에 유의하세요.',
         advice:'지금 하고 싶은 큰 그림 한 가지를 선택하여 전력투구하세요. 해외 연수·대학원·자격증·투자 포트폴리오를 이 시기에 구축하면 인생이 바뀝니다.'},
        {planet:'♂ 화성(Mars)',   years:7,  kr:'화성',  theme:'도전·경쟁·에너지 폭발. 멈추지 말고 전진할 것.',
         detail:'화성 피르다리아는 짧지만 강렬한 7년의 전투기입니다. 경쟁·도전·개척·돌파의 에너지가 폭발하며, 행동력이 극도로 상승합니다. 스스로 움직이지 않으면 아무 일도 일어나지 않는 시기입니다. 체력·투지·직접 행동이 성과를 만들어내며, 그림자 파동를 감수하는 과감한 결단이 요구됩니다.',
         career:'군경·운동·영업·부동산·창업·IT 개발 등 실행력이 핵심인 분야에서 성과가 터집니다. 선제적으로 먼저 손을 드는 사람이 기회를 독점합니다. 충돌이 있어도 물러서지 말고 실력으로 승부하세요.',
         love:'강렬하고 빠른 연애 전개가 특징입니다. 직접 어필하면 성사율이 높습니다. 단, 충동적 연애와 이별도 잦으므로 중요한 결정은 냉각기를 두고 신중히 하세요.',
         caution:'성급한 결정·분노 폭발·사고·수술 위험이 높은 시기입니다. 머리·얼굴·혈압·근육 부상에 주의하세요. 경쟁에 집착하다 동료관계를 망치지 않도록 조심하십시오.',
         advice:'아침 운동 루틴으로 공격적인 에너지를 건전하게 발산하세요. 이 기간은 빠르게 시작하되, 마무리를 꼼꼼히 지어야 합니다. 불필요한 싸움은 피하되, 정당한 승부에서는 절대 물러서지 마세요.'}
    ];
    var firdariaMain = null, firdariaMainYearsLeft = 0;
    var tempFirAge = now.getFullYear() - y;
    for(var fi=0; fi < FIRDARIA_DAY.length*5; fi++){
        var fIdx = fi % FIRDARIA_DAY.length;
        if(tempFirAge < FIRDARIA_DAY[fIdx].years){
            firdariaMain = FIRDARIA_DAY[fIdx];
            firdariaMainYearsLeft = FIRDARIA_DAY[fIdx].years - tempFirAge;
            break;
        }
        tempFirAge -= FIRDARIA_DAY[fIdx].years;
    }
    if(!firdariaMain) firdariaMain = FIRDARIA_DAY[0];
    var firdariaSubPlanet = FIRDARIA_DAY[Math.floor((firdariaMain.years-firdariaMainYearsLeft)/(firdariaMain.years/7))%7].kr;
    /* ── 피르다리아 서브 행성 상세 조합 해석 ── */
    var firdariaSubIdx = Math.floor((firdariaMain.years-firdariaMainYearsLeft)/(firdariaMain.years/7))%7;
    var FIRDARIA_COMBO = {
        '태양_금성':'창조적 자기 표현에 풍요가 더해집니다. 아름다운 방식으로 이름을 알릴 최상의 타이밍 — 예술·미디어·퍼블릭 브랜딩에 집중하세요.',
        '태양_수성':'지성을 앞세워 리더십을 발휘하는 국면입니다. 중요한 발표·협상·출판에서 빛납니다. 말과 글로 자신의 브랜드를 강화하세요.',
        '태양_달':'공적 성취와 사적 감정이 충돌하는 민감한 시간입니다. 가족·여성 인물과의 관계가 커리어에 영향을 미칩니다. 내면의 소리에 귀 기울이세요.',
        '태양_토성':'빛나고 싶지만 책임이 먼저 따라오는 시기입니다. 꾸준히 실력을 증명하면 권위 있는 자리가 따라옵니다. 지름길은 없으나 결과는 확실합니다.',
        '태양_목성':'황금기 중의 황금기! 행운과 자신감이 동시에 정점에 달합니다. 중요한 도약 결정을 지금 내리세요. 이 타이밍을 놓치지 마십시오.',
        '태양_화성':'강렬한 에너지로 목표를 향해 돌진하는 국면입니다. 리더십 분쟁이나 경쟁이 생길 수 있으나, 주도권을 단호하게 쥐면 승리합니다.',
        '금성_태양':'매력과 존재감이 절정에 달하는 황금 시간입니다. 중요한 인연, 결혼, 파트너십 계약이 이 서브 기간에 집중됩니다.',
        '금성_수성':'아이디어와 언어로 아름다움을 표현하는 시기입니다. 크리에이티브 라이팅, 광고 카피, 콘텐츠 창작이 두드러진 수익을 냅니다.',
        '금성_달':'감수성과 공감 능력이 최고조에 달합니다. 과거 이별의 상처가 치유되거나 오래된 인연이 돌아옵니다.',
        '금성_토성':'진지한 사랑과 안정적인 파트너십이 강조됩니다. 쾌락보다 책임감 있는 헌신이 금성 에너지를 성숙하게 이끕니다.',
        '금성_목성':'재물과 사랑 양쪽에서 행운이 폭발합니다. 투자·결혼·예술 활동 모두 이 타이밍에 가속 페달을 밟으세요.',
        '금성_화성':'관계에서 뜨거운 열정이 불타오릅니다. 충동적 연애 전개가 가능하니 감정과 이성을 균형 있게 유지하세요.',
        '수성_태양':'지식이 권위와 결합하는 국면입니다. 공식 석상에서의 연설, 출판, 자격 취득이 명성과 직결됩니다.',
        '수성_금성':'글과 말에 매력이 더해집니다. SNS·콘텐츠·디자인·마케팅에서 탁월한 성과를 냅니다.',
        '수성_달':'기억력·직관·감정이 결합하여 공감 글쓰기나 상담, 심리적 소통에서 빛납니다.',
        '수성_토성':'신중하고 정밀한 분석력이 강화됩니다. 법률·회계·천기 기획 분야에서 실력이 인정받는 시간입니다.',
        '수성_목성':'배움과 기회가 폭발합니다. 외국어 습득, 해외 비즈니스, 고급 자격증 도전에 가장 이상적인 타이밍입니다.',
        '수성_화성':'빠른 의사결정과 실행력이 시너지를 냅니다. 스타트업 초기 단계나 치열한 경쟁 설득 상황에서 두각을 보입니다.',
        '달_태양':'감성과 공적 자아가 교차합니다. 자신의 진짜 이야기를 대중과 공유하면 예상치 못한 반향을 얻습니다.',
        '달_금성':'여성성과 아름다움, 모성이 결합하는 깊은 치유의 시기입니다. 결혼·출산·예술 치료가 큰 빛을 발합니다.',
        '달_수성':'감성적 소통이 극대화됩니다. 블로그·수필·심리 상담·코칭에서 자신의 역량이 두드러집니다.',
        '달_토성':'감정의 무게가 무거워지는 고요한 내적 성찰의 시간입니다. 과거 상처와 마주하고 완전히 해방되는 기회로 삼으세요.',
        '달_목성':'직관과 행운이 결합합니다. 가족·부동산·모성 이슈에서 긍정적인 전환이 일어납니다.',
        '달_화성':'감정과 충동이 충돌하는 불안정한 시기입니다. 분노를 표현하는 건강한 루틴(운동·창작)이 반드시 필요합니다.',
        '토성_태양':'무거운 책임이 권위와 결합하는 혹독한 성장 시간입니다. 버티는 자가 결국 승자가 됩니다.',
        '토성_금성':'엄격한 현실이 사랑에도 침투합니다. 성숙하고 진지한 헌신이 없는 관계는 자연스럽게 정리됩니다.',
        '토성_수성':'꼼꼼하고 치밀한 분석이 빛을 발합니다. 법률 문서·계약·장기 플랜을 점검하기에 최적입니다.',
        '토성_달':'내면의 두려움과 정면으로 마주하는 시간입니다. 심리 치유와 자기 이해가 가장 깊어지는 국면입니다.',
        '토성_목성':'고난 끝에 봄이 옵니다. 이 서브 기간이 끝날 무렵, 오랫동안 준비한 것들이 현실화되기 시작합니다.',
        '토성_화성':'좌절과 분노가 동시에 끓어오를 수 있습니다. 에너지를 규율 있게 통제하는 것이 곧 이 시기의 수련입니다.',
        '목성_태양':'행운과 리더십이 결합, 인생 최고의 도약 타이밍입니다. 이 창문이 닫히기 전에 반드시 중요한 결정을 내리세요.',
        '목성_금성':'재물과 사랑, 아름다움이 동시에 풍요로워지는 복된 시기입니다. 결혼·투자·예술 모든 영역에서 길조가 이어집니다.',
        '목성_수성':'지식의 확장이 비즈니스 기회로 이어집니다. 계약·협상·출판·강연에서 놀라운 결과를 거둘 수 있습니다.',
        '목성_달':'내면의 풍요가 현실로 펼쳐집니다. 부동산·가족·여성 인물과 관계된 행운이 몰려옵니다.',
        '목성_토성':'현실적인 계획과 행운이 만나는 시간입니다. 무분별한 확장보다는 검증된 것에 집중 투자하면 큰 결실을 맺습니다.',
        '목성_화성':'과감하게 도전하되 방향을 잃지 마세요. 이 타이밍에 결단한 모험은 예상을 훌쩍 뛰어넘는 성과를 낳습니다.',
        '화성_태양':'에너지와 의지가 정점에 달합니다. 망설임은 금물, 선점하는 사람이 모든 것을 가져갑니다.',
        '화성_금성':'열정과 매력이 폭발합니다. 연애·예술 창작에서 즉각적인 성과가 납니다. 단, 감정적 충동을 조심하세요.',
        '화성_수성':'말과 행동이 날카로워집니다. 협상·설득·발표에서 압도적인 에너지를 발휘하는 시간입니다.',
        '화성_달':'감정의 화산이 폭발할 수 있습니다. 분노와 욕구를 창조적 활동이나 운동으로 승화시키는 출구 천기가 필수입니다.',
        '화성_토성':'전진하고 싶은 에너지가 현실의 벽에 부딪히는 고통스러운 국면입니다. 무리한 돌파보다 천기적 우회를 선택하세요.',
        '화성_목성':'황소처럼 돌진하고 독수리처럼 멀리 봐야 하는 시간입니다. 대담한 확장 천기가 예상치 못한 대박을 부릅니다.'
    };

    /* ── 연간 프로펙션 계산 ── */
    var HOUSE_KR = ['1하우스(자아·몸)','2하우스(재물·가치)','3하우스(소통·이동)',
                    '4하우스(가정·뿌리)','5하우스(창조·연애)','6하우스(건강·일상)',
                    '7하우스(관계·계약)','8하우스(변환·심연)','9하우스(철학·여행)',
                    '10하우스(사회·명예)','11하우스(공동체·미래)','12하우스(영성·은둔)'];
    var PROFECTION_RULER = ['화성','금성','수성','달','태양','수성','금성','화성','목성','토성','토성','목성'];
    var profHouseIdx = (now.getFullYear()-y) % 12;
    var profHouse    = HOUSE_KR[profHouseIdx];
    var profSign     = astrologer.signs[(ascIndex+profHouseIdx)%12];
    var profRuler    = PROFECTION_RULER[profHouseIdx];
    /* 프로펙션 상세 해석 데이터 */
    var profData = [
        {
            theme:'자아 이미지 리부트의 해. 새로운 나를 세상에 선언하라.',
            detail:'올해는 당신의 정체성과 신체적 이미지를 전면 재정의하는 해입니다. 지난 12년의 사이클이 완성되고 새로운 12년이 시작됩니다. 헤어스타일·패션·건강 루틴 등 외형적 변화가 내면의 리셋과 맞물립니다. "나는 누구인가"에 대한 질문이 깊어지며, 자신만의 고유한 방향성을 재선언하는 시간입니다.',
            career:'올해 지배 행성 화성이 행동 실행력을 끌어올립니다. 오래 망설이던 새 커리어 방향 전환, 포트폴리오 정비, 자기소개서 업데이트를 지금 당장 시작하세요. 새로운 직함이나 역할 제안이 들어올 수 있으며, 먼저 손을 들기만 해도 기회가 열립니다.',
            love:'새로운 나를 드러낸 자리에서 자연스러운 만남이 시작됩니다. 기존 관계라면 내가 변화했음을 파트너에게 표현하고 관계를 새롭게 정의해보세요. 자기 확신이 매력을 압도적으로 높이는 해입니다.',
            advice:'생일 전후로 공개적인 목표 선언(SNS·블로그 등)을 해보세요. 새 운동·식이 루틴으로 몸부터 변화시키면 심리·운 모두 따라옵니다.'
        },
        {
            theme:'돈과 자존감을 동시에 챙기는 해. 내 가치를 증명할 기회.',
            detail:'올해는 재정·자산·자기 가치 인식이 핵심 과제입니다. 수입원을 확대하거나 지출 구조를 개선해야 할 명확한 신호가 옵니다. 돈에 대한 자존감(내가 받아야 할 가치)이 현실 수입과 직결되는 해입니다. 가치 있는 것에 투자하고, 자신의 재능이나 기술에 적정한 금액을 청구하는 용기가 필요합니다.',
            career:'급여 협상, 프리랜서 단가 인상, 사이드 프로젝트 수익화를 적극 추진하세요. 지배 행성 금성이 예술·뷰티·고객 서비스 분야에서 수익 찬스를 줍니다. 내가 잘하는 것을 돈이 되는 형태로 패키징하는 것이 올해 최우선 과제입니다.',
            love:'상대방에게 지나치게 맞추거나 내 욕구를 억제하는 관계 패턴을 점검하세요. 내 가치를 알고 대우받는 관계만 유지하는 선택이 행복을 높입니다.',
            advice:'재정 계획표를 새로 작성하고, 불필요한 구독·지출을 정리하세요. 투자 공부를 시작하거나 적금을 하나 더 여는 것이 미래를 바꿉니다.'
        },
        {
            theme:'말과 글이 운명을 바꾸는 해. 네트워크를 적극적으로 넓혀라.',
            detail:'올해는 소통·학습·이동·형제자매·근거리 네트워크가 활성화됩니다. 중요한 계약, 이메일 한 통, 자격증 하나가 실제 운명을 바꾸는 해입니다. 디지털 플랫폼을 활용한 자기 표현이 두드러진 결과를 냅니다. 언어 공부, 글쓰기, 강의 수강에 투자한 것이 빠르게 회수됩니다.',
            career:'블로그·유튜브·팟캐스트·SNS 채널을 지금 시작하거나 강화하세요. 지배 행성 수성이 계약과 협상에서 이점을 줍니다. 자격증 시험, 단기 교육 과정 수료가 올해 안에 완성될 때 가장 큰 효력을 발휘합니다.',
            love:'소통 방식의 변화가 관계를 새롭게 합니다. 하고 싶은 말을 솔직하게 전하면 관계가 깊어집니다. 이동이나 모임 자리에서 새 인연이 생길 가능성이 높습니다.',
            advice:'읽지 않던 책을 한 달에 한 권씩 읽거나, 관심 있었던 강의를 지금 등록하세요. 주변 사람들에게 먼저 연락을 취하는 것이 행운을 부릅니다.'
        },
        {
            theme:'가족과 심리적 기반이 핵심 과제. 내면의 안전지대를 구축하라.',
            detail:'올해는 가정·주거·부모·뿌리(고향)와 관련된 이슈가 표면으로 부상합니다. 이사·리모델링·가족 돌봄·부동산 관련 결정이 집중됩니다. 심리적 기반이 흔들리거나 재정비되는 해이며, 내면 치유와 감정의 뿌리를 돌보는 것이 외부 성공보다 우선됩니다.',
            career:'재택근무·홈오피스 구축·가족 사업 참여 등 집과 연관된 커리어 변화가 유리합니다. 지배 행성 달이 직관적 판단력을 높여주므로 감(感)을 믿는 결정이 맞습니다. 큰 사회적 도약보다는 내실을 다지는 해입니다.',
            love:'가족의 개입이 연애·결혼에 영향을 미칩니다. 파트너를 가족에게 소개하거나, 동거·결혼을 결정하는 해가 될 수 있습니다. 과거 가족과의 갈등이 있다면 올해 화해의 실마리가 생깁니다.',
            advice:'집 안을 정리정돈하고 편안한 공간으로 꾸미세요. 심리 상담이나 일기 쓰기를 통해 내면의 소리를 듣는 시간을 가지세요.'
        },
        {
            theme:'사랑·창작·자녀에게 행운이 집중되는 해. 즐거움을 추구하라.',
            detail:'올해는 창조적 자기 표현, 연애, 자녀(또는 창작 결과물)에 황금빛 에너지가 쏟아집니다. 진지한 연애, 임신·출산, 예술 프로젝트 완성, 스포츠/취미의 본격화가 이루어지는 해입니다. 삶의 즐거움을 적극적으로 추구하는 것 자체가 운을 끌어당기는 방법입니다.',
            career:'지배 행성 태양이 창조적 리더십에 힘을 실어줍니다. 공연·전시·콘테스트·경기 등 자신을 드러내는 무대에 적극적으로 뛰어드세요. 무언가 만들고 세상에 내놓는 것이 올해 최고의 천기입니다.',
            love:'연애 시작에 가장 좋은 해입니다. 설레는 감정을 억누르지 말고 표현하세요. 이미 연인이 있다면 여행·이벤트 등 로맨틱한 추억 만들기가 관계를 깊게 합니다.',
            advice:'오래 미뤄왔던 창작 활동이나 취미를 지금 시작하세요. 아이·학생을 가르치는 봉사나 멘토링 활동이 의외의 운을 가져다줍니다.'
        },
        {
            theme:'건강 수호와 직업적 루틴이 미래를 좌우하는 해.',
            detail:'올해는 일상 루틴·건강·식이·직장 환경·서비스 제공 방식이 핵심 화두입니다. 작은 습관 하나가 1년 뒤 큰 차이를 만드는 해입니다. 몸에 보내는 신호를 무시하지 말고, 만성 불편함·피로감·소화 문제에 정면으로 대응하세요. 직장에서는 업무 효율성과 디테일이 평가 기준이 됩니다.',
            career:'지배 행성 수성이 분석력·데이터 처리·세밀한 기획에 힘을 줍니다. 업무 의식 흐름 개선, 자동화 툴 도입, CRM 정비 등 효율을 높이는 것이 성과로 이어집니다. 아르바이트·파트타임·부업으로 수입원을 다양화하기에도 좋은 해입니다.',
            love:'연인 관계에서 일상의 디테일(청결·건강·작은 배려)이 감동을 만들어냅니다. 같이 운동하거나 식단을 수호하는 루틴이 관계를 단단하게 합니다.',
            advice:'연 1회 건강 검진을 올해 안에 받으세요. 수면·식이 루틴을 정비하면 에너지가 눈에 띄게 달라집니다. 주변 환경(책상·작업 공간)을 정리하는 것도 중요합니다.'
        },
        {
            theme:'중요한 파트너십·계약·결혼 이슈가 수면 위로 떠오른다.',
            detail:'올해는 1:1 관계(배우자·비즈니스 파트너·강력한 라이벌)가 삶의 주축으로 부상합니다. 결혼·이혼·동업 계약·중요한 협약이 이루어지거나 종결되는 해입니다. 진정한 의미에서의 파트너십을 실험하고 재정의하는 시간으로, 홀로 독주하던 패턴을 "함께"로 전환하는 용기가 요구됩니다.',
            career:'지배 행성 화성이 협상력과 결단력을 강화합니다. 합작·제휴·조인트 벤처 등 파트너십 기반 프로젝트가 유리합니다. 계약서 검토는 반드시 전문가와 함께 하세요.',
            love:'결혼·정식 커플 선언이 이 해에 많이 이루어집니다. 장기 연애라면 관계를 공식화하거나 미래를 구체적으로 논의해야 할 시점입니다. 기존 관계에서 적폐(불균형)가 드러나기도 합니다.',
            advice:'지금 만나고 있는 파트너(연인·동업자)와의 관계를 솔직하게 재평가하세요. 오래 방치한 법적·계약 서류가 있다면 올해 안에 정리하십시오.'
        },
        {
            theme:'심리적 변환과 유산·투자·은밀한 관계가 주 무대.',
            detail:'올해는 눈에 보이지 않는 큰 변화가 물밑에서 진행됩니다. 유산·공동 재산·조세·보험·투자·대출 같은 타인의 자원 이슈가 부각되며, 심리적으로는 깊은 내면의 두려움·집착·통제 욕구와 마주하는 해입니다. 죽음·재생·위기·변환의 에너지가 맴돌지만, 이 과정을 거쳐야만 진정한 탈바꿈이 시작됩니다.',
            career:'지배 행성 화성이 비공개 천기 실행에 힘을 줍니다. 비밀 프로젝트, 은밀한 준비, 수면 아래에서의 투자가 이후 큰 결실로 드러납니다. 부채 정리·세금 수호·재무 구조 개선을 올해 안에 단행하세요.',
            love:'관계에서 감추어진 심리적 패턴(집착·통제·두려움)이 표면화됩니다. 이를 함께 다루면 관계가 한층 성숙해집니다. 섹슈얼리티와 친밀감의 깊이를 재탐색하는 시간이기도 합니다.',
            advice:'오래 묵혀온 심리적 상처나 두려움을 전문가의 도움으로 정면 돌파하세요. 재정 상태 점검(보험·예금·투자)을 이 해에 반드시 수행하십시오.'
        },
        {
            theme:'해외·학업·종교가 새로운 지평을 열어주는 자유의 해.',
            detail:'올해는 기존의 세계관과 경계를 넘어 더 넓은 지평으로 확장되는 자유의 해입니다. 해외여행·유학·이민·고등 교육·철학·종교·출판이 핵심 키워드입니다. 당신의 믿음 체계와 인생의 의미를 재정립하는 해로, 낯선 것과 만남이 가장 큰 운을 불러옵니다.',
            career:'지배 행성 목성이 모든 확장 영역에 날개를 달아줍니다. 해외 비즈니스, 외국어 습득, 학위 과정, 글로벌 플랫폼 진출에 가장 유리한 타이밍입니다. 출판·강연·컨설팅이 예상 이상의 성과를 냅니다.',
            love:'다른 문화·종교·배경을 가진 사람과의 인연이 生깁니다. 기존 파트너와 함께 해외여행이나 학습 경험을 공유하면 관계가 크게 성장합니다.',
            advice:'1년 안에 반드시 한 번은 낯선 공간(국외 여행 또는 처음 가는 지역)에 다녀오세요. 글쓰기·강의·팟캐스트 등 나의 이야기를 세상에 전달하는 작업을 시작하는 것이 운을 엽니다.'
        },
        {
            theme:'커리어의 정점을 향해 달리는 성과의 해. 사회적 타이틀 획득 집중.',
            detail:'올해는 사회적 명성·커리어·공적 성취가 최전면에 나서는 해입니다. 10년 중 가장 주목받는 시간으로, 지금껏 쌓아온 모든 것이 대외적으로 인정받을 기회가 열립니다. 상사나 권위자의 눈에 띄고, 공식적인 타이틀과 지위가 업그레이드됩니다.',
            career:'지배 행성 토성이 확고한 실력 증명을 요구하지만, 그만큼 결과도 견고합니다. 이력서 정비·포트폴리오 공개·인사 면담 요청·업계 행사 참가를 적극적으로 추진하세요. 지금이 커리어 픽을 찍을 타이밍입니다.',
            love:'사회적 지위나 공적 성공을 공유할 수 있는 파트너를 원하게 됩니다. 연인에게 나의 목표와 꿈을 솔직히 공유하고, 그것을 지지하는 관계인지 확인하는 해입니다.',
            advice:'명함을 새로 만들고, 링크드인·전문 SNS 프로필을 최신화하세요. 업계에서 알려지는 것, 행사에서 발표하는 것 하나하나가 운을 열어줍니다.'
        },
        {
            theme:'공동체와 비전, 우정이 인생을 확장시키는 연대의 해.',
            detail:'올해는 인맥·공동체·소셜 네트워크·미래 비전·사회적 이상이 중심 주제로 등장합니다. 오래된 친구와 재결합하거나, 가치관이 같은 새로운 그룹과 합류하는 기회가 옵니다. 혼자보다 함께일 때 더 큰 꿈이 실현됩니다.',
            career:'지배 행성 토성이 지속 가능한 네트워크 구축을 강조합니다. 협회 가입·스터디 모임·커뮤니티 리더 역할이 예상치 못한 기회를 연결해줍니다. 사회적 대의(CSR·사회 운동)와 연결된 프로젝트에서 브랜드 가치가 높아집니다.',
            love:'공통의 가치관·이념·활동을 통해 새로운 인연이 시작됩니다. 소개팅보다 함께하는 무언가(모임·봉사·프로젝트)에서 만나는 인연이 더 깊습니다.',
            advice:'지금 속해 있는 모임이나 커뮤니티에서 더 적극적으로 기여하세요. 새로운 동호회·독서모임·직능 단체 가입이 올해 인생을 확장시키는 열쇠입니다.'
        },
        {
            theme:'내면 정화·영성·은둔이 다음 큰 사이클을 준비시키는 해.',
            detail:'올해는 12년 사이클의 마지막 해로, 내면 정화와 영적 준비의 시간입니다. 숨겨진 적·자기 자신의 무의식·과거 업보가 표면화됩니다. 외부의 화려함보다 고요한 자기 성찰과 디톡스가 진짜 운을 준비시킵니다. 잃어버린 것이 있어도 낙담하지 마세요 — 12하우스는 필요 없는 것들을 버리게 하는 자연스러운 정화 과정입니다.',
            career:'지배 행성 목성이 보이지 않는 곳에서 다음 기회를 준비시켜줍니다. 큰 전면적 도약보다는 실력을 은밀히 쌓고, 내년을 위한 씨앗을 심는 해입니다. 병원·복지기관·종교단체·연구 기관과 연결된 일이 이 기간에 어울립니다.',
            love:'연인과의 관계에서 서로 알아왔던 패턴의 민낯이 드러나는 해입니다. 이를 함께 넘기면 관계가 깊어지고, 그렇지 못하면 자연스럽게 정리됩니다.',
            advice:'올 한 해 반드시 정기적인 혼자만의 묵상·산책·명상 시간을 가지세요. 오래 끌어온 집착과 묵은 감정을 내려놓는 의식(편지 쓰기·일기·여행)을 해보세요. 다음 해의 새로운 출발을 위한 공간을 지금 마련하는 것이 최선의 천기입니다.'
        }
    ];
    var curProfData = profData[profHouseIdx];
    var dbg = chart.debug || {};

    function _pad2(n){ return String(n).padStart(2,'0'); }
    function _formatUtcFromLocal(yy,mm,dd,hh,mi,tzv){
      var utcMs = Date.UTC(yy, mm-1, dd, hh, mi, 0) - (tzv * 3600000);
      var dt = new Date(utcMs);
      return dt.getUTCFullYear() + '-' + _pad2(dt.getUTCMonth()+1) + '-' + _pad2(dt.getUTCDate())
        + ' ' + _pad2(dt.getUTCHours()) + ':' + _pad2(dt.getUTCMinutes()) + ':' + _pad2(dt.getUTCSeconds());
    }
    function _formatMinSec(v){
      var sign = v < 0 ? '-' : '+';
      var av = Math.abs(v);
      var m2 = Math.floor(av);
      var s2 = Math.round((av - m2) * 60);
      if(s2 === 60){ m2 += 1; s2 = 0; }
      return sign + m2 + 'm ' + _pad2(s2) + 's';
    }

    function _formatYmdHm(yy,mm,dd,hourFloat){
      if(yy == null || mm == null || dd == null || hourFloat == null || !isFinite(hourFloat)) return '-';
      var hh = Math.floor(hourFloat);
      var mm2 = Math.round((hourFloat - hh) * 60);
      if(mm2 === 60){ hh += 1; mm2 = 0; }
      if(hh >= 24){ hh -= 24; }
      return yy + '-' + _pad2(mm) + '-' + _pad2(dd) + ' ' + _pad2(hh) + ':' + _pad2(mm2);
    }

    var utcCivilText = (dbg.utcCivilDateY != null)
      ? _formatYmdHm(dbg.utcCivilDateY, dbg.utcCivilDateM, dbg.utcCivilDateD, dbg.utcCivilHour)
      : _formatUtcFromLocal(y, m, d, h, min, tz);
    var utcLmtText = (dbg.utcLmtDateY != null)
      ? _formatYmdHm(dbg.utcLmtDateY, dbg.utcLmtDateM, dbg.utcLmtDateD, dbg.utcLmtHour)
      : '-';
    var lonCorrMin = (dbg.longitudeCorrectionMin != null) ? dbg.longitudeCorrectionMin : ((lon - (tz*15))*4);
    var ascDegText = (chart.asc && chart.asc.deg != null) ? chart.asc.deg.toFixed(2) + '°' : '-';
    var ws = chart.wholeSign || {};

    function _norm360(v){ var n = v % 360; return n < 0 ? n + 360 : n; }
    function _lonFromSignObj(signObj){
      if(!signObj || signObj.idx == null || signObj.deg == null) return null;
      return _norm360(signObj.idx * 30 + signObj.deg);
    }
    function _fmtLon(v){
      if(v == null || !isFinite(v)) return '-';
      var d0 = _norm360(v);
      var sIdx = Math.floor(d0 / 30) % 12;
      var inSign = d0 - sIdx * 30;
      var deg0 = Math.floor(inSign);
      var min0 = Math.round((inSign - deg0) * 60);
      if(min0 === 60){ deg0 += 1; min0 = 0; }
      return astrologer.signs[sIdx] + ' ' + String(deg0).padStart(2,'0') + '°' + String(min0).padStart(2,'0') + "'";
    }
    function _buildCuspsLon(c){
      var arr = [];
      for(var i=1;i<=12;i++){
        var s = c['h'+i];
        arr.push(_lonFromSignObj(s));
      }
      return arr;
    }
    function _houseOfLon(lon, cusps){
      if(lon == null || !cusps || cusps.length !== 12 || cusps.some(function(v){ return v == null; })) return null;
      var L = _norm360(lon);
      for(var i=0;i<12;i++){
        var start = cusps[i];
        var end = cusps[(i+1)%12];
        var inArc = (start <= end) ? (L >= start && L < end) : (L >= start || L < end);
        if(inArc) return i + 1;
      }
      return null;
    }
    function _wholeSignHouse(signIdx, ascIdx){
      if(signIdx == null || ascIdx == null) return null;
      return ((signIdx - ascIdx + 12) % 12) + 1;
    }
    function _angDiff(a,b){
      var d0 = Math.abs(_norm360(a) - _norm360(b));
      return d0 > 180 ? 360 - d0 : d0;
    }
    function _aspectName(diff){
      var defs = [
        {d:0, n:'딱 맞는 각(합)', orb:6},
        {d:60, n:'도움 각(육합)', orb:4},
        {d:90, n:'긴장 각(직각)', orb:5},
        {d:120, n:'편한 각(삼합)', orb:5},
        {d:180, n:'마주보는 각(충)', orb:6}
      ];
      for(var i=0;i<defs.length;i++){
        var dv = Math.abs(diff - defs[i].d);
        if(dv <= defs[i].orb) return { name: defs[i].n, orb: dv };
      }
      return null;
    }

    var cuspsLon = _buildCuspsLon(chart.houses || {});
    var planetDisplayOrder = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    var planetKr = {
      Sun:'태양', Moon:'달', Mercury:'수성', Venus:'금성', Mars:'화성',
      Jupiter:'목성', Saturn:'토성', Uranus:'천왕성', Neptune:'해왕성', Pluto:'명왕성'
    };
    var placementRows = [];
    planetDisplayOrder.forEach(function(pn){
      var sObj = (pn === 'Sun') ? chart.sun : (pn === 'Moon' ? chart.moon : (chart.planets[pn] && chart.planets[pn].sign));
      if(!sObj || sObj.idx == null) return;
      var lon = _lonFromSignObj(sObj);
      var hPlacidus = _houseOfLon(lon, cuspsLon);
      var hWhole = _wholeSignHouse(sObj.idx, ascIndex);
      var retro = (pn !== 'Sun' && pn !== 'Moon' && chart.planets[pn] && chart.planets[pn].retro) ? ' Rx' : '';
      placementRows.push(
        '<tr>'
        +'<td class="astro-col-planet" style="color:#cbd5e1;">'+planetKr[pn]+'</td>'
        +'<td class="astro-col-longitude" style="color:#e2e8f0;">'+_fmtLon(lon)+retro+'</td>'
        +'<td class="astro-col-placidus" style="color:#bae6fd;">'+(hPlacidus ? (hPlacidus+'H') : '-')+'</td>'
        +'<td class="astro-col-whole" style="color:#bbf7d0;">'+(hWhole ? (hWhole+'H') : '-')+'</td>'
        +'</tr>'
      );
    });

    var majorAspectRows = [];
    var coreForAspect = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
    for(var ai=0; ai<coreForAspect.length; ai++){
      for(var bi=ai+1; bi<coreForAspect.length; bi++){
        var pa = coreForAspect[ai], pb = coreForAspect[bi];
        var sa = (pa === 'Sun') ? chart.sun : (pa === 'Moon' ? chart.moon : (chart.planets[pa] && chart.planets[pa].sign));
        var sb = (pb === 'Sun') ? chart.sun : (pb === 'Moon' ? chart.moon : (chart.planets[pb] && chart.planets[pb].sign));
        var la = _lonFromSignObj(sa), lb = _lonFromSignObj(sb);
        if(la == null || lb == null) continue;
        var diff = _angDiff(la, lb);
        var asp = _aspectName(diff);
        if(!asp) continue;
        majorAspectRows.push({
          text: planetKr[pa] + ' - ' + planetKr[pb] + ' : ' + asp.name + ' (orb ' + asp.orb.toFixed(2) + '°)',
          orb: asp.orb
        });
      }
    }
    majorAspectRows.sort(function(a,b){ return a.orb - b.orb; });
    var majorAspectHtml = majorAspectRows.slice(0,6).map(function(r){
      return '<li style="margin-bottom:4px;">'+r.text+'</li>';
    }).join('') || '<li>지금은 강하게 붙는 각이 적어서, 큰 흔들림 없이 잔잔한 흐름입니다.</li>';

    var elemWeakest = Object.keys(elemCount).reduce(function(a,b){ return elemCount[a] <= elemCount[b] ? a : b; });
    var elemShortNames = { fire:'불', earth:'흙', air:'공기', water:'물' };
    var retroPlanets = ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].filter(function(pn){
      return chart.planets[pn] && chart.planets[pn].retro;
    }).map(function(pn){ return planetKr[pn]; });

    function _planetSignObjByName(pn){
      return (pn === 'Sun') ? chart.sun : (pn === 'Moon' ? chart.moon : (chart.planets[pn] && chart.planets[pn].sign));
    }
    function _housePairText(signObj){
      if(!signObj || signObj.idx == null) return '-';
      var pLon = _lonFromSignObj(signObj);
      var ph = _houseOfLon(pLon, cuspsLon);
      var wh = _wholeSignHouse(signObj.idx, ascIndex);
      return (ph ? (ph+'H') : '-') + ' / ' + (wh ? (wh+'H') : '-');
    }

    var sunHousePair = _housePairText(chart.sun);
    var moonHousePair = _housePairText(chart.moon);
    var mercuryHousePair = _housePairText(_planetSignObjByName('Mercury'));
    var venusHousePair = _housePairText(_planetSignObjByName('Venus'));
    var marsHousePair = _housePairText(_planetSignObjByName('Mars'));
    var jupiterHousePair = _housePairText(_planetSignObjByName('Jupiter'));
    var saturnHousePair = _housePairText(_planetSignObjByName('Saturn'));
    var uranusHousePair = _housePairText(_planetSignObjByName('Uranus'));
    var neptuneHousePair = _housePairText(_planetSignObjByName('Neptune'));
    var plutoHousePair = _housePairText(_planetSignObjByName('Pluto'));
    var fortunaHousePair = _housePairText(chart.lots && chart.lots.fortuna ? chart.lots.fortuna : null);
    var spiritHousePair = _housePairText(chart.lots && chart.lots.spirit ? chart.lots.spirit : null);

    masterInsight = '<div class="astro-section precision-insight-card astro-neon-accent astro-neon-accent-gold" style="margin-bottom:20px;">'
      +'<div class="astro-subhead" style="color:#D4AF37;">✨ 내 별자리 3줄 핵심 요약 (한눈에 쏙)</div>'
      +'<div class="astro-desc" style="font-size:0.95rem;white-space:normal;word-break:break-word;overflow-wrap:anywhere;max-width:100%;box-sizing:border-box;">'
      +'<p><b class="precision-headline">🌞 나는 어떤 사람인가?</b><br>'
      +'태양 <b>'+sunSign+'</b>은 "내 기본 성격", 달 <b>'+moonSign+'</b>은 "감정 버튼", 상승궁 <b>'+ascSign+'</b>은 "첫인상 캐릭터"입니다. '
      +'이 세 가지가 합쳐져 당신만의 분위기를 만듭니다.</p>'
      +'<p><b class="precision-headline">💕 사랑할 때는?</b><br>'
      +'금성 <b>'+venusSign+'</b>('+venusHousePair+')은 좋아하는 사람에게 보이는 매력 포인트, 화성 <b>'+marsSign+'</b>('+marsHousePair+')은 끌림이 생겼을 때 행동하는 방식입니다. '
      +(vmAspect || vmCalcFallback)+'</p>'
      +'<p><b class="precision-headline">🏆 커리어와 돈은?</b><br>'
      +'천정(MC) <b>'+mcSign+'</b>은 "어떤 이미지로 인정받는지", 토성 <b>'+saturnSign+'</b>('+saturnHousePair+')은 "시간 들여 레벨업할 구간"입니다. '
      +'행운 포인트(포르투나) <b>'+fortunaSign+'</b>('+fortunaHousePair+')은 성과가 붙는 자리, 소명(스피릿) <b>'+spiritSign+'</b>('+spiritHousePair+')은 오래 해도 지치지 않는 자리예요.</p>'
      +'</div></div>';

    var tightAspectText = majorAspectRows.length ? majorAspectRows[0].text : '타이트 주요각 없음';
    var retroText = retroPlanets.length ? retroPlanets.join(', ') : '역행 주요 행성 없음';
    var imbalanceText = '지금 내 기본 무드는 '+elemDomNames[elemDominant]+' ('+elemPct[elemDominant]+'%)이고, 보완이 필요한 쪽은 '+elemShortNames[elemWeakest]+' ('+elemPct[elemWeakest]+'%)이에요.';
    var precisionComment = '오늘 가장 눈에 띄는 별의 각은 "'+tightAspectText+'"이고, 점검이 필요한 행성 흐름은 '+retroText+'입니다.';
    var complementElementByDominant = { fire:'물/흙', earth:'불/공기', air:'흙/물', water:'불/공기' };
    var relationComplementElement = complementElementByDominant[elemDominant] || '보완 원소';

    var houseFocusCount = {};
    planetDisplayOrder.forEach(function(pn){
      var sObj = _planetSignObjByName(pn);
      if(!sObj || sObj.idx == null) return;
      var focusHouse = null;
      focusHouse = _wholeSignHouse(sObj.idx, ascIndex);
      if(!focusHouse) return;
      houseFocusCount[focusHouse] = (houseFocusCount[focusHouse] || 0) + 1;
    });
    var sortedHouseFocus = Object.keys(houseFocusCount)
      .map(function(k){ return { house:Number(k), count:houseFocusCount[k] }; })
      .sort(function(a,b){ return b.count - a.count; });
    var topFocusHouse = sortedHouseFocus.length ? sortedHouseFocus[0].house : null;
    var topFocusCount = sortedHouseFocus.length ? sortedHouseFocus[0].count : 0;
    var focusHouseText = topFocusHouse ? (topFocusHouse+'하우스에 행성 '+topFocusCount+'개 집중') : '에너지가 여러 영역에 고르게 퍼진 타입';
    var axisGap = (sunIndex - moonIndex + 12) % 12;
    var axisGapDesc = (axisGap === 0) ? '의식-정서 일치형' : (axisGap === 6 ? '의식-정서 대칭형(긴장/보완)' : '의식-정서 혼합형');
    var relationAxisText = '지금 관계 키워드는 "내 페이스 지키기"와 "상대 템포 존중하기"의 밸런스예요. 한쪽으로만 몰아붙이면 감정 체력이 먼저 소모됩니다.';
    var transitExecutionText = '지금 목성 흐름은 '+jupiterHousePair+' 영역에서 특히 체감이 커요. 이 주제에 에너지를 주면 성과가 빨리 붙습니다.';
    var houseTopicMap = {
      1:'자기정체성/신체/개인 브랜딩', 2:'재정/자원/가치체계', 3:'학습/콘텐츠/소통',
      4:'가정/거주/심리기반', 5:'창작/연애/자녀', 6:'업무루틴/건강/실무',
      7:'관계/계약/파트너십', 8:'공동재정/변환/심층심리', 9:'학문/여행/세계관 확장',
      10:'커리어/명성/공적성과', 11:'네트워크/커뮤니티/장기비전', 12:'회복/정리/무의식'
    };
    var topHouseTopic = topFocusHouse ? (houseTopicMap[topFocusHouse] || '복합 주제') : '분산 운행';
    var retroFocusText = retroPlanets.length
      ? ('지금은 '+retroPlanets.join(', ')+' 이(가) "다시 보기 모드"예요. 서두르기보다 점검 후 실행이 유리합니다.')
      : '지금은 뒤돌아볼 변수보다 앞으로 밀어붙일 흐름이 더 강합니다.';
    var firdariaPrecisionNote = '메인 타임로드 '+firdariaMain.kr+'은 차트 집중축('+focusHouseText+')과 결합될 때 체감 효과가 커집니다. 현재 우세 양식은 '+modalityNames[modalityDominant]+'이므로 실행 템포를 이 양식에 맞추는 것이 효율적입니다.';
    var profectionPrecisionNote = '프로펙션 '+profHouse+'의 실제 실행 테마는 '+topHouseTopic+'와 강하게 연결됩니다. 올해는 '+focusHouseText+'를 영험 지표처럼 수호할수록 성과 재현성이 높아집니다.';
    var firdariaPairByKr = {
      '태양': sunHousePair,
      '달': moonHousePair,
      '수성': mercuryHousePair,
      '금성': venusHousePair,
      '화성': marsHousePair,
      '목성': jupiterHousePair,
      '토성': saturnHousePair
    };
    function _primaryHouseFromPair(pairText){
      if(!pairText) return null;
      var m = String(pairText).match(/(\d+)H/);
      return m ? Number(m[1]) : null;
    }
    var firdariaMainPair = firdariaPairByKr[firdariaMain.kr] || '-';
    var firdariaMainHouse = _primaryHouseFromPair(firdariaMainPair);
    var firdariaMainTopic = firdariaMainHouse ? (houseTopicMap[firdariaMainHouse] || '복합 주제') : topHouseTopic;
    var firdariaDynamic = {
      theme: firdariaMain.kr+' 메인 타임로드는 '+firdariaMainPair+' 축에서 작동하며, 현재 핵심 의제는 '+firdariaMainTopic+'입니다.',
      detail: '지금 메인 운행 행성의 무대('+firdariaMainPair+')와 내 집중 무대('+focusHouseText+')가 겹치면, 체감되는 일이 더 또렷하게 들어옵니다. '+precisionComment,
      career: '커리어는 '+firdariaMainTopic+'과 MC '+mcSign+'를 연결해 실행하는 방식이 유리합니다. 90일 단위로 목표를 쪼개고 '+modalityAdvice[modalityDominant],
      love: '관계는 달 '+moonHousePair+' 안정축과 금성/화성 '+venusHousePair+' · '+marsHousePair+' 조율이 핵심입니다. '+(vmAspect || vmCalcFallback),
      caution: retroFocusText+' 특히 '+firdariaMain.kr+' 타임로드 기간에는 '+firdariaMainTopic+' 영역에서 과속 결정을 피하는 것이 안전합니다.',
      advice: '실행 포인트는 '+firdariaMainTopic+' 1개, 루틴 1개, 검증 지표 1개를 고정하는 것입니다. '+firdariaPrecisionNote
    };
    var profectionDynamic = {
      theme: '올해 프로펙션은 '+profHouse+' 중심으로 전개되며, 실전 테마는 '+topHouseTopic+'와 결합됩니다.',
      detail: '지배 별자리 '+profSign+'과 지배 행성 '+profRuler+'이 올해 의사결정의 기준점입니다. '+profectionPrecisionNote,
      career: '업무/재정은 '+profHouse+' 주제와 MC '+mcSign+'를 연결한 영험 지표 설계가 효율적입니다. '+focusHouseText+'를 실행 우선순위 상단에 두세요.',
      love: '관계는 Desc '+descSign+' 축과 달 '+moonHousePair+' 안정축을 먼저 맞춘 뒤, 금성/화성 '+venusHousePair+' · '+marsHousePair+' 리듬을 조율할 때 지속성이 높아집니다.',
      advice: '연간 운행은 분기 4회 점검이 적합합니다. 매 분기마다 '+profHouse+' 관련 산출물 1개를 고정하고, '+modalityNames[modalityDominant]+' 템포로 실행하세요.'
    };
    var sunArchetype = sunArchetypeByIdx[sunIndex] || '복합형 자아 전개';
    var sunStrategy = sunStrategyByIdx[sunIndex] || '핵심 우선순위를 3개로 제한해 실행하기';
    var sunCoreInterpretation = '태양 '+sunSign+'('+sunHousePair+')은 <b>'+sunArchetype+'</b> 타입 매력의 본체예요. '
      +'오늘 내 감정-행동 리듬은 <b>'+axisGapDesc+'</b> 쪽이라, '+imbalanceText+' '
      +'실행은 '+modalityNames[modalityDominant]+' 템포가 가장 잘 먹힙니다. 결론은 간단해요: <b>'+sunStrategy+'</b>를 '+topHouseTopic+'에 먼저 꽂으면 갓생 루트가 열립니다.';

    var astroKeywordLine = '#'+(resilientString(topHouseTopic).split('/')[0] || '오늘의포인트')+' #'+(elemShortNames[elemWeakest] ? ('밸런스'+elemShortNames[elemWeakest]) : '밸런스업')+' #'+(modalityNames[modalityDominant].indexOf('활동궁')>=0?'바로실행':'루틴정리');
    function resilientString(v){ return String(v || '').replace(/\s+/g,'').replace(/[()]/g,''); }
    var astroMoodLine = '오늘은 '+moodLineByBattery();
    function moodLineByBattery(){
      if((retroPlanets||[]).length>=2) return '도파민보다 점검이 이기는 날. 급발진 말고 체크 한 번이면 실수 절반 컷이에요. 🌙';
      if(topFocusCount>=3) return '집중 버프 강하게 켜졌어요. 하나만 제대로 끝내도 오늘 판이 내 쪽으로 기웁니다. 🚀';
      return '템포 안정적인 날이라 과속만 안 하면 오히려 좋아. 꾸준함이 결과를 데려옵니다. 🌿';
    }
    var boosterColorMap = { fire:'코랄/레드', earth:'베이지/카멜', air:'민트/스카이', water:'네이비/블루' };
    var boosterPlaceMap = { 1:'헬스장이나 운동 공간', 2:'은행/재테크 노트 정리 공간', 3:'카페나 스터디 공간', 4:'집 근처 조용한 공간', 5:'전시/공연/취미 공간', 6:'데스크 정리된 업무 공간', 7:'약속 장소/미팅 공간', 8:'혼자 집중할 수 있는 공간', 9:'서점/강연/여행 계획 공간', 10:'오피스/프로필 정리 공간', 11:'모임/커뮤니티 공간', 12:'산책로/명상 공간' };
    var astroBoosterColor = boosterColorMap[elemDominant] || '네이비/민트';
    var astroBoosterPlace = boosterPlaceMap[topFocusHouse] || '조용한 카페';
    var isActionMode = (modalityNames[modalityDominant] || '').indexOf('활동궁') >= 0;
    var astroStarterMission = isActionMode
      ? '가보자고 모드로 15분 스타트: 미루던 일 첫 버튼 누르기'
      : '갓벽 루틴 1개만 리빌드해서 반복 효율 올리기';
    var astroRelationshipMission = axisGap === 6
      ? '팩폭 전에 호흡 10초: 원하는 것 1개 + 양보할 것 1개 정리하기'
      : '감정 올라오면 즉답 금지. 10초 멈추고 전달하면 관계운 럭키비키';
    var astroMoneyMission = (topFocusHouse === 2 || topFocusHouse === 8)
      ? '결제 내역 점검하고 고정비 1개만 날카롭게 절감하기'
      : '충동지출 스킵하고 성장 투자 1건에 예산 몰아주기';
    var astroSocialMission = topFocusHouse === 11
      ? '커뮤니티에서 존재감 문장 1개 남겨서 내 이름 각인하기'
      : '연락 미룬 사람 1명에게 먼저 안부 보내고 흐름 열기';
    var astroSelfcareMission = (retroPlanets || []).length >= 2
      ? '취침 전 30분 디지털 오프. 과열된 뇌 식히면 내일 효율 급상승'
      : '물 2잔 + 5분 스트레칭으로 멘탈 배터리 리부팅하기';
    function clampBriefScore(v){ return Math.max(55, Math.min(98, Math.round(v))); }
    var astroCategoryData = [
      { icon:'🔥', title:'커리어/학업', score:clampBriefScore(64 + topFocusCount * 5 + (isActionMode ? 7 : 2)), mission:astroStarterMission },
      { icon:'💘', title:'연애/관계', score:clampBriefScore(60 + (axisGap === 6 ? 4 : 9) + ((retroPlanets || []).length >= 2 ? -3 : 5)), mission:astroRelationshipMission },
      { icon:'💸', title:'머니/실속', score:clampBriefScore(59 + ((topFocusHouse === 2 || topFocusHouse === 8) ? 11 : 4)), mission:astroMoneyMission },
      { icon:'🫂', title:'소셜/인맥', score:clampBriefScore(58 + (topFocusHouse === 11 ? 12 : 6) + (isActionMode ? 3 : 0)), mission:astroSocialMission },
      { icon:'🧠', title:'멘탈/셀프케어', score:clampBriefScore(62 + ((retroPlanets || []).length >= 2 ? 5 : 1)), mission:astroSelfcareMission }
    ];
    var astroCategoryCardsHtml = astroCategoryData.map(function(item){
      return ''
        +'<div class="astro-neon-mini">'
        +'<div class="astro-neon-mini-head">'
        +'<div class="astro-neon-mini-title">'+item.icon+' '+item.title+'</div>'
        +'<div class="astro-neon-mini-score">'+item.score+'점</div>'
        +'</div>'
        +'<div class="astro-neon-mini-meter"><span style="width:'+item.score+'%"></span></div>'
        +'<p class="astro-neon-mini-copy">'+item.mission+'</p>'
        +'</div>';
    }).join('');
    var astroImmersiveLine = isActionMode
      ? '오늘 하늘은 "빠른 스타트 + 짧은 피드백" 조합에서 폭발해요. 한 개만 먼저 착수하면 다음 흐름이 자동으로 이어집니다.'
      : '오늘 하늘은 "정교한 루틴 + 템포 유지"에서 힘을 줍니다. 적게 해도 정확하면 성과는 크게 남아요.';
    var astroTotalScore = clampBriefScore((astroCategoryData.reduce(function(acc, item){ return acc + item.score; }, 0) / astroCategoryData.length) + 4);
    var astroNeonCss = '<style id="astroNeonBriefingStyle">'
      +'.astro-body, .astro-body button, .astro-body input, .astro-body select, .astro-body textarea{font-family:"Space Grotesk","SUIT Variable","Pretendard Variable","Noto Sans KR",sans-serif !important;}'
      +'.astro-body{background:linear-gradient(180deg,#060a16 0%,#0d1428 50%,#121a32 100%);border-radius:20px;padding:12px;}'
      +'.astro-body .astro-section{position:relative;overflow:hidden;border:1px solid rgba(148,163,184,.22);background:linear-gradient(160deg,rgba(15,23,42,.92),rgba(10,20,45,.9));border-radius:16px;padding:14px;box-shadow:0 0 0 1px rgba(34,211,238,.08),0 16px 28px -24px rgba(56,189,248,.65);}'
      +'.astro-body .astro-section:before{content:"";position:absolute;top:-45px;right:-45px;width:120px;height:120px;background:radial-gradient(circle,rgba(56,189,248,.24),rgba(56,189,248,0));pointer-events:none;}'
      +'.astro-body .astro-subhead{font-size:18px;font-weight:800;color:#c4b5fd;letter-spacing:-.01em;margin-bottom:10px;}'
      +'.astro-body .astro-tags{margin-bottom:10px;}'
      +'.astro-body .astro-tag{display:inline-block;padding:3px 8px;border-radius:999px;border:1px solid rgba(125,211,252,.25);background:rgba(15,23,42,.7);font-size:11px;color:#bae6fd;margin:0 5px 5px 0;}'
      +'.astro-body .astro-desc p{margin:0 0 10px 0;font-size:14px;line-height:1.72;color:#e2e8f0;}'
      +'.astro-readable{font-size:15px;line-height:1.78;}'
      +'.astro-readable .astro-section{padding:16px;}'
      +'.astro-readable .astro-subhead{font-size:20px;line-height:1.34;letter-spacing:-.012em;}'
      +'.astro-readable .astro-desc p{font-size:15px;line-height:1.82;margin-bottom:12px;letter-spacing:.004em;}'
      +'.astro-readable .astro-desc ul,.astro-readable .astro-desc li{line-height:1.78;}'
      +'.astro-readable .astro-core{font-size:14px;line-height:1.72;}'
      +'.astro-readable .astro-tag{font-size:11.5px;}'
      +'.astro-readable .astro-neon-soft-block{line-height:1.75;}'
      +'.astro-readable .table-wrapper{overflow:auto;-webkit-overflow-scrolling:touch;}'
      +'.astro-readable .astro-table th,.astro-readable .astro-table td{padding:8px 7px;line-height:1.62;}'
      +'.astro-label{font-size:12px;color:#93c5fd;display:block;margin-bottom:4px;font-weight:700;letter-spacing:.01em;}'
      +'.astro-body .astro-core{border:1px solid rgba(167,139,250,.28);background:rgba(76,29,149,.15);border-radius:12px;padding:10px;color:#ede9fe;font-size:13px;line-height:1.65;}'
      +'.astro-body .expert-title{color:#a5f3fc;font-weight:800;margin-bottom:10px;}'
      +'.astro-body .neo-bubble,.astro-body .yeon-bubble{border-radius:12px;padding:11px 12px;line-height:1.7;font-size:13px;color:#e2e8f0;}'
      +'.astro-body .neo-bubble{background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.23);margin-bottom:8px;}'
      +'.astro-body .yeon-bubble{background:rgba(244,114,182,.1);border:1px solid rgba(244,114,182,.22);}'
      +'.astro-neon-syn-wrap{margin-top:10px;padding:12px;border-radius:14px;border:1px solid rgba(96,165,250,.35);background:linear-gradient(165deg,rgba(11,14,20,.92),rgba(15,29,58,.88) 46%,rgba(26,28,44,.9));box-shadow:0 12px 24px -20px rgba(56,189,248,.8),inset 0 1px 0 rgba(255,255,255,.06);}'
      +'.astro-neon-syn-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px;}'
      +'.astro-neon-syn-title{font-size:13px;font-weight:800;color:#bae6fd;letter-spacing:.01em;}'
      +'.astro-neon-syn-chip{padding:3px 8px;border-radius:999px;border:1px solid rgba(125,211,252,.38);background:rgba(34,211,238,.12);font-size:11px;color:#cffafe;}'
      +'.astro-neon-syn-wrap .astro-neon-mz-tip{margin:8px 0 0 0;font-size:12px;color:#a5f3fc;line-height:1.65;}'
      +'.astro-neon-input,.astro-neon-select{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:10px;background:rgba(10,18,38,.86);color:#f8fafc;border:1px solid rgba(125,211,252,.36);font-size:13px;outline:none;box-shadow:inset 0 0 0 1px rgba(56,189,248,.08);}'
      +'.astro-neon-input:focus,.astro-neon-select:focus{border-color:rgba(125,211,252,.7);box-shadow:0 0 0 2px rgba(56,189,248,.22);}'
      +'.astro-neon-cta{width:100%;padding:11px 12px;border-radius:11px;background:linear-gradient(135deg,#0891b2,#6366f1 55%,#8b5cf6);color:#fff;font-weight:800;font-size:13px;border:1px solid rgba(125,211,252,.45);cursor:pointer;letter-spacing:.35px;box-shadow:0 8px 22px -14px rgba(56,189,248,.85);transition:transform .15s ease, box-shadow .15s ease;}'
      +'.astro-neon-cta:hover{transform:translateY(-1px);box-shadow:0 12px 24px -14px rgba(99,102,241,.9);}'
      +'.astro-neon-scroll{display:flex;flex-wrap:wrap;gap:6px;max-height:130px;overflow-y:auto;padding:7px;border:1px solid rgba(148,163,184,.16);border-radius:10px;background:rgba(2,6,23,.34);min-height:44px;}'
      +'.astro-neon-scroll::-webkit-scrollbar{width:8px;height:8px;}'
      +'.astro-neon-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(34,211,238,.7),rgba(99,102,241,.7));border-radius:999px;}'
      +'.astro-neon-tab-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}'
      +'.astro-neon-accent{border-left:4px solid rgba(125,211,252,.6) !important;background:linear-gradient(90deg,rgba(56,189,248,.08),rgba(15,23,42,0)) !important;}'
      +'.astro-neon-accent-gold{border-left:4px solid #d4af37 !important;background:linear-gradient(90deg,rgba(212,175,55,.12),rgba(15,23,42,0)) !important;}'
      +'.astro-neon-accent-pink{border-left:4px solid #f472b6 !important;background:linear-gradient(90deg,rgba(244,114,182,.1),rgba(15,23,42,0)) !important;}'
      +'.astro-neon-accent-amber{border-left:4px solid #f59e0b !important;background:linear-gradient(90deg,rgba(245,158,11,.1),rgba(15,23,42,0)) !important;}'
      +'.astro-neon-accent-indigo{border-left:4px solid #818cf8 !important;background:linear-gradient(90deg,rgba(129,140,248,.1),rgba(15,23,42,0)) !important;}'
      +'.astro-neon-accent-violet{border-left:3px solid #a78bfa !important;background:linear-gradient(90deg,rgba(167,139,250,.1),rgba(15,23,42,0)) !important;}'
      +'.astro-neon-accent-cyan{border-left:3px solid #22d3ee !important;background:linear-gradient(90deg,rgba(34,211,238,.1),rgba(15,23,42,0)) !important;}'
      +'.astro-neon-soft-block{background:rgba(15,23,42,.52) !important;border:1px solid rgba(148,163,184,.24) !important;border-radius:11px !important;padding:12px !important;}'
      +'.astro-syn-loading{font-size:12px;color:#cbd5e1;line-height:1.65;}'
      +'.astro-syn-header{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;}'
      +'.astro-syn-name{font-size:16px;font-weight:900;color:#f8fafc;letter-spacing:-.01em;}'
      +'.astro-syn-pill{padding:3px 10px;border-radius:999px;border:1px solid rgba(125,211,252,.45);background:rgba(34,211,238,.14);font-size:11px;color:#cffafe;font-weight:700;}'
      +'.astro-syn-pill.gold{border-color:rgba(245,158,11,.44);background:rgba(245,158,11,.14);color:#fde68a;}'
      +'.astro-syn-meta{font-size:11px;color:#94a3b8;border:1px solid rgba(148,163,184,.34);padding:3px 8px;border-radius:999px;}'
      +'.astro-syn-score-row{display:grid;grid-template-columns:auto 1fr;gap:10px;margin-bottom:12px;align-items:start;}'
      +'.astro-syn-score-card{background:rgba(2,6,23,.7);border:1px solid rgba(125,211,252,.18);border-radius:12px;padding:13px;text-align:center;min-width:84px;}'
      +'.astro-syn-score-label{font-size:10px;color:#a5b4fc;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}'
      +'.astro-syn-score-val{font-size:34px;font-weight:900;line-height:1;}'
      +'.astro-syn-score-unit{font-size:10px;color:#64748b;margin-top:2px;}'
      +'.astro-syn-summary{display:flex;flex-direction:column;gap:6px;}'
      +'.astro-syn-type{font-size:12px;color:#e2e8f0;line-height:1.5;font-weight:700;}'
      +'.astro-syn-sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:3px;}'
      +'.astro-syn-sign-item{padding:5px 7px;border-radius:7px;font-size:11px;}'
      +'.astro-syn-sign-item.sun{background:rgba(251,191,36,.1);color:#fde68a;}'
      +'.astro-syn-sign-item.moon{background:rgba(148,163,184,.12);color:#e2e8f0;}'
      +'.astro-syn-sign-item.venus{background:rgba(244,114,182,.1);color:#fbcfe8;}'
      +'.astro-syn-sign-item.mars{background:rgba(239,68,68,.1);color:#fca5a5;}'
      +'.astro-syn-triple{display:grid;grid-template-columns:1fr;gap:7px;margin-bottom:12px;}'
      +'.astro-syn-card{border-radius:11px;padding:10px 12px;border:1px solid rgba(148,163,184,.22);background:rgba(15,23,42,.52);}'
      +'.astro-syn-card h5{margin:0 0 5px 0;font-size:11px;letter-spacing:.02em;}'
      +'.astro-syn-card p{margin:0;font-size:12px;color:#e2e8f0;line-height:1.6;word-break:keep-all;}'
      +'.astro-syn-card.love{border-color:rgba(244,114,182,.28);background:rgba(244,114,182,.08);}'
      +'.astro-syn-card.love h5{color:#f472b6;}'
      +'.astro-syn-card.work{border-color:rgba(251,191,36,.25);background:rgba(251,191,36,.08);}'
      +'.astro-syn-card.work h5{color:#fbbf24;}'
      +'.astro-syn-card.spirit{border-color:rgba(129,140,248,.24);background:rgba(129,140,248,.08);}'
      +'.astro-syn-card.spirit h5{color:#818cf8;}'
      +'.astro-syn-data{background:rgba(99,102,241,.1);border:1px solid rgba(129,140,248,.25);border-radius:10px;padding:10px;margin-bottom:12px;}'
      +'.astro-syn-data-title{font-size:11px;color:#a5b4fc;font-weight:700;margin-bottom:6px;}'
      +'.astro-syn-data-copy{font-size:12px;color:#e2e8f0;line-height:1.65;}'
      +'.astro-syn-aspects-title{font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;}'
      +'.astro-syn-aspects{display:flex;flex-direction:column;gap:4px;}'
      +'.astro-syn-aspect{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.03);border-radius:7px;padding:6px 10px;}'
      +'.astro-syn-aspect-main{font-size:11px;color:#e2e8f0;flex:1;}'
      +'.astro-syn-overlay{background:rgba(20,25,35,.6);border:1px solid rgba(129,140,248,.2);border-radius:10px;padding:10px;margin-bottom:12px;}'
      +'.astro-syn-overlay-title{font-size:11px;color:#818cf8;font-weight:700;margin-bottom:6px;}'
      +'.astro-syn-overlay-copy{font-size:12px;color:#e2e8f0;line-height:1.62;}'
      +'.astro-syn-overlay-tip{font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.55;}'
      +'.astro-syn-shadow{background:rgba(15,23,42,.6);border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,.07);}'
      +'.astro-syn-shadow-title{font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;}'
      +'.astro-syn-shadow-good{font-size:12px;color:#86efac;margin-bottom:5px;line-height:1.5;}'
      +'.astro-syn-shadow-bad{font-size:12px;color:#fca5a5;margin-bottom:8px;line-height:1.5;}'
      +'.astro-syn-shadow-remedy{font-size:12px;background:rgba(129,140,248,.12);border-left:3px solid #818cf8;padding:8px 10px;border-radius:0 8px 8px 0;color:#c7d2fe;line-height:1.6;word-break:keep-all;}'
      +'.astro-syn-quick{margin:10px 0 12px 0;padding:10px 11px;border-radius:10px;background:rgba(56,189,248,.1);border:1px solid rgba(125,211,252,.28);}'
      +'.astro-syn-quick-title{font-size:11px;color:#a5f3fc;font-weight:800;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;}'
      +'.astro-syn-quick ul{margin:0;padding-left:16px;}'
      +'.astro-syn-quick li{font-size:12px;line-height:1.66;color:#e2e8f0;margin-bottom:3px;}'
      +'.astro-neon-wrap{position:relative;overflow:hidden;border-radius:22px;padding:16px;border:1px solid rgba(96,165,250,.38);background:linear-gradient(165deg,#0b0e14 0%,#0f1d3a 46%,#1a1c2c 100%);box-shadow:0 0 0 1px rgba(34,211,238,.18),0 24px 48px -28px rgba(56,189,248,.75),inset 0 1px 0 rgba(255,255,255,.07);}'
      +'.astro-neon-wrap:before{content:"";position:absolute;inset:-40% auto auto -25%;width:240px;height:240px;background:radial-gradient(circle,rgba(45,212,191,.22),rgba(45,212,191,0));filter:blur(4px);pointer-events:none;}'
      +'.astro-neon-wrap:after{content:"";position:absolute;right:-90px;bottom:-110px;width:260px;height:260px;background:radial-gradient(circle,rgba(168,85,247,.28),rgba(168,85,247,0));filter:blur(8px);pointer-events:none;}'
      +'.astro-neon-head{position:relative;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;z-index:1;}'
      +'.astro-neon-badge{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;border:1px solid rgba(125,211,252,.42);background:rgba(34,211,238,.12);color:#cffafe;font-size:11px;font-weight:700;letter-spacing:.02em;}'
      +'.astro-neon-panel{position:relative;z-index:1;margin-top:10px;padding:12px;border-radius:14px;border:1px solid rgba(148,163,184,.24);background:rgba(2,6,23,.54);backdrop-filter:blur(6px);}'
      +'.astro-neon-key{font-size:14px;line-height:1.62;color:#f8fafc;margin:0 0 7px 0;}'
      +'.astro-neon-key b{color:#67e8f9;}'
      +'.astro-neon-grid{position:relative;z-index:1;display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px;}'
      +'.astro-neon-mini{border-radius:13px;border:1px solid rgba(148,163,184,.22);background:rgba(15,23,42,.58);padding:11px;backdrop-filter:blur(4px);}'
      +'.astro-neon-mini-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}'
      +'.astro-neon-mini-title{font-size:14px;font-weight:700;color:#e0f2fe;letter-spacing:-.01em;}'
      +'.astro-neon-mini-score{font-size:12px;font-weight:700;color:#67e8f9;}'
      +'.astro-neon-mini-meter{height:6px;border-radius:999px;background:rgba(30,41,59,.85);overflow:hidden;margin-top:7px;}'
      +'.astro-neon-mini-meter span{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#a855f7);box-shadow:0 0 12px rgba(34,211,238,.65);}'
      +'.astro-neon-mini-copy{margin:7px 0 0 0;font-size:12px;line-height:1.6;color:#cbd5e1;}'
      +'.astro-neon-actions{position:relative;z-index:1;margin-top:10px;border:1px solid rgba(125,211,252,.24);border-radius:14px;background:rgba(15,23,42,.58);padding:12px;}'
      +'.astro-neon-actions h4{margin:0 0 8px 0;font-size:14px;color:#cffafe;}'
      +'.astro-neon-actions ul{margin:0;padding-left:18px;color:#e2e8f0;font-size:13px;line-height:1.7;}'
      +'.astro-neon-total{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:#a5f3fc;}'
      +'.astro-neon-total strong{font-size:16px;color:#fff;}'
      +'@media (min-width:700px){.astro-neon-wrap{padding:18px;}.astro-neon-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}'
      +'@media (min-width:1100px){.astro-neon-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}'
      +'@media (max-width:640px){.astro-readable .astro-subhead{font-size:18px;}.astro-readable .astro-desc p{font-size:14px;line-height:1.75;}.astro-syn-score-row{grid-template-columns:1fr;}.astro-syn-score-card{min-width:0;}.astro-syn-header{gap:6px;margin-bottom:10px;}.astro-syn-name{font-size:15px;}.astro-neon-cta{min-height:44px;font-size:13px;}.astro-neon-input,.astro-neon-select{min-height:42px;font-size:13px;}}'
      +'</style>';

    var html = '<div class="astro-body astro-readable cosmic-theme star-container" id="astroBodyWrap">'
      + astroNeonCss
      +'<div class="astro-section" style="margin-bottom:16px;">'
      +'<div class="astro-neon-wrap">'
      +'<div class="astro-neon-head">'
      +'<div class="astro-subhead" style="margin:0;color:#a5f3fc;">✨ 오늘의 별자리 브리핑</div>'
      +'<div class="astro-neon-badge">Deep Universe · Neon Star</div>'
      +'</div>'
      +'<div class="astro-neon-panel">'
      +'<p class="astro-neon-key"><b>오늘의 핵심 키워드:</b> '+astroKeywordLine+'</p>'
      +'<p class="astro-neon-key"><b>별들이 전하는 한마디:</b> '+astroMoodLine+' '+relationAxisText+'</p>'
      +'<p class="astro-neon-key" style="color:#bae6fd;"><b>몰입 포인트:</b> '+astroImmersiveLine+'</p>'
      +'<div class="astro-neon-total">오늘 총운 <strong>'+astroTotalScore+'점</strong> · 오늘의 모드: '+(isActionMode?'가보자고 액션':'정교한 루틴')+'</div>'
      +'</div>'
      +'<div class="astro-neon-grid">'+astroCategoryCardsHtml+'</div>'
      +'<div class="astro-neon-actions">'
      +'<h4>오늘의 액션 미션 3</h4>'
      +'<ul>'
      +'<li>중요한 답장은 10초 숨 고른 뒤 전송하기 (팩폭보다 맥락이 먼저)</li>'
      +'<li>핵심 과제 1개는 점심 전에 70%까지 밀어붙이기</li>'
      +'<li>기분 배터리 30% 이하일 땐 일정 1개 비워서 리듬 회복하기</li>'
      +'</ul>'
      +'<p style="margin:8px 0 0 0;font-size:12px;color:#a5f3fc;"><b>행운의 부스터:</b> '+astroBoosterColor+' 톤 + '+astroBoosterPlace+' + 물 한 잔 루틴 💧</p>'
      +'</div>'
      +'</div>'
      +'</div>'
      + masterInsight
      +'<div class="astro-subhead">🗺 0. 내 탄생 별자리 지도</div>'
        +'<div class="astro-desc">'
      +'<p>이 표는 "태어난 순간 하늘 사진"이라고 생각하면 쉽습니다. 하우스(1H~12H)는 그 에너지가 삶의 어떤 분야(일, 사랑, 돈, 관계 등)에서 강하게 쓰이는지 보여줘요.</p>'
        +'<div class="table-wrapper" style="border:1px solid rgba(148,163,184,0.2);border-radius:10px;margin:10px 0;">'
        +'<table class="astro-table" style="font-size:0.83rem;">'
        +'<colgroup><col><col><col><col></colgroup>'
        +'<thead><tr style="background:rgba(30,41,59,0.6);">'
        +'<th style="text-align:left;color:#94a3b8;">행성</th>'
        +'<th style="text-align:left;color:#94a3b8;">행성 위치(황도)</th>'
        +'<th style="text-align:left;color:#94a3b8;">Placidus(세부)</th>'
        +'<th style="text-align:left;color:#94a3b8;">Whole Sign(큰 흐름)</th>'
        +'</tr></thead>'
        +'<tbody>'+placementRows.join('')+'</tbody>'
        +'</table>'
        +'</div>'
        +'<p style="margin:8px 0 0 0;color:#cbd5e1;font-size:0.82rem;">포르투나: <b>'+fortunaSign+'</b> ('+fortunaHousePair+') · 스피릿: <b>'+spiritSign+'</b> ('+spiritHousePair+')</p>'
        +'<div style="background:rgba(15,23,42,0.5);border:1px solid rgba(148,163,184,0.2);border-radius:10px;padding:10px;">'
        +'<div style="color:#94a3b8;font-size:0.78rem;margin-bottom:6px;">주요 행성 각(타이트 오브 우선)</div>'
        +'<ul style="margin:0;padding-left:18px;color:#e2e8f0;font-size:0.84rem;line-height:1.6;">'+majorAspectHtml+'</ul>'
        +'</div>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">🌟 1. 내 캐릭터 한눈 요약 (태양·달·상승궁)</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">☀ 태양</span> <span class="astro-planet">'+sunSign+'</span>'+sunDeg
        +' <span class="astro-tag">☽ 달</span> <span class="astro-planet">'+moonSign+'</span>'+moonDeg
        +' <span class="astro-tag">↑ Asc 상승궁</span> <span class="astro-planet">'+ascSign+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>☀️ 태양 — 나의 진짜 빛</b><br>'+sunCoreInterpretation+'</p>'
        +'<p><b>🌙 달 — 감정 배터리의 진짜 코드</b><br>'+moonSign+' 달은 지치거나 예민할 때 자동으로 튀어나오는 모드예요. '+moonHousePair+' 영역에서 회복이 빠르고, 같은 구간에서 상처도 깊게 남아요. 이 포인트를 알아주는 사람은 관계 만족도가 확 올라갑니다.</p>'
        +'<p><b>⬆ 상승궁 — 첫인상 캐릭터</b><br>상승궁 <b>'+ascSign+'</b>은 첫 만남에서 보이는 "프리뷰 버전"이에요. 친해질수록 태양 본캐가 드러나서, 초반 이미지와 후반 매력이 다르게 느껴질 수 있어요.</p>'
        +'<p style="margin-top:8px;color:#cbd5e1;">'+imbalanceText+' '+precisionComment+'</p>'
        +'</div>'
        +'<div class="astro-core">"오늘의 본캐 행성은 <strong>'+chartRuler+'</strong>. 이 축을 살리면 일도 관계도 도파민이 붙어요."</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">🧠 1.5 말투·성장버프·인생변수 (수성·목성·외행성)</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">☿ 수성</span> <span class="astro-planet">'+mercurySign+(chart.planets.Mercury&&chart.planets.Mercury.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +' <span class="astro-tag">♃ 목성</span> <span class="astro-planet">'+jupiterSign+(chart.planets.Jupiter&&chart.planets.Jupiter.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +' <span class="astro-tag">♄ 토성</span> <span class="astro-planet">'+saturnSign+(chart.planets.Saturn&&chart.planets.Saturn.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>💬 수성 — 말빨과 사고방식</b><br>수성 <b>'+mercurySign+'</b>('+mercuryHousePair+')은 네가 말하고 배우는 템포를 보여줘요. 이 방식대로 커뮤니케이션하면 오해는 줄고 성과는 빨라집니다.</p>'
        +'<p><b>🍀 목성 — 럭키비키 포인트</b><br>목성 <b>'+jupiterSign+'</b>('+jupiterHousePair+')은 "왜인지 잘 풀리는 길"이에요. 여기로 힘을 실으면 과한 억지 없이도 확장운이 붙습니다.</p>'
        +'<p><b>🌀 외행성 3총사 — 판 바꾸는 변수</b><br>천왕성('+uranusSign+', '+uranusHousePair+')은 급전환, 해왕성('+neptuneSign+', '+neptuneHousePair+')은 감성·영감 버프, 명왕성('+plutoSign+', '+plutoHousePair+')은 체질 개선 구간입니다. 흔들릴 땐 빡세지만, 지나면 확실히 레벨업됩니다.</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">🏆 2. 커리어에서 어디에 꽂아야 뜨는가?</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">MC 천정(10H)</span> <span class="astro-planet">'+mcSign+'</span>'
        +' <span class="astro-tag">Desc 하강궁(7H)</span> <span class="astro-planet">'+descSign+'</span>'
        +' <span class="astro-tag">6H</span> <span class="astro-house">'+h6Sign+'</span>'
        +' <span class="astro-tag">Saturn ♄</span> <span class="astro-planet">'+saturnSign+(chart.planets.Saturn&&chart.planets.Saturn.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>🎯 MC(<b>'+mcSign+'</b>) — 세상이 기억하는 내 브랜드</b><br>MC는 공적 무대에서 네가 빛나는 캐릭터예요. 이 코드로 포지셔닝하면 "이 분야는 저 사람" 인식이 빨리 생깁니다.</p>'
        +'<p><b>🔨 6하우스(<b>'+h6Sign+'</b>) — 실전 운영법</b><br>여긴 업무 습관과 체력 운용의 핵심 구간입니다. 나한테 맞는 루틴만 고정해도 효율이 올라가고 번아웃이 줄어요.</p>'
        +'<p><b>🏗️ 토성(<b>'+saturnSign+'</b>, '+saturnHousePair+') — 느리지만 크게 남는 구간</b><br>초반엔 답답할 수 있어도, 여기서 쌓은 기본기는 오래 갑니다. 한마디로 "빡세지만 배신 안 하는 영역"이에요.</p>'
        +'<p style="margin-top:8px;color:#cbd5e1;">실전 공식: MC로 브랜딩하고 → 6하우스로 실행 템포 맞추고 → 토성 구간에서 꾸준함으로 승부. 갓생은 이 조합이 먹힙니다.</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">💘 3. 연애할 때 내 설렘 스위치는?</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">Desc 하강궁(7H)</span> <span class="astro-planet">'+descSign+'</span>'
        +' <span class="astro-tag">Venus 금성 ♀</span> <span class="astro-planet">'+venusSign+(chart.planets.Venus&&chart.planets.Venus.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +' <span class="astro-tag">Mars 화성 ♂</span> <span class="astro-planet">'+marsSign+(chart.planets.Mars&&chart.planets.Mars.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>😍 하강궁(Desc) — 자꾸 끌리는 타입의 비밀</b><br>하강궁 <b>'+descSign+'</b>은 네가 무의식적으로 끌리는 관계 코드예요. "왜 나는 늘 비슷한 타입에 빠지지?" 싶었다면 여기가 정답입니다.</p>'
        +'<p><b>💕 금성(<b>'+venusSign+'</b>, '+venusHousePair+') × 화성(<b>'+marsSign+'</b>, '+marsHousePair+')</b><br>금성은 내가 사랑을 표현하는 방식, 화성은 먼저 다가가게 만드는 본능입니다. '+(vmAspect || vmCalcFallback)+'</p>'
        +'<p><b>🌙 달 — 연인이 알아줘야 할 진짜 니즈</b><br>달(<b>'+moonSign+'</b>, '+moonHousePair+') 니즈가 채워지면 관계 만족도가 급상승해요. 여기 맞는 사람이면 과몰입이 건강하게 오래갑니다.</p>'
        +'<p style="margin-top:8px;color:#cbd5e1;">'+relationAxisText+'</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">🍀 4. 지금 운이 몰리는 방향 (목성 트랜짓)</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">Jupiter ♃ Transit</span> <span class="astro-planet">'+jupiterTransit+'</span>'
        +' <span style="color:#94a3b8;font-size:0.78rem">('+now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+(now.getDate())+'일 기준)</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p>지금 목성은 <b>'+jupiterTransit+'</b>을 지나고 있어요. 올해 확장운이 붙는 메인 트랙이란 뜻입니다. 큰 결정은 이 방향에 맞추면 성공 확률이 올라갑니다.</p>'
        +'<div class="astro-core" style="font-size:1.05rem;margin-top:20px;font-weight:bold">"👉 '+transitMsg[jupiterIndex]+'"</div>'
        +'<p>'+transitExecutionText+'</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">⚡ 4.5 오늘 집중하면 터지는 포인트</div>'
        +'<div class="astro-desc">'
        +'<p><b>🔥 나의 에너지 구성:</b> '+imbalanceText+'</p>'
        +'<p><b>🎯 행동 스타일:</b> '+modalityNames[modalityDominant]+' 위주입니다. '+modalityAdvice[modalityDominant]+'</p>'
        +'<p><b>🏠 인생 무게중심:</b> '+focusHouseText+'. 오늘은 특히 <b>'+topHouseTopic+'</b>에서 성과 체감이 빨라요.</p>'
        +'<p><b>⚠️ 조심할 포인트:</b> '+precisionComment+'</p>'
        +'<p><b>↩ 역행 중인 행성:</b> '+retroFocusText+'</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">🫶 5. 누구랑 붙을 때 시너지가 터지나?</div>'
        +'<div class="astro-desc">'
        +'<p>내 차트를 알면 궁합이 훨씬 현실적으로 보여요. 누가 잘 맞고 어디서 부딪히는지, 태양·달·금성·화성으로 쉽게 읽어드립니다.</p>'
        +'<p style="color:#cbd5e1;">핵심 포인트: 감정 안정은 달('+moonHousePair+'), 끌림과 표현은 금성('+venusHousePair+')·화성('+marsHousePair+'), 가장 강하게 작동하는 각도는 '+tightAspectText+'입니다.</p>'
        +'<div class="astro-core" style="font-size:0.95rem;line-height:1.6;font-weight:normal">'
        +'<ul style="padding-left:20px;margin-bottom:0;">'
        +'<li style="margin-bottom:10px;"><b>💕 연애 궁합 (마음이 편한 관계)</b><br>감정 안정 포인트는 <b>'+moonSign+'</b>('+moonHousePair+')입니다. 초반에 안심감을 먼저 만들면 오래가요. 내 약점 원소 <b>'+elemShortNames[elemWeakest]+'</b>를 채워주는 사람이 특히 찰떡입니다.</li>'
        +'<li style="margin-bottom:10px;"><b>✨ 속 궁합 (끌림과 템포)</b><br><b>'+venusSign+'</b> 금성('+venusHousePair+')은 사랑 표현법, <b>'+marsSign+'</b> 화성('+marsHousePair+')은 행동 타이밍이에요. "표현 맞추기 → 속도 맞추기" 순서가 제일 자연스럽습니다.</li>'
        +'<li><b>🤝 일 궁합 (함께 잘 일하는 조합)</b><br>업무 축은 MC <b>'+mcSign+'</b>와 토성 <b>'+saturnSign+'</b>('+saturnHousePair+')입니다. 감정보다 일정·품질·약속을 같이 지키는 파트너가 더 오래 갑니다.</li>'
        +'</ul>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ── 통합 인연 리포트 (Synastry & Bond) ── */
        +'<div class="astro-section astro-neon-accent astro-neon-accent-pink">'
        +'<div class="astro-subhead" style="color:#f472b6;">💞 궁합 한눈에 리포트 (팩트 버전)</div>'
        +'<div class="astro-desc">'
        +'<p><b>[하강궁 — 자꾸 끌리는 타입]</b> 당신의 하강궁(7H)은 <b>'+descSign+'</b>입니다. 그래서 이 성향을 가진 사람에게 "이유 없이 끌리는 느낌"이 자주 생길 수 있어요.</p>'
        +'<p><b>[Venus ♀ × Mars ♂ — 설렘 스위치]</b> 금성(<b>'+venusSign+'</b>)과 화성(<b>'+marsSign+'</b>)의 조합은 이렇게 읽혀요: '+(vmAspect||vmCalcFallback)+'</p>'
        +'<p><b>[궁합 체크 포인트]</b> 같은 별자리라고 자동 찰떡은 아니에요. 태양·달·금성·화성의 실제 각도가 맞을수록 관계 유지력이 높아집니다. 한마디로 케미는 별자리 + 운영력의 합입니다.</p>'
        +'<div class="astro-neon-soft-block" style="margin-top:12px;">'
        +'<div style="color:#f9a8d4; font-weight:700; margin-bottom:8px; font-size:0.85rem; text-transform:uppercase; letter-spacing:1px;">✦ Bond Compatibility Map</div>'
        +'<ul style="padding-left:18px; margin:0; color:#e2e8f0; line-height:1.85; font-size:0.9rem;">'
        +'<li><b>💕 연애 궁합</b> — 달 <b>'+moonSign+'</b>('+moonHousePair+')의 감정 리듬을 직관적으로 알아봐 주는 사람. '+relationComplementElement+' 기질로 내 에너지의 빈틈을 채워주는 상대일수록 오래갑니다.</li>'
        +'<li><b>✨ 속 궁합</b> — 금성 <b>'+venusSign+'</b>('+venusHousePair+')의 사랑 언어가 통하고, 화성 <b>'+marsSign+'</b>('+marsHousePair+')의 타이밍이 맞는 사람일 때 "이 사람이다" 싶은 느낌이 확 옵니다.</li>'
        +'<li><b>🤝 일 궁합</b> — MC <b>'+mcSign+'</b>의 방향성을 응원하고, 토성 <b>'+saturnSign+'</b>('+saturnHousePair+')의 규율을 함께 지켜줄 수 있는 파트너. 역할 분담만 잘 해도 마찰이 크게 줄어듭니다.</li>'
        +'</ul>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ── ★ 직접 입력 시나스트리 궁합 ── */
        +'<div class="astro-section astro-neon-accent astro-neon-accent-amber">'
        +'<div class="astro-subhead" style="color:#f59e0b;">💫 나의 시나스트리: 상대 직접 입력</div>'
        +'<div class="astro-desc">'
        +'<p style="font-size:0.85rem;color:#b2bec3;margin:0 0 12px 0;line-height:1.6;word-break:keep-all;">'
        +'상대 정보만 넣으면 두 사람의 케미 지도가 즉시 오픈됩니다. 시간 미상이면 12:00(정오)로도 OK, 대화 템포 힌트까지 뽑아드려요.'
        +'</p>'
        /* 입력 폼 */
        +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
        +'<div style="flex:1;min-width:130px;">'
        +'<label class="astro-label">상대방 이름 (선택)</label>'
        +'<input type="text" class="astro-neon-input" id="asDirect_name" placeholder="예: 홍길동" autocomplete="off">'
        +'</div>'
        +'<div style="flex:1;min-width:130px;">'
        +'<label class="astro-label">생년월일</label>'
        +'<input type="date" class="astro-neon-input" id="asDirect_date" required>'
        +'</div>'
        +'<div style="flex:0 0 auto;">'
        +'<label class="astro-label">태어난 시각</label>'
        +'<input type="time" class="astro-neon-input" id="asDirect_time" value="12:00" style="width:120px;">'
        +'</div>'
        +'<div style="flex:0 0 auto;">'
        +'<label class="astro-label">도시(시/군)</label>'
        +'<select id="asDirect_city" class="astro-neon-select" style="width:240px;">'
        +'<option value="">도시 선택(시/군 단위)</option>'
        +'</select>'
        +'</div>'
        +'</div>'
        +'<button onclick="window._astroDirectSynastry()" class="astro-neon-cta">✦ 시나스트리 분석하기</button>'
        +'<div id="asDirectResult" style="margin-top:14px;"></div>'
        +'</div>'
        +'</div>'

        /* ── ★ 점성술 유명인 시나스트리 궁합 (신규) ── */
        +'<div class="astro-section astro-neon-accent astro-neon-accent-indigo" id="astroSynastrySection">'
        +'<div class="astro-subhead" style="color:#818cf8;">🌌 유명인 시나스트리 (셀럽 궁합 실험실)</div>'
        +'<div class="astro-desc">'

        /* ── [✨ 천상의 지도: 당신의 성좌] ── */
        +'<div class="astro-neon-soft-block" style="margin-bottom:14px;">'
        +'<div style="font-size:0.78rem;color:#818cf8;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">✨ 천상의 지도: 당신의 성좌</div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;">'
        +'<div style="background:rgba(251,191,36,0.1);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(251,191,36,0.25);">'
        +'<div style="font-size:0.65rem;color:#fbbf24;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">☀ 태양</div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#fde68a;line-height:1.2;">'+sunSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">핵심 자아</div>'
        +'</div>'
        +'<div style="background:rgba(148,163,184,0.12);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(148,163,184,0.2);">'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">☽ 달</div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#e2e8f0;line-height:1.2;">'+moonSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">감정 패턴</div>'
        +'</div>'
        +'<div style="background:rgba(244,114,182,0.1);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(244,114,182,0.2);">'
        +'<div style="font-size:0.65rem;color:#f472b6;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">♀ 금성</div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#fbcfe8;line-height:1.2;">'+venusSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">사랑의 언어</div>'
        +'</div>'
        +'<div style="background:rgba(239,68,68,0.1);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(239,68,68,0.2);">'
        +'<div style="font-size:0.65rem;color:#f87171;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">♂ 화성</div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#fca5a5;line-height:1.2;">'+marsSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">욕망의 동력</div>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ── [🎭 영혼의 쌍둥이: 나와 닮은 별의 인물] — 동적 렌더 컨테이너 ── */
        +'<div class="astro-neon-soft-block" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25) !important;background:rgba(16,185,129,.08) !important;">'
        +'<div style="font-size:0.78rem;color:#34d399;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">🎭 영혼의 쌍둥이: 나와 같은 별의 인물</div>'
        +'<p style="font-size:0.82rem;color:#94a3b8;margin:0 0 10px 0;line-height:1.5;">사주 <b>CelebrityDB</b>에서 <b>'+sunSign+'</b> 태양 또는 <b>'+venusSign+'</b> 금성과 같은 기운을 가진 유명인을 자동으로 찾아드립니다.</p>'
        +'<div id="astroCosmicTwins" style="display:flex;flex-wrap:wrap;gap:6px;min-height:36px;">'
        +'<span style="color:#666;font-size:0.8rem;">✦ 분석 중...</span>'
        +'</div>'
        +'</div>'

        /* ── [💍 운명의 시나스트리] — 유명인 선택 UI ── */
        +'<div class="astro-neon-soft-block" style="margin-bottom:14px;border-color:rgba(244,114,182,0.25) !important;background:rgba(244,114,182,.08) !important;">'
        +'<div style="font-size:0.78rem;color:#f472b6;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">💍 운명의 시나스트리: 유명인 궁합 분석</div>'
        +'<p style="font-size:0.82rem;color:#94a3b8;margin:0 0 10px 0;line-height:1.5;">셀럽을 고르면 네 차트와 바로 맞대결. 연애 케미, 협업 합, 감정 파동까지 한 번에 뜨는 코즈믹 랩이에요. 생시 미상은 12:00 기준이라 달/상승궁은 참고용으로 보고, 실제 성향은 대화 템포로 최종 체크해요.</p>'
        /* 국가 탭 */
        +'<div id="astroCtryTabs" class="astro-neon-tab-row"></div>'
        /* 카테고리 탭 */
        +'<div id="astroCatTabs" class="astro-neon-tab-row"></div>'
        /* 검색 */
        +'<div style="position:relative;margin-bottom:8px;">'
        +'<input type="text" class="astro-neon-input" id="astroSyQ" placeholder="이름 검색 (예: 테일러 스위프트, 아이유...)" autocomplete="off" style="padding-right:34px;">'
        +'<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#888;pointer-events:none;font-size:0.9rem;">🔍</span>'
        +'</div>'
        /* 유명인 버튼 목록 */
        +'<div id="astroSyCelebs" class="astro-neon-scroll"></div>'
        +'</div>'

        /* ── [시나스트리 결과판] ── */
        +'<div id="astroSyResult" style="display:none;"></div>'

        +'</div>'
        +'</div>'

        /* ── 4원소 균형 (실시간) ── */
        +'<div class="astro-section">'
        +'<div class="astro-subhead">🜂 4원소 균형 (Elemental Balance)</div>'
        +'<div class="astro-desc">'
        +'<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">'
        +['fire','earth','air','water'].map(function(el){
            var cfg={fire:['#f87171','🔥','불(Fire)'],earth:['#fde68a','🌿','흙(Earth)'],air:['#93c5fd','💨','공기(Air)'],water:['#34d399','💧','물(Water)']};
            var c=cfg[el]; var pct=elemPct[el];
            return '<div style="background:rgba(255,255,255,0.04); border-radius:10px; padding:12px; border:1px solid rgba(255,255,255,0.07);">'
                +'<div style="font-size:0.82rem; color:'+c[0]+'; font-weight:700; margin-bottom:6px;">'+c[1]+' '+c[2]+'</div>'
                +'<div style="font-size:1.5rem; font-weight:900; color:'+c[0]+'; line-height:1;">'+pct+'<span style="font-size:0.75rem; color:#94a3b8; font-weight:400;">%</span></div>'
                +'<div style="height:4px; background:#1e293b; border-radius:2px; margin-top:8px; overflow:hidden;"><div style="height:100%; width:'+pct+'%; background:'+c[0]+'; border-radius:2px;"></div></div>'
                +'</div>';
        }).join('')
        +'</div>'
        +'<div style="background:rgba(255,255,255,0.04); border-radius:10px; padding:12px; font-size:0.88rem;">'
        +'<span style="color:#fbbf24; font-weight:700;">지배 원소: '+elemDomNames[elemDominant]+'</span>'
        +'<p style="margin:6px 0 0 0; color:#cbd5e1; line-height:1.5;">'+elemDomDesc[elemDominant]+'</p>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ── 피르다리아 (실시간) ── */
        +'<div class="astro-section astro-neon-accent astro-neon-accent-violet">'
        +'<div class="astro-subhead" style="color:#a78bfa;">🪐 피르다리아 (Firdaria — 고전 시간 통치자)</div>'
        +'<div class="astro-desc">'
        +'<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">'
        +'<div style="flex:1; min-width:130px; background:rgba(167,139,250,0.12); border-radius:10px; padding:12px; border:1px solid rgba(167,139,250,0.3); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#a78bfa; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">메인 타임로드</div>'
        +'<div style="font-size:1.15rem; font-weight:900; color:#ddd6fe;">'+firdariaMain.planet+'</div>'
        +'<div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">잔여 약 '+firdariaMainYearsLeft+'년</div>'
        +'</div>'
        +'<div style="flex:1; min-width:130px; background:rgba(167,139,250,0.06); border-radius:10px; padding:12px; border:1px solid rgba(167,139,250,0.15); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#a78bfa; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">서브 타임로드</div>'
        +'<div style="font-size:1.15rem; font-weight:900; color:#c4b5fd;">'+firdariaSubPlanet+'</div>'
        +'<div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">조율 에너지</div>'
        +'</div>'
        +'</div>'
        +'<p style="font-size:0.95rem; color:#e2e8f0; line-height:1.7; margin-bottom:12px; font-weight:600;">'+(firdariaDynamic.theme || firdariaMain.theme)+'</p>'
        +'<p style="font-size:0.84rem; color:#cbd5e1; line-height:1.65; margin:0 0 10px 0;">'+firdariaPrecisionNote+'</p>'
        +'<div style="background:rgba(167,139,250,0.07); border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid rgba(167,139,250,0.12);">'
        +'<div style="color:#c4b5fd; font-weight:700; margin-bottom:6px; font-size:0.82rem;">📖 심층 해석</div>'
        +'<p style="color:#cbd5e1; line-height:1.7; font-size:0.88rem; margin:0;">'+(firdariaDynamic.detail || firdariaMain.detail)+'</p>'
        +'</div>'
        +'<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">'
        +'<div style="background:rgba(250,204,21,0.07); border-radius:10px; padding:12px; border:1px solid rgba(250,204,21,0.15);">'
        +'<div style="color:#fde68a; font-weight:700; font-size:0.8rem; margin-bottom:5px;">💼 커리어 천기</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.career || firdariaMain.career)+'</p>'
        +'</div>'
        +'<div style="background:rgba(244,114,182,0.07); border-radius:10px; padding:12px; border:1px solid rgba(244,114,182,0.15);">'
        +'<div style="color:#f9a8d4; font-weight:700; font-size:0.8rem; margin-bottom:5px;">💕 연애 & 관계</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.love || firdariaMain.love)+'</p>'
        +'</div>'
        +'</div>'
        +'<div style="background:rgba(239,68,68,0.07); border-radius:10px; padding:12px; margin-bottom:10px; border:1px solid rgba(239,68,68,0.15);">'
        +'<div style="color:#fca5a5; font-weight:700; font-size:0.8rem; margin-bottom:5px;">⚠️ 주의 및 건강</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.caution || firdariaMain.caution)+'</p>'
        +'</div>'
        +'<div style="background:rgba(16,185,129,0.07); border-radius:10px; padding:12px; border:1px solid rgba(16,185,129,0.15);">'
        +'<div style="color:#6ee7b7; font-weight:700; font-size:0.8rem; margin-bottom:5px;">✅ 핵심 행동 조언</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.advice || firdariaMain.advice)+'</p>'
        +'</div>'
        +(function(){
            var comboKey = firdariaMain.kr+'_'+firdariaSubPlanet;
            var comboMsg = FIRDARIA_COMBO[comboKey];
            if(!comboMsg) return '';
            return '<div style="margin-top:10px; background:rgba(139,92,246,0.1); border-radius:10px; padding:12px; border:1px solid rgba(139,92,246,0.3);">'
                +'<div style="color:#a78bfa; font-weight:700; font-size:0.8rem; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">✦ '+firdariaMain.kr+' × '+firdariaSubPlanet+' 콤보 에너지</div>'
                +'<p style="color:#e2e8f0; font-size:0.85rem; line-height:1.65; margin:0;">'+comboMsg+'</p>'
                +'</div>';
        })()
        +'</div>'
        +'</div>'

        /* ── 연간 프로펙션 (실시간) ── */
        +'<div class="astro-section astro-neon-accent astro-neon-accent-cyan">'
        +'<div class="astro-subhead" style="color:#22d3ee;">🌀 연간 프로펙션 (Annual Profection — '+now.getFullYear()+'년)</div>'
        +'<div class="astro-desc">'
        +'<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">'
        +'<div style="flex:1; min-width:110px; background:rgba(34,211,238,0.1); border-radius:10px; padding:12px; border:1px solid rgba(34,211,238,0.25); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#22d3ee; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">올해의 하우스</div>'
        +'<div style="font-size:0.92rem; font-weight:800; color:#a5f3fc;">'+profHouse+'</div>'
        +'</div>'
        +'<div style="flex:1; min-width:100px; background:rgba(34,211,238,0.08); border-radius:10px; padding:12px; border:1px solid rgba(34,211,238,0.2); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#22d3ee; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">지배 별자리</div>'
        +'<div style="font-size:0.92rem; font-weight:800; color:#a5f3fc;">'+profSign+'</div>'
        +'</div>'
        +'<div style="flex:1; min-width:100px; background:rgba(34,211,238,0.08); border-radius:10px; padding:12px; border:1px solid rgba(34,211,238,0.2); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#22d3ee; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">올해의 행성</div>'
        +'<div style="font-size:1.1rem; font-weight:900; color:#67e8f9;">'+profRuler+'</div>'
        +'</div>'
        +'</div>'
        +'<p style="font-size:0.95rem; color:#e2e8f0; line-height:1.7; margin-bottom:12px; font-weight:600;">'+(profectionDynamic.theme || curProfData.theme)+'</p>'
        +'<p style="font-size:0.84rem; color:#cbd5e1; line-height:1.65; margin:0 0 10px 0;">'+profectionPrecisionNote+'</p>'
        +'<div style="background:rgba(34,211,238,0.06); border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid rgba(34,211,238,0.12);">'
        +'<div style="color:#67e8f9; font-weight:700; margin-bottom:6px; font-size:0.82rem;">📖 올해의 메시지</div>'
        +'<p style="color:#cbd5e1; line-height:1.7; font-size:0.88rem; margin:0;">'+(profectionDynamic.detail || curProfData.detail)+'<br><br>'
        +'지배 별자리 <b style="color:#a5f3fc">'+profSign+'</b>의 에너지가 이 하우스 주제를 채색하며, 올해 지배 행성 <b style="color:#67e8f9">'+profRuler+'</b>의 트랜짓 상태가 이 한 해의 실제 흐름을 결정합니다.</p>'
        +'</div>'
        +'<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">'
        +'<div style="background:rgba(250,204,21,0.07); border-radius:10px; padding:12px; border:1px solid rgba(250,204,21,0.15);">'
        +'<div style="color:#fde68a; font-weight:700; font-size:0.8rem; margin-bottom:5px;">💼 커리어 & 재물</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(profectionDynamic.career || curProfData.career)+'</p>'
        +'</div>'
        +'<div style="background:rgba(244,114,182,0.07); border-radius:10px; padding:12px; border:1px solid rgba(244,114,182,0.15);">'
        +'<div style="color:#f9a8d4; font-weight:700; font-size:0.8rem; margin-bottom:5px;">💕 연애 & 인간관계</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(profectionDynamic.love || curProfData.love)+'</p>'
        +'</div>'
        +'</div>'
        +'<div style="background:rgba(16,185,129,0.07); border-radius:10px; padding:12px; border:1px solid rgba(16,185,129,0.15);">'
        +'<div style="color:#6ee7b7; font-weight:700; font-size:0.8rem; margin-bottom:5px;">✅ 이 해를 최대한 활용하는 법</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(profectionDynamic.advice || curProfData.advice)+'</p>'
        +'</div>'
        +'</div>'
        +'</div>'

        +'<div class="astro-expert">'
        +'<div class="expert-title">🗣️ 쌈바 & 연이의 코즈믹 카운슬링 (요약 팩폭)</div>'
        +'<div class="expert-msg">'
        +'<div class="neo-bubble"><strong>[분석가 쌈바 🦁]</strong> "오늘 승부처는 분명합니다. 태양 '+sunHousePair+'와 MC '+mcSign+' 축에서 이름을 드러내고, 토성 '+saturnHousePair+'에서 기본기를 고정하세요. 타이트 각 '+tightAspectText+'은 타이밍 신호예요. <b>'+profHouse+'</b> 프로펙션과 <b>'+firdariaMain.kr+'</b> 타임로드가 겹치는 지금, 준비된 사람만 결과를 크게 가져갑니다."</div>'
        +'<div class="yeon-bubble"><strong>[공감요정 연이 🐷]</strong> "달 <b>'+moonSign+'</b>('+moonHousePair+')은 네 마음 배터리 충전소예요. 불안할수록 여기부터 챙기면 멘탈이 빨리 돌아옵니다. 금성 <b>'+venusSign+'</b>('+venusHousePair+')의 사랑 언어를 솔직하게 말하면 연애 오해가 크게 줄어요. 그리고 <b>'+elemShortNames[elemWeakest]+'</b> 기운을 채워주는 사람/취미를 곁에 두면 하루 체감이 훨씬 좋아져요. 가보자고! 🌸"</div>'
        +'</div>'
        +'</div>'

        +'</div>';

    document.getElementById('astroResult').innerHTML = html;

    /* ── 시나스트리 성궁 진법 초기화 (DOM 삽입 후) ── */
    setTimeout(function() {
        /* userSunIdx: 내 태양 별자리 인덱스 (12궁) */
        var _mySunIdx   = sunIndex;
        var _myVenusIdx = chart.planets.Venus ? chart.planets.Venus.sign.idx : 0;
        var _signs12    = typeof astrologer !== 'undefined' ? astrologer.signs : [];

      /* 점성술 직접 입력: 시/군 단위 도시 선택 → tz/위도/경도 자동 반영 */
      (function initAstroDirectCitySelector(){
        var citySel = document.getElementById('asDirect_city');
        if (!citySel || typeof BIRTH_PLACE_GROUPS === 'undefined') return;

        var hasSeed = citySel.options && citySel.options.length > 1;
        if (!hasSeed) {
          BIRTH_PLACE_GROUPS.forEach(function(group, gi) {
            var og = document.createElement('optgroup');
            og.label = group.label;
            (group.places || []).forEach(function(p, pi) {
              var opt = document.createElement('option');
              opt.value = String(gi) + ':' + String(pi);
              opt.textContent = p.label;
              opt.setAttribute('data-tz-name', p.tz);
              opt.setAttribute('data-base-tz', String(p.tzOff));
              opt.setAttribute('data-lat', String(p.lat));
              opt.setAttribute('data-lon', String(p.lon));
              og.appendChild(opt);
            });
            citySel.appendChild(og);
          });
        }

        citySel.onchange = function() {
          var o = citySel.options[citySel.selectedIndex];
          if (!o || !o.getAttribute('data-lat')) return;
          var tzName = o.getAttribute('data-tz-name') || 'Asia/Seoul';
          var baseTz = parseFloat(o.getAttribute('data-base-tz') || '9');
          var bDate = (document.getElementById('asDirect_date') || {}).value || '';
          var bTime = (document.getElementById('asDirect_time') || {}).value || '12:00';
          var y = 2000, m = 1, d = 1, hh = 12, mm = 0;
          if (bDate) {
            var dp = bDate.split('-');
            y = parseInt(dp[0], 10) || y;
            m = parseInt(dp[1], 10) || m;
            d = parseInt(dp[2], 10) || d;
          }
          if (bTime) {
            var tp = bTime.split(':');
            hh = parseInt(tp[0], 10) || hh;
            mm = parseInt(tp[1], 10) || mm;
          }
          var resolved = resolveBirthTimezoneOffset(y, m, d, hh, mm, tzName, baseTz);
          citySel.setAttribute('data-resolved-tz', String(resolved.tzOffsetHours));
        };

        var directDateEl = document.getElementById('asDirect_date');
        var directTimeEl = document.getElementById('asDirect_time');
        var refreshByCity = function() {
          if (citySel.selectedIndex > 0 && typeof citySel.onchange === 'function') citySel.onchange();
        };
        if (directDateEl) directDateEl.addEventListener('change', refreshByCity);
        if (directTimeEl) directTimeEl.addEventListener('change', refreshByCity);
      })();

        /* ── 내 태양 기준 별자리 인덱스 0-11 추출 헬퍼 ─── */
        function _syGetSunIdx(birth, hour) {
            try {
                var p = birth.split('-');
                var c = calcAstroApiChartOrThrow(+p[0], +p[1], +p[2], hour || 12, 37.6, 127.0, 0, (window.ASTRO_HOUSE_SYSTEM || 'P')); // 유명인은 UTC 기준 (tz=0)
                return { sunIdx: c.sun.idx, venusIdx: c.planets.Venus ? c.planets.Venus.sign.idx : -1,
                         moonIdx: c.moon.idx, marsIdx: c.planets.Mars ? c.planets.Mars.sign.idx : -1,
                         sunSign: c.sun.sign, moonSign: c.moon.sign,
                         venusSign: c.planets.Venus ? c.planets.Venus.sign.sign : '?',
                         marsSign: c.planets.Mars ? c.planets.Mars.sign.sign : '?',
                         sunLon: (c.sun.idx * 30 + (c.sun.deg || 0)),
                         venusLon: c.planets.Venus ? (c.planets.Venus.sign.idx * 30 + (c.planets.Venus.sign.deg || 0)) : -1 };
            } catch(e) { return null; }
        }

        /* ── [🎭 Cosmic Twins] 같은 태양 or 금성 별자리 유명인 ── */
        var twinsDiv = document.getElementById('astroCosmicTwins');
        if (twinsDiv && typeof CELEBS !== 'undefined') {
            var twins = [];
            CELEBS.forEach(function(c) {
                if (twins.length >= 18) return;
                var r = _syGetSunIdx(c.birth, c.hour || 12);
                if (!r) return;
                var matchSun = (r.sunIdx === _mySunIdx);
                var matchVenus = (r.venusIdx === _myVenusIdx && _myVenusIdx >= 0);
                if (!matchSun && !matchVenus) return;
                var flag = (typeof COUNTRY_CONFIG !== 'undefined' && COUNTRY_CONFIG[c.nationality]) ? COUNTRY_CONFIG[c.nationality].flag : '';
                twins.push({ c: c, r: r, matchSun: matchSun, flag: flag });
            });
            if (twins.length === 0) {
                twinsDiv.innerHTML = '<span style="color:#666;font-size:0.8rem;">DB에서 같은 기운의 유명인을 찾지 못했습니다.</span>';
            } else {
                twinsDiv.innerHTML = twins.map(function(t) {
                    var tag = t.matchSun ? '☀ 같은 태양' : '♀ 같은 금성';
                    var tagClr = t.matchSun ? '#fbbf24' : '#f472b6';
                    return '<div onclick="window._astroPickCeleb('+JSON.stringify(t.c.name)+','+JSON.stringify(t.c.birth)+','+(t.c.hour||12)+')" '
                        +'style="cursor:pointer;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);border-radius:20px;padding:5px 11px;font-size:0.75rem;color:#a7f3d0;transition:all 0.2s;" '
                        +'onmouseenter="this.style.background=\'rgba(52,211,153,0.2)\'" onmouseleave="this.style.background=\'rgba(52,211,153,0.08)\'">'
                        + t.flag + ' ' + t.c.name
                        +'<span style="font-size:0.6rem;color:'+tagClr+';margin-left:4px;font-weight:700;">'+tag+'</span>'
                        +'</div>';
                }).join('');
            }
        }

        /* ── [💍 시나스트리] 국가·카테고리·검색 탭 구성 ── */
        var _astroActiveCtry = '';
        var _astroActiveCat  = '';

        function _astroRenderCelebList() {
            if (typeof CELEBS === 'undefined') return;
            var listDiv = document.getElementById('astroSyCelebs');
            if (!listDiv) return;
            var q = (document.getElementById('astroSyQ') || {}).value || '';
            q = q.trim().toLowerCase();
            var filtered = CELEBS.filter(function(c) {
                var ctOk  = !_astroActiveCtry || (c.nationality || 'KR') === _astroActiveCtry;
                var catOk = !_astroActiveCat  || c.cat === _astroActiveCat;
                var nameOk= !q || c.name.toLowerCase().indexOf(q) > -1;
                return ctOk && catOk && nameOk;
            });
            listDiv.innerHTML = '';
            if (filtered.length === 0) {
                listDiv.innerHTML = '<span style="color:#666;font-size:0.8rem;padding:4px;">검색 결과가 없습니다.</span>';
                return;
            }
            filtered.slice(0, 80).forEach(function(c) {
                var flag = (typeof COUNTRY_CONFIG !== 'undefined' && COUNTRY_CONFIG[c.nationality]) ? COUNTRY_CONFIG[c.nationality].flag + ' ' : '';
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = flag + c.name;
                btn.style.cssText = 'padding:5px 11px;border-radius:999px;font-size:0.75rem;font-weight:700;letter-spacing:.01em;border:1px solid rgba(244,114,182,0.34);background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(30,27,75,.78));color:#fbcfe8;cursor:pointer;transition:all 0.2s;white-space:nowrap;font-family:"Space Grotesk","SUIT Variable","Pretendard Variable","Noto Sans KR",sans-serif;';
                btn.onmouseenter = function() { this.style.background='rgba(244,114,182,0.18)'; };
                btn.onmouseleave = function() { this.style.background='linear-gradient(135deg,rgba(15,23,42,.92),rgba(30,27,75,.78))'; };
                btn.onclick = function() {
                  listDiv.querySelectorAll('button').forEach(function(b) { b.style.background='linear-gradient(135deg,rgba(15,23,42,.92),rgba(30,27,75,.78))'; });
                    this.style.background = 'rgba(244,114,182,0.25)';
                    window._astroPickCeleb(c.name, c.birth, c.hour || 12);
                };
                listDiv.appendChild(btn);
            });
            if (filtered.length > 80) {
                var note = document.createElement('span');
                note.style.cssText = 'color:#666;font-size:0.73rem;padding:4px 6px;align-self:center;';
                note.textContent = '외 ' + (filtered.length - 80) + '명';
                listDiv.appendChild(note);
            }
        }

        /* 국가 탭 */
        var ctryDiv = document.getElementById('astroCtryTabs');
        if (ctryDiv && typeof COUNTRY_CONFIG !== 'undefined') {
            function _mkCtryBtn(code, label) {
                var b = document.createElement('button'); b.type = 'button';
                b.textContent = label; b.dataset.c = code;
                var isA = code === '';
                b.style.cssText = 'padding:4px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;border:1px solid rgba(129,140,248,'+(isA?'0.7':'0.3')+');background:rgba(129,140,248,'+(isA?'0.18':'0.04')+');color:'+(isA?'#a5b4fc':'#7f8c8d')+';cursor:pointer;white-space:nowrap;font-family:"Space Grotesk","SUIT Variable","Pretendard Variable","Noto Sans KR",sans-serif;';
                b.onclick = function() {
                    ctryDiv.querySelectorAll('button').forEach(function(x){
                        x.style.background='rgba(129,140,248,0.04)'; x.style.borderColor='rgba(129,140,248,0.3)'; x.style.color='#7f8c8d';
                    });
                    this.style.background='rgba(129,140,248,0.18)'; this.style.borderColor='rgba(129,140,248,0.7)'; this.style.color='#a5b4fc';
                    _astroActiveCtry = this.dataset.c; _astroRenderCelebList();
                };
                return b;
            }
            ctryDiv.appendChild(_mkCtryBtn('', '🌐 전체'));
            Object.entries(COUNTRY_CONFIG).sort(function(a,b){return a[1].order-b[1].order;}).forEach(function(e){
                ctryDiv.appendChild(_mkCtryBtn(e[0], e[1].flag + ' ' + e[1].label));
            });
        }

        /* 카테고리 탭 */
        var catDiv = document.getElementById('astroCatTabs');
        if (catDiv && typeof CELEB_CATS !== 'undefined') {
            var ic = typeof CELEB_CAT_ICONS !== 'undefined' ? CELEB_CAT_ICONS : {};
            ['전체'].concat(CELEB_CATS).forEach(function(c, i) {
                var b = document.createElement('button'); b.type='button'; b.dataset.cat = i===0?'':c;
                b.textContent = (ic[c]||'✨') + ' ' + c;
                b.style.cssText = 'padding:4px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;border:1px solid rgba(244,114,182,'+(i===0?'0.6':'0.25')+');background:rgba(244,114,182,'+(i===0?'0.15':'0.04')+');color:'+(i===0?'#f9a8d4':'#94a3b8')+';cursor:pointer;white-space:nowrap;font-family:"Space Grotesk","SUIT Variable","Pretendard Variable","Noto Sans KR",sans-serif;';
                b.onclick = function() {
                    catDiv.querySelectorAll('button').forEach(function(x){
                        x.style.background='rgba(244,114,182,0.04)'; x.style.borderColor='rgba(244,114,182,0.25)'; x.style.color='#94a3b8';
                    });
                    this.style.background='rgba(244,114,182,0.15)'; this.style.borderColor='rgba(244,114,182,0.6)'; this.style.color='#f9a8d4';
                    _astroActiveCat = this.dataset.cat; _astroRenderCelebList();
                };
                catDiv.appendChild(b);
            });
        }

        /* 검색 입력 */
        var qEl = document.getElementById('astroSyQ');
        if (qEl) qEl.addEventListener('input', _astroRenderCelebList);

        /* 초기 목록 */
        _astroRenderCelebList();
    }, 200);

    /* ── 시나스트리 정밀 계산 공통 유틸 ── */
    function _syNorm(v){ var n = v % 360; return n < 0 ? n + 360 : n; }
    function _syDiff(a,b){ var d = Math.abs(_syNorm(a)-_syNorm(b)); return d > 180 ? 360 - d : d; }
    function _syLonFromSignObj(s){ return (s && s.idx != null && s.deg != null) ? _syNorm(s.idx * 30 + s.deg) : null; }
    function _syPlanetLon(chartObj, key){
      if(key === 'Sun') return _syLonFromSignObj(chartObj.sun);
      if(key === 'Moon') return _syLonFromSignObj(chartObj.moon);
      var p = chartObj.planets && chartObj.planets[key] ? chartObj.planets[key].sign : null;
      return _syLonFromSignObj(p);
    }
    function _sySignIdx(chartObj, key){
      if(key === 'Sun') return (chartObj.sun && chartObj.sun.idx != null) ? chartObj.sun.idx : null;
      if(key === 'Moon') return (chartObj.moon && chartObj.moon.idx != null) ? chartObj.moon.idx : null;
      return (chartObj.planets && chartObj.planets[key] && chartObj.planets[key].sign && chartObj.planets[key].sign.idx != null)
        ? chartObj.planets[key].sign.idx : null;
    }
    function _sySignName(chartObj, key){
      if(key === 'Sun') return chartObj.sun ? chartObj.sun.sign : '?';
      if(key === 'Moon') return chartObj.moon ? chartObj.moon.sign : '?';
      return (chartObj.planets && chartObj.planets[key] && chartObj.planets[key].sign) ? chartObj.planets[key].sign.sign : '?';
    }
    function _syAspect(diff){
      var defs = [
        {deg:0, name:'합(Conjunction)', symbol:'☌', maxOrb:8, base:10, color:'#fbbf24'},
        {deg:60, name:'육합(Sextile)', symbol:'⚹', maxOrb:4, base:5, color:'#34d399'},
        {deg:90, name:'직각(Square)', symbol:'□', maxOrb:6, base:-6, color:'#f87171'},
        {deg:120, name:'삼합(Trine)', symbol:'△', maxOrb:6, base:8, color:'#818cf8'},
        {deg:150, name:'퀸컨스(Quincunx)', symbol:'⚻', maxOrb:3, base:-2, color:'#fb923c'},
        {deg:180, name:'충(Opposition)', symbol:'☍', maxOrb:7, base:-5, color:'#fb923c'}
      ];
      for(var i=0;i<defs.length;i++){
        var orb = Math.abs(diff - defs[i].deg);
        if(orb <= defs[i].maxOrb){
          return {
            name: defs[i].name,
            symbol: defs[i].symbol,
            orb: orb,
            maxOrb: defs[i].maxOrb,
            base: defs[i].base,
            color: defs[i].color
          };
        }
      }
      return null;
    }
    function _syPairWeight(a,b){
      var k = [a,b].sort().join('-');
      var map = {
        'Moon-Sun':1.55,
        'Mars-Venus':1.45,
        'Sun-Sun':1.2,
        'Moon-Moon':1.2,
        'Moon-Venus':1.2,
        'Moon-Mars':1.15,
        'Sun-Venus':1.1,
        'Sun-Mars':1.1,
        'Mars-Mars':1.0,
        'Venus-Venus':1.0
      };
      return map[k] || 0.9;
    }
    function _syScore(myChart, otherChart){
      function _syOverlayTuning(){
        var mode = (typeof window !== 'undefined' && window._SY_OV_TUNE) ? String(window._SY_OV_TUNE) : 'balanced';
        var preset = {
          soft:{ posMul:0.72, negMul:0.68, scale:0.75, maxPerDir:2.2, mode:'soft' },
          balanced:{ posMul:0.90, negMul:0.82, scale:0.85, maxPerDir:2.4, mode:'balanced' },
          aggressive:{ posMul:1.12, negMul:1.00, scale:1.00, maxPerDir:2.8, mode:'aggressive' }
        };
        return preset[mode] || preset.balanced;
      }
      var ovTune = _syOverlayTuning();
      var keys = ['Sun','Moon','Venus','Mars'];
      var labels = {Sun:'☀ 태양',Moon:'☽ 달',Venus:'♀ 금성',Mars:'♂ 화성'};
      var rows = [];
      var score = 0;
      var maxAbs = 0;
      for(var i=0;i<keys.length;i++){
        for(var j=0;j<keys.length;j++){
          var mk = keys[i], ok = keys[j];
          var ml = _syPlanetLon(myChart, mk), ol = _syPlanetLon(otherChart, ok);
          if(ml == null || ol == null) continue;
          var d = _syDiff(ml, ol);
          var asp = _syAspect(d);
          var w = _syPairWeight(mk, ok);
          maxAbs += 10 * w;
          if(!asp) continue;
          var tightness = 1 - (asp.orb / asp.maxOrb) * 0.35;
          var s = asp.base * w * tightness;
          score += s;
          rows.push({
            pair: '내 ' + labels[mk] + ' × 상대 ' + labels[ok],
            asp: asp,
            weighted: s
          });
        }
      }
      function _ovBonus(h, pn){
        var t = {
          Sun:{5:1.6,7:2.4,8:2.0,11:1.2,12:-0.8},
          Moon:{4:1.4,5:1.2,7:2.6,8:2.2,12:-1.0},
          Venus:{2:1.0,5:2.0,7:2.8,8:2.4,12:-0.9},
          Mars:{5:1.2,6:-0.8,7:1.2,8:1.8,12:-1.1}
        };
        var base = (t[pn] && t[pn][h]) ? t[pn][h] : 0;
        if(base === 0) return 0;
        var mul = base > 0 ? ovTune.posMul : ovTune.negMul;
        return base * mul * ovTune.scale;
      }
      var ovPlanets = ['Sun','Moon','Venus','Mars'];
      var ovScore = 0;
      var ovMax = 0;
      var ascMy = (myChart.asc && myChart.asc.idx != null) ? myChart.asc.idx : null;
      var ascOt = (otherChart.asc && otherChart.asc.idx != null) ? otherChart.asc.idx : null;
      for(var oi=0; oi<ovPlanets.length; oi++){
        var pn = ovPlanets[oi];
        var myIdx = _sySignIdx(myChart, pn);
        var otIdx = _sySignIdx(otherChart, pn);
        var hMyToOt = _syWsHouseOf(myIdx, ascOt);
        var hOtToMy = _syWsHouseOf(otIdx, ascMy);
        var b1 = _ovBonus(hMyToOt, pn);
        var b2 = _ovBonus(hOtToMy, pn);
        ovScore += b1 + b2;
        ovMax += ovTune.maxPerDir * 2;
      }

      score += ovScore;
      maxAbs += ovMax;

      rows.sort(function(a,b){ return a.asp.orb - b.asp.orb; });
      var syn = maxAbs > 0 ? Math.round(50 + (score / maxAbs) * 50) : 50;
      syn = Math.max(0, Math.min(100, syn));
      var ovNorm = ovMax > 0 ? (ovScore / ovMax) : 0;
      return { score: syn, rows: rows, rawScore: score, maxAbs: maxAbs, overlayScore: ovScore, overlayNorm: ovNorm, overlayMode: ovTune.mode };
    }
    function _syElementOfSignIdx(idx){
      var arr = ['불','흙','공기','물','불','흙','공기','물','불','흙','공기','물'];
      return arr[idx % 12];
    }
    function _syWsHouseOf(planetSignIdx, ascIdx){
      if(planetSignIdx == null || ascIdx == null) return null;
      return ((planetSignIdx - ascIdx + 12) % 12) + 1;
    }
    function _syHouseTheme(h){
      var map = {
        1:'정체성/첫인상',2:'가치/재정',3:'소통/이동',4:'가정/정서기반',
        5:'연애/창조성',6:'일상/건강',7:'파트너십',8:'친밀감/공동자원',
        9:'신념/확장',10:'사회적 목표',11:'우정/커뮤니티',12:'무의식/치유'
      };
      return map[h] || '해석 불가';
    }
    function _syTopAspectText(rows, positive){
      var arr = (rows || []).filter(function(r){ return positive ? r.weighted > 0 : r.weighted < 0; })
        .sort(function(a,b){ return Math.abs(b.weighted) - Math.abs(a.weighted); });
      if(!arr.length) return positive ? '강한 조화각 없음' : '강한 긴장각 없음';
      var r0 = arr[0];
      return r0.pair + ' · ' + r0.asp.name + ' · orb ' + r0.asp.orb.toFixed(2) + '°';
    }
    function _syTopAspect(rows, positive){
      var arr = (rows || []).filter(function(r){ return positive ? r.weighted > 0 : r.weighted < 0; })
        .sort(function(a,b){ return Math.abs(b.weighted) - Math.abs(a.weighted); });
      return arr.length ? arr[0] : null;
    }
    function _syBuildNarrative(meta){
      var score = meta.score || 50;
      var rel;
      if(score >= 85) rel = '찰떡 합 인연 - 마음, 가치관, 행동 템포가 고르게 잘 맞아요.';
      else if(score >= 70) rel = '함께 성장하는 인연 - 기본 궁합이 좋고, 갈등도 잘 풀 수 있는 조합입니다.';
      else if(score >= 55) rel = '밀당형 인연 - 끌림도 크고 부딪힘도 있어, 운영 방식이 중요해요.';
      else if(score >= 40) rel = '연습이 필요한 인연 - 서로 맞추는 대화와 규칙이 꼭 필요합니다.';
      else rel = '숙제 많은 인연 - 경계 설정과 합의가 없으면 쉽게 지칠 수 있어요.';

      var supportTxt = meta.support ? (meta.support.pair + ' ' + meta.support.asp.name) : '뚜렷한 조화각 없음';
      var challengeTxt = meta.challenge ? (meta.challenge.pair + ' ' + meta.challenge.asp.name) : '뚜렷한 긴장각 없음';
      var sunStage = meta.mySunHouse ? (meta.mySunHouse+'H('+_syHouseTheme(meta.mySunHouse)+')') : '-';
      var moonStage = meta.myMoonHouse ? (meta.myMoonHouse+'H('+_syHouseTheme(meta.myMoonHouse)+')') : '-';
      var venusStage = meta.myVenusHouse ? (meta.myVenusHouse+'H('+_syHouseTheme(meta.myVenusHouse)+')') : '-';
      var h78Boost = (meta.overlayNorm != null && meta.overlayNorm > 0.14)
        ? '7H/8H 투사가 강해 관계의 몰입도와 변환 강도가 큽니다.'
        : (meta.overlayNorm != null && meta.overlayNorm < -0.08)
          ? '12H/6H 압력이 커서 관계 피로 수호가 핵심 과제입니다.'
          : '7H/8H와 일상 하우스가 균형적이라 운행 역량이 성패를 가릅니다.';

      var love = '연애에서는 '+supportTxt+'이 설렘을 키우고, '+challengeTxt+'이 다툼 포인트가 되기 쉬워요. '
        +'내 금성 '+venusStage+'과 달 '+moonStage+'의 감정 포인트를 먼저 맞추면 만족도가 확 올라갑니다.';
      var busi = '협업에서는 내 태양 투사 하우스 '+sunStage+'가 메인 무대입니다. '
        +'역할과 책임을 하우스 주제에 맞춰 나누면 성과는 안정되고 에너지 소모는 줄어듭니다.';
      var spirit = '관계의 성장 포인트는 '+meta.myElem+'-'+meta.theirElem+' 조합에서 드러납니다. '+h78Boost+' '
        +'점수 '+score+'/100 구간에서는 "감정 정리 루틴 + 갈등 복기 규칙"을 같이 만들수록 관계가 빨리 좋아집니다.';

      return { relType: rel, loveDesc: love, busDesc: busi, spiritDesc: spirit };
    }

    /* ── 유명인 선택 → 시나스트리 결과 계산 ── */
    window._astroPickCeleb = function(name, birth, hour) {
        /* 50코인 퍼유즈 게이트 */
        if (typeof window._cdCoinGatePerUse === 'function') {
          window._cdCoinGatePerUse(50, '점성술 셜럭 시나스트리 궁합', function() {
            window._astroPickCelebCore(name, birth, hour);
          });
          return;
        }
        // ⚠️ 미로그인 상태: _cdCoinGatePerUse 미정의
        var token = '';
        try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
        if (!token) {
          if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) {
            window.location.href = '/login?next=%2F';
          }
          return;
        }
        window.alert('서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
    };
    window._astroPickCelebCore = function(name, birth, hour) {
        var resultDiv = document.getElementById('astroSyResult');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="astro-neon-syn-wrap"><div class="astro-neon-syn-top"><div class="astro-neon-syn-title">🌌 셀럽 시나스트리 계산중</div><span class="astro-neon-syn-chip">Deep Universe</span></div><div class="astro-syn-loading">우주 좌표 싱크 중... 지금 별의 각도와 하우스 오버레이를 맞춰서 케미 지도를 만들고 있어요.</div></div>';

        setTimeout(function() {
            try {
                var p = birth.split('-');
                var celebRec = (typeof CELEBS !== 'undefined') ? (CELEBS.find(function(x){ return x.name === name; }) || null) : null;
                var geoByNat = {
                  KR:{lat:37.5665, lon:126.9780, tz:9},
                  JP:{lat:35.6762, lon:139.6503, tz:9},
                  CN:{lat:39.9042, lon:116.4074, tz:8},
                  US:{lat:40.7128, lon:-74.0060, tz:-5},
                  IN:{lat:28.6139, lon:77.2090, tz:5.5},
                  EU:{lat:48.8566, lon:2.3522, tz:1}
                };
                var nat = celebRec && celebRec.nationality ? celebRec.nationality : 'KR';
                var hasExactGeo = !!(celebRec && celebRec.birthGeo && celebRec.birthGeo.lat != null && celebRec.birthGeo.lon != null && celebRec.birthGeo.tz != null);
                var g = hasExactGeo ? celebRec.birthGeo : (geoByNat[nat] || geoByNat.KR);
                var hC = (celebRec && celebRec.hour != null) ? celebRec.hour : hour;
                var mC = (celebRec && celebRec.minute != null) ? celebRec.minute : 0;
                var celebChart = calcAstroApiChartOrThrow(+p[0], +p[1], +p[2], (hC || 12) + (mC || 0) / 60, g.lat, g.lon, g.tz, (window.ASTRO_HOUSE_SYSTEM || 'P'));
                var celebSunIdx   = _sySignIdx(celebChart, 'Sun') || 0;
                var celebMoonIdx  = _sySignIdx(celebChart, 'Moon') || 0;
                var celebVenusIdx = _sySignIdx(celebChart, 'Venus') || 0;
                var celebMarsIdx  = _sySignIdx(celebChart, 'Mars') || 0;
                var celebSunSign  = _sySignName(celebChart, 'Sun');
                var celebMoonSign = _sySignName(celebChart, 'Moon');
                var celebVSign    = _sySignName(celebChart, 'Venus');
                var celebMSign    = _sySignName(celebChart, 'Mars');

                var synRes = _syScore(chart, celebChart);
                var aspectRows = synRes.rows;
                var synScore = synRes.score;
                var scoreColor = synScore >= 80 ? '#2ed573' : synScore >= 55 ? '#f39c12' : '#ff4757';

                /* ── 빛과 그림자 키워드 ── */
                var myElem = _syElementOfSignIdx(sunIndex);
                var theirElem = _syElementOfSignIdx(celebSunIdx);
                var SHADOW = {
                    '불-불': { light:'✧ 불꽃 같은 열정과 에너지가 증폭', shadow:'✦ 둘 다 리더 기질, 주도권 충돌 주의', remedy:'서로의 에너지를 경쟁이 아닌 창조로 승화시키세요' },
                    '불-흙': { light:'✧ 열정+현실감각의 이상적 조합',    shadow:'✦ 속도 차이 — 불은 빠르고 흙은 느립니다', remedy:'페이스 조율: 행동 전 충분한 논의가 신뢰를 만듭니다' },
                    '불-공기':{ light:'✧ 창의적 영감이 폭발하는 관계',   shadow:'✦ 감정보다 언어, 피상적 교류에 머물 수 있음', remedy:'진심을 담은 깊은 대화 시간을 의도적으로 만드세요' },
                    '불-물': { light:'✧ 열정과 감성의 조화, 강렬한 끌림',shadow:'✦ 기질 충돌 — 불은 이성적, 물은 감성적', remedy:'감정 언어를 배우세요. 공감 표현이 모든 갈등을 녹입니다' },
                    '흙-흙': { light:'✧ 안정·신뢰·현실적 성취의 최강 조합',shadow:'✦ 변화를 두려워해 정체될 수 있음',      remedy:'새로운 경험을 함께 도전하며 관계에 신선함을 부어주세요' },
                    '흙-공기':{ light:'✧ 실행력과 아이디어의 완벽 균형', shadow:'✦ 가치관 차이, 물질 vs 이상',            remedy:'서로의 세계관을 존중하며 다름 속에서 시너지를 찾으세요' },
                    '흙-물': { light:'✧ 포용과 안정의 따뜻한 울타리',    shadow:'✦ 물이 흙을 무겁게 만들 수 있음',       remedy:'감정을 실용적으로 표현하면 관계가 훨씬 원활해집니다' },
                    '공기-공기':{ light:'✧ 지적 교류와 자유의 완벽 공명', shadow:'✦ 감정적 깊이 부족, 표면에 머물 수 있음', remedy:'서로의 취약함을 드러내는 용기가 진정한 연결을 만듭니다' },
                    '공기-물': { light:'✧ 이성과 감성의 상호 보완',       shadow:'✦ 감정 표현 방식의 차이',               remedy:'공기는 더 많이 표현하고, 물은 더 많이 이해하는 연습이 필요합니다' },
                    '물-물': { light:'✧ 영적·감정적 완벽 공명',           shadow:'✦ 감정 소용돌이에 빠질 수 있음',        remedy:'현실적 구조와 경계를 함께 만들어 감정을 조율하세요' }
                };
                var shadowKey = [myElem, theirElem].sort().join('-');
                var shadowInfo = SHADOW[shadowKey] || { light:'✧ 두 에너지가 독특한 조화를 이룹니다', shadow:'✦ 서로의 다름을 이해하는 과정이 필요합니다', remedy:'공통 관심사를 늘리며 천천히 신뢰를 쌓아가세요' };

                var hasExactTime = !!(celebRec && (celebRec.timeKnown === true || ((celebRec.hour != null && celebRec.minute != null) && (celebRec.hour !== 12 || celebRec.minute !== 0))));
                var isUnknownTime = !hasExactTime;
                var flag = (typeof COUNTRY_CONFIG !== 'undefined' && COUNTRY_CONFIG[(celebRec || {}).nationality]) ? COUNTRY_CONFIG[(celebRec || {}).nationality].flag + ' ' : '';
                var geoMetaText = hasExactGeo
                  ? ('📍 ' + (g.label || '출생도시') + ' 좌표 적용')
                  : ('📍 ' + ((COUNTRY_CONFIG[nat] && COUNTRY_CONFIG[nat].label) ? COUNTRY_CONFIG[nat].label : '국가') + ' 대표도시 좌표 적용');
                var myAscIdx = _sySignIdx(chart, 'Sun') != null ? ascIndex : null;
                var celebAscIdx = celebChart.asc && celebChart.asc.idx != null ? celebChart.asc.idx : null;
                var overlayMySunToTheir = _syWsHouseOf(sunIndex, celebAscIdx);
                var overlayTheirSunToMy = _syWsHouseOf(celebSunIdx, myAscIdx);
                var myMoonIdx = _sySignIdx(chart, 'Moon');
                var celebMoonIdx2 = _sySignIdx(celebChart, 'Moon');
                var overlayMyMoonToTheir = _syWsHouseOf(myMoonIdx, celebAscIdx);
                var overlayTheirMoonToMy = _syWsHouseOf(celebMoonIdx2, myAscIdx);
                var myVenusIdx = _sySignIdx(chart, 'Venus');
                var celebVenusIdx2 = _sySignIdx(celebChart, 'Venus');
                var overlayMyVenusToTheir = _syWsHouseOf(myVenusIdx, celebAscIdx);
                var overlayTheirVenusToMy = _syWsHouseOf(celebVenusIdx2, myAscIdx);
                var synRaw = synRes.rawScore || 0;
                var synMax = synRes.maxAbs || 0;
                var overlayScore = synRes.overlayScore || 0;
                var overlayNorm = synRes.overlayNorm || 0;
                var overlayMode = synRes.overlayMode || 'balanced';
                var synConfidence = synMax > 0 ? Math.min(99, Math.round((Math.abs(synRaw) / synMax) * 100)) : 0;
                var bestSupport = _syTopAspectText(aspectRows, true);
                var bestChallenge = _syTopAspectText(aspectRows, false);
                var topSupportRow = _syTopAspect(aspectRows, true);
                var topChallengeRow = _syTopAspect(aspectRows, false);
                var synNarr = _syBuildNarrative({
                  score: synScore,
                  support: topSupportRow,
                  challenge: topChallengeRow,
                  mySunHouse: overlayMySunToTheir,
                  myMoonHouse: overlayMyMoonToTheir,
                  myVenusHouse: overlayMyVenusToTheir,
                  overlayScore: overlayScore,
                  overlayNorm: overlayNorm,
                  myElem: myElem,
                  theirElem: theirElem
                });
                var relType = synNarr.relType;
                var loveDesc = synNarr.loveDesc;
                var busDesc = synNarr.busDesc;
                var spiritDesc = synNarr.spiritDesc;

                /* ── HTML 렌더 ── */
                var html2 = '<div class="astro-neon-syn-wrap"><div class="astro-neon-syn-top"><div class="astro-neon-syn-title">🌌 셀럽 시나스트리 리포트</div><span class="astro-neon-syn-chip">네온 궁합 모드</span></div><p class="astro-neon-mz-tip">오늘의 별자리 브리핑 톤 그대로 적용했어요. 점수는 내비게이션, 진짜 키는 대화 템포와 감정 회복 루틴입니다.</p>';
                html2 += '<div class="astro-syn-quick"><div class="astro-syn-quick-title">Quick Read</div><ul><li><b>현재 관계 결:</b> '+relType+'</li><li><b>강점 각도:</b> '+bestSupport+'</li><li><b>보완 포인트:</b> '+bestChallenge+'</li></ul></div>';

                /* 헤더 */
                html2 += '<div class="astro-syn-header">'
                    +'<div class="astro-syn-name">' + flag + name + '</div>'
                    +'<div class="astro-syn-pill">'+ celebSunSign + ' ☀</div>'
                  +'<div class="astro-syn-meta">'+geoMetaText+'</div>'
                    + (isUnknownTime ? '<div class="astro-syn-meta">⚠ 태어난 시간이 정확하지 않아 달/상승궁/하우스는 오차가 있을 수 있어요</div>' : '')
                    +'</div>';

                /* 스코어 + 상대 나탈 */
                html2 += '<div class="astro-syn-score-row">'
                  +'<div class="astro-syn-score-card">'
                  +'<div class="astro-syn-score-label">시나스트리</div>'
                  +'<div class="astro-syn-score-val" style="color:'+scoreColor+';">'+synScore+'</div>'
                  +'<div class="astro-syn-score-unit">/100</div>'
                    +'</div>'
                  +'<div class="astro-syn-summary">'
                  +'<div class="astro-syn-type">'+relType+'</div>'
                  +'<div class="astro-syn-sign-grid">'
                  +'<div class="astro-syn-sign-item sun"><span style="color:#94a3b8;">☀</span> '+celebSunSign+'</div>'
                  +'<div class="astro-syn-sign-item moon"><span style="color:#94a3b8;">☽</span> '+celebMoonSign+'</div>'
                  +'<div class="astro-syn-sign-item venus"><span style="color:#94a3b8;">♀</span> '+celebVSign+'</div>'
                  +'<div class="astro-syn-sign-item mars"><span style="color:#94a3b8;">♂</span> '+celebMSign+'</div>'
                    +'</div>'
                    +'</div>'
                    +'</div></div>';

                /* 관계 분석 3종 */
                html2 += '<div class="astro-syn-triple">'
                  +'<div class="astro-syn-card love"><h5>💕 연애 궁합</h5><p>'+loveDesc+'</p></div>'
                  +'<div class="astro-syn-card work"><h5>🤝 비즈니스 궁합</h5><p>'+busDesc+'</p></div>'
                  +'<div class="astro-syn-card spirit"><h5>✨ 영적 궁합</h5><p>'+spiritDesc+'</p></div>'
                    +'</div>';

                html2 += '<div class="astro-syn-data">'
                  +'<div class="astro-syn-data-title">📊 점수는 이렇게 계산돼요</div>'
                  +'<div class="astro-syn-data-copy">'
                  +'정규화 점수: <b>'+synScore+'</b>/100 · 가중 합산: <b>'+synRaw.toFixed(2)+'</b> / 최대 '+synMax.toFixed(2)+'<br>'
                  +'하우스 오버레이 보정(7H/8H 포함): <b>'+overlayScore.toFixed(2)+'</b> · 영향도 '+(overlayNorm*100).toFixed(1)+'% ('+overlayMode+')<br>'
                  +'해석 신뢰도(각도 데이터 기준): <b>'+synConfidence+'%</b><br>'
                  +'가장 강한 조화: '+bestSupport+'<br>'
                  +'가장 강한 긴장: '+bestChallenge
                  +'</div>'
                  +'</div>';

                /* 결정적 각도 테이블 */
                if (aspectRows.length > 0) {
                    html2 += '<div style="margin-bottom:12px;">'
                      +'<div class="astro-syn-aspects-title">⚡ 결정적 각도 (Major Aspects)</div>'
                      +'<div class="astro-syn-aspects">';
                    aspectRows.slice(0, 8).forEach(function(r) {
                      html2 += '<div class="astro-syn-aspect">'
                            +'<span style="font-size:1rem;color:'+r.asp.color+';">'+r.asp.symbol+'</span>'
                        +'<span class="astro-syn-aspect-main">'+r.pair+'</span>'
                      +'<span style="font-size:0.68rem;background:rgba('+( r.weighted>0?'52,211,153':'239,68,68' )+',0.15);color:'+r.asp.color+';padding:2px 7px;border-radius:10px;">'+r.asp.name+' · orb '+r.asp.orb.toFixed(2)+'°</span>'
                            +'</div>';
                    });
                    html2 += '</div></div>';
                }

                html2 += '<div class="astro-syn-overlay">'
                  +'<div class="astro-syn-overlay-title">🏠 하우스 겹침 보기 (별자리 기준)</div>'
                  +'<div class="astro-syn-overlay-copy">'
                  +'내 태양(☀)이 상대 차트의 <b>'+(overlayMySunToTheir ? overlayMySunToTheir + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 태양(☀)이 내 차트의 <b>'+(overlayTheirSunToMy ? overlayTheirSunToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 달(☽)이 상대 차트의 <b>'+(overlayMyMoonToTheir ? overlayMyMoonToTheir + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 달(☽)이 내 차트의 <b>'+(overlayTheirMoonToMy ? overlayTheirMoonToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 금성(♀)이 상대 차트의 <b>'+(overlayMyVenusToTheir ? overlayMyVenusToTheir + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 금성(♀)이 내 차트의 <b>'+(overlayTheirVenusToMy ? overlayTheirVenusToMy + 'H' : '-')+'</b>에 투사'
                  +'</div>'
                  +'<div class="astro-syn-overlay-tip">'
                  +'태양 투사 하우스는 관계의 중심 무대(자아/목표)를, 금성 투사 하우스는 애정 표현과 호감 작동 영역을 보여줍니다. '
                  +(overlayMySunToTheir ? ('내 태양은 상대의 '+overlayMySunToTheir+'H('+_syHouseTheme(overlayMySunToTheir)+')에 강하게 작동합니다. ') : '')
                  +(overlayTheirSunToMy ? ('상대 태양은 내 '+overlayTheirSunToMy+'H('+_syHouseTheme(overlayTheirSunToMy)+')를 자극합니다.') : '')
                  +'</div>'
                  +'</div>';

                /* 빛과 그림자 */
                html2 += '<div class="astro-syn-shadow">'
                  +'<div class="astro-syn-shadow-title">⚖️ 빛과 그림자</div>'
                  +'<div class="astro-syn-shadow-good">'+shadowInfo.light+'</div>'
                  +'<div class="astro-syn-shadow-bad">'+shadowInfo.shadow+'</div>'
                  +'<div class="astro-syn-shadow-remedy">'
                    +'🌿 <b>개선의 길</b>: '+shadowInfo.remedy
                    +'</div>'
                    +'</div>'
                    +'</div>';

                resultDiv.innerHTML = html2;
                resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch(e) {
                resultDiv.innerHTML = '<div class="astro-neon-syn-wrap"><div style="color:#fda4af;font-size:0.85rem;">시나스트리 계산 중 오류가 발생했습니다: ' + (e.message || e) + '</div></div>';
            }
        }, 50);
    };

    /* ── 💑 직접 입력 시나스트리 계산 함수 ── */
    window._astroDirectSynastry = function() {
        /* 50코인 퍼유즈 게이트 */
        if (typeof window._cdCoinGatePerUse === 'function') {
          window._cdCoinGatePerUse(50, '점성술 직접 입력 시나스트리 궁합', function() {
            window._astroDirectSynastryCore();
          });
          return;
        }
        // ⚠️ 미로그인 상태: _cdCoinGatePerUse 미정의
        var token = '';
        try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
        if (!token) {
          if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) {
            window.location.href = '/login?next=%2F';
          }
          return;
        }
        window.alert('서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
    };
    window._astroDirectSynastryCore = function() {
        var resultDiv = document.getElementById('asDirectResult');
        if (!resultDiv) return;

        var nameVal = (document.getElementById('asDirect_name') || {}).value || '상대방';
        var dateVal = (document.getElementById('asDirect_date') || {}).value;
        var timeVal = (document.getElementById('asDirect_time') || {}).value || '12:00';
        var cityEl  = document.getElementById('asDirect_city');
        var tzVal   = 9;
        var latVal  = (lat != null) ? Number(lat) : 37.5665;
        var lonVal  = (lon != null) ? Number(lon) : 126.9780;

        if (!dateVal) {
            resultDiv.innerHTML = '<div class="astro-neon-syn-wrap"><div style="color:#fda4af;font-size:0.85rem;padding:4px 0;">⚠ 상대방의 생년월일을 입력해 주세요.</div></div>';
            return;
        }

          resultDiv.innerHTML = '<div class="astro-neon-syn-wrap"><div class="astro-neon-syn-top"><div class="astro-neon-syn-title">💫 직접 입력 시나스트리 계산중</div><span class="astro-neon-syn-chip">럭키비키 분석</span></div><div class="astro-syn-loading">행성 각도, 오브, 하우스 겹침까지 계산 중이에요. 잠깐만요, 케미 지도 곧 오픈됩니다.</div></div>';

        setTimeout(async function() {
            try {
                var dp = dateVal.split('-');
                var tp = timeVal.split(':');
              var py = parseInt(dp[0], 10);
              var pm = parseInt(dp[1], 10);
              var pd = parseInt(dp[2], 10);
              var ph = parseInt(tp[0], 10);
              var pmin = parseInt(tp[1] || '0', 10);

              if (cityEl && cityEl.selectedIndex > 0) {
                var cOpt = cityEl.options[cityEl.selectedIndex];
                if (cOpt) {
                  var tzName = cOpt.getAttribute('data-tz-name') || 'Asia/Seoul';
                  var baseTz = parseFloat(cOpt.getAttribute('data-base-tz') || '9');
                  latVal = parseFloat(cOpt.getAttribute('data-lat') || String(latVal));
                  lonVal = parseFloat(cOpt.getAttribute('data-lon') || String(lonVal));
                  var tzResolved = resolveBirthTimezoneOffset(py, pm, pd, ph, pmin, tzName, baseTz);
                  tzVal = tzResolved.tzOffsetHours;
                }
              }

              try {
                var directCtx = await resolveKasiDateContextSafe({
                  calendarType: 'solar',
                  year: py,
                  month: pm,
                  day: pd,
                  hour: ph,
                  minute: pmin,
                  second: 0,
                  latitude: latVal,
                  longitude: lonVal,
                  tzOffsetHours: tzVal
                }, { setCurrent: false });
                if (directCtx && directCtx.solar) {
                  py = directCtx.solar.year || py;
                  pm = directCtx.solar.month || pm;
                  pd = directCtx.solar.day || pd;
                }
              } catch (ctxErr) {
                console.warn('[AstroDirect] KASI context fallback:', ctxErr);
              }

                var localHour = parseInt(tp[0], 10) + parseInt(tp[1] || '0', 10) / 60;
                var partnerChart = calcAstroApiChartOrThrow(py, pm, pd, localHour, latVal, lonVal, tzVal, (window.ASTRO_HOUSE_SYSTEM || 'P'));

                var pSunIdx   = _sySignIdx(partnerChart, 'Sun') || 0;
                var pMoonIdx  = _sySignIdx(partnerChart, 'Moon') || 0;
                var pVenusIdx = _sySignIdx(partnerChart, 'Venus') || pSunIdx;
                var pMarsIdx  = _sySignIdx(partnerChart, 'Mars') || pSunIdx;
                var pSunSign  = _sySignName(partnerChart, 'Sun');
                var pMoonSign = _sySignName(partnerChart, 'Moon');
                var pVSign    = _sySignName(partnerChart, 'Venus');
                var pMSign    = _sySignName(partnerChart, 'Mars');

                var synRes2 = _syScore(chart, partnerChart);
                var aspectRows2 = synRes2.rows;
                var synScore2 = synRes2.score;
                var scoreColor2 = synScore2 >= 80 ? '#2ed573' : synScore2 >= 55 ? '#f39c12' : '#ff4757';

                var myElem2 = _syElementOfSignIdx(sunIndex);
                var theirElem2 = _syElementOfSignIdx(pSunIdx);
                var SHADOW2 = {
                    '불-불':     { light:'✧ 불꽃 같은 열정과 에너지가 증폭',     shadow:'✦ 둘 다 리더 기질, 주도권 충돌 주의',        remedy:'서로의 에너지를 경쟁이 아닌 창조로 승화시키세요' },
                    '불-흙':     { light:'✧ 열정+현실감각의 이상적 조합',         shadow:'✦ 속도 차이 — 불은 빠르고 흙은 느립니다',     remedy:'페이스 조율: 행동 전 충분한 논의가 신뢰를 만듭니다' },
                    '불-공기':   { light:'✧ 창의적 영감이 폭발하는 관계',         shadow:'✦ 감정보다 언어, 피상적 교류에 머물 수 있음', remedy:'진심을 담은 깊은 대화 시간을 의도적으로 만드세요' },
                    '불-물':     { light:'✧ 열정과 감성의 조화, 강렬한 끌림',     shadow:'✦ 기질 충돌 — 불은 이성적, 물은 감성적',      remedy:'감정 언어를 배우세요. 공감 표현이 모든 갈등을 녹입니다' },
                    '흙-흙':     { light:'✧ 안정·신뢰·현실적 성취의 최강 조합',   shadow:'✦ 변화를 두려워해 정체될 수 있음',             remedy:'새로운 경험을 함께 도전하며 관계에 신선함을 부어주세요' },
                    '흙-공기':   { light:'✧ 실행력과 아이디어의 완벽 균형',       shadow:'✦ 가치관 차이, 물질 vs 이상',                  remedy:'서로의 세계관을 존중하며 다름 속에서 시너지를 찾으세요' },
                    '흙-물':     { light:'✧ 포용과 안정의 따뜻한 울타리',         shadow:'✦ 물이 흙을 무겁게 만들 수 있음',              remedy:'감정을 실용적으로 표현하면 관계가 훨씬 원활해집니다' },
                    '공기-공기': { light:'✧ 지적 교류와 자유의 완벽 공명',        shadow:'✦ 감정적 깊이 부족, 표면에 머물 수 있음',      remedy:'서로의 취약함을 드러내는 용기가 진정한 연결을 만듭니다' },
                    '공기-물':   { light:'✧ 이성과 감성의 상호 보완',             shadow:'✦ 감정 표현 방식의 차이',                      remedy:'공기는 더 많이 표현하고, 물은 더 많이 이해하는 연습이 필요합니다' },
                    '물-물':     { light:'✧ 영적·감정적 완벽 공명',               shadow:'✦ 감정 소용돌이에 빠질 수 있음',               remedy:'현실적 구조와 경계를 함께 만들어 감정을 조율하세요' }
                };
                var shadowKey2 = [myElem2, theirElem2].sort().join('-');
                var shadowInfo2 = SHADOW2[shadowKey2] || { light:'✧ 두 에너지가 독특한 조화를 이룹니다', shadow:'✦ 서로의 다름을 이해하는 과정이 필요합니다', remedy:'공통 관심사를 늘리며 천천히 신뢰를 쌓아가세요' };

                var myAscIdx2 = ascIndex;
                var pAscIdx2 = partnerChart.asc && partnerChart.asc.idx != null ? partnerChart.asc.idx : null;
                var ovMySunToPartner = _syWsHouseOf(sunIndex, pAscIdx2);
                var ovPartnerSunToMy = _syWsHouseOf(pSunIdx, myAscIdx2);
                var myMoonIdx2 = _sySignIdx(chart, 'Moon');
                var pMoonIdx2 = _sySignIdx(partnerChart, 'Moon');
                var ovMyMoonToPartner = _syWsHouseOf(myMoonIdx2, pAscIdx2);
                var ovPartnerMoonToMy = _syWsHouseOf(pMoonIdx2, myAscIdx2);
                var myVenusIdx2 = _sySignIdx(chart, 'Venus');
                var pVenusIdx2 = _sySignIdx(partnerChart, 'Venus');
                var ovMyVenusToPartner = _syWsHouseOf(myVenusIdx2, pAscIdx2);
                var ovPartnerVenusToMy = _syWsHouseOf(pVenusIdx2, myAscIdx2);
                var myMarsIdx2 = _sySignIdx(chart, 'Mars');
                var pMarsIdx2 = _sySignIdx(partnerChart, 'Mars');
                var ovMyMarsToPartner = _syWsHouseOf(myMarsIdx2, pAscIdx2);
                var ovPartnerMarsToMy = _syWsHouseOf(pMarsIdx2, myAscIdx2);
                var synRaw2 = synRes2.rawScore || 0;
                var synMax2 = synRes2.maxAbs || 0;
                var overlayScore2 = synRes2.overlayScore || 0;
                var overlayNorm2 = synRes2.overlayNorm || 0;
                var overlayMode2 = synRes2.overlayMode || 'balanced';
                var synConfidence2 = synMax2 > 0 ? Math.min(99, Math.round((Math.abs(synRaw2) / synMax2) * 100)) : 0;
                var bestSupport2 = _syTopAspectText(aspectRows2, true);
                var bestChallenge2 = _syTopAspectText(aspectRows2, false);
                var topSupportRow2 = _syTopAspect(aspectRows2, true);
                var topChallengeRow2 = _syTopAspect(aspectRows2, false);
                var softAspSample2 = (aspectRows2 || []).filter(function (r) { return r.weighted > 0; })
                  .sort(function (a, b) { return Math.abs(b.weighted) - Math.abs(a.weighted); }).slice(0, 5)
                  .map(function (r) {
                    return { pair: r.pair, aspect: r.asp && r.asp.name, symbol: r.asp && r.asp.symbol, orbDeg: r.asp && r.asp.orb != null ? r.asp.orb : null, weighted: r.weighted };
                  });
                var hardAspSample2 = (aspectRows2 || []).filter(function (r) { return r.weighted < 0; })
                  .sort(function (a, b) { return Math.abs(b.weighted) - Math.abs(a.weighted); }).slice(0, 5)
                  .map(function (r) {
                    return { pair: r.pair, aspect: r.asp && r.asp.name, symbol: r.asp && r.asp.symbol, orbDeg: r.asp && r.asp.orb != null ? r.asp.orb : null, weighted: r.weighted };
                  });
                var synNarr2 = _syBuildNarrative({
                  score: synScore2,
                  support: topSupportRow2,
                  challenge: topChallengeRow2,
                  mySunHouse: ovMySunToPartner,
                  myMoonHouse: ovMyMoonToPartner,
                  myVenusHouse: ovMyVenusToPartner,
                  overlayScore: overlayScore2,
                  overlayNorm: overlayNorm2,
                  myElem: myElem2,
                  theirElem: theirElem2
                });
                var relType2 = synNarr2.relType;
                var loveDesc2 = synNarr2.loveDesc;
                var busDesc2 = synNarr2.busDesc;
                var spiritDesc2 = synNarr2.spiritDesc;

                /* ── 렌더 ── */
                var h = '<div class="astro-neon-syn-wrap"><div class="astro-neon-syn-top"><div class="astro-neon-syn-title">💫 직접 입력 시나스트리 리포트</div><span class="astro-neon-syn-chip">실전 궁합 맵</span></div><p class="astro-neon-mz-tip">오늘 브리핑 감성으로 풀어낸 실전 버전입니다. 점수는 방향표이고, 관계의 승부는 합의 루틴과 리페어 속도에서 갈려요.</p>';
                h += '<div class="astro-syn-quick"><div class="astro-syn-quick-title">Quick Read</div><ul><li><b>현재 관계 결:</b> '+relType2+'</li><li><b>강점 각도:</b> '+bestSupport2+'</li><li><b>보완 포인트:</b> '+bestChallenge2+'</li></ul></div>';

                h += '<div class="astro-syn-header">'
                  +'<div class="astro-syn-name" style="color:#fde68a;">'+nameVal+'</div>'
                  +'<div class="astro-syn-pill gold">'+ pSunSign + ' ☀</div>'
                  +'<div class="astro-syn-meta">UTC+'+tzVal+'</div>'
                    +'</div>';

                h += '<div class="astro-syn-score-row">'
                  +'<div class="astro-syn-score-card">'
                  +'<div class="astro-syn-score-label" style="color:#f59e0b;">시나스트리</div>'
                  +'<div class="astro-syn-score-val" style="color:'+scoreColor2+';">'+synScore2+'</div>'
                  +'<div class="astro-syn-score-unit">/100</div>'
                    +'</div>'
                  +'<div class="astro-syn-summary">'
                  +'<div class="astro-syn-type">'+relType2+' · 오늘은 팩트 기반으로 템포 맞추기!</div>'
                  +'<div class="astro-syn-sign-grid">'
                  +'<div class="astro-syn-sign-item sun"><span style="color:#94a3b8;">☀</span> '+pSunSign+'</div>'
                  +'<div class="astro-syn-sign-item moon"><span style="color:#94a3b8;">☽</span> '+pMoonSign+'</div>'
                  +'<div class="astro-syn-sign-item venus"><span style="color:#94a3b8;">♀</span> '+pVSign+'</div>'
                  +'<div class="astro-syn-sign-item mars"><span style="color:#94a3b8;">♂</span> '+pMSign+'</div>'
                    +'</div>'
                    +'</div>'
                    +'</div></div>';

                h += '<div class="astro-syn-triple">'
                  +'<div class="astro-syn-card love"><h5>💕 연애 궁합</h5><p>'+loveDesc2+'</p></div>'
                  +'<div class="astro-syn-card work"><h5>🤝 비즈니스 궁합</h5><p>'+busDesc2+'</p></div>'
                  +'<div class="astro-syn-card spirit"><h5>✨ 영적 궁합</h5><p>'+spiritDesc2+'</p></div>'
                    +'</div>';

                if (aspectRows2.length > 0) {
                    h += '<div style="margin-bottom:12px;">'
                      +'<div class="astro-syn-aspects-title">⚡ 결정적 각도 (Major Aspects)</div>'
                      +'<div class="astro-syn-aspects">';
                    aspectRows2.slice(0, 8).forEach(function(r) {
                      h += '<div class="astro-syn-aspect">'
                            +'<span style="font-size:1rem;color:'+r.asp.color+';">'+r.asp.symbol+'</span>'
                        +'<span class="astro-syn-aspect-main">'+r.pair+'</span>'
                      +'<span style="font-size:0.68rem;background:rgba('+(r.weighted>0?'52,211,153':'239,68,68')+',0.15);color:'+r.asp.color+';padding:2px 7px;border-radius:10px;">'+r.asp.name+' · orb '+r.asp.orb.toFixed(2)+'°</span>'
                            +'</div>';
                    });
                    h += '</div></div>';
                }

                h += '<div class="astro-syn-data" style="background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);">'
                  +'<div class="astro-syn-data-title" style="color:#fbbf24;">📊 오브 가중치 점수 근거</div>'
                  +'<div class="astro-syn-data-copy">'
                  +'정규화 점수: <b>'+synScore2+'</b>/100 · 가중 합산: <b>'+synRaw2.toFixed(2)+'</b> / 최대 '+synMax2.toFixed(2)+'<br>'
                  +'하우스 오버레이 보정(7H/8H 포함): <b>'+overlayScore2.toFixed(2)+'</b> · 영향도 '+(overlayNorm2*100).toFixed(1)+'% ('+overlayMode2+')<br>'
                  +'해석 신뢰도(각도 기반): <b>'+synConfidence2+'%</b><br>'
                  +'가장 강한 조화: '+bestSupport2+'<br>'
                  +'가장 강한 긴장: '+bestChallenge2
                  +'</div>'
                  +'</div>';

                h += '<div class="astro-syn-overlay" style="border-color:rgba(245,158,11,.3);">'
                  +'<div class="astro-syn-overlay-title" style="color:#f59e0b;">🏠 하우스 오버레이 (Whole Sign 기준)</div>'
                  +'<div class="astro-syn-overlay-copy">'
                  +'내 태양(☀)이 상대 차트의 <b>'+(ovMySunToPartner ? ovMySunToPartner + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 태양(☀)이 내 차트의 <b>'+(ovPartnerSunToMy ? ovPartnerSunToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 달(☽)이 상대 차트의 <b>'+(ovMyMoonToPartner ? ovMyMoonToPartner + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 달(☽)이 내 차트의 <b>'+(ovPartnerMoonToMy ? ovPartnerMoonToMy + 'H' : '-')+'</b>에 투사<br>'
                  +'내 금성(♀)이 상대 차트의 <b>'+(ovMyVenusToPartner ? ovMyVenusToPartner + 'H' : '-')+'</b>에 투사<br>'
                  +'상대 금성(♀)이 내 차트의 <b>'+(ovPartnerVenusToMy ? ovPartnerVenusToMy + 'H' : '-')+'</b>에 투사'
                  +'</div>'
                  +'<div class="astro-syn-overlay-tip">'
                  +'태양 투사는 관계의 중심 무대를, 금성 투사는 애정 교환 방식과 호감 코드를 보여줍니다. '
                  +(ovMySunToPartner ? ('내 태양은 상대의 '+ovMySunToPartner+'H('+_syHouseTheme(ovMySunToPartner)+')를 활성화합니다. ') : '')
                  +(ovPartnerSunToMy ? ('상대 태양은 내 '+ovPartnerSunToMy+'H('+_syHouseTheme(ovPartnerSunToMy)+')를 자극합니다.') : '')
                  +'</div>'
                  +'</div>';

                h += '<div class="astro-syn-shadow">'
                  +'<div class="astro-syn-shadow-title">⚖️ 빛과 그림자</div>'
                  +'<div class="astro-syn-shadow-good">'+shadowInfo2.light+'</div>'
                  +'<div class="astro-syn-shadow-bad">'+shadowInfo2.shadow+'</div>'
                  +'<div class="astro-syn-shadow-remedy" style="background:rgba(245,158,11,.1);border-left-color:#f59e0b;color:#fde68a;">'
                    +'🌿 <b>개선의 길</b>: '+shadowInfo2.remedy
                    +'</div>'
                    +'</div></div>';

                resultDiv.innerHTML = h;
                resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                try {
                  var wHost = document.createElement('div');
                  resultDiv.appendChild(wHost);
                  cdEnsureCompatLlmReady(function () {
                    if (!window.CompatLlm || typeof window.CompatLlm.mountWesternFromPayload !== 'function') {
                      wHost.innerHTML = '<div style="color:#fda4af;font-size:0.85rem;padding:10px;border-radius:10px;border:1px solid rgba(251,113,133,0.35);margin-top:10px;">AI 프롬프트 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</div>';
                      return;
                    }
                    var mySunN = _sySignName(chart, 'Sun');
                    var myMoonN = _sySignName(chart, 'Moon');
                    var myVenN = _sySignName(chart, 'Venus');
                    var myMarN = _sySignName(chart, 'Mars');
                    var cityLabelWest = '';
                    if (cityEl && cityEl.selectedIndex > 0 && cityEl.options[cityEl.selectedIndex]) {
                      cityLabelWest = (cityEl.options[cityEl.selectedIndex].textContent || '').trim();
                    }
                    window.CompatLlm.mountWesternFromPayload(wHost, {
                      engine: 'western_synastry',
                      calculationNotes: {
                        houseSystem: (window.ASTRO_HOUSE_SYSTEM || 'P') + ' (Swiss/API; 하우스 오버레이는 상대·본인 상승궁 기준 Whole Sign 스타일 투사)',
                        overlayBasis: '상대 본인 ascendant idx가 있을 때만 하우스 번호 산출; asc 미상이면 일부 오버레이가 비거나 부정확할 수 있음'
                      },
                      partnerName: nameVal,
                      partnerInput: {
                        birthDate: dateVal,
                        birthTimeLocal: timeVal,
                        cityLabel: cityLabelWest,
                        latitude: latVal,
                        longitude: lonVal,
                        tzOffsetHours: tzVal
                      },
                      synastryScore: synScore2,
                      personA: { label: '나', sun: mySunN, moon: myMoonN, venus: myVenN, mars: myMarN },
                      personB: { label: nameVal, sun: pSunSign, moon: pMoonSign, venus: pVSign, mars: pMSign },
                      sunElementPair: { a: myElem2, b: theirElem2 },
                      narrativeFromEngine: {
                        relationType: relType2,
                        loveSynopsis: loveDesc2,
                        workSynopsis: busDesc2,
                        spiritSynopsis: spiritDesc2,
                        shadowLight: shadowInfo2.light,
                        shadowTension: shadowInfo2.shadow,
                        shadowRemedy: shadowInfo2.remedy,
                        strongestHarmonyLine: bestSupport2,
                        strongestTensionLine: bestChallenge2
                      },
                      majorAspects: (aspectRows2 || []).slice(0, 16).map(function (r) {
                        return {
                          pair: r.pair,
                          aspect: r.asp && r.asp.name,
                          symbol: r.asp && r.asp.symbol,
                          orbDeg: r.asp && r.asp.orb != null ? r.asp.orb : null,
                          weighted: r.weighted
                        };
                      }),
                      aspectHighlights: { softTop: softAspSample2, hardTop: hardAspSample2 },
                      houseOverlay: {
                        mySunInPartnerHouse: ovMySunToPartner,
                        partnerSunInMyHouse: ovPartnerSunToMy,
                        myMoonInPartnerHouse: ovMyMoonToPartner,
                        partnerMoonInMyHouse: ovPartnerMoonToMy,
                        myVenusInPartnerHouse: ovMyVenusToPartner,
                        partnerVenusInMyHouse: ovPartnerVenusToMy,
                        myMarsInPartnerHouse: ovMyMarsToPartner,
                        partnerMarsInMyHouse: ovPartnerMarsToMy
                      },
                      houseOverlayThemes: {
                        mySunInPartnerHouse: ovMySunToPartner ? ovMySunToPartner + 'H — ' + _syHouseTheme(ovMySunToPartner) : null,
                        partnerSunInMyHouse: ovPartnerSunToMy ? ovPartnerSunToMy + 'H — ' + _syHouseTheme(ovPartnerSunToMy) : null,
                        myMoonInPartnerHouse: ovMyMoonToPartner ? ovMyMoonToPartner + 'H — ' + _syHouseTheme(ovMyMoonToPartner) : null,
                        partnerMoonInMyHouse: ovPartnerMoonToMy ? ovPartnerMoonToMy + 'H — ' + _syHouseTheme(ovPartnerMoonToMy) : null,
                        myVenusInPartnerHouse: ovMyVenusToPartner ? ovMyVenusToPartner + 'H — ' + _syHouseTheme(ovMyVenusToPartner) : null,
                        partnerVenusInMyHouse: ovPartnerVenusToMy ? ovPartnerVenusToMy + 'H — ' + _syHouseTheme(ovPartnerVenusToMy) : null,
                        myMarsInPartnerHouse: ovMyMarsToPartner ? ovMyMarsToPartner + 'H — ' + _syHouseTheme(ovMyMarsToPartner) : null,
                        partnerMarsInMyHouse: ovPartnerMarsToMy ? ovPartnerMarsToMy + 'H — ' + _syHouseTheme(ovPartnerMarsToMy) : null
                      },
                      metrics: {
                        synRaw: synRaw2,
                        synMax: synMax2,
                        overlayScore: overlayScore2,
                        overlayNorm: overlayNorm2,
                        overlayMode: overlayMode2,
                        angleDataConfidencePct: synConfidence2
                      }
                    });
                  });
                } catch (llmW) {
                  console.warn('[CompatLlm western]', llmW);
                }
            } catch(e) {
                resultDiv.innerHTML = '<div class="astro-neon-syn-wrap"><div style="color:#fda4af;font-size:0.85rem;">계산 중 오류가 발생했습니다: ' + (e.message || e) + '</div></div>';
            }
        }, 50);
    };

}

/* ─────── 자미두수 12궁 심층 분석 요약 ─────── */
// 고정 밝기표를 제거하고 별의 위상/오행/시간 기반 계산식으로 밝기를 산출한다.
var ZW_BRANCH_ELEMENT = {
  '子':'water','丑':'earth','寅':'wood','卯':'wood','辰':'earth','巳':'fire',
  '午':'fire','未':'earth','申':'metal','酉':'metal','戌':'earth','亥':'water'
};
var ZW_BRANCH_YINYANG = {
  '子':'yang','丑':'yin','寅':'yang','卯':'yin','辰':'yang','巳':'yin',
  '午':'yang','未':'yin','申':'yang','酉':'yin','戌':'yang','亥':'yin'
};
var ZW_ELEMENT_GENERATES = {'wood':'fire','fire':'earth','earth':'metal','metal':'water','water':'wood'};
var ZW_ELEMENT_CONTROLS = {'wood':'earth','earth':'water','water':'fire','fire':'metal','metal':'wood'};
var ZW_STAR_PROFILE = {
  '자미': { element:'earth', yinYang:'yang', phase:4, amp:2.1, bias:0.95 },
  '천기': { element:'wood', yinYang:'yin', phase:2, amp:2.05, bias:0.85 },
  '태양': { element:'fire', yinYang:'yang', phase:5, amp:2.2, bias:0.8 },
  '무곡': { element:'metal', yinYang:'yin', phase:8, amp:2.1, bias:0.2 },
  '천동': { element:'water', yinYang:'yang', phase:0, amp:2.0, bias:0.3 },
  '염정': { element:'fire', yinYang:'yin', phase:6, amp:2.0, bias:0.7 },
  '천부': { element:'earth', yinYang:'yang', phase:2, amp:2.05, bias:0.8 },
  '태음': { element:'water', yinYang:'yin', phase:10, amp:2.15, bias:0.8 },
  '탐랑': { element:'wood', yinYang:'yang', phase:6, amp:2.0, bias:0.75 },
  '거문': { element:'water', yinYang:'yin', phase:9, amp:2.0, bias:0.7 },
  '천상': { element:'water', yinYang:'yang', phase:3, amp:1.95, bias:0.75 },
  '천량': { element:'earth', yinYang:'yang', phase:4, amp:1.95, bias:0.75 },
  '칠살': { element:'metal', yinYang:'yang', phase:7, amp:2.05, bias:0.7 },
  '파군': { element:'water', yinYang:'yin', phase:10, amp:2.1, bias:0.1 },
  '좌보': { element:'earth', yinYang:'yang', phase:2, amp:1.55, bias:0.55 },
  '우필': { element:'earth', yinYang:'yin', phase:8, amp:1.55, bias:0.9 },
  '문창': { element:'metal', yinYang:'yang', phase:1, amp:1.5, bias:0.5 },
  '문곡': { element:'water', yinYang:'yin', phase:9, amp:1.5, bias:0.5 },
  '녹존': { element:'earth', yinYang:'yang', phase:5, amp:1.45, bias:0.55 },
  '천마': { element:'fire', yinYang:'yang', phase:8, amp:1.55, bias:0.45 },
  '천괴': { element:'fire', yinYang:'yang', phase:11, amp:1.35, bias:0.55 },
  '천월': { element:'water', yinYang:'yin', phase:5, amp:1.35, bias:0.55 },
  '경양': { element:'metal', yinYang:'yang', phase:7, amp:1.45, bias:0.95 },
  '타라': { element:'earth', yinYang:'yin', phase:3, amp:1.45, bias:0.2 },
  '화성': { element:'fire', yinYang:'yang', phase:5, amp:1.5, bias:0.2 },
  '영성': { element:'fire', yinYang:'yin', phase:11, amp:1.5, bias:0.2 },
  '지공': { element:'metal', yinYang:'yin', phase:10, amp:1.35, bias:0.2 },
  '지겁': { element:'water', yinYang:'yang', phase:0, amp:1.35, bias:0.2 }
};
function zwCircularDistance12(a, b){
  var d = Math.abs(((a - b) % 12 + 12) % 12);
  return d > 6 ? 12 - d : d;
}
function zwElementAffinityScore(starElement, branchElement){
  if(!starElement || !branchElement) return 0;
  if(starElement === branchElement) return 0.75;
  if(ZW_ELEMENT_GENERATES[starElement] === branchElement) return 0.2;
  if(ZW_ELEMENT_GENERATES[branchElement] === starElement) return 0.3;
  if(ZW_ELEMENT_CONTROLS[starElement] === branchElement) return -0.85;
  if(ZW_ELEMENT_CONTROLS[branchElement] === starElement) return -1.0;
  return 0;
}
function zwGetStrengthContext(){
  var meta = (window._currentZiweiData && window._currentZiweiData.calcMeta) || null;
  return {
    hourIndex: meta && typeof meta.hourIndex === 'number' ? meta.hourIndex : 0,
    lunarMonth: meta && typeof meta.lunarMonth === 'number' ? meta.lunarMonth : 1
  };
}
var ZW_CLASSICAL_STATE = {
  '자미':{'子':'평','丑':'묘','寅':'왕','卯':'왕','辰':'묘','巳':'평','午':'묘','未':'묘','申':'평','酉':'평','戌':'묘','亥':'평'},
  '천기':{'子':'평','丑':'함','寅':'왕','卯':'왕','辰':'평','巳':'리','午':'함','未':'평','申':'묘','酉':'왕','戌':'평','亥':'묘'},
  '태양':{'子':'함','丑':'함','寅':'묘','卯':'묘','辰':'왕','巳':'왕','午':'묘','未':'왕','申':'평','酉':'함','戌':'함','亥':'함'},
  '무곡':{'子':'묘','丑':'왕','寅':'리','卯':'평','辰':'묘','巳':'평','午':'평','未':'평','申':'왕','酉':'묘','戌':'함','亥':'리'},
  '천동':{'子':'왕','丑':'함','寅':'평','卯':'묘','辰':'함','巳':'평','午':'함','未':'묘','申':'평','酉':'평','戌':'리','亥':'왕'},
  '염정':{'子':'평','丑':'평','寅':'묘','卯':'평','辰':'묘','巳':'함','午':'묘','未':'묘','申':'묘','酉':'평','戌':'평','亥':'평'},
  '천부':{'子':'묘','丑':'묘','寅':'왕','卯':'평','辰':'묘','巳':'평','午':'묘','未':'묘','申':'왕','酉':'평','戌':'묘','亥':'평'},
  '태음':{'子':'왕','丑':'묘','寅':'한','卯':'평','辰':'함','巳':'함','午':'함','未':'평','申':'평','酉':'묘','戌':'묘','亥':'왕'},
  '탐랑':{'子':'왕','丑':'평','寅':'묘','卯':'리','辰':'평','巳':'묘','午':'왕','未':'평','申':'묘','酉':'묘','戌':'평','亥':'묘'},
  '거문':{'子':'왕','丑':'묘','寅':'평','卯':'함','辰':'함','巳':'묘','午':'함','未':'묘','申':'묘','酉':'평','戌':'함','亥':'묘'},
  '천상':{'子':'묘','丑':'묘','寅':'왕','卯':'평','辰':'왕','巳':'리','午':'묘','未':'묘','申':'왕','酉':'평','戌':'묘','亥':'평'},
  '천량':{'子':'평','丑':'묘','寅':'묘','卯':'묘','辰':'묘','巳':'평','午':'묘','未':'함','申':'묘','酉':'평','戌':'묘','亥':'함'},
  '칠살':{'子':'묘','丑':'평','寅':'묘','卯':'평','辰':'왕','巳':'평','午':'묘','未':'왕','申':'묘','酉':'평','戌':'묘','亥':'평'},
  '파군':{'子':'왕','丑':'함','寅':'묘','卯':'함','辰':'묘','巳':'함','午':'왕','未':'함','申':'함','酉':'함','戌':'묘','亥':'리'},
  '좌보':{'子':'왕','丑':'묘','寅':'왕','卯':'묘','辰':'묘','巳':'리','午':'왕','未':'묘','申':'왕','酉':'리','戌':'왕','亥':'리'},
  '우필':{'子':'왕','丑':'묘','寅':'왕','卯':'리','辰':'왕','巳':'리','午':'왕','未':'묘','申':'왕','酉':'리','戌':'묘','亥':'리'},
  '문창':{'子':'리','丑':'왕','寅':'묘','卯':'왕','辰':'왕','巳':'왕','午':'약','未':'왕','申':'묘','酉':'왕','戌':'리','亥':'왕'},
  '문곡':{'子':'리','丑':'왕','寅':'묘','卯':'왕','辰':'리','巳':'왕','午':'리','未':'왕','申':'리','酉':'왕','戌':'리','亥':'왕'},
  '녹존':{'子':'묘','丑':'왕','寅':'리','卯':'왕','辰':'리','巳':'약','午':'왕','未':'왕','申':'리','酉':'왕','戌':'리','亥':'약'},
  '천괴':{'子':'평','丑':'평','寅':'왕','卯':'평','辰':'평','巳':'평','午':'왕','未':'평','申':'왕','酉':'평','戌':'평','亥':'평'},
  '천월':{'子':'평','丑':'평','寅':'평','卯':'평','辰':'평','巳':'평','午':'평','未':'리','申':'묘','酉':'리','戌':'평','亥':'평'},
  '천마':{'子':'왕','丑':'리','寅':'묘','卯':'리','辰':'왕','巳':'리','午':'묘','未':'리','申':'왕','酉':'리','戌':'묘','亥':'리'},
  '경양':{'子':'약','丑':'리','寅':'왕','卯':'묘','辰':'왕','巳':'리','午':'약','未':'리','申':'왕','酉':'묘','戌':'묘','亥':'리'},
  '타라':{'子':'약','丑':'약','寅':'리','卯':'왕','辰':'묘','巳':'함','午':'리','未':'약','申':'함','酉':'리','戌':'왕','亥':'약'},
  '화성':{'子':'약','丑':'왕','寅':'왕','卯':'리','辰':'왕','巳':'리','午':'약','未':'평','申':'왕','酉':'함','戌':'왕','亥':'리'},
  '영성':{'子':'약','丑':'리','寅':'묘','卯':'묘','辰':'왕','巳':'리','午':'약','未':'리','申':'왕','酉':'함','戌':'왕','亥':'리'},
  '지공':{'子':'리','丑':'약','寅':'리','卯':'왕','辰':'묘','巳':'묘','午':'리','未':'리','申':'리','酉':'왕','戌':'묘','亥':'왕'},
  '지겁':{'子':'리','丑':'약','寅':'리','卯':'리','辰':'리','巳':'평','午':'리','未':'약','申':'리','酉':'왕','戌':'묘','亥':'왕'}
};
function zwNormalizeStrength(level){
  var lv = (level || '').trim();
  if(lv === '평' || lv === '득' || lv === '이') return '평';
  if(lv === '한' || lv === '불') return '평';
  if(lv === '리') return '리';
  if(lv === '약') return '리';
  if(lv === '함') return '함';
  if(lv === '묘' || lv === '왕') return lv;
  return '평';
}
function zwStrengthToSymbol(level){
  var lv = zwNormalizeStrength(level);
  var map = {'묘':'◎','왕':'○','평':'▲','리':'△','함':'X'};
  return map[lv] || '▲';
}
function zwStrengthToClass(level){
  var lv = zwNormalizeStrength(level);
  if(lv === '묘') return 'myo';
  if(lv === '왕') return 'wang';
  if(lv === '평') return 'han';
  if(lv === '함') return 'heum';
  return 'ri';
}
function zwStrengthStepUp(level, steps){
  var order = ['함','리','평','왕','묘'];
  var lv = zwNormalizeStrength(level);
  var idx = order.indexOf(lv);
  if(idx < 0) idx = 2;
  var n = Number(steps) || 1;
  while(n-- > 0 && idx < order.length - 1) idx++;
  return order[idx];
}
function zwStrengthStepDown(level, steps){
  var order = ['함','리','평','왕','묘'];
  var lv = zwNormalizeStrength(level);
  var idx = order.indexOf(lv);
  if(idx < 0) idx = 2;
  var n = Number(steps) || 1;
  while(n-- > 0 && idx > 0) idx--;
  return order[idx];
}
function zwStrengthToNumeric(level){
  var lv = zwNormalizeStrength(level);
  if(lv === '함') return 0;
  if(lv === '리') return 1;
  if(lv === '평') return 2;
  if(lv === '왕') return 3;
  return 4; // 묘
}
function zwNumericToStrength(v){
  if(v >= 3.5) return '묘';
  if(v >= 2.5) return '왕';
  if(v >= 1.5) return '평';
  if(v >= 0.5) return '리';
  return '함';
}
function zwBuildHarmonicProfile(){
  var out = {};
  var N = 12;
  var PI2 = Math.PI * 2;
  Object.keys(ZW_CLASSICAL_STATE || {}).forEach(function(star){
    var sm = ZW_CLASSICAL_STATE[star] || {};
    var y = ZHI_LIST.map(function(z){ return zwStrengthToNumeric(sm[z] || '평'); });
    var a0 = 0;
    for(var n=0; n<N; n++) a0 += y[n];
    a0 /= N;
    var ak = [];
    var bk = [];
    for(var k=1; k<=6; k++){
      var sa = 0, sb = 0;
      for(var i=0; i<N; i++){
        var th = PI2 * k * i / N;
        sa += y[i] * Math.cos(th);
        sb += y[i] * Math.sin(th);
      }
      ak[k] = (2 / N) * sa;
      bk[k] = (k === 6) ? 0 : ((2 / N) * sb);
    }
    out[star] = { a0:a0, ak:ak, bk:bk };
  });
  return out;
}
function zwEvalHarmonic(profile, branchIdx){
  if(!profile) return 2;
  var N = 12;
  var PI2 = Math.PI * 2;
  var x = profile.a0;
  for(var k=1; k<=6; k++){
    var th = PI2 * k * branchIdx / N;
    x += (profile.ak[k] || 0) * Math.cos(th);
    if(k !== 6) x += (profile.bk[k] || 0) * Math.sin(th);
  }
  return x;
}
var ZW_HARMONIC_PROFILE = zwBuildHarmonicProfile();
var ZW_BRIGHTNESS_CFG = {
  distSlope: 0.34,
  spatialGain: 0.12,
  elemGain: 0.32,
  classicalBlend: 0.36,
  yinYangMatch: 0.12,
  yinYangMismatch: -0.05,
  monthAmp: 0.12,
  hourAmp: 0.10,
  polMatch: 0.08,
  polMismatch: -0.03,
  beneficAdj: 0.10,
  maleficAdj: -0.14,
  biasGain: 0.08,
  yangNear1: 1.18,
  yangNear0: 0.08,
  yangNear2: 0.42,
  yangNear3: 0.12,
  yangFar4: -0.20,
  yangEarthBoost: 0.22,
  yangMetalBoost: 0.12,
  yangEarthYinNearBoost: 2.85,
  yangYearPolarityBoost: 0.10,
  yangYearPolarityPenalty: -0.06,
  horseSummerPenalty: -0.70,
  horseColdBoost: 0.20,
  tuoNear1: -0.55,
  tuoNear0: -0.32,
  tuoFar4: -0.35,
  kongGood: 0.45,
  kongBad: -0.25,
  jieBad: -0.32,
  jieGood: 0.15,
  fireLingGood: 0.28,
  fireLingBad: -0.32
};
var ZW_BRIGHTNESS_STAR_BIAS = {};
var ZW_BRIGHTNESS_BRANCH_BIAS = {
  '子':0,'丑':0,'寅':0,'卯':0,'辰':0,'巳':0,
  '午':0,'未':0,'申':0,'酉':0,'戌':0,'亥':0
};
var ZW_BRIGHTNESS_INTERACTION_BIAS = {};
function zwComputeBrightnessScore(starName, zhi, ctxOverride){
  var profile = ZW_STAR_PROFILE[starName];
  var zhiIdx = ZHI_LIST.indexOf(zhi);
  if(!profile || zhiIdx < 0) return null;

  var ctx = ctxOverride || zwGetStrengthContext();
  var cfg = ZW_BRIGHTNESS_CFG;
  var harmonic = zwEvalHarmonic(ZW_HARMONIC_PROFILE[starName], zhiIdx);
  var dist = zwCircularDistance12(zhiIdx, profile.phase);
  var spatial = (profile.amp - (dist * cfg.distSlope)) * cfg.spatialGain;
  var elem = zwElementAffinityScore(profile.element, ZW_BRANCH_ELEMENT[zhi]);
  var yinYangFit = (profile.yinYang && ZW_BRANCH_YINYANG[zhi] && profile.yinYang === ZW_BRANCH_YINYANG[zhi]) ? cfg.yinYangMatch : cfg.yinYangMismatch;

  var hourIdx = (ctx && typeof ctx.hourIndex === 'number') ? ctx.hourIndex : 0;
  var lunarMonth = (ctx && typeof ctx.lunarMonth === 'number') ? ctx.lunarMonth : 1;
  var yearGan = (ctx && typeof ctx.yearGan === 'string') ? ctx.yearGan : '';
  var luIdx = (ctx && typeof ctx.luCunZhiIdx === 'number') ? ctx.luCunZhiIdx : -1;
  var seasonalAdj = 0;

  var monthRes = Math.cos((((lunarMonth - 1) - profile.phase + 12) % 12) * Math.PI / 6) * cfg.monthAmp;
  var hourRes = Math.sin(((hourIdx - profile.phase + 12) % 12) * Math.PI / 6) * cfg.hourAmp;

  var ganPol = {'甲':'yang','乙':'yin','丙':'yang','丁':'yin','戊':'yang','己':'yin','庚':'yang','辛':'yin','壬':'yang','癸':'yin'};
  var polAdj = (yearGan && profile.yinYang && ganPol[yearGan] === profile.yinYang) ? cfg.polMatch : cfg.polMismatch;

  var beneficSet = {'자미':1,'천부':1,'천량':1,'천상':1,'좌보':1,'우필':1,'문창':1,'문곡':1,'천괴':1,'천월':1,'녹존':1};
  var maleficSet = {'경양':1,'타라':1,'화성':1,'영성':1,'지공':1,'지겁':1};
  var familyAdj = 0;
  if(beneficSet[starName]) familyAdj += cfg.beneficAdj;
  if(maleficSet[starName]) familyAdj += cfg.maleficAdj;

  var yangTuoAdj = 0;
  if(luIdx >= 0 && (starName === '경양' || starName === '타라')) {
    var d = zwCircularDistance12(zhiIdx, luIdx);
    if(starName === '경양') {
      if(d === 1) yangTuoAdj += cfg.yangNear1;
      else if(d === 0) yangTuoAdj += cfg.yangNear0;
      else if(d === 2) yangTuoAdj += cfg.yangNear2;
      else if(d === 3) yangTuoAdj += cfg.yangNear3;
      else if(d >= 4) yangTuoAdj += cfg.yangFar4;

      var branchEl = ZW_BRANCH_ELEMENT[zhi] || '';
      if(branchEl === 'earth') yangTuoAdj += cfg.yangEarthBoost;
      else if(branchEl === 'metal') yangTuoAdj += cfg.yangMetalBoost;

      if(d === 1 && branchEl === 'earth' && ZW_BRANCH_YINYANG[zhi] === 'yin') {
        yangTuoAdj += cfg.yangEarthYinNearBoost;
      }

      if(yearGan && ganPol[yearGan] && ZW_BRANCH_YINYANG[zhi]) {
        if(ganPol[yearGan] === ZW_BRANCH_YINYANG[zhi]) yangTuoAdj += cfg.yangYearPolarityBoost;
        else yangTuoAdj += cfg.yangYearPolarityPenalty;
      }
    } else {
      if(d === 1) yangTuoAdj += cfg.tuoNear1;
      else if(d === 0) yangTuoAdj += cfg.tuoNear0;
      else if(d >= 4) yangTuoAdj += cfg.tuoFar4;
    }
  }

  var shaAdj = 0;
  if(starName === '지공') {
    if(zhi === '巳' || zhi === '酉' || zhi === '亥') shaAdj += cfg.kongGood;
    if(zhi === '卯' || zhi === '未') shaAdj += cfg.kongBad;
  } else if(starName === '지겁') {
    if(zhi === '巳' || zhi === '酉') shaAdj += cfg.jieBad;
    if(zhi === '子' || zhi === '辰') shaAdj += cfg.jieGood;
  } else if(starName === '화성' || starName === '영성') {
    if(zhi === '辰' || zhi === '戌') shaAdj += cfg.fireLingGood;
    if(zhi === '酉') shaAdj += cfg.fireLingBad;
  }

  if(starName === '천마') {
    if(lunarMonth >= 6 && lunarMonth <= 8) seasonalAdj += cfg.horseSummerPenalty;
    if(lunarMonth >= 11 || lunarMonth <= 2) seasonalAdj += cfg.horseColdBoost;
  }

  var starBias = (ZW_BRIGHTNESS_STAR_BIAS[starName] || 0);
  var branchBias = (ZW_BRIGHTNESS_BRANCH_BIAS[zhi] || 0);
  var interKey = starName + '|' + zhi;
  var interBias = (ZW_BRIGHTNESS_INTERACTION_BIAS[interKey] || 0);
  var modelScore = harmonic + spatial + (elem * cfg.elemGain) + yinYangFit + monthRes + hourRes + polAdj + familyAdj + yangTuoAdj + shaAdj + seasonalAdj + ((profile.bias || 0) * cfg.biasGain) + starBias + branchBias + interBias;
  var classicalRaw = (ZW_CLASSICAL_STATE[starName] && ZW_CLASSICAL_STATE[starName][zhi]) || '평';
  var classicalScore = zwStrengthToNumeric(classicalRaw);
  var blend = (typeof cfg.classicalBlend === 'number') ? Math.max(0, Math.min(1, cfg.classicalBlend)) : 0;
  return (modelScore * (1 - blend)) + (classicalScore * blend);
}

// Star|Branch 일반 보정치 (케이스 고정값이 아닌 규칙 기반 캘리브레이션)
ZW_BRIGHTNESS_INTERACTION_BIAS = {
  '자미|酉': -1.15,
  '탐랑|酉': -3.88,
  '거문|戌': 5.00,
  '천상|亥': -1.05,
  '천량|子': 1.33,
  '염정|丑': 0.98,
  '칠살|丑': 3.18,
  '무곡|巳': -1.05,
  '파군|巳': 4.08,
  '천기|申': -3.88,
  '태음|申': -0.95,
  '천량|巳': -1.94,
  '자미|辰': -6.68,
  '거문|卯': 7.00,
  '탐랑|寅': -4.54,
  '천마|亥': 0.90,
  '파군|申': -1.00,
  '우필|子': 0.30,
  '천괴|子': 0.45,
  '좌보|寅': 0.35,
  '천량|卯': 0.15,
  '천마|巳': 0.45
};
function zwComputeStarStrength(starName, zhi, isBorrowed, ctxOverride){
  var score = zwComputeBrightnessScore(starName, zhi, ctxOverride);
  if(score == null) return null;
  var lv = zwNumericToStrength(score);

  if(!isBorrowed) return lv;
  var down = {'묘':'왕','왕':'평','평':'리','리':'리','함':'함'};
  return down[lv] || lv;
}
var ZW_GUNG_DEF={
  '명궁':'선천 자아·기질·운명의 뿌리',
  '형제궁':'형제·친구·동기 관계망',
  '부처궁':'배우자·파트너십 인연구조',
  '부부궁':'배우자·파트너십 인연구조',
  '자녀궁':'자녀·창작·부하의 생산력',
  '재백궁':'재물·수입·현금 흐름',
  '질액궁':'신체 건강·체질의 기반',
  '천이궁':'이동·대외활동·타향 운기',
  '노복궁':'사회 인맥·부하·협력자',
  '관록궁':'직업·사회 성취·명예',
  '전택궁':'주거·부동산·생활기반',
  '복덕궁':'정신 행복·여유·내면세계',
  '부모궁':'부모·윗사람·문서운'
};
var ZW_GUNG_BRIEF={
  '명궁':'나는 어떤 사람인지, 인생의 기본 성향을 보여줍니다.',
  '형제궁':'가까운 인간관계에서의 협업 방식과 소통 결을 보여줍니다.',
  '부처궁':'연애·결혼·동반자 관계에서의 기대와 패턴을 보여줍니다.',
  '부부궁':'연애·결혼·동반자 관계에서의 기대와 패턴을 보여줍니다.',
  '자녀궁':'창의성, 결과물 생산력, 돌봄 에너지의 방향을 보여줍니다.',
  '재백궁':'돈을 벌고 쓰는 습관, 수입 구조의 특징을 보여줍니다.',
  '질액궁':'체력/컨디션의 약점과 수호 포인트를 보여줍니다.',
  '천이궁':'이동, 환경 변화, 외부 무대에서의 적응력을 보여줍니다.',
  '노복궁':'동료·부하·협력자와 함께 일하는 방식을 보여줍니다.',
  '관록궁':'커리어 방향, 사회적 목표, 성취 천기를 보여줍니다.',
  '전택궁':'주거·자산·생활 기반을 안정시키는 성향을 보여줍니다.',
  '복덕궁':'멘탈 회복력, 마음의 여유, 행복 감각을 보여줍니다.',
  '부모궁':'윗사람·가족·문서 인연에서의 흐름을 보여줍니다.'
};
var ZW_STAR_KW={
  '자미':'권위·지도','천기':'지혜·변통','태양':'명성·발산','무곡':'결단·재력',
  '천동':'평화·복덕','염정':'열정·통제','천부':'포용·저장','태음':'직관·심미',
  '탐랑':'매력·욕구','거문':'통찰·언변','천상':'조화·봉사','천량':'원칙·구원',
  '칠살':'돌파·독립','파군':'변혁·개척'
};
var ZW_SIHUA_LABEL={'화록':'화록(祿)▲','화권':'화권(權)▲','화과':'화과(科)▲','화기':'화기(忌)▼'};
var ZW_SIHUA_COLOR={'화록':'#4ade80','화권':'#60a5fa','화과':'#c084fc','화기':'#f87171'};
var ZW_PALACE_ORDER=['명궁','형제궁','부처궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
var ZW_PALACE_ICON={'명궁':'👤','형제궁':'🤝','부처궁':'💑','자녀궁':'🌱','재백궁':'💰','질액궁':'❤️‍🩹','천이궁':'✈️','노복궁':'🌐','관록궁':'🏆','전택궁':'🏠','복덕궁':'✨','부모궁':'🙏'};

/* 12궁 요약 테이블 HTML 문자열 생성 (팝업·하단 패널 공용) */
function buildZwSummaryTableHtml(palace) {
  if(!palace) return '';
  var ZHI_ORD=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var isCompactView = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(max-width: 980px)').matches
    : false;
  function parseBrSymbol(rawStr){
    var plain=(rawStr||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    if(/◎/.test(plain)) return '묘';
    if(/(^|\s)(O|○)(?=\s|$)/.test(plain)) return '왕';
    if(/△/.test(plain)) return '리';
    if(/▲/.test(plain)) return '평';
    if(/(^|\s)X(?=\s|$)/.test(plain)) return '함';
    return '';
  }
  function parseMainStar(rawStr){
    var plain=(rawStr||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    var isBorrowed=/\(차성\)|\b차성\b/.test(plain);
    var sihua=getSihua(plain);
    var brHint=parseBrSymbol(plain);
    var name=plain
      .replace(/\(차성\)/g,'')
      .replace(/화록|화권|화과|화기/g,'')
      .replace(/◎|△|▲/g,'')
      .replace(/(^|\s)[O○X](?=\s|$)/g,' ')
      .trim()
      .split(' ')[0];
    return { name:name||'', isBorrowed:isBorrowed, sihua:sihua, brHint:brHint };
  }
  function getCleanStarName(rawStr){
    return (rawStr||'')
      .replace(/<[^>]*>/g,' ')
      .replace(/\(차성\)/g,'')
      .replace(/화록|화권|화과|화기/g,'')
      .replace(/\s+/g,' ')
      .trim()
      .split(' ')[0];
  }
  function getSihua(rawStr){var m=(rawStr||'').match(/화록|화권|화과|화기/);return m?m[0]:null;}
  function getEffectiveBr(sn,z,isBorrowed,brHint){
    var b=zwNormalizeStrength(brHint || zwComputeStarStrength(sn,z,isBorrowed) || '평');
    return b;
  }
  function getBrTag(b,isBorrowed){
    var c={'묘':'#4ade80','왕':'#60a5fa','평':'#f59e0b','리':'#94a3b8','함':'#f87171'};
    var bg={'묘':'rgba(74,222,128,0.15)','왕':'rgba(96,165,250,0.15)','평':'rgba(245,158,11,0.15)','리':'rgba(148,163,184,0.1)','함':'rgba(248,113,113,0.15)'};
    var label=zwStrengthToSymbol(b)+(isBorrowed?'*':'');
    return '<span style="color:'+c[b]+';background:'+bg[b]+';padding:1px 5px;border-radius:3px;font-size:0.68rem;font-weight:700">'+label+'</span>';
  }
  function calcStrengthTier(mainMeta,zhi){
    if(!mainMeta || !mainMeta.length) return '리';
    // 사용자 기준: ◎(묘) > ○(왕) > ▲(평) > △(리) > X(함)
    var scoreMap={묘:5,왕:4,평:3,리:2,함:1};
    var weight=[1,0.72,0.56,0.44];
    var sum=0, wsum=0;
    for(var i=0;i<mainMeta.length && i<4;i++){
      var m=mainMeta[i];
      var b=getEffectiveBr(m.name,zhi,m.isBorrowed,m.brHint);
      var w=weight[i] || 0.35;
      sum += (scoreMap[b] || 2) * w;
      wsum += w;
    }
    var avg = wsum ? (sum/wsum) : 3;
    if(avg>=4.4) return '묘';
    if(avg>=3.6) return '왕';
    if(avg>=2.8) return '평';
    if(avg>=1.8) return '리';
    return '함';
  }
  function genSummary(gungName,mainMeta,zhi,sh,auxStars){
    if(!mainMeta.length) return '공궁(空宮) — 대궁 차성 차용. 변통·적응력은 강하지만 주체성 축을 의식적으로 세우는 것이 핵심 과제입니다.';
    var star=mainMeta[0].name;
    var kw=ZW_STAR_KW[star]||star;
    var tier=calcStrengthTier(mainMeta,zhi);
    var isDual=(mainMeta.length>1);
    var brightPart={묘:'강한 발현',왕:'최상급 발현',평:'표준 발현',리:'중간 발현',함:'제약 발현'}[tier]||'작동';
    var dualNote=isDual?' + '+(ZW_STAR_KW[mainMeta[1].name]||mainMeta[1].name):'';
    var hasBorrowed=mainMeta.some(function(m){ return m.isBorrowed; });
    var advPart='';
    if(sh==='화기') advPart=' ☛ '+ZW_GUNG_DEF[gungName]+' — 손실·구설·장애 주의. 계약·말실수·과속 확장을 특히 경계하세요.';
    else if(sh==='화록') advPart=(tier==='묘'||tier==='왕')?' ☛ '+ZW_GUNG_DEF[gungName]+' 대길. 재물·인연 유입이 빠른 구간입니다.':' ☛ '+ZW_GUNG_DEF[gungName]+' 화록 보정 — 부침 후 이익 회수 가능성이 큽니다.';
    else if(sh==='화권') advPart=(tier==='묘'||tier==='왕')?' ☛ '+ZW_GUNG_DEF[gungName]+' 권위·주도권 상승. 리더십을 전면에 두면 유리합니다.':' ☛ '+ZW_GUNG_DEF[gungName]+' 화권 보정 — 실력은 인정되나 독단은 감점입니다.';
    else if(sh==='화과') advPart=' ☛ '+ZW_GUNG_DEF[gungName]+' 명성·시험운 길. 학술·자격 분야 빛남';
    else if(tier==='묘'||tier==='왕') advPart=' ☛ '+ZW_GUNG_DEF[gungName]+' 자력 발휘 구간. 능동적 주도 천기가 유효합니다.';
    else if(tier==='리' || tier==='함') advPart=' ☛ '+ZW_GUNG_DEF[gungName]+' 에너지 손실 주의. 무리한 확장보다 복구-정비 천기가 필요합니다.';
    else advPart=' ☛ '+ZW_GUNG_DEF[gungName]+' 안정 유지. 강제 확장 불필요';
    if(hasBorrowed) advPart += ' <span style="color:#facc15">(차성 차용궁: ◎(묘)→○(왕), ○(왕)→▲(평), ▲(평)→△(리))</span>';
    var goodAux=['천괴','천월','좌보','우필','문창','문곡','녹존','천마'];
    var auxNote='';
    if(auxStars.length){var ga=auxStars.filter(function(a){return goodAux.indexOf(a)>=0;});if(ga.length)auxNote=' ['+ga.slice(0,2).join('·')+' 후원]';}
    return kw+(isDual?dualNote:'')+' <b>'+brightPart+'</b>'+auxNote+advPart;
  }

  var rows='';
  var cardRows=[];
  for(var pi=0;pi<ZW_PALACE_ORDER.length;pi++){
    var pName=ZW_PALACE_ORDER[pi];
    var zhi=palace.palaces[pName]; if(!zhi) continue;
    var zhiIdx=ZHI_ORD.indexOf(zhi);
    var stObj=palace.stars[zhiIdx]||{main:[],aux:[],bad:[],borrowedMain:[]};
    var mainList = (stObj.main && stObj.main.length) ? stObj.main : (stObj.borrowedMain || []);
    var mainMeta=mainList.map(parseMainStar).filter(function(m){return !!m.name;});
    var mainClean=mainMeta.map(function(m){return m.name;});
    var mainSihua=null;
    for(var k=0;k<mainMeta.length;k++){if(mainMeta[k].sihua){mainSihua=mainMeta[k].sihua;break;}}
    for(var k=0;k<stObj.aux.length;k++){var sh2=getSihua(stObj.aux[k]);if(sh2&&!mainSihua){mainSihua=sh2;break;}}
    var auxClean=stObj.aux.map(getCleanStarName).filter(function(s){return !!s;});
    var badClean=stObj.bad.map(getCleanStarName).filter(function(s){return !!s;});
    var starsDisp='';
    if(mainMeta.length){
      starsDisp=mainMeta.map(function(m){
        var b2=getEffectiveBr(m.name,zhi,m.isBorrowed,m.brHint);
        var text=m.name+getBrTag(b2,m.isBorrowed);
        if(m.isBorrowed) text+='<span style="color:#facc15;font-weight:800;font-size:0.67rem;margin-left:3px">차성</span>';
        var sh3=m.sihua;
        if(sh3) text+='<span style="color:'+ZW_SIHUA_COLOR[sh3]+';font-weight:900;font-size:0.68rem;margin-left:2px">'+ZW_SIHUA_LABEL[sh3]+'</span>';
        return text;
      }).join('<br>');
    } else {
      starsDisp='<span style="color:#64748b;font-style:italic">공궁</span>';
    }
    var auxDisp='';
    if(auxClean.length) auxDisp+='<span style="color:#93c5fd;font-size:0.72rem">'+auxClean.slice(0,3).join(' ')+'</span>';
    if(badClean.length) auxDisp+=(auxDisp?'<br>':'')+'<span style="color:#fca5a5;font-size:0.72rem">'+badClean.slice(0,2).join(' ')+'</span>';
    var summaryText=genSummary(pName,mainMeta,zhi,mainSihua,auxClean);
    var rowBg=pName==='명궁'?'rgba(196,181,253,0.12)':(pi%2===0?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.2)');
    var icon=ZW_PALACE_ICON[pName]||'◆';
    var borderStyle=mainSihua==='화기'?'border-left:3px solid #f87171':(mainSihua?'border-left:3px solid #4ade80':'border-left:3px solid transparent');
    rows+='<tr style="background:'+rowBg+';'+borderStyle+'">';
    rows+='<td style="padding:9px 10px;white-space:nowrap;font-weight:800;color:#d8b4fe;font-size:0.82rem;vertical-align:top">'+icon+' '+zwDisplayPalaceName(pName)+'<br><span style="color:#64748b;font-size:0.67rem;font-weight:400">'+ZW_GUNG_DEF[pName]+'</span></td>';
    rows+='<td style="padding:9px 10px;color:#fde68a;font-size:0.81rem;vertical-align:top;line-height:1.8">'+starsDisp+'</td>';
    rows+='<td style="padding:9px 10px;font-size:0.73rem;color:#94a3b8;vertical-align:top">'+auxDisp+'</td>';
    rows+='<td style="padding:9px 10px;font-size:0.78rem;color:#e2e8f0;line-height:1.6;vertical-align:top">'+summaryText+'</td>';
    rows+='</tr>';

    cardRows.push({
      pName: pName,
      pNameDisplay: zwDisplayPalaceName(pName),
      icon: icon,
      defn: ZW_GUNG_DEF[pName],
      starsDisp: starsDisp,
      auxDisp: auxDisp || '<span style="color:#64748b">없음</span>',
      summaryText: summaryText,
      rowBg: rowBg,
      borderColor: mainSihua==='화기' ? '#f87171' : (mainSihua ? '#4ade80' : 'rgba(255,255,255,0.12)')
    });
  }

  var legendHtml = '<div style="padding:8px 12px 6px;font-size:0.71rem;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:14px;flex-wrap:wrap">'
    +'<span>밝기: <b style="color:#4ade80">◎(묘)</b>=최상 · <b style="color:#60a5fa">○(왕)</b>=우수 · <b style="color:#f59e0b">▲(평)</b>=표준 · <b style="color:#94a3b8">△(리)</b>=약화 · <b style="color:#f87171">X(함)</b>=함몰</span>'
    +'<span><b>*</b> 표시는 차성(借星) 보정 밝기이며 원성 대비 1단계 보수 해석</span>'
    +'<span>사화: <b style="color:#4ade80">화록▲</b>=재물·인연 · <b style="color:#60a5fa">화권▲</b>=권위 · <b style="color:#c084fc">화과▲</b>=명성 · <b style="color:#f87171">화기▼</b>=주의</span>'
    +'</div>';

  if (isCompactView) {
    var cardsHtml = cardRows.map(function(it) {
      return '<div style="background:'+it.rowBg+';border:1px solid rgba(255,255,255,0.1);border-left:4px solid '+it.borderColor+';border-radius:10px;padding:10px 12px">'
        +'<div style="font-weight:800;color:#d8b4fe;font-size:0.84rem;line-height:1.35">'+it.icon+' '+it.pNameDisplay+'</div>'
        +'<div style="color:#64748b;font-size:0.69rem;margin-top:2px">'+it.defn+'</div>'
        +'<div style="margin-top:8px;font-size:0.78rem;color:#c084fc">주성</div>'
        +'<div style="margin-top:2px;color:#fde68a;font-size:0.8rem;line-height:1.75">'+it.starsDisp+'</div>'
        +'<div style="margin-top:8px;font-size:0.78rem;color:#c084fc">보조성</div>'
        +'<div style="margin-top:2px;font-size:0.74rem;color:#94a3b8;line-height:1.55">'+it.auxDisp+'</div>'
        +'<div style="margin-top:8px;font-size:0.78rem;color:#c084fc">천기(天機) 요약</div>'
        +'<div style="margin-top:2px;font-size:0.79rem;color:#e2e8f0;line-height:1.6;word-break:keep-all">'+it.summaryText+'</div>'
      +'</div>';
    }).join('');

    return legendHtml
      +'<div style="padding:10px 10px 12px;display:grid;grid-template-columns:1fr;gap:10px">'+cardsHtml+'</div>';
  }

  return legendHtml
    +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:540px">'
    +'<thead><tr style="background:rgba(88,28,220,0.3)">'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem;white-space:nowrap">궁(宮) · 정의</th>'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem">주성(밝기)</th>'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem;white-space:nowrap">보조성</th>'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem">천기(天機) — 통변 요약</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table></div>';
}

function renderZiwei(p, natal, targetId) {
  var birth = window._ziweiBirth || { year:0, month:1, day:1, hour:12, minute:0 };
  var palace = calcZiweiPalaces(birth.year, birth.month, birth.day, birth.hour, birth.minute);
  window._currentZiweiData = palace;
  window.getZiweiStructuredData = function(){
    var cur = window._currentZiweiData;
    if(!cur) return null;
    return {
      meng: cur.meng,
      shen: cur.shen,
      juInfo: cur.juInfo,
      calcMeta: cur.calcMeta || null,
      palaces: (cur.palaceStarData || []).map(function(row){
        return {
          palace: zwDisplayPalaceName(row.palace),
          branch: row.branch,
          stars: row.stars || [],
          auxStars: row.auxStars || [],
          badStars: row.badStars || []
        };
      })
    };
  };

  var html = `
  <style>
    .zw-dashboard {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin: 15px 0 0;
      width: 100%;
      max-width: none;
      font-family: 'Pretendard', sans-serif;
    }
    #ziweiModalSection {
      width: 100%;
      max-width: 100%;
      margin: 0;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    #ziweiModalSection .zw-dashboard {
      margin-top: 8px;
    }
    
    .zw-grid-wrap {
      flex: 1.4;
      background: linear-gradient(135deg, #0a0f25 0%, #1a0b2e 100%);
      padding: 15px;
      border-radius: 16px;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.5);
      position: relative;
      min-width: 0; /* flex child 오버플로우 방지 */
      overflow: hidden;
      -webkit-overflow-scrolling: touch;
    }
    .zw-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(4, minmax(85px, auto));
      gap: 5px;
      width: 100%;
    }
    
    .zw-cell {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 10px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease, background-color 0.24s ease;
      cursor: pointer;
      min-height: 100px;
      height: auto;
      min-width: 0;
      position: relative;
      overflow: visible;
      opacity: 0;
      animation: zwFadeIn 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
      word-break: keep-all;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    @keyframes zwFadeIn {
      0% { opacity: 0; transform: translateY(15px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .zw-cell {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      cursor: pointer; /* iOS Safari: 비대화형 div에 click 이벤트 발화 강제 */
    }
    /* iOS Safari: 자식 요소로 이벤트가 흡수되는 버그 방지 → 부모 .zw-cell onclick 항상 발화 */
    .zw-cell > * { pointer-events: none; }
    .zw-cell.active {
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
      z-index: 10;
      background: rgba(212, 175, 55, 0.15);
      border-color: rgba(212, 175, 55, 0.9);
    }
    .zw-cell:focus-visible {
      outline: 2px solid rgba(250, 204, 21, 0.9);
      outline-offset: 1px;
    }
    @media (hover: hover) {
      .zw-cell:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
        z-index: 10;
        background: rgba(212, 175, 55, 0.15);
        border-color: rgba(212, 175, 55, 0.9);
      }
    }
    
    .zw-center-panel {
      grid-column: 2 / 4;
      grid-row: 2 / 4;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%);
      /* 지속 깜박임 대신 고정 광원 효과로 안정화 */
      box-shadow:
        inset 0 0 30px rgba(212,175,55,0.26),
        0 0 22px rgba(212,175,55,0.2);
      color: #fff;
      padding: 10px;
      word-break: keep-all; /* 번역 대응 */
    }

    
    .zw-cell-5 { grid-area: 1/1; } /* 巳 */
    .zw-cell-6 { grid-area: 1/2; } /* 午 */
    .zw-cell-7 { grid-area: 1/3; } /* 未 */
    .zw-cell-8 { grid-area: 1/4; } /* 申 */
    .zw-cell-4 { grid-area: 2/1; } /* 辰 */
    .zw-cell-9 { grid-area: 2/4; } /* 酉 */
    .zw-cell-3 { grid-area: 3/1; } /* 卯 */
    .zw-cell-10 { grid-area: 3/4; } /* 戌 */
    .zw-cell-2 { grid-area: 4/1; } /* 寅 */
    .zw-cell-1 { grid-area: 4/2; } /* 丑 */
    .zw-cell-0 { grid-area: 4/3; } /* 子 */
    .zw-cell-11 { grid-area: 4/4; } /* 亥 */

    .zw-palace-name {
      font-size: clamp(0.68rem, 0.95vw, 0.84rem);
      color: #FFF;
      font-weight: 800;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      margin-bottom: 5px;
      padding: 0 42px 3px 0;
      line-height: 1.25;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      word-break: keep-all;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    .zw-branch-name { font-size: 0.8rem; color: rgba(255,255,255,0.5); position: absolute; bottom: 4px; right: 6px; font-weight: 900; }
    .zw-stars-wrap,
    .star-list {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 2px;
      z-index: 2;
      position: relative;
      padding-right: 42px;
      max-width: 100%;
      overflow: visible;
    }
    .star-list { font-size: clamp(10px, 1vw, 13px); line-height: 1.28; }
    .zw-star-main {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: clamp(10px, 0.95vw, 14px);
      font-weight: 800;
      color: #FFE28A;
      text-shadow: 0 1px 2px rgba(0,0,0,0.75);
      line-height: 1.25;
      padding: 1px 4px;
      border-radius: 4px;
      background: rgba(255, 215, 0, 0.08);
      border: 1px solid rgba(255, 215, 0, 0.18);
      word-break: keep-all;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    .zw-star-main-borrowed { font-size: clamp(9px, 0.82vw, 12px); font-weight: 700; color: #d6d3d1; text-shadow: none; opacity: 0.9; line-height: 1.25; word-break: keep-all; overflow-wrap: anywhere; white-space: normal; }
    .zw-star-strength { font-size: 0.72rem; font-weight: 900; margin-left: 4px; letter-spacing: 0.02em; }
    .zw-star-strength.myo { color: #4ade80; }
    .zw-star-strength.wang { color: #60a5fa; }
    .zw-star-strength.ri { color: #94a3b8; }
    .zw-star-strength.han { color: #f59e0b; }
    .zw-star-strength.heum { color: #f87171; }
    .zw-star-aux, .zw-star-bad {
      width: 100%;
      font-size: clamp(9px, 0.88vw, 13px);
      font-weight: 700;
      line-height: 1.25;
      word-break: keep-all;
      overflow-wrap: anywhere;
      white-space: normal;
      max-width: 100%;
    }
    .zw-star-aux { color: #9bdfff; text-shadow: 0 1px 1px rgba(0,0,0,0.55); }
    .zw-star-bad { color: #ff8b8b; text-shadow: 0 1px 1px rgba(0,0,0,0.55); }
    .zw-empty { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-style: italic; margin-top: 4px; }
    .zw-dahan { font-size: 0.7rem; color: #10B981; position: absolute; top: 8px; right: 6px; font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 1px 4px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); line-height: 1.2; z-index: 3; }
    .zw-center-title { font-size: 1.3rem; font-weight: 900; color: #FFD700; letter-spacing: 1px; margin-bottom: 6px; text-shadow: 0 0 10px rgba(255,215,0,0.8); }
    .zw-center-desc { font-size: 0.85rem; color: #EEE; line-height: 1.6; }
    .zw-palace-gan { font-size: 0.65rem; color: #BBB; position: absolute; bottom: 4px; right: 26px; }

    /* Right: Dynamic Interpretation Panel */
    .zw-detail-panel {
      flex: 1;
      background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(138, 43, 226, 0.3);
      border-radius: 16px;
      padding: clamp(16px, 2.2vw, 24px);
      color: #E2E8F0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      line-height: 1.65;
      scroll-margin-top: 72px;
      min-width: 0;
      overflow-x: clip;
    }
    #ziweiModalOverlay {
      background: radial-gradient(circle at top, #1c1c2e, #0f0f1a);
    }
    .report-container,
    #zwComprehensiveReport,
    .ziwei-report-container {
      background: transparent;
      border: none;
      box-shadow: none;
      width: 100%;
      max-width: 100%;
      padding-left: 14px;
      padding-right: 14px;
      margin: 0 auto;
      box-sizing: border-box;
    }
    #zwComprehensiveReport,
    .ziwei-report-container {
      width: 100%;
      max-width: none;
    }
    #zwComprehensiveReport .zw-report-col,
    #zwComprehensiveReport .zw-insight-layout,
    #zwComprehensiveReport .zw-cosmic-card,
    #zwComprehensiveReport .zw-love-compat-spread,
    #zwComprehensiveReport .zw-pastlife-archive,
    #zwComprehensiveReport .zw-hidden-power,
    #zwComprehensiveReport .zw-pivot-section {
      width: 100%;
      max-width: 100%;
      margin-left: 0;
      margin-right: 0;
      box-sizing: border-box;
    }
    
    .zw-dp-header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 4px; }
    .zw-dp-title { font-size: 1.4rem; font-weight: 900; color: #FFD700; display: flex; align-items: center; gap: 8px; }
    .zw-dp-subtitle { font-size: 0.85rem; color: #94A3B8; margin-top: 4px; }
    
    .zw-chart-container { width: 100%; height: 210px; position: relative; margin-bottom: 8px; background: rgba(0,0,0,0.25); border-radius: 12px; padding: 10px; box-sizing:border-box; }
    
    .zw-report-section { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 14px; border-left: 3px solid #8A2BE2; transition: all 0.3s; margin-bottom: 8px;}
    .zw-report-section:hover { background: rgba(255,255,255,0.08); }
    .zw-rtitle { font-size: 0.95rem; font-weight: 800; color: #C084FC; margin-bottom: 5px; display:flex; align-items:center; gap:6px; }
    .zw-rdesc { font-size: 0.85rem; line-height: 1.6; color: #CBD5E1; }
    
    .badge-good { background: rgba(129,212,250,0.2); color: #81D4FA; padding: 2px 7px; border-radius: 4px; font-size:0.75rem; }
    .badge-bad { background: rgba(255,82,82,0.2); color: #FF5252; padding: 2px 7px; border-radius: 4px; font-size:0.75rem; }
    
    .zw-empty-state { text-align: center; color: #64748B; font-size: clamp(0.95rem, 1.8vw, 1.1rem); margin: auto; padding: 40px 0;}
    .zw-empty-icon { font-size: 3rem; margin-bottom: 15px; opacity: 0.6; }

    .zw-insight-layout {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
      margin-top: 15px;
    }
    .zw-radar-col {
      flex: 1 1 280px;
      min-width: 260px;
      max-width: 360px;
      background: rgba(0,0,0,0.25);
      border-radius: 12px;
      padding: 15px;
      box-sizing: border-box;
      border: 1px solid rgba(148,163,184,0.16);
    }
    .zw-radar-caption {
      font-size: 0.8rem;
      color: #94A3B8;
      text-align: center;
      margin-bottom: 6px;
    }
    .zw-radar-canvas-wrap {
      position: relative;
      height: min(56vw, 280px);
      min-height: 210px;
      width: 100%;
    }
    .zw-report-col {
      flex: 2 1 340px;
      min-width: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      overflow: visible;
    }
    .zw-report-toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
    }
    .zw-report-close-btn {
      appearance: none;
      border: 1px solid rgba(248, 113, 113, 0.45);
      background: rgba(127, 29, 29, 0.32);
      color: #fecaca;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .zw-report-close-btn:hover {
      background: rgba(153, 27, 27, 0.42);
      border-color: rgba(248, 113, 113, 0.62);
      transform: translateY(-1px);
    }
    .zw-report-close-btn:active {
      transform: translateY(0);
    }
    .zw-summary-close-btn {
      border-color: rgba(56, 189, 248, 0.48);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(12, 74, 110, 0.62));
      color: #bae6fd;
      border-radius: 10px;
      padding: 7px 11px;
      box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.2);
    }
    .zw-summary-close-btn:hover {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(14, 116, 144, 0.72));
      border-color: rgba(103, 232, 249, 0.7);
    }
    .report-card,
    .zw-cosmic-card {
      position: relative;
      overflow: hidden;
      width: 100%;
      padding: 18px;
      border-radius: 14px;
      margin-bottom: 18px;
      line-height: 1.6;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,215,130,0.25);
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: transform 0.2s ease;
    }
    .report-card:hover,
    .zw-cosmic-card:hover {
      transform: translateY(-2px);
    }
    .report-section {
      margin-bottom: 20px;
    }
    .section-title {
      color: #ffd27a;
      font-weight: 600;
    }
    .palace-title {
      font-size: 17px;
      font-weight: 700;
      color: #ffd27a;
      margin-bottom: 8px;
    }
    .card-content,
    .zw-compat-core-text,
    .zw-compat-score-desc,
    .zw-compat-subline,
    .zw-compat-meta,
    .zw-rdesc,
    .zw-scroll-block,
    .zw-pivot-body {
      font-size: 16px;
      line-height: 1.8;
      letter-spacing: 0.2px;
      color: #f0f0f0;
    }
    .ziwei-report-container h3,
    #zwComprehensiveReport h3 {
      font-size: 18px;
      margin-bottom: 10px;
    }
    .zw-love-card {
      background:
        radial-gradient(circle at 14% 20%, rgba(251, 113, 133, 0.18), transparent 36%),
        radial-gradient(circle at 84% 82%, rgba(244, 114, 182, 0.16), transparent 44%),
        linear-gradient(145deg, rgba(36, 13, 56, 0.98), rgba(78, 25, 72, 0.94) 52%, rgba(23, 20, 52, 0.92));
      border-color: rgba(251, 113, 133, 0.42);
    }
    .zw-compat-card {
      background:
        radial-gradient(circle at 12% 18%, rgba(96, 165, 250, 0.14), transparent 34%),
        radial-gradient(circle at 86% 82%, rgba(192, 132, 252, 0.15), transparent 45%),
        linear-gradient(145deg, rgba(24, 18, 62, 0.98), rgba(45, 30, 84, 0.94) 52%, rgba(18, 23, 52, 0.92));
      width: 100%;
      max-width: 100%;
      margin-left: 0;
      margin-right: 0;
      /* 하단 AI 프롬프트 블록이 카드 박스에 잘리지 않도록 */
      overflow: visible !important;
    }
    .zw-compat-ref-details {
      background: rgba(40,20,58,0.55);
      border: 1px solid rgba(196,181,253,0.24);
      border-radius: 11px;
      overflow: hidden;
      transition: border-color .24s ease, box-shadow .24s ease, background .24s ease;
    }
    .zw-compat-ref-details:hover {
      border-color: rgba(244,114,182,0.46);
      box-shadow: 0 10px 18px rgba(17, 7, 37, 0.28), inset 0 0 0 1px rgba(244,114,182,0.14);
    }
    .zw-compat-ref-summary {
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 11px;
      min-height: 44px;
      cursor: pointer;
      color: #fbcfe8;
      font-size: 0.95rem;
      font-weight: 800;
      background:
        linear-gradient(120deg, rgba(244,114,182,0.12), rgba(167,139,250,0.12));
      border-bottom: 1px solid rgba(196,181,253,0.18);
      user-select: none;
      transition: background .22s ease, color .22s ease;
    }
    .zw-compat-ref-summary::-webkit-details-marker {
      display: none;
    }
    .zw-compat-ref-summary::marker {
      content: "";
    }
    .zw-compat-ref-details[open] .zw-compat-ref-summary {
      color: #fde68a;
      background:
        linear-gradient(120deg, rgba(244,114,182,0.2), rgba(167,139,250,0.2));
      border-bottom-color: rgba(251,191,36,0.26);
    }
    .zw-compat-ref-title {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .zw-compat-ref-indicator {
      font-size: 0.72rem;
      color: #c4b5fd;
      border: 1px solid rgba(196,181,253,0.36);
      border-radius: 999px;
      padding: 2px 8px;
      white-space: nowrap;
      transition: color .22s ease, border-color .22s ease, transform .22s ease;
    }
    .zw-compat-ref-details[open] .zw-compat-ref-indicator {
      color: #fef3c7;
      border-color: rgba(251,191,36,0.56);
      transform: translateY(-1px);
    }
    .zw-compat-ref-content {
      padding: 8px 11px 10px;
      animation: zwCompatRefReveal .2s ease;
    }
    .zw-compat-result-shell {
      position: relative;
      overflow: hidden;
      border-radius: 14px;
      padding: 14px 16px;
      background: linear-gradient(145deg, rgba(76,20,68,0.95), rgba(58,26,88,0.94) 42%, rgba(30,20,68,0.95));
      border: 1px solid rgba(251,113,133,0.35);
      box-shadow: inset 0 0 0 1px rgba(244,114,182,0.15), 0 10px 24px rgba(0,0,0,0.32);
    }
    .zw-compat-result-inner {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 12px;
    }
    .zw-compat-result-head {
      background: linear-gradient(120deg, rgba(244,114,182,0.17), rgba(192,132,252,0.16));
      border: 1px solid rgba(244,114,182,0.35);
      border-radius: 11px;
      padding: 10px 11px;
    }
    .zw-compat-headline {
      font-size: 1.02rem;
      color: #fbcfe8;
      font-weight: 900;
      line-height: 1.45;
    }
    .zw-compat-subline {
      font-size: 0.82rem;
      color: #f9a8d4;
      margin-top: 6px;
      line-height: 1.6;
    }
    .zw-compat-meta {
      font-size: 0.76rem;
      color: #c4b5fd;
      margin-top: 5px;
      line-height: 1.6;
    }
    .zw-compat-core-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .zw-compat-core-panel {
      background: rgba(40,20,58,0.55);
      border: 1px solid rgba(196,181,253,0.24);
      border-radius: 11px;
      padding: 10px 11px;
    }
    .zw-compat-core-title {
      color: #ffd27a;
      font-size: 0.93rem;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .zw-compat-core-text {
      font-size: 0.83rem;
      color: #f3e8ff;
      line-height: 1.72;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .zw-compat-core-text b {
      color: #fce7f3;
    }
    .zw-compat-score-list {
      display: grid;
      gap: 8px;
    }
    .zw-compat-score-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 9px;
      border-radius: 9px;
      background: rgba(50,26,70,0.45);
      border: 1px solid rgba(244,114,182,0.2);
    }
    .zw-compat-score-row b {
      color: #fbcfe8;
      font-size: 0.86rem;
    }
    .zw-compat-score-tag {
      display: block;
      margin-top: 2px;
      color: #f9a8d4;
      font-size: 0.74rem;
      line-height: 1.45;
    }
    .zw-compat-score-desc {
      margin-top: 5px;
      color: #f3e8ff;
      font-size: 0.79rem;
      line-height: 1.58;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    @keyframes zwCompatRefReveal {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .zw-cosmic-stars {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        radial-gradient(circle at 14% 28%, rgba(255,255,255,0.44) 0 1px, transparent 1.4px),
        radial-gradient(circle at 34% 66%, rgba(255,255,255,0.34) 0 1px, transparent 1.5px),
        radial-gradient(circle at 62% 22%, rgba(255,255,255,0.38) 0 1px, transparent 1.4px),
        radial-gradient(circle at 82% 58%, rgba(255,255,255,0.3) 0 1px, transparent 1.4px),
        radial-gradient(circle at 72% 84%, rgba(255,255,255,0.28) 0 1px, transparent 1.3px);
      opacity: 0.82;
    }
    .zw-cosmic-heading {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding-bottom: 10px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(196, 181, 253, 0.28);
    }
    .zw-cosmic-heading h2 {
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: keep-all;
      flex: 1 1 170px;
    }
    .zw-cosmic-chip {
      font-size: 0.68rem;
      border-radius: 999px;
      padding: 2px 7px;
      white-space: nowrap;
      max-width: 100%;
      border: 1px solid rgba(196, 181, 253, 0.5);
      background: rgba(67, 56, 202, 0.22);
      color: #e9d5ff;
      box-shadow: 0 0 14px rgba(167, 139, 250, 0.2);
    }
    .zw-cosmic-input-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 8px;
      align-items: end;
    }
    .zw-cosmic-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .zw-cosmic-field > span {
      font-size: 0.76rem;
      color: #c4b5fd;
    }
    .zw-cosmic-control {
      height: 42px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid rgba(196, 181, 253, 0.4);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(17, 24, 39, 0.88));
      color: #f3e8ff;
      outline: none;
      box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.08);
    }
    .zw-cosmic-control:focus {
      border-color: rgba(244, 114, 182, 0.7);
      box-shadow: 0 0 0 2px rgba(244, 114, 182, 0.18), inset 0 0 0 1px rgba(125, 211, 252, 0.14);
    }
    .zw-cosmic-btn {
      height: 44px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid rgba(196, 181, 253, 0.5);
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.84), rgba(30, 64, 175, 0.84));
      color: #ede9fe;
      font-weight: 800;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 0 6px 14px rgba(79, 70, 229, 0.26);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }
    .zw-cosmic-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 18px rgba(79, 70, 229, 0.34);
    }
    .zw-love-compat-spread {
      position: relative;
      z-index: 1;
      margin-bottom: 14px;
      border-radius: 14px;
      border: 1px solid rgba(250, 204, 21, 0.32);
      background:
        radial-gradient(circle at 8% 16%, rgba(251, 191, 36, 0.2), transparent 30%),
        radial-gradient(circle at 90% 18%, rgba(125, 211, 252, 0.18), transparent 34%),
        radial-gradient(circle at 52% 88%, rgba(192, 132, 252, 0.15), transparent 42%),
        linear-gradient(145deg, rgba(23, 16, 54, 0.96), rgba(41, 24, 79, 0.95) 48%, rgba(14, 31, 58, 0.93));
      box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.14), 0 12px 28px rgba(0, 0, 0, 0.38);
      overflow: hidden;
      padding: 14px;
    }
    .zw-love-compat-spread::before {
      content: '';
      position: absolute;
      inset: 8px;
      border: 1px dashed rgba(250, 204, 21, 0.28);
      border-radius: 10px;
      pointer-events: none;
    }
    .zw-love-compat-title {
      position: relative;
      z-index: 1;
      text-align: center;
      color: #fef3c7;
      font-size: 1.04rem;
      font-weight: 900;
      letter-spacing: 0.01em;
      text-shadow: 0 2px 10px rgba(250, 204, 21, 0.24);
      margin-bottom: 8px;
    }
    .zw-love-compat-sub {
      position: relative;
      z-index: 1;
      text-align: center;
      font-size: 0.78rem;
      color: #ddd6fe;
      margin-bottom: 10px;
    }
    .zw-love-compat-canvas-wrap {
      position: relative;
      z-index: 1;
      border-radius: 12px;
      border: 1px solid rgba(196, 181, 253, 0.3);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(30, 27, 75, 0.72));
      overflow: hidden;
      min-height: 300px;
    }
    .zw-love-compat-canvas {
      width: 100%;
      height: 100%;
      min-height: 300px;
      display: block;
    }
    .zw-love-metric-grid {
      position: relative;
      z-index: 1;
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 7px;
    }
    .zw-love-metric-item {
      border-radius: 9px;
      border: 1px solid rgba(196, 181, 253, 0.32);
      background: rgba(15, 23, 42, 0.5);
      padding: 7px 8px;
      color: #e2e8f0;
      font-size: 0.76rem;
      line-height: 1.45;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .zw-love-metric-item b {
      color: #fef3c7;
      font-size: 0.82rem;
      white-space: nowrap;
    }
    .ziwei-report-container .love-card,
    .ziwei-report-container .compatibility-card {
      border-radius: 12px;
      border: 1px solid rgba(255, 182, 193, 0.35);
      box-shadow: 0 0 16px rgba(255, 182, 193, 0.18);
      background: rgba(42, 28, 58, 0.72);
      backdrop-filter: blur(5px);
    }
    .ziwei-report-container .love-title {
      font-family: "Playfair Display", "Cormorant Garamond", serif;
      color: #ffd6a5;
      letter-spacing: 0.015em;
      text-shadow: 0 0 6px rgba(255, 214, 165, 0.28);
      font-weight: 900;
    }
    .ziwei-report-container .love-text {
      color: #fff6f0;
      font-size: 1rem;
      line-height: 1.65;
    }
    .ziwei-report-container .compatibility-score {
      color: #ffd6a5;
      font-weight: 800;
      font-size: 1.08rem;
      text-shadow: 0 0 6px rgba(255, 214, 165, 0.3);
    }
    .ziwei-report-container .star-effect {
      position: relative;
      overflow: hidden;
    }
    .ziwei-report-container .star-effect::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.34;
      background-image:
        radial-gradient(circle at 9% 22%, rgba(255, 243, 229, 0.72) 0 1px, transparent 1.7px),
        radial-gradient(circle at 27% 71%, rgba(255, 220, 186, 0.55) 0 1px, transparent 1.7px),
        radial-gradient(circle at 48% 35%, rgba(255, 241, 224, 0.62) 0 1px, transparent 1.6px),
        radial-gradient(circle at 66% 56%, rgba(255, 210, 173, 0.48) 0 1px, transparent 1.7px),
        radial-gradient(circle at 82% 19%, rgba(255, 235, 214, 0.66) 0 1px, transparent 1.5px),
        radial-gradient(circle at 91% 74%, rgba(255, 208, 181, 0.46) 0 1px, transparent 1.8px);
      animation: zwStarTwinkle 3.5s infinite ease-in-out;
    }
    @keyframes zwStarTwinkle {
      0%, 100% { opacity: 0.32; }
      50% { opacity: 0.62; }
    }
    #ziweiModalOverlay {
      background:
        radial-gradient(circle at 12% 18%, rgba(255, 180, 168, 0.15), transparent 36%),
        radial-gradient(circle at 84% 22%, rgba(196, 154, 255, 0.12), transparent 42%),
        linear-gradient(180deg, #1f1a2e 0%, #2d1f3f 60%, #342341 100%);
    }
    @media (max-width: 768px) {
      .ziwei-report-container .love-title {
        font-size: 1.04rem;
      }
      .ziwei-report-container .love-text {
        font-size: 0.94rem;
        line-height: 1.58;
      }
      .ziwei-report-container .love-card,
      .ziwei-report-container .compatibility-card {
        border-radius: 10px;
        padding: 10px;
      }
      .ziwei-report-container .compatibility-score {
        font-size: 1rem;
      }
    }
    .zw-persona-wuxing-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
      gap: 10px;
      align-items: stretch;
    }
    .zw-persona-wuxing-left,
    .zw-persona-wuxing-right {
      min-width: 0;
    }
    .zw-pastlife-archive {
      position: relative;
      border-radius: 14px;
      border: 1px solid rgba(212, 176, 120, 0.38);
      background:
        radial-gradient(circle at 16% 22%, rgba(246, 189, 96, 0.14), transparent 38%),
        radial-gradient(circle at 84% 84%, rgba(104, 148, 205, 0.14), transparent 46%),
        linear-gradient(150deg, rgba(25, 34, 58, 0.95), rgba(58, 39, 30, 0.95) 50%, rgba(19, 29, 48, 0.96));
      box-shadow: inset 0 0 0 1px rgba(255, 223, 164, 0.08), 0 16px 36px rgba(0, 0, 0, 0.34);
      overflow: hidden;
      padding: 12px;
      font-family: "Cinzel", "Noto Serif KR", "Times New Roman", serif;
    }
    .zw-pastlife-nebula {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 24% 18%, rgba(250, 214, 150, 0.16), transparent 32%),
        radial-gradient(circle at 72% 8%, rgba(138, 170, 230, 0.14), transparent 34%),
        radial-gradient(circle at 86% 70%, rgba(255, 195, 107, 0.12), transparent 38%),
        radial-gradient(circle at 10% 82%, rgba(158, 116, 242, 0.09), transparent 42%);
      opacity: 0.95;
    }
    .zw-pastlife-sparkles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.72;
      background-image:
        radial-gradient(circle at 11% 26%, rgba(255,243,207,0.7) 0 1px, transparent 1.5px),
        radial-gradient(circle at 35% 42%, rgba(255,230,180,0.54) 0 1px, transparent 1.6px),
        radial-gradient(circle at 58% 16%, rgba(201,219,255,0.52) 0 1px, transparent 1.6px),
        radial-gradient(circle at 76% 38%, rgba(255,234,191,0.62) 0 1px, transparent 1.4px),
        radial-gradient(circle at 88% 72%, rgba(255,244,215,0.52) 0 1px, transparent 1.5px),
        radial-gradient(circle at 22% 78%, rgba(224,233,255,0.42) 0 1px, transparent 1.4px);
    }
    .zw-pastlife-layout {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 10px;
    }
    .zw-pastlife-head {
      border: 1px solid rgba(233, 196, 141, 0.34);
      border-radius: 10px;
      padding: 10px 11px;
      background: linear-gradient(120deg, rgba(68, 50, 40, 0.6), rgba(28, 38, 62, 0.52));
    }
    .zw-pastlife-title {
      color: #ffe4b7;
      font-size: 0.98rem;
      font-weight: 900;
      letter-spacing: 0.01em;
      text-shadow: 0 2px 10px rgba(231, 177, 87, 0.2);
    }
    .zw-pastlife-sub {
      margin-top: 5px;
      color: #e9d6b7;
      font-size: 0.8rem;
      line-height: 1.64;
    }
    .zw-pastlife-main {
      display: grid;
      grid-template-columns: minmax(0, 1.75fr) minmax(150px, 0.95fr);
      gap: 10px;
      align-items: stretch;
    }
    .zw-chronos-scroll {
      position: relative;
      border-radius: 12px;
      border: 1px solid rgba(222, 184, 135, 0.5);
      background:
        radial-gradient(circle at 80% 16%, rgba(255, 230, 180, 0.2), transparent 30%),
        repeating-linear-gradient(0deg, rgba(137, 102, 72, 0.08) 0 2px, rgba(173, 133, 91, 0.08) 2px 4px),
        linear-gradient(160deg, rgba(111, 83, 56, 0.95), rgba(143, 109, 73, 0.94) 45%, rgba(98, 73, 49, 0.95));
      box-shadow: inset 0 0 0 1px rgba(255, 222, 173, 0.2), 0 8px 18px rgba(0, 0, 0, 0.3);
      padding: 11px;
    }
    .zw-chronos-scroll::before,
    .zw-chronos-scroll::after {
      content: "";
      position: absolute;
      top: 8px;
      bottom: 8px;
      width: 8px;
      border-radius: 99px;
      background: linear-gradient(180deg, rgba(70, 49, 32, 0.95), rgba(102, 74, 52, 0.95));
      box-shadow: inset 0 0 0 1px rgba(236, 202, 155, 0.24);
      pointer-events: none;
    }
    .zw-chronos-scroll::before { left: 4px; }
    .zw-chronos-scroll::after { right: 4px; }
    .zw-chronos-map {
      position: relative;
      height: 98px;
      border-radius: 8px;
      border: 1px dashed rgba(89, 128, 182, 0.7);
      background:
        radial-gradient(circle at 30% 20%, rgba(24, 35, 63, 0.52), transparent 40%),
        linear-gradient(155deg, rgba(20, 32, 56, 0.7), rgba(17, 28, 46, 0.54));
      overflow: hidden;
      margin-bottom: 8px;
    }
    .zw-chronos-map i {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffde9e;
      box-shadow: 0 0 8px rgba(255, 215, 137, 0.75);
    }
    .zw-chronos-map b {
      position: absolute;
      display: block;
      height: 1px;
      transform-origin: left center;
      background: linear-gradient(90deg, rgba(255, 211, 133, 0.6), rgba(146, 173, 220, 0.56));
    }
    .zw-scroll-block {
      font-size: 0.78rem;
      line-height: 1.62;
      color: #f9f0de;
      margin-bottom: 6px;
      text-shadow: 0 1px 1px rgba(22, 18, 11, 0.28);
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .zw-scroll-block b {
      color: #ffe3b4;
      font-weight: 900;
      margin-right: 4px;
    }
    .zw-karmic-seals {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      margin-top: 6px;
    }
    .zw-karmic-seal {
      border-radius: 8px;
      border: 1px solid rgba(233, 194, 129, 0.36);
      background: rgba(39, 33, 57, 0.45);
      padding: 6px 6px;
      text-align: center;
      color: #d6be95;
      font-size: 0.68rem;
      line-height: 1.45;
    }
    .zw-karmic-seal b {
      display: block;
      color: #ffe5bd;
      font-size: 0.83rem;
      margin-bottom: 2px;
    }
    .zw-karmic-seal.active {
      border-color: rgba(255, 221, 149, 0.72);
      color: #fff1d4;
      background: linear-gradient(155deg, rgba(95, 60, 37, 0.78), rgba(35, 47, 74, 0.78));
      box-shadow: inset 0 0 0 1px rgba(255, 230, 175, 0.24), 0 0 12px rgba(242, 192, 106, 0.24);
    }
    .zw-hourglass-wrap {
      border-radius: 12px;
      border: 1px solid rgba(228, 190, 128, 0.46);
      background:
        radial-gradient(circle at 46% 16%, rgba(255, 221, 160, 0.14), transparent 34%),
        linear-gradient(170deg, rgba(31, 45, 74, 0.92), rgba(55, 38, 33, 0.92) 52%, rgba(32, 30, 47, 0.92));
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
      min-height: 100%;
    }
    .zw-hourglass {
      width: 88px;
      height: 132px;
      border-radius: 12px;
      border: 1px solid rgba(244, 206, 147, 0.5);
      background: linear-gradient(180deg, rgba(20, 28, 50, 0.88), rgba(18, 18, 32, 0.92));
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(255, 226, 173, 0.18);
    }
    .zw-hourglass::before,
    .zw-hourglass::after {
      content: "";
      position: absolute;
      left: 13px;
      right: 13px;
      height: 42%;
      border: 1px solid rgba(255, 221, 170, 0.34);
      border-radius: 999px;
      pointer-events: none;
    }
    .zw-hourglass::before { top: 9px; }
    .zw-hourglass::after { bottom: 9px; }
    .zw-hourglass-neck {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 22px;
      border-radius: 99px;
      background: rgba(255, 214, 145, 0.38);
      box-shadow: 0 0 8px rgba(255, 214, 145, 0.4);
    }
    .zw-hourglass-sand-top,
    .zw-hourglass-sand-bottom {
      position: absolute;
      left: 19px;
      right: 19px;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 219, 141, 0.95), rgba(214, 145, 57, 0.9));
      box-shadow: 0 0 9px rgba(255, 190, 82, 0.42);
    }
    .zw-hourglass-sand-top { top: 16px; }
    .zw-hourglass-sand-bottom { bottom: 16px; }
    .zw-hourglass-score {
      color: #ffe7c0;
      font-size: 0.9rem;
      font-weight: 900;
      letter-spacing: 0.02em;
      text-shadow: 0 2px 10px rgba(242, 188, 94, 0.3);
    }
    .zw-hourglass-note {
      text-align: center;
      color: #e5d3b2;
      font-size: 0.72rem;
      line-height: 1.52;
    }
    .zw-palace-pillars {
      border: 1px solid rgba(224, 185, 124, 0.3);
      border-radius: 11px;
      background: linear-gradient(165deg, rgba(24, 35, 61, 0.62), rgba(56, 42, 34, 0.56));
      padding: 9px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      align-items: end;
    }
    .zw-palace-pillar {
      border-radius: 8px;
      border: 1px solid rgba(232, 193, 130, 0.34);
      background: rgba(17, 20, 36, 0.55);
      padding: 6px 6px;
      text-align: center;
      display: grid;
      gap: 5px;
      min-height: 120px;
      align-content: end;
    }
    .zw-palace-beam {
      width: 100%;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 227, 170, 0.92), rgba(232, 154, 67, 0.8) 60%, rgba(134, 117, 230, 0.58));
      box-shadow: 0 0 14px rgba(255, 205, 120, 0.35);
      min-height: 24px;
    }
    .zw-palace-name {
      color: #e9d6b2;
      font-size: 0.7rem;
      line-height: 1.4;
    }
    .zw-palace-score {
      color: #ffebc8;
      font-size: 0.82rem;
      font-weight: 900;
    }
    .zw-pivot-section {
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at 14% 20%, rgba(96, 165, 250, 0.18), transparent 34%),
        radial-gradient(circle at 86% 78%, rgba(192, 132, 252, 0.2), transparent 42%),
        linear-gradient(155deg, rgba(8, 16, 42, 0.95), rgba(20, 28, 63, 0.92) 52%, rgba(13, 22, 49, 0.92));
      padding: 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid rgba(125, 211, 252, 0.35);
      box-shadow: inset 0 0 0 1px rgba(196, 181, 253, 0.12), 0 14px 28px rgba(2, 6, 23, 0.38);
    }
    .zw-pivot-section::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        radial-gradient(circle at 12% 24%, rgba(255,255,255,0.46) 0 1px, transparent 1.5px),
        radial-gradient(circle at 28% 76%, rgba(255,255,255,0.38) 0 1px, transparent 1.5px),
        radial-gradient(circle at 58% 18%, rgba(255,255,255,0.42) 0 1px, transparent 1.5px),
        radial-gradient(circle at 74% 62%, rgba(255,255,255,0.34) 0 1px, transparent 1.4px),
        radial-gradient(circle at 90% 34%, rgba(255,255,255,0.32) 0 1px, transparent 1.4px);
      opacity: 0.68;
    }
    .zw-pivot-title {
      position: relative;
      z-index: 1;
      color: #f8b4ff;
      font-size: 1.2rem;
      margin-top: 0;
      border-bottom: 1px solid rgba(196, 181, 253, 0.4);
      padding-bottom: 8px;
    }
    .zw-pivot-sub {
      position: relative;
      z-index: 1;
      font-size: 0.78rem;
      color: #bfdbfe;
      margin: 0 0 10px;
      line-height: 1.6;
    }
    .zw-pivot-deck {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .zw-pivot-card {
      position: relative;
      border-radius: 12px;
      border: 1px solid rgba(var(--pivot-rgb, 167,139,250), 0.45);
      background:
        radial-gradient(circle at 14% 16%, rgba(var(--pivot-rgb, 167,139,250), 0.3), transparent 36%),
        radial-gradient(circle at 86% 82%, rgba(125, 211, 252, 0.14), transparent 42%),
        linear-gradient(162deg, rgba(10, 20, 49, 0.94), rgba(21, 33, 73, 0.9));
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 22px rgba(2,6,23,0.34);
      transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
    }
    .zw-pivot-card:hover {
      transform: translateY(-2px);
      border-color: rgba(var(--pivot-rgb, 167,139,250), 0.78);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 24px rgba(0,0,0,0.32);
    }
    .zw-pivot-card.is-open {
      border-color: rgba(var(--pivot-rgb, 167,139,250), 0.92);
      box-shadow: 0 12px 28px rgba(0,0,0,0.34), 0 0 0 1px rgba(var(--pivot-rgb, 167,139,250), 0.4);
    }
    .zw-pivot-toggle {
      width: 100%;
      text-align: left;
      border: none;
      background: transparent;
      padding: 13px 14px 11px;
      min-height: 54px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #e2e8f0;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .zw-pv-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }
    .zw-pv-top-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .zw-pv-num-badge {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(var(--pivot-rgb, 167,139,250), 0.22);
      border: 1.5px solid rgba(var(--pivot-rgb, 167,139,250), 0.6);
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      font-size: 0.78rem;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .zw-pv-tap-hint {
      flex-shrink: 0;
      font-size: 0.62rem;
      color: rgba(var(--pivot-rgb, 167,139,250), 0.55);
      font-weight: 700;
      margin-left: auto;
      white-space: nowrap;
      transition: opacity .2s;
    }
    .zw-pivot-card.is-open .zw-pv-tap-hint {
      opacity: 0;
      pointer-events: none;
    }
    .zw-pivot-chip {
      font-size: 0.67rem;
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      border: 1px solid rgba(var(--pivot-rgb, 167,139,250), 0.58);
      background: rgba(var(--pivot-rgb, 167,139,250), 0.14);
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 800;
      white-space: nowrap;
      width: max-content;
    }
    .zw-pivot-age-range {
      font-size: 0.7rem;
      color: rgba(var(--pivot-rgb, 167,139,250), 0.95);
      font-weight: 800;
      background: rgba(var(--pivot-rgb, 167,139,250), 0.11);
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(var(--pivot-rgb, 167,139,250), 0.34);
      white-space: nowrap;
    }
    .zw-pivot-chevron {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 1px solid rgba(var(--pivot-rgb, 167,139,250), 0.58);
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      background: rgba(15, 23, 42, 0.55);
      font-size: 0.6rem;
      line-height: 1;
      transform: rotate(0deg);
      transition: transform .2s ease, color .2s ease, border-color .2s ease, background .2s ease;
      flex-shrink: 0;
    }
    .zw-pv-main {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .zw-pivot-icon-wrap {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      background: rgba(var(--pivot-rgb, 167,139,250), 0.18);
      border: 1.5px solid rgba(var(--pivot-rgb, 167,139,250), 0.45);
      box-shadow: 0 0 16px rgba(var(--pivot-rgb, 167,139,250), 0.26);
    }
    .zw-pivot-title-stack {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .zw-pivot-palace-label {
      font-size: 0.96rem;
      font-weight: 900;
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .zw-pivot-type-tag {
      display: inline-flex;
      align-items: center;
      font-size: 0.63rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(var(--pivot-rgb, 167,139,250), 0.38);
      background: rgba(var(--pivot-rgb, 167,139,250), 0.12);
      color: rgba(var(--pivot-rgb, 167,139,250), 0.9);
      width: max-content;
    }
    .zw-pivot-card.is-open .zw-pivot-chevron {
      transform: rotate(180deg);
      color: #fef3c7;
      border-color: rgba(251, 191, 36, 0.64);
      background: rgba(126, 34, 206, 0.35);
    }
    .zw-pivot-body {
      display: none !important;
      padding: 0 14px 16px;
      color: #e2e8f0;
      font-size: 0.84rem;
      line-height: 1.72;
    }
    .zw-pivot-card.is-open .zw-pivot-body {
      display: block !important;
      animation: zwPivotBodyIn .32s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes zwPivotBodyIn {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .zw-pv-section {
      background: rgba(255,255,255,0.038);
      border-radius: 9px;
      padding: 9px 11px;
      margin-bottom: 8px;
      border: 1px solid rgba(255,255,255,0.07);
    }
    .zw-pv-section-title {
      font-size: 0.72rem;
      font-weight: 800;
      color: rgba(var(--pivot-rgb, 167,139,250), 0.94);
      margin-bottom: 7px;
      display: flex;
      align-items: center;
      gap: 4px;
      letter-spacing: 0.01em;
    }
    .zw-pv-star-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 5px;
    }
    .zw-pv-star-tag {
      font-size: 0.67rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(167,139,250,0.15);
      border: 1px solid rgba(167,139,250,0.3);
      color: #e9d5ff;
      line-height: 1.45;
    }
    .zw-pv-star-tag.chance {
      background: rgba(74,222,128,0.13);
      border-color: rgba(74,222,128,0.36);
      color: #bbf7d0;
    }
    .zw-pv-star-tag.crisis {
      background: rgba(248,113,113,0.13);
      border-color: rgba(248,113,113,0.36);
      color: #fecaca;
    }
    .zw-pv-strategy-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .zw-pv-strategy-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font-size: 0.8rem;
      line-height: 1.65;
      color: #cbd5e1;
    }
    .zw-pv-strategy-num {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(var(--pivot-rgb, 167,139,250), 0.22);
      border: 1px solid rgba(var(--pivot-rgb, 167,139,250), 0.5);
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      font-size: 0.65rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 3px;
    }
    .zw-pv-risk {
      background: rgba(248,113,113,0.07);
      border: 1px solid rgba(248,113,113,0.28);
      border-radius: 9px;
      padding: 9px 11px;
      margin-bottom: 8px;
    }
    .zw-pv-risk-title {
      font-size: 0.71rem;
      font-weight: 800;
      color: #fca5a5;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .zw-pv-risk-text {
      font-size: 0.79rem;
      color: #fecaca;
      line-height: 1.62;
    }
    .zw-pv-protocol {
      font-size: 0.77rem;
      color: #f3e8ff;
      line-height: 1.6;
      margin-top: 5px;
      padding-top: 5px;
      border-top: 1px solid rgba(248,113,113,0.18);
    }
    .zw-pv-oneline {
      background: linear-gradient(135deg, rgba(var(--pivot-rgb, 167,139,250), 0.12), rgba(var(--pivot-rgb, 167,139,250), 0.06));
      border-left: 3px solid rgba(var(--pivot-rgb, 167,139,250), 0.7);
      border-radius: 0 9px 9px 0;
      padding: 9px 11px;
      font-size: 0.83rem;
      color: #f0f9ff;
      font-style: italic;
      line-height: 1.55;
      font-weight: 700;
    }
    .zw-pv-score-bar-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .zw-pv-score-bar {
      flex: 1;
      height: 5px;
      border-radius: 999px;
      background: rgba(255,255,255,0.1);
      overflow: hidden;
    }
    .zw-pv-score-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(var(--pivot-rgb, 167,139,250), 0.7), rgba(var(--pivot-rgb, 167,139,250), 1));
      transition: width 0.6s ease;
    }
    .zw-pv-score-val {
      font-size: 0.68rem;
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      font-weight: 800;
      white-space: nowrap;
    }
    @media (min-width: 1100px) {
      .zw-dashboard {
        flex-direction: column;
        align-items: stretch;
      }
      .zw-grid-wrap {
        flex: 1;
      }
      .zw-detail-panel {
        flex: 1;
      }
      .zw-radar-col {
        position: static;
      }
    }

    /* 모바일 반응형 — 12궁 그리드 구조 유지, 소형화 */
    @media (max-width: 768px) {
      #ziweiModalSection {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      #ziweiModalSheet > div {
        max-width: 100% !important;
        padding-left: 4px !important;
        padding-right: 4px !important;
      }
      .zw-pastlife-main {
        grid-template-columns: 1fr;
      }
      .zw-hourglass-wrap {
        min-height: auto;
      }
      .zw-karmic-seals {
        grid-template-columns: 1fr;
      }
      .zw-palace-pillars {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .zw-dashboard { flex-direction: column; }
      .zw-grid-wrap {
        padding: 8px;
        border-radius: 12px;
        overflow-x: auto;
        overflow-y: visible;
      }
      /* 12궁 4×4 그리드 — aspect-ratio 기반 정방형, 모든 모바일 해상도 대응 */
      .zw-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(124px, 1fr));
        grid-template-rows: repeat(4, minmax(74px, auto));
        gap: 3px;
        min-width: 540px;
        width: 540px;
      }
      .zw-cell {
        min-height: 74px;
        height: auto;
        padding: 5px 3px;
        border-radius: 7px;
        background: linear-gradient(135deg, rgba(25,30,50,0.85), rgba(10,15,30,0.95));
        border: 1px solid rgba(212,175,55,0.2);
        overflow: visible;
        min-width: 0;
        word-break: keep-all;
        overflow-wrap: anywhere;
        white-space: normal;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        opacity: 1;
        animation: none;
      }
      .zw-center-panel {
        grid-column: 2 / 4;
        grid-row: 2 / 4;
        min-width: unset;
        height: 100%;
        min-height: 0;
        padding: 8px 6px;
        border-radius: 10px;
        background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(20,25,45,0.92) 70%);
        border: 1px solid rgba(212,175,55,0.45);
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .zw-center-title { font-size: 0.8rem; margin-bottom: 4px; }
      .zw-center-desc { font-size: 0.62rem; line-height: 1.4; display: block; }
      /* 가변 폰트(clamp): 좁은 화면에서도 텍스트 넘침 방지 */
      .zw-palace-name { font-size: 0.66rem; margin-bottom: 3px; padding: 0 30px 2px 0; }
      .zw-stars-wrap, .star-list { padding-right: 30px; }
      .zw-star-main { font-size: 0.74rem; margin-bottom: 1px; padding: 1px 3px; }
      .zw-star-main-borrowed { font-size: 0.6rem; }
      .zw-star-aux, .zw-star-bad { font-size: 0.62rem; line-height: 1.35; }
      .zw-branch-name { font-size: 0.66rem; bottom: 2px; right: 4px; }
      .zw-palace-gan { font-size: 0.58rem; bottom: 2px; right: 18px; }
      .zw-dahan { font-size: 0.58rem; top: 3px; right: 3px; padding: 1px 3px; line-height: 1.15; }
      .zw-empty { font-size: 0.58rem; }
      .zw-radar-col {
        min-width: 0;
        max-width: none;
        padding: 10px;
      }
      .zw-radar-canvas-wrap { height: min(70vw, 260px); min-height: 200px; }
      .zw-detail-panel { padding: 11px; border-radius: 12px; }
      .zw-insight-layout { gap: 10px; }
      .report-container,
      #zwComprehensiveReport,
      .ziwei-report-container {
        width: 100%;
        max-width: 100%;
        padding-left: 14px;
        padding-right: 14px;
        margin: 0 auto;
        box-sizing: border-box;
        overflow-x: hidden;
      }
      .report-card,
      .zw-cosmic-card {
        width: 100%;
        padding: 16px;
      }
      .card-content,
      .zw-compat-core-text,
      .zw-compat-score-desc,
      .zw-compat-subline,
      .zw-compat-meta,
      .zw-rdesc,
      .zw-scroll-block,
      .zw-pivot-body {
        font-size: 15.5px;
      }
      .zw-cosmic-stars {
        display: none;
      }
      .zw-cosmic-card {
        box-shadow: none;
        backdrop-filter: none;
      }
      .zw-love-compat-canvas-wrap,
      .zw-love-compat-canvas {
        min-height: 220px;
      }
      .zw-love-metric-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ziwei-report-container .zw-cosmic-card,
      .ziwei-report-container .zw-love-compat-spread,
      .ziwei-report-container .zw-pivot-section,
      .ziwei-report-container .zw-pastlife-archive {
        width: 100%;
        max-width: 100%;
        margin-left: 0;
        margin-right: 0;
        box-sizing: border-box;
      }
      .ziwei-report-container .zw-report-col,
      .ziwei-report-container .zw-pivot-body,
      .ziwei-report-container .zw-compat-ref-content {
        overflow-x: hidden;
      }
      .ziwei-report-container .zw-pastlife-archive { padding: 7px; }
      .ziwei-report-container .zw-pastlife-layout {
        gap: 8px;
      }
      .ziwei-report-container .zw-pastlife-head {
        padding: 9px 9px;
      }
      .ziwei-report-container .zw-pastlife-main {
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
      }
      .ziwei-report-container .zw-chronos-scroll {
        padding: 8px;
      }
      .ziwei-report-container .zw-chronos-scroll::before,
      .ziwei-report-container .zw-chronos-scroll::after {
        display: none;
      }
      .ziwei-report-container table {
        display: block;
        width: max-content;
        min-width: 100%;
        overflow-x: auto;
      }
      .zw-dashboard {
        max-width: 100%;
      }
      .zw-persona-wuxing-grid {
        grid-template-columns: 1fr;
      }
      .zw-persona-wuxing-right {
        min-height: 240px;
      }
      .zw-compat-ref-summary {
        font-size: 0.88rem;
        padding: 10px;
      }
      .zw-compat-ref-indicator {
        font-size: 0.68rem;
        padding: 2px 7px;
      }
      .zw-pivot-headline {
        font-size: 0.88rem;
      }
      .zw-pivot-age {
        font-size: 0.68rem;
      }
      .zw-compat-result-shell {
        padding: 12px 12px;
      }
      .zw-compat-core-grid {
        grid-template-columns: 1fr;
      }
      .zw-compat-headline {
        font-size: 0.95rem;
      }
      .zw-compat-subline {
        font-size: 0.79rem;
      }
    }

    @media (max-width: 430px) {
      .zw-grid {
        min-width: 500px;
        width: 500px;
      }
      .report-container,
      #zwComprehensiveReport,
      .ziwei-report-container {
        padding-left: 10px;
        padding-right: 10px;
      }
      .report-card,
      .zw-cosmic-card,
      .ziwei-report-container .zw-love-compat-spread,
      .ziwei-report-container .zw-pivot-section,
      .ziwei-report-container .zw-pastlife-archive {
        padding-left: 7px;
        padding-right: 7px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .zw-cell {
        animation: none !important;
        opacity: 1;
      }
      .zw-cell,
      .zw-cell:hover,
      .zw-report-section,
      .zw-dashboard,
      .zw-detail-panel {
        transition: none !important;
        transform: none !important;
      }
    }

/* 퀀텀 명리 엔진 업그레이드 스타일 (Premium UX) */
.quantum-mode {
  padding: 35px 25px;
  background: linear-gradient(145deg, rgba(20,25,45,0.85), rgba(30,35,65,0.95));
  border-radius: 28px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 25px 50px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #f8fafc;
  margin-bottom: 35px;
  position: relative;
  overflow: visible;
  text-align: center;
  font-family: 'Pretendard', sans-serif;
}
.quantum-title { 
  font-size: 1.6rem; 
  font-weight: 900; 
  letter-spacing: 4px; 
  background: linear-gradient(to right, #e2e8f0, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px; 
  text-transform: uppercase; 
  text-shadow: 0 2px 10px rgba(167,139,250,0.2);
}
.quantum-subtitle { font-size: 0.95rem; color: #cbd5e1; font-weight: 400; margin-bottom: 35px; letter-spacing: 0.5px; opacity: 0.9; }

/* 3D Card */
.quantum-card-scene { width: 190px; height: 280px; margin: 0 auto; perspective: 1200px; z-index: 2; position: relative; }
.quantum-card { width: 100%; height: 100%; position: relative; transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; cursor: pointer; }
.quantum-card.flip-it { transform: rotateY(180deg) scale(1.08); box-shadow: 0 0 45px rgba(139, 92, 246, 0.5); animation: q-glow 3s infinite alternate; }
@keyframes q-glow { 
  0% { box-shadow: 0 0 35px rgba(167, 139, 250, 0.4), 0 0 15px rgba(167, 139, 250, 0.2) inset; } 
  100% { box-shadow: 0 0 55px rgba(236, 72, 153, 0.6), 0 0 25px rgba(236, 72, 153, 0.3) inset; } 
}
.quantum-card-inner { width: 100%; height: 100%; position: absolute; transform-style: preserve-3d; }
.quantum-card-front, .quantum-card-back { width: 100%; height: 100%; position: absolute; backface-visibility: hidden; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.quantum-card-front { 
  background: linear-gradient(135deg, #0f172a, #2e1065); 
  border: 1px solid rgba(255,255,255,0.2); 
  overflow: hidden; 
  box-shadow: inset 0 0 30px rgba(0,0,0,0.5);
}
.quantum-card-back { 
  background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95)); 
  border: 1px solid rgba(167,139,250,0.4); 
  transform: rotateY(180deg); 
  padding: 24px; 
  text-align: center; 
  backdrop-filter: blur(12px); 
}
.q-stars { position: absolute; top:0; left:0; right:0; bottom:0; background-image: radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px); background-size: 20px 20px; opacity: 0.2; }
.q-logo { font-size: 56px; font-weight: 900; color: #fff; text-shadow: 0 0 20px rgba(167, 139, 250, 1), 0 0 40px rgba(167, 139, 250, 0.6); z-index: 1; margin-bottom: 12px; }
.q-tap-text { z-index: 1; font-size: 0.85rem; color: #e2e8f0; text-transform: uppercase; letter-spacing: 4px; font-weight: 600; background: rgba(0,0,0,0.3); padding: 4px 12px; border-radius: 20px; }

/* Expanded Dashboard */
.q-dashboard { margin-top: -30px; padding-top: 50px; opacity: 0; transform: translateY(20px); transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); display: none; }
.q-dashboard.show { opacity: 1; transform: translateY(0); }

/* Daily Pillars */
.q-pillars-wrap { display: flex; justify-content: center; gap: 20px; margin-bottom: 25px; }
.q-pillar { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px 20px; width: 100px; backdrop-filter: blur(5px); transition: transform 0.3s ease, background 0.3s ease; }
.q-pillar:hover { transform: translateY(-3px); background: rgba(255,255,255,0.08); }
.q-p-label { font-size: 0.7rem; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
.q-p-char { font-size: 2rem; font-weight: 700; color: #f8fafc; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
.q-p-desc { font-size: 0.75rem; color: #cbd5e1; margin-top: 5px; }

/* Explanation Core */
.q-explanation { font-size: 0.9rem; line-height: 1.6; color: #e2e8f0; font-weight: 300; margin: 0 auto 30px auto; max-width: 90%; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 16px; border-left: 2px solid #a78bfa; text-align: left; }
.q-explanation strong { color: #fff; font-weight: 600; }

/* Elemental Balance Chips */
.q-elements-title { font-size: 0.8rem; color: #94a3b8; letter-spacing: 2px; margin-bottom: 15px; text-transform: uppercase; }
.q-elements-row { display: flex; justify-content: center; gap: 12px; margin-bottom: 30px; flex-wrap: wrap; }
.q-chip { position: relative; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 600; color: #fff; cursor: pointer; transition: all 0.3s ease; border: 1px solid rgba(255,255,255,0.2); }
.q-chip:hover { transform: scale(1.15); z-index: 10; }
.q-chip.wood { background: linear-gradient(135deg, #10b981, #047857); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
.q-chip.fire { background: linear-gradient(135deg, #f43f5e, #be123c); box-shadow: 0 0 15px rgba(244, 63, 94, 0.4); }
.q-chip.earth { background: linear-gradient(135deg, #eab308, #a16207); box-shadow: 0 0 15px rgba(234, 179, 8, 0.4); }
.q-chip.metal { background: linear-gradient(135deg, #94a3b8, #475569); box-shadow: 0 0 15px rgba(148, 163, 184, 0.4); }
.q-chip.water { background: linear-gradient(135deg, #3b82f6, #1d4ed8); box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
.q-chip.active { border: 2px solid #fff; box-shadow: 0 0 25px currentColor; }

/* Tooltip */
.q-chip .q-tooltip { visibility: hidden; width: 140px; background: rgba(15,23,42,0.95); color: #f8fafc; text-align: center; border-radius: 8px; padding: 10px; position: absolute; z-index: 1; bottom: 125%; left: 50%; transform: translateX(-50%) translateY(10px); opacity: 0; transition: opacity 0.3s, transform 0.3s; border: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; font-weight: 400; line-height: 1.4; pointer-events: none; }
.q-chip .q-tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: rgba(15,23,42,0.95) transparent transparent transparent; }
.q-chip:hover .q-tooltip { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(0); }

/* Gaeun Prescript */
.gaeun-prescript { padding: 20px; border-radius: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); box-shadow: inset 0 0 20px rgba(0,0,0,0.2); }
.gaeun-title { font-size: 0.95rem; color: #c4b5fd; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }

/* Destiny Portfolio: Cosmic Glassmorphism (isolated namespace) */
.zw-portfolio-mount {
  margin-top: 18px;
}
.zwp-wrap {
  position: relative;
  border-radius: 20px;
  padding: clamp(12px, 2vw, 20px);
  overflow: hidden;
  background:
    radial-gradient(circle at 22% 12%, rgba(56, 189, 248, 0.12), transparent 36%),
    radial-gradient(circle at 82% 80%, rgba(168, 85, 247, 0.11), transparent 42%),
    linear-gradient(155deg, #0B0E14 0%, #0f172a 45%, #111827 100%);
  border: 1px solid rgba(125, 211, 252, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 34px rgba(2, 6, 23, 0.58),
    0 0 32px rgba(59, 130, 246, 0.18);
  animation: zwpWrapFade 0.72s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes zwpWrapFade {
  0% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}
.zwp-starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.zwp-spark {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 8px rgba(147, 197, 253, 0.92);
  opacity: 0;
  animation: zwpTwinkle 3.8s ease-in-out infinite;
}
@keyframes zwpTwinkle {
  0%, 100% { opacity: 0.12; transform: scale(0.8); }
  45% { opacity: 0.88; transform: scale(1.4); }
}
.zwp-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(92px, auto));
  gap: 8px;
}
.zwp-cta {
  position: relative;
  z-index: 1;
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(125, 211, 252, 0.34);
  background: linear-gradient(120deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.58));
  color: #dbeafe;
  font-size: 0.78rem;
  line-height: 1.45;
}
.zwp-cta b {
  color: #fef08a;
}
.zwp-cell {
  position: relative;
  appearance: none;
  border: 1px solid rgba(147, 197, 253, 0.35);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
  padding: 8px;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  animation: zwpCellIn 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.zwp-cell::after {
  content: 'Tap';
  position: absolute;
  right: 7px;
  top: 7px;
  font-size: 0.54rem;
  letter-spacing: 0.08em;
  color: rgba(191, 219, 254, 0.75);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.22s ease, transform 0.22s ease;
}
@keyframes zwpCellIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.zwp-cell:hover,
.zwp-cell:focus-visible,
.zwp-cell.zwp-active {
  transform: translateY(-2px);
  border-color: rgba(196, 181, 253, 0.85);
  box-shadow: 0 0 22px rgba(96, 165, 250, 0.36), inset 0 0 18px rgba(59, 130, 246, 0.14);
}
.zwp-cell:focus-visible {
  outline: 2px solid rgba(125, 211, 252, 0.86);
  outline-offset: 1px;
}
.zwp-cell:hover::after,
.zwp-cell:focus-visible::after,
.zwp-cell.zwp-active::after {
  opacity: 1;
  transform: translateY(0);
}
.zwp-cell-5 { grid-area: 1/1; }
.zwp-cell-6 { grid-area: 1/2; }
.zwp-cell-7 { grid-area: 1/3; }
.zwp-cell-8 { grid-area: 1/4; }
.zwp-cell-4 { grid-area: 2/1; }
.zwp-cell-9 { grid-area: 2/4; }
.zwp-cell-3 { grid-area: 3/1; }
.zwp-cell-10 { grid-area: 3/4; }
.zwp-cell-2 { grid-area: 4/1; }
.zwp-cell-1 { grid-area: 4/2; }
.zwp-cell-0 { grid-area: 4/3; }
.zwp-cell-11 { grid-area: 4/4; }
.zwp-core {
  grid-column: 2 / 4;
  grid-row: 2 / 4;
  border-radius: 50%;
  border: 1px solid rgba(250, 204, 21, 0.42);
  background:
    radial-gradient(circle at center, rgba(250, 204, 21, 0.24) 0%, rgba(234, 179, 8, 0.08) 42%, rgba(2, 6, 23, 0.02) 72%);
  box-shadow:
    inset 0 0 30px rgba(250, 204, 21, 0.22),
    0 0 30px rgba(250, 204, 21, 0.18),
    0 0 56px rgba(59, 130, 246, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 14px 10px;
  gap: 4px;
}
.zwp-core-symbol {
  font-size: clamp(1.2rem, 2.8vw, 1.8rem);
  filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.72));
}
.zwp-core-title {
  color: #fde68a;
  font-size: clamp(0.92rem, 1.5vw, 1.1rem);
  font-weight: 900;
  letter-spacing: 0.04em;
  text-shadow: 0 0 10px rgba(250, 204, 21, 0.45);
}
.zwp-core-slogan {
  color: #dbeafe;
  font-size: clamp(0.7rem, 1.05vw, 0.8rem);
  line-height: 1.35;
}
.zwp-core-hash {
  margin-top: 2px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(125, 211, 252, 0.38);
  background: rgba(15, 23, 42, 0.52);
  color: #bfdbfe;
  font-size: 0.68rem;
  font-weight: 700;
}
.zwp-kor {
  color: #f8fafc;
  font-size: clamp(0.68rem, 1.08vw, 0.82rem);
  font-weight: 800;
  line-height: 1.2;
}
.zwp-star {
  margin-top: 5px;
  color: #fef08a;
  font-size: clamp(0.65rem, 0.98vw, 0.76rem);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.zwp-type {
  margin-top: 3px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(196, 181, 253, 0.4);
  background: rgba(30, 41, 59, 0.62);
  color: #ddd6fe;
  font-size: 0.64rem;
  padding: 1px 6px;
  font-weight: 700;
}
.zwp-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(2, 6, 23, 0.8);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 2147483000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}
.zwp-modal-overlay.is-open {
  opacity: 1;
  pointer-events: auto;
}
.zwp-modal {
  width: min(760px, 94vw);
  max-height: min(86vh, calc(100dvh - 32px));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  padding: 0;
  border: 1px solid rgba(125, 211, 252, 0.42);
  background:
    radial-gradient(circle at 18% 16%, rgba(56, 189, 248, 0.16), transparent 34%),
    radial-gradient(circle at 84% 78%, rgba(168, 85, 247, 0.16), transparent 42%),
    linear-gradient(150deg, rgba(11, 14, 20, 0.98), rgba(15, 23, 42, 0.96));
  box-shadow: 0 24px 52px rgba(2, 6, 23, 0.66), 0 0 36px rgba(56, 189, 248, 0.2);
  transform: translateY(14px) scale(0.98);
  transition: transform 0.25s ease;
}
.zwp-modal-overlay.is-open .zwp-modal {
  transform: translateY(0) scale(1);
}
.zwp-modal-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.18);
  background: inherit;
}
.zwp-modal-title {
  color: #f0f9ff;
  font-size: 1.02rem;
  font-weight: 900;
}
.zwp-modal-close {
  flex-shrink: 0;
  appearance: none;
  border: 1px solid rgba(251, 191, 36, 0.5);
  background: rgba(30, 41, 59, 0.7);
  color: #fde68a;
  border-radius: 999px;
  width: 34px;
  height: 34px;
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
}
.zwp-modal-body {
  flex: 1 1 auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 14px 16px 20px;
  color: #e2e8f0;
  font-size: 0.92rem;
  line-height: 1.75;
}
.zwp-modal-body p {
  margin: 0 0 10px;
}
.zwp-modal-list {
  margin: 0 0 12px;
  padding-left: 18px;
  color: #cbd5e1;
  font-size: 0.88rem;
  line-height: 1.6;
}
.zwp-modal-list li {
  margin-bottom: 4px;
}
.zwp-glow {
  color: #bae6fd;
  font-weight: 800;
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.45);
}
.zwp-modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 12px;
}
.zwp-modal-tag {
  border-radius: 999px;
  padding: 2px 9px;
  border: 1px solid rgba(125, 211, 252, 0.38);
  background: rgba(15, 23, 42, 0.65);
  color: #bfdbfe;
  font-size: 0.72rem;
  font-weight: 700;
}
.zwp-swipe-hint {
  text-align: center;
  margin-top: 12px;
  color: #94a3b8;
  font-size: 0.72rem;
}
@media (max-width: 768px) {
  .zwp-wrap {
    border-radius: 16px;
    padding: 10px;
    overflow: hidden;
  }
  .zwp-cta {
    margin-bottom: 8px;
    font-size: 0.74rem;
    padding: 9px 10px;
  }
  .zwp-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
    gap: 6px;
  }
  .zwp-cell,
  .zwp-core {
    grid-area: auto !important;
  }
  .zwp-cell {
    padding: 7px;
    min-height: 78px;
  }
  .zwp-core {
    order: -1;
    border-radius: 16px;
    padding: 12px 10px;
    gap: 3px;
  }
  .zwp-modal-overlay {
    /* overlay는 JS가 top=navBottom으로 설정 → dim이 nav를 덮지 않음 */
    align-items: stretch;     /* sheet를 overlay 높이에 맞춰 stretch */
    justify-content: center;
    padding: 0;
  }
  .zwp-modal {
    width: 100%;
    max-width: 100%;
    max-height: 100%;         /* overlay(= 화면 - nav)를 가득 채움 */
    min-height: 0;
    flex: 1 1 auto;
    border-radius: 20px 20px 0 0;
    border-bottom: none;
    padding: 0;
    margin: 0;
  }
  .zwp-modal-head {
    padding: 10px 14px 8px;
    position: relative;
  }
  .zwp-modal-head::before {
    content: '';
    display: block;
    width: 36px;
    height: 4px;
    background: rgba(148,163,184,0.45);
    border-radius: 2px;
    margin: 0 auto 8px;
  }
  .zwp-modal-body {
    font-size: 0.95rem;
    line-height: 1.8;
    padding: 10px 14px max(24px, env(safe-area-inset-bottom, 24px));
  }
}

  </style>

  <div class="zw-dashboard">
    <!-- Left: Grid -->
    <div class="zw-grid-wrap">
      <div class="zw-grid">
  `;

  function _zwParseMainRaw(rawStr){
    var plain = (rawStr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    var borrowed = /\(차성\)|\b차성\b/.test(plain);
    var sihuaMatch = plain.match(/화록|화권|화과|화기/);
    var sihua = sihuaMatch ? sihuaMatch[0] : '';
    var name = plain
      .replace(/\(차성\)/g, '')
      .replace(/화록|화권|화과|화기/g, '')
      .replace(/◎|△|▲/g, '')
      .replace(/(^|\s)[O○X](?=\s|$)/g, ' ')
      .trim()
      .split(' ')[0];
    return { name: name || '', borrowed: borrowed, sihua: sihua };
  }
  function _zwGetEffectiveBr(name, zhi, borrowed){
    return zwComputeStarStrength(name, zhi, borrowed) || '평';
  }
  function _zwRenderMainStar(rawStr, zhi){
    var p = _zwParseMainRaw(rawStr);
    if (!p.name) return '';
    var br = _zwGetEffectiveBr(p.name, zhi, p.borrowed);
    var symbol = zwStrengthToSymbol(br);
    var symCls = zwStrengthToClass(br);
    var sihuaColor = p.sihua === '화기' ? '#FF5252' : '#3399FF';
    var sihuaHtml = p.sihua ? (' <span style="color:'+sihuaColor+';font-weight:900;font-size:0.75rem;margin-left:3px;">'+p.sihua+'</span>') : '';
    var borrowedHtml = p.borrowed ? ' <span style="font-size:0.6rem;opacity:0.75;color:#FFD700;">(차성)</span>' : '';
    return p.name + ' <span class="zw-star-strength '+symCls+'">' + symbol + '</span>' + sihuaHtml + borrowedHtml;
  }
  function _zwRenderMinorStar(rawStr, zhi){
    var plain = (rawStr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    var sihuaMatch = plain.match(/화록|화권|화과|화기/);
    var sihua = sihuaMatch ? sihuaMatch[0] : '';
    var name = plain
      .replace(/화록|화권|화과|화기/g,'')
      .replace(/◎|△|▲/g,'')
      .replace(/(^|\s)[O○X](?=\s|$)/g,' ')
      .trim()
      .split(' ')[0];
    if(!name) return '';
    var sihuaColor = sihua === '화기' ? '#FF5252' : '#3399FF';
    var sihuaHtml = sihua ? (' <span style="color:'+sihuaColor+';font-weight:900;font-size:0.7rem;margin-left:2px;">'+sihua+'</span>') : '';
    var br = zwComputeStarStrength(name, zhi, false);
    if(!br) return name + sihuaHtml;
    var symbol = zwStrengthToSymbol(br);
    var symCls = zwStrengthToClass(br);
    return name + ' <span class="zw-star-strength '+symCls+'">' + symbol + '</span>' + sihuaHtml;
  }

  var ZW_PORTFOLIO_PALACE_ALIAS = {
    '명궁': '명주정체성',
    '형제궁': '형제동료',
    '부부궁': '애정부부',
    '자녀궁': '자녀후배',
    '재백궁': '재물자산',
    '질액궁': '건강회복',
    '천이궁': '이동변화',
    '노복궁': '협업인맥',
    '관록궁': '직업커리어',
    '전택궁': '주거기반',
    '복덕궁': '복덕정신',
    '부모궁': '부모귀인'
  };

  var ZW_PORTFOLIO_STAR_PROFILE = {
    '자미': { type: '권위형', persona: '자미 지도자', keywords: ['통솔력', '중심축', '명예'], evidence: '자미성은 제왕성을 상징하여 조직의 중심을 세우고 방향을 결정하려는 리더 본능을 강화합니다.' },
    '염정': { type: '권력형', persona: '염정-권력자', keywords: ['권모술수', '장악력', '정치감각'], evidence: '염정성은 통제력과 이해관계 조율 능력을 키워 권력축을 운용하는 성향을 분명하게 만듭니다.' },
    '천기': { type: '관찰자', persona: '천기-관찰자', keywords: ['전략', '분석', '기획력'], evidence: '천기성은 정보 처리와 시나리오 설계에 강해 먼저 관찰하고 계산한 뒤 움직이는 패턴을 만듭니다.' },
    '태음': { type: '관찰자', persona: '태음-관찰자', keywords: ['내면통찰', '정밀감수성', '은밀한축재'], evidence: '태음성은 미세한 흐름을 포착하는 감수성이 강해 정교한 관찰과 축적형 판단을 유도합니다.' },
    '태양': { type: '발산형', persona: '태양-선도자', keywords: ['표현력', '명성', '외연확장'], evidence: '태양성은 공적 무대에서 존재감과 발산 에너지를 키워 대외 영향력을 빠르게 증폭합니다.' },
    '무곡': { type: '실행형', persona: '무곡-집행자', keywords: ['결단', '현실감', '자본통제'], evidence: '무곡성은 재무·실행 축을 단단히 세워 목표를 숫자와 성과로 증명하려는 힘을 강화합니다.' },
    '천부': { type: '수호형', persona: '천부-수호자', keywords: ['안정', '자산보존', '신뢰'], evidence: '천부성은 위험을 낮추고 기반을 넓히는 보수적 확장 전략에 강점을 보입니다.' },
    '천동': { type: '공감형', persona: '천동-치유자', keywords: ['유연성', '정서공감', '완화'], evidence: '천동성은 갈등을 완화하고 분위기를 부드럽게 전환하는 감정 조율 능력을 높입니다.' },
    '탐랑': { type: '매력형', persona: '탐랑-개척자', keywords: ['사교성', '흥행감각', '다재다능'], evidence: '탐랑성은 네트워크 확장과 시장 감각이 강해 기회 포착 속도를 크게 끌어올립니다.' },
    '거문': { type: '논리형', persona: '거문-논객', keywords: ['검증', '비평', '분석논리'], evidence: '거문성은 허점을 찾아내는 검증력이 강해 의사결정의 완성도를 높여 줍니다.' },
    '천상': { type: '조율형', persona: '천상-조정자', keywords: ['균형', '공정성', '관계관리'], evidence: '천상성은 체면과 원칙의 균형점을 잡아 조직 내 신뢰 자본을 쌓게 만듭니다.' },
    '천량': { type: '보호형', persona: '천량-멘토', keywords: ['보호', '원칙', '도덕성'], evidence: '천량성은 장기전에서 원칙을 지키며 사람과 구조를 보호하는 힘으로 작동합니다.' }
  };

  var ZW_PORTFOLIO_MAIN_TITLE = {
    '자미': { title: '자미 지도자', slogan: '권위를 품고 판을 설계하는 중심 태양', symbol: '☀' },
    '염정': { title: '염정 권력자', slogan: '관계와 권력을 읽고 주도권을 쥐는 전략가', symbol: '✦' },
    '천기': { title: '천기 관찰자', slogan: '먼저 읽고 나중에 움직여 승률을 높이는 설계형', symbol: '✧' },
    '태음': { title: '태음 관찰자', slogan: '조용히 읽고 깊게 축적하는 달빛 기획자', symbol: '☾' },
    '태양': { title: '태양 선도자', slogan: '무대를 밝히며 주변을 끌어당기는 확장형', symbol: '✺' },
    '무곡': { title: '무곡 집행자', slogan: '판단을 실행으로 전환하는 결과 중심형', symbol: '✹' }
  };

  function _zwPortfolioEscapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _zwPortfolioCleanStar(raw) {
    return String(raw || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\(차성\)/g, ' ')
      .replace(/화록|화권|화과|화기/g, ' ')
      .replace(/◎|△|▲/g, ' ')
      .replace(/(^|\s)[O○X](?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')[0] || '';
  }

  function _zwPortfolioExtractStars(list) {
    if (!Array.isArray(list)) return [];
    return list.map(_zwPortfolioCleanStar).filter(function(s){ return !!s; });
  }

  function _zwPortfolioProfileFromStars(stars) {
    var picked = (stars || []).find(function(st){ return !!ZW_PORTFOLIO_STAR_PROFILE[st]; }) || '자미';
    var base = ZW_PORTFOLIO_STAR_PROFILE[picked] || ZW_PORTFOLIO_STAR_PROFILE['자미'];
    return { anchor: picked, type: base.type, persona: base.persona, keywords: base.keywords || [], evidence: base.evidence || '' };
  }

  function _zwPortfolioBuildRows(pd) {
    var rows = [];
    for (var i = 0; i < 12; i += 1) {
      var palaceName = (pd.palacesByIndex && pd.palacesByIndex[i]) || ('제' + (i + 1) + '궁');
      var st = (pd.stars && pd.stars[i]) || { main: [], borrowedMain: [], aux: [], bad: [] };
      var mainRaw = (st.main && st.main.length) ? st.main : (st.borrowedMain || []);
      var mainStars = _zwPortfolioExtractStars(mainRaw);
      var auxStars = _zwPortfolioExtractStars(st.aux || []);
      var badStars = _zwPortfolioExtractStars(st.bad || []);
      var profile = _zwPortfolioProfileFromStars(mainStars.concat(auxStars));
      rows.push({
        idx: i,
        branch: ZHI_LIST[i] || '',
        palace: palaceName,
        palaceDisplay: ZW_PORTFOLIO_PALACE_ALIAS[palaceName] || palaceName,
        mainStars: mainStars,
        auxStars: auxStars,
        badStars: badStars,
        profile: profile
      });
    }
    return rows;
  }

  function _zwPortfolioBuildSummary(rows) {
    var score = {};
    rows.forEach(function(row){
      var star = (row.mainStars && row.mainStars[0]) || row.profile.anchor;
      score[star] = (score[star] || 0) + 1;
    });
    var dominant = Object.keys(score).sort(function(a, b){ return score[b] - score[a]; })[0] || '자미';
    var titleObj = ZW_PORTFOLIO_MAIN_TITLE[dominant] || ZW_PORTFOLIO_MAIN_TITLE['자미'];
    var dominantProfile = ZW_PORTFOLIO_STAR_PROFILE[dominant] || ZW_PORTFOLIO_STAR_PROFILE['자미'];
    return {
      dominantStar: dominant,
      title: titleObj.title,
      slogan: titleObj.slogan,
      symbol: titleObj.symbol,
      hash: dominantProfile.persona,
      keywords: dominantProfile.keywords || []
    };
  }

  function _zwPortfolioBuildModalHtml(row, summary) {
    var mainText = row.mainStars.length ? row.mainStars.join(' · ') : '공궁(空宮)';
    var auxText = row.auxStars.length ? row.auxStars.join(' · ') : '보조성 없음';
    var badText = row.badStars.length ? row.badStars.join(' · ') : '흉성 영향 낮음';
    var keyTags = row.profile.keywords && row.profile.keywords.length ? row.profile.keywords : ['기질 파악', '패턴 분석'];
    var whyType = '주성 <span class="zwp-glow">' + _zwPortfolioEscapeHtml(mainText) + '</span> 조합은 <span class="zwp-glow">' + _zwPortfolioEscapeHtml(row.profile.type) + '</span> 성향을 강화합니다.';
    var evidence = _zwPortfolioEscapeHtml(row.profile.evidence || '해당 성계는 실전에서 판단-행동 간격을 좁히는 방향으로 작동합니다.');
    var relation = '이 궁은 전체 대표 타이틀 <span class="zwp-glow">' + _zwPortfolioEscapeHtml(summary.title) + '</span>과 연결되어, 현재 명반의 중심 테마를 구체 행동으로 변환하는 역할을 맡습니다.';
    var growthAction = {
      '권위형': ['중요 의사결정의 기준 3가지를 문장화하세요.', '팀 내 역할과 책임의 경계를 먼저 정의하세요.'],
      '권력형': ['협업 상대의 이해관계를 표로 정리해 충돌을 줄이세요.', '핵심 제안은 수치 근거 1개를 붙여 전달하세요.'],
      '관찰자': ['결정 전 24시간 관찰 규칙으로 성급한 판단을 줄이세요.', '핵심 가설을 1문장으로 축약해 실행팀과 공유하세요.'],
      '발산형': ['발표/브랜딩 채널을 1개 고정해 영향력을 축적하세요.', '주 1회 공개 기록으로 신뢰 자산을 쌓으세요.'],
      '실행형': ['우선순위 3개만 남기고 나머지는 보류 처리하세요.', '성과 지표를 주간 단위로 체크해 재투입 여부를 결정하세요.'],
      '수호형': ['리스크 목록과 대응 플랜을 미리 준비해 변동성을 낮추세요.', '핵심 자산은 보수적 분산으로 안정성을 확보하세요.'],
      '공감형': ['갈등 상황에서 사실/감정/요청을 분리해 대화하세요.', '에너지 소진을 막는 회복 루틴을 일정에 고정하세요.'],
      '매력형': ['네트워크 확장은 분기별 핵심 그룹 중심으로 진행하세요.', '유입된 기회는 수익성/지속성 기준으로 선별하세요.'],
      '논리형': ['반대 가설을 먼저 검증해 의사결정 오류를 줄이세요.', '핵심 문서는 체크리스트 기반으로 표준화하세요.'],
      '조율형': ['관계의 우선순위를 명확히 해 에너지 분산을 줄이세요.', '중재 시 양측의 공통 목표를 먼저 합의하세요.'],
      '보호형': ['장기 과제는 월 단위 리밸런싱으로 유지하세요.', '멘토링/후배 육성에 시간을 배정해 영향력을 확장하세요.']
    };
    var actions = growthAction[row.profile.type] || ['오늘 실행할 작은 행동 1개를 정하고 기록하세요.', '일주일 뒤 결과를 점검해 다음 행동으로 연결하세요.'];
    var actionHtml = '<ul class="zwp-modal-list"><li>' + _zwPortfolioEscapeHtml(actions[0]) + '</li><li>' + _zwPortfolioEscapeHtml(actions[1]) + '</li></ul>';

    return ''
      + '<p><b>[' + _zwPortfolioEscapeHtml(row.palaceDisplay) + ' · ' + _zwPortfolioEscapeHtml(row.branch) + '궁]</b> 성계 구성은 <span class="zwp-glow">' + _zwPortfolioEscapeHtml(row.profile.persona) + '</span> 축으로 읽힙니다.</p>'
      + '<div class="zwp-modal-tags">' + keyTags.map(function(tag){ return '<span class="zwp-modal-tag">#' + _zwPortfolioEscapeHtml(tag) + '</span>'; }).join('') + '</div>'
      + '<p>' + whyType + '</p>'
      + '<p>' + evidence + '</p>'
      + '<p><b>성계 근거:</b> 주성 ' + _zwPortfolioEscapeHtml(mainText) + ' / 보조성 ' + _zwPortfolioEscapeHtml(auxText) + ' / 경계성 ' + _zwPortfolioEscapeHtml(badText) + '</p>'
      + '<p>' + relation + '</p>'
      + '<p><b>실전 실행 가이드</b></p>'
      + actionHtml
      + '<div class="zwp-swipe-hint">아래로 스와이프하거나 ✶ 버튼으로 닫을 수 있습니다.</div>';
  }

  for(let i=0; i<12; i++) {
    let pName = palace.palacesByIndex[i]; // 명궁, 형제궁..
    let pZhi = ZHI_LIST[i];
    let pGan = palace.gongGan[pZhi];
    let st = palace.stars[i];
    let mainList = (st.main && st.main.length) ? st.main : (st.borrowedMain || []);
    
    let highlight = (pZhi === palace.meng) ? 'box-shadow: inset 0 0 20px rgba(212,175,55,0.6); border-color: #FFD700;' : '';
    let dName = pName;
    if (pZhi === palace.meng) dName = '🌟 ' + dName;
    if (pZhi === palace.shen) dName = dName + ' (신)';

    html += '<div class="zw-cell zw-cell-'+i+'" role="button" tabindex="0" aria-label="'+dName+' 상세 해석 보기" style="'+highlight+'; animation-delay: '+(i*0.06)+'s;" onclick="window._handleZwClick('+i+', this)">';
    html += '<div class="zw-palace-name">' + dName + '</div>';
    html += '<div class="zw-stars-wrap star-list">';
    if(mainList.length > 0) {
      mainList.forEach(function(s){
        var rendered = _zwRenderMainStar(s, pZhi);
        html += '<div class="zw-star-main">' + (rendered || s) + '</div>';
      });
    } else {
      html += '<div class="zw-empty">공궁(空宮)</div>';
    }
    if(st.aux.length > 0) {
      let auxStr = st.aux.map(function(s){ return _zwRenderMinorStar(s, pZhi); }).join(' ');
      html += '<div class="zw-star-aux">'+auxStr+'</div>';
    }
    if(st.bad.length > 0) {
      let badStr = st.bad.map(function(s){ return _zwRenderMinorStar(s, pZhi); }).join(' ');
      html += '<div class="zw-star-bad">'+badStr+'</div>';
    }
    html += '</div>';
    
    let dAge = (palace.daHan && palace.daHan[i]) ? palace.daHan[i] : '';
    if(dAge) html += '<div class="zw-dahan">' + dAge + '</div>';
    
    html += '<div class="zw-palace-gan">' + pGan + '</div>';
    html += '<div class="zw-branch-name">' + pZhi + '</div>';
    html += '</div>';
  }

  html += '<div class="zw-center-panel">';
  html += '<div class="zw-center-title">자미두수 명반</div>';
  html += '<div class="zw-center-desc">';
  html += '명궁: <span style="color:#FFF">' + palace.meng + '</span><br>';
  html += '신궁: <span style="color:#FFF">' + palace.shen + '</span><br>';
  html += '오행국: <span style="color:#FFD700; font-weight:bold">' + palace.juInfo + '</span><br>';
  if (palace.calcMeta) {
    html += '<span style="font-size:0.68rem;color:#94a3b8;display:block;margin-top:6px">기준: 음력 '+palace.calcMeta.lunarMonth+'월 '+palace.calcMeta.lunarDay+'일 · 시지 '+palace.calcMeta.hourBranch+'</span>';
  }
  html += '<span style="font-size:0.75rem; color:#888; margin-top:8px; display:block;">궁(宮)을 클릭하면 <br>각 궁에 대한 해석이 나옵니다.</span>';
  html += '</div>';
  html += '</div>';
  html += '</div></div>';

  html += `
    <div class="zw-detail-panel" id="zwDetailPanel">
       <div class="zw-empty-state">
        <div class="zw-empty-icon">🌌</div>
        궁(宮)을 클릭하시면<br>각 궁에 대한 해석이 나옵니다.
      </div>
    </div>
    <div id="zwDestinyPortfolioMount" class="zw-portfolio-mount"></div>
  </div>
  <div class="zw-detail-panel ziwei-report-container report-container" id="zwComprehensiveReport" style="margin-top:16px;">
    <div class="zw-empty-state">
      <div class="zw-empty-icon">📜</div>
      자미두수 천명 종합 리포트를 불러오는 중입니다.
    </div>
  </div>`;

  var sec = document.getElementById(targetId || 'ziweiSection');
  if(sec) sec.innerHTML = html;

  if (!window._renderZwDestinyPortfolio) {
    window._zwPortfolioStore = window._zwPortfolioStore || {};

    window._closeZwPortfolioModal = function(targetId) {
      var overlay = document.querySelector('.zwp-modal-overlay[data-zwp-id="' + targetId + '"]');
      if (overlay) overlay.classList.remove('is-open');
      var mount = document.getElementById(targetId);
      if (mount) mount.querySelectorAll('.zwp-cell.zwp-active').forEach(function(el){ el.classList.remove('zwp-active'); });
    };

    window._openZwPortfolioModal = function(targetId, idx) {
      var mount = document.getElementById(targetId);
      if (!mount) return;
      var store = window._zwPortfolioStore && window._zwPortfolioStore[targetId];
      if (!store || !store.rows || !store.rows.length) return;
      var row = store.rows.find(function(it){ return it.idx === idx; }) || store.rows[0];

      // body에 텔레포트된 오버레이를 먼저 찾고, 없으면 mount 내부에서 찾아 이동
      var overlay = document.querySelector('.zwp-modal-overlay[data-zwp-id="' + targetId + '"]');
      if (!overlay) {
        overlay = mount.querySelector('.zwp-modal-overlay');
        if (overlay) {
          overlay.setAttribute('data-zwp-id', targetId);
          document.body.appendChild(overlay);
        }
      }
      if (!overlay) return;

      var body = overlay.querySelector('.zwp-modal-body');
      var title = overlay.querySelector('.zwp-modal-title');
      if (!body || !title) return;

      title.textContent = row.palaceDisplay + ' | ' + row.profile.persona;
      body.innerHTML = _zwPortfolioBuildModalHtml(row, store.summary);
      body.scrollTop = 0;
      mount.querySelectorAll('.zwp-cell.zwp-active').forEach(function(el){ el.classList.remove('zwp-active'); });
      var activeCell = mount.querySelector('.zwp-cell-' + idx);
      if (activeCell) activeCell.classList.add('zwp-active');

      var navEl = document.getElementById('ziweiModalNavBar');
      var navBottom = navEl ? Math.round(navEl.getBoundingClientRect().bottom) : 56;
      navBottom = Math.max(navBottom, 56);

      var sheet = overlay.querySelector('.zwp-modal');
      if (window.innerWidth <= 900) {
        // 모바일: overlay를 네비바 바로 아래에서 시작
        // dim이 nav 영역을 전혀 덮지 않으므로 z-index 충돌 원천 제거
        // sheet는 overlay를 stretch로 100% 채움 → header가 항상 overlay 최상단에 표시
        overlay.style.top = navBottom + 'px';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.paddingTop = '0';
        if (sheet) {
          sheet.style.position = '';
          sheet.style.top = '';
          sheet.style.bottom = '';
          sheet.style.left = '';
          sheet.style.right = '';
          sheet.style.maxHeight = '100%';
          sheet.style.width = '100%';
          sheet.style.maxWidth = '100%';
          sheet.style.margin = '0';
          sheet.style.minHeight = '0';
        }
      } else {
        // 데스크탑: overlay 전체 화면, CSS 기본값 사용
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.paddingTop = '0';
        if (sheet) {
          sheet.style.position = '';
          sheet.style.top = '';
          sheet.style.bottom = '';
          sheet.style.left = '';
          sheet.style.right = '';
          sheet.style.maxHeight = '';
          sheet.style.width = '';
          sheet.style.maxWidth = '';
          sheet.style.margin = '';
          sheet.style.minHeight = '';
        }
      }

      overlay.classList.add('is-open');
      // 본문 스크롤 초기화 (.zwp-modal-body가 실제 스크롤 요소)
      var bodyEl = overlay.querySelector('.zwp-modal-body');
      if (bodyEl) bodyEl.scrollTop = 0;
    };

    window._renderZwDestinyPortfolio = function(targetId, pd) {
      var mount = document.getElementById(targetId);
      if (!mount || !pd) return;

      // calcZiweiPalaces의 stars는 배열이 아니라 숫자 키 객체이므로 둘 다 허용한다.
      var starsSource = pd.stars;
      if (!starsSource && Array.isArray(pd.palaceStarData)) {
        starsSource = {};
        pd.palaceStarData.forEach(function(row, idx) {
          starsSource[idx] = {
            main: (row && Array.isArray(row.stars)) ? row.stars : [],
            borrowedMain: [],
            aux: (row && Array.isArray(row.auxStars)) ? row.auxStars : [],
            bad: (row && Array.isArray(row.badStars)) ? row.badStars : []
          };
        });
      }
      if (!starsSource || typeof starsSource !== 'object') return;

      var resolvedPd = {
        palacesByIndex: pd.palacesByIndex || [],
        stars: starsSource
      };

      var rows = _zwPortfolioBuildRows(resolvedPd);
      var summary = _zwPortfolioBuildSummary(rows);
      window._zwPortfolioStore[targetId] = { rows: rows, summary: summary };

      var starfieldHtml = '';
      for (var si = 0; si < 34; si += 1) {
        var left = (Math.random() * 100).toFixed(2);
        var top = (Math.random() * 100).toFixed(2);
        var delay = (Math.random() * 2.6).toFixed(2);
        var duration = (2.8 + Math.random() * 2.4).toFixed(2);
        starfieldHtml += '<span class="zwp-spark" style="left:' + left + '%;top:' + top + '%;animation-delay:' + delay + 's;animation-duration:' + duration + 's"></span>';
      }

      var cellsHtml = rows.map(function(row, orderIdx){
        var mainLabel = row.mainStars.length ? row.mainStars.slice(0, 2).join(' · ') : '공궁';
        return ''
          + '<button type="button" class="zwp-cell zwp-cell-' + row.idx + '" style="animation-delay:' + (orderIdx * 0.04).toFixed(2) + 's" onclick="window._openZwPortfolioModal(\'' + targetId + '\', ' + row.idx + ')">'
          + '  <div class="zwp-kor">[' + _zwPortfolioEscapeHtml(row.palaceDisplay) + ']</div>'
          + '  <div class="zwp-star">' + _zwPortfolioEscapeHtml(mainLabel) + '</div>'
          + '  <span class="zwp-type">' + _zwPortfolioEscapeHtml(row.profile.type) + '</span>'
          + '</button>';
      }).join('');

      mount.innerHTML = ''
        + '<section class="zwp-wrap" aria-label="운명 포트폴리오">'
        + '  <div class="zwp-starfield">' + starfieldHtml + '</div>'
        + '  <div class="zwp-cta"><b>클릭 가이드</b> · 각 카드를 눌러 궁별 성향, 근거, 실행 전략을 확인하세요. 모바일에서는 상단 시트로 바로 열립니다.</div>'
        + '  <div class="zwp-grid">'
        +       cellsHtml
        + '    <div class="zwp-core">'
        + '      <div class="zwp-core-symbol">' + _zwPortfolioEscapeHtml(summary.symbol) + '</div>'
        + '      <div class="zwp-core-title">' + _zwPortfolioEscapeHtml(summary.title) + '</div>'
        + '      <div class="zwp-core-slogan">' + _zwPortfolioEscapeHtml(summary.slogan) + '</div>'
        + '      <div class="zwp-core-hash">' + _zwPortfolioEscapeHtml(summary.hash) + '</div>'
        + '      <div class="zwp-core-slogan">핵심 키워드 · ' + _zwPortfolioEscapeHtml((summary.keywords || []).slice(0, 3).join(' · ') || '균형 · 실행 · 확장') + '</div>'
        + '    </div>'
        + '  </div>'
        + '  <div class="zwp-modal-overlay" aria-hidden="true">'
        + '    <div class="zwp-modal" role="dialog" aria-modal="true" aria-label="운명 포트폴리오 상세" onclick="event.stopPropagation()">'
        + '      <div class="zwp-modal-head">'
        + '        <div class="zwp-modal-title">운명 포트폴리오</div>'
        + '        <button type="button" class="zwp-modal-close" aria-label="닫기" onclick="window._closeZwPortfolioModal(\'' + targetId + '\')">✶</button>'
        + '      </div>'
        + '      <div class="zwp-modal-body"></div>'
        + '    </div>'
        + '  </div>'
        + '</section>';

      // 오버레이를 body로 이동 후 이벤트 바인딩 (position:fixed 포함 블록 이슈 해소)
      var overlay = mount.querySelector('.zwp-modal-overlay');
      if (overlay) {
        overlay.setAttribute('data-zwp-id', targetId);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function(){ window._closeZwPortfolioModal(targetId); });
      }
      var sheet = overlay && overlay.querySelector('.zwp-modal');
      if (sheet) {
        var touchStartY = 0;
        sheet.addEventListener('touchstart', function(e) {
          var t = e.touches && e.touches[0];
          touchStartY = t ? t.clientY : 0;
        }, { passive: true });
        sheet.addEventListener('touchend', function(e) {
          var t = e.changedTouches && e.changedTouches[0];
          var endY = t ? t.clientY : 0;
          if (endY - touchStartY > 72) {
            window._closeZwPortfolioModal(targetId);
          }
        }, { passive: true });
      }
      if (!window._zwPortfolioEscBound) {
        window.addEventListener('keydown', function(e) {
          if (!e || e.key !== 'Escape') return;
          var ids = Object.keys(window._zwPortfolioStore || {});
          ids.forEach(function(id){
            var ov = document.querySelector('.zwp-modal-overlay[data-zwp-id="' + id + '"]');
            if (ov && ov.classList.contains('is-open')) {
              window._closeZwPortfolioModal(id);
            }
          });
        });
        window._zwPortfolioEscBound = true;
      }
    };
  }

  if (typeof window._renderZwDestinyPortfolio === 'function') {
    window._renderZwDestinyPortfolio('zwDestinyPortfolioMount', window._currentZiweiData);
  }

  if(!window._handleZwClick) {
    window._handleZwClick = function(idx, el) {
      document.querySelectorAll('.zw-cell').forEach(c => c.classList.remove('active'));
      if(el) el.classList.add('active');

      var pd = window._currentZiweiData;
      var pName = pd.palacesByIndex[idx];
      var stars = pd.stars[idx];

      if(typeof Chart === 'undefined') {
        var s = document.createElement('script');
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = function() {
          window._renderZwPanel(idx, pName, stars, pd, { clickOnly: true, targetId: 'zwDetailPanel', showClose: true, showRadar: true, scroll: true });
          window._zwScrollToDetail();
        };
        document.head.appendChild(s);
      } else {
        window._renderZwPanel(idx, pName, stars, pd, { clickOnly: true, targetId: 'zwDetailPanel', showClose: true, showRadar: true, scroll: true });
        window._zwScrollToDetail();
      }
    };

    window._zwScrollToDetail = function() {
      var dp = document.getElementById('zwDetailPanel');
      if (dp) {
        requestAnimationFrame(function() {
          setTimeout(function() {
            var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            if (isMobile) {
              var rect = dp.getBoundingClientRect();
              var top = window.pageYOffset + rect.top - 10;
              window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            } else {
              dp.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 80);
        });
      }
    };

    window._closeZwDetailReport = function() {
      var panel = document.getElementById('zwDetailPanel');
      if (!panel) return;

      document.querySelectorAll('.zw-cell.active').forEach(function(cell) {
        cell.classList.remove('active');
      });

      if (window.zwCurrentChart && typeof window.zwCurrentChart.destroy === 'function') {
        window.zwCurrentChart.destroy();
      }
      window.zwCurrentChart = null;

      panel.innerHTML =
        '<div class="zw-empty-state">'
        + '<div class="zw-empty-icon">🌌</div>'
        + '궁(宮)을 클릭하시면<br>각 궁에 대한 해석이 나옵니다.'
        + '</div>';
    };

    window._zwMuteEvent = function(evt) {
      evt = evt || window.event;
      if (!evt) return;
      if (typeof evt.preventDefault === 'function') evt.preventDefault();
      if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
      if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
    };

    window._closeZwComprehensiveReport = function(evt) {
      window._zwMuteEvent(evt);
      // Touch devices may emit a delayed click after DOM reflow; briefly guard modal home action.
      window._zwReportToggleLockUntil = Date.now() + 420;
      var panel = document.getElementById('zwComprehensiveReport');
      if (!panel) return;
      panel.innerHTML = '<div class="zw-empty-state">'
        + '<div class="zw-empty-icon">📜</div>'
        + '종합 리포트가 닫혔습니다.<br>'
        + '<button type="button" class="zw-report-close-btn" style="margin-top:10px;" onclick="window._openZwComprehensiveReport()">다시 열기</button>'
        + '</div>';
    };

    window._openZwComprehensiveReport = function(evt) {
      window._zwMuteEvent(evt);
      window._zwReportToggleLockUntil = Date.now() + 420;
      var seed = window._zwComprehensiveSeed;
      if (!seed || !seed.pd || !seed.stars) return;
      window._renderZwPanel(seed.idx, seed.pName, seed.stars, seed.pd, {
        clickOnly: false,
        targetId: 'zwComprehensiveReport',
        showClose: true,
        showRadar: false,
        scroll: false
      });
    };

    window._runZwCompatibility = function() {
      if (typeof window._cdCoinGatePerUse === 'function') {
        window._cdCoinGatePerUse(50, '자미두수 궁합 분석', function() { window._runZwCompatibilityCore(); });
        return;
      }
      // ⚠️ 미로그인 상태: _cdCoinGatePerUse 미정의
      var token = '';
      try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
      if (!token) {
        if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) {
          window.location.href = '/login?next=%2F';
        }
        return;
      }
      window.alert('서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    };
    window._runZwCompatibilityCore = function() {
      var dateEl = document.getElementById('zwCompatBirthDate');
      var timeEl = document.getElementById('zwCompatBirthTime');
      var cityEl = document.getElementById('zwCompatBirthCity');
      var outEl = document.getElementById('zwCompatResult');
      var corrEl = document.getElementById('zwCompatTimeCorrectionInfo');
      if (!dateEl || !timeEl || !outEl) return;

      // Mobile-safe 2-digit formatter for legacy WebViews (avoids String.padStart dependency).
      var z2 = function(v) {
        var n = parseInt(v, 10);
        if (isNaN(n)) n = 0;
        return n < 10 ? ('0' + n) : String(n);
      };

      var bDate = (dateEl.value || '').trim();
      var bTime = (timeEl.value || '').trim();
      var triggerBtn = null;
      var cardEl = dateEl.closest ? dateEl.closest('.zw-cosmic-card') : null;
      if (cardEl) triggerBtn = cardEl.querySelector('.zw-cosmic-btn');
      if (!bDate || !bTime || !cityEl || cityEl.selectedIndex < 0) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">상대방 생년월일, 태어난 시간, 태어난 도시를 모두 입력해 주세요.</div>';
        return;
      }

      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.style.opacity = '0.7';
      }
      outEl.innerHTML = '<div style="color:#ddd6fe;font-size:0.9rem;">궁합을 계산하는 중입니다...</div>';

      var runCompatCalc = async function() {
      try {
      var cityOpt = cityEl.options[cityEl.selectedIndex];
      var cityTz = cityOpt ? (cityOpt.value || '') : '';
      var cityLong = cityOpt ? parseFloat(cityOpt.getAttribute('data-long')) : NaN;
      var cityLat = cityOpt ? parseFloat(cityOpt.getAttribute('data-lat')) : NaN;
      var cityTzOff = cityOpt ? parseFloat(cityOpt.getAttribute('data-tz')) : NaN;
      var cityLabel = cityOpt ? (cityOpt.textContent || '') : '';
      if (!cityTz || isNaN(cityLong) || isNaN(cityLat)) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">태어난 도시를 정확히 선택해 주세요.</div>';
        return;
      }

      var dParts = bDate.split('-');
      var tParts = bTime.split(':');
      var py = parseInt(dParts[0], 10);
      var pm = parseInt(dParts[1], 10);
      var pdm = parseInt(dParts[2], 10);
      var ph = parseInt(tParts[0], 10);
      var pmin = parseInt(tParts[1], 10);
      if (isNaN(py) || isNaN(pm) || isNaN(pdm) || isNaN(ph) || isNaN(pmin)) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">입력 형식을 다시 확인해 주세요.</div>';
        return;
      }

      try {
        var zwCtx = await resolveKasiDateContextSafe({
          calendarType: 'solar',
          year: py,
          month: pm,
          day: pdm,
          hour: ph,
          minute: pmin,
          second: 0,
          latitude: cityLat,
          longitude: cityLong,
          tzOffsetHours: isNaN(cityTzOff) ? 9 : cityTzOff
        }, { setCurrent: false });
        if (zwCtx && zwCtx.solar) {
          py = zwCtx.solar.year || py;
          pm = zwCtx.solar.month || pm;
          pdm = zwCtx.solar.day || pdm;
        }
      } catch (ctxErr) {
        console.warn('[ZiweiCompat] KASI context fallback:', ctxErr);
      }

      var correctedHour = ph;
      var correctedMinute = pmin;
      var cityBaseTz = cityOpt ? parseFloat(cityOpt.getAttribute('data-base-tz') || cityOpt.getAttribute('data-tz') || '9') : 9;
      var tzResolved = resolveBirthTimezoneOffset(py, pm, pdm, ph, pmin, cityTz, cityBaseTz);
      var cityStdLong = tzResolved.tzOffsetHours * 15;
      var cityLngOffset = Math.round((cityStdLong - cityLong) * 4);
      var correctedTotal = ((ph * 60 + pmin - cityLngOffset) % 1440 + 1440) % 1440;
      correctedHour = Math.floor(correctedTotal / 60);
      correctedMinute = correctedTotal % 60;
      var correctionMsg = '진태양시 보정 적용: '
        + z2(ph) + ':' + z2(pmin)
        + ' → ' + z2(correctedHour) + ':' + z2(correctedMinute)
        + ' (경도 ' + cityLngOffset + '분, DST ' + tzResolved.dstMinutes + '분, UTC'
        + (tzResolved.tzOffsetHours >= 0 ? '+' : '') + tzResolved.tzOffsetHours + ')';
      if (corrEl) {
        corrEl.innerHTML = '🌍 ' + cityLabel + '<br><span style="font-size:0.75rem;color:#c4b5fd;">' + correctionMsg + '</span>';
      }

      var meBirth = window._ziweiBirth;
      if (!meBirth) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">내 명반 정보가 없어 궁합 계산을 진행할 수 없습니다.</div>';
        return;
      }

      var meData = window._currentZiweiData;
      if (!meData) {
        meData = calcZiweiPalaces(meBirth.year, meBirth.month, meBirth.day, meBirth.hour, meBirth.minute);
      }

      var partnerData = null;
      try {
        partnerData = calcZiweiPalaces(py, pm, pdm, correctedHour, correctedMinute);
      } catch (e) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">상대 정보 계산 중 오류가 발생했습니다. 입력값을 확인해 주세요.</div>';
        return;
      }

      var parseMainMeta = function(stars) {
        if (!stars) return [];
        var hasMain = !!(stars.main && stars.main.length);
        var useBorrowed = !hasMain && !!(stars.borrowedMain && stars.borrowedMain.length);
        var src = hasMain ? stars.main : (stars.borrowedMain || []);
        return src.map(function(raw) {
          var plain = (raw || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          var nm = plain
            .replace(/\(차성\)/g, '')
            .replace(/화록|화권|화과|화기/g, '')
            .trim()
            .split(' ')[0];
          return { name: nm || '', borrowed: useBorrowed || /\(차성\)|\b차성\b/.test(plain) };
        }).filter(function(v) { return !!v.name; });
      };

      var getPalSnapshot = function(zwData, palaceName) {
        if (!zwData || !zwData.palacesByIndex || !zwData.stars) {
          return { main: [], aux: [], bad: [], borrowedCount: 0 };
        }
        var idx = zwData.palacesByIndex.indexOf(palaceName);
        if (idx < 0 && palaceName === '부처궁') idx = zwData.palacesByIndex.indexOf('부부궁');
        if (idx < 0 && palaceName === '부부궁') idx = zwData.palacesByIndex.indexOf('부처궁');
        if (idx < 0) return { main: [], aux: [], bad: [], borrowedCount: 0 };
        var st = zwData.stars[idx] || { main: [], aux: [], bad: [], borrowedMain: [] };
        var mainMeta = parseMainMeta(st);
        var aux = (st.aux || []).map(function(v) {
          return (v || '').replace(/<[^>]*>/g, ' ').replace(/화록|화권|화과|화기/g, '').replace(/\s+/g, ' ').trim().split(' ')[0];
        }).filter(function(v) { return !!v; });
        var bad = (st.bad || []).map(function(v) {
          return (v || '').replace(/<[^>]*>/g, ' ').replace(/화록|화권|화과|화기/g, '').replace(/\s+/g, ' ').trim().split(' ')[0];
        }).filter(function(v) { return !!v; });
        return {
          main: mainMeta.map(function(m) { return m.name; }),
          aux: aux,
          bad: bad,
          borrowedCount: mainMeta.filter(function(m) { return m.borrowed; }).length
        };
      };

      var intersectCount = function(a, b) {
        var s = Object.create(null);
        (a || []).forEach(function(v) { s[v] = (s[v] || 0) + 1; });
        var c = 0;
        (b || []).forEach(function(v) { if (s[v]) c += 1; });
        return c;
      };

      var pairScore = function(meP, youP, cfg) {
        cfg = cfg || {};
        var mMain = intersectCount(meP.main, youP.main);
        var mAux = intersectCount(meP.aux, youP.aux);
        var badMix = (meP.bad.length + youP.bad.length);
        var s = (cfg.base || 50)
          + mMain * (cfg.mainW || 11)
          + mAux * (cfg.auxW || 4)
          - badMix * (cfg.badW || 2)
          - (meP.borrowedCount + youP.borrowedCount) * (cfg.borrowedW || 1.5);
        return Math.max(20, Math.min(96, Math.round(s)));
      };

      var mePal = {
        meng: getPalSnapshot(meData, '명궁'),
        bok: getPalSnapshot(meData, '복덕궁'),
        spouse: getPalSnapshot(meData, '부처궁'),
        illness: getPalSnapshot(meData, '질액궁'),
        move: getPalSnapshot(meData, '천이궁'),
        home: getPalSnapshot(meData, '전택궁'),
        wealth: getPalSnapshot(meData, '재백궁'),
        job: getPalSnapshot(meData, '관록궁')
      };
      var youPal = {
        meng: getPalSnapshot(partnerData, '명궁'),
        bok: getPalSnapshot(partnerData, '복덕궁'),
        spouse: getPalSnapshot(partnerData, '부처궁'),
        illness: getPalSnapshot(partnerData, '질액궁'),
        move: getPalSnapshot(partnerData, '천이궁'),
        home: getPalSnapshot(partnerData, '전택궁'),
        wealth: getPalSnapshot(partnerData, '재백궁'),
        job: getPalSnapshot(partnerData, '관록궁')
      };

      var loveScore = Math.round((
        pairScore(mePal.spouse, youPal.spouse, { base: 52, mainW: 12, auxW: 4.5, badW: 2.2 }) * 0.5 +
        pairScore(mePal.meng, youPal.meng, { base: 50, mainW: 10, auxW: 3.8, badW: 2.0 }) * 0.3 +
        pairScore(mePal.bok, youPal.bok, { base: 48, mainW: 9.5, auxW: 4.2, badW: 1.8 }) * 0.2
      ));
      var marriageScore = Math.round((
        pairScore(mePal.spouse, youPal.spouse, { base: 53, mainW: 11.5, auxW: 4.0, badW: 2.3 }) * 0.45 +
        pairScore(mePal.home, youPal.home, { base: 51, mainW: 10.0, auxW: 4.0, badW: 1.8 }) * 0.35 +
        pairScore(mePal.bok, youPal.bok, { base: 49, mainW: 9.5, auxW: 4.2, badW: 1.7 }) * 0.2
      ));
      var friendScore = Math.round((
        pairScore(mePal.meng, youPal.meng, { base: 50, mainW: 9.5, auxW: 4.5, badW: 1.7 }) * 0.5 +
        pairScore(mePal.bok, youPal.bok, { base: 50, mainW: 9.0, auxW: 5.0, badW: 1.5 }) * 0.5
      ));
      var workScore = Math.round((
        pairScore(mePal.job, youPal.job, { base: 50, mainW: 11.5, auxW: 4.2, badW: 2.2 }) * 0.55 +
        pairScore(mePal.meng, youPal.meng, { base: 49, mainW: 9.0, auxW: 3.5, badW: 2.0 }) * 0.45
      ));
      var businessScore = Math.round((
        pairScore(mePal.wealth, youPal.wealth, { base: 50, mainW: 12.0, auxW: 4.5, badW: 2.3 }) * 0.45 +
        pairScore(mePal.job, youPal.job, { base: 49, mainW: 10.5, auxW: 4.0, badW: 2.0 }) * 0.35 +
        pairScore(mePal.home, youPal.home, { base: 48, mainW: 9.0, auxW: 3.8, badW: 1.8 }) * 0.2
      ));
      var pastAxisMeng = pairScore(mePal.meng, youPal.meng, { base: 49, mainW: 10.0, auxW: 3.9, badW: 1.8 });
      var pastAxisBok = pairScore(mePal.bok, youPal.bok, { base: 52, mainW: 10.5, auxW: 4.4, badW: 1.5 });
      var pastAxisSpouse = pairScore(mePal.spouse, youPal.spouse, { base: 51, mainW: 11.0, auxW: 4.1, badW: 1.8 });
      var pastAxisMove = pairScore(mePal.move, youPal.move, { base: 48, mainW: 9.8, auxW: 3.8, badW: 1.7 });
      var pastAxisIllness = pairScore(mePal.illness, youPal.illness, { base: 47, mainW: 10.0, auxW: 3.6, badW: 1.6 });
      var pastLifeScore = Math.round((
        (pastAxisBok * 3) +
        (pastAxisSpouse * 2) +
        (pastAxisMove * 1.5) +
        (pastAxisIllness * 2)
      ) / 8.5);

      var coreMainMe = mePal.spouse.main[0] || mePal.meng.main[0] || '공궁';
      var coreMainYou = youPal.spouse.main[0] || youPal.meng.main[0] || '공궁';

      var tierText = function(v) {
        if (v >= 86) return '최상급 합';
        if (v >= 74) return '강한 합';
        if (v >= 62) return '안정 합';
        if (v >= 50) return '보통 합';
        return '조율 필요';
      };

      var uniq = function(arr) {
        var m = Object.create(null);
        var out = [];
        (arr || []).forEach(function(v) {
          if (!v || m[v]) return;
          m[v] = 1;
          out.push(v);
        });
        return out;
      };
      var inter = function(a, b) {
        var m = Object.create(null);
        (a || []).forEach(function(v) { m[v] = 1; });
        var out = [];
        (b || []).forEach(function(v) {
          if (m[v]) out.push(v);
        });
        return uniq(out);
      };
      var starsTxt = function(list, emptyTxt) {
        return (list && list.length) ? list.join(' · ') : (emptyTxt || '직접 공통성 약함');
      };
      var coreTxt = function(p) {
        return (p && p.main && p.main.length) ? p.main[0] : '공궁';
      };
      var supportText = function(meP, youP) {
        var s = inter(meP.aux, youP.aux);
        if (s.length) return '공통 길성 ' + s.slice(0, 3).join(' · ') + '이 관계 완충 역할을 합니다.';
        var n = (meP.aux.length + youP.aux.length);
        return n >= 3 ? '직접 공통 길성은 약하지만 각자 보조성이 있어 조율 여지가 큽니다.' : '보조 길성이 약한 편이라 소통 루틴을 의식적으로 설계하는 편이 좋습니다.';
      };
      var riskText = function(meP, youP) {
        var r = meP.bad.length + youP.bad.length;
        if (r >= 5) return '흉성 압력이 높은 편이라 오해 누적·감정 과열 구간을 주기적으로 환기해야 합니다.';
        if (r >= 3) return '흉성 압력이 중간 수준이므로 일정·약속·돈 관련 기준 합의가 필요합니다.';
        return '흉성 압력은 낮은 편으로 운행 규칙만 맞추면 안정적으로 굴러갑니다.';
      };
      var borrowedNote = function(meP, youP) {
        var b = meP.borrowedCount + youP.borrowedCount;
        return b > 0 ? ('차성 개입(' + b + ')이 있어 상황/환경 변수에 따라 체감 궁합이 흔들릴 수 있습니다.') : '원성 중심 구조라 궁합 해석의 일관성이 비교적 높은 편입니다.';
      };

      var loveSharedSpouse = inter(mePal.spouse.main, youPal.spouse.main);
      var loveSharedMeng = inter(mePal.meng.main, youPal.meng.main);
      var marriageSharedHome = inter(mePal.home.main, youPal.home.main);
      var marriageSharedBok = inter(mePal.bok.main, youPal.bok.main);
      var friendSharedMeng = inter(mePal.meng.main, youPal.meng.main);
      var friendSharedBok = inter(mePal.bok.main, youPal.bok.main);
      var workSharedJob = inter(mePal.job.main, youPal.job.main);
      var bizSharedWealth = inter(mePal.wealth.main, youPal.wealth.main);
      var bizSharedJob = inter(mePal.job.main, youPal.job.main);
      var pastSharedBok = inter(mePal.bok.main, youPal.bok.main);
      var pastSharedMeng = inter(mePal.meng.main, youPal.meng.main);

      var loveDesc = '부처궁 핵심성: 나 ' + coreTxt(mePal.spouse) + ' × 상대 ' + coreTxt(youPal.spouse)
        + ' / 공통 주성: ' + starsTxt(loveSharedSpouse)
        + '. 명궁 공통성(' + starsTxt(loveSharedMeng) + ')이 끌림의 속도와 감정 표현 템포를 맞춥니다. '
        + supportText(mePal.spouse, youPal.spouse) + ' ' + riskText(mePal.spouse, youPal.spouse);

      var marriageDesc = '부처궁·전택궁·복덕궁을 합산한 결과입니다. 전택궁 공통 주성: ' + starsTxt(marriageSharedHome)
        + ', 복덕궁 공통 주성: ' + starsTxt(marriageSharedBok)
        + '. 생활 결합에서는 "역할 분담·재무 운행·가정 리듬"의 합이 관건이며, '
        + borrowedNote(mePal.home, youPal.home) + ' ' + riskText(mePal.home, youPal.home);

      var friendDesc = '명궁 공통 주성: ' + starsTxt(friendSharedMeng)
        + ' / 복덕궁 공통 주성: ' + starsTxt(friendSharedBok)
        + '. 대화 코드와 정서 회복 방식의 유사도를 반영했으며, '
        + supportText(mePal.bok, youPal.bok) + ' 친구 관계에서는 감정 소모 시 회복 속도가 핵심입니다.';

      var workDesc = '관록궁 핵심성: 나 ' + coreTxt(mePal.job) + ' × 상대 ' + coreTxt(youPal.job)
        + ' / 공통 주성: ' + starsTxt(workSharedJob)
        + '. 업무 궁합은 "속도 vs 완성도" 배분에서 갈리며, '
        + supportText(mePal.job, youPal.job) + ' ' + riskText(mePal.job, youPal.job);

      var businessDesc = '재백궁 공통 주성: ' + starsTxt(bizSharedWealth)
        + ', 관록궁 공통 주성: ' + starsTxt(bizSharedJob)
        + '. 수익화 모델·권한 배치·거문 파동 통제 구조를 함께 보정한 점수입니다. '
        + '재백궁 핵심성(나 ' + coreTxt(mePal.wealth) + ' / 상대 ' + coreTxt(youPal.wealth) + ') 차이가 클수록 계약서/정산 규칙을 촘촘히 잡는 것이 유리합니다.';

      var starsAll = function(p) {
        return uniq((p.main || []).concat(p.aux || []).concat(p.bad || []));
      };
      var hasAny = function(list, candidates) {
        return (list || []).some(function(v) { return candidates.indexOf(v) >= 0; });
      };
      var pickFirst = function(list, candidates) {
        for (var i = 0; i < list.length; i += 1) {
          if (candidates.indexOf(list[i]) >= 0) return list[i];
        }
        return '';
      };

      var pastMengStars = starsAll(mePal.meng).concat(starsAll(youPal.meng));
      var pastBokStars = starsAll(mePal.bok).concat(starsAll(youPal.bok));
      var pastSpouseStars = starsAll(mePal.spouse).concat(starsAll(youPal.spouse));
      var pastMoveStars = starsAll(mePal.move).concat(starsAll(youPal.move));
      var pastIllnessStars = starsAll(mePal.illness).concat(starsAll(youPal.illness));
      var pastAxisMain = uniq((mePal.meng.main || []).concat(youPal.meng.main || []).concat(mePal.bok.main || []).concat(youPal.bok.main || []).concat(mePal.spouse.main || []).concat(youPal.spouse.main || []).concat(mePal.move.main || []).concat(youPal.move.main || []).concat(mePal.illness.main || []).concat(youPal.illness.main || []));

      var pastTypeList = [];
      var destinyLoverHit = hasAny(pastSpouseStars.concat(pastMengStars), ['자미','천부','태음','탐랑']);
      var karmicDebtHit = hasAny(pastIllnessStars.concat(pastBokStars), ['칠살','화성','영성']);
      var mentorHit = hasAny(pastBokStars, ['천기']) && hasAny(pastMengStars, ['문창','문곡']);
      var rivalHit = (hasAny(pastAxisMain, ['칠살']) && hasAny(pastAxisMain, ['파군'])) || (pastAxisMain.filter(function(v){ return v === '칠살' || v === '파군'; }).length >= 2);
      var guardianHit = hasAny(pastAxisMain, ['천량','천동']);

      if (destinyLoverHit) pastTypeList.push('숙명 연인형');
      if (karmicDebtHit) pastTypeList.push('karmic 빚의 인연');
      if (mentorHit) pastTypeList.push('스승과 제자 인연');
      if (rivalHit) pastTypeList.push('운명의 라이벌');
      if (guardianHit) pastTypeList.push('보호자 인연');
      if (!pastTypeList.length) pastTypeList.push('이번 생 중심 인연');

      var envMap = {
        '탐랑':'궁중/예술계',
        '칠살':'전쟁터/장군의 진영',
        '천기':'학자/전략가의 서고',
        '태음':'귀족 가문/은밀한 내실',
        '파군':'혁명기/격변의 국면',
        '천량':'종교/수행 공동체'
      };
      var eraStar = pickFirst(uniq((mePal.move.main || []).concat(youPal.move.main || []).concat(pastMoveStars)), ['탐랑','칠살','천기','태음','파군','천량']);
      var pastEraPlace = eraStar ? envMap[eraStar] : '이동이 많은 교역 도시/변화의 경계 지대';

      var pastBand = '';
      if (pastLifeScore >= 80) pastBand = '강한 전생 인연';
      else if (pastLifeScore >= 60) pastBand = 'karmic 관계';
      else if (pastLifeScore >= 40) pastBand = '스쳐가는 인연';
      else pastBand = '이번 생 중심 인연';

      var pastTypeTitle = pastTypeList.join(' + ');
      var pastRelation = '';
      if (pastTypeList.indexOf('숙명 연인형') >= 0) {
        pastRelation = '처음 마주한 순간에도 오래전부터 서로를 알아본 듯한 정서적 익숙함이 강하게 흐를 수 있습니다.';
      } else if (pastTypeList.indexOf('karmic 빚의 인연') >= 0) {
        pastRelation = '끌림과 갈등이 동시에 작동하며, 관계를 통해 서로의 미완의 과제를 배워가는 흐름이 나타나기 쉽습니다.';
      } else if (pastTypeList.indexOf('스승과 제자 인연') >= 0) {
        pastRelation = '감정보다 지적 교류가 먼저 연결되며, 서로의 시야를 넓혀주는 동반 성장형 인연으로 읽힙니다.';
      } else if (pastTypeList.indexOf('운명의 라이벌') >= 0) {
        pastRelation = '서로를 자극하며 밀어 올리는 긴장감이 강하고, 경쟁이 곧 성장의 장치로 작동할 가능성이 큽니다.';
      } else if (pastTypeList.indexOf('보호자 인연') >= 0) {
        pastRelation = '연인이라기보다 가족 같은 보호 본능과 안정감이 먼저 작동하는 관계 결이 강합니다.';
      } else {
        pastRelation = '전생의 강한 고리보다는 이번 생의 선택과 합의가 관계의 방향을 더 크게 좌우하는 흐름입니다.';
      }

      var _zwStableSeedFrom = function(str) {
        var s = String(str || '');
        var acc = 17;
        for (var si3 = 0; si3 < s.length; si3 += 1) {
          acc = (acc * 31 + s.charCodeAt(si3)) % 2147483647;
        }
        return acc;
      };
      var _zwPickBySeed = function(list, seed, offset) {
        if (!list || !list.length) return '';
        var idx = Math.abs((seed + (offset || 0)) % list.length);
        return list[idx];
      };

      var pastSeedCore = [
        pastTypeTitle,
        pastEraPlace,
        pastBand,
        String(pastLifeScore),
        String(pastAxisMeng),
        String(pastAxisBok),
        String(pastAxisSpouse),
        String(pastAxisMove),
        coreTxt(mePal.meng),
        coreTxt(youPal.meng),
        coreTxt(mePal.spouse),
        coreTxt(youPal.spouse)
      ].join('|');
      var pastSeed = _zwStableSeedFrom(pastSeedCore);

      var storyOpeners = [
        '먹빛 하늘에 첫 별이 켜질 무렵,',
        '달력이 바뀌기 직전의 정적 속에서,',
        '바람이 문고리를 흔들던 오래된 밤,',
        '등잔불이 가장 낮게 떨리던 새벽,',
        '성운의 경계가 열리던 찰나에,'
      ];
      var storyScenesByType = {
        '숙명 연인형': [
          '두 사람은 의례와 축복이 교차하는 전각에서 서로의 이름을 봉인하듯 불렀고,',
          '두 사람은 음악과 향이 흐르는 궁정의 회랑에서 같은 약속을 다른 언어로 반복했으며,',
          '두 사람은 밤길의 등불 아래서 이별을 미루는 대신 재회를 예언하는 표식을 남겼고,'
        ],
        'karmic 빚의 인연': [
          '두 사람은 전장의 뒤편에서 서로의 생존을 바꿔치기하듯 지켜냈지만 정산되지 못한 감정이 남았고,',
          '두 사람은 빚과 은혜의 장부를 끝내 맞추지 못한 채 같은 도시의 다른 계절로 흩어졌으며,',
          '두 사람은 구원과 상처가 교차하는 선택을 반복하다 마지막 문장을 쓰지 못한 채 멈췄고,'
        ],
        '스승과 제자 인연': [
          '두 사람은 오래된 서고에서 질문과 답을 주고받으며 서로의 시야를 확장했지만,',
          '두 사람은 같은 도표를 다른 손으로 완성해 가며 사유의 결을 닮아갔고,',
          '두 사람은 말보다 침묵의 여백에서 더 많은 지혜를 전수했으나,'
        ],
        '운명의 라이벌': [
          '두 사람은 같은 목표를 다른 방식으로 쟁취하며 서로를 가장 날카롭게 성장시켰고,',
          '두 사람은 승부의 문턱마다 상대의 존재를 자신의 한계치로 삼았으며,',
          '두 사람은 대립의 언어로 소통하면서도 결정적 순간마다 서로의 등을 밀어주었고,'
        ],
        '보호자 인연': [
          '두 사람은 폭우가 쏟아지는 골목마다 한 사람이 길을 만들고 다른 한 사람이 숨을 고르게 했으며,',
          '두 사람은 불안이 밀려오는 날마다 역할을 바꿔가며 서로의 방패가 되었고,',
          '두 사람은 위기 때마다 가장 먼저 서로의 이름을 확인하는 습관을 갖게 되었지만,'
        ],
        '이번 생 중심 인연': [
          '두 사람의 전생 기록은 짧고 옅지만, 희미한 접점들이 이번 생의 우연을 정교하게 밀어 올렸고,',
          '두 사람의 과거 연결은 강하지 않았으나 반복되는 타이밍의 일치가 관계의 가능성을 키웠으며,',
          '두 사람은 긴 서사 대신 작은 공명들을 남겼고 그것들이 현생에서 다시 결을 만들고 있으며,'
        ]
      };
      var storyConflictsByBand = {
        '강한 전생 인연': [
          '강한 끌림이 기준 없는 속도로 번지면 애정이 피로로 바뀔 수 있었습니다.',
          '서로를 잘 안다는 확신이 대화를 생략하게 만들 때 오해가 더 깊어졌습니다.',
          '익숙함이 배려를 대체한 구간에서 관계의 온도가 급격히 흔들렸습니다.'
        ],
        'karmic 관계': [
          '미해결 과제가 반복될수록 같은 갈등이 다른 장면으로 재현되는 패턴이 생겼습니다.',
          '사과보다 해명이 먼저 나올 때 감정의 장부가 계속 누적되었습니다.',
          '정답을 찾으려는 조급함이 서로의 회복 타이밍을 어긋나게 했습니다.'
        ],
        '스쳐가는 인연': [
          '연결의 밀도보다 현실의 속도가 앞설 때 손을 놓치기 쉬웠습니다.',
          '감정은 있었지만 운영 규칙이 없어 일상이 관계를 밀어냈습니다.',
          '좋은 의도는 충분했으나 합의의 언어가 부족해 엇갈림이 누적되었습니다.'
        ],
        '이번 생 중심 인연': [
          '선입견이 커질수록 실제의 장점이 가려지는 문제가 반복되었습니다.',
          '의미를 과장해 해석하면 단순한 문제도 숙명처럼 보일 수 있었습니다.',
          '작은 오해를 즉시 풀지 않으면 관계의 기본값이 쉽게 낮아졌습니다.'
        ]
      };
      var storyEndings = [
        '그래서 이번 생의 열쇠는 "속도"보다 "합의"이며, 약속의 단위를 작게 쪼갤수록 인연의 품질이 높아집니다.',
        '결국 이 인연의 완성도는 감정의 크기보다 운영의 디테일에 의해 결정되며, 반복 가능한 규칙이 곧 사랑의 안전장치가 됩니다.',
        '이번 생에서 두 사람은 운명을 증명하기보다 생활을 설계해야 하며, 그 설계도가 곧 전생의 미완을 완성하는 문서가 됩니다.',
        '따라서 강한 끌림을 오래 가는 신뢰로 바꾸려면, 즉흥적 해석보다 주기적 대화 루틴이 필수입니다.'
      ];

      var leadType = pastTypeList[0] || '이번 생 중심 인연';
      var scenePool = storyScenesByType[leadType] || storyScenesByType['이번 생 중심 인연'];
      var conflictPool = storyConflictsByBand[pastBand] || storyConflictsByBand['스쳐가는 인연'];
      var storyOpening = _zwPickBySeed(storyOpeners, pastSeed, 3);
      var storyScene = _zwPickBySeed(scenePool, pastSeed, 11);
      var storyConflict = _zwPickBySeed(conflictPool, pastSeed, 19);
      var storyEnding = _zwPickBySeed(storyEndings, pastSeed, 27);

      var storyMotifList = [];
      if (hasAny(pastAxisMain, ['태음','천동'])) storyMotifList.push('월광의 정서 교감');
      if (hasAny(pastAxisMain, ['칠살','파군'])) storyMotifList.push('강한 결단과 변혁');
      if (hasAny(pastAxisMain, ['천기','문창','문곡'])) storyMotifList.push('지적 공명과 전략');
      if (hasAny(pastAxisMain, ['천량','천부'])) storyMotifList.push('보호와 책임의 결');
      if (hasAny(pastAxisMain, ['탐랑','태양'])) storyMotifList.push('열정과 표현의 불꽃');
      if (!storyMotifList.length) storyMotifList.push('느린 신뢰의 축적');
      var storyMotifs = uniq(storyMotifList).slice(0, 3).join(' · ');

      var pastStory = storyOpening + ' '
        + '두 사람의 영혼은 ' + pastEraPlace + '의 기록과 공명하며 서로를 재인식했습니다. '
        + storyScene + ' '
        + '그 과정에서 ' + storyConflict + ' '
        + '현재 차트에 남은 전생의 키워드는 [' + storyMotifs + ']이며, '
        + storyEnding;

      var pastMeaning = '';
      if (pastLifeScore >= 80) {
        pastMeaning = '강한 전생 인연 축이 감지됩니다. 이번 생에서는 "강한 끌림"을 "안정적인 합의"로 바꾸는 실천이 관계의 품질을 결정합니다. '
          + '미션: 1) 다툼 후 24시간 내 재대화 규칙 확정 2) 월 1회 관계 운영 점검 3) 돈/시간/연락 기준 3줄 헌법 작성.';
      } else if (pastLifeScore >= 60) {
        pastMeaning = 'karmic 학습 과제가 남아 있을 가능성이 있습니다. 감정 반응을 즉시 확정하지 않고 대화 규칙을 세우면 성장 속도가 빨라집니다. '
          + '미션: 1) 감정 언어(사실/감정/요청) 포맷 통일 2) 오해 누적 전에 10분 체크인 3) 갈등 키워드 기록 후 재발 방지.';
      } else if (pastLifeScore >= 40) {
        pastMeaning = '전생의 연결은 약하지만 의미 없는 만남은 아닙니다. 이번 생의 생활 리듬과 상호 존중이 인연의 깊이를 키우는 핵심 열쇠입니다. '
          + '미션: 1) 주간 데이트/휴식 리듬 고정 2) 기대치 사전 합의 3) 긍정 피드백 1개를 매일 교환.';
      } else {
        pastMeaning = '전생보다 현생 중심의 인연으로 보입니다. 선입견 없이 지금의 선택과 행동으로 관계를 설계할수록 건강한 결과에 가까워집니다. '
          + '미션: 1) 관계 목표를 작게 정의 2) 역할 분담 명확화 3) 문제 발생 시 원인보다 해결 순서를 먼저 합의.';
      }

      var pastMission = '';
      if (pastBand === '강한 전생 인연') {
        pastMission = '서로를 너무 잘 안다는 착각을 경계하고, 합의 없는 직감을 줄이는 것.';
      } else if (pastBand === 'karmic 관계') {
        pastMission = '반복되는 갈등 패턴을 기록해 "이번에는 다르게" 실행하는 것.';
      } else if (pastBand === '스쳐가는 인연') {
        pastMission = '작은 약속의 이행률을 높여 신뢰의 누적치를 만드는 것.';
      } else {
        pastMission = '숙명 해석보다 현실 운영(시간·돈·표현)의 일관성을 먼저 세우는 것.';
      }

      var pastLifeDesc = '전생 인연 유형\n(' + pastTypeTitle + ')\n\n'
        + '전생 키워드\n(' + storyMotifs + ')\n\n'
        + '전생 관계\n(' + pastRelation + ')\n\n'
        + '전생 시대 / 장소\n(' + pastEraPlace + ')\n\n'
        + '전생 이야기\n(' + pastStory + ')\n\n'
        + '전생 인연 점수\n(' + pastLifeScore + ' / 100, ' + pastBand + ')\n\n'
        + '이번 생에서의 의미\n(' + pastMeaning + ')\n\n'
        + '이번 생 미션\n(' + pastMission + ')';

      var tagByScore = function(score, key) {
        if (key === '연애 궁합') return score >= 60 ? '#감정교류활성' : '#속도조율';
        if (key === '결혼 궁합') return score >= 60 ? '#생활헌법합의' : '#가정리듬조율';
        if (key === '직장 궁합') return score >= 60 ? '#역할분담시너지' : '#병목해소';
        if (key === '사업 궁합') return score >= 60 ? '#수익구조정렬' : '#계약서우선';
        if (key === '친구 궁합') return score >= 60 ? '#정서회복빠름' : '#거리존중';
        return score >= 60 ? '#카르마상호보완' : '#인연학습';
      };

      var rawCatRows = [
        { key: '연애 궁합', rawVal: loveScore, w: 0.26 },
        { key: '결혼 궁합', rawVal: marriageScore, w: 0.22 },
        { key: '친구 궁합', rawVal: friendScore, w: 0.12 },
        { key: '직장 궁합', rawVal: workScore, w: 0.18 },
        { key: '사업 궁합', rawVal: businessScore, w: 0.17 }
      ];

      var funDetailByTag = function(tag, key) {
        var tagKey = String(tag || '').replace(/^#/, '');
        var map = {
          '감정교류활성': '오늘의 커플 퀘스트: "한 줄 감정 + 한 줄 칭찬"을 서로 교환하면 애정 게이지가 눈에 띄게 상승합니다. 말투가 부드러워질수록 별빛 버프가 강해집니다.',
          '속도조율': '두 사람의 리듬이 서로 달라 "빨리"보다 "같이"가 정답인 구간입니다. 데이트 템포를 반 박자만 늦추면 오해가 귀여운 해프닝으로 끝납니다.',
          '생활헌법합의': '이 궁합의 핵심은 로맨스보다 운영력입니다. 돈·연락·휴식 규칙 3개만 합의해도 "현실 천생연분" 모드가 켜집니다.',
          '가정리듬조율': '집안일, 수면, 식사처럼 일상 리듬을 맞추면 애정이 자동 충전됩니다. 작은 루틴 하나가 큰 싸움을 미리 막아주는 숨은 치트키입니다.',
          '역할분담시너지': '이 팀은 각자 잘하는 포지션을 맡을 때 폭발합니다. "누가 더 열심히"보다 "누가 더 잘 맞는지"로 나누면 성과와 관계를 동시에 챙깁니다.',
          '병목해소': '답답한 포인트를 숨기지 말고 병목 1개만 콕 집어 해결하세요. 회의 10분, 정리 2줄이면 스트레스 파동이 빠르게 내려갑니다.',
          '수익구조정렬': '돈의 흐름을 같은 그림으로 보는 순간 궁합이 급상승합니다. 수입·지출·저축을 한 화면에 놓고 보면 "왜" 싸우는지가 바로 풀립니다.',
          '계약서우선': '좋은 관계일수록 문서가 다정합니다. 역할·권한·정산 규칙을 미리 적어두면 감정 소모 없이 오래 가는 파트너십이 됩니다.',
          '정서회복빠름': '속상해도 회복 속도가 빠른 조합입니다. 산책 20분 + 간식 1개 같은 가벼운 루틴이 기분을 놀랍게 빠르게 되돌립니다.',
          '거리존중': '가까움의 밀도보다 거리의 품질이 중요한 인연입니다. 각자의 공간을 인정할수록 다시 만났을 때 온도가 더 따뜻해집니다.',
          '카르마상호보완': '서로의 약점을 교정해 주는 학습형 버프가 작동합니다. "고치려는 말"보다 "도와주는 행동"이 훨씬 빠르게 관계를 성장시킵니다.',
          '인연학습': '지금은 완성형보다 튜토리얼 구간입니다. 작은 시행착오를 기록해 두면 다음 만남마다 체감 궁합이 꾸준히 올라갑니다.'
        };
        var fallback = '이 구간의 키워드는 ' + tag + ' 입니다. 가볍게 웃고 빠르게 합의하는 팀일수록 운의 체감 온도가 더 좋아집니다.';
        return map[tagKey] || fallback;
      };

      var safeText = function(v) {
        v = String(v == null ? '' : v);
        if (typeof iljuEscapeHtml === 'function') return iljuEscapeHtml(v);
        return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      var userLabel = safeText((typeof USER_NAME === 'string' && USER_NAME.trim()) ? USER_NAME.trim() : '사용자');
      var partnerLabel = safeText('상대방');

      var starElement = {
        '자미':'토','천기':'목','태양':'화','무곡':'금','천동':'수','염정':'화','천부':'토','태음':'수',
        '탐랑':'목','거문':'수','천상':'금','천량':'토','칠살':'금','파군':'수','공궁':'중립'
      };
      var elemGen = { '목':'화', '화':'토', '토':'금', '금':'수', '수':'목' };
      var elemCtrl = { '목':'토', '토':'수', '수':'화', '화':'금', '금':'목' };

      var coreMe = coreTxt(mePal.meng);
      var coreYou = coreTxt(youPal.meng);
      var eMe = starElement[coreMe] || '중립';
      var eYou = starElement[coreYou] || '중립';

      var layer1Bonus = 0;
      var layer1Text = '';
      var tianjiTianliangPair = (coreMe === '천기' && coreYou === '천량') || (coreMe === '천량' && coreYou === '천기');
      if (tianjiTianliangPair) {
        layer1Bonus += 15;
        layer1Text = '천기(목)와 천량(토)의 만남은 기본적으로 목극토의 긴장 구조지만, 천량의 보호 기운이 천기의 예민함을 수렴하는 순간 강력한 상보 시너지가 열립니다. 성격 시너지 보너스 +15점이 반영됩니다.';
      } else if (eMe === eYou && eMe !== '중립') {
        layer1Bonus += 8;
        layer1Text = '주성 오행이 같은 결을 형성해 감정 리듬이 잘 맞습니다. 충돌보다 공명이 먼저 작동하는 구조입니다.';
      } else if (elemGen[eMe] === eYou || elemGen[eYou] === eMe) {
        layer1Bonus += 10;
        layer1Text = '오행이 상생 구조를 이루어 서로의 성향을 자연스럽게 북돋웁니다. 한쪽의 강점이 다른 한쪽의 추진력을 키워줍니다.';
      } else if (elemCtrl[eMe] === eYou || elemCtrl[eYou] === eMe) {
        layer1Bonus += 4;
        layer1Text = '오행 상극 구조가 일부 있으나, 잘 쓰면 갈등이 아니라 역할 분업으로 전환됩니다. 서로의 다른 결이 완성도를 높여줍니다.';
      } else {
        layer1Bonus += 6;
        layer1Text = '오행의 직접 공명은 약하지만, 성향 차이를 분업으로 설계하면 성장 탄력이 살아납니다.';
      }

      var traitMap = {
        '천기':['유연성','소통력'],'천동':['유연성','정서완충'],'태음':['공감력','소통력'],'거문':['소통력','분석력'],
        '문창':['소통력','지적교감'],'문곡':['소통력','감성교류'],'천량':['보호력','안정성'],'천부':['안정성','책임감'],
        '천상':['균형감','소통력'],'자미':['책임감','리더십'],'태양':['표현력','실행력'],'무곡':['실행력','현실감']
      };
      var mergeTraits = function(stars) {
        var t = Object.create(null);
        (stars || []).forEach(function(s){
          (traitMap[s] || []).forEach(function(k){ t[k] = 1; });
        });
        return Object.keys(t);
      };

      var myIdealTraits = mergeTraits((mePal.spouse.main || []).concat(mePal.spouse.aux || []));
      if (!myIdealTraits.length) myIdealTraits = ['유연성','소통력'];
      var partnerPersonaTraits = mergeTraits((youPal.meng.main || []).concat(youPal.meng.aux || []).concat(youPal.spouse.main || []));
      var matchedTraits = myIdealTraits.filter(function(t){ return partnerPersonaTraits.indexOf(t) >= 0; });
      var layer2Bonus = Math.min(20, matchedTraits.length * 10);
      var layer2Text = matchedTraits.length
        ? ('나의 이상적 배우자 코드('+myIdealTraits.join('·')+')와 상대 명궁 코드가 '+matchedTraits.join('·')+'에서 정합됩니다. 운명적 매칭 가산점 +'+layer2Bonus+'점이 적용됩니다.')
        : '이상 배우자 코드와 상대 명궁 코드의 직접 정합은 약하지만, 역할 분담 설계로 매칭률을 끌어올릴 수 있습니다.';

      var myHwagi = [];
      if (meData && meData.sihuaData) {
        for (var hwStar in meData.sihuaData) {
          if (meData.sihuaData[hwStar] && meData.sihuaData[hwStar].type === '화기') {
            myHwagi.push(hwStar);
          }
        }
      }
      myHwagi = uniq(myHwagi);
      var partnerControlStars = uniq((youPal.meng.main || []).concat(youPal.spouse.main || []).concat(youPal.bok.main || []).concat(youPal.meng.aux || []));
      var hwagiControlMap = {
        '문창':['천량','천부','천상','태음'],
        '문곡':['천량','천동','태음','자미'],
        '탐랑':['천부','천량','무곡'],
        '거문':['천상','천량','자미']
      };
      var layer3Bonus = 0;
      var layer3Text = '';
      var controlMatched = [];
      myHwagi.forEach(function(hs){
        var ctrls = hwagiControlMap[hs] || ['천량','천부','천상'];
        var hit = ctrls.some(function(cs){ return partnerControlStars.indexOf(cs) >= 0; });
        if (hit) controlMatched.push(hs);
      });
      if (controlMatched.length) {
        layer3Bonus = 10;
        layer3Text = '나의 화기('+controlMatched.join('·')+')를 상대 주성이 완충/제어하는 구조가 확인됩니다. 리스크 방어 점수 +10점이 추가됩니다.';
      } else if (myHwagi.length) {
        layer3Bonus = 4;
        layer3Text = '화기 직접 상쇄는 약하지만 상대의 안정 주성이 완충막으로 작동해 급격한 붕괴를 막는 보정이 있습니다.';
      } else {
        layer3Text = '화기 압력이 낮아 리스크 방어가 기본적으로 안정권입니다.';
      }

      var keyPalaces = ['부처궁','부부궁','명궁','관록궁','재백궁'];
      var periodOverlap = [];
      var mePeriods = (meData && meData.daHanList) ? meData.daHanList : [];
      var youPeriods = (partnerData && partnerData.daHanList) ? partnerData.daHanList : [];
      mePeriods.forEach(function(mp){
        if (keyPalaces.indexOf(mp.palaceName) < 0) return;
        youPeriods.forEach(function(yp){
          if (keyPalaces.indexOf(yp.palaceName) < 0) return;
          var st = Math.max(mp.startAge, yp.startAge);
          var ed = Math.min(mp.endAge, yp.endAge);
          if (st <= ed) {
            periodOverlap.push({ st: st, ed: ed, meP: mp.palaceName, youP: yp.palaceName });
          }
        });
      });
      var layer4Bonus = periodOverlap.length ? 10 : 0;
      var goldenTime = '';
      if (periodOverlap.length) {
        periodOverlap.sort(function(a,b){ return (a.st - b.st) || (a.ed - b.ed); });
        var topOv = periodOverlap[0];
        var has2332 = periodOverlap.some(function(o){ return Math.max(o.st, 23) <= Math.min(o.ed, 32); });
        goldenTime = has2332
          ? '23~32세 핵심 변곡점이 서로 맞물리며 인연의 가속도가 크게 상승합니다. (인연 강도 +10점)'
          : (topOv.st+'~'+topOv.ed+'세 구간에서 '+topOv.meP+'×'+topOv.youP+' 축이 동기화됩니다. (인연 강도 +10점)');
      } else {
        goldenTime = '대운 핵심 구간의 직접 중첩은 약하지만, 준비된 합의가 있으면 후반 동기화 가능성이 높습니다.';
      }

      var baseWeighted = Math.round(
        loveScore * 0.30 + marriageScore * 0.25 + friendScore * 0.14 + workScore * 0.18 + businessScore * 0.13
      );
      var layeredBonus = layer1Bonus + layer2Bonus + layer3Bonus + layer4Bonus;
      var overallScore = Math.max(40, Math.min(95, baseWeighted + layeredBonus));

      var rawAvg = Math.round(rawCatRows.reduce(function(sum, r) { return sum + r.rawVal; }, 0) / rawCatRows.length);
      var syncGap = overallScore - rawAvg;
      var catRows = rawCatRows.map(function(r) {
        // 세부 점수를 종합점수 스케일에 맞추되, 카테고리 간 상대 순위는 유지한다.
        var upliftByGap = syncGap * 0.72;
        var upliftByLayer = layeredBonus * r.w * 0.55;
        var val = Math.round(r.rawVal + upliftByGap + upliftByLayer);
        val = Math.max(30, Math.min(95, val));
        return {
          key: r.key,
          val: val,
          tag: tagByScore(val, r.key),
          detail: ''
        };
      });
      catRows = catRows.map(function(c) {
        c.detail = funDetailByTag(c.tag, c.key);
        return c;
      });

      var relationAlias = overallScore >= 80 ? '완벽한 파트너십' : (overallScore <= 70 ? '성장형 커플' : '고밀도 동반자');

      var scoreBadge = function(v) {
        var bg = v >= 80 ? 'rgba(74,222,128,0.2)' : (v >= 70 ? 'rgba(96,165,250,0.2)' : 'rgba(245,158,11,0.2)');
        var bd = v >= 80 ? 'rgba(74,222,128,0.6)' : (v >= 70 ? 'rgba(96,165,250,0.6)' : 'rgba(245,158,11,0.6)');
        return '<span style="padding:2px 8px;border-radius:999px;border:1px solid '+bd+';background:'+bg+';font-size:0.78rem;color:#fdf2f8;font-weight:800;">'+v+'점</span>';
      };

      var guideHtml = '<div class="zw-compat-score-list">'
        + catRows.map(function(c) {
          return '<div class="zw-compat-score-row">'
            + '<div>'
            + '<b>'+c.key+'</b>'
            + '<span class="zw-compat-score-tag">'+c.tag+'</span>'
            + '<div class="zw-compat-score-desc">'+c.detail+'</div>'
            + '</div>'
            + scoreBadge(c.val)
            + '</div>';
        }).join('')
        + '</div>';

      var karmicLightHit = karmicDebtHit || pastLifeScore >= 60;
      var sealOn = function(active) {
        return active ? ' zw-karmic-seal active' : ' zw-karmic-seal';
      };
      var topSandHeight = Math.max(14, Math.min(54, 56 - Math.round(pastLifeScore * 0.44)));
      var bottomSandHeight = Math.max(14, Math.min(54, 10 + Math.round(pastLifeScore * 0.44)));

      var pastLifeHtml = '<div class="zw-pastlife-archive">'
        + '<div class="zw-pastlife-nebula"></div>'
        + '<div class="zw-pastlife-sparkles"></div>'
        + '<div class="zw-pastlife-layout">'
        + '<div class="zw-pastlife-head">'
        + '<div class="zw-pastlife-title">천상의 기록자 서고 | Chronos Scroll 아카이브</div>'
        + '<div class="zw-pastlife-sub">무한한 성운 서고에서 사서 마도사가 당신에게 전생 기록을 건넵니다. 오래된 양피지에 새겨진 영혼의 교차점을 따라, 두 사람의 기억이 황금빛 잉크로 깨어납니다.</div>'
        + '</div>'
        + '<div class="zw-pastlife-main">'
        + '<div class="zw-chronos-scroll">'
        + '<div class="zw-chronos-map">'
        + '<i style="left:14%;top:24%;"></i><i style="left:31%;top:54%;"></i><i style="left:54%;top:34%;"></i><i style="left:74%;top:62%;"></i><i style="left:86%;top:26%;"></i>'
        + '<b style="left:15%;top:26%;width:50px;transform:rotate(38deg);"></b><b style="left:31%;top:55%;width:58px;transform:rotate(-24deg);"></b><b style="left:54%;top:36%;width:52px;transform:rotate(33deg);"></b><b style="left:74%;top:63%;width:36px;transform:rotate(-58deg);"></b><b style="left:31%;top:55%;width:112px;transform:rotate(-6deg);"></b>'
        + '</div>'
        + '<div class="zw-scroll-block"><b>전생 인연 유형</b>'+pastTypeTitle+'</div>'
        + '<div class="zw-scroll-block"><b>전생 키워드</b>'+storyMotifs+'</div>'
        + '<div class="zw-scroll-block"><b>전생 관계</b>'+pastRelation+'</div>'
        + '<div class="zw-scroll-block"><b>전생 시대 / 장소</b>'+pastEraPlace+'</div>'
        + '<div class="zw-scroll-block"><b>전생 이야기</b>'+pastStory+'</div>'
        + '<div class="zw-scroll-block"><b>이번 생에서의 의미</b>'+pastMeaning+'</div>'
        + '<div class="zw-scroll-block"><b>이번 생 미션</b>'+pastMission+'</div>'
        + '<div class="zw-karmic-seals">'
        + '<div class="'+sealOn(pastTypeList.indexOf('숙명 연인형') >= 0)+'"><b>🔗</b>숙명 연인형<br>은빛 링 봉인</div>'
        + '<div class="'+sealOn(karmicLightHit)+'"><b>✨</b>karmic 빛의 인연<br>맥동하는 별 봉인</div>'
        + '<div class="'+sealOn(pastTypeList.indexOf('보호자 인연') >= 0)+'"><b>🛡️</b>보호자 인연<br>투명한 날개 봉인</div>'
        + '</div>'
        + '</div>'
        + '<div class="zw-hourglass-wrap">'
        + '<div class="zw-hourglass">'
        + '<div class="zw-hourglass-sand-top" style="height:'+topSandHeight+'px;"></div>'
        + '<div class="zw-hourglass-neck"></div>'
        + '<div class="zw-hourglass-sand-bottom" style="height:'+bottomSandHeight+'px;"></div>'
        + '</div>'
        + '<div class="zw-hourglass-score">'+pastLifeScore+' / 100</div>'
        + '<div class="zw-hourglass-note">황금 모래는 두 영혼의<br>karmic 채무와 연결 강도를<br>시간의 비율로 새깁니다.</div>'
        + '</div>'
        + '</div>'
        + '<div class="zw-palace-pillars">'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisMeng)))+'px;"></div><div class="zw-palace-name">명궁 축 (Life)</div><div class="zw-palace-score">'+pastAxisMeng+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisBok)))+'px;"></div><div class="zw-palace-name">복덕궁 축 (Fortune)</div><div class="zw-palace-score">'+pastAxisBok+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisSpouse)))+'px;"></div><div class="zw-palace-name">부부궁 축 (Spouse)</div><div class="zw-palace-score">'+pastAxisSpouse+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisMove)))+'px;"></div><div class="zw-palace-name">천이궁 축 (Transition)</div><div class="zw-palace-score">'+pastAxisMove+'</div></div>'
        + '</div>'
        + '<div class="zw-scroll-block" style="margin-bottom:0;color:#ecdcc1;">질액궁 축 '+pastAxisIllness+'점은 배경 파동으로 기록되어, 감정 회복 속도와 카르마 소모 패턴을 보조 해석합니다.</div>'
        + '</div>'
        + '</div>'
        + '</div>';

      var hasTara = (mePal.spouse.bad.concat(youPal.spouse.bad).indexOf('타라') >= 0) || (mePal.meng.bad.concat(youPal.meng.bad).indexOf('타라') >= 0);
      var hasMoonchangHwagi = myHwagi.indexOf('문창') >= 0;
      var warningSignal = hasMoonchangHwagi
        ? '문창 화기 개입 시 말의 뉘앙스가 칼날처럼 전달되어 사소한 오해가 대형 균열로 번질 수 있습니다.'
        : (hasTara
          ? '타라 개입으로 타이밍 어긋남(답장 템포, 약속 실행 시점)이 누적되면 감정 회로가 쉽게 과열됩니다.'
          : '흉성 압력 구간에서는 기대치 미정렬이 갈등의 시작점이 됩니다.');
      var patch1 = hasTara
        ? '타이밍 어긋남이 보이면 10분 콜 대신 3줄 체크인 메시지(현재상태/요청/회복시간)를 고정 룰로 사용하세요.'
        : '갈등 당일 결론을 강요하지 말고 24시간 후 재대화 슬롯을 고정하세요.';
      var patch2 = hasMoonchangHwagi
        ? '문창 화기 구간에는 비난형 표현을 금지하고, 사실 1개 + 감정 1개 + 요청 1개 포맷으로만 대화하세요.'
        : '주 1회 15분 관계 로그(좋았던 점 1개/아쉬운 점 1개/다음 액션 1개)를 합의해 누적 오해를 차단하세요.';

      var bestCategory = catRows.slice().sort(function(a,b){ return b.val - a.val; })[0];
      var weakestCategory = catRows.slice().sort(function(a,b){ return a.val - b.val; })[0];

      var conflictTrigger = hasMoonchangHwagi
        ? '문창 화기 신호로 인해 같은 말도 날카롭게 받아들여질 수 있어, 표현 톤이 갈등을 키우는 촉발점이 될 수 있습니다.'
        : (hasTara
          ? '타라 개입으로 답장 템포·약속 실행 시점이 어긋날 때 신뢰 체감이 급격히 낮아지는 패턴이 나타날 수 있습니다.'
          : '흉성 압력 구간에서는 기대치 미정렬(역할/시간/우선순위)이 반복 충돌의 시작점이 될 수 있습니다.');

      var conflictScenario = weakestCategory.key + ' 점수(' + weakestCategory.val + '점)가 가장 낮아 이 축에서 갈등 체감이 커질 수 있습니다. '
        + '특히 ' + weakestCategory.key + ' 관련 이슈가 발생하면 작은 의견 차이도 누적되기 쉬우므로, 기준(우선순위·시간·표현 방식)을 먼저 합의하는 것이 안전합니다.';

      outEl.innerHTML = '<div class="zw-compat-result-shell">'
        + '<div style="position:absolute;left:-20px;top:-28px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(251,113,133,0.18),rgba(251,113,133,0));pointer-events:none;"></div>'
        + '<div style="position:absolute;right:-40px;bottom:-55px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(217,70,239,0.14),rgba(217,70,239,0));pointer-events:none;"></div>'
        + '<div class="zw-compat-result-inner">'
        + '<div class="zw-compat-result-head card-content">'
        + '<div class="zw-compat-headline section-title">🌟 '+userLabel+' x '+partnerLabel+' 궁합 레포트: "'+relationAlias+'"</div>'
        + '<div class="zw-compat-subline">종합 점수 <b class="compatibility-score">'+overallScore+'점</b> · 장점 시너지 반영</div>'
        + '<div class="zw-compat-meta">궁합 합산 근거: 오행/성정 '+layer1Bonus+' + 궁위 매칭 '+layer2Bonus+' + 사화 완충 '+layer3Bonus+' + 대운 동기화 '+layer4Bonus+'</div>'
        + '<div class="zw-compat-meta">상대 보정 시간: '+z2(correctedHour)+':'+z2(correctedMinute)+' · 도시: '+cityLabel+'</div>'
        + '</div>'
        + '<div class="zw-compat-core-grid">'
        + '<div class="zw-compat-core-panel">'
        + '<div class="zw-compat-core-title palace-title">핵심 시너지</div>'
        + '<div class="zw-compat-core-text">'
        + '<b>성격 시너지:</b> '+layer1Text+'<br>'
        + '<b>운명적 매칭:</b> '+layer2Text+'<br>'
        + '<b>행운의 전이:</b> 상대와 함께할 때 '+bestCategory.key+' 축이 가장 강하게 활성화됩니다.'
        + '</div>'
        + '</div>'
        + '<div class="zw-compat-core-panel">'
        + '<div class="zw-compat-core-title palace-title">갈등 예방 & 조율</div>'
        + '<div class="zw-compat-core-text">'
        + '<b>주의 신호:</b> '+warningSignal+'<br>'
        + '<b>단점 기반 트리거:</b> '+conflictTrigger+'<br>'
        + '<b>조율법 1:</b> '+patch1+'<br>'
        + '<b>조율법 2:</b> '+patch2+'<br>'
        + '<b>취약 구간 시나리오:</b> '+conflictScenario
        + (layer3Text ? ('<br><b>사화 시너지 부스터:</b> '+layer3Text) : '')
        + '</div>'
        + '</div>'
        + '</div>'
        + '<details class="zw-compat-ref-details">'
        + '<summary class="zw-compat-ref-summary"><span class="zw-compat-ref-title">점수별 해석 펼치기</span><span class="zw-compat-ref-indicator">열기/닫기</span></summary>'
        + '<div class="zw-compat-ref-content">'+guideHtml+'</div>'
        + '</details>'
        + '<details class="zw-compat-ref-details">'
        + '<summary class="zw-compat-ref-summary"><span class="zw-compat-ref-title">전생 인연 리포트 펼치기</span><span class="zw-compat-ref-indicator">열기/닫기</span></summary>'
        + '<div class="zw-compat-ref-content" style="padding:8px 0 0 0;">'
        + pastLifeHtml
        + '</div>'
        + '</details>'
        + '</div>'
        + '</div>';

      try {
        var zwLlm = document.createElement('div');
        zwLlm.setAttribute('data-cd-zw-compat-llm', '1');
        outEl.appendChild(zwLlm);
        cdEnsureCompatLlmReady(function () {
          if (!window.CompatLlm || typeof window.CompatLlm.mountZiweiFromPayload !== 'function') {
            zwLlm.innerHTML = '<div style="color:#fda4af;font-size:0.85rem;padding:10px;border-radius:10px;border:1px solid rgba(251,113,133,0.35);margin-top:10px;">AI 프롬프트 모듈을 불러오지 못했습니다. 새로고침 후 <b>궁합 보기</b>를 다시 눌러 주세요.</div>';
            return;
          }
          window.CompatLlm.mountZiweiFromPayload(zwLlm, {
            engine: 'ziwei',
            userLabel: userLabel,
            partnerLabel: partnerLabel,
            partnerInput: {
              birthDate: bDate,
              birthTimeLocal: bTime,
              birthTimeCorrectedSolar: z2(correctedHour) + ':' + z2(correctedMinute),
              cityLabel: cityLabel,
              correctionNote: correctionMsg
            },
            overallScore: overallScore,
            categoryScores: catRows.map(function (c) { return { key: c.key, val: c.val }; }),
            mingPalace: {
              me: { main: mePal.meng.main, aux: mePal.meng.aux },
              partner: { main: youPal.meng.main, aux: youPal.meng.aux }
            },
            spousePalace: {
              me: { main: mePal.spouse.main, aux: mePal.spouse.aux },
              partner: { main: youPal.spouse.main, aux: youPal.spouse.aux }
            },
            scores: { love: loveScore, marriage: marriageScore, friend: friendScore, work: workScore, business: businessScore, pastLife: pastLifeScore }
          });
        });
      } catch (llmErr) {
        console.warn('[CompatLlm ziwei]', llmErr);
      }

      } catch (e) {
        console.error('[Ziwei compat] run error:', e);
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">궁합 계산 중 오류가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.</div>';
      } finally {
        if (triggerBtn) {
          triggerBtn.disabled = false;
          triggerBtn.style.opacity = '';
        }
      }
      };

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(runCompatCalc);
      } else {
        setTimeout(runCompatCalc, 0);
      }

    };

    if (!window._zwEscCloseBound) {
      window.addEventListener('keydown', function(e) {
        if (!e || e.key !== 'Escape') return;

        var panel = document.getElementById('zwDetailPanel');
        if (!panel) return;

        var overlay = document.getElementById('ziweiModalOverlay');
        if (overlay && overlay.style.display === 'none') return;

        var reportOpen = !!panel.querySelector('.zw-insight-layout');
        if (!reportOpen) return;

        if (typeof window._closeZwDetailReport === 'function') {
          window._closeZwDetailReport();
          e.preventDefault();
          e.stopPropagation();
        }
      });
      window._zwEscCloseBound = true;
    }

    if (!window._zwHomeGuardBound) {
      var ziweiOverlay = document.getElementById('ziweiModalOverlay');
      if (ziweiOverlay) {
        ziweiOverlay.addEventListener('click', function(e) {
          var t = e && e.target;
          if (!t || typeof t.closest !== 'function') return;
          var homeBtn = t.closest('[data-action="closeZiweiModal"]');
          if (!homeBtn) return;
          if (Date.now() < (window._zwReportToggleLockUntil || 0)) {
            window._zwMuteEvent(e);
          }
        }, true);
      }
      window._zwHomeGuardBound = true;
    }

    window._renderZwPanel = function(idx, pName, stars, pd, opts) {
      opts = opts || {};
      var clickOnly = !!opts.clickOnly;
      var targetPanelId = opts.targetId || 'zwDetailPanel';
      var showClose = opts.showClose !== false;
      var showRadar = opts.showRadar !== false;
      var shouldScroll = !!opts.scroll;
        var extractMainMeta = function(sList) {
            if(!sList) return [];
            var hasMain = !!(sList.main && sList.main.length);
            var usingBorrowedSource = !hasMain && !!(sList.borrowedMain && sList.borrowedMain.length);
            var src = hasMain ? sList.main : (sList.borrowedMain || []);
            if(!src || !src.length) return [];
            return src.map(function(m){
              var plain=(m||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
              var isBorrowed=usingBorrowedSource || /\(차성\)|\b차성\b/.test(plain);
              var name=plain
                .replace(/\(차성\)/g,'')
                .replace(/화록|화권|화과|화기/g,'')
                .trim()
                .split(' ')[0];
              return { name:name||'', isBorrowed:isBorrowed };
            }).filter(function(x){ return !!x.name; });
        };
            // Backward-compatible helper: legacy logic below still expects plain main-star names.
            var extractMains = function(sList) {
              return extractMainMeta(sList).map(function(m){ return m.name; });
            };
        var extractAux = function(sList) {
            if(!sList||!sList.aux) return [];
            return sList.aux.map(m=>m.replace(/<[^>]+>/g,'').trim().split(' ')[0]);
        };
        var extractBad = function(sList) {
            if(!sList||!sList.bad) return [];
            return sList.bad.map(m=>m.replace(/<[^>]+>/g,'').trim().split(' ')[0]);
        };
        var fmtStrength = function(starName, zhi, isBorrowed){
          var lv = zwComputeStarStrength(starName, zhi, !!isBorrowed);
          if(!lv) return starName;
          return starName + ' ' + zwStrengthToSymbol(lv);
        };
        var fmtListWithStrength = function(list, zhi, isBorrowed){
          return (list||[]).map(function(n){ return fmtStrength(n, zhi, isBorrowed); }).join(' · ');
        };
        var getPStars = function(name) {
            var i = pd.palacesByIndex.indexOf(name);
            return i < 0 ? null : pd.stars[i];
        };

        var msRef = {
            '자미': { 
                psy: '<b>[제왕과 리더십의 본능]</b> 자미성(紫微星)은 제왕(帝王)을 상징하는 별로, 선천적으로 존엄함과 고도의 리더십을 갖추고 있습니다. 명예와 체면을 중시하며, 주도적으로 상황을 지휘하고 수호할 때 고유의 능력이 극대화됩니다. 매사에 완벽을 기하는 포용력이 있으나, 자존심이 너무 강해 타인의 조언을 듣지 않는 완고함과 독단성을 경계해야 진정한 지도자로 거듭날 수 있습니다.', 
                fin: '<b>[명예가 곧 부를 부르는 구조]</b> 명예와 권위가 높아질수록 재물도 자연스럽게 따라오는 운입니다. 투기적 성향보다는 조직 내 지위 상승, 대기업, 정치/행정, 확실한 독립적인 경영자로 나설 때 큰 부를 축적합니다. 자산수호는 아주 보수적이며 대형 우량 부동산이나 브랜드 가치가 높은 확고한 자산 위주로 묻어두는 것이 가장 유리합니다.', 
                rel: '<b>[강한 책임감과 엄격한 기준]</b> 격식과 품위를 중시하여 쉽게 사람에게 곁을 내주지 않습니다. 그러나 한 번 바운더리 안에 들인 내 사람에게는 강력한 보호 본능과 책임감을 발휘합니다. 인간관계나 부부, 가족 사이에서도 본인이 통제권을 쥐려 하므로 억압적인 소통 통로가 되지 않도록 의식적인 배려가 필수입니다.', 
                well: '<b>[만성 피로와 위장/소화기 주의]</b> 완벽을 기하며 억누르는 스트레스 탓에 위, 비장 등 소화기 계통 약화가 잦습니다. 과도한 책임감에서 오는 신경성 소화불량, 위궤양을 조심해야 하며 명상과 가벼운 산책으로 뇌와 위장 스위치를 함께 꺼주는 릴렉스 휴식이 필수적입니다.', 
                time: '<b>[무대에서의 품위 있는 확장]</b> 밖으로 나갈수록, 권위 있는 환경에 노출될수록 든든한 귀인의 후원과 함께 명망이 자연스럽게 넓혀집니다. 가벼운 이동보다는 굵직한 도약 하에 움직여 환경을 완벽히 지배합니다.' 
            },
            '천기': { 
                psy: '<b>[비상한 두뇌와 기획의 마술사]</b> 지혜의 별 천기성(天機星)은 두뇌 회전이 대단히 빠르고 기획 및 천기 참모 능력이 탁월합니다. 호기심으로 다방면의 지식을 탐구하며 임기응변에 강합니다. 다만 두뇌 과부하로 인해 생각이 꼬리를 물어 신경이 쉽게 날카로워지고, 결단 직전에 지나치게 망설이는 기질을 경계해야 합니다.', 
                fin: '<b>[지적 자본과 아이디어의 환전]</b> 육체노동이나 단순 반복보다는 IT, 기획, 소프트웨어, 디자인, 자문, 학문, 전문 기술 등 두뇌를 십분 활용하는 플랫폼에서 완전 대체 불가능한 고부가가치를 창출합니다. 현금 흐름이 좋아도 즉시 새로운 배움이나 설비에 재투자하는 성향으로, 확실한 기술과 자격증 자체가 본인의 평생 재물입니다.', 
                rel: '<b>[지적 교류를 향한 갈망]</b> 감정적인 투정이나 의존보다는, 정보와 논리가 탁구공처럼 오가는 지적이고 쿨한 관계망을 선호합니다. 형제, 친구, 연인 관계에서도 지속적인 흥미와 새로운 인지적 자극을 줄 수 있는 사람과 오래가며 구속을 극도로 피하려는 성향이 큽니다.', 
                well: '<b>[뇌신경 과열 및 자율신경계 보호]</b> 뇌를 한시도 쉬지 않게 작동시키므로 불면증, 만성 두통, 신경 쇠약 등 자율신경계 피로에 절대 취약합니다. 더불어 간 기능 약화도 조심해야 하므로 수면 리듬의 확보와 전자기기를 멀리하는 완전한 오프라인 휴식이 생명선입니다.', 
                time: '<b>[역동적인 이동이 부르는 기회]</b> 본질 자체가 움직이는 동(動)의 성향입니다. 이직, 출장, 거주지 변동 등 환경의 지속적 변화와 잦은 이동 속에서 오히려 번뜩이는 직관과 돌파구를 찾아냅니다. 정체된 곳보다 역동적으로 무대를 바꿀 때 기막힌 운이 열립니다.' 
            },
            '태양': { 
                psy: '<b>[대중의 스포트라이트와 굽히지 않는 기상]</b> 명성과 발산의 별 태양성(太陽星)은 활력 에너지가 넘치고 공명정대하며 언제나 무리의 맨 앞에 서기를 즐깁니다. 솔직하고 뒤끝이 없으며 약자를 돕는 리더십이 강합니다. 단 과도하게 스케일을 벌이거나 자신의 이념을 남에게 서슴없이 강요하는 일, 체면에 얽매여 실속을 놓치는 것을 주의해야 합니다.', 
                fin: '<b>[명성이 돈을 지휘하는 거대한 판]</b> 음성적 이익보다 남들 앞에 드러나는 일(방송, 교육, 정치, 공공서비스, 로비)에서 대성공합니다. 이름값(명성)이 본인의 가장 큰 현금 창출 수단입니다. 단, 번만큼 시원하게 남에게 베풀거나 폼나는 소비를 하기 쉬우므로 강제적인 적금 통장이나 깐깐한 금전 파트너가 옆에 있어야 합니다.', 
                rel: '<b>[불타는 헌신과 소모 사이의 딜레마]</b> 주변에 퍼주는 따뜻한 에너지로 언제나 인맥이 넓고 따르는 아군이 많습니다. 정작 밖에서는 영웅임에도 가정이나 밀착된 배우자 파트너에게는 에너지를 다 써버려 피곤하거나 독단적인 모습을 보일 수 있기에 아주 세밀한 가족 배려가 최우선 과제입니다.', 
                well: '<b>[심혈관 열 제어와 안과 질환]</b> 에너지를 폭발적으로 밖으로 소진하므로 급격한 혈압 변화, 고열, 심장 및 심혈관계의 무리를 가장 조심해야 합니다. 욱하는 열기를 내리기 위한 맑은 물 섭취와 시력 저하, 안구 건조 등 안과(눈) 질환에도 일절 예방 수호가 필수입니다.', 
                time: '<b>[국경을 넘나드는 넓은 활동폭]</b> 평생 활동 반경이 거대하며, 야간 무대보다는 낮, 좁은 골목보다는 외국이나 낯선 기관과의 잦은 조인, 혹은 글로벌한 소셜 네트워크 대외 확장에서 매우 찬란한 성과와 결과를 거머쥡니다.' 
            },
            '무곡': { 
                psy: '<b>[돌진하는 장군이자 냉철한 승부사]</b> 단호한 결단력과 실행을 관장하는 행동 및 재물의 별입니다. 매사 직설적이고 강직해 한 번 시작한 일은 흔들림 없이 돌파하는 뚝심의 제왕입니다. 다만 융통성이 적고 차갑고 사무적인 태도로 타인과 타협을 못 해 빚어지는 고독감, 고립을 가장 강력히 경계해야 진정한 승리를 쥡니다.', 
                fin: '<b>[거친 무대를 지배하는 강력한 현금 창출력]</b> 재물을 모으려는 후각과 실천력이 최고조에 달합니다. 안정된 직장보다 금융, 군경, 대형 제조, 금속/기계류 비즈니스 등 거칠거나 터프한 영역에서 엄청난 추진력을 통해 거대한 자금을 굴립니다. 금전의 실속이 최고이나, 투기적 한탕주의가 발동하면 자본이 박살날 수 있으니 안정된 형태(금괴, 고정자산)로 부를 묶어두세요.', 
                rel: '<b>[서툰 애정 표현, 그러나 확고한 진심]</b> 말과 애정 표현이 무뚝뚝하고 뻣뻣해 연인이나 자녀에게 다정함을 전달하기 대단히 어렵습니다. 감정 위로보다는 현실적 문제 해결을 위주로 돕다 오해를 살 수 있으나, 한 번 동맹을 맺고 자기 사람이라고 여긴 자에겐 전적으로 듬직한 백스톱 기능을 완벽 수행합니다.', 
                well: '<b>[근골격계 및 맹렬한 외상 주의]</b> 움직임이 단호하고 거칠어 뼈, 관절, 치아 부위 손상이나 물리적인 외상(수술, 낙상) 등 신체의 기계적 마모 현상에 대단히 취약합니다. 폐와 호흡기 방어, 그리고 끈질긴 스트레칭 요법만이 장수의 비결입니다.', 
                time: '<b>[전리품을 위한 전투적 확장]</b> 무의미한 유람보다는 돈과 실익이라는 완벽한 결과물을 쟁취하기 위해서만 외부로 과장되게 행동 반경을 넓힙니다. 아주 치밀하고 현실적인 셈법과 비즈니스 마인드 하에 밖으로 나가 막대한 실질 이득을 뽑습니다.' 
            },
            '천동': { 
                psy: '<b>[평화와 부드러움을 가진 낙천가]</b> 순수하고 감성적이며 갈등 구도를 극도로 회피하려는 유순한 평화주의자입니다. 다정다감하고 공감력이 뛰어나나 심각한 스트레스 구간을 피하고 현실에 안주하려는 습성이 큽니다. 치열한 투지와 근성이 결여되기 매우 쉽다는 양날의 검을 소유했으므로 목표에 대한 집요함이 첨가되어야 합니다.', 
                fin: '<b>[아름답고 편안한 구역에서의 축재]</b> 살벌한 약육강식 경쟁 무대는 영혼의 독약과 같습니다. 복지, 교육, 요식업, 미용, 예술, 서비스, 상담 심리, 힐링 산업 등 부드럽고 릴렉스한 곳에서 타인에게 편안함을 제공하며 오히려 안정된 부를 자연스럽게 획득하는 타고난 먹을 복이 두텁습니다.', 
                rel: '<b>[포용적이나 맺고 끊음이 취약한 관계]</b> 천성적으로 타인을 보듬고 이해해 주어 대인관계 마찰이 거의 없고 큰 인복이 따릅니다. 반면 우유부단해 끊어내야 할 불량한 인연에 끌려다니거나, 연애에서 너무 감성적으로 의존하여 혼란에 빠지는 단호함 부족을 경계해야 합니다.', 
                well: '<b>[비만 대사증후군과 신장/비뇨 수호]</b> 가장 조심해야 할 것은 활동량 부족 및 폭식/야식의 편안함에 따른 급속한 체중 증가입니다. 기초 대사량이 낮아지기 쉬워 혈당/당뇨 등 대사성 질환과 신장, 방광 비뇨 기능 쇠퇴가 주요 적신호입니다. 주기적으로 땀을 빼는 헬스 루틴이 운기를 돌게 합니다.', 
                time: '<b>[순풍에 돛을 다는 자연스러운 항해]</b> 무지막지한 강제 개척보다는 현재 주어진 무대의 환경 흐름에 자연스럽게 동화하여 편안한 외부 네트워크를 점진적으로 넓힙니다. 낯선 이국 등 환경에서도 절대 적의를 사지 않고 빠르게 인프라에 안착하는 큰 복덕의 소유자입니다.' 
            },
            '염정': { 
                psy: '<b>[치밀한 제어력과 타오르는 매력의 마스터]</b> 눈치가 극도로 빠르고 상황 판세를 완벽히 장악하는 예술적 감각과 치밀한 고도 통제력을 뽐냅니다. 겉은 화려하고 언변이 뛰어나나, 내면의 자존심 상처나 의심에 극도로 예민하며 질투심이 많습니다. 감정 기복과 타인 통제 욕구를 다스려야 폭발적인 재능이 빛납니다.', 
                fin: '<b>[차별화된 타고난 감각을 재물로 치환]</b> 평범한 월급쟁이나 단조로운 업무와는 절대 섞일 수 없습니다. 특수 기법, 외교 마케팅, 연예계, 엔터테인먼트, 예술, 프리랜서 전문직 등 남들이 흉내 못 내는 디테일로 거대한 부가를 낳습니다. 현금의 볼라틸리티가 엄청 크니, 안전 자산이나 믿을 만한 수호자에게 돈을 맡겨 파산을 피하세요.', 
                rel: '<b>[치명적 흡인력과 얽히는 도화(桃花)]</b> 강렬한 흡인력을 지녀 타인의 시선과 이성 라인이 화려하게 얽히고 인기가 폭발합니다. 그러나 시기와 질투, 치정, 감정 소모전과 구설이 평생 따라붙기 너무도 쉬우니 관계에 있어 냉철하고 철저한 선긋기와 깨끗한 비밀 유지를 생명처럼 여겨야 합니다.', 
                well: '<b>[혈류 교란 및 민감한 면역/알레르기]</b> 늘 극도의 예민 통제 스위치를 켜두기에 피가 탁해지는 고혈압 및 심장계 교란을 주의해야 합니다. 스트레스성으로 다발하는 알 수 없는 피부 트러블, 호르몬성 염증을 조기에 차단하고 혈관을 맑게 하는 식이요법이 건강을 살립니다.', 
                time: '<b>[화려하고 역동적인 외부 무대 장악력]</b> 낯선 외부 변화에 대단히 능동적이고 환경에서 기가 죽지 않습니다. 무대에 나가면 빠르게 사람의 마음을 조종하고 무리나 조직의 핵심으로 단박에 떠오르는 묘한 장악력이 오히려 이동의 시기에 크게 작동합니다.' 
            },
            '천부': { 
                psy: '<b>[듬직한 포용력과 요새를 구축하는 수호자]</b> 만물을 담는 넉넉한 창고를 가져 마음이 너그럽고 침착합니다. 거문 파동가 큰 혁신보다 철저히 검증된 안정성을 중시하며 상황을 보수적으로 끌어안는 보스 기질입니다. 그러나 새로운 쇄신이나 변화를 기피하는 극단의 타협적 안일함이나 꼰대성을 반드시 제거해야 시대에 뒤떨어지지 않습니다.', 
                fin: '<b>[자산 지키기의 끝판왕이자 부동의 재테크 강자]</b> 공격적인 개창이 아니라 이미 들어온 거대한 재물을 복리처럼 부풀리고 지켜내는 방어력이 우주 최강입니다. 위험 투자보다 확고한 부동산 임대, 우량 채권, 자산 수호 기업, 회계, 지주사 파트에서 거대한 자본을 철벽처럼 보호하며 알부자가 됩니다.', 
                rel: '<b>[무리의 완벽한 안식처이자 든든한 기둥]</b> 신용과 무던함을 바탕으로 주변의 피난처 역할을 합니다. 일가친척이나 주변인을 아주 든든히 보듬습니다. 단 본인의 틀만 강조하다 젊거나 진취적인 시도를 하는 자녀/배우자와는 대화 장벽이 생길 수 있으니 열린 포용력을 의식적으로 키워야 합니다.', 
                well: '<b>[비위장 과부하와 체중 과잉의 철저한 방어]</b> 토(土)의 기운을 다분히 머금고 있어 비장, 위장 및 복부 소화계통이 가장 취약합니다. 잘 먹고 잘 자며 스트레스를 인내하다 보니 내장 비만, 당뇨 등 성인병 질환을 달고 살 수 있습니다. 소식과 땀 흘리는 등산 등 움직이는 것이 확실한 돌파구입니다.', 
                time: '<b>[자신만의 굳건한 베이스캠프 확장]</b> 스스로 급변하는 변동이나 유랑을 크게 선호하지 않습니다. 대외 환경 변화 시에도 철저한 정보 계산과 안전을 마친 뒤, 본인에게 정렬된 성궁 진법이 마련된 채로만 턴테이블을 옮기는 고도의 보수적 안정 이동 스텝을 밟습니다.' 
            },
            '태음': { 
                psy: '<b>[달빛 아래 완벽주의적 낭만과 예민함]</b> 깊숙이 사색하며 상황의 핵심을 아름답게 꿰뚫는 문학적 심미안을 타고났습니다. 성격이 조용하고 온건하나, 매사 결벽주의적 완벽성을 요구해 피로도가 심합니다. 감성이 너무 여려 타인의 지적에 상처를 오랫동안 품으며, 결단력이 떨어지는 우유부단함도 큰 핸디캡입니다.', 
                fin: '<b>[은닉성의 땅 기운을 통한 조용한 축재]</b> 파도치는 변동 자산보다는 땅, 토지, 부동산 개발 투자, 인테리어 등 토(土)와 관련된 자본재에서 우직하게 재물을 불립니다. 소문 없이 조용히 부를 모으는 은밀한 알부자의 기운으로 미용, 피부, 예술, 뷰티 산업에서 특유의 섬세함으로 막대한 부를 이룹니다.', 
                rel: '<b>[은밀하고 깊어지는 프라이빗한 교류 지향]</b> 시끄러운 다수의 사교보다는 극소수와의 끈끈한 감정적 영혼의 교감을 절대적으로 선호합니다. 지고지순하고 로맨틱하나, 정작 자신이 너무 높은 완벽의 잣대로 상대를 재다가 실망하면 마음의 문을 미련 없이 단절해버리는 차가움을 경계하세요.', 
                well: '<b>[우울감, 불면증 및 비뇨/호르몬 약화 조율]</b> 정신적, 정서적 진폭의 안정이 육체 건강의 명줄입니다. 잔잔한 스트레스 노출 시 신경성 불면, 만성 위장장애 및 신장/방광 생식계의 진액 부족 질환이 번집니다. 따뜻한 차, 햇빛을 듬뿍 받는 일상생활이 정신적 독소를 완벽히 해독합니다.', 
                time: '<b>[야간과 타향에서의 정서적 힐링과 비상]</b> 달의 속성이므로 익숙한 고향보다는 아주 먼 타지, 완전히 낯선 외국 공간이나 주로 밤 시간에 활약하는 업무 등 이색적 변방으로 떠났을 때 심리적 평화를 얻고 놀라운 예술적, 상업적 재능을 활짝 펴냅니다.' 
            },
            '탐랑': { 
                psy: '<b>[끝없는 호기심과 다재다능의 유쾌한 탐험가]</b> 세상과 지식에 대한 호기심이 폭발적이며, 누구와도 금세 섞이는 친화력과 재치있는 쇼맨십의 대가입니다. 임기응변이 뛰어나 위기 돌파에 능하나, 끝까지 완수해 내는 인내심이나 진중함은 크게 빈약합니다. 육체적, 물질적 쾌락에 깊게 빠져드는 위험한 매력을 가졌습니다.', 
                fin: '<b>[접객과 무대가 부르는 거대 현금 파이프라인]</b> 규격화되고 닫힌 사무실은 무덤입니다. 마케팅, 뷰티, 이벤트 기획, 화려한 예체능 및 파티, 요식업 현장 바닥에서 본인의 끼를 작렬시키며 숨 가쁜 속도로 막대한 현금을 모읍니다. 대신 유흥과 사치로 자금이 순식간에 녹아내릴 수 있으니 재산권은 반드시 묶어두세요.', 
                rel: '<b>[네트워크의 핵이자 치명적인 스캔들 진원지]</b> 모임에서 절대 빼놓을 수 없는 분위기 메이커. 허나 수많은 스쳐 가는 인연과 치명적 이성이 꼬이기 십상이어 치정, 애정 붕괴 스캔들의 타깃이 되기 제일 쉽습니다. 얕은 인맥을 무자비하게 도려내고 깊고 정제된 한 사람과의 부부 인연 다지기가 생명입니다.', 
                well: '<b>[무리한 간(肝) 과부하 및 독소 배출 경계]</b> 쉴 새 없이 움직이는 활동 반경과 유흥, 피로 누적 등으로 간장과 신장의 기본 해독 필터가 완전히 망가지는 것을 제1순위로 우려해야 합니다. 독소와 음주를 줄이고 철저히 간을 리셋하는 디톡스 수면 휴가를 완벽히 지키십시오.', 
                time: '<b>[자유롭게 기동하며 무수한 판을 여는 행보]</b> 천성의 방랑자 기질이 커 한곳에 안주를 못하고 다이내믹하게 국경과 지역을 넘나듭니다. 전혀 낯선 타향 무대에서도 단 며칠 만에 거물 조력자와 윈윈 찬스를 끌어내는 어마어마하고 기막힌 적응력과 사교력을 보유하고 있습니다.' 
            },
            '거문': { 
                psy: '<b>[통찰의 암성(暗星)이자 심오한 논리 전문가]</b> 현상의 포장만 보지 않고 그 이면의 허점과 팩트를 광적으로 꿰뚫는 분석과 논리력의 최고 권위자입니다. 탐구심이 강해 한 분야 특출난 전문가로 우뚝 서나, 매사 타인을 의심하여 차가운 말로 주변에 상처를 내고 구설을 만드는 약점이 큽니다.', 
                fin: '<b>[예리한 언어와 지식으로 쌓아 올리는 막대한 부]</b> 변호, 교육, 컨설팅 자문, 비평, 중개, 지적 재산, 분석 등 날카로운 지식과 혀(말)를 정면으로 활용해 판관 역할을 할 때 금전운이 거대하게 터집니다. 논쟁과 법적 관재 마찰을 달고 다니기에 지인과의 동업이나 금전 보증은 평생의 절대 금기입니다.', 
                rel: '<b>[차가운 논리와 뜨거운 충직함의 반전 스펙트럼]</b> 타인의 결점을 지적하길 좋아해 다툼과 고립을 자초하기 쉽습니다. 그러나 거문의 극심한 의심 필터를 뚫고 신뢰를 허가받은 사람에게는 의리와 헌신의 아이콘이 됩니다. 무조건 남의 의견에 맞장구쳐주는 훈련만이 인복 상승의 핵심입니다.', 
                well: '<b>[호흡기 방어막 붕괴와 예민성 위장 트러블]</b> 신경이 무척 예리해 인후염, 기관지, 구강 등 목과 입 관련 질환을 평생 조심해야 합니다. 밖으로 터트리지 못한 회의적 스트레스가 고스란히 위장계통에 직격타를 날려 신경성 소화불량을 유발하니 마음을 텅 비우는 명상을 루틴화하십시오.', 
                time: '<b>[적막한 타향과 이방인 속에서의 대기만성]</b> 편안하고 익숙한 자기 구역보다 소외된 외곽 무대, 언어조차 낯선 해외 무대 등 가장 이질적인 환경 속에서 고난을 뚫고 번뜩이는 본인만의 실력을 여지없이 증명해 내며 거대한 명성을 쟁취합니다.' 
            },
            '천상': { 
                psy: '<b>[원칙과 이타성을 겸비한 세련된 조율사]</b> 무리의 공정함과 체면을 가장 소중하게 생각하는 온건한 의협심의 소유자입니다. 주변 환경이 더러워지는 것을 혐오하는 단정함이 있습니다. 독자적인 돌격형 대장보다는 뛰어난 천기적 서포터, 수호 비서실장의 책무를 맡을 때 완벽함과 안정감이 광채를 냅니다.', 
                fin: '<b>[조직과 신뢰를 바탕으로 한 고정적인 튼튼한 재무]</b> 무리한 도박형 상행위를 거부하고, 공공기관, 수호직, 법정 부서, 고급 서비스 위탁 대행 업무에서 조직과 사회의 탄탄한 보장 아래 흔들림 없는 두터운 부를 구축합니다. 체면과 감각을 중시해 패션/뷰티 관련 사업과도 궁합이 찰떡이며 식록이 늘 풍부합니다.', 
                rel: '<b>[도 넘은 오지랖과 넓은 무리의 대대적 호응]</b> 타인의 딱한 사정을 나 몰라라 하지 못하는 선한 성정으로, 신뢰감과 인기를 독차지합니다. 하지만 끊임없이 밀려오는 타인의 부탁이나 대리 서명에 제동을 걸지 못해 심각한 사기를 당할 수 있으므로 극도로 이성적이고 단호한 거절 스킬을 필수로 심어두어야 합니다.', 
                well: '<b>[체면이 무너지는 피부 및 내분비계 질환 경계]</b> 외적인 아름다움을 손상시키는 피부 점막 질환, 호르몬성 염증, 알레르기 반응에 치명적인 멘탈 타격을 입습니다. 이는 극도의 긴장에 대한 신체 보복이므로 피부와 호르몬 밸런스를 되돌리는 양질의 휴식/수분 섭취 요법을 꼭 챙기세요.', 
                time: '<b>[공적명분과 거대 단체 이익에 편승하는 안전 이동]</b> 1차원적인 이기적 목적보다는 언제나 큰 조직, 단체를 위한 공무적 파견이나 명분을 이끌고 듬직하게 외부로 진출합니다. 깔끔한 외모와 신용을 무기로 낯선 무대 곳곳에서 완벽한 귀인들과 협력 성궁 진법 구축을 이뤄냅니다.' 
            },
            '천량': { 
                psy: '<b>[위기를 해결하고 원칙을 준수하는 포용적 스승]</b> 젊은 나이에도 고도의 노련함과 정신적 포용력이 뿜어져 나와 주변 사람들의 문제를 솔선해서 해결합니다. 큰 재앙도 빗겨내는 구원의 기운이 있습니다. 그러나 융통성 제로의 고지식한 선비 성향과 윗세대 꼰대 마인드로 젊은층이나 자유분방한 세대와 불통할 여지가 매우 높습니다.', 
                fin: '<b>[활인(活人)을 통해 역설적으로 몰려드는 금전운]</b> 부당한 요행이나 투기가 섞이면 그 돈은 완벽히 증발합니다. 대신 생명을 다루는 의학 보건, 심리치료, 종교 한의계, 감찰/사정 기관, 복지 보험 등 타인의 고난을 해결하고 질서를 바로잡는 업무를 하면 그 평판과 명예가 엄청난 권력과 재물로 폭발적으로 뒤따라옵니다.', 
                rel: '<b>[위엄 있는 스승의 기둥 역할과 극강의 윗사람 인복]</b> 다분히 어른스럽고 믿음직한 태도로 선배나 스승 격의 멘토, 윗선 상사들에게 전격적인 후원과 발탁을 이끌어내는 인복 구조입니다. 반대로 아랫사람이나 연하에게는 설교와 훈수를 대폭 줄이고 웃는 얼굴의 경청을 연습하면 최고의 지도자가 됩니다.', 
                well: '<b>[천우신조의 생존 강운과 소화기 배터리의 쇠퇴]</b> 죽을 병이나 불행을 피하는 기이한 강운이 붙어, 병마가 있어도 극적으로 회생합니다. 그러나 코어 기둥인 비위/소화 복부의 신체 기본 에너지가 쉽게 일찍 늙어 노후되는 현상이 있으므로 늘 몸을 덥히며 기력 강화를 유지하는 보양 습관을 탑재하십시오.', 
                time: '<b>[재난 구호와 감찰을 향한 당당한 구원자적 궤도]</b> 단순 유흥을 위한 여행보단 문제 해결, 감찰 임무, 구호, 파견을 위해 기강을 잡으러 각지로 묵직하게 떠나는 외부 이동이 특선입니다. 타향과 객지의 고생 끝에 결국 평판의 탑을 쌓으며 나이가 들수록 노년 무대의 명망이 더욱 성대해집니다.' 
            },
            '칠살': { 
                psy: '<b>[위험을 즐기고 타협을 부수어 버리는 무적의 맹장]</b> 철두철미한 살기와 독립성. 한 번 목표를 정하면 시선이나 고독을 감수하고 돌진하는 엄청난 폭파 돌파력의 소유자. 한계를 뚫어 버리나, 반대로 타인의 실수를 무자비하게 단죄하는 매서운 흑백 논리 아집을 제어하지 못하면 후반부에 치명적 고립과 적군에 둘러싸이게 됩니다.', 
                fin: '<b>[맹렬한 속전속결, 화염 속의 역동적 변동 재력 베팅]</b> 조용하고 편안한 서류 행정은 영혼의 감옥입니다. 엄청난 위험 거문 파동의 무대 특수 군경찰 공무, 벤처 사업의 최전선, 거대 공학, 중장비 등 타인이 기피하는 살벌한 무대에서 단번에 돌진해 거부를 창출합니다. 막대한 상승 하락의 롤러코스터를 피하기 위해 수입금을 절대 안 빠지는 부동산 등 안전자산에 배치해야 후환이 없습니다.', 
                rel: '<b>[단칼에 베어버리는 소통, 그러나 진정한 맹우 보호]</b> 가식이나 아부를 제일 척결하여 마찰계수가 역대 최강 폭탄급입니다. 연인, 친척에게 잔인할 정도의 매서운 팩트 지적질로 심장을 도려냅니다. 그러나 한번 피를 나눈 내 사람, 자기가 거둔 최측근 파트너에게는 목숨마저 방패막이 되어주는 극한의 뜨거운 의리를 지켰습니다.', 
                well: '<b>[금속 기계와 화염 속 충돌, 뼈 근골격 붕괴 주의]</b> 날카로운 쇳덩이와 성급한 불의 인자가 교차하여 중장비 충돌, 자동차 타박상, 수술 및 골절 사고 위험이 인생 전반에 항상 근접 대기 중입니다. 전투적인 호흡의 폐활량 성궁 진법이 조기 고갈되니 요가와 참선 등 릴렉스 체조에 하루 최소 30분 무조건 투자하십시오.', 
                time: '<b>[판 전체를 강제로 갈아엎는 파격적인 탈바꿈 이동 스텝]</b> 이동이나 영역 전환 스텝 자체가 스멀스멀 이뤄지는 법이 없으며, 단박에 지형지물과 환경 모두를 폭파하는 식의 초강도 이직, 이주 이동력을 보여주어 아무것도 없는 척박한 무대에 혈혈단신으로 꽂혀 깃발을 꼽아버립니다.' 
            },
            '파군': { 
                psy: '<b>[완전한 파괴 후 모든 걸 백지 코딩하는 미친 선봉장]</b> 고착화된 부패 규제나 답답한 과거 질서를 용납하지 못하고 뼛속까지 박살 낸 뒤 새로운 그림을 처음부터 그려 넣는 파괴적 창조성의 1인자. 그러나 브레이크 장치가 심히 망가져 있어 분노 조절 실패와 일 벌려 놓고 수습 못 하는 최악의 기복 거문 파동, 극단주의를 봉인해야 사회적 거물이 됩니다.', 
                fin: '<b>[극단 거문 파동만 골라 들이파는 틈새 자본의 블랙홀]</b> 따박따박 나오는 봉급과 안전지향의 룰은 파군의 능력을 절멸시킵니다. 완전한 파격의 투기존 창업, 재건축 철거 토목업, 특수 예술과 같은 혼란과 무주공산에서 오히려 폭주하며 돈을 흡입합니다. 버는 수익과 깨져나가는 지출 소비율 차이가 감당 불가 수준이므로 씀씀이 장치의 타인 위임 봉인이 인생 절대 원칙입니다.', 
                rel: '<b>[감정적 극한의 롤러코스터 및 파격적 관계 붕괴의 늪]</b> 사람과의 필터가 깨져 있어 맹목적으로 확 사랑에 뛰어들었다가 가차 없이 미워하고 증오하는 감정 증폭 폭주가 대단합니다. 연애나 사업 합작도 자신의 열정을 몽땅 들이박아 상대가 두려움에 도주할 극단이 있으니 무조건 브레이크 요원 역할을 해줄 돌하르방 같은 무던한 연인이 인생 동반자에 필수 영순위 조건입니다.', 
                well: '<b>[내분비 지진과 수분 생식기 성궁 진법 최악 방전]</b> 생명력인 수분의 진액을 한순간에 활활 태워서 소모시킵니다. 따라서 호르몬 내분비와 방광, 요로/자궁 생식기 기반 체계 연료 탱크가 폭발적으로 방전, 마비되는 치명상을 아주 쉽게 맞습니다. 원천 봉쇄적 배터리 충전의 완벽 고립과 호르몬 휴양 요법이 매 시즌 필요합니다.', 
                time: '<b>[주거/직무의 무자비한 융단폭격식 궤도 이탈]</b> 운과 대외 활동의 기복이, 인생 무대를 그야말로 바다에서 산으로 업어버리듯 파도처럼 한 번에 휘몰아칩니다. 본인 스스로도 지루한 정맥을 깨려고 자의적으로 완벽히 이질적 해외 무대나 미지의 최신 공법 영역으로 무자비한 스케일의 도약을 선택하며 그 거친 바람 위에서 오히려 안식을 느낍니다.' 
            }
        };

        var emptyDesc = {
            psy: '<b>[투명하고 무한히 유연한 자아의 도화지]</b> 명궁에 주관하는 별이 없는 <b>공궁(空宮)</b>인 상태입니다. 자신만의 굳어있는 선입견이나 장벽이 없어 무한한 흡수력을 지녔습니다. 타인의 색깔과 맞은편 궁(대궁)의 에너지 흐름을 순도 100% 스펀지처럼 받아들이며 카멜레온처럼 변환하는 대단한 처세 능력과 조화로움을 살아가는 평화 유지의 인재입니다.',
            fin: '<b>[상황 정렬의 융합 자산 포트폴리오 창조자]</b> 오직 하나의 고정된 수익 채널에 머물지 않습니다. 파도치는 세상 트렌드의 중심, 융합 신산업이나 가장 자금이 몰리는 타이밍을 스캔하여, 자산 구도와 파이프라인의 색깔을 새롭게 세팅해 버리는 변환 축재 능력을 발휘합니다.',
            rel: '<b>[호불호를 녹여버린 우주 최강 포용의 사교망]</b> 자신만의 편협하고 고집스러운 감정적 기준이 부드럽게 지워져 있습니다. 때문에 상대하기 껄끄러운 적군이나 극단의 기운을 뿜는 타인을 만날지라도 상황에 맞춰 조화롭게 녹여냅니다.',
            well: '<b>[타인의 에너지를 직통으로 맞는 고감도 흡수체질]</b> 신체 체질 자체가 탁한 공기나 흉기 가득한 스트레스 분위기 등 주변 에너지를 필터 없이 빨아들이는 약점이 생깁니다. 따라서 가장 맑은 자연 환경, 좋은 사람들 속에서의 생활이 건강 백신입니다.',
            time: '<b>[제약의 선을 아예 증발시키는 무한의 무대 확장]</b> 이동과 이직의 모든 제약이 처음부터 의미가 없는 열려있는 무한 빈 공간입니다. 어디론가 이주해도 자신이 소속될 문화에 완벽히 적응 진화하고 전혀 새로운 스펙트럼의 색채를 찬란하게 구가합니다.'
        };

        var theme = 'psy';
        var themeTitle = ' [타고난 심리/성향] 코어 엔진 해석';
        
        if (['부처궁','형제궁','노복궁','자녀궁','부모궁'].includes(pName)) {
            theme = 'rel';
            themeTitle = ' [관계 네트워크] 소셜 및 인연 해석';
        } else if (['관록궁','재백궁','전택궁'].includes(pName)) {
            theme = 'fin';
            themeTitle = ' [진로와 경제] 재무 및 직업 해석';
        } else if (['천이궁'].includes(pName)) {
            theme = 'time';
            themeTitle = ' [인생의 흐름] 대외 무대 및 변화 해석';
        } else if (['질액궁','복덕궁'].includes(pName)) {
            theme = 'well';
            themeTitle = ' [건강] 심신 안정도 해석';
        }

  var mainStMeta = extractMainMeta(getPStars(pName));
  var mainSt = mainStMeta.map(function(m){ return m.name; });
        var badSt = extractBad(getPStars(pName));
        var auxSt = extractAux(getPStars(pName));

        var dTitle = zwDisplayPalaceName(pName);
        if (ZHI_LIST[idx] === pd.meng && pName !== '명궁') dTitle = '명궁: ' + dTitle;
        if (ZHI_LIST[idx] === pd.shen) dTitle = dTitle + ' (신궁)';

        var uniqueList = function(list) {
          var seen = Object.create(null);
          var out = [];
          (list || []).forEach(function(v) {
            if (!v) return;
            var key = String(v);
            if (seen[key]) return;
            seen[key] = 1;
            out.push(key);
          });
          return out;
        };
        var mainCleanMetaRaw = extractMainMeta(stars);
        var mainCleanMeta = [];
        var mainSeen = Object.create(null);
        mainCleanMetaRaw.forEach(function(m){
          var key = m.name + '|' + (m.isBorrowed ? '1' : '0');
          if(mainSeen[key]) return;
          mainSeen[key] = 1;
          mainCleanMeta.push(m);
        });
        var mainClean = mainCleanMeta.map(function(m){ return m.name; });
        var auxClean = uniqueList(extractAux(stars));
        var badClean = uniqueList(extractBad(stars));
        var borrowedMain = mainCleanMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var stHtml = mainCleanMeta.length
          ? '<span style="color:#FFD700;font-weight:900;">' + mainCleanMeta.map(function(m){ return fmtStrength(m.name, ZHI_LIST[idx], m.isBorrowed) + (m.isBorrowed ? ' <span style="color:#facc15;font-size:0.74rem">(차성)</span>' : ''); }).join(' · ') + '</span>'
          : '<span style="color:#888;font-style:italic">공궁(空宮)</span>';
        var auxJoin = auxClean.length ? fmtListWithStrength(auxClean, ZHI_LIST[idx], false) : '없음';
        var badJoin = badClean.length ? fmtListWithStrength(badClean, ZHI_LIST[idx], false) : '없음';
        var palaceBrief = ZW_GUNG_BRIEF[pName] || ZW_GUNG_DEF[pName] || '해당 궁의 흐름을 확인하세요.';

        var sec1 = '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">' +
          '<h2 style="color: #D8B4FE; font-size: 1.2rem; margin-top: 0;">🗺️ [당신을 비추는 별의 지도]</h2>' +
          '<ul style="line-height: 1.85; margin: 0; padding-left: 20px; font-size:0.9rem;">' +
            '<li><b>조회 궁위:</b> ' + dTitle + '</li>' +
            '<li><b>궁위 해석 초점:</b> ' + palaceBrief + '</li>' +
            '<li><b>주도 주성:</b> ' + stHtml + '</li>' +
            '<li><b>차성 적용 여부:</b> ' + (borrowedMain.length ? ('적용 ('+borrowedMain.join(' · ')+')') : '미적용 (원성 중심)') + '</li>' +
            '<li><b>길성/흉성 분포:</b> ' + auxJoin + ' / ' + badJoin + '</li>' +
          '</ul>' +
        '</div>';

        var sec2 = '<div style="margin-bottom:20px;background:#0f0f1a;border:1px solid rgba(139,92,246,0.35);border-radius:10px;overflow:hidden">'
          + '<div style="padding:10px 14px;background:linear-gradient(135deg,rgba(88,28,220,0.45),rgba(30,12,60,0.7))">'
          + '<span style="color:#c084fc;font-weight:900;font-size:0.95rem">📊 자미두수 12궁 심층 분석 요약</span>'
          + '</div>'
          + buildZwSummaryTableHtml(pd)
          + '</div>';

        var curDaHan = (pd.daHan && pd.daHan[idx]) ? pd.daHan[idx] : "알 수 없음";
        var curSihua = [];
        if (pd.sihuaData) {
          for (var shName in pd.sihuaData) {
            var shObj = pd.sihuaData[shName];
            if (shObj && shObj.palaceIdx === idx) curSihua.push({ star: shName, type: shObj.type });
          }
        }
        var hasHwagi = curSihua.some(function(s){ return s.type === '화기'; });
        var hasHwarok = curSihua.some(function(s){ return s.type === '화록'; });
        var hasHwakwon = curSihua.some(function(s){ return s.type === '화권'; });
        var hasHwakwa = curSihua.some(function(s){ return s.type === '화과'; });

        var goodAuxStars = ['천괴','천월','좌보','우필','문창','문곡','녹존','천마'];
        var curGoodAux = auxSt.filter(function(s){ return goodAuxStars.indexOf(s) >= 0; });

        var coreLaw = '';
        if (mainSt.length > 0) {
          var coreMain = mainSt.slice(0, 2).join(' · ');
          var coreKw = ZW_STAR_KW[mainSt[0]] || mainSt[0];
          coreLaw = '<b>주성법:</b> ' + coreMain + ' 중심 대한으로, <b>' + coreKw + '</b> 테마가 사건의 중심축이 됩니다.';
          if (mainStMeta.some(function(m){ return m.isBorrowed; })) {
            coreLaw += ' <span style="color:#facc15">(차성 차용궁: ◎(묘)→○(왕), ○(왕)→▲(평), ▲(평)→△(리))</span>';
          }
        } else {
          coreLaw = '<b>공궁법:</b> 공궁 대한은 대궁/환경 변수의 영향이 크므로, 고정 천기보다 상황 대응력이 성패를 가릅니다.';
        }

        var sihuaText = curSihua.length
          ? '<b>사화법:</b> ' + curSihua.map(function(s){ return s.star + ' ' + s.type; }).join(' · ')
          : '<b>사화법:</b> 이 궁에는 강한 사화 직접 작용이 약해 기본기와 루틴이 성과를 좌우합니다.';

        var goodPoint = '';
        if (hasHwarok || hasHwakwa || curGoodAux.length > 0) {
          goodPoint = '귀인·명예·성과 회수 흐름이 살아납니다. 문서/평판/추천 네트워크를 활용하면 실익 전환이 빠릅니다.';
        } else if (hasHwakwon || mainSt.length > 0) {
          goodPoint = '주도권을 잡을수록 운이 열립니다. 우선순위를 명확히 두고 한 축을 깊게 밀면 결과가 납니다.';
        } else {
          goodPoint = '변화 적응력 자체가 장점입니다. 유연한 선택과 타이밍 조절이 복을 키웁니다.';
        }

        var cautionPoint = '';
        if (hasHwagi || badSt.length > 0) {
          cautionPoint = '화기/흉성 영향으로 말실수·계약 누락·과속 결정에서 손실이 나기 쉽습니다. 감정적 결단과 무리한 확장은 금물입니다.';
        } else {
          cautionPoint = '큰 흉의 압박은 약하지만, 방심으로 인한 루틴 붕괴가 기회를 놓치게 만듭니다. 꾸준함을 유지하세요.';
        }

        var actionTip = '';
        if (hasHwagi) {
          actionTip = '중요 계약은 2중 검토, 금전은 분할 집행, 인간관계는 "기록+확인" 원칙으로 운 손실을 줄이세요.';
        } else if (hasHwarok || hasHwakwon || hasHwakwa) {
          actionTip = '이번 대한의 키워드(재물·권한·명예)를 한 가지 목표로 수렴해 실행하면 체감 성과가 크게 납니다.';
        } else {
          actionTip = '월 단위 체크포인트를 정해 작은 성취를 누적하면 후반 운세가 안정적으로 상승합니다.';
        }

        // Persona는 클릭 궁이 아닌 명반 전체(12궁) 집계로 고정 산출한다.
        var brightnessWeight = function(level){
          var map = { myo: 5.0, wang: 4.2, ri: 3.3, han: 2.4, heum: 1.5 };
          return map[level] || 3.0;
        };
        var personaStarScore = Object.create(null);
        var personaAuxPool = [];
        var personaBadPool = [];
        var personaBorrowedPool = [];
        var personaSihuaCnt = { '화록':0, '화권':0, '화과':0, '화기':0 };

        for (var pIdx=0; pIdx<12; pIdx++) {
          var pZhi = ZHI_LIST[pIdx];
          var pNameAll = pd.palacesByIndex[pIdx] || '';
          var pStars = pd.stars[pIdx] || {main:[],aux:[],bad:[],borrowedMain:[]};
          var pMainMeta = extractMainMeta(pStars);

          var pWeight = 1.0;
          if (pNameAll === '명궁') pWeight += 1.8;
          if (pNameAll === '복덕궁') pWeight += 1.0;
          if (pNameAll === '천이궁') pWeight += 0.8;
          if (pNameAll === '관록궁') pWeight += 0.6;
          if (pZhi === pd.meng) pWeight += 1.2;
          if (pZhi === pd.shen) pWeight += 0.8;

          pMainMeta.forEach(function(m){
            var lv = zwComputeStarStrength(m.name, pZhi, !!m.isBorrowed);
            var stClass = zwStrengthToClass(lv);
            var score = pWeight * brightnessWeight(stClass) * (m.isBorrowed ? 0.9 : 1.0);
            personaStarScore[m.name] = (personaStarScore[m.name] || 0) + score;
            if (m.isBorrowed) personaBorrowedPool.push(m.name);
          });

          personaAuxPool = personaAuxPool.concat(extractAux(pStars));
          personaBadPool = personaBadPool.concat(extractBad(pStars));
        }

        if (pd.sihuaData) {
          for (var siName in pd.sihuaData) {
            var siType = pd.sihuaData[siName] && pd.sihuaData[siName].type;
            if (personaSihuaCnt.hasOwnProperty(siType)) personaSihuaCnt[siType] += 1;
          }
        }

        var sortedPersonaStars = Object.keys(personaStarScore).sort(function(a,b){ return personaStarScore[b]-personaStarScore[a]; });
        var leadMain = sortedPersonaStars[0] || '';
        var subMain = sortedPersonaStars[1] || '';
        var leadKeyword = leadMain ? (ZW_STAR_KW[leadMain] || (leadMain + ' 중심 성향')) : '공궁 기반 유연 적응 성향';
        var majorStarsLabel = sortedPersonaStars.length ? sortedPersonaStars.slice(0,3).join(' · ') : '공궁(空宮)';

        var auxUnique = uniqueList(personaAuxPool);
        var badUnique = uniqueList(personaBadPool);
        var borrowedUnique = uniqueList(personaBorrowedPool);
        var auxLabel = auxUnique.length ? auxUnique.join(' · ') : '보조 길성 약함';
        var badLabel = badUnique.length ? badUnique.join(' · ') : '흉성 압력 약함';

        var relationMood = badUnique.length >= 3
          ? '선별적 신뢰와 경계 중심의 관계 운행'
          : (auxUnique.length >= 3 ? '협력과 상호성 중심의 관계 운행' : '상황 적응형 관계 운행');

        var emotionMode = personaSihuaCnt['화권'] > Math.max(personaSihuaCnt['화과'], personaSihuaCnt['화기'])
          ? '결정형(핵심 이슈를 빠르게 정리)'
          : (personaSihuaCnt['화과'] >= Math.max(personaSihuaCnt['화권'], personaSihuaCnt['화기'])
            ? '품질형(정돈된 표현과 체면 수호)'
            : (personaSihuaCnt['화기'] > 0 ? '억제형(감정 누적 후 반응 가능)' : '균형형(맥락에 맞춘 표현)'));

        var stressMode = (personaSihuaCnt['화기'] > 0 || badUnique.length >= 3)
          ? '과부하 시 통제 욕구가 상승하므로, 휴식·속도 조절·의사결정 지연이 필요'
          : '스트레스 상황에서도 회복 탄성이 비교적 안정적이며 루틴 유지에 강점';

        var hiddenTalent = auxUnique.length
          ? ('보조성 '+auxLabel+'의 조합으로, 보이지 않는 조율력·정보정리력·타이밍 포착력이 강하게 작동')
          : '외부 보조성보다 자기 주도 역량을 직접 강화할수록 잠재력이 빠르게 현실화';

        var ziweiElementMap = {
          '자미':'earth','천기':'wood','태양':'fire','무곡':'metal','천동':'water','염정':'fire','천부':'earth','태음':'water',
          '탐랑':'wood','거문':'water','천상':'metal','천량':'earth','칠살':'metal','파군':'water'
        };
        var ziweiAuxElementMap = {
          '문창':'wood','문곡':'water','좌보':'earth','우필':'earth','녹존':'metal','천마':'fire',
          '화성':'fire','영성':'fire','타라':'metal','경양':'metal','지공':'water','지겁':'water'
        };
        var rawElementScores = { wood: 6, fire: 6, earth: 6, metal: 6, water: 6 };
        Object.keys(personaStarScore).forEach(function(starName){
          var el = ziweiElementMap[starName];
          if (!el) return;
          rawElementScores[el] += Math.max(0, personaStarScore[starName] || 0) * 2.4;
        });
        auxUnique.forEach(function(starName){
          var el = ziweiAuxElementMap[starName];
          if (!el) return;
          rawElementScores[el] += 4.5;
        });
        badUnique.forEach(function(starName){
          var el = ziweiAuxElementMap[starName];
          if (!el) return;
          rawElementScores[el] += 2.2;
        });

        var elementOrder = ['earth','wood','fire','metal','water'];
        var elementMeta = {
          earth:{icon:'⛰️',name:'토',label:'⛰️ 토 (Earth) · 중축'},
          wood:{icon:'🌿',name:'목',label:'🌿 목 (Wood) · 동방'},
          fire:{icon:'🔥',name:'화',label:'🔥 화 (Fire) · 남방'},
          metal:{icon:'⚔️',name:'금',label:'⚔️ 금 (Metal) · 서방'},
          water:{icon:'💧',name:'수',label:'💧 수 (Water) · 북방'}
        };
        var rawVals = elementOrder.map(function(k){ return rawElementScores[k]; });
        var rawMin = Math.min.apply(null, rawVals);
        var rawMax = Math.max.apply(null, rawVals);
        var personaWuxingData = {};
        elementOrder.forEach(function(k){
          var v = rawElementScores[k];
          var n = (rawMax - rawMin < 0.001)
            ? 62
            : (38 + ((v - rawMin) / (rawMax - rawMin)) * 54);
          personaWuxingData[k] = Math.max(26, Math.min(94, Math.round(n)));
        });

        var wuxingChipHtml = elementOrder.map(function(k){
          var m = elementMeta[k];
          return '<div style="background:rgba(15,23,42,0.55);border:1px solid rgba(196,181,253,0.28);border-radius:8px;padding:5px 8px;font-size:0.78rem;color:#e2e8f0;">'
            + '<span style="font-weight:700;color:#fef3c7;">'+m.icon+' '+m.name+'</span> '
            + '<span style="color:#bae6fd;font-weight:800;">'+personaWuxingData[k]+'</span>'
            + '</div>';
        }).join('');

        var emotionBaseText = '기본적으로는 "'+emotionMode+'" 스타일입니다. 즉, 감정을 아예 숨기기보다 상황을 보고 표현 강도를 조절하는 타입에 가깝습니다.';
        var emotionVarByState = (personaSihuaCnt['화기'] > 0 || badUnique.length >= 3)
          ? '피곤하거나 압박이 큰 날에는 말수가 줄고, 감정을 바로 꺼내기보다 잠시 참았다가 나중에 정리해서 말할 가능성이 큽니다.'
          : '컨디션이 안정적일 때는 감정을 비교적 부드럽고 솔직하게 표현하는 편입니다.';
        var emotionVarByPerson = (auxUnique.length >= 3)
          ? '믿는 사람 앞에서는 표현이 더 따뜻하고 빨라지며, 낯선 사람 앞에서는 한 템포 조심스러워집니다.'
          : '상대가 안전하다고 느껴지면 표현이 늘고, 비판적 분위기에서는 방어적으로 바뀌는 경향이 있습니다.';
        var emotionVarByGoal = (personaSihuaCnt['화권'] > 0)
          ? '일·성과가 걸린 상황에서는 감정보다 결론을 먼저 말하는 실전형 모드가 켜집니다.'
          : (personaSihuaCnt['화과'] > 0
            ? '체면이나 관계의 균형이 중요할 때는 표현을 다듬어 전달하는 신중 모드가 켜집니다.'
            : '급한 목표가 생기면 평소보다 단호해지고, 여유가 있을 때는 공감형으로 돌아오는 패턴이 있습니다.');

        var sec_persona = '<div style="position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(18,16,40,0.96),rgba(28,20,58,0.92) 48%,rgba(14,32,46,0.9));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(196,181,253,0.35);box-shadow:inset 0 0 0 1px rgba(250,204,21,0.12),0 10px 24px rgba(0,0,0,0.35);">'
          +'<div style="position:absolute;inset:-45% auto auto -12%;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,0.15),rgba(250,204,21,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -18% -52% auto;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,0.14),rgba(125,211,252,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:8px;border:1px dashed rgba(250,204,21,0.23);border-radius:11px;pointer-events:none;"></div>'
          +'<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(196,181,253,0.28);padding-bottom:9px;margin-bottom:12px;">'
            +'<h2 style="color:#e9d5ff;font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">🧭 [별들이 알려주는 당신의 모습]</h2>'
            +'<span style="font-size:0.68rem;color:#fde68a;border:1px solid rgba(250,204,21,0.45);background:rgba(120,53,15,0.28);padding:2px 7px;border-radius:999px;white-space:nowrap;">Ziwei Persona Matrix</span>'
          +'</div>'
          +'<div style="position:relative;z-index:1;background:linear-gradient(140deg,rgba(30,27,75,0.78),rgba(36,21,73,0.72) 46%,rgba(9,24,46,0.74));border:1px solid rgba(196,181,253,0.34);border-radius:11px;padding:11px;margin-bottom:11px;">'
            +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:7px;">'
              +'<div style="font-size:0.96rem;color:#fef3c7;font-weight:900;letter-spacing:0.01em;">당신의 타고난 오행 기운</div>'
              +'<div style="font-size:0.72rem;color:#c4b5fd;">Zi Wei Dou Shu Element Constellation</div>'
            +'</div>'
            +'<div class="zw-persona-wuxing-grid">'
              +'<div class="zw-persona-wuxing-left" style="background:rgba(12,20,42,0.62);border:1px solid rgba(125,211,252,0.24);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;">'
                +'<div style="font-size:0.84rem;color:#e2e8f0;line-height:1.68;">📚 달빛 서가의 안내자 <b style="color:#fde68a;">별술사</b>가 오행 별자리를 펼쳐 보입니다. 밝게 빛나는 별일수록 현재 명반에서 힘이 강하게 작동하는 축입니다.</div>'
                +'<div style="font-size:1.68rem;line-height:1;">🧙✨</div>'
                +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">'+wuxingChipHtml+'</div>'
              +'</div>'
              +'<div class="zw-persona-wuxing-right" style="position:relative;background:radial-gradient(circle at 20% 18%,rgba(255,255,255,0.16),rgba(255,255,255,0) 35%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(17,24,39,0.78));border:1px solid rgba(196,181,253,0.3);border-radius:10px;padding:8px;min-height:280px;">'
                +'<canvas id="zwWuXingConstellation" width="460" height="320" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas>'
                +'<div style="position:absolute;top:5px;left:50%;transform:translateX(-50%);font-size:0.72rem;color:#fde68a;background:rgba(30,27,75,0.62);border:1px solid rgba(250,204,21,0.28);border-radius:999px;padding:2px 8px;">⛰️ 토 (Earth)</div>'
                +'<div style="position:absolute;top:58px;right:6px;font-size:0.69rem;color:#bbf7d0;background:rgba(6,78,59,0.36);border:1px solid rgba(52,211,153,0.28);border-radius:999px;padding:2px 7px;">🌿 목 (Wood)</div>'
                +'<div style="position:absolute;bottom:18px;right:8px;font-size:0.69rem;color:#fecaca;background:rgba(127,29,29,0.34);border:1px solid rgba(248,113,113,0.28);border-radius:999px;padding:2px 7px;">🔥 화 (Fire)</div>'
                +'<div style="position:absolute;bottom:18px;left:8px;font-size:0.69rem;color:#e2e8f0;background:rgba(51,65,85,0.42);border:1px solid rgba(148,163,184,0.3);border-radius:999px;padding:2px 7px;">⚔️ 금 (Metal)</div>'
                +'<div style="position:absolute;top:58px;left:6px;font-size:0.69rem;color:#bfdbfe;background:rgba(30,64,175,0.32);border:1px solid rgba(96,165,250,0.28);border-radius:999px;padding:2px 7px;">💧 수 (Water)</div>'
              +'</div>'
            +'</div>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;font-size:0.9rem;line-height:1.75;color:#e2e8f0;">'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 타고난 성격</b><br>기본 성향은 <b>'+leadKeyword+'</b> 쪽입니다. 쉽게 말해, 중요한 순간에 "먼저 뭐부터 할지"를 비교적 빨리 잡는 편입니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 숨겨진 성격</b><br>겉은 편해 보여도 속은 꼼꼼한 타입입니다. 숨은 별('+ (borrowedUnique.length ? borrowedUnique.join(' · ') : '핵심 별 중심') +' / '+auxLabel+')이 작동할 때 더 차분하고 신중해집니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 겉모습 vs 속마음</b><br>겉에서는 '+(mainClean.length ? '또렷하고 단단한 인상' : '부드럽고 편안한 인상')+'을 주기 쉽습니다. 하지만 속으로는 '+(badClean.length ? '실수 가능성을 먼저 점검하는 안전형' : '사람과 결과를 같이 챙기는 균형형')+'에 가깝습니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 인간관계 스타일</b><br><b>'+relationMood+'</b> 성향이 강합니다. 처음엔 선을 지키고, 신뢰가 쌓이면 오래 가는 관계를 만드는 편입니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 감정 표현 방식</b><br>'
              +emotionBaseText
              +'<br>• 컨디션/압박: '+emotionVarByState
              +'<br>• 상대와의 거리: '+emotionVarByPerson
              +'<br>• 상황 목표(일/관계): '+emotionVarByGoal
            +'</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 스트레스 받을 때 성격</b><br>'+stressMode+' 요약하면, 무리해서 밀어붙이기보다 리듬 조절할 때 성과가 더 좋습니다.</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(56,189,248,0.14),rgba(196,181,253,0.12));border:1px solid rgba(125,211,252,0.35);border-radius:10px;padding:10px 11px;"><b style="color:#bae6fd;">✦ 잠재력 요약</b><br>'+hiddenTalent+'. 한 줄 요약: 남들이 놓치는 포인트를 연결해 실제 결과로 만드는 힘이 있습니다.</div>'
          +'</div>'
        +'</div>';

        var careerStarsMeta = extractMainMeta(getPStars('관록궁'));
        var wealthStarsMeta = extractMainMeta(getPStars('재백궁'));
        var careerMainStars = careerStarsMeta.map(function(m){ return m.name; });
        var wealthMainStars = wealthStarsMeta.map(function(m){ return m.name; });
        var careerBorrowed = careerStarsMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var wealthBorrowed = wealthStarsMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var careerAux = uniqueList(extractAux(getPStars('관록궁')));
        var wealthAux = uniqueList(extractAux(getPStars('재백궁')));
        var careerBad = uniqueList(extractBad(getPStars('관록궁')));
        var wealthBad = uniqueList(extractBad(getPStars('재백궁')));

        var skillMap = {
          '자미':'조직 리드·총괄 기획', '천기':'기획·분석·문제 해결', '태양':'대외 커뮤니케이션·브랜딩', '무곡':'실행·재무 수호',
          '천동':'서비스·케어·관계 완충', '염정':'협상·천기·마케팅', '천부':'운행·수호·자산 보전', '태음':'디테일·리서치·정밀 수호',
          '탐랑':'세일즈·사업 확장', '거문':'문서·법무·컨설팅', '천상':'조정·품질·거버넌스', '천량':'교육·코칭·감리',
          '칠살':'고난도 프로젝트 돌파', '파군':'혁신·신사업 전환'
        };
        var jobMap = {
          '자미':'경영·천기·공공 리더십', '천기':'IT/데이터·기획·R&D', '태양':'브랜딩·교육·미디어·대외협력', '무곡':'금융·재무·운행·제조 수호',
          '천동':'복지·HR·고객경험·상담', '염정':'마케팅·비즈개발·협상 직무', '천부':'자산수호·회계·행정·컴플라이언스', '태음':'리서치·디자인·콘텐츠·정밀 사무',
          '탐랑':'영업·사업개발·유통·엔터/이벤트', '거문':'법무·컨설팅·에디팅·강의', '천상':'PMO·품질수호·조직운행', '천량':'교육·의료행정·감사·자문',
          '칠살':'프로젝트 오너·위기수호·특수기술', '파군':'스타트업·신사업·전환 혁신'
        };
        var businessStars = ['탐랑','파군','칠살','무곡','염정'];
        var companyStars = ['천부','천상','태음','거문','천량','자미'];

        var careerCore = careerMainStars[0] || (leadMain || '공궁');
        var wealthCore = wealthMainStars[0] || careerCore;
        var careerSkill = skillMap[careerCore] || '종합형 문제 해결';
        var successJobs = careerMainStars.length
          ? uniqueList(careerMainStars.map(function(s){ return jobMap[s] || (s+' 기반 전문직'); })).slice(0,3).join(' / ')
          : '운행·기획·분석 기반의 안정형 직무';

        var businessScore = 50;
        businessScore += careerMainStars.filter(function(s){ return businessStars.indexOf(s)>=0; }).length * 14;
        businessScore += wealthMainStars.filter(function(s){ return businessStars.indexOf(s)>=0; }).length * 10;
        businessScore += (hasHwakwon ? 8 : 0) + (hasHwarok ? 6 : 0);
        businessScore -= (careerBad.length + wealthBad.length) * 4;
        var companyScore = 50;
        companyScore += careerMainStars.filter(function(s){ return companyStars.indexOf(s)>=0; }).length * 12;
        companyScore += wealthMainStars.filter(function(s){ return companyStars.indexOf(s)>=0; }).length * 8;
        companyScore += (hasHwakwa ? 6 : 0);
        companyScore -= (careerBad.length + wealthBad.length) * 3;
        businessScore = Math.max(0, Math.min(100, businessScore));
        companyScore = Math.max(0, Math.min(100, companyScore));
        var bizVsJob = businessScore >= companyScore
          ? ('사업형 우세 ('+businessScore+' : '+companyScore+')')
          : ('직장형 우세 ('+businessScore+' : '+companyScore+')');

        var vocation = careerMainStars.length
          ? ('관록궁 주성 '+careerMainStars.join(' · ')+' 중심으로, '+careerSkill+'을 핵심 역량으로 쓰는 역할이 천직 축에 가깝습니다.')
          : '관록궁 공궁 구조이므로 고정 직함보다 환경 적응형 포지션에서 역량이 빠르게 개화합니다.';

        var bestWealth = null;
        var bestWealthEarly = null;
        if (pd.daHanList && pd.daHanList.length) {
          pd.daHanList.forEach(function(dh){
            var score = 0;
            var ds = pd.stars[dh.idx] || {main:[],aux:[],bad:[],borrowedMain:[]};
            var dMainMeta = extractMainMeta(ds);
            var dMain = dMainMeta.map(function(m){ return m.name; });
            var dAux = uniqueList(extractAux(ds));
            var dBad = uniqueList(extractBad(ds));
            var dSihua = [];
            if (pd.sihuaData) {
              for (var sx in pd.sihuaData) {
                if (pd.sihuaData[sx].palaceIdx === dh.idx) dSihua.push(pd.sihuaData[sx]);
              }
            }
            score += (dh.palaceName === '재백궁' ? 26 : 0);
            score += (dh.palaceName === '관록궁' ? 20 : 0);
            score += dSihua.filter(function(s){ return s.type === '화록'; }).length * 12;
            score += dSihua.filter(function(s){ return s.type === '화권'; }).length * 8;
            score += dSihua.filter(function(s){ return s.type === '화과'; }).length * 6;
            score -= dSihua.filter(function(s){ return s.type === '화기'; }).length * 12;
            score += dAux.length * 2;
            score -= dBad.length * 3;
            score += dMain.filter(function(s){ return ['무곡','탐랑','자미','천부','태음'].indexOf(s)>=0; }).length * 5;
            var startAgeNum = parseInt(dh.startAge, 10);
            if (!bestWealth || score > bestWealth.score) {
              bestWealth = { score: score, age: dh.startAge+'~'+dh.endAge, palace: dh.palaceName, startAge: isNaN(startAgeNum) ? 0 : startAgeNum };
            }
            if ((isNaN(startAgeNum) || startAgeNum < 70) && (!bestWealthEarly || score > bestWealthEarly.score)) {
              bestWealthEarly = { score: score, age: dh.startAge+'~'+dh.endAge, palace: dh.palaceName, startAge: isNaN(startAgeNum) ? 0 : startAgeNum };
            }
          });
        }
        var wealthPeakText = '';
        var wealthComfortText = '';
        if (bestWealth) {
          wealthPeakText = bestWealth.age+'세 ('+bestWealth.palace+') 대한이 재물운 피크 구간으로 해석됩니다. 이 시기는 확장보다 수익 회수·자산 고정화 천기를 병행할 때 성과가 극대화됩니다.';
          if (bestWealth.startAge >= 70 && bestWealthEarly) {
            wealthComfortText = '<div style="margin-top:10px;background:rgba(250,204,21,0.10);border:1px solid rgba(250,204,21,0.35);border-radius:9px;padding:9px 10px;">'
              +'<b style="color:#fde68a;">☀️ 차선책(조기 수익 구간) 추천:</b> 피크가 늦게 잡히더라도 <b>'+bestWealthEarly.age+'세 ('+bestWealthEarly.palace+')</b> 구간에서 선행 수익화를 설계할 수 있습니다.'
              +'<br><span style="color:#e2e8f0;">빠른 현금흐름을 위해 1) 고정비 축소 + 월 단위 현금흐름 영험 지표, 2) 본업 기반 부수익(강의/자문/디지털 자산), 3) 고위험 확장보다 회수형 포트폴리오를 우선 적용하세요.</span>'
              +'<br><span style="color:#bbf7d0;">지금의 속도가 느려 보여도 운은 축적형으로 작동합니다. 조기 구간에서 작은 승리를 반복하면 후반 피크의 크기가 커집니다.</span>'
            +'</div>';
          }
        } else {
          wealthPeakText = '대한 데이터가 제한적이므로 재백궁·관록궁 활성 구간을 중심으로 월/년 단위 재무 검증을 권장합니다.';
        }

        var sec_ability = '<div style="position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(16,21,43,0.96),rgba(21,35,64,0.92) 52%,rgba(12,28,40,0.9));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(125,211,252,0.28);box-shadow:inset 0 0 0 1px rgba(134,239,172,0.1),0 10px 24px rgba(0,0,0,0.35);">'
          +'<div style="position:absolute;inset:-42% auto auto -10%;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,rgba(110,231,183,0.13),rgba(110,231,183,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -15% -48% auto;width:270px;height:270px;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,0.15),rgba(125,211,252,0));pointer-events:none;"></div>'
          +'<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(125,211,252,0.24);padding-bottom:9px;margin-bottom:12px;">'
            +'<h2 style="color:#bae6fd;font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">💼 [별들이 알려주는 당신의 능력]</h2>'
            +'<span style="font-size:0.68rem;color:#bbf7d0;border:1px solid rgba(110,231,183,0.45);background:rgba(20,83,45,0.28);padding:2px 7px;border-radius:999px;white-space:nowrap;">Ziwei Career Matrix</span>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;font-size:0.9rem;line-height:1.75;color:#e2e8f0;">'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">◈ 타고난 직업 운과 성공하는 직업</b><br>관록궁 핵심성 '+(careerMainStars.length?careerMainStars.join(' · '):'공궁')+' 기준으로 '+careerSkill+' 역량이 강하게 작동합니다. 적합 직군: '+successJobs+'.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">◈ 돈 버는 능력과 사업 vs 직장</b><br>재백궁 핵심성 '+(wealthMainStars.length?wealthMainStars.join(' · '):'공궁')+' 기준 수익화 패턴은 '+bizVsJob+'입니다. '+(businessScore>=companyScore?'확장·영업·신사업 시도에 강점이 큽니다.':'조직 내 권한 축적·전문성 고도화에서 수익 안정성이 높습니다.')+'</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">◈ 천직 찾기</b><br>'+vocation+' '+(careerBorrowed.length?('차성 반영('+careerBorrowed.join(' · ')+') 구간에서는 역할 확장형 커리어 전환이 유리합니다.'):'')+'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(34,211,238,0.14),rgba(74,222,128,0.12));border:1px solid rgba(110,231,183,0.35);border-radius:10px;padding:10px 11px;"><b style="color:#bbf7d0;">✦ 재물운이 가장 터지는 시기</b><br>'+wealthPeakText+wealthComfortText+'</div>'
          +'</div>'
        +'</div>';

        var strategicAuxStars = ['좌보','우필','천괴','천월','문창','문곡','녹존','천마'];
        var auxPresence = Object.create(null);
        var auxPlacement = Object.create(null);
        strategicAuxStars.forEach(function(st){
          auxPresence[st] = false;
          auxPlacement[st] = [];
        });

        for (var apIdx = 0; apIdx < 12; apIdx++) {
          var apName = pd.palacesByIndex[apIdx] || '';
          var apStars = pd.stars[apIdx] || {main:[],aux:[],bad:[],borrowedMain:[]};
          var apAux = uniqueList(extractAux(apStars));
          strategicAuxStars.forEach(function(st){
            if (apAux.indexOf(st) >= 0) {
              auxPresence[st] = true;
              auxPlacement[st].push(apName || ('궁위'+apIdx));
            }
          });
        }

        var auxFound = strategicAuxStars.filter(function(st){ return !!auxPresence[st]; });
        var auxFoundLabel = auxFound.length ? auxFound.join(' · ') : '직접 포착 약함';
        var auxMissing = strategicAuxStars.filter(function(st){ return !auxPresence[st]; });
        var coopAxisOn = auxPresence['좌보'] && auxPresence['우필'];
        var luckAxisOn = auxPresence['천괴'] && auxPresence['천월'];
        var logicAxisOn = auxPresence['문창'] && auxPresence['문곡'];
        var growthAxisOn = auxPresence['녹존'] && auxPresence['천마'];

        var placeCountByStar = function(st, targets) {
          var list = auxPlacement[st] || [];
          return list.filter(function(n){ return targets.indexOf(n) >= 0; }).length;
        };

        var collabScore = 34;
        collabScore += coopAxisOn ? 30 : ((auxPresence['좌보'] || auxPresence['우필']) ? 14 : 0);
        collabScore += luckAxisOn ? 16 : ((auxPresence['천괴'] || auxPresence['천월']) ? 8 : 0);
        collabScore += placeCountByStar('좌보', ['노복궁','관록궁','명궁']) * 7;
        collabScore += placeCountByStar('우필', ['노복궁','관록궁','천이궁']) * 7;
        collabScore = Math.max(20, Math.min(98, collabScore));

        var insightScore = 34;
        insightScore += logicAxisOn ? 34 : ((auxPresence['문창'] || auxPresence['문곡']) ? 15 : 0);
        insightScore += placeCountByStar('문창', ['명궁','관록궁','재백궁','복덕궁']) * 6;
        insightScore += placeCountByStar('문곡', ['명궁','관록궁','재백궁','천이궁']) * 6;
        insightScore += luckAxisOn ? 7 : 0;
        insightScore = Math.max(20, Math.min(98, insightScore));

        var mobilityScore = 34;
        mobilityScore += growthAxisOn ? 34 : ((auxPresence['녹존'] || auxPresence['천마']) ? 15 : 0);
        mobilityScore += placeCountByStar('녹존', ['재백궁','관록궁','전택궁']) * 7;
        mobilityScore += placeCountByStar('천마', ['천이궁','관록궁','재백궁']) * 7;
        mobilityScore += (auxPresence['천괴'] || auxPresence['천월']) ? 5 : 0;
        mobilityScore = Math.max(20, Math.min(98, mobilityScore));

        var coachTitle = '세상을 설계하는 보이지 않는 손';
        var coachSummary = auxFound.length >= 5
          ? '보조성 8종 중 다수가 활성화되어, 사람·정보·자원을 구조화해 결과를 만드는 설계형 명반입니다.'
          : (auxFound.length >= 3
            ? '핵심 보조성이 선택적으로 활성화되어, 특정 구간에서 레버리지 효율이 급상승하는 집중형 명반입니다.'
            : '보조성 직접 개입은 제한적이지만, 명궁/관록궁 주성 중심의 자기주도 실행으로 우위를 만드는 타입입니다.');

        var coopDetail = coopAxisOn
          ? '좌보·우필이 함께 작동해 도움 요청을 감정이 아닌 구조로 설계합니다. 특히 '+((auxPlacement['좌보']||[]).concat(auxPlacement['우필']||[]).slice(0,3).join(' · ') || '핵심 궁위')+'에서 조율력이 강합니다.'
          : '좌보·우필의 동시 결집은 약하지만, 단독 배치가 있는 궁위에서 협업 핵심 노드를 먼저 세우면 조력 효율이 빠르게 올라갑니다.';
        var luckDetail = luckAxisOn
          ? '천괴·천월이 동시 활성화되어 기회가 우연처럼 보이는 순간도 준비된 필연으로 연결할 가능성이 높습니다.'
          : '천괴·천월 중 단일 축이 작동하므로 기회 포착은 좋지만, 선행 준비 체크리스트를 붙여야 성과 전환이 안정됩니다.';
        var logicDetail = logicAxisOn
          ? '문창·문곡 결합으로 복잡한 정보를 구조화한 뒤 설득 가능한 언어로 변환하는 힘이 강합니다. 기획서/제안서/문서 설계가 경쟁 우위가 됩니다.'
          : '문창·문곡의 한 축이 우세하므로 논리 또는 감성 한쪽으로 쏠리기 쉽습니다. 반대 축 검토 단계를 추가하면 설득력이 크게 상승합니다.';
        var growthDetail = growthAxisOn
          ? '녹존·천마 조합이 자본 회수력과 기동성을 동시에 올려줍니다. 빠르게 움직이되 회수 타이밍을 잃지 않는 성장 엔진이 강점입니다.'
          : '녹존·천마가 분리 작동하므로, 속도(천마)와 회수(녹존) 중 약한 축을 의식적으로 보완해야 성장 안정성이 높아집니다.';

        var dominantTrack = [
          { k: '협업 아키텍처', v: collabScore },
          { k: '논리적 심미안', v: insightScore },
          { k: '고속 성장 엔진', v: mobilityScore }
        ].sort(function(a,b){ return b.v - a.v; })[0];

        var coachingFocus = dominantTrack.k === '협업 아키텍처'
          ? '당장 혼자 해결하려는 업무 1개를 협업형 과제로 전환하세요. 역할·의사결정권·리뷰 주기를 먼저 명시하면 성과가 빨라집니다.'
          : (dominantTrack.k === '논리적 심미안'
            ? '이번 주 핵심 과제를 1페이지 구조도로 정리하세요. 문제정의-가설-실험-회수 지표 4단으로 만들면 설득력이 급상승합니다.'
            : '수익/성과 회수 시점을 먼저 정하고 실행하세요. 시작 기준보다 종료 기준을 선명히 잡을수록 손실이 줄고 누적 성장이 커집니다.');

        var sec_hidden_power = '<section class="zw-hidden-power">'
          +'<div class="zw-hidden-power__starfield" aria-hidden="true"></div>'
          +'<div class="zw-hidden-power__inner">'
            +'<h2 class="zw-hidden-power__title">✦ 당신의 숨겨진 능력: "'+coachTitle+'"</h2>'
            +'<p class="zw-hidden-power__lead">'+coachSummary+'</p>'
            +'<div class="zw-hidden-power__chips">'
              +'<span class="zw-hidden-power__chip">포착된 보조성: '+auxFoundLabel+'</span>'
              +'<span class="zw-hidden-power__chip">협업 아키텍처 '+collabScore+'점</span>'
              +'<span class="zw-hidden-power__chip">데이터 기반 직관 '+insightScore+'점</span>'
              +'<span class="zw-hidden-power__chip">속도 조절 엔진 '+mobilityScore+'점</span>'
            +'</div>'
            +'<div class="zw-hidden-power__grid">'
              +'<article class="zw-hidden-power__card">'
                +'<h3>1. 🛠️ 시스템적 조율력 (좌보·우필 x 천괴·천월)</h3>'
                +'<p><b>핵심 역량:</b> 당신의 강점은 직접 해결보다 레버리지 구조를 설계하는 데 있습니다.</p>'
                +'<p><b>상세 풀이:</b> '+coopDetail+' '+luckDetail+'</p>'
              +'</article>'
              +'<article class="zw-hidden-power__card">'
                +'<h3>2. 📝 데이터 기반의 직관 (문창·문곡)</h3>'
                +'<p><b>핵심 역량:</b> 무질서한 데이터에서 맥락을 추출해 설득 가능한 형태로 정렬합니다.</p>'
                +'<p><b>상세 풀이:</b> '+logicDetail+'</p>'
              +'</article>'
              +'<article class="zw-hidden-power__card">'
                +'<h3>3. 🐎 타이밍의 지배자 (녹존·천마)</h3>'
                +'<p><b>핵심 역량:</b> 달려야 할 때와 멈춰야 할 때를 분리해 성장 효율을 높입니다.</p>'
                +'<p><b>상세 풀이:</b> '+growthDetail+'</p>'
              +'</article>'
            +'</div>'
            +'<div class="zw-hidden-power__guide">'
              +'<h3>💡 활용 가이드 (Success Code)</h3>'
              +'<p><b>Warning:</b> 모든 것을 혼자 처리하면 명반의 장점이 반감됩니다. 연결과 위임이 성과 증폭 장치입니다.</p>'
              +'<p><b>Action:</b> '+coachingFocus+'</p>'
              + (auxMissing.length ? ('<p><b>보완 포인트:</b> 현재 직접 포착이 약한 보조성은 '+auxMissing.join(' · ')+'입니다. 해당 성향을 팀/도구/프로세스로 외부 보강하면 균형이 완성됩니다.</p>') : '')
            +'</div>'
          +'</div>'
        +'</section>';

        var spousePal = getPStars('부처궁') || getPStars('부부궁') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var spouseMainMeta = extractMainMeta(spousePal);
        var spouseMain = spouseMainMeta.map(function(m){ return m.name; });
        var spouseAux = uniqueList(extractAux(spousePal));
        var spouseBad = uniqueList(extractBad(spousePal));
        var spouseBorrowed = spouseMainMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });

        var mengPalForLove = getPStars('명궁') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var bokPalForLove = getPStars('복덕궁') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var movePalForLove = getPStars('천이궁') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var homePalForLove = getPStars('전택궁') || {main:[],aux:[],bad:[],borrowedMain:[]};

        var mengMainLove = extractMainMeta(mengPalForLove).map(function(m){ return m.name; });
        var bokMainLove = extractMainMeta(bokPalForLove).map(function(m){ return m.name; });
        var moveMainLove = extractMainMeta(movePalForLove).map(function(m){ return m.name; });
        var homeMainLove = extractMainMeta(homePalForLove).map(function(m){ return m.name; });

        var romanceStars = ['탐랑','태음','천동','염정','태양'];
        var stableStars = ['천부','천량','천상','자미','무곡'];
        var independentStars = ['칠살','파군','무곡','거문'];
        var socialStars = ['탐랑','태양','천동','천기'];

        var helperGoodStars = ['좌보','우필','문창','문곡','천괴','천월','녹존'];
        var helperRiskStars = ['경양','타라','화성','영성','지공','지겁'];

        var loveHeat = 42;
        loveHeat += spouseMain.filter(function(s){ return romanceStars.indexOf(s) >= 0; }).length * 12;
        loveHeat += spouseAux.filter(function(s){ return helperGoodStars.indexOf(s) >= 0; }).length * 4;
        loveHeat -= spouseBad.filter(function(s){ return helperRiskStars.indexOf(s) >= 0; }).length * 5;
        if (spouseBorrowed.length) loveHeat -= 4;

        var commitment = 45;
        commitment += spouseMain.filter(function(s){ return stableStars.indexOf(s) >= 0; }).length * 11;
        commitment += bokMainLove.filter(function(s){ return stableStars.indexOf(s) >= 0; }).length * 7;
        commitment += (hasHwakwa ? 5 : 0);
        commitment -= spouseBad.length * 4;

        var freedomNeed = 38;
        freedomNeed += spouseMain.filter(function(s){ return independentStars.indexOf(s) >= 0; }).length * 11;
        freedomNeed += moveMainLove.filter(function(s){ return socialStars.indexOf(s) >= 0; }).length * 6;
        freedomNeed += (hasHwakwon ? 4 : 0);

        var flirtRiskScore = 18;
        flirtRiskScore += spouseMain.filter(function(s){ return ['탐랑','파군','칠살','염정'].indexOf(s) >= 0; }).length * 14;
        flirtRiskScore += (hasHwagi ? 10 : 0);
        flirtRiskScore += spouseBad.length * 6;
        flirtRiskScore -= spouseMain.filter(function(s){ return ['천부','천량','자미','무곡'].indexOf(s) >= 0; }).length * 8;
        flirtRiskScore -= spouseAux.filter(function(s){ return ['좌보','우필','문창','문곡'].indexOf(s) >= 0; }).length * 3;

        loveHeat = Math.max(0, Math.min(100, loveHeat));
        commitment = Math.max(0, Math.min(100, commitment));
        freedomNeed = Math.max(0, Math.min(100, freedomNeed));
        flirtRiskScore = Math.max(0, Math.min(100, flirtRiskScore));

        var spouseLabel = spouseMain.length ? spouseMain.join(' · ') : '공궁(차성/대궁 영향형)';
        var spouseAuxLabel = spouseAux.length ? spouseAux.join(' · ') : '보조 길성 약함';
        var spouseBadLabel = spouseBad.length ? spouseBad.join(' · ') : '흉성 압력 약함';

        var loveStyle = '';
        if (loveHeat >= 70 && commitment >= 60) {
          loveStyle = '"불꽃 + 책임" 혼합형입니다. 감정이 붙으면 빠르게 깊어지지만, 관계가 시작되면 오래 지키려는 성향이 강합니다.';
        } else if (freedomNeed >= 70) {
          loveStyle = '"친밀 + 자유" 균형형입니다. 좋아해도 내 리듬을 지키는 편이며, 존중받을 때 애정 표현이 크게 살아납니다.';
        } else if (commitment >= 68) {
          loveStyle = '"신뢰 우선" 안정형입니다. 천천히 가까워지지만 한번 마음을 주면 일관성이 높고 관계 운행이 성실합니다.';
        } else {
          loveStyle = '"상황 적응" 현실형입니다. 상대와 타이밍에 따라 방식이 달라지며, 감정과 조건을 함께 보는 타입에 가깝습니다.';
        }

        var charmPoint = '';
        if (spouseMain.some(function(s){ return ['태양','탐랑','염정'].indexOf(s) >= 0; })) {
          charmPoint = '사람을 편하게 끌어당기는 존재감과 대화 밀도가 매력 포인트입니다. 분위기를 살리는 능력이 강합니다.';
        } else if (spouseMain.some(function(s){ return ['태음','천동','천량'].indexOf(s) >= 0; })) {
          charmPoint = '따뜻함·배려·정서적 안정감이 강한 매력으로 작동합니다. "함께 있으면 편안한 사람"으로 기억되기 쉽습니다.';
        } else {
          charmPoint = '약속을 지키는 태도, 책임감, 생활 리듬의 안정성이 장기 매력으로 작동합니다.';
        }

        var attractedToYou = '';
        if (spouseMain.some(function(s){ return ['자미','천부','무곡'].indexOf(s) >= 0; })) {
          attractedToYou = '성숙하고 자기 일에 책임 있는 사람, 생활 기반을 탄탄히 운행하는 타입이 당신에게 강하게 끌립니다.';
        } else if (spouseMain.some(function(s){ return ['탐랑','태양','천기'].indexOf(s) >= 0; })) {
          attractedToYou = '감각적이고 표현이 적극적인 사람, 함께 성장/도전할 수 있는 에너지형 인연이 붙기 쉽습니다.';
        } else {
          attractedToYou = '안정감과 공감 능력을 함께 가진 사람, 말이 통하고 일상 호흡이 맞는 인연이 강하게 들어옵니다.';
        }

        var youAttractedTo = '';
        if (mengMainLove.some(function(s){ return ['칠살','파군','거문'].indexOf(s) >= 0; })) {
          youAttractedTo = '똑똑하고 자기 주관이 분명한 사람에게 끌립니다. 대화의 깊이와 문제 해결력이 중요한 선택 기준입니다.';
        } else if (mengMainLove.some(function(s){ return ['천동','태음','천량'].indexOf(s) >= 0; })) {
          youAttractedTo = '다정하고 감정선이 섬세한 사람, 관계의 온도를 잘 맞춰주는 사람에게 빠르게 마음이 갑니다.';
        } else {
          youAttractedTo = '약속을 잘 지키고 생활 페이스가 안정적인 사람, 장기적으로 같이 성장할 수 있는 타입을 선호합니다.';
        }

        var idealSpouse = '이상적인 배우자 유형은 <b>'
          + (commitment >= 65 ? '안정성과 책임감이 높은 사람' : '유연성과 소통력이 높은 사람')
          + '</b>입니다. 특히 '
          + (freedomNeed >= 65 ? '서로의 개인 시간을 존중해 주는 구조' : '생활 리듬을 함께 맞춰가는 구조')
          + '에서 결혼 만족도가 높아집니다.';

        var marriageShift = '';
        if (moveMainLove.some(function(s){ return ['탐랑','파군','칠살','천기'].indexOf(s) >= 0; })) {
          marriageShift = '결혼 후 이동·직무 전환·생활권 변화가 함께 오기 쉽습니다. 두 사람의 "생활 성궁 진법"을 먼저 합의하면 갈등 비용이 크게 줄어듭니다.';
        } else if (homeMainLove.some(function(s){ return ['천부','태음','자미'].indexOf(s) >= 0; })) {
          marriageShift = '결혼 후 자산·주거·가정 운행이 안정적으로 재편될 가능성이 큽니다. 집/재무 계획을 공동 영험 지표로 운행하면 시너지가 큽니다.';
        } else {
          marriageShift = '결혼 후 변화는 급격하기보다 점진형입니다. 역할 분담표와 의사결정 규칙을 합의하면 장기 만족도가 상승합니다.';
        }

        var marriageBest = null;
        if (pd.daHanList && pd.daHanList.length) {
          pd.daHanList.forEach(function(dh){
            var ds2 = pd.stars[dh.idx] || {main:[],aux:[],bad:[],borrowedMain:[]};
            var dMain2 = extractMainMeta(ds2).map(function(m){ return m.name; });
            var dAux2 = uniqueList(extractAux(ds2));
            var dBad2 = uniqueList(extractBad(ds2));
            var dhSihua2 = [];
            if (pd.sihuaData) {
              for (var sx2 in pd.sihuaData) {
                if (pd.sihuaData[sx2].palaceIdx === dh.idx) dhSihua2.push(pd.sihuaData[sx2]);
              }
            }
            var mScore = 0;
            mScore += (dh.palaceName === '부처궁' || dh.palaceName === '부부궁') ? 28 : 0;
            mScore += (dh.palaceName === '명궁') ? 14 : 0;
            mScore += (dh.palaceName === '천이궁') ? 10 : 0;
            mScore += dhSihua2.filter(function(s){ return s.type === '화록'; }).length * 11;
            mScore += dhSihua2.filter(function(s){ return s.type === '화권'; }).length * 7;
            mScore += dhSihua2.filter(function(s){ return s.type === '화과'; }).length * 8;
            mScore -= dhSihua2.filter(function(s){ return s.type === '화기'; }).length * 12;
            mScore += dMain2.filter(function(s){ return ['천동','태음','천상','천량','자미','천부'].indexOf(s) >= 0; }).length * 5;
            mScore += dAux2.filter(function(s){ return helperGoodStars.indexOf(s) >= 0; }).length * 2;
            mScore -= dBad2.length * 3;
            if (!marriageBest || mScore > marriageBest.score) {
              marriageBest = { age: dh.startAge+'~'+dh.endAge, palace: dh.palaceName, score: mScore };
            }
          });
        }
        var marriageLuckText = marriageBest
          ? ('결혼운 피크는 <b>'+marriageBest.age+'세 ('+zwDisplayPalaceName(marriageBest.palace)+')</b> 구간으로 해석됩니다. 이 시기는 관계의 제도화(동거·혼인·공동 자산 설계)에 유리합니다.')
          : '대한 데이터가 제한되어 결혼운 피크는 명확히 특정하기 어렵지만, 부처궁/명궁 활성 시기에 관계 진전이 유리합니다.';

        var flirtVerdict = '';
        if (flirtRiskScore >= 66) {
          flirtVerdict = '바람기 자체라기보다 "관계 외 자극에 흔들릴 가능성"이 있는 편입니다. 경계선 수호(연락 빈도·이성 거리 규칙)를 명확히 두면 안정됩니다.';
        } else if (flirtRiskScore >= 42) {
          flirtVerdict = '중립 구간입니다. 평소엔 안정적이지만 스트레스·권태·거리 이슈가 누적되면 감정 이탈 가능성이 생길 수 있습니다.';
        } else {
          flirtVerdict = '낮은 편입니다. 관계가 시작되면 의리와 일관성이 강하고, 신뢰 기반을 스스로 지키려는 성향이 큽니다.';
        }

        var loveWeakness = '';
        if (freedomNeed >= 70 && commitment < 60) {
          loveWeakness = '가까워질수록 답답함을 느껴 갑자기 거리를 둘 수 있습니다. "혼자 회복 시간"을 미리 합의하면 반복 갈등을 줄일 수 있습니다.';
        } else if (spouseBad.length >= 2 || hasHwagi) {
          loveWeakness = '서운함이 쌓이면 직접 말하기보다 참다가 한 번에 터질 수 있습니다. 감정 로그를 짧게 공유하는 습관이 효과적입니다.';
        } else {
          loveWeakness = '문제가 작을 때는 넘기다가 타이밍을 놓치는 경향이 있습니다. 주 1회 관계 체크인(좋았던 점/아쉬운 점)을 권장합니다.';
        }

        var loveNameRaw = (typeof USER_NAME === 'string' && USER_NAME.trim()) ? USER_NAME.trim() : '사용자';
        var loveNameSafe = (typeof iljuEscapeHtml === 'function')
          ? iljuEscapeHtml(loveNameRaw)
          : loveNameRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');

        var loveDestinyTitle = '비단길 위에 핀 장미';
        if (spouseMain.some(function(s){ return ['탐랑','태양','염정'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '불꽃 무대 위의 왈츠';
        } else if (spouseMain.some(function(s){ return ['태음','천동','천량'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '새벽 안개 속의 서약';
        } else if (spouseMain.some(function(s){ return ['무곡','자미','천부'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '황금 규칙으로 지키는 심장';
        }

        var loveTypeName = '감정 천기가형';
        if (loveHeat >= 70 && commitment >= 65) loveTypeName = '블레이즈 가디언형';
        else if (freedomNeed >= 70 && loveHeat >= 60) loveTypeName = '자유 궤도 로맨서형';
        else if (commitment >= 70) loveTypeName = '롱런 설계자형';
        else if (loveHeat >= 65) loveTypeName = '심장 직진 플레이어형';

        var oneLineSummary = '';
        if (commitment >= loveHeat && commitment >= freedomNeed) {
          oneLineSummary = '당신의 연애는 설렘보다 신뢰가 먼저 자리를 잡고, 한 번 맺은 관계는 오래 지키는 운명입니다.';
        } else if (loveHeat >= commitment && loveHeat >= freedomNeed) {
          oneLineSummary = '당신의 연애는 심장이 먼저 달리고 현실이 뒤따르는 타입이라, 시작 장면부터 강렬한 파동을 만듭니다.';
        } else {
          oneLineSummary = '당신의 연애는 가까워질수록 자유와 친밀의 균형을 시험받으며, 그 균형을 맞출수록 관계의 급이 올라갑니다.';
        }

        var vibeText = '열정 <b style="color:#fb7185;">'+loveHeat+'</b> / 헌신 <b style="color:#f9a8d4;">'+commitment+'</b> / 자유 <b style="color:#c4b5fd;">'+freedomNeed+'</b>의 결로 움직입니다. '
          + (loveHeat >= 70 ? '감정의 점화 속도가 빠르고 ' : '감정의 점화는 신중하지만 ')
          + (commitment >= 65 ? '붙으면 오래 버티는 힘이 강합니다.' : '상황 적응력이 좋아 관계의 판을 유연하게 바꿉니다.');

        var magnetConflict = '"나에게 끌리는 사람"은 '+attractedToYou+' 반면 "내가 끌리는 사람"은 '+youAttractedTo+' 그래서 연애 초반엔 이상과 현실이 교차하지만, 기준을 말로 합의하는 순간 가장 강한 팀이 됩니다.';

        var redFlagScenario = '';
        var redFlagCounter = '';
        if (freedomNeed >= 70 && commitment < 60) {
          redFlagScenario = '치명적 약점은 <b>가까워진 뒤 갑자기 숨이 막히는 패턴</b>입니다. 설명 없는 거리두기가 반복되면 상대는 버려졌다고 해석하고, 작은 오해가 이별 트리거로 폭발할 수 있습니다.';
          redFlagCounter = '방지 대책: 관계가 답답해지기 전에 "혼자 회복 시간"을 일정으로 먼저 선언하세요. 침묵 대신 예고가 관계를 살립니다.';
        } else if (spouseBad.length >= 2 || hasHwagi) {
          redFlagScenario = '치명적 약점은 <b>참다가 한 번에 터지는 감정 폭발</b>입니다. 서운함이 누적되면 대화가 협상 대신 판결이 되어, 서로의 자존심만 크게 다칩니다.';
          redFlagCounter = '방지 대책: 상대의 서운함이 3층까지 쌓이기 전에 먼저 문을 두드리세요. 48시간 안에 감정을 짧게 공유하면 파국을 막을 수 있습니다.';
        } else if (flirtRiskScore >= 66) {
          redFlagScenario = '치명적 약점은 <b>관계 바깥 자극에 대한 순간 흔들림</b>입니다. 권태 구간에서 경계선이 흐려지면 신뢰 복구 비용이 크게 발생합니다.';
          redFlagCounter = '방지 대책: 연락 빈도, 이성 거리, 술자리 규칙을 초반에 합의해 두세요. 룰이 사랑을 구속하는 게 아니라 사랑을 보호합니다.';
        } else {
          redFlagScenario = '치명적 약점은 <b>문제가 작을 때 넘기다 타이밍을 놓치는 패턴</b>입니다. 갈등이 작을 때 손대지 않으면 나중엔 같은 대화가 전쟁이 됩니다.';
          redFlagCounter = '방지 대책: 주 1회 10분 체크인으로 "좋았던 점 1개 + 아쉬운 점 1개"만 공유하세요. 관계의 균열은 조기 보수가 정답입니다.';
        }

        var spouseProfile = '당신의 리듬을 맞춰줄 동반자는 <b>'
          + (commitment >= 65 ? '책임감이 있고 약속을 실제 행동으로 지키는 사람' : '감정 소통이 빠르고 분위기를 부드럽게 전환하는 사람')
          + '</b>입니다. '
          + (freedomNeed >= 65 ? '서로의 개인 시간을 존중할수록 애정의 밀도가 올라갑니다.' : '일상 루틴을 함께 설계할수록 안정감과 애착이 급상승합니다.');

        var futureGoldText = '인생 황금기: '+marriageLuckText+' '+marriageShift;

        var secretKey = '필살기: 연애 스타일은 '+loveStyle+' 그리고 이상적인 배우자상은 '+idealSpouse+' 이 두 축을 합쳐 "감정 표현은 따뜻하게, 약속은 구체적으로" 실행하면 관계의 신뢰 레벨이 가장 빠르게 상승합니다.';

        var weeklyMission = '';
        if (flirtRiskScore >= 66) {
          weeklyMission = '이번 주의 미션: 경계선 3종(연락·약속·사적 거리)을 문장으로 합의하고 서로 확인 도장을 찍으세요.';
        } else if (freedomNeed >= 70) {
          weeklyMission = '이번 주의 미션: 데이트 1회 + 혼자 회복 시간 2회를 미리 캘린더에 잡고 상대에게 먼저 공유하세요.';
        } else if (commitment >= 70) {
          weeklyMission = '이번 주의 미션: "우리의 6개월 계획" 대화를 20분 진행하고, 돈/시간/휴식 규칙을 각 1개씩 정하세요.';
        } else {
          weeklyMission = '이번 주의 미션: 7일간 하루 한 줄 감정 로그를 공유하세요. 감정 이름을 붙이는 순간 갈등 강도가 내려갑니다.';
        }

        var healingTitle = '괜찮아, 당신의 속도는 이미 충분히 아름답습니다';
        if (loveHeat >= 70 && commitment >= 65) {
          healingTitle = '뜨거운 마음도 쉬어가야 오래 빛납니다';
        } else if (freedomNeed >= 70) {
          healingTitle = '거리두기는 회피가 아니라 회복의 기술입니다';
        } else if (commitment >= 70) {
          healingTitle = '당신의 성실함은 사랑을 지키는 가장 큰 재능입니다';
        }

        var healingAffirmation = '당신이 관계에서 예민하게 느끼는 감각은 약점이 아니라 사랑의 레이더입니다. 그 감각을 비난하지 말고 방향만 조정하면 됩니다.';
        var healingRoutine = '오늘의 회복 루틴: 잠들기 전 3분, "오늘 고마웠던 장면 1개 + 내 감정 1개 + 내일 전할 한 문장"을 메모하세요. 관계의 온도가 천천히 안정됩니다.';
        var healingPartnerTip = '관계 심리 코칭: 상대를 바꾸려 하기보다, 내 리듬을 먼저 설명하세요. 설명된 마음은 오해보다 신뢰를 빠르게 만듭니다.';

        if (spouseBad.length >= 2 || hasHwagi) {
          healingAffirmation = '감정이 한꺼번에 올라오는 날이 있어도 괜찮습니다. 당신은 망가진 게 아니라, 오래 참아온 마음이 신호를 보내는 중입니다.';
          healingRoutine = '오늘의 회복 루틴: 감정 폭발 신호 3가지(말투·표정·몸 반응)를 적고, 신호가 오면 20분 멈춤 후 대화 재개 규칙을 적용하세요.';
        } else if (freedomNeed >= 70) {
          healingPartnerTip = '관계 심리 코칭: "지금은 멀어지는 게 아니라 충전 중"이라는 문장을 미리 공유하세요. 정직한 예고가 상대의 불안을 크게 낮춥니다.';
        }

        var loveDestinyMetrics = {
          passion: Math.max(35, Math.min(98, Math.round(loveHeat))),
          communication: Math.max(35, Math.min(98, Math.round(58 + auxUnique.length * 4 - (spouseBad.length * 2) + (personaSihuaCnt['화과'] > 0 ? 6 : 0)))),
          harmony: Math.max(35, Math.min(98, Math.round((commitment * 0.58) + ((100 - flirtRiskScore) * 0.42)))),
          trust: Math.max(35, Math.min(98, Math.round((100 - flirtRiskScore) * 0.72 + commitment * 0.28))),
          destiny: Math.max(35, Math.min(98, Math.round((loveHeat * 0.32) + (commitment * 0.38) + ((100 - flirtRiskScore) * 0.3)))),
          promise: Math.max(35, Math.min(98, Math.round(commitment)))
        };

        var loveDestinyPointList = [
          { key: 'passion', icon: '❤️‍🔥', name: '열정', hint: '심장을 점화하는 끌림' },
          { key: 'communication', icon: '🌙💬', name: '소통', hint: '말이 별빛처럼 통하는 결' },
          { key: 'harmony', icon: '⚖️', name: '조화', hint: '감정과 현실의 균형' },
          { key: 'trust', icon: '🔒⭐', name: '신뢰', hint: '관계를 지키는 안전핵' },
          { key: 'destiny', icon: '♾️', name: '인연', hint: '시간을 넘어 이어진 매듭' },
          { key: 'promise', icon: '👑', name: '약속', hint: '오래 가는 책임의 힘' }
        ];

        var loveDestinyMetricHtml = loveDestinyPointList.map(function(item){
          var val = loveDestinyMetrics[item.key] || 0;
          return '<div class="zw-love-metric-item"><span>'+item.icon+' <b>'+item.name+'</b></span><span style="color:#fde68a;font-weight:900;">'+val+'%</span></div>';
        }).join('');

        var sec_love_compat_spread = '<div class="zw-love-compat-spread report-card report-section love-card star-effect">'
          + '<div class="zw-cosmic-stars"></div>'
          + '<div class="zw-love-compat-title love-title">💘 [사랑 인연 별자리]</div>'
          + '<div class="zw-love-compat-canvas-wrap">'
            + '<canvas id="zwLoveDestinyStarCanvas" class="zw-love-compat-canvas" width="920" height="380"></canvas>'
          + '</div>'
          + '<div class="zw-love-metric-grid">'+loveDestinyMetricHtml+'</div>'
        + '</div>';

        var sec_love = '<div class="zw-cosmic-card zw-love-card report-card report-section love-card star-effect">'
          +'<div class="zw-cosmic-stars"></div>'
          +'<div style="position:absolute;inset:-45% auto auto -12%;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(251,113,133,0.18),rgba(251,113,133,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -18% -56% auto;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(244,114,182,0.15),rgba(244,114,182,0));pointer-events:none;"></div>'
          +'<div class="zw-cosmic-heading" style="border-bottom-color:rgba(251,113,133,0.36);">'
            +'<h2 class="section-title love-title" style="font-size:1.08rem;margin:0;font-weight:900;letter-spacing:0.01em;">💘 [별들이 알려주는 사랑]</h2>'
            +'<span class="zw-cosmic-chip" style="color:#fecdd3;border-color:rgba(251,113,133,0.55);background:rgba(127,29,29,0.3);">Starlit Love Story</span>'
          +'</div>'
          +'<div class="card-content love-text" style="position:relative;z-index:1;background:linear-gradient(120deg,rgba(251,113,133,0.16),rgba(244,114,182,0.12));border:1px solid rgba(251,113,133,0.38);border-radius:11px;padding:12px 12px;margin-bottom:10px;">'
            +'<div style="font-size:1.03rem;font-weight:900;color:#ffe4e6;line-height:1.45;">💌 '+loveNameSafe+'의 연애 운명: "'+loveDestinyTitle+'"</div>'
            +'<div style="margin-top:6px;color:#ffe4e6;font-size:0.87rem;line-height:1.72;"><b>한 줄 요약:</b> '+oneLineSummary+'</div>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:9px;font-size:0.89rem;line-height:1.76;color:#f3e8ff;">'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">1. 당신의 연애 본능 (The Stats)</div>'
              +'<div style="margin-bottom:4px;"><b>Love Style:</b> '+loveTypeName+'</div>'
              +'<div style="margin-bottom:4px;"><b>Vibe:</b> '+vibeText+'</div>'
              +'<div style="font-size:0.79rem;color:#fbcfe8;">핵심 별: '+spouseLabel+' / 보조·흉성: '+spouseAuxLabel+' / '+spouseBadLabel+'</div>'
            +'</div>'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">2. 당신의 매력과 인연 (Attraction)</div>'
              +'<div style="margin-bottom:4px;"><b>입덕 포인트:</b> 당신이 연애를 시작하면 '+charmPoint+'</div>'
              +'<div><b>운명의 자석:</b> '+magnetConflict+'</div>'
            +'</div>'
            +'<div style="background:linear-gradient(120deg,rgba(127,29,29,0.32),rgba(127,29,29,0.18));border:1px solid rgba(251,113,133,0.42);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fda4af;font-weight:900;margin-bottom:6px;">3. ⚠️ 레드 플래그 (Warning)</div>'
              +'<div style="margin-bottom:4px;"><b>치명적 약점:</b> '+redFlagScenario+'</div>'
              +'<div><b>방지 대책:</b> '+redFlagCounter+'</div>'
            +'</div>'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">4. 💍 미래의 동반자 & 결혼 운 (Future)</div>'
              +'<div style="margin-bottom:4px;"><b>배우자 프로필:</b> '+spouseProfile+'</div>'
              +'<div><b>인생 황금기:</b> '+futureGoldText+'</div>'
            +'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(244,114,182,0.18),rgba(167,139,250,0.14));border:1px solid rgba(244,114,182,0.38);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fce7f3;font-weight:900;margin-bottom:6px;">5. 오늘부터 당장 실천할 연애 치트키</div>'
              +'<div style="margin-bottom:4px;"><b>Secret Key:</b> '+secretKey+'</div>'
              +'<div><b>이번 주의 미션:</b> '+weeklyMission+'</div>'
            +'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(186,230,253,0.14),rgba(224,231,255,0.15));border:1px solid rgba(125,211,252,0.36);border-radius:10px;padding:11px 12px;">'
              +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
                +'<div style="color:#e0f2fe;font-weight:900;">6. 마음 회복 코칭</div>'
                +'<span style="font-size:0.68rem;color:#e0f2fe;border:1px solid rgba(125,211,252,0.55);background:rgba(3,105,161,0.25);padding:2px 7px;border-radius:999px;white-space:nowrap;">힐링의 메세지</span>'
              +'</div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;"><b>'+healingTitle+'</b></div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;">'+healingAffirmation+'</div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;">'+healingPartnerTip+'</div>'
              +'<div style="color:#e2e8f0;"><b>회복 루틴:</b> '+healingRoutine+'</div>'
            +'</div>'
          +'</div>'
        +'</div>';

        var compatCityOptions = '<option value="">도시 선택</option>';
        if (typeof BIRTH_PLACE_GROUPS !== 'undefined' && BIRTH_PLACE_GROUPS.length) {
          BIRTH_PLACE_GROUPS.forEach(function(group){
            (group.places || []).forEach(function(p){
              var selected = '';
              if (window._ziweiInputMeta && window._ziweiInputMeta.placeLabel && window._ziweiInputMeta.placeLabel === p.label) selected = ' selected';
              compatCityOptions += '<option value="'+p.tz+'" data-long="'+p.lon+'" data-lat="'+p.lat+'" data-tz="'+p.tzOff+'" data-base-tz="'+p.tzOff+'"'+selected+'>'+p.label+'</option>';
            });
          });
        }

        var sec_compat = '<div class="zw-cosmic-card zw-compat-card report-card report-section love-card compatibility-card star-effect">'
          +'<div class="zw-cosmic-stars"></div>'
          +'<div style="position:absolute;inset:-42% auto auto -10%;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(196,181,253,0.15),rgba(196,181,253,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -16% -52% auto;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(192,132,252,0.12),rgba(192,132,252,0));pointer-events:none;"></div>'
          +'<div class="zw-cosmic-heading">'
            +'<h2 class="section-title love-title" style="font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">🧿 [자미두수 궁합]</h2>'
            +'<span class="zw-cosmic-chip">Galaxy Synastry</span>'
          +'</div>'
          +'<div class="card-content love-text" style="position:relative;z-index:1;background:rgba(35,24,56,0.46);border:1px solid rgba(216,180,254,0.24);border-radius:10px;padding:11px 12px;margin-bottom:10px;">'
            +'<div style="margin-bottom:8px;">상대방의 생년월일과 태어난 시간을 입력하면, 연애·결혼·친구·직장·사업 궁합을 계산하고 전생 인연은 별도 리포트로 분석합니다.</div>'
            +'<div class="zw-cosmic-input-grid">'
              +'<label class="zw-cosmic-field"><span>상대 생년월일</span><input id="zwCompatBirthDate" type="date" class="zw-cosmic-control"></label>'
              +'<label class="zw-cosmic-field"><span>상대 태어난 시간</span><input id="zwCompatBirthTime" type="time" value="12:00" class="zw-cosmic-control"></label>'
              +'<label class="zw-cosmic-field"><span>상대 태어난 도시</span><select id="zwCompatBirthCity" class="zw-cosmic-control">'+compatCityOptions+'</select></label>'
              +'<button type="button" onclick="window._runZwCompatibility()" class="zw-cosmic-btn">궁합 보기</button>'
            +'</div>'
            +'<div id="zwCompatTimeCorrectionInfo" style="margin-top:8px;color:#ddd6fe;font-size:0.82rem;line-height:1.6;background:rgba(30,20,50,0.48);border:1px solid rgba(196,181,253,0.24);border-radius:8px;padding:8px 10px;">도시 선택 시 진태양시 보정(경도·DST)을 자동 반영합니다.</div>'
          +'</div>'
          +'<div id="zwCompatResult" class="love-text" style="position:relative;z-index:1;background:rgba(20,14,36,0.55);border:1px dashed rgba(196,181,253,0.35);border-radius:10px;padding:11px 12px;color:#ddd6fe;font-size:0.86rem;line-height:1.7;">'
            +'아직 상대 정보가 입력되지 않았습니다. 입력 후 <b>궁합 보기</b> 버튼을 눌러 주세요.<br>'
            +'<span style="color:#a5b4fc;">카테고리: 연애 · 결혼 · 친구 · 직장 · 사업 + 전생 인연 분리 리포트</span>'
          +'</div>'
        +'</div>';

        var sec3 = '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">' +
          '<h2 style="color: #D8B4FE; font-size: 1.2rem; margin-top: 0;">🌊 [클릭한 궁의 대운 운기]</h2>' +
          '<div style="line-height: 1.7; margin: 0; font-size: 0.92rem; color:#e2e8f0;">' +
            '<div style="margin-bottom:8px;"><b>해당 궁의 대운 나이:</b> ' + curDaHan + '세 (' + pName + ' 운기)</div>' +
            '<div style="margin-bottom:8px;">' + coreLaw + '</div>' +
            '<div style="margin-bottom:10px;">' + sihuaText + '</div>' +
            '<div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);padding:9px 10px;border-radius:8px;margin-bottom:8px;">✅ <b>좋은 점:</b> ' + goodPoint + '</div>' +
            '<div style="background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.35);padding:9px 10px;border-radius:8px;margin-bottom:8px;">⚠️ <b>주의할 점:</b> ' + cautionPoint + '</div>' +
            '<div style="background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.35);padding:9px 10px;border-radius:8px;">🧭 <b>운세 조언:</b> ' + actionTip + '</div>' +
          '</div>' +
        '</div>';

        // ── 생애 총론 ──
        var STAR_DAHAN_KW = {
          '자미':'제왕의 기상으로 명예를 향해 나아가는 구조',
          '천기':'두뇌와 기획으로 쉼없이 진화하는 구조',
          '태양':'빛을 발하며 대중과 함께 성장하는 구조',
          '무곡':'강인한 실행력으로 재물을 구축하는 구조',
          '천동':'여유와 포용으로 안정 속에 행복을 쌓는 구조',
          '염정':'열정과 감각으로 화려한 무대를 지배하는 구조',
          '천부':'안정과 보수로 자산을 지키며 성장하는 구조',
          '태음':'섬세한 심미안으로 은밀히 부를 쌓는 구조',
          '탐랑':'다재다능과 사교력으로 기회를 창출하는 구조',
          '거문':'날카로운 통찰로 지식 자본을 쌓는 구조',
          '천상':'공정과 조화로 조직을 이끄는 구조',
          '천량':'포용과 解難으로 귀인 복덕을 쌓는 구조',
          '칠살':'독립과 돌파력으로 경계를 부수는 구조',
          '파군':'혁신과 변환으로 전혀 새로운 판을 여는 구조'
        };
        var mengStars = extractMains(getPStars('명궁'));
        var mengStarMain = mengStars[0] || '';
        var dirText = (pd.direction === 1) ? '순행(順行)' : '역행(逆行)';
        var juVal = pd.ju || 4;
        var lifeSentence = STAR_DAHAN_KW[mengStarMain] || '고유의 운명 패턴이 온화하게 전개되는 구조';
        var sihuaColors = {'화록':'#4ade80','화권':'#60a5fa','화과':'#c084fc','화기':'#f87171'};
        var sihuaSummary = [];
        if (pd.sihuaData) {
          for (var shStar in pd.sihuaData) {
            var shInfo = pd.sihuaData[shStar];
            var sc = sihuaColors[shInfo.type] || '#fff';
            sihuaSummary.push('<span style="color:'+sc+';font-weight:700;">'+shInfo.type+'</span> '+shStar+' ('+shInfo.palaceName+')');
          }
        }
        var sihuaTypeCnt = { '화록':0, '화권':0, '화과':0, '화기':0 };
        if (pd.sihuaData) {
          for (var shStar2 in pd.sihuaData) {
            var t = pd.sihuaData[shStar2] && pd.sihuaData[shStar2].type;
            if (sihuaTypeCnt.hasOwnProperty(t)) sihuaTypeCnt[t] += 1;
          }
        }
        var dominantSihuaType = '중립';
        var sihuaMax = 0;
        for (var siT in sihuaTypeCnt) {
          if (sihuaTypeCnt[siT] > sihuaMax) {
            sihuaMax = sihuaTypeCnt[siT];
            dominantSihuaType = siT;
          }
        }
        var destinyAxis = dominantSihuaType === '화록'
          ? '확장·회수 축(기회 포착형)'
          : (dominantSihuaType === '화권'
            ? '권한·주도 축(결정 실행형)'
            : (dominantSihuaType === '화과'
              ? '평판·정제 축(품질 수호형)'
              : (dominantSihuaType === '화기'
                ? '거문 봉인 축(보수 운행형)'
                : '균형·적응 축(상황 대응형)')));
        var destinyOps = dominantSihuaType === '화기'
          ? '핵심 의사결정은 지연 승인, 계약·자금은 다중 검증, 인간관계는 기록 중심으로 운행할수록 손실 방어력이 높아집니다.'
          : (dominantSihuaType === '화록' || dominantSihuaType === '화권' || dominantSihuaType === '화과'
            ? '강점 축 하나를 명확히 선정해 90일 단위 실행 계획으로 누적하면, 운세 파동이 실질 성과로 전환되는 속도가 빨라집니다.'
            : '변동성은 크지 않으므로 루틴·기본기·반복의 질을 높이는 운행이 장기 복리 효과를 만듭니다.');
        var sec_grand = '<div style="background:linear-gradient(135deg,rgba(88,28,220,0.15),rgba(20,10,50,0.8));padding:18px;border-radius:10px;margin-bottom:20px;border:1px solid rgba(139,92,246,0.3);">'
          +'<h2 style="color:#F9A8D4;font-size:1.2rem;margin-top:0;border-bottom:1px solid rgba(249,168,212,0.3);padding-bottom:8px;">🌟 생애 총론(生涯 總論)</h2>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.88rem;margin-bottom:12px;">'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">⚡ 오행국</div><div style="color:#fbbf24;font-weight:700;">'+(pd.juInfo||'-')+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">🔄 대한 진행</div><div style="color:#a78bfa;font-weight:700;">'+dirText+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">🎭 명궁(命宮)</div><div style="color:#ffd700;font-weight:700;">'+(pd.meng||'-')+' · '+(mengStarMain||'공궁')+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">✨ 신궁(身宮)</div><div style="color:#6ee7b7;font-weight:700;">'+(pd.shen||'-')+'</div></div>'
          +'</div>'
          +'<div style="font-size:0.9rem;line-height:1.78;color:#e2e8f0;display:flex;flex-direction:column;gap:8px;">'
            +'<div><b style="color:#f9a8d4;">타고난 운명의 기질:</b> 명궁 주성 '+(mengStarMain||'공궁')+'과 '+(pd.juInfo||'오행국')+'의 결합은 <b>'+lifeSentence+'</b>라는 장기 운행 패턴을 형성합니다.</div>'
            +'<div><b style="color:#f9a8d4;">전개 메커니즘:</b> <span style="color:#fbbf24;">'+juVal+'세</span> 起運 이후 대한이 '+dirText+'으로 작동하며, 초기 단기 선택보다 중장기 누적 천기의 영향력이 크게 작용합니다.</div>'
            +'<div><b style="color:#f9a8d4;">사화(四化) 구조 해석:</b> '+(sihuaSummary.length>0 ? sihuaSummary.join(' &nbsp;·&nbsp; ') : '직접 작동 강도가 약한 중립 배치')+'</div>'
            +'<div><b style="color:#f9a8d4;">운명 축 진단:</b> 현재 명식의 우세 축은 <b>'+destinyAxis+'</b>입니다. 이는 동일한 사건이라도 어떤 방식으로 성과/손실이 분기되는지를 결정하는 핵심 운행 변수입니다.</div>'
            +'<div><b style="color:#f9a8d4;">천기적 운용 원칙:</b> '+destinyOps+'</div>'
          +'</div>'
        +'</div>';

        // ── 12대한 타임라인 ──
        var PALACE_DAHAN_THEME = {
          '명궁':{icon:'🎭',kw:'자아 확립·독립 의지의 전성기'},
          '형제궁':{icon:'🤝',kw:'동료·협력자의 조력이 운명을 바꾸는 시기'},
          '부처궁':{icon:'💑',kw:'결혼·동반자·주요 파트너십의 핵심 분기점'},
          '자녀궁':{icon:'🌱',kw:'창의적 성취와 후계·자녀 인연이 집중'},
          '재백궁':{icon:'💰',kw:'수입·투자·자산 변동이 집약되는 국면'},
          '질액궁':{icon:'⚕️',kw:'건강과 내면 시련을 직면하며 다지는 시기'},
          '천이궁':{icon:'✈️',kw:'이직·이사·해외 확장의 큰 이동 개운 구간'},
          '노복궁':{icon:'👥',kw:'부하·조직·핵심 인맥 수호가 성패를 가름'},
          '관록궁':{icon:'💼',kw:'커리어·사업·사회적 명성이 집중 형성'},
          '전택궁':{icon:'🏠',kw:'부동산·고정자산·저축 여력의 확충 구간'},
          '복덕궁':{icon:'🍀',kw:'정신적 풍요·행복감·내면 성장의 시기'},
          '부모궁':{icon:'👪',kw:'부모 덕·윗사람 후원·문서 운이 집중'}
        };
        var dahanTimelineHtml = '';
        if (pd.daHanList && pd.daHanList.length > 0) {
          pd.daHanList.forEach(function(dh) {
            var dhRawStars = pd.stars[dh.idx];
            var dhMain = extractMains(dhRawStars);
            var dhBad  = extractBad(dhRawStars);
            var dhTheme = PALACE_DAHAN_THEME[dh.palaceName] || {icon:'🔮',kw:'고유한 운명 흐름의 구간'};
            var starKw = dhMain.length > 0 ? (STAR_DAHAN_KW[dhMain[0]] ? dhMain[0]+' — '+STAR_DAHAN_KW[dhMain[0]].split(' ')[0]+' 운' : dhMain[0]) : '공궁(유연한 변화)';
            var dhSihua = [];
            if (pd.sihuaData) {
              for (var shS in pd.sihuaData) {
                if (pd.sihuaData[shS].palaceIdx === dh.idx) dhSihua.push({star:shS, info:pd.sihuaData[shS]});
              }
            }
            var hasHwagi  = dhSihua.some(function(s){return s.info.type==='화기';});
            var hasHwaroc = dhSihua.some(function(s){return s.info.type==='화록';});
            var borderCol = hasHwagi ? 'rgba(248,113,113,0.6)' : (hasHwaroc ? 'rgba(74,222,128,0.6)' : 'rgba(139,92,246,0.25)');
            var bgCol     = hasHwagi ? 'rgba(248,113,113,0.07)' : (hasHwaroc ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.02)');
            var badges = dhSihua.map(function(s){
              var bc = sihuaColors[s.info.type]||'#fff';
              return '<span style="background:'+bc+'22;color:'+bc+';border:1px solid '+bc+'55;padding:1px 5px;border-radius:4px;font-size:0.68rem;font-weight:700;margin-left:4px;">'+s.info.type+'</span>';
            }).join('');
            dahanTimelineHtml +=
              '<div style="padding:9px 12px;border-left:3px solid '+borderCol+';background:'+bgCol+';border-radius:0 6px 6px 0;margin-bottom:5px;">'
                +'<div style="display:flex;justify-content:space-between;align-items:center;">'
                  +'<div><span style="color:#fbbf24;font-size:0.82rem;font-weight:700;">'+dh.startAge+'~'+dh.endAge+'세</span>'
                  +'<span style="color:#a78bfa;font-size:0.82rem;margin-left:8px;">│ '+dhTheme.icon+' '+dh.palaceName+'</span>'+badges+'</div>'
                  +'<span style="color:#94a3b8;font-size:0.73rem;">'+dh.zhi+'</span>'
                +'</div>'
                +'<div style="font-size:0.8rem;color:#cbd5e1;margin-top:3px;"><span style="color:#6ee7b7;">'+starKw+'</span> · '+dhTheme.kw+'</div>'
              +'</div>';
          });
        }
        var sec_dahan = '<div style="background:rgba(15,15,30,0.8);padding:18px;border-radius:10px;margin-bottom:20px;border:1px solid rgba(139,92,246,0.25);">'
          +'<h2 style="color:#6EE7B7;font-size:1.2rem;margin-top:0;border-bottom:1px solid rgba(110,231,183,0.3);padding-bottom:8px;">⏳ 대한(大限) 12단계 타임라인</h2>'
          +'<p style="font-size:0.78rem;color:#94a3b8;margin:0 0 10px;">각 대한은 약 10년 주기. <span style="color:#4ade80;">■</span>=화록(길기), <span style="color:#f87171;">■</span>=화기(흉기) 시기.</p>'
          +dahanTimelineHtml
        +'</div>';

        // ── 인생의 3대 변곡점 (항상 3개 산출) ──
        var pivotCandidates = [];
        if (pd.daHanList && pd.daHanList.length) {
          pd.daHanList.forEach(function(dh, dhOrderIdx) {
            var dhStars = pd.stars[dh.idx] || {main:[],aux:[],bad:[],borrowedMain:[]};
            var dhMainMeta = extractMainMeta(dhStars);
            var dhMain = dhMainMeta.map(function(m){ return m.name; });
            var dhBorrowed = dhMainMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
            var dhAux = uniqueList(extractAux(dhStars));
            var dhBad = uniqueList(extractBad(dhStars));

            var dhSihua = [];
            if (pd.sihuaData) {
              for (var shS2 in pd.sihuaData) {
                if (pd.sihuaData[shS2].palaceIdx === dh.idx) dhSihua.push({star:shS2, info:pd.sihuaData[shS2]});
              }
            }
            var hwagiList  = dhSihua.filter(function(s){ return s.info.type === '화기'; });
            var hwarokList = dhSihua.filter(function(s){ return s.info.type === '화록'; });
            var hwakwonList = dhSihua.filter(function(s){ return s.info.type === '화권'; });
            var hwakwaList = dhSihua.filter(function(s){ return s.info.type === '화과'; });

            var impactScore = 0;
            impactScore += hwagiList.length * 8;
            impactScore += hwarokList.length * 6;
            impactScore += hwakwonList.length * 5;
            impactScore += hwakwaList.length * 4;
            impactScore += dhBad.length * 2;
            impactScore += dhAux.length;
            impactScore += dhBorrowed.length * 2;
            if (['명궁','관록궁','재백궁','부처궁','천이궁'].indexOf(dh.palaceName) >= 0) impactScore += 2;

            var pivotType = 'turn';
            var icon = '🔀';
            if (hwagiList.length > 0 || dhBad.length >= 2) {
              pivotType = 'crisis';
              icon = '⚠️';
            } else if (hwarokList.length > 0 || hwakwonList.length > 0 || hwakwaList.length > 0 || dhAux.length >= 2) {
              pivotType = 'chance';
              icon = '⭐';
            }

            var mainLabel = dhMain.length ? dhMain.join(' · ') : '공궁(空宮)';
            var borrowedLabel = dhBorrowed.length
              ? ('차성 반영: '+dhBorrowed.join(' · '))
              : '차성 반영: 없음(원성 중심)';
            var sihuaLabel = dhSihua.length
              ? dhSihua.map(function(s){ return s.star+' '+s.info.type; }).join(' · ')
              : '사화 직접 작용 약함';
            var phaseDirective = pivotType === 'crisis'
              ? '거문 봉인'
              : (pivotType === 'chance' ? '확장' : '전환');

            var focusMap = {
              '명궁':'브랜딩/핵심 역할 재정의',
              '관록궁':'직무 권한/핵심 프로젝트',
              '재백궁':'수익 모델/현금흐름 구조',
              '부처궁':'동반자 협업/의사결정 룰',
              '전택궁':'자산 배치/주거-재무 정렬',
              '천이궁':'이동/해외/채널 확장',
              '복덕궁':'멘탈 회복력/고품질 루틴',
              '노복궁':'팀 빌드/핵심 인재 배치'
            };
            var leverageMap = {
              '명궁':'평판 자산과 개인 브랜드',
              '관록궁':'권한 위임과 실행 인력',
              '재백궁':'현금/계약/회수 사이클',
              '부처궁':'파트너 신뢰와 역할 분담표',
              '전택궁':'고정자산과 방어 자금',
              '천이궁':'외부 네트워크와 신규 시장',
              '복덕궁':'휴식 루틴과 컨디션 수호',
              '노복궁':'협업 체계와 운영 절차'
            };

            var step1 = (phaseDirective === '확장'
              ? '상승 탄력이 붙는 '+(focusMap[dh.palaceName] || '핵심 과제')+' 분야에 자원을 집중하세요. 리소스 분산 금지, 1개 트랙 집중이 승률을 높입니다.'
              : (phaseDirective === '거문 봉인'
                ? '손실 확률이 큰 영역부터 먼저 잠그세요. '+(focusMap[dh.palaceName] || '핵심 과제')+' 관련 의사결정은 사전 성문 점검표 없이는 실행하지 않는 룰이 필요합니다.'
                : '구조 전환이 필요한 구간입니다. '+(focusMap[dh.palaceName] || '핵심 과제')+'를 중심으로 역할/우선순위를 재설계하세요.'));
            var step2 = (phaseDirective === '확장'
              ? '레버리지는 '+(leverageMap[dh.palaceName] || '핵심 자산')+'입니다. 사람/자산 중 성과 변환율이 높은 한 축에 예산과 시간을 몰아주세요.'
              : (phaseDirective === '거문 봉인'
                ? '리소스 운용은 보수적으로 전환하세요. 코드 리뷰하듯 계약·투자·인사 의사결정을 2인 검증 체계로 통과시키는 방식이 안전합니다.'
                : '리소스는 병행보다 직렬 처리로 전환하세요. 중복 프로젝트를 줄이고 핵심 실행선 1~2개만 유지해야 전환비용이 감소합니다.'));
            var step3 = (phaseDirective === '확장'
              ? '성과 회수 시점은 영험 지표가 2회 연속 목표치를 달성한 직후입니다. 이익 일부를 회수해 방어 자산으로 이동하면 상승장의 변동성을 흡수할 수 있습니다.'
              : (phaseDirective === '거문 봉인'
                ? '성과 회수 기준을 숫자로 고정하세요. 손실 임계치 도달 시 즉시 중단(Stop-Loss), 감정 개입 없이 수호 절차대로 마무리합니다.'
                : '성과 회수는 재배치 완료 후 1분기 단위로 진행하세요. 전환기에는 속도보다 구조 안정화가 최우선입니다.'));

            var criticalIssue = '';
            if (hwagiList.length > 0) {
              criticalIssue = '화기 개입으로 오판/갈등이 누적될 수 있습니다. 빠른 결론 강요와 즉흥 결정은 손실 확률을 키웁니다.';
            } else if (dhBad.length >= 2) {
              criticalIssue = '흉성 압력으로 일정 지연·관계 마찰·비용 초과가 동시 발생할 수 있습니다. 특히 책임 경계가 모호하면 문제가 확대됩니다.';
            } else {
              criticalIssue = '대형 리스크는 낮지만 과신으로 인한 수호 누락이 위험 포인트입니다. 잘될수록 기준을 느슨하게 만들지 마세요.';
            }

            var protocol1 = hwagiList.length > 0
              ? '중요 의사결정은 24시간 냉각 후 재검토하고, 계약·금전 항목은 최소 2회 교차 검증합니다.'
              : '우선순위 3개를 고정하고, 범위 밖 요청은 다음 스프린트로 이관합니다.';
            var protocol2 = dhBad.length >= 2
              ? '갈등 조짐(말투/지연/회피) 발생 시 즉시 사실-감정 분리 회의를 열어 문제를 로그화합니다.'
              : '주간 리뷰에서 영험 지표 달성률과 거문 지표를 함께 점검해, 이상 징후를 조기 봉합합니다.';

            var oneLineAdvice = phaseDirective === '확장'
              ? '"지금은 속도전이 아니라 회수 설계까지 포함한 확장전이다."'
              : (phaseDirective === '거문 봉인'
                ? '"감정이 아니라 수호 의식이 당신의 자산을 지킨다."'
                : '"전환기의 승자는 빠른 사람이 아니라 구조를 먼저 고친 사람이다."');

            var title = dh.startAge+'~'+dh.endAge+'세 대한: '+dh.palaceName+' 변곡점';

            // 라이프스테이지 맥락 계산
            var _lsAge = dh.startAge;
            var _lifeStageInfo = _lsAge < 20
              ? { stage: '10대 · 청소년기 기초 형성', ctx: '진학·기초역량·자아 발견이 핵심 과제입니다.' }
              : (_lsAge < 30
                ? { stage: '20대 · 진입과 실험기', ctx: '첫 직장·연애·독립·자기 정체성 구축이 활발합니다.' }
                : (_lsAge < 40
                  ? { stage: '30대 · 기반 확립기', ctx: '커리어 발전·파트너십·자산 기반 형성의 전환점입니다.' }
                  : (_lsAge < 50
                    ? { stage: '40대 · 전성기와 재조정', ctx: '역할 정점·최대 책임·번아웃 주의·구조 재편이 필요합니다.' }
                    : (_lsAge < 60
                      ? { stage: '50대 · 리밸런싱기', ctx: '축적 결실·하향 선택·2막 설계·관계 재구성이 이뤄집니다.' }
                      : (_lsAge < 70
                        ? { stage: '60대 · 수확과 전수기', ctx: '성과 수확·역할 이양·레거시 설계·의미 중심 전환입니다.' }
                        : { stage: '70대+ · 완성과 유산기', ctx: '삶의 완성·관계 정리·정신적 유산 전승이 중심 과제입니다.' })))));

            pivotCandidates.push({
              key: String(dh.idx)+'_'+String(dhOrderIdx),
              type: pivotType,
              icon: icon,
              age: dh.startAge+'~'+dh.endAge,
              period: dh.startAge+'-'+dh.endAge,
              title: title,
              coreStars: mainLabel,
              borrowedLabel: borrowedLabel,
              sihuaLabel: sihuaLabel,
              phaseTheme: phaseDirective,
              step1: step1,
              step2: step2,
              step3: step3,
              criticalIssue: criticalIssue,
              protocol1: protocol1,
              protocol2: protocol2,
              oneLineAdvice: oneLineAdvice,
              score: impactScore,
              order: dhOrderIdx,
              lifeStage: _lifeStageInfo.stage,
              lifeCtx: _lifeStageInfo.ctx
            });
          });
        }

        var selectedPivots = [];
        if (pivotCandidates.length) {
          var bucketSize = Math.ceil(pivotCandidates.length / 3);
          for (var bi=0; bi<3; bi++) {
            var s = bi * bucketSize;
            var e = Math.min(pivotCandidates.length, s + bucketSize);
            if (s >= e) continue;
            var bucket = pivotCandidates.slice(s, e).sort(function(a,b){
              if (b.score !== a.score) return b.score - a.score;
              return a.order - b.order;
            });
            if (bucket.length) selectedPivots.push(bucket[0]);
          }
          if (selectedPivots.length < 3) {
            var used = Object.create(null);
            selectedPivots.forEach(function(p){ used[p.key] = 1; });
            pivotCandidates
              .slice()
              .sort(function(a,b){
                if (b.score !== a.score) return b.score - a.score;
                return a.order - b.order;
              })
              .forEach(function(c){
                if (selectedPivots.length >= 3) return;
                if (used[c.key]) return;
                used[c.key] = 1;
                selectedPivots.push(c);
              });
          }
          while (selectedPivots.length < 3 && pivotCandidates.length) {
            selectedPivots.push(pivotCandidates[Math.min(selectedPivots.length, pivotCandidates.length - 1)]);
          }
        }

        // 토글 함수: 재정의 허용(accordion 갱신 위해 매번 업데이트)
        window._toggleZwPivotCard = function(btn, bodyId) {
          var card = btn.closest ? btn.closest('.zw-pivot-card') : null;
          if (!card) return;
          var wasOpen = card.classList.contains('is-open');
          // 아코디언: 동일 deck 내 열린 카드 모두 닫기
          var deck = card.closest ? card.closest('.zw-pivot-deck') : null;
          var scope = deck || document;
          var openCards = scope.querySelectorAll('.zw-pivot-card.is-open');
          for (var oi = 0; oi < openCards.length; oi++) {
            openCards[oi].classList.remove('is-open');
            var ob = openCards[oi].querySelector('.zw-pivot-toggle');
            if (ob) ob.setAttribute('aria-expanded', 'false');
          }
          // 현재 카드 토글
          if (!wasOpen) {
            card.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
            setTimeout(function() {
              try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
            }, 60);
          }
        };

        var pivotHtml = '';
        var pivotStageLabels = ['초년 변곡점', '중년 변곡점', '후년 변곡점'];
        var pivotStageEmoji = ['🌱', '🌿', '🌳'];
        var pivotStageNums = ['①', '②', '③'];
        selectedPivots.slice(0,3).forEach(function(p, i){
          var isDefaultOpen = (i === 0);
          var bc = p.type==='crisis' ? '#f87171' : (p.type==='chance' ? '#4ade80' : '#a78bfa');
          var bcRgb = p.type==='crisis' ? '248,113,113' : (p.type==='chance' ? '74,222,128' : '167,139,250');
          var stageLabel = pivotStageLabels[i] || ('변곡점 '+(i+1));
          var stageEmoji = pivotStageEmoji[i] || '✦';
          var stageNum = pivotStageNums[i] || (i+1)+'';
          var cardId = 'zwPivotCard_'+p.key;
          // 궁 이름만 추출 (예: '23~32세 대한: 부처궁 변곡점' → '부처궁')
          var palaceLabel = p.title.replace(/\d+~\d+세 대한:\s*/, '').replace(/\s*변곡점$/, '');
          // 단계 유형 아이콘 텍스트
          var phaseTypeText = p.phaseTheme === '확장' ? '🚀 도약 & 확장 국면' : (p.phaseTheme === '거문 봉인' ? '🛡️ 수호 & 방어 국면' : '🔄 전환 & 재설계 국면');
          // 강도 백분율 (0~100)
          var scoreWidth = Math.min(100, Math.round((p.score / 30) * 100));
          // 주성 태그들
          var coreStarTags = p.coreStars !== '공궁(空宮)'
            ? p.coreStars.split(' · ').map(function(s){ return '<span class="zw-pv-star-tag">★ '+s+'</span>'; }).join('')
            : '<span class="zw-pv-star-tag" style="opacity:0.6;">공궁(空宮)</span>';
          // 사화 태그들
          var sihuaTags = '';
          if (p.sihuaLabel && p.sihuaLabel !== '사화 직접 작용 약함') {
            p.sihuaLabel.split(' · ').forEach(function(sh){
              var isHwagi = sh.indexOf('화기') >= 0;
              sihuaTags += '<span class="zw-pv-star-tag '+(isHwagi ? 'crisis' : 'chance')+'">'+sh+'</span>';
            });
          } else {
            sihuaTags = '<span style="font-size:0.72rem;color:#64748b;">사화 직접 작용 약함</span>';
          }
          pivotHtml += '<div class="zw-pivot-card'+(isDefaultOpen ? ' is-open' : '')+'" style="--pivot-accent:'+bc+';--pivot-rgb:'+bcRgb+';">'
            +'<button type="button" class="zw-pivot-toggle" aria-expanded="'+(isDefaultOpen ? 'true' : 'false')+'" onclick="window._toggleZwPivotCard(this, \''+cardId+'\')">'
              // 상단 줄: 순번 + 단계 뱃지 + 나이 범위 + 화살표
              +'<div class="zw-pv-top">'
                +'<div style="display:flex;align-items:center;gap:7px;">'
                  +'<span class="zw-pv-num-badge">'+stageNum+'</span>'
                  +'<span class="zw-pivot-chip">'+stageEmoji+' '+stageLabel+'</span>'
                +'</div>'
                +'<div class="zw-pv-top-right">'
                  +'<span class="zw-pivot-age-range">'+p.age+'세</span>'
                  +'<span class="zw-pivot-chevron" aria-hidden="true">▼</span>'
                +'</div>'
              +'</div>'
              // 메인 줄: 아이콘 + 궁 이름 + 유형 태그
              +'<div class="zw-pv-main">'
                +'<div class="zw-pivot-icon-wrap">'+p.icon+'</div>'
                +'<div class="zw-pivot-title-stack">'
                  +'<span class="zw-pivot-palace-label">'+palaceLabel+'</span>'
                  +'<span class="zw-pivot-type-tag">'+phaseTypeText+'</span>'
                +'</div>'
                +'<span class="zw-pv-tap-hint" aria-hidden="true">클릭해서 펼치기</span>'
              +'</div>'
              // 강도 게이지
              +'<div class="zw-pv-score-bar-wrap">'
                +'<div class="zw-pv-score-bar"><div class="zw-pv-score-fill" style="width:'+scoreWidth+'%"></div></div>'
                +'<span class="zw-pv-score-val">변곡 강도 '+scoreWidth+'%</span>'
              +'</div>'
            +'</button>'
            +'<div id="'+cardId+'" class="zw-pivot-body">'
              // 섹션 1: 핵심 성계 구성
              +'<div class="zw-pv-section">'
                +'<div class="zw-pv-section-title">🌟 핵심 성계 구성</div>'
                +'<div class="zw-pv-star-tags">'+coreStarTags+'</div>'
                +'<div class="zw-pv-star-tags">'+sihuaTags+'</div>'
                +'<div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">'+p.borrowedLabel+'</div>'
              +'</div>'
              // 섹션 2: 전략 조언
              +'<div class="zw-pv-section">'
                +'<div class="zw-pv-section-title">⚡ '+p.phaseTheme+' 단계 핵심 전략</div>'
                +'<ul class="zw-pv-strategy-list">'
                  +'<li class="zw-pv-strategy-item"><span class="zw-pv-strategy-num">1</span><span>'+p.step1+'</span></li>'
                  +'<li class="zw-pv-strategy-item"><span class="zw-pv-strategy-num">2</span><span>'+p.step2+'</span></li>'
                  +'<li class="zw-pv-strategy-item"><span class="zw-pv-strategy-num">3</span><span>'+p.step3+'</span></li>'
                +'</ul>'
              +'</div>'
              // 섹션 3: 리스크 경고
              +'<div class="zw-pv-risk">'
                +'<div class="zw-pv-risk-title">⚠️ 거문 파동 — 이 시기 주의 조언</div>'
                +'<div class="zw-pv-risk-text">'+p.criticalIssue+'</div>'
                +'<div class="zw-pv-protocol">🛡️ 대응 1: '+p.protocol1+'</div>'
                +'<div class="zw-pv-protocol" style="border-top:none;padding-top:3px;margin-top:2px;">🛡️ 대응 2: '+p.protocol2+'</div>'
              +'</div>'
              // 섹션 4: 한 줄 조언
              +'<div class="zw-pv-oneline">💬 '+p.oneLineAdvice+'</div>'
            +'</div>'
          +'</div>';
        });

        var sec_pivot = '<div class="zw-pivot-section">'
          +'<h2 class="zw-pivot-title">🔱 인생의 3대 변곡점</h2>'
          +'<p class="zw-pivot-sub">사화(四化), 주성/보조성/흉성, 차성(대궁 차용)을 통합 반영합니다. 카드를 하나씩 눌러 해당 시기의 핵심 성계 구성, 단계별 전략, 리스크 대응법을 확인하세요.</p>'
          +'<div class="zw-pivot-deck">'
          + pivotHtml
          +'</div>'
          +'</div>';

        var sec4 = '';

        var contentHtml = '';
        if (clickOnly) {
          contentHtml = '<div style="font-family:\'Suit\',sans-serif; background:#121212; color:#E2E8F0; padding:20px; border-radius:12px; width:100%; box-sizing:border-box;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:2px solid #8B5CF6;padding-bottom:12px;margin-bottom:16px;">'
            + '<h1 style="margin:0;color:#C084FC;font-size:1.2rem;">궁(宮) 해석 요약</h1>'
            + (showClose ? '<button type="button" class="zw-report-close-btn zw-summary-close-btn" onclick="window._closeZwDetailReport()">요약 닫기</button>' : '')
            + '</div>'
            + sec1
            + sec3
            + '</div>';
        } else {
          contentHtml = '<div style="font-family:\'Suit\',sans-serif; background:#121212; color:#E2E8F0; padding:20px; border-radius:12px; width:100%; box-sizing:border-box;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:2px solid #8B5CF6;padding-bottom:15px;margin-bottom:20px;">'
            + '<h1 style="margin:0;color:#C084FC;font-size:1.5rem;">자미두수 천명(天命) 종합 리포트</h1>'
            + (showClose ? '<button type="button" class="zw-report-close-btn" onclick="window._closeZwComprehensiveReport()">리포트 닫기 ✕</button>' : '')
            + '</div>'
            + sec_persona + sec_ability + sec_hidden_power + sec_love_compat_spread + sec_love + sec_compat + sec_grand + sec2 + sec_dahan + sec_pivot
            + '</div>';
        }

        var radarBaseLabels = {psy:['잠재력','리더십','회복탄력성','창의성','스트레스'],rel:['인복','결속력','이성매력','관계확장','마찰도'],fin:['수익창출','자산보존','직업안정','돌파력','파재손실'],time:['활동력','적응력','명예운','변화지수','돌발변수'],well:['신체강건','멘탈케어','면역력','행복지수','불안도']};   

        var labels = radarBaseLabels[theme] || radarBaseLabels['psy'];
        var mCnt = stars.main.length; var aCnt = stars.aux.length; var bCnt = stars.bad.length;
        var r1 = Math.min(100, 50 + mCnt*15 + aCnt*5);
        var r2 = Math.min(100, 60 + mCnt*10 + (pName==='명궁'?20:0));
        var r3 = Math.min(100, 40 + aCnt*20 + mCnt*5);
        var r4 = Math.min(100, 55 + (pName==='천이궁'||pName==='관록궁'?30:0));
        var r5 = Math.min(100, 20 + bCnt*25);

        var panelHtml = '';
        if (showRadar) {
          panelHtml = "<div class=\"zw-insight-layout\">"
            + "  <div class=\"zw-radar-col\">"
            + "    <div class=\"zw-radar-caption\">" + pName + " 에너지 스펙트럼</div>"
            + "    <div class=\"zw-radar-canvas-wrap\">"
            + "      <canvas id=\"zwRadarChart\"></canvas>"
            + "    </div>"
            + "  </div>"
            + "  <div class=\"zw-report-col\">"
            + "    " + contentHtml
            + "  </div>"
            + "</div>";
        } else {
          panelHtml = "<div>" + contentHtml + "</div>";
        }

        var wrapper = document.getElementById(targetPanelId);
        if (!wrapper) return;
        wrapper.innerHTML = panelHtml;

        // 첫 번째 변곡점 카드 자동 오픈 (UX: 내용이 있음을 즉시 인지)
        setTimeout(function() {
          var deck = wrapper.querySelector('.zw-pivot-deck');
          if (!deck) return;
          var firstCard = deck.querySelector('.zw-pivot-card');
          if (firstCard && !firstCard.classList.contains('is-open')) {
            firstCard.classList.add('is-open');
            var firstBtn = firstCard.querySelector('.zw-pivot-toggle');
            if (firstBtn) firstBtn.setAttribute('aria-expanded', 'true');
          }
        }, 120);

        if (typeof window._drawZwWuXingConstellation !== 'function') {
          window._drawZwWuXingConstellation = function(canvas, values) {
            if (!canvas || !values) return;
            var compactView = (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) || window.innerWidth <= 768;
            var dpr = window.devicePixelRatio || 1;
            if (compactView) dpr = Math.min(dpr, 1.25);
            var rect = canvas.getBoundingClientRect();
            var cw = Math.max(280, Math.round(rect.width || 460));
            var ch = Math.max(220, Math.round(rect.height || 320));
            canvas.width = Math.round(cw * dpr);
            canvas.height = Math.round(ch * dpr);
            var ctx2 = canvas.getContext('2d');
            if (!ctx2) return;
            ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

            var grad = ctx2.createLinearGradient(0, 0, 0, ch);
            grad.addColorStop(0, '#1f1b45');
            grad.addColorStop(0.52, '#1d2653');
            grad.addColorStop(1, '#111827');
            ctx2.fillStyle = grad;
            ctx2.fillRect(0, 0, cw, ch);

            var moonX = cw * 0.14;
            var moonY = ch * 0.17;
            ctx2.fillStyle = 'rgba(255,246,186,0.9)';
            ctx2.beginPath();
            ctx2.arc(moonX, moonY, Math.max(8, cw * 0.03), 0, Math.PI * 2);
            ctx2.fill();
            ctx2.fillStyle = 'rgba(31,27,69,1)';
            ctx2.beginPath();
            ctx2.arc(moonX + Math.max(4, cw * 0.012), moonY - 1, Math.max(7, cw * 0.027), 0, Math.PI * 2);
            ctx2.fill();

            for (var si = 0; si < (compactView ? 36 : 64); si += 1) {
              var sx = Math.random() * cw;
              var sy = Math.random() * ch;
              var sr = Math.random() * 1.5 + 0.2;
              ctx2.fillStyle = 'rgba(255,255,255,' + (0.18 + Math.random() * 0.6).toFixed(2) + ')';
              ctx2.beginPath();
              ctx2.arc(sx, sy, sr, 0, Math.PI * 2);
              ctx2.fill();
            }

            var cx = cw * 0.5;
            var cy = ch * 0.53;
            var outerR = Math.min(cw, ch) * 0.33;
            var order = ['earth','wood','fire','metal','water'];
            var angles = {
              earth: -Math.PI / 2,
              wood: -Math.PI / 10,
              fire: Math.PI * 0.32,
              metal: Math.PI * 0.88,
              water: Math.PI * 1.28
            };

            var outerPts = order.map(function(k){
              var a = angles[k];
              return { x: cx + Math.cos(a) * outerR, y: cy + Math.sin(a) * outerR, key: k };
            });

            ctx2.strokeStyle = 'rgba(186,230,253,0.34)';
            ctx2.lineWidth = 1.2;
            ctx2.setLineDash([3, 4]);
            ctx2.beginPath();
            outerPts.forEach(function(p, idx){
              if (idx === 0) ctx2.moveTo(p.x, p.y); else ctx2.lineTo(p.x, p.y);
            });
            ctx2.closePath();
            ctx2.stroke();
            ctx2.setLineDash([]);

            var dataPts = order.map(function(k){
              var a = angles[k];
              var rv = Math.max(18, Math.min(98, values[k] || 45));
              var r = outerR * (rv / 100);
              return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, key: k };
            });

            var fillGrad = ctx2.createRadialGradient(cx, cy, outerR * 0.15, cx, cy, outerR * 1.12);
            fillGrad.addColorStop(0, 'rgba(251,191,36,0.26)');
            fillGrad.addColorStop(0.5, 'rgba(125,211,252,0.26)');
            fillGrad.addColorStop(1, 'rgba(192,132,252,0.12)');
            ctx2.fillStyle = fillGrad;
            ctx2.strokeStyle = 'rgba(254,240,138,0.86)';
            ctx2.lineWidth = 2;
            ctx2.beginPath();
            dataPts.forEach(function(p, idx){
              if (idx === 0) ctx2.moveTo(p.x, p.y); else ctx2.lineTo(p.x, p.y);
            });
            ctx2.closePath();
            ctx2.fill();
            ctx2.stroke();

            outerPts.forEach(function(p){
              var g = ctx2.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
              g.addColorStop(0, 'rgba(255,250,204,0.98)');
              g.addColorStop(1, 'rgba(255,250,204,0)');
              ctx2.fillStyle = g;
              ctx2.beginPath();
              ctx2.arc(p.x, p.y, 11, 0, Math.PI * 2);
              ctx2.fill();
              ctx2.fillStyle = '#fde68a';
              ctx2.beginPath();
              ctx2.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
              ctx2.fill();
            });

            dataPts.forEach(function(p){
              ctx2.fillStyle = 'rgba(186,230,253,0.95)';
              ctx2.beginPath();
              ctx2.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
              ctx2.fill();
            });
          };
        }

        if (typeof window._drawZwLoveDestinyStar !== 'function') {
          window._drawZwLoveDestinyStar = function(canvas, metrics, pointDefs) {
            if (!canvas || !metrics || !pointDefs) return;
            var compactView = (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) || window.innerWidth <= 768;
            var dpr = window.devicePixelRatio || 1;
            if (compactView) dpr = Math.min(dpr, 1.25);
            var rect = canvas.getBoundingClientRect();
            var cw = Math.max(300, Math.round(rect.width || 920));
            var compact = cw < 520;
            var ch = Math.max(compact ? 250 : 280, Math.round(rect.height || (compact ? 320 : 380)));
            canvas.width = Math.round(cw * dpr);
            canvas.height = Math.round(ch * dpr);
            var ctx3 = canvas.getContext('2d');
            if (!ctx3) return;
            ctx3.setTransform(dpr, 0, 0, dpr, 0, 0);

            var bg = ctx3.createLinearGradient(0, 0, 0, ch);
            bg.addColorStop(0, '#19163f');
            bg.addColorStop(0.55, '#1d2a55');
            bg.addColorStop(1, '#0f172a');
            ctx3.fillStyle = bg;
            ctx3.fillRect(0, 0, cw, ch);

            for (var si2 = 0; si2 < (compact ? 34 : 66); si2 += 1) {
              var sx2 = Math.random() * cw;
              var sy2 = Math.random() * ch;
              var sr2 = Math.random() * 1.6 + 0.15;
              ctx3.fillStyle = 'rgba(255,255,255,' + (0.14 + Math.random() * 0.62).toFixed(2) + ')';
              ctx3.beginPath();
              ctx3.arc(sx2, sy2, sr2, 0, Math.PI * 2);
              ctx3.fill();
            }

            var cx = cw * 0.5;
            var cy = ch * 0.52;
            var baseR = Math.min(cw, ch) * (compact ? 0.25 : 0.28);

            if (!compact) {
              var leftClusterX = cw * 0.2;
              var rightClusterX = cw * 0.8;
              var clusterY = ch * 0.56;
              for (var ci = 0; ci < 7; ci += 1) {
                var ly = clusterY + (ci - 3) * 18;
                var lx = leftClusterX + (Math.sin(ci * 1.2) * 16);
                var rx = rightClusterX + (Math.cos(ci * 1.1) * 16);
                ctx3.fillStyle = 'rgba(125,211,252,0.9)';
                ctx3.beginPath();
                ctx3.arc(lx, ly, 2.1, 0, Math.PI * 2);
                ctx3.fill();
                ctx3.fillStyle = 'rgba(251,191,36,0.9)';
                ctx3.beginPath();
                ctx3.arc(rx, ly, 2.1, 0, Math.PI * 2);
                ctx3.fill();
                ctx3.strokeStyle = 'rgba(148,163,184,0.42)';
                ctx3.lineWidth = 1;
                ctx3.beginPath();
                ctx3.moveTo(lx, ly);
                ctx3.lineTo(cx - 35, cy + (ci - 3) * 8);
                ctx3.stroke();
                ctx3.beginPath();
                ctx3.moveTo(rx, ly);
                ctx3.lineTo(cx + 35, cy + (ci - 3) * 8);
                ctx3.stroke();
              }

              ctx3.fillStyle = 'rgba(219,234,254,0.85)';
              ctx3.font = '700 12px Pretendard, sans-serif';
              ctx3.fillText('A별자리', leftClusterX - 28, clusterY - 82);
              ctx3.fillText('B별자리', rightClusterX - 24, clusterY - 82);
            }

            var centerGlow = ctx3.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.2);
            centerGlow.addColorStop(0, 'rgba(254,249,195,0.38)');
            centerGlow.addColorStop(0.45, 'rgba(196,181,253,0.3)');
            centerGlow.addColorStop(1, 'rgba(196,181,253,0)');
            ctx3.fillStyle = centerGlow;
            ctx3.beginPath();
            ctx3.arc(cx, cy, baseR * 1.2, 0, Math.PI * 2);
            ctx3.fill();

            var starPts = [];
            for (var pi3 = 0; pi3 < pointDefs.length; pi3 += 1) {
              var pDef = pointDefs[pi3];
              var v = Math.max(35, Math.min(98, metrics[pDef.key] || 50));
              var amp = baseR * (0.45 + (v / 100) * 0.55);
              var ang = -Math.PI / 2 + (Math.PI * 2 * pi3 / pointDefs.length);
              starPts.push({
                x: cx + Math.cos(ang) * amp,
                y: cy + Math.sin(ang) * amp,
                a: ang,
                v: v,
                label: pDef
              });
            }

            var fillGrad2 = ctx3.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR * 1.1);
            fillGrad2.addColorStop(0, 'rgba(252,211,77,0.36)');
            fillGrad2.addColorStop(0.42, 'rgba(244,114,182,0.25)');
            fillGrad2.addColorStop(1, 'rgba(96,165,250,0.14)');
            ctx3.fillStyle = fillGrad2;
            ctx3.strokeStyle = 'rgba(254,240,138,0.92)';
            ctx3.lineWidth = 2.2;
            ctx3.beginPath();
            starPts.forEach(function(p, idx){
              if (idx === 0) ctx3.moveTo(p.x, p.y); else ctx3.lineTo(p.x, p.y);
            });
            ctx3.closePath();
            ctx3.fill();
            ctx3.stroke();

            ctx3.strokeStyle = 'rgba(191,219,254,0.5)';
            ctx3.lineWidth = 1.1;
            for (var k = 0; k < starPts.length; k += 1) {
              var next = (k + 2) % starPts.length;
              ctx3.beginPath();
              ctx3.moveTo(starPts[k].x, starPts[k].y);
              ctx3.lineTo(starPts[next].x, starPts[next].y);
              ctx3.stroke();
            }

            var labelPadding = compact ? 6 : 10;
            var placedLabelBoxes = [];
            function overlapBox(a, b) {
              return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
            }

            starPts.forEach(function(p){
              var glow = ctx3.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
              glow.addColorStop(0, 'rgba(255,248,220,0.98)');
              glow.addColorStop(1, 'rgba(255,248,220,0)');
              ctx3.fillStyle = glow;
              ctx3.beginPath();
              ctx3.arc(p.x, p.y, 12, 0, Math.PI * 2);
              ctx3.fill();
              ctx3.fillStyle = '#fde68a';
              ctx3.beginPath();
              ctx3.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
              ctx3.fill();

              var tx = cx + Math.cos(p.a) * (baseR * (compact ? 1.12 : 1.07));
              var ty = cy + Math.sin(p.a) * (baseR * (compact ? 1.12 : 1.07));
              ctx3.fillStyle = 'rgba(241,245,249,0.95)';
              ctx3.font = compact ? '700 10px Pretendard, sans-serif' : '700 12px Pretendard, sans-serif';
              var text = compact
                ? (p.label.icon + ' ' + p.v + '%')
                : (p.label.icon + ' ' + p.label.name + ' ' + p.v + '%');
              var tw = ctx3.measureText(text).width;
              var alignLeft = Math.cos(p.a) < -0.18;
              var alignRight = Math.cos(p.a) > 0.18;
              var drawX = alignLeft ? (tx - tw) : (alignRight ? tx : (tx - tw / 2));
              var drawY = ty + (Math.sin(p.a) > 0 ? (compact ? 10 : 12) : (compact ? -6 : -8));

              // Clamp text inside canvas to avoid clipping on narrow screens.
              drawX = Math.max(labelPadding, Math.min(cw - tw - labelPadding, drawX));
              drawY = Math.max(12, Math.min(ch - 8, drawY));

              // Very light collision avoidance by nudging overlapping labels.
              var box = { x: drawX - 2, y: drawY - (compact ? 9 : 11), w: tw + 4, h: compact ? 12 : 14 };
              for (var ai = 0; ai < 6; ai += 1) {
                var hasCollision = false;
                for (var bi = 0; bi < placedLabelBoxes.length; bi += 1) {
                  if (overlapBox(box, placedLabelBoxes[bi])) { hasCollision = true; break; }
                }
                if (!hasCollision) break;
                box.y += (Math.sin(p.a) >= 0 ? 10 : -10);
                box.y = Math.max(10, Math.min(ch - box.h - 4, box.y));
                drawY = box.y + (compact ? 9 : 11);
              }
              placedLabelBoxes.push(box);
              ctx3.fillText(text, drawX, drawY);
            });

            ctx3.fillStyle = 'rgba(251,191,36,0.95)';
            ctx3.font = compact ? '900 12px Pretendard, sans-serif' : '900 14px Pretendard, sans-serif';
            ctx3.textAlign = 'center';
            ctx3.fillText('LOVE DESTINY STAR', cx, cy + (compact ? 4 : 5));
            ctx3.textAlign = 'left';
          };
        }

        setTimeout(function(){
            if(shouldScroll && window.innerWidth < 768) {
               wrapper.scrollIntoView({behavior:'smooth', block:'start'});
            }

            var wuxingCanvas = wrapper.querySelector('#zwWuXingConstellation');
            if (wuxingCanvas) {
              window._drawZwWuXingConstellation(wuxingCanvas, personaWuxingData);
            }

            var loveStarCanvas = wrapper.querySelector('#zwLoveDestinyStarCanvas');
            if (loveStarCanvas) {
              window._drawZwLoveDestinyStar(loveStarCanvas, loveDestinyMetrics, loveDestinyPointList);
            }

            if (!showRadar) return;
            var radarCanvas = wrapper.querySelector('#zwRadarChart');
            if (!radarCanvas) return;
            var ctx = radarCanvas.getContext('2d');
            if(window.zwCurrentChart && typeof window.zwCurrentChart.destroy === 'function') window.zwCurrentChart.destroy();

            window.zwCurrentChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                label: pName + ' 스탯',
                data: [r1, r2, r3, r4, r5],
                backgroundColor: 'rgba(138, 43, 226, 0.4)',
                borderColor: 'rgba(212, 175, 55, 0.9)',
                pointBackgroundColor: '#FFD700',
                pointBorderColor: '#fff',
                borderWidth: 2,
                tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.15)' },
                    grid: { color: 'rgba(255, 255, 255, 0.15)', circular: true },
                    pointLabels: { color: '#E2E8F0', font: { size: 10, family: 'Pretendard' } },
                    ticks: { display: false, min: 0, max: 100 }
                }
                },
                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' } }
            }
            });
        }, 50);
    };

  }

  // 종합 리포트는 매 렌더 사이클마다 갱신해야 모바일 재진입 시 로딩 문구에 멈추지 않는다.
  var defaultIdx = (window._currentZiweiData && window._currentZiweiData.palacesByIndex)
    ? window._currentZiweiData.palacesByIndex.indexOf('명궁')
    : -1;
  if (defaultIdx < 0) defaultIdx = 0;
  if (typeof window._renderZwPanel === 'function' && window._currentZiweiData && window._currentZiweiData.stars && window._currentZiweiData.stars[defaultIdx]) {
    window._zwComprehensiveSeed = {
      idx: defaultIdx,
      pName: window._currentZiweiData.palacesByIndex[defaultIdx],
      stars: window._currentZiweiData.stars[defaultIdx],
      pd: window._currentZiweiData
    };
    window._renderZwPanel(
      defaultIdx,
      window._currentZiweiData.palacesByIndex[defaultIdx],
      window._currentZiweiData.stars[defaultIdx],
      window._currentZiweiData,
      { clickOnly: false, targetId: 'zwComprehensiveReport', showClose: true, showRadar: false, scroll: false }
    );
  }
}

/* ─── 사주 요약 박스 접기/펼치기 헬퍼 ─── */
function sbxToggle(id,btn){
  var el=document.getElementById(id);
  if(!el||!btn)return;
  var hidden=el.style.display==='none';
  el.style.display=hidden?'':'none';
  btn.textContent=hidden?'접기 ▲':'펼치기 ▼';
}

function renderSummary(p,johu,natal){
  var dg=p.d.g,dayMaster=p.d.gE||'earth';
  var health=HEALTH_DATA[dayMaster]||HEALTH_DATA.earth;
  var domE=natal.dominant;
  var tips=getGaeunTips(domE);

  var cnt={};
  [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
    var t=getTenGod(dg,c);if(t&&t!=='?')cnt[t]=(cnt[t]||0)+1;
  });
  var dominant=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];})[0]||'식신';
  var deep=TS_DEEP[dominant]||TS_DEEP['식신'];
  var tsInfo=TS_DB[dominant]||TS_DB['식신'];
  var dayNames={wood:'성장하는 나무',fire:'타오르는 불꽃',earth:'포용하는 대지',metal:'단단한 바위',water:'흐르는 강물'};
  var ratStr=Object.keys(natal.ratios).map(function(e){return EL_K[e]+' '+natal.ratios[e].toFixed(0)+'%';}).join(' · ');
  var pw=G_POWER,jg=G_JONG;

  /* ─── 섹션 빌더 헬퍼 ─── */
  var _bxCtr=0;
  function box(title,body,accent,bg){
    var bc=accent||'#bba371';var bkg=bg||'rgba(255,255,255,.85)';
    var id='sbx'+(++_bxCtr);
    return '<div class="prem-box" style="background:'+bkg+';border-left:4px solid '+bc+'">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:10px">'+
      '<span class="prem-title" style="border-color:'+bc+';margin-bottom:0;flex:1">'+title+'</span>'+
      '<button type="button" data-bxid="'+id+'" onclick="sbxToggle(this.dataset.bxid,this)" style="flex-shrink:0;background:none;border:1px solid rgba(150,150,150,.4);border-radius:4px;padding:2px 8px;font-size:.7rem;cursor:pointer;color:inherit;opacity:.7;white-space:nowrap;line-height:1.5">접기 ▲</button>'+
      '</div>'+
      '<div id="'+id+'" class="prem-text">'+body+'</div></div>';
  }
  function subHead(txt,c){return '<b style="font-size:.88rem;color:'+(c||'#444')+'">'+txt+'</b><br>';}
  function li(items){return '<ul style="margin:6px 0 6px 16px;padding:0;font-size:.85rem;line-height:1.78">'+items.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>';}
  function kv(k,v){return '<span style="display:inline-flex;gap:4px;margin:3px 0"><b style="color:#666;font-size:.8rem;min-width:72px">'+k+'</b><span style="color:#333;font-size:.84rem;line-height:1.58">'+v+'</span></span><br>';}

  /* ─── 데이터 맵 ─── */
  var EL_KO={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var ganChar={甲:'갑(甲) — 하늘을 향한 큰 나무',乙:'을(乙) — 휘어지는 덩굴',丙:'병(丙) — 뜨거운 태양',丁:'정(丁) — 은은한 촛불',戊:'무(戊) — 드넓은 대산',己:'기(己) — 비옥한 밭',庚:'경(庚) — 날선 큰 쇠',辛:'신(辛) — 정제된 보석',壬:'임(壬) — 거대한 강',癸:'계(癸) — 맑은 이슬'};
  var ganKeyword={甲:'추진력·독립·생명력',乙:'유연성·적응·감성',丙:'에너지·리더십·열정',丁:'섬세함·온기·신뢰',戊:'안정·포용·묵직함',己:'실용·세심·뒷받침',庚:'결단력·정직·직선',辛:'완벽주의·예민·예술',壬:'통찰·전략·유연',癸:'공감·깊이·지속'};
  var ganTalent={甲:'실행력, 대형 프로젝트 리딩, 스포츠·무대·사회운동',乙:'공감 마케팅, 컨설팅, 글쓰기·디자인·상담',丙:'동기부여, 무대 퍼포먼스, 미디어·방송·PR',丁:'심리치료, 교육, 수공예·뷰티·문화기획',戊:'장기 전략, 부동산·건설, 금융안정·자산관리',己:'사무·행정, 세무·회계, 의료보조·요식업·돌봄',庚:'법률·의료, 금융·보안, 기계·정밀 기술',辛:'쥬얼리·패션, 미용·예술, IT·IT보안',壬:'기획·전략, 외교·무역, 철학·심리',癸:'연구·분석, 상담·심리, 작가·시인·기록'};
  var ganWeakPoint={甲:'고집, 독선, 팀워크 부족',乙:'우유부단, 의존성, 소극적',丙:'충동, 에너지 낭비, 지속력 부족',丁:'소심, 자기비판 과도, 폭발 전 참기',戊:'변화 저항, 고집, 행동 느림',己:'자기 과소평가, 희생 과도, 결단력 부족',庚:'냉정함, 인간관계 어려움, 완고함',辛:'예민함, 비판 과민, 완벽주의 스트레스',壬:'산만함, 집중력 분산, 무계획',癸:'내성, 우유부단, 감상 과다'};
  var ganRel={甲:'동등한 파트너십, 친구형 연애',乙:'귀인 의지, 보호받는 연애',丙:'열렬하고 화끈한 연애',丁:'조용하고 진심 있는 연애',戊:'든든하고 책임감 있는 연애',己:'세심하게 챙기는 연애',庚:'정직하고 솔직한 연애',辛:'감각적이고 세련된 연애',壬:'지적이고 자유로운 연애',癸:'섬세하고 감성적인 연애'};

  // 십성별 재물 패턴
  var tsMoneyPattern={
    '비견':'수입은 안정적이나 고집으로 사업 손실 위험. 독립 창업이 직장보다 유리하고, 공동 투자는 피하세요.',
    '겁재':'큰 돈이 들어오나 도박·투기·연대보증으로 무너지기 쉽습니다. 반드시 강제저축 구조를 만드세요.',
    '식신':'노력한 만큼 꼭 돌아오는 성실형 재물. 하고 싶은 일로 먹고사는 구조가 가장 이상적입니다.',
    '상관':'아이디어와 창의력으로 수익을 냅니다. 충동 지출이 재물 손실의 가장 큰 구멍입니다.',
    '편재':'기회형 재물 — 보일 때 과감히 잡아야 합니다. 분산 투자가 맞으며 고정 자산 비중을 높이세요.',
    '정재':'성실하게 모아 지키는 재물. 안정적이지만 리스크를 완전 회피하면 큰 기회를 놓칩니다.',
    '편관':'명예를 통해 재물이 따라옵니다. 리더 역할을 맡을수록 수입이 올라가는 구조입니다.',
    '정관':'공직·대기업·전문직에서 안정적 수입. 부업보다는 본업 집중 전략이 효율적입니다.',
    '편인':'아이디어·특허·콘텐츠로 수익화가 유리합니다. 조급해하지 말고 긴 호흡으로 가세요.',
    '정인':'꾸준한 월급형 재물. 부동산·임대·교육 분야에서 안정적으로 자산을 키울 수 있습니다.'
  };

  // 십성별 인간관계 패턴
  var tsRelPattern={
    '비견':'경쟁자이자 동료. 나와 비슷한 사람이 가장 편하지만 독립심 때문에 갈등도 잦습니다.',
    '겁재':'카리스마로 사람을 모으나, 주변 사람에게 에너지를 뺏길 수 있습니다. 선 긋기 연습이 필요합니다.',
    '식신':'퍼주는 것에 익숙해 이용당할 수 있습니다. 베풀되 경계를 세우는 지혜가 필요합니다.',
    '상관':'언변으로 인기를 얻지만 적도 만들기 쉽습니다. 말의 부드러움이 관계의 핵심 열쇠입니다.',
    '편재':'넓게 사귀지만 깊이가 얕을 수 있습니다. 핵심 인맥 3~5명에게 집중 투자하세요.',
    '정재':'진지하고 신뢰 있는 관계를 선호합니다. 처음에는 경계가 강하지만 한번 마음을 열면 깊습니다.',
    '편관':'존경받지 못하면 관계가 깨집니다. 권위보다 공감으로 사람을 이끄는 법을 배우세요.',
    '정관':'원칙과 예의를 중시합니다. 불성실한 사람과는 자연히 멀어지는 경향이 있습니다.',
    '편인':'혼자 있는 것이 편하고 소수 정예 관계를 선호합니다. 먼저 다가가는 노력이 삶을 풍요롭게 합니다.',
    '정인':'귀인 복이 있어 좋은 스승·후원자를 만납니다. 받은 만큼 내려주는 베풂의 순환을 만드세요.'
  };

  // 십성별 시간대 최적 에너지
  var tsPeakTime={
    '비견':'이른 아침(5~8시) 혼자만의 루틴 설정, 독립 작업',
    '겁재':'경쟁자가 쉴 때 — 야간(22~1시) 집중 작업',
    '식신':'점심 전후(10~14시) 감각이 살아있는 창작·소통',
    '상관':'오후 늦은 시간(15~20시) 브레인스토밍·발표',
    '편재':'오전(9~12시) 빠른 판단과 네트워킹',
    '정재':'오전 집중 작업 후 오후 마감 체크',
    '편관':'위기·마감 순간에 집중력 극대화',
    '정관':'규칙적인 시간대 반복 루틴',
    '편인':'새벽(3~6시) 영감과 직관이 활성화',
    '정인':'오전 학습, 저녁 복습 루틴이 이상적'
  };

  // 재물운 수호 법칙
  var elMoneyAdvice={
    wood:'동쪽 방향·초록 계열 정리, 나무 화분을 책상 왼쪽에. 도장(인장)에 신경 쓰고 사인·계약서 꼼꼼히.',
    fire:'남쪽 방향, 붉은 소품 하나. 지갑은 붉은색 계열이 유리. 인맥으로 들어오는 기회를 놓치지 마세요.',
    earth:'노란·황금 계열 지갑, 북동쪽 방향 정리. 부동산·실물 자산 비중을 높이세요.',
    metal:'서쪽 방향·흰색·금속 소품. 지갑을 자주 정리하고 동전은 지갑에 보관하지 마세요.',
    water:'북쪽 방향·파란색 계열. 흐르는 물 이미지(분수, 수족관) 인테리어. 저축 자동이체 필수.'
  };

  // 귀인 유형
  var guiinByDom={
    wood:'창의적이고 추진력 있는 선배나 멘토. 나무처럼 성장을 돕는 교육·문화계 인물.',
    fire:'열정적인 리더나 PR 전문가. 당신을 세상에 알려주는 화(火) 에너지의 인물.',
    earth:'든든한 현실 조언을 주는 연장자. 부동산·금融 분야 인맥이 자산을 지켜줍니다.',
    metal:'날카로운 조언과 정확한 피드백을 주는 법률·의료·기술 분야 전문가.',
    water:'깊은 통찰을 나눠주는 학자나 철학자, 상담가. 조용히 당신의 깊은 면을 알아봐 주는 인물.'
  };

  // 인생 전략 요약
  var lifeStrategyByTs={
    '비견':'1조 전략 — 독립, 전문성, 브랜딩. 나만의 분야에서 최고가 되는 것이 유일한 성공 공식입니다.',
    '겁재':'경쟁 우위 전략 — 남들이 쉴 때 다음 수를 준비하세요. 단, 도박·보증은 절대 금지.',
    '식신':'콘텐츠 복지 전략 — 내가 좋아하는 일로 수익 구조를 만드세요. 음식·교육·돌봄 분야가 유리.',
    '상관':'혁신가 전략 — 기존 틀을 깨는 아이디어로 승부하세요. 단, 표현의 타이밍과 강도를 조절하세요.',
    '편재':'기회 포착 전략 — 정보 수집과 빠른 판단이 핵심. 해외·다양성·네트워크에서 기회가 옵니다.',
    '정재':'복리 전략 — 작은 것을 오래 꾸준히 쌓으세요. 신뢰와 성실함이 당신의 최대 자산입니다.',
    '편관':'리더십 전략 — 위기 때 능력이 빛납니다. 책임있는 역할을 맡을수록 운이 열립니다.',
    '정관':'명예 전략 — 평판과 신뢰가 당신의 운입니다. 원칙을 지키되 결코 융통성을 잃지 마세요.',
    '편인':'통찰 전략 — 남들이 보지 못한 길을 먼저 보고 가세요. 특허·저작권·콘텐츠에 투자하세요.',
    '정인':'수용 전략 — 배움은 당신의 평생 자산입니다. 좋은 스승을 찾아 배우고, 그것을 나눠주세요.'
  };

  var html='';

  /* ───────────────────────────────
     1. 사주 총평 & 일간 분석
  ─────────────────────────────── */
  html+=box('🌿 ① 나의 사주 총평 — 일간(日干) '+dg+' 풀이',
    subHead('일간 근본 기운','#2e7d32')+
    kv('일간','<b>'+dg+' ('+dayMaster+')</b> — '+(ganChar[dg]||dg))+
    kv('핵심 키워드',ganKeyword[dg]||'추진력·독립')+
    kv('천생 재능',ganTalent[dg]||'다방면에서 두각')+
    kv('약점 포인트',ganWeakPoint[dg]||'균형 조율 필요')+
    kv('연애 스타일',ganRel[dg]||'진심 있는 연애')+
    '<br><div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px;font-size:.85rem;line-height:1.78;color:#333">'+
    '당신은 자연으로 치면 <b>\''+dayNames[dayMaster]+'\'</b>과 같습니다. '+
    '오행 중 <b>'+EL_KO[dayMaster]+'</b> 에너지를 주 기반으로 삼아, 세상을 인식하고 반응합니다. '+
    '이 기운이 지나치게 강하면 집착·고집·과잉으로, 너무 약하면 자신감 부족·우유부단으로 나타납니다. '+
    '적절한 균형이 삶 전체의 여유를 만듭니다.</div>',
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     2. 조후 & 억부 & 종격
  ─────────────────────────────── */
  html+=box('🌡️ ② 조후(調候) 판정 — 계절 에너지 분석',
    '<span class="johu-badge '+johu.badgeCls+'">'+johu.badgeTxt+'</span><br>'+
    johu.advice+'<br><br>'+
    subHead('조후(調候)란 무엇인가','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '조후는 사주의 계절적 균형을 분석하는 명리학의 핵심 이론입니다. 생월(태어난 달)이 결정하는 계절에 따라 사주 전체의 차갑고 따뜻함의 균형이 달라집니다. 여름 사주(巳·午·未월 출생)는 이미 화(火) 기운이 과잉이므로 차고 적신 수(水)와 금(金) 기운이 용신이 됩니다. 반대로 겨울 사주(亥·子·丑월 출생)는 수(水)가 강해 화(火)와 목(木)으로 온기를 보강해야 합니다. 조후가 맞는 운이 들어올 때 삶의 전반적인 컨디션이 좋아지고 사업·건강·대인관계가 유연해집니다. 조후가 어긋난 운에는 의욕 저하나 건강 이상으로 나타날 수 있으니, 대운 해석 시 반드시 조후를 먼저 체크해야 합니다.</div>'+
    '<br>'+subHead('실생활 적용법','#1976D2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '조후 조절은 거창한 변화가 아니라 일상의 작은 선택에서 시작합니다. 자신의 조후에 맞는 색상, 음식, 방향, 활동을 의식적으로 선택하면 에너지 균형이 잡히고 삶의 흐름이 부드러워집니다. 아래 개운 파트에서 구체적인 조후 맞춤 개운법을 확인하세요.</div>',
    '#2196F3','rgba(227,242,253,.7)');

  html+=box('⚖️ ③ 억부(抑扶) & 종격(從格) 심층 분석',
    (jg&&jg.isJong
      ?'<b>'+jg.name+'</b> — '+EL_KO[jg.dominant]+' 기운 '+jg.pct+'% 지배<br>'+
       '<div style="margin-top:6px;font-size:.85rem;line-height:1.78">이 사주는 하나의 기운이 사주 전체를 압도하는 <b>종격 사주</b>입니다. '+
       '억부(신강/신약) 원칙을 우선적으로 배제하고, '+EL_KO[jg.dominant]+' 에너지를 돕는 운이 길(吉)하고, 거스르는 운은 흉(凶)합니다.<br><br>'+
       '✓ 종격이란? — 오행 중 한 가지가 75% 이상을 차지할 때, 그 기운에 순응하는 것이 원칙입니다. 역행은 오히려 파국을 부릅니다.</div>'
      :pw
        ?'<span class="power-badge '+(pw.isStrong?'pb-strong':'pb-weak')+'" style="font-size:.78rem;padding:3px 10px">'+(pw.isStrong?'🔥 신강':'💧 신약')+'</span>'+
         '<div style="margin-top:8px;font-size:.85rem;line-height:1.78">억부 점수: <b>'+pw.score+'점</b><br><br>'+
         (pw.isStrong
           ?'<b>신강</b>이란 일간이 원국에서 도움받는 기운이 탄탄한 사주입니다. 에너지가 넘쳐 설기(洩氣)·재(財)·관(官)으로 빠져나가는 운이 올 때 사회적 성취가 폭발합니다.<br>'+
            '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
            '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', ')
           :'<b>신약</b>이란 일간이 외부 압박에 비해 자체 에너지가 부족한 사주입니다. 비겁(비견·겁재)이나 인성(편인·정인)이 오는 운에서 자존감과 귀인이 동시에 옵니다.<br>'+
            '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
            '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', '))+
         '</div>'
        :'억부 계산 중 또는 사주 데이터가 부족합니다.'),
    '#9C27B0','rgba(243,229,245,.7)');

  /* ───────────────────────────────
     3. 오행 분포
  ─────────────────────────────── */
  var ratioBar='<div style="display:grid;gap:4px;margin-top:8px">';
  ['wood','fire','earth','metal','water'].forEach(function(el){
    var pct=Math.round(natal.ratios[el]||0);
    var color={wood:'#4CAF50',fire:'#FF5722',earth:'#FF9800',metal:'#78909C',water:'#2196F3'}[el]||'#999';
    ratioBar+='<div style="display:flex;align-items:center;gap:6px;font-size:.81rem">'+
      '<span style="min-width:28px;text-align:right;color:#666">'+EL_K[el]+'</span>'+
      '<div style="flex:1;height:8px;background:#f0f0f0;border-radius:4px">'+
        '<div style="width:'+Math.min(pct,100)+'%;height:100%;background:'+color+';border-radius:4px;transition:width .5s"></div>'+
      '</div>'+
      '<span style="min-width:30px;font-weight:700;color:'+color+'">'+pct+'%</span>'+
    '</div>';
  });
  ratioBar+='</div>';

  html+=box('🧭 ④ 오행 분포 & 균형 진단',
    (natal.counts[domE]>=5?'🔴 <b>'+EL_K[domE]+' 기운이 매우 강하게 편중</b>되어 있어요! 반드시 균형 조절이 필요합니다.'
      :natal.counts[domE]>=4?'🟠 <b>'+EL_K[domE]+' 기운이 강하게 쏠려</b> 있습니다. 적극적인 균형 조절을 권합니다.'
      :natal.counts[domE]>=3?'🟡 <b>'+EL_K[domE]+' 기운이 다소 강하게 자리</b>잡고 있습니다. 의식적인 균형이 도움이 됩니다.'
      :'🟢 오행이 비교적 고르게 분포되어 있습니다. 균형잡힌 사주입니다.')+
    ratioBar+
    '<div style="margin-top:10px;font-size:.84rem;line-height:1.78">'+
    kv('오행 비율',ratStr)+
    kv('개운 핵심','강한 <b>'+EL_K[domE]+'</b> 기운이 폭주하지 않게, '+
        '<b>'+EL_K[tips.controller]+'</b>(극)과 <b>'+EL_K[tips.drain]+'</b>(설기)으로 눌러주세요.')+
    '</div>',
    '#FF9800','rgba(255,243,224,.7)');

  /* ───────────────────────────────
     4. 십성(十星) 심층 분석
  ─────────────────────────────── */
  var tsFullList=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
  var tsRankHtml='<div style="display:grid;gap:6px;margin:8px 0">';
  tsFullList.slice(0,5).forEach(function(t,i){
    var info=TS_DB[t]||{emoji:'⭐',desc:'',meaning:''};
    var pct=Math.round((cnt[t]/(tsFullList.length||1))*100);
    tsRankHtml+='<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.6)">'+
      '<span style="font-size:1.1rem">'+info.emoji+'</span>'+
      '<span style="font-weight:700;min-width:32px;font-size:.85rem">'+t+'</span>'+
      '<span style="font-size:.8rem;color:#555;flex:1">'+info.meaning+'</span>'+
      '<span style="font-weight:800;color:#7c3aed;font-size:.85rem">'+cnt[t]+'개</span>'+
    '</div>';
  });
  tsRankHtml+='</div>';

  html+=box('⭐ ⑤ 십성(十星) 심층 분석 — 내 삶의 에너지 구성',
    subHead('보유 십성 랭킹','#5c35c8')+
    tsRankHtml+
    '<br>'+subHead('주 십성 '+dominant+' — 성향 상세','#7c3aed')+
    '<div style="font-size:.85rem;line-height:1.78;margin-top:4px">'+
    kv('본질',deep.nature)+
    kv('진로 적성',deep.career)+
    kv('연애 스타일',deep.love)+
    kv('주의사항',deep.advice||'주어진 환경에 유연하게 적응하세요')+
    kv('재물 패턴',tsMoneyPattern[dominant]||'성실함이 재물의 기반입니다')+
    kv('인간관계',tsRelPattern[dominant]||'신뢰 기반 관계를 우선하세요')+
    kv('에너지 피크',tsPeakTime[dominant]||'아침 루틴이 하루를 좌우합니다')+
    kv('인생 전략',lifeStrategyByTs[dominant]||'강점에 집중하세요')+
    '</div>',
    '#7c3aed','rgba(237,233,254,.7)');

  /* ───────────────────────────────
     5. 성격·기질 심층 분석
  ─────────────────────────────── */
  var personalityByGan={
    甲:'표면적으로는 느긋해 보이지만, 한 번 결심하면 포기를 모릅니다. 경쟁 상황에서 진가가 드러나며 리더 자리를 자연스럽게 차지합니다. 고집스러울 수 있으나 그것이 오히려 큰 성공의 원동력이 됩니다.',
    乙:'눈치가 빠르고 환경 적응력이 탁월합니다. 부드럽게 스며들어 상대방을 내 편으로 만드는 재주가 있습니다. 갈등을 정면으로 맞서기보다 우회하는 전략을 선호합니다.',
    丙:'에너지가 넘쳐흐르고 주변을 환하게 밝히는 존재감이 있습니다. 말이 많고 솔직하며 감정 표현이 풍부합니다. 지루함을 못 견디고 새로운 자극을 끊임없이 찾습니다.',
    丁:'겉으로는 조용하지만 내면에 뜨거운 열정이 있습니다. 감수성이 풍부하고 배려심이 깊습니다. 한 번 상처받으면 오랫동안 기억하는 편입니다.',
    戊:'흔들리지 않는 내면의 안정감이 있습니다. 묵직하고 신뢰감을 주며 약속과 책임을 중시합니다. 변화에 느리게 반응하지만 일단 행동하면 멈추지 않습니다.',
    己:'세밀하고 실용적인 눈이 있습니다. 남을 뒤에서 지원하고 도우면서 실질적인 결과를 만들어내는 타입입니다. 자신의 공로를 드러내지 않지만 핵심 역할을 합니다.',
    庚:'직선적이고 결단력이 강합니다. 불합리한 것을 보면 참지 못하고 직접 해결하려 합니다. 냉정해 보이지만 의리와 책임감이 강한 사람입니다.',
    辛:'예리하고 미적 감각이 뛰어납니다. 완벽주의 성향으로 자신과 타인에게 높은 기준을 적용합니다. 표면적으로는 차가워 보여도 속으로는 매우 감성적입니다.',
    壬:'시야가 넓고 전략적으로 사고합니다. 감정을 잘 드러내지 않지만 내면은 깊습니다. 한 가지 일보다 여러 프로젝트를 동시에 처리하는 능력이 있습니다.',
    癸:'공감 능력이 뛰어나고 섬세합니다. 다른 사람의 감정을 빠르게 포착하고 적절히 반응합니다. 내향적으로 보이지만 일대일 관계에서는 매우 깊고 따뜻합니다.'
  };

  var charBoxDetail={
    甲:'갑목(甲木)은 하늘을 향해 뻗는 거대한 나무입니다. 일단 목표가 정해지면 흔들리지 않고 전진하는 강력한 의지가 있습니다. 주변의 방해나 비판에도 굴하지 않는 추진력은 큰 프로젝트를 완수하는 데 최적화된 기질입니다. 하지만 이 강인함이 고집과 독선으로 흐르면 팀워크가 무너지고 갈등이 잦아집니다. 의견 충돌 시 자신이 반드시 옳아야 한다는 강박을 내려놓는 것이 가장 중요한 성장 포인트입니다. 또한 독립심이 지나쳐 도움 요청을 스스로 차단하는 경향이 있는데, 진짜 강한 사람은 협력할 줄 아는 사람임을 기억하세요. 경쟁 상황에서 진가가 나타나며, 안정된 환경에만 있으면 오히려 능력이 둔화됩니다.',
    乙:'을목(乙木)은 환경에 따라 유연하게 흔들리면서도 결코 끊어지지 않는 덩굴 식물입니다. 뛰어난 공감 능력과 적응력으로 어떤 조직에서도 부드럽게 스며들어 핵심 역할을 합니다. 정면 돌파보다 우회 전략을 선호하고, 이는 때로 소극적이거나 우유부단하다는 오해를 사기도 합니다. 결정의 순간에 타인의 눈치를 너무 많이 보면 기회를 놓칩니다. 자신의 판단을 믿는 연습이 필요합니다. 인간관계에서는 상대방을 편하게 만드는 재주가 탁월하며, 그로 인해 감정 에너지를 지나치게 소모하는 경향이 있습니다. 자신만의 경계를 세우는 것이 지속 가능한 삶의 핵심입니다.',
    丙:'병화(丙火)는 뜨거운 태양입니다. 에너지가 넘치고 주변을 환하게 밝히는 존재감으로 어디서든 중심이 됩니다. 솔직하고 직접적인 표현 방식 덕에 인기를 얻지만, 동시에 감정 기복이 크고 충동적 결정을 내리기 쉽습니다. 시작은 화끈하지만 지속력이 부족한 것이 가장 큰 약점입니다. 에너지를 한 곳에 오래 집중하는 훈련이 필요합니다. 쉽게 흥미를 잃고 새로운 자극을 찾아다니는 성향 때문에 결실을 보기 직전에 포기하는 패턴이 반복될 수 있습니다. 태양도 밤이 있어야 쉬듯, 자신을 돌보고 재충전하는 시간이 반드시 필요합니다.',
    丁:'정화(丁火)는 은은하게 타오르는 촛불입니다. 겉으로는 조용하지만 내면에는 뜨거운 열정과 섬세한 감수성이 있습니다. 한 번 신뢰를 쌓은 관계에서는 놀라운 충성심과 배려를 보입니다. 상처를 받으면 오랫동안 잊지 못하고, 갈등을 피하기 위해 감정을 억누르다 일정 수준에서 폭발하는 패턴이 있습니다. 감정을 억누르지 말고 적절히 표현하는 연습이 필요합니다. 타인의 평가에 지나치게 예민해 자기비판이 심해질 수 있으며, 이는 스트레스와 번아웃으로 이어집니다. 자신의 가치를 타인의 평가가 아닌 내면의 기준으로 판단하는 습관이 중요합니다.',
    戊:'무토(戊土)는 드넓은 대산(大山)과 같습니다. 그 어떤 것도 받아들이는 포용력과 흔들리지 않는 안정감이 이 사주의 가장 큰 자산입니다. 약속과 책임을 무엇보다 중시하며, 신뢰할 수 있는 사람으로 알려져 있습니다. 그러나 변화에 저항하는 경향이 강하고, 새로운 환경에 적응하는 속도가 느립니다. 기회의 시간이 왔을 때 망설이다 놓치는 경우가 많습니다. 일단 행동하면 멈추지 않는 끈기가 있으니, 행동을 시작하는 타이밍을 앞당기는 것이 성공의 열쇠입니다. 변화를 두려워하지 말고, 의도적으로 새로운 경험을 정기적으로 시도하세요.',
    己:'기토(己土)는 비옥한 밭입니다. 세밀하고 실용적인 눈으로 주변 사람의 필요를 파악하고 뒤에서 든든하게 지원합니다. 자신의 공로를 드러내지 않아 저평가받는 경우가 많지만, 조직의 실질적인 중심 역할을 합니다. 남을 너무 챙기다 정작 자기 자신을 잃어버리는 것이 가장 큰 위험입니다. 자기 과소평가와 과도한 희생이 패턴화되면 번아웃이 옵니다. 당신이 먼저 행복하고 건강해야 남을 제대로 도울 수 있습니다. 결단력이 부족한 면이 있으니, 중요한 결정의 데드라인을 스스로 설정하는 습관을 들이세요.',
    庚:'경금(庚金)은 날 선 큰 쇠입니다. 직선적이고 결단력이 강하며, 불합리한 상황을 보면 참지 못하고 직접 해결에 나섭니다. 이 솔직함이 신뢰를 쌓는 힘이 되지만, 동시에 인간관계를 어렵게 만드는 요인이 됩니다. 너무 날이 서면 주변 사람이 상처를 받습니다. 감정을 전달하는 방식에 부드러움을 더하는 것이 관계 개선의 핵심입니다. 의리와 책임감이 강해 위기 순간에 진가를 발휘하며, 냉정한 판단력으로 복잡한 문제를 단순화합니다. 다만 완고함이 문제 해결을 방해할 때는 전략적으로 유연성을 발휘하세요.',
    辛:'신금(辛金)은 정제된 보석입니다. 예리하고 미적 감각이 뛰어나며, 완벽주의 성향으로 자신과 타인 모두에게 높은 기준을 적용합니다. 이 섬세함이 창의적 결과물의 품질을 높이지만, 스스로를 끊임없이 옥죄는 스트레스 원인이 됩니다. 70%의 완성도에서도 세상에 내보이는 용기가 필요합니다. 표면적으로는 차가워 보이지만 속으로는 매우 감성적이라, 신뢰하는 사람에게는 깊은 유대감을 형성합니다. 비판에 과민 반응하는 경향이 있으니, 피드백을 성장의 데이터로 받아들이는 연습을 하세요. 자신의 기준을 낮추는 것이 아니라 타인의 다름을 인정하는 것이 성숙의 과정입니다.',
    壬:'임수(壬水)는 거대한 강물입니다. 막히면 돌아가는 유연함과 결코 멈추지 않는 끈질김을 동시에 갖추고 있습니다. 시야가 넓고 전략적 사고가 탁월하며, 여러 분야를 동시에 처리하는 능력이 있습니다. 그러나 이 광활함이 에너지를 분산시켜 깊이가 없어지는 문제를 낳습니다. 한 가지에 집중하는 시간을 의도적으로 만들어야 합니다. 감정을 잘 드러내지 않아 주변에서 속을 알기 어렵다는 말을 듣지만, 내면은 깊고 섬세합니다. 주변의 기대에 너무 맞추다 자신의 방향을 잃지 않도록 주의해야 합니다.',
    癸:'계수(癸水)는 맑은 이슬입니다. 공감 능력이 탁월하고 다른 사람의 감정을 빠르게 포착하여 섬세하게 반응합니다. 일대일 관계에서 깊고 따뜻한 교감을 나누며, 신뢰하는 사람에게는 전폭적인 지지를 합니다. 우유부단함과 지나친 내성이 가장 큰 약점으로, 결정을 미루다 기회를 놓치는 경우가 많습니다. 자신의 직관을 믿고 행동하는 용기가 필요합니다. 작은 물방울처럼 지속적으로 채워나가는 힘이 있으니, 당장의 결과보다 꾸준함이 인생의 가장 큰 무기임을 기억하세요. 감상 과다로 현실 행동이 지연되지 않도록, 생각 다음엔 반드시 한 걸음의 실천을 붙이세요.'
  };

  html+=box('🦁 ⑥ 성격·기질 심층 분석 (팩트 보고서)',
    subHead('핵심 성향','#c2185b')+
    '<div style="font-size:.85rem;line-height:1.85;margin-top:6px">'+
    (personalityByGan[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('심층 기질 분석','#c2185b')+
    '<div style="font-size:.84rem;line-height:1.85;margin-top:4px">'+
    (charBoxDetail[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('보완이 필요한 부분','#d32f2f')+
    '<div style="font-size:.84rem;line-height:1.78;color:#b71c1c;margin-top:4px">'+
    (ganWeakPoint[dg]||'균형을 항상 체크하세요')+
    '<br><br>이 약점은 타고난 한계가 아닙니다. 인식하고 의식적으로 다듬으면 오히려 강점의 다른 면이 됩니다. '+
    '당신의 <b>'+dominant+'</b> 에너지와 함께 위의 보완점을 꾸준히 작업해가면, '+
    '사주가 가진 잠재력의 전부를 끌어낼 수 있습니다.</div>',
    '#e91e63','rgba(253,232,241,.7)');

  /* ───────────────────────────────
     6. 진로 & 적성 상세
  ─────────────────────────────── */
  var careerByEl={
    wood:['교육·강사·교수','출판·작가·저술','환경·조경·산림','의료·한방·재활','문화·예술 기획'],
    fire:['방송·미디어·PR','연예·공연·스포츠','IT·스타트업·플랫폼','요식·서비스·호텔','광고·마케팅·브랜딩'],
    earth:['부동산·건설·인테리어','금융·보험·투자','농업·식품·유통','행정·공무·국제기관','상담·교육 지원'],
    metal:['법률·검찰·경찰·군인','의료·치과·외과','금융·회계·세무','IT보안·정밀기술·항공','귀금속·패션·디자인'],
    water:['연구·분석·데이터','외교·무역·관광','심리·상담·철학','글쓰기·시·문학','음악·영화·순수예술']
  };

  html+=box('💼 ⑦ 진로 적성 & 성공 천기 — 운명이 알려주는 직업 지도',
    subHead('천성 맞춤 분야 ('+EL_KO[dayMaster]+' 에너지 기반)','#1565C0')+
    li(careerByEl[dayMaster]||[])+
    subHead('십성 '+dominant+' 기반 추천','#0d47a1')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+deep.career+'</div>'+
    '<br>'+subHead('성공의 핵심 원칙','#1976D2')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+
    '당신의 가장 큰 강점인 <b>'+tsInfo.meaning+'</b>을(를) 살릴 때 다른 누구보다 빛납니다. '+
    lifeStrategyByTs[dominant]+'</div>'+
    '<br>'+subHead('진로 선택 시 핵심 체크리스트','#0d47a1')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '단순히 "돈이 되는가"가 아니라 다음 세 가지를 반드시 확인하세요. 첫째, 이 일을 할 때 시간 가는 줄 모르는가? 의식 없이 열중하는 것이 천직의 신호입니다. 둘째, 이 분야에서 나의 약점이 강점으로 전환되는가? 예를 들어 섬세함이 단점인 환경이 있고, 장점인 환경이 있습니다. 셋째, 5년 후 이 분야의 전문가가 되었을 때 사회적으로 필요한 인재인가? 자신의 재능과 세상의 필요가 교차하는 지점이 가장 이상적인 커리어 방향입니다. <b>'+dominant+'</b> 에너지를 가진 당신은 특히 자율성과 전문성이 보장되는 환경에서 폭발적인 성장을 보입니다.</div>',
    '#1565C0','rgba(227,242,253,.7)');

  /* ───────────────────────────────
     7. 연애·결혼 심층 분석
  ─────────────────────────────── */
  var loveByEl={
    wood:'성장형 파트너십을 원합니다. 서로 발전하고 응원하는 관계가 가장 이상적입니다. 구속하거나 성장을 막는 상대와는 관계가 오래가기 힘듭니다.',
    fire:'열정적이고 화끈한 연애를 합니다. 첫 눈에 반하는 경우가 많고 감정 기복이 있습니다. 권태기를 방지하기 위해 지속적인 새로운 자극이 필요합니다.',
    earth:'안정과 신뢰를 최우선으로 합니다. 천천히 감정을 쌓아가고, 한 번 정이 들면 쉽게 헤어지지 않습니다. 가정적이고 든든한 파트너가 맞습니다.',
    metal:'원칙과 기준이 분명한 연애를 합니다. 상대방에게 높은 기준을 요구하고, 자신도 그에 맞게 행동합니다. 감정 표현이 서툴러 오해를 살 수 있습니다.',
    water:'감성적이고 깊이 있는 관계를 원합니다. 영혼의 교감을 중시하고 표면적인 것보다 내면의 연결을 봅니다. 이별의 상처가 오래가는 편입니다.'
  };

  html+=box('💘 ⑧ 연애·결혼 심층 풀이',
    subHead('사랑의 패턴','#ad1457')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+deep.love+'<br><br>'+loveByEl[dayMaster||'earth']+'</div>'+
    '<br>'+subHead('인연의 신호 — 어떤 사람과 맞는가','#c2185b')+
    li(['오행상 '+(dayMaster==='wood'?'화(火) 에너지의 따뜻한 상대':dayMaster==='fire'?'목(木) 에너지의 추진력 있는 상대':dayMaster==='earth'?'화(火) 에너지의 열정적인 상대':dayMaster==='metal'?'토(土) 에너지의 안정적인 상대':'금(金) 에너지의 단단한 상대')+'와 잘 어울립니다.',
      '십성 '+dominant+' 사주에서는 '+ganRel[dg||'甲']+'를 추구합니다.',
      '삶의 방향과 가치관이 맞는 사람, 나의 약점을 이해해주는 파트너가 귀인 배우자입니다.'])+
    '<br>'+subHead('결혼 후 행복의 열쇠','#880e4f')+
    '<div style="font-size:.84rem;line-height:1.78">서로의 사생활과 성장 공간을 존중해주고, 명절/기념일/일상의 작은 감사 표현을 꾸준히 이어가는 것이 가장 안정적인 관계 유지 방법입니다.</div>'+
    '<br>'+subHead('관계에서 반드시 기억할 것','#ad1457')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '사랑은 감정이 아니라 선택이자 실천입니다. 아무리 좋은 궁합이어도, 두 사람 모두 관계에 지속적으로 투자하지 않으면 무너집니다. '+dominant+' 에너지를 가진 당신은 특유의 관계 방식이 있는데, 상대방이 그 방식을 이해하도록 명확하게 표현하는 것이 갈등 예방의 핵심입니다. 말 안 해도 알아줄 것이라는 기대는 오해를 낳습니다. 갈등이 생겼을 때 피하지 않고 적극적으로 대화하고 해소하는 패턴을 만들어가는 것이 장기적으로 행복한 관계의 기초입니다. 자신의 사랑 언어(칭찬, 스킨십, 봉사, 선물, 시간 공유 중)와 상대방의 사랑 언어가 다를 수 있음을 인식하고 맞춰가세요.</div>',
    '#e91e63','rgba(252,228,236,.7)');

  /* ───────────────────────────────
     7-2. 신살(神殺) 분석
  ─────────────────────────────── */
  var _sinsalItems = [];
  var _ssDay = p.d.g + p.d.j;
  var _ssJArr = [p.y.j, p.m.j, p.d.j, p.h.j];
  var _ssJLbl = ['년지','월지','일지','시지'];
  // 도화살: 子午卯酉
  var _ssTao = ['子','午','卯','酉'];
  var _ssTaoPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssTao.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssTaoPos.length > 0) _sinsalItems.push({ icon:'🌸', name:'도화살(桃花殺)', pos:_ssTaoPos.join(', '), desc:'이성을 끌어당기는 매력의 별. '+(_ssTaoPos.indexOf('일지')>=0?'<b>일지 도화</b>는 개인의 이성 매력이 가장 강하게 발현되어 연애 인연이 끊이지 않습니다. ':'')+(_ssTaoPos.indexOf('월지')>=0?'<b>월지 도화</b>는 직업·사회생활에서 이성 인기가 높습니다. ':'')+(_ssTaoPos.indexOf('년지')>=0?'<b>년지 도화</b>는 사회적 인기와 대중적 매력으로 발현됩니다. ':'')+'도화가 강할수록 인기 많고 이성 인연이 많지만, 감정 소모와 구설에 주의가 필요합니다.' });
  // 홍염살
  var _ssHong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
  if (_ssHong.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'💋', name:'홍염살(紅艶殺)', pos:'일주 '+_ssDay, desc:'타고난 치명적 색기와 이성을 사로잡는 강렬한 매력의 별. <b>'+_ssDay+' 일주 홍염살</b>: 가만히 있어도 이성의 시선이 쏠리는 묘한 카리스마와 섹시함이 있습니다. 의도치 않게 이성 관계가 복잡해질 수 있으며, 이 에너지를 현명하게 관리하는 것이 중요합니다.' });
  // 역마살
  var _ssYem = ['寅','申','巳','亥'];
  var _ssYemPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssYem.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssYemPos.length > 0) _sinsalItems.push({ icon:'🌪️', name:'역마살(驛馬殺)', pos:_ssYemPos.join(', '), desc:'이동·변화·확장의 별. <b>'+_ssYemPos.join(', ')+'에 역마</b>: 움직이고 변화할 때 운이 열립니다. 연애에서는 자유와 변화를 중시하며, 이동이 잦은 직업이나 해외 활동에서 강점을 발휘합니다.' });
  // 화개살
  var _ssHwa = ['辰','戌','丑','未'];
  var _ssHwaPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssHwa.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssHwaPos.length > 0) _sinsalItems.push({ icon:'🔮', name:'화개살(華蓋殺)', pos:_ssHwaPos.join(', '), desc:'예술·영성·고독의 별. <b>'+_ssHwaPos.join(', ')+'에 화개</b>: 예술적 재능과 깊은 내면 세계를 가집니다. 종교·철학·예술 분야에 끌리며, 영적 교감과 깊이 있는 대화를 중시합니다.' });
  // 괴강살
  var _ssGoe = ['庚辰','庚戌','壬辰','壬戌','戊戌'];
  if (_ssGoe.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'⚔️', name:'괴강살(魁罡殺)', pos:'일주 '+_ssDay, desc:'강인한 리더십과 불굴의 의지. <b>'+_ssDay+' 일주 괴강살</b>: 어떤 역경도 굴복하지 않는 강렬한 에너지를 타고났습니다. 성패가 극단적으로 갈릴 수 있으므로, 이 에너지를 올바른 방향으로 사용하는 것이 핵심입니다.' });
  // 간여지동
  var _ssGyn = ['甲寅','乙卯','丙午','丁巳','戊辰','戊戌','己丑','己未','庚申','辛酉','壬子','癸亥'];
  if (_ssGyn.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'🔥', name:'간여지동(干與支同)', pos:'일주 '+_ssDay, desc:'천간과 지지 오행이 같아 겉과 속이 일치합니다. <b>'+_ssDay+'</b>: 강인한 자아와 일관된 주체성을 가지며 의지가 굳습니다. 고집스럽게 보일 수 있지만 이것이 큰 성취의 원동력이 됩니다.' });
  // 양인살
  var _ssYang = {'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'};
  if (p.d.g && _ssYang[p.d.g] && p.d.j === _ssYang[p.d.g]) _sinsalItems.push({ icon:'⚡', name:'양인살(羊刃殺)', pos:'일주 '+_ssDay, desc:'날카롭고 강렬한 에너지의 별. <b>'+_ssDay+' 양인</b>: 집중력과 실행력이 극강하며 한 번 목표를 정하면 끝까지 밀어붙입니다. 강한 에너지를 절제와 방향 설정으로 관리하는 것이 성공의 열쇠입니다.' });
  // 천을귀인
  var _ssUl = {'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'丙':['亥','酉'],'丁':['亥','酉'],'辛':['寅','午'],'壬':['巳','卯'],'癸':['巳','卯']};
  if (p.d.g && _ssUl[p.d.g]) {
    var _ssUlSet = _ssUl[p.d.g];
    var _ssUlPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssUlSet.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
    if (_ssUlPos.length > 0) _sinsalItems.push({ icon:'✨', name:'천을귀인(天乙貴人)', pos:_ssUlPos.join(', '), desc:'위기에 귀인이 나타나는 길성(吉星). <b>'+_ssUlPos.join(', ')+'에 천을귀인</b>: 인생의 가장 어려운 순간에 귀인의 도움을 받는 복이 있습니다. 대인관계에서 신뢰를 먼저 쌓으면 귀인이 자연스럽게 나타납니다.' });
  }
  var _sinsalBodyHtml = '';
  if (_sinsalItems.length > 0) {
    _sinsalBodyHtml = _sinsalItems.map(function(s){
      return '<div style="margin:6px 0;padding:10px 12px;background:rgba(255,255,255,.6);border-radius:8px;border-left:3px solid #9c27b0">'+
        '<div style="font-weight:700;font-size:.87rem;color:#6a1b9a;margin-bottom:4px">'+s.icon+' '+s.name+'<span style="font-weight:400;font-size:.79rem;color:#999;margin-left:6px">['+s.pos+']</span></div>'+
        '<div style="font-size:.83rem;line-height:1.75;color:#444">'+s.desc+'</div>'+
      '</div>';
    }).join('');
  } else {
    _sinsalBodyHtml = '<div style="font-size:.84rem;line-height:1.78;color:#666">주요 신살 해당 없음 — 신살에 의존하지 않는 순수한 오행 매력의 소유자입니다. 용신 오행과 일간의 기질 자체가 당신의 매력과 강점을 만들어냅니다.</div>';
  }
  html+=box('💫 ⑨ 신살(神殺) 분석 — 타고난 특수 에너지',
    subHead('내 사주의 신살 목록','#6a1b9a')+
    _sinsalBodyHtml+
    '<br>'+subHead('신살이란?','#7b1fa2')+
    '<div style="font-size:.84rem;line-height:1.85;margin-top:4px">신살(神殺)은 사주 지지(地支) 조합에서 발생하는 특수한 에너지 패턴입니다. 길신(吉神)은 능력을 강화하고 귀인 인연을 끌어들이며, 살(殺)은 특정 영역에서 강렬한 에너지를 부여하되 과하면 부작용이 따릅니다. 선천적 운명이 아니라 그 에너지를 어떻게 활용하느냐에 따라 강점이 될 수도, 약점이 될 수도 있습니다.</div>',
    '#9C27B0','rgba(243,229,245,.7)');

  /* ───────────────────────────────
     8. 건강 & 소울 푸드
  ─────────────────────────────── */
  var stressSign={
    wood:'목이 뻣뻣하거나 눈이 쉽게 피로해지고 분노가 잦아지면 간·담낭 에너지 고갈 신호입니다.',
    fire:'가슴이 두근거리거나 더위를 타고 불면이 심해지면 심장·소장 에너지 과부하입니다.',
    earth:'소화가 안 되거나 식욕이 없고 생각이 너무 많아지면 비·위 에너지 과부하입니다.',
    metal:'피부가 건조해지고 기침이 잦아지며 슬픔·우울이 커지면 폐·대장 에너지 부족 신호입니다.',
    water:'허리와 무릎이 약해지고 이명이 생기거나 두려움이 커지면 신장·방광 에너지 고갈입니다.'
  };

  html+=box('🥗 ⑨ 건강·소울 푸드 & 스트레스 신호 분석',
    subHead('타고난 건강 약점','#2e7d32')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    kv('취약 부위',health.weak)+
    kv('추천 음식',health.food)+
    kv('건강 조언',health.advice)+
    kv('스트레스 신호',stressSign[dayMaster]||'체력 저하 신호를 놓치지 마세요')+
    '</div>'+
    '<br>'+subHead('오행에 맞는 운동 추천','#388e3c')+
    li(dayMaster==='wood'?['산책·등산·스트레칭','요가·필라테스','댄스·리듬 운동']:
       dayMaster==='fire'?['고강도 인터벌 트레이닝','수영·사이클','팀 스포츠']:
       dayMaster==='earth'?['걷기·태극권','헬스·웨이트','명상·호흡']:
       dayMaster==='metal'?['복싱·무술·격투기','달리기·수영','근력 운동']:
       ['수영·아쿠아로빅','명상·요가','스트레칭·폼롤러']),
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     9. 재물운 & 투자 전략
  ─────────────────────────────── */
  html+=box('💰 ⑩ 재물운 & 투자 전략 상세',
    subHead('재물 패턴','#e65100')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    tsMoneyPattern[dominant]+'</div>'+
    '<br>'+subHead('오행 기반 재물 개운법','#f57c00')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (elMoneyAdvice[domE]||'재물이 들어오는 방향과 색상을 활용하세요')+'</div>'+
    '<br>'+subHead('투자 원칙','#ef6c00')+
    li(dominant==='식신'||dominant==='정재'?
       ['안정형 — 적금·부동산·배당주 우선','월 소득의 20% 이상 자동이체 저축','급등주·코인 단타 지양']:
       dominant==='편재'||dominant==='겁재'?
       ['공격형 — 분산 투자, 빠른 손절 원칙','레버리지는 총 자산의 10% 이내로 제한','연대보증·구두 계약 절대 금지']:
       ['균형형 — 안전자산 60%, 변동자산 40%','분기별 포트폴리오 점검','장기 복리 투자가 가장 효율적'])+
    '<br>'+subHead('재물 상승을 위한 사주 기반 행동 원칙','#bf360c')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '재물운은 운만으로 결정되지 않습니다. 사주의 기운이 재물로 연결되는 구조는 있지만, 그 구조를 실제 돈으로 전환하는 것은 행동입니다. 당신의 <b>'+dominant+'</b> 에너지가 가장 잘 발현될 때 돈도 자연스럽게 따라옵니다. 반대로 에너지가 억눌리거나 잘못된 방향에 쓰일 때 재물이 새어나갑니다. 수입을 늘리는 것만큼 지출의 패턴을 점검하는 것이 중요합니다. 재물운의 단기 흐름은 세운(그 해 운)에 따라 달라지니, 큰 투자 결정은 좋은 운의 해에 집중하세요. 매년 1월에 그 해의 재물운을 확인하고 전략을 수립하는 습관을 들이면 자산이 꾸준히 성장합니다.</div>',
    '#FF6F00','rgba(255,243,224,.7)');

  /* ───────────────────────────────
     10. 귀인 & 인간관계
  ─────────────────────────────── */
  html+=box('🤝 ⑪ 귀인(貴人) & 인간관계 지도',
    subHead('귀인의 유형','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (guiinByDom[domE]||'당신의 성장을 돕는 멘토와 공동체')+'</div>'+
    '<br>'+subHead('인간관계 패턴','#1976D2')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    tsRelPattern[dominant]+'</div>'+
    '<br>'+subHead('관계에서 주의할 시그널','#d32f2f')+
    li(['나의 성장을 시기하거나 깎아내리는 사람',
       '돈·감정·시간을 지속적으로 착취하는 관계',
       '자존감을 낮추는 환경은 과감히 거리를 두세요'])+
    '<br>'+subHead('귀인을 만나고 지키는 법','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '귀인은 거창한 곳에서 오지 않습니다. 당신이 진심을 다하는 영역에서, 꾸준히 가치를 쌓을 때 자연스럽게 나타납니다. 먼저 당신 자신이 타인의 귀인이 되어야 귀인을 끌어당길 수 있습니다. <b>'+dominant+'</b> 에너지를 가진 당신의 귀인 유형인 <b>'+(guiinByDom[domE]||'성장을 돕는 멘토')+'</b>와의 만남을 의도적으로 늘리세요. 커뮤니티, 스터디 모임, 업계 행사 등에 꾸준히 참여하면서 자신의 가치를 먼저 나누는 태도가 귀인 인연을 만드는 가장 확실한 방법입니다. 한번 만난 귀인과의 관계는 정기적인 연락과 관심으로 유지해야 합니다.</div>',
    '#1565C0','rgba(227,242,253,.7)');

  /* ───────────────────────────────
     11. 개운 테마 & 행동 루틴
  ─────────────────────────────── */
  html+=box('🍀 ⑫ 개운 루트 상세 — '+EL_K[domE]+' 에너지 다스리기',
    '<div class="tip-grid">'+
    '<div class="tip-chip"><strong>극(눌러주기): '+EL_K[tips.controller]+'</strong>'+
    '🎨 '+tips.ctips.color+'<br>🏠 '+tips.ctips.place+'<br>🧭 '+tips.ctips.action+'<br>🍽️ '+tips.ctips.food+'</div>'+
    '<div class="tip-chip"><strong>설기(분산): '+EL_K[tips.drain]+'</strong>'+
    '🎨 '+tips.dtips.color+'<br>🏠 '+tips.dtips.place+'<br>🧭 '+tips.dtips.action+'<br>🍽️ '+tips.dtips.food+'</div>'+
    '</div>'+
    '<br>'+subHead('일상 개운 행동 루틴 7가지','#2e7d32')+
    li(['매일 아침 '+domE+'과 반대 색상의 소품('+tips.ctips.color+') 하나 착용',
       '정기적인 정리정돈 — 물건이 정체되면 운도 정체됩니다',
       '이름(도장·서명)을 쓰는 계약서와 중요 서류 꼼꼼히 확인',
       '귀인이 있는 방향('+tips.ctips.place+') 공간 활성화',
       '식단에 '+tips.ctips.food+' 추가',
       '주 2회 이상 '+tips.ctips.action+' 활동 실천',
       '새로운 배움(책·강의·멘토)에 지속 투자']),
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     12. 인생 전략 요약
  ─────────────────────────────── */
  html+=box('🚀 ⑬ 인생 전략 로드맵 — 연이의 종합 천기',
    subHead('지금 당장 실천할 것','#7b1fa2')+
    li(['강점인 <b>'+dominant+'</b> 에너지를 일과 관계에 최대한 활용하세요',
       '약점인 <b>'+EL_K[domE]+'</b> 과잉을 의식적으로 다스리세요',
       '용신 에너지 '+((pw&&pw.yongshin)||[]).map(function(e){return EL_KO[e];}).join('·')+'를 생활에 꾸준히 흡수하세요',
       '귀인('+guiinByDom[domE]+')과의 인연을 의도적으로 만들어가세요'])+
    subHead('10년 관점 커리어 전략','#6a1b9a')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    lifeStrategyByTs[dominant]+'</div>'+
    '<br>'+subHead('지금 당장 시작할 3가지 루틴','#7b1fa2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '<b>① 주간 리뷰 (매주 일요일 20분)</b>: 이번 주 어떤 결정을 했고, 어떤 결과가 왔는가? <b>'+dominant+'</b> 에너지가 잘 발현된 순간과 낭비된 순간을 기록하세요. 패턴이 보이면 다음 주 행동이 달라집니다.<br><br>'+
    '<b>② 귀인 접점 늘리기 (월 2회)</b>: 당신의 성장 방향과 같은 사람들이 모이는 공간에 정기적으로 참여하세요. 귀인은 찾는 것이 아니라 환경 안에서 자연스럽게 만나는 것입니다.<br><br>'+
    '<b>③ 용신 에너지 흡수 (매일)</b>: 용신 색상의 소품을 몸에 지니거나, 방향에 알람을 맞추거나, 용신 음식을 식단에 포함하는 등 작은 일상의 조율이 에너지 균형을 유지합니다.</div>',
    '#9C27B0','rgba(243,229,245,.7)');

  /* ───────────────────────────────
     13. 연이의 현실 조언 / 쌈바의 현실적 팩폭 (NEO_MODE 분기)
  ─────────────────────────────── */
  var _isNeoSaju = (typeof NEO_MODE !== 'undefined' && NEO_MODE) || document.body.classList.contains('neo-mode');
  if (_isNeoSaju) {
    html+='<div class="prem-box" style="background:linear-gradient(135deg,rgba(30,5,5,.9),rgba(60,10,10,.85));border-color:#e53935">'+
      '<span class="prem-title" style="border-color:#e53935;color:#FF6B6B">🦁 쌈바의 현실적 팩폭 — '+(USER_NAME||'당신')+'님을 향한 직격탄</span>'+
      '<div class="prem-text">'+generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  } else {
    html+='<div class="prem-box" style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border-color:#A5D6A7">'+
      '<span class="prem-title" style="border-color:#4CAF50;color:#2E7D32">🍀 연이의 현실 조언 — '+(USER_NAME||'당신')+'님만을 위한 이야기</span>'+
      '<div class="prem-text">'+generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  }

  document.getElementById('summaryArea').innerHTML=html;
}

const CELEB_CATS=['걸그룹','보이그룹','가수·솔로','배우','글로벌기업인','국내기업인','글로벌정치인','국내정치인'];
const CELEBS=[
  /* ───── 걸그룹 ───── */
  {cat:'걸그룹',name:'뉴진스 하니',birth:'2004-10-06',hour:12,minute:0},
  {cat:'걸그룹',name:'뉴진스 민지',birth:'2004-07-18',hour:12,minute:0},
  {cat:'걸그룹',name:'뉴진스 다니엘',birth:'2005-04-11',hour:12,minute:0},
  {cat:'걸그룹',name:'뉴진스 해린',birth:'2006-05-18',hour:12,minute:0},
  {cat:'걸그룹',name:'뉴진스 혜인',birth:'2007-10-18',hour:12,minute:0},

  {cat:'걸그룹',name:'아이브 안유진',birth:'2003-09-01',hour:12,minute:0},
  {cat:'걸그룹',name:'아이브 장원영',birth:'2004-08-31',hour:12,minute:0},
  {cat:'걸그룹',name:'아이브 레이',birth:'2004-10-03',hour:12,minute:0},
  {cat:'걸그룹',name:'아이브 리즈',birth:'2004-11-21',hour:12,minute:0},
  {cat:'걸그룹',name:'아이브 가을',birth:'2002-09-24',hour:12,minute:0},
  {cat:'걸그룹',name:'아이브 이서',birth:'2007-02-03',hour:12,minute:0},

  {cat:'걸그룹',name:'에스파 카리나',birth:'2000-04-11',hour:12,minute:0},
  {cat:'걸그룹',name:'에스파 지젤',birth:'2000-10-30',hour:12,minute:0},
  {cat:'걸그룹',name:'에스파 윈터',birth:'2001-01-01',hour:12,minute:0},
  {cat:'걸그룹',name:'에스파 닝닝',birth:'2002-10-23',hour:12,minute:0},

  {cat:'걸그룹',name:'르세라핌 김채원',birth:'2000-08-05',hour:12,minute:0},
  {cat:'걸그룹',name:'르세라핌 사쿠라',birth:'1998-04-19',hour:12,minute:0},
  {cat:'걸그룹',name:'르세라핌 허윤진',birth:'2001-10-08',hour:12,minute:0},
  {cat:'걸그룹',name:'르세라핌 카즈하',birth:'2003-08-09',hour:12,minute:0},
  {cat:'걸그룹',name:'르세라핌 홍은채',birth:'2004-09-29',hour:12,minute:0},

  {cat:'걸그룹',name:'(여자)아이들 소연',birth:'1998-08-26',hour:12,minute:0},
  {cat:'걸그룹',name:'(여자)아이들 우기',birth:'1999-08-26',hour:12,minute:0},
  {cat:'걸그룹',name:'(여자)아이들 미연',birth:'1997-01-20',hour:12,minute:0},
  {cat:'걸그룹',name:'(여자)아이들 슈화',birth:'2000-08-26',hour:12,minute:0},
  {cat:'걸그룹',name:'(여자)아이들 민니',birth:'1997-10-23',hour:12,minute:0},

  {cat:'걸그룹',name:'블랙핑크 지수',birth:'1995-01-03',hour:12,minute:0},
  {cat:'걸그룹',name:'블랙핑크 제니',birth:'1996-01-16',hour:12,minute:0},
  {cat:'걸그룹',name:'블랙핑크 로제',birth:'1997-02-11',hour:12,minute:0},
  {cat:'걸그룹',name:'블랙핑크 리사',birth:'1997-03-27',hour:12,minute:0},

  {cat:'걸그룹',name:'트와이스 나연',birth:'1995-09-22',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 정연',birth:'1996-09-01',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 모모',birth:'1996-11-09',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 사나',birth:'1996-12-29',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 지효',birth:'1997-02-01',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 미나',birth:'1997-03-24',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 다현',birth:'1998-05-28',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 채영',birth:'1999-04-23',hour:12,minute:0},
  {cat:'걸그룹',name:'트와이스 쯔위',birth:'2000-01-14',hour:12,minute:0},

  {cat:'걸그룹',name:'레드벨벳 아이린',birth:'1991-03-29',hour:12,minute:0},
  {cat:'걸그룹',name:'레드벨벳 슬기',birth:'1994-02-10',hour:12,minute:0},
  {cat:'걸그룹',name:'레드벨벳 웬디',birth:'1994-02-21',hour:12,minute:0},
  {cat:'걸그룹',name:'레드벨벳 조이',birth:'1996-09-03',hour:12,minute:0},
  {cat:'걸그룹',name:'레드벨벳 예리',birth:'1999-08-05',hour:12,minute:0},

  {cat:'걸그룹',name:'있지 예지',birth:'2000-09-26',hour:12,minute:0},
  {cat:'걸그룹',name:'있지 리아',birth:'2001-07-21',hour:12,minute:0},
  {cat:'걸그룹',name:'있지 류진',birth:'2001-04-17',hour:12,minute:0},
  {cat:'걸그룹',name:'있지 채령',birth:'2001-10-05',hour:12,minute:0},
  {cat:'걸그룹',name:'있지 유나',birth:'2003-12-09',hour:12,minute:0},

  {cat:'걸그룹',name:'오마이걸 효정',birth:'1994-12-30',hour:12,minute:0},
  {cat:'걸그룹',name:'오마이걸 미미',birth:'1995-03-28',hour:12,minute:0},
  {cat:'걸그룹',name:'오마이걸 유아',birth:'1995-04-17',hour:12,minute:0},
  {cat:'걸그룹',name:'오마이걸 아린',birth:'2000-06-17',hour:12,minute:0},

  {cat:'걸그룹',name:'아일릿 모카',birth:'2004-12-10',hour:12,minute:0},
  {cat:'걸그룹',name:'아일릿 원희',birth:'2004-01-27',hour:12,minute:0},
  {cat:'걸그룹',name:'아일릿 민주',birth:'2004-03-26',hour:12,minute:0},
  {cat:'걸그룹',name:'아일릿 이로하',birth:'2003-01-05',hour:12,minute:0},

  {cat:'걸그룹',name:'스테이씨 수민',birth:'2003-02-04',hour:12,minute:0},
  {cat:'걸그룹',name:'스테이씨 시은',birth:'2003-05-29',hour:12,minute:0},
  {cat:'걸그룹',name:'스테이씨 아이사',birth:'2004-09-25',hour:12,minute:0},
  {cat:'걸그룹',name:'스테이씨 세은',birth:'2004-10-30',hour:12,minute:0},
  {cat:'걸그룹',name:'스테이씨 재이',birth:'2004-12-09',hour:12,minute:0},

  {cat:'걸그룹',name:'케플러 유진',birth:'2003-05-19',hour:12,minute:0},
  {cat:'걸그룹',name:'케플러 샤오팅',birth:'2002-08-05',hour:12,minute:0},
  {cat:'걸그룹',name:'케플러 다연',birth:'2003-12-04',hour:12,minute:0},

  {cat:'걸그룹',name:'피프티피프티 새나',birth:'2004-04-06',hour:12,minute:0},
  {cat:'걸그룹',name:'피프티피프티 아란',birth:'2001-11-23',hour:12,minute:0},

  /* ───── 보이그룹 ───── */
  {cat:'보이그룹',name:'BTS RM',birth:'1994-09-12',hour:12,minute:0},
  {cat:'보이그룹',name:'BTS 진',birth:'1992-12-04',hour:12,minute:0},
  {cat:'보이그룹',name:'BTS 슈가',birth:'1993-03-09',hour:12,minute:0},
  {cat:'보이그룹',name:'BTS 제이홉',birth:'1994-02-18',hour:12,minute:0},
  {cat:'보이그룹',name:'BTS 지민',birth:'1995-10-13',hour:12,minute:0},
  {cat:'보이그룹',name:'BTS 뷔',birth:'1995-12-30',hour:12,minute:0},
  {cat:'보이그룹',name:'BTS 정국',birth:'1997-09-01',hour:12,minute:0},

  {cat:'보이그룹',name:'엑소 수호',birth:'1991-05-22',hour:12,minute:0},
  {cat:'보이그룹',name:'엑소 백현',birth:'1992-05-06',hour:12,minute:0},
  {cat:'보이그룹',name:'엑소 첸',birth:'1992-09-21',hour:12,minute:0},
  {cat:'보이그룹',name:'엑소 찬열',birth:'1992-11-27',hour:12,minute:0},
  {cat:'보이그룹',name:'엑소 카이',birth:'1994-01-14',hour:12,minute:0},
  {cat:'보이그룹',name:'엑소 세훈',birth:'1994-04-12',hour:12,minute:0},

  {cat:'보이그룹',name:'샤이니 태민',birth:'1993-07-18',hour:12,minute:0},
  {cat:'보이그룹',name:'샤이니 키',birth:'1991-09-23',hour:12,minute:0},
  {cat:'보이그룹',name:'샤이니 민호',birth:'1991-12-09',hour:12,minute:0},

  {cat:'보이그룹',name:'세븐틴 에스쿱스',birth:'1995-04-08',hour:12,minute:0},
  {cat:'보이그룹',name:'세븐틴 민규',birth:'1997-02-06',hour:12,minute:0},
  {cat:'보이그룹',name:'세븐틴 원우',birth:'1996-08-17',hour:12,minute:0},
  {cat:'보이그룹',name:'세븐틴 도겸',birth:'1997-02-06',hour:12,minute:0},
  {cat:'보이그룹',name:'세븐틴 승관',birth:'1998-01-16',hour:12,minute:0},

  {cat:'보이그룹',name:'NCT 태용',birth:'1995-07-01',hour:12,minute:0},
  {cat:'보이그룹',name:'NCT 재현',birth:'1997-02-13',hour:12,minute:0},
  {cat:'보이그룹',name:'NCT 마크',birth:'1999-08-02',hour:12,minute:0},
  {cat:'보이그룹',name:'NCT 해찬',birth:'2000-06-06',hour:12,minute:0},

  {cat:'보이그룹',name:'스트레이키즈 방찬',birth:'1997-10-03',hour:12,minute:0},
  {cat:'보이그룹',name:'스트레이키즈 필릭스',birth:'2000-09-15',hour:12,minute:0},
  {cat:'보이그룹',name:'스트레이키즈 현진',birth:'2000-03-20',hour:12,minute:0},
  {cat:'보이그룹',name:'스트레이키즈 아이엔',birth:'2001-02-07',hour:12,minute:0},

  {cat:'보이그룹',name:'투모로우바이투게더 수빈',birth:'2000-12-05',hour:12,minute:0},
  {cat:'보이그룹',name:'투모로우바이투게더 연준',birth:'2002-09-13',hour:12,minute:0},
  {cat:'보이그룹',name:'투모로우바이투게더 범규',birth:'2003-03-13',hour:12,minute:0},
  {cat:'보이그룹',name:'투모로우바이투게더 태현',birth:'2002-02-05',hour:12,minute:0},

  {cat:'보이그룹',name:'엔하이픈 정원',birth:'2004-02-09',hour:12,minute:0},
  {cat:'보이그룹',name:'엔하이픈 희승',birth:'2004-10-15',hour:12,minute:0},
  {cat:'보이그룹',name:'엔하이픈 니키',birth:'2005-12-09',hour:12,minute:0},

  {cat:'보이그룹',name:'제로베이스원 한유진',birth:'2002-11-14',hour:12,minute:0},
  {cat:'보이그룹',name:'제로베이스원 김지웅',birth:'2001-04-05',hour:12,minute:0},
  {cat:'보이그룹',name:'제로베이스원 성한빈',birth:'2003-09-09',hour:12,minute:0},

  {cat:'보이그룹',name:'아스트로 차은우',birth:'1997-03-30',hour:12,minute:0},
  {cat:'보이그룹',name:'아스트로 MJ',birth:'1994-03-05',hour:12,minute:0},

  /* ───── 가수·솔로 ───── */
  {cat:'가수·솔로',name:'아이유',birth:'1993-05-16',hour:15,minute:0},
  {cat:'가수·솔로',name:'태연',birth:'1989-03-09',hour:12,minute:0},
  {cat:'가수·솔로',name:'청하',birth:'1996-02-09',hour:12,minute:0},
  {cat:'가수·솔로',name:'화사',birth:'1995-07-23',hour:12,minute:0},
  {cat:'가수·솔로',name:'솔라',birth:'1991-02-22',hour:12,minute:0},
  {cat:'가수·솔로',name:'문별',birth:'1992-12-22',hour:12,minute:0},
  {cat:'가수·솔로',name:'선미',birth:'1992-12-02',hour:12,minute:0},
  {cat:'가수·솔로',name:'효린',birth:'1989-01-11',hour:12,minute:0},
  {cat:'가수·솔로',name:'헤이즈',birth:'1994-08-07',hour:12,minute:0},
  {cat:'가수·솔로',name:'이영지',birth:'2002-02-09',hour:12,minute:0},
  {cat:'가수·솔로',name:'지코',birth:'1992-09-14',hour:12,minute:0},
  {cat:'가수·솔로',name:'박재범',birth:'1987-01-25',hour:12,minute:0},
  {cat:'가수·솔로',name:'빈지노',birth:'1987-04-10',hour:12,minute:0},
  {cat:'가수·솔로',name:'딘',birth:'1992-09-10',hour:12,minute:0},
  {cat:'가수·솔로',name:'크러쉬',birth:'1992-05-03',hour:12,minute:0},
  {cat:'가수·솔로',name:'그레이',birth:'1986-12-21',hour:12,minute:0},
  {cat:'가수·솔로',name:'호미들 이영지',birth:'2002-02-09',hour:12,minute:0},
  {cat:'가수·솔로',name:'비비',birth:'1997-11-26',hour:12,minute:0},
  {cat:'가수·솔로',name:'백예린',birth:'1997-05-07',hour:12,minute:0},
  {cat:'가수·솔로',name:'이무진',birth:'2000-08-13',hour:12,minute:0},
  {cat:'가수·솔로',name:'폴킴',birth:'1992-02-16',hour:12,minute:0},

  /* ───── 배우 ───── */
  {cat:'배우',name:'변우석',birth:'1994-04-27',hour:12,minute:0},
  {cat:'배우',name:'김수현',birth:'1988-02-04',hour:12,minute:0},
  {cat:'배우',name:'김지원',birth:'1992-09-22',hour:12,minute:0},
  {cat:'배우',name:'고윤정',birth:'1996-04-11',hour:12,minute:0},
  {cat:'배우',name:'이도현',birth:'1995-04-21',hour:12,minute:0},
  {cat:'배우',name:'임지연',birth:'1990-07-02',hour:12,minute:0},
  {cat:'배우',name:'박은빈',birth:'1992-09-04',hour:12,minute:0},
  {cat:'배우',name:'한소희',birth:'1994-11-18',hour:12,minute:0},
  {cat:'배우',name:'차은우',birth:'1997-03-30',hour:12,minute:0},
  {cat:'배우',name:'로운',birth:'1995-09-30',hour:12,minute:0},
  {cat:'배우',name:'안효섭',birth:'1991-07-01',hour:12,minute:0},
  {cat:'배우',name:'송강',birth:'1994-04-23',hour:12,minute:0},
  {cat:'배우',name:'김혜윤',birth:'2000-01-31',hour:12,minute:0},
  {cat:'배우',name:'박보검',birth:'1993-06-16',hour:12,minute:0},
  {cat:'배우',name:'김선호',birth:'1990-05-08',hour:12,minute:0},
  {cat:'배우',name:'남주혁',birth:'1994-02-22',hour:12,minute:0},
  {cat:'배우',name:'최우식',birth:'1990-12-26',hour:12,minute:0},
  {cat:'배우',name:'김다미',birth:'1995-04-09',hour:12,minute:0},
  {cat:'배우',name:'위하준',birth:'1987-03-10',hour:12,minute:0},
  {cat:'배우',name:'정해인',birth:'1988-05-01',hour:12,minute:0},
  {cat:'배우',name:'신혜선',birth:'1989-08-29',hour:12,minute:0},
  {cat:'배우',name:'마동석',birth:'1971-03-01',hour:12,minute:0},
  {cat:'배우',name:'손석구',birth:'1983-11-12',hour:12,minute:0},
  {cat:'배우',name:'이정재',birth:'1972-03-15',hour:12,minute:0},
  {cat:'배우',name:'공유',birth:'1979-07-10',hour:12,minute:0},
  {cat:'배우',name:'이병헌',birth:'1970-07-12',hour:12,minute:0},
  {cat:'배우',name:'김태리',birth:'1990-01-24',hour:12,minute:0},
  {cat:'배우',name:'남궁민',birth:'1978-06-23',hour:12,minute:0},
  {cat:'배우',name:'천우희',birth:'1990-01-26',hour:12,minute:0},
  {cat:'배우',name:'이제훈',birth:'1986-06-15',hour:12,minute:0},

  /* ───── 글로벌기업인 ───── */
  {cat:'글로벌기업인',name:'일론 머스크',birth:'1971-06-28',hour:12,minute:0},
  {cat:'글로벌기업인',name:'제프 베이조스',birth:'1964-01-12',hour:12,minute:0},
  {cat:'글로벌기업인',name:'마크 저커버그',birth:'1984-05-14',hour:12,minute:0},
  {cat:'글로벌기업인',name:'워런 버핏',birth:'1930-08-30',hour:12,minute:0},
  {cat:'글로벌기업인',name:'젠슨 황',birth:'1963-02-17',hour:12,minute:0},
  {cat:'글로벌기업인',name:'베르나르 아르노',birth:'1949-03-05',hour:12,minute:0},
  {cat:'글로벌기업인',name:'래리 페이지',birth:'1973-03-26',hour:12,minute:0},
  {cat:'글로벌기업인',name:'세르게이 브린',birth:'1973-08-21',hour:12,minute:0},
  {cat:'글로벌기업인',name:'팀 쿡',birth:'1960-11-01',hour:12,minute:0},
  {cat:'글로벌기업인',name:'샘 올트먼',birth:'1985-04-22',hour:12,minute:0},
  {cat:'글로벌기업인',name:'사티아 나델라',birth:'1967-08-06',hour:12,minute:0},
  {cat:'글로벌기업인',name:'잭 마',birth:'1964-09-10',hour:12,minute:0},
  {cat:'글로벌기업인',name:'마화텅',birth:'1971-10-29',hour:12,minute:0},
  {cat:'글로벌기업인',name:'리사 수',birth:'1969-11-07',hour:12,minute:0},
  {cat:'글로벌기업인',name:'래리 엘리슨',birth:'1944-08-17',hour:12,minute:0},
  {cat:'글로벌기업인',name:'손정의',birth:'1957-08-11',hour:12,minute:0},

  /* ───── 국내기업인 ───── */
  {cat:'국내기업인',name:'이재용',birth:'1968-06-23',hour:12,minute:0},
  {cat:'국내기업인',name:'최태원',birth:'1960-12-03',hour:12,minute:0},
  {cat:'국내기업인',name:'정의선',birth:'1970-10-18',hour:12,minute:0},
  {cat:'국내기업인',name:'구광모',birth:'1978-06-26',hour:12,minute:0},
  {cat:'국내기업인',name:'신동빈',birth:'1955-02-14',hour:12,minute:0},
  {cat:'국내기업인',name:'김범수',birth:'1966-03-13',hour:12,minute:0},
  {cat:'국내기업인',name:'이해진',birth:'1967-06-22',hour:12,minute:0},
  {cat:'국내기업인',name:'서정진',birth:'1957-01-26',hour:12,minute:0},
  {cat:'국내기업인',name:'방시혁',birth:'1972-08-09',hour:12,minute:0},
  {cat:'국내기업인',name:'정용진',birth:'1968-05-26',hour:12,minute:0},
  {cat:'국내기업인',name:'이부진',birth:'1970-10-08',hour:12,minute:0},
  {cat:'국내기업인',name:'홍라희',birth:'1945-03-27',hour:12,minute:0},
  {cat:'국내기업인',name:'조현준',birth:'1968-09-30',hour:12,minute:0},
  {cat:'국내기업인',name:'정기선',birth:'1982-02-17',hour:12,minute:0},
  {cat:'국내기업인',name:'허태수',birth:'1962-01-12',hour:12,minute:0},
  {cat:'국내기업인',name:'김승연',birth:'1952-09-07',hour:12,minute:0},

  /* ───── 글로벌정치인 ───── */
  {cat:'글로벌정치인',name:'도널드 트럼프',birth:'1946-06-14',hour:10,minute:54},
  {cat:'글로벌정치인',name:'조 바이든',birth:'1942-11-20',hour:12,minute:0},
  {cat:'글로벌정치인',name:'버락 오바마',birth:'1961-08-04',hour:19,minute:24},
  {cat:'글로벌정치인',name:'시진핑',birth:'1953-06-15',hour:12,minute:0},
  {cat:'글로벌정치인',name:'블라디미르 푸틴',birth:'1952-10-07',hour:12,minute:0},
  {cat:'글로벌정치인',name:'에마뉘엘 마크롱',birth:'1977-12-21',hour:12,minute:0},
  {cat:'글로벌정치인',name:'올라프 숄츠',birth:'1958-06-14',hour:12,minute:0},
  {cat:'글로벌정치인',name:'리시 수낵',birth:'1980-05-12',hour:12,minute:0},
  {cat:'글로벌정치인',name:'기시다 후미오',birth:'1957-07-29',hour:12,minute:0},
  {cat:'글로벌정치인',name:'나렌드라 모디',birth:'1950-09-17',hour:12,minute:0},
  {cat:'글로벌정치인',name:'볼로디미르 젤렌스키',birth:'1978-01-25',hour:12,minute:0},
  {cat:'글로벌정치인',name:'앙겔라 메르켈',birth:'1954-07-17',hour:12,minute:0},
  {cat:'글로벌정치인',name:'힐러리 클린턴',birth:'1947-10-26',hour:8,minute:2},
  {cat:'글로벌정치인',name:'마거릿 대처',birth:'1925-10-13',hour:9,minute:0},
  {cat:'글로벌정치인',name:'아베 신조',birth:'1954-09-21',hour:12,minute:0},
  {cat:'글로벌정치인',name:'카말라 해리스',birth:'1964-10-20',hour:21,minute:28},

  /* ───── 국내정치인 ───── */
  {cat:'국내정치인',name:'윤석열',birth:'1960-12-18',hour:12,minute:0},
  {cat:'국내정치인',name:'문재인',birth:'1953-01-24',hour:12,minute:0},
  {cat:'국내정치인',name:'박근혜',birth:'1952-02-02',hour:12,minute:0},
  {cat:'국내정치인',name:'이명박',birth:'1941-12-19',hour:12,minute:0},
  {cat:'국내정치인',name:'노무현',birth:'1946-09-01',hour:12,minute:0},
  {cat:'국내정치인',name:'김대중',birth:'1924-01-06',hour:12,minute:0},
  {cat:'국내정치인',name:'김영삼',birth:'1927-12-20',hour:12,minute:0},
  {cat:'국내정치인',name:'노태우',birth:'1932-12-04',hour:12,minute:0},
  {cat:'국내정치인',name:'전두환',birth:'1931-01-18',hour:12,minute:0},
  {cat:'국내정치인',name:'박정희',birth:'1917-09-30',hour:12,minute:0},
  {cat:'국내정치인',name:'이승만',birth:'1875-03-26',hour:12,minute:0},
  {cat:'국내정치인',name:'이재명',birth:'1964-12-22',hour:12,minute:0},
  {cat:'국내정치인',name:'한동훈',birth:'1973-06-23',hour:12,minute:0},
  {cat:'국내정치인',name:'조국',birth:'1965-05-27',hour:12,minute:0},
  {cat:'국내정치인',name:'오세훈',birth:'1961-04-08',hour:12,minute:0},
  {cat:'국내정치인',name:'안철수',birth:'1962-02-26',hour:12,minute:0},
  {cat:'국내정치인',name:'홍준표',birth:'1954-04-24',hour:12,minute:0},
  {cat:'국내정치인',name:'나경원',birth:'1963-04-17',hour:12,minute:0},
  {cat:'국내정치인',name:'김동연',birth:'1957-10-24',hour:12,minute:0},
  {cat:'국내정치인',name:'원희룡',birth:'1964-08-30',hour:12,minute:0},
  {cat:'국내정치인',name:'이준석',birth:'1985-03-30',hour:12,minute:0}
];

var CELEB_CAT_ICONS={
  '전체':'✨','걸그룹':'💃','보이그룹':'🕺','가수·솔로':'🎤',
  '배우':'🎬','글로벌기업인':'🌐','국내기업인':'💼',
  '글로벌정치인':'🌍','국내정치인':'🏛️'
};

// ── 국가 설정 (Config-driven, 새 국가는 여기에만 추가하면 됨) ─────────────────
const COUNTRY_CONFIG = {
  'KR': { label: '한국',  flag: '🇰🇷', order: 1 },
  'JP': { label: '일본',  flag: '🇯🇵', order: 2 },
  'CN': { label: '중국',  flag: '🇨🇳', order: 3 },
  'US': { label: '미국',  flag: '🇺🇸', order: 4 },
  'IN': { label: '인도',  flag: '🇮🇳', order: 5 },
  'EU': { label: '유럽',  flag: '🌍', order: 6 }
};

// ── Nationality Backfill: 기존 항목에 nationality 기본값 'KR' 할당 ────────────
(function() {
  var _override = {
    // 글로벌 기업인
    '일론 머스크':'US','제프 베이조스':'US','마크 저커버그':'US','워런 버핏':'US',
    '젠슨 황':'US','래리 페이지':'US','세르게이 브린':'US','팀 쿡':'US',
    '샘 올트먼':'US','리사 수':'US','래리 엘리슨':'US',
    '베르나르 아르노':'EU','사티아 나델라':'IN','잭 마':'CN','마화텅':'CN','손정의':'JP',
    // 글로벌 정치인
    '도널드 트럼프':'US','조 바이든':'US','버락 오바마':'US','힐러리 클린턴':'US','카말라 해리스':'US',
    '시진핑':'CN',
    '블라디미르 푸틴':'EU','에마뉘엘 마크롱':'EU','올라프 숄츠':'EU',
    '리시 수낵':'EU','앙겔라 메르켈':'EU','볼로디미르 젤렌스키':'EU','마거릿 대처':'EU',
    '기시다 후미오':'JP','아베 신조':'JP','나렌드라 모디':'IN'
  };
  CELEBS.forEach(function(c) {
    if (!c.nationality) c.nationality = _override[c.name] || 'KR';
  });

  // 출생도시 개별 좌표(정밀도 우선). 미등록 인물은 국가 대표도시 fallback 사용.
  var _geo = {
    '일론 머스크': { label:'남아공 프리토리아', lat:-25.7479, lon:28.2293, tz:2 },
    '제프 베이조스': { label:'미국 뉴멕시코 앨버커키', lat:35.0844, lon:-106.6504, tz:-7 },
    '마크 저커버그': { label:'미국 뉴욕 화이트플레인스', lat:41.0330, lon:-73.7629, tz:-5 },
    '워런 버핏': { label:'미국 네브래스카 오마하', lat:41.2565, lon:-95.9345, tz:-6 },
    '젠슨 황': { label:'대만 타이난', lat:22.9999, lon:120.2270, tz:8 },
    '래리 페이지': { label:'미국 미시간 랜싱', lat:42.7325, lon:-84.5555, tz:-5 },
    '세르게이 브린': { label:'러시아 모스크바', lat:55.7558, lon:37.6173, tz:3 },
    '팀 쿡': { label:'미국 앨라배마 모빌', lat:30.6954, lon:-88.0399, tz:-6 },
    '샘 올트먼': { label:'미국 일리노이 시카고', lat:41.8781, lon:-87.6298, tz:-6 },
    '리사 수': { label:'대만 타이난', lat:22.9999, lon:120.2270, tz:8 },
    '래리 엘리슨': { label:'미국 뉴욕', lat:40.7128, lon:-74.0060, tz:-5 },
    '베르나르 아르노': { label:'프랑스 루베', lat:50.6927, lon:3.1778, tz:1 },
    '사티아 나델라': { label:'인도 하이데라바드', lat:17.3850, lon:78.4867, tz:5.5 },
    '잭 마': { label:'중국 항저우', lat:30.2741, lon:120.1551, tz:8 },
    '마화텅': { label:'중국 산터우', lat:23.3535, lon:116.6819, tz:8 },
    '손정의': { label:'일본 사가', lat:33.2494, lon:130.2988, tz:9 },
    '도널드 트럼프': { label:'미국 뉴욕', lat:40.7128, lon:-74.0060, tz:-5 },
    '조 바이든': { label:'미국 펜실베이니아 스크랜턴', lat:41.4089, lon:-75.6624, tz:-5 },
    '버락 오바마': { label:'미국 하와이 호놀룰루', lat:21.3069, lon:-157.8583, tz:-10 },
    '힐러리 클린턴': { label:'미국 일리노이 시카고', lat:41.8781, lon:-87.6298, tz:-6 },
    '카말라 해리스': { label:'미국 캘리포니아 오클랜드', lat:37.8044, lon:-122.2711, tz:-8 },
    '시진핑': { label:'중국 베이징', lat:39.9042, lon:116.4074, tz:8 },
    '블라디미르 푸틴': { label:'러시아 상트페테르부르크', lat:59.9311, lon:30.3609, tz:3 },
    '에마뉘엘 마크롱': { label:'프랑스 아미앵', lat:49.8941, lon:2.2958, tz:1 },
    '올라프 숄츠': { label:'독일 오스나브뤼크', lat:52.2799, lon:8.0472, tz:1 },
    '리시 수낵': { label:'영국 사우샘프턴', lat:50.9097, lon:-1.4044, tz:0 },
    '앙겔라 메르켈': { label:'독일 함부르크', lat:53.5511, lon:9.9937, tz:1 },
    '볼로디미르 젤렌스키': { label:'우크라이나 크리비리흐', lat:47.9105, lon:33.3918, tz:2 },
    '마거릿 대처': { label:'영국 그래섬', lat:52.9115, lon:-0.6411, tz:0 },
    '기시다 후미오': { label:'일본 도쿄', lat:35.6762, lon:139.6503, tz:9 },
    '아베 신조': { label:'일본 도쿄', lat:35.6762, lon:139.6503, tz:9 },
    '나렌드라 모디': { label:'인도 바드나가르', lat:23.7863, lon:72.6380, tz:5.5 }
  };
  var _knownTime = {
    '힐러리 클린턴': true,
    '카말라 해리스': true,
    '브래드 피트 Brad Pitt': true,
    '안젤리나 졸리 Angelina Jolie': true,
    '샤루크 칸 Shah Rukh Khan': true,
    '아미타브 바찬 Amitabh Bachchan': true
  };
  CELEBS.forEach(function(c) {
    if (_geo[c.name]) c.birthGeo = _geo[c.name];
    if (_knownTime[c.name]) c.timeKnown = true;
  });
})();

// ── 글로벌 유명인 데이터 (JP · CN · US · IN · EU) ──────────────────────────
const GLOBAL_CELEBS = [
  /* ── 일본 JP ──────────────────────────────────────────────── */
  {cat:'배우',      name:'기무라 타쿠야 木村拓哉',          birth:'1972-11-04',hour:12,minute:0,nationality:'JP'},
  {cat:'배우',      name:'사토 타케루 佐藤健',               birth:'1989-03-21',hour:12,minute:0,nationality:'JP'},
  {cat:'배우',      name:'이시하라 사토미 石原さとみ',       birth:'1986-12-24',hour:12,minute:0,nationality:'JP'},
  {cat:'배우',      name:'와타나베 켄 渡辺謙',               birth:'1959-10-21',hour:12,minute:0,nationality:'JP'},
  {cat:'배우',      name:'기타노 타케시 北野武',             birth:'1947-01-18',hour:12,minute:0,nationality:'JP'},
  {cat:'배우',      name:'미야자키 하야오 宮崎駿',           birth:'1941-01-05',hour:12,minute:0,nationality:'JP'},
  {cat:'배우',      name:'구로사와 아키라 黒澤明',           birth:'1910-03-23',hour:12,minute:0,nationality:'JP'},
  {cat:'가수·솔로', name:'아무로 나미에 安室奈美恵',         birth:'1977-09-20',hour:12,minute:0,nationality:'JP'},
  {cat:'가수·솔로', name:'우타다 히카루 宇多田ヒカル',       birth:'1983-01-19',hour:12,minute:0,nationality:'JP'},
  {cat:'가수·솔로', name:'요네즈 켄시 米津玄師',             birth:'1991-09-19',hour:12,minute:0,nationality:'JP'},
  {cat:'가수·솔로', name:'후쿠야마 마사하루 福山雅治',       birth:'1969-02-06',hour:12,minute:0,nationality:'JP'},
  {cat:'가수·솔로', name:'마쯔다 세이코 松田聖子',           birth:'1962-03-10',hour:12,minute:0,nationality:'JP'},
  {cat:'글로벌기업인',name:'오타니 쇼헤이 大谷翔平',        birth:'1994-07-05',hour:12,minute:0,nationality:'JP'},
  {cat:'글로벌기업인',name:'하뉴 유즈루 羽生結弦',          birth:'1994-12-07',hour:12,minute:0,nationality:'JP'},
  {cat:'글로벌기업인',name:'이치로 鈴木一朗',                birth:'1973-10-22',hour:12,minute:0,nationality:'JP'},

  /* ── 중국 CN ──────────────────────────────────────────────── */
  {cat:'배우',      name:'성룡 成龍 Jackie Chan',            birth:'1954-04-07',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'이연걸 李連杰 Jet Li',             birth:'1963-04-26',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'장쯔이 章子怡 Zhang Ziyi',         birth:'1979-02-09',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'공리 巩俐 Gong Li',                birth:'1965-12-31',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'류더화 劉德華 Andy Lau',           birth:'1961-09-27',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'딜라바 迪麗熱巴 Dilraba',          birth:'1992-06-03',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'양미 楊冪 Yang Mi',                birth:'1986-09-12',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'양자경 楊紫瓊 Michelle Yeoh',      birth:'1962-08-25',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'량차오웨이 梁朝偉 Tony Leung',     birth:'1962-06-27',hour:12,minute:0,nationality:'CN'},
  {cat:'배우',      name:'판빙빙 范冰冰 Fan Bingbing',       birth:'1981-09-16',hour:12,minute:0,nationality:'CN'},
  {cat:'가수·솔로', name:'왕페이 王菲 Faye Wong',            birth:'1969-08-08',hour:12,minute:0,nationality:'CN'},
  {cat:'가수·솔로', name:'장학우 張學友 Jacky Cheung',       birth:'1961-07-10',hour:12,minute:0,nationality:'CN'},
  {cat:'가수·솔로', name:'저우제룬 周杰倫 Jay Chou',         birth:'1979-01-18',hour:12,minute:0,nationality:'CN'},

  /* ── 미국 US ──────────────────────────────────────────────── */
  {cat:'배우',      name:'브래드 피트 Brad Pitt',            birth:'1963-12-18',hour:6, minute:31,nationality:'US'},
  {cat:'배우',      name:'안젤리나 졸리 Angelina Jolie',     birth:'1975-06-04',hour:9, minute:9, nationality:'US'},
  {cat:'배우',      name:'레오나르도 디카프리오 Leonardo DiCaprio',birth:'1974-11-11',hour:12,minute:0,nationality:'US'},
  {cat:'배우',      name:'스칼렛 요한슨 Scarlett Johansson', birth:'1984-11-22',hour:12,minute:0,nationality:'US'},
  {cat:'배우',      name:'크리스 에반스 Chris Evans',        birth:'1981-06-13',hour:12,minute:0,nationality:'US'},
  {cat:'배우',      name:'드웨인 존슨 Dwayne Johnson',       birth:'1972-05-02',hour:12,minute:0,nationality:'US'},
  {cat:'배우',      name:'메릴 스트립 Meryl Streep',         birth:'1949-06-22',hour:12,minute:0,nationality:'US'},
  {cat:'배우',      name:'키아누 리브스 Keanu Reeves',       birth:'1964-09-02',hour:12,minute:0,nationality:'US'},
  {cat:'배우',      name:'로버트 다우니 주니어 Robert Downey Jr.', birth:'1965-04-04',hour:12,minute:0,nationality:'US'},
  {cat:'가수·솔로', name:'테일러 스위프트 Taylor Swift',     birth:'1989-12-13',hour:12,minute:0,nationality:'US'},
  {cat:'가수·솔로', name:'비욘세 Beyoncé',                   birth:'1981-09-04',hour:12,minute:0,nationality:'US'},
  {cat:'가수·솔로', name:'레이디 가가 Lady Gaga',            birth:'1986-03-28',hour:12,minute:0,nationality:'US'},
  {cat:'가수·솔로', name:'아리아나 그란데 Ariana Grande',    birth:'1993-06-26',hour:12,minute:0,nationality:'US'},
  {cat:'가수·솔로', name:'마이클 잭슨 Michael Jackson',      birth:'1958-08-29',hour:12,minute:0,nationality:'US'},
  {cat:'가수·솔로', name:'빌리 아일리시 Billie Eilish',      birth:'2001-12-18',hour:12,minute:0,nationality:'US'},
  {cat:'가수·솔로', name:'에미넴 Eminem',                    birth:'1972-10-17',hour:12,minute:0,nationality:'US'},
  {cat:'글로벌기업인',name:'마이클 조던 Michael Jordan',     birth:'1963-02-17',hour:12,minute:0,nationality:'US'},
  {cat:'글로벌기업인',name:'르브론 제임스 LeBron James',     birth:'1984-12-30',hour:12,minute:0,nationality:'US'},
  {cat:'글로벌기업인',name:'세레나 윌리엄스 Serena Williams',birth:'1981-09-26',hour:12,minute:0,nationality:'US'},
  {cat:'글로벌기업인',name:'타이거 우즈 Tiger Woods',        birth:'1975-12-30',hour:12,minute:0,nationality:'US'},

  /* ── 인도 IN ──────────────────────────────────────────────── */
  {cat:'배우',      name:'샤루크 칸 Shah Rukh Khan',         birth:'1965-11-02',hour:14,minute:26,nationality:'IN'},
  {cat:'배우',      name:'아미타브 바찬 Amitabh Bachchan',   birth:'1942-10-11',hour:16,minute:0, nationality:'IN'},
  {cat:'배우',      name:'프리얀카 초프라 Priyanka Chopra',  birth:'1982-07-18',hour:12,minute:0, nationality:'IN'},
  {cat:'배우',      name:'디피카 파두콘 Deepika Padukone',   birth:'1986-01-05',hour:12,minute:0, nationality:'IN'},
  {cat:'배우',      name:'살만 칸 Salman Khan',              birth:'1965-12-27',hour:12,minute:0, nationality:'IN'},
  {cat:'배우',      name:'아미르 칸 Aamir Khan',             birth:'1965-03-14',hour:12,minute:0, nationality:'IN'},
  {cat:'글로벌기업인',name:'순다르 피차이 Sundar Pichai',    birth:'1972-07-10',hour:12,minute:0, nationality:'IN'},
  {cat:'글로벌기업인',name:'인드라 누이 Indra Nooyi',        birth:'1955-10-28',hour:12,minute:0, nationality:'IN'},
  {cat:'글로벌기업인',name:'비라트 콜리 Virat Kohli',        birth:'1988-11-05',hour:12,minute:0, nationality:'IN'},
  {cat:'글로벌기업인',name:'사친 텐둘카르 Sachin Tendulkar', birth:'1973-04-24',hour:12,minute:0, nationality:'IN'},

  /* ── 유럽 EU ──────────────────────────────────────────────── */
  {cat:'글로벌기업인',name:'크리스티아누 호날두 Cristiano Ronaldo', birth:'1985-02-05',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'리오넬 메시 Lionel Messi',       birth:'1987-06-24',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'데이비드 베컴 David Beckham',    birth:'1975-05-02',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'킬리안 음바페 Kylian Mbappé',    birth:'2000-12-20',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'즐라탄 이브라히모비치 Zlatan Ibrahimović',birth:'1981-10-03',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'에르링 홀란 Erling Haaland',     birth:'2000-07-21',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'루카 모드리치 Luka Modrić',      birth:'1985-09-09',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'로버트 레반도프스키 Robert Lewandowski',birth:'1988-08-21',hour:12,minute:0,nationality:'EU'},
  {cat:'가수·솔로', name:'에드 시런 Ed Sheeran',             birth:'1991-02-17',hour:12,minute:0,nationality:'EU'},
  {cat:'가수·솔로', name:'아델 Adele',                       birth:'1988-05-05',hour:12,minute:0,nationality:'EU'},
  {cat:'가수·솔로', name:'크리스 마틴 Coldplay',             birth:'1977-03-02',hour:12,minute:0,nationality:'EU'},
  {cat:'가수·솔로', name:'존 레논 John Lennon',              birth:'1940-10-09',hour:6, minute:30,nationality:'EU'},
  {cat:'배우',      name:'케이트 윈슬렛 Kate Winslet',       birth:'1975-10-05',hour:12,minute:0,nationality:'EU'},
  {cat:'배우',      name:'엠마 왓슨 Emma Watson',            birth:'1990-04-15',hour:12,minute:0,nationality:'EU'},
  {cat:'배우',      name:'베네딕트 컴버배치 Benedict Cumberbatch',birth:'1976-07-19',hour:12,minute:0,nationality:'EU'},
  {cat:'배우',      name:'다니엘 크레이그 Daniel Craig',      birth:'1968-03-02',hour:12,minute:0,nationality:'EU'},
  {cat:'배우',      name:'오드리 헵번 Audrey Hepburn',        birth:'1929-05-04',hour:12,minute:0,nationality:'EU'},
  {cat:'글로벌기업인',name:'모차르트 Wolfgang Mozart',       birth:'1756-01-27',hour:20,minute:0, nationality:'EU'},
  {cat:'글로벌기업인',name:'베토벤 Ludwig van Beethoven',    birth:'1770-12-17',hour:12,minute:0, nationality:'EU'},
  {cat:'글로벌기업인',name:'리처드 브랜슨 Richard Branson',  birth:'1950-07-18',hour:12,minute:0, nationality:'EU'}
];

// ── Upsert: 중복(이름+생년월일) 없이 GLOBAL_CELEBS를 CELEBS에 병합 ──────────
(function() {
  var _key = function(c) { return c.name.toLowerCase() + '|' + c.birth; };
  var _existing = Object.create(null);
  CELEBS.forEach(function(c) { _existing[_key(c)] = true; });
  GLOBAL_CELEBS.forEach(function(c) {
    if (!_existing[_key(c)]) { CELEBS.push(c); _existing[_key(c)] = true; }
  });
})();

function populateCelebList(){
  var container=document.getElementById('celebsList');
  if(!container) return;
  container.innerHTML='';

  // 카테고리 탭 바
  var tabBar=document.createElement('div');
  tabBar.className='celeb-tab-wrap';
  tabBar.id='celebTabBar';

  var cats=['전체'].concat(CELEB_CATS);
  cats.forEach(function(cat,i){
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='celeb-tab-btn'+(i===0?' active':'');
    btn.dataset.cat=(cat==='전체')?'':cat;
    btn.innerHTML=(CELEB_CAT_ICONS[cat]||'')+'&nbsp;'+cat;
    tabBar.appendChild(btn);
  });
  container.appendChild(tabBar);

  // 유명인 이름 버튼 영역
  var btnArea=document.createElement('div');
  btnArea.id='celebBtnArea';
  btnArea.className='celeb-name-area';
  container.appendChild(btnArea);

  // 탭 클릭 → 이벤트 위임
  tabBar.addEventListener('click', function(e){
    var tabBtn=e.target.closest('.celeb-tab-btn');
    if(!tabBtn) return;
    tabBar.querySelectorAll('.celeb-tab-btn').forEach(function(b){b.classList.remove('active');});
    tabBtn.classList.add('active');
    renderCelebs(tabBtn.dataset.cat||null);
  });

  // 유명인 버튼 클릭 → 이벤트 위임 (모바일 스크롤 vs 탭 구별)
  var _celebStartY=0, _celebStartX=0, _celebMoved=false;
  btnArea.addEventListener('touchstart', function(e){
    var t=e.touches[0];
    _celebStartY=t.clientY; _celebStartX=t.clientX; _celebMoved=false;
  }, {passive:true});
  btnArea.addEventListener('touchmove', function(e){
    var t=e.touches[0];
    if(Math.abs(t.clientY-_celebStartY)>8||Math.abs(t.clientX-_celebStartX)>8) _celebMoved=true;
  }, {passive:true});
  btnArea.addEventListener('click', function(e){
    if(_celebMoved){_celebMoved=false;return;}/* 스크롤 제스처 시 클릭 무시 */
    var nameBtn=e.target.closest('.celeb-btn');
    if(!nameBtn) return;
    e.preventDefault();
    btnArea.querySelectorAll('.celeb-btn').forEach(function(b){b.classList.remove('active');});
    nameBtn.classList.add('active');
    setCeleb({
      name: nameBtn.dataset.name,
      birth: nameBtn.dataset.birth,
      hour: parseInt(nameBtn.dataset.hour)||12,
      minute: parseInt(nameBtn.dataset.minute)||0
    });
  });

  function renderCelebs(filterCat){
    btnArea.classList.add('fading');/* 전환 중 클릭 차단 */
    btnArea.style.opacity='0';
    btnArea.style.transition='opacity 0.15s';
    setTimeout(function(){
      btnArea.innerHTML='';
      var list=filterCat
        ?CELEBS.filter(function(c){return c.cat===filterCat;})
        :CELEBS;
      list.forEach(function(c){
        var btn=document.createElement('button');
        btn.type='button';
        btn.className='celeb-btn';
        btn.textContent=c.name;
        btn.dataset.name=c.name;
        btn.dataset.birth=c.birth;
        btn.dataset.hour=c.hour!==undefined?c.hour:12;
        btn.dataset.minute=c.minute!==undefined?c.minute:0;
        btn.dataset.cat=c.cat;
        btnArea.appendChild(btn);
      });
      btnArea.style.opacity='1';
      btnArea.classList.remove('fading');/* 전환 완료 → 클릭 허용 */
    }, 120);
  }
  renderCelebs(null);
}

function setCeleb(c){
  document.getElementById('compatName').value=c.name;
  document.getElementById('compatBirthDate').value=c.birth;
  document.getElementById('compatBirthHour').value=(c.hour!==undefined?c.hour:12);
  document.getElementById('compatBirthMinute').value=(c.minute!==undefined?c.minute:0);
  /* 양/음력 라디오 프리뷰도 업데이트 */
  try{updateLunarPreview('compatBirthDate','compatCalType','compatLunarPreview');}catch(e){}
  /* 사주 미계산 시에는 폼만 채우고 안내 */
  if(!G_PILLARS||!G_NATAL||!G_POWER||!G_JOHU){
    var compatRunBtn=document.getElementById('compatRunBtn');
    if(compatRunBtn){
      compatRunBtn.scrollIntoView({behavior:'smooth',block:'center'});
      compatRunBtn.style.transition='box-shadow .3s';
      compatRunBtn.style.boxShadow='0 0 0 4px rgba(255,139,167,.5)';
      setTimeout(function(){compatRunBtn.style.boxShadow='';},1500);
    }
    return;
  }
  runCompat();
}

/** 궁합 LLM 카드 마운트: #compatLlmHost 없으면 compatResult 뒤에 생성 */
function cdEnsureCompatLlmHost() {
  var h = document.getElementById('compatLlmHost');
  if (h) return h;
  var cr = document.getElementById('compatResult');
  if (!cr || !cr.parentNode) return null;
  h = document.createElement('div');
  h.id = 'compatLlmHost';
  h.className = 'compat-llm-root';
  h.style.marginTop = '14px';
  cr.parentNode.insertBefore(h, cr.nextSibling);
  return h;
}

/** compat-llm-prompts.js의 window.cdEnsureCompatLlmReady 사용 (콜백 큐·폴링) */

async function runCompat(){
  if(!G_PILLARS||!G_NATAL||!G_POWER||!G_JOHU){
    alert('먼저 내 사주를 계산한 뒤에 궁합을 볼 수 있어요 🐷');return;
  }
  var compatRunBtn = document.getElementById('compatRunBtn');
  if (compatRunBtn) {
    compatRunBtn.disabled = true;
    compatRunBtn.style.opacity = '0.7';
  }
  var name=(document.getElementById('compatName').value||'상대방').trim();
  var bd=document.getElementById('compatBirthDate').value;
  var type=document.getElementById('compatType').value||'love';
  if(!bd){
    alert('상대의 생년월일을 입력해주세요');
    if (compatRunBtn) {
      compatRunBtn.disabled = false;
      compatRunBtn.style.opacity = '';
    }
    return;
  }

  /* 🔒 사주 궁합 50코인 게이트 */
  if (typeof window._cdCoinGatePerUse === 'function') {
    window._cdCoinGatePerUse(50, '사주 궁합 분석', function() {
      runCompatCore(compatRunBtn, name, bd, type);
    }, function() {
      if (compatRunBtn) {
        compatRunBtn.disabled = false;
        compatRunBtn.style.opacity = '';
      }
    });
    return;
  }

  // ⚠️ 미로그인 상태: _cdCoinGatePerUse 미정의
  var token = '';
  try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
  if (!token) {
    if (compatRunBtn) {
      compatRunBtn.disabled = false;
      compatRunBtn.style.opacity = '';
    }
    if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) {
      window.location.href = '/login?next=%2F';
    }
    return;
  }
  window.alert('서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  if (compatRunBtn) {
    compatRunBtn.disabled = false;
    compatRunBtn.style.opacity = '';
  }
  return;
}

async function runCompatCore(compatRunBtn, name, bd, type){
  var compatCalBtns = document.getElementsByName('compatCalType');
  var compatCalType = 'solar';
  for(var i=0; i<compatCalBtns.length; i++) { if(compatCalBtns[i].checked) { compatCalType = compatCalBtns[i].value; break; } }

  var hour=parseInt(document.getElementById('compatBirthHour').value)||12;
  var minute=parseInt(document.getElementById('compatBirthMinute').value)||0;

  var actualDateInfo = await getActualSolarDateWithContext(bd, compatCalType, {
    hour: hour,
    minute: minute,
    second: 0,
    setCurrent: false
  });
  if(!actualDateInfo) {
    alert('날짜 변환에 실패했습니다. 다시 확인해주세요.');
    if (compatRunBtn) {
      compatRunBtn.disabled = false;
      compatRunBtn.style.opacity = '';
    }
    return;
  }

  var rawBdParts = bd.split('-').map(function(v){ return parseInt(v, 10); });
  
  var year=actualDateInfo.y, month=actualDateInfo.m, day=actualDateInfo.d;

  try{
    var meMeta = window._ziweiInputMeta || {};
    var meInputDate = meMeta.inputDate || {};
    var meBirth = window._ziweiBirth || window._astroBirth || null;
    var meCalType = meMeta.calType || 'solar';
    var meYear = meInputDate.year || (window._astroBirth && window._astroBirth.year) || (meBirth && meBirth.year) || null;
    var meMonth = meInputDate.month || (window._astroBirth && window._astroBirth.month) || (meBirth && meBirth.month) || null;
    var meDay = meInputDate.day || (window._astroBirth && window._astroBirth.day) || (meBirth && meBirth.day) || null;

    var selfKasiInput = null;
    if (meYear && meMonth && meDay) {
      selfKasiInput = {
        calendarType: meCalType,
        year: meYear,
        month: meMonth,
        day: meDay,
        hour: (meInputDate.hour != null ? meInputDate.hour : ((window._astroBirth && window._astroBirth.hour) || (meBirth && meBirth.hour) || 12)),
        minute: (meInputDate.minute != null ? meInputDate.minute : ((window._astroBirth && window._astroBirth.minute) || (meBirth && meBirth.minute) || 0)),
        second: 0,
        latitude: meMeta.latitude != null ? meMeta.latitude : ((meBirth && meBirth.lat) || 37.5665),
        longitude: meMeta.longitude != null ? meMeta.longitude : ((meBirth && meBirth.lon) || 126.9780),
        tzOffsetHours: meBirth && meBirth.tz != null ? meBirth.tz : 9
      };
    }

    var partnerKasiInput = {
      calendarType: compatCalType,
      year: rawBdParts[0] || year,
      month: rawBdParts[1] || month,
      day: rawBdParts[2] || day,
      hour: hour,
      minute: minute,
      second: 0,
      latitude: meMeta.latitude != null ? meMeta.latitude : ((meBirth && meBirth.lat) || 37.5665),
      longitude: meMeta.longitude != null ? meMeta.longitude : ((meBirth && meBirth.lon) || 126.9780),
      tzOffsetHours: meBirth && meBirth.tz != null ? meBirth.tz : 9
    };

    var pairCtx = null;
    try {
      var selfLocalCtx = selfKasiInput
        ? await resolvePrimaryCalendarContext(selfKasiInput, { setCurrent: false })
        : null;
      var partnerLocalCtx = await resolvePrimaryCalendarContext(partnerKasiInput, { setCurrent: false });
      pairCtx = { self: selfLocalCtx, partner: partnerLocalCtx };
      if (window.KasiCalendarService && typeof window.KasiCalendarService.setContextAlias === 'function') {
        if (selfLocalCtx) window.KasiCalendarService.setContextAlias('compat-self', selfLocalCtx);
        if (partnerLocalCtx) window.KasiCalendarService.setContextAlias('compat-partner', partnerLocalCtx);
      }
    } catch (pairErr) {
      console.warn('[Compat] local pair context fallback:', pairErr);
    }

    if (pairCtx && pairCtx.partner && pairCtx.partner.solar) {
      year = pairCtx.partner.solar.year || year;
      month = pairCtx.partner.solar.month || month;
      day = pairCtx.partner.solar.day || day;
    }

    var solar=Solar.fromYmdHms(year,month,day,hour,minute,0);
    var bazi=solar.getLunar().getEightChar();

    var kasiYearPair = pairCtx && pairCtx.partner && pairCtx.partner.ganji ? parseKasiGanjiPair(pairCtx.partner.ganji.year) : null;
    var kasiMonthPair = pairCtx && pairCtx.partner && pairCtx.partner.ganji ? parseKasiGanjiPair(pairCtx.partner.ganji.month) : null;
    var kasiDayPair = pairCtx && pairCtx.partner && pairCtx.partner.ganji ? parseKasiGanjiPair(pairCtx.partner.ganji.day) : null;
    var kasiApplied = !!(kasiYearPair && kasiMonthPair && kasiDayPair);
    
    if (kasiApplied) {
      bazi.getYearGan = function() { return kasiYearPair.g; };
      bazi.getYearZhi = function() { return kasiYearPair.j; };
      bazi.getMonthGan = function() { return kasiMonthPair.g; };
      bazi.getMonthZhi = function() { return kasiMonthPair.j; };
      bazi.getDayGan = function() { return kasiDayPair.g; };
      bazi.getDayZhi = function() { return kasiDayPair.j; };
    } else {
      try {
        var _d = new Date(year, month-1, day, hour, minute);
        var _gj = KasiEngine.getGanji(_d);
        if (_gj && _gj.secha && _gj.weolgeon && _gj.iljin) {
            bazi.getYearGan = function() { return _gj.secha[0]; };
            bazi.getYearZhi = function() { return _gj.secha[1]; };
            bazi.getMonthGan = function() { return _gj.weolgeon[0]; };
            bazi.getMonthZhi = function() { return _gj.weolgeon[1]; };
            bazi.getDayGan = function() { return _gj.iljin[0]; };
            bazi.getDayZhi = function() { return _gj.iljin[1]; };
        }
      } catch(e) {}
    }
    
    var yg=bazi.getYearGan(),yz=bazi.getYearZhi();
    var mg=bazi.getMonthGan(),mz=bazi.getMonthZhi();
    var dg=bazi.getDayGan(),dz=bazi.getDayZhi();
    var hg=bazi.getTimeGan(),hz=bazi.getTimeZhi();

    var p2={
      y:{g:yg,j:yz,gE:(GAN[yg]||{}).e,jE:(JI[yz]||{}).e},
      m:{g:mg,j:mz,gE:(GAN[mg]||{}).e,jE:(JI[mz]||{}).e},
      d:{g:dg,j:dz,gE:(GAN[dg]||{}).e,jE:(JI[dz]||{}).e},
      h:{g:hg,j:hz,gE:(GAN[hg]||{}).e,jE:(JI[hz]||{}).e}
    };
    var natal2=calcNatalElement(p2);
    var johu2=analyzeJohu(p2);
    var power2=calcPower(p2);
    var jong2=detectJong(p2);

    var partnerBirthForZiwei = {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      lat: meMeta.latitude != null ? meMeta.latitude : ((meBirth && meBirth.lat) || 37.5665),
      lon: meMeta.longitude != null ? meMeta.longitude : ((meBirth && meBirth.lon) || 126.9780),
      tz: meBirth && meBirth.tz != null ? meBirth.tz : 9
    };
    var meBirthForZiwei = meBirth || {
      year: meYear || year,
      month: meMonth || month,
      day: meDay || day,
      hour: 12,
      minute: 0,
      lat: partnerBirthForZiwei.lat,
      lon: partnerBirthForZiwei.lon,
      tz: partnerBirthForZiwei.tz
    };
    var meBirthForAstro = window._astroBirth || meBirthForZiwei;
    var partnerBirthForAstro = {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      lat: partnerBirthForZiwei.lat,
      lon: partnerBirthForZiwei.lon,
      tz: partnerBirthForZiwei.tz
    };

    var ziweiLite = computeZiweiCompatLite(meBirthForZiwei, partnerBirthForZiwei);
    var astroLite = computeAstroCompatLite(meBirthForAstro, partnerBirthForAstro);
    var blendInfo = {
      ziwei: ziweiLite,
      astro: astroLite,
      source: {
        kasiPairResolved: !!pairCtx,
        kasiGanjiApplied: kasiApplied
      }
    };

    var resultArea=document.getElementById('compatResult');
    var llmHost=cdEnsureCompatLlmHost();
    if(llmHost) llmHost.innerHTML='';
    var compat=analyzeCompat(G_PILLARS,G_NATAL,G_POWER,G_JOHU,G_JONG,p2,natal2,power2,johu2,jong2,type,name,blendInfo);
    if(resultArea) resultArea.innerHTML=compat.html;
    var pastHtml=analyzePastLifeCompat(G_PILLARS,p2,name);
    if(resultArea) resultArea.insertAdjacentHTML('beforeend',pastHtml);
    cdEnsureCompatLlmReady(function(){
      var host = cdEnsureCompatLlmHost();
      if (!host) return;
      if (!window.CompatLlm || typeof window.CompatLlm.mountSaju !== 'function') {
        host.innerHTML = '<div style="color:#fda4af;font-size:0.85rem;padding:10px;border-radius:10px;border:1px solid rgba(251,113,133,0.35);">AI 프롬프트 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</div>';
        return;
      }
      try{
        window.CompatLlm.mountSaju(host,G_PILLARS,p2,G_NATAL,natal2,type,typeof USER_NAME==='string'?USER_NAME:'나',name,{
          birthDate: bd,
          calendarType: compatCalType,
          hour: hour,
          minute: minute
        },{
          selfJong: G_JONG,
          selfPower: G_POWER,
          partnerJong: jong2,
          partnerPower: power2
        });
      }catch(llmE){ console.warn('[CompatLlm saju]',llmE); }
    });
    if(resultArea) setTimeout(function(){ resultArea.scrollIntoView({behavior:'smooth', block:'start'}); }, 50);
  }catch(e){
    console.error('compat error',e);
    alert('궁합 계산 중 오류가 발생했어요: '+e.message);
  }finally{
    if (compatRunBtn) {
      compatRunBtn.disabled = false;
      compatRunBtn.style.opacity = '';
    }
  }
}

function analyzeCompat(p1,n1,pw1,jh1,jg1,p2,n2,pw2,jh2,jg2,type,name,blendInfo){
  var score=0;
  var reasons=[];

  function isHot(j){return j&& (j.type==='hot'||j.type==='warm');}
  function isCold(j){return j&& (j.type==='cold'||j.type==='cool');}

  if(jh1&&jh2){
    if((isHot(jh1)&&isCold(jh2))||(isCold(jh1)&&isHot(jh2))){
      score+=4;
      reasons.push('한쪽은 뜨겁고 한쪽은 차가워 서로의 기온을 예쁘게 중화해주는 궁합이에요.');
    }else if(isHot(jh1)&&isHot(jh2)){
      score-=3;
      reasons.push('둘 다 뜨거운 편이라 감정의 불꽃은 강하지만, 다툼도 쉽게 커질 수 있는 불(火) 과열 궁합입니다.');
    }else if(isCold(jh1)&&isCold(jh2)){
      score-=3;
      reasons.push('둘 다 차가운 편이라 안정감은 있지만, 서로가 서로에게 온기를 채워주기엔 다소 부족할 수 있어요.');
    }else{
      score+=1;
      reasons.push('기온이 크게 충돌하진 않지만, 한쪽이 살짝 더 '+(isHot(jh1)?'따뜻한':'차가운')+' 편이라 균형을 잡아주는 구조입니다.');
    }
    if(jh1.moistType&&jh2.moistType){
      if(jh1.moistType==='wet'&&jh2.moistType==='dry' || jh1.moistType==='dry'&&jh2.moistType==='wet'){
        score+=3;
        reasons.push('한 사람은 촉촉하고 한 사람은 건조한 체질이라, 습조(濕燥)가 서로를 채워주는 이상적인 궁합입니다.');
      }else if(jh1.moistType===jh2.moistType&&jh1.moistType!=='balanced'){
        score-=2;
        reasons.push('둘 다 '+(jh1.moistType==='wet'?'습기가 많은':'건조한')+' 편이라, 컨디션이 나쁠 때 함께 늘어지거나 메말라 있기 쉬운 구조입니다.');
      }else{
        score+=0.5;
        reasons.push('습조(濕燥) 면에서는 크게 충돌하지 않고, 일상 컨디션도 비슷한 편으로 흘러가는 궁합입니다.');
      }
    }
  }

  var e1=n1.dominant,e2=n2.dominant;
  if(e1===e2){
    score+=1;
    reasons.push('둘 다 '+EL_K[e1]+' 기운이 강해 비슷한 코드와 리듬을 공유합니다.');
    if((n1.counts[e1]||0)>=4&&(n2.counts[e2]||0)>=4){
      score-=2;
      reasons.push('다만 같은 오행이 둘 다 너무 강해서, 의견 충돌 시 양보가 잘 안 되는 구조이기도 해요.');
    }
  }
  if(SHENG[e1]===e2){
    score+=3;
    reasons.push(EL_K[e1]+' 이 '+EL_K[e2]+' 을(를) 생해주는 구조라, 한쪽이 자연스럽게 다른 쪽을 키워주는 상생 궁합입니다.');
  }else if(SHENG[e2]===e1){
    score+=3;
    reasons.push(EL_K[e2]+' 이 '+EL_K[e1]+' 을(를) 도와주는 구조라, 서로를 성장시키는 든든한 지원자 관계입니다.');
  }
  if(KE[e1]===e2||KE[e2]===e1){
    score-=2;
    reasons.push('기본적으로 상극 관계('+EL_K[e1]+' ↔ '+EL_K[e2]+')라, 긴장감과 신경전이 쉽게 생길 수 있는 궁합입니다.');
  }

  var g1=p1.d.g,g2=p2.d.g,j1=p1.d.j,j2=p2.d.j;
  var GANHE_C={
    '甲':{'己':true},'己':{'甲':true},
    '乙':{'庚':true},'庚':{'乙':true},
    '丙':{'辛':true},'辛':{'丙':true},
    '丁':{'壬':true},'壬':{'丁':true},
    '戊':{'癸':true},'癸':{'戊':true}
  };
  var JIHE_C={
    '子':{'丑':true},'丑':{'子':true},
    '寅':{'亥':true},'亥':{'寅':true},
    '卯':{'戌':true},'戌':{'卯':true},
    '辰':{'酉':true},'酉':{'辰':true},
    '巳':{'申':true},'申':{'巳':true},
    '午':{'未':true},'未':{'午':true}
  };
  var CHONG_G=[['甲','庚'],['乙','辛'],['丙','壬'],['丁','癸']];
  var CHONG_J=[['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];

  if(GANHE_C[g1]&&GANHE_C[g1][g2]){
    score+=3;
    reasons.push('두 사람의 일간 천간이 합(合)을 이루어, 기본적으로 마음 코드가 잘 맞는 궁합입니다.');
  }
  if(JIHE_C[j1]&&JIHE_C[j1][j2]){
    score+=2;
    reasons.push('일지(배우자 자리)에서 육합이 이루어져, 같이 있을 때 편안함과 끌림이 강하게 느껴지는 구조입니다.');
  }
  CHONG_G.forEach(function(p){
    if((p[0]===g1&&p[1]===g2)||(p[1]===g1&&p[0]===g2)){
      score-=3;
      reasons.push('일간이 충(沖)을 이루어, 좋은 점도 강하지만 부딪칠 때 크게 부딪히는 롤러코스터형 궁합이에요.');
    }
  });
  CHONG_J.forEach(function(p){
    if((p[0]===j1&&p[1]===j2)||(p[1]===j1&&p[0]===j2)){
      score-=3;
      reasons.push('일지가 충(沖)을 이루어, 생활 패턴이나 감정 리듬이 다르게 움직일 수 있습니다. 조율이 중요해요.');
    }
  });

  if(pw1||jg1||pw2||jg2){
    // 퀀텀 명리 엔진: 종격/가종격이면 dominant/parEl이 용신, 克dominant가 기신
    var yong1 = (jg1&&jg1.isJong) ? [jg1.dominant,jg1.parEl].filter(Boolean) : (pw1?pw1.yongshin:[]);
    var yong2 = (jg2&&jg2.isJong) ? [jg2.dominant,jg2.parEl].filter(Boolean) : (pw2?pw2.yongshin:[]);
    var kiji1 = (jg1&&jg1.isJong) ? [whoControls(jg1.dominant)] : (pw1?pw1.kijishin:[]);
    var kiji2 = (jg2&&jg2.isJong) ? [whoControls(jg2.dominant)] : (pw2?pw2.kijishin:[]);

    var commonY=yong1.filter(function(e){return yong2.indexOf(e)>=0;});
    if(commonY.length){
      score+=4;
      reasons.push('두 사람 모두 '+commonY.map(function(e){return EL_E[e]+EL_K[e];}).join(', ')+' 기운을 용신으로 삼아, 인생을 바라보는 핵심 방향이 매우 비슷합니다.');
    }
    var commonSet={};
    commonY.forEach(function(e){commonSet[e]=true;});
    var clashEls=[];
    yong1.forEach(function(e){
      if(!commonSet[e]&&kiji2.indexOf(e)>=0&&clashEls.indexOf(e)===-1)clashEls.push(e);
    });
    yong2.forEach(function(e){
      if(!commonSet[e]&&kiji1.indexOf(e)>=0&&clashEls.indexOf(e)===-1)clashEls.push(e);
    });
    if(clashEls.length){
      score-=4;
      reasons.push('특히 '+clashEls.map(function(e){return EL_E[e]+EL_K[e];}).join(', ')+' 기운은 한쪽에게는 용신, 다른 한쪽에게는 기신으로 작용해, 그 주제에서는 민감하게 부딪힐 수 있는 구조입니다.');
    }
  }

  if(type==='love'){
    if(JIHE_C[j1]&&JIHE_C[j1][j2])score+=1;
    if(isHot(jh1)&&isHot(jh2))score-=1;
  }else if(type==='business'){
    if(pw1&&pw2&&pw1.isStrong&&pw2.isStrong)score+=1;
    CHONG_J.forEach(function(p){
      if((p[0]===j1&&p[1]===j2)||(p[1]===j1&&p[0]===j2))score-=1;
    });
  }else if(type==='friend'){
    if(KE[e1]===e2||KE[e2]===e1)score+=1; // 티키타카용 긴장감
  }

  var allChars1=[p1.y.g,p1.y.j,p1.m.g,p1.m.j,p1.d.g,p1.d.j,p1.h.g,p1.h.j];
  var allChars2=[p2.y.g,p2.y.j,p2.m.g,p2.m.j,p2.d.g,p2.d.j,p2.h.g,p2.h.j];
  // 퀀텀 명리 엔진: 기신 배열 (종격이면 dominant의 극 오행, 아닌 경우 일반 기신)
  var kiji1_ext = (jg1&&jg1.isJong) ? [whoControls(jg1.dominant)] : (pw1?pw1.kijishin:[]);
  var kiji2_ext = (jg2&&jg2.isJong) ? [whoControls(jg2.dominant)] : (pw2?pw2.kijishin:[]);
  var CHONG_MAP={甲:'庚',庚:'甲',乙:'辛',辛:'乙',丙:'壬',壬:'丙',丁:'癸',癸:'丁',
    子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};

  var kijiControlEvents=[];
  if(kiji1_ext.length){
    var kijiChars1=allChars1.filter(function(c){
      var ce=(GAN[c]&&GAN[c].e)||(JI[c]&&JI[c].e);
      return ce&&kiji1_ext.indexOf(ce)>=0;
    });
    kijiChars1.forEach(function(kc){
      allChars2.forEach(function(pc){
        if(pc&&CHONG_MAP[pc]===kc) kijiControlEvents.push({char:kc,by:pc});
      });
    });
    if(kijiControlEvents.length){
      score+=5;
      reasons.push('⭐ 흉신 제어: 상대의 글자('+kijiControlEvents.map(function(e){return e.by;}).join(', ')+')가 당신의 기신('+kijiControlEvents.map(function(e){return e.char;}).join(', ')+')을 충(沖)으로 제거해줍니다. 상대방이 당신의 나쁜 기운을 몰아내주는 최고 궁합의 핵심 요인입니다.');
    }
  }
  var p2KijiEvents=[];
  if(kiji2_ext.length){
    var kijiChars2=allChars2.filter(function(c){
      var ce=(GAN[c]&&GAN[c].e)||(JI[c]&&JI[c].e);
      return ce&&kiji2_ext.indexOf(ce)>=0;
    });
    kijiChars2.forEach(function(kc){
      allChars1.forEach(function(pc){
        if(pc&&CHONG_MAP[pc]===kc) p2KijiEvents.push({char:kc,by:pc});
      });
    });
    if(p2KijiEvents.length){
      score+=4;
      reasons.push('⭐ 역방향 흉신 제어: 당신의 글자('+p2KijiEvents.map(function(e){return e.by;}).join(', ')+')가 상대의 기신을 충으로 제거해줍니다. 당신도 상대에게 해방감을 주는 존재입니다.');
    }
  }

  var GANHE_RESULT_MAP={甲:'earth',己:'earth',乙:'metal',庚:'metal',丙:'water',辛:'water',丁:'wood',壬:'wood',戊:'fire',癸:'fire'};
  var JIHE_RESULT_MAP={子:'earth',丑:'earth',寅:'wood',亥:'wood',卯:'fire',戌:'fire',辰:'metal',酉:'metal',巳:'water',申:'water',午:'fire',未:'fire'};
  var heTrapFound=false;
  allChars1.forEach(function(c1){
    if(!c1||heTrapFound)return;
    allChars2.forEach(function(c2){
      if(!c2||heTrapFound)return;
      var isGH=(GANHE_C[c1]&&GANHE_C[c1][c2]);
      var isJH=(JIHE_C[c1]&&JIHE_C[c1][c2]);
      var rEl=isGH?GANHE_RESULT_MAP[c1]:(isJH?JIHE_RESULT_MAP[c1]:null);
      if(rEl&&kiji1_ext.indexOf(rEl)>=0){
        heTrapFound=true;
        score-=4;
        reasons.push('🚨 합의 함정: '+c1+'와 '+c2+'가 합(合)을 이루면서 결과 오행('+EL_K[rEl]+')이 당신의 기신을 강화합니다. 겉은 잘 맞아 보이나 속으로 해로운 에너지가 쌓이는 구조입니다. 편안함과 중독을 구분하세요.');
      }
    });
  });

  var titleMap={love:'연애/결혼 궁합',business:'사업/동업 궁합',friend:'친구/동료 궁합'};

  var sok=analyzeSokCompat(jh1,p1.m.j,jh2,p2.m.j,p1,p2,type,n1,n2);
  score+=sok.scoreAdj;

  var normalizeMyeongri = function(raw) {
    return Math.max(20, Math.min(96, Math.round(58 + (raw * 2.8))));
  };
  var scoreMyeongri = normalizeMyeongri(score);
  var scoreZiwei = (blendInfo && blendInfo.ziwei && typeof blendInfo.ziwei.score === 'number') ? blendInfo.ziwei.score : 50;
  var scoreAstro = (blendInfo && blendInfo.astro && typeof blendInfo.astro.score === 'number') ? blendInfo.astro.score : 50;
  var integratedScore = Math.max(20, Math.min(96, Math.round((scoreMyeongri * 0.58) + (scoreZiwei * 0.24) + (scoreAstro * 0.18))));
  var integratedSourceBadges = [];
  if (blendInfo && blendInfo.source) {
    if (blendInfo.source.kasiPairResolved) integratedSourceBadges.push('KASI Pair Sync');
    if (blendInfo.source.kasiGanjiApplied) integratedSourceBadges.push('KASI Ganji Applied');
  }

  var grade,gradeCls,gradeLabel,gradeComment;
  if(score>=13){grade='S급';gradeCls='grade-s';gradeLabel='🌟 전생의 은인';gradeComment='타고난 인연입니다. 서로의 부족한 에너지를 정확히 채워주고 기신까지 제거해주는, 명리학적으로 가장 이상적인 궁합입니다.';}
  else if(score>=8){grade='A급';gradeCls='grade-a';gradeLabel='✨ 운명 궁합';gradeComment='기본 코드와 에너지 방향이 잘 맞는 강한 인연입니다. 노력과 배려가 더해지면 오래 함께 성장할 수 있는 무게 있는 궁합입니다.';}
  else if(score>=3){grade='B급';gradeCls='grade-b';gradeLabel='😊 인연 궁합';gradeComment='맞는 부분과 조율이 필요한 부분이 섞여 있지만 충분히 잘 자라날 수 있는 궁합입니다. 서로의 차이를 자원으로 바라보는 시각이 필요합니다.';}
  else if(score>=-2){grade='C급';gradeCls='grade-c';gradeLabel='🙂 평범한 인연';gradeComment='특별히 좋지도 나쁘지도 않은 인연입니다. 운명보다는 선택과 노력이 이 관계의 방향을 결정합니다.';}
  else if(score>=-6){grade='D급';gradeCls='grade-d';gradeLabel='⚠️ 업보 궁합';gradeComment='에너지 방향이 충돌하거나 서로에게 해로운 기운을 증폭시키는 구조입니다. 강한 끌림이 있을 수 있지만 장기적으로 소모가 큰 관계입니다.';}
  else{grade='F급';gradeCls='grade-f';gradeLabel='🌧️ 악연 궁합';gradeComment='서로에게 가장 해로운 에너지를 주고받는 구조입니다. 강렬한 끌림이 있더라도 그것이 소모인지 성장인지 냉철하게 판단해야 합니다.';}

  var str1=(pw1&&pw1.isStrong)?'신강':'신약';
  var str2=(pw2&&pw2.isStrong)?'신강':'신약';
  var factLines=[];
  if(str1==='신강'&&str2==='신약'){
    factLines.push('<b>힘의 불균형 경보:</b> 당신('+g1+') 신강 × 상대('+g2+') 신약. 관계의 운전대는 자연스럽게 당신이 잡게 됩니다. 그 리더십이 "배려"로 포장되면 이 관계는 흔들림 없는 안식처가 되지만, "통제"로 변질되는 순간 상대방은 숨이 막혀 도망치려 할 것입니다. "내 방식이 맞아"라는 무의식적인 억압이 없는지 주기적으로 점검하세요.');
  }else if(str1==='신약'&&str2==='신강'){
    factLines.push('<b>흡수 주의보:</b> 당신('+g1+') 신약 × 상대('+g2+') 신강. 압도적인 상대의 에너지 블랙홀에 당신이 빨려 들어가기 쉬운 구조입니다. 처음엔 든든해서 좋지만, 시간이 지날수록 내 목소리를 잃어버리고 억울함만 쌓일 수 있습니다. 서운함이 한계치를 넘기 전에 아주 사소한 거절부터 연습하여 나만의 프라이버시(경계선)를 사수하세요.');
  }else{
    factLines.push('<b>강대강 / 약대약:</b> 두 사람 모두 '+str1+'/'+str2+' 형태의 동급 에너지 사주를 지녔습니다. 영혼의 무게가 비슷해 안정적이지만, 한번 자존심을 걸고 다투기 시작하면 끝장을 보려는 경향이 다분합니다. 절대 누가 위인지 서열을 정하려 들지 말고 파이를 아주 정확히 반으로 나누어 각자의 영역을 100% 인정해주어야 평화가 유지됩니다.');
  }
  if(KE[e1]===e2){
    factLines.push('<b>일간 상극(당신이 통제자):</b> 당신의 ('+EL_K[e1]+')가 상대의 ('+EL_K[e2]+')를 쥐고 흔듭니다. 당신이 무의식적으로 던진 팩트 폭격이나 평가가 상대에게는 엄청난 상처의 비수로 꽂히고 있을 수 있습니다. 내가 느끼는 가벼운 터치가 상대에겐 주먹질일 수도 있다는 감각의 차이를 잊지 마세요.');
  }else if(KE[e2]===e1){
    factLines.push('<b>일간 상극(당신이 피통제자):</b> 상대의 ('+EL_K[e2]+')가 당신의 ('+EL_K[e1]+')를 짓누릅니다. 당신 스스로도 모르게 착한 아이 콤플렉스가 발동해 무조건 다 맞춰주고 있다면 위험 신호입니다. 참다가 한 번에 폭발(이별/절교)할 확률이 매우 높으니, 관계의 매몰비용을 아까워하지 마세요.');
  }
  if(kijiControlEvents.length){
    factLines.push('<b>약점 보완의 달콤함:</b> 이 사람 옆에 있으면 이유 없이 마음이 편안해지지 않나요? 그것은 우연이 아닙니다. 내 사주를 괴롭히고 뒤틀리게 하는 답답한 흉신(기신)을 상대방의 글자들이 꾹꾹 눌러주며 해독제 역할을 하고 있기 때문입니다. 이 달콤한 편안함을 당연한 권리라 착각하지 말고 진심 어린 보상을 돌려주세요.');
  }
  if(heTrapFound){
    factLines.push('<b>⚠ 합(合)의 함정 경보:</b> 두 사람은 아주 강력한 합으로 엮여 있어 지독한 끌림을 느낍니다. 하지만 주의하세요! 이 편안함이 진짜 성장이 아니라 "우물 안 개구리"처럼 서로의 단점이나 나태함을 눈감아 주는 독이 든 성배(탐합망귀)일 수 있습니다. 익숙함이 빚어낸 맹목적 의존과 진짜 사랑을 예리하게 구분해야 합니다.');
  }
  var factHtml=factLines.map(function(f){return '<div class="compat-check-item"><span class="compat-check-icon" style="color:#d81b60; font-size:1.1rem">🔥</span><span>'+f+'</span></div>';}).join('');

  var advLines=[];
  if(score>=8){
    advLines.push('<b>[유지 천기] 방치 금물:</b> 하늘이 점지해 준 대길(大吉)의 궁합이라도 방치하면 녹슬기 마련입니다. 너무 완벽해서 오히려 루즈해지기 쉬우니 정기적으로 "함께 도달할 새로운 하이그림자 파동 목표(재테크, 여행, 공동 취미)"를 세워 관계에 새로운 숨결을 불어넣으세요.');
  }else if(score>=3){
    advLines.push('<b>[성장 천기] 다름의 미학:</b> 포텐셜은 충분하나 조커 카드 한 장이 부족합니다. 갈등이 생길 때 "왜 나랑 안 맞지?"라고 탓하는 대신, "나와 완전히 반대되는 방식으로 이 상황을 방어해 주고 있구나"라고 시각의 렌즈를 바꾸는 훈련이 필요합니다.');
  }else if(score>=-2){
    advLines.push('<b>[소통 천기] 불만을 언어화하라:</b> "말 안 해도 알겠지"는 이 관계에서 최악의 독약입니다. 이 인연은 가만히 둔다고 저절로 숙성되지 않습니다. 불만이 임계점에 도달하기 전에 아주 건조하고 사무적인 톤으로 내 불편함을 전달하는 감정 빼기 소통법만이 유일한 처방입니다.');
  }else{
    advLines.push('<b>[생존 천기] 룰과 경계선:</b> 사랑이나 우정이라는 감정의 언어로 얼버무리려 하지 마세요. 오히려 변호사처럼 철저하고 구체적인 "우리의 약속(데이트 빈도, 연락 텀, 지출 규칙)"이라는 계약을 세우는 것이 이 위태로운 관계를 지탱하는 가장 안전한 생명줄입니다.');
  }
  
  if(type==='love'){
    advLines.push('<b>[연애 시크릿]:</b> 상대방이 칠흑 같은 어둠 속에 있을 때 다정한 위로 한마디보다, 그 사람의 용신(절대적으로 필요한 오행) 컬러의 옷을 입거나 그 오행에 맞는 데이트 코스(예: 수(水)기운이 필요하면 밤바다, 화(火)기운이 필요하면 밝고 더운 낮 야외)를 기획하는 것이 명리학적으로 100배 더 강력한 영혼의 치유입니다.');
  }else if(type==='business'){
    advLines.push('<b>[동업 시크릿]:</b> 천생연분의 파트너십일지라도 돈의 흐름 앞에서는 반드시 시험대에 오르게 됩니다. 궁합이 좋다고 대충 넘기려 하지 마세요. 역할, 권한, 손절 매뉴얼, 이익 분배율을 가장 안 친한 남처럼 문서로 남겨두는 것만이 이 환상적인 동업을 영원히 비즈니스로 지켜주는 무적의 방패입니다.');
  }else{
    advLines.push('<b>[우정 시크릿]:</b> 완벽한 친구란 내 기대를 모두 채워주는 사람이 아니라, 기대치의 허들을 0으로 낮췄을 때 비로소 발견되는 보석입니다. 상대방이 "무언가를 의무적으로 해줘야 한다"는 압박을 느끼지 않도록 깃털처럼 가볍고 부담 없는 맹물 같은 텐션을 유지하세요.');
  }
  var advHtml=advLines.map(function(a){return '<p style="margin:0 0 10px; line-height:1.75;">'+a+'</p>';}).join('');

  var gradeIcon=score>=13?'🌟':score>=8?'✨':score>=3?'😊':score>=-2?'🙂':score>=-6?'⚠️':'🌧️';
  var html='<div class="compat-wrap">'+
    '<div class="compat-grade-area">'+
    '<div class="compat-grade-icon">'+gradeIcon+'</div>'+
    '<div>'+
    '<div class="compat-grade-badge '+gradeCls+'">'+grade+'</div>'+
    '<div class="compat-grade-label">'+titleMap[type]+' — '+USER_NAME+' × '+name+'<br><span style="font-size:.78rem;color:#888;font-weight:600">'+gradeLabel+'</span></div>'+
    '<div class="compat-grade-desc">'+gradeComment+'</div>'+
    '<div style="margin-top:6px;font-size:.79rem;color:#5f6368;font-weight:700;">멀티 엔진 종합 점수: '+integratedScore+'/100</div>'+
    '</div></div>'+
    '<div class="compat-section">'+
    '<div class="compat-section-title">🧭 다각도 통합 스코어</div>'+
    '<div style="font-size:.8rem;color:#4e5358;line-height:1.7">'
      +'명리 '+scoreMyeongri+' · 자미 '+scoreZiwei+' · 점성 '+scoreAstro+' → <b>종합 '+integratedScore+'</b>/100'
      +(integratedSourceBadges.length ? ('<br><span style="font-size:.72rem;color:#7a7f86">'+integratedSourceBadges.join(' · ')+'</span>') : '')+
    '</div>'+
    '</div>'+
    '<div class="compat-section">'+
    '<div class="compat-section-title">🌡️ 에너지 조화</div>'+
    '<div style="font-size:.8rem;color:#555;line-height:1.7">'+sok.text+'</div>'+
    '</div>'+
    '<div class="compat-section">'+
    '<div class="compat-section-title">📋 궁합 포인트 체크 <span style="font-size:.7rem;font-weight:400;color:#aaa">총점 '+score.toFixed(1)+'점</span></div>'+
    reasons.map(function(r){
      var icon=r.indexOf('⭐')>=0?'⭐':r.indexOf('🚨')>=0?'🚨':r.indexOf('합')>=0||r.indexOf('생')>=0?'💛':'💜';
      return '<div class="compat-check-item"><span class="compat-check-icon">'+icon+'</span><span>'+r.replace(/^[⭐🚨]\s*/,'')+'</span></div>';
    }).join('')+
    '</div>'+
    '<div class="compat-fact-box">'+
    '<div class="compat-fact-title">💥 팩폭 분석 — 이 관계의 진실</div>'+
    '<div class="compat-fact-body">'+factHtml+'</div>'+
    '</div>'+
    '<div class="compat-advice-box">'+
    '<div class="compat-advice-title">🎯 천기적 처방</div>'+
    '<div class="compat-advice-body">'+advHtml+'</div>'+
    '</div>'+
    '</div>';

  return{score:score,integratedScore:integratedScore,grade:grade,gradeCls:gradeCls,label:gradeLabel,emoji:gradeIcon,html:html};
}
function analyzeSokCompat(jh1,mj1,jh2,mj2,p1,p2,type,n1,n2){
  type = type || 'love';
  function isHot(j){return j&&(j.type==='hot'||j.type==='warm');}
  function isCold(j){return j&&(j.type==='cold'||j.type==='cool');}
  function getSeason(z){
    var m={'寅':'봄','卯':'봄','辰':'봄','巳':'여름','午':'여름','未':'여름','申':'가을','酉':'가을','戌':'가을','亥':'겨울','子':'겨울','丑':'겨울'};
    return m[z]||'봄';
  }
  var s1=getSeason(mj1),s2=getSeason(mj2);
  var h1=isHot(jh1),h2=isHot(jh2),c1=isCold(jh1),c2=isCold(jh2);
  var score=0,text='';

  var warmWarmText, coldColdText, mixedText, neutralText;
  if(type==='business'){
    warmWarmText = '🔥 불과 불의 만남: 두 사람 모두 강한 추진력과 긍정적인 에너지를 가지고 있어 프로젝트를 빠르게 밀어붙이는 호흡이 환상적입니다. 브레인스토밍과 영업에서 시너지가 폭발하지만, 감정이 과열되면 사소한 이견이 자존심 싸움으로 번질 수 있습니다. 서로의 역할을 명확히 나누고, 최종 결정 전에는 반드시 하루를 묵히는 쿨다운(Cool-down) 룰을 만드세요.';
    coldColdText = '❄️ 얼음과 얼음의 만남: 둘 다 신중하고 차분하게 상황을 분석하는 스타일이라 장기 프로젝트나 거액이 오가는 비즈니스에서 치명적인 실수를 막아줍니다. 그러나 너무 완벽을 기하다가 시장의 중요한 타이밍을 놓칠 수 있습니다. 때로는 70%의 확신만으로도 과감하게 실행 버튼을 누르는 용기를 서로에게 북돋워주어야 합니다.';
    mixedText = '🌡️ 음양의 조화: 한쪽은 뜨거운 불도저처럼 밀고 나가고, 한쪽은 차가운 이성으로 브레이크와 방향타 역할을 하는 "엑셀과 브레이크"의 이상적인 조합입니다. 이 균형이 유지되면 최고의 성과를 내지만, 속도 차이로 인해 서로를 답답해하거나 경솔하다고 비난할 수 있으니 상대의 방식을 존중하는 커뮤니케이션을 연습하세요.';
    neutralText = '🌱 평온한 대지: 조후(온도) 상으로 큰 충돌 없이 안정적인 궤도를 그리는 협업 관계입니다. 서로의 업무 리듬을 자연스럽게 맞춰갈 수 있어 꾸준한 성과를 내기 좋습니다. 다만 너무 안정에만 머물러 혁신이 부족해질 수 있으니 정기적으로 새로운 인풋을 주입하세요.';
  }else if(type==='friend'){
    warmWarmText = '🔥 불과 불의 만남: 서로 만나기만 하면 텐션이 수직 상승하는 유쾌한 친구입니다. 함께 있으면 에너지가 넘치고 언제나 웃음이 가득하지만, 기분이 상하면 다툼도 한순간에 크게 번질 수 있습니다. 감정이 상했을 때는 너무 깊이 파고들지 말고 특유의 유머로 가볍게 넘어가 주는 센스가 우정을 오래 유지하는 비결입니다.';
    coldColdText = '❄️ 얼음과 얼음의 만남: 말하지 않아도 서로의 온도를 이해하는, 깊고 고요한 호수 같은 우정입니다. 화려하고 시끄러운 만남보다는 차분하게 속을 터놓는 대화를 통해 신뢰를 두텁게 쌓아갑니다. 가끔은 평소에 안 하던 낯설고 활동적인 취미를 함께하며 우정에 활력을 불어넣어 보세요.';
    mixedText = '🌡️ 음양의 조화: 활달함과 차분함이 만나 서로에게 없는 색깔을 채워주는 매력적인 친구 관계입니다. 조용한 친구에게는 즐거운 자극이 되고, 들뜬 친구에게는 평온한 피난처가 됩니다. 서로의 기본 텐션이 다름을 잊지 말고, 쉬는 시간과 노는 시간의 비율을 존중해 주면 평생 가는 친구가 됩니다.';
    neutralText = '🌱 평온한 대지: 같이 있으면 무언가를 애써 하지 않아도 편안한, 마치 오래된 나무 그늘 같은 우정입니다. 에너지 충돌이 없기에 어릴 적 친구처럼 편안하고 자연스럽게 발전하며 서로에게 무해한 좋은 인연입니다.';
  }else{ // love
    warmWarmText = '🔥 불과 불의 만남: 스파크가 튀듯 강렬하게 끌리고, 스킨십과 감정 표현에서도 아주 뜨겁고 열정적인 리듬이 찰떡같이 맞습니다. 서로에게 강한 에너지를 불어넣는 "도파민 파트너"입니다. 하지만 사랑이 과열되어 집착이나 통제로 변질되거나, 작은 서운함이 큰 다툼으로 폭발할 위험도 큽니다. 감정의 온도를 조금 낮추고 각자의 숨 쉴 틈을 존중하면 아주 사랑스러운 매운맛 연애가 됩니다.';
    coldColdText = '❄️ 얼음과 얼음의 만남: 조용히 내리는 눈처럼 서로의 세계에 서서히, 그러나 아주 깊게 스며드는 관계입니다. 겉보기엔 화려한 불꽃이 튀지 않을지 몰라도, 스킨십이나 정서적 교감에서 남들은 모르는 둘만의 깊고 고요한 밀도가 있습니다. 불타오르기보다는 서서히 온도를 덥혀가는 뚝배기 같은 안정감이 매력입니다. 상대의 조용한 표현을 사랑으로 읽어내는 눈이 필요합니다.';
    mixedText = '🌡️ 음양의 조화: 한쪽이 차가운 몸을 녹이려 다가가고, 한쪽은 뜨거운 열기를 식히려 다가가는, 자석의 양극 같은 강렬한 끌림을 가집니다. 성향의 대비가 침대 위에서도, 일상에서도 완벽한 퍼즐 조각처럼 맞물릴 때 엄청난 폭발력을 낳습니다. 다만 에너지의 속도 차이 때문에 한 명은 지치고 한 명은 목마를 수 있으니, 사랑의 언어와 템포를 솔직하게 맞추어 가는 대화가 두 사람의 핵심 과제입니다.';
    neutralText = '🌱 평온한 대지: 한여름의 습함도 한겨울의 칼바람도 없는, 쾌적한 봄가을 날씨 같은 에너지 조화를 이룹니다. 극단적인 롤러코스터보다는 잔잔하고 안정적으로 신뢰를 쌓아가며 편안한 육체적, 정신적 교감을 나누는 데 유리한 아주 건강한 구조입니다.';
  }

  if(h1&&h2){ score+=2; text=warmWarmText; }
  else if(c1&&c2){ score+=1; text=coldColdText; }
  else if((h1&&c2)||(h2&&c1)){ score+=0; text=mixedText; }
  else{ score+=0.5; text=neutralText; }

  var pairGood=(s1==='봄'&&s2==='가을')||(s1==='가을'&&s2==='봄')||(s1==='여름'&&s2==='겨울')||(s1==='겨울'&&s2==='여름');
  if(pairGood)score+=2;
  else if(s1===s2)score+=0.5;
  else score-=0.5;

  var e1=(GAN[p1.d.g]||{}).e;
  var e2=(GAN[p2.d.g]||{}).e;
  if(e1&&e2){
    var elMap={wood:'목(木-성장/뻗어나감)',fire:'화(火-열정/확산)',earth:'토(土-수용/안정)',metal:'금(金-규칙/결단)',water:'수(水-유연/지혜)'};
    if(e1===e2){
      score+=1;
      var sameBase = '두 사람 모두 '+elMap[e1]+' 기운이 본질(일간)이라, 세상을 바라보는 프레임과 삶의 리듬이 마치 거울을 보듯 닮아 있습니다. 말하지 않아도 통하는 깊은 동질감이 이 관계의 강력한 기초가 됩니다.';
      if(type==='love') sameBase += ' 하지만 너무 비슷한 사람끼리는 자석의 같은 극처럼 밀어내거나, 지나치게 익숙해져 "가족 같은 편안함"만 남고 설렘이 줄어드는 함정에 빠질 수 있습니다. 의식적으로 새로운 데이트나 낯선 경험을 공유하여 자극을 공급해주세요.';
      else if(type==='business') sameBase += ' 동업할 때 업무 스타일이 같아 소통 비용이 제로에 가깝습니다. 다만, 같은 맹점을 가질 수 있으므로 두 사람 다 놓치기 쉬운 영역(재무 등)은 제3자에게 조언을 구하는 것이 안전합니다.';
      else sameBase += ' 관심사나 노는 방식이 완벽히 일치하여 최고의 파트너가 됩니다. 혼자 하기 뻘쭘했던 것들을 함께 시도해 보세요.';
      text += '<br><br><b>오행 본원(일간) 분석:</b> '+sameBase;
      if((n1.counts[e1]||0)>=4&&(n2.counts[e2]||0)>=4){ score-=2; text += ' ⚠️ 다만, 두 분 모두 특정 오행으로 쏠림이 너무 심해 다툼이 생기면 누구 하나 쉽게 굽히지 않는 지독한 평형 상태에 빠질 수 있습니다. 갈등 시 무조건 중간 조율자를 두는 것이 좋습니다.'; }
    } else {
      var gen={'wood':'fire','fire':'earth','earth':'metal','metal':'water','water':'wood'};
      var con={'wood':'earth','earth':'water','water':'fire','fire':'metal','metal':'wood'};
      if(gen[e1]===e2){ score+=0.5; text += '<br><br><b>오행 본원(일간) 생극제화:</b> 당신의 '+elMap[e1]+'가 상대의 '+elMap[e2]+'를 끊임없이 생(生, 밀어주고 키워줌)하는 구조입니다. 당신이 무의식중에 상대를 돌보고 에너지를 공급하며, 그로 인해 상대가 빛을 보게 됩니다. 이 자연스럽고 헌신적인 사랑의 흐름이 관계를 따뜻하게 만듭니다.'; }
      else if(gen[e2]===e1){ score+=0.5; text += '<br><br><b>오행 본원(일간) 생극제화:</b> 상대의 '+elMap[e2]+'가 당신의 '+elMap[e1]+'를 아낌없이 생(生)해주는, 이른바 "받는 사랑"의 구조입니다. 상대가 자연스럽게 당신의 지지기반이 되어주며, 당신은 그로 인해 편안함과 안정감을 얻습니다. 받는 것에 익숙해지지 말고 깊은 감사를 꼭 표현하세요.'; }
      else if(con[e1]===e2){ score-=1; text += '<br><br><b>오행 상극(일간)의 긴장감:</b> 당신의 '+elMap[e1]+'가 상대의 '+elMap[e2]+'를 극(剋, 통제하고 조종함)하는 구조라, 당신도 모르게 상대의 방식에 간섭하거나 리드하려는 성향이 강해집니다. 이 "건강한 압박"이 성장을 낳을지, 숨 막히는 스트레스가 될지는 당신의 어휘와 배려심에 달려 있습니다.'; }
      else if(con[e2]===e1){ score-=1; text += '<br><br><b>오행 상극(일간)의 긴장감:</b> 상대의 '+elMap[e2]+'가 당신의 '+elMap[e1]+'를 억제하는 형태라, 관계에서 은연중에 당신이 지고 들어가거나 눈치를 보게 될 수 있습니다. 매력적인 긴장감이자 강력한 끌림의 원인이 되기도 하지만, 장기적으로 당신의 에너지가 시들지 않도록 각자의 경계선(Boundary)을 명확히 설정하는 것이 이 관계를 살리는 길입니다.'; }
    }
  }

  function getTsCategory(p){
    if(!p||!p.d||!p.d.g)return null;
    var dg=p.d.g;
    var groupCnt={비겁:0,식상:0,관성:0,인성:0,재성:0};
    [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
      var t=getTenGod(dg,c);
      if(!t||t==='?')return;
      if(t==='비견'||t==='겁재')groupCnt.비겁++;
      else if(t==='식신'||t==='상관')groupCnt.식상++;
      else if(t==='편관'||t==='정관')groupCnt.관성++;
      else if(t==='편인'||t==='정인')groupCnt.인성++;
      else if(t==='편재'||t==='정재')groupCnt.재성++;
    });
    var best=null,max=0;
    Object.keys(groupCnt).forEach(function(k){
      if(groupCnt[k]>max){max=groupCnt[k];best=k;}
    });
    if(max>=3)return best;
    return null;
  }
  var cat1=getTsCategory(p1);
  var cat2=getTsCategory(p2);
  var detail='';
  function catDesc(cat,isSelf){
    var who=isSelf?'당신은':'상대방은';
    if(cat==='관성'){
      if(type==='business'){
        return who+' <b>[관성(정관·편관)]</b> 기운이 지배적입니다. 룰과 원칙, 그리고 조직의 체계를 중시하여 업무에서 빈틈없이 주도권을 잡고 책임지는 타고난 리더 타입입니다. 역할과 권한만 명확히 주어진다면 신뢰도 100%의 파트너지만, 그 통제 욕구가 지나쳐 "내 방식대로만 해"라는 함정에 빠지면 파트너의 창의력을 질식시킬 수 있으니 유연한 권한 위임이 필요합니다.';
      }else if(type==='friend'){
        return who+' <b>[관성]</b> 기운이 강해 친구들 사이에서도 어른스럽고 리더 역할을 자처하는 의리파입니다. 당신이 계획을 짜면 다들 편해하지만, 가끔은 너무 FM(원칙주의)이라 피곤할 수 있으니 조금 풀어지는 백치미를 보여주세요.';
      }else{
        return who+' <b>[관성]</b> 기운이 주도하여 사랑에 있어서도 "책임감과 보호 본능"이 먼저 앞섭니다. 연인을 지키려는 강한 의지가 때로는 숨 막히는 통제나 잔소리로 둔갑할 수 있습니다. 상대를 내 소유물이 아닌 독립된 인격체로 존중하는 거리두기가 오히려 이 사랑을 더욱 뜨겁게 만듭니다.';
      }
    }
    if(cat==='식상'){
      if(type==='business'){
        return who+' <b>[식상(식신·상관)]</b> 기운이 압도적입니다. 기존의 틀을 부수는 창의적 아이디어, 뛰어난 언변, 매력적인 프레젠테이션 스킬이 강점인 아이디어 뱅크입니다. 영업이나 기획 에이스로 활약하지만, 벌려놓은 일을 마무리하는 뒷구심심이 부족할 수 있으니 꼼꼼한 수호자 파트너와 함께할 때 시너지가 극대화됩니다.';
      }else if(type==='friend'){
        return who+' <b>[식상]</b> 기운이 강해 언제나 모임의 분위기 메이커 역할을 톡톡히 합니다. 당신이 등장하면 자리가 생기로 넘치며, 타고난 유머감각과 표현력으로 주변에 사람이 끊이질 않습니다.';
      }else{
        return who+' <b>[식상]</b> 기운이 차고 넘쳐 감정 표현이 솔직하고 연애의 매 순간을 로맨틱한 이벤트로 만드는 재주꾼입니다. 하지만 끊임없는 자극을 원하기 때문에 관계가 단조로워지면 먼저 지루함을 느낄 수 있습니다. 일상 속에서도 소소한 변화를 만들어가는 지혜가 필요합니다.';
      }
    }
    if(cat==='비겁'){
      if(type==='business'){
        return who+' <b>[비겁(비견·겁재)]</b> 기운이 강력해 자수성가형 독립심과 꺾이지 않는 경쟁력을 보여줍니다. 남 밑에서 일하기 싫어하는 불도저입니다. 이 에너지를 동업에 쓸 경우 폭발적 추진력이 되지만, 의견 조율이 안 되면 최악의 자존심 싸움으로 동반 추락할 수 있으므로, 어떤 경우에도 양보할 수 없는 계약의 데드라인을 문서화해두세요.';
      }else if(type==='friend'){
        return who+' <b>[비겁]</b> 기운이 강해 "내 사람"에 대한 맹목적인 의리가 타의 추종을 불허합니다. 친해질수록 내가 다 챙겨줘야 한다는 독점욕이 발동해 은근히 서운함을 많이 탈 수 있으니 친구의 다른 인간관계도 쿨하게 인정해주는 대범함을 기르세요.';
      }else{
        return who+' <b>[비겁]</b> 에너지가 연애를 이끌며, "너는 내 거, 나는 네 거"라는 강렬한 소유욕과 무한한 헌신을 투사합니다. 사랑의 농도가 짙은 만큼 상대가 조금만 한눈을 팔거나 식은 태도를 보이면 극단적인 질투로 변합니다. 무조건적인 신뢰의 확인만이 이 맹렬한 사랑을 안착시킵니다.';
      }
    }
    if(cat==='인성'){
      if(type==='business'){
        return who+' <b>[인성(정인·편인)]</b> 기운이 충만하여, 눈앞의 작은 이익보다는 큰 숲을 보고 지식과 정보를 수용하는 뛰어난 천기가 타입입니다. 교육, 연구, 기획처럼 치밀한 분석이 요구되는 분야에서 빛을 발하지만 우유부단하여 행동이 느릴 수 있으니, 실행력이 좋은 행동 대장 파트너가 절대적으로 필요합니다.';
      }else if(type==='friend'){
        return who+' <b>[인성]</b> 기운이 발달해 남의 이야기를 깊이 공감하며 들어주는 정신적 지주 같은 존재입니다. 진지하고 영혼을 나누는 딥토크(Deep Talk)를 통해 친구와 교감하며, 한 번 맺은 우정은 세월이 가도 변치 않는 묵직함을 자랑합니다.';
      }else{
        return who+' <b>[인성]</b> 기운이 연애 성향을 지배해, 사랑에 빠지는 속도는 느리지만 한 번 스며들면 흔들리지 않는 뿌리 깊은 애정을 보여줍니다. 정신적 교류와 플라토닉한 신뢰를 최우선으로 치며, 상대에게서 부모와 같은 포근한 보살핌을 기대하기도 하니 상호 간의 의존성을 적절히 조절해야 합니다.';
      }
    }
    if(cat==='재성'){
      if(type==='business'){
        return who+' <b>[재성(정재·편재)]</b> 기운이 강해 철저한 현실 감각과 결과 지향적인 성과주의자입니다. 돈의 흐름을 읽고 목표를 성취하는 데 천부적인 감각이 있어, 협업을 실질적인 이윤 창출로 곧장 연결시킵니다. 하지만 결과가 곧장 보이지 않으면 쉽게 의욕을 잃으니 단계별 보상 구조를 명확히 하는 것이 좋습니다.';
      }else if(type==='friend'){
        return who+' <b>[재성]</b> 기운이 강해 친구 모임에서도 현실적인 조언과 유익한 정보를 잘 공유하는 실속 있는 스타일입니다. 감정풀이보다는 실질적인 도움을 줄 때 마음이 편안해집니다.';
      }else{
        return who+' <b>[재성]</b> 기운이 충만해 감정의 교류만큼이나 현실적인 환경, 데이트의 질, 눈에 보이는 배려(선물, 정성)를 매우 중시합니다. 말뿐인 사랑보다 구체적인 행동과 결과물로 사랑을 확인하려는 성향이 있어 안정적인 기반을 구축할 때 연애의 행복감이 급상승합니다.';
      }
    }
    return '';
  }
  if(cat1||cat2){
    detail+='<br><br><b style="color:#d81b60;">[심화] 10성(십성) 에너지 구조로 본 깊은 마음의 패턴</b><br><div style="background:rgba(255,240,245,0.7); padding:12px; border-radius:8px; margin-top:6px;">';
    if(cat1 === cat2 && cat1 !== null){
      if(cat1 === '관성') {
        if(type==='business') detail+='두 분 모두 <b>[관성]</b> 기운이 지배적입니다. 체계와 룰을 중시하는 성향이 일치해 프로젝트를 안정적으로 이끌어갑니다. 하지만 서로 주도권을 쥐려 하거나 자신의 원칙을 고집하면 팽팽한 기싸움이 벌어질 수 있으니, 각자의 역할과 권한을 명확히 분리하는 것이 핵심입니다.';
        else if(type==='friend') detail+='두 분 모두 <b>[관성]</b> 기운이 강한 의리파입니다. 서로 선을 지키며 예의 바르고 듬직한 우정을 나눕니다. 다만 둘 다 너무 진지하고 FM대로 행동하려다 보니 가끔은 피곤해질 수 있습니다. 만났을 때는 한껏 풀어지는 여유를 가져보세요.';
        else detail+='두 사람 모두 <b>[관성]</b> 기운이 연애를 주도합니다. 서로가 서로에게 듬직한 보호자이자 책임감 있는 연인이 되려 하기에, 안정감은 최고조에 달합니다. 하지만 둘 다 주도권을 쥐고 규칙을 세우려다 보니 팽팽한 자존심 대결이 벌어질 수 있습니다. "내 방식"을 고집하기보다 상대의 "방식"도 온전히 존중하는 유연함이 이 견고한 사랑을 오래 유지하는 비결입니다.';
      } else if(cat1 === '식상') {
        if(type==='business') detail+='두 분 모두 <b>[식상]</b> 기운이 압도적입니다. 아이디어가 넘치고 기획력이 뛰어나 폭발적인 시너지를 냅니다. 하지만 둘 다 일을 벌이는 데 선수라 수습이 버거울 수 있으니, 디테일을 챙기고 마무리를 전담할 보완책을 마련하는 것이 안전합니다.';
        else if(type==='friend') detail+='두 분 모두 <b>[식상]</b> 기운을 가져 만나기만 하면 웃음이 끊이지 않는 환상의 티키타카를 자랑합니다. 쉴 새 없이 떠들고 노는 분위기 메이커 콤비지만, 가끔 말이 앞서 상처를 줄 수 있으니 필터링은 살짝 필요합니다.';
        else detail+='두 사람 모두 <b>[식상]</b> 기운이 넘쳐흐릅니다. 둘이 만나면 쉴 새 없이 대화가 이어지고 매일이 이벤트 같은 로맨틱한 연애가 펼쳐집니다. 감정 표현이 솔직하고 에너지가 넘쳐 지루할 틈이 없지만, 그만큼 감정 기복이 충돌할 때는 불꽃 튀는 다툼으로 번질 수 있습니다. 서로의 감정을 쏟아내기보다는 한 템포 쉬어가는 대화법을 연습해야 시너지가 배가됩니다.';
      } else if(cat1 === '비겁') {
        if(type==='business') detail+='두 분 모두 <b>[비겁]</b> 기운이 강력합니다. 독립심과 승부욕으로 강력한 에너지를 분출하며 맨땅에 헤딩하듯 밀어붙이는 개척자 파트너입니다. 그러나 결정적인 순간 자존심을 굽히지 않아 공들인 탑이 무너질 수 있으니, 상호 간의 완벽한 수평적 파트너십과 객관적인 양보 기준을 세워야 합니다.';
        else if(type==='friend') detail+='두 분 모두 <b>[비겁]</b> 기운이 강해 누구보다 서로를 끈끈하게 챙기는 운명 공동체형 우정입니다. 다만 내 편이라는 소유욕이 강해 친구가 다른 모임에 가는 것에 은근히 질투를 느낄 수 있으니 쿨하게 서로를 풀어주는 넉넉함이 필요합니다.';
        else detail+='두 사람 모두 <b>[비겁]</b> 에너지가 연애를 이끄는 거울 같은 관계입니다. 서로에 대한 강렬한 소유욕과 헌신이 완벽히 일치하여 세상을 왕따시키고 둘만의 우주에 빠져드는 맹렬한 사랑을 보여줍니다. 그러나 자존심이 매우 강해 한 번 부딪히면 누구도 먼저 굽히지 않는 거센 폭풍이 일어납니다. "너와 나"의 기싸움을 넘어 "우리"라는 공동체 의식으로 완전한 내 편이 되어줄 때, 무조건적인 신뢰가 완성됩니다.';
      } else if(cat1 === '인성') {
        if(type==='business') detail+='두 분 모두 <b>[인성]</b> 기운이 충만합니다. 큰 숲을 보는 통찰력과 천기적 사고가 깊어 기획과 연구 분야에서 최고의 지적 시너지를 냅니다. 문제는 두 사람 모두 실행보다는 생각과 검토에 머무르기 쉬워 진도가 안 나갈 수 있습니다. 명확한 마감일을 정하고 우선 저지르는 행동력이 필요합니다.';
        else if(type==='friend') detail+='두 분 모두 <b>[인성]</b> 기운이 발달해 고민을 털어놓고 내면의 아픔을 위로받는 최고의 소울메이트입니다. 서로의 정신적 지주 역할을 하며 딥토크를 즐기는 잔잔하고도 묵직한 우정을 이어나갑니다.';
        else detail+='두 사람 모두 <b>[인성]</b> 기운이 연애를 십분 지배합니다. 플라토닉하고 정신적인 교류를 최고로 치며, 눈빛만 봐도 서로의 상처를 보듬어주는 깊은 영혼의 단짝입니다. 하지만 두 사람 모두 먼저 사랑받고 수용받기를 원해 관계를 리드하기 주저할 수 있습니다. 가끔은 서로의 마음을 짐작만 하지 말고, 용기 내어 먼저 다가가 애정을 표현해 주는 적극성이 이 잔잔한 호수에 확고한 생기를 불어넣습니다.';
      } else if(cat1 === '재성') {
        if(type==='business') detail+='두 분 모두 <b>[재성]</b> 기운이 강해 이보다 더 현실적일 수 없는 최고의 비즈니스 콤비입니다. 목적 지향적이고 이윤 창출이라는 명확한 목표 아래 한 치의 오차 없이 움직입니다. 다만 당장 돈이 안 되는 시기를 버티는 힘이 약할 수 있으니 장기적인 비전 공유가 필수입니다.';
        else if(type==='friend') detail+='두 분 모두 <b>[재성]</b> 기운이 강해 실속 없는 감정 소모보다는 뼈 때리는 조언과 현실적인 도움을 주고받는 가장 유익한 친구 사이입니다. 재테크나 커리어 고민을 나누기 좋습니다.';
        else detail+='두 사람 모두 <b>[재성]</b> 기운이 충만하여 극도로 현실적이고 실속 있는 연애를 추구합니다. 불필요한 감정 낭비를 싫어하고 데이트의 효율성이나 미래의 경제적 기반을 닦는 데 완벽한 합을 보입니다. 단, 함께 미래를 설계하며 빠르게 안정을 찾지만 가끔은 지나치게 현실 계산만 앞서 관계가 건조해질 위험이 있습니다. 아무 날도 아닌 날, 생각지도 못한 깜짝 선물이나 낭만적인 칭찬으로 메마른 감성에 단비를 내려주어야 합니다.';
      }
    } else {
      if(cat1)detail+=catDesc(cat1,true)+'<br><br>';
      if(cat2)detail+=catDesc(cat2,false);
    }
    detail+='</div>';
  }

  return{scoreAdj:score,text:text+detail};
}

function analyzePastLifeCompat(p1, p2, name){
  var GAN_HE={甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
  var GAN_CHONG={甲:'庚',庚:'甲',乙:'辛',辛:'乙',丙:'壬',壬:'丙',丁:'癸',癸:'丁'};
  var JI_HE={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  var JI_CHONG={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};

  var a_dg=p1.d.g, a_dj=p1.d.j;
  var b_yg=p2.y.g, b_yj=p2.y.j;
  var ab_ganHe=GAN_HE[a_dg]===b_yg;
  var ab_ganChong=GAN_CHONG[a_dg]===b_yg;
  var ab_ganSame=a_dg===b_yg;
  var ab_jiHe=JI_HE[a_dj]===b_yj;
  var ab_jiChong=JI_CHONG[a_dj]===b_yj;
  var ab_jiSame=a_dj===b_yj;

  var b_dg=p2.d.g, b_dj=p2.d.j;
  var a_yg=p1.y.g, a_yj=p1.y.j;
  var ba_ganHe=GAN_HE[b_dg]===a_yg;
  var ba_ganChong=GAN_CHONG[b_dg]===a_yg;
  var ba_ganSame=b_dg===a_yg;
  var ba_jiHe=JI_HE[b_dj]===a_yj;
  var ba_jiChong=JI_CHONG[b_dj]===a_yj;
  var ba_jiSame=b_dj===a_yj;

  var pScore=0;
  pScore+=(ab_ganHe?2:0)+(ab_jiHe?2:0)-(ab_ganChong?2:0)-(ab_jiChong?2:0)+(ab_ganSame?1:0)+(ab_jiSame?1:0);
  pScore+=(ba_ganHe?2:0)+(ba_jiHe?2:0)-(ba_ganChong?2:0)-(ba_jiChong?2:0)+(ba_ganSame?1:0)+(ba_jiSame?1:0);

  var grade,gradeIcon,gradeLabel,gradeDesc,story,prescription;
  if(pScore>=6){
    grade='🌟 S급';gradeIcon='💫';gradeLabel='전생의 쌍둥이 별';
    gradeDesc='[천간합+지지합] 천간(하늘의 뜻)과 지지(땅의 현실)가 완벽한 合(합)을 이루는, 수백만 분의 일 확률로 만나는 극히 드문 우주적 인연입니다.';
    story='먼 전생에 두 영혼은 하나의 거대한 사명을 위해 함께 태어났습니다. 스승과 제자였거나, 한 나라를 함께 세운 동지였거나, 전쟁터에서 서로의 목숨을 기꺼이 대신 내어준 절대적 구원자였을 것입니다. 육신은 스러졌어도 영혼에 새겨진 그 깊은 약속이 끊어지지 않아 우주가 이 거대한 수레바퀴를 돌려 이번 생에서 당신들을 다시 만나게 세팅했습니다. 처음 만난 순간부터 이유 없이 쏟아지던 맹목적인 신뢰와 눈물 나도록 그리웠던 감정은 결코 우연이나 착각이 아닙니다.';
    prescription='[절대 보존의 법칙]: 이 인연의 엄청난 무게를 일상의 편안함 취급하며 가벼이 여기지 마세요. 전생의 그 깊은 은혜로운 인연도 현생에서 오만해지면 깎이고 부서집니다. 두 사람의 에너지는 단순히 둘이 잘 먹고 잘사는 것을 넘어 외부로 뻗어나가야 합니다. 함께 이룰 거대한 공동의 목표나 사회적인 선한 영향력을 설계하여 그 거대한 빛의 에너지를 끊임없이 발산하세요.';
  }else if(pScore>=3){
    grade='✨ A급';gradeIcon='🌸';gradeLabel='운명의 데자뷰 인연';
    gradeDesc='[강력한 합의 기운] 전생에 깊은 정서적 교감이나 매우 구체적인 약속이 있었던 카르마 파트너입니다. 이유 없는 강렬한 끌림의 정체입니다.';
    story='이 두 사람은 길고 긴 전생의 스펙트럼 어딘가에서 이미 서로의 체온과 숨결을 너무나 잘 알고 있었습니다. 생전 처음 만난 낯선 눈동자 속에서 느껴지는 지독히 묘한 친근감, 어딘가 오래전부터 대화를 이어온 것 같은 알 수 없는 데자뷰 — 그것은 뇌의 오류가 아니라 영혼의 기억입니다. 어쩌면 한쪽이 다른 한쪽에게 미처 갚지 못한 빚(사랑이든 헌신이든)을 갚으러 부리나케 찾아왔거나, 전생의 마지막 순간에 채 끝맺지 못한 애절한 이야기를 마저 완성하기 위해 먼 길을 돌아 현생의 무대에 함께 오른 것입니다.';
    prescription='[진실의 거울 법칙]: 이 운명적 만남을 진정한 완성으로 이끌려면 철저한 "영혼의 알몸"이 되어야 합니다. 전생에서 오해로 인해 삼켜야 했던 말들, 숨기고 혼자 앓았던 상처를 현생에서 남김없이 꺼내어 소독하세요. 이 인연이 가끔 주는 찌릿한 불편함조차 전생의 잔재이니 절대 회피하지 말고 정면으로 마주 안아야만 비로소 완전한 카르마의 해소가 이루어집니다.';
  }else if(pScore>=1){
    grade='🌱 B급';gradeIcon='🌿';gradeLabel='다시 싹트는 인연';
    gradeDesc='[가벼운 합/복음] 전생의 어느 한 자락에서 옷깃을 스치듯 가볍게 인연을 맺었던 얕은 카르마가 현생에서 발아할 기회를 얻었습니다.';
    story='전생에서 두 사람은 짧고 굵지 구부러진 관계보다는 바람처럼 스쳐 간 사이였습니다. 번화한 시장통에서 우연히 눈이 마주친 상인과 손님이었거나, 비를 피해 잠시 같은 처마 밑으로 뛰어들어온 같은 마을 사람이었을지 모릅니다. 특별한 감정적 부채나 원한은 없었으나, 묘하게 좋은 잔상으로 남은 그 스침이 현생에서는 더 무성한 가지를 뻗어 깊이 있는 숲으로 자라날 기회의 씨앗을 얻은 것입니다.';
    prescription='[물의 법칙]: 거창한 소울메이트의 서사를 강요하거나 무리하게 딥토크를 이끌어내려 하지 마세요. 이 인연은 폭우가 아니라 안개비처럼 일상의 작고 소소한 정성에 자양분을 얻어 자라납니다. 밥은 먹었는지 묻고, 작은 초콜릿을 건네는 그 가벼운 발걸음 속에서 전생엔 스쳐 갔던 인연이 현생에서는 든든히 뿌리를 내리는 기적을 맛볼 수 있습니다.';
  }else if(pScore===0){
    grade='⚪ C급';gradeIcon='🔮';gradeLabel='백지 위의 새로운 인연';
    gradeDesc='[카르마 제로] 얽히고설킨 빚이나 깊은 약속 등 전생의 무거운 연결고리가 전혀 감지되지 않는, 이 생에서 완벽히 새롭게 창조하는 순백의 파트너십입니다.';
    story='전생이라는 깊고 무거운 서고에서 두 사람의 이야기가 적힌 책을 찾을 수 없습니다. 이것은 실망할 일이 아니라 오히려 완벽한 축복입니다! 왜냐하면 두 사람은 서로에게 갚아야 할 원한도, 억지로 소화해야 할 업보의 찌꺼기도 없이 가장 순수하고 깨끗한 출발선에 서 있다는 뜻이기 때문입니다. 전생의 관성이나 이유 모를 구속력의 무게 없이 오직 두 사람의 자유의지와 선택만으로 이 관계의 모든 뼈대와 색깔을 칠해나갈 수 있는 엄청난 백지수표를 받았습니다.';
    prescription='[자유 창조의 법칙]: 상대방을 대할 때 "이 사람은 원래 이럴 거야"라는 과거의 데이터나 편견의 색안경을 철저히 부수세요. 지금 숨 쉬는 이 1분 1초부터 어떤 서사를 쓰고, 어떤 장르의 관계(로맨스, 코미디, 휴먼다큐)를 만들어갈지 온전히 둘의 대화와 합의로 세워나가면 됩니다. 가장 무거운 카르마에서 해방된 가장 자유로운 영혼들의 만남입니다.';
  }else if(pScore>=-3){
    grade='⚠️ D급';gradeIcon='⚡';gradeLabel='풀어야 할 매듭, 업보(Karma)의 인연';
    gradeDesc='[충(沖)의 발생] 전생에 서로의 가슴에 깊지 않은 상처나 채 풀지 못한 오해를 남긴 미완성의 인연. 그 불편한 매듭을 풀기 위해 재차 소환되었습니다.';
    story='이 관계에는 전생에 서로를 아프게 했거나 뾰족하게 대립했던 "미세한 업보의 가시"가 남아 있습니다. 머리로는 이해하는데 묘하게 자존심이 상하거나, 아주 사소한 말 한마디에 신경이 날카롭게 곤두서는 그 이유 모를 불편함은 성격 차이가 아니라 바로 전생의 잔흔이 보내는 알람입니다. 하지만 두려워하지 마세요. 그 까끌까끌한 업보를 품은 채 현생에서 서로를 또다시 당겨왔다는 것은, 바로 지금 이 생에서 그 꼬인 매듭을 완전히 베어내어 풀 수 있는 절호의 기회가 주어졌다는 강력한 반증입니다.';
    prescription='[선제 사과의 법칙]: 이 관계에서 고장 난 레코드처럼 반복되는 특정 갈등 패턴(돈 문제, 연락 문제, 말투 문제 등)을 현미경 같은 시선으로 관찰하세요. 그 지긋지긋한 패턴이 묻혀있던 전생의 업보를 가리키는 엑스레이 사진입니다. 문제를 풀 단 하나의 방법은 무조건적인 하차입니다. "누가 맞냐"를 따지는 에고의 스위치를 끄고, 먼저 고개 숙여 져주고 치명적인 약점을 감싸 안아주는 쪽이 수천 년 묵은 악연의 쇠사슬을 끊어내는 진정한 승리자가 됩니다.';
  }else{
    grade='🌀 F급';gradeIcon='🔥';gradeLabel='피 흘리며 배우는 악연의 대물림';
    gradeDesc='[천충지충(天沖地沖)] 천간과 지지가 모두 거칠게 부딪치는 극강의 파괴적 조합. 전생에 서로의 생존을 위협할 만큼 깊고 치명적인 카르마 빚을 진 관계입니다.';
    story='두 영혼 주변에는 전생의 차갑고 날 선 칼바람이 불고 있습니다. 이들은 과거에 서로에게 지울 수 없는 엄청난 상처, 배신, 혹은 파멸을 주고받았던 가장 치명적인 숙적이었습니다. 그런데 왜 다시 만났을까요? 그 강렬하고 독성 강한 끌림의 뒷면에는 서로를 할퀴어야만 소멸되는 어두운 업보의 에너지가 남아있기 때문입니다. 벗어나려 발버둥 쳐도 진흙탕 속으로 더 자석처럼 빨려 들어가는 듯한 통제 불능의 애증 — 이것이 전생 악연의 가장 명백한 증거입니다. 어쩌면 이번 찰나의 생이 그 지독한 수만 년의 악연 고리에서 탈출할 수 있는 우주가 준 마지막 비상구일지 모릅니다.';
    prescription='[절단과 방생의 법칙]: 관계를 지속할수록 진짜 나를 잃어버리고 바닥 모를 심연으로 끌려가는 기분이 든다면 당장 브레이크를 밟으세요. 카르마를 푼다는 착각 아래 계속 곁에 남아서 끊임없이 서로를 난도질하는 것은 업보를 소멸시키는 것이 아니라 이자를 쳐서 빚을 늘리는 행위입니다. 때로는 그 사람을 내 삶에서 과감히 잘라내고 조용히 사라져 주는 결단, 그 자비롭고 냉정한 거리두기만이 두 영혼 모두를 구원하고 윤회의 악순환을 영원히 끝내는 가장 위대한 사랑의 방식입니다.';
  }

  var buildCrossResult = function(dg, dj, yg, yj, ganHe, ganChong, ganSame, jiHe, jiChong, jiSame) {
    var descHe = ganHe ? '합(合)' : ganChong ? '충(沖)' : ganSame ? '동(同)' : '무(無)';
    var descJi = jiHe ? '합(合)' : jiChong ? '충(沖)' : jiSame ? '동(同)' : '무(無)';
    var ganCls = ganHe ? 'pc-he' : ganChong ? 'pc-chong' : ganSame ? 'pc-same' : 'pc-none';
    var jiCls = jiHe ? 'pc-he' : jiChong ? 'pc-chong' : jiSame ? 'pc-same' : 'pc-none';

    var chipGan = '<div class="pastlife-chip ' + ganCls + '">' + dg + ' <span style="font-size:0.7rem;opacity:0.8">' + descHe + '</span> ' + yg + '</div>';
    var chipJi = '<div class="pastlife-chip ' + jiCls + '">' + dj + ' <span style="font-size:0.7rem;opacity:0.8">' + descJi + '</span> ' + yj + '</div>';
    var chips = '<div class="pastlife-cross-chips">' + chipGan + chipJi + '</div>';
    
    var txt = '';
    if (ganHe && jiHe) {
      txt = '<b>천지동합(天地同合)의 기적:</b> 천간(정신)과 지지(현실)가 완벽하게 맞물려 돌아가는 경이로운 구조입니다. 전생에 당신이 이 사람의 생명을 구했거나, 인생의 가장 깊은 수렁에서 영혼을 끌어올려 준 절대적 은인이었을 확률이 매우 높습니다. 뼈에 새겨진 그 깊고 진한 감사함이 현생에서 "이유 없이 다 해주고 싶은 맹목적인 이끌림과 보호본능"으로 발현되고 있습니다. 상다리가 부러지도록 베풀어도 아깝지 않은 인연입니다.';
    } else if (ganHe) {
      txt = '<b>천간합(天干合)의 정신적 공명:</b> 눈에 보이지 않는 하늘의 기운, 즉 사상과 철학에서 깊은 동기화가 일어납니다. 전생에 두 사람은 같은 스승 밑에서 학문을 논하거나, 같은 신념과 종교를 품고 한 방향을 바라보며 걸어간 영혼의 동지였습니다. 그래서 백 마디 말보다 눈빛 한 번으로 서로의 속마음을 꿰뚫어 보는 소름 돋는 텔레파시를 자주 경험하게 됩니다.';
    } else if (jiHe) {
      txt = '<b>지지합(地支合)의 현실적 밀착:</b> 땅의 기운이 합쳐지니 스킨십, 생활 습관, 그리고 일상을 공유하는 템포가 놀라울 정도로 잘 맞습니다. 전생에 한 지붕 아래서 밥을 나눠 먹으며 모진 풍파를 함께 견뎌낸 부부나 가족의 진한 카르마 흔적입니다. 거창한 말보다 일상을 피부로 부대끼며 함께할 때 거대한 안정감이 폭발합니다.';
    } else if (ganChong && jiChong) {
      txt = '<b>천충지충(天沖地沖)의 파괴적 흔적:</b> 흔히 말하는 가장 두려운 형태의 충돌입니다. 당신의 일주(현생의 내 뼈대)가 상대의 년주(전생의 뿌리)를 처참하게 박살 내고 있습니다. 전생에 서로의 등에 비수를 꽂았거나 씻을 수 없는 원한을 맺었던 가장 잔혹한 가해자와 피해자의 구도였을 수 있습니다. 이번 생에 그 지독한 피의 빚을 청산하고 끊어내기 위해 다시 만났으니, 극한의 인내심이 필요합니다.';
    } else if (ganChong) {
      txt = '<b>천간충(天干沖)의 날카로운 대립:</b> 생각의 뿌리와 가치관이 정면으로 부딪혀 불꽃을 튀깁니다. 전생에 서로 다른 진영의 장수로 칼을 겨누었거나, 한 치의 양보도 없는 신념의 논쟁을 벌였던 라이벌 관계였습니다. 현생에서도 별것 아닌 주제로도 쉽게 목소리가 높아지는 것은 그 지적 전투의 앙금이 아직 덜 닦였기 때문입니다.';
    } else if (jiChong) {
      txt = '<b>지지충(地支沖)의 현실적 충돌:</b> 생활 방식과 현실적 기반이 덜컹거리며 마찰음을 냅니다. 전생에 같은 구역의 영토나 재물을 두고 흙먼지를 튀기며 밥그릇 싸움을 했던 지독한 경쟁자의 업보가 서려 있습니다. 이번 생에서도 물리적인 거리를 너무 좁히면 그 진흙탕 카르마가 발동하니, 각자의 방과 생활 영역을 철저히 분리하는 지혜가 절대적입니다.';
    } else if (ganSame && jiSame) {
      txt = '<b>절대 복음(伏吟)의 거울상:</b> 당신의 일주와 상대의 년주가 소름 돋게 똑같은 글자입니다! 이는 내 모습이 상대의 과거(조상/뿌리)에 그대로 복사되어 있다는 뜻으로, 전생에 거울을 보듯 완벽하게 똑같은 삶의 조건과 상처를 공유했던 도플갱어적 영혼일 수 있습니다. 서로를 너무 잘 알아서 기가 막히게 편안하거나, 반대로 내 꼴 보기 싫은 치부까지 적나라하게 보여서 병적으로 불편할 수 있는 극단적인 양날의 검입니다.';
    } else if (ganSame || jiSame) {
      txt = '<b>부분 복음의 익숙함:</b> 서로의 사주 뿌리 어딘가에 똑같은 글자가 박혀있습니다. 아주 먼 전생, 비슷한 환경의 궤도 안에서 스치듯 교차했던 파편적인 인연입니다. 마치 길을 걷다 우연히 맡은 옛 향수 냄새처럼 잔잔한 익숙함과 기시감을 던져줍니다.';
    } else {
      txt = '<b>백지수표의 인연:</b> 해당 방향으로는 전생의 특별한 숙업이나 빚, 강렬한 연결고리가 레이더에 감지되지 않습니다. 무거운 인과율의 거미줄에서 완전히 해방된 채, 오롯이 지금 당신들의 선택과 의지로 완전히 새롭게 개척해 나가는 깨끗하고 무해한 현생 중심의 관계입니다.';
    }
    return chips + '<div class="pastlife-cross-result" style="line-height:1.75; font-size:0.87rem; color:#f8fafc; padding-top:4px;">' + txt + '</div>';
  }

  var abHtml=buildCrossResult(a_dg,a_dj,b_yg,b_yj,ab_ganHe,ab_ganChong,ab_ganSame,ab_jiHe,ab_jiChong,ab_jiSame);
  var baHtml=buildCrossResult(b_dg,b_dj,a_yg,a_yj,ba_ganHe,ba_ganChong,ba_ganSame,ba_jiHe,ba_jiChong,ba_jiSame);

  return '<div class="pastlife-card">'+
    '<div class="pastlife-header">'+
    '<div><div class="pastlife-title-text">🔮 전생 인연 풀이</div>'+
    '<div class="pastlife-subtitle">PAST LIFE COMPATIBILITY · 일주×년주 교차 분석</div></div></div>'+
    '<div class="pastlife-karma-badge">'+grade+' · '+gradeLabel+'</div>'+
    '<div style="font-size:.78rem;color:rgba(224,176,255,.7);line-height:1.65;margin-bottom:14px">'+gradeDesc+'</div>'+
    '<div class="pastlife-cross-row">'+
    '<div class="pastlife-cross-title">🧬 '+(USER_NAME||'나')+'의 일주('+a_dg+a_dj+') × '+name+'의 년주('+b_yg+b_yj+')</div>'+
    abHtml+
    '</div>'+
    '<div class="pastlife-cross-row">'+
    '<div class="pastlife-cross-title">🧬 '+name+'의 일주('+b_dg+b_dj+') × '+(USER_NAME||'나')+'의 년주('+a_yg+a_yj+')</div>'+
    baHtml+
    '</div>'+
    '<div class="pastlife-story-box">'+
    '<div class="pastlife-story-icon">'+gradeIcon+'</div>'+
    '<div class="pastlife-story-text">'+story+'</div>'+
    '</div>'+
    '<div class="pastlife-prescription">'+
    '<div class="pastlife-prescription-title">⚔️ 천기적 처방</div>'+
    '<div class="pastlife-prescription-body">'+prescription+'</div>'+
    '</div>'+
    '<div class="pastlife-disclaimer">※ 전생 인연 풀이는 명리학적 재미 콘텐츠입니다 🌙</div>'+
    '</div>';
}

/* ─── generateDetailedAdvice: 사주 맞춤 상세 현실 조언 ─── */
function generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';

  var ganAdvice={
    '甲':'하늘을 향해 자라는 큰 나무처럼, <b>방향만 잃지 않으면 반드시 빛을 봅니다.</b> 꾸준함이 당신의 가장 강력한 무기예요. 고집이 있다는 말은 결국 "의지가 있다"는 뜻이기도 합니다. 그 고집을 올바른 방향에만 쓰세요. 단독 행동이 동업보다 유리한 사주입니다.<br><br>갑목(甲木)의 가장 큰 함정은 자신의 방식이 유일하게 옳다는 확신이 지나쳐 주변의 소중한 피드백을 차단하는 것입니다. 나무도 바람에 흔들려야 뿌리가 더 깊이 내려갑니다. 타인의 의견에 귀를 여는 것은 약함이 아니라 전략입니다. 경쟁이 있을 때 진가가 드러나므로, 편안한 환경에만 안주하지 말고 의도적으로 자신을 도전적인 상황에 노출시키세요. 중년 이후 본격적인 결실이 시작되므로, 30대의 고생을 두려워하지 마세요. 지금 내려가는 뿌리가 미래의 거목을 만듭니다.',
    '乙':'칡넝쿨처럼 어떤 환경에서도 살아남는 유연함이 당신 안에 있어요. <b>억지로 직선으로만 나가려 하지 마세요</b> — 돌아가는 길이 때로는 더 빠른 길입니다. 주변과 조화를 이룰 때 당신의 진짜 능력이 꽃을 피웁니다.',
    '丙':'태양처럼 빛나는 당신은 <b>누군가에게 등불이 되어줄 때 가장 빛납니다.</b> 하지만 태양도 밤이 있어야 쉬듯, 자신을 돌보는 시간을 아끼지 마세요. 모든 것을 혼자 짊어지려는 버릇을 내려놓는 연습이 필요합니다.',
    '丁':'은은하게 타오르는 촛불처럼, 당신의 진심은 주변 사람들을 조용히 따뜻하게 합니다. <b>눈에 보이는 성과보다 보이지 않는 신뢰를 쌓는 것</b>이 당신의 진짜 자산입니다. 서두르지 마세요.',
    '戊':'드넓은 대산(大山)처럼 모든 것을 받아들이는 당신은 <b>잘 부서지지 않는 사람</b>입니다. 하지만 그 묵직함이 변화에 늦게 반응하는 걸림돌이 됩니다. 의도적으로 새로운 것을 시도하는 용기를 기르세요.',
    '己':'비옥한 밭이 씨앗을 키우듯, 당신은 <b>주변 사람의 잠재력을 끌어내는 능력</b>이 있습니다. 남을 너무 챙기다 정작 자신을 잃어버리는 것을 조심하세요. 당신 자신이 먼저 행복해야 남도 도울 수 있습니다.',
    '庚':'거친 원석이 갈고 닦여 보석이 되듯, <b>시련이 당신을 더 단단하게 만듭니다.</b> 다만 너무 날이 서면 주변이 상처를 받습니다. 날카로움을 지혜롭게 쓸 줄 아는 사람이 되세요.',
    '辛':'정제된 보석처럼 당신은 <b>세밀함과 완벽함을 추구하는 예술가 기질</b>이 있습니다. 그 완벽주의가 때로는 스스로를 옥죄기도 합니다. 70% 완성도에서도 세상에 내보이는 용기가 필요해요.',
    '壬':'거대한 강물처럼 당신은 <b>막히면 돌아가는 유연함과 끈질김</b>을 동시에 가졌습니다. 이 물의 힘을 한 방향으로 모을수록 무섭게 강해집니다. 에너지를 너무 분산시키지 마세요.',
    '癸':'이슬처럼 맑고 섬세한 당신은 <b>눈에 보이지 않아도 세상에 촉촉함을 더하는 존재</b>입니다. 자신의 작음을 두려워하지 마세요. 가장 작은 물방울이 바위도 뚫습니다. 꾸준함이 당신의 초능력입니다.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #4CAF50">';
  out+='<b style="font-size:.9rem">🌿 일간 '+dg+' 의 본질</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(ganAdvice[dg]||deep.advice)+'</span>';
  out+='</div>';

  if(jg&&jg.isJong){
    var jongElAdvice={
      wood:'초록빛 생명력이 사주 전체를 지배하는 종격입니다. 교육, 생명, 성장, 자연, 문화 — <b>목(木)의 기운이 흐르는 모든 곳에서 당신은 빛납니다.</b> 나무가 자라는 곳, 사람이 성장하는 곳에 있으세요. 당신의 기운을 약하게 만드는 환경은 과감히 멀리하세요. 흰색·금속·강한 규율은 이 사주에서 독이 됩니다.',
      fire:'불꽃이 온 사주를 가득 채운 종격입니다. 무대, 미디어, 리더십, 뜨거운 열정이 요구되는 분야가 당신의 무대입니다. <b>화(火)의 기운을 더 크게 키울수록 인생이 빛납니다.</b> 당신을 주눅 들게 하거나 열정을 꺼버리는 환경은 독입니다. 늘 가슴이 뛰는 일을 하고, 표현하고, 빛나세요.',
      earth:'대지처럼 묵직한 토(土)의 기운이 가득한 종격입니다. 부동산, 안정, 음식, 돌봄, 중재 — <b>토(土)의 질감이 있는 모든 곳에서 당신은 든든한 기둥이 됩니다.</b> 빠른 변화보다 깊고 착실한 방식이 맞습니다.',
      metal:'날카로운 금(金)의 기운이 가득 찬 종격입니다. 법률, 의료, 정밀 기술, 금융, 명예 — <b>금(金)의 원칙과 날카로움이 필요한 곳에서 당신은 타의 추종을 불허합니다.</b> 원칙을 세우고 지키는 전문가의 길을 걸어가세요.',
      water:'물이 흘러넘치는 수(水)의 종격입니다. 지혜, 탐구, 유통, 예술, 철학 — <b>수(水)의 흐름이 닿는 곳에서 당신의 능력은 세상을 바꿉니다.</b> 막히거나 억누르는 환경을 피하고, 언제나 흘러갈 수 있는 유연한 삶을 만드세요.'
    };
    out+='<div style="background:rgba(243,229,245,.7);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #9C27B0">';
    out+='<b style="font-size:.9rem;color:#6A1B9A">🌀 '+jg.name+' 특별 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#4A148C">'+(jongElAdvice[jg.dominant]||'종격의 지배 오행을 극한까지 키우는 것이 성공의 열쇠입니다.')+'</span>';
    out+='</div>';
  }else if(pw&&pw.isStrong){
    out+='<div style="background:rgba(255,243,224,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.9rem;color:#E65100">🔥 신강(身强) 사주 — 에너지 수호 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#BF360C">당신 안에는 넘치는 에너지가 있습니다. 이 에너지는 잘 쓰면 리더십과 추진력이 되지만, 억누르면 고집·독선·과잉 경쟁으로 변질됩니다. <b>핵심은 에너지를 발산하는 구조를 만드는 것입니다.</b> 사람들에게 베풀고, 사회적 역할을 맡고, 규칙과 원칙을 통해 자신을 다스리세요. 때로는 당신보다 강한 사람에게 도전받는 환경이 더 크게 성장시킵니다.</span>';
    out+='</div>';
  }else{
    out+='<div style="background:rgba(227,242,253,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #2196F3">';
    out+='<b style="font-size:.9rem;color:#1565C0">💧 신약(身弱) 사주 — 자기 보호 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#0D47A1">당신은 외부의 영향을 쉽게 받는 섬세한 구조의 사주입니다. 이것은 약점이 아닙니다. 공감 능력이 탁월하고 분위기를 읽는 눈치가 뛰어납니다. <b>하지만 그 때문에 지치기도 쉽습니다.</b> 당신을 진심으로 아끼는 귀인 한 명을 곁에 두는 것이 무엇보다 중요합니다. 혼자 모든 것을 해결하려 하지 말고, 적절한 도움을 요청하는 것이 진짜 용기입니다. 자존감이 낮아지는 관계나 환경에서는 과감히 물러서는 결단이 필요합니다.</span>';
    out+='</div>';
  }

  var tsAdviceFull={
    '비견':'독립심이 강한 당신, 모든 일을 혼자 하려는 경향이 있어요. <b>진짜 강한 사람은 도움을 요청할 줄도 압니다.</b> 동업이나 파트너십에서는 역할을 명확히 하고 계약서를 갖추는 것이 필수입니다. 내 방식이 늘 최선이 아닐 수 있음을 인정하는 순간, 당신의 세계가 훨씬 넓어집니다.<br><br>비견이 강한 사주는 경쟁에서 강하고 자기만의 브랜드를 구축하는 능력이 탁월합니다. 하지만 경쟁에 너무 집중하면 소비와 지출이 과잉되어 재물이 쌓이지 않는 구조가 될 수 있습니다. 수입의 일정 비율을 자동이체로 강제 저축하는 시스템을 반드시 만드세요. 또한 독립심이 강해 협력이 어렵지만, 당신보다 뛰어난 사람을 파트너로 두는 용기가 성장의 가속 페달입니다. 동반자를 경쟁자로 보지 말고 시너지 파트너로 보는 시각 전환이 필요합니다.',
    '겁재':'승부욕과 추진력이 넘치는 당신, 그 에너지를 재물에만 쏟으면 들어온 만큼 빠져나갑니다. <b>돈은 벌기보다 지키는 것이 더 어렵습니다.</b> 고정 지출 구조를 만들고, 충동적 투자나 보증은 철저히 피하세요. 강제 저축과 장기 자산 계획이 재물 운을 지키는 가장 확실한 방법입니다.',
    '식신':'낙천적이고 베풀기 좋아하는 당신, 그 따뜻함이 가장 큰 자산이에요. <b>하지만 이용당하지 않도록 사람을 볼 줄 아는 눈을 키우세요.</b> 규칙적인 생활과 운동이 건강 운을 지킵니다. 하고 싶은 일을 업으로 삼으면 남들보다 몇 배의 성과를 냅니다.',
    '상관':'천재적 언어 감각이 있지만, 말이 칼이 될 수 있습니다. <b>비판하기 전에 한 번만 더 상대방의 입장에서 생각하는 습관을 들이세요.</b> 당신의 혁신적 아이디어를 설득하는 포장지가 부드러워야 세상에 먹힙니다. 자기 규칙을 스스로 만들고 지키는 자기 경영이 성공의 열쇠입니다.',
    '편재':'큰 그림을 그리는 능력이 탁월한 당신, 작은 것을 무시하는 경향을 조심하세요. <b>디테일한 부분이 쌓여 큰 일이 됩니다.</b> 유흥과 과소비를 경계하고, 신뢰할 수 있는 재무 수호자를 두는 것이 좋습니다. 해외나 다양한 문화와 연결될 때 가장 큰 기회가 옵니다.',
    '정재':'성실함과 꼼꼼함이 인생 최고의 무기입니다. <b>단, 너무 안정만을 추구하다 기회를 놓치지 마세요.</b> 작은 도전들을 반복하면서 실패에 익숙해지는 연습이 필요합니다. 건강한 관계 패턴을 만드는 것이 인생 행복의 핵심입니다.',
    '편관':'강인한 의지와 의협심, 그리고 리더십의 주인입니다. <b>스트레스를 속으로 쌓아두면 몸이 먼저 신호를 보냅니다.</b> 반드시 격렬한 신체 활동으로 에너지를 발산하세요. 권위적인 태도 대신 솔선수범하는 리더십으로 사람을 이끄세요.',
    '정관':'원칙과 명예를 중시하는 당신, 그 정직함이 가장 큰 신용 자산입니다. <b>하지만 모든 상황이 원칙대로 돌아가지는 않습니다.</b> 유연성을 배우고, 때로는 규칙보다 사람이 먼저임을 기억하세요. 남의 시선보다 자신의 내면 기준에 충실한 삶을 살 때 진정한 만족을 얻습니다.',
    '편인':'직관력과 영감이 탁월한 당신, 생각이 너무 많아 행동이 늦어지는 것이 가장 큰 문제입니다. <b>"일단 해보자"는 용기가 당신을 한 단계 성장시킵니다.</b> 아이디어를 혼자만 간직하지 말고, 신뢰하는 한 사람에게라도 꺼내 보세요. 고독을 즐기되 적절한 사회적 연결이 정신 건강을 지킵니다.',
    '정인':'사랑받고 배우는 것을 좋아하는 당신, 의존적 성향이 가장 큰 함정입니다. <b>누군가가 없어도 스스로 결정하고 실행하는 자립심 훈련이 평생 과제입니다.</b> 인정과 칭찬에 약하니 그것을 이용하는 사람을 조심하세요. 건강한 경계를 세우는 것이 성장의 첫걸음입니다.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid var(--pink)">';
  out+='<b style="font-size:.9rem;color:var(--pink)">⭐ 핵심 십성 '+dominant+' — 맞춤 조언</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(tsAdviceFull[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elOverload={
      wood:'<b>목(木) 기운이 강합니다.</b> 고집과 독선이 동시에 나타날 수 있어요. 금(金) 기운으로 다듬고 화(火) 기운으로 발산하세요. 서쪽 방향, 흰색·회색 계열, 매운맛 음식이 도움이 됩니다.',
      fire:'<b>화(火) 기운이 지나칩니다.</b> 감정 기복과 심장·혈압 건강에 주의해야 합니다. 수(水) 기운이 절실합니다. 검은색·파란색 계열, 물가 생활, 충분한 수면이 필수입니다.',
      earth:'<b>토(土) 기운이 강합니다.</b> 고집이 세고 변화를 거부하며 소화기 질환에 주의가 필요합니다. 목(木) 기운으로 흔들어주세요. 초록색 식물, 동쪽 방향, 신맛 음식이 도움입니다.',
      metal:'<b>금(金) 기운이 강합니다.</b> 냉정함이 인간관계를 어렵게 만들 수 있습니다. 화(火) 기운이 필요합니다. 따뜻한 색상, 사람들과의 활동, 베풀고 표현하는 연습이 균형을 잡아줍니다.',
      water:'<b>수(水) 기운이 지나칩니다.</b> 우유부단함과 지나친 내성, 신장·방광 건강에 주의하세요. 토(土) 기운으로 방향을 잡아주세요. 노란색·갈색 계열, 안정적인 루틴 세우기가 중요합니다.'
    };
    out+='<div style="background:rgba(255,245,220,.8);border-radius:10px;padding:12px;margin-bottom:10px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.88rem;color:#E65100">⚠️ 오행 편중 주의사항</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.82">'+(elOverload[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#81C784;font-size:.8rem">— 연이가 당신의 사주를 읽으며 진심을 담아 🐷💚</div>';
  return out;
}

/* ─── generateNeoFactPunch: 쌈바의 현실적 팩폭 (백사자 NEO MODE 전용) ─── */
function generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';
  var EL_KO={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var EL_K={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};

  // 일간별 팩폭 조언
  var ganPunch={
    '甲':'당신은 방향만 맞으면 아무도 못 막는 사람입니다. 근데 솔직히 말할게요. 지금 방향이 맞긴 합니까? 고집이 강하다는 건 좋습니다. 근데 피드백을 무시하는 고집은 자기 무덤 파는 겁니다. 주변에서 당신에게 같은 말을 두 번 이상 한 적 있으면 그건 반드시 들어야 합니다. 독립심도 좋지만 혼자 다 하려다 번아웃 나는 갑목(甲木)을 많이 봤습니다. 협력을 두려워하지 마세요. 당신보다 잘하는 사람을 파트너로 두는 것이 패배가 아니라 전략입니다. 지금 가장 필요한 것: 주간 목표 점검, 한 명의 진짜 피드백 파트너, 그리고 자신의 완고함을 인식하는 솔직한 일기.',
    '乙':'당신은 어디서든 살아남는 생존력이 있습니다. 하지만 그 생존력이 자기 목소리를 죽이는 방식으로 쓰이고 있지 않나요? 눈치가 빠른 건 장점이지만, 모든 사람을 만족시키려다 정작 자신이 원하는 게 뭔지 잃어버린 을목(乙木)이 많습니다. 결정 앞에서 too much thinking이 제일 큰 문제입니다. 완벽한 선택은 없습니다. 70%의 확신이 있으면 움직이세요. 나머지 30%는 움직이면서 채우는 겁니다. 그리고 당신을 이용하는 사람을 구별하는 눈을 키우세요. 착한 게 죄는 아니지만, 착함을 착취당하는 건 당신 책임입니다.',
    '丙':'에너지 넘치죠. 근데 그 에너지가 얼마나 집중되고 있습니까? 병화(丙火)의 가장 흔한 패턴: 시작은 화끈하게, 중간에 흥미 잃고, 마무리는 흐지부지. 이 패턴을 인식하고 있나요? 지금 당장 하나만 골라서 끝까지 가세요. 동시에 여러 걸 하는 건 다 중간에서 끝내는 것과 같습니다. 결실은 끝까지 간 사람에게 옵니다. 충동적 결정이 많은데, 큰 결정 앞에서 반드시 48시간 쿨다운 규칙을 만드세요. 충동으로 시작한 일이 인생을 얼마나 흔들어놨는지 솔직하게 돌아보세요.',
    '丁':'조용하지만 내면에 뜨거운 것들이 있다는 거 압니다. 근데 그걸 너무 안으로만 담아두고 있지 않나요? 정화(丁火)의 함정: 상처를 말 못 하고 참다가 어느 순간 폭발하거나 관계를 조용히 끊어버립니다. 주변 사람은 왜 갑자기 거리를 두는지 이유를 모릅니다. 말하세요. 불편하면 불편하다고, 상처받으면 상처받았다고. 소통의 부재가 모든 관계 문제의 근원입니다. 자기비판도 너무 심합니다. 당신이 틀렸을 때 자신을 몰아붙이는 내면의 목소리, 이제 그 목소리에게도 경계를 설정해야 합니다.',
    '戊':'든든하고 믿음직합니다. 근데 그 무거움이 때로는 당신 자체를 가두고 있지 않나요? 무토(戊土)의 핵심 문제: 변화가 필요한 줄 알면서도 행동이 늦습니다. "언젠가는", "좀 더 준비되면" — 이 말 입에 달고 삽니까? 완벽한 타이밍은 없습니다. 지금 시작하는 것이 언제나 가장 빠릅니다. 책임감이 강해서 져서는 안 된다는 강박이 있는데, 실패는 정보입니다. 빠른 실패가 느린 성공보다 낫습니다. 자신의 경직됨을 인식하고, 매달 한 가지씩 새로운 것을 시도하는 루틴을 만드세요.',
    '己':'당신은 조직의 진짜 핵심을 조용히 지탱하는 사람입니다. 근데 그 사실을 본인이 가장 모르고 있지 않나요? 기토(己土) 패턴: 남을 너무 챙기다 정작 자신의 경력, 건강, 즐거움을 뒷전으로 밀어놓습니다. 이건 미덕이 아닙니다. 내 컵이 비어있으면 남을 채워줄 수 없습니다. 결단력 부족도 문제입니다. 선택 앞에서 너무 오래 고민하면 기회가 지나갑니다. 자신의 판단을 믿으세요. 당신의 세밀한 눈은 이미 정답을 알고 있습니다. 행동하는 것만 남았습니다.',
    '庚':'직선적이고 솔직합니다. 이건 큰 자산입니다. 근데 경금(庚金)이 가장 많이 듣는 말이 뭔지 압니까? "차갑다", "말이 너무 직접적이다", "배려가 없다". 의도가 없어도 상처를 주고 있을 수 있습니다. 메시지는 보내는 사람이 아닌 받는 사람이 해석합니다. 동일한 내용을 5% 더 부드럽게 전달하는 연습이 인간관계 전체를 바꿉니다. 그리고 완고함 — 이미 결정한 것을 끝까지 밀어붙이는 경향, 이것이 위기 때는 강점이지만 일상에서는 갈등 원인입니다. 언제 유연해야 하는지 판단하는 기준을 세우세요.',
    '辛':'완벽주의자죠. 당신 눈에는 항상 뭔가 부족하게 보입니다. 근데 솔직히 말할게요: 세상은 완벽한 것은 아무것도 없고, 완벽을 기다리다 타이밍을 놓친 신금(辛金)이 너무 많습니다. 지금 당장 70%짜리라도 꺼내세요. 시장에서의 피드백이 당신의 머릿속 완벽함보다 훨씬 정확합니다. 비판에 과민하게 반응하는 것도 문제입니다. 비판은 당신의 존재에 대한 공격이 아니라 작품에 대한 의견입니다. 자신과 자신의 결과물을 분리하는 심리적 거리감을 만드세요.',
    '壬':'시야가 넓고 전략적입니다. 근데 그 넓음이 문제입니다. 임수(壬水)는 동시에 너무 많은 것을 봐서 어느 것도 깊이 파지 못하는 패턴이 반복됩니다. 지금 당신 손에 몇 개의 프로젝트가 있나요? 반 이상은 버리세요. 집중이 자산입니다. 감정을 안 드러내는 것도 장기적으로는 관계를 고립시킵니다. 주변 사람들은 당신의 속을 알 수 없어서 어떻게 다가가야 할지 모릅니다. 가끔은 약점을 보여주세요. 그게 오히려 신뢰를 만듭니다.',
    '癸':'섬세하고 공감 능력이 뛰어납니다. 근데 계수(癸水)의 가장 큰 적은 자기 자신입니다. 생각이 너무 많아서 행동이 늦고, 우유부단한 모습 때문에 기회를 반복적으로 놓칩니다. 완벽한 확신이 올 때까지 기다리는 것은 영원히 시작하지 않겠다는 것과 같습니다. 직관을 믿으세요. 당신의 첫 번째 감이 대부분 맞습니다. 그리고 다른 사람의 감정을 지나치게 흡수해 자신의 에너지를 소진시키는 习관을 점검하세요. 공감은 미덕이지만, 경계 없는 공감은 자기 소모입니다.'
  };

  // 신강/신약 팩폭
  var powerPunch='';
  if(jg&&jg.isJong){
    powerPunch='<b>종격 사주</b> — 이 사주의 핵심은 하나입니다. '+EL_KO[jg.dominant]+' 기운이 압도적인 당신은, 그 기운에 거스르는 선택을 할 때마다 인생이 삐걱거립니다. 취미, 직업, 인간관계 모두 '+EL_KO[jg.dominant]+' 에너지가 흐르는 방향으로 정렬하세요. 반대 에너지는 독입니다. 많은 사람들이 사회적 기대나 주변 압박 때문에 자신의 기운에 반하는 선택을 합니다. 당신에게 그것은 치명적입니다. 자신의 타고난 기운을 따르는 용기가 필요합니다.';
  }else if(pw&&pw.isStrong){
    powerPunch='<b>신강 사주</b> — 에너지가 넘칩니다. 이게 문제입니다. 넘치는 에너지는 통제되지 않으면 고집, 독선, 과잉 경쟁으로 타버립니다. 당신 주변의 사람들이 피로해하고 있지 않나요? 자신의 에너지를 건강하게 발산하는 구조(운동, 봉사, 창작, 리더십 역할)를 반드시 만드세요. 억누르면 더 폭발적으로 터집니다. 에너지를 올바른 방향으로 쏟아붓는 것이 신강 사주의 유일한 성공 공식입니다. 지금 당신의 에너지가 건강하게 흐르고 있는지 솔직하게 답하세요.';
  }else{
    powerPunch='<b>신약 사주</b> — 외부 환경이나 사람의 영향을 쉽게 받습니다. 이것 자체는 약점이 아닙니다. 문제는 당신도 그것을 알면서 경계를 세우지 않는다는 겁니다. 당신이 지쳐있는 관계, 당신을 소모시키는 환경 — 이것들을 정리할 용기가 필요합니다. 거절하는 것이 이기적인 게 아닙니다. 자신을 지키는 것이 먼저입니다. 귀인 한 명이 인생을 바꿔줄 수 있는 구조이니, 당신의 가치를 알아봐주고 진심으로 응원하는 사람과의 인연을 소중히 하세요.';
  }

  // 십성 팩폭 조언
  var tsPunch={
    '비견':'경쟁에서 강하고 독립심이 높습니다. 근데 그 독립심이 고립으로 가고 있지는 않나요? 혼자 다 하려다 결국 혼자 지칩니다. 당신보다 잘하는 사람을 파트너로 두는 것이 약점을 인정하는 게 아니라 전략입니다. 수입 이상 쓰는 습관, 재물 관리 구멍부터 막으세요.',
    '겁재':'승부욕과 카리스마가 탁월합니다. 근데 솔직히 말할게요 — 지금까지 돈이 들어온 만큼 나가지 않았나요? 겁재의 재물 구조는 크게 벌고 크게 씁니다. 이 흐름을 막을 강제 시스템(자동이체, 고정 저축 비율)이 없으면 나이 들어 손에 남는 게 없습니다. 지금 당장 지출 구조를 설계하세요.',
    '식신':'낙천적이고 창의적입니다. 이것이 최고의 자산입니다. 근데 이 좋은 기운이 이용당하고 있지는 않나요? 잘 베풀다가 지치는 패턴, 오래 됐죠? 사람을 볼 줄 아는 눈을 키우는 것이 이제 남은 과제입니다. 체력 관리도 중요합니다. 창의력과 에너지가 당신의 자본인데, 그 자본이 고갈되지 않게 관리하세요.',
    '상관':'아이디어와 언변이 탁월한 대신 적을 만들기 쉽습니다. 이미 알고 있죠? 표현의 날카로움을 10% 줄이면 당신의 영향력이 3배가 됩니다. 자기 규칙을 스스로 만들고 지키는 자기 경영이 전부입니다. 타인의 틀 안에서는 당신이 빛나기 어렵습니다. 자신만의 기준과 영역을 만드세요.',
    '편재':'큰 기회를 잡는 능력이 있습니다. 근데 큰 것만 보다 작은 것을 놓치는 패턴, 지금도 반복되고 있지 않나요? 재물이 들어왔다 나가는 주기가 빠릅니다. 이 주기를 늦추는 것이 자산 축적의 핵심입니다. 신뢰할 수 있는 재무 파트너(회계사, 재무설계사)를 두는 것을 강력히 권합니다.',
    '정재':'성실하고 꼼꼼합니다. 이건 좋습니다. 근데 너무 안정만 추구해서 기회를 계속 패스하고 있지 않나요? 작은 도전들을 지속적으로 해나가는 것이 큰 결실로 이어집니다. 실패가 두렵겠지만, 실패하지 않는 유일한 방법은 아무것도 하지 않는 것입니다. 그건 더 무서운 실패입니다.',
    '편관':'강인하고 리더십이 있습니다. 근데 스트레스를 몸으로 다 받아내고 있지 않나요? 지금 몸 상태를 솔직하게 체크하세요. 편관 사주는 과로와 건강 문제가 가장 큰 리스크입니다. 당신이 무너지면 당신이 이끄는 모든 것이 흔들립니다. 격렬한 운동으로 에너지를 발산하고, 권위 대신 공감으로 사람을 이끄는 법을 배우세요.',
    '정관':'원칙과 명예를 중시합니다. 이것이 당신의 가장 큰 신용 자산입니다. 근데 원칙을 지키다가 기회를 놓치는 경우가 있지 않나요? 규칙보다 사람이 먼저인 상황이 있습니다. 100% 원칙에 2% 유연성을 더하는 것이 당신의 숙제입니다. 남의 시선 때문에 자신의 진짜 욕구를 억누르고 있지는 않은지 점검하세요.',
    '편인':'직관이 탁월하고 아이디어가 넘칩니다. 근데 그 아이디어들이 머릿속에서만 살다 죽어가고 있지 않나요? 생각을 실행으로 연결하는 의지가 가장 필요합니다. 완벽히 준비된 다음 시작하려다 결국 아무것도 시작 못 합니다. 지금 당장 가장 작은 첫 걸음을 내딛으세요. 고독을 즐기는 건 좋지만 고립되면 안 됩니다.',
    '정인':'배우려는 의지가 강하고 귀인 복이 있습니다. 근데 지금 누군가에게 지나치게 의존하고 있지는 않나요? 그 사람이 없어도 자립할 수 있는 기반을 만드는 것이 지금 당신의 가장 중요한 과제입니다. 칭찬에 약하고 인정에 목마르다는 것도 인식하세요 — 그것을 이용하는 사람들이 있습니다. 건강한 경계를 세우는 것이 성장의 시작입니다.'
  };

  // 구성
  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #e53935;background:rgba(229,57,53,.08)">';
  out+='<b style="font-size:.9rem;color:#FF6B6B">🦁 일간 '+dg+' — 쌈바가 당신 사주에서 본 것</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(ganPunch[dg]||deep.advice)+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #ff9800;background:rgba(255,152,0,.08)">';
  out+='<b style="font-size:.9rem;color:#FFA726">⚡ '+( jg&&jg.isJong ? '종격':'(신강/신약)' )+' 팩폭</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+powerPunch+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #9c27b0;background:rgba(156,39,176,.08)">';
  out+='<b style="font-size:.9rem;color:#CE93D8">💥 핵심 십성 '+dominant+' — 직격탄</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(tsPunch[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elPunch={
      wood:'목(木) 과잉. 지금 고집이 지나치게 세지 않나요? 주변 사람들이 당신에게 같은 말을 두 번 이상 했다면 그건 피드백입니다. 흰색·금속 소품으로 금(金) 기운을 보강하고, 서쪽 방향 공간을 정리하세요. 매운맛 음식(고추, 마늘)을 식단에 추가하면 도움이 됩니다.',
      fire:'화(火) 과잉. 지금 심장이 빠르게 뛰거나 불면이 있지 않나요? 충동적 결정이 최근 잦았다면 경보 신호입니다. 검은색·파란색 소품으로 수(水) 기운을 불러오세요. 충분한 수면과 수영·목욕 등 물 관련 활동이 균형을 잡아줍니다.',
      earth:'토(土) 과잉. 변화를 너무 거부하고 있지 않나요? 고집이 세고 소화 문제가 있다면 신호입니다. 초록색 식물을 키우고 동쪽 방향 공간을 활성화하세요. 신맛 음식(식초, 레몬)이 토 기운을 분산시킵니다.',
      metal:'금(金) 과잉. 요즘 주변에서 "차갑다", "무뚝뚝하다"는 말을 들었나요? 피부 건조나 기침도 체크하세요. 따뜻한 색상(빨강, 주황)을 일상에 더하고 봉사나 표현 활동으로 화(火) 기운을 채우세요.',
      water:'수(水) 과잉. 결정을 계속 미루고 있나요? 두려움이나 불안이 크다면 수 기운 과잉 신호입니다. 노란색·황토색 소품으로 토(土) 기운을 보강하고, 규칙적인 루틴을 만들어 방향성을 잡으세요.'
    };
    out+='<div style="border-radius:10px;padding:12px;margin-bottom:14px;border-left:4px solid #e65100;background:rgba(230,81,0,.08)">';
    out+='<b style="font-size:.88rem;color:#FF8A65">⚠️ '+EL_KO[domE]+' 편중 — 지금 당장 균형 잡으세요</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.9">'+(elPunch[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#FF6B6B;font-size:.8rem">— 쌈바가 당신의 사주를 보며 팩트로 꽂아드립니다 🦁⚡</div>';
  return out;
}

/* ══════════════════════════════════════════
   대운별 퀀텀 합화 분석 헬퍼 함수
══════════════════════════════════════════ */
var _DW_GANHE={'甲':{'己':'earth'},'己':{'甲':'earth'},'乙':{'庚':'metal'},'庚':{'乙':'metal'},'丙':{'辛':'water'},'辛':{'丙':'water'},'丁':{'壬':'wood'},'壬':{'丁':'wood'},'戊':{'癸':'fire'},'癸':{'戊':'fire'}};
var _DW_JIHE={'子':{'丑':'earth'},'丑':{'子':'earth'},'寅':{'亥':'wood'},'亥':{'寅':'wood'},'卯':{'戌':'fire'},'戌':{'卯':'fire'},'辰':{'酉':'metal'},'酉':{'辰':'metal'},'巳':{'申':'water'},'申':{'巳':'water'},'午':{'未':'fire'},'未':{'午':'fire'}};

function _dwElType(el){
  var pw=G_POWER,jg=G_JONG;
  if(!el)return 'neutral';
  if(jg&&jg.isJong){
    if(el===jg.dominant||el===jg.parEl)return 'good';
    if(el===whoControls(jg.dominant))return 'bad';
    return 'neutral';
  }
  if(pw){
    if(pw.yongshin.indexOf(el)>=0)return 'good';
    if(pw.kijishin.indexOf(el)>=0)return 'bad';
    return 'neutral';
  }
  return 'neutral';
}

function _getDwHapResults(g,j){
  if(!G_PILLARS)return [];
  var p0=G_PILLARS;
  var origGans=[p0.y.g,p0.m.g,p0.d.g,p0.h.g];
  var origZhis=[p0.y.j,p0.m.j,p0.d.j,p0.h.j];
  var results=[];
  var seen=new Set(); // 중복 제거용
  var ganEl=(GAN[g]&&GAN[g].e)||'earth';
  origGans.forEach(function(og){
    if(!og||!g)return;
    var hapEl=null;
    if(_DW_GANHE[g]&&_DW_GANHE[g][og]) hapEl=_DW_GANHE[g][og];
    else if(_DW_GANHE[og]&&_DW_GANHE[og][g]) hapEl=_DW_GANHE[og][g];
    if(!hapEl)return;
    var key='gh_'+g+'_'+og;
    if(seen.has(key))return;
    seen.add(key);
    var orgT=_dwElType(ganEl),newT=_dwElType(hapEl);
    results.push({type:'간합(天干)',src:g,partner:og,hapEl:hapEl,orgEl:ganEl,orgType:orgT,newType:newT,changed:orgT!==newT});
  });
  var zhiEl=(JI[j]&&JI[j].e)||'earth';
  origZhis.forEach(function(oz){
    if(!oz||!j)return;
    var hapEl=null;
    if(_DW_JIHE[j]&&_DW_JIHE[j][oz]) hapEl=_DW_JIHE[j][oz];
    else if(_DW_JIHE[oz]&&_DW_JIHE[oz][j]) hapEl=_DW_JIHE[oz][j];
    if(!hapEl)return;
    var key='jh_'+j+'_'+oz;
    if(seen.has(key))return;
    seen.add(key);
    var orgT=_dwElType(zhiEl),newT=_dwElType(hapEl);
    results.push({type:'지합(地支)',src:j,partner:oz,hapEl:hapEl,orgEl:zhiEl,orgType:orgT,newType:newT,changed:orgT!==newT});
  });

  var GAN_CHUNG = {'甲':'庚', '乙':'辛', '丙':'壬', '丁':'癸', '庚':'甲', '辛':'乙', '壬':'丙', '癸':'丁'};
  var ZHI_CHUNG = {'子':'午', '丑':'未', '寅':'申', '卯':'酉', '辰':'戌', '巳':'亥', '午':'子', '未':'丑', '申':'寅', '酉':'卯', '戌':'辰', '亥':'巳'};

  origGans.forEach(function(og){
    if(!og||!g)return;
    if(GAN_CHUNG[g] === og || GAN_CHUNG[og] === g){
      var key='gc_'+g+'_'+og;
      if(seen.has(key))return;
      seen.add(key);
      // 원국 천간합 > 충 원칙: 합화된 천간은 대운/세운 천간충 무효
      var natalGanHe = (G_JONG && G_JONG.ganHeMerged) ? G_JONG.ganHeMerged : {};
      if(natalGanHe[og]) return; // 원국에서 이미 합화된 천간 — 충 무효
      var ogEl=(GAN[og]&&GAN[og].e)||'earth';
      var ogType=_dwElType(ogEl);
      var srcEl=(GAN[g]&&GAN[g].e)||'earth';
      
      var pw=G_POWER, jg=G_JONG;
      var isMetalDM = p0 && (p0.d.g === '庚' || p0.d.g === '辛');
      var isFireFavorable = false;
      if(pw) {
        isFireFavorable = isFireFavorable || pw.yongshin.indexOf('fire')>=0;
      }
      if(jg && jg.isJong) isFireFavorable = isFireFavorable || jg.dominant==='fire' || jg.parEl==='fire';
      var isSpecial = isMetalDM && isFireFavorable && ((srcEl==='fire'&&ogEl==='water')||(srcEl==='water'&&ogEl==='fire'));

      results.push({type:'간충(天干)',src:g,partner:og,orgEl:ogEl,orgType:ogType,isChung:true, isSpecialChung:isSpecial});
    }
  });

  origZhis.forEach(function(oz){
    if(!oz||!j)return;
    if(ZHI_CHUNG[j] === oz || ZHI_CHUNG[oz] === j){
      var key='zc_'+j+'_'+oz;
      if(seen.has(key))return;
      seen.add(key);
      var ozEl=(JI[oz]&&JI[oz].e)||'earth';
      var ozType=_dwElType(ozEl);
      var srcEl=(JI[j]&&JI[j].e)||'earth';

      var pw=G_POWER, jg=G_JONG;
      var isMetalDM = p0 && (p0.d.g === '庚' || p0.d.g === '辛');
      var isFireFavorable = false;
      if(pw) {
        isFireFavorable = isFireFavorable || pw.yongshin.indexOf('fire')>=0;
      }
      if(jg && jg.isJong) isFireFavorable = isFireFavorable || jg.dominant==='fire' || jg.parEl==='fire';
      var isSpecial = isMetalDM && isFireFavorable && ((srcEl==='fire'&&ozEl==='water')||(srcEl==='water'&&ozEl==='fire'));

      results.push({type:'지충(地支)',src:j,partner:oz,orgEl:ozEl,orgType:ozType,isChung:true, isSpecialChung:isSpecial});
    }
  });

  return results;
}

function getDwQmBadge(g,j){
  var p0=G_PILLARS;
  var isWeirdSinDing = (p0 && p0.d.g==='辛' && g==='丁');
  var results=_getDwHapResults(g,j);
  var hasSpecial=results.some(function(r){return r.isSpecialChung;});
  var hasBonus=results.some(function(r){return (r.orgType==='bad'&&r.newType==='good') || (r.isChung && r.orgType==='bad');});
  var hasSnare=results.some(function(r){return (r.orgType==='good'&&r.newType==='bad') || (r.isChung && r.orgType==='good' && !r.isSpecialChung);});
  
  if(isWeirdSinDing)return '<div class="dw-qm-badge snare" style="background:#4A148C;color:#FFCDD2;border-color:#B71C1C">⚠️보석용해</div>';
  if(hasSpecial)return '<div class="dw-qm-badge bonus" style="background:#FCE4EC;color:#C2185B;border-color:#F8BBD0">🔥제련발복</div>';
  if(hasBonus)return '<div class="dw-qm-badge bonus">⚡환골탈태</div>';
  if(hasSnare)return '<div class="dw-qm-badge snare">⚠탐합망귀</div>';
  if(results.some(function(r){return r.isChung;}))return '<div class="dw-qm-badge hap" style="background:#FFF3E0;color:#E65100;border-color:#FFE0B2">⚔️충돌발생</div>';
  if(results.length > 0)return '<div class="dw-qm-badge hap">🔄합화</div>';
  return '';
}

function buildDwQmSection(g,j){
  var p0=G_PILLARS;
  var isWeirdSinDing = (p0 && p0.d.g==='辛' && g==='丁');
  var results=_getDwHapResults(g,j);
  if(!results.length && !isWeirdSinDing)return '';
  var pw=G_POWER,jg=G_JONG;
  var hasSpecial=results.some(function(r){return r.isSpecialChung;});
  var hasBonus=results.some(function(r){return (r.orgType==='bad'&&r.newType==='good') || (r.isChung && r.orgType==='bad');});
  var hasSnare=results.some(function(r){return (r.orgType==='good'&&r.newType==='bad') || (r.isChung && r.orgType==='good' && !r.isSpecialChung);});

  var headerColor=isWeirdSinDing?'#FFCDD2':hasSpecial?'#C2185B':hasBonus?'#1B5E20':hasSnare?'#B71C1C':'#37474F';
  var headerBg=isWeirdSinDing?'linear-gradient(135deg,#4A148C,#311B92)':hasSpecial?'linear-gradient(135deg,#FCE4EC,#F8BBD0)':hasBonus?'linear-gradient(135deg,#E8F5E9,#F1F8E9)':hasSnare?'linear-gradient(135deg,#FFEBEE,#FCE4EC)':'linear-gradient(135deg,#FAFAFA,#F5F5F5)';
  var headerBd=isWeirdSinDing?'#B71C1C':hasSpecial?'#F48FB1':hasBonus?'#A5D6A7':hasSnare?'#FFCDD2':'#E0E0E0';

  var rows=results.map(function(r){
    if(r.isChung){
      var isBonus=(r.orgType==='bad');
      var isSnare=(r.orgType==='good' && !r.isSpecialChung);
      var isSpecial=r.isSpecialChung;

      var badge=isSpecial?'🔥 제련발복':isBonus?'💥 흉신파기':isSnare?'⚠️ 용신파손':'⚔️ 충돌발생';
      var badgeBg=isSpecial?'#FCE4EC':isBonus?'#E8F5E9':isSnare?'#FFEBEE':'#FFF3E0';
      var badgeTx=isSpecial?'#C2185B':isBonus?'#1B5E20':isSnare?'#C62828':'#E65100';
      
      var desc=isSpecial
        ?'금(金) 일간이 꼭 필요한 화(火)를 귀하게 쓰는 중에 수(水)와 충돌합니다. 일반적인 파극이 아니라, 물과 불이 교차하며 강철을 명검으로 거듭나게 하는 거대한 담금질의 시간이 되어 예상을 뛰어넘는 찬란한 성취를 이룹니다.'
        :isBonus
        ?'운에서 온 <b>'+r.src+'</b>이(가) 원국의 흉신(<b>'+r.partner+'·'+EL_K[r.orgEl]+'</b>)을 충(沖)하여 깨뜨립니다. 흉한 기운이 사라져 오히려 큰 발복의 기회가 됩니다.'
        :isSnare
        ?'운에서 온 <b>'+r.src+'</b>이(가) 원국의 용신(<b>'+r.partner+'·'+EL_K[r.orgEl]+'</b>)을 충(沖)하여 깨뜨립니다. 믿었던 기운이 흔들릴 수 있으니 각별한 주의가 필요합니다.'
        :'운에서 온 <b>'+r.src+'</b>이(가) 원국의 <b>'+r.partner+'</b>을(를) 충(沖)합니다. 변화와 이동수가 예상됩니다.';
      
      return '<div style="padding:10px 12px;background:#fff;border:1px solid #F0EEF0;border-radius:10px;font-size:.8rem">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'+
          '<span style="background:'+badgeBg+';color:'+badgeTx+';padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:800">'+badge+'</span>'+
          '<span style="color:#666;font-size:.75rem">'+r.type+'</span>'+
        '</div>'+
        '<div style="margin-bottom:4px;font-size:.85rem">'+
          '<b>'+r.src+'</b> <span style="color:#e63946;font-size:.75rem;padding:0 2px">⚡충(沖)⚡</span> <b>'+r.partner+'</b> ('+EL_K[r.orgEl]+')'+
        '</div>'+
        '<div style="color:#555;line-height:1.4">'+desc+'</div>'+
      '</div>';
    }
    var isBonus=(r.orgType==='bad'&&r.newType==='good');
    var isSnare=(r.orgType==='good'&&r.newType==='bad');
    var badge=isBonus?'⚡ 환골탈태':isSnare?'⚠️ 탐합망귀 (貪合忘貴)':'🔄 합화변환';
    var badgeBg=isBonus?'#E8F5E9':isSnare?'#FFEBEE':'#FAFAFA';
    var badgeTx=isBonus?'#1B5E20':isSnare?'#C62828':'#757575';
    var elClr={wood:'#2E7D32',fire:'#C62828',earth:'#E65100',metal:'#6D6E7A',water:'#1565C0'};
    var hapColor=elClr[r.hapEl]||'#555';
    var desc=isBonus
      ?'<b>흉신('+EL_K[r.orgEl]+')</b>이 '+r.type+'으로 <b style="color:'+hapColor+'">용신('+EL_K[r.hapEl]+')</b>으로 변환됩니다. 이 대운에서 무서워 보이는 글자가 진짜 기회입니다.'
      :isSnare
      ?'<b>용신('+EL_K[r.orgEl]+')</b>이 탐합망귀로 <b style="color:#C62828">기신('+EL_K[r.hapEl]+')</b>에 묶입니다. 좋아 보이는 기운이 함정일 수 있으니 방어 천기를 취하세요.'
      :'<b>'+EL_K[r.orgEl]+'</b>이(가) '+r.type+'으로 <b style="color:'+hapColor+'">'+EL_K[r.hapEl]+'</b>으로 변환됩니다.';
    return '<div style="padding:10px 12px;background:#fff;border:1px solid #F0EEF0;border-radius:10px;font-size:.8rem">'+
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'+
        '<span style="background:'+badgeBg+';color:'+badgeTx+';padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:800">'+badge+'</span>'+
        '<span style="font-size:.68rem;color:#AAA">'+r.type+'</span>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:5px;font-weight:700;font-size:.82rem;margin-bottom:6px">'+
        '<span style="background:#F5F5F5;padding:2px 9px;border-radius:6px;">'+r.src+' <span style="font-size:.7rem;font-weight:400;color:#888">('+EL_K[r.orgEl]+')</span></span>'+
        '<span style="color:#CCC;font-size:.75rem">+'+r.partner+' →</span>'+
        '<span style="background:'+(isBonus?'#E8F5E9':isSnare?'#FFEBEE':'#F5F5F5')+';color:'+(isBonus?'#1B5E20':isSnare?'#B71C1C':'#555')+';padding:2px 9px;border-radius:6px;font-size:.82rem">'+EL_K[r.hapEl]+'</span>'+
      '</div>'+
      '<div style="color:#555;line-height:1.7;font-size:.79rem">'+desc+'</div>'+
    '</div>';
  }).join('');
  var factMsg='';
  if(hasBonus)factMsg='<div style="font-size:.78rem;color:#2E7D32;background:#E8F5E9;border-radius:8px;padding:9px 11px;margin-top:8px;line-height:1.65">'+
    '▸ 이 대운에서 흉신이 합화로 용신으로 전환됩니다. 두렵게 보이는 기운을 적극 활용하세요.</div>';
  else if(hasSnare)factMsg='<div style="font-size:.78rem;color:#C62828;background:#FFEBEE;border-radius:8px;padding:9px 11px;margin-top:8px;line-height:1.65">'+
    '▸ 탐합망귀(貪合忘貴): 용신이 합에 묶여 약해집니다. 지금 가진 것을 지키는 수비 천기가 우선입니다.</div>';
  return '<div style="background:'+headerBg+';border:1.5px solid '+headerBd+';border-radius:14px;padding:14px 15px;margin-bottom:14px">'+
    '<div style="font-weight:800;font-size:.88rem;color:'+headerColor+';margin-bottom:10px;display:flex;align-items:center;gap:6px">'+
      '<span>⚡</span>퀀텀 합화 분석 <span style="font-size:.7rem;font-weight:400;color:#AAA">(억부+조후+합화 통합 판단)</span>'+
    '</div>'+
    '<div style="display:flex;flex-direction:column;gap:7px">'+rows+'</div>'+
    (isWeirdSinDing?'<div style="font-size:.8rem;color:#FFCDD2;background:#4A148C;border-radius:8px;padding:9px 11px;margin-top:8px;line-height:1.65;font-weight:700;">▸ 편관(丁)의 위협: 신금(辛) 완성된 보석이 뜨거운 정화(丁) 불길에 녹아내리는 치명적 흉운입니다. 나대지 않고 조용히 지내는 것이 상책입니다.</div>':'')+
    factMsg+
  '</div>';
}

function renderDaewun(bazi){
  var card = document.getElementById('daewunCard');
  if(card) card.style.display = 'block';
  var jg=G_JONG,pw=G_POWER;
  var jongTag = jg&&jg.isJong ? (jg.isGaJong ? '가종격(假從格)' : '진종격(眞從格)') : '';
  var legendItems=['<span style="background:#E8F5E9;color:#2E7D32;padding:3px 9px;border-radius:99px;font-weight:700;font-size:.77rem">🌟 조후/<span class="notranslate">용신운</span> = 길</span>',
    '<span style="background:#FFEBEE;color:#C62828;padding:3px 9px;border-radius:99px;font-weight:700;font-size:.77rem">🌧️ <span class="notranslate">기신운</span> = 역경</span>',
    '<span style="background:#E3F2FD;color:#1565C0;padding:3px 9px;border-radius:99px;font-weight:700;font-size:.77rem">✨ 합화(合化) 반영</span>'
    +(jg&&jg.isJong?'<span style="background:#EDE7F6;color:#6A1B9A;padding:3px 9px;border-radius:99px;font-weight:600;font-size:.72rem">🌀 '+jongTag+'</span>':'')];
  document.getElementById('dwLegend').innerHTML=legendItems.join('');

  try{
    var yun=bazi.getYun(GENDER==='M'?1:0);
    var list=yun.getDaYun();
    var h='';
    var _dwGlobalArr=[];
    list.forEach(function(dw,idx){
      if(idx===0)return;
      var gz=dw.getGanZhi();if(!gz||gz.length<2)return;
      var g=gz[0],j=gz[1];
      var age=dw.getStartAge();
      if(!age||age<=0)return;
      var gd=GAN[g]||{e:'metal',n:'?'},jd=JI[j]||{e:'water',a:'?'};
      _dwGlobalArr.push({age:age,g:g,j:j,gE:gd.e,jE:jd.e});
      var ev=evalDaewun(g,j);
      var qBadge=getDwQmBadge(g,j);

      // ── 종격 배지 HTML (카드 색은 점수 기반 ev.cls 그대로 사용) ──────────
      var jongBadgeHtml='';
      if(jg&&jg.isJong&&ev.jongStrength){
        if(ev.jongStrength==='strengthen'){
          var bCls=jg.isGaJong?'ga-str':'str';
          var bLabel=jg.isGaJong?'가종격↑':'종격강화';
          jongBadgeHtml='<div class="dw-jong-badge '+bCls+'">'+(ev.score>=80?'🌟':'🌀')+bLabel+'</div>';
        }else if(ev.jongStrength==='weaken'){
          jongBadgeHtml='<div class="dw-jong-badge wkn">⚠️종격약화</div>';
        }else{
          jongBadgeHtml='<div class="dw-jong-badge ntl">〰 중립</div>';
        }
      }

      // ── 점수 기반 요약 라벨 (배지 없을 때 공통 표시) ─────────────────────
      var evalLabelHtml='';
      if(!jongBadgeHtml){
        var shortLabel=ev.score>=80?'🌟최고':ev.score>=60?'☀️길':ev.score>=40?'🍀무난':ev.score>=20?'⚠️주의':'🌧️역경';
        if(ev.hasChungBonus) shortLabel='💥'+shortLabel;
        if(ev.hasChungPenalty) shortLabel='⚡'+shortLabel;
        evalLabelHtml='<div class="dw-eval-label">'+shortLabel+'</div>';
      }

      h+='<div class="dw-item '+ev.cls+'" onclick="showDwDetail('+age+',\''+g+'\',\''+j+'\',\''+ev.label+'\','+ev.score+')">'+
        '<span class="dw-tag '+ev.tagCls+'">'+ev.emoji+'</span>'+
        '<span class="dw-age">'+age+'세~</span>'+
        '<div class="dw-gz">'+g+'<br>'+j+'</div>'+
        '<div class="dw-sub">'+gd.n+'<br>'+jd.a+'</div>'+
        (jongBadgeHtml||evalLabelHtml)+
        qBadge+
        '</div>';
    });
    document.getElementById('dwGrid').innerHTML=h||'<p style="font-size:.83rem;color:#999">대운 데이터 없음</p>';
    if(_dwGlobalArr.length>0)window.G_DAEWUN=_dwGlobalArr;
    renderLifeGraph(bazi);
  }catch(err){console.error('대운 오류',err);}
}

function showDwDetail(age,gan,zhi,evaluation,score){
  var gd=GAN[gan]||{e:'earth',n:'?'},jd=JI[zhi]||{e:'water',a:'?'};
  var startYear=BIRTH_YEAR+age-1;
  var isGood=score>=60;
  var gaeun=getDetailedGaeun(gd.e,isGood);
  var lbCls=score>=80?'lb-best':score>=60?'lb-good':score>=40?'lb-ok':'lb-bad';
  var jg=G_JONG,pw=G_POWER,jh=G_JOHU;
  var ev=evalDaewun(gan,zhi);

  var evalText='<div style="display:inline-block; padding:4px 10px; background:#F4F6FF; color:#1C64F2; border-radius:6px; font-size:0.85rem; font-weight:800; margin-bottom:10px; border:1px solid #D1DEF8">🧭 통합 진단: '+ev.evalSummary+'</div><br>';
  if(jg&&jg.isJong){
    var jlabel = jg.isGaJong ? '가종격' : '종격';
    evalText+=gd.e===jg.dominant||jd.e===jg.dominant
      ?'✅ <b>'+jlabel+' 지배 기운('+EL_K[jg.dominant]+')이 강화</b>되는 대운입니다. 종격의 에너지를 최대로 발휘하는 시기!'+(jg.isGaJong?'<br><span style="font-size:.78rem;color:#7B1FA2">※ 가종격이 강화 대운을 만나면 진종격으로 전환 — 폭발적 발복 가능</span>':'')
      :gd.e===whoControls(jg.dominant)||jd.e===whoControls(jg.dominant)
        ?'⚠️ <b>'+jlabel+'을 약화시키는 기운</b>이 들어옵니다. 자신의 강점이 흔들리는 시기, 내실을 다지세요.'
        :'🙂 '+jlabel+'에 큰 영향을 주지 않는 중립 대운입니다.';
  }else{
    var ganType = getQuantumElType(gd.e, G_PILLARS, jg, pw, jh);
    var zhiType = getQuantumElType(jd.e, G_PILLARS, jg, pw, jh);
    
    var goodEls = [];
    var badEls = [];
    if(ganType === 'good') goodEls.push(EL_K[gd.e]);
    if(zhiType === 'good') goodEls.push(EL_K[jd.e]);
    if(ganType === 'bad') badEls.push(EL_K[gd.e]);
    if(zhiType === 'bad') badEls.push(EL_K[jd.e]);

    if(goodEls.length) evalText += '✅ <b>조후/용신('+goodEls.join(',')+') 기운 포함</b> — 나를 돕고 균형을 맞춰주는 긍정적인 시기입니다. ';
    if(badEls.length) evalText += '⚠️ <b>기신('+badEls.join(',')+') 기운 포함</b> — 주의가 필요하며 방어적인 태도가 유리합니다. ';
    if(!goodEls.length && !badEls.length) evalText = '🙂 조후나 억부에 큰 치우침이 없는 중립적인 대운입니다. ';
    
    evalText += '<br><span style="font-size:0.8rem;color:#888;">※ 퀀텀 명리 엔진(합화 및 조후 우선)이 반영된 종합 평가입니다.</span>';
  }

  if(ev.hasChungBonus){
    var bonusContent = ev.chungBonusText || '💥 <b>흉신 파기(沖) 발생!</b> 기신(흉신)이 사주 원국과 충돌하여 깨졌습니다. 흉한 기운이 오히려 큰 발복의 기회로 반전되는 매우 긍정적인 대운입니다.';
    evalText += '<div style="margin-top:8px;padding:12px;background:#FFF3E0;border-radius:8px;border-left:4px solid #FFB300;font-size:0.9rem;line-height:1.6;color:#E65100;box-shadow:0 2px 6px rgba(255,152,0,0.15);">'+
                bonusContent + '</div>';
  }
  if(ev.hasChungPenalty){
    var penaltyContent = ev.chungPenaltyText || '⚠️ <b>용신 파손(沖) 발생!</b> 용신이 사주 원국과 충돌하여 깨졌습니다. 믿었던 기운이 흔들릴 수 있으니 무리한 확장을 피하고 수성(守城)에 집중해야 하는 대운입니다.';
    evalText += '<div style="margin-top:8px;padding:12px;background:#FFEBEE;border-radius:8px;border-left:4px solid #EF5350;font-size:0.9rem;line-height:1.6;color:#C62828;box-shadow:0 2px 6px rgba(244,67,54,0.15);">'+
                penaltyContent + '</div>';
  }

  var html=
    buildDwQmSection(gan,zhi)+

    '<div style="background:#fff;padding:14px;border-radius:12px;margin-bottom:12px;border:1px solid #FFE0D6">'+
    '<div style="font-size:.82rem;color:#888;margin-bottom:4px">대운 종합 평가 (퀀텀 명리 엔진 반영)</div>'+
    '<div style="font-size:1.15rem;font-weight:700;color:#333;margin-bottom:6px">'+gan+zhi+
    ' <span style="font-size:.85rem;font-weight:400;color:#999">('+gd.n+' '+jd.a+')</span></div>'+
    '<span class="luck-badge '+lbCls+'">'+evaluation+'</span>'+
    '<div style="font-size:.84rem;color:#555;line-height:1.78;margin-top:10px">'+evalText+'</div>'+
    '</div>'+

    '<div class="gaeun-grid">'+
    '<div class="gaeun-box"><div class="gaeun-icon">💘</div><div class="gaeun-title">연애운</div><div class="gaeun-content">'+gaeun.love+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">💰</div><div class="gaeun-title">재물운</div><div class="gaeun-content">'+gaeun.wealth+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">👥</div><div class="gaeun-title">인간관계</div><div class="gaeun-content">'+gaeun.relationship+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">💼</div><div class="gaeun-title">커리어</div><div class="gaeun-content">'+gaeun.career+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">🏥</div><div class="gaeun-title">건강</div><div class="gaeun-content">'+gaeun.health+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">🌈</div><div class="gaeun-title">개운법</div><div class="gaeun-content">'+gaeun.lifestyle+'</div></div>'+
    '</div>'+

    '<div style="border-top:2px solid #FFE0D6;padding-top:16px;margin-top:4px">'+
    '<div style="font-weight:700;color:var(--pink);font-size:.9rem;margin-bottom:12px">📅 세운(연운) 상세</div>'+
    '<div class="year-list" id="yearList"></div></div>';

  var detail=document.getElementById('dwDetail');
  detail.innerHTML=html;detail.classList.add('show');
  setTimeout(function(){detail.scrollIntoView({behavior:'smooth',block:'nearest'});},100);

  var yearHTML='';
  for(var yr=startYear;yr<=startYear+9;yr++){
    try{
      var ySolar=Solar.fromYmdHms(yr,6,15,12,0,0);
      var yBazi=ySolar.getLunar().getEightChar();
      
      try {
        var _sj = KasiEngine.getGanji(new Date(yr, 5, 15, 12, 0, 0)); 
        if(_sj && _sj.secha) {
            yBazi.getYearGan = function() { return _sj.secha[0]; };
            yBazi.getYearZhi = function() { return _sj.secha[1]; };
        }
      } catch(e) {}

      var yg2=yBazi.getYearGan(),yz2=yBazi.getYearZhi();
      var ygd=GAN[yg2]||{e:'earth',n:'?'},yzd=JI[yz2]||{e:'water',a:'?'};
      var yEv=evalDaewun(yg2,yz2);
      var yGaeun=getDetailedGaeun(ygd.e,yEv.score>=60);

      var johuYText='';
      if(jh){
        if((jh.type==='hot'||jh.type==='warm')&&(ygd.e==='water'||yzd.e==='water'))
          johuYText='💧 시원한 水 기운이 뜨거운 사주를 식혀줍니다. ✅';
        else if((jh.type==='hot'||jh.type==='warm')&&(ygd.e==='fire'||yzd.e==='fire'))
          johuYText='🔥 火 기운이 더해져 과열 주의. ⚠️';
        else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='fire'||yzd.e==='fire'))
          johuYText='🔥 따뜻한 火 기운이 차가운 사주를 덥혀줍니다. ✅';
        else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='water'||yzd.e==='water'))
          johuYText='💧 水 기운이 더해져 냉각 주의. ⚠️';
        else johuYText='🙂 보통 수준의 조후입니다.';
      }
      var ukbuYText='';
      if(jg&&jg.isJong){
        ukbuYText=ygd.e===jg.dominant||yzd.e===jg.dominant?'🌀 종격 강화의 해 — 집중하면 최고의 성과!':'🙂 종격 중립의 해';
      }else if(pw){
        var hasY=pw.yongshin.indexOf(ygd.e)>=0||pw.yongshin.indexOf(yzd.e)>=0;
        var hasK=pw.kijishin.indexOf(ygd.e)>=0||pw.kijishin.indexOf(yzd.e)>=0;
        ukbuYText=hasY?'✅ <span class="notranslate">용신운</span> — '+(pw.isStrong?'에너지 발산, 사회적 활약':'귀인 등장, 자존감 상승'):
          hasK?'⚠️ <span class="notranslate">기신운</span> — '+(pw.isStrong?'내실 다지는 시기':'소모 주의, 회복 우선'):'🙂 중립운';
      }
      if(yEv.hasChungBonus){
        var ybText = yEv.chungBonusText ? yEv.chungBonusText : '흉신 파기(沖) 발복!';
        ukbuYText += '<br><span style="color:#E65100;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ybText + '</span>';
      }
      if(yEv.hasChungPenalty){
        var ypText = yEv.chungPenaltyText ? yEv.chungPenaltyText : '용신 파손(沖) 주의!';
        ukbuYText += '<br><span style="color:#D32F2F;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ypText + '</span>';
      }

      yearHTML+='<div class="year-row" onclick="toggleYear(this, event)">'+
        '<div class="year-top">'+
        '<div style="flex:1">'+
        '<div class="year-title">'+yr+'년 · '+yg2+yz2+' <span style="font-size:.78rem;color:#999;font-weight:400">('+ygd.n+' '+yzd.a+')</span></div>'+
        '<span class="luck-badge '+(yEv.score>=80?'lb-best':yEv.score>=60?'lb-good':yEv.score>=40?'lb-ok':'lb-bad')+'">'+yEv.label+'</span></div>'+
        '<span style="color:var(--pink-l);font-size:1rem">▼</span></div>'+
        '<div class="year-sub">'+
        '<div class="yr-section"><div class="yr-label">⚖️ 억부 판단</div><div class="yr-content">'+ukbuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🌡️ 조후 분석</div><div class="yr-content">'+johuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💘 연애운</div><div class="yr-content">'+yGaeun.love+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💰 재물운</div><div class="yr-content">'+yGaeun.wealth+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">👥 인간관계</div><div class="yr-content">'+yGaeun.relationship+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💼 커리어운</div><div class="yr-content">'+yGaeun.career+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🏥 건강 조언</div><div class="yr-content">'+yGaeun.health+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🌈 개운법</div><div class="yr-content">'+yGaeun.lifestyle+'</div></div>'+
        '</div></div>';
    }catch(e){console.error(yr+'년 오류',e);}
  }
  document.getElementById('yearList').innerHTML=yearHTML;

  // 모바일 드래그(스크롤) vs 탭 구별: touchstart/touchmove/touchend 위임
  (function(){
    var list = document.getElementById('yearList');
    if(!list || list._touchBound) return;
    list._touchBound = true;
    var _startY = 0;
    list.addEventListener('touchstart', function(e){
      var row = e.target.closest('.year-row');
      if(row){ row._touchMoved = false; _startY = e.touches[0].clientY; }
    }, {passive:true});
    list.addEventListener('touchmove', function(e){
      var row = e.target.closest('.year-row');
      if(row && Math.abs(e.touches[0].clientY - _startY) > 8) row._touchMoved = true;
    }, {passive:true});
  })();
}

function updateSajuTime() {
  // birthHour 또는 birthMinute 변경 시 호출되는 함수
  // 시간/분 선택 변경만 감지하고 자동 계산은 하지 않음
  try {
    var h = document.getElementById('birthHour');
    var m = document.getElementById('birthMinute');
    if (h && m) {
      console.log('[saju] 시간 업데이트: ' + (h.value || '00') + ':' + (m.value || '00'));
    }
  } catch(e) {
    console.error('[saju] updateSajuTime 오류:', e);
  }
}

function toggleYear(el, event){
  if(event) {
    // 모바일에서 스크롤 제스처와 충돌 방지
    if(event.target.closest('.year-sub')) return;
    // 터치 시작 위치 기록이 있으면 드래그로 판단해 무시
    if(el._touchMoved) { el._touchMoved = false; return; }
  }
  var sub = el.querySelector('.year-sub');
  if(!sub) return;
  var isOpen = el.classList.contains('open');
  if(isOpen){
    // 닫기: 현재 실제 높이를 먼저 확정(transition 없이)한 후 0으로
    sub.style.maxHeight = sub.scrollHeight + 'px';
    sub.offsetHeight; // reflow 강제
    sub.style.maxHeight = '0';
    el.classList.remove('open');
  } else {
    // 열기: 실제 scrollHeight로 설정
    el.classList.add('open');
    sub.style.maxHeight = sub.scrollHeight + 'px';
    // 트랜지션 완료 후 auto로 풀어줘서 내부 동적 변경에 대응
    sub.addEventListener('transitionend', function onEnd(){
      if(el.classList.contains('open')) sub.style.maxHeight = 'none';
      sub.removeEventListener('transitionend', onEnd);
    });
  }
}

/* ══════════════════════════════════════════
   📈 인생 길흉 그래프
══════════════════════════════════════════ */
function renderLifeGraph(bazi){
  var canvas=document.getElementById('lifeGraphCanvas');
  if(!canvas)return;
  var wrap=document.getElementById('lifeGraphWrap');
  var W=wrap?Math.max(wrap.clientWidth-20, 320):340;
  canvas.width=W;canvas.height=180;
  var ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,180);

  var points=[];
  try{
    var yun=bazi.getYun(GENDER==='M'?1:0);
    var list=yun.getDaYun();
    list.forEach(function(dw,idx){
      if(idx===0)return;
      var gz=dw.getGanZhi();if(!gz||gz.length<2)return;
      var age=dw.getStartAge();
      if(!age||age<=0)return;
      var evData=evalDaewun(gz[0],gz[1]);
      points.push({age:age,score:evData.score,g:gz[0],j:gz[1],summary:evData.evalSummary});
    });
  }catch(e){return;}
  if(points.length<2)return;

  var nowAge=CURRENT_AGE||30;

  for(var i=1; i<points.length; i++) {
    var diff = points[i].score - points[i-1].score;
    if(diff > 40) points[i].score = points[i-1].score + 40;
    else if(diff < -40) points[i].score = points[i-1].score - 40;
  }

  var PAD_L=36,PAD_R=16,PAD_T=18,PAD_B=32;
  var gW=W-PAD_L-PAD_R;
  var gH=180-PAD_T-PAD_B;
  var maxAge=points[points.length-1].age+10;
  var minAge=0;
  var minScore=0,maxScore=100;

  function xOf(age){return PAD_L+((age-minAge)/(maxAge-minAge))*gW;}
  function yOf(s){return PAD_T+((maxScore-s)/(maxScore-minScore))*gH;}

  ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=1;
  ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(PAD_L,yOf(50));ctx.lineTo(W-PAD_R,yOf(50));ctx.stroke();
  ctx.setLineDash([]);

  function catmullToBezier(pts){
    var segs=[];
    for(var i=0;i<pts.length-1;i++){
      var p0=pts[Math.max(i-1,0)];
      var p1=pts[i];
      var p2=pts[i+1];
      var p3=pts[Math.min(i+2,pts.length-1)];
      var cp1x=p1.x+(p2.x-p0.x)/6;
      var cp1y=p1.y+(p2.y-p0.y)/6;
      var cp2x=p2.x-(p3.x-p1.x)/6;
      var cp2y=p2.y-(p3.y-p1.y)/6;
      segs.push({x1:cp1x,y1:cp1y,x2:cp2x,y2:cp2y,ex:p2.x,ey:p2.y});
    }
    return segs;
  }

  var gPts=[{x:xOf(minAge),y:yOf(50)}];
  points.forEach(function(pt){
    gPts.push({x:xOf(pt.age),y:yOf(pt.score),score:pt.score,age:pt.age,g:pt.g,j:pt.j});
  });
  gPts.push({x:xOf(maxAge),y:yOf(50)});

  var segs=catmullToBezier(gPts);

  function drawFill(isPositive){
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(gPts[0].x,yOf(50));
    segs.forEach(function(s,i){
      if(i===0)ctx.moveTo(gPts[0].x,gPts[0].y);
      ctx.bezierCurveTo(s.x1,s.y1,s.x2,s.y2,s.ex,s.ey);
    });
    ctx.lineTo(gPts[gPts.length-1].x,yOf(50));
    ctx.closePath();
    if(isPositive){
      ctx.rect(PAD_L,PAD_T,gW,yOf(50)-PAD_T);// clip to top half
      var g=ctx.createLinearGradient(0,PAD_T,0,yOf(50));
      g.addColorStop(0,'rgba(76,175,80,.45)');g.addColorStop(1,'rgba(76,175,80,.04)');
      ctx.fillStyle=g;
    }else{
      ctx.rect(PAD_L,yOf(50),gW,gH-(yOf(50)-PAD_T));
      var g2=ctx.createLinearGradient(0,yOf(50),0,PAD_T+gH);
      g2.addColorStop(0,'rgba(229,57,53,.04)');g2.addColorStop(1,'rgba(229,57,53,.38)');
      ctx.fillStyle=g2;
    }
    ctx.fill();
    ctx.restore();
  }
  drawFill(true);drawFill(false);

  var strokeG=ctx.createLinearGradient(PAD_L,0,W-PAD_R,0);
  points.forEach(function(pt,i){
    var r=i/(points.length-1);
    var s=pt.score;
    // 종格: 더 명확한 길흉 색깔 구분
    var col=s>=80?'#FFD700':s>=65?'#4CAF50':s>=50?'#8BC34A':s>=35?'#FF8BA7':'#E53935';
    strokeG.addColorStop(r,col);
  });
  ctx.strokeStyle=strokeG;
  ctx.lineWidth=2.5;
  ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(gPts[0].x,gPts[0].y);
  segs.forEach(function(s){
    ctx.bezierCurveTo(s.x1,s.y1,s.x2,s.y2,s.ex,s.ey);
  });
  ctx.stroke();

  // 종格/가종格은 용신 대운 시 색깔 강조
  var isJongActive = G_JONG && G_JONG.isJong;
  points.forEach(function(pt,i){
    var s=pt.score;
    // 길운: 금빛·초록 계열 / 흉운: 적색 계열
    var col, outerR=5;
    if(s>=85){col='#FFD700';outerR=7;}       // 대길: 금빛
    else if(s>=70){col='#4CAF50';outerR=6;}  // 길: 초록
    else if(s>=55){col='#66BB6A';}           // 소길: 연초록
    else if(s>=45){col='#BDBDBD';}           // 평: 회색
    else if(s>=30){col='#FF7043';}           // 주의: 주황-적
    else{col='#E53935';outerR=6;}            // 흉: 진적색
    ctx.beginPath();
    ctx.arc(xOf(pt.age),yOf(s),outerR,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.fill();
    ctx.strokeStyle=col;ctx.lineWidth=s>=70||s<30?2.5:2;ctx.stroke();
    // 종格 대길운에 후광 효과
    if(isJongActive && s>=80){
      ctx.beginPath();
      ctx.arc(xOf(pt.age),yOf(s),outerR+4,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,215,0,0.35)';ctx.lineWidth=3;ctx.stroke();
    }
  });

  if(nowAge>=minAge&&nowAge<=maxAge){
    var cx=xOf(nowAge);
    ctx.save();
    ctx.strokeStyle='rgba(123,31,162,.7)';ctx.lineWidth=2;
    ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(cx,PAD_T);ctx.lineTo(cx,PAD_T+gH);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#7B1FA2';
    ctx.font='bold 10px sans-serif';ctx.textAlign='center';
    ctx.fillText('현재',cx,PAD_T-5);
    ctx.restore();
  }

  ctx.fillStyle='#bbb';ctx.font='10px sans-serif';ctx.textAlign='center';
  points.forEach(function(pt){
    ctx.fillText(pt.age+'세',xOf(pt.age),PAD_T+gH+14);
  });

  ctx.textAlign='right';
  ctx.fillText('길',PAD_L-4,yOf(80));
  ctx.fillText('흉',PAD_L-4,yOf(20));

  canvas.onmousemove=canvas.ontouchmove=function(e){
    var rect=canvas.getBoundingClientRect();
    var scaleX=canvas.width/rect.width;
    var mx=(e.clientX?e.clientX:e.touches[0].clientX)-rect.left;
    mx*=scaleX;
    var closest=null,minDist=9999;
    points.forEach(function(pt){
      var d=Math.abs(xOf(pt.age)-mx);
      if(d<minDist){minDist=d;closest=pt;}
    });
    var tip=document.getElementById('graphTooltip');
    if(closest&&minDist<30&&tip){
      var s=closest.score;
      var label=s>=80?'🌟 대길운':s>=60?'😊 길운':s>=40?'🙂 중립':s>=20?'⚠️ 주의':'🌧️ 역경';
      tip.style.display='block';
      tip.style.left=(xOf(closest.age)/scaleX-70)+'px';
      tip.style.top=(yOf(s)/180*130-10)+'px';
      tip.style.whiteSpace='nowrap';
      tip.innerHTML='<div style="font-weight:bold;color:#fff;margin-bottom:4px;font-size:0.9rem;">'+closest.age+'세~ '+closest.g+closest.j+'</div>'+
                    '<div style="color:#FFD700;font-size:0.85rem;font-weight:600;">'+label+'</div>'+
                    '<div style="font-size:0.75rem;color:#ddd;margin-top:6px;line-height:1.3;border-top:1px solid rgba(255,255,255,0.2);padding-top:4px;">'+(closest.summary||'')+'</div>';
    }
  };
  canvas.onmouseleave=function(){
    var tip=document.getElementById('graphTooltip');if(tip)tip.style.display='none';
  };

  canvas.onclick=function(e){
    var rect=canvas.getBoundingClientRect();
    var scaleX=canvas.width/rect.width;
    var mx=(e.clientX-rect.left)*scaleX;
    var closest=null,minDist=9999;
    points.forEach(function(pt){
      var d=Math.abs(xOf(pt.age)-mx);
      if(d<minDist){minDist=d;closest=pt;}
    });
    if(closest&&minDist<35){
      var ev=evalDaewun(closest.g,closest.j);
      showDwDetail(closest.age,closest.g,closest.j,ev.label,ev.score);
      setTimeout(function(){
        var dw=document.getElementById('dwDetail');
        if(dw)dw.scrollIntoView({behavior:'smooth',block:'nearest'});
      },150);
    }
  };
  // 모바일 터치 지원 (passive:true — 스크롤 차단 없음, tap 판별)
  var _dwTouchStartX=0,_dwTouchStartY=0;
  canvas.addEventListener('touchstart',function(e){
    _dwTouchStartX=e.touches[0].clientX;
    _dwTouchStartY=e.touches[0].clientY;
  },{passive:true});
  canvas.addEventListener('touchend',function(e){
    var dx=Math.abs(e.changedTouches[0].clientX-_dwTouchStartX);
    var dy=Math.abs(e.changedTouches[0].clientY-_dwTouchStartY);
    if(dx>10||dy>10) return; // 스크롤 동작이면 무시
    var tip=document.getElementById('graphTooltip');if(tip)tip.style.display='none';
    var rect=canvas.getBoundingClientRect();
    var scaleX=canvas.width/rect.width;
    var tx=(e.changedTouches[0].clientX-rect.left)*scaleX;
    var closest=null,minDist=9999;
    points.forEach(function(pt){
      var d=Math.abs(xOf(pt.age)-tx);
      if(d<minDist){minDist=d;closest=pt;}
    });
    if(closest&&minDist<45){
      var ev=evalDaewun(closest.g,closest.j);
      showDwDetail(closest.age,closest.g,closest.j,ev.label,ev.score);
      setTimeout(function(){
        var dw=document.getElementById('dwDetail');
        if(dw)dw.scrollIntoView({behavior:'smooth',block:'nearest'});
      },150);
    }
  },{passive:true});
}

/* ══════════════════════════════════════════
   ✨ 나와 비슷한 연예인 찾기
══════════════════════════════════════════ */
var __similarCelebCache = new Map();

function getSimilarCelebCacheKey(p) {
  if (!p || !p.y || !p.m || !p.d || !p.h) return 'none';
  return [
    p.y.g, p.y.j,
    p.m.g, p.m.j,
    p.d.g, p.d.j,
    p.h.g, p.h.j
  ].join('|');
}

function renderSimilarCelebScores(card, resultArea, scores) {
  scores.sort(function(a, b){ return b.score - a.score; });
  var top3 = scores.slice(0, 3);

  if(top3.length === 0 || top3[0].score < 20){
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  var html = '<div style="font-size:0.85rem; color:#666; margin-bottom:12px;">사주의 핵심인 일간, 일지, 월지 및 전체 글자 구성을 분석하여 가장 비슷한 에너지를 가진 연예인을 찾았습니다.</div>';
  html += '<div class="sim-celeb-list">';

  top3.forEach(function(item, idx){
    var rankCls = 'sim-rank-' + (idx + 1);
    var pct = item.score;

    html += '<div class="sim-celeb-item">';
    html += '  <div class="sim-celeb-info">';
    html += '    <div class="sim-celeb-name"><span class="sim-rank '+rankCls+'">'+(idx+1)+'</span> '+item.celeb.name+' <span class="sim-celeb-cat">'+item.celeb.cat+'</span></div>';
    html += '    <div class="sim-celeb-matches">'+item.matches.join(', ')+'</div>';
    html += '  </div>';
    html += '  <div class="sim-celeb-score">';
    html += '    <div class="sim-score-val">'+pct+'%</div>';
    html += '    <div class="sim-score-bar-bg"><div class="sim-score-bar-fill" style="width:'+pct+'%"></div></div>';
    html += '  </div>';
    html += '</div>';
  });

  html += '</div>';
  resultArea.innerHTML = html;
}

function findSimilarCelebs(p){
  var card = document.getElementById('similarCelebCard');
  var resultArea = document.getElementById('similarCelebResult');
  if(!card || !resultArea) return;

  var cacheKey = getSimilarCelebCacheKey(p);
  if (__similarCelebCache.has(cacheKey)) {
    renderSimilarCelebScores(card, resultArea, __similarCelebCache.get(cacheKey));
    return;
  }

  var myGans = [p.y.g, p.m.g, p.d.g, p.h.g];
  var myZhis = [p.y.j, p.m.j, p.d.j, p.h.j];
  var myDayGan = p.d.g;
  var myDayZhi = p.d.j;
  var myMonthZhi = p.m.j;

  var scores = [];

  var idx = 0;
  var BATCH_SIZE = 60;

  function processCeleb(c) {
    var parts = c.birth.split('-').map(Number);
    var year = parts[0], month = parts[1], day = parts[2];
    var hour = c.hour !== undefined ? c.hour : 12;
    var minute = c.minute !== undefined ? c.minute : 0;

    try {
      var solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
      var bazi = solar.getLunar().getEightChar();
      
      try {
        var _sj = KasiEngine.getGanji(new Date(year, month-1, day, hour, minute)); 
        if(_sj && _sj.secha && _sj.weolgeon && _sj.iljin) {
            bazi.getYearGan = function() { return _sj.secha[0]; };
            bazi.getYearZhi = function() { return _sj.secha[1]; };
            bazi.getMonthGan = function() { return _sj.weolgeon[0]; };
            bazi.getMonthZhi = function() { return _sj.weolgeon[1]; };
            bazi.getDayGan = function() { return _sj.iljin[0]; };
            bazi.getDayZhi = function() { return _sj.iljin[1]; };
        }
      } catch(e) {}

      var cg = [bazi.getYearGan(), bazi.getMonthGan(), bazi.getDayGan(), bazi.getTimeGan()];
      var cz = [bazi.getYearZhi(), bazi.getMonthZhi(), bazi.getDayZhi(), bazi.getTimeZhi()];
      
      var score = 0;
      var matches = [];

      if(myDayGan === cg[2]){
        score += 25;
        matches.push('일간('+myDayGan+') 일치');
      } else if (GAN[myDayGan] && GAN[cg[2]] && GAN[myDayGan].e === GAN[cg[2]].e) {
        score += 10; // 오행만 같음
        matches.push('일간 오행('+EL_K[GAN[myDayGan].e]+') 일치');
      }

      if(myDayZhi === cz[2]){
        score += 15;
        matches.push('일지('+myDayZhi+') 일치');
      }

      if(myMonthZhi === cz[1]){
        score += 15;
        matches.push('월지('+myMonthZhi+') 일치');
      }

      var myAll = myGans.concat(myZhis);
      var cAll = cg.concat(cz);
      var matchCount = 0;

      var tempCAll = cAll.slice();
      myAll.forEach(function(char){
        if(!char) return;
        var idx = tempCAll.indexOf(char);
        if(idx !== -1){
          matchCount++;
          tempCAll.splice(idx, 1);
        }
      });

      var extraMatches = matchCount;
      if(myDayGan === cg[2]) extraMatches--;
      if(myDayZhi === cz[2]) extraMatches--;
      if(myMonthZhi === cz[1]) extraMatches--;

      if(extraMatches > 0){
        score += (extraMatches * 3);
        matches.push(extraMatches+'개 글자 추가 일치');
      }

      score = Math.min(70, score);

      if(score > 0){
        scores.push({
          celeb: c,
          score: score,
          matches: matches
        });
      }
    } catch(e) {}
  }

  function runBatch() {
    var end = Math.min(idx + BATCH_SIZE, CELEBS.length);
    for (; idx < end; idx++) {
      processCeleb(CELEBS[idx]);
    }

    if (idx < CELEBS.length) {
      setTimeout(runBatch, 0);
      return;
    }

    __similarCelebCache.set(cacheKey, scores.slice());
    renderSimilarCelebScores(card, resultArea, scores);
  }

  runBatch();
}

/* ══════════════════════════════════════════
   💀 요주의 빌런 블랙리스트 렌더
══════════════════════════════════════════ */
function renderVillain(p, power) {
  var card = document.getElementById('villainCard');
  var resultArea = document.getElementById('villainResult');
  if(!card || !resultArea) return;

  if(!power || !power.kijishin || power.kijishin.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  var myDayGan = p.d.g;
  var myDayZhi = p.d.j;
  var badElementEng = power.kijishin[0]; // 기신 오행 (예: 'wood', 'fire', 'earth', 'metal', 'water')
  
  var engToKor = {
    'wood': '목', 'fire': '화', 'earth': '토', 'metal': '금', 'water': '수'
  };
  var badElement = engToKor[badElementEng];

  var elements = ['목', '화', '토', '금', '수'];
  var ganToElement = {
    '갑':'목', '을':'목', '병':'화', '정':'화', '무':'토', '기':'토', '경':'금', '신':'금', '임':'수', '계':'수'
  };
  var myElement = ganToElement[myDayGan];
  
  var myGanIdx = elements.indexOf(myElement);
  var badIdx = elements.indexOf(badElement);
  
  var diff = (badIdx - myGanIdx + 5) % 5;
  var badTenGod = '';
  if(diff === 0) badTenGod = '비겁';
  else if(diff === 1) badTenGod = '식상';
  else if(diff === 2) badTenGod = '재성';
  else if(diff === 3) badTenGod = '관성';
  else if(diff === 4) badTenGod = '인성';

  var appearanceMap = {
    '목': '뻣뻣하고 고집스러워 보이는 인상, 마르고 길쭉한 체형, 묘하게 신경질적인 분위기',
    '화': '다혈질적이고 눈빛이 매서운 인상, 화려하거나 튀는 옷차림, 감정 기복이 심해 보이는 분위기',
    '토': '무뚝뚝하고 속을 알 수 없는 인상, 체격이 크거나 둔해 보이는 체형, 고지식하고 답답한 분위기',
    '금': '차갑고 날카로운 인상, 창백하거나 각진 얼굴, 찔러도 피 한 방울 안 나올 것 같은 냉혹한 분위기',
    '수': '음침하고 속을 알 수 없는 인상, 유연하지만 어딘가 음흉해 보이는 체형, 비밀이 많아 보이는 분위기'
  };

  var behaviorMap = {
    '비겁': '내 것을 빼앗으려 들거나, 사사건건 경쟁심을 유발하며 피곤하게 만드는 유형',
    '식상': '말로 상처를 주거나, 내 계획을 산만하게 만들고 구설수를 일으키는 유형',
    '재성': '돈 문제로 얽히거나, 물질적인 손해를 입히고 나의 결과를 가로채는 유형',
    '관성': '억압하고 통제하려 들거나, 부당한 스트레스와 책임감을 강요하는 유형',
    '인성': '지나친 간섭과 잔소리로 피곤하게 하거나, 나를 게으르고 의존적으로 만드는 유형'
  };

  var defenseMap = {
    '비겁': '적당한 거리두기가 필수입니다. 내 패를 다 보여주지 말고, 불필요한 경쟁은 피하세요.',
    '식상': '말려들지 마세요. 상대의 도발에 감정적으로 대응하지 말고 침묵으로 일관하는 것이 상책입니다.',
    '재성': '금전 거래는 절대 금물입니다. 공과 사를 명확히 구분하고, 내 몫은 확실히 챙기세요.',
    '관성': '부당한 요구에는 단호하게 "No"라고 말하는 연습이 필요합니다. 나만의 바운더리를 지키세요.',
    '인성': '독립심을 키워야 합니다. 상대의 호의를 가장한 간섭을 끊어내고 스스로 결정하세요.'
  };

  var factBombMap = {
    '비겁': '네가 만만해 보이니까 자꾸 선 넘는 거야. 착한 아이 콤플렉스 좀 버려.',
    '식상': '상대방 말에 일일이 상처받지 마. 걔네는 그냥 입이 가벼운 것뿐이야. 무시가 답이야.',
    '재성': '돈 잃고 사람 잃기 딱 좋은 호구 관상이야. 제발 돈 빌려주지 마.',
    '관성': '왜 자꾸 남 눈치만 봐? 네 인생인데 왜 남이 조종하게 놔두냐고. 정신 차려.',
    '인성': '언제까지 남한테 의지할래? 네가 스스로 안 서면 평생 휘둘리다 끝날 거야.'
  };

  var wonjinMap = {'子':'未', '丑':'午', '寅':'酉', '卯':'申', '辰':'亥', '巳':'戌', '午':'丑', '未':'子', '申':'卯', '酉':'寅', '戌':'巳', '亥':'辰'};
  var chongMap = {'子':'午', '丑':'未', '寅':'申', '卯':'酉', '辰':'戌', '巳':'亥', '午':'子', '未':'丑', '申':'寅', '酉':'卯', '戌':'辰', '亥':'巳'};
  var zhiToAnimal = {'子':'쥐', '丑':'소', '寅':'호랑이', '卯':'토끼', '辰':'용', '巳':'뱀', '午':'말', '未':'양', '申':'원숭이', '酉':'닭', '戌':'개', '亥':'돼지'};

  var wonjinDescMap = {
    '子': '서생원(쥐)이 양의 뿔을 싫어함',
    '未': '서생원(쥐)이 양의 뿔을 싫어함',
    '丑': '부지런한 소가 노는 말을 싫어함',
    '午': '부지런한 소가 노는 말을 싫어함',
    '寅': '호랑이는 닭의 울음소리를 싫어함',
    '酉': '호랑이는 닭의 울음소리를 싫어함',
    '卯': '토끼는 원숭이의 빨간 엉덩이를 싫어함',
    '申': '토끼는 원숭이의 빨간 엉덩이를 싫어함',
    '辰': '용은 돼지의 코가 자기와 닮아 싫어함',
    '亥': '용은 돼지의 코가 자기와 닮아 싫어함',
    '巳': '뱀은 개 짖는 소리에 깜짝 놀라 싫어함',
    '戌': '뱀은 개 짖는 소리에 깜짝 놀라 싫어함'
  };

  var wonjinZhi = wonjinMap[myDayZhi];
  var chongZhi = chongMap[myDayZhi];
  var wonjinAnimal = zhiToAnimal[wonjinZhi];
  var chongAnimal = zhiToAnimal[chongZhi];

  var stars = [p.y.g, p.y.j, p.m.g, p.m.j, p.d.j, p.h.g, p.h.j]
    .map(function(c) { return getTenGod(myDayGan, c); })
    .filter(function(t) { return t && t !== '?'; });
  var groupMap = {
    '비견': '비겁', '겁재': '비겁',
    '식신': '식상', '상관': '식상',
    '정재': '재성', '편재': '재성',
    '정관': '관성', '편관': '관성',
    '정인': '인성', '편인': '인성'
  };
  var tgCount = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  stars.forEach(function(s) {
    var g = groupMap[s];
    if (g) tgCount[g] += 1;
  });
  var dominantGroup = Object.keys(tgCount).reduce(function(prev, cur) {
    return tgCount[cur] > tgCount[prev] ? cur : prev;
  }, '비겁');
  var weakPointGroup = Object.keys(tgCount).reduce(function(prev, cur) {
    return tgCount[cur] < tgCount[prev] ? cur : prev;
  }, '비겁');
  var powerTone = power && power.isStrong
    ? '신강 흐름이라 상대 압박을 버티는 힘은 충분하지만, 고집 대 고집으로 붙으면 갈등이 장기전으로 번질 수 있습니다.'
    : '신약 흐름이라 관계 피로를 몸으로 먼저 받기 쉬워, 초반 경계선 설정이 특히 중요합니다.';

  var villainProfileMap = {
    '비겁': {
      tier: 'A+ 동급자 침투형',
      codename: 'MIRROR JACKER',
      shortDesc: '당신과 비슷한 결로 접근해 신뢰를 얻고, 성과와 에너지를 슬쩍 가져가는 타입',
      strategy: '정보를 단계별로 공개하고, 역할·책임·성과 귀속을 문서/메모로 남기세요.'
    },
    '식상': {
      tier: 'A급 여론 교란형',
      codename: 'NOISE CUTTER',
      shortDesc: '말과 분위기로 흐름을 흐리고, 당신의 집중력을 무너뜨리는 타입',
      strategy: '즉답 대신 기록 후 답변 원칙을 사용하고, 논쟁이 아닌 기준표로 대화하세요.'
    },
    '재성': {
      tier: 'A+ 손익 흡혈형',
      codename: 'DRAIN BROKER',
      shortDesc: '돈/자원/기회를 매개로 들어와 당신의 손익 밸런스를 깨는 타입',
      strategy: '금전·계약·공동지출은 분리하고, 계좌/증빙/한도 기준을 미리 고정하세요.'
    },
    '관성': {
      tier: 'A+ 통제 압박형',
      codename: 'IRON FRAME',
      shortDesc: '권위, 규칙, 죄책감을 이용해 당신의 선택권을 빼앗는 타입',
      strategy: '요청의 정당성·기한·범위를 재확인하고, 부당 요구는 짧고 단호하게 거절하세요.'
    },
    '인성': {
      tier: 'A급 보호자 위장형',
      codename: 'VELVET LEASH',
      shortDesc: '도움과 조언의 얼굴로 다가와 당신의 자율성과 판단력을 약화시키는 타입',
      strategy: '결정권은 항상 본인에게 두고, 조언은 참고만 하되 최종 선택은 스스로 하세요.'
    }
  };

  var profile = villainProfileMap[badTenGod] || villainProfileMap['관성'];
  var yeoniAdviceMap = {
    '비겁': '내 편/네 편 구도를 만들기보다, 역할과 책임을 먼저 분리하면 불필요한 경쟁이 줄어들어요.',
    '식상': '감정적인 반박보다 사실 확인 질문을 먼저 던지면, 말의 주도권을 다시 가져올 수 있어요.',
    '재성': '호의성 지출과 의무 지출을 분리해 적어두면, 금전 소모 패턴을 깔끔하게 끊어낼 수 있어요.',
    '관성': '상대 권위가 커 보일수록 요청 범위를 문장으로 다시 확인해 스스로를 보호하세요.',
    '인성': '도움받는 것과 의존하는 것은 달라요. 결정 전 마지막 선택권은 반드시 내가 가져가야 해요.'
  };
  var ssambaAdviceMap = {
    '비겁': '성과는 숫자로 남겨. 증거 없는 호의는 결국 네 몫을 깎아먹는다.',
    '식상': '말싸움은 체력전이다. 상대 페이스 말고 네 기준표로 판을 바꿔.',
    '재성': '돈 얘기 흐리는 순간 게임 끝. 한도, 기한, 증빙 없으면 바로 스톱.',
    '관성': '압박은 통할 때만 세진다. 짧고 단호한 거절 한 번이 판을 바꾼다.',
    '인성': '친절한 통제에 길들면 네 선택근육이 죽는다. 스스로 결정해.'
  };
  var riskTimingMap = {
    '비겁': '성과 발표 직전, 역할 조정 시점, 협업 초반 신뢰 형성 구간',
    '식상': '회의 후반 피로 구간, 메신저 공방, 공개 코멘트가 많은 날',
    '재성': '정산 주기, 공동구매/투자 제안, 급한 송금 요청이 들어올 때',
    '관성': '마감 직전, 보고 라인 변경, 책임소재가 모호해지는 시점',
    '인성': '이직/변화기, 컨디션 저하 시기, 결정 피로가 누적된 주간'
  };
  var analysisSummary = '내 사주 기준 십성 분포는 비겁 ' + tgCount.비겁 + ' · 식상 ' + tgCount.식상 + ' · 재성 ' + tgCount.재성 + ' · 관성 ' + tgCount.관성 + ' · 인성 ' + tgCount.인성 + '입니다. '
    + '핵심 축은 ' + dominantGroup + '이고, 취약 축은 ' + weakPointGroup + '입니다. '
    + '현재 빌런 축인 ' + badTenGod + '이 자극되면 감정 소모와 의사결정 피로가 함께 증가할 수 있습니다.';

  var checklistItems = [
    '관계 초반부터 금전/업무/감정 경계를 문장으로 명확히 해두었다.',
    '갈등 상황에서 즉답보다 기록(메모/문자) 후 답변 원칙을 지키고 있다.',
    '부당한 부탁을 받으면 이유를 길게 설명하지 않고 짧게 거절할 수 있다.',
    '연락 주기와 만남 빈도를 내 컨디션 기준으로 조절하고 있다.',
    '소모 신호(수면저하·예민함·불안)가 오면 즉시 거리두기 루틴을 실행한다.'
  ];

  var checklistHtml = checklistItems.map(function(item, idx) {
    return '<label class="villain-check-item" for="villainChk' + idx + '">' 
      + '<input type="checkbox" class="villain-check-input" id="villainChk' + idx + '">'
      + '<span class="villain-check-text">' + item + '</span>'
      + '</label>';
  }).join('');

  var html = ''
    + '<div class="villain-container villain-container--a-grade">'
    + '  <div class="villain-header">'
    + '    <div class="villain-shadow-box villain-silhouette-stage">'
    + '      <div class="villain-aura"></div>'
    + '      <div class="villain-shadow"></div>'
    + '      <div class="villain-silhouette-core"></div>'
    + '    </div>'
    + '    <div class="villain-title-area">'
    + '      <div class="villain-grade">위험 등급: ' + profile.tier + '</div>'
    + '      <h3 class="villain-name">코드네임: ' + profile.codename + ' · ' + badElement + badTenGod + ' 빌런</h3>'
    + '      <p class="villain-subcopy">' + profile.shortDesc + '</p>'
    + '    </div>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">👁️ 몽타주/분위기 프로파일</div>'
    + '    <p class="villain-text">' + appearanceMap[badElement] + '</p>'
    + '  </div>'

    + '  <div class="villain-section red-flag">'
    + '    <div class="villain-section-title">🚩 작동 패턴 (레드 플래그)</div>'
    + '    <p class="villain-text">' + behaviorMap[badTenGod] + '</p>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">🎯 충돌 리스크 (원진/충)</div>'
    + '    <p class="villain-text">특히 <b>' + wonjinAnimal + '띠</b>, <b>' + chongAnimal + '띠</b>와 결이 맞아떨어질 때 갈등 피로도가 급상승할 수 있습니다.</p>'
    + '    <p class="villain-text" style="margin-top:8px;font-size:0.85rem;color:#ff9ea8;">※ 원진(怨嗔): ' + wonjinDescMap[myDayZhi] + '</p>'
    + '  </div>'

    + '  <div class="villain-section defense">'
    + '    <div class="villain-section-title">🛡️ 실전 방어 가이드</div>'
    + '    <p class="villain-text">' + defenseMap[badTenGod] + '</p>'
    + '    <p class="villain-text" style="margin-top:8px;color:#c4b5fd;">+ A급 대응 포인트: ' + profile.strategy + '</p>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">🧠 사주 기반 리스크 해설</div>'
    + '    <p class="villain-text">' + analysisSummary + '</p>'
    + '    <p class="villain-text" style="margin-top:8px;color:#cbd5e1;">' + powerTone + '</p>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">⏱️ 충돌 트리거 타이밍</div>'
    + '    <p class="villain-text">' + riskTimingMap[badTenGod] + '에 경계가 흐려지기 쉽습니다. 이 구간에는 답변 지연·기준 재확인·문서화 3단계를 우선 적용하세요.</p>'
    + '  </div>'

    + '  <div class="villain-fact-bomb"><p>"' + factBombMap[badTenGod] + '"</p></div>'

    + '  <div class="villain-checklist-wrap">'
    + '    <div class="villain-section-title">✅ A급 빌런 대처 체크리스트 (자가 진단 5문항)</div>'
    + '    <div class="villain-checklist">' + checklistHtml + '</div>'
    + '    <button type="button" class="villain-submit-btn" id="villainChecklistSubmit">제출하기 (결과 보기)</button>'
    + '    <div class="villain-feedback" id="villainFeedback" aria-live="polite"></div>'
    + '  </div>'

    + '  <div class="villain-quotes">'
    + '    <div class="villain-quote yeoni"><strong>👩 연이의 조언</strong><br>"' + yeoniAdviceMap[badTenGod] + '"</div>'
    + '    <div class="villain-quote neo"><strong>🕶️ 쌈바의 조언</strong><br>"' + ssambaAdviceMap[badTenGod] + '"</div>'
    + '  </div>'
    + '</div>';

  resultArea.innerHTML = html;

  var submitBtn = document.getElementById('villainChecklistSubmit');
  var feedbackEl = document.getElementById('villainFeedback');
  if (submitBtn && feedbackEl) {
    submitBtn.onclick = function() {
      var checks = resultArea.querySelectorAll('.villain-check-input');
      var checked = 0;
      checks.forEach(function(chk) { if (chk.checked) checked += 1; });

      var msg = '';
      var gradeCls = 'mid';
      if (checked >= 4) {
        gradeCls = 'good';
        msg = '훌륭한 방어태세! (' + checked + '/5) 경계선 설정과 감정 통제가 안정적입니다. 지금 페이스를 유지하세요.';
      } else if (checked >= 2) {
        gradeCls = 'mid';
        msg = '조금 더 경계가 필요함 (' + checked + '/5). 대화 기록과 거리두기 루틴을 강화하면 소모를 크게 줄일 수 있습니다.';
      } else {
        gradeCls = 'danger';
        msg = '위험! 당장 거리두기 필수 (' + checked + '/5). 연락/만남 빈도를 즉시 줄이고 금전·감정 경계부터 회복하세요.';
      }

      feedbackEl.classList.remove('is-show', 'is-good', 'is-mid', 'is-danger');
      feedbackEl.innerHTML = '<strong>진단 결과</strong><br>' + msg;
      feedbackEl.classList.add('is-show', 'is-' + gradeCls);

      // 모바일에서 피드백 박스 하단이 가려지지 않도록 안전하게 스크롤 보정
      setTimeout(async function() {
        try {
          feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_e) {}
      }, 30);
    };
  }
}

/* ══════════════════════════════════════════
   🧬 호르몬 관상 — 테토 vs 에겐
══════════════════════════════════════════ */
function calculateHormoneVibe(p, power) {
  p = p || {};
  var dg = (p.d && p.d.g) ? p.d.g : '甲';
  var slots = [
    p.y && p.y.g,
    p.y && p.y.j,
    p.m && p.m.g,
    p.m && p.m.j,
    p.d && p.d.j,
    p.h && p.h.g,
    p.h && p.h.j
  ].filter(function(c){ return !!c; });

  // 일간 제외 7개 자리에서 십성 목록
  var stars = slots
    .map(function(c) { return getTenGod(dg, c); })
    .filter(function(t) { return t && t !== '?'; });

  var cnt = {};
  stars.forEach(function(s) { cnt[s] = (cnt[s]||0)+1; });

  var bigyuk  = (cnt['비견']||0) + (cnt['겁재']||0);   // 비겁
  var siksang = (cnt['식신']||0) + (cnt['상관']||0);   // 식상
  var insung  = (cnt['정인']||0) + (cnt['편인']||0);   // 인성
  var gwansung= (cnt['정관']||0) + (cnt['편관']||0);   // 관성
  var jaesung = (cnt['정재']||0) + (cnt['편재']||0);   // 재성

  var isStrong = !!(power && power.isStrong);

  var tetoScore = 0, egenScore = 0;
  var reasons = [];

  // ── 테토 조건 ──
  if (bigyuk >= 2 && isStrong) {
    tetoScore += 40;
    reasons.push({ type:'teto', icon:'💪', text:'비겁(' + bigyuk + '개)이 뭉치고 신강 — 주도권 절대 안 넘겨' });
  } else if (bigyuk >= 1 && isStrong) {
    tetoScore += 18;
  }
  if (cnt['식신'] >= 1 && cnt['편관'] >= 1) {
    tetoScore += 32;
    reasons.push({ type:'teto', icon:'⚔️', text:'식신제살(食神制殺) 성립 — 내가 통제, 내가 주도' });
  }
  if (gwansung >= 2 && isStrong) {
    tetoScore += 28;
    reasons.push({ type:'teto', icon:'🔥', text:'관성(' + gwansung + '개) + 신강 — 압박을 즐기는 타입' });
  } else if (gwansung >= 2 && !isStrong) {
    tetoScore += 5;
  }
  if (jaesung > 0 && jaesung <= 2) {
    tetoScore += 25;
    reasons.push({ type:'teto', icon:'💎', text:'재성(' + jaesung + '개) — 찰진 현실 감각, 통제욕 높은 목표 지향 테토' });
  }
  if (isStrong) tetoScore += 8; // 신강 보너스

  // ── 에겐 조건 ──
  if (insung >= 3) {
    egenScore += 45;
    reasons.push({ type:'egen', icon:'✨', text:'인성(' + insung + '개) 한도 초과 — 수용·보살핌 에너지 폭발' });
  } else if (insung >= 2) {
    egenScore += 20;
  }
  if (siksang >= 3) {
    egenScore += 42;
    reasons.push({ type:'egen', icon:'🌸', text:'식상(' + siksang + '개) 과다 — 감성 파도가 멈추질 않아' });
  } else if (siksang >= 2) {
    egenScore += 22;
  }
  if (insung >= 2 && siksang >= 2) {
    egenScore += 12; // 인성+식상 복합 시너지
    reasons.push({ type:'egen', icon:'💫', text:'인성·식상 복합 — 섬세함과 표현욕이 동시에' });
  }
  if (jaesung >= 3) {
    egenScore += 35;
    reasons.push({ type:'egen', icon:'🎭', text:'재성(' + jaesung + '개) 과다 — 테토인 척하지만 속으론 감정에 휩쓸리는 에겐' });
  }
  if (!isStrong) egenScore += 10; // 신약 보너스

  var diff = tetoScore - egenScore;
  var result = diff >= 20 ? 'teto' : diff <= -20 ? 'egen' : 'neutral';

  return { result:result, tetoScore:tetoScore, egenScore:egenScore,
           reasons:reasons, bigyuk:bigyuk, siksang:siksang,
           insung:insung, gwansung:gwansung, jaesung:jaesung, isStrong:isStrong, cnt:cnt };
}

function renderHormoneVibe(p, power) {
  var section = document.getElementById('hormone-vibe-section');
  var target  = document.getElementById('hormoneVibeResult');
  if (!section || !target) return;
  section.style.display = 'block';
  section.style.visibility = 'visible';

  var vibe;
  try {
    vibe = calculateHormoneVibe(p || {}, power || {});
  } catch (err) {
    console.warn('HormoneVibe fallback:', err);
    vibe = {
      result: 'neutral', tetoScore: 35, egenScore: 35,
      reasons: [{ type:'egen', icon:'⚖️', text:'일부 프로필 데이터가 비어 있어 기본 밸런스 모드로 분석했습니다.' }],
      bigyuk: 0, siksang: 0, insung: 0, gwansung: 0, jaesung: 0,
      isStrong: false, cnt: {}
    };
  }

  if (!vibe || !isFinite(Number(vibe.tetoScore)) || !isFinite(Number(vibe.egenScore))) {
    vibe = {
      result: 'neutral', tetoScore: 35, egenScore: 35,
      reasons: [{ type:'egen', icon:'🧭', text:'데이터 동기화 중입니다. 새로고침 후 다시 확인하면 더 정확해집니다.' }],
      bigyuk: 0, siksang: 0, insung: 0, gwansung: 0, jaesung: 0,
      isStrong: false, cnt: {}
    };
  }
  
  var tPct = Math.round(Math.min(100, vibe.tetoScore * 1.2));
  var ePct = Math.round(Math.min(100, vibe.egenScore * 1.2));

  var autoReasons = [];
  if (vibe.tetoScore >= 60) autoReasons.push({ type:'teto', icon:'🧱', text:'테토 기본 체력 높음 — 결정 속도 빠르고 밀어붙이는 엔진이 강합니다.' });
  if (vibe.egenScore >= 60) autoReasons.push({ type:'egen', icon:'🫧', text:'에겐 감수성 상한치 근접 — 분위기·표정·말투 디테일 감지력이 높습니다.' });
  if (Math.abs(vibe.tetoScore - vibe.egenScore) <= 12) autoReasons.push({ type:'egen', icon:'⚖️', text:'테토·에겐 점수 차가 작아 상황 맞춤형 페르소나 전환이 빠른 편입니다.' });
  if (vibe.tetoScore >= 70 && vibe.egenScore >= 55) autoReasons.push({ type:'egen', icon:'🎯', text:'강하게 말해도 속은 섬세한 하이브리드 — 겉테토·속에겐 패턴이 보입니다.' });
  if (vibe.egenScore >= 70 && vibe.tetoScore >= 55) autoReasons.push({ type:'teto', icon:'🗡️', text:'다정한데 선 넘으면 칼같이 선 긋는 타입 — 겉에겐·속테토 패턴입니다.' });

  var mergedReasons = (vibe.reasons || []).concat(autoReasons).slice(0, 8);
  var reasonsHtml = mergedReasons.length
    ? mergedReasons.map(function(r) {
        return '<div class="hv-reason-item ' + (r.type === 'egen' ? 'egen-item' : '') + '">'
          + r.icon + ' ' + r.text + '</div>';
      }).join('')
    : '<div class="hv-reason-item" style="color:rgba(255,255,255,.4)">특정 조건에 집중되지 않은 균형 사주</div>';

  var statsHtml = '<div style="display:flex; justify-content:space-around; margin-bottom: 12px; background: rgba(0,0,0,0.25); border-radius:12px; padding: 12px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);">'
    + '<div class="hv-stat-box" style="background:none; padding:0; flex:1; text-shadow:0 0 10px rgba(255,107,107,0.4);"><div class="hv-stat-num" style="color:#ff6b6b; font-size:1.8rem;">🔥' + vibe.tetoScore + '</div><div class="hv-stat-label" style="letter-spacing:1px;">테토 점수</div></div>'
    + '<div style="width:1px; background:linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent); margin:0 10px;"></div>'
    + '<div class="hv-stat-box" style="background:none; padding:0; flex:1; text-shadow:0 0 10px rgba(217,128,250,0.4);"><div class="hv-stat-num" style="color:#d980fa; font-size:1.8rem;">✨' + vibe.egenScore + '</div><div class="hv-stat-label" style="letter-spacing:1px;">에겐 점수</div></div>'
    + '</div>'
    + '<div class="hv-stats-grid" style="grid-template-columns:repeat(5, 1fr); gap:8px;">'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.bigyuk  + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#f1c40f;">비겁</div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.siksang + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#e056fd;">식상</div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.jaesung + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#f39c12;">재성</div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.gwansung+ '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#e74c3c;">관성</div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.insung  + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#1abc9c;">인성</div></div>'
    + '</div>';

  var scoreGap = vibe.tetoScore - vibe.egenScore;
  var gapAbs = Math.abs(scoreGap);
  var stars = Object.keys(vibe.cnt || {}).sort(function(a, b) { return (vibe.cnt[b] || 0) - (vibe.cnt[a] || 0); });
  var starSummary = stars.length
    ? stars.slice(0, 3).map(function(s) { return s + ' ' + vibe.cnt[s] + '칸'; }).join(' · ')
    : '십성 분포가 고르게 퍼진 중립형';

  var comboTitle = '';
  var comboSummary = '';
  var comboBone = '';
  var comboLove = '';
  var comboWork = '';
  var comboTip = '';

  if (vibe.tetoScore >= 75 && vibe.egenScore >= 60) {
    comboTitle = '🔥 겉테토 · 속에겐 하이브리드';
    comboSummary = '결정은 테토처럼 빠른데, 사람 감정 로그는 에겐처럼 다 저장하는 타입입니다.';
    comboBone = '센 말 던지고 집 가서 "내가 너무 쎘나?" 복기 3회차 돌리는 패턴이 보입니다.';
    comboLove = '리드 잘하지만 디테일에 민감해서, 상대 표정 한 번에 기분이 롤러코스터를 탈 수 있습니다.';
    comboWork = '회의에서는 결론 머신, 1:1 대화에서는 공감봇. 팀에서는 꽤 희귀한 만능형입니다.';
    comboTip = '결론은 짧고 단단하게, 피드백은 부드럽고 길게 가면 승률이 급상승합니다.';
  } else if (vibe.egenScore >= 75 && vibe.tetoScore >= 60) {
    comboTitle = '✨ 겉에겐 · 속테토 하이브리드';
    comboSummary = '분위기는 부드럽지만 핵심 선 넘어오면 단칼에 정리하는 은근 강철 타입입니다.';
    comboBone = '평소엔 다 받아주다가 임계점 넘는 순간 "여기까지" 버튼을 광속으로 누릅니다.';
    comboLove = '다정함이 기본값이지만, 존중이 깨지는 순간 관계 정리 속도가 의외로 빠릅니다.';
    comboWork = '조율 능력 최상급. 다만 기준 없는 부탁을 계속 받으면 피로가 누적됩니다.';
    comboTip = '착한 사람 모드와 원칙 모드 전환 기준을 미리 말해두면 소모가 줄어듭니다.';
  } else if (vibe.result === 'teto') {
    comboTitle = '🦁 테토 우세형';
    comboSummary = '주도권, 속도, 결정력에서 강점이 뚜렷합니다. "일단 가보자" 엔진이 강합니다.';
    comboBone = '문제는 늘 해결하는데, 말투까지 해결해버리면 사람도 같이 정리될 수 있습니다.';
    comboLove = '확실한 표현과 행동으로 신뢰를 줍니다. 다만 상대의 속도도 존중해야 오래 갑니다.';
    comboWork = '난이도 높은 과제에 강합니다. 단독 돌파력은 좋지만 위임이 약하면 과부하가 옵니다.';
    comboTip = '정답 제시 전 5초 경청만 추가해도 "카리스마"가 "압박감"으로 읽히는 걸 막습니다.';
  } else if (vibe.result === 'egen') {
    comboTitle = '🌸 에겐 우세형';
    comboSummary = '공감, 분위기, 관계 센스가 뛰어난 타입입니다. 사람 마음의 변화를 빠르게 읽습니다.';
    comboBone = '배려 만렙인데, 정작 본인 배터리 잔량은 마지막 5%까지 쓰는 경향이 있습니다.';
    comboLove = '감정 결을 잘 맞춰 친밀도가 빨리 올라갑니다. 대신 과몰입 경계가 중요합니다.';
    comboWork = '협업의 윤활유 역할이 탁월합니다. 다만 우선순위가 흐려지면 성과가 분산됩니다.';
    comboTip = '공감 후 행동 한 줄(다음 액션)을 붙이면 감성과 실행력이 동시에 살아납니다.';
  } else if (vibe.tetoScore >= 50 && vibe.egenScore >= 50) {
    comboTitle = '🌀 멀티 페르소나 밸런스형';
    comboSummary = '테토·에겐 모두 높은 다재다능형입니다. 상황 따라 캐릭터 스위칭이 빠릅니다.';
    comboBone = '문제는 본인도 "지금 내가 어떤 모드인지" 헷갈리는 순간이 온다는 점입니다.';
    comboLove = '상대에게 맞춰주는 능력이 좋지만, 본인 욕구를 뒤로 미루면 피로가 누적됩니다.';
    comboWork = '중재·리딩·실행을 모두 소화합니다. 다만 기준이 없으면 다 떠안게 됩니다.';
    comboTip = '오늘의 기본 모드(테토/에겐) 하나만 정해두면 의사결정 피로가 크게 줄어듭니다.';
  } else {
    comboTitle = '🧊 저자극 관찰자형';
    comboSummary = '표현은 신중하고 반응은 절제된 타입입니다. 쉽게 흔들리지 않는 장점이 있습니다.';
    comboBone = '문제는 너무 조용해서 "아무 생각 없나?" 오해를 자주 받는다는 점입니다.';
    comboLove = '깊어지기까지 시간이 필요합니다. 대신 한번 신뢰하면 오래 갑니다.';
    comboWork = '정확도 중심으로 움직여 실수가 적습니다. 빠른 템포 환경에서는 의도 설명이 필요합니다.';
    comboTip = '생각을 끝낸 뒤 한 줄로 먼저 공유하면 존재감과 신뢰도가 동시에 올라갑니다.';
  }

  var hormoneStoryHtml = '<div style="margin-top:18px; background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.14); border-radius:12px; padding:14px; text-align:left;">'
    + '<div style="font-size:.9rem; font-weight:900; color:#f8fafc; margin-bottom:8px;">🧪 테토·에겐 화학식 리포트</div>'
    + '<div style="font-size:.82rem; color:#e2e8f0; margin-bottom:8px;"><b>' + comboTitle + '</b> · 점수차 ' + gapAbs + '점</div>'
    + '<div style="font-size:.82rem; line-height:1.62; color:#dbeafe; margin-bottom:8px;">' + comboSummary + '</div>'
    + '<div style="font-size:.8rem; line-height:1.6; color:#fecaca; margin-bottom:10px;"><b>🦴 뼈때리는 한 줄:</b> ' + comboBone + '</div>'
    + '<div style="display:grid; grid-template-columns:1fr; gap:8px;">'
    +   '<div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:8px;"><b style="color:#f9a8d4;">💘 연애 모드</b><div style="font-size:.79rem; color:#e5e7eb; margin-top:4px; line-height:1.55;">' + comboLove + '</div></div>'
    +   '<div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:8px;"><b style="color:#93c5fd;">💼 사회/커리어 모드</b><div style="font-size:.79rem; color:#e5e7eb; margin-top:4px; line-height:1.55;">' + comboWork + '</div></div>'
    +   '<div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:8px;"><b style="color:#fde68a;">🧭 오늘의 운영 팁</b><div style="font-size:.79rem; color:#e5e7eb; margin-top:4px; line-height:1.55;">' + comboTip + '</div></div>'
    + '</div>'
    + '<div style="margin-top:10px; font-size:.74rem; color:rgba(255,255,255,.58);">핵심 십성 분포: ' + starSummary + '</div>'
    + '</div>';

  var barHtml = '<div style="margin-bottom:6px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:4px;"><span>🔥 테토 에너지</span><span>' + tPct + '%</span></div>'
    + '<div class="hv-bar-wrap"><div class="hv-bar-teto" id="hvBarTeto" style="width:0%"></div></div>'
    + '</div>'
    + '<div style="margin-bottom:18px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:4px;"><span>✨ 에겐 에너지</span><span>' + ePct + '%</span></div>'
    + '<div class="hv-bar-wrap"><div class="hv-bar-egen" id="hvBarEgen" style="width:0%"></div></div>'
    + '</div>';

  var missionByResult = {
    teto: {
      title: '오늘의 테토 미션',
      tasks: [
        '결론 말하기 전, 상대 말 20초 끝까지 듣기',
        '할 일 3개 중 1개는 위임해서 에너지 분산하기',
        '운동 20분 후 칭찬 메시지 1개 보내기'
      ]
    },
    egen: {
      title: '오늘의 에겐 미션',
      tasks: [
        '공감 후 즉시 다음 행동 1줄 붙이기',
        '과몰입 신호 오면 3분 호흡으로 감정 리셋',
        '요청 1건은 정중히 거절해 경계선 연습하기'
      ]
    },
    neutral: {
      title: '오늘의 밸런스 미션',
      tasks: [
        '오전은 테토 모드(결정), 오후는 에겐 모드(관계)로 운영',
        '말하기 전 팩트/감정을 구분해 전달하기',
        '하루 마감에 캐릭터 전환 성공 사례 1건 기록하기'
      ]
    }
  };
  var mission = missionByResult[vibe.result] || missionByResult.neutral;
  var missionHtml = '<div style="margin-top:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px 12px 10px;text-align:left;">'
    + '<div style="font-size:.85rem;font-weight:900;color:#fde68a;margin-bottom:7px;">🎯 ' + mission.title + '</div>'
    + '<ul style="margin:0;padding-left:18px;color:#e5e7eb;font-size:.78rem;line-height:1.55;">'
    + mission.tasks.map(function(t){ return '<li style="margin-bottom:4px;">' + t + '</li>'; }).join('')
    + '</ul>'
    + '</div>';

  var html = '';

  if (vibe.result === 'teto') {
    var tetoQuantum = '<div style="margin-top:20px; background:rgba(0,0,0,0.25); border-radius:12px; padding:16px; text-align:left; border:1px solid rgba(255,107,107,0.2);">'
      + '<div style="font-weight:900; color:#fff; font-size:1.05rem; margin-bottom:12px; display:flex; align-items:center;"><span style="font-size:1.3rem; margin-right:6px;">🌌</span> 퀀텀 명리 라이프스타일 딥다이브</div>'
      + '<div style="margin-bottom:10px;"><div style="color:#ff6b6b; font-size:0.85rem; font-weight:800; margin-bottom:4px;">💖 연애 스타일</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">불도저 직진형! "내 사람이다" 싶으면 앞뒤 안 가리고 에너지를 쏟아붓습니다. 강한 리드와 헌신으로 상대방을 사로잡지만, 질투와 소유욕이 폭발할 수 있으니 가끔은 통제력을 풀어주세요.</div></div>'
      + '<div style="margin-bottom:10px;"><div style="color:#feca57; font-size:0.85rem; font-weight:800; margin-bottom:4px;">👔 사회 생활 & 커리어</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">타고난 보스 기질. 무리를 이끌고 한계 돌파를 즐기는 행동파입니다. 승부욕이 뛰어나고 굽히는 것을 싫어해 트러블 메이커가 되기도 하지만, 결국 폭발적인 행동력과 성과로 스스로를 증명해 내는 실력자입니다.</div></div>'
      + '<div><div style="color:#ff9ff3; font-size:0.85rem; font-weight:800; margin-bottom:4px;">🔥 추천 취미</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">웨이트 트레이닝, 복싱, 클라이밍 파쿠르, 아니면 랭크 게임의 하드캐리 등 극한의 응축된 에너지를 물리적으로 뿜어낼 수 있는 강도 높은 활동이 스트레스 해소에 직빵입니다.</div></div>'
      + '</div>';

    // 불꽃 배경 데코
    var flames = '';
    ['💪','🔥','⚡','💥','🐎'].forEach(function(e, i) {
      flames += '<span class="hv-teto-flame" style="left:'+(8+i*18)+'%;top:'+(10+((i%3)*22))+'%;animation-delay:'+(.3*i)+'s;">' + e + '</span>';
    });
    html = '<div class="hv-teto-wrap">'
      + '<div class="hv-teto-bg">' + flames + '</div>'
      + '<div class="hv-teto-content">'

      + '<div class="hv-teto-title" style="display:flex; flex-direction:column; align-items:center; line-height:1.2; padding:10px 0;">'
      + '<div style="font-size:4.5rem; text-shadow:0 10px 20px rgba(0,0,0,0.5); display:inline-block; margin-bottom:10px;" class="wild-horse">🐎</div>'
      + '<span>이 구역 야생마는<br>나야 나!</span>'
      + '</div>'
      + '<div class="hv-teto-copy">이 구역의 거친 숨결, 테토력이 폭발하고 있습니다!</div>'
      + barHtml
      + '<div class="hv-reason-list">' + reasonsHtml + '</div>'
      + statsHtml
      + hormoneStoryHtml
      + missionHtml
      + tetoQuantum
      + '<div style="margin-top:16px;font-size:.78rem;color:rgba(255,255,255,.35);line-height:1.6; text-align:center;">비겁·관성 중심의 신강 사주는 강한 추진력과 승부욕을 나타냅니다. 다만 모든 것을 성별·개인 편차로 다양하게 해석하는 재미있는 심리 콘텐츠입니다 😄</div>'
      + '</div></div>'
      + '<style>\n'
      + '@keyframes wildHorseGallop { 0% { transform: translateY(0) rotate(-5deg) scale(1.1); } 50% { transform: translateY(-15px) rotate(5deg) scale(1.2); } 100% { transform: translateY(0) rotate(-5deg) scale(1.1); } }\n'
      + '.wild-horse { animation: wildHorseGallop 0.6s infinite ease-in-out; }\n'
      + '</style>';
  } else if (vibe.result === 'egen') {
    var egenQuantum = '<div style="margin-top:20px; background:rgba(0,0,0,0.25); border-radius:12px; padding:16px; text-align:left; border:1px solid rgba(217,128,250,0.2);">'
      + '<div style="font-weight:900; color:#fff; font-size:1.05rem; margin-bottom:12px; display:flex; align-items:center;"><span style="font-size:1.3rem; margin-right:6px;">🌌</span> 퀀텀 명리 라이프스타일 딥다이브</div>'
      + '<div style="margin-bottom:10px;"><div style="color:#ff9ff3; font-size:0.85rem; font-weight:800; margin-bottom:4px;">💖 연애 스타일</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">감수성 피크를 찍는 천생 로맨티스트! 사소한 눈빛과 분위기까지 공명하며 스며듭니다. 상대를 다정하게 감싸지만, 그만큼 상처도 깊게 받으니 본인의 유리 멘탈도 꼭 보듬어주세요.</div></div>'
      + '<div style="margin-bottom:10px;"><div style="color:#48dbfb; font-size:0.85rem; font-weight:800; margin-bottom:4px;">👔 사회 생활 & 커리어</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">최고의 팀 플레이어이자 여론을 주도하는 공감 요정. 유연한 언변과 섬세한 센스로 어디서든 사랑받습니다. 팩트 폭행보다는 사람의 마음을 훔치는 기획, 서비스, 예술, 심리 분야에서 압도적인 존재감을 보입니다.</div></div>'
      + '<div><div style="color:#1dd1a1; font-size:0.85rem; font-weight:800; margin-bottom:4px;">🎨 추천 취미</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">내면의 미학을 채우는 활동. 핫플레이스 카페 투어, 다이어리 꾸미기, 감성 사진 촬영, 음악 감상, 반려동물/반려식물 가꾸기 등 촉촉한 아날로그 감성을 마음껏 발산해 보세요.</div></div>'
      + '</div>';

    var sparkles = '';
    ['✨','🌸','💫','🦋','💝'].forEach(function(e, i) {
      sparkles += '<span class="hv-egen-sparkle" style="left:'+(6+i*17)+'%;top:'+(8+((i%3)*25))+'%;animation-delay:'+(.5*i)+'s;animation-duration:'+(1.8+i*.4)+'s;">' + e + '</span>';
    });
    html = '<div class="hv-egen-wrap">'
      + '<div class="hv-egen-bg">' + sparkles + '</div>'
      + '<div class="hv-egen-content">'

      + '<div class="hv-egen-title">감성이 파도처럼<br>밀려오는 중 🌊</div>'
      + '<div class="hv-egen-copy">감성이 파도를 치네요, 에겐 지수가 한도 초과입니다!</div>'
      + barHtml
      + '<div class="hv-reason-list">' + reasonsHtml + '</div>'
      + statsHtml
      + hormoneStoryHtml
      + missionHtml
      + egenQuantum
      + '<div style="margin-top:16px;font-size:.78rem;color:rgba(255,255,255,.35);line-height:1.6; text-align:center;">인성·식상 중심 사주는 수용성과 감성 표현이 특징입니다. 성별·개인 편차로 다양하게 해석하는 재미있는 심리 콘텐츠입니다 😊</div>'
      + '</div></div>';
  } else {
    var neutralQuantum = '<div style="margin-top:20px; background:rgba(0,0,0,0.25); border-radius:12px; padding:16px; text-align:left; border:1px solid rgba(78,205,196,0.2);">'
      + '<div style="font-weight:900; color:#fff; font-size:1.05rem; margin-bottom:12px; display:flex; align-items:center;"><span style="font-size:1.3rem; margin-right:6px;">🌌</span> 퀀텀 명리 라이프스타일 딥다이브</div>'
      + '<div style="margin-bottom:10px;"><div style="color:#ff6b6b; font-size:0.85rem; font-weight:800; margin-bottom:4px;">💖 연애 스타일</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">밀당의 숨은 고수. 때로는 터프하게 리드하고, 때로는 사르르 녹아드는 멀티플레이어입니다. 상황에 따라 테토와 에겐의 필살기를 골라 꺼내 쓰는 치명적이고 예측 불가능한 매력을 지녔습니다.</div></div>'
      + '<div style="margin-bottom:10px;"><div style="color:#4ecdc4; font-size:0.85rem; font-weight:800; margin-bottom:4px;">👔 사회 생활 & 커리어</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">팀 내 퍼펙트 윤활유. 꼰대 상사 앞에서는 유연하게 대처하고, 소심한 팀원 앞에서는 기대고 싶은 듬직한 리더십을 보여줍니다. 극단으로 치우치지 않는 절묘한 밸런스로 어디서든 환영받는 에이스입니다.</div></div>'
      + '<div><div style="color:#feca57; font-size:0.85rem; font-weight:800; margin-bottom:4px;">⚖️ 추천 취미</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">얕고 넓은 잡학다식 컬렉터. 혼자 조용히 책을 읽다가도 다음 날은 친구들과 한강으로 액티비티를 떠나는 등, 동적인 스포츠와 정적인 취미를 뷔페처럼 자유롭게 섞어 즐길 때 가장 행복합니다.</div></div>'
      + '</div>';

    html = '<div class="hv-neutral-wrap">'
      + '<div class="hv-neutral-content">'

      + '<div class="hv-neutral-title">테토도 에겐도 아닌<br>뭔가 독특한 사주 🌀</div>'
      + '<div class="hv-neutral-copy" style="margin-bottom:18px;">"당신은 그냥 특별한 케이스입니다. 카테고리로 나눌 수가 없어요 🤷"<br>하나의 성향에 치우치지 않는 균형 잡힌 에너지를 보유 중!</div>'
      + barHtml
      + '<div class="hv-reason-list">' + reasonsHtml + '</div>'
      + statsHtml
        + hormoneStoryHtml
      + missionHtml
      + neutralQuantum
      + '</div></div>';
  }

  target.innerHTML = html;

  // 바 애니메이션 (DOM 삽입 후 약간 딜레이)
  requestAnimationFrame(function() {
    setTimeout(function() {
      var bt = document.getElementById('hvBarTeto');
      var be = document.getElementById('hvBarEgen');
      if (bt) bt.style.width = tPct + '%';
      if (be) be.style.width = ePct + '%';
      if (typeof syncReportHeightFromNode === 'function') {
        syncReportHeightFromNode(section);
      }
    }, 120);
  });

  if (typeof syncReportHeightFromNode === 'function') {
    syncReportHeightFromNode(section);
    setTimeout(function(){ syncReportHeightFromNode(section); }, 220);
  }
}


let quantumAnalyzeState = 'idle';

function renderTodayDestinyCard(p) {
  var sec=document.getElementById('destinySection');
  if(!sec)return;
  sec.style.display='block';
  window.quantumProfile = p;
}

document.addEventListener("DOMContentLoaded", function() {
  const card = document.getElementById("qCardEl");
  const scene = document.getElementById("qCardScene");
  if(scene && card) {
    const handleMove = (x, y, rect, divisor) => {
      if (quantumAnalyzeState !== 'idle') return;
      let cx = x - rect.left - rect.width/2;
      let cy = y - rect.top - rect.height/2;
      card.style.transform = `rotateY(${cx/divisor}deg) rotateX(${-cy/divisor}deg)`;
    };
    scene.addEventListener("mousemove", e => handleMove(e.clientX, e.clientY, scene.getBoundingClientRect(), 5));
    scene.addEventListener("mouseleave", () => {
      if (quantumAnalyzeState === 'idle') card.style.transform = "rotateY(0deg) rotateX(0deg)";
    });
    scene.addEventListener("touchmove", e => handleMove(e.touches[0].clientX, e.touches[0].clientY, scene.getBoundingClientRect(), 7), {passive:true});
    scene.addEventListener("touchend", () => {
      if (quantumAnalyzeState === 'idle') card.style.transform = "rotateY(0deg) rotateX(0deg)";
    });
  }
});

function startQuantumAnalysis() {
  if (quantumAnalyzeState !== 'idle') return;
  quantumAnalyzeState = 'analyzing';
  
  const card = document.getElementById("qCardEl");
  const subtitle = document.getElementById("qSub");
  
  if(card) {
      card.style.transition = 'transform 0.1s linear';
      let vibInterval = setInterval(() => { card.style.transform = `rotateZ(${(Math.random()-0.5)*4}deg) scale(0.98)`; }, 80);
      
      if(subtitle) subtitle.innerHTML = "성운 좌표를 정렬하는 중... <span style='color:#bfd8ff; font-weight:600;'>(Constellation Mapping)</span>";
      
      setTimeout(() => {
        clearInterval(vibInterval);
        card.style.transition = 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        showQuantumResult();
      }, 2300);
  }
}

function showQuantumResult() {
  quantumAnalyzeState = 'result';
  const sub = document.getElementById("qSub");
  if(sub) sub.innerHTML = "오늘의 <span style='color:#ffffff; font-weight:700;'>별빛 명리 인사이트</span>가 완성되었습니다.";

  let p = window.quantumProfile;
  let today = new Date();
  let todayGZ = window.getGanZhiForDate ? window.getGanZhiForDate(today.getFullYear(), today.getMonth()+1, today.getDate(), today.getHours()) : null;

  let dGan = todayGZ ? todayGZ.g : ((p && p.d && p.d.g) ? p.d.g : '丙');
  let dJi  = todayGZ ? todayGZ.j : ((p && p.d && p.d.j) ? p.d.j : '辰');

  const ganNames = {'甲':'큰 나무','乙':'화초','丙':'태양','丁':'촛불','戊':'큰 산','己':'평야','庚':'바위/철','辛':'보석','壬':'큰 바다','癸':'비/이슬'};
  const jiNames = {'子':'씨앗/물','丑':'겨울 땅','寅':'봄의 시작','卯':'봄의 절정','辰':'봄의 끝','巳':'여름 불','午':'여름 절정','未':'여름 끝','申':'가을 시작','酉':'가을 절정','戌':'가을 끝','亥':'겨울 시작'};
  
  const ganDesc = ganNames[dGan] || '하늘의 기운';
  const jiDesc = jiNames[dJi] || '땅의 기운';

  // ── 카드 뒷면에 오행 콘텐츠 채우기 ──
  var todayEl = (window.GAN && window.GAN[dGan]) ? window.GAN[dGan].e : 'earth';
  var elEmojis = {wood:'🌿', fire:'🔥', earth:'🌏', metal:'✨', water:'💧'};
  var elNames = {wood:'목(木) 성운', fire:'화(火) 성운', earth:'토(土) 성운', metal:'금(金) 성운', water:'수(水) 성운'};
  var elDescs = {
    wood: '생명력과 성장의 기운이\n오늘 하루를 감싸고 있습니다.\n새로운 시작에 유리한 날입니다.',
    fire:  '열정과 빛의 에너지가\n온 세상을 밝히는 날입니다.\n적극적으로 행동하세요.',
    earth: '안정과 포용의 기운이\n대지처럼 든든히 받쳐줍니다.\n신뢰를 쌓기 좋은 날입니다.',
    metal: '결단과 정제의 기운이\n날카롭게 빛나는 날입니다.\n핵심에 집중하세요.',
    water: '지혜와 유연함의 파동이\n깊고 고요하게 흐르는 날입니다.\n내면의 소리에 귀 기울이세요.'
  };

  var qBack = document.getElementById("qCardBack");
  if(qBack) {
    qBack.className = 'quantum-card-back el-' + todayEl;
    var emojiEl = document.getElementById("qBackEmoji");
    var nameEl = document.getElementById("qBackElName");
    var ganJiEl = document.getElementById("qBackGanJi");
    var descEl = document.getElementById("qBackDesc");
    if(emojiEl) emojiEl.textContent = elEmojis[todayEl] || '☯';
    if(nameEl) nameEl.textContent = elNames[todayEl] || '오행';
    if(ganJiEl) ganJiEl.textContent = dGan + ' · ' + dJi;
    if(descEl) descEl.textContent = elDescs[todayEl] || '오늘의 오행 에너지';
  }

  // 카드 플립
  const card = document.getElementById("qCardEl");
  if(card) card.className += ' flip-it';

  if(document.getElementById("qDayGan")) document.getElementById("qDayGan").innerText = dGan;
  if(document.getElementById("qDayJi")) document.getElementById("qDayJi").innerText = dJi;
  if(document.getElementById("qDayGanDesc")) document.getElementById("qDayGanDesc").innerText = ganDesc;
  if(document.getElementById("qDayJiDesc")) document.getElementById("qDayJiDesc").innerText = jiDesc;

  // 오행 관계 계산 (생/극) — todayEl은 위에서 이미 선언됨
  var birthGan = (p && p.d && p.d.g) ? p.d.g : '甲';
  var birthEl = (window.GAN && window.GAN[birthGan]) ? window.GAN[birthGan].e : 'wood';
  
  var SHENG2 = {wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'};
  var KE2 = {wood:'earth',earth:'water',water:'fire',fire:'metal',metal:'wood'};  
  var rel = 'neutral';
  
  if(SHENG2[birthEl]===todayEl) rel='gen_out'; 
  else if(SHENG2[todayEl]===birthEl) rel='gen_in'; 
  else if(KE2[birthEl]===todayEl) rel='ke_out'; 
  else if(KE2[todayEl]===birthEl) rel='ke_in'; 
  else if(birthEl===todayEl) rel='same';

  var relMsg = {
    gen_in: {
      overall: '오늘은 당신의 본원에 별빛이 스며드는 날입니다. 멈췄던 흐름이 다시 부드럽게 움직입니다.',
      love: '관계의 온도가 자연스럽게 올라갑니다. 짧아도 진심이 담긴 한마디가 큰 울림을 만듭니다.',
      money: '작은 기회가 실제 성과로 이어지기 쉽습니다. 익숙한 영역에서 안정적인 수확을 노리세요.',
      action: '미루던 일을 하나만 확실히 시작하세요. 첫 실행이 오늘의 행운 회로를 엽니다.'
    },
    gen_out: {
      overall: '당신의 에너지가 주변에 빛을 나누는 날입니다. 베푼 만큼 좋은 흐름이 다시 돌아옵니다.',
      love: '기다리기보다 먼저 다정하게 손을 내미세요. 당신의 배려가 관계의 깊이를 키웁니다.',
      money: '지출이 늘 수 있으니 가치와 우선순위를 점검하세요. 의미 있는 투자만 남기면 운이 살아납니다.',
      action: '도움이 필요한 사람을 챙겨보세요. 공감과 지원이 곧 당신의 개운 포인트입니다.'
    },
    ke_in: {
      overall: '외부 파동이 강하게 밀려와 리듬이 흔들릴 수 있습니다. 속도를 낮추면 오히려 안정이 빠르게 찾아옵니다.',
      love: '예민한 반응보다 경청이 유리합니다. 답을 서두르지 말고 감정을 정돈한 뒤 대화하세요.',
      money: '큰 결정은 하루만 늦추는 편이 안전합니다. 계약, 결제, 서명은 이중 점검이 필요합니다.',
      action: '체크리스트로 리스크를 줄이세요. 오늘의 승부수는 과감함보다 정확함입니다.'
    },
    ke_out: {
      overall: '당신의 추진력이 전면에 서는 날입니다. 다만 강한 속도 속에서도 균형 감각을 잃지 않는 것이 핵심입니다.',
      love: '주도권을 잡더라도 말투는 부드럽게 조율하세요. 따뜻한 표현이 관계의 마찰을 줄입니다.',
      money: '협상력과 판단력이 좋아 실속을 챙기기 좋습니다. 조건을 명확히 기록하면 성과가 커집니다.',
      action: '막힌 일을 돌파하되 독주하지 마세요. 주변과 호흡을 맞출수록 결과가 단단해집니다.'
    },
    same: {
      overall: '당신과 오늘의 기운이 같은 파장에서 공명합니다. 자신감과 실행력이 함께 상승하는 날입니다.',
      love: '결이 맞는 사람과 연결되기 쉽습니다. 편안한 대화 속에서 관계가 빠르게 가까워집니다.',
      money: '경쟁 속에서도 존재감이 살아납니다. 당신의 강점을 분명히 드러내면 기회가 붙습니다.',
      action: '프로젝트 시작이나 네트워킹에 에너지를 집중하세요. 오늘의 선택이 다음 흐름을 선점합니다.'
    },
    neutral: {
      overall: '큰 파도 없이 안정적으로 흐르는 날입니다. 기본 루틴을 지키는 것만으로도 충분히 좋은 운입니다.',
      love: '화려한 이벤트보다 꾸준한 배려가 효과적입니다. 작지만 정확한 관심이 신뢰를 만듭니다.',
      money: '확장보다 관리에 초점을 두세요. 지출 구조와 자산 배치를 정리하면 흐름이 좋아집니다.',
      action: '밀린 일 하나를 끝내며 리듬을 회복하세요. 작은 완성이 내일의 추진력을 만듭니다.'
    }
  };
  
  var msg = relMsg[rel] || relMsg.neutral;
  let explainHtml = `당신의 오늘 하루는 <strong>${ganDesc}</strong>의 기운과 <strong>${jiDesc}</strong>의 에너지가 만나 특별한 파동을 형성합니다.<br><br><span style="color:#f8fafc;">${msg.overall}</span>`;

  if(document.getElementById("qExplanation")) document.getElementById("qExplanation").innerHTML = explainHtml;
  if(document.getElementById("gRel")) document.getElementById("gRel").innerText = msg.love;
  if(document.getElementById("gHealth")) document.getElementById("gHealth").innerText = msg.money;
  if(document.getElementById("gAction")) document.getElementById("gAction").innerText = msg.action;

  const chips = document.querySelectorAll('.q-chip');
  chips.forEach(c => { c.classList.remove('active'); c.style.transform = ''; });
  
  const targetChip = document.querySelector(`.q-chip.${todayEl}`);
  if(targetChip) { targetChip.classList.add('active'); targetChip.style.transform = 'scale(1.1)'; }

  const dBoard = document.getElementById("qDashboard");
  if(dBoard) {
      dBoard.style.display = "block";
      setTimeout(() => { dBoard.classList.add('show'); }, 100);
  }
}
