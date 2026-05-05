(function() {
  var STORAGE_KEY = 'OLYMPUS_ORACLE_PROFILE';
  var NS = 'FORTUNE_APP_USER_PROFILES';

  function getLocalTimezoneHours() {
    var offset = -new Date().getTimezoneOffset() / 60;
    if (!Number.isFinite(offset)) return 9;
    return offset;
  }

  function sunSignFromDate(month, day) {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
    return 'pisces';
  }

  function tropicalDegreeToSign(deg) {
    var normalized = ((deg % 360) + 360) % 360;
    var signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
    return signs[Math.floor(normalized / 30)];
  }

  function ensureSwissBridgeLoaded() {
    if (window.swisseph || window.Swe || window.swe) return Promise.resolve(true);

    return new Promise(function(resolve) {
      var src = '/js/swisseph-loader.js?v=20260328-lazy1';

      function done(ok) {
        try { window.removeEventListener('swisseph:ready', onReady); } catch (_) {}
        resolve(Boolean(ok));
      }

      function onReady() { done(true); }
      window.addEventListener('swisseph:ready', onReady, { once: true });

      var existing = document.querySelector('script[src*="/js/swisseph-loader.js"]');
      if (!existing) {
        var s = document.createElement('script');
        s.type = 'module';
        s.src = src;
        s.async = true;
        s.defer = true;
        s.onerror = function() { done(false); };
        s.onload = function() {
          if (window.swisseph || window.Swe || window.swe) done(true);
        };
        document.head.appendChild(s);
      }

      setTimeout(function() {
        if (window.swisseph || window.Swe || window.swe) done(true);
        else done(false);
      }, 12000);
    });
  }

  function computeSunSignWithSwissBridge(payload) {
    return ensureSwissBridgeLoaded().then(function(ok) {
      if (!ok) throw new Error('swisseph bridge unavailable');

      var swe = window.swisseph || window.Swe || window.swe;
      if (!swe) throw new Error('swisseph object missing');

      var calcFn = swe.swe_calc_ut || swe.calc_ut;
      if (typeof calcFn !== 'function') throw new Error('swisseph calc function missing');

      var year = Number(payload && payload.year);
      var month = Number(payload && payload.month);
      var day = Number(payload && payload.day);
      var hour = Number(payload && payload.hour);
      var minute = Number(payload && payload.minute);
      var tz = Number(payload && payload.timezone);

      if (!Number.isFinite(hour)) hour = 12;
      if (!Number.isFinite(minute)) minute = 0;
      if (!Number.isFinite(tz)) tz = getLocalTimezoneHours();

      var utcHour = (hour + (minute / 60)) - tz;
      var baseMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
      if (!Number.isFinite(baseMs)) throw new Error('invalid payload datetime');

      var jdUT = (baseMs + (utcHour * 3600000)) / 86400000 + 2440587.5;
      var sunId = Number.isFinite(Number(swe.SE_SUN)) ? Number(swe.SE_SUN) : 0;
      var flags = Number(swe.SEFLG_SWIEPH || 0) | Number(swe.SEFLG_SPEED || 0);
      var raw = calcFn.call(swe, jdUT, sunId, flags);
      var lon = Array.isArray(raw) ? Number(raw[0]) : Number(raw && raw[0]);
      if (!Number.isFinite(lon)) throw new Error('invalid swisseph sun longitude');

      return tropicalDegreeToSign(lon);
    });
  }

  function getSunKeyFromApi(payload) {
    return fetch('/api/vedic/planets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res) { return res.ok ? res.json() : Promise.reject(new Error('vedic api failed')); })
      .then(function(data) {
        if (!data || !data.ok || !data.planets || typeof data.planets.Sun !== 'number') throw new Error('invalid vedic payload');
        var ayanamsa = typeof data.ayanamsa === 'number' ? data.ayanamsa : 0;
        var tropicalSun = (data.planets.Sun + ayanamsa) % 360;
        return tropicalDegreeToSign(tropicalSun);
      });
  }

  function getCurrentProfileFromStorage() {
    try {
      var currentId = localStorage.getItem(NS + '.current');
      if (!currentId) return null;
      var list = JSON.parse(localStorage.getItem(NS + '.list') || '[]');
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === currentId) return list[i];
      }
    } catch (e) {}
    return null;
  }

  function getCurrentProfile() {
    var manager = window.DestinyProfileManager;
    if (manager && manager.storage && typeof manager.storage.current === 'function') {
      try {
        return manager.storage.current();
      } catch (e) {}
    }
    return getCurrentProfileFromStorage();
  }

  function getMainFormProfileFallback() {
    try {
      var birthDateEl = document.getElementById('birthDate');
      var birthDate = birthDateEl ? String(birthDateEl.value || '').trim() : '';
      if (!birthDate) return null;

      var parts = birthDate.split('-');
      if (parts.length < 3) return null;
      var year = Number(parts[0]);
      var month = Number(parts[1]);
      var day = Number(parts[2]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

      var hourRaw = Number((document.getElementById('birthHour') || {}).value);
      var minuteRaw = Number((document.getElementById('birthMinute') || {}).value);
      var hour = Number.isFinite(hourRaw) ? hourRaw : 12;
      var minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;

      var countrySel = document.getElementById('birthCountry');
      var opt = countrySel ? countrySel.options[countrySel.selectedIndex] : null;
      var lat = Number(opt ? opt.getAttribute('data-lat') : 37.5665);
      var lon = Number(opt ? opt.getAttribute('data-long') : 126.9780);
      var tzOffset = Number(opt ? (opt.getAttribute('data-base-tz') || opt.getAttribute('data-tz')) : 9);

      return {
        name: '',
        birth: { year: year, month: month, day: day, hour: hour, minute: minute },
        location: {
          lat: Number.isFinite(lat) ? lat : 37.5665,
          lng: Number.isFinite(lon) ? lon : 126.9780,
          tzOffset: Number.isFinite(tzOffset) ? tzOffset : 9,
          baseTzOffset: Number.isFinite(tzOffset) ? tzOffset : 9,
        }
      };
    } catch (e) {}
    return null;
  }

  function showMissingProfileMessage() {
    if (typeof window._toast === 'function') {
      window._toast('⚠️ 먼저 프로필 카드를 저장해 주세요. (생년월일/시간 필요)', 'warn');
    }
    if (typeof window.dpScrollToForm === 'function') {
      window.dpScrollToForm();
    }
  }

  function formatDateTimeFromBirth(birth) {
    var year = Number(birth && birth.year);
    var month = Number(birth && birth.month);
    var day = Number(birth && birth.day);
    if (!year || !month || !day) return null;
    var hour = Number(birth && birth.hour);
    var minute = Number(birth && birth.minute);
    if (!Number.isFinite(hour)) hour = 12;
    if (!Number.isFinite(minute)) minute = 0;

    return {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      date: year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'),
      time: String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')
    };
  }

  function commitAndMove(profilePayload) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profilePayload));
    } catch (e) {}
    window.location.href = '/olympus';
  }

  function openOlympusOracleModal() {
    var currentProfile = getCurrentProfile() || getMainFormProfileFallback();
    var parsed = formatDateTimeFromBirth(currentProfile && currentProfile.birth);
    if (!parsed) {
      showMissingProfileMessage();
      return false;
    }

    var location = (currentProfile && currentProfile.location) || {};
    var lat = Number(location.lat);
    var lon = Number(location.lng);
    if (!Number.isFinite(lon)) lon = Number(location.lon);
    var tzOffset = Number(location.baseTzOffset);
    if (!Number.isFinite(tzOffset)) tzOffset = Number(location.tzOffset);
    if (Number.isFinite(tzOffset) && Math.abs(tzOffset) > 24) tzOffset = tzOffset / 60;

    var payload = {
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      hour: parsed.hour,
      minute: parsed.minute,
      timezone: Number.isFinite(tzOffset) ? tzOffset : getLocalTimezoneHours(),
      lat: Number.isFinite(lat) ? lat : 37.5665,
      lon: Number.isFinite(lon) ? lon : 126.9780
    };

    getSunKeyFromApi(payload).then(function(sunKey) {
      commitAndMove({
        name: currentProfile && currentProfile.name ? currentProfile.name : '',
        date: parsed.date,
        time: parsed.time,
        sunKey: sunKey
      });
    }).catch(function(err) {
      console.error('[Astrology API] request failed', {
        endpoint: '/api/vedic/planets',
        status: 0,
        errorMessage: String((err && err.message) || err || 'unknown'),
        requestId: null,
      });
      return computeSunSignWithSwissBridge(payload).then(function(localSunKey) {
        if (typeof window._toast === 'function') {
          window._toast('⚠️ API 지연으로 기기 내 Swiss 계산으로 계속 진행합니다.', 'warn');
        }
        commitAndMove({
          name: currentProfile && currentProfile.name ? currentProfile.name : '',
          date: parsed.date,
          time: parsed.time,
          sunKey: localSunKey
        });
      }).catch(function(localErr) {
        console.warn('[olympus] local swiss fallback failed', localErr);
        var fallbackSunKey = sunSignFromDate(parsed.month, parsed.day);
        if (typeof window._toast === 'function') {
          window._toast('⚠️ 점성술 API가 지연되어 기본 별자리 모드로 진행합니다.', 'warn');
        }
        commitAndMove({
          name: currentProfile && currentProfile.name ? currentProfile.name : '',
          date: parsed.date,
          time: parsed.time,
          sunKey: fallbackSunKey
        });
      });
    });
    return true;
  }

  function closeOlympusOracleModal() {
    return;
  }

  window.openOlympusOracleModal = openOlympusOracleModal;
  window.closeOlympusOracleModal = closeOlympusOracleModal;
})();
