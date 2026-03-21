/* ?ъ＜ ?붿쭊 肄붿뼱 (1/4). ?댁뼱?? js/saju-engine-tarot-sukuyo-quantum.js ??js/core/saju/reportDashboard.js ??js/saju-engine-continuation.js */
/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   STEP 1: CDN ?대갚 ?쇱씠釉뚮윭由?濡쒕뵫
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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

function _setRunButtonToRetry() {
  var btnEl = document.getElementById('run-btn');
  if (!btnEl) return;
  btnEl.disabled = false;
  btnEl.textContent = '?봽 ?쇱씠釉뚮윭由??ㅼ떆 ?쒕룄';
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
    btnEl.textContent = '?봽 ?쇱씠釉뚮윭由??ъ떆??以?..';
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
 * [Backend Engine] ?쒓뎅 ?쒖? 怨좎젙諛 ?뚯뼇??蹂???깃턿 吏꾨쾿
 * KASI(?쒓뎅泥쒕Ц?곌뎄?? ?쒖? ?뚯뼇??蹂???곗씠??諛?1遺?1珥?24?덇린 ?ㅼ감 蹂댁젙 諛섏쁺
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
            tDate.setDate(tDate.getDate() + 1); // 紐낅━???먯떆 寃쎄퀎??蹂댁젙
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
  '??:'??,'阿?:'阿?,'訝?:'訝?,'訝?:'訝?,'??:'??,'藥?:'藥?,'佯?:'佯?,'渦?:'渦?,'鶯?:'鶯?,'??:'??,
  '媛?:'??,'??:'阿?,'蹂?:'訝?,'??:'訝?,'臾?:'??,'湲?:'藥?,'寃?:'佯?,'??:'渦?,'??:'鶯?,'怨?:'??
};
var KASI_JI_MAP = {
  '耶?:'耶?,'訝?:'訝?,'野?:'野?,'??:'??,'渦?:'渦?,'藥?:'藥?,'??:'??,'??:'??,'??:'??,'??:'??,'??:'??,'雅?:'雅?,
  '??:'耶?,'異?:'訝?,'??:'野?,'臾?:'??,'吏?:'渦?,'??:'藥?,'??:'??,'誘?:'??,'??:'??,'??:'??,'??:'??,'??:'雅?
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
  if (t === 'lunar' || t === '?뚮젰') return 'lunar';
  if (t === 'lunar_leap' || t === '?ㅻ떖' || t === '?뚮젰?ㅻ떖' || t === 'leap') return 'lunar_leap';
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
  if (idx < 0 && palaceName === '遺泥섍턿') idx = zwData.palacesByIndex.indexOf('遺遺沅?);
  if (idx < 0 && palaceName === '遺遺沅?) idx = zwData.palacesByIndex.indexOf('遺泥섍턿');
  if (idx < 0) return { main: [], aux: [], bad: [] };

  var st = zwData.stars[idx] || { main: [], aux: [], bad: [], borrowedMain: [] };
  var normalize = function(arr) {
    return (arr || []).map(function(v) {
      return String(v || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/?붾줉|?붽텒|?붽낵|?붽린|\(李⑥꽦\)/g, '')
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

function computeZiweiCompatLite(meBirth, partnerBirth) {
  try {
    if (!meBirth || !partnerBirth) return { score: 50, source: 'none' };
    var meData = window._currentZiweiData || calcZiweiPalaces(meBirth.year, meBirth.month, meBirth.day, meBirth.hour, meBirth.minute);
    var youData = calcZiweiPalaces(partnerBirth.year, partnerBirth.month, partnerBirth.day, partnerBirth.hour, partnerBirth.minute);

    var mePal = {
      meng: _zwCompatPalSnapshotLite(meData, '紐낃턿'),
      spouse: _zwCompatPalSnapshotLite(meData, '遺泥섍턿'),
      bok: _zwCompatPalSnapshotLite(meData, '蹂듬뜒沅?),
      wealth: _zwCompatPalSnapshotLite(meData, '?щ갚沅?),
      job: _zwCompatPalSnapshotLite(meData, '愿濡앷턿')
    };
    var youPal = {
      meng: _zwCompatPalSnapshotLite(youData, '紐낃턿'),
      spouse: _zwCompatPalSnapshotLite(youData, '遺泥섍턿'),
      bok: _zwCompatPalSnapshotLite(youData, '蹂듬뜒沅?),
      wealth: _zwCompatPalSnapshotLite(youData, '?щ갚沅?),
      job: _zwCompatPalSnapshotLite(youData, '愿濡앷턿')
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
    return { score: Math.max(20, Math.min(96, finalScore)), source: 'ziwei-lite' };
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
    return { score: score, source: 'astro-lite' };
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
        var isLeapStr = typeVal === 'lunar_leap' ? '(?ㅻ떖)' : '(?됰떖)';
        pEl.classList.add('form-lunar-preview--active');
        pEl.style.display = 'block';
        pEl.innerHTML = `??蹂???꾨즺: ?묐젰 <strong>${actualDates.y}??${actualDates.m}??${actualDates.d}??/strong> / ?뚮젰${isLeapStr} <strong>${dVal.split('-')[0]}??${dVal.split('-')[1]}??${dVal.split('-')[2]}??/strong>`;
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
    if (msgEl) msgEl.textContent='???쇱씠釉뚮윭由?濡쒕뱶 ?ㅽ뙣';
    if (subEl) subEl.textContent='?덈줈怨좎묠 ???ㅼ떆 ?쒕룄?댁＜?몄슂';
    if (btnEl) btnEl.textContent='?좑툘 濡쒕뱶 ?ㅽ뙣 (?ㅼ떆 ?쒕룄)';
    setTimeout(function(){ _hideLibOverlay(); }, 900);
    _setRunButtonToRetry();
    return;
  }
  var url=CDN_URLS[tried];
  var sub = document.getElementById('lib-sub');
  if (sub) sub.textContent='CDN '+(tried+1)+'/'+CDN_URLS.length+' ?쒕룄 以?..';
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
    btn.textContent='?맰 ?ъ＜ 遺꾩꽍?섍린';
    /* INP: onclick? data-action 寃쎈줈瑜??吏 ?딆쑝誘濡??숈씪?섍쾶 ????吏??*/
    btn.onclick = function () { setTimeout(checkPrivacyAndCalculate, 0); };
  }
}

/* ?쇱씠釉뚮윭由??ㅻ쾭?덉씠 ?붿〈 諛⑹?: 15珥?寃쎄낵 ??媛뺤젣 ?댁젣 */
setTimeout(function(){ _hideLibOverlay(); }, 15000);

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   STEP 2: 紐낅━???곗씠???먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
var GAN={
  '??:{e:'wood',y:'+',n:'媛묐ぉ'},'阿?:{e:'wood',y:'-',n:'?꾨ぉ'},
  '訝?:{e:'fire',y:'+',n:'蹂묓솕'},'訝?:{e:'fire',y:'-',n:'?뺥솕'},
  '??:{e:'earth',y:'+',n:'臾댄넗'},'藥?:{e:'earth',y:'-',n:'湲고넗'},
  '佯?:{e:'metal',y:'+',n:'寃쎄툑'},'渦?:{e:'metal',y:'-',n:'?좉툑'},
  '鶯?:{e:'water',y:'+',n:'?꾩닔'},'??:{e:'water',y:'-',n:'怨꾩닔'}
};
var JI={
  '耶?:{e:'water',y:'-',a:'伊?},'訝?:{e:'earth',y:'-',a:'??},
  '野?:{e:'wood',y:'+',a:'?몃옉??},'??:{e:'wood',y:'-',a:'?좊겮'},
  '渦?:{e:'earth',y:'+',a:'??},'藥?:{e:'fire',y:'+',a:'諭'},
  '??:{e:'fire',y:'-',a:'留?},'??:{e:'earth',y:'-',a:'??},
  '??:{e:'metal',y:'+',a:'?먯댂??},'??:{e:'metal',y:'-',a:'??},
  '??:{e:'earth',y:'+',a:'媛?},'雅?:{e:'water',y:'+',a:'?쇱?'}
};
var ANIMAL_EMOJI={伊?'?맠',??'?릢',?몃옉??'?맦',?좊겮:'?맧',??'?릧',諭:'?릫',留?'?맭',??'?릲',?먯댂??'?맮',??'?릶',媛?'?릷',?쇱?:'?맰'};
var EL_K={wood:'紐???',fire:'????',earth:'????',metal:'湲???',water:'??麗?'};
var EL_E={wood:'?뙼',fire:'?뵦',earth:'?뙊',metal:'??,water:'?뮛'};
var SHENG={wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'};
var KE={wood:'earth',fire:'metal',earth:'water',metal:'wood',water:'fire'};
function whoControls(e){var k=Object.keys(KE);for(var i=0;i<k.length;i++){if(KE[k[i]]===e)return k[i];}return 'metal';}
function parentOf(e){var k=Object.keys(SHENG);for(var i=0;i<k.length;i++){if(SHENG[k[i]]===e)return k[i];}return 'water';}

/* ??? ??꽦 DB ??? */
var TS_DB={
  '鍮꾧껄':{emoji:'?뫊',desc:'?섎옉 ?묎컳? ?섏쓽 遺꾩떊!',meaning:'移쒓뎄泥섎읆 ?좊뱺???섏? 媛숈? ?먮꼫吏'},
  '寃곸옱':{emoji:'?Ⅷ',desc:'??寃껋쓣 類뤾퀬 類뤾린???쇱씠踰?',meaning:'寃쎌웳?섍퀬 ?닿꺼?대젮??遺덊????먮꼫吏'},
  '?앹떊':{emoji:'?뜑',desc:'?ㅻЪ?ㅻЪ 留쏆엳寃?癒밸뒗 ?щ뒫!',meaning:'利먭쾪寃??쒗쁽?섍퀬 踰좏뫖???됰났???먮꼫吏'},
  '?곴?':{emoji:'?뮙',desc:'洹쒖튃? ?レ뼱! ??硫뗫?濡??좊옒!',meaning:'???源④퀬 李쎌쓽?곸쑝濡?諛붽씀???먮꼫吏'},
  '?몄옱':{emoji:'?렋',desc:'?ш쾶 ?怨??ш쾶 踰꾨뒗 ???????',meaning:'?볦? ?몄긽???꾨퉬怨?吏?섑븯???먮꼫吏'},
  '?뺤옱':{emoji:'?릸',desc:'李④끝李④끝 ?뚮쑑?대쑑 紐⑥쑝???湲덊넻!',meaning:'?꾨겮怨??뚯쨷???ㅻ（???깆떎???먮꼫吏'},
  '?멸?':{emoji:'?뷂툘',desc:'?꾧꺽?섍퀬 臾댁꽌???몃옉???좎깮??',meaning:'李몄븘?닿퀬 梨낆엫吏??移대━?ㅻ쭏 ?먮꼫吏'},
  '?뺢?':{emoji:'?몣',desc:'移?갔諛쏅뒗 紐⑤쾾??諛섏옣!',meaning:'諛붾Ⅸ 湲몃줈 ?대걣?댁＜??洹쒖튃???먮꼫吏'},
  '?몄씤':{emoji:'?뵰',desc:'?⑤뱾? 紐⑤Ⅴ???좊퉬??珥덈뒫??',meaning:'踰덈쑊?대뒗 ?꾩씠?붿뼱? ?낇듅???щ뒫 ?먮꼫吏'},
  '?뺤씤':{emoji:'?ㅁ',desc:'?곕쑜?섍쾶 ?덉븘二쇰뒗 ?꾨쭏????',meaning:'諛곗슦怨??щ옉諛쏅뒗 ?섏슜???먮꼫吏'}
};
var TS_DEEP={
  '鍮꾧껄':{nature:'?꾧뎄??媛꾩꽠??諛쏄린 ?レ뼱?섎뒗 <b>?먯쑀濡쒖슫 ?곹샎</b>?낅땲?? 寃됱쑝濡쒕뒗 議곗슜??蹂댁뿬???띿뿉??"?닿? 理쒓퀬"?쇰뒗 ?먯〈?ъ씠 苑?李??덉뒿?덈떎. ??諛묒뿉???쇳븯湲곕낫?ㅻ뒗 ???대쫫??嫄멸퀬 ?섎뒗 ?쇱씠 ?댁슱由쎈땲??',career:'?꾨━?쒖꽌, ?꾨Ц吏? 媛쒖씤 ?ъ뾽, ?덉껜??遺꾩빞 ??議곗쭅 ?앺솢蹂대떎???낅┰?곸씤 ?낅Т?먯꽌 鍮쏅궔?덈떎.',love:'<b>移쒓뎄 媛숈? ?몄븞???곗븷</b>瑜??좏샇?⑸땲?? ?섎? 援ъ냽?섍굅??吏묒갑?섎뒗 ?곷?????덈? ?ㅻ옒 紐?媛묐땲?? ?쒕줈???ъ깮?쒖쓣 議댁쨷?댁＜??荑⑦븳 ?щ엺怨???留욎뒿?덈떎.',advice:'怨좎쭛???덈Т ?몃㈃ 二쇰? ?щ엺???좊궔?덈떎. 媛?붿? "?닿? ?由??섎룄 ?덈떎"怨??앷컖?섎뒗 ?좎뿰?⑥씠 ?깃났???댁뇿?낅땲?? ?숈뾽蹂대떎???⑤룆 ?됰룞???좊━?⑸땲??'},
  '寃곸옱':{nature:'?밸??뺤쓽 ?붿떊?낅땲?? <b>"吏硫??좎씠 ???ㅻ뒗"</b> ?깃꺽?댁짛. 寃됱쑝濡쒕뒗 ?껉퀬 ?덉뼱???띿쑝濡쒕뒗 ?곷?瑜??닿만 泥쒓린瑜?吏쒓퀬 ?덉뒿?덈떎. 由щ뜑??씠 ?덇퀬 ?щ엺??紐⑥쑝???ъ＜媛 ?곸썡?⑸땲??',career:'?ㅽ룷痢??먯씠?꾪듃, ?뷀꽣?뚯씤癒쇳듃, ?ш린???ъ뾽, ?뺤튂, ?곸뾽吏곸뿉???먭컖???섑??낅땲??',love:'<b>?쒕씪留덊떛?섍퀬 ?붾젮???곗븷</b>瑜?轅덇퓠?덈떎. 寃쎌웳?먭? ?덈뒗 ?댁꽦???곸랬?덉쓣 ?????ъ뿴???먮굧?덈떎.',advice:'?꾨컯?대굹 臾대━???ъ옄???④?留앹떊??吏由꾧만?낅땲?? ?덉? ?ㅼ뼱?ㅻ뒗???섍???援щ찉???쎈땲?? 媛뺤젣 ?異??깃턿 吏꾨쾿??留뚮뱶?몄슂.'},
  '?앹떊':{nature:'泥쒖꽦??<b>?숈쿇?곸씠怨?踰좏뫖??寃?/b>??醫뗭븘?⑸땲?? "醫뗭? 寃?醫뗭? 嫄곗?"?쇰뒗 留덉씤?쒕줈 二쇰? ?щ엺?ㅼ쓣 ?몄븞?섍쾶 ?댁쨳?덈떎. 誘몄떇媛媛 留롪퀬 ?먯옱二쇨? ?곗뼱?⑸땲??',career:'?붿떇?? 援먯쑁, ?≪븘 愿?? ?붿옄?대꼫, ?곌뎄?????닿? 醫뗭븘?섎뒗 ?쇱쓣 ?댁빞 ?λ젰????컻?⑸땲??',love:'<b>?꾨쭏/?꾨튌泥섎읆 梨숆꺼二쇰뒗 ?곗븷</b>瑜??⑸땲?? 留쏆엳??嫄?媛숈씠 癒뱀쑝???ㅻ땲???곗씠?몃? 媛??醫뗭븘?⑸땲??',advice:'?덈Т ?쇱＜?ㅺ? ?댁슜?뱁븷 ???덉쑝???щ엺??媛???ш??몄슂. 寃뚯쓣?ъ?湲??ъ슦??洹쒖튃?곸씤 ?대룞???꾩닔?낅땲??'},
  '?곴?':{nature:'癒몃━ ?뚯쟾??鍮꾩긽?섍쾶 鍮좊Ⅴ怨?<b>留먯옱二쇨? ?곗뼱??泥쒖옱??/b>?낅땲?? 遺議곕━??寃껋쓣 蹂대㈃ 李몄? 紐삵븯怨??ㅼ씠諛쏅뒗 諛섑빆??湲곗쭏濡?"?몃윭釉?硫붿씠而?媛 ?섍린???⑸땲??',career:'?몃줎?? 蹂?몄궗, 而⑥꽕?댄듃, ?좏뒠踰? 留덉??? ?덈뒫????李쎌쓽???쒗쁽???덉슜?섎뒗 遺꾩빞?먯꽌 ??컻?⑸땲??',love:'<b>?고궎?移닿? ???섎뒗 吏?곸씤 ?щ엺</b>?먭쾶 ?뚮┰?덈떎. 吏猷⑦븯嫄곕굹 瑗곕? 媛숈? ?щ엺? 1遺꾨룄 紐?寃щ뵦?덈떎.',advice:'留??쒕쭏?붾줈 泥쒕깷 鍮싳쓣 媛싳?留? 留??쒕쭏?붾줈 ?곸쓣 留뚮벊?덈떎. ?붽? ?ъ쓣 ??3珥덈쭔 ?ш퀬 留먰븯?몄슂.'},
  '?몄옱':{nature:'?ㅼ??쇱씠 ?ш퀬 <b>怨듦컙 吏媛??λ젰???곗뼱???ъ뾽媛</b>?낅땲?? ?묒? ?덉뿉 ?곗뿰?섏? ?딄퀬 ??洹몃┝??洹몃┰?덈떎. ?좊㉧ 媛먭컖???덇퀬 ?몃뒗 寃껋쓣 醫뗭븘??二쇰????щ엺???딆씠吏 ?딆뒿?덈떎.',career:'臾댁뿭, ?좏넻, 湲덉쑖 ?ъ옄, ?댁쇅 愿???ъ뾽, 嫄댁꽕?낆뿉?????깃낵瑜??낅땲??',love:'<b>利먭쾪怨??붾걟???곗븷</b>瑜?異붽뎄?⑸땲?? ?대깽?몄쓽 ?쒖솗?대ŉ ?곷?諛⑹쓣 利먭쾪寃??댁쨳?덈떎.',advice:'怨꾪쉷 ?녿뒗 ?뚮퉬???좏씎??議곗떖?섏꽭?? ?꾧툑蹂대떎??遺?숈궛 媛숈씠 臾띠뼱?먮뒗 ?먯궛??醫뗭뒿?덈떎.'},
  '?뺤옱':{nature:'?몄긽?먯꽌 媛??<b>?깆떎?섍퀬 瑗쇨세???щ엺</b>?낅땲?? ?뚮떎由щ룄 ?먮뱾寃?蹂닿퀬 嫄대꼫???좎쨷?⑥씠 ?덉뒿?덈떎. 1???섎굹???덊닾猷??곗? ?딅뒗 寃쎌젣 愿?먯씠 ?ъ쿋?⑸땲??',career:'?뚭퀎?? ??됱썝, 怨듬Т?? 寃쎈━, ?쎌궗 ???덉젙?곸씤 ?붽툒???섏삤??泥닿퀎?곸씤 議곗쭅??理쒖쟻?낅땲??',love:'<b>?좊ː? ?덉젙??理쒖슦??/b>?쇰줈 ?⑸땲?? 寃고샎???꾩젣濡???吏꾩???留뚮궓???좏샇?⑸땲?? 媛?뺤쟻??理쒓퀬??諛곗슦?먭컧?낅땲??',advice:'?덈Т 怨꾩궛?곸씠硫??멸컙誘멸? ?놁뼱 蹂댁엯?덈떎. 媛?붿? ?댁쑀 ?놁씠 ??쭔??利먭꺼蹂댁꽭??'},
  '?멸?':{nature:'?먯〈?ш낵 紐낆삁瑜?紐⑹닲蹂대떎 ?뚯쨷???ш퉩?덈떎. <b>"?섎? ?곕Ⅴ??</b>??移대━?ㅻ쭏媛 ?덇퀬, ?섎뱺 ?쇰룄 臾듬У??寃щ럩?대뒗 ?몃궡?ъ씠 ??⑦빀?덈떎. ?섑삊?ъ씠 媛뺥빀?덈떎.',career:'援곗씤, 寃쎌같, 寃李? 寃쏀샇, ?멸낵?섏궗, ?뱀닔 湲곗닠吏곸뿉???곸썒?곸씤 ?쒖빟???⑸땲??',love:'<b>?섎? 議닿꼍?댁＜???щ엺</b>???먰빀?덈떎. ?쒕쾲 留덉쓬??二쇰㈃ ?앷퉴吏 梨낆엫吏묐땲??',advice:'?ㅽ듃?덉뒪瑜??띿쑝濡???씠?ㅺ? 蹂묒씠 ?⑸땲?? ?대룞?대굹 痍⑤?濡??먮꼫吏瑜?諛쒖궛?섏꽭??'},
  '?뺢?':{nature:'踰??놁씠???????덈뒗 <b>諛붾Ⅸ ?앺솢 ?щ굹???숇?</b>?낅땲?? 洹쒖튃怨??먯튃??以묒슂?쒗븯怨??대뵒?쒕굹 "誘우쓣 ???덈뒗 ?щ엺"?대씪???됱쓣 ?ｌ뒿?덈떎.',career:'?됱젙 怨듬Т?? 援먯궗, ?湲곗뾽 吏곸썝, 怨듦났湲곌? ??泥닿퀎媛 ?≫엺 議곗쭅?먯꽌 吏꾧?瑜?諛쒗쐶?⑸땲??',love:'<b>?⑥젙?섍퀬 ?덉쓽 諛붾Ⅸ ?щ엺</b>?먭쾶 ?멸컧???먮굧?덈떎. 遺紐⑤떂??醫뗭븘??1???좊옉/?좊텚媛먯엯?덈떎.',advice:'?듯넻?깆씠 遺議깊빐 "?듬떟?섎떎"???뚮━瑜??ㅼ쓣 ???덉뒿?덈떎. ?덈Т ?⑥쓽 ?쒖꽑???섏떇?섏? 留덉꽭??'},
  '?몄씤':{nature:'?⑤뱾??蹂댁? 紐삵븯???몄긽??蹂대뒗 <b>吏곴??κ낵 ?곴컧</b>???곗뼱?⑸땲?? ?덉튂媛 100?⑥씠怨??좊퉬濡쒖슫 留ㅻ젰???덉뒿?덈떎. ?쎄컙 4李⑥썝?곸씠嫄곕굹 泥좏븰?곸씤 ?앷컖???좉만 ?뚭? 留롮뒿?덈떎.',career:'??닠媛, ?щ━?숈옄, 醫낃탳?? ?묎?, ?곌뎄吏? IT 媛쒕컻????鍮꾨쾾???듭같?μ씠 ?꾩슂??遺꾩빞媛 泥쒖쭅?낅땲??',love:'<b>?곹샎???듯븯???뚯슱硫붿씠??/b>瑜?李얠뒿?덈떎. 議곌굔蹂대떎??"?먮굦(Feel)"??以묒슂?⑸땲??',advice:'?앷컖留??섎떎媛 湲고쉶瑜??볦묩?덈떎. 癒몃┸???꾩씠?붿뼱瑜??꾩떎濡???린???ㅽ뻾?μ쓣 湲곕Ⅴ?몄슂.'},
  '?뺤씤':{nature:'留덉쓬???곕쑜?섍퀬 <b>?щ옉諛쏆쓣 ?먭꺽??異⑸텇???щ엺</b>?낅땲?? 吏???멸린?ъ씠 留롪퀬 諛곗슦??寃껋쓣 醫뗭븘?⑸땲?? ?쀬궗?뚯쓽 ?쒗깮??留롮씠 諛쏄퀬 ?몃났??醫뗭뒿?덈떎.',career:'援먯닔, 援먯궗, ?숈옄, ?곷떞媛, 遺?숈궛 ?꾨?????諛곗슦怨?媛瑜댁튂???섍꼍?먯꽌 理쒖긽???깃낵瑜??낅땲??',love:'<b>?ㅼ젙?섍쾶 蹂댁궡?댁＜???щ엺</b>??醫뗭븘?⑸땲?? ?뺤떊?곸씤 援먭컧??以묒슂?쒗븯硫?移?갔怨??몄젙???쏀빀?덈떎.',advice:'諛쏅뒗 寃껋뿉留??듭닕?댁?硫??섏〈?곸씤 ?щ엺???⑸땲?? ?ㅼ뒪濡?寃곗젙?섎뒗 ?먮┰?ъ쓣 ?ㅼ슦?몄슂.'}
};

/* ??? 嫄닿컯 & 媛쒖슫 DB ??? */
var HEALTH_DATA={
  wood:{weak:'媛? ?대궘, ?좉꼍怨? 洹쇱쑁',food:'?뱀깋 梨꾩냼(釉뚮줈肄쒕━, ?쒓툑移?, ?좊쭧 怨쇱씪(留ㅼ떎, ?덈が), ??퀬湲?,advice:'?붾? 李몄쑝硫?媛꾩씠 ?곹빀?덈떎. ?깆궛?대굹 ?곕┝?뺤씠 理쒓퀬??蹂댁빟?낅땲??'},
  fire:{weak:'?ъ옣, ?덇?, ?뚯옣, ?쒕젰',food:'遺됱????뚯떇(?좊쭏?? ?ш낵, ?異?, ?대쭧(?ㅽ겕珥덉퐳由? 而ㅽ뵾 ?곷떦??',advice:'湲됲븳 ?깃꺽???ъ옣??臾대━瑜?以띾땲?? 紐낆긽怨??ы샇?≪쓣 ?먯＜ ?섏꽭??'},
  earth:{weak:'?꾩옣, 鍮꾩옣, ?뚰솕湲? ?덈━',food:'?몃????뚯떇(?⑦샇諛? 怨좉뎄留? 諛붾굹??, ?⑤쭧(轅, ??',advice:'?앷컖???덈Т 留롮쑝硫??꾧? ?덉씠 ?⑸땲?? 洹쒖튃?곸씤 ?앹궗媛 ?앸챸?낅땲??'},
  metal:{weak:'?? ?명씉湲? ??? ?쇰?',food:'?곗깋 ?뚯떇(諛? ?꾨씪吏, 臾? 留덈뒛), 留ㅼ슫留??앷컯, ??',advice:'嫄댁“???섍꼍? ?쇳븯?몄슂. 臾쇱쓣 ?먯＜ 留덉떆怨??쇰? 蹂댁뒿???좉꼍 ?곗꽭??'},
  water:{weak:'?좎옣, 諛⑷킅, ?먭턿/?꾨┰?? 洹',food:'寃????뚯떇(寃?肄? 誘몄뿭, 源, ?묐?), 吏좊쭧(?곷떦???댁궛臾?',advice:'紐몄씠 李④??뚯?湲??쎌뒿?덈떎. 諛섏떊?뺤씠??議깆슃?쇰줈 泥댁삩???믪씠?몄슂.'}
};
var GAEUN_TIPS={
  wood:{color:'?곗깋/硫뷀깉??,place:'?뺣━?뺣룉, 誘몃땲硫 怨듦컙',action:'洹쒖튃, 猷⑦떞, ?깅Ц ?먭???,food:'留ㅼ슫留??앷컯/?? + ?곗깋 ?뚯떇(諛?臾?'},
  fire:{color:'遺됱???二쇳솴??,place:'?쒓린李?怨듦컙, ?⑦뼢',action:'?대룞, ?ш탳 ?쒕룞, ?꾩쟾?곸씤 ??,food:'遺됱? ?뚯떇(?좊쭏???ш낵) + ?대쭧(?ㅽ겕珥덉퐳由?而ㅽ뵾)'},
  earth:{color:'?몃옉/二쇳솴',place:'?몄븞??怨듦컙, ?뉖퀡 ???쒕뒗 怨?,action:'?댁떇/?ш?, ?뚰솕??醫뗭? ?쒕룞',food:'?몃? ?뚯떇(諛붾굹???몃컯) + ?⑤쭧(轅/??'},
  metal:{color:'?뚯깋/?곗깋',place:'源붾걫??怨듦컙, ?쒗뼢',action:'?뺣━/泥?냼, ?먯튃 ?몄슦湲?,food:'留ㅼ슫留??앷컯/?? + ?곗깋 ?뚯떇(諛?臾?'},
  water:{color:'釉붾（/?ㅼ씠鍮?,place:'李⑤텇??臾쇨?, ?쒕뒛???섍꼍',action:'?명씉/紐낆긽, ?띾룄 議곗젅',food:'寃? ?뚯떇(源/誘몄뿭/?묐?) + 吏좊쭧 ?곷떦??}};

var TRAVEL_DB={
  water:{
    title:'?쒖썝??臾?麗? 湲곗슫 ?ы뻾',
    icon:'?뮛',
    vibe:'諛붾떎? ?몄닔, 媛뺢??먯꽌 紐멸낵 留덉쓬???앺?二쇰뒗 ?ы뻾',
    domestic:['?쒖＜ 諛붾떎? ?묒옱쨌?⑤뜒 ?대? ?곗콉','媛뺣쫱쨌?띿큹 ?숉빐 諛붾떎 ?쒕씪?대툕','媛?됀룹뼇??遺곹븳媛빧룸궓?쒓컯 ?섎? 移댄럹'],
    abroad:['諛쒕━쨌?몄폆 ???숇궓???댁뼇吏','紐곕뵒釉뙿룰큿 媛숈? 由ъ“???ы뻾','?ㅼ쐞???명꽣?쇱펲 ?몄닔 ?꾨쭩 ?ы뻾']
  },
  fire:{
    title:'?곗뒪??遺??? 湲곗슫 ?ы뻾',
    icon:'?뵦',
    vibe:'?뉗궡怨??щ엺 ?④린媛 ?먭뺨吏???꾩떆쨌異뺤젣 ?ы뻾',
    domestic:['?쒖슱쨌遺???쇨꼍 ?섎뱾?댁? ?쇱떆??,'?ъ닔쨌遺??諛ㅻ컮??媛먯꽦 ?ы뻾','?援?룰킅二???濡쒖뺄 癒밴굅由??먮갑'],
    abroad:['?꾩퓙쨌?ㅼ궗移??꾩떆 ?쇨꼍 ?ы뻾','?ㅽ럹??諛붾Ⅴ?濡쒕굹쨌?몃퉬??媛먯꽦 ?ы뻾','誘멸뎅 ?쇱뒪踰좎씠嫄곗뒪쨌LA ?쇨꼍 ?쒕씪?대툕']
  },
  wood:{
    title:'?몃Ⅸ ?섎Т(?? 湲곗슫 ?ы뻾',
    icon:'?뙼',
    vibe:'?꿸낵 ?? 珥덈줉 ?먯뿰 ?띿뿉???ъ땐?꾪븯???ы뻾',
    domestic:['吏由ъ궛쨌?ㅼ븙??援?┰怨듭썝 ?꿸만 ?몃젅??,'媛뺤썝???됱갹쨌?몄젣 ?뀁냽 ?쒖뀡','?쒖＜ 怨띠옄?댟룹궗?ㅻ땲?꿸만 ?곗콉'],
    abroad:['?ㅼ쐞???뚰봽???몃젅??,'罹먮굹??諛댄봽쨌?덉씠?щ（?댁뒪 ?꿸낵 ?몄닔 ?ы뻾','?댁쭏?쒕뱶 ?먯뿰 ?띻꼍 ?쒕씪?대툕']
  },
  metal:{
    title:'源붾걫??湲??? 湲곗슫 ?ы뻾',
    icon:'??,
    vibe:'?뺣━???꾩떆 ?띻꼍怨?誘몄닠쨌嫄댁텞??利먭린???ы뻾',
    domestic:['?쒖슱 ?깆닔쨌?쒕궓 媛먯꽦 嫄곕━ ?곗콉','遺???댁슫?쨌?쇳? ?꾨????꾩떖 ?곗콉','?먭탳쨌愿묎탳 ?몄닔怨듭썝怨?移댄럹 嫄곕━'],
    abroad:['?쇰낯 ?꾩퓙쨌援먰넗 誘몄닠愿 ?ы뻾','?깃??щⅤ ?꾩떆 ?쇨꼍怨?媛?좎뒪 諛붿씠 ??踰좎씠','?뚮━쨌?곕뜕 誘몄닠愿 以묒떖 ?쒗떚?ъ뼱']
  },
  earth:{
    title:'?ш렐?????? 湲곗슫 ?ы뻾',
    icon:'?뙊',
    vibe:'?吏???덉젙媛먯씠 ?먭뺨吏???쒖삦쨌?ъ같쨌?⑥쿇 ?ы뻾',
    domestic:['寃쎌＜쨌?꾩＜ ?쒖삦留덉쓣 怨⑤ぉ ?ы뻾','?묒궛 ?듬룄??룻빀泥??댁씤???ъ같 ?곗콉','?뺢뎄쨌?앹븫 ?⑥쿇 ???⑥쿇 ?먮쭅 ?ы뻾'],
    abroad:['?쇰낯 ?섏퐫?ㅒ룸껙???⑥쿇 ?ы뻾','?留?踰좎씠?곗슦 ?⑥쿇怨?怨⑤ぉ ?곗콉','?댄깉由ъ븘 ?좎뒪移대굹 ?쒓낏 留덉쓣 ?쒕씪?대툕']
  }
};

var ENERGY_COORD_DB={
  wood:{
    direction:'?숈そ(?길뼶)',dirEmoji:'?뙮',
    theme:'?몄갹???섎┝쨌?섏쭅 ?앹옣쨌?먯퐫 ?먮꼫吏',
    domestic:[
      {icon:'?럨',name:'?댁뼇 二쎈끃?먃룸???,coord:'35.3108째N 126.9884째E',desc:'?숈븘?쒖븘 理쒕? ??섎Т ?? ?섏쭅 ?곸듅?섎뒗 紐??? 湲곗슫??洹밸룄濡??띿텞??怨듦컙. ?덈꼍 ?덇컻 ??諛붾엺 ?뚮━媛 湲곗슫???뺥솕?⑸땲??'},
      {icon:'?뙯',name:'?몄젣 ?먮?由??먯옉?섎Т??,coord:'38.0643째N 128.1791째E',desc:'?섏? ?먯옉?섎Т?ㅼ씠 ?섎뒛???ν빐 六쀬? ?뺣턿 ?먮꼫吏 ?뺤젏. 紐??? 異⑹쟾???뺣젹??媛뺤썝 ?대쪠 ?먮꼫吏 踰⑦듃.'},
      {icon:'?뙼',name:'?쒖＜ 怨띠옄???먯퐫濡쒕뱶',coord:'33.3617째N 126.2744째E',desc:'?붿궛?????먯떆 諛由? ?딆엫?놁씠 ?ъ깮?섎뒗 ?앸챸 湲곗슫??吏묒빟吏. 議곗쿇쨌援ъ쥖 諛⑸㈃??紐?湲곗슫 洹밸????ъ씤??'},
      {icon:'?뜷',name:'蹂댁꽦 ??쒕떎???뱀감諛?,coord:'34.7619째N 127.0800째E',desc:'?앹뾾???쇱퀜吏??몃Ⅸ ?뱀감諛? ?낆쓽 ?섎텇??癒멸툑怨??먮씪???앸챸?μ씠 紐??? ?먮꼫吏瑜?遺?쒕읇寃?梨꾩썙以띾땲??'},
      {icon:'?뙰',name:'?ъ쿇 援?┰?섎ぉ??(愿묐쫱??',coord:'37.7533째N 127.1733째E',desc:'?섎갚 ?꾧컙 蹂댁〈???먯떆由? 嫄곕???怨좊ぉ?ㅼ씠 肉쒖뼱?대뒗 臾듭쭅?섍퀬 源딆? 紐??? 湲곗슫???⑤じ?쇰줈 ?≪닔?????덉뒿?덈떎.'}
    ],
    global:[
      {icon:'?뛻',name:'罹먮굹??諛댁퓼踰??ㅽ깲由ы뙆??,coord:'49.3012째N 123.1417째W',desc:'?꾩떖 ??400?ν?瑜??먯떆由? ?쒗룊???섎텇??癒멸툑? 紐??? 湲곗슫??媛???쒕룄 ?믨쾶 ?묒쭛??吏援ъ긽 醫뚰몴.'},
      {icon:'?뙵',name:'?쇰낯 援먰넗 ?꾨씪?쒖빞留????,coord:'35.0166째N 135.6686째E',desc:'二쎈┝(塋방옑)??留뚮뱶??珥덈줉 吏꾨룞. 泥쒕뀈 怨좊룄???섏쭅 紐??먮꼫吏? ?꾪넻 臾명솕媛 ?듯빀???쒕컲???뺣룞諛⑺뼢 ?먮꼫吏 ?ъ씤??'},
      {icon:'?뙰',name:'釉뚮씪吏?留덈굹?곗뒪 ?꾨쭏議?,coord:'3.1019째S 60.0250째W',desc:'吏援ъ쓽 ?먮씪 遺덈━???꾨쭏議? ?몃쪟 ??궗??媛??媛뺣젹??紐??? ?먮꼫吏 諛쒖떊吏. 洹뱁븳 紐?湲곗슫 異⑹쟾??理쒖쥌 紐⑹쟻吏.'},
      {icon:'?뙯',name:'誘멸뎅 罹섎━?щ땲???덈뱶?곕뱶 援?┰怨듭썝',coord:'41.3000째N 124.0000째W',desc:'?멸퀎?먯꽌 媛???ㅺ? ???섎Т?ㅼ쓽 援곕씫吏. ?섎뒛??李뚮? ???잛븘?ㅻⅨ 嫄곕ぉ?ㅼ씠 ?뺣룄?곸씤 紐??? ?먮꼫吏瑜?諛⑹궗?⑸땲??'},
      {icon:'?뙯',name:'?낆씪 ?덈컮瑜댁툩諛쒗듃 (?묐┝)',coord:'48.3000째N 8.1500째E',desc:'鍮쎈뭣???꾨굹臾??뀁씠 ?앹뾾???댁뼱吏?寃? ?? 李⑤텇?섍퀬 源딆씠 ?덈뒗 紐??? 湲곗슫???대㈃???깆옣???뺤뒿?덈떎.'}
    ]
  },
  fire:{
    direction:'?⑥そ(?쀦뼶)',dirEmoji:'?뵦',
    theme:'?붿궛 吏?빧룹삁???꾩떆쨌?쇨꼍 ?먮꼫吏',
    domestic:[
      {icon:'?뙅',name:'?쒖＜ ?깆궛?쇱텧遊??붿궛 吏?',coord:'33.4581째N 126.9424째E',desc:'10留뚮뀈 ???붿궛 ??컻濡??앹꽦???묓쉶??吏?? ?닿? 泥섏쓬 ?⑤뒗 諛⑹쐞? ?붿궛 吏?댁씠 寃고빀?????? ?먮꼫吏???깆?. ?쇱텧 ??湲곗슫 理쒓퀬??'},
      {icon:'?럣',name:'?ъ닔 諛ㅻ컮???뚯궛怨듭썝',coord:'34.7461째N 127.7389째E',desc:'?⑦빐 ??李щ????쇨꼍. 臾???諛섏궗??遺??? ?먮꼫吏媛 利앺룺?섎뒗 吏?뺥븰??議곌굔. ?ъ닔 ?⑦뼢 湲곗슫?????⑹떊??洹밸???'},
      {icon:'?렓',name:'遺??媛먯쿇臾명솕留덉쓣 ?쇨꼍',coord:'35.0975째N 129.0106째E',desc:'??寃쎌궗硫????됱콈 ?덉닠 留덉쓣. ?⑥そ 諛붾떎瑜??ν빐 ?대┛ 吏?뺤씠 ???? 湲곗슫???덉젙 ?≪닔. ?덉닠???댁젙쨌?쒓컖 ?먮꼫吏 異⑹쟾吏.'},
      {icon:'?뿼',name:'?쒖슱 ?⑥궛????쇨꼍',coord:'37.5511째N 126.9882째E',desc:'?꾩떖 ?쒓??대뜲 ?곕슍 ?잛? 遺덉쓽 ?곸쭠. ?섎쭖? 遺덈튆??紐⑥뿬 媛뺣젰?????? ?먮꼫吏瑜?諛쒖궛?섎뒗 ?섎룄???ъ옣遺.'},
      {icon:'?똿',name:'?ы빆 ?몃?怨??대쭪??愿묒옣',coord:'36.0772째N 129.5683째E',desc:'?쒕컲?꾩뿉??媛??癒쇱? ?닿? ?⑤뒗 怨? ?좎삤瑜대뒗 ?쒖뼇????컻?곸씤 ???? 湲곗슫怨????? ?먮꼫吏瑜?吏곸젒 ?섏떊?⑸땲??'}
    ],
    global:[
      {icon:'?뙷',name:'?섏???鍮낆븘?쇰옖???щ씪?곗뿉??,coord:'19.4210째N 155.2872째W',desc:'?꾩옱???쒕룞 以묒씤 吏援ъ긽 媛??媛뺣젰?????? ?먮꼫吏 諛⑹궗 醫뚰몴. ?⑹븫??諛붾떎瑜?留뚮굹??吏?먯뿉??????쨌??麗? 湲곗슫??援먯감.'},
      {icon:'?룢截?,name:'?ㅽ럹??諛붾Ⅴ?濡쒕굹 媛?곕뵒 ?덉닠?꾩떆',coord:'41.3851째N 2.1734째E',desc:'遺덇퐙????? 嫄댁텞臾쇱쓽 ?꾩떆. 吏以묓빐 ?쒖뼇???대━弛먮뒗 ?⑥쑀??理쒓퀬?????? 湲곗슫 ?꾩떆. 李쎌쓽?깃낵 ?댁젙 ?먮꼫吏 吏묒쨷 異⑹쟾.'},
      {icon:'?뙅',name:'?댄깉由ъ븘 ?먰듃???붿궛쨌?섑뤃由?,coord:'37.7551째N 14.9961째E',desc:'?좊읇 理쒕? ?쒗솕?곌낵 ?섑뤃由??댁젙 臾명솕媛 寃고빀. 吏以묓빐 ?곗븞 ?⑥そ ?먮꼫吏 吏묒쨷 ?ъ씤?? ???? 湲곗슫??洹쇱썝?먯꽌 異⑹쟾.'},
      {icon:'?룣截?,name:'?꾨엻?먮?由ы듃 ?먮컮???щ쭑 ?ы뙆由?,coord:'25.2048째N 55.2708째E',desc:'?묒뿴?섎뒗 ?쒖뼇怨??④굅??紐⑤옒諛붾엺. 洹뱁븳???닿린媛 ?묒텞???щ쭑?먯꽌 ?쒖닔?????? ?먮꼫吏瑜?寃쏀뿕?????덉뒿?덈떎.'},
      {icon:'?똽',name:'?깃??щⅤ 留덈━??踰좎씠 ?뚯쫰 ?쇨꼍',coord:'1.2834째N 103.8607째E',desc:'?곷룄 遺洹쇱쓽 ?④굅??湲고썑? ?붾젮???멸났 議곕챸??寃고빀???꾨??????? ?먮꼫吏??寃곗젙泥?'}
    ]
  },
  earth:{
    direction:'以묒븰쨌?숇턿쨌?쒕궓',dirEmoji:'?뙊',
    theme:'?⑺넗 ?吏쨌怨좊? ?좎쟻쨌??궗 ?먮꼫吏',
    domestic:[
      {icon:'?룾',name:'寃쎌＜ 諛섏썡?굿룹꺼?깅? 怨좊룄(?ㅹ꺗)',coord:'35.8347째N 129.2239째E',desc:'泥쒕뀈 ?좊씪 ?뺣룄???⑺넗 ?吏. ??궗???쒓났媛꾩씠 ?묒텞?????? 湲곗슫???뺤닔. 遊꽷룰????⑺샎 臾대졄 諛섏썡???좎꽦(?잌윃) ?먮꼫吏 理쒓퀬議?'},
      {icon:'?㎟',name:'?꾩＜ ?쒖삦留덉쓣 ?⑺넗 怨⑤ぉ',coord:'35.8151째N 127.1530째E',desc:'?⑺넗 ?대꼍怨?湲곗?媛 留뚮뱶?????? ?먮꼫吏 諛吏?援ъ뿭. 600????궗???꾪넻 吏湲??경간)媛 ?댁븘?덈뒗 怨듦컙. ?덈꼍 怨⑤ぉ湲몄뿉???吏 湲곗슫 異⑹쟾.'},
      {icon:'?곤툘',name:'異⑹껌 湲덉궛 ??붿궛 ?⑷툑 ?붾컲',coord:'36.1082째N 127.3064째E',desc:'?띿닔吏由ъ긽 異⑹껌 ?대쪠??以묒떖遺. ?⑷툑 ?붾컲 ?몄텧 吏?뺤씠 ???? 湲곗슫??吏?쒖뿉??吏곸젒 諛⑹궗. 怨좎슂???吏 ?먮꼫吏??吏묒빟泥?'},
      {icon:'?썣',name:'?덈룞 ?섑쉶留덉쓣',coord:'36.5388째N 128.5196째E',desc:'?숇룞媛뺤씠 媛먯떥 ?덉? 紐낅떦. ?ㅻ옖 ?몄썡 ?ㅼ졇吏??숆낵 ?꾪넻 媛?μ씠 肉쒖뼱?대뒗 ?덉젙?곸씠怨?以묓썑?????? 湲곗슫.'},
      {icon:'?뙻',name:'?쒖쿇留??듭? 媛덈?諛?,coord:'34.8850째N 127.5080째E',desc:'愿묓솢??媛?쾶怨??吏媛 留뚮굹???앸챸???붾엺. ?듯넗(嚥뺝쐿)??湲곗슫??媛뺥빐 硫붾쭏瑜??ъ＜???ㅽ깮?????? ?먮꼫吏瑜?怨듦툒?⑸땲??'}
    ],
    global:[
      {icon:'?룘截?,name:'?섎（ 留덉텛?쎌텛 ?⑺넗 怨좎썝',coord:'13.1631째S 72.5450째W',desc:'?대컻 2,430m ?⑺넗 ?붾컲 ???됱뭅 ?깆콈. 吏援?以묒떖???吏 ?먮꼫吏媛 ?섏쭅 ?곸듅?섎뒗 吏?? ???? 湲곗슫??吏援?洹쒕え濡?泥댄뿕?????덈뒗 理쒓컯 醫뚰몴.'},
      {icon:'?릧',name:'以묎뎅 ?쒖븞 ?⑺넗怨좎썝쨌蹂묐쭏??,coord:'34.3853째N 109.2732째E',desc:'以묒썝(訝?렅) ?⑺넗???ъ옣. ?섏쿇 ?????? ?먮꼫吏媛 ?吏???띿텞??臾몃챸??諛쒖썝吏. ?⑺넗怨좎썝 ?뱀쑀??以묓썑????湲곗슫???덉젙怨??ㅻ젰???ㅼ썎?덈떎.'},
      {icon:'?뿿',name:'?댁쭛??猷⑹냼瑜??щ쭑 怨좊? ?좎쟾',coord:'25.6872째N 32.6396째E',desc:'?섏씪媛??좎뿭 嫄댁“ ?⑺넗 ?吏???먮꼫吏 吏묒쨷泥? 3,000????궗 ?먮꼫吏媛 ?щ쭑 臾댄뭾吏???蹂댁〈. ?덉젙쨌肉뚮━ 湲곗슫???꾩슂?????? ?⑹떊 理쒖쟻 ?댁쇅吏.'},
      {icon:'?룣截?,name:'誘멸뎅 洹몃옖??罹먮땲??,coord:'36.1069째N 112.1129째W',desc:'?섏뼲 ?꾩쓽 吏痢듭씠 洹몃?濡??쒕윭????먯뿰??寃쎌씠. 吏援ъ쓽 堉덈?? ?댁쓣 吏곸젒 留덉＜?섎ŉ 嫄곕??????? ?먮꼫吏瑜??≪닔?⑸땲??'},
      {icon:'?럥',name:'?瑜댄궎??移댄뙆?꾪궎??湲곗븫愿댁꽍',coord:'38.6431째N 34.8289째E',desc:'?붿궛?ш? 援녹뼱 留뚮뱾?댁쭊 ?묓쉶??吏?. ?吏??湲곗슫???낇듅???뺥깭濡??잛븘?ㅻⅨ ???? ?먮꼫吏???좊퉬濡쒖슫 寃곗젅吏.'}
    ]
  },
  metal:{
    direction:'?쒖そ(蜈욘뼶)',dirEmoji:'?뭿',
    theme:'寃ш퀬???붿꽍?걔룹꺼???뚰겕쨌?쒖닔 湲덉냽 ?먮꼫吏',
    domestic:[
      {icon:'?룘截?,name:'?ㅼ븙???몄궛諛붿쐞 ?붾쫱',coord:'38.1247째N 128.4649째E',desc:'?붽컯??嫄곕? ?붽눼媛 ?섏쭅?쇰줈 ?잛? ?쒕컲??理쒓컯??湲??? ?먮꼫吏 醫뚰몴. ?쒖そ ?μ꽑 ?쇰ぐ ??湲덉냽 吏꾨룞 洹밸??? ?⑤떒?섍퀬 ?좎뭅濡쒖슫 湲곗슫 異⑹쟾??援?궡 理쒖쟻.'},
      {icon:'?곤툘',name:'媛?쇱궛 留뚮Ъ???붿꽍 ?μ꽑',coord:'35.7997째N 128.1052째E',desc:'?듦쾪???몄썡??媛덉븘???좎뭅濡쒖슫 ?붾쫱. ?띿닔吏由ъ긽 ?쒕컲???쒕궓沅?湲??? 湲곗슫 吏묒쨷泥? 媛???쒕뒛??怨듦린媛 湲덉냽 ?먮꼫吏瑜??뺤젣.'},
      {icon:'?룺',name:'?ы빆 ?ъ뒪肄??쒖쿋 ?먮꼫吏 ?꾩떆',coord:'36.0192째N 129.3435째E',desc:'援?궡 理쒕? 泥좉컯 ?곗뾽 ?꾩떆. ?멸났 湲?湲곗슫??吏묒빟???꾨???湲덉냽 ?먮꼫吏 ?꾨뱶. ?ㅼ슜쨌湲곗닠쨌泥⑤떒 湲??? ?먮꼫吏 蹂댁땐???뱁솕???댁깋 ?먮꼫吏 醫뚰몴.'},
      {icon:'?룫',name:'?쒖슱 ?숇?臾?DDP',coord:'37.5665째N 127.0090째E',desc:'嫄곕???湲덉냽 ?곗＜??媛숈? 誘몃옒 吏?μ쟻 嫄댁텞臾? 李④컩怨?留ㅻ걚?ъ슫 湲덉냽 ?쒕㈃??諛쒖궛?섎뒗 ?꾨???湲??? ?먮꼫吏.'},
      {icon:'?뙃',name:'遺??留덈┛?쒗떚? 愿묒븞?援?,coord:'35.1532째N 129.1189째E',desc:'媛뺤쿋濡???씤 嫄곕? 援먮웾怨?留덉쿇猷??? 諛붾떎 ?꾨줈 六쀬? 湲덉냽 援ъ“臾쇰뱾??寃곕떒?κ낵 ?깆랬??湲??? 湲곗슫??利앺룺?쒗궢?덈떎.'}
    ],
    global:[
      {icon:'?룘截?,name:'?ㅼ쐞??泥대Ⅴ留덊듃 留덊꽣?몃Ⅸ',coord:'45.9763째N 7.6586째E',desc:'?뚰봽???붽컯??遊됱슦由ъ쓽 ?? ?대컻 4,478m ?쇰씪誘몃뱶???붿궛??諛⑹궗?섎뒗 湲??? ?먮꼫吏??吏援ъ긽 理쒓퀬 ?쒕룄. 洹뱁븳???뺣??㉱룰껐?⑤젰 湲곗슫 異⑹쟾吏.'},
      {icon:'?뮲',name:'誘멸뎅 ?ㅻ━肄섎갭由??붾줈?뚰넗',coord:'37.4419째N 122.1430째W',desc:'?몃쪟 理쒓퀬???뚰겕?濡쒖? ?먮꼫吏 吏묒빟 ?꾩떆. 泥⑤떒쨌?뺣?쨌?곸떊??湲??? 湲곗슫???꾨???諛⑹떇?쇰줈 泥댄뿕. ?쒕컲??湲곗? ?뺤꽌(閭ｈ?) 諛⑺뼢 ?먮꼫吏 蹂댁젙 ?쇱씤.'},
      {icon:'?뭿',name:'?⑥븘怨??뷀븯?ㅼ뒪踰꾧렇 湲덇킅 吏?',coord:'26.2041째S 28.0473째E',desc:'?몃쪟 ??궗??理쒕? 湲덇킅 留ㅼ옣 吏?. 吏?섏뿉??泥쒖뿰 ?쒓툑??諛⑹궗?섎뒗 ?쒖닔 湲??? ?먮꼫吏 ?먯쿇. ?щЪ ?는룸챸???는룰껐?⑤젰 媛뺥솕??吏곹슚?섎뒗 洹뱁븳 湲덉냽 ?먮꼫吏 ?깆?.'},
      {icon:'?뿼',name:'?꾨옉???뚮━ ?먰렆??,coord:'48.8584째N 2.2945째E',desc:'泥좉낏 援ъ“??誘명븰???뺤젏. 李④???泥좎씠 ?덉닠濡??뱁솕??怨듦컙?쇰줈, ?몃젴?섍퀬 ?좎뭅濡쒖슫 湲??? ?먮꼫吏瑜?異⑹쟾?⑸땲??'},
      {icon:'?룞截?,name:'?꾨엻?먮?由ы듃 遺瑜댁쫰 ?좊━??,coord:'25.1972째N 55.2744째E',desc:'?섎뒛??李뚮Ⅴ???멸퀎 理쒓퀬痢?湲덉냽 留덉쿇猷? ?멸컙??湲곗닠?κ낵 湲덉냽 ?먮꼫吏媛 寃고빀???섏쭅 ?곸듅??寃곗젙泥?'}
    ]
  },
  water:{
    direction:'遺곸そ(?쀦뼶)',dirEmoji:'?뙄',
    theme:'?ы빐쨌愿묓솢???몄닔쨌?덇컻 ??뎄 ?먮꼫吏',
    domestic:[
      {icon:'?뙄',name:'媛뺤썝 ?붿쭊???앺샇(逆잍퉾)',coord:'38.5711째N 128.4269째E',desc:'?숉빐? 留뚮굹???ш? ?앺샇 吏?? 留됲엺 臾쇨낵 ?대┛ 諛붾떎媛 援먯감?섎ŉ ??麗? ?먮꼫吏媛 以묒꺽 ?띿텞. ?덈꼍 ?덇컻媛 吏?쑣룹쭅愿?μ쓣 洹뱀쟻?쇰줈 ?뚯뼱?щ┰?덈떎.'},
      {icon:'?슓',name:'蹂댁꽦쨌怨좏씎 ?ㅻ룄???덇컻 ??뎄',coord:'34.7714째N 127.0738째E',desc:'?⑦빐 ?ㅻ룄?댁쓽 ?덇컻????麗? ?먮꼫吏媛 ?묎껐???먯뿰??寃곗젙泥? ?덇컻 ? ??뎄 ?뱀쑀??源딆? 湲곗슫??吏?쑣룻깘援??먮꼫吏瑜?異⑹쟾.'},
      {icon:'?뮛',name:'?쒖＜ ?명솕쨌?깆궛 ?⑹쿇???щ젅湲?,coord:'33.4595째N 126.9185째E',desc:'?붿궛 吏?섏뿉???잛븘?섎뒗 ?먯떆 泥?젙 ?⑹쿇?? 吏援??대? ?섎㎘ ?먮꼫吏媛 吏?쒕줈 吏곸젒 ?잕뎄移섎뒗 ??麗? ?먮꼫吏 ?뺤젏. 誘몄쿇援는룹꽭?뷀빐蹂 ?곌퀎 猷⑦듃 異붿쿇.'},
      {icon:'?룚截?,name:'媛뺣쫱 寃쏀룷?? ?숉빐諛붾떎',coord:'37.8055째N 128.9078째E',desc:'?앹뾾???쇱퀜吏??몃Ⅸ 諛붾떎? 嫄곕????몄닔. ???몄씤 ??麗? 湲곗슫??留됲엺 ?먮쫫???レ뼱二쇨퀬 ?좎뿰???ш퀬瑜??뺤뒿?덈떎.'},
      {icon:'?룤截?,name:'?듭쁺 ?쒕젮?섎룄 ?댁긽怨듭썝',coord:'34.8406째N 128.4302째E',desc:'?섎쭖? ???ъ씠濡??먮Ⅴ???붿옍??諛붾떣臾? 源딄퀬 怨좎슂????麗? ?먮꼫吏媛 ?대㈃???됲솕? 吏?쒕? ?쇨묠?곷땲??'}
    ],
    global:[
      {icon:'?룘截?,name:'?몃Ⅴ?⑥씠 寃뚯씠?묒뿉瑜??쇱슂瑜대뱶',coord:'62.1006째N 7.2053째E',desc:'鍮숉븯媛 ?섎갚留??꾩뿉 嫄몄퀜 ?뚮궦 ?멸퀎 理쒓퀬湲???麗? ?먮꼫吏 ?묎끝. ??룷?섏? 吏숉뫖瑜??쇱슂瑜대뱶媛 留뚮뱶??臾쇱쓽 吏꾨룞? 吏援ъ긽 媛???쒖닔????湲곗슫.'},
      {icon:'?뙅',name:'?꾩씠?щ???釉붾（?쇨뎔쨌?덉씠罹щ퉬??,coord:'63.8804째N 22.4495째W',desc:'吏???⑥쿇怨?鍮숉븯 ?⑹쑖?섍? 寃고빀??湲곕쵖?????먮꼫吏 寃곗젅吏. ?ㅻ줈?쇱? ?띿꽦????湲곗슫??怨듭〈?섎뒗 吏援?理쒕턿???먮꼫吏 泥댄뿕吏. ?ъ링 吏곴? ?쒖꽦??'},
      {icon:'?룥截?,name:'罹먮굹??諛댄봽 ?덉씠?щ（?댁쫰',coord:'51.4254째N 116.1773째W',desc:'鍮숉븯媛 ?뱀븘 留뚮뱺 ?먮찓?꾨뱶鍮??몄닔. 3硫댁씠 ?ㅼ궛?쇰줈 ?섎윭?몄씤 ?먮꼫吏 吏묒쨷 洹몃쫯??吏?? 留묎퀬 ?됱젙????麗? 湲곗슫??吏?쑣룹쿇湲곗쟻 ?ш퀬瑜??낃렇?덉씠??'},
      {icon:'?쎏',name:'?댄깉由ъ븘 踰좊꽕移섏븘 ?댄븯',coord:'45.4408째N 12.3155째E',desc:'?꾩떆 ?꾩껜媛 臾??꾩뿉 ???덈뒗 ??麗? ?먮꼫吏???깆?. ?딆엫?놁씠 ?먮Ⅴ??臾쇨만???좎뿰?깃낵 ?뚰넻??湲곗슫??洹밸??뷀빀?덈떎.'},
      {icon:'?룤截?,name:'紐곕뵒釉??고샇珥?諛붾떎',coord:'3.2028째N 73.2207째E',desc:'?щ챸?섍퀬 留묒? ?몃룄?묒쓽 諛붾떎. ?뺥솕? 移섏쑀????麗? ?먮꼫吏媛 媛?앺븯??吏移??ъ떊???꾨꼍?섍쾶 由ъ뀑?댁쨳?덈떎.'}
    ]
  }
};

var HEALTH_FOOD_DB = {
  wood: [
    {name:'遺異붾Т移?, ingredients:'遺異? ?앹큹', reason:'媛꾩쓽 ?대룆???뺢퀬 ?좊쭧??紐??? 湲곗슫??源⑥썎?덈떎.'},
    {name:'留ㅼ떎李?, ingredients:'留ㅼ떎, 轅', reason:'?좊쭧??媛꾨떞???쇳듉?섍쾶 ?섍퀬 ?쇰줈瑜???댁쨳?덈떎.'},
    {name:'????댁궡 ?먮윭??, ingredients:'????댁궡, ?묒긽異?, reason:'?몃Ⅸ 梨꾩냼媛 紐??? ?먮꼫吏瑜?吏곸젒?곸쑝濡?怨듦툒?⑸땲??'},
    {name:'誘몃굹由??쇨껸??, ingredients:'誘몃굹由? ?쇱?怨좉린', reason:'誘몃굹由ъ쓽 ?대룆 ?묒슜??媛?湲곕뒫??洹밸??뷀빀?덈떎.'},
    {name:'?ㅼ쐞 ?ㅻТ??, ingredients:'?ㅼ쐞, ?ш낵', reason:'?곹겮???좊쭧怨??몃Ⅸ?됱씠 紐??? 湲곗슫??蹂댁땐?⑸땲??'},
    {name:'?쒓툑移??섎Ъ', ingredients:'?쒓툑移? 李멸린由?, reason:'泥좊텇怨??몃Ⅸ ?먮꼫吏媛 ?쇰? 留묎쾶 ?섍퀬 媛꾩쓣 ?뺤뒿?덈떎.'},
    {name:'釉뚮줈肄쒕━ ?ㅽ봽', ingredients:'釉뚮줈肄쒕━, ?곗쑀', reason:'??궛???깅텇??媛꾩쓽 遺?댁쓣 ?쒖뼱以띾땲??'},
    {name:'?λ뼞', ingredients:'?? 李뱀?', reason:'遊꾩쓽 ?앸챸?μ쓣 ?댁? ?μ씠 紐??? 湲곗슫??媛뺥븯寃?梨꾩썎?덈떎.'},
    {name:'?щ룄利?, ingredients:'?щ룄', reason:'?좊쭧怨??⑤쭧??議고솕媛 媛꾩쓽 ?쇰줈瑜??뚮났?쒗궢?덈떎.'},
    {name:'?뱀쬂', ingredients:'耳?? ?먮윭由?, reason:'?묒텞???쎈줉?뚭? 紐??? ?먮꼫吏???뺤닔瑜??쒓났?⑸땲??'},
    {name:'?ㅻ??먯감', ingredients:'?ㅻ???, reason:'?ㅼ꽢 媛吏 留?以??좊쭧??媛꾩쓣 蹂닿컯?섎뒗 ???곸썡?⑸땲??'},
    {name:'?됱씠 ?쒖옣援?, ingredients:'?됱씠, ?쒖옣', reason:'遊꾨굹臾쇱쓽 ?됱떥由꾪븳 留쏆씠 紐??? 湲곗슫???뚯깮?쒗궢?덈떎.'},
    {name:'?좎뼂轅?, ingredients:'?덉슦, ?덈が洹몃씪?? ?쇱엫', reason:'媛뺣젹???좊쭧(紐?怨??덈툕媛 ?뺤껜??湲곗슫???レ뼱以띾땲??'},
    {name:'怨쇱뭅紐곕━', ingredients:'?꾨낫移대룄, 怨좎닔, ?쇱엫利?, reason:'?꾨낫移대룄???몃Ⅸ ?먮꼫吏? ?쇱엫???좊쭧???뚮???紐??? 蹂댁땐?쒖엯?덈떎.'},
    {name:'諛붿쭏 ?섏뒪???뚯뒪?', ingredients:'諛붿쭏, ?? ?щ━釉뚯쑀', reason:'?몃Ⅸ ?덈툕??吏숈? ?μ씠 媛꾨떞??源⑥슦怨??쒕젰??以띾땲??'},
    {name:'?몃퉬泥?, ingredients:'?댁궛臾? ?덈が/?쇱엫利?, reason:'?좉쾬???앹깮??湲곗슫怨?媛뺥븳 ?좊쭧??紐??? ?먮꼫吏瑜?吏곸젒 二쇱엯?⑸땲??'},
    {name:'洹몃┛ 而ㅻ━', ingredients:'泥?뼇怨좎텛, 肄붿퐫?쏅???, reason:'?몃Ⅸ ?μ떊猷뚯쓽 ?먮꼫吏媛 ?곗슱媛먯쓣 ?좊젮踰꾨┰?덈떎.'},
    {name:'泥?궗怨??먯씠??, ingredients:'泥?궗怨? 臾댄깂???꾩궛??, reason:'泥?웾???좊쭧???뚮? 源⑥슦怨?媛꾩쓽 湲곗슫???먰솢?섍쾶 ?⑸땲??'},
    {name:'?먮윭由??ㅽ떛怨??꾨Т??, ingredients:'?먮윭由? 蹂묒븘由ъ쉘', reason:'?꾨줈 六쀫뒗 ?먮윭由ъ쓽 ?먮꼫吏媛 紐??? 湲곗슫??梨꾩썙以띾땲??'},
    {name:'?쇱뒪?移섏삤 ?ㅻ씪??, ingredients:'?쇱뒪?移섏삤, ?곗쑀', reason:'?몃Ⅸ 寃ш낵瑜섏쓽 ?먮꼫吏媛 紐??? 湲곗슫???ъ숴?섍쾶 梨꾩썎?덈떎.'},
    {name:'?쒕? (?뗮뙆?뚯빞 ?먮윭??', ingredients:'?뗮뙆?뚯빞, ?쇱엫, ?쇱돩?뚯뒪', reason:'?꾩궘???앷컧怨??덉숴??留쏆씠 ?앷린瑜??뗭썎?덈떎.'}
  ],
  fire: [
    {name:'?좊쭏???ㅽ뒠', ingredients:'?좊쭏?? ?щ━釉뚯쑀', reason:'遺됱????쇱씠肄뷀렂???ъ옣 ?덇????쇳듉?섍쾶 ?⑸땲??'},
    {name:'?띿궪 ?ъ씤 臾?, ingredients:'?띿궪', reason:'?곕쑜???깆쭏怨??대쭧???ъ옣(?????쒕젰??遺덉뼱?ｌ뒿?덈떎.'},
    {name:'援ш린?먯감', ingredients:'援ш린??, reason:'遺됱? ?대ℓ媛 ?덉븸 ?쒗솚???뺢퀬 ?ъ옣 ?댁쓣 ?ㅼ뒪由쎈땲??'},
    {name:'留덈씪??, ingredients:'留덈씪 ?뚯뒪, 泥?꼍梨?, reason:'留ㅼ슫留쏄낵 ?닿린媛 ???? ?먮꼫吏瑜???컻?곸쑝濡??뚯뼱?щ┰?덈떎.'},
    {name:'?섎컯 ?붿콈', ingredients:'?섎컯, ?쇱쓬', reason:'遺됱??됱씠 ?ъ옣???뺢퀬 ?섎텇??怨쇰룄???댁쓣 ?앺?以띾땲??'},
    {name:'?먮そ ?먯씠??, ingredients:'?먮そ, ?꾩궛??, reason:'?뱀쑀???대쭧???ъ옣(?? 湲곗슫???덉젙?쒗궢?덈떎.'},
    {name:'?뚭퀬湲??≫쉶', ingredients:'?뚭퀬湲? 諛?, reason:'遺됱? ?댁퐫湲곌? ?ъ옣怨??덉븸??吏곸젒?곸씤 ?먮꼫吏瑜?以띾땲??'},
    {name:'?앸쪟 二쇱뒪', ingredients:'?앸쪟', reason:'遺됱? 鍮쏄퉼怨??덉숴?ъ숴?⑥씠 ?ъ옣 ?덇????앷린瑜?以띾땲??'},
    {name:'泥대━ ?瑜댄듃', ingredients:'泥대━, 諛媛猷?, reason:'遺됱? 怨쇱씪?????? 湲곗슫??遺?쒕읇寃?蹂댁땐?⑸땲??'},
    {name:'留ㅼ슫 ?〓낭??, ingredients:'怨좎텛?? ??, reason:'媛뺣젹??留ㅼ슫留쏆씠 ????댁뼱 ???? ?먮꼫吏瑜??쒗솚?쒗궢?덈떎.'},
    {name:'?μ＝', ingredients:'遺됱? ?? ?덉븣??, reason:'遺됱? ?μ씠 ?ъ옣???댁쓣 ?대━怨?遺湲곕? 鍮쇱쨳?덈떎.'},
    {name:'?곸?踰꾩꽢 利?, ingredients:'?곸?踰꾩꽢', reason:'?대쭧???ъ옣???몄븞?섍쾶 ?섍퀬 ?뺤떊??留묎쾶 ?⑸땲??'},
    {name:'移좊━ 肄?移대Ⅴ??, ingredients:'?뚭퀬湲? 移좊━鍮? ?좊쭏??, reason:'?④굅???닿린? 遺됱? 肄⑹씠 ???? 湲곗슫??媛뺣젰?섍쾶 ?먭레?⑸땲??'},
    {name:'蹂쇰줈?ㅼ젣 ?뚯뒪?', ingredients:'?뚭퀬湲??ㅼ쭚?? ?좊쭏???뚯뒪', reason:'遺됱? ?뚯뒪媛 ?ы삁愿怨꾨? 遺?쒕읇寃??뺤뒿?덈떎.'},
    {name:'?꾨몢由?移섑궓', ingredients:'??퀬湲? 遺됱? ?μ떊猷??뚰봽由ъ뭅 媛猷?', reason:'?붾뜒???닿린? 遺됱? ?μ떊猷뚭? ???? ?먮꼫吏瑜???컻?쒗궢?덈떎.'},
    {name:'?꾨씪鍮꾩븘???쒕꽕', ingredients:'?쒕꽕, ?좊쭏?? ?섑띁濡좎튂??, reason:'留ㅼ숴?섍퀬 遺됱? ?뚯뒪媛 ?ъ옣???댁젙???섏갼??以띾땲??'},
    {name:'移댁뭅??85% ?ㅽ겕珥덉퐳由?, ingredients:'移댁뭅??留ㅼ뒪', reason:'吏꾪븳 ?대쭧???ъ옣???덉젙?쒗궎怨?吏묒쨷?μ쓣 ?믪뿬以띾땲??'},
    {name:'?먯뒪?꾨젅???뱀? ?붿뭅?섏씤)', ingredients:'?먮몢', reason:'而ㅽ뵾 ?뱀쑀???대쭧? ???? 湲곗슫??源⑥슦???뱁슚?쎌엯?덈떎.'},
    {name:'?덈뱶 ???, ingredients:'?щ룄', reason:'?곷떦?됱쓽 遺됱? ??몄? ?ъ옣蹂묒쓣 ?덈갑?섍퀬 ?댁쓣 蹂댁땐?⑸땲??'},
    {name:'怨좎텛???쇨껸??, ingredients:'?쇨껸?? 怨좎텛???묐뀗', reason:'吏곹솕濡?援쎈뒗 留ㅼ숴??怨좉린媛 ?ъ옣???먮꼫吏瑜?理쒓퀬議곕줈 ?뚯뼱?щ┰?덈떎.'},
    {name:'媛?ㅽ뙆珥?(?됲넗留덊넗?ㅽ봽)', ingredients:'?좊쭏?? ?묓뙆, ?앹큹', reason:'?쒖썝??遺됱???梨꾩냼媛 ??????湲띿젙?곸씤 硫대쭔 ?≪닔?섍쾶 ?뺤뒿?덈떎.'}
  ],
  earth: [
    {name:'?⑦샇諛뺤＝', ingredients:'?⑦샇諛? 李뱀?', reason:'?몃??됯낵 ?⑤쭧??鍮꾩쐞(??瑜??몄븞?섍쾶 媛먯떥以띾땲??'},
    {name:'怨좉뎄留?留쏇깢', ingredients:'怨좉뎄留? 轅', reason:'泥쒖뿰 ?⑤쭧???뚰솕湲곕? ?쇳듉?섍쾶 ?섍퀬 ?먮꼫吏瑜?以띾땲??'},
    {name:'泥?뎅??李뚭컻', ingredients:'泥?뎅?? ?먮?', reason:'諛쒗슚??肄⑹쓽 ???? 湲곗슫???λ궡 ?섍꼍???덉젙?쒗궢?덈떎.'},
    {name:'移대젅?쇱씠??, ingredients:'媛뺥솴, 媛먯옄', reason:'?몃? 媛뺥솴???꾩옣???곕쑜?섍쾶 ?섍퀬 ?뚰솕瑜??뺤뒿?덈떎.'},
    {name:'諛붾굹???ㅻТ??, ingredients:'諛붾굹?? ?곗쑀', reason:'遺?쒕윭???⑤쭧??鍮꾩쐞(????湲댁옣????댁쨳?덈떎.'},
    {name:'?μ닔??踰꾪꽣援ъ씠', ingredients:'?μ닔?? 踰꾪꽣', reason:'?몃? ?뚮㏏?닿? ???? ?먮꼫吏瑜??좊뱺?섍쾶 梨꾩썙以띾땲??'},
    {name:'媛먯옄??, ingredients:'媛먯옄, ?앹슜??, reason:'?낆냽?먯꽌 ?먮? 媛먯옄媛 鍮꾩쐞瑜?蹂닿컯?섎뒗 ?뚮????앹옱猷뚯엯?덈떎.'},
    {name:'?뚭퀬湲?萸뉕뎅', ingredients:'?뚭퀬湲? 臾?, reason:'?뚭퀬湲곗쓽 ?⑤쭧???꾩옣???쇳듉?섍쾶 ?섍퀬 湲곕젰???щ┰?덈떎.'},
    {name:'留덉쬂', ingredients:'留? 轅', reason:'?덉쟻??裕ㅼ떊 ?깅텇???꾨꼍??蹂댄샇?섍퀬 ???? 湲곗슫???앹옣?쒗궢?덈떎.'},
    {name:'?쒖옣李뚭컻', ingredients:'?쒖옣, ?좏샇諛?, reason:'?꾪넻 諛쒗슚 ?앺뭹???숈쓽 湲곗슫??紐몄냽 源딆씠 ?꾨떖?⑸땲??'},
    {name:'?⑤Т李?, ingredients:'?⑤Т', reason:'鍮꾩쐞瑜??쇳듉?섍쾶 ?섍퀬 紐몄쓽 ?듦린瑜??쒓굅?섎뒗 ???곸썡?⑸땲??'},
    {name:'轅臾?, ingredients:'泥쒖뿰 轅', reason:'?쒖닔???⑤쭧???뚰솕湲곗뿉 利됯컖?곸씤 ?먮꼫吏瑜?怨듦툒?⑸땲??'},
    {name:'留앷퀬 ?щ젅??, ingredients:'留앷퀬, ?앺겕由?, reason:'?ъ숴?섍퀬 ?몃? 怨쇱쑁???꾩옣??遺?쒕읇寃??щ옒以띾땲??'},
    {name:'?뚰궓 ?뚯씠', ingredients:'?몃컯, ?쒕굹紐?, reason:'援ъ썙???몃컯???⑤쭧(????留덉쓬???몄븞?섍쾶 留뚮벊?덈떎.'},
    {name:'踰꾪꽣 移섑궓 而ㅻ━', ingredients:'移섑궓, 留덊겕???μ떊猷?, reason:'吏꾪븯怨??몃? ?μ떊猷뚭? 鍮꾩쐞瑜??ν? ?먮꼫吏瑜??묒쭛?⑸땲??'},
    {name:'?ㅻ??쇱씠??, ingredients:'怨꾨?, 蹂띠쓬諛?, reason:'?몃? 怨꾨? ?대텋???뚰솕湲곕? 遺?쒕읇寃?肄뷀똿?댁쨳?덈떎.'},
    {name:'?뚯뿉??, ingredients:'?덉슦, ?ы봽?, ?', reason:'?몃? ?ы봽?怨??(?????꾩옣???좊뱺?섍쾶 梨꾩썎?덈떎.'},
    {name:'轅 耳?댄겕 (硫붾룄鍮?', ingredients:'轅, ?ㅽ룿吏耳?댄겕', reason:'轅??已?앺븳 ?⑤쭧??泥대젰??湲됯꺽???뚯뼱?щ┰?덈떎.'},
    {name:'?뚯씤?좏뵆 蹂띠쓬諛?, ingredients:'?뚯씤?좏뵆, 諛?, reason:'?뚰솕瑜??뺣뒗 ?뚯씤?좏뵆怨??꾩닔?붾Ъ???댁긽?곸씤 ???? 議고빀?낅땲??'},
    {name:'?щ┝ 釉뚮쪊??, ingredients:'諛붾땺??鍮? ?ш? ?몃Ⅸ??, reason:'?몃Ⅸ?먯쓽 ?곸뼇怨??꾩뿉 ?щ씪媛??ㅽ깢???꾩옣???④린瑜?以띾땲??'},
    {name:'?먭렇 ?瑜댄듃', ingredients:'怨꾨?, ?섏씠?ㅽ듃由?, reason:'?몃옑怨??ъ숴???붿??멸? 臾대꼫吏?以묒떖(?????≪븘以띾땲??'}
  ],
  metal: [
    {name:'?꾨씪吏 臾댁묠', ingredients:'?꾨씪吏, 怨좎텛??, reason:'?곗깋怨?留ㅼ슫留쏆씠 ????? 湲곌?吏瑜??쇳듉?섍쾶 ?⑸땲??'},
    {name:'諛곗닕', ingredients:'諛? 轅', reason:'??怨쇱쑁???먯쓽 ?댁쓣 ?대━怨?湲곗묠??硫롪쾶 ?⑸땲??'},
    {name:'?묓뙆 蹂띠쓬', ingredients:'?묓뙆, 媛꾩옣', reason:'留ㅼ슫留쏆씠 ????댁뼱 ???? 湲곗슫???쒗솚?쒗궢?덈떎.'},
    {name:'留덈뒛 ?듦뎄??, ingredients:'留덈뒛, ?щ━釉뚯쑀', reason:'媛뺣젰??留ㅼ슫留쏆씠 湲??? ?먮꼫吏瑜??묒텞?쒖폒 硫댁뿭?μ쓣 ?믪엯?덈떎.'},
    {name:'??갚??, ingredients:'??퀬湲? ?몄궪', reason:'??怨좉린媛 ?먮? 蹂댄븯怨?湲곕젰???뚯뼱?щ┰?덈떎.'},
    {name:'諛깃?移?, ingredients:'諛곗텛, ?뚭툑', reason:'?먭레?곸씠吏 ?딆? ??梨꾩냼媛 ????? ?섍꼍??媛쒖꽑?⑸땲??'},
    {name:'移섏쫰 ?먮윭??, ingredients:'移섏쫰, ?좊쭏??, reason:'???좎젣?덉씠 湲??? 湲곗슫??遺?쒕읇寃?蹂댁땐?⑸땲??'},
    {name:'?앷컯李?, ingredients:'?앷컯, ?異?, reason:'?뚯떥??留ㅼ슫留쏆씠 ?먮? ?곕쑜?섍쾶 ?섍퀬 媛먭린瑜??덈갑?⑸땲??'},
    {name:'臾댁깮梨?, ingredients:'臾? ??, reason:'?곗깋 梨꾩냼媛 ?뚰솕瑜??뺢퀬 ?먯쓽 湲곗슫??留묎쾶 ?⑸땲??'},
    {name:'?곗쑀 ????, ingredients:'?곗쑀', reason:'?쒕갚???먮꼫吏媛 湲??? 湲곗슫??李⑤텇?섍쾶 梨꾩썙以띾땲??'},
    {name:'?붾뜒援ъ씠', ingredients:'?붾뜒, 李멸린由?, reason:'湲곌?吏 ?먮쭑???쇳듉?섍쾶 ?섏뿬 ????瑜?蹂댄샇?⑸땲??'},
    {name:'?곌렐 臾댁묠', ingredients:'?곌렐, ?묒엫??, reason:'??肉뚮━梨꾩냼媛 ?먯쓽 吏꾩븸??蹂댁땐?댁쨳?덈떎.'},
    {name:'?щ옩 李⑥슦??, ingredients:'議곌컻?ㅽ봽, ?щ┝, 媛먯옄', reason:'??吏꾩븸???먯? ??μ쓽 嫄댁“?⑥쓣 留됱븘以띾땲??'},
    {name:'?뚮━???щ━???뚯뒪?', ingredients:'留덈뒛 ?щ퓤, ?щ━釉뚯쑀', reason:'留덈뒛??留ㅼ슫留??????명씉湲곗뿉 ?쒕젰??以띾땲??'},
    {name:'肄쒕━?뚮씪???⑤젅', ingredients:'肄쒕━?뚮씪?? 踰꾪꽣', reason:'?곗뼱???곗깋 梨꾩냼媛 臾듭쭅?섍쾶 ?먮? ?ㅽ깮?섍쾶 ?⑸땲??'},
    {name:'源뚮Ⅴ蹂대굹???뚯뒪?', ingredients:'移섏쫰, 踰좎씠而?, reason:'???뚯뒪??吏꾪븳 ?먮꼫吏媛 湲??????먮꼫吏瑜??ㅼ쭛?덈떎.'},
    {name:'媛덈┃ 踰꾪꽣 ?덉슦', ingredients:'留덈뒛, ?덉슦', reason:'留덈뒛(??怨??댁궛臾쇱씠 寃고빀??硫댁뿭?μ쓣 諛곌??쒗궢?덈떎.'},
    {name:'?붿씠?????, ingredients:'泥?룷??, reason:'留묒? 諛깊룷?꾩＜媛 ?ㅽ듃?덉뒪瑜?媛?쇱븠?덇퀬 ?쒗솚???뺤뒿?덈떎.'},
    {name:'?援??ㅻ툙 援ъ씠', ingredients:'?곗궡 ?앹꽑, ?덈が', reason:'湲곕쫫湲??녿뒗 ????????留묒? ?먮꼫吏瑜?怨듦툒?⑸땲??'},
    {name:'?ｌ＝', ingredients:'?? ?', reason:'?먮? ?ㅽ깮?섍쾶 ?섎뒗 ????怨??곕튆???명씉湲?理쒓퀬 蹂댁빟?낅땲??'},
    {name:'諛붾땺???꾩씠?ㅽ겕由?, ingredients:'諛붾땺?? ?щ┝', reason:'遺?쒕윭??諛깆깋 ?⑤쭧??湲??? ?깊뼢???덈??⑥쓣 ?뱀뿬?낅땲??'}
  ],
  water: [
    {name:'誘몄뿭援?, ingredients:'誘몄뿭, ?뚭퀬湲?, reason:'寃? ?댁“瑜섏? 吏좊쭧???좎옣(麗? 湲곗슫??媛뺥븯寃?蹂댁땐?⑸땲??'},
    {name:'寃?肄?諛?, ingredients:'寃?肄? ?', reason:'釉붾옓?몃뱶???紐낆궗濡??좎옣怨?諛⑷킅???쇳듉?섍쾶 ?⑸땲??'},
    {name:'?μ뼱 援ъ씠', ingredients:'?μ뼱, ?앷컯', reason:'臾쇱냽??媛뺥븳 ?ㅽ깭誘몃굹媛 ??麗? ?먮꼫吏瑜???컻?쒗궢?덈떎.'},
    {name:'?묒엫?먯＝', ingredients:'寃?源? ?', reason:'寃?源④? ?좎옣???뺤닔(暎얏객)瑜?梨꾩썙 ?명솕瑜?諛⑹??⑸땲??'},
    {name:'?대Ъ??, ingredients:'?ㅼ쭠?? ?덉슦', reason:'諛붾떎??吏좊쭧怨??먮꼫吏媛 ??麗? 湲곗슫??吏곸젒?곸쑝濡?怨듦툒?⑸땲??'},
    {name:'援?援?갈', ingredients:'援? 遺異?, reason:'諛붾떎???곗쑀??遺덈━硫??좎옣???뚭린瑜?蹂댁땐?섎뒗 理쒓퀬 ?앹옱猷뚯엯?덈떎.'},
    {name:'?꾨났 踰꾪꽣援ъ씠', ingredients:'?꾨났, 踰꾪꽣', reason:'源딆? 諛붾떎???먮꼫吏媛 ??麗? 湲곗슫??怨좉툒?ㅻ읇寃?梨꾩썎?덈떎.'},
    {name:'?ㅼ떆留???, ingredients:'?ㅼ떆留? 珥덉옣', reason:'?댁“瑜섏쓽 誘몃꽕?꾩씠 ?좎옣(麗? 湲곕뒫???먰솢?섍쾶 ?⑸땲??'},
    {name:'源遺媛?, ingredients:'源, 李뱀?', reason:'媛蹂띻쾶 利먭만 ???덈뒗 釉붾옓?몃뱶濡???麗? 湲곗슫???뺤뒿?덈떎.'},
    {name:'?ㅼ쭠??癒밸Ъ ?뚯뒪?', ingredients:'?ㅼ쭠??癒밸Ъ, 硫?, reason:'寃? 癒밸Ъ???좎옣(麗? ?먮꼫吏瑜??쒓컖?? 誘멸컖?곸쑝濡?梨꾩썎?덈떎.'},
    {name:'?쇱?怨좉린 ?섏쑁', ingredients:'?쇱?怨좉린, ?쒖옣', reason:'?쇱?怨좉린????麗???諛곗냽?섏뼱 ?좎옣??吏꾩븸??蹂댁땐?⑸땲??'},
    {name:'?곗뿁李?, ingredients:'?곗뿁', reason:'?좎옣 湲곕뒫???꾩? ?대눊 ?묒슜???먰솢?섍쾶 ?⑸땲??'},
    {name:'罹먮퉬??源뚮굹??, ingredients:'罹먮퉬?? ?щ옒而?, reason:'?묒텞??諛붾떎??吏좊쭧怨??앸챸?μ씠 ?뚮?????麗? ?먯썝?낅땲??'},
    {name:'硫붾? ?뚮컮', ingredients:'硫붾?硫? 易붿쑀', reason:'易붿쑀??吏?ℓ?④낵 李④????깆쭏???볦뼱?ㅻⅤ???댁쓣 ?좎옱?곷땲??'},
    {name:'?곗뼱 ?ㅽ뀒?댄겕', ingredients:'?곗뼱, ???덈툕)', reason:'源딆? 臾쇱냽???ㅼ뾼移섎뒗 ?곗뼱??湲곕쫫湲곌? ??麗?瑜?梨꾩썎?덈떎.'},
    {name:'?대옩 李⑥슦??議곌컻李?, ingredients:'諛붿??? ?붿씠?몄???, reason:'議곌컻??媛먯튌留쏄낵 吏좉린?댁씠 ?좎옣??蹂댁뼇?⑸땲??'},
    {name:'李몄튂 ?ъ?', ingredients:'?앹갭移? 媛꾩옣?뚯뒪, ?댁“瑜?, reason:'?ы빐???앸챸?κ낵 媛꾩옣??吏좊쭧???꾩＜ 醫뗭? 議고솕瑜??대９?덈떎.'},
    {name:'釉붾옓 ?щ━釉???섎굹??, ingredients:'釉붾옓 ?щ━釉? 耳?댄띁', reason:'吏?“由꾪븳 寃? ?щ━釉??섏씠?ㅽ듃媛 ??麗? ?먮꼫吏瑜??뗭썎?덈떎.'},
    {name:'?꾩궗?대낵', ingredients:'?꾩궗?대쿋由? 寃ш낵瑜?, reason:'蹂대옃鍮?寃?????궛??踰좊━媛 ?좎옣怨??덇???泥?냼?댁쨳?덈떎.'},
    {name:'媛꾩옣 寃뚯옣', ingredients:'苑껉쾶, 媛꾩옣', reason:'?꾪넻 吏좊쭧??理쒓컯?먮줈 ?껋뼱踰꾨┛ ??麗? 湲곗슫???낅쭧???섏갼?듬땲??'},
    {name:'?꾨젅泥?, ingredients:'諛媛猷? 援듭? ?뚭툑', reason:'?쒕㈃???뚭툑(?? ?뚭갚?닿? 利됯컖?곸쑝濡?吏좊쭧???꾨떖?섏뿬 媛덉쬆???됰땲??'}
  ]
};

var HEALTH_EXERCISE_DB = {
  wood: {
    name: '?좎뿰??& ?ㅽ듃?덉묶',
    desc: '紐??? 湲곗슫? 六쀬뼱?섍????깆쭏???덉뒿?덈떎. 洹쇱쑁怨??몃?瑜?湲멸쾶 ?섎젮二쇰뒗 ?대룞??醫뗭뒿?덈떎.',
    types: ['?붽?', '?꾨씪?뚯뒪', '留⑤じ ?ㅽ듃?덉묶', '媛踰쇱슫 ?깆궛', '?뀁냽 ?곗콉'],
    stretch: '?묓뙏???꾨줈 彛?六쀪퀬 ?녾뎄由щ? 湲멸쾶 ?섎젮二쇰뒗 "諛섎떖 ?먯꽭"濡?媛???寃쎈씫???먭레?섏꽭??'
  },
  fire: {
    name: '?щ컯??UP ?좎궛??,
    desc: '???? 湲곗슫? ??컻?섍퀬 ????대뒗 ?깆쭏?낅땲?? ?ъ옣???곌쾶 ?섎뒗 ?숈쟻???대룞??醫뗭뒿?덈떎.',
    types: ['?щ떇', '?먯뼱濡쒕퉭', '以뚮컮 ?꾩뒪', '?뚮땲??, '諛곕뱶誘쇳꽩'],
    stretch: '媛?댁쓣 ?쒖쭩 ?닿퀬 ???ㅻ줈 源띿?瑜??쇰뒗 "媛???닿린 ?ㅽ듃?덉묶"?쇰줈 ?ъ옣 寃쎈씫???댁뼱二쇱꽭??'
  },
  earth: {
    name: '肄붿뼱 & 洹몃씪?대뵫',
    desc: '???? 湲곗슫? 以묒떖???↔퀬 ?덉젙?쒗궎???깆쭏?낅땲?? 肄붿뼱瑜??⑤젴?섍퀬 ?낃낵 ?묒??섎뒗 ?대룞??醫뗭뒿?덈떎.',
    types: ['?뚮옲??, '留⑤컻 嫄룰린(?댁떛)', '?대씪?대컢', '?⑥씠???몃젅?대떇', '肄붿뼱 諛몃윴??],
    stretch: '諛붾떏???꾩썙 臾대쫷??媛?댁쑝濡??밴린??"諛붾엺 鍮쇨린 ?먯꽭"濡?鍮꾩쐞(?뚰솕湲?瑜??몄븞?섍쾶 留덉궗吏?섏꽭??'
  },
  metal: {
    name: '?명씉 & 吏묒쨷??,
    desc: '湲??? 湲곗슫? ?섎졃?섍퀬 洹쒖튃?곸씤 ?깆쭏?낅땲?? ?명씉???듭젣?섍퀬 吏묒쨷?μ쓣 ?뷀븯???대룞??醫뗭뒿?덈떎.',
    types: ['紐낆긽 ?명씉', '寃??, '蹂듭떛', '?먯쟾嫄??湲?, '湲곌났/?쒓레沅?],
    stretch: '?묓뙏???ㅻ줈 六쀬뼱 媛?닿낵 ?닿묠 ?욎そ???섎젮二쇰뒗 ?숈옉?쇰줈 ?먰솢?됱쓣 洹밸??뷀븯?몄슂.'
  },
  water: {
    name: '?섏쨷 ?대룞 & ?댁셿',
    desc: '??麗? 湲곗슫? ?먮Ⅴ怨??좎뿰???깆쭏?낅땲?? 臾쇨낵 ?④퍡?섍굅??愿?덉뿉 臾대━媛 ?녿뒗 ?대룞??醫뗭뒿?덈떎.',
    types: ['?섏쁺', '?꾩퓼?꾨줈鍮?, '?쒗븨', '諛섏떊?????ㅽ듃?덉묶', '?쒓레沅?],
    stretch: '?됱븘??諛쒕걹???ν빐 ?곸껜瑜??숈씠??"?꾧뎬 ?먯꽭"濡??덈━? ?좎옣(諛⑷킅) 寃쎈씫???댁셿?쒗궎?몄슂.'
  }
};

var GAEUN_DB={
  fire:{
    good:{love:'?댁젙?곸씤 留뚮궓???쒓린. ?곴레?곸쑝濡??ㅺ?媛?몄슂. 遺됱???怨꾩뿴 ?섏긽??留ㅻ젰???믪엯?덈떎.',wealth:'?ъ뾽 ?뺤옣, ?ъ옄 ?곴린. ?뱁엳 IT, ?먮꼫吏 遺꾩빞媛 ?좊쭩?⑸땲??',relationship:'由щ뜑??씠 鍮쏅굹???쒓린. 二쇰???湲띿젙 ?먮꼫吏瑜??섎닠二쇱꽭??',career:'?뱀쭊, ?댁쭅 湲고쉶媛 留롮뒿?덈떎. ?꾨젅?좏뀒?댁뀡 ?λ젰??諛쒗쐶?섏꽭??',health:'?ъ옣, ?덉븬 ?섑샇 以묒슂. 怨쇰줈 二쇱쓽?섍퀬 異⑸텇???댁떇 ?꾩슂.',lifestyle:'?⑦뼢 嫄곗떎, 遺됱????뚰뭹, 罹좏븨?대굹 BBQ ??遺덉쓣 ?ㅻ（???ш??쒕룞 異붿쿇.'},
    bad:{love:'媛먯젙 湲곕났 二쇱쓽. 湲됲븯寃?寃곗젙?섏? 留먭퀬 ?쒓컙???먭퀬 ?먮떒?섏꽭??',wealth:'異⑸룞 ?뚮퉬 寃쎄퀎. ?ш린???ъ옄???쇳븯怨??덉쟾?먯궛 ?좏샇.',relationship:'留먮떎??議곗떖. ???쒗룷 ?ъ뿀????뷀븯???듦? 湲곕Ⅴ湲?',career:'?곸궗? 異⑸룎 媛?μ꽦. 媛먯젙 議곗젅 ?꾩닔. 硫섑넗 議곗뼵 援ы븯湲?',health:'?ㅽ듃?덉뒪???먰넻, 遺덈㈃利?二쇱쓽. 紐낆긽, ?붽?濡?留덉쓬 ?ㅼ뒪由ш린.',lifestyle:'?쒖썝???섏쁺, 臾쇨? ?곗콉 異붿쿇. ?뚮??? 寃????섏긽?쇰줈 湲곗슫 議곗젅.'}
  },
  water:{
    good:{love:'源딆씠 ?덈뒗 媛먯젙 援먮쪟???쒓린. 吏꾩떎????붾줈 愿怨?源딆뼱吏묐땲??',wealth:'?좏넻, 臾쇰쪟, 肄섑뀗痢?遺꾩빞 ?ъ옄 ?좊쭩. ?꾧툑 ?좊룞???뺣낫 ?쒓린.',relationship:'寃쎌껌 ?λ젰??鍮쏅굹硫??좊ː ?볤린 醫뗭? ?? ?ㅽ듃?뚰궧 ?쒕컻.',career:'湲고쉷, 泥쒓린 ?낅Т?먯꽌 ??웾 諛쒗쐶. ?댁쇅 ?낅Т 湲고쉶 利앷?.',health:'?좎옣, 諛⑷킅 耳?? 異⑸텇???섎텇 ??랬? ?곕쑜?섍쾶 蹂댁삩.',lifestyle:'遺곹뼢 怨듦컙, 寃??됀룻뙆????명뀒由ъ뼱. ?⑥쿇, ?대? ?ы뻾 異붿쿇.'},
    bad:{love:'?곗쑀遺?⑦븿 二쇱쓽. 紐낇솗???섏궗?쒗쁽 ?꾩슂. 怨쇨굅???쎈ℓ?댁? 留먭린.',wealth:'?덉쓽 ?먮쫫 遺덉븞?? 怨쇱냼鍮?寃쎄퀎?섍퀬 鍮꾩긽湲??뺣낫.',relationship:'?뚭레???쒕룄 媛쒖꽑 ?꾩슂. 癒쇱? ?ㅺ?媛???⑷린 ?닿린.',career:'?곗슱媛? 臾닿린??二쇱쓽. ?묒? 紐⑺몴 ?ㅼ젙?섍퀬 ?깆랬媛??볤린.',health:'?됱쬆, ?쒗솚湲?怨꾪넻 二쇱쓽. ?대룞?쇰줈 泥댁삩 ?щ━怨??곕쑜???뚯떇 ??랬.',lifestyle:'?뉖퀡 弛먭린, ?곕쑜??李?留덉떆湲? 遺됱???怨꾩뿴 ?뚰뭹?쇰줈 ?쒕젰 ?뷀븯湲?'}
  },
  wood:{
    good:{love:'?먯뿰?ㅻ윭??留뚮궓怨??깆옣?섎뒗 愿怨? ?④퍡 諛곗슦怨?諛쒖쟾?섎뒗 而ㅽ뵆.',wealth:'援먯쑁, 臾명솕, 諛붿씠??遺꾩빞 ?ъ옄 ?좊쭩. ?κ린 ?깆옣 泥쒓린 ?섎┰.',relationship:'?ъ슜?μ쑝濡?二쇰????몄븞?섍쾶. 硫섑넗 ??븷 湲고쉶 留롮쓬.',career:'?덈줈???꾨줈?앺듃 ?쒖옉 ?곴린. ?숈뒿, ?먭꺽利?痍⑤뱷 異붿쿇.',health:'媛? ?대궘 嫄닿컯 ?섑샇. ?ㅽ듃?덉묶怨??붽?濡??좎뿰???ㅼ슦湲?',lifestyle:'?숉뼢 怨듦컙, ?뱀깋 ?앸Ъ ?ㅼ슦湲? ?뀁냽 ?곗콉, ?깆궛 異붿쿇.'},
    bad:{love:'?댁긽留??믨퀬 ?ㅼ쿇 遺議?二쇱쓽. ?꾩떎???좏깮怨??됰룞 ?꾩슂.',wealth:'怨꾪쉷留??몄슦怨??ㅽ뻾 遺議? ?묒? 寃껊????쒖옉?섍린.',relationship:'怨좎쭛 遺由ъ? 留먭퀬 ??묒젏 李얘린. ?좎뿰???ш퀬 ?꾩슂.',career:'?꾨꼍二쇱쓽 踰꾨━湲? 70% ?꾩꽦?꾩뿉???ㅽ뻾?섎뒗 ?⑷린.',health:'?뚰솕湲?怨꾪넻 二쇱쓽. 怨쇱떇 ?쇳븯怨?洹쒖튃???앹궗 ?듦?.',lifestyle:'湲덉냽 ?뚰뭹 ?쒖슜. ?쒖そ ?뉗궡 諛쏄린. 誘몃땲硫 ?쇱씠?꾩뒪???吏??'}
  },
  metal:{
    good:{love:'紐낇솗??愿怨??뺣┰ ?쒓린. 寃고샎, ?쎌냽 ???뺤젙??寃곗젙 ?곴린.',wealth:'湲덉쑖, 遺?숈궛, 踰뺣쪧 遺꾩빞 湲고쉶. 怨꾩빟??寃??泥좎???',relationship:'?먯튃怨?怨듭젙?⑥쑝濡??좊ː ?살쓬. 以묒옱????븷 ?곹빀.',career:'?섑샇, 媛먮룆 ?낅Т ??웾 諛쒗쐶. ?깃턿 吏꾨쾿 援ъ텞 ?꾨줈?앺듃 ?깃났.',health:'?? ???嫄닿컯 梨숆린湲? ?명씉湲?吏덊솚 ?덈갑 ?꾩닔.',lifestyle:'?쒗뼢 怨듦컙, ?곗깋쨌?뚯깋 ?명뀒由ъ뼱. ?뺣━?뺣룉?쇰줈 湲곗슫 ?곸듅.'},
    bad:{love:'?덈Т 李④컩嫄곕굹 ?됱젙???쒕룄 二쇱쓽. 媛먯꽦??援먮쪟 ?몃젰.',wealth:'吏?섏튇 ?덉빟? ?? ?꾩슂??怨녹뿏 怨쇨컧???ъ옄 ?꾩슂.',relationship:'鍮꾪뙋???쒖꽑 以꾩씠湲? 移?갔怨?寃⑸젮 癒쇱? ?섍린.',career:'?듯넻??遺議?媛쒖꽑. ?뚮줎 ?먯튃蹂대떎 愿怨꾧? 以묒슂.',health:'嫄댁“??二쇱쓽. 媛?듦린 ?ъ슜, ?섎텇 ?щ┝?쇰줈 蹂댁뒿.',lifestyle:'?곕쑜???됯컧 ?뚰뭹 異붽?. 媛먯꽦 ?곹솕, ?뚯븙?쇰줈 留덉쓬 ?닿린.'}
  },
  earth:{
    good:{love:'?덉젙??愿怨??좎?. 媛議?媛숈? ?몄븞?? ?숆굅, 寃고샎 ?곴린.',wealth:'遺?숈궛, 嫄댁꽕, ?앺뭹 遺꾩빞 ?좊쭩. ?異뺢낵 ?먯궛 異뺤쟻 ?쒓린.',relationship:'?좊ː諛쏅뒗 議곕젰?? 二쇰????좊뱺??踰꾪?紐???븷.',career:'袁몄??⑥씠 ?몄젙諛쏆쓬. ?κ린 ?꾨줈?앺듃 ?꾩닔 ?λ젰 諛쒗쐶.',health:'?꾩옣, 鍮꾩옣 嫄닿컯 梨숆린湲? 洹쒖튃???앺솢 ?듦? 以묒슂.',lifestyle:'以묒븰 諛곗튂, ?몃??됀룰컝?????명뀒由ъ뼱. ?꾩삁, ?붾━ 痍⑤? 異붿쿇.'},
    bad:{love:'吏猷⑦븿 ?덊뵾 ?꾩슂. ?덈줈???곗씠??肄붿뒪, ?대깽??湲고쉷.',wealth:'蹂???먮젮??留먭린. ?덈줈???섏씡 紐⑤뜽 ?먯깋 ?꾩슂.',relationship:'?먯뇙???쒕룄 媛쒖꽑. ?덈줈???몃㎘ ?뺤꽦 ?몃젰.',career:'?덉＜?섏? 留먭퀬 ?꾩쟾. ?먭린怨꾨컻 ?ъ옄 ?쒖옉.',health:'泥댁쨷 ?섑샇, ?밸눊 二쇱쓽. ?좎궛???대룞 洹쒖튃?곸쑝濡?',lifestyle:'?쒕룞???ш? ?섎━湲? ?ы뻾, ?덈줈???μ냼 ?먰뿕 異붿쿇.'}
  }
};

/* ??? ?먮??먯닔 12沅??곗씠????? */
var MING_GONG={
  '野?:{title:'?먮?(榮ュ쒜) ??吏?꾩옄??,desc:'?곗뼱??移대━?ㅻ쭏? 二쇱껜?깆쓣 ?怨좊궗?듬땲?? ?대뼡 ?곹솴?먯꽌??以묒떖???〓뒗 由щ뜑??씠 ?먯뿰?ㅻ읇寃?諛쒗쐶?섎ŉ, ?щ엺?ㅼ? 臾댁쓽?앹쟻?쇰줈 ?뱀떊?먭쾶 湲곕?怨??띠뼱?⑸땲?? ?꾧퀬?⑥씠 ?멸컙愿怨꾩쓽 ?λ꼍???????덉쑝??遺?쒕윭???諛곗슱 ??吏꾩젙???대Ⅸ???⑸땲??',tags:['吏?꾩옄','移대━?ㅻ쭏','?낅┰??]},
  '??:{title:'?먮옉(縕ょ떬) ??留ㅻ젰쨌李쎌“??,desc:'?섏튂??媛먭컖怨??덉닠???щ뒫???뱀떊??臾닿린?낅땲?? ?щ엺???먯뿰?ㅻ읇寃??뚯뼱?밴린??留ㅻ젰???덇퀬 ?덈줈??寃껋쓣 ?먭뎄?섎뒗 ?먮꼫吏媛 媛뺥빀?덈떎. 利먭굅???醫뉖떎 諛⑺뼢?깆쓣 ?껋쓣 ???덉쑝??紐⑺몴?섏떇???④퍡 媛吏??寃껋씠 ?듭떖?낅땲??',tags:['留ㅻ젰','?먭뎄??,'李쎌“??]},
  '渦?:{title:'嫄곕Ц(藥③?) ???듭같쨌遺꾩꽍??,desc:'源딆? ?ш퀬?κ낵 ?덈━???듭같?μ쓣 吏??遺꾩꽍媛?낅땲?? 吏꾩떎??轅곕슟???몄뼱? 湲?곌린???щ뒫???덉쑝硫??쒕쾲 誘우쓬???볦씠硫??됱깮???좊ː 愿怨꾨? 留뚮뱾?대깄?덈떎. ?섏떖??留롮븘 醫뗭? 湲고쉶瑜??섎젮蹂대궪 ???덉쑝??吏곴????④퍡 誘우뼱二쇱꽭??',tags:['?듭같','遺꾩꽍','?몄뼱??]},
  '藥?:{title:'泥쒖긽(鸚⑴쎑) ??議고솕쨌?묐젰??,desc:'?щ엺怨??щ엺???뉖뒗 ?곗뼱??議고솕濡쒖????덉뒿?덈떎. 怨듭젙?섍퀬 ?곕쑜???깊뭹?쇰줈 紐⑤뱺 ?댁뿉寃??좊ː瑜?諛쏆쑝硫?媛덈벑??以묒옱?섎뒗 ?λ젰???곸썡?⑸땲?? ?⑥쓣 ?꾪빐 ?먯떊???ъ깮?섎뒗 寃쏀뼢???덉쑝???먯떊??寃쎄퀎瑜?吏?ㅻ뒗 ?곗뒿???꾩슂?⑸땲??',tags:['議고솕','怨듭젙??,'諛곕젮']},
  '??:{title:'泥쒕룞(鸚⒴릪) ???됲솕쨌?됰났??,desc:'?띠쓽 ?됰났怨?媛먯궗瑜??먯뿰?ㅻ읇寃??먮겮???밸퀎???λ젰??媛議뚯뒿?덈떎. ?숈쿇?곸씤 湲곗슫?쇰줈 二쇰???諛앺엳硫??쒖닔?⑥씠 ?됱깮??留ㅻ젰 ?ъ씤?몄엯?덈떎. ?덉＜?섎젮???깊뼢???덉뼱 ?뚮줈???ㅼ뒪濡쒕? ??諛?대텤?대뒗 ?⑷린媛 ?꾩슂?⑸땲??',tags:['?됲솕','?숈쿇??,'?쒖닔??]},
  '??:{title:'?쇱젙(兩됭쿉) ???댁젙쨌泥쒓린??,desc:'媛뺣젹???댁젙怨??됱쿋??泥쒓린媛 怨듭〈?섎뒗 ?낇듅??議고빀?낅땲?? 紐⑺몴瑜??ν븳 吏묐뀗??媛뺥븯怨?遺덉쓽??留욎꽌???⑷린媛 ?덉뒿?덈떎. ?묐갚?쇰━媛 媛뺥빐 愿怨꾩뿉???곸쿂瑜?二쇨퀬諛쏆쓣 ???덉쑝???좎뿰?⑥쓣 ?ㅼ썙媛?몄슂.',tags:['?댁젙','泥쒓린','異붿쭊??]},
  '??:{title:'泥쒕?(鸚⒴틵) ???띿슂쨌?덉젙??,desc:'?먯뿰?ㅻ읇寃??띿슂瑜??뚯뼱?밴린??蹂듭쓽 湲곗슫???怨좊궗?듬땲?? ?꾩떎?곸씤 ?먮떒?μ씠 ?곗뼱?섍퀬 ?щЪ???ㅻ（??媛먭컖??醫뗭뒿?덈떎. 蹂?붾낫???덉젙???좏샇?섎뒗 蹂댁닔???깊뼢???덉뼱 ?덈줈??湲고쉶 ?욎뿉???⑷린 ?덈뒗 ??嫄몄쓬???꾩슂?⑸땲??',tags:['?띿슂','?덉젙','?꾩떎媛먭컖']},
  '??:{title:'?쒖쓬(鸚ら솻) ??媛먯닔?굿룹쭅愿??,desc:'?ъ꽭??媛먯닔?깃낵 源딆? ?대㈃?멸퀎瑜?媛吏?遺꾩엯?덈떎. ?꾨쫫?ㅼ???諛쒓껄?섎뒗 ?덉씠 ?곸썡?섍퀬 媛뺥븳 吏곴??쇰줈 ?곹솴??蹂몄쭏??轅곕슟?듬땲?? 媛먯젙???뚮룄媛 ?????덉쑝???먯떊??媛먯젙??李쎌쓽?곸쑝濡??쒗쁽?섎뒗 異쒓뎄瑜?留뚮뱾?대몢?몄슂.',tags:['媛먯닔??,'吏곴?','?щ???]},
  '??:{title:'?먮옉 蹂?????꾩쟾쨌媛쒗쁺??,desc:'湲곗〈 ???源⑤뒗 ?곸떊?곸씤 ?먮꼫吏媛 ?섏묩?덈떎. ?덈줈??遺꾩빞??????먭뎄?ш낵 ?꾩쟾 ?뺤떊??媛뺥븯硫??덉긽移?紐삵븳 諛⑺뼢?먯꽌 ?깃났??嫄곕몢??寃쎌슦媛 留롮뒿?덈떎. ?덇린瑜?湲곕Ⅸ?ㅻ㈃ ?낅낫?곸씤 ?꾩튂瑜?留뚮뱾 ???덉뒿?덈떎.',tags:['?꾩쟾','?곸떊','?먭뎄']},
  '雅?:{title:'臾닿끝(閭?쎊) ???낅┰쨌?ㅽ뻾??,desc:'媛뺤씤???섏?? ?낅┰?곸씤 ?ㅽ뻾?μ쓣 ?怨좊궃 ?됰룞?뚯엯?덈떎. 留먮낫???됰룞?쇰줈 利앸챸?섎뒗 ?ㅽ??쇱씠硫??쒕쾲 寃곗떖?섎㈃ ?앷퉴吏 諛怨??섍????앹떖???덉뒿?덈떎. 怨좎쭛???몄뼱 ?꾩???嫄곗젅?섎뒗 寃쏀뼢???덉쑝???뚮줈????몄쓽 ?먯쓣 ?〓뒗 ?ъ쑀瑜?媛?몃낫?몄슂.',tags:['?낅┰??,'?ㅽ뻾??,'?앹떖']},
  '耶?:{title:'?뚭뎔(?닺퍖) ??蹂?겶룰컻泥숉삎',desc:'???곹깭???덉＜?섏? ?딅뒗 媛뺣젹??媛쒖쿃?먯쓽 湲곗쭏???덉뒿?덈떎. ?≪? 寃껋쓣 遺?섍퀬 ?덈줈???멸퀎瑜??щ뒗 ?좉뎄????낆쑝濡??몄깮??援듭쭅??蹂?섏젏?먯꽌 鍮쏅굹??遺꾩엯?덈떎. ?뚭눼?곸씤 ?먮꼫吏瑜?李쎌“?곸쑝濡??꾪솚?섎뒗 踰뺤쓣 ?듯옄 ??吏꾧?瑜?諛쒗쐶?⑸땲??',tags:['媛쒖쿃','蹂??,'?좉뎄??]},
  '訝?:{title:'泥쒓린(鸚⒵찣) ??吏?쑣룹쿇湲고삎',desc:'誘쇱꺽???먮뇤? ?곗뼱??泥쒓린???ш퀬瑜?媛吏?遺꾩엯?덈떎. ?ㅼ뼇??遺꾩빞????꼻? 吏?앹쓣 媛뽰텛怨??곹솴 蹂?붿뿉 鍮좊Ⅴ寃??곸쓳?⑸땲?? ?앷컖???덈Т 留롮븘 ?곕쭔??蹂댁씪 ???덉쑝??吏묒쨷?섍퀬 ?띠? ??媛吏瑜?源딄쾶 ?뚭퀬?쒕뒗 ?쒓컙???꾩슂?⑸땲??',tags:['吏??,'誘쇱꺽??,'泥쒓린']}
};
var BODEOK={
  wood:{star:'泥쒓린??鸚⒵찣??',title:'?깆옣怨??먭뎄?먯꽌 ?됰났 李얘린',desc:'?덈줈??吏?앹쓣 ?듬뱷?섍퀬 ?먯뿰怨?媛源뚯씠????媛?????뺤떊??異⑸쭔?⑥쓣 ?먮겮???좏삎?낅땲?? ?낆꽌, ?ы뻾, 諛곗????곗냽???뱀떊???곹샎???댁컡?곷땲?? ?뺤껜?섏뼱 ?덈떎怨??먮굜 ?뚭? 媛???섎뱺 ?쒓린?대?濡???긽 ?깆옣??諛⑺뼢???ν빐 ?덉뼱???⑸땲??'},
  fire:{star:'?쒖뼇??鸚ら쇋??',title:'?쒗쁽怨??섎닎?먯꽌 ?됰났 李얘린',desc:'?먯떊???앷컖怨??댁젙???쒗쁽?섍퀬 二쇰????먮꼫吏瑜??섎닃 ???됰났???먮겮???좏삎?낅땲?? 臾대???臾댁뼵媛瑜??대걚????븷?먯꽌 ?앸룞媛먯씠 ?잕뎄移⑸땲?? ?몄젙諛쏄퀬 ?띠? ?뺢뎄媛 媛뺥븯??洹??먮꼫吏瑜?湲띿젙??諛⑺뼢?쇰줈 ?쒖슜?섏꽭??'},
  earth:{star:'泥쒕???鸚⒴틵??',title:'?덉젙怨??띿슂?먯꽌 ?됰났 李얘린',desc:'?ㅼ쭏?곸씤 ?덉젙媛먭낵 臾쇱쭏???띿슂?먯꽌 ?뺤떊???됲솕瑜??삳뒗 ?꾩떎二쇱쓽?뺤엯?덈떎. 媛議깃낵 ?④퍡?섎뒗 ?쇱긽, 留쏆엳???뚯떇, ?덈씫??怨듦컙???뱀떊?먭쾶 媛???뚯쨷???됰났?낅땲?? 臾대━??紐⑦뿕蹂대떎 袁몄???異뺤쟻???띠쓣 鍮쏅굹寃??⑸땲??'},
  metal:{star:'臾닿끝??閭?쎊??',title:'?깆랬? ?꾩꽦?먯꽌 ?됰났 李얘린',desc:'紐⑺몴瑜??ъ꽦?섍퀬 ?먯떊???몄슫 湲곗????꾨떖?덉쓣 ??媛????留뚯”媛먯쓣 ?먮겮???좏삎?낅땲?? 紐낆삁? ?깃낵??????뺢뎄媛 媛뺥븯硫? ?먯떊??留뚮뱺 寃껋뿉 ?먮??ъ쓣 媛뽰뒿?덈떎. 怨쇱젙蹂대떎 寃곌낵??吏묒갑?섎뒗 寃쏀뼢???덉쑝???ъ젙 ?먯껜??利먭린???곗뒿???꾩슂?⑸땲??'},
  water:{star:'泥쒕룞??鸚⒴릪??',title:'援먮쪟? 媛먯꽦?먯꽌 ?됰났 李얘린',desc:'?щ엺?ㅺ낵??源딆? 媛먯젙??援먮쪟? ?덉닠??媛먯닔?깆뿉???뺤떊???됰났??李얜뒗 ?좏삎?낅땲?? ?뚯븙, 臾명븰, ?곹솕媛 ?뱀떊???곹샎??源딆씠 ?우뒿?덈떎. 怨좊룆??利먭만 以??뚮㈃?쒕룄 吏꾩떖?쇰줈 ?곌껐?섎뒗 愿怨??섎굹?섎굹媛 ?뚯쨷??蹂대Ъ?낅땲??'}
};
var JAEBAEK={
  wood:{star:'?먮옉??縕ょ떬??',title:'?깆옣 遺꾩빞?먯꽌 ?щЪ???⑤떎',desc:'援먯쑁, 臾명솕, 諛붿씠?? 移쒗솚寃?遺꾩빞?먯꽌 遺瑜?李쎌텧?섎뒗 ?댁엯?덈떎. ?κ린??愿?먯쑝濡??ㅼ썙?섍????ъ뾽?대굹 ?ъ옄媛 留욎쑝硫? ?④린 ?ш린???쇳븯??寃껋씠 醫뗭뒿?덈떎. 吏?앷낵 ?ㅽ듃?뚰겕媛 ?덉씠 ?섎뒗 援ъ“?낅땲??'},
  fire:{star:'?쒖뼇??鸚ら쇋??',title:'?댁젙怨??쒗쁽?μ씠 ?щЪ濡??곌껐?쒕떎',desc:'IT, ?먮꼫吏, 誘몃뵒?? ?뷀꽣?뚯씤癒쇳듃 遺꾩빞?먯꽌 ???섏씡???????덈뒗 ?댁엯?덈떎. ?먯떊???λ젰???곴레?곸쑝濡??뚮━怨?釉뚮옖?쒗솕?섎뒗 寃껋씠 遺???듭떖 泥쒓린?낅땲?? 由щ뜑??쓣 諛쒗쐶?????щЪ???곕씪?듬땲??'},
  earth:{star:'泥쒕???鸚⒴틵??',title:'遺?숈궛怨??ㅻЪ?먯궛?먯꽌 蹂듭씠 ?⑤떎',desc:'遺?숈궛, ?앺뭹, 嫄댁꽕, ?띿뾽 愿??遺꾩빞?먯꽌 ?덉젙?곸씤 ?섏씡??湲곕??????덈뒗 ?댁엯?덈떎. 湲됯꺽???ш린蹂대떎 李⑹떎???異뺢낵 ?ㅻЪ ?먯궛 異뺤쟻??吏꾩젙??遺瑜?留뚮뱾?댁쨳?덈떎.'},
  metal:{star:'臾닿끝??閭?쎊??',title:'?꾨Ц?깃낵 洹쒖쑉?먯꽌 ?щЪ???⑤떎',desc:'湲덉쑖, 踰뺣쪧, ?섎즺, ?뺣? 湲곗닠 遺꾩빞?먯꽌 ?먭컖???섑??대뒗 ?댁엯?덈떎. ?꾨Ц ?먭꺽利앷낵 ?좊ː媛 媛??媛뺣젰???섏엯?먯씠 ?⑸땲?? 怨꾩빟怨?踰뺤쟻 洹쇨굅瑜?泥좎????뺤씤?섎뒗 ?듦????ъ궛 蹂댄샇???듭떖?낅땲??'},
  water:{star:'泥쒕룞??鸚⒴릪??',title:'?좏넻怨??먮쫫?먯꽌 ?щЪ???⑤떎',desc:'?좏넻, 臾댁뿭, 愿愿? 肄섑뀗痢??뚮옯??遺꾩빞?먯꽌 ?섏씡 湲고쉶媛 留롮뒿?덈떎. ?덉쓽 ?먮쫫???쎈뒗 媛먭컖???곗뼱?섎ŉ, ?곸젅???꾧툑 ?좊룞???섑샇媛 ?щЪ???듭떖?낅땲?? ?몃㎘???щЪ濡??댁뼱吏??援ъ“?낅땲??'}
};
var GWALROK={
  strong:{star:'移좎궡??訝껅???',title:'?낅┰怨?媛쒖쿃?쇰줈 ?깃났',desc:'媛뺥븳 二쇱껜?깆쓣 媛吏??뱀떊? ?⑥쓽 吏?쒕? 諛쏄린蹂대떎 ?먯떊留뚯쓽 ?곸뿭??援ъ텞????吏꾩젙???λ젰??諛쒗쐶?⑸땲?? 李쎌뾽, ?꾨━?쒖꽌, ?꾨Ц吏곸씠 留욎쑝硫??먯떊???대쫫??嫄??ъ뾽?먯꽌 鍮쏅궔?덈떎. 媛뺥븳 ?먮꼫吏瑜??ы쉶濡?諛쒖궛?섎뒗 援ъ“媛 理쒓퀬???깃났 怨듭떇?낅땲??'},
  weak:{star:'?쒖쓬??鸚ら솻??',title:'?묐젰怨??좊ː濡??깃났',desc:'?곗뼱??怨듦컧 ?λ젰怨??ъ꽭??媛먯닔?깆씠 ?뱀떊??吏곸뾽??臾닿린?낅땲?? ??뚰겕? ?묐젰 援ъ“ ?덉뿉??議곕젰?먮? 留뚮궇 ???깃낵媛 洹밸??붾맗?덈떎. ?곷떞, 援먯쑁, ?덉닠, ?쒕퉬?ㅼ쭅?먯꽌 泥쒖옱?깆쓣 諛쒗쐶?⑸땲??'},
  jong:{star:'?먮???榮ュ쒜??',title:'??遺꾩빞 吏묒쨷?쇰줈 ?뺤긽???좊떎',desc:'??媛吏 ?ㅽ뻾???뺣룄?곸쑝濡?吏諛고븯??醫낃꺽 ?ъ＜??洹?諛⑺뼢?쇰줈留?吏묒쨷????理쒓퀬???깃낵瑜??낅땲?? 遺꾩궛?섏? 留먭퀬 ?먯떊???怨좊궃 媛뺤젏 ??媛吏瑜?洹뱁븳源뚯? 諛쒖쟾?쒗궎?몄슂. ??컻?곴낵 ?꾨Ц?깆씠 ?뱀떊???뺤긽???몄슱 寃껋엯?덈떎.'}
};
var BUCHEO={
  F:{star:'?뺢???閭ｅ츟??',title:'?ㅼ젙?섍퀬 梨낆엫媛?媛뺥븳 諛곗슦???몄뿰',desc:'?ъ꽦??遺泥섍턿?먮뒗 誘우쓬吏곸뒪?쎄퀬 ?ы쉶?곸쑝濡??덉젙??諛곗슦???몄뿰???먮쫭?덈떎. 泥섏쓬 留뚮궗?????ㅻ젅湲곕낫???쒓컙??吏?좎닔濡????뚯쨷?댁?????낆쓽 ?몄뿰?낅땲?? ?몄뿰? ?덉긽移?紐삵븳 ?쇱긽 ?띿뿉???먯뿰?ㅻ읇寃?李얠븘?듬땲??'},
  M:{star:'?뺢???閭ｅ츟??',title:'?좊ː? 梨낆엫媛??덈뒗 諛곗슦???몄뿰',desc:'?⑥꽦??遺泥섍턿?먮뒗 ?먯떊???꾩떎?곸쑝濡?吏吏?댁＜怨??덉젙媛먯쓣 二쇰뒗 諛곗슦???몄뿰???먮쫭?덈떎. ?꾨뜒?곸씠怨??덉쓽 諛붾Ⅸ 遺꾩씠 ?섑???媛?μ꽦???믪뒿?덈떎. ?덈Т ?댁긽?뺤뿉 吏묒갑?섍린蹂대떎 袁몄???怨곸뿉???깆옣?섎뒗 愿怨꾨? ?뚯쨷???ш린?몄슂.'}
};

var BUMOGUN={
  wood:{star:'泥쒓린??鸚⒵찣??',title:'?깆옣 吏?ν삎 遺紐㉱룹꽑諛??몄뿰',
    desc:'遺紐⑤떂怨??좊같濡쒕???吏?? 援먯쑁, ?깆옣 湲고쉶瑜?諛쏅뒗 ?좏삎?낅땲?? 諛곗???以묒떆?섍퀬 ?덈줈??媛?μ꽦???댁뼱二쇰뒗 洹?몄씠 ?섑??⑸땲?? 遺紐⑤떂? ?먮????낅┰?ш낵 ?먯쑉?깆쓣 議댁쨷?섎뒗 ?몄씠硫? ?곸젅???쒓린??以묒슂??議곗뼵??嫄대꽕以띾땲?? ?좊같?ㅺ낵??愿怨꾩뿉?쒕룄 硫섑넗-硫섑떚??湲띿젙?곸씤 ?먮꼫吏媛 ?먮Ⅴ硫? ?꾨줈遺?곗쓽 吏?먯씠 ?깆옣??諛쒗뙋???⑸땲??',
    note:'遺紐㉱룹꽑諛곗???愿怨꾩뿉??諛쏅뒗 媛瑜댁묠???뚯쨷???ш린怨??곴레 ?≪닔??寃껋쓣 沅뚰빀?덈떎.'},
  fire:{star:'?쒖뼇??鸚ら쇋??',title:'?쒕룞?겶룹궗援먯쟻 遺紐㉱룹꽑諛??몄뿰',
    desc:'遺紐⑤떂怨??좊같濡쒕????댁젙怨??ы쉶?깆쓣 臾쇰젮諛쏅뒗 ?좏삎?낅땲?? ?ш탳?곸씠怨??쒕룞?곸씤 遺紐⑤떂 ?뺣텇???ㅼ뼇???몃㎘怨?湲고쉶瑜??묓븯寃??⑸땲?? 吏묒븞 遺꾩쐞湲곌? ?쒓린李④퀬 ??몄쟻?쇰줈 ?몄젙諛쏅뒗 寃쎌슦媛 留롮뒿?덈떎. ?좊같?ㅼ? 吏꾩랬?곸씤 ?꾩쟾 ?뺤떊???먭레?댁＜??議댁옱?낅땲?? ?ㅻ쭔 遺紐⑤떂??湲곕?媛 ?믪쓣 ???덉뼱 ?뚮줈???뺣컯???먮굜 ???덉뒿?덈떎.',
    note:'遺紐⑤떂???ы쉶???몃㎘???뱀떊?먭쾶 以묒슂??湲고쉶媛 ?⑸땲?? 湲띿젙?곸쑝濡??쒖슜?섏꽭??'},
  earth:{star:'泥쒕???鸚⒴틵??',title:'?덉젙쨌?뚯떊??遺紐㉱룹꽑諛??몄뿰',
    desc:'遺紐⑤떂怨??좊같濡쒕????뚯떊怨??덉젙??湲곗슫??諛쏅뒗 ?좏삎?낅땲?? 遺紐⑤떂? ?꾩떎?곸씠怨??ㅼ슜?곸씤 吏?먯쓣 ?꾨겮吏 ?딆쑝硫? 臾쇱쭏?겶룹젙?쒖쟻?쇰줈 ?좊뱺??踰꾪?紐⑹씠 ?⑸땲?? 媛?낆쓣 ?뉕굅??遺紐⑤떂??湲곕컲??怨꾩듅?섎뒗 寃쎌슦???덉뒿?덈떎. ?좊같?ㅺ낵??愿怨꾩뿉?쒕뒗 ?좊ː? ?덉젙??湲곕컲?쇰줈 ???κ린?곸씤 ?좊?媛먯씠 ?뺤꽦?⑸땲??',
    note:'遺紐⑤떂???ㅼ쭏?곸씤 ?꾩????몄깮??以묒슂???먯썝???⑸땲?? ?⑤룄? 媛먯궗瑜??딆? 留덉꽭??'},
  metal:{star:'臾닿끝??閭?쎊??',title:'?먯튃쨌?꾧꺽??遺紐㉱룹꽑諛??몄뿰',
    desc:'遺紐⑤떂怨??좊같濡쒕????꾧꺽?④낵 ?먯튃??諛곗슦???좏삎?낅땲?? ?ㅼ냼 ?꾧꺽??媛?뺥솚寃쎌뿉???먮? 寃쎌슦媛 留롮쑝硫? ?닿쾬??媛뺥븳 ?먭린 ?섑샇 ?λ젰怨?梨낆엫媛먯쓽 ?먯쿇???⑸땲?? 遺紐⑤떂???믪? 湲곗???遺?댁뒪?ъ슱 ???덉?留? 寃곌뎅 ?ы쉶?먯꽌 鍮쏅굹??寃쎌웳?μ쑝濡??댁뼱吏묐땲?? ?좊같?ㅺ낵??怨듭떇?곸씠怨??섏쭅?곸씤 愿怨꾩뿉???깆옣?⑸땲??',
    note:'遺紐⑤떂???꾧꺽??媛瑜댁묠???ㅽ엳???뱀떊??媛뺥븯寃?留뚮뱺 ?섏엯?덈떎.'},
  water:{star:'泥쒕룞??鸚⒴릪??',title:'媛먯꽦쨌吏吏??遺紐㉱룹꽑諛??몄뿰',
    desc:'遺紐⑤떂怨??좊같濡쒕???媛먯꽦??怨듦컧怨??뺤꽌??吏吏瑜?諛쏅뒗 ?좏삎?낅땲?? 遺紐⑤떂? ?먮???媛먯젙???몄떖?섍쾶 ?댄뵾怨?留덉쓬??吏먯쓣 ?④퍡 ?섎늻????낆엯?덈떎. ?덉닠??媛먯닔?깆씠??李쎌쓽?깆쓣 ?몄젙諛쏄퀬 ?먮? 寃쎌슦媛 留롮뒿?덈떎. ?좊같?ㅺ낵??愿怨꾩뿉?쒕룄 媛먯젙???좊?媛 源딄퀬, ?섎뱺 ?쒓린??吏꾩떖?대┛ ?꾨줈瑜?諛쏅뒗 ?몄뿰???곕쫭?덈떎.',
    note:'遺紐⑤떂???뺤꽌??吏吏媛 ?뱀떊?????섏엯?덈떎. 留덉쓬???닿퀬 ?뚰넻?섎㈃ ?????щ옉??諛쏆뒿?덈떎.'}
};
var JANYEOGUN_DATA={
  wood:{star:'?먮옉??縕ょ떬??',title:'?깆옣쨌李쎌쓽???먮?쨌?꾨같 ?몄뿰',
    desc:'?먮? 諛??꾨같???멸린?ъ씠 ?뺤꽦?섍퀬 李쎌쓽?곸씤 ?좏삎???몄뿰?쇰줈 ?곌껐?⑸땲?? ?덈줈??寃껋쓣 ?먭뎄?섍퀬 ?먯쑀濡?쾶 ?깆옣?섎룄濡?吏吏?댁＜??寃껋씠 醫뗭뒿?덈떎. ?먮???援먯쑁, ?덉닠, 李쎌옉 遺꾩빞?먯꽌 ?곗뼱???좎옱?μ쓣 蹂댁씪 ???덉뒿?덈떎. ?꾨같?ㅺ낵??愿怨꾩뿉?쒕뒗 ?뱀떊??寃쏀뿕???섎늻怨??④퍡 ?깆옣?섎뒗 ?숇컲?먯쟻 ?좊?媛 ?뺤꽦?⑸땲??',
    note:'?먮?? ?꾨같??李쎌쓽?깆쓣 ?듬늻瑜댁? 留먭퀬 ?ㅼ뼇??寃쏀뿕??湲고쉶瑜??댁뼱二쇱꽭??'},
  fire:{star:'?쒖뼇??鸚ら쇋??',title:'?쒕룞?겶룸━?뷀삎 ?먮?쨌?꾨같 ?몄뿰',
    desc:'?먮? 諛??꾨같???쒕컻?섍퀬 由щ뜑??湲곗쭏???怨좊궃 寃쎌슦媛 留롮뒿?덈떎. ?ш탳?깆씠 ?곗뼱?섍퀬 二쇰???二쇰ぉ??諛쏅뒗 ??낃낵 ?몄뿰??留븐뒿?덈떎. ?먮?媛 ?ы쉶?곸쑝濡??먭컖???섑???媛?μ꽦???믪쑝硫? ?좊뱺??吏?먯옄媛 ?섏뼱二쇰㈃ 洹?鍮쏆씠 ?붿슧 諛쒗빀?덈떎. ?꾨같?ㅼ뿉寃뚮뒗 ?쒕젰 ?섏튂??硫섑넗濡?湲곗뼲??寃껋엯?덈떎.',
    note:'?먮?쨌?꾨같???먮꼫吏瑜?湲띿젙?곸쑝濡??쒖슜?섍퀬 ?ы쉶 吏꾩텧??吏?먰빐二쇱꽭??'},
  earth:{star:'泥쒕???鸚⒴틵??',title:'?덉젙쨌?꾩떎???먮?쨌?꾨같 ?몄뿰',
    desc:'?먮? 諛??꾨같???꾩떎?곸씠怨??깆떎???깃꺽???좏삎???몄뿰?쇰줈 ?ㅺ??듬땲?? ?덉젙??異붽뎄?섍퀬 李⑹떎?섍쾶 ?깆옣?섎뒗 ?ㅽ??쇱씠硫? ?쇱컢遺???ㅼ슜?곸씤 媛移섍????뺤꽦?⑸땲?? ?먮???遺紐⑥쓽 ?꾩떎??吏???뺣텇???꾪깂??湲곕컲??媛뽰텧 ???덉뒿?덈떎. ?꾨같?ㅺ낵??誘우쓬吏곸뒪?쎄퀬 ?좊ː瑜?諛뷀깢?쇰줈 ??愿怨꾧? ?댁뼱吏묐땲??',
    note:'?먮?쨌?꾨같?먭쾶 ?덉젙?곸씤 ?섍꼍怨??ㅼ쭏?곸씤 吏?먯쓣 ?꾨겮吏 留덉꽭??'},
  metal:{star:'臾닿끝??閭?쎊??',title:'?낅┰?겶룹썝移숉삎 ?먮?쨌?꾨같 ?몄뿰',
    desc:'?먮? 諛??꾨같???낅┰?ъ씠 媛뺥븯怨??먯튃??泥좎????좏삎??留롮뒿?덈떎. ?먭린 二쇨????쒕졆?섏뿬 媛꾩꽠蹂대떎??誘우쓬怨?議댁쨷?쇰줈 ?묎렐?댁빞 ?⑸땲?? 寃쎌웳?곸씤 ?섍꼍?먯꽌 鍮쏅굹???깆랬?뺤쓣 媛吏??먮?媛 ?몄뿰?쇰줈 ?곌껐?⑸땲?? ?꾨같?ㅼ뿉寃뚮뒗 紐낇솗??湲곗?怨?怨듭젙???쒕룄濡???섎㈃ 吏꾩떖 ?대┛ ?좊ː瑜??산쾶 ?⑸땲??',
    note:'?먮?쨌?꾨같???낅┰?ъ쓣 議댁쨷?섎릺, ?꾩슂?????먯튃怨?諛⑺뼢???쒖떆?댁＜?몄슂.'},
  water:{star:'泥쒕룞??鸚⒴릪??',title:'媛먯닔?굿룹궗?ㅽ삎 ?먮?쨌?꾨같 ?몄뿰',
    desc:'?먮? 諛??꾨같??媛먯닔?깆씠 ?띾??섍퀬 諛곕젮??源딆? ?좏삎怨??몄뿰??留븐뒿?덈떎. ?덉닠???щ뒫?대굹 怨듦컧 ?λ젰???곗뼱???먮?媛 ?곌껐??媛?μ꽦???믪뒿?덈떎. 媛먯젙?곸쑝濡??ъ꽭?섎땲 ?곕쑜?섍퀬 吏吏?곸씤 ?섍꼍??留뚮뱾?댁＜??寃껋씠 以묒슂?⑸땲?? ?꾨같?ㅺ낵??愿怨꾩뿉?쒕뒗 ?뺤꽌???좊?媛 源딄퀬 吏꾩떖 ?대┛ ?뚰넻???대（?댁쭛?덈떎.',
    note:'?먮?쨌?꾨같??媛먯닔?깃낵 ?대㈃?멸퀎瑜?議댁쨷?섍퀬 ?뺤꽌??吏?먯쓣 異⑸텇???댁＜?몄슂.'}
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
  if (branch === '野? || branch === '?? || branch === '渦?) return 'Spring';
  if (branch === '藥? || branch === '?? || branch === '??) return 'Summer';
  if (branch === '?? || branch === '?? || branch === '??) return 'Autumn';
  if (branch === '雅? || branch === '耶? || branch === '訝?) return 'Winter';
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
    var birth = window._ziweiBirth || window._astroBirth || {};

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
        power_label: (G_POWER && typeof G_POWER.isStrong === 'boolean') ? (G_POWER.isStrong ? '?좉컯' : '?좎빟') : '',
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
        power_label: (G_POWER && typeof G_POWER.isStrong === 'boolean') ? (G_POWER.isStrong ? '?좉컯' : '?좎빟') : '',
        johu_type: johuType,
        notes: []
      }
    };

    if (snapshot.analysis.isJong && snapshot.analysis.jongName) {
      snapshot.saju.notes.push('醫낃꺽 ?먯젙: ' + snapshot.analysis.jongName);
    }
    if (johuType) {
      snapshot.saju.notes.push('議고썑 ?먯젙: ' + johuType);
    }

    window.__destinyFlowerSajuSnapshot = snapshot;
    return snapshot;
  } catch (syncErr) {
    console.warn('[DestinyFlower] ?ъ＜ ?ㅻ깄???숆린???ㅽ뙣:', syncErr);
    return null;
  }
}

function _clearDestinyFlowerSajuSnapshot() {
  try {
    window.__destinyFlowerSajuSnapshot = null;
  } catch (e) {}
}

/* ?? 紐⑤떖 ?꾩슜: 遺꾩꽍 ?섏씠吏 ?대룞 ?놁씠 ?꾨줈???곗씠?곕줈 ?꾩뿭 蹂??怨꾩궛 ?? */
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

  // ?먯꽦?좎? ?쒖???誘쇨컙?쒓컖) 湲곗??쇰줈 怨꾩궛?쒕떎.
  window._astroBirth = {
    year: year, month: month, day: day,
    hour: hour, minute: minute,
    lat: lat, lon: lng, tz: tzOff
  };

  /* 吏꾪깭?묒떆 蹂댁젙 */
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
    console.error('[Modal] ?꾨줈??怨꾩궛 ?ㅻ쪟:', e);
    return false;
  }
};
const ZHI_FEAT={
  '耶?:'伊먮씈: ?곷━?섍퀬 ?쒕컻?μ씠 ?곗뼱?섎떎',
  '訝?:'?뚮씈: 洹쇰㈃?깆떎?섎ŉ ?몃궡?ъ씠 媛뺥븯??,
  '野?:'?몃옉?대씈: ?⑸㏏?섍퀬 ?꾩쟾?뺤떊????⑦븯??,
  '??:'?좊겮?? ?⑦솕?섍퀬 ?덈???媛먯꽦??媛議뚮떎',
  '渦?:'?⑸씈: 沅뚯쐞? ?듭같?μ쓣 媛뽰텛?덈떎',
  '藥?:'諭?? ?좊퉬濡?퀬 吏곴??μ씠 ?곗뼱?섎떎',
  '??:'留먮씈: ?쒕컻?섍퀬 ?먯쑀濡쒖슫 湲곗슫??吏?붾떎',
  '??:'?묐씈: ?⑥닚?섍퀬 ?묐젰?곸씤 ?깊뼢?대떎',
  '??:'?먯댂?대씈: ?곷━?섍퀬 ?ъ튂媛 ?섏튇??,
  '??:'??씈: 洹쒖튃?곸씠怨?泥좎????깊뼢?대떎',
  '??:'媛쒕씈: 異⑹꽦?ㅻ읇怨??뺤쓽媛먯씠 媛뺥븯??,
  '雅?:'?쇱??? 愿??섍퀬 ?ъ슜?μ씠 ???몄씠??
};
const ZHI_LIST=['耶?,'訝?,'野?,'??,'渦?,'藥?,'??,'??,'??,'??,'??,'雅?];
function zwDisplayPalaceName(name){
  return name === '遺泥섍턿' ? '遺遺沅? : name;
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
  // 紐낃턿: ?붽턿 湲곗젏?먯꽌 ?쒖?瑜???뻾 諛섏쁺 (?꾪넻 ?먮??먯닔 諛곌턿)
  var mengIdx = (mengBaseIdx - hourIdx + 12) % 12;
  // ?좉턿: ?붽턿 湲곗젏?먯꽌 ?쒖?瑜??쒗뻾 諛섏쁺
  var shenIdx = (mengBaseIdx + hourIdx) % 12;

  var PALACE_NAMES = ['紐낃턿','?뺤젣沅?,'遺泥섍턿','?먮?沅?,'?щ갚沅?,'吏덉븸沅?,'泥쒖씠沅?,'?몃났沅?,'愿濡앷턿','?꾪깮沅?,'蹂듬뜒沅?,'遺紐④턿'];
  var palaces = {};
    var palacesByIndex = [];
  for(var i=0; i<12; i++) {
    var bIdx = (mengIdx - i + 120) % 12;
    palaces[PALACE_NAMES[i]] = ZHI_LIST[bIdx];
    palacesByIndex[bIdx] = PALACE_NAMES[i];
  }

  var GAN_LIST_ZW = ['??,'阿?,'訝?,'訝?,'??,'藥?,'佯?,'渦?,'鶯?,'??];
  var yg = GAN_LIST_ZW.indexOf(yearGan);
  var inStart = [2, 4, 6, 8, 0][((yg % 5) + 5) % 5];
  var gongGan = {};
  for(var z=0; z<12; z++) gongGan[ZHI_LIST[z]] = GAN_LIST_ZW[(inStart + (z - 2 + 12) % 12) % 10];

  var mgGan = gongGan[ZHI_LIST[mengIdx]];
  var mgZhiIdx = mengIdx;
  var sMap = {'??:1,'阿?:1,'訝?:2,'訝?:2,'??:3,'藥?:3,'佯?:4,'渦?:4,'鶯?:5,'??:5};
  var bMap = {0:1,1:1,2:2,3:2,4:3,5:3,6:1,7:1,8:2,9:2,10:3,11:3};
  var wVal = sMap[mgGan] + bMap[mgZhiIdx];
  if(wVal > 5) wVal -= 5;
  var juMap = {1:3, 2:4, 3:2, 4:6, 5:5};
  var ju = juMap[wVal] || 4;
  var juNames = {2:'??援?麗답틠掠)', 3:'紐?援??ⓧ툒掠)', 4:'湲?援??묈썪掠)', 5:'??援??잋틪掠)', 6:'??援??ュ뀷掠)'};
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

  stars[zPos].main.push('?먮?');
  stars[(zPos + 11) % 12].main.push('泥쒓린');
  stars[(zPos + 9) % 12].main.push('?쒖뼇');
  stars[(zPos + 8) % 12].main.push('臾닿끝');
  stars[(zPos + 7) % 12].main.push('泥쒕룞');
  stars[(zPos + 4) % 12].main.push('?쇱젙');

  stars[fPos].main.push('泥쒕?');
  stars[(fPos + 1) % 12].main.push('?쒖쓬');
  stars[(fPos + 2) % 12].main.push('?먮옉');
  stars[(fPos + 3) % 12].main.push('嫄곕Ц');
  stars[(fPos + 4) % 12].main.push('泥쒖긽');
  stars[(fPos + 5) % 12].main.push('泥쒕웾');
  stars[(fPos + 6) % 12].main.push('移좎궡');
  stars[(fPos + 10) % 12].main.push('?뚭뎔');

  stars[(10 - hourIdx + 12) % 12].aux.push('臾몄갹');
  stars[(4 + hourIdx) % 12].aux.push('臾멸끝');
  stars[(4 + lmonth - 1) % 12].aux.push('醫뚮낫');
  stars[(10 - (lmonth - 1) + 12) % 12].aux.push('?고븘');
  
  var yangMap = {'??:3,'阿?:4,'訝?:6,'訝?:7,'??:6,'藥?:7,'佯?:9,'渦?:10,'鶯?:0,'??:1};
  var tuoMap = {'??:1,'阿?:2,'訝?:4,'訝?:5,'??:4,'藥?:5,'佯?:7,'渦?:8,'鶯?:10,'??:11};
  if(yearGan in yangMap) {
    stars[yangMap[yearGan]].bad.push('寃쎌뼇');
    stars[tuoMap[yearGan]].bad.push('???);
  }
  
  stars[(11 - hourIdx + 12) % 12].bad.push('吏怨?);
  stars[(11 + hourIdx) % 12].bad.push('吏寃?);

  var maMap = {'??:2,'耶?:2,'渦?:2, '雅?:5,'??:5,'??:5, '野?:8,'??:8,'??:8, '藥?:11,'??:11,'訝?:11};
  var tianMaZhi = maMap[yearZhi];
  if (tianMaZhi !== undefined) stars[tianMaZhi].aux.push('泥쒕쭏');

  var luCunMap = {'??:2,'阿?:3,'訝?:5,'訝?:6,'??:5,'藥?:6,'佯?:8,'渦?:9,'鶯?:11,'??:0};
  var luCunZhi = luCunMap[yearGan];
  if (luCunZhi !== undefined) stars[luCunZhi].aux.push('?뱀〈');

  // 泥쒓눼/泥쒖썡? ?곌컙 洹쒖튃?쒕? ?곕Ⅴ硫? 渦쏅뀈? 野?泥쒓눼)쨌??泥쒖썡)濡?諛곗튂?쒕떎.
  var kuiMap = {'??:1,'阿?:0,'訝?:11,'訝?:11,'??:1,'藥?:0,'佯?:1,'渦?:2,'鶯?:3,'??:3};
  var yueMap = {'??:7,'阿?:8,'訝?:9,'訝?:9,'??:7,'藥?:8,'佯?:7,'渦?:6,'鶯?:5,'??:5};
  var kuiZhi = kuiMap[yearGan];
  var yueZhi = yueMap[yearGan];
  if(kuiZhi !== undefined) stars[kuiZhi].aux.push('泥쒓눼');
  if(yueZhi !== undefined) stars[yueZhi].aux.push('泥쒖썡');

  var hlStart = {
      '野?:{h:1, l:3}, '??:{h:1, l:3}, '??:{h:1, l:3},
      '??:{h:2, l:10}, '耶?:{h:2, l:10}, '渦?:{h:2, l:10},
      '藥?:{h:3, l:10}, '??:{h:3, l:10}, '訝?:{h:3, l:10},
      '雅?:{h:9, l:10}, '??:{h:9, l:10}, '??:{h:9, l:10}
  };
  if (hlStart[yearZhi]) {
      var huoZhi = (hlStart[yearZhi].h + hourIdx) % 12;
      var lingZhi = (hlStart[yearZhi].l + hourIdx) % 12;
      stars[huoZhi].bad.push('?붿꽦');
      stars[lingZhi].bad.push('?곸꽦');
  }

  var sihuaMap = {
    '??: { '?쇱젙': '?붾줉', '?뚭뎔': '?붽텒', '臾닿끝': '?붽낵', '?쒖뼇': '?붽린' },
    '阿?: { '泥쒓린': '?붾줉', '泥쒕웾': '?붽텒', '?먮?': '?붽낵', '?쒖쓬': '?붽린' },
    '訝?: { '泥쒕룞': '?붾줉', '泥쒓린': '?붽텒', '臾몄갹': '?붽낵', '?쇱젙': '?붽린' },
    '訝?: { '?쒖쓬': '?붾줉', '泥쒕룞': '?붽텒', '泥쒓린': '?붽낵', '嫄곕Ц': '?붽린' },
    '??: { '?먮옉': '?붾줉', '?쒖쓬': '?붽텒', '?고븘': '?붽낵', '泥쒓린': '?붽린' },
    '藥?: { '臾닿끝': '?붾줉', '?먮옉': '?붽텒', '泥쒕웾': '?붽낵', '臾멸끝': '?붽린' },
    '佯?: { '?쒖뼇': '?붾줉', '臾닿끝': '?붽텒', '?쒖쓬': '?붽낵', '泥쒕룞': '?붽린' },
    '渦?: { '嫄곕Ц': '?붾줉', '?쒖뼇': '?붽텒', '臾멸끝': '?붽낵', '臾몄갹': '?붽린' },
    '鶯?: { '泥쒕웾': '?붾줉', '?먮?': '?붽텒', '醫뚮낫': '?붽낵', '臾닿끝': '?붽린' },
    '??: { '?뚭뎔': '?붾줉', '嫄곕Ц': '?붽텒', '?쒖쓬': '?붽낵', '?먮옉': '?붽린' }
  };
  var curSihua = sihuaMap[yearGan];
  // ?붿궗(?쎾뙑) ?낅┰ ?곗씠??異붿텧 ??HTML ?꾨쿋???꾩뿉 stars ?먮낯?먯꽌 怨꾩궛
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
                var col = (sh === '?붽린') ? '#FF5252' : '#3399FF';
                stars[i].main[j] = sn + ' <span style="color:'+col+';font-weight:900;font-size:0.75rem;margin-left:3px;">' + sh + '</span>';
            }
        }
        for (var j = 0; j < stars[i].aux.length; j++) {
            var sn = stars[i].aux[j];
            if (curSihua[sn]) {
                var sh = curSihua[sn];
                var col = (sh === '?붽린') ? '#FF5252' : '#3399FF';
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
        return s + '<span style="font-size:0.5rem;opacity:0.6;margin-left:3px;font-weight:600;color:#a1a1aa">(李⑥꽦)</span>'; 
      });
    }
  }
  for(var i=0; i<12; i++) {
    if(borrowed[i]) {
        // ?먯꽦(main)????뼱?곗? ?딄퀬 李⑥꽦 ?꾩슜 ?щ’??遺꾨━ ???        stars[i].borrowedMain = [].concat(borrowed[i]);
    }
  }

  var isYangYear = {'??:1,'阿?:-1,'訝?:1,'訝?:-1,'??:1,'藥?:-1,'佯?:1,'渦?:-1,'鶯?:1,'??:-1}[yearGan] > 0;
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
      palaceName: palacesByIndex[currBIdx] || ('??+(k+1)+'???),
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
        var hasHwaGi = /?붽린/.test(raw || '');
        var plain = (raw || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        var borrowedFlag = borrowedByTag ? /\(李⑥꽦\)|\b李⑥꽦\b/.test(plain) : false;
        var starName = plain
          .replace(/\(李⑥꽦\)/g,'')
          .replace(/?붾줉|?붽텒|?붽낵|?붽린/g,'')
          .replace(/??????g,'')
          .replace(/(^|\s)[O?딿](?=\s|$)/g,' ')
          .trim()
          .split(' ')[0];
        if(!starName) return null;
        var strength = zwComputeStarStrength(starName, gZhi, borrowedFlag, {
          hourIndex: hourIdx,
          lunarMonth: lmonth,
          yearGan: yearGan,
          luCunZhiIdx: (luCunZhi !== undefined ? luCunZhi : -1)
        }) || '??;
        if (hasHwaGi) {
          var normalized = zwNormalizeStrength(strength);
          if (starName === '嫄곕Ц') {
            // 嫄곕Ц ?붽린???꾩떎 由ъ뒪?щ? ?숇컲?섎릺, 蹂몃옒 愿묓쐶(臾?????利됱떆 遺뺢눼?쒗궎吏 ?딅뒗??
            var downGeomun = {'臾?:'臾?,'??:'??,'??:'由?,'由?:'??,'??:'??};
            strength = downGeomun[normalized] || normalized;
          } else {
            var down = {'臾?:'??,'??:'由?,'??:'??,'由?:'??,'??:'??};
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
      lifeFormula: '紐낃턿 = (?붽턿湲곗젏 - ?쒖?index) mod 12',
      bodyFormula: '?좉턿 = (?붽턿湲곗젏 + ?쒖?index) mod 12'
    }
  };
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   STEP 4: ?좏떥 ?⑥닔
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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
  return({0:samePol?'鍮꾧껄':'寃곸옱',1:samePol?'?앹떊':'?곴?',2:samePol?'?몄옱':'?뺤옱',3:samePol?'?멸?':'?뺢?',4:samePol?'?몄씤':'?뺤씤'})[diff]||'?';
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

// 異쒖깮吏 ?좏깮 ?뺥솗???μ긽: 援?? ?⑥쐞媛 ?꾨땶 二??꾩떆 ?⑥쐞 IANA ??꾩〈 ?곸슜
var BIRTH_PLACE_GROUPS = [
  { label:'??쒕?援?(??援??⑥쐞)', places:[
    {label:'??쒕?援?쨌 ?쒖슱', tz:'Asia/Seoul', lon:126.9780, lat:37.5665, tzOff:9, def:true},
    {label:'??쒕?援?쨌 遺??, tz:'Asia/Seoul', lon:129.0756, lat:35.1796, tzOff:9},
    {label:'??쒕?援?쨌 ?몄쿇', tz:'Asia/Seoul', lon:126.7052, lat:37.4563, tzOff:9},
    {label:'??쒕?援?쨌 ?援?, tz:'Asia/Seoul', lon:128.6014, lat:35.8714, tzOff:9},
    {label:'??쒕?援?쨌 愿묒＜', tz:'Asia/Seoul', lon:126.8526, lat:35.1595, tzOff:9},
    {label:'??쒕?援?쨌 ???, tz:'Asia/Seoul', lon:127.3845, lat:36.3504, tzOff:9},
    {label:'??쒕?援?쨌 ?몄궛', tz:'Asia/Seoul', lon:129.3114, lat:35.5384, tzOff:9},
    {label:'??쒕?援?쨌 寃쎄린??쨌 ?깅궓??, tz:'Asia/Seoul', lon:127.1267, lat:37.4200, tzOff:9},
    {label:'??쒕?援?쨌 寃쎄린??쨌 ?⑹씤??, tz:'Asia/Seoul', lon:127.1776, lat:37.2411, tzOff:9},
    {label:'??쒕?援?쨌 寃쎄린??쨌 怨좎뼇??, tz:'Asia/Seoul', lon:126.8320, lat:37.6584, tzOff:9},
    {label:'??쒕?援?쨌 寃쎄린??쨌 ?붿꽦??, tz:'Asia/Seoul', lon:126.8312, lat:37.1995, tzOff:9},
    {label:'??쒕?援?쨌 寃쎄린??쨌 ?묓룊援?, tz:'Asia/Seoul', lon:127.4870, lat:37.4918, tzOff:9},
    {label:'??쒕?援?쨌 寃쎄린??쨌 媛?됯뎔', tz:'Asia/Seoul', lon:127.5107, lat:37.8315, tzOff:9},
    {label:'??쒕?援?쨌 媛뺤썝?밸퀎?먯튂??쨌 異섏쿇??, tz:'Asia/Seoul', lon:127.7298, lat:37.8813, tzOff:9},
    {label:'??쒕?援?쨌 媛뺤썝?밸퀎?먯튂??쨌 媛뺣쫱??, tz:'Asia/Seoul', lon:128.8761, lat:37.7519, tzOff:9},
    {label:'??쒕?援?쨌 媛뺤썝?밸퀎?먯튂??쨌 ?됱갹援?, tz:'Asia/Seoul', lon:128.3904, lat:37.3705, tzOff:9},
    {label:'??쒕?援?쨌 ?섏썝', tz:'Asia/Seoul', lon:127.0286, lat:37.2636, tzOff:9},
    {label:'??쒕?援?쨌 異⑹껌遺곷룄 쨌 泥?＜??, tz:'Asia/Seoul', lon:127.4890, lat:36.6424, tzOff:9},
    {label:'??쒕?援?쨌 異⑹껌遺곷룄 쨌 異⑹＜??, tz:'Asia/Seoul', lon:127.9259, lat:36.9910, tzOff:9},
    {label:'??쒕?援?쨌 異⑹껌遺곷룄 쨌 ?쒖쿇??, tz:'Asia/Seoul', lon:128.1940, lat:37.1326, tzOff:9},
    {label:'??쒕?援?쨌 異⑹껌?⑤룄 쨌 泥쒖븞??, tz:'Asia/Seoul', lon:127.1522, lat:36.8151, tzOff:9},
    {label:'??쒕?援?쨌 異⑹껌?⑤룄 쨌 怨듭＜??, tz:'Asia/Seoul', lon:127.1190, lat:36.4465, tzOff:9},
    {label:'??쒕?援?쨌 異⑹껌?⑤룄 쨌 ?쒖궛??, tz:'Asia/Seoul', lon:126.4522, lat:36.7849, tzOff:9},
    {label:'??쒕?援?쨌 ?꾩＜', tz:'Asia/Seoul', lon:127.1480, lat:35.8242, tzOff:9},
    {label:'??쒕?援?쨌 ?꾨씪遺곷룄 쨌 援곗궛??, tz:'Asia/Seoul', lon:126.7368, lat:35.9677, tzOff:9},
    {label:'??쒕?援?쨌 ?꾨씪遺곷룄 쨌 ?⑥썝??, tz:'Asia/Seoul', lon:127.3903, lat:35.4164, tzOff:9},
    {label:'??쒕?援?쨌 ?꾨씪?⑤룄 쨌 紐⑺룷??, tz:'Asia/Seoul', lon:126.3922, lat:34.8118, tzOff:9},
    {label:'??쒕?援?쨌 ?꾨씪?⑤룄 쨌 ?ъ닔??, tz:'Asia/Seoul', lon:127.6622, lat:34.7604, tzOff:9},
    {label:'??쒕?援?쨌 ?꾨씪?⑤룄 쨌 ?대궓援?, tz:'Asia/Seoul', lon:126.5989, lat:34.5742, tzOff:9},
    {label:'??쒕?援?쨌 寃쎌긽遺곷룄 쨌 ?ы빆??, tz:'Asia/Seoul', lon:129.3435, lat:36.0190, tzOff:9},
    {label:'??쒕?援?쨌 寃쎌긽遺곷룄 쨌 ?덈룞??, tz:'Asia/Seoul', lon:128.7294, lat:36.5684, tzOff:9},
    {label:'??쒕?援?쨌 寃쎌긽遺곷룄 쨌 寃쎌＜??, tz:'Asia/Seoul', lon:129.2247, lat:35.8562, tzOff:9},
    {label:'??쒕?援?쨌 寃쎌긽?⑤룄 쨌 李쎌썝??, tz:'Asia/Seoul', lon:128.6811, lat:35.2285, tzOff:9},
    {label:'??쒕?援?쨌 寃쎌긽?⑤룄 쨌 吏꾩＜??, tz:'Asia/Seoul', lon:128.1076, lat:35.1799, tzOff:9},
    {label:'??쒕?援?쨌 寃쎌긽?⑤룄 쨌 嫄곗갹援?, tz:'Asia/Seoul', lon:127.9099, lat:35.6867, tzOff:9},
    {label:'??쒕?援?쨌 ?쒖＜?밸퀎?먯튂??쨌 ?쒖＜??, tz:'Asia/Seoul', lon:126.5312, lat:33.4996, tzOff:9},
    {label:'??쒕?援?쨌 ?쒖＜?밸퀎?먯튂??쨌 ?쒓??ъ떆', tz:'Asia/Seoul', lon:126.5600, lat:33.2541, tzOff:9},
    {label:'??쒕?援?쨌 ?쒖＜', tz:'Asia/Seoul', lon:126.5312, lat:33.4996, tzOff:9}
  ]},
  { label:'誘멸뎅 (二??꾩떆)', places:[
    {label:'誘멸뎅 쨌 ?댁슃二?쨌 ?댁슃', tz:'America/New_York', lon:-74.0060, lat:40.7128, tzOff:-5},
    {label:'誘멸뎅 쨌 留ㅼ궗異붿꽭痢좎＜ 쨌 蹂댁뒪??, tz:'America/New_York', lon:-71.0589, lat:42.3601, tzOff:-5},
    {label:'誘멸뎅 쨌 ?뚮줈由щ떎二?쨌 留덉씠?좊?', tz:'America/New_York', lon:-80.1918, lat:25.7617, tzOff:-5},
    {label:'誘멸뎅 쨌 議곗??꾩＜ 쨌 ?좏??쒗?', tz:'America/New_York', lon:-84.3880, lat:33.7490, tzOff:-5},
    {label:'誘멸뎅 쨌 ?쇰━?몄씠二?쨌 ?쒖뭅怨?, tz:'America/Chicago', lon:-87.6298, lat:41.8781, tzOff:-6},
    {label:'誘멸뎅 쨌 ?띿궗?ㅼ＜ 쨌 ?덈윭??, tz:'America/Chicago', lon:-96.7970, lat:32.7767, tzOff:-6},
    {label:'誘멸뎅 쨌 ?띿궗?ㅼ＜ 쨌 ?댁뒪??, tz:'America/Chicago', lon:-95.3698, lat:29.7604, tzOff:-6},
    {label:'誘멸뎅 쨌 肄쒕줈?쇰룄二?쨌 ?대쾭', tz:'America/Denver', lon:-104.9903, lat:39.7392, tzOff:-7},
    {label:'誘멸뎅 쨌 ?좊━議곕굹二?쨌 ?쇰땳??, tz:'America/Phoenix', lon:-112.0740, lat:33.4484, tzOff:-7},
    {label:'誘멸뎅 쨌 ?좏?二?쨌 ?뷀듃?덉씠?ъ떆??, tz:'America/Denver', lon:-111.8910, lat:40.7608, tzOff:-7},
    {label:'誘멸뎅 쨌 罹섎━?щ땲?꾩＜ 쨌 濡쒖뒪?ㅼ젮?덉뒪', tz:'America/Los_Angeles', lon:-118.2437, lat:34.0522, tzOff:-8},
    {label:'誘멸뎅 쨌 罹섎━?щ땲?꾩＜ 쨌 ?뚰봽??쒖뒪肄?, tz:'America/Los_Angeles', lon:-122.4194, lat:37.7749, tzOff:-8},
    {label:'誘멸뎅 쨌 ?뚯떛?댁＜ 쨌 ?쒖븷?', tz:'America/Los_Angeles', lon:-122.3321, lat:47.6062, tzOff:-8},
    {label:'誘멸뎅 쨌 ?뚮옒?ㅼ뭅二?쨌 ?듭빱由ъ?', tz:'America/Anchorage', lon:-149.9003, lat:61.2181, tzOff:-9},
    {label:'誘멸뎅 쨌 ?섏??댁＜ 쨌 ?몃?猷곕（', tz:'Pacific/Honolulu', lon:-157.8583, lat:21.3069, tzOff:-10}
  ]},
  { label:'罹먮굹??(二??꾩떆)', places:[
    {label:'罹먮굹??쨌 ?⑦?由ъ삤二?쨌 ?좊줎??, tz:'America/Toronto', lon:-79.3832, lat:43.6532, tzOff:-5},
    {label:'罹먮굹??쨌 ?섎깹二?쨌 紐ы듃由ъ삱', tz:'America/Montreal', lon:-73.5673, lat:45.5017, tzOff:-5},
    {label:'罹먮굹??쨌 釉뚮━?곗떆而щ읆鍮꾩븘二?쨌 諛댁퓼踰?, tz:'America/Vancouver', lon:-123.1207, lat:49.2827, tzOff:-8},
    {label:'罹먮굹??쨌 ?⑤쾭?二?쨌 罹섍굅由?, tz:'America/Edmonton', lon:-114.0719, lat:51.0447, tzOff:-7},
    {label:'罹먮굹??쨌 留ㅻ땲?좊컮二?쨌 ?꾨땲??, tz:'America/Winnipeg', lon:-97.1384, lat:49.8951, tzOff:-6},
    {label:'罹먮굹??쨌 ?몃컮?ㅼ퐫?ㅼ＜ 쨌 ?쇰━?⑹뒪', tz:'America/Halifax', lon:-63.5752, lat:44.6488, tzOff:-4}
  ]},
  { label:'?숈븘?쒖븘/?숇궓?꾩떆??, places:[
    {label:'?쇰낯 쨌 ?꾩퓙', tz:'Asia/Tokyo', lon:139.6917, lat:35.6895, tzOff:9},
    {label:'?쇰낯 쨌 ?ㅼ궗移?, tz:'Asia/Tokyo', lon:135.5023, lat:34.6937, tzOff:9},
    {label:'?쇰낯 쨌 ?욱룷濡?, tz:'Asia/Tokyo', lon:141.3545, lat:43.0618, tzOff:9},
    {label:'以묎뎅 쨌 踰좎씠吏?, tz:'Asia/Shanghai', lon:116.4074, lat:39.9042, tzOff:8},
    {label:'以묎뎅 쨌 ?곹븯??, tz:'Asia/Shanghai', lon:121.4737, lat:31.2304, tzOff:8},
    {label:'以묎뎅 쨌 愿묒???, tz:'Asia/Shanghai', lon:113.2644, lat:23.1291, tzOff:8},
    {label:'?留?쨌 ??대쿋??, tz:'Asia/Taipei', lon:121.5654, lat:25.0330, tzOff:8},
    {label:'?띿쉘 쨌 ?띿쉘??, tz:'Asia/Hong_Kong', lon:114.1694, lat:22.3193, tzOff:8},
    {label:'?깃??щⅤ 쨌 ?깃??щⅤ', tz:'Asia/Singapore', lon:103.8198, lat:1.3521, tzOff:8},
    {label:'?쒓뎅 쨌 諛⑹퐬', tz:'Asia/Bangkok', lon:100.5018, lat:13.7563, tzOff:7},
    {label:'踰좏듃??쨌 ?섎끂??, tz:'Asia/Ho_Chi_Minh', lon:105.8342, lat:21.0278, tzOff:7},
    {label:'踰좏듃??쨌 ?몄컡誘?, tz:'Asia/Ho_Chi_Minh', lon:106.6297, lat:10.8231, tzOff:7},
    {label:'?몃룄?ㅼ떆??쨌 ?먯뭅瑜댄?', tz:'Asia/Jakarta', lon:106.8456, lat:-6.2088, tzOff:7},
    {label:'?몃룄?ㅼ떆??쨌 諛쒕━(?댄뙆?щⅤ)', tz:'Asia/Makassar', lon:115.2167, lat:-8.6500, tzOff:8},
    {label:'?꾨━? 쨌 留덈땺??, tz:'Asia/Manila', lon:120.9842, lat:14.5995, tzOff:8}
  ]},
  { label:'?⑥븘?쒖븘/以묐룞', places:[
    {label:'?몃룄 쨌 ?대뜽由?, tz:'Asia/Kolkata', lon:77.1025, lat:28.7041, tzOff:5.5},
    {label:'?몃룄 쨌 萸꾨컮??, tz:'Asia/Kolkata', lon:72.8777, lat:19.0760, tzOff:5.5},
    {label:'?몃룄 쨌 踰듦컝猷⑤（', tz:'Asia/Kolkata', lon:77.5946, lat:12.9716, tzOff:5.5},
    {label:'?몃룄 쨌 肄쒖뭅?', tz:'Asia/Kolkata', lon:88.3639, lat:22.5726, tzOff:5.5},
    {label:'?뚰궎?ㅽ깂 쨌 移대씪移?, tz:'Asia/Karachi', lon:67.0011, lat:24.8607, tzOff:5},
    {label:'諛⑷??쇰뜲??쨌 ?ㅼ뭅', tz:'Asia/Dhaka', lon:90.4125, lat:23.8103, tzOff:6},
    {label:'?ㅽ뙏 쨌 移댄듃留뚮몢', tz:'Asia/Kathmandu', lon:85.3240, lat:27.7172, tzOff:5.75},
    {label:'UAE 쨌 ?먮컮??, tz:'Asia/Dubai', lon:55.2708, lat:25.2048, tzOff:4},
    {label:'?ъ슦??쨌 由ъ빞??, tz:'Asia/Riyadh', lon:46.6753, lat:24.7136, tzOff:3},
    {label:'?대? 쨌 ?뚰뿤?', tz:'Asia/Tehran', lon:51.3890, lat:35.6892, tzOff:3.5},
    {label:'?댁뒪?쇱뿕 쨌 ?덈（?대젞', tz:'Asia/Jerusalem', lon:35.2137, lat:31.7683, tzOff:2},
    {label:'?고궎 쨌 ?댁뒪?꾨텋', tz:'Europe/Istanbul', lon:28.9784, lat:41.0082, tzOff:3}
  ]},
  { label:'?좊읇/?ㅼ꽭?꾨땲??以묐궓誘?, places:[
    {label:'?곴뎅 쨌 ?곕뜕', tz:'Europe/London', lon:-0.1276, lat:51.5074, tzOff:0},
    {label:'?꾨옉??쨌 ?뚮━', tz:'Europe/Paris', lon:2.3522, lat:48.8566, tzOff:1},
    {label:'?낆씪 쨌 踰좊?由?, tz:'Europe/Berlin', lon:13.4050, lat:52.5200, tzOff:1},
    {label:'?댄깉由ъ븘 쨌 濡쒕쭏', tz:'Europe/Rome', lon:12.4964, lat:41.9028, tzOff:1},
    {label:'?ㅽ럹??쨌 留덈뱶由щ뱶', tz:'Europe/Madrid', lon:-3.7038, lat:40.4168, tzOff:1},
    {label:'?ъ떆??쨌 紐⑥뒪?щ컮', tz:'Europe/Moscow', lon:37.6173, lat:55.7558, tzOff:3},
    {label:'?몄＜ 쨌 ?쒕뱶??NSW)', tz:'Australia/Sydney', lon:151.2093, lat:-33.8688, tzOff:10},
    {label:'?몄＜ 쨌 硫쒕쾭瑜?VIC)', tz:'Australia/Melbourne', lon:144.9631, lat:-37.8136, tzOff:10},
    {label:'?몄＜ 쨌 釉뚮━利덈쾲(QLD)', tz:'Australia/Brisbane', lon:153.0251, lat:-27.4698, tzOff:10},
    {label:'?몄＜ 쨌 ?쇱뒪(WA)', tz:'Australia/Perth', lon:115.8605, lat:-31.9505, tzOff:8},
    {label:'?몄＜ 쨌 ?좊뱾?덉씠??SA)', tz:'Australia/Adelaide', lon:138.6007, lat:-34.9285, tzOff:9.5},
    {label:'?몄＜ 쨌 ?ㅼ쐢(NT)', tz:'Australia/Darwin', lon:130.8456, lat:-12.4634, tzOff:9.5},
    {label:'?댁쭏?쒕뱶 쨌 ?ㅽ겢?쒕뱶', tz:'Pacific/Auckland', lon:174.7633, lat:-36.8485, tzOff:12},
    {label:'釉뚮씪吏?쨌 ?곹뙆?몃（', tz:'America/Sao_Paulo', lon:-46.6333, lat:-23.5505, tzOff:-3},
    {label:'釉뚮씪吏?쨌 由ъ슦?곗옄?ㅼ씠猷?, tz:'America/Sao_Paulo', lon:-43.1729, lat:-22.9068, tzOff:-3},
    {label:'?꾨Ⅴ?⑦떚??쨌 遺?먮끂?ㅼ븘?대젅??, tz:'America/Argentina/Buenos_Aires', lon:-58.3816, lat:-34.6037, tzOff:-3},
    {label:'移좊젅 쨌 ?고떚?꾧퀬', tz:'America/Santiago', lon:-70.6693, lat:-33.4489, tzOff:-4},
    {label:'硫뺤떆肄?쨌 硫뺤떆肄붿떆??, tz:'America/Mexico_City', lon:-99.1332, lat:19.4326, tzOff:-6},
    {label:'?섎（ 쨌 由щ쭏', tz:'America/Lima', lon:-77.0428, lat:-12.0464, tzOff:-5}
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

function initSelectors(){
  populateBirthCountrySelector();

  var hSel=document.getElementById('birthHour'),mSel=document.getElementById('birthMinute');
  if (hSel && mSel) {
    var hBuf = '';
    for (var h = 0; h < 24; h++) hBuf += '<option value="' + h + '">' + (h < 10 ? '0' : '') + h + '??/option>';
    hSel.innerHTML = hBuf;
    hSel.value = '12';
    var mBuf = '';
    for (var m = 0; m < 60; m++) mBuf += '<option value="' + m + '">' + (m < 10 ? '0' : '') + m + '遺?/option>';
    mSel.innerHTML = mBuf;
    mSel.value = '0';
  }

  var ch=document.getElementById('compatBirthHour');
  var cm=document.getElementById('compatBirthMinute');
  if(ch&&cm){
    var chBuf = '';
    for(var h2=0;h2<24;h2++) chBuf += '<option value="'+h2+'">'+(h2<10?'0':'')+h2+'??/option>';
    ch.innerHTML = chBuf;
    ch.value='12';
    var cmBuf = '';
    for(var m2=0;m2<60;m2++) cmBuf += '<option value="'+m2+'">'+(m2<10?'0':'')+m2+'遺?/option>';
    cm.innerHTML = cmBuf;
    cm.value='0';
  }

  try {
    if (typeof updateCorrectedTimePreview === 'function') updateCorrectedTimePreview();
  } catch (e) {}
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
    ? ('DST ' + (resolved.dstMinutes > 0 ? '+' : '') + resolved.dstMinutes + '遺??곸슜')
    : 'DST 誘몄쟻??;

  infoDiv.style.display = 'block';
  infoDiv.classList.remove('time-correction-info--loading');
  infoDiv.setAttribute('aria-busy', 'false');
  infoDiv.innerHTML = '?뙇 <b>?쒓컙 蹂댁젙 誘몃━蹂닿린</b><br>'
    + '<span style="font-size:0.75rem;">湲곗? UTC' + (effTz >= 0 ? '+' : '') + effTz
    + ' (?쒖? UTC' + (resolved.baseOffsetHours >= 0 ? '+' : '') + resolved.baseOffsetHours + ', ' + dstText + ')<br>'
    + '?쒖??먯삤??' + stdLong.toFixed(2) + '째 vs ?ㅼ젣寃쎈룄 ' + bLong.toFixed(4) + '째 ??寃쎈룄 蹂댁젙 '
    + (lngOffsetMin >= 0 ? '+' : '') + lngOffsetMin + '遺?/span>';
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   STEP 5: 紐낅━??遺꾩꽍 ?붿쭊
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

/* ? 議고썑 遺꾩꽍 ? */
function analyzeJohu(p){
  var yg=p.y.g,yz=p.y.j,mg=p.m.g,mz=p.m.j,dg=p.d.g,dz=p.d.j,hg=p.h.g,hz=p.h.j;
  var score=0;
  var seasonMap={'野?:'遊?,'??:'遊?,'渦?:'遊?,'藥?:'?щ쫫','??:'?щ쫫','??:'?щ쫫','??:'媛??,'??:'媛??,'??:'媛??,'雅?:'寃⑥슱','耶?:'寃⑥슱','訝?:'寃⑥슱'};
  var season=seasonMap[mz]||'遊?;
  if(season==='?щ쫫')score+=4;else if(season==='遊?)score+=2;else if(season==='媛??)score-=2;else score-=4;
  var fc=0,wc=0,wdc=0,mc=0;
  var moistCnt=0,dryCnt=0;
  [yg,yz,mg,mz,dg,dz,hg,hz].forEach(function(c){
    var g=GAN[c],j=JI[c];
    var e=(g||j||{}).e;
    if(e==='fire'){score+=1.5;fc++;dryCnt++;}else if(e==='water'){score-=1.5;wc++;moistCnt++;}
    else if(e==='wood'){score+=0.5;wdc++;moistCnt++;}
    else if(e==='metal'){score-=0.5;mc++;dryCnt++;}
    if(j){
      if(c==='渦?||c==='訝?)moistCnt++;
      if(c==='??||c==='??)dryCnt++;
    }
  });
  var type,advice,badgeCls,badgeTxt;
  if(score>=5){type='hot';advice='?ъ＜媛 留ㅼ슦 ?④쾪?듬땲?? 麗는룬뇫 湲곗슫???덉떎???꾩슂?⑸땲??';badgeCls='jb-hot';badgeTxt='?뵦 ?④굅???ъ＜';}
  else if(score>=2){type='warm';advice='?ъ＜媛 ?곕쑜???몄엯?덈떎. 麗?湲곗슫?쇰줈 議곗젅?섎㈃ 醫뗭뒿?덈떎.';badgeCls='jb-warm';badgeTxt='?뙙 ?곕쑜???ъ＜';}
  else if(score>=-2){type='neutral';advice='?ъ＜???⑤룄媛 ?쒖썝?섍쾶 洹좏삎?≫? ?덉뒿?덈떎. 怨꾩젅 蹂?붿뿉 留욎떠 ?뚯뼇??議곗젅?섏꽭??';badgeCls='jb-neutral';badgeTxt='?뙟截??쒖썝???ъ＜';}
  else if(score>=-5){type='cool';advice='?ъ＜媛 ?쒕뒛???몄엯?덈떎. ?ヂ룡쑉 湲곗슫?쇰줈 ?④린瑜?蹂댁땐?섎㈃ 醫뗭뒿?덈떎.';badgeCls='jb-cool';badgeTxt='?뛽 ?쒕뒛???ъ＜';}
  else{type='cold';advice='?ъ＜媛 留ㅼ슦 李④컩?듬땲?? ?ヂ룡쑉 湲곗슫???덉떎???꾩슂?⑸땲??';badgeCls='jb-cold';badgeTxt='?꾬툘 李④????ъ＜';}
  var moistType,moistAdvice;
  var diff=moistCnt-dryCnt;
  if(diff>=3){moistType='wet';moistAdvice='?ъ＜???듦린媛 留롮? ?몄엯?덈떎. 嫄댁“???섍꼍, 湲???쨌遺??? 湲곗슫???곸젅???⑥＜硫?洹좏삎??醫뗭븘吏묐땲??';}
  else if(diff<=-3){moistType='dry';moistAdvice='?ъ＜媛 嫄댁“???몄엯?덈떎. 臾?麗?쨌?섎Т(?? 湲곗슫怨??ㅼ젣 ?섎텇(臾셋룸ぉ?빧룹옄?????듯빐 珥됱큺?⑥쓣 梨꾩썙二쇰뒗 寃껋씠 醫뗭뒿?덈떎.';}
  else{moistType='balanced';moistAdvice='?듭“(嚥뺟눆)??鍮꾧탳??洹좏삎?≫엺 ?몄엯?덈떎. ?쒕궃留???留욎떠二쇰㈃ 醫뗭뒿?덈떎.';}
  var improve=(type==='hot'||type==='warm')
    ?'?쒖썝?섍퀬 李④???湲곗슫 ?꾩슂. 遺곸そ 諛⑺뼢, ?뚮??됀룰????而щ윭, ?섏쁺쨌臾쇨? ?쒕룞.'
    :(type==='cold'||type==='cool')
    ?'?곕쑜?섍퀬 諛앹? 湲곗슫 ?꾩슂. ?⑥そ 諛⑺뼢, 鍮④컙?됀룹＜?⑹깋 而щ윭, 罹좏븨쨌BBQ ?쒕룞.'
    :'洹좏삎?≫엺 ?ъ＜?낅땲?? ?ㅼ뼇???ㅽ뻾??怨④퀬猷??쒖슜?섏꽭??';
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

/* ? ?듬?(?좉컯/?좎빟) 怨꾩궛 ? */
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

/* ? 醫낃꺽(孃욄졏) 媛먯? ??泥쒓컙??異㈑룹?吏??異?諛섏쁺, 70% 湲곗? ? */
function detectJong(p){
  var GANHE={
    '??:{'藥?:'earth'},'藥?:{'??:'earth'},
    '阿?:{'佯?:'metal'},'佯?:{'阿?:'metal'},
    '訝?:{'渦?:'water'},'渦?:{'訝?:'water'},
    '訝?:{'鶯?:'wood'},'鶯?:{'訝?:'wood'},
    '??:{'??:'fire'},'??:{'??:'fire'}
  };
  var GANCHONG=[['??,'佯?],['阿?,'渦?],['訝?,'鶯?],['訝?,'??]];
  var JIHE={
    '耶?:{'訝?:'earth'},'訝?:{'耶?:'earth'},
    '野?:{'雅?:'wood'},'雅?:{'野?:'wood'},
    '??:{'??:'fire'},'??:{'??:'fire'},
    '渦?:{'??:'metal'},'??:{'渦?:'metal'},
    '藥?:{'??:'water'},'??:{'藥?:'water'},
    '??:{'??:'fire'},'??:{'??:'fire'}
  };
  var JICHONG=[['耶?,'??],['訝?,'??],['野?,'??],['??,'??],['渦?,'??],['藥?,'雅?]];

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

  // ?? ?먭뎅 ?먯튃: ?⑹쓽 ?섏씠 異⑸낫??媛뺥븯????????????????????????????
  // 泥쒓컙?⑹씠 ?깅┰?섎㈃ 異⑹쓣 ?쒖븬?섏뿬 ?⑺솕???ㅽ뻾?쇰줈 蹂?섑븳??
  // ?⑺솕??泥쒓컙? ganChongSet?먯꽌 ?쒓굅 ???대? ?⑹쑝濡?臾띠씤 泥쒓컙?????異⑹? 臾댄슚.
  var ganElMap={};
  gans.forEach(function(g){if(g&&GAN[g])ganElMap[g]=GAN[g].e;});
  var ganHeMerged={};
  for(var gi=0;gi<gans.length;gi++){
    for(var gj=gi+1;gj<gans.length;gj++){
      var g1=gans[gi],g2=gans[gj];
      if(!g1||!g2)continue;
      if(GANHE[g1]&&GANHE[g1][g2]){
        // ?먭뎅 泥쒓컙???곗꽑 ?먯튃: 異??щ? 愿怨꾩뾾???⑺솕 臾댁“嫄??곸슜
        ganElMap[g1]=GANHE[g1][g2]; ganElMap[g2]=GANHE[g1][g2];
        ganHeMerged[g1]=true; ganHeMerged[g2]=true;
        // ?⑺솕??泥쒓컙? 異???곸뿉???쒖쇅 (?⑹씠 異⑹쓣 ?쒖븬)
        delete ganChongSet[g1]; delete ganChongSet[g2];
      }
    }
  }
  var jiElMap={};
  zhis.forEach(function(z){if(z&&JI[z])jiElMap[z]=JI[z].e;});
  var jiHeMerged={}; // 吏吏?⑹? 異??곗꽑 ?먯튃 誘몄쟻????jiChongSet 媛???좎?
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

  // ?? 醫낃꺽 ?먯젙 ?꾧퀎媛? 80%+ 吏꾩쥌寃?/ 70~80% 媛醫낃꺽 ??????????????
  var JONG_TRUE_THRESHOLD = 80;
  var JONG_GA_THRESHOLD   = 70;
  var HWA_GA_THRESHOLD    = 75; // ?⑺솕?? 75%+ ?깅┰ (媛?붹졏 ?쒖옉)
  var HWA_TRUE_THRESHOLD  = 80; // ?⑺솕?? 80%+ 吏꾪솕??/ 75~80% 媛?붹졏

  // ?? ?⑺솕???뽪졏) ?밸퀎 ?먮퀎: ?쇨컙??泥쒓컙?⑺솕??李몄뿬??寃쎌슦 ??????????
  // ?? ?딁쇅?⑺솕?? ???쇨컙???⑺솕 ???⑺솕???ㅽ뻾+紐?驪??ㅽ뻾 湲곗??쇰줈 ?붹졏 ?먮퀎
  var dayGanChar = p.d.g;
  if(ganHeMerged[dayGanChar]) {
    var hwaDom = ganElMap[dayGanChar]; // ?⑺솕???ㅽ뻾
    var hwaPar = parentOf(hwaDom);    // ?⑺솕?ㅽ뻾???앺븯??遺紐??ㅽ뻾
    var hwaCnt = (cnt[hwaDom]||0) + (hwaPar ? (cnt[hwaPar]||0) : 0);
    var hwaPct = hwaCnt / total * 100;
    if(hwaPct >= HWA_GA_THRESHOLD) {
      var hwaIsGaJong = (hwaPct < HWA_TRUE_THRESHOLD); // 75~80% = 媛?붹졏
      var hwaName = (hwaIsGaJong ? '媛' : '') + '?붹졏(?뽪졏)';
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
  // ?? ?⑥씪 ?ㅽ뻾??70% 誘몃쭔?대㈃ ?덈? 醫낃꺽 ?먮퀎 紐⑤떖???꾩슦吏 ?딆쓬 ??
  if(pct1 < JONG_GA_THRESHOLD) return{isJong:false};
  if(maxPct >= JONG_GA_THRESHOLD) {
    var dominant = pct1>=pct2 ? dom1 : dom2;
    var pct = maxPct;
    var parEl = parentOf(dominant);
    var isGaJong = (pct < JONG_TRUE_THRESHOLD); // 70~80% = 媛醫낃꺽

    var jongName;
    if(dominant === dayEl) {
      var J_MAP = {'wood':'怨≪쭅寃??꿰쎍??','fire':'?쇱긽寃??롣툓??','earth':'媛?됯꺽(葉쇘æ??','metal':'醫낇쁺寃?孃욇씓??','water':'?ㅽ븯寃?逆ㅴ툔??'};
      jongName = (isGaJong ? '媛(??' : '') + (J_MAP[dayEl] || '醫낆솗寃?孃욄뿺??');
    } else if(parEl === dayEl) {
      jongName = (isGaJong ? '媛' : '') + '醫낆븘寃?孃욃뀙??';
    } else if(dominant === parentOf(dayEl)) {
      jongName = (isGaJong ? '媛' : '') + '醫낃컯寃?孃욃성??';
    } else if(KE[dayEl] === dominant) {
      jongName = (isGaJong ? '媛' : '') + '醫낆옱寃?孃욆깹??';
    } else if(KE[dominant] === dayEl) {
      jongName = (isGaJong ? '媛' : '') + '醫낆궡寃?孃욄???';
    } else {
      jongName = (isGaJong ? '媛' : '') + '?붽꺽(?뽪졏)';
    }

    // ?⑺솕 ?곗꽑 ?щ?
    var hadChongOverride = (Object.keys(ganHeMerged).length > 0 || Object.keys(jiHeMerged).length > 0) &&
      (GANCHONG.some(function(pr){return gans.indexOf(pr[0])>=0&&gans.indexOf(pr[1])>=0;}) ||
       JICHONG.some(function(pr){return zhis.indexOf(pr[0])>=0&&zhis.indexOf(pr[1])>=0;}));

    var jongResult = {
      isJong: true,          // 媛醫낃꺽??isJong=true ??????몄슫 ?됯????숈씪 ?곸슜
      isGaJong: isGaJong,    // 媛醫낃꺽 ?щ? (60~70%)
      dominant: dominant, parEl: parEl, pct: pct.toFixed(0), name: jongName, dayEl: dayEl,
      heHaPriority: hadChongOverride,
      ganHeMerged: ganHeMerged,
      jiHeMerged: jiHeMerged
    };

    // ?? 媛醫낃꺽? ???議곌굔???곕씪 吏꾩쥌寃⑹쑝濡??꾪솚?????덉쓬 ??????????
    // 吏꾩쥌寃?70%+) ?댁긽??諛섎??몃젰 肉뚮━ 寃利?    var myForceCount = (cnt[dayEl]||0) + (cnt[parentOf(dayEl)]||0);
    var myForcePct   = (myForceCount / total) * 100;
    var isFollowingOthers = (jongName.indexOf('醫낆븘寃?)>=0 || jongName.indexOf('醫낆옱寃?)>=0 || jongName.indexOf('醫낆궡寃?)>=0 || jongName.indexOf('?붽꺽')>=0);
    var JANGGAN_DB = {
      '耶?:['鶯?,'??], '訝?:['??,'渦?,'藥?], '野?:['??,'訝?,'??], '??:['??,'阿?], '渦?:['阿?,'??,'??], '藥?:['??,'佯?,'訝?],
      '??:['訝?,'藥?,'訝?], '??:['訝?,'阿?,'藥?], '??:['??,'鶯?,'佯?], '??:['佯?,'渦?], '??:['渦?,'訝?,'??], '雅?:['??,'??,'鶯?]
    };
    var rootElements = [dayEl, parentOf(dayEl)];
    var hasRootInJanggan = false;
    [p.y.j, p.m.j, p.d.j, p.h.j].forEach(function(z){
      if(!z) return;
      (JANGGAN_DB[z]||[]).forEach(function(jgGan){
        if(GAN[jgGan] && rootElements.indexOf(GAN[jgGan].e)>=0) hasRootInJanggan = true;
      });
    });

    // 媛醫낃꺽? 蹂꾨룄 'pending' ?놁씠 諛붾줈 isGaJong=true濡?泥섎━
    // 吏꾩쥌寃⑹씠?쇰룄 諛섎??몃젰???쒕졆?섎㈃ 媛醫낃꺽?쇰줈 寃⑺븯
    if(!isGaJong) {
      var opposingPct = ((total - myForceCount) / total) * 100;
      if (isFollowingOthers && (myForcePct >= 21 || hasRootInJanggan)) {
        jongResult.isGaJong = true;
        jongResult.name = '媛(??' + jongName;
      } else if (!isFollowingOthers && opposingPct >= 21) {
        jongResult.isGaJong = true;
        jongResult.name = '媛(??' + jongName;
      }
    }

    return jongResult;
  }
  return{isJong:false};
}

/* ? ?ㅽ뻾 遺꾪룷 ? */
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

/* ? ?? ?ㅽ뻾 ?됯? ?⑥닔 (議고썑 ?곗꽑, 醫낃꺽/?듬? 諛섏쁺) ? */
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
  if(mz==='雅? || mz==='耶? || mz==='訝? || mz==='野?){
    if(el==='fire') isJohuGood = true;
    if(el==='water') isJohuBad = true;
  } else if(mz==='藥? || mz==='?? || mz==='??){
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

/* ? ????듯빀 ?됯?: ?? 紐낅━ 泥쒓린(議고썑 ?곗꽑, ?⑺솕 諛섏쁺) ? */
function evalDaewun(ganChar,zhiChar){
  var pw=G_POWER,jg=G_JONG,jh=G_JOHU,p0=G_PILLARS;
  var score=50; // 湲곕낯 ?먯닔 50??  var ganEl=(GAN[ganChar]||{}).e||'earth';
  var zhiEl=(JI[zhiChar]||{}).e||'earth';

  var GANHE_Q={'??:{'藥?:'earth'},'藥?:{'??:'earth'},'阿?:{'佯?:'metal'},'佯?:{'阿?:'metal'},'訝?:{'渦?:'water'},'渦?:{'訝?:'water'},'訝?:{'鶯?:'wood'},'鶯?:{'訝?:'wood'},'??:{'??:'fire'},'??:{'??:'fire'}};
  var JIHE_Q={'耶?:{'訝?:'earth'},'訝?:{'耶?:'earth'},'野?:{'雅?:'wood'},'雅?:{'野?:'wood'},'??:{'??:'fire'},'??:{'??:'fire'},'渦?:{'??:'metal'},'??:{'渦?:'metal'},'藥?:{'??:'water'},'??:{'藥?:'water'},'??:{'??:'fire'},'??:{'??:'fire'}};

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
    if(mz==='雅? || mz==='耶? || mz==='訝? || mz==='野?) isCold = true;
    if(mz==='藥? || mz==='?? || mz==='??) isHot = true;
  }

  function getJohuScore(el, isZhi, charStr) {
    var s = 0;
    var w = isZhi ? 1.5 : 1; // 吏吏媛 泥쒓컙蹂대떎 1.5諛??곹뼢??    if (isCold) {
      if (el === 'fire') s = 10 * w; // ????? 理쒓퀬??(+10, +20)
      else if (el === 'earth') {
        if (isZhi && (charStr === '?? || charStr === '??)) s = 8 * w; // 議고넗: ?쒖뒿 (+16)
        else s = 5 * w; // ?쇰컲 ??(+5, +10)
      }
      else if (el === 'wood') s = 3 * w;
      else if (el === 'metal') s = -3 * w;
      else if (el === 'water') s = -10 * w; // ????? 理쒗븯??(-10, -20)
    } else if (isHot) {
      if (el === 'water') s = 10 * w; // ????? 理쒓퀬??(+10, +20)
      else if (el === 'metal') s = 5 * w;
      else if (el === 'earth') {
        if (isZhi && (charStr === '渦? || charStr === '訝?)) s = 5 * w; // ?듯넗 (+10)
        else if (isZhi && (charStr === '?? || charStr === '??)) s = -8 * w; // 議고넗 (-16)
        else s = -3 * w;
      }
      else if (el === 'wood') s = -3 * w;
      else if (el === 'fire') s = -10 * w; // ????? 理쒗븯??(-10, -20)
    }
    return s;
  }

  var ganJohu = getJohuScore(finalGanEl, false, ganChar);
  var zhiJohu = getJohuScore(finalZhiEl, true, zhiChar);

  function getEokbuScore(el, isZhi) {
    var s = 0;
    // 醫끾졏: 醫끾졏寃⑹뿉??吏吏媛 ??以묒슂 ??媛以묒튂 ?곹뼢 (吏吏 15?? 泥쒓컙 10??
    var w = jg && jg.isJong ? (isZhi ? 15 : 10) : (isZhi ? 12 : 8);
    if (jg && jg.isJong) {
      if (el === jg.dominant || el === jg.parEl) s = w;
      else if (el === whoControls(jg.dominant)) s = -w;
      // 醫낆옱寃?媛醫낆옱寃? ?몄꽦(?쇨컙???잜븯???ㅽ뻾)??湲곗떊 ???쇨컙 媛뺥솕 ???ъ꽦 洹??꾪뿕
      if (jg.name && jg.name.indexOf('醫낆옱寃?) >= 0 && jg.dayEl) {
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

  var GAN_CHUNG = {'??:'佯?, '佯?:'??, '阿?:'渦?, '渦?:'阿?, '訝?:'鶯?, '鶯?:'訝?, '訝?:'??, '??:'訝?};
  var ZHI_CHUNG = {'耶?:'??, '??:'耶?, '訝?:'??, '??:'訝?, '野?:'??, '??:'野?, '??:'??, '??:'??, '渦?:'??, '??:'渦?, '藥?:'雅?, '雅?:'藥?};

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

  var isMetalDM = p0 && (p0.d.g === '佯? || p0.d.g === '渦?);
  var isFireFavorable = false;
  if(pw) isFireFavorable = pw.yongshin.indexOf('fire')>=0 || isFavorable('fire', false, '訝?);
  if(jg && jg.isJong) isFireFavorable = isFireFavorable || jg.dominant==='fire' || jg.parEl==='fire';
  
  function checkSMFW(srcChar, targetChar) {
    if(!isMetalDM || !isFireFavorable) return false;
    var srcEl = (GAN[srcChar] || JI[srcChar] || {}).e;
    var tgtEl = (GAN[targetChar] || JI[targetChar] || {}).e;
    return (srcEl === 'fire' && tgtEl === 'water') || (srcEl === 'water' && tgtEl === 'fire');
  }

  var isDM_Sin = p0 && p0.d.g === '渦?;
  if (isDM_Sin && ganChar === '訝?) {
    var hasWood = (zhiEl === 'wood');
    if (!hasWood) {
      origGans.forEach(function(g) { if((GAN[g]||{}).e === 'wood') hasWood = true; });
      origZhis.forEach(function(z) { if((JI[z]||{}).e === 'wood') hasWood = true; });
    }
    
    chungPenalty -= 15;
    hasChungPenalty = true;
    var sinDingText = "?좑툘 <b>?멸?(訝????꾪삊!</b> ?좉툑(渦? ?쇨컙?먭쾶 ?뺥솕(訝????꾩꽦??蹂댁꽍???뱀씠???붾줈遺덇낵 媛숈븘 蹂몄쭏???쇱넀?⑸땲?? ?좉컯?섎뜑?쇰룄 蹂묓솕(訝?? ?щ━ ??⑦엳 遺?뺤쟻?쇰줈 ?묒슜?섎?濡? ?깃툒???섏꽟???쇳븯怨???????蹂댄샇留??ㅻ줈 ?⑥뼱???섎뒗 ?쒓린?낅땲??";
    
    if (hasWood) {
      chungPenalty -= 40; // 媛뺣젰??異붽? 媛먯젏
      sinDingText += " ?ㅼ긽媛?곸쑝濡?<b>????瑜?洹뱁븯??紐??? 湲곗슫</b>???④퍡 ?묒슜???섎? 吏耳쒖쨪 諛⑺뙣留됱씠留덉? ?ル졇?듬땲?? 愿?ш뎄?? 洹뱀떖???ㅽ듃?덉뒪, ?먯옱??諛??뚯옱媛 ?곕젮?섎땲 媛곷퀎???섏꽦?섏떗?쒖삤!";
    }
    
    if (chungPenaltyText) {
      chungPenaltyText += "<br><br>" + sinDingText;
    } else {
      chungPenaltyText = sinDingText;
    }
  }

  // ?먭뎅 ?⑺솕??泥쒓컙 紐⑸줉 (?⑹쑝濡??대? 臾띠씤 泥쒓컙怨쇱쓽 異⑹? 臾댄슚)
  var natalGanHeMerged = (jg && jg.ganHeMerged) ? jg.ganHeMerged : {};
  var natalJiHeMerged  = (jg && jg.jiHeMerged)  ? jg.jiHeMerged  : {};

  if (GAN_CHUNG[ganChar] && origGans.indexOf(GAN_CHUNG[ganChar]) >= 0) {
    var tChar = GAN_CHUNG[ganChar];
    // ?먭뎅?먯꽌 ?⑺솕??泥쒓컙?대㈃ 異??먯껜媛 臾댄슚 (?⑹씠 異⑹쓣 ?쒖븬)
    if (natalGanHeMerged[tChar]) {
      // ?⑺솕??泥쒓컙? 異⑹쓽 ??곸씠 ?꾨떂 ???ㅽ궢
    } else {
    var tEl = (GAN[tChar] || {}).e || 'earth';
    var isSpecialGan = checkSMFW(ganChar, tChar);

    if (isSpecialGan) {
      chungBonus += 25;
      hasChungBonus = true;
      chungBonusText = "?뵦 <b>?붾젴吏꾧툑(?ラ뜇?욇뇫) 諛쒕났!</b> 湲??? ?쇨컙??瑗??꾩슂??????瑜??곕뒗 以묒뿉 ??麗?? 洹밸젹??異⑸룎?⑸땲?? ?뚭레???꾨땲??臾쇨낵 遺덉씠 援먯감?섎ŉ 媛뺤쿋??踰쇰젮?대뒗 ?닿툑吏덉쓽 ?쒓컙???섏뼱 ??꼍???リ퀬 李щ?????깆랬瑜??대９?덈떎.";
    } else if (ganScore > 0 && isUnfavorable(tEl, false, tChar)) {
      chungBonus += 15;
      hasChungBonus = true;
      chungBonusText = "?뮙 <b>?됱떊 ?뚭린!</b> 怨좏넻???ъ뒳???딆뼱吏硫?泥쒓컙???덈줈??湲몄씠 ?대┰?덈떎. ?ъ＜瑜??μ즲???먭뎅??湲곗떊(" + tChar + ")???⑹떊???쇨꺽(亦???諛쏆븘 ?곗궛議곌컖 ?ъ뒿?덈떎. ?곗＜???듭븬???由щ뒗 洹뱀쟻??諛쒕났???쒓린?낅땲??";
    } else if (ganScore < 0 && isFavorable(tEl, false, tChar)) {
      chungPenalty -= 15;
      hasChungPenalty = true;
      chungPenaltyText = "?좑툘 <b>?⑹떊 ?뚯넀!</b> ?곹샎??蹂댄샇留됱씠 源⑥???移섎챸???됱슫. 誘우뿀??泥쒓컙 ?⑹떊(" + tChar + ")???됱떊??媛뺥븳 ?寃⑹쓣 諛쏆븯?듬땲?? 諛⑹뼱留됱쓣 移섍퀬 ?섏꽦??吏묒쨷?댁빞 ?⑸땲??";
    } else if (ganScore > 0 && ganEl !== finalGanEl) {
      chungBonus += 10;
      hasChungBonus = true;
      chungBonusText = "??<b>?⑺솕 ?⑹떊 蹂대꼫??</b> 遺덈━?덈뜕 ?됱떊???⑹쑝濡?臾띠씠硫??⑹떊?쇰줈 ?뚮??덉뒿?덈떎. ?꾧린媛 湲고쉶濡??ㅻ컮?뚮뒗 ?≪옱?섏엯?덈떎.";
    }
    } // else (?⑺솕 ?덈맂 泥쒓컙) 釉붾줉 ?リ린
  }

  if (ZHI_CHUNG[zhiChar] && origZhis.indexOf(ZHI_CHUNG[zhiChar]) >= 0) {
    var tChar = ZHI_CHUNG[zhiChar];
    // 吏吏異⑹? ??異??먯튃 誘몄쟻????湲곗〈 濡쒖쭅 ?좎?
    var tEl = (JI[tChar] || {}).e || 'earth';
    var isSpecialZhi = checkSMFW(zhiChar, tChar);

    if (isSpecialZhi) {
      chungBonus += 30;
      hasChungBonus = true;
      chungBonusText += (chungBonusText?"<br><br>":"") + "?뵦 <b>?섑솕湲곗젣(麗당겓?ｆ퓺) ?諛쒕났!</b> 吏吏?먯꽌 ?쇱뼱?섎뒗 臾쇨낵 遺덉쓽 嫄곕???異⑸룎???꾨━??湲??? ?쇨컙???쒕젴???꾩꽦?쒗궢?덈떎. ?쇰?怨??쒕젴 ?띿뿉 媛???꾨????깃낵媛 ?꾩깮?섎뒗 ?듭풄???쇰컻??쟾?낅땲??";
    } else if (zhiScore > 0 && isUnfavorable(tEl, true, tChar)) {
      chungBonus += 20;
      hasChungBonus = true;
      var tJohu = getJohuScore(tEl, true, tChar);
      if(tJohu < -5) {
        chungBonusText += (chungBonusText?"<br><br>":"") + "?뮙 <b>議고썑 ?됱떊 ?뚭린!</b> 媛?뱁븳 怨꾩젅 媛숇뜕 議고썑 ?됱떊(" + tChar + ")????댁쓽 議고썑 ?⑹떊(" + zhiChar + ")??異⑷레?섏뿬 源⑤??⑸땲?? 湲몄뿀??怨좏넻???곕꼸??踰쀬뼱????湲몄씠 ?대┰?덈떎!";
      } else {
        chungBonusText += (chungBonusText?"<br><br>":"") + "?뮙 <b>吏???됱떊 ?뚭린!</b> 嫄곕????깆랬???쒕쭑. ???꾩떎??留됰뜕 ?먭뎅??湲곗떊(" + tChar + ")???⑹떊(" + zhiChar + ")???섑빐 ?곗궛議곌컖 ?섎ŉ ?듭풄???쇰컻 ??쟾???쇱뼱?⑸땲??";
      }
    } else if (zhiScore < 0 && isFavorable(tEl, true, tChar)) {
      chungPenalty -= 20;
      hasChungPenalty = true;
      chungPenaltyText += (chungPenaltyText?"<br><br>":"") + "?좑툘 <b>吏吏 ?⑹떊 遺뺢눼!</b> ?섏쓽 ?꾩떎???좊뱺?섍쾶 諛쏆퀜二쇰뜕 吏吏 ?⑹떊(" + tChar + ")???됱떊(" + zhiChar + ")???寃⑹뿉 臾대꼫吏묐땲?? 援ъ꽕?? ?먯옱?? ?ш퀬瑜??덈? 二쇱쓽?섏떗?쒖삤.";
    } else if (zhiScore > 0 && zhiEl !== finalZhiEl) {
      chungBonus += 15;
      hasChungBonus = true;
      chungBonusText += (chungBonusText?"<br><br>":"") + "??<b>吏吏 ?⑺솕 紐낃뎅!</b> 移섎챸?곸씤 湲곗떊??洹?몄쓽 媛쒖엯(???쇰줈 臾띠뿬 ?닿껐?섎ŉ ?덉젙怨??삳컰???깆랬瑜??살뒿?덈떎.";
    }
  }

  // ?? 吏吏 ?≫빀(??릦) 蹂대꼫?? ???吏吏媛 ?먭뎅怨??⑺븯???⑹떊 ?ㅽ뻾 媛뺥솕 ??
  var JIHE_BNS = {
    '耶?:{'訝?:'earth'},'訝?:{'耶?:'earth'},
    '野?:{'雅?:'wood'},'雅?:{'野?:'wood'},
    '??:{'??:'fire'},'??:{'??:'fire'},
    '渦?:{'??:'metal'},'??:{'渦?:'metal'},
    '藥?:{'??:'water'},'??:{'藥?:'water'},
    '??:{'??:'fire'},'??:{'??:'fire'}
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
        jiheBonusTxt += '?뵕 <b>吏吏 ?≫빀('+zhiChar+oz+') 媛뺥솕!</b> '+(EL_K[heEl]||heEl)+' ?ㅽ뻾???⑹쑝濡?媛뺥솕?⑸땲??';
      } else if(bs < 0){
        jiheBonus += bs;
        jiheBonusTxt += '?좑툘 吏吏 ?≫빀?쇰줈 湲곗떊 ?ㅽ뻾 媛뺥솕.';
      }
    });
  }

  // ?? ?쇳빀(訝됧릦) 蹂대꼫?? ???吏吏媛 ?먭뎅怨??쇳빀/諛섑빀 ?뺤꽦 ??
  var SAMHAP = [
    {m:['??,'耶?,'渦?], el:'water'},
    {m:['雅?,'??,'??], el:'wood'},
    {m:['野?,'??,'??], el:'fire'},
    {m:['藥?,'??,'訝?], el:'metal'}
  ];
  var samhapBonus = 0;
  var hasSamhapBonus = false;
  var samhapBonusTxt = '';
  SAMHAP.forEach(function(sh){
    if(sh.m.indexOf(zhiChar) < 0) return;
    var matchCnt = 0;
    origZhis.forEach(function(oz){ if(oz && sh.m.indexOf(oz) >= 0) matchCnt++; });
    if(matchCnt >= 2) { // ?쇳빀 ?꾩꽦 (?먭뎅 2媛?+ ???1媛?
      var bs = isFavorable(sh.el, true, zhiChar) ? 22 : (isUnfavorable(sh.el, true, zhiChar) ? -22 : 0);
      if(bs > 0){
        samhapBonus += bs; hasSamhapBonus = true;
        samhapBonusTxt = '狩?<b>?쇳빀(訝됧릦) ?諛쒕났!</b> '+zhiChar+'???먭뎅怨??쇳빀???대쨪 '+(EL_K[sh.el]||sh.el)+' ?ㅽ뻾??理쒓컯?쇰줈 媛뺥솕?⑸땲??';
      } else if(bs < 0){
        samhapBonus += bs;
        samhapBonusTxt = '?좑툘 <b>?쇳빀 湲곗떊 媛뺥솕!</b> ?쇳빀?쇰줈 ?됱떊 ?ㅽ뻾??吏묒쨷?⑸땲??';
      }
    } else if(matchCnt >= 1) { // 諛섑빀
      var bs2 = isFavorable(sh.el, true, zhiChar) ? 10 : (isUnfavorable(sh.el, true, zhiChar) ? -10 : 0);
      if(bs2 !== 0){
        samhapBonus += bs2;
        if(bs2 > 0){ hasSamhapBonus = true; samhapBonusTxt += '?? <b>諛섑빀 媛뺥솕</b>: '+(EL_K[sh.el]||sh.el)+' 湲곗슫 利앺룺.'; }
      }
    }
  });

  score += ganScore + zhiScore + chungBonus + chungPenalty + jiheBonus + samhapBonus;

  // evalSummary?????쇳빀 ?뺣낫 異붽????뚮옒洹????  var _jiheTxt = jiheBonusTxt;
  var _samhapTxt = samhapBonusTxt;

  score = Math.max(0, Math.min(100, Math.round(score)));

  var label,cls,tagCls,emoji;
  if(score>=80){label='?뙚 理쒓퀬????;cls='excellent';tagCls='tag-best';emoji='?뙚';}
  else if(score>=60){label='?삃 醫뗭? ??;cls='good';tagCls='tag-good';emoji='?삃';}
  else if(score>=40){label='?셽 蹂댄넻 ??;cls='neutral';tagCls='tag-ok';emoji='?셽';}
  else if(score>=20){label='?좑툘 二쇱쓽 ??;cls='caution';tagCls='tag-caut';emoji='?좑툘';}
  else{label='?뙢截???꼍 ??;cls='bad';tagCls='tag-bad';emoji='?뙢截?;}

  var evalSummary = "";
  if(jg && jg.isJong) {
    var jongLabel = jg.isGaJong ? '媛醫낃꺽' : '醫낃꺽';
    if(ganEokbu > 0 || zhiEokbu > 0) evalSummary = '?? '+jongLabel+'('+( EL_K[jg.dominant]||'')+') 媛뺥솕??;
    else if(ganEokbu < 0 || zhiEokbu < 0) evalSummary = '?좑툘 '+jongLabel+' ?쏀솕??;
    else evalSummary = '?셽 '+jongLabel+' 以묐┰??;
  } else {
    var pos = []; var neg = [];
    if(ganJohu > 0 || zhiJohu > 5) pos.push("議고썑?⑹떊"); 
    if(ganJohu < 0 || zhiJohu < -5) neg.push("議고썑湲곗떊");
    if(ganEokbu > 0 || zhiEokbu > 5) pos.push("?듬??ъ슜"); 
    if(ganEokbu < 0 || zhiEokbu < -5) neg.push("?듬?湲곌뎄");
    
    if(pos.length && !neg.length) evalSummary = "?뙚 " + pos.join("+") + " ???;
    else if(!pos.length && neg.length) evalSummary = "?뙢截?" + neg.join("+") + " ???;
    else if(pos.length && neg.length) evalSummary = "?뽳툘 蹂듯빀??(" + pos[0] + " ??";
    else evalSummary = "?셽 ?됱슫";
  }
  if(hasChungBonus) evalSummary = "?뮙[?됱떊?뚭린] " + evalSummary;
  if(hasChungPenalty) evalSummary = "?좑툘[?⑹떊?뚯넀] " + evalSummary;
  if(hasSamhapBonus) evalSummary = "狩??쇳빀諛쒕났] " + evalSummary;
  else if(hasJiheBonus) evalSummary = "?뵕[?≫빀媛뺥솕] " + evalSummary;

  // 醫낃꺽 媛뺥솕/?쏀솕/以묐┰ ?먯젙 (移대뱶 ?됱긽쨌諛곗????쒖슜)
  var jongStrength = null;
  if(jg && jg.isJong) {
    if(ganEokbu > 0 || zhiEokbu > 0) jongStrength = 'strengthen';
    else if(ganEokbu < 0 || zhiEokbu < 0) jongStrength = 'weaken';
    else jongStrength = 'neutral';
  }

  return{score:score,label:label,cls:cls,tagCls:tagCls,emoji:emoji,
    hasChungBonus:hasChungBonus,hasChungPenalty:hasChungPenalty,
    chungBonusText:chungBonusText,chungPenaltyText:chungPenaltyText,
    hasJiheBonus:hasJiheBonus, jiheBonusTxt:_jiheTxt,
    hasSamhapBonus:hasSamhapBonus, samhapBonusTxt:_samhapTxt,
    evalSummary:evalSummary, jongStrength:jongStrength};
}

/* ??? NEO_GAEUN_DB ???덈컮 ?⑺룺 ?댄닾 ????댁꽍 ??? */
var NEO_GAEUN_DB={
  fire:{
    good:{love:'?댁젙 吏??MAX. 吏湲??吏곸씠吏 ?딆쑝硫?湲고쉶???щ씪吏꾨떎. 二쇰룄?곸쑝濡??댄븘?섍굅???ш린?섍굅?? ?좏깮?대씪.',wealth:'?뺤옣 ?먮꼫吏 怨좎“. IT쨌?먮꼫吏쨌誘몃뵒???뱁꽣???먭툑???ъ엯????대컢?대떎. 留앹꽕?꾩씠 理쒕? 洹몃┝???뚮룞??',relationship:'由щ뜑??諛쒕룞 議곌굔 ?깅┰. ????대걣?대씪. ?먮꼫吏瑜??섎닠二쇰뒗 寃??꾨땲??諛⑺뼢???쒖떆?대씪.',career:'?뱀쭊쨌?댁쭅 李쎌씠 ?대졇?? ?꾨젅?좏뀒?댁뀡??留앹튂硫??먯뾽?먮뱷?대땲 以鍮꾪븯怨??ㅼ뼱媛??',health:'?ъ옣쨌?덉븬??怨쇰???吏곸쟾?대떎. 怨쇰줈?섎㈃ ?깃낵??媛숈씠 臾대꼫吏꾨떎. 吏湲??뱀옣 ?섎㈃ ?쒓컙???뺣낫?대씪.',lifestyle:'怨쇱뿴???앺??? ?섍린(麗닸간) 怨듦컙쨌?뚮? 怨꾩뿴 ?뚰뭹쨌臾쇨? ?곗콉????議곗젅???뺣떟?대떎.'},
    bad:{love:'媛먯젙 遺덉븞??寃쎈낫. 異⑸룞??寃곗젙? 愿怨꾨? ?좊젮踰꾨┛?? ?앷컖?섍퀬 留먰빐??',wealth:'異⑸룞 ?뚮퉬쨌?ш린??踰좏똿? ?먯궡?됱쐞?? ?덉쟾?먯궛?쇰줈 ?ы듃?대━?ㅻ? ?ы렪?대씪.',relationship:'?좎꽑 諛쒖뼵??愿怨꾨? 留앷??⑤┛?? 留먰븯湲??꾩뿉 3珥?硫덉떠?? ?닿쾶 泥쒓린媛??',career:'?곸궗???異⑸룎? ?⑥갑?대떎. ?닿린怨??띠쑝硫??ㅻ젰?쇰줈留?利앸챸?대씪.',health:'?ㅽ듃?덉뒪 ?꾩쟻???꾧퀎?먯씠?? 紐낆긽쨌?명씉踰뺤쓣 利됱떆 ?꾩엯?섏? ?딆쑝硫?紐몄씠 癒쇱? ?뚯뾽?쒕떎.',lifestyle:'?섍린(麗닸간) 蹂댁셿 ?꾩닔?? ?⑤룄瑜???텛怨??뚮???怨꾩뿴濡??섍꼍??諛붽퓭??'}
  },
  water:{
    good:{love:'媛먯젙 源딆씠? ?뚰넻 ?λ젰???뺤젏?대떎. 吏꾩쭨 ??붾? ?쒖옉?섎㈃ 愿怨꾧? ?ㅼ쓬 ?④퀎濡?媛꾨떎.',wealth:'?좏넻쨌臾쇰쪟쨌肄섑뀗痢??뚮옯?쇱뿉???꾧툑 ?먮쫫???대┛?? ?좊룞?깆쓣 ?뺣낫?섍퀬 ?먮쫫?????',relationship:'寃쎌껌 紐⑤뱶 ?쒖꽦?? ?좊ː??吏湲??볦? ?딆쑝硫??ㅼ쓬 ?먯뿉 ?녿떎.',career:'湲고쉷쨌泥쒓린 ?낅Т?먯꽌 ?뺣룄???쇳룷癒쇱뒪瑜??????덈떎. ?댁쇅 梨꾨꼸???댁뼱遊먮씪.',health:'?좎옣쨌諛⑷킅???쎌젏?대떎. ?섎텇 ??랬?됱쓣 吏湲??뱀옣 ?섎━怨?泥댁삩???좎??대씪.',lifestyle:'遺곹뼢쨌寃?빧룸꽕?대퉬 ?명뀒由ъ뼱. ?⑥쿇쨌?대????먮꼫吏 由ъ뀑??理쒖쟻?대떎.'},
    bad:{love:'?곗쑀遺?⑦븿? ?곷?諛⑹쓣 吏移섍쾶 留뚮뱺?? 吏湲?"?덉뒪"??"????寃곗젙???대젮??',wealth:'?덉씠 以꾩쨪 ?덇퀬 ?덈떎. 鍮꾩긽湲?怨꾩쥖 遺꾨━媛 吏湲??뱀옣 ?댁빞 ????1?쒖쐞??',relationship:'?뚭레???쒕룄??怨좊┰???먯큹?쒕떎. 遺덊렪?대룄 癒쇱? ?곕씫?대씪.',career:'臾닿린?Β룹슦?몄? ?좏깮???꾨땲??利앹긽?대떎. ?묒? ????紐⑸줉遺???쒖옉?댁꽌 ?뚮? 媛?숈떆耳쒕씪.',health:'?됱쬆쨌?쒗솚湲??댁긽 ?좏샇媛 耳쒖죱?? ?대룞?쇰줈 泥댁삩 ?щ━??寃껋씠 理쒖꽑??泥섎갑?대떎.',lifestyle:'?뉖퀡쨌?곕쑜???뚮즺쨌遺됱? ?뚰뭹???꾩닔 泥섎갑?대떎. 吏湲??뱀옣 ?곸슜?대씪.'}
  },
  wood:{
    good:{love:'?먯뿰?ㅻ윭???깆옣 湲곕컲 愿怨꾧? ?뺤꽦?쒕떎. ?④퍡 紐⑺몴瑜??ν빐 ?щ━???뚰듃?덈? 李얠븘??',wealth:'援먯쑁쨌諛붿씠?ㅒ룹튇?섍꼍???⑷툑 ?쒖옣?대떎. ?κ린 ?ъ??섏쑝濡?媛?멸???',relationship:'?ъ슜??UP, 硫섑넗 ?ъ??섏씠 ?대졇?? 洹???븷???뚰뵾?섏? 留덈씪.',career:'???꾨줈?앺듃 ?뚯엯 ??대컢?대떎. ?먭꺽利씲룹뒪???낆뿉 ?ъ옄?섎㈃ ROI媛 ?믩떎.',health:'媛꽷룸떞??씠 ?좏샇瑜?蹂대궦?? ?ㅽ듃?덉묶쨌?붽?瑜?猷⑦떞???ｌ뼱??',lifestyle:'?숉뼢 鍮쎛룸끃???앸Ъ쨌???곗콉. ??議고빀???먮꼫吏 異⑹쟾 怨듭떇?대떎.'},
    bad:{love:'?댁긽留??믨퀬 ?ㅽ뻾???녿떎硫?愿怨꾨뒗 吏꾩쟾???녿떎. ?됰룞?섍굅???ш린?섍굅??',wealth:'怨꾪쉷留??볦씠怨??ㅽ뻾???놁쑝硫?湲고쉶鍮꾩슜留??붾떎. 吏湲??뱀옣 ?섎굹?쇰룄 ?쒖옉?대씪.',relationship:'怨좎쭛? ?멸컙愿怨꾨? 醫곴쾶 留뚮뱺?? ??묒? ?⑤같媛 ?꾨땲???꾩닠?대떎.',career:'70% ?꾩꽦?꾨줈 ?대낫?대뒗 ?⑷린媛 ?놁쑝硫??꾨Т寃껊룄 ?꾩꽦?섏? ?딅뒗??',health:'?뚰솕湲?怨쇰???寃쎈낫. 怨쇱떇??硫덉텛怨??앹궗 媛꾧꺽??洹쒖튃?뷀빐??',lifestyle:'湲덇린???뚰뭹?쇰줈 寃곕떒?μ쓣 蹂댁셿?대씪. ?꾨꼍二쇱쓽 ?대젮?볤린媛 理쒖슦??泥쒓린媛??'}
  },
  metal:{
    good:{love:'愿怨??뺣┰ ??대컢?대떎. 寃고샎쨌?쎌냽 ???뺤젙??寃곗젙???대┫ 紐낅텇??異⑸텇?섎떎.',wealth:'湲덉쑖쨌遺?숈궛쨌踰뺣쪧 ?뱁꽣?먯꽌 怨꾩빟 湲고쉶媛 ?대┛?? ?쒕쪟??諛섎뱶??瑗쇨세??寃?좏빐??',relationship:'怨듭젙???먯튃二쇱쓽媛 ?좊ː瑜?留뚮뱺?? 以묒옱???ъ??섏쓣 ?곴레 ?쒖슜?대씪.',career:'?깃턿 吏꾨쾿 援ъ텞쨌?섑샇쨌媛먮룆 ??븷?먯꽌 ?깃낵媛 ?섏삩?? ?닿쾬???뱀떊???곹뿕 吏?쒕떎.',health:'?먃룸????섑샇媛 ?꾩닔?? ?명씉湲??덈갑 猷⑦떞??吏湲??몄썙??',lifestyle:'?쒗뼢쨌?곗깋쨌?뚯깋 誘몃땲硫 怨듦컙. ?뺣━?뺣룉???닿린瑜??щ━??媛??鍮좊Ⅸ 諛⑸쾿?대떎.'},
    bad:{love:'?됱젙?⑥씠 ?곷?瑜?諛爾먮궦?? 媛먯젙 ?쒗쁽???듭?濡쒕씪???곗뒿?댁빞 ?쒕떎.',wealth:'吏?섏튇 ?덉빟? 湲고쉶鍮꾩슜???ㅼ슫?? ?섏씡???덈뒗 怨녹뿏 怨쇨컧???ъ옄?대씪.',relationship:'鍮꾪뙋? ?낆씠?? 移?갔 1 鍮꾪뙋 0.5 鍮꾩쑉濡?利됱떆 議곗젙?대씪.',career:'?듯넻??寃곗뿬媛 ? ??웾??媛됱븘癒밸뒗?? ?곹솴 ?먮떒???먯튃蹂대떎 ?욎꽌?????뚭? ?덈떎.',health:'嫄댁“利앹씠 ?⑤じ?먯꽌 ?섑??쒕떎. ?섎텇 蹂댁땐쨌蹂댁뒿??利됱떆 猷⑦떞?뷀빐??',lifestyle:'?곕쑜???됯컧쨌媛먯꽦 肄섑뀗痢좊줈 ?깅뵳???먮꼫吏瑜???대씪. ?닿굔 ?좏깮???꾨땲???꾩닔??'}
  },
  earth:{
    good:{love:'?덉젙?겶룹옣湲곗쟻 愿怨꾧? ?대┛?? ?숆굅쨌寃고샎??寃?좏븯湲?醫뗭? ??대컢?대떎.',wealth:'遺?숈궛쨌嫄댁꽕쨌?앺뭹 遺꾩빞?먯꽌 ?먯궛 異뺤쟻 ?먮쫫???뺤꽦?쒕떎. ?異?癒쇱?, ?ъ옄??洹??ㅼ쓬?대떎.',relationship:'?좊ː諛쏅뒗 議곕젰???ъ????뺣낫. ?뱀떊???좊뱺??踰꾪?紐⑹씠 ?섎뒗 ?쒓린??',career:'袁몄??⑥씠 ?깃낵濡??꾪솚?섎뒗 援ш컙?대떎. ?κ린 ?꾨줈?앺듃 ?꾩닔 ?λ젰??利앸챸?대씪.',health:'?꾩옣쨌鍮꾩옣 ?섑샇 援ш컙?대떎. 遺덇퇋移??앹궗쨌?쇱떇??利됱떆 ?딆뼱??',lifestyle:'以묒븰 諛곗튂쨌?몃??됀룰컝??怨듦컙. ?꾩삁쨌?붾━媛 ?잕린??異⑹쟾??媛???⑥쑉?곸씠??'},
    bad:{love:'吏猷⑦븿? 愿怨꾨? 媛됱븘癒밸뒗?? ?덈줈???곗씠?맞룹꽌?꾨씪?댁쫰 ?대깽?몃? ?뱀옣 湲고쉷?대씪.',wealth:'蹂???뚰뵾媛 ?먯떎???ㅼ슫?? ?덈줈???섏씡 紐⑤뜽 ?먯깋??吏湲??쒖옉?대씪.',relationship:'?먯뇙???쒕룄媛 ?몃㎘??醫곹엺?? 遺덊렪?대룄 ?덈줈???ㅽ듃?뚰겕??諛쒖쓣 ?ㅼ뿬??',career:'?꾩옱 ?먮━???덉＜?섎㈃ ?꾪깭?쒕떎. ?먭린怨꾨컻 ?ъ옄瑜?吏湲??쒖옉?대씪.',health:'泥댁쨷쨌?덈떦 ?섑샇 援ш컙?대떎. ?좎궛???대룞??二?3???댁긽 媛뺤젣?대씪.',lifestyle:'?쒕룞???ш?쨌?ы뻾?쇰줈 ?뺤껜???먮꼫吏瑜???뚰빐?? 吏湲??뱀옣 怨꾪쉷???몄썙??'}
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

/* ??醫낃꺽 媛먮퀎 UI (Interactive Jong-gyeok) ??*/
function extractSixPastTestingYears(jongResult, p) {
  var yongshin = [jongResult.dominant, jongResult.parEl];
  if(jongResult.name.indexOf('醫낆븘')>-1) yongshin.push(KE[jongResult.dayEl]); // ?앹긽 ?앹옱
  if(jongResult.name.indexOf('醫낆옱')>-1) yongshin.push(SHENG[jongResult.dominant]); // ?앹긽 ?앹옱
  if(jongResult.name.indexOf('醫낆궡')>-1) yongshin.push(KE[jongResult.dayEl]); // ?ъ꽦 ?앹궡
  
  var kishin = [whoControls(jongResult.dominant)];
  var JongSelfNames = ['醫낃컯寃?, '怨≪쭅寃?, '?쇱긽寃?, '媛?됯꺽', '醫낇쁺寃?, '?ㅽ븯寃?, '醫낆솗寃?];
  var isFollowingSelf = false;
  JongSelfNames.forEach(function(n) { if(jongResult.name.indexOf(n)>-1) isFollowingSelf = true; });

  if (!isFollowingSelf) {
      kishin.push(jongResult.dayEl, parentOf(jongResult.dayEl));
  } else {
      kishin.push(KE[jongResult.dayEl], SHENG[jongResult.dayEl], whoControls(jongResult.dayEl));
  }

  var cY = new Date().getFullYear();
  var candidates = [];
  var GAN_E = { '??:'wood','阿?:'wood','訝?:'fire','訝?:'fire','??:'earth','藥?:'earth','佯?:'metal','渦?:'metal','鶯?:'water','??:'water' };
  var ZHI_E = { '耶?:'water','訝?:'earth','野?:'wood','??:'wood','渦?:'earth','藥?:'fire','??:'fire','??:'earth','??:'metal','??:'metal','??:'earth','雅?:'water' };
  var gArr = ['??,'阿?,'訝?,'訝?,'??,'藥?,'佯?,'渦?,'鶯?,'??];
  var zArr = ['耶?,'訝?,'野?,'??,'渦?,'藥?,'??,'??,'??,'??,'??,'雅?];
  
  var birthYear = p.y.y ? parseInt(p.y.y) : (cY - 30);
  for(var i=cY-25; i<=cY-1; i++) {
      var diff = i - 1984; // 1984???꿨춴??湲곗?
      var gId = (diff % 10 + 10) % 10;
      var zId = (diff % 12 + 12) % 12;
      if (gId < 0) gId += 10;
      if (zId < 0) zId += 12;
      var g = gArr[gId]; var z = zArr[zId];
      if (i - birthYear > 8) { // 8???댁쟾 怨쇨굅???쒖쇅
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
      var bestText = parsedYrs.best.map(function(y){return y.y+"??" + y.g + y.z + ")"}).join(', ');
      var worstText = parsedYrs.worst.map(function(y){return y.y+"??" + y.g + y.z + ")"}).join(', ');
      
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(4px); padding:20px;';
      
      var box = document.createElement('div');
      box.style.cssText = 'background:#1a1a2e; color:#e2e8f0; max-width:700px; width:100%; border-radius:12px; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5); border:1px solid #c084fc; max-height: 90vh; overflow-y: auto;';
      var descText = jongResult.isGaJong
        ? '??紐낆떇? <b>' + jongResult.name + '</b>??媛?μ꽦???덉뒿?덈떎. 吏諛??ㅽ뻾??媛뺣룄媛 70~80% ?댁긽 ?섏??쇰줈, ?ㅼ젣 ?띠쓽 ?먮쫫怨??議고빐 醫낃꺽 ?щ?瑜???踰???寃利앺빀?덈떎.<br><br><b style="color:#f472b6;">?꾨옒 ????곕룄?ㅼ쓽 湲명쓨??醫낃꺽 ?⑦꽩怨??쇱튂?섎㈃ 媛醫낃꺽?쇰줈 ?뺤젙?⑸땲??</b>'
        : '??紐낆떇? <b>' + jongResult.name + '</b>??媛?μ꽦???덉뒿?덈떎. ?쇨컙???뺣뒗 湲곗슫?대굹 諛섎? ?몃젰???댁옣?섏뼱 ?덉뼱 吏꾩쥌寃??욃풛?? ?щ?瑜??먮퀎?댁빞 ?⑸땲??<br><br><b style="color:#f472b6;">?뺥솗???먮퀎???꾪빐 ?ㅼ쓬 ?곕룄?ㅼ쓽 湲명쓨???뺤씤??二쇱떗?쒖삤.</b>';
      box.innerHTML = `
          <div style="font-size:1.3rem; font-weight:bold; color:#c084fc; margin-bottom:14px; text-align:center;">
              <i class="fa fa-balance-scale"></i> ${jongResult.isGaJong ? '媛醫낃꺽(?뉐풛??' : '醫낃꺽(孃욄졏)'} ?뺣? ?먮퀎
          </div>
          <div style="font-size:0.95rem; line-height:1.6; color:#cbd5e1; margin-bottom:20px; text-align:justify;">
              ${descText}
          </div>
          
          <div style="background:#0f172a; padding:16px; border-radius:8px; border:1px solid #334155; margin-bottom:16px;">
              <div style="font-weight:bold; color:#10b981; margin-bottom:10px; font-size:1.05rem;">[湲몄슫???쒓린 ?議?</div>
              <div style="color:#94a3b8; font-size:0.9rem; margin-bottom:12px;">????곕룄: ${bestText}</div>
              <div style="color:#e2e8f0; font-size:0.95rem; margin-bottom:12px;">"???쒓린???ы쉶???깆랬媛 ?섏썡?섍쾶 醫뗭븯怨??щ━?곸쑝濡??덉젙?섏뿀?듬땲源?"</div>
              <div style="display:flex; gap:12px;">
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="best_ans" value="yes" checked> <span style="font-size:1rem; color:#a7f3d0; font-weight:bold;">?? 留욎뒿?덈떎.</span></label>
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="best_ans" value="no"> <span style="font-size:1rem;">?꾨땲??/span></label>
              </div>
          </div>

          <div style="background:#0f172a; padding:16px; border-radius:8px; border:1px solid #334155; margin-bottom:24px;">
              <div style="font-weight:bold; color:#ef4444; margin-bottom:10px; font-size:1.05rem;">[?됱슫???쒓린 ?議?</div>
              <div style="color:#94a3b8; font-size:0.9rem; margin-bottom:12px;">????곕룄: ${worstText}</div>
              <div style="color:#e2e8f0; font-size:0.95rem; margin-bottom:12px;">"???쒓린??嫄닿컯, ?щЪ, ?뱀? 愿怨꾩쓽 洹뱀떖??遺移⑥씠 ?덉뿀?듬땲源?"</div>
              <div style="display:flex; gap:12px;">
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="worst_ans" value="yes" checked> <span style="font-size:1rem; color:#fca5a5; font-weight:bold;">?? 留욎뒿?덈떎.</span></label>
                  <label style="flex:1; cursor:pointer;"><input type="radio" name="worst_ans" value="no"> <span style="font-size:1rem;">?꾨땲??/span></label>
              </div>
          </div>

          <button id="btnJongSubmit" style="width:100%; padding:15px; background:linear-gradient(135deg, #a855f7, #7e22ce); border:none; border-radius:8px; color:#fff; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 12px rgba(168,85,247,0.3);">理쒖쥌 寃⑷뎅 ?뺤젙</button>
      `;
      
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      document.getElementById('btnJongSubmit').onclick = function() {
          var bestAns = document.querySelector('input[name="best_ans"]:checked').value;
          var worstAns = document.querySelector('input[name="worst_ans"]:checked').value;

          document.body.removeChild(overlay);

          if (bestAns === 'yes' && worstAns === 'yes') {
              jongResult.isJong = true;
              var confirmLabel = jongResult.isGaJong ? '媛醫낃꺽 ?뺤젙' : '醫낃꺽 ?뺤젙';
              jongResult.verifiedText = "<span style='color:#a855f7'>[" + confirmLabel + "]</span> 怨쇨굅??湲명쓨 ?붾났???議고븳 寃곌낵, ?대떦 ?ㅽ뻾??醫?孃??섎뒗 "+jongResult.name+"???댁꽭 ?먮쫫???쇱튂?⑥씠 寃利앸릺?덉뒿?덈떎.";
              resolve(jongResult);
          } else {
              resolve({isJong: false, verifiedText: "<span style='color:#3b82f6'>[?쇰컲 ?닿꺽 ?꾪솚]</span> 怨쇨굅 ?댁꽭 ?먮쫫??醫낃꺽??湲명쓨怨??쇱튂?섏? ?딆븘 ?쇰컲寃??닿꺽)?쇰줈 ?뚭??섏뿬 ?щ텇?앺븯??듬땲??"});
          }
      };
  });
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   媛쒖씤?뺣낫 ?숈쓽 紐⑤떖 ?쒖뼱
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
var FORTUNE_COST_POINTS = 1000;
var __fortuneConsumeInFlight = false;

function formatPointAmount(points){
  var n = Number(points || 0);
  if (!Number.isFinite(n)) n = 0;
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
    currentEl.textContent = isGuestFortuneModeEnabled() ? '鍮꾪쉶??臾대즺 ?댁슜' : '濡쒓렇?????뺤씤';
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
      + formatPointAmount(costPoints).replace('P',' ?ъ씤??)
      + '媛 李④컧?⑸땲?? 怨꾩냽?섏떆寃좎뒿?덇퉴?'
      + '</div>'
      + '<div style="display:flex;gap:10px;">'
      + '<button id="fortunePointCancelBtn" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(221,214,254,.45);background:rgba(30,41,59,.45);color:#e2e8f0;font-weight:700;cursor:pointer;">痍⑥냼</button>'
      + '<button id="fortunePointConfirmBtn" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(196,181,253,.6);background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 0 18px rgba(168,85,247,.45);">怨꾩냽?섍린</button>'
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
  if (window.__SKIP_FORTUNE_POINT_GATE === true) return true;

  var token = getFortuneAuthToken();
  if (!token) {
    if (isGuestFortuneModeEnabled()) {
      updateFortunePointNotice();
      return true;
    }

    var goLogin = window.confirm('濡쒓렇?몄씠 ?꾩슂?⑸땲?? 濡쒓렇???섏씠吏濡??대룞?좉퉴??');
    if (goLogin) redirectToLoginForFortune();
    return false;
  }

  var confirmed = await showFortuneConfirmModal(FORTUNE_COST_POINTS);
  if (!confirmed) return false;

  try {
    var response = await fetch(getFortuneApiBaseUrl() + '/api/fortune/check', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    var payload = {};
    try { payload = await response.json(); } catch(e) {}

    if (response.status === 401) {
      alert(payload.message || '濡쒓렇?몄씠 留뚮즺?섏뿀?듬땲?? ?ㅼ떆 濡쒓렇?명빐 二쇱꽭??');
      try {
        localStorage.removeItem('fortune_auth_token');
        localStorage.removeItem('fortune_auth_user');
      } catch(e) {}
      redirectToLoginForFortune();
      return false;
    }

    if (response.status === 402) {
      alert((payload && payload.message ? payload.message : '?ъ씤?멸? 遺議깊빀?덈떎.') + '\n?ъ씤??異⑹쟾 ?섏씠吏濡??대룞?⑸땲??');
      redirectToPointRecharge();
      return false;
    }

    if (!response.ok) {
      alert(payload.message || '?ъ씤???뺤씤 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
      return false;
    }

    if (payload && typeof payload.currentPoints === 'number') {
      updateFortunePointNotice(payload.currentPoints);
    }

    return true;
  } catch (error) {
    console.error('[points] fortune check failed', error);
    alert('?ъ씤???쒕쾭? ?듭떊?섏? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
    return false;
  }
}

async function consumeFortunePointAfterCalculation(){
  if (window.__SKIP_FORTUNE_POINT_GATE === true) return true;
  if (__fortuneConsumeInFlight) return false;

  var token = getFortuneAuthToken();
  if (!token) {
    if (isGuestFortuneModeEnabled()) return true;
    return false;
  }

  __fortuneConsumeInFlight = true;
  try {
    var response = await fetch(getFortuneApiBaseUrl() + '/api/fortune/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        reason: '?ъ＜ 遺꾩꽍 寃곌낵 議고쉶 ?ъ씤??李④컧'
      })
    });

    var payload = {};
    try { payload = await response.json(); } catch(e) {}

    if (response.status === 401) {
      try {
        localStorage.removeItem('fortune_auth_token');
        localStorage.removeItem('fortune_auth_user');
      } catch(e) {}
      return false;
    }

    if (response.status === 402) {
      alert((payload && payload.message ? payload.message : '?ъ씤?멸? 遺議깊빀?덈떎.') + '\n?ъ씤??異⑹쟾 ?섏씠吏濡??대룞?⑸땲??');
      redirectToPointRecharge();
      return false;
    }

    if (!response.ok) {
      alert(payload.message || '?ъ씤??李④컧 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
      return false;
    }

    if (payload && payload.user && typeof payload.user.points === 'number') {
      var user = getStoredAuthUser();
      if (user) {
        user.points = payload.user.points;
        try { localStorage.setItem('fortune_auth_user', JSON.stringify(user)); } catch(e) {}
      }
      updateFortunePointNotice(payload.user.points);
    }

    return true;
  } catch (error) {
    console.error('[points] fortune consume failed', error);
    return false;
  } finally {
    __fortuneConsumeInFlight = false;
  }
}

async function checkPrivacyAndCalculate() {
  if (sessionStorage.getItem('privacyAgreed') === 'true') {
    await startSajuCalculationFlow();
  } else {
    document.getElementById('privacy-modal-overlay').classList.add('show');
  }
}

function closePrivacyModal() {
  document.getElementById('privacy-modal-overlay').classList.remove('show');
}

async function agreeAndCalculate() {
  sessionStorage.setItem('privacyAgreed', 'true');
  closePrivacyModal();
  await startSajuCalculationFlow();
}

async function startSajuCalculationFlow() {
  if(typeof Solar==='undefined'||typeof Solar.fromYmdHms!=='function'){
    if (!__libLoading && !__libReady) {
      retrySajuLibraryLoad();
    }
    alert('?쇱씠釉뚮윭由ш? ?꾩쭅 濡쒕뵫 以묒엯?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂 ?맰');return;
  }
  var bd=document.getElementById('birthDate').value;
  if(!bd){alert('?앸뀈?붿씪???낅젰?섏꽭??);return;}

  var canProceed = await checkFortunePointEligibility();
  if (!canProceed) return;

  // 留뚯꽭??梨?濡쒕뜑 湲곕뒫 ?쒓굅: ?대┃ 利됱떆 怨꾩궛 ?ㅽ뻾
  try {
    await calculate();
  } catch (calcErr) {
    console.error('[saju] calculate flow failed', calcErr);
    return;
  }

  var resultPage = document.getElementById('resultPage');
  var isResultVisible = !!(resultPage && resultPage.style.display !== 'none');
  if (!isResultVisible) return;

  await consumeFortunePointAfterCalculation();
}

setTimeout(function(){
  try { updateFortunePointNotice(); } catch(e) {}
}, 0);

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   STEP 6: 硫붿씤 怨꾩궛
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
async function calculate(){
  if(typeof Solar==='undefined'||typeof Solar.fromYmdHms!=='function'){
    alert('?쇱씠釉뚮윭由ш? ?꾩쭅 濡쒕뵫 以묒엯?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂 ?맰');return;
  }
  var existingCharm=document.getElementById('specialCharmCard');
  if(existingCharm)existingCharm.remove();
  
  USER_NAME=document.getElementById('nameInput').value.trim()||'?ъ슜??;
  var bd=document.getElementById('birthDate').value;
  if(!bd){alert('?앸뀈?붿씪???낅젰?섏꽭??);return;}
  
  var calTypeBtns = document.getElementsByName('calType');
  var calType = 'solar';
  for(var i=0; i<calTypeBtns.length; i++) { if(calTypeBtns[i].checked) { calType = calTypeBtns[i].value; break; } }

  var hour=parseInt(document.getElementById('birthHour').value)||12;
  var minute=parseInt(document.getElementById('birthMinute').value)||0;

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
  if(!actualDateInfo) { alert('?좎쭨 蹂?섏뿉 ?ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.'); return; }

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

  correctionMsg = `<li><span class="hero-correction-label">?쒓컙 蹂댁젙 ?댁뿭</span> ?낅젰?쒓컙: ${inputTimeStr} ??蹂댁젙?쒓컙: ${resultObj.finalAdjustedTime}</li>`
                + `<li>異쒖깮吏: ${opt ? opt.text : bTz}</li>`
                + `<li>?쒓컙?: UTC${bTzOff >= 0 ? '+' : ''}${bTzOff} (?쒖? UTC${tzResolved.baseOffsetHours >= 0 ? '+' : ''}${tzResolved.baseOffsetHours})</li>`
                + `<li>寃쎈룄 蹂댁젙: ${lngOffsetMinutes}遺?(湲곗?寃쎈룄 ${stdLong}째 vs ?ㅼ젣寃쎈룄 ${bLong}째)</li>`
                + `<li>?쒕㉧???DST) ?곸슜: ${tzResolved.dstMinutes}遺?/li>`
                + `<li>珥?蹂댁젙 ?쒓컙: ${lngOffsetMinutes}遺?/li>`;

  // ?먯꽦??怨꾩궛 ?꾩슜 ?먮낯(?쒖??? 異쒖깮 ?곗씠??  window._astroBirth={year:year,month:month,day:day,hour:hour,minute:minute,lat:bLat,lon:bLong,tz:bTzOff};

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
    // 醫낃꺽/媛醫낃꺽 紐⑤몢 寃利?紐⑤떖濡??ъ슜???뺤씤
    if (_tj.isJong) {
      _tj = await showJongVerificationModal(_tj, p);
    }
    G_JONG = _tj;

    G_BAZI=bazi;
    _syncDestinyFlowerSajuSnapshot('full-analysis');

    document.getElementById('inputPage').style.display='none';
    document.getElementById('resultPage').style.display='block';
    // ?ㅻ쾭?덉씠 ?リ린??startSajuCalculationFlow??Promise.all?먯꽌 泥섎━
      document.getElementById('letterBox').style.display='block';
      document.getElementById('emailSubBox').style.display='block';
      document.getElementById('btnNewSaju').style.display='block';
    requestAnimationFrame(function () {
      setTimeout(function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    });

    var animal=(JI[yz]||{}).a||'';
    var dayAnimal=(JI[dz]||{}).a||'';
    document.getElementById('heroAnimal').textContent=(ANIMAL_EMOJI[dayAnimal]||ANIMAL_EMOJI[animal]||'?맰');
    document.getElementById('heroName').textContent=USER_NAME;
    
    var timeCorrectionStr = "";
    if(correctionMsg) {
      timeCorrectionStr = `<section class="hero-correction-card" aria-label="吏꾪깭?묒떆 ?먮룞 蹂???곸슜">
                            <h4 class="hero-correction-title"><i class="fa fa-clock-o" aria-hidden="true"></i> 吏꾪깭?묒떆 ?먮룞 蹂???곸슜</h4>
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
      var leapStr = lunarDateObj.isLeap ? '(?ㅻ떖)' : '(?됰떖)';
      lunarInfo = `<div class="hero-lunar-row"><span class="hero-lunar-label">?낆텣湲곗? ?꾨룄</span><span class="hero-lunar-value">${bazi.getYearGan()}${bazi.getYearZhi()}??/span></div>`
               + `<div class="hero-lunar-row"><span class="hero-lunar-label">?뚮젰</span><span class="hero-lunar-value">${lunarDateObj.year}??${lunarDateObj.month}??${lunarDateObj.day}??${leapStr}</span></div>`;
    } catch(e) {}

    var countryText = document.getElementById('birthCountry').options[document.getElementById('birthCountry').selectedIndex].text;
    document.getElementById('heroSub').innerHTML=
      '<div class="hero-sub-grid">'
      + '<div class="hero-meta-row hero-meta-row--birth">'+year+'??'+month+'??'+day+'??'+hour+'??'+minute+'遺?<span class="hero-meta-place">(' + countryText + ')</span></div>'
      + (lunarInfo ? ('<div class="hero-divider"></div><div class="hero-lunar-wrap">'+lunarInfo+'</div>') : '')
      + '<div class="hero-divider"></div>'
      + '<div class="hero-meta-row hero-meta-row--identity">'+(GENDER==='M'?'?⑥꽦':'?ъ꽦')+' 쨌 '+animal+'??쨌 ?쇱? '+dz+'('+dayAnimal+') 쨌 留?'+(CURRENT_AGE-1)+'??/div>'
      + '</div>'
      + timeCorrectionStr;

    try { renderManse(p); } catch(e) { console.error('Manse ?먮윭:', e); }
    try { renderIlju(p); } catch(e) { console.error('Ilju ?먮윭:', e); }
    try { renderTenshin(p); } catch(e) { console.error('Tenshin ?먮윭:', e); }
    try { renderJohu(johu); } catch(e) { console.error('Johu ?먮윭:', e); }
    try { renderUkbu(p); } catch(e) { console.error('Ukbu ?먮윭:', e); }
    try { renderAstroInsight(); } catch(e) { console.error('AstroInsight ?먮윭:', e); }
    try { renderSkillTree(p,natal); } catch(e) { console.error('SkillTree ?먮윭:', e); }
    try { renderSummary(p,johu,natal); } catch(e) { console.error('Summary ?먮윭:', e); }
    try { renderEnergyCoord(natal); } catch(e) { console.error('EnergyCoord ?먮윭:', e); }
    try { renderHealthReport(p, natal, johu, G_POWER, G_JONG); } catch(e) { console.error('HealthReport ?먮윭:', e); }
    try { renderTTest(p, natal, johu, G_POWER); } catch(e) { console.error('TTest ?먮윭:', e, e.stack); }
    try { renderLottoNumbers(natal, bazi); } catch(e) { console.error('LottoNumbers ?먮윭:', e); }
    try { renderSukuyo(p, natal, bazi, typeof lunarDateObj !== 'undefined' ? lunarDateObj : null); } catch(e) { console.error('Sukuyo ?먮윭:', e); }
    try { renderQuantumStrategy(p, natal, bazi); } catch(e) { console.error('QuantumStrategy ?먮윭:', e); }
    try { renderSpecialCharm(p, natal); } catch(e) { console.error('SpecialCharm ?먮윭:', e); }
    try { renderDaewun(bazi); } catch(e) { console.error('Daewun ?먮윭:', e, e.stack); }
    try {
      var _dailyMonthlyPromise = renderDailyMonthlyFortune(p);
      if (_dailyMonthlyPromise && typeof _dailyMonthlyPromise.catch === 'function') {
        _dailyMonthlyPromise.catch(function(e){ console.error('DailyMonthlyFortune ?먮윭:', e, e && e.stack); });
      }
    } catch(e) { console.error('DailyMonthlyFortune ?먮윭:', e, e.stack); }
    try { renderLetter(p); } catch(e) { console.error('Letter ?먮윭:', e); }
    try { renderTodayDestinyCard(p); } catch(e) { console.error('TodayDestinyCard ?먮윭:', e); }
    findSimilarCelebs(p);
    try { renderVillain(p, G_POWER); } catch(e) { console.error('Villain ?먮윭:', e); }
    try { renderHormoneVibe(p, G_POWER); } catch(e) { console.error('HormoneVibe ?먮윭:', e, e.stack); }
    try { renderReportDashboard(); } catch(e) { console.error('ReportDashboard ?먮윭:', e); }
    var ss=document.getElementById('shareSection');if(ss)ss.style.display='block';
    document.getElementById('dwDetail').innerHTML='';
    document.getElementById('dwDetail').classList.remove('show');

    document.getElementById('currentAgeInfo').innerHTML=
      '<b>?꾩옱 ?섏씠:</b> 留?'+(CURRENT_AGE-1)+'????'+
      (G_JONG&&G_JONG.isJong&&G_JONG.isGaJong?'<b style="color:#7B1FA2">媛醫낃꺽(?뉐풛?? ?ъ＜</b> <span style="font-size:.75rem;color:#9C27B0">('+G_JONG.name+')</span> ??吏諛??ㅽ뻾 以묒떖 ?먮떒':
       G_JONG&&G_JONG.isJong?'<b style="color:#9C27B0">醫낃꺽(?욃풛?? ?ъ＜</b> ??吏諛??ㅽ뻾 以묒떖 ?먮떒':
        G_POWER&&G_POWER.isStrong?'<b style="color:#FF8BA7">?좉컯 ?ъ＜</b> ???듬?+議고썑 ?듯빀 ?먮떒':
        '<b style="color:#2196F3">?좎빟 ?ъ＜</b> ???듬?+議고썑 ?듯빀 ?먮떒');

  }catch(err){
    console.error(err);
    alert('?ъ＜ 怨꾩궛 ?ㅻ쪟: '+err.message);
  }
}

/* ??? ?ъ＜ ?꾨컮? & ?댁긽??AI ?꾨＼?꾪듃 ?앹꽦 ??? */
function generateAvatarPrompt(p){
  var avatarMap={
    '??:'Elegant spring deer with soft pastel green and cream colors, delicate antlers, gentle eyes, surrounded by leaves and flowers, cute nature spirit, watercolor style, whimsical, botanical aesthetic',
    '阿?:'Graceful climbing cat with pastel pink and sage green tones, flexible pose, dreamy expression, wrapped in climbing vines, mystical energy, soft illustration style, enchanting atmosphere',
    '訝?:'Radiant phoenix or fire bird with golden pastel yellow and coral hues, flowing feathers, bright joyful eyes, surrounded by gentle flames and light, warmth and vitality, storybook illustration',
    '訝?:'Soft warm rabbit with pastel rose pink and peach tones, glowing eyes, cozy expression, holding a small lamp or candle, intimate and nurturing energy, gentle illustration style',
    '??:'Sturdy gentle mammoth or earth bear with cream, warm brown, and earthy beige tones, grounded presence, protective aura, surrounded by mountains or earth elements, stable and comforting',
    '藥?:'Nurturing honey bee or butterfly with pastel golden yellow and blush pink, delicate wings, caring expression, pollinating flowers, connecting energy, soft botanical illustration',
    '佯?:'Sleek silver wolf or snow leopard with cool silver-white and soft purple tones, sharp elegant features, noble bearing, pristine mountain landscape, refined and precise',
    '渦?:'Delicate white peacock or swan with pale silver, lavender and white tones, intricate beautiful patterns, perfectionist energy, jewel-like details, elegant illustration style',
    '鶯?:'Flowing water dragon or graceful whale with cool blue and silver tones, fluid curves, wise gentle eyes, surrounded by water elements, serene mysterious energy, flowing watercolor style',
    '??:'Tiny silver droplet sprite or frost fairy with pale blue and white tones, delicate translucent quality, soft glowing presence, crystalline atmosphere, dreamy ethereal illustration'
  };
  var prompt = avatarMap[p.d.g] || 'cute magical animal character, pastel colors, soft illustration, enchanting, whimsical, kawaii style, high quality, 8k';
  return prompt;
}

function generateIdealPartnerPrompt(p, natal){
  var dg=p.d.g, dj=p.d.j;
  var el=(GAN[dg]&&GAN[dg].e)||'earth';
  var elName={wood:'紐??곕뱶??',fire:'???쒗넠)',earth:'???댁뒪??',metal:'湲??ㅻ쾭??',water:'??荑⑦넠)'};
  
  var temperTypeMap={
    hot:{mood:'?댁젙???먮꼫吏',feature:'諛앹? ?쇨뎬鍮? ?앹깮???? ?곕쑜??誘몄냼'},
    warm:{mood:'?곕쑜?섍퀬 ?몄븞??,feature:'移쒓렐???④린, ?몄븞???덈튆, ?먯뿰?ㅻ윭??誘몄냼'},
    cool:{mood:'李⑤텇?섍퀬 ?좊퉬濡쒖슫',feature:'?몃젴??遺꾩쐞湲? 源딆씠 ?덈뒗 ?? ?곗븘???먰깭'},
    cold:{mood:'?뺤쟻??留ㅻ젰',feature:'?좊퉬濡쒖슫 遺꾩쐞湲? 怨좎슂??湲고뭹, 源딆씠 ?덈뒗 ?쒖젙'}
  };
  
  var tempType='warm';
  if(['訝?,'訝?,'藥?].indexOf(dg)>=0) tempType='hot';
  else if(['耶?,'鶯?,'??,'雅?].indexOf(dg)>=0) tempType='cold';
  
  var tempDesc=temperTypeMap[tempType]||temperTypeMap.warm;
  
  var partnerGender=GENDER==='F'?'handsome man':'beautiful woman';
  
  var prompt='portrait of '+partnerGender+' with '+tempDesc.mood+' aura, '+
    'wearing '+elName[el]+' color clothing, '+tempDesc.feature+', '+
    'soft natural makeup, elegant sophisticated look, warm ambient lighting, '+
    'professional portrait photography, soft focus background, natural skin texture, '+
    'korean beauty style, high quality, 8k resolution --ar 3:4';
  
  return prompt;
}

/* ??? ?ы솕 留ㅻ젰 遺꾩꽍 & AI 臾쇱긽 ?뚮뜑留?(珥덈뵒?뚯씪 踰꾩쟾) ??? */
function renderSpecialCharm(p, natal) {
  /* ?? 1. 湲곗큹 ?곗씠???? */
  var branches  = [p.y.j, p.m.j, p.d.j, p.h.j];
  var counts    = (natal&&natal.counts)?natal.counts:{wood:0,fire:0,earth:0,metal:0,water:0};
  var dominant  = (natal&&natal.dominant)?natal.dominant:'earth';
  var dayEl     = ((GAN[p.d.g]||{}).e)||'earth';
  var total     = Math.max(1, counts.wood+counts.fire+counts.earth+counts.metal+counts.water);

  /* ?? 2. ?좎궡 ?ㅽ꺈 怨꾩궛 ?? */
  var taoSet  = ['耶?,'??,'??,'??];
  var taoHit  = branches.filter(function(b){return taoSet.indexOf(b)>=0;}).length;
  var taoPct  = Math.min(100, taoHit*22 + (taoSet.indexOf(p.d.j)>=0 ? 25 : 0));

  var yemSet  = ['野?,'??,'藥?,'雅?];
  var yemHit  = branches.filter(function(b){return yemSet.indexOf(b)>=0;}).length;
  var yemNY   = (yemSet.indexOf(p.y.j)>=0?1:0)+(yemSet.indexOf(p.m.j)>=0?1:0);
  var yemPct  = Math.min(100, yemHit*20 + yemNY*15);

  var hwaSet  = ['渦?,'??,'訝?,'??];
  var hwaHit  = branches.filter(function(b){return hwaSet.indexOf(b)>=0;}).length;
  var hwaPct  = Math.min(100, hwaHit*22 + (hwaHit>=2?18:0));

  /* ?? 3. 留ㅻ젰 ?대옒??寃곗젙 ?? */
  var maxStat = Math.max(taoPct, yemPct, hwaPct);
  var cls;
  if(taoPct===maxStat && taoPct>=40){
    if(dominant==='fire') cls={icon:'?뵦',name:'?쒖뼇 ?꾨옒???밸???,sub:'諛⑹뿉 ?ㅼ뼱?쒕뒗 ?쒓컙 怨듦린媛 諛붾앸땲?? ?뱀떊??議댁옱 ?먯껜媛 媛??媛뺣젰??臾닿린?낅땲??'};
    else if(dominant==='water') cls={icon:'?뙄',name:'臾??띿쓽 ?몄뼱',sub:'?ㅺ?媛湲??대졄吏留???踰?鍮좎?硫??ㅼ뼱?섏삱 ???녿뒗 移섎챸??留ㅻ젰???뚯쑀?먯엯?덈떎.'};
    else cls={icon:'?뙶',name:'移섎챸???좏샊??,sub:'?먰븯???먯튂 ?딅뱺 二쇰????뚯뼱?밴린???먭린?μ씠 ?곸떆 ?묐룞 以묒엯?덈떎.'};
  } else if(yemPct===maxStat && yemPct>=40){
    if(dominant==='metal') cls={icon:'?뷂툘',name:'寃쎄퀎 ?녿뒗 媛쒖쿃??,sub:'醫곸? 臾대???媛?????녿뒗 ?щ엺. ???볦? ?멸퀎?먯꽌 吏꾧?瑜?諛쒗쐶?⑸땲??'};
    else cls={icon:'?뙦截?,name:'??룞?곸씤 諛⑸옉??,sub:'硫덉텛???쒓컙 留ㅻ젰??諛섍컧?⑸땲?? ?먮꼫吏 ?먯껜媛 ?뱀떊??媛????臾닿린?낅땲??'};
  } else if(hwaPct===maxStat && hwaPct>=40){
    if(dominant==='water') cls={icon:'?뵰',name:'踰좎씪???몄씤 泥좏븰??,sub:'?쎄쾶 ?쏀엳吏 ?딅뒗 源딆씠媛 ?곷?諛⑹쓣 怨꾩냽 沅곴툑?섍쾶 留뚮뱶???몃옪 留ㅻ젰?낅땲??'};
    else cls={icon:'?し',name:'怨좊룆???덉닠媛',sub:'?대㈃???띻꼍???덈Т 源딆뼱 ?듯븯???щ엺???쒕Ъ吏留? ??踰??곌껐?섎㈃ 媛뺣젹?⑸땲??'};
  } else if(dominant==='metal'){
    cls={icon:'?뭿',name:'李④????꾩떆???몃젴誘?,sub:'?⑤?濡??ㅺ?媛湲??섎뱺 遺꾩쐞湲곗? ?좎뭅濡쒖슫 ?덈ぉ???뱀떊???ш??섍쾶 留뚮벊?덈떎.'};
  } else if(dominant==='fire'){
    cls={icon:'?뙚',name:'?뺣룄???붾젮??,sub:'遺꾩쐞湲곕? 諛붽씀????? ?댁젙怨??쒗쁽?μ씠 怨?留ㅻ젰?낅땲??'};
  } else if(dominant==='wood'){
    cls={icon:'?뙼',name:'?먯뿰?ㅻ윭??泥?웾誘?,sub:'袁몃?吏 ?딆븘??鍮쏅굹???쒖닔?⑥쑝濡??щ엺??留덉쓬???ㅻŉ?쒕뒗 ??낆엯?덈떎.'};
  } else if(dominant==='water'){
    cls={icon:'?뮛',name:'?꾪뿕???좊퉬濡쒖?',sub:'源딆씠瑜??????녿뒗 ?덈튆怨?議곗슜??移대━?ㅻ쭏媛 ?곷?諛⑹쓽 寃쎄퀎瑜?臾대꼫?⑤┰?덈떎.'};
  } else {
    cls={icon:'?뿿',name:'以묐룆??媛뺥븳 ?덉젙媛?,sub:'?대뵜 媛??臾듭쭅???좊ː媛먯쓣 二쇰뒗 ?щ엺. ?쒓컙??吏?좎닔濡?留ㅻ젰??吏꾪빐吏????낆엯?덈떎.'};
  }

  /* ?? 4. ?ㅽ뻾 留덇렇?ㅽ떚利??? */
  var magMeta = {
    wood: {icon:'?뙼', name:'紐??? ???먯뿰?ㅻ윭??泥?웾誘?, pct:Math.round((counts.wood||0)/total*100),
           desc:'?쒖닔?섍퀬 ?앸룞媛??섏튂??泥?텣 ?먮꼫吏. ?곷?瑜??몄븞?섍쾶 留뚮뱶??諛곕젮? ?곕쑜??怨듦컧?μ씠 ?듭떖 留ㅻ젰?낅땲??'},
    fire: {icon:'?뵦', name:'???? ???뺣룄???붾젮??, pct:Math.round((counts.fire||0)/total*100),
           desc:'?붾젮?섍퀬 ?댁젙?곸쑝濡?二쇰????쒖슦???먮꼫吏. 由ъ븸?섍낵 ?꾨떖?μ씠 ?곗뼱??泥レ씤?곸뿉??媛뺥븳 ?멸컧???④퉩?덈떎.'},
    earth:{icon:'?곤툘', name:'???? ??以묐룆???덉젙媛?, pct:Math.round((counts.earth||0)/total*100),
           desc:'臾듭쭅?섍퀬 誘우쓬吏곹빐 湲곕뙂 怨녹쓣 二쇰뒗 以묐룆???덉젙媛? ?ㅻ옒 怨곸뿉 ?덇퀬 ?띔쾶 留뚮뱶???ш렐???좊ː 留ㅻ젰?낅땲??'},
    metal:{icon:'?뿠截?, name:'湲??? ??李④????몃젴誘?, pct:Math.round((counts.metal||0)/total*100),
           desc:'?좎뭅濡?퀬 ?몃젴?섏뼱 ?⑤?濡??ㅺ?媛湲??섎뱺 遺꾩쐞湲? 湲곗????믪븘 ?좏깮諛쏆? 湲곕텇??二쇰뒗 ?ш? 留ㅻ젰?낅땲??'},
    water:{icon:'?뙄', name:'??麗? ???꾪뿕???좊퉬濡쒖?', pct:Math.round((counts.water||0)/total*100),
           desc:'源딆씠瑜??????녿뒗 ?덈튆怨?吏???꾩슦?? ?곷?瑜?怨꾩냽 沅곴툑?섍쾶 留뚮뱶???몃옪??移대━?ㅻ쭏?낅땲??'}
  };

  /* ?? 5. ?⑺룺 ?? */
  var bombs = [];
  if(taoPct>=60) bombs.push('?꾪솕 湲곗슫???섏퀜 ?섎룄移??딆? ?쒓렇?먯쓣 ?⑤컻?섍퀬 ?덉쭊 ?딆?吏 ?먭??섏꽭?? 媛蹂띻쾶 蹂댁씪 ???덉뒿?덈떎.');
  if(yemPct>=60) bombs.push('??쭏 ?먮꼫吏媛 媛뺥빐 ??怨녹뿉 肉뚮━?대━湲??대졄?듬땲?? ?곷????뱀떊???몄젣 ?좊궇吏 ??긽 遺덉븞?댄빀?덈떎.');
  if(hwaPct>=60) bombs.push('?붽컻媛 媛뺥븯硫??꾩떎蹂대떎 ?댁긽 ?멸퀎??鍮좎?湲??쎌뒿?덈떎. 源딆씠??留ㅻ젰?댁?留??뚰넻 ?⑥젅濡??댁뼱吏????덉뒿?덈떎.');
  if(dominant==='metal') bombs.push('?몃젴??嫄??뚭쿋?붾뜲, ?놁뿉 ?덉쑝硫?踰좎씪 寃?媛숈뒿?덈떎. ?λ룞?곸씤 ?④린 ?쒗쁽???놁쑝硫?李④컩寃??쏀옓?덈떎.');
  if(dominant==='fire'&&(counts.fire||0)>=3) bombs.push('?먮꼫吏媛 ?덈Т 媛뺥빐 ?곷?諛⑹씠 ?뺣룄?뱁븯嫄곕굹 吏移⑸땲?? 怨듦컙??二쇰뒗 寃껊룄 留ㅻ젰 泥쒓린?낅땲??');
  if(dominant==='water'&&(counts.water||0)>=3) bombs.push('?좊퉬濡쒖???吏?섏튂硫??듬떟?⑥쑝濡??쏀옓?덈떎. 癒쇱? ?댁뼱 蹂댁씠???⑷린媛 愿怨꾨? ???④퀎 源딄쾶 ?⑸땲??');
  if(bombs.length===0) bombs.push('移섎챸???쎌젏? ?놁?留? 紐⑤뱺 留ㅻ젰???媛?숉븯?ㅻ㈃ ?먯떊???됯퉼?????좊챸?섍쾶 ?쒕윭?대뒗 ?곗뒿???꾩슂?⑸땲??');

  /* ?? 6. 洹밸???泥쒓린 ?? */
  var strategies = [];
  if(taoPct>=40){
    strategies.push('?곗븷: 泥レ씤?곷낫??袁몄???愿???쒗쁽???④낵?곸엯?덈떎. ?꾪솕 留ㅻ젰? ?쒖옉? 媛뺥븯吏留?吏?띿씠 愿嫄댁엯?덈떎.');
    strategies.push('鍮꾩쫰?덉뒪: ?쇨뎬??怨?釉뚮옖?쒖엯?덈떎. ?곸긽 肄섑뀗痢졖룰컯?걔룻띁釉붾┃ ?섏씠???ъ??붾떇??理쒖쟻??臾대??낅땲??');
  }
  if(yemPct>=40){
    strategies.push('?곗븷: ?덈줈??寃쏀뿕???④퍡?섎뒗 ?곗씠?멸? 理쒓퀬??留ㅻ젰 諛쒖궛踰뺤엯?덈떎. ?쇱긽 ?⑦꽩?붾? 寃쎄퀎?섏꽭??');
    strategies.push('鍮꾩쫰?덉뒪: ?댁쇅쨌?ㅻ텇?셋룸꽕?몄썙???낅Т?먯꽌 媛뺤젏????컻?⑸땲?? ?щ줈?ㅼ삤踰?而ㅻ━?닿? 泥쒖쭅?낅땲??');
  }
  if(hwaPct>=40){
    strategies.push('?곗븷: 源딆씠 ?덈뒗 ??붿? 怨듯넻 愿?ъ궗(?덉닠쨌泥좏븰쨌?곸꽦)濡??곌껐?섎뒗 愿怨꾧? ?ㅻ옒媛묐땲??');
    strategies.push('鍮꾩쫰?덉뒪: ?щ━?먯씠?곕툕쨌?곷떞쨌?곌뎄吏곸뿉???붽컻 ?먮꼫吏媛 鍮쏅궔?덈떎. ?낆갹???먯껜媛 寃쎌웳?μ엯?덈떎.');
  }
  if(strategies.length===0){
    strategies.push('?ㅽ뻾 洹좏삎???≫? ?덉뼱 ?곹솴??留욊쾶 留ㅻ젰??議곗젅?섎뒗 移대찞?덉삩 泥쒓린媛 ?좊━?⑸땲??');
    strategies.push('?뱀젙 留ㅻ젰??媛뺥솕?섎젮硫??꾪솕(?ㅽ??셋룹쇅紐? 쨌 ??쭏(?곴레?굿룸え?? 쨌 ?붽컻(源딆씠쨌?덉닠) 以??섎굹瑜??섎룄?곸쑝濡??ㅼ슦?몄슂.');
  }

  /* ?? 7. HTML 議곕┰ ?? */
  var magRow = '';
  ['wood','fire','earth','metal','water'].forEach(function(e){
    var m = magMeta[e];
    var isActive = (e===dominant || e===dayEl);
    var lvl = m.pct>=33?'?뵦 媛뺥븿':m.pct>=20?'?쒖꽦':m.pct>=10?'湲곕낯':'?좎옱';
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

  /* ?? AI ?꾨＼?꾪듃 ?? */
  var musangMap={'??:'Majestic Ancient Tree','阿?:'Delicate Flower Garden','訝?:'Bright Warm Sun',
    '訝?:'Twinkling Candlelight','??:'Golden High Mountain','藥?:'Cozy Garden Soil',
    '佯?:'Strong Silver Rock','渦?:'Sparkling Jewelry','鶯?:'Deep Blue Ocean','??:'Soft Misty Rain'};
  var prompt=(musangMap[p.d.g]||'Poetic Nature Landscape')+', beautiful landscape painting, soft pastel colors, atmospheric lighting, high-detail scenic view, poetic and serene, high quality, 8k --ar 16:9';
  var safePrompt=prompt.replace(/'/g,"\\'");

  var html =
    '<div id="specialCharmCard" style="margin-top:15px">'+
    /* ===== ?ㅽ꺈 移대뱶 ===== */
    '<div class="cscard">'+
      /* 留ㅻ젰 ?대옒???ㅻ뜑 */
      '<div class="cs-class-wrap">'+
        '<span class="cs-class-icon">'+cls.icon+'</span>'+
        '<div class="cs-class-label">?섏쓽 留ㅻ젰 ?대옒??/div>'+
        '<div class="cs-class-name">'+cls.name+'</div>'+
        '<div class="cs-class-sub">'+cls.sub+'</div>'+
      '</div>'+
      '<div class="cs-divider"></div>'+
      /* 3? ?좎궡 ?ㅽ꺈諛?*/
      '<div class="cs-stat-section">'+
        '<div class="cs-stat-title">??3? 留ㅻ젰 ?좎궡(曄욄?) ?ㅽ꺈</div>'+
        '<div class="cs-stat-row">'+
          '<div class="cs-stat-head"><span class="cs-stat-name">?뙵 ?꾪솕??旅껇뒻餘?</span><span class="cs-stat-pct">'+taoPct+'%</span></div>'+
          '<div class="cs-stat-keyword">移섎챸??議댁옱媛?쨌 ?쒖꽑 吏묒쨷 쨌 ?좏샊 쨌 ?멸린 쨌 ?곗삁??湲곗쭏</div>'+
          '<div class="cs-bar-bg"><div class="cs-bar-fill cs-bar-taohua" style="width:'+taoPct+'%"></div></div>'+
        '</div>'+
        '<div class="cs-stat-row" style="margin-top:10px">'+
          '<div class="cs-stat-head"><span class="cs-stat-name">?뙦截???쭏??要쏃━餘?</span><span class="cs-stat-pct">'+yemPct+'%</span></div>'+
          '<div class="cs-stat-keyword">??룞???먮꼫吏 쨌 ?쒕젰 쨌 媛쒖쿃??쨌 湲濡쒕쾶 媛먭컖 쨌 紐⑦뿕</div>'+
          '<div class="cs-bar-bg"><div class="cs-bar-fill cs-bar-yemma" style="width:'+yemPct+'%"></div></div>'+
        '</div>'+
        '<div class="cs-stat-row" style="margin-top:10px">'+
          '<div class="cs-stat-head"><span class="cs-stat-name">?뵰 ?붽컻????뱥餘?</span><span class="cs-stat-pct">'+hwaPct+'%</span></div>'+
          '<div class="cs-stat-keyword">?덉닠??怨좊룆 쨌 ?좊퉬濡쒖? 쨌 泥좏븰 쨌 吏곴? 쨌 臾섑븳 ?뚮┝</div>'+
          '<div class="cs-bar-bg"><div class="cs-bar-fill cs-bar-hwagae" style="width:'+hwaPct+'%"></div></div>'+
        '</div>'+
      '</div>'+
      '<div class="cs-divider"></div>'+
      /* ?ㅽ뻾 留덇렇?ㅽ떚利?*/
      '<div class="cs-mag-title">?뙂 ?ㅽ뻾 留ㅻ젰 留덇렇?ㅽ떚利?Magnetism)</div>'+
      '<div class="cs-mag-row">'+magRow+'</div>'+
      '<div class="cs-divider"></div>'+
      /* ?⑺룺 */
      '<div class="cs-factbomb">'+
        '<div class="cs-factbomb-title">?뮙 ?⑺룺 ???뱀떊??李⑷컖?섍퀬 ?덈뒗 寃껊뱾</div>'+
        bombRows+
      '</div>'+
      /* 洹밸???泥쒓린 */
      '<div class="cs-strategy">'+
        '<div class="cs-strategy-title">?? 留ㅻ젰 洹밸???泥쒓린 泥섎갑??/div>'+
        stratRows+
      '</div>'+
    '</div>';

  var aiPromptHtml = 
    '<div id="aiPromptCard" style="margin-top:15px">'+
    /* AI ?꾨＼?꾪듃 諛뺤뒪??*/
    '<div class="prem-box" style="background:#fff;border:1px solid #FFB7B2;">'+
      '<span class="prem-title" style="color:#FF8BA7;">?렓 留욎땄???ъ＜ 臾쇱긽 AI ?꾨＼?꾪듃</span>'+
      '<p style="font-size:0.8rem;color:#888;margin-bottom:10px;">??臾멸뎄瑜?蹂듭궗??AI(誘몃뱶??????먭쾶 ?띻꼍???ㅽ???臾쇱긽???붿껌?대낫?몄슂.</p>'+
      '<div style="background:#FFF5F8;padding:12px;border-radius:10px;font-size:0.85rem;border:1px dashed #FF8BA7;word-break:break-all;color:#555;">'+prompt+'</div>'+
      '<button class="btn-sub" style="margin-top:10px;padding:10px;font-size:0.8rem;background:#FF8BA7;color:white;border:none;border-radius:8px;" onclick="navigator.clipboard.writeText(\''+safePrompt+'\').then(function(){alert(\'???꾨＼?꾪듃媛 蹂듭궗?섏뿀?듬땲??\');})">?뱥 ?꾨＼?꾪듃 蹂듭궗?섍린</button>'+
    '</div>'+
    '<div class="prem-box" style="background:linear-gradient(135deg,#FCE4EC,#F3E5F5);margin-top:12px;border:1.5px solid #E91E63;">'+
      '<span class="prem-title" style="color:#C2185B;">?맽 ???ъ＜ ?꾨컮? ??洹?ъ슫 ?숇Ъ 罹먮┃??/span>'+
      '<p style="font-size:0.8rem;color:#555;margin-bottom:10px;">?怨좊궃 ?ъ＜ 湲곗슫??洹?ъ슫 ?숇Ъ濡??쒗쁽?덉뒿?덈떎.</p>'+
      '<div style="background:rgba(255,255,255,.8);padding:12px;border-radius:10px;font-size:0.85rem;border:1px dashed #E879A4;word-break:break-all;color:#555;">'+generateAvatarPrompt(p)+'</div>'+
      '<button class="btn-sub" style="margin-top:10px;padding:10px;font-size:0.8rem;background:#E879A4;color:white;border:none;border-radius:8px;" onclick="navigator.clipboard.writeText(\''+generateAvatarPrompt(p).replace(/'/g,"\\'")+'\').then(function(){alert(\'???꾨컮? ?꾨＼?꾪듃媛 蹂듭궗?섏뿀?듬땲??\');})">?뱥 ?꾨컮? ?꾨＼?꾪듃 蹂듭궗</button>'+
    '</div>'+
    '<div class="prem-box" style="background:linear-gradient(135deg,#E1F5FE,#F0F4C3);margin-top:12px;border:1.5px solid #0277BD;">'+
      '<span class="prem-title" style="color:#01579B;">?뮆 ???댁긽???쇨뎬 ???ъ＜ 沅곹빀 湲곕컲 AI 珥덉긽??/span>'+
      '<p style="font-size:0.8rem;color:#555;margin-bottom:10px;">?뱀떊???ъ＜? ??留욌뒗 ?댁긽?뺤쓽 ?뱀쭠??諛섏쁺???쇨뎬 珥덉긽???꾨＼?꾪듃?낅땲??</p>'+
      '<div style="background:rgba(255,255,255,.8);padding:12px;border-radius:10px;font-size:0.85rem;border:1px dashed #4FC3F7;word-break:break-all;color:#555;">'+generateIdealPartnerPrompt(p,natal)+'</div>'+
      '<button class="btn-sub" style="margin-top:10px;padding:10px;font-size:0.8rem;background:#4FC3F7;color:white;border:none;border-radius:8px;" onclick="navigator.clipboard.writeText(\''+generateIdealPartnerPrompt(p,natal).replace(/'/g,"\\'")+'\').then(function(){alert(\'???댁긽???꾨＼?꾪듃媛 蹂듭궗?섏뿀?듬땲??\');})">?뱥 ?댁긽???꾨＼?꾪듃 蹂듭궗</button>'+
    '</div>'+
    '</div>';

  var existing = document.getElementById('specialCharmCard');
  if(existing) existing.remove();
  
  var existingAi = document.getElementById('aiPromptCard');
  if(existingAi) existingAi.remove();
  
  document.getElementById('dailyMonthlyCard').insertAdjacentHTML('afterend', html);
  document.getElementById('specialCharmCard').insertAdjacentHTML('afterend', aiPromptHtml);
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   STEP 7: ?뚮뜑 ?⑥닔
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   [NEW] 60媛묒옄 ?쇱＜(Day Pillar) 珥덉젙諛 ?꾨줈?뚯씪留?(Auto-Generated Premium 60 Gapja DB)
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
const ILJU_DB = (function() {
  const STEMS = {
      "??: ["媛묐ぉ", "嫄곕ぉ, ?곕슍 ?잛? ???섎Т", "?낅┰?ш낵 由щ뜑?? ?꾨줈 六쀬뼱?섍???湲곗긽", "?밸떦?섍퀬 怨㏃? 泥댄삎怨?媛뺤쭅???덈튆"],
      "阿?: ["?꾨ぉ", "?앹엥, ?꾨쫫?ㅼ슫 苑껉낵 ?붿큹", "?곗뼱???앸챸?κ낵 ?좎뿰?? 遺?쒕윭??移대━?ㅻ쭏", "遺?쒕윭??怨≪꽑誘몃? 吏??留ㅻ젰?곸씤 ?몄긽"],
      "訝?: ["蹂묓솕", "?쒖뼇, ?몄긽??鍮꾩텛??媛뺣젹??鍮?, "?붿쭅?④낵 ?④굅???댁젙, 紐낅옉?섍퀬 ?ㅻ걹 ?녿뒗 ?깊뭹", "?섑븯怨??대ぉ援щ퉬媛 ?쒕졆?섎ŉ ?붾젮??遺꾩쐞湲?],
      "訝?: ["?뺥솕", "?щ튆, ?몄긽???곗슦???곕쑜??紐⑤떏遺?, "?곕쑜??諛곕젮?ш낵 ?대㈃???洹쇳븳 吏묐뀗, ?ъ꽭??, "?⑦솕?섍퀬 ???섎㈃?쒕룄 ?洹쇳엳 ?좊퉬濡쒖슫 ?덈튆"],
      "??: ["臾댄넗", "???? 留뚮Ъ???덈뒗 愿묓솢???吏", "?뺣룄?곸씤 ?ъ슜?κ낵 ?좎쨷?? 臾듭쭅??梨낆엫媛?, "?ъ쭅?섍퀬 ?좊ː媛먯쓣 二쇰ŉ ?붾뱾由??놁씠 ?덉젙媛??덈뒗 泥닿꺽"],
      "藥?: ["湲고넗", "?꾨떟, ?앸챸??湲몃윭?대뒗 鍮꾩삦???됱빞", "?대㉧??媛숈? ?먯븷濡쒖?怨??ㅼ슜???ㅼ냽, 移섎???, "遺?쒕읇怨??몄븞???몄긽怨??κ??κ????먮굦"],
      "佯?: ["寃쎄툑", "??諛붿쐞, ?꾩쭅 ?쒕젴?섏? ?딆? 嫄곗튇 泥?, "?섎━? 寃곕떒?? 媛뺤쭅?섍퀬 ??묒쓣 紐⑤Ⅴ???뚯떊", "?⑤떒?섍퀬 移대━?ㅻ쭏 ?섏튂硫??좎씠 援듭? ?몃え"],
      "渦?: ["?좉툑", "蹂댁꽍, ?뺣??섍쾶 ?멸났?섏뼱 鍮쏅굹??洹湲덉냽", "?덈━??吏곴?怨??꾨꼍二쇱쓽, 源뚮떎濡?퀬 ?뺣???誘멸컧", "援곕뜑?붽린 ?놁씠 ?몃젴?섍퀬 李④????꾩떆???대?吏, 源붾걫??泥댄삎"],
      "鶯?: ["?꾩닔", "諛붾떎, ?꾨룄?섍쾶 ?먮Ⅴ??源딄퀬 嫄곕???媛뺣Ъ", "吏?쒖? ?ъ슜?? ?띿쓣 ?????녿뒗 嫄곕????ㅼ???, "源딄퀬 ?좎뿰?섎ŉ ?ъ쑀濡쒖슫 遺꾩쐞湲곗? ?명깢???몄긽"],
      "??: ["怨꾩닔", "?댁뒳鍮? 留뚮Ъ??怨좊（ ?곸떆??留묒? ?밸떖??, "?섍꼍???쒖쓳?섎ŉ ?ㅻŉ?쒕뒗 ?뚰넻?κ낵 鍮쏅굹??珥앸챸??, "留묎퀬 ?щ┛ ??븯硫댁꽌???ㅼ젙?ㅺ컧???먮굦, 珥됱큺???덈쭩??]
  };

  const BRANCHES = {
      "耶?: ["?먯닔", "?쒓꺼?몄쓽 留묒? 臾?, "源딆? ?듭같?? 鍮꾨??ㅻ윭?, ?곗뼱???섍꼍 ?곸쓳??, "李⑤텇?섎㈃?쒕룄 ?띾궡??源딆씠瑜????????녿뒗 珥앸챸???덈튆"],
      "訝?: ["異뺥넗", "?앸챸???됲깭???쇱뼱遺숈? ??, "珥덉씤?곸씤 ?몃궡? ?덇린, 臾듬У???대㈃????λ젰", "?쎄쾶 ?붾뱾由ъ? ?딅뒗 ?곗쭅?④낵 ?대㈃???⑤떒??怨④꺽"],
      "野?: ["?몃ぉ", "留뚮Ъ???뚯깮?섎뒗 ??룞?곸씤 遊꾨굹臾?, "?덈줈???쒖옉, 沅뚮젰 吏?μ쟻??吏꾩랬?깃낵 ?뚰뙆??, "?밸떦??嫄몄쓬嫄몄씠? ?곷?瑜??뺣룄?섎뒗 移대━?ㅻ쭏 ?섏튂???꾩슦??],
      "??: ["臾섎ぉ", "?앷린諛쒕엫?섍쾶 ?쇱뼱?섎뒗 ?꾩뿰??遊꾧퐙", "諛쒕엫?④낵 ?앹뾾???깆옣 ?뺢뎄, ?곗뼱??誘몄쟻 媛먭컖怨??몄떖??, "?좎뿰?섍퀬 遺?쒕윭??怨≪꽑誘몄? 留ㅻ젰?곸씠怨??먯뿰?ㅻ윭??誘몄냼"],
      "渦?: ["吏꾪넗", "蹂?붾Т?랁븳 ??큵??臾?癒멸툑? ??, "?먮????댁긽二쇱쓽, 留뚮Ъ???꾩슦瑜대뒗 ?먮몣??諛곗㎟", "?대뒓 ?먮━?먯꽌??議댁옱媛먯쓣 ?뺤떎???쒕윭?대뒗 ?ㅻ?吏怨??ъ쑀濡쒖슫 ?먰깭"],
      "藥?: ["?ы솕", "留뚮Ъ??泥좎????ш뎄??珥덉뿬由꾩쓽 遺덇퐙", "??컻?곸씤 ?쒕룞?깃낵 ?댁젙, 紐⑺몴瑜??ν븳 ?덈━???꾨꼍二쇱쓽", "?좎뭅濡?퀬 ?덈━???쒖꽑怨?吏?곸씠硫댁꽌???몃젴???몄긽"],
      "??: ["?ㅽ솕", "媛뺣젹?섍쾶 ??ㅻⅤ???쒖뿬由꾩쓽 留밸젹??遺?, "?붾젮?④낵 ??컻?곸씤 ?먮꼫吏, 紐낅옉???명뼢?깃낵 ?깃툒??, "?대뵜 媛???쒖꽑???꾨뒗 ?붾젮?섍퀬 諛앹? 遺꾩쐞湲? ?대ぉ援щ퉬媛 ?쒕졆???멸컧??],
      "??: ["誘명넗", "寃곗떎???욌몦 ??뿬由꾩쓽 硫붾쭏瑜???, "?ъ깮?뺤떊怨??ш?, 怨좎슂???띿뿉 苑곴퐗 媛먯텣 ?④굅??怨좎쭛", "?⑦솕??蹂댁씠吏留?寃곗퐫 爰얠씠吏 ?딅뒗 ?⑤떒?섍퀬 媛뺤씤???꾩슦??],
      "??: ["?좉툑", "媛?꾩쓽 ?쒖옉???좎뼵?섎뒗 寃ш퀬??諛붿쐞", "?ㅼ옱?ㅻ뒫???섏셿怨?移쇨컳? 寃곕떒?? ?먯쑀濡쒖슫 ??쭏??, "誘쇱꺽??蹂댁씠??泥댄삎怨??쇰Т吏怨??좎뭅濡?쾶 吏?곸씤 ?몄긽"],
      "??: ["?좉툑", "李④컩寃?鍮쏅굹???꾩뿰??媛?꾩쓽 蹂댁꽍", "移섎????뺣??④낵 ?꾨꼍二쇱쓽, ?덈???吏곴??κ낵 泥좎???怨듭궗 援щ텇", "援곕뜑?붽린 ?놁씠 源붾걫?섍퀬 洹밸룄濡??ъ꽭???꾩떆???몃え"],
      "??: ["?좏넗", "留뚮Ъ???섎졃?섎뒗 ????꾩쓽 ?몄벝????, "?섎━? 梨낆엫媛? 媛뺥븳 蹂댄샇 蹂몃뒫怨?源딆? 泥좏븰???ъ쑀", "?ъ쭅?섎㈃?쒕룄 ?띿쓣 吏?섏튂寃??대퉬移섏? ?딅뒗 吏꾩쨷?섍퀬 遺?쒕윭???쒖젙"],
      "雅?: ["?댁닔", "?앸챸 ?꾩깮???덉? 珥덇꺼?몄쓽 ?볦? ?몄닔", "諛⑸????섏슜?κ낵 ?ъ슜??由щ뜑?? 泥좏븰?곸씠怨?源딆? ?먭뎄??, "?ъ쑀濡?퀬 ?됰꼮??遺꾩쐞湲곗? ?곷?瑜??쒖뾾???몄븞?섍쾶 ?뚯뼱?덈뒗 湲곗슫"]
  };

  const gapja_list = [
      "?꿨춴","阿쇾툚","訝쇿칲","訝곩뜱","?딂쒼","藥긷럼","佯싧뜄","渦쎿쑋","鶯х뵵","?면뀎",
      "?꿩닃","阿쇾벤","訝쇿춴","訝곦툚","?듿칲","藥긷뜱","佯싪쒼","渦쎾럼","鶯у뜄","?멩쑋",
      "?꿰뵵","阿숅뀎","訝숁닃","訝곦벤","?듿춴","藥긴툚","佯싧칲","渦쎾뜱","鶯ц쒼","?멨럼",
      "?꿨뜄","阿숁쑋","訝숂뵵","訝곲뀎","?딀닃","藥긴벤","佯싧춴","渦쎽툚","鶯у칲","?멨뜱",
      "?꿱쒼","阿쇿럼","訝쇿뜄","訝곫쑋","?딁뵵","藥깁뀎","佯싨닃","渦쎽벤","鶯у춴","?멧툚",
      "?꿨칲","阿쇿뜱","訝숃쒼","訝곩럼","?듿뜄","藥길쑋","佯싩뵵","渦쏃뀎","鶯ф닃","?멧벤"
  ];

  const E12_MAP = {
      "?꿜벤":"?μ깮", "?꿨춴":"紐⑹슃", "?꿜툚":"愿?", "?꿨칲":"嫄대줉", "?꿨뜱":"?쒖솗", "?꿱쒼":"??, "?꿨럼":"蹂?, "?꿨뜄":"??, "?꿩쑋":"臾?, "?꿰뵵":"??, "?꿴뀎":"??, "?꿩닃":"??,
      "阿쇿뜄":"?μ깮", "阿쇿럼":"紐⑹슃", "阿숃쒼":"愿?", "阿쇿뜱":"嫄대줉", "阿쇿칲":"?쒖솗", "阿쇾툚":"??, "阿쇿춴":"蹂?, "阿쇾벤":"??, "阿숁닃":"臾?, "阿숅뀎":"??, "阿숂뵵":"??, "阿숁쑋":"??,
      "訝쇿칲":"?μ깮", "訝쇿뜱":"紐⑹슃", "訝숃쒼":"愿?", "訝쇿럼":"嫄대줉", "訝쇿뜄":"?쒖솗", "訝숁쑋":"??, "訝숂뵵":"蹂?, "訝숅뀎":"??, "訝숁닃":"臾?, "訝쇾벤":"??, "訝쇿춴":"??, "訝쇾툚":"??,
      "?듿칲":"?μ깮", "?듿뜱":"紐⑹슃", "?딂쒼":"愿?", "?듿럼":"嫄대줉", "?듿뜄":"?쒖솗", "?딀쑋":"??, "?딁뵵":"蹂?, "?딃뀎":"??, "?딀닃":"臾?, "?듾벤":"??, "?듿춴":"??, "?듾툚":"??,
      "訝곲뀎":"?μ깮", "訝곭뵵":"紐⑹슃", "訝곫쑋":"愿?", "訝곩뜄":"嫄대줉", "訝곩럼":"?쒖솗", "訝곮쒼":"??, "訝곩뜱":"蹂?, "訝곩칲":"??, "訝곦툚":"臾?, "訝곩춴":"??, "訝곦벤":"??, "訝곫닃":"??,
      "藥깁뀎":"?μ깮", "藥긺뵵":"紐⑹슃", "藥길쑋":"愿?", "藥긷뜄":"嫄대줉", "藥긷럼":"?쒖솗", "藥김쒼":"??, "藥긷뜱":"蹂?, "藥긷칲":"??, "藥긴툚":"臾?, "藥긷춴":"??, "藥긴벤":"??, "藥길닃":"??,
      "佯싧럼":"?μ깮", "佯싧뜄":"紐⑹슃", "佯싨쑋":"愿?", "佯싩뵵":"嫄대줉", "佯싮뀎":"?쒖솗", "佯싨닃":"??, "佯싦벤":"蹂?, "佯싧춴":"??, "佯싦툚":"臾?, "佯싧칲":"??, "佯싧뜱":"??, "佯싪쒼":"??,
      "渦쎾춴":"?μ깮", "渦쎽벤":"紐⑹슃", "渦쎿닃":"愿?", "渦쏃뀎":"嫄대줉", "渦쏁뵵":"?쒖솗", "渦쎿쑋":"??, "渦쎾뜄":"蹂?, "渦쎾럼":"??, "渦쏂쒼":"臾?, "渦쎾뜱":"??, "渦쎾칲":"??, "渦쎽툚":"??,
      "鶯х뵵":"?μ깮", "鶯ч뀎":"紐⑹슃", "鶯ф닃":"愿?", "鶯т벤":"嫄대줉", "鶯у춴":"?쒖솗", "鶯т툚":"??, "鶯у칲":"蹂?, "鶯у뜱":"??, "鶯ц쒼":"臾?, "鶯у럼":"??, "鶯у뜄":"??, "鶯ф쑋":"??,
      "?멨뜱":"?μ깮", "?멨칲":"紐⑹슃", "?멧툚":"愿?", "?멨춴":"嫄대줉", "?멧벤":"?쒖솗", "?멩닃":"??, "?면뀎":"蹂?, "?며뵵":"??, "?멩쑋":"臾?, "?멨뜄":"??, "?멨럼":"??, "?멱쒼":"??
  };

  const SG = {"??:{e:0,y:1},"阿?:{e:0,y:-1},"訝?:{e:1,y:1},"訝?:{e:1,y:-1},"??:{e:2,y:1},"藥?:{e:2,y:-1},"佯?:{e:3,y:1},"渦?:{e:3,y:-1},"鶯?:{e:4,y:1},"??:{e:4,y:-1}};
  const SJ = {"耶?:{e:4,y:-1},"訝?:{e:2,y:-1},"野?:{e:0,y:1},"??:{e:0,y:-1},"渦?:{e:2,y:1},"藥?:{e:1,y:1},"??:{e:1,y:-1},"??:{e:2,y:-1},"??:{e:3,y:1},"??:{e:3,y:-1},"??:{e:2,y:1},"雅?:{e:4,y:1}};
  
  const TEN_NAMES = [
    ["鍮꾧껄","寃곸옱"],
    ["?앹떊","?곴?"],
    ["?몄옱","?뺤옱"],
    ["?멸?","?뺢?"],
    ["?몄씤","?뺤씤"]
  ];

  function calcTenGod(ds, tc) {
      let me = SG[ds], tg = SJ[tc];
      if(!me || !tg) return "??꽦";
      let diff = (tg.e - me.e + 5) % 5;
      let isYinYangDiff = (me.y !== tg.y) ? 1 : 0;
      return TEN_NAMES[diff][isYinYangDiff];
  }

  const STEM_KR = {"??:"媛?,"阿?:"??,"訝?:"蹂?,"訝?:"??,"??:"臾?,"藥?:"湲?,"佯?:"寃?,"渦?:"??,"鶯?:"??,"??:"怨?};
  const BRANCH_KR = {"耶?:"??,"訝?:"異?,"野?:"??,"??:"臾?,"渦?:"吏?,"藥?:"??,"??:"??,"??:"誘?,"??:"??,"??:"??,"??:"??,"雅?:"??};

  function generate(g, j) {
      let key = g + j;
      let sInfo = STEMS[g];
      let bInfo = BRANCHES[j];
      let e12Key = g + j; 
      let e12 = E12_MAP[e12Key] || "?뚯닔?놁쓬";
      let tenGod = calcTenGod(g, j);

      let s1 = sInfo[2].split(',')[0];
      let b1 = bInfo[2].split(',')[0];

      let krName = (STEM_KR[g] || g) + (BRANCH_KR[j] || j);
      let name = `${krName}(${key})?쇱＜`;
      
      let symbol = `${sInfo[1]}怨??) ${bInfo[1]}???덈쵖??留뚮궓.\n* ?대?吏: 泥쒓컙??議고솕濡??명빐 ???以묒뿉 ${sInfo[3]}??遺꾨챸???섑??섎ŉ, 吏吏???깊뼢?쇰줈 ${bInfo[3]}??媛먭컖?곸씤 遺꾩쐞湲곌? 吏숆쾶 ?뱀븘?ㅼ뼱 ?뱀쑀??怨좉툒?ㅻ윭??留ㅻ젰???먯븘?낅땲??`;
      
      let summary = `泥쒓컙??"${s1}" ?뱀꽦怨?吏吏??"${b1}" ?깊뼢??留ㅼ슦 ?꾨쫫?듦쾶 議고솕瑜??대９?덈떎. ?쇱? '${tenGod}'???듭떖 ?먮꼫吏? ??씠?댁꽦 '${e12}'????룞?깆쓣 ?숈떆??吏?? 臾댁쿃?대굹 ?낆껜?곸씠怨??≪씤???섏튂???깊뼢???뚯쑀?먯엯?덈떎.`;
      
      let personality = `寃됱쑝濡쒕뒗 ${sInfo[1]}泥섎읆 ${sInfo[2]}??湲띿젙??痢〓㈃???좉컧?놁씠 諛쒗쐶?섎굹, 洹?源딆? ?대㈃?먮뒗 ${bInfo[2]}??湲곗쭏??媛뺣젹?섍쾶 轅덊??怨??덉뒿?덈떎. ??씠?댁꽦 '${e12}'吏???볦엫???곕씪 媛쒓컻?몄쓽 臾댁쓽?앹쟻???좎옱?μ씠 ?ш쾶 利앺룺?섎ŉ, ?쇱? '${tenGod}'???듭떖 ?묒슜 ?뺣텇???먯떊??紐⑺몴??諛붿뿉 ?????⑦븳 吏묐뀗怨??щ뒫??諛쒗쐶?⑸땲?? ?뚮븣濡?蹂몄씤留뚯쓽 ?뺢퀬??二쇨??대굹 ?꾨꼍二쇱쓽媛 二쇰?怨?遺?ろ옄 ?섎룄 ?덉?留? ?대뒗 怨??몄긽 ?꾧뎄???쎄쾶 紐⑤갑?????녿뒗 ?쇱＜ 蹂몄씤留뚯쓽 ?낅낫?곸씤 移대━?ㅻ쭏? ?쒕졆??媛쒖꽦?쇰줈 硫뗭?寃??뱁솕?⑸땲??`;
      
      let specialTraits = [];
      if (["佯싪쒼","佯싨닃","?딀닃","鶯ц쒼"].includes(key)) {
          specialTraits.push("?뱁엳 紐낅━?숈쟻 愿?먯뿉??媛뺣젰??愿닿컯??邀곭숯餘????뚮룞???덇퀬 ?덉뼱, ?대뼚???몄깮???꾧린??留됰쭑???쒓? ?욎뿉?쒕룄 ?덈? 援대났?섏? ?딄퀬 怨쇨컧?섍쾶 ?뚰뙆???섍?????컻?곸씤 由щ뜑??낵 ?대㈃???쇱꽦??源딄쾶 ?먮━ ?↔퀬 ?덉뒿?덈떎.");
      }
      if (["?꿱쒼","阿숁쑋","訝숁닃","訝곦툚","?딂쒼","鶯ф닃","?멧툚"].includes(key)) {
          specialTraits.push("?먰븳 諛깊샇????썼솊鸚㎪?) ?뱀쑀???뺣룄?곸씤 ?꾩슦?쇰? 吏?, ?됱냼???먯옏怨??묐낫?ъ씠 源딆뼱 蹂댁씪吏?쇰룄 ?앹궗媛 嫄몃┛ 寃곗젙???밸?泥섎굹 移섏뿴??寃쎌웳 ?곹솴?먯꽌???꾩껌???몄듅?ш낵 ??紐⑤? ??μ쓣 戮먮깄?덈떎.");
      }
      if (["?꿨칲","阿쇿뜱","訝쇿뜄","訝곩럼","?딂쒼","?딀닃","藥긴툚","藥길쑋","佯싩뵵","渦쏃뀎","鶯у춴","?멧벤"].includes(key)) {
          specialTraits.push("?붾텋??泥쒓컙怨?吏吏???ㅽ뻾???숈씪??媛꾩뿬吏??亮꿱늾??릪)???⑤떒??援ъ“瑜?痍⑦븯怨??덉뼱, 寃됯낵 ?띿씠 ?꾩쟾?섍쾶 ?쇱튂?섎ŉ ?대뼚???몄븬?먮룄 寃곗퐫 爰얠씠吏 ?딅뒗 媛뺤쿋 媛숈? ?먯븘? 二쇱껜?깆쓣 援녠굔???먮옉?⑸땲??");
      }
      if (["?꿨뜄","訝쇿칲","訝곫쑋","?딂쒼","佯싨닃","渦쏃뀎","鶯у춴"].includes(key)) {
          specialTraits.push("?먯뿰?ㅻ젅 ?쇱뼱?섎뒗 ?띿뿼??榮낁돳餘???湲곗슫 ?뺣텇?? 媛留뚰엳 誘몄냼 吏볤퀬留??덉뼱????몄쓣 遺?쒕읇寃??뚯뼱?밴린??臾섑븳 留ㅻ젰怨??좉탳媛 ?섏튂硫???멸?怨꾩? ?ы쉶?앺솢?먯꽌 ?뺢퀬???멸린???곗쐞瑜??ㅼ쭛?덈떎.");
      }
      if(specialTraits.length > 0) personality += " " + specialTraits.join(" ");

      let prof = "蹂몄씤留뚯쓽 ?꾨Ц 湲곗닠怨?嫄곗묠?녿뒗 ?낅┰?곸씤 ?뚰뙆??;
      if (["鍮꾧껄","寃곸옱"].includes(tenGod)) prof = "?꾧뎄?먭쾶??援쏀엳吏 ?딅뒗 留됯컯???낅┰?ш낵 ?먯닔?깃????뚰뙆?? 議곗쭅???욎뿉???대걚??由щ뜑??;
      if (["?앹떊","?곴?"].includes(tenGod)) prof = "留덈Ⅴ吏 ?딅뒗 湲곕컻?섍퀬 李쎌쓽?곸씤 諛쒖긽, ?곗뼱???덉닠???앷껄 諛??쒗쁽?? ?以묒쓣 ?吏곸씠???좊젮???몃?";
      if (["?몄옱","?뺤옱"].includes(tenGod)) prof = "?⑤떎瑜?怨듦컙吏媛곷젰怨??덈━???먮떒?? ?곸썡???щТ???듯넻?깃낵 ?쒕????먮쫫???쎈뒗 ?怨좊궃 ?ъ뾽 媛먭컖";
      if (["?멸?","?뺢?"].includes(tenGod)) prof = "???異붿쥌??遺덊뿀?섎뒗 媛뺤씤??梨낆엫媛먭낵 ?꾨꼍???깃턿 吏꾨쾿 ?μ븙?? ?ъ쿋???먯튃二쇱쓽? ?щ엺???ㅻ（???듭넄??;
      if (["?몄씤","?뺤씤"].includes(tenGod)) prof = "?섎굹瑜?源딆씠 ?덇쾶 ?뚭퀬?쒕뒗 ?뺣룄?곸씤 ?숆뎄?닿낵 ?좎뭅濡쒖슫 吏???듭같?? 援먯쑁 諛?怨좊룄??泥쒓린 湲고쉷??;

      let professional = `媛쒖씤??怨좎쑀??湲곗쭏??媛???먯쑀濡?퀬 ?⑥쟾?섍쾶 肉쒖뼱?????덈뒗 ?섍꼍?쇱닔濡??뱀떊??吏꾧?媛 李щ??섍쾶 鍮쏅궔?덈떎. ${prof}??媛뺥븯寃??뷀븯??吏곷Т(?꾨Ц吏? ?ъ뾽媛, 援먯쑁, 湲고쉷 李쎌옉 遺꾩빞 ???먯꽌 ???깃났怨??깆랬瑜??ъ꽦?섎ŉ, ?듬떟?섍퀬 援ъ냽?곸씤 ?섍꼍蹂대떎??蹂몄씤???밸퀎??鍮꾩쟾怨??λ젰???뺤떎?섍쾶 ?몄젙諛쏄퀬 ?낅┰?곸씤 留덉뒪?곕줈??議곗쭅???대걣?닿컝 ???덈뒗 吏꾩랬?곸씤 臾대?瑜?媛덈쭩?⑸땲??`;

      let relationship = `?곗븷? 寃고샎, ?됱깮??諛섎젮?먮? ?앺븯???쇱뿉 ?덉뼱?쒕뒗 ?쇱? '${tenGod}'???곹뼢????텇 諛쏆븘 ?먭린留뚯쓽 ?뺢퀬???щ━??媛移섍???怨좎닔?섍굅??泥섏쓬?먮뒗 ?ㅼ냼 源뚮떎濡쒖슫 硫대え瑜?蹂댁씪 ???덉뒿?덈떎. ?섏?留???踰????щ엺?대씪怨??뺥븯??吏꾩떎?섍퀬 源딆? ?몄뿰??留브퀬 ?섎㈃, ${s1}泥섎읆 議곌굔議곗감 ?꾩쟾??珥덉썡???곕쑜???좎젙怨?臾댄븳???뚯떊???꾨굦?놁씠 ?섎닏?덈떎. ?곷?瑜?蹂몄씤???듭젣?섏뿉 ?먮젮 ?섍린蹂대떎, ?덈뒗 洹몃?濡?媛곸옄???멸퀎瑜??몄젙??二쇨퀬 源딆씠 議댁쨷??二쇰뒗 ?깆닕???곷?瑜?留뚮궗????鍮꾨줈??媛???덉젙?섍퀬 ?곸냽?곸씤 ?됰났??留뚮겱?????덉뒿?덈떎.`;

      let advice = `??씠?댁꽦 '${e12}'(??媛 肉쒖뼱?대뒗 ?ъ꽭?섎㈃?쒕룄 ??룞?곸씤 ?먮꼫吏???뚮룞???ㅼ뒪由ш린 ?꾪빐, 留ㅼ씪??諛붿걯怨???媛???쇱긽 ?띿뿉?쒕룄 諛섎뱶?????쒗룷 源딆닕???ъ뼱媛??紐낆긽?대굹 ?쇱옄留뚯쓽 ?댁떇 ?쒓컙???덉떎?섍쾶 ?꾩슂?⑸땲?? ?섏? ?앷컖???ㅻⅨ ??몄쓣 ?됰꼮???섏슜?섎뒗 ?곕쑜??愿?⑹쓽 洹몃쫯???볧엳怨? ?대㈃???섏퀜?먮Ⅴ??媛뺥븳 ?먮꼫吏瑜?嫄닿컯?섍쾶 ?잛븘?????덈뒗 ?섎쭔??'?앹궛?곸씤 痍⑤?(?대룞, 吏묒쨷 ?낆꽌, ?덉닠 李쎌옉 ??'瑜?媛뽰텛寃??쒕떎硫??뱀떊? ???볦? ?ы쉶??紐낆삁?깆랬肉먮쭔 ?꾨땲???몄깮 ?꾩껜瑜?愿?듯븯??吏꾩젙???대㈃???꾩쟾???됱븞???④퍡 ?꾨━寃???寃껋엯?덈떎.`;

      let details = `[?쇱? 援ъ“ ?뺣? 遺꾩꽍] 吏吏 ${j}(${bInfo[0]}) - ?댁옱???듭떖 ??꽦: ${tenGod} / ?앸챸?μ쓽 ?쒗솚(??씠?댁꽦): ${e12}\n?쇱? 吏?κ컙 源딆? 怨녹뿉 ?諛???④꺼吏??ㅽ뻾?ㅼ쓽 移섎??섍퀬 ?뺣????곹샇 ?묒슜???뱀떊 ?띠쓽 臾댁쓽?앹쟻???뚮┝怨?蹂몃뒫???숆린濡?留ㅼ슦 媛뺣젰?섍쾶, 洹몃━怨?吏?띿쟻?쇰줈 ?묐룞?섍퀬 ?덉뒿?덈떎.`;

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
    btn.innerHTML = '?곸꽭 遺꾩꽍 ?묎린 ??;
    if(card) card.classList.add('open-detail');
  } else {
    detail.style.maxHeight = '0px';
    btn.innerHTML = '?곸꽭 遺꾩꽍 蹂닿린 ??;
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
    .replace(/??.\s+/g, '??|');
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
  var safeItems = (items && items.length) ? items : [fallback || '遺꾩꽍 ?뺣낫媛 以鍮꾨릺??以묒엯?덈떎.'];
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
  var stemElMap = { '??:'wood','阿?:'wood','訝?:'fire','訝?:'fire','??:'earth','藥?:'earth','佯?:'metal','渦?:'metal','鶯?:'water','??:'water' };
  var branchElMap = { '耶?:'water','訝?:'earth','野?:'wood','??:'wood','渦?:'earth','藥?:'fire','??:'fire','??:'earth','??:'metal','??:'metal','??:'earth','雅?:'water' };
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

  // Floor rounding ?댄썑 ?⑥? ?쇱꽱?몃? ???뚯닔???쒖꽌?濡?諛곕텇???⑷퀎 100%瑜?留욎텣??
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
  var animalMap = { '耶?:'伊?, '訝?:'??, '野?:'?몃옉??, '??:'?좊겮', '渦?:'??, '藥?:'諭', '??:'留?, '??:'??, '??:'?먯댂??, '??:'??, '??:'媛?, '雅?:'?쇱?' };
  var stemTraits = {
    '??:['由щ뜑??,'吏곸쭊??], '阿?:['?좎뿰??,'?ъ꽭??], '訝?:['?댁젙','?쒗쁽??], '訝?:['怨듦컧??,'吏묒쨷??],
    '??:['?덉젙媛?,'梨낆엫媛?], '藥?:['?ㅼ슜??,'諛곕젮??], '佯?:['寃곕떒??,'異붿쭊??], '渦?:['?뺢탳??,'?꾩꽦??],
    '鶯?:['?ъ슜??,'?듭같??], '??:['?곸쓳??,'吏곴???]
  };

  var tags = [];
  tags.push((key || '') + ' ?쇱＜');
  if (elementLabel) tags.push(elementLabel + ' 以묒떖');
  if (animalMap[branch]) tags.push(animalMap[branch] + ' 湲곗슫');
  (stemTraits[stem] || []).forEach(function(t) { tags.push(t); });

  if (data && data.details) {
    var tg = data.details.match(/?듭떖 ??꽦:\s*([^\/\n]+)/);
    var e12 = data.details.match(/??씠?댁꽦\):\s*([^\n]+)/);
    if (tg && tg[1]) tags.push(tg[1].trim());
    if (e12 && e12[1]) tags.push('??씠?댁꽦 ' + e12[1].trim());
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
  const rawName = data && data.name ? data.name : (key + '?쇱＜');
  const nameMatch = rawName.match(/^([^\(]+)\(([^\)]+)\)?쇱＜$/);
  const mainName = nameMatch ? (nameMatch[1] + '?쇱＜') : rawName;
  const hanjaName = nameMatch ? ('(' + nameMatch[2] + ')') : ('(' + key + ')');
  const animalMap = { '耶?: ['?맠','伊?], '訝?: ['?맢','??], '野?: ['?맦','?몃옉??], '??: ['?맧','?좊겮'], '渦?: ['?릧','??], '藥?: ['?릫','諭'], '??: ['?맭','留?], '??: ['?릲','??], '??: ['?맮','?먯댂??], '??: ['?릶','??], '??: ['?맯','媛?], '雅?: ['?맰','?쇱?'] };
  const stemElementMap = { '??:['wood','紐???'], '阿?:['wood','紐???'], '訝?:['fire','????'], '訝?:['fire','????'], '??:['earth','????'], '藥?:['earth','????'], '佯?:['metal','湲???'], '渦?:['metal','湲???'], '鶯?:['water','??麗?'], '??:['water','??麗?'] };
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
  if(btn) btn.innerHTML = '?곸꽭 遺꾩꽍 蹂닿린 ??;

  var elementInfo = stemElementMap[p.d.g] || ['wood', '紐???'];
  var theme = elementTheme[elementInfo[0]] || elementTheme.wood;
  iljuCard.style.setProperty('--ilju-accent', theme.accent);
  iljuCard.style.setProperty('--ilju-soft', theme.soft);

  var animal = animalMap[p.d.j] || ['??,'?곸쭠'];
  var nameMainEl = document.getElementById('iljuNameMain');
  var nameHanjaEl = document.getElementById('iljuNameHanja');
  var badgeEl = document.getElementById('iljuElementBadge');
  var animalEl = document.getElementById('iljuHeroAnimal');
  var animalLabelEl = document.getElementById('iljuHeroAnimalLabel');
  if (nameMainEl) nameMainEl.innerText = mainName;
  if (nameHanjaEl) nameHanjaEl.innerText = hanjaName;
  if (badgeEl) badgeEl.innerText = elementInfo[1] + ' ?먮꼫吏 以묒떖';
  if (animalEl) animalEl.innerText = animal[0];
  if (animalLabelEl) animalLabelEl.innerText = animal[1] + ' ?곸쭠';

  var summaryLines = data ? iljuBullets(data.summary, 3) : ['?쇱＜???섏쓽 蹂몄쭏??蹂댁뿬二쇰뒗 ?듭떖 異뺤엯?덈떎.', '?쇨컙怨??쇱???議고빀?쇰줈 ?깊뼢???뺤꽦?⑸땲??', '?붿빟/?곸꽭/議곗뼵 ?쒖꽌濡??쎌뼱蹂댁꽭??'];
  var detailSource = data ? ((data.personality || '') + ' ' + (data.professional || '') + ' ' + (data.relationship || '')) : '?곸꽭 遺꾩꽍 ?곗씠?곌? ?낅뜲?댄듃?섎뒗 以묒엯?덈떎.';
  var detailLines = iljuBullets(detailSource, 4);
  var adviceLines = data ? iljuBullets(data.advice, 3) : ['?섎（ 猷⑦떞??吏㏐쾶 湲곕줉?섎ŉ 媛먯젙怨??먮떒 ?먮쫫???먭???蹂댁꽭??', '媛뺤젏? ???좊챸?섍쾶, 痍⑥빟?먯? 遺?쒕읇寃?蹂댁셿?섎뒗 泥쒓린媛 醫뗭뒿?덈떎.'];

  iljuSetList('iljuSummaryList', summaryLines, '?듭떖 ?붿빟 ?곗씠?곌? 以鍮?以묒엯?덈떎.');
  iljuSetList('iljuDetailList', detailLines, '?곸꽭 遺꾩꽍 ?곗씠?곌? 以鍮?以묒엯?덈떎.');
  iljuSetList('iljuAdviceList', adviceLines, '留욎땄 議곗뼵 ?곗씠?곌? 以鍮?以묒엯?덈떎.');

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
      ? '???꾨Ц ?⑹뼱 李멸퀬: ' + iljuSanitizeText(data.details)
      : '???쇨컙(' + p.d.g + ') 쨌 ?쇱?(' + p.d.j + ') 湲곕컲 湲곕낯 遺꾩꽍';
  }
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   [NEW] 湲???대┃ ??60媛묒옄 諛?泥쒓컙吏吏 ?곸꽭 紐⑤떖 異쒕젰
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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
      ??[?쇨컙(Day Stem) ?밸퀎 遺꾩꽍] ??br/>
      ?쇨컙 <b>${clickedChar}</b>(?)???ъ＜?붿옄?먯꽌 <b>'???먯떊(蹂몄쭏)'</b>???곸쭠?섎뒗 媛???듭떖?곸씤 湲?먯엯?덈떎. ??湲곗슫???꾩껜 ?대챸??二쇰룄?곸쑝濡??대걣?닿컩?덈떎!</div>`;
  }

  let charHtml = ``;
  if(charName) {
      charHtml = `<div class="prem-box" style="margin-bottom:15px; border-color:#FFB6C1;">
        <span class="prem-title" style="background:#FF4081; color:#fff; border:none; padding:4px 10px; border-radius:12px;">??'${clickedChar}'(${charName})??怨좎쑀 ?뱀꽦</span>
        <div class="prem-text" style="margin-top:10px;">
            <b>??臾쇱긽(?곸쭠):</b> ${charSymbol}<br/>
            <b>??湲곗쭏/?깊뼢:</b> ${charDesc}<br/>
            <b>???대?吏:</b> ${charLook}
        </div>
      </div>`;
  }

let html = ``;

    if (posLabel === '?쇱＜') {
        html = `<div style="text-align:center;margin-bottom:15px;">
          <div style="font-size:0.9rem; color:#888; margin-bottom:5px;">[${posLabel}] ?뚯냽 60媛묒옄 議고빀</div>
          <h2 style="color:var(--pink);font-size:1.8rem;margin-bottom:5px; margin-top:5px;">${key}(${key})</h2>
          <div style="color:#666;font-size:0.95rem; word-break:keep-all;">${gapjaData.symbol}</div>
        </div>
        ${extra}
        ${charHtml}
        
        <div class="prem-box"><span class="prem-title">?뵎 ?붿빟</span><div class="prem-text">${gapjaData.summary}</div></div>
        <div class="prem-box"><span class="prem-title">?쫨 ?깊뼢 諛?湲곗쭏</span><div class="prem-text">${gapjaData.personality}</div></div>
        <div class="prem-box"><span class="prem-title">?뮳 吏곸뾽 諛??곸꽦</span><div class="prem-text">${gapjaData.professional}</div></div>
        <div class="prem-box"><span class="prem-title">?뮊 ?멸컙愿怨?/span><div class="prem-text">${gapjaData.relationship}</div></div>
        <div class="prem-box" style="background:#FFFDE7;border-color:#FFF59D">
            <span class="prem-title" style="border-color:#FBC02D;color:#E65100">?? 議곗뼵</span>
            <div class="prem-text" style="font-weight:700;color:#E65100">"${gapjaData.advice}"</div>
        </div>
        <div style="font-size:0.8rem;color:#999;margin-top:10px;text-align:center;">${(gapjaData.details||"").replace(/\n/g, '<br/>')}</div>`;
    } else {
        html = `<div style="text-align:center;margin-bottom:15px;">
          <div style="font-size:0.9rem; color:#888; margin-bottom:5px;">[${posLabel}] ??${isStem ? '泥쒓컙' : '吏吏'}</div>
          <h2 style="color:var(--pink);font-size:1.8rem;margin-bottom:5px; margin-top:5px;">${clickedChar}</h2>
        </div>
        ${charHtml}`;
    }

  modalBox.innerHTML = html;
  
  const tsModal = document.getElementById('tsModal');
  if(tsModal) tsModal.classList.add('show');
}

function renderManse(p){
  var cols=[{l:'?쒖＜',g:p.h.g,j:p.h.j},{l:'?쇱＜',g:p.d.g,j:p.d.j},{l:'?붿＜',g:p.m.g,j:p.m.j},{l:'?꾩＜',g:p.y.g,j:p.y.j}];
  var h='';
  cols.forEach(function(c){
    var gd=GAN[c.g]||{e:'metal',y:'+',n:'?'},jd=JI[c.j]||{e:'water',y:'+',a:'?'};
    var gGod=c.l==='?쇱＜'?'?쇨컙':getTenGod(p.d.g,c.g);
    var jGod=getTenGod(p.d.g,c.j);
    
    var isDayStem = (c.l==='?쇱＜');
    h+='<div class="pillar">'+
      '<div class="pillar-head">'+c.l+'</div>'+
      '<div class="ten-god-badge'+(isDayStem?' day':'')+'">'+gGod+'</div>'+
      '<div class="char-box bg-'+gd.e+'" onclick="showCharDetail(\''+c.g+'\', \'stem\', \''+c.g+'\', \''+c.j+'\', \''+c.l+'\', '+isDayStem+')">'+c.g+'</div>'+
      '<div class="yang-yin">'+(gd.y==='+'?'??:'??)+' '+gd.n+'</div>'+
      '<div class="ten-god-badge">'+jGod+'</div>'+
      '<div class="char-box bg-'+jd.e+'" onclick="showCharDetail(\''+c.j+'\', \'branch\', \''+c.g+'\', \''+c.j+'\', \''+c.l+'\', false)">'+c.j+'</div>'+
      '<div class="yang-yin">'+(jd.y==='+'?'??:'??)+' '+jd.a+'</div>'+
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
      '<div class="ts-hint">?먯꽭??蹂닿린 ??/div>'+
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
        envTitle = "?뺢컝?섍퀬 怨좎슂??寃⑥슱 ?곗옣";
        envDesc = "?됱쿋???댁꽦怨?留브퀬 ?딆쓬???뺤떎??誘몃땲硫由ъ뒪?? 遺덊븘?뷀븳 媛먯젙?대굹 ?멸컙愿怨꾨? 泥좎???諛곗젣?섍퀬, ?섎쭔???낅┰?곸씠怨??됱삩???멸퀎?먯꽌 理쒓퀬???⑥쑉??諛쒗쐶?⑸땲??<br><br><b> 鍮꾩쫰?덉뒪/?ㅻТ:</b> ?곗씠??遺꾩꽍, 湲고쉷, ?쇱옄 源딄쾶 ?뚭퀬?쒕뒗 ?곌뎄 吏곷Т???뺣젹.<br><b> ?곗븷:</b> ?좎쓣 ?섏? ?딅뒗 源붾걫??留ㅻ꼫? ?좊ː媛먯씠 ?앸챸.";
    } else if (isCold && isWet) {
        envEmoji = "";
        envTitle = "????臾쇱븞媛쒓? ?쇱뼱?ㅻⅤ???덈꼍 ?몄닔";
        envDesc = "李⑤텇?섎㈃?쒕룄 ?ъ슜?μ씠 源딆? ?대㈃???뚯쑀?? 寃됱쑝濡쒕뒗 議곗슜??蹂댁씠吏留??섎쭖? ?앷컖怨?媛먯젙???좉린?곸쑝濡??곌껐?섏뼱 ?덉뒿?덈떎. ?諛???뺣낫??留덉쓬???섎늻??愿怨꾩뿉??源딆? ?λ젰??諛쒗쐶?⑸땲??<br><br><b> 鍮꾩쫰?덉뒪/?ㅻТ:</b> ?곷떞, ?щ━, ?덉닠, ?щ엺???대㈃???듭같?섎뒗 湲고쉷 吏곷Т.<br><b> ?곗븷:</b> 泥쒖쿇???ㅻŉ?쒕뒗 ?댁떖?꾩떖???щ옉.";
    } else if (!isCold && isDry) {
        envEmoji = "";
        envTitle = "?쒖뼇???묒뿴?섎뒗 ?④굅????먯뿰???щ쭑";
        envDesc = "媛뺣젹??紐⑺몴 ?섏떇怨??대갚???깃꺽???뚯쑀?? ??踰?紐⑺몴瑜??뺥븯硫??욌쭔 蹂닿퀬 吏곸쭊?섎ŉ, ?ㅻ걹???놁뒿?덈떎. 媛뺥븳 ?댁젙怨?鍮좊Ⅸ 寃곕떒?μ씠 ?꾩슂??怨녹뿉???곸썡???깃낵瑜??낅땲??<br><br><b> 鍮꾩쫰?덉뒪/?ㅻТ:</b> ?ㅽ??몄뾽 李쎌뾽, ?몄씪利? ?④린 ?꾨줈?앺듃 由щ뜑, 媛먯궗/?됯? 吏곷Т.<br><b> ?곗븷:</b> ?붾걟?섍쾶 ??ㅻⅤ怨?源붾걫?섍쾶 ?몄젙?섎뒗 荑⑦븳 ??댄봽.";
    } else {
        envEmoji = "";
        envTitle = "?앸챸?μ씠 ?섏튂???ㅼ씠?대????대? ?곕┝";
        envDesc = "?щ엺?ㅺ낵???뚰넻怨??깆옣??媛덈쭩?섎뒗 '? 媛??紐⑤뱶'. ?멸린?ъ씠 留롪퀬 移쒗솕?μ씠 ?곗뼱?섎ŉ, 蹂듭옟???몄쟻 ?ㅽ듃?뚰겕 ?띿뿉??臾댄븳???먮꼫吏瑜?援먮쪟?섎ŉ 六쀬뼱 ?섍컩?덈떎.<br><br><b> 鍮꾩쫰?덉뒪/?ㅻТ:</b> HR, 援먯쑁, 留덉??? 蹂?몄궗, ?묎?, ?ㅼ닔???щ엺怨??묒뾽?섎뒗 而ㅻ??덉??댄꽣.<br><b> ?곗븷:</b> 媛먯젙 ?쒗쁽???띾??섍퀬 ?④퍡 寃쏀뿕?섎ŉ 而ㅺ????곗븷.";
    }

    const contentHTML = `
    <div style="font-family: 'Pretendard', sans-serif; font-size: 0.95rem; color: #333;">
        
        <!-- ?쒕궃議곗뒿 ?ㅻ챸 ?꾩퐫?붿뼵 ?곸뿭 -->
        <div style="margin-bottom: 20px;">
          <button type="button" class="johu-info-btn" onclick="const content = document.getElementById('johuExplanation'); const icon = document.getElementById('johuAccordionIcon'); if(content.style.display === 'none'){ content.style.display = 'block'; content.style.opacity = 1; content.style.transform = 'translateY(0)'; icon.style.transform = 'rotate(180deg)'; } else { content.style.display = 'none'; content.style.opacity = 0; content.style.transform = 'translateY(-10px)'; icon.style.transform = 'rotate(0deg)'; }">
            <span class="johu-info-btn__label">?쒕궃議곗뒿?대? 臾댁뾿?멸???</span>
            <span id="johuAccordionIcon" class="johu-info-btn__icon">??/span>
          </button>
            
            <div id="johuExplanation" style="display: none; opacity: 0; transform: translateY(-10px); transition: opacity 0.3s ease, transform 0.3s ease; background: #F8FDFF; border: 1px solid #CFD8DC; border-radius: 12px; padding: 20px; margin-top: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <p style="margin: 0 0 16px 0; line-height: 1.6; color: #455A64; font-size: 0.9rem;">
                    <b>?쒕궃議곗뒿(湲고썑)</b>? ?ъ＜??<b>?⑤룄(李④퀬 ?④굅?)</b>? <b>?듬룄(嫄댁“?섍퀬 珥됱큺??</b>瑜??섎??⑸땲??<br>
                    ?먯뿰??怨꾩젅怨??좎뵪泥섎읆, ?곕━ ?대㈃?먮룄 湲고썑媛 議댁옱?⑸땲?? ?먯떊??湲고썑瑜??뚮㈃ ?닿? ?대뼡 ?섍꼍?먯꽌 媛??鍮쏅굹怨??몄븞?쒖? ?????덉뒿?덈떎.
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: rgba(227, 242, 253, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #1976D2;">
                        <div style="font-weight: 700; color: #1565C0; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;"><span style="font-size: 1.1rem;"></span> ??(李④??)</div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">寃⑥슱???묒텞??湲곗슫. 李⑤텇?섍퀬 ?좎쨷?섎ŉ, ?대㈃???ㅼ????댁꽦??紐⑤뱶.</div>
                    </div>
                    <div style="background: rgba(255, 235, 238, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #D32F2F;">
                        <div style="font-weight: 700; color: #C62828; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">?④굅? (?? <span style="font-size: 1.1rem;"></span></div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">?щ쫫??諛쒖궛?섎뒗 湲곗슫. ?댁젙?곸씠怨??명뼢?곸씠硫? 諛뽰쑝濡?六쀬뼱?섍????媛??紐⑤뱶.</div>
                    </div>
                    <div style="background: rgba(255, 243, 224, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #F57C00;">
                        <div style="font-weight: 700; color: #E65100; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;"><span style="font-size: 1.1rem;"></span> 議?(嫄댁“??</div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">媛?꾩쓽 ?⑤떒??湲곗슫. 留브퀬 ?딆쓬???뺤떎?섎ŉ, ?낅┰?곸씠怨?援곕뜑?붽린 ?녿뒗 誘몃땲硫由ъ뒪??</div>
                    </div>
                    <div style="background: rgba(232, 245, 233, 0.6); padding: 14px; border-radius: 10px; border-left: 3px solid #388E3C;">
                        <div style="font-weight: 700; color: #2E7D32; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">珥됱큺??(?? <span style="font-size: 1.1rem;"></span></div>
                        <div style="font-size: 0.8rem; color: #546E7A; line-height: 1.5;">遊꾩쓽 ?쏀엳??湲곗슫. 移쒗솕?κ낵 怨듦컧 ?λ젰???곗뼱?섎ŉ, 二쇰?怨??④퍡 ?깆옣?섎뒗 而ㅻ??덉??댄꽣.</div>
                    </div>
                </div>
            </div>
        </div>

        <div style="background: linear-gradient(120deg, #F0F4FF, #F9F1FD); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.04); cursor: pointer; transition: transform 0.2s;" onclick="this.style.transform='scale(1.02)'; setTimeout(()=>this.style.transform='scale(1)', 200)">
            <div style="font-size: 3rem; margin-bottom: 8px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.1));">${envEmoji}</div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #8A63A5; margin-bottom: 6px; letter-spacing: 0.05em;">議고썑, ?몄깮 ?섍꼍 吏꾨떒</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #2C3E50; margin-bottom: 12px;">${envTitle}</div>
            <div style="font-size: 0.9rem; line-height: 1.6; color: #505F6E; text-align: left; background: rgba(255,255,255,0.6); padding: 12px 16px; border-radius: 12px;">${envDesc}</div>
            <div style="display:flex; justify-content: center; gap: 8px; margin-top: 15px;">
                <span class="johu-badge ${johu.badgeCls}">${johu.badgeTxt}</span>
                <span class="johu-badge" style="background: ${isWet ? '#E3F2FD' : '#FFF3E0'}; color: ${isWet ? '#1565C0' : '#E65100'}">${isWet ? ' 珥됱큺???? : ' 嫄댁“????}</span>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px; background: #FAFAFA; padding: 20px; border-radius: 16px; border: 1px solid #EEE;">
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 800; font-size: 0.9rem;">
                    <span style="color: #1976D2; display: flex; align-items: center; gap: 4px;" title=" ?먮꼫吏 ?덉빟 紐⑤뱶. ?대㈃ 吏?μ쟻, ?좎쨷??"><span style="font-size: 1.1rem;"></span> 李④?? (野?</span>
                    <span style="color: #E53935; display: flex; align-items: center; gap: 4px;" title=" ? 媛??紐⑤뱶. ?명뼢?? ?댁젙??">?④굅? (?? <span style="font-size: 1.1rem;"></span></span>
                </div>
                <div style="position: relative; height: 16px; background: linear-gradient(to right, #64B5F6 0%, #E0E0E0 50%, #EF5350 100%); border-radius: 10px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="position: absolute; left: calc(${tempPct}% - 4px); top: 0; bottom: 0; width: 8px; background: #FFF; border-radius: 4px; box-shadow: 0 0 4px rgba(0,0,0,0.5); border: 2px solid #333; z-index: 2; transition: left 1s ease-out;"></div>
                </div>
                <div style="text-align: center; font-size: 0.8rem; margin-top: 8px; color: #777;">
                    ?꾩옱 ?⑤룄: <strong style="color: #333; font-size: 0.95rem;">${johu.score > 0 ? '+' : ''}${johu.score.toFixed(1)}</strong>
                </div>
            </div>
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 800; font-size: 0.9rem;">
                    <span style="color: #F57F17; display: flex; align-items: center; gap: 4px;" title=" 源붾걫??誘몃땲硫由ъ뒪?? ?낅┰?? 留브퀬 ?딆쓬."><span style="font-size: 1.1rem;"></span> 嫄댁“??(??</span>
                    <span style="color: #388E3C; display: flex; align-items: center; gap: 4px;" title=" ?④퍡 ?깆옣?섎뒗 ?뺢?. 移쒗솕?? ?곌껐??">珥됱큺??(嚥? <span style="font-size: 1.1rem;"></span></span>
                </div>
                <div style="position: relative; height: 16px; background: linear-gradient(to right, #FFB74D 0%, #E0E0E0 50%, #81C784 100%); border-radius: 10px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="position: absolute; left: calc(${humidPct}% - 4px); top: 0; bottom: 0; width: 8px; background: #FFF; border-radius: 4px; box-shadow: 0 0 4px rgba(0,0,0,0.5); border: 2px solid #333; z-index: 2; transition: left 1s ease-out;"></div>
                </div>
                <div style="text-align: center; font-size: 0.8rem; margin-top: 8px; color: #777;">
                    ?꾩옱 ?띿꽦: 嫄댁“ ${johu.dryCnt || 0} / ??${johu.moistCnt || 0} <span style="font-size: 0.8rem; color:#888;">(?몄감: ${diffRaw > 0 ? '+' : ''}${diffRaw})</span>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px;">
                <div style="text-align:center; background:rgba(255,235,238,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(239,154,154,.4);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#C62828;">????</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.fc}</div>
                </div>
                <div style="text-align:center; background:rgba(227,242,253,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(144,202,249,.4);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#1565C0;">??麗?</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.wc}</div>
                </div>
                <div style="text-align:center; background:rgba(232,245,233,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(165,214,167,.4);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#2E7D32;">紐???</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.wdc}</div>
                </div>
                <div style="text-align:center; background:rgba(245,245,245,.8); border-radius:10px; padding:10px 4px; border:1px solid rgba(207,216,220,.6);">
                    <div style="font-size:1.2rem"></div>
                    <div style="font-size:.7rem; font-weight:700; color:#546E7A;">湲???</div>
                    <div style="font-size:.85rem; font-weight:900; color:#444;">${johu.mc}</div>
                </div>
            </div>
        </div>
        <div style="background: rgba(255,255,255,0.8); border-left: 3px solid #8A63A5; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 16px; font-size: 0.85rem; line-height: 1.7; color: #444;">
            <b>?뙼 議고썑 諛몃윴??泥섎갑</b>
            ${(function(){
              var t = johu.type;
              var m = johu.moistType;
              var rows = [];

              // ?? ?⑤룄 泥섎갑 (6醫?紐낇솗 援щ텇) ??
              if(t === 'hot'){
                rows.push('<div style="margin-top:10px; background:#FFF3E0; border-radius:8px; padding:10px 12px; border-left:3px solid #EF6C00;"><b style="color:#BF360C;">?뵦 ?④굅???ъ＜ 泥섎갑</b><br>??湲곗슫??怨쇱엵?낅땲?? <b>麗는룬뇫</b> 湲곗슫???곴레 蹂댁땐?댁빞 ?⑸땲??<br>쨌 異붿쿇 ?됱긽: ?뚮??됀룰???됀룻씛??br>쨌 異붿쿇 諛⑺뼢: 遺곸そ쨌?쒖そ<br>쨌 異붿쿇 ?쒕룞: ?섏쁺, 臾쇨? ?곗콉, ?됲깢쨌議깆슃, 紐낆긽<br>쨌 二쇱쓽: 怨쇨꺽???대룞쨌?④굅???섍꼍쨌遺됱? 而щ윭 怨쇱슜 ?먯젣</div>');
              } else if(t === 'warm'){
                rows.push('<div style="margin-top:10px; background:#FFF8E1; border-radius:8px; padding:10px 12px; border-left:3px solid #F9A825;"><b style="color:#F57F17;">?뙙 ?곕쑜???ъ＜ 泥섎갑</b><br>?닿린媛 ?ㅼ냼 媛뺥빀?덈떎. <b>麗?/b> 湲곗슫?쇰줈 洹좏삎???≪쑝硫?醫뗭뒿?덈떎.<br>쨌 異붿쿇 ?됱긽: ?뚮??됀룻븯?섏깋쨌誘쇳듃<br>쨌 異붿쿇 諛⑺뼢: 遺곸そ<br>쨌 異붿쿇 ?쒕룞: 臾??먯＜ 留덉떆湲? 怨꾧끝쨌諛붾떎 ?섎뱾?? 荑⑤떎???ㅽ듃?덉묶<br>쨌 二쇱쓽: 怨쇱쓬쨌怨쇱떇쨌?쇱떇 ?먯젣</div>');
              } else if(t === 'neutral'){
                rows.push('<div style="margin-top:10px; background:#E8F5E9; border-radius:8px; padding:10px 12px; border-left:3px solid #43A047;"><b style="color:#2E7D32;">?뙟截??쒖썝??洹좏삎) ?ъ＜ 泥섎갑</b><br>?⑤룄 洹좏삎???묓샇?⑸땲?? 怨꾩젅 蹂?붿? ?듬룄??留욎떠 ?몃??섍쾶 議곗젅?섏꽭??<br>쨌 ?ㅽ뻾??怨좊（ ?쒖슜?섎뒗 硫?고뵆?덉씠??泥쒓린 ?좏슚<br>쨌 遊꽷룰??? ?㉱룬뇫 湲곗슫 ?쒖슜, ?щ쫫: 麗?蹂댁땐, 寃⑥슱: ?ヂ룡쑉 蹂댁땐<br>쨌 ?ㅼ뼇???섍꼍 蹂?붿뿉 ?좎뿰?섍쾶 ?곸쓳?섎뒗 寃껋씠 媛쒖슫???듭떖</div>');
              } else if(t === 'cool'){
                rows.push('<div style="margin-top:10px; background:#E3F2FD; border-radius:8px; padding:10px 12px; border-left:3px solid #1976D2;"><b style="color:#0D47A1;">?뛽 ?쒕뒛???ъ＜ 泥섎갑</b><br>?④린媛 ?ㅼ냼 遺議깊빀?덈떎. <b>?ヂ룡쑉</b> 湲곗슫?쇰줈 蹂댁땐?섎㈃ 醫뗭뒿?덈떎.<br>쨌 異붿쿇 ?됱긽: 二쇳솴?됀룸끃?됀룸텎? 怨꾩뿴<br>쨌 異붿쿇 諛⑺뼢: ?⑥そ쨌?숈そ<br>쨌 異붿쿇 ?쒕룞: ?뉖튆 弛먭린, ?⑦깢쨌諛섏떊?? ?ㅽ듃?덉묶쨌?붽?<br>쨌 二쇱쓽: 李??뚯떇쨌?됰갑 怨쇰떎 ?몄텧 ?먯젣</div>');
              } else if(t === 'cold'){
                rows.push('<div style="margin-top:10px; background:#E8EAF6; border-radius:8px; padding:10px 12px; border-left:3px solid #3949AB;"><b style="color:#1A237E;">?꾬툘 李④????ъ＜ 泥섎갑</b><br>麗는룬뇫 湲곗슫??怨쇱엵?낅땲?? <b>?ヂ룡쑉</b> 湲곗슫???덉떎???꾩슂?⑸땲??<br>쨌 異붿쿇 ?됱긽: 鍮④컙?됀룹＜?⑹깋쨌?곕몢??br>쨌 異붿쿇 諛⑺뼢: ?⑥そ쨌?숈そ<br>쨌 異붿쿇 ?쒕룞: ?곕쑜???뚯떇쨌?⑦깢, ?좎궛???대룞?쇰줈 泥댁삩 ?щ━湲? ?뉖튆 異⑸텇??弛먭린<br>쨌 二쇱쓽: ?됱닔?빧룰낵???됰갑쨌?대몢???됱긽 怨쇰떎 ?ъ슜 ?먯젣</div>');
              }

              // ?? ?듭“ 泥섎갑 (嫄댁“??蹂꾨룄 媛뺤“) ??
              if(m === 'dry'){
                rows.push('<div style="margin-top:8px; background:#FFF3E0; border-radius:8px; padding:10px 12px; border-left:3px solid #F57C00;"><b style="color:#E65100;">?룣截?嫄댁“???ъ＜ 異붽? 泥섎갑</b><br>?듦린媛 遺議깊빀?덈떎. <b>麗는룡쑉</b> 湲곗슫怨??ㅼ젣 ?섎텇 蹂댁땐???꾩슂?⑸땲??<br>쨌 臾?異⑸텇??留덉떆湲??섎（ 1.5L ?댁긽), 媛?듦린 ?ъ슜<br>쨌 紐⑹슃쨌議깆슃쨌?섏쁺쨌?먯뿰(?꼲룸Ъ媛) ?먯＜ ?묓븯湲?br>쨌 珥됱큺???앺솢 ?섍꼍(?앸Ъ ?ㅼ슦湲? ?섏”愿 ?? 議곗꽦</div>');
              } else if(m === 'wet'){
                rows.push('<div style="margin-top:8px; background:#E8F5E9; border-radius:8px; padding:10px 12px; border-left:3px solid #388E3C;"><b style="color:#2E7D32;">?뮛 珥됱큺???ъ＜ 蹂댁셿 泥섎갑</b><br>?듦린媛 留롮뒿?덈떎. <b>?뫢루겓</b> 湲곗슫?쇰줈 嫄댁“?⑥쓣 異붽???洹좏삎??留욎텛?몄슂.<br>쨌 ?섍린 ?먯＜ ?섍린, 嫄댁“???섍꼍 議곗꽦<br>쨌 ?곗깋쨌湲덉깋 ?뚰뭹 ?쒖슜, ?쒖そ 諛⑺뼢 ?먮꼫吏 ?쒖슜<br>쨌 洹쒖튃?곸씤 ?앺솢濡??덉쟻??媛먯젙쨌愿怨꾩쓽 寃쎄퀎??紐낇솗???섍린</div>');
              } else {
                rows.push('<div style="margin-top:8px; background:#F3E5F5; border-radius:8px; padding:10px 12px; border-left:3px solid #8E24AA;"><b style="color:#6A1B9A;">?뽳툘 ?듭“(嚥뺟눆) 洹좏삎 ?좎?</b><br>?듬룄 洹좏삎???묓샇?⑸땲?? ?꾩옱 ?앺솢 ?⑦꽩???좎??섎㈃???⑤룄 泥섎갑??吏묒쨷?섏꽭??</div>');
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
      '<span class="power-badge pb-jong">?? '+jg.name+'</span>'+
      '<span style="font-size:.85rem;font-weight:700;color:#6A1B9A">'+EL_E[jg.dominant]+' '+EL_K[jg.dominant]+' '+jg.pct+'% 吏諛?/span>'+
      '</div>'+
      '<div style="font-size:.84rem;color:#4A148C;line-height:1.78">'+
      '<b>醫낃꺽 ?ъ＜</b>???쇰컲 ?듬?踰뺤씠 ?곸슜?섏? ?딆뒿?덈떎.<br>'+
      EL_K[jg.dominant]+' 湲곗슫??<b>??媛뺥빐吏?????/b>??湲???, <b>?쏀빐吏?????/b>???????낅땲??<br>'+
      '<span style="color:#9C27B0">???뱀떊??媛뺤젏??'+EL_K[jg.dominant]+' ?먮꼫吏瑜?洹뱁븳源뚯? ?쒖슜?섎뒗 寃껋씠 ?깃났???댁뇿?낅땲??</span>'+
      '</div>'+
      '</div>';
  }

  if(pw){
    var boxCls=jg&&jg.isJong?'':(pw.isStrong?'ukbu-strong':'ukbu-weak');
    html+='<div class="ukbu-box '+boxCls+'">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">'+
      '<span class="power-badge '+(pw.isStrong?'pb-strong':'pb-weak')+'">'+(pw.isStrong?'?뵦 ?좉컯(翁ュ성)':'?뮛 ?좎빟(翁ュ선)')+' '+pw.score+'??/span>'+
      '<span style="font-size:.82rem;color:#555">'+(pw.isStrong?'?먮꼫吏媛 ?섏튂??二쇱껜???깃꺽':'?ъ꽭?섍퀬 怨듦컧 ?λ젰???곸썡???깃꺽')+'</span>'+
      '</div>'+
      '<div style="font-size:.84rem;color:#555;line-height:1.78">'+
      '<b>'+((GAN[dg]&&GAN[dg].n)||dg)+' ?쇨컙</b>?쇰줈 '+(pw.isStrong
        ?'?怨좊궃 ?먮꼫吏媛 ?뺤꽦?⑸땲?? ?ㅺ린쨌洹??? ?댁뿉???ы쉶???좎뿰?④낵 ?멸컙愿怨꾧? 苑껋쓣 ?쇱썎?덈떎.'
        :'?ъ꽭??媛먯닔?깆씠 ?밸퀎??留ㅻ젰?낅땲?? ????쨌鍮?驪? ?댁뿉???먯〈媛먯씠 ?믪븘吏怨?洹?몄씠 ?섑??⑸땲??')+
      '</div>'+
      '<div class="yn-row">'+
      '?뙚 <b>?⑹떊:</b> '+
      (jg&&jg.isJong
        ?[jg.dominant,jg.parEl].filter(Boolean).map(function(e){return EL_E[e]+EL_K[e];}).join(' ')
        :pw.yongshin.map(function(e){return EL_E[e]+EL_K[e];}).join(' &nbsp;'))+
      ' &nbsp;&nbsp; ?슙 <b>湲곗떊:</b> '+
      (jg&&jg.isJong?'?쏀솕 湲곗슫 二쇱쓽'
        :pw.kijishin.map(function(e){return EL_E[e]+EL_K[e];}).join(' &nbsp;'))+
      '</div>'+
      '</div>';
  }

  document.getElementById('ukbuSection').innerHTML=html;
}

/* ??? 60媛묒옄 ?쇱＜ 怨좎쑀?λ젰 DB (INNATE ABILITY) ??? */
var ILJU_INNATE_DB = {
  // ?먥븧????(媛묐ぉ쨌嫄곕ぉ) ?쇱＜ ?먥븧??  "?꿨춴":{i:"?뙌",n:"?ъ뿰??肉뚮━",sub:"?꿨춴 쨌 ?대몺 ?띿쓽 嫄곕ぉ",d:"?쒓꺼??諛? ?쇱뼱遺숈? ???꾨옒?쒕룄 臾듬У??肉뚮━瑜??대━??嫄곕ぉ. ?⑤뱾???ш린?????濡?湲고쉶瑜??ъ갑?섎뒗 洹밴컯???앹〈 吏곴컧??諛쒕룞?쒕떎. ?꾧린 ?곹솴?먯꽌 ?ㅽ엳???됱젙?댁?硫???쟾?????섎? 李얠븘?몃떎."},
  "?꿨칲":{i:"?쫨",n:"?뀁쓽 援곗솗",sub:"?꿨칲 쨌 媛꾩뿬吏?숈쓽 ?⑥솗",d:"泥쒓컙怨?吏吏 紐⑤몢 紐???! 媛留뚰엳 ???덇린留??대룄 ???꾩껜媛 怨좉컻瑜??숈씠???뺣룄??移대━?ㅻ쭏. ?쒖뼱???쒓컙遺??由щ뜑??DNA媛 ?덇꺼???덉쑝硫? ?대뼡 議곗쭅???ㅼ뼱媛??寃곌뎅 瑗??湲곗뿉 ?ㅻⅤ寃??섎뒗 ?뺤쓽 湲곗슫???怨좊궗??"},
  "?꿱쒼":{i:"?릧",n:"?뱀쿇?섎뒗 ??,sub:"?꿱쒼 쨌 嫄곕ぉ???⑹쓣 留뚮굹??,d:"?섎Т媛 鍮?癒멸툑? ?낆뿉????컻?곸쑝濡??깆옣?섎벏, ?먮???轅덉쓣 ?꾩떎濡??뚯뼱?밴린???댁긽?ㅽ쁽?μ씠 洹밸??붾맂?? ?ㅼ??쇱씠 ?⑤떎瑜대ŉ ?묒? 寃껋뿉 ?곗뿰?섏? ?딅뒗 ??몃같 湲곗쭏??諛쒕룞?쒕떎."},
  "?꿨뜄":{i:"?뵦",n:"??ㅻⅤ??嫄곕ぉ",sub:"?꿨뜄 쨌 ?띿뿼??遺덈굹臾?,d:"?섎Т??遺덉씠 遺숈쑝硫? 二쇰? 紐⑤뱺 寃껋쓣 ?섑븯寃?諛앺엳??嫄곕????껊텋???쒕떎! ?④굅???댁젙?쇰줈 二쇰??멸퉴吏 媛먰솕?쒗궎???꾩뿼???먮꼫吏瑜?肉쒖쑝硫? ?띿뿼???뱀쑀??臾섑븳 ?됯린源뚯? 寃몃퉬?쒕떎."},
  "?꿰뵵":{i:"?첆",n:"?꾨겮瑜?留욌뒗 ?섎Т",sub:"?꿰뵵 쨌 ?쒕젴 ?댁꽦 MAX",d:"湲?????紐?????移섎뒗 ?멸? 援ъ“! ??꼍怨??쒕젴???딆씠吏 ?딆?留? 留욎쑝硫?留욎쓣?섎줉 ?섏씠?뚭? ?⑤떒?댁???遺덉궗??泥댁쭏. ?⑤뱾蹂대떎 10諛??섎뱺 ?몄깮???댁?留?寃곌뎅 理쒗썑???뱀옄媛 ?쒕떎."},
  "?꿩닃":{i:"?맳",n:"怨좊룆???뚯닔袁?,sub:"?꿩닃 쨌 ?⑹빞???섑샇??,d:"??????몄벝???ㅽ뙋???濡????덈뒗 嫄곕ぉ泥섎읆 ?섎━? 泥좏븰??理쒗썑??蹂대（. 二쇰???臾대꼫?몃룄 ?덈? ?붾뱾由ъ? ?딅뒗 ?뺤떊?μ쓽 ?뚯쑀?먯씠硫? 吏??寃껋? 紐⑹닲 嫄멸퀬 吏?ㅻ뒗 ?섑샇 蹂몃뒫??諛쒕룞?쒕떎."},

  // ?먥븧??阿?(?꾨ぉ쨌?앹엥/苑? ?쇱＜ ?먥븧??  "阿쇾툚":{i:"?뙮",n:"?멸퀬???덉떦",sub:"阿쇾툚 쨌 ?숉넗瑜??ル뒗 ?앸챸??,d:"苑곴퐗 ?쇱뼱遺숈? ???띿뿉?쒕룄 ?대뼸寃뚮뱺 ?뱀쓣 ?붿슦??寃쎌씠濡쒖슫 ?앸챸?? ?섍꼍???꾨Т由?泥숇컯?대룄 ?덉쭏湲곌쾶 ?댁븘?⑥쑝硫? 怨좎깮 ?앹뿉 ?숈씠 ?ㅻ뒗 ?湲곕쭔?깊삎 ?대챸??二쇱씤怨듭씠??"},
  "阿쇿뜱":{i:"?뙵",n:"留뚭컻??留ㅽ샊",sub:"阿쇿뜱 쨌 媛꾩뿬吏?숈쓽 苑껊강",d:"泥쒓컙쨌吏吏 紐⑤몢 苑? 議댁옱 ?먯껜濡?二쇰????꾨쫫?듦쾶 臾쇰뱾?대뒗 留덉꽦??留ㅻ젰 蹂댁쑀?? ?щ엺???뚯뼱?밴린???섏씠 鍮꾪쁽?ㅼ쟻?쇰줈 媛뺥븯硫? 誘몄쟻 媛먭컖怨??⑥뀡 ?쇱뒪媛 DNA???덇꺼???덈떎."},
  "阿쇿럼":{i:"?뵳",n:"遺덇퐙 留ㅽ솕",sub:"阿쇿럼 쨌 遺?쒕윭???낆묠",d:"苑?媛숈? ?몃え ?ㅼ뿉 ?④꺼吏??좎뭅濡쒖슫 ?밸?洹쇱꽦! 寃됱쑝濡쒕뒗 ?껋쑝硫댁꽌 ?띿쑝濡쒕뒗 移섎??섍쾶 怨꾩궛?섎뒗 泥쒓린媛 湲곗쭏???덉쑝硫? 寃곗젙???쒓컙???꾨Т???덉긽 紐???移대뱶瑜?爰쇰궡?좊떎."},
  "阿숁쑋":{i:"?룪",n:"?숈썝???뺤썝??,sub:"阿숁쑋 쨌 硫붾쭏瑜??낆쓽 ?뱁솕??,d:"?꾨Т寃껊룄 ?먮씪吏 ?딅뒗 硫붾쭏瑜??낆뿉?쒕룄 ?띿슂濡쒖슫 ?뺤썝??留뚮뱾?대궡???뱁솕 ?λ젰! ?щ엺?대뱺 議곗쭅?대뱺 愿怨꾨뱺, ?먮???寃껊쭏???깃렇?쎄쾶 ?깆옣?쒗궎??留덈쾿???먯쓣 媛議뚮떎."},
  "阿숅뀎":{i:"?뭿",n:"蹂댁꽍??媛먯? ?앹엥",sub:"阿숅뀎 쨌 洹뱁븳???먮?二쇱쓽",d:"媛??蹂댁꽍??媛먯븘 ?щ━???앹엥泥섎읆, ?꾨쫫?ㅼ??????吏묒갑???덉닠??寃쎌????대Ⅸ?? 誘몄쟻 ?덈ぉ怨??꾨꼍二쇱쓽媛 ?⑹퀜??'紐살깮湲?寃껋? 議댁옱?댁꽑 ???쒕떎'??泥좏븰??諛쒕룞?쒕떎."},
  "阿쇾벤":{i:"?뙼",n:"?섏〈???⑹엥",sub:"阿쇾벤 쨌 湲곗깮?섏뿬 ?뺣났?섎떎",d:"?몄닔 ?꾨? ?ㅻ뜮???앹엥泥섎읆 ?곷?諛⑹쓽 ?먯썝怨?湲곗슫???먯뿰?ㅻ읇寃??먭린 寃껋쑝濡??≪닔?섎뒗 ?λ젰! ?쏀빐 蹂댁씠吏留?寃곌뎅 ?숈＜蹂대떎 ??而ㅼ졇???꾩껜瑜??μ븙?섎뒗 議곗슜??吏諛곗옄?대떎."},

  // ?먥븧??訝?(蹂묓솕쨌?쒖뼇) ?쇱＜ ?먥븧??  "訝쇿칲":{i:"?똿",n:"?숉??섏쓽 ?좏샇??,sub:"訝쇿칲 쨌 ?덈꼍???щ뒗 ?쒖뼇",d:"遊꾧린???꾩뿉 ?쒖뼇???좎삤瑜대뒗 ?뺤긽! 臾댁뾿?대뱺 ?쒖옉?섎㈃ 二쇰?源뚯? ?⑸떖???쒓린媛 李⑥삤瑜대뒗 ?쒕룞 ?먮꼫吏媛 ??컻?쒕떎. '?쇰떒 ?쒖옉??'媛 醫뚯슦紐낆씠硫? ?됰룞?μ쑝濡??몄긽??諛붽씀??媛쒖쿃??蹂몃뒫??源⑥뼱?쒕떎."},
  "訝숃쒼":{i:"?截?,n:"?⑹쓣 ???쒖뼇",sub:"訝숃쒼 쨌 ?곗＜湲?鍮꾩쟾",d:"?쒖뼇???⑹쓽 ?깆뿉 ?щ씪?硫? ?곸긽???ㅼ????먯껜媛 ?곗＜?곸씠 ?쒕떎! ?⑤뱾??'?꾩떎?곸쑝濡쒋???留먰븷 ???쇱옄 ?ㅻⅨ 李⑥썝??洹몃┝??洹몃━硫? ??띻쾶??洹멸쾬???꾩떎???섏뼱踰꾨━??鍮꾩쟾???뚯쑀??"},
  "訝쇿뜄":{i:"?뮙",n:"?듯룺諛?移대━?ㅻ쭏",sub:"訝쇿뜄 쨌 媛꾩뿬吏?숈쓽 ?쒖뼇??,d:"?쒖뼇 ?꾩뿉 ?쒖뼇! 媛??怨노쭏??二쇱씤怨?蹂댁젙???먮룞 諛쒕룞?섎ŉ 議댁옱媛먯씠 999瑜?李띾뒗?? ?띿뿼?닿퉴吏 寃뱀퀜 ?댁꽦???먯꽍泥섎읆 ?뚯뼱?밴린??洹밴컯 留ㅻ젰源뚯? 蹂댁쑀. ?? ?덈Т ?④굅?뚯꽌 蹂몄씤??媛???踰꾨┛??"},
  "訝숂뵵":{i:"?믭툘",n:"?⑷킅濡?,sub:"訝숂뵵 쨌 ?좊룄 ?뱀씠??遺덇퐙",d:"?쒖뼇??湲덉냽???뱀뿬 ?먰븯???뺥깭濡?二쇱“?섎뒗 ?λ젰! ?꾧퀬???곷??? 遺덇??ν빐 蹂댁씠???꾨줈?앺듃???④굅???댁젙 ?섎굹濡??뱀뿬?????삳?濡?鍮싳뼱踰꾨━???뺣룄??異붿쭊?μ씠 諛쒕룞?쒕떎."},
  "訝숁닃":{i:"?뙁",n:"?앹뼇???꾩궗",sub:"訝숁닃 쨌 ?λ젹??留덈Т由?,d:"吏???닿? ?섎뒛 ?꾩껜瑜?臾쇰뱾?대벏, ?앸㎈?뚯쓣 ?꾨쫫?듦퀬 媛뺣젹?섍쾶 ?μ떇?섎뒗 留덈Т由??ъ씤. ?꾨줈?앺듃??愿怨꾨뱺 ?쒖옉蹂대떎 ?앹씠 ???붾젮?섎ŉ, ?ㅻ룎?꾩꽌??紐⑥뒿留덉? ?쒕씪留덊떛?섎떎."},
  "訝쇿춴":{i:"?뙄",n:"?섎㈃ ?꾩쓽 ?쒖뼇",sub:"訝쇿춴 쨌 媛먯꽦怨??댁꽦??怨듭〈",d:"?④굅???쒖뼇怨?李④???寃⑥슱 臾쇱쓽 ?숆굅! 洹밸떒?곸씤 媛먯꽦怨??됱쿋???댁꽦????紐몄뿉 怨듭〈?섎뒗 ?묐㈃??泥쒖옱. ?덉닠??媛먯닔?깃낵 ?쇰━??遺꾩꽍?μ쓣 ?숈떆??媛?숈떆?ㅻ뒗 硫?곗퐫???꾨줈?몄꽌 ?먮뇤."},

  // ?먥븧??訝?(?뺥솕쨌珥쏅텋/?щ튆) ?쇱＜ ?먥븧??  "訝곦툚":{i:"?빉截?,n:"?쇱뼱遺숈? ?ъ옣???④린",sub:"訝곦툚 쨌 ?됱쿋?????④굅??遺덉뵪",d:"寃됱? 李④컩怨?臾대뜡?ㅽ빐 蹂댁씠吏留? ?대㈃ 源딆? 怨녹뿉??爰쇱?吏 ?딅뒗 ?④굅??遺덉뵪媛 ??ㅻⅨ?? 媛먯젙???쒕윭?댁? ?딅뒗 ?ъ빱?섏씠???ㅼ뿉 ?⑥? ?댁젙怨?吏묐뀗??寃곗젙???쒓컙????컻?쒕떎."},
  "訝곩뜱":{i:"?쫳",n:"珥쏅텋 ?꾩쓽 ?섎퉬",sub:"訝곩뜱 쨌 ????留ㅽ샊??,d:"?섎퉬媛 珥쏅텋???대걣由щ벏 ?щ엺?????섍쾶 ?뚯뼱?밴린??臾섑븳 留ㅽ샊??湲곗슫??諛쒖궛?쒕떎. ?먭레?곸씤 留ㅻ젰???꾨땶 ?붿옍???뚮┝?쇰줈 ?곷???留덉쓬???뱀씠硫? ?덉닠??媛먯꽦??泥쒖옱湲됱씠??"},
  "訝곩럼":{i:"?뵦",n:"?곸썝??遺덇퐙",sub:"訝곩럼 쨌 ?덈? 爰쇱?吏 ?딅뒗 吏묐뀗",d:"泥쒓컙쨌吏吏 紐⑤몢 遺? ?쒕쾲 ?먰솕?섎㈃ ?덈? 爰쇱?吏 ?딅뒗 吏묐뀗???붿떊. 紐⑺몴瑜??뺥븯硫?吏?μ씠 ?대젮??硫덉텛吏 ?딆쑝硫? 洹??④굅???댁젙? 二쇰?源뚯? 遺덊??ㅻⅤ寃?留뚮뱺??"},
  "訝곫쑋":{i:"?룼",n:"?④린???깅텋",sub:"訝곫쑋 쨌 移섏쑀??鍮?,d:"??뿬由?諛?湲몄쓣 諛앺엳???곕쑜???깅텋泥섎읆 二쇰? ?щ엺?ㅼ쓽 留덉쓬???곕쑜?섍쾶 媛먯떥???먮쭅 ?ㅻ씪媛 ?곸떆 諛쒕룞?쒕떎. 怨곸뿉 ?덉쑝硫??댁쑀 ?놁씠 ?몄븞?댁???移섏쑀 ?λ젰??"},
  "訝곲뀎":{i:"?쫭",n:"?덉쓽 ?먮쫫??蹂대뒗 留ㅼ쓽 ??,sub:"訝곲뀎 쨌 ?щЪ ?ъ떆??,d:"珥쏅텋??蹂댁꽍??鍮꾩텛硫??④꺼吏?洹좎뿴源뚯? 蹂댁씠?? ?덇낵 ?щЪ???먮쫫??轅곕슟?대낫??鍮꾨쾾???ъ떆?μ씠 諛쒕룞?쒕떎! ?대뵒???ъ옄?댁빞 ?섎뒗吏, ?몄젣 鍮좎졇???섎뒗吏 蹂몃뒫?곸쑝濡?媛먯??섎뒗 ?ы뀒??泥쒖옱."},
  "訝곦벤":{i:"?뙆",n:"?덇컻 ?띿쓽 湲몄옟??,sub:"訝곦벤 쨌 ?대몺??諛앺엳???덈궡??,d:"珥덇꺼??吏숈? ?덇컻 ?띿뿉???濡?鍮쏅굹??珥쏅텋! 紐⑤몢媛 湲몄쓣 ?껉퀬 ?ㅻ㎚ ???좎씪?섍쾶 諛⑺뼢???쒖떆?섎뒗 吏?쒖쓽 ?덈궡?? 移댁삤???곹솴?먯꽌 諛쒕룞?섎뒗 ?꾧린?섑샇 ?λ젰???곸썡?섎떎."},

  // ?먥븧????(臾댄넗쨌???? ?쇱＜ ?먥븧??  "?듿칲":{i:"?룘截?,n:"?곕┝??援곗＜",sub:"?듿칲 쨌 留뚮Ъ??嫄곕뒓由щ뒗 ?쒖솗",d:"???곗뿉 ?몄갹???뀁씠 ?ㅻ뜮???뺤긽! ?먯썝??紐⑥쑝怨??щ엺??嫄곕뒓由щŉ ?곹넗瑜??뺤옣?섎뒗 ?怨좊궃 寃쎌쁺 媛먭컖??DNA???덇꺼???덈떎. 媛留뚰엳 ?덉뼱???щ엺怨?湲고쉶媛 ?뚯븘??紐⑥뿬?좊떎."},
  "?딂쒼":{i:"?뙅",n:"?瑜숈쓽 二쇱씤",sub:"?딂쒼 쨌 留뚮Ъ???덈뒗 ?ъ슜????,d:"媛꾩뿬吏?숈쓽 ????! ?吏 ?꾩뿉 ?吏, ?앹씠 蹂댁씠吏 ?딅뒗 愿묓솢???ъ슜?μ쑝濡?留뚮Ъ???덈뒗?? ?묒? 寃껋뿉 ?붾뱾由ъ? ?딅뒗 臾듭쭅??以묒떖 ?μ븙?μ씠 ?곸떆 諛쒕룞?섎ŉ, 二쇰???媛덈벑源뚯? ?≪닔?대쾭由곕떎."},
  "?듿뜄":{i:"?뙅",n:"?쒗솕??,sub:"?듿뜄 쨌 ??컻 ?湲??곹깭",d:"?됱냼??議곗슜?섍퀬 ?ъ쭅???곗씠吏留뚢??쒕쾲 ?곗?硫??⑹븫???몄긽???ㅻ뜮?붾떎! ?몃궡???쒓퀎瑜??섏쑝硫?諛쒕룞?섎뒗 珥덉젅???뚭눼?? ?붽? ?섎㈃ 媛먮떦 遺덇?, ?섏?留?洹??먮꼫吏媛 怨??깃났???먮룞??"},
  "?딁뵵":{i:"?룿",n:"泥좊꼍 ?붿깉",sub:"?딁뵵 쨌 ?덈? 臾대꼫吏吏 ?딅뒗 諛⑹뼱??,d:"?????꾩뿉 湲덉냽 媛묒샆源뚯? ?낆? ?쒓났遺덈씫???붿깉! 硫섑깉???덈? ?붾뱾由ъ? ?딆쑝硫? ?대뼡 鍮꾨궃쨌?낆옱쨌?꾧린媛 ????쒖젙 ?섎굹 蹂?섏? ?딅뒗 洹밴컯??泥좊꼍 硫섑깉 蹂댁쑀??"},
  "?딀닃":{i:"?썳截?,n:"?吏??寃곌퀎",sub:"?딀닃 쨌 ?섑샇 蹂몃뒫 諛쒕룞",d:"媛꾩뿬吏?숈쓽 ????! ???곸뿭 ?덉뿉 ?ㅼ뼱??寃껋? 諛섎뱶??吏?⑤떎???뺣룄???섑샇 蹂몃뒫. 媛議굿룹“吏겶룰뎅媛 ?⑥쐞濡?蹂댄샇留됱쓣 ?쇱튂硫? 寃곌퀎 ?덉쓽 寃껊뱾? ?대뼡 ?몃? 怨듦꺽???뺢꺼?몃떎."},
  "?듿춴":{i:"?뵰",n:"吏?섏닔留??먯?湲?,sub:"?듿춴 쨌 蹂댁씠吏 ?딅뒗 寃껋쓣 媛먯?",d:"?????꾨옒 ?먮Ⅴ??吏?섏닔泥섎읆 ?덉뿉 蹂댁씠吏 ?딅뒗 湲고쉶? ?꾪뿕??蹂몃뒫?곸쑝濡?媛먯??섎뒗 ??媛먯씠 諛쒕룞?쒕떎. '萸붽? ?댁긽?쒕뜲???쇰뒗 吏곴컧????긽 ?곸쨷?섎뒗 珥덉옄?곗쟻 ?쇱꽌 ?묒옱."},

  // ?먥븧??藥?(湲고넗쨌?꾨떟/鍮꾩삦???? ?쇱＜ ?먥븧??  "藥긴툚":{i:"?꾬툘",n:"?숉넗???⑥븮",sub:"藥긴툚 쨌 理쒓컯???몃궡??,d:"媛??異붿슫 寃⑥슱 ?낆냽???뚮Щ???⑥븮! ?꾨Т???뚯븘二쇱? ?딅뒗 湲?寃⑥슱??寃щ럩?닿퀬 留덉묠??遊꾩뿉 媛???꾨쫫?ㅼ슫 苑껋쓣 ?쇱슫?? ?湲곕쭔?깆쓽 ?앺뙋?뺤씠硫? ?몃궡???ㅽ꺈???곗＜ 理쒓컯."},
  "藥긷뜱":{i:"?뙴",n:"鍮꾩삦???붿썝",sub:"藥긷뜱 쨌 ?ъ? 寃껋? 諛섎뱶???쇱슫??,d:"鍮꾩삦???꾨떟??遊꾧퐙??媛?? ?щ엺?대뱺 ?ъ뾽?대뱺 愿怨꾨뱺, ?쒕쾲 ?ъ? 寃껋? 諛섎뱶??苑껎뵾?곕뒗 ?щ같 ?λ젰??諛쒕룞?쒕떎. 二쇰? ?щ엺???좎옱?μ쓣 ?뚯뼱?щ━???몄옱 ?≪꽦 蹂몃뒫???묒옱."},
  "藥긷럼":{i:"?뤊",n:"?꾩옄湲?媛留?,sub:"藥긷럼 쨌 ?숈쓣 ?덉닠濡?蹂??,d:"??藥?怨?遺?藥???議고솕! 吏洹뱁엳 ?됰쾾???щ즺瑜??몄긽???섎굹肉먯씤 紐낇뭹?쇰줈 蹂?섑븯???곌툑?좎씠 諛쒕룞?쒕떎. ?⑤뱾??踰꾨┛ 寃껋뿉??媛移섎? 諛쒓껄?섍퀬, ?섏갖? 寃껋쓣 洹?섍쾶 留뚮뱶??泥쒖옱."},
  "藥길쑋":{i:"?ㅁ",n:"?대㉧?덉쓽 ?吏",sub:"藥길쑋 쨌 媛꾩뿬吏?숈쓽 臾댄븳 ?ъ슜",d:"泥쒓컙쨌吏吏 紐⑤몢 ????! 臾댄븳???몃궡? ?ъ깮?쇰줈 二쇰? 紐⑤뱺 寃껋쓣 諛쏆븘二쇰뒗 ?대㉧???吏. ?ъ쭅??踰꾪?紐⑹씠 ?쇱＜硫?怨곸뿉 ?덉쑝硫?遺덉븞 寃뚯씠吏媛 0?쇰줈 ?섎졃?쒕떎."},
  "藥깁뀎":{i:"?뵇",n:"?먯꽍 媛먮퀎??,sub:"藥깁뀎 쨌 ?④꺼吏?媛移섎? 轅곕슟??,d:"鍮꾩삦?????띿뿉 臾삵엺 蹂댁꽍??洹?좉컳??李얠븘?대뒗 媛먮퀎 ?λ젰! ?щ엺???④꺼吏??щ뒫, ?ъ뾽???⑥? 湲고쉶, 臾쇨굔??吏꾩쭨 媛移섎? ?⑤쾲??轅곕슟?대낫??'媛移??ъ떆'媛 ?곸떆 諛쒕룞?쒕떎."},
  "藥긴벤":{i:"?뙼",n:"?れ쓽 移섏쑀??,sub:"藥긴벤 쨌 ?곸쿂瑜?媛먯떥?덈뒗 ?ъ슜",d:"?곕쑜???숈씠 李④???臾쇱쓣 ?덈벏, ?곸쿂諛쏆? ?곹샎??媛먯떥?덇퀬 移섏쑀?섎뒗 ?ъ슜???ъ씤. 怨곸뿉 ?덉쑝硫??댁쑀 ?놁씠 留덉쓬???명빐吏硫? ?щ엺?ㅼ씠 ?섎뱾 ??媛??癒쇱? 李얜뒗 ?멸컙 ?덉떇泥?"},

  // ?먥븧??佯?(寃쎄툑쨌??諛붿쐞/嫄곗튇 泥? ?쇱＜ ?먥븧??  "佯싧칲":{i:"?륅툘",n:"媛쒖쿃???꾨겮",sub:"佯싧칲 쨌 誘멸컻泥숈?瑜??щ뒗 ?뚯씠?ㅻ땲??,d:"?⑤떒???좉? ?몄갹???뀁쓣 留뚮굹硫? 湲몄씠 ?녿뒗 怨녹뿉 湲몄쓣 ?대뒗 ?뚯씠?ㅻ땲???뺤떊??諛쒕룞! ?꾨Т??媛吏 ?딆? 湲몄뿉??湲고쉶瑜?李얠쑝硫? ?꾪뿕??臾대쫭?곕뒗 ?꾩쟾?뺤떊???⑤떎瑜대떎."},
  "佯싪쒼":{i:"?맪",n:"?⑹쓽 鍮꾨뒛媛묒샆",sub:"佯싪쒼 쨌 愿닿컯?댁쓽 臾댁쟻 諛⑹뼱留?,d:"愿닿컯??邀곭숯餘?????컻???먮꼫吏! ?대뼡 怨듦꺽???ㅼ뼱????⑹쓽 鍮꾨뒛泥섎읆 ?꾨? ?뺢꺼?대뒗 臾댁쟻??諛⑹뼱留됱씠 諛쒕룞?쒕떎. ?꾧린 ?곹솴?먯꽌留?源⑥뼱?섎뒗 ?좊뱺 ?⑹쓽 湲곗슫??泥대궡???먮Ⅴ怨??덈떎."},
  "佯싧뜄":{i:"?뷂툘",n:"踰쇰젮吏?紐낃?",sub:"佯싧뜄 쨌 遺덉뿉 ?⑤젴??寃",d:"遺??? ?띿뿉???⑤젴??湲덉냽(佯?? 泥쒗븯??紐낃????쒕떎! ?쒕젴怨?怨좊궃??留롮쓣?섎줉 ?붿슧 ?좎뭅濡쒖썙吏???뺤떊?? ?몄깮???섎뱾 ?뚯빞留먮줈 ???λ젰??理쒕? 異쒕젰?쇰줈 媛?숇맂??"},
  "佯싩뵵":{i:"??,n:"媛뺤쿋 ??뭾",sub:"佯싩뵵 쨌 媛꾩뿬吏?숈쓽 ?띾룄??,d:"泥쒓컙쨌吏吏 紐⑤몢 湲???! 寃곗젙???쒓컙 0.1珥덉쓽 留앹꽕?꾨룄 ?녿뒗 踰덇컻 媛숈? ?ㅽ뻾?μ씠 諛쒕룞?쒕떎. '怨좊?? ?ъ튂??媛 泥댄솕???몃Ъ?대ŉ, ?띿쟾?띻껐濡??꾩옣???됱젙?섎뒗 ?꾧킅?앺솕???꾩궗."},
  "佯싨닃":{i:"?뿿",n:"泥좎쓽 ?λ쭑",sub:"佯싨닃 쨌 愿닿컯?댁쓽 遺덇뎬 ?섏?",d:"愿닿컯?댁쓽 ??踰덉㎏ ?뺥깭! ?쒕쾲 ?뺥븳 ?먯튃? ?섎뒛????履??섎룄 ?덈? ?묐낫?섏? ?딅뒗 洹밴컯 怨좎쭛??諛쒕룞?쒕떎. ?좊뀗???꾪빐???몄긽 ?꾩껜???留욎꽌??遺덇뎬???섏?瑜?吏?붾떎."},
  "佯싧춴":{i:"?꾬툘",n:"?됱쿋??移쇰궇",sub:"佯싧춴 쨌 媛먯젙 ?쒕줈??遺꾩꽍??,d:"李④???湲덉냽??寃⑥슱 臾쇱뿉 ?산린硫??몄긽?먯꽌 媛???좎뭅濡쒖슫 移쇰궇???쒕떎! 媛먯젙 媛쒖엯 0%, 洹뱁븳???댁꽦???먮떒?μ씠 諛쒕룞?섎ŉ, 紐⑤뱺 ?곹솴???곗씠?곕줈 遺꾩꽍?섎뒗 ?멸컙 而댄벂??"},

  // ?먥븧??渦?(?좉툑쨌蹂댁꽍/洹湲덉냽) ?쇱＜ ?먥븧??  "渦쎽툚":{i:"?뮔",n:"?먯꽍???몃궡",sub:"渦쎽툚 쨌 ?멸났?섍린源뚯???怨좏넻",d:"?ㅼ씠?꾨が?쒓? ?섎젮硫??섎쭔 湲곗븬???뺣젰??寃щ럩???쒕떎! ?몄긽???먯떊??媛移섎? ?뚯븘二쇨린源뚯???湲??멸퀬???쒓컙??寃щ뵒??洹밴컯 ?몃궡?? 怨좏넻??寃れ쓣?섎줉 蹂댁꽍??鍮쏆씠 諛앹븘吏꾨떎."},
  "渦쎾뜱":{i:"??",n:"?댁뒳???뽰? 移쇰궇",sub:"渦쎾뜱 쨌 ?꾨쫫?ㅼ? ?띿쓽 ?낆꽕",d:"苑??꾩뿉 ?볦씤 移쇰궇泥섎읆 ?꾨쫫?ㅼ슫 ?몃え ?띿뿉 ?④꺼吏??좎뭅濡쒖슫 ?! ?덉걶 ?쇨뎬濡?誘몄냼 吏볥떎媛 ?쒕쭏?붾줈 ?곷???湲됱냼瑜?李뚮Ⅴ???낆꽕 ?ㅽ궗??諛쒕룞?쒕떎. ?? 蹂몄씤? ?꾪? ?낆쓽 ?놁쓬."},
  "渦쎾럼":{i:"?뵦",n:"?⑷킅濡쒖쓽 湲?,sub:"渦쎾럼 쨌 遺덉뿉 ?⑤젴?좎닔濡?鍮쏅굹??,d:"蹂댁꽍??遺??띿뿉 ?ㅼ뼱媛硫?遺덉닚臾쇱씠 ?踰꾨━怨??쒓툑留??⑤뒗?? ?쒕젴怨???꼍???ъ닔濡?蹂몄쭏留??⑥븘 ???쒖닔?섍퀬 媛뺥븯寃?鍮쏅굹???깆옣???λ젰??諛쒕룞?쒕떎."},
  "渦쎿쑋":{i:"?룣截?,n:"?щ쭑???ㅼ씠?꾨が??,sub:"渦쎿쑋 쨌 ??꼍 ?띿뿉??鍮쏅굹??,d:"?꾨Т寃껊룄 ?녿뒗 硫붾쭏瑜??щ쭑?먯꽌 ?濡?鍮쏅굹???ㅼ씠?꾨が?? ?섍꼍??泥숇컯?좎닔濡? ??꼍??嫄곗??섎줉 ?ㅽ엳????李щ??섍쾶 鍮쏅굹????꽕??鍮?諛⑹텧 ?λ젰??諛쒕룞?쒕떎."},
  "渦쏃뀎":{i:"?몣",n:"?덈? 誘멸컧",sub:"渦쏃뀎 쨌 媛꾩뿬吏?숈쓽 ?щ???,d:"泥쒓컙쨌吏吏 紐⑤몢 湲???! ?덉닠??媛먭컖怨??щ??덉씠 ?멸컙 ?쒓퀎瑜??섏뼱??洹뱁븳??誘몄쟻 泥쒖옱. '?꾨쫫?듭? ?딆? 寃껋? 議댁옱??媛移섍? ?녿떎'??泥좏븰??泥대궡?먯꽌 ?곸떆 媛?숇맂??"},
  "渦쎽벤":{i:"?뙄",n:"?ы빐??吏꾩＜",sub:"渦쎽벤 쨌 源딆? 怨녹쓽 鍮쏅굹??吏??,d:"諛붾떎 源딆? 怨녹뿉???濡?鍮쏅굹??吏꾩＜泥섎읆, 議곗슜???대㈃??媛轅???쇱슫 吏?쒖? ?듭같??異뺤쟻?섎뒗 ?λ젰??諛쒕룞?쒕떎. 留먯씠 ?곸?留??쒕쭏?붽? 泥쒓툑??媛移섎? 吏??移⑤У???꾩옄."},

  // ?먥븧??鶯?(?꾩닔쨌諛붾떎/??? ?쇱＜ ?먥븧??  "鶯у칲":{i:"?㎛",n:"??빐???섏묠諛?,sub:"鶯у칲 쨌 誘몄???諛붾떎瑜??먰뿕?섎떎",d:"嫄곕???諛붾떎媛 遊꾨굹臾대? 留뚮굹 ?덈줈???瑜숈쓣 ?ν빐 ??빐瑜??쒖옉?쒕떎! 誘몄????곸뿭??????먮젮????쒕줈?대ŉ, 紐⑦뿕怨??꾩쟾?먯꽌 苡뚭컧???먮겮???怨좊궃 ?먰뿕媛 蹂몃뒫??諛쒕룞?쒕떎."},
  "鶯ц쒼":{i:"?뙄",n:"?곕굹誘?,sub:"鶯ц쒼 쨌 愿닿컯?댁쓽 ?뚭눼??異붿쭊??,d:"愿닿컯?댁쓽 諛붾떎 踰꾩쟾! ?쒕쾲 ?吏곸씠湲곕줈 寃곗떖?섎㈃ ?댁씪泥섎읆 紐⑤뱺 寃껋쓣 ?⑹벝?대쾭由щ뒗 ?뚭눼??異붿쭊?μ씠 諛쒕룞?쒕떎. ?됱냼???붿옍???몄닔吏留? 媛곸꽦?섎㈃ ?몄긽???ㅽ쓷?쒕뒗 ??ъ븰湲??먮꼫吏."},
  "鶯у뜄":{i:"?쉨",n:"利앷린 湲곌?",sub:"鶯у뜄 쨌 臾?遺덉쓽 臾댄븳 ?숇젰",d:"臾?鶯?怨?遺?????留뚮굹硫?利앷린媛 ?쒕떎! ?곷컲???먮꼫吏????컻??蹂?섏쑝濡?臾댄븳 ?숇젰???앹꽦?섎뒗 ?λ젰??諛쒕룞. ?⑤뱾??吏移??뚮룄 ?쇱옄 ?щ━??臾댄븳 泥대젰怨??뺤떊?μ쓽 ?뚯쑀??"},
  "鶯х뵵":{i:"?뙄",n:"泥?！??룷",sub:"鶯х뵵 쨌 ?믪? 怨녹뿉???잛븘吏??臾?,d:"?믪? ?덈꼍?먯꽌 ?잛븘吏????룷?섏쿂??留됲옒???녿뒗 ?ㅽ뻾?? 寃곗젙?섎㈃ 0.5珥??덉뿉 ?됰룞?쇰줈 ??린硫? 以묎컙??諛⑺빐臾쇱씠 ?섑??섎㈃ ?뚯븘媛??寃??꾨땲??遺?섍퀬 吏곸쭊?쒕떎."},
  "鶯ф닃":{i:"?룥截?,n:"?먯쓽 ???,sub:"鶯ф닃 쨌 愿닿컯?댁쓽 ?먮꼫吏 異뺤쟻",d:"愿닿컯?댁쓽 泥쒓린媛 踰꾩쟾! 嫄곕????먯쿂???먮꼫吏瑜??앹뾾??異뺤쟻?덈떎媛 理쒖쟻????대컢???섎Ц???댁뼱 ??컻?쒗궎??泥쒓린???λ젰. 以鍮꾨맂 ??諛⑹씠 ?몄긽??諛붽씀??寃곗젙?媛 ?쒕떎."},
  "鶯у춴":{i:"?릩",n:"?ы빐???쒖솗",sub:"鶯у춴 쨌 媛꾩뿬吏?숈쓽 臾댄븳 ?ъ뿰",d:"泥쒓컙쨌吏吏 紐⑤몢 ??麗?! 源딆씠瑜??????녿뒗 ?뺣룄???대㈃ ?멸퀎瑜?蹂댁쑀???ы빐??吏諛곗옄. ?띾쭏?뚯쓣 ?덈? ?쒕윭?댁? ?딆쑝硫? 洹?誘몄뒪?곕━?⑥씠 ?ㅽ엳???щ엺???뚯뼱?밴린??釉붾옓????쒕떎."},

  // ?먥븧????(怨꾩닔쨌?댁뒳鍮??밸떖?? ?쇱＜ ?먥븧??  "?멧툚":{i:"?쭒",n:"?쇱쓬 ?꾨옒 ?먮Ⅴ??臾?,sub:"?멧툚 쨌 ?뺤쟻 ?띿쓽 ??룞",d:"寃됱? ?꾩쟾???쇱뼱遺숈뼱 誘몃룞???놁?留? ?쇱쓬 ?꾨옒?먯꽌???딆엫?놁씠 臾쇱씠 ?먮Ⅴ怨??덈떎! ?쒖젙? 臾????몃뜲 癒몃┸?띿? ?덊띁而댄벂?곌? ?뚯븘媛???ㅽ뀛???먮뇤 媛???λ젰."},
  "?멨뜱":{i:"?뙢截?,n:"遊꾨퉬??異뺣났",sub:"?멨뜱 쨌 二쇰????깆옣?쒗궎??鍮쀫Ъ",d:"?곗뒪??遊꾨퉬媛 苑껊강???곸떆??二쇰? ?щ엺 紐⑤몢???깆옣??珥됱쭊?섎뒗 ?먯뼇遺?怨듦툒 ?λ젰! ?놁뿉 ?덉쑝硫??좎? 紐⑤Ⅴ寃??먭린怨꾨컻 ?섏슃???잕뎄移섎ŉ, ?몄옱瑜??ㅼ슦??泥쒖옱 硫섑넗."},
  "?멨럼":{i:"?뙂",n:"臾댁?媛??앹꽦湲?,sub:"?멨럼 쨌 臾쇨낵 鍮쏆쓽 援먯감??,d:"臾???怨?遺?藥???援먯감?섎㈃ 臾댁?媛쒓? ?꾩깮?쒕떎! ?곷컲??寃껊뱾??議고빀???꾨Т???덉긽 紐????섏긽?곸씤 ?꾩씠?붿뼱瑜?李쎌텧?섎뒗 ?λ젰??諛쒕룞. 諛쒖긽???꾪솚???쇱긽??李쎌쓽????＜??"},
  "?멩쑋":{i:"?룤截?,n:"?щ쭑???ㅼ븘?쒖뒪",sub:"?멩쑋 쨌 洹뱁븳 ?섍꼍 ?곸쓳??,d:"?④쾪怨?硫붾쭏瑜??щ쭑 ?쒕났?먯뿉?쒕룄 ?댁븘?⑤뒗 洹뱁븳???곸쓳 ?λ젰! ?대뼡 ?댁븙???섍꼍???섏졇?몃룄 臾???紐④툑?쇰줈 ?댁븘?⑥쑝硫? ?꾧린瑜??덉떇泥섎줈 諛붽씀???쒕컮?대쾶 泥쒖옱."},
  "?면뀎":{i:"?뵮",n:"?댁뒳???뚯쫰",sub:"?면뀎 쨌 吏꾩떎???뺣??섎뒗 臾쇰갑??,d:"?댁뒳諛⑹슱???뚯쫰媛 ?섏뼱 蹂댁씠吏 ?딅뒗 吏꾩떎源뚯? ?뺣???蹂댁뿬二쇰뒗 ?듭같?? ????쒕쭏?? ?쒖젙 ?섎굹?먯꽌 ?곷?諛⑹쓽 吏꾩쭨 ?띾쭏?뚯쓣 ?쎌뼱?대뒗 ?멸컙 嫄곗쭞留??먯?湲??λ젰??諛쒕룞."},
  "?멧벤":{i:"?억툘",n:"臾댄븳???섏썝",sub:"?멧벤 쨌 媛꾩뿬吏?숈쓽 臾댄븳 ?곴컧",d:"泥쒓컙쨌吏吏 紐⑤몢 ??麗?! 留덈Ⅴ吏 ?딅뒗 ?곸썝???곴컧???먯쿇??蹂댁쑀??李쎌“?μ쓽 ?붿떊. ?꾩씠?붿뼱媛 ?딆엫?놁씠 ?섏넖?쇰ŉ, ?섎굹???앷컖?먯꽌 ?섏쿇 媛吏 媛?μ꽦???뚯깮?섎뒗 臾댄븳 ?ш퀬 泥닿퀎."}
};

/* ??? ?몄깮 ?ㅽ궗 ?몃━ RPG ??? */
function _buildHeroSVG(elColor){
  var c={wood:'#4CAF50',fire:'#FF5722',earth:'#8D6E63',metal:'#78909C',water:'#1E88E5'}[elColor]||'#7B1FA2';
  var c2={wood:'#81C784',fire:'#FF8A65',earth:'#BCAAA4',metal:'#B0BEC5',water:'#64B5F6'}[elColor]||'#CE93D8';
  var c3={wood:'#2E7D32',fire:'#BF360C',earth:'#4E342E',metal:'#37474F',water:'#0D47A1'}[elColor]||'#4A148C';
  return '<div class="sk-hero-wrap">'
    +'<div class="sk-hero-glow" style="background:'+c+'"></div>'
    +'<svg class="sk-hero-svg" viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">'

    /* ?? 諛붾떏 洹몃┝???? */
    +'<ellipse cx="30" cy="76" rx="16" ry="3" fill="rgba(0,0,0,.15)"/>'

    /* ?? 諛⑺뙣 (?쇱そ, ?룸젅?댁뼱) ?? */
    +'<ellipse cx="8" cy="46" rx="7" ry="8.5" fill="'+c3+'"/>'
    +'<ellipse cx="8" cy="46" rx="5.5" ry="7" fill="'+c2+'"/>'
    +'<polygon points="8,40 11.5,46 8,52 4.5,46" fill="#FFD700" opacity=".7"/>'
    +'<circle cx="8" cy="46" r="1.5" fill="#FFD700"/>'

    /* ?? ?쇳뙏 ?? */
    +'<rect x="11" y="40" width="9" height="6" rx="3" fill="#FFD596"/>'

    /* ?? 寃 (?ㅻⅨ履? ?룸젅?댁뼱) ?? */
    +'<rect x="49" y="8" width="4" height="30" rx="2" fill="#B0BEC5"/>'
    +'<rect x="49" y="8" width="2" height="30" rx="1" fill="#E0E0E0" opacity=".5"/>'
    +'<rect x="46" y="36" width="10" height="3" rx="1.5" fill="#FFD700"/>'
    +'<rect x="50" y="39" width="2" height="5" rx="1" fill="#8D6E63"/>'
    +'<ellipse cx="51" cy="7" rx="2.5" ry="2" fill="'+c2+'"/>'
    +'<circle cx="55" cy="5" r="1.5" fill="#FFD700" opacity=".8"/>'
    +'<circle cx="48" cy="3" r="1" fill="#fff" opacity=".6"/>'
    +'<circle cx="57" cy="11" r="1" fill="'+c2+'" opacity=".6"/>'

    /* ?? ?ㅻⅨ??+ ???? */
    +'<rect x="42" y="40" width="9" height="6" rx="3" fill="#FFD596"/>'
    +'<circle cx="50" cy="42" r="3" fill="#FFD596"/>'

    /* ?? ?ㅻ━ ?? */
    +'<rect x="22" y="56" width="8" height="12" rx="3" fill="'+c3+'"/>'
    +'<rect x="32" y="56" width="8" height="12" rx="3" fill="'+c3+'"/>'

    /* ?? 遺痢??? */
    +'<rect x="20" y="66" width="11" height="7" rx="3.5" fill="#4E342E"/>'
    +'<rect x="31" y="66" width="11" height="7" rx="3.5" fill="#4E342E"/>'
    +'<rect x="20" y="66" width="11" height="2.5" rx="1" fill="#6D4C41"/>'
    +'<rect x="31" y="66" width="11" height="2.5" rx="1" fill="#6D4C41"/>'

    /* ?? 紐명넻 (?쒕땳) ?? */
    +'<rect x="18" y="34" width="26" height="24" rx="4" fill="'+c+'"/>'
    +'<polygon points="31,37 35,48 27,48" fill="'+c2+'" opacity=".45"/>'
    +'<rect x="25" y="34" width="12" height="3" rx="1.5" fill="'+c2+'"/>'
    +'<rect x="17" y="54" width="28" height="4" rx="2" fill="#5D4037"/>'
    +'<rect x="28" y="54" width="6" height="4" fill="#FFD700"/>'

    /* ?? 紐??? */
    +'<rect x="27" y="31" width="8" height="5" rx="2" fill="#FFD596"/>'

    /* ?? 癒몃━移대씫 (紐⑥옄 ?꾨옒) ?? */
    +'<ellipse cx="31" cy="14" rx="12" ry="5" fill="'+c+'"/>'

    /* ?? ?쇨뎬 ?? */
    +'<ellipse cx="31" cy="20" rx="12" ry="12" fill="#FFD596"/>'

    /* ?? ?섑봽 洹 ?? */
    +'<polygon points="17,19 10,14 18,24" fill="#FFD596"/>'
    +'<polygon points="45,19 52,14 44,24" fill="#FFD596"/>'
    +'<line x1="13" y1="16" x2="18" y2="22" stroke="#FFCC80" stroke-width=".7" opacity=".6"/>'
    +'<line x1="49" y1="16" x2="44" y2="22" stroke="#FFCC80" stroke-width=".7" opacity=".6"/>'

    /* ?? 紐⑥옄 (?ㅻ떎 ?ㅽ???毓곗” 罹? ?? */
    +'<polygon points="19,14 31,1 43,14" fill="'+c+'"/>'
    +'<polygon points="31,1 29,3 19,14 21,14" fill="'+c2+'" opacity=".3"/>'
    +'<polygon points="19,14 13,6 7,10 15,15" fill="'+c+'"/>'
    +'<circle cx="7" cy="10" r="2.5" fill="'+c2+'"/>'
    +'<rect x="18" y="13" width="26" height="3" rx="1.5" fill="'+c2+'"/>'

    /* ?? ??(而ㅻ떎? 移섎퉬 ?? ?? */
    +'<ellipse cx="25" cy="20" rx="3.5" ry="4" fill="#1A237E"/>'
    +'<ellipse cx="37" cy="20" rx="3.5" ry="4" fill="#1A237E"/>'
    +'<circle cx="24" cy="19" r="1.5" fill="#fff"/>'
    +'<circle cx="36" cy="19" r="1.5" fill="#fff"/>'
    +'<circle cx="26" cy="21" r=".7" fill="rgba(255,255,255,.4)"/>'
    +'<circle cx="38" cy="21" r=".7" fill="rgba(255,255,255,.4)"/>'

    /* ?? ?덉뜾 ?? */
    +'<rect x="22" y="15" width="7" height="1.2" rx=".6" fill="#333" opacity=".6"/>'
    +'<rect x="34" y="15" width="7" height="1.2" rx=".6" fill="#333" opacity=".6"/>'

    /* ?? 肄??? */
    +'<ellipse cx="31" cy="23" rx="1" ry=".7" fill="rgba(0,0,0,.08)"/>'

    /* ?? 誘몄냼 ?? */
    +'<path d="M27,26 Q31,29 35,26" stroke="rgba(0,0,0,.18)" stroke-width="1" fill="none" stroke-linecap="round"/>'

    /* ?? 蹂쇳꽣移??? */
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
    if(t&&t!=='?'&&t!=='?쇨컙')tsCnt[t]=(tsCnt[t]||0)+1;
  });
  var grp={
    bija:(tsCnt['鍮꾧껄']||0)+(tsCnt['寃곸옱']||0),
    sik:(tsCnt['?앹떊']||0)+(tsCnt['?곴?']||0),
    jae:(tsCnt['?몄옱']||0)+(tsCnt['?뺤옱']||0),
    gwan:(tsCnt['?멸?']||0)+(tsCnt['?뺢?']||0),
    inp:(tsCnt['?몄씤']||0)+(tsCnt['?뺤씤']||0)
  };
  var topGrp='bija',topVal=0;
  for(var gk in grp){if(grp[gk]>topVal){topVal=grp[gk];topGrp=gk;}}
  var clsMap={
    '??:{base:'遊꾩쓽 媛쒖쿃??,emoji:'?뿠截?},
    '阿?:{base:'諛붾엺???먰뿕媛',emoji:'?뤉'},
    '訝?:{base:'?쒖뼇??留덈쾿??,emoji:'?뵦'},
    '訝?:{base:'遺덇퐙??移섏쑀??,emoji:'??},
    '??:{base:'?吏???뚯닔袁?,emoji:'?썳截?},
    '藥?:{base:'?낆쓽 ?곌툑?좎궗',emoji:'?쀯툘'},
    '佯?:{base:'媛뺤쿋??湲곗궗',emoji:'?뷂툘'},
    '渦?:{base:'?섏젙???붿궡??,emoji:'?뵰'},
    '鶯?:{base:'?ы빐???꾩옄',emoji:'?뙄'},
    '??:{base:'?덇컻???좉?',emoji:'?뙔'}
  };
  var sufMap={bija:'?낅┰ ?곸썒',sik:'李쎌“ 留덉뿉?ㅽ듃濡?,jae:'?⑷툑 援곗＜',gwan:'洹쒖쑉??吏諛곗옄',inp:'?꾨????꾩옄'};
  var cls=clsMap[dg]||{base:'?좊퉬??紐⑦뿕媛',emoji:'??};
  var coreClass=cls.emoji+' '+cls.base+' / '+sufMap[topGrp];
  var lv=Math.min(99,Math.max(1,CURRENT_AGE-1));
  var expPct=(lv%10)*10;
  var elColor={wood:'#4CAF50',fire:'#FF5722',earth:'#A1887F',metal:'#78909C',water:'#1E88E5'};
  var elIcon={wood:'?뙼',fire:'?뵦',earth:'?곤툘',metal:'?뷂툘',water:'?뮛'};
  var elName={wood:'李쎌쓽??,fire:'移대━?ㅻ쭏',earth:'?덉젙??,metal:'寃곕떒??,water:'吏곴???};
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
    bija:{m:{i:'?뷂툘',n:'?먯븘 寃곗쭛',d:'?濡쒖꽌湲곗쓽 ?꾪닾 湲곗닠. ?낅┰ ?섏?? 寃쎌웳 ?먮꼫吏瑜?洹뱁븳?쇰줈 ?뚯뼱?щ┛??',tp:'ACTIVE'},o:{i:'?썳截?,n:'?먯븘?뚮났',d:'?곕윭?몃룄 ?ㅼ떆 ?쇱뼱?쒕뒗 ?덉쭏湲??앸챸???⑥떆釉?'}},
    sik:{m:{i:'?렓',n:'?쒗쁽???곌툑??,d:'?꾩씠?붿뼱瑜??⑷툑?쇰줈 蹂?섑븯??李쎌“ 留덈쾿. 留먃룰?쨌?덉닠??理쒓컯 臾닿린媛 ?쒕떎.',tp:'ACTIVE'},o:{i:'?뮕',n:'李쎌“????컻',d:'?앹긽 ?먮꼫吏媛 ?뺤젏???ы븷 ????컻???곸떊???곗쭊??'}},
    jae:{m:{i:'?뮥',n:'?⑷툑????,d:'?ъ썝???뚯뼱?밴린怨?湲고쉶瑜??꾧툑?뷀븯???덈? ?ㅽ궗. ??대컢???앸챸.',tp:'ACTIVE'},o:{i:'?뱢',n:'?먯썝 ?뺣젹',d:'媛吏?寃껋쓣 理쒕?濡?伊먯뼱吏쒕뒗 ?⑥쑉 洹밸????⑥떆釉?'}},
    gwan:{m:{i:'?몣',n:'?덈? 洹쒖쑉',d:'議곗쭅???듭넄?섍퀬 吏덉꽌瑜??몄슦??吏諛곗옄??沅뚮뒫. 移대━?ㅻ쭏 +100.',tp:'ACTIVE'},o:{i:'?뙚',n:'吏諛곗옄???ㅻ씪',d:'議댁옱 ?먯껜濡??좊ː? 沅뚯쐞瑜?諛쒖궛?섎뒗 ?곸떆 諛쒕룞 ?⑥떆釉?'}},
    inp:{m:{i:'?뱴',n:'吏?쒖쓽 寃곗젙',d:'源딆? ?ъ쑀? ?듭같濡?蹂몄쭏??轅곕슟???롮쓽 沅뚮뒫. 寃쏀뿕移?2諛??띾뱷.',tp:'ACTIVE'},o:{i:'?뮟',n:'?앸챸???뚮났',d:'?몄꽦 湲곗슫??紐멸낵 留덉쓬???딆엫?놁씠 ?ъ땐?꾪븯???뚮났 ?ㅽ궗.'}}
  };
  var lockedDB={
    bija:{i:'?뵏',n:'?숇즺 寃곗쭛',d:'鍮꾧쾪 ?쏀븿 ????멸낵 ?묐젰?섎뒗 ???좉?. 移쒓뎄쨌?숇즺 ?ㅽ듃?뚰겕 援ъ텞???닿툑 ??'},
    sik:{i:'?뵏',n:'?쒗쁽???곌툑??,d:'?앹긽 ?쏀븿 ???먭린?쒗쁽쨌李쎌쓽???좉?. 留먰븯湲걔룰??곌린쨌?덉닠 ?ъ옄濡??닿툑 媛??'},
    jae:{i:'?뵏',n:'?⑷툑????,d:'?ъ꽦 ?쏀븿 ???щЪ ?ㅽ궗 ?좉?. ?щТ 吏?씲룻닾??怨듬?濡??닿툑 媛??'},
    gwan:{i:'?뵏',n:'?ы쉶??諛⑺뙣',d:'愿???쏀븿 ??議곗쭅쨌洹쒖쑉 ?ㅽ궗 ?좉?. 梨낆엫媛먃룹빟??吏?ㅺ린濡??닿툑 媛??'},
    inp:{i:'?뵏',n:'吏?쒖쓽 湲곕줉',d:'?몄꽦 ?쏀븿 ???숈뒿쨌?섏슜 ?ㅽ궗 ?좉?. 袁몄????낆꽌? 怨듬?媛 ?닿툑???댁뇿.'}
  };
  var masterSk=skillDB[topGrp].m;
  var ownedHtml='';
  for(var gok in grp){
    if(gok!==topGrp&&grp[gok]>=1){
      var osk=skillDB[gok].o;
      ownedHtml+='<div class="sk-item sk-owned"><span class="sk-icon">'+osk.i+'</span><div><div class="sk-name">'+osk.n+'</div><div class="sk-desc">'+osk.d+'</div></div></div>';
    }
  }
  if(!ownedHtml)ownedHtml='<div style="font-size:.75rem;color:rgba(255,255,255,.3);padding:6px 0">異붽? 蹂댁쑀 ?ㅽ궗 ?놁쓬</div>';
  var lockedHtml='';
  for(var glk in grp){
    if(grp[glk]===0){
      var lsk=lockedDB[glk];
      lockedHtml+='<div class="sk-item sk-locked"><span class="sk-icon">?뵏</span><div><div class="sk-name">'+lsk.n+' <span style="font-size:.62rem;color:rgba(255,255,255,.3);font-weight:400">[?좉?]</span></div><div class="sk-desc">'+lsk.d+'</div></div></div>';
    }
  }
  if(!lockedHtml)lockedHtml='<div style="font-size:.75rem;color:rgba(255,255,255,.3);padding:6px 0">?좉릿 ?ㅽ궗 ?놁쓬 ?럦</div>';
  var yongshinList=(pw&&pw.yongshin)||[];
  var isSeGood=yongshinList.indexOf('fire')>=0||(jg&&jg.isJong&&jg.dominant==='fire');
  var levelUpText=isSeGood
    ?'2026??<b>訝쇿뜄 ?몄슫</b>? ?뱀떊???⑹떊??<b>????</b> 湲곗슫??媛뺥븯寃?吏?먰븳?? ?대쾲 ?대뒗 <span class="sk-hl">?곴레 ?됰룞 ?쒖쫵</span> ??<b>'+masterSk.n+'</b> ?ㅽ궗??理쒕? ?쒖슜???ы쉶???꾩쟾쨌?ъ옄쨌?꾩쭊??媛먰뻾?섎씪. ?댁씠 ?깆쓣 諛?댁쨪 ??諛?댁빞 ?덈꺼?낆씠 ?쒕떎.'
    :'2026??<b>訝쇿뜄 ?몄슫</b>????湲곗슫???뱀떊 ?ъ＜ 援ъ“??遺?댁쓣 以?? 臾대━???뺤옣蹂대떎 <span class="sk-hl">?좉릿 ?ㅽ궗 ?닿툑 吏묒쨷</span>??泥쒓린媛?? ?댁떎???ㅼ?硫?寃쏀뿕移섎? ?볦븘?먮㈃ 2027???댄썑 ??컻???깆옣??媛?ν븯??';
  var heroSVG=_buildHeroSVG(dayEl);
  // ??? ?쇱＜ 怨좎쑀?λ젰 (INNATE ABILITY) 議고쉶 ???
  var iljuKey=p.d.g+p.d.j;
  var innateData=ILJU_INNATE_DB[iljuKey];
  var innateHtml='';
  if(innateData){
    innateHtml='<div class="sk-innate-section">'
      +'<div class="sk-innate-label">?㎚ INNATE ABILITY ???쇱＜ 怨좎쑀?λ젰</div>'
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
    +'<div class="sk-game-badge">??SAJU RPG SYSTEM</div>'
    +'<div class="sk-main-title">?몄깮 ?ㅽ궗 ?몃━</div>'
    +'<div class="sk-sub-title">?뗥뫝 SKILL TREE 쨌 ?ъ＜ 湲곕컲 罹먮┃???쒗듃</div>'
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
    +'<div class="sk-exp-label">EXP '+expPct+' / 100 &nbsp;??nbsp; LV.'+(lv+1)+'</div>'
    +'</div>'
    +'<div class="sk-day-badge">?쇨컙: <b>'+dg+'</b> ('+((GAN[dg]||{}).n||'')+') &nbsp;쨌&nbsp; '+(pw&&pw.isStrong?'燧놅툘 ?좉컯':'燧뉛툘 ?좎빟')+(jg&&jg.isJong?' &nbsp;쨌&nbsp; ?? 醫낃꺽':'')+'</div>'
    +'</div>'
    +'<div>'
    +'<div class="sk-stat-title">?뱤 ?ㅽ뻾 ?ㅽ꺈</div>'
    +statBars
    +'</div>'
    +'</div>'
    +innateHtml
    +'<div class="sk-tree-wrap">'
    +'<div class="sk-tree-section">'
    +'<div class="sk-tree-label">狩?MASTER SKILL</div>'
    +'<div class="sk-item sk-master"><span class="sk-icon">'+masterSk.i+'</span><div><div class="sk-name">'+masterSk.n+' <span class="sk-type-badge">'+(masterSk.tp||'ACTIVE')+'</span></div><div class="sk-desc">'+masterSk.d+'</div></div></div>'
    +'</div>'
    +'<div class="sk-tree-section">'
    +'<div class="sk-tree-label">??OWNED SKILLS</div>'
    +ownedHtml
    +'</div>'
    +'<div class="sk-tree-section">'
    +'<div class="sk-tree-label">?뵏 LOCKED SKILLS</div>'
    +lockedHtml
    +'</div>'
    +'</div>'
    +'<div class="sk-levelup">'
    +'<div class="sk-levelup-title">?렞 2026 ?덈꺼??泥쒓린 (訝쇿뜄 ?몄슫 湲곗?)</div>'
    +'<div class="sk-levelup-text">'+levelUpText+'</div>'
    +'</div>'
    +'</div>';
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   AstroEngine ??Jean Meeus "Astronomical Algorithms" 2nd Ed. 湲곕컲
   ?쒖뼇 ?뺥솗????.01째  ????.3째  ?됱꽦 ??.5??째
   ?T 蹂댁젙(Terrestrial Time) + Placidus ?섏슦??+ ??뻾 ?먮퀎 ?ы븿
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
var AstroEngine = (function(){
  var R2D=180/Math.PI, D2R=Math.PI/180;
  function rev(x){return x-Math.floor(x/360)*360;}

  /* ?? 以꾨━?덈젰 (JD) ?? */
  function JD(Y,M,D,ut){
    if(M<=2){Y--;M+=12;}
    var A=Math.floor(Y/100),B=2-A+Math.floor(A/4);
    return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+D+ut/24+B-1524.5;
  }

  /* ?? Delta T (?T) ?ㅽ빆?? ?ㅼ감 <1珥?(1800??050) ?? */
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

  /* ?? ?⑸룄 寃쎌궗媛?琯 (?λ룞 ?ы븿, ?뺥솗??0.001째) ?? */
  function obliquity(T){
    var eps0=23+26/60+21.448/3600-(46.8150/3600)*T-(0.00059/3600)*T*T+(0.001813/3600)*T*T*T;
    var omega=rev(125.04452-1934.136261*T);
    return eps0+0.00256*Math.cos(omega*D2R);
  }

  /* ?? ?쒖뼇 ?⑷꼍 (VSOP87 媛꾨왂, ?뺥솗??0.01째) ?? */
  function sunLon(jdTT){
    var T=(jdTT-2451545.0)/36525, T2=T*T;
    var L0=rev(280.46646+36000.76983*T+0.0003032*T2);
    var M=rev(357.52911+35999.05029*T-0.0001537*T2), Mr=M*D2R;
    var C=(1.914602-0.004817*T-0.000014*T2)*Math.sin(Mr)
         +(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
    var omega=rev(125.04-1934.136*T);
    return rev(L0+C-0.00569-0.00478*Math.sin(omega*D2R));
  }

  /* ?? ???⑷꼍 (Jean Meeus Ch.47 18-term, ?뺥솗??0.3째) ?? */
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

  /* ?? 耳?뚮윭 諛⑹젙?????(諛섎났踰? ?섎졃 <6?? ?? */
  function kepler(M,e){
    var Mr=rev(M)*D2R, E=Mr;
    for(var i=0;i<50;i++){var dE=(Mr-E+e*Math.sin(E))/(1-e*Math.cos(E));E+=dE;if(Math.abs(dE)<1e-12)break;}
    return 2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),Math.sqrt(1-e)*Math.cos(E/2))*R2D;
  }

  /* ?? ?됱꽦 ?⑷꼍 (?沅ㅻ룄 ?붿냼 + 吏援ъ쨷??蹂?? ?섎뱶肄붾뵫 ?놁씠 怨꾩궛) ?? */
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

  /* ?? 洹몃━?덉튂 ??꽦????吏諛???꽦????RAMC (degrees) ?? */
  function localSidereal(jdUT,lon){
    var T=(jdUT-2451545.0)/36525;
    var GMST=280.46061837+360.98564736629*(jdUT-2451545.0)+0.000387933*T*T-T*T*T/38710000;
    return rev(GMST+lon);
  }

  /* ?? Placidus ?섏슦??而ㅼ뒪???? */
  function placidusHouses(ramc,lat,eps){
    var ramcR=ramc*D2R, latR=lat*D2R, epsR=eps*D2R;
    // MC: tan(MC)=tan(RAMC)/cos(琯)
    var MC=rev(Math.atan2(Math.tan(ramcR),Math.cos(epsR))*R2D);
    if(Math.cos(ramcR)<0) MC=rev(MC+180);
    // ASC: 援щ㈃?쇨컖踰?(?뺣? 援먯젙 - Meeus ?щ텇硫?蹂댁젙)
    var y = Math.cos(ramcR);
    var x = -Math.sin(ramcR)*Math.cos(epsR) - Math.tan(latR)*Math.sin(epsR);
    var ASC = rev(Math.atan2(y, x)*R2D);
    // 怨좎쐞???대갚 (|lat|??5째)
    if(Math.abs(lat)>=65) ASC=rev(MC+90);
    // 11/12 而ㅼ뒪??諛섎났踰?(Placidus)
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

  /* ?? ?⑷꼍 ??蹂꾩옄由?蹂???? */
  var SIGNS=['?묒옄由???','?⑹냼?먮━(??','?띾뫁?댁옄由???','寃뚯옄由???','?ъ옄?먮━(??','泥섎??먮━(??','泥쒖묶?먮━(??','?꾧컝?먮━(??','?ъ닔?먮━(??','?쇱냼?먮━(??','臾쇰퀝?먮━(??','臾쇨퀬湲곗옄由???'];
  function toSign(lon){
    lon=rev(lon);
    var idx=Math.floor(lon/30);
    var degWhole = Math.floor(lon % 30);
    // Add tiny epsilon to prevent 9째09' being rendered as 9째08' from floating-point drift.
    var minWhole = Math.floor((((lon % 30) - degWhole) * 60) + 1e-9);
    var display = SIGNS[idx] + ' ' + degWhole + '째 ' + minWhole + '\'';
    return { sign: display, _baseSign: SIGNS[idx], idx: Math.min(idx, 11), deg: (lon % 30) };
  }

  /* ?? 硫붿씤 怨꾩궛 ?? */
  function calcAll(year,mon,day,localHour,lat,lon,tzOff){
    // UTC = ?쒖???湲곗? ?꾩? ?쒓컖 - ?쒖????ㅽ봽??    var utc=localHour-tzOff;
    var Y=year,M=mon,D=day;
    // ?좎쭨 寃쎄퀎 泥섎━
    if(utc<0){utc+=24;D--;if(D<1){M--;if(M<1){M=12;Y--;}var dp=[0,31,(Y%4===0&&(Y%100!==0||Y%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];D=dp[M];}}
    if(utc>=24){utc-=24;D++;}

    // 寃쎈룄 湲곕컲 吏諛⑹떆 蹂댁젙 (?쒖??먯삤???鍮? ???섏슦??LST 寃利앹슜
    var stdLon = (tzOff || 0) * 15;
    var lonCorrMin = (lon - stdLon) * 4; // 1??= 4遺?    var utcLmt = utc + lonCorrMin / 60;
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
    // 寃쎈룄 蹂댁젙 ?곸슜 諛⑹떇: LMT(UTC) + ?쒖??먯삤??= 吏????꽦??    var ramc=localSidereal(jdUTLmt,stdLon);
    var houses=placidusHouses(ramc,lat,eps);

    // Lots: Part of Fortune / Part of Spirit (day-night formula)
    var isDayBirth = (localHour >= 6 && localHour < 18);
    var fortunaLon = rev(houses.ASC + (isDayBirth ? (mLon - sLon) : (sLon - mLon)));
    var spiritLon  = rev(houses.ASC + (isDayBirth ? (sLon - mLon) : (mLon - sLon)));

    // Whole Sign ?섏슦??蹂묎린
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
/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??END AstroEngine ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

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
    signs: ['?묒옄由???', '?⑹냼?먮━(??', '?띾뫁?댁옄由???', '寃뚯옄由???', '?ъ옄?먮━(??', '泥섎??먮━(??', '泥쒖묶?먮━(??', '?꾧컝?먮━(??', '?ъ닔?먮━(??', '?쇱냼?먮━(??', '臾쇰퀝?먮━(??', '臾쇨퀬湲곗옄由???'],
    elements: ['遺?Fire)', '??Earth)', '怨듦린(Air)', '臾?Water)'],
    modalities: ['?쒕룞沅?Cardinal)', '怨좎젙沅?Fixed)', '蹂?듦턿(Mutable)'],
  houses: ['1 ?섏슦??(?먯븘/?몃え)', '2 ?섏슦??(媛移??щЪ)', '3 ?섏슦??(?뚰넻/?숈뒿)', '4 ?섏슦??(肉뚮━/媛??', '5 ?섏슦??(李쎌“/?곗븷)', '6 ?섏슦??(?몃룞/嫄닿컯)', '7 ?섏슦??(愿怨??뚰듃??', '8 ?섏슦??(蹂??怨듭쑀?먯궛)', '9 ?섏슦??(泥좏븰/?뺤옣)', '10 ?섏슦??(?깆랬/泥쒖쭅)', '11 ?섏슦??(鍮꾩쟾/?ㅽ듃?뚰겕)', '12 ?섏슦??(臾댁쓽???곸꽦)']
};

function calcAstroApiChartOrThrow(year, month, day, localHour, lat, lon, tz, houseSystem) {
  var hs = houseSystem || (window.ASTRO_HOUSE_SYSTEM || 'P');
  var chart = AstroEngine.calcAll(year, month, day, localHour, lat, lon, tz, { houseSystem: hs });
  var mode = chart && chart.natal && chart.natal.meta ? chart.natal.meta.precisionMode : 'unknown';
  if (mode !== 'swisseph') {
    throw new Error('SwissEph API 寃곌낵媛 以鍮꾨릺吏 ?딆븯?듬땲?? precisionMode=' + mode);
  }
  return chart;
}

function renderAstroApiUnavailable(reason) {
  var area = document.getElementById('astroResult');
  if (!area) return;
  var msg = String(reason || 'SwissEph API 珥덇린???ㅽ뙣')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  area.innerHTML = ''
    + '<div class="astro-body cosmic-theme star-container" id="astroBodyWrap">'
    + '<div class="astro-section" style="border-left:4px solid #ef4444;background:rgba(15,23,42,0.7);">'
    + '<div class="astro-subhead" style="color:#fda4af;">?쎇 ?먯꽦??API ?곌껐 ?湲?/div>'
    + '<div class="astro-desc" style="line-height:1.7;">'
    + '<p style="margin:0;">?먯꽦?좎? SwissEph API 湲곕컲 怨꾩궛留??쒖떆?섎룄濡??ㅼ젙?섏뼱 ?덉뒿?덈떎.</p>'
    + '<p style="margin:8px 0 0 0;color:#cbd5e1;">?먯씤: ' + msg + '</p>'
    + '</div></div></div>';
}

function renderAstroInsight() {
  var birth = window._astroBirth || window._ziweiBirth || { year:2000, month:1, day:1, hour:12, minute:0, lat:37.6, lon:127.0, tz:9 };
    var y = birth.year, m = birth.month, d = birth.day;
    var h = (birth.hour != null ? birth.hour : 12);
    var min = (birth.minute != null ? birth.minute : 0);
    var lat = birth.lat || 37.6, lon = birth.lon || 127.0, tz = (birth.tz != null ? birth.tz : 9);
    /* ?? AstroEngine 泥쒖껜??븰 怨꾩궛 (Jean Meeus 湲곕컲) ?? */
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

    /* ?? ?꾩옱 ?좎쭨 紐⑹꽦 ?몃옖吏?(?ㅼ떆媛? ?? */
    var now = new Date();
    var jupiterTransit = chartNow.planets.Jupiter.sign.sign;
    var jupiterIndex = (chartNow.planets.Jupiter && chartNow.planets.Jupiter.sign && chartNow.planets.Jupiter.sign.idx != null)
      ? chartNow.planets.Jupiter.sign.idx : 0;

    /* ?? 蹂꾩옄由??몃뜳??留ㅽ븨 ?? */
    var sunIndex  = (chart.sun  && chart.sun.idx  != null) ? chart.sun.idx  : 0;
    var moonIndex = (chart.moon && chart.moon.idx != null) ? chart.moon.idx : 0;
    var ascIndex  = (chart.asc  && chart.asc.idx  != null) ? chart.asc.idx  : 0;
    var mcIndex   = (chart.mc   && chart.mc.idx   != null) ? chart.mc.idx   : 0;

    /* ?? ?띿뒪???댁꽍 (怨꾩궛 湲곕컲 + ?쇰? 湲곗〈 ?명꽣?꾨━?뚯씠???쒖슜) ?? */
    var descIndex = (ascIndex + 6) % 12;
    var h6Index   = (ascIndex + 5) % 12;
    var chartRulerByAsc = [
      '?붿꽦(Mars)', '湲덉꽦(Venus)', '?섏꽦(Mercury)', '??Moon)',
      '?쒖뼇(Sun)', '?섏꽦(Mercury)', '湲덉꽦(Venus)', '?붿꽦/紐낆솗??Mars/Pluto)',
      '紐⑹꽦(Jupiter)', '?좎꽦(Saturn)', '?좎꽦/泥쒖솗??Saturn/Uranus)', '紐⑹꽦/?댁솗??Jupiter/Neptune)'
    ];
    var chartRuler = chartRulerByAsc[ascIndex] || '誘명솗??;

    /* ?? Jupiter ?몃옖吏?硫붿떆吏 (astrologer 諛곗뿴 ?ъ궗?? ?? */
    var transitMsg = [
      "????吏쒕뒗 ?쒖쫵?댁뿉?? ?쒖옉 踰꾪듉 ?꾨Ⅴ硫??띾룄 ?쒕?濡?遺숈뒿?덈떎. ?뵦",
      "?댟룹븞?빧룹깮???꾨━?곕? 泥쒖쿇???щ━湲?醫뗭? ?먮쫫?댁뿉?? 袁몄??⑥씠 ?밸━?⑸땲?? ?뮯",
      "?곕씫?닿낵 ?꾩씠?붿뼱 ?댁씠 ?댁븘?섏슂. 留??쒕쭏?? 湲 ??以꾩씠 湲고쉶瑜??곕젮?듬땲?? ?벑",
      "吏뫢룰?議굿룸쭏??而⑤뵒???뺣퉬??蹂꾨튆???ㅻ젮?? ????怨듦컙??癒쇱? 梨숆꺼蹂댁꽭?? ?룪",
      "臾대? 泥댁쭏 ON. ?섎? 蹂댁뿬以꾩닔濡?諛섏쓳???ㅻ뒗 ?쒓린?덉슂. ??,
      "猷⑦떞 ?뺣━?섎㈃ ?깃낵媛 ?곗쭛?덈떎. ?묒? ?듦?????李⑥씠瑜?留뚮뱾?댁슂. ??,
      "愿怨꾩슫 ?곸듅 援ш컙. ?쇱옄蹂대떎 ?④퍡?????덈꺼?낆씠 鍮좊쫭?덈떎. ?쩃",
      "源딆? 媛먯젙 ?뺣━ + ?ъ젙 ?먭????숈떆???꾩슂???쒓린. ?뺣㈃?뚰뙆媛 ?쎌씠 ?쇱슂. ?쫩",
      "?쒖빞媛 ?볦뼱吏???쒖쫵. ?ы뻾쨌怨듬?쨌?꾩쟾?먯꽌 ?댁쓽 臾몄씠 ?대┰?덈떎. ?뙇",
      "而ㅻ━??吏묒쨷 紐⑤뱶. 梨낆엫媛먯씠 怨??ㅼ쟻?쇰줈 諛붾뚮뒗 ??대컢?댁뿉?? ?룇",
      "?щ엺怨??꾨줈?앺듃媛 誘몃옒瑜??ㅼ썙以섏슂. 而ㅻ??덊떚???듭씠 ?덉뒿?덈떎. ?쭬",
      "?좉퉸 ?먮━寃?媛??醫뗭븘?? ?대㈃ ?뺣━ ?꾩뿉 ?ㅼ쓬 ?먰봽媛 ???ш쾶 ?듬땲?? ?뙄"
    ];

    var sunArchetypeByIdx = [
      '媛쒖쿃??二쇰룄??, '異뺤쟻???덉젙??, '?곌껐??吏??, '蹂댄샇???뺤꽌??,
      '?쒗쁽??李쎌“??, '媛쒖꽑??遺꾩꽍??, '議곗쑉??洹좏삎媛?, '?ъ링???듭같??,
      '?뺤옣??鍮꾩쟾??, '援ъ“??梨낆엫媛?, '?곸떊???낅┰??, '怨듦컧??吏곴???
    ];
    var sunStrategyByIdx = [
      '鍮좊Ⅸ ?쒖옉 ??二쇨컙 ?먭??쇰줈 諛⑺뼢 ?ㅼ감瑜?以꾩씠湲?,
      '以묒옣湲??꾩쟻 紐⑺몴瑜??섏튂?뷀빐 袁몄???異뺤쟻?섍린',
      '?뺣낫 ?섏쭛-?뺣━-諛쒖떊 猷⑦봽瑜?吏㏐쾶 ?좎??섍린',
      '?뺤꽌 ?덉쟾???뺣낫?????ㅽ뻾 媛뺣룄瑜??щ━湲?,
      '寃곌낵臾쇱쓣 怨듦컻 臾대????뺢린?곸쑝濡??몄텧?섍린',
      '?덉쭏 湲곗????④퀎?뷀빐 怨쇰????놁씠 媛쒖꽑?섍린',
      '?섏궗寃곗젙 湲고븳??紐낆떆??議곗쑉 吏?곗쓣 以꾩씠湲?,
      '?듭떖 怨쇱젣瑜?醫곹? 源딆씠 ?뚭퀬?ㅺ린',
      '??洹몃┝??遺꾧린 怨꾪쉷?쇰줈 履쇨컻 ?ㅽ뻾?섍린',
      '諛섎났 媛?ν븳 ?깃턿 吏꾨쾿怨??쒖? ?덉감瑜?癒쇱? 留뚮뱾湲?,
      '湲곗〈 諛⑹떇???ㅽ뿕 ?щ’???ｌ뼱 ?곸떊?섍린',
      '吏곴? ?좏샇瑜?湲곕줉?섍퀬 寃利?猷⑦떞?쇰줈 ?곌껐?섍린'
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

    var sunDeg  = chart.sun.deg  != null ? ' <span style="color:#94a3b8;font-size:0.78rem">'+chart.sun.deg.toFixed(2)+'째</span>' : '';
    var moonDeg = chart.moon.deg != null ? ' <span style="color:#94a3b8;font-size:0.78rem">'+chart.moon.deg.toFixed(2)+'째</span>' : '';

    var vmAspect = '';
    var vi = chart.planets.Venus && chart.planets.Venus.sign ? chart.planets.Venus.sign.idx : 0;
    var mi2 = chart.planets.Mars && chart.planets.Mars.sign ? chart.planets.Mars.sign.idx : 0;
    if(vi===mi2) vmAspect = "<span class='aspect-hl'>[媛숈? 由щ벉]</span> 留덉쓬 媛???ъ씤?몄? ?됰룞 ??대컢????留욎븘, 鍮좊Ⅴ寃?媛源뚯썙吏???ㅽ??쇱씠?먯슂. ?뮒";
    else if((vi-mi2+12)%12===6) vmAspect = "<span class='aspect-hl'>[諛??由щ벉]</span> ?뚮┝? 媛뺥븳??諛⑹떇???щ씪?? ????쒗룷留?留욎텛硫??⑥뵮 ?명빐吏묐땲?? ?뽳툘";
    var venusMarsSignGap = (vi - mi2 + 12) % 12;
    var vmFallbackByGap = {
      0:'湲덉꽦-?붿꽦??媛숈? ?ъ씤???덉뼱 媛먯젙 ?쒗쁽怨??됰룞??媛숈? 由щ벉?쇰줈 ?숆린?붾맗?덈떎.',
      2:'醫뗭븘?섎뒗 諛⑹떇怨??됰룞 ??대컢??遺?쒕읇寃??댁뼱?몄슂. ?곗씠?멸? ?먯뿰?ㅻ읇寃??섎윭媛묐땲??',
      3:'?쒕줈 留ㅻ젰? ?곕뜲 諛⑹떇 李⑥씠??而ㅼ슂. 猷곗쓣 癒쇱? ?뺥븯硫??ㅽ댘??以꾩뼱??',
      4:'?쒗쁽怨??됰룞???덉젙?곸쑝濡?留욌Ъ由щ뒗 ?몄씠???ㅻ옒 媛??愿怨꾩뿉 ?좊━?댁슂.',
      6:'媛뺥븳 ?뚮┝ + 媛뺥븳 ?⑤룄李?議고빀?댁뿉?? ?좉퉸 硫덉땄 ??붽? 愿怨꾨? 吏耳쒖쨳?덈떎.'
    };
    var vmCalcFallback = vmFallbackByGap[venusMarsSignGap] || ('?쒕줈???쒗룷媛 ?ㅻⅨ ?좎씠?먯슂. 湲됲븯寃?寃곕줎 ?닿린蹂대떎 ??諛뺤옄 ?ъ뼱媛硫??⑥뵮 醫뗭븘??');

    var masterInsight = '';

    
    /* ?? 4?먯냼 ?ㅼ떆媛?怨꾩궛 ?? */
    /* toSign() 諛섑솚 援ъ“: { sign:"?묒옄由??? 5째 23'", _baseSign:"?묒옄由???", idx:0, deg:5.3 }
       chart.sun/moon/asc/mc ??toSign 媛앹껜 洹??먯껜?대?濡?.idx 瑜?吏곸젒 ?ъ슜 */
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
    var elemDomNames = { fire:'?뵦 遺?Fire)???쒕?', earth:'?뙼 ??Earth)??踰덉쁺', air:'?뮜 怨듦린(Air)??吏??, water:'?뮛 臾?Water)??媛먯꽦' };
    var elemDomDesc  = {
        fire:  '李쎌“, ?댁젙, 吏곴????섏튂???곹샎. ?됰룞??癒쇱??닿퀬 ?앷컖? ?섏쨷.',
        earth: '臾쇱쭏???꾩떎 媛먭컖怨??몃궡媛 理쒓컯 臾닿린. 袁몄??⑥씠 遺瑜??볥뒗??',
        air:   '?쇰━? ?몄뼱, ?뚰넻?쇰줈 ?몄긽???대걚??吏?앹씤 湲곗쭏.',
        water: '媛먯닔?깃낵 ?곸꽦????컻?섎뒗 吏곴????ъ씤. ??몄쓽 媛먯젙??利됯컖 怨듬챸.'
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
    var modalityNames = { cardinal:'?쒕룞沅?Cardinal)', fixed:'怨좎젙沅?Fixed)', mutable:'蹂?듦턿(Mutable)' };
    var modalityAdvice = {
      cardinal:'?쒖옉 ?λ젰??媛뺥빀?덈떎. 2二??먭? 猷⑦떞??遺숈씠硫?以묐룄 ?댄깉??以꾩씪 ???덉뒿?덈떎.',
      fixed:'吏?띿꽦怨??닿뎄?깆씠 媛뺥빀?덈떎. 愿??怨쇱엵??留됯린 ?꾪빐 遺꾧린蹂??ㅽ뿕 1媛쒕? 怨좎젙?섏꽭??',
      mutable:'?곸쓳?깃낵 ?꾪솚??鍮좊쫭?덈떎. ?곗꽑?쒖쐞 3媛??쒗븳 洹쒖튃???먮㈃ ?곕쭔?⑥쓣 以꾩씪 ???덉뒿?덈떎.'
    };

    /* ?? ?쇰Ⅴ?ㅻ━??怨꾩궛 (Chaldean order) ?? */
    var FIRDARIA_DAY = [
        {planet:'? ?쒖뼇(Sun)',    years:10, kr:'?쒖뼇',  theme:'?먯븘 ?뺣┰쨌紐낆삁쨌李쎌“?μ쓽 ?쒕?. ?뱀떊??二쇱씤怨듭씠 ??臾대?媛 ?쇱퀜吏묐땲??',
         detail:'?쒖뼇 ?쇰Ⅴ?ㅻ━?꾨뒗 ?뱀떊 ?몄깮???⑷툑湲??쒕쭑?낅땲?? ??10?꾩? ?먯떊???대쫫???몄긽??媛곸씤?쒖폒?????대챸???쒓컙??낅땲?? 洹몃룞???⑥＝?닿퀬 ?덈뜕 ?щ뒫怨??쇰쭩???쒕뵒??怨듦컻 臾대????щ젮???⑸땲?? 由щ뜑??낵 李쎌“?μ씠 ?덉젙???ы븯硫? 理쒓퀬 寃곗젙沅뚯옄??沅뚯쐞 ?덈뒗 ?몃Ъ怨쇱쓽 留뚮궓????븘吏묐땲?? 吏湲??뱀쭊쨌?낅┰ 李쎌뾽쨌????꾨줈?앺듃 ?꾩쟾??誘몃（??寃껋? ?곗＜???먮쫫????뻾?섎뒗 寃껋엯?덈떎.',
         career:'吏곸옣?몄씠?쇰㈃ 吏湲덉씠 ?뱀쭊쨌?대룞쨌????꾨줈?앺듃 二쇰룄瑜??꾪빐 ?먯쓣 ?쒕뒗 ?쒓린?낅땲?? 李쎌뾽?먮씪硫?釉뚮옖??怨듭떇?? ????띾낫, ?ъ옄 ?좎튂 ?묒긽??媛???좊━??援?㈃?낅땲?? ?덉닠쨌?뷀꽣쨌?뺤튂쨌寃쎌쁺 由щ뜑 ?몃옓?먯꽌 ?낅낫???깃낵媛 ?섏샃?덈떎.',
         love:'?곗븷?먯꽌???먯떊媛??섏튂???쒕룄濡?癒쇱? ?곴레?곸쑝濡??댄븘?댁빞 ?⑸땲?? ??깊븳 ?뚰듃?덉떗蹂대떎 ?닿? 鍮쏅굹??愿怨꾨? ?먰븯寃??섎?濡? ?곷?諛⑹쓽 ?먯〈?ъ쓣 諛곕젮?섎뒗 ?뚰넻???κ린 ?곗븷???듭떖?낅땲??',
         caution:'吏?섏튇 ?먭린以묒떖???낆＜濡???먯씠???뚰듃?덉? 媛덈벑???쇱쑝?????덉뒿?덈떎. 紐낆삁?뺤씠 ?욎꽌 臾대━???뺤옣???섎㈃ ?뚯쭊 踰덉븘?껋씠 ?듬땲?? 嫄닿컯?먯꽌???ъ옣쨌?덉븬쨌?덉쓣 ?뺢린 泥댄겕?섏떗?쒖삤.',
         advice:'留ㅻ뀈 ?앹씪 ?꾪썑濡??덈줈??紐⑺몴瑜?怨듦컻 ?좎뼵?섏꽭?? 硫섑넗 ?먮뒗 ?좊같???愿怨꾨? ?곴레?곸쑝濡?援ъ텞?섍퀬, ?대쫫???쒕윭?섎뒗 怨듭떇 ?앹긽???먯＜ 李몄뿬?섎뒗 寃껋씠 ?댁쓣 ?뚯뼱?밴린??鍮꾧껐?낅땲??'},
        {planet:'? 湲덉꽦(Venus)',  years:8,  kr:'湲덉꽦',  theme:'?щ옉쨌誘몄쟻 ?깆랬쨌?щЪ??苑껋씠 ?쒖쭩 ?쇰뒗 ?ъ숴???쒓린.',
         detail:'湲덉꽦 ?쇰Ⅴ?ㅻ━?꾨뒗 ?몄깮?먯꽌 媛???띿슂濡?퀬 媛먮?濡쒖슫 8?꾩엯?덈떎. ?꾨쫫?ㅼ?쨌?щ옉쨌?덉닠쨌?щЪ???먯꽍泥섎읆 ?뱀떊?먭쾶 ?뚮젮?듬땲?? 寃고샎쨌?숆굅쨌吏꾩????곗븷媛 ??湲곌컙??媛??留롮씠 ?쒖옉?섍퀬, 誘몄쟻 媛먭컖????컻?섏뿬 ?⑥뀡쨌?뚯븙쨌?붿옄?몄뿉???곸썡???덈ぉ???대┰?덈떎. ?멸컙愿怨꾩뿉??留덉같??以꾧퀬, 二쇰? ?щ엺?ㅼ씠 ?뱀떊???좊룆 留ㅻ젰?곸쑝濡??먮굧?덈떎.',
         career:'?덉닠쨌酉고떚쨌?⑥뀡쨌?명뀒由ъ뼱쨌遺?숈궛쨌湲덉쑖쨌?쒕퉬???낆쥌?먯꽌 鍮쏅궔?덈떎. ?묒뾽 ?꾨━?좏뀒?댁뀡, 怨듬룞 李쎌옉, ?뚰듃?덉떗 怨꾩빟???좊━????대컢?낅땲?? ?먯떊???щ??덉쓣 肄섑뀗痢좏솕?섎뒗 寃?釉뚮옖?쑣룹쑀?쒕툕쨌?꾩떆)???섏씡?쇰줈 吏곴껐?⑸땲??',
         love:'?됱깮 媛???ъ숴???곗븷 ?먮뒗 寃고샎 ?쒓린?낅땲?? ?몃え? 留ㅻ젰??理쒓퀬?먯뿉 ?ы븯硫? ?먰븯???щ엺?먭쾶 ?곴레 ?ㅺ?媛硫??깆궗?⑥씠 ?믪뒿?덈떎. ?? 苡뚮씫 異붽뎄媛 怨쇳븯硫?遺덊븘?뷀븳 ?ㅼ틪?ㅻ줈 ?댁뼱吏????덉뒿?덈떎.',
         caution:'吏異쒖씠 ?섏엯??珥덇낵?섎뒗 ?ъ튂, ?곗븷?먯꽌???곗쑀遺?⑦븿, 媛먯꽦???먮떒?쇰줈 ?명븳 鍮꾩쫰?덉뒪 ?ㅼ닔瑜?議곗떖?섏떗?쒖삤. ?뱀씠??吏諛??꾩＜???뚯떇?쇰줈 ?덈떦쨌泥댁쨷 ?섑샇媛 ?먯뒯?댁쭏 ???덉뒿?덈떎.',
         advice:'吏湲?誘몃쨪?붾뜕 ?먭린 怨꾨컻(?몄뼱쨌?덉닠쨌?붾━쨌?뚯븙)???쒖옉?섏꽭?? 二쇨굅 ?섍꼍???꾨쫫?듦쾶 ?뺣퉬?섎㈃ ?댁씠 ?곕씪?듬땲?? 醫뗭븘?섎뒗 ?щ엺?먭쾶 怨좊갚? 鍮좊??섎줉 醫뗭뒿?덈떎.'},
        {planet:'???섏꽦(Mercury)',years:13, kr:'?섏꽦',  theme:'?숈뒿쨌而ㅻ??덉??댁뀡쨌怨꾩빟怨??묒긽???쒕?. ?몄뼱媛 怨?沅뚮젰.',
         detail:'?섏꽦 ?쇰Ⅴ?ㅻ━?꾨뒗 13?꾩씠?쇰뒗 湲??명씉??吏?씲룹뼵?는룸꽕?몄썙?ъ쓽 ?쒕??낅땲?? 留??쒕쭏?? 湲 ??以꾩씠 ?대챸??諛붽씀???쒓린?낅땲?? 怨꾩빟쨌?묒긽쨌?숈뒿쨌?먭꺽利씲룹씠?숈씠 ??컻?곸쑝濡?利앷??섎ŉ, ?ㅼ뼇??遺꾩빞???뺣낫瑜??듬뱷?섍퀬 ?대? ?곌껐?섎뒗 ?λ젰??媛뺥솕?⑸땲?? ?띾뫁?댁옄由?룹쿂??먮━ ?먮꼫吏媛 ?꾨㈃??遺媛곷맗?덈떎.',
         career:'?묎?쨌媛뺤궗쨌而⑥꽕?댄듃쨌?곸뾽쨌留덉??걔룸쾲??텶T 媛쒕컻쨌誘몃뵒??遺꾩빞?먯꽌 ?먭컖???섑??낅땲?? ?먭꺽利앷낵 湲곗닠???볤린 媛??醫뗭? ?쒓컙?낅땲?? ?④린 ?꾨줈?앺듃? 蹂듭닔???섏엯??援ъ“瑜??ㅽ뿕?섍린???좊━?⑸땲??',
         love:'媛먯젙 ?쒗쁽蹂대떎 吏????붽? ?띾???愿怨꾩뿉???ㅻ젞???먮굧?덈떎. SNS쨌?굿룹튇援??뚭컻 ???붿???梨꾨꼸???듯븳 ?몄뿰???쒕컻?⑸땲?? ?? 留먯씠 留롮븘吏硫??ㅽ빐???섏뼱?섎?濡??좎쨷???몄뼱 ?좏깮??以묒슂?⑸땲??',
         caution:'?곕쭔?㉱룹쭛以묐젰 遺꾩궛쨌怨꾩빟 ?ㅼ닔媛 ??뒿?덈떎. ?덈Т 留롮? ?쇱쓣 ?숈떆??踰뚯뿬 ?꾩꽦?꾧? ??븘吏??꾪뿕???덉뒿?덈떎. ?먯쑉?좉꼍쨌?섎㈃쨌?명씉湲곕? ?뚮낫?몄슂.',
         advice:'釉붾줈洹맞룹쑀?쒕툕쨌梨?異쒓컙 ???먯떊留뚯쓽 吏???뚮옯?쇱쓣 ?댁そ 湲곌컙 以?諛섎뱶??援ъ텞?섏꽭?? ?먭꺽利?諛?怨듭씤 ?쒗뿕 ?꾩쟾??媛???좊━????대컢?낅땲?? 怨꾩빟?쒕뒗 諛섎뱶??瑗쇨세??寃?좏븯??떆??'},
        {planet:'????Moon)',     years:9,  kr:'??,    theme:'?대㈃??媛먯젙???뺥솕?섍퀬 媛?빧룸え?굿룹쭅愿??鍮쏅굹???쒓린.',
         detail:'???쇰Ⅴ?ㅻ━?꾨뒗 ?몃?媛 ?꾨땶 ?대㈃?쇰줈 ?쒖꽑???뚮━??9?꾩엯?덈떎. 媛먯젙쨌吏곴?쨌媛?빧룸え?굿룸Т?섏떇??二쇱씤怨듭씠 ?섎뒗 議곗슜?섏?留?媛뺣젰???댁쟻 ?깆옣???쒓컙?낅땲?? ?대㉧?댟룹뿬???몃Ъ怨쇱쓽 愿怨꾧? 遺媛곷릺怨? 轅덇낵 吏곴컧??鍮꾩긽?섍쾶 ?덈━?댁쭛?덈떎. 二쇨굅 ?대룞쨌媛議?愿???댁뒋쨌?꾩떊쨌異쒖궛????湲곌컙??吏묒쨷?⑸땲??',
         career:'援먯쑁쨌?곷떞쨌蹂듭?쨌?붿떇?끒룹씤?뚮━?는룸??숈궛쨌紐⑥꽦 愿???곗뾽?먯꽌 ?댁씠 媛뺥빀?덈떎. ???꾩빟蹂대떎???꾪깂???댁떎???볥뒗 ?쒓린?낅땲?? 吏곴컧??寃쎌쁺 ?먮떒???곴레 ?쒖슜?섏꽭??',
         love:'媛먯젙???좊?? ?덉젙媛먯쓣 理쒖슦?좎떆?섍쾶 ?⑸땲?? ?ㅻ옒???몄뿰???ш껐?⑺븯嫄곕굹, 源딆씠 ?덈뒗 愿怨꾨줈 諛쒖쟾?섎뒗 ?쒓린?낅땲?? 媛議깆쓽 ?섍껄???곗븷쨌寃고샎 寃곗젙?????곹뼢??誘몄묩?덈떎.',
         caution:'媛먯젙 湲곕났???ы빐吏怨? 怨쇨굅???곸쿂媛 ?ㅼ떆 ?щ씪?듬땲?? ??몄쓽 媛먯젙??吏?섏튂寃??숉솕?섏뼱 ?먮꼫吏媛 ?뚯쭊?????덉뒿?덈떎. ?좉꼍???꾩옣 ?μ븷? ?섎텇 遺덇퇏?뺤쓣 二쇱쓽?섏꽭??',
         advice:'?쇨린 ?곌린쨌紐낆긽쨌?붾━쨌?먯삁 ??媛먯꽦 移섏쑀 猷⑦떞???뺣┰?섏꽭?? 媛議깃낵???쒓컙???섎룄?곸쑝濡??섎━硫??щ━???덉젙怨??④퍡 ?댁씠 ?대┰?덈떎. ?щ━ ?곷떞??諛쏅뒗 寃껊룄 ??湲곌컙?????④낵瑜?諛쒗쐶?⑸땲??'},
        {planet:'???좎꽦(Saturn)', years:11, kr:'?좎꽦',  theme:'?쒕젴怨??몃궡, 洹??앹뿉 ?⑤떒???꾨Ц?깆씠 ?꾩꽦?섎뒗 ?ъ젙.',
         detail:'?좎꽦 ?쇰Ⅴ?ㅻ━?꾨뒗 ?몄깮?먯꽌 媛???밸룆?섍퀬 ?숈떆??媛???⑤떒?댁???11?꾩엯?덈떎. 吏由꾧만? ?놁뒿?덈떎. 梨낆엫쨌洹쒖쑉쨌?몃궡쨌?꾩떎 吏곸떆?쇰뒗 ?좎꽦???섏뾽???띠쓽 紐⑤뱺 ?곸뿭?먯꽌 泥?뎄?쒕? ?ㅼ씠諛됰땲?? 洹몃윭?????쒓컙???깆떎?섍쾶 踰꾪뀲???먮쭔???댄썑 紐⑹꽦 ?쇰Ⅴ?ㅻ━?꾩쓽 ??컻???깆옣??留욎씠?????덉뒿?덈떎. ?湲곕쭔?깊삎 ?깃났???⑥븮??肉뚮젮吏???쒓린?낅땲??',
         career:'沅뚯쐞쨌?먭꺽쨌?꾨Ц?깆쓣 ?뺢퀬???섎뒗 ??吏묒쨷?섏꽭?? 鍮좊Ⅸ ?깃낵蹂대떎 ?κ린 ?ы듃?대━??援ъ텞???듭떖?낅땲?? 怨듬Т?먃룸쾿議걔룰굔異빧룰툑?돠룹쓽猷???洹쒖쑉??媛뺥븳 遺꾩빞?먯꽌 ??웾???몄젙諛쏆뒿?덈떎.',
         love:'吏꾩??섍퀬 梨낆엫媛??덈뒗 ?щ엺?먭쾶 ?뚮━寃??⑸땲?? 媛踰쇱슫 ?곗븷蹂대떎??誘몃옒瑜??④퍡 洹몃┫ ???덈뒗 ?뚰듃?덈? ?먰빀?덈떎. 寃고샎???욌몢嫄곕굹, 湲곗〈 愿怨꾩쓽 臾닿쾶媛먯씠 利앷??⑸땲??',
         caution:'吏?섏튇 ?꾨꼍二쇱쓽쨌?먭린 鍮꾪븯쨌怨좊룆媛먯씠 踰덉븘?껋쑝濡??댁뼱吏湲??쎌뒿?덈떎. 臾대쫷쨌泥숈텛쨌移섏븘쨌?쇰? ??堉덉? ?쇰? 怨꾪넻 嫄닿컯???좎쓽?섏꽭??',
         advice:'吏湲??대졄怨??먮━寃??먭뺨吏??寃껋씠 ?뺤긽?낅땲?? ?ш린?섏? 留덉꽭????吏湲??볥뒗 ?꾨Ц?깆씠 ?ㅼ쓬 10?꾩쓽 嫄곕????먯궛???⑸땲?? 硫섑넗瑜?李얘퀬, ?κ린 怨꾪쉷 ?섎┰??吏묒쨷?섎뒗 寃껋씠 媛???꾨챸??泥쒓린?낅땲??'},
        {planet:'??紐⑹꽦(Jupiter)',years:12, kr:'紐⑹꽦',  theme:'?뺤옣쨌?됱슫쨌?깆옣???뺤젏. ?⑥븮??嫄곕ぉ?쇰줈 ?먮씪?섎뒗 ?쒖젅.',
         detail:'紐⑹꽦 ?쇰Ⅴ?ㅻ━?꾨뒗 ?몄깮 理쒓퀬???됱슫 湲곌컙?낅땲?? ?좎꽦??肉뚮┛ ?⑥븮???쒕뵒??嫄곕???寃곗떎濡??뚯븘?ㅻ뒗 12?꾩엯?덈떎. 湲고쉶媛 ?섏퀜?섍퀬, 臾몄씠 ?꾨갑?꾩쟻?쇰줈 ?대┰?덈떎. ?댁쇅쨌?숇Ц쨌異쒗뙋쨌踰뺣쪧쨌醫낃탳쨌泥좏븰쨌?湲곗뾽 吏꾩텧 ???ㅼ??쇱쓽 ?뺤옣???쇱뼱?⑸땲?? 洹?몄쓣 媛??留롮씠 留뚮굹???쒓린?댁옄, ??대컢 ?섎굹濡??몄깮???꾩빟?섎뒗 ?⑷툑湲곗엯?덈떎.',
         career:'??湲곌컙???꾩쟾?섏? ?딆쑝硫??꾪쉶?⑸땲?? 李쎌뾽쨌?댁쇅 吏꾩텧쨌?ъ옄쨌?뱀쭊쨌異쒗뙋쨌媛뺤뿰 ??紐⑤뱺 ?뺤옣 ?됰낫???곗＜媛 ?ㅻ? 諛쏆퀜以띾땲?? 怨쇨컧???좏깮??怨쇨컧??寃곗떎???녹뒿?덈떎.',
         love:'?띠쓽 湲곗????믪뿬二쇰뒗 寃⑹씠 ?덈뒗 ?댁꽦怨쇱쓽 留뚮궓??留롮븘吏묐땲?? ?댁쇅 ?몄뿰, 醫낃탳쨌?숇Ц??諛곌꼍???ㅻⅨ ?뚰듃?덉???留뚮궓??媛?ν빀?덈떎. 寃고샎怨??숇컲??愿怨꾩뿉????諛쒖쟾???대（?댁????쒓린?낅땲??',
         caution:'吏?섏튇 ?숆??쇰줈 臾대━???꾨컯쨌怨쇱냼鍮꽷룰낵?λ맂 怨꾪쉷????뭾??遺由낅땲?? ?댁씠 李뚭린 ?ъ슫 ?쒓린?대?濡??앹씠 議곗젅???꾩슂?⑸땲?? 媛꾧낵 ?덈쾮吏 遺??嫄닿컯???좎쓽?섏꽭??',
         advice:'吏湲??섍퀬 ?띠? ??洹몃┝ ??媛吏瑜??좏깮?섏뿬 ?꾨젰?ш뎄?섏꽭?? ?댁쇅 ?곗닔쨌??숈썝쨌?먭꺽利씲룻닾???ы듃?대━?ㅻ? ???쒓린??援ъ텞?섎㈃ ?몄깮??諛붾앸땲??'},
        {planet:'???붿꽦(Mars)',   years:7,  kr:'?붿꽦',  theme:'?꾩쟾쨌寃쎌웳쨌?먮꼫吏 ??컻. 硫덉텛吏 留먭퀬 ?꾩쭊??寃?',
         detail:'?붿꽦 ?쇰Ⅴ?ㅻ━?꾨뒗 吏㏃?留?媛뺣젹??7?꾩쓽 ?꾪닾湲곗엯?덈떎. 寃쎌웳쨌?꾩쟾쨌媛쒖쿃쨌?뚰뙆???먮꼫吏媛 ??컻?섎ŉ, ?됰룞?μ씠 洹밸룄濡??곸듅?⑸땲?? ?ㅼ뒪濡??吏곸씠吏 ?딆쑝硫??꾨Т ?쇰룄 ?쇱뼱?섏? ?딅뒗 ?쒓린?낅땲?? 泥대젰쨌?ъ?쨌吏곸젒 ?됰룞???깃낵瑜?留뚮뱾?대궡硫? 洹몃┝???뚮룞瑜?媛먯닔?섎뒗 怨쇨컧??寃곕떒???붽뎄?⑸땲??',
         career:'援곌꼍쨌?대룞쨌?곸뾽쨌遺?숈궛쨌李쎌뾽쨌IT 媛쒕컻 ???ㅽ뻾?μ씠 ?듭떖??遺꾩빞?먯꽌 ?깃낵媛 ?곗쭛?덈떎. ?좎젣?곸쑝濡?癒쇱? ?먯쓣 ?쒕뒗 ?щ엺??湲고쉶瑜??낆젏?⑸땲?? 異⑸룎???덉뼱??臾쇰윭?쒖? 留먭퀬 ?ㅻ젰?쇰줈 ?밸??섏꽭??',
         love:'媛뺣젹?섍퀬 鍮좊Ⅸ ?곗븷 ?꾧컻媛 ?뱀쭠?낅땲?? 吏곸젒 ?댄븘?섎㈃ ?깆궗?⑥씠 ?믪뒿?덈떎. ?? 異⑸룞???곗븷? ?대퀎????쑝誘濡?以묒슂??寃곗젙? ?됯컖湲곕? ?먭퀬 ?좎쨷???섏꽭??',
         caution:'?깃툒??寃곗젙쨌遺꾨끂 ??컻쨌?ш퀬쨌?섏닠 ?꾪뿕???믪? ?쒓린?낅땲?? 癒몃━쨌?쇨뎬쨌?덉븬쨌洹쇱쑁 遺?곸뿉 二쇱쓽?섏꽭?? 寃쎌웳??吏묒갑?섎떎 ?숇즺愿怨꾨? 留앹튂吏 ?딅룄濡?議곗떖?섏떗?쒖삤.',
         advice:'?꾩묠 ?대룞 猷⑦떞?쇰줈 怨듦꺽?곸씤 ?먮꼫吏瑜?嫄댁쟾?섍쾶 諛쒖궛?섏꽭?? ??湲곌컙? 鍮좊Ⅴ寃??쒖옉?섎릺, 留덈Т由щ? 瑗쇨세??吏?댁빞 ?⑸땲?? 遺덊븘?뷀븳 ?몄?? ?쇳븯?? ?뺣떦???밸??먯꽌???덈? 臾쇰윭?쒖? 留덉꽭??'}
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
    /* ?? ?쇰Ⅴ?ㅻ━???쒕툕 ?됱꽦 ?곸꽭 議고빀 ?댁꽍 ?? */
    var firdariaSubIdx = Math.floor((firdariaMain.years-firdariaMainYearsLeft)/(firdariaMain.years/7))%7;
    var FIRDARIA_COMBO = {
        '?쒖뼇_湲덉꽦':'李쎌“???먭린 ?쒗쁽???띿슂媛 ?뷀빐吏묐땲?? ?꾨쫫?ㅼ슫 諛⑹떇?쇰줈 ?대쫫???뚮┫ 理쒖긽????대컢 ???덉닠쨌誘몃뵒?는룻띁釉붾┃ 釉뚮옖?⑹뿉 吏묒쨷?섏꽭??',
        '?쒖뼇_?섏꽦':'吏?깆쓣 ?욎꽭??由щ뜑??쓣 諛쒗쐶?섎뒗 援?㈃?낅땲?? 以묒슂??諛쒗몴쨌?묒긽쨌異쒗뙋?먯꽌 鍮쏅궔?덈떎. 留먭낵 湲濡??먯떊??釉뚮옖?쒕? 媛뺥솕?섏꽭??',
        '?쒖뼇_??:'怨듭쟻 ?깆랬? ?ъ쟻 媛먯젙??異⑸룎?섎뒗 誘쇨컧???쒓컙?낅땲?? 媛議굿룹뿬???몃Ъ怨쇱쓽 愿怨꾧? 而ㅻ━?댁뿉 ?곹뼢??誘몄묩?덈떎. ?대㈃???뚮━??洹 湲곗슱?댁꽭??',
        '?쒖뼇_?좎꽦':'鍮쏅굹怨??띠?留?梨낆엫??癒쇱? ?곕씪?ㅻ뒗 ?쒓린?낅땲?? 袁몄????ㅻ젰??利앸챸?섎㈃ 沅뚯쐞 ?덈뒗 ?먮━媛 ?곕씪?듬땲?? 吏由꾧만? ?놁쑝??寃곌낵???뺤떎?⑸땲??',
        '?쒖뼇_紐⑹꽦':'?⑷툑湲?以묒쓽 ?⑷툑湲? ?됱슫怨??먯떊媛먯씠 ?숈떆???뺤젏???ы빀?덈떎. 以묒슂???꾩빟 寃곗젙??吏湲??대━?몄슂. ????대컢???볦튂吏 留덉떗?쒖삤.',
        '?쒖뼇_?붿꽦':'媛뺣젹???먮꼫吏濡?紐⑺몴瑜??ν빐 ?뚯쭊?섎뒗 援?㈃?낅땲?? 由щ뜑??遺꾩웳?대굹 寃쎌웳???앷만 ???덉쑝?? 二쇰룄沅뚯쓣 ?⑦샇?섍쾶 伊먮㈃ ?밸━?⑸땲??',
        '湲덉꽦_?쒖뼇':'留ㅻ젰怨?議댁옱媛먯씠 ?덉젙???ы븯???⑷툑 ?쒓컙?낅땲?? 以묒슂???몄뿰, 寃고샎, ?뚰듃?덉떗 怨꾩빟?????쒕툕 湲곌컙??吏묒쨷?⑸땲??',
        '湲덉꽦_?섏꽦':'?꾩씠?붿뼱? ?몄뼱濡??꾨쫫?ㅼ????쒗쁽?섎뒗 ?쒓린?낅땲?? ?щ━?먯씠?곕툕 ?쇱씠?? 愿묎퀬 移댄뵾, 肄섑뀗痢?李쎌옉???먮뱶?ъ쭊 ?섏씡???낅땲??',
        '湲덉꽦_??:'媛먯닔?깃낵 怨듦컧 ?λ젰??理쒓퀬議곗뿉 ?ы빀?덈떎. 怨쇨굅 ?대퀎???곸쿂媛 移섏쑀?섍굅???ㅻ옒???몄뿰???뚯븘?듬땲??',
        '湲덉꽦_?좎꽦':'吏꾩????щ옉怨??덉젙?곸씤 ?뚰듃?덉떗??媛뺤“?⑸땲?? 苡뚮씫蹂대떎 梨낆엫媛??덈뒗 ?뚯떊??湲덉꽦 ?먮꼫吏瑜??깆닕?섍쾶 ?대걬?덈떎.',
        '湲덉꽦_紐⑹꽦':'?щЪ怨??щ옉 ?묒そ?먯꽌 ?됱슫????컻?⑸땲?? ?ъ옄쨌寃고샎쨌?덉닠 ?쒕룞 紐⑤몢 ????대컢??媛???섎떖??諛잛쑝?몄슂.',
        '湲덉꽦_?붿꽦':'愿怨꾩뿉???④굅???댁젙??遺덊??ㅻ쫭?덈떎. 異⑸룞???곗븷 ?꾧컻媛 媛?ν븯??媛먯젙怨??댁꽦??洹좏삎 ?덇쾶 ?좎??섏꽭??',
        '?섏꽦_?쒖뼇':'吏?앹씠 沅뚯쐞? 寃고빀?섎뒗 援?㈃?낅땲?? 怨듭떇 ?앹긽?먯꽌???곗꽕, 異쒗뙋, ?먭꺽 痍⑤뱷??紐낆꽦怨?吏곴껐?⑸땲??',
        '?섏꽦_湲덉꽦':'湲怨?留먯뿉 留ㅻ젰???뷀빐吏묐땲?? SNS쨌肄섑뀗痢졖룸뵒?먯씤쨌留덉??낆뿉???곸썡???깃낵瑜??낅땲??',
        '?섏꽦_??:'湲곗뼲?Β룹쭅愿쨌媛먯젙??寃고빀?섏뿬 怨듦컧 湲?곌린???곷떞, ?щ━???뚰넻?먯꽌 鍮쏅궔?덈떎.',
        '?섏꽦_?좎꽦':'?좎쨷?섍퀬 ?뺣???遺꾩꽍?μ씠 媛뺥솕?⑸땲?? 踰뺣쪧쨌?뚭퀎쨌泥쒓린 湲고쉷 遺꾩빞?먯꽌 ?ㅻ젰???몄젙諛쏅뒗 ?쒓컙?낅땲??',
        '?섏꽦_紐⑹꽦':'諛곗?怨?湲고쉶媛 ??컻?⑸땲?? ?멸뎅???듬뱷, ?댁쇅 鍮꾩쫰?덉뒪, 怨좉툒 ?먭꺽利??꾩쟾??媛???댁긽?곸씤 ??대컢?낅땲??',
        '?섏꽦_?붿꽦':'鍮좊Ⅸ ?섏궗寃곗젙怨??ㅽ뻾?μ씠 ?쒕꼫吏瑜??낅땲?? ?ㅽ??몄뾽 珥덇린 ?④퀎??移섏뿴??寃쎌웳 ?ㅻ뱷 ?곹솴?먯꽌 ?먭컖??蹂댁엯?덈떎.',
        '???쒖뼇':'媛먯꽦怨?怨듭쟻 ?먯븘媛 援먯감?⑸땲?? ?먯떊??吏꾩쭨 ?댁빞湲곕? ?以묎낵 怨듭쑀?섎㈃ ?덉긽移?紐삵븳 諛섑뼢???살뒿?덈떎.',
        '??湲덉꽦':'?ъ꽦?깃낵 ?꾨쫫?ㅼ?, 紐⑥꽦??寃고빀?섎뒗 源딆? 移섏쑀???쒓린?낅땲?? 寃고샎쨌異쒖궛쨌?덉닠 移섎즺媛 ??鍮쏆쓣 諛쒗빀?덈떎.',
        '???섏꽦':'媛먯꽦???뚰넻??洹밸??붾맗?덈떎. 釉붾줈洹맞룹닔?꽷룹떖由??곷떞쨌肄붿묶?먯꽌 ?먯떊????웾???먮뱶?ъ쭛?덈떎.',
        '???좎꽦':'媛먯젙??臾닿쾶媛 臾닿굅?뚯???怨좎슂???댁쟻 ?깆같???쒓컙?낅땲?? 怨쇨굅 ?곸쿂? 留덉＜?섍퀬 ?꾩쟾???대갑?섎뒗 湲고쉶濡??쇱쑝?몄슂.',
        '??紐⑹꽦':'吏곴?怨??됱슫??寃고빀?⑸땲?? 媛議굿룸??숈궛쨌紐⑥꽦 ?댁뒋?먯꽌 湲띿젙?곸씤 ?꾪솚???쇱뼱?⑸땲??',
        '???붿꽦':'媛먯젙怨?異⑸룞??異⑸룎?섎뒗 遺덉븞?뺥븳 ?쒓린?낅땲?? 遺꾨끂瑜??쒗쁽?섎뒗 嫄닿컯??猷⑦떞(?대룞쨌李쎌옉)??諛섎뱶???꾩슂?⑸땲??',
        '?좎꽦_?쒖뼇':'臾닿굅??梨낆엫??沅뚯쐞? 寃고빀?섎뒗 ?밸룆???깆옣 ?쒓컙?낅땲?? 踰꾪떚???먭? 寃곌뎅 ?뱀옄媛 ?⑸땲??',
        '?좎꽦_湲덉꽦':'?꾧꺽???꾩떎???щ옉?먮룄 移⑦닾?⑸땲?? ?깆닕?섍퀬 吏꾩????뚯떊???녿뒗 愿怨꾨뒗 ?먯뿰?ㅻ읇寃??뺣━?⑸땲??',
        '?좎꽦_?섏꽦':'瑗쇨세?섍퀬 移섎???遺꾩꽍??鍮쏆쓣 諛쒗빀?덈떎. 踰뺣쪧 臾몄꽌쨌怨꾩빟쨌?κ린 ?뚮옖???먭??섍린??理쒖쟻?낅땲??',
        '?좎꽦_??:'?대㈃???먮젮?怨??뺣㈃?쇰줈 留덉＜?섎뒗 ?쒓컙?낅땲?? ?щ━ 移섏쑀? ?먭린 ?댄빐媛 媛??源딆뼱吏??援?㈃?낅땲??',
        '?좎꽦_紐⑹꽦':'怨좊궃 ?앹뿉 遊꾩씠 ?듬땲?? ???쒕툕 湲곌컙???앸궇 臾대졄, ?ㅻ옯?숈븞 以鍮꾪븳 寃껊뱾???꾩떎?붾릺湲??쒖옉?⑸땲??',
        '?좎꽦_?붿꽦':'醫뚯젅怨?遺꾨끂媛 ?숈떆???볦뼱?ㅻ? ???덉뒿?덈떎. ?먮꼫吏瑜?洹쒖쑉 ?덇쾶 ?듭젣?섎뒗 寃껋씠 怨????쒓린???섎젴?낅땲??',
        '紐⑹꽦_?쒖뼇':'?됱슫怨?由щ뜑??씠 寃고빀, ?몄깮 理쒓퀬???꾩빟 ??대컢?낅땲?? ??李쎈Ц???ロ엳湲??꾩뿉 諛섎뱶??以묒슂??寃곗젙???대━?몄슂.',
        '紐⑹꽦_湲덉꽦':'?щЪ怨??щ옉, ?꾨쫫?ㅼ????숈떆???띿슂濡쒖썙吏??蹂듬맂 ?쒓린?낅땲?? 寃고샎쨌?ъ옄쨌?덉닠 紐⑤뱺 ?곸뿭?먯꽌 湲몄“媛 ?댁뼱吏묐땲??',
        '紐⑹꽦_?섏꽦':'吏?앹쓽 ?뺤옣??鍮꾩쫰?덉뒪 湲고쉶濡??댁뼱吏묐땲?? 怨꾩빟쨌?묒긽쨌異쒗뙋쨌媛뺤뿰?먯꽌 ??쇱슫 寃곌낵瑜?嫄곕몮 ???덉뒿?덈떎.',
        '紐⑹꽦_??:'?대㈃???띿슂媛 ?꾩떎濡??쇱퀜吏묐땲?? 遺?숈궛쨌媛議굿룹뿬???몃Ъ怨?愿怨꾨맂 ?됱슫??紐곕젮?듬땲??',
        '紐⑹꽦_?좎꽦':'?꾩떎?곸씤 怨꾪쉷怨??됱슫??留뚮굹???쒓컙?낅땲?? 臾대텇蹂꾪븳 ?뺤옣蹂대떎??寃利앸맂 寃껋뿉 吏묒쨷 ?ъ옄?섎㈃ ??寃곗떎??留븐뒿?덈떎.',
        '紐⑹꽦_?붿꽦':'怨쇨컧?섍쾶 ?꾩쟾?섎릺 諛⑺뼢???껋? 留덉꽭?? ????대컢??寃곕떒??紐⑦뿕? ?덉긽???뚯찉 ?곗뼱?섎뒗 ?깃낵瑜??녹뒿?덈떎.',
        '?붿꽦_?쒖뼇':'?먮꼫吏? ?섏?媛 ?뺤젏???ы빀?덈떎. 留앹꽕?꾩? 湲덈Ъ, ?좎젏?섎뒗 ?щ엺??紐⑤뱺 寃껋쓣 媛?멸컩?덈떎.',
        '?붿꽦_湲덉꽦':'?댁젙怨?留ㅻ젰????컻?⑸땲?? ?곗븷쨌?덉닠 李쎌옉?먯꽌 利됯컖?곸씤 ?깃낵媛 ?⑸땲?? ?? 媛먯젙??異⑸룞??議곗떖?섏꽭??',
        '?붿꽦_?섏꽦':'留먭낵 ?됰룞???좎뭅濡쒖썙吏묐땲?? ?묒긽쨌?ㅻ뱷쨌諛쒗몴?먯꽌 ?뺣룄?곸씤 ?먮꼫吏瑜?諛쒗쐶?섎뒗 ?쒓컙?낅땲??',
        '?붿꽦_??:'媛먯젙???붿궛????컻?????덉뒿?덈떎. 遺꾨끂? ?뺢뎄瑜?李쎌“???쒕룞?대굹 ?대룞?쇰줈 ?뱁솕?쒗궎??異쒓뎄 泥쒓린媛 ?꾩닔?낅땲??',
        '?붿꽦_?좎꽦':'?꾩쭊?섍퀬 ?띠? ?먮꼫吏媛 ?꾩떎??踰쎌뿉 遺?ろ엳??怨좏넻?ㅻ윭??援?㈃?낅땲?? 臾대━???뚰뙆蹂대떎 泥쒓린???고쉶瑜??좏깮?섏꽭??',
        '?붿꽦_紐⑹꽦':'?⑹냼泥섎읆 ?뚯쭊?섍퀬 ?낆닔由ъ쿂??硫由?遊먯빞 ?섎뒗 ?쒓컙?낅땲?? ??댄븳 ?뺤옣 泥쒓린媛 ?덉긽移?紐삵븳 ?諛뺤쓣 遺由낅땲??'
    };

    /* ?? ?곌컙 ?꾨줈?숈뀡 怨꾩궛 ?? */
    var HOUSE_KR = ['1?섏슦???먯븘쨌紐?','2?섏슦???щЪ쨌媛移?','3?섏슦???뚰넻쨌?대룞)',
                    '4?섏슦??媛?빧룸퓣由?','5?섏슦??李쎌“쨌?곗븷)','6?섏슦??嫄닿컯쨌?쇱긽)',
                    '7?섏슦??愿怨꽷룰퀎??','8?섏슦??蹂?샕룹떖??','9?섏슦??泥좏븰쨌?ы뻾)',
                    '10?섏슦???ы쉶쨌紐낆삁)','11?섏슦??怨듬룞泥는룸???','12?섏슦???곸꽦쨌???'];
    var PROFECTION_RULER = ['?붿꽦','湲덉꽦','?섏꽦','??,'?쒖뼇','?섏꽦','湲덉꽦','?붿꽦','紐⑹꽦','?좎꽦','?좎꽦','紐⑹꽦'];
    var profHouseIdx = (now.getFullYear()-y) % 12;
    var profHouse    = HOUSE_KR[profHouseIdx];
    var profSign     = astrologer.signs[(ascIndex+profHouseIdx)%12];
    var profRuler    = PROFECTION_RULER[profHouseIdx];
    /* ?꾨줈?숈뀡 ?곸꽭 ?댁꽍 ?곗씠??*/
    var profData = [
        {
            theme:'?먯븘 ?대?吏 由щ??몄쓽 ?? ?덈줈???섎? ?몄긽???좎뼵?섎씪.',
            detail:'?ы빐???뱀떊???뺤껜?깃낵 ?좎껜???대?吏瑜??꾨㈃ ?ъ젙?섑븯???댁엯?덈떎. 吏??12?꾩쓽 ?ъ씠?댁씠 ?꾩꽦?섍퀬 ?덈줈??12?꾩씠 ?쒖옉?⑸땲?? ?ㅼ뼱?ㅽ??셋룻뙣?샕룰굔媛?猷⑦떞 ???명삎??蹂?붽? ?대㈃??由ъ뀑怨?留욌Ъ由쎈땲?? "?섎뒗 ?꾧뎄?멸?"?????吏덈Ц??源딆뼱吏硫? ?먯떊留뚯쓽 怨좎쑀??諛⑺뼢?깆쓣 ?ъ꽑?명븯???쒓컙?낅땲??',
            career:'?ы빐 吏諛??됱꽦 ?붿꽦???됰룞 ?ㅽ뻾?μ쓣 ?뚯뼱?щ┰?덈떎. ?ㅻ옒 留앹꽕?대뜕 ??而ㅻ━??諛⑺뼢 ?꾪솚, ?ы듃?대━???뺣퉬, ?먭린?뚭컻???낅뜲?댄듃瑜?吏湲??뱀옣 ?쒖옉?섏꽭?? ?덈줈??吏곹븿?대굹 ??븷 ?쒖븞???ㅼ뼱?????덉쑝硫? 癒쇱? ?먯쓣 ?ㅺ린留??대룄 湲고쉶媛 ?대┰?덈떎.',
            love:'?덈줈???섎? ?쒕윭???먮━?먯꽌 ?먯뿰?ㅻ윭??留뚮궓???쒖옉?⑸땲?? 湲곗〈 愿怨꾨씪硫??닿? 蹂?뷀뻽?뚯쓣 ?뚰듃?덉뿉寃??쒗쁽?섍퀬 愿怨꾨? ?덈∼寃??뺤쓽?대낫?몄슂. ?먭린 ?뺤떊??留ㅻ젰???뺣룄?곸쑝濡??믪씠???댁엯?덈떎.',
            advice:'?앹씪 ?꾪썑濡?怨듦컻?곸씤 紐⑺몴 ?좎뼵(SNS쨌釉붾줈洹??????대낫?몄슂. ???대룞쨌?앹씠 猷⑦떞?쇰줈 紐몃???蹂?붿떆?ㅻ㈃ ?щ━쨌??紐⑤몢 ?곕씪?듬땲??'
        },
        {
            theme:'?덇낵 ?먯〈媛먯쓣 ?숈떆??梨숆린???? ??媛移섎? 利앸챸??湲고쉶.',
            detail:'?ы빐???ъ젙쨌?먯궛쨌?먭린 媛移??몄떇???듭떖 怨쇱젣?낅땲?? ?섏엯?먯쓣 ?뺣??섍굅??吏異?援ъ“瑜?媛쒖꽑?댁빞 ??紐낇솗???좏샇媛 ?듬땲?? ?덉뿉 ????먯〈媛??닿? 諛쏆븘????媛移????꾩떎 ?섏엯怨?吏곴껐?섎뒗 ?댁엯?덈떎. 媛移??덈뒗 寃껋뿉 ?ъ옄?섍퀬, ?먯떊???щ뒫?대굹 湲곗닠???곸젙??湲덉븸??泥?뎄?섎뒗 ?⑷린媛 ?꾩슂?⑸땲??',
            career:'湲됱뿬 ?묒긽, ?꾨━?쒖꽌 ?④? ?몄긽, ?ъ씠???꾨줈?앺듃 ?섏씡?붾? ?곴레 異붿쭊?섏꽭?? 吏諛??됱꽦 湲덉꽦???덉닠쨌酉고떚쨌怨좉컼 ?쒕퉬??遺꾩빞?먯꽌 ?섏씡 李ъ뒪瑜?以띾땲?? ?닿? ?섑븯??寃껋쓣 ?덉씠 ?섎뒗 ?뺥깭濡??⑦궎吏뺥븯??寃껋씠 ?ы빐 理쒖슦??怨쇱젣?낅땲??',
            love:'?곷?諛⑹뿉寃?吏?섏튂寃?留욎텛嫄곕굹 ???뺢뎄瑜??듭젣?섎뒗 愿怨??⑦꽩???먭??섏꽭?? ??媛移섎? ?뚭퀬 ??곕컺??愿怨꾨쭔 ?좎??섎뒗 ?좏깮???됰났???믪엯?덈떎.',
            advice:'?ъ젙 怨꾪쉷?쒕? ?덈줈 ?묒꽦?섍퀬, 遺덊븘?뷀븳 援щ룆쨌吏異쒖쓣 ?뺣━?섏꽭?? ?ъ옄 怨듬?瑜??쒖옉?섍굅???곴툑???섎굹 ???щ뒗 寃껋씠 誘몃옒瑜?諛붽퓠?덈떎.'
        },
        {
            theme:'留먭낵 湲???대챸??諛붽씀???? ?ㅽ듃?뚰겕瑜??곴레?곸쑝濡??볧???',
            detail:'?ы빐???뚰넻쨌?숈뒿쨌?대룞쨌?뺤젣?먮ℓ쨌洹쇨굅由??ㅽ듃?뚰겕媛 ?쒖꽦?붾맗?덈떎. 以묒슂??怨꾩빟, ?대찓?????? ?먭꺽利??섎굹媛 ?ㅼ젣 ?대챸??諛붽씀???댁엯?덈떎. ?붿????뚮옯?쇱쓣 ?쒖슜???먭린 ?쒗쁽???먮뱶?ъ쭊 寃곌낵瑜??낅땲?? ?몄뼱 怨듬?, 湲?곌린, 媛뺤쓽 ?섍컯???ъ옄??寃껋씠 鍮좊Ⅴ寃??뚯닔?⑸땲??',
            career:'釉붾줈洹맞룹쑀?쒕툕쨌?잛틦?ㅽ듃쨌SNS 梨꾨꼸??吏湲??쒖옉?섍굅??媛뺥솕?섏꽭?? 吏諛??됱꽦 ?섏꽦??怨꾩빟怨??묒긽?먯꽌 ?댁젏??以띾땲?? ?먭꺽利??쒗뿕, ?④린 援먯쑁 怨쇱젙 ?섎즺媛 ?ы빐 ?덉뿉 ?꾩꽦????媛?????⑤젰??諛쒗쐶?⑸땲??',
            love:'?뚰넻 諛⑹떇??蹂?붽? 愿怨꾨? ?덈∼寃??⑸땲?? ?섍퀬 ?띠? 留먯쓣 ?붿쭅?섍쾶 ?꾪븯硫?愿怨꾧? 源딆뼱吏묐땲?? ?대룞?대굹 紐⑥엫 ?먮━?먯꽌 ???몄뿰???앷만 媛?μ꽦???믪뒿?덈떎.',
            advice:'?쎌? ?딅뜕 梨낆쓣 ???ъ뿉 ??沅뚯뵫 ?쎄굅?? 愿???덉뿀??媛뺤쓽瑜?吏湲??깅줉?섏꽭?? 二쇰? ?щ엺?ㅼ뿉寃?癒쇱? ?곕씫??痍⑦븯??寃껋씠 ?됱슫??遺由낅땲??'
        },
        {
            theme:'媛議깃낵 ?щ━??湲곕컲???듭떖 怨쇱젣. ?대㈃???덉쟾吏?瑜?援ъ텞?섎씪.',
            detail:'?ы빐??媛?빧룹＜嫄걔룸?紐㉱룸퓣由?怨좏뼢)? 愿?⑤맂 ?댁뒋媛 ?쒕㈃?쇰줈 遺?곹빀?덈떎. ?댁궗쨌由щえ?몃쭅쨌媛議??뚮큵쨌遺?숈궛 愿??寃곗젙??吏묒쨷?⑸땲?? ?щ━??湲곕컲???붾뱾由ш굅???ъ젙鍮꾨릺???댁씠硫? ?대㈃ 移섏쑀? 媛먯젙??肉뚮━瑜??뚮낫??寃껋씠 ?몃? ?깃났蹂대떎 ?곗꽑?⑸땲??',
            career:'?ы깮洹쇰Т쨌?덉삤?쇱뒪 援ъ텞쨌媛議??ъ뾽 李몄뿬 ??吏묎낵 ?곌???而ㅻ━??蹂?붽? ?좊━?⑸땲?? 吏諛??됱꽦 ?ъ씠 吏곴????먮떒?μ쓣 ?믪뿬二쇰?濡?媛?????誘용뒗 寃곗젙??留욎뒿?덈떎. ???ы쉶???꾩빟蹂대떎???댁떎???ㅼ????댁엯?덈떎.',
            love:'媛議깆쓽 媛쒖엯???곗븷쨌寃고샎???곹뼢??誘몄묩?덈떎. ?뚰듃?덈? 媛議깆뿉寃??뚭컻?섍굅?? ?숆굅쨌寃고샎??寃곗젙?섎뒗 ?닿? ?????덉뒿?덈떎. 怨쇨굅 媛議깃낵??媛덈벑???덈떎硫??ы빐 ?뷀빐???ㅻ쭏由ш? ?앷퉩?덈떎.',
            advice:'吏??덉쓣 ?뺣━?뺣룉?섍퀬 ?몄븞??怨듦컙?쇰줈 袁몃??몄슂. ?щ━ ?곷떞?대굹 ?쇨린 ?곌린瑜??듯빐 ?대㈃???뚮━瑜??ｋ뒗 ?쒓컙??媛吏?몄슂.'
        },
        {
            theme:'?щ옉쨌李쎌옉쨌?먮??먭쾶 ?됱슫??吏묒쨷?섎뒗 ?? 利먭굅???異붽뎄?섎씪.',
            detail:'?ы빐??李쎌“???먭린 ?쒗쁽, ?곗븷, ?먮?(?먮뒗 李쎌옉 寃곌낵臾????⑷툑鍮??먮꼫吏媛 ?잛븘吏묐땲?? 吏꾩????곗븷, ?꾩떊쨌異쒖궛, ?덉닠 ?꾨줈?앺듃 ?꾩꽦, ?ㅽ룷痢?痍⑤???蹂멸꺽?붽? ?대（?댁????댁엯?덈떎. ?띠쓽 利먭굅????곴레?곸쑝濡?異붽뎄?섎뒗 寃??먯껜媛 ?댁쓣 ?뚯뼱?밴린??諛⑸쾿?낅땲??',
            career:'吏諛??됱꽦 ?쒖뼇??李쎌“??由щ뜑??뿉 ?섏쓣 ?ㅼ뼱以띾땲?? 怨듭뿰쨌?꾩떆쨌肄섑뀒?ㅽ듃쨌寃쎄린 ???먯떊???쒕윭?대뒗 臾대????곴레?곸쑝濡??곗뼱?쒖꽭?? 臾댁뼵媛 留뚮뱾怨??몄긽???대넃??寃껋씠 ?ы빐 理쒓퀬??泥쒓린?낅땲??',
            love:'?곗븷 ?쒖옉??媛??醫뗭? ?댁엯?덈떎. ?ㅻ젅??媛먯젙???듬늻瑜댁? 留먭퀬 ?쒗쁽?섏꽭?? ?대? ?곗씤???덈떎硫??ы뻾쨌?대깽????濡쒕㎤?깊븳 異붿뼲 留뚮뱾湲곌? 愿怨꾨? 源딄쾶 ?⑸땲??',
            advice:'?ㅻ옒 誘몃쨪?붾뜕 李쎌옉 ?쒕룞?대굹 痍⑤?瑜?吏湲??쒖옉?섏꽭?? ?꾩씠쨌?숈깮??媛瑜댁튂??遊됱궗??硫섑넗留??쒕룞???섏쇅???댁쓣 媛?몃떎以띾땲??'
        },
        {
            theme:'嫄닿컯 ?섑샇? 吏곸뾽??猷⑦떞??誘몃옒瑜?醫뚯슦?섎뒗 ??',
            detail:'?ы빐???쇱긽 猷⑦떞쨌嫄닿컯쨌?앹씠쨌吏곸옣 ?섍꼍쨌?쒕퉬???쒓났 諛⑹떇???듭떖 ?붾몢?낅땲?? ?묒? ?듦? ?섎굹媛 1??????李⑥씠瑜?留뚮뱶???댁엯?덈떎. 紐몄뿉 蹂대궡???좏샇瑜?臾댁떆?섏? 留먭퀬, 留뚯꽦 遺덊렪?㉱룻뵾濡쒓컧쨌?뚰솕 臾몄젣???뺣㈃?쇰줈 ??묓븯?몄슂. 吏곸옣?먯꽌???낅Т ?⑥쑉?깃낵 ?뷀뀒?쇱씠 ?됯? 湲곗????⑸땲??',
            career:'吏諛??됱꽦 ?섏꽦??遺꾩꽍?Β룸뜲?댄꽣 泥섎━쨌?몃???湲고쉷???섏쓣 以띾땲?? ?낅Т ?섏떇 ?먮쫫 媛쒖꽑, ?먮룞?????꾩엯, CRM ?뺣퉬 ???⑥쑉???믪씠??寃껋씠 ?깃낵濡??댁뼱吏묐땲?? ?꾨Ⅴ諛붿씠?맞룻뙆?명??꽷룸??낆쑝濡??섏엯?먯쓣 ?ㅼ뼇?뷀븯湲곗뿉??醫뗭? ?댁엯?덈떎.',
            love:'?곗씤 愿怨꾩뿉???쇱긽???뷀뀒??泥?껐쨌嫄닿컯쨌?묒? 諛곕젮)??媛먮룞??留뚮뱾?대깄?덈떎. 媛숈씠 ?대룞?섍굅???앸떒???섑샇?섎뒗 猷⑦떞??愿怨꾨? ?⑤떒?섍쾶 ?⑸땲??',
            advice:'??1??嫄닿컯 寃吏꾩쓣 ?ы빐 ?덉뿉 諛쏆쑝?몄슂. ?섎㈃쨌?앹씠 猷⑦떞???뺣퉬?섎㈃ ?먮꼫吏媛 ?덉뿉 ?꾧쾶 ?щ씪吏묐땲?? 二쇰? ?섍꼍(梨낆긽쨌?묒뾽 怨듦컙)???뺣━?섎뒗 寃껊룄 以묒슂?⑸땲??'
        },
        {
            theme:'以묒슂???뚰듃?덉떗쨌怨꾩빟쨌寃고샎 ?댁뒋媛 ?섎㈃ ?꾨줈 ?좎삤瑜몃떎.',
            detail:'?ы빐??1:1 愿怨?諛곗슦?먃룸퉬利덈땲???뚰듃?댟룰컯?ν븳 ?쇱씠踰?媛 ?띠쓽 二쇱텞?쇰줈 遺?곹빀?덈떎. 寃고샎쨌?댄샎쨌?숈뾽 怨꾩빟쨌以묒슂???묒빟???대（?댁?嫄곕굹 醫낃껐?섎뒗 ?댁엯?덈떎. 吏꾩젙???섎??먯꽌???뚰듃?덉떗???ㅽ뿕?섍퀬 ?ъ젙?섑븯???쒓컙?쇰줈, ?濡??낆＜?섎뜕 ?⑦꽩??"?④퍡"濡??꾪솚?섎뒗 ?⑷린媛 ?붽뎄?⑸땲??',
            career:'吏諛??됱꽦 ?붿꽦???묒긽?κ낵 寃곕떒?μ쓣 媛뺥솕?⑸땲?? ?⑹옉쨌?쒗쑕쨌議곗씤??踰ㅼ쿂 ???뚰듃?덉떗 湲곕컲 ?꾨줈?앺듃媛 ?좊━?⑸땲?? 怨꾩빟??寃?좊뒗 諛섎뱶???꾨Ц媛? ?④퍡 ?섏꽭??',
            love:'寃고샎쨌?뺤떇 而ㅽ뵆 ?좎뼵?????댁뿉 留롮씠 ?대（?댁쭛?덈떎. ?κ린 ?곗븷?쇰㈃ 愿怨꾨? 怨듭떇?뷀븯嫄곕굹 誘몃옒瑜?援ъ껜?곸쑝濡??쇱쓽?댁빞 ???쒖젏?낅땲?? 湲곗〈 愿怨꾩뿉???곹룓(遺덇퇏??媛 ?쒕윭?섍린???⑸땲??',
            advice:'吏湲?留뚮굹怨??덈뒗 ?뚰듃???곗씤쨌?숈뾽?????愿怨꾨? ?붿쭅?섍쾶 ?ы룊媛?섏꽭?? ?ㅻ옒 諛⑹튂??踰뺤쟻쨌怨꾩빟 ?쒕쪟媛 ?덈떎硫??ы빐 ?덉뿉 ?뺣━?섏떗?쒖삤.'
        },
        {
            theme:'?щ━??蹂?섍낵 ?좎궛쨌?ъ옄쨌?諛??愿怨꾧? 二?臾대?.',
            detail:'?ы빐???덉뿉 蹂댁씠吏 ?딅뒗 ??蹂?붽? 臾쇰컩?먯꽌 吏꾪뻾?⑸땲?? ?좎궛쨌怨듬룞 ?ъ궛쨌議곗꽭쨌蹂댄뿕쨌?ъ옄쨌?異?媛숈? ??몄쓽 ?먯썝 ?댁뒋媛 遺媛곷릺硫? ?щ━?곸쑝濡쒕뒗 源딆? ?대㈃???먮젮?쨌吏묒갑쨌?듭젣 ?뺢뎄? 留덉＜?섎뒗 ?댁엯?덈떎. 二쎌쓬쨌?ъ깮쨌?꾧린쨌蹂?섏쓽 ?먮꼫吏媛 留대룎吏留? ??怨쇱젙??嫄곗퀜?쇰쭔 吏꾩젙???덈컮轅덉씠 ?쒖옉?⑸땲??',
            career:'吏諛??됱꽦 ?붿꽦??鍮꾧났媛?泥쒓린 ?ㅽ뻾???섏쓣 以띾땲?? 鍮꾨? ?꾨줈?앺듃, ?諛??以鍮? ?섎㈃ ?꾨옒?먯꽌???ъ옄媛 ?댄썑 ??寃곗떎濡??쒕윭?⑸땲?? 遺梨??뺣━쨌?멸툑 ?섑샇쨌?щТ 援ъ“ 媛쒖꽑???ы빐 ?덉뿉 ?⑦뻾?섏꽭??',
            love:'愿怨꾩뿉??媛먯텛?댁쭊 ?щ━???⑦꽩(吏묒갑쨌?듭젣쨌?먮젮?)???쒕㈃?붾맗?덈떎. ?대? ?④퍡 ?ㅻ（硫?愿怨꾧? ?쒖링 ?깆닕?댁쭛?덈떎. ?뱀뒋?쇰━?곗? 移쒕?媛먯쓽 源딆씠瑜??ы깘?됲븯???쒓컙?닿린???⑸땲??',
            advice:'?ㅻ옒 臾듯????щ━???곸쿂???먮젮????꾨Ц媛???꾩??쇰줈 ?뺣㈃ ?뚰뙆?섏꽭?? ?ъ젙 ?곹깭 ?먭?(蹂댄뿕쨌?덇툑쨌?ъ옄)?????댁뿉 諛섎뱶???섑뻾?섏떗?쒖삤.'
        },
        {
            theme:'?댁쇅쨌?숈뾽쨌醫낃탳媛 ?덈줈??吏?됱쓣 ?댁뼱二쇰뒗 ?먯쑀????',
            detail:'?ы빐??湲곗〈???멸퀎愿怨?寃쎄퀎瑜??섏뼱 ???볦? 吏?됱쑝濡??뺤옣?섎뒗 ?먯쑀???댁엯?덈떎. ?댁쇅?ы뻾쨌?좏븰쨌?대?쨌怨좊벑 援먯쑁쨌泥좏븰쨌醫낃탳쨌異쒗뙋???듭떖 ?ㅼ썙?쒖엯?덈떎. ?뱀떊??誘우쓬 泥닿퀎? ?몄깮???섎?瑜??ъ젙由쏀븯???대줈, ??꽑 寃껉낵 留뚮궓??媛?????댁쓣 遺덈윭?듬땲??',
            career:'吏諛??됱꽦 紐⑹꽦??紐⑤뱺 ?뺤옣 ?곸뿭???좉컻瑜??ъ븘以띾땲?? ?댁쇅 鍮꾩쫰?덉뒪, ?멸뎅???듬뱷, ?숈쐞 怨쇱젙, 湲濡쒕쾶 ?뚮옯??吏꾩텧??媛???좊━????대컢?낅땲?? 異쒗뙋쨌媛뺤뿰쨌而⑥꽕?낆씠 ?덉긽 ?댁긽???깃낵瑜??낅땲??',
            love:'?ㅻⅨ 臾명솕쨌醫낃탳쨌諛곌꼍??媛吏??щ엺怨쇱쓽 ?몄뿰???잕퉩?덈떎. 湲곗〈 ?뚰듃?덉? ?④퍡 ?댁쇅?ы뻾?대굹 ?숈뒿 寃쏀뿕??怨듭쑀?섎㈃ 愿怨꾧? ?ш쾶 ?깆옣?⑸땲??',
            advice:'1???덉뿉 諛섎뱶????踰덉? ??꽑 怨듦컙(援?쇅 ?ы뻾 ?먮뒗 泥섏쓬 媛??吏?????ㅻ??ㅼ꽭?? 湲?곌린쨌媛뺤쓽쨌?잛틦?ㅽ듃 ???섏쓽 ?댁빞湲곕? ?몄긽???꾨떖?섎뒗 ?묒뾽???쒖옉?섎뒗 寃껋씠 ?댁쓣 ?쎈땲??'
        },
        {
            theme:'而ㅻ━?댁쓽 ?뺤젏???ν빐 ?щ━???깃낵???? ?ы쉶????댄? ?띾뱷 吏묒쨷.',
            detail:'?ы빐???ы쉶??紐낆꽦쨌而ㅻ━?는룰났???깆랬媛 理쒖쟾硫댁뿉 ?섏꽌???댁엯?덈떎. 10??以?媛??二쇰ぉ諛쏅뒗 ?쒓컙?쇰줈, 吏湲덇퍘 ?볦븘??紐⑤뱺 寃껋씠 ??몄쟻?쇰줈 ?몄젙諛쏆쓣 湲고쉶媛 ?대┰?덈떎. ?곸궗??沅뚯쐞?먯쓽 ?덉뿉 ?꾧퀬, 怨듭떇?곸씤 ??댄?怨?吏?꾧? ?낃렇?덉씠?쒕맗?덈떎.',
            career:'吏諛??됱꽦 ?좎꽦???뺢퀬???ㅻ젰 利앸챸???붽뎄?섏?留? 洹몃쭔??寃곌낵??寃ш퀬?⑸땲?? ?대젰???뺣퉬쨌?ы듃?대━??怨듦컻쨌?몄궗 硫대떞 ?붿껌쨌?낃퀎 ?됱궗 李멸?瑜??곴레?곸쑝濡?異붿쭊?섏꽭?? 吏湲덉씠 而ㅻ━???쎌쓣 李띿쓣 ??대컢?낅땲??',
            love:'?ы쉶??吏?꾨굹 怨듭쟻 ?깃났??怨듭쑀?????덈뒗 ?뚰듃?덈? ?먰븯寃??⑸땲?? ?곗씤?먭쾶 ?섏쓽 紐⑺몴? 轅덉쓣 ?붿쭅??怨듭쑀?섍퀬, 洹멸쾬??吏吏?섎뒗 愿怨꾩씤吏 ?뺤씤?섎뒗 ?댁엯?덈떎.',
            advice:'紐낇븿???덈줈 留뚮뱾怨? 留곹겕?쒖씤쨌?꾨Ц SNS ?꾨줈?꾩쓣 理쒖떊?뷀븯?몄슂. ?낃퀎?먯꽌 ?뚮젮吏??寃? ?됱궗?먯꽌 諛쒗몴?섎뒗 寃??섎굹?섎굹媛 ?댁쓣 ?댁뼱以띾땲??'
        },
        {
            theme:'怨듬룞泥댁? 鍮꾩쟾, ?곗젙???몄깮???뺤옣?쒗궎???곕?????',
            detail:'?ы빐???몃㎘쨌怨듬룞泥는룹냼???ㅽ듃?뚰겕쨌誘몃옒 鍮꾩쟾쨌?ы쉶???댁긽??以묒떖 二쇱젣濡??깆옣?⑸땲?? ?ㅻ옒??移쒓뎄? ?ш껐?⑺븯嫄곕굹, 媛移섍???媛숈? ?덈줈??洹몃９怨??⑸쪟?섎뒗 湲고쉶媛 ?듬땲?? ?쇱옄蹂대떎 ?④퍡????????轅덉씠 ?ㅽ쁽?⑸땲??',
            career:'吏諛??됱꽦 ?좎꽦??吏??媛?ν븳 ?ㅽ듃?뚰겕 援ъ텞??媛뺤“?⑸땲?? ?묓쉶 媛?끒룹뒪?곕뵒 紐⑥엫쨌而ㅻ??덊떚 由щ뜑 ??븷???덉긽移?紐삵븳 湲고쉶瑜??곌껐?댁쨳?덈떎. ?ы쉶?????CSR쨌?ы쉶 ?대룞)? ?곌껐???꾨줈?앺듃?먯꽌 釉뚮옖??媛移섍? ?믪븘吏묐땲??',
            love:'怨듯넻??媛移섍?쨌?대뀗쨌?쒕룞???듯빐 ?덈줈???몄뿰???쒖옉?⑸땲?? ?뚭컻?낅낫???④퍡?섎뒗 臾댁뼵媛(紐⑥엫쨌遊됱궗쨌?꾨줈?앺듃)?먯꽌 留뚮굹???몄뿰????源딆뒿?덈떎.',
            advice:'吏湲??랁빐 ?덈뒗 紐⑥엫?대굹 而ㅻ??덊떚?먯꽌 ???곴레?곸쑝濡?湲곗뿬?섏꽭?? ?덈줈???숉샇?뙿룸룆?쒕え?꽷룹쭅???⑥껜 媛?낆씠 ?ы빐 ?몄깮???뺤옣?쒗궎???댁뇿?낅땲??'
        },
        {
            theme:'?대㈃ ?뺥솕쨌?곸꽦쨌??붿씠 ?ㅼ쓬 ???ъ씠?댁쓣 以鍮꾩떆?ㅻ뒗 ??',
            detail:'?ы빐??12???ъ씠?댁쓽 留덉?留??대줈, ?대㈃ ?뺥솕? ?곸쟻 以鍮꾩쓽 ?쒓컙?낅땲?? ?④꺼吏??겶룹옄湲??먯떊??臾댁쓽?씲룰낵嫄??낅낫媛 ?쒕㈃?붾맗?덈떎. ?몃????붾젮?⑤낫??怨좎슂???먭린 ?깆같怨??뷀넚?ㅺ? 吏꾩쭨 ?댁쓣 以鍮꾩떆?듬땲?? ?껋뼱踰꾨┛ 寃껋씠 ?덉뼱???숇떞?섏? 留덉꽭????12?섏슦?ㅻ뒗 ?꾩슂 ?녿뒗 寃껊뱾??踰꾨━寃??섎뒗 ?먯뿰?ㅻ윭???뺥솕 怨쇱젙?낅땲??',
            career:'吏諛??됱꽦 紐⑹꽦??蹂댁씠吏 ?딅뒗 怨녹뿉???ㅼ쓬 湲고쉶瑜?以鍮꾩떆耳쒖쨳?덈떎. ???꾨㈃???꾩빟蹂대떎???ㅻ젰???諛???볤퀬, ?대뀈???꾪븳 ?⑥븮???щ뒗 ?댁엯?덈떎. 蹂묒썝쨌蹂듭?湲곌?쨌醫낃탳?⑥껜쨌?곌뎄 湲곌?怨??곌껐???쇱씠 ??湲곌컙???댁슱由쎈땲??',
            love:'?곗씤怨쇱쓽 愿怨꾩뿉???쒕줈 ?뚯븘?붾뜕 ?⑦꽩??誘쇰궚???쒕윭?섎뒗 ?댁엯?덈떎. ?대? ?④퍡 ?섍린硫?愿怨꾧? 源딆뼱吏怨? 洹몃젃吏 紐삵븯硫??먯뿰?ㅻ읇寃??뺣━?⑸땲??',
            advice:'??????諛섎뱶???뺢린?곸씤 ?쇱옄留뚯쓽 臾듭긽쨌?곗콉쨌紐낆긽 ?쒓컙??媛吏?몄슂. ?ㅻ옒 ?뚯뼱??吏묒갑怨?臾듭? 媛먯젙???대젮?볥뒗 ?섏떇(?몄? ?곌린쨌?쇨린쨌?ы뻾)???대낫?몄슂. ?ㅼ쓬 ?댁쓽 ?덈줈??異쒕컻???꾪븳 怨듦컙??吏湲?留덈젴?섎뒗 寃껋씠 理쒖꽑??泥쒓린?낅땲??'
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
    var ascDegText = (chart.asc && chart.asc.deg != null) ? chart.asc.deg.toFixed(2) + '째' : '-';
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
      return astrologer.signs[sIdx] + ' ' + String(deg0).padStart(2,'0') + '째' + String(min0).padStart(2,'0') + "'";
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
        {d:0, n:'??留욌뒗 媛???', orb:6},
        {d:60, n:'?꾩? 媛??≫빀)', orb:4},
        {d:90, n:'湲댁옣 媛?吏곴컖)', orb:5},
        {d:120, n:'?명븳 媛??쇳빀)', orb:5},
        {d:180, n:'留덉＜蹂대뒗 媛?異?', orb:6}
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
      Sun:'?쒖뼇', Moon:'??, Mercury:'?섏꽦', Venus:'湲덉꽦', Mars:'?붿꽦',
      Jupiter:'紐⑹꽦', Saturn:'?좎꽦', Uranus:'泥쒖솗??, Neptune:'?댁솗??, Pluto:'紐낆솗??
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
          text: planetKr[pa] + ' - ' + planetKr[pb] + ' : ' + asp.name + ' (orb ' + asp.orb.toFixed(2) + '째)',
          orb: asp.orb
        });
      }
    }
    majorAspectRows.sort(function(a,b){ return a.orb - b.orb; });
    var majorAspectHtml = majorAspectRows.slice(0,6).map(function(r){
      return '<li style="margin-bottom:4px;">'+r.text+'</li>';
    }).join('') || '<li>吏湲덉? 媛뺥븯寃?遺숇뒗 媛곸씠 ?곸뼱?? ???붾뱾由??놁씠 ?붿옍???먮쫫?낅땲??</li>';

    var elemWeakest = Object.keys(elemCount).reduce(function(a,b){ return elemCount[a] <= elemCount[b] ? a : b; });
    var elemShortNames = { fire:'遺?, earth:'??, air:'怨듦린', water:'臾? };
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

    masterInsight = '<div class="astro-section precision-insight-card" style="border-left:4px solid #D4AF37; background:linear-gradient(to right, rgba(212,175,55,0.05), transparent); margin-bottom:20px;">'
      +'<div class="astro-subhead" style="color:#D4AF37;">????蹂꾩옄由?3以??듭떖 ?붿빟</div>'
      +'<div class="astro-desc" style="font-size:0.95rem;white-space:normal;word-break:break-word;overflow-wrap:anywhere;max-width:100%;box-sizing:border-box;">'
      +'<p><b class="precision-headline">?뙙 ?섎뒗 ?대뼡 ?щ엺?멸??</b><br>'
      +'?쒖뼇 <b>'+sunSign+'</b>? "??湲곕낯 ?깃꺽", ??<b>'+moonSign+'</b>? "媛먯젙 踰꾪듉", ?곸듅沅?<b>'+ascSign+'</b>? "泥レ씤??罹먮┃???낅땲?? '
      +'????媛吏媛 ?⑹퀜???뱀떊留뚯쓽 遺꾩쐞湲곕? 留뚮벊?덈떎.</p>'
      +'<p><b class="precision-headline">?뮆 ?щ옉???뚮뒗?</b><br>'
      +'湲덉꽦 <b>'+venusSign+'</b>('+venusHousePair+')? 醫뗭븘?섎뒗 ?щ엺?먭쾶 蹂댁씠??留ㅻ젰 ?ъ씤?? ?붿꽦 <b>'+marsSign+'</b>('+marsHousePair+')? ?뚮┝???앷꼈?????됰룞?섎뒗 諛⑹떇?낅땲?? '
      +(vmAspect || vmCalcFallback)+'</p>'
      +'<p><b class="precision-headline">?룇 而ㅻ━?댁? ?덉??</b><br>'
      +'泥쒖젙(MC) <b>'+mcSign+'</b>? "?대뼡 ?대?吏濡??몄젙諛쏅뒗吏", ?좎꽦 <b>'+saturnSign+'</b>('+saturnHousePair+')? "?쒓컙 ?ㅼ뿬 ?덈꺼?낇븷 援ш컙"?낅땲?? '
      +'?됱슫 ?ъ씤???щⅤ?щ굹) <b>'+fortunaSign+'</b>('+fortunaHousePair+')? ?깃낵媛 遺숇뒗 ?먮━, ?뚮챸(?ㅽ뵾由? <b>'+spiritSign+'</b>('+spiritHousePair+')? ?ㅻ옒 ?대룄 吏移섏? ?딅뒗 ?먮━?덉슂.</p>'
      +'</div></div>';

    var tightAspectText = majorAspectRows.length ? majorAspectRows[0].text : '??댄듃 二쇱슂媛??놁쓬';
    var retroText = retroPlanets.length ? retroPlanets.join(', ') : '??뻾 二쇱슂 ?됱꽦 ?놁쓬';
    var imbalanceText = '吏湲???湲곕낯 臾대뱶??'+elemDomNames[elemDominant]+' ('+elemPct[elemDominant]+'%)?닿퀬, 蹂댁셿???꾩슂??履쎌? '+elemShortNames[elemWeakest]+' ('+elemPct[elemWeakest]+'%)?댁뿉??';
    var precisionComment = '?ㅻ뒛 媛???덉뿉 ?꾨뒗 蹂꾩쓽 媛곸? "'+tightAspectText+'"?닿퀬, ?먭????꾩슂???됱꽦 ?먮쫫? '+retroText+'?낅땲??';
    var complementElementByDominant = { fire:'臾???, earth:'遺?怨듦린', air:'??臾?, water:'遺?怨듦린' };
    var relationComplementElement = complementElementByDominant[elemDominant] || '蹂댁셿 ?먯냼';

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
    var focusHouseText = topFocusHouse ? (topFocusHouse+'?섏슦?ㅼ뿉 ?됱꽦 '+topFocusCount+'媛?吏묒쨷') : '?먮꼫吏媛 ?щ윭 ?곸뿭??怨좊Ⅴ寃??쇱쭊 ???;
    var axisGap = (sunIndex - moonIndex + 12) % 12;
    var axisGapDesc = (axisGap === 0) ? '?섏떇-?뺤꽌 ?쇱튂?? : (axisGap === 6 ? '?섏떇-?뺤꽌 ?移?삎(湲댁옣/蹂댁셿)' : '?섏떇-?뺤꽌 ?쇳빀??);
    var relationAxisText = '吏湲?愿怨??ㅼ썙?쒕뒗 "??湲곗? 吏?ㅺ린"? "?곷? ?띾룄 留욎텛湲???洹좏삎?댁뿉?? ??以??섎굹留?諛硫??쎄쾶 吏移⑸땲??';
    var transitExecutionText = '吏湲?紐⑹꽦 ?먮쫫? '+jupiterHousePair+' ?곸뿭?먯꽌 ?뱁엳 泥닿컧??而ㅼ슂. ??二쇱젣???먮꼫吏瑜?二쇰㈃ ?깃낵媛 鍮⑤━ 遺숈뒿?덈떎.';
    var houseTopicMap = {
      1:'?먭린?뺤껜???좎껜/媛쒖씤 釉뚮옖??, 2:'?ъ젙/?먯썝/媛移섏껜怨?, 3:'?숈뒿/肄섑뀗痢??뚰넻',
      4:'媛??嫄곗＜/?щ━湲곕컲', 5:'李쎌옉/?곗븷/?먮?', 6:'?낅Т猷⑦떞/嫄닿컯/?ㅻТ',
      7:'愿怨?怨꾩빟/?뚰듃?덉떗', 8:'怨듬룞?ъ젙/蹂???ъ링?щ━', 9:'?숇Ц/?ы뻾/?멸퀎愿 ?뺤옣',
      10:'而ㅻ━??紐낆꽦/怨듭쟻?깃낵', 11:'?ㅽ듃?뚰겕/而ㅻ??덊떚/?κ린鍮꾩쟾', 12:'?뚮났/?뺣━/臾댁쓽??
    };
    var topHouseTopic = topFocusHouse ? (houseTopicMap[topFocusHouse] || '蹂듯빀 二쇱젣') : '遺꾩궛 ?댄뻾';
    var retroFocusText = retroPlanets.length
      ? ('吏湲덉? '+retroPlanets.join(', ')+' ??媛) "?ㅼ떆 蹂닿린 紐⑤뱶"?덉슂. ?쒕몢瑜닿린蹂대떎 ?먭? ???ㅽ뻾???좊━?⑸땲??')
      : '吏湲덉? ?ㅻ룎?꾨낵 蹂?섎낫???욎쑝濡?諛?대텤???먮쫫????媛뺥빀?덈떎.';
    var firdariaPrecisionNote = '硫붿씤 ??꾨줈??'+firdariaMain.kr+'? 李⑦듃 吏묒쨷異?'+focusHouseText+')怨?寃고빀????泥닿컧 ?④낵媛 而ㅼ쭛?덈떎. ?꾩옱 ?곗꽭 ?묒떇? '+modalityNames[modalityDominant]+'?대?濡??ㅽ뻾 ?쒗룷瑜????묒떇??留욎텛??寃껋씠 ?⑥쑉?곸엯?덈떎.';
    var profectionPrecisionNote = '?꾨줈?숈뀡 '+profHouse+'???ㅼ젣 ?ㅽ뻾 ?뚮쭏??'+topHouseTopic+'? 媛뺥븯寃??곌껐?⑸땲?? ?ы빐??'+focusHouseText+'瑜??곹뿕 吏?쒖쿂???섑샇?좎닔濡??깃낵 ?ы쁽?깆씠 ?믪븘吏묐땲??';
    var firdariaPairByKr = {
      '?쒖뼇': sunHousePair,
      '??: moonHousePair,
      '?섏꽦': mercuryHousePair,
      '湲덉꽦': venusHousePair,
      '?붿꽦': marsHousePair,
      '紐⑹꽦': jupiterHousePair,
      '?좎꽦': saturnHousePair
    };
    function _primaryHouseFromPair(pairText){
      if(!pairText) return null;
      var m = String(pairText).match(/(\d+)H/);
      return m ? Number(m[1]) : null;
    }
    var firdariaMainPair = firdariaPairByKr[firdariaMain.kr] || '-';
    var firdariaMainHouse = _primaryHouseFromPair(firdariaMainPair);
    var firdariaMainTopic = firdariaMainHouse ? (houseTopicMap[firdariaMainHouse] || '蹂듯빀 二쇱젣') : topHouseTopic;
    var firdariaDynamic = {
      theme: firdariaMain.kr+' 硫붿씤 ??꾨줈?쒕뒗 '+firdariaMainPair+' 異뺤뿉???묐룞?섎ŉ, ?꾩옱 ?듭떖 ?섏젣??'+firdariaMainTopic+'?낅땲??',
      detail: '吏湲?硫붿씤 ?댄뻾 ?됱꽦??臾대?('+firdariaMainPair+')? ??吏묒쨷 臾대?('+focusHouseText+')媛 寃뱀튂硫? 泥닿컧?섎뒗 ?쇱씠 ???먮졆?섍쾶 ?ㅼ뼱?듬땲?? '+precisionComment,
      career: '而ㅻ━?대뒗 '+firdariaMainTopic+'怨?MC '+mcSign+'瑜??곌껐???ㅽ뻾?섎뒗 諛⑹떇???좊━?⑸땲?? 90???⑥쐞濡?紐⑺몴瑜?履쇨컻怨?'+modalityAdvice[modalityDominant],
      love: '愿怨꾨뒗 ??'+moonHousePair+' ?덉젙異뺢낵 湲덉꽦/?붿꽦 '+venusHousePair+' 쨌 '+marsHousePair+' 議곗쑉???듭떖?낅땲?? '+(vmAspect || vmCalcFallback),
      caution: retroFocusText+' ?뱁엳 '+firdariaMain.kr+' ??꾨줈??湲곌컙?먮뒗 '+firdariaMainTopic+' ?곸뿭?먯꽌 怨쇱냽 寃곗젙???쇳븯??寃껋씠 ?덉쟾?⑸땲??',
      advice: '?ㅽ뻾 ?ъ씤?몃뒗 '+firdariaMainTopic+' 1媛? 猷⑦떞 1媛? 寃利?吏??1媛쒕? 怨좎젙?섎뒗 寃껋엯?덈떎. '+firdariaPrecisionNote
    };
    var profectionDynamic = {
      theme: '?ы빐 ?꾨줈?숈뀡? '+profHouse+' 以묒떖?쇰줈 ?꾧컻?섎ŉ, ?ㅼ쟾 ?뚮쭏??'+topHouseTopic+'? 寃고빀?⑸땲??',
      detail: '吏諛?蹂꾩옄由?'+profSign+'怨?吏諛??됱꽦 '+profRuler+'???ы빐 ?섏궗寃곗젙??湲곗??먯엯?덈떎. '+profectionPrecisionNote,
      career: '?낅Т/?ъ젙? '+profHouse+' 二쇱젣? MC '+mcSign+'瑜??곌껐???곹뿕 吏???ㅺ퀎媛 ?⑥쑉?곸엯?덈떎. '+focusHouseText+'瑜??ㅽ뻾 ?곗꽑?쒖쐞 ?곷떒???먯꽭??',
      love: '愿怨꾨뒗 Desc '+descSign+' 異뺢낵 ??'+moonHousePair+' ?덉젙異뺤쓣 癒쇱? 留욎텣 ?? 湲덉꽦/?붿꽦 '+venusHousePair+' 쨌 '+marsHousePair+' 由щ벉??議곗쑉????吏?띿꽦???믪븘吏묐땲??',
      advice: '?곌컙 ?댄뻾? 遺꾧린 4???먭????곹빀?⑸땲?? 留?遺꾧린留덈떎 '+profHouse+' 愿???곗텧臾?1媛쒕? 怨좎젙?섍퀬, '+modalityNames[modalityDominant]+' ?쒗룷濡??ㅽ뻾?섏꽭??'
    };
    var sunArchetype = sunArchetypeByIdx[sunIndex] || '蹂듯빀???먯븘 ?꾧컻';
    var sunStrategy = sunStrategyByIdx[sunIndex] || '?듭떖 ?곗꽑?쒖쐞瑜?3媛쒕줈 ?쒗븳???ㅽ뻾?섍린';
    var sunCoreInterpretation = '?쒖뼇 '+sunSign+'('+sunHousePair+')? <b>'+sunArchetype+'</b> ??낆쓽 留ㅻ젰??蹂댁뿬以섏슂. '
      +'吏湲???留덉쓬-?됰룞 由щ벉? <b>'+axisGapDesc+'</b>??媛源앷퀬, '+imbalanceText+' '
      +'?ㅽ뻾 ?ㅽ??쇱? '+modalityNames[modalityDominant]+' 履쎌씠 媛뺥빐?? 洹몃옒???ㅻ뒛? <b>'+sunStrategy+'</b>瑜?'+topHouseTopic+' ?곸뿭??癒쇱? ?⑤낫??寃?媛???⑥쑉?곸엯?덈떎.';

    var astroKeywordLine = '#'+(resilientString(topHouseTopic).split('/')[0] || '?ㅻ뒛?섑룷?명듃')+' #'+(elemShortNames[elemWeakest] ? ('諛몃윴??+elemShortNames[elemWeakest]) : '諛몃윴?ㅼ뾽')+' #'+(modalityNames[modalityDominant].indexOf('?쒕룞沅?)>=0?'諛붾줈?ㅽ뻾':'猷⑦떞?뺣━');
    function resilientString(v){ return String(v || '').replace(/\s+/g,'').replace(/[()]/g,''); }
    var astroMoodLine = '?ㅻ뒛? '+moodLineByBattery();
    function moodLineByBattery(){
      if((retroPlanets||[]).length>=2) return '?띾룄蹂대떎 ?먭????닿린???좎씠?먯슂. 硫붿떆吏? ?쎌냽? ??踰????뺤씤?섎㈃ ?⑥뵮 ?명빐?몄슂. ?뙔';
      if(topFocusCount>=3) return '吏묒쨷?μ씠 媛뺥븯寃?紐⑥뿬?? ?댁빞 ?????섎굹瑜??ш쾶 ?앸궡???꾨왂????留욎븘?? ??';
      return '怨좊Ⅴ寃??먮Ⅴ???좎씠?먯슂. 臾대━?섏? ?딄퀬 袁몄???媛硫?寃곌낵媛 ?곕씪?듬땲?? ?뙼';
    }
    var boosterColorMap = { fire:'肄붾엫/?덈뱶', earth:'踰좎씠吏/移대찞', air:'誘쇳듃/?ㅼ뭅??, water:'?ㅼ씠鍮?釉붾（' };
    var boosterPlaceMap = { 1:'?ъ뒪?μ씠???대룞 怨듦컙', 2:'????ы뀒???명듃 ?뺣━ 怨듦컙', 3:'移댄럹???ㅽ꽣??怨듦컙', 4:'吏?洹쇱쿂 議곗슜??怨듦컙', 5:'?꾩떆/怨듭뿰/痍⑤? 怨듦컙', 6:'?곗뒪???뺣━???낅Т 怨듦컙', 7:'?쎌냽 ?μ냼/誘명똿 怨듦컙', 8:'?쇱옄 吏묒쨷?????덈뒗 怨듦컙', 9:'?쒖젏/媛뺤뿰/?ы뻾 怨꾪쉷 怨듦컙', 10:'?ㅽ뵾???꾨줈???뺣━ 怨듦컙', 11:'紐⑥엫/而ㅻ??덊떚 怨듦컙', 12:'?곗콉濡?紐낆긽 怨듦컙' };
    var astroBoosterColor = boosterColorMap[elemDominant] || '?ㅼ씠鍮?誘쇳듃';
    var astroBoosterPlace = boosterPlaceMap[topFocusHouse] || '議곗슜??移댄럹';

    var html = '<div class="astro-body cosmic-theme star-container" id="astroBodyWrap">'
      +'<div class="astro-section" style="border-left:4px solid #22d3ee;background:linear-gradient(to right, rgba(34,211,238,.08), transparent);margin-bottom:16px;">'
      +'<div class="astro-subhead" style="color:#67e8f9;">???ㅻ뒛??蹂꾩옄由?釉뚮━??/div>'
      +'<div class="astro-desc">'
      +'<p><b>?ㅻ뒛???듭떖 ?ㅼ썙??</b> '+astroKeywordLine+'</p>'
      +'<p><b>蹂꾨뱾???꾪븯???쒕쭏??</b> '+astroMoodLine+' '+relationAxisText+'</p>'
      +'<p><b>?닿굔 瑗?梨숆린?몄슂!</b><br>1) 以묒슂???듭옣? 10珥??ш퀬 蹂대궡湲?br>2) ?ㅻ뒛???듭떖 怨쇱젣 1媛쒕쭔 癒쇱? ?앸궡湲?br>3) ??湲곕텇 諛고꽣由??⑥뼱吏硫??쇱젙 1媛?怨쇨컧??以꾩씠湲?/p>'
      +'<p><b>?됱슫??遺?ㅽ꽣:</b> '+astroBoosterColor+' ??+ '+astroBoosterPlace+' + 臾?????猷⑦떞 ?뮛</p>'
      +'</div></div>'
      + masterInsight
      +'<div class="astro-subhead">?뿺 0. ???꾩깮 蹂꾩옄由?吏??/div>'
        +'<div class="astro-desc">'
      +'<p>???쒕뒗 "?쒖뼱???쒓컙 ?섎뒛 ?ъ쭊"?대씪怨??앷컖?섎㈃ ?쎌뒿?덈떎. ?섏슦??1H~12H)??洹??먮꼫吏媛 ?띠쓽 ?대뼡 遺꾩빞(?? ?щ옉, ?? 愿怨????먯꽌 媛뺥븯寃??곗씠?붿? 蹂댁뿬以섏슂.</p>'
        +'<div class="table-wrapper" style="border:1px solid rgba(148,163,184,0.2);border-radius:10px;margin:10px 0;">'
        +'<table class="astro-table" style="font-size:0.83rem;">'
        +'<colgroup><col><col><col><col></colgroup>'
        +'<thead><tr style="background:rgba(30,41,59,0.6);">'
        +'<th style="text-align:left;color:#94a3b8;">?됱꽦</th>'
        +'<th style="text-align:left;color:#94a3b8;">?됱꽦 ?꾩튂(?⑸룄)</th>'
        +'<th style="text-align:left;color:#94a3b8;">Placidus(?몃?)</th>'
        +'<th style="text-align:left;color:#94a3b8;">Whole Sign(???먮쫫)</th>'
        +'</tr></thead>'
        +'<tbody>'+placementRows.join('')+'</tbody>'
        +'</table>'
        +'</div>'
        +'<p style="margin:8px 0 0 0;color:#cbd5e1;font-size:0.82rem;">?щⅤ?щ굹: <b>'+fortunaSign+'</b> ('+fortunaHousePair+') 쨌 ?ㅽ뵾由? <b>'+spiritSign+'</b> ('+spiritHousePair+')</p>'
        +'<div style="background:rgba(15,23,42,0.5);border:1px solid rgba(148,163,184,0.2);border-radius:10px;padding:10px;">'
        +'<div style="color:#94a3b8;font-size:0.78rem;margin-bottom:6px;">二쇱슂 ?됱꽦 媛???댄듃 ?ㅻ툕 ?곗꽑)</div>'
        +'<ul style="margin:0;padding-left:18px;color:#e2e8f0;font-size:0.84rem;line-height:1.6;">'+majorAspectHtml+'</ul>'
        +'</div>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">?뙚 1. ?섎뒗 ?대뼡 罹먮┃?곗씤媛?</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">? ?쒖뼇</span> <span class="astro-planet">'+sunSign+'</span>'+sunDeg
        +' <span class="astro-tag">????/span> <span class="astro-planet">'+moonSign+'</span>'+moonDeg
        +' <span class="astro-tag">??Asc ?곸듅沅?/span> <span class="astro-planet">'+ascSign+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>?截??쒖뼇 ???섏쓽 吏꾩쭨 鍮?/b><br>'+sunCoreInterpretation+'</p>'
        +'<p><b>?뙔 ?????꾨Т??紐⑤Ⅴ??吏꾩쭨 ??/b><br>'+moonSign+' ?ъ? ?쇨낀?섍굅???몃줈?????먯뿰?ㅻ읇寃??쒕윭?섎뒗 蹂몃え?듭엯?덈떎. '+moonHousePair+' ?곸뿭?먯꽌 媛먯젙??異⑹쟾?섍퀬, 諛섎?濡??곸쿂???ш린??源딄쾶 ?⑥뒿?덈떎. ?곗씤?????먮꼫吏瑜??댄빐?댁＜硫?"?쒕뵒???섎? ?뚯븘二쇰뒗 ?щ엺??留뚮궗?????먮굦???듬땲??</p>'
        +'<p><b>燧??곸듅沅???泥レ씤??罹먮┃??/b><br>?곸듅沅?<b>'+ascSign+'</b>? 泥섏쓬 留뚮궗????蹂댁씠??"寃?罹먮┃???낅땲?? ?띾쭏???쒖뼇)怨?議곌툑 ?ㅻ? ???덉뼱?? 移쒗빐吏덉닔濡??섏쇅??留ㅻ젰??????蹂댁씪 ???덉뼱??</p>'
        +'<p style="margin-top:8px;color:#cbd5e1;">'+imbalanceText+' '+precisionComment+'</p>'
        +'</div>'
        +'<div class="astro-core">"?뱀떊???몄깮 ?뚮쭏瑜??대걚???됱꽦: <strong>'+chartRuler+'</strong> ?????됱꽦?????뚯븘媛???紐⑤뱺 寃껋씠 ???由쎈땲??"</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">?쭬 1.5 留먮쾭由눫룹꽦???ъ씤?맞룸?蹂??/div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">???섏꽦</span> <span class="astro-planet">'+mercurySign+(chart.planets.Mercury&&chart.planets.Mercury.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +' <span class="astro-tag">??紐⑹꽦</span> <span class="astro-planet">'+jupiterSign+(chart.planets.Jupiter&&chart.planets.Jupiter.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +' <span class="astro-tag">???좎꽦</span> <span class="astro-planet">'+saturnSign+(chart.planets.Saturn&&chart.planets.Saturn.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>?뮠 ?섏꽦 ???섏쓽 留먮쾭由뉕낵 ?앷컖 諛⑹떇</b><br>?섏꽦??<b>'+mercurySign+'</b>('+mercuryHousePair+')???덉뼱?? ?뱀떊??留먰븯怨?諛곗슦怨??앷컖?섎뒗 ?ㅽ??쇱씠 ??蹂꾩옄由??됯퉼濡??섏샃?덈떎. ??諛⑹떇???섏떇?곸쑝濡??????뚰넻???⑥뵮 ?명빐吏묐땲??</p>'
        +'<p><b>?? 紐⑹꽦 ???됱슫???ㅼ뼱?ㅻ뒗 臾?/b><br>紐⑹꽦??<b>'+jupiterSign+'</b>('+jupiterHousePair+')???덉뒿?덈떎. ??諛⑺뼢?쇰줈 ?쒕룄????"?좎? ???由곕떎"??媛먭컖???곕씪?듬땲?? ?듭?濡??몃젰?섏? ?딆븘???먮쫫??遺숇뒗 援ш컙?낅땲??</p>'
        +'<p><b>?? ?명뻾??3珥앹궗 ???몄깮 由ъ뀑 踰꾪듉</b><br>泥쒖솗??'+uranusSign+', '+uranusHousePair+')? "媛묒옄湲?諛⑺뼢 ?꾪솚", ?댁솗??'+neptuneSign+', '+neptuneHousePair+')? "媛먯닔???곸긽????, 紐낆솗??'+plutoSign+', '+plutoHousePair+')? "?꾩쟾??泥댁쭏 媛쒖꽑"???대떦?⑸땲?? ?붾뱾由??뚮뒗 ?섎뱾吏留? 吏?섍퀬 ?섎㈃ ?뺤떎????媛뺥빐?몄슂.</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">?룇 2. ?대뼡 ?쇱쓣 ?섎㈃ 鍮쏅굹?붽??</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">MC 泥쒖젙(10H)</span> <span class="astro-planet">'+mcSign+'</span>'
        +' <span class="astro-tag">Desc ?섍컯沅?7H)</span> <span class="astro-planet">'+descSign+'</span>'
        +' <span class="astro-tag">6H</span> <span class="astro-house">'+h6Sign+'</span>'
        +' <span class="astro-tag">Saturn ??/span> <span class="astro-planet">'+saturnSign+(chart.planets.Saturn&&chart.planets.Saturn.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>?렞 MC(<b>'+mcSign+'</b>) ???몄긽???섎? ?대뼸寃?湲곗뼲?섍만 諛붾씪?붽?</b><br>MC??怨듭쟻???먮━?먯꽌 鍮쏅굹???됯퉼?낅땲?? ??蹂꾩옄由??먮꼫吏濡?而ㅻ━?대? ?ъ??붾떇?섎㈃ "? ?щ엺, ??洹?遺꾩빞 媛숈븘"?쇰뒗 ?몄긽??以띾땲??</p>'
        +'<p><b>?뵪 6?섏슦??<b>'+h6Sign+'</b>) ?????쇱긽 ?댁쁺踰?/b><br>??援ш컙? "?쇳븯???듦? + 泥대젰 愿由щ쾿"??蹂댁뿬以띾땲?? ?ш린??留욎떠 猷⑦떞??吏쒕㈃ ?⑥쑉? ?щ씪媛怨?踰덉븘?껋? 以꾩뼱??땲??</p>'
        +'<p><b>?룛截??좎꽦(<b>'+saturnSign+'</b>, '+saturnHousePair+') ???⑤떒?댁???援ш컙</b><br>?좎꽦???덈뒗 怨녹? 泥섏쓬???먮━怨?留됲엳???먮굦???ㅼ?留? 踰꾪떚硫?寃곌뎅 媛??寃ш퀬???깃낵媛 ?볦씠???먮━?낅땲?? ?ш린??湲곗큹瑜??볦쑝硫??섏쨷??臾대꼫吏吏 ?딆뒿?덈떎.</p>'
        +'<p style="margin-top:8px;color:#cbd5e1;">?? MC 諛⑺뼢?쇰줈 "釉뚮옖???섍퀬 ??6?섏슦??諛⑹떇?쇰줈 "留ㅼ씪 ?ㅽ뻾"?섍퀬 ???좎꽦 援ш컙?먯꽌 "袁몄????쇰줈 ?밸??대낫?몄슂.</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">?뮊 3. ?섎뒗 ?대뼸寃??щ옉?섎뒗媛?</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">Desc ?섍컯沅?7H)</span> <span class="astro-planet">'+descSign+'</span>'
        +' <span class="astro-tag">Venus 湲덉꽦 ?</span> <span class="astro-planet">'+venusSign+(chart.planets.Venus&&chart.planets.Venus.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +' <span class="astro-tag">Mars ?붿꽦 ??/span> <span class="astro-planet">'+marsSign+(chart.planets.Mars&&chart.planets.Mars.retro?' <span style="color:#f87171;font-size:0.75rem">Rx</span>':'')+'</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p><b>?삆 ?섍컯沅?Desc) ???먭씀 ?뚮━????낆쓽 鍮꾨?</b><br>?섍컯沅곸씠 <b>'+descSign+'</b>?대씪??嫄? 洹??먮꼫吏瑜?媛吏??щ엺?먭쾶 ?댁쑀??紐⑤Ⅴ寃??먭씀 ?뚮┛?ㅻ뒗 ?살엯?덈떎. "???섎뒗 ??긽 ????낆씠????씠吏?" ?띠뿀?ㅻ㈃ ???ш린???듭씠 ?섏샃?덈떎.</p>'
        +'<p><b>?뮆 湲덉꽦(<b>'+venusSign+'</b>, '+venusHousePair+') 횞 ?붿꽦(<b>'+marsSign+'</b>, '+marsHousePair+')</b><br>湲덉꽦? ?닿? ?щ옉???쒗쁽?섎뒗 諛⑹떇, ?붿꽦? 癒쇱? ?ㅺ?媛寃?留뚮뱶??蹂몃뒫?낅땲?? '+(vmAspect || vmCalcFallback)+'</p>'
        +'<p><b>?뙔 ?????곗씤???뚯븘以섏빞 ??吏꾩쭨 ??/b><br>??<b>'+moonSign+'</b>, '+moonHousePair+')???먰븯??嫄??곷?媛 ?먯뿰?ㅻ읇寃?梨꾩썙二쇰㈃, "?쒕뵒???섎? ?댄빐?섎뒗 ?щ엺 留뚮궗?????먮굦???듬땲??</p>'
        +'<p style="margin-top:8px;color:#cbd5e1;">'+relationAxisText+'</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">?? 4. 吏湲??됱슫???대뵒濡??먮Ⅴ?붽?? (紐⑹꽦 ?몃옖吏?</div>'
        +'<div class="astro-tags">'
        +'<span class="astro-tag">Jupiter ??Transit</span> <span class="astro-planet">'+jupiterTransit+'</span>'
        +' <span style="color:#94a3b8;font-size:0.78rem">('+now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+(now.getDate())+'??湲곗?)</span>'
        +'</div>'
        +'<div class="astro-desc">'
        +'<p>吏湲?紐⑹꽦? <b>'+jupiterTransit+'</b>??吏?섍퀬 ?덉뒿?덈떎. ??蹂꾩옄由ъ? 愿?⑤맂 二쇱젣媛 ?ы빐 媛???뺤옣?섍린 ?ъ슫 ?곸뿭?낅땲?? 臾대━?섏? ?딆븘???먮쫫??遺숇뒗 援ш컙 ????寃곗젙怨??꾩쟾????諛⑺뼢?쇰줈 留욎떠蹂댁꽭??</p>'
        +'<div class="astro-core" style="font-size:1.05rem;margin-top:20px;font-weight:bold">"?몛 '+transitMsg[jupiterIndex]+'"</div>'
        +'<p>'+transitExecutionText+'</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">??4.5 吏湲??섏뿉寃?吏묒쨷?섎㈃ 醫뗭? 寃껊뱾</div>'
        +'<div class="astro-desc">'
        +'<p><b>?뵦 ?섏쓽 ?먮꼫吏 援ъ꽦:</b> '+imbalanceText+'</p>'
        +'<p><b>?렞 ?됰룞 ?ㅽ???</b> '+modalityNames[modalityDominant]+' ?꾩＜?낅땲?? '+modalityAdvice[modalityDominant]+'</p>'
        +'<p><b>?룧 ?몄깮 臾닿쾶以묒떖:</b> '+focusHouseText+'. 吏湲?媛???먮뱶?ъ???二쇱젣??<b>'+topHouseTopic+'</b>?낅땲??</p>'
        +'<p><b>?좑툘 議곗떖???ъ씤??</b> '+precisionComment+'</p>'
        +'<p><b>????뻾 以묒씤 ?됱꽦:</b> '+retroFocusText+'</p>'
        +'</div>'
        +'</div>'

        +'<div class="astro-section">'
        +'<div class="astro-subhead">?ザ 5. ?대뼡 ?щ엺怨???留욌뒗媛?</div>'
        +'<div class="astro-desc">'
        +'<p>??李⑦듃瑜??뚮㈃ 沅곹빀??蹂댁엯?덈떎. ?대뼡 ?щ엺???섏? ??留욊퀬, ?대뵒??留덉같???앷린?붿? ???쒖뼇쨌??룰툑?굿룻솕?깆쑝濡??쎌뼱遊낅땲??</p>'
        +'<p style="color:#cbd5e1;">?듭떖 ?ъ씤?? 媛먯젙 ?덉젙? ??'+moonHousePair+'), ?뚮┝怨??쒗쁽? 湲덉꽦('+venusHousePair+')쨌?붿꽦('+marsHousePair+'), 媛??媛뺥븯寃??묐룞?섎뒗 媛곷룄??'+tightAspectText+'?낅땲??</p>'
        +'<div class="astro-core" style="font-size:0.95rem;line-height:1.6;font-weight:normal">'
        +'<ul style="padding-left:20px;margin-bottom:0;">'
        +'<li style="margin-bottom:10px;"><b>?뮆 ?곗븷 沅곹빀 (留덉쓬???명븳 愿怨?</b><br>?뱀떊??媛먯젙 ?덉젙 ?ъ씤?몃뒗 <b>'+moonSign+'</b>('+moonHousePair+')?낅땲?? 珥덈컲?먮뒗 ??二쇱젣?먯꽌 "?덉떖"??癒쇱? 留뚮뱾?댁빞 ?ㅻ옒 媛묐땲?? ?닿쾶 ?쏀븳 ?먯냼??<b>'+elemShortNames[elemWeakest]+'</b> 湲곗슫??梨꾩썙二쇰뒗 ?щ엺???뱁엳 ??留욎븘??</li>'
        +'<li style="margin-bottom:10px;"><b>????沅곹빀 (?뚮┝怨??쒗룷)</b><br><b>'+venusSign+'</b> 湲덉꽦('+venusHousePair+')? "?щ옉 ?쒗쁽踰?, <b>'+marsSign+'</b> ?붿꽦('+marsHousePair+')? "?됰룞 ??대컢"??留먰빐以띾땲?? 洹몃옒??移쒕?媛먯? "?쒗쁽 諛⑹떇 留욎텛湲???由щ벉 留욎텛湲? ?쒖꽌濡?媛硫??⑥뵮 ?먯뿰?ㅻ읇寃?源딆뼱吏묐땲??</li>'
        +'<li><b>?쩃 ??沅곹빀 (?④퍡 ???쇳븯??議고빀)</b><br>?낅Т 異뺤? MC <b>'+mcSign+'</b>? ?좎꽦 <b>'+saturnSign+'</b>('+saturnHousePair+')?낅땲?? 媛먯젙 怨듦컧??以묒슂?섏?留? ?쇱젙쨌?덉쭏쨌?쎌냽??媛숈씠 吏耳쒖＜???뚰듃?덇? ????留욎뒿?덈떎. ??븷???섏슦??二쇱젣蹂꾨줈 ?섎늻硫?異⑸룎????以꾩뼱?ㅼ뼱??</li>'
        +'</ul>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ?? ?듯빀 ?몄뿰 由ы룷??(Synastry & Bond) ?? */
        +'<div class="astro-section" style="border-left:4px solid #f472b6; background:linear-gradient(to right, rgba(244,114,182,0.06), transparent);">'
        +'<div class="astro-subhead" style="color:#f472b6;">?뮒 沅곹빀 ?쒕늿??由ы룷??/div>'
        +'<div class="astro-desc">'
        +'<p><b>[?섍컯沅????먭씀 ?뚮━?????</b> ?뱀떊???섍컯沅?7H)? <b>'+descSign+'</b>?낅땲?? 洹몃옒?????깊뼢??媛吏??щ엺?먭쾶 "?댁쑀 ?놁씠 ?뚮━???먮굦"???먯＜ ?앷만 ???덉뼱??</p>'
        +'<p><b>[Venus ? 횞 Mars ?????ㅻ젞 ?ㅼ쐞移?</b> 湲덉꽦(<b>'+venusSign+'</b>)怨??붿꽦(<b>'+marsSign+'</b>)??議고빀? ?대젃寃??쏀??? '+(vmAspect||vmCalcFallback)+'</p>'
        +'<p><b>[沅곹빀 泥댄겕 ?ъ씤??</b> ?⑥닚??蹂꾩옄由щ쭔 媛숇떎怨???留욌뒗 嫄??꾨떃?덈떎. ?쒖뼇쨌??룰툑?굿룻솕?깆쓽 ?ㅼ젣 媛곷룄媛 ??留욎쓣?섎줉 愿怨꾧? ???덉젙?곸쑝濡?援대윭媛묐땲??</p>'
        +'<div style="background:rgba(244,114,182,0.08); border-radius:10px; padding:14px; margin-top:12px;">'
        +'<div style="color:#f9a8d4; font-weight:700; margin-bottom:8px; font-size:0.85rem; text-transform:uppercase; letter-spacing:1px;">??Bond Compatibility Map</div>'
        +'<ul style="padding-left:18px; margin:0; color:#e2e8f0; line-height:1.85; font-size:0.9rem;">'
        +'<li><b>?뮆 ?곗븷 沅곹빀</b> ????<b>'+moonSign+'</b>('+moonHousePair+')??媛먯젙 由щ벉??吏곴??곸쑝濡??뚯븘遊?二쇰뒗 ?щ엺. '+relationComplementElement+' 湲곗쭏濡????먮꼫吏??鍮덊땲??梨꾩썙二쇰뒗 ?곷??쇱닔濡??ㅻ옒媛묐땲??</li>'
        +'<li><b>????沅곹빀</b> ??湲덉꽦 <b>'+venusSign+'</b>('+venusHousePair+')???щ옉 ?몄뼱媛 ?듯븯怨? ?붿꽦 <b>'+marsSign+'</b>('+marsHousePair+')????대컢??留욌뒗 ?щ엺????"???щ엺?대떎" ?띠? ?먮굦?????듬땲??</li>'
        +'<li><b>?쩃 ??沅곹빀</b> ??MC <b>'+mcSign+'</b>??諛⑺뼢?깆쓣 ?묒썝?섍퀬, ?좎꽦 <b>'+saturnSign+'</b>('+saturnHousePair+')??洹쒖쑉???④퍡 吏耳쒖쨪 ???덈뒗 ?뚰듃?? ??븷 遺꾨떞留????대룄 留덉같???ш쾶 以꾩뼱??땲??</li>'
        +'</ul>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ?? ??吏곸젒 ?낅젰 ?쒕굹?ㅽ듃由?沅곹빀 ?? */
        +'<div class="astro-section" style="border-left:4px solid #f59e0b; background:linear-gradient(to right, rgba(245,158,11,0.07), transparent);">'
        +'<div class="astro-subhead" style="color:#f59e0b;">?뮟 ?섏쓽 ?쒕굹?ㅽ듃由? ?곷?諛?吏곸젒 ?낅젰</div>'
        +'<div class="astro-desc">'
        +'<p style="font-size:0.85rem;color:#b2bec3;margin:0 0 12px 0;line-height:1.6;word-break:keep-all;">'
        +'?곷????앸뀈?붿씪/?쒓컙???ｌ쑝硫????щ엺??蹂꾩옄由?吏?꾨? 鍮꾧탳???곗븷쨌?셋룹꽦??沅곹빀??蹂댁뿬以띾땲?? ?쒖뼱???쒓컙??紐⑤Ⅴ硫?12:00(?뺤삤)濡??낅젰?섎㈃ ?⑸땲??'
        +'</p>'
        /* ?낅젰 ??*/
        +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
        +'<div style="flex:1;min-width:130px;">'
        +'<label style="font-size:0.72rem;color:#94a3b8;display:block;margin-bottom:3px;">?곷?諛??대쫫 (?좏깮)</label>'
        +'<input type="text" id="asDirect_name" placeholder="?? ?띻만?? autocomplete="off" '
        +'style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:7px;background:rgba(20,25,35,0.9);color:#fff;border:1px solid rgba(245,158,11,0.4);font-size:0.85rem;">'
        +'</div>'
        +'<div style="flex:1;min-width:130px;">'
        +'<label style="font-size:0.72rem;color:#94a3b8;display:block;margin-bottom:3px;">?앸뀈?붿씪</label>'
        +'<input type="date" id="asDirect_date" '
        +'style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:7px;background:rgba(20,25,35,0.9);color:#fff;border:1px solid rgba(245,158,11,0.4);font-size:0.85rem;" required>'
        +'</div>'
        +'<div style="flex:0 0 auto;">'
        +'<label style="font-size:0.72rem;color:#94a3b8;display:block;margin-bottom:3px;">?쒖뼱???쒓컖</label>'
        +'<input type="time" id="asDirect_time" value="12:00" '
        +'style="width:120px;box-sizing:border-box;padding:8px 10px;border-radius:7px;background:rgba(20,25,35,0.9);color:#fff;border:1px solid rgba(245,158,11,0.4);font-size:0.85rem;">'
        +'</div>'
        +'<div style="flex:0 0 auto;">'
        +'<label style="font-size:0.72rem;color:#94a3b8;display:block;margin-bottom:3px;">?꾩떆(??援?</label>'
        +'<select id="asDirect_city" '
        +'style="width:240px;padding:8px 10px;border-radius:7px;background:rgba(20,25,35,0.9);color:#fff;border:1px solid rgba(245,158,11,0.4);font-size:0.85rem;">'
        +'<option value="">?꾩떆 ?좏깮(??援??⑥쐞)</option>'
        +'</select>'
        +'</div>'
        +'</div>'
        +'<button onclick="window._astroDirectSynastry()" '
        +'style="width:100%;padding:10px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:800;font-size:0.9rem;border:none;cursor:pointer;letter-spacing:0.5px;">???쒕굹?ㅽ듃由?遺꾩꽍?섍린</button>'
        +'<div id="asDirectResult" style="margin-top:14px;"></div>'
        +'</div>'
        +'</div>'

        /* ?? ???먯꽦???좊챸???쒕굹?ㅽ듃由?沅곹빀 (?좉퇋) ?? */
        +'<div class="astro-section" id="astroSynastrySection" style="border-left:4px solid #818cf8; background:linear-gradient(to right, rgba(129,140,248,0.07), transparent);">'
        +'<div class="astro-subhead" style="color:#818cf8;">?뙆 ?좊챸???쒕굹?ㅽ듃由?(Celebrity Synastry)</div>'
        +'<div class="astro-desc">'

        /* ?? [??泥쒖긽??吏?? ?뱀떊???깆쥖] ?? */
        +'<div style="background:rgba(129,140,248,0.09);border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid rgba(129,140,248,0.25);">'
        +'<div style="font-size:0.78rem;color:#818cf8;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">??泥쒖긽??吏?? ?뱀떊???깆쥖</div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;">'
        +'<div style="background:rgba(251,191,36,0.1);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(251,191,36,0.25);">'
        +'<div style="font-size:0.65rem;color:#fbbf24;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">? ?쒖뼇</div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#fde68a;line-height:1.2;">'+sunSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">?듭떖 ?먯븘</div>'
        +'</div>'
        +'<div style="background:rgba(148,163,184,0.12);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(148,163,184,0.2);">'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">????/div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#e2e8f0;line-height:1.2;">'+moonSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">媛먯젙 ?⑦꽩</div>'
        +'</div>'
        +'<div style="background:rgba(244,114,182,0.1);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(244,114,182,0.2);">'
        +'<div style="font-size:0.65rem;color:#f472b6;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">? 湲덉꽦</div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#fbcfe8;line-height:1.2;">'+venusSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">?щ옉???몄뼱</div>'
        +'</div>'
        +'<div style="background:rgba(239,68,68,0.1);border-radius:9px;padding:10px;text-align:center;border:1px solid rgba(239,68,68,0.2);">'
        +'<div style="font-size:0.65rem;color:#f87171;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.7px;">???붿꽦</div>'
        +'<div style="font-size:0.85rem;font-weight:800;color:#fca5a5;line-height:1.2;">'+marsSign+'</div>'
        +'<div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;">?뺣쭩???숇젰</div>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ?? [?렚 ?곹샎???띾뫁?? ?섏? ??? 蹂꾩쓽 ?몃Ъ] ???숈쟻 ?뚮뜑 而⑦뀒?대꼫 ?? */
        +'<div style="background:rgba(52,211,153,0.07);border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid rgba(52,211,153,0.2);">'
        +'<div style="font-size:0.78rem;color:#34d399;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">?렚 ?곹샎???띾뫁?? ?섏? 媛숈? 蹂꾩쓽 ?몃Ъ</div>'
        +'<p style="font-size:0.82rem;color:#94a3b8;margin:0 0 10px 0;line-height:1.5;">?ъ＜ <b>CelebrityDB</b>?먯꽌 <b>'+sunSign+'</b> ?쒖뼇 ?먮뒗 <b>'+venusSign+'</b> 湲덉꽦怨?媛숈? 湲곗슫??媛吏??좊챸?몄쓣 ?먮룞?쇰줈 李얠븘?쒕┰?덈떎.</p>'
        +'<div id="astroCosmicTwins" style="display:flex;flex-wrap:wrap;gap:6px;min-height:36px;">'
        +'<span style="color:#666;font-size:0.8rem;">??遺꾩꽍 以?..</span>'
        +'</div>'
        +'</div>'

        /* ?? [?뭾 ?대챸???쒕굹?ㅽ듃由? ???좊챸???좏깮 UI ?? */
        +'<div style="background:rgba(244,114,182,0.06);border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid rgba(244,114,182,0.2);">'
        +'<div style="font-size:0.78rem;color:#f472b6;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">?뭾 ?대챸???쒕굹?ㅽ듃由? ?좊챸??沅곹빀 遺꾩꽍</div>'
        +'<p style="font-size:0.82rem;color:#94a3b8;margin:0 0 10px 0;line-height:1.5;">?좊챸?몄쓣 ?좏깮?섎㈃ ?섑깉 李⑦듃瑜?鍮꾧탳?섏뿬 ?곗븷쨌?숇즺쨌?곸쟻 沅곹빀??遺꾩꽍?⑸땲?? ?앹떆 誘몄긽 ?몃Ъ? ?뺤삤(12:00) 湲곗??대ŉ ??룹긽?밴턿 ?ㅼ감媛 ?덉쓣 ???덉뒿?덈떎.</p>'
        /* 援?? ??*/
        +'<div id="astroCtryTabs" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>'
        /* 移댄뀒怨좊━ ??*/
        +'<div id="astroCatTabs" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;"></div>'
        /* 寃??*/
        +'<div style="position:relative;margin-bottom:8px;">'
        +'<input type="text" id="astroSyQ" placeholder="?대쫫 寃??(?? ?뚯씪???ㅼ쐞?꾪듃, ?꾩씠??..)" autocomplete="off" '
        +'style="width:100%;box-sizing:border-box;padding:7px 34px 7px 10px;border-radius:6px;background:rgba(20,25,35,0.8);color:#fff;border:1px solid rgba(244,114,182,0.4);font-size:0.83rem;">'
        +'<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#888;pointer-events:none;font-size:0.9rem;">?뵇</span>'
        +'</div>'
        /* ?좊챸??踰꾪듉 紐⑸줉 */
        +'<div id="astroSyCelebs" style="display:flex;flex-wrap:wrap;gap:5px;max-height:130px;overflow-y:auto;padding:6px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(0,0,0,0.15);min-height:44px;"></div>'
        +'</div>'

        /* ?? [?쒕굹?ㅽ듃由?寃곌낵?? ?? */
        +'<div id="astroSyResult" style="display:none;"></div>'

        +'</div>'
        +'</div>'

        /* ?? 4?먯냼 洹좏삎 (?ㅼ떆媛? ?? */
        +'<div class="astro-section">'
        +'<div class="astro-subhead">?쐜 4?먯냼 洹좏삎 (Elemental Balance)</div>'
        +'<div class="astro-desc">'
        +'<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">'
        +['fire','earth','air','water'].map(function(el){
            var cfg={fire:['#f87171','?뵦','遺?Fire)'],earth:['#fde68a','?뙼','??Earth)'],air:['#93c5fd','?뮜','怨듦린(Air)'],water:['#34d399','?뮛','臾?Water)']};
            var c=cfg[el]; var pct=elemPct[el];
            return '<div style="background:rgba(255,255,255,0.04); border-radius:10px; padding:12px; border:1px solid rgba(255,255,255,0.07);">'
                +'<div style="font-size:0.82rem; color:'+c[0]+'; font-weight:700; margin-bottom:6px;">'+c[1]+' '+c[2]+'</div>'
                +'<div style="font-size:1.5rem; font-weight:900; color:'+c[0]+'; line-height:1;">'+pct+'<span style="font-size:0.75rem; color:#94a3b8; font-weight:400;">%</span></div>'
                +'<div style="height:4px; background:#1e293b; border-radius:2px; margin-top:8px; overflow:hidden;"><div style="height:100%; width:'+pct+'%; background:'+c[0]+'; border-radius:2px;"></div></div>'
                +'</div>';
        }).join('')
        +'</div>'
        +'<div style="background:rgba(255,255,255,0.04); border-radius:10px; padding:12px; font-size:0.88rem;">'
        +'<span style="color:#fbbf24; font-weight:700;">吏諛??먯냼: '+elemDomNames[elemDominant]+'</span>'
        +'<p style="margin:6px 0 0 0; color:#cbd5e1; line-height:1.5;">'+elemDomDesc[elemDominant]+'</p>'
        +'</div>'
        +'</div>'
        +'</div>'

        /* ?? ?쇰Ⅴ?ㅻ━??(?ㅼ떆媛? ?? */
        +'<div class="astro-section" style="border-left:3px solid #a78bfa;">'
        +'<div class="astro-subhead" style="color:#a78bfa;">?첃 ?쇰Ⅴ?ㅻ━??(Firdaria ??怨좎쟾 ?쒓컙 ?듭튂??</div>'
        +'<div class="astro-desc">'
        +'<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">'
        +'<div style="flex:1; min-width:130px; background:rgba(167,139,250,0.12); border-radius:10px; padding:12px; border:1px solid rgba(167,139,250,0.3); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#a78bfa; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">硫붿씤 ??꾨줈??/div>'
        +'<div style="font-size:1.15rem; font-weight:900; color:#ddd6fe;">'+firdariaMain.planet+'</div>'
        +'<div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">?붿뿬 ??'+firdariaMainYearsLeft+'??/div>'
        +'</div>'
        +'<div style="flex:1; min-width:130px; background:rgba(167,139,250,0.06); border-radius:10px; padding:12px; border:1px solid rgba(167,139,250,0.15); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#a78bfa; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">?쒕툕 ??꾨줈??/div>'
        +'<div style="font-size:1.15rem; font-weight:900; color:#c4b5fd;">'+firdariaSubPlanet+'</div>'
        +'<div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">議곗쑉 ?먮꼫吏</div>'
        +'</div>'
        +'</div>'
        +'<p style="font-size:0.95rem; color:#e2e8f0; line-height:1.7; margin-bottom:12px; font-weight:600;">'+(firdariaDynamic.theme || firdariaMain.theme)+'</p>'
        +'<p style="font-size:0.84rem; color:#cbd5e1; line-height:1.65; margin:0 0 10px 0;">'+firdariaPrecisionNote+'</p>'
        +'<div style="background:rgba(167,139,250,0.07); border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid rgba(167,139,250,0.12);">'
        +'<div style="color:#c4b5fd; font-weight:700; margin-bottom:6px; font-size:0.82rem;">?뱰 ?ъ링 ?댁꽍</div>'
        +'<p style="color:#cbd5e1; line-height:1.7; font-size:0.88rem; margin:0;">'+(firdariaDynamic.detail || firdariaMain.detail)+'</p>'
        +'</div>'
        +'<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">'
        +'<div style="background:rgba(250,204,21,0.07); border-radius:10px; padding:12px; border:1px solid rgba(250,204,21,0.15);">'
        +'<div style="color:#fde68a; font-weight:700; font-size:0.8rem; margin-bottom:5px;">?뮳 而ㅻ━??泥쒓린</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.career || firdariaMain.career)+'</p>'
        +'</div>'
        +'<div style="background:rgba(244,114,182,0.07); border-radius:10px; padding:12px; border:1px solid rgba(244,114,182,0.15);">'
        +'<div style="color:#f9a8d4; font-weight:700; font-size:0.8rem; margin-bottom:5px;">?뮆 ?곗븷 & 愿怨?/div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.love || firdariaMain.love)+'</p>'
        +'</div>'
        +'</div>'
        +'<div style="background:rgba(239,68,68,0.07); border-radius:10px; padding:12px; margin-bottom:10px; border:1px solid rgba(239,68,68,0.15);">'
        +'<div style="color:#fca5a5; font-weight:700; font-size:0.8rem; margin-bottom:5px;">?좑툘 二쇱쓽 諛?嫄닿컯</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.caution || firdariaMain.caution)+'</p>'
        +'</div>'
        +'<div style="background:rgba(16,185,129,0.07); border-radius:10px; padding:12px; border:1px solid rgba(16,185,129,0.15);">'
        +'<div style="color:#6ee7b7; font-weight:700; font-size:0.8rem; margin-bottom:5px;">???듭떖 ?됰룞 議곗뼵</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(firdariaDynamic.advice || firdariaMain.advice)+'</p>'
        +'</div>'
        +(function(){
            var comboKey = firdariaMain.kr+'_'+firdariaSubPlanet;
            var comboMsg = FIRDARIA_COMBO[comboKey];
            if(!comboMsg) return '';
            return '<div style="margin-top:10px; background:rgba(139,92,246,0.1); border-radius:10px; padding:12px; border:1px solid rgba(139,92,246,0.3);">'
                +'<div style="color:#a78bfa; font-weight:700; font-size:0.8rem; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">??'+firdariaMain.kr+' 횞 '+firdariaSubPlanet+' 肄ㅻ낫 ?먮꼫吏</div>'
                +'<p style="color:#e2e8f0; font-size:0.85rem; line-height:1.65; margin:0;">'+comboMsg+'</p>'
                +'</div>';
        })()
        +'</div>'
        +'</div>'

        /* ?? ?곌컙 ?꾨줈?숈뀡 (?ㅼ떆媛? ?? */
        +'<div class="astro-section" style="border-left:3px solid #22d3ee;">'
        +'<div class="astro-subhead" style="color:#22d3ee;">?? ?곌컙 ?꾨줈?숈뀡 (Annual Profection ??'+now.getFullYear()+'??</div>'
        +'<div class="astro-desc">'
        +'<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">'
        +'<div style="flex:1; min-width:110px; background:rgba(34,211,238,0.1); border-radius:10px; padding:12px; border:1px solid rgba(34,211,238,0.25); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#22d3ee; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">?ы빐???섏슦??/div>'
        +'<div style="font-size:0.92rem; font-weight:800; color:#a5f3fc;">'+profHouse+'</div>'
        +'</div>'
        +'<div style="flex:1; min-width:100px; background:rgba(34,211,238,0.08); border-radius:10px; padding:12px; border:1px solid rgba(34,211,238,0.2); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#22d3ee; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">吏諛?蹂꾩옄由?/div>'
        +'<div style="font-size:0.92rem; font-weight:800; color:#a5f3fc;">'+profSign+'</div>'
        +'</div>'
        +'<div style="flex:1; min-width:100px; background:rgba(34,211,238,0.08); border-radius:10px; padding:12px; border:1px solid rgba(34,211,238,0.2); text-align:center;">'
        +'<div style="font-size:0.72rem; color:#22d3ee; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">?ы빐???됱꽦</div>'
        +'<div style="font-size:1.1rem; font-weight:900; color:#67e8f9;">'+profRuler+'</div>'
        +'</div>'
        +'</div>'
        +'<p style="font-size:0.95rem; color:#e2e8f0; line-height:1.7; margin-bottom:12px; font-weight:600;">'+(profectionDynamic.theme || curProfData.theme)+'</p>'
        +'<p style="font-size:0.84rem; color:#cbd5e1; line-height:1.65; margin:0 0 10px 0;">'+profectionPrecisionNote+'</p>'
        +'<div style="background:rgba(34,211,238,0.06); border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid rgba(34,211,238,0.12);">'
        +'<div style="color:#67e8f9; font-weight:700; margin-bottom:6px; font-size:0.82rem;">?뱰 ?ы빐??硫붿떆吏</div>'
        +'<p style="color:#cbd5e1; line-height:1.7; font-size:0.88rem; margin:0;">'+(profectionDynamic.detail || curProfData.detail)+'<br><br>'
        +'吏諛?蹂꾩옄由?<b style="color:#a5f3fc">'+profSign+'</b>???먮꼫吏媛 ???섏슦??二쇱젣瑜?梨꾩깋?섎ŉ, ?ы빐 吏諛??됱꽦 <b style="color:#67e8f9">'+profRuler+'</b>???몃옖吏??곹깭媛 ?????댁쓽 ?ㅼ젣 ?먮쫫??寃곗젙?⑸땲??</p>'
        +'</div>'
        +'<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">'
        +'<div style="background:rgba(250,204,21,0.07); border-radius:10px; padding:12px; border:1px solid rgba(250,204,21,0.15);">'
        +'<div style="color:#fde68a; font-weight:700; font-size:0.8rem; margin-bottom:5px;">?뮳 而ㅻ━??& ?щЪ</div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(profectionDynamic.career || curProfData.career)+'</p>'
        +'</div>'
        +'<div style="background:rgba(244,114,182,0.07); border-radius:10px; padding:12px; border:1px solid rgba(244,114,182,0.15);">'
        +'<div style="color:#f9a8d4; font-weight:700; font-size:0.8rem; margin-bottom:5px;">?뮆 ?곗븷 & ?멸컙愿怨?/div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(profectionDynamic.love || curProfData.love)+'</p>'
        +'</div>'
        +'</div>'
        +'<div style="background:rgba(16,185,129,0.07); border-radius:10px; padding:12px; border:1px solid rgba(16,185,129,0.15);">'
        +'<div style="color:#6ee7b7; font-weight:700; font-size:0.8rem; margin-bottom:5px;">?????대? 理쒕????쒖슜?섎뒗 踰?/div>'
        +'<p style="color:#e2e8f0; font-size:0.83rem; line-height:1.65; margin:0;">'+(profectionDynamic.advice || curProfData.advice)+'</p>'
        +'</div>'
        +'</div>'
        +'</div>'

        +'<div class="astro-expert">'
        +'<div class="expert-title">?뿣截??덈컮 & ?곗씠??肄붿쫰誘?移댁슫?щ쭅</div>'
        +'<div class="expert-msg">'
        +'<div class="neo-bubble"><strong>[遺꾩꽍媛 ?덈컮 ?쫨]</strong> "吏湲??밸?泥섍? ?좊챸?섍쾶 蹂댁엯?덈떎. ?쒖뼇 '+sunHousePair+'? MC '+mcSign+' 諛⑺뼢?먯꽌 ?대쫫???쒕윭?닿퀬, ?좎꽦 '+saturnHousePair+'?먯꽌 湲곗큹瑜??ㅼ??몄슂. ??댄듃 媛?'+tightAspectText+'???ы빐 媛???덈━?섍쾶 ?묐룞?섎뒗 ??대컢 ?좏샇?낅땲?? <b>'+profHouse+'</b> ?꾨줈?숈뀡怨?<b>'+firdariaMain.kr+'</b> ??꾨줈?쒓? 留욌Ъ由щ뒗 援ш컙 ??以鍮꾨맂 ?щ엺?먭쾶留??대━??臾몄엯?덈떎."</div>'
        +'<div class="yeon-bubble"><strong>[怨듦컧?붿젙 ?곗씠 ?맰]</strong> "?ъ씠 <b>'+moonSign+'</b>('+moonHousePair+')???덈떎??嫄??댁そ?먯꽌 留덉쓬??媛??留롮씠 梨꾩슱 ???덈떎??嫄곗삁?? 吏移섍굅??遺덉븞?????쒖씪 癒쇱? ?ш린濡?媛?몄슂! 湲덉꽦 <b>'+venusSign+'</b>('+venusHousePair+')???щ옉 ?몄뼱瑜??붿쭅?섍쾶 留먰븯硫??곗븷 ?ㅽ빐媛 ??以꾩뼱?? 洹몃━怨?<b>'+elemShortNames[elemWeakest]+'</b> 湲곗슫???댁쭩 遺議깊븳?? 洹??먮꼫吏瑜?媛吏?移쒓뎄??痍⑤? ?섎굹 ?놁뿉 ?먮㈃ ?띠씠 ?⑥뵮 ?띿꽦?댁쭏 嫄곗삁?? ?뙵"</div>'
        +'</div>'
        +'</div>'

        +'</div>';

    document.getElementById('astroResult').innerHTML = html;

    /* ?? ?쒕굹?ㅽ듃由??깃턿 吏꾨쾿 珥덇린??(DOM ?쎌엯 ?? ?? */
    setTimeout(function() {
        /* userSunIdx: ???쒖뼇 蹂꾩옄由??몃뜳??(12沅? */
        var _mySunIdx   = sunIndex;
        var _myVenusIdx = chart.planets.Venus ? chart.planets.Venus.sign.idx : 0;
        var _signs12    = typeof astrologer !== 'undefined' ? astrologer.signs : [];

      /* ?먯꽦??吏곸젒 ?낅젰: ??援??⑥쐞 ?꾩떆 ?좏깮 ??tz/?꾨룄/寃쎈룄 ?먮룞 諛섏쁺 */
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

        /* ?? ???쒖뼇 湲곗? 蹂꾩옄由??몃뜳??0-11 異붿텧 ?ы띁 ??? */
        function _syGetSunIdx(birth, hour) {
            try {
                var p = birth.split('-');
                var c = calcAstroApiChartOrThrow(+p[0], +p[1], +p[2], hour || 12, 37.6, 127.0, 0, (window.ASTRO_HOUSE_SYSTEM || 'P')); // ?좊챸?몄? UTC 湲곗? (tz=0)
                return { sunIdx: c.sun.idx, venusIdx: c.planets.Venus ? c.planets.Venus.sign.idx : -1,
                         moonIdx: c.moon.idx, marsIdx: c.planets.Mars ? c.planets.Mars.sign.idx : -1,
                         sunSign: c.sun.sign, moonSign: c.moon.sign,
                         venusSign: c.planets.Venus ? c.planets.Venus.sign.sign : '?',
                         marsSign: c.planets.Mars ? c.planets.Mars.sign.sign : '?',
                         sunLon: (c.sun.idx * 30 + (c.sun.deg || 0)),
                         venusLon: c.planets.Venus ? (c.planets.Venus.sign.idx * 30 + (c.planets.Venus.sign.deg || 0)) : -1 };
            } catch(e) { return null; }
        }

        /* ?? [?렚 Cosmic Twins] 媛숈? ?쒖뼇 or 湲덉꽦 蹂꾩옄由??좊챸???? */
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
                twinsDiv.innerHTML = '<span style="color:#666;font-size:0.8rem;">DB?먯꽌 媛숈? 湲곗슫???좊챸?몄쓣 李얠? 紐삵뻽?듬땲??</span>';
            } else {
                twinsDiv.innerHTML = twins.map(function(t) {
                    var tag = t.matchSun ? '? 媛숈? ?쒖뼇' : '? 媛숈? 湲덉꽦';
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

        /* ?? [?뭾 ?쒕굹?ㅽ듃由? 援??쨌移댄뀒怨좊━쨌寃????援ъ꽦 ?? */
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
                listDiv.innerHTML = '<span style="color:#666;font-size:0.8rem;padding:4px;">寃??寃곌낵媛 ?놁뒿?덈떎.</span>';
                return;
            }
            filtered.slice(0, 80).forEach(function(c) {
                var flag = (typeof COUNTRY_CONFIG !== 'undefined' && COUNTRY_CONFIG[c.nationality]) ? COUNTRY_CONFIG[c.nationality].flag + ' ' : '';
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = flag + c.name;
                btn.style.cssText = 'padding:4px 10px;border-radius:20px;font-size:0.75rem;border:1px solid rgba(244,114,182,0.3);background:rgba(20,25,35,0.8);color:#fbcfe8;cursor:pointer;transition:all 0.2s;white-space:nowrap;';
                btn.onmouseenter = function() { this.style.background='rgba(244,114,182,0.18)'; };
                btn.onmouseleave = function() { this.style.background='rgba(20,25,35,0.8)'; };
                btn.onclick = function() {
                    listDiv.querySelectorAll('button').forEach(function(b) { b.style.background='rgba(20,25,35,0.8)'; });
                    this.style.background = 'rgba(244,114,182,0.25)';
                    window._astroPickCeleb(c.name, c.birth, c.hour || 12);
                };
                listDiv.appendChild(btn);
            });
            if (filtered.length > 80) {
                var note = document.createElement('span');
                note.style.cssText = 'color:#666;font-size:0.73rem;padding:4px 6px;align-self:center;';
                note.textContent = '??' + (filtered.length - 80) + '紐?;
                listDiv.appendChild(note);
            }
        }

        /* 援?? ??*/
        var ctryDiv = document.getElementById('astroCtryTabs');
        if (ctryDiv && typeof COUNTRY_CONFIG !== 'undefined') {
            function _mkCtryBtn(code, label) {
                var b = document.createElement('button'); b.type = 'button';
                b.textContent = label; b.dataset.c = code;
                var isA = code === '';
                b.style.cssText = 'padding:3px 9px;border-radius:20px;font-size:0.7rem;border:1px solid rgba(129,140,248,'+(isA?'0.7':'0.3')+');background:rgba(129,140,248,'+(isA?'0.18':'0.04')+');color:'+(isA?'#a5b4fc':'#7f8c8d')+';cursor:pointer;white-space:nowrap;';
                b.onclick = function() {
                    ctryDiv.querySelectorAll('button').forEach(function(x){
                        x.style.background='rgba(129,140,248,0.04)'; x.style.borderColor='rgba(129,140,248,0.3)'; x.style.color='#7f8c8d';
                    });
                    this.style.background='rgba(129,140,248,0.18)'; this.style.borderColor='rgba(129,140,248,0.7)'; this.style.color='#a5b4fc';
                    _astroActiveCtry = this.dataset.c; _astroRenderCelebList();
                };
                return b;
            }
            ctryDiv.appendChild(_mkCtryBtn('', '?뙋 ?꾩껜'));
            Object.entries(COUNTRY_CONFIG).sort(function(a,b){return a[1].order-b[1].order;}).forEach(function(e){
                ctryDiv.appendChild(_mkCtryBtn(e[0], e[1].flag + ' ' + e[1].label));
            });
        }

        /* 移댄뀒怨좊━ ??*/
        var catDiv = document.getElementById('astroCatTabs');
        if (catDiv && typeof CELEB_CATS !== 'undefined') {
            var ic = typeof CELEB_CAT_ICONS !== 'undefined' ? CELEB_CAT_ICONS : {};
            ['?꾩껜'].concat(CELEB_CATS).forEach(function(c, i) {
                var b = document.createElement('button'); b.type='button'; b.dataset.cat = i===0?'':c;
                b.textContent = (ic[c]||'??) + ' ' + c;
                b.style.cssText = 'padding:3px 9px;border-radius:20px;font-size:0.7rem;border:1px solid rgba(244,114,182,'+(i===0?'0.6':'0.25')+');background:rgba(244,114,182,'+(i===0?'0.15':'0.04')+');color:'+(i===0?'#f9a8d4':'#94a3b8')+';cursor:pointer;white-space:nowrap;';
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

        /* 寃???낅젰 */
        var qEl = document.getElementById('astroSyQ');
        if (qEl) qEl.addEventListener('input', _astroRenderCelebList);

        /* 珥덇린 紐⑸줉 */
        _astroRenderCelebList();
    }, 200);

    /* ?? ?쒕굹?ㅽ듃由??뺣? 怨꾩궛 怨듯넻 ?좏떥 ?? */
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
        {deg:0, name:'??Conjunction)', symbol:'??, maxOrb:8, base:10, color:'#fbbf24'},
        {deg:60, name:'?≫빀(Sextile)', symbol:'??, maxOrb:4, base:5, color:'#34d399'},
        {deg:90, name:'吏곴컖(Square)', symbol:'??, maxOrb:6, base:-6, color:'#f87171'},
        {deg:120, name:'?쇳빀(Trine)', symbol:'??, maxOrb:6, base:8, color:'#818cf8'},
        {deg:150, name:'?몄빻??Quincunx)', symbol:'??, maxOrb:3, base:-2, color:'#fb923c'},
        {deg:180, name:'異?Opposition)', symbol:'??, maxOrb:7, base:-5, color:'#fb923c'}
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
      var labels = {Sun:'? ?쒖뼇',Moon:'????,Venus:'? 湲덉꽦',Mars:'???붿꽦'};
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
            pair: '??' + labels[mk] + ' 횞 ?곷? ' + labels[ok],
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
      var arr = ['遺?,'??,'怨듦린','臾?,'遺?,'??,'怨듦린','臾?,'遺?,'??,'怨듦린','臾?];
      return arr[idx % 12];
    }
    function _syWsHouseOf(planetSignIdx, ascIdx){
      if(planetSignIdx == null || ascIdx == null) return null;
      return ((planetSignIdx - ascIdx + 12) % 12) + 1;
    }
    function _syHouseTheme(h){
      var map = {
        1:'?뺤껜??泥レ씤??,2:'媛移??ъ젙',3:'?뚰넻/?대룞',4:'媛???뺤꽌湲곕컲',
        5:'?곗븷/李쎌“??,6:'?쇱긽/嫄닿컯',7:'?뚰듃?덉떗',8:'移쒕?媛?怨듬룞?먯썝',
        9:'?좊뀗/?뺤옣',10:'?ы쉶??紐⑺몴',11:'?곗젙/而ㅻ??덊떚',12:'臾댁쓽??移섏쑀'
      };
      return map[h] || '?댁꽍 遺덇?';
    }
    function _syTopAspectText(rows, positive){
      var arr = (rows || []).filter(function(r){ return positive ? r.weighted > 0 : r.weighted < 0; })
        .sort(function(a,b){ return Math.abs(b.weighted) - Math.abs(a.weighted); });
      if(!arr.length) return positive ? '媛뺥븳 議고솕媛??놁쓬' : '媛뺥븳 湲댁옣媛??놁쓬';
      var r0 = arr[0];
      return r0.pair + ' 쨌 ' + r0.asp.name + ' 쨌 orb ' + r0.asp.orb.toFixed(2) + '째';
    }
    function _syTopAspect(rows, positive){
      var arr = (rows || []).filter(function(r){ return positive ? r.weighted > 0 : r.weighted < 0; })
        .sort(function(a,b){ return Math.abs(b.weighted) - Math.abs(a.weighted); });
      return arr.length ? arr[0] : null;
    }
    function _syBuildNarrative(meta){
      var score = meta.score || 50;
      var rel;
      if(score >= 85) rel = '李곕뼞 ???몄뿰 - 留덉쓬, 媛移섍?, ?됰룞 ?쒗룷媛 怨좊Ⅴ寃???留욎븘??';
      else if(score >= 70) rel = '?④퍡 ?깆옣?섎뒗 ?몄뿰 - 湲곕낯 沅곹빀??醫뗪퀬, 媛덈벑????? ???덈뒗 議고빀?낅땲??';
      else if(score >= 55) rel = '諛?뱁삎 ?몄뿰 - ?뚮┝???ш퀬 遺?ろ옒???덉뼱, ?댁쁺 諛⑹떇??以묒슂?댁슂.';
      else if(score >= 40) rel = '?곗뒿???꾩슂???몄뿰 - ?쒕줈 留욎텛????붿? 洹쒖튃??瑗??꾩슂?⑸땲??';
      else rel = '?숈젣 留롮? ?몄뿰 - 寃쎄퀎 ?ㅼ젙怨??⑹쓽媛 ?놁쑝硫??쎄쾶 吏移????덉뼱??';

      var supportTxt = meta.support ? (meta.support.pair + ' ' + meta.support.asp.name) : '?쒕졆??議고솕媛??놁쓬';
      var challengeTxt = meta.challenge ? (meta.challenge.pair + ' ' + meta.challenge.asp.name) : '?쒕졆??湲댁옣媛??놁쓬';
      var sunStage = meta.mySunHouse ? (meta.mySunHouse+'H('+_syHouseTheme(meta.mySunHouse)+')') : '-';
      var moonStage = meta.myMoonHouse ? (meta.myMoonHouse+'H('+_syHouseTheme(meta.myMoonHouse)+')') : '-';
      var venusStage = meta.myVenusHouse ? (meta.myVenusHouse+'H('+_syHouseTheme(meta.myVenusHouse)+')') : '-';
      var h78Boost = (meta.overlayNorm != null && meta.overlayNorm > 0.14)
        ? '7H/8H ?ъ궗媛 媛뺥빐 愿怨꾩쓽 紐곗엯?꾩? 蹂??媛뺣룄媛 ?쎈땲??'
        : (meta.overlayNorm != null && meta.overlayNorm < -0.08)
          ? '12H/6H ?뺣젰??而ㅼ꽌 愿怨??쇰줈 ?섑샇媛 ?듭떖 怨쇱젣?낅땲??'
          : '7H/8H? ?쇱긽 ?섏슦?ㅺ? 洹좏삎?곸씠???댄뻾 ??웾???깊뙣瑜?媛由낅땲??';

      var love = '?곗븷?먯꽌??'+supportTxt+'???ㅻ젞???ㅼ슦怨? '+challengeTxt+'???ㅽ댘 ?ъ씤?멸? ?섍린 ?ъ썙?? '
        +'??湲덉꽦 '+venusStage+'怨???'+moonStage+'??媛먯젙 ?ъ씤?몃? 癒쇱? 留욎텛硫?留뚯”?꾧? ???щ씪媛묐땲??';
      var busi = '?묒뾽?먯꽌?????쒖뼇 ?ъ궗 ?섏슦??'+sunStage+'媛 硫붿씤 臾대??낅땲?? '
        +'??븷怨?梨낆엫???섏슦??二쇱젣??留욎떠 ?섎늻硫??깃낵???덉젙?섍퀬 ?먮꼫吏 ?뚮え??以꾩뼱??땲??';
      var spirit = '愿怨꾩쓽 ?깆옣 ?ъ씤?몃뒗 '+meta.myElem+'-'+meta.theirElem+' 議고빀?먯꽌 ?쒕윭?⑸땲?? '+h78Boost+' '
        +'?먯닔 '+score+'/100 援ш컙?먯꽌??"媛먯젙 ?뺣━ 猷⑦떞 + 媛덈벑 蹂듦린 洹쒖튃"??媛숈씠 留뚮뱾?섎줉 愿怨꾧? 鍮⑤━ 醫뗭븘吏묐땲??';

      return { relType: rel, loveDesc: love, busDesc: busi, spiritDesc: spirit };
    }

    /* ?? ?좊챸???좏깮 ???쒕굹?ㅽ듃由?寃곌낵 怨꾩궛 ?? */
    window._astroPickCeleb = function(name, birth, hour) {
        var resultDiv = document.getElementById('astroSyResult');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="color:#818cf8;font-size:0.85rem;padding:10px;text-align:center;">??泥쒖껜 怨꾩궛 以?..</div>';

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

                /* ?? 鍮쏄낵 洹몃┝???ㅼ썙???? */
                var myElem = _syElementOfSignIdx(sunIndex);
                var theirElem = _syElementOfSignIdx(celebSunIdx);
                var SHADOW = {
                    '遺?遺?: { light:'??遺덇퐙 媛숈? ?댁젙怨??먮꼫吏媛 利앺룺', shadow:'??????由щ뜑 湲곗쭏, 二쇰룄沅?異⑸룎 二쇱쓽', remedy:'?쒕줈???먮꼫吏瑜?寃쎌웳???꾨땶 李쎌“濡??뱁솕?쒗궎?몄슂' },
                    '遺???: { light:'???댁젙+?꾩떎媛먭컖???댁긽??議고빀',    shadow:'???띾룄 李⑥씠 ??遺덉? 鍮좊Ⅴ怨??숈? ?먮┰?덈떎', remedy:'?섏씠??議곗쑉: ?됰룞 ??異⑸텇???쇱쓽媛 ?좊ː瑜?留뚮벊?덈떎' },
                    '遺?怨듦린':{ light:'??李쎌쓽???곴컧????컻?섎뒗 愿怨?,   shadow:'??媛먯젙蹂대떎 ?몄뼱, ?쇱긽??援먮쪟??癒몃Ъ ???덉쓬', remedy:'吏꾩떖???댁? 源딆? ????쒓컙???섎룄?곸쑝濡?留뚮뱶?몄슂' },
                    '遺?臾?: { light:'???댁젙怨?媛먯꽦??議고솕, 媛뺣젹???뚮┝',shadow:'??湲곗쭏 異⑸룎 ??遺덉? ?댁꽦?? 臾쇱? 媛먯꽦??, remedy:'媛먯젙 ?몄뼱瑜?諛곗슦?몄슂. 怨듦컧 ?쒗쁽??紐⑤뱺 媛덈벑???뱀엯?덈떎' },
                    '????: { light:'???덉젙쨌?좊ː쨌?꾩떎???깆랬??理쒓컯 議고빀',shadow:'??蹂?붾? ?먮젮?뚰빐 ?뺤껜?????덉쓬',      remedy:'?덈줈??寃쏀뿕???④퍡 ?꾩쟾?섎ŉ 愿怨꾩뿉 ?좎꽑?⑥쓣 遺?댁＜?몄슂' },
                    '??怨듦린':{ light:'???ㅽ뻾?κ낵 ?꾩씠?붿뼱???꾨꼍 洹좏삎', shadow:'??媛移섍? 李⑥씠, 臾쇱쭏 vs ?댁긽',            remedy:'?쒕줈???멸퀎愿??議댁쨷?섎ŉ ?ㅻ쫫 ?띿뿉???쒕꼫吏瑜?李얠쑝?몄슂' },
                    '??臾?: { light:'???ъ슜怨??덉젙???곕쑜???명?由?,    shadow:'??臾쇱씠 ?숈쓣 臾닿쾪寃?留뚮뱾 ???덉쓬',       remedy:'媛먯젙???ㅼ슜?곸쑝濡??쒗쁽?섎㈃ 愿怨꾧? ?⑥뵮 ?먰솢?댁쭛?덈떎' },
                    '怨듦린-怨듦린':{ light:'??吏??援먮쪟? ?먯쑀???꾨꼍 怨듬챸', shadow:'??媛먯젙??源딆씠 遺議? ?쒕㈃??癒몃Ъ ???덉쓬', remedy:'?쒕줈??痍⑥빟?⑥쓣 ?쒕윭?대뒗 ?⑷린媛 吏꾩젙???곌껐??留뚮벊?덈떎' },
                    '怨듦린-臾?: { light:'???댁꽦怨?媛먯꽦???곹샇 蹂댁셿',       shadow:'??媛먯젙 ?쒗쁽 諛⑹떇??李⑥씠',               remedy:'怨듦린????留롮씠 ?쒗쁽?섍퀬, 臾쇱? ??留롮씠 ?댄빐?섎뒗 ?곗뒿???꾩슂?⑸땲?? },
                    '臾?臾?: { light:'???곸쟻쨌媛먯젙???꾨꼍 怨듬챸',           shadow:'??媛먯젙 ?뚯슜?뚯씠??鍮좎쭏 ???덉쓬',        remedy:'?꾩떎??援ъ“? 寃쎄퀎瑜??④퍡 留뚮뱾??媛먯젙??議곗쑉?섏꽭?? }
                };
                var shadowKey = [myElem, theirElem].sort().join('-');
                var shadowInfo = SHADOW[shadowKey] || { light:'?????먮꼫吏媛 ?낇듅??議고솕瑜??대９?덈떎', shadow:'???쒕줈???ㅻ쫫???댄빐?섎뒗 怨쇱젙???꾩슂?⑸땲??, remedy:'怨듯넻 愿?ъ궗瑜??섎━硫?泥쒖쿇???좊ː瑜??볦븘媛?몄슂' };

                var hasExactTime = !!(celebRec && (celebRec.timeKnown === true || ((celebRec.hour != null && celebRec.minute != null) && (celebRec.hour !== 12 || celebRec.minute !== 0))));
                var isUnknownTime = !hasExactTime;
                var flag = (typeof COUNTRY_CONFIG !== 'undefined' && COUNTRY_CONFIG[(celebRec || {}).nationality]) ? COUNTRY_CONFIG[(celebRec || {}).nationality].flag + ' ' : '';
                var geoMetaText = hasExactGeo
                  ? ('?뱧 ' + (g.label || '異쒖깮?꾩떆') + ' 醫뚰몴 ?곸슜')
                  : ('?뱧 ' + ((COUNTRY_CONFIG[nat] && COUNTRY_CONFIG[nat].label) ? COUNTRY_CONFIG[nat].label : '援??') + ' ??쒕룄??醫뚰몴 ?곸슜');
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

                /* ?? HTML ?뚮뜑 ?? */
                var html2 = '<div style="border-top:1px solid rgba(129,140,248,0.3);margin-top:10px;padding-top:12px;">';

                /* ?ㅻ뜑 */
                html2 += '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">'
                    +'<div style="font-size:1rem;font-weight:900;color:#e0d0ff;">' + flag + name + '</div>'
                    +'<div style="background:rgba(129,140,248,0.15);border:1px solid rgba(129,140,248,0.4);padding:2px 10px;border-radius:20px;font-size:0.72rem;color:#a5b4fc;">'
                    + celebSunSign + ' ?</div>'
                  +'<div style="font-size:0.65rem;color:#94a3b8;border:1px solid rgba(148,163,184,0.3);padding:2px 8px;border-radius:10px;">'+geoMetaText+'</div>'
                    + (isUnknownTime ? '<div style="font-size:0.65rem;color:#64748b;border:1px dashed #334155;padding:2px 8px;border-radius:10px;">???쒖뼱???쒓컙???뺥솗?섏? ?딆븘 ???곸듅沅??섏슦?ㅻ뒗 ?ㅼ감媛 ?덉쓣 ???덉뼱??/div>' : '')
                    +'</div>';

                /* ?ㅼ퐫??+ ?곷? ?섑깉 */
                html2 += '<div style="display:grid;grid-template-columns:auto 1fr;gap:10px;margin-bottom:12px;align-items:start;">'
                    +'<div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:14px;text-align:center;min-width:80px;">'
                    +'<div style="font-size:0.65rem;color:#818cf8;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;">?쒕굹?ㅽ듃由?/div>'
                    +'<div style="font-size:2.2rem;font-weight:900;color:'+scoreColor+';line-height:1;">'+synScore+'</div>'
                    +'<div style="font-size:0.6rem;color:#64748b;margin-top:2px;">/100</div>'
                    +'</div>'
                    +'<div style="display:flex;flex-direction:column;gap:5px;">'
                    +'<div style="font-size:0.75rem;color:#e2e8f0;line-height:1.4;font-weight:700;word-break:keep-all;">'+relType+'</div>'
                    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;">'
                    +'<div style="background:rgba(251,191,36,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#fde68a;"><span style="color:#94a3b8;">?</span> '+celebSunSign+'</div>'
                    +'<div style="background:rgba(148,163,184,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#e2e8f0;"><span style="color:#94a3b8;">??/span> '+celebMoonSign+'</div>'
                    +'<div style="background:rgba(244,114,182,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#fbcfe8;"><span style="color:#94a3b8;">?</span> '+celebVSign+'</div>'
                    +'<div style="background:rgba(239,68,68,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#fca5a5;"><span style="color:#94a3b8;">??/span> '+celebMSign+'</div>'
                    +'</div>'
                    +'</div>'
                    +'</div>';

                /* 愿怨?遺꾩꽍 3醫?*/
                html2 += '<div style="display:grid;grid-template-columns:1fr;gap:6px;margin-bottom:12px;">'
                    +'<div style="background:rgba(244,114,182,0.08);border-radius:10px;padding:10px 12px;border:1px solid rgba(244,114,182,0.2);">'
                    +'<div style="font-size:0.72rem;color:#f472b6;font-weight:700;margin-bottom:4px;">?뮆 ?곗븷 沅곹빀</div>'
                    +'<p style="font-size:0.82rem;color:#e2e8f0;margin:0;line-height:1.6;word-break:keep-all;">'+loveDesc+'</p></div>'
                    +'<div style="background:rgba(251,191,36,0.07);border-radius:10px;padding:10px 12px;border:1px solid rgba(251,191,36,0.18);">'
                    +'<div style="font-size:0.72rem;color:#fbbf24;font-weight:700;margin-bottom:4px;">?쩃 鍮꾩쫰?덉뒪 沅곹빀</div>'
                    +'<p style="font-size:0.82rem;color:#e2e8f0;margin:0;line-height:1.6;word-break:keep-all;">'+busDesc+'</p></div>'
                    +'<div style="background:rgba(129,140,248,0.07);border-radius:10px;padding:10px 12px;border:1px solid rgba(129,140,248,0.18);">'
                    +'<div style="font-size:0.72rem;color:#818cf8;font-weight:700;margin-bottom:4px;">???곸쟻 沅곹빀</div>'
                    +'<p style="font-size:0.82rem;color:#e2e8f0;margin:0;line-height:1.6;word-break:keep-all;">'+spiritDesc+'</p></div>'
                    +'</div>';

                html2 += '<div style="background:rgba(99,102,241,0.08);border:1px solid rgba(129,140,248,0.25);border-radius:10px;padding:10px;margin-bottom:12px;">'
                  +'<div style="font-size:0.72rem;color:#a5b4fc;font-weight:700;margin-bottom:6px;">?뱤 ?먯닔???대젃寃?怨꾩궛?쇱슂</div>'
                  +'<div style="font-size:0.8rem;color:#e2e8f0;line-height:1.65;">'
                  +'?뺢퇋???먯닔: <b>'+synScore+'</b>/100 쨌 媛以??⑹궛: <b>'+synRaw.toFixed(2)+'</b> / 理쒕? '+synMax.toFixed(2)+'<br>'
                  +'?섏슦???ㅻ쾭?덉씠 蹂댁젙(7H/8H ?ы븿): <b>'+overlayScore.toFixed(2)+'</b> 쨌 ?곹뼢??'+(overlayNorm*100).toFixed(1)+'% ('+overlayMode+')<br>'
                  +'?댁꽍 ?좊ː??媛곷룄 ?곗씠??湲곗?): <b>'+synConfidence+'%</b><br>'
                  +'媛??媛뺥븳 議고솕: '+bestSupport+'<br>'
                  +'媛??媛뺥븳 湲댁옣: '+bestChallenge
                  +'</div>'
                  +'</div>';

                /* 寃곗젙??媛곷룄 ?뚯씠釉?*/
                if (aspectRows.length > 0) {
                    html2 += '<div style="margin-bottom:12px;">'
                        +'<div style="font-size:0.72rem;color:#94a3b8;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">??寃곗젙??媛곷룄 (Major Aspects)</div>'
                        +'<div style="display:flex;flex-direction:column;gap:4px;">';
                    aspectRows.slice(0, 8).forEach(function(r) {
                        html2 += '<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.03);border-radius:7px;padding:6px 10px;">'
                            +'<span style="font-size:1rem;color:'+r.asp.color+';">'+r.asp.symbol+'</span>'
                            +'<span style="font-size:0.72rem;color:#e2e8f0;flex:1;">'+r.pair+'</span>'
                      +'<span style="font-size:0.68rem;background:rgba('+( r.weighted>0?'52,211,153':'239,68,68' )+',0.15);color:'+r.asp.color+';padding:2px 7px;border-radius:10px;">'+r.asp.name+' 쨌 orb '+r.asp.orb.toFixed(2)+'째</span>'
                            +'</div>';
                    });
                    html2 += '</div></div>';
                }

                html2 += '<div style="background:rgba(20,25,35,0.6);border:1px solid rgba(129,140,248,0.2);border-radius:10px;padding:10px;margin-bottom:12px;">'
                  +'<div style="font-size:0.72rem;color:#818cf8;font-weight:700;margin-bottom:6px;">?룧 ?섏슦??寃뱀묠 蹂닿린 (蹂꾩옄由?湲곗?)</div>'
                  +'<div style="font-size:0.8rem;color:#e2e8f0;line-height:1.6;">'
                  +'???쒖뼇(?)???곷? 李⑦듃??<b>'+(overlayMySunToTheir ? overlayMySunToTheir + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?곷? ?쒖뼇(?)????李⑦듃??<b>'+(overlayTheirSunToMy ? overlayTheirSunToMy + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?????????곷? 李⑦듃??<b>'+(overlayMyMoonToTheir ? overlayMyMoonToTheir + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?곷? ????????李⑦듃??<b>'+(overlayTheirMoonToMy ? overlayTheirMoonToMy + 'H' : '-')+'</b>???ъ궗<br>'
                  +'??湲덉꽦(?)???곷? 李⑦듃??<b>'+(overlayMyVenusToTheir ? overlayMyVenusToTheir + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?곷? 湲덉꽦(?)????李⑦듃??<b>'+(overlayTheirVenusToMy ? overlayTheirVenusToMy + 'H' : '-')+'</b>???ъ궗'
                  +'</div>'
                  +'<div style="font-size:0.74rem;color:#94a3b8;margin-top:6px;line-height:1.55;">'
                  +'?쒖뼇 ?ъ궗 ?섏슦?ㅻ뒗 愿怨꾩쓽 以묒떖 臾대?(?먯븘/紐⑺몴)瑜? 湲덉꽦 ?ъ궗 ?섏슦?ㅻ뒗 ?좎젙 ?쒗쁽怨??멸컧 ?묐룞 ?곸뿭??蹂댁뿬以띾땲?? '
                  +(overlayMySunToTheir ? ('???쒖뼇? ?곷???'+overlayMySunToTheir+'H('+_syHouseTheme(overlayMySunToTheir)+')??媛뺥븯寃??묐룞?⑸땲?? ') : '')
                  +(overlayTheirSunToMy ? ('?곷? ?쒖뼇? ??'+overlayTheirSunToMy+'H('+_syHouseTheme(overlayTheirSunToMy)+')瑜??먭레?⑸땲??') : '')
                  +'</div>'
                  +'</div>';

                /* 鍮쏄낵 洹몃┝??*/
                html2 += '<div style="background:rgba(15,23,42,0.6);border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,0.07);">'
                    +'<div style="font-size:0.72rem;color:#94a3b8;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">?뽳툘 鍮쏄낵 洹몃┝??/div>'
                    +'<div style="font-size:0.8rem;color:#86efac;margin-bottom:5px;line-height:1.5;">'+shadowInfo.light+'</div>'
                    +'<div style="font-size:0.8rem;color:#fca5a5;margin-bottom:8px;line-height:1.5;">'+shadowInfo.shadow+'</div>'
                    +'<div style="font-size:0.78rem;background:rgba(129,140,248,0.1);border-left:3px solid #818cf8;padding:8px 10px;border-radius:0 8px 8px 0;color:#c7d2fe;line-height:1.6;word-break:keep-all;">'
                    +'?뙼 <b>媛쒖꽑??湲?/b>: '+shadowInfo.remedy
                    +'</div>'
                    +'</div>'
                    +'</div>';

                resultDiv.innerHTML = html2;
                resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch(e) {
                resultDiv.innerHTML = '<p style="color:#f87171;font-size:0.85rem;">?쒕굹?ㅽ듃由?怨꾩궛 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ' + (e.message || e) + '</p>';
            }
        }, 50);
    };

    /* ?? ?뮂 吏곸젒 ?낅젰 ?쒕굹?ㅽ듃由?怨꾩궛 ?⑥닔 ?? */
    window._astroDirectSynastry = function() {
        var resultDiv = document.getElementById('asDirectResult');
        if (!resultDiv) return;

        var nameVal = (document.getElementById('asDirect_name') || {}).value || '?곷?諛?;
        var dateVal = (document.getElementById('asDirect_date') || {}).value;
        var timeVal = (document.getElementById('asDirect_time') || {}).value || '12:00';
        var cityEl  = document.getElementById('asDirect_city');
        var tzVal   = 9;
        var latVal  = (lat != null) ? Number(lat) : 37.5665;
        var lonVal  = (lon != null) ? Number(lon) : 126.9780;

        if (!dateVal) {
            resultDiv.innerHTML = '<p style="color:#f87171;font-size:0.85rem;padding:8px;">???곷?諛⑹쓽 ?앸뀈?붿씪???낅젰??二쇱꽭??</p>';
            return;
        }

        resultDiv.innerHTML = '<div style="color:#f59e0b;font-size:0.85rem;padding:10px;text-align:center;">??泥쒖껜 怨꾩궛 以묅?/div>';

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
                    '遺?遺?:     { light:'??遺덇퐙 媛숈? ?댁젙怨??먮꼫吏媛 利앺룺',     shadow:'??????由щ뜑 湲곗쭏, 二쇰룄沅?異⑸룎 二쇱쓽',        remedy:'?쒕줈???먮꼫吏瑜?寃쎌웳???꾨땶 李쎌“濡??뱁솕?쒗궎?몄슂' },
                    '遺???:     { light:'???댁젙+?꾩떎媛먭컖???댁긽??議고빀',         shadow:'???띾룄 李⑥씠 ??遺덉? 鍮좊Ⅴ怨??숈? ?먮┰?덈떎',     remedy:'?섏씠??議곗쑉: ?됰룞 ??異⑸텇???쇱쓽媛 ?좊ː瑜?留뚮벊?덈떎' },
                    '遺?怨듦린':   { light:'??李쎌쓽???곴컧????컻?섎뒗 愿怨?,         shadow:'??媛먯젙蹂대떎 ?몄뼱, ?쇱긽??援먮쪟??癒몃Ъ ???덉쓬', remedy:'吏꾩떖???댁? 源딆? ????쒓컙???섎룄?곸쑝濡?留뚮뱶?몄슂' },
                    '遺?臾?:     { light:'???댁젙怨?媛먯꽦??議고솕, 媛뺣젹???뚮┝',     shadow:'??湲곗쭏 異⑸룎 ??遺덉? ?댁꽦?? 臾쇱? 媛먯꽦??,      remedy:'媛먯젙 ?몄뼱瑜?諛곗슦?몄슂. 怨듦컧 ?쒗쁽??紐⑤뱺 媛덈벑???뱀엯?덈떎' },
                    '????:     { light:'???덉젙쨌?좊ː쨌?꾩떎???깆랬??理쒓컯 議고빀',   shadow:'??蹂?붾? ?먮젮?뚰빐 ?뺤껜?????덉쓬',             remedy:'?덈줈??寃쏀뿕???④퍡 ?꾩쟾?섎ŉ 愿怨꾩뿉 ?좎꽑?⑥쓣 遺?댁＜?몄슂' },
                    '??怨듦린':   { light:'???ㅽ뻾?κ낵 ?꾩씠?붿뼱???꾨꼍 洹좏삎',       shadow:'??媛移섍? 李⑥씠, 臾쇱쭏 vs ?댁긽',                  remedy:'?쒕줈???멸퀎愿??議댁쨷?섎ŉ ?ㅻ쫫 ?띿뿉???쒕꼫吏瑜?李얠쑝?몄슂' },
                    '??臾?:     { light:'???ъ슜怨??덉젙???곕쑜???명?由?,         shadow:'??臾쇱씠 ?숈쓣 臾닿쾪寃?留뚮뱾 ???덉쓬',              remedy:'媛먯젙???ㅼ슜?곸쑝濡??쒗쁽?섎㈃ 愿怨꾧? ?⑥뵮 ?먰솢?댁쭛?덈떎' },
                    '怨듦린-怨듦린': { light:'??吏??援먮쪟? ?먯쑀???꾨꼍 怨듬챸',        shadow:'??媛먯젙??源딆씠 遺議? ?쒕㈃??癒몃Ъ ???덉쓬',      remedy:'?쒕줈??痍⑥빟?⑥쓣 ?쒕윭?대뒗 ?⑷린媛 吏꾩젙???곌껐??留뚮벊?덈떎' },
                    '怨듦린-臾?:   { light:'???댁꽦怨?媛먯꽦???곹샇 蹂댁셿',             shadow:'??媛먯젙 ?쒗쁽 諛⑹떇??李⑥씠',                      remedy:'怨듦린????留롮씠 ?쒗쁽?섍퀬, 臾쇱? ??留롮씠 ?댄빐?섎뒗 ?곗뒿???꾩슂?⑸땲?? },
                    '臾?臾?:     { light:'???곸쟻쨌媛먯젙???꾨꼍 怨듬챸',               shadow:'??媛먯젙 ?뚯슜?뚯씠??鍮좎쭏 ???덉쓬',               remedy:'?꾩떎??援ъ“? 寃쎄퀎瑜??④퍡 留뚮뱾??媛먯젙??議곗쑉?섏꽭?? }
                };
                var shadowKey2 = [myElem2, theirElem2].sort().join('-');
                var shadowInfo2 = SHADOW2[shadowKey2] || { light:'?????먮꼫吏媛 ?낇듅??議고솕瑜??대９?덈떎', shadow:'???쒕줈???ㅻ쫫???댄빐?섎뒗 怨쇱젙???꾩슂?⑸땲??, remedy:'怨듯넻 愿?ъ궗瑜??섎━硫?泥쒖쿇???좊ː瑜??볦븘媛?몄슂' };

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

                /* ?? ?뚮뜑 ?? */
                var h = '<div style="border-top:1px solid rgba(245,158,11,0.3);margin-top:10px;padding-top:12px;">';

                h += '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">'
                    +'<div style="font-size:1rem;font-weight:900;color:#fde68a;">'+nameVal+'</div>'
                    +'<div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);padding:2px 10px;border-radius:20px;font-size:0.72rem;color:#fde68a;">'
                    + pSunSign + ' ?</div>'
                    +'<div style="font-size:0.65rem;color:#64748b;border:1px solid #334155;padding:2px 8px;border-radius:10px;">UTC+'+tzVal+'</div>'
                    +'</div>';

                h += '<div style="display:grid;grid-template-columns:auto 1fr;gap:10px;margin-bottom:12px;align-items:start;">'
                    +'<div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:14px;text-align:center;min-width:80px;">'
                    +'<div style="font-size:0.65rem;color:#f59e0b;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;">?쒕굹?ㅽ듃由?/div>'
                    +'<div style="font-size:2.2rem;font-weight:900;color:'+scoreColor2+';line-height:1;">'+synScore2+'</div>'
                    +'<div style="font-size:0.6rem;color:#64748b;margin-top:2px;">/100</div>'
                    +'</div>'
                    +'<div style="display:flex;flex-direction:column;gap:5px;">'
                    +'<div style="font-size:0.75rem;color:#e2e8f0;line-height:1.4;font-weight:700;word-break:keep-all;">'+relType2+'</div>'
                    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;">'
                    +'<div style="background:rgba(251,191,36,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#fde68a;"><span style="color:#94a3b8;">?</span> '+pSunSign+'</div>'
                    +'<div style="background:rgba(148,163,184,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#e2e8f0;"><span style="color:#94a3b8;">??/span> '+pMoonSign+'</div>'
                    +'<div style="background:rgba(244,114,182,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#fbcfe8;"><span style="color:#94a3b8;">?</span> '+pVSign+'</div>'
                    +'<div style="background:rgba(239,68,68,0.08);padding:5px 7px;border-radius:6px;font-size:0.68rem;color:#fca5a5;"><span style="color:#94a3b8;">??/span> '+pMSign+'</div>'
                    +'</div>'
                    +'</div>'
                    +'</div>';

                h += '<div style="display:grid;grid-template-columns:1fr;gap:6px;margin-bottom:12px;">'
                    +'<div style="background:rgba(244,114,182,0.08);border-radius:10px;padding:10px 12px;border:1px solid rgba(244,114,182,0.2);">'
                    +'<div style="font-size:0.72rem;color:#f472b6;font-weight:700;margin-bottom:4px;">?뮆 ?곗븷 沅곹빀</div>'
                    +'<p style="font-size:0.82rem;color:#e2e8f0;margin:0;line-height:1.6;word-break:keep-all;">'+loveDesc2+'</p></div>'
                    +'<div style="background:rgba(251,191,36,0.07);border-radius:10px;padding:10px 12px;border:1px solid rgba(251,191,36,0.18);">'
                    +'<div style="font-size:0.72rem;color:#fbbf24;font-weight:700;margin-bottom:4px;">?쩃 鍮꾩쫰?덉뒪 沅곹빀</div>'
                    +'<p style="font-size:0.82rem;color:#e2e8f0;margin:0;line-height:1.6;word-break:keep-all;">'+busDesc2+'</p></div>'
                    +'<div style="background:rgba(129,140,248,0.07);border-radius:10px;padding:10px 12px;border:1px solid rgba(129,140,248,0.18);">'
                    +'<div style="font-size:0.72rem;color:#818cf8;font-weight:700;margin-bottom:4px;">???곸쟻 沅곹빀</div>'
                    +'<p style="font-size:0.82rem;color:#e2e8f0;margin:0;line-height:1.6;word-break:keep-all;">'+spiritDesc2+'</p></div>'
                    +'</div>';

                if (aspectRows2.length > 0) {
                    h += '<div style="margin-bottom:12px;">'
                        +'<div style="font-size:0.72rem;color:#94a3b8;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">??寃곗젙??媛곷룄 (Major Aspects)</div>'
                        +'<div style="display:flex;flex-direction:column;gap:4px;">';
                    aspectRows2.slice(0, 8).forEach(function(r) {
                        h += '<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.03);border-radius:7px;padding:6px 10px;">'
                            +'<span style="font-size:1rem;color:'+r.asp.color+';">'+r.asp.symbol+'</span>'
                            +'<span style="font-size:0.72rem;color:#e2e8f0;flex:1;">'+r.pair+'</span>'
                      +'<span style="font-size:0.68rem;background:rgba('+(r.weighted>0?'52,211,153':'239,68,68')+',0.15);color:'+r.asp.color+';padding:2px 7px;border-radius:10px;">'+r.asp.name+' 쨌 orb '+r.asp.orb.toFixed(2)+'째</span>'
                            +'</div>';
                    });
                    h += '</div></div>';
                }

                h += '<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.28);border-radius:10px;padding:10px;margin-bottom:12px;">'
                  +'<div style="font-size:0.72rem;color:#fbbf24;font-weight:700;margin-bottom:6px;">?뱤 ?ㅻ툕 媛以묒튂 ?먯닔 洹쇨굅</div>'
                  +'<div style="font-size:0.8rem;color:#e2e8f0;line-height:1.65;">'
                  +'?뺢퇋???먯닔: <b>'+synScore2+'</b>/100 쨌 媛以??⑹궛: <b>'+synRaw2.toFixed(2)+'</b> / 理쒕? '+synMax2.toFixed(2)+'<br>'
                  +'?섏슦???ㅻ쾭?덉씠 蹂댁젙(7H/8H ?ы븿): <b>'+overlayScore2.toFixed(2)+'</b> 쨌 ?곹뼢??'+(overlayNorm2*100).toFixed(1)+'% ('+overlayMode2+')<br>'
                  +'?댁꽍 ?좊ː??媛곷룄 湲곕컲): <b>'+synConfidence2+'%</b><br>'
                  +'媛??媛뺥븳 議고솕: '+bestSupport2+'<br>'
                  +'媛??媛뺥븳 湲댁옣: '+bestChallenge2
                  +'</div>'
                  +'</div>';

                h += '<div style="background:rgba(20,25,35,0.6);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:10px;margin-bottom:12px;">'
                  +'<div style="font-size:0.72rem;color:#f59e0b;font-weight:700;margin-bottom:6px;">?룧 ?섏슦???ㅻ쾭?덉씠 (Whole Sign 湲곗?)</div>'
                  +'<div style="font-size:0.8rem;color:#e2e8f0;line-height:1.6;">'
                  +'???쒖뼇(?)???곷? 李⑦듃??<b>'+(ovMySunToPartner ? ovMySunToPartner + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?곷? ?쒖뼇(?)????李⑦듃??<b>'+(ovPartnerSunToMy ? ovPartnerSunToMy + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?????????곷? 李⑦듃??<b>'+(ovMyMoonToPartner ? ovMyMoonToPartner + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?곷? ????????李⑦듃??<b>'+(ovPartnerMoonToMy ? ovPartnerMoonToMy + 'H' : '-')+'</b>???ъ궗<br>'
                  +'??湲덉꽦(?)???곷? 李⑦듃??<b>'+(ovMyVenusToPartner ? ovMyVenusToPartner + 'H' : '-')+'</b>???ъ궗<br>'
                  +'?곷? 湲덉꽦(?)????李⑦듃??<b>'+(ovPartnerVenusToMy ? ovPartnerVenusToMy + 'H' : '-')+'</b>???ъ궗'
                  +'</div>'
                  +'<div style="font-size:0.74rem;color:#94a3b8;margin-top:6px;line-height:1.55;">'
                  +'?쒖뼇 ?ъ궗??愿怨꾩쓽 以묒떖 臾대?瑜? 湲덉꽦 ?ъ궗???좎젙 援먰솚 諛⑹떇怨??멸컧 肄붾뱶瑜?蹂댁뿬以띾땲?? '
                  +(ovMySunToPartner ? ('???쒖뼇? ?곷???'+ovMySunToPartner+'H('+_syHouseTheme(ovMySunToPartner)+')瑜??쒖꽦?뷀빀?덈떎. ') : '')
                  +(ovPartnerSunToMy ? ('?곷? ?쒖뼇? ??'+ovPartnerSunToMy+'H('+_syHouseTheme(ovPartnerSunToMy)+')瑜??먭레?⑸땲??') : '')
                  +'</div>'
                  +'</div>';

                h += '<div style="background:rgba(15,23,42,0.6);border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,0.07);">'
                    +'<div style="font-size:0.72rem;color:#94a3b8;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">?뽳툘 鍮쏄낵 洹몃┝??/div>'
                    +'<div style="font-size:0.8rem;color:#86efac;margin-bottom:5px;line-height:1.5;">'+shadowInfo2.light+'</div>'
                    +'<div style="font-size:0.8rem;color:#fca5a5;margin-bottom:8px;line-height:1.5;">'+shadowInfo2.shadow+'</div>'
                    +'<div style="font-size:0.78rem;background:rgba(245,158,11,0.1);border-left:3px solid #f59e0b;padding:8px 10px;border-radius:0 8px 8px 0;color:#fde68a;line-height:1.6;word-break:keep-all;">'
                    +'?뙼 <b>媛쒖꽑??湲?/b>: '+shadowInfo2.remedy
                    +'</div>'
                    +'</div></div>';

                resultDiv.innerHTML = h;
                resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                try {
                  var wHost = document.createElement('div');
                  resultDiv.appendChild(wHost);
                  cdEnsureCompatLlmReady(function () {
                    if (!window.CompatLlm || typeof window.CompatLlm.mountWesternFromPayload !== 'function') {
                      wHost.innerHTML = '<div style="color:#fda4af;font-size:0.85rem;padding:10px;border-radius:10px;border:1px solid rgba(251,113,133,0.35);margin-top:10px;">AI ?꾨＼?꾪듃 紐⑤뱢??遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?덈줈怨좎묠 ???ㅼ떆 ?쒕룄??二쇱꽭??</div>';
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
                        houseSystem: (window.ASTRO_HOUSE_SYSTEM || 'P') + ' (Swiss/API; ?섏슦???ㅻ쾭?덉씠???곷?쨌蹂몄씤 ?곸듅沅?湲곗? Whole Sign ?ㅽ????ъ궗)',
                        overlayBasis: '?곷? 蹂몄씤 ascendant idx媛 ?덉쓣 ?뚮쭔 ?섏슦??踰덊샇 ?곗텧; asc 誘몄긽?대㈃ ?쇰? ?ㅻ쾭?덉씠媛 鍮꾧굅??遺?뺥솗?????덉쓬'
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
                      personA: { label: '??, sun: mySunN, moon: myMoonN, venus: myVenN, mars: myMarN },
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
                        mySunInPartnerHouse: ovMySunToPartner ? ovMySunToPartner + 'H ??' + _syHouseTheme(ovMySunToPartner) : null,
                        partnerSunInMyHouse: ovPartnerSunToMy ? ovPartnerSunToMy + 'H ??' + _syHouseTheme(ovPartnerSunToMy) : null,
                        myMoonInPartnerHouse: ovMyMoonToPartner ? ovMyMoonToPartner + 'H ??' + _syHouseTheme(ovMyMoonToPartner) : null,
                        partnerMoonInMyHouse: ovPartnerMoonToMy ? ovPartnerMoonToMy + 'H ??' + _syHouseTheme(ovPartnerMoonToMy) : null,
                        myVenusInPartnerHouse: ovMyVenusToPartner ? ovMyVenusToPartner + 'H ??' + _syHouseTheme(ovMyVenusToPartner) : null,
                        partnerVenusInMyHouse: ovPartnerVenusToMy ? ovPartnerVenusToMy + 'H ??' + _syHouseTheme(ovPartnerVenusToMy) : null,
                        myMarsInPartnerHouse: ovMyMarsToPartner ? ovMyMarsToPartner + 'H ??' + _syHouseTheme(ovMyMarsToPartner) : null,
                        partnerMarsInMyHouse: ovPartnerMarsToMy ? ovPartnerMarsToMy + 'H ??' + _syHouseTheme(ovPartnerMarsToMy) : null
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
                resultDiv.innerHTML = '<p style="color:#f87171;font-size:0.85rem;">怨꾩궛 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ' + (e.message || e) + '</p>';
            }
        }, 50);
    };

}

/* ??????? ?먮??먯닔 12沅??ъ링 遺꾩꽍 ?붿빟 ??????? */
// 怨좎젙 諛앷린?쒕? ?쒓굅?섍퀬 蹂꾩쓽 ?꾩긽/?ㅽ뻾/?쒓컙 湲곕컲 怨꾩궛?앹쑝濡?諛앷린瑜??곗텧?쒕떎.
var ZW_BRANCH_ELEMENT = {
  '耶?:'water','訝?:'earth','野?:'wood','??:'wood','渦?:'earth','藥?:'fire',
  '??:'fire','??:'earth','??:'metal','??:'metal','??:'earth','雅?:'water'
};
var ZW_BRANCH_YINYANG = {
  '耶?:'yang','訝?:'yin','野?:'yang','??:'yin','渦?:'yang','藥?:'yin',
  '??:'yang','??:'yin','??:'yang','??:'yin','??:'yang','雅?:'yin'
};
var ZW_ELEMENT_GENERATES = {'wood':'fire','fire':'earth','earth':'metal','metal':'water','water':'wood'};
var ZW_ELEMENT_CONTROLS = {'wood':'earth','earth':'water','water':'fire','fire':'metal','metal':'wood'};
var ZW_STAR_PROFILE = {
  '?먮?': { element:'earth', yinYang:'yang', phase:4, amp:2.1, bias:0.95 },
  '泥쒓린': { element:'wood', yinYang:'yin', phase:2, amp:2.05, bias:0.85 },
  '?쒖뼇': { element:'fire', yinYang:'yang', phase:5, amp:2.2, bias:0.8 },
  '臾닿끝': { element:'metal', yinYang:'yin', phase:8, amp:2.1, bias:0.2 },
  '泥쒕룞': { element:'water', yinYang:'yang', phase:0, amp:2.0, bias:0.3 },
  '?쇱젙': { element:'fire', yinYang:'yin', phase:6, amp:2.0, bias:0.7 },
  '泥쒕?': { element:'earth', yinYang:'yang', phase:2, amp:2.05, bias:0.8 },
  '?쒖쓬': { element:'water', yinYang:'yin', phase:10, amp:2.15, bias:0.8 },
  '?먮옉': { element:'wood', yinYang:'yang', phase:6, amp:2.0, bias:0.75 },
  '嫄곕Ц': { element:'water', yinYang:'yin', phase:9, amp:2.0, bias:0.7 },
  '泥쒖긽': { element:'water', yinYang:'yang', phase:3, amp:1.95, bias:0.75 },
  '泥쒕웾': { element:'earth', yinYang:'yang', phase:4, amp:1.95, bias:0.75 },
  '移좎궡': { element:'metal', yinYang:'yang', phase:7, amp:2.05, bias:0.7 },
  '?뚭뎔': { element:'water', yinYang:'yin', phase:10, amp:2.1, bias:0.1 },
  '醫뚮낫': { element:'earth', yinYang:'yang', phase:2, amp:1.55, bias:0.55 },
  '?고븘': { element:'earth', yinYang:'yin', phase:8, amp:1.55, bias:0.9 },
  '臾몄갹': { element:'metal', yinYang:'yang', phase:1, amp:1.5, bias:0.5 },
  '臾멸끝': { element:'water', yinYang:'yin', phase:9, amp:1.5, bias:0.5 },
  '?뱀〈': { element:'earth', yinYang:'yang', phase:5, amp:1.45, bias:0.55 },
  '泥쒕쭏': { element:'fire', yinYang:'yang', phase:8, amp:1.55, bias:0.45 },
  '泥쒓눼': { element:'fire', yinYang:'yang', phase:11, amp:1.35, bias:0.55 },
  '泥쒖썡': { element:'water', yinYang:'yin', phase:5, amp:1.35, bias:0.55 },
  '寃쎌뼇': { element:'metal', yinYang:'yang', phase:7, amp:1.45, bias:0.95 },
  '???: { element:'earth', yinYang:'yin', phase:3, amp:1.45, bias:0.2 },
  '?붿꽦': { element:'fire', yinYang:'yang', phase:5, amp:1.5, bias:0.2 },
  '?곸꽦': { element:'fire', yinYang:'yin', phase:11, amp:1.5, bias:0.2 },
  '吏怨?: { element:'metal', yinYang:'yin', phase:10, amp:1.35, bias:0.2 },
  '吏寃?: { element:'water', yinYang:'yang', phase:0, amp:1.35, bias:0.2 }
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
  '?먮?':{'耶?:'??,'訝?:'臾?,'野?:'??,'??:'??,'渦?:'臾?,'藥?:'??,'??:'臾?,'??:'臾?,'??:'??,'??:'??,'??:'臾?,'雅?:'??},
  '泥쒓린':{'耶?:'??,'訝?:'??,'野?:'??,'??:'??,'渦?:'??,'藥?:'由?,'??:'??,'??:'??,'??:'臾?,'??:'??,'??:'??,'雅?:'臾?},
  '?쒖뼇':{'耶?:'??,'訝?:'??,'野?:'臾?,'??:'臾?,'渦?:'??,'藥?:'??,'??:'臾?,'??:'??,'??:'??,'??:'??,'??:'??,'雅?:'??},
  '臾닿끝':{'耶?:'臾?,'訝?:'??,'野?:'由?,'??:'??,'渦?:'臾?,'藥?:'??,'??:'??,'??:'??,'??:'??,'??:'臾?,'??:'??,'雅?:'由?},
  '泥쒕룞':{'耶?:'??,'訝?:'??,'野?:'??,'??:'臾?,'渦?:'??,'藥?:'??,'??:'??,'??:'臾?,'??:'??,'??:'??,'??:'由?,'雅?:'??},
  '?쇱젙':{'耶?:'??,'訝?:'??,'野?:'臾?,'??:'??,'渦?:'臾?,'藥?:'??,'??:'臾?,'??:'臾?,'??:'臾?,'??:'??,'??:'??,'雅?:'??},
  '泥쒕?':{'耶?:'臾?,'訝?:'臾?,'野?:'??,'??:'??,'渦?:'臾?,'藥?:'??,'??:'臾?,'??:'臾?,'??:'??,'??:'??,'??:'臾?,'雅?:'??},
  '?쒖쓬':{'耶?:'??,'訝?:'臾?,'野?:'??,'??:'??,'渦?:'??,'藥?:'??,'??:'??,'??:'??,'??:'??,'??:'臾?,'??:'臾?,'雅?:'??},
  '?먮옉':{'耶?:'??,'訝?:'??,'野?:'臾?,'??:'由?,'渦?:'??,'藥?:'臾?,'??:'??,'??:'??,'??:'臾?,'??:'臾?,'??:'??,'雅?:'臾?},
  '嫄곕Ц':{'耶?:'??,'訝?:'臾?,'野?:'??,'??:'??,'渦?:'??,'藥?:'臾?,'??:'??,'??:'臾?,'??:'臾?,'??:'??,'??:'??,'雅?:'臾?},
  '泥쒖긽':{'耶?:'臾?,'訝?:'臾?,'野?:'??,'??:'??,'渦?:'??,'藥?:'由?,'??:'臾?,'??:'臾?,'??:'??,'??:'??,'??:'臾?,'雅?:'??},
  '泥쒕웾':{'耶?:'??,'訝?:'臾?,'野?:'臾?,'??:'臾?,'渦?:'臾?,'藥?:'??,'??:'臾?,'??:'??,'??:'臾?,'??:'??,'??:'臾?,'雅?:'??},
  '移좎궡':{'耶?:'臾?,'訝?:'??,'野?:'臾?,'??:'??,'渦?:'??,'藥?:'??,'??:'臾?,'??:'??,'??:'臾?,'??:'??,'??:'臾?,'雅?:'??},
  '?뚭뎔':{'耶?:'??,'訝?:'??,'野?:'臾?,'??:'??,'渦?:'臾?,'藥?:'??,'??:'??,'??:'??,'??:'??,'??:'??,'??:'臾?,'雅?:'由?},
  '醫뚮낫':{'耶?:'??,'訝?:'臾?,'野?:'??,'??:'臾?,'渦?:'臾?,'藥?:'由?,'??:'??,'??:'臾?,'??:'??,'??:'由?,'??:'??,'雅?:'由?},
  '?고븘':{'耶?:'??,'訝?:'臾?,'野?:'??,'??:'由?,'渦?:'??,'藥?:'由?,'??:'??,'??:'臾?,'??:'??,'??:'由?,'??:'臾?,'雅?:'由?},
  '臾몄갹':{'耶?:'由?,'訝?:'??,'野?:'臾?,'??:'??,'渦?:'??,'藥?:'??,'??:'??,'??:'??,'??:'臾?,'??:'??,'??:'由?,'雅?:'??},
  '臾멸끝':{'耶?:'由?,'訝?:'??,'野?:'臾?,'??:'??,'渦?:'由?,'藥?:'??,'??:'由?,'??:'??,'??:'由?,'??:'??,'??:'由?,'雅?:'??},
  '?뱀〈':{'耶?:'臾?,'訝?:'??,'野?:'由?,'??:'??,'渦?:'由?,'藥?:'??,'??:'??,'??:'??,'??:'由?,'??:'??,'??:'由?,'雅?:'??},
  '泥쒓눼':{'耶?:'??,'訝?:'??,'野?:'??,'??:'??,'渦?:'??,'藥?:'??,'??:'??,'??:'??,'??:'??,'??:'??,'??:'??,'雅?:'??},
  '泥쒖썡':{'耶?:'??,'訝?:'??,'野?:'??,'??:'??,'渦?:'??,'藥?:'??,'??:'??,'??:'由?,'??:'臾?,'??:'由?,'??:'??,'雅?:'??},
  '泥쒕쭏':{'耶?:'??,'訝?:'由?,'野?:'臾?,'??:'由?,'渦?:'??,'藥?:'由?,'??:'臾?,'??:'由?,'??:'??,'??:'由?,'??:'臾?,'雅?:'由?},
  '寃쎌뼇':{'耶?:'??,'訝?:'由?,'野?:'??,'??:'臾?,'渦?:'??,'藥?:'由?,'??:'??,'??:'由?,'??:'??,'??:'臾?,'??:'臾?,'雅?:'由?},
  '???:{'耶?:'??,'訝?:'??,'野?:'由?,'??:'??,'渦?:'臾?,'藥?:'??,'??:'由?,'??:'??,'??:'??,'??:'由?,'??:'??,'雅?:'??},
  '?붿꽦':{'耶?:'??,'訝?:'??,'野?:'??,'??:'由?,'渦?:'??,'藥?:'由?,'??:'??,'??:'??,'??:'??,'??:'??,'??:'??,'雅?:'由?},
  '?곸꽦':{'耶?:'??,'訝?:'由?,'野?:'臾?,'??:'臾?,'渦?:'??,'藥?:'由?,'??:'??,'??:'由?,'??:'??,'??:'??,'??:'??,'雅?:'由?},
  '吏怨?:{'耶?:'由?,'訝?:'??,'野?:'由?,'??:'??,'渦?:'臾?,'藥?:'臾?,'??:'由?,'??:'由?,'??:'由?,'??:'??,'??:'臾?,'雅?:'??},
  '吏寃?:{'耶?:'由?,'訝?:'??,'野?:'由?,'??:'由?,'渦?:'由?,'藥?:'??,'??:'由?,'??:'??,'??:'由?,'??:'??,'??:'臾?,'雅?:'??}
};
function zwNormalizeStrength(level){
  var lv = (level || '').trim();
  if(lv === '?? || lv === '?? || lv === '??) return '??;
  if(lv === '?? || lv === '遺?) return '??;
  if(lv === '由?) return '由?;
  if(lv === '??) return '由?;
  if(lv === '??) return '??;
  if(lv === '臾? || lv === '??) return lv;
  return '??;
}
function zwStrengthToSymbol(level){
  var lv = zwNormalizeStrength(level);
  var map = {'臾?:'??,'??:'??,'??:'??,'由?:'??,'??:'X'};
  return map[lv] || '??;
}
function zwStrengthToClass(level){
  var lv = zwNormalizeStrength(level);
  if(lv === '臾?) return 'myo';
  if(lv === '??) return 'wang';
  if(lv === '??) return 'han';
  if(lv === '??) return 'heum';
  return 'ri';
}
function zwStrengthStepUp(level, steps){
  var order = ['??,'由?,'??,'??,'臾?];
  var lv = zwNormalizeStrength(level);
  var idx = order.indexOf(lv);
  if(idx < 0) idx = 2;
  var n = Number(steps) || 1;
  while(n-- > 0 && idx < order.length - 1) idx++;
  return order[idx];
}
function zwStrengthStepDown(level, steps){
  var order = ['??,'由?,'??,'??,'臾?];
  var lv = zwNormalizeStrength(level);
  var idx = order.indexOf(lv);
  if(idx < 0) idx = 2;
  var n = Number(steps) || 1;
  while(n-- > 0 && idx > 0) idx--;
  return order[idx];
}
function zwStrengthToNumeric(level){
  var lv = zwNormalizeStrength(level);
  if(lv === '??) return 0;
  if(lv === '由?) return 1;
  if(lv === '??) return 2;
  if(lv === '??) return 3;
  return 4; // 臾?}
function zwNumericToStrength(v){
  if(v >= 3.5) return '臾?;
  if(v >= 2.5) return '??;
  if(v >= 1.5) return '??;
  if(v >= 0.5) return '由?;
  return '??;
}
function zwBuildHarmonicProfile(){
  var out = {};
  var N = 12;
  var PI2 = Math.PI * 2;
  Object.keys(ZW_CLASSICAL_STATE || {}).forEach(function(star){
    var sm = ZW_CLASSICAL_STATE[star] || {};
    var y = ZHI_LIST.map(function(z){ return zwStrengthToNumeric(sm[z] || '??); });
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
  '耶?:0,'訝?:0,'野?:0,'??:0,'渦?:0,'藥?:0,
  '??:0,'??:0,'??:0,'??:0,'??:0,'雅?:0
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

  var ganPol = {'??:'yang','阿?:'yin','訝?:'yang','訝?:'yin','??:'yang','藥?:'yin','佯?:'yang','渦?:'yin','鶯?:'yang','??:'yin'};
  var polAdj = (yearGan && profile.yinYang && ganPol[yearGan] === profile.yinYang) ? cfg.polMatch : cfg.polMismatch;

  var beneficSet = {'?먮?':1,'泥쒕?':1,'泥쒕웾':1,'泥쒖긽':1,'醫뚮낫':1,'?고븘':1,'臾몄갹':1,'臾멸끝':1,'泥쒓눼':1,'泥쒖썡':1,'?뱀〈':1};
  var maleficSet = {'寃쎌뼇':1,'???:1,'?붿꽦':1,'?곸꽦':1,'吏怨?:1,'吏寃?:1};
  var familyAdj = 0;
  if(beneficSet[starName]) familyAdj += cfg.beneficAdj;
  if(maleficSet[starName]) familyAdj += cfg.maleficAdj;

  var yangTuoAdj = 0;
  if(luIdx >= 0 && (starName === '寃쎌뼇' || starName === '???)) {
    var d = zwCircularDistance12(zhiIdx, luIdx);
    if(starName === '寃쎌뼇') {
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
  if(starName === '吏怨?) {
    if(zhi === '藥? || zhi === '?? || zhi === '雅?) shaAdj += cfg.kongGood;
    if(zhi === '?? || zhi === '??) shaAdj += cfg.kongBad;
  } else if(starName === '吏寃?) {
    if(zhi === '藥? || zhi === '??) shaAdj += cfg.jieBad;
    if(zhi === '耶? || zhi === '渦?) shaAdj += cfg.jieGood;
  } else if(starName === '?붿꽦' || starName === '?곸꽦') {
    if(zhi === '渦? || zhi === '??) shaAdj += cfg.fireLingGood;
    if(zhi === '??) shaAdj += cfg.fireLingBad;
  }

  if(starName === '泥쒕쭏') {
    if(lunarMonth >= 6 && lunarMonth <= 8) seasonalAdj += cfg.horseSummerPenalty;
    if(lunarMonth >= 11 || lunarMonth <= 2) seasonalAdj += cfg.horseColdBoost;
  }

  var starBias = (ZW_BRIGHTNESS_STAR_BIAS[starName] || 0);
  var branchBias = (ZW_BRIGHTNESS_BRANCH_BIAS[zhi] || 0);
  var interKey = starName + '|' + zhi;
  var interBias = (ZW_BRIGHTNESS_INTERACTION_BIAS[interKey] || 0);
  var modelScore = harmonic + spatial + (elem * cfg.elemGain) + yinYangFit + monthRes + hourRes + polAdj + familyAdj + yangTuoAdj + shaAdj + seasonalAdj + ((profile.bias || 0) * cfg.biasGain) + starBias + branchBias + interBias;
  var classicalRaw = (ZW_CLASSICAL_STATE[starName] && ZW_CLASSICAL_STATE[starName][zhi]) || '??;
  var classicalScore = zwStrengthToNumeric(classicalRaw);
  var blend = (typeof cfg.classicalBlend === 'number') ? Math.max(0, Math.min(1, cfg.classicalBlend)) : 0;
  return (modelScore * (1 - blend)) + (classicalScore * blend);
}

// Star|Branch ?쇰컲 蹂댁젙移?(耳?댁뒪 怨좎젙媛믪씠 ?꾨땶 洹쒖튃 湲곕컲 罹섎━釉뚮젅?댁뀡)
ZW_BRIGHTNESS_INTERACTION_BIAS = {
  '?먮?|??: -1.15,
  '?먮옉|??: -3.88,
  '嫄곕Ц|??: 5.00,
  '泥쒖긽|雅?: -1.05,
  '泥쒕웾|耶?: 1.33,
  '?쇱젙|訝?: 0.98,
  '移좎궡|訝?: 3.18,
  '臾닿끝|藥?: -1.05,
  '?뚭뎔|藥?: 4.08,
  '泥쒓린|??: -3.88,
  '?쒖쓬|??: -0.95,
  '泥쒕웾|藥?: -1.94,
  '?먮?|渦?: -6.68,
  '嫄곕Ц|??: 7.00,
  '?먮옉|野?: -4.54,
  '泥쒕쭏|雅?: 0.90,
  '?뚭뎔|??: -1.00,
  '?고븘|耶?: 0.30,
  '泥쒓눼|耶?: 0.45,
  '醫뚮낫|野?: 0.35,
  '泥쒕웾|??: 0.15,
  '泥쒕쭏|藥?: 0.45
};
function zwComputeStarStrength(starName, zhi, isBorrowed, ctxOverride){
  var score = zwComputeBrightnessScore(starName, zhi, ctxOverride);
  if(score == null) return null;
  var lv = zwNumericToStrength(score);

  if(!isBorrowed) return lv;
  var down = {'臾?:'??,'??:'??,'??:'由?,'由?:'由?,'??:'??};
  return down[lv] || lv;
}
var ZW_GUNG_DEF={
  '紐낃턿':'?좎쿇 ?먯븘쨌湲곗쭏쨌?대챸??肉뚮━',
  '?뺤젣沅?:'?뺤젣쨌移쒓뎄쨌?숆린 愿怨꾨쭩',
  '遺泥섍턿':'諛곗슦?먃룻뙆?몃꼫???몄뿰援ъ“',
  '遺遺沅?:'諛곗슦?먃룻뙆?몃꼫???몄뿰援ъ“',
  '?먮?沅?:'?먮?쨌李쎌옉쨌遺?섏쓽 ?앹궛??,
  '?щ갚沅?:'?щЪ쨌?섏엯쨌?꾧툑 ?먮쫫',
  '吏덉븸沅?:'?좎껜 嫄닿컯쨌泥댁쭏??湲곕컲',
  '泥쒖씠沅?:'?대룞쨌??명솢?쇑룻????닿린',
  '?몃났沅?:'?ы쉶 ?몃㎘쨌遺?샕룻삊?μ옄',
  '愿濡앷턿':'吏곸뾽쨌?ы쉶 ?깆랬쨌紐낆삁',
  '?꾪깮沅?:'二쇨굅쨌遺?숈궛쨌?앺솢湲곕컲',
  '蹂듬뜒沅?:'?뺤떊 ?됰났쨌?ъ쑀쨌?대㈃?멸퀎',
  '遺紐④턿':'遺紐㉱룹쐵?щ엺쨌臾몄꽌??
};
var ZW_GUNG_BRIEF={
  '紐낃턿':'?섎뒗 ?대뼡 ?щ엺?몄?, ?몄깮??湲곕낯 ?깊뼢??蹂댁뿬以띾땲??',
  '?뺤젣沅?:'媛源뚯슫 ?멸컙愿怨꾩뿉?쒖쓽 ?묒뾽 諛⑹떇怨??뚰넻 寃곗쓣 蹂댁뿬以띾땲??',
  '遺泥섍턿':'?곗븷쨌寃고샎쨌?숇컲??愿怨꾩뿉?쒖쓽 湲곕?? ?⑦꽩??蹂댁뿬以띾땲??',
  '遺遺沅?:'?곗븷쨌寃고샎쨌?숇컲??愿怨꾩뿉?쒖쓽 湲곕?? ?⑦꽩??蹂댁뿬以띾땲??',
  '?먮?沅?:'李쎌쓽?? 寃곌낵臾??앹궛?? ?뚮큵 ?먮꼫吏??諛⑺뼢??蹂댁뿬以띾땲??',
  '?щ갚沅?:'?덉쓣 踰뚭퀬 ?곕뒗 ?듦?, ?섏엯 援ъ“???뱀쭠??蹂댁뿬以띾땲??',
  '吏덉븸沅?:'泥대젰/而⑤뵒?섏쓽 ?쎌젏怨??섑샇 ?ъ씤?몃? 蹂댁뿬以띾땲??',
  '泥쒖씠沅?:'?대룞, ?섍꼍 蹂?? ?몃? 臾대??먯꽌???곸쓳?μ쓣 蹂댁뿬以띾땲??',
  '?몃났沅?:'?숇즺쨌遺?샕룻삊?μ옄? ?④퍡 ?쇳븯??諛⑹떇??蹂댁뿬以띾땲??',
  '愿濡앷턿':'而ㅻ━??諛⑺뼢, ?ы쉶??紐⑺몴, ?깆랬 泥쒓린瑜?蹂댁뿬以띾땲??',
  '?꾪깮沅?:'二쇨굅쨌?먯궛쨌?앺솢 湲곕컲???덉젙?쒗궎???깊뼢??蹂댁뿬以띾땲??',
  '蹂듬뜒沅?:'硫섑깉 ?뚮났?? 留덉쓬???ъ쑀, ?됰났 媛먭컖??蹂댁뿬以띾땲??',
  '遺紐④턿':'?쀬궗?뙿룰?議굿룸Ц???몄뿰?먯꽌???먮쫫??蹂댁뿬以띾땲??'
};
var ZW_STAR_KW={
  '?먮?':'沅뚯쐞쨌吏??,'泥쒓린':'吏?쑣룸???,'?쒖뼇':'紐낆꽦쨌諛쒖궛','臾닿끝':'寃곕떒쨌?щ젰',
  '泥쒕룞':'?됲솕쨌蹂듬뜒','?쇱젙':'?댁젙쨌?듭젣','泥쒕?':'?ъ슜쨌???,'?쒖쓬':'吏곴?쨌?щ?',
  '?먮옉':'留ㅻ젰쨌?뺢뎄','嫄곕Ц':'?듭같쨌?몃?','泥쒖긽':'議고솕쨌遊됱궗','泥쒕웾':'?먯튃쨌援ъ썝',
  '移좎궡':'?뚰뙆쨌?낅┰','?뚭뎔':'蹂?겶룰컻泥?
};
var ZW_SIHUA_LABEL={'?붾줉':'?붾줉(曄???,'?붽텒':'?붽텒(轝???,'?붽낵':'?붽낵(燁???,'?붽린':'?붽린(恙???};
var ZW_SIHUA_COLOR={'?붾줉':'#4ade80','?붽텒':'#60a5fa','?붽낵':'#c084fc','?붽린':'#f87171'};
var ZW_PALACE_ORDER=['紐낃턿','?뺤젣沅?,'遺泥섍턿','?먮?沅?,'?щ갚沅?,'吏덉븸沅?,'泥쒖씠沅?,'?몃났沅?,'愿濡앷턿','?꾪깮沅?,'蹂듬뜒沅?,'遺紐④턿'];
var ZW_PALACE_ICON={'紐낃턿':'?뫀','?뺤젣沅?:'?쩃','遺泥섍턿':'?뮂','?먮?沅?:'?뙮','?щ갚沅?:'?뮥','吏덉븸沅?:'?ㅿ툘?랅윪?,'泥쒖씠沅?:'?덌툘','?몃났沅?:'?뙋','愿濡앷턿':'?룇','?꾪깮沅?:'?룧','蹂듬뜒沅?:'??,'遺紐④턿':'?솋'};

/* 12沅??붿빟 ?뚯씠釉?HTML 臾몄옄???앹꽦 (?앹뾽쨌?섎떒 ?⑤꼸 怨듭슜) */
function buildZwSummaryTableHtml(palace) {
  if(!palace) return '';
  var ZHI_ORD=['耶?,'訝?,'野?,'??,'渦?,'藥?,'??,'??,'??,'??,'??,'雅?];
  var isCompactView = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(max-width: 980px)').matches
    : false;
  function parseBrSymbol(rawStr){
    var plain=(rawStr||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    if(/??.test(plain)) return '臾?;
    if(/(^|\s)(O|??(?=\s|$)/.test(plain)) return '??;
    if(/??.test(plain)) return '由?;
    if(/??.test(plain)) return '??;
    if(/(^|\s)X(?=\s|$)/.test(plain)) return '??;
    return '';
  }
  function parseMainStar(rawStr){
    var plain=(rawStr||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    var isBorrowed=/\(李⑥꽦\)|\b李⑥꽦\b/.test(plain);
    var sihua=getSihua(plain);
    var brHint=parseBrSymbol(plain);
    var name=plain
      .replace(/\(李⑥꽦\)/g,'')
      .replace(/?붾줉|?붽텒|?붽낵|?붽린/g,'')
      .replace(/??????g,'')
      .replace(/(^|\s)[O?딿](?=\s|$)/g,' ')
      .trim()
      .split(' ')[0];
    return { name:name||'', isBorrowed:isBorrowed, sihua:sihua, brHint:brHint };
  }
  function getCleanStarName(rawStr){
    return (rawStr||'')
      .replace(/<[^>]*>/g,' ')
      .replace(/\(李⑥꽦\)/g,'')
      .replace(/?붾줉|?붽텒|?붽낵|?붽린/g,'')
      .replace(/\s+/g,' ')
      .trim()
      .split(' ')[0];
  }
  function getSihua(rawStr){var m=(rawStr||'').match(/?붾줉|?붽텒|?붽낵|?붽린/);return m?m[0]:null;}
  function getEffectiveBr(sn,z,isBorrowed,brHint){
    var b=zwNormalizeStrength(brHint || zwComputeStarStrength(sn,z,isBorrowed) || '??);
    return b;
  }
  function getBrTag(b,isBorrowed){
    var c={'臾?:'#4ade80','??:'#60a5fa','??:'#f59e0b','由?:'#94a3b8','??:'#f87171'};
    var bg={'臾?:'rgba(74,222,128,0.15)','??:'rgba(96,165,250,0.15)','??:'rgba(245,158,11,0.15)','由?:'rgba(148,163,184,0.1)','??:'rgba(248,113,113,0.15)'};
    var label=zwStrengthToSymbol(b)+(isBorrowed?'*':'');
    return '<span style="color:'+c[b]+';background:'+bg[b]+';padding:1px 5px;border-radius:3px;font-size:0.68rem;font-weight:700">'+label+'</span>';
  }
  function calcStrengthTier(mainMeta,zhi){
    if(!mainMeta || !mainMeta.length) return '由?;
    // ?ъ슜??湲곗?: ??臾? > ???? > ???? > ??由? > X(??
    var scoreMap={臾?5,??4,??3,由?2,??1};
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
    if(avg>=4.4) return '臾?;
    if(avg>=3.6) return '??;
    if(avg>=2.8) return '??;
    if(avg>=1.8) return '由?;
    return '??;
  }
  function genSummary(gungName,mainMeta,zhi,sh,auxStars){
    if(!mainMeta.length) return '怨듦턿(令뷴?) ???沅?李⑥꽦 李⑥슜. 蹂?돠룹쟻?묐젰? 媛뺥븯吏留?二쇱껜??異뺤쓣 ?섏떇?곸쑝濡??몄슦??寃껋씠 ?듭떖 怨쇱젣?낅땲??';
    var star=mainMeta[0].name;
    var kw=ZW_STAR_KW[star]||star;
    var tier=calcStrengthTier(mainMeta,zhi);
    var isDual=(mainMeta.length>1);
    var brightPart={臾?'媛뺥븳 諛쒗쁽',??'理쒖긽湲?諛쒗쁽',??'?쒖? 諛쒗쁽',由?'以묎컙 諛쒗쁽',??'?쒖빟 諛쒗쁽'}[tier]||'?묐룞';
    var dualNote=isDual?' + '+(ZW_STAR_KW[mainMeta[1].name]||mainMeta[1].name):'';
    var hasBorrowed=mainMeta.some(function(m){ return m.isBorrowed; });
    var advPart='';
    if(sh==='?붽린') advPart=' ??'+ZW_GUNG_DEF[gungName]+' ???먯떎쨌援ъ꽕쨌?μ븷 二쇱쓽. 怨꾩빟쨌留먯떎?샕룰낵???뺤옣???뱁엳 寃쎄퀎?섏꽭??';
    else if(sh==='?붾줉') advPart=(tier==='臾?||tier==='??)?' ??'+ZW_GUNG_DEF[gungName]+' ?湲? ?щЪ쨌?몄뿰 ?좎엯??鍮좊Ⅸ 援ш컙?낅땲??':' ??'+ZW_GUNG_DEF[gungName]+' ?붾줉 蹂댁젙 ??遺移????댁씡 ?뚯닔 媛?μ꽦???쎈땲??';
    else if(sh==='?붽텒') advPart=(tier==='臾?||tier==='??)?' ??'+ZW_GUNG_DEF[gungName]+' 沅뚯쐞쨌二쇰룄沅??곸듅. 由щ뜑??쓣 ?꾨㈃???먮㈃ ?좊━?⑸땲??':' ??'+ZW_GUNG_DEF[gungName]+' ?붽텒 蹂댁젙 ???ㅻ젰? ?몄젙?섎굹 ?낅떒? 媛먯젏?낅땲??';
    else if(sh==='?붽낵') advPart=' ??'+ZW_GUNG_DEF[gungName]+' 紐낆꽦쨌?쒗뿕??湲? ?숈닠쨌?먭꺽 遺꾩빞 鍮쏅궓';
    else if(tier==='臾?||tier==='??) advPart=' ??'+ZW_GUNG_DEF[gungName]+' ?먮젰 諛쒗쐶 援ш컙. ?λ룞??二쇰룄 泥쒓린媛 ?좏슚?⑸땲??';
    else if(tier==='由? || tier==='??) advPart=' ??'+ZW_GUNG_DEF[gungName]+' ?먮꼫吏 ?먯떎 二쇱쓽. 臾대━???뺤옣蹂대떎 蹂듦뎄-?뺣퉬 泥쒓린媛 ?꾩슂?⑸땲??';
    else advPart=' ??'+ZW_GUNG_DEF[gungName]+' ?덉젙 ?좎?. 媛뺤젣 ?뺤옣 遺덊븘??;
    if(hasBorrowed) advPart += ' <span style="color:#facc15">(李⑥꽦 李⑥슜沅? ??臾??믠뿃(??, ?????믠뼯(??, ?????믠뼰(由?)</span>';
    var goodAux=['泥쒓눼','泥쒖썡','醫뚮낫','?고븘','臾몄갹','臾멸끝','?뱀〈','泥쒕쭏'];
    var auxNote='';
    if(auxStars.length){var ga=auxStars.filter(function(a){return goodAux.indexOf(a)>=0;});if(ga.length)auxNote=' ['+ga.slice(0,2).join('쨌')+' ?꾩썝]';}
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
        if(m.isBorrowed) text+='<span style="color:#facc15;font-weight:800;font-size:0.67rem;margin-left:3px">李⑥꽦</span>';
        var sh3=m.sihua;
        if(sh3) text+='<span style="color:'+ZW_SIHUA_COLOR[sh3]+';font-weight:900;font-size:0.68rem;margin-left:2px">'+ZW_SIHUA_LABEL[sh3]+'</span>';
        return text;
      }).join('<br>');
    } else {
      starsDisp='<span style="color:#64748b;font-style:italic">怨듦턿</span>';
    }
    var auxDisp='';
    if(auxClean.length) auxDisp+='<span style="color:#93c5fd;font-size:0.72rem">'+auxClean.slice(0,3).join(' ')+'</span>';
    if(badClean.length) auxDisp+=(auxDisp?'<br>':'')+'<span style="color:#fca5a5;font-size:0.72rem">'+badClean.slice(0,2).join(' ')+'</span>';
    var summaryText=genSummary(pName,mainMeta,zhi,mainSihua,auxClean);
    var rowBg=pName==='紐낃턿'?'rgba(196,181,253,0.12)':(pi%2===0?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.2)');
    var icon=ZW_PALACE_ICON[pName]||'??;
    var borderStyle=mainSihua==='?붽린'?'border-left:3px solid #f87171':(mainSihua?'border-left:3px solid #4ade80':'border-left:3px solid transparent');
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
      auxDisp: auxDisp || '<span style="color:#64748b">?놁쓬</span>',
      summaryText: summaryText,
      rowBg: rowBg,
      borderColor: mainSihua==='?붽린' ? '#f87171' : (mainSihua ? '#4ade80' : 'rgba(255,255,255,0.12)')
    });
  }

  var legendHtml = '<div style="padding:8px 12px 6px;font-size:0.71rem;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:14px;flex-wrap:wrap">'
    +'<span>諛앷린: <b style="color:#4ade80">??臾?</b>=理쒖긽 쨌 <b style="color:#60a5fa">????</b>=?곗닔 쨌 <b style="color:#f59e0b">????</b>=?쒖? 쨌 <b style="color:#94a3b8">??由?</b>=?쏀솕 쨌 <b style="color:#f87171">X(??</b>=?⑤ぐ</span>'
    +'<span><b>*</b> ?쒖떆??李⑥꽦(?잍삜) 蹂댁젙 諛앷린?대ŉ ?먯꽦 ?鍮?1?④퀎 蹂댁닔 ?댁꽍</span>'
    +'<span>?ы솕: <b style="color:#4ade80">?붾줉??/b>=?щЪ쨌?몄뿰 쨌 <b style="color:#60a5fa">?붽텒??/b>=沅뚯쐞 쨌 <b style="color:#c084fc">?붽낵??/b>=紐낆꽦 쨌 <b style="color:#f87171">?붽린??/b>=二쇱쓽</span>'
    +'</div>';

  if (isCompactView) {
    var cardsHtml = cardRows.map(function(it) {
      return '<div style="background:'+it.rowBg+';border:1px solid rgba(255,255,255,0.1);border-left:4px solid '+it.borderColor+';border-radius:10px;padding:10px 12px">'
        +'<div style="font-weight:800;color:#d8b4fe;font-size:0.84rem;line-height:1.35">'+it.icon+' '+it.pNameDisplay+'</div>'
        +'<div style="color:#64748b;font-size:0.69rem;margin-top:2px">'+it.defn+'</div>'
        +'<div style="margin-top:8px;font-size:0.78rem;color:#c084fc">二쇱꽦</div>'
        +'<div style="margin-top:2px;color:#fde68a;font-size:0.8rem;line-height:1.75">'+it.starsDisp+'</div>'
        +'<div style="margin-top:8px;font-size:0.78rem;color:#c084fc">蹂댁“??/div>'
        +'<div style="margin-top:2px;font-size:0.74rem;color:#94a3b8;line-height:1.55">'+it.auxDisp+'</div>'
        +'<div style="margin-top:8px;font-size:0.78rem;color:#c084fc">泥쒓린(鸚⒵찣) ?붿빟</div>'
        +'<div style="margin-top:2px;font-size:0.79rem;color:#e2e8f0;line-height:1.6;word-break:keep-all">'+it.summaryText+'</div>'
      +'</div>';
    }).join('');

    return legendHtml
      +'<div style="padding:10px 10px 12px;display:grid;grid-template-columns:1fr;gap:10px">'+cardsHtml+'</div>';
  }

  return legendHtml
    +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:540px">'
    +'<thead><tr style="background:rgba(88,28,220,0.3)">'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem;white-space:nowrap">沅?若? 쨌 ?뺤쓽</th>'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem">二쇱꽦(諛앷린)</th>'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem;white-space:nowrap">蹂댁“??/th>'
    +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem">泥쒓린(鸚⒵찣) ???듬? ?붿빟</th>'
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
    
    .zw-grid-wrap {
      flex: 1.4;
      background: linear-gradient(135deg, #0a0f25 0%, #1a0b2e 100%);
      padding: 15px;
      border-radius: 16px;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.5);
      position: relative;
      min-width: 0; /* flex child ?ㅻ쾭?뚮줈??諛⑹? */
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
      cursor: pointer; /* iOS Safari: 鍮꾨??뷀삎 div??click ?대깽??諛쒗솕 媛뺤젣 */
    }
    /* iOS Safari: ?먯떇 ?붿냼濡??대깽?멸? ?≪닔?섎뒗 踰꾧렇 諛⑹? ??遺紐?.zw-cell onclick ??긽 諛쒗솕 */
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
      /* 吏??源쒕컯?????怨좎젙 愿묒썝 ?④낵濡??덉젙??*/
      box-shadow:
        inset 0 0 30px rgba(212,175,55,0.26),
        0 0 22px rgba(212,175,55,0.2);
      color: #fff;
      padding: 10px;
      word-break: keep-all; /* 踰덉뿭 ???*/
    }

    
    .zw-cell-5 { grid-area: 1/1; } /* 藥?*/
    .zw-cell-6 { grid-area: 1/2; } /* ??*/
    .zw-cell-7 { grid-area: 1/3; } /* ??*/
    .zw-cell-8 { grid-area: 1/4; } /* ??*/
    .zw-cell-4 { grid-area: 2/1; } /* 渦?*/
    .zw-cell-9 { grid-area: 2/4; } /* ??*/
    .zw-cell-3 { grid-area: 3/1; } /* ??*/
    .zw-cell-10 { grid-area: 3/4; } /* ??*/
    .zw-cell-2 { grid-area: 4/1; } /* 野?*/
    .zw-cell-1 { grid-area: 4/2; } /* 訝?*/
    .zw-cell-0 { grid-area: 4/3; } /* 耶?*/
    .zw-cell-11 { grid-area: 4/4; } /* 雅?*/

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
      /* ?섎떒 AI ?꾨＼?꾪듃 釉붾줉??移대뱶 諛뺤뒪???섎━吏 ?딅룄濡?*/
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
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
      padding: 11px 12px;
      min-height: 44px;
      cursor: pointer;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
      color: #e2e8f0;
    }
    .zw-pivot-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .zw-pivot-chip {
      font-size: 0.68rem;
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      border: 1px solid rgba(var(--pivot-rgb, 167,139,250), 0.58);
      background: rgba(var(--pivot-rgb, 167,139,250), 0.14);
      padding: 2px 7px;
      border-radius: 999px;
      font-weight: 800;
      white-space: nowrap;
      width: max-content;
    }
    .zw-pivot-headline {
      color: rgba(var(--pivot-rgb, 167,139,250), 1);
      font-weight: 800;
      font-size: 0.92rem;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .zw-pivot-age {
      font-size: 0.72rem;
      color: #cbd5e1;
      white-space: nowrap;
      font-weight: 700;
    }
    .zw-pivot-meta-right {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .zw-pivot-chevron {
      width: 18px;
      height: 18px;
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
    }
    .zw-pivot-card.is-open .zw-pivot-chevron {
      transform: rotate(180deg);
      color: #fef3c7;
      border-color: rgba(251, 191, 36, 0.64);
      background: rgba(126, 34, 206, 0.35);
    }
    .zw-pivot-body {
      display: none;
      padding: 0 12px 12px;
      color: #e2e8f0;
      font-size: 0.84rem;
      line-height: 1.72;
    }
    .zw-pivot-card.is-open .zw-pivot-body {
      display: block;
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

    /* 紐⑤컮??諛섏쓳????12沅?洹몃━??援ъ“ ?좎?, ?뚰삎??*/
    @media (max-width: 768px) {
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
        padding: 6px;
        border-radius: 12px;
        overflow-x: auto;
      }
      /* 12沅?4횞4 洹몃━????aspect-ratio 湲곕컲 ?뺣갑?? 紐⑤뱺 紐⑤컮???댁긽?????*/
      .zw-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, minmax(74px, auto));
        gap: 3px;
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
      .zw-center-title { font-size: clamp(0.62rem, 2.4vw, 0.8rem); margin-bottom: 4px; }
      .zw-center-desc { font-size: clamp(0.5rem, 1.6vw, 0.62rem); line-height: 1.4; display: block; }
      /* 媛蹂 ?고듃(clamp): 醫곸? ?붾㈃?먯꽌???띿뒪???섏묠 諛⑹? */
      .zw-palace-name { font-size: clamp(0.5rem, 1.8vw, 0.65rem); margin-bottom: 3px; padding: 0 30px 2px 0; }
      .zw-stars-wrap, .star-list { padding-right: 30px; }
      .zw-star-main { font-size: clamp(0.58rem, 2.2vw, 0.76rem); margin-bottom: 1px; padding: 1px 3px; }
      .zw-star-main-borrowed { font-size: clamp(0.46rem, 1.6vw, 0.58rem); }
      .zw-star-aux, .zw-star-bad { font-size: clamp(0.48rem, 1.7vw, 0.62rem); }
      .zw-branch-name { font-size: clamp(0.52rem, 1.7vw, 0.68rem); bottom: 2px; right: 4px; }
      .zw-palace-gan { font-size: clamp(0.46rem, 1.5vw, 0.6rem); bottom: 2px; right: 18px; }
      .zw-dahan { font-size: clamp(0.46rem, 1.5vw, 0.6rem); top: 3px; right: 3px; padding: 1px 3px; line-height: 1.15; }
      .zw-empty { font-size: clamp(0.46rem, 1.5vw, 0.6rem); }
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
      .zw-pivot-deck {
        grid-template-columns: 1fr;
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

/* ?? 紐낅━ ?붿쭊 ?낃렇?덉씠???ㅽ???(Premium UX) */
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
  inset: 0;
  background: rgba(2, 6, 23, 0.8);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 100020;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}
.zwp-modal-overlay.is-open {
  opacity: 1;
  pointer-events: auto;
}
.zwp-modal {
  width: min(760px, 94vw);
  max-height: 86vh;
  overflow: auto;
  border-radius: 16px;
  padding: 16px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.zwp-modal-title {
  color: #f0f9ff;
  font-size: 1.02rem;
  font-weight: 900;
}
.zwp-modal-close {
  appearance: none;
  border: 1px solid rgba(251, 191, 36, 0.5);
  background: rgba(30, 41, 59, 0.7);
  color: #fde68a;
  border-radius: 999px;
  width: 34px;
  height: 34px;
  font-size: 1rem;
  cursor: pointer;
}
.zwp-modal-body {
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
  .zwp-modal {
    width: min(760px, calc(100vw - 12px));
    max-height: calc(100dvh - 18px);
    padding: 13px;
    margin-top: max(env(safe-area-inset-top), 6px);
  }
  .zwp-modal-overlay {
    align-items: flex-start;
    justify-content: center;
    padding: 8px 6px 10px;
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
    var borrowed = /\(李⑥꽦\)|\b李⑥꽦\b/.test(plain);
    var sihuaMatch = plain.match(/?붾줉|?붽텒|?붽낵|?붽린/);
    var sihua = sihuaMatch ? sihuaMatch[0] : '';
    var name = plain
      .replace(/\(李⑥꽦\)/g, '')
      .replace(/?붾줉|?붽텒|?붽낵|?붽린/g, '')
      .replace(/??????g, '')
      .replace(/(^|\s)[O?딿](?=\s|$)/g, ' ')
      .trim()
      .split(' ')[0];
    return { name: name || '', borrowed: borrowed, sihua: sihua };
  }
  function _zwGetEffectiveBr(name, zhi, borrowed){
    return zwComputeStarStrength(name, zhi, borrowed) || '??;
  }
  function _zwRenderMainStar(rawStr, zhi){
    var p = _zwParseMainRaw(rawStr);
    if (!p.name) return '';
    var br = _zwGetEffectiveBr(p.name, zhi, p.borrowed);
    var symbol = zwStrengthToSymbol(br);
    var symCls = zwStrengthToClass(br);
    var sihuaColor = p.sihua === '?붽린' ? '#FF5252' : '#3399FF';
    var sihuaHtml = p.sihua ? (' <span style="color:'+sihuaColor+';font-weight:900;font-size:0.75rem;margin-left:3px;">'+p.sihua+'</span>') : '';
    var borrowedHtml = p.borrowed ? ' <span style="font-size:0.6rem;opacity:0.75;color:#FFD700;">(李⑥꽦)</span>' : '';
    return p.name + ' <span class="zw-star-strength '+symCls+'">' + symbol + '</span>' + sihuaHtml + borrowedHtml;
  }
  function _zwRenderMinorStar(rawStr, zhi){
    var plain = (rawStr || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    var sihuaMatch = plain.match(/?붾줉|?붽텒|?붽낵|?붽린/);
    var sihua = sihuaMatch ? sihuaMatch[0] : '';
    var name = plain
      .replace(/?붾줉|?붽텒|?붽낵|?붽린/g,'')
      .replace(/??????g,'')
      .replace(/(^|\s)[O?딿](?=\s|$)/g,' ')
      .trim()
      .split(' ')[0];
    if(!name) return '';
    var sihuaColor = sihua === '?붽린' ? '#FF5252' : '#3399FF';
    var sihuaHtml = sihua ? (' <span style="color:'+sihuaColor+';font-weight:900;font-size:0.7rem;margin-left:2px;">'+sihua+'</span>') : '';
    var br = zwComputeStarStrength(name, zhi, false);
    if(!br) return name + sihuaHtml;
    var symbol = zwStrengthToSymbol(br);
    var symCls = zwStrengthToClass(br);
    return name + ' <span class="zw-star-strength '+symCls+'">' + symbol + '</span>' + sihuaHtml;
  }

  var ZW_PORTFOLIO_PALACE_ALIAS = {
    '紐낃턿': '紐낆＜?뺤껜??,
    '?뺤젣沅?: '?뺤젣?숇즺',
    '遺遺沅?: '?좎젙遺遺',
    '?먮?沅?: '?먮??꾨같',
    '?щ갚沅?: '?щЪ?먯궛',
    '吏덉븸沅?: '嫄닿컯?뚮났',
    '泥쒖씠沅?: '?대룞蹂??,
    '?몃났沅?: '?묒뾽?몃㎘',
    '愿濡앷턿': '吏곸뾽而ㅻ━??,
    '?꾪깮沅?: '二쇨굅湲곕컲',
    '蹂듬뜒沅?: '蹂듬뜒?뺤떊',
    '遺紐④턿': '遺紐④???
  };

  var ZW_PORTFOLIO_STAR_PROFILE = {
    '?먮?': { type: '沅뚯쐞??, persona: '?먮? 吏?꾩옄', keywords: ['?듭넄??, '以묒떖異?, '紐낆삁'], evidence: '?먮??깆? ?쒖솗?깆쓣 ?곸쭠?섏뿬 議곗쭅??以묒떖???몄슦怨?諛⑺뼢??寃곗젙?섎젮??由щ뜑 蹂몃뒫??媛뺥솕?⑸땲??' },
    '?쇱젙': { type: '沅뚮젰??, persona: '?쇱젙-沅뚮젰??, keywords: ['沅뚮え?좎닔', '?μ븙??, '?뺤튂媛먭컖'], evidence: '?쇱젙?깆? ?듭젣?κ낵 ?댄빐愿怨?議곗쑉 ?λ젰???ㅼ썙 沅뚮젰異뺤쓣 ?댁슜?섎뒗 ?깊뼢??遺꾨챸?섍쾶 留뚮벊?덈떎.' },
    '泥쒓린': { type: '愿李곗옄', persona: '泥쒓린-愿李곗옄', keywords: ['?꾨왂', '遺꾩꽍', '湲고쉷??], evidence: '泥쒓린?깆? ?뺣낫 泥섎━? ?쒕굹由ъ삤 ?ㅺ퀎??媛뺥빐 癒쇱? 愿李고븯怨?怨꾩궛?????吏곸씠???⑦꽩??留뚮벊?덈떎.' },
    '?쒖쓬': { type: '愿李곗옄', persona: '?쒖쓬-愿李곗옄', keywords: ['?대㈃?듭같', '?뺣?媛먯닔??, '?諛?쒖텞??], evidence: '?쒖쓬?깆? 誘몄꽭???먮쫫???ъ갑?섎뒗 媛먯닔?깆씠 媛뺥빐 ?뺢탳??愿李곌낵 異뺤쟻???먮떒???좊룄?⑸땲??' },
    '?쒖뼇': { type: '諛쒖궛??, persona: '?쒖뼇-?좊룄??, keywords: ['?쒗쁽??, '紐낆꽦', '?몄뿰?뺤옣'], evidence: '?쒖뼇?깆? 怨듭쟻 臾대??먯꽌 議댁옱媛먭낵 諛쒖궛 ?먮꼫吏瑜??ㅼ썙 ????곹뼢?μ쓣 鍮좊Ⅴ寃?利앺룺?⑸땲??' },
    '臾닿끝': { type: '?ㅽ뻾??, persona: '臾닿끝-吏묓뻾??, keywords: ['寃곕떒', '?꾩떎媛?, '?먮낯?듭젣'], evidence: '臾닿끝?깆? ?щТ쨌?ㅽ뻾 異뺤쓣 ?⑤떒???몄썙 紐⑺몴瑜??レ옄? ?깃낵濡?利앸챸?섎젮???섏쓣 媛뺥솕?⑸땲??' },
    '泥쒕?': { type: '?섑샇??, persona: '泥쒕?-?섑샇??, keywords: ['?덉젙', '?먯궛蹂댁〈', '?좊ː'], evidence: '泥쒕??깆? ?꾪뿕????텛怨?湲곕컲???볧엳??蹂댁닔???뺤옣 ?꾨왂??媛뺤젏??蹂댁엯?덈떎.' },
    '泥쒕룞': { type: '怨듦컧??, persona: '泥쒕룞-移섏쑀??, keywords: ['?좎뿰??, '?뺤꽌怨듦컧', '?꾪솕'], evidence: '泥쒕룞?깆? 媛덈벑???꾪솕?섍퀬 遺꾩쐞湲곕? 遺?쒕읇寃??꾪솚?섎뒗 媛먯젙 議곗쑉 ?λ젰???믪엯?덈떎.' },
    '?먮옉': { type: '留ㅻ젰??, persona: '?먮옉-媛쒖쿃??, keywords: ['?ш탳??, '?ν뻾媛먭컖', '?ㅼ옱?ㅻ뒫'], evidence: '?먮옉?깆? ?ㅽ듃?뚰겕 ?뺤옣怨??쒖옣 媛먭컖??媛뺥빐 湲고쉶 ?ъ갑 ?띾룄瑜??ш쾶 ?뚯뼱?щ┰?덈떎.' },
    '嫄곕Ц': { type: '?쇰━??, persona: '嫄곕Ц-?쇨컼', keywords: ['寃利?, '鍮꾪룊', '遺꾩꽍?쇰━'], evidence: '嫄곕Ц?깆? ?덉젏??李얠븘?대뒗 寃利앸젰??媛뺥빐 ?섏궗寃곗젙???꾩꽦?꾨? ?믪뿬 以띾땲??' },
    '泥쒖긽': { type: '議곗쑉??, persona: '泥쒖긽-議곗젙??, keywords: ['洹좏삎', '怨듭젙??, '愿怨꾧?由?], evidence: '泥쒖긽?깆? 泥대㈃怨??먯튃??洹좏삎?먯쓣 ?≪븘 議곗쭅 ???좊ː ?먮낯???볤쾶 留뚮벊?덈떎.' },
    '泥쒕웾': { type: '蹂댄샇??, persona: '泥쒕웾-硫섑넗', keywords: ['蹂댄샇', '?먯튃', '?꾨뜒??], evidence: '泥쒕웾?깆? ?κ린?꾩뿉???먯튃??吏?ㅻŉ ?щ엺怨?援ъ“瑜?蹂댄샇?섎뒗 ?섏쑝濡??묐룞?⑸땲??' }
  };

  var ZW_PORTFOLIO_MAIN_TITLE = {
    '?먮?': { title: '?먮? 吏?꾩옄', slogan: '沅뚯쐞瑜??덇퀬 ?먯쓣 ?ㅺ퀎?섎뒗 以묒떖 ?쒖뼇', symbol: '?' },
    '?쇱젙': { title: '?쇱젙 沅뚮젰??, slogan: '愿怨꾩? 沅뚮젰???쎄퀬 二쇰룄沅뚯쓣 伊먮뒗 ?꾨왂媛', symbol: '?? },
    '泥쒓린': { title: '泥쒓린 愿李곗옄', slogan: '癒쇱? ?쎄퀬 ?섏쨷???吏곸뿬 ?밸쪧???믪씠???ㅺ퀎??, symbol: '?? },
    '?쒖쓬': { title: '?쒖쓬 愿李곗옄', slogan: '議곗슜???쎄퀬 源딄쾶 異뺤쟻?섎뒗 ?щ튆 湲고쉷??, symbol: '?? },
    '?쒖뼇': { title: '?쒖뼇 ?좊룄??, slogan: '臾대?瑜?諛앺엳硫?二쇰????뚯뼱?밴린???뺤옣??, symbol: '?? },
    '臾닿끝': { title: '臾닿끝 吏묓뻾??, slogan: '?먮떒???ㅽ뻾?쇰줈 ?꾪솚?섎뒗 寃곌낵 以묒떖??, symbol: '?? }
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
      .replace(/\(李⑥꽦\)/g, ' ')
      .replace(/?붾줉|?붽텒|?붽낵|?붽린/g, ' ')
      .replace(/??????g, ' ')
      .replace(/(^|\s)[O?딿](?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')[0] || '';
  }

  function _zwPortfolioExtractStars(list) {
    if (!Array.isArray(list)) return [];
    return list.map(_zwPortfolioCleanStar).filter(function(s){ return !!s; });
  }

  function _zwPortfolioProfileFromStars(stars) {
    var picked = (stars || []).find(function(st){ return !!ZW_PORTFOLIO_STAR_PROFILE[st]; }) || '?먮?';
    var base = ZW_PORTFOLIO_STAR_PROFILE[picked] || ZW_PORTFOLIO_STAR_PROFILE['?먮?'];
    return { anchor: picked, type: base.type, persona: base.persona, keywords: base.keywords || [], evidence: base.evidence || '' };
  }

  function _zwPortfolioBuildRows(pd) {
    var rows = [];
    for (var i = 0; i < 12; i += 1) {
      var palaceName = (pd.palacesByIndex && pd.palacesByIndex[i]) || ('?? + (i + 1) + '沅?);
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
    var dominant = Object.keys(score).sort(function(a, b){ return score[b] - score[a]; })[0] || '?먮?';
    var titleObj = ZW_PORTFOLIO_MAIN_TITLE[dominant] || ZW_PORTFOLIO_MAIN_TITLE['?먮?'];
    var dominantProfile = ZW_PORTFOLIO_STAR_PROFILE[dominant] || ZW_PORTFOLIO_STAR_PROFILE['?먮?'];
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
    var mainText = row.mainStars.length ? row.mainStars.join(' 쨌 ') : '怨듦턿(令뷴?)';
    var auxText = row.auxStars.length ? row.auxStars.join(' 쨌 ') : '蹂댁“???놁쓬';
    var badText = row.badStars.length ? row.badStars.join(' 쨌 ') : '?됱꽦 ?곹뼢 ??쓬';
    var keyTags = row.profile.keywords && row.profile.keywords.length ? row.profile.keywords : ['湲곗쭏 ?뚯븙', '?⑦꽩 遺꾩꽍'];
    var whyType = '二쇱꽦 <span class="zwp-glow">' + _zwPortfolioEscapeHtml(mainText) + '</span> 議고빀? <span class="zwp-glow">' + _zwPortfolioEscapeHtml(row.profile.type) + '</span> ?깊뼢??媛뺥솕?⑸땲??';
    var evidence = _zwPortfolioEscapeHtml(row.profile.evidence || '?대떦 ?깃퀎???ㅼ쟾?먯꽌 ?먮떒-?됰룞 媛꾧꺽??醫곹엳??諛⑺뼢?쇰줈 ?묐룞?⑸땲??');
    var relation = '??沅곸? ?꾩껜 ?????댄? <span class="zwp-glow">' + _zwPortfolioEscapeHtml(summary.title) + '</span>怨??곌껐?섏뼱, ?꾩옱 紐낅컲??以묒떖 ?뚮쭏瑜?援ъ껜 ?됰룞?쇰줈 蹂?섑븯????븷??留≪뒿?덈떎.';
    var growthAction = {
      '沅뚯쐞??: ['以묒슂 ?섏궗寃곗젙??湲곗? 3媛吏瑜?臾몄옣?뷀븯?몄슂.', '? ????븷怨?梨낆엫??寃쎄퀎瑜?癒쇱? ?뺤쓽?섏꽭??'],
      '沅뚮젰??: ['?묒뾽 ?곷????댄빐愿怨꾨? ?쒕줈 ?뺣━??異⑸룎??以꾩씠?몄슂.', '?듭떖 ?쒖븞? ?섏튂 洹쇨굅 1媛쒕? 遺숈뿬 ?꾨떖?섏꽭??'],
      '愿李곗옄': ['寃곗젙 ??24?쒓컙 愿李?洹쒖튃?쇰줈 ?깃툒???먮떒??以꾩씠?몄슂.', '?듭떖 媛?ㅼ쓣 1臾몄옣?쇰줈 異뺤빟???ㅽ뻾?怨?怨듭쑀?섏꽭??'],
      '諛쒖궛??: ['諛쒗몴/釉뚮옖??梨꾨꼸??1媛?怨좎젙???곹뼢?μ쓣 異뺤쟻?섏꽭??', '二?1??怨듦컻 湲곕줉?쇰줈 ?좊ː ?먯궛???볦쑝?몄슂.'],
      '?ㅽ뻾??: ['?곗꽑?쒖쐞 3媛쒕쭔 ?④린怨??섎㉧吏??蹂대쪟 泥섎━?섏꽭??', '?깃낵 吏?쒕? 二쇨컙 ?⑥쐞濡?泥댄겕???ы닾???щ?瑜?寃곗젙?섏꽭??'],
      '?섑샇??: ['由ъ뒪??紐⑸줉怨?????뚮옖??誘몃━ 以鍮꾪빐 蹂?숈꽦????텛?몄슂.', '?듭떖 ?먯궛? 蹂댁닔??遺꾩궛?쇰줈 ?덉젙?깆쓣 ?뺣낫?섏꽭??'],
      '怨듦컧??: ['媛덈벑 ?곹솴?먯꽌 ?ъ떎/媛먯젙/?붿껌??遺꾨━????뷀븯?몄슂.', '?먮꼫吏 ?뚯쭊??留됰뒗 ?뚮났 猷⑦떞???쇱젙??怨좎젙?섏꽭??'],
      '留ㅻ젰??: ['?ㅽ듃?뚰겕 ?뺤옣? 遺꾧린蹂??듭떖 洹몃９ 以묒떖?쇰줈 吏꾪뻾?섏꽭??', '?좎엯??湲고쉶???섏씡??吏?띿꽦 湲곗??쇰줈 ?좊퀎?섏꽭??'],
      '?쇰━??: ['諛섎? 媛?ㅼ쓣 癒쇱? 寃利앺빐 ?섏궗寃곗젙 ?ㅻ쪟瑜?以꾩씠?몄슂.', '?듭떖 臾몄꽌??泥댄겕由ъ뒪??湲곕컲?쇰줈 ?쒖??뷀븯?몄슂.'],
      '議곗쑉??: ['愿怨꾩쓽 ?곗꽑?쒖쐞瑜?紐낇솗?????먮꼫吏 遺꾩궛??以꾩씠?몄슂.', '以묒옱 ???묒륫??怨듯넻 紐⑺몴瑜?癒쇱? ?⑹쓽?섏꽭??'],
      '蹂댄샇??: ['?κ린 怨쇱젣?????⑥쐞 由щ갭?곗떛?쇰줈 ?좎??섏꽭??', '硫섑넗留??꾨같 ?≪꽦???쒓컙??諛곗젙???곹뼢?μ쓣 ?뺤옣?섏꽭??']
    };
    var actions = growthAction[row.profile.type] || ['?ㅻ뒛 ?ㅽ뻾???묒? ?됰룞 1媛쒕? ?뺥븯怨?湲곕줉?섏꽭??', '?쇱＜????寃곌낵瑜??먭????ㅼ쓬 ?됰룞?쇰줈 ?곌껐?섏꽭??'];
    var actionHtml = '<ul class="zwp-modal-list"><li>' + _zwPortfolioEscapeHtml(actions[0]) + '</li><li>' + _zwPortfolioEscapeHtml(actions[1]) + '</li></ul>';

    return ''
      + '<p><b>[' + _zwPortfolioEscapeHtml(row.palaceDisplay) + ' 쨌 ' + _zwPortfolioEscapeHtml(row.branch) + '沅?</b> ?깃퀎 援ъ꽦? <span class="zwp-glow">' + _zwPortfolioEscapeHtml(row.profile.persona) + '</span> 異뺤쑝濡??쏀옓?덈떎.</p>'
      + '<div class="zwp-modal-tags">' + keyTags.map(function(tag){ return '<span class="zwp-modal-tag">#' + _zwPortfolioEscapeHtml(tag) + '</span>'; }).join('') + '</div>'
      + '<p>' + whyType + '</p>'
      + '<p>' + evidence + '</p>'
      + '<p><b>?깃퀎 洹쇨굅:</b> 二쇱꽦 ' + _zwPortfolioEscapeHtml(mainText) + ' / 蹂댁“??' + _zwPortfolioEscapeHtml(auxText) + ' / 寃쎄퀎??' + _zwPortfolioEscapeHtml(badText) + '</p>'
      + '<p>' + relation + '</p>'
      + '<p><b>?ㅼ쟾 ?ㅽ뻾 媛?대뱶</b></p>'
      + actionHtml
      + '<div class="zwp-swipe-hint">?꾨옒濡??ㅼ??댄봽?섍굅????踰꾪듉?쇰줈 ?レ쓣 ???덉뒿?덈떎.</div>';
  }

  for(let i=0; i<12; i++) {
    let pName = palace.palacesByIndex[i]; // 紐낃턿, ?뺤젣沅?.
    let pZhi = ZHI_LIST[i];
    let pGan = palace.gongGan[pZhi];
    let st = palace.stars[i];
    let mainList = (st.main && st.main.length) ? st.main : (st.borrowedMain || []);
    
    let highlight = (pZhi === palace.meng) ? 'box-shadow: inset 0 0 20px rgba(212,175,55,0.6); border-color: #FFD700;' : '';
    let dName = pName;
    if (pZhi === palace.meng) dName = '?뙚 ' + dName;
    if (pZhi === palace.shen) dName = dName + ' (??';

    html += '<div class="zw-cell zw-cell-'+i+'" role="button" tabindex="0" aria-label="'+dName+' ?곸꽭 ?댁꽍 蹂닿린" style="'+highlight+'; animation-delay: '+(i*0.06)+'s;" onclick="window._handleZwClick('+i+', this)">';
    html += '<div class="zw-palace-name">' + dName + '</div>';
    html += '<div class="zw-stars-wrap star-list">';
    if(mainList.length > 0) {
      mainList.forEach(function(s){
        var rendered = _zwRenderMainStar(s, pZhi);
        html += '<div class="zw-star-main">' + (rendered || s) + '</div>';
      });
    } else {
      html += '<div class="zw-empty">怨듦턿(令뷴?)</div>';
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
  html += '<div class="zw-center-title">?먮??먯닔 紐낅컲</div>';
  html += '<div class="zw-center-desc">';
  html += '紐낃턿: <span style="color:#FFF">' + palace.meng + '</span><br>';
  html += '?좉턿: <span style="color:#FFF">' + palace.shen + '</span><br>';
  html += '?ㅽ뻾援? <span style="color:#FFD700; font-weight:bold">' + palace.juInfo + '</span><br>';
  if (palace.calcMeta) {
    html += '<span style="font-size:0.68rem;color:#94a3b8;display:block;margin-top:6px">湲곗?: ?뚮젰 '+palace.calcMeta.lunarMonth+'??'+palace.calcMeta.lunarDay+'??쨌 ?쒖? '+palace.calcMeta.hourBranch+'</span>';
  }
  html += '<span style="font-size:0.75rem; color:#888; margin-top:8px; display:block;">沅?若????대┃?섎㈃ <br>媛?沅곸뿉 ????댁꽍???섏샃?덈떎.</span>';
  html += '</div>';
  html += '</div>';
  html += '</div></div>';

  html += `
    <div class="zw-detail-panel" id="zwDetailPanel">
       <div class="zw-empty-state">
        <div class="zw-empty-icon">?뙆</div>
        沅?若????대┃?섏떆硫?br>媛?沅곸뿉 ????댁꽍???섏샃?덈떎.
      </div>
    </div>
    <div id="zwDestinyPortfolioMount" class="zw-portfolio-mount"></div>
  </div>
  <div class="zw-detail-panel ziwei-report-container report-container" id="zwComprehensiveReport" style="margin-top:16px;">
    <div class="zw-empty-state">
      <div class="zw-empty-icon">?뱶</div>
      ?먮??먯닔 泥쒕챸 醫낇빀 由ы룷?몃? 遺덈윭?ㅻ뒗 以묒엯?덈떎.
    </div>
  </div>`;

  var sec = document.getElementById(targetId || 'ziweiSection');
  if(sec) sec.innerHTML = html;

  if (!window._renderZwDestinyPortfolio) {
    window._zwPortfolioStore = window._zwPortfolioStore || {};

    window._closeZwPortfolioModal = function(targetId) {
      var mount = document.getElementById(targetId);
      if (!mount) return;
      var overlay = mount.querySelector('.zwp-modal-overlay');
      if (overlay) overlay.classList.remove('is-open');
      mount.querySelectorAll('.zwp-cell.zwp-active').forEach(function(el){ el.classList.remove('zwp-active'); });
    };

    window._openZwPortfolioModal = function(targetId, idx) {
      var mount = document.getElementById(targetId);
      if (!mount) return;
      var store = window._zwPortfolioStore && window._zwPortfolioStore[targetId];
      if (!store || !store.rows || !store.rows.length) return;
      var row = store.rows.find(function(it){ return it.idx === idx; }) || store.rows[0];
      var overlay = mount.querySelector('.zwp-modal-overlay');
      var body = mount.querySelector('.zwp-modal-body');
      var title = mount.querySelector('.zwp-modal-title');
      if (!overlay || !body || !title) return;

      title.textContent = row.palaceDisplay + ' | ' + row.profile.persona;
      body.innerHTML = _zwPortfolioBuildModalHtml(row, store.summary);
      body.scrollTop = 0;
      mount.querySelectorAll('.zwp-cell.zwp-active').forEach(function(el){ el.classList.remove('zwp-active'); });
      var activeCell = mount.querySelector('.zwp-cell-' + idx);
      if (activeCell) activeCell.classList.add('zwp-active');
      overlay.classList.add('is-open');
      var sheet = mount.querySelector('.zwp-modal');
      if (sheet) sheet.scrollTop = 0;
    };

    window._renderZwDestinyPortfolio = function(targetId, pd) {
      var mount = document.getElementById(targetId);
      if (!mount || !pd) return;

      // calcZiweiPalaces??stars??諛곗뿴???꾨땲???レ옄 ??媛앹껜?대?濡??????덉슜?쒕떎.
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
        var mainLabel = row.mainStars.length ? row.mainStars.slice(0, 2).join(' 쨌 ') : '怨듦턿';
        return ''
          + '<button type="button" class="zwp-cell zwp-cell-' + row.idx + '" style="animation-delay:' + (orderIdx * 0.04).toFixed(2) + 's" onclick="window._openZwPortfolioModal(\'' + targetId + '\', ' + row.idx + ')">'
          + '  <div class="zwp-kor">[' + _zwPortfolioEscapeHtml(row.palaceDisplay) + ']</div>'
          + '  <div class="zwp-star">' + _zwPortfolioEscapeHtml(mainLabel) + '</div>'
          + '  <span class="zwp-type">' + _zwPortfolioEscapeHtml(row.profile.type) + '</span>'
          + '</button>';
      }).join('');

      mount.innerHTML = ''
        + '<section class="zwp-wrap" aria-label="?대챸 ?ы듃?대━??>'
        + '  <div class="zwp-starfield">' + starfieldHtml + '</div>'
        + '  <div class="zwp-cta"><b>?대┃ 媛?대뱶</b> 쨌 媛?移대뱶瑜??뚮윭 沅곷퀎 ?깊뼢, 洹쇨굅, ?ㅽ뻾 ?꾨왂???뺤씤?섏꽭?? 紐⑤컮?쇱뿉?쒕뒗 ?곷떒 ?쒗듃濡?諛붾줈 ?대┰?덈떎.</div>'
        + '  <div class="zwp-grid">'
        +       cellsHtml
        + '    <div class="zwp-core">'
        + '      <div class="zwp-core-symbol">' + _zwPortfolioEscapeHtml(summary.symbol) + '</div>'
        + '      <div class="zwp-core-title">' + _zwPortfolioEscapeHtml(summary.title) + '</div>'
        + '      <div class="zwp-core-slogan">' + _zwPortfolioEscapeHtml(summary.slogan) + '</div>'
        + '      <div class="zwp-core-hash">' + _zwPortfolioEscapeHtml(summary.hash) + '</div>'
        + '      <div class="zwp-core-slogan">?듭떖 ?ㅼ썙??쨌 ' + _zwPortfolioEscapeHtml((summary.keywords || []).slice(0, 3).join(' 쨌 ') || '洹좏삎 쨌 ?ㅽ뻾 쨌 ?뺤옣') + '</div>'
        + '    </div>'
        + '  </div>'
        + '  <div class="zwp-modal-overlay" aria-hidden="true">'
        + '    <div class="zwp-modal" role="dialog" aria-modal="true" aria-label="?대챸 ?ы듃?대━???곸꽭" onclick="event.stopPropagation()">'
        + '      <div class="zwp-modal-head">'
        + '        <div class="zwp-modal-title">?대챸 ?ы듃?대━??/div>'
        + '        <button type="button" class="zwp-modal-close" aria-label="?リ린" onclick="window._closeZwPortfolioModal(\'' + targetId + '\')">??/button>'
        + '      </div>'
        + '      <div class="zwp-modal-body"></div>'
        + '    </div>'
        + '  </div>'
        + '</section>';

      var overlay = mount.querySelector('.zwp-modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', function(){ window._closeZwPortfolioModal(targetId); });
      }
      var sheet = mount.querySelector('.zwp-modal');
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
            var m = document.getElementById(id);
            if (!m) return;
            var ov = m.querySelector('.zwp-modal-overlay');
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
        + '<div class="zw-empty-icon">?뙆</div>'
        + '沅?若????대┃?섏떆硫?br>媛?沅곸뿉 ????댁꽍???섏샃?덈떎.'
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
        + '<div class="zw-empty-icon">?뱶</div>'
        + '醫낇빀 由ы룷?멸? ?ロ삍?듬땲??<br>'
        + '<button type="button" class="zw-report-close-btn" style="margin-top:10px;" onclick="window._openZwComprehensiveReport()">?ㅼ떆 ?닿린</button>'
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
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">?곷?諛??앸뀈?붿씪, ?쒖뼱???쒓컙, ?쒖뼱???꾩떆瑜?紐⑤몢 ?낅젰??二쇱꽭??</div>';
        return;
      }

      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.style.opacity = '0.7';
      }
      outEl.innerHTML = '<div style="color:#ddd6fe;font-size:0.9rem;">沅곹빀??怨꾩궛?섎뒗 以묒엯?덈떎...</div>';

      var runCompatCalc = async function() {
      try {
      var cityOpt = cityEl.options[cityEl.selectedIndex];
      var cityTz = cityOpt ? (cityOpt.value || '') : '';
      var cityLong = cityOpt ? parseFloat(cityOpt.getAttribute('data-long')) : NaN;
      var cityLat = cityOpt ? parseFloat(cityOpt.getAttribute('data-lat')) : NaN;
      var cityTzOff = cityOpt ? parseFloat(cityOpt.getAttribute('data-tz')) : NaN;
      var cityLabel = cityOpt ? (cityOpt.textContent || '') : '';
      if (!cityTz || isNaN(cityLong) || isNaN(cityLat)) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">?쒖뼱???꾩떆瑜??뺥솗???좏깮??二쇱꽭??</div>';
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
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">?낅젰 ?뺤떇???ㅼ떆 ?뺤씤??二쇱꽭??</div>';
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
      var correctionMsg = '吏꾪깭?묒떆 蹂댁젙 ?곸슜: '
        + z2(ph) + ':' + z2(pmin)
        + ' ??' + z2(correctedHour) + ':' + z2(correctedMinute)
        + ' (寃쎈룄 ' + cityLngOffset + '遺? DST ' + tzResolved.dstMinutes + '遺? UTC'
        + (tzResolved.tzOffsetHours >= 0 ? '+' : '') + tzResolved.tzOffsetHours + ')';
      if (corrEl) {
        corrEl.innerHTML = '?뙇 ' + cityLabel + '<br><span style="font-size:0.75rem;color:#c4b5fd;">' + correctionMsg + '</span>';
      }

      var meBirth = window._ziweiBirth;
      if (!meBirth) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">??紐낅컲 ?뺣낫媛 ?놁뼱 沅곹빀 怨꾩궛??吏꾪뻾?????놁뒿?덈떎.</div>';
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
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">?곷? ?뺣낫 怨꾩궛 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?낅젰媛믪쓣 ?뺤씤??二쇱꽭??</div>';
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
            .replace(/\(李⑥꽦\)/g, '')
            .replace(/?붾줉|?붽텒|?붽낵|?붽린/g, '')
            .trim()
            .split(' ')[0];
          return { name: nm || '', borrowed: useBorrowed || /\(李⑥꽦\)|\b李⑥꽦\b/.test(plain) };
        }).filter(function(v) { return !!v.name; });
      };

      var getPalSnapshot = function(zwData, palaceName) {
        if (!zwData || !zwData.palacesByIndex || !zwData.stars) {
          return { main: [], aux: [], bad: [], borrowedCount: 0 };
        }
        var idx = zwData.palacesByIndex.indexOf(palaceName);
        if (idx < 0 && palaceName === '遺泥섍턿') idx = zwData.palacesByIndex.indexOf('遺遺沅?);
        if (idx < 0 && palaceName === '遺遺沅?) idx = zwData.palacesByIndex.indexOf('遺泥섍턿');
        if (idx < 0) return { main: [], aux: [], bad: [], borrowedCount: 0 };
        var st = zwData.stars[idx] || { main: [], aux: [], bad: [], borrowedMain: [] };
        var mainMeta = parseMainMeta(st);
        var aux = (st.aux || []).map(function(v) {
          return (v || '').replace(/<[^>]*>/g, ' ').replace(/?붾줉|?붽텒|?붽낵|?붽린/g, '').replace(/\s+/g, ' ').trim().split(' ')[0];
        }).filter(function(v) { return !!v; });
        var bad = (st.bad || []).map(function(v) {
          return (v || '').replace(/<[^>]*>/g, ' ').replace(/?붾줉|?붽텒|?붽낵|?붽린/g, '').replace(/\s+/g, ' ').trim().split(' ')[0];
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
        meng: getPalSnapshot(meData, '紐낃턿'),
        bok: getPalSnapshot(meData, '蹂듬뜒沅?),
        spouse: getPalSnapshot(meData, '遺泥섍턿'),
        illness: getPalSnapshot(meData, '吏덉븸沅?),
        move: getPalSnapshot(meData, '泥쒖씠沅?),
        home: getPalSnapshot(meData, '?꾪깮沅?),
        wealth: getPalSnapshot(meData, '?щ갚沅?),
        job: getPalSnapshot(meData, '愿濡앷턿')
      };
      var youPal = {
        meng: getPalSnapshot(partnerData, '紐낃턿'),
        bok: getPalSnapshot(partnerData, '蹂듬뜒沅?),
        spouse: getPalSnapshot(partnerData, '遺泥섍턿'),
        illness: getPalSnapshot(partnerData, '吏덉븸沅?),
        move: getPalSnapshot(partnerData, '泥쒖씠沅?),
        home: getPalSnapshot(partnerData, '?꾪깮沅?),
        wealth: getPalSnapshot(partnerData, '?щ갚沅?),
        job: getPalSnapshot(partnerData, '愿濡앷턿')
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

      var coreMainMe = mePal.spouse.main[0] || mePal.meng.main[0] || '怨듦턿';
      var coreMainYou = youPal.spouse.main[0] || youPal.meng.main[0] || '怨듦턿';

      var tierText = function(v) {
        if (v >= 86) return '理쒖긽湲???;
        if (v >= 74) return '媛뺥븳 ??;
        if (v >= 62) return '?덉젙 ??;
        if (v >= 50) return '蹂댄넻 ??;
        return '議곗쑉 ?꾩슂';
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
        return (list && list.length) ? list.join(' 쨌 ') : (emptyTxt || '吏곸젒 怨듯넻???쏀븿');
      };
      var coreTxt = function(p) {
        return (p && p.main && p.main.length) ? p.main[0] : '怨듦턿';
      };
      var supportText = function(meP, youP) {
        var s = inter(meP.aux, youP.aux);
        if (s.length) return '怨듯넻 湲몄꽦 ' + s.slice(0, 3).join(' 쨌 ') + '??愿怨??꾩땐 ??븷???⑸땲??';
        var n = (meP.aux.length + youP.aux.length);
        return n >= 3 ? '吏곸젒 怨듯넻 湲몄꽦? ?쏀븯吏留?媛곸옄 蹂댁“?깆씠 ?덉뼱 議곗쑉 ?ъ?媛 ?쎈땲??' : '蹂댁“ 湲몄꽦???쏀븳 ?몄씠???뚰넻 猷⑦떞???섏떇?곸쑝濡??ㅺ퀎?섎뒗 ?몄씠 醫뗭뒿?덈떎.';
      };
      var riskText = function(meP, youP) {
        var r = meP.bad.length + youP.bad.length;
        if (r >= 5) return '?됱꽦 ?뺣젰???믪? ?몄씠???ㅽ빐 ?꾩쟻쨌媛먯젙 怨쇱뿴 援ш컙??二쇨린?곸쑝濡??섍린?댁빞 ?⑸땲??';
        if (r >= 3) return '?됱꽦 ?뺣젰??以묎컙 ?섏??대?濡??쇱젙쨌?쎌냽쨌??愿??湲곗? ?⑹쓽媛 ?꾩슂?⑸땲??';
        return '?됱꽦 ?뺣젰? ??? ?몄쑝濡??댄뻾 洹쒖튃留?留욎텛硫??덉젙?곸쑝濡?援대윭媛묐땲??';
      };
      var borrowedNote = function(meP, youP) {
        var b = meP.borrowedCount + youP.borrowedCount;
        return b > 0 ? ('李⑥꽦 媛쒖엯(' + b + ')???덉뼱 ?곹솴/?섍꼍 蹂?섏뿉 ?곕씪 泥닿컧 沅곹빀???붾뱾由????덉뒿?덈떎.') : '?먯꽦 以묒떖 援ъ“??沅곹빀 ?댁꽍???쇨??깆씠 鍮꾧탳???믪? ?몄엯?덈떎.';
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

      var loveDesc = '遺泥섍턿 ?듭떖?? ??' + coreTxt(mePal.spouse) + ' 횞 ?곷? ' + coreTxt(youPal.spouse)
        + ' / 怨듯넻 二쇱꽦: ' + starsTxt(loveSharedSpouse)
        + '. 紐낃턿 怨듯넻??' + starsTxt(loveSharedMeng) + ')???뚮┝???띾룄? 媛먯젙 ?쒗쁽 ?쒗룷瑜?留욎땅?덈떎. '
        + supportText(mePal.spouse, youPal.spouse) + ' ' + riskText(mePal.spouse, youPal.spouse);

      var marriageDesc = '遺泥섍턿쨌?꾪깮沅겶룸났?뺢턿???⑹궛??寃곌낵?낅땲?? ?꾪깮沅?怨듯넻 二쇱꽦: ' + starsTxt(marriageSharedHome)
        + ', 蹂듬뜒沅?怨듯넻 二쇱꽦: ' + starsTxt(marriageSharedBok)
        + '. ?앺솢 寃고빀?먯꽌??"??븷 遺꾨떞쨌?щТ ?댄뻾쨌媛??由щ벉"???⑹씠 愿嫄댁씠硫? '
        + borrowedNote(mePal.home, youPal.home) + ' ' + riskText(mePal.home, youPal.home);

      var friendDesc = '紐낃턿 怨듯넻 二쇱꽦: ' + starsTxt(friendSharedMeng)
        + ' / 蹂듬뜒沅?怨듯넻 二쇱꽦: ' + starsTxt(friendSharedBok)
        + '. ???肄붾뱶? ?뺤꽌 ?뚮났 諛⑹떇???좎궗?꾨? 諛섏쁺?덉쑝硫? '
        + supportText(mePal.bok, youPal.bok) + ' 移쒓뎄 愿怨꾩뿉?쒕뒗 媛먯젙 ?뚮え ???뚮났 ?띾룄媛 ?듭떖?낅땲??';

      var workDesc = '愿濡앷턿 ?듭떖?? ??' + coreTxt(mePal.job) + ' 횞 ?곷? ' + coreTxt(youPal.job)
        + ' / 怨듯넻 二쇱꽦: ' + starsTxt(workSharedJob)
        + '. ?낅Т 沅곹빀? "?띾룄 vs ?꾩꽦?? 諛곕텇?먯꽌 媛덈━硫? '
        + supportText(mePal.job, youPal.job) + ' ' + riskText(mePal.job, youPal.job);

      var businessDesc = '?щ갚沅?怨듯넻 二쇱꽦: ' + starsTxt(bizSharedWealth)
        + ', 愿濡앷턿 怨듯넻 二쇱꽦: ' + starsTxt(bizSharedJob)
        + '. ?섏씡??紐⑤뜽쨌沅뚰븳 諛곗튂쨌嫄곕Ц ?뚮룞 ?듭젣 援ъ“瑜??④퍡 蹂댁젙???먯닔?낅땲?? '
        + '?щ갚沅??듭떖????' + coreTxt(mePal.wealth) + ' / ?곷? ' + coreTxt(youPal.wealth) + ') 李⑥씠媛 ?댁닔濡?怨꾩빟???뺤궛 洹쒖튃??珥섏킌???〓뒗 寃껋씠 ?좊━?⑸땲??';

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
      var destinyLoverHit = hasAny(pastSpouseStars.concat(pastMengStars), ['?먮?','泥쒕?','?쒖쓬','?먮옉']);
      var karmicDebtHit = hasAny(pastIllnessStars.concat(pastBokStars), ['移좎궡','?붿꽦','?곸꽦']);
      var mentorHit = hasAny(pastBokStars, ['泥쒓린']) && hasAny(pastMengStars, ['臾몄갹','臾멸끝']);
      var rivalHit = (hasAny(pastAxisMain, ['移좎궡']) && hasAny(pastAxisMain, ['?뚭뎔'])) || (pastAxisMain.filter(function(v){ return v === '移좎궡' || v === '?뚭뎔'; }).length >= 2);
      var guardianHit = hasAny(pastAxisMain, ['泥쒕웾','泥쒕룞']);

      if (destinyLoverHit) pastTypeList.push('?숇챸 ?곗씤??);
      if (karmicDebtHit) pastTypeList.push('karmic 鍮싳쓽 ?몄뿰');
      if (mentorHit) pastTypeList.push('?ㅼ듅怨??쒖옄 ?몄뿰');
      if (rivalHit) pastTypeList.push('?대챸???쇱씠踰?);
      if (guardianHit) pastTypeList.push('蹂댄샇???몄뿰');
      if (!pastTypeList.length) pastTypeList.push('?대쾲 ??以묒떖 ?몄뿰');

      var envMap = {
        '?먮옉':'沅곸쨷/?덉닠怨?,
        '移좎궡':'?꾩웳???κ뎔??吏꾩쁺',
        '泥쒓린':'?숈옄/?꾨왂媛???쒓퀬',
        '?쒖쓬':'洹議?媛臾??諛???댁떎',
        '?뚭뎔':'?곷챸湲?寃⑸???援?㈃',
        '泥쒕웾':'醫낃탳/?섑뻾 怨듬룞泥?
      };
      var eraStar = pickFirst(uniq((mePal.move.main || []).concat(youPal.move.main || []).concat(pastMoveStars)), ['?먮옉','移좎궡','泥쒓린','?쒖쓬','?뚭뎔','泥쒕웾']);
      var pastEraPlace = eraStar ? envMap[eraStar] : '?대룞??留롮? 援먯뿭 ?꾩떆/蹂?붿쓽 寃쎄퀎 吏?';

      var pastBand = '';
      if (pastLifeScore >= 80) pastBand = '媛뺥븳 ?꾩깮 ?몄뿰';
      else if (pastLifeScore >= 60) pastBand = 'karmic 愿怨?;
      else if (pastLifeScore >= 40) pastBand = '?ㅼ퀜媛???몄뿰';
      else pastBand = '?대쾲 ??以묒떖 ?몄뿰';

      var pastTypeTitle = pastTypeList.join(' + ');
      var pastRelation = '';
      if (pastTypeList.indexOf('?숇챸 ?곗씤??) >= 0) {
        pastRelation = '泥섏쓬 留덉＜???쒓컙?먮룄 ?ㅻ옒?꾨????쒕줈瑜??뚯븘蹂???븳 ?뺤꽌???듭닕?⑥씠 媛뺥븯寃??먮? ???덉뒿?덈떎.';
      } else if (pastTypeList.indexOf('karmic 鍮싳쓽 ?몄뿰') >= 0) {
        pastRelation = '?뚮┝怨?媛덈벑???숈떆???묐룞?섎ŉ, 愿怨꾨? ?듯빐 ?쒕줈??誘몄셿??怨쇱젣瑜?諛곗썙媛???먮쫫???섑??섍린 ?쎌뒿?덈떎.';
      } else if (pastTypeList.indexOf('?ㅼ듅怨??쒖옄 ?몄뿰') >= 0) {
        pastRelation = '媛먯젙蹂대떎 吏??援먮쪟媛 癒쇱? ?곌껐?섎ŉ, ?쒕줈???쒖빞瑜??볧?二쇰뒗 ?숇컲 ?깆옣???몄뿰?쇰줈 ?쏀옓?덈떎.';
      } else if (pastTypeList.indexOf('?대챸???쇱씠踰?) >= 0) {
        pastRelation = '?쒕줈瑜??먭레?섎ŉ 諛???щ━??湲댁옣媛먯씠 媛뺥븯怨? 寃쎌웳??怨??깆옣???μ튂濡??묐룞??媛?μ꽦???쎈땲??';
      } else if (pastTypeList.indexOf('蹂댄샇???몄뿰') >= 0) {
        pastRelation = '?곗씤?대씪湲곕낫??媛議?媛숈? 蹂댄샇 蹂몃뒫怨??덉젙媛먯씠 癒쇱? ?묐룞?섎뒗 愿怨?寃곗씠 媛뺥빀?덈떎.';
      } else {
        pastRelation = '?꾩깮??媛뺥븳 怨좊━蹂대떎???대쾲 ?앹쓽 ?좏깮怨??⑹쓽媛 愿怨꾩쓽 諛⑺뼢?????ш쾶 醫뚯슦?섎뒗 ?먮쫫?낅땲??';
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
        '癒밸튆 ?섎뒛??泥?蹂꾩씠 耳쒖쭏 臾대졄,',
        '?щ젰??諛붾뚭린 吏곸쟾???뺤쟻 ?띿뿉??',
        '諛붾엺??臾멸퀬由щ? ?붾뱾???ㅻ옒??諛?',
        '?깆옍遺덉씠 媛????쾶 ?⑤━???덈꼍,',
        '?깆슫??寃쎄퀎媛 ?대━??李곕굹??'
      ];
      var storyScenesByType = {
        '?숇챸 ?곗씤??: [
          '???щ엺? ?섎?? 異뺣났??援먯감?섎뒗 ?꾧컖?먯꽌 ?쒕줈???대쫫??遊됱씤?섎벏 遺덈?怨?',
          '???щ엺? ?뚯븙怨??μ씠 ?먮Ⅴ??沅곸젙???뚮옉?먯꽌 媛숈? ?쎌냽???ㅻⅨ ?몄뼱濡?諛섎났?덉쑝硫?',
          '???щ엺? 諛ㅺ만???깅텋 ?꾨옒???대퀎??誘몃（??????ы쉶瑜??덉뼵?섎뒗 ?쒖떇???④꼈怨?'
        ],
        'karmic 鍮싳쓽 ?몄뿰': [
          '???щ엺? ?꾩옣???ㅽ렪?먯꽌 ?쒕줈???앹〈??諛붽퓭移섍린?섎벏 吏耳쒕깉吏留??뺤궛?섏? 紐삵븳 媛먯젙???⑥븯怨?',
          '???щ엺? 鍮싰낵 ??쒖쓽 ?λ?瑜??앸궡 留욎텛吏 紐삵븳 梨?媛숈? ?꾩떆???ㅻⅨ 怨꾩젅濡??⑹뼱議뚯쑝硫?',
          '???щ엺? 援ъ썝怨??곸쿂媛 援먯감?섎뒗 ?좏깮??諛섎났?섎떎 留덉?留?臾몄옣???곗? 紐삵븳 梨?硫덉톬怨?'
        ],
        '?ㅼ듅怨??쒖옄 ?몄뿰': [
          '???щ엺? ?ㅻ옒???쒓퀬?먯꽌 吏덈Ц怨??듭쓣 二쇨퀬諛쏆쑝硫??쒕줈???쒖빞瑜??뺤옣?덉?留?',
          '???щ엺? 媛숈? ?꾪몴瑜??ㅻⅨ ?먯쑝濡??꾩꽦??媛硫??ъ쑀??寃곗쓣 ??븘媛붽퀬,',
          '???щ엺? 留먮낫??移⑤У???щ갚?먯꽌 ??留롮? 吏?쒕? ?꾩닔?덉쑝??'
        ],
        '?대챸???쇱씠踰?: [
          '???щ엺? 媛숈? 紐⑺몴瑜??ㅻⅨ 諛⑹떇?쇰줈 ?곸랬?섎ŉ ?쒕줈瑜?媛???좎뭅濡?쾶 ?깆옣?쒖섟怨?',
          '???щ엺? ?밸???臾명꽦留덈떎 ?곷???議댁옱瑜??먯떊???쒓퀎移섎줈 ?쇱븯?쇰ŉ,',
          '???щ엺? ?由쎌쓽 ?몄뼱濡??뚰넻?섎㈃?쒕룄 寃곗젙???쒓컙留덈떎 ?쒕줈???깆쓣 諛?댁＜?덇퀬,'
        ],
        '蹂댄샇???몄뿰': [
          '???щ엺? ??슦媛 ?잛븘吏??怨⑤ぉ留덈떎 ???щ엺??湲몄쓣 留뚮뱾怨??ㅻⅨ ???щ엺???⑥쓣 怨좊Ⅴ寃??덉쑝硫?',
          '???щ엺? 遺덉븞??諛?ㅼ삤???좊쭏????븷??諛붽퓭媛硫??쒕줈??諛⑺뙣媛 ?섏뿀怨?',
          '???щ엺? ?꾧린 ?뚮쭏??媛??癒쇱? ?쒕줈???대쫫???뺤씤?섎뒗 ?듦???媛뽮쾶 ?섏뿀吏留?'
        ],
        '?대쾲 ??以묒떖 ?몄뿰': [
          '???щ엺???꾩깮 湲곕줉? 吏㏐퀬 ?낆?留? ?щ????묒젏?ㅼ씠 ?대쾲 ?앹쓽 ?곗뿰???뺢탳?섍쾶 諛???щ졇怨?',
          '???щ엺??怨쇨굅 ?곌껐? 媛뺥븯吏 ?딆븯?쇰굹 諛섎났?섎뒗 ??대컢???쇱튂媛 愿怨꾩쓽 媛?μ꽦???ㅼ썱?쇰ŉ,',
          '???щ엺? 湲??쒖궗 ????묒? 怨듬챸?ㅼ쓣 ?④꼈怨?洹멸쾬?ㅼ씠 ?꾩깮?먯꽌 ?ㅼ떆 寃곗쓣 留뚮뱾怨??덉쑝硫?'
        ]
      };
      var storyConflictsByBand = {
        '媛뺥븳 ?꾩깮 ?몄뿰': [
          '媛뺥븳 ?뚮┝??湲곗? ?녿뒗 ?띾룄濡?踰덉?硫??좎젙???쇰줈濡?諛붾????덉뿀?듬땲??',
          '?쒕줈瑜????덈떎???뺤떊????붾? ?앸왂?섍쾶 留뚮뱾 ???ㅽ빐媛 ??源딆뼱議뚯뒿?덈떎.',
          '?듭닕?⑥씠 諛곕젮瑜??泥댄븳 援ш컙?먯꽌 愿怨꾩쓽 ?⑤룄媛 湲됯꺽???붾뱾?몄뒿?덈떎.'
        ],
        'karmic 愿怨?: [
          '誘명빐寃?怨쇱젣媛 諛섎났?좎닔濡?媛숈? 媛덈벑???ㅻⅨ ?λ㈃?쇰줈 ?ы쁽?섎뒗 ?⑦꽩???앷꼈?듬땲??',
          '?ш낵蹂대떎 ?대챸??癒쇱? ?섏삱 ??媛먯젙???λ?媛 怨꾩냽 ?꾩쟻?섏뿀?듬땲??',
          '?뺣떟??李얠쑝?ㅻ뒗 議곌툒?⑥씠 ?쒕줈???뚮났 ??대컢???닿툔?섍쾶 ?덉뒿?덈떎.'
        ],
        '?ㅼ퀜媛???몄뿰': [
          '?곌껐??諛?꾨낫???꾩떎???띾룄媛 ?욎꽕 ???먯쓣 ?볦튂湲??ъ썱?듬땲??',
          '媛먯젙? ?덉뿀吏留??댁쁺 洹쒖튃???놁뼱 ?쇱긽??愿怨꾨? 諛?대깉?듬땲??',
          '醫뗭? ?섎룄??異⑸텇?덉쑝???⑹쓽???몄뼱媛 遺議깊빐 ?뉕컝由쇱씠 ?꾩쟻?섏뿀?듬땲??'
        ],
        '?대쾲 ??以묒떖 ?몄뿰': [
          '?좎엯寃ъ씠 而ㅼ쭏?섎줉 ?ㅼ젣???μ젏??媛?ㅼ???臾몄젣媛 諛섎났?섏뿀?듬땲??',
          '?섎?瑜?怨쇱옣???댁꽍?섎㈃ ?⑥닚??臾몄젣???숇챸泥섎읆 蹂댁씪 ???덉뿀?듬땲??',
          '?묒? ?ㅽ빐瑜?利됱떆 ?吏 ?딆쑝硫?愿怨꾩쓽 湲곕낯媛믪씠 ?쎄쾶 ??븘議뚯뒿?덈떎.'
        ]
      };
      var storyEndings = [
        '洹몃옒???대쾲 ?앹쓽 ?댁뇿??"?띾룄"蹂대떎 "?⑹쓽"?대ŉ, ?쎌냽???⑥쐞瑜??묎쾶 履쇨갇?섎줉 ?몄뿰???덉쭏???믪븘吏묐땲??',
        '寃곌뎅 ???몄뿰???꾩꽦?꾨뒗 媛먯젙???ш린蹂대떎 ?댁쁺???뷀뀒?쇱뿉 ?섑빐 寃곗젙?섎ŉ, 諛섎났 媛?ν븳 洹쒖튃??怨??щ옉???덉쟾?μ튂媛 ?⑸땲??',
        '?대쾲 ?앹뿉?????щ엺? ?대챸??利앸챸?섍린蹂대떎 ?앺솢???ㅺ퀎?댁빞 ?섎ŉ, 洹??ㅺ퀎?꾧? 怨??꾩깮??誘몄셿???꾩꽦?섎뒗 臾몄꽌媛 ?⑸땲??',
        '?곕씪??媛뺥븳 ?뚮┝???ㅻ옒 媛???좊ː濡?諛붽씀?ㅻ㈃, 利됲씎???댁꽍蹂대떎 二쇨린?????猷⑦떞???꾩닔?낅땲??'
      ];

      var leadType = pastTypeList[0] || '?대쾲 ??以묒떖 ?몄뿰';
      var scenePool = storyScenesByType[leadType] || storyScenesByType['?대쾲 ??以묒떖 ?몄뿰'];
      var conflictPool = storyConflictsByBand[pastBand] || storyConflictsByBand['?ㅼ퀜媛???몄뿰'];
      var storyOpening = _zwPickBySeed(storyOpeners, pastSeed, 3);
      var storyScene = _zwPickBySeed(scenePool, pastSeed, 11);
      var storyConflict = _zwPickBySeed(conflictPool, pastSeed, 19);
      var storyEnding = _zwPickBySeed(storyEndings, pastSeed, 27);

      var storyMotifList = [];
      if (hasAny(pastAxisMain, ['?쒖쓬','泥쒕룞'])) storyMotifList.push('?붽킅???뺤꽌 援먭컧');
      if (hasAny(pastAxisMain, ['移좎궡','?뚭뎔'])) storyMotifList.push('媛뺥븳 寃곕떒怨?蹂??);
      if (hasAny(pastAxisMain, ['泥쒓린','臾몄갹','臾멸끝'])) storyMotifList.push('吏??怨듬챸怨??꾨왂');
      if (hasAny(pastAxisMain, ['泥쒕웾','泥쒕?'])) storyMotifList.push('蹂댄샇? 梨낆엫??寃?);
      if (hasAny(pastAxisMain, ['?먮옉','?쒖뼇'])) storyMotifList.push('?댁젙怨??쒗쁽??遺덇퐙');
      if (!storyMotifList.length) storyMotifList.push('?먮┛ ?좊ː??異뺤쟻');
      var storyMotifs = uniq(storyMotifList).slice(0, 3).join(' 쨌 ');

      var pastStory = storyOpening + ' '
        + '???щ엺???곹샎? ' + pastEraPlace + '??湲곕줉怨?怨듬챸?섎ŉ ?쒕줈瑜??ъ씤?앺뻽?듬땲?? '
        + storyScene + ' '
        + '洹?怨쇱젙?먯꽌 ' + storyConflict + ' '
        + '?꾩옱 李⑦듃???⑥? ?꾩깮???ㅼ썙?쒕뒗 [' + storyMotifs + ']?대ŉ, '
        + storyEnding;

      var pastMeaning = '';
      if (pastLifeScore >= 80) {
        pastMeaning = '媛뺥븳 ?꾩깮 ?몄뿰 異뺤씠 媛먯??⑸땲?? ?대쾲 ?앹뿉?쒕뒗 "媛뺥븳 ?뚮┝"??"?덉젙?곸씤 ?⑹쓽"濡?諛붽씀???ㅼ쿇??愿怨꾩쓽 ?덉쭏??寃곗젙?⑸땲?? '
          + '誘몄뀡: 1) ?ㅽ댘 ??24?쒓컙 ???щ???洹쒖튃 ?뺤젙 2) ??1??愿怨??댁쁺 ?먭? 3) ???쒓컙/?곕씫 湲곗? 3以??뚮쾿 ?묒꽦.';
      } else if (pastLifeScore >= 60) {
        pastMeaning = 'karmic ?숈뒿 怨쇱젣媛 ?⑥븘 ?덉쓣 媛?μ꽦???덉뒿?덈떎. 媛먯젙 諛섏쓳??利됱떆 ?뺤젙?섏? ?딄퀬 ???洹쒖튃???몄슦硫??깆옣 ?띾룄媛 鍮⑤씪吏묐땲?? '
          + '誘몄뀡: 1) 媛먯젙 ?몄뼱(?ъ떎/媛먯젙/?붿껌) ?щ㎎ ?듭씪 2) ?ㅽ빐 ?꾩쟻 ?꾩뿉 10遺?泥댄겕??3) 媛덈벑 ?ㅼ썙??湲곕줉 ???щ컻 諛⑹?.';
      } else if (pastLifeScore >= 40) {
        pastMeaning = '?꾩깮???곌껐? ?쏀븯吏留??섎? ?녿뒗 留뚮궓? ?꾨떃?덈떎. ?대쾲 ?앹쓽 ?앺솢 由щ벉怨??곹샇 議댁쨷???몄뿰??源딆씠瑜??ㅼ슦???듭떖 ?댁뇿?낅땲?? '
          + '誘몄뀡: 1) 二쇨컙 ?곗씠???댁떇 由щ벉 怨좎젙 2) 湲곕?移??ъ쟾 ?⑹쓽 3) 湲띿젙 ?쇰뱶諛?1媛쒕? 留ㅼ씪 援먰솚.';
      } else {
        pastMeaning = '?꾩깮蹂대떎 ?꾩깮 以묒떖???몄뿰?쇰줈 蹂댁엯?덈떎. ?좎엯寃??놁씠 吏湲덉쓽 ?좏깮怨??됰룞?쇰줈 愿怨꾨? ?ㅺ퀎?좎닔濡?嫄닿컯??寃곌낵??媛源뚯썙吏묐땲?? '
          + '誘몄뀡: 1) 愿怨?紐⑺몴瑜??묎쾶 ?뺤쓽 2) ??븷 遺꾨떞 紐낇솗??3) 臾몄젣 諛쒖깮 ???먯씤蹂대떎 ?닿껐 ?쒖꽌瑜?癒쇱? ?⑹쓽.';
      }

      var pastMission = '';
      if (pastBand === '媛뺥븳 ?꾩깮 ?몄뿰') {
        pastMission = '?쒕줈瑜??덈Т ???덈떎??李⑷컖??寃쎄퀎?섍퀬, ?⑹쓽 ?녿뒗 吏곴컧??以꾩씠??寃?';
      } else if (pastBand === 'karmic 愿怨?) {
        pastMission = '諛섎났?섎뒗 媛덈벑 ?⑦꽩??湲곕줉??"?대쾲?먮뒗 ?ㅻⅤ寃? ?ㅽ뻾?섎뒗 寃?';
      } else if (pastBand === '?ㅼ퀜媛???몄뿰') {
        pastMission = '?묒? ?쎌냽???댄뻾瑜좎쓣 ?믪뿬 ?좊ː???꾩쟻移섎? 留뚮뱶??寃?';
      } else {
        pastMission = '?숇챸 ?댁꽍蹂대떎 ?꾩떎 ?댁쁺(?쒓컙쨌?댟룻몴?????쇨??깆쓣 癒쇱? ?몄슦??寃?';
      }

      var pastLifeDesc = '?꾩깮 ?몄뿰 ?좏삎\n(' + pastTypeTitle + ')\n\n'
        + '?꾩깮 ?ㅼ썙??n(' + storyMotifs + ')\n\n'
        + '?꾩깮 愿怨?n(' + pastRelation + ')\n\n'
        + '?꾩깮 ?쒕? / ?μ냼\n(' + pastEraPlace + ')\n\n'
        + '?꾩깮 ?댁빞湲?n(' + pastStory + ')\n\n'
        + '?꾩깮 ?몄뿰 ?먯닔\n(' + pastLifeScore + ' / 100, ' + pastBand + ')\n\n'
        + '?대쾲 ?앹뿉?쒖쓽 ?섎?\n(' + pastMeaning + ')\n\n'
        + '?대쾲 ??誘몄뀡\n(' + pastMission + ')';

      var tagByScore = function(score, key) {
        if (key === '?곗븷 沅곹빀') return score >= 60 ? '#媛먯젙援먮쪟?쒖꽦' : '#?띾룄議곗쑉';
        if (key === '寃고샎 沅곹빀') return score >= 60 ? '#?앺솢?뚮쾿?⑹쓽' : '#媛?뺣━?ъ“??;
        if (key === '吏곸옣 沅곹빀') return score >= 60 ? '#??븷遺꾨떞?쒕꼫吏' : '#蹂묐ぉ?댁냼';
        if (key === '?ъ뾽 沅곹빀') return score >= 60 ? '#?섏씡援ъ“?뺣젹' : '#怨꾩빟?쒖슦??;
        if (key === '移쒓뎄 沅곹빀') return score >= 60 ? '#?뺤꽌?뚮났鍮좊쫫' : '#嫄곕━議댁쨷';
        return score >= 60 ? '#移대Ⅴ留덉긽?몃낫?? : '#?몄뿰?숈뒿';
      };

      var rawCatRows = [
        { key: '?곗븷 沅곹빀', rawVal: loveScore, w: 0.26 },
        { key: '寃고샎 沅곹빀', rawVal: marriageScore, w: 0.22 },
        { key: '移쒓뎄 沅곹빀', rawVal: friendScore, w: 0.12 },
        { key: '吏곸옣 沅곹빀', rawVal: workScore, w: 0.18 },
        { key: '?ъ뾽 沅곹빀', rawVal: businessScore, w: 0.17 }
      ];

      var funDetailByTag = function(tag, key) {
        var tagKey = String(tag || '').replace(/^#/, '');
        var map = {
          '媛먯젙援먮쪟?쒖꽦': '?ㅻ뒛??而ㅽ뵆 ?섏뒪?? "??以?媛먯젙 + ??以?移?갔"???쒕줈 援먰솚?섎㈃ ?좎젙 寃뚯씠吏媛 ?덉뿉 ?꾧쾶 ?곸듅?⑸땲?? 留먰닾媛 遺?쒕윭?뚯쭏?섎줉 蹂꾨튆 踰꾪봽媛 媛뺥빐吏묐땲??',
          '?띾룄議곗쑉': '???щ엺??由щ벉???쒕줈 ?щ씪 "鍮⑤━"蹂대떎 "媛숈씠"媛 ?뺣떟??援ш컙?낅땲?? ?곗씠???쒗룷瑜?諛?諛뺤옄留???텛硫??ㅽ빐媛 洹?ъ슫 ?댄봽?앹쑝濡??앸궔?덈떎.',
          '?앺솢?뚮쾿?⑹쓽': '??沅곹빀???듭떖? 濡쒕㎤?ㅻ낫???댁쁺?μ엯?덈떎. ?댟룹뿰?승룻쑕??洹쒖튃 3媛쒕쭔 ?⑹쓽?대룄 "?꾩떎 泥쒖깮?곕텇" 紐⑤뱶媛 耳쒖쭛?덈떎.',
          '媛?뺣━?ъ“??: '吏묒븞?? ?섎㈃, ?앹궗泥섎읆 ?쇱긽 由щ벉??留욎텛硫??좎젙???먮룞 異⑹쟾?⑸땲?? ?묒? 猷⑦떞 ?섎굹媛 ???몄???誘몃━ 留됱븘二쇰뒗 ?⑥? 移섑듃?ㅼ엯?덈떎.',
          '??븷遺꾨떞?쒕꼫吏': '???? 媛곸옄 ?섑븯???ъ??섏쓣 留≪쓣 ????컻?⑸땲?? "?꾧? ???댁떖??蹂대떎 "?꾧? ????留욌뒗吏"濡??섎늻硫??깃낵? 愿怨꾨? ?숈떆??梨숆퉩?덈떎.',
          '蹂묐ぉ?댁냼': '?듬떟???ъ씤?몃? ?④린吏 留먭퀬 蹂묐ぉ 1媛쒕쭔 肄?吏묒뼱 ?닿껐?섏꽭?? ?뚯쓽 10遺? ?뺣━ 2以꾩씠硫??ㅽ듃?덉뒪 ?뚮룞??鍮좊Ⅴ寃??대젮媛묐땲??',
          '?섏씡援ъ“?뺣젹': '?덉쓽 ?먮쫫??媛숈? 洹몃┝?쇰줈 蹂대뒗 ?쒓컙 沅곹빀??湲됱긽?뱁빀?덈떎. ?섏엯쨌吏異쑣룹?異뺤쓣 ???붾㈃???볤퀬 蹂대㈃ "?? ?몄슦?붿?媛 諛붾줈 ?由쎈땲??',
          '怨꾩빟?쒖슦??: '醫뗭? 愿怨꾩씪?섎줉 臾몄꽌媛 ?ㅼ젙?⑸땲?? ??븷쨌沅뚰븳쨌?뺤궛 洹쒖튃??誘몃━ ?곸뼱?먮㈃ 媛먯젙 ?뚮え ?놁씠 ?ㅻ옒 媛???뚰듃?덉떗???⑸땲??',
          '?뺤꽌?뚮났鍮좊쫫': '?띿긽?대룄 ?뚮났 ?띾룄媛 鍮좊Ⅸ 議고빀?낅땲?? ?곗콉 20遺?+ 媛꾩떇 1媛?媛숈? 媛踰쇱슫 猷⑦떞??湲곕텇????띻쾶 鍮좊Ⅴ寃??섎룎由쎈땲??',
          '嫄곕━議댁쨷': '媛源뚯???諛?꾨낫??嫄곕━???덉쭏??以묒슂???몄뿰?낅땲?? 媛곸옄??怨듦컙???몄젙?좎닔濡??ㅼ떆 留뚮궗?????⑤룄媛 ???곕쑜?댁쭛?덈떎.',
          '移대Ⅴ留덉긽?몃낫??: '?쒕줈???쎌젏??援먯젙??二쇰뒗 ?숈뒿??踰꾪봽媛 ?묐룞?⑸땲?? "怨좎튂?ㅻ뒗 留?蹂대떎 "?꾩?二쇰뒗 ?됰룞"???⑥뵮 鍮좊Ⅴ寃?愿怨꾨? ?깆옣?쒗궢?덈떎.',
          '?몄뿰?숈뒿': '吏湲덉? ?꾩꽦?뺣낫???쒗넗由ъ뼹 援ш컙?낅땲?? ?묒? ?쒗뻾李⑹삤瑜?湲곕줉???먮㈃ ?ㅼ쓬 留뚮궓留덈떎 泥닿컧 沅곹빀??袁몄????щ씪媛묐땲??'
        };
        var fallback = '??援ш컙???ㅼ썙?쒕뒗 ' + tag + ' ?낅땲?? 媛蹂띻쾶 ?껉퀬 鍮좊Ⅴ寃??⑹쓽?섎뒗 ??쇱닔濡??댁쓽 泥닿컧 ?⑤룄媛 ??醫뗭븘吏묐땲??';
        return map[tagKey] || fallback;
      };

      var safeText = function(v) {
        v = String(v == null ? '' : v);
        if (typeof iljuEscapeHtml === 'function') return iljuEscapeHtml(v);
        return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      var userLabel = safeText((typeof USER_NAME === 'string' && USER_NAME.trim()) ? USER_NAME.trim() : '?ъ슜??);
      var partnerLabel = safeText('?곷?諛?);

      var starElement = {
        '?먮?':'??,'泥쒓린':'紐?,'?쒖뼇':'??,'臾닿끝':'湲?,'泥쒕룞':'??,'?쇱젙':'??,'泥쒕?':'??,'?쒖쓬':'??,
        '?먮옉':'紐?,'嫄곕Ц':'??,'泥쒖긽':'湲?,'泥쒕웾':'??,'移좎궡':'湲?,'?뚭뎔':'??,'怨듦턿':'以묐┰'
      };
      var elemGen = { '紐?:'??, '??:'??, '??:'湲?, '湲?:'??, '??:'紐? };
      var elemCtrl = { '紐?:'??, '??:'??, '??:'??, '??:'湲?, '湲?:'紐? };

      var coreMe = coreTxt(mePal.meng);
      var coreYou = coreTxt(youPal.meng);
      var eMe = starElement[coreMe] || '以묐┰';
      var eYou = starElement[coreYou] || '以묐┰';

      var layer1Bonus = 0;
      var layer1Text = '';
      var tianjiTianliangPair = (coreMe === '泥쒓린' && coreYou === '泥쒕웾') || (coreMe === '泥쒕웾' && coreYou === '泥쒓린');
      if (tianjiTianliangPair) {
        layer1Bonus += 15;
        layer1Text = '泥쒓린(紐?? 泥쒕웾(????留뚮궓? 湲곕낯?곸쑝濡?紐⑷레?좎쓽 湲댁옣 援ъ“吏留? 泥쒕웾??蹂댄샇 湲곗슫??泥쒓린???덈??⑥쓣 ?섎졃?섎뒗 ?쒓컙 媛뺣젰???곷낫 ?쒕꼫吏媛 ?대┰?덈떎. ?깃꺽 ?쒕꼫吏 蹂대꼫??+15?먯씠 諛섏쁺?⑸땲??';
      } else if (eMe === eYou && eMe !== '以묐┰') {
        layer1Bonus += 8;
        layer1Text = '二쇱꽦 ?ㅽ뻾??媛숈? 寃곗쓣 ?뺤꽦??媛먯젙 由щ벉????留욎뒿?덈떎. 異⑸룎蹂대떎 怨듬챸??癒쇱? ?묐룞?섎뒗 援ъ“?낅땲??';
      } else if (elemGen[eMe] === eYou || elemGen[eYou] === eMe) {
        layer1Bonus += 10;
        layer1Text = '?ㅽ뻾???곸깮 援ъ“瑜??대（???쒕줈???깊뼢???먯뿰?ㅻ읇寃?遺곷룍?곷땲?? ?쒖そ??媛뺤젏???ㅻⅨ ?쒖そ??異붿쭊?μ쓣 ?ㅼ썙以띾땲??';
      } else if (elemCtrl[eMe] === eYou || elemCtrl[eYou] === eMe) {
        layer1Bonus += 4;
        layer1Text = '?ㅽ뻾 ?곴레 援ъ“媛 ?쇰? ?덉쑝?? ???곕㈃ 媛덈벑???꾨땲????븷 遺꾩뾽?쇰줈 ?꾪솚?⑸땲?? ?쒕줈???ㅻⅨ 寃곗씠 ?꾩꽦?꾨? ?믪뿬以띾땲??';
      } else {
        layer1Bonus += 6;
        layer1Text = '?ㅽ뻾??吏곸젒 怨듬챸? ?쏀븯吏留? ?깊뼢 李⑥씠瑜?遺꾩뾽?쇰줈 ?ㅺ퀎?섎㈃ ?깆옣 ?꾨젰???댁븘?⑸땲??';
      }

      var traitMap = {
        '泥쒓린':['?좎뿰??,'?뚰넻??],'泥쒕룞':['?좎뿰??,'?뺤꽌?꾩땐'],'?쒖쓬':['怨듦컧??,'?뚰넻??],'嫄곕Ц':['?뚰넻??,'遺꾩꽍??],
        '臾몄갹':['?뚰넻??,'吏?곴탳媛?],'臾멸끝':['?뚰넻??,'媛먯꽦援먮쪟'],'泥쒕웾':['蹂댄샇??,'?덉젙??],'泥쒕?':['?덉젙??,'梨낆엫媛?],
        '泥쒖긽':['洹좏삎媛?,'?뚰넻??],'?먮?':['梨낆엫媛?,'由щ뜑??],'?쒖뼇':['?쒗쁽??,'?ㅽ뻾??],'臾닿끝':['?ㅽ뻾??,'?꾩떎媛?]
      };
      var mergeTraits = function(stars) {
        var t = Object.create(null);
        (stars || []).forEach(function(s){
          (traitMap[s] || []).forEach(function(k){ t[k] = 1; });
        });
        return Object.keys(t);
      };

      var myIdealTraits = mergeTraits((mePal.spouse.main || []).concat(mePal.spouse.aux || []));
      if (!myIdealTraits.length) myIdealTraits = ['?좎뿰??,'?뚰넻??];
      var partnerPersonaTraits = mergeTraits((youPal.meng.main || []).concat(youPal.meng.aux || []).concat(youPal.spouse.main || []));
      var matchedTraits = myIdealTraits.filter(function(t){ return partnerPersonaTraits.indexOf(t) >= 0; });
      var layer2Bonus = Math.min(20, matchedTraits.length * 10);
      var layer2Text = matchedTraits.length
        ? ('?섏쓽 ?댁긽??諛곗슦??肄붾뱶('+myIdealTraits.join('쨌')+')? ?곷? 紐낃턿 肄붾뱶媛 '+matchedTraits.join('쨌')+'?먯꽌 ?뺥빀?⑸땲?? ?대챸??留ㅼ묶 媛?곗젏 +'+layer2Bonus+'?먯씠 ?곸슜?⑸땲??')
        : '?댁긽 諛곗슦??肄붾뱶? ?곷? 紐낃턿 肄붾뱶??吏곸젒 ?뺥빀? ?쏀븯吏留? ??븷 遺꾨떞 ?ㅺ퀎濡?留ㅼ묶瑜좎쓣 ?뚯뼱?щ┫ ???덉뒿?덈떎.';

      var myHwagi = [];
      if (meData && meData.sihuaData) {
        for (var hwStar in meData.sihuaData) {
          if (meData.sihuaData[hwStar] && meData.sihuaData[hwStar].type === '?붽린') {
            myHwagi.push(hwStar);
          }
        }
      }
      myHwagi = uniq(myHwagi);
      var partnerControlStars = uniq((youPal.meng.main || []).concat(youPal.spouse.main || []).concat(youPal.bok.main || []).concat(youPal.meng.aux || []));
      var hwagiControlMap = {
        '臾몄갹':['泥쒕웾','泥쒕?','泥쒖긽','?쒖쓬'],
        '臾멸끝':['泥쒕웾','泥쒕룞','?쒖쓬','?먮?'],
        '?먮옉':['泥쒕?','泥쒕웾','臾닿끝'],
        '嫄곕Ц':['泥쒖긽','泥쒕웾','?먮?']
      };
      var layer3Bonus = 0;
      var layer3Text = '';
      var controlMatched = [];
      myHwagi.forEach(function(hs){
        var ctrls = hwagiControlMap[hs] || ['泥쒕웾','泥쒕?','泥쒖긽'];
        var hit = ctrls.some(function(cs){ return partnerControlStars.indexOf(cs) >= 0; });
        if (hit) controlMatched.push(hs);
      });
      if (controlMatched.length) {
        layer3Bonus = 10;
        layer3Text = '?섏쓽 ?붽린('+controlMatched.join('쨌')+')瑜??곷? 二쇱꽦???꾩땐/?쒖뼱?섎뒗 援ъ“媛 ?뺤씤?⑸땲?? 由ъ뒪??諛⑹뼱 ?먯닔 +10?먯씠 異붽??⑸땲??';
      } else if (myHwagi.length) {
        layer3Bonus = 4;
        layer3Text = '?붽린 吏곸젒 ?곸뇙???쏀븯吏留??곷????덉젙 二쇱꽦???꾩땐留됱쑝濡??묐룞??湲됯꺽??遺뺢눼瑜?留됰뒗 蹂댁젙???덉뒿?덈떎.';
      } else {
        layer3Text = '?붽린 ?뺣젰????븘 由ъ뒪??諛⑹뼱媛 湲곕낯?곸쑝濡??덉젙沅뚯엯?덈떎.';
      }

      var keyPalaces = ['遺泥섍턿','遺遺沅?,'紐낃턿','愿濡앷턿','?щ갚沅?];
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
          ? '23~32???듭떖 蹂怨≪젏???쒕줈 留욌Ъ由щŉ ?몄뿰??媛?띾룄媛 ?ш쾶 ?곸듅?⑸땲?? (?몄뿰 媛뺣룄 +10??'
          : (topOv.st+'~'+topOv.ed+'??援ш컙?먯꽌 '+topOv.meP+'횞'+topOv.youP+' 異뺤씠 ?숆린?붾맗?덈떎. (?몄뿰 媛뺣룄 +10??');
      } else {
        goldenTime = '????듭떖 援ш컙??吏곸젒 以묒꺽? ?쏀븯吏留? 以鍮꾨맂 ?⑹쓽媛 ?덉쑝硫??꾨컲 ?숆린??媛?μ꽦???믪뒿?덈떎.';
      }

      var baseWeighted = Math.round(
        loveScore * 0.30 + marriageScore * 0.25 + friendScore * 0.14 + workScore * 0.18 + businessScore * 0.13
      );
      var layeredBonus = layer1Bonus + layer2Bonus + layer3Bonus + layer4Bonus;
      var overallScore = Math.max(40, Math.min(95, baseWeighted + layeredBonus));

      var rawAvg = Math.round(rawCatRows.reduce(function(sum, r) { return sum + r.rawVal; }, 0) / rawCatRows.length);
      var syncGap = overallScore - rawAvg;
      var catRows = rawCatRows.map(function(r) {
        // ?몃? ?먯닔瑜?醫낇빀?먯닔 ?ㅼ??쇱뿉 留욎텛?? 移댄뀒怨좊━ 媛??곷? ?쒖쐞???좎??쒕떎.
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

      var relationAlias = overallScore >= 80 ? '?꾨꼍???뚰듃?덉떗' : (overallScore <= 70 ? '?깆옣??而ㅽ뵆' : '怨좊????숇컲??);

      var scoreBadge = function(v) {
        var bg = v >= 80 ? 'rgba(74,222,128,0.2)' : (v >= 70 ? 'rgba(96,165,250,0.2)' : 'rgba(245,158,11,0.2)');
        var bd = v >= 80 ? 'rgba(74,222,128,0.6)' : (v >= 70 ? 'rgba(96,165,250,0.6)' : 'rgba(245,158,11,0.6)');
        return '<span style="padding:2px 8px;border-radius:999px;border:1px solid '+bd+';background:'+bg+';font-size:0.78rem;color:#fdf2f8;font-weight:800;">'+v+'??/span>';
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
        + '<div class="zw-pastlife-title">泥쒖긽??湲곕줉???쒓퀬 | Chronos Scroll ?꾩뭅?대툕</div>'
        + '<div class="zw-pastlife-sub">臾댄븳???깆슫 ?쒓퀬?먯꽌 ?ъ꽌 留덈룄?ш? ?뱀떊?먭쾶 ?꾩깮 湲곕줉??嫄대꽪?덈떎. ?ㅻ옒???묓뵾吏???덇꺼吏??곹샎??援먯감?먯쓣 ?곕씪, ???щ엺??湲곗뼲???⑷툑鍮??됲겕濡?源⑥뼱?⑸땲??</div>'
        + '</div>'
        + '<div class="zw-pastlife-main">'
        + '<div class="zw-chronos-scroll">'
        + '<div class="zw-chronos-map">'
        + '<i style="left:14%;top:24%;"></i><i style="left:31%;top:54%;"></i><i style="left:54%;top:34%;"></i><i style="left:74%;top:62%;"></i><i style="left:86%;top:26%;"></i>'
        + '<b style="left:15%;top:26%;width:50px;transform:rotate(38deg);"></b><b style="left:31%;top:55%;width:58px;transform:rotate(-24deg);"></b><b style="left:54%;top:36%;width:52px;transform:rotate(33deg);"></b><b style="left:74%;top:63%;width:36px;transform:rotate(-58deg);"></b><b style="left:31%;top:55%;width:112px;transform:rotate(-6deg);"></b>'
        + '</div>'
        + '<div class="zw-scroll-block"><b>?꾩깮 ?몄뿰 ?좏삎</b>'+pastTypeTitle+'</div>'
        + '<div class="zw-scroll-block"><b>?꾩깮 ?ㅼ썙??/b>'+storyMotifs+'</div>'
        + '<div class="zw-scroll-block"><b>?꾩깮 愿怨?/b>'+pastRelation+'</div>'
        + '<div class="zw-scroll-block"><b>?꾩깮 ?쒕? / ?μ냼</b>'+pastEraPlace+'</div>'
        + '<div class="zw-scroll-block"><b>?꾩깮 ?댁빞湲?/b>'+pastStory+'</div>'
        + '<div class="zw-scroll-block"><b>?대쾲 ?앹뿉?쒖쓽 ?섎?</b>'+pastMeaning+'</div>'
        + '<div class="zw-scroll-block"><b>?대쾲 ??誘몄뀡</b>'+pastMission+'</div>'
        + '<div class="zw-karmic-seals">'
        + '<div class="'+sealOn(pastTypeList.indexOf('?숇챸 ?곗씤??) >= 0)+'"><b>?뵕</b>?숇챸 ?곗씤??br>?鍮?留?遊됱씤</div>'
        + '<div class="'+sealOn(karmicLightHit)+'"><b>??/b>karmic 鍮쏆쓽 ?몄뿰<br>留λ룞?섎뒗 蹂?遊됱씤</div>'
        + '<div class="'+sealOn(pastTypeList.indexOf('蹂댄샇???몄뿰') >= 0)+'"><b>?썳截?/b>蹂댄샇???몄뿰<br>?щ챸???좉컻 遊됱씤</div>'
        + '</div>'
        + '</div>'
        + '<div class="zw-hourglass-wrap">'
        + '<div class="zw-hourglass">'
        + '<div class="zw-hourglass-sand-top" style="height:'+topSandHeight+'px;"></div>'
        + '<div class="zw-hourglass-neck"></div>'
        + '<div class="zw-hourglass-sand-bottom" style="height:'+bottomSandHeight+'px;"></div>'
        + '</div>'
        + '<div class="zw-hourglass-score">'+pastLifeScore+' / 100</div>'
        + '<div class="zw-hourglass-note">?⑷툑 紐⑤옒?????곹샎??br>karmic 梨꾨Т? ?곌껐 媛뺣룄瑜?br>?쒓컙??鍮꾩쑉濡??덇퉩?덈떎.</div>'
        + '</div>'
        + '</div>'
        + '<div class="zw-palace-pillars">'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisMeng)))+'px;"></div><div class="zw-palace-name">紐낃턿 異?(Life)</div><div class="zw-palace-score">'+pastAxisMeng+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisBok)))+'px;"></div><div class="zw-palace-name">蹂듬뜒沅?異?(Fortune)</div><div class="zw-palace-score">'+pastAxisBok+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisSpouse)))+'px;"></div><div class="zw-palace-name">遺遺沅?異?(Spouse)</div><div class="zw-palace-score">'+pastAxisSpouse+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisMove)))+'px;"></div><div class="zw-palace-name">泥쒖씠沅?異?(Transition)</div><div class="zw-palace-score">'+pastAxisMove+'</div></div>'
        + '</div>'
        + '<div class="zw-scroll-block" style="margin-bottom:0;color:#ecdcc1;">吏덉븸沅?異?'+pastAxisIllness+'?먯? 諛곌꼍 ?뚮룞?쇰줈 湲곕줉?섏뼱, 媛먯젙 ?뚮났 ?띾룄? 移대Ⅴ留??뚮え ?⑦꽩??蹂댁“ ?댁꽍?⑸땲??</div>'
        + '</div>'
        + '</div>'
        + '</div>';

      var hasTara = (mePal.spouse.bad.concat(youPal.spouse.bad).indexOf('???) >= 0) || (mePal.meng.bad.concat(youPal.meng.bad).indexOf('???) >= 0);
      var hasMoonchangHwagi = myHwagi.indexOf('臾몄갹') >= 0;
      var warningSignal = hasMoonchangHwagi
        ? '臾몄갹 ?붽린 媛쒖엯 ??留먯쓽 ?섏븰?ㅺ? 移쇰궇泥섎읆 ?꾨떖?섏뼱 ?ъ냼???ㅽ빐媛 ???洹좎뿴濡?踰덉쭏 ???덉뒿?덈떎.'
        : (hasTara
          ? '???媛쒖엯?쇰줈 ??대컢 ?닿툔???듭옣 ?쒗룷, ?쎌냽 ?ㅽ뻾 ?쒖젏)???꾩쟻?섎㈃ 媛먯젙 ?뚮줈媛 ?쎄쾶 怨쇱뿴?⑸땲??'
          : '?됱꽦 ?뺣젰 援ш컙?먯꽌??湲곕?移?誘몄젙?ъ씠 媛덈벑???쒖옉?먯씠 ?⑸땲??');
      var patch1 = hasTara
        ? '??대컢 ?닿툔?⑥씠 蹂댁씠硫?10遺?肄????3以?泥댄겕??硫붿떆吏(?꾩옱?곹깭/?붿껌/?뚮났?쒓컙)瑜?怨좎젙 猷곕줈 ?ъ슜?섏꽭??'
        : '媛덈벑 ?뱀씪 寃곕줎??媛뺤슂?섏? 留먭퀬 24?쒓컙 ???щ????щ’??怨좎젙?섏꽭??';
      var patch2 = hasMoonchangHwagi
        ? '臾몄갹 ?붽린 援ш컙?먮뒗 鍮꾨궃???쒗쁽??湲덉??섍퀬, ?ъ떎 1媛?+ 媛먯젙 1媛?+ ?붿껌 1媛??щ㎎?쇰줈留???뷀븯?몄슂.'
        : '二?1??15遺?愿怨?濡쒓렇(醫뗭븯????1媛??꾩돩????1媛??ㅼ쓬 ?≪뀡 1媛?瑜??⑹쓽???꾩쟻 ?ㅽ빐瑜?李⑤떒?섏꽭??';

      var bestCategory = catRows.slice().sort(function(a,b){ return b.val - a.val; })[0];
      var weakestCategory = catRows.slice().sort(function(a,b){ return a.val - b.val; })[0];

      var conflictTrigger = hasMoonchangHwagi
        ? '臾몄갹 ?붽린 ?좏샇濡??명빐 媛숈? 留먮룄 ?좎뭅濡?쾶 諛쏆븘?ㅼ뿬吏????덉뼱, ?쒗쁽 ?ㅼ씠 媛덈벑???ㅼ슦??珥됰컻?먯씠 ?????덉뒿?덈떎.'
        : (hasTara
          ? '???媛쒖엯?쇰줈 ?듭옣 ?쒗룷쨌?쎌냽 ?ㅽ뻾 ?쒖젏???닿툔?????좊ː 泥닿컧??湲됯꺽????븘吏???⑦꽩???섑??????덉뒿?덈떎.'
          : '?됱꽦 ?뺣젰 援ш컙?먯꽌??湲곕?移?誘몄젙????븷/?쒓컙/?곗꽑?쒖쐞)??諛섎났 異⑸룎???쒖옉?먯씠 ?????덉뒿?덈떎.');

      var conflictScenario = weakestCategory.key + ' ?먯닔(' + weakestCategory.val + '??媛 媛????븘 ??異뺤뿉??媛덈벑 泥닿컧??而ㅼ쭏 ???덉뒿?덈떎. '
        + '?뱁엳 ' + weakestCategory.key + ' 愿???댁뒋媛 諛쒖깮?섎㈃ ?묒? ?섍껄 李⑥씠???꾩쟻?섍린 ?ъ슦誘濡? 湲곗?(?곗꽑?쒖쐞쨌?쒓컙쨌?쒗쁽 諛⑹떇)??癒쇱? ?⑹쓽?섎뒗 寃껋씠 ?덉쟾?⑸땲??';

      outEl.innerHTML = '<div class="zw-compat-result-shell">'
        + '<div style="position:absolute;left:-20px;top:-28px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(251,113,133,0.18),rgba(251,113,133,0));pointer-events:none;"></div>'
        + '<div style="position:absolute;right:-40px;bottom:-55px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(217,70,239,0.14),rgba(217,70,239,0));pointer-events:none;"></div>'
        + '<div class="zw-compat-result-inner">'
        + '<div class="zw-compat-result-head card-content">'
        + '<div class="zw-compat-headline section-title">?뙚 '+userLabel+' x '+partnerLabel+' 沅곹빀 ?덊룷?? "'+relationAlias+'"</div>'
        + '<div class="zw-compat-subline">醫낇빀 ?먯닔 <b class="compatibility-score">'+overallScore+'??/b> 쨌 ?μ젏 ?쒕꼫吏 諛섏쁺</div>'
        + '<div class="zw-compat-meta">沅곹빀 ?⑹궛 洹쇨굅: ?ㅽ뻾/?깆젙 '+layer1Bonus+' + 沅곸쐞 留ㅼ묶 '+layer2Bonus+' + ?ы솕 ?꾩땐 '+layer3Bonus+' + ????숆린??'+layer4Bonus+'</div>'
        + '<div class="zw-compat-meta">?곷? 蹂댁젙 ?쒓컙: '+z2(correctedHour)+':'+z2(correctedMinute)+' 쨌 ?꾩떆: '+cityLabel+'</div>'
        + '</div>'
        + '<div class="zw-compat-core-grid">'
        + '<div class="zw-compat-core-panel">'
        + '<div class="zw-compat-core-title palace-title">?듭떖 ?쒕꼫吏</div>'
        + '<div class="zw-compat-core-text">'
        + '<b>?깃꺽 ?쒕꼫吏:</b> '+layer1Text+'<br>'
        + '<b>?대챸??留ㅼ묶:</b> '+layer2Text+'<br>'
        + '<b>?됱슫???꾩씠:</b> ?곷?? ?④퍡????'+bestCategory.key+' 異뺤씠 媛??媛뺥븯寃??쒖꽦?붾맗?덈떎.'
        + '</div>'
        + '</div>'
        + '<div class="zw-compat-core-panel">'
        + '<div class="zw-compat-core-title palace-title">媛덈벑 ?덈갑 & 議곗쑉</div>'
        + '<div class="zw-compat-core-text">'
        + '<b>二쇱쓽 ?좏샇:</b> '+warningSignal+'<br>'
        + '<b>?⑥젏 湲곕컲 ?몃━嫄?</b> '+conflictTrigger+'<br>'
        + '<b>議곗쑉踰?1:</b> '+patch1+'<br>'
        + '<b>議곗쑉踰?2:</b> '+patch2+'<br>'
        + '<b>痍⑥빟 援ш컙 ?쒕굹由ъ삤:</b> '+conflictScenario
        + (layer3Text ? ('<br><b>?ы솕 ?쒕꼫吏 遺?ㅽ꽣:</b> '+layer3Text) : '')
        + '</div>'
        + '</div>'
        + '</div>'
        + '<details class="zw-compat-ref-details">'
        + '<summary class="zw-compat-ref-summary"><span class="zw-compat-ref-title">?먯닔蹂??댁꽍 ?쇱튂湲?/span><span class="zw-compat-ref-indicator">?닿린/?リ린</span></summary>'
        + '<div class="zw-compat-ref-content">'+guideHtml+'</div>'
        + '</details>'
        + '<details class="zw-compat-ref-details">'
        + '<summary class="zw-compat-ref-summary"><span class="zw-compat-ref-title">?꾩깮 ?몄뿰 由ы룷???쇱튂湲?/span><span class="zw-compat-ref-indicator">?닿린/?リ린</span></summary>'
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
            zwLlm.innerHTML = '<div style="color:#fda4af;font-size:0.85rem;padding:10px;border-radius:10px;border:1px solid rgba(251,113,133,0.35);margin-top:10px;">AI ?꾨＼?꾪듃 紐⑤뱢??遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?덈줈怨좎묠 ??<b>沅곹빀 蹂닿린</b>瑜??ㅼ떆 ?뚮윭 二쇱꽭??</div>';
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
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">沅곹빀 怨꾩궛 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?낅젰媛믪쓣 ?뺤씤?????ㅼ떆 ?쒕룄??二쇱꽭??</div>';
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
              var isBorrowed=usingBorrowedSource || /\(李⑥꽦\)|\b李⑥꽦\b/.test(plain);
              var name=plain
                .replace(/\(李⑥꽦\)/g,'')
                .replace(/?붾줉|?붽텒|?붽낵|?붽린/g,'')
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
          return (list||[]).map(function(n){ return fmtStrength(n, zhi, isBorrowed); }).join(' 쨌 ');
        };
        var getPStars = function(name) {
            var i = pd.palacesByIndex.indexOf(name);
            return i < 0 ? null : pd.stars[i];
        };

        var msRef = {
            '?먮?': { 
                psy: '<b>[?쒖솗怨?由щ뜑??쓽 蹂몃뒫]</b> ?먮???榮ュ쒜??? ?쒖솗(躍앯럨)???곸쭠?섎뒗 蹂꾨줈, ?좎쿇?곸쑝濡?議댁뾼?④낵 怨좊룄??由щ뜑??쓣 媛뽰텛怨??덉뒿?덈떎. 紐낆삁? 泥대㈃??以묒떆?섎ŉ, 二쇰룄?곸쑝濡??곹솴??吏?섑븯怨??섑샇????怨좎쑀???λ젰??洹밸??붾맗?덈떎. 留ㅼ궗???꾨꼍??湲고븯???ъ슜?μ씠 ?덉쑝?? ?먯〈?ъ씠 ?덈Т 媛뺥빐 ??몄쓽 議곗뼵???ｌ? ?딅뒗 ?꾧퀬?④낵 ?낅떒?깆쓣 寃쎄퀎?댁빞 吏꾩젙??吏?꾩옄濡?嫄곕벊?????덉뒿?덈떎.', 
                fin: '<b>[紐낆삁媛 怨?遺瑜?遺瑜대뒗 援ъ“]</b> 紐낆삁? 沅뚯쐞媛 ?믪븘吏덉닔濡??щЪ???먯뿰?ㅻ읇寃??곕씪?ㅻ뒗 ?댁엯?덈떎. ?ш린???깊뼢蹂대떎??議곗쭅 ??吏???곸듅, ?湲곗뾽, ?뺤튂/?됱젙, ?뺤떎???낅┰?곸씤 寃쎌쁺?먮줈 ?섏꽕 ????遺瑜?異뺤쟻?⑸땲?? ?먯궛?섑샇???꾩＜ 蹂댁닔?곸씠硫?????곕웾 遺?숈궛?대굹 釉뚮옖??媛移섍? ?믪? ?뺢퀬???먯궛 ?꾩＜濡?臾살뼱?먮뒗 寃껋씠 媛???좊━?⑸땲??', 
                rel: '<b>[媛뺥븳 梨낆엫媛먭낵 ?꾧꺽??湲곗?]</b> 寃⑹떇怨??덉쐞瑜?以묒떆?섏뿬 ?쎄쾶 ?щ엺?먭쾶 怨곸쓣 ?댁＜吏 ?딆뒿?덈떎. 洹몃윭????踰?諛붿슫?붾━ ?덉뿉 ?ㅼ씤 ???щ엺?먭쾶??媛뺣젰??蹂댄샇 蹂몃뒫怨?梨낆엫媛먯쓣 諛쒗쐶?⑸땲?? ?멸컙愿怨꾨굹 遺遺, 媛議??ъ씠?먯꽌??蹂몄씤???듭젣沅뚯쓣 伊먮젮 ?섎?濡??듭븬?곸씤 ?뚰넻 ?듬줈媛 ?섏? ?딅룄濡??섏떇?곸씤 諛곕젮媛 ?꾩닔?낅땲??', 
                well: '<b>[留뚯꽦 ?쇰줈? ?꾩옣/?뚰솕湲?二쇱쓽]</b> ?꾨꼍??湲고븯硫??듬늻瑜대뒗 ?ㅽ듃?덉뒪 ?볦뿉 ?? 鍮꾩옣 ???뚰솕湲?怨꾪넻 ?쏀솕媛 ??뒿?덈떎. 怨쇰룄??梨낆엫媛먯뿉???ㅻ뒗 ?좉꼍???뚰솕遺덈웾, ?꾧땄?묒쓣 議곗떖?댁빞 ?섎ŉ 紐낆긽怨?媛踰쇱슫 ?곗콉?쇰줈 ?뚯? ?꾩옣 ?ㅼ쐞移섎? ?④퍡 爰쇱＜??由대젆???댁떇???꾩닔?곸엯?덈떎.', 
                time: '<b>[臾대??먯꽌???덉쐞 ?덈뒗 ?뺤옣]</b> 諛뽰쑝濡??섍컝?섎줉, 沅뚯쐞 ?덈뒗 ?섍꼍???몄텧?좎닔濡??좊뱺??洹?몄쓽 ?꾩썝怨??④퍡 紐낅쭩???먯뿰?ㅻ읇寃??볧?吏묐땲?? 媛踰쇱슫 ?대룞蹂대떎??援듭쭅???꾩빟 ?섏뿉 ?吏곸뿬 ?섍꼍???꾨꼍??吏諛고빀?덈떎.' 
            },
            '泥쒓린': { 
                psy: '<b>[鍮꾩긽???먮뇤? 湲고쉷??留덉닠??</b> 吏?쒖쓽 蹂?泥쒓린??鸚⒵찣??? ?먮뇤 ?뚯쟾????⑦엳 鍮좊Ⅴ怨?湲고쉷 諛?泥쒓린 李몃え ?λ젰???곸썡?⑸땲?? ?멸린?ъ쑝濡??ㅻ갑硫댁쓽 吏?앹쓣 ?먭뎄?섎ŉ ?꾧린?묐???媛뺥빀?덈떎. ?ㅻ쭔 ?먮뇤 怨쇰??섎줈 ?명빐 ?앷컖??瑗щ━瑜?臾쇱뼱 ?좉꼍???쎄쾶 ?좎뭅濡쒖썙吏怨? 寃곕떒 吏곸쟾??吏?섏튂寃?留앹꽕?대뒗 湲곗쭏??寃쎄퀎?댁빞 ?⑸땲??', 
                fin: '<b>[吏???먮낯怨??꾩씠?붿뼱???섏쟾]</b> ?≪껜?몃룞?대굹 ?⑥닚 諛섎났蹂대떎??IT, 湲고쉷, ?뚰봽?몄썾?? ?붿옄?? ?먮Ц, ?숇Ц, ?꾨Ц 湲곗닠 ???먮뇤瑜???텇 ?쒖슜?섎뒗 ?뚮옯?쇱뿉???꾩쟾 ?泥?遺덇??ν븳 怨좊?媛媛移섎? 李쎌텧?⑸땲?? ?꾧툑 ?먮쫫??醫뗭븘??利됱떆 ?덈줈??諛곗??대굹 ?ㅻ퉬???ы닾?먰븯???깊뼢?쇰줈, ?뺤떎??湲곗닠怨??먭꺽利??먯껜媛 蹂몄씤???됱깮 ?щЪ?낅땲??', 
                rel: '<b>[吏??援먮쪟瑜??ν븳 媛덈쭩]</b> 媛먯젙?곸씤 ?ъ젙?대굹 ?섏〈蹂대떎?? ?뺣낫? ?쇰━媛 ?곴뎄怨듭쿂???ㅺ???吏?곸씠怨?荑⑦븳 愿怨꾨쭩???좏샇?⑸땲?? ?뺤젣, 移쒓뎄, ?곗씤 愿怨꾩뿉?쒕룄 吏?띿쟻???λ?? ?덈줈???몄????먭레??以????덈뒗 ?щ엺怨??ㅻ옒媛硫?援ъ냽??洹밸룄濡??쇳븯?ㅻ뒗 ?깊뼢???쎈땲??', 
                well: '<b>[?뚯떊寃?怨쇱뿴 諛??먯쑉?좉꼍怨?蹂댄샇]</b> ?뚮? ?쒖떆???ъ? ?딄쾶 ?묐룞?쒗궎誘濡?遺덈㈃利? 留뚯꽦 ?먰넻, ?좉꼍 ?좎빟 ???먯쑉?좉꼍怨??쇰줈???덈? 痍⑥빟?⑸땲?? ?붾텋??媛?湲곕뒫 ?쏀솕??議곗떖?댁빞 ?섎?濡??섎㈃ 由щ벉???뺣낫? ?꾩옄湲곌린瑜?硫由ы븯???꾩쟾???ㅽ봽?쇱씤 ?댁떇???앸챸?좎엯?덈떎.', 
                time: '<b>[??룞?곸씤 ?대룞??遺瑜대뒗 湲고쉶]</b> 蹂몄쭏 ?먯껜媛 ?吏곸씠?????????깊뼢?낅땲?? ?댁쭅, 異쒖옣, 嫄곗＜吏 蹂?????섍꼍??吏?띿쟻 蹂?붿? ??? ?대룞 ?띿뿉???ㅽ엳??踰덈쑊?대뒗 吏곴?怨??뚰뙆援щ? 李얠븘?낅땲?? ?뺤껜??怨노낫????룞?곸쑝濡?臾대?瑜?諛붽? ??湲곕쭑???댁씠 ?대┰?덈떎.' 
            },
            '?쒖뼇': { 
                psy: '<b>[?以묒쓽 ?ㅽ룷?몃씪?댄듃? 援쏀엳吏 ?딅뒗 湲곗긽]</b> 紐낆꽦怨?諛쒖궛??蹂??쒖뼇??鸚ら쇋??? ?쒕젰 ?먮꼫吏媛 ?섏튂怨?怨듬챸?뺣??섎ŉ ?몄젣??臾대━??留??욎뿉 ?쒓린瑜?利먭퉩?덈떎. ?붿쭅?섍퀬 ?ㅻ걹???놁쑝硫??쎌옄瑜??뺣뒗 由щ뜑??씠 媛뺥빀?덈떎. ??怨쇰룄?섍쾶 ?ㅼ??쇱쓣 踰뚯씠嫄곕굹 ?먯떊???대뀗???⑥뿉寃??쒖뒾?놁씠 媛뺤슂?섎뒗 ?? 泥대㈃???쎈ℓ???ㅼ냽???볦튂??寃껋쓣 二쇱쓽?댁빞 ?⑸땲??', 
                fin: '<b>[紐낆꽦???덉쓣 吏?섑븯??嫄곕?????</b> ?뚯꽦???댁씡蹂대떎 ?⑤뱾 ?욎뿉 ?쒕윭?섎뒗 ??諛⑹넚, 援먯쑁, ?뺤튂, 怨듦났?쒕퉬?? 濡쒕퉬)?먯꽌 ??깃났?⑸땲?? ?대쫫媛?紐낆꽦)??蹂몄씤??媛?????꾧툑 李쎌텧 ?섎떒?낅땲?? ?? 踰덈쭔???쒖썝?섍쾶 ?⑥뿉寃?踰좏?嫄곕굹 ?쇰굹???뚮퉬瑜??섍린 ?ъ슦誘濡?媛뺤젣?곸씤 ?곴툑 ?듭옣?대굹 源먭퉸??湲덉쟾 ?뚰듃?덇? ?놁뿉 ?덉뼱???⑸땲??', 
                rel: '<b>[遺덊????뚯떊怨??뚮え ?ъ씠???쒕젅留?</b> 二쇰????쇱＜???곕쑜???먮꼫吏濡??몄젣???몃㎘???볤퀬 ?곕Ⅴ???꾧뎔??留롮뒿?덈떎. ?뺤옉 諛뽰뿉?쒕뒗 ?곸썒?꾩뿉??媛?뺤씠??諛李⑸맂 諛곗슦???뚰듃?덉뿉寃뚮뒗 ?먮꼫吏瑜????⑤쾭???쇨낀?섍굅???낅떒?곸씤 紐⑥뒿??蹂댁씪 ???덇린???꾩＜ ?몃???媛議?諛곕젮媛 理쒖슦??怨쇱젣?낅땲??', 
                well: '<b>[?ы삁愿 ???쒖뼱? ?덇낵 吏덊솚]</b> ?먮꼫吏瑜???컻?곸쑝濡?諛뽰쑝濡??뚯쭊?섎?濡?湲됯꺽???덉븬 蹂?? 怨좎뿴, ?ъ옣 諛??ы삁愿怨꾩쓽 臾대━瑜?媛??議곗떖?댁빞 ?⑸땲?? ?깊븯???닿린瑜??대━湲??꾪븳 留묒? 臾???랬? ?쒕젰 ??? ?덇뎄 嫄댁“ ???덇낵(?? 吏덊솚?먮룄 ?쇱젅 ?덈갑 ?섑샇媛 ?꾩닔?낅땲??', 
                time: '<b>[援?꼍???섎굹?쒕뒗 ?볦? ?쒕룞??</b> ?됱깮 ?쒕룞 諛섍꼍??嫄곕??섎ŉ, ?쇨컙 臾대?蹂대떎???? 醫곸? 怨⑤ぉ蹂대떎???멸뎅?대굹 ??꽑 湲곌?怨쇱쓽 ??? 議곗씤, ?뱀? 湲濡쒕쾶???뚯뀥 ?ㅽ듃?뚰겕 ????뺤옣?먯꽌 留ㅼ슦 李щ????깃낵? 寃곌낵瑜?嫄곕㉧伊〓땲??' 
            },
            '臾닿끝': { 
                psy: '<b>[?뚯쭊?섎뒗 ?κ뎔?댁옄 ?됱쿋???밸???</b> ?⑦샇??寃곕떒?κ낵 ?ㅽ뻾??愿?ν븯???됰룞 諛??щЪ??蹂꾩엯?덈떎. 留ㅼ궗 吏곸꽕?곸씠怨?媛뺤쭅????踰??쒖옉???쇱? ?붾뱾由??놁씠 ?뚰뙆?섎뒗 ?앹떖???쒖솗?낅땲?? ?ㅻ쭔 ?듯넻?깆씠 ?곴퀬 李④컩怨??щТ?곸씤 ?쒕룄濡???멸낵 ??묒쓣 紐???鍮싳뼱吏??怨좊룆媛? 怨좊┰??媛??媛뺣젰??寃쎄퀎?댁빞 吏꾩젙???밸━瑜?伊〓땲??', 
                fin: '<b>[嫄곗튇 臾대?瑜?吏諛고븯??媛뺣젰???꾧툑 李쎌텧??</b> ?щЪ??紐⑥쑝?ㅻ뒗 ?꾧컖怨??ㅼ쿇?μ씠 理쒓퀬議곗뿉 ?ы빀?덈떎. ?덉젙??吏곸옣蹂대떎 湲덉쑖, 援곌꼍, ????쒖“, 湲덉냽/湲곌퀎瑜?鍮꾩쫰?덉뒪 ??嫄곗튌嫄곕굹 ?고봽???곸뿭?먯꽌 ?꾩껌??異붿쭊?μ쓣 ?듯빐 嫄곕????먭툑??援대┰?덈떎. 湲덉쟾???ㅼ냽??理쒓퀬?대굹, ?ш린???쒗깢二쇱쓽媛 諛쒕룞?섎㈃ ?먮낯??諛뺤궡?????덉쑝???덉젙???뺥깭(湲덇눼, 怨좎젙?먯궛)濡?遺瑜?臾띠뼱?먯꽭??', 
                rel: '<b>[?쒗댆 ?좎젙 ?쒗쁽, 洹몃윭???뺢퀬??吏꾩떖]</b> 留먭낵 ?좎젙 ?쒗쁽??臾대슍?앺븯怨?六ｋ빰???곗씤?대굹 ?먮??먭쾶 ?ㅼ젙?⑥쓣 ?꾨떖?섍린 ??⑦엳 ?대졄?듬땲?? 媛먯젙 ?꾨줈蹂대떎???꾩떎??臾몄젣 ?닿껐???꾩＜濡??뺣떎 ?ㅽ빐瑜??????덉쑝?? ??踰??숇㏏??留브퀬 ?먭린 ?щ엺?대씪怨??ш릿 ?먯뿉寃??꾩쟻?쇰줈 ?ъ쭅??諛깆뒪??湲곕뒫???꾨꼍 ?섑뻾?⑸땲??', 
                well: '<b>[洹쇨낏寃⑷퀎 諛?留밸젹???몄긽 二쇱쓽]</b> ?吏곸엫???⑦샇?섍퀬 嫄곗튌??堉? 愿?? 移섏븘 遺???먯긽?대굹 臾쇰━?곸씤 ?몄긽(?섏닠, ?숈긽) ???좎껜??湲곌퀎??留덈え ?꾩긽????⑦엳 痍⑥빟?⑸땲?? ?먯? ?명씉湲?諛⑹뼱, 洹몃━怨??덉쭏湲??ㅽ듃?덉묶 ?붾쾿留뚯씠 ?μ닔??鍮꾧껐?낅땲??', 
                time: '<b>[?꾨━?덉쓣 ?꾪븳 ?꾪닾???뺤옣]</b> 臾댁쓽誘명븳 ?좊엺蹂대떎???덇낵 ?ㅼ씡?대씪???꾨꼍??寃곌낵臾쇱쓣 ?곸랬?섍린 ?꾪빐?쒕쭔 ?몃?濡?怨쇱옣?섍쾶 ?됰룞 諛섍꼍???볧옓?덈떎. ?꾩＜ 移섎??섍퀬 ?꾩떎?곸씤 ?덈쾿怨?鍮꾩쫰?덉뒪 留덉씤???섏뿉 諛뽰쑝濡??섍? 留됰????ㅼ쭏 ?대뱷??戮묒뒿?덈떎.' 
            },
            '泥쒕룞': { 
                psy: '<b>[?됲솕? 遺?쒕윭???媛吏??숈쿇媛]</b> ?쒖닔?섍퀬 媛먯꽦?곸씠硫?媛덈벑 援щ룄瑜?洹밸룄濡??뚰뵾?섎젮???좎닚???됲솕二쇱쓽?먯엯?덈떎. ?ㅼ젙?ㅺ컧?섍퀬 怨듦컧?μ씠 ?곗뼱?섎굹 ?ш컖???ㅽ듃?덉뒪 援ш컙???쇳븯怨??꾩떎???덉＜?섎젮???듭꽦???쎈땲?? 移섏뿴???ъ?? 洹쇱꽦??寃곗뿬?섍린 留ㅼ슦 ?쎈떎???묐궇??寃???뚯쑀?덉쑝誘濡?紐⑺몴?????吏묒슂?⑥씠 泥④??섏뼱???⑸땲??', 
                fin: '<b>[?꾨쫫?듦퀬 ?몄븞??援ъ뿭?먯꽌??異뺤옱]</b> ?대쾶???쎌쑁媛뺤떇 寃쎌웳 臾대????곹샎???낆빟怨?媛숈뒿?덈떎. 蹂듭?, 援먯쑁, ?붿떇?? 誘몄슜, ?덉닠, ?쒕퉬?? ?곷떞 ?щ━, ?먮쭅 ?곗뾽 ??遺?쒕읇怨?由대젆?ㅽ븳 怨녹뿉????몄뿉寃??몄븞?⑥쓣 ?쒓났?섎ŉ ?ㅽ엳???덉젙??遺瑜??먯뿰?ㅻ읇寃??띾뱷?섎뒗 ?怨좊궃 癒뱀쓣 蹂듭씠 ?먰뀅?듬땲??', 
                rel: '<b>[?ъ슜?곸씠??留브퀬 ?딆쓬??痍⑥빟??愿怨?</b> 泥쒖꽦?곸쑝濡???몄쓣 蹂대벉怨??댄빐??二쇱뼱 ??멸?怨?留덉같??嫄곗쓽 ?녾퀬 ???몃났???곕쫭?덈떎. 諛섎㈃ ?곗쑀遺?⑦빐 ?딆뼱?댁빞 ??遺덈웾???몄뿰???뚮젮?ㅻ땲嫄곕굹, ?곗븷?먯꽌 ?덈Т 媛먯꽦?곸쑝濡??섏〈?섏뿬 ?쇰???鍮좎????⑦샇??遺議깆쓣 寃쎄퀎?댁빞 ?⑸땲??', 
                well: '<b>[鍮꾨쭔 ??ъ쬆?꾧뎔怨??좎옣/鍮꾨눊 ?섑샇]</b> 媛??議곗떖?댁빞 ??寃껋? ?쒕룞??遺議?諛???떇/?쇱떇???몄븞?⑥뿉 ?곕Ⅸ 湲됱냽??泥댁쨷 利앷??낅땲?? 湲곗큹 ??щ웾????븘吏湲??ъ썙 ?덈떦/?밸눊 ????ъ꽦 吏덊솚怨??좎옣, 諛⑷킅 鍮꾨눊 湲곕뒫 ?좏눜媛 二쇱슂 ?곸떊?몄엯?덈떎. 二쇨린?곸쑝濡????鍮쇰뒗 ?ъ뒪 猷⑦떞???닿린瑜??뚭쾶 ?⑸땲??', 
                time: '<b>[?쒗뭾???쏆쓣 ?ㅻ뒗 ?먯뿰?ㅻ윭????빐]</b> 臾댁?留됱???媛뺤젣 媛쒖쿃蹂대떎???꾩옱 二쇱뼱吏?臾대????섍꼍 ?먮쫫???먯뿰?ㅻ읇寃??숉솕?섏뿬 ?몄븞???몃? ?ㅽ듃?뚰겕瑜??먯쭊?곸쑝濡??볧옓?덈떎. ??꽑 ?닿뎅 ???섍꼍?먯꽌???덈? ?곸쓽瑜??ъ? ?딄퀬 鍮좊Ⅴ寃??명봽?쇱뿉 ?덉갑?섎뒗 ??蹂듬뜒???뚯쑀?먯엯?덈떎.' 
            },
            '?쇱젙': { 
                psy: '<b>[移섎????쒖뼱?κ낵 ??ㅻⅤ??留ㅻ젰??留덉뒪??</b> ?덉튂媛 洹밸룄濡?鍮좊Ⅴ怨??곹솴 ?먯꽭瑜??꾨꼍???μ븙?섎뒗 ?덉닠??媛먭컖怨?移섎???怨좊룄 ?듭젣?μ쓣 戮먮깄?덈떎. 寃됱? ?붾젮?섍퀬 ?몃????곗뼱?섎굹, ?대㈃???먯〈???곸쿂???섏떖??洹밸룄濡??덈??섎ŉ 吏덊닾?ъ씠 留롮뒿?덈떎. 媛먯젙 湲곕났怨?????듭젣 ?뺢뎄瑜??ㅼ뒪?ㅼ빞 ??컻?곸씤 ?щ뒫??鍮쏅궔?덈떎.', 
                fin: '<b>[李⑤퀎?붾맂 ?怨좊궃 媛먭컖???щЪ濡?移섑솚]</b> ?됰쾾???붽툒?곸씠???⑥“濡쒖슫 ?낅Т????덈? ?욎씪 ???놁뒿?덈떎. ?뱀닔 湲곕쾿, ?멸탳 留덉??? ?곗삁怨? ?뷀꽣?뚯씤癒쇳듃, ?덉닠, ?꾨━?쒖꽌 ?꾨Ц吏????⑤뱾???됰궡 紐??대뒗 ?뷀뀒?쇰줈 嫄곕???遺媛瑜??녹뒿?덈떎. ?꾧툑??蹂쇰씪?몃━?곌? ?꾩껌 ?щ땲, ?덉쟾 ?먯궛?대굹 誘우쓣 留뚰븳 ?섑샇?먯뿉寃??덉쓣 留↔꺼 ?뚯궛???쇳븯?몄슂.', 
                rel: '<b>[移섎챸???≪씤?κ낵 ?쏀엳???꾪솕(旅껇뒻)]</b> 媛뺣젹???≪씤?μ쓣 吏? ??몄쓽 ?쒖꽑怨??댁꽦 ?쇱씤???붾젮?섍쾶 ?쏀엳怨??멸린媛 ??컻?⑸땲?? 洹몃윭???쒓린? 吏덊닾, 移섏젙, 媛먯젙 ?뚮え?꾧낵 援ъ꽕???됱깮 ?곕씪遺숆린 ?덈Т???ъ슦??愿怨꾩뿉 ?덉뼱 ?됱쿋?섍퀬 泥좎????좉툔湲곗? 源⑤걮??鍮꾨? ?좎?瑜??앸챸泥섎읆 ?ш꺼???⑸땲??', 
                well: '<b>[?덈쪟 援먮? 諛?誘쇨컧??硫댁뿭/?뚮젅瑜닿린]</b> ??洹밸룄???덈? ?듭젣 ?ㅼ쐞移섎? 耳쒕몢湲곗뿉 ?쇨? ?곹빐吏??怨좏삁??諛??ъ옣怨?援먮???二쇱쓽?댁빞 ?⑸땲?? ?ㅽ듃?덉뒪?깆쑝濡??ㅻ컻?섎뒗 ?????녿뒗 ?쇰? ?몃윭釉? ?몃Ⅴ紐ъ꽦 ?쇱쬆??議곌린??李⑤떒?섍퀬 ?덇???留묎쾶 ?섎뒗 ?앹씠?붾쾿??嫄닿컯???대┰?덈떎.', 
                time: '<b>[?붾젮?섍퀬 ??룞?곸씤 ?몃? 臾대? ?μ븙??</b> ??꽑 ?몃? 蹂?붿뿉 ??⑦엳 ?λ룞?곸씠怨??섍꼍?먯꽌 湲곌? 二쎌? ?딆뒿?덈떎. 臾대????섍?硫?鍮좊Ⅴ寃??щ엺??留덉쓬??議곗쥌?섍퀬 臾대━??議곗쭅???듭떖?쇰줈 ?⑤컯???좎삤瑜대뒗 臾섑븳 ?μ븙?μ씠 ?ㅽ엳???대룞???쒓린???ш쾶 ?묐룞?⑸땲??' 
            },
            '泥쒕?': { 
                psy: '<b>[?ъ쭅???ъ슜?κ낵 ?붿깉瑜?援ъ텞?섎뒗 ?섑샇??</b> 留뚮Ъ???대뒗 ?됰꼮??李쎄퀬瑜?媛??留덉쓬???덇렇?쎄퀬 移⑥갑?⑸땲?? 嫄곕Ц ?뚮룞媛 ???곸떊蹂대떎 泥좎???寃利앸맂 ?덉젙?깆쓣 以묒떆?섎ŉ ?곹솴??蹂댁닔?곸쑝濡??뚯뼱?덈뒗 蹂댁뒪 湲곗쭏?낅땲?? 洹몃윭???덈줈???꾩떊?대굹 蹂?붾? 湲고뵾?섎뒗 洹밸떒????묒쟻 ?덉씪?⑥씠??瑗곕??깆쓣 諛섎뱶???쒓굅?댁빞 ?쒕????ㅻ뼥?댁?吏 ?딆뒿?덈떎.', 
                fin: '<b>[?먯궛 吏?ㅺ린???앺뙋?뺤씠??遺?숈쓽 ?ы뀒??媛뺤옄]</b> 怨듦꺽?곸씤 媛쒖갹???꾨땲???대? ?ㅼ뼱??嫄곕????щЪ??蹂듬━泥섎읆 遺?由ш퀬 吏耳쒕궡??諛⑹뼱?μ씠 ?곗＜ 理쒓컯?낅땲?? ?꾪뿕 ?ъ옄蹂대떎 ?뺢퀬??遺?숈궛 ?꾨?, ?곕웾 梨꾧텒, ?먯궛 ?섑샇 湲곗뾽, ?뚭퀎, 吏二쇱궗 ?뚰듃?먯꽌 嫄곕????먮낯??泥좊꼍泥섎읆 蹂댄샇?섎ŉ ?뚮??먭? ?⑸땲??', 
                rel: '<b>[臾대━???꾨꼍???덉떇泥섏씠???좊뱺??湲곕뫁]</b> ?좎슜怨?臾대뜕?⑥쓣 諛뷀깢?쇰줈 二쇰????쇰궃泥???븷???⑸땲?? ?쇨?移쒖쿃?대굹 二쇰??몄쓣 ?꾩＜ ?좊뱺??蹂대벉?듬땲?? ??蹂몄씤???留?媛뺤“?섎떎 ?딄굅??吏꾩랬?곸씤 ?쒕룄瑜??섎뒗 ?먮?/諛곗슦?먯???????λ꼍???앷만 ???덉쑝???대┛ ?ъ슜?μ쓣 ?섏떇?곸쑝濡??ㅼ썙???⑸땲??', 
                well: '<b>[鍮꾩쐞??怨쇰??섏? 泥댁쨷 怨쇱엵??泥좎???諛⑹뼱]</b> ??????湲곗슫???ㅻ텇??癒멸툑怨??덉뼱 鍮꾩옣, ?꾩옣 諛?蹂듬? ?뚰솕怨꾪넻??媛??痍⑥빟?⑸땲?? ??癒밴퀬 ???먮ŉ ?ㅽ듃?덉뒪瑜??몃궡?섎떎 蹂대땲 ?댁옣 鍮꾨쭔, ?밸눊 ???깆씤蹂?吏덊솚???ш퀬 ?????덉뒿?덈떎. ?뚯떇怨?? ?섎━???깆궛 ???吏곸씠??寃껋씠 ?뺤떎???뚰뙆援ъ엯?덈떎.', 
                time: '<b>[?먯떊留뚯쓽 援녠굔??踰좎씠?ㅼ틺???뺤옣]</b> ?ㅼ뒪濡?湲됰??섎뒗 蹂?숈씠???좊옉???ш쾶 ?좏샇?섏? ?딆뒿?덈떎. ????섍꼍 蹂???쒖뿉??泥좎????뺣낫 怨꾩궛怨??덉쟾??留덉튇 ?? 蹂몄씤?먭쾶 ?뺣젹???깃턿 吏꾨쾿??留덈젴??梨꾨줈留??댄뀒?대툝????린??怨좊룄??蹂댁닔???덉젙 ?대룞 ?ㅽ뀦??諛잛뒿?덈떎.' 
            },
            '?쒖쓬': { 
                psy: '<b>[?щ튆 ?꾨옒 ?꾨꼍二쇱쓽????쭔怨??덈???</b> 源딆닕???ъ깋?섎ŉ ?곹솴???듭떖???꾨쫫?듦쾶 轅곕슟??臾명븰???щ??덉쓣 ?怨좊궗?듬땲?? ?깃꺽??議곗슜?섍퀬 ?④굔?섎굹, 留ㅼ궗 寃곕꼍二쇱쓽???꾨꼍?깆쓣 ?붽뎄???쇰줈?꾧? ?ы빀?덈떎. 媛먯꽦???덈Т ?щ젮 ??몄쓽 吏?곸뿉 ?곸쿂瑜??ㅻ옯?숈븞 ?덉쑝硫? 寃곕떒?μ씠 ?⑥뼱吏???곗쑀遺?⑦븿?????몃뵒罹≪엯?덈떎.', 
                fin: '<b>[??됱꽦????湲곗슫???듯븳 議곗슜??異뺤옱]</b> ?뚮룄移섎뒗 蹂???먯궛蹂대떎???? ?좎?, 遺?숈궛 媛쒕컻 ?ъ옄, ?명뀒由ъ뼱 ??????? 愿?⑤맂 ?먮낯?ъ뿉???곗쭅?섍쾶 ?щЪ??遺덈┰?덈떎. ?뚮Ц ?놁씠 議곗슜??遺瑜?紐⑥쑝???諛???뚮??먯쓽 湲곗슫?쇰줈 誘몄슜, ?쇰?, ?덉닠, 酉고떚 ?곗뾽?먯꽌 ?뱀쑀???ъ꽭?⑥쑝濡?留됰???遺瑜??대９?덈떎.', 
                rel: '<b>[?諛?섍퀬 源딆뼱吏???꾨씪?대퉿??援먮쪟 吏??</b> ?쒕걚?ъ슫 ?ㅼ닔???ш탳蹂대떎??洹뱀냼?섏????덈걟??媛먯젙???곹샎??援먭컧???덈??곸쑝濡??좏샇?⑸땲?? 吏怨좎??쒗븯怨?濡쒕㎤?깊븯?? ?뺤옉 ?먯떊???덈Т ?믪? ?꾨꼍???ｋ?濡??곷?瑜??щ떎媛 ?ㅻ쭩?섎㈃ 留덉쓬??臾몄쓣 誘몃젴 ?놁씠 ?⑥젅?대쾭由щ뒗 李④????寃쎄퀎?섏꽭??', 
                well: '<b>[?곗슱媛? 遺덈㈃利?諛?鍮꾨눊/?몃Ⅴ紐??쏀솕 議곗쑉]</b> ?뺤떊?? ?뺤꽌??吏꾪룺???덉젙???≪껜 嫄닿컯??紐낆쨪?낅땲?? ?붿옍???ㅽ듃?덉뒪 ?몄텧 ???좉꼍??遺덈㈃, 留뚯꽦 ?꾩옣?μ븷 諛??좎옣/諛⑷킅 ?앹떇怨꾩쓽 吏꾩븸 遺議?吏덊솚??踰덉쭛?덈떎. ?곕쑜??李? ?뉖튆???щ퓤 諛쏅뒗 ?쇱긽?앺솢???뺤떊???낆냼瑜??꾨꼍???대룆?⑸땲??', 
                time: '<b>[?쇨컙怨???μ뿉?쒖쓽 ?뺤꽌???먮쭅怨?鍮꾩긽]</b> ?ъ쓽 ?띿꽦?대?濡??듭닕??怨좏뼢蹂대떎???꾩＜ 癒??吏, ?꾩쟾????꽑 ?멸뎅 怨듦컙?대굹 二쇰줈 諛??쒓컙???쒖빟?섎뒗 ?낅Т ???댁깋??蹂諛⑹쑝濡??좊궗?????щ━???됲솕瑜??산퀬 ??쇱슫 ?덉닠?? ?곸뾽???щ뒫???쒖쭩 ?대깄?덈떎.' 
            },
            '?먮옉': { 
                psy: '<b>[?앹뾾???멸린?ш낵 ?ㅼ옱?ㅻ뒫???좎풄???먰뿕媛]</b> ?몄긽怨?吏?앹뿉 ????멸린?ъ씠 ??컻?곸씠硫? ?꾧뎄???湲덉꽭 ?욎씠??移쒗솕?κ낵 ?ъ튂?덈뒗 ?쇰㎤??쓽 ?媛?낅땲?? ?꾧린?묐????곗뼱???꾧린 ?뚰뙆???ν븯?? ?앷퉴吏 ?꾩닔???대뒗 ?몃궡?ъ씠??吏꾩쨷?⑥? ?ш쾶 鍮덉빟?⑸땲?? ?≪껜?? 臾쇱쭏??苡뚮씫??源딄쾶 鍮좎졇?쒕뒗 ?꾪뿕??留ㅻ젰??媛議뚯뒿?덈떎.', 
                fin: '<b>[?묎컼怨?臾대?媛 遺瑜대뒗 嫄곕? ?꾧툑 ?뚯씠?꾨씪??</b> 洹쒓꺽?붾릺怨??ロ엺 ?щТ?ㅼ? 臾대뜡?낅땲?? 留덉??? 酉고떚, ?대깽??湲고쉷, ?붾젮???덉껜??諛??뚰떚, ?붿떇???꾩옣 諛붾떏?먯꽌 蹂몄씤???쇰? ?묐젹?쒗궎硫???媛???띾룄濡?留됰????꾧툑??紐⑥쓭?덈떎. ????좏씎怨??ъ튂濡??먭툑???쒖떇媛꾩뿉 ?뱀븘?대┫ ???덉쑝???ъ궛沅뚯? 諛섎뱶??臾띠뼱?먯꽭??', 
                rel: '<b>[?ㅽ듃?뚰겕???듭씠??移섎챸?곸씤 ?ㅼ틪??吏꾩썝吏]</b> 紐⑥엫?먯꽌 ?덈? 鍮쇰넃?????녿뒗 遺꾩쐞湲?硫붿씠而? ?덈굹 ?섎쭖? ?ㅼ퀜 媛???몄뿰怨?移섎챸???댁꽦??瑗ъ씠湲???긽?댁뼱 移섏젙, ?좎젙 遺뺢눼 ?ㅼ틪?ㅼ쓽 ?源껋씠 ?섍린 ?쒖씪 ?쎌뒿?덈떎. ?뺤? ?몃㎘??臾댁옄鍮꾪븯寃??꾨젮?닿퀬 源딄퀬 ?뺤젣?????щ엺怨쇱쓽 遺遺 ?몄뿰 ?ㅼ?湲곌? ?앸챸?낅땲??', 
                well: '<b>[臾대━??媛??? 怨쇰???諛??낆냼 諛곗텧 寃쎄퀎]</b> ?????놁씠 ?吏곸씠???쒕룞 諛섍꼍怨??좏씎, ?쇰줈 ?꾩쟻 ?깆쑝濡?媛꾩옣怨??좎옣??湲곕낯 ?대룆 ?꾪꽣媛 ?꾩쟾??留앷?吏??寃껋쓣 ???쒖쐞濡??곕젮?댁빞 ?⑸땲?? ?낆냼? ?뚯＜瑜?以꾩씠怨?泥좎???媛꾩쓣 由ъ뀑?섎뒗 ?뷀넚???섎㈃ ?닿?瑜??꾨꼍??吏?ㅼ떗?쒖삤.', 
                time: '<b>[?먯쑀濡?쾶 湲곕룞?섎ŉ 臾댁닔???먯쓣 ?щ뒗 ?됰낫]</b> 泥쒖꽦??諛⑸옉??湲곗쭏??而??쒓납???덉＜瑜?紐삵븯怨??ㅼ씠?대??섍쾶 援?꼍怨?吏??쓣 ?섎굹??땲?? ?꾪? ??꽑 ???臾대??먯꽌????硫곗튌 留뚯뿉 嫄곕Ъ 議곕젰?먯? ?덉쐢 李ъ뒪瑜??뚯뼱?대뒗 ?대쭏?대쭏?섍퀬 湲곕쭑???곸쓳?κ낵 ?ш탳?μ쓣 蹂댁쑀?섍퀬 ?덉뒿?덈떎.' 
            },
            '嫄곕Ц': { 
                psy: '<b>[?듭같???붿꽦(?쀦삜)?댁옄 ?ъ삤???쇰━ ?꾨Ц媛]</b> ?꾩긽???ъ옣留?蹂댁? ?딄퀬 洹??대㈃???덉젏怨??⑺듃瑜?愿묒쟻?쇰줈 轅곕슟??遺꾩꽍怨??쇰━?μ쓽 理쒓퀬 沅뚯쐞?먯엯?덈떎. ?먭뎄?ъ씠 媛뺥빐 ??遺꾩빞 ?뱀텧???꾨Ц媛濡??곕슍 ?쒕굹, 留ㅼ궗 ??몄쓣 ?섏떖?섏뿬 李④???留먮줈 二쇰????곸쿂瑜??닿퀬 援ъ꽕??留뚮뱶???쎌젏???쎈땲??', 
                fin: '<b>[?덈━???몄뼱? 吏?앹쑝濡??볦븘 ?щ━??留됰???遺]</b> 蹂?? 援먯쑁, 而⑥꽕???먮Ц, 鍮꾪룊, 以묎컻, 吏???ъ궛, 遺꾩꽍 ???좎뭅濡쒖슫 吏?앷낵 ?(留?瑜??뺣㈃?쇰줈 ?쒖슜???먭? ??븷??????湲덉쟾?댁씠 嫄곕??섍쾶 ?곗쭛?덈떎. ?쇱웳怨?踰뺤쟻 愿??留덉같???ш퀬 ?ㅻ땲湲곗뿉 吏?멸낵???숈뾽?대굹 湲덉쟾 蹂댁쬆? ?됱깮???덈? 湲덇린?낅땲??', 
                rel: '<b>[李④????쇰━? ?④굅??異⑹쭅?⑥쓽 諛섏쟾 ?ㅽ럺?몃읆]</b> ??몄쓽 寃곗젏??吏?곹븯湲?醫뗭븘???ㅽ댘怨?怨좊┰???먯큹?섍린 ?쎌뒿?덈떎. 洹몃윭??嫄곕Ц??洹뱀떖???섏떖 ?꾪꽣瑜??リ퀬 ?좊ː瑜??덇?諛쏆? ?щ엺?먭쾶???섎━? ?뚯떊???꾩씠肄섏씠 ?⑸땲?? 臾댁“嫄??⑥쓽 ?섍껄??留욎옣援ъ퀜二쇰뒗 ?덈젴留뚯씠 ?몃났 ?곸듅???듭떖?낅땲??', 
                well: '<b>[?명씉湲?諛⑹뼱留?遺뺢눼? ?덈????꾩옣 ?몃윭釉?</b> ?좉꼍??臾댁쿃 ?덈━???명썑?? 湲곌?吏, 援ш컯 ??紐⑷낵 ??愿??吏덊솚???됱깮 議곗떖?댁빞 ?⑸땲?? 諛뽰쑝濡??고듃由ъ? 紐삵븳 ?뚯쓽???ㅽ듃?덉뒪媛 怨좎뒪????꾩옣怨꾪넻??吏곴꺽?瑜??좊젮 ?좉꼍???뚰솕遺덈웾???좊컻?섎땲 留덉쓬????鍮꾩슦??紐낆긽??猷⑦떞?뷀븯??떆??', 
                time: '<b>[?곷쭑????κ낵 ?대갑???띿뿉?쒖쓽 ?湲곕쭔??</b> ?몄븞?섍퀬 ?듭닕???먭린 援ъ뿭蹂대떎 ?뚯쇅???멸낸 臾대?, ?몄뼱議곗감 ??꽑 ?댁쇅 臾대? ??媛???댁쭏?곸씤 ?섍꼍 ?띿뿉??怨좊궃???リ퀬 踰덈쑊?대뒗 蹂몄씤留뚯쓽 ?ㅻ젰???ъ??놁씠 利앸챸???대ŉ 嫄곕???紐낆꽦???곸랬?⑸땲??' 
            },
            '泥쒖긽': { 
                psy: '<b>[?먯튃怨??댄??깆쓣 寃몃퉬???몃젴??議곗쑉??</b> 臾대━??怨듭젙?④낵 泥대㈃??媛???뚯쨷?섍쾶 ?앷컖?섎뒗 ?④굔???섑삊?ъ쓽 ?뚯쑀?먯엯?덈떎. 二쇰? ?섍꼍???붾윭?뚯???寃껋쓣 ?먯삤?섎뒗 ?⑥젙?⑥씠 ?덉뒿?덈떎. ?낆옄?곸씤 ?뚭꺽????λ낫?ㅻ뒗 ?곗뼱??泥쒓린???쒗룷?? ?섑샇 鍮꾩꽌?ㅼ옣??梨낅Т瑜?留≪쓣 ???꾨꼍?④낵 ?덉젙媛먯씠 愿묒콈瑜??낅땲??', 
                fin: '<b>[議곗쭅怨??좊ː瑜?諛뷀깢?쇰줈 ??怨좎젙?곸씤 ?쇳듉???щТ]</b> 臾대━???꾨컯???곹뻾?꾨? 嫄곕??섍퀬, 怨듦났湲곌?, ?섑샇吏? 踰뺤젙 遺?? 怨좉툒 ?쒕퉬???꾪긽 ????낅Т?먯꽌 議곗쭅怨??ы쉶???꾪깂??蹂댁옣 ?꾨옒 ?붾뱾由??녿뒗 ?먰꽣??遺瑜?援ъ텞?⑸땲?? 泥대㈃怨?媛먭컖??以묒떆???⑥뀡/酉고떚 愿???ъ뾽怨쇰룄 沅곹빀??李곕뼞?대ŉ ?앸줉?????띾??⑸땲??', 
                rel: '<b>[???섏? ?ㅼ??뽮낵 ?볦? 臾대━???????몄쓳]</b> ??몄쓽 ?깊븳 ?ъ젙????紐곕씪???섏? 紐삵븯???좏븳 ?깆젙?쇰줈, ?좊ː媛먭낵 ?멸린瑜??낆감吏?⑸땲?? ?섏?留??딆엫?놁씠 諛?ㅼ삤????몄쓽 遺?곸씠???由??쒕챸???쒕룞??嫄몄? 紐삵빐 ?ш컖???ш린瑜??뱁븷 ???덉쑝誘濡?洹밸룄濡??댁꽦?곸씠怨??⑦샇??嫄곗젅 ?ㅽ궗???꾩닔濡??ъ뼱?먯뼱???⑸땲??', 
                well: '<b>[泥대㈃??臾대꼫吏???쇰? 諛??대텇鍮꾧퀎 吏덊솚 寃쎄퀎]</b> ?몄쟻???꾨쫫?ㅼ????먯긽?쒗궎???쇰? ?먮쭑 吏덊솚, ?몃Ⅴ紐ъ꽦 ?쇱쬆, ?뚮젅瑜닿린 諛섏쓳??移섎챸?곸씤 硫섑깉 ?寃⑹쓣 ?낆뒿?덈떎. ?대뒗 洹밸룄??湲댁옣??????좎껜 蹂대났?대?濡??쇰?? ?몃Ⅴ紐?諛몃윴?ㅻ? ?섎룎由щ뒗 ?묒쭏???댁떇/?섎텇 ??랬 ?붾쾿??瑗?梨숆린?몄슂.', 
                time: '<b>[怨듭쟻紐낅텇怨?嫄곕? ?⑥껜 ?댁씡???몄듅?섎뒗 ?덉쟾 ?대룞]</b> 1李⑥썝?곸씤 ?닿린??紐⑹쟻蹂대떎???몄젣????議곗쭅, ?⑥껜瑜??꾪븳 怨듬Т???뚭껄?대굹 紐낅텇???대걣怨??ъ쭅?섍쾶 ?몃?濡?吏꾩텧?⑸땲?? 源붾걫???몃え? ?좎슜??臾닿린濡???꽑 臾대? 怨녠납?먯꽌 ?꾨꼍??洹?몃뱾怨??묐젰 ?깃턿 吏꾨쾿 援ъ텞???대쨪?낅땲??' 
            },
            '泥쒕웾': { 
                psy: '<b>[?꾧린瑜??닿껐?섍퀬 ?먯튃??以?섑븯???ъ슜???ㅼ듅]</b> ?딆? ?섏씠?먮룄 怨좊룄???몃젴?④낵 ?뺤떊???ъ슜?μ씠 肉쒖뼱???섏? 二쇰? ?щ엺?ㅼ쓽 臾몄젣瑜??붿꽑?댁꽌 ?닿껐?⑸땲?? ???ъ븰??鍮쀪꺼?대뒗 援ъ썝??湲곗슫???덉뒿?덈떎. 洹몃윭???듯넻???쒕줈??怨좎??앺븳 ?좊퉬 ?깊뼢怨??쀬꽭? 瑗곕? 留덉씤?쒕줈 ?딆?痢듭씠???먯쑀遺꾨갑???몃?? 遺덊넻???ъ?媛 留ㅼ슦 ?믪뒿?덈떎.', 
                fin: '<b>[?쒖씤(域삡볶)???듯빐 ??꽕?곸쑝濡?紐곕젮?쒕뒗 湲덉쟾??</b> 遺?뱁븳 ?뷀뻾?대굹 ?ш린媛 ?욎씠硫?洹??덉? ?꾨꼍??利앸컻?⑸땲?? ????앸챸???ㅻ（???섑븰 蹂닿굔, ?щ━移섎즺, 醫낃탳 ?쒖쓽怨? 媛먯같/?ъ젙 湲곌?, 蹂듭? 蹂댄뿕 ????몄쓽 怨좊궃???닿껐?섍퀬 吏덉꽌瑜?諛붾줈?〓뒗 ?낅Т瑜??섎㈃ 洹??됲뙋怨?紐낆삁媛 ?꾩껌??沅뚮젰怨??щЪ濡???컻?곸쑝濡??ㅻ뵲?쇱샃?덈떎.', 
                rel: '<b>[?꾩뾼 ?덈뒗 ?ㅼ듅??湲곕뫁 ??븷怨?洹밴컯???쀬궗???몃났]</b> ?ㅻ텇???대Ⅸ?ㅻ읇怨?誘우쓬吏곹븳 ?쒕룄濡??좊같???ㅼ듅 寃⑹쓽 硫섑넗, ?쀬꽑 ?곸궗?ㅼ뿉寃??꾧꺽?곸씤 ?꾩썝怨?諛쒗긽???대걣?대궡???몃났 援ъ“?낅땲?? 諛섎?濡??꾨옯?щ엺?대굹 ?고븯?먭쾶???ㅺ탳? ?덉닔瑜????以꾩씠怨??껊뒗 ?쇨뎬??寃쎌껌???곗뒿?섎㈃ 理쒓퀬??吏?꾩옄媛 ?⑸땲??', 
                well: '<b>[泥쒖슦?좎“???앹〈 媛뺤슫怨??뚰솕湲?諛고꽣由ъ쓽 ?좏눜]</b> 二쎌쓣 蹂묒씠??遺덊뻾???쇳븯??湲곗씠??媛뺤슫??遺숈뼱, 蹂묐쭏媛 ?덉뼱??洹뱀쟻?쇰줈 ?뚯깮?⑸땲?? 洹몃윭??肄붿뼱 湲곕뫁??鍮꾩쐞/?뚰솕 蹂듬????좎껜 湲곕낯 ?먮꼫吏媛 ?쎄쾶 ?쇱컢 ?숈뼱 ?명썑?섎뒗 ?꾩긽???덉쑝誘濡???紐몄쓣 ?ν엳硫?湲곕젰 媛뺥솕瑜??좎??섎뒗 蹂댁뼇 ?듦????묒옱?섏떗?쒖삤.', 
                time: '<b>[?щ궃 援ы샇? 媛먯같???ν븳 ?밸떦??援ъ썝?먯쟻 沅ㅻ룄]</b> ?⑥닚 ?좏씎???꾪븳 ?ы뻾蹂대떒 臾몄젣 ?닿껐, 媛먯같 ?꾨Т, 援ы샇, ?뚭껄???꾪빐 湲곌컯???≪쑝??媛곸?濡?臾듭쭅?섍쾶 ?좊굹???몃? ?대룞???뱀꽑?낅땲?? ??κ낵 媛앹???怨좎깮 ?앹뿉 寃곌뎅 ?됲뙋???묒쓣 ?볦쑝硫??섏씠媛 ?ㅼ닔濡??몃뀈 臾대???紐낅쭩???붿슧 ?깅??댁쭛?덈떎.' 
            },
            '移좎궡': { 
                psy: '<b>[?꾪뿕??利먭린怨???묒쓣 遺?섏뼱 踰꾨━??臾댁쟻??留뱀옣]</b> 泥좊몢泥좊????닿린? ?낅┰?? ??踰?紐⑺몴瑜??뺥븯硫??쒖꽑?대굹 怨좊룆??媛먯닔?섍퀬 ?뚯쭊?섎뒗 ?꾩껌????뙆 ?뚰뙆?μ쓽 ?뚯쑀?? ?쒓퀎瑜??レ뼱 踰꾨━?? 諛섎?濡???몄쓽 ?ㅼ닔瑜?臾댁옄鍮꾪븯寃??⑥즲?섎뒗 留ㅼ꽌???묐갚 ?쇰━ ?꾩쭛???쒖뼱?섏? 紐삵븯硫??꾨컲遺??移섎챸??怨좊┰怨??곴뎔???섎윭?몄씠寃??⑸땲??', 
                fin: '<b>[留밸젹???띿쟾?띻껐, ?붿뿼 ?띿쓽 ??룞??蹂???щ젰 踰좏똿]</b> 議곗슜?섍퀬 ?몄븞???쒕쪟 ?됱젙? ?곹샎??媛먯삦?낅땲?? ?꾩껌???꾪뿕 嫄곕Ц ?뚮룞??臾대? ?뱀닔 援곌꼍李?怨듬Т, 踰ㅼ쿂 ?ъ뾽??理쒖쟾?? 嫄곕? 怨듯븰, 以묒옣鍮?????몄씠 湲고뵾?섎뒗 ?대쾶??臾대??먯꽌 ?⑤쾲???뚯쭊??嫄곕?瑜?李쎌텧?⑸땲?? 留됰????곸듅 ?섎씫??濡ㅻ윭肄붿뒪?곕? ?쇳븯湲??꾪빐 ?섏엯湲덉쓣 ?덈? ??鍮좎???遺?숈궛 ???덉쟾?먯궛??諛곗튂?댁빞 ?꾪솚???놁뒿?덈떎.', 
                rel: '<b>[?⑥뭡??踰좎뼱踰꾨━???뚰넻, 洹몃윭??吏꾩젙??留뱀슦 蹂댄샇]</b> 媛?앹씠???꾨?瑜??쒖씪 泥숆껐?섏뿬 留덉같怨꾩닔媛 ??? 理쒓컯 ??깂湲됱엯?덈떎. ?곗씤, 移쒖쿃?먭쾶 ?붿씤???뺣룄??留ㅼ꽌???⑺듃 吏?곸쭏濡??ъ옣???꾨젮?낅땲?? 洹몃윭???쒕쾲 ?쇰? ?섎늿 ???щ엺, ?먭린媛 嫄곕몦 理쒖륫洹??뚰듃?덉뿉寃뚮뒗 紐⑹닲留덉? 諛⑺뙣留됱씠 ?섏뼱二쇰뒗 洹뱁븳???④굅???섎━瑜?吏耳곗뒿?덈떎.', 
                well: '<b>[湲덉냽 湲곌퀎? ?붿뿼 ??異⑸룎, 堉?洹쇨낏寃?遺뺢눼 二쇱쓽]</b> ?좎뭅濡쒖슫 ?노뜦?댁? ?깃툒??遺덉쓽 ?몄옄媛 援먯감?섏뿬 以묒옣鍮?異⑸룎, ?먮룞李??諛뺤긽, ?섏닠 諛?怨⑥젅 ?ш퀬 ?꾪뿕???몄깮 ?꾨컲????긽 洹쇱젒 ?湲?以묒엯?덈떎. ?꾪닾?곸씤 ?명씉???먰솢???깃턿 吏꾨쾿??議곌린 怨좉컝?섎땲 ?붽?? 李몄꽑 ??由대젆??泥댁“???섎（ 理쒖냼 30遺?臾댁“嫄??ъ옄?섏떗?쒖삤.', 
                time: '<b>[???꾩껜瑜?媛뺤젣濡?媛덉븘?롫뒗 ?뚭꺽?곸씤 ?덈컮轅??대룞 ?ㅽ뀦]</b> ?대룞?대굹 ?곸뿭 ?꾪솚 ?ㅽ뀦 ?먯껜媛 ?ㅻ??ㅻ? ?대쨪吏??踰뺤씠 ?놁쑝硫? ?⑤컯??吏?뺤?臾쇨낵 ?섍꼍 紐⑤몢瑜???뙆?섎뒗 ?앹쓽 珥덇컯???댁쭅, ?댁＜ ?대룞?μ쓣 蹂댁뿬二쇱뼱 ?꾨Т寃껊룄 ?녿뒗 泥숇컯??臾대????덊삁?⑥떊?쇰줈 苑귦? 源껊컻??瑗쎌븘踰꾨┰?덈떎.' 
            },
            '?뚭뎔': { 
                psy: '<b>[?꾩쟾???뚭눼 ??紐⑤뱺 嫄?諛깆? 肄붾뵫?섎뒗 誘몄튇 ?좊큺??</b> 怨좎갑?붾맂 遺??洹쒖젣???듬떟??怨쇨굅 吏덉꽌瑜??⑸궔?섏? 紐삵븯怨?堉쏆냽源뚯? 諛뺤궡 ?????덈줈??洹몃┝??泥섏쓬遺??洹몃젮 ?ｋ뒗 ?뚭눼??李쎌“?깆쓽 1?몄옄. 洹몃윭??釉뚮젅?댄겕 ?μ튂媛 ?ы엳 留앷????덉뼱 遺꾨끂 議곗젅 ?ㅽ뙣? ??踰뚮젮 ?볤퀬 ?섏뒿 紐??섎뒗 理쒖븙??湲곕났 嫄곕Ц ?뚮룞, 洹밸떒二쇱쓽瑜?遊됱씤?댁빞 ?ы쉶??嫄곕Ъ???⑸땲??', 
                fin: '<b>[洹밸떒 嫄곕Ц ?뚮룞留?怨⑤씪 ?ㅼ씠?뚮뒗 ?덉깉 ?먮낯??釉붾옓?]</b> ?곕컯?곕컯 ?섏삤??遊됯툒怨??덉쟾吏?μ쓽 猷곗? ?뚭뎔???λ젰???덈㈇?쒗궢?덈떎. ?꾩쟾???뚭꺽???ш린議?李쎌뾽, ?ш굔異?泥좉굅 ?좊ぉ?? ?뱀닔 ?덉닠怨?媛숈? ?쇰?怨?臾댁＜怨듭궛?먯꽌 ?ㅽ엳????＜?섎ŉ ?덉쓣 ?≪엯?⑸땲?? 踰꾨뒗 ?섏씡怨?源⑥졇?섍???吏異??뚮퉬??李⑥씠媛 媛먮떦 遺덇? ?섏??대?濡??????μ튂??????꾩엫 遊됱씤???몄깮 ?덈? ?먯튃?낅땲??', 
                rel: '<b>[媛먯젙??洹뱁븳??濡ㅻ윭肄붿뒪??諛??뚭꺽??愿怨?遺뺢눼????</b> ?щ엺怨쇱쓽 ?꾪꽣媛 源⑥졇 ?덉뼱 留밸ぉ?곸쑝濡????щ옉???곗뼱?ㅼ뿀?ㅺ? 媛李??놁씠 誘몄썙?섍퀬 利앹삤?섎뒗 媛먯젙 利앺룺 ??＜媛 ??⑦빀?덈떎. ?곗븷???ъ뾽 ?⑹옉???먯떊???댁젙??紐쎈븙 ?ㅼ씠諛뺤븘 ?곷?媛 ?먮젮????꾩＜??洹밸떒???덉쑝??臾댁“嫄?釉뚮젅?댄겕 ?붿썝 ??븷???댁쨪 ?뚰븯瑜대갑 媛숈? 臾대뜕???곗씤???몄깮 ?숇컲?먯뿉 ?꾩닔 ?곸닚??議곌굔?낅땲??', 
                well: '<b>[?대텇鍮?吏吏꾧낵 ?섎텇 ?앹떇湲??깃턿 吏꾨쾿 理쒖븙 諛⑹쟾]</b> ?앸챸?μ씤 ?섎텇??吏꾩븸???쒖닚媛꾩뿉 ?쒗솢 ?쒖썙???뚮え?쒗궢?덈떎. ?곕씪???몃Ⅴ紐??대텇鍮꾩? 諛⑷킅, ?붾줈/?먭턿 ?앹떇湲?湲곕컲 泥닿퀎 ?곕즺 ?깊겕媛 ??컻?곸쑝濡?諛⑹쟾, 留덈퉬?섎뒗 移섎챸?곸쓣 ?꾩＜ ?쎄쾶 留욎뒿?덈떎. ?먯쿇 遊됱뇙??諛고꽣由?異⑹쟾???꾨꼍 怨좊┰怨??몃Ⅴ紐??댁뼇 ?붾쾿??留??쒖쫵 ?꾩슂?⑸땲??', 
                time: '<b>[二쇨굅/吏곷Т??臾댁옄鍮꾪븳 ?듬떒??꺽??沅ㅻ룄 ?댄깉]</b> ?닿낵 ????쒕룞??湲곕났?? ?몄깮 臾대?瑜?洹몄빞留먮줈 諛붾떎?먯꽌 ?곗쑝濡??낆뼱踰꾨━???뚮룄泥섎읆 ??踰덉뿉 ?섎ぐ?꾩묩?덈떎. 蹂몄씤 ?ㅼ뒪濡쒕룄 吏猷⑦븳 ?뺣㎘??源⑤젮怨??먯쓽?곸쑝濡??꾨꼍???댁쭏???댁쇅 臾대???誘몄???理쒖떊 怨듬쾿 ?곸뿭?쇰줈 臾댁옄鍮꾪븳 ?ㅼ??쇱쓽 ?꾩빟???좏깮?섎ŉ 洹?嫄곗튇 諛붾엺 ?꾩뿉???ㅽ엳???덉떇???먮굧?덈떎.' 
            }
        };

        var emptyDesc = {
            psy: '<b>[?щ챸?섍퀬 臾댄븳???좎뿰???먯븘???꾪솕吏]</b> 紐낃턿??二쇨??섎뒗 蹂꾩씠 ?녿뒗 <b>怨듦턿(令뷴?)</b>???곹깭?낅땲?? ?먯떊留뚯쓽 援녹뼱?덈뒗 ?좎엯寃ъ씠???λ꼍???놁뼱 臾댄븳???≪닔?μ쓣 吏?붿뒿?덈떎. ??몄쓽 ?됯퉼怨?留욎???沅??沅????먮꼫吏 ?먮쫫???쒕룄 100% ?ㅽ?吏泥섎읆 諛쏆븘?ㅼ씠硫?移대찞?덉삩泥섎읆 蹂?섑븯????⑦븳 泥섏꽭 ?λ젰怨?議고솕濡쒖????댁븘媛???됲솕 ?좎????몄옱?낅땲??',
            fin: '<b>[?곹솴 ?뺣젹???듯빀 ?먯궛 ?ы듃?대━??李쎌“??</b> ?ㅼ쭅 ?섎굹??怨좎젙???섏씡 梨꾨꼸??癒몃Ъ吏 ?딆뒿?덈떎. ?뚮룄移섎뒗 ?몄긽 ?몃젋?쒖쓽 以묒떖, ?듯빀 ?좎궛?낆씠??媛???먭툑??紐곕━????대컢???ㅼ틪?섏뿬, ?먯궛 援щ룄? ?뚯씠?꾨씪?몄쓽 ?됯퉼???덈∼寃??명똿??踰꾨━??蹂??異뺤옱 ?λ젰??諛쒗쐶?⑸땲??',
            rel: '<b>[?몃텋?몃? ?뱀뿬踰꾨┛ ?곗＜ 理쒓컯 ?ъ슜???ш탳留?</b> ?먯떊留뚯쓽 ?명삊?섍퀬 怨좎쭛?ㅻ윭??媛먯젙??湲곗???遺?쒕읇寃?吏?뚯졇 ?덉뒿?덈떎. ?뚮Ц???곷??섍린 猿꾨걚?ъ슫 ?곴뎔?대굹 洹밸떒??湲곗슫??肉쒕뒗 ??몄쓣 留뚮궇吏?쇰룄 ?곹솴??留욎떠 議고솕濡?쾶 ?뱀뿬?낅땲??',
            well: '<b>[??몄쓽 ?먮꼫吏瑜?吏곹넻?쇰줈 留욌뒗 怨좉컧???≪닔泥댁쭏]</b> ?좎껜 泥댁쭏 ?먯껜媛 ?곹븳 怨듦린???됯린 媛?앺븳 ?ㅽ듃?덉뒪 遺꾩쐞湲???二쇰? ?먮꼫吏瑜??꾪꽣 ?놁씠 鍮⑥븘?ㅼ씠???쎌젏???앷퉩?덈떎. ?곕씪??媛??留묒? ?먯뿰 ?섍꼍, 醫뗭? ?щ엺???띿뿉?쒖쓽 ?앺솢??嫄닿컯 諛깆떊?낅땲??',
            time: '<b>[?쒖빟???좎쓣 ?꾩삁 利앸컻?쒗궎??臾댄븳??臾대? ?뺤옣]</b> ?대룞怨??댁쭅??紐⑤뱺 ?쒖빟??泥섏쓬遺???섎?媛 ?녿뒗 ?대젮?덈뒗 臾댄븳 鍮?怨듦컙?낅땲?? ?대뵒濡좉? ?댁＜?대룄 ?먯떊???뚯냽??臾명솕???꾨꼍???곸쓳 吏꾪솕?섍퀬 ?꾪? ?덈줈???ㅽ럺?몃읆???됱콈瑜?李щ??섍쾶 援ш??⑸땲??'
        };

        var theme = 'psy';
        var themeTitle = ' [?怨좊궃 ?щ━/?깊뼢] 肄붿뼱 ?붿쭊 ?댁꽍';
        
        if (['遺泥섍턿','?뺤젣沅?,'?몃났沅?,'?먮?沅?,'遺紐④턿'].includes(pName)) {
            theme = 'rel';
            themeTitle = ' [愿怨??ㅽ듃?뚰겕] ?뚯뀥 諛??몄뿰 ?댁꽍';
        } else if (['愿濡앷턿','?щ갚沅?,'?꾪깮沅?].includes(pName)) {
            theme = 'fin';
            themeTitle = ' [吏꾨줈? 寃쎌젣] ?щТ 諛?吏곸뾽 ?댁꽍';
        } else if (['泥쒖씠沅?].includes(pName)) {
            theme = 'time';
            themeTitle = ' [?몄깮???먮쫫] ???臾대? 諛?蹂???댁꽍';
        } else if (['吏덉븸沅?,'蹂듬뜒沅?].includes(pName)) {
            theme = 'well';
            themeTitle = ' [嫄닿컯] ?ъ떊 ?덉젙???댁꽍';
        }

  var mainStMeta = extractMainMeta(getPStars(pName));
  var mainSt = mainStMeta.map(function(m){ return m.name; });
        var badSt = extractBad(getPStars(pName));
        var auxSt = extractAux(getPStars(pName));

        var dTitle = zwDisplayPalaceName(pName);
        if (ZHI_LIST[idx] === pd.meng && pName !== '紐낃턿') dTitle = '紐낃턿: ' + dTitle;
        if (ZHI_LIST[idx] === pd.shen) dTitle = dTitle + ' (?좉턿)';

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
          ? '<span style="color:#FFD700;font-weight:900;">' + mainCleanMeta.map(function(m){ return fmtStrength(m.name, ZHI_LIST[idx], m.isBorrowed) + (m.isBorrowed ? ' <span style="color:#facc15;font-size:0.74rem">(李⑥꽦)</span>' : ''); }).join(' 쨌 ') + '</span>'
          : '<span style="color:#888;font-style:italic">怨듦턿(令뷴?)</span>';
        var auxJoin = auxClean.length ? fmtListWithStrength(auxClean, ZHI_LIST[idx], false) : '?놁쓬';
        var badJoin = badClean.length ? fmtListWithStrength(badClean, ZHI_LIST[idx], false) : '?놁쓬';
        var palaceBrief = ZW_GUNG_BRIEF[pName] || ZW_GUNG_DEF[pName] || '?대떦 沅곸쓽 ?먮쫫???뺤씤?섏꽭??';

        var sec1 = '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">' +
          '<h2 style="color: #D8B4FE; font-size: 1.2rem; margin-top: 0;">?뿺截?[?뱀떊??鍮꾩텛??蹂꾩쓽 吏??</h2>' +
          '<ul style="line-height: 1.85; margin: 0; padding-left: 20px; font-size:0.9rem;">' +
            '<li><b>議고쉶 沅곸쐞:</b> ' + dTitle + '</li>' +
            '<li><b>沅곸쐞 ?댁꽍 珥덉젏:</b> ' + palaceBrief + '</li>' +
            '<li><b>二쇰룄 二쇱꽦:</b> ' + stHtml + '</li>' +
            '<li><b>李⑥꽦 ?곸슜 ?щ?:</b> ' + (borrowedMain.length ? ('?곸슜 ('+borrowedMain.join(' 쨌 ')+')') : '誘몄쟻??(?먯꽦 以묒떖)') + '</li>' +
            '<li><b>湲몄꽦/?됱꽦 遺꾪룷:</b> ' + auxJoin + ' / ' + badJoin + '</li>' +
          '</ul>' +
        '</div>';

        var sec2 = '<div style="margin-bottom:20px;background:#0f0f1a;border:1px solid rgba(139,92,246,0.35);border-radius:10px;overflow:hidden">'
          + '<div style="padding:10px 14px;background:linear-gradient(135deg,rgba(88,28,220,0.45),rgba(30,12,60,0.7))">'
          + '<span style="color:#c084fc;font-weight:900;font-size:0.95rem">?뱤 ?먮??먯닔 12沅??ъ링 遺꾩꽍 ?붿빟</span>'
          + '</div>'
          + buildZwSummaryTableHtml(pd)
          + '</div>';

        var curDaHan = (pd.daHan && pd.daHan[idx]) ? pd.daHan[idx] : "?????놁쓬";
        var curSihua = [];
        if (pd.sihuaData) {
          for (var shName in pd.sihuaData) {
            var shObj = pd.sihuaData[shName];
            if (shObj && shObj.palaceIdx === idx) curSihua.push({ star: shName, type: shObj.type });
          }
        }
        var hasHwagi = curSihua.some(function(s){ return s.type === '?붽린'; });
        var hasHwarok = curSihua.some(function(s){ return s.type === '?붾줉'; });
        var hasHwakwon = curSihua.some(function(s){ return s.type === '?붽텒'; });
        var hasHwakwa = curSihua.some(function(s){ return s.type === '?붽낵'; });

        var goodAuxStars = ['泥쒓눼','泥쒖썡','醫뚮낫','?고븘','臾몄갹','臾멸끝','?뱀〈','泥쒕쭏'];
        var curGoodAux = auxSt.filter(function(s){ return goodAuxStars.indexOf(s) >= 0; });

        var coreLaw = '';
        if (mainSt.length > 0) {
          var coreMain = mainSt.slice(0, 2).join(' 쨌 ');
          var coreKw = ZW_STAR_KW[mainSt[0]] || mainSt[0];
          coreLaw = '<b>二쇱꽦踰?</b> ' + coreMain + ' 以묒떖 ??쒖쑝濡? <b>' + coreKw + '</b> ?뚮쭏媛 ?ш굔??以묒떖異뺤씠 ?⑸땲??';
          if (mainStMeta.some(function(m){ return m.isBorrowed; })) {
            coreLaw += ' <span style="color:#facc15">(李⑥꽦 李⑥슜沅? ??臾??믠뿃(??, ?????믠뼯(??, ?????믠뼰(由?)</span>';
          }
        } else {
          coreLaw = '<b>怨듦턿踰?</b> 怨듦턿 ??쒖? ?沅??섍꼍 蹂?섏쓽 ?곹뼢???щ?濡? 怨좎젙 泥쒓린蹂대떎 ?곹솴 ??묐젰???깊뙣瑜?媛由낅땲??';
        }

        var sihuaText = curSihua.length
          ? '<b>?ы솕踰?</b> ' + curSihua.map(function(s){ return s.star + ' ' + s.type; }).join(' 쨌 ')
          : '<b>?ы솕踰?</b> ??沅곸뿉??媛뺥븳 ?ы솕 吏곸젒 ?묒슜???쏀빐 湲곕낯湲곗? 猷⑦떞???깃낵瑜?醫뚯슦?⑸땲??';

        var goodPoint = '';
        if (hasHwarok || hasHwakwa || curGoodAux.length > 0) {
          goodPoint = '洹?맞룸챸?댟룹꽦怨??뚯닔 ?먮쫫???댁븘?⑸땲?? 臾몄꽌/?됲뙋/異붿쿇 ?ㅽ듃?뚰겕瑜??쒖슜?섎㈃ ?ㅼ씡 ?꾪솚??鍮좊쫭?덈떎.';
        } else if (hasHwakwon || mainSt.length > 0) {
          goodPoint = '二쇰룄沅뚯쓣 ?≪쓣?섎줉 ?댁씠 ?대┰?덈떎. ?곗꽑?쒖쐞瑜?紐낇솗???먭퀬 ??異뺤쓣 源딄쾶 諛硫?寃곌낵媛 ?⑸땲??';
        } else {
          goodPoint = '蹂???곸쓳???먯껜媛 ?μ젏?낅땲?? ?좎뿰???좏깮怨???대컢 議곗젅??蹂듭쓣 ?ㅼ썎?덈떎.';
        }

        var cautionPoint = '';
        if (hasHwagi || badSt.length > 0) {
          cautionPoint = '?붽린/?됱꽦 ?곹뼢?쇰줈 留먯떎?샕룰퀎???꾨씫쨌怨쇱냽 寃곗젙?먯꽌 ?먯떎???섍린 ?쎌뒿?덈떎. 媛먯젙??寃곕떒怨?臾대━???뺤옣? 湲덈Ъ?낅땲??';
        } else {
          cautionPoint = '???됱쓽 ?뺣컯? ?쏀븯吏留? 諛⑹떖?쇰줈 ?명븳 猷⑦떞 遺뺢눼媛 湲고쉶瑜??볦튂寃?留뚮벊?덈떎. 袁몄??⑥쓣 ?좎??섏꽭??';
        }

        var actionTip = '';
        if (hasHwagi) {
          actionTip = '以묒슂 怨꾩빟? 2以?寃?? 湲덉쟾? 遺꾪븷 吏묓뻾, ?멸컙愿怨꾨뒗 "湲곕줉+?뺤씤" ?먯튃?쇰줈 ???먯떎??以꾩씠?몄슂.';
        } else if (hasHwarok || hasHwakwon || hasHwakwa) {
          actionTip = '?대쾲 ??쒖쓽 ?ㅼ썙???щЪ쨌沅뚰븳쨌紐낆삁)瑜???媛吏 紐⑺몴濡??섎졃???ㅽ뻾?섎㈃ 泥닿컧 ?깃낵媛 ?ш쾶 ?⑸땲??';
        } else {
          actionTip = '???⑥쐞 泥댄겕?ъ씤?몃? ?뺥빐 ?묒? ?깆랬瑜??꾩쟻?섎㈃ ?꾨컲 ?댁꽭媛 ?덉젙?곸쑝濡??곸듅?⑸땲??';
        }

        // Persona???대┃ 沅곸씠 ?꾨땶 紐낅컲 ?꾩껜(12沅? 吏묎퀎濡?怨좎젙 ?곗텧?쒕떎.
        var brightnessWeight = function(level){
          var map = { myo: 5.0, wang: 4.2, ri: 3.3, han: 2.4, heum: 1.5 };
          return map[level] || 3.0;
        };
        var personaStarScore = Object.create(null);
        var personaAuxPool = [];
        var personaBadPool = [];
        var personaBorrowedPool = [];
        var personaSihuaCnt = { '?붾줉':0, '?붽텒':0, '?붽낵':0, '?붽린':0 };

        for (var pIdx=0; pIdx<12; pIdx++) {
          var pZhi = ZHI_LIST[pIdx];
          var pNameAll = pd.palacesByIndex[pIdx] || '';
          var pStars = pd.stars[pIdx] || {main:[],aux:[],bad:[],borrowedMain:[]};
          var pMainMeta = extractMainMeta(pStars);

          var pWeight = 1.0;
          if (pNameAll === '紐낃턿') pWeight += 1.8;
          if (pNameAll === '蹂듬뜒沅?) pWeight += 1.0;
          if (pNameAll === '泥쒖씠沅?) pWeight += 0.8;
          if (pNameAll === '愿濡앷턿') pWeight += 0.6;
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
        var leadKeyword = leadMain ? (ZW_STAR_KW[leadMain] || (leadMain + ' 以묒떖 ?깊뼢')) : '怨듦턿 湲곕컲 ?좎뿰 ?곸쓳 ?깊뼢';
        var majorStarsLabel = sortedPersonaStars.length ? sortedPersonaStars.slice(0,3).join(' 쨌 ') : '怨듦턿(令뷴?)';

        var auxUnique = uniqueList(personaAuxPool);
        var badUnique = uniqueList(personaBadPool);
        var borrowedUnique = uniqueList(personaBorrowedPool);
        var auxLabel = auxUnique.length ? auxUnique.join(' 쨌 ') : '蹂댁“ 湲몄꽦 ?쏀븿';
        var badLabel = badUnique.length ? badUnique.join(' 쨌 ') : '?됱꽦 ?뺣젰 ?쏀븿';

        var relationMood = badUnique.length >= 3
          ? '?좊퀎???좊ː? 寃쎄퀎 以묒떖??愿怨??댄뻾'
          : (auxUnique.length >= 3 ? '?묐젰怨??곹샇??以묒떖??愿怨??댄뻾' : '?곹솴 ?곸쓳??愿怨??댄뻾');

        var emotionMode = personaSihuaCnt['?붽텒'] > Math.max(personaSihuaCnt['?붽낵'], personaSihuaCnt['?붽린'])
          ? '寃곗젙???듭떖 ?댁뒋瑜?鍮좊Ⅴ寃??뺣━)'
          : (personaSihuaCnt['?붽낵'] >= Math.max(personaSihuaCnt['?붽텒'], personaSihuaCnt['?붽린'])
            ? '?덉쭏???뺣룉???쒗쁽怨?泥대㈃ ?섑샇)'
            : (personaSihuaCnt['?붽린'] > 0 ? '?듭젣??媛먯젙 ?꾩쟻 ??諛섏쓳 媛??' : '洹좏삎??留λ씫??留욎텣 ?쒗쁽)'));

        var stressMode = (personaSihuaCnt['?붽린'] > 0 || badUnique.length >= 3)
          ? '怨쇰??????듭젣 ?뺢뎄媛 ?곸듅?섎?濡? ?댁떇쨌?띾룄 議곗젅쨌?섏궗寃곗젙 吏?곗씠 ?꾩슂'
          : '?ㅽ듃?덉뒪 ?곹솴?먯꽌???뚮났 ?꾩꽦??鍮꾧탳???덉젙?곸씠硫?猷⑦떞 ?좎???媛뺤젏';

        var hiddenTalent = auxUnique.length
          ? ('蹂댁“??'+auxLabel+'??議고빀?쇰줈, 蹂댁씠吏 ?딅뒗 議곗쑉?Β룹젙蹂댁젙由щ젰쨌??대컢 ?ъ갑?μ씠 媛뺥븯寃??묐룞')
          : '?몃? 蹂댁“?깅낫???먭린 二쇰룄 ??웾??吏곸젒 媛뺥솕?좎닔濡??좎옱?μ씠 鍮좊Ⅴ寃??꾩떎??;

        var ziweiElementMap = {
          '?먮?':'earth','泥쒓린':'wood','?쒖뼇':'fire','臾닿끝':'metal','泥쒕룞':'water','?쇱젙':'fire','泥쒕?':'earth','?쒖쓬':'water',
          '?먮옉':'wood','嫄곕Ц':'water','泥쒖긽':'metal','泥쒕웾':'earth','移좎궡':'metal','?뚭뎔':'water'
        };
        var ziweiAuxElementMap = {
          '臾몄갹':'wood','臾멸끝':'water','醫뚮낫':'earth','?고븘':'earth','?뱀〈':'metal','泥쒕쭏':'fire',
          '?붿꽦':'fire','?곸꽦':'fire','???:'metal','寃쎌뼇':'metal','吏怨?:'water','吏寃?:'water'
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
          earth:{icon:'?곤툘',name:'??,label:'?곤툘 ??(Earth) 쨌 以묒텞'},
          wood:{icon:'?뙼',name:'紐?,label:'?뙼 紐?(Wood) 쨌 ?숇갑'},
          fire:{icon:'?뵦',name:'??,label:'?뵦 ??(Fire) 쨌 ?⑤갑'},
          metal:{icon:'?뷂툘',name:'湲?,label:'?뷂툘 湲?(Metal) 쨌 ?쒕갑'},
          water:{icon:'?뮛',name:'??,label:'?뮛 ??(Water) 쨌 遺곷갑'}
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

        var emotionBaseText = '湲곕낯?곸쑝濡쒕뒗 "'+emotionMode+'" ?ㅽ??쇱엯?덈떎. 利? 媛먯젙???꾩삁 ?④린湲곕낫???곹솴??蹂닿퀬 ?쒗쁽 媛뺣룄瑜?議곗젅?섎뒗 ??낆뿉 媛源앹뒿?덈떎.';
        var emotionVarByState = (personaSihuaCnt['?붽린'] > 0 || badUnique.length >= 3)
          ? '?쇨낀?섍굅???뺣컯?????좎뿉??留먯닔媛 以꾧퀬, 媛먯젙??諛붾줈 爰쇰궡湲곕낫???좎떆 李몄븯?ㅺ? ?섏쨷???뺣━?댁꽌 留먰븷 媛?μ꽦???쎈땲??'
          : '而⑤뵒?섏씠 ?덉젙?곸씪 ?뚮뒗 媛먯젙??鍮꾧탳??遺?쒕읇怨??붿쭅?섍쾶 ?쒗쁽?섎뒗 ?몄엯?덈떎.';
        var emotionVarByPerson = (auxUnique.length >= 3)
          ? '誘용뒗 ?щ엺 ?욎뿉?쒕뒗 ?쒗쁽?????곕쑜?섍퀬 鍮⑤씪吏硫? ??꽑 ?щ엺 ?욎뿉?쒕뒗 ???쒗룷 議곗떖?ㅻ윭?뚯쭛?덈떎.'
          : '?곷?媛 ?덉쟾?섎떎怨??먭뺨吏硫??쒗쁽???섍퀬, 鍮꾪뙋??遺꾩쐞湲곗뿉?쒕뒗 諛⑹뼱?곸쑝濡?諛붾뚮뒗 寃쏀뼢???덉뒿?덈떎.';
        var emotionVarByGoal = (personaSihuaCnt['?붽텒'] > 0)
          ? '?셋룹꽦怨쇨? 嫄몃┛ ?곹솴?먯꽌??媛먯젙蹂대떎 寃곕줎??癒쇱? 留먰븯???ㅼ쟾??紐⑤뱶媛 耳쒖쭛?덈떎.'
          : (personaSihuaCnt['?붽낵'] > 0
            ? '泥대㈃?대굹 愿怨꾩쓽 洹좏삎??以묒슂???뚮뒗 ?쒗쁽???ㅻ벉???꾨떖?섎뒗 ?좎쨷 紐⑤뱶媛 耳쒖쭛?덈떎.'
            : '湲됲븳 紐⑺몴媛 ?앷린硫??됱냼蹂대떎 ?⑦샇?댁?怨? ?ъ쑀媛 ?덉쓣 ?뚮뒗 怨듦컧?뺤쑝濡??뚯븘?ㅻ뒗 ?⑦꽩???덉뒿?덈떎.');

        var sec_persona = '<div style="position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(18,16,40,0.96),rgba(28,20,58,0.92) 48%,rgba(14,32,46,0.9));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(196,181,253,0.35);box-shadow:inset 0 0 0 1px rgba(250,204,21,0.12),0 10px 24px rgba(0,0,0,0.35);">'
          +'<div style="position:absolute;inset:-45% auto auto -12%;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,0.15),rgba(250,204,21,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -18% -52% auto;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,0.14),rgba(125,211,252,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:8px;border:1px dashed rgba(250,204,21,0.23);border-radius:11px;pointer-events:none;"></div>'
          +'<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(196,181,253,0.28);padding-bottom:9px;margin-bottom:12px;">'
            +'<h2 style="color:#e9d5ff;font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">?㎛ [蹂꾨뱾???뚮젮二쇰뒗 ?뱀떊??紐⑥뒿]</h2>'
            +'<span style="font-size:0.68rem;color:#fde68a;border:1px solid rgba(250,204,21,0.45);background:rgba(120,53,15,0.28);padding:2px 7px;border-radius:999px;white-space:nowrap;">Ziwei Persona Matrix</span>'
          +'</div>'
          +'<div style="position:relative;z-index:1;background:linear-gradient(140deg,rgba(30,27,75,0.78),rgba(36,21,73,0.72) 46%,rgba(9,24,46,0.74));border:1px solid rgba(196,181,253,0.34);border-radius:11px;padding:11px;margin-bottom:11px;">'
            +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:7px;">'
              +'<div style="font-size:0.96rem;color:#fef3c7;font-weight:900;letter-spacing:0.01em;">?뱀떊???怨좊궃 ?ㅽ뻾 湲곗슫</div>'
              +'<div style="font-size:0.72rem;color:#c4b5fd;">Zi Wei Dou Shu Element Constellation</div>'
            +'</div>'
            +'<div class="zw-persona-wuxing-grid">'
              +'<div class="zw-persona-wuxing-left" style="background:rgba(12,20,42,0.62);border:1px solid rgba(125,211,252,0.24);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;">'
                +'<div style="font-size:0.84rem;color:#e2e8f0;line-height:1.68;">?뱴 ?щ튆 ?쒓????덈궡??<b style="color:#fde68a;">蹂꾩닠??/b>媛 ?ㅽ뻾 蹂꾩옄由щ? ?쇱퀜 蹂댁엯?덈떎. 諛앷쾶 鍮쏅굹??蹂꾩씪?섎줉 ?꾩옱 紐낅컲?먯꽌 ?섏씠 媛뺥븯寃??묐룞?섎뒗 異뺤엯?덈떎.</div>'
                +'<div style="font-size:1.68rem;line-height:1;">?쭥??/div>'
                +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">'+wuxingChipHtml+'</div>'
              +'</div>'
              +'<div class="zw-persona-wuxing-right" style="position:relative;background:radial-gradient(circle at 20% 18%,rgba(255,255,255,0.16),rgba(255,255,255,0) 35%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(17,24,39,0.78));border:1px solid rgba(196,181,253,0.3);border-radius:10px;padding:8px;min-height:280px;">'
                +'<canvas id="zwWuXingConstellation" width="460" height="320" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas>'
                +'<div style="position:absolute;top:5px;left:50%;transform:translateX(-50%);font-size:0.72rem;color:#fde68a;background:rgba(30,27,75,0.62);border:1px solid rgba(250,204,21,0.28);border-radius:999px;padding:2px 8px;">?곤툘 ??(Earth)</div>'
                +'<div style="position:absolute;top:58px;right:6px;font-size:0.69rem;color:#bbf7d0;background:rgba(6,78,59,0.36);border:1px solid rgba(52,211,153,0.28);border-radius:999px;padding:2px 7px;">?뙼 紐?(Wood)</div>'
                +'<div style="position:absolute;bottom:18px;right:8px;font-size:0.69rem;color:#fecaca;background:rgba(127,29,29,0.34);border:1px solid rgba(248,113,113,0.28);border-radius:999px;padding:2px 7px;">?뵦 ??(Fire)</div>'
                +'<div style="position:absolute;bottom:18px;left:8px;font-size:0.69rem;color:#e2e8f0;background:rgba(51,65,85,0.42);border:1px solid rgba(148,163,184,0.3);border-radius:999px;padding:2px 7px;">?뷂툘 湲?(Metal)</div>'
                +'<div style="position:absolute;top:58px;left:6px;font-size:0.69rem;color:#bfdbfe;background:rgba(30,64,175,0.32);border:1px solid rgba(96,165,250,0.28);border-radius:999px;padding:2px 7px;">?뮛 ??(Water)</div>'
              +'</div>'
            +'</div>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;font-size:0.9rem;line-height:1.75;color:#e2e8f0;">'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">???怨좊궃 ?깃꺽</b><br>湲곕낯 ?깊뼢? <b>'+leadKeyword+'</b> 履쎌엯?덈떎. ?쎄쾶 留먰빐, 以묒슂???쒓컙??"癒쇱? 萸먮????좎?"瑜?鍮꾧탳??鍮⑤━ ?〓뒗 ?몄엯?덈떎.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">???④꺼吏??깃꺽</b><br>寃됱? ?명빐 蹂댁뿬???띿? 瑗쇨세????낆엯?덈떎. ?⑥? 蹂?'+ (borrowedUnique.length ? borrowedUnique.join(' 쨌 ') : '?듭떖 蹂?以묒떖') +' / '+auxLabel+')???묐룞??????李⑤텇?섍퀬 ?좎쨷?댁쭛?덈떎.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">??寃됰え??vs ?띾쭏??/b><br>寃됱뿉?쒕뒗 '+(mainClean.length ? '?먮졆?섍퀬 ?⑤떒???몄긽' : '遺?쒕읇怨??몄븞???몄긽')+'??二쇨린 ?쎌뒿?덈떎. ?섏?留??띿쑝濡쒕뒗 '+(badClean.length ? '?ㅼ닔 媛?μ꽦??癒쇱? ?먭??섎뒗 ?덉쟾?? : '?щ엺怨?寃곌낵瑜?媛숈씠 梨숆린??洹좏삎??)+'??媛源앹뒿?덈떎.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">???멸컙愿怨??ㅽ???/b><br><b>'+relationMood+'</b> ?깊뼢??媛뺥빀?덈떎. 泥섏쓬???좎쓣 吏?ㅺ퀬, ?좊ː媛 ?볦씠硫??ㅻ옒 媛??愿怨꾨? 留뚮뱶???몄엯?덈떎.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">??媛먯젙 ?쒗쁽 諛⑹떇</b><br>'
              +emotionBaseText
              +'<br>??而⑤뵒???뺣컯: '+emotionVarByState
              +'<br>???곷????嫄곕━: '+emotionVarByPerson
              +'<br>???곹솴 紐⑺몴(??愿怨?: '+emotionVarByGoal
            +'</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">???ㅽ듃?덉뒪 諛쏆쓣 ???깃꺽</b><br>'+stressMode+' ?붿빟?섎㈃, 臾대━?댁꽌 諛?대텤?닿린蹂대떎 由щ벉 議곗젅?????깃낵媛 ??醫뗭뒿?덈떎.</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(56,189,248,0.14),rgba(196,181,253,0.12));border:1px solid rgba(125,211,252,0.35);border-radius:10px;padding:10px 11px;"><b style="color:#bae6fd;">???좎옱???붿빟</b><br>'+hiddenTalent+'. ??以??붿빟: ?⑤뱾???볦튂???ъ씤?몃? ?곌껐???ㅼ젣 寃곌낵濡?留뚮뱶???섏씠 ?덉뒿?덈떎.</div>'
          +'</div>'
        +'</div>';

        var careerStarsMeta = extractMainMeta(getPStars('愿濡앷턿'));
        var wealthStarsMeta = extractMainMeta(getPStars('?щ갚沅?));
        var careerMainStars = careerStarsMeta.map(function(m){ return m.name; });
        var wealthMainStars = wealthStarsMeta.map(function(m){ return m.name; });
        var careerBorrowed = careerStarsMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var wealthBorrowed = wealthStarsMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var careerAux = uniqueList(extractAux(getPStars('愿濡앷턿')));
        var wealthAux = uniqueList(extractAux(getPStars('?щ갚沅?)));
        var careerBad = uniqueList(extractBad(getPStars('愿濡앷턿')));
        var wealthBad = uniqueList(extractBad(getPStars('?щ갚沅?)));

        var skillMap = {
          '?먮?':'議곗쭅 由щ뱶쨌珥앷큵 湲고쉷', '泥쒓린':'湲고쉷쨌遺꾩꽍쨌臾몄젣 ?닿껐', '?쒖뼇':'???而ㅻ??덉??댁뀡쨌釉뚮옖??, '臾닿끝':'?ㅽ뻾쨌?щТ ?섑샇',
          '泥쒕룞':'?쒕퉬?ㅒ룹??는룰?怨??꾩땐', '?쇱젙':'?묒긽쨌泥쒓린쨌留덉???, '泥쒕?':'?댄뻾쨌?섑샇쨌?먯궛 蹂댁쟾', '?쒖쓬':'?뷀뀒?셋룸━?쒖튂쨌?뺣? ?섑샇',
          '?먮옉':'?몄씪利댟룹궗???뺤옣', '嫄곕Ц':'臾몄꽌쨌踰뺣Т쨌而⑥꽕??, '泥쒖긽':'議곗젙쨌?덉쭏쨌嫄곕쾭?뚯뒪', '泥쒕웾':'援먯쑁쨌肄붿묶쨌媛먮━',
          '移좎궡':'怨좊궃???꾨줈?앺듃 ?뚰뙆', '?뚭뎔':'?곸떊쨌?좎궗???꾪솚'
        };
        var jobMap = {
          '?먮?':'寃쎌쁺쨌泥쒓린쨌怨듦났 由щ뜑??, '泥쒓린':'IT/?곗씠?걔룰린?띉톀&D', '?쒖뼇':'釉뚮옖?㈑룰탳?≤룸??붿뼱쨌??명삊??, '臾닿끝':'湲덉쑖쨌?щТ쨌?댄뻾쨌?쒖“ ?섑샇',
          '泥쒕룞':'蹂듭?쨌HR쨌怨좉컼寃쏀뿕쨌?곷떞', '?쇱젙':'留덉??끒룸퉬利덇컻諛쑣룻삊??吏곷Т', '泥쒕?':'?먯궛?섑샇쨌?뚭퀎쨌?됱젙쨌而댄뵆?쇱씠?몄뒪', '?쒖쓬':'由ъ꽌移샕룸뵒?먯씤쨌肄섑뀗痢졖룹젙諛 ?щТ',
          '?먮옉':'?곸뾽쨌?ъ뾽媛쒕컻쨌?좏넻쨌?뷀꽣/?대깽??, '嫄곕Ц':'踰뺣Т쨌而⑥꽕?끒룹뿉?뷀똿쨌媛뺤쓽', '泥쒖긽':'PMO쨌?덉쭏?섑샇쨌議곗쭅?댄뻾', '泥쒕웾':'援먯쑁쨌?섎즺?됱젙쨌媛먯궗쨌?먮Ц',
          '移좎궡':'?꾨줈?앺듃 ?ㅻ꼫쨌?꾧린?섑샇쨌?뱀닔湲곗닠', '?뚭뎔':'?ㅽ??몄뾽쨌?좎궗?끒룹쟾???곸떊'
        };
        var businessStars = ['?먮옉','?뚭뎔','移좎궡','臾닿끝','?쇱젙'];
        var companyStars = ['泥쒕?','泥쒖긽','?쒖쓬','嫄곕Ц','泥쒕웾','?먮?'];

        var careerCore = careerMainStars[0] || (leadMain || '怨듦턿');
        var wealthCore = wealthMainStars[0] || careerCore;
        var careerSkill = skillMap[careerCore] || '醫낇빀??臾몄젣 ?닿껐';
        var successJobs = careerMainStars.length
          ? uniqueList(careerMainStars.map(function(s){ return jobMap[s] || (s+' 湲곕컲 ?꾨Ц吏?); })).slice(0,3).join(' / ')
          : '?댄뻾쨌湲고쉷쨌遺꾩꽍 湲곕컲???덉젙??吏곷Т';

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
          ? ('?ъ뾽???곗꽭 ('+businessScore+' : '+companyScore+')')
          : ('吏곸옣???곗꽭 ('+businessScore+' : '+companyScore+')');

        var vocation = careerMainStars.length
          ? ('愿濡앷턿 二쇱꽦 '+careerMainStars.join(' 쨌 ')+' 以묒떖?쇰줈, '+careerSkill+'???듭떖 ??웾?쇰줈 ?곕뒗 ??븷??泥쒖쭅 異뺤뿉 媛源앹뒿?덈떎.')
          : '愿濡앷턿 怨듦턿 援ъ“?대?濡?怨좎젙 吏곹븿蹂대떎 ?섍꼍 ?곸쓳???ъ??섏뿉????웾??鍮좊Ⅴ寃?媛쒗솕?⑸땲??';

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
            score += (dh.palaceName === '?щ갚沅? ? 26 : 0);
            score += (dh.palaceName === '愿濡앷턿' ? 20 : 0);
            score += dSihua.filter(function(s){ return s.type === '?붾줉'; }).length * 12;
            score += dSihua.filter(function(s){ return s.type === '?붽텒'; }).length * 8;
            score += dSihua.filter(function(s){ return s.type === '?붽낵'; }).length * 6;
            score -= dSihua.filter(function(s){ return s.type === '?붽린'; }).length * 12;
            score += dAux.length * 2;
            score -= dBad.length * 3;
            score += dMain.filter(function(s){ return ['臾닿끝','?먮옉','?먮?','泥쒕?','?쒖쓬'].indexOf(s)>=0; }).length * 5;
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
          wealthPeakText = bestWealth.age+'??('+bestWealth.palace+') ??쒖씠 ?щЪ???쇳겕 援ш컙?쇰줈 ?댁꽍?⑸땲?? ???쒓린???뺤옣蹂대떎 ?섏씡 ?뚯닔쨌?먯궛 怨좎젙??泥쒓린瑜?蹂묓뻾?????깃낵媛 洹밸??붾맗?덈떎.';
          if (bestWealth.startAge >= 70 && bestWealthEarly) {
            wealthComfortText = '<div style="margin-top:10px;background:rgba(250,204,21,0.10);border:1px solid rgba(250,204,21,0.35);border-radius:9px;padding:9px 10px;">'
              +'<b style="color:#fde68a;">?截?李⑥꽑梨?議곌린 ?섏씡 援ш컙) 異붿쿇:</b> ?쇳겕媛 ??쾶 ?≫엳?붾씪??<b>'+bestWealthEarly.age+'??('+bestWealthEarly.palace+')</b> 援ш컙?먯꽌 ?좏뻾 ?섏씡?붾? ?ㅺ퀎?????덉뒿?덈떎.'
              +'<br><span style="color:#e2e8f0;">鍮좊Ⅸ ?꾧툑?먮쫫???꾪빐 1) 怨좎젙鍮?異뺤냼 + ???⑥쐞 ?꾧툑?먮쫫 ?곹뿕 吏?? 2) 蹂몄뾽 湲곕컲 遺?섏씡(媛뺤쓽/?먮Ц/?붿????먯궛), 3) 怨좎쐞???뺤옣蹂대떎 ?뚯닔???ы듃?대━?ㅻ? ?곗꽑 ?곸슜?섏꽭??</span>'
              +'<br><span style="color:#bbf7d0;">吏湲덉쓽 ?띾룄媛 ?먮젮 蹂댁뿬???댁? 異뺤쟻?뺤쑝濡??묐룞?⑸땲?? 議곌린 援ш컙?먯꽌 ?묒? ?밸━瑜?諛섎났?섎㈃ ?꾨컲 ?쇳겕???ш린媛 而ㅼ쭛?덈떎.</span>'
            +'</div>';
          }
        } else {
          wealthPeakText = '????곗씠?곌? ?쒗븳?곸씠誘濡??щ갚沅겶룰?濡앷턿 ?쒖꽦 援ш컙??以묒떖?쇰줈 ?????⑥쐞 ?щТ 寃利앹쓣 沅뚯옣?⑸땲??';
        }

        var sec_ability = '<div style="position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(16,21,43,0.96),rgba(21,35,64,0.92) 52%,rgba(12,28,40,0.9));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(125,211,252,0.28);box-shadow:inset 0 0 0 1px rgba(134,239,172,0.1),0 10px 24px rgba(0,0,0,0.35);">'
          +'<div style="position:absolute;inset:-42% auto auto -10%;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,rgba(110,231,183,0.13),rgba(110,231,183,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -15% -48% auto;width:270px;height:270px;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,0.15),rgba(125,211,252,0));pointer-events:none;"></div>'
          +'<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(125,211,252,0.24);padding-bottom:9px;margin-bottom:12px;">'
            +'<h2 style="color:#bae6fd;font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">?뮳 [蹂꾨뱾???뚮젮二쇰뒗 ?뱀떊???λ젰]</h2>'
            +'<span style="font-size:0.68rem;color:#bbf7d0;border:1px solid rgba(110,231,183,0.45);background:rgba(20,83,45,0.28);padding:2px 7px;border-radius:999px;white-space:nowrap;">Ziwei Career Matrix</span>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;font-size:0.9rem;line-height:1.75;color:#e2e8f0;">'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">???怨좊궃 吏곸뾽 ?닿낵 ?깃났?섎뒗 吏곸뾽</b><br>愿濡앷턿 ?듭떖??'+(careerMainStars.length?careerMainStars.join(' 쨌 '):'怨듦턿')+' 湲곗??쇰줈 '+careerSkill+' ??웾??媛뺥븯寃??묐룞?⑸땲?? ?곹빀 吏곴뎔: '+successJobs+'.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">????踰꾨뒗 ?λ젰怨??ъ뾽 vs 吏곸옣</b><br>?щ갚沅??듭떖??'+(wealthMainStars.length?wealthMainStars.join(' 쨌 '):'怨듦턿')+' 湲곗? ?섏씡???⑦꽩? '+bizVsJob+'?낅땲?? '+(businessScore>=companyScore?'?뺤옣쨌?곸뾽쨌?좎궗???쒕룄??媛뺤젏???쎈땲??':'議곗쭅 ??沅뚰븳 異뺤쟻쨌?꾨Ц??怨좊룄?붿뿉???섏씡 ?덉젙?깆씠 ?믪뒿?덈떎.')+'</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">??泥쒖쭅 李얘린</b><br>'+vocation+' '+(careerBorrowed.length?('李⑥꽦 諛섏쁺('+careerBorrowed.join(' 쨌 ')+') 援ш컙?먯꽌????븷 ?뺤옣??而ㅻ━???꾪솚???좊━?⑸땲??'):'')+'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(34,211,238,0.14),rgba(74,222,128,0.12));border:1px solid rgba(110,231,183,0.35);border-radius:10px;padding:10px 11px;"><b style="color:#bbf7d0;">???щЪ?댁씠 媛???곗????쒓린</b><br>'+wealthPeakText+wealthComfortText+'</div>'
          +'</div>'
        +'</div>';

        var strategicAuxStars = ['醫뚮낫','?고븘','泥쒓눼','泥쒖썡','臾몄갹','臾멸끝','?뱀〈','泥쒕쭏'];
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
              auxPlacement[st].push(apName || ('沅곸쐞'+apIdx));
            }
          });
        }

        var auxFound = strategicAuxStars.filter(function(st){ return !!auxPresence[st]; });
        var auxFoundLabel = auxFound.length ? auxFound.join(' 쨌 ') : '吏곸젒 ?ъ갑 ?쏀븿';
        var auxMissing = strategicAuxStars.filter(function(st){ return !auxPresence[st]; });
        var coopAxisOn = auxPresence['醫뚮낫'] && auxPresence['?고븘'];
        var luckAxisOn = auxPresence['泥쒓눼'] && auxPresence['泥쒖썡'];
        var logicAxisOn = auxPresence['臾몄갹'] && auxPresence['臾멸끝'];
        var growthAxisOn = auxPresence['?뱀〈'] && auxPresence['泥쒕쭏'];

        var placeCountByStar = function(st, targets) {
          var list = auxPlacement[st] || [];
          return list.filter(function(n){ return targets.indexOf(n) >= 0; }).length;
        };

        var collabScore = 34;
        collabScore += coopAxisOn ? 30 : ((auxPresence['醫뚮낫'] || auxPresence['?고븘']) ? 14 : 0);
        collabScore += luckAxisOn ? 16 : ((auxPresence['泥쒓눼'] || auxPresence['泥쒖썡']) ? 8 : 0);
        collabScore += placeCountByStar('醫뚮낫', ['?몃났沅?,'愿濡앷턿','紐낃턿']) * 7;
        collabScore += placeCountByStar('?고븘', ['?몃났沅?,'愿濡앷턿','泥쒖씠沅?]) * 7;
        collabScore = Math.max(20, Math.min(98, collabScore));

        var insightScore = 34;
        insightScore += logicAxisOn ? 34 : ((auxPresence['臾몄갹'] || auxPresence['臾멸끝']) ? 15 : 0);
        insightScore += placeCountByStar('臾몄갹', ['紐낃턿','愿濡앷턿','?щ갚沅?,'蹂듬뜒沅?]) * 6;
        insightScore += placeCountByStar('臾멸끝', ['紐낃턿','愿濡앷턿','?щ갚沅?,'泥쒖씠沅?]) * 6;
        insightScore += luckAxisOn ? 7 : 0;
        insightScore = Math.max(20, Math.min(98, insightScore));

        var mobilityScore = 34;
        mobilityScore += growthAxisOn ? 34 : ((auxPresence['?뱀〈'] || auxPresence['泥쒕쭏']) ? 15 : 0);
        mobilityScore += placeCountByStar('?뱀〈', ['?щ갚沅?,'愿濡앷턿','?꾪깮沅?]) * 7;
        mobilityScore += placeCountByStar('泥쒕쭏', ['泥쒖씠沅?,'愿濡앷턿','?щ갚沅?]) * 7;
        mobilityScore += (auxPresence['泥쒓눼'] || auxPresence['泥쒖썡']) ? 5 : 0;
        mobilityScore = Math.max(20, Math.min(98, mobilityScore));

        var coachTitle = '?몄긽???ㅺ퀎?섎뒗 蹂댁씠吏 ?딅뒗 ??;
        var coachSummary = auxFound.length >= 5
          ? '蹂댁“??8醫?以??ㅼ닔媛 ?쒖꽦?붾릺?? ?щ엺쨌?뺣낫쨌?먯썝??援ъ“?뷀빐 寃곌낵瑜?留뚮뱶???ㅺ퀎??紐낅컲?낅땲??'
          : (auxFound.length >= 3
            ? '?듭떖 蹂댁“?깆씠 ?좏깮?곸쑝濡??쒖꽦?붾릺?? ?뱀젙 援ш컙?먯꽌 ?덈쾭由ъ? ?⑥쑉??湲됱긽?뱁븯??吏묒쨷??紐낅컲?낅땲??'
            : '蹂댁“??吏곸젒 媛쒖엯? ?쒗븳?곸씠吏留? 紐낃턿/愿濡앷턿 二쇱꽦 以묒떖???먭린二쇰룄 ?ㅽ뻾?쇰줈 ?곗쐞瑜?留뚮뱶????낆엯?덈떎.');

        var coopDetail = coopAxisOn
          ? '醫뚮낫쨌?고븘???④퍡 ?묐룞???꾩? ?붿껌??媛먯젙???꾨땶 援ъ“濡??ㅺ퀎?⑸땲?? ?뱁엳 '+((auxPlacement['醫뚮낫']||[]).concat(auxPlacement['?고븘']||[]).slice(0,3).join(' 쨌 ') || '?듭떖 沅곸쐞')+'?먯꽌 議곗쑉?μ씠 媛뺥빀?덈떎.'
          : '醫뚮낫쨌?고븘???숈떆 寃곗쭛? ?쏀븯吏留? ?⑤룆 諛곗튂媛 ?덈뒗 沅곸쐞?먯꽌 ?묒뾽 ?듭떖 ?몃뱶瑜?癒쇱? ?몄슦硫?議곕젰 ?⑥쑉??鍮좊Ⅴ寃??щ씪媛묐땲??';
        var luckDetail = luckAxisOn
          ? '泥쒓눼쨌泥쒖썡???숈떆 ?쒖꽦?붾릺??湲고쉶媛 ?곗뿰泥섎읆 蹂댁씠???쒓컙??以鍮꾨맂 ?꾩뿰?쇰줈 ?곌껐??媛?μ꽦???믪뒿?덈떎.'
          : '泥쒓눼쨌泥쒖썡 以??⑥씪 異뺤씠 ?묐룞?섎?濡?湲고쉶 ?ъ갑? 醫뗭?留? ?좏뻾 以鍮?泥댄겕由ъ뒪?몃? 遺숈뿬???깃낵 ?꾪솚???덉젙?⑸땲??';
        var logicDetail = logicAxisOn
          ? '臾몄갹쨌臾멸끝 寃고빀?쇰줈 蹂듭옟???뺣낫瑜?援ъ“?뷀븳 ???ㅻ뱷 媛?ν븳 ?몄뼱濡?蹂?섑븯???섏씠 媛뺥빀?덈떎. 湲고쉷???쒖븞??臾몄꽌 ?ㅺ퀎媛 寃쎌웳 ?곗쐞媛 ?⑸땲??'
          : '臾몄갹쨌臾멸끝????異뺤씠 ?곗꽭?섎?濡??쇰━ ?먮뒗 媛먯꽦 ?쒖そ?쇰줈 ?좊━湲??쎌뒿?덈떎. 諛섎? 異?寃???④퀎瑜?異붽??섎㈃ ?ㅻ뱷?μ씠 ?ш쾶 ?곸듅?⑸땲??';
        var growthDetail = growthAxisOn
          ? '?뱀〈쨌泥쒕쭏 議고빀???먮낯 ?뚯닔?κ낵 湲곕룞?깆쓣 ?숈떆???щ젮以띾땲?? 鍮좊Ⅴ寃??吏곸씠???뚯닔 ??대컢???껋? ?딅뒗 ?깆옣 ?붿쭊??媛뺤젏?낅땲??'
          : '?뱀〈쨌泥쒕쭏媛 遺꾨━ ?묐룞?섎?濡? ?띾룄(泥쒕쭏)? ?뚯닔(?뱀〈) 以??쏀븳 異뺤쓣 ?섏떇?곸쑝濡?蹂댁셿?댁빞 ?깆옣 ?덉젙?깆씠 ?믪븘吏묐땲??';

        var dominantTrack = [
          { k: '?묒뾽 ?꾪궎?띿쿂', v: collabScore },
          { k: '?쇰━???щ???, v: insightScore },
          { k: '怨좎냽 ?깆옣 ?붿쭊', v: mobilityScore }
        ].sort(function(a,b){ return b.v - a.v; })[0];

        var coachingFocus = dominantTrack.k === '?묒뾽 ?꾪궎?띿쿂'
          ? '?뱀옣 ?쇱옄 ?닿껐?섎젮???낅Т 1媛쒕? ?묒뾽??怨쇱젣濡??꾪솚?섏꽭?? ??븷쨌?섏궗寃곗젙沅뙿룸━酉?二쇨린瑜?癒쇱? 紐낆떆?섎㈃ ?깃낵媛 鍮⑤씪吏묐땲??'
          : (dominantTrack.k === '?쇰━???щ???
            ? '?대쾲 二??듭떖 怨쇱젣瑜?1?섏씠吏 援ъ“?꾨줈 ?뺣━?섏꽭?? 臾몄젣?뺤쓽-媛???ㅽ뿕-?뚯닔 吏??4?⑥쑝濡?留뚮뱾硫??ㅻ뱷?μ씠 湲됱긽?뱁빀?덈떎.'
            : '?섏씡/?깃낵 ?뚯닔 ?쒖젏??癒쇱? ?뺥븯怨??ㅽ뻾?섏꽭?? ?쒖옉 湲곗?蹂대떎 醫낅즺 湲곗????좊챸???≪쓣?섎줉 ?먯떎??以꾧퀬 ?꾩쟻 ?깆옣??而ㅼ쭛?덈떎.');

        var sec_hidden_power = '<section class="zw-hidden-power">'
          +'<div class="zw-hidden-power__starfield" aria-hidden="true"></div>'
          +'<div class="zw-hidden-power__inner">'
            +'<h2 class="zw-hidden-power__title">???뱀떊???④꺼吏??λ젰: "'+coachTitle+'"</h2>'
            +'<p class="zw-hidden-power__lead">'+coachSummary+'</p>'
            +'<div class="zw-hidden-power__chips">'
              +'<span class="zw-hidden-power__chip">?ъ갑??蹂댁“?? '+auxFoundLabel+'</span>'
              +'<span class="zw-hidden-power__chip">?묒뾽 ?꾪궎?띿쿂 '+collabScore+'??/span>'
              +'<span class="zw-hidden-power__chip">?곗씠??湲곕컲 吏곴? '+insightScore+'??/span>'
              +'<span class="zw-hidden-power__chip">?띾룄 議곗젅 ?붿쭊 '+mobilityScore+'??/span>'
            +'</div>'
            +'<div class="zw-hidden-power__grid">'
              +'<article class="zw-hidden-power__card">'
                +'<h3>1. ?썱截??쒖뒪?쒖쟻 議곗쑉??(醫뚮낫쨌?고븘 x 泥쒓눼쨌泥쒖썡)</h3>'
                +'<p><b>?듭떖 ??웾:</b> ?뱀떊??媛뺤젏? 吏곸젒 ?닿껐蹂대떎 ?덈쾭由ъ? 援ъ“瑜??ㅺ퀎?섎뒗 ???덉뒿?덈떎.</p>'
                +'<p><b>?곸꽭 ???</b> '+coopDetail+' '+luckDetail+'</p>'
              +'</article>'
              +'<article class="zw-hidden-power__card">'
                +'<h3>2. ?뱷 ?곗씠??湲곕컲??吏곴? (臾몄갹쨌臾멸끝)</h3>'
                +'<p><b>?듭떖 ??웾:</b> 臾댁쭏?쒗븳 ?곗씠?곗뿉??留λ씫??異붿텧???ㅻ뱷 媛?ν븳 ?뺥깭濡??뺣젹?⑸땲??</p>'
                +'<p><b>?곸꽭 ???</b> '+logicDetail+'</p>'
              +'</article>'
              +'<article class="zw-hidden-power__card">'
                +'<h3>3. ?릮 ??대컢??吏諛곗옄 (?뱀〈쨌泥쒕쭏)</h3>'
                +'<p><b>?듭떖 ??웾:</b> ?щ젮?????뚯? 硫덉떠?????뚮? 遺꾨━???깆옣 ?⑥쑉???믪엯?덈떎.</p>'
                +'<p><b>?곸꽭 ???</b> '+growthDetail+'</p>'
              +'</article>'
            +'</div>'
            +'<div class="zw-hidden-power__guide">'
              +'<h3>?뮕 ?쒖슜 媛?대뱶 (Success Code)</h3>'
              +'<p><b>Warning:</b> 紐⑤뱺 寃껋쓣 ?쇱옄 泥섎━?섎㈃ 紐낅컲???μ젏??諛섍컧?⑸땲?? ?곌껐怨??꾩엫???깃낵 利앺룺 ?μ튂?낅땲??</p>'
              +'<p><b>Action:</b> '+coachingFocus+'</p>'
              + (auxMissing.length ? ('<p><b>蹂댁셿 ?ъ씤??</b> ?꾩옱 吏곸젒 ?ъ갑???쏀븳 蹂댁“?깆? '+auxMissing.join(' 쨌 ')+'?낅땲?? ?대떦 ?깊뼢???/?꾧뎄/?꾨줈?몄뒪濡??몃? 蹂닿컯?섎㈃ 洹좏삎???꾩꽦?⑸땲??</p>') : '')
            +'</div>'
          +'</div>'
        +'</section>';

        var spousePal = getPStars('遺泥섍턿') || getPStars('遺遺沅?) || {main:[],aux:[],bad:[],borrowedMain:[]};
        var spouseMainMeta = extractMainMeta(spousePal);
        var spouseMain = spouseMainMeta.map(function(m){ return m.name; });
        var spouseAux = uniqueList(extractAux(spousePal));
        var spouseBad = uniqueList(extractBad(spousePal));
        var spouseBorrowed = spouseMainMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });

        var mengPalForLove = getPStars('紐낃턿') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var bokPalForLove = getPStars('蹂듬뜒沅?) || {main:[],aux:[],bad:[],borrowedMain:[]};
        var movePalForLove = getPStars('泥쒖씠沅?) || {main:[],aux:[],bad:[],borrowedMain:[]};
        var homePalForLove = getPStars('?꾪깮沅?) || {main:[],aux:[],bad:[],borrowedMain:[]};

        var mengMainLove = extractMainMeta(mengPalForLove).map(function(m){ return m.name; });
        var bokMainLove = extractMainMeta(bokPalForLove).map(function(m){ return m.name; });
        var moveMainLove = extractMainMeta(movePalForLove).map(function(m){ return m.name; });
        var homeMainLove = extractMainMeta(homePalForLove).map(function(m){ return m.name; });

        var romanceStars = ['?먮옉','?쒖쓬','泥쒕룞','?쇱젙','?쒖뼇'];
        var stableStars = ['泥쒕?','泥쒕웾','泥쒖긽','?먮?','臾닿끝'];
        var independentStars = ['移좎궡','?뚭뎔','臾닿끝','嫄곕Ц'];
        var socialStars = ['?먮옉','?쒖뼇','泥쒕룞','泥쒓린'];

        var helperGoodStars = ['醫뚮낫','?고븘','臾몄갹','臾멸끝','泥쒓눼','泥쒖썡','?뱀〈'];
        var helperRiskStars = ['寃쎌뼇','???,'?붿꽦','?곸꽦','吏怨?,'吏寃?];

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
        flirtRiskScore += spouseMain.filter(function(s){ return ['?먮옉','?뚭뎔','移좎궡','?쇱젙'].indexOf(s) >= 0; }).length * 14;
        flirtRiskScore += (hasHwagi ? 10 : 0);
        flirtRiskScore += spouseBad.length * 6;
        flirtRiskScore -= spouseMain.filter(function(s){ return ['泥쒕?','泥쒕웾','?먮?','臾닿끝'].indexOf(s) >= 0; }).length * 8;
        flirtRiskScore -= spouseAux.filter(function(s){ return ['醫뚮낫','?고븘','臾몄갹','臾멸끝'].indexOf(s) >= 0; }).length * 3;

        loveHeat = Math.max(0, Math.min(100, loveHeat));
        commitment = Math.max(0, Math.min(100, commitment));
        freedomNeed = Math.max(0, Math.min(100, freedomNeed));
        flirtRiskScore = Math.max(0, Math.min(100, flirtRiskScore));

        var spouseLabel = spouseMain.length ? spouseMain.join(' 쨌 ') : '怨듦턿(李⑥꽦/?沅??곹뼢??';
        var spouseAuxLabel = spouseAux.length ? spouseAux.join(' 쨌 ') : '蹂댁“ 湲몄꽦 ?쏀븿';
        var spouseBadLabel = spouseBad.length ? spouseBad.join(' 쨌 ') : '?됱꽦 ?뺣젰 ?쏀븿';

        var loveStyle = '';
        if (loveHeat >= 70 && commitment >= 60) {
          loveStyle = '"遺덇퐙 + 梨낆엫" ?쇳빀?뺤엯?덈떎. 媛먯젙??遺숈쑝硫?鍮좊Ⅴ寃?源딆뼱吏吏留? 愿怨꾧? ?쒖옉?섎㈃ ?ㅻ옒 吏?ㅻ젮???깊뼢??媛뺥빀?덈떎.';
        } else if (freedomNeed >= 70) {
          loveStyle = '"移쒕? + ?먯쑀" 洹좏삎?뺤엯?덈떎. 醫뗭븘?대룄 ??由щ벉??吏?ㅻ뒗 ?몄씠硫? 議댁쨷諛쏆쓣 ???좎젙 ?쒗쁽???ш쾶 ?댁븘?⑸땲??';
        } else if (commitment >= 68) {
          loveStyle = '"?좊ː ?곗꽑" ?덉젙?뺤엯?덈떎. 泥쒖쿇??媛源뚯썙吏吏留??쒕쾲 留덉쓬??二쇰㈃ ?쇨??깆씠 ?믨퀬 愿怨??댄뻾???깆떎?⑸땲??';
        } else {
          loveStyle = '"?곹솴 ?곸쓳" ?꾩떎?뺤엯?덈떎. ?곷?? ??대컢???곕씪 諛⑹떇???щ씪吏硫? 媛먯젙怨?議곌굔???④퍡 蹂대뒗 ??낆뿉 媛源앹뒿?덈떎.';
        }

        var charmPoint = '';
        if (spouseMain.some(function(s){ return ['?쒖뼇','?먮옉','?쇱젙'].indexOf(s) >= 0; })) {
          charmPoint = '?щ엺???명븯寃??뚯뼱?밴린??議댁옱媛먭낵 ???諛?꾧? 留ㅻ젰 ?ъ씤?몄엯?덈떎. 遺꾩쐞湲곕? ?대━???λ젰??媛뺥빀?덈떎.';
        } else if (spouseMain.some(function(s){ return ['?쒖쓬','泥쒕룞','泥쒕웾'].indexOf(s) >= 0; })) {
          charmPoint = '?곕쑜?㉱룸같?ㅒ룹젙?쒖쟻 ?덉젙媛먯씠 媛뺥븳 留ㅻ젰?쇰줈 ?묐룞?⑸땲?? "?④퍡 ?덉쑝硫??몄븞???щ엺"?쇰줈 湲곗뼲?섍린 ?쎌뒿?덈떎.';
        } else {
          charmPoint = '?쎌냽??吏?ㅻ뒗 ?쒕룄, 梨낆엫媛? ?앺솢 由щ벉???덉젙?깆씠 ?κ린 留ㅻ젰?쇰줈 ?묐룞?⑸땲??';
        }

        var attractedToYou = '';
        if (spouseMain.some(function(s){ return ['?먮?','泥쒕?','臾닿끝'].indexOf(s) >= 0; })) {
          attractedToYou = '?깆닕?섍퀬 ?먭린 ?쇱뿉 梨낆엫 ?덈뒗 ?щ엺, ?앺솢 湲곕컲???꾪깂???댄뻾?섎뒗 ??낆씠 ?뱀떊?먭쾶 媛뺥븯寃??뚮┰?덈떎.';
        } else if (spouseMain.some(function(s){ return ['?먮옉','?쒖뼇','泥쒓린'].indexOf(s) >= 0; })) {
          attractedToYou = '媛먭컖?곸씠怨??쒗쁽???곴레?곸씤 ?щ엺, ?④퍡 ?깆옣/?꾩쟾?????덈뒗 ?먮꼫吏???몄뿰??遺숆린 ?쎌뒿?덈떎.';
        } else {
          attractedToYou = '?덉젙媛먭낵 怨듦컧 ?λ젰???④퍡 媛吏??щ엺, 留먯씠 ?듯븯怨??쇱긽 ?명씉??留욌뒗 ?몄뿰??媛뺥븯寃??ㅼ뼱?듬땲??';
        }

        var youAttractedTo = '';
        if (mengMainLove.some(function(s){ return ['移좎궡','?뚭뎔','嫄곕Ц'].indexOf(s) >= 0; })) {
          youAttractedTo = '?묐삊?섍퀬 ?먭린 二쇨???遺꾨챸???щ엺?먭쾶 ?뚮┰?덈떎. ??붿쓽 源딆씠? 臾몄젣 ?닿껐?μ씠 以묒슂???좏깮 湲곗??낅땲??';
        } else if (mengMainLove.some(function(s){ return ['泥쒕룞','?쒖쓬','泥쒕웾'].indexOf(s) >= 0; })) {
          youAttractedTo = '?ㅼ젙?섍퀬 媛먯젙?좎씠 ?ъ꽭???щ엺, 愿怨꾩쓽 ?⑤룄瑜???留욎떠二쇰뒗 ?щ엺?먭쾶 鍮좊Ⅴ寃?留덉쓬??媛묐땲??';
        } else {
          youAttractedTo = '?쎌냽????吏?ㅺ퀬 ?앺솢 ?섏씠?ㅺ? ?덉젙?곸씤 ?щ엺, ?κ린?곸쑝濡?媛숈씠 ?깆옣?????덈뒗 ??낆쓣 ?좏샇?⑸땲??';
        }

        var idealSpouse = '?댁긽?곸씤 諛곗슦???좏삎? <b>'
          + (commitment >= 65 ? '?덉젙?깃낵 梨낆엫媛먯씠 ?믪? ?щ엺' : '?좎뿰?깃낵 ?뚰넻?μ씠 ?믪? ?щ엺')
          + '</b>?낅땲?? ?뱁엳 '
          + (freedomNeed >= 65 ? '?쒕줈??媛쒖씤 ?쒓컙??議댁쨷??二쇰뒗 援ъ“' : '?앺솢 由щ벉???④퍡 留욎떠媛??援ъ“')
          + '?먯꽌 寃고샎 留뚯”?꾧? ?믪븘吏묐땲??';

        var marriageShift = '';
        if (moveMainLove.some(function(s){ return ['?먮옉','?뚭뎔','移좎궡','泥쒓린'].indexOf(s) >= 0; })) {
          marriageShift = '寃고샎 ???대룞쨌吏곷Т ?꾪솚쨌?앺솢沅?蹂?붽? ?④퍡 ?ㅺ린 ?쎌뒿?덈떎. ???щ엺??"?앺솢 ?깃턿 吏꾨쾿"??癒쇱? ?⑹쓽?섎㈃ 媛덈벑 鍮꾩슜???ш쾶 以꾩뼱??땲??';
        } else if (homeMainLove.some(function(s){ return ['泥쒕?','?쒖쓬','?먮?'].indexOf(s) >= 0; })) {
          marriageShift = '寃고샎 ???먯궛쨌二쇨굅쨌媛???댄뻾???덉젙?곸쑝濡??ы렪??媛?μ꽦???쎈땲?? 吏??щТ 怨꾪쉷??怨듬룞 ?곹뿕 吏?쒕줈 ?댄뻾?섎㈃ ?쒕꼫吏媛 ?쎈땲??';
        } else {
          marriageShift = '寃고샎 ??蹂?붾뒗 湲됯꺽?섍린蹂대떎 ?먯쭊?뺤엯?덈떎. ??븷 遺꾨떞?쒖? ?섏궗寃곗젙 洹쒖튃???⑹쓽?섎㈃ ?κ린 留뚯”?꾧? ?곸듅?⑸땲??';
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
            mScore += (dh.palaceName === '遺泥섍턿' || dh.palaceName === '遺遺沅?) ? 28 : 0;
            mScore += (dh.palaceName === '紐낃턿') ? 14 : 0;
            mScore += (dh.palaceName === '泥쒖씠沅?) ? 10 : 0;
            mScore += dhSihua2.filter(function(s){ return s.type === '?붾줉'; }).length * 11;
            mScore += dhSihua2.filter(function(s){ return s.type === '?붽텒'; }).length * 7;
            mScore += dhSihua2.filter(function(s){ return s.type === '?붽낵'; }).length * 8;
            mScore -= dhSihua2.filter(function(s){ return s.type === '?붽린'; }).length * 12;
            mScore += dMain2.filter(function(s){ return ['泥쒕룞','?쒖쓬','泥쒖긽','泥쒕웾','?먮?','泥쒕?'].indexOf(s) >= 0; }).length * 5;
            mScore += dAux2.filter(function(s){ return helperGoodStars.indexOf(s) >= 0; }).length * 2;
            mScore -= dBad2.length * 3;
            if (!marriageBest || mScore > marriageBest.score) {
              marriageBest = { age: dh.startAge+'~'+dh.endAge, palace: dh.palaceName, score: mScore };
            }
          });
        }
        var marriageLuckText = marriageBest
          ? ('寃고샎???쇳겕??<b>'+marriageBest.age+'??('+zwDisplayPalaceName(marriageBest.palace)+')</b> 援ш컙?쇰줈 ?댁꽍?⑸땲?? ???쒓린??愿怨꾩쓽 ?쒕룄???숆굅쨌?쇱씤쨌怨듬룞 ?먯궛 ?ㅺ퀎)???좊━?⑸땲??')
          : '????곗씠?곌? ?쒗븳?섏뼱 寃고샎???쇳겕??紐낇솗???뱀젙?섍린 ?대졄吏留? 遺泥섍턿/紐낃턿 ?쒖꽦 ?쒓린??愿怨?吏꾩쟾???좊━?⑸땲??';

        var flirtVerdict = '';
        if (flirtRiskScore >= 66) {
          flirtVerdict = '諛붾엺湲??먯껜?쇨린蹂대떎 "愿怨????먭레???붾뱾由?媛?μ꽦"???덈뒗 ?몄엯?덈떎. 寃쎄퀎???섑샇(?곕씫 鍮덈룄쨌?댁꽦 嫄곕━ 洹쒖튃)瑜?紐낇솗???먮㈃ ?덉젙?⑸땲??';
        } else if (flirtRiskScore >= 42) {
          flirtVerdict = '以묐┰ 援ш컙?낅땲?? ?됱냼???덉젙?곸씠吏留??ㅽ듃?덉뒪쨌沅뚰깭쨌嫄곕━ ?댁뒋媛 ?꾩쟻?섎㈃ 媛먯젙 ?댄깉 媛?μ꽦???앷만 ???덉뒿?덈떎.';
        } else {
          flirtVerdict = '??? ?몄엯?덈떎. 愿怨꾧? ?쒖옉?섎㈃ ?섎━? ?쇨??깆씠 媛뺥븯怨? ?좊ː 湲곕컲???ㅼ뒪濡?吏?ㅻ젮???깊뼢???쎈땲??';
        }

        var loveWeakness = '';
        if (freedomNeed >= 70 && commitment < 60) {
          loveWeakness = '媛源뚯썙吏덉닔濡??듬떟?⑥쓣 ?먭뺨 媛묒옄湲?嫄곕━瑜??????덉뒿?덈떎. "?쇱옄 ?뚮났 ?쒓컙"??誘몃━ ?⑹쓽?섎㈃ 諛섎났 媛덈벑??以꾩씪 ???덉뒿?덈떎.';
        } else if (spouseBad.length >= 2 || hasHwagi) {
          loveWeakness = '?쒖슫?⑥씠 ?볦씠硫?吏곸젒 留먰븯湲곕낫??李몃떎媛 ??踰덉뿉 ?곗쭏 ???덉뒿?덈떎. 媛먯젙 濡쒓렇瑜?吏㏐쾶 怨듭쑀?섎뒗 ?듦????④낵?곸엯?덈떎.';
        } else {
          loveWeakness = '臾몄젣媛 ?묒쓣 ?뚮뒗 ?섍린?ㅺ? ??대컢???볦튂??寃쏀뼢???덉뒿?덈떎. 二?1??愿怨?泥댄겕??醫뗭븯?????꾩돩??????沅뚯옣?⑸땲??';
        }

        var loveNameRaw = (typeof USER_NAME === 'string' && USER_NAME.trim()) ? USER_NAME.trim() : '?ъ슜??;
        var loveNameSafe = (typeof iljuEscapeHtml === 'function')
          ? iljuEscapeHtml(loveNameRaw)
          : loveNameRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');

        var loveDestinyTitle = '鍮꾨떒湲??꾩뿉 ? ?λ?';
        if (spouseMain.some(function(s){ return ['?먮옉','?쒖뼇','?쇱젙'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '遺덇퐙 臾대? ?꾩쓽 ?덉툩';
        } else if (spouseMain.some(function(s){ return ['?쒖쓬','泥쒕룞','泥쒕웾'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '?덈꼍 ?덇컻 ?띿쓽 ?쒖빟';
        } else if (spouseMain.some(function(s){ return ['臾닿끝','?먮?','泥쒕?'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '?⑷툑 洹쒖튃?쇰줈 吏?ㅻ뒗 ?ъ옣';
        }

        var loveTypeName = '媛먯젙 泥쒓린媛??;
        if (loveHeat >= 70 && commitment >= 65) loveTypeName = '釉붾젅?댁쫰 媛?붿뼵??;
        else if (freedomNeed >= 70 && loveHeat >= 60) loveTypeName = '?먯쑀 沅ㅻ룄 濡쒕㎤?쒗삎';
        else if (commitment >= 70) loveTypeName = '濡깅윴 ?ㅺ퀎?먰삎';
        else if (loveHeat >= 65) loveTypeName = '?ъ옣 吏곸쭊 ?뚮젅?댁뼱??;

        var oneLineSummary = '';
        if (commitment >= loveHeat && commitment >= freedomNeed) {
          oneLineSummary = '?뱀떊???곗븷???ㅻ젞蹂대떎 ?좊ː媛 癒쇱? ?먮━瑜??↔퀬, ??踰?留븐? 愿怨꾨뒗 ?ㅻ옒 吏?ㅻ뒗 ?대챸?낅땲??';
        } else if (loveHeat >= commitment && loveHeat >= freedomNeed) {
          oneLineSummary = '?뱀떊???곗븷???ъ옣??癒쇱? ?щ━怨??꾩떎???ㅻ뵲瑜대뒗 ??낆씠?? ?쒖옉 ?λ㈃遺??媛뺣젹???뚮룞??留뚮벊?덈떎.';
        } else {
          oneLineSummary = '?뱀떊???곗븷??媛源뚯썙吏덉닔濡??먯쑀? 移쒕???洹좏삎???쒗뿕諛쏆쑝硫? 洹?洹좏삎??留욎텧?섎줉 愿怨꾩쓽 湲됱씠 ?щ씪媛묐땲??';
        }

        var vibeText = '?댁젙 <b style="color:#fb7185;">'+loveHeat+'</b> / ?뚯떊 <b style="color:#f9a8d4;">'+commitment+'</b> / ?먯쑀 <b style="color:#c4b5fd;">'+freedomNeed+'</b>??寃곕줈 ?吏곸엯?덈떎. '
          + (loveHeat >= 70 ? '媛먯젙???먰솕 ?띾룄媛 鍮좊Ⅴ怨?' : '媛먯젙???먰솕???좎쨷?섏?留?')
          + (commitment >= 65 ? '遺숈쑝硫??ㅻ옒 踰꾪떚???섏씠 媛뺥빀?덈떎.' : '?곹솴 ?곸쓳?μ씠 醫뗭븘 愿怨꾩쓽 ?먯쓣 ?좎뿰?섍쾶 諛붽퓠?덈떎.');

        var magnetConflict = '"?섏뿉寃??뚮━???щ엺"? '+attractedToYou+' 諛섎㈃ "?닿? ?뚮━???щ엺"? '+youAttractedTo+' 洹몃옒???곗븷 珥덈컲???댁긽怨??꾩떎??援먯감?섏?留? 湲곗???留먮줈 ?⑹쓽?섎뒗 ?쒓컙 媛??媛뺥븳 ????⑸땲??';

        var redFlagScenario = '';
        var redFlagCounter = '';
        if (freedomNeed >= 70 && commitment < 60) {
          redFlagScenario = '移섎챸???쎌젏? <b>媛源뚯썙吏???媛묒옄湲??⑥씠 留됲엳???⑦꽩</b>?낅땲?? ?ㅻ챸 ?녿뒗 嫄곕━?먭린媛 諛섎났?섎㈃ ?곷???踰꾨젮議뚮떎怨??댁꽍?섍퀬, ?묒? ?ㅽ빐媛 ?대퀎 ?몃━嫄곕줈 ??컻?????덉뒿?덈떎.';
          redFlagCounter = '諛⑹? ?梨? 愿怨꾧? ?듬떟?댁?湲??꾩뿉 "?쇱옄 ?뚮났 ?쒓컙"???쇱젙?쇰줈 癒쇱? ?좎뼵?섏꽭?? 移⑤У ????덇퀬媛 愿怨꾨? ?대┰?덈떎.';
        } else if (spouseBad.length >= 2 || hasHwagi) {
          redFlagScenario = '移섎챸???쎌젏? <b>李몃떎媛 ??踰덉뿉 ?곗???媛먯젙 ??컻</b>?낅땲?? ?쒖슫?⑥씠 ?꾩쟻?섎㈃ ??붽? ?묒긽 ????먭껐???섏뼱, ?쒕줈???먯〈?щ쭔 ?ш쾶 ?ㅼ묩?덈떎.';
          redFlagCounter = '諛⑹? ?梨? ?곷????쒖슫?⑥씠 3痢듦퉴吏 ?볦씠湲??꾩뿉 癒쇱? 臾몄쓣 ?먮뱶由ъ꽭?? 48?쒓컙 ?덉뿉 媛먯젙??吏㏐쾶 怨듭쑀?섎㈃ ?뚭뎅??留됱쓣 ???덉뒿?덈떎.';
        } else if (flirtRiskScore >= 66) {
          redFlagScenario = '移섎챸???쎌젏? <b>愿怨?諛붽묑 ?먭레??????쒓컙 ?붾뱾由?/b>?낅땲?? 沅뚰깭 援ш컙?먯꽌 寃쎄퀎?좎씠 ?먮젮吏硫??좊ː 蹂듦뎄 鍮꾩슜???ш쾶 諛쒖깮?⑸땲??';
          redFlagCounter = '諛⑹? ?梨? ?곕씫 鍮덈룄, ?댁꽦 嫄곕━, ?좎옄由?洹쒖튃??珥덈컲???⑹쓽???먯꽭?? 猷곗씠 ?щ옉??援ъ냽?섎뒗 寃??꾨땲???щ옉??蹂댄샇?⑸땲??';
        } else {
          redFlagScenario = '移섎챸???쎌젏? <b>臾몄젣媛 ?묒쓣 ???섍린????대컢???볦튂???⑦꽩</b>?낅땲?? 媛덈벑???묒쓣 ???먮?吏 ?딆쑝硫??섏쨷??媛숈? ??붽? ?꾩웳???⑸땲??';
          redFlagCounter = '諛⑹? ?梨? 二?1??10遺?泥댄겕?몄쑝濡?"醫뗭븯????1媛?+ ?꾩돩????1媛?留?怨듭쑀?섏꽭?? 愿怨꾩쓽 洹좎뿴? 議곌린 蹂댁닔媛 ?뺣떟?낅땲??';
        }

        var spouseProfile = '?뱀떊??由щ벉??留욎떠以??숇컲?먮뒗 <b>'
          + (commitment >= 65 ? '梨낆엫媛먯씠 ?덇퀬 ?쎌냽???ㅼ젣 ?됰룞?쇰줈 吏?ㅻ뒗 ?щ엺' : '媛먯젙 ?뚰넻??鍮좊Ⅴ怨?遺꾩쐞湲곕? 遺?쒕읇寃??꾪솚?섎뒗 ?щ엺')
          + '</b>?낅땲?? '
          + (freedomNeed >= 65 ? '?쒕줈??媛쒖씤 ?쒓컙??議댁쨷?좎닔濡??좎젙??諛?꾧? ?щ씪媛묐땲??' : '?쇱긽 猷⑦떞???④퍡 ?ㅺ퀎?좎닔濡??덉젙媛먭낵 ?좎갑??湲됱긽?뱁빀?덈떎.');

        var futureGoldText = '?몄깮 ?⑷툑湲? '+marriageLuckText+' '+marriageShift;

        var secretKey = '?꾩궡湲? ?곗븷 ?ㅽ??쇱? '+loveStyle+' 洹몃━怨??댁긽?곸씤 諛곗슦?먯긽? '+idealSpouse+' ????異뺤쓣 ?⑹퀜 "媛먯젙 ?쒗쁽? ?곕쑜?섍쾶, ?쎌냽? 援ъ껜?곸쑝濡? ?ㅽ뻾?섎㈃ 愿怨꾩쓽 ?좊ː ?덈꺼??媛??鍮좊Ⅴ寃??곸듅?⑸땲??';

        var weeklyMission = '';
        if (flirtRiskScore >= 66) {
          weeklyMission = '?대쾲 二쇱쓽 誘몄뀡: 寃쎄퀎??3醫??곕씫쨌?쎌냽쨌?ъ쟻 嫄곕━)??臾몄옣?쇰줈 ?⑹쓽?섍퀬 ?쒕줈 ?뺤씤 ?꾩옣??李띿쑝?몄슂.';
        } else if (freedomNeed >= 70) {
          weeklyMission = '?대쾲 二쇱쓽 誘몄뀡: ?곗씠??1??+ ?쇱옄 ?뚮났 ?쒓컙 2?뚮? 誘몃━ 罹섎┛?붿뿉 ?↔퀬 ?곷??먭쾶 癒쇱? 怨듭쑀?섏꽭??';
        } else if (commitment >= 70) {
          weeklyMission = '?대쾲 二쇱쓽 誘몄뀡: "?곕━??6媛쒖썡 怨꾪쉷" ??붾? 20遺?吏꾪뻾?섍퀬, ???쒓컙/?댁떇 洹쒖튃??媛?1媛쒖뵫 ?뺥븯?몄슂.';
        } else {
          weeklyMission = '?대쾲 二쇱쓽 誘몄뀡: 7?쇨컙 ?섎（ ??以?媛먯젙 濡쒓렇瑜?怨듭쑀?섏꽭?? 媛먯젙 ?대쫫??遺숈씠???쒓컙 媛덈벑 媛뺣룄媛 ?대젮媛묐땲??';
        }

        var healingTitle = '愿쒖갖?? ?뱀떊???띾룄???대? 異⑸텇???꾨쫫?듭뒿?덈떎';
        if (loveHeat >= 70 && commitment >= 65) {
          healingTitle = '?④굅??留덉쓬???ъ뼱媛???ㅻ옒 鍮쏅궔?덈떎';
        } else if (freedomNeed >= 70) {
          healingTitle = '嫄곕━?먭린???뚰뵾媛 ?꾨땲???뚮났??湲곗닠?낅땲??;
        } else if (commitment >= 70) {
          healingTitle = '?뱀떊???깆떎?⑥? ?щ옉??吏?ㅻ뒗 媛?????щ뒫?낅땲??;
        }

        var healingAffirmation = '?뱀떊??愿怨꾩뿉???덈??섍쾶 ?먮겮??媛먭컖? ?쎌젏???꾨땲???щ옉???덉씠?붿엯?덈떎. 洹?媛먭컖??鍮꾨궃?섏? 留먭퀬 諛⑺뼢留?議곗젙?섎㈃ ?⑸땲??';
        var healingRoutine = '?ㅻ뒛???뚮났 猷⑦떞: ?좊뱾湲???3遺? "?ㅻ뒛 怨좊쭏?좊뜕 ?λ㈃ 1媛?+ ??媛먯젙 1媛?+ ?댁씪 ?꾪븷 ??臾몄옣"??硫붾え?섏꽭?? 愿怨꾩쓽 ?⑤룄媛 泥쒖쿇???덉젙?⑸땲??';
        var healingPartnerTip = '愿怨??щ━ 肄붿묶: ?곷?瑜?諛붽씀???섍린蹂대떎, ??由щ벉??癒쇱? ?ㅻ챸?섏꽭?? ?ㅻ챸??留덉쓬? ?ㅽ빐蹂대떎 ?좊ː瑜?鍮좊Ⅴ寃?留뚮벊?덈떎.';

        if (spouseBad.length >= 2 || hasHwagi) {
          healingAffirmation = '媛먯젙???쒓볼踰덉뿉 ?щ씪?ㅻ뒗 ?좎씠 ?덉뼱??愿쒖갖?듬땲?? ?뱀떊? 留앷?吏?寃??꾨땲?? ?ㅻ옒 李몄븘??留덉쓬???좏샇瑜?蹂대궡??以묒엯?덈떎.';
          healingRoutine = '?ㅻ뒛???뚮났 猷⑦떞: 媛먯젙 ??컻 ?좏샇 3媛吏(留먰닾쨌?쒖젙쨌紐?諛섏쓳)瑜??곴퀬, ?좏샇媛 ?ㅻ㈃ 20遺?硫덉땄 ??????ш컻 洹쒖튃???곸슜?섏꽭??';
        } else if (freedomNeed >= 70) {
          healingPartnerTip = '愿怨??щ━ 肄붿묶: "吏湲덉? 硫?댁???寃??꾨땲??異⑹쟾 以??대씪??臾몄옣??誘몃━ 怨듭쑀?섏꽭?? ?뺤쭅???덇퀬媛 ?곷???遺덉븞???ш쾶 ??땅?덈떎.';
        }

        var loveDestinyMetrics = {
          passion: Math.max(35, Math.min(98, Math.round(loveHeat))),
          communication: Math.max(35, Math.min(98, Math.round(58 + auxUnique.length * 4 - (spouseBad.length * 2) + (personaSihuaCnt['?붽낵'] > 0 ? 6 : 0)))),
          harmony: Math.max(35, Math.min(98, Math.round((commitment * 0.58) + ((100 - flirtRiskScore) * 0.42)))),
          trust: Math.max(35, Math.min(98, Math.round((100 - flirtRiskScore) * 0.72 + commitment * 0.28))),
          destiny: Math.max(35, Math.min(98, Math.round((loveHeat * 0.32) + (commitment * 0.38) + ((100 - flirtRiskScore) * 0.3)))),
          promise: Math.max(35, Math.min(98, Math.round(commitment)))
        };

        var loveDestinyPointList = [
          { key: 'passion', icon: '?ㅿ툘?랅윍?, name: '?댁젙', hint: '?ъ옣???먰솕?섎뒗 ?뚮┝' },
          { key: 'communication', icon: '?뙔?뮠', name: '?뚰넻', hint: '留먯씠 蹂꾨튆泥섎읆 ?듯븯??寃? },
          { key: 'harmony', icon: '?뽳툘', name: '議고솕', hint: '媛먯젙怨??꾩떎??洹좏삎' },
          { key: 'trust', icon: '?뵏狩?, name: '?좊ː', hint: '愿怨꾨? 吏?ㅻ뒗 ?덉쟾?? },
          { key: 'destiny', icon: '?억툘', name: '?몄뿰', hint: '?쒓컙???섏뼱 ?댁뼱吏?留ㅻ벊' },
          { key: 'promise', icon: '?몣', name: '?쎌냽', hint: '?ㅻ옒 媛??梨낆엫???? }
        ];

        var loveDestinyMetricHtml = loveDestinyPointList.map(function(item){
          var val = loveDestinyMetrics[item.key] || 0;
          return '<div class="zw-love-metric-item"><span>'+item.icon+' <b>'+item.name+'</b></span><span style="color:#fde68a;font-weight:900;">'+val+'%</span></div>';
        }).join('');

        var sec_love_compat_spread = '<div class="zw-love-compat-spread report-card report-section love-card star-effect">'
          + '<div class="zw-cosmic-stars"></div>'
          + '<div class="zw-love-compat-title love-title">?뮊 [?щ옉 ?몄뿰 蹂꾩옄由?</div>'
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
            +'<h2 class="section-title love-title" style="font-size:1.08rem;margin:0;font-weight:900;letter-spacing:0.01em;">?뮊 [蹂꾨뱾???뚮젮二쇰뒗 ?щ옉]</h2>'
            +'<span class="zw-cosmic-chip" style="color:#fecdd3;border-color:rgba(251,113,133,0.55);background:rgba(127,29,29,0.3);">Starlit Love Story</span>'
          +'</div>'
          +'<div class="card-content love-text" style="position:relative;z-index:1;background:linear-gradient(120deg,rgba(251,113,133,0.16),rgba(244,114,182,0.12));border:1px solid rgba(251,113,133,0.38);border-radius:11px;padding:12px 12px;margin-bottom:10px;">'
            +'<div style="font-size:1.03rem;font-weight:900;color:#ffe4e6;line-height:1.45;">?뭽 '+loveNameSafe+'???곗븷 ?대챸: "'+loveDestinyTitle+'"</div>'
            +'<div style="margin-top:6px;color:#ffe4e6;font-size:0.87rem;line-height:1.72;"><b>??以??붿빟:</b> '+oneLineSummary+'</div>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:9px;font-size:0.89rem;line-height:1.76;color:#f3e8ff;">'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">1. ?뱀떊???곗븷 蹂몃뒫 (The Stats)</div>'
              +'<div style="margin-bottom:4px;"><b>Love Style:</b> '+loveTypeName+'</div>'
              +'<div style="margin-bottom:4px;"><b>Vibe:</b> '+vibeText+'</div>'
              +'<div style="font-size:0.79rem;color:#fbcfe8;">?듭떖 蹂? '+spouseLabel+' / 蹂댁“쨌?됱꽦: '+spouseAuxLabel+' / '+spouseBadLabel+'</div>'
            +'</div>'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">2. ?뱀떊??留ㅻ젰怨??몄뿰 (Attraction)</div>'
              +'<div style="margin-bottom:4px;"><b>?낅뜒 ?ъ씤??</b> ?뱀떊???곗븷瑜??쒖옉?섎㈃ '+charmPoint+'</div>'
              +'<div><b>?대챸???먯꽍:</b> '+magnetConflict+'</div>'
            +'</div>'
            +'<div style="background:linear-gradient(120deg,rgba(127,29,29,0.32),rgba(127,29,29,0.18));border:1px solid rgba(251,113,133,0.42);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fda4af;font-weight:900;margin-bottom:6px;">3. ?좑툘 ?덈뱶 ?뚮옒洹?(Warning)</div>'
              +'<div style="margin-bottom:4px;"><b>移섎챸???쎌젏:</b> '+redFlagScenario+'</div>'
              +'<div><b>諛⑹? ?梨?</b> '+redFlagCounter+'</div>'
            +'</div>'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">4. ?뭾 誘몃옒???숇컲??& 寃고샎 ??(Future)</div>'
              +'<div style="margin-bottom:4px;"><b>諛곗슦???꾨줈??</b> '+spouseProfile+'</div>'
              +'<div><b>?몄깮 ?⑷툑湲?</b> '+futureGoldText+'</div>'
            +'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(244,114,182,0.18),rgba(167,139,250,0.14));border:1px solid rgba(244,114,182,0.38);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fce7f3;font-weight:900;margin-bottom:6px;">5. ?ㅻ뒛遺???뱀옣 ?ㅼ쿇???곗븷 移섑듃??/div>'
              +'<div style="margin-bottom:4px;"><b>Secret Key:</b> '+secretKey+'</div>'
              +'<div><b>?대쾲 二쇱쓽 誘몄뀡:</b> '+weeklyMission+'</div>'
            +'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(186,230,253,0.14),rgba(224,231,255,0.15));border:1px solid rgba(125,211,252,0.36);border-radius:10px;padding:11px 12px;">'
              +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
                +'<div style="color:#e0f2fe;font-weight:900;">6. 留덉쓬 ?뚮났 肄붿묶</div>'
                +'<span style="font-size:0.68rem;color:#e0f2fe;border:1px solid rgba(125,211,252,0.55);background:rgba(3,105,161,0.25);padding:2px 7px;border-radius:999px;white-space:nowrap;">?먮쭅??硫붿꽭吏</span>'
              +'</div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;"><b>'+healingTitle+'</b></div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;">'+healingAffirmation+'</div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;">'+healingPartnerTip+'</div>'
              +'<div style="color:#e2e8f0;"><b>?뚮났 猷⑦떞:</b> '+healingRoutine+'</div>'
            +'</div>'
          +'</div>'
        +'</div>';

        var compatCityOptions = '<option value="">?꾩떆 ?좏깮</option>';
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
            +'<h2 class="section-title love-title" style="font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">?㎰ [?먮??먯닔 沅곹빀]</h2>'
            +'<span class="zw-cosmic-chip">Galaxy Synastry</span>'
          +'</div>'
          +'<div class="card-content love-text" style="position:relative;z-index:1;background:rgba(35,24,56,0.46);border:1px solid rgba(216,180,254,0.24);border-radius:10px;padding:11px 12px;margin-bottom:10px;">'
            +'<div style="margin-bottom:8px;">?곷?諛⑹쓽 ?앸뀈?붿씪怨??쒖뼱???쒓컙???낅젰?섎㈃, ?곗븷쨌寃고샎쨌移쒓뎄쨌吏곸옣쨌?ъ뾽 沅곹빀??怨꾩궛?섍퀬 ?꾩깮 ?몄뿰? 蹂꾨룄 由ы룷?몃줈 遺꾩꽍?⑸땲??</div>'
            +'<div class="zw-cosmic-input-grid">'
              +'<label class="zw-cosmic-field"><span>?곷? ?앸뀈?붿씪</span><input id="zwCompatBirthDate" type="date" class="zw-cosmic-control"></label>'
              +'<label class="zw-cosmic-field"><span>?곷? ?쒖뼱???쒓컙</span><input id="zwCompatBirthTime" type="time" value="12:00" class="zw-cosmic-control"></label>'
              +'<label class="zw-cosmic-field"><span>?곷? ?쒖뼱???꾩떆</span><select id="zwCompatBirthCity" class="zw-cosmic-control">'+compatCityOptions+'</select></label>'
              +'<button type="button" onclick="window._runZwCompatibility()" class="zw-cosmic-btn">沅곹빀 蹂닿린</button>'
            +'</div>'
            +'<div id="zwCompatTimeCorrectionInfo" style="margin-top:8px;color:#ddd6fe;font-size:0.82rem;line-height:1.6;background:rgba(30,20,50,0.48);border:1px solid rgba(196,181,253,0.24);border-radius:8px;padding:8px 10px;">?꾩떆 ?좏깮 ??吏꾪깭?묒떆 蹂댁젙(寃쎈룄쨌DST)???먮룞 諛섏쁺?⑸땲??</div>'
          +'</div>'
          +'<div id="zwCompatResult" class="love-text" style="position:relative;z-index:1;background:rgba(20,14,36,0.55);border:1px dashed rgba(196,181,253,0.35);border-radius:10px;padding:11px 12px;color:#ddd6fe;font-size:0.86rem;line-height:1.7;">'
            +'?꾩쭅 ?곷? ?뺣낫媛 ?낅젰?섏? ?딆븯?듬땲?? ?낅젰 ??<b>沅곹빀 蹂닿린</b> 踰꾪듉???뚮윭 二쇱꽭??<br>'
            +'<span style="color:#a5b4fc;">移댄뀒怨좊━: ?곗븷 쨌 寃고샎 쨌 移쒓뎄 쨌 吏곸옣 쨌 ?ъ뾽 + ?꾩깮 ?몄뿰 遺꾨━ 由ы룷??/span>'
          +'</div>'
        +'</div>';

        var sec3 = '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">' +
          '<h2 style="color: #D8B4FE; font-size: 1.2rem; margin-top: 0;">?뙄 [?대┃??沅곸쓽 ????닿린]</h2>' +
          '<div style="line-height: 1.7; margin: 0; font-size: 0.92rem; color:#e2e8f0;">' +
            '<div style="margin-bottom:8px;"><b>?대떦 沅곸쓽 ????섏씠:</b> ' + curDaHan + '??(' + pName + ' ?닿린)</div>' +
            '<div style="margin-bottom:8px;">' + coreLaw + '</div>' +
            '<div style="margin-bottom:10px;">' + sihuaText + '</div>' +
            '<div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);padding:9px 10px;border-radius:8px;margin-bottom:8px;">??<b>醫뗭? ??</b> ' + goodPoint + '</div>' +
            '<div style="background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.35);padding:9px 10px;border-radius:8px;margin-bottom:8px;">?좑툘 <b>二쇱쓽????</b> ' + cautionPoint + '</div>' +
            '<div style="background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.35);padding:9px 10px;border-radius:8px;">?㎛ <b>?댁꽭 議곗뼵:</b> ' + actionTip + '</div>' +
          '</div>' +
        '</div>';

        // ?? ?앹븷 珥앸줎 ??
        var STAR_DAHAN_KW = {
          '?먮?':'?쒖솗??湲곗긽?쇰줈 紐낆삁瑜??ν빐 ?섏븘媛??援ъ“',
          '泥쒓린':'?먮뇤? 湲고쉷?쇰줈 ?쇱뾾??吏꾪솕?섎뒗 援ъ“',
          '?쒖뼇':'鍮쏆쓣 諛쒗븯硫??以묎낵 ?④퍡 ?깆옣?섎뒗 援ъ“',
          '臾닿끝':'媛뺤씤???ㅽ뻾?μ쑝濡??щЪ??援ъ텞?섎뒗 援ъ“',
          '泥쒕룞':'?ъ쑀? ?ъ슜?쇰줈 ?덉젙 ?띿뿉 ?됰났???볥뒗 援ъ“',
          '?쇱젙':'?댁젙怨?媛먭컖?쇰줈 ?붾젮??臾대?瑜?吏諛고븯??援ъ“',
          '泥쒕?':'?덉젙怨?蹂댁닔濡??먯궛??吏?ㅻŉ ?깆옣?섎뒗 援ъ“',
          '?쒖쓬':'?ъ꽭???щ??덉쑝濡??諛??遺瑜??볥뒗 援ъ“',
          '?먮옉':'?ㅼ옱?ㅻ뒫怨??ш탳?μ쑝濡?湲고쉶瑜?李쎌텧?섎뒗 援ъ“',
          '嫄곕Ц':'?좎뭅濡쒖슫 ?듭같濡?吏???먮낯???볥뒗 援ъ“',
          '泥쒖긽':'怨듭젙怨?議고솕濡?議곗쭅???대걚??援ъ“',
          '泥쒕웾':'?ъ슜怨?鰲ｉ썵?쇰줈 洹??蹂듬뜒???볥뒗 援ъ“',
          '移좎궡':'?낅┰怨??뚰뙆?μ쑝濡?寃쎄퀎瑜?遺?섎뒗 援ъ“',
          '?뚭뎔':'?곸떊怨?蹂?섏쑝濡??꾪? ?덈줈???먯쓣 ?щ뒗 援ъ“'
        };
        var mengStars = extractMains(getPStars('紐낃턿'));
        var mengStarMain = mengStars[0] || '';
        var dirText = (pd.direction === 1) ? '?쒗뻾(?녻죱)' : '??뻾(?녻죱)';
        var juVal = pd.ju || 4;
        var lifeSentence = STAR_DAHAN_KW[mengStarMain] || '怨좎쑀???대챸 ?⑦꽩???⑦솕?섍쾶 ?꾧컻?섎뒗 援ъ“';
        var sihuaColors = {'?붾줉':'#4ade80','?붽텒':'#60a5fa','?붽낵':'#c084fc','?붽린':'#f87171'};
        var sihuaSummary = [];
        if (pd.sihuaData) {
          for (var shStar in pd.sihuaData) {
            var shInfo = pd.sihuaData[shStar];
            var sc = sihuaColors[shInfo.type] || '#fff';
            sihuaSummary.push('<span style="color:'+sc+';font-weight:700;">'+shInfo.type+'</span> '+shStar+' ('+shInfo.palaceName+')');
          }
        }
        var sihuaTypeCnt = { '?붾줉':0, '?붽텒':0, '?붽낵':0, '?붽린':0 };
        if (pd.sihuaData) {
          for (var shStar2 in pd.sihuaData) {
            var t = pd.sihuaData[shStar2] && pd.sihuaData[shStar2].type;
            if (sihuaTypeCnt.hasOwnProperty(t)) sihuaTypeCnt[t] += 1;
          }
        }
        var dominantSihuaType = '以묐┰';
        var sihuaMax = 0;
        for (var siT in sihuaTypeCnt) {
          if (sihuaTypeCnt[siT] > sihuaMax) {
            sihuaMax = sihuaTypeCnt[siT];
            dominantSihuaType = siT;
          }
        }
        var destinyAxis = dominantSihuaType === '?붾줉'
          ? '?뺤옣쨌?뚯닔 異?湲고쉶 ?ъ갑??'
          : (dominantSihuaType === '?붽텒'
            ? '沅뚰븳쨌二쇰룄 異?寃곗젙 ?ㅽ뻾??'
            : (dominantSihuaType === '?붽낵'
              ? '?됲뙋쨌?뺤젣 異??덉쭏 ?섑샇??'
              : (dominantSihuaType === '?붽린'
                ? '嫄곕Ц 遊됱씤 異?蹂댁닔 ?댄뻾??'
                : '洹좏삎쨌?곸쓳 異??곹솴 ??묓삎)')));
        var destinyOps = dominantSihuaType === '?붽린'
          ? '?듭떖 ?섏궗寃곗젙? 吏???뱀씤, 怨꾩빟쨌?먭툑? ?ㅼ쨷 寃利? ?멸컙愿怨꾨뒗 湲곕줉 以묒떖?쇰줈 ?댄뻾?좎닔濡??먯떎 諛⑹뼱?μ씠 ?믪븘吏묐땲??'
          : (dominantSihuaType === '?붾줉' || dominantSihuaType === '?붽텒' || dominantSihuaType === '?붽낵'
            ? '媛뺤젏 異??섎굹瑜?紐낇솗???좎젙??90???⑥쐞 ?ㅽ뻾 怨꾪쉷?쇰줈 ?꾩쟻?섎㈃, ?댁꽭 ?뚮룞???ㅼ쭏 ?깃낵濡??꾪솚?섎뒗 ?띾룄媛 鍮⑤씪吏묐땲??'
            : '蹂?숈꽦? ?ъ? ?딆쑝誘濡?猷⑦떞쨌湲곕낯湲걔룸컲蹂듭쓽 吏덉쓣 ?믪씠???댄뻾???κ린 蹂듬━ ?④낵瑜?留뚮벊?덈떎.');
        var sec_grand = '<div style="background:linear-gradient(135deg,rgba(88,28,220,0.15),rgba(20,10,50,0.8));padding:18px;border-radius:10px;margin-bottom:20px;border:1px solid rgba(139,92,246,0.3);">'
          +'<h2 style="color:#F9A8D4;font-size:1.2rem;margin-top:0;border-bottom:1px solid rgba(249,168,212,0.3);padding-bottom:8px;">?뙚 ?앹븷 珥앸줎(?잍땡 潁썼쳳)</h2>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.88rem;margin-bottom:12px;">'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">???ㅽ뻾援?/div><div style="color:#fbbf24;font-weight:700;">'+(pd.juInfo||'-')+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">?봽 ???吏꾪뻾</div><div style="color:#a78bfa;font-weight:700;">'+dirText+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">?렚 紐낃턿(?썲?)</div><div style="color:#ffd700;font-weight:700;">'+(pd.meng||'-')+' 쨌 '+(mengStarMain||'怨듦턿')+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">???좉턿(翁ュ?)</div><div style="color:#6ee7b7;font-weight:700;">'+(pd.shen||'-')+'</div></div>'
          +'</div>'
          +'<div style="font-size:0.9rem;line-height:1.78;color:#e2e8f0;display:flex;flex-direction:column;gap:8px;">'
            +'<div><b style="color:#f9a8d4;">?怨좊궃 ?대챸??湲곗쭏:</b> 紐낃턿 二쇱꽦 '+(mengStarMain||'怨듦턿')+'怨?'+(pd.juInfo||'?ㅽ뻾援?)+'??寃고빀? <b>'+lifeSentence+'</b>?쇰뒗 ?κ린 ?댄뻾 ?⑦꽩???뺤꽦?⑸땲??</div>'
            +'<div><b style="color:#f9a8d4;">?꾧컻 硫붿빱?덉쬁:</b> <span style="color:#fbbf24;">'+juVal+'??/span> 壅룬걢 ?댄썑 ??쒖씠 '+dirText+'?쇰줈 ?묐룞?섎ŉ, 珥덇린 ?④린 ?좏깮蹂대떎 以묒옣湲??꾩쟻 泥쒓린???곹뼢?μ씠 ?ш쾶 ?묒슜?⑸땲??</div>'
            +'<div><b style="color:#f9a8d4;">?ы솕(?쎾뙑) 援ъ“ ?댁꽍:</b> '+(sihuaSummary.length>0 ? sihuaSummary.join(' &nbsp;쨌&nbsp; ') : '吏곸젒 ?묐룞 媛뺣룄媛 ?쏀븳 以묐┰ 諛곗튂')+'</div>'
            +'<div><b style="color:#f9a8d4;">?대챸 異?吏꾨떒:</b> ?꾩옱 紐낆떇???곗꽭 異뺤? <b>'+destinyAxis+'</b>?낅땲?? ?대뒗 ?숈씪???ш굔?대씪???대뼡 諛⑹떇?쇰줈 ?깃낵/?먯떎??遺꾧린?섎뒗吏瑜?寃곗젙?섎뒗 ?듭떖 ?댄뻾 蹂?섏엯?덈떎.</div>'
            +'<div><b style="color:#f9a8d4;">泥쒓린???댁슜 ?먯튃:</b> '+destinyOps+'</div>'
          +'</div>'
        +'</div>';

        // ?? 12?????꾨씪????
        var PALACE_DAHAN_THEME = {
          '紐낃턿':{icon:'?렚',kw:'?먯븘 ?뺣┰쨌?낅┰ ?섏????꾩꽦湲?},
          '?뺤젣沅?:{icon:'?쩃',kw:'?숇즺쨌?묐젰?먯쓽 議곕젰???대챸??諛붽씀???쒓린'},
          '遺泥섍턿':{icon:'?뮂',kw:'寃고샎쨌?숇컲?먃룹＜???뚰듃?덉떗???듭떖 遺꾧린??},
          '?먮?沅?:{icon:'?뙮',kw:'李쎌쓽???깆랬? ?꾧퀎쨌?먮? ?몄뿰??吏묒쨷'},
          '?щ갚沅?:{icon:'?뮥',kw:'?섏엯쨌?ъ옄쨌?먯궛 蹂?숈씠 吏묒빟?섎뒗 援?㈃'},
          '吏덉븸沅?:{icon:'?뺧툘',kw:'嫄닿컯怨??대㈃ ?쒕젴??吏곷㈃?섎ŉ ?ㅼ????쒓린'},
          '泥쒖씠沅?:{icon:'?덌툘',kw:'?댁쭅쨌?댁궗쨌?댁쇅 ?뺤옣?????대룞 媛쒖슫 援ш컙'},
          '?몃났沅?:{icon:'?뫁',kw:'遺?샕룹“吏겶룻빑???몃㎘ ?섑샇媛 ?깊뙣瑜?媛由?},
          '愿濡앷턿':{icon:'?뮳',kw:'而ㅻ━?는룹궗?끒룹궗?뚯쟻 紐낆꽦??吏묒쨷 ?뺤꽦'},
          '?꾪깮沅?:{icon:'?룧',kw:'遺?숈궛쨌怨좎젙?먯궛쨌?異??щ젰???뺤땐 援ш컙'},
          '蹂듬뜒沅?:{icon:'??',kw:'?뺤떊???띿슂쨌?됰났媛먃룸궡硫??깆옣???쒓린'},
          '遺紐④턿':{icon:'?뫇',kw:'遺紐??빧룹쐵?щ엺 ?꾩썝쨌臾몄꽌 ?댁씠 吏묒쨷'}
        };
        var dahanTimelineHtml = '';
        if (pd.daHanList && pd.daHanList.length > 0) {
          pd.daHanList.forEach(function(dh) {
            var dhRawStars = pd.stars[dh.idx];
            var dhMain = extractMains(dhRawStars);
            var dhBad  = extractBad(dhRawStars);
            var dhTheme = PALACE_DAHAN_THEME[dh.palaceName] || {icon:'?뵰',kw:'怨좎쑀???대챸 ?먮쫫??援ш컙'};
            var starKw = dhMain.length > 0 ? (STAR_DAHAN_KW[dhMain[0]] ? dhMain[0]+' ??'+STAR_DAHAN_KW[dhMain[0]].split(' ')[0]+' ?? : dhMain[0]) : '怨듦턿(?좎뿰??蹂??';
            var dhSihua = [];
            if (pd.sihuaData) {
              for (var shS in pd.sihuaData) {
                if (pd.sihuaData[shS].palaceIdx === dh.idx) dhSihua.push({star:shS, info:pd.sihuaData[shS]});
              }
            }
            var hasHwagi  = dhSihua.some(function(s){return s.info.type==='?붽린';});
            var hasHwaroc = dhSihua.some(function(s){return s.info.type==='?붾줉';});
            var borderCol = hasHwagi ? 'rgba(248,113,113,0.6)' : (hasHwaroc ? 'rgba(74,222,128,0.6)' : 'rgba(139,92,246,0.25)');
            var bgCol     = hasHwagi ? 'rgba(248,113,113,0.07)' : (hasHwaroc ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.02)');
            var badges = dhSihua.map(function(s){
              var bc = sihuaColors[s.info.type]||'#fff';
              return '<span style="background:'+bc+'22;color:'+bc+';border:1px solid '+bc+'55;padding:1px 5px;border-radius:4px;font-size:0.68rem;font-weight:700;margin-left:4px;">'+s.info.type+'</span>';
            }).join('');
            dahanTimelineHtml +=
              '<div style="padding:9px 12px;border-left:3px solid '+borderCol+';background:'+bgCol+';border-radius:0 6px 6px 0;margin-bottom:5px;">'
                +'<div style="display:flex;justify-content:space-between;align-items:center;">'
                  +'<div><span style="color:#fbbf24;font-size:0.82rem;font-weight:700;">'+dh.startAge+'~'+dh.endAge+'??/span>'
                  +'<span style="color:#a78bfa;font-size:0.82rem;margin-left:8px;">??'+dhTheme.icon+' '+dh.palaceName+'</span>'+badges+'</div>'
                  +'<span style="color:#94a3b8;font-size:0.73rem;">'+dh.zhi+'</span>'
                +'</div>'
                +'<div style="font-size:0.8rem;color:#cbd5e1;margin-top:3px;"><span style="color:#6ee7b7;">'+starKw+'</span> 쨌 '+dhTheme.kw+'</div>'
              +'</div>';
          });
        }
        var sec_dahan = '<div style="background:rgba(15,15,30,0.8);padding:18px;border-radius:10px;margin-bottom:20px;border:1px solid rgba(139,92,246,0.25);">'
          +'<h2 style="color:#6EE7B7;font-size:1.2rem;margin-top:0;border-bottom:1px solid rgba(110,231,183,0.3);padding-bottom:8px;">?????鸚㏝솏) 12?④퀎 ??꾨씪??/h2>'
          +'<p style="font-size:0.78rem;color:#94a3b8;margin:0 0 10px;">媛???쒖? ??10??二쇨린. <span style="color:#4ade80;">??/span>=?붾줉(湲멸린), <span style="color:#f87171;">??/span>=?붽린(?됯린) ?쒓린.</p>'
          +dahanTimelineHtml
        +'</div>';

        // ?? ?몄깮??3? 蹂怨≪젏 (??긽 3媛??곗텧) ??
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
            var hwagiList  = dhSihua.filter(function(s){ return s.info.type === '?붽린'; });
            var hwarokList = dhSihua.filter(function(s){ return s.info.type === '?붾줉'; });
            var hwakwonList = dhSihua.filter(function(s){ return s.info.type === '?붽텒'; });
            var hwakwaList = dhSihua.filter(function(s){ return s.info.type === '?붽낵'; });

            var impactScore = 0;
            impactScore += hwagiList.length * 8;
            impactScore += hwarokList.length * 6;
            impactScore += hwakwonList.length * 5;
            impactScore += hwakwaList.length * 4;
            impactScore += dhBad.length * 2;
            impactScore += dhAux.length;
            impactScore += dhBorrowed.length * 2;
            if (['紐낃턿','愿濡앷턿','?щ갚沅?,'遺泥섍턿','泥쒖씠沅?].indexOf(dh.palaceName) >= 0) impactScore += 2;

            var pivotType = 'turn';
            var icon = '??';
            if (hwagiList.length > 0 || dhBad.length >= 2) {
              pivotType = 'crisis';
              icon = '?좑툘';
            } else if (hwarokList.length > 0 || hwakwonList.length > 0 || hwakwaList.length > 0 || dhAux.length >= 2) {
              pivotType = 'chance';
              icon = '狩?;
            }

            var mainLabel = dhMain.length ? dhMain.join(' 쨌 ') : '怨듦턿(令뷴?)';
            var borrowedLabel = dhBorrowed.length
              ? ('李⑥꽦 諛섏쁺: '+dhBorrowed.join(' 쨌 '))
              : '李⑥꽦 諛섏쁺: ?놁쓬(?먯꽦 以묒떖)';
            var sihuaLabel = dhSihua.length
              ? dhSihua.map(function(s){ return s.star+' '+s.info.type; }).join(' 쨌 ')
              : '?ы솕 吏곸젒 ?묒슜 ?쏀븿';
            var phaseDirective = pivotType === 'crisis'
              ? '嫄곕Ц 遊됱씤'
              : (pivotType === 'chance' ? '?뺤옣' : '?꾪솚');

            var focusMap = {
              '紐낃턿':'釉뚮옖???듭떖 ??븷 ?ъ젙??,
              '愿濡앷턿':'吏곷Т 沅뚰븳/?듭떖 ?꾨줈?앺듃',
              '?щ갚沅?:'?섏씡 紐⑤뜽/?꾧툑?먮쫫 援ъ“',
              '遺泥섍턿':'?숇컲???묒뾽/?섏궗寃곗젙 猷?,
              '?꾪깮沅?:'?먯궛 諛곗튂/二쇨굅-?щТ ?뺣젹',
              '泥쒖씠沅?:'?대룞/?댁쇅/梨꾨꼸 ?뺤옣',
              '蹂듬뜒沅?:'硫섑깉 ?뚮났??怨좏뭹吏?猷⑦떞',
              '?몃났沅?:'? 鍮뚮뱶/?듭떖 ?몄옱 諛곗튂'
            };
            var leverageMap = {
              '紐낃턿':'?됲뙋 ?먯궛怨?媛쒖씤 釉뚮옖??,
              '愿濡앷턿':'沅뚰븳 ?꾩엫怨??ㅽ뻾 ?몃젰',
              '?щ갚沅?:'?꾧툑/怨꾩빟/?뚯닔 ?ъ씠??,
              '遺泥섍턿':'?뚰듃???좊ː? ??븷 遺꾨떞??,
              '?꾪깮沅?:'怨좎젙?먯궛怨?諛⑹뼱 ?먭툑',
              '泥쒖씠沅?:'?몃? ?ㅽ듃?뚰겕? ?좉퇋 ?쒖옣',
              '蹂듬뜒沅?:'?댁떇 猷⑦떞怨?而⑤뵒???섑샇',
              '?몃났沅?:'?묒뾽 泥닿퀎? ?댁쁺 ?덉감'
            };

            var step1 = (phaseDirective === '?뺤옣'
              ? '?곸듅 ?꾨젰??遺숇뒗 '+(focusMap[dh.palaceName] || '?듭떖 怨쇱젣')+' 遺꾩빞???먯썝??吏묒쨷?섏꽭?? 由ъ냼??遺꾩궛 湲덉?, 1媛??몃옓 吏묒쨷???밸쪧???믪엯?덈떎.'
              : (phaseDirective === '嫄곕Ц 遊됱씤'
                ? '?먯떎 ?뺣쪧?????곸뿭遺??癒쇱? ?좉렇?몄슂. '+(focusMap[dh.palaceName] || '?듭떖 怨쇱젣')+' 愿???섏궗寃곗젙? ?ъ쟾 ?깅Ц ?먭????놁씠???ㅽ뻾?섏? ?딅뒗 猷곗씠 ?꾩슂?⑸땲??'
                : '援ъ“ ?꾪솚???꾩슂??援ш컙?낅땲?? '+(focusMap[dh.palaceName] || '?듭떖 怨쇱젣')+'瑜?以묒떖?쇰줈 ??븷/?곗꽑?쒖쐞瑜??ъ꽕怨꾪븯?몄슂.'));
            var step2 = (phaseDirective === '?뺤옣'
              ? '?덈쾭由ъ???'+(leverageMap[dh.palaceName] || '?듭떖 ?먯궛')+'?낅땲?? ?щ엺/?먯궛 以??깃낵 蹂?섏쑉???믪? ??異뺤뿉 ?덉궛怨??쒓컙??紐곗븘二쇱꽭??'
              : (phaseDirective === '嫄곕Ц 遊됱씤'
                ? '由ъ냼???댁슜? 蹂댁닔?곸쑝濡??꾪솚?섏꽭?? 肄붾뱶 由щ럭?섎벏 怨꾩빟쨌?ъ옄쨌?몄궗 ?섏궗寃곗젙??2??寃利?泥닿퀎濡??듦낵?쒗궎??諛⑹떇???덉쟾?⑸땲??'
                : '由ъ냼?ㅻ뒗 蹂묓뻾蹂대떎 吏곷젹 泥섎━濡??꾪솚?섏꽭?? 以묐났 ?꾨줈?앺듃瑜?以꾩씠怨??듭떖 ?ㅽ뻾??1~2媛쒕쭔 ?좎??댁빞 ?꾪솚鍮꾩슜??媛먯냼?⑸땲??'));
            var step3 = (phaseDirective === '?뺤옣'
              ? '?깃낵 ?뚯닔 ?쒖젏? ?곹뿕 吏?쒓? 2???곗냽 紐⑺몴移섎? ?ъ꽦??吏곹썑?낅땲?? ?댁씡 ?쇰?瑜??뚯닔??諛⑹뼱 ?먯궛?쇰줈 ?대룞?섎㈃ ?곸듅?μ쓽 蹂?숈꽦???≪닔?????덉뒿?덈떎.'
              : (phaseDirective === '嫄곕Ц 遊됱씤'
                ? '?깃낵 ?뚯닔 湲곗????レ옄濡?怨좎젙?섏꽭?? ?먯떎 ?꾧퀎移??꾨떖 ??利됱떆 以묐떒(Stop-Loss), 媛먯젙 媛쒖엯 ?놁씠 ?섑샇 ?덉감?濡?留덈Т由ы빀?덈떎.'
                : '?깃낵 ?뚯닔???щ같移??꾨즺 ??1遺꾧린 ?⑥쐞濡?吏꾪뻾?섏꽭?? ?꾪솚湲곗뿉???띾룄蹂대떎 援ъ“ ?덉젙?붽? 理쒖슦?좎엯?덈떎.'));

            var criticalIssue = '';
            if (hwagiList.length > 0) {
              criticalIssue = '?붽린 媛쒖엯?쇰줈 ?ㅽ뙋/媛덈벑???꾩쟻?????덉뒿?덈떎. 鍮좊Ⅸ 寃곕줎 媛뺤슂? 利됲씎 寃곗젙? ?먯떎 ?뺣쪧???ㅼ썎?덈떎.';
            } else if (dhBad.length >= 2) {
              criticalIssue = '?됱꽦 ?뺣젰?쇰줈 ?쇱젙 吏?걔룰?怨?留덉같쨌鍮꾩슜 珥덇낵媛 ?숈떆 諛쒖깮?????덉뒿?덈떎. ?뱁엳 梨낆엫 寃쎄퀎媛 紐⑦샇?섎㈃ 臾몄젣媛 ?뺣??⑸땲??';
            } else {
              criticalIssue = '???由ъ뒪?щ뒗 ???留?怨쇱떊?쇰줈 ?명븳 ?섑샇 ?꾨씫???꾪뿕 ?ъ씤?몄엯?덈떎. ?섎맆?섎줉 湲곗????먯뒯?섍쾶 留뚮뱾吏 留덉꽭??';
            }

            var protocol1 = hwagiList.length > 0
              ? '以묒슂 ?섏궗寃곗젙? 24?쒓컙 ?됯컖 ???ш??좏븯怨? 怨꾩빟쨌湲덉쟾 ??ぉ? 理쒖냼 2??援먯감 寃利앺빀?덈떎.'
              : '?곗꽑?쒖쐞 3媛쒕? 怨좎젙?섍퀬, 踰붿쐞 諛??붿껌? ?ㅼ쓬 ?ㅽ봽由고듃濡??닿??⑸땲??';
            var protocol2 = dhBad.length >= 2
              ? '媛덈벑 議곗쭚(留먰닾/吏???뚰뵾) 諛쒖깮 ??利됱떆 ?ъ떎-媛먯젙 遺꾨━ ?뚯쓽瑜??댁뼱 臾몄젣瑜?濡쒓렇?뷀빀?덈떎.'
              : '二쇨컙 由щ럭?먯꽌 ?곹뿕 吏???ъ꽦瑜좉낵 嫄곕Ц 吏?쒕? ?④퍡 ?먭??? ?댁긽 吏뺥썑瑜?議곌린 遊됲빀?⑸땲??';

            var oneLineAdvice = phaseDirective === '?뺤옣'
              ? '"吏湲덉? ?띾룄?꾩씠 ?꾨땲???뚯닔 ?ㅺ퀎源뚯? ?ы븿???뺤옣?꾩씠??"'
              : (phaseDirective === '嫄곕Ц 遊됱씤'
                ? '"媛먯젙???꾨땲???섑샇 ?섏떇???뱀떊???먯궛??吏?⑤떎."'
                : '"?꾪솚湲곗쓽 ?뱀옄??鍮좊Ⅸ ?щ엺???꾨땲??援ъ“瑜?癒쇱? 怨좎튇 ?щ엺?대떎."');

            var title = dh.startAge+'~'+dh.endAge+'????? '+dh.palaceName+' 蹂怨≪젏';

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
              order: dhOrderIdx
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

        if (typeof window._toggleZwPivotCard !== 'function') {
          window._toggleZwPivotCard = function(btn, bodyId) {
            var body = document.getElementById(bodyId);
            if (!body) return;
            var expanded = body.style.display !== 'none';
            var nextExpanded = !expanded;
            body.style.display = nextExpanded ? 'block' : 'none';
            if (btn) {
              btn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
              var card = btn.closest ? btn.closest('.zw-pivot-card') : null;
              if (card && card.classList) card.classList.toggle('is-open', nextExpanded);
            }
          };
        }

        var pivotHtml = '';
        var pivotStageLabels = ['珥덈뀈 蹂怨≪젏', '以묐뀈 蹂怨≪젏', '?꾨뀈 蹂怨≪젏'];
        selectedPivots.slice(0,3).forEach(function(p, i){
          var bc = p.type==='crisis' ? '#f87171' : (p.type==='chance' ? '#4ade80' : '#a78bfa');
          var bcRgb = p.type==='crisis' ? '248,113,113' : (p.type==='chance' ? '74,222,128' : '167,139,250');
          var stageLabel = pivotStageLabels[i] || ('蹂怨≪젏 '+(i+1));
          var cardId = 'zwPivotCard_'+p.key;
          pivotHtml += '<div class="zw-pivot-card" style="--pivot-accent:'+bc+';--pivot-rgb:'+bcRgb+';">'
            +'<button type="button" class="zw-pivot-toggle" aria-expanded="false" onclick="window._toggleZwPivotCard(this, \''+cardId+'\')">'
              +'<div class="zw-pivot-meta">'
                +'<span class="zw-pivot-chip">'+stageLabel+'</span>'
                +'<span class="zw-pivot-headline">'+p.icon+' '+p.title+'</span>'
              +'</div>'
              +'<span class="zw-pivot-meta-right">'
                +'<span class="zw-pivot-age">'+p.age+'</span>'
                +'<span class="zw-pivot-chevron" aria-hidden="true">??/span>'
              +'</span>'
            +'</button>'
            +'<div id="'+cardId+'" class="zw-pivot-body">'
              +'<div style="margin-bottom:6px;"><b>????먮쫫:</b> ['+p.period+'] '+p.phaseTheme+'</div>'
              +'<div style="margin-bottom:6px;"><b>?듭떖 二쇱꽦:</b> '+p.coreStars+' / <b>?ы솕:</b> '+p.sihuaLabel+' / <span style="color:#c4b5fd;">'+p.borrowedLabel+'</span></div>'
              +'<div style="margin-bottom:6px;"><b>?깆슫 ??줈 | ???쒓린 ?ㅽ뻾 議곗뼵</b></div>'
              +'<div style="margin-bottom:4px;">1) '+p.step1+'</div>'
              +'<div style="margin-bottom:4px;">2) '+p.step2+'</div>'
              +'<div style="margin-bottom:6px;">3) '+p.step3+'</div>'
              +'<div style="margin-bottom:6px;"><b>嫄곕Ц ?뚮룞 | ???쒓린 二쇱쓽 議곗뼵</b></div>'
              +'<div style="margin-bottom:4px;">- <b>二쇱쓽??</b> '+p.criticalIssue+'</div>'
              +'<div style="margin-bottom:4px;">- <b>??묐쾿:</b> 1) '+p.protocol1+' 2) '+p.protocol2+'</div>'
              +'<div style="margin-bottom:2px;">- <b>??以?議곗뼵:</b> '+p.oneLineAdvice+'</div>'
            +'</div>'
          +'</div>';
        });

        var sec_pivot = '<div class="zw-pivot-section">'
          +'<h2 class="zw-pivot-title">?뵳 ?몄깮??3? 蹂怨≪젏</h2>'
          +'<p class="zw-pivot-sub">?ы솕(?쎾뙑), 二쇱꽦/蹂댁“???됱꽦, 李⑥꽦(?沅?李⑥슜)???듯빀 諛섏쁺??3媛?移대뱶?낅땲?? 移대뱶瑜??뚮윭 ?대떦 ?쒓린 留욎땄 議곗뼵???뺤씤?섏꽭??</p>'
          +'<div class="zw-pivot-deck">'+pivotHtml+'</div>'
        +'</div>';

        var sec4 = '';

        var contentHtml = '';
        if (clickOnly) {
          contentHtml = '<div style="font-family:\'Suit\',sans-serif; background:#121212; color:#E2E8F0; padding:20px; border-radius:12px; width:100%; box-sizing:border-box;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:2px solid #8B5CF6;padding-bottom:12px;margin-bottom:16px;">'
            + '<h1 style="margin:0;color:#C084FC;font-size:1.2rem;">沅?若? ?댁꽍 ?붿빟</h1>'
            + (showClose ? '<button type="button" class="zw-report-close-btn zw-summary-close-btn" onclick="window._closeZwDetailReport()">?붿빟 ?リ린</button>' : '')
            + '</div>'
            + sec1
            + sec3
            + '</div>';
        } else {
          contentHtml = '<div style="font-family:\'Suit\',sans-serif; background:#121212; color:#E2E8F0; padding:20px; border-radius:12px; width:100%; box-sizing:border-box;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:2px solid #8B5CF6;padding-bottom:15px;margin-bottom:20px;">'
            + '<h1 style="margin:0;color:#C084FC;font-size:1.5rem;">?먮??먯닔 泥쒕챸(鸚⒴뫝) 醫낇빀 由ы룷??/h1>'
            + (showClose ? '<button type="button" class="zw-report-close-btn" onclick="window._closeZwComprehensiveReport()">由ы룷???リ린 ??/button>' : '')
            + '</div>'
            + sec_persona + sec_ability + sec_hidden_power + sec_love_compat_spread + sec_love + sec_compat + sec_grand + sec2 + sec_dahan + sec_pivot
            + '</div>';
        }

        var radarBaseLabels = {psy:['?좎옱??,'由щ뜑??,'?뚮났?꾨젰??,'李쎌쓽??,'?ㅽ듃?덉뒪'],rel:['?몃났','寃곗냽??,'?댁꽦留ㅻ젰','愿怨꾪솗??,'留덉같??],fin:['?섏씡李쎌텧','?먯궛蹂댁〈','吏곸뾽?덉젙','?뚰뙆??,'?뚯옱?먯떎'],time:['?쒕룞??,'?곸쓳??,'紐낆삁??,'蹂?붿???,'?뚮컻蹂??],well:['?좎껜媛뺢굔','硫섑깉耳??,'硫댁뿭??,'?됰났吏??,'遺덉븞??]};   

        var labels = radarBaseLabels[theme] || radarBaseLabels['psy'];
        var mCnt = stars.main.length; var aCnt = stars.aux.length; var bCnt = stars.bad.length;
        var r1 = Math.min(100, 50 + mCnt*15 + aCnt*5);
        var r2 = Math.min(100, 60 + mCnt*10 + (pName==='紐낃턿'?20:0));
        var r3 = Math.min(100, 40 + aCnt*20 + mCnt*5);
        var r4 = Math.min(100, 55 + (pName==='泥쒖씠沅?||pName==='愿濡앷턿'?30:0));
        var r5 = Math.min(100, 20 + bCnt*25);

        var panelHtml = '';
        if (showRadar) {
          panelHtml = "<div class=\"zw-insight-layout\">"
            + "  <div class=\"zw-radar-col\">"
            + "    <div class=\"zw-radar-caption\">" + pName + " ?먮꼫吏 ?ㅽ럺?몃읆</div>"
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
              ctx3.fillText('A蹂꾩옄由?, leftClusterX - 28, clusterY - 82);
              ctx3.fillText('B蹂꾩옄由?, rightClusterX - 24, clusterY - 82);
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
                label: pName + ' ?ㅽ꺈',
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

  // 醫낇빀 由ы룷?몃뒗 留??뚮뜑 ?ъ씠?대쭏??媛깆떊?댁빞 紐⑤컮???ъ쭊????濡쒕뵫 臾멸뎄??硫덉텛吏 ?딅뒗??
  var defaultIdx = (window._currentZiweiData && window._currentZiweiData.palacesByIndex)
    ? window._currentZiweiData.palacesByIndex.indexOf('紐낃턿')
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

function renderSummary(p,johu,natal){
  var dg=p.d.g,dayMaster=p.d.gE||'earth';
  var health=HEALTH_DATA[dayMaster]||HEALTH_DATA.earth;
  var domE=natal.dominant;
  var tips=getGaeunTips(domE);

  var cnt={};
  [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
    var t=getTenGod(dg,c);if(t&&t!=='?')cnt[t]=(cnt[t]||0)+1;
  });
  var dominant=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];})[0]||'?앹떊';
  var deep=TS_DEEP[dominant]||TS_DEEP['?앹떊'];
  var tsInfo=TS_DB[dominant]||TS_DB['?앹떊'];
  var dayNames={wood:'?깆옣?섎뒗 ?섎Т',fire:'??ㅻⅤ??遺덇퐙',earth:'?ъ슜?섎뒗 ?吏',metal:'?⑤떒??諛붿쐞',water:'?먮Ⅴ??媛뺣Ъ'};
  var ratStr=Object.keys(natal.ratios).map(function(e){return EL_K[e]+' '+natal.ratios[e].toFixed(0)+'%';}).join(' 쨌 ');
  var pw=G_POWER,jg=G_JONG;

  var html=
    '<div class="prem-box">'+
    '<span class="prem-title">?뙜截?議고썑(沃욕? ?먯젙</span>'+
    '<div class="prem-text"><span class="johu-badge '+johu.badgeCls+'">'+johu.badgeTxt+'</span><br>'+
    johu.advice+'<br><br>'+
    '<span style="color:#888;font-size:.82rem">??는룹꽭???먮떒 ??議고썑媛 ?듬?? ?④퍡 ?듭떖 湲곗??낅땲??</span>'+
    '</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?뽳툘 ?듬?(?묉돳) & 醫낃꺽(孃욄졏) ?붿빟</span>'+
    '<div class="prem-text">'+
    (jg&&jg.isJong
      ?'<b>'+jg.name+'</b> ??'+EL_K[jg.dominant]+' 湲곗슫 '+jg.pct+'% 吏諛?br>???ъ＜??'+EL_K[jg.dominant]+' 湲곗슫怨??④퍡?섎뒗 紐⑤뱺 寃껋씠 湲????⑸땲?? 諛섑븯???먮쫫? ?????⑸땲??'
      :pw
        ?'<span class="power-badge '+(pw.isStrong?'pb-strong':'pb-weak')+'" style="font-size:.78rem;padding:3px 10px">'+(pw.isStrong?'?뵦 ?좉컯':'?뮛 ?좎빟')+'</span><br>'+
         '?듬? ?먯닔 '+pw.score+'????'+(pw.isStrong?'?⑹떊(?ㅺ린쨌??룰?)???ㅻ뒗 ?댁뿉???ы쉶???깆랬媛 ??컻?⑸땲??':'?⑹떊(鍮꾧쾪쨌?몄꽦)???ㅻ뒗 ?댁뿉???먯〈媛먭낵 洹?몄씠 ?④퍡 ?듬땲??')
        :'')+
    '</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?㎛ ?ㅽ뻾 遺꾪룷 & ?좊┝ ?먯젙</span>'+
    '<div class="prem-text">'+
    (natal.counts[domE]>=5?'?뵶 <b>'+EL_K[domE]+' 湲곗슫??留ㅼ슦 媛뺥븯寃??몄쨷</b>?섏뼱 ?덉뼱?? 諛섎뱶??洹좏삎 議곗젅???꾩슂?⑸땲??'
      :natal.counts[domE]>=4?'?윝 <b>'+EL_K[domE]+' 湲곗슫??媛뺥븯寃??좊젮</b> ?덉뒿?덈떎. ?곴레?곸씤 洹좏삎 議곗젅??沅뚰빀?덈떎.'
      :natal.counts[domE]>=3?'?윞 <b>'+EL_K[domE]+' 湲곗슫???ㅼ냼 媛뺥븯寃??먮━</b>?↔퀬 ?덉뒿?덈떎. ?섏떇?곸씤 洹좏삎???꾩????⑸땲??'
      :'?윟 ?ㅽ뻾??鍮꾧탳??怨좊Ⅴ寃?遺꾪룷?섏뼱 ?덉뒿?덈떎. 洹좏삎?≫엺 ?ъ＜?낅땲??')+'<br>'+
    '<span class="hl">?ㅽ뻾 鍮꾩쑉:</span> '+ratStr+'<br><br>'+
    '<span class="hl">媛쒖슫 ?듭떖:</span> 媛뺥븳 <b>'+EL_K[domE]+'</b> 湲곗슫????＜?섏? ?딄쾶, '+
    '<b>'+EL_K[tips.controller]+'</b>(洹?怨?<b>'+EL_K[tips.drain]+'</b>(?ㅺ린)?쇰줈 ?뚮윭二쇱꽭??'+
    '</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?㎚ ?怨좊궃 蹂몄쭏 (?쇨컙 '+p.d.g+' '+EL_K[dayMaster]+')</span>'+
    '<div class="prem-text">'+
    '?뱀떊? ?먯뿰?쇰줈 移섎㈃ <b>\''+dayNames[dayMaster]+'\'</b>怨?媛숈뒿?덈떎.<br>'+
    '蹂댁쑀 ??꽦 <b>'+dominant+'('+tsInfo.desc+')</b>???몄깮??諛⑺뼢????븷???⑸땲??'+
    '</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?쫨 ?깃꺽怨?湲곗쭏 (?⑺듃 泥댄겕)</span>'+
    '<div class="prem-text">'+deep.nature+'</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?뮳 吏꾨줈 ?곸꽦 & ?깃났 泥쒓린</span>'+
    '<div class="prem-text"><span class="hl">異붿쿇 吏곸뾽:</span> '+deep.career+'<br><br>'+
    '?깃났???꾪빐?쒕뒗 ?뱀떊??媛뺤젏??<b>'+tsInfo.meaning+'</b>??瑜? ?대젮???⑸땲??'+
    '</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?뮊 ?곗븷 & 寃고샎 ?ㅽ???/span>'+
    '<div class="prem-text">'+deep.love+'</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?쪞 嫄닿컯 & ?뚯슱 ?몃뱶</span>'+
    '<div class="prem-text">'+
    '?怨좊굹湲?<b>'+health.weak+'</b> 履쎌씠 ?쏀빐吏????덉쑝??誘몃━ ?섑샇?섏꽭??<br>'+
    '<span class="hl">異붿쿇 ?뚯떇:</span> '+health.food+'<br>'+
    '<span class="hl">嫄닿컯 議곗뼵:</span> '+health.advice+
    '</div></div>'+

    '<div class="prem-box">'+
    '<span class="prem-title">?? 媛쒖슫 猷⑦듃 (媛뺥븳 '+EL_K[domE]+' ?꾨Ⅴ湲?</span>'+
    '<div class="prem-text">'+
    '<div class="tip-grid">'+
    '<div class="tip-chip"><strong>洹??뚮윭二쇨린): '+EL_K[tips.controller]+'</strong>'+
    '?렓 '+tips.ctips.color+'<br>?룧 '+tips.ctips.place+'<br>?㎛ '+tips.ctips.action+'<br>?띂截?'+tips.ctips.food+'</div>'+
    '<div class="tip-chip"><strong>?ㅺ린(遺꾩궛): '+EL_K[tips.drain]+'</strong>'+
    '?렓 '+tips.dtips.color+'<br>?룧 '+tips.dtips.place+'<br>?㎛ '+tips.dtips.action+'<br>?띂截?'+tips.dtips.food+'</div>'+
    '</div></div></div>'+

    '<div class="prem-box" style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border-color:#A5D6A7">'+
    '<span class="prem-title" style="border-color:#4CAF50;color:#2E7D32">?? ?곗씠???꾩떎 議곗뼵 ??'+USER_NAME+'?섎쭔???꾪븳 ?댁빞湲?/span>'+
    '<div class="prem-text">'+generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';

  document.getElementById('summaryArea').innerHTML=html;
}

const CELEB_CATS=['嫄멸렇猷?,'蹂댁씠洹몃９','媛?샕룹넄濡?,'諛곗슦','湲濡쒕쾶湲곗뾽??,'援?궡湲곗뾽??,'湲濡쒕쾶?뺤튂??,'援?궡?뺤튂??];
const CELEBS=[
  /* ????? 嫄멸렇猷?????? */
  {cat:'嫄멸렇猷?,name:'?댁쭊???섎땲',birth:'2004-10-06',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?댁쭊??誘쇱?',birth:'2004-07-18',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?댁쭊???ㅻ땲??,birth:'2005-04-11',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?댁쭊???대┛',birth:'2006-05-18',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?댁쭊???쒖씤',birth:'2007-10-18',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?꾩씠釉??덉쑀吏?,birth:'2003-09-01',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씠釉??μ썝??,birth:'2004-08-31',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씠釉??덉씠',birth:'2004-10-03',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씠釉?由ъ쫰',birth:'2004-11-21',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씠釉?媛??,birth:'2002-09-24',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씠釉??댁꽌',birth:'2007-02-03',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?먯뒪??移대━??,birth:'2000-04-11',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?먯뒪??吏??,birth:'2000-10-30',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?먯뒪???덊꽣',birth:'2001-01-01',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?먯뒪???앸떇',birth:'2002-10-23',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'瑜댁꽭?쇳븣 源梨꾩썝',birth:'2000-08-05',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'瑜댁꽭?쇳븣 ?ъ퓼??,birth:'1998-04-19',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'瑜댁꽭?쇳븣 ?덉쑄吏?,birth:'2001-10-08',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'瑜댁꽭?쇳븣 移댁쫰??,birth:'2003-08-09',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'瑜댁꽭?쇳븣 ?띿?梨?,birth:'2004-09-29',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'(?ъ옄)?꾩씠???뚯뿰',birth:'1998-08-26',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'(?ъ옄)?꾩씠???곌린',birth:'1999-08-26',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'(?ъ옄)?꾩씠??誘몄뿰',birth:'1997-01-20',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'(?ъ옄)?꾩씠???덊솕',birth:'2000-08-26',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'(?ъ옄)?꾩씠??誘쇰땲',birth:'1997-10-23',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'釉붾옓?묓겕 吏??,birth:'1995-01-03',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'釉붾옓?묓겕 ?쒕땲',birth:'1996-01-16',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'釉붾옓?묓겕 濡쒖젣',birth:'1997-02-11',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'釉붾옓?묓겕 由ъ궗',birth:'1997-03-27',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 ?섏뿰',birth:'1995-09-22',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 ?뺤뿰',birth:'1996-09-01',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 紐⑤え',birth:'1996-11-09',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 ?щ굹',birth:'1996-12-29',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 吏??,birth:'1997-02-01',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 誘몃굹',birth:'1997-03-24',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 ?ㅽ쁽',birth:'1998-05-28',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 梨꾩쁺',birth:'1999-04-23',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?몄??댁뒪 易붿쐞',birth:'2000-01-14',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?덈뱶踰⑤껙 ?꾩씠由?,birth:'1991-03-29',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덈뱶踰⑤껙 ?ш린',birth:'1994-02-10',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덈뱶踰⑤껙 ?щ뵒',birth:'1994-02-21',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덈뱶踰⑤껙 議곗씠',birth:'1996-09-03',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덈뱶踰⑤껙 ?덈━',birth:'1999-08-05',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?덉? ?덉?',birth:'2000-09-26',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덉? 由ъ븘',birth:'2001-07-21',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덉? 瑜섏쭊',birth:'2001-04-17',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덉? 梨꾨졊',birth:'2001-10-05',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?덉? ?좊굹',birth:'2003-12-09',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?ㅻ쭏?닿구 ?⑥젙',birth:'1994-12-30',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?ㅻ쭏?닿구 誘몃?',birth:'1995-03-28',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?ㅻ쭏?닿구 ?좎븘',birth:'1995-04-17',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?ㅻ쭏?닿구 ?꾨┛',birth:'2000-06-17',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?꾩씪由?紐⑥뭅',birth:'2004-12-10',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씪由??먰씗',birth:'2004-01-27',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씪由?誘쇱＜',birth:'2004-03-26',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?꾩씪由??대줈??,birth:'2003-01-05',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?ㅽ뀒?댁뵪 ?섎?',birth:'2003-02-04',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?ㅽ뀒?댁뵪 ?쒖?',birth:'2003-05-29',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?ㅽ뀒?댁뵪 ?꾩씠??,birth:'2004-09-25',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?ㅽ뀒?댁뵪 ?몄?',birth:'2004-10-30',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?ㅽ뀒?댁뵪 ?ъ씠',birth:'2004-12-09',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'耳?뚮윭 ?좎쭊',birth:'2003-05-19',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'耳?뚮윭 ?ㅼ삤??,birth:'2002-08-05',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'耳?뚮윭 ?ㅼ뿰',birth:'2003-12-04',hour:12,minute:0},

  {cat:'嫄멸렇猷?,name:'?쇳봽?고뵾?꾪떚 ?덈굹',birth:'2004-04-06',hour:12,minute:0},
  {cat:'嫄멸렇猷?,name:'?쇳봽?고뵾?꾪떚 ?꾨?',birth:'2001-11-23',hour:12,minute:0},

  /* ????? 蹂댁씠洹몃９ ????? */
  {cat:'蹂댁씠洹몃９',name:'BTS RM',birth:'1994-09-12',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'BTS 吏?,birth:'1992-12-04',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'BTS ?덇?',birth:'1993-03-09',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'BTS ?쒖씠??,birth:'1994-02-18',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'BTS 吏誘?,birth:'1995-10-13',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'BTS 酉?,birth:'1995-12-30',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'BTS ?뺢뎅',birth:'1997-09-01',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?묒냼 ?섑샇',birth:'1991-05-22',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?묒냼 諛깊쁽',birth:'1992-05-06',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?묒냼 泥?,birth:'1992-09-21',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?묒냼 李ъ뿴',birth:'1992-11-27',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?묒냼 移댁씠',birth:'1994-01-14',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?묒냼 ?명썕',birth:'1994-04-12',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?ㅼ씠???쒕?',birth:'1993-07-18',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?ㅼ씠????,birth:'1991-09-23',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?ㅼ씠??誘쇳샇',birth:'1991-12-09',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?몃툙???먯뒪荑깆뒪',birth:'1995-04-08',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?몃툙??誘쇨퇋',birth:'1997-02-06',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?몃툙???먯슦',birth:'1996-08-17',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?몃툙???꾧껴',birth:'1997-02-06',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?몃툙???밴?',birth:'1998-01-16',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'NCT ?쒖슜',birth:'1995-07-01',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'NCT ?ы쁽',birth:'1997-02-13',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'NCT 留덊겕',birth:'1999-08-02',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'NCT ?댁갔',birth:'2000-06-06',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?ㅽ듃?덉씠?ㅼ쫰 諛⑹갔',birth:'1997-10-03',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?ㅽ듃?덉씠?ㅼ쫰 ?꾨┃??,birth:'2000-09-15',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?ㅽ듃?덉씠?ㅼ쫰 ?꾩쭊',birth:'2000-03-20',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?ㅽ듃?덉씠?ㅼ쫰 ?꾩씠??,birth:'2001-02-07',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?щえ濡쒖슦諛붿씠?ш쾶???섎퉰',birth:'2000-12-05',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?щえ濡쒖슦諛붿씠?ш쾶???곗?',birth:'2002-09-13',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?щえ濡쒖슦諛붿씠?ш쾶??踰붽퇋',birth:'2003-03-13',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?щえ濡쒖슦諛붿씠?ш쾶???쒗쁽',birth:'2002-02-05',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?뷀븯?댄뵂 ?뺤썝',birth:'2004-02-09',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?뷀븯?댄뵂 ?ъ듅',birth:'2004-10-15',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?뷀븯?댄뵂 ?덊궎',birth:'2005-12-09',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?쒕줈踰좎씠?ㅼ썝 ?쒖쑀吏?,birth:'2002-11-14',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?쒕줈踰좎씠?ㅼ썝 源吏??,birth:'2001-04-05',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?쒕줈踰좎씠?ㅼ썝 ?깊븳鍮?,birth:'2003-09-09',hour:12,minute:0},

  {cat:'蹂댁씠洹몃９',name:'?꾩뒪?몃줈 李⑥???,birth:'1997-03-30',hour:12,minute:0},
  {cat:'蹂댁씠洹몃９',name:'?꾩뒪?몃줈 MJ',birth:'1994-03-05',hour:12,minute:0},

  /* ????? 媛?샕룹넄濡?????? */
  {cat:'媛?샕룹넄濡?,name:'?꾩씠??,birth:'1993-05-16',hour:15,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?쒖뿰',birth:'1989-03-09',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'泥?븯',birth:'1996-02-09',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?붿궗',birth:'1995-07-23',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?붾씪',birth:'1991-02-22',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'臾몃퀎',birth:'1992-12-22',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?좊?',birth:'1992-12-02',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?⑤┛',birth:'1989-01-11',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?ㅼ씠利?,birth:'1994-08-07',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?댁쁺吏',birth:'2002-02-09',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'吏肄?,birth:'1992-09-14',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'諛뺤옱踰?,birth:'1987-01-25',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'鍮덉???,birth:'1987-04-10',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'??,birth:'1992-09-10',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?щ윭??,birth:'1992-05-03',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'洹몃젅??,birth:'1986-12-21',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?몃????댁쁺吏',birth:'2002-02-09',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'鍮꾨퉬',birth:'1997-11-26',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'諛깆삁由?,birth:'1997-05-07',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?대Т吏?,birth:'2000-08-13',hour:12,minute:0},
  {cat:'媛?샕룹넄濡?,name:'?댄궡',birth:'1992-02-16',hour:12,minute:0},

  /* ????? 諛곗슦 ????? */
  {cat:'諛곗슦',name:'蹂?곗꽍',birth:'1994-04-27',hour:12,minute:0},
  {cat:'諛곗슦',name:'源?섑쁽',birth:'1988-02-04',hour:12,minute:0},
  {cat:'諛곗슦',name:'源吏??,birth:'1992-09-22',hour:12,minute:0},
  {cat:'諛곗슦',name:'怨좎쑄??,birth:'1996-04-11',hour:12,minute:0},
  {cat:'諛곗슦',name:'?대룄??,birth:'1995-04-21',hour:12,minute:0},
  {cat:'諛곗슦',name:'?꾩???,birth:'1990-07-02',hour:12,minute:0},
  {cat:'諛곗슦',name:'諛뺤?鍮?,birth:'1992-09-04',hour:12,minute:0},
  {cat:'諛곗슦',name:'?쒖냼??,birth:'1994-11-18',hour:12,minute:0},
  {cat:'諛곗슦',name:'李⑥???,birth:'1997-03-30',hour:12,minute:0},
  {cat:'諛곗슦',name:'濡쒖슫',birth:'1995-09-30',hour:12,minute:0},
  {cat:'諛곗슦',name:'?덊슚??,birth:'1991-07-01',hour:12,minute:0},
  {cat:'諛곗슦',name:'?↔컯',birth:'1994-04-23',hour:12,minute:0},
  {cat:'諛곗슦',name:'源?쒖쑄',birth:'2000-01-31',hour:12,minute:0},
  {cat:'諛곗슦',name:'諛뺣낫寃',birth:'1993-06-16',hour:12,minute:0},
  {cat:'諛곗슦',name:'源?좏샇',birth:'1990-05-08',hour:12,minute:0},
  {cat:'諛곗슦',name:'?⑥＜??,birth:'1994-02-22',hour:12,minute:0},
  {cat:'諛곗슦',name:'理쒖슦??,birth:'1990-12-26',hour:12,minute:0},
  {cat:'諛곗슦',name:'源?ㅻ?',birth:'1995-04-09',hour:12,minute:0},
  {cat:'諛곗슦',name:'?꾪븯以',birth:'1987-03-10',hour:12,minute:0},
  {cat:'諛곗슦',name:'?뺥빐??,birth:'1988-05-01',hour:12,minute:0},
  {cat:'諛곗슦',name:'?좏삙??,birth:'1989-08-29',hour:12,minute:0},
  {cat:'諛곗슦',name:'留덈룞??,birth:'1971-03-01',hour:12,minute:0},
  {cat:'諛곗슦',name:'?먯꽍援?,birth:'1983-11-12',hour:12,minute:0},
  {cat:'諛곗슦',name:'?댁젙??,birth:'1972-03-15',hour:12,minute:0},
  {cat:'諛곗슦',name:'怨듭쑀',birth:'1979-07-10',hour:12,minute:0},
  {cat:'諛곗슦',name:'?대퀝??,birth:'1970-07-12',hour:12,minute:0},
  {cat:'諛곗슦',name:'源?쒕━',birth:'1990-01-24',hour:12,minute:0},
  {cat:'諛곗슦',name:'?④턿誘?,birth:'1978-06-23',hour:12,minute:0},
  {cat:'諛곗슦',name:'泥쒖슦??,birth:'1990-01-26',hour:12,minute:0},
  {cat:'諛곗슦',name:'?댁젣??,birth:'1986-06-15',hour:12,minute:0},

  /* ????? 湲濡쒕쾶湲곗뾽??????? */
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?쇰줎 癒몄뒪??,birth:'1971-06-28',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?쒗봽 踰좎씠議곗뒪',birth:'1964-01-12',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'留덊겕 ?而ㅻ쾭洹?,birth:'1984-05-14',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?뚮윴 踰꾪븦',birth:'1930-08-30',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?좎뒯 ??,birth:'1963-02-17',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'踰좊Ⅴ?섎Ⅴ ?꾨Ⅴ??,birth:'1949-03-05',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?섎━ ?섏씠吏',birth:'1973-03-26',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?몃Ⅴ寃뚯씠 釉뚮┛',birth:'1973-08-21',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'? 荑?,birth:'1960-11-01',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'???ы듃癒?,birth:'1985-04-22',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?ы떚???섎뜽??,birth:'1967-08-06',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'??留?,birth:'1964-09-10',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'留덊솕??,birth:'1971-10-29',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'由ъ궗 ??,birth:'1969-11-07',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?섎━ ?섎━??,birth:'1944-08-17',hour:12,minute:0},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?먯젙??,birth:'1957-08-11',hour:12,minute:0},

  /* ????? 援?궡湲곗뾽??????? */
  {cat:'援?궡湲곗뾽??,name:'?댁옱??,birth:'1968-06-23',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'理쒗깭??,birth:'1960-12-03',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?뺤쓽??,birth:'1970-10-18',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'援ш킅紐?,birth:'1978-06-26',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?좊룞鍮?,birth:'1955-02-14',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'源踰붿닔',birth:'1966-03-13',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?댄빐吏?,birth:'1967-06-22',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?쒖젙吏?,birth:'1957-01-26',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'諛⑹떆??,birth:'1972-08-09',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?뺤슜吏?,birth:'1968-05-26',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?대?吏?,birth:'1970-10-08',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?띾씪??,birth:'1945-03-27',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'議고쁽以',birth:'1968-09-30',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?뺢린??,birth:'1982-02-17',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'?덊깭??,birth:'1962-01-12',hour:12,minute:0},
  {cat:'援?궡湲곗뾽??,name:'源?뱀뿰',birth:'1952-09-07',hour:12,minute:0},

  /* ????? 湲濡쒕쾶?뺤튂??????? */
  {cat:'湲濡쒕쾶?뺤튂??,name:'?꾨꼸???몃읆??,birth:'1946-06-14',hour:10,minute:54},
  {cat:'湲濡쒕쾶?뺤튂??,name:'議?諛붿씠??,birth:'1942-11-20',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'踰꾨씫 ?ㅻ컮留?,birth:'1961-08-04',hour:19,minute:24},
  {cat:'湲濡쒕쾶?뺤튂??,name:'?쒖쭊??,birth:'1953-06-15',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'釉붾씪?붾?瑜??명떞',birth:'1952-10-07',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'?먮쭏?섏뿕 留덊겕濡?,birth:'1977-12-21',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'?щ씪???꾩툩',birth:'1958-06-14',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'由ъ떆 ?섎궢',birth:'1980-05-12',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'湲곗떆???꾨???,birth:'1957-07-29',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'?섎젋?쒕씪 紐⑤뵒',birth:'1950-09-17',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'蹂쇰줈?붾?瑜??ㅻ젋?ㅽ궎',birth:'1978-01-25',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'?숆쾾??硫붾Ⅴ耳?,birth:'1954-07-17',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'?먮윭由??대┛??,birth:'1947-10-26',hour:8,minute:2},
  {cat:'湲濡쒕쾶?뺤튂??,name:'留덇굅由??泥?,birth:'1925-10-13',hour:9,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'?꾨쿋 ?좎“',birth:'1954-09-21',hour:12,minute:0},
  {cat:'湲濡쒕쾶?뺤튂??,name:'移대쭚???대━??,birth:'1964-10-20',hour:21,minute:28},

  /* ????? 援?궡?뺤튂??????? */
  {cat:'援?궡?뺤튂??,name:'?ㅼ꽍??,birth:'1960-12-18',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'臾몄옱??,birth:'1953-01-24',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'諛뺢렐??,birth:'1952-02-02',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?대챸諛?,birth:'1941-12-19',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?몃Т??,birth:'1946-09-01',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'源?以?,birth:'1924-01-06',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'源?곸궪',birth:'1927-12-20',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?명깭??,birth:'1932-12-04',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?꾨몢??,birth:'1931-01-18',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'諛뺤젙??,birth:'1917-09-30',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?댁듅留?,birth:'1875-03-26',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?댁옱紐?,birth:'1964-12-22',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?쒕룞??,birth:'1973-06-23',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'議곌뎅',birth:'1965-05-27',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?ㅼ꽭??,birth:'1961-04-08',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?덉쿋??,birth:'1962-02-26',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?띿???,birth:'1954-04-24',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?섍꼍??,birth:'1963-04-17',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'源?숈뿰',birth:'1957-10-24',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?먰씗猷?,birth:'1964-08-30',hour:12,minute:0},
  {cat:'援?궡?뺤튂??,name:'?댁???,birth:'1985-03-30',hour:12,minute:0}
];

var CELEB_CAT_ICONS={
  '?꾩껜':'??,'嫄멸렇猷?:'?뭴','蹂댁씠洹몃９':'?빜','媛?샕룹넄濡?:'?렎',
  '諛곗슦':'?렗','湲濡쒕쾶湲곗뾽??:'?뙋','援?궡湲곗뾽??:'?뮳',
  '湲濡쒕쾶?뺤튂??:'?뙇','援?궡?뺤튂??:'?룢截?
};

// ?? 援?? ?ㅼ젙 (Config-driven, ??援?????ш린?먮쭔 異붽??섎㈃ ?? ?????????????????
const COUNTRY_CONFIG = {
  'KR': { label: '?쒓뎅',  flag: '?눖?눟', order: 1 },
  'JP': { label: '?쇰낯',  flag: '?눓?눝', order: 2 },
  'CN': { label: '以묎뎅',  flag: '?눊?눛', order: 3 },
  'US': { label: '誘멸뎅',  flag: '?눣?눡', order: 4 },
  'IN': { label: '?몃룄',  flag: '?눒?눛', order: 5 },
  'EU': { label: '?좊읇',  flag: '?뙇', order: 6 }
};

// ?? Nationality Backfill: 湲곗〈 ??ぉ??nationality 湲곕낯媛?'KR' ?좊떦 ????????????
(function() {
  var _override = {
    // 湲濡쒕쾶 湲곗뾽??    '?쇰줎 癒몄뒪??:'US','?쒗봽 踰좎씠議곗뒪':'US','留덊겕 ?而ㅻ쾭洹?:'US','?뚮윴 踰꾪븦':'US',
    '?좎뒯 ??:'US','?섎━ ?섏씠吏':'US','?몃Ⅴ寃뚯씠 釉뚮┛':'US','? 荑?:'US',
    '???ы듃癒?:'US','由ъ궗 ??:'US','?섎━ ?섎━??:'US',
    '踰좊Ⅴ?섎Ⅴ ?꾨Ⅴ??:'EU','?ы떚???섎뜽??:'IN','??留?:'CN','留덊솕??:'CN','?먯젙??:'JP',
    // 湲濡쒕쾶 ?뺤튂??    '?꾨꼸???몃읆??:'US','議?諛붿씠??:'US','踰꾨씫 ?ㅻ컮留?:'US','?먮윭由??대┛??:'US','移대쭚???대━??:'US',
    '?쒖쭊??:'CN',
    '釉붾씪?붾?瑜??명떞':'EU','?먮쭏?섏뿕 留덊겕濡?:'EU','?щ씪???꾩툩':'EU',
    '由ъ떆 ?섎궢':'EU','?숆쾾??硫붾Ⅴ耳?:'EU','蹂쇰줈?붾?瑜??ㅻ젋?ㅽ궎':'EU','留덇굅由??泥?:'EU',
    '湲곗떆???꾨???:'JP','?꾨쿋 ?좎“':'JP','?섎젋?쒕씪 紐⑤뵒':'IN'
  };
  CELEBS.forEach(function(c) {
    if (!c.nationality) c.nationality = _override[c.name] || 'KR';
  });

  // 異쒖깮?꾩떆 媛쒕퀎 醫뚰몴(?뺣????곗꽑). 誘몃벑濡??몃Ъ? 援?? ??쒕룄??fallback ?ъ슜.
  var _geo = {
    '?쇰줎 癒몄뒪??: { label:'?⑥븘怨??꾨━?좊━??, lat:-25.7479, lon:28.2293, tz:2 },
    '?쒗봽 踰좎씠議곗뒪': { label:'誘멸뎅 ?대찕?쒖퐫 ?⑤쾭而ㅽ궎', lat:35.0844, lon:-106.6504, tz:-7 },
    '留덊겕 ?而ㅻ쾭洹?: { label:'誘멸뎅 ?댁슃 ?붿씠?명뵆?덉씤??, lat:41.0330, lon:-73.7629, tz:-5 },
    '?뚮윴 踰꾪븦': { label:'誘멸뎅 ?ㅻ툕?섏뒪移??ㅻ쭏??, lat:41.2565, lon:-95.9345, tz:-6 },
    '?좎뒯 ??: { label:'?留???대궃', lat:22.9999, lon:120.2270, tz:8 },
    '?섎━ ?섏씠吏': { label:'誘멸뎅 誘몄떆媛??쒖떛', lat:42.7325, lon:-84.5555, tz:-5 },
    '?몃Ⅴ寃뚯씠 釉뚮┛': { label:'?ъ떆??紐⑥뒪?щ컮', lat:55.7558, lon:37.6173, tz:3 },
    '? 荑?: { label:'誘멸뎅 ?⑤씪諛곕쭏 紐⑤퉴', lat:30.6954, lon:-88.0399, tz:-6 },
    '???ы듃癒?: { label:'誘멸뎅 ?쇰━?몄씠 ?쒖뭅怨?, lat:41.8781, lon:-87.6298, tz:-6 },
    '由ъ궗 ??: { label:'?留???대궃', lat:22.9999, lon:120.2270, tz:8 },
    '?섎━ ?섎━??: { label:'誘멸뎅 ?댁슃', lat:40.7128, lon:-74.0060, tz:-5 },
    '踰좊Ⅴ?섎Ⅴ ?꾨Ⅴ??: { label:'?꾨옉??猷⑤쿋', lat:50.6927, lon:3.1778, tz:1 },
    '?ы떚???섎뜽??: { label:'?몃룄 ?섏씠?곕씪諛붾뱶', lat:17.3850, lon:78.4867, tz:5.5 },
    '??留?: { label:'以묎뎅 ?????, lat:30.2741, lon:120.1551, tz:8 },
    '留덊솕??: { label:'以묎뎅 ?고꽣??, lat:23.3535, lon:116.6819, tz:8 },
    '?먯젙??: { label:'?쇰낯 ?ш?', lat:33.2494, lon:130.2988, tz:9 },
    '?꾨꼸???몃읆??: { label:'誘멸뎅 ?댁슃', lat:40.7128, lon:-74.0060, tz:-5 },
    '議?諛붿씠??: { label:'誘멸뎅 ?쒖떎踰좎씠?덉븘 ?ㅽ겕?쒗꽩', lat:41.4089, lon:-75.6624, tz:-5 },
    '踰꾨씫 ?ㅻ컮留?: { label:'誘멸뎅 ?섏????몃?猷곕（', lat:21.3069, lon:-157.8583, tz:-10 },
    '?먮윭由??대┛??: { label:'誘멸뎅 ?쇰━?몄씠 ?쒖뭅怨?, lat:41.8781, lon:-87.6298, tz:-6 },
    '移대쭚???대━??: { label:'誘멸뎅 罹섎━?щ땲???ㅽ겢?쒕뱶', lat:37.8044, lon:-122.2711, tz:-8 },
    '?쒖쭊??: { label:'以묎뎅 踰좎씠吏?, lat:39.9042, lon:116.4074, tz:8 },
    '釉붾씪?붾?瑜??명떞': { label:'?ъ떆???곹듃?섑뀒瑜대?瑜댄겕', lat:59.9311, lon:30.3609, tz:3 },
    '?먮쭏?섏뿕 留덊겕濡?: { label:'?꾨옉???꾨???, lat:49.8941, lon:2.2958, tz:1 },
    '?щ씪???꾩툩': { label:'?낆씪 ?ㅼ뒪?섎툕琉쇳겕', lat:52.2799, lon:8.0472, tz:1 },
    '由ъ떆 ?섎궢': { label:'?곴뎅 ?ъ슦?섑봽??, lat:50.9097, lon:-1.4044, tz:0 },
    '?숆쾾??硫붾Ⅴ耳?: { label:'?낆씪 ?⑤?瑜댄겕', lat:53.5511, lon:9.9937, tz:1 },
    '蹂쇰줈?붾?瑜??ㅻ젋?ㅽ궎': { label:'?고겕?쇱씠???щ━鍮꾨━??, lat:47.9105, lon:33.3918, tz:2 },
    '留덇굅由??泥?: { label:'?곴뎅 洹몃옒??, lat:52.9115, lon:-0.6411, tz:0 },
    '湲곗떆???꾨???: { label:'?쇰낯 ?꾩퓙', lat:35.6762, lon:139.6503, tz:9 },
    '?꾨쿋 ?좎“': { label:'?쇰낯 ?꾩퓙', lat:35.6762, lon:139.6503, tz:9 },
    '?섎젋?쒕씪 紐⑤뵒': { label:'?몃룄 諛붾뱶?섍?瑜?, lat:23.7863, lon:72.6380, tz:5.5 }
  };
  var _knownTime = {
    '?먮윭由??대┛??: true,
    '移대쭚???대━??: true,
    '釉뚮옒???쇳듃 Brad Pitt': true,
    '?덉젮由щ굹 議몃━ Angelina Jolie': true,
    '?ㅻ（??移?Shah Rukh Khan': true,
    '?꾨??釉?諛붿갔 Amitabh Bachchan': true
  };
  CELEBS.forEach(function(c) {
    if (_geo[c.name]) c.birthGeo = _geo[c.name];
    if (_knownTime[c.name]) c.timeKnown = true;
  });
})();

// ?? 湲濡쒕쾶 ?좊챸???곗씠??(JP 쨌 CN 쨌 US 쨌 IN 쨌 EU) ??????????????????????????
const GLOBAL_CELEBS = [
  /* ?? ?쇰낯 JP ???????????????????????????????????????????????? */
  {cat:'諛곗슦',      name:'湲곕Т???荑좎빞 ?ⓩ쓳?볟뱣',          birth:'1972-11-04',hour:12,minute:0,nationality:'JP'},
  {cat:'諛곗슦',      name:'?ы넗 ?耳猷?鵝먫뿤??,               birth:'1989-03-21',hour:12,minute:0,nationality:'JP'},
  {cat:'諛곗슦',      name:'?댁떆?섎씪 ?ы넗誘??녑렅?뺛겏??,       birth:'1986-12-24',hour:12,minute:0,nationality:'JP'},
  {cat:'諛곗슦',      name:'???섎쿋 耳?歷↑씌玉?,               birth:'1959-10-21',hour:12,minute:0,nationality:'JP'},
  {cat:'諛곗슦',      name:'湲고????耳???쀩뇦閭?,             birth:'1947-01-18',hour:12,minute:0,nationality:'JP'},
  {cat:'諛곗슦',      name:'誘몄빞?먰궎 ?섏빞??若?킂蓼?,           birth:'1941-01-05',hour:12,minute:0,nationality:'JP'},
  {cat:'諛곗슦',      name:'援щ줈?ъ? ?꾪궎??容믤쑈??,           birth:'1910-03-23',hour:12,minute:0,nationality:'JP'},
  {cat:'媛?샕룹넄濡?, name:'?꾨Т濡??섎???若됧?也덄풆??,         birth:'1977-09-20',hour:12,minute:0,nationality:'JP'},
  {cat:'媛?샕룹넄濡?, name:'?고????덉뭅猷?若뉐쩀?겹깚?ャ꺂',       birth:'1983-01-19',hour:12,minute:0,nationality:'JP'},
  {cat:'媛?샕룹넄濡?, name:'?붾꽕利?耳꾩떆 映녔뇰?꾢릊',             birth:'1991-09-19',hour:12,minute:0,nationality:'JP'},
  {cat:'媛?샕룹넄濡?, name:'?꾩퓼?쇰쭏 留덉궗?섎（ 獵뤷굇?끾꼇',       birth:'1969-02-06',hour:12,minute:0,nationality:'JP'},
  {cat:'媛?샕룹넄濡?, name:'留덉캈???몄씠肄??양뵲?뽩춴',           birth:'1962-03-10',hour:12,minute:0,nationality:'JP'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?ㅽ????쇳뿤??鸚㎬갬玲붷뭄',        birth:'1994-07-05',hour:12,minute:0,nationality:'JP'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?섎돱 ?좎쫰猷?獰썹뵟永먨샷',          birth:'1994-12-07',hour:12,minute:0,nationality:'JP'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?댁튂濡??닸쑉訝??,                birth:'1973-10-22',hour:12,minute:0,nationality:'JP'},

  /* ?? 以묎뎅 CN ???????????????????????????????????????????????? */
  {cat:'諛곗슦',      name:'?깅！ ?먬풅 Jackie Chan',            birth:'1954-04-07',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'?댁뿰嫄??롩ｆ씛 Jet Li',             birth:'1963-04-26',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'?μ캈??塋졾춴??Zhang Ziyi',         birth:'1979-02-09',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'怨듬━ 藥⒳퓧 Gong Li',                birth:'1965-12-31',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'瑜섎뜑???됧쓿??Andy Lau',           birth:'1961-09-27',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'?쒕씪諛?瓦ら틭?긷럽 Dilraba',          birth:'1992-06-03',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'?묐? 璵듿넪 Yang Mi',                birth:'1986-09-12',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'?묒옄寃?璵딁눈??Michelle Yeoh',      birth:'1962-08-25',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'?됱감?ㅼ썾??歟곫쐻??Tony Leung',     birth:'1962-06-27',hour:12,minute:0,nationality:'CN'},
  {cat:'諛곗슦',      name:'?먮튃鍮??껃넱??Fan Bingbing',       birth:'1981-09-16',hour:12,minute:0,nationality:'CN'},
  {cat:'媛?샕룹넄濡?, name:'?뺥럹???뗨뤁 Faye Wong',            birth:'1969-08-08',hour:12,minute:0,nationality:'CN'},
  {cat:'媛?샕룹넄濡?, name:'?ν븰??凉드???Jacky Cheung',       birth:'1961-07-10',hour:12,minute:0,nationality:'CN'},
  {cat:'媛?샕룹넄濡?, name:'??곗젣猷??ⓩ씛??Jay Chou',         birth:'1979-01-18',hour:12,minute:0,nationality:'CN'},

  /* ?? 誘멸뎅 US ???????????????????????????????????????????????? */
  {cat:'諛곗슦',      name:'釉뚮옒???쇳듃 Brad Pitt',            birth:'1963-12-18',hour:6, minute:31,nationality:'US'},
  {cat:'諛곗슦',      name:'?덉젮由щ굹 議몃━ Angelina Jolie',     birth:'1975-06-04',hour:9, minute:9, nationality:'US'},
  {cat:'諛곗슦',      name:'?덉삤?섎Ⅴ???붿뭅?꾨━??Leonardo DiCaprio',birth:'1974-11-11',hour:12,minute:0,nationality:'US'},
  {cat:'諛곗슦',      name:'?ㅼ뭡???뷀븳??Scarlett Johansson', birth:'1984-11-22',hour:12,minute:0,nationality:'US'},
  {cat:'諛곗슦',      name:'?щ━???먮컲??Chris Evans',        birth:'1981-06-13',hour:12,minute:0,nationality:'US'},
  {cat:'諛곗슦',      name:'?쒖썾??議댁뒯 Dwayne Johnson',       birth:'1972-05-02',hour:12,minute:0,nationality:'US'},
  {cat:'諛곗슦',      name:'硫붾┫ ?ㅽ듃由?Meryl Streep',         birth:'1949-06-22',hour:12,minute:0,nationality:'US'},
  {cat:'諛곗슦',      name:'?ㅼ븘??由щ툕??Keanu Reeves',       birth:'1964-09-02',hour:12,minute:0,nationality:'US'},
  {cat:'諛곗슦',      name:'濡쒕쾭???ㅼ슦??二쇰땲??Robert Downey Jr.', birth:'1965-04-04',hour:12,minute:0,nationality:'US'},
  {cat:'媛?샕룹넄濡?, name:'?뚯씪???ㅼ쐞?꾪듃 Taylor Swift',     birth:'1989-12-13',hour:12,minute:0,nationality:'US'},
  {cat:'媛?샕룹넄濡?, name:'鍮꾩슆??Beyonc챕',                   birth:'1981-09-04',hour:12,minute:0,nationality:'US'},
  {cat:'媛?샕룹넄濡?, name:'?덉씠??媛媛 Lady Gaga',            birth:'1986-03-28',hour:12,minute:0,nationality:'US'},
  {cat:'媛?샕룹넄濡?, name:'?꾨━?꾨굹 洹몃???Ariana Grande',    birth:'1993-06-26',hour:12,minute:0,nationality:'US'},
  {cat:'媛?샕룹넄濡?, name:'留덉씠????뒯 Michael Jackson',      birth:'1958-08-29',hour:12,minute:0,nationality:'US'},
  {cat:'媛?샕룹넄濡?, name:'鍮뚮━ ?꾩씪由ъ떆 Billie Eilish',      birth:'2001-12-18',hour:12,minute:0,nationality:'US'},
  {cat:'媛?샕룹넄濡?, name:'?먮???Eminem',                    birth:'1972-10-17',hour:12,minute:0,nationality:'US'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'留덉씠??議곕뜕 Michael Jordan',     birth:'1963-02-17',hour:12,minute:0,nationality:'US'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'瑜대툕濡??쒖엫??LeBron James',     birth:'1984-12-30',hour:12,minute:0,nationality:'US'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?몃젅???뚮━?꾩뒪 Serena Williams',birth:'1981-09-26',hour:12,minute:0,nationality:'US'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'??닿굅 ?곗쫰 Tiger Woods',        birth:'1975-12-30',hour:12,minute:0,nationality:'US'},

  /* ?? ?몃룄 IN ???????????????????????????????????????????????? */
  {cat:'諛곗슦',      name:'?ㅻ（??移?Shah Rukh Khan',         birth:'1965-11-02',hour:14,minute:26,nationality:'IN'},
  {cat:'諛곗슦',      name:'?꾨??釉?諛붿갔 Amitabh Bachchan',   birth:'1942-10-11',hour:16,minute:0, nationality:'IN'},
  {cat:'諛곗슦',      name:'?꾨━?移?珥덊봽??Priyanka Chopra',  birth:'1982-07-18',hour:12,minute:0, nationality:'IN'},
  {cat:'諛곗슦',      name:'?뷀뵾移??뚮몢肄?Deepika Padukone',   birth:'1986-01-05',hour:12,minute:0, nationality:'IN'},
  {cat:'諛곗슦',      name:'?대쭔 移?Salman Khan',              birth:'1965-12-27',hour:12,minute:0, nationality:'IN'},
  {cat:'諛곗슦',      name:'?꾨?瑜?移?Aamir Khan',             birth:'1965-03-14',hour:12,minute:0, nationality:'IN'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?쒕떎瑜??쇱감??Sundar Pichai',    birth:'1972-07-10',hour:12,minute:0, nationality:'IN'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?몃뱶???꾩씠 Indra Nooyi',        birth:'1955-10-28',hour:12,minute:0, nationality:'IN'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'鍮꾨씪??肄쒕━ Virat Kohli',        birth:'1988-11-05',hour:12,minute:0, nationality:'IN'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?ъ튇 ?먮몮移대Ⅴ Sachin Tendulkar', birth:'1973-04-24',hour:12,minute:0, nationality:'IN'},

  /* ?? ?좊읇 EU ???????????????????????????????????????????????? */
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?щ━?ㅽ떚?꾨늻 ?몃궇??Cristiano Ronaldo', birth:'1985-02-05',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'由ъ삤??硫붿떆 Lionel Messi',       birth:'1987-06-24',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?곗씠鍮꾨뱶 踰좎뺨 David Beckham',    birth:'1975-05-02',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?щ━???뚮컮??Kylian Mbapp챕',    birth:'2000-12-20',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'利먮씪???대툕?쇳엳紐⑤퉬移?Zlatan Ibrahimovi훶',birth:'1981-10-03',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'?먮Ⅴ留??? Erling Haaland',     birth:'2000-07-21',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'猷⑥뭅 紐⑤뱶由ъ튂 Luka Modri훶',      birth:'1985-09-09',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'濡쒕쾭???덈컲?꾪봽?ㅽ궎 Robert Lewandowski',birth:'1988-08-21',hour:12,minute:0,nationality:'EU'},
  {cat:'媛?샕룹넄濡?, name:'?먮뱶 ?쒕윴 Ed Sheeran',             birth:'1991-02-17',hour:12,minute:0,nationality:'EU'},
  {cat:'媛?샕룹넄濡?, name:'?꾨뜽 Adele',                       birth:'1988-05-05',hour:12,minute:0,nationality:'EU'},
  {cat:'媛?샕룹넄濡?, name:'?щ━??留덊떞 Coldplay',             birth:'1977-03-02',hour:12,minute:0,nationality:'EU'},
  {cat:'媛?샕룹넄濡?, name:'議??덈끉 John Lennon',              birth:'1940-10-09',hour:6, minute:30,nationality:'EU'},
  {cat:'諛곗슦',      name:'耳?댄듃 ?덉뒳??Kate Winslet',       birth:'1975-10-05',hour:12,minute:0,nationality:'EU'},
  {cat:'諛곗슦',      name:'?좊쭏 ?볦뒯 Emma Watson',            birth:'1990-04-15',hour:12,minute:0,nationality:'EU'},
  {cat:'諛곗슦',      name:'踰좊꽕?뺥듃 而대쾭諛곗튂 Benedict Cumberbatch',birth:'1976-07-19',hour:12,minute:0,nationality:'EU'},
  {cat:'諛곗슦',      name:'?ㅻ땲???щ젅?닿렇 Daniel Craig',      birth:'1968-03-02',hour:12,minute:0,nationality:'EU'},
  {cat:'諛곗슦',      name:'?ㅻ뱶由??듬쾲 Audrey Hepburn',        birth:'1929-05-04',hour:12,minute:0,nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'紐⑥감瑜댄듃 Wolfgang Mozart',       birth:'1756-01-27',hour:20,minute:0, nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'踰좏넗踰?Ludwig van Beethoven',    birth:'1770-12-17',hour:12,minute:0, nationality:'EU'},
  {cat:'湲濡쒕쾶湲곗뾽??,name:'由ъ쿂??釉뚮옖??Richard Branson',  birth:'1950-07-18',hour:12,minute:0, nationality:'EU'}
];

// ?? Upsert: 以묐났(?대쫫+?앸뀈?붿씪) ?놁씠 GLOBAL_CELEBS瑜?CELEBS??蹂묓빀 ??????????
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

  // 移댄뀒怨좊━ ??諛?  var tabBar=document.createElement('div');
  tabBar.className='celeb-tab-wrap';
  tabBar.id='celebTabBar';

  var cats=['?꾩껜'].concat(CELEB_CATS);
  cats.forEach(function(cat,i){
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='celeb-tab-btn'+(i===0?' active':'');
    btn.dataset.cat=(cat==='?꾩껜')?'':cat;
    btn.innerHTML=(CELEB_CAT_ICONS[cat]||'')+'&nbsp;'+cat;
    tabBar.appendChild(btn);
  });
  container.appendChild(tabBar);

  // ?좊챸???대쫫 踰꾪듉 ?곸뿭
  var btnArea=document.createElement('div');
  btnArea.id='celebBtnArea';
  btnArea.className='celeb-name-area';
  container.appendChild(btnArea);

  // ???대┃ ???대깽???꾩엫
  tabBar.addEventListener('click', function(e){
    var tabBtn=e.target.closest('.celeb-tab-btn');
    if(!tabBtn) return;
    tabBar.querySelectorAll('.celeb-tab-btn').forEach(function(b){b.classList.remove('active');});
    tabBtn.classList.add('active');
    renderCelebs(tabBtn.dataset.cat||null);
  });

  // ?좊챸??踰꾪듉 ?대┃ ???대깽???꾩엫 (紐⑤컮???ㅽ겕濡?vs ??援щ퀎)
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
    if(_celebMoved){_celebMoved=false;return;}/* ?ㅽ겕濡??쒖뒪泥????대┃ 臾댁떆 */
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
    btnArea.classList.add('fading');/* ?꾪솚 以??대┃ 李⑤떒 */
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
      btnArea.classList.remove('fading');/* ?꾪솚 ?꾨즺 ???대┃ ?덉슜 */
    }, 120);
  }
  renderCelebs(null);
}

function setCeleb(c){
  document.getElementById('compatName').value=c.name;
  document.getElementById('compatBirthDate').value=c.birth;
  document.getElementById('compatBirthHour').value=(c.hour!==undefined?c.hour:12);
  document.getElementById('compatBirthMinute').value=(c.minute!==undefined?c.minute:0);
  /* ???뚮젰 ?쇰뵒???꾨━酉곕룄 ?낅뜲?댄듃 */
  try{updateLunarPreview('compatBirthDate','compatCalType','compatLunarPreview');}catch(e){}
  /* ?ъ＜ 誘멸퀎???쒖뿉???쇰쭔 梨꾩슦怨??덈궡 */
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

/** 沅곹빀 LLM 移대뱶 留덉슫?? #compatLlmHost ?놁쑝硫?compatResult ?ㅼ뿉 ?앹꽦 */
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

/** compat-llm-prompts.js??window.cdEnsureCompatLlmReady ?ъ슜 (肄쒕갚 ?먃룻뤃留? */

async function runCompat(){
  if(!G_PILLARS||!G_NATAL||!G_POWER||!G_JOHU){
    alert('癒쇱? ???ъ＜瑜?怨꾩궛???ㅼ뿉 沅곹빀??蹂????덉뼱???맰');return;
  }
  var compatRunBtn = document.getElementById('compatRunBtn');
  if (compatRunBtn) {
    compatRunBtn.disabled = true;
    compatRunBtn.style.opacity = '0.7';
  }
  var name=(document.getElementById('compatName').value||'?곷?諛?).trim();
  var bd=document.getElementById('compatBirthDate').value;
  var type=document.getElementById('compatType').value||'love';
  if(!bd){
    alert('?곷????앸뀈?붿씪???낅젰?댁＜?몄슂');
    if (compatRunBtn) {
      compatRunBtn.disabled = false;
      compatRunBtn.style.opacity = '';
    }
    return;
  }
  
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
    alert('?좎쭨 蹂?섏뿉 ?ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?뺤씤?댁＜?몄슂.');
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
        host.innerHTML = '<div style="color:#fda4af;font-size:0.85rem;padding:10px;border-radius:10px;border:1px solid rgba(251,113,133,0.35);">AI ?꾨＼?꾪듃 紐⑤뱢??遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?덈줈怨좎묠 ???ㅼ떆 ?쒕룄??二쇱꽭??</div>';
        return;
      }
      try{
        window.CompatLlm.mountSaju(host,G_PILLARS,p2,G_NATAL,natal2,type,typeof USER_NAME==='string'?USER_NAME:'??,name,{
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
    alert('沅곹빀 怨꾩궛 以??ㅻ쪟媛 諛쒖깮?덉뼱?? '+e.message);
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
      reasons.push('?쒖そ? ?④쾪怨??쒖そ? 李④????쒕줈??湲곗삩???덉걯寃?以묓솕?댁＜??沅곹빀?댁뿉??');
    }else if(isHot(jh1)&&isHot(jh2)){
      score-=3;
      reasons.push('?????④굅???몄씠??媛먯젙??遺덇퐙? 媛뺥븯吏留? ?ㅽ댘???쎄쾶 而ㅼ쭏 ???덈뒗 遺??? 怨쇱뿴 沅곹빀?낅땲??');
    }else if(isCold(jh1)&&isCold(jh2)){
      score-=3;
      reasons.push('????李④????몄씠???덉젙媛먯? ?덉?留? ?쒕줈媛 ?쒕줈?먭쾶 ?④린瑜?梨꾩썙二쇨린???ㅼ냼 遺議깊븷 ???덉뼱??');
    }else{
      score+=1;
      reasons.push('湲곗삩???ш쾶 異⑸룎?섏쭊 ?딆?留? ?쒖そ???댁쭩 ??'+(isHot(jh1)?'?곕쑜??:'李④???)+' ?몄씠??洹좏삎???≪븘二쇰뒗 援ъ“?낅땲??');
    }
    if(jh1.moistType&&jh2.moistType){
      if(jh1.moistType==='wet'&&jh2.moistType==='dry' || jh1.moistType==='dry'&&jh2.moistType==='wet'){
        score+=3;
        reasons.push('???щ엺? 珥됱큺?섍퀬 ???щ엺? 嫄댁“??泥댁쭏?대씪, ?듭“(嚥뺟눆)媛 ?쒕줈瑜?梨꾩썙二쇰뒗 ?댁긽?곸씤 沅곹빀?낅땲??');
      }else if(jh1.moistType===jh2.moistType&&jh1.moistType!=='balanced'){
        score-=2;
        reasons.push('????'+(jh1.moistType==='wet'?'?듦린媛 留롮?':'嫄댁“??)+' ?몄씠?? 而⑤뵒?섏씠 ?섏걽 ???④퍡 ?섏뼱吏嫄곕굹 硫붾쭚???덇린 ?ъ슫 援ъ“?낅땲??');
      }else{
        score+=0.5;
        reasons.push('?듭“(嚥뺟눆) 硫댁뿉?쒕뒗 ?ш쾶 異⑸룎?섏? ?딄퀬, ?쇱긽 而⑤뵒?섎룄 鍮꾩듂???몄쑝濡??섎윭媛??沅곹빀?낅땲??');
      }
    }
  }

  var e1=n1.dominant,e2=n2.dominant;
  if(e1===e2){
    score+=1;
    reasons.push('????'+EL_K[e1]+' 湲곗슫??媛뺥빐 鍮꾩듂??肄붾뱶? 由щ벉??怨듭쑀?⑸땲??');
    if((n1.counts[e1]||0)>=4&&(n2.counts[e2]||0)>=4){
      score-=2;
      reasons.push('?ㅻ쭔 媛숈? ?ㅽ뻾???????덈Т 媛뺥빐?? ?섍껄 異⑸룎 ???묐낫媛 ?????섎뒗 援ъ“?닿린???댁슂.');
    }
  }
  if(SHENG[e1]===e2){
    score+=3;
    reasons.push(EL_K[e1]+' ??'+EL_K[e2]+' ??瑜? ?앺빐二쇰뒗 援ъ“?? ?쒖そ???먯뿰?ㅻ읇寃??ㅻⅨ 履쎌쓣 ?ㅼ썙二쇰뒗 ?곸깮 沅곹빀?낅땲??');
  }else if(SHENG[e2]===e1){
    score+=3;
    reasons.push(EL_K[e2]+' ??'+EL_K[e1]+' ??瑜? ?꾩?二쇰뒗 援ъ“?? ?쒕줈瑜??깆옣?쒗궎???좊뱺??吏?먯옄 愿怨꾩엯?덈떎.');
  }
  if(KE[e1]===e2||KE[e2]===e1){
    score-=2;
    reasons.push('湲곕낯?곸쑝濡??곴레 愿怨?'+EL_K[e1]+' ??'+EL_K[e2]+')?? 湲댁옣媛먭낵 ?좉꼍?꾩씠 ?쎄쾶 ?앷만 ???덈뒗 沅곹빀?낅땲??');
  }

  var g1=p1.d.g,g2=p2.d.g,j1=p1.d.j,j2=p2.d.j;
  var GANHE_C={
    '??:{'藥?:true},'藥?:{'??:true},
    '阿?:{'佯?:true},'佯?:{'阿?:true},
    '訝?:{'渦?:true},'渦?:{'訝?:true},
    '訝?:{'鶯?:true},'鶯?:{'訝?:true},
    '??:{'??:true},'??:{'??:true}
  };
  var JIHE_C={
    '耶?:{'訝?:true},'訝?:{'耶?:true},
    '野?:{'雅?:true},'雅?:{'野?:true},
    '??:{'??:true},'??:{'??:true},
    '渦?:{'??:true},'??:{'渦?:true},
    '藥?:{'??:true},'??:{'藥?:true},
    '??:{'??:true},'??:{'??:true}
  };
  var CHONG_G=[['??,'佯?],['阿?,'渦?],['訝?,'鶯?],['訝?,'??]];
  var CHONG_J=[['耶?,'??],['訝?,'??],['野?,'??],['??,'??],['渦?,'??],['藥?,'雅?]];

  if(GANHE_C[g1]&&GANHE_C[g1][g2]){
    score+=3;
    reasons.push('???щ엺???쇨컙 泥쒓컙?????????대（?? 湲곕낯?곸쑝濡?留덉쓬 肄붾뱶媛 ??留욌뒗 沅곹빀?낅땲??');
  }
  if(JIHE_C[j1]&&JIHE_C[j1][j2]){
    score+=2;
    reasons.push('?쇱?(諛곗슦???먮━)?먯꽌 ?≫빀???대（?댁졇, 媛숈씠 ?덉쓣 ???몄븞?④낵 ?뚮┝??媛뺥븯寃??먭뺨吏??援ъ“?낅땲??');
  }
  CHONG_G.forEach(function(p){
    if((p[0]===g1&&p[1]===g2)||(p[1]===g1&&p[0]===g2)){
      score-=3;
      reasons.push('?쇨컙??異?亦????대（?? 醫뗭? ?먮룄 媛뺥븯吏留?遺?れ튌 ???ш쾶 遺?ろ엳??濡ㅻ윭肄붿뒪?고삎 沅곹빀?댁뿉??');
    }
  });
  CHONG_J.forEach(function(p){
    if((p[0]===j1&&p[1]===j2)||(p[1]===j1&&p[0]===j2)){
      score-=3;
      reasons.push('?쇱?媛 異?亦????대（?? ?앺솢 ?⑦꽩?대굹 媛먯젙 由щ벉???ㅻⅤ寃??吏곸씪 ???덉뒿?덈떎. 議곗쑉??以묒슂?댁슂.');
    }
  });

  if(pw1||jg1||pw2||jg2){
    // ?? 紐낅━ ?붿쭊: 醫낃꺽/媛醫낃꺽?대㈃ dominant/parEl???⑹떊, ?땊ominant媛 湲곗떊
    var yong1 = (jg1&&jg1.isJong) ? [jg1.dominant,jg1.parEl].filter(Boolean) : (pw1?pw1.yongshin:[]);
    var yong2 = (jg2&&jg2.isJong) ? [jg2.dominant,jg2.parEl].filter(Boolean) : (pw2?pw2.yongshin:[]);
    var kiji1 = (jg1&&jg1.isJong) ? [whoControls(jg1.dominant)] : (pw1?pw1.kijishin:[]);
    var kiji2 = (jg2&&jg2.isJong) ? [whoControls(jg2.dominant)] : (pw2?pw2.kijishin:[]);

    var commonY=yong1.filter(function(e){return yong2.indexOf(e)>=0;});
    if(commonY.length){
      score+=4;
      reasons.push('???щ엺 紐⑤몢 '+commonY.map(function(e){return EL_E[e]+EL_K[e];}).join(', ')+' 湲곗슫???⑹떊?쇰줈 ?쇱븘, ?몄깮??諛붾씪蹂대뒗 ?듭떖 諛⑺뼢??留ㅼ슦 鍮꾩듂?⑸땲??');
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
      reasons.push('?뱁엳 '+clashEls.map(function(e){return EL_E[e]+EL_K[e];}).join(', ')+' 湲곗슫? ?쒖そ?먭쾶???⑹떊, ?ㅻⅨ ?쒖そ?먭쾶??湲곗떊?쇰줈 ?묒슜?? 洹?二쇱젣?먯꽌??誘쇨컧?섍쾶 遺?ろ옄 ???덈뒗 援ъ“?낅땲??');
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
    if(KE[e1]===e2||KE[e2]===e1)score+=1; // ?고궎?移댁슜 湲댁옣媛?  }

  var allChars1=[p1.y.g,p1.y.j,p1.m.g,p1.m.j,p1.d.g,p1.d.j,p1.h.g,p1.h.j];
  var allChars2=[p2.y.g,p2.y.j,p2.m.g,p2.m.j,p2.d.g,p2.d.j,p2.h.g,p2.h.j];
  // ?? 紐낅━ ?붿쭊: 湲곗떊 諛곗뿴 (醫낃꺽?대㈃ dominant??洹??ㅽ뻾, ?꾨땶 寃쎌슦 ?쇰컲 湲곗떊)
  var kiji1_ext = (jg1&&jg1.isJong) ? [whoControls(jg1.dominant)] : (pw1?pw1.kijishin:[]);
  var kiji2_ext = (jg2&&jg2.isJong) ? [whoControls(jg2.dominant)] : (pw2?pw2.kijishin:[]);
  var CHONG_MAP={??'佯?,佯?'??,阿?'渦?,渦?'阿?,訝?'鶯?,鶯?'訝?,訝?'??,??'訝?,
    耶?'??,??'耶?,訝?'??,??'訝?,野?'??,??'野?,??'??,??'??,渦?'??,??'渦?,藥?'雅?,雅?'藥?};

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
      reasons.push('狩??됱떊 ?쒖뼱: ?곷???湲??'+kijiControlEvents.map(function(e){return e.by;}).join(', ')+')媛 ?뱀떊??湲곗떊('+kijiControlEvents.map(function(e){return e.char;}).join(', ')+')??異?亦??쇰줈 ?쒓굅?댁쨳?덈떎. ?곷?諛⑹씠 ?뱀떊???섏걶 湲곗슫??紐곗븘?댁＜??理쒓퀬 沅곹빀???듭떖 ?붿씤?낅땲??');
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
      reasons.push('狩???갑???됱떊 ?쒖뼱: ?뱀떊??湲??'+p2KijiEvents.map(function(e){return e.by;}).join(', ')+')媛 ?곷???湲곗떊??異⑹쑝濡??쒓굅?댁쨳?덈떎. ?뱀떊???곷??먭쾶 ?대갑媛먯쓣 二쇰뒗 議댁옱?낅땲??');
    }
  }

  var GANHE_RESULT_MAP={??'earth',藥?'earth',阿?'metal',佯?'metal',訝?'water',渦?'water',訝?'wood',鶯?'wood',??'fire',??'fire'};
  var JIHE_RESULT_MAP={耶?'earth',訝?'earth',野?'wood',雅?'wood',??'fire',??'fire',渦?'metal',??'metal',藥?'water',??'water',??'fire',??'fire'};
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
        reasons.push('?슚 ?⑹쓽 ?⑥젙: '+c1+'? '+c2+'媛 ???????대（硫댁꽌 寃곌낵 ?ㅽ뻾('+EL_K[rEl]+')???뱀떊??湲곗떊??媛뺥솕?⑸땲?? 寃됱? ??留욎븘 蹂댁씠???띿쑝濡??대줈???먮꼫吏媛 ?볦씠??援ъ“?낅땲?? ?몄븞?④낵 以묐룆??援щ텇?섏꽭??');
      }
    });
  });

  var titleMap={love:'?곗븷/寃고샎 沅곹빀',business:'?ъ뾽/?숈뾽 沅곹빀',friend:'移쒓뎄/?숇즺 沅곹빀'};

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
  if(score>=13){grade='S湲?;gradeCls='grade-s';gradeLabel='?뙚 ?꾩깮?????;gradeComment='?怨좊궃 ?몄뿰?낅땲?? ?쒕줈??遺議깊븳 ?먮꼫吏瑜??뺥솗??梨꾩썙二쇨퀬 湲곗떊源뚯? ?쒓굅?댁＜?? 紐낅━?숈쟻?쇰줈 媛???댁긽?곸씤 沅곹빀?낅땲??';}
  else if(score>=8){grade='A湲?;gradeCls='grade-a';gradeLabel='???대챸 沅곹빀';gradeComment='湲곕낯 肄붾뱶? ?먮꼫吏 諛⑺뼢????留욌뒗 媛뺥븳 ?몄뿰?낅땲?? ?몃젰怨?諛곕젮媛 ?뷀빐吏硫??ㅻ옒 ?④퍡 ?깆옣?????덈뒗 臾닿쾶 ?덈뒗 沅곹빀?낅땲??';}
  else if(score>=3){grade='B湲?;gradeCls='grade-b';gradeLabel='?삃 ?몄뿰 沅곹빀';gradeComment='留욌뒗 遺遺꾧낵 議곗쑉???꾩슂??遺遺꾩씠 ?욎뿬 ?덉?留?異⑸텇?????먮씪?????덈뒗 沅곹빀?낅땲?? ?쒕줈??李⑥씠瑜??먯썝?쇰줈 諛붾씪蹂대뒗 ?쒓컖???꾩슂?⑸땲??';}
  else if(score>=-2){grade='C湲?;gradeCls='grade-c';gradeLabel='?셽 ?됰쾾???몄뿰';gradeComment='?밸퀎??醫뗭????섏걯吏???딆? ?몄뿰?낅땲?? ?대챸蹂대떎???좏깮怨??몃젰????愿怨꾩쓽 諛⑺뼢??寃곗젙?⑸땲??';}
  else if(score>=-6){grade='D湲?;gradeCls='grade-d';gradeLabel='?좑툘 ?낅낫 沅곹빀';gradeComment='?먮꼫吏 諛⑺뼢??異⑸룎?섍굅???쒕줈?먭쾶 ?대줈??湲곗슫??利앺룺?쒗궎??援ъ“?낅땲?? 媛뺥븳 ?뚮┝???덉쓣 ???덉?留??κ린?곸쑝濡??뚮え媛 ??愿怨꾩엯?덈떎.';}
  else{grade='F湲?;gradeCls='grade-f';gradeLabel='?뙢截??낆뿰 沅곹빀';gradeComment='?쒕줈?먭쾶 媛???대줈???먮꼫吏瑜?二쇨퀬諛쏅뒗 援ъ“?낅땲?? 媛뺣젹???뚮┝???덈뜑?쇰룄 洹멸쾬???뚮え?몄? ?깆옣?몄? ?됱쿋?섍쾶 ?먮떒?댁빞 ?⑸땲??';}

  var str1=(pw1&&pw1.isStrong)?'?좉컯':'?좎빟';
  var str2=(pw2&&pw2.isStrong)?'?좉컯':'?좎빟';
  var factLines=[];
  if(str1==='?좉컯'&&str2==='?좎빟'){
    factLines.push('<b>?섏쓽 遺덇퇏??寃쎈낫:</b> ?뱀떊('+g1+') ?좉컯 횞 ?곷?('+g2+') ?좎빟. 愿怨꾩쓽 ?댁쟾????먯뿰?ㅻ읇寃??뱀떊???↔쾶 ?⑸땲?? 洹?由щ뜑??씠 "諛곕젮"濡??ъ옣?섎㈃ ??愿怨꾨뒗 ?붾뱾由??녿뒗 ?덉떇泥섍? ?섏?留? "?듭젣"濡?蹂吏덈릺???쒓컙 ?곷?諛⑹? ?⑥씠 留됲? ?꾨쭩移섎젮 ??寃껋엯?덈떎. "??諛⑹떇??留욎븘"?쇰뒗 臾댁쓽?앹쟻???듭븬???녿뒗吏 二쇨린?곸쑝濡??먭??섏꽭??');
  }else if(str1==='?좎빟'&&str2==='?좉컯'){
    factLines.push('<b>?≪닔 二쇱쓽蹂?</b> ?뱀떊('+g1+') ?좎빟 횞 ?곷?('+g2+') ?좉컯. ?뺣룄?곸씤 ?곷????먮꼫吏 釉붾옓????뱀떊??鍮⑤젮 ?ㅼ뼱媛湲??ъ슫 援ъ“?낅땲?? 泥섏쓬???좊뱺?댁꽌 醫뗭?留? ?쒓컙??吏?좎닔濡???紐⑹냼由щ? ?껋뼱踰꾨━怨??듭슱?⑤쭔 ?볦씪 ???덉뒿?덈떎. ?쒖슫?⑥씠 ?쒓퀎移섎? ?섍린 ?꾩뿉 ?꾩＜ ?ъ냼??嫄곗젅遺???곗뒿?섏뿬 ?섎쭔???꾨씪?대쾭??寃쎄퀎??瑜??ъ닔?섏꽭??');
  }else{
    factLines.push('<b>媛뺣?媛?/ ?쎈???</b> ???щ엺 紐⑤몢 '+str1+'/'+str2+' ?뺥깭???숆툒 ?먮꼫吏 ?ъ＜瑜?吏?붿뒿?덈떎. ?곹샎??臾닿쾶媛 鍮꾩듂???덉젙?곸씠吏留? ?쒕쾲 ?먯〈?ъ쓣 嫄멸퀬 ?ㅽ닾湲??쒖옉?섎㈃ ?앹옣??蹂대젮??寃쏀뼢???ㅻ텇?⑸땲?? ?덈? ?꾧? ?꾩씤吏 ?쒖뿴???뺥븯???ㅼ? 留먭퀬 ?뚯씠瑜??꾩＜ ?뺥솗??諛섏쑝濡??섎늻??媛곸옄???곸뿭??100% ?몄젙?댁＜?댁빞 ?됲솕媛 ?좎??⑸땲??');
  }
  if(KE[e1]===e2){
    factLines.push('<b>?쇨컙 ?곴레(?뱀떊???듭젣??:</b> ?뱀떊??('+EL_K[e1]+')媛 ?곷???('+EL_K[e2]+')瑜?伊먭퀬 ?붾벊?덈떎. ?뱀떊??臾댁쓽?앹쟻?쇰줈 ?섏쭊 ?⑺듃 ??꺽?대굹 ?됯?媛 ?곷??먭쾶???꾩껌???곸쿂??鍮꾩닔濡?苑귦엳怨??덉쓣 ???덉뒿?덈떎. ?닿? ?먮겮??媛踰쇱슫 ?곗튂媛 ?곷??먭쾺 二쇰㉨吏덉씪 ?섎룄 ?덈떎??媛먭컖??李⑥씠瑜??딆? 留덉꽭??');
  }else if(KE[e2]===e1){
    factLines.push('<b>?쇨컙 ?곴레(?뱀떊???쇳넻?쒖옄):</b> ?곷???('+EL_K[e2]+')媛 ?뱀떊??('+EL_K[e1]+')瑜?吏볥늻由낅땲?? ?뱀떊 ?ㅼ뒪濡쒕룄 紐⑤Ⅴ寃?李⑺븳 ?꾩씠 肄ㅽ뵆?됱뒪媛 諛쒕룞??臾댁“嫄???留욎떠二쇨퀬 ?덈떎硫??꾪뿕 ?좏샇?낅땲?? 李몃떎媛 ??踰덉뿉 ??컻(?대퀎/?덇탳)???뺣쪧??留ㅼ슦 ?믪쑝?? 愿怨꾩쓽 留ㅻぐ鍮꾩슜???꾧퉴?뚰븯吏 留덉꽭??');
  }
  if(kijiControlEvents.length){
    factLines.push('<b>?쎌젏 蹂댁셿???ъ숴??</b> ???щ엺 ?놁뿉 ?덉쑝硫??댁쑀 ?놁씠 留덉쓬???몄븞?댁?吏 ?딅굹?? 洹멸쾬? ?곗뿰???꾨떃?덈떎. ???ъ＜瑜?愿대∼?덇퀬 ?ㅽ?由ш쾶 ?섎뒗 ?듬떟???됱떊(湲곗떊)???곷?諛⑹쓽 湲?먮뱾??袁밴씁 ?뚮윭二쇰ŉ ?대룆????븷???섍퀬 ?덇린 ?뚮Ц?낅땲?? ???ъ숴???몄븞?⑥쓣 ?뱀뿰??沅뚮━??李⑷컖?섏? 留먭퀬 吏꾩떖 ?대┛ 蹂댁긽???뚮젮二쇱꽭??');
  }
  if(heTrapFound){
    factLines.push('<b>?????????⑥젙 寃쎈낫:</b> ???щ엺? ?꾩＜ 媛뺣젰???⑹쑝濡???뿬 ?덉뼱 吏?낇븳 ?뚮┝???먮굧?덈떎. ?섏?留?二쇱쓽?섏꽭?? ???몄븞?⑥씠 吏꾩쭨 ?깆옣???꾨땲??"?곕Ъ ??媛쒓뎄由?泥섎읆 ?쒕줈???⑥젏?대굹 ?섑깭?⑥쓣 ?덇컧??二쇰뒗 ?낆씠 ???깅같(?먰빀留앷?)?????덉뒿?덈떎. ?듭닕?⑥씠 鍮싳뼱??留밸ぉ???섏〈怨?吏꾩쭨 ?щ옉???덈━?섍쾶 援щ텇?댁빞 ?⑸땲??');
  }
  var factHtml=factLines.map(function(f){return '<div class="compat-check-item"><span class="compat-check-icon" style="color:#d81b60; font-size:1.1rem">?뵦</span><span>'+f+'</span></div>';}).join('');

  var advLines=[];
  if(score>=8){
    advLines.push('<b>[?좎? 泥쒓린] 諛⑹튂 湲덈Ъ:</b> ?섎뒛???먯???以 ?湲?鸚㎩릧)??沅곹빀?대씪??諛⑹튂?섎㈃ ?뱀뒳湲?留덈젴?낅땲?? ?덈Т ?꾨꼍?댁꽌 ?ㅽ엳??猷⑥쫰?댁?湲??ъ슦???뺢린?곸쑝濡?"?④퍡 ?꾨떖???덈줈???섏씠洹몃┝???뚮룞 紐⑺몴(?ы뀒?? ?ы뻾, 怨듬룞 痍⑤?)"瑜??몄썙 愿怨꾩뿉 ?덈줈???④껐??遺덉뼱?ｌ쑝?몄슂.');
  }else if(score>=3){
    advLines.push('<b>[?깆옣 泥쒓린] ?ㅻ쫫??誘명븰:</b> ?ы뀗?쒖? 異⑸텇?섎굹 議곗빱 移대뱶 ???μ씠 遺議깊빀?덈떎. 媛덈벑???앷만 ??"???섎옉 ??留욎??"?쇨퀬 ?볧븯????? "?섏? ?꾩쟾??諛섎??섎뒗 諛⑹떇?쇰줈 ???곹솴??諛⑹뼱??二쇨퀬 ?덇뎄???쇨퀬 ?쒓컖???뚯쫰瑜?諛붽씀???덈젴???꾩슂?⑸땲??');
  }else if(score>=-2){
    advLines.push('<b>[?뚰넻 泥쒓린] 遺덈쭔???몄뼱?뷀븯??</b> "留????대룄 ?뚭쿋吏"????愿怨꾩뿉??理쒖븙???낆빟?낅땲?? ???몄뿰? 媛留뚰엳 ?붾떎怨???덈줈 ?숈꽦?섏? ?딆뒿?덈떎. 遺덈쭔???꾧퀎?먯뿉 ?꾨떖?섍린 ?꾩뿉 ?꾩＜ 嫄댁“?섍퀬 ?щТ?곸씤 ?ㅼ쑝濡???遺덊렪?⑥쓣 ?꾨떖?섎뒗 媛먯젙 鍮쇨린 ?뚰넻踰뺣쭔???좎씪??泥섎갑?낅땲??');
  }else{
    advLines.push('<b>[?앹〈 泥쒓린] 猷곌낵 寃쎄퀎??</b> ?щ옉?대굹 ?곗젙?대씪??媛먯젙???몄뼱濡??쇰쾭臾대━???섏? 留덉꽭?? ?ㅽ엳??蹂?몄궗泥섎읆 泥좎??섍퀬 援ъ껜?곸씤 "?곕━???쎌냽(?곗씠??鍮덈룄, ?곕씫 ?, 吏異?洹쒖튃)"?대씪??怨꾩빟???몄슦??寃껋씠 ???꾪깭濡쒖슫 愿怨꾨? 吏?깊븯??媛???덉쟾???앸챸以꾩엯?덈떎.');
  }
  
  if(type==='love'){
    advLines.push('<b>[?곗븷 ?쒗겕由?:</b> ?곷?諛⑹씠 移좏쓳 媛숈? ?대몺 ?띿뿉 ?덉쓣 ???ㅼ젙???꾨줈 ?쒕쭏?붾낫?? 洹??щ엺???⑹떊(?덈??곸쑝濡??꾩슂???ㅽ뻾) 而щ윭???룹쓣 ?낃굅??洹??ㅽ뻾??留욌뒗 ?곗씠??肄붿뒪(?? ??麗?湲곗슫???꾩슂?섎㈃ 諛ㅻ컮?? ????湲곗슫???꾩슂?섎㈃ 諛앷퀬 ?붿슫 ???쇱쇅)瑜?湲고쉷?섎뒗 寃껋씠 紐낅━?숈쟻?쇰줈 100諛???媛뺣젰???곹샎??移섏쑀?낅땲??');
  }else if(type==='business'){
    advLines.push('<b>[?숈뾽 ?쒗겕由?:</b> 泥쒖깮?곕텇???뚰듃?덉떗?쇱??쇰룄 ?덉쓽 ?먮쫫 ?욎뿉?쒕뒗 諛섎뱶???쒗뿕????ㅻⅤ寃??⑸땲?? 沅곹빀??醫뗫떎怨??異??섍린???섏? 留덉꽭?? ??븷, 沅뚰븳, ?먯젅 留ㅻ돱?? ?댁씡 遺꾨같?⑥쓣 媛????移쒗븳 ?⑥쿂??臾몄꽌濡??④꺼?먮뒗 寃껊쭔?????섏긽?곸씤 ?숈뾽???곸썝??鍮꾩쫰?덉뒪濡?吏耳쒖＜??臾댁쟻??諛⑺뙣?낅땲??');
  }else{
    advLines.push('<b>[?곗젙 ?쒗겕由?:</b> ?꾨꼍??移쒓뎄? ??湲곕?瑜?紐⑤몢 梨꾩썙二쇰뒗 ?щ엺???꾨땲?? 湲곕?移섏쓽 ?덈뱾??0?쇰줈 ??톬????鍮꾨줈??諛쒓껄?섎뒗 蹂댁꽍?낅땲?? ?곷?諛⑹씠 "臾댁뼵媛瑜??섎Т?곸쑝濡??댁쨾???쒕떎"???뺣컯???먮겮吏 ?딅룄濡?源껎꽭泥섎읆 媛蹂띻퀬 遺???녿뒗 留밸Ъ 媛숈? ?먯뀡???좎??섏꽭??');
  }
  var advHtml=advLines.map(function(a){return '<p style="margin:0 0 10px; line-height:1.75;">'+a+'</p>';}).join('');

  var gradeIcon=score>=13?'?뙚':score>=8?'??:score>=3?'?삃':score>=-2?'?셽':score>=-6?'?좑툘':'?뙢截?;
  var html='<div class="compat-wrap">'+
    '<div class="compat-grade-area">'+
    '<div class="compat-grade-icon">'+gradeIcon+'</div>'+
    '<div>'+
    '<div class="compat-grade-badge '+gradeCls+'">'+grade+'</div>'+
    '<div class="compat-grade-label">'+titleMap[type]+' ??'+USER_NAME+' 횞 '+name+'<br><span style="font-size:.78rem;color:#888;font-weight:600">'+gradeLabel+'</span></div>'+
    '<div class="compat-grade-desc">'+gradeComment+'</div>'+
    '<div style="margin-top:6px;font-size:.79rem;color:#5f6368;font-weight:700;">硫???붿쭊 醫낇빀 ?먯닔: '+integratedScore+'/100</div>'+
    '</div></div>'+
    '<div class="compat-section">'+
    '<div class="compat-section-title">?㎛ ?ㅺ컖???듯빀 ?ㅼ퐫??/div>'+
    '<div style="font-size:.8rem;color:#4e5358;line-height:1.7">'
      +'紐낅━ '+scoreMyeongri+' 쨌 ?먮? '+scoreZiwei+' 쨌 ?먯꽦 '+scoreAstro+' ??<b>醫낇빀 '+integratedScore+'</b>/100'
      +(integratedSourceBadges.length ? ('<br><span style="font-size:.72rem;color:#7a7f86">'+integratedSourceBadges.join(' 쨌 ')+'</span>') : '')+
    '</div>'+
    '</div>'+
    '<div class="compat-section">'+
    '<div class="compat-section-title">?뙜截??먮꼫吏 議고솕</div>'+
    '<div style="font-size:.8rem;color:#555;line-height:1.7">'+sok.text+'</div>'+
    '</div>'+
    '<div class="compat-section">'+
    '<div class="compat-section-title">?뱥 沅곹빀 ?ъ씤??泥댄겕 <span style="font-size:.7rem;font-weight:400;color:#aaa">珥앹젏 '+score.toFixed(1)+'??/span></div>'+
    reasons.map(function(r){
      var icon=r.indexOf('狩?)>=0?'狩?:r.indexOf('?슚')>=0?'?슚':r.indexOf('??)>=0||r.indexOf('??)>=0?'?뮎':'?뮏';
      return '<div class="compat-check-item"><span class="compat-check-icon">'+icon+'</span><span>'+r.replace(/^[狩먳윓?\s*/,'')+'</span></div>';
    }).join('')+
    '</div>'+
    '<div class="compat-fact-box">'+
    '<div class="compat-fact-title">?뮙 ?⑺룺 遺꾩꽍 ????愿怨꾩쓽 吏꾩떎</div>'+
    '<div class="compat-fact-body">'+factHtml+'</div>'+
    '</div>'+
    '<div class="compat-advice-box">'+
    '<div class="compat-advice-title">?렞 泥쒓린??泥섎갑</div>'+
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
    var m={'野?:'遊?,'??:'遊?,'渦?:'遊?,'藥?:'?щ쫫','??:'?щ쫫','??:'?щ쫫','??:'媛??,'??:'媛??,'??:'媛??,'雅?:'寃⑥슱','耶?:'寃⑥슱','訝?:'寃⑥슱'};
    return m[z]||'遊?;
  }
  var s1=getSeason(mj1),s2=getSeason(mj2);
  var h1=isHot(jh1),h2=isHot(jh2),c1=isCold(jh1),c2=isCold(jh2);
  var score=0,text='';

  var warmWarmText, coldColdText, mixedText, neutralText;
  if(type==='business'){
    warmWarmText = '?뵦 遺덇낵 遺덉쓽 留뚮궓: ???щ엺 紐⑤몢 媛뺥븳 異붿쭊?κ낵 湲띿젙?곸씤 ?먮꼫吏瑜?媛吏怨??덉뼱 ?꾨줈?앺듃瑜?鍮좊Ⅴ寃?諛?대텤?대뒗 ?명씉???섏긽?곸엯?덈떎. 釉뚮젅?몄뒪?좊컢怨??곸뾽?먯꽌 ?쒕꼫吏媛 ??컻?섏?留? 媛먯젙??怨쇱뿴?섎㈃ ?ъ냼???닿껄???먯〈???몄??쇰줈 踰덉쭏 ???덉뒿?덈떎. ?쒕줈????븷??紐낇솗???섎늻怨? 理쒖쥌 寃곗젙 ?꾩뿉??諛섎뱶???섎（瑜?臾듯엳??荑⑤떎??Cool-down) 猷곗쓣 留뚮뱶?몄슂.';
    coldColdText = '?꾬툘 ?쇱쓬怨??쇱쓬??留뚮궓: ?????좎쨷?섍퀬 李⑤텇?섍쾶 ?곹솴??遺꾩꽍?섎뒗 ?ㅽ??쇱씠???κ린 ?꾨줈?앺듃??嫄곗븸???ㅺ???鍮꾩쫰?덉뒪?먯꽌 移섎챸?곸씤 ?ㅼ닔瑜?留됱븘以띾땲?? 洹몃윭???덈Т ?꾨꼍??湲고븯?ㅺ? ?쒖옣??以묒슂????대컢???볦튌 ???덉뒿?덈떎. ?뚮줈??70%???뺤떊留뚯쑝濡쒕룄 怨쇨컧?섍쾶 ?ㅽ뻾 踰꾪듉???꾨Ⅴ???⑷린瑜??쒕줈?먭쾶 遺곷룍?뚯＜?댁빞 ?⑸땲??';
    mixedText = '?뙜截??뚯뼇??議고솕: ?쒖そ? ?④굅??遺덈룄?泥섎읆 諛怨??섍?怨? ?쒖そ? 李④????댁꽦?쇰줈 釉뚮젅?댄겕? 諛⑺뼢? ??븷???섎뒗 "?묒?怨?釉뚮젅?댄겕"???댁긽?곸씤 議고빀?낅땲?? ??洹좏삎???좎??섎㈃ 理쒓퀬???깃낵瑜??댁?留? ?띾룄 李⑥씠濡??명빐 ?쒕줈瑜??듬떟?댄븯嫄곕굹 寃쎌넄?섎떎怨?鍮꾨궃?????덉쑝???곷???諛⑹떇??議댁쨷?섎뒗 而ㅻ??덉??댁뀡???곗뒿?섏꽭??';
    neutralText = '?뙮 ?됱삩???吏: 議고썑(?⑤룄) ?곸쑝濡???異⑸룎 ?놁씠 ?덉젙?곸씤 沅ㅻ룄瑜?洹몃━???묒뾽 愿怨꾩엯?덈떎. ?쒕줈???낅Т 由щ벉???먯뿰?ㅻ읇寃?留욎떠媛????덉뼱 袁몄????깃낵瑜??닿린 醫뗭뒿?덈떎. ?ㅻ쭔 ?덈Т ?덉젙?먮쭔 癒몃Ъ???곸떊??遺議깊빐吏????덉쑝???뺢린?곸쑝濡??덈줈???명뭼??二쇱엯?섏꽭??';
  }else if(type==='friend'){
    warmWarmText = '?뵦 遺덇낵 遺덉쓽 留뚮궓: ?쒕줈 留뚮굹湲곕쭔 ?섎㈃ ?먯뀡???섏쭅 ?곸듅?섎뒗 ?좎풄??移쒓뎄?낅땲?? ?④퍡 ?덉쑝硫??먮꼫吏媛 ?섏튂怨??몄젣???껋쓬??媛?앺븯吏留? 湲곕텇???곹븯硫??ㅽ댘???쒖닚媛꾩뿉 ?ш쾶 踰덉쭏 ???덉뒿?덈떎. 媛먯젙???곹뻽???뚮뒗 ?덈Т 源딆씠 ?뚭퀬?ㅼ? 留먭퀬 ?뱀쑀???좊㉧濡?媛蹂띻쾶 ?섏뼱媛 二쇰뒗 ?쇱뒪媛 ?곗젙???ㅻ옒 ?좎??섎뒗 鍮꾧껐?낅땲??';
    coldColdText = '?꾬툘 ?쇱쓬怨??쇱쓬??留뚮궓: 留먰븯吏 ?딆븘???쒕줈???⑤룄瑜??댄빐?섎뒗, 源딄퀬 怨좎슂???몄닔 媛숈? ?곗젙?낅땲?? ?붾젮?섍퀬 ?쒕걚?ъ슫 留뚮궓蹂대떎??李⑤텇?섍쾶 ?띿쓣 ?곕넃????붾? ?듯빐 ?좊ː瑜??먰뀅寃??볦븘媛묐땲?? 媛?붿? ?됱냼?????섎뜕 ??꽕怨??쒕룞?곸씤 痍⑤?瑜??④퍡?섎ŉ ?곗젙???쒕젰??遺덉뼱?ｌ뼱 蹂댁꽭??';
    mixedText = '?뙜截??뚯뼇??議고솕: ?쒕떖?④낵 李⑤텇?⑥씠 留뚮굹 ?쒕줈?먭쾶 ?녿뒗 ?됯퉼??梨꾩썙二쇰뒗 留ㅻ젰?곸씤 移쒓뎄 愿怨꾩엯?덈떎. 議곗슜??移쒓뎄?먭쾶??利먭굅???먭레???섍퀬, ?ㅻ쑍 移쒓뎄?먭쾶???됱삩???쇰궃泥섍? ?⑸땲?? ?쒕줈??湲곕낯 ?먯뀡???ㅻ쫫???딆? 留먭퀬, ?щ뒗 ?쒓컙怨??몃뒗 ?쒓컙??鍮꾩쑉??議댁쨷??二쇰㈃ ?됱깮 媛??移쒓뎄媛 ?⑸땲??';
    neutralText = '?뙮 ?됱삩???吏: 媛숈씠 ?덉쑝硫?臾댁뼵媛瑜??좎뜥 ?섏? ?딆븘???몄븞?? 留덉튂 ?ㅻ옒???섎Т 洹몃뒛 媛숈? ?곗젙?낅땲?? ?먮꼫吏 異⑸룎???녾린???대┫ ??移쒓뎄泥섎읆 ?몄븞?섍퀬 ?먯뿰?ㅻ읇寃?諛쒖쟾?섎ŉ ?쒕줈?먭쾶 臾댄빐??醫뗭? ?몄뿰?낅땲??';
  }else{ // love
    warmWarmText = '?뵦 遺덇낵 遺덉쓽 留뚮궓: ?ㅽ뙆?ш? ???媛뺣젹?섍쾶 ?뚮━怨? ?ㅽ궓??낵 媛먯젙 ?쒗쁽?먯꽌???꾩＜ ?④쾪怨??댁젙?곸씤 由щ벉??李곕뼞媛숈씠 留욎뒿?덈떎. ?쒕줈?먭쾶 媛뺥븳 ?먮꼫吏瑜?遺덉뼱?ｋ뒗 "?꾪뙆誘??뚰듃???낅땲?? ?섏?留??щ옉??怨쇱뿴?섏뼱 吏묒갑?대굹 ?듭젣濡?蹂吏덈릺嫄곕굹, ?묒? ?쒖슫?⑥씠 ???ㅽ댘?쇰줈 ??컻???꾪뿕???쎈땲?? 媛먯젙???⑤룄瑜?議곌툑 ??텛怨?媛곸옄???????덉쓣 議댁쨷?섎㈃ ?꾩＜ ?щ옉?ㅻ윭??留ㅼ슫留??곗븷媛 ?⑸땲??';
    coldColdText = '?꾬툘 ?쇱쓬怨??쇱쓬??留뚮궓: 議곗슜???대━???덉쿂???쒕줈???멸퀎???쒖꽌?? 洹몃윭???꾩＜ 源딄쾶 ?ㅻŉ?쒕뒗 愿怨꾩엯?덈떎. 寃됰낫湲곗뿏 ?붾젮??遺덇퐙???吏 ?딆쓣吏 紐곕씪?? ?ㅽ궓??씠???뺤꽌??援먭컧?먯꽌 ?⑤뱾? 紐⑤Ⅴ???섎쭔??源딄퀬 怨좎슂??諛?꾧? ?덉뒿?덈떎. 遺덊??ㅻⅤ湲곕낫?ㅻ뒗 ?쒖꽌???⑤룄瑜??ν?媛???앸같湲?媛숈? ?덉젙媛먯씠 留ㅻ젰?낅땲?? ?곷???議곗슜???쒗쁽???щ옉?쇰줈 ?쎌뼱?대뒗 ?덉씠 ?꾩슂?⑸땲??';
    mixedText = '?뙜截??뚯뼇??議고솕: ?쒖そ??李④???紐몄쓣 ?뱀씠???ㅺ?媛怨? ?쒖そ? ?④굅???닿린瑜??앺엳???ㅺ?媛?? ?먯꽍???묎레 媛숈? 媛뺣젹???뚮┝??媛吏묐땲?? ?깊뼢???鍮꾧? 移⑤? ?꾩뿉?쒕룄, ?쇱긽?먯꽌???꾨꼍???쇱쫹 議곌컖泥섎읆 留욌Ъ由????꾩껌????컻?μ쓣 ?녹뒿?덈떎. ?ㅻ쭔 ?먮꼫吏???띾룄 李⑥씠 ?뚮Ц????紐낆? 吏移섍퀬 ??紐낆? 紐⑸쭏瑜????덉쑝?? ?щ옉???몄뼱? ?쒗룷瑜??붿쭅?섍쾶 留욎텛??媛????붽? ???щ엺???듭떖 怨쇱젣?낅땲??';
    neutralText = '?뙮 ?됱삩???吏: ?쒖뿬由꾩쓽 ?듯븿???쒓꺼?몄쓽 移쇰컮?뚮룄 ?녿뒗, 苡뚯쟻??遊꾧????좎뵪 媛숈? ?먮꼫吏 議고솕瑜??대９?덈떎. 洹밸떒?곸씤 濡ㅻ윭肄붿뒪?곕낫?ㅻ뒗 ?붿옍?섍퀬 ?덉젙?곸쑝濡??좊ː瑜??볦븘媛硫??몄븞???≪껜?? ?뺤떊??援먭컧???섎늻?????좊━???꾩＜ 嫄닿컯??援ъ“?낅땲??';
  }

  if(h1&&h2){ score+=2; text=warmWarmText; }
  else if(c1&&c2){ score+=1; text=coldColdText; }
  else if((h1&&c2)||(h2&&c1)){ score+=0; text=mixedText; }
  else{ score+=0.5; text=neutralText; }

  var pairGood=(s1==='遊?&&s2==='媛??)||(s1==='媛??&&s2==='遊?)||(s1==='?щ쫫'&&s2==='寃⑥슱')||(s1==='寃⑥슱'&&s2==='?щ쫫');
  if(pairGood)score+=2;
  else if(s1===s2)score+=0.5;
  else score-=0.5;

  var e1=(GAN[p1.d.g]||{}).e;
  var e2=(GAN[p2.d.g]||{}).e;
  if(e1&&e2){
    var elMap={wood:'紐????깆옣/六쀬뼱?섍컧)',fire:'?????댁젙/?뺤궛)',earth:'?????섏슜/?덉젙)',metal:'湲???洹쒖튃/寃곕떒)',water:'??麗??좎뿰/吏??'};
    if(e1===e2){
      score+=1;
      var sameBase = '???щ엺 紐⑤몢 '+elMap[e1]+' 湲곗슫??蹂몄쭏(?쇨컙)?대씪, ?몄긽??諛붾씪蹂대뒗 ?꾨젅?꾧낵 ?띠쓽 由щ벉??留덉튂 嫄곗슱??蹂대벏 ??븘 ?덉뒿?덈떎. 留먰븯吏 ?딆븘???듯븯??源딆? ?숈쭏媛먯씠 ??愿怨꾩쓽 媛뺣젰??湲곗큹媛 ?⑸땲??';
      if(type==='love') sameBase += ' ?섏?留??덈Т 鍮꾩듂???щ엺?쇰━???먯꽍??媛숈? 洹뱀쿂??諛?대궡嫄곕굹, 吏?섏튂寃??듭닕?댁졇 "媛議?媛숈? ?몄븞??留??④퀬 ?ㅻ젞??以꾩뼱?쒕뒗 ?⑥젙??鍮좎쭏 ???덉뒿?덈떎. ?섏떇?곸쑝濡??덈줈???곗씠?몃굹 ??꽑 寃쏀뿕??怨듭쑀?섏뿬 ?먭레??怨듦툒?댁＜?몄슂.';
      else if(type==='business') sameBase += ' ?숈뾽?????낅Т ?ㅽ??쇱씠 媛숈븘 ?뚰넻 鍮꾩슜???쒕줈??媛源앹뒿?덈떎. ?ㅻ쭔, 媛숈? 留뱀젏??媛吏????덉쑝誘濡????щ엺 ???볦튂湲??ъ슫 ?곸뿭(?щТ ??? ???먯뿉寃?議곗뼵??援ы븯??寃껋씠 ?덉쟾?⑸땲??';
      else sameBase += ' 愿?ъ궗???몃뒗 諛⑹떇???꾨꼍???쇱튂?섏뿬 理쒓퀬???뚰듃?덇? ?⑸땲?? ?쇱옄 ?섍린 六섏춼?덈뜕 寃껊뱾???④퍡 ?쒕룄??蹂댁꽭??';
      text += '<br><br><b>?ㅽ뻾 蹂몄썝(?쇨컙) 遺꾩꽍:</b> '+sameBase;
      if((n1.counts[e1]||0)>=4&&(n2.counts[e2]||0)>=4){ score-=2; text += ' ?좑툘 ?ㅻ쭔, ??遺?紐⑤몢 ?뱀젙 ?ㅽ뻾?쇰줈 ?좊┝???덈Т ?ы빐 ?ㅽ댘???앷린硫??꾧뎄 ?섎굹 ?쎄쾶 援쏀엳吏 ?딅뒗 吏?낇븳 ?됲삎 ?곹깭??鍮좎쭏 ???덉뒿?덈떎. 媛덈벑 ??臾댁“嫄?以묎컙 議곗쑉?먮? ?먮뒗 寃껋씠 醫뗭뒿?덈떎.'; }
    } else {
      var gen={'wood':'fire','fire':'earth','earth':'metal','metal':'water','water':'wood'};
      var con={'wood':'earth','earth':'water','water':'fire','fire':'metal','metal':'wood'};
      if(gen[e1]===e2){ score+=0.5; text += '<br><br><b>?ㅽ뻾 蹂몄썝(?쇨컙) ?앷레?쒗솕:</b> ?뱀떊??'+elMap[e1]+'媛 ?곷???'+elMap[e2]+'瑜??딆엫?놁씠 ???? 諛?댁＜怨??ㅼ썙以??섎뒗 援ъ“?낅땲?? ?뱀떊??臾댁쓽?앹쨷???곷?瑜??뚮낫怨??먮꼫吏瑜?怨듦툒?섎ŉ, 洹몃줈 ?명빐 ?곷?媛 鍮쏆쓣 蹂닿쾶 ?⑸땲?? ???먯뿰?ㅻ읇怨??뚯떊?곸씤 ?щ옉???먮쫫??愿怨꾨? ?곕쑜?섍쾶 留뚮벊?덈떎.'; }
      else if(gen[e2]===e1){ score+=0.5; text += '<br><br><b>?ㅽ뻾 蹂몄썝(?쇨컙) ?앷레?쒗솕:</b> ?곷???'+elMap[e2]+'媛 ?뱀떊??'+elMap[e1]+'瑜??꾨굦?놁씠 ?????댁＜?? ?대Ⅸ諛?"諛쏅뒗 ?щ옉"??援ъ“?낅땲?? ?곷?媛 ?먯뿰?ㅻ읇寃??뱀떊??吏吏湲곕컲???섏뼱二쇰ŉ, ?뱀떊? 洹몃줈 ?명빐 ?몄븞?④낵 ?덉젙媛먯쓣 ?살뒿?덈떎. 諛쏅뒗 寃껋뿉 ?듭닕?댁?吏 留먭퀬 源딆? 媛먯궗瑜?瑗??쒗쁽?섏꽭??'; }
      else if(con[e1]===e2){ score-=1; text += '<br><br><b>?ㅽ뻾 ?곴레(?쇨컙)??湲댁옣媛?</b> ?뱀떊??'+elMap[e1]+'媛 ?곷???'+elMap[e2]+'瑜?洹??? ?듭젣?섍퀬 議곗쥌???섎뒗 援ъ“?? ?뱀떊??紐⑤Ⅴ寃??곷???諛⑹떇??媛꾩꽠?섍굅??由щ뱶?섎젮???깊뼢??媛뺥빐吏묐땲?? ??"嫄닿컯???뺣컯"???깆옣???녹쓣吏, ??留됲엳???ㅽ듃?덉뒪媛 ?좎????뱀떊???댄쐶? 諛곕젮?ъ뿉 ?щ젮 ?덉뒿?덈떎.'; }
      else if(con[e2]===e1){ score-=1; text += '<br><br><b>?ㅽ뻾 ?곴레(?쇨컙)??湲댁옣媛?</b> ?곷???'+elMap[e2]+'媛 ?뱀떊??'+elMap[e1]+'瑜??듭젣?섎뒗 ?뺥깭?? 愿怨꾩뿉????곗쨷???뱀떊??吏怨??ㅼ뼱媛嫄곕굹 ?덉튂瑜?蹂닿쾶 ?????덉뒿?덈떎. 留ㅻ젰?곸씤 湲댁옣媛먯씠??媛뺣젰???뚮┝???먯씤???섍린???섏?留? ?κ린?곸쑝濡??뱀떊???먮꼫吏媛 ?쒕뱾吏 ?딅룄濡?媛곸옄??寃쎄퀎??Boundary)??紐낇솗???ㅼ젙?섎뒗 寃껋씠 ??愿怨꾨? ?대━??湲몄엯?덈떎.'; }
    }
  }

  function getTsCategory(p){
    if(!p||!p.d||!p.d.g)return null;
    var dg=p.d.g;
    var groupCnt={鍮꾧쾪:0,?앹긽:0,愿??0,?몄꽦:0,?ъ꽦:0};
    [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
      var t=getTenGod(dg,c);
      if(!t||t==='?')return;
      if(t==='鍮꾧껄'||t==='寃곸옱')groupCnt.鍮꾧쾪++;
      else if(t==='?앹떊'||t==='?곴?')groupCnt.?앹긽++;
      else if(t==='?멸?'||t==='?뺢?')groupCnt.愿??+;
      else if(t==='?몄씤'||t==='?뺤씤')groupCnt.?몄꽦++;
      else if(t==='?몄옱'||t==='?뺤옱')groupCnt.?ъ꽦++;
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
    var who=isSelf?'?뱀떊?':'?곷?諛⑹?';
    if(cat==='愿??){
      if(type==='business'){
        return who+' <b>[愿???뺢?쨌?멸?)]</b> 湲곗슫??吏諛곗쟻?낅땲?? 猷곌낵 ?먯튃, 洹몃━怨?議곗쭅??泥닿퀎瑜?以묒떆?섏뿬 ?낅Т?먯꽌 鍮덊땲?놁씠 二쇰룄沅뚯쓣 ?↔퀬 梨낆엫吏???怨좊궃 由щ뜑 ??낆엯?덈떎. ??븷怨?沅뚰븳留?紐낇솗??二쇱뼱吏꾨떎硫??좊ː??100%???뚰듃?덉?留? 洹??듭젣 ?뺢뎄媛 吏?섏퀜 "??諛⑹떇?濡쒕쭔 ???쇰뒗 ?⑥젙??鍮좎?硫??뚰듃?덉쓽 李쎌쓽?μ쓣 吏덉떇?쒗궗 ???덉쑝???좎뿰??沅뚰븳 ?꾩엫???꾩슂?⑸땲??';
      }else if(type==='friend'){
        return who+' <b>[愿??</b> 湲곗슫??媛뺥빐 移쒓뎄???ъ씠?먯꽌???대Ⅸ?ㅻ읇怨?由щ뜑 ??븷???먯쿂?섎뒗 ?섎━?뚯엯?덈떎. ?뱀떊??怨꾪쉷??吏쒕㈃ ?ㅻ뱾 ?명빐?섏?留? 媛?붿? ?덈Т FM(?먯튃二쇱쓽)?대씪 ?쇨낀?????덉쑝??議곌툑 ??댁???諛깆튂誘몃? 蹂댁뿬二쇱꽭??';
      }else{
        return who+' <b>[愿??</b> 湲곗슫??二쇰룄?섏뿬 ?щ옉???덉뼱?쒕룄 "梨낆엫媛먭낵 蹂댄샇 蹂몃뒫"??癒쇱? ?욎꽠?덈떎. ?곗씤??吏?ㅻ젮??媛뺥븳 ?섏?媛 ?뚮줈????留됲엳???듭젣???붿냼由щ줈 ?붽컩?????덉뒿?덈떎. ?곷?瑜????뚯쑀臾쇱씠 ?꾨땶 ?낅┰???멸꺽泥대줈 議댁쨷?섎뒗 嫄곕━?먭린媛 ?ㅽ엳?????щ옉???붿슧 ?④쾪寃?留뚮벊?덈떎.';
      }
    }
    if(cat==='?앹긽'){
      if(type==='business'){
        return who+' <b>[?앹긽(?앹떊쨌?곴?)]</b> 湲곗슫???뺣룄?곸엯?덈떎. 湲곗〈?????遺?섎뒗 李쎌쓽???꾩씠?붿뼱, ?곗뼱???몃?, 留ㅻ젰?곸씤 ?꾨젅?좏뀒?댁뀡 ?ㅽ궗??媛뺤젏???꾩씠?붿뼱 諭낇겕?낅땲?? ?곸뾽?대굹 湲고쉷 ?먯씠?ㅻ줈 ?쒖빟?섏?留? 踰뚮젮?볦? ?쇱쓣 留덈Т由ы븯???룰뎄?ъ떖??遺議깊븷 ???덉쑝??瑗쇨세???섑샇???뚰듃?덉? ?④퍡?????쒕꼫吏媛 洹밸??붾맗?덈떎.';
      }else if(type==='friend'){
        return who+' <b>[?앹긽]</b> 湲곗슫??媛뺥빐 ?몄젣??紐⑥엫??遺꾩쐞湲?硫붿씠而???븷???≫넚???⑸땲?? ?뱀떊???깆옣?섎㈃ ?먮━媛 ?앷린濡??섏튂硫? ?怨좊궃 ?좊㉧媛먭컖怨??쒗쁽?μ쑝濡?二쇰????щ엺???딆씠吏??딆뒿?덈떎.';
      }else{
        return who+' <b>[?앹긽]</b> 湲곗슫??李④퀬 ?섏퀜 媛먯젙 ?쒗쁽???붿쭅?섍퀬 ?곗븷??留??쒓컙??濡쒕㎤?깊븳 ?대깽?몃줈 留뚮뱶???ъ＜袁쇱엯?덈떎. ?섏?留??딆엫?녿뒗 ?먭레???먰븯湲??뚮Ц??愿怨꾧? ?⑥“濡쒖썙吏硫?癒쇱? 吏猷⑦븿???먮굜 ???덉뒿?덈떎. ?쇱긽 ?띿뿉?쒕룄 ?뚯냼??蹂?붾? 留뚮뱾?닿???吏?쒓? ?꾩슂?⑸땲??';
      }
    }
    if(cat==='鍮꾧쾪'){
      if(type==='business'){
        return who+' <b>[鍮꾧쾪(鍮꾧껄쨌寃곸옱)]</b> 湲곗슫??媛뺣젰???먯닔?깃????낅┰?ш낵 爰얠씠吏 ?딅뒗 寃쎌웳?μ쓣 蹂댁뿬以띾땲?? ??諛묒뿉???쇳븯湲??レ뼱?섎뒗 遺덈룄??낅땲?? ???먮꼫吏瑜??숈뾽????寃쎌슦 ??컻??異붿쭊?μ씠 ?섏?留? ?섍껄 議곗쑉?????섎㈃ 理쒖븙???먯〈???몄??쇰줈 ?숇컲 異붾씫?????덉쑝誘濡? ?대뼡 寃쎌슦?먮룄 ?묐낫?????녿뒗 怨꾩빟???곕뱶?쇱씤??臾몄꽌?뷀빐?먯꽭??';
      }else if(type==='friend'){
        return who+' <b>[鍮꾧쾪]</b> 湲곗슫??媛뺥빐 "???щ엺"?????留밸ぉ?곸씤 ?섎━媛 ???異붿쥌??遺덊뿀?⑸땲?? 移쒗빐吏덉닔濡??닿? ??梨숆꺼以섏빞 ?쒕떎???낆젏?뺤씠 諛쒕룞???洹쇳엳 ?쒖슫?⑥쓣 留롮씠 ?????덉쑝??移쒓뎄???ㅻⅨ ?멸컙愿怨꾨룄 荑⑦븯寃??몄젙?댁＜???踰뷀븿??湲곕Ⅴ?몄슂.';
      }else{
        return who+' <b>[鍮꾧쾪]</b> ?먮꼫吏媛 ?곗븷瑜??대걣硫? "?덈뒗 ??嫄? ?섎뒗 ??嫄??쇰뒗 媛뺣젹???뚯쑀?뺢낵 臾댄븳???뚯떊???ъ궗?⑸땲?? ?щ옉???띾룄媛 吏숈? 留뚰겮 ?곷?媛 議곌툑留??쒕늿???붽굅???앹? ?쒕룄瑜?蹂댁씠硫?洹밸떒?곸씤 吏덊닾濡?蹂?⑸땲?? 臾댁“嫄댁쟻???좊ː???뺤씤留뚯씠 ??留밸젹???щ옉???덉갑?쒗궢?덈떎.';
      }
    }
    if(cat==='?몄꽦'){
      if(type==='business'){
        return who+' <b>[?몄꽦(?뺤씤쨌?몄씤)]</b> 湲곗슫??異⑸쭔?섏뿬, ?덉븵???묒? ?댁씡蹂대떎?????뀁쓣 蹂닿퀬 吏?앷낵 ?뺣낫瑜??섏슜?섎뒗 ?곗뼱??泥쒓린媛 ??낆엯?덈떎. 援먯쑁, ?곌뎄, 湲고쉷泥섎읆 移섎???遺꾩꽍???붽뎄?섎뒗 遺꾩빞?먯꽌 鍮쏆쓣 諛쒗븯吏留??곗쑀遺?⑦븯???됰룞???먮┫ ???덉쑝?? ?ㅽ뻾?μ씠 醫뗭? ?됰룞 ????뚰듃?덇? ?덈??곸쑝濡??꾩슂?⑸땲??';
      }else if(type==='friend'){
        return who+' <b>[?몄꽦]</b> 湲곗슫??諛쒕떖???⑥쓽 ?댁빞湲곕? 源딆씠 怨듦컧?섎ŉ ?ㅼ뼱二쇰뒗 ?뺤떊??吏二?媛숈? 議댁옱?낅땲?? 吏꾩??섍퀬 ?곹샎???섎늻???ν넗??Deep Talk)瑜??듯빐 移쒓뎄? 援먭컧?섎ŉ, ??踰?留븐? ?곗젙? ?몄썡??媛??蹂移??딅뒗 臾듭쭅?⑥쓣 ?먮옉?⑸땲??';
      }else{
        return who+' <b>[?몄꽦]</b> 湲곗슫???곗븷 ?깊뼢??吏諛고빐, ?щ옉??鍮좎????띾룄???먮━吏留???踰??ㅻŉ?ㅻ㈃ ?붾뱾由ъ? ?딅뒗 肉뚮━ 源딆? ?좎젙??蹂댁뿬以띾땲?? ?뺤떊??援먮쪟? ?뚮씪?좊땳???좊ː瑜?理쒖슦?좎쑝濡?移섎ŉ, ?곷??먭쾶??遺紐⑥? 媛숈? ?ш렐??蹂댁궡?뚯쓣 湲곕??섍린???섎땲 ?곹샇 媛꾩쓽 ?섏〈?깆쓣 ?곸젅??議곗젅?댁빞 ?⑸땲??';
      }
    }
    if(cat==='?ъ꽦'){
      if(type==='business'){
        return who+' <b>[?ъ꽦(?뺤옱쨌?몄옱)]</b> 湲곗슫??媛뺥빐 泥좎????꾩떎 媛먭컖怨?寃곌낵 吏?μ쟻???깃낵二쇱쓽?먯엯?덈떎. ?덉쓽 ?먮쫫???쎄퀬 紐⑺몴瑜??깆랬?섎뒗 ??泥쒕??곸씤 媛먭컖???덉뼱, ?묒뾽???ㅼ쭏?곸씤 ?댁쑄 李쎌텧濡?怨㏃옣 ?곌껐?쒗궢?덈떎. ?섏?留?寃곌낵媛 怨㏃옣 蹂댁씠吏 ?딆쑝硫??쎄쾶 ?섏슃???껋쑝???④퀎蹂?蹂댁긽 援ъ“瑜?紐낇솗???섎뒗 寃껋씠 醫뗭뒿?덈떎.';
      }else if(type==='friend'){
        return who+' <b>[?ъ꽦]</b> 湲곗슫??媛뺥빐 移쒓뎄 紐⑥엫?먯꽌???꾩떎?곸씤 議곗뼵怨??좎씡???뺣낫瑜???怨듭쑀?섎뒗 ?ㅼ냽 ?덈뒗 ?ㅽ??쇱엯?덈떎. 媛먯젙??대낫?ㅻ뒗 ?ㅼ쭏?곸씤 ?꾩???以???留덉쓬???몄븞?댁쭛?덈떎.';
      }else{
        return who+' <b>[?ъ꽦]</b> 湲곗슫??異⑸쭔??媛먯젙??援먮쪟留뚰겮?대굹 ?꾩떎?곸씤 ?섍꼍, ?곗씠?몄쓽 吏? ?덉뿉 蹂댁씠??諛곕젮(?좊Ъ, ?뺤꽦)瑜?留ㅼ슦 以묒떆?⑸땲?? 留먮퓧???щ옉蹂대떎 援ъ껜?곸씤 ?됰룞怨?寃곌낵臾쇰줈 ?щ옉???뺤씤?섎젮???깊뼢???덉뼱 ?덉젙?곸씤 湲곕컲??援ъ텞?????곗븷???됰났媛먯씠 湲됱긽?뱁빀?덈떎.';
      }
    }
    return '';
  }
  if(cat1||cat2){
    detail+='<br><br><b style="color:#d81b60;">[?ы솕] 10????꽦) ?먮꼫吏 援ъ“濡?蹂?源딆? 留덉쓬???⑦꽩</b><br><div style="background:rgba(255,240,245,0.7); padding:12px; border-radius:8px; margin-top:6px;">';
    if(cat1 === cat2 && cat1 !== null){
      if(cat1 === '愿??) {
        if(type==='business') detail+='??遺?紐⑤몢 <b>[愿??</b> 湲곗슫??吏諛곗쟻?낅땲?? 泥닿퀎? 猷곗쓣 以묒떆?섎뒗 ?깊뼢???쇱튂???꾨줈?앺듃瑜??덉젙?곸쑝濡??대걣?닿컩?덈떎. ?섏?留??쒕줈 二쇰룄沅뚯쓣 伊먮젮 ?섍굅???먯떊???먯튃??怨좎쭛?섎㈃ ?쏀뙺??湲곗떥???踰뚯뼱吏????덉쑝?? 媛곸옄????븷怨?沅뚰븳??紐낇솗??遺꾨━?섎뒗 寃껋씠 ?듭떖?낅땲??';
        else if(type==='friend') detail+='??遺?紐⑤몢 <b>[愿??</b> 湲곗슫??媛뺥븳 ?섎━?뚯엯?덈떎. ?쒕줈 ?좎쓣 吏?ㅻŉ ?덉쓽 諛붾Ⅴ怨??ъ쭅???곗젙???섎닏?덈떎. ?ㅻ쭔 ?????덈Т 吏꾩??섍퀬 FM?濡??됰룞?섎젮??蹂대땲 媛?붿? ?쇨낀?댁쭏 ???덉뒿?덈떎. 留뚮궗???뚮뒗 ?쒓퍘 ??댁????ъ쑀瑜?媛?몃낫?몄슂.';
        else detail+='???щ엺 紐⑤몢 <b>[愿??</b> 湲곗슫???곗븷瑜?二쇰룄?⑸땲?? ?쒕줈媛 ?쒕줈?먭쾶 ?ъ쭅??蹂댄샇?먯씠??梨낆엫媛??덈뒗 ?곗씤???섎젮 ?섍린?? ?덉젙媛먯? 理쒓퀬議곗뿉 ?ы빀?덈떎. ?섏?留?????二쇰룄沅뚯쓣 伊먭퀬 洹쒖튃???몄슦?ㅻ떎 蹂대땲 ?쏀뙺???먯〈???寃곗씠 踰뚯뼱吏????덉뒿?덈떎. "??諛⑹떇"??怨좎쭛?섍린蹂대떎 ?곷???"諛⑹떇"???⑥쟾??議댁쨷?섎뒗 ?좎뿰?⑥씠 ??寃ш퀬???щ옉???ㅻ옒 ?좎??섎뒗 鍮꾧껐?낅땲??';
      } else if(cat1 === '?앹긽') {
        if(type==='business') detail+='??遺?紐⑤몢 <b>[?앹긽]</b> 湲곗슫???뺣룄?곸엯?덈떎. ?꾩씠?붿뼱媛 ?섏튂怨?湲고쉷?μ씠 ?곗뼱????컻?곸씤 ?쒕꼫吏瑜??낅땲?? ?섏?留??????쇱쓣 踰뚯씠?????좎닔???섏뒿??踰꾧굅?????덉쑝?? ?뷀뀒?쇱쓣 梨숆린怨?留덈Т由щ? ?꾨떞??蹂댁셿梨낆쓣 留덈젴?섎뒗 寃껋씠 ?덉쟾?⑸땲??';
        else if(type==='friend') detail+='??遺?紐⑤몢 <b>[?앹긽]</b> 湲곗슫??媛??留뚮굹湲곕쭔 ?섎㈃ ?껋쓬???딆씠吏 ?딅뒗 ?섏긽???고궎?移대? ?먮옉?⑸땲?? ?????놁씠 ?좊뱾怨??몃뒗 遺꾩쐞湲?硫붿씠而?肄ㅻ퉬吏留? 媛??留먯씠 ?욎꽌 ?곸쿂瑜?以????덉쑝???꾪꽣留곸? ?댁쭩 ?꾩슂?⑸땲??';
        else detail+='???щ엺 紐⑤몢 <b>[?앹긽]</b> 湲곗슫???섏퀜?먮쫭?덈떎. ?섏씠 留뚮굹硫??????놁씠 ??붽? ?댁뼱吏怨?留ㅼ씪???대깽??媛숈? 濡쒕㎤?깊븳 ?곗븷媛 ?쇱퀜吏묐땲?? 媛먯젙 ?쒗쁽???붿쭅?섍퀬 ?먮꼫吏媛 ?섏퀜 吏猷⑦븷 ?덉씠 ?놁?留? 洹몃쭔??媛먯젙 湲곕났??異⑸룎???뚮뒗 遺덇퐙 ????ㅽ댘?쇰줈 踰덉쭏 ???덉뒿?덈떎. ?쒕줈??媛먯젙???잛븘?닿린蹂대떎?????쒗룷 ?ъ뼱媛????붾쾿???곗뒿?댁빞 ?쒕꼫吏媛 諛곌??⑸땲??';
      } else if(cat1 === '鍮꾧쾪') {
        if(type==='business') detail+='??遺?紐⑤몢 <b>[鍮꾧쾪]</b> 湲곗슫??媛뺣젰?⑸땲?? ?낅┰?ш낵 ?밸??뺤쑝濡?媛뺣젰???먮꼫吏瑜?遺꾩텧?섎ŉ 留⑤븙???ㅻ뵫?섎벏 諛?대텤?대뒗 媛쒖쿃???뚰듃?덉엯?덈떎. 洹몃윭??寃곗젙?곸씤 ?쒓컙 ?먯〈?ъ쓣 援쏀엳吏 ?딆븘 怨듬뱾???묒씠 臾대꼫吏????덉쑝?? ?곹샇 媛꾩쓽 ?꾨꼍???섑룊???뚰듃?덉떗怨?媛앷??곸씤 ?묐낫 湲곗????몄썙???⑸땲??';
        else if(type==='friend') detail+='??遺?紐⑤몢 <b>[鍮꾧쾪]</b> 湲곗슫??媛뺥빐 ?꾧뎄蹂대떎 ?쒕줈瑜??덈걟?섍쾶 梨숆린???대챸 怨듬룞泥댄삎 ?곗젙?낅땲?? ?ㅻ쭔 ???몄씠?쇰뒗 ?뚯쑀?뺤씠 媛뺥빐 移쒓뎄媛 ?ㅻⅨ 紐⑥엫??媛??寃껋뿉 ?洹쇳엳 吏덊닾瑜??먮굜 ???덉쑝??荑⑦븯寃??쒕줈瑜???댁＜???됰꼮?⑥씠 ?꾩슂?⑸땲??';
        else detail+='???щ엺 紐⑤몢 <b>[鍮꾧쾪]</b> ?먮꼫吏媛 ?곗븷瑜??대걚??嫄곗슱 媛숈? 愿怨꾩엯?덈떎. ?쒕줈?????媛뺣젹???뚯쑀?뺢낵 ?뚯떊???꾨꼍???쇱튂?섏뿬 ?몄긽???뺣뵲?쒗궎怨??섎쭔???곗＜??鍮좎졇?쒕뒗 留밸젹???щ옉??蹂댁뿬以띾땲?? 洹몃윭???먯〈?ъ씠 留ㅼ슦 媛뺥빐 ??踰?遺?ろ엳硫??꾧뎄??癒쇱? 援쏀엳吏 ?딅뒗 嫄곗꽱 ??뭾???쇱뼱?⑸땲?? "?덉? ????湲곗떥????섏뼱 "?곕━"?쇰뒗 怨듬룞泥??섏떇?쇰줈 ?꾩쟾?????몄씠 ?섏뼱以??? 臾댁“嫄댁쟻???좊ː媛 ?꾩꽦?⑸땲??';
      } else if(cat1 === '?몄꽦') {
        if(type==='business') detail+='??遺?紐⑤몢 <b>[?몄꽦]</b> 湲곗슫??異⑸쭔?⑸땲?? ???뀁쓣 蹂대뒗 ?듭같?κ낵 泥쒓린???ш퀬媛 源딆뼱 湲고쉷怨??곌뎄 遺꾩빞?먯꽌 理쒓퀬??吏???쒕꼫吏瑜??낅땲?? 臾몄젣?????щ엺 紐⑤몢 ?ㅽ뻾蹂대떎???앷컖怨?寃?좎뿉 癒몃Т瑜닿린 ?ъ썙 吏꾨룄媛 ???섍컝 ???덉뒿?덈떎. 紐낇솗??留덇컧?쇱쓣 ?뺥븯怨??곗꽑 ?吏瑜대뒗 ?됰룞?μ씠 ?꾩슂?⑸땲??';
        else if(type==='friend') detail+='??遺?紐⑤몢 <b>[?몄꽦]</b> 湲곗슫??諛쒕떖??怨좊????몄뼱?볤퀬 ?대㈃???꾪뵒???꾨줈諛쏅뒗 理쒓퀬???뚯슱硫붿씠?몄엯?덈떎. ?쒕줈???뺤떊??吏二???븷???섎ŉ ?ν넗?щ? 利먭린???붿옍?섍퀬??臾듭쭅???곗젙???댁뼱?섍컩?덈떎.';
        else detail+='???щ엺 紐⑤몢 <b>[?몄꽦]</b> 湲곗슫???곗븷瑜???텇 吏諛고빀?덈떎. ?뚮씪?좊땳?섍퀬 ?뺤떊?곸씤 援먮쪟瑜?理쒓퀬濡?移섎ŉ, ?덈튆留?遊먮룄 ?쒕줈???곸쿂瑜?蹂대벉?댁＜??源딆? ?곹샎???⑥쭩?낅땲?? ?섏?留????щ엺 紐⑤몢 癒쇱? ?щ옉諛쏄퀬 ?섏슜諛쏄린瑜??먰빐 愿怨꾨? 由щ뱶?섍린 二쇱??????덉뒿?덈떎. 媛?붿? ?쒕줈??留덉쓬??吏먯옉留??섏? 留먭퀬, ?⑷린 ?댁뼱 癒쇱? ?ㅺ?媛 ?좎젙???쒗쁽??二쇰뒗 ?곴레?깆씠 ???붿옍???몄닔???뺢퀬???앷린瑜?遺덉뼱?ｌ뒿?덈떎.';
      } else if(cat1 === '?ъ꽦') {
        if(type==='business') detail+='??遺?紐⑤몢 <b>[?ъ꽦]</b> 湲곗슫??媛뺥빐 ?대낫?????꾩떎?곸씪 ???녿뒗 理쒓퀬??鍮꾩쫰?덉뒪 肄ㅻ퉬?낅땲?? 紐⑹쟻 吏?μ쟻?닿퀬 ?댁쑄 李쎌텧?대씪??紐낇솗??紐⑺몴 ?꾨옒 ??移섏쓽 ?ㅼ감 ?놁씠 ?吏곸엯?덈떎. ?ㅻ쭔 ?뱀옣 ?덉씠 ???섎뒗 ?쒓린瑜?踰꾪떚???섏씠 ?쏀븷 ???덉쑝???κ린?곸씤 鍮꾩쟾 怨듭쑀媛 ?꾩닔?낅땲??';
        else if(type==='friend') detail+='??遺?紐⑤몢 <b>[?ъ꽦]</b> 湲곗슫??媛뺥빐 ?ㅼ냽 ?녿뒗 媛먯젙 ?뚮え蹂대떎??堉??뚮━??議곗뼵怨??꾩떎?곸씤 ?꾩???二쇨퀬諛쏅뒗 媛???좎씡??移쒓뎄 ?ъ씠?낅땲?? ?ы뀒?щ굹 而ㅻ━??怨좊????섎늻湲?醫뗭뒿?덈떎.';
        else detail+='???щ엺 紐⑤몢 <b>[?ъ꽦]</b> 湲곗슫??異⑸쭔?섏뿬 洹밸룄濡??꾩떎?곸씠怨??ㅼ냽 ?덈뒗 ?곗븷瑜?異붽뎄?⑸땲?? 遺덊븘?뷀븳 媛먯젙 ??퉬瑜??レ뼱?섍퀬 ?곗씠?몄쓽 ?⑥쑉?깆씠??誘몃옒??寃쎌젣??湲곕컲????뒗 ???꾨꼍???⑹쓣 蹂댁엯?덈떎. ?? ?④퍡 誘몃옒瑜??ㅺ퀎?섎ŉ 鍮좊Ⅴ寃??덉젙??李얠?留?媛?붿? 吏?섏튂寃??꾩떎 怨꾩궛留??욎꽌 愿怨꾧? 嫄댁“?댁쭏 ?꾪뿕???덉뒿?덈떎. ?꾨Т ?좊룄 ?꾨땶 ?? ?앷컖吏??紐삵븳 源쒖쭩 ?좊Ъ?대굹 ??쭔?곸씤 移?갔?쇰줈 硫붾쭏瑜?媛먯꽦???⑤퉬瑜??대젮二쇱뼱???⑸땲??';
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
  var GAN_HE={??'藥?,藥?'??,阿?'佯?,佯?'阿?,訝?'渦?,渦?'訝?,訝?'鶯?,鶯?'訝?,??'??,??'??};
  var GAN_CHONG={??'佯?,佯?'??,阿?'渦?,渦?'阿?,訝?'鶯?,鶯?'訝?,訝?'??,??'訝?};
  var JI_HE={耶?'訝?,訝?'耶?,野?'雅?,雅?'野?,??'??,??'??,渦?'??,??'渦?,藥?'??,??'藥?,??'??,??'??};
  var JI_CHONG={耶?'??,??'耶?,訝?'??,??'訝?,野?'??,??'野?,??'??,??'??,渦?'??,??'渦?,藥?'雅?,雅?'藥?};

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
    grade='?뙚 S湲?;gradeIcon='?뮟';gradeLabel='?꾩깮???띾뫁??蹂?;
    gradeDesc='[泥쒓컙??吏吏?? 泥쒓컙(?섎뒛????怨?吏吏(?낆쓽 ?꾩떎)媛 ?꾨꼍?????????대（?? ?섎갚留?遺꾩쓽 ???뺣쪧濡?留뚮굹??洹뱁엳 ?쒕Ц ?곗＜???몄뿰?낅땲??';
    story='癒??꾩깮?????곹샎? ?섎굹??嫄곕????щ챸???꾪빐 ?④퍡 ?쒖뼱?ъ뒿?덈떎. ?ㅼ듅怨??쒖옄?嫄곕굹, ???섎씪瑜??④퍡 ?몄슫 ?숈??嫄곕굹, ?꾩웳?곗뿉???쒕줈??紐⑹닲??湲곌볼??????댁뼱以 ?덈???援ъ썝?먯???寃껋엯?덈떎. ?≪떊? ?ㅻ윭議뚯뼱???곹샎???덇꺼吏?洹?源딆? ?쎌냽???딆뼱吏吏 ?딆븘 ?곗＜媛 ??嫄곕????섎젅諛뷀대? ?뚮젮 ?대쾲 ?앹뿉???뱀떊?ㅼ쓣 ?ㅼ떆 留뚮굹寃??명똿?덉뒿?덈떎. 泥섏쓬 留뚮궃 ?쒓컙遺???댁쑀 ?놁씠 ?잛븘吏??留밸ぉ?곸씤 ?좊ː? ?덈Ъ ?섎룄濡?洹몃━?좊뜕 媛먯젙? 寃곗퐫 ?곗뿰?대굹 李⑷컖???꾨떃?덈떎.';
    prescription='[?덈? 蹂댁〈??踰뺤튃]: ???몄뿰???꾩껌??臾닿쾶瑜??쇱긽???몄븞??痍④툒?섎ŉ 媛踰쇱씠 ?ш린吏 留덉꽭?? ?꾩깮??洹?源딆? ??쒕줈???몄뿰???꾩깮?먯꽌 ?ㅻ쭔?댁?硫?源롮씠怨?遺?쒖쭛?덈떎. ???щ엺???먮꼫吏???⑥닚???섏씠 ??癒밴퀬 ?섏궗??寃껋쓣 ?섏뼱 ?몃?濡?六쀬뼱?섍????⑸땲?? ?④퍡 ?대０ 嫄곕???怨듬룞??紐⑺몴???ы쉶?곸씤 ?좏븳 ?곹뼢?μ쓣 ?ㅺ퀎?섏뿬 洹?嫄곕???鍮쏆쓽 ?먮꼫吏瑜??딆엫?놁씠 諛쒖궛?섏꽭??';
  }else if(pScore>=3){
    grade='??A湲?;gradeIcon='?뙵';gradeLabel='?대챸???곗옄酉??몄뿰';
    gradeDesc='[媛뺣젰???⑹쓽 湲곗슫] ?꾩깮??源딆? ?뺤꽌??援먭컧?대굹 留ㅼ슦 援ъ껜?곸씤 ?쎌냽???덉뿀??移대Ⅴ留??뚰듃?덉엯?덈떎. ?댁쑀 ?녿뒗 媛뺣젹???뚮┝???뺤껜?낅땲??';
    story='?????щ엺? 湲멸퀬 湲??꾩깮???ㅽ럺?몃읆 ?대뵖媛?먯꽌 ?대? ?쒕줈??泥댁삩怨??④껐???덈Т?????뚭퀬 ?덉뿀?듬땲?? ?앹쟾 泥섏쓬 留뚮궃 ??꽑 ?덈룞???띿뿉???먭뺨吏??吏?낇엳 臾섑븳 移쒓렐媛? ?대뵖媛 ?ㅻ옒?꾨?????붾? ?댁뼱??寃?媛숈? ?????녿뒗 ?곗옄酉???洹멸쾬? ?뚯쓽 ?ㅻ쪟媛 ?꾨땲???곹샎??湲곗뼲?낅땲?? ?댁찈硫??쒖そ???ㅻⅨ ?쒖そ?먭쾶 誘몄쿂 媛싳? 紐삵븳 鍮??щ옉?대뱺 ?뚯떊?대뱺)??媛싳쑝??遺由щ굹耳 李얠븘?붽굅?? ?꾩깮??留덉?留??쒓컙??梨??앸㎈吏 紐삵븳 ?좎젅???댁빞湲곕? 留덉? ?꾩꽦?섍린 ?꾪빐 癒?湲몄쓣 ?뚯븘 ?꾩깮??臾대????④퍡 ?ㅻⅨ 寃껋엯?덈떎.';
    prescription='[吏꾩떎??嫄곗슱 踰뺤튃]: ???대챸??留뚮궓??吏꾩젙???꾩꽦?쇰줈 ?대걣?ㅻ㈃ 泥좎???"?곹샎???뚮じ"???섏뼱???⑸땲?? ?꾩깮?먯꽌 ?ㅽ빐濡??명빐 ?쇱폒???덈뜕 留먮뱾, ?④린怨??쇱옄 ?볦븯???곸쿂瑜??꾩깮?먯꽌 ?④??놁씠 爰쇰궡???뚮룆?섏꽭?? ???몄뿰??媛??二쇰뒗 李뚮┸??遺덊렪?⑥“李??꾩깮???붿옱?대땲 ?덈? ?뚰뵾?섏? 留먭퀬 ?뺣㈃?쇰줈 留덉＜ ?덉븘?쇰쭔 鍮꾨줈???꾩쟾??移대Ⅴ留덉쓽 ?댁냼媛 ?대（?댁쭛?덈떎.';
  }else if(pScore>=1){
    grade='?뙮 B湲?;gradeIcon='?뙼';gradeLabel='?ㅼ떆 ?뱁듃???몄뿰';
    gradeDesc='[媛踰쇱슫 ??蹂듭쓬] ?꾩깮???대뒓 ???먮씫?먯꽌 ?룰퉫???ㅼ튂??媛蹂띻쾶 ?몄뿰??留븐뿀???뺤? 移대Ⅴ留덇? ?꾩깮?먯꽌 諛쒖븘??湲고쉶瑜??살뿀?듬땲??';
    story='?꾩깮?먯꽌 ???щ엺? 吏㏐퀬 援듭? 援щ??ъ쭊 愿怨꾨낫?ㅻ뒗 諛붾엺泥섎읆 ?ㅼ퀜 媛??ъ씠??듬땲?? 踰덊솕???쒖옣?듭뿉???곗뿰???덉씠 留덉＜移??곸씤怨??먮떂?댁뿀嫄곕굹, 鍮꾨? ?쇳빐 ?좎떆 媛숈? 泥섎쭏 諛묒쑝濡??곗뼱?ㅼ뼱??媛숈? 留덉쓣 ?щ엺?댁뿀?꾩? 紐⑤쫭?덈떎. ?밸퀎??媛먯젙??遺梨꾨굹 ?먰븳? ?놁뿀?쇰굹, 臾섑븯寃?醫뗭? ?붿긽?쇰줈 ?⑥? 洹??ㅼ묠???꾩깮?먯꽌????臾댁꽦??媛吏瑜?六쀬뼱 源딆씠 ?덈뒗 ?뀁쑝濡??먮씪??湲고쉶???⑥븮???살? 寃껋엯?덈떎.';
    prescription='[臾쇱쓽 踰뺤튃]: 嫄곗갹???뚯슱硫붿씠?몄쓽 ?쒖궗瑜?媛뺤슂?섍굅??臾대━?섍쾶 ?ν넗?щ? ?대걣?대궡???섏? 留덉꽭?? ???몄뿰? ??슦媛 ?꾨땲???덇컻鍮꾩쿂???쇱긽???묎퀬 ?뚯냼???뺤꽦???먯뼇遺꾩쓣 ?살뼱 ?먮씪?⑸땲?? 諛μ? 癒뱀뿀?붿? 臾산퀬, ?묒? 珥덉퐳由우쓣 嫄대꽕??洹?媛踰쇱슫 諛쒓구???띿뿉???꾩깮???ㅼ퀜 媛붾뜕 ?몄뿰???꾩깮?먯꽌???좊뱺??肉뚮━瑜??대━??湲곗쟻??留쏅낵 ???덉뒿?덈떎.';
  }else if(pScore===0){
    grade='??C湲?;gradeIcon='?뵰';gradeLabel='諛깆? ?꾩쓽 ?덈줈???몄뿰';
    gradeDesc='[移대Ⅴ留??쒕줈] ?쏀엳怨좎꽕??鍮싳씠??源딆? ?쎌냽 ???꾩깮??臾닿굅???곌껐怨좊━媛 ?꾪? 媛먯??섏? ?딅뒗, ???앹뿉???꾨꼍???덈∼寃?李쎌“?섎뒗 ?쒕갚???뚰듃?덉떗?낅땲??';
    story='?꾩깮?대씪??源딄퀬 臾닿굅???쒓퀬?먯꽌 ???щ엺???댁빞湲곌? ?곹엺 梨낆쓣 李얠쓣 ???놁뒿?덈떎. ?닿쾬? ?ㅻ쭩???쇱씠 ?꾨땲???ㅽ엳???꾨꼍??異뺣났?낅땲?? ?쒕깘?섎㈃ ???щ엺? ?쒕줈?먭쾶 媛싳븘?????먰븳?? ?듭?濡??뚰솕?댁빞 ???낅낫??李뚭볼湲곕룄 ?놁씠 媛???쒖닔?섍퀬 源⑤걮??異쒕컻?좎뿉 ???덈떎???살씠湲??뚮Ц?낅땲?? ?꾩깮??愿?깆씠???댁쑀 紐⑤? 援ъ냽?μ쓽 臾닿쾶 ?놁씠 ?ㅼ쭅 ???щ엺???먯쑀?섏?? ?좏깮留뚯쑝濡???愿怨꾩쓽 紐⑤뱺 堉덈?? ?됯퉼??移좏빐?섍컝 ???덈뒗 ?꾩껌??諛깆??섑몴瑜?諛쏆븯?듬땲??';
    prescription='[?먯쑀 李쎌“??踰뺤튃]: ?곷?諛⑹쓣 ?????"???щ엺? ?먮옒 ?대윺 嫄곗빞"?쇰뒗 怨쇨굅???곗씠?곕굹 ?멸껄???됱븞寃쎌쓣 泥좎???遺?섏꽭?? 吏湲????щ뒗 ??1遺?1珥덈????대뼡 ?쒖궗瑜??곌퀬, ?대뼡 ?λⅤ??愿怨?濡쒕㎤?? 肄붾??? ?대㉫?ㅽ걧)瑜?留뚮뱾?닿컝吏 ?⑥쟾???섏쓽 ??붿? ?⑹쓽濡??몄썙?섍?硫??⑸땲?? 媛??臾닿굅??移대Ⅴ留덉뿉???대갑??媛???먯쑀濡쒖슫 ?곹샎?ㅼ쓽 留뚮궓?낅땲??';
  }else if(pScore>=-3){
    grade='?좑툘 D湲?;gradeIcon='??;gradeLabel='??댁빞 ??留ㅻ벊, ?낅낫(Karma)???몄뿰';
    gradeDesc='[異?亦???諛쒖깮] ?꾩깮???쒕줈??媛?댁뿉 源딆? ?딆? ?곸쿂??梨??吏 紐삵븳 ?ㅽ빐瑜??④릿 誘몄셿?깆쓽 ?몄뿰. 洹?遺덊렪??留ㅻ벊???湲??꾪빐 ?ъ감 ?뚰솚?섏뿀?듬땲??';
    story='??愿怨꾩뿉???꾩깮???쒕줈瑜??꾪봽寃??덇굅??毓곗”?섍쾶 ?由쏀뻽??"誘몄꽭???낅낫??媛??媛 ?⑥븘 ?덉뒿?덈떎. 癒몃━濡쒕뒗 ?댄빐?섎뒗??臾섑븯寃??먯〈?ъ씠 ?곹븯嫄곕굹, ?꾩＜ ?ъ냼??留??쒕쭏?붿뿉 ?좉꼍???좎뭅濡?쾶 怨ㅻ몢?쒕뒗 洹??댁쑀 紐⑤? 遺덊렪?⑥? ?깃꺽 李⑥씠媛 ?꾨땲??諛붾줈 ?꾩깮???뷀쓷??蹂대궡???뚮엺?낅땲?? ?섏?留??먮젮?뚰븯吏 留덉꽭?? 洹?源뚮걣源뚮걣???낅낫瑜??덉? 梨??꾩깮?먯꽌 ?쒕줈瑜??먮떎???밴꺼?붾떎??寃껋?, 諛붾줈 吏湲????앹뿉??洹?瑗ъ씤 留ㅻ벊???꾩쟾??踰좎뼱?댁뼱 ? ???덈뒗 ?덊샇??湲고쉶媛 二쇱뼱議뚮떎??媛뺣젰??諛섏쬆?낅땲??';
    prescription='[?좎젣 ?ш낵??踰뺤튃]: ??愿怨꾩뿉??怨좎옣 ???덉퐫?쒖쿂??諛섎났?섎뒗 ?뱀젙 媛덈벑 ?⑦꽩(??臾몄젣, ?곕씫 臾몄젣, 留먰닾 臾몄젣 ?????꾨?寃?媛숈? ?쒖꽑?쇰줈 愿李고븯?몄슂. 洹?吏湲뗭?湲뗮븳 ?⑦꽩??臾삵??덈뜕 ?꾩깮???낅낫瑜?媛由ы궎???묒뒪?덉씠 ?ъ쭊?낅땲?? 臾몄젣瑜?? ???섎굹??諛⑸쾿? 臾댁“嫄댁쟻???섏감?낅땲?? "?꾧? 留욌깘"瑜??곗????먭퀬???ㅼ쐞移섎? ?꾧퀬, 癒쇱? 怨좉컻 ?숈뿬 ?몄＜怨?移섎챸?곸씤 ?쎌젏??媛먯떥 ?덉븘二쇰뒗 履쎌씠 ?섏쿇 ??臾듭? ?낆뿰???좎궗?ъ쓣 ?딆뼱?대뒗 吏꾩젙???밸━?먭? ?⑸땲??';
  }else{
    grade='?? F湲?;gradeIcon='?뵦';gradeLabel='???섎━硫?諛곗슦???낆뿰???臾쇰┝';
    gradeDesc='[泥쒖땐吏異?鸚⒵쿀?경쿀)] 泥쒓컙怨?吏吏媛 紐⑤몢 嫄곗튌寃?遺?れ튂??洹밴컯???뚭눼??議고빀. ?꾩깮???쒕줈???앹〈???꾪삊??留뚰겮 源딄퀬 移섎챸?곸씤 移대Ⅴ留?鍮싳쓣 吏?愿怨꾩엯?덈떎.';
    story='???곹샎 二쇰??먮뒗 ?꾩깮??李④컩怨?????移쇰컮?뚯씠 遺덇퀬 ?덉뒿?덈떎. ?대뱾? 怨쇨굅???쒕줈?먭쾶 吏?????녿뒗 ?꾩껌???곸쿂, 諛곗떊, ?뱀? ?뚮㈇??二쇨퀬諛쏆븯??媛??移섎챸?곸씤 ?숈쟻?댁뿀?듬땲?? 洹몃윴?????ㅼ떆 留뚮궗?꾧퉴?? 洹?媛뺣젹?섍퀬 ?낆꽦 媛뺥븳 ?뚮┝???룸㈃?먮뒗 ?쒕줈瑜??좏댁뼱?쇰쭔 ?뚮㈇?섎뒗 ?대몢???낅낫???먮꼫吏媛 ?⑥븘?덇린 ?뚮Ц?낅땲?? 踰쀬뼱?섎젮 諛쒕쾭??爾먮룄 吏꾪쓾???띿쑝濡????먯꽍泥섎읆 鍮⑤젮 ?ㅼ뼱媛????븳 ?듭젣 遺덈뒫???좎쬆 ???닿쾬???꾩깮 ?낆뿰??媛??紐낅갚??利앷굅?낅땲?? ?댁찈硫??대쾲 李곕굹???앹씠 洹?吏?낇븳 ?섎쭔 ?꾩쓽 ?낆뿰 怨좊━?먯꽌 ?덉텧?????덈뒗 ?곗＜媛 以 留덉?留?鍮꾩긽援ъ씪吏 紐⑤쫭?덈떎.';
    prescription='[?덈떒怨?諛⑹깮??踰뺤튃]: 愿怨꾨? 吏?랁븷?섎줉 吏꾩쭨 ?섎? ?껋뼱踰꾨━怨?諛붾떏 紐⑤? ?ъ뿰?쇰줈 ?뚮젮媛??湲곕텇???좊떎硫??뱀옣 釉뚮젅?댄겕瑜?諛잛쑝?몄슂. 移대Ⅴ留덈? ?쇰떎??李⑷컖 ?꾨옒 怨꾩냽 怨곸뿉 ?⑥븘???딆엫?놁씠 ?쒕줈瑜??쒕룄吏덊븯??寃껋? ?낅낫瑜??뚮㈇?쒗궎??寃껋씠 ?꾨땲???댁옄瑜?爾먯꽌 鍮싳쓣 ?섎━???됱쐞?낅땲?? ?뚮줈??洹??щ엺?????띠뿉??怨쇨컧???섎씪?닿퀬 議곗슜???щ씪??二쇰뒗 寃곕떒, 洹??먮퉬濡?퀬 ?됱젙??嫄곕━?먭린留뚯씠 ???곹샎 紐⑤몢瑜?援ъ썝?섍퀬 ?ㅽ쉶???낆닚?섏쓣 ?곸썝???앸궡??媛???꾨????щ옉??諛⑹떇?낅땲??';
  }

  var buildCrossResult = function(dg, dj, yg, yj, ganHe, ganChong, ganSame, jiHe, jiChong, jiSame) {
    var descHe = ganHe ? '????' : ganChong ? '異?亦?' : ganSame ? '????' : '臾???';
    var descJi = jiHe ? '????' : jiChong ? '異?亦?' : jiSame ? '????' : '臾???';
    var ganCls = ganHe ? 'pc-he' : ganChong ? 'pc-chong' : ganSame ? 'pc-same' : 'pc-none';
    var jiCls = jiHe ? 'pc-he' : jiChong ? 'pc-chong' : jiSame ? 'pc-same' : 'pc-none';

    var chipGan = '<div class="pastlife-chip ' + ganCls + '">' + dg + ' <span style="font-size:0.7rem;opacity:0.8">' + descHe + '</span> ' + yg + '</div>';
    var chipJi = '<div class="pastlife-chip ' + jiCls + '">' + dj + ' <span style="font-size:0.7rem;opacity:0.8">' + descJi + '</span> ' + yj + '</div>';
    var chips = '<div class="pastlife-cross-chips">' + chipGan + chipJi + '</div>';
    
    var txt = '';
    if (ganHe && jiHe) {
      txt = '<b>泥쒖??숉빀(鸚⒴쑑?뚦릦)??湲곗쟻:</b> 泥쒓컙(?뺤떊)怨?吏吏(?꾩떎)媛 ?꾨꼍?섍쾶 留욌Ъ???뚯븘媛??寃쎌씠濡쒖슫 援ъ“?낅땲?? ?꾩깮???뱀떊?????щ엺???앸챸??援ы뻽嫄곕굹, ?몄깮??媛??源딆? ?섎쟻?먯꽌 ?곹샎???뚯뼱?щ젮 以 ?덈?????몄씠?덉쓣 ?뺣쪧??留ㅼ슦 ?믪뒿?덈떎. 堉덉뿉 ?덇꺼吏?洹?源딄퀬 吏꾪븳 媛먯궗?⑥씠 ?꾩깮?먯꽌 "?댁쑀 ?놁씠 ???댁＜怨??띠? 留밸ぉ?곸씤 ?대걣由쇨낵 蹂댄샇蹂몃뒫"?쇰줈 諛쒗쁽?섍퀬 ?덉뒿?덈떎. ?곷떎由ш? 遺?ъ??꾨줉 踰좏??대룄 ?꾧튉吏 ?딆? ?몄뿰?낅땲??';
    } else if (ganHe) {
      txt = '<b>泥쒓컙??鸚⒴묾?????뺤떊??怨듬챸:</b> ?덉뿉 蹂댁씠吏 ?딅뒗 ?섎뒛??湲곗슫, 利??ъ긽怨?泥좏븰?먯꽌 源딆? ?숆린?붽? ?쇱뼱?⑸땲?? ?꾩깮?????щ엺? 媛숈? ?ㅼ듅 諛묒뿉???숇Ц???쇳븯嫄곕굹, 媛숈? ?좊뀗怨?醫낃탳瑜??덇퀬 ??諛⑺뼢??諛붾씪蹂대ŉ 嫄몄뼱媛??곹샎???숈???듬땲?? 洹몃옒??諛?留덈뵒 留먮낫???덈튆 ??踰덉쑝濡??쒕줈???띾쭏?뚯쓣 轅곕슟??蹂대뒗 ?뚮쫫 ?뗫뒗 ?붾젅?뚯떆瑜??먯＜ 寃쏀뿕?섍쾶 ?⑸땲??';
    } else if (jiHe) {
      txt = '<b>吏吏???경뵱?????꾩떎??諛李?</b> ?낆쓽 湲곗슫???⑹퀜吏???ㅽ궓?? ?앺솢 ?듦?, 洹몃━怨??쇱긽??怨듭쑀?섎뒗 ?쒗룷媛 ??쇱슱 ?뺣룄濡???留욎뒿?덈떎. ?꾩깮????吏遺??꾨옒??諛μ쓣 ?섎닠 癒뱀쑝硫?紐⑥쭊 ?랁뙆瑜??④퍡 寃щ럩??遺遺??媛議깆쓽 吏꾪븳 移대Ⅴ留??붿쟻?낅땲?? 嫄곗갹??留먮낫???쇱긽???쇰?濡?遺??쇰ŉ ?④퍡????嫄곕????덉젙媛먯씠 ??컻?⑸땲??';
    } else if (ganChong && jiChong) {
      txt = '<b>泥쒖땐吏異?鸚⒵쿀?경쿀)???뚭눼???붿쟻:</b> ?뷀엳 留먰븯??媛???먮젮???뺥깭??異⑸룎?낅땲?? ?뱀떊???쇱＜(?꾩깮????堉덈?)媛 ?곷????꾩＜(?꾩깮??肉뚮━)瑜?泥섏갭?섍쾶 諛뺤궡 ?닿퀬 ?덉뒿?덈떎. ?꾩깮???쒕줈???깆뿉 鍮꾩닔瑜?苑귥븯嫄곕굹 ?살쓣 ???녿뒗 ?먰븳??留븐뿀??媛???뷀샊??媛?댁옄? ?쇳빐?먯쓽 援щ룄??????덉뒿?덈떎. ?대쾲 ?앹뿉 洹?吏?낇븳 ?쇱쓽 鍮싳쓣 泥?궛?섍퀬 ?딆뼱?닿린 ?꾪빐 ?ㅼ떆 留뚮궗?쇰땲, 洹뱁븳???몃궡?ъ씠 ?꾩슂?⑸땲??';
    } else if (ganChong) {
      txt = '<b>泥쒓컙異?鸚⒴묾亦????좎뭅濡쒖슫 ?由?</b> ?앷컖??肉뚮━? 媛移섍????뺣㈃?쇰줈 遺?ろ? 遺덇퐙???源곷땲?? ?꾩깮???쒕줈 ?ㅻⅨ 吏꾩쁺???μ닔濡?移쇱쓣 寃⑤늻?덇굅?? ??移섏쓽 ?묐낫???녿뒗 ?좊뀗???쇱웳??踰뚯????쇱씠踰?愿怨꾩??듬땲?? ?꾩깮?먯꽌??蹂꾧쾬 ?꾨땶 二쇱젣濡쒕룄 ?쎄쾶 紐⑹냼由ш? ?믪븘吏??寃껋? 洹?吏???꾪닾???숆툑???꾩쭅 ?????湲??뚮Ц?낅땲??';
    } else if (jiChong) {
      txt = '<b>吏吏異??경뵱亦????꾩떎??異⑸룎:</b> ?앺솢 諛⑹떇怨??꾩떎??湲곕컲???쒖뻘嫄곕━硫?留덉같?뚯쓣 ?낅땲?? ?꾩깮??媛숈? 援ъ뿭???곹넗???щЪ???먭퀬 ?숇㉫吏瑜??湲곕ŉ 諛κ렇由??몄????덈뜕 吏?낇븳 寃쎌웳?먯쓽 ?낅낫媛 ?쒕젮 ?덉뒿?덈떎. ?대쾲 ?앹뿉?쒕룄 臾쇰━?곸씤 嫄곕━瑜??덈Т 醫곹엳硫?洹?吏꾪쓾??移대Ⅴ留덇? 諛쒕룞?섎땲, 媛곸옄??諛⑷낵 ?앺솢 ?곸뿭??泥좎???遺꾨━?섎뒗 吏?쒓? ?덈??곸엯?덈떎.';
    } else if (ganSame && jiSame) {
      txt = '<b>?덈? 蹂듭쓬(鴉뤷맅)??嫄곗슱??</b> ?뱀떊???쇱＜? ?곷????꾩＜媛 ?뚮쫫 ?뗪쾶 ?묎컳? 湲?먯엯?덈떎! ?대뒗 ??紐⑥뒿???곷???怨쇨굅(議곗긽/肉뚮━)??洹몃?濡?蹂듭궗?섏뼱 ?덈떎???살쑝濡? ?꾩깮??嫄곗슱??蹂대벏 ?꾨꼍?섍쾶 ?묎컳? ?띠쓽 議곌굔怨??곸쿂瑜?怨듭쑀?덈뜕 ?꾪뵆媛깆뼱???곹샎?????덉뒿?덈떎. ?쒕줈瑜??덈Т ???뚯븘??湲곌? 留됲엳寃??몄븞?섍굅?? 諛섎?濡???瑗?蹂닿린 ?レ? 移섎?源뚯? ?곷굹?쇳븯寃?蹂댁뿬??蹂묒쟻?쇰줈 遺덊렪?????덈뒗 洹밸떒?곸씤 ?묐궇??寃?낅땲??';
    } else if (ganSame || jiSame) {
      txt = '<b>遺遺?蹂듭쓬???듭닕??</b> ?쒕줈???ъ＜ 肉뚮━ ?대뵖媛???묎컳? 湲?먭? 諛뺥??덉뒿?덈떎. ?꾩＜ 癒??꾩깮, 鍮꾩듂???섍꼍??沅ㅻ룄 ?덉뿉???ㅼ튂??援먯감?덈뜕 ?뚰렪?곸씤 ?몄뿰?낅땲?? 留덉튂 湲몄쓣 嫄룸떎 ?곗뿰??留≪? ???μ닔 ?꾩깉泥섎읆 ?붿옍???듭닕?④낵 湲곗떆媛먯쓣 ?섏졇以띾땲??';
    } else {
      txt = '<b>諛깆??섑몴???몄뿰:</b> ?대떦 諛⑺뼢?쇰줈???꾩깮???밸퀎???숈뾽?대굹 鍮? 媛뺣젹???곌껐怨좊━媛 ?덉씠?붿뿉 媛먯??섏? ?딆뒿?덈떎. 臾닿굅???멸낵?⑥쓽 嫄곕?以꾩뿉???꾩쟾???대갑??梨? ?ㅻ’??吏湲??뱀떊?ㅼ쓽 ?좏깮怨??섏?濡??꾩쟾???덈∼寃?媛쒖쿃???섍???源⑤걮?섍퀬 臾댄빐???꾩깮 以묒떖??愿怨꾩엯?덈떎.';
    }
    return chips + '<div class="pastlife-cross-result" style="line-height:1.75; font-size:0.87rem; color:#f8fafc; padding-top:4px;">' + txt + '</div>';
  }

  var abHtml=buildCrossResult(a_dg,a_dj,b_yg,b_yj,ab_ganHe,ab_ganChong,ab_ganSame,ab_jiHe,ab_jiChong,ab_jiSame);
  var baHtml=buildCrossResult(b_dg,b_dj,a_yg,a_yj,ba_ganHe,ba_ganChong,ba_ganSame,ba_jiHe,ba_jiChong,ba_jiSame);

  return '<div class="pastlife-card">'+
    '<div class="pastlife-header">'+
    '<div><div class="pastlife-title-text">?뵰 ?꾩깮 ?몄뿰 ???/div>'+
    '<div class="pastlife-subtitle">PAST LIFE COMPATIBILITY 쨌 ?쇱＜횞?꾩＜ 援먯감 遺꾩꽍</div></div></div>'+
    '<div class="pastlife-karma-badge">'+grade+' 쨌 '+gradeLabel+'</div>'+
    '<div style="font-size:.78rem;color:rgba(224,176,255,.7);line-height:1.65;margin-bottom:14px">'+gradeDesc+'</div>'+
    '<div class="pastlife-cross-row">'+
    '<div class="pastlife-cross-title">?㎚ '+(USER_NAME||'??)+'???쇱＜('+a_dg+a_dj+') 횞 '+name+'???꾩＜('+b_yg+b_yj+')</div>'+
    abHtml+
    '</div>'+
    '<div class="pastlife-cross-row">'+
    '<div class="pastlife-cross-title">?㎚ '+name+'???쇱＜('+b_dg+b_dj+') 횞 '+(USER_NAME||'??)+'???꾩＜('+a_yg+a_yj+')</div>'+
    baHtml+
    '</div>'+
    '<div class="pastlife-story-box">'+
    '<div class="pastlife-story-icon">'+gradeIcon+'</div>'+
    '<div class="pastlife-story-text">'+story+'</div>'+
    '</div>'+
    '<div class="pastlife-prescription">'+
    '<div class="pastlife-prescription-title">?뷂툘 泥쒓린??泥섎갑</div>'+
    '<div class="pastlife-prescription-body">'+prescription+'</div>'+
    '</div>'+
    '<div class="pastlife-disclaimer">???꾩깮 ?몄뿰 ??대뒗 紐낅━?숈쟻 ?щ? 肄섑뀗痢좎엯?덈떎 ?뙔</div>'+
    '</div>';
}

/* ??? generateDetailedAdvice: ?ъ＜ 留욎땄 ?곸꽭 ?꾩떎 議곗뼵 ??? */
function generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';

  var ganAdvice={
    '??:'?섎뒛???ν빐 ?먮씪?????섎Т泥섎읆, <b>諛⑺뼢留??껋? ?딆쑝硫?諛섎뱶??鍮쏆쓣 遊낅땲??</b> 袁몄??⑥씠 ?뱀떊??媛??媛뺣젰??臾닿린?덉슂. 怨좎쭛???덈떎??留먯? 寃곌뎅 "?섏?媛 ?덈떎"???살씠湲곕룄 ?⑸땲?? 洹?怨좎쭛???щ컮瑜?諛⑺뼢?먮쭔 ?곗꽭?? ?⑤룆 ?됰룞???숈뾽蹂대떎 ?좊━???ъ＜?낅땲??',
    '阿?:'移〓꽍荑⑥쿂???대뼡 ?섍꼍?먯꽌???댁븘?⑤뒗 ?좎뿰?⑥씠 ?뱀떊 ?덉뿉 ?덉뼱?? <b>?듭?濡?吏곸꽑?쇰줈留??섍????섏? 留덉꽭??/b> ???뚯븘媛??湲몄씠 ?뚮줈????鍮좊Ⅸ 湲몄엯?덈떎. 二쇰?怨?議고솕瑜??대０ ???뱀떊??吏꾩쭨 ?λ젰??苑껋쓣 ?쇱썎?덈떎.',
    '訝?:'?쒖뼇泥섎읆 鍮쏅굹???뱀떊? <b>?꾧뎔媛?먭쾶 ?깅텋???섏뼱以???媛??鍮쏅궔?덈떎.</b> ?섏?留??쒖뼇??諛ㅼ씠 ?덉뼱???щ벏, ?먯떊???뚮낫???쒓컙???꾨겮吏 留덉꽭?? 紐⑤뱺 寃껋쓣 ?쇱옄 吏딆뼱吏?ㅻ뒗 踰꾨쫯???대젮?볥뒗 ?곗뒿???꾩슂?⑸땲??',
    '訝?:'???섍쾶 ??ㅻⅤ??珥쏅텋泥섎읆, ?뱀떊??吏꾩떖? 二쇰? ?щ엺?ㅼ쓣 議곗슜???곕쑜?섍쾶 ?⑸땲?? <b>?덉뿉 蹂댁씠???깃낵蹂대떎 蹂댁씠吏 ?딅뒗 ?좊ː瑜??볥뒗 寃?/b>???뱀떊??吏꾩쭨 ?먯궛?낅땲?? ?쒕몢瑜댁? 留덉꽭??',
    '??:'?쒕꼻? ???鸚㎩굇)泥섎읆 紐⑤뱺 寃껋쓣 諛쏆븘?ㅼ씠???뱀떊? <b>??遺?쒖?吏 ?딅뒗 ?щ엺</b>?낅땲?? ?섏?留?洹?臾듭쭅?⑥씠 蹂?붿뿉 ??쾶 諛섏쓳?섎뒗 嫄몃┝?뚯씠 ?⑸땲?? ?섎룄?곸쑝濡??덈줈??寃껋쓣 ?쒕룄?섎뒗 ?⑷린瑜?湲곕Ⅴ?몄슂.',
    '藥?:'鍮꾩삦??諛?씠 ?⑥븮???ㅼ슦?? ?뱀떊? <b>二쇰? ?щ엺???좎옱?μ쓣 ?뚯뼱?대뒗 ?λ젰</b>???덉뒿?덈떎. ?⑥쓣 ?덈Т 梨숆린???뺤옉 ?먯떊???껋뼱踰꾨━??寃껋쓣 議곗떖?섏꽭?? ?뱀떊 ?먯떊??癒쇱? ?됰났?댁빞 ?⑤룄 ?꾩슱 ???덉뒿?덈떎.',
    '佯?:'嫄곗튇 ?먯꽍??媛덇퀬 ??뿬 蹂댁꽍???섎벏, <b>?쒕젴???뱀떊?????⑤떒?섍쾶 留뚮벊?덈떎.</b> ?ㅻ쭔 ?덈Т ?좎씠 ?쒕㈃ 二쇰????곸쿂瑜?諛쏆뒿?덈떎. ?좎뭅濡쒖???吏?쒕∼寃???以??꾨뒗 ?щ엺???섏꽭??',
    '渦?:'?뺤젣??蹂댁꽍泥섎읆 ?뱀떊? <b>?몃??④낵 ?꾨꼍?⑥쓣 異붽뎄?섎뒗 ?덉닠媛 湲곗쭏</b>???덉뒿?덈떎. 洹??꾨꼍二쇱쓽媛 ?뚮줈???ㅼ뒪濡쒕? ?μ즲湲곕룄 ?⑸땲?? 70% ?꾩꽦?꾩뿉?쒕룄 ?몄긽???대낫?대뒗 ?⑷린媛 ?꾩슂?댁슂.',
    '鶯?:'嫄곕???媛뺣Ъ泥섎읆 ?뱀떊? <b>留됲엳硫??뚯븘媛???좎뿰?④낵 ?덉쭏源</b>???숈떆??媛議뚯뒿?덈떎. ??臾쇱쓽 ?섏쓣 ??諛⑺뼢?쇰줈 紐⑥쓣?섎줉 臾댁꽠寃?媛뺥빐吏묐땲?? ?먮꼫吏瑜??덈Т 遺꾩궛?쒗궎吏 留덉꽭??',
    '??:'?댁뒳泥섎읆 留묎퀬 ?ъ꽭???뱀떊? <b>?덉뿉 蹂댁씠吏 ?딆븘???몄긽??珥됱큺?⑥쓣 ?뷀븯??議댁옱</b>?낅땲?? ?먯떊???묒쓬???먮젮?뚰븯吏 留덉꽭?? 媛???묒? 臾쇰갑?몄씠 諛붿쐞???レ뒿?덈떎. 袁몄??⑥씠 ?뱀떊??珥덈뒫?μ엯?덈떎.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #4CAF50">';
  out+='<b style="font-size:.9rem">?뙼 ?쇨컙 '+dg+' ??蹂몄쭏</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(ganAdvice[dg]||deep.advice)+'</span>';
  out+='</div>';

  if(jg&&jg.isJong){
    var jongElAdvice={
      wood:'珥덈줉鍮??앸챸?μ씠 ?ъ＜ ?꾩껜瑜?吏諛고븯??醫낃꺽?낅땲?? 援먯쑁, ?앸챸, ?깆옣, ?먯뿰, 臾명솕 ??<b>紐?????湲곗슫???먮Ⅴ??紐⑤뱺 怨녹뿉???뱀떊? 鍮쏅궔?덈떎.</b> ?섎Т媛 ?먮씪??怨? ?щ엺???깆옣?섎뒗 怨녹뿉 ?덉쑝?몄슂. ?뱀떊??湲곗슫???쏀븯寃?留뚮뱶???섍꼍? 怨쇨컧??硫由ы븯?몄슂. ?곗깋쨌湲덉냽쨌媛뺥븳 洹쒖쑉? ???ъ＜?먯꽌 ?낆씠 ?⑸땲??',
      fire:'遺덇퐙?????ъ＜瑜?媛??梨꾩슫 醫낃꺽?낅땲?? 臾대?, 誘몃뵒?? 由щ뜑?? ?④굅???댁젙???붽뎄?섎뒗 遺꾩빞媛 ?뱀떊??臾대??낅땲?? <b>??????湲곗슫?????ш쾶 ?ㅼ슱?섎줉 ?몄깮??鍮쏅궔?덈떎.</b> ?뱀떊??二쇰늼 ?ㅺ쾶 ?섍굅???댁젙??爰쇰쾭由щ뒗 ?섍꼍? ?낆엯?덈떎. ??媛?댁씠 ?곕뒗 ?쇱쓣 ?섍퀬, ?쒗쁽?섍퀬, 鍮쏅굹?몄슂.',
      earth:'?吏泥섎읆 臾듭쭅????????湲곗슫??媛?앺븳 醫낃꺽?낅땲?? 遺?숈궛, ?덉젙, ?뚯떇, ?뚮큵, 以묒옱 ??<b>??????吏덇컧???덈뒗 紐⑤뱺 怨녹뿉???뱀떊? ?좊뱺??湲곕뫁???⑸땲??</b> 鍮좊Ⅸ 蹂?붾낫??源딄퀬 李⑹떎??諛⑹떇??留욎뒿?덈떎.',
      metal:'?좎뭅濡쒖슫 湲?????湲곗슫??媛??李?醫낃꺽?낅땲?? 踰뺣쪧, ?섎즺, ?뺣? 湲곗닠, 湲덉쑖, 紐낆삁 ??<b>湲??????먯튃怨??좎뭅濡쒖????꾩슂??怨녹뿉???뱀떊? ???異붿쥌??遺덊뿀?⑸땲??</b> ?먯튃???몄슦怨?吏?ㅻ뒗 ?꾨Ц媛??湲몄쓣 嫄몄뼱媛?몄슂.',
      water:'臾쇱씠 ?섎윭?섏튂????麗???醫낃꺽?낅땲?? 吏?? ?먭뎄, ?좏넻, ?덉닠, 泥좏븰 ??<b>??麗????먮쫫???용뒗 怨녹뿉???뱀떊???λ젰? ?몄긽??諛붽퓠?덈떎.</b> 留됲엳嫄곕굹 ?듬늻瑜대뒗 ?섍꼍???쇳븯怨? ?몄젣???섎윭媛????덈뒗 ?좎뿰???띠쓣 留뚮뱶?몄슂.'
    };
    out+='<div style="background:rgba(243,229,245,.7);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #9C27B0">';
    out+='<b style="font-size:.9rem;color:#6A1B9A">?? '+jg.name+' ?밸퀎 議곗뼵</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#4A148C">'+(jongElAdvice[jg.dominant]||'醫낃꺽??吏諛??ㅽ뻾??洹뱁븳源뚯? ?ㅼ슦??寃껋씠 ?깃났???댁뇿?낅땲??')+'</span>';
    out+='</div>';
  }else if(pw&&pw.isStrong){
    out+='<div style="background:rgba(255,243,224,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.9rem;color:#E65100">?뵦 ?좉컯(翁ュ성) ?ъ＜ ???먮꼫吏 ?섑샇 議곗뼵</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#BF360C">?뱀떊 ?덉뿉???섏튂???먮꼫吏媛 ?덉뒿?덈떎. ???먮꼫吏?????곕㈃ 由щ뜑??낵 異붿쭊?μ씠 ?섏?留? ?듬늻瑜대㈃ 怨좎쭛쨌?낆꽑쨌怨쇱엵 寃쎌웳?쇰줈 蹂吏덈맗?덈떎. <b>?듭떖? ?먮꼫吏瑜?諛쒖궛?섎뒗 援ъ“瑜?留뚮뱶??寃껋엯?덈떎.</b> ?щ엺?ㅼ뿉寃?踰좏?怨? ?ы쉶????븷??留↔퀬, 洹쒖튃怨??먯튃???듯빐 ?먯떊???ㅼ뒪由ъ꽭?? ?뚮줈???뱀떊蹂대떎 媛뺥븳 ?щ엺?먭쾶 ?꾩쟾諛쏅뒗 ?섍꼍?????ш쾶 ?깆옣?쒗궢?덈떎.</span>';
    out+='</div>';
  }else{
    out+='<div style="background:rgba(227,242,253,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #2196F3">';
    out+='<b style="font-size:.9rem;color:#1565C0">?뮛 ?좎빟(翁ュ선) ?ъ＜ ???먭린 蹂댄샇 議곗뼵</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#0D47A1">?뱀떊? ?몃????곹뼢???쎄쾶 諛쏅뒗 ?ъ꽭??援ъ“???ъ＜?낅땲?? ?닿쾬? ?쎌젏???꾨떃?덈떎. 怨듦컧 ?λ젰???곸썡?섍퀬 遺꾩쐞湲곕? ?쎈뒗 ?덉튂媛 ?곗뼱?⑸땲?? <b>?섏?留?洹??뚮Ц??吏移섍린???쎌뒿?덈떎.</b> ?뱀떊??吏꾩떖?쇰줈 ?꾨겮??洹????紐낆쓣 怨곸뿉 ?먮뒗 寃껋씠 臾댁뾿蹂대떎 以묒슂?⑸땲?? ?쇱옄 紐⑤뱺 寃껋쓣 ?닿껐?섎젮 ?섏? 留먭퀬, ?곸젅???꾩????붿껌?섎뒗 寃껋씠 吏꾩쭨 ?⑷린?낅땲?? ?먯〈媛먯씠 ??븘吏??愿怨꾨굹 ?섍꼍?먯꽌??怨쇨컧??臾쇰윭?쒕뒗 寃곕떒???꾩슂?⑸땲??</span>';
    out+='</div>';
  }

  var tsAdviceFull={
    '鍮꾧껄':'?낅┰?ъ씠 媛뺥븳 ?뱀떊, 紐⑤뱺 ?쇱쓣 ?쇱옄 ?섎젮??寃쏀뼢???덉뼱?? <b>吏꾩쭨 媛뺥븳 ?щ엺? ?꾩????붿껌??以꾨룄 ?뺣땲??</b> ?숈뾽?대굹 ?뚰듃?덉떗?먯꽌????븷??紐낇솗???섍퀬 怨꾩빟?쒕? 媛뽰텛??寃껋씠 ?꾩닔?낅땲?? ??諛⑹떇????理쒖꽑???꾨땺 ???덉쓬???몄젙?섎뒗 ?쒓컙, ?뱀떊???멸퀎媛 ?⑥뵮 ?볦뼱吏묐땲??',
    '寃곸옱':'?밸??뺢낵 異붿쭊?μ씠 ?섏튂???뱀떊, 洹??먮꼫吏瑜??щЪ?먮쭔 ?잛쑝硫??ㅼ뼱??留뚰겮 鍮좎졇?섍컩?덈떎. <b>?덉? 踰뚭린蹂대떎 吏?ㅻ뒗 寃껋씠 ???대졄?듬땲??</b> 怨좎젙 吏異?援ъ“瑜?留뚮뱾怨? 異⑸룞???ъ옄??蹂댁쬆? 泥좎????쇳븯?몄슂. 媛뺤젣 ?異뺢낵 ?κ린 ?먯궛 怨꾪쉷???щЪ ?댁쓣 吏?ㅻ뒗 媛???뺤떎??諛⑸쾿?낅땲??',
    '?앹떊':'?숈쿇?곸씠怨?踰좏?湲?醫뗭븘?섎뒗 ?뱀떊, 洹??곕쑜?⑥씠 媛?????먯궛?댁뿉?? <b>?섏?留??댁슜?뱁븯吏 ?딅룄濡??щ엺??蹂?以??꾨뒗 ?덉쓣 ?ㅼ슦?몄슂.</b> 洹쒖튃?곸씤 ?앺솢怨??대룞??嫄닿컯 ?댁쓣 吏?듬땲?? ?섍퀬 ?띠? ?쇱쓣 ?낆쑝濡??쇱쑝硫??⑤뱾蹂대떎 紐?諛곗쓽 ?깃낵瑜??낅땲??',
    '?곴?':'泥쒖옱???몄뼱 媛먭컖???덉?留? 留먯씠 移쇱씠 ?????덉뒿?덈떎. <b>鍮꾪뙋?섍린 ?꾩뿉 ??踰덈쭔 ???곷?諛⑹쓽 ?낆옣?먯꽌 ?앷컖?섎뒗 ?듦????ㅼ씠?몄슂.</b> ?뱀떊???곸떊???꾩씠?붿뼱瑜??ㅻ뱷?섎뒗 ?ъ옣吏媛 遺?쒕윭?뚯빞 ?몄긽??癒뱁옓?덈떎. ?먭린 洹쒖튃???ㅼ뒪濡?留뚮뱾怨?吏?ㅻ뒗 ?먭린 寃쎌쁺???깃났???댁뇿?낅땲??',
    '?몄옱':'??洹몃┝??洹몃━???λ젰???곸썡???뱀떊, ?묒? 寃껋쓣 臾댁떆?섎뒗 寃쏀뼢??議곗떖?섏꽭?? <b>?뷀뀒?쇳븳 遺遺꾩씠 ?볦뿬 ???쇱씠 ?⑸땲??</b> ?좏씎怨?怨쇱냼鍮꾨? 寃쎄퀎?섍퀬, ?좊ː?????덈뒗 ?щТ ?섑샇?먮? ?먮뒗 寃껋씠 醫뗭뒿?덈떎. ?댁쇅???ㅼ뼇??臾명솕? ?곌껐????媛????湲고쉶媛 ?듬땲??',
    '?뺤옱':'?깆떎?④낵 瑗쇨세?⑥씠 ?몄깮 理쒓퀬??臾닿린?낅땲?? <b>?? ?덈Т ?덉젙留뚯쓣 異붽뎄?섎떎 湲고쉶瑜??볦튂吏 留덉꽭??</b> ?묒? ?꾩쟾?ㅼ쓣 諛섎났?섎㈃???ㅽ뙣???듭닕?댁????곗뒿???꾩슂?⑸땲?? 嫄닿컯??愿怨??⑦꽩??留뚮뱶??寃껋씠 ?몄깮 ?됰났???듭떖?낅땲??',
    '?멸?':'媛뺤씤???섏?? ?섑삊?? 洹몃━怨?由щ뜑??쓽 二쇱씤?낅땲?? <b>?ㅽ듃?덉뒪瑜??띿쑝濡??볦븘?먮㈃ 紐몄씠 癒쇱? ?좏샇瑜?蹂대깄?덈떎.</b> 諛섎뱶??寃⑸젹???좎껜 ?쒕룞?쇰줈 ?먮꼫吏瑜?諛쒖궛?섏꽭?? 沅뚯쐞?곸씤 ?쒕룄 ????붿꽑?섎쾾?섎뒗 由щ뜑??쑝濡??щ엺???대걚?몄슂.',
    '?뺢?':'?먯튃怨?紐낆삁瑜?以묒떆?섎뒗 ?뱀떊, 洹??뺤쭅?⑥씠 媛?????좎슜 ?먯궛?낅땲?? <b>?섏?留?紐⑤뱺 ?곹솴???먯튃?濡??뚯븘媛吏???딆뒿?덈떎.</b> ?좎뿰?깆쓣 諛곗슦怨? ?뚮줈??洹쒖튃蹂대떎 ?щ엺??癒쇱??꾩쓣 湲곗뼲?섏꽭?? ?⑥쓽 ?쒖꽑蹂대떎 ?먯떊???대㈃ 湲곗???異⑹떎???띠쓣 ????吏꾩젙??留뚯”???살뒿?덈떎.',
    '?몄씤':'吏곴??κ낵 ?곴컧???곸썡???뱀떊, ?앷컖???덈Т 留롮븘 ?됰룞????뼱吏??寃껋씠 媛????臾몄젣?낅땲?? <b>"?쇰떒 ?대낫?????⑷린媛 ?뱀떊?????④퀎 ?깆옣?쒗궢?덈떎.</b> ?꾩씠?붿뼱瑜??쇱옄留?媛꾩쭅?섏? 留먭퀬, ?좊ː?섎뒗 ???щ엺?먭쾶?쇰룄 爰쇰궡 蹂댁꽭?? 怨좊룆??利먭린???곸젅???ы쉶???곌껐???뺤떊 嫄닿컯??吏?듬땲??',
    '?뺤씤':'?щ옉諛쏄퀬 諛곗슦??寃껋쓣 醫뗭븘?섎뒗 ?뱀떊, ?섏〈???깊뼢??媛?????⑥젙?낅땲?? <b>?꾧뎔媛媛 ?놁뼱???ㅼ뒪濡?寃곗젙?섍퀬 ?ㅽ뻾?섎뒗 ?먮┰???덈젴???됱깮 怨쇱젣?낅땲??</b> ?몄젙怨?移?갔???쏀븯??洹멸쾬???댁슜?섎뒗 ?щ엺??議곗떖?섏꽭?? 嫄닿컯??寃쎄퀎瑜??몄슦??寃껋씠 ?깆옣??泥リ구?뚯엯?덈떎.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid var(--pink)">';
  out+='<b style="font-size:.9rem;color:var(--pink)">狩??듭떖 ??꽦 '+dominant+' ??留욎땄 議곗뼵</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(tsAdviceFull[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elOverload={
      wood:'<b>紐??? 湲곗슫??媛뺥빀?덈떎.</b> 怨좎쭛怨??낆꽑???숈떆???섑??????덉뼱?? 湲??? 湲곗슫?쇰줈 ?ㅻ벉怨????? 湲곗슫?쇰줈 諛쒖궛?섏꽭?? ?쒖そ 諛⑺뼢, ?곗깋쨌?뚯깋 怨꾩뿴, 留ㅼ슫留??뚯떇???꾩????⑸땲??',
      fire:'<b>???? 湲곗슫??吏?섏묩?덈떎.</b> 媛먯젙 湲곕났怨??ъ옣쨌?덉븬 嫄닿컯??二쇱쓽?댁빞 ?⑸땲?? ??麗? 湲곗슫???덉떎?⑸땲?? 寃??됀룻뙆???怨꾩뿴, 臾쇨? ?앺솢, 異⑸텇???섎㈃???꾩닔?낅땲??',
      earth:'<b>???? 湲곗슫??媛뺥빀?덈떎.</b> 怨좎쭛???멸퀬 蹂?붾? 嫄곕??섎ŉ ?뚰솕湲?吏덊솚??二쇱쓽媛 ?꾩슂?⑸땲?? 紐??? 湲곗슫?쇰줈 ?붾뱾?댁＜?몄슂. 珥덈줉???앸Ъ, ?숈そ 諛⑺뼢, ?좊쭧 ?뚯떇???꾩??낅땲??',
      metal:'<b>湲??? 湲곗슫??媛뺥빀?덈떎.</b> ?됱젙?⑥씠 ?멸컙愿怨꾨? ?대졄寃?留뚮뱾 ???덉뒿?덈떎. ???? 湲곗슫???꾩슂?⑸땲?? ?곕쑜???됱긽, ?щ엺?ㅺ낵???쒕룞, 踰좏?怨??쒗쁽?섎뒗 ?곗뒿??洹좏삎???≪븘以띾땲??',
      water:'<b>??麗? 湲곗슫??吏?섏묩?덈떎.</b> ?곗쑀遺?⑦븿怨?吏?섏튇 ?댁꽦, ?좎옣쨌諛⑷킅 嫄닿컯??二쇱쓽?섏꽭?? ???? 湲곗슫?쇰줈 諛⑺뼢???≪븘二쇱꽭?? ?몃??됀룰컝??怨꾩뿴, ?덉젙?곸씤 猷⑦떞 ?몄슦湲곌? 以묒슂?⑸땲??'
    };
    out+='<div style="background:rgba(255,245,220,.8);border-radius:10px;padding:12px;margin-bottom:10px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.88rem;color:#E65100">?좑툘 ?ㅽ뻾 ?몄쨷 二쇱쓽?ы빆</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.82">'+(elOverload[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#81C784;font-size:.8rem">???곗씠媛 ?뱀떊???ъ＜瑜??쎌쑝硫?吏꾩떖???댁븘 ?맰?뮍</div>';
  return out;
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ??대퀎 ?? ?⑺솕 遺꾩꽍 ?ы띁 ?⑥닔
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */
var _DW_GANHE={'??:{'藥?:'earth'},'藥?:{'??:'earth'},'阿?:{'佯?:'metal'},'佯?:{'阿?:'metal'},'訝?:{'渦?:'water'},'渦?:{'訝?:'water'},'訝?:{'鶯?:'wood'},'鶯?:{'訝?:'wood'},'??:{'??:'fire'},'??:{'??:'fire'}};
var _DW_JIHE={'耶?:{'訝?:'earth'},'訝?:{'耶?:'earth'},'野?:{'雅?:'wood'},'雅?:{'野?:'wood'},'??:{'??:'fire'},'??:{'??:'fire'},'渦?:{'??:'metal'},'??:{'渦?:'metal'},'藥?:{'??:'water'},'??:{'藥?:'water'},'??:{'??:'fire'},'??:{'??:'fire'}};

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
  var seen=new Set(); // 以묐났 ?쒓굅??  var ganEl=(GAN[g]&&GAN[g].e)||'earth';
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
    results.push({type:'媛꾪빀(鸚⒴묾)',src:g,partner:og,hapEl:hapEl,orgEl:ganEl,orgType:orgT,newType:newT,changed:orgT!==newT});
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
    results.push({type:'吏???경뵱)',src:j,partner:oz,hapEl:hapEl,orgEl:zhiEl,orgType:orgT,newType:newT,changed:orgT!==newT});
  });

  var GAN_CHUNG = {'??:'佯?, '阿?:'渦?, '訝?:'鶯?, '訝?:'??, '佯?:'??, '渦?:'阿?, '鶯?:'訝?, '??:'訝?};
  var ZHI_CHUNG = {'耶?:'??, '訝?:'??, '野?:'??, '??:'??, '渦?:'??, '藥?:'雅?, '??:'耶?, '??:'訝?, '??:'野?, '??:'??, '??:'渦?, '雅?:'藥?};

  origGans.forEach(function(og){
    if(!og||!g)return;
    if(GAN_CHUNG[g] === og || GAN_CHUNG[og] === g){
      var key='gc_'+g+'_'+og;
      if(seen.has(key))return;
      seen.add(key);
      // ?먭뎅 泥쒓컙??> 異??먯튃: ?⑺솕??泥쒓컙? ????몄슫 泥쒓컙異?臾댄슚
      var natalGanHe = (G_JONG && G_JONG.ganHeMerged) ? G_JONG.ganHeMerged : {};
      if(natalGanHe[og]) return; // ?먭뎅?먯꽌 ?대? ?⑺솕??泥쒓컙 ??異?臾댄슚
      var ogEl=(GAN[og]&&GAN[og].e)||'earth';
      var ogType=_dwElType(ogEl);
      var srcEl=(GAN[g]&&GAN[g].e)||'earth';
      
      var pw=G_POWER, jg=G_JONG;
      var isMetalDM = p0 && (p0.d.g === '佯? || p0.d.g === '渦?);
      var isFireFavorable = false;
      if(pw) {
        isFireFavorable = isFireFavorable || pw.yongshin.indexOf('fire')>=0;
      }
      if(jg && jg.isJong) isFireFavorable = isFireFavorable || jg.dominant==='fire' || jg.parEl==='fire';
      var isSpecial = isMetalDM && isFireFavorable && ((srcEl==='fire'&&ogEl==='water')||(srcEl==='water'&&ogEl==='fire'));

      results.push({type:'媛꾩땐(鸚⒴묾)',src:g,partner:og,orgEl:ogEl,orgType:ogType,isChung:true, isSpecialChung:isSpecial});
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
      var isMetalDM = p0 && (p0.d.g === '佯? || p0.d.g === '渦?);
      var isFireFavorable = false;
      if(pw) {
        isFireFavorable = isFireFavorable || pw.yongshin.indexOf('fire')>=0;
      }
      if(jg && jg.isJong) isFireFavorable = isFireFavorable || jg.dominant==='fire' || jg.parEl==='fire';
      var isSpecial = isMetalDM && isFireFavorable && ((srcEl==='fire'&&ozEl==='water')||(srcEl==='water'&&ozEl==='fire'));

      results.push({type:'吏異??경뵱)',src:j,partner:oz,orgEl:ozEl,orgType:ozType,isChung:true, isSpecialChung:isSpecial});
    }
  });

  return results;
}

function getDwQmBadge(g,j){
  var p0=G_PILLARS;
  var isWeirdSinDing = (p0 && p0.d.g==='渦? && g==='訝?);
  var results=_getDwHapResults(g,j);
  var hasSpecial=results.some(function(r){return r.isSpecialChung;});
  var hasBonus=results.some(function(r){return (r.orgType==='bad'&&r.newType==='good') || (r.isChung && r.orgType==='bad');});
  var hasSnare=results.some(function(r){return (r.orgType==='good'&&r.newType==='bad') || (r.isChung && r.orgType==='good' && !r.isSpecialChung);});
  
  if(isWeirdSinDing)return '<div class="dw-qm-badge snare" style="background:#4A148C;color:#FFCDD2;border-color:#B71C1C">?좑툘蹂댁꽍?⑺빐</div>';
  if(hasSpecial)return '<div class="dw-qm-badge bonus" style="background:#FCE4EC;color:#C2185B;border-color:#F8BBD0">?뵦?쒕젴諛쒕났</div>';
  if(hasBonus)return '<div class="dw-qm-badge bonus">?≫솚怨⑦깉??/div>';
  if(hasSnare)return '<div class="dw-qm-badge snare">?좏깘?⑸쭩洹</div>';
  if(results.some(function(r){return r.isChung;}))return '<div class="dw-qm-badge hap" style="background:#FFF3E0;color:#E65100;border-color:#FFE0B2">?뷂툘異⑸룎諛쒖깮</div>';
  if(results.length > 0)return '<div class="dw-qm-badge hap">?봽?⑺솕</div>';
  return '';
}

function buildDwQmSection(g,j){
  var p0=G_PILLARS;
  var isWeirdSinDing = (p0 && p0.d.g==='渦? && g==='訝?);
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

      var badge=isSpecial?'?뵦 ?쒕젴諛쒕났':isBonus?'?뮙 ?됱떊?뚭린':isSnare?'?좑툘 ?⑹떊?뚯넀':'?뷂툘 異⑸룎諛쒖깮';
      var badgeBg=isSpecial?'#FCE4EC':isBonus?'#E8F5E9':isSnare?'#FFEBEE':'#FFF3E0';
      var badgeTx=isSpecial?'#C2185B':isBonus?'#1B5E20':isSnare?'#C62828':'#E65100';
      
      var desc=isSpecial
        ?'湲??? ?쇨컙??瑗??꾩슂??????瑜?洹?섍쾶 ?곕뒗 以묒뿉 ??麗?? 異⑸룎?⑸땲?? ?쇰컲?곸씤 ?뚭레???꾨땲?? 臾쇨낵 遺덉씠 援먯감?섎ŉ 媛뺤쿋??紐낃??쇰줈 嫄곕벊?섍쾶 ?섎뒗 嫄곕????닿툑吏덉쓽 ?쒓컙???섏뼱 ?덉긽???곗뼱?섎뒗 李щ????깆랬瑜??대９?덈떎.'
        :isBonus
        ?'?댁뿉????<b>'+r.src+'</b>??媛) ?먭뎅???됱떊(<b>'+r.partner+'쨌'+EL_K[r.orgEl]+'</b>)??異?亦??섏뿬 源⑤쑉由쎈땲?? ?됲븳 湲곗슫???щ씪???ㅽ엳????諛쒕났??湲고쉶媛 ?⑸땲??'
        :isSnare
        ?'?댁뿉????<b>'+r.src+'</b>??媛) ?먭뎅???⑹떊(<b>'+r.partner+'쨌'+EL_K[r.orgEl]+'</b>)??異?亦??섏뿬 源⑤쑉由쎈땲?? 誘우뿀??湲곗슫???붾뱾由????덉쑝??媛곷퀎??二쇱쓽媛 ?꾩슂?⑸땲??'
        :'?댁뿉????<b>'+r.src+'</b>??媛) ?먭뎅??<b>'+r.partner+'</b>??瑜? 異?亦??⑸땲?? 蹂?붿? ?대룞?섍? ?덉긽?⑸땲??';
      
      return '<div style="padding:10px 12px;background:#fff;border:1px solid #F0EEF0;border-radius:10px;font-size:.8rem">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'+
          '<span style="background:'+badgeBg+';color:'+badgeTx+';padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:800">'+badge+'</span>'+
          '<span style="color:#666;font-size:.75rem">'+r.type+'</span>'+
        '</div>'+
        '<div style="margin-bottom:4px;font-size:.85rem">'+
          '<b>'+r.src+'</b> <span style="color:#e63946;font-size:.75rem;padding:0 2px">?≪땐(亦???/span> <b>'+r.partner+'</b> ('+EL_K[r.orgEl]+')'+
        '</div>'+
        '<div style="color:#555;line-height:1.4">'+desc+'</div>'+
      '</div>';
    }
    var isBonus=(r.orgType==='bad'&&r.newType==='good');
    var isSnare=(r.orgType==='good'&&r.newType==='bad');
    var badge=isBonus?'???섍낏?덊깭':isSnare?'?좑툘 ?먰빀留앷? (縕ゅ릦恙섋껜)':'?봽 ?⑺솕蹂??;
    var badgeBg=isBonus?'#E8F5E9':isSnare?'#FFEBEE':'#FAFAFA';
    var badgeTx=isBonus?'#1B5E20':isSnare?'#C62828':'#757575';
    var elClr={wood:'#2E7D32',fire:'#C62828',earth:'#E65100',metal:'#6D6E7A',water:'#1565C0'};
    var hapColor=elClr[r.hapEl]||'#555';
    var desc=isBonus
      ?'<b>?됱떊('+EL_K[r.orgEl]+')</b>??'+r.type+'?쇰줈 <b style="color:'+hapColor+'">?⑹떊('+EL_K[r.hapEl]+')</b>?쇰줈 蹂?섎맗?덈떎. ????댁뿉??臾댁꽌??蹂댁씠??湲?먭? 吏꾩쭨 湲고쉶?낅땲??'
      :isSnare
      ?'<b>?⑹떊('+EL_K[r.orgEl]+')</b>???먰빀留앷?濡?<b style="color:#C62828">湲곗떊('+EL_K[r.hapEl]+')</b>??臾띠엯?덈떎. 醫뗭븘 蹂댁씠??湲곗슫???⑥젙?????덉쑝??諛⑹뼱 泥쒓린瑜?痍⑦븯?몄슂.'
      :'<b>'+EL_K[r.orgEl]+'</b>??媛) '+r.type+'?쇰줈 <b style="color:'+hapColor+'">'+EL_K[r.hapEl]+'</b>?쇰줈 蹂?섎맗?덈떎.';
    return '<div style="padding:10px 12px;background:#fff;border:1px solid #F0EEF0;border-radius:10px;font-size:.8rem">'+
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'+
        '<span style="background:'+badgeBg+';color:'+badgeTx+';padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:800">'+badge+'</span>'+
        '<span style="font-size:.68rem;color:#AAA">'+r.type+'</span>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:5px;font-weight:700;font-size:.82rem;margin-bottom:6px">'+
        '<span style="background:#F5F5F5;padding:2px 9px;border-radius:6px;">'+r.src+' <span style="font-size:.7rem;font-weight:400;color:#888">('+EL_K[r.orgEl]+')</span></span>'+
        '<span style="color:#CCC;font-size:.75rem">+'+r.partner+' ??/span>'+
        '<span style="background:'+(isBonus?'#E8F5E9':isSnare?'#FFEBEE':'#F5F5F5')+';color:'+(isBonus?'#1B5E20':isSnare?'#B71C1C':'#555')+';padding:2px 9px;border-radius:6px;font-size:.82rem">'+EL_K[r.hapEl]+'</span>'+
      '</div>'+
      '<div style="color:#555;line-height:1.7;font-size:.79rem">'+desc+'</div>'+
    '</div>';
  }).join('');
  var factMsg='';
  if(hasBonus)factMsg='<div style="font-size:.78rem;color:#2E7D32;background:#E8F5E9;border-radius:8px;padding:9px 11px;margin-top:8px;line-height:1.65">'+
    '??????댁뿉???됱떊???⑺솕濡??⑹떊?쇰줈 ?꾪솚?⑸땲?? ?먮졄寃?蹂댁씠??湲곗슫???곴레 ?쒖슜?섏꽭??</div>';
  else if(hasSnare)factMsg='<div style="font-size:.78rem;color:#C62828;background:#FFEBEE;border-radius:8px;padding:9px 11px;margin-top:8px;line-height:1.65">'+
    '???먰빀留앷?(縕ゅ릦恙섋껜): ?⑹떊???⑹뿉 臾띠뿬 ?쏀빐吏묐땲?? 吏湲?媛吏?寃껋쓣 吏?ㅻ뒗 ?섎퉬 泥쒓린媛 ?곗꽑?낅땲??</div>';
  return '<div style="background:'+headerBg+';border:1.5px solid '+headerBd+';border-radius:14px;padding:14px 15px;margin-bottom:14px">'+
    '<div style="font-weight:800;font-size:.88rem;color:'+headerColor+';margin-bottom:10px;display:flex;align-items:center;gap:6px">'+
      '<span>??/span>?? ?⑺솕 遺꾩꽍 <span style="font-size:.7rem;font-weight:400;color:#AAA">(?듬?+議고썑+?⑺솕 ?듯빀 ?먮떒)</span>'+
    '</div>'+
    '<div style="display:flex;flex-direction:column;gap:7px">'+rows+'</div>'+
    (isWeirdSinDing?'<div style="font-size:.8rem;color:#FFCDD2;background:#4A148C;border-radius:8px;padding:9px 11px;margin-top:8px;line-height:1.65;font-weight:700;">???멸?(訝????꾪삊: ?좉툑(渦? ?꾩꽦??蹂댁꽍???④굅???뺥솕(訝? 遺덇만???뱀븘?대━??移섎챸???됱슫?낅땲?? ?섎?吏 ?딄퀬 議곗슜??吏?대뒗 寃껋씠 ?곸콉?낅땲??</div>':'')+
    factMsg+
  '</div>';
}

function renderDaewun(bazi){
  var card = document.getElementById('daewunCard');
  if(card) card.style.display = 'block';
  var jg=G_JONG,pw=G_POWER;
  var jongTag = jg&&jg.isJong ? (jg.isGaJong ? '媛醫낃꺽(?뉐풛??' : '吏꾩쥌寃??욃풛??') : '';
  var legendItems=['<span style="background:#E8F5E9;color:#2E7D32;padding:3px 9px;border-radius:99px;font-weight:700;font-size:.77rem">?뙚 議고썑/<span class="notranslate">?⑹떊??/span> = 湲?/span>',
    '<span style="background:#FFEBEE;color:#C62828;padding:3px 9px;border-radius:99px;font-weight:700;font-size:.77rem">?뙢截?<span class="notranslate">湲곗떊??/span> = ??꼍</span>',
    '<span style="background:#E3F2FD;color:#1565C0;padding:3px 9px;border-radius:99px;font-weight:700;font-size:.77rem">???⑺솕(?덂뙑) 諛섏쁺</span>'
    +(jg&&jg.isJong?'<span style="background:#EDE7F6;color:#6A1B9A;padding:3px 9px;border-radius:99px;font-weight:600;font-size:.72rem">?? '+jongTag+'</span>':'')];
  document.getElementById('dwLegend').innerHTML=legendItems.join('');

  try{
    var yun=bazi.getYun(GENDER==='M'?1:0);
    var list=yun.getDaYun();
    var h='';
    list.forEach(function(dw,idx){
      if(idx===0)return;
      var gz=dw.getGanZhi();if(!gz||gz.length<2)return;
      var g=gz[0],j=gz[1];
      var age=dw.getStartAge();
      if(!age||age<=0)return;
      var gd=GAN[g]||{e:'metal',n:'?'},jd=JI[j]||{e:'water',a:'?'};
      var ev=evalDaewun(g,j);
      var qBadge=getDwQmBadge(g,j);

      // ?? 醫낃꺽 諛곗? HTML (移대뱶 ?됱? ?먯닔 湲곕컲 ev.cls 洹몃?濡??ъ슜) ??????????
      var jongBadgeHtml='';
      if(jg&&jg.isJong&&ev.jongStrength){
        if(ev.jongStrength==='strengthen'){
          var bCls=jg.isGaJong?'ga-str':'str';
          var bLabel=jg.isGaJong?'媛醫낃꺽??:'醫낃꺽媛뺥솕';
          jongBadgeHtml='<div class="dw-jong-badge '+bCls+'">'+(ev.score>=80?'?뙚':'??')+bLabel+'</div>';
        }else if(ev.jongStrength==='weaken'){
          jongBadgeHtml='<div class="dw-jong-badge wkn">?좑툘醫낃꺽?쏀솕</div>';
        }else{
          jongBadgeHtml='<div class="dw-jong-badge ntl">??以묐┰</div>';
        }
      }

      // ?? ?먯닔 湲곕컲 ?붿빟 ?쇰꺼 (諛곗? ?놁쓣 ??怨듯넻 ?쒖떆) ?????????????????????
      var evalLabelHtml='';
      if(!jongBadgeHtml){
        var shortLabel=ev.score>=80?'?뙚理쒓퀬':ev.score>=60?'?截뤾만':ev.score>=40?'??臾대궃':ev.score>=20?'?좑툘二쇱쓽':'?뙢截륁뿭寃?;
        if(ev.hasChungBonus) shortLabel='?뮙'+shortLabel;
        if(ev.hasChungPenalty) shortLabel='??+shortLabel;
        evalLabelHtml='<div class="dw-eval-label">'+shortLabel+'</div>';
      }

      h+='<div class="dw-item '+ev.cls+'" onclick="showDwDetail('+age+',\''+g+'\',\''+j+'\',\''+ev.label+'\','+ev.score+')">'+
        '<span class="dw-tag '+ev.tagCls+'">'+ev.emoji+'</span>'+
        '<span class="dw-age">'+age+'??</span>'+
        '<div class="dw-gz">'+g+'<br>'+j+'</div>'+
        '<div class="dw-sub">'+gd.n+'<br>'+jd.a+'</div>'+
        (jongBadgeHtml||evalLabelHtml)+
        qBadge+
        '</div>';
    });
    document.getElementById('dwGrid').innerHTML=h||'<p style="font-size:.83rem;color:#999">????곗씠???놁쓬</p>';
    renderLifeGraph(bazi);
  }catch(err){console.error('????ㅻ쪟',err);}
}

function showDwDetail(age,gan,zhi,evaluation,score){
  var gd=GAN[gan]||{e:'earth',n:'?'},jd=JI[zhi]||{e:'water',a:'?'};
  var startYear=BIRTH_YEAR+age-1;
  var isGood=score>=60;
  var gaeun=getDetailedGaeun(gd.e,isGood);
  var lbCls=score>=80?'lb-best':score>=60?'lb-good':score>=40?'lb-ok':'lb-bad';
  var jg=G_JONG,pw=G_POWER,jh=G_JOHU;
  var ev=evalDaewun(gan,zhi);

  var evalText='<div style="display:inline-block; padding:4px 10px; background:#F4F6FF; color:#1C64F2; border-radius:6px; font-size:0.85rem; font-weight:800; margin-bottom:10px; border:1px solid #D1DEF8">?㎛ ?듯빀 吏꾨떒: '+ev.evalSummary+'</div><br>';
  if(jg&&jg.isJong){
    var jlabel = jg.isGaJong ? '媛醫낃꺽' : '醫낃꺽';
    evalText+=gd.e===jg.dominant||jd.e===jg.dominant
      ?'??<b>'+jlabel+' 吏諛?湲곗슫('+EL_K[jg.dominant]+')??媛뺥솕</b>?섎뒗 ??댁엯?덈떎. 醫낃꺽???먮꼫吏瑜?理쒕?濡?諛쒗쐶?섎뒗 ?쒓린!'+(jg.isGaJong?'<br><span style="font-size:.78rem;color:#7B1FA2">??媛醫낃꺽??媛뺥솕 ??댁쓣 留뚮굹硫?吏꾩쥌寃⑹쑝濡??꾪솚 ????컻??諛쒕났 媛??/span>':'')
      :gd.e===whoControls(jg.dominant)||jd.e===whoControls(jg.dominant)
        ?'?좑툘 <b>'+jlabel+'???쏀솕?쒗궎??湲곗슫</b>???ㅼ뼱?듬땲?? ?먯떊??媛뺤젏???붾뱾由щ뒗 ?쒓린, ?댁떎???ㅼ??몄슂.'
        :'?셽 '+jlabel+'?????곹뼢??二쇱? ?딅뒗 以묐┰ ??댁엯?덈떎.';
  }else{
    var ganType = getQuantumElType(gd.e, G_PILLARS, jg, pw, jh);
    var zhiType = getQuantumElType(jd.e, G_PILLARS, jg, pw, jh);
    
    var goodEls = [];
    var badEls = [];
    if(ganType === 'good') goodEls.push(EL_K[gd.e]);
    if(zhiType === 'good') goodEls.push(EL_K[jd.e]);
    if(ganType === 'bad') badEls.push(EL_K[gd.e]);
    if(zhiType === 'bad') badEls.push(EL_K[jd.e]);

    if(goodEls.length) evalText += '??<b>議고썑/?⑹떊('+goodEls.join(',')+') 湲곗슫 ?ы븿</b> ???섎? ?뺢퀬 洹좏삎??留욎떠二쇰뒗 湲띿젙?곸씤 ?쒓린?낅땲?? ';
    if(badEls.length) evalText += '?좑툘 <b>湲곗떊('+badEls.join(',')+') 湲곗슫 ?ы븿</b> ??二쇱쓽媛 ?꾩슂?섎ŉ 諛⑹뼱?곸씤 ?쒕룄媛 ?좊━?⑸땲?? ';
    if(!goodEls.length && !badEls.length) evalText = '?셽 議고썑???듬?????移섏슦移⑥씠 ?녿뒗 以묐┰?곸씤 ??댁엯?덈떎. ';
    
    evalText += '<br><span style="font-size:0.8rem;color:#888;">???? 紐낅━ 泥쒓린(?⑺솕 諛?議고썑 ?곗꽑)??諛섏쁺??醫낇빀 ?됯??낅땲??</span>';
  }

  if(ev.hasChungBonus){
    var bonusContent = ev.chungBonusText || '?뮙 <b>?됱떊 ?뚭린(亦? 諛쒖깮!</b> 湲곗떊(?됱떊)???ъ＜ ?먭뎅怨?異⑸룎?섏뿬 源⑥죱?듬땲?? ?됲븳 湲곗슫???ㅽ엳????諛쒕났??湲고쉶濡?諛섏쟾?섎뒗 留ㅼ슦 湲띿젙?곸씤 ??댁엯?덈떎.';
    evalText += '<div style="margin-top:8px;padding:12px;background:#FFF3E0;border-radius:8px;border-left:4px solid #FFB300;font-size:0.9rem;line-height:1.6;color:#E65100;box-shadow:0 2px 6px rgba(255,152,0,0.15);">'+
                bonusContent + '</div>';
  }
  if(ev.hasChungPenalty){
    var penaltyContent = ev.chungPenaltyText || '?좑툘 <b>?⑹떊 ?뚯넀(亦? 諛쒖깮!</b> ?⑹떊???ъ＜ ?먭뎅怨?異⑸룎?섏뿬 源⑥죱?듬땲?? 誘우뿀??湲곗슫???붾뱾由????덉쑝??臾대━???뺤옣???쇳븯怨??섏꽦(若덂윃)??吏묒쨷?댁빞 ?섎뒗 ??댁엯?덈떎.';
    evalText += '<div style="margin-top:8px;padding:12px;background:#FFEBEE;border-radius:8px;border-left:4px solid #EF5350;font-size:0.9rem;line-height:1.6;color:#C62828;box-shadow:0 2px 6px rgba(244,67,54,0.15);">'+
                penaltyContent + '</div>';
  }

  var html=
    buildDwQmSection(gan,zhi)+

    '<div style="background:#fff;padding:14px;border-radius:12px;margin-bottom:12px;border:1px solid #FFE0D6">'+
    '<div style="font-size:.82rem;color:#888;margin-bottom:4px">???醫낇빀 ?됯? (?? 紐낅━ 泥쒓린 諛섏쁺)</div>'+
    '<div style="font-size:1.15rem;font-weight:700;color:#333;margin-bottom:6px">'+gan+zhi+
    ' <span style="font-size:.85rem;font-weight:400;color:#999">('+gd.n+' '+jd.a+')</span></div>'+
    '<span class="luck-badge '+lbCls+'">'+evaluation+'</span>'+
    '<div style="font-size:.84rem;color:#555;line-height:1.78;margin-top:10px">'+evalText+'</div>'+
    '</div>'+

    '<div class="gaeun-grid">'+
    '<div class="gaeun-box"><div class="gaeun-icon">?뮊</div><div class="gaeun-title">?곗븷??/div><div class="gaeun-content">'+gaeun.love+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">?뮥</div><div class="gaeun-title">?щЪ??/div><div class="gaeun-content">'+gaeun.wealth+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">?뫁</div><div class="gaeun-title">?멸컙愿怨?/div><div class="gaeun-content">'+gaeun.relationship+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">?뮳</div><div class="gaeun-title">而ㅻ━??/div><div class="gaeun-content">'+gaeun.career+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">?룯</div><div class="gaeun-title">嫄닿컯</div><div class="gaeun-content">'+gaeun.health+'</div></div>'+
    '<div class="gaeun-box"><div class="gaeun-icon">?뙂</div><div class="gaeun-title">媛쒖슫踰?/div><div class="gaeun-content">'+gaeun.lifestyle+'</div></div>'+
    '</div>'+

    '<div style="border-top:2px solid #FFE0D6;padding-top:16px;margin-top:4px">'+
    '<div style="font-weight:700;color:var(--pink);font-size:.9rem;margin-bottom:12px">?뱟 ?몄슫(?곗슫) ?곸꽭</div>'+
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
          johuYText='?뮛 ?쒖썝??麗?湲곗슫???④굅???ъ＜瑜??앺?以띾땲?? ??;
        else if((jh.type==='hot'||jh.type==='warm')&&(ygd.e==='fire'||yzd.e==='fire'))
          johuYText='?뵦 ??湲곗슫???뷀빐??怨쇱뿴 二쇱쓽. ?좑툘';
        else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='fire'||yzd.e==='fire'))
          johuYText='?뵦 ?곕쑜????湲곗슫??李④????ъ＜瑜??ν?以띾땲?? ??;
        else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='water'||yzd.e==='water'))
          johuYText='?뮛 麗?湲곗슫???뷀빐???됯컖 二쇱쓽. ?좑툘';
        else johuYText='?셽 蹂댄넻 ?섏???議고썑?낅땲??';
      }
      var ukbuYText='';
      if(jg&&jg.isJong){
        ukbuYText=ygd.e===jg.dominant||yzd.e===jg.dominant?'?? 醫낃꺽 媛뺥솕??????吏묒쨷?섎㈃ 理쒓퀬???깃낵!':'?셽 醫낃꺽 以묐┰????;
      }else if(pw){
        var hasY=pw.yongshin.indexOf(ygd.e)>=0||pw.yongshin.indexOf(yzd.e)>=0;
        var hasK=pw.kijishin.indexOf(ygd.e)>=0||pw.kijishin.indexOf(yzd.e)>=0;
        ukbuYText=hasY?'??<span class="notranslate">?⑹떊??/span> ??'+(pw.isStrong?'?먮꼫吏 諛쒖궛, ?ы쉶???쒖빟':'洹???깆옣, ?먯〈媛??곸듅'):
          hasK?'?좑툘 <span class="notranslate">湲곗떊??/span> ??'+(pw.isStrong?'?댁떎 ?ㅼ????쒓린':'?뚮え 二쇱쓽, ?뚮났 ?곗꽑'):'?셽 以묐┰??;
      }
      if(yEv.hasChungBonus){
        var ybText = yEv.chungBonusText ? yEv.chungBonusText : '?됱떊 ?뚭린(亦? 諛쒕났!';
        ukbuYText += '<br><span style="color:#E65100;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ybText + '</span>';
      }
      if(yEv.hasChungPenalty){
        var ypText = yEv.chungPenaltyText ? yEv.chungPenaltyText : '?⑹떊 ?뚯넀(亦? 二쇱쓽!';
        ukbuYText += '<br><span style="color:#D32F2F;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ypText + '</span>';
      }

      yearHTML+='<div class="year-row" onclick="toggleYear(this, event)">'+
        '<div class="year-top">'+
        '<div style="flex:1">'+
        '<div class="year-title">'+yr+'??쨌 '+yg2+yz2+' <span style="font-size:.78rem;color:#999;font-weight:400">('+ygd.n+' '+yzd.a+')</span></div>'+
        '<span class="luck-badge '+(yEv.score>=80?'lb-best':yEv.score>=60?'lb-good':yEv.score>=40?'lb-ok':'lb-bad')+'">'+yEv.label+'</span></div>'+
        '<span style="color:var(--pink-l);font-size:1rem">??/span></div>'+
        '<div class="year-sub">'+
        '<div class="yr-section"><div class="yr-label">?뽳툘 ?듬? ?먮떒</div><div class="yr-content">'+ukbuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">?뙜截?議고썑 遺꾩꽍</div><div class="yr-content">'+johuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">?뮊 ?곗븷??/div><div class="yr-content">'+yGaeun.love+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">?뮥 ?щЪ??/div><div class="yr-content">'+yGaeun.wealth+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">?뫁 ?멸컙愿怨?/div><div class="yr-content">'+yGaeun.relationship+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">?뮳 而ㅻ━?댁슫</div><div class="yr-content">'+yGaeun.career+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">?룯 嫄닿컯 議곗뼵</div><div class="yr-content">'+yGaeun.health+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">?뙂 媛쒖슫踰?/div><div class="yr-content">'+yGaeun.lifestyle+'</div></div>'+
        '</div></div>';
    }catch(e){console.error(yr+'???ㅻ쪟',e);}
  }
  document.getElementById('yearList').innerHTML=yearHTML;

  // 紐⑤컮???쒕옒洹??ㅽ겕濡? vs ??援щ퀎: touchstart/touchmove/touchend ?꾩엫
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

function toggleYear(el, event){
  if(event) {
    // 紐⑤컮?쇱뿉???ㅽ겕濡??쒖뒪泥섏? 異⑸룎 諛⑹?
    if(event.target.closest('.year-sub')) return;
    // ?곗튂 ?쒖옉 ?꾩튂 湲곕줉???덉쑝硫??쒕옒洹몃줈 ?먮떒??臾댁떆
    if(el._touchMoved) { el._touchMoved = false; return; }
  }
  var sub = el.querySelector('.year-sub');
  if(!sub) return;
  var isOpen = el.classList.contains('open');
  if(isOpen){
    // ?リ린: ?꾩옱 ?ㅼ젣 ?믪씠瑜?癒쇱? ?뺤젙(transition ?놁씠)????0?쇰줈
    sub.style.maxHeight = sub.scrollHeight + 'px';
    sub.offsetHeight; // reflow 媛뺤젣
    sub.style.maxHeight = '0';
    el.classList.remove('open');
  } else {
    // ?닿린: ?ㅼ젣 scrollHeight濡??ㅼ젙
    el.classList.add('open');
    sub.style.maxHeight = sub.scrollHeight + 'px';
    // ?몃옖吏???꾨즺 ??auto濡???댁쨾???대? ?숈쟻 蹂寃쎌뿉 ???    sub.addEventListener('transitionend', function onEnd(){
      if(el.classList.contains('open')) sub.style.maxHeight = 'none';
      sub.removeEventListener('transitionend', onEnd);
    });
  }
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?뱢 ?몄깮 湲명쓨 洹몃옒???먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */
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
    // 醫끾졏: ??紐낇솗??湲명쓨 ?됯퉼 援щ텇
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

  // 醫끾졏/媛醫끾졏? ?⑹떊 ??????됯퉼 媛뺤“
  var isJongActive = G_JONG && G_JONG.isJong;
  points.forEach(function(pt,i){
    var s=pt.score;
    // 湲몄슫: 湲덈튆쨌珥덈줉 怨꾩뿴 / ?됱슫: ?곸깋 怨꾩뿴
    var col, outerR=5;
    if(s>=85){col='#FFD700';outerR=7;}       // ?湲? 湲덈튆
    else if(s>=70){col='#4CAF50';outerR=6;}  // 湲? 珥덈줉
    else if(s>=55){col='#66BB6A';}           // ?뚭만: ?곗큹濡?    else if(s>=45){col='#BDBDBD';}           // ?? ?뚯깋
    else if(s>=30){col='#FF7043';}           // 二쇱쓽: 二쇳솴-??    else{col='#E53935';outerR=6;}            // ?? 吏꾩쟻??    ctx.beginPath();
    ctx.arc(xOf(pt.age),yOf(s),outerR,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.fill();
    ctx.strokeStyle=col;ctx.lineWidth=s>=70||s<30?2.5:2;ctx.stroke();
    // 醫끾졏 ?湲몄슫???꾧킅 ?④낵
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
    ctx.fillText('?꾩옱',cx,PAD_T-5);
    ctx.restore();
  }

  ctx.fillStyle='#bbb';ctx.font='10px sans-serif';ctx.textAlign='center';
  points.forEach(function(pt){
    ctx.fillText(pt.age+'??,xOf(pt.age),PAD_T+gH+14);
  });

  ctx.textAlign='right';
  ctx.fillText('湲?,PAD_L-4,yOf(80));
  ctx.fillText('??,PAD_L-4,yOf(20));

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
      var label=s>=80?'?뙚 ?湲몄슫':s>=60?'?삃 湲몄슫':s>=40?'?셽 以묐┰':s>=20?'?좑툘 二쇱쓽':'?뙢截???꼍';
      tip.style.display='block';
      tip.style.left=(xOf(closest.age)/scaleX-70)+'px';
      tip.style.top=(yOf(s)/180*130-10)+'px';
      tip.style.whiteSpace='nowrap';
      tip.innerHTML='<div style="font-weight:bold;color:#fff;margin-bottom:4px;font-size:0.9rem;">'+closest.age+'?? '+closest.g+closest.j+'</div>'+
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
  // 紐⑤컮???곗튂 吏??(passive:true ???ㅽ겕濡?李⑤떒 ?놁쓬, tap ?먮퀎)
  var _dwTouchStartX=0,_dwTouchStartY=0;
  canvas.addEventListener('touchstart',function(e){
    _dwTouchStartX=e.touches[0].clientX;
    _dwTouchStartY=e.touches[0].clientY;
  },{passive:true});
  canvas.addEventListener('touchend',function(e){
    var dx=Math.abs(e.changedTouches[0].clientX-_dwTouchStartX);
    var dy=Math.abs(e.changedTouches[0].clientY-_dwTouchStartY);
    if(dx>10||dy>10) return; // ?ㅽ겕濡??숈옉?대㈃ 臾댁떆
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ???섏? 鍮꾩듂???곗삁??李얘린
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */
function findSimilarCelebs(p){
  var card = document.getElementById('similarCelebCard');
  var resultArea = document.getElementById('similarCelebResult');
  if(!card || !resultArea) return;

  var myGans = [p.y.g, p.m.g, p.d.g, p.h.g];
  var myZhis = [p.y.j, p.m.j, p.d.j, p.h.j];
  var myDayGan = p.d.g;
  var myDayZhi = p.d.j;
  var myMonthZhi = p.m.j;

  var scores = [];

  CELEBS.forEach(function(c){
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
        matches.push('?쇨컙('+myDayGan+') ?쇱튂');
      } else if (GAN[myDayGan] && GAN[cg[2]] && GAN[myDayGan].e === GAN[cg[2]].e) {
        score += 10; // ?ㅽ뻾留?媛숈쓬
        matches.push('?쇨컙 ?ㅽ뻾('+EL_K[GAN[myDayGan].e]+') ?쇱튂');
      }

      if(myDayZhi === cz[2]){
        score += 15;
        matches.push('?쇱?('+myDayZhi+') ?쇱튂');
      }

      if(myMonthZhi === cz[1]){
        score += 15;
        matches.push('?붿?('+myMonthZhi+') ?쇱튂');
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
        matches.push(extraMatches+'媛?湲??異붽? ?쇱튂');
      }

      score = Math.min(70, score);

      if(score > 0){
        scores.push({
          celeb: c,
          score: score,
          matches: matches
        });
      }
    } catch(e) {
    }
  });

  scores.sort(function(a, b){ return b.score - a.score; });
  
  var top3 = scores.slice(0, 3);

  if(top3.length === 0 || top3[0].score < 20){
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  
  var html = '<div style="font-size:0.85rem; color:#666; margin-bottom:12px;">?ъ＜???듭떖???쇨컙, ?쇱?, ?붿? 諛??꾩껜 湲??援ъ꽦??遺꾩꽍?섏뿬 媛??鍮꾩듂???먮꼫吏瑜?媛吏??곗삁?몄쓣 李얠븯?듬땲??</div>';
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?? ?붿＜??鍮뚮윴 釉붾옓由ъ뒪???뚮뜑
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */
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
  var badElementEng = power.kijishin[0]; // 湲곗떊 ?ㅽ뻾 (?? 'wood', 'fire', 'earth', 'metal', 'water')
  
  var engToKor = {
    'wood': '紐?, 'fire': '??, 'earth': '??, 'metal': '湲?, 'water': '??
  };
  var badElement = engToKor[badElementEng];

  var elements = ['紐?, '??, '??, '湲?, '??];
  var ganToElement = {
    '媛?:'紐?, '??:'紐?, '蹂?:'??, '??:'??, '臾?:'??, '湲?:'??, '寃?:'湲?, '??:'湲?, '??:'??, '怨?:'??
  };
  var myElement = ganToElement[myDayGan];
  
  var myGanIdx = elements.indexOf(myElement);
  var badIdx = elements.indexOf(badElement);
  
  var diff = (badIdx - myGanIdx + 5) % 5;
  var badTenGod = '';
  if(diff === 0) badTenGod = '鍮꾧쾪';
  else if(diff === 1) badTenGod = '?앹긽';
  else if(diff === 2) badTenGod = '?ъ꽦';
  else if(diff === 3) badTenGod = '愿??;
  else if(diff === 4) badTenGod = '?몄꽦';

  var appearanceMap = {
    '紐?: '六ｋ빰?섍퀬 怨좎쭛?ㅻ윭??蹂댁씠???몄긽, 留덈Ⅴ怨?湲몄춬??泥댄삎, 臾섑븯寃??좉꼍吏덉쟻??遺꾩쐞湲?,
    '??: '?ㅽ삁吏덉쟻?닿퀬 ?덈튆??留ㅼ꽌???몄긽, ?붾젮?섍굅??????룹감由? 媛먯젙 湲곕났???ы빐 蹂댁씠??遺꾩쐞湲?,
    '??: '臾대슍?앺븯怨??띿쓣 ?????녿뒗 ?몄긽, 泥닿꺽???ш굅???뷀빐 蹂댁씠??泥댄삎, 怨좎??앺븯怨??듬떟??遺꾩쐞湲?,
    '湲?: '李④컩怨??좎뭅濡쒖슫 ?몄긽, 李쎈갚?섍굅??媛곸쭊 ?쇨뎬, 李붾윭??????諛⑹슱 ???섏삱 寃?媛숈? ?됲샊??遺꾩쐞湲?,
    '??: '?뚯묠?섍퀬 ?띿쓣 ?????녿뒗 ?몄긽, ?좎뿰?섏?留??대뵖媛 ?뚰쓨??蹂댁씠??泥댄삎, 鍮꾨???留롮븘 蹂댁씠??遺꾩쐞湲?
  };

  var behaviorMap = {
    '鍮꾧쾪': '??寃껋쓣 鍮쇱븮?쇰젮 ?ㅺ굅?? ?ъ궗嫄닿굔 寃쎌웳?ъ쓣 ?좊컻?섎ŉ ?쇨낀?섍쾶 留뚮뱶???좏삎',
    '?앹긽': '留먮줈 ?곸쿂瑜?二쇨굅?? ??怨꾪쉷???곕쭔?섍쾶 留뚮뱾怨?援ъ꽕?섎? ?쇱쑝?ㅻ뒗 ?좏삎',
    '?ъ꽦': '??臾몄젣濡??쏀엳嫄곕굹, 臾쇱쭏?곸씤 ?먰빐瑜??낇엳怨??섏쓽 寃곌낵瑜?媛濡쒖콈???좏삎',
    '愿??: '?듭븬?섍퀬 ?듭젣?섎젮 ?ㅺ굅?? 遺?뱁븳 ?ㅽ듃?덉뒪? 梨낆엫媛먯쓣 媛뺤슂?섎뒗 ?좏삎',
    '?몄꽦': '吏?섏튇 媛꾩꽠怨??붿냼由щ줈 ?쇨낀?섍쾶 ?섍굅?? ?섎? 寃뚯쑝瑜닿퀬 ?섏〈?곸쑝濡?留뚮뱶???좏삎'
  };

  var defenseMap = {
    '鍮꾧쾪': '?곷떦??嫄곕━?먭린媛 ?꾩닔?낅땲?? ???⑤? ??蹂댁뿬二쇱? 留먭퀬, 遺덊븘?뷀븳 寃쎌웳? ?쇳븯?몄슂.',
    '?앹긽': '留먮젮?ㅼ? 留덉꽭?? ?곷????꾨컻??媛먯젙?곸쑝濡???묓븯吏 留먭퀬 移⑤У?쇰줈 ?쇨??섎뒗 寃껋씠 ?곸콉?낅땲??',
    '?ъ꽦': '湲덉쟾 嫄곕옒???덈? 湲덈Ъ?낅땲?? 怨듦낵 ?щ? 紐낇솗??援щ텇?섍퀬, ??紐レ? ?뺤떎??梨숆린?몄슂.',
    '愿??: '遺?뱁븳 ?붽뎄?먮뒗 ?⑦샇?섍쾶 "No"?쇨퀬 留먰븯???곗뒿???꾩슂?⑸땲?? ?섎쭔??諛붿슫?붾━瑜?吏?ㅼ꽭??',
    '?몄꽦': '?낅┰?ъ쓣 ?ㅼ썙???⑸땲?? ?곷????몄쓽瑜?媛?ν븳 媛꾩꽠???딆뼱?닿퀬 ?ㅼ뒪濡?寃곗젙?섏꽭??'
  };

  var factBombMap = {
    '鍮꾧쾪': '?ㅺ? 留뚮쭔??蹂댁씠?덇퉴 ?먭씀 ???섎뒗 嫄곗빞. 李⑺븳 ?꾩씠 肄ㅽ뵆?됱뒪 醫 踰꾨젮.',
    '?앹긽': '?곷?諛?留먯뿉 ?쇱씪???곸쿂諛쏆? 留? 嫄붾꽕??洹몃깷 ?낆씠 媛踰쇱슫 寃껊퓧?댁빞. 臾댁떆媛 ?듭씠??',
    '?ъ꽦': '???껉퀬 ?щ엺 ?껉린 ??醫뗭? ?멸뎄 愿?곸씠?? ?쒕컻 ??鍮뚮젮二쇱? 留?',
    '愿??: '???먭씀 ???덉튂留?遊? ???몄깮?몃뜲 ???⑥씠 議곗쥌?섍쾶 ?붾몢?먭퀬. ?뺤떊 李⑤젮.',
    '?몄꽦': '?몄젣源뚯? ?⑦븳???섏??좊옒? ?ㅺ? ?ㅼ뒪濡????쒕㈃ ?됱깮 ?섎몮由щ떎 ?앸궇 嫄곗빞.'
  };

  var wonjinMap = {'耶?:'??, '訝?:'??, '野?:'??, '??:'??, '渦?:'雅?, '藥?:'??, '??:'訝?, '??:'耶?, '??:'??, '??:'野?, '??:'藥?, '雅?:'渦?};
  var chongMap = {'耶?:'??, '訝?:'??, '野?:'??, '??:'??, '渦?:'??, '藥?:'雅?, '??:'耶?, '??:'訝?, '??:'野?, '??:'??, '??:'渦?, '雅?:'藥?};
  var zhiToAnimal = {'耶?:'伊?, '訝?:'??, '野?:'?몃옉??, '??:'?좊겮', '渦?:'??, '藥?:'諭', '??:'留?, '??:'??, '??:'?먯댂??, '??:'??, '??:'媛?, '雅?:'?쇱?'};

  var wonjinDescMap = {
    '耶?: '?쒖깮??伊????묒쓽 肉붿쓣 ?レ뼱??,
    '??: '?쒖깮??伊????묒쓽 肉붿쓣 ?レ뼱??,
    '訝?: '遺吏?고븳 ?뚭? ?몃뒗 留먯쓣 ?レ뼱??,
    '??: '遺吏?고븳 ?뚭? ?몃뒗 留먯쓣 ?レ뼱??,
    '野?: '?몃옉?대뒗 ??쓽 ?몄쓬?뚮━瑜??レ뼱??,
    '??: '?몃옉?대뒗 ??쓽 ?몄쓬?뚮━瑜??レ뼱??,
    '??: '?좊겮???먯댂?댁쓽 鍮④컙 ?됰뜦?대? ?レ뼱??,
    '??: '?좊겮???먯댂?댁쓽 鍮④컙 ?됰뜦?대? ?レ뼱??,
    '渦?: '?⑹? ?쇱???肄붽? ?먭린? ??븘 ?レ뼱??,
    '雅?: '?⑹? ?쇱???肄붽? ?먭린? ??븘 ?レ뼱??,
    '藥?: '諭? 媛?吏뽯뒗 ?뚮━??源쒖쭩 ????レ뼱??,
    '??: '諭? 媛?吏뽯뒗 ?뚮━??源쒖쭩 ????レ뼱??
  };

  var wonjinZhi = wonjinMap[myDayZhi];
  var chongZhi = chongMap[myDayZhi];
  var wonjinAnimal = zhiToAnimal[wonjinZhi];
  var chongAnimal = zhiToAnimal[chongZhi];

  var stars = [p.y.g, p.y.j, p.m.g, p.m.j, p.d.j, p.h.g, p.h.j]
    .map(function(c) { return getTenGod(myDayGan, c); })
    .filter(function(t) { return t && t !== '?'; });
  var groupMap = {
    '鍮꾧껄': '鍮꾧쾪', '寃곸옱': '鍮꾧쾪',
    '?앹떊': '?앹긽', '?곴?': '?앹긽',
    '?뺤옱': '?ъ꽦', '?몄옱': '?ъ꽦',
    '?뺢?': '愿??, '?멸?': '愿??,
    '?뺤씤': '?몄꽦', '?몄씤': '?몄꽦'
  };
  var tgCount = { 鍮꾧쾪: 0, ?앹긽: 0, ?ъ꽦: 0, 愿?? 0, ?몄꽦: 0 };
  stars.forEach(function(s) {
    var g = groupMap[s];
    if (g) tgCount[g] += 1;
  });
  var dominantGroup = Object.keys(tgCount).reduce(function(prev, cur) {
    return tgCount[cur] > tgCount[prev] ? cur : prev;
  }, '鍮꾧쾪');
  var weakPointGroup = Object.keys(tgCount).reduce(function(prev, cur) {
    return tgCount[cur] < tgCount[prev] ? cur : prev;
  }, '鍮꾧쾪');
  var powerTone = power && power.isStrong
    ? '?좉컯 ?먮쫫?대씪 ?곷? ?뺣컯??踰꾪떚???섏? 異⑸텇?섏?留? 怨좎쭛 ? 怨좎쭛?쇰줈 遺숈쑝硫?媛덈벑???κ린?꾩쑝濡?踰덉쭏 ???덉뒿?덈떎.'
    : '?좎빟 ?먮쫫?대씪 愿怨??쇰줈瑜?紐몄쑝濡?癒쇱? 諛쏄린 ?ъ썙, 珥덈컲 寃쎄퀎???ㅼ젙???뱁엳 以묒슂?⑸땲??';

  var villainProfileMap = {
    '鍮꾧쾪': {
      tier: 'A+ ?숆툒??移⑦닾??,
      codename: 'MIRROR JACKER',
      shortDesc: '?뱀떊怨?鍮꾩듂??寃곕줈 ?묎렐???좊ː瑜??산퀬, ?깃낵? ?먮꼫吏瑜??ъ찉 媛?멸??????,
      strategy: '?뺣낫瑜??④퀎蹂꾨줈 怨듦컻?섍퀬, ??븷쨌梨낆엫쨌?깃낵 洹?띿쓣 臾몄꽌/硫붾え濡??④린?몄슂.'
    },
    '?앹긽': {
      tier: 'A湲??щ줎 援먮???,
      codename: 'NOISE CUTTER',
      shortDesc: '留먭낵 遺꾩쐞湲곕줈 ?먮쫫???먮━怨? ?뱀떊??吏묒쨷?μ쓣 臾대꼫?⑤━?????,
      strategy: '利됰떟 ???湲곕줉 ???듬? ?먯튃???ъ슜?섍퀬, ?쇱웳???꾨땶 湲곗??쒕줈 ??뷀븯?몄슂.'
    },
    '?ъ꽦': {
      tier: 'A+ ?먯씡 ?≫삁??,
      codename: 'DRAIN BROKER',
      shortDesc: '???먯썝/湲고쉶瑜?留ㅺ컻濡??ㅼ뼱? ?뱀떊???먯씡 諛몃윴?ㅻ? 源⑤뒗 ???,
      strategy: '湲덉쟾쨌怨꾩빟쨌怨듬룞吏異쒖? 遺꾨━?섍퀬, 怨꾩쥖/利앸튃/?쒕룄 湲곗???誘몃━ 怨좎젙?섏꽭??'
    },
    '愿??: {
      tier: 'A+ ?듭젣 ?뺣컯??,
      codename: 'IRON FRAME',
      shortDesc: '沅뚯쐞, 洹쒖튃, 二꾩콉媛먯쓣 ?댁슜???뱀떊???좏깮沅뚯쓣 鍮쇱븮?????,
      strategy: '?붿껌???뺣떦?굿룰린?쑣룸쾾?꾨? ?ы솗?명븯怨? 遺???붽뎄??吏㏐퀬 ?⑦샇?섍쾶 嫄곗젅?섏꽭??'
    },
    '?몄꽦': {
      tier: 'A湲?蹂댄샇???꾩옣??,
      codename: 'VELVET LEASH',
      shortDesc: '?꾩?怨?議곗뼵???쇨뎬濡??ㅺ?? ?뱀떊???먯쑉?깃낵 ?먮떒?μ쓣 ?쏀솕?쒗궎?????,
      strategy: '寃곗젙沅뚯? ??긽 蹂몄씤?먭쾶 ?먭퀬, 議곗뼵? 李멸퀬留??섎릺 理쒖쥌 ?좏깮? ?ㅼ뒪濡??섏꽭??'
    }
  };

  var profile = villainProfileMap[badTenGod] || villainProfileMap['愿??];
  var yeoniAdviceMap = {
    '鍮꾧쾪': '????????援щ룄瑜?留뚮뱾湲곕낫?? ??븷怨?梨낆엫??癒쇱? 遺꾨━?섎㈃ 遺덊븘?뷀븳 寃쎌웳??以꾩뼱?ㅼ뼱??',
    '?앹긽': '媛먯젙?곸씤 諛섎컯蹂대떎 ?ъ떎 ?뺤씤 吏덈Ц??癒쇱? ?섏?硫? 留먯쓽 二쇰룄沅뚯쓣 ?ㅼ떆 媛?몄삱 ???덉뼱??',
    '?ъ꽦': '?몄쓽??吏異쒓낵 ?섎Т 吏異쒖쓣 遺꾨━???곸뼱?먮㈃, 湲덉쟾 ?뚮え ?⑦꽩??源붾걫?섍쾶 ?딆뼱?????덉뼱??',
    '愿??: '?곷? 沅뚯쐞媛 而?蹂댁씪?섎줉 ?붿껌 踰붿쐞瑜?臾몄옣?쇰줈 ?ㅼ떆 ?뺤씤???ㅼ뒪濡쒕? 蹂댄샇?섏꽭??',
    '?몄꽦': '?꾩?諛쏅뒗 寃껉낵 ?섏〈?섎뒗 寃껋? ?щ씪?? 寃곗젙 ??留덉?留??좏깮沅뚯? 諛섎뱶???닿? 媛?멸????댁슂.'
  };
  var ssambaAdviceMap = {
    '鍮꾧쾪': '?깃낵???レ옄濡??④꺼. 利앷굅 ?녿뒗 ?몄쓽??寃곌뎅 ??紐レ쓣 源롮븘癒밸뒗??',
    '?앹긽': '留먯떥?? 泥대젰?꾩씠?? ?곷? ?섏씠??留먭퀬 ??湲곗??쒕줈 ?먯쓣 諛붽퓭.',
    '?ъ꽦': '???섍린 ?먮━???쒓컙 寃뚯엫 ?? ?쒕룄, 湲고븳, 利앸튃 ?놁쑝硫?諛붾줈 ?ㅽ넲.',
    '愿??: '?뺣컯? ?듯븷 ?뚮쭔 ?몄쭊?? 吏㏐퀬 ?⑦샇??嫄곗젅 ??踰덉씠 ?먯쓣 諛붽씔??',
    '?몄꽦': '移쒖젅???듭젣??湲몃뱾硫????좏깮洹쇱쑁??二쎈뒗?? ?ㅼ뒪濡?寃곗젙??'
  };
  var riskTimingMap = {
    '鍮꾧쾪': '?깃낵 諛쒗몴 吏곸쟾, ??븷 議곗젙 ?쒖젏, ?묒뾽 珥덈컲 ?좊ː ?뺤꽦 援ш컙',
    '?앹긽': '?뚯쓽 ?꾨컲 ?쇰줈 援ш컙, 硫붿떊? 怨듬갑, 怨듦컻 肄붾찘?멸? 留롮? ??,
    '?ъ꽦': '?뺤궛 二쇨린, 怨듬룞援щℓ/?ъ옄 ?쒖븞, 湲됲븳 ?↔툑 ?붿껌???ㅼ뼱????,
    '愿??: '留덇컧 吏곸쟾, 蹂닿퀬 ?쇱씤 蹂寃? 梨낆엫?뚯옱媛 紐⑦샇?댁????쒖젏',
    '?몄꽦': '?댁쭅/蹂?붽린, 而⑤뵒??????쒓린, 寃곗젙 ?쇰줈媛 ?꾩쟻??二쇨컙'
  };
  var analysisSummary = '???ъ＜ 湲곗? ??꽦 遺꾪룷??鍮꾧쾪 ' + tgCount.鍮꾧쾪 + ' 쨌 ?앹긽 ' + tgCount.?앹긽 + ' 쨌 ?ъ꽦 ' + tgCount.?ъ꽦 + ' 쨌 愿??' + tgCount.愿??+ ' 쨌 ?몄꽦 ' + tgCount.?몄꽦 + '?낅땲?? '
    + '?듭떖 異뺤? ' + dominantGroup + '?닿퀬, 痍⑥빟 異뺤? ' + weakPointGroup + '?낅땲?? '
    + '?꾩옱 鍮뚮윴 異뺤씤 ' + badTenGod + '???먭레?섎㈃ 媛먯젙 ?뚮え? ?섏궗寃곗젙 ?쇰줈媛 ?④퍡 利앷??????덉뒿?덈떎.';

  var checklistItems = [
    '愿怨?珥덈컲遺??湲덉쟾/?낅Т/媛먯젙 寃쎄퀎瑜?臾몄옣?쇰줈 紐낇솗???대몢?덈떎.',
    '媛덈벑 ?곹솴?먯꽌 利됰떟蹂대떎 湲곕줉(硫붾え/臾몄옄) ???듬? ?먯튃??吏?ㅺ퀬 ?덈떎.',
    '遺?뱁븳 遺?곸쓣 諛쏆쑝硫??댁쑀瑜?湲멸쾶 ?ㅻ챸?섏? ?딄퀬 吏㏐쾶 嫄곗젅?????덈떎.',
    '?곕씫 二쇨린? 留뚮궓 鍮덈룄瑜???而⑤뵒??湲곗??쇰줈 議곗젅?섍퀬 ?덈떎.',
    '?뚮え ?좏샇(?섎㈃??샕룹삁誘쇳븿쨌遺덉븞)媛 ?ㅻ㈃ 利됱떆 嫄곕━?먭린 猷⑦떞???ㅽ뻾?쒕떎.'
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
    + '      <div class="villain-grade">?꾪뿕 ?깃툒: ' + profile.tier + '</div>'
    + '      <h3 class="villain-name">肄붾뱶?ㅼ엫: ' + profile.codename + ' 쨌 ' + badElement + badTenGod + ' 鍮뚮윴</h3>'
    + '      <p class="villain-subcopy">' + profile.shortDesc + '</p>'
    + '    </div>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">?몓截?紐쏀?二?遺꾩쐞湲??꾨줈?뚯씪</div>'
    + '    <p class="villain-text">' + appearanceMap[badElement] + '</p>'
    + '  </div>'

    + '  <div class="villain-section red-flag">'
    + '    <div class="villain-section-title">?슜 ?묐룞 ?⑦꽩 (?덈뱶 ?뚮옒洹?</div>'
    + '    <p class="villain-text">' + behaviorMap[badTenGod] + '</p>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">?렞 異⑸룎 由ъ뒪??(?먯쭊/異?</div>'
    + '    <p class="villain-text">?뱁엳 <b>' + wonjinAnimal + '??/b>, <b>' + chongAnimal + '??/b>? 寃곗씠 留욎븘?⑥뼱吏???媛덈벑 ?쇰줈?꾧? 湲됱긽?뱁븷 ???덉뒿?덈떎.</p>'
    + '    <p class="villain-text" style="margin-top:8px;font-size:0.85rem;color:#ff9ea8;">???먯쭊(?ⓨ뿏): ' + wonjinDescMap[myDayZhi] + '</p>'
    + '  </div>'

    + '  <div class="villain-section defense">'
    + '    <div class="villain-section-title">?썳截??ㅼ쟾 諛⑹뼱 媛?대뱶</div>'
    + '    <p class="villain-text">' + defenseMap[badTenGod] + '</p>'
    + '    <p class="villain-text" style="margin-top:8px;color:#c4b5fd;">+ A湲?????ъ씤?? ' + profile.strategy + '</p>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">?쭬 ?ъ＜ 湲곕컲 由ъ뒪???댁꽕</div>'
    + '    <p class="villain-text">' + analysisSummary + '</p>'
    + '    <p class="villain-text" style="margin-top:8px;color:#cbd5e1;">' + powerTone + '</p>'
    + '  </div>'

    + '  <div class="villain-section">'
    + '    <div class="villain-section-title">?깍툘 異⑸룎 ?몃━嫄???대컢</div>'
    + '    <p class="villain-text">' + riskTimingMap[badTenGod] + '??寃쎄퀎媛 ?먮젮吏湲??쎌뒿?덈떎. ??援ш컙?먮뒗 ?듬? 吏?걔룰린以 ?ы솗?맞룸Ц?쒗솕 3?④퀎瑜??곗꽑 ?곸슜?섏꽭??</p>'
    + '  </div>'

    + '  <div class="villain-fact-bomb"><p>"' + factBombMap[badTenGod] + '"</p></div>'

    + '  <div class="villain-checklist-wrap">'
    + '    <div class="villain-section-title">??A湲?鍮뚮윴 ?泥?泥댄겕由ъ뒪??(?먭? 吏꾨떒 5臾명빆)</div>'
    + '    <div class="villain-checklist">' + checklistHtml + '</div>'
    + '    <button type="button" class="villain-submit-btn" id="villainChecklistSubmit">?쒖텧?섍린 (寃곌낵 蹂닿린)</button>'
    + '    <div class="villain-feedback" id="villainFeedback" aria-live="polite"></div>'
    + '  </div>'

    + '  <div class="villain-quotes">'
    + '    <div class="villain-quote yeoni"><strong>?뫆 ?곗씠??議곗뼵</strong><br>"' + yeoniAdviceMap[badTenGod] + '"</div>'
    + '    <div class="villain-quote neo"><strong>?빒截??덈컮??議곗뼵</strong><br>"' + ssambaAdviceMap[badTenGod] + '"</div>'
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
        msg = '?뚮???諛⑹뼱?쒖꽭! (' + checked + '/5) 寃쎄퀎???ㅼ젙怨?媛먯젙 ?듭젣媛 ?덉젙?곸엯?덈떎. 吏湲??섏씠?ㅻ? ?좎??섏꽭??';
      } else if (checked >= 2) {
        gradeCls = 'mid';
        msg = '議곌툑 ??寃쎄퀎媛 ?꾩슂??(' + checked + '/5). ???湲곕줉怨?嫄곕━?먭린 猷⑦떞??媛뺥솕?섎㈃ ?뚮え瑜??ш쾶 以꾩씪 ???덉뒿?덈떎.';
      } else {
        gradeCls = 'danger';
        msg = '?꾪뿕! ?뱀옣 嫄곕━?먭린 ?꾩닔 (' + checked + '/5). ?곕씫/留뚮궓 鍮덈룄瑜?利됱떆 以꾩씠怨?湲덉쟾쨌媛먯젙 寃쎄퀎遺???뚮났?섏꽭??';
      }

      feedbackEl.classList.remove('is-show', 'is-good', 'is-mid', 'is-danger');
      feedbackEl.innerHTML = '<strong>吏꾨떒 寃곌낵</strong><br>' + msg;
      feedbackEl.classList.add('is-show', 'is-' + gradeCls);

      // 紐⑤컮?쇱뿉???쇰뱶諛?諛뺤뒪 ?섎떒??媛?ㅼ?吏 ?딅룄濡??덉쟾?섍쾶 ?ㅽ겕濡?蹂댁젙
      setTimeout(async function() {
        try {
          feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_e) {}
      }, 30);
    };
  }
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?㎚ ?몃Ⅴ紐?愿?????뚰넗 vs ?먭쾺
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */
function calculateHormoneVibe(p, power) {
  p = p || {};
  var dg = (p.d && p.d.g) ? p.d.g : '??;
  var slots = [
    p.y && p.y.g,
    p.y && p.y.j,
    p.m && p.m.g,
    p.m && p.m.j,
    p.d && p.d.j,
    p.h && p.h.g,
    p.h && p.h.j
  ].filter(function(c){ return !!c; });

  // ?쇨컙 ?쒖쇅 7媛??먮━?먯꽌 ??꽦 紐⑸줉
  var stars = slots
    .map(function(c) { return getTenGod(dg, c); })
    .filter(function(t) { return t && t !== '?'; });

  var cnt = {};
  stars.forEach(function(s) { cnt[s] = (cnt[s]||0)+1; });

  var bigyuk  = (cnt['鍮꾧껄']||0) + (cnt['寃곸옱']||0);   // 鍮꾧쾪
  var siksang = (cnt['?앹떊']||0) + (cnt['?곴?']||0);   // ?앹긽
  var insung  = (cnt['?뺤씤']||0) + (cnt['?몄씤']||0);   // ?몄꽦
  var gwansung= (cnt['?뺢?']||0) + (cnt['?멸?']||0);   // 愿??  var jaesung = (cnt['?뺤옱']||0) + (cnt['?몄옱']||0);   // ?ъ꽦

  var isStrong = !!(power && power.isStrong);

  var tetoScore = 0, egenScore = 0;
  var reasons = [];

  // ?? ?뚰넗 議곌굔 ??
  if (bigyuk >= 2 && isStrong) {
    tetoScore += 40;
    reasons.push({ type:'teto', icon:'?뮞', text:'鍮꾧쾪(' + bigyuk + '媛???萸됱튂怨??좉컯 ??二쇰룄沅??덈? ???섍꺼' });
  } else if (bigyuk >= 1 && isStrong) {
    tetoScore += 18;
  }
  if (cnt['?앹떊'] >= 1 && cnt['?멸?'] >= 1) {
    tetoScore += 32;
    reasons.push({ type:'teto', icon:'?뷂툘', text:'?앹떊?쒖궡(繇잏쪥?뜻?) ?깅┰ ???닿? ?듭젣, ?닿? 二쇰룄' });
  }
  if (gwansung >= 2 && isStrong) {
    tetoScore += 28;
    reasons.push({ type:'teto', icon:'?뵦', text:'愿??' + gwansung + '媛? + ?좉컯 ???뺣컯??利먭린????? });
  } else if (gwansung >= 2 && !isStrong) {
    tetoScore += 5;
  }
  if (jaesung > 0 && jaesung <= 2) {
    tetoScore += 25;
    reasons.push({ type:'teto', icon:'?뭿', text:'?ъ꽦(' + jaesung + '媛? ??李곗쭊 ?꾩떎 媛먭컖, ?듭젣???믪? 紐⑺몴 吏???뚰넗' });
  }
  if (isStrong) tetoScore += 8; // ?좉컯 蹂대꼫??
  // ?? ?먭쾺 議곌굔 ??
  if (insung >= 3) {
    egenScore += 45;
    reasons.push({ type:'egen', icon:'??, text:'?몄꽦(' + insung + '媛? ?쒕룄 珥덇낵 ???섏슜쨌蹂댁궡???먮꼫吏 ??컻' });
  } else if (insung >= 2) {
    egenScore += 20;
  }
  if (siksang >= 3) {
    egenScore += 42;
    reasons.push({ type:'egen', icon:'?뙵', text:'?앹긽(' + siksang + '媛? 怨쇰떎 ??媛먯꽦 ?뚮룄媛 硫덉텛吏??딆븘' });
  } else if (siksang >= 2) {
    egenScore += 22;
  }
  if (insung >= 2 && siksang >= 2) {
    egenScore += 12; // ?몄꽦+?앹긽 蹂듯빀 ?쒕꼫吏
    reasons.push({ type:'egen', icon:'?뮟', text:'?몄꽦쨌?앹긽 蹂듯빀 ???ъ꽭?④낵 ?쒗쁽?뺤씠 ?숈떆?? });
  }
  if (jaesung >= 3) {
    egenScore += 35;
    reasons.push({ type:'egen', icon:'?렚', text:'?ъ꽦(' + jaesung + '媛? 怨쇰떎 ???뚰넗??泥숉븯吏留??띿쑝濡?媛먯젙???⑹벝由щ뒗 ?먭쾺' });
  }
  if (!isStrong) egenScore += 10; // ?좎빟 蹂대꼫??
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
      reasons: [{ type:'egen', icon:'?뽳툘', text:'?쇰? ?꾨줈???곗씠?곌? 鍮꾩뼱 ?덉뼱 湲곕낯 諛몃윴??紐⑤뱶濡?遺꾩꽍?덉뒿?덈떎.' }],
      bigyuk: 0, siksang: 0, insung: 0, gwansung: 0, jaesung: 0,
      isStrong: false, cnt: {}
    };
  }

  if (!vibe || !isFinite(Number(vibe.tetoScore)) || !isFinite(Number(vibe.egenScore))) {
    vibe = {
      result: 'neutral', tetoScore: 35, egenScore: 35,
      reasons: [{ type:'egen', icon:'?㎛', text:'?곗씠???숆린??以묒엯?덈떎. ?덈줈怨좎묠 ???ㅼ떆 ?뺤씤?섎㈃ ???뺥솗?댁쭛?덈떎.' }],
      bigyuk: 0, siksang: 0, insung: 0, gwansung: 0, jaesung: 0,
      isStrong: false, cnt: {}
    };
  }
  
  var tPct = Math.round(Math.min(100, vibe.tetoScore * 1.2));
  var ePct = Math.round(Math.min(100, vibe.egenScore * 1.2));

  var autoReasons = [];
  if (vibe.tetoScore >= 60) autoReasons.push({ type:'teto', icon:'?㎟', text:'?뚰넗 湲곕낯 泥대젰 ?믪쓬 ??寃곗젙 ?띾룄 鍮좊Ⅴ怨?諛?대텤?대뒗 ?붿쭊??媛뺥빀?덈떎.' });
  if (vibe.egenScore >= 60) autoReasons.push({ type:'egen', icon:'?ェ', text:'?먭쾺 媛먯닔???곹븳移?洹쇱젒 ??遺꾩쐞湲걔룻몴?빧룸쭚???뷀뀒??媛먯??μ씠 ?믪뒿?덈떎.' });
  if (Math.abs(vibe.tetoScore - vibe.egenScore) <= 12) autoReasons.push({ type:'egen', icon:'?뽳툘', text:'?뚰넗쨌?먭쾺 ?먯닔 李④? ?묒븘 ?곹솴 留욎땄???섎Ⅴ?뚮굹 ?꾪솚??鍮좊Ⅸ ?몄엯?덈떎.' });
  if (vibe.tetoScore >= 70 && vibe.egenScore >= 55) autoReasons.push({ type:'egen', icon:'?렞', text:'媛뺥븯寃?留먰빐???띿? ?ъ꽭???섏씠釉뚮━????寃됲뀒?졖룹냽?먭쾺 ?⑦꽩??蹂댁엯?덈떎.' });
  if (vibe.egenScore >= 70 && vibe.tetoScore >= 55) autoReasons.push({ type:'teto', icon:'?뿠截?, text:'?ㅼ젙?쒕뜲 ???섏쑝硫?移쇨컳????湲뗫뒗 ?????寃됱뿉寃먃룹냽?뚰넗 ?⑦꽩?낅땲??' });

  var mergedReasons = (vibe.reasons || []).concat(autoReasons).slice(0, 8);
  var reasonsHtml = mergedReasons.length
    ? mergedReasons.map(function(r) {
        return '<div class="hv-reason-item ' + (r.type === 'egen' ? 'egen-item' : '') + '">'
          + r.icon + ' ' + r.text + '</div>';
      }).join('')
    : '<div class="hv-reason-item" style="color:rgba(255,255,255,.4)">?뱀젙 議곌굔??吏묒쨷?섏? ?딆? 洹좏삎 ?ъ＜</div>';

  var statsHtml = '<div style="display:flex; justify-content:space-around; margin-bottom: 12px; background: rgba(0,0,0,0.25); border-radius:12px; padding: 12px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);">'
    + '<div class="hv-stat-box" style="background:none; padding:0; flex:1; text-shadow:0 0 10px rgba(255,107,107,0.4);"><div class="hv-stat-num" style="color:#ff6b6b; font-size:1.8rem;">?뵦' + vibe.tetoScore + '</div><div class="hv-stat-label" style="letter-spacing:1px;">?뚰넗 ?먯닔</div></div>'
    + '<div style="width:1px; background:linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent); margin:0 10px;"></div>'
    + '<div class="hv-stat-box" style="background:none; padding:0; flex:1; text-shadow:0 0 10px rgba(217,128,250,0.4);"><div class="hv-stat-num" style="color:#d980fa; font-size:1.8rem;">?? + vibe.egenScore + '</div><div class="hv-stat-label" style="letter-spacing:1px;">?먭쾺 ?먯닔</div></div>'
    + '</div>'
    + '<div class="hv-stats-grid" style="grid-template-columns:repeat(5, 1fr); gap:8px;">'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.bigyuk  + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#f1c40f;">鍮꾧쾪</div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.siksang + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#e056fd;">?앹긽</div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.jaesung + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#f39c12;">?ъ꽦</div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.gwansung+ '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#e74c3c;">愿??/div></div>'
    + '<div class="hv-stat-box" style="padding:10px 4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);"><div class="hv-stat-num" style="font-size:1.2rem;">' + vibe.insung  + '</div><div class="hv-stat-label" style="font-size:0.68rem; color:#1abc9c;">?몄꽦</div></div>'
    + '</div>';

  var scoreGap = vibe.tetoScore - vibe.egenScore;
  var gapAbs = Math.abs(scoreGap);
  var stars = Object.keys(vibe.cnt || {}).sort(function(a, b) { return (vibe.cnt[b] || 0) - (vibe.cnt[a] || 0); });
  var starSummary = stars.length
    ? stars.slice(0, 3).map(function(s) { return s + ' ' + vibe.cnt[s] + '移?; }).join(' 쨌 ')
    : '??꽦 遺꾪룷媛 怨좊Ⅴ寃??쇱쭊 以묐┰??;

  var comboTitle = '';
  var comboSummary = '';
  var comboBone = '';
  var comboLove = '';
  var comboWork = '';
  var comboTip = '';

  if (vibe.tetoScore >= 75 && vibe.egenScore >= 60) {
    comboTitle = '?뵦 寃됲뀒??쨌 ?띿뿉寃??섏씠釉뚮━??;
    comboSummary = '寃곗젙? ?뚰넗泥섎읆 鍮좊Ⅸ?? ?щ엺 媛먯젙 濡쒓렇???먭쾺泥섎읆 ????ν븯????낆엯?덈떎.';
    comboBone = '??留??섏?怨?吏?媛??"?닿? ?덈Т ?섎굹?" 蹂듦린 3?뚯감 ?뚮━???⑦꽩??蹂댁엯?덈떎.';
    comboLove = '由щ뱶 ?섑븯吏留??뷀뀒?쇱뿉 誘쇨컧?댁꽌, ?곷? ?쒖젙 ??踰덉뿉 湲곕텇??濡ㅻ윭肄붿뒪?곕? ?????덉뒿?덈떎.';
    comboWork = '?뚯쓽?먯꽌??寃곕줎 癒몄떊, 1:1 ??붿뿉?쒕뒗 怨듦컧遊? ??먯꽌??苑??ш???留뚮뒫?뺤엯?덈떎.';
    comboTip = '寃곕줎? 吏㏐퀬 ?⑤떒?섍쾶, ?쇰뱶諛깆? 遺?쒕읇怨?湲멸쾶 媛硫??밸쪧??湲됱긽?뱁빀?덈떎.';
  } else if (vibe.egenScore >= 75 && vibe.tetoScore >= 60) {
    comboTitle = '??寃됱뿉寃?쨌 ?랁뀒???섏씠釉뚮━??;
    comboSummary = '遺꾩쐞湲곕뒗 遺?쒕읇吏留??듭떖 ???섏뼱?ㅻ㈃ ?⑥뭡???뺣━?섎뒗 ?洹?媛뺤쿋 ??낆엯?덈떎.';
    comboBone = '?됱냼????諛쏆븘二쇰떎媛 ?꾧퀎???섎뒗 ?쒓컙 "?ш린源뚯?" 踰꾪듉??愿묒냽?쇰줈 ?꾨쫭?덈떎.';
    comboLove = '?ㅼ젙?⑥씠 湲곕낯媛믪씠吏留? 議댁쨷??源⑥????쒓컙 愿怨??뺣━ ?띾룄媛 ?섏쇅濡?鍮좊쫭?덈떎.';
    comboWork = '議곗쑉 ?λ젰 理쒖긽湲? ?ㅻ쭔 湲곗? ?녿뒗 遺?곸쓣 怨꾩냽 諛쏆쑝硫??쇰줈媛 ?꾩쟻?⑸땲??';
    comboTip = '李⑺븳 ?щ엺 紐⑤뱶? ?먯튃 紐⑤뱶 ?꾪솚 湲곗???誘몃━ 留먰빐?먮㈃ ?뚮え媛 以꾩뼱??땲??';
  } else if (vibe.result === 'teto') {
    comboTitle = '?쫨 ?뚰넗 ?곗꽭??;
    comboSummary = '二쇰룄沅? ?띾룄, 寃곗젙?μ뿉??媛뺤젏???쒕졆?⑸땲?? "?쇰떒 媛蹂댁옄" ?붿쭊??媛뺥빀?덈떎.';
    comboBone = '臾몄젣?????닿껐?섎뒗?? 留먰닾源뚯? ?닿껐?대쾭由щ㈃ ?щ엺??媛숈씠 ?뺣━?????덉뒿?덈떎.';
    comboLove = '?뺤떎???쒗쁽怨??됰룞?쇰줈 ?좊ː瑜?以띾땲?? ?ㅻ쭔 ?곷????띾룄??議댁쨷?댁빞 ?ㅻ옒 媛묐땲??';
    comboWork = '?쒖씠???믪? 怨쇱젣??媛뺥빀?덈떎. ?⑤룆 ?뚰뙆?μ? 醫뗭?留??꾩엫???쏀븯硫?怨쇰??섍? ?듬땲??';
    comboTip = '?뺣떟 ?쒖떆 ??5珥?寃쎌껌留?異붽??대룄 "移대━?ㅻ쭏"媛 "?뺣컯媛??쇰줈 ?쏀엳??嫄?留됱뒿?덈떎.';
  } else if (vibe.result === 'egen') {
    comboTitle = '?뙵 ?먭쾺 ?곗꽭??;
    comboSummary = '怨듦컧, 遺꾩쐞湲? 愿怨??쇱뒪媛 ?곗뼱????낆엯?덈떎. ?щ엺 留덉쓬??蹂?붾? 鍮좊Ⅴ寃??쎌뒿?덈떎.';
    comboBone = '諛곕젮 留뚮젟?몃뜲, ?뺤옉 蹂몄씤 諛고꽣由??붾웾? 留덉?留?5%源뚯? ?곕뒗 寃쏀뼢???덉뒿?덈떎.';
    comboLove = '媛먯젙 寃곗쓣 ??留욎떠 移쒕??꾧? 鍮⑤━ ?щ씪媛묐땲?? ???怨쇰ぐ??寃쎄퀎媛 以묒슂?⑸땲??';
    comboWork = '?묒뾽???ㅽ솢????븷???곸썡?⑸땲?? ?ㅻ쭔 ?곗꽑?쒖쐞媛 ?먮젮吏硫??깃낵媛 遺꾩궛?⑸땲??';
    comboTip = '怨듦컧 ???됰룞 ??以??ㅼ쓬 ?≪뀡)??遺숈씠硫?媛먯꽦怨??ㅽ뻾?μ씠 ?숈떆???댁븘?⑸땲??';
  } else if (vibe.tetoScore >= 50 && vibe.egenScore >= 50) {
    comboTitle = '?? 硫???섎Ⅴ?뚮굹 諛몃윴?ㅽ삎';
    comboSummary = '?뚰넗쨌?먭쾺 紐⑤몢 ?믪? ?ㅼ옱?ㅻ뒫?뺤엯?덈떎. ?곹솴 ?곕씪 罹먮┃???ㅼ쐞移?씠 鍮좊쫭?덈떎.';
    comboBone = '臾몄젣??蹂몄씤??"吏湲??닿? ?대뼡 紐⑤뱶?몄?" ?룰컝由щ뒗 ?쒓컙???⑤떎???먯엯?덈떎.';
    comboLove = '?곷??먭쾶 留욎떠二쇰뒗 ?λ젰??醫뗭?留? 蹂몄씤 ?뺢뎄瑜??ㅻ줈 誘몃（硫??쇰줈媛 ?꾩쟻?⑸땲??';
    comboWork = '以묒옱쨌由щ뵫쨌?ㅽ뻾??紐⑤몢 ?뚰솕?⑸땲?? ?ㅻ쭔 湲곗????놁쑝硫????좎븞寃??⑸땲??';
    comboTip = '?ㅻ뒛??湲곕낯 紐⑤뱶(?뚰넗/?먭쾺) ?섎굹留??뺥빐?먮㈃ ?섏궗寃곗젙 ?쇰줈媛 ?ш쾶 以꾩뼱??땲??';
  } else {
    comboTitle = '?쭒 ??먭레 愿李곗옄??;
    comboSummary = '?쒗쁽? ?좎쨷?섍퀬 諛섏쓳? ?덉젣????낆엯?덈떎. ?쎄쾶 ?붾뱾由ъ? ?딅뒗 ?μ젏???덉뒿?덈떎.';
    comboBone = '臾몄젣???덈Т 議곗슜?댁꽌 "?꾨Т ?앷컖 ?녿굹?" ?ㅽ빐瑜??먯＜ 諛쏅뒗?ㅻ뒗 ?먯엯?덈떎.';
    comboLove = '源딆뼱吏湲곌퉴吏 ?쒓컙???꾩슂?⑸땲?? ????쒕쾲 ?좊ː?섎㈃ ?ㅻ옒 媛묐땲??';
    comboWork = '?뺥솗??以묒떖?쇰줈 ?吏곸뿬 ?ㅼ닔媛 ?곸뒿?덈떎. 鍮좊Ⅸ ?쒗룷 ?섍꼍?먯꽌???섎룄 ?ㅻ챸???꾩슂?⑸땲??';
    comboTip = '?앷컖???앸궦 ????以꾨줈 癒쇱? 怨듭쑀?섎㈃ 議댁옱媛먭낵 ?좊ː?꾧? ?숈떆???щ씪媛묐땲??';
  }

  var hormoneStoryHtml = '<div style="margin-top:18px; background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.14); border-radius:12px; padding:14px; text-align:left;">'
    + '<div style="font-size:.9rem; font-weight:900; color:#f8fafc; margin-bottom:8px;">?㎦ ?뚰넗쨌?먭쾺 ?뷀븰??由ы룷??/div>'
    + '<div style="font-size:.82rem; color:#e2e8f0; margin-bottom:8px;"><b>' + comboTitle + '</b> 쨌 ?먯닔李?' + gapAbs + '??/div>'
    + '<div style="font-size:.82rem; line-height:1.62; color:#dbeafe; margin-bottom:8px;">' + comboSummary + '</div>'
    + '<div style="font-size:.8rem; line-height:1.6; color:#fecaca; margin-bottom:10px;"><b>?┫ 堉덈븣由щ뒗 ??以?</b> ' + comboBone + '</div>'
    + '<div style="display:grid; grid-template-columns:1fr; gap:8px;">'
    +   '<div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:8px;"><b style="color:#f9a8d4;">?뮊 ?곗븷 紐⑤뱶</b><div style="font-size:.79rem; color:#e5e7eb; margin-top:4px; line-height:1.55;">' + comboLove + '</div></div>'
    +   '<div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:8px;"><b style="color:#93c5fd;">?뮳 ?ы쉶/而ㅻ━??紐⑤뱶</b><div style="font-size:.79rem; color:#e5e7eb; margin-top:4px; line-height:1.55;">' + comboWork + '</div></div>'
    +   '<div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:8px;"><b style="color:#fde68a;">?㎛ ?ㅻ뒛???댁쁺 ??/b><div style="font-size:.79rem; color:#e5e7eb; margin-top:4px; line-height:1.55;">' + comboTip + '</div></div>'
    + '</div>'
    + '<div style="margin-top:10px; font-size:.74rem; color:rgba(255,255,255,.58);">?듭떖 ??꽦 遺꾪룷: ' + starSummary + '</div>'
    + '</div>';

  var barHtml = '<div style="margin-bottom:6px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:4px;"><span>?뵦 ?뚰넗 ?먮꼫吏</span><span>' + tPct + '%</span></div>'
    + '<div class="hv-bar-wrap"><div class="hv-bar-teto" id="hvBarTeto" style="width:0%"></div></div>'
    + '</div>'
    + '<div style="margin-bottom:18px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:4px;"><span>???먭쾺 ?먮꼫吏</span><span>' + ePct + '%</span></div>'
    + '<div class="hv-bar-wrap"><div class="hv-bar-egen" id="hvBarEgen" style="width:0%"></div></div>'
    + '</div>';

  var missionByResult = {
    teto: {
      title: '?ㅻ뒛???뚰넗 誘몄뀡',
      tasks: [
        '寃곕줎 留먰븯湲??? ?곷? 留?20珥??앷퉴吏 ?ｊ린',
        '????3媛?以?1媛쒕뒗 ?꾩엫?댁꽌 ?먮꼫吏 遺꾩궛?섍린',
        '?대룞 20遺???移?갔 硫붿떆吏 1媛?蹂대궡湲?
      ]
    },
    egen: {
      title: '?ㅻ뒛???먭쾺 誘몄뀡',
      tasks: [
        '怨듦컧 ??利됱떆 ?ㅼ쓬 ?됰룞 1以?遺숈씠湲?,
        '怨쇰ぐ???좏샇 ?ㅻ㈃ 3遺??명씉?쇰줈 媛먯젙 由ъ뀑',
        '?붿껌 1嫄댁? ?뺤쨷??嫄곗젅??寃쎄퀎???곗뒿?섍린'
      ]
    },
    neutral: {
      title: '?ㅻ뒛??諛몃윴??誘몄뀡',
      tasks: [
        '?ㅼ쟾? ?뚰넗 紐⑤뱶(寃곗젙), ?ㅽ썑???먭쾺 紐⑤뱶(愿怨?濡??댁쁺',
        '留먰븯湲????⑺듃/媛먯젙??援щ텇???꾨떖?섍린',
        '?섎（ 留덇컧??罹먮┃???꾪솚 ?깃났 ?щ? 1嫄?湲곕줉?섍린'
      ]
    }
  };
  var mission = missionByResult[vibe.result] || missionByResult.neutral;
  var missionHtml = '<div style="margin-top:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px 12px 10px;text-align:left;">'
    + '<div style="font-size:.85rem;font-weight:900;color:#fde68a;margin-bottom:7px;">?렞 ' + mission.title + '</div>'
    + '<ul style="margin:0;padding-left:18px;color:#e5e7eb;font-size:.78rem;line-height:1.55;">'
    + mission.tasks.map(function(t){ return '<li style="margin-bottom:4px;">' + t + '</li>'; }).join('')
    + '</ul>'
    + '</div>';

  var html = '';

  if (vibe.result === 'teto') {
    var tetoQuantum = '<div style="margin-top:20px; background:rgba(0,0,0,0.25); border-radius:12px; padding:16px; text-align:left; border:1px solid rgba(255,107,107,0.2);">'
      + '<div style="font-weight:900; color:#fff; font-size:1.05rem; margin-bottom:12px; display:flex; align-items:center;"><span style="font-size:1.3rem; margin-right:6px;">?뙆</span> ?? 紐낅━ ?쇱씠?꾩뒪????λ떎?대툕</div>'
      + '<div style="margin-bottom:10px;"><div style="color:#ff6b6b; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?뮇 ?곗븷 ?ㅽ???/div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">遺덈룄? 吏곸쭊?? "???щ엺?대떎" ?띠쑝硫??욌뮘 ??媛由ш퀬 ?먮꼫吏瑜??잛븘遺볦뒿?덈떎. 媛뺥븳 由щ뱶? ?뚯떊?쇰줈 ?곷?諛⑹쓣 ?щ줈?≪?留? 吏덊닾? ?뚯쑀?뺤씠 ??컻?????덉쑝??媛?붿? ?듭젣?μ쓣 ??댁＜?몄슂.</div></div>'
      + '<div style="margin-bottom:10px;"><div style="color:#feca57; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?몦 ?ы쉶 ?앺솢 & 而ㅻ━??/div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">?怨좊궃 蹂댁뒪 湲곗쭏. 臾대━瑜??대걣怨??쒓퀎 ?뚰뙆瑜?利먭린???됰룞?뚯엯?덈떎. ?밸??뺤씠 ?곗뼱?섍퀬 援쏀엳??寃껋쓣 ?レ뼱???몃윭釉?硫붿씠而ㅺ? ?섍린???섏?留? 寃곌뎅 ??컻?곸씤 ?됰룞?κ낵 ?깃낵濡??ㅼ뒪濡쒕? 利앸챸???대뒗 ?ㅻ젰?먯엯?덈떎.</div></div>'
      + '<div><div style="color:#ff9ff3; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?뵦 異붿쿇 痍⑤?</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">?⑥씠???몃젅?대떇, 蹂듭떛, ?대씪?대컢 ?뚯퓼瑜? ?꾨땲硫???겕 寃뚯엫???섎뱶罹먮━ ??洹뱁븳???묒텞???먮꼫吏瑜?臾쇰━?곸쑝濡?肉쒖뼱?????덈뒗 媛뺣룄 ?믪? ?쒕룞???ㅽ듃?덉뒪 ?댁냼??吏곷뭇?낅땲??</div></div>'
      + '</div>';

    // 遺덇퐙 諛곌꼍 ?곗퐫
    var flames = '';
    ['?뮞','?뵦','??,'?뮙','?릮'].forEach(function(e, i) {
      flames += '<span class="hv-teto-flame" style="left:'+(8+i*18)+'%;top:'+(10+((i%3)*22))+'%;animation-delay:'+(.3*i)+'s;">' + e + '</span>';
    });
    html = '<div class="hv-teto-wrap">'
      + '<div class="hv-teto-bg">' + flames + '</div>'
      + '<div class="hv-teto-content">'

      + '<div class="hv-teto-title" style="display:flex; flex-direction:column; align-items:center; line-height:1.2; padding:10px 0;">'
      + '<div style="font-size:4.5rem; text-shadow:0 10px 20px rgba(0,0,0,0.5); display:inline-block; margin-bottom:10px;" class="wild-horse">?릮</div>'
      + '<span>??援ъ뿭 ?쇱깮留덈뒗<br>?섏빞 ??</span>'
      + '</div>'
      + '<div class="hv-teto-copy">??援ъ뿭??嫄곗튇 ?④껐, ?뚰넗?μ씠 ??컻?섍퀬 ?덉뒿?덈떎!</div>'
      + barHtml
      + '<div class="hv-reason-list">' + reasonsHtml + '</div>'
      + statsHtml
      + hormoneStoryHtml
      + missionHtml
      + tetoQuantum
      + '<div style="margin-top:16px;font-size:.78rem;color:rgba(255,255,255,.35);line-height:1.6; text-align:center;">鍮꾧쾪쨌愿??以묒떖???좉컯 ?ъ＜??媛뺥븳 異붿쭊?κ낵 ?밸??뺤쓣 ?섑??낅땲?? ?ㅻ쭔 紐⑤뱺 寃껋쓣 ?깅퀎쨌媛쒖씤 ?몄감濡??ㅼ뼇?섍쾶 ?댁꽍?섎뒗 ?щ??덈뒗 ?щ━ 肄섑뀗痢좎엯?덈떎 ?쁽</div>'
      + '</div></div>'
      + '<style>\n'
      + '@keyframes wildHorseGallop { 0% { transform: translateY(0) rotate(-5deg) scale(1.1); } 50% { transform: translateY(-15px) rotate(5deg) scale(1.2); } 100% { transform: translateY(0) rotate(-5deg) scale(1.1); } }\n'
      + '.wild-horse { animation: wildHorseGallop 0.6s infinite ease-in-out; }\n'
      + '</style>';
  } else if (vibe.result === 'egen') {
    var egenQuantum = '<div style="margin-top:20px; background:rgba(0,0,0,0.25); border-radius:12px; padding:16px; text-align:left; border:1px solid rgba(217,128,250,0.2);">'
      + '<div style="font-weight:900; color:#fff; font-size:1.05rem; margin-bottom:12px; display:flex; align-items:center;"><span style="font-size:1.3rem; margin-right:6px;">?뙆</span> ?? 紐낅━ ?쇱씠?꾩뒪????λ떎?대툕</div>'
      + '<div style="margin-bottom:10px;"><div style="color:#ff9ff3; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?뮇 ?곗븷 ?ㅽ???/div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">媛먯닔???쇳겕瑜?李띾뒗 泥쒖깮 濡쒕㎤?곗뒪?? ?ъ냼???덈튆怨?遺꾩쐞湲곌퉴吏 怨듬챸?섎ŉ ?ㅻŉ??땲?? ?곷?瑜??ㅼ젙?섍쾶 媛먯떥吏留? 洹몃쭔???곸쿂??源딄쾶 諛쏆쑝??蹂몄씤???좊━ 硫섑깉??瑗?蹂대벉?댁＜?몄슂.</div></div>'
      + '<div style="margin-bottom:10px;"><div style="color:#48dbfb; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?몦 ?ы쉶 ?앺솢 & 而ㅻ━??/div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">理쒓퀬??? ?뚮젅?댁뼱?댁옄 ?щ줎??二쇰룄?섎뒗 怨듦컧 ?붿젙. ?좎뿰???몃?怨??ъ꽭???쇱뒪濡??대뵒?쒕뱺 ?щ옉諛쏆뒿?덈떎. ?⑺듃 ??뻾蹂대떎???щ엺??留덉쓬???붿튂??湲고쉷, ?쒕퉬?? ?덉닠, ?щ━ 遺꾩빞?먯꽌 ?뺣룄?곸씤 議댁옱媛먯쓣 蹂댁엯?덈떎.</div></div>'
      + '<div><div style="color:#1dd1a1; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?렓 異붿쿇 痍⑤?</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">?대㈃??誘명븰??梨꾩슦???쒕룞. ?ロ뵆?덉씠??移댄럹 ?ъ뼱, ?ㅼ씠?대━ 袁몃?湲? 媛먯꽦 ?ъ쭊 珥ъ쁺, ?뚯븙 媛먯긽, 諛섎젮?숇Ъ/諛섎젮?앸Ъ 媛袁멸린 ??珥됱큺???꾨궇濡쒓렇 媛먯꽦??留덉쓬猿?諛쒖궛??蹂댁꽭??</div></div>'
      + '</div>';

    var sparkles = '';
    ['??,'?뙵','?뮟','?쫳','?뮑'].forEach(function(e, i) {
      sparkles += '<span class="hv-egen-sparkle" style="left:'+(6+i*17)+'%;top:'+(8+((i%3)*25))+'%;animation-delay:'+(.5*i)+'s;animation-duration:'+(1.8+i*.4)+'s;">' + e + '</span>';
    });
    html = '<div class="hv-egen-wrap">'
      + '<div class="hv-egen-bg">' + sparkles + '</div>'
      + '<div class="hv-egen-content">'

      + '<div class="hv-egen-title">媛먯꽦???뚮룄泥섎읆<br>諛?ㅼ삤??以??뙄</div>'
      + '<div class="hv-egen-copy">媛먯꽦???뚮룄瑜?移섎꽕?? ?먭쾺 吏?섍? ?쒕룄 珥덇낵?낅땲??</div>'
      + barHtml
      + '<div class="hv-reason-list">' + reasonsHtml + '</div>'
      + statsHtml
      + hormoneStoryHtml
      + missionHtml
      + egenQuantum
      + '<div style="margin-top:16px;font-size:.78rem;color:rgba(255,255,255,.35);line-height:1.6; text-align:center;">?몄꽦쨌?앹긽 以묒떖 ?ъ＜???섏슜?깃낵 媛먯꽦 ?쒗쁽???뱀쭠?낅땲?? ?깅퀎쨌媛쒖씤 ?몄감濡??ㅼ뼇?섍쾶 ?댁꽍?섎뒗 ?щ??덈뒗 ?щ━ 肄섑뀗痢좎엯?덈떎 ?삃</div>'
      + '</div></div>';
  } else {
    var neutralQuantum = '<div style="margin-top:20px; background:rgba(0,0,0,0.25); border-radius:12px; padding:16px; text-align:left; border:1px solid rgba(78,205,196,0.2);">'
      + '<div style="font-weight:900; color:#fff; font-size:1.05rem; margin-bottom:12px; display:flex; align-items:center;"><span style="font-size:1.3rem; margin-right:6px;">?뙆</span> ?? 紐낅━ ?쇱씠?꾩뒪????λ떎?대툕</div>'
      + '<div style="margin-bottom:10px;"><div style="color:#ff6b6b; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?뮇 ?곗븷 ?ㅽ???/div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">諛?뱀쓽 ?⑥? 怨좎닔. ?뚮줈???고봽?섍쾶 由щ뱶?섍퀬, ?뚮줈???щⅤ瑜??뱀븘?쒕뒗 硫?고뵆?덉씠?댁엯?덈떎. ?곹솴???곕씪 ?뚰넗? ?먭쾺???꾩궡湲곕? 怨⑤씪 爰쇰궡 ?곕뒗 移섎챸?곸씠怨??덉륫 遺덇??ν븳 留ㅻ젰??吏?붿뒿?덈떎.</div></div>'
      + '<div style="margin-bottom:10px;"><div style="color:#4ecdc4; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?몦 ?ы쉶 ?앺솢 & 而ㅻ━??/div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">? ???쇳럺???ㅽ솢?? 瑗곕? ?곸궗 ?욎뿉?쒕뒗 ?좎뿰?섍쾶 ?泥섑븯怨? ?뚯떖??????욎뿉?쒕뒗 湲곕?怨??띠? ?ъ쭅??由щ뜑??쓣 蹂댁뿬以띾땲?? 洹밸떒?쇰줈 移섏슦移섏? ?딅뒗 ?덈쵖??諛몃윴?ㅻ줈 ?대뵒?쒕뱺 ?섏쁺諛쏅뒗 ?먯씠?ㅼ엯?덈떎.</div></div>'
      + '<div><div style="color:#feca57; font-size:0.85rem; font-weight:800; margin-bottom:4px;">?뽳툘 異붿쿇 痍⑤?</div><div style="font-size:0.85rem; color:#f1f2f6; line-height:1.5;">?뺢퀬 ?볦? ?≫븰?ㅼ떇 而щ젆?? ?쇱옄 議곗슜??梨낆쓣 ?쎈떎媛???ㅼ쓬 ?좎? 移쒓뎄?ㅺ낵 ?쒓컯?쇰줈 ?≫떚鍮꾪떚瑜??좊굹???? ?숈쟻???ㅽ룷痢좎? ?뺤쟻??痍⑤?瑜?酉뷀럹泥섎읆 ?먯쑀濡?쾶 ?욎뼱 利먭만 ??媛???됰났?⑸땲??</div></div>'
      + '</div>';

    html = '<div class="hv-neutral-wrap">'
      + '<div class="hv-neutral-content">'

      + '<div class="hv-neutral-title">?뚰넗???먭쾺???꾨땶<br>萸붽? ?낇듅???ъ＜ ??</div>'
      + '<div class="hv-neutral-copy" style="margin-bottom:18px;">"?뱀떊? 洹몃깷 ?밸퀎??耳?댁뒪?낅땲?? 移댄뀒怨좊━濡??섎닃 ?섍? ?놁뼱???ㅇ"<br>?섎굹???깊뼢??移섏슦移섏? ?딅뒗 洹좏삎 ?≫엺 ?먮꼫吏瑜?蹂댁쑀 以?</div>'
      + barHtml
      + '<div class="hv-reason-list">' + reasonsHtml + '</div>'
      + statsHtml
        + hormoneStoryHtml
      + missionHtml
      + neutralQuantum
      + '</div></div>';
  }

  target.innerHTML = html;

  // 諛??좊땲硫붿씠??(DOM ?쎌엯 ???쎄컙 ?쒕젅??
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
      
      if(subtitle) subtitle.innerHTML = "?깆슫 醫뚰몴瑜??뺣젹?섎뒗 以?.. <span style='color:#bfd8ff; font-weight:600;'>(Constellation Mapping)</span>";
      
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
  if(sub) sub.innerHTML = "?ㅻ뒛??<span style='color:#ffffff; font-weight:700;'>蹂꾨튆 紐낅━ ?몄궗?댄듃</span>媛 ?꾩꽦?섏뿀?듬땲??";

  let p = window.quantumProfile;
  let today = new Date();
  let todayGZ = window.getGanZhiForDate ? window.getGanZhiForDate(today.getFullYear(), today.getMonth()+1, today.getDate(), today.getHours()) : null;

  let dGan = todayGZ ? todayGZ.g : ((p && p.d && p.d.g) ? p.d.g : '訝?);
  let dJi  = todayGZ ? todayGZ.j : ((p && p.d && p.d.j) ? p.d.j : '渦?);

  const ganNames = {'??:'???섎Т','阿?:'?붿큹','訝?:'?쒖뼇','訝?:'珥쏅텋','??:'????,'藥?:'?됱빞','佯?:'諛붿쐞/泥?,'渦?:'蹂댁꽍','鶯?:'??諛붾떎','??:'鍮??댁뒳'};
  const jiNames = {'耶?:'?⑥븮/臾?,'訝?:'寃⑥슱 ??,'野?:'遊꾩쓽 ?쒖옉','??:'遊꾩쓽 ?덉젙','渦?:'遊꾩쓽 ??,'藥?:'?щ쫫 遺?,'??:'?щ쫫 ?덉젙','??:'?щ쫫 ??,'??:'媛???쒖옉','??:'媛???덉젙','??:'媛????,'雅?:'寃⑥슱 ?쒖옉'};
  
  const ganDesc = ganNames[dGan] || '?섎뒛??湲곗슫';
  const jiDesc = jiNames[dJi] || '?낆쓽 湲곗슫';

  // ?? 移대뱶 ?룸㈃???ㅽ뻾 肄섑뀗痢?梨꾩슦湲???
  var todayEl = (window.GAN && window.GAN[dGan]) ? window.GAN[dGan].e : 'earth';
  var elEmojis = {wood:'?뙼', fire:'?뵦', earth:'?뙊', metal:'??, water:'?뮛'};
  var elNames = {wood:'紐??? ?깆슫', fire:'???? ?깆슫', earth:'???? ?깆슫', metal:'湲??? ?깆슫', water:'??麗? ?깆슫'};
  var elDescs = {
    wood: '?앸챸?κ낵 ?깆옣??湲곗슫??n?ㅻ뒛 ?섎（瑜?媛먯떥怨??덉뒿?덈떎.\n?덈줈???쒖옉???좊━???좎엯?덈떎.',
    fire:  '?댁젙怨?鍮쏆쓽 ?먮꼫吏媛\n???몄긽??諛앺엳???좎엯?덈떎.\n?곴레?곸쑝濡??됰룞?섏꽭??',
    earth: '?덉젙怨??ъ슜??湲곗슫??n?吏泥섎읆 ?좊뱺??諛쏆퀜以띾땲??\n?좊ː瑜??볤린 醫뗭? ?좎엯?덈떎.',
    metal: '寃곕떒怨??뺤젣??湲곗슫??n?좎뭅濡?쾶 鍮쏅굹???좎엯?덈떎.\n?듭떖??吏묒쨷?섏꽭??',
    water: '吏?쒖? ?좎뿰?⑥쓽 ?뚮룞??n源딄퀬 怨좎슂?섍쾶 ?먮Ⅴ???좎엯?덈떎.\n?대㈃???뚮━??洹 湲곗슱?댁꽭??'
  };

  var qBack = document.getElementById("qCardBack");
  if(qBack) {
    qBack.className = 'quantum-card-back el-' + todayEl;
    var emojiEl = document.getElementById("qBackEmoji");
    var nameEl = document.getElementById("qBackElName");
    var ganJiEl = document.getElementById("qBackGanJi");
    var descEl = document.getElementById("qBackDesc");
    if(emojiEl) emojiEl.textContent = elEmojis[todayEl] || '??;
    if(nameEl) nameEl.textContent = elNames[todayEl] || '?ㅽ뻾';
    if(ganJiEl) ganJiEl.textContent = dGan + ' 쨌 ' + dJi;
    if(descEl) descEl.textContent = elDescs[todayEl] || '?ㅻ뒛???ㅽ뻾 ?먮꼫吏';
  }

  // 移대뱶 ?뚮┰
  const card = document.getElementById("qCardEl");
  if(card) card.className += ' flip-it';

  if(document.getElementById("qDayGan")) document.getElementById("qDayGan").innerText = dGan;
  if(document.getElementById("qDayJi")) document.getElementById("qDayJi").innerText = dJi;
  if(document.getElementById("qDayGanDesc")) document.getElementById("qDayGanDesc").innerText = ganDesc;
  if(document.getElementById("qDayJiDesc")) document.getElementById("qDayJiDesc").innerText = jiDesc;

  // ?ㅽ뻾 愿怨?怨꾩궛 (??洹? ??todayEl? ?꾩뿉???대? ?좎뼵??  var birthGan = (p && p.d && p.d.g) ? p.d.g : '??;
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
      overall: '?ㅻ뒛? ?뱀떊??蹂몄썝??蹂꾨튆???ㅻŉ?쒕뒗 ?좎엯?덈떎. 硫덉톬???먮쫫???ㅼ떆 遺?쒕읇寃??吏곸엯?덈떎.',
      love: '愿怨꾩쓽 ?⑤룄媛 ?먯뿰?ㅻ읇寃??щ씪媛묐땲?? 吏㏃븘??吏꾩떖???닿릿 ?쒕쭏?붽? ???몃┝??留뚮벊?덈떎.',
      money: '?묒? 湲고쉶媛 ?ㅼ젣 ?깃낵濡??댁뼱吏湲??쎌뒿?덈떎. ?듭닕???곸뿭?먯꽌 ?덉젙?곸씤 ?섑솗???몃━?몄슂.',
      action: '誘몃（???쇱쓣 ?섎굹留??뺤떎???쒖옉?섏꽭?? 泥??ㅽ뻾???ㅻ뒛???됱슫 ?뚮줈瑜??쎈땲??'
    },
    gen_out: {
      overall: '?뱀떊???먮꼫吏媛 二쇰???鍮쏆쓣 ?섎늻???좎엯?덈떎. 踰좏뫜 留뚰겮 醫뗭? ?먮쫫???ㅼ떆 ?뚯븘?듬땲??',
      love: '湲곕떎由ш린蹂대떎 癒쇱? ?ㅼ젙?섍쾶 ?먯쓣 ?대??몄슂. ?뱀떊??諛곕젮媛 愿怨꾩쓽 源딆씠瑜??ㅼ썎?덈떎.',
      money: '吏異쒖씠 ?????덉쑝??媛移섏? ?곗꽑?쒖쐞瑜??먭??섏꽭?? ?섎? ?덈뒗 ?ъ옄留??④린硫??댁씠 ?댁븘?⑸땲??',
      action: '?꾩????꾩슂???щ엺??梨숆꺼蹂댁꽭?? 怨듦컧怨?吏?먯씠 怨??뱀떊??媛쒖슫 ?ъ씤?몄엯?덈떎.'
    },
    ke_in: {
      overall: '?몃? ?뚮룞??媛뺥븯寃?諛?ㅼ? 由щ벉???붾뱾由????덉뒿?덈떎. ?띾룄瑜???텛硫??ㅽ엳???덉젙??鍮좊Ⅴ寃?李얠븘?듬땲??',
      love: '?덈???諛섏쓳蹂대떎 寃쎌껌???좊━?⑸땲?? ?듭쓣 ?쒕몢瑜댁? 留먭퀬 媛먯젙???뺣룉??????뷀븯?몄슂.',
      money: '??寃곗젙? ?섎（留???텛???몄씠 ?덉쟾?⑸땲?? 怨꾩빟, 寃곗젣, ?쒕챸? ?댁쨷 ?먭????꾩슂?⑸땲??',
      action: '泥댄겕由ъ뒪?몃줈 由ъ뒪?щ? 以꾩씠?몄슂. ?ㅻ뒛???밸??섎뒗 怨쇨컧?⑤낫???뺥솗?⑥엯?덈떎.'
    },
    ke_out: {
      overall: '?뱀떊??異붿쭊?μ씠 ?꾨㈃???쒕뒗 ?좎엯?덈떎. ?ㅻ쭔 媛뺥븳 ?띾룄 ?띿뿉?쒕룄 洹좏삎 媛먭컖???껋? ?딅뒗 寃껋씠 ?듭떖?낅땲??',
      love: '二쇰룄沅뚯쓣 ?〓뜑?쇰룄 留먰닾??遺?쒕읇寃?議곗쑉?섏꽭?? ?곕쑜???쒗쁽??愿怨꾩쓽 留덉같??以꾩엯?덈떎.',
      money: '?묒긽?κ낵 ?먮떒?μ씠 醫뗭븘 ?ㅼ냽??梨숆린湲?醫뗭뒿?덈떎. 議곌굔??紐낇솗??湲곕줉?섎㈃ ?깃낵媛 而ㅼ쭛?덈떎.',
      action: '留됲엺 ?쇱쓣 ?뚰뙆?섎릺 ?낆＜?섏? 留덉꽭?? 二쇰?怨??명씉??留욎텧?섎줉 寃곌낵媛 ?⑤떒?댁쭛?덈떎.'
    },
    same: {
      overall: '?뱀떊怨??ㅻ뒛??湲곗슫??媛숈? ?뚯옣?먯꽌 怨듬챸?⑸땲?? ?먯떊媛먭낵 ?ㅽ뻾?μ씠 ?④퍡 ?곸듅?섎뒗 ?좎엯?덈떎.',
      love: '寃곗씠 留욌뒗 ?щ엺怨??곌껐?섍린 ?쎌뒿?덈떎. ?몄븞??????띿뿉??愿怨꾧? 鍮좊Ⅴ寃?媛源뚯썙吏묐땲??',
      money: '寃쎌웳 ?띿뿉?쒕룄 議댁옱媛먯씠 ?댁븘?⑸땲?? ?뱀떊??媛뺤젏??遺꾨챸???쒕윭?대㈃ 湲고쉶媛 遺숈뒿?덈떎.',
      action: '?꾨줈?앺듃 ?쒖옉?대굹 ?ㅽ듃?뚰궧???먮꼫吏瑜?吏묒쨷?섏꽭?? ?ㅻ뒛???좏깮???ㅼ쓬 ?먮쫫???좎젏?⑸땲??'
    },
    neutral: {
      overall: '???뚮룄 ?놁씠 ?덉젙?곸쑝濡??먮Ⅴ???좎엯?덈떎. 湲곕낯 猷⑦떞??吏?ㅻ뒗 寃껊쭔?쇰줈??異⑸텇??醫뗭? ?댁엯?덈떎.',
      love: '?붾젮???대깽?몃낫??袁몄???諛곕젮媛 ?④낵?곸엯?덈떎. ?묒?留??뺥솗??愿?ъ씠 ?좊ː瑜?留뚮벊?덈떎.',
      money: '?뺤옣蹂대떎 愿由ъ뿉 珥덉젏???먯꽭?? 吏異?援ъ“? ?먯궛 諛곗튂瑜??뺣━?섎㈃ ?먮쫫??醫뗭븘吏묐땲??',
      action: '諛由????섎굹瑜??앸궡硫?由щ벉???뚮났?섏꽭?? ?묒? ?꾩꽦???댁씪??異붿쭊?μ쓣 留뚮벊?덈떎.'
    }
  };
  
  var msg = relMsg[rel] || relMsg.neutral;
  let explainHtml = `?뱀떊???ㅻ뒛 ?섎（??<strong>${ganDesc}</strong>??湲곗슫怨?<strong>${jiDesc}</strong>???먮꼫吏媛 留뚮굹 ?밸퀎???뚮룞???뺤꽦?⑸땲??<br><br><span style="color:#f8fafc;">${msg.overall}</span>`;

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
