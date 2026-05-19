(function () {
  'use strict';

  var TOTAL_CHAPTERS = 10;
  var COST_COINS = 300;
  var COIN_REASON = '사주 신년운세 PDF 리포트 생성';
  var API_TIMEOUT_MS = 140000;
  var STATE_STORAGE_KEY = '__cd_saju_new_year_state_v1__';
  var NEW_YEAR_COVER_IMAGE = '/fuctionassets/신년운세.webp?v=20260519-ny-cover';

  var CHAPTER_DEFINITIONS = [
    { index: 1, title: '원국 기반 연간 전략 총론', subtitle: '기본 체질과 연간 선택 축' },
    { index: 2, title: '연간 파동과 기회 창', subtitle: '상반기·하반기 리듬' },
    { index: 3, title: '커리어·사업 확장 전략', subtitle: '기회 포착과 실행 타이밍' },
    { index: 4, title: '재물·현금흐름 관리', subtitle: '수익/지출 밸런스' },
    { index: 5, title: '관계·인맥·파트너십', subtitle: '협업과 경계선 관리' },
    { index: 6, title: '건강·에너지 밸런스', subtitle: '회복력과 집중력 설계' },
    { index: 7, title: '학습·성장·전환 기회', subtitle: '능력 확장 로드맵' },
    { index: 8, title: '리스크 관리와 손실 방어', subtitle: '실수 예방·회복 플랜' },
    { index: 9, title: '12개월 월별 실행 로드맵', subtitle: '월별 Go/Stop 힌트' },
    { index: 10, title: '최종 통합 액션 플랜', subtitle: '90일 우선 실행 계획' }
  ];

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

  function getAuthToken() {
    try { return String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { return ''; }
  }

  function buildAuthHeaders(base) {
    var headers = Object.assign({}, base || {});
    var token = getAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
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

  function normalizeBirthParts() {
    var profile = null;
    var snapshot = null;
    var authUser = null;

    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }
    try { snapshot = window.__destinyFlowerSajuSnapshot || null; } catch (_) { snapshot = null; }
    try { authUser = safeParse(localStorage.getItem('fortune_auth_user') || 'null', null) || null; } catch (_) { authUser = null; }

    var fromProfile = profile && profile.birth ? profile.birth : null;
    var fromSnapshot = snapshot && snapshot.birth ? snapshot.birth : null;

    var birthDate = String((authUser && authUser.birthDate) || '').trim();
    var birthTime = String((authUser && authUser.birthTime) || '').trim();
    var dateMatch = birthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    var timeMatch = birthTime.match(/^(\d{1,2}):(\d{1,2})$/);

    var year = Number((fromProfile && fromProfile.year) || (fromSnapshot && fromSnapshot.year) || (dateMatch && dateMatch[1]) || 0);
    var month = Number((fromProfile && fromProfile.month) || (fromSnapshot && fromSnapshot.month) || (dateMatch && dateMatch[2]) || 0);
    var day = Number((fromProfile && fromProfile.day) || (fromSnapshot && fromSnapshot.day) || (dateMatch && dateMatch[3]) || 0);
    var hour = Number((fromProfile && fromProfile.hour) || (fromSnapshot && fromSnapshot.hour) || (timeMatch && timeMatch[1]) || 12);
    var minute = Number((fromProfile && fromProfile.minute) || (fromSnapshot && fromSnapshot.minute) || (timeMatch && timeMatch[2]) || 0);

    if (!Number.isFinite(year) || year < 1900 || year > 2100) year = 0;
    if (!Number.isFinite(month) || month < 1 || month > 12) month = 0;
    if (!Number.isFinite(day) || day < 1 || day > 31) day = 0;
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) hour = 12;
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) minute = 0;

    return {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      valid: year > 0 && month > 0 && day > 0
    };
  }

  function buildEngineData() {
    var snapshot = null;
    try { snapshot = window.__destinyFlowerSajuSnapshot || null; } catch (_) { snapshot = null; }
    if (!snapshot) return null;
    return {
      dayMaster: snapshot.dayMaster || snapshot.saju?.dayMaster || '',
      pillars: snapshot.pillars || snapshot.saju?.pillars || {}
    };
  }

  function buildPayload() {
    var birth = normalizeBirthParts();
    var profile = null;
    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }

    var targetYearInput = Number(qs('nyTargetYear') && qs('nyTargetYear').value || 0);
    var thisYear = new Date().getFullYear();
    if (!Number.isFinite(targetYearInput) || targetYearInput < thisYear - 1 || targetYearInput > thisYear + 3) {
      targetYearInput = thisYear;
    }

    var focusArea = String(qs('nyFocusArea') && qs('nyFocusArea').value || 'overall').trim();
    if (!focusArea) focusArea = 'overall';

    return {
      name: String((profile && profile.name) || '사용자'),
      gender: String((profile && profile.gender) || 'unknown'),
      year: Number(birth.year || 0),
      month: Number(birth.month || 0),
      day: Number(birth.day || 0),
      hour: Number(birth.hour || 12),
      minute: Number(birth.minute || 0),
      targetYear: targetYearInput,
      focusArea: focusArea,
      engineData: buildEngineData(),
      sajuData: safeParse((function () {
        try {
          return localStorage.getItem('fortune_result_raw_json') || '';
        } catch (_) {
          return '';
        }
      })(), null)
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
      payload.focusArea,
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
        payload: state.payload || null,
        chapterTexts: state.chapterTexts || {},
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
      state.payload = saved.payload || null;
      state.chapterTexts = saved.chapterTexts && typeof saved.chapterTexts === 'object' ? saved.chapterTexts : {};
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
    var meta = state.chapterMeta[chapter] || {};
    if (!text) {
      contentEl.innerHTML = '<p>아직 생성되지 않은 챕터입니다.</p>';
      return;
    }

    contentEl.innerHTML = [
      '<article class="lb-result-article">',
      '<header class="lb-result-article__head">',
      '<p class="lb-result-article__chapter">CHAPTER ' + chapter + '</p>',
      '<h3 class="lb-result-article__title">' + escapeHtml(String(meta.title || CHAPTER_DEFINITIONS[chapter - 1].title || '')) + '</h3>',
      '</header>',
      '<div class="lb-result-article__body">' + markdownToHtml(text) + '</div>',
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
      var res = await fetch(url, Object.assign({}, options || {}, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      }));
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok && data && typeof data === 'object') data.status = Number(data.status || res.status || 0);
      return data || {};
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  async function premiumAuthJson(pathname, body, options) {
    if (typeof window.__cdPremiumAuthJson === 'function') {
      return window.__cdPremiumAuthJson(pathname, body || {}, options || {});
    }
    return requestJson(pathname, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {})
    });
  }

  async function ensurePremiumSession() {
    if (state.reportSessionId) {
      return { ok: true, reportSessionId: state.reportSessionId };
    }

    if (!state.payload) state.payload = buildPayload();

    var prepared = await premiumAuthJson('/api/premium-report/prepare', {
      featureType: 'saju_new_year_pdf',
      reportType: 'sajuNewYear',
      requestBody: state.payload
    });

    if (!prepared || !prepared.ok || !prepared.reportSessionId) {
      return prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' };
    }

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

    persistState();
    return prepared;
  }

  async function generateAllChapters() {
    showOnly('nyLoadingScreen');
    setLoadingProgress(1, CHAPTER_DEFINITIONS[0].title);

    var prepared = await ensurePremiumSession();
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

    for (var chapter = 1; chapter <= TOTAL_CHAPTERS; chapter += 1) {
      if (state.chapterTexts[chapter]) {
        setLoadingProgress(chapter + 1 > TOTAL_CHAPTERS ? TOTAL_CHAPTERS : chapter + 1, CHAPTER_DEFINITIONS[Math.min(TOTAL_CHAPTERS - 1, chapter)].title);
        continue;
      }

      setLoadingProgress(chapter, CHAPTER_DEFINITIONS[chapter - 1].title);

      var response = await premiumAuthJson('/api/premium-report/chapter', {
        reportSessionId: state.reportSessionId,
        chapterId: chapter,
        reportType: 'sajuNewYear',
        featureType: 'saju_new_year_pdf',
        requestBody: state.payload,
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

      state.chapterTexts[chapter] = String(response.text || '').trim();
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
      throw new Error(String((pdfReady && pdfReady.message) || 'PDF 마무리 검증에 실패했습니다.'));
    }
  }

  async function startNewYearGeneration() {
    if (state.generating) return;

    state.payload = buildPayload();
    if (!state.payload.year || !state.payload.month || !state.payload.day) {
      notify('사주 정보가 충분하지 않습니다. 먼저 사주 분석을 실행한 뒤 다시 시도해 주세요.');
      return;
    }

    if (!state.reportId) state.reportId = createReportId(state.payload);

    state.generating = true;
    setGenerateButtonBusy(true);
    persistState();

    try {
      await generateAllChapters();
      renderResultScreen();
      notify('신년운세 PDF 10챕터 생성이 완료되었습니다.');
    } catch (err) {
      console.error('[SajuNewYear] generation failed:', err);
      setErrorScreen(String((err && err.message) || '신년운세 생성 중 오류가 발생했습니다.'));
    } finally {
      state.generating = false;
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
        function () {
          state.paidReportId = state.reportId;
          persistState();
          startNewYearGeneration();
        },
        function () {}
      );
      return;
    }

    startNewYearGeneration();
  }

  function buildLocalPrintableHtml() {
    var ownerName = String((state.payload && state.payload.name) || '사용자');
    var targetYear = Number((state.payload && state.payload.targetYear) || new Date().getFullYear());
    var chapterBlocks = [];

    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      var text = String(state.chapterTexts[i] || '').trim();
      if (!text) continue;
      var meta = state.chapterMeta[i] || CHAPTER_DEFINITIONS[i - 1] || {};
      chapterBlocks.push(
        '<section class="lb-print-chapter">'
          + '<h1>' + escapeHtml(String(meta.title || ('Chapter ' + i))) + '</h1>'
          + markdownToHtml(text)
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
      'body{margin:0;padding:24px;font-family:Georgia,"Times New Roman",serif;background:#f7f4ee;color:#1f2937;line-height:1.72}',
      '.lb-print-cover{padding:24px;border:1px solid #d5c9b3;border-radius:16px;background:#fffaf0;margin-bottom:24px}',
      '.lb-print-cover-visual{margin:0 0 16px;border-radius:12px;overflow:hidden;border:1px solid #e6dcc8;background:#f3ead8}',
      '.lb-print-cover-visual img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}',
      '.lb-print-cover h1{margin:0 0 6px;font-size:33px;color:#4b3621}',
      '.lb-print-chapter{margin-bottom:22px;padding:18px;border:1px solid #e8ddcc;border-radius:12px;background:#fff}',
      '.lb-print-chapter h1{margin:0 0 12px;font-size:24px;color:#5b4630}',
      '.lb-print-chapter h2{margin:16px 0 8px;font-size:19px;color:#6b4f35}',
      '.lb-print-chapter h3{margin:12px 0 8px;font-size:16px;color:#7b5d3f}',
      '.lb-print-chapter p{margin:0 0 10px}',
      '.lb-print-chapter ul{margin:0 0 10px 18px;padding:0}',
      '.lb-table{width:100%;border-collapse:collapse;margin:10px 0}',
      '.lb-table td{border:1px solid #dacbb1;padding:6px 8px;font-size:13px}',
      '@media print{body{padding:0;background:#fff}.lb-print-cover,.lb-print-chapter{border:none}}',
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
    var focusInput = qs('nyFocusArea');
    var now = new Date().getFullYear();
    if (yearInput && !yearInput.value) yearInput.value = String(now);
    if (focusInput && !focusInput.value) focusInput.value = 'overall';
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
    ensureCoinGateAndGenerate().catch(function (err) {
      console.error('[SajuNewYear] gate check failed:', err);
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
