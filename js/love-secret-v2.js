/**
 * 연애 비책 v2 — 운명의 설계도
 * 사주 기반 AI 연애 전략 10챕터 리포트 + PDF 다운로드
 * CODE-DESTINY Premium
 */
(function () {
  'use strict';

  var CHAPTER_TITLES = [
    '🔑 본연의 연애 자아: 나도 몰랐던 사랑의 본능',
    '💘 치명적 매력과 페로몬: 이성을 끌어당기는 나의 무기',
    '� 두 사람의 사주 궁합: 우리는 운명인가',
    '⚔️ 밀당 전략서: 상대방 심리를 꿰뚫는 작전 지도',
    '📅 시기별 연애 운의 흐름: 운명이 허락하는 그날',
    '🌑 연애 리스크: 충돌 지점과 금기 지도',
    '🔥 육체적 궁합: 두 사람의 감각 에너지 호환성',
    '📲 현대적 상황별 비책: 디지털 시대의 연애 전략',
    '💍 결혼 시기: 언제, 누구와 정착할 것인가',
    '🌿 개운 처방전: 두 사람의 사랑을 부르는 비책',
  ];

  var CHAPTER_SUBTITLES = [
    '나도 몰랐던 사랑의 본능을 해독하다',
    '이성이 나를 떠날 수 없게 만드는 비밀',
    '두 사람의 오행·일주·충합 궁합 완전 분석',
    '상대방 심리를 꿰뚫는 밀당 작전 지도',
    '사랑을 잡는 황금 타이밍',
    '충돌 지점과 금기를 미리 아는 연애 지도',
    '두 사람의 감각 에너지 호환성 진단',
    '현대 연애 플랫폼 완전 공략',
    '언제, 누구와 정착할 것인가',
    '두 사람의 사랑을 부르는 개운 비책',
  ];

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
  ];

  var _chapters = Array(10).fill(null);
  var _generating = false;

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
    if (nameEl) nameEl.textContent = '💕 ' + (name || '사용자') + '님의 연애 비책';
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
    var GD = window.G_DAEWUN || window.G_DAEUN;
    if (GD && Array.isArray(GD) && GD.length) {
      lines.push('\n【대운(大運) 흐름】');
      for (var di = 0; di < Math.min(GD.length, 10); di++) {
        var dw = GD[di];
        if (dw) lines.push((dw.age || '') + '세: ' + (dw.g || '') + (dw.j || '') + (dw.gE ? ' [' + dw.gE + ']' : ''));
      }
    }
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n현재 나이: ' + currentAge + '세 (만 ' + (currentAge - 1) + '세)');
    }
    /* ── 신살(神殺) 계산 ─────────────────────────────────────── */
    if (G && G.d && G.d.g && G.d.j) {
      var _ss_day = G.d.g + G.d.j;
      var _ss_jArr = [G.y && G.y.j, G.m && G.m.j, G.d && G.d.j, G.h && G.h.j];
      var _ss_jPos = ['년지','월지','일지','시지'];
      var _ss_list = [];
      // 도화살: 子午卯酉
      var _ss_tao = ['子','午','卯','酉'];
      var _ss_taoPos = _ss_jArr.reduce(function(a,b,i){if(b&&_ss_tao.indexOf(b)>=0)a.push(_ss_jPos[i]);return a;},[]);
      if (_ss_taoPos.length > 0) _ss_list.push('도화살(桃花殺)['+_ss_taoPos.join(',')+'] — 이성을 끌어당기는 매력의 별. 인기와 이성 인연이 끊이지 않음');
      // 홍염살: 甲午·丙寅·丁未·戊辰·庚戌·辛酉·壬子
      var _ss_hong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
      if (_ss_hong.indexOf(_ss_day) >= 0) _ss_list.push('홍염살(紅艶殺)[일주 '+_ss_day+'] — 타고난 치명적 색기와 강렬한 이성 흡인력. 이 일주 자체가 섹시한 카리스마를 타고남. 의도치 않아도 이성에게 강렬한 인상을 줌');
      // 역마살: 寅申巳亥
      var _ss_yem = ['寅','申','巳','亥'];
      var _ss_yemPos = _ss_jArr.reduce(function(a,b,i){if(b&&_ss_yem.indexOf(b)>=0)a.push(_ss_jPos[i]);return a;},[]);
      if (_ss_yemPos.length > 0) _ss_list.push('역마살(驛馬殺)['+_ss_yemPos.join(',')+'] — 이동·변화·역동성의 별. 연애에서 자유와 변화를 중시함');
      // 화개살: 辰戌丑未
      var _ss_hwa = ['辰','戌','丑','未'];
      var _ss_hwaPos = _ss_jArr.reduce(function(a,b,i){if(b&&_ss_hwa.indexOf(b)>=0)a.push(_ss_jPos[i]);return a;},[]);
      if (_ss_hwaPos.length > 0) _ss_list.push('화개살(華蓋殺)['+_ss_hwaPos.join(',')+'] — 예술·영성·고독의 별. 깊이 있는 내면 교감을 중시함');
      // 괴강살
      var _ss_goe = ['庚辰','庚戌','壬辰','壬戌','戊戌'];
      if (_ss_goe.indexOf(_ss_day) >= 0) _ss_list.push('괴강살(魁罡殺)[일주 '+_ss_day+'] — 강인한 리더십과 불굴의 의지. 연애에서도 주도적이고 극단적 성향');
      // 간여지동
      var _ss_gyn = ['甲寅','乙卯','丙午','丁巳','戊辰','戊戌','己丑','己未','庚申','辛酉','壬子','癸亥'];
      if (_ss_gyn.indexOf(_ss_day) >= 0) _ss_list.push('간여지동(干與支同)[일주 '+_ss_day+'] — 겉과 속이 일치하는 강한 자아. 자신의 방식에 확신이 강하고 주체적');
      // 양인살: 甲→卯, 丙→午, 戊→午, 庚→酉, 壬→子
      var _ss_yang = {'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'};
      if (_ss_yang[G.d.g] && G.d.j === _ss_yang[G.d.g]) _ss_list.push('양인살(羊刃殺)[일주 '+_ss_day+'] — 날카로운 집중력과 극단의 에너지');
      // 천을귀인
      var _ss_ul = {'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'丙':['亥','酉'],'丁':['亥','酉'],'辛':['寅','午'],'壬':['巳','卯'],'癸':['巳','卯']};
      if (_ss_ul[G.d.g]) {
        var _ss_ulSet = _ss_ul[G.d.g];
        var _ss_ulPos = _ss_jArr.reduce(function(a,b,i){if(b&&_ss_ulSet.indexOf(b)>=0)a.push(_ss_jPos[i]);return a;},[]);
        if (_ss_ulPos.length > 0) _ss_list.push('천을귀인(天乙貴人)['+_ss_ulPos.join(',')+'] — 위기에 귀인이 나타나는 길성. 보호와 조력의 별');
      }
      lines.push('\n【신살(神殺) 분석】');
      if (_ss_list.length > 0) {
        _ss_list.forEach(function(s){ lines.push('• ' + s); });
        lines.push('※ AI 분석 필수: 위 신살들이 이 사람의 연애 매력·관계 패턴에 실질적으로 어떻게 발현되는지 반드시 구체적으로 서술할 것. 특히 홍염살 보유 일주는 해당 일주 자체가 타고난 이성 끌림이 강함을 명시할 것.');
      } else {
        lines.push('• 해당 신살 없음 — 순수 오행 매력의 소유자. 신살이 아닌 오행 에너지 자체로 매력이 발현됨.');
      }
    }
    return lines.join('\n');
  }

  function _collectPartnerData() {
    var section = _qs('lsPartnerSection');
    if (!section || !section.classList.contains('open')) return '';
    var name = (_qs('lsPartnerName') || {}).value || '';
    var year = parseInt((_qs('lsPartnerYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPartnerMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPartnerDay') || {}).value || '0', 10);
    var hourEl = _qs('lsPartnerHour');
    var hourVal = hourEl ? hourEl.value : '';
    var gender = '';
    var gm = _qs('lsPartnerGenderM');
    var gf = _qs('lsPartnerGenderF');
    if (gm && gm.classList.contains('active')) gender = '남성';
    else if (gf && gf.classList.contains('active')) gender = '여성';
    if (!year || !month || !day) return '';
    var lines = ['【상대방 정보】'];
    if (name) lines.push('이름: ' + name);
    if (gender) lines.push('성별: ' + gender);
    lines.push('생년월일: ' + year + '년 ' + month + '월 ' + day + '일');
    if (hourVal !== '') {
      var hourNames = ['자시(23-01시)','축시(01-03시)','인시(03-05시)','묘시(05-07시)','진시(07-09시)',
        '사시(09-11시)','오시(11-13시)','미시(13-15시)','신시(15-17시)','유시(17-19시)','술시(19-21시)','해시(21-23시)'];
      lines.push('출생 시각: ' + (hourNames[parseInt(hourVal, 10)] || hourVal + '시'));
    } else {
      lines.push('출생 시각: 미상');
    }
    return lines.join('\n');
  }

  function _bindPartnerSection() {
    var toggle = _qs('lsPartnerToggle');
    var section = _qs('lsPartnerSection');
    if (!toggle || !section) return;
    toggle.addEventListener('click', function () {
      var isOpen = section.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    var genderBtns = document.querySelectorAll('.ls-partner-gender-btn');
    Array.prototype.forEach.call(genderBtns, function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(genderBtns, function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  function _showScreen(id) {
    var screens = ['lsStartScreen', 'lsLoadingScreen', 'lsResultScreen', 'lsErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  window.openLoveSecretModal = function () {
    var modal = _qs('loveSecretModal');
    if (!modal) return;
    var profile = window.__cdActiveBirthProfile;
    var hasData = !!(profile && profile.birth && profile.birth.year);
    if (!hasData) {
      alert('💕 연애 비책을 생성하려면 먼저 사주 계산을 완료해 주세요.\n생년월일 · 출생 시간을 입력하고 "사주 분석 시작"을 눌러주세요.');
      return;
    }

    // 저장된 데이터 복원 시도
    var saved = _loadSaved(profile);
    if (saved && saved.chapters && saved.chapters.some(Boolean)) {
      _chapters = saved.chapters;
      _showScreen('lsResultScreen');
      _updateTocState();
      _renderChapter(1);
      _bindToc();
      _renderResultHeader(saved.name, saved.birth, saved.gender, saved.savedAt ? new Date(saved.savedAt) : null, false);
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      _bindPartnerSection();
      try {
        modal.setAttribute('aria-hidden', 'false');
        var closeBtn2 = modal.querySelector('.ls-modal__close');
        if (closeBtn2) setTimeout(function () { closeBtn2.focus(); }, 60);
      } catch (_) {}
      return;
    }

    _chapters = Array(10).fill(null);
    _showScreen('lsStartScreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _bindPartnerSection();
    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.ls-modal__close');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    } catch (_) {}
  };

  window.closeLoveSecretModal = function () {
    var modal = _qs('loveSecretModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.regenerateLoveSecret = function () {
    if (_generating) {
      if (!window.confirm('생성이 진행 중입니다.\n중단하고 다시 생성하시겠습니까?')) return;
      _generating = false;
    }
    var profile = window.__cdActiveBirthProfile || {};
    _clearSaved(profile);
    _chapters = Array(10).fill(null);
    _showScreen('lsStartScreen');
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
      '<h2 class="ls-chapter-title">' + _escHtml(CHAPTER_TITLES[idx]) + '</h2>' +
      '<p class="ls-chapter-sub">' + _escHtml(CHAPTER_SUBTITLES[idx]) + '</p>' +
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

  window.generateLoveSecret = function () {
    if (_generating) return;
    var hasData = !!(
      window.__cdActiveBirthProfile &&
      window.__cdActiveBirthProfile.birth &&
      window.__cdActiveBirthProfile.birth.year
    );
    if (!hasData) { alert('사주 계산을 먼저 완료해 주세요.'); return; }
    _generating = true;
    _chapters = Array(10).fill(null);
    var sajuData = _collectSajuData();
    var partnerData = _collectPartnerData();
    _showScreen('lsLoadingScreen');
    var progressBar = _qs('lsProgressBar');
    var progressText = _qs('lsProgressText');
    var chapterMsg = _qs('lsLoadingChapter');

    function _setProgress(done) {
      var pct = (done / 10) * 100;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / 10 챕터 완성';
      if (chapterMsg && done < 10) chapterMsg.textContent = LOADING_MSGS[done] || '분석 중...';
      if (chapterMsg && done >= 10) chapterMsg.textContent = '모든 챕터가 완성되었습니다 💕';
    }
    _setProgress(0);
    var lsTitle = _qs('lsLoadingTitle');
    if (lsTitle) {
      lsTitle.textContent = partnerData
        ? '두 사람의 궁합과 연애 비책을 집필하는 중입니다'
        : '연애 비책을 집필하는 중입니다';
    }

    (function generateNext(idx) {
      if (idx >= 10) {
        _generating = false;
        _showScreen('lsResultScreen');
        _updateTocState();
        _renderChapter(1);
        _bindToc();
        var profile = window.__cdActiveBirthProfile || {};
        var nameEl = _qs('lsResultName');
        var dateEl = _qs('lsResultDate');
        _saveResult(profile);
        _renderResultHeader(profile.name, profile.birth, profile.gender, new Date(), true);
        return;
      }
      if (chapterMsg) chapterMsg.textContent = LOADING_MSGS[idx] || '분석 중...';
      fetch('/api/love-secret/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: idx + 1, sajuData: sajuData, partnerData: partnerData || '' }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          _chapters[idx] = (data && data.ok && data.text)
            ? data.text
            : '⚠️ 이 챕터의 분석을 불러오는 데 실패했습니다.\n\n' + (data && data.message ? data.message : '알 수 없는 오류');
          _setProgress(idx + 1);
          generateNext(idx + 1);
        })
        .catch(function (err) {
          _chapters[idx] = '⚠️ 네트워크 오류로 이 챕터를 불러오지 못했습니다.\n' + String(err && err.message ? err.message : err);
          _setProgress(idx + 1);
          generateNext(idx + 1);
        });
    })(0);
  };

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
    for (var i = 0; i < 10; i++) {
      if (!_chapters[i]) continue;
      bodyHtml +=
        '<div class="chapter" style="page-break-before:' + (i > 0 ? 'always' : 'auto') + '">' +
        '<div class="chapter-header">' +
        '<span class="chapter-num">Chapter ' + (i + 1) + '</span>' +
        '<h2 class="chapter-title">' + _escHtml(CHAPTER_TITLES[i]) + '</h2>' +
        '<p class="chapter-sub">' + _escHtml(CHAPTER_SUBTITLES[i]) + '</p>' +
        '</div>' +
        '<div class="chapter-body">' + _md2html(_chapters[i]) + '</div>' +
        '</div>';
    }

    var tocHtml = _chapters.map(function (c, i) {
      if (!c) return '';
      return '<div class="toc-item"><span class="toc-num">Chapter ' + (i + 1) + '</span><span class="toc-text">' + _escHtml(CHAPTER_TITLES[i]) + '</span></div>';
    }).join('');

    var fullHtml = '<!DOCTYPE html><html lang="ko"><head>' +
      '<meta charset="UTF-8">' +
      '<title>' + _escHtml((profile.name || '사용자') + '님의 연애 비책') + '</title>' +
      '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Gowun+Dodum&display=swap");' +
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a0a1e;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#1a0010 0%,#3d0030 50%,#1a0010 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:.75rem;letter-spacing:.2em;color:#f9a8d4;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:3rem;font-weight:700;margin:0 0 12px;color:#fce7f3;letter-spacing:.05em;}' +
      '.cover-subtitle{font-size:1.1rem;color:#f472b6;margin:0 0 32px;}' +
      '.cover-name{font-size:1.7rem;color:#fde68a;margin:0 0 8px;}' +
      '.cover-info{font-size:.9rem;color:#fbb6ce;margin:0 0 10px;}' +
      '.cover-deco{font-size:1.5rem;color:#ec4899;letter-spacing:.3em;margin-top:32px;}' +
      '.toc{padding:48px 56px;page-break-after:always;}' +
      '.toc-title{font-size:1.4rem;color:#9d174d;margin-bottom:32px;border-bottom:2px solid #ec4899;padding-bottom:12px;}' +
      '.toc-item{display:flex;align-items:baseline;gap:8px;margin-bottom:16px;font-size:1rem;}' +
      '.toc-num{color:#ec4899;font-weight:700;min-width:80px;}' +
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
      bodyHtml +
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
    if (action === 'closeLoveSecretModal') { window.closeLoveSecretModal(); return; }
    if (action === 'generateLoveSecret')  { window.generateLoveSecret();  return; }
    if (action === 'downloadLoveSecretPdf') { window.downloadLoveSecretPdf(); return; }
    if (action === 'regenerateLoveSecret') { window.regenerateLoveSecret(); return; }
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
