(function () {
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var COST_COINS = 500;
  var COIN_REASON = '인생의 책 생성 (13챕터)';
  var COIN_FEATURE_KEY = 'premium_pdf_saju_life_book';
  var API_TIMEOUT_MS = 140000;
  var LIFEBOOK_MIN_TOTAL_CHARS = 50000;
  var LIFEBOOK_STATE_STORAGE_KEY = '__cd_lifebook_state_v3__';
  var LIFEBOOK_API_BASE_CANDIDATES = ['/api/premium/saju/life-book', '/api/lifebook'];

  var CHAPTER_DEFINITIONS = [
    { index: 1, key: 'chapter_01_original_chart', title: '사주 원국 완전 해설 - 팔자 8글자의 비밀', subtitle: '년주·월주·일주·시주와 천간·지지 구조 해석' },
    { index: 2, key: 'chapter_02_core_temperament', title: '나의 설계도 - 월지·일간·조후와 기질의 뿌리', subtitle: '월지 환경과 조후를 중심으로 한 적응 전략' },
    { index: 3, key: 'chapter_03_five_elements_balance', title: '숨겨진 무기 - 용신·희신과 나만의 필살기', subtitle: '용신 방향성 기반의 현실 선택 설계' },
    { index: 4, key: 'chapter_04_ten_gods_structure', title: '대운 정밀 분석 - 인생의 큰 파도', subtitle: '10년 주기 흐름과 시기별 전략' },
    { index: 5, key: 'chapter_05_geokguk_calling', title: '격국과 사회적 소명 - 나의 성공 방정식', subtitle: '격국과 사회적 작동 방식의 결합 해석' },
    { index: 6, key: 'chapter_06_yongshin', title: '관계의 전략 - 인연의 법칙과 파트너십', subtitle: '인간관계 작동 원리와 회복 시나리오' },
    { index: 7, key: 'chapter_07_hapchung', title: '연애·결혼 완전 분석 - 사주가 말하는 나의 사랑', subtitle: '연애 본능과 관계 안정 전략' },
    { index: 8, key: 'chapter_08_wealth_career', title: '재물·직업 완전 전략 - 부의 그릇을 키우는 천기', subtitle: '수익 구조와 직업 전략의 통합 설계' },
    { index: 9, key: 'chapter_09_relationships', title: '건강·심신 에너지 완전 분석 - 오행으로 보는 회복법', subtitle: '오행 균형과 번아웃 회복 루틴' },
    { index: 10, key: 'chapter_10_health_energy', title: '가족·뿌리·내면 아이 - 내가 짊어진 오래된 이야기', subtitle: '가족 영향과 독립 과제의 현실 해석' },
    { index: 11, key: 'chapter_11_daeun', title: '인생의 위기와 전환점 - 무너질 때 다시 서는 법', subtitle: '위기 신호 분석과 현실 대응 전략' },
    { index: 12, key: 'chapter_12_seun_roadmap', title: '나만의 성공 루틴 - 운을 현실로 바꾸는 실행법', subtitle: '하루 루틴부터 1년 계획까지 실행 설계' },
    { index: 13, key: 'chapter_13_master_plan', title: '최종 운명 선언문 - 내 삶을 다시 쓰는 문장', subtitle: '핵심 구조 압축과 개인 맞춤 선언' }
  ];
  var CHAPTER_TITLES = CHAPTER_DEFINITIONS.map(function (chapter) { return chapter.title; });
  var ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];

  var MYSTIC_QUOTES = [
    '팔자(八字)의 결을 해독하는 중입니다...',
    '용신과 희신의 실마리를 정교하게 추적합니다...',
    '대운의 밀물과 썰물을 시간축으로 정리합니다...',
    '합충형파해 패턴을 챕터별 근거로 직조합니다...',
    '운명의 결을 실행 가능한 전략으로 번역하는 중입니다...'
  ];

  var state = {
    generating: false,
    reportId: '',
    paidReportId: '',
    paymentContext: null,
    generationSource: 'api',
    refundInFlight: false,
    payload: null,
    chapterTexts: {},
    chapterMeta: {},
    activeChapter: 1
  };

  function qs(id) { return document.getElementById(id); }

  function qsa(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function showOnly(screenId) {
    var screens = ['lbStartScreen', 'lbLoadingScreen', 'lbResultScreen', 'lbErrorScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
  }

  function notify(message) {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(String(message || ''));
      } else {
        window.alert(String(message || ''));
      }
    } catch (_) {}
  }

  function logLifeBookStage(stage, detail) {
    try {
      console.info('[LifeBook] ' + String(stage || ''), detail || {});
    } catch (_) {}
  }

  function isAuthOrPaymentError(error) {
    var msg = String(error && error.message || '').toLowerCase();
    return msg.indexOf('로그인') >= 0
      || msg.indexOf('401') >= 0
      || msg.indexOf('403') >= 0
      || msg.indexOf('결제') >= 0
      || msg.indexOf('402') >= 0;
  }

  function toSafeUserError(error) {
    var raw = String(error && error.message || '').trim();
    if (!raw) return '인생의 책 생성 중 오류가 발생했습니다.';
    if (/챕터\s*품질\s*검증\s*실패|chapter-\d+|quality/i.test(raw)) {
      return '리포트 품질 보정 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (/api\s*실패|timeout|quota|invalid\s*json/i.test(raw)) {
      return '리포트 생성 중 일시적인 응답 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    return raw;
  }

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function getAuthToken() {
    try {
      return String(localStorage.getItem('fortune_auth_token') || '').trim();
    } catch (_) {
      return '';
    }
  }

  function getAuthUser() {
    try {
      return safeParse(localStorage.getItem('fortune_auth_user') || 'null', null) || null;
    } catch (_) {
      return null;
    }
  }

  function getCurrentProfileFromStorage() {
    try {
      var list = safeParse(localStorage.getItem('FORTUNE_APP_USER_PROFILES.list') || '[]', []);
      var currentId = String(localStorage.getItem('FORTUNE_APP_USER_PROFILES.current') || '').trim();
      if (!Array.isArray(list) || !list.length) return null;
      if (currentId) {
        for (var i = 0; i < list.length; i += 1) {
          var row = list[i] || {};
          if (String(row.id || '').trim() === currentId) return row;
        }
      }
      return list[0] || null;
    } catch (_) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markdownToHtml(markdown) {
    var lines = String(markdown || '').replace(/\r/g, '').split('\n');
    var out = [];
    var inList = false;
    var inTable = false;

    function closeList() {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
    }

    function closeTable() {
      if (inTable) {
        out.push('</tbody></table>');
        inTable = false;
      }
    }

    for (var i = 0; i < lines.length; i += 1) {
      var line = String(lines[i] || '').trim();
      if (!line) {
        closeList();
        closeTable();
        continue;
      }

      if (/^\|.+\|$/.test(line)) {
        if (!inTable) {
          closeList();
          out.push('<table class="lb-table"><tbody>');
          inTable = true;
        }
        var cells = line.slice(1, -1).split('|').map(function (cell) { return cell.trim(); }).filter(Boolean);
        if (cells.length > 0 && !/^[-:]+$/.test(cells.join(''))) {
          out.push('<tr>' + cells.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join('') + '</tr>');
        }
        continue;
      }

      closeTable();

      if (/^###\s+/.test(line)) {
        closeList();
        out.push('<h3>' + escapeHtml(line.replace(/^###\s+/, '')) + '</h3>');
        continue;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        out.push('<h2>' + escapeHtml(line.replace(/^##\s+/, '')) + '</h2>');
        continue;
      }
      if (/^-\s+/.test(line)) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push('<li>' + escapeHtml(line.replace(/^-\s+/, '')) + '</li>');
        continue;
      }
      if (/^>\s*/.test(line)) {
        closeList();
        out.push('<blockquote>' + escapeHtml(line.replace(/^>\s*/, '')) + '</blockquote>');
        continue;
      }

      closeList();
      out.push('<p>' + escapeHtml(line) + '</p>');
    }

    closeList();
    closeTable();
    return out.join('\n');
  }

  function formatDateLabel() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '.' + mm + '.' + dd;
  }

  function toKoElementToken(value) {
    var v = String(value || '').trim().toLowerCase();
    if (!v) return '';
    if (v === 'wood') return '목';
    if (v === 'fire') return '화';
    if (v === 'earth') return '토';
    if (v === 'metal') return '금';
    if (v === 'water') return '수';
    return String(value || '').trim();
  }

  function normalizeCalType(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'lunar' || v === 'l' || v === '음력') return 'lunar';
    if (v === 'lunar_leap' || v === 'leap' || v === '윤달' || v === '윤') return 'lunar_leap';
    return 'solar';
  }

  function parseDateParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  function parseTimeParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    return { hour: Number(m[1]), minute: Number(m[2]) };
  }

  function normalizeBirthParts() {
    var profile = null;
    var snapshot = null;
    var authUser = getAuthUser() || {};

    try { profile = window.__cdActiveBirthProfile || getCurrentProfileFromStorage() || null; } catch (_) { profile = null; }
    try { snapshot = window.__destinyFlowerSajuSnapshot || null; } catch (_) { snapshot = null; }

    var parsedAuthDate = parseDateParts((authUser && (authUser.birthDate || authUser.dateOfBirth)) || '');
    var parsedAuthTime = parseTimeParts((authUser && authUser.birthTime) || '');

    var fromProfile = profile && profile.birth ? profile.birth : null;
    var fromSnapshot = snapshot && snapshot.birth ? snapshot.birth : null;

    var parsedProfileDate = parseDateParts((fromProfile && fromProfile.birthDate) || (profile && profile.birthDate));
    var parsedProfileTime = parseTimeParts((fromProfile && fromProfile.birthTime) || (profile && profile.birthTime));

    var parsedSnapshotDate = parseDateParts((fromSnapshot && fromSnapshot.birthDate) || (snapshot && snapshot.birthDate));
    var parsedSnapshotTime = parseTimeParts((fromSnapshot && fromSnapshot.birthTime) || (snapshot && snapshot.birthTime));

    var year = Number((fromProfile && fromProfile.year) || (parsedProfileDate && parsedProfileDate.year) || (fromSnapshot && fromSnapshot.year) || (parsedSnapshotDate && parsedSnapshotDate.year) || (parsedAuthDate && parsedAuthDate.year) || 0);
    var month = Number((fromProfile && fromProfile.month) || (parsedProfileDate && parsedProfileDate.month) || (fromSnapshot && fromSnapshot.month) || (parsedSnapshotDate && parsedSnapshotDate.month) || (parsedAuthDate && parsedAuthDate.month) || 0);
    var day = Number((fromProfile && fromProfile.day) || (parsedProfileDate && parsedProfileDate.day) || (fromSnapshot && fromSnapshot.day) || (parsedSnapshotDate && parsedSnapshotDate.day) || (parsedAuthDate && parsedAuthDate.day) || 0);
    var hour = Number((fromProfile && fromProfile.hour) || (parsedProfileTime && parsedProfileTime.hour) || (fromSnapshot && fromSnapshot.hour) || (parsedSnapshotTime && parsedSnapshotTime.hour) || (parsedAuthTime && parsedAuthTime.hour) || 12);
    var minute = Number((fromProfile && fromProfile.minute) || (parsedProfileTime && parsedProfileTime.minute) || (fromSnapshot && fromSnapshot.minute) || (parsedSnapshotTime && parsedSnapshotTime.minute) || (parsedAuthTime && parsedAuthTime.minute) || 0);

    if (!Number.isFinite(year) || year < 1900 || year > 2100) year = 0;
    if (!Number.isFinite(month) || month < 1 || month > 12) month = 0;
    if (!Number.isFinite(day) || day < 1 || day > 31) day = 0;
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) hour = 12;
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) minute = 0;

    var calType = normalizeCalType(
      (fromProfile && (fromProfile.calType || fromProfile.calendarType))
      || (profile && (profile.calType || profile.calendarType))
      || (fromSnapshot && (fromSnapshot.calType || fromSnapshot.calendarType))
      || (snapshot && (snapshot.calType || snapshot.calendarType))
      || authUser.calendarType
      || authUser.calType
      || 'solar'
    );

    var timeUnknownRaw = String(
      (fromProfile && (fromProfile.timeUnknown || fromProfile.birthTimeUnknown || fromProfile.unknownTime))
      || (profile && (profile.timeUnknown || profile.birthTimeUnknown || profile.unknownTime))
      || (fromSnapshot && (fromSnapshot.timeUnknown || fromSnapshot.birthTimeUnknown || fromSnapshot.unknownTime))
      || (snapshot && (snapshot.timeUnknown || snapshot.birthTimeUnknown || snapshot.unknownTime))
      || authUser.timeUnknown
      || authUser.birthTimeUnknown
      || ''
    ).trim().toLowerCase();
    var timeUnknown = timeUnknownRaw === '1' || timeUnknownRaw === 'true' || timeUnknownRaw === 'y';

    var location = (profile && profile.location && typeof profile.location === 'object') ? profile.location : {};
    var timezone = String(location.tz || authUser.timezone || authUser.tz || 'Asia/Seoul').trim() || 'Asia/Seoul';
    var lat = Number(location.lat);
    var lon = Number(location.lng);
    if (!Number.isFinite(lat)) lat = 37.5665;
    if (!Number.isFinite(lon)) lon = 126.9780;

    var profileId = String((profile && (profile.profileId || profile.id)) || authUser.profileId || authUser.id || '').trim();
    var name = String((profile && profile.name) || authUser.name || authUser.nickname || '사용자').trim() || '사용자';
    var gender = String((profile && profile.gender) || authUser.gender || 'OTHER').trim() || 'OTHER';
    var birthPlace = String((profile && (profile.birthPlace || (profile.location && profile.location.birthPlace) || profile.place)) || authUser.birthPlace || authUser.place || '').trim();

    var birthDate = [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
    var birthTime = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');

    return {
      profileId: profileId,
      name: name,
      gender: gender,
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      birthDate: birthDate,
      birthTime: birthTime,
      calType: calType,
      calendarType: calType,
      isLunar: calType === 'lunar' || calType === 'lunar_leap',
      timeUnknown: timeUnknown,
      birthPlace: birthPlace || undefined,
      timezoneName: timezone,
      timezone: timezone,
      lat: lat,
      lon: lon,
      valid: year > 0 && month > 0 && day > 0
    };
  }

  function buildEngineData() {
    var pillars = null;
    var elementWeights = null;
    var power = null;
    var johu = null;

    try { pillars = window.G_PILLARS || null; } catch (_) {}
    try { elementWeights = window.G_NATAL || null; } catch (_) {}
    try { power = window.G_POWER || null; } catch (_) {}
    try { johu = window.G_JOHU || null; } catch (_) {}

    var yongsin = '';
    var huisin = '';
    var gisin = '';

    if (power && Array.isArray(power.yongshin) && power.yongshin.length) {
      yongsin = toKoElementToken(power.yongshin[0]);
      huisin = toKoElementToken(power.yongshin[1] || '');
    }
    if (power && Array.isArray(power.kijishin) && power.kijishin.length) {
      gisin = toKoElementToken(power.kijishin[0]);
    }

    return {
      pillars: pillars || undefined,
      elementWeights: elementWeights || undefined,
      dayMaster: {
        strength: power && typeof power.isStrong === 'boolean' ? (power.isStrong ? '신강' : '신약') : '',
        strengthScore: power && Number.isFinite(Number(power.score)) ? Number(power.score) : 0,
        reasoning: []
      },
      usefulGods: {
        yongsin: { element: yongsin },
        huisin: { element: huisin },
        gisin: { element: gisin }
      },
      tenGods: {
        distribution: power && typeof power.tenGods === 'object' ? power.tenGods : {}
      },
      seasonMeta: johu || undefined
    };
  }

  function buildSajuDataText(birth, engineData) {
    var lines = [];
    var pillars = engineData && engineData.pillars ? engineData.pillars : null;
    var elementWeights = engineData && engineData.elementWeights ? engineData.elementWeights : null;
    var useful = engineData && engineData.usefulGods ? engineData.usefulGods : null;

    if (pillars) {
      var y = pillars.y || pillars.year || {};
      var m = pillars.m || pillars.month || {};
      var d = pillars.d || pillars.day || {};
      var h = pillars.h || pillars.hour || {};
      lines.push('년주: ' + String((y.g || '') + (y.j || '') || y.ganji || '').trim());
      lines.push('월주: ' + String((m.g || '') + (m.j || '') || m.ganji || '').trim());
      lines.push('일주: ' + String((d.g || '') + (d.j || '') || d.ganji || '').trim());
      lines.push('시주: ' + String((h.g || '') + (h.j || '') || h.ganji || '').trim());
      lines.push('일간(日干): ' + String(d.g || d.stem || '').trim());
      lines.push('월지(月支): ' + String(m.j || m.branch || '').trim());
    }

    if (elementWeights) {
      lines.push(
        '오행 분포: '
        + '목(木) ' + Number(elementWeights.wood || 0)
        + ' / 화(火) ' + Number(elementWeights.fire || 0)
        + ' / 토(土) ' + Number(elementWeights.earth || 0)
        + ' / 금(金) ' + Number(elementWeights.metal || 0)
        + ' / 수(水) ' + Number(elementWeights.water || 0)
      );
    }

    if (useful) {
      lines.push('용신(用神): ' + String(useful.yongsin && useful.yongsin.element || '').trim());
      lines.push('희신(喜神): ' + String(useful.huisin && useful.huisin.element || '').trim());
      lines.push('기신(忌神): ' + String(useful.gisin && useful.gisin.element || '').trim());
    }

    lines.push('생년월일: ' + [birth.year, birth.month, birth.day].join('-'));
    lines.push('출생시각: ' + String(birth.hour).padStart(2, '0') + ':' + String(birth.minute).padStart(2, '0'));
    return lines.filter(function (line) { return String(line || '').trim().length > 0; }).join('\n');
  }

  function buildPayload() {
    var birth = normalizeBirthParts();
    var engineData = buildEngineData();
    var sajuData = buildSajuDataText(birth, engineData);
    return {
      profileId: birth.profileId || undefined,
      name: birth.name,
      gender: birth.gender,
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute,
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      calType: birth.calType,
      calendarType: birth.calendarType,
      isLunar: birth.isLunar,
      timeUnknown: birth.timeUnknown,
      birthPlace: birth.birthPlace || undefined,
      timezoneName: birth.timezoneName,
      timezone: birth.timezone,
      lat: birth.lat,
      lon: birth.lon,
      _premiumStrictPayload: true,
      _premiumStrictValidation: true,
      sajuData: sajuData,
      engineData: engineData,
      birthData: {
        profileId: birth.profileId || undefined,
        name: birth.name,
        gender: birth.gender,
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        minute: birth.minute,
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        calType: birth.calType,
        calendarType: birth.calendarType,
        isLunar: birth.isLunar,
        timeUnknown: birth.timeUnknown,
        birthPlace: birth.birthPlace || undefined,
        timezoneName: birth.timezoneName,
        timezone: birth.timezone,
        lat: birth.lat,
        lon: birth.lon
      },
      profile: {
        profileId: birth.profileId || undefined,
        name: birth.name,
        gender: birth.gender,
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        calendarType: birth.calendarType,
        isLunar: birth.isLunar,
        timeUnknown: birth.timeUnknown,
        birthPlace: birth.birthPlace || undefined,
        timezone: birth.timezone
      }
    };
  }

  function createReportId(payload) {
    var seed = [
      payload.name,
      payload.gender,
      payload.year,
      payload.month,
      payload.day,
      payload.hour,
      payload.minute,
      Date.now(),
      Math.random().toString(36).slice(2, 10)
    ].join('|');
    var hash = 0;
    for (var i = 0; i < seed.length; i += 1) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    return 'lifebook_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
  }

  function buildAuthHeaders(base) {
    var headers = Object.assign({}, base || {});
    var token = getAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  async function requestJson(url, options) {
    var controller = null;
    var timeoutHandle = null;
    try {
      if (typeof AbortController === 'function') {
        controller = new AbortController();
        timeoutHandle = setTimeout(function () {
          try { controller.abort(); } catch (_) {}
        }, API_TIMEOUT_MS);
      }

      var res = await fetch(url, Object.assign({}, options || {}, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      }));
      var data = await res.json().catch(function () { return {}; });
      return { ok: res.ok, status: res.status, data: data || {} };
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  function buildLifeBookApiCandidates(pathnameWithQuery) {
    var tail = String(pathnameWithQuery || '').trim();
    if (!tail) tail = '/';
    if (tail.charAt(0) !== '/') tail = '/' + tail;
    var out = [];
    for (var i = 0; i < LIFEBOOK_API_BASE_CANDIDATES.length; i += 1) {
      var base = String(LIFEBOOK_API_BASE_CANDIDATES[i] || '').trim().replace(/\/+$/, '');
      if (!base) continue;
      out.push(base + tail);
    }
    return out;
  }

  async function requestJsonWithFallback(pathnameWithQuery, options) {
    var urls = buildLifeBookApiCandidates(pathnameWithQuery);
    var last = { ok: false, status: 0, data: {} };
    for (var i = 0; i < urls.length; i += 1) {
      var response = await requestJson(urls[i], options);
      last = response;
      if (response.ok) return response;
      if (response.status === 401 || response.status === 403) return response;
      if (response.status === 402) return response;
    }
    return last;
  }

  async function requestJsonWithRouteFallback(pathnameCandidates, options) {
    var candidates = Array.isArray(pathnameCandidates) ? pathnameCandidates : [pathnameCandidates];
    var last = { ok: false, status: 0, data: {} };
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = String(candidates[i] || '').trim();
      if (!candidate) continue;
      var response = await requestJsonWithFallback(candidate, options);
      last = response;
      if (response.ok) return response;
      if (response.status === 401 || response.status === 403 || response.status === 402) return response;
    }
    return last;
  }

  function getTotalGeneratedChars() {
    var total = 0;
    for (var chapter = 1; chapter <= TOTAL_CHAPTERS; chapter += 1) {
      total += String(state.chapterTexts[chapter] || '').trim().length;
    }
    return total;
  }

  async function fetchTextWithFallback(pathnameWithQuery, options) {
    var urls = buildLifeBookApiCandidates(pathnameWithQuery);
    var lastStatus = 0;
    for (var i = 0; i < urls.length; i += 1) {
      try {
        var res = await fetch(urls[i], Object.assign({}, options || {}, {
          credentials: 'include',
          cache: 'no-store'
        }));
        if (res.ok) {
          return { ok: true, status: res.status, text: await res.text() };
        }
        lastStatus = Number(res.status) || 0;
        if (lastStatus === 401 || lastStatus === 403 || lastStatus === 402) {
          return { ok: false, status: lastStatus, text: '' };
        }
      } catch (_) {}
    }
    return { ok: false, status: lastStatus, text: '' };
  }

  function persistState() {
    try {
      var payload = {
        reportId: String(state.reportId || ''),
        paidReportId: String(state.paidReportId || ''),
        payload: state.payload || null,
        chapterTexts: state.chapterTexts || {},
        chapterMeta: state.chapterMeta || {},
        activeChapter: Number(state.activeChapter || 1),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LIFEBOOK_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadPersistedState() {
    try {
      var raw = localStorage.getItem(LIFEBOOK_STATE_STORAGE_KEY);
      if (!raw) return;
      var saved = safeParse(raw, null);
      if (!saved || typeof saved !== 'object') return;
      state.reportId = String(saved.reportId || '');
      state.paidReportId = String(saved.paidReportId || '');
      state.payload = saved.payload || null;
      state.chapterTexts = saved.chapterTexts && typeof saved.chapterTexts === 'object' ? saved.chapterTexts : {};
      state.chapterMeta = saved.chapterMeta && typeof saved.chapterMeta === 'object' ? saved.chapterMeta : {};
      state.activeChapter = Number(saved.activeChapter || 1);
      if (!Number.isFinite(state.activeChapter) || state.activeChapter < 1 || state.activeChapter > TOTAL_CHAPTERS) {
        state.activeChapter = 1;
      }
    } catch (_) {}
  }

  function clearPersistedState() {
    try { localStorage.removeItem(LIFEBOOK_STATE_STORAGE_KEY); } catch (_) {}
    try { localStorage.removeItem('__cd_lifebook_state_v2__'); } catch (_) {}
    try { localStorage.removeItem('__cd_lifebook_state_v1__'); } catch (_) {}
    try { sessionStorage.removeItem(LIFEBOOK_STATE_STORAGE_KEY); } catch (_) {}
    try { sessionStorage.removeItem('__cd_lifebook_state_v2__'); } catch (_) {}
    try { sessionStorage.removeItem('__cd_lifebook_state_v1__'); } catch (_) {}
  }

  function syncStartPreviewChapters() {
    var modal = qs('lifeBookModal');
    if (!modal) return;
    var list = modal.querySelector('.lb-preview-chapters');
    if (!list) return;
    var items = list.querySelectorAll('.lb-chapter-item');
    if (!items || !items.length) return;
    for (var i = 0; i < items.length && i < CHAPTER_DEFINITIONS.length; i += 1) {
      var titleEl = items[i].querySelector('.lb-ch-title');
      if (titleEl) titleEl.textContent = CHAPTER_DEFINITIONS[i].title;
    }
  }

  function chapterCount() {
    var count = 0;
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      if (state.chapterTexts[i]) count += 1;
    }
    return count;
  }

  function setLoadingProgress(chapter, subtitle) {
    var chapterNum = qs('lbLoadingChapterNum');
    var chapterText = qs('lbLoadingChapter');
    var quote = qs('lbMysticQuote');
    var bar = qs('lbProgressBar');
    var progressText = qs('lbProgressText');

    if (chapterNum) chapterNum.textContent = 'Chapter ' + chapter;
    if (chapterText) chapterText.textContent = subtitle || CHAPTER_TITLES[chapter - 1] || ('Chapter ' + chapter);
    if (quote) quote.textContent = MYSTIC_QUOTES[(chapter - 1) % MYSTIC_QUOTES.length];

    var completed = chapterCount();
    var percent = Math.max(0, Math.min(100, Math.round((completed / TOTAL_CHAPTERS) * 100)));
    if (bar) bar.style.width = percent + '%';
    if (progressText) {
      var current = Math.max(1, Math.min(TOTAL_CHAPTERS, Number(chapter) || 1));
      progressText.textContent = '현재 13장 중 ' + current + '장 생성 중 · 완료 ' + completed + '장';
    }

    var dots = qsa(qs('lbChapterIcons'), '.lb-ch-dot');
    dots.forEach(function (dot) {
      var num = Number(dot.getAttribute('data-lbch') || 0);
      dot.classList.remove('lb-ch-dot--done', 'lb-ch-dot--active');
      if (num < chapter) dot.classList.add('lb-ch-dot--done');
      if (num === chapter) dot.classList.add('lb-ch-dot--active');
    });
  }

  function setLoadingStatusText(message) {
    var loadingStatus = qs('lbLoadingStatus');
    if (loadingStatus) loadingStatus.textContent = String(message || '');
  }

  function renderResultChapter(chapter) {
    var contentEl = qs('lbChapterContent');
    if (!contentEl) return;
    var text = String(state.chapterTexts[chapter] || '').trim();
    var meta = state.chapterMeta[chapter] || {};
    if (!text) {
      contentEl.innerHTML = '<p>아직 생성되지 않은 챕터입니다.</p>';
      return;
    }
    contentEl.innerHTML = [
      '<article class="lb-result-article">',
      '<header class="lb-result-article__head">',
      '<p class="lb-result-article__chapter">CHAPTER ' + chapter + '</p>',
      '<h3 class="lb-result-article__title">' + escapeHtml(String(meta.title || CHAPTER_TITLES[chapter - 1] || '')) + '</h3>',
      '</header>',
      '<div class="lb-result-article__body">' + markdownToHtml(text) + '</div>',
      '</article>'
    ].join('');
  }

  function updateTocActive(chapter) {
    var tocButtons = qsa(qs('lifeBookModal'), '.lb-toc-item[data-lb-chapter]');
    tocButtons.forEach(function (btn) {
      var num = Number(btn.getAttribute('data-lb-chapter') || 0);
      if (num === chapter) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function openResultChapter(chapter) {
    var num = Number(chapter || 1);
    if (!Number.isFinite(num) || num < 1 || num > TOTAL_CHAPTERS) num = 1;
    state.activeChapter = num;
    updateTocActive(num);
    renderResultChapter(num);
  }

  function renderResultScreen() {
    var resultName = qs('lbResultName');
    var resultDate = qs('lbResultDate');
    var epilogue = qs('lbEpilogueBanner');
    if (resultName) resultName.textContent = String(state.payload && state.payload.name || '사용자') + '님의 인생의 책';
    if (resultDate) resultDate.textContent = formatDateLabel() + ' 생성 완료';
    if (epilogue) epilogue.style.display = chapterCount() >= TOTAL_CHAPTERS ? '' : 'none';
    showOnly('lbResultScreen');
    openResultChapter(1);
  }

  function setGenerateButtonBusy(busy) {
    var btn = qs('lbGenerateBtn');
    if (!btn) return;
    btn.disabled = !!busy;
    btn.setAttribute('aria-disabled', busy ? 'true' : 'false');
  }

  function setErrorScreen(message) {
    var msg = qs('lbErrorMsg');
    if (msg) msg.textContent = String(message || '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    showOnly('lbErrorScreen');
  }

  async function loadExistingStatus(reportId) {
    var statusRes = await requestJsonWithFallback('/status?reportId=' + encodeURIComponent(reportId) + '&includeText=1', {
      method: 'GET',
      headers: buildAuthHeaders({})
    });
    if (!statusRes.ok || !statusRes.data || statusRes.data.ok !== true) {
      return { completed: 0, currentChapter: 1, message: '' };
    }
    var rows = Array.isArray(statusRes.data.chapters) ? statusRes.data.chapters : [];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      var chapter = Number(row.chapter || 0);
      if (chapter >= 1 && chapter <= TOTAL_CHAPTERS && typeof row.text === 'string' && row.text.trim()) {
        state.chapterTexts[chapter] = row.text;
        state.chapterMeta[chapter] = row.chapterMeta || { title: CHAPTER_TITLES[chapter - 1] };
      }
    }
    if (chapterCount() > 0) {
      state.paidReportId = reportId;
    }
    persistState();
    return {
      completed: chapterCount(),
      currentChapter: Number(statusRes.data.currentChapter || chapterCount() + 1),
      message: String(statusRes.data.message || '')
    };
  }

  async function generateAllChapters(paymentContext) {
    logLifeBookStage('REQUEST_START', { reportId: state.reportId });
    showOnly('lbLoadingScreen');
    logLifeBookStage('INPUT_NORMALIZE_START', { reportId: state.reportId });
    setLoadingStatusText('사주 명식 계산 중');
    logLifeBookStage('INPUT_NORMALIZE_SUCCESS', { reportId: state.reportId });
    setLoadingProgress(1, CHAPTER_TITLES[0]);

    var statusInfo = await loadExistingStatus(state.reportId);
    var startFrom = Number(statusInfo.completed || 0);
    logLifeBookStage('PAYLOAD_NORMALIZE_START', { reportId: state.reportId });
    setLoadingStatusText('인생의 책 데이터 정리 중');
    logLifeBookStage('PAYLOAD_NORMALIZE_SUCCESS', { reportId: state.reportId });
    for (var chapter = startFrom + 1; chapter <= TOTAL_CHAPTERS; chapter += 1) {
      var chapterRoman = ROMAN_NUMERALS[chapter - 1] || String(chapter);
      setLoadingStatusText(chapterRoman + ' 챕터 생성 중');
      setLoadingProgress(chapter, CHAPTER_TITLES[chapter - 1]);

      logLifeBookStage('API_GENERATION_START', { reportId: state.reportId, chapterId: 'chapter-' + String(chapter).padStart(2, '0') });
      var reqBody = Object.assign({}, state.payload, {
        reportId: state.reportId,
        sessionId: chapter,
        chapter: chapter,
        payment: paymentContext || null,
        _premiumStrictPayload: true,
        _premiumStrictValidation: true,
        requestId: 'lifebook-' + state.reportId + '-ch' + chapter + '-' + Date.now()
      });

      var res = await requestJsonWithRouteFallback(['/generate', '/session'], {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(reqBody)
      });

      if (!res.ok || res.data.ok !== true) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('로그인이 만료되었습니다. 다시 로그인 후 시도해 주세요.');
        }
        if (res.status === 402) {
          throw new Error(String(res.data && res.data.message || '결제 확인이 필요합니다. 코인 차감 상태를 확인해 주세요.'));
        }
        throw new Error(String(res.data && res.data.message || ('챕터 ' + chapter + ' 생성에 실패했습니다.')));
      }

      var source = String(res.data && res.data.source || '').trim().toLowerCase();
      if (source === 'local' || source === 'mixed') state.generationSource = source;
      logLifeBookStage('API_GENERATION_SUCCESS', {
        reportId: state.reportId,
        chapterId: 'chapter-' + String(chapter).padStart(2, '0'),
        source: source || 'api'
      });

      state.chapterTexts[chapter] = String(res.data.text || '').trim();
      state.chapterMeta[chapter] = res.data.chapterMeta || { title: CHAPTER_TITLES[chapter - 1] };
      persistState();
      setLoadingProgress(chapter + 1 > TOTAL_CHAPTERS ? TOTAL_CHAPTERS : chapter + 1, CHAPTER_TITLES[Math.min(TOTAL_CHAPTERS - 1, chapter)]);
    }
    setLoadingStatusText('PDF 편집 중');
    logLifeBookStage('PDF_RENDER_START', { reportId: state.reportId });
  }

  async function startLifeBookGeneration() {
    if (state.generating) return;

    state.payload = buildPayload();
    if (!state.payload.year || !state.payload.month || !state.payload.day) {
      notify('사주 정보가 충분하지 않습니다. 먼저 사주 분석을 실행한 뒤 다시 시도해 주세요.');
      return;
    }

    if (!state.reportId) {
      state.reportId = createReportId(state.payload);
      persistState();
    }

    state.generating = true;
    setGenerateButtonBusy(true);

    try {
      await generateAllChapters(state.paymentContext);
      var totalChars = getTotalGeneratedChars();
      if (totalChars < LIFEBOOK_MIN_TOTAL_CHARS) {
        throw new Error('생성 결과가 최소 분량 기준(' + LIFEBOOK_MIN_TOTAL_CHARS + '자)에 미달했습니다. 다시 시도해 주세요. 현재 ' + totalChars + '자');
      }
      setLoadingStatusText('다운로드 준비 완료');
      logLifeBookStage('PDF_RENDER_SUCCESS', { reportId: state.reportId, source: state.generationSource || 'api' });
      state.paymentContext = null;
      renderResultScreen();
      persistState();
      notify('사주 인생의 책 프리미엄 리포트가 완성되었습니다.');
    } catch (err) {
      console.error('[LifeBook] generation failed:', err);
      logLifeBookStage('PDF_RENDER_FAILED', { reportId: state.reportId, message: String(err && err.message || '') });
      var shouldRefund = !!(state.paymentContext && !isAuthOrPaymentError(err));
      if (shouldRefund) {
        logLifeBookStage('REFUND_START', { reportId: state.reportId });
        var refunded = await attemptLifeBookAutoRefund('인생의 책 PDF 생성 실패 자동 환불');
        if (refunded) logLifeBookStage('REFUND_SUCCESS', { reportId: state.reportId });
      }
      if (chapterCount() > 0) {
        setErrorScreen('PDF 생성 중 일부 챕터에서 문제가 발생했습니다. 다시 시도해 주세요.');
      } else {
        setErrorScreen(toSafeUserError(err));
      }
    } finally {
      state.generating = false;
      setGenerateButtonBusy(false);
    }
  }

  async function attemptLifeBookAutoRefund(reason) {
    if (state.refundInFlight) return false;
    var ctx = state.paymentContext;
    if (!ctx || !Number(ctx.cost)) return false;

    state.refundInFlight = true;
    try {
      var response = await fetch('/api/fortune/pig-coin/refund', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          cost: Number(ctx.cost),
          featureKey: String(ctx.featureKey || COIN_FEATURE_KEY),
          sourceTransactionId: String(ctx.sourceTransactionId || ''),
          requestId: String(('refund:' + (ctx.requestId || state.reportId || Date.now())).slice(0, 120)),
          reason: String(reason || '인생의 책 PDF 생성 실패 자동 환불')
        })
      });

      var payload = await response.json().catch(function () { return {}; });
      var code = String(payload && payload.code || '').toUpperCase();
      if (response.ok || code === 'REFUND_ALREADY_PROCESSED') {
        state.paymentContext = null;
        state.paidReportId = '';
        persistState();
        return true;
      }

      console.warn('[LifeBook] auto refund failed:', payload);
      return false;
    } catch (error) {
      console.warn('[LifeBook] auto refund exception:', error);
      return false;
    } finally {
      state.refundInFlight = false;
    }
  }

  async function ensureCoinGateAndGenerate() {
    if (!state.reportId) {
      state.payload = buildPayload();
      state.reportId = createReportId(state.payload);
      persistState();
    }

    try {
      var statusInfo = await loadExistingStatus(state.reportId);
      if (Number(statusInfo.completed || 0) > 0) {
        startLifeBookGeneration();
        return;
      }
    } catch (_) {}

    if (chapterCount() > 0) {
      startLifeBookGeneration();
      return;
    }

    if (state.paidReportId === state.reportId) {
      logLifeBookStage('PAYMENT_CHECK_SUCCESS', { reportId: state.reportId, reused: true });
      startLifeBookGeneration();
      return;
    }

    if (typeof window._cdCoinGatePerUse === 'function') {
      logLifeBookStage('PAYMENT_CHECK_START', { reportId: state.reportId });
      window._cdCoinGatePerUse(
        COST_COINS,
        COIN_REASON,
        function (transactionId) {
          state.paymentContext = {
            featureKey: COIN_FEATURE_KEY,
            cost: Number(COST_COINS || 0),
            sourceTransactionId: String(transactionId || ''),
            requestId: String(('lifebook:' + (state.reportId || Date.now())).slice(0, 120))
          };
          state.paidReportId = state.reportId;
          persistState();
          logLifeBookStage('PAYMENT_CHECK_SUCCESS', { reportId: state.reportId, transactionId: String(transactionId || '') });
          startLifeBookGeneration();
        },
        function () {
          logLifeBookStage('PAYMENT_CHECK_FAILED', { reportId: state.reportId, reason: 'user-cancel-or-denied' });
          setGenerateButtonBusy(false);
          if (!state.generating) showOnly('lbStartScreen');
        },
        { featureKey: COIN_FEATURE_KEY }
      );
      return;
    }

    setGenerateButtonBusy(false);
    if (!state.generating) showOnly('lbStartScreen');
    logLifeBookStage('PAYMENT_CHECK_FAILED', { reportId: state.reportId, reason: 'coin-gate-unavailable' });
    notify('결제 모듈 로딩이 지연되어 생성 시작을 차단했습니다. 잠시 후 다시 시도해 주세요.');
  }

  function buildLocalPrintableHtml() {
    var ownerName = String(state.payload && state.payload.name || '사용자');
    var chapterBlocks = [];
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      var text = String(state.chapterTexts[i] || '').trim();
      if (!text) continue;
      var meta = state.chapterMeta[i] || {};
      chapterBlocks.push(
        '<section class="lb-print-chapter">'
        + '<h1>' + escapeHtml(String(meta.title || CHAPTER_TITLES[i - 1] || ('Chapter ' + i))) + '</h1>'
        + markdownToHtml(text)
        + '</section>'
      );
    }

    return [
      '<!doctype html>',
      '<html lang="ko">',
      '<head>',
      '<meta charset="utf-8" />',
      '<title>' + escapeHtml(ownerName + '님의 인생의 책') + '</title>',
      '<style>',
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;600;700&display=swap");',
      'body{margin:0;padding:26px;font-family:"Noto Serif KR","Noto Sans KR",serif;background:#f7f4ee;color:#1f2937;line-height:1.86;word-break:keep-all}',
      '.lb-print-cover{padding:28px;border:1px solid #d5c9b3;border-radius:18px;background:#fffaf0;margin-bottom:26px}',
      '.lb-print-cover h1{margin:0 0 8px;font-size:34px;line-height:1.35;color:#4b3621}',
      '.lb-print-chapter{margin-bottom:24px;padding:22px;border:1px solid #e8ddcc;border-radius:14px;background:#fff}',
      '.lb-print-chapter h1{margin:0 0 12px;font-size:25px;line-height:1.4;color:#5b4630}',
      '.lb-print-chapter h2{margin:18px 0 10px;font-size:20px;line-height:1.45;color:#6b4f35}',
      '.lb-print-chapter h3{margin:14px 0 8px;font-size:17px;line-height:1.5;color:#7b5d3f}',
      '.lb-print-chapter p{margin:0 0 12px;font-size:15px;line-height:1.9}',
      '.lb-print-chapter ul{margin:0 0 10px 18px;padding:0}',
      '.lb-print-chapter blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid #b08a5a;background:#f8f1e3;color:#5b4630}',
      '.lb-table{width:100%;border-collapse:collapse;margin:10px 0}',
      '.lb-table td{border:1px solid #dacbb1;padding:6px 8px;font-size:13px}',
      '@page{size:A4;margin:14mm}',
      '@media print{body{padding:0;background:#fff}.lb-print-cover,.lb-print-chapter{border:none;border-radius:0;box-shadow:none}}',
      '</style>',
      '</head>',
      '<body>',
      '<section class="lb-print-cover">',
      '<h1>' + escapeHtml(ownerName + '님의 인생의 책') + '</h1>',
      '<p>생성일: ' + escapeHtml(formatDateLabel()) + '</p>',
      '</section>',
      chapterBlocks.join('\n'),
      '</body>',
      '</html>'
    ].join('\n');
  }

  function openPrintWindow(html) {
    var printWindow = null;
    try {
      printWindow = window.open('', '_blank');
      if (!printWindow) return false;
      printWindow.document.open();
      printWindow.document.write(String(html || ''));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(function () {
        try { printWindow.print(); } catch (_) {}
      }, 350);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function downloadLifeBook() {
    var html = '';
    if (state.reportId) {
      try {
        var downloaded = await fetchTextWithFallback('/download?reportId=' + encodeURIComponent(state.reportId), {
          method: 'GET',
          headers: buildAuthHeaders({})
        });
        if (downloaded.ok && downloaded.text) html = downloaded.text;
      } catch (_) {}
    }

    if (!html) html = buildLocalPrintableHtml();

    if (!openPrintWindow(html)) {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'lifebook-' + (state.reportId || Date.now()) + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
      notify('HTML 파일로 다운로드되었습니다. 브라우저에서 열어 인쇄 > PDF 저장을 선택해 주세요.');
    }

    // PDF 저장 흐름이 끝나면 다음 생성을 위해 상태를 초기화한다.
    resetState();
    showOnly('lbStartScreen');
  }

  function resetState() {
    state.generating = false;
    state.reportId = '';
    state.paidReportId = '';
    state.paymentContext = null;
    state.generationSource = 'api';
    state.refundInFlight = false;
    state.payload = null;
    state.chapterTexts = {};
    state.chapterMeta = {};
    state.activeChapter = 1;
    clearPersistedState();
    setGenerateButtonBusy(false);
    var bar = qs('lbProgressBar');
    var text = qs('lbProgressText');
    if (bar) bar.style.width = '0%';
    if (text) text.textContent = '0 / 13 챕터 완성';
  }

  window.resetSajuLifeBookState = function () {
    resetState();
    showOnly('lbStartScreen');
  };

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  window.openLifeBookModal = function (profileArg) {
    var modal = qs('lifeBookModal');
    if (!modal) return;
    applyActiveProfileArg(profileArg);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    modal.setAttribute('aria-hidden', 'false');
    syncStartPreviewChapters();
    if (!state.generating && chapterCount() < TOTAL_CHAPTERS) {
      showOnly('lbStartScreen');
    } else if (state.generating) {
      showOnly('lbLoadingScreen');
    } else {
      showOnly('lbResultScreen');
      openResultChapter(state.activeChapter || 1);
    }
  };

  window.closeLifeBookModal = function () {
    var modal = qs('lifeBookModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    modal.setAttribute('aria-hidden', 'true');

    // 생성 결과/진행 잔존 데이터가 있으면 모달 종료 시 항상 초기화해 다음 진입을 새 세션으로 강제한다.
    if (!state.generating && (state.reportId || state.paidReportId || chapterCount() > 0)) {
      resetState();
    }
  };

  window.generateLifeBook = function () {
    if (state.generating) {
      notify('이미 리포트를 생성 중입니다.');
      return;
    }
    setGenerateButtonBusy(true);
    showOnly('lbLoadingScreen');
    setLoadingStatusText('결제 확인 중');
    setLoadingProgress(1, CHAPTER_TITLES[0]);

    ensureCoinGateAndGenerate().catch(function (err) {
      console.error('[LifeBook] gate check failed:', err);
      setGenerateButtonBusy(false);
      setErrorScreen('인생의 책 생성 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    });
  };

  window.downloadLifeBookPdf = function () {
    downloadLifeBook().catch(function (err) {
      console.error('[LifeBook] download failed:', err);
      notify('다운로드 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    });
  };

  window.shareLifeBookKakao = function () {
    var shareText = '내 사주 인생의 책이 완성되었어요.\n' + window.location.origin + '/?lifebook=' + encodeURIComponent(state.reportId || 'ready');
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(shareText).then(function () {
        notify('공유 문구를 클립보드에 복사했습니다.');
      }).catch(function () {
        notify('공유 링크: ' + shareText);
      });
      return;
    }
    notify('공유 링크: ' + shareText);
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'openLifeBookModal') {
        event.preventDefault();
        window.openLifeBookModal();
        return;
      }
      if (action === 'closeLifeBookModal') {
        event.preventDefault();
        window.closeLifeBookModal();
        return;
      }
    }

    var tocItem = target.closest('.lb-toc-item[data-lb-chapter]');
    if (tocItem) {
      var chapter = Number(tocItem.getAttribute('data-lb-chapter') || 1);
      openResultChapter(chapter);
    }
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var modal = qs('lifeBookModal');
    if (modal && modal.style.display !== 'none') {
      window.closeLifeBookModal();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadPersistedState();
      syncStartPreviewChapters();
      if (!state.reportId && chapterCount() === 0) {
        resetState();
      } else {
        setGenerateButtonBusy(false);
      }
    }, { once: true });
  } else {
    loadPersistedState();
    syncStartPreviewChapters();
    if (!state.reportId && chapterCount() === 0) {
      resetState();
    } else {
      setGenerateButtonBusy(false);
    }
  }
})();