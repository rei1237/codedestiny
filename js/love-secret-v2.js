(function () {
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var API_TIMEOUT_MS = 140000;
  var LOVE_STATE_STORAGE_KEY = '__cd_love_secret_state_v4__';
  var LOVE_API_BASE = '/api/love-secret';
  var MODE_SOLO = 'solo';
  var MODE_COMPAT = 'compatibility';

  var MODE_COST = {
    solo: 300,
    compatibility: 400,
  };

  var MODE_REASON = {
    solo: '연애 비책 생성 (13챕터 · 솔로)',
    compatibility: '연애 비책 생성 (13챕터 · 궁합)',
  };

  var MODE_FEATURE_KEY = {
    solo: 'premium_pdf_saju_love_secret',
    compatibility: 'premium_pdf_saju_love_secret_compat',
  };

  var QUOTES = [
    '사주의 여덟 글자에서 사랑의 반복 패턴을 해독하는 중입니다...',
    '일간·배우자궁·오행 불균형을 정밀 교차분석하는 중입니다...',
    '대운·세운·월운 타이밍을 연애 실행 전략으로 번역하고 있습니다...',
    '관계 위기 시그널과 회복 루틴을 챕터 단위로 집필하고 있습니다...',
    '당신에게 맞는 사랑의 마스터플랜을 완성하는 중입니다...'
  ];

  var SOLO_CHAPTER_TITLES = [
    'Chapter I. 본연의 연애 자아 — 나는 사랑 앞에서 어떤 사람인가',
    'Chapter II. 치명적 매력과 페로몬 — 나를 끌리게 만드는 힘',
    'Chapter III. 운명의 상대방 리포트 — 어떤 사람과 사랑이 깊어지는가',
    'Chapter IV. 연애 패턴 분석 — 반복되는 사랑의 습관',
    'Chapter V. 감정 표현과 소통법 — 사랑을 망치지 않는 대화',
    'Chapter VI. 스킨십·친밀감·정서적 거리 — 가까워지는 속도',
    'Chapter VII. 결혼관과 장기 관계 — 함께 살아갈 수 있는 사랑인가',
    'Chapter VIII. 이별·상처·미련 — 사랑이 끝날 때 드러나는 진짜 모습',
    'Chapter IX. 재회와 관계 회복 — 다시 이어질 수 있는 인연인가',
    'Chapter X. 연애운의 흐름 — 사랑이 들어오는 시기와 준비',
    'Chapter XI. 궁합의 핵심 원리 — 좋은 사람보다 맞는 사람',
    'Chapter XII. 실전 연애 전략 — 앞으로 이렇게 사랑하라',
    'Chapter XIII. 사랑의 최종 비책 — 나를 잃지 않고 사랑하는 법'
  ];

  var COMPAT_CHAPTER_TITLES = [
    'Chapter I. 두 사람의 관계 자아 진단 — 사랑 앞에서 각자는 어떤 사람인가',
    'Chapter II. 상호 매력과 감정 점화 패턴 — 무엇이 서로를 끌어당기는가',
    'Chapter III. 궁합 핵심 구조 리포트 — 잘 맞는 지점과 어긋나는 지점',
    'Chapter IV. 실전 커뮤니케이션 전술 — 싸우지 않고 통하는 대화법',
    'Chapter V. 시기별 관계 진전 타이밍 — 가까워질 때와 멈출 때',
    'Chapter VI. 갈등·거리감·권태 위기 관리 — 무너질 때 다시 회복하는 법',
    'Chapter VII. 친밀감과 조후 궁합 리듬 — 몸과 마음의 속도 맞추기',
    'Chapter VIII. 현대 연애 상황별 운영 비책 — 현실 조건 속 관계 유지법',
    'Chapter IX. 결혼·동거·정착 적합성 — 함께 살아갈 수 있는가',
    'Chapter X. 커플 맞춤 개운 처방전 — 관계를 살리는 실전 루틴',
    'Chapter XI. 재회·이별·회복 의사결정표 — 다시 만날지 놓아줄지',
    'Chapter XII. 장기 관계 운영 매뉴얼 — 오래 가는 커플의 시스템',
    'Chapter XIII. 커플 사랑 마스터플랜 — 두 사람이 선택할 최종 방향'
  ];

  var state = {
    generating: false,
    coinGatePending: false,
    reportId: '',
    paidReportId: '',
    paymentContext: null,
    refundInFlight: false,
    payload: null,
    chapterTexts: {},
    chapterMeta: {},
    activeChapter: 1,
    mode: MODE_SOLO,
  };

  function qs(id) { return document.getElementById(id); }

  function qsa(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function notify(message) {
    try {
      if (typeof window.showToast === 'function') window.showToast(String(message || ''));
      else window.alert(String(message || ''));
    } catch (_) {}
  }

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function asText(value) {
    return String(value == null ? '' : value).trim();
  }

  function clampInt(value, fallback, min, max) {
    var num = Number(value);
    if (!Number.isFinite(num)) num = Number(fallback);
    if (!Number.isFinite(num)) num = min;
    num = Math.floor(num);
    if (num < min) num = min;
    if (num > max) num = max;
    return num;
  }

  function showOnly(screenId) {
    var screens = ['lsStartScreen', 'lsPartnerScreen', 'lsLoadingScreen', 'lsResultScreen', 'lsErrorScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
  }

  function chapterCount() {
    var count = 0;
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      if (asText(state.chapterTexts[i])) count += 1;
    }
    return count;
  }

  function getAuthToken() {
    try {
      return asText(localStorage.getItem('fortune_auth_token'));
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

  function buildAuthHeaders(base) {
    var headers = Object.assign({}, base || {});
    var token = getAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  function getCurrentProfileFromStorage() {
    try {
      var list = safeParse(localStorage.getItem('FORTUNE_APP_USER_PROFILES.list') || '[]', []);
      var currentId = asText(localStorage.getItem('FORTUNE_APP_USER_PROFILES.current'));
      if (Array.isArray(list) && currentId) {
        for (var i = 0; i < list.length; i += 1) {
          var row = list[i] || {};
          if (String(row.id || '') === currentId) return row;
        }
      }
      return Array.isArray(list) && list.length ? (list[0] || null) : null;
    } catch (_) {
      return null;
    }
  }

  function normalizeCalType(value) {
    var v = asText(value).toLowerCase();
    if (v === 'lunar' || v === 'l' || v === '음력') return 'lunar';
    if (v === 'lunar_leap' || v === 'leap' || v === '윤달' || v === '윤') return 'lunar_leap';
    return 'solar';
  }

  function parseDateParts(raw) {
    var src = asText(raw);
    var m = src.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  function parseTimeParts(raw) {
    var src = asText(raw);
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

    var parsedAuthDate = parseDateParts(authUser.birthDate || authUser.dateOfBirth || '');
    var parsedAuthTime = parseTimeParts(authUser.birthTime || '');

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
    var timezone = asText(location.tz || authUser.timezone || authUser.tz || 'Asia/Seoul') || 'Asia/Seoul';
    var lat = Number(location.lat);
    var lon = Number(location.lng);
    if (!Number.isFinite(lat)) lat = 37.5665;
    if (!Number.isFinite(lon)) lon = 126.9780;

    var profileId = asText((profile && (profile.profileId || profile.id)) || authUser.profileId || authUser.id);
    var name = asText((profile && profile.name) || authUser.name || authUser.nickname) || '사용자';
    var gender = asText((profile && profile.gender) || authUser.gender) || 'OTHER';
    var birthPlace = asText((profile && (profile.birthPlace || (profile.location && profile.location.birthPlace) || profile.place)) || authUser.birthPlace || authUser.place);
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
      valid: year > 0 && month > 0 && day > 0,
    };
  }

  function toKoElementToken(value) {
    var v = asText(value).toLowerCase();
    if (v === 'wood') return '목';
    if (v === 'fire') return '화';
    if (v === 'earth') return '토';
    if (v === 'metal') return '금';
    if (v === 'water') return '수';
    return asText(value);
  }

  function extractDaewunRows(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && out.length < 4; i += 1) {
      var row = raw[i] || {};
      var ganji = asText(row.ganji || row.gz || row.label || row.name);
      if (!ganji && row.stem && row.branch) ganji = String(row.stem) + String(row.branch);
      var fromAge = Number.isFinite(Number(row.fromAge)) ? Number(row.fromAge) : '';
      var toAge = Number.isFinite(Number(row.toAge)) ? Number(row.toAge) : '';
      if (!ganji) continue;
      out.push({ ganji: ganji, fromAge: fromAge, toAge: toAge });
    }
    return out;
  }

  function ensureSelfEngineData() {
    var hasPillars = false;
    try {
      hasPillars = !!(window.G_PILLARS && (window.G_PILLARS.d || window.G_PILLARS.day));
    } catch (_) { hasPillars = false; }

    if (hasPillars) return true;

    var profile = null;
    try {
      profile = window.__cdActiveBirthProfile || getCurrentProfileFromStorage() || null;
    } catch (_) {
      profile = getCurrentProfileFromStorage();
    }

    if (!profile || !profile.birth || typeof window.computeProfileForModal !== 'function') return false;
    try {
      return !!window.computeProfileForModal(profile);
    } catch (_) {
      return false;
    }
  }

  function buildEngineDataFromGlobals() {
    var pillars = null;
    var elementWeights = null;
    var power = null;
    var johu = null;
    var daewun = null;

    try { pillars = window.G_PILLARS || null; } catch (_) {}
    try { elementWeights = window.G_NATAL || null; } catch (_) {}
    try { power = window.G_POWER || null; } catch (_) {}
    try { johu = window.G_JOHU || null; } catch (_) {}
    try { daewun = Array.isArray(window.G_DAEWUN) ? window.G_DAEWUN : null; } catch (_) { daewun = null; }

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
      },
      usefulGods: {
        yongsin: { element: yongsin },
        huisin: { element: huisin },
        gisin: { element: gisin },
      },
      tenGods: {
        distribution: power && typeof power.tenGods === 'object' ? power.tenGods : {},
      },
      seasonMeta: johu || undefined,
      daewunRows: extractDaewunRows(daewun),
    };
  }

  function buildPillarSummary(pillars) {
    var p = pillars || {};
    var y = p.y || p.year || {};
    var m = p.m || p.month || {};
    var d = p.d || p.day || {};
    var h = p.h || p.hour || {};
    var yearGanji = asText((y.g || '') + (y.j || '') || y.ganji || '');
    var monthGanji = asText((m.g || '') + (m.j || '') || m.ganji || '');
    var dayGanji = asText((d.g || '') + (d.j || '') || d.ganji || '');
    var hourGanji = asText((h.g || '') + (h.j || '') || h.ganji || '');

    return {
      yearGanji: yearGanji,
      monthGanji: monthGanji,
      dayGanji: dayGanji,
      hourGanji: hourGanji,
      dayStem: asText(d.g || d.stem),
      monthBranch: asText(m.j || m.branch),
    };
  }

  function buildSajuDataText(ownerLabel, birth, engineData) {
    var lines = [];
    var pillars = engineData && engineData.pillars ? engineData.pillars : null;
    var summary = buildPillarSummary(pillars);
    var elementWeights = engineData && engineData.elementWeights ? engineData.elementWeights : null;
    var useful = engineData && engineData.usefulGods ? engineData.usefulGods : null;
    var tenGods = engineData && engineData.tenGods ? engineData.tenGods : null;
    var daewunRows = engineData && Array.isArray(engineData.daewunRows) ? engineData.daewunRows : [];

    lines.push('사주 원국 (' + ownerLabel + ')');
    if (summary.yearGanji) lines.push('년주(年柱): ' + summary.yearGanji);
    if (summary.monthGanji) lines.push('월주(月柱): ' + summary.monthGanji);
    if (summary.dayGanji) lines.push('일주(日柱): ' + summary.dayGanji);
    if (summary.hourGanji) lines.push('시주(時柱): ' + summary.hourGanji);
    if (summary.dayStem) lines.push('일간(日干): ' + summary.dayStem);
    if (summary.monthBranch) lines.push('월지(月支): ' + summary.monthBranch);

    if (elementWeights) {
      lines.push(
        '오행(분포): '
        + '목(' + Number(elementWeights.wood || 0) + ') '
        + '화(' + Number(elementWeights.fire || 0) + ') '
        + '토(' + Number(elementWeights.earth || 0) + ') '
        + '금(' + Number(elementWeights.metal || 0) + ') '
        + '수(' + Number(elementWeights.water || 0) + ')'
      );
    }

    if (tenGods && tenGods.distribution && typeof tenGods.distribution === 'object') {
      var entries = Object.keys(tenGods.distribution)
        .map(function (key) {
          return key + ':' + Number(tenGods.distribution[key] || 0);
        })
        .filter(Boolean);
      if (entries.length) lines.push('십성(분포): ' + entries.join(', '));
    }

    if (useful) {
      lines.push('용신(用神): ' + asText(useful.yongsin && useful.yongsin.element));
      lines.push('희신(喜神): ' + asText(useful.huisin && useful.huisin.element));
      lines.push('기신(忌神): ' + asText(useful.gisin && useful.gisin.element));
    }

    if (engineData && engineData.dayMaster) {
      lines.push('신강/신약: ' + asText(engineData.dayMaster.strength));
    }

    if (daewunRows.length) {
      var daewunText = daewunRows.map(function (row) {
        var ageText = row.fromAge !== '' && row.toAge !== '' ? ('(' + row.fromAge + '~' + row.toAge + ')') : '';
        return asText(row.ganji + ageText);
      }).filter(Boolean).join(', ');
      if (daewunText) lines.push('대운(요약): ' + daewunText);
    }

    lines.push('생년월일: ' + [birth.year, birth.month, birth.day].join('-'));
    lines.push('출생시각: ' + String(birth.hour).padStart(2, '0') + ':' + String(birth.minute).padStart(2, '0'));
    return lines.filter(function (line) { return asText(line).length > 0; }).join('\n');
  }

  function buildSelfPayload() {
    var birth = normalizeBirthParts();
    ensureSelfEngineData();
    var engineData = buildEngineDataFromGlobals();
    var sajuData = buildSajuDataText('본인', birth, engineData);

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
      sajuData: sajuData,
      engineData: engineData,
      validBirth: !!birth.valid,
    };
  }

  function snapshotGlobalSajuState() {
    return {
      G_PILLARS: typeof window.G_PILLARS === 'undefined' ? undefined : window.G_PILLARS,
      G_NATAL: typeof window.G_NATAL === 'undefined' ? undefined : window.G_NATAL,
      G_POWER: typeof window.G_POWER === 'undefined' ? undefined : window.G_POWER,
      G_JOHU: typeof window.G_JOHU === 'undefined' ? undefined : window.G_JOHU,
      G_JONG: typeof window.G_JONG === 'undefined' ? undefined : window.G_JONG,
      G_DAEWUN: typeof window.G_DAEWUN === 'undefined' ? undefined : window.G_DAEWUN,
      _astroBirth: typeof window._astroBirth === 'undefined' ? undefined : window._astroBirth,
      _ziweiBirth: typeof window._ziweiBirth === 'undefined' ? undefined : window._ziweiBirth,
      __destinyFlowerSajuSnapshot: typeof window.__destinyFlowerSajuSnapshot === 'undefined' ? undefined : window.__destinyFlowerSajuSnapshot,
    };
  }

  function restoreGlobalSajuState(saved) {
    if (!saved || typeof saved !== 'object') return;
    window.G_PILLARS = saved.G_PILLARS;
    window.G_NATAL = saved.G_NATAL;
    window.G_POWER = saved.G_POWER;
    window.G_JOHU = saved.G_JOHU;
    window.G_JONG = saved.G_JONG;
    window.G_DAEWUN = saved.G_DAEWUN;
    window._astroBirth = saved._astroBirth;
    window._ziweiBirth = saved._ziweiBirth;
    window.__destinyFlowerSajuSnapshot = saved.__destinyFlowerSajuSnapshot;
  }

  function getPartnerGender() {
    var maleBtn = qs('lsPsGenderM');
    if (maleBtn && maleBtn.classList.contains('active')) return 'M';
    return 'F';
  }

  function setPartnerGender(gender) {
    var normalized = asText(gender).toUpperCase() === 'M' ? 'M' : 'F';
    var maleBtn = qs('lsPsGenderM');
    var femaleBtn = qs('lsPsGenderF');
    if (maleBtn) maleBtn.classList.toggle('active', normalized === 'M');
    if (femaleBtn) femaleBtn.classList.toggle('active', normalized !== 'M');
  }

  function getPartnerInputProfile() {
    var year = clampInt(asText(qs('lsPsYear') && qs('lsPsYear').value), 0, 0, 2200);
    var month = clampInt(asText(qs('lsPsMonth') && qs('lsPsMonth').value), 0, 0, 12);
    var day = clampInt(asText(qs('lsPsDay') && qs('lsPsDay').value), 0, 0, 31);
    var hourRaw = asText(qs('lsPsHour') && qs('lsPsHour').value);
    var hour = hourRaw === '' ? 12 : clampInt(hourRaw, 12, 0, 23);
    var minute = 0;
    var name = asText(qs('lsPsName') && qs('lsPsName').value) || '상대';
    var gender = getPartnerGender();
    var valid = year >= 1900 && year <= 2200 && month >= 1 && month <= 12 && day >= 1 && day <= 31;

    return {
      valid: valid,
      name: name,
      gender: gender,
      birth: {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        calType: 'solar',
      },
      location: {
        lat: 37.5665,
        lng: 126.9780,
        tz: 'Asia/Seoul',
        baseTzOffset: 9,
      },
    };
  }

  function computePartnerEngineData(profile) {
    if (!profile || !profile.birth || typeof window.computeProfileForModal !== 'function') {
      return { ok: false, message: '파트너 사주 계산 엔진을 찾지 못했습니다.' };
    }

    var snapshot = snapshotGlobalSajuState();
    try {
      var computed = window.computeProfileForModal(profile);
      if (!computed || !window.G_PILLARS) {
        return { ok: false, message: '파트너 사주 계산에 실패했습니다.' };
      }

      var engineData = buildEngineDataFromGlobals();
      var summary = buildPillarSummary(engineData.pillars);
      if (!summary.dayGanji || !summary.monthGanji || !summary.yearGanji) {
        return { ok: false, message: '파트너 사주 원국이 불완전합니다.' };
      }

      return { ok: true, engineData: engineData, summary: summary };
    } catch (_) {
      return { ok: false, message: '파트너 사주 계산 중 오류가 발생했습니다.' };
    } finally {
      restoreGlobalSajuState(snapshot);
    }
  }

  function renderPartnerPreview() {
    var pillarsHost = qs('lsPsPillars');
    var infoHost = qs('lsPsInfo');
    if (!pillarsHost || !infoHost) return;

    var profile = getPartnerInputProfile();
    if (!profile.valid) {
      pillarsHost.innerHTML = '<span class="ls-pscreen__pill">생년월일을 입력하면 사주 원국이 표시됩니다.</span>';
      infoHost.textContent = '년도·월·일을 입력해 주세요.';
      return;
    }

    var computed = computePartnerEngineData(profile);
    if (!computed.ok) {
      pillarsHost.innerHTML = '<span class="ls-pscreen__pill">원국 계산 실패</span>';
      infoHost.textContent = computed.message;
      return;
    }

    var s = computed.summary;
    var items = [
      '년주 ' + s.yearGanji,
      '월주 ' + s.monthGanji,
      '일주 ' + s.dayGanji,
      '시주 ' + (s.hourGanji || '미상'),
      '일간 ' + (s.dayStem || '미상'),
      '월지 ' + (s.monthBranch || '미상')
    ];

    pillarsHost.innerHTML = items.map(function (text) {
      return '<span class="ls-pscreen__pill">' + escapeHtml(text) + '</span>';
    }).join('');

    infoHost.textContent = '상대방 원국이 계산되었습니다. 궁합 모드(400코인)로 생성할 수 있습니다.';
  }

  function buildPartnerPayload() {
    var profile = getPartnerInputProfile();
    if (!profile.valid) {
      return { ok: false, message: '상대방 생년월일을 정확히 입력해 주세요.' };
    }

    var computed = computePartnerEngineData(profile);
    if (!computed.ok) {
      return { ok: false, message: computed.message || '상대방 사주 계산에 실패했습니다.' };
    }

    var engineData = computed.engineData;
    var partnerData = buildSajuDataText('상대', profile.birth, engineData);

    return {
      ok: true,
      profile: profile,
      engineData: engineData,
      partnerData: partnerData,
      summary: computed.summary,
    };
  }

  function getChapterTitlesByMode(mode) {
    return mode === MODE_COMPAT ? COMPAT_CHAPTER_TITLES : SOLO_CHAPTER_TITLES;
  }

  function syncStartPreviewChapters(mode) {
    var modal = qs('loveSecretModal');
    if (!modal) return;
    var list = modal.querySelector('.ls-preview-chapters');
    if (!list) return;
    var titles = getChapterTitlesByMode(mode);
    var items = qsa(list, '.ls-chapter-item');
    for (var i = 0; i < items.length && i < titles.length; i += 1) {
      var titleEl = items[i].querySelector('.ls-ch-title');
      if (titleEl) titleEl.textContent = titles[i];
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
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
      var line = asText(lines[i]);
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
        var cells = line.slice(1, -1).split('|').map(function (cell) { return asText(cell); }).filter(Boolean);
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

  function createReportId(payload, mode, partnerPayload, runNonce) {
    var seed = [
      asText(payload && payload.name),
      asText(payload && payload.gender),
      Number(payload && payload.year || 0),
      Number(payload && payload.month || 0),
      Number(payload && payload.day || 0),
      Number(payload && payload.hour || 0),
      asText(mode || MODE_SOLO),
      asText(partnerPayload && partnerPayload.profile && partnerPayload.profile.name),
      Number(partnerPayload && partnerPayload.profile && partnerPayload.profile.birth && partnerPayload.profile.birth.year || 0),
      Number(partnerPayload && partnerPayload.profile && partnerPayload.profile.birth && partnerPayload.profile.birth.month || 0),
      Number(partnerPayload && partnerPayload.profile && partnerPayload.profile.birth && partnerPayload.profile.birth.day || 0)
    ].join('|');

    var hash = 2166136261;
    for (var i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    var shortHash = (hash >>> 0).toString(36);
    var nonce = asText(runNonce || '');
    if (!nonce) nonce = Date.now().toString(36);
    return 'love_secret_' + shortHash + '_' + asText(mode || MODE_SOLO) + '_' + nonce;
  }

  async function requestJson(pathname, options) {
    var controller = null;
    var timeoutHandle = null;
    try {
      if (typeof AbortController === 'function') {
        controller = new AbortController();
        timeoutHandle = setTimeout(function () {
          try { controller.abort(); } catch (_) {}
        }, API_TIMEOUT_MS);
      }

      var res = await fetch(LOVE_API_BASE + pathname, Object.assign({}, options || {}, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
      }));
      var data = await res.json().catch(function () { return {}; });
      return { ok: res.ok, status: res.status, data: data || {} };
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  async function fetchDownloadHtml(reportId) {
    var res = await fetch(LOVE_API_BASE + '/download?reportId=' + encodeURIComponent(reportId), {
      method: 'GET',
      headers: buildAuthHeaders({}),
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) {
      return { ok: false, status: res.status, text: '' };
    }
    return { ok: true, status: res.status, text: await res.text() };
  }

  function persistState() {
    try {
      if (chapterCount() < TOTAL_CHAPTERS) return false;
      var payload = {
        reportId: asText(state.reportId),
        paidReportId: asText(state.paidReportId),
        payload: state.payload || null,
        chapterTexts: state.chapterTexts || {},
        chapterMeta: state.chapterMeta || {},
        activeChapter: Number(state.activeChapter || 1),
        mode: asText(state.mode || MODE_SOLO) || MODE_SOLO,
        completed: true,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOVE_STATE_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (_) {}
    return false;
  }

  function getPersistedCompletedSnapshot() {
    try {
      var raw = localStorage.getItem(LOVE_STATE_STORAGE_KEY);
      if (!raw) return null;
      var saved = safeParse(raw, null);
      if (!saved || typeof saved !== 'object') return null;
      var texts = saved.chapterTexts && typeof saved.chapterTexts === 'object' ? saved.chapterTexts : {};
      var completedCount = 0;
      for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
        if (asText(texts[i])) completedCount += 1;
      }
      if (completedCount < TOTAL_CHAPTERS) {
        try { localStorage.removeItem(LOVE_STATE_STORAGE_KEY); } catch (_) {}
        return null;
      }
      return saved;
    } catch (_) {}
    return null;
  }

  function refreshSavedReportButton() {
    var btn = qs('lsRestoreLatestBtn');
    if (!btn) return;
    var hasSavedReport = Boolean(getPersistedCompletedSnapshot());
    btn.disabled = !hasSavedReport;
    btn.setAttribute('aria-disabled', hasSavedReport ? 'false' : 'true');
  }

  function loadPersistedState(restore) {
    var saved = getPersistedCompletedSnapshot();
    if (!saved) return false;
    if (restore !== true) {
      refreshSavedReportButton();
      return true;
    }

    state.reportId = asText(saved.reportId);
    state.paidReportId = asText(saved.paidReportId);
    state.payload = saved.payload || null;
    state.chapterTexts = saved.chapterTexts && typeof saved.chapterTexts === 'object' ? saved.chapterTexts : {};
    state.chapterMeta = saved.chapterMeta && typeof saved.chapterMeta === 'object' ? saved.chapterMeta : {};
    state.mode = saved.mode === MODE_COMPAT ? MODE_COMPAT : MODE_SOLO;
    state.activeChapter = clampInt(saved.activeChapter, 1, 1, TOTAL_CHAPTERS);
    refreshSavedReportButton();
    return true;
  }

  function restorePersistedCompletedReport() {
    if (!loadPersistedState(true)) {
      notify('이전 완성본이 없습니다. 먼저 연애 비책을 생성해 주세요.');
      return false;
    }
    showOnly('lsResultScreen');
    renderResultScreen();
    return true;
  }

  function resetState() {
    state.generating = false;
    state.coinGatePending = false;
    state.reportId = '';
    state.paidReportId = '';
    state.paymentContext = null;
    state.refundInFlight = false;
    state.payload = null;
    state.chapterTexts = {};
    state.chapterMeta = {};
    state.activeChapter = 1;
    state.mode = MODE_SOLO;
    setGenerateButtonBusy(false);
    refreshSavedReportButton();
    var bar = qs('lsProgressBar');
    var txt = qs('lsProgressText');
    if (bar) bar.style.width = '0%';
    if (txt) txt.textContent = '0 / 13 챕터 완성';
  }

  function setGenerateButtonBusy(busy) {
    var btn = qs('lsGenerateBtn');
    if (!btn) return;
    btn.disabled = !!busy;
    btn.setAttribute('aria-disabled', busy ? 'true' : 'false');
  }

  function setPartnerButtonsBusy(busy) {
    var selectors = ['[data-action="lsStartWithPartner"]', '[data-action="lsSkipPartner"]'];
    for (var i = 0; i < selectors.length; i += 1) {
      var nodes = qsa(qs('loveSecretModal'), selectors[i]);
      for (var j = 0; j < nodes.length; j += 1) {
        nodes[j].disabled = !!busy;
        nodes[j].setAttribute('aria-disabled', busy ? 'true' : 'false');
      }
    }
  }

  function setErrorScreen(message) {
    var msg = qs('lsErrorMsg');
    if (msg) msg.textContent = asText(message) || '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    showOnly('lsErrorScreen');
  }

  function formatDateLabel() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '.' + mm + '.' + dd;
  }

  function updateTocActive(chapter) {
    var tocButtons = qsa(qs('loveSecretModal'), '.ls-toc-item[data-ls-chapter]');
    for (var i = 0; i < tocButtons.length; i += 1) {
      var btn = tocButtons[i];
      var num = Number(btn.getAttribute('data-ls-chapter') || 0);
      btn.classList.toggle('active', num === chapter);
    }
  }

  function renderResultChapter(chapter) {
    var contentEl = qs('lsChapterContent');
    if (!contentEl) return;

    var text = asText(state.chapterTexts[chapter]);
    var modeTitles = getChapterTitlesByMode(state.mode);
    var fallbackTitle = modeTitles[chapter - 1] || ('Chapter ' + chapter);
    var meta = state.chapterMeta[chapter] || { title: fallbackTitle };
    var title = asText(meta.title) || fallbackTitle;

    if (!text) {
      contentEl.innerHTML = '<p>아직 생성되지 않은 챕터입니다.</p>';
      return;
    }

    contentEl.innerHTML = [
      '<article class="lb-result-article">',
      '<header class="lb-result-article__head">',
      '<p class="lb-result-article__chapter">CHAPTER ' + chapter + '</p>',
      '<h3 class="lb-result-article__title">' + escapeHtml(title) + '</h3>',
      '</header>',
      '<div class="lb-result-article__body">' + markdownToHtml(text) + '</div>',
      '</article>'
    ].join('');
  }

  function openResultChapter(chapter) {
    var num = clampInt(chapter, 1, 1, TOTAL_CHAPTERS);
    state.activeChapter = num;
    updateTocActive(num);
    renderResultChapter(num);
  }

  function renderResultScreen() {
    var resultName = qs('lsResultName');
    var resultDate = qs('lsResultDate');
    var epilogue = qs('lsEpilogueBanner');
    var owner = asText(state.payload && state.payload.name) || '사용자';
    var titleTail = state.mode === MODE_COMPAT ? '님의 커플 연애 비책' : '님의 연애 비책';

    if (resultName) resultName.textContent = owner + titleTail;
    if (resultDate) resultDate.textContent = formatDateLabel() + ' 생성 완료';
    if (epilogue) epilogue.style.display = chapterCount() >= TOTAL_CHAPTERS ? '' : 'none';

    showOnly('lsResultScreen');
    openResultChapter(1);
  }

  function setLoadingProgress(chapter, subtitle) {
    var chapterText = qs('lsLoadingChapter');
    var quote = qs('lsLoadQuoteText');
    var bar = qs('lsProgressBar');
    var progressText = qs('lsProgressText');
    var completed = chapterCount();
    var current = clampInt(chapter, 1, 1, TOTAL_CHAPTERS);
    var percent = Math.max(0, Math.min(100, Math.round((completed / TOTAL_CHAPTERS) * 100)));

    if (chapterText) chapterText.textContent = asText(subtitle) || ('Chapter ' + current + ' 집필 중...');
    if (quote) quote.textContent = QUOTES[(current - 1) % QUOTES.length];
    if (bar) bar.style.width = percent + '%';
    if (progressText) progressText.textContent = completed + ' / ' + TOTAL_CHAPTERS + ' 챕터 완성';

    var pills = qsa(qs('lsLoadPills'), '.ls-load-pill[data-ch]');
    for (var i = 0; i < pills.length; i += 1) {
      var pill = pills[i];
      var n = Number(pill.getAttribute('data-ch') || 0);
      pill.classList.remove('done', 'active');
      if (n < current || (n <= completed && completed >= current)) pill.classList.add('done');
      if (n === current && completed < TOTAL_CHAPTERS) pill.classList.add('active');
    }
  }

  async function loadExistingStatus(reportId) {
    var statusRes = await requestJson('/status?reportId=' + encodeURIComponent(reportId) + '&includeText=1', {
      method: 'GET',
      headers: buildAuthHeaders({}),
    });

    if (!statusRes.ok || !statusRes.data || statusRes.data.ok !== true) return 0;

    var rows = Array.isArray(statusRes.data.chapters) ? statusRes.data.chapters : [];
    if (asText(statusRes.data.mode) === MODE_COMPAT) state.mode = MODE_COMPAT;
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      var chapter = Number(row.chapter || 0);
      if (chapter >= 1 && chapter <= TOTAL_CHAPTERS && typeof row.text === 'string' && asText(row.text)) {
        state.chapterTexts[chapter] = row.text;
        state.chapterMeta[chapter] = row.chapterMeta || { title: getChapterTitlesByMode(state.mode)[chapter - 1] || ('Chapter ' + chapter) };
      }
    }
    persistState();
    return chapterCount();
  }

  async function generateAllChapters() {
    showOnly('lsLoadingScreen');
    setLoadingProgress(1, getChapterTitlesByMode(state.mode)[0]);

    var startFrom = await loadExistingStatus(state.reportId);
    for (var chapter = startFrom + 1; chapter <= TOTAL_CHAPTERS; chapter += 1) {
      var title = getChapterTitlesByMode(state.mode)[chapter - 1] || ('Chapter ' + chapter);
      setLoadingProgress(chapter, title);

      var reqBody = Object.assign({}, state.payload, {
        reportId: state.reportId,
        mode: state.mode,
        reportMode: state.mode,
        totalChapters: TOTAL_CHAPTERS,
        sessionId: chapter,
        chapter: chapter,
        _premiumStrictPayload: true,
        _premiumStrictValidation: true,
        requestId: 'love-secret-' + state.reportId + '-ch' + chapter + '-' + Date.now(),
      });

      var res = await requestJson('/generate', {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(reqBody),
      });

      if (!res.ok || !res.data || res.data.ok !== true) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('로그인이 만료되었습니다. 다시 로그인 후 시도해 주세요.');
        }
        if (res.status === 402) {
          throw new Error(asText(res.data && res.data.message) || '결제 확인이 필요합니다. 코인 차감 상태를 확인해 주세요.');
        }
        throw new Error(asText(res.data && res.data.message) || ('챕터 ' + chapter + ' 생성에 실패했습니다.'));
      }

      state.chapterTexts[chapter] = asText(res.data.text);
      state.chapterMeta[chapter] = res.data.chapterMeta || { title: title };
      persistState();
      setLoadingProgress(Math.min(TOTAL_CHAPTERS, chapter + 1), getChapterTitlesByMode(state.mode)[Math.min(TOTAL_CHAPTERS - 1, chapter)] || '집필 중...');
    }
  }

  function buildGenerationPayload(mode, partnerPayload) {
    var self = buildSelfPayload();
    if (!self.validBirth) {
      return { ok: false, message: '사주 정보가 충분하지 않습니다. 먼저 사주 분석을 실행해 주세요.' };
    }

    if (!self.sajuData || !/일간\(|년주|월주|일주/.test(self.sajuData)) {
      return { ok: false, message: '사주 원국 데이터가 부족합니다. 사주 분석을 다시 실행해 주세요.' };
    }

    var payload = {
      profileId: self.profileId || undefined,
      name: self.name,
      gender: self.gender,
      year: self.year,
      month: self.month,
      day: self.day,
      hour: self.hour,
      minute: self.minute,
      birthDate: self.birthDate,
      birthTime: self.birthTime,
      calType: self.calType,
      calendarType: self.calendarType,
      isLunar: self.isLunar,
      timeUnknown: self.timeUnknown,
      birthPlace: self.birthPlace || undefined,
      timezoneName: self.timezoneName,
      timezone: self.timezone,
      lat: self.lat,
      lon: self.lon,
      mode: mode,
      reportMode: mode,
      totalChapters: TOTAL_CHAPTERS,
      _premiumStrictPayload: true,
      _premiumStrictValidation: true,
      sajuData: self.sajuData,
      engineData: self.engineData,
      birthData: {
        profileId: self.profileId || undefined,
        name: self.name,
        gender: self.gender,
        year: self.year,
        month: self.month,
        day: self.day,
        hour: self.hour,
        minute: self.minute,
        birthDate: self.birthDate,
        birthTime: self.birthTime,
        calType: self.calType,
        calendarType: self.calendarType,
        isLunar: self.isLunar,
        timeUnknown: self.timeUnknown,
        birthPlace: self.birthPlace || undefined,
        timezoneName: self.timezoneName,
        timezone: self.timezone,
        lat: self.lat,
        lon: self.lon
      },
      profile: {
        profileId: self.profileId || undefined,
        name: self.name,
        gender: self.gender,
        birthDate: self.birthDate,
        birthTime: self.birthTime,
        calendarType: self.calendarType,
        isLunar: self.isLunar,
        timeUnknown: self.timeUnknown,
        birthPlace: self.birthPlace || undefined,
        timezone: self.timezone
      }
    };

    if (mode === MODE_COMPAT) {
      if (!partnerPayload || !partnerPayload.ok) {
        return { ok: false, message: '궁합 모드에는 상대방 사주 정보가 필요합니다.' };
      }
      payload.partnerName = partnerPayload.profile.name;
      payload.partnerGender = partnerPayload.profile.gender;
      payload.partnerYear = partnerPayload.profile.birth.year;
      payload.partnerMonth = partnerPayload.profile.birth.month;
      payload.partnerDay = partnerPayload.profile.birth.day;
      payload.partnerHour = partnerPayload.profile.birth.hour;
      payload.partnerMinute = partnerPayload.profile.birth.minute;
      payload.partnerBirthDate = [
        partnerPayload.profile.birth.year,
        String(partnerPayload.profile.birth.month).padStart(2, '0'),
        String(partnerPayload.profile.birth.day).padStart(2, '0')
      ].join('-');
      payload.partnerBirthTime = String(partnerPayload.profile.birth.hour).padStart(2, '0') + ':' + String(partnerPayload.profile.birth.minute).padStart(2, '0');
      payload.partnerData = partnerPayload.partnerData;
      payload.partnerCalType = asText(partnerPayload.profile.birth.calType || 'solar') || 'solar';
      payload.partner = {
        engineData: partnerPayload.engineData,
        birthData: {
          name: partnerPayload.profile.name,
          gender: partnerPayload.profile.gender,
          year: partnerPayload.profile.birth.year,
          month: partnerPayload.profile.birth.month,
          day: partnerPayload.profile.birth.day,
          hour: partnerPayload.profile.birth.hour,
          minute: partnerPayload.profile.birth.minute,
          birthDate: payload.partnerBirthDate,
          birthTime: payload.partnerBirthTime,
          calType: payload.partnerCalType,
          calendarType: payload.partnerCalType,
          isLunar: payload.partnerCalType === 'lunar' || payload.partnerCalType === 'lunar_leap',
          timeUnknown: false,
          timezoneName: 'Asia/Seoul',
          timezone: 'Asia/Seoul',
          lat: 37.5665,
          lon: 126.9780
        }
      };
    }

    return { ok: true, payload: payload };
  }

  async function startGeneration(mode, partnerPayload, forcedRunNonce) {
    if (state.generating) return;

    var built = buildGenerationPayload(mode, partnerPayload);
    if (!built.ok) {
      notify(built.message || '연애 비책 생성 준비에 실패했습니다.');
      return;
    }

    var nextPayload = built.payload;
    var hasCompletedReport = chapterCount() >= TOTAL_CHAPTERS;
    var runNonce = asText(forcedRunNonce);
    if (!runNonce && hasCompletedReport) runNonce = Date.now().toString(36);
    var nextReportId = createReportId(nextPayload, mode, partnerPayload, runNonce);

    var switchedReport = asText(state.reportId) !== asText(nextReportId);
    if (switchedReport) {
      state.chapterTexts = {};
      state.chapterMeta = {};
      state.activeChapter = 1;
      state.paidReportId = '';
      state.paymentContext = null;
    }

    state.mode = mode;
    state.payload = nextPayload;
    state.reportId = nextReportId;
    persistState();

    state.generating = true;
    setGenerateButtonBusy(true);
    setPartnerButtonsBusy(true);

    try {
      await generateAllChapters();
      state.paymentContext = null;
      renderResultScreen();
      persistState();
      notify(state.mode === MODE_COMPAT
        ? '커플 연애 비책 13챕터 생성이 완료되었습니다.'
        : '연애 비책 13챕터 생성이 완료되었습니다.');
    } catch (err) {
      console.error('[LoveSecret] generation failed:', err);
      await attemptLoveSecretAutoRefund('연애 비책 PDF 생성 실패 자동 환불');
      setErrorScreen(asText(err && err.message) || '연애 비책 생성 중 오류가 발생했습니다.');
    } finally {
      state.generating = false;
      setGenerateButtonBusy(false);
      setPartnerButtonsBusy(false);
    }
  }

  async function attemptLoveSecretAutoRefund(reason) {
    var reasonText = String(reason || '');
    if (!/LOCAL_REPORT_FAILED|로컬\s*리포트\s*실패/i.test(reasonText)) return false;
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
          featureKey: String(ctx.featureKey || MODE_FEATURE_KEY[state.mode] || MODE_FEATURE_KEY[MODE_SOLO]),
          sourceTransactionId: String(ctx.sourceTransactionId || ''),
          requestId: String(('refund:' + (ctx.requestId || state.reportId || Date.now())).slice(0, 120)),
          reason: String(reason || '연애 비책 PDF 생성 실패 자동 환불')
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

      console.warn('[LoveSecret] auto refund failed:', payload);
      return false;
    } catch (error) {
      console.warn('[LoveSecret] auto refund exception:', error);
      return false;
    } finally {
      state.refundInFlight = false;
    }
  }

  function ensureCoinGateAndStart(mode, partnerPayload) {
    if (state.coinGatePending) {
      notify('결제 확인이 진행 중입니다. 잠시만 기다려 주세요.');
      return;
    }

    var built = buildGenerationPayload(mode, partnerPayload);
    if (!built.ok) {
      notify(built.message || '생성 준비에 실패했습니다.');
      return;
    }

    var hasCompletedReport = chapterCount() >= TOTAL_CHAPTERS;
    var runNonce = hasCompletedReport ? Date.now().toString(36) : '';
    var reportId = createReportId(built.payload, mode, partnerPayload, runNonce);
    var alreadyHasProgress = state.reportId === reportId && chapterCount() > 0;
    if ((alreadyHasProgress && chapterCount() < TOTAL_CHAPTERS) || (state.paidReportId === reportId && chapterCount() < TOTAL_CHAPTERS)) {
      startGeneration(mode, partnerPayload, runNonce);
      return;
    }

    var cost = mode === MODE_COMPAT ? MODE_COST.compatibility : MODE_COST.solo;
    var reason = mode === MODE_COMPAT ? MODE_REASON.compatibility : MODE_REASON.solo;
    var featureKey = mode === MODE_COMPAT ? MODE_FEATURE_KEY.compatibility : MODE_FEATURE_KEY.solo;

    function finalizeCoinGatePending() {
      state.coinGatePending = false;
      setPartnerButtonsBusy(false);
    }

    state.coinGatePending = true;
    setPartnerButtonsBusy(true);
    showOnly('lsLoadingScreen');
    setLoadingProgress(1, getChapterTitlesByMode(mode)[0] || '생성 준비 중...');

    if (typeof window._cdCoinGatePerUse === 'function') {
      window._cdCoinGatePerUse(
        cost,
        reason,
        function (transactionId) {
          finalizeCoinGatePending();
          state.paymentContext = {
            featureKey: featureKey,
            cost: Number(cost || 0),
            sourceTransactionId: String(transactionId || ''),
            requestId: String(('lovesecret:' + reportId + ':' + Date.now()).slice(0, 120))
          };
          state.paidReportId = reportId;
          persistState();
          startGeneration(mode, partnerPayload, runNonce);
        },
        function () {
          finalizeCoinGatePending();
          showOnly('lsPartnerScreen');
        },
        { featureKey: featureKey }
      );
      return;
    }

    finalizeCoinGatePending();
    startGeneration(mode, partnerPayload, runNonce);
  }

  function buildLocalPrintableHtml() {
    var ownerName = asText(state.payload && state.payload.name) || '사용자';
    var coverTitle = state.mode === MODE_COMPAT ? ownerName + '님의 커플 연애 비책' : ownerName + '님의 연애 비책';
    var chapterBlocks = [];

    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      var text = asText(state.chapterTexts[i]);
      if (!text) continue;
      var title = asText(state.chapterMeta[i] && state.chapterMeta[i].title) || getChapterTitlesByMode(state.mode)[i - 1] || ('Chapter ' + i);
      chapterBlocks.push(
        '<section class="lb-print-chapter">'
        + '<h1>' + escapeHtml(title) + '</h1>'
        + markdownToHtml(text)
        + '</section>'
      );
    }

    return [
      '<!doctype html>',
      '<html lang="ko">',
      '<head>',
      '<meta charset="utf-8" />',
      '<title>' + escapeHtml(coverTitle) + '</title>',
      '<style>',
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;600;700&display=swap");',
      'body{margin:0;padding:26px;font-family:"Noto Serif KR","Noto Sans KR",serif;background:#fff7fb;color:#1f2937;line-height:1.86;word-break:keep-all}',
      '.lb-print-cover{padding:28px;border:1px solid #f2bfd7;border-radius:18px;background:#fff;margin-bottom:26px}',
      '.lb-print-cover h1{margin:0 0 8px;font-size:34px;line-height:1.35;color:#9d174d}',
      '.lb-print-chapter{margin-bottom:24px;padding:22px;border:1px solid #f6d7e7;border-radius:14px;background:#fff}',
      '.lb-print-chapter h1{margin:0 0 12px;font-size:25px;line-height:1.4;color:#be185d}',
      '.lb-print-chapter h2{margin:18px 0 10px;font-size:20px;line-height:1.45;color:#be185d}',
      '.lb-print-chapter h3{margin:14px 0 8px;font-size:17px;line-height:1.5;color:#db2777}',
      '.lb-print-chapter p{margin:0 0 12px;font-size:15px;line-height:1.9}',
      '.lb-print-chapter ul{margin:0 0 10px 18px;padding:0}',
      '.lb-print-chapter blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid #ec4899;background:#fdf2f8;color:#831843}',
      '.lb-table{width:100%;border-collapse:collapse;margin:10px 0}',
      '.lb-table td{border:1px solid #f2bfd7;padding:6px 8px;font-size:13px}',
      '.love-secret-print__disclaimer{margin-top:18px;color:#6b7280;font-size:12px}',
      '@page{size:A4;margin:14mm}',
      '@media print{body{padding:0;background:#fff}.lb-print-cover,.lb-print-chapter{border:none;border-radius:0;box-shadow:none}}',
      '</style>',
      '</head>',
      '<body>',
      '<section class="lb-print-cover">',
      '<h1>' + escapeHtml(coverTitle) + '</h1>',
      '<p>생성일: ' + escapeHtml(formatDateLabel()) + '</p>',
      '</section>',
      chapterBlocks.join('\n'),
      '<section class="love-secret-print__disclaimer">본 리포트는 사주 기반의 해석 정보이며, 개인의 판단을 대신하지 않습니다.</section>',
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

  async function downloadLoveSecret() {
    var html = '';
    if (state.reportId) {
      var downloaded = await fetchDownloadHtml(state.reportId).catch(function () {
        return { ok: false, status: 0, text: '' };
      });

      if (!downloaded.ok && (downloaded.status === 401 || downloaded.status === 403)) {
        throw new Error('로그인이 필요합니다. 다시 로그인 후 시도해 주세요.');
      }
      if (downloaded.ok && downloaded.text) html = downloaded.text;
    }

    if (!html) html = buildLocalPrintableHtml();
    if (!openPrintWindow(html)) {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'love-secret-' + (state.reportId || Date.now()) + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
      notify('HTML 파일로 다운로드되었습니다. 브라우저에서 열어 인쇄 > PDF 저장을 선택해 주세요.');
    }
  }

  function preparePartnerScreen() {
    setPartnerGender(getPartnerGender());
    renderPartnerPreview();
    showOnly('lsPartnerScreen');
  }

  function renderResultRecoveryIfNeeded() {
    return restorePersistedCompletedReport();
  }

  window.resetLoveSecretState = function () {
    resetState();
    refreshSavedReportButton();
    showOnly('lsStartScreen');
  };

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  window.openLoveSecretModal = function (profileArg) {
    var modal = qs('loveSecretModal');
    if (!modal) return;
    applyActiveProfileArg(profileArg);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    modal.setAttribute('aria-hidden', 'false');

    if (state.generating) {
      showOnly('lsLoadingScreen');
      return;
    }
    resetState();
    syncStartPreviewChapters(state.mode);
    refreshSavedReportButton();
    showOnly('lsStartScreen');
  };

  window.closeLoveSecretModal = function () {
    var modal = qs('loveSecretModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    modal.setAttribute('aria-hidden', 'true');
  };

  window.generateLoveSecret = function () {
    if (state.generating) return;
    resetState();
    syncStartPreviewChapters(state.mode);
    preparePartnerScreen();
  };

  window.openLoveSecretLatestReport = function () {
    restorePersistedCompletedReport();
  };

  window.lsSkipPartner = function () {
    ensureCoinGateAndStart(MODE_SOLO, null);
  };

  window.lsStartWithPartner = function () {
    var partner = buildPartnerPayload();
    if (!partner.ok) {
      notify(partner.message || '상대방 정보를 확인해 주세요.');
      return;
    }
    ensureCoinGateAndStart(MODE_COMPAT, partner);
  };

  window.downloadLoveSecretPdf = function () {
    downloadLoveSecret().catch(function (err) {
      console.error('[LoveSecret] download failed:', err);
      notify(asText(err && err.message) || '다운로드 처리 중 오류가 발생했습니다.');
    });
  };

  window.shareLoveSecretKakao = function () {
    var shareText = '내 연애 비책이 완성되었어요.\n' + window.location.origin + '/?love-secret=' + encodeURIComponent(state.reportId || 'ready');
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
      if (action === 'openLoveSecretModal') {
        event.preventDefault();
        window.openLoveSecretModal();
        return;
      }
      if (action === 'closeLoveSecretModal') {
        event.preventDefault();
        window.closeLoveSecretModal();
        return;
      }
      if (action === 'generateLoveSecret') {
        event.preventDefault();
        window.generateLoveSecret();
        return;
      }
      if (action === 'openLoveSecretLatestReport') {
        event.preventDefault();
        window.openLoveSecretLatestReport();
        return;
      }
      if (action === 'lsSkipPartner') {
        event.preventDefault();
        window.lsSkipPartner();
        return;
      }
      if (action === 'lsStartWithPartner') {
        event.preventDefault();
        window.lsStartWithPartner();
        return;
      }
      if (action === 'downloadLoveSecretPdf') {
        event.preventDefault();
        window.downloadLoveSecretPdf();
        return;
      }
      if (action === 'shareLoveSecretKakao') {
        event.preventDefault();
        window.shareLoveSecretKakao();
        return;
      }
    }

    var tocItem = target.closest('.ls-toc-item[data-ls-chapter]');
    if (tocItem) {
      var chapter = Number(tocItem.getAttribute('data-ls-chapter') || 1);
      openResultChapter(chapter);
      return;
    }

    var maleBtn = target.closest('#lsPsGenderM');
    if (maleBtn) {
      setPartnerGender('M');
      renderPartnerPreview();
      return;
    }

    var femaleBtn = target.closest('#lsPsGenderF');
    if (femaleBtn) {
      setPartnerGender('F');
      renderPartnerPreview();
      return;
    }
  }, false);

  document.addEventListener('input', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches('#lsPsName, #lsPsYear, #lsPsMonth, #lsPsDay, #lsPsHour')) {
      renderPartnerPreview();
    }
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var modal = qs('loveSecretModal');
    if (modal && modal.style.display !== 'none') window.closeLoveSecretModal();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadPersistedState(false);
      syncStartPreviewChapters(state.mode);
      renderPartnerPreview();
      refreshSavedReportButton();
      resetState();
    }, { once: true });
  } else {
    loadPersistedState(false);
    syncStartPreviewChapters(state.mode);
    renderPartnerPreview();
    refreshSavedReportButton();
    resetState();
  }
})();