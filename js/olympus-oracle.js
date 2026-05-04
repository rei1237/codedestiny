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
    var currentProfile = getCurrentProfile();
    var parsed = formatDateTimeFromBirth(currentProfile && currentProfile.birth);
    if (!parsed) {
      showMissingProfileMessage();
      return;
    }

    var payload = {
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      hour: parsed.hour,
      minute: parsed.minute,
      timezone: getLocalTimezoneHours()
    };

    getSunKeyFromApi(payload).then(function(sunKey) {
      commitAndMove({
        name: currentProfile && currentProfile.name ? currentProfile.name : '',
        date: parsed.date,
        time: parsed.time,
        sunKey: sunKey
      });
    }).catch(function() {
      if (typeof window._toast === 'function') {
        window._toast('⚠️ 점성술 API 응답이 없어 올림푸스 신탁을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.', 'warn');
      }
    });
  }

  function closeOlympusOracleModal() {
    return;
  }

  window.openOlympusOracleModal = openOlympusOracleModal;
  window.closeOlympusOracleModal = closeOlympusOracleModal;
})();
