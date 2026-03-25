(function() {
  var STORAGE_KEY = 'OLYMPUS_ORACLE_PROFILE';
  var OVERLAY_ID = 'olympusOracleOverlay';
  var STYLE_ID = 'olympusOracleStyles';
  var OPEN_CLASS = 'is-open';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.olympus-oracle-overlay{position:fixed;inset:0;background:rgba(2,6,23,0.76);display:none;align-items:center;justify-content:center;z-index:9999;padding:24px;}' +
      '.olympus-oracle-overlay.is-open{display:flex;}' +
      '.olympus-oracle-card{position:relative;width:100%;max-width:520px;background:linear-gradient(180deg,#0a0f2b,#0b0720);border:1px solid rgba(201,168,76,0.3);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,0.55);color:#efe4c0;padding:24px;}' +
      '.olympus-oracle-header{display:flex;gap:16px;align-items:center;margin-bottom:18px;}' +
      '.olympus-oracle-logo{width:74px;height:74px;border-radius:14px;object-fit:cover;border:1px solid rgba(201,168,76,0.35);}' +
      '.olympus-oracle-title{font-size:1.1rem;font-weight:700;letter-spacing:0.08em;color:#f6d88a;}' +
      '.olympus-oracle-sub{font-size:0.85rem;color:rgba(255,255,255,0.65);margin-top:6px;line-height:1.4;}' +
      '.olympus-oracle-close{position:absolute;top:16px;right:16px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#efe4c0;border-radius:10px;width:36px;height:36px;cursor:pointer;}' +
      '.olympus-oracle-form{display:flex;flex-direction:column;gap:14px;}' +
      '.olympus-oracle-field{display:flex;flex-direction:column;gap:6px;font-size:0.85rem;color:rgba(255,255,255,0.7);}' +
      '.olympus-oracle-field input{height:44px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);background:rgba(9,12,30,0.9);color:#efe4c0;padding:0 12px;font-size:0.95rem;}' +
      '.olympus-oracle-field input:focus{outline:none;border-color:rgba(201,168,76,0.6);box-shadow:0 0 0 2px rgba(201,168,76,0.2);}' +
      '.olympus-oracle-actions{display:flex;gap:10px;margin-top:6px;}' +
      '.olympus-oracle-submit{flex:1;height:46px;border-radius:12px;border:1px solid rgba(201,168,76,0.6);background:linear-gradient(135deg,#c9a84c,#8b5e1a);color:#1c1403;font-weight:700;cursor:pointer;}' +
      '.olympus-oracle-submit:disabled{opacity:0.6;cursor:default;}' +
      '.olympus-oracle-error{min-height:18px;font-size:0.8rem;color:#fca5a5;margin-top:4px;}' +
      '@media (max-width:600px){.olympus-oracle-card{padding:20px;}.olympus-oracle-header{flex-direction:column;align-items:flex-start;}.olympus-oracle-logo{width:64px;height:64px;}}';
    document.head.appendChild(style);
  }

  function lockBody() {
    if (window._perf && typeof window._perf.lockBody === 'function') {
      window._perf.lockBody();
      return;
    }
    document.body.style.overflow = 'hidden';
  }

  function unlockBody() {
    if (window._perf && typeof window._perf.unlockBody === 'function') {
      window._perf.unlockBody();
      return;
    }
    document.body.style.overflow = '';
  }

  function ensureOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'olympus-oracle-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="olympus-oracle-card" role="dialog" aria-modal="true" aria-label="올림푸스 별자리 신탁">' +
      '<button class="olympus-oracle-close" type="button" aria-label="닫기">×</button>' +
      '<div class="olympus-oracle-header">' +
      '<img class="olympus-oracle-logo" src="/fuctionassets/olympus.webp" alt="올림푸스 신탁">' +
      '<div>' +
      '<div class="olympus-oracle-title">⚡ 올림푸스 별자리 신탁</div>' +
      '<div class="olympus-oracle-sub">프로필을 입력하면 곧바로 신탁으로 이동합니다.</div>' +
      '</div>' +
      '</div>' +
      '<form class="olympus-oracle-form">' +
      '<label class="olympus-oracle-field">이름 (선택)' +
      '<input type="text" name="name" placeholder="이름을 입력하세요" autocomplete="name"></label>' +
      '<label class="olympus-oracle-field">생년월일' +
      '<input type="date" name="date" required></label>' +
      '<label class="olympus-oracle-field">태어난 시간 (선택)' +
      '<input type="time" name="time"></label>' +
      '<div class="olympus-oracle-actions">' +
      '<button class="olympus-oracle-submit" type="submit">신탁 시작하기</button>' +
      '</div>' +
      '<div class="olympus-oracle-error" role="status" aria-live="polite"></div>' +
      '</form>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(event) {
      if (event.target === overlay) closeOlympusOracleModal();
    });

    var closeBtn = overlay.querySelector('.olympus-oracle-close');
    if (closeBtn) closeBtn.addEventListener('click', closeOlympusOracleModal);

    var form = overlay.querySelector('.olympus-oracle-form');
    if (form) {
      form.addEventListener('submit', function(event) {
        event.preventDefault();
        handleSubmit(overlay, form);
      });
    }

    return overlay;
  }

  function showError(overlay, message) {
    var el = overlay.querySelector('.olympus-oracle-error');
    if (el) el.textContent = message || '';
  }

  function setLoading(overlay, loading) {
    var btn = overlay.querySelector('.olympus-oracle-submit');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? '신탁 계산 중...' : '신탁 시작하기';
  }

  function parseDateParts(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  function parseTimeParts(timeStr) {
    if (!timeStr) return { hour: 12, minute: 0 };
    var parts = timeStr.split(':');
    var hour = parseInt(parts[0] || '12', 10);
    var minute = parseInt(parts[1] || '0', 10);
    if (!Number.isFinite(hour)) hour = 12;
    if (!Number.isFinite(minute)) minute = 0;
    return { hour: hour, minute: minute };
  }

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

  function getSunKeyFromApi(payload, fallbackKey) {
    return fetch('/api/vedic/planets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        if (!data || !data.ok || !data.planets || typeof data.planets.Sun !== 'number') return fallbackKey;
        var ayanamsa = typeof data.ayanamsa === 'number' ? data.ayanamsa : 0;
        var tropicalSun = (data.planets.Sun + ayanamsa) % 360;
        return tropicalDegreeToSign(tropicalSun);
      })
      .catch(function() { return fallbackKey; });
  }

  function handleSubmit(overlay, form) {
    var name = (form.elements.name && form.elements.name.value || '').trim();
    var date = form.elements.date && form.elements.date.value;
    var time = form.elements.time && form.elements.time.value;

    if (!date) {
      showError(overlay, '생년월일은 필수입니다.');
      return;
    }

    var dateParts = parseDateParts(date);
    if (!dateParts) {
      showError(overlay, '생년월일 형식을 확인해주세요.');
      return;
    }

    showError(overlay, '');
    setLoading(overlay, true);

    var timeParts = parseTimeParts(time);
    var fallbackKey = sunSignFromDate(dateParts.month, dateParts.day);

    var timezone = getLocalTimezoneHours();
    var payload = {
      year: dateParts.year,
      month: dateParts.month,
      day: dateParts.day,
      hour: timeParts.hour,
      minute: timeParts.minute,
      timezone: timezone
    };

    getSunKeyFromApi(payload, fallbackKey).then(function(sunKey) {
      try {
        var profile = {
          name: name,
          date: date,
          time: time,
          timezone: timezone,
          sunKey: sunKey
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch (e) {}
      window.location.href = '/olympus';
    }).catch(function() {
      setLoading(overlay, false);
      showError(overlay, '신탁 계산에 실패했습니다. 다시 시도해주세요.');
    });
  }

  function openOlympusOracleModal() {
    ensureStyles();
    var overlay = ensureOverlay();
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add(OPEN_CLASS);
    overlay.setAttribute('aria-hidden', 'false');
    showError(overlay, '');
    setLoading(overlay, false);
    lockBody();
    var dateInput = overlay.querySelector('input[name="date"]');
    if (dateInput) dateInput.focus();
  }

  function closeOlympusOracleModal() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.remove(OPEN_CLASS);
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    unlockBody();
  }

  window.openOlympusOracleModal = openOlympusOracleModal;
  window.closeOlympusOracleModal = closeOlympusOracleModal;
})();
