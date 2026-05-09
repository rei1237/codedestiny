/**
 * 연애 비책 v2 — 운명의 설계도
 * 사주 기반 AI 연애 전략 10챕터 리포트 + PDF 다운로드
 * CODE-DESTINY Premium
 */
(function () {
  'use strict';

  var LOVE_SECRET_MODE_CONFIG = {
    solo: {
      mode: 'solo',
      reportType: 'saju_love_solo',
      reportTitle: '프리미엄 사주 연애운 리포트',
      totalChapters: 10,
      minTotalChars: 45000,
      chapterMinDefault: 4000,
      chapterMinByIndex: { 1: 5000, 2: 5000, 3: 5500, 4: 4500, 5: 5500, 6: 4500, 7: 4500, 8: 4500, 9: 5500, 10: 5000 },
      price: 300,
      chapters: [
        { title: '💗 본연의 연애 자아', subtitle: '일간/월지/일지/오행/십성으로 읽는 관계 자아' },
        { title: '🌹 치명적 매력과 페로몬', subtitle: '도화/홍염/화개/역마가 만드는 매력 결' },
        { title: '🧲 운명의 상대방 리포트', subtitle: '배우자궁·배우자성·오행 보완으로 보는 이상형' },
        { title: '⚔️ 실전 연애 전략 및 스킬', subtitle: '식상·재성·관성·인성·비겁 기반 실전 대화법' },
        { title: '📅 시기별 연애운 흐름', subtitle: '대운·세운·월운 기반 Go/Hold/Retreat' },
        { title: '🌑 연애의 어두운 면과 위기 관리', subtitle: '기신 과열·오행 불균형의 위기 패턴' },
        { title: '🔥 친밀감과 육체적 매력', subtitle: '관계 온도와 친밀 리듬의 데이터 기반 해석' },
        { title: '📱 현대적 상황별 연애 비책', subtitle: '카톡/DM/썸/재회/장거리 실전 운영' },
        { title: '💍 결혼과 정착', subtitle: '배우자궁·배우자성·책임 구조로 보는 장기 안정성' },
        { title: '🧭 맞춤형 연애 개운 처방전', subtitle: '용신/희신 강화와 기신 절감의 7·30·90일 플랜' },
      ],
    },
    couple: {
      mode: 'couple',
      reportType: 'saju_love_couple',
      reportTitle: '프리미엄 사주 궁합 리포트',
      totalChapters: 10,
      minTotalChars: 60000,
      chapterMinDefault: 5500,
      chapterMinByIndex: { 1: 6000, 2: 6000, 3: 6500, 4: 5500, 5: 6500, 6: 5500, 7: 5500, 8: 5500, 9: 6500, 10: 6000 },
      price: 500,
      chapters: [
        { title: '💗 본연의 연애 자아', subtitle: '두 사람의 연애 자아와 수용 방식 비교' },
        { title: '🌹 치명적 매력과 페로몬', subtitle: '도화/홍염/화개/역마의 상호작용' },
        { title: '🧲 운명의 상대방 리포트', subtitle: '이상형 구조와 실제 상대 일치도' },
        { title: '⚔️ 실전 연애 전략 및 스킬', subtitle: '두 사람 명식에 맞춘 대화 운영 매뉴얼' },
        { title: '📅 시기별 연애운 흐름', subtitle: '대운·세운·월운 동시성 타이밍' },
        { title: '🌑 연애의 어두운 면과 위기 관리', subtitle: '충돌 버튼과 회복 프로토콜' },
        { title: '🔥 친밀감과 육체적 매력', subtitle: '관계 온도와 친밀 속도 조율' },
        { title: '📱 현대적 상황별 연애 비책', subtitle: '상황별 맞춤 소통/거리 전략' },
        { title: '💍 결혼과 정착', subtitle: '장기 안정성·역할 분담·생활 리듬' },
        { title: '🧭 맞춤형 연애 개운 처방전', subtitle: '공동 7·30·90일 관계 강화 플랜' },
      ],
    }
  };

  var LOADING_MSGS = [
    '일간(日干)의 연애 본능을 분석하는 중...',
    '도화살과 홍염살을 탐지하는 중...',
    '배우자궁(일지) 이상형을 프로파일링하는 중...',
    '밀당 전략과 공략 키워드를 구성하는 중...',
    '대운·세운 연애 타이밍을 계산하는 중...',
    '연애 리스크와 카르마를 분석하는 중...',
    '섹슈얼 에너지와 궁합을 해석하는 중...',
    '현대 연애 시나리오별 비책을 작성하는 중...',
    '결혼 최적 시기와 배우자 분석 중...',
    '개운 처방전을 완성하는 중...',
    '조후·십성·속궁합을 최종 해석하는 중...',
  ];

  var LS_LOVE_QUOTES = [
    '사주의 여덟 글자 속에는<br>당신이 사랑할 사람의 그림자가 담겨 있습니다',
    '사랑은 우연처럼 만나지만,<br>사주는 처음부터 알고 있었습니다',
    '일지(日支) 배우자궁에는<br>이미 운명의 상대가 새겨져 있습니다',
    '紅塵十丈<br>붉은 먼지 열 길의 세상에서도 인연은 반드시 만납니다',
    '용신(用神)이 강해지는 계절,<br>반드시 인연의 문이 열립니다',
    '합(合)이 있는 곳에 인연이 있고<br>충(沖)이 있는 곳에 열정이 있습니다',
    '木은 火를 기르듯,<br>진정한 사랑은 서로를 자라게 합니다',
    '도화살(桃花煞)은 꽃의 살이 아니라<br>사람을 끌어당기는 향기입니다',
    '두 사주가 만나면<br>그것은 우연이 아니라 오행의 끌림입니다',
    '천간(天干)은 마음을 보여주고<br>지지(地支)는 본성을 드러냅니다',
    '이별은 기신운(忌神運)이 만든 파도이고<br>재회는 용신운(用神運)이 여는 문입니다',
    '내 사주팔자가 당신을 기다리고 있었습니다<br>우리의 만남은 오행이 연출한 운명입니다',
    '사랑의 타이밍도 사주에 새겨져 있습니다<br>지금 당신의 연애 비책을 해독하는 중입니다',
    '조후(調候)가 맞으면,<br>두 사람 사이에 자연스러운 온기가 흐릅니다',
    '일주(日柱)가 합(合)을 이루는 순간<br>운명은 조용히 미소 짓습니다',
  ];

  var _currentMode = 'solo';
  var _reportType = 'saju_love_solo';
  var _totalChapters = 10;
  var _chapterDefs = LOVE_SECRET_MODE_CONFIG.solo.chapters.slice();
  var _chapters = Array(_totalChapters).fill(null);
  var _generating = false;
  var _quoteTimer = null;
  var _heartTimer = null;
  var _quoteIdx = 0;
  var _activeRequestController = null;
  var _cancelGeneration = false;
  var _reportJobId = '';
  var _inputHash = '';
  var _lastPartnerData = '';

  function _abortActiveRequest() {
    if (_activeRequestController) {
      try { _activeRequestController.abort(); } catch (_) {}
      _activeRequestController = null;
    }
  }

  function _roman(n) {
    var m = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return m[n] || String(n);
  }

  function _getModeConfig(mode) {
    return LOVE_SECRET_MODE_CONFIG[mode] || LOVE_SECRET_MODE_CONFIG.solo;
  }

  function _setMode(mode) {
    var cfg = _getModeConfig(mode);
    _currentMode = cfg.mode;
    _reportType = cfg.reportType;
    _totalChapters = cfg.totalChapters;
    _chapterDefs = cfg.chapters.slice();
    _chapters = Array(_totalChapters).fill(null);
  }

  function _chapterMinChars(ch) {
    var cfg = _getModeConfig(_currentMode);
    return Number((cfg.chapterMinByIndex && cfg.chapterMinByIndex[ch]) || cfg.chapterMinDefault || 4500);
  }

  function _fnv1a(input) {
    var str = String(input || '');
    var hash = 2166136261;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  function _buildInputHash(sajuData, partnerData, mode) {
    return _fnv1a(String(mode || '') + '|' + String(sajuData || '') + '|' + String(partnerData || ''));
  }

  function _jobStorageKey(mode, inputHash) {
    return 'ls_job_v3_' + String(mode || 'solo') + '_' + String(inputHash || 'na');
  }

  function _saveJobState(state) {
    try { localStorage.setItem(_jobStorageKey(state.mode, state.inputHash), JSON.stringify(state)); } catch (_) {}
  }

  function _loadJobState(mode, inputHash) {
    try {
      var raw = localStorage.getItem(_jobStorageKey(mode, inputHash));
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function _buildDynamicChapterUi() {
    var pills = _qs('lsLoadPills');
    if (pills) {
      var ph = '';
      for (var i = 1; i <= _totalChapters; i++) {
        ph += '<span class="ls-load-pill" data-ch="' + i + '">' + _roman(i) + '</span>';
      }
      pills.innerHTML = ph;
    }
    var toc = document.querySelector('.ls-toc');
    if (toc) {
      var th = '';
      for (var j = 1; j <= _totalChapters; j++) {
        th += '<button type="button" class="ls-toc-item' + (j === 1 ? ' active' : '') + '" data-ls-chapter="' + j + '">' + _roman(j) + '</button>';
      }
      toc.innerHTML = th;
    }
  }

  function _isSajuDataValid(sajuData) {
    var s = String(sajuData || '');
    if (!s || s.length < 120) return false;
    return /사주\s*원국|일주\(|오행\(|대운\(|일간\(|십성\(/.test(s);
  }

  function _ensureSajuDataForGeneration() {
    var data = _cachedSajuData || _collectSajuData();
    if (_isSajuDataValid(data)) {
      _cachedSajuData = data;
      return { sajuData: data, usedFallbackData: false, source: 'existing-result' };
    }

    var profile = window.__cdActiveBirthProfile || {};
    if (typeof window.computeProfileForModal === 'function' && profile && profile.birth && profile.birth.year) {
      try { window.computeProfileForModal(profile); } catch (_) {}
      var recomputed = _collectSajuData();
      if (_isSajuDataValid(recomputed)) {
        _cachedSajuData = recomputed;
        return { sajuData: recomputed, usedFallbackData: false, source: 'recomputed-profile' };
      }
    }

    var snapshotJson = '';
    try {
      if (window.__destinyFlowerSajuSnapshot) {
        snapshotJson = JSON.stringify(window.__destinyFlowerSajuSnapshot, null, 2);
      }
    } catch (_) {}
    if (snapshotJson && snapshotJson.length > 120) {
      var fromSnapshot = '【기존 사주 분석 스냅샷】\n' + snapshotJson;
      _cachedSajuData = fromSnapshot;
      return { sajuData: fromSnapshot, usedFallbackData: false, source: 'existing-snapshot' };
    }

    return {
      sajuData: '',
      usedFallbackData: true,
      error: '사주 원국 데이터가 부족합니다. 먼저 사주 분석을 다시 실행해 주세요.'
    };
  }

  /* ── localStorage 저장/복원 ──────────────────────────────── */
  var _STORE_VER = 'ls_v1_';

  function _makeKey(profile) {
    var b = (profile && profile.birth) || {};
    return _STORE_VER + (b.year || '0') + '_' + (b.month || '0') + '_' + (b.day || '0') + '_' + ((profile && profile.gender) || 'u');
  }

  function _saveResult(profile) {
    try {
      localStorage.setItem(_makeKey(profile), JSON.stringify({
        chapters: _chapters,
        mode: _currentMode,
        reportType: _reportType,
        totalChapters: _totalChapters,
        name: (profile && profile.name) || '사용자',
        birth: (profile && profile.birth) || {},
        gender: (profile && profile.gender) || '',
        savedAt: new Date().toISOString()
      }));
    } catch (e) { /* 용량 수 한 또는 일반 브라우저 제한 */ }
  }

  function _loadSaved(profile) {
    try {
      var raw = localStorage.getItem(_makeKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _clearSaved(profile) {
    try { localStorage.removeItem(_makeKey(profile)); } catch (e) {}
  }

  /* ── 결과 헤더 렌더 ───────────────────────────────────────── */
  function _renderResultHeader(name, birth, gender, savedDate, isNew) {
    var nameEl = document.getElementById('lsResultName');
    var dateEl = document.getElementById('lsResultDate');
    var cfg = _getModeConfig(_currentMode);
    if (nameEl) nameEl.textContent = '💕 ' + (name || '사용자') + '님의 ' + (cfg.reportTitle || '연애 비책');
    if (dateEl) {
      var b = birth || {};
      var dateStr = savedDate ? savedDate.toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR');
      var icon = isNew ? '🗓️ ' : '💾 ';
      var label = isNew ? '발행' : '저장';
      dateEl.textContent =
        [b.year, b.month, b.day].filter(Boolean).join('. ') +
        ' 생 · ' +
        (gender === 'F' ? '여성' : gender === 'M' ? '남성' : '') +
        ' · ' + icon + dateStr + ' ' + label;
    }
  }

  function _qs(id) { return document.getElementById(id); }

  function _buildApiCandidates(pathname) {
    var _path = String(pathname || '');
    if (_path.charAt(0) !== '/') _path = '/' + _path;
    var _bases = [
      '',
      (typeof window !== 'undefined' && window.__CD_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.location && window.location.origin) || ''
    ];
    var _seen = {};
    var _urls = [];
    for (var i = 0; i < _bases.length; i++) {
      var _base = String(_bases[i] || '').trim();
      var _url = _base ? (_base.replace(/\/+$/, '') + _path) : _path;
      if (_seen[_url]) continue;
      _seen[_url] = true;
      _urls.push(_url);
    }
    return _urls.length ? _urls : [_path];
  }

  function _escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _md2html(text) {
    if (!text) return '';
    var h = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    h = h.replace(/^#### (.+)$/gm, '<h4 class="ls-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3 class="ls-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="ls-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="ls-md-h1">$1</h1>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^---+$/gm, '<hr class="ls-md-hr">');
    h = h.replace(/^[*-] (.+)$/gm, '<li class="ls-md-li">$1</li>');
    h = h.replace(/(<li class="ls-md-li">[\s\S]*?<\/li>\n?)+/g, function (m) {
      return '<ul class="ls-md-ul">' + m + '</ul>';
    });
    var lines = h.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { result.push(''); continue; }
      if (/^<(h[1-4]|ul|li|hr)/.test(line) || /<\/(h[1-4]|ul|li|hr)>$/.test(line)) {
        result.push(line);
      } else {
        result.push('<p class="ls-md-p">' + line + '</p>');
      }
    }
    return result.join('\n');
  }

  function _collectSajuData() {
    var profile = window.__cdActiveBirthProfile || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var name = profile.name || snap.name || '사용자';
    var gender = profile.gender || snap.gender || '';
    var birth = profile.birth || snap.birth || {};
    var lines = [];
    lines.push('【분석 대상 정보】');
    lines.push('이름: ' + name);
    lines.push('성별: ' + (gender === 'F' ? '여성' : gender === 'M' ? '남성' : gender || '미상'));
    if (birth.year) {
      lines.push('생년월일: ' + birth.year + '년 ' + (birth.month || '') + '월 ' + (birth.day || '') + '일');
      lines.push('출생 시각: ' + (birth.hour !== undefined ? birth.hour + '시 ' : '') + (birth.minute !== undefined ? birth.minute + '분' : ''));
    }
    if (profile.location && profile.location.label) {
      lines.push('출생지: ' + profile.location.label);
    }
    var G = window.G_PILLARS;
    if (G) {
      lines.push('\n【사주 원국(四柱)】');
      if (G.y) lines.push('년주(年柱): ' + (G.y.g || '') + (G.y.j || '') + (G.y.gE ? ' [' + G.y.gE + '/' + G.y.jE + ']' : ''));
      if (G.m) lines.push('월주(月柱): ' + (G.m.g || '') + (G.m.j || '') + (G.m.gE ? ' [' + G.m.gE + '/' + G.m.jE + ']' : ''));
      if (G.d) lines.push('일주(日柱): ' + (G.d.g || '') + (G.d.j || '') + (G.d.gE ? ' [' + G.d.gE + '/' + G.d.jE + ']' : ''));
      if (G.h) lines.push('시주(時柱): ' + (G.h.g || '') + (G.h.j || '') + (G.h.gE ? ' [' + G.h.gE + '/' + G.h.jE + ']' : ''));
    }
    var analysis = snap.analysis || snap.saju || {};
    if (analysis.elementWeights) {
      var w = analysis.elementWeights;
      lines.push('\n【오행(五行) 분포】');
      lines.push('목(木):' + (w.wood || 0) + ' 화(火):' + (w.fire || 0) + ' 토(土):' + (w.earth || 0) + ' 금(金):' + (w.metal || 0) + ' 수(水):' + (w.water || 0));
    }
    if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
      lines.push('용신(用神): ' + analysis.yongshin_elements.join(', '));
    }
    if (analysis.dayStem) lines.push('일간(日干): ' + analysis.dayStem);
    if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label);
    if (analysis.johuType) lines.push('조후(調候): ' + analysis.johuType);
    if (analysis.isJong) lines.push('종격(從格): ' + (analysis.jongName || '종격'));
    var GP = window.G_POWER;
    if (GP) {
      if (GP.groups) {
        lines.push('\n【십성(十星) 분포】');
        var gk = Object.keys(GP.groups);
        for (var gi = 0; gi < gk.length; gi++) lines.push(gk[gi] + ': ' + GP.groups[gk[gi]]);
      }
      if (GP.yongshin) {
        lines.push('용신: ' + (Array.isArray(GP.yongshin) ? GP.yongshin.join(', ') : GP.yongshin));
      }
    }
    // ─── 신살(神殺) 계산 — 연애 비책에서 사용 가능한 핵심 신살만 명시 ───
    if (G && G.d) {
      var _ssDay = (G.d.g || '') + (G.d.j || '');
      var _ssJArr = [G.y && G.y.j, G.m && G.m.j, G.d.j, G.h && G.h.j];
      var _sinsalNames = [];
      // 홍염살 — 일주 기준 (甲午 丙寅 丁未 戊辰 庚戌 辛酉 壬子)
      var _ssHong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
      if (_ssHong.indexOf(_ssDay) >= 0) _sinsalNames.push('홍염살(紅艶殺)[일주 '+_ssDay+']');
      // 도화살 — 지지 子午卯酉
      var _ssTao = ['子','午','卯','酉'];
      var _taoPos = _ssJArr.filter(function(b){return b&&_ssTao.indexOf(b)>=0;});
      if (_taoPos.length > 0) _sinsalNames.push('도화살(桃花殺)');
      // 역마살 — 지지 寅申巳亥
      var _ssYem = ['寅','申','巳','亥'];
      var _yemPos = _ssJArr.filter(function(b){return b&&_ssYem.indexOf(b)>=0;});
      if (_yemPos.length > 0) _sinsalNames.push('역마살(驛馬殺)');
      // 화개살 — 지지 辰戌丑未
      var _ssHwa = ['辰','戌','丑','未'];
      var _hwaPos = _ssJArr.filter(function(b){return b&&_ssHwa.indexOf(b)>=0;});
      if (_hwaPos.length > 0) _sinsalNames.push('화개살(華蓋殺)');
      lines.push('\n【신살(神殺) 계산 결과 — 정확한 로직으로 도출】');
      if (_sinsalNames.length > 0) {
        lines.push('보유 신살: ' + _sinsalNames.join(', '));
      } else {
        lines.push('보유 신살: 없음 (주요 신살에 해당하지 않는 순수 오행 에너지의 사주)');
      }
      lines.push('※ 본 리포트는 도화/홍염/화개/역마 등 엔진 확인 신살만 사용합니다.');
    }
    var GD = window.G_DAEWUN || window.G_DAEUN;
    // G_DAEWUN 없으면 Solar 라이브러리로 직접 계산 (성별 방향 포함)
    if ((!GD || !GD.length) && birth.year && typeof Solar !== 'undefined') {
      try {
        var _dwSolar = Solar.fromYmdHms(birth.year, birth.month || 1, birth.day || 1, birth.hour || 12, birth.minute || 0, 0);
        var _dwBazi = _dwSolar.getLunar().getEightChar();
        var _dwGenderNum = (gender === 'M') ? 1 : 0;
        var _dwYun = _dwBazi.getYun(_dwGenderNum);
        var _dwList = _dwYun.getDaYun();
        GD = [];
        for (var _dwi = 1; _dwi < _dwList.length; _dwi++) {
          var _dw2 = _dwList[_dwi];
          var _gz2 = _dw2.getGanZhi ? _dw2.getGanZhi() : [];
          var _ag2 = _dw2.getStartAge ? _dw2.getStartAge() : 0;
          if (_gz2 && _gz2.length >= 2 && _ag2 > 0) {
            GD.push({age:_ag2, g:_gz2[0], j:_gz2[1]});
          }
        }
        if (GD.length > 0) window.G_DAEWUN = GD;
      } catch(_dwErr) { GD = null; }
    }
    if (GD && Array.isArray(GD) && GD.length) {
      lines.push('\n【대운(大運) 흐름 — 성별 방향 반영 (양남음녀 순행, 음남양녀 역행)】');
      lines.push('성별: ' + (gender === 'M' ? '남성' : '여성'));
      for (var di = 0; di < Math.min(GD.length, 10); di++) {
        var dw = GD[di];
        if (dw) lines.push((dw.age || '') + '세: ' + (dw.g || '') + (dw.j || '') + (dw.gE ? ' [' + dw.gE + ']' : ''));
      }
    }
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n현재 나이: ' + currentAge + '세 (만 ' + (currentAge - 1) + '세)');
    }
    return lines.join('\n');
  }

  function _collectPartnerData() {
    var section = _qs('lsPartnerSection');
    if (!section || !section.classList.contains('open')) return '';
    return '';
  }

  /* ── 전용 파트너 화면에서 데이터 수집 ─────────────────────── */
  function _collectPartnerScreenData() {
    var name = (_qs('lsPsName') || {}).value || '';
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    var hourEl = _qs('lsPsHour');
    var hourVal = hourEl ? hourEl.value : '';
    var gm = _qs('lsPsGenderM');
    var gf = _qs('lsPsGenderF');
    var genderCode = (gm && gm.classList.contains('active')) ? 'M' : (gf && gf.classList.contains('active')) ? 'F' : 'F';
    var genderLabel = genderCode === 'M' ? '남성' : '여성';

    if (!year || !month || !day) return '';

    var jiHourMap = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    var jiHourNames = ['자시(23-01시)', '축시(01-03시)', '인시(03-05시)', '묘시(05-07시)', '진시(07-09시)',
      '사시(09-11시)', '오시(11-13시)', '미시(13-15시)', '신시(15-17시)', '유시(17-19시)', '술시(19-21시)', '해시(21-23시)'];
    var hourIdx = (hourVal !== '') ? parseInt(hourVal, 10) : -1;
    var birthHour = (hourIdx >= 0 && hourIdx < 12) ? jiHourMap[hourIdx] : 12;
    var hourDisplay = (hourIdx >= 0) ? jiHourNames[hourIdx] : '미상';

    var lines = ['【상대방 정보】'];
    if (name) lines.push('이름: ' + name);
    lines.push('성별: ' + genderLabel);
    lines.push('생년월일: ' + year + '년 ' + month + '월 ' + day + '일');
    lines.push('출생 시각: ' + hourDisplay);

    if (typeof window.computeProfileForModal === 'function') {
      var partnerProfile = {
        name: name || '상대방',
        gender: genderCode,
        birth: { year: year, month: month, day: day, hour: birthHour, minute: 0, calType: 'solar' },
        location: { lat: 37.6, lng: 127.0, tz: 'Asia/Seoul', baseTzOffset: 9 }
      };
      try {
        window.computeProfileForModal(partnerProfile);
        var GP = window.G_PILLARS;
        var GW = window.G_POWER;
        var snap = window.__destinyFlowerSajuSnapshot || {};
        var analysis = snap.analysis || snap.saju || {};

        if (GP) {
          lines.push('\n【상대방 사주 원국(四柱)】');
          if (GP.y) lines.push('년주(年柱): ' + (GP.y.g || '') + (GP.y.j || '') + (GP.y.gE ? ' [' + GP.y.gE + '/' + GP.y.jE + ']' : ''));
          if (GP.m) lines.push('월주(月柱): ' + (GP.m.g || '') + (GP.m.j || '') + (GP.m.gE ? ' [' + GP.m.gE + '/' + GP.m.jE + ']' : ''));
          if (GP.d) lines.push('일주(日柱): ' + (GP.d.g || '') + (GP.d.j || '') + (GP.d.gE ? ' [' + GP.d.gE + '/' + GP.d.jE + ']' : ''));
          if (GP.h && hourIdx >= 0) lines.push('시주(時柱): ' + (GP.h.g || '') + (GP.h.j || '') + (GP.h.gE ? ' [' + GP.h.gE + '/' + GP.h.jE + ']' : ''));
        }
        if (analysis.elementWeights) {
          var w = analysis.elementWeights;
          lines.push('\n【상대방 오행(五行) 분포】');
          lines.push('목(木):' + (w.wood || 0) + ' 화(火):' + (w.fire || 0) + ' 토(土):' + (w.earth || 0) + ' 금(金):' + (w.metal || 0) + ' 수(水):' + (w.water || 0));
        }
        if (analysis.dayStem) lines.push('일간(日干): ' + analysis.dayStem);
        if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label);
        if (analysis.johuType) lines.push('조후(調候): ' + analysis.johuType);
        if (analysis.isJong) lines.push('종격(從格): ' + (analysis.jongName || '종격'));
        if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
          lines.push('용신(用神): ' + analysis.yongshin_elements.join(', '));
        }
        if (GW && GW.groups) {
          lines.push('\n【상대방 십성(十星) 분포】');
          var gk = Object.keys(GW.groups);
          for (var gi = 0; gi < gk.length; gi++) lines.push(gk[gi] + ': ' + GW.groups[gk[gi]]);
        }
      } catch (e) { /* 엔진 오류 시 기본 텍스트만 사용 */ } finally {
        var origProfile = window.__cdActiveBirthProfile;
        if (origProfile && origProfile.birth) {
          try { window.computeProfileForModal(origProfile); } catch (_) {}
        }
      }
    }
    return lines.join('\n');
  }

  /* ── 파트너 화면 실시간 사주 미리보기 ─────────────────────── */
  var _psPreviewTimer = null;
  function _schedulePartnerPreview() {
    clearTimeout(_psPreviewTimer);
    _psPreviewTimer = setTimeout(_renderPartnerPreview, 420);
  }

  function _renderPartnerPreview() {
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    var card = _qs('lsPsCard');
    var pillarsEl = _qs('lsPsPillars');
    var infoEl = _qs('lsPsInfo');

    if (!year || !month || !day || year < 1920 || year > 2020 || month < 1 || month > 12 || day < 1 || day > 31) {
      if (card) card.classList.remove('visible');
      var origP = window.__cdActiveBirthProfile;
      if (origP && origP.birth && typeof window.computeProfileForModal === 'function') {
        try { window.computeProfileForModal(origP); } catch (_) {}
      }
      return;
    }
    if (typeof window.computeProfileForModal !== 'function') return;

    var hourEl = _qs('lsPsHour');
    var hourIdx = (hourEl && hourEl.value !== '') ? parseInt(hourEl.value, 10) : -1;
    var jiHourMap = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    var birthHour = hourIdx >= 0 ? jiHourMap[hourIdx] : 12;
    var gm = _qs('lsPsGenderM');
    var genderCode = (gm && gm.classList.contains('active')) ? 'M' : 'F';

    try {
      window.computeProfileForModal({
        name: (_qs('lsPsName') || {}).value || '상대방',
        gender: genderCode,
        birth: { year: year, month: month, day: day, hour: birthHour, minute: 0, calType: 'solar' },
        location: { lat: 37.6, lng: 127.0, tz: 'Asia/Seoul', baseTzOffset: 9 }
      });

      var GP = window.G_PILLARS;
      if (GP && card && pillarsEl) {
        var LABELS = ['년주', '월주', '일주', '시주'];
        var KEYS = ['y', 'm', 'd', 'h'];
        var html = '';
        for (var i = 0; i < 4; i++) {
          var p = GP[KEYS[i]];
          if (i === 3 && hourIdx < 0) {
            html += '<div class="ls-pscreen__pillar-card ls-pscreen__pillar-card--dim">' +
              '<span class="ls-pscreen__pillar-lbl">' + LABELS[i] + '</span>' +
              '<span class="ls-pscreen__pillar-stem">?</span>' +
              '<span class="ls-pscreen__pillar-branch">?</span>' +
              '<span class="ls-pscreen__pillar-ten">시불명</span></div>';
            continue;
          }
          if (!p) continue;
          html += '<div class="ls-pscreen__pillar-card">' +
            '<span class="ls-pscreen__pillar-lbl">' + LABELS[i] + '</span>' +
            '<span class="ls-pscreen__pillar-stem">' + _escHtml(p.g || '') + '</span>' +
            '<span class="ls-pscreen__pillar-branch">' + _escHtml(p.j || '') + '</span>' +
            '<span class="ls-pscreen__pillar-ten">' + _escHtml(p.gE || '') + '</span>' +
            '</div>';
        }
        pillarsEl.innerHTML = html;

        var snap = window.__destinyFlowerSajuSnapshot || {};
        var an = snap.analysis || snap.saju || {};
        if (infoEl) {
          var parts = [];
          if (an.dayStem) parts.push('일간 ' + an.dayStem);
          if (an.power_label) parts.push(an.power_label);
          if (an.yongshin_elements && an.yongshin_elements.length) parts.push('용신 ' + an.yongshin_elements.join('·'));
          infoEl.textContent = parts.join(' · ');
        }
        card.classList.add('visible');
      }
    } catch (e) {
      if (card) card.classList.remove('visible');
    } finally {
      var orig = window.__cdActiveBirthProfile;
      if (orig && orig.birth) {
        try { window.computeProfileForModal(orig); } catch (_) {}
      }
    }
  }

  /* ── 파트너 화면 이벤트 바인딩 ───────────────────────────── */
  function _bindPartnerScreen() {
    // 성별 버튼
    var gm = _qs('lsPsGenderM');
    var gf = _qs('lsPsGenderF');
    if (gm) gm.addEventListener('click', function () {
      gm.classList.add('active'); gf && gf.classList.remove('active');
      _schedulePartnerPreview();
    });
    if (gf) gf.addEventListener('click', function () {
      gf.classList.add('active'); gm && gm.classList.remove('active');
      _schedulePartnerPreview();
    });
    // 생년월일·시각 실시간 미리보기
    ['lsPsYear', 'lsPsMonth', 'lsPsDay', 'lsPsHour'].forEach(function (id) {
      var el = _qs(id);
      if (el) el.addEventListener('input', _schedulePartnerPreview);
      if (el) el.addEventListener('change', _schedulePartnerPreview);
    });
    // 초기 상태 리셋
    var card = _qs('lsPsCard');
    if (card) card.classList.remove('visible');
    ['lsPsYear', 'lsPsMonth', 'lsPsDay', 'lsPsName'].forEach(function (id) {
      var el = _qs(id);
      if (el) el.value = '';
    });
    var hourEl = _qs('lsPsHour');
    if (hourEl) hourEl.selectedIndex = 0;
    if (gf) { gf.classList.add('active'); }
    if (gm) { gm.classList.remove('active'); }
  }

  function _bindPartnerSection() {
    // 레거시 호환 — 신규 화면에서는 사용 안 함
  }

  /* ── 로딩 애니메이션 ──────────────────────────────────────── */
  function _startLoadingAnimation() {
    _stopLoadingAnimation();
    _quoteIdx = Math.floor(Math.random() * LS_LOVE_QUOTES.length);
    var el = _qs('lsLoadQuoteText');
    if (el) el.innerHTML = LS_LOVE_QUOTES[_quoteIdx];
    _quoteTimer = setTimeout(_rotateQuote, 6000);
    _spawnHearts();
    _updateLoadPills(0);
  }

  function _stopLoadingAnimation() {
    clearTimeout(_quoteTimer);
    clearInterval(_heartTimer);
    _quoteTimer = null;
    _heartTimer = null;
    var bg = _qs('lsLoadBg');
    if (bg) bg.innerHTML = '';
  }

  function _rotateQuote() {
    var el = _qs('lsLoadQuoteText');
    if (!el) return;
    el.classList.add('ls-fade');
    _quoteTimer = setTimeout(function () {
      _quoteIdx = (_quoteIdx + 1) % LS_LOVE_QUOTES.length;
      el.innerHTML = LS_LOVE_QUOTES[_quoteIdx];
      el.classList.remove('ls-fade');
      _quoteTimer = setTimeout(_rotateQuote, 6000);
    }, 450);
  }

  function _spawnHearts() {
    var bg = _qs('lsLoadBg');
    if (!bg) return;
    var symbols = ['♡', '♥', '✦', '✿', '❋', '◈', '✸'];
    function _spawn() {
      var sp = document.createElement('span');
      sp.className = 'ls-load-heart';
      sp.setAttribute('aria-hidden', 'true');
      sp.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      sp.style.left = (5 + Math.random() * 90) + '%';
      var dur = 8 + Math.random() * 9;
      sp.style.fontSize = (0.55 + Math.random() * 0.65).toFixed(2) + 'rem';
      sp.style.animationDuration = dur + 's';
      sp.style.color = 'rgba(236,72,153,' + (0.12 + Math.random() * 0.25).toFixed(2) + ')';
      bg.appendChild(sp);
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, (dur + 0.3) * 1000);
    }
    _spawn();
    _heartTimer = setInterval(_spawn, 2000);
  }

  function _updateLoadPills(done) {
    var pills = document.querySelectorAll('.ls-load-pill');
    Array.prototype.forEach.call(pills, function (p, i) {
      p.classList.remove('done', 'active');
      if (i < done) {
        p.classList.add('done');
      } else if (i === done && done < _totalChapters) {
        p.classList.add('active');
      }
    });
  }

  function _showScreen(id) {
    var screens = ['lsStartScreen', 'lsPartnerScreen', 'lsLoadingScreen', 'lsResultScreen', 'lsErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  window.openLoveSecretModal = function () {
    var modal = _qs('loveSecretModal');
    if (!modal) return;
    var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
    // ★ 프로필 없으면 DOM 및 localStorage 운명 카드에서 복구 시도
    if (!hasData) {
      try {
        var _oLsDateEl = document.getElementById('birthDate');
        if (_oLsDateEl && _oLsDateEl.value) {
          var _oLsParts = _oLsDateEl.value.split('-');
          var _oLsY = Number(_oLsParts[0]), _oLsM = Number(_oLsParts[1]), _oLsD = Number(_oLsParts[2]);
          if (_oLsY && _oLsM && _oLsD) {
            var _oLsNameEl = document.getElementById('nameInput');
            var _oLsIsFemale = document.querySelector('#btnF.on') !== null;
            var _oLsHourEl = document.getElementById('birthHour');
            var _oLsMinEl = document.getElementById('birthMinute');
            var _oLsCountrySel = document.getElementById('birthCountry');
            var _oLsLocData = { label: '대한민국 (서울)', lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
            if (_oLsCountrySel && _oLsCountrySel.selectedIndex >= 0) {
              var _oLsOpt = _oLsCountrySel.options[_oLsCountrySel.selectedIndex];
              if (_oLsOpt) { _oLsLocData = { label: (_oLsOpt.textContent || _oLsOpt.text || '').trim(), lng: parseFloat(_oLsOpt.getAttribute('data-long') || '127.0'), lat: parseFloat(_oLsOpt.getAttribute('data-lat') || '37.6'), tz: _oLsOpt.value || 'Asia/Seoul', tzOffset: parseFloat(_oLsOpt.getAttribute('data-tz') || '9'), baseTzOffset: parseFloat(_oLsOpt.getAttribute('data-base-tz') || '9') }; }
            }
            window.__cdActiveBirthProfile = { name: (_oLsNameEl && _oLsNameEl.value.trim()) || '사용자', gender: _oLsIsFemale ? 'F' : 'M', birth: { year: _oLsY, month: _oLsM, day: _oLsD, hour: _oLsHourEl ? Number(_oLsHourEl.value) : 12, minute: _oLsMinEl ? Number(_oLsMinEl.value) : 0 }, location: _oLsLocData };
            hasData = true;
          }
        }
      } catch (_oLsDomE) {}
    }
    if (!hasData) {
      try {
        var _oLsDpNs = 'FORTUNE_APP_USER_PROFILES';
        var _oLsDpList = JSON.parse(localStorage.getItem(_oLsDpNs + '.list') || '[]');
        var _oLsDpCurrId = localStorage.getItem(_oLsDpNs + '.current');
        var _oLsDpMatch = (_oLsDpCurrId && _oLsDpList.find(function(p){return p.id===_oLsDpCurrId;})) || (_oLsDpList.length && _oLsDpList[0]) || null;
        if (_oLsDpMatch && _oLsDpMatch.birth && _oLsDpMatch.birth.year) {
          window.__cdActiveBirthProfile = _oLsDpMatch;
          hasData = true;
        }
      } catch (_oLsDpE) {}
    }
    if (!hasData) {
      var _oLsFormEl = document.getElementById('birthDate') || document.getElementById('run-btn');
      if (_oLsFormEl) { try { _oLsFormEl.scrollIntoView({behavior:'smooth',block:'center'}); } catch(_){} }
      alert('💕 연애 비책을 생성하려면 생년월일 · 출생 시간을 입력하고 "사주 분석 시작"을 눌러주세요.');
      return;
    }
    _setMode('solo');
    _buildDynamicChapterUi();
    _showScreen('lsStartScreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.ls-modal__close');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    } catch (_) {}
  };

  window.closeLoveSecretModal = function () {
    var modal = _qs('loveSecretModal');
    if (!modal) return;
    _cancelGeneration = true;
    _generating = false;
    _abortActiveRequest();
    _stopLoadingAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  function _bindToc() {
    var nav = document.querySelector('.ls-toc');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ls-chapter]');
      if (!btn) return;
      var ch = Number(btn.getAttribute('data-ls-chapter'));
      if (!ch || !_chapters[ch - 1]) return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.ls-toc-item'), function (b) {
        b.classList.toggle('active', b === btn);
        b.classList.toggle('loaded', !!_chapters[Number(b.getAttribute('data-ls-chapter')) - 1]);
      });
    });
  }

  function _renderChapter(ch) {
    var content = _qs('lsChapterContent');
    if (!content) return;
    var idx = ch - 1;
    var data = _chapters[idx];
    if (!data) {
      content.innerHTML = '<p class="ls-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';
      return;
    }
    content.innerHTML =
      '<div class="ls-chapter-wrap">' +
      '<div class="ls-chapter-header">' +
      '<span class="ls-chapter-num">Chapter ' + ch + '</span>' +
      '<h2 class="ls-chapter-title">' + _escHtml((_chapterDefs[idx] && _chapterDefs[idx].title) || ('Chapter ' + ch)) + '</h2>' +
      '<p class="ls-chapter-sub">' + _escHtml((_chapterDefs[idx] && _chapterDefs[idx].subtitle) || '') + '</p>' +
      '</div>' +
      '<div class="ls-chapter-body">' + _md2html(data) + '</div>' +
      '</div>';
    content.scrollTop = 0;
  }

  function _updateTocState() {
    var items = document.querySelectorAll('.ls-toc-item');
    Array.prototype.forEach.call(items, function (btn) {
      var ch = Number(btn.getAttribute('data-ls-chapter'));
      btn.classList.toggle('loaded', !!_chapters[ch - 1]);
      btn.classList.toggle('active', ch === 1);
    });
  }

  /* ── 모듈 레벨 사주 데이터 저장 ───────────────────────────── */
  var _cachedSajuData = '';

    window.generateLoveSecret = function () {
    if (_generating) return;
    // 프로필 복구: __cdActiveBirthProfile 없으면 localStorage DP에서 시도
    if (!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year)) {
      try {
        var _glsDpNs = 'FORTUNE_APP_USER_PROFILES';
        var _glsDpList = JSON.parse(localStorage.getItem(_glsDpNs + '.list') || '[]');
        var _glsDpCurrId = localStorage.getItem(_glsDpNs + '.current');
        var _glsDpMatch = (_glsDpCurrId && _glsDpList.find(function(p){return p.id===_glsDpCurrId;})) || (_glsDpList.length && _glsDpList[0]) || null;
        if (_glsDpMatch && _glsDpMatch.birth && _glsDpMatch.birth.year) { window.__cdActiveBirthProfile = _glsDpMatch; }
      } catch (_glsDpE) {}
    }
    var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
    if (!hasData) { alert('사주 계산을 먼저 완료해 주세요.'); return; }
    // 사주 분석 화면과 100% 일치하도록 G_PILLARS 등 전역 변수 재계산
    if (typeof window.computeProfileForModal === 'function' && window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth) {
      try { window.computeProfileForModal(window.__cdActiveBirthProfile); } catch (_cpE) {}
    }
    _cachedSajuData = _collectSajuData();
    _setMode('solo');
    _buildDynamicChapterUi();
    _showScreen('lsPartnerScreen');
    _bindPartnerScreen();
  };

  function _syncUserPoints(payload) {
    try {
      var points = Number(payload && (payload.remainingPoints != null ? payload.remainingPoints : (payload.user && payload.user.points)));
      if (isNaN(points)) return;
      var raw = localStorage.getItem('fortune_auth_user');
      if (!raw) return;
      var user = JSON.parse(raw);
      user.points = points;
      localStorage.setItem('fortune_auth_user', JSON.stringify(user));
    } catch (_) {}
  }

  function _consumePointsForMode(mode, inputHash, reportJobId) {
    var cfg = _getModeConfig(mode);
    var requestId = 'love-secret:' + mode + ':' + inputHash;
    var featureKey = 'premium-love-secret-' + mode;
    var endpoints = _buildApiCandidates('/api/fortune/pig-coin/consume');

    return new Promise(function (resolve) {
      function run(at) {
        if (at >= endpoints.length) {
          resolve({ ok: false, message: '코인 차감 API 호출에 실패했습니다.' });
          return;
        }
        fetch(endpoints[at], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cost: cfg.price,
            reason: mode === 'couple' ? '사주 프리미엄 궁합 리포트 생성' : '사주 프리미엄 연애운 리포트 생성',
            featureKey: featureKey,
            forceDeduct: true,
            requestId: requestId,
            inputHash: inputHash,
            reportJobId: reportJobId
          })
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) {
              resolve({ ok: false, message: String((data && data.message) || ('HTTP ' + res.status)) });
              return;
            }
            _syncUserPoints(data);
            try {
              if (data && data.transactionId) {
                sessionStorage.setItem('cd_premium_tx_love-secret-' + mode, String(data.transactionId));
              }
            } catch (_) {}
            resolve({ ok: true, data: data });
          });
        }).catch(function () {
          run(at + 1);
        });
      }
      run(0);
    });
  }

  function _prepareJob(mode, sajuData, partnerData) {
    var inputHash = _buildInputHash(sajuData, partnerData, mode);
    var state = _loadJobState(mode, inputHash);
    if (state && Array.isArray(state.chapters) && state.chapters.length === _getModeConfig(mode).totalChapters) {
      return state;
    }
    var newState = {
      mode: mode,
      reportType: _getModeConfig(mode).reportType,
      inputHash: inputHash,
      reportJobId: 'lsjob-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
      totalChapters: _getModeConfig(mode).totalChapters,
      minTotalChars: _getModeConfig(mode).minTotalChars,
      chapters: Array(_getModeConfig(mode).totalChapters).fill(null),
      charged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    _saveJobState(newState);
    return newState;
  }

  window.lsStartWithPartner = function () {
    if (_generating) return;
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    if (!year || !month || !day) {
      var yearEl = _qs('lsPsYear');
      if (yearEl) {
        yearEl.focus();
        yearEl.style.borderColor = 'rgba(239,68,68,0.8)';
        setTimeout(function () { yearEl.style.borderColor = ''; }, 2000);
      }
      return;
    }
    var sajuState = _ensureSajuDataForGeneration();
    var sajuData = sajuState.sajuData;
    if (!sajuData) {
      window.alert(sajuState.error || '사주 원국 데이터가 부족합니다. 먼저 사주 분석을 다시 실행해 주세요.');
      return;
    }
    var partnerData = _collectPartnerScreenData();
    var mode = 'couple';
    _setMode(mode);
    _buildDynamicChapterUi();
    var job = _prepareJob(mode, sajuData, partnerData);
    _consumePointsForMode(mode, job.inputHash, job.reportJobId).then(function (r) {
      if (!r.ok) {
        window.alert(r.message || '코인 차감에 실패했습니다.');
        return;
      }
      job.charged = true;
      job.updatedAt = new Date().toISOString();
      _saveJobState(job);
      _startGeneration(partnerData, job);
    });
  };

  window.lsSkipPartner = function () {
    if (_generating) return;
    var sajuState = _ensureSajuDataForGeneration();
    var sajuData = sajuState.sajuData;
    if (!sajuData) {
      window.alert(sajuState.error || '사주 원국 데이터가 부족합니다. 먼저 사주 분석을 다시 실행해 주세요.');
      return;
    }
    var mode = 'solo';
    _setMode(mode);
    _buildDynamicChapterUi();
    var job = _prepareJob(mode, sajuData, '');
    _consumePointsForMode(mode, job.inputHash, job.reportJobId).then(function (r) {
      if (!r.ok) {
        window.alert(r.message || '코인 차감에 실패했습니다.');
        return;
      }
      job.charged = true;
      job.updatedAt = new Date().toISOString();
      _saveJobState(job);
      _startGeneration('', job);
    });
  };

  function _startGeneration(partnerData, jobState) {
    _generating = true;
    _cancelGeneration = false;
    _lastPartnerData = partnerData || '';
    _reportJobId = String((jobState && jobState.reportJobId) || '');
    _inputHash = String((jobState && jobState.inputHash) || '');
    _showScreen('lsLoadingScreen');
    _startLoadingAnimation();
    var sajuState = _ensureSajuDataForGeneration();
    var sajuData = sajuState.sajuData;
    if (!sajuData) {
      _generating = false;
      _stopLoadingAnimation();
      _showScreen('lsErrorScreen');
      var preErr = _qs('lsErrorMessage');
      if (preErr) preErr.textContent = sajuState.error || '사주 원국 데이터가 부족합니다. 먼저 사주 분석을 다시 실행해 주세요.';
      return;
    }
    var progressBar = _qs('lsProgressBar');
    var progressText = _qs('lsProgressText');
    var chapterMsg = _qs('lsLoadingChapter');
    if (jobState && Array.isArray(jobState.chapters) && jobState.chapters.length === _totalChapters) {
      _chapters = jobState.chapters.slice();
    }

    function _setProgress(done) {
      var pct = (done / _totalChapters) * 100;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / ' + _totalChapters + ' 챕터 완성';
      if (chapterMsg && done < _totalChapters) chapterMsg.textContent = LOADING_MSGS[Math.min(done, LOADING_MSGS.length - 1)] || '분석 중...';
      if (chapterMsg && done >= _totalChapters) chapterMsg.textContent = '모든 챕터가 완성되었습니다 💕';
      _updateLoadPills(done);
    }
    var startIdx = 0;
    for (var si = 0; si < _chapters.length; si++) {
      if (!_chapters[si]) { startIdx = si; break; }
      if (si === _chapters.length - 1) startIdx = _chapters.length;
    }
    _setProgress(startIdx);
    var lsTitle = _qs('lsLoadingTitle');
    if (lsTitle) {
      lsTitle.textContent = partnerData
        ? '두 사람의 궁합과 연애 비책을 집필하는 중입니다'
        : '연애 비책을 집필하는 중입니다';
    }

    var _premiumReportSessionId = '';

    function _buildLoveSecretChapterPayload(idx) {
      var _profile = window.__cdActiveBirthProfile || {};
      var _birth = _profile.birth || {};
      return {
        sessionId: idx + 1,
        chapter: idx + 1,
        totalChapters: _totalChapters,
        mode: _currentMode,
        reportType: _reportType,
        reportId: _reportJobId,
        reportJobId: _reportJobId,
        inputHash: _inputHash,
        sajuData: sajuData,
        partnerData: partnerData || '',
        previousChapterTexts: _chapters.slice(0, idx).filter(function (v) { return typeof v === 'string' && v.trim(); }),
        name: String(_profile.name || ''),
        gender: String(_profile.gender || ''),
        year: Number(_birth.year || 0),
        month: Number(_birth.month || 0),
        day: Number(_birth.day || 0),
        hour: Number(_birth.hour || 12),
        minute: Number(_birth.minute || 0),
        birthYear: Number(_birth.year || 0),
        birthMonth: Number(_birth.month || 0),
        birthDay: Number(_birth.day || 0),
        birthHour: Number(_birth.hour || 12),
        birthMinute: Number(_birth.minute || 0)
      };
    }

    function _ensurePremiumReportSession() {
      if (_premiumReportSessionId) {
        return Promise.resolve({ ok: true, reportSessionId: _premiumReportSessionId });
      }
      if (typeof window.__cdPremiumAuthJson !== 'function') {
        return Promise.resolve({ ok: false, code: 'AUTH_HELPER_MISSING', message: '인증 모듈을 초기화하지 못했습니다.' });
      }
      return window.__cdPremiumAuthJson('/api/premium-report/prepare', {
        featureType: 'saju_love_secret',
        reportType: 'loveSecret',
        requestBody: _buildLoveSecretChapterPayload(0)
      }).then(function(prepared) {
        if (prepared && prepared.ok && prepared.reportSessionId) {
          _premiumReportSessionId = String(prepared.reportSessionId);
          return prepared;
        }
        return prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' };
      });
    }

    function _fetchChapter(idx) {
      return new Promise(function (resolve) {
        var _settled = false;
        var _abortMsg = '응답 시간 초과 (45초). 네트워크 상태를 확인해 주세요.';
        var _lastMsg = '';
        var _maxAttempts = 3;

        function _done(payload) {
          if (_settled) return;
          _settled = true;
          _abortActiveRequest();
          resolve(payload);
        }

        function _runAttempt(at) {
          if (_cancelGeneration) {
            _done({ ok: false, message: '사용자가 생성을 중단했습니다.' });
            return;
          }
          if (at >= _maxAttempts) {
            _done({ ok: false, message: _lastMsg || '모든 API 엔드포인트 시도에 실패했습니다.' });
            return;
          }
          var timeoutId = setTimeout(function () {
            _lastMsg = _abortMsg;
            _runAttempt(at + 1);
          }, 45000);

          _ensurePremiumReportSession().then(function(prepared) {
            if (!prepared || !prepared.ok || !_premiumReportSessionId) {
              clearTimeout(timeoutId);
              _done(prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' });
              return;
            }
            if (typeof window.__cdPremiumAuthJson !== 'function') {
              clearTimeout(timeoutId);
              _done({ ok: false, code: 'AUTH_HELPER_MISSING', message: '인증 모듈을 초기화하지 못했습니다.' });
              return;
            }

            window.__cdPremiumAuthJson('/api/premium-report/chapter', {
              reportSessionId: _premiumReportSessionId,
              chapterId: idx + 1
            }).then(function(data) {
              clearTimeout(timeoutId);
              if (data && data.ok && String(data.text || '').length >= _chapterMinChars(idx + 1)) {
                _done(data);
                return;
              }
              if (data && Number(data.status || 0) === 401) {
                _done(data);
                return;
              }
              _lastMsg = (data && data.message) ? data.message : '분량 또는 응답 기준을 충족하지 못했습니다.';
              _runAttempt(at + 1);
            }).catch(function(err) {
              clearTimeout(timeoutId);
              _lastMsg = String(err && err.message ? err.message : err);
              _runAttempt(at + 1);
            });
          }).catch(function(err) {
            clearTimeout(timeoutId);
            _lastMsg = String(err && err.message ? err.message : err);
            _runAttempt(at + 1);
          });
        }

        _runAttempt(0);
      });
    }

    (function generateNext(idx) {
      if (_cancelGeneration) return;
      if (idx >= _totalChapters) {
        var totalChars = 0;
        var validCount = 0;
        for (var ci = 0; ci < _chapters.length; ci++) {
          var chapterText = String(_chapters[ci] || '').trim();
          totalChars += chapterText.length;
          if (chapterText.length >= _chapterMinChars(ci + 1) && !/^⚠️/.test(chapterText)) {
            validCount += 1;
          }
        }
        if (validCount < _totalChapters) {
          _generating = false;
          _stopLoadingAnimation();
          _showScreen('lsErrorScreen');
          var validErr = _qs('lsErrorMessage');
          if (validErr) validErr.textContent = '모든 챕터가 완성되지 않았습니다. 전체 챕터를 다시 생성해 주세요. (' + validCount + '/' + _totalChapters + ')';
          return;
        }
        var requiredTotal = Number(_getModeConfig(_currentMode).minTotalChars || 0);
        if (totalChars < requiredTotal) {
          _generating = false;
          _stopLoadingAnimation();
          _showScreen('lsErrorScreen');
          var err = _qs('lsErrorMessage');
          if (err) err.textContent = '최소 분량 기준을 충족하지 못했습니다. 다시 시도해 주세요. (' + totalChars + '/' + requiredTotal + ')';
          return;
        }
        _generating = false;
        _stopLoadingAnimation();
        _showScreen('lsResultScreen');
        _updateTocState();
        _renderChapter(1);
        _bindToc();
        var profile = window.__cdActiveBirthProfile || {};
        _saveResult(profile);
        _renderResultHeader(profile.name, profile.birth, profile.gender, new Date(), true);
        return;
      }
      if (chapterMsg) chapterMsg.textContent = LOADING_MSGS[idx] || '분석 중...';
      _fetchChapter(idx).then(function (data) {
          if (data && Number(data.status || 0) === 401) {
            _generating = false;
            _stopLoadingAnimation();
            _showScreen('lsErrorScreen');
            var authErr = _qs('lsErrorMessage');
            if (authErr) authErr.textContent = '로그인 세션이 만료되어 리포트 생성을 중단했습니다. 다시 로그인 후 재시도해 주세요.';
            if (typeof window.__cdOpenLoginRequiredModal === 'function') {
              window.__cdOpenLoginRequiredModal({ reason: '프리미엄 리포트 생성 중 세션이 만료되었습니다.' });
            }
            return;
          }
          if (_cancelGeneration) return;
          _chapters[idx] = (data && data.ok && data.text)
            ? data.text
            : '⚠️ 이 챕터의 분석을 불러오는 데 실패했습니다.\n\n' + (data && data.message ? data.message : '알 수 없는 오류');
          if (jobState && Array.isArray(jobState.chapters)) {
            jobState.chapters[idx] = _chapters[idx];
            jobState.updatedAt = new Date().toISOString();
            _saveJobState(jobState);
          }
          _setProgress(idx + 1);
          generateNext(idx + 1);
        })
        .catch(function (err) {
          _chapters[idx] = '⚠️ 네트워크 오류로 이 챕터를 불러오지 못했습니다.\n' + String(err && err.message ? err.message : err);
          _setProgress(idx + 1);
          generateNext(idx + 1);
        });
    })(startIdx);
  }

  window.downloadLoveSecretPdf = function () {
    if (!_chapters.some(Boolean)) { alert('먼저 연애 비책을 생성해 주세요.'); return; }
    var profile = window.__cdActiveBirthProfile || {};
    var birth = profile.birth || {};
    var birthStr = birth.year
      ? birth.year + '년 ' + (birth.month || '') + '월 ' + (birth.day || '') + '일'
      : '';
    var genderStr = profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : '';
    var issued = new Date().toLocaleDateString('ko-KR');
    var bodyHtml = '';
    for (var i = 0; i < _totalChapters; i++) {
      if (!_chapters[i]) continue;
      bodyHtml +=
        '<div class="chapter" style="page-break-before:' + (i > 0 ? 'always' : 'auto') + '">' +
        '<div class="chapter-header">' +
        '<span class="chapter-num">Chapter ' + (i + 1) + '</span>' +
        '<h2 class="chapter-title">' + _escHtml((_chapterDefs[i] && _chapterDefs[i].title) || ('Chapter ' + (i + 1))) + '</h2>' +
        '<p class="chapter-sub">' + _escHtml((_chapterDefs[i] && _chapterDefs[i].subtitle) || '') + '</p>' +
        '</div>' +
        '<div class="chapter-body">' + _md2html(_chapters[i]) + '</div>' +
        '</div>';
    }

    var tocHtml = _chapters.map(function (c, i) {
      if (!c) return '';
      return '<div class="toc-item"><span class="toc-num">Chapter ' + (i + 1) + '</span><span class="toc-text">' + _escHtml((_chapterDefs[i] && _chapterDefs[i].title) || ('Chapter ' + (i + 1))) + '</span></div>';
    }).join('');

    var isCouple = _currentMode === 'couple';
    var coverGradient = isCouple
      ? 'linear-gradient(135deg,#17070e 0%,#3b0f24 52%,#071225 100%)'
      : 'linear-gradient(135deg,#2b0b1f 0%,#6a1038 48%,#f5e9de 100%)';
    var accent = isCouple ? '#d4af37' : '#ec4899';
    var summaryBlocks =
      '<div class="chapter" style="page-break-before:always">' +
      '<div class="chapter-header"><span class="chapter-num">Data Summary</span><h2 class="chapter-title">엔진 데이터 요약</h2><p class="chapter-sub">사주 엔진 계산값 기반 요약표</p></div>' +
      '<div class="chapter-body">' +
      '<h3 class="ls-md-h3">기본 명식/오행 데이터</h3><p class="ls-md-p">' + _escHtml((_cachedSajuData || '').slice(0, 3500)).replace(/\n/g, '<br>') + '</p>' +
      (isCouple ? ('<h3 class="ls-md-h3">상대 명식/궁합 데이터</h3><p class="ls-md-p">' + _escHtml((_lastPartnerData || '').slice(0, 2500)).replace(/\n/g, '<br>') + '</p>') : '') +
      '</div></div>';

    var fullHtml = '<!DOCTYPE html><html lang="ko"><head>' +
      '<meta charset="UTF-8">' +
      '<title>' + _escHtml((profile.name || '사용자') + '님의 ' + (_getModeConfig(_currentMode).reportTitle || '연애 비책')) + '</title>' +
      '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Gowun+Dodum&display=swap");' +
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a0a1e;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:' + coverGradient + ';color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:.75rem;letter-spacing:.2em;color:#f9a8d4;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:3rem;font-weight:700;margin:0 0 12px;color:#fce7f3;letter-spacing:.05em;}' +
      '.cover-subtitle{font-size:1.1rem;color:#f472b6;margin:0 0 32px;}' +
      '.cover-name{font-size:1.7rem;color:#fde68a;margin:0 0 8px;}' +
      '.cover-info{font-size:.9rem;color:#fbb6ce;margin:0 0 10px;}' +
      '.cover-deco{font-size:1.5rem;color:#ec4899;letter-spacing:.3em;margin-top:32px;}' +
      '.toc{padding:48px 56px;page-break-after:always;}' +
      '.toc-title{font-size:1.4rem;color:#9d174d;margin-bottom:32px;border-bottom:2px solid ' + accent + ';padding-bottom:12px;}' +
      '.toc-item{display:flex;align-items:baseline;gap:8px;margin-bottom:16px;font-size:1rem;}' +
      '.toc-num{color:' + accent + ';font-weight:700;min-width:80px;}' +
      '.toc-text{color:#4a0030;}' +
      '.chapter{padding:48px 56px;}' +
      '.chapter-header{border-bottom:1px solid #fce7f3;margin-bottom:32px;padding-bottom:24px;}' +
      '.chapter-num{font-size:.75rem;letter-spacing:.2em;color:#ec4899;text-transform:uppercase;display:block;margin-bottom:8px;}' +
      '.chapter-title{font-size:1.8rem;font-weight:700;color:#4a0030;margin:0 0 8px;}' +
      '.chapter-sub{font-size:.95rem;color:#be185d;margin:0;}' +
      '.chapter-body{line-height:1.9;font-size:.98rem;color:#2d1a2e;}' +
      '.ls-md-h1,.ls-md-h2{font-size:1.3rem;font-weight:700;color:#4a0030;margin:28px 0 12px;border-left:4px solid #ec4899;padding-left:12px;}' +
      '.ls-md-h3{font-size:1.1rem;font-weight:700;color:#831843;margin:20px 0 8px;}' +
      '.ls-md-h4{font-size:1rem;font-weight:700;color:#9d174d;margin:16px 0 6px;}' +
      '.ls-md-p{margin:0 0 14px;line-height:1.9;}' +
      '.ls-md-ul{margin:0 0 14px;padding-left:24px;}' +
      '.ls-md-li{margin-bottom:6px;line-height:1.7;}' +
      '.ls-md-hr{border:none;border-top:1px solid #fce7f3;margin:24px 0;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.cover{min-height:auto;padding:60px 40px;}}' +
      '</style></head><body>' +
      '<div class="cover">' +
      '<p class="cover-badge">✦ CODE DESTINY · 연애 비책 — 운명의 설계도 ✦</p>' +
      '<h1 class="cover-title">💕 연애 비책</h1>' +
      '<p class="cover-subtitle">運命이 설계한 사랑의 지도</p>' +
      '<h2 class="cover-name">' + _escHtml(profile.name || '사용자') + ' 님</h2>' +
      '<p class="cover-info">' + _escHtml(birthStr) + (genderStr ? ' · ' + _escHtml(genderStr) : '') + '</p>' +
      '<p class="cover-info">발행일: ' + _escHtml(issued) + '</p>' +
      '<div class="cover-deco">♡ ◈ ♡</div>' +
      '</div>' +
      '<div class="toc"><h2 class="toc-title">목 차 (Table of Contents)</h2>' + tocHtml + '</div>' +
      summaryBlocks + bodyHtml +
      '</body></html>';

    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var win = window.open(url, '_blank');
    if (win) {
      win.onload = function () {
        setTimeout(function () { win.print(); }, 600);
      };
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  };

  /* ── 클릭 핸들러 (data-action 디스패치) ──────────────────── */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'openLoveSecretModal')  { window.openLoveSecretModal();  return; }
    if (action === 'closeLoveSecretModal') { window.closeLoveSecretModal(); return; }
    if (action === 'generateLoveSecret')  { window.generateLoveSecret();  return; }
    if (action === 'lsStartWithPartner')  { window.lsStartWithPartner();  return; }
    if (action === 'lsSkipPartner')       { window.lsSkipPartner();       return; }
    if (action === 'downloadLoveSecretPdf') { window.downloadLoveSecretPdf(); return; }
    if (action === 'shareLoveSecretKakao') {
      if (typeof window.shareLoveSecretKakao === 'function') window.shareLoveSecretKakao();
      return;
    }
  }, false);

  /* ESC 키로 모달 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = _qs('loveSecretModal');
      if (modal && modal.style.display !== 'none') window.closeLoveSecretModal();
    }
  });

})();
