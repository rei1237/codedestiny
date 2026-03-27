(function () {
  'use strict';

  var state = {
    initialized: false,
    loading: false,
    lastResult: null,
  };

  var refs = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureRefs() {
    refs.overlay = byId('sajuTotemOverlay');
    refs.closeBtn = byId('sajuTotemCloseBtn');
    refs.form = byId('sajuTotemForm');
    refs.year = byId('stBirthYear');
    refs.month = byId('stBirthMonth');
    refs.day = byId('stBirthDay');
    refs.hour = byId('stBirthHour');
    refs.minute = byId('stBirthMinute');
    refs.loading = byId('stLoading');
    refs.result = byId('stResult');
    refs.error = byId('stError');
    refs.img = byId('stResultImage');
    refs.headline = byId('stHeadline');
    refs.summary = byId('stSummary');
    refs.lines = byId('stLines');
    refs.downloadBtn = byId('stDownloadBtn');
    refs.shareBtn = byId('stShareBtn');
    return !!(refs.overlay && refs.form);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setLoading(isLoading) {
    state.loading = !!isLoading;
    if (refs.loading) refs.loading.hidden = !isLoading;
    if (refs.form) {
      var controls = refs.form.querySelectorAll('input, button');
      controls.forEach(function (el) {
        if (el.id !== 'sajuTotemCloseBtn') el.disabled = !!isLoading;
      });
    }
  }

  function showError(message) {
    if (!refs.error) return;
    refs.error.textContent = message || '';
    refs.error.hidden = !message;
  }

  function resetResult() {
    if (refs.result) refs.result.hidden = true;
    showError('');
  }

  function toInt(value, fallback) {
    var n = parseInt(String(value == null ? '' : value), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max, fallback) {
    var n = toInt(value, fallback);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function parseBirthDateString(dateLike) {
    if (!dateLike) return null;
    var text = String(dateLike).trim();
    if (!text) return null;
    var m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    return {
      year: toInt(m[1], null),
      month: toInt(m[2], null),
      day: toInt(m[3], null),
    };
  }

  function extractBirthFromProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;

    var direct = profile.birth;
    var identity = profile.identity && profile.identity.birth;
    var domains = profile.domains && profile.domains.birth;
    var candidate = direct || identity || domains || null;
    var parsedDate = parseBirthDateString(profile.birthDate || (profile.identity && profile.identity.birthDate));

    var year = candidate && candidate.year != null ? toInt(candidate.year, null) : (parsedDate ? parsedDate.year : null);
    var month = candidate && candidate.month != null ? toInt(candidate.month, null) : (parsedDate ? parsedDate.month : null);
    var day = candidate && candidate.day != null ? toInt(candidate.day, null) : (parsedDate ? parsedDate.day : null);
    var hour = candidate && candidate.hour != null ? toInt(candidate.hour, 12) : 12;
    var minute = candidate && candidate.minute != null ? toInt(candidate.minute, 0) : 0;

    if (!year || !month || !day) return null;
    return {
      year: clamp(year, 1900, 2100, year),
      month: clamp(month, 1, 12, month),
      day: clamp(day, 1, 31, day),
      hour: clamp(hour, 0, 23, 12),
      minute: clamp(minute, 0, 59, 0),
    };
  }

  function getCurrentProfileFromStorage() {
    try {
      if (window.DestinyProfileManager && window.DestinyProfileManager.storage && typeof window.DestinyProfileManager.storage.current === 'function') {
        var profile = window.DestinyProfileManager.storage.current();
        if (profile) return profile;
      }
    } catch (e) {
    }

    try {
      var currentId = localStorage.getItem('FORTUNE_APP_USER_PROFILES.current');
      var rawList = localStorage.getItem('FORTUNE_APP_USER_PROFILES.list');
      var list = JSON.parse(rawList || '[]');
      if (!Array.isArray(list) || !list.length) return null;
      if (currentId) {
        var found = list.find(function (item) { return item && item.id === currentId; });
        if (found) return found;
      }
      return list[0] || null;
    } catch (e2) {
      return null;
    }
  }

  function applyStoredProfileBirth() {
    if (!ensureRefs()) return;
    var profile = getCurrentProfileFromStorage();
    var birth = extractBirthFromProfile(profile);
    if (!birth) return;

    if (refs.year) refs.year.value = String(birth.year);
    if (refs.month) refs.month.value = String(birth.month);
    if (refs.day) refs.day.value = String(birth.day);
    if (refs.hour) refs.hour.value = String(birth.hour);
    if (refs.minute) refs.minute.value = String(birth.minute);
  }

  function openModal() {
    if (!ensureRefs()) return;
    applyStoredProfileBirth();
    refs.overlay.classList.add('is-open');
    document.body.classList.add('saju-totem-open');
    resetResult();
  }

  function closeModal() {
    if (!refs.overlay) return;
    refs.overlay.classList.remove('is-open');
    document.body.classList.remove('saju-totem-open');
    setLoading(false);
  }

  function collectPayload() {
    return {
      birthYear: refs.year ? refs.year.value : '',
      birthMonth: refs.month ? refs.month.value : '',
      birthDay: refs.day ? refs.day.value : '',
      birthHour: refs.hour ? refs.hour.value : '',
      birthMinute: refs.minute ? refs.minute.value : '',
    };
  }

  function renderResult(payload) {
    state.lastResult = payload;
    if (refs.result) refs.result.hidden = false;

    if (refs.img) {
      refs.img.src = payload.imageUrl;
      refs.img.alt = payload.result && payload.result.mainAnimal ? payload.result.mainAnimal + ' 파스텔 캐릭터' : '사주 동물 결과 이미지';
    }

    if (refs.headline) refs.headline.textContent = payload.result && payload.result.headlineKo ? payload.result.headlineKo : '당신의 동물 결과가 도착했어요!';

    var summaryText = [];
    if (payload.result) {
      summaryText.push('주요 오행: ' + (payload.result.dominantElement || '-'));
      summaryText.push('보조 오행: ' + (payload.result.secondaryElement || '-'));
      summaryText.push('오행 컬러: ' + (payload.result.colorKo || '-'));
      summaryText.push('동물 조합: ' + ((payload.result.animals || []).join(' + ') || '-'));
    }
    if (refs.summary) refs.summary.textContent = summaryText.join(' | ');

    if (refs.lines) {
      var lines = (payload.result && payload.result.personalityLines) || [];
      refs.lines.innerHTML = lines.map(function (line) {
        return '<li>' + escapeHtml(line) + '</li>';
      }).join('');
    }

    if (payload.fallback && payload.fallbackMessage) {
      showError(payload.fallbackMessage);
    } else {
      showError('');
    }
  }

  async function requestSajuAnimal(payload) {
    var res = await fetch('/api/saju-animal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    var data = await res.json().catch(function () { return null; });
    if (!res.ok || !data) {
      throw new Error((data && data.message) || '요청 처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
    return data;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.loading) return;
    if (!ensureRefs()) return;

    setLoading(true);
    showError('');

    try {
      var payload = collectPayload();
      var data = await requestSajuAnimal(payload);
      renderResult(data);
    } catch (error) {
      showError((error && error.message) || '앗, 동물을 데려오다가 길을 잃었어요! 기본 동물 이미지를 보여드릴게요 😢');
      if (refs.result) refs.result.hidden = false;
      if (refs.img) refs.img.src = '/fuctionassets/Who%20am%20I%20with%20saju.webp';
      if (refs.headline) refs.headline.textContent = '당신의 동물 결과를 임시 이미지로 안내해요';
      if (refs.summary) refs.summary.textContent = '잠시 후 다시 시도하면 더 정확한 사주 동물 결과를 받을 수 있어요.';
      if (refs.lines) {
        refs.lines.innerHTML = '<li>네트워크 또는 API 상태가 불안정할 때는 기본 이미지를 먼저 보여줍니다.</li>' +
          '<li>입력값을 확인한 뒤 다시 생성하면 개인화된 결과가 반영됩니다.</li>';
      }
    } finally {
      setLoading(false);
    }
  }

  function triggerDownload() {
    if (!state.lastResult || !state.lastResult.imageUrl) return;
    var a = document.createElement('a');
    a.href = state.lastResult.imageUrl;
    a.download = 'saju-animal-result.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function triggerShare() {
    if (!state.lastResult) return;
    var text = (state.lastResult.result && state.lastResult.result.headlineKo) || '사주로 보는 내 동물 결과';

    if (navigator.share) {
      try {
        await navigator.share({
          title: '사주로 보는 내 동물은?',
          text: text,
          url: location.href,
        });
        return;
      } catch (e) {
      }
    }

    try {
      await navigator.clipboard.writeText(text + ' ' + location.href);
      showError('결과 링크를 클립보드에 복사했어요!');
    } catch (error) {
      showError('공유를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  function bindEvents() {
    if (!ensureRefs() || state.initialized) return;

    refs.overlay.addEventListener('click', function (event) {
      if (event.target === refs.overlay) closeModal();
    });

    if (refs.closeBtn) refs.closeBtn.addEventListener('click', closeModal);
    if (refs.form) refs.form.addEventListener('submit', handleSubmit);
    if (refs.downloadBtn) refs.downloadBtn.addEventListener('click', triggerDownload);
    if (refs.shareBtn) refs.shareBtn.addEventListener('click', triggerShare);

    state.initialized = true;
  }

  window.openSajuTotemModal = function () {
    bindEvents();
    openModal();
  };

  window.closeSajuTotemModal = closeModal;
})();
