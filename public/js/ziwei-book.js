/**
 * 자미두수 인생 총람 (Ziwei Doushu Life Book) — 프리미엄 자미두수 심층 분석 + PDF 다운로드
 * CODE-DESTINY v1.0  •  자미두수(紫微斗數) 기반 인생 총람 생성기
 */
(function () {
  'use strict';

  if (window.__cdZiweiBookInitialized) {
    return;
  }
  window.__cdZiweiBookInitialized = true;

  var MIN_CHAPTER_CHARS = 350;

  /* ─────────────── 챕터 상수 ─────────────── */
  var CHAPTER_TITLES = [
    'Ch.1 명궁 완전 해독 — 타고난 인생 설계도',
    'Ch.2 신궁 심층 분석 — 후천적으로 완성되는 나',
    'Ch.3 형제궁과 인간관계의 거리감 — 가까운 사람과의 심리 구조',
    'Ch.4 부부궁 연애와 결혼 — 끌리는 사람과 관계의 숙제',
    'Ch.5 자녀궁과 창조성 — 표현력, 결과물, 후대운',
    'Ch.6 재백궁 재물 흐름 — 돈을 버는 방식과 지키는 방식',
    'Ch.7 질액궁 건강과 에너지 — 몸과 마음의 취약점',
    'Ch.8 천이궁 외부 세계 — 이동, 확장, 귀인, 환경운',
    'Ch.9 노복궁 협력자와 사회적 네트워크 — 사람을 얻는 방식',
    'Ch.10 관록궁 커리어 해석 — 일, 명예, 사회적 성취',
    'Ch.11 전택궁과 복덕궁 — 기반, 안정, 마음의 만족',
    'Ch.12 사화와 종합 인생 전략 — 기회, 압박, 최종 로드맵'
  ];

  var CHAPTER_SUBTITLES = [
    '명궁의 핵심 기질, 강점과 약점, 인생 초반부 과제',
    '신궁의 방향성, 명궁과의 관계, 자기완성 전략',
    '가까운 사람과의 거리감, 경쟁심, 관계 패턴과 조언',
    '연애 패턴, 끌리는 상대, 관계 안정 조건, 사랑 지속 전략',
    '표현 욕구, 창작물/결과물, 돌봄, 후대운 구조',
    '재물운 기본 구조, 수입 패턴, 누수점, 투자 적성, 재물 관리 전략',
    '에너지 패턴, 과로 신호, 감정-신체 연결, 생활 습관, 회복 루틴',
    '외부 환경에서의 운, 이동/이사/확장 기회, 귀인 구조, 환경 적응',
    '협력자 유형, 도움받는 방식, 팀워크 강점, 관계 위험, 인연 선별 기준',
    '직업 성향, 성과 창출 방식, 조직형/독립형 적성, 인정 조건, 커리어 전략',
    '삶의 기반, 주거·자산 운, 내면의 평온, 행복 조건, 지속 만족 습관',
    '사화(화록·화권·화과·화기)의 작동, 최강 궁과 최약 궁, 최종 실행 로드맵'
  ];

  var LOADING_MSGS = [
    'Ch.1 명궁 핵심 기질을 해석하는 중...',
    'Ch.2 신궁 방향성을 분석하는 중...',
    'Ch.3 형제궁 관계 구조를 분석하는 중...',
    'Ch.4 부부궁 관계 패턴을 해석하는 중...',
    'Ch.5 자녀궁 창조성을 분석하는 중...',
    'Ch.6 재백궁 재물 흐름을 분석하는 중...',
    'Ch.7 질액궁 건강 패턴을 해석하는 중...',
    'Ch.8 천이궁 외부운을 분석하는 중...',
    'Ch.9 노복궁 네트워크를 분석하는 중...',
    'Ch.10 관록궁 커리어를 해석하는 중...',
    'Ch.11 전택궁·복덕궁 기반을 분석하는 중...',
    'Ch.12 사화 종합 전략을 정리하는 중...'
  ];

  var TOTAL_CHAPTERS = Math.min(12, CHAPTER_TITLES.length);

  var CHAPTER_STRUCTURED_LABELS = {
    1: ['1-1. 명궁의 핵심 기질', '1-2. 명궁 주성과 보조성이 만드는 성격의 골격', '1-3. 강점이 드러나는 방식', '1-4. 약점과 반복되는 인생 패턴', '1-5. 인생 초반부부터 반복되는 핵심 과제', '1-6. 명궁 기준 실전 조언'],
    2: ['2-1. 신궁이 의미하는 후천적 방향성', '2-2. 시간이 지날수록 강해지는 성향', '2-3. 명궁과 신궁의 충돌 또는 조화', '2-4. 인생 후반부의 변화 포인트', '2-5. 자기완성 전략'],
    3: ['3-1. 형제궁으로 보는 관계의 기본 거리', '3-2. 가까운 사람에게 기대하는 것', '3-3. 경쟁심과 비교심이 생기는 지점', '3-4. 형제·동료·친구 관계의 반복 패턴', '3-5. 관계 피로를 줄이는 실전 조언'],
    4: ['4-1. 연애에서 반복되는 패턴', '4-2. 끌리는 상대의 특징', '4-3. 관계에서 상처받는 지점', '4-4. 결혼 또는 장기 관계의 안정 조건', '4-5. 사랑을 오래 지키는 전략'],
    5: ['5-1. 자녀궁이 보여주는 표현 욕구', '5-2. 창작물과 결과물이 나오는 방식', '5-3. 돌봄과 책임을 대하는 태도', '5-4. 후배·제자·자녀와의 인연 구조', '5-5. 나의 결과물을 키우는 전략'],
    6: ['6-1. 재물운의 기본 구조', '6-2. 돈이 들어오는 패턴', '6-3. 돈이 새어나가는 약점', '6-4. 투자/사업/직장 수입의 적합성', '6-5. 재물 관리 실전 조언'],
    7: ['7-1. 타고난 에너지 패턴', '7-2. 과로와 번아웃 신호', '7-3. 감정과 몸이 연결되는 방식', '7-4. 주의해야 할 생활 습관', '7-5. 회복 루틴 제안'],
    8: ['8-1. 밖으로 나갔을 때 열리는 운', '8-2. 이직/이사/해외/확장성', '8-3. 귀인과 도움을 받는 방식', '8-4. 외부 환경에서 조심할 점', '8-5. 인생 무대를 넓히는 전략'],
    9: ['9-1. 협력자와 조력자의 유형', '9-2. 사람에게 도움받는 방식', '9-3. 팀워크에서 강해지는 지점', '9-4. 배신감이나 실망이 생기는 구조', '9-5. 좋은 인연을 선별하는 기준'],
    10: ['10-1. 타고난 직업 성향', '10-2. 성과가 나는 업무 방식', '10-3. 조직형/독립형/창작형 적성', '10-4. 사회적 인정이 열리는 조건', '10-5. 커리어 리스크와 돌파 전략'],
    11: ['11-1. 전택궁으로 보는 삶의 기반', '11-2. 주거·자산·정착운의 방향', '11-3. 복덕궁으로 보는 내면의 평온', '11-4. 행복을 갉아먹는 선택', '11-5. 오래 지속되는 만족을 만드는 습관'],
    12: ['12-1. 화록이 열어주는 기회', '12-2. 화권이 만드는 추진력', '12-3. 화과가 주는 인정과 명예', '12-4. 화기가 만드는 집착과 과제', '12-5. 가장 강한 궁과 가장 약한 궁', '12-6. 앞으로 강화해야 할 선택', '12-7. 최종 실행 로드맵']
  };

  var MYSTIC_QUOTES = [
    '자미(紫微)의 빛이 당신의 명반(命盤)에서 깨어나고 있습니다.',
    '열두 궁(宮)이 회전하며 당신 삶의 비밀 코드를 펼칩니다.',
    '명궁(命宮)에 앉은 별이 당신의 천명(天命)을 결정했습니다.',
    '化祿·化權·化科·化忌 — 하늘의 네 가지 변화가 운명을 조각합니다.',
    '대한(大限)은 10년마다 하늘이 교체하는 운명의 장(章)입니다.',
    '관록궁(官祿宮)에 자리한 별이 당신의 천직을 이미 알고 있습니다.',
    '재백궁(財帛宮)의 주성이 당신 부(富)의 그릇 크기를 말해줍니다.',
    '신궁(身宮)은 세상이 보지 못한 당신의 또 다른 본체입니다.',
    '살성(殺星)이 강한 곳에서 가장 빛나는 영웅이 태어납니다.',
    '소한(小限)은 1년마다 12궁을 순행하는 운명의 세밀한 지침서입니다.',
    '부처궁(夫妻宮)의 별이 당신에게 찾아올 인연을 이미 알고 있습니다.',
    '천이궁(遷移宮)은 이동·해외·환경 변화가 복이 되는 시기를 말합니다.',
    '자미두수(紫微斗數) — 중국 황실이 천 년간 금서로 봉인한 운명의 학문',
    '당신의 이름을 하늘에 새긴 별이 지금, 이 순간 빛나고 있습니다.',
  ];

  /* ─────────────── 상태 ─────────────── */
  var _chapters = Array(TOTAL_CHAPTERS).fill(null);
  var _chapterStructured = Array(TOTAL_CHAPTERS).fill(null);
  var _chapterMeta = Array(TOTAL_CHAPTERS).fill(null);
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var _activeRequestController = null;
  var _cancelGeneration = false;
  var _generationRunId = 0;
  var _premiumPaidUntil = 0;
  var _zbLastReportId = '';
  var _zbJobStateKey = 'cd:premium-job:ziwei';

  function _zbGetJobClient() {
    return (typeof window !== 'undefined' && window.CDPremiumPdfJobClient) ? window.CDPremiumPdfJobClient : null;
  }

  function _zbStartPremiumJob(profile) {
    var client = _zbGetJobClient();
    if (!client) return;
    var birth = (profile && profile.birth) ? profile.birth : {};
    client.start({
      stateKey: _zbJobStateKey,
      reportType: 'ziweiPremium',
      featureType: 'premium_pdf_ziwei',
      requestBody: {
        name: String((profile && profile.name) || '사용자'),
        gender: String((profile && profile.gender) || ''),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(birth.hour || 12),
        minute: Number(birth.minute || 0),
      },
    }).catch(function () {});
  }

  function _zbResumePremiumJob() {
    var client = _zbGetJobClient();
    if (!client) return;
    client.resume({ stateKey: _zbJobStateKey }).catch(function () {});
  }

  function _zbRunPremiumJob(totalChapters) {
    var client = _zbGetJobClient();
    if (!client) return;
    client.run({
      stateKey: _zbJobStateKey,
      startChapter: 1,
      endChapter: Number(totalChapters || TOTAL_CHAPTERS),
      stopOnFailure: false,
    }).catch(function () {});
  }

  function _readPremiumTokenForReport() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }

  function _premiumTokenMatches(reportType) {
    var token = _readPremiumTokenForReport();
    if (!token || typeof atob !== 'function') return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var exp = Number(payload && payload.exp);
      return String(payload && payload.reportType || '') === reportType
        && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
    } catch (_) {
      return false;
    }
  }

  function _ensurePremiumPaymentThenStart() {
    if (_premiumTokenMatches('ziweiPremium') || Date.now() < _premiumPaidUntil) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert('결제 확인 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
      return false;
    }
    window._cdCoinGatePerUse(590, '자미두수 프리미엄 PDF 리포트 생성', function () {
      _premiumPaidUntil = Date.now() + 25 * 60 * 1000;
      window.generateZiweiBook();
    }, null, {
      featureKey: 'premium_pdf_ziwei',
      requestId: 'premium_pdf_ziwei-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    });
    return false;
  }

  /* ─────────────── 유틸 ─────────────── */
  function _qs(id) { return document.getElementById(id); }

  function _abortActiveRequest() {
    if (_activeRequestController) {
      try { _activeRequestController.abort(); } catch (_) {}
      _activeRequestController = null;
    }
  }

  function _isGenerationRunActive(runId) {
    return !_cancelGeneration && _generating && _generationRunId === runId;
  }

  function _sanitizeDebugValue(value, depth, seen) {
    if (value == null || typeof value === 'undefined') return value;
    if (typeof value === 'string') return value.length > 400 ? value.slice(0, 400) + '…' : value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'function') return '[function]';
    if (depth >= 2) return Array.isArray(value) ? '[array]' : '[object]';
    if (seen.indexOf(value) !== -1) return '[circular]';
    seen.push(value);
    try {
      if (Array.isArray(value)) {
        return value.slice(0, 8).map(function (item) {
          return _sanitizeDebugValue(item, depth + 1, seen);
        });
      }
      var out = {};
      var keys = Object.keys(value).slice(0, 12);
      for (var i = 0; i < keys.length; i += 1) {
        var key = keys[i];
        out[key] = _sanitizeDebugValue(value[key], depth + 1, seen);
      }
      return out;
    } catch (_) {
      return '[unserializable]';
    } finally {
      seen.pop();
    }
  }

  function _trace(stage, payload) {
    try {
      if (typeof window.__cdZiweiTrace === 'function') {
        window.__cdZiweiTrace(stage, _sanitizeDebugValue(payload || {}, 0, []));
      }
    } catch (_) {}
  }

  function _isWalletExtensionNoise(reason) {
    var text = String(reason || '').trim();
    if (!text) return false;
    return /metamask|ethereum provider|eth_requestaccounts|chrome-extension:\/\//i.test(text);
  }

  function _installWalletNoiseGuard() {
    if (window.__cdZiweiWalletNoiseGuardInstalled) return;
    window.__cdZiweiWalletNoiseGuardInstalled = true;

    window.addEventListener('unhandledrejection', function (event) {
      var reason = event && event.reason;
      var message = '';
      try {
        message = String((reason && (reason.message || reason.code)) || reason || '').trim();
      } catch (_) {
        message = '';
      }
      if (!_isWalletExtensionNoise(message)) return;
      try { event.preventDefault(); } catch (_) {}
      _trace('WALLET_EXTENSION_NOISE_IGNORED', {
        message: message.slice(0, 240),
        mode: 'personal',
      });
      console.warn('[ZiweiBook] wallet extension noise ignored', { message: message.slice(0, 240) });
    });
  }

  _installWalletNoiseGuard();

  function _escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _normalizeSections(sections) {
    if (!Array.isArray(sections)) return [];
    return sections.map(function (row) { return String(row || '').trim(); }).filter(Boolean).slice(0, 8);
  }

  function _hasUsableStructuredChapter(chapterJson) {
    if (!chapterJson || !Array.isArray(chapterJson.sections)) return false;
    for (var i = 0; i < chapterJson.sections.length; i += 1) {
      var row = chapterJson.sections[i] || {};
      if (String(row.body || row.content || '').trim()) return true;
    }
    return false;
  }

  function _getChapterMeta(idx) {
    var fallback = {
      title: CHAPTER_TITLES[idx] || ('Chapter ' + (idx + 1)),
      subtitle: CHAPTER_SUBTITLES[idx] || '',
      sections: [],
      isSkeleton: false,
    };
    var meta = _chapterMeta[idx];
    if (!meta) return fallback;
    return {
      title: String(meta.title || fallback.title),
      subtitle: String(meta.subtitle || fallback.subtitle),
      sections: _normalizeSections(meta.sections),
      isSkeleton: !!meta.isSkeleton,
    };
  }

  function _syncChapterMetaFromResponse(idx, data) {
    if (!data || typeof data !== 'object') return;
    var chapterMeta = data.chapterMeta && typeof data.chapterMeta === 'object' ? data.chapterMeta : null;
    var title = chapterMeta && chapterMeta.title ? chapterMeta.title : CHAPTER_TITLES[idx];
    var subtitle = chapterMeta && chapterMeta.subtitle ? chapterMeta.subtitle : CHAPTER_SUBTITLES[idx];
    _chapterMeta[idx] = {
      title: String(title || CHAPTER_TITLES[idx] || ('Chapter ' + (idx + 1))),
      subtitle: String(subtitle || CHAPTER_SUBTITLES[idx] || ''),
      sections: _normalizeSections(data.chapterSpecificSections),
      isSkeleton: false,
    };
  }

  function _buildChapterSkeleton(idx, reason) {
    var meta = _getChapterMeta(idx);
    var lines = [];
    lines.push('## ' + meta.title);
    if (meta.subtitle) lines.push('> ' + meta.subtitle);
    lines.push('');
    lines.push('### 생성 실패');
    lines.push('이 챕터는 LLM 품질/구조 계약을 충족하지 못해 중단되었습니다.');
    if (reason) lines.push('- 원인: ' + String(reason));
    lines.push('- 스켈레톤 대체 없이 재생성만 허용됩니다.');
    return lines.join('\n');
  }

  function _buildChapterLocalFallback(idx, reason) {
    var labels = Array.isArray(CHAPTER_STRUCTURED_LABELS[idx + 1]) ? CHAPTER_STRUCTURED_LABELS[idx + 1] : [];
    var title = CHAPTER_TITLES[idx] || ('Chapter ' + (idx + 1));
    var subtitle = CHAPTER_SUBTITLES[idx] || '';
    var lines = [];
    lines.push('## ' + title);
    if (subtitle) lines.push('> ' + subtitle);
    lines.push('');
    if (!labels.length) {
      labels = ['핵심 구조 해석', '성향과 반복 패턴', '실전 조언'];
    }
    for (var i = 0; i < labels.length; i += 1) {
      lines.push('## ' + labels[i]);
      lines.push('이 항목은 현재 확보된 명반 핵심값을 기준으로 성향, 반복 패턴, 선택 전략 중심으로 정리합니다.');
      lines.push('실행 포인트: 강점 구간은 작은 실행을 빠르게 누적하고, 변동 구간은 기준 루틴을 먼저 고정하세요.');
      if (reason && i === labels.length - 1) {
        lines.push('주의 포인트: ' + String(reason));
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  function _applyChapterFallback(idx, reason) {
    _chapterMeta[idx] = {
      title: CHAPTER_TITLES[idx] || ('Chapter ' + (idx + 1)),
      subtitle: CHAPTER_SUBTITLES[idx] || '',
      sections: _normalizeSections(CHAPTER_STRUCTURED_LABELS[idx + 1] || []),
      isSkeleton: false,
    };
    _chapters[idx] = _buildChapterLocalFallback(idx, reason);
    _chapterStructured[idx] = {
      sections: (CHAPTER_STRUCTURED_LABELS[idx + 1] || []).map(function (label) {
        return {
          title: String(label || '').trim(),
          body: '현재 확보된 자미두수 핵심 데이터를 기준으로 성향/패턴/실행 전략을 정리했습니다.',
        };
      }),
    };
  }

  function _md2html(text) {
    if (!text) return '';
    var h = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    h = h.replace(/^&gt; (.+)$/gm, '<blockquote class="zb-md-blockquote">$1</blockquote>');
    h = h.replace(/<\/blockquote>\n<blockquote class="zb-md-blockquote">/g, '<br>');
    h = h.replace(/^#### (.+)$/gm, '<h4 class="zb-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3 class="zb-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="zb-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="zb-md-h1">$1</h1>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^---+$/gm, '<hr class="zb-md-hr">');
    h = h.replace(/^[*-] (.+)$/gm, '<li class="zb-md-li">$1</li>');
    h = h.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, function(m) {
      return '<ul class="zb-md-ul">' + m + '</ul>';
    });
    h = h.replace(/^\d+\. (.+)$/gm, '<li class="zb-md-li zb-md-oli">$1</li>');
    h = h.replace(/\n\n+/g, '\n\n');
    var lines = h.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { result.push(''); continue; }
      if (/^<(h[1-4]|ul|li|hr|blockquote)/.test(line) || /<\/(h[1-4]|ul|li|hr|blockquote)>$/.test(line)) {
        result.push(line);
      } else {
        result.push('<p class="zb-md-p">' + line + '</p>');
      }
    }
    return result.join('\n');
  }

  function _deriveTextFromChapterJson(chapterJson) {
    if (!chapterJson || !Array.isArray(chapterJson.sections)) return '';
    return chapterJson.sections
      .filter(function (row) { return row && String(row.body || row.content || '').trim(); })
      .map(function (row) {
        var body = String(row.body || row.content || '').trim();
        var title = String(row.title || row.label || '').trim();
        return title ? ('## ' + title + '\n' + body) : body;
      })
      .join('\n\n');
  }

  function _renderStructuredChapterBody(chapter, chapterJson) {
    if (!chapterJson || !Array.isArray(chapterJson.sections) || !chapterJson.sections.length) return '';
    var labels = CHAPTER_STRUCTURED_LABELS[Number(chapter)] || [];
    var out = [];
    for (var i = 0; i < chapterJson.sections.length; i++) {
      var row = chapterJson.sections[i] || {};
      var body = String(row.body || row.content || '').trim();
      if (!body) continue;
      var title = String(row.title || row.label || labels[i] || ('핵심 항목 ' + (i + 1)));
      out.push('<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + _escHtml(title) + '</h4><div class="lb-result-article__section-body">' + _md2html(body) + '</div></section>');
    }
    if (!out.length) return '';
    return '<div class="lb-result-article__structured">' + out.join('') + '</div>';
  }

  /* ─────────────── 프로필/자미두수 데이터 수집 ─────────────── */
  function _recoverBirthFromDOM() {
    try {
      var dateEl = document.getElementById('birthDate');
      var nameEl = document.getElementById('nameInput');
      var isFemale = document.querySelector('#btnF.on') !== null;
      if (!dateEl || !dateEl.value) return null;
      var parts = dateEl.value.split('-');
      if (parts.length < 3) return null;
      var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
      if (!y || !m || !d) return null;
      var hourEl = document.getElementById('birthHour');
      var minEl = document.getElementById('birthMinute');
      var locationData = { label: '대한민국 (서울)', lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
      var countrySel = document.getElementById('zbBirthCountry') || document.getElementById('birthCountry');
      if (countrySel && countrySel.selectedIndex >= 0) {
        var opt = countrySel.options[countrySel.selectedIndex];
        if (opt) {
          locationData = {
            label: (opt.textContent || opt.text || '').trim(),
            lng: parseFloat(opt.getAttribute('data-long') || '127.0'),
            lat: parseFloat(opt.getAttribute('data-lat') || '37.6'),
            tz: opt.value || 'Asia/Seoul',
            tzOffset: parseFloat(opt.getAttribute('data-tz') || '9'),
            baseTzOffset: parseFloat(opt.getAttribute('data-base-tz') || '9')
          };
        }
      }
      return {
        name: (nameEl && nameEl.value.trim()) || '사용자',
        gender: isFemale ? 'F' : 'M',
        birth: { year: y, month: m, day: d,
          hour: hourEl ? Number(hourEl.value) : 12,
          minute: minEl ? Number(minEl.value) : 0 },
        location: locationData
      };
    } catch (_) { return null; }
  }

  function _getActiveBirthProfile() {
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    return null;
  }

  function _collectZiweiData() {
    var profile = window.__cdActiveBirthProfile || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var name = profile.name || snap.name || '사용자';
    var gender = profile.gender || snap.gender || '';
    var birth = profile.birth || snap.birth || {};

    var lines = [];
    lines.push('【자미두수 분석 대상】');
    lines.push('이름: ' + name);
    lines.push('성별: ' + (gender === 'F' ? '여성' : gender === 'M' ? '남성' : gender || '미상'));
    if (birth.year) {
      lines.push('생년월일: ' + birth.year + '년 ' + (birth.month || '') + '월 ' + (birth.day || '') + '일');
      lines.push('출생 시각: ' + (birth.hour !== undefined ? birth.hour + '시 ' : '') + (birth.minute !== undefined ? birth.minute + '분' : ''));
    }
    if (profile.location && profile.location.label) {
      lines.push('출생지: ' + profile.location.label);
    }

    // 자미두수 12궁 데이터 수집
    var zd = window._currentZiweiData;
    if (!zd && birth.year && typeof window.calcZiweiPalaces === 'function') {
      try {
        zd = window.calcZiweiPalaces(birth.year, birth.month, birth.day, birth.hour || 0, birth.minute || 0);
        window._currentZiweiData = zd;
      } catch (_zdE) {}
    }

    if (zd) {
      lines.push('\n【자미두수 12궁 배치】');
      var palaceNames = ['명궁','형제궁','부처궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
      if (zd.palacesByIndex && Array.isArray(zd.palacesByIndex)) {
        for (var i = 0; i < 12; i++) {
          if (zd.palacesByIndex[i]) {
            lines.push(i + '번 궁(' + (zd.palacesByIndex[i] || '') + '): 지지 위치 ' + i);
          }
        }
      }
      if (zd.stars) {
        lines.push('\n【주성·보성·살성 배치】');
        var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        for (var j = 0; j < 12; j++) {
          var starData = zd.stars[j];
          if (!starData) continue;
          var mainList = (starData.main || []);
          var auxList  = (starData.aux  || []);
          var badList  = (starData.bad  || []);
          if (!mainList.length && !auxList.length && !badList.length) continue;
          var parts = [];
          if (mainList.length) parts.push('주성: ' + mainList.join('·'));
          if (auxList.length)  parts.push('보성: ' + auxList.join('·'));
          if (badList.length)  parts.push('살성: ' + badList.join('·'));
          var palName = (zd.palacesByIndex && zd.palacesByIndex[j]) ? zd.palacesByIndex[j] : ZHI[j] + '궁';
          lines.push(palName + ' [' + ZHI[j] + '] → ' + parts.join(' | '));
        }
      }
      // 명궁/신궁 상세
      if (zd.mingGong !== undefined || zd.mengIdx !== undefined) {
        var mgIdx = zd.mingGong !== undefined ? zd.mingGong : zd.mengIdx;
        var sgIdx = zd.shenGong !== undefined ? zd.shenGong : zd.shenIdx;
        var ZHI2 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        if (mgIdx !== undefined) {
          lines.push('\n명궁(命宮) 지지: ' + ZHI2[mgIdx]);
          if (zd.stars && zd.stars[mgIdx]) {
            var ms = zd.stars[mgIdx];
            lines.push('명궁 주성: ' + (ms.main || []).join('·') + ' | 보성: ' + (ms.aux || []).join('·') + ' | 살성: ' + (ms.bad || []).join('·'));
          }
        }
        if (sgIdx !== undefined) {
          lines.push('신궁(身宮) 지지: ' + ZHI2[sgIdx]);
          if (zd.stars && zd.stars[sgIdx]) {
            var ss = zd.stars[sgIdx];
            lines.push('신궁 주성: ' + (ss.main || []).join('·') + ' | 보성: ' + (ss.aux || []).join('·'));
          }
        }
      }
      // 국 및 천마·문창·문곡
      if (zd.calcMeta) {
        var meta = zd.calcMeta;
        if (meta.ju) lines.push('\n명국(命局): ' + meta.ju + ' — 일류 자미두수 계산의 근간');
        if (meta.yearGan) lines.push('생년 천간: ' + meta.yearGan + ' | 생년 지지: ' + (meta.yearZhi || ''));
      }
    }

    // 사주 원국 추가
    var G = window.G_PILLARS;
    if (G) {
      lines.push('\n【사주 원국 — 자미두수 해석 보조 데이터】');
      if (G.y) lines.push('년주: ' + (G.y.g || '') + (G.y.j || '') + (G.y.gE ? ' [' + G.y.gE + '/' + G.y.jE + ']' : ''));
      if (G.m) lines.push('월주: ' + (G.m.g || '') + (G.m.j || '') + (G.m.gE ? ' [' + G.m.gE + '/' + G.m.jE + ']' : ''));
      if (G.d) lines.push('일주: ' + (G.d.g || '') + (G.d.j || '') + (G.d.gE ? ' [' + G.d.gE + '/' + G.d.jE + ']' : ''));
      if (G.h) lines.push('시주: ' + (G.h.g || '') + (G.h.j || '') + (G.h.gE ? ' [' + G.h.gE + '/' + G.h.jE + ']' : ''));
    }

    // 현재 나이
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n현재 나이: ' + currentAge + '세 (만 ' + (currentAge - 1) + '세)');
      lines.push('현재 기준年: 2026년 丙午年');
    }

    return lines.join('\n');
  }

  /* ─────────────── localStorage 저장/복원 ─────────────── */
  var _ZB_STORE_VER = 'zb_v1_';

  function _zbMakeKey(profile) {
    var b = (profile && profile.birth) || {};
    return _ZB_STORE_VER + (b.year || '0') + '_' + (b.month || '0') + '_' + (b.day || '0') + '_' + ((profile && profile.gender) || 'u');
  }

  function _zbSaveResult(profile, reportId) {
    try {
      sessionStorage.setItem(_zbMakeKey(profile), JSON.stringify({
        chapters: _chapters,
        chapterStructured: _chapterStructured,
        chapterMeta: _chapterMeta,
        reportId: String(reportId || _zbLastReportId || '').trim(),
        name: (profile && profile.name) || '사용자',
        birth: (profile && profile.birth) || {},
        gender: (profile && profile.gender) || '',
        savedAt: new Date().toISOString()
      }));
    } catch (e) {}
  }

  function _zbLoadSaved(profile) {
    try {
      var raw = sessionStorage.getItem(_zbMakeKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _zbClearSaved(profile) {
    try { sessionStorage.removeItem(_zbMakeKey(profile)); } catch (e) {}
  }

  function _zbHasSavedContent(saved) {
    if (!saved || !Array.isArray(saved.chapters)) return false;
    var validCount = saved.chapters.filter(function (c, idx) {
      var hasText = typeof c === 'string' && c.trim().length >= MIN_CHAPTER_CHARS && !/^⚠️/.test(c.trim());
      var structured = Array.isArray(saved.chapterStructured) ? saved.chapterStructured[idx] : null;
      return hasText || _hasUsableStructuredChapter(structured);
    }).length;
    return validCount >= TOTAL_CHAPTERS;
  }

  function _zbApplySavedResult(saved, modal) {
    if (!saved || !modal) return;
    _chapters = Array.isArray(saved.chapters) ? saved.chapters : Array(TOTAL_CHAPTERS).fill(null);
    _chapterStructured = Array.isArray(saved.chapterStructured)
      ? saved.chapterStructured.slice(0, TOTAL_CHAPTERS)
      : Array(TOTAL_CHAPTERS).fill(null);
    _chapterMeta = Array.isArray(saved.chapterMeta)
      ? saved.chapterMeta.slice(0, TOTAL_CHAPTERS)
      : Array(TOTAL_CHAPTERS).fill(null);
    _zbLastReportId = String(saved.reportId || '').trim();
    _currentChapter = 1;
    _showScreen('zbResultScreen');
    _updateTocState();
    _renderChapter(1);
    _bindToc();
    var nameEl = _qs('zbResultName');
    var dateEl = _qs('zbResultDate');
    if (nameEl) nameEl.textContent = '🌌 ' + (saved.name || '사용자') + '님의 자미두수 인생 총람';
    if (dateEl) {
      var b = saved.birth || {};
      var savedDate = saved.savedAt ? new Date(saved.savedAt).toLocaleDateString('ko-KR') : '';
      dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · '
        + (saved.gender === 'F' ? '여성' : saved.gender === 'M' ? '남성' : '')
        + (savedDate ? ' · 💾 ' + savedDate + ' 저장' : '');
    }
    var epBanner = _qs('zbEpilogueBanner');
    if (epBanner) epBanner.style.display = '';
  }

  function _zbEnsureHistoryButton(saved, modal) {
    var startScreen = _qs('zbStartScreen');
    if (!startScreen || !modal) return;
    var btn = _qs('zbViewSavedBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'zbViewSavedBtn';
      btn.className = 'lb-btn-generate lb-btn-history';
      btn.textContent = '📂 지난 자미두수 총람 열기';
      startScreen.appendChild(btn);
      btn.addEventListener('click', function () {
        var payload = btn.__savedPayload || null;
        if (!_zbHasSavedContent(payload)) return;
        _zbApplySavedResult(payload, modal);
      });
    }
    btn.__savedPayload = saved;
    btn.style.display = _zbHasSavedContent(saved) ? '' : 'none';
  }

  /* ─────────────── 화면 전환 ─────────────── */
  function _showScreen(id) {
    var screens = ['zbNoProfileScreen', 'zbStartScreen', 'zbLoadingScreen', 'zbResultScreen', 'zbErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  /* ─────────────── TOC ─────────────── */
  var ZB_ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];

  function _renderToc() {
    var nav = document.getElementById('zbToc');
    if (!nav) return;
    if (nav.querySelector('[data-zb-chapter]')) return; // 이미 렌더됨
    var html = '';
    for (var i = 1; i <= TOTAL_CHAPTERS; i++) {
      html += '<button type="button" class="lb-toc-item zb-toc-item' + (i === 1 ? ' active' : '') + '" data-zb-chapter="' + i + '">' + ZB_ROMAN[i - 1] + '</button>';
    }
    nav.innerHTML = html;
  }

  function _bindToc() {
    var nav = document.getElementById('zbToc');
    if (!nav) return;
    _renderToc();
    if (nav.__cdZiweiTocBound === '1') return;
    nav.__cdZiweiTocBound = '1';
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-zb-chapter]');
      if (!btn) return;
      var ch = Number(btn.getAttribute('data-zb-chapter'));
      if (!ch || (!_chapters[ch - 1] && !_hasUsableStructuredChapter(_chapterStructured[ch - 1]))) return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.zb-toc-item'), function (b) {
        b.classList.toggle('active', b === btn);
        var bi = Number(b.getAttribute('data-zb-chapter')) - 1;
        b.classList.toggle('loaded', !!_chapters[bi] || _hasUsableStructuredChapter(_chapterStructured[bi]));
      });
    });
  }

  function _renderChapter(ch) {
    var content = _qs('zbChapterContent');
    if (!content) return;
    var idx = ch - 1;
    var data = _chapters[idx];
    var structured = _chapterStructured[idx];
    var meta = _getChapterMeta(idx);
    var sections = meta.sections;
    if (!data && !structured) {
      content.innerHTML = '<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';
      return;
    }
    var bodyHtml = _renderStructuredChapterBody(ch, structured);
    if (!bodyHtml && data) bodyHtml = _md2html(data);
    if (!bodyHtml && structured) bodyHtml = _md2html(_deriveTextFromChapterJson(structured));
    content.innerHTML =
      '<div class="zb-chapter-wrap">' +
      '<div class="zb-chapter-header">' +
      '<span class="zb-chapter-num">Chapter ' + ch + '</span>' +
      '<h2 class="zb-chapter-title">' + _escHtml(meta.title) + '</h2>' +
      '<p class="zb-chapter-sub">' + _escHtml(meta.subtitle) + '</p>' +
      (sections.length
        ? ('<div class="zb-chapter-sections" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">'
          + sections.map(function (s) { return '<span style="font-size:12px;padding:4px 8px;border-radius:999px;background:#f5f0ff;color:#4c0d9f;border:1px solid #e9ddff;">' + _escHtml(s) + '</span>'; }).join('')
          + '</div>')
        : '') +
      '</div>' +
      '<div class="zb-chapter-body">' + bodyHtml + '</div>' +
      '</div>';
    content.scrollTop = 0;
  }

  function _updateTocState() {
    _renderToc();
    var items = document.querySelectorAll('#zbToc .zb-toc-item');
    Array.prototype.forEach.call(items, function (btn) {
      var ch = Number(btn.getAttribute('data-zb-chapter'));
      btn.classList.toggle('loaded', !!_chapters[ch - 1] || _hasUsableStructuredChapter(_chapterStructured[ch - 1]));
      btn.classList.toggle('active', ch === 1);
    });
  }

  /* ─────────────── 모달 열기/닫기 ─────────────── */
  window.openZiweiBookModal = function (profileArg) {
    _trace('FUNCTION_ENTER_OPEN_MODAL', {
      hasArgProfile: !!(profileArg && profileArg.birth),
      hasGlobalProfile: !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth)
    });
    try {
      var pvw = document.getElementById('tilePvwOverlay');
      if (pvw) {
        pvw.classList.remove('pvw-open');
        pvw.style.opacity = '0';
        pvw.style.pointerEvents = 'none';
        pvw.style.visibility = 'hidden';
        setTimeout(function() {
          try { pvw.style.opacity=''; pvw.style.pointerEvents=''; pvw.style.visibility=''; } catch(_) {}
        }, 400);
      }
    } catch (_) {}
    if (profileArg && profileArg.birth && profileArg.birth.year) {
      try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
    }

    var modal = _qs('ziweiBookModal');
    if (!modal) {
      _trace('FLOW_ABORT_NO_MODAL', {});
      console.error('[자미두수 인생 총람] ziweiBookModal 요소를 찾을 수 없습니다.');
      return;
    }
    if (modal && modal.style) {
      modal.style.setProperty('--lb-history-a', 'rgba(147, 51, 234, 0.24)');
      modal.style.setProperty('--lb-history-b', 'rgba(76, 29, 149, 0.5)');
      modal.style.setProperty('--lb-history-border', 'rgba(196, 181, 253, 0.52)');
      modal.style.setProperty('--lb-history-text', '#f3e8ff');
    }

    var profile = _getActiveBirthProfile();
    // 프로필 없으면 localStorage 운명 카드에서 복구
    if (!profile) {
      try {
        var _dpNs = 'FORTUNE_APP_USER_PROFILES';
        var _dpList = JSON.parse(localStorage.getItem(_dpNs + '.list') || '[]');
        var _dpCurrId = localStorage.getItem(_dpNs + '.current');
        var _dpMatch = (_dpCurrId && _dpList.find(function(p){return p.id===_dpCurrId;})) || (_dpList.length && _dpList[0]) || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = _dpMatch;
        }
      } catch (_dpE) {}
    }
    if (!profile) {
      _trace('OPEN_MODAL_NO_PROFILE', {});
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      modal.style.zIndex = '100120';
      document.body.style.overflow = 'hidden';
      try { modal.setAttribute('aria-hidden', 'false'); } catch(_) {}
      _showScreen('zbNoProfileScreen');
      return;
    }
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    _zbResumePremiumJob();

    if (_generating) {
      _showScreen('zbLoadingScreen');
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      modal.style.zIndex = '100120';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('lb-modal-open');
      try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
      return;
    }

    // 프로필 카드에서 진입했을 때 자미두수 계산 상태를 즉시 동기화
    try {
      if (typeof window.computeProfileForModal === 'function') {
        window.computeProfileForModal(profile);
      }
      var pb = (profile && profile.birth) || {};
      if (!window._currentZiweiData && pb.year && typeof window.calcZiweiPalaces === 'function') {
        window._currentZiweiData = window.calcZiweiPalaces(
          Number(pb.year),
          Number(pb.month || 1),
          Number(pb.day || 1),
          Number(pb.hour || 0),
          Number(pb.minute || 0)
        );
      }
    } catch (_) {}

    // 항상 시작 화면부터 열고, 저장된 결과는 별도 버튼으로만 복원
    var saved = _zbLoadSaved(profile);

    _chapters = Array(TOTAL_CHAPTERS).fill(null);
    _chapterStructured = Array(TOTAL_CHAPTERS).fill(null);
    _chapterMeta = Array(TOTAL_CHAPTERS).fill(null);
    _zbLastReportId = '';
    _currentChapter = 1;
    _showScreen('zbStartScreen');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    _zbEnsureHistoryButton(saved, modal);
    _trace('OPEN_MODAL_READY', {
      profileName: profile && profile.name ? profile.name : '사용자',
      birthYear: profile && profile.birth ? profile.birth.year : null
    });

    // 출생지 선택기 초기화
    if (typeof window.populateCountrySelectById === 'function') {
      var locLabel = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.location && window.__cdActiveBirthProfile.location.label)
        ? window.__cdActiveBirthProfile.location.label : '대한민국 (서울)';
      window.populateCountrySelectById('zbBirthCountry', locLabel);
    }

    // 프로필 정보 미리 채우기
    _prefillProfileInfo(profile);

    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.zb-modal__close');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    } catch (_) {}
  };

  function _prefillProfileInfo(profile) {
    if (!profile) return;
    var b = profile.birth || {};
    var infoEl = _qs('zbProfileSummary');
    if (infoEl && b.year) {
      infoEl.textContent =
        (profile.name || '사용자') + ' · ' +
        (profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : '') + ' · ' +
        b.year + '년 ' + (b.month || '') + '월 ' + (b.day || '') + '일 ' +
        (b.hour !== undefined ? b.hour + '시' : '') +
        (b.minute !== undefined && b.minute > 0 ? ' ' + b.minute + '분' : '') + ' 생';
      infoEl.style.display = '';
    }
  }

  window.closeZiweiBookModal = function () {
    var modal = _qs('ziweiBookModal');
    if (!modal) return;
    if (!_generating) {
      _cancelGeneration = true;
      _generationRunId += 1;
      _generating = false;
      _abortActiveRequest();
      if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
    }
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  /* ─────────────── 생성 로직 ─────────────── */
  window.generateZiweiBook = function () {
    if (_generating) return;
    if (!_ensurePremiumPaymentThenStart()) return;
    _trace('PDF_GENERATION_START', { phase: 'chapter-generation-requested' });

    var profile = _getActiveBirthProfile();
    if (!profile) {
      _trace('FLOW_ABORT_NO_PROFILE_FOR_GENERATE', {});
      alert('사주/자미두수 계산을 먼저 완료해 주세요.');
      return;
    }
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }
    _trace('ENGINE_CALC_START', {
      mode: 'personal',
      chapterCount: TOTAL_CHAPTERS,
      categoryCount: Array.isArray(CHAPTER_STRUCTURED_LABELS[1]) ? CHAPTER_STRUCTURED_LABELS[1].length : 0,
    });

    // 출생지 선택기가 있으면 반영
    var zbCountrySel = document.getElementById('zbBirthCountry');
    if (zbCountrySel && zbCountrySel.selectedIndex >= 0) {
      var _selOpt = zbCountrySel.options[zbCountrySel.selectedIndex];
      if (_selOpt) {
        var _newLoc = {
          label: (_selOpt.textContent || _selOpt.text || '').trim(),
          lng: parseFloat(_selOpt.getAttribute('data-long') || '127.0'),
          lat: parseFloat(_selOpt.getAttribute('data-lat') || '37.6'),
          tz: _selOpt.value || 'Asia/Seoul',
          tzOffset: parseFloat(_selOpt.getAttribute('data-tz') || '9'),
          baseTzOffset: parseFloat(_selOpt.getAttribute('data-base-tz') || '9')
        };
        profile.location = _newLoc;
        if (window.__cdActiveBirthProfile) window.__cdActiveBirthProfile.location = _newLoc;
      }
    }

    _generating = true;
    _cancelGeneration = false;
    _generationRunId += 1;
    _zbStartPremiumJob(profile);
    var _runId = _generationRunId;
    _chapters = Array(TOTAL_CHAPTERS).fill(null);
    _chapterStructured = Array(TOTAL_CHAPTERS).fill(null);
    _chapterMeta = Array(TOTAL_CHAPTERS).fill(null);
    // 사주 분석 화면과 100% 일치하도록 G_PILLARS 등 전역 변수 재계산
    if (typeof window.computeProfileForModal === 'function' && profile && profile.birth) {
      try { window.computeProfileForModal(profile); } catch (_cpE) {}
    }
    var ziweiData = _collectZiweiData();
    // 서버 계산을 위한 생년월일 파라미터 추출
    var _zbProfile = (function () {
      var _p = window.__cdActiveBirthProfile || {};
      var _s = window.__destinyFlowerSajuSnapshot || {};
      var _b = _p.birth || _s.birth || {};
      return {
        birthYear:  _b.year  || 0,
        birthMonth: _b.month || 0,
        birthDay:   _b.day   || 0,
        birthHour:  (_b.hour !== undefined && _b.hour !== null) ? _b.hour : -1,
        gender: _p.gender || _s.gender || '',
        name:   _p.name   || _s.name   || '사용자',
      };
    })();

    _trace('DATA_RECEIVED', {
      hasProfile: !!(_zbProfile.birthYear && _zbProfile.birthMonth && _zbProfile.birthDay),
      birthYear: _zbProfile.birthYear,
      gender: _zbProfile.gender || ''
    });
    _trace('ENGINE_CALC_SUCCESS', {
      mode: 'personal',
      hasPayload: !!ziweiData,
      palaceCount: (window._currentZiweiData && Array.isArray(window._currentZiweiData.palaceStarData))
        ? window._currentZiweiData.palaceStarData.length
        : 0,
      chapterCount: TOTAL_CHAPTERS,
      categoryCount: Array.isArray(CHAPTER_STRUCTURED_LABELS[1]) ? CHAPTER_STRUCTURED_LABELS[1].length : 0,
    });
    _trace('MINIMAL_PAYLOAD_READY', {
      mode: 'personal',
      hasPayload: true,
      palaceCount: (window._currentZiweiData && Array.isArray(window._currentZiweiData.palaceStarData))
        ? window._currentZiweiData.palaceStarData.length
        : 0,
      chapterCount: TOTAL_CHAPTERS,
      categoryCount: Array.isArray(CHAPTER_STRUCTURED_LABELS[1]) ? CHAPTER_STRUCTURED_LABELS[1].length : 0,
    });
    _trace('CANONICAL_CHAPTERS_READY', {
      mode: 'personal',
      hasPayload: true,
      chapterCount: TOTAL_CHAPTERS,
      categoryCount: Array.isArray(CHAPTER_STRUCTURED_LABELS[1]) ? CHAPTER_STRUCTURED_LABELS[1].length : 0,
    });

    if (!ziweiData || ziweiData.length < 20) {
      _trace('FLOW_CONTINUE_WITH_SERVER_RESOLVER', { length: ziweiData ? ziweiData.length : 0 });
    }

    _showScreen('zbLoadingScreen');

    var progressBar = _qs('zbProgressBar');
    var progressText = _qs('zbProgressText');
    var chapterMsg = _qs('zbLoadingChapter');
    var chapterNumEl = _qs('zbLoadingChapterNum');
    var mysticEl = _qs('zbMysticQuote');

    // 신비 멘트 인터벌
    if (_mysticTimer) clearInterval(_mysticTimer);
    var _mqIdx = 0;
    if (mysticEl) {
      mysticEl.textContent = MYSTIC_QUOTES[0];
      mysticEl.classList.remove('zb-fade-out');
    }
    _mysticTimer = setInterval(function () {
      _mqIdx = (_mqIdx + 1) % MYSTIC_QUOTES.length;
      if (mysticEl) {
        mysticEl.classList.add('lb-fade-out');
        setTimeout(function () {
          if (mysticEl) {
            mysticEl.textContent = MYSTIC_QUOTES[_mqIdx];
            mysticEl.classList.remove('lb-fade-out');
          }
        }, 420);
      }
    }, 3600);

    // 챕터 아이콘 초기화
    var chDots = document.querySelectorAll('.zb-ch-dot');
    Array.prototype.forEach.call(chDots, function (d) {
      d.classList.remove('zb-ch-dot--done', 'zb-ch-dot--active', 'lb-ch-dot--done', 'lb-ch-dot--active', 'lb-ch-dot--just-done');
    });
    if (chDots[0]) chDots[0].classList.add('zb-ch-dot--active', 'lb-ch-dot--active');

    var chapterWrap = chapterNumEl && chapterNumEl.parentElement && chapterNumEl.parentElement.classList && chapterNumEl.parentElement.classList.contains('lb-loading__chapter')
      ? chapterNumEl.parentElement
      : null;

    function _setProgress(done) {
      var pct = (done / TOTAL_CHAPTERS) * 100;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / ' + TOTAL_CHAPTERS + ' 챕터 완성';
      if (chapterMsg && done < TOTAL_CHAPTERS) chapterMsg.textContent = LOADING_MSGS[done] || '분석 중...';
      if (chapterMsg && done >= TOTAL_CHAPTERS) chapterMsg.textContent = '자미두수 인생 총람이 완성되었습니다 ✦';
      if (chapterNumEl) chapterNumEl.textContent = done < TOTAL_CHAPTERS ? 'Chapter ' + (done + 1) : '✦ 완성 ✦';
      if (chapterMsg) {
        chapterMsg.classList.remove('lb-loading__status--pulse');
        void chapterMsg.offsetWidth;
        chapterMsg.classList.add('lb-loading__status--pulse');
      }
      if (chapterWrap) {
        chapterWrap.classList.remove('is-updating');
        void chapterWrap.offsetWidth;
        chapterWrap.classList.add('is-updating');
      }
      Array.prototype.forEach.call(chDots, function (d) {
        var ch = Number(d.getAttribute('data-zbch'));
        var isDone = ch <= done;
        var isActive = ch === done + 1 && done < TOTAL_CHAPTERS;
        var wasDone = d.classList.contains('zb-ch-dot--done') || d.classList.contains('lb-ch-dot--done');
        d.classList.toggle('zb-ch-dot--done', isDone);
        d.classList.toggle('zb-ch-dot--active', isActive);
        d.classList.toggle('lb-ch-dot--done', isDone);
        d.classList.toggle('lb-ch-dot--active', isActive);
        if (!wasDone && isDone) {
          d.classList.add('lb-ch-dot--just-done');
          setTimeout(function () { d.classList.remove('lb-ch-dot--just-done'); }, 760);
          d.style.animation = 'none'; requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.animation='';});});
        }
      });
    }

    _setProgress(0);

    function _collectZiweiStructuredData() {
      try {
        var zd = window._currentZiweiData || null;
        if (!zd || !Array.isArray(zd.palaceStarData)) return null;
        return {
          palaceStarData: zd.palaceStarData.map(function (row) {
            return {
              palace: row && row.palace ? String(row.palace) : '',
              branch: row && row.branch ? String(row.branch) : '',
              stars: Array.isArray(row && row.stars) ? row.stars.map(function (s) {
                return {
                  name: s && s.name ? String(s.name) : '',
                  strength: s && s.strength ? String(s.strength) : '',
                  borrowed: !!(s && s.borrowed)
                };
              }) : [],
              auxStars: Array.isArray(row && row.auxStars) ? row.auxStars.map(function (s) {
                return {
                  name: s && s.name ? String(s.name) : '',
                  strength: s && s.strength ? String(s.strength) : '',
                  borrowed: !!(s && s.borrowed)
                };
              }) : [],
              badStars: Array.isArray(row && row.badStars) ? row.badStars.map(function (s) {
                return {
                  name: s && s.name ? String(s.name) : '',
                  strength: s && s.strength ? String(s.strength) : '',
                  borrowed: !!(s && s.borrowed)
                };
              }) : []
            };
          })
        };
      } catch (_) {
        return null;
      }
    }

    var _zbReportId = 'ziwei_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    _zbLastReportId = _zbReportId;

    function _finishGenerationFailure(userMessage, tracePayload) {
      if (!_isGenerationRunActive(_runId)) return;
      _abortActiveRequest();
      if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
      _generating = false;
      _trace('PDF_GENERATION_FAILED', tracePayload || {});
      var failErrEl = _qs('zbErrorMsg');
      if (failErrEl) {
        failErrEl.textContent = userMessage || '자미두수 PDF 본문 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      }
      _showScreen('zbErrorScreen');
    }

    function _finishGenerationSuccess() {
      if (!_isGenerationRunActive(_runId)) return;
      _abortActiveRequest();
      if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
      _generating = false;
      var _validCount = _chapters.filter(function(c, idx) {
        return (typeof c === 'string' && c.trim().length > 0)
          || _hasUsableStructuredChapter(_chapterStructured[idx]);
      }).length;
      _trace('PDF_GENERATION_COMPLETE', { validChapters: _validCount, totalChapters: TOTAL_CHAPTERS });
      if (_validCount < TOTAL_CHAPTERS) {
        _finishGenerationFailure(
          _validCount === 0
            ? '모든 챕터 생성에 실패했습니다. API 키 설정 또는 네트워크를 확인해 주세요.\n잠시 후 다시 시도해 주세요.'
            : '챕터 생성이 중단되었습니다 (성공 ' + _validCount + '/' + TOTAL_CHAPTERS + '). 실패 챕터를 확인한 뒤 다시 시도해 주세요.',
          { validChapters: _validCount, totalChapters: TOTAL_CHAPTERS, code: 'INCOMPLETE_CHAPTERS' }
        );
        return;
      }
      _showScreen('zbResultScreen');
      _trace('PDF_RENDER_START', {
        mode: 'personal',
        chapterCount: TOTAL_CHAPTERS,
      });
      _updateTocState();
      _renderChapter(1);
      _bindToc();
      var prof = window.__cdActiveBirthProfile || {};
      var nameEl = _qs('zbResultName');
      var dateEl = _qs('zbResultDate');
      if (nameEl) nameEl.textContent = '🌌 ' + (prof.name || '사용자') + '님의 자미두수 인생 총람';
      if (dateEl) {
        var b = prof.birth || {};
        dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · ' + (prof.gender === 'F' ? '여성' : prof.gender === 'M' ? '남성' : '') + ' · 🗓️ ' + new Date().toLocaleDateString('ko-KR') + ' 발행';
      }
      _zbSaveResult(prof, _zbReportId);
      _zbRunPremiumJob(TOTAL_CHAPTERS);
      _trace('PDF_RENDER_SUCCESS', {
        mode: 'personal',
        chapterCount: TOTAL_CHAPTERS,
      });
      var epBanner = _qs('zbEpilogueBanner');
      if (epBanner) epBanner.style.display = '';
    }

    function _readPremiumAccessToken() {
      var token = '';
      try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
      if (!token) {
        try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
      }
      if (!token) {
        try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
      }
      return token;
    }

    function _fetchChapter(idx, runId) {
      var _zbAuthToken = '';
      try { _zbAuthToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
      return new Promise(function (resolve) {
        var _settled = false;
        var _lastError = '알 수 없는 오류';
        var _attemptPlan = [0, 1, 2];

        function _done(payload) {
          if (_settled) return;
          _settled = true;
          _abortActiveRequest();
          resolve(payload);
        }

        function _runAttempt(at) {
          if (!_isGenerationRunActive(runId)) {
            _done({ ok: false, message: '생성이 취소되었습니다.', code: 'GENERATION_ABORTED' });
            return;
          }
          if (at >= _attemptPlan.length) {
            _done({ ok: false, message: _lastError, code: 'FETCH_FAILED' });
            return;
          }

          var _zbPremiumToken = _readPremiumAccessToken();
          _trace('SECTION_GENERATION_START', {
            chapterId: 'ch_' + (idx + 1),
            categoryId: null,
            mode: 'personal',
            hasPayload: true,
            chapterCount: TOTAL_CHAPTERS,
            categoryCount: Array.isArray(CHAPTER_STRUCTURED_LABELS[idx + 1]) ? CHAPTER_STRUCTURED_LABELS[idx + 1].length : 0,
          });
          var _controller = (typeof AbortController === 'function') ? new AbortController() : null;
          if (_controller) _activeRequestController = _controller;
          var timeoutId = setTimeout(function () {
            _lastError = '응답 시간 초과 (60초).';
            if (_controller) {
              try { _controller.abort(); } catch (_) {}
            }
          }, 60000);

          var _zbHeaders = { 'Content-Type': 'application/json' };
          if (_zbAuthToken) _zbHeaders['Authorization'] = 'Bearer ' + _zbAuthToken;
          if (_zbPremiumToken) _zbHeaders['x-premium-access-token'] = _zbPremiumToken;

          fetch('/api/ziwei/generate-chapter', {
            method: 'POST',
            headers: _zbHeaders,
            body: JSON.stringify({
              reportId: _zbReportId,
              requestId: 'ziwei-' + _zbReportId + '-ch' + (idx + 1) + '-a' + (at + 1),
              chapterIndex: idx + 1,
              ch: idx + 1,
              sessionId: idx + 1,
              chapter: idx + 1,
              strictNoFallback: false,
              chapterTitle: CHAPTER_TITLES[idx] || ('Chapter ' + (idx + 1)),
              chapterSubtitle: CHAPTER_SUBTITLES[idx] || '',
              chapterSpecificSections: Array.isArray(CHAPTER_STRUCTURED_LABELS[idx + 1])
                ? CHAPTER_STRUCTURED_LABELS[idx + 1]
                : [],
              premiumAccessToken: _zbPremiumToken || undefined,
              ziweiData: ziweiData,
              ziweiStructured: _collectZiweiStructuredData(),
              birthYear: _zbProfile.birthYear,
              birthMonth: _zbProfile.birthMonth,
              birthDay: _zbProfile.birthDay,
              birthHour: _zbProfile.birthHour,
              gender: _zbProfile.gender,
              name: _zbProfile.name,
            }),
            signal: _controller ? _controller.signal : undefined,
          })
            .then(function (res) {
              if (!res.ok) return res.json().catch(function () { return {}; }).then(function (e) {
                return { ok: false, message: (e && e.message) || 'HTTP ' + res.status };
              });
              return res.json().catch(function () { return { ok: false, message: 'JSON 파싱 오류' }; });
            })
            .then(function (data) {
              clearTimeout(timeoutId);
              if (_activeRequestController === _controller) _activeRequestController = null;
              if (data && data.ok) {
                _done(data);
                return;
              }
              _lastError = (data && data.message) ? data.message : 'API 응답 실패';
              _runAttempt(at + 1);
            })
            .catch(function (err) {
              clearTimeout(timeoutId);
              if (_activeRequestController === _controller) _activeRequestController = null;
              if (err && err.name === 'AbortError') {
                _lastError = _isGenerationRunActive(runId) ? '응답 시간 초과 (60초).' : '생성이 취소되었습니다.';
              } else {
                _lastError = String(err && err.message ? err.message : err);
              }
              _runAttempt(at + 1);
            });
        }

        _runAttempt(0);
      });
    }

    var _failCount = 0;
    var _generationQueue = Promise.resolve();
    for (var _chapterIdx = 0; _chapterIdx < TOTAL_CHAPTERS; _chapterIdx += 1) {
      (function (idx) {
        _generationQueue = _generationQueue.then(function (state) {
          if (state && state.aborted) return state;
          if (!_isGenerationRunActive(_runId)) return { aborted: true };
          if (chapterMsg) chapterMsg.textContent = LOADING_MSGS[idx] || '분석 중...';
          return _fetchChapter(idx, _runId).then(function (data) {
            if (!_isGenerationRunActive(_runId)) return { aborted: true };
            try {

            var _zbText = '';
            if (data && data.chapterJson && Array.isArray(data.chapterJson.sections)) {
              _zbText = data.chapterJson.sections
                .map(function (row) {
                  var title = String(row && (row.title || row.label) || '').trim();
                  var body = String(row && (row.body || row.content) || '').trim();
                  if (!body) return '';
                  return title ? ('## ' + title + '\n' + body) : body;
                })
                .filter(Boolean)
                .join('\n\n');
            }
            if (!_zbText && data && typeof data.text === 'string') {
              _zbText = data.text.trim();
            }

            var _expectedSectionCount = Array.isArray(CHAPTER_STRUCTURED_LABELS[idx + 1])
              ? CHAPTER_STRUCTURED_LABELS[idx + 1].length
              : 5;
            var _hasStructuredSections = !!(data && data.chapterJson && Array.isArray(data.chapterJson.sections) && data.chapterJson.sections.length >= _expectedSectionCount);
            var _hasUsableText = _zbText.length >= MIN_CHAPTER_CHARS;

            if (data && data.ok && (_hasStructuredSections || _hasUsableText)) {
              _syncChapterMetaFromResponse(idx, data);
              _chapters[idx] = _zbText;
              _chapterStructured[idx] = (Array.isArray(data.sections) && data.sections.length)
                ? { sections: data.sections }
                : (data.chapterJson && typeof data.chapterJson === 'object' ? data.chapterJson : null);
              _trace('CHAPTER_DATA_RECEIVED', { chapter: idx + 1, length: _zbText.length });
              _trace('SECTION_GENERATION_SUCCESS', {
                chapterId: 'ch_' + (idx + 1),
                categoryId: null,
                mode: 'personal',
                hasPayload: true,
                chapterCount: TOTAL_CHAPTERS,
                categoryCount: Array.isArray(CHAPTER_STRUCTURED_LABELS[idx + 1]) ? CHAPTER_STRUCTURED_LABELS[idx + 1].length : 0,
              });
              _setProgress(idx + 1);
              return { aborted: false };
            }

            _failCount += 1;
            var msg = (data && data.message) ? data.message : '알 수 없는 오류';
            var errorCode = (data && data.code) ? String(data.code) : 'UNKNOWN_ERROR';
            _trace('CHAPTER_DATA_FAILED', { chapter: idx + 1, message: msg, code: errorCode });
            _trace('SECTION_GENERATION_FALLBACK', {
              chapterId: 'ch_' + (idx + 1),
              categoryId: null,
              mode: 'personal',
              hasPayload: true,
              chapterCount: TOTAL_CHAPTERS,
              categoryCount: Array.isArray(CHAPTER_STRUCTURED_LABELS[idx + 1]) ? CHAPTER_STRUCTURED_LABELS[idx + 1].length : 0,
              errorCode: errorCode,
              message: msg,
            });
            console.error('[자미두수 PDF 생성] 섹션 생성 실패:', {
              chapter: idx + 1,
              code: errorCode,
              message: msg,
              hasChapterJson: !!(data && data.chapterJson),
              sectionCount: (data && data.chapterJson && Array.isArray(data.chapterJson.sections)) ? data.chapterJson.sections.length : 0,
              textLength: _zbText.length,
              responsePreview: _sanitizeDebugValue(data || null, 0, []),
            });
            _applyChapterFallback(idx, msg);
            _setProgress(idx + 1);
            return { aborted: false };
            } catch (chapterErr) {
              var fallbackReason = '챕터 처리 중 예외가 발생해 로컬 복구를 적용했습니다.';
              try {
                var chapterErrMsg = String(chapterErr && chapterErr.message ? chapterErr.message : chapterErr);
                if (chapterErrMsg) fallbackReason = chapterErrMsg;
              } catch (_) {}
              _trace('CHAPTER_RUNTIME_RECOVERED', {
                chapter: idx + 1,
                message: fallbackReason,
                code: 'CHAPTER_RUNTIME_EXCEPTION',
              });
              _applyChapterFallback(idx, fallbackReason);
              _setProgress(idx + 1);
              return { aborted: false };
            }
          });
        });
      })(_chapterIdx);
    }

    _generationQueue
      .then(function (state) {
        if (state && state.aborted) return;
        _finishGenerationSuccess();
      })
      .catch(function (failure) {
        try {
          for (var i = 0; i < TOTAL_CHAPTERS; i += 1) {
            if (typeof _chapters[i] === 'string' && _chapters[i].trim().length > 0) continue;
            _applyChapterFallback(i, '일시적 예외 복구로 기본 챕터를 생성했습니다.');
          }
          _setProgress(TOTAL_CHAPTERS);
          _trace('PDF_GENERATION_RECOVERED', {
            chapter: failure && failure.chapter ? failure.chapter : null,
            code: failure && failure.code ? failure.code : 'CHAPTER_DATA_FAILED',
            message: failure && failure.message ? failure.message : '알 수 없는 오류',
            failCount: _failCount,
          });
          _finishGenerationSuccess();
        } catch (_) {
          _finishGenerationFailure(
            '자미두수 PDF 본문 생성 중 일부 챕터가 완성되지 않았습니다. 결제는 중복 차감되지 않도록 보호되며, 다시 생성할 수 있습니다.',
            {
              chapter: failure && failure.chapter ? failure.chapter : null,
              code: failure && failure.code ? failure.code : 'CHAPTER_DATA_FAILED',
              message: failure && failure.message ? failure.message : '알 수 없는 오류',
              failCount: _failCount,
            }
          );
        }
      });
  };

  /* ─────────────── PDF 다운로드 ─────────────── */
  window.downloadZiweiBookPdf = function () {
    _trace('PDF_DOWNLOAD_REQUESTED', {});

    var _hasHtml2Canvas = typeof window.html2canvas === 'function';
    var _hasJsPdf = !!(window.jspdf && window.jspdf.jsPDF);
    _trace('LIB_CHECK', {
      html2canvas: _hasHtml2Canvas,
      jsPDF: _hasJsPdf
    });

    if (!_chapters.some(Boolean)) {
      _trace('FLOW_ABORT_NO_CHAPTERS_FOR_PDF', {});
      alert('먼저 자미두수 인생 총람을 생성해 주세요.');
      return;
    }
    var profile = window.__cdActiveBirthProfile || {};
    if (!profile.birth || !profile.birth.year) {
      _trace('FLOW_ABORT_PROFILE_INCOMPLETE_FOR_PDF', {
        hasBirth: !!profile.birth
      });
      alert('출생 정보가 부족하여 PDF를 만들 수 없습니다. 다시 시도해 주세요.');
      return;
    }

    var _validPdfChapterCount = _chapters.filter(function(c) {
      return typeof c === 'string' && c.trim().length >= 50;
    }).length;
    if (_validPdfChapterCount === 0) {
      _trace('FLOW_ABORT_PDF_DATA_EMPTY', {});
      alert('PDF로 내보낼 분석 데이터가 없습니다. 다시 생성해 주세요.');
      return;
    }

    var name = (profile.name || '사용자') + '님의 자미두수 인생 총람';
    var birth = profile.birth || {};
    var birthStr = [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + (birth.day ? '일' : '');
    var issued = new Date().toLocaleDateString('ko-KR');

    var bodyHtml = '';
      for (var i = 0; i < TOTAL_CHAPTERS; i++) {
      if (!_chapters[i]) continue;
      var _meta = _getChapterMeta(i);
      bodyHtml +=
        '<div class="chapter" style="page-break-before:' + (i > 0 ? 'always' : 'auto') + '">' +
        '<div class="chapter-header">' +
        '<span class="chapter-num">Chapter ' + (i + 1) + '</span>' +
        '<h2 class="chapter-title">' + _escHtml(_meta.title) + '</h2>' +
        '<p class="chapter-sub">' + _escHtml(_meta.subtitle) + '</p>' +
        '</div>' +
        '<div class="chapter-body">' + _md2html(_chapters[i]) + '</div>' +
        '</div>';
    }

    var fullHtml = '<!DOCTYPE html><html lang="ko"><head>' +
      '<meta charset="UTF-8">' +
      '<meta name="color-scheme" content="light">' +
      '<title>' + _escHtml(name) + '</title>' +
      '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Gowun+Dodum&display=swap");' +
      ':root{color-scheme:light;}' +
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a0a2e;background:#ffffff!important;color-scheme:light;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#060312 0%,#120828 50%,#060312 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:0.75rem;letter-spacing:0.2em;color:#c4b5fd;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:2.8rem;font-weight:700;margin:0 0 12px;color:#f5f0ff;letter-spacing:0.05em;}' +
      '.cover-subtitle{font-size:1.1rem;color:#a78bfa;margin:0 0 16px;}' +
      '.cover-deco-line{width:80px;height:1px;background:rgba(167,139,250,0.4);margin:0 auto 24px;}' +
      '.cover-name{font-size:1.6rem;color:#fde68a;margin:0 0 8px;}' +
      '.cover-info{font-size:0.9rem;color:#c9d4e0;margin:0 0 8px;}' +
      '.cover-deco{font-size:1.5rem;color:#7c3aed;letter-spacing:0.3em;margin-top:40px;}' +
      '.toc{padding:48px 56px;page-break-after:always;}' +
      '.toc-title{font-size:1.4rem;color:#4c0d9f;margin-bottom:32px;border-bottom:2px solid #7c3aed;padding-bottom:12px;}' +
      '.toc-item{display:flex;align-items:baseline;gap:8px;margin-bottom:16px;font-size:0.97rem;}' +
      '.toc-num{color:#7c3aed;font-weight:700;min-width:80px;}' +
      '.toc-main{color:#1e0a3c;}' +
      '.toc-sub{font-size:0.82rem;color:#6d28d9;margin-top:2px;}' +
      '.chapter{padding:52px 60px;}' +
      '.chapter-header{border-bottom:2px solid #ede9fe;margin-bottom:36px;padding-bottom:26px;}' +
      '.chapter-num{font-size:0.72rem;letter-spacing:0.25em;color:#7c3aed;text-transform:uppercase;display:block;margin-bottom:10px;}' +
      '.chapter-title{font-size:1.9rem;font-weight:700;color:#1e0a3c;margin:0 0 8px;}' +
      '.chapter-sub{font-size:0.95rem;color:#6d28d9;margin:0;}' +
      '.chapter-body{line-height:2.0;font-size:1.0rem;color:#2d1a4e;}' +
      '.zb-md-h1,.zb-md-h2{font-size:1.3rem;font-weight:700;color:#1e0a3c;margin:30px 0 13px;border-left:4px solid #7c3aed;padding:6px 12px;background:#f5f0ff;}' +
      '.zb-md-h3{font-size:1.1rem;font-weight:700;color:#312e81;margin:22px 0 9px;border-left:2px solid #a78bfa;padding-left:10px;}' +
      '.zb-md-h4{font-size:1rem;font-weight:700;color:#4c0d9f;margin:16px 0 6px;}' +
      '.zb-md-p{margin:0 0 16px;}' +
      '.zb-md-ul{margin:0 0 16px;padding-left:26px;}' +
      '.zb-md-li{margin-bottom:8px;line-height:1.8;}' +
      '.zb-md-hr{border:none;border-top:2px solid #ede9fe;margin:28px 0;}' +
      '.zb-md-blockquote{border-left:4px solid #c4a4ff;background:#f3eeff;padding:14px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#4c0d9f;font-style:italic;font-size:0.97rem;line-height:1.75;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.cover{min-height:auto;padding:80px 60px;}.chapter{padding:52px 60px;}}' +
      '</style></head><body>' +
      '<div class="cover">' +
      '<p class="cover-badge">✦ CODE DESTINY · 紫微斗數 · ZIWEI DOUSHU PREMIUM ✦</p>' +
      '<h1 class="cover-title">🌌 자미두수 인생 총람</h1>' +
      '<p class="cover-subtitle">紫微의 빛이 새긴 당신의 천명(天命) 완전판</p>' +
      '<div class="cover-deco-line"></div>' +
      '<h2 class="cover-name">' + _escHtml(profile.name || '사용자') + ' 님</h2>' +
      '<p class="cover-info">' + _escHtml(birthStr) + ' · ' + _escHtml(profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : '') + '</p>' +
      '<p class="cover-info">발행일: ' + _escHtml(issued) + '</p>' +
      '<div class="cover-deco">✦ ◈ ✦</div>' +
      '</div>' +
      '<div class="toc">' +
      '<h2 class="toc-title">목 차 (Table of Contents)</h2>' +
      _chapters.map(function (c, i) {
        if (!c) return '';
        var _meta = _getChapterMeta(i);
        return '<div class="toc-item">' +
          '<div><div style="display:flex;gap:8px;align-items:baseline"><span class="toc-num">Chapter ' + (i + 1) + '</span>' +
          '<span class="toc-main">' + _escHtml(_meta.title) + '</span></div>' +
          '<div style="padding-left:88px"><span class="toc-sub">' + _escHtml(_meta.subtitle) + '</span></div></div>' +
          '</div>';
      }).join('') +
      '</div>' +
      bodyHtml +
      '</body></html>';

    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      _trace('PDF_WINDOW_BLOCKED', {});
      alert('팝업이 차단되어 PDF 생성 창을 열 수 없습니다.\n브라우저 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    _trace('PDF_WINDOW_OPENED', { chapterCount: _validPdfChapterCount });
    try {
      alert('PDF 인쇄 창이 열렸습니다. 저장 또는 인쇄를 진행해 주세요.');
    } catch (_) {}
    setTimeout(function () { try { win.print(); } catch (_) {} }, 1200);
    _trace('PDF_PRINT_TRIGGERED', {});
  };

  /* ─────────────── 챕터별 PDF 다운로드 ─────────────── */
  window.downloadZiweiChapterPdf = function (ch) {
    var idx = ch - 1;
    if (!_chapters[idx]) {
      alert('Ch.' + ch + ' 이 챕터가 아직 생성되지 않았습니다.');
      return;
    }
    var _chapterMetaOne = _getChapterMeta(idx);
    var profile = window.__cdActiveBirthProfile || {};
    var birth = profile.birth || {};
    var issued = new Date().toLocaleDateString('ko-KR');
    var chapterHtml =
      '<div class="chapter">' +
      '<div class="chapter-header">' +
      '<span class="chapter-num">Chapter ' + ch + ' / ' + TOTAL_CHAPTERS + '</span>' +
      '<h2 class="chapter-title">' + _escHtml(_chapterMetaOne.title) + '</h2>' +
      '<p class="chapter-sub">' + _escHtml(_chapterMetaOne.subtitle) + '</p>' +
      '</div>' +
      '<div class="chapter-body">' + _md2html(_chapters[idx]) + '</div>' +
      '</div>';
    var fullHtml = '<!DOCTYPE html><html lang="ko"><head>' +
      '<meta charset="UTF-8">' +
      '<meta name="color-scheme" content="light">' +
      '<title>' + _escHtml(_chapterMetaOne.title) + '</title>' +
      '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Gowun+Dodum&display=swap");' +
      ':root{color-scheme:light;}' +
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a0a2e;background:#ffffff!important;color-scheme:light;margin:0;padding:0;}' +
      '.cover-line{background:linear-gradient(135deg,#060312,#120828);color:#fff;padding:28px 48px;display:flex;justify-content:space-between;align-items:center;}' +
      '.cover-line .cl-badge{font-size:0.7rem;letter-spacing:0.18em;color:#c4b5fd;text-transform:uppercase;}' +
      '.cover-line .cl-name{font-size:0.9rem;color:#fde68a;}' +
      '.cover-line .cl-issued{font-size:0.8rem;color:#c9d4e0;}' +
      '.chapter{padding:52px 60px;}' +
      '.chapter-header{border-bottom:2px solid #ede9fe;margin-bottom:36px;padding-bottom:26px;}' +
      '.chapter-num{font-size:0.72rem;letter-spacing:0.25em;color:#7c3aed;text-transform:uppercase;display:block;margin-bottom:10px;}' +
      '.chapter-title{font-size:1.9rem;font-weight:700;color:#1e0a3c;margin:0 0 8px;}' +
      '.chapter-sub{font-size:0.95rem;color:#6d28d9;margin:0;}' +
      '.chapter-body{line-height:2.0;font-size:1.0rem;color:#2d1a4e;}' +
      '.zb-md-h1,.zb-md-h2{font-size:1.3rem;font-weight:700;color:#1e0a3c;margin:30px 0 13px;border-left:4px solid #7c3aed;padding:6px 12px;background:#f5f0ff;}' +
      '.zb-md-h3{font-size:1.1rem;font-weight:700;color:#312e81;margin:22px 0 9px;border-left:2px solid #a78bfa;padding-left:10px;}' +
      '.zb-md-h4{font-size:1rem;font-weight:700;color:#4c0d9f;margin:16px 0 6px;}' +
      '.zb-md-p{margin:0 0 16px;}' +
      '.zb-md-ul{margin:0 0 16px;padding-left:26px;}' +
      '.zb-md-li{margin-bottom:8px;line-height:1.8;}' +
      '.zb-md-hr{border:none;border-top:2px solid #ede9fe;margin:28px 0;}' +
      '.zb-md-blockquote{border-left:4px solid #c4a4ff;background:#f3eeff;padding:14px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#4c0d9f;font-style:italic;font-size:0.97rem;line-height:1.75;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.chapter{padding:52px 60px;}}' +
      '</style></head><body>' +
      '<div class="cover-line">' +
      '<span class="cl-badge">✦ CODE DESTINY · 紫微斗數 · Chapter ' + ch + ' ✦</span>' +
      '<span class="cl-name">' + _escHtml(profile.name || '사용자') + ' 님 · ' + _escHtml([birth.year, birth.month, birth.day].filter(Boolean).join('.')) + '</span>' +
      '<span class="cl-issued">' + _escHtml(issued) + '</span>' +
      '</div>' +
      chapterHtml +
      '</body></html>';
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('팝업이 차단되어 PDF 생성 창을 열 수 없습니다.\n브라우저 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    setTimeout(function () { try { win.print(); } catch (_) {} }, 1200);
  };

  /* ─────────────── 이벤트 위임 ─────────────── */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'openZiweiBookModal') {
      window.openZiweiBookModal();
      return;
    }
    if (action === 'closeZiweiBookModal') {
      window.closeZiweiBookModal();
      return;
    }
    if (action === 'generateZiweiBook') {
      window.generateZiweiBook();
      return;
    }
    if (action === 'downloadZiweiBookPdf') {
      window.downloadZiweiBookPdf();
      return;
    }
    if (action === 'regenerateZiweiBook') {
      var prof = window.__cdActiveBirthProfile;
      if (prof) {
        try { localStorage.removeItem(_zbMakeKey(prof)); } catch(_){}
      }
      _cancelGeneration = true;
      _generationRunId += 1;
      _generating = false;
      _abortActiveRequest();
      _chapters = Array(TOTAL_CHAPTERS).fill(null);
      _chapterStructured = Array(TOTAL_CHAPTERS).fill(null);
      _chapterMeta = Array(TOTAL_CHAPTERS).fill(null);
      _showScreen('zbStartScreen');
      var epBanner = _qs('zbEpilogueBanner');
      if (epBanner) epBanner.style.display = 'none';
      return;
    }
  });

  // mobile-interaction-patch LAZY_LOAD_ACTIONS 호환: window.gotoZiweiPremium 래퍼
  window.gotoZiweiPremium = function() { window.openZiweiBookModal(); };

})();
