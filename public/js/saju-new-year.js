(function () {
  'use strict';

  var TOTAL_CHAPTERS = 10;
  var COST_COINS = 300;
  var COIN_REASON = '사주 신년운세 PDF 리포트 생성';
  var COIN_FEATURE_KEY = 'premium-saju-newyear-report';
  var SAJU_NEW_YEAR_REPORT_TYPE = 'sajuNewYear';
  var SAJU_NEW_YEAR_FEATURE_TYPE = 'saju_new_year_pdf';
  var API_TIMEOUT_MS = 140000;
  var STATE_STORAGE_KEY = '__cd_saju_new_year_state_v1__';
  var NEW_YEAR_COVER_IMAGE = '/fuctionassets/신년운세.webp?v=20260519-ny-cover';
  var SAJU_DATA_SNIPPET_LIMIT = 1800;

  var CHAPTER_DEFINITIONS = [
    { index: 1, title: '연간 파동 총론 — 올해의 기본 기조', subtitle: '올해 운영의 중심축과 기본 태도' },
    { index: 2, title: '커리어 전략 — 성과가 나는 월/주의 월', subtitle: '일의 성과 창과 주의 구간 운영' },
    { index: 3, title: '재물 흐름 — 수익/지출 관리 타이밍', subtitle: '현금흐름 중심의 수익/지출 전략' },
    { index: 4, title: '관계·인맥 — 협업과 거리두기 전략', subtitle: '사람을 통한 확장과 경계 설계' },
    { index: 5, title: '연애·가정 — 감정 파동 관리법', subtitle: '가까운 관계의 감정 리듬 관리' },
    { index: 6, title: '건강·에너지 — 번아웃 방지 설계', subtitle: '회복 루틴과 에너지 운영 시스템' },
    { index: 7, title: '분기별 핵심 의사결정 포인트', subtitle: '1~4분기 선택 기준과 실행 체크' },
    { index: 8, title: '리스크 시나리오와 대응 플랜', subtitle: '문제 발생 전후 대응 단계 설계' },
    { index: 9, title: '12개월 Go/Stop 월별 테이블', subtitle: '월별 행동 판정과 즉시 실행 지침' },
    { index: 10, title: '최종 실행 로드맵 — 연말 회수 전략', subtitle: '상하반기 운영과 연말 결과 회수' }
  ];

  var CHAPTER_STRUCTURED_LABELS = {
    1: ['올해 세운의 천간 분석', '올해 세운의 지지 분석', '원국과 세운의 기본 관계', '올해 강해지는 오행', '올해 약해지는 오행', '올해 들어오는 십성', '올해의 용신·희신 작용', '올해의 기신·구신 작용', '올해의 합·충·형·파·해 구조', '올해 운세의 전체 분위기', '올해 가장 중요한 인생 주제', '올해 반드시 잡아야 할 기회', '올해 조심해야 할 흐름', '올해의 한 줄 운세 키워드'],
    2: ['올해 직업운 총론', '관성으로 보는 직장·조직운', '식상으로 보는 성과·표현운', '재성으로 보는 실적·수익 연결성', '인성으로 보는 공부·자격·문서운', '이직 가능성', '승진·평가운', '사업 확장 가능성', '직장 내 갈등 가능성', '성과가 잘 나는 시기', '실수를 조심해야 하는 시기', '귀인과 협업운', '피해야 할 업무 방식', '올해 커리어 핵심 전략', '직업운 한 줄 조언'],
    3: ['올해 재물운 총론', '정재 흐름 분석', '편재 흐름 분석', '고정 수입 흐름', '부수입/보너스/투자 운', '수입이 잘 붙는 시기', '큰 지출 주의 시기', '투자/확장 유리 구간', '손실 리스크 흐름', '계약/금전 약속 주의점', '재물을 돕는 오행', '재물을 막는 오행', '돈을 모으는 방법', '피해야 할 소비 습관', '재물운 한 줄 전략'],
    4: ['올해 관계운 총론', '비견/겁재로 보는 친구·동료운', '관성으로 보는 상사·조직운', '인성으로 보는 멘토·지원운', '재성으로 보는 실리 인맥', '식상으로 보는 소통운', '도움 되는 사람 유형', '거리둘 사람 유형', '협업운', '비즈니스 파트너십운', '갈등 가능성', '오해가 잦은 시기', '귀인 시기', '관계 리셋 타이밍', '관계운 한 줄 조언'],
    5: ['올해 연애/가정 총론', '싱글 인연운', '기존 관계 흐름', '결혼/약속운', '배우자궁-세운 관계', '남성 명식 재성 흐름', '여성 명식 관성 흐름', '도화/홍염 매력운', '가족 관계 흐름', '감정 기복 시기', '갈등 주의 시기', '관계 심화 시기', '거리/이별 주의 흐름', '가정 안정 전략', '연애·가정 한 줄 조언'],
    6: ['올해 건강운 총론', '오행별 취약 포인트', '목-간/신경', '화-심장/혈류', '토-소화기', '금-호흡기', '수-신장/수면/면역', '조후 기준 신체 흐름', '피로 누적 시기', '스트레스 정점 시기', '번아웃 가능성', '사고/부상 주의 흐름', '회복에 유리한 리듬', '건강 우선 과제', '건강 한 줄 조언'],
    7: ['1분기 전체 흐름', '1분기 선택할 것', '1분기 피할 것', '2분기 전체 흐름', '2분기 확장 가능성', '2분기 리스크 주의', '3분기 전체 흐름', '3분기 관계/재물/커리어 변화', '3분기 감정/건강 관리', '4분기 전체 흐름', '4분기 성과 회수 전략', '4분기 정리 과제', '분기 키워드', '분기 Go/Stop 판단', '핵심 결정 타이밍'],
    8: ['올해 최대 리스크', '원국-세운 충돌 지점', '과합/과파 문제', '강한 충돌 영역', '형/파/해 충돌', '금전 손실 시나리오', '커리어 이슈 시나리오', '관계 이슈 시나리오', '연애/가정 이슈 시나리오', '건강/멘탈 이슈 시나리오', '위기 증폭 조건', '위기 완화 행동 규칙', '조기 경보 신호', '회복 플랜', '리스크 한 줄 전략'],
    9: ['월별 운세 및 Go/Stop 포인트', '월별 커리어 핵심', '월별 재물 핵심', '월별 관계 핵심', '월별 건강 핵심', '월별 해야 할 것', '월별 피할 것'],
    10: ['연간 핵심 요약', '반드시 살릴 기회', '반드시 줄일 리스크', '커리어/사업 최종 전략', '재물 최종 전략', '관계 최종 전략', '연애/가정 최종 전략', '건강/멘탈 최종 전략', '상반기 실행 계획', '하반기 실행 계획', '연말 성과 회수 전략', '다음 해로 넘기지 않을 과제', '다음 해 기반 준비', '최종 행동 가이드', '최종 한 줄 조언']
  };

  var MYSTIC_QUOTES = [
    '연간 파동을 월 단위 전략으로 해석하는 중입니다...',
    '원국의 핵심 축을 실행 전략으로 번역하는 중입니다...',
    '강한 달과 조심할 달을 정밀하게 정리하는 중입니다...',
    '커리어·재물·관계·건강 우선순위를 계산 중입니다...',
    '신년 운세 액션 플랜을 최종 정리 중입니다...'
  ];

  var state = {
    generating: false,
    reportId: '',
    reportSessionId: '',
    paidReportId: '',
    paymentContext: null,
    paymentVerified: false,
    refundInFlight: false,
    payload: null,
    chapterTexts: {},
    chapterStructured: {},
    chapterMeta: {},
    activeChapter: 1
  };

  function safeStructuredText(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '';
    if (/about:blank/i.test(raw)) return '';
    if (/^\s*[\[{]/.test(raw)) return '';
    return raw;
  }

  function deriveTextFromChapterJson(chapterJson) {
    if (!chapterJson || typeof chapterJson !== 'object') return '';
    var sections = Array.isArray(chapterJson.sections) ? chapterJson.sections : [];
    var parts = [];
    for (var i = 0; i < sections.length; i += 1) {
      var row = sections[i] || {};
      var body = safeStructuredText(row.body || row.content || '');
      if (!body) continue;
      var title = safeStructuredText(row.title || row.label || '');
      if (title) parts.push('## ' + title + '\n' + body);
      else parts.push(body);
    }
    if (!parts.length) return '';
    return parts.join('\n\n');
  }

  function renderStructuredChapterBody(chapter, chapterJson) {
    if (!chapterJson || typeof chapterJson !== 'object') return '';
    var sections = Array.isArray(chapterJson.sections) ? chapterJson.sections : [];
    if (!sections.length) return '';

    var labels = CHAPTER_STRUCTURED_LABELS[Number(chapter)] || [];
    var out = [];

    for (var i = 0; i < sections.length; i += 1) {
      var row = sections[i] || {};
      var content = safeStructuredText(row.body || row.content || '');
      if (!content) continue;
      var title = safeStructuredText(row.title || row.label || labels[i] || ('핵심 항목 ' + String(i + 1)));
      out.push(
        '<section class="lb-result-article__section">'
          + '<h4 class="lb-result-article__section-title">' + escapeHtml(title) + '</h4>'
          + '<div class="lb-result-article__section-body">' + markdownToHtml(content) + '</div>'
        + '</section>'
      );
    }

    if (!out.length) return '';
    return '<div class="lb-result-article__structured">' + out.join('') + '</div>';
  }

  function qs(id) { return document.getElementById(id); }

  function qsa(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function notify(message) {
    var text = String(message || '');
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(text);
        return;
      }
    } catch (_) {}
    try { window.alert(text); } catch (_) {}
  }

  function logSajuNewYear(stage, payload) {
    try {
      if (payload && typeof payload === 'object') {
        console.info('[SajuNewYear] ' + String(stage || 'UNKNOWN_STAGE'), payload);
      } else {
        console.info('[SajuNewYear] ' + String(stage || 'UNKNOWN_STAGE'));
      }
    } catch (_) {}
  }

  function toSafeUserError(error) {
    var raw = String((error && error.message) || '').trim();
    if (!raw) return '신년운세 생성 중 오류가 발생했습니다.';
    if (/\b500\b|internal\s*server\s*error|http\s*500/i.test(raw)) {
      return '리포트 생성 중 일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (/quality|품질|chapter-\d+/i.test(raw)) {
      return '리포트 품질 보정 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (/timeout|quota|invalid\s*json|api\s*실패/i.test(raw)) {
      return '리포트 생성 중 일시적인 응답 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    return raw;
  }

  function getAuthToken() {
    try { return String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { return ''; }
  }

  function resolveApiUrl(input) {
    var raw = String(input || '').trim();
    if (!raw) return raw;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return raw;
    if (raw.indexOf('//') === 0) {
      try { return String(window.location.protocol || 'https:') + raw; }
      catch (_) { return raw; }
    }
    if (raw.charAt(0) === '/') {
      try {
        var origin = String(window.location.origin || '').replace(/\/$/, '');
        return origin ? (origin + raw) : raw;
      } catch (_) {
        return raw;
      }
    }
    try { return new URL(raw, window.location.href).toString(); }
    catch (_) { return raw; }
  }

  function buildApiCandidates(pathname) {
    var p = String(pathname || '');
    if (p.charAt(0) !== '/') p = '/' + p;
    var seen = {};
    var out = [];

    function pushBase(raw) {
      var b = String(raw || '').trim();
      var u = b ? (b.replace(/\/+$/, '') + p) : p;
      if (!u || seen[u]) return;
      seen[u] = true;
      out.push(u);
    }

    pushBase('');
    try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase(localStorage.getItem('fortune_api_base_url') || ''); } catch (_) {}
    try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}

    return out.length ? out : [p];
  }

  function readPremiumAccessToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (token) return token;
    try { token = String(state.paymentContext && state.paymentContext.premiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (token) return token;
    try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    if (token) return token;
    try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    return token;
  }

  function extractPremiumAccessTokenFromPayload(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    var nested = source.data && typeof source.data === 'object' ? source.data : null;
    var consume = source.consume && typeof source.consume === 'object' ? source.consume : null;
    var candidates = [
      source.premiumAccessToken,
      source.premium_access_token,
      source.accessToken,
      nested && nested.premiumAccessToken,
      nested && nested.premium_access_token,
      nested && nested.accessToken,
      consume && consume.premiumAccessToken,
      consume && consume.premium_access_token,
      consume && consume.accessToken
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var token = String(candidates[i] || '').trim();
      if (token) return token;
    }
    return '';
  }

  function persistPremiumAccessToken(payload) {
    var token = extractPremiumAccessTokenFromPayload(payload);
    if (!token) return '';

    try {
      if (typeof window.__cdPersistPremiumAccessToken === 'function') {
        window.__cdPersistPremiumAccessToken(token);
        return token;
      }
    } catch (_) {}

    try { window.__cdPremiumAccessToken = token; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', token); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', token); } catch (_) {}
    return token;
  }

  function normalizePaymentContext(input) {
    var source = input && typeof input === 'object' ? input : {};
    var nested = source.data && typeof source.data === 'object' ? source.data : {};
    var consume = source.consume && typeof source.consume === 'object' ? source.consume : {};
    var payment = source.payment && typeof source.payment === 'object' ? source.payment : {};

    var transactionId = String(
      source.transactionId
      || source.sourceTransactionId
      || source.paymentId
      || source.id
      || consume.transactionId
      || nested.transactionId
      || payment.transactionId
      || payment.sourceTransactionId
      || ''
    ).trim();
    var receiptId = String(
      source.receiptId
      || source.receipt
      || consume.receiptId
      || consume.receipt
      || nested.receiptId
      || nested.receipt
      || payment.receiptId
      || payment.receipt
      || ''
    ).trim();
    var orderId = String(
      source.orderId
      || source.merchantUid
      || consume.orderId
      || nested.orderId
      || payment.orderId
      || ''
    ).trim();
    var requestId = String(
      source.requestId
      || source.sourceRequestId
      || consume.requestId
      || nested.requestId
      || payment.requestId
      || payment.sourceRequestId
      || ''
    ).trim();

    var premiumAccessToken = persistPremiumAccessToken(source) || '';
    if (!premiumAccessToken) premiumAccessToken = persistPremiumAccessToken(nested) || '';
    if (!premiumAccessToken) premiumAccessToken = persistPremiumAccessToken(consume) || '';
    if (!premiumAccessToken) premiumAccessToken = String(source.premiumAccessToken || nested.premiumAccessToken || consume.premiumAccessToken || '').trim();

    return {
      featureKey: String(source.featureKey || COIN_FEATURE_KEY),
      featureType: SAJU_NEW_YEAR_FEATURE_TYPE,
      reportType: SAJU_NEW_YEAR_REPORT_TYPE,
      cost: Number(source.cost || COST_COINS || 0),
      sourceTransactionId: transactionId,
      transactionId: transactionId,
      receiptId: receiptId || undefined,
      orderId: orderId || undefined,
      requestId: requestId || undefined,
      premiumAccessToken: premiumAccessToken || undefined,
      paidAt: String(source.paidAt || new Date().toISOString())
    };
  }

  function buildAuthHeaders(base, authContext) {
    var headers = Object.assign({}, base || {});
    var token = getAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    var premiumAccessToken = '';
    try {
      premiumAccessToken = String((authContext && authContext.premiumAccessToken) || readPremiumAccessToken() || '').trim();
    } catch (_) {
      premiumAccessToken = '';
    }
    if (premiumAccessToken) headers['x-premium-access-token'] = premiumAccessToken;
    return headers;
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
      if (!inList) return;
      out.push('</ul>');
      inList = false;
    }

    function closeTable() {
      if (!inTable) return;
      out.push('</tbody></table>');
      inTable = false;
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
      if (/^\d+\.\s+/.test(line)) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push('<li>' + escapeHtml(line.replace(/^\d+\.\s+/, '')) + '</li>');
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
    var authUser = null;

    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }
    try { snapshot = window.__destinyFlowerSajuSnapshot || null; } catch (_) { snapshot = null; }
    try { authUser = safeParse(localStorage.getItem('fortune_auth_user') || 'null', null) || null; } catch (_) { authUser = null; }

    var fromProfile = profile && profile.birth ? profile.birth : null;
    var fromSnapshot = snapshot && snapshot.birth ? snapshot.birth : null;

    var parsedAuthDate = parseDateParts((authUser && (authUser.birthDate || authUser.dateOfBirth)) || '');
    var parsedAuthTime = parseTimeParts((authUser && authUser.birthTime) || '');

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
      || (authUser && (authUser.calendarType || authUser.calType))
      || 'solar'
    );
    var timeUnknownRaw = String(
      (fromProfile && (fromProfile.timeUnknown || fromProfile.birthTimeUnknown || fromProfile.unknownTime))
      || (profile && (profile.timeUnknown || profile.birthTimeUnknown || profile.unknownTime))
      || (fromSnapshot && (fromSnapshot.timeUnknown || fromSnapshot.birthTimeUnknown || fromSnapshot.unknownTime))
      || (snapshot && (snapshot.timeUnknown || snapshot.birthTimeUnknown || snapshot.unknownTime))
      || (authUser && (authUser.timeUnknown || authUser.birthTimeUnknown))
      || ''
    ).trim().toLowerCase();
    var timeUnknown = timeUnknownRaw === '1' || timeUnknownRaw === 'true' || timeUnknownRaw === 'y';

    var location = (profile && profile.location && typeof profile.location === 'object') ? profile.location : {};
    var timezone = String(location.tz || (authUser && (authUser.timezone || authUser.tz)) || 'Asia/Seoul').trim() || 'Asia/Seoul';
    var lat = Number(location.lat);
    var lon = Number(location.lng);
    if (!Number.isFinite(lat)) lat = 37.5665;
    if (!Number.isFinite(lon)) lon = 126.9780;

    var profileId = String((profile && (profile.profileId || profile.id)) || (authUser && (authUser.profileId || authUser.id)) || '').trim();
    var name = String((profile && profile.name) || (authUser && (authUser.name || authUser.nickname)) || '사용자').trim() || '사용자';
    var gender = String((profile && profile.gender) || (authUser && authUser.gender) || 'unknown').trim() || 'unknown';
    var birthPlace = String((profile && (profile.birthPlace || (profile.location && profile.location.birthPlace) || profile.place)) || (authUser && (authUser.birthPlace || authUser.place)) || '').trim();
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

  function extractDaewunRows(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && out.length < 8; i += 1) {
      var row = raw[i] || {};
      var ganji = String(row.ganji || row.gz || row.label || row.name || '').trim();
      if (!ganji && row.stem && row.branch) ganji = String(row.stem) + String(row.branch);
      if (!ganji) continue;
      var fromAge = Number.isFinite(Number(row.fromAge)) ? Number(row.fromAge) : '';
      var toAge = Number.isFinite(Number(row.toAge)) ? Number(row.toAge) : '';
      out.push({ ganji: ganji, fromAge: fromAge, toAge: toAge });
    }
    return out;
  }

  function buildPillarSummary(pillars) {
    var p = pillars || {};
    var y = p.y || p.year || {};
    var m = p.m || p.month || {};
    var d = p.d || p.day || {};
    var h = p.h || p.hour || {};
    var yearGanji = String((y.g || '') + (y.j || '') || y.ganji || '').trim();
    var monthGanji = String((m.g || '') + (m.j || '') || m.ganji || '').trim();
    var dayGanji = String((d.g || '') + (d.j || '') || d.ganji || '').trim();
    var hourGanji = String((h.g || '') + (h.j || '') || h.ganji || '').trim();
    return {
      yearGanji: yearGanji,
      monthGanji: monthGanji,
      dayGanji: dayGanji,
      hourGanji: hourGanji,
      dayStem: String(d.g || d.stem || '').trim(),
      monthBranch: String(m.j || m.branch || '').trim()
    };
  }

  function buildEngineData() {
    var snapshot = null;
    var pillars = null;
    var elementWeights = null;
    var power = null;
    var johu = null;
    var daewun = null;

    try { snapshot = window.__destinyFlowerSajuSnapshot || null; } catch (_) { snapshot = null; }
    try { pillars = window.G_PILLARS || null; } catch (_) { pillars = null; }
    try { elementWeights = window.G_NATAL || null; } catch (_) { elementWeights = null; }
    try { power = window.G_POWER || null; } catch (_) { power = null; }
    try { johu = window.G_JOHU || null; } catch (_) { johu = null; }
    try { daewun = Array.isArray(window.G_DAEWUN) ? window.G_DAEWUN : null; } catch (_) { daewun = null; }

    var rawPillars = (snapshot && (snapshot.pillars || snapshot.saju?.pillars)) || pillars || {};
    var dayRow = rawPillars.d || rawPillars.day || {};
    var dayMaster = String((snapshot && (snapshot.dayMaster || snapshot.saju?.dayMaster)) || dayRow.g || dayRow.stem || '').trim();
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
      dayMaster: dayMaster,
      pillars: rawPillars,
      elementWeights: elementWeights || {},
      tenGods: power && typeof power.tenGods === 'object' ? power.tenGods : {},
      usefulGods: {
        yongsin: yongsin,
        huisin: huisin,
        gisin: gisin
      },
      seasonMeta: johu || undefined,
      daewunRows: extractDaewunRows(daewun)
    };
  }

  function buildCompactSajuData() {
    var engine = buildEngineData() || {};
    var summary = buildPillarSummary(engine.pillars || {});
    var elementWeights = engine.elementWeights && typeof engine.elementWeights === 'object' ? engine.elementWeights : {};
    var tenGods = engine.tenGods && typeof engine.tenGods === 'object' ? engine.tenGods : {};
    var useful = engine.usefulGods && typeof engine.usefulGods === 'object' ? engine.usefulGods : {};
    var daewunRows = Array.isArray(engine.daewunRows) ? engine.daewunRows : [];

    var sourceRaw = '';
    try {
      sourceRaw = String(localStorage.getItem('fortune_result_raw_json') || '');
    } catch (_) {
      sourceRaw = '';
    }

    var compact = [
      '사주 원국 요약',
      '- 오행/십성/대운/세운/월운 기준의 신년 해석 데이터',
      '- 년주: ' + (summary.yearGanji || '정보 부족'),
      '- 월주: ' + (summary.monthGanji || '정보 부족'),
      '- 일주: ' + (summary.dayGanji || '정보 부족'),
      '- 시주: ' + (summary.hourGanji || '정보 부족'),
      '- 일간: ' + (summary.dayStem || engine.dayMaster || '정보 부족'),
      '- 월지: ' + (summary.monthBranch || '정보 부족')
    ];

    var hasElementWeights = ['wood', 'fire', 'earth', 'metal', 'water'].some(function (key) {
      return Number.isFinite(Number(elementWeights[key]));
    });
    if (hasElementWeights) {
      compact.push(
        '- 오행 분포: '
          + '목(' + Number(elementWeights.wood || 0) + ') '
          + '화(' + Number(elementWeights.fire || 0) + ') '
          + '토(' + Number(elementWeights.earth || 0) + ') '
          + '금(' + Number(elementWeights.metal || 0) + ') '
          + '수(' + Number(elementWeights.water || 0) + ')'
      );
    }

    var tenGodEntries = Object.keys(tenGods).map(function (key) {
      return key + ':' + Number(tenGods[key] || 0);
    }).filter(Boolean);
    if (tenGodEntries.length) {
      compact.push('- 십성 분포: ' + tenGodEntries.join(', '));
    }

    compact.push('- 용신: ' + (String(useful.yongsin || '').trim() || '정보 부족'));
    compact.push('- 희신: ' + (String(useful.huisin || '').trim() || '정보 부족'));
    compact.push('- 기신: ' + (String(useful.gisin || '').trim() || '정보 부족'));

    if (daewunRows.length) {
      var daewunText = daewunRows.map(function (row) {
        var ageText = row.fromAge !== '' && row.toAge !== '' ? ('(' + row.fromAge + '~' + row.toAge + ')') : '';
        return String(row.ganji || '') + ageText;
      }).filter(Boolean).join(', ');
      if (daewunText) compact.push('- 대운(요약): ' + daewunText);
    }

    var snippet = String(sourceRaw || '').replace(/\s+/g, ' ').trim().slice(0, SAJU_DATA_SNIPPET_LIMIT);
    if (snippet) {
      compact.push('- 원본 데이터 스니펫: ' + snippet);
    }

    return compact.join('\n');
  }

  function buildStructuredSajuData() {
    var birth = normalizeBirthParts();
    var engine = buildEngineData() || {};
    var compact = buildCompactSajuData();
    var pillars = engine.pillars || {};

    return {
      profile: {
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
      engineData: engine,
      canonicalSajuChart: {
        profile: {
          name: birth.name,
          gender: birth.gender,
          birthDate: birth.birthDate,
          birthTime: birth.birthTime,
          calendarType: birth.calendarType,
          isLunar: birth.isLunar,
          timeUnknown: birth.timeUnknown,
          timezone: birth.timezone
        },
        dayMaster: engine.dayMaster || '',
        fourPillars: pillars,
        pillars: pillars,
        fiveElements: engine.elementWeights || {},
        tenGods: engine.tenGods || {},
        luck: {
          daewoon: engine.daewunRows || [],
          monthlyLuck: []
        },
        usefulGods: engine.usefulGods || {},
        seasonMeta: engine.seasonMeta || undefined,
        sourceSummary: compact
      },
      sajuCore: {
        pillars: pillars,
        dayMaster: engine.dayMaster || '',
        monthCommand: String((pillars && pillars.m && (pillars.m.command || pillars.m.monthCommand)) || '').trim(),
        tenGodEvidence: engine.tenGods || {},
        usefulGods: engine.usefulGods || {},
        elementWeights: engine.elementWeights || {},
        daewunRows: engine.daewunRows || []
      },
      sourceSummary: compact,
      sourceDigest: compact,
    };
  }

  function buildPayload() {
    var birth = normalizeBirthParts();
    var profile = null;
    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }
    var structuredSajuData = buildStructuredSajuData();

    var targetYearInput = Number(qs('nyTargetYear') && qs('nyTargetYear').value || 0);
    var thisYear = new Date().getFullYear();
    if (!Number.isFinite(targetYearInput) || targetYearInput < thisYear - 1 || targetYearInput > thisYear + 3) {
      targetYearInput = thisYear;
    }

    return {
      profileId: birth.profileId || undefined,
      name: birth.name,
      gender: birth.gender,
      year: Number(birth.year || 0),
      month: Number(birth.month || 0),
      day: Number(birth.day || 0),
      hour: Number(birth.hour || 12),
      minute: Number(birth.minute || 0),
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
      targetYear: targetYearInput,
      focusArea: 'overall',
      _premiumStrictPayload: true,
      _premiumStrictValidation: true,
      engineData: structuredSajuData.engineData,
      canonicalSajuChart: structuredSajuData.canonicalSajuChart,
      sajuData: structuredSajuData,
      sajuDataText: String(structuredSajuData.sourceSummary || ''),
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
      payload.year,
      payload.month,
      payload.day,
      payload.hour,
      payload.minute,
      payload.targetYear,
      payload.name,
      Date.now().toString(36)
    ].join('|');

    var hash = 0;
    for (var i = 0; i < seed.length; i += 1) {
      hash = (hash * 131 + seed.charCodeAt(i)) % 2147483647;
    }
    return 'newyear_' + String(hash || 97).toString(36);
  }

  function chapterCount() {
    var count = 0;
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      if (state.chapterTexts[i]) count += 1;
    }
    return count;
  }

  function persistState() {
    try {
      var payload = {
        reportId: String(state.reportId || ''),
        reportSessionId: String(state.reportSessionId || ''),
        paidReportId: String(state.paidReportId || ''),
        paymentContext: state.paymentContext || null,
        payload: state.payload || null,
        chapterTexts: state.chapterTexts || {},
        chapterStructured: state.chapterStructured || {},
        chapterMeta: state.chapterMeta || {},
        activeChapter: Number(state.activeChapter || 1),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadPersistedState() {
    try {
      var raw = localStorage.getItem(STATE_STORAGE_KEY);
      if (!raw) return;
      var saved = safeParse(raw, null);
      if (!saved || typeof saved !== 'object') return;
      state.reportId = String(saved.reportId || '');
      state.reportSessionId = String(saved.reportSessionId || '');
      state.paidReportId = String(saved.paidReportId || '');
      state.paymentContext = saved.paymentContext && typeof saved.paymentContext === 'object' ? saved.paymentContext : null;
      state.payload = saved.payload || null;
      state.chapterTexts = saved.chapterTexts && typeof saved.chapterTexts === 'object' ? saved.chapterTexts : {};
      state.chapterStructured = saved.chapterStructured && typeof saved.chapterStructured === 'object' ? saved.chapterStructured : {};
      state.chapterMeta = saved.chapterMeta && typeof saved.chapterMeta === 'object' ? saved.chapterMeta : {};
      state.activeChapter = Number(saved.activeChapter || 1);
      if (!Number.isFinite(state.activeChapter) || state.activeChapter < 1 || state.activeChapter > TOTAL_CHAPTERS) {
        state.activeChapter = 1;
      }
    } catch (_) {}
  }

  function showOnly(screenId) {
    var screens = ['nyStartScreen', 'nyLoadingScreen', 'nyResultScreen', 'nyErrorScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
  }

  function ensureNewYearCinematicStyles() {
    if (document.getElementById('cdPremiumLoadingCinematicStyles')) return;
    var style = document.createElement('style');
    style.id = 'cdPremiumLoadingCinematicStyles';
    style.textContent = ''
      + '.lb-loading--cinematic{position:relative;overflow:hidden;--cd-glow-a:#f59e0b;--cd-glow-b:#b45309;--cd-ring:rgba(245,158,11,.42);}'
      + '.lb-loading--cinematic::before{content:"";position:absolute;inset:-18% -10% auto -10%;height:65%;background:radial-gradient(circle at center,var(--cd-ring),transparent 68%);pointer-events:none;opacity:.88;filter:blur(2px);}'
      + '.lb-loading--cinematic .lb-star{animation-duration:5.8s;}'
      + '.lb-loading--cinematic .lb-loading-chapter-box{animation:cd-premium-float 1.8s ease-in-out infinite;}'
      + '.lb-loading--cinematic .lb-progress-bar{background:linear-gradient(90deg,var(--cd-glow-a),#fff7ed,var(--cd-glow-b));background-size:200% 100%;animation:cd-premium-bar-shimmer 2.4s linear infinite;}'
      + '@keyframes cd-premium-bar-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'
      + '@keyframes cd-premium-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}';
    document.head.appendChild(style);
  }

  function activateNewYearCinematicLoading() {
    ensureNewYearCinematicStyles();
    var screen = qs('nyLoadingScreen');
    if (!screen) return;
    screen.classList.add('lb-loading--cinematic');
    screen.style.setProperty('--cd-glow-a', '#f59e0b');
    screen.style.setProperty('--cd-glow-b', '#b45309');
    screen.style.setProperty('--cd-ring', 'rgba(245,158,11,.42)');
  }

  function setGenerateButtonBusy(busy) {
    var btn = qs('nyGenerateBtn');
    if (!btn) return;
    btn.disabled = !!busy;
    btn.setAttribute('aria-disabled', busy ? 'true' : 'false');
  }

  function setErrorScreen(message) {
    var msg = qs('nyErrorMsg');
    if (msg) msg.textContent = String(message || '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    showOnly('nyErrorScreen');
  }

  function updateTocActive(chapter) {
    var tocButtons = qsa(qs('sajuNewYearModal'), '.ny-toc-item[data-ny-chapter]');
    tocButtons.forEach(function (btn) {
      var num = Number(btn.getAttribute('data-ny-chapter') || 0);
      if (num === chapter) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function renderResultChapter(chapter) {
    var contentEl = qs('nyChapterContent');
    if (!contentEl) return;
    var text = String(state.chapterTexts[chapter] || '').trim();
    var structured = state.chapterStructured[chapter] || null;
    var meta = state.chapterMeta[chapter] || {};
    var structuredBody = renderStructuredChapterBody(chapter, structured);
    var bodyHtml = structuredBody || (text ? markdownToHtml(text) : '');
    if (!bodyHtml) {
      contentEl.innerHTML = '<p>아직 생성되지 않은 챕터입니다.</p>';
      return;
    }

    contentEl.innerHTML = [
      '<article class="lb-result-article">',
      '<header class="lb-result-article__head">',
      '<p class="lb-result-article__chapter">CHAPTER ' + chapter + '</p>',
      '<h3 class="lb-result-article__title">' + escapeHtml(String(meta.title || CHAPTER_DEFINITIONS[chapter - 1].title || '')) + '</h3>',
      '</header>',
      '<div class="lb-result-article__body">' + bodyHtml + '</div>',
      '</article>'
    ].join('');
  }

  function openResultChapter(chapter) {
    var num = Number(chapter || 1);
    if (!Number.isFinite(num) || num < 1 || num > TOTAL_CHAPTERS) num = 1;
    state.activeChapter = num;
    updateTocActive(num);
    renderResultChapter(num);
  }

  function renderResultScreen() {
    var resultName = qs('nyResultName');
    var resultDate = qs('nyResultDate');
    if (resultName) {
      var owner = String((state.payload && state.payload.name) || '사용자');
      var year = Number((state.payload && state.payload.targetYear) || new Date().getFullYear());
      resultName.textContent = owner + '님의 ' + year + ' 신년운세 전략서';
    }
    if (resultDate) resultDate.textContent = formatDateLabel() + ' 생성 완료';
    showOnly('nyResultScreen');
    openResultChapter(state.activeChapter || 1);
  }

  function setLoadingProgress(chapter, subtitle) {
    var chapterNum = qs('nyLoadingChapterNum');
    var chapterText = qs('nyLoadingChapter');
    var quote = qs('nyMysticQuote');
    var bar = qs('nyProgressBar');
    var progressText = qs('nyProgressText');

    if (chapterNum) chapterNum.textContent = 'Chapter ' + chapter;
    if (chapterText) chapterText.textContent = subtitle || CHAPTER_DEFINITIONS[Math.max(0, chapter - 1)].title || ('Chapter ' + chapter);
    if (quote) quote.textContent = MYSTIC_QUOTES[(chapter - 1) % MYSTIC_QUOTES.length];

    var completed = chapterCount();
    var percent = Math.max(0, Math.min(100, Math.round((completed / TOTAL_CHAPTERS) * 100)));
    if (bar) bar.style.width = percent + '%';
    if (progressText) progressText.textContent = completed + ' / ' + TOTAL_CHAPTERS + ' 챕터 완성';
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
      var targetUrl = resolveApiUrl(url) || String(url || '');
      var res = await fetch(targetUrl, Object.assign({}, options || {}, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      }));
      var data = await res.json().catch(function () { return {}; });
      var issuedToken = extractPremiumAccessTokenFromPayload(data);
      if (issuedToken) persistPremiumAccessToken(issuedToken);
      if (!res.ok && data && typeof data === 'object') data.status = Number(data.status || res.status || 0);
      return data || {};
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  function waitMs(ms) {
    var delay = Number(ms || 0);
    if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve();
    return new Promise(function (resolve) { setTimeout(resolve, delay); });
  }

  async function premiumAuthJson(pathname, body, options) {
    var payload = body && typeof body === 'object' ? Object.assign({}, body) : {};
    if (!payload.premiumAccessToken) {
      var premiumAccessToken = readPremiumAccessToken();
      if (premiumAccessToken) payload.premiumAccessToken = premiumAccessToken;
    }
    if (payload.premiumAccessToken) {
      persistPremiumAccessToken({ premiumAccessToken: payload.premiumAccessToken });
    }
    var targetPath = resolveApiUrl(pathname) || pathname;

    if (typeof window.__cdPremiumAuthJson === 'function') {
      try {
        var helperResult = await window.__cdPremiumAuthJson(targetPath, payload, options || {});
        persistPremiumAccessToken(helperResult);
        return helperResult;
      } catch (error) {
        try {
          console.warn('[SajuNewYear] premium auth helper fallback:', error && error.message || error);
        } catch (_) {}
      }
    }

    var candidates = buildApiCandidates(pathname).map(function (u) { return resolveApiUrl(u) || u; });
    for (var i = 0; i < candidates.length; i += 1) {
      try {
        var data = await requestJson(candidates[i], {
          method: 'POST',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }, payload),
          body: JSON.stringify(payload)
        });
        if (data && typeof data === 'object') return data;
      } catch (_) {
        // try next endpoint
      }
    }

    return { ok: false, code: 'PREMIUM_AUTH_FALLBACK_FAILED', message: '프리미엄 인증 API 호출에 실패했습니다.' };
  }

  async function ensurePremiumSession(paymentContext) {
    if (state.reportSessionId) {
      return { ok: true, reportSessionId: state.reportSessionId };
    }

    if (!state.payload) state.payload = buildPayload();

    var makePrepareBody = function (attemptLabel) {
      var normalizedPayment = normalizePaymentContext(paymentContext || state.paymentContext || {});
      if (!normalizedPayment.requestId) {
        normalizedPayment.requestId = String(('newyear:' + (state.reportId || Date.now())).slice(0, 120));
      }
      return {
        featureType: SAJU_NEW_YEAR_FEATURE_TYPE,
        reportType: SAJU_NEW_YEAR_REPORT_TYPE,
        requestBody: Object.assign({}, state.payload || {}, {
          reportType: SAJU_NEW_YEAR_REPORT_TYPE,
          featureType: SAJU_NEW_YEAR_FEATURE_TYPE,
          payment: normalizedPayment,
          _paymentContext: normalizedPayment,
          transactionId: normalizedPayment.transactionId || undefined,
          sourceTransactionId: normalizedPayment.sourceTransactionId || undefined,
          receiptId: normalizedPayment.receiptId || undefined,
          orderId: normalizedPayment.orderId || undefined
        }),
        payment: normalizedPayment,
        requestId: 'newyear:prepare:' + String(attemptLabel || Date.now().toString(36))
      };
    };

    logSajuNewYear('PAYMENT_CHECK_START', {
      reportId: String(state.reportId || ''),
      hasPaymentContext: Boolean(paymentContext),
      hasPremiumAccessToken: Boolean(readPremiumAccessToken())
    });

    var prepared = await premiumAuthJson('/api/premium-report/prepare', makePrepareBody(Date.now().toString(36)), {
      maxAttempts: 3
    });

    if (!prepared || !prepared.ok || !prepared.reportSessionId) {
      var initialCode = String((prepared && prepared.code) || '').toUpperCase();
      var hasRecentPayment = !!(paymentContext && Number(paymentContext.cost) > 0);
      if (initialCode === 'PAYMENT_REQUIRED' && hasRecentPayment) {
        logSajuNewYear('PAYMENT_RECOVERY_LOOKUP_START', {
          reportId: String(state.reportId || ''),
          initialCode: initialCode
        });
        var retryDelays = [450, 900, 1500, 2300, 3200, 4200];
        for (var i = 0; i < retryDelays.length; i += 1) {
          await waitMs(retryDelays[i]);
          prepared = await premiumAuthJson(
            '/api/premium-report/prepare',
            makePrepareBody(Date.now().toString(36) + ':' + (i + 1)),
            { maxAttempts: 2 }
          );
          if (prepared && prepared.ok && prepared.reportSessionId) {
            logSajuNewYear('PAYMENT_RECOVERY_LOOKUP_SUCCESS', {
              attempt: i + 1,
              reportSessionId: String(prepared.reportSessionId || '')
            });
            break;
          }

          var retryCode = String((prepared && prepared.code) || '').toUpperCase();
          if (retryCode && retryCode !== 'PAYMENT_REQUIRED') break;
        }
        if (!prepared || !prepared.ok || !prepared.reportSessionId) {
          logSajuNewYear('PAYMENT_RECOVERY_LOOKUP_FAILED', {
            code: String((prepared && prepared.code) || 'PAYMENT_REQUIRED')
          });
        }
      }
    }

    if (!prepared || !prepared.ok || !prepared.reportSessionId) {
      logSajuNewYear('PAYMENT_CHECK_FAILED', {
        code: String((prepared && prepared.code) || 'PAYMENT_REQUIRED'),
        message: String((prepared && prepared.message) || '')
      });
      return prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' };
    }

    logSajuNewYear('PAYMENT_CHECK_SUCCESS', {
      reportSessionId: String(prepared.reportSessionId || ''),
      reportId: String(prepared.reportId || state.reportId || '')
    });

    state.reportSessionId = String(prepared.reportSessionId || '');
    if (prepared.reportId) state.reportId = String(prepared.reportId || state.reportId);

    var preparedTotal = Number(prepared.totalChapters || 0);
    if (preparedTotal > 0 && preparedTotal !== TOTAL_CHAPTERS) {
      notify('서버 챕터 구성(' + preparedTotal + '장)과 화면 구성이 다릅니다. 최신 화면으로 새로고침해 주세요.');
    }

    if (Array.isArray(prepared.chapterPlan) && prepared.chapterPlan.length) {
      for (var i = 0; i < prepared.chapterPlan.length && i < TOTAL_CHAPTERS; i += 1) {
        var row = prepared.chapterPlan[i] || {};
        state.chapterMeta[i + 1] = {
          title: String(row.title || CHAPTER_DEFINITIONS[i].title),
          subtitle: String(row.subtitle || CHAPTER_DEFINITIONS[i].subtitle)
        };
      }
    }

    var preflight = await premiumAuthJson('/api/premium-report/preflight', {
      reportSessionId: state.reportSessionId,
      reportType: SAJU_NEW_YEAR_REPORT_TYPE,
      featureType: SAJU_NEW_YEAR_FEATURE_TYPE,
      requestBody: state.payload,
      requestId: 'newyear:preflight:' + Date.now().toString(36)
    }, {
      maxAttempts: 2
    });

    if (!preflight || !preflight.ok) {
      var preflightCode = String((preflight && preflight.code) || '').toUpperCase();
      if (preflightCode === 'REPORT_SESSION_NOT_FOUND') {
        state.reportSessionId = '';
        persistState();
        prepared = await premiumAuthJson('/api/premium-report/prepare', makePrepareBody(Date.now().toString(36) + ':recover'), {
          maxAttempts: 2
        });
        if (!prepared || !prepared.ok || !prepared.reportSessionId) {
          return prepared || { ok: false, message: '프리미엄 세션 복구에 실패했습니다.' };
        }
        state.reportSessionId = String(prepared.reportSessionId || '');
        if (prepared.reportId) state.reportId = String(prepared.reportId || state.reportId);
      } else {
        return preflight || { ok: false, message: '프리플라이트 검증에 실패했습니다.' };
      }
    }

    persistState();
    return prepared;
  }

  async function attemptSajuNewYearAutoRefund(reason) {
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
          featureKey: String(ctx.featureKey || COIN_FEATURE_KEY),
          sourceTransactionId: String(ctx.sourceTransactionId || ''),
          requestId: String(('refund:' + (ctx.requestId || state.reportId || Date.now())).slice(0, 120)),
          reason: String(reason || '신년운세 PDF 생성 실패 자동 환불')
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

      console.warn('[SajuNewYear] auto refund failed:', payload);
      return false;
    } catch (error) {
      console.warn('[SajuNewYear] auto refund exception:', error);
      return false;
    } finally {
      state.refundInFlight = false;
    }
  }

  async function generateAllChapters(paymentContext) {
    logSajuNewYear('API_GENERATION_START', {
      reportId: String(state.reportId || ''),
      hasPaymentContext: Boolean(paymentContext || state.paymentContext)
    });
    showOnly('nyLoadingScreen');
    activateNewYearCinematicLoading();
    setLoadingProgress(1, CHAPTER_DEFINITIONS[0].title);

    var prepared = await ensurePremiumSession(paymentContext);
    if (!prepared || !prepared.ok || !state.reportSessionId) {
      var code = String((prepared && prepared.code) || '').toUpperCase();
      if (code === 'PAYMENT_REQUIRED') {
        throw new Error('결제가 확인되지 않았습니다. 코인 결제 후 다시 시도해 주세요.');
      }
      if (code === 'UNAUTHORIZED' || code === 'AUTH_REQUIRED') {
        throw new Error('로그인이 필요합니다. 다시 로그인 후 시도해 주세요.');
      }
      throw new Error(String((prepared && prepared.message) || '프리미엄 세션 준비에 실패했습니다.'));
    }
    state.paymentVerified = true;

    for (var chapter = 1; chapter <= TOTAL_CHAPTERS; chapter += 1) {
      if (state.chapterTexts[chapter]) {
        setLoadingProgress(chapter + 1 > TOTAL_CHAPTERS ? TOTAL_CHAPTERS : chapter + 1, CHAPTER_DEFINITIONS[Math.min(TOTAL_CHAPTERS - 1, chapter)].title);
        continue;
      }

      setLoadingProgress(chapter, CHAPTER_DEFINITIONS[chapter - 1].title);

      var response = await premiumAuthJson('/api/premium-report/chapter', {
        reportSessionId: state.reportSessionId,
        chapterId: chapter,
        reportType: SAJU_NEW_YEAR_REPORT_TYPE,
        featureType: SAJU_NEW_YEAR_FEATURE_TYPE,
        requestBody: Object.assign({}, state.payload || {}, {
          _premiumStrictPayload: true,
          _premiumStrictValidation: true
        }),
        requestId: 'newyear:chapter:' + chapter + ':' + Date.now().toString(36)
      }, {
        maxAttempts: 2
      });

      if (!response || !response.ok) {
        var status = Number((response && response.status) || 0);
        var code = String((response && response.code) || '').toUpperCase();
        if (status === 401 || code === 'AUTH_REQUIRED' || code === 'UNAUTHORIZED') {
          throw new Error('로그인이 만료되었습니다. 다시 로그인 후 시도해 주세요.');
        }
        if (status === 402 || code === 'PAYMENT_REQUIRED') {
          throw new Error('결제 확인이 필요합니다. 코인 차감 상태를 확인해 주세요.');
        }
        throw new Error(String((response && response.message) || ('챕터 ' + chapter + ' 생성에 실패했습니다.')));
      }

      var responseSource = String(response.source || '').toLowerCase();
      if (responseSource === 'local' || responseSource === 'local-engine' || response.usedFallback === true) {
        logSajuNewYear('API_PARTIAL_RESULT_COMPLETED_BY_LOCAL', {
          chapter: chapter,
          source: String(response.source || 'local-engine')
        });
      }

      state.chapterTexts[chapter] = String(response.text || '').trim();
      state.chapterStructured[chapter] = response.chapterJson && typeof response.chapterJson === 'object' ? response.chapterJson : null;
      if (!state.chapterTexts[chapter]) {
        state.chapterTexts[chapter] = deriveTextFromChapterJson(state.chapterStructured[chapter]);
      }
      state.chapterMeta[chapter] = response.chapterMeta || {
        title: CHAPTER_DEFINITIONS[chapter - 1].title,
        subtitle: CHAPTER_DEFINITIONS[chapter - 1].subtitle
      };

      if (response.reportSessionId) state.reportSessionId = String(response.reportSessionId);
      if (response.reportId) state.reportId = String(response.reportId);

      persistState();
      setLoadingProgress(chapter + 1 > TOTAL_CHAPTERS ? TOTAL_CHAPTERS : chapter + 1, CHAPTER_DEFINITIONS[Math.min(TOTAL_CHAPTERS - 1, chapter)].title);
    }

    var pdfReady = await premiumAuthJson('/api/premium-report/pdf', {
      reportSessionId: state.reportSessionId,
      requestId: 'newyear:pdf:' + Date.now().toString(36)
    });

    if (!pdfReady || !pdfReady.ok) {
      logSajuNewYear('PDF_RENDER_FAILED', {
        code: String((pdfReady && pdfReady.code) || ''),
        message: String((pdfReady && pdfReady.message) || '')
      });
      throw new Error(String((pdfReady && pdfReady.message) || 'PDF 마무리 검증에 실패했습니다.'));
    }

    logSajuNewYear('API_GENERATION_SUCCESS', {
      reportId: String(state.reportId || ''),
      reportSessionId: String(state.reportSessionId || '')
    });
    logSajuNewYear('PDF_RENDER_SUCCESS', {
      reportId: String(state.reportId || ''),
      reportSessionId: String(state.reportSessionId || '')
    });
  }

  async function startNewYearGeneration(paymentContext) {
    if (state.generating) return;

    logSajuNewYear('REQUEST_START');
    logSajuNewYear('INPUT_NORMALIZE_START');

    state.payload = buildPayload();
    logSajuNewYear('INPUT_NORMALIZE_SUCCESS');
    logSajuNewYear('LOCAL_CALCULATION_START');
    logSajuNewYear('LOCAL_CALCULATION_SUCCESS');
    logSajuNewYear('PAYLOAD_NORMALIZE_START');
    logSajuNewYear('PAYLOAD_NORMALIZE_SUCCESS');
    if (!state.payload.year || !state.payload.month || !state.payload.day) {
      notify('사주 정보가 충분하지 않습니다. 먼저 사주 분석을 실행한 뒤 다시 시도해 주세요.');
      return;
    }

    if (!state.reportId) state.reportId = createReportId(state.payload);

    state.generating = true;
    state.paymentVerified = false;
    setGenerateButtonBusy(true);
    persistState();

    try {
      await generateAllChapters(paymentContext || state.paymentContext || null);
      state.paymentContext = null;
      state.paymentVerified = false;
      renderResultScreen();
      notify('프리미엄 리포트가 완성되었습니다.');
    } catch (err) {
      console.error('[SajuNewYear] generation failed:', err);
      var errMsg = String((err && err.message) || '');
      var shouldRefund = Boolean(state.paymentVerified) && /LOCAL_REPORT_FAILED|로컬\s*리포트\s*실패/i.test(errMsg);
      if (shouldRefund) {
        logSajuNewYear('REFUND_START', { reason: errMsg || 'LOCAL_REPORT_FAILED' });
        var refunded = await attemptSajuNewYearAutoRefund(errMsg || 'LOCAL_REPORT_FAILED');
        if (refunded) logSajuNewYear('REFUND_SUCCESS');
      }
      setErrorScreen(toSafeUserError(err));
    } finally {
      state.generating = false;
      state.paymentVerified = false;
      setGenerateButtonBusy(false);
      persistState();
    }
  }

  async function ensureCoinGateAndGenerate() {
    if (!state.payload) state.payload = buildPayload();
    if (!state.reportId) state.reportId = createReportId(state.payload);

    if (chapterCount() > 0 || state.paidReportId === state.reportId) {
      startNewYearGeneration();
      return;
    }

    if (typeof window._cdCoinGatePerUse === 'function') {
      window._cdCoinGatePerUse(
        COST_COINS,
        COIN_REASON,
        function (transactionId, transactionPayload) {
          var payloadObject = (transactionPayload && typeof transactionPayload === 'object') ? transactionPayload : {};
          var paymentContext = normalizePaymentContext(Object.assign({}, payloadObject, {
            transactionId: String(transactionId || payloadObject.transactionId || payloadObject.id || ''),
            featureKey: COIN_FEATURE_KEY,
            reportType: SAJU_NEW_YEAR_REPORT_TYPE,
            featureType: SAJU_NEW_YEAR_FEATURE_TYPE,
            cost: Number(COST_COINS || 0),
            requestId: String(
              payloadObject.requestId
              || (payloadObject.consume && payloadObject.consume.requestId)
              || ('newyear:' + (state.reportId || Date.now()))
            ).slice(0, 120)
          }));
          persistPremiumAccessToken(payloadObject);
          if (paymentContext && paymentContext.premiumAccessToken) {
            persistPremiumAccessToken({ premiumAccessToken: paymentContext.premiumAccessToken });
          }
          logSajuNewYear('PAYMENT_CHECK_SUCCESS', {
            transactionId: String(paymentContext.transactionId || ''),
            receiptId: String(paymentContext.receiptId || ''),
            orderId: String(paymentContext.orderId || ''),
            hasPremiumAccessToken: Boolean(paymentContext.premiumAccessToken)
          });
          state.paymentContext = paymentContext;
          state.paidReportId = state.reportId;
          persistState();
          startNewYearGeneration(paymentContext);
        },
        function () {
          setGenerateButtonBusy(false);
          if (!state.generating) showOnly('nyStartScreen');
        },
        { featureKey: COIN_FEATURE_KEY }
      );
      return;
    }

    setGenerateButtonBusy(false);
    if (!state.generating) showOnly('nyStartScreen');
    notify('결제 모듈 로딩이 지연되어 생성 시작을 차단했습니다. 잠시 후 다시 시도해 주세요.');
  }

  function buildLocalPrintableHtml() {
    var ownerName = String((state.payload && state.payload.name) || '사용자');
    var targetYear = Number((state.payload && state.payload.targetYear) || new Date().getFullYear());
    var chapterBlocks = [];

    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      var text = String(state.chapterTexts[i] || '').trim();
      var structured = state.chapterStructured[i] || null;
      var structuredBody = renderStructuredChapterBody(i, structured);
      var chapterBody = structuredBody || (text ? markdownToHtml(text) : '');
      if (!chapterBody) continue;
      var meta = state.chapterMeta[i] || CHAPTER_DEFINITIONS[i - 1] || {};
      chapterBlocks.push(
        '<section class="lb-print-chapter">'
          + '<h1>' + escapeHtml(String(meta.title || ('Chapter ' + i))) + '</h1>'
          + chapterBody
        + '</section>'
      );
    }

    return [
      '<!doctype html>',
      '<html lang="ko">',
      '<head>',
      '<meta charset="utf-8" />',
      '<title>' + escapeHtml(ownerName + '님의 ' + targetYear + ' 신년운세') + '</title>',
      '<style>',
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;600;700&display=swap");',
      'body{margin:0;padding:26px;font-family:"Noto Serif KR","Noto Sans KR",serif;background:#f7f4ee;color:#1f2937;line-height:1.86;word-break:keep-all}',
      '.lb-print-cover{padding:28px;border:1px solid #d5c9b3;border-radius:18px;background:#fffaf0;margin-bottom:26px}',
      '.lb-print-cover-visual{margin:0 0 16px;border-radius:12px;overflow:hidden;border:1px solid #e6dcc8;background:#f3ead8}',
      '.lb-print-cover-visual img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}',
      '.lb-print-cover h1{margin:0 0 8px;font-size:34px;line-height:1.35;color:#4b3621}',
      '.lb-print-chapter{margin-bottom:24px;padding:22px;border:1px solid #e8ddcc;border-radius:14px;background:#fff}',
      '.lb-print-chapter h1{margin:0 0 12px;font-size:25px;line-height:1.4;color:#5b4630}',
      '.lb-print-chapter h2{margin:18px 0 10px;font-size:20px;line-height:1.45;color:#6b4f35}',
      '.lb-print-chapter h3{margin:14px 0 8px;font-size:17px;line-height:1.5;color:#7b5d3f}',
      '.lb-print-chapter p{margin:0 0 12px;font-size:15px;line-height:1.9}',
      '.lb-print-chapter ul{margin:0 0 10px 18px;padding:0}',
      '.lb-table{width:100%;border-collapse:collapse;margin:10px 0}',
      '.lb-table td{border:1px solid #dacbb1;padding:6px 8px;font-size:13px}',
      '@page{size:A4;margin:14mm}',
      '@media print{body{padding:0;background:#fff}.lb-print-cover,.lb-print-chapter{border:none;border-radius:0;box-shadow:none}}',
      '</style>',
      '</head>',
      '<body>',
      '<section class="lb-print-cover">',
      '<div class="lb-print-cover-visual"><img src="' + escapeHtml(NEW_YEAR_COVER_IMAGE) + '" alt="사주 신년운세 표지 이미지" /></div>',
      '<h1>' + escapeHtml(ownerName + '님의 ' + targetYear + ' 신년운세') + '</h1>',
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

  async function downloadSajuNewYear() {
    var html = buildLocalPrintableHtml();
    if (!openPrintWindow(html)) {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'saju-new-year-' + (state.reportId || Date.now()) + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
      notify('HTML 파일로 다운로드되었습니다. 브라우저에서 열어 인쇄 > PDF 저장을 선택해 주세요.');
    }
  }

  function syncStartInputs() {
    var yearInput = qs('nyTargetYear');
    var now = new Date().getFullYear();
    if (yearInput && !yearInput.value) yearInput.value = String(now);
  }

  window.openSajuNewYearModal = function () {
    var modal = qs('sajuNewYearModal');
    if (!modal) return;
    syncStartInputs();
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');

    if (state.generating) {
      showOnly('nyLoadingScreen');
      activateNewYearCinematicLoading();
      return;
    }

    if (chapterCount() >= TOTAL_CHAPTERS) {
      renderResultScreen();
      return;
    }

    showOnly('nyStartScreen');
  };

  window.closeSajuNewYearModal = function () {
    var modal = qs('sajuNewYearModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
  };

  window.generateSajuNewYear = function () {
    if (state.generating) {
      notify('이미 리포트를 생성 중입니다.');
      return;
    }
    setGenerateButtonBusy(true);
    showOnly('nyLoadingScreen');
    activateNewYearCinematicLoading();
    setLoadingProgress(1, CHAPTER_DEFINITIONS[0].title);

    ensureCoinGateAndGenerate().catch(function (err) {
      console.error('[SajuNewYear] gate check failed:', err);
      setGenerateButtonBusy(false);
      setErrorScreen('신년운세 생성 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    });
  };

  window.downloadSajuNewYearPdf = function () {
    downloadSajuNewYear().catch(function (err) {
      console.error('[SajuNewYear] download failed:', err);
      notify('다운로드 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    });
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'openSajuNewYearModal') {
        event.preventDefault();
        window.openSajuNewYearModal();
        return;
      }
      if (action === 'closeSajuNewYearModal') {
        event.preventDefault();
        window.closeSajuNewYearModal();
        return;
      }
    }

    var tocItem = target.closest('.ny-toc-item[data-ny-chapter]');
    if (tocItem) {
      var chapter = Number(tocItem.getAttribute('data-ny-chapter') || 1);
      openResultChapter(chapter);
    }
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var modal = qs('sajuNewYearModal');
    if (modal && modal.style.display !== 'none') {
      window.closeSajuNewYearModal();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadPersistedState();
      syncStartInputs();
    });
  } else {
    loadPersistedState();
    syncStartInputs();
  }
})();
