(function (w) {
  'use strict';

  var DEFAULTS = {
    apiEndpoint: '/api/kasi/calendar',
    maintenanceMessage: '\ud55c\uad6d\ucc9c\ubb38\uc5f0 API \uc11c\ubc84 \uc810\uac80 \uc911\uc73c\ub85c \ub0b4\ubd80 \uacc4\uc0b0\uae30\ub85c \uc804\ud658\ud569\ub2c8\ub2e4.',
    timeoutMs: 2500,
    cacheTtlMs: 1000 * 60 * 60 * 24 * 180,
    storageKeyPrefix: 'kasi:date-context:v2:'
  };

  var _config = Object.assign({}, DEFAULTS);
  var _memoryCache = new Map();
  var _inflightCache = new Map();
  var _currentContext = null;
  var _namedContexts = Object.create(null);
  var _subscribers = [];
  var _lastProxyFailure = null;
  var _maintenanceUntil = 0; // circuit breaker: skip KASI calls until this timestamp
  var _MAINTENANCE_CIRCUIT_MS = 10 * 60 * 1000; // 10 minutes
  var _kasiFailureStreak = 0;
  var _KASI_FAILURE_THRESHOLD = 3;
  var _METHOD_CACHE_TTL_MS = 30 * 60 * 1000;
  var _methodCache = new Map();
  var _methodInflight = new Map();
  var _solarTermYearCache = new Map();
  var _warnedKeys = new Set();

  function _isMaintenanceCircuitOpen() {
    return Date.now() < _maintenanceUntil;
  }

  function _tripMaintenanceCircuit(message, reason) {
    _maintenanceUntil = Date.now() + _MAINTENANCE_CIRCUIT_MS;
    _lastProxyFailure = {
      at: Date.now(),
      message: message || _config.maintenanceMessage,
      reason: reason || 'KASI_UPSTREAM_ERROR'
    };
  }

  function _isDevRuntime() {
    try {
      var host = String((w && w.location && w.location.hostname) || '').toLowerCase();
      if (!host) return false;
      return host === 'localhost' || host === '127.0.0.1' || host.indexOf('.local') > 0;
    } catch (e) {
      return false;
    }
  }

  function _warnOnce(key, message, detail) {
    var k = String(key || '').trim();
    if (!k) return;
    if (_warnedKeys.has(k)) return;
    _warnedKeys.add(k);
    if (!_isDevRuntime()) return;
    try {
      if (detail !== undefined) {
        console.warn('[KASI]', message, detail);
      } else {
        console.warn('[KASI]', message);
      }
    } catch (e) {}
  }

  function _recordProxyFailure(message, reason) {
    _kasiFailureStreak += 1;
    _lastProxyFailure = {
      at: Date.now(),
      message: message || _config.maintenanceMessage,
      reason: reason || 'KASI_UPSTREAM_ERROR'
    };
    if (_kasiFailureStreak >= _KASI_FAILURE_THRESHOLD) {
      _tripMaintenanceCircuit(message, reason);
      _warnOnce('kasi-circuit-open', 'KASI circuit breaker opened for 10 minutes', {
        reason: reason || 'KASI_UPSTREAM_ERROR',
        streak: _kasiFailureStreak
      });
    }
  }

  function _recordProxySuccess() {
    _kasiFailureStreak = 0;
  }

  function _makeMethodCacheKey(method, params) {
    var p = params && typeof params === 'object' ? params : {};
    var keys = Object.keys(p).sort();
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      parts.push(key + '=' + String(p[key] == null ? '' : p[key]));
    }
    return String(method || '') + '|' + parts.join('&');
  }

  function _readMethodCache(cacheKey) {
    var hit = _methodCache.get(cacheKey);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      _methodCache.delete(cacheKey);
      return null;
    }
    return _clone(hit.rows || []);
  }

  function _writeMethodCache(cacheKey, rows) {
    _methodCache.set(cacheKey, {
      expiresAt: Date.now() + _METHOD_CACHE_TTL_MS,
      rows: _clone(Array.isArray(rows) ? rows : [])
    });
  }

  var _IPCHUN_KEYS = [
    'ipchun',
    '\uc785\ucd98',
    '\u7acb\u6625'
  ];

  // 12중절(中節) 이름 → 월지(月支) 매핑 (한국어 + 한자)
  // 지지: 子丑寅卯辰巳午未申酉戌亥
  var _JIEQI_MONTH_BRANCH = {
    '\uc18c\ud55c': '\u4e11', '\u5c0f\u5bd2': '\u4e11',   // 소한/小寒 → 丑(U+4E11)
    '\uc785\ucd98': '\u5bc5', '\u7acb\u6625': '\u5bc5',   // 입춘/立春 → 寅(U+5BC5)
    '\uacbd\uce69': '\u536f', '\u9a5a\u86f0': '\u536f',   // 경칩/驚蟄 → 卯(U+536F)
    '\uccad\uba85': '\u8fb0', '\u6e05\u660e': '\u8fb0',   // 청명/清明 → 辰(U+8FB0)
    '\uc785\ud558': '\u5df3', '\u7acb\u590f': '\u5df3',   // 입하/立夏 → 巳(U+5DF3)
    '\ub9dd\uc885': '\u5348', '\u8292\u7a2e': '\u5348',   // 망종/芒種 → 午(U+5348)
    '\uc18c\uc11c': '\u672a', '\u5c0f\u6691': '\u672a',   // 소서/小暑 → 未(U+672A)
    '\uc785\ucd94': '\u7533', '\u7acb\u79cb': '\u7533',   // 입추/立秋 → 申(U+7533)
    '\ubc31\ub85c': '\u9149', '\u767d\u9732': '\u9149',   // 백로/白露 → 酉(U+9149)
    '\ud55c\ub85c': '\u620c', '\u5bd2\u9732': '\u620c',   // 한로/寒露 → 戌(U+620C)
    '\uc785\ub3d9': '\u4ea5', '\u7acb\u51ac': '\u4ea5',   // 입동/立冬 → 亥(U+4EA5)
    '\ub300\uc124': '\u5b50', '\u5927\u96ea': '\u5b50'    // 대설/大雪 → 子(U+5B50)
  };
  // 지지 순서: 子丑寅卯辰巳午未申酉戌亥
  var _EB = '\u5b50\u4e11\u5bc5\u536f\u8fb0\u5df3\u5348\u672a\u7533\u9149\u620c\u4ea5';
  // 천간 순서: 甲乙丙丁戊己庚辛壬癸
  var _HS = '\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a\u8f9b\u58ec\u7678';
  // 오자배년법: 年干 → 寅月 시작 천간 인덱스
  var _YSTEM_YIN_START = {
    '\u7532': 2, '\u5df1': 2,  // 甲/己 → 丙(idx 2)
    '\u4e59': 4, '\u5e9a': 4,  // 乙/庚 → 戊(idx 4)
    '\u4e19': 6, '\u8f9b': 6,  // 丙/辛 → 庚(idx 6) ← 2026 병오년
    '\u4e01': 8, '\u58ec': 8,  // 丁/壬 → 壬(idx 8)
    '\u620a': 0, '\u7678': 0   // 戊/癸 → 甲(idx 0)
  };
  var _DAY_STEM_HOUR_START = {
    '\u7532': 0, '\u5df1': 0,
    '\u4e59': 2, '\u5e9a': 2,
    '\u4e19': 4, '\u8f9b': 4,
    '\u4e01': 6, '\u58ec': 6,
    '\u620a': 8, '\u7678': 8
  };
  var _GAN_ALIASES = {
    '\u7532':'\u7532','\u4e59':'\u4e59','\u4e19':'\u4e19','\u4e01':'\u4e01','\u620a':'\u620a','\u5df1':'\u5df1','\u5e9a':'\u5e9a','\u8f9b':'\u8f9b','\u58ec':'\u58ec','\u7678':'\u7678',
    '\uac11':'\u7532','\uc744':'\u4e59','\ubcd1':'\u4e19','\uc815':'\u4e01','\ubb34':'\u620a','\uae30':'\u5df1','\uacbd':'\u5e9a','\uc2e0':'\u8f9b','\uc784':'\u58ec','\uacc4':'\u7678'
  };
  var _JI_ALIASES = {
    '\u5b50':'\u5b50','\u4e11':'\u4e11','\u5bc5':'\u5bc5','\u536f':'\u536f','\u8fb0':'\u8fb0','\u5df3':'\u5df3','\u5348':'\u5348','\u672a':'\u672a','\u7533':'\u7533','\u9149':'\u9149','\u620c':'\u620c','\u4ea5':'\u4ea5',
    '\uc790':'\u5b50','\ucd95':'\u4e11','\uc778':'\u5bc5','\ubb18':'\u536f','\uc9c4':'\u8fb0','\uc0ac':'\u5df3','\uc624':'\u5348','\ubbf8':'\u672a','\uc2e0':'\u7533','\uc720':'\u9149','\uc220':'\u620c','\ud574':'\u4ea5'
  };

  var _VALIDATED_SOLAR_TERMS_BY_YEAR = {
    '1990': [
      { name: '\uc18c\ud55c', atLocal: '1990-01-05T23:33:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\uc785\ucd98', atLocal: '1990-02-04T11:14:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\uacbd\uce69', atLocal: '1990-03-06T05:19:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\uccad\uba85', atLocal: '1990-04-05T10:12:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\uc785\ud558', atLocal: '1990-05-06T03:35:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\ub9dd\uc885', atLocal: '1990-06-06T07:46:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\uc18c\uc11c', atLocal: '1990-07-07T18:00:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\uc785\ucd94', atLocal: '1990-08-08T03:46:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\ubc31\ub85c', atLocal: '1990-09-08T06:38:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\ud55c\ub85c', atLocal: '1990-10-08T22:14:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\uc785\ub3d9', atLocal: '1990-11-08T01:23:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' },
      { name: '\ub300\uc124', atLocal: '1990-12-07T18:14:00', source: 'validated-cache', verifiedAt: '2026-06-02T00:00:00+09:00', timezone: 'Asia/Seoul' }
    ]
  };

  /**
   * 컨텍스트의 음력·양력이 한국 음양력 코어와 어긋나면 코어 쪽으로 맞춘다.
   *
   * 🔴 예전에는 이 자리에 1997-02-10 하루짜리 표가 박혀 있었다. 그 날짜만 특별했던 게 아니라
   * lunar-javascript 가 중국 표준시(UTC+8) 기준이어서 삭이 CST 23시대에 든 달 전체가 밀렸던 것이고,
   * 1900~2100 전수로 73,414일 중 2,997일(4.08%)이 그렇다(verify:korean-calendar-divergence).
   * 그래서 표를 지우고 **규칙**으로 바꿨다. 코어는 window.KoreanCalendar 에 있고,
   * KASI 응답과는 289건 표본 전건 일치한다(verify:korean-calendar-kasi-samples).
   *
   * 코어가 없거나(스크립트 미로드) 지원 범위 밖이면 아무것도 하지 않는다 — 손댈 근거가 없다.
   */
  function _applyCoreCalendarCorrection(context) {
    if (!context || typeof context !== 'object') return false;
    var core = w.KoreanCalendar;
    if (!core || typeof core.solarToLunar !== 'function') return false;

    var solar = context.solar || {};
    var sy = _toInt(solar.year, null);
    var sm = _toInt(solar.month, null);
    var sd = _toInt(solar.day, null);
    if (!sy || !sm || !sd) return false;

    var truth = core.solarToLunar(sy, sm, sd);
    if (!truth) return false;

    if (!context.lunar) context.lunar = {};
    var corrected = (
      _toInt(context.lunar.year, null) !== truth.lunarYear ||
      _toInt(context.lunar.month, null) !== truth.lunarMonth ||
      _toInt(context.lunar.day, null) !== truth.lunarDay ||
      !!context.lunar.isLeap !== !!truth.isLeapMonth
    );
    if (!corrected) return false;

    context.lunar.year = truth.lunarYear;
    context.lunar.month = truth.lunarMonth;
    context.lunar.day = truth.lunarDay;
    context.lunar.isLeap = !!truth.isLeapMonth;
    context.leapMonth = !!truth.isLeapMonth;
    context.meta = context.meta || {};
    if (!Array.isArray(context.meta.diagnostics)) context.meta.diagnostics = [];
    if (context.meta.diagnostics.indexOf('korean-calendar-core-correction') === -1) {
      context.meta.diagnostics.push('korean-calendar-core-correction');
    }
    context.meta.coreCalendarCorrection = true;
    return true;
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
      'saju',
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

  function _makeCalendarDateKey(norm) {
    return [
      'calendar',
      norm.calendarType,
      norm.year,
      _pad2(norm.month),
      _pad2(norm.day)
    ].join(':');
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
    _warnOnce('kasi-maintenance-notify', 'KASI fallback mode enabled');
  }

  async function _fetchKasi(method, params) {
    var methodParams = params || {};
    var methodCacheKey = _makeMethodCacheKey(method, methodParams);
    var cachedRows = _readMethodCache(methodCacheKey);
    if (cachedRows) return cachedRows;

    if (_isMaintenanceCircuitOpen()) {
      var circuitError = new Error('KASI circuit open');
      circuitError.code = 'KASI_CIRCUIT_OPEN';
      throw circuitError;
    }

    var inflight = _methodInflight.get(methodCacheKey);
    if (inflight) return inflight;

    var task = (async function() {
      var url = _resolveApiEndpoint();
      var maxAttempts = 2; // initial + 1 retry
      var lastError = null;

      for (var attempt = 0; attempt < maxAttempts; attempt++) {
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
            body: JSON.stringify({ method: method, params: methodParams })
          });

          var rawText = await res.text();
          var payload = null;
          if (rawText) {
            try {
              payload = JSON.parse(rawText);
            } catch (parseErr) {
              var parseError = new Error('KASI 응답 파싱 실패(JSON 아님) for ' + method);
              parseError.code = 'KASI_PARSE_ERROR';
              parseError.detail = parseErr && parseErr.message ? parseErr.message : null;
              parseError.snippet = String(rawText).slice(0, 220);
              throw parseError;
            }
          }

          if (!res.ok || (payload && payload.ok === false)) {
            var error = new Error(
              (payload && payload.message)
              || ('HTTP ' + res.status + ' for ' + method)
            );
            error.status = res.status;
            error.code = (payload && payload.code) || 'KASI_UPSTREAM_ERROR';
            throw error;
          }

          var source = payload && payload.source ? String(payload.source) : 'kasi-api';
          var warnings = payload && Array.isArray(payload.warnings) ? payload.warnings : [];
          var unverified = source === 'local' || source === 'fallback' || source === 'estimated' || source === 'unknown'
            || warnings.some(function (code) {
              return /FALLBACK|LOCAL|ESTIMATED|UNKNOWN/i.test(String(code || ''));
            });
          if (unverified) {
            var sourceError = new Error('KASI proxy returned unverified calendar data for ' + method);
            sourceError.code = 'KASI_UNVERIFIED_SOURCE';
            throw sourceError;
          }

          var rows = (payload && Array.isArray(payload.rows)) ? payload.rows : [];
          _recordProxySuccess();
          _writeMethodCache(methodCacheKey, rows);
          return rows;
        } catch (error) {
          lastError = error;
          var status = Number(error && error.status);
          var isTimeout = !!(error && error.name === 'AbortError');
          var retryable = isTimeout || !status || status === 408 || status === 429 || status >= 500;
          if (!retryable || attempt >= (maxAttempts - 1)) {
            break;
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      var failMessage = (lastError && lastError.message) || _config.maintenanceMessage;
      var failCode = (lastError && lastError.code) || 'KASI_UPSTREAM_ERROR';
      _recordProxyFailure(failMessage, failCode);
      if (_isMaintenanceCircuitOpen()) {
        _notifyMaintenance(failMessage);
      }
      throw lastError || new Error('KASI request failed');
    })();

    _methodInflight.set(methodCacheKey, task);
    return task.finally(function() {
      _methodInflight.delete(methodCacheKey);
    });
  }

  async function _fetchSolarFromLunar(norm) {
    if (_isMaintenanceCircuitOpen()) return null;
    var leapMark = norm.calendarType === 'lunar_leap' ? '\uc724' : '\ud3c9';
    try {
      var rows = await _fetchKasi('getSolCalInfo', {
        lunYear: String(norm.year),
        lunMonth: _pad2(norm.month),
        lunDay: _pad2(norm.day),
        lunLeapmonth: leapMark
      });
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
      _warnOnce('kasi-getSolCalInfo-failed', 'getSolCalInfo unavailable');
    }
    return null;
  }

  async function _fetchLunarFromSolar(solarParts) {
    if (_isMaintenanceCircuitOpen()) return null;
    try {
      var rows = await _fetchKasi('getLunCalInfo', {
        solYear: String(solarParts.year),
        solMonth: _pad2(solarParts.month),
        solDay: _pad2(solarParts.day)
      });
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
      _warnOnce('kasi-getLunCalInfo-failed', 'getLunCalInfo unavailable');
    }

    return null;
  }

  async function _fetchSolarTerms(year, month, day) {
    if (_isMaintenanceCircuitOpen()) return [];
    var yearKey = 'solar-terms:' + String(year);
    var cached = _solarTermYearCache.get(yearKey);
    if (cached && cached.expiresAt > Date.now()) {
      return _clone(cached.rows || []);
    }

    try {
      var rows = await _fetchKasi('get24DivisionsInfo', {
        solYear: String(year),
        numOfRows: '30'
      });
      if (rows && rows.length) {
        _solarTermYearCache.set(yearKey, {
          expiresAt: Date.now() + _METHOD_CACHE_TTL_MS,
          rows: _clone(rows)
        });
        return rows;
      }
    } catch (e) {
      _warnOnce('kasi-get24DivisionsInfo-failed:' + String(year), 'get24DivisionsInfo unavailable');
    }

    return [];
  }

  /**
   * 벽시계 부품 규약 — `{ year, month(1-based), day, hour, minute, second }`.
   *
   * 🔴 간지 경로에서 로컬 `Date` 를 캐리어로 쓰지 않는다. 그 벽시계가 브라우저 타임존에
   * **존재하지 않으면**(서머타임 시계 앞당김) JS 가 조용히 다른 시각으로 접고, 되읽은 부품이
   * 입력과 달라져 시주·일주·월주가 틀어진다. 존재하지 않는 벽시계를 담을 수 있는 로컬 Date 는
   * 없으므로 "조립 후 보정"은 불가능하고 캐리어를 그만두는 것이 유일한 답이다.
   * 계획 전문: docs/handoff/ganji-wallclock-parts-migration.md
   *
   * 🔴 정규화는 `new Date(y, m - 1, d, h, min, s)` 와 **한 글자도 달라지면 안 된다** — 초과 일수는
   * 다음 달로 넘어가고 0~99 년은 1900+y 로 읽힌다. `Date.UTC` 가 같은 규칙을 갖고 있으면서
   * 타임존에는 안 걸리므로 그 엔진을 그대로 빌린다. 2월 30일 거부 같은 엄격화는 여기가 아니라
   * PR-E 에서 별도 실측과 함께 한다 — 지금 조이면 접혀서 계산되던 입력이 조용히 null 이 된다.
   */
  function _partsOf(y, m, d, h, min, s) {
    var ms = Date.UTC(y, (m || 1) - 1, d || 1, h || 0, min || 0, s || 0);
    if (isNaN(ms)) return null;
    var at = new Date(ms);
    return {
      year: at.getUTCFullYear(),
      month: at.getUTCMonth() + 1,
      day: at.getUTCDate(),
      hour: at.getUTCHours(),
      minute: at.getUTCMinutes(),
      second: at.getUTCSeconds()
    };
  }

  /**
   * 부품 입구 가드. 🔴 Date 를 받던 시절의 `x instanceof Date && !isNaN(x.getTime())` 와
   * **같은 강도**여야 한다 — 느슨해지면 지금 null 을 내는 표면들이 답하기 시작하고,
   * 그 순간 호출부 13곳이 한꺼번에 절기 프레임 세차로 갈아탄다.
   * `second` 만 선택이다(`_dateFromParts` 도 기본값 0 이었다).
   */
  function _partsValid(parts) {
    if (!parts || typeof parts !== 'object') return false;
    var keys = ['year', 'month', 'day', 'hour', 'minute'];
    for (var i = 0; i < keys.length; i++) {
      var v = parts[keys[i]];
      if (typeof v !== 'number' || !isFinite(v)) return false;
    }
    return true;
  }

  /**
   * 🔴 벽시계 부품을 그대로 UTC 축에 얹은 ms. **절대시각이 아니다.**
   *
   * 절기의 atLocal 도 KST 벽시계다(_termWallClockMs). 예전에는 atLocal 만 '+09:00' 을 붙여
   * **절대시각**으로 바꿔 놓고 로컬 Date 의 getTime() 과 비교했다 — 브라우저 타임존이 KST 가
   * 아니면 그 둘이 시차만큼 어긋난다(실측 2026-08-28, 입춘 ±10시간 710표본에서 UTC 브라우저
   * 282건(39.7%) · 뉴욕 353건(49.7%) 이 세차·월건 모두 한 칸 어긋났다).
   * 두 값을 같은 벽시계 축에 올리면 브라우저 타임존과 무관해진다.
   */
  function _partsWallMs(parts) {
    if (!_partsValid(parts)) return NaN;
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
  }

  function _partsToIsoLocal(parts) {
    if (!_partsValid(parts)) return null;
    return parts.year + '-' + _pad2(parts.month) + '-' + _pad2(parts.day) +
      'T' + _pad2(parts.hour) + ':' + _pad2(parts.minute) + ':' + _pad2(parts.second || 0);
  }

  function _fallbackSolarFromLunar(norm) {
    if (w.KasiEngine && typeof w.KasiEngine.lunarToSolar === 'function') {
      var conv = w.KasiEngine.lunarToSolar(norm.year, norm.month, norm.day, norm.calendarType === 'lunar_leap');
      if (conv && conv.year && conv.month && conv.day) {
        return { year: conv.year, month: conv.month, day: conv.day, source: 'fallback' };
      }
    }
    // 🔴 lunar-javascript 폴백은 두지 않는다 — 중국 표준시(UTC+8) 기준이라 음력일이 하루 밀린다.
    if (w.KoreanCalendar && typeof w.KoreanCalendar.lunarToSolar === 'function') {
      var isLeap = norm.calendarType === 'lunar_leap';
      var conv = w.KoreanCalendar.lunarToSolar(norm.year, Math.abs(norm.month), norm.day, isLeap);
      if (!conv && isLeap) conv = w.KoreanCalendar.lunarToSolar(norm.year, Math.abs(norm.month), norm.day, false);
      if (conv) return { year: conv.year, month: conv.month, day: conv.day, source: 'korean-calendar-core' };
    }
    return null;
  }

  function _fallbackLunarFromSolar(solarParts) {
    if (w.KasiEngine && typeof w.KasiEngine.solarToLunarFromParts === 'function') {
      var lun = w.KasiEngine.solarToLunarFromParts(solarParts);
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
    // 🔴 _fallbackSolarFromLunar 와 같은 이유로 lunar-javascript 폴백을 두지 않는다.
    if (w.KoreanCalendar && typeof w.KoreanCalendar.solarToLunar === 'function' && _partsValid(solarParts)) {
      var lun = w.KoreanCalendar.solarToLunar(solarParts.year, solarParts.month, solarParts.day);
      if (lun) {
        return {
          year: lun.lunarYear,
          month: lun.lunarMonth,
          day: lun.lunarDay,
          isLeap: !!lun.isLeapMonth,
          source: 'korean-calendar-core'
        };
      }
    }
    return null;
  }

  function _parseGanjiPair(raw) {
    var text = String(raw || '').replace(/\s+/g, '').trim();
    if (!text) return null;
    var g = null;
    var j = null;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (!g && _GAN_ALIASES[ch]) {
        g = _GAN_ALIASES[ch];
        continue;
      }
      if (!j && _JI_ALIASES[ch]) {
        j = _JI_ALIASES[ch];
        continue;
      }
      if (g && j) break;
    }
    return g && j ? (g + j) : null;
  }

  function _extractGanjiFromKasiLunar(lunarObj) {
    var raw = lunarObj && lunarObj.raw;
    if (!raw || typeof raw !== 'object') return null;
    var year = _parseGanjiPair(_pick(raw, ['lunSecha', 'secha', 'yearGanji', 'ganjiYear']));
    var month = _parseGanjiPair(_pick(raw, ['lunWolgeon', 'wolgeon', 'monthGanji', 'ganjiMonth']));
    var day = _parseGanjiPair(_pick(raw, ['lunIljin', 'iljin', 'dayGanji', 'ganjiDay']));
    if (!year && !month && !day) return null;
    return {
      year: year,
      month: month,
      day: day,
      source: 'kasi'
    };
  }

  function _cycleGanji(index) {
    var idx = ((Number(index) || 0) % 60 + 60) % 60;
    return _HS.charAt(idx % 10) + _EB.charAt(idx % 12);
  }

  function _dayGanjiFromParts(solarParts) {
    var serial = Math.floor(Date.UTC(solarParts.year, solarParts.month - 1, solarParts.day) / 86400000);
    return _cycleGanji(serial + 17);
  }

  /** 절기 atLocal('YYYY-MM-DDTHH:mm[:ss]' 또는 공백 구분)을 같은 벽시계 축의 ms 로. */
  function _termWallClockMs(atLocal) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(atLocal || ''));
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }

  function _yearGanjiFromIpchun(solarParts, terms) {
    var year = solarParts.year;
    var ipchun = _extractIpchun(terms);
    var pillarYear = year;
    if (ipchun && ipchun.atLocal) {
      var ipchunMs = _termWallClockMs(ipchun.atLocal);
      if (!isNaN(ipchunMs) && _partsWallMs(solarParts) < ipchunMs) pillarYear = year - 1;
    } else if (solarParts.month === 1 || (solarParts.month === 2 && solarParts.day < 4)) {
      pillarYear = year - 1;
    }
    return _cycleGanji(pillarYear - 1984);
  }

  function _hourGanjiFromDay(dayGanji, solarParts) {
    if (!dayGanji || dayGanji.length < 1) return null;
    var dayStem = dayGanji.charAt(0);
    var start = _DAY_STEM_HOUR_START[dayStem];
    if (start == null) return null;
    var hour = solarParts.hour;
    var branchIdx = Math.floor((hour + 1) / 2) % 12;
    return _HS.charAt((start + branchIdx) % 10) + _EB.charAt(branchIdx);
  }

  function _fallbackGanji(solarParts, lunarObj, terms) {
    var kasiGanji = _extractGanjiFromKasiLunar(lunarObj);
    var localTerms = terms && terms.length ? terms : _readValidatedSolarTerms(solarParts.year);
    var hasMonthTerms = _countMonthBoundaryTerms(localTerms) >= 12;
    var yearGanji = hasMonthTerms ? _yearGanjiFromIpchun(solarParts, localTerms) : null;
    var dayGanji = _dayGanjiFromParts(solarParts);
    var monthGanji = hasMonthTerms ? _computeMonthGanjiFromTerms(localTerms, solarParts, yearGanji) : null;
    if (kasiGanji && (kasiGanji.year || kasiGanji.month || kasiGanji.day)) {
      var mergedDayGanji = kasiGanji.day || dayGanji;
      return {
        year: kasiGanji.year || yearGanji,
        month: kasiGanji.month || monthGanji,
        day: mergedDayGanji,
        hour: _hourGanjiFromDay(mergedDayGanji, solarParts),
        source: (kasiGanji.source || 'kasi') + '+local-hour'
      };
    }
    if (!hasMonthTerms) return null;
    return {
      year: yearGanji,
      month: monthGanji,
      day: dayGanji,
      hour: _hourGanjiFromDay(dayGanji, solarParts),
      source: localTerms && localTerms.length ? 'terms-julian' : 'julian'
    };
  }

  function _legacyLibraryGanjiDisabled(solarDate) {
    return { year: null, month: null, day: null, source: 'disabled' };
  }

  /**
   * KASI 24절기 API 가 실패했을 때 쓰는 로컬 절기표.
   *
   * 🔴 예전에는 lunar-javascript getJieQiTable 을 읽고 +1시간을 더했다. 그 라이브러리가
   * 중국 표준시(UTC+8) 기준이라 애드혹 보정이 필요했던 것이고, 코어의 절기표는 이미 KST 다.
   * 🔴 그리고 그 함수는 **한 번도 불리지 않았다** — 호출부가 fallbackTerms 를 빈 배열로 넘겼다.
   * 그래서 KASI 가 죽으면 _VALIDATED_SOLAR_TERMS_BY_YEAR 에 든 1990년 말고는
   * 12중절이 모자라 년주·월주가 통째로 null 로 떨어졌다(_fallbackGanji 의 hasMonthTerms).
   * 이제 코어가 1900~2100 전 구간을 덮으므로 그 구멍이 닫힌다.
   */
  function _fallbackSolarTerms(year) {
    var core = w.KoreanCalendar;
    if (!core || typeof core.solarTerms !== 'function') return [];
    var y = _toInt(year, null);
    if (!y) return [];

    var terms = core.solarTerms(y);
    if (!terms || !terms.length) return [];

    return terms.map(function (t) {
      return {
        name: core.TERM_NAME_KO[t.index],
        atLocal: t.year + '-' + _pad2(t.month) + '-' + _pad2(t.day) +
          'T' + _pad2(t.hour) + ':' + _pad2(t.minute) + ':00',
        source: 'korean-calendar-core'
      };
    });
  }

  function _normalizeTerms(apiRows, fallbackTerms, requestedYear) {
    var out = [];
    var fallbackYear = _toInt(requestedYear, null);

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

        var dt = y && m && d ? _partsOf(y, m, d, hh, mm, ss) : null;
        fallbackYear = fallbackYear || y;
        if (!dt || (fallbackYear && y && y !== fallbackYear)) return;
        out.push({
          name: String(name),
          atLocal: dt ? _partsToIsoLocal(dt) : null,
          source: 'kasi-api',
          sourceMeta: {
            basisYear: y,
            source: 'kasi-api',
            verifiedAt: new Date().toISOString(),
            timezone: 'Asia/Seoul'
          }
        });
      });
    }

    if (!fallbackYear && fallbackTerms && fallbackTerms.length) {
      for (var fy = 0; fy < fallbackTerms.length; fy++) {
        var fyTerm = fallbackTerms[fy] || {};
        var fyMatch = /^(\d{4})/.exec(String(fyTerm.atLocal || fyTerm.date || ''));
        if (fyMatch) {
          fallbackYear = _toInt(fyMatch[1], null);
          break;
        }
      }
    }

    // 12중절이 모자라면 로컬로 내려간다. 순서는 검증캐시 → 코어다 —
    // 검증캐시(1990)는 KASI 응답을 그대로 받아 적은 것이고, 코어의 표는 astronomy-engine 산출물이라
    // 같은 절기가 최대 1분 다르다(실측 2026-08-27, 1990: 12중절 중 5건이 1분 차).
    // 기존 값을 바꾸지 않으려고 캐시를 앞에 둔다.
    var validated = _readValidatedSolarTerms(fallbackYear);
    var local = _countMonthBoundaryTerms(validated) >= 12
      ? validated
      : (_countMonthBoundaryTerms(fallbackTerms) >= 12 ? _clone(fallbackTerms) : []);

    if (!out.length && local.length) {
      return local;
    }

    if (out.length && _countMonthBoundaryTerms(out) < 12 && local.length) {
      return local;
    }

    if (!out.length || _countMonthBoundaryTerms(out) < 12) return [];

    out.sort(function (a, b) {
      return (a.atLocal || '').localeCompare(b.atLocal || '');
    });

    return out;
  }

  function _readValidatedSolarTerms(year) {
    var rows = _VALIDATED_SOLAR_TERMS_BY_YEAR[String(year || '')];
    return Array.isArray(rows) ? _clone(rows) : [];
  }

  function _hasMonthBoundaryTerms(terms) {
    if (!Array.isArray(terms)) return false;
    return _countMonthBoundaryTerms(terms) > 0;
  }

  function _countMonthBoundaryTerms(terms) {
    if (!Array.isArray(terms)) return 0;
    var count = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i] || {};
      var n = String(t.name || '').replace(/\([^)]*\)\s*$/, '').trim();
      if (_JIEQI_MONTH_BRANCH[n]) count += 1;
    }
    return count;
  }

  /**
   * 🔴 정본이자 **유일한** 진입점이다. 인자는 KST 벽시계 부품이다.
   * PR-E 이전에는 여기 위에 로컬 Date 를 읽는 `_computeGanjiFromDate` 어댑터가 있었다 —
   * 다시 만들지 말 것. 그 캐리어는 존재하지 않는 벽시계를 담지 못해 조용히 접힌다.
   * 계획 전문: docs/handoff/ganji-wallclock-parts-migration.md
   */
  function _computeGanjiFromParts(solarParts, terms) {
    if (!_partsValid(solarParts)) return null;
    var localTerms = terms && terms.length ? terms : _readValidatedSolarTerms(solarParts.year);
    if (_countMonthBoundaryTerms(localTerms) < 12) return null;
    var yearGanji = _yearGanjiFromIpchun(solarParts, localTerms);
    var dayGanji = _dayGanjiFromParts(solarParts);
    var monthGanji = _computeMonthGanjiFromTerms(localTerms, solarParts, yearGanji);
    if (!yearGanji || !monthGanji || !dayGanji) return null;
    return {
      year: yearGanji,
      month: monthGanji,
      day: dayGanji,
      hour: _hourGanjiFromDay(dayGanji, solarParts),
      source: String((localTerms[0] && localTerms[0].source) || 'validated-cache')
    };
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

  /**
   * 절기 데이터(terms24)와 생년월일시(solarParts)로 정확한 월주(月柱)를 계산한다.
   * lunar-javascript CST 오차 및 KASI API 부분 조회 문제를 해결하기 위한 핵심 보정 함수.
   * @param {Array} terms - terms24 배열 ({name, atLocal, source} 형태)
   * @param {{year:number,month:number,day:number,hour:number,minute:number,second?:number}} solarParts - 생년월일시 (KST 벽시계 부품)
   * @param {string} yearGanStr - 年柱 간지 문자열 (예: '丙午', 첫 글자가 天干)
   * @returns {string|null} 월주 간지 2글자 (예: '庚寅') 또는 null
   */
  function _computeMonthGanjiFromTerms(terms, solarParts, yearGanStr) {
    if (!terms || !terms.length || !solarParts) return null;
    try {
      // 🔴 절대시각이 아니라 벽시계 축이다 — 이유는 _partsWallMs 주석에 있다.
      var birthMs = _partsWallMs(solarParts);
      if (isNaN(birthMs)) return null;

      // 12중절만 필터링하여 정렬
      var brackets = [];
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (!t || !t.atLocal) continue;
        // "(전년)" 등의 접미사 제거 후 매핑 조회
        var n = String(t.name || '').replace(/\([^)]*\)\s*$/, '').trim();
        var br = _JIEQI_MONTH_BRANCH[n];
        if (!br) continue;
        var ms = _termWallClockMs(t.atLocal);
        if (isNaN(ms)) continue;
        brackets.push({ ms: ms, branch: br });
      }
      if (!brackets.length) return null;
      brackets.sort(function (a, b) { return a.ms - b.ms; });

      // 생시 이전 마지막 중절 찾기
      var branch = null;
      for (var j = 0; j < brackets.length; j++) {
        if (birthMs >= brackets[j].ms) branch = brackets[j].branch;
      }
      // 🔴 한 해의 첫 節은 소한(丑)이므로, 그보다 이른 생시는 이 목록 안에 걸칠 중절이 없다.
      // 그 구간을 지배하는 節은 **전년 12월의 대설**이고 답은 언제나 子月 하나뿐이다.
      // 예전에는 여기서 null 을 내서 1월 1일~소한 출생의 년주·월주가 통째로 비었다
      // (실측 2026-08-28, 1950~2050 節 경계 표본에서 연 2건씩 202건이 null 이었다).
      if (!branch && brackets[0].branch === '\u4e11') branch = '\u5b50';
      if (!branch) return null;

      // 오자배년법: 年干으로 寅月 시작 천간 인덱스 결정
      var yearStem = yearGanStr ? String(yearGanStr).charAt(0) : null;
      var yinStartIdx = (yearStem && _YSTEM_YIN_START[yearStem] != null) ? _YSTEM_YIN_START[yearStem] : null;
      if (yinStartIdx == null) return null;

      // 寅(index 2)로부터의 오프셋으로 월간(月干) 계산
      var brIdx = _EB.indexOf(branch);
      if (brIdx < 0) return null;
      var offset = ((brIdx - 2) + 12) % 12;
      var stemIdx = (yinStartIdx + offset) % 10;
      return _HS[stemIdx] + branch;
    } catch (e) {
      return null;
    }
  }

  function _buildSolarParts(norm, solarFromLunar) {
    if (norm.calendarType === 'solar') {
      return _partsOf(norm.year, norm.month, norm.day, norm.hour, norm.minute, norm.second);
    }
    if (!solarFromLunar) return null;
    return _partsOf(solarFromLunar.year, solarFromLunar.month, solarFromLunar.day, norm.hour, norm.minute, norm.second);
  }

  function _buildDateContext(norm, options) {
    options = options || {};

    var cacheKey = _makeCacheKey(norm);
    var cached = _readCache(cacheKey);
    if (cached) {
      if (_applyCoreCalendarCorrection(cached)) {
        _writeCache(cacheKey, cached);
      }
      if (!cached.ganji || !cached.ganji.hour) {
        var cachedSolar = cached.solar || {};
        var cachedParts = _partsOf(cachedSolar.year, cachedSolar.month, cachedSolar.day, cachedSolar.hour, cachedSolar.minute, cachedSolar.second);
        var cachedTerms = cached.terms24 || _readValidatedSolarTerms(cachedParts ? cachedParts.year : null);
        var recomputedGanji = cachedParts ? _fallbackGanji(cachedParts, cached.lunar ? { raw: null } : null, cachedTerms) : null;
        cached.ganji = Object.assign({}, cached.ganji || {}, recomputedGanji || {});
        _writeCache(cacheKey, cached);
      }
      cached.meta = cached.meta || {};
      cached.meta.fromCache = true;
      cached.source = 'cache';
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
      var localOnly = options && options.localOnly === true;
      var solarFromLunar = null;

      if (norm.calendarType !== 'solar') {
        if (localOnly) {
          solarFromLunar = _fallbackSolarFromLunar(norm);
          fallbackUsed = true;
          diagnostics.push('local-only: solar conversion fallback');
        } else {
          solarFromLunar = await _fetchSolarFromLunar(norm);
        }
        if (!solarFromLunar) {
          solarFromLunar = _fallbackSolarFromLunar(norm);
          fallbackUsed = true;
          diagnostics.push('solar conversion fallback');
          hadProxyFailure = hadProxyFailure || !!_lastProxyFailure;
        }
      }

      var solarParts = _buildSolarParts(norm, solarFromLunar);
      if (!solarParts) throw new Error('Failed to resolve solar date');

      var lunarObj = null;
      if (norm.calendarType === 'solar') {
        if (localOnly) {
          lunarObj = _fallbackLunarFromSolar(solarParts);
          fallbackUsed = true;
          diagnostics.push('local-only: lunar conversion fallback');
        } else {
          lunarObj = await _fetchLunarFromSolar(solarParts);
        }
        if (!lunarObj) {
          lunarObj = _fallbackLunarFromSolar(solarParts);
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

      var apiTerms = [];
      if (!localOnly) {
        try {
          apiTerms = await _fetchSolarTerms(solarParts.year, solarParts.month, solarParts.day);
        } catch (e) {
          diagnostics.push('solar terms API failed');
          hadProxyFailure = true;
        }
      }
      var fallbackTerms = _fallbackSolarTerms(solarParts.year);
      if (!apiTerms.length) {
        diagnostics.push(localOnly ? 'local-only: solar terms unavailable' : 'solar terms unavailable');
        hadProxyFailure = hadProxyFailure || !!_lastProxyFailure;
      }
      var terms = _normalizeTerms(apiTerms, fallbackTerms, solarParts.year);
      var termsSource = terms && terms.length ? String(terms[0].source || 'unknown') : 'unavailable';
      if (termsSource === 'validated-cache') {
        diagnostics.push('solar-terms-validated-cache');
      }

      var ganji = _fallbackGanji(solarParts, lunarObj, terms);
      if (!ganji || !ganji.year || !ganji.month || !ganji.day) {
        diagnostics.push('ganji limited');
      }

      // 절기 데이터로 월주 보정 (CST/KST 오차 수정 및 KASI 정밀 데이터 우선 적용)
      // terms24에 12중절이 충분하면 ganji.month를 정확한 값으로 덮어씀
      if (ganji && ganji.year && terms && terms.length > 0) {
        var correctedMonth = _computeMonthGanjiFromTerms(terms, solarParts, ganji.year);
        if (correctedMonth && correctedMonth.length === 2) {
          ganji.month = correctedMonth;
          diagnostics.push('month-corrected-by-terms');
        }
      }

      var ipchun = _extractIpchun(terms);

      var context = {
        version: 1,
        cacheKey: cacheKey,
        dateKey: _makeCalendarDateKey(norm),
        source: termsSource === 'validated-cache' ? 'validated-cache' : (fallbackUsed ? 'local' : 'kasi'),
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
          year: solarParts.year,
          month: solarParts.month,
          day: solarParts.day,
          hour: solarParts.hour,
          minute: solarParts.minute,
          second: solarParts.second,
          isoLocal: _partsToIsoLocal(solarParts)
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
          day: ganji ? ganji.day : null,
          hour: ganji ? ganji.hour || null : null
        },
        terms24: terms,
        ipchun: ipchun,
        leapMonth: lunarObj ? !!lunarObj.isLeap : false,
        meta: {
          fetchedAt: new Date().toISOString(),
          fromCache: false,
          fallbackUsed: fallbackUsed,
          solarTermsSource: termsSource,
          diagnostics: diagnostics,
          warnings: fallbackUsed ? ['KASI_FALLBACK_USED'] : [],
          userMessage: hadProxyFailure ? (_lastProxyFailure && _lastProxyFailure.message) || _config.maintenanceMessage : null
        }
      };

      _applyCoreCalendarCorrection(context);

      if (fallbackUsed && hadProxyFailure) {
        _warnOnce('kasi-fallback-' + context.dateKey, 'KASI fallback used', {
          dateKey: context.dateKey,
          reason: (_lastProxyFailure && _lastProxyFailure.reason) || 'KASI_UPSTREAM_ERROR'
        });
      }

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
      var list = Array.isArray(inputs) ? inputs : [];
      var opts = options || {};
      var setCurrentIndex = (typeof opts.setCurrentIndex === 'number') ? opts.setCurrentIndex : -1;
      return Promise.all(list.map((input, idx) => {
        var localOptions = Object.assign({}, opts);
        localOptions.setCurrent = setCurrentIndex === idx;
        return this.resolveDateContext(input, localOptions);
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

    /**
     * 🔴 정본 진입점. 인자는 KST 벽시계 부품이다 — `{ year, month, day, hour, minute, second? }`.
     * 로컬 Date 를 만들어 넘기지 말 것(서머타임 구멍에서 조용히 다른 시각으로 접힌다).
     */
    computeGanjiFromParts: function (parts, terms) {
      return _clone(_computeGanjiFromParts(parts, terms));
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
      _methodCache.clear();
      _methodInflight.clear();
      _solarTermYearCache.clear();
      _warnedKeys.clear();
      _namedContexts = Object.create(null);
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(_config.storageKeyPrefix) === 0) keys.push(k);
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
    },

    // circuit breaker: saju-engine 등 외부 모듈이 KASI 유지보수 상태를 확인할 수 있도록 노출
    _isMaintenanceCircuitOpen: function () {
      return _isMaintenanceCircuitOpen();
    },

    getMaintenanceStatus: function () {
      if (!_isMaintenanceCircuitOpen()) return null;
      return {
        until: _maintenanceUntil,
        message: _lastProxyFailure && _lastProxyFailure.message ? _lastProxyFailure.message : _config.maintenanceMessage
      };
    }
  };

  if (w.__CD_SAJU_TEST_MODE__) {
    service.__test = {
      // 🔴 전부 KST 벽시계 부품을 받는다. PR-E 이전에는 위 두 줄이 로컬 Date 어댑터였고
      //    검증기 네 개가 Date 를 넘겼다 — 같은 커밋에서 전부 부품으로 옮겼다.
      computeMonthGanjiFromTerms: function (terms, parts, yearGanStr) {
        return _computeMonthGanjiFromTerms(terms, parts, yearGanStr);
      },
      computeGanjiFromParts: _computeGanjiFromParts,
      normalizeTerms: _normalizeTerms,
      readValidatedSolarTerms: _readValidatedSolarTerms
    };
  }

  w.KasiCalendarService = service;
})(window);
