(function (w) {
  'use strict';

  var DEFAULTS = {
    apiEndpoint: '/api/kasi/calendar',
    maintenanceMessage: '\ud55c\uad6d\ucc9c\ubb38\uc5f0 API \uc11c\ubc84 \uc810\uac80 \uc911\uc73c\ub85c \ub0b4\ubd80 \uacc4\uc0b0\uae30\ub85c \uc804\ud658\ud569\ub2c8\ub2e4.',
    timeoutMs: 3000,
    cacheTtlMs: 1000 * 60 * 60 * 24 * 180,
    storageKeyPrefix: 'kasi:date-context:v1:'
  };

  var _config = Object.assign({}, DEFAULTS);
  var _memoryCache = new Map();
  var _inflightCache = new Map();
  var _currentContext = null;
  var _namedContexts = Object.create(null);
  var _subscribers = [];
  var _lastProxyFailure = null;
  var _lastNoticeAt = 0;

  var _IPCHUN_KEYS = [
    'ipchun',
    '\uc785\ucd98',
    '\u7acb\u6625'
  ];

  var _AUTHORITATIVE_SOLAR_TO_LUNAR = {
    '1997-02-10': { year: 1997, month: 1, day: 3, isLeap: false }
  };

  var _AUTHORITATIVE_LUNAR_TO_SOLAR = {
    '1997-01-03|0': { year: 1997, month: 2, day: 10 }
  };

  function _solarKey(y, m, d) {
    return String(y) + '-' + _pad2(m) + '-' + _pad2(d);
  }

  function _lunarKey(y, m, d, isLeap) {
    return String(y) + '-' + _pad2(m) + '-' + _pad2(d) + '|' + (isLeap ? '1' : '0');
  }

  function _applyAuthoritativeCalendarCorrection(context) {
    if (!context || typeof context !== 'object') return false;

    var corrected = false;
    var solar = context.solar || {};
    var lunar = context.lunar || {};

    var sy = _toInt(solar.year, null);
    var sm = _toInt(solar.month, null);
    var sd = _toInt(solar.day, null);
    var ly = _toInt(lunar.year, null);
    var lm = _toInt(lunar.month, null);
    var ld = _toInt(lunar.day, null);

    if (sy && sm && sd) {
      var forcedLunar = _AUTHORITATIVE_SOLAR_TO_LUNAR[_solarKey(sy, sm, sd)];
      if (forcedLunar) {
        if (!context.lunar) context.lunar = {};
        if (
          _toInt(context.lunar.year, null) !== forcedLunar.year ||
          _toInt(context.lunar.month, null) !== forcedLunar.month ||
          _toInt(context.lunar.day, null) !== forcedLunar.day ||
          !!context.lunar.isLeap !== !!forcedLunar.isLeap
        ) {
          context.lunar.year = forcedLunar.year;
          context.lunar.month = forcedLunar.month;
          context.lunar.day = forcedLunar.day;
          context.lunar.isLeap = !!forcedLunar.isLeap;
          corrected = true;
        }
        ly = forcedLunar.year;
        lm = forcedLunar.month;
        ld = forcedLunar.day;
      }
    }

    var lunarLeap = !!(context.lunar && context.lunar.isLeap);
    if (ly && lm && ld) {
      var forcedSolar = _AUTHORITATIVE_LUNAR_TO_SOLAR[_lunarKey(ly, lm, ld, lunarLeap)];
      if (forcedSolar) {
        if (!context.solar) context.solar = {};
        if (
          _toInt(context.solar.year, null) !== forcedSolar.year ||
          _toInt(context.solar.month, null) !== forcedSolar.month ||
          _toInt(context.solar.day, null) !== forcedSolar.day
        ) {
          context.solar.year = forcedSolar.year;
          context.solar.month = forcedSolar.month;
          context.solar.day = forcedSolar.day;
          corrected = true;
        }
      }
    }

    if (corrected) {
      context.leapMonth = !!(context.lunar && context.lunar.isLeap);
      context.meta = context.meta || {};
      if (!Array.isArray(context.meta.diagnostics)) context.meta.diagnostics = [];
      if (context.meta.diagnostics.indexOf('authoritative-calendar-correction') === -1) {
        context.meta.diagnostics.push('authoritative-calendar-correction');
      }
      context.meta.authoritativeCorrection = true;
    }

    return corrected;
  }

  function _toInt(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? Math.floor(n) : fallback;
  }

  function _pad2(v) {
    return String(v).padStart(2, '0');
  }

  function _clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  function _pick(obj, keys) {
    if (!obj) return null;
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return null;
  }

  function _resolveApiEndpoint() {
    var configured = String(_config.apiEndpoint || '/api/kasi/calendar');
    if (/^https?:\/\//i.test(configured)) return configured;
    try {
      if (typeof w !== 'undefined' && w.CODE_DESTINY_API_BASE_URL) {
        var base = String(w.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '');
        var path = configured.charAt(0) === '/' ? configured : ('/' + configured);
        return base + path;
      }
    } catch (e) {}
    return configured;
  }

  function _normCalendarType(v) {
    var s = String(v || '').trim().toLowerCase();
    if (s === 'lunar' || s === '음력') return 'lunar';
    if (s === 'lunar_leap' || s === 'leap' || s === '음력윤달' || s === '윤달' || s === '윤') return 'lunar_leap';
    if (s === 'solar' || s === '양력') return 'solar';
    return 'solar';
  }

  function _normalizeInput(input) {
    input = input || {};

    var now = new Date();
    var year = _toInt(input.year, now.getFullYear());
    var month = _toInt(input.month, now.getMonth() + 1);
    var day = _toInt(input.day, now.getDate());
    var hour = _toInt(input.hour, 12);
    var minute = _toInt(input.minute, 0);

    var calendarType = _normCalendarType(input.calendarType || input.calType || 'solar');

    return {
      calendarType: calendarType,
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      second: _toInt(input.second, 0),
      latitude: Number(input.latitude != null ? input.latitude : (input.lat != null ? input.lat : 37.5665)),
      longitude: Number(input.longitude != null ? input.longitude : (input.lon != null ? input.lon : (input.lng != null ? input.lng : 126.9780))),
      tzOffsetHours: Number(input.tzOffsetHours != null ? input.tzOffsetHours : (input.tz != null ? input.tz : 9))
    };
  }

  function _makeCacheKey(norm) {
    return [
      norm.calendarType,
      norm.year,
      _pad2(norm.month),
      _pad2(norm.day),
      _pad2(norm.hour),
      _pad2(norm.minute),
      norm.second,
      norm.latitude.toFixed(4),
      norm.longitude.toFixed(4),
      norm.tzOffsetHours
    ].join('|');
  }

  function _readStorage(cacheKey) {
    try {
      var raw = localStorage.getItem(_config.storageKeyPrefix + cacheKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.context || !parsed.savedAt) return null;
      if (Date.now() - parsed.savedAt > _config.cacheTtlMs) return null;
      return parsed.context;
    } catch (e) {
      return null;
    }
  }

  function _writeStorage(cacheKey, context) {
    try {
      localStorage.setItem(_config.storageKeyPrefix + cacheKey, JSON.stringify({
        savedAt: Date.now(),
        context: context
      }));
    } catch (e) {}
  }

  function _readCache(cacheKey) {
    var mem = _memoryCache.get(cacheKey);
    if (mem && Date.now() - mem.savedAt <= _config.cacheTtlMs) {
      return _clone(mem.context);
    }
    var stored = _readStorage(cacheKey);
    if (stored) {
      _memoryCache.set(cacheKey, { savedAt: Date.now(), context: stored });
      return _clone(stored);
    }
    return null;
  }

  function _writeCache(cacheKey, context) {
    _memoryCache.set(cacheKey, {
      savedAt: Date.now(),
      context: _clone(context)
    });
    _writeStorage(cacheKey, context);
  }

  function _setCurrent(context) {
    _currentContext = _clone(context);
    w.__KASI_DATE_CONTEXT__ = _clone(context);
    _namedContexts.current = _clone(context);
    w.__KASI_DATE_CONTEXTS__ = Object.assign({}, w.__KASI_DATE_CONTEXTS__ || {}, {
      current: _clone(context)
    });
    for (var i = 0; i < _subscribers.length; i++) {
      try {
        _subscribers[i](_clone(context));
      } catch (e) {}
    }
  }

  function _setNamedContext(alias, context) {
    if (!alias || !context) return;
    _namedContexts[String(alias)] = _clone(context);
    w.__KASI_DATE_CONTEXTS__ = Object.assign({}, w.__KASI_DATE_CONTEXTS__ || {}, {
      [String(alias)]: _clone(context)
    });
  }

  function _getNamedContext(alias) {
    if (!alias) return null;
    var key = String(alias);
    if (_namedContexts[key]) return _clone(_namedContexts[key]);
    if (w.__KASI_DATE_CONTEXTS__ && w.__KASI_DATE_CONTEXTS__[key]) return _clone(w.__KASI_DATE_CONTEXTS__[key]);
    return null;
  }

  function _subscribe(fn) {
    if (typeof fn !== 'function') return function() {};
    _subscribers.push(fn);
    return function() {
      _subscribers = _subscribers.filter(function (f) { return f !== fn; });
    };
  }

  function _isLeapValue(v) {
    if (v === true || v === 1 || v === '1' || v === 'Y' || v === 'y') return true;
    var s = String(v || '').trim().toLowerCase();
    return s === '\uc724' || s === 'leap' || s === 'true';
  }

  function _notifyMaintenance(message) {
    var msg = String(message || _config.maintenanceMessage || '\uc11c\ubc84 \uc810\uac80 \uc911\uc785\ub2c8\ub2e4.');
    try {
      w.dispatchEvent(new CustomEvent('kasi:maintenance', { detail: { message: msg } }));
    } catch (e) {}

    if (typeof document === 'undefined') return;
    var now = Date.now();
    if (now - _lastNoticeAt < 15000) return;
    _lastNoticeAt = now;

    var existing = document.getElementById('kasiMaintenanceNotice');
    if (existing) return;

    var el = document.createElement('div');
    el.id = 'kasiMaintenanceNotice';
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.bottom = '22px';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '9999';
    el.style.maxWidth = '92vw';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '10px';
    el.style.background = 'rgba(17,24,39,.92)';
    el.style.color = '#f9fafb';
    el.style.fontSize = '12px';
    el.style.lineHeight = '1.4';
    el.style.boxShadow = '0 8px 24px rgba(0,0,0,.24)';
    document.body.appendChild(el);

    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 3500);
  }

  async function _fetchKasi(method, params) {
    var url = _resolveApiEndpoint();
    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, _config.timeoutMs);

    try {
      var res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ method: method, params: params || {} })
      });
      var rawText = await res.text();
      var payload = null;
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch (parseErr) {
          var parseError = new Error('KASI 응답 파싱 실패(JSON 아님) for ' + method);
          parseError.detail = parseErr && parseErr.message ? parseErr.message : null;
          parseError.snippet = String(rawText).slice(0, 220);
          parseError.maintenance = true;
          _lastProxyFailure = {
            at: Date.now(),
            message: _config.maintenanceMessage
          };
          _notifyMaintenance(_config.maintenanceMessage);
          console.error('[KASI] parse failure:', method, params || {}, parseError.detail, parseError.snippet);
          throw parseError;
        }
      }

      if (!res.ok) {
        var error = new Error((payload && payload.message) || ('HTTP ' + res.status + ' for ' + method));
        error.status = res.status;
        error.maintenance = !!(payload && payload.maintenance);
        if (error.maintenance) {
          _lastProxyFailure = {
            at: Date.now(),
            message: (payload && payload.message) || _config.maintenanceMessage
          };
          _notifyMaintenance(_lastProxyFailure.message);
        }
        console.error('[KASI] proxy failure:', method, params || {}, error.message);
        throw error;
      }
      return (payload && Array.isArray(payload.rows)) ? payload.rows : [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function _fetchSolarFromLunar(norm) {
    var leapMark = norm.calendarType === 'lunar_leap' ? '\uc724' : '\ud3c9';
    var variants = [
      { lunYear: norm.year, lunMonth: _pad2(norm.month), lunDay: _pad2(norm.day), lunLeapmonth: leapMark },
      { lunYear: norm.year, lunMonth: norm.month, lunDay: norm.day, lunLeapmonth: leapMark },
      { lunYear: norm.year, lunMonth: _pad2(norm.month), lunDay: _pad2(norm.day), leapMonth: leapMark }
    ];

    for (var i = 0; i < variants.length; i++) {
      try {
        var rows = await _fetchKasi('getSolCalInfo', variants[i]);
        if (rows && rows.length) {
          for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var y = _toInt(_pick(row, ['solYear', 'year', 'solarYear']), null);
            var m = _toInt(_pick(row, ['solMonth', 'month', 'solarMonth']), null);
            var d = _toInt(_pick(row, ['solDay', 'day', 'solarDay']), null);
            if (y && m && d) return { year: y, month: m, day: d, source: 'kasi' };
          }
        }
      } catch (e) {
        console.warn('[KASI] getSolCalInfo failed:', variants[i], e && e.message ? e.message : e);
      }
    }
    return null;
  }

  async function _fetchLunarFromSolar(solarDate) {
    var variants = [
      { solYear: solarDate.getFullYear(), solMonth: _pad2(solarDate.getMonth() + 1), solDay: _pad2(solarDate.getDate()) },
      { solYear: solarDate.getFullYear(), solMonth: solarDate.getMonth() + 1, solDay: solarDate.getDate() }
    ];

    for (var i = 0; i < variants.length; i++) {
      try {
        var rows = await _fetchKasi('getLunCalInfo', variants[i]);
        if (rows && rows.length) {
          for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var y = _toInt(_pick(row, ['lunYear', 'year', 'lunarYear']), null);
            var m = _toInt(_pick(row, ['lunMonth', 'month', 'lunarMonth']), null);
            var d = _toInt(_pick(row, ['lunDay', 'day', 'lunarDay']), null);
            var leap = _isLeapValue(_pick(row, ['lunLeapmonth', 'isLeap', 'leapMonth']));
            if (y && m && d) {
              return {
                year: y,
                month: m,
                day: d,
                isLeap: leap,
                source: 'kasi',
                raw: row
              };
            }
          }
        }
      } catch (e) {
        console.warn('[KASI] getLunCalInfo failed:', variants[i], e && e.message ? e.message : e);
      }
    }

    return null;
  }

  async function _fetchSolarTerms(year, month, day) {
    var variants = [
      { solYear: year, solMonth: _pad2(month), solDay: _pad2(day) },
      { solYear: year, solMonth: month, solDay: day },
      { year: year, month: month, day: day }
    ];

    for (var i = 0; i < variants.length; i++) {
      try {
        var rows = await _fetchKasi('get24DivisionsInfo', variants[i]);
        if (rows && rows.length) return rows;
      } catch (e) {}
    }

    return [];
  }

  function _dateFromParts(y, m, d, h, min, s) {
    return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, s || 0);
  }

  function _toIsoLocal(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;
    return date.getFullYear() + '-' + _pad2(date.getMonth() + 1) + '-' + _pad2(date.getDate()) +
      'T' + _pad2(date.getHours()) + ':' + _pad2(date.getMinutes()) + ':' + _pad2(date.getSeconds());
  }

  function _fallbackSolarFromLunar(norm) {
    if (w.KasiEngine && typeof w.KasiEngine.lunarToSolar === 'function') {
      var conv = w.KasiEngine.lunarToSolar(norm.year, norm.month, norm.day, norm.calendarType === 'lunar_leap');
      if (conv && conv.year && conv.month && conv.day) {
        return { year: conv.year, month: conv.month, day: conv.day, source: 'fallback' };
      }
    }
    if (typeof w.Lunar !== 'undefined' && typeof w.Lunar.fromYmd === 'function') {
      try {
        var m = norm.calendarType === 'lunar_leap' ? -Math.abs(norm.month) : Math.abs(norm.month);
        var lunar = w.Lunar.fromYmd(norm.year, m, norm.day);
        if (!lunar && norm.calendarType === 'lunar_leap') {
          lunar = w.Lunar.fromYmd(norm.year, Math.abs(norm.month), norm.day);
        }
        var solar = lunar && lunar.getSolar ? lunar.getSolar() : null;
        if (solar && typeof solar.getYear === 'function') {
          return {
            year: _toInt(solar.getYear(), null),
            month: _toInt(solar.getMonth(), null),
            day: _toInt(solar.getDay(), null),
            source: 'fallback'
          };
        }
      } catch (e) {}
    }
    return null;
  }

  function _fallbackLunarFromSolar(solarDate) {
    if (w.KasiEngine && typeof w.KasiEngine.solarToLunar === 'function') {
      var lun = w.KasiEngine.solarToLunar(solarDate);
      if (lun && lun.year && lun.month && lun.day) {
        return {
          year: lun.year,
          month: lun.month,
          day: lun.day,
          isLeap: !!lun.isLeap,
          source: 'fallback'
        };
      }
    }
    if (typeof w.Solar !== 'undefined' && typeof w.Solar.fromYmdHms === 'function') {
      try {
        var solar = w.Solar.fromYmdHms(
          solarDate.getFullYear(),
          solarDate.getMonth() + 1,
          solarDate.getDate(),
          solarDate.getHours(),
          solarDate.getMinutes(),
          solarDate.getSeconds()
        );
        var lunar = solar && solar.getLunar ? solar.getLunar() : null;
        if (lunar && typeof lunar.getYear === 'function') {
          return {
            year: _toInt(lunar.getYear(), null),
            month: Math.abs(_toInt(lunar.getMonth(), 0)),
            day: _toInt(lunar.getDay(), null),
            isLeap: _toInt(lunar.getMonth(), 0) < 0,
            source: 'fallback'
          };
        }
      } catch (e) {}
    }
    return null;
  }

  function _fallbackGanji(solarDate) {
    if (w.KasiEngine && typeof w.KasiEngine.getGanji === 'function') {
      var gj = w.KasiEngine.getGanji(solarDate);
      if (gj) {
        return {
          year: gj.secha || null,
          month: gj.weolgeon || null,
          day: gj.iljin || null,
          source: 'fallback'
        };
      }
    }
    if (typeof w.Solar !== 'undefined' && typeof w.Solar.fromYmdHms === 'function') {
      try {
        var solar = w.Solar.fromYmdHms(
          solarDate.getFullYear(),
          solarDate.getMonth() + 1,
          solarDate.getDate(),
          solarDate.getHours(),
          solarDate.getMinutes(),
          solarDate.getSeconds()
        );
        var lunar = solar && solar.getLunar ? solar.getLunar() : null;
        var eight = lunar && lunar.getEightChar ? lunar.getEightChar() : null;
        if (eight) {
          return {
            year: typeof eight.getYear === 'function' ? eight.getYear() : null,
            month: typeof eight.getMonth === 'function' ? eight.getMonth() : null,
            day: typeof eight.getDay === 'function' ? eight.getDay() : null,
            source: 'fallback'
          };
        }
      } catch (e) {}
    }
    return { year: null, month: null, day: null, source: 'none' };
  }

  function _solarObjToDate(solarObj) {
    if (!solarObj || typeof solarObj.getYear !== 'function') return null;
    var y = _toInt(solarObj.getYear(), null);
    var m = _toInt(solarObj.getMonth(), null);
    var d = _toInt(solarObj.getDay(), null);
    if (!y || !m || !d) return null;
    var hh = _toInt(typeof solarObj.getHour === 'function' ? solarObj.getHour() : 0, 0);
    var mm = _toInt(typeof solarObj.getMinute === 'function' ? solarObj.getMinute() : 0, 0);
    var ss = _toInt(typeof solarObj.getSecond === 'function' ? solarObj.getSecond() : 0, 0);
    return _dateFromParts(y, m, d, hh, mm, ss);
  }

  function _fallbackSolarTerms(year) {
    if (typeof w.Solar === 'undefined' || typeof w.Solar.fromYmdHms !== 'function') return [];

    try {
      var solar = w.Solar.fromYmdHms(year, 1, 1, 12, 0, 0);
      var lunar = solar.getLunar();
      if (!lunar || typeof lunar.getJieQiTable !== 'function') return [];

      var table = lunar.getJieQiTable() || {};
      var out = [];

      Object.keys(table).forEach(function (name) {
        var dt = _solarObjToDate(table[name]);
        if (!dt) return;
        out.push({
          name: String(name),
          atLocal: _toIsoLocal(dt),
          source: 'fallback'
        });
      });

      out.sort(function (a, b) {
        return (a.atLocal || '').localeCompare(b.atLocal || '');
      });

      return out;
    } catch (e) {
      return [];
    }
  }

  function _normalizeTerms(apiRows, fallbackTerms) {
    var out = [];

    if (apiRows && apiRows.length) {
      apiRows.forEach(function (row) {
        var name = _pick(row, ['dateName', 'termName', 'solTermName', 'name', 'kname', 'hangul']);
        var y = _toInt(_pick(row, ['solYear', 'year']), null);
        var m = _toInt(_pick(row, ['solMonth', 'month']), null);
        var d = _toInt(_pick(row, ['solDay', 'day']), null);
        var t = _pick(row, ['time', 'tm', 'locTime']);

        if (!name) return;

        var hh = 0, mm = 0, ss = 0;
        if (t && /^\d{2}:\d{2}(:\d{2})?$/.test(String(t))) {
          var parts = String(t).split(':').map(function (v) { return _toInt(v, 0); });
          hh = parts[0] || 0;
          mm = parts[1] || 0;
          ss = parts[2] || 0;
        }

        if (!y || !m || !d) {
          var locDate = String(_pick(row, ['locdate', 'date']) || '');
          if (/^\d{8}$/.test(locDate)) {
            y = _toInt(locDate.slice(0, 4), y);
            m = _toInt(locDate.slice(4, 6), m);
            d = _toInt(locDate.slice(6, 8), d);
          }
        }

        var dt = y && m && d ? _dateFromParts(y, m, d, hh, mm, ss) : null;
        out.push({
          name: String(name),
          atLocal: dt ? _toIsoLocal(dt) : null,
          source: 'kasi'
        });
      });
    }

    if (!out.length && fallbackTerms && fallbackTerms.length) {
      return fallbackTerms.slice();
    }

    if (!out.length) return [];

    out.sort(function (a, b) {
      return (a.atLocal || '').localeCompare(b.atLocal || '');
    });

    return out;
  }

  function _extractIpchun(terms) {
    if (!Array.isArray(terms)) return null;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i] || {};
      var n = String(t.name || '').toLowerCase();
      for (var j = 0; j < _IPCHUN_KEYS.length; j++) {
        if (n.indexOf(_IPCHUN_KEYS[j]) !== -1) return t;
      }
    }
    return null;
  }

  function _buildSolarDate(norm, solarFromLunar) {
    if (norm.calendarType === 'solar') {
      return _dateFromParts(norm.year, norm.month, norm.day, norm.hour, norm.minute, norm.second);
    }
    if (!solarFromLunar) return null;
    return _dateFromParts(solarFromLunar.year, solarFromLunar.month, solarFromLunar.day, norm.hour, norm.minute, norm.second);
  }

  function _buildDateContext(norm, options) {
    options = options || {};

    var cacheKey = _makeCacheKey(norm);
    var cached = _readCache(cacheKey);
    if (cached) {
      if (_applyAuthoritativeCalendarCorrection(cached)) {
        _writeCache(cacheKey, cached);
      }
      cached.meta = cached.meta || {};
      cached.meta.fromCache = true;
      if (options.setCurrent !== false) _setCurrent(cached);
      return Promise.resolve(cached);
    }

    var inflight = _inflightCache.get(cacheKey);
    if (inflight) {
      return inflight.then(function (ctx) { return _clone(ctx); });
    }

    var diagnostics = [];
    var hadProxyFailure = false;

    var task = (async function () {
      var fallbackUsed = false;
      var solarFromLunar = null;

      if (norm.calendarType !== 'solar') {
        solarFromLunar = await _fetchSolarFromLunar(norm);
        if (!solarFromLunar) {
          solarFromLunar = _fallbackSolarFromLunar(norm);
          fallbackUsed = true;
          diagnostics.push('solar conversion fallback');
          hadProxyFailure = hadProxyFailure || !!_lastProxyFailure;
        }
      }

      var solarDate = _buildSolarDate(norm, solarFromLunar);
      if (!solarDate) throw new Error('Failed to resolve solar date');

      var lunarObj = null;
      if (norm.calendarType === 'solar') {
        lunarObj = await _fetchLunarFromSolar(solarDate);
        if (!lunarObj) {
          lunarObj = _fallbackLunarFromSolar(solarDate);
          fallbackUsed = true;
          diagnostics.push('lunar conversion fallback');
          hadProxyFailure = hadProxyFailure || !!_lastProxyFailure;
        }
      } else {
        lunarObj = {
          year: norm.year,
          month: norm.month,
          day: norm.day,
          isLeap: norm.calendarType === 'lunar_leap',
          source: solarFromLunar && solarFromLunar.source ? solarFromLunar.source : 'input'
        };
      }

      var ganji = _fallbackGanji(solarDate);
      if (!ganji || !ganji.year || !ganji.month || !ganji.day) {
        diagnostics.push('ganji limited');
      }

      var apiTerms = [];
      try {
        apiTerms = await _fetchSolarTerms(solarDate.getFullYear(), solarDate.getMonth() + 1, solarDate.getDate());
      } catch (e) {
        diagnostics.push('solar terms API failed');
        hadProxyFailure = true;
      }
      var fallbackTerms = _fallbackSolarTerms(solarDate.getFullYear());
      if (!apiTerms.length && fallbackTerms.length) {
        fallbackUsed = true;
        diagnostics.push('solar terms fallback');
        hadProxyFailure = hadProxyFailure || !!_lastProxyFailure;
      }
      var terms = _normalizeTerms(apiTerms, fallbackTerms);
      var ipchun = _extractIpchun(terms);

      var context = {
        version: 1,
        cacheKey: cacheKey,
        source: fallbackUsed ? (diagnostics.length ? 'mixed' : 'fallback') : 'kasi',
        input: {
          calendarType: norm.calendarType,
          year: norm.year,
          month: norm.month,
          day: norm.day,
          hour: norm.hour,
          minute: norm.minute,
          second: norm.second,
          latitude: norm.latitude,
          longitude: norm.longitude,
          tzOffsetHours: norm.tzOffsetHours
        },
        solar: {
          year: solarDate.getFullYear(),
          month: solarDate.getMonth() + 1,
          day: solarDate.getDate(),
          hour: solarDate.getHours(),
          minute: solarDate.getMinutes(),
          second: solarDate.getSeconds(),
          isoLocal: _toIsoLocal(solarDate)
        },
        lunar: {
          year: lunarObj ? lunarObj.year : null,
          month: lunarObj ? lunarObj.month : null,
          day: lunarObj ? lunarObj.day : null,
          isLeap: lunarObj ? !!lunarObj.isLeap : false
        },
        ganji: {
          year: ganji ? ganji.year : null,
          month: ganji ? ganji.month : null,
          day: ganji ? ganji.day : null
        },
        terms24: terms,
        ipchun: ipchun,
        leapMonth: lunarObj ? !!lunarObj.isLeap : false,
        meta: {
          fetchedAt: new Date().toISOString(),
          fromCache: false,
          fallbackUsed: fallbackUsed,
          diagnostics: diagnostics,
          userMessage: hadProxyFailure ? (_lastProxyFailure && _lastProxyFailure.message) || _config.maintenanceMessage : null
        }
      };

      _applyAuthoritativeCalendarCorrection(context);

      _writeCache(cacheKey, context);
      if (options.setCurrent !== false) _setCurrent(context);
      return _clone(context);
    })();

    _inflightCache.set(cacheKey, task);
    return task.finally(function () {
      _inflightCache.delete(cacheKey);
    });
  }

  var service = {
    configure: function (opts) {
      opts = opts || {};
      _config = Object.assign({}, _config, opts);
      return this;
    },

    getConfig: function () {
      return _clone(_config);
    },

    resolveDateContext: function (input, options) {
      var norm = _normalizeInput(input);
      return _buildDateContext(norm, options || {});
    },

    resolveContexts: function (inputs, options) {
      var self = this;
      var list = Array.isArray(inputs) ? inputs : [];
      var opts = options || {};
      var setCurrentIndex = (typeof opts.setCurrentIndex === 'number') ? opts.setCurrentIndex : -1;
      return Promise.all(list.map(function (input, idx) {
        var localOptions = Object.assign({}, opts);
        localOptions.setCurrent = setCurrentIndex === idx;
        return self.resolveDateContext(input, localOptions);
      }));
    },

    resolvePairContexts: function (selfInput, partnerInput, options) {
      var opts = options || {};
      var aliases = opts.aliases || { self: 'self', partner: 'partner' };
      return this.resolveContexts([selfInput, partnerInput], opts).then(function (rows) {
        var pair = {
          self: rows[0] || null,
          partner: rows[1] || null
        };
        if (pair.self && aliases.self) _setNamedContext(aliases.self, pair.self);
        if (pair.partner && aliases.partner) _setNamedContext(aliases.partner, pair.partner);
        return pair;
      });
    },

    prefetch: function (input) {
      return this.resolveDateContext(input, { setCurrent: false });
    },

    getCurrentContext: function () {
      return _clone(_currentContext || w.__KASI_DATE_CONTEXT__ || null);
    },

    setCurrentContext: function (context) {
      if (!context) return;
      _setCurrent(context);
    },

    setContextAlias: function (alias, context) {
      _setNamedContext(alias, context);
    },

    getContextAlias: function (alias) {
      return _getNamedContext(alias);
    },

    subscribe: function (fn) {
      return _subscribe(fn);
    },

    clearCache: function () {
      _memoryCache.clear();
      _inflightCache.clear();
      _namedContexts = Object.create(null);
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(_config.storageKeyPrefix) === 0) keys.push(k);
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
    }
  };

  w.KasiCalendarService = service;
})(window);
