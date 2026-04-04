/**
 * 인생의 책 (Life Book) — 프리미엄 사주 심층 분석 + PDF 다운로드
 * CODE-DESTINY v1.0
 */
(function () {
  'use strict';

  /* ─────────────── 상수 ─────────────── */
  var CHAPTER_TITLES = [
    '🚨 운명의 임계점과 장애물',
    '🚀 천직과 부의 설계도',
    '💕 감정의 역학과 연애운',
    '💍 배우자 분석과 결합의 운명',
    '🛤️ 인생의 3가지 평행우주',
    '🔮 사주의 비밀 코드네임',
    '📅 5개년 정밀 운세',
    '💰 자산의 증식과 리스크 관리',
    '🌅 생애 주기별 마스터플랜',
    '💌 마스터의 최종 전략 제언',
  ];

  var CHAPTER_SUBTITLES = [
    '실패의 알고리즘을 파괴하라',
    '당신만을 위한 독점적 영역',
    '관계의 결핍과 충족의 시나리오',
    '미래 배우자의 데이터 프로파일링',
    '선택에 따른 시뮬레이션',
    '심층 데이터가 밝히는 특이점',
    '과거의 복기와 미래의 선점',
    '부를 지키는 방어 기제',
    '인생 전체의 파노라마 (10~80세)',
    '운명을 이기는 의지의 설계',
  ];

  var LOADING_MSGS = [
    '사주 원국(四柱原局)을 분석하는 중...',
    '천직과 재능 설계도를 그리는 중...',
    '연애 역학 패턴을 해독하는 중...',
    '배우자 데이터를 프로파일링하는 중...',
    '3가지 인생 시나리오를 시뮬레이션하는 중...',
    '숨겨진 신살(神殺)을 탐색하는 중...',
    '5개년 세운을 교차 분석하는 중...',
    '재성운과 리스크를 계산하는 중...',
    '대운 흐름을 조망하는 중...',
    '마스터의 최종 전략을 집필하는 중...',
  ];

  /* ─────────────── 상태 ─────────────── */
  var _chapters = Array(10).fill(null);
  var _generating = false;
  var _currentChapter = 1;

  /* ─────────────── 유틸 ─────────────── */
  function _qs(id) { return document.getElementById(id); }

  /**
   * Markdown 텍스트를 간단하게 HTML로 변환
   */
  function _md2html(text) {
    if (!text) return '';
    // escape HTML first
    var h = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // headings
    h = h.replace(/^#### (.+)$/gm, '<h4 class="lb-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3 class="lb-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="lb-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="lb-md-h1">$1</h1>');

    // bold/italic
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // horizontal rule
    h = h.replace(/^---+$/gm, '<hr class="lb-md-hr">');

    // unordered lists
    h = h.replace(/^[*-] (.+)$/gm, '<li class="lb-md-li">$1</li>');
    h = h.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, function(m) {
      return '<ul class="lb-md-ul">' + m + '</ul>';
    });

    // ordered lists
    h = h.replace(/^\d+\. (.+)$/gm, '<li class="lb-md-li lb-md-oli">$1</li>');

    // paragraphs
    h = h.replace(/\n\n+/g, '\n\n');
    var lines = h.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) {
        result.push('');
        continue;
      }
      if (/^<(h[1-4]|ul|li|hr)/.test(line) || /<\/(h[1-4]|ul|li|hr)>$/.test(line)) {
        result.push(line);
      } else {
        result.push('<p class="lb-md-p">' + line + '</p>');
      }
    }
    return result.join('\n');
  }

  /**
   * 사주 데이터 수집 — window.__destinyFlowerSajuSnapshot, __cdActiveBirthProfile 등
   */
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

    // 원국 사주 기둥
    var G = window.G_PILLARS;
    if (G) {
      lines.push('\n【사주 원국(四柱)】');
      if (G.y) lines.push('년주(年柱): ' + (G.y.g || '') + (G.y.j || '') + (G.y.gE ? ' [' + G.y.gE + '/' + G.y.jE + ']' : ''));
      if (G.m) lines.push('월주(月柱): ' + (G.m.g || '') + (G.m.j || '') + (G.m.gE ? ' [' + G.m.gE + '/' + G.m.jE + ']' : ''));
      if (G.d) lines.push('일주(日柱): ' + (G.d.g || '') + (G.d.j || '') + (G.d.gE ? ' [' + G.d.gE + '/' + G.d.jE + ']' : ''));
      if (G.h) lines.push('시주(時柱): ' + (G.h.g || '') + (G.h.j || '') + (G.h.gE ? ' [' + G.h.gE + '/' + G.h.jE + ']' : ''));
    }

    // 오행 분포
    var analysis = snap.analysis || snap.saju || {};
    if (analysis.elementWeights) {
      var w = analysis.elementWeights;
      lines.push('\n【오행(五行) 분포】');
      lines.push('목(木): ' + (w.wood || 0) + ' | 화(火): ' + (w.fire || 0) + ' | 토(土): ' + (w.earth || 0) + ' | 금(金): ' + (w.metal || 0) + ' | 수(水): ' + (w.water || 0));
    }

    // 용신/기신
    if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
      lines.push('용신(用神): ' + analysis.yongshin_elements.join(', '));
    }
    if (analysis.kishin_elements && analysis.kishin_elements.length) {
      lines.push('기신(忌神): ' + analysis.kishin_elements.join(', '));
    }

    // 일간/격국
    if (analysis.dayStem) lines.push('일간(日干): ' + analysis.dayStem);
    if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label);
    if (analysis.johuType) lines.push('조후(調候): ' + analysis.johuType);
    if (analysis.johu_type && !analysis.johuType) lines.push('조후(調候): ' + analysis.johu_type);
    if (analysis.isJong) lines.push('종격(從格): ' + (analysis.jongName || '종격'));
    if (snap.saju && snap.saju.notes && snap.saju.notes.length) {
      lines.push('추가 판정: ' + snap.saju.notes.join(' / '));
    }

    // 십성 분포
    var G_JOHU = window.G_JOHU;
    var G_POWER = window.G_POWER;
    if (G_POWER) {
      if (G_POWER.groups) {
        lines.push('\n【십성(十星) 분포】');
        var gk = Object.keys(G_POWER.groups);
        for (var gi = 0; gi < gk.length; gi++) {
          lines.push(gk[gi] + ': ' + G_POWER.groups[gk[gi]]);
        }
      }
      if (G_POWER.yongshin) lines.push('용신: ' + (Array.isArray(G_POWER.yongshin) ? G_POWER.yongshin.join(', ') : G_POWER.yongshin));
    }

    // 대운
    var G_DAEWUN = window.G_DAEWUN || window.G_DAEUN;
    if (G_DAEWUN && Array.isArray(G_DAEWUN) && G_DAEWUN.length) {
      lines.push('\n【대운(大運) 흐름】');
      for (var di = 0; di < Math.min(G_DAEWUN.length, 10); di++) {
        var dw = G_DAEWUN[di];
        if (dw) {
          lines.push((dw.age || '') + '세: ' + (dw.g || '') + (dw.j || '') + (dw.gE ? ' [' + dw.gE + ']' : ''));
        }
      }
    }

    // 현재 나이
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n현재 나이: ' + currentAge + '세 (만 ' + (currentAge - 1) + '세)');
    }

    return lines.join('\n');
  }

  /* ─────────────── 모달 제어 ─────────────── */
  function _showScreen(id) {
    var screens = ['lbStartScreen', 'lbLoadingScreen', 'lbResultScreen', 'lbErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  window.openLifeBookModal = function () {
    var modal = _qs('lifeBookModal');
    if (!modal) return;

    // 사주 계산 여부 확인
    var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
    if (!hasData) {
      alert('📜 인생의 책을 생성하려면 먼저 사주 계산을 완료해 주세요.\n생년월일 · 출생 시간을 입력하고 "사주 분석 시작"을 눌러주세요.');
      return;
    }

    _chapters = Array(10).fill(null);
    _currentChapter = 1;
    _showScreen('lbStartScreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.lb-modal__close');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    } catch (_) {}
  };

  window.closeLifeBookModal = function () {
    var modal = _qs('lifeBookModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  /* ─────────────── TOC 네비게이션 ─────────────── */
  function _bindToc() {
    var nav = document.querySelector('.lb-toc');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lb-chapter]');
      if (!btn) return;
      var ch = Number(btn.getAttribute('data-lb-chapter'));
      if (!ch || !_chapters[ch - 1]) return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.lb-toc-item'), function (b) {
        b.classList.toggle('active', b === btn);
        b.classList.toggle('loaded', !!_chapters[Number(b.getAttribute('data-lb-chapter')) - 1]);
      });
    });
  }

  function _renderChapter(ch) {
    var content = _qs('lbChapterContent');
    if (!content) return;
    var idx = ch - 1;
    var data = _chapters[idx];
    if (!data) {
      content.innerHTML = '<p class="lb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';
      return;
    }
    var html =
      '<div class="lb-chapter-wrap">' +
      '<div class="lb-chapter-header">' +
      '<span class="lb-chapter-num">Chapter ' + ch + '</span>' +
      '<h2 class="lb-chapter-title">' + _escHtml(CHAPTER_TITLES[idx]) + '</h2>' +
      '<p class="lb-chapter-sub">' + _escHtml(CHAPTER_SUBTITLES[idx]) + '</p>' +
      '</div>' +
      '<div class="lb-chapter-body">' + _md2html(data) + '</div>' +
      '</div>';
    content.innerHTML = html;
    content.scrollTop = 0;
  }

  function _escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ─────────────── 생성 로직 ─────────────── */
  window.generateLifeBook = function () {
    if (_generating) return;

    var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
    if (!hasData) {
      alert('사주 계산을 먼저 완료해 주세요.');
      return;
    }

    _generating = true;
    _chapters = Array(10).fill(null);
    var sajuData = _collectSajuData();

    _showScreen('lbLoadingScreen');

    var progressBar = _qs('lbProgressBar');
    var progressText = _qs('lbProgressText');
    var chapterMsg = _qs('lbLoadingChapter');

    function _setProgress(done) {
      var pct = (done / 10) * 100;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / 10 챕터 완성';
      if (chapterMsg && done < 10) chapterMsg.textContent = LOADING_MSGS[done] || '분석 중...';
      if (chapterMsg && done >= 10) chapterMsg.textContent = '모든 챕터가 완성되었습니다 ✦';
    }

    _setProgress(0);

    // 챕터 1~10 순차 생성
    (function generateNext(idx) {
      if (idx >= 10) {
        _generating = false;
        _showScreen('lbResultScreen');
        _updateTocState();
        _renderChapter(1);
        _bindToc();

        var profile = window.__cdActiveBirthProfile || {};
        var nameEl = _qs('lbResultName');
        var dateEl = _qs('lbResultDate');
        if (nameEl) nameEl.textContent = '📜 ' + (profile.name || '사용자') + '님의 인생의 책';
        if (dateEl) {
          var b = profile.birth || {};
          dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · ' + (profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : '') + ' · ' + new Date().toLocaleDateString('ko-KR') + ' 발행';
        }
        return;
      }

      if (chapterMsg) chapterMsg.textContent = LOADING_MSGS[idx] || '분석 중...';

      fetch('/api/lifebook/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: idx + 1, sajuData: sajuData }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.ok && data.text) {
            _chapters[idx] = data.text;
          } else {
            _chapters[idx] = '⚠️ 이 챕터의 분석을 불러오는 데 실패했습니다.\n\n' + (data && data.message ? data.message : '알 수 없는 오류');
          }
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

  function _updateTocState() {
    var items = document.querySelectorAll('.lb-toc-item');
    Array.prototype.forEach.call(items, function (btn) {
      var ch = Number(btn.getAttribute('data-lb-chapter'));
      btn.classList.toggle('loaded', !!_chapters[ch - 1]);
      btn.classList.toggle('active', ch === 1);
    });
  }

  /* ─────────────── PDF 다운로드 ─────────────── */
  window.downloadLifeBookPdf = function () {
    if (!_chapters.some(Boolean)) {
      alert('먼저 인생의 책을 생성해 주세요.');
      return;
    }

    var profile = window.__cdActiveBirthProfile || {};
    var name = (profile.name || '사용자') + '님의 인생의 책';
    var birth = profile.birth || {};
    var birthStr = [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + (birth.day ? '일' : '');
    var issued = new Date().toLocaleDateString('ko-KR');

    // PDF용 HTML 생성
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

    var fullHtml = '<!DOCTYPE html><html lang="ko"><head>' +
      '<meta charset="UTF-8">' +
      '<title>' + _escHtml(name) + '</title>' +
      '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Gowun+Dodum&display=swap");' +
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a1a2e;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#0a0a1a 0%,#1a1a40 50%,#0a0a1a 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:0.75rem;letter-spacing:0.2em;color:#c4b5fd;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:2.8rem;font-weight:700;margin:0 0 12px;color:#f5f0ff;letter-spacing:0.05em;}' +
      '.cover-subtitle{font-size:1.1rem;color:#a78bfa;margin:0 0 32px;}' +
      '.cover-name{font-size:1.6rem;color:#fde68a;margin:0 0 8px;}' +
      '.cover-info{font-size:0.9rem;color:#94a3b8;margin:0 0 48px;}' +
      '.cover-deco{font-size:1.5rem;color:#7c3aed;letter-spacing:0.3em;}' +
      '.toc{padding:48px 56px;page-break-after:always;}' +
      '.toc-title{font-size:1.4rem;color:#4c1d95;margin-bottom:32px;border-bottom:2px solid #7c3aed;padding-bottom:12px;}' +
      '.toc-item{display:flex;align-items:baseline;gap:8px;margin-bottom:16px;font-size:1rem;}' +
      '.toc-num{color:#7c3aed;font-weight:700;min-width:80px;}' +
      '.toc-text{color:#1e1b4b;}' +
      '.chapter{padding:48px 56px;}' +
      '.chapter-header{border-bottom:1px solid #ede9fe;margin-bottom:32px;padding-bottom:24px;}' +
      '.chapter-num{font-size:0.75rem;letter-spacing:0.2em;color:#7c3aed;text-transform:uppercase;display:block;margin-bottom:8px;}' +
      '.chapter-title{font-size:1.8rem;font-weight:700;color:#1e1b4b;margin:0 0 8px;}' +
      '.chapter-sub{font-size:0.95rem;color:#6d28d9;margin:0;}' +
      '.chapter-body{line-height:1.9;font-size:0.98rem;color:#2d2d4e;}' +
      '.lb-md-h1,.lb-md-h2{font-size:1.3rem;font-weight:700;color:#1e1b4b;margin:28px 0 12px;border-left:4px solid #7c3aed;padding-left:12px;}' +
      '.lb-md-h3{font-size:1.1rem;font-weight:700;color:#312e81;margin:20px 0 8px;}' +
      '.lb-md-h4{font-size:1rem;font-weight:700;color:#4c1d95;margin:16px 0 6px;}' +
      '.lb-md-p{margin:0 0 14px;}' +
      '.lb-md-ul{margin:0 0 14px;padding-left:24px;}' +
      '.lb-md-li{margin-bottom:6px;}' +
      '.lb-md-hr{border:none;border-top:1px solid #ede9fe;margin:24px 0;}' +
      '@media print{' +
      'body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.cover{min-height:auto;padding:60px 40px;}' +
      '}' +
      '</style></head><body>' +
      '<div class="cover">' +
      '<p class="cover-badge">✦ CODE DESTINY · PREMIUM SAJU ANALYSIS ✦</p>' +
      '<h1 class="cover-title">📜 인생의 책</h1>' +
      '<p class="cover-subtitle">運命의 알고리즘을 해독하다</p>' +
      '<h2 class="cover-name">' + _escHtml(profile.name || '사용자') + ' 님</h2>' +
      '<p class="cover-info">' + _escHtml(birthStr) + ' · ' + _escHtml(profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : '') + '</p>' +
      '<p class="cover-info">발행일: ' + _escHtml(issued) + '</p>' +
      '<div class="cover-deco">✦ ◈ ✦</div>' +
      '</div>' +
      '<div class="toc">' +
      '<h2 class="toc-title">목 차 (Table of Contents)</h2>' +
      _chapters.map(function (c, i) {
        if (!c) return '';
        return '<div class="toc-item"><span class="toc-num">Chapter ' + (i + 1) + '</span><span class="toc-text">' + _escHtml(CHAPTER_TITLES[i]) + '</span></div>';
      }).join('') +
      '</div>' +
      bodyHtml +
      '</body></html>';

    // 새 창 열어서 print
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('팝업이 차단되어 PDF 생성 창을 열 수 없습니다.\n브라우저 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    setTimeout(function () {
      try {
        win.print();
      } catch (_) {}
    }, 1200);
  };

  /* ─────────────── 이벤트 위임 바인딩 ─────────────── */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'closeLifeBookModal') {
      window.closeLifeBookModal();
      return;
    }
    if (action === 'generateLifeBook') {
      window.generateLifeBook();
      return;
    }
    if (action === 'downloadLifeBookPdf') {
      window.downloadLifeBookPdf();
      return;
    }
    if (action === 'shareLifeBookKakao') {
      if (typeof window.shareLifeBookKakao === 'function') window.shareLifeBookKakao();
      return;
    }
  }, false);

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = _qs('lifeBookModal');
      if (modal && modal.style.display !== 'none') {
        window.closeLifeBookModal();
      }
    }
  });

  // 모달 오버레이 클릭으로 닫기 (이미 data-action으로 처리되지만 보험용)
  var _overlay = document.querySelector('#lifeBookModal .lb-modal__overlay');
  if (_overlay) {
    _overlay.addEventListener('click', function () { window.closeLifeBookModal(); });
  }

})();
