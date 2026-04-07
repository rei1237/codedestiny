/**
 * 자미두수 인생 총람 (Ziwei Doushu Life Book) — 프리미엄 자미두수 심층 분석 + PDF 다운로드
 * CODE-DESTINY v1.0  •  자미두수(紫微斗數) 기반 인생 총람 생성기
 */
(function () {
  'use strict';

  /* ─────────────── 챕터 상수 ─────────────── */
  var CHAPTER_TITLES = [
    '🌌 명궁(命宮) 완전 해설 — 영혼의 아키타입과 천명',
    '🌙 신궁(身宮) 심층 분석 — 빛과 그림자의 본체',
    '🎭 12궁 배치 완전 해독 — 황실이 비장한 인생 지도',
    '☀️ 주성(主星) 완전 심층 해독 — 운명에 새긴 별의 이름',
    '💼 관록궁(官祿宮) 완전 분석 — 천직과 성공의 방정식',
    '💰 재백궁(財帛宮) 완전 분석 — 부의 그릇과 재물 법칙',
    '💑 부처궁(夫妻宮) 완전 분석 — 운명의 반려자와 사랑 지도',
    '⚔️ 살성(殺星)과 화성(化星) — 도전이 기회가 되는 순간',
    '🌊 대한(大限) 정밀 분석 — 인생의 파도와 운명 시나리오',
    '🔮 천이궁·복덕궁 — 이동·해외·영적 복의 그릇',
    '📅 2026 소한(小限) 로드맵 — 올해의 행동 지침',
    '🌅 생애 마스터플랜 — 대한별 황금 타이밍 전략',
    '💌 천명 총결산 — 황실이 봉인한 당신의 운명 비전',
  ];

  var CHAPTER_SUBTITLES = [
    '명궁 주성·보성·살성 완전 해독 — 타고난 기질과 천명의 원점',
    '신궁 주성·내면 심성·진짜 욕구와 잠재된 무기',
    '12궁 전체 배치 — 각궁의 주성·화록·화권·화과·화기 흐름',
    '자미·천부·태양·태음·천기·무곡·천동·염정·탐랑·거문·천상·천량·칠살·파군',
    '관록궁 주성·보성·화록·화권으로 읽는 직업 적성과 성공 공식',
    '재백궁 주성·보성·화록·화기로 읽는 재물 그릇과 돈을 부르는 법칙',
    '부처궁 주성·도화성계·연애 패턴과 운명의 파트너 기질',
    '경양·타라·지공·지겁·천형·천요 — 살성이 만드는 도전과 기회의 역설',
    '대한 10년 단위 흐름 — 현재 대한 심층 분석과 전 생애 파노라마',
    '천이궁 이동·해외운, 복덕궁 정신·영적 복덕과 인생의 진정한 행복 그릇',
    '2026 소한 12궁 순행 — 재물·사업·연애·건강·이동 타이밍 로드맵',
    '전 생애 대한별 황금 타이밍 — 도전의 해와 수호의 해를 구분하라',
    '명궁·신궁·관록궁·재백궁 4대궁 총결산 · 황실 비전 최종 처세 전략',
  ];

  var LOADING_MSGS = [
    '명궁(命宮) 좌표를 탐색하고 주성의 기운을 해독하는 중...',
    '신궁(身宮) 내면의 별자리를 읽고 잠재 에너지를 분석하는 중...',
    '12궁 전체 배치와 화록·화권·화과·화기 흐름을 매핑하는 중...',
    '자미·천부·태양·태음 주성의 천명 코드를 해독하는 중...',
    '관록궁의 천직 좌표와 성공 방정식을 계산하는 중...',
    '재백궁의 부(富)의 그릇과 재물 법칙을 탐색하는 중...',
    '부처궁의 인연 구조와 운명의 파트너 기질을 분석하는 중...',
    '살성과 화성의 역학 — 도전이 기회가 되는 순간을 포착하는 중...',
    '대한(大限) 10년 흐름과 현재 대한을 정밀 분석하는 중...',
    '천이궁·복덕궁의 이동운과 영적 복덕을 해독하는 중...',
    '2026 소한(小限) 12궁 로드맵을 작성하는 중...',
    '전 생애 대한별 황금 타이밍 마스터플랜을 조망하는 중...',
    '천명 총결산 — 황실이 봉인한 비전의 최종章을 집필하는 중...',
  ];

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
  var _chapters = Array(13).fill(null);
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;

  /* ─────────────── 유틸 ─────────────── */
  function _qs(id) { return document.getElementById(id); }

  function _escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  function _zbSaveResult(profile) {
    try {
      localStorage.setItem(_zbMakeKey(profile), JSON.stringify({
        chapters: _chapters,
        name: (profile && profile.name) || '사용자',
        birth: (profile && profile.birth) || {},
        gender: (profile && profile.gender) || '',
        savedAt: new Date().toISOString()
      }));
    } catch (e) {}
  }

  function _zbLoadSaved(profile) {
    try {
      var raw = localStorage.getItem(_zbMakeKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ─────────────── 화면 전환 ─────────────── */
  function _showScreen(id) {
    var screens = ['zbStartScreen', 'zbLoadingScreen', 'zbResultScreen', 'zbErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  /* ─────────────── TOC ─────────────── */
  var ZB_ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];

  function _renderToc() {
    var nav = document.getElementById('zbToc');
    if (!nav) return;
    if (nav.querySelector('[data-zb-chapter]')) return; // 이미 렌더됨
    var html = '';
    for (var i = 1; i <= 13; i++) {
      html += '<button type="button" class="lb-toc-item zb-toc-item' + (i === 1 ? ' active' : '') + '" data-zb-chapter="' + i + '">' + ZB_ROMAN[i - 1] + '</button>';
    }
    nav.innerHTML = html;
  }

  function _bindToc() {
    var nav = document.getElementById('zbToc');
    if (!nav) return;
    _renderToc();
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-zb-chapter]');
      if (!btn) return;
      var ch = Number(btn.getAttribute('data-zb-chapter'));
      if (!ch || !_chapters[ch - 1]) return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.zb-toc-item'), function (b) {
        b.classList.toggle('active', b === btn);
        b.classList.toggle('loaded', !!_chapters[Number(b.getAttribute('data-zb-chapter')) - 1]);
      });
    });
  }

  function _renderChapter(ch) {
    var content = _qs('zbChapterContent');
    if (!content) return;
    var idx = ch - 1;
    var data = _chapters[idx];
    if (!data) {
      content.innerHTML = '<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';
      return;
    }
    content.innerHTML =
      '<div class="zb-chapter-wrap">' +
      '<div class="zb-chapter-header">' +
      '<span class="zb-chapter-num">Chapter ' + ch + '</span>' +
      '<h2 class="zb-chapter-title">' + _escHtml(CHAPTER_TITLES[idx]) + '</h2>' +
      '<p class="zb-chapter-sub">' + _escHtml(CHAPTER_SUBTITLES[idx]) + '</p>' +
      '</div>' +
      '<div class="zb-chapter-body">' + _md2html(data) + '</div>' +
      '</div>';
    content.scrollTop = 0;
  }

  function _updateTocState() {
    _renderToc();
    var items = document.querySelectorAll('#zbToc .zb-toc-item');
    Array.prototype.forEach.call(items, function (btn) {
      var ch = Number(btn.getAttribute('data-zb-chapter'));
      btn.classList.toggle('loaded', !!_chapters[ch - 1]);
      btn.classList.toggle('active', ch === 1);
    });
  }

  /* ─────────────── 모달 열기/닫기 ─────────────── */
  window.openZiweiBookModal = function () {
    var modal = _qs('ziweiBookModal');
    if (!modal) {
      console.error('[자미두수 인생 총람] ziweiBookModal 요소를 찾을 수 없습니다.');
      return;
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
      // 관리자 바이패스 모드: 프로필 없어도 시작 화면 표시
      if (window.__cdAdminBypass) {
        // 빈 프로필로 계속 진행 (시작 화면에서 입력 가능)
      } else {
        var _zbFormEl = document.getElementById('birthDate') || document.getElementById('run-btn');
        if (_zbFormEl) { try { _zbFormEl.scrollIntoView({behavior:'smooth',block:'center'}); } catch(_){} }
        alert('🌌 자미두수 인생 총람을 생성하려면 생년월일·출생 시간을 입력하고 "사주 분석 시작"을 눌러주세요.');
        return;
      }
    }
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    // 저장된 결과 복원 시도
    var saved = _zbLoadSaved(profile);
    if (saved && saved.chapters && saved.chapters.some(Boolean)) {
      _chapters = saved.chapters;
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
        dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · ' +
          (saved.gender === 'F' ? '여성' : saved.gender === 'M' ? '남성' : '') +
          (savedDate ? ' · 💾 ' + savedDate + ' 저장' : '');
      }
      var epBanner = _qs('zbEpilogueBanner');
      if (epBanner) epBanner.style.display = '';
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      try { modal.setAttribute('aria-hidden', 'false'); } catch(_) {}
      return;
    }

    _chapters = Array(13).fill(null);
    _currentChapter = 1;
    _showScreen('zbStartScreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

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
    var infoEl = _qs('zbProfileInfo');
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
    if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  /* ─────────────── 생성 로직 ─────────────── */
  window.generateZiweiBook = function () {
    if (_generating) return;

    var profile = _getActiveBirthProfile();
    if (!profile) {
      alert('사주/자미두수 계산을 먼저 완료해 주세요.');
      return;
    }
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

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
    _chapters = Array(13).fill(null);
    // 사주 분석 화면과 100% 일치하도록 G_PILLARS 등 전역 변수 재계산
    if (typeof window.computeProfileForModal === 'function' && profile && profile.birth) {
      try { window.computeProfileForModal(profile); } catch (_cpE) {}
    }
    var ziweiData = _collectZiweiData();

    if (!ziweiData || ziweiData.length < 20) {
      _generating = false;
      alert('자미두수 데이터를 불러오지 못했습니다. 생년월일을 입력하고 사주 분석을 먼저 실행해 주세요.');
      return;
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
        mysticEl.classList.add('zb-fade-out');
        setTimeout(function () {
          if (mysticEl) {
            mysticEl.textContent = MYSTIC_QUOTES[_mqIdx];
            mysticEl.classList.remove('zb-fade-out');
          }
        }, 420);
      }
    }, 3600);

    // 챕터 아이콘 초기화
    var chDots = document.querySelectorAll('.zb-ch-dot');
    Array.prototype.forEach.call(chDots, function (d) {
      d.classList.remove('zb-ch-dot--done', 'zb-ch-dot--active');
    });
    if (chDots[0]) chDots[0].classList.add('zb-ch-dot--active');

    function _setProgress(done) {
      var pct = (done / 13) * 100;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / 13 챕터 완성';
      if (chapterMsg && done < 13) chapterMsg.textContent = LOADING_MSGS[done] || '분석 중...';
      if (chapterMsg && done >= 13) chapterMsg.textContent = '자미두수 인생 총람이 완성되었습니다 ✦';
      if (chapterNumEl) chapterNumEl.textContent = done < 13 ? 'Chapter ' + (done + 1) : '✦ 완성 ✦';
      Array.prototype.forEach.call(chDots, function (d) {
        var ch = Number(d.getAttribute('data-zbch'));
        var wasDone = d.classList.contains('zb-ch-dot--done');
        d.classList.toggle('zb-ch-dot--done', ch <= done);
        d.classList.toggle('zb-ch-dot--active', ch === done + 1 && done < 13);
        if (!wasDone && ch <= done) {
          d.style.animation = 'none'; void d.offsetWidth; d.style.animation = '';
        }
      });
    }

    _setProgress(0);

    function _fetchChapter(idx) {
      return new Promise(function (resolve) {
        var timeoutId = setTimeout(function () {
          resolve({ ok: false, message: '응답 시간 초과 (60초).' });
        }, 60000);
        fetch('/api/ziwei-book/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: idx + 1, ziweiData: ziweiData }),
        })
          .then(function (res) {
            if (!res.ok) return res.json().catch(function () { return {}; }).then(function (e) {
              return { ok: false, message: (e && e.message) || 'HTTP ' + res.status };
            });
            return res.json().catch(function () { return { ok: false, message: 'JSON 파싱 오류' }; });
          })
          .then(function (data) { clearTimeout(timeoutId); resolve(data); })
          .catch(function (err) { clearTimeout(timeoutId); resolve({ ok: false, message: String(err && err.message ? err.message : err) }); });
      });
    }

    var _failCount = 0;
    (function generateNext(idx) {
      if (idx >= 13) {
        clearInterval(_mysticTimer); _mysticTimer = null; _generating = false;
        var allFailed = _chapters.every(function (c) { return !c || /^⚠️/.test(c); });
        if (allFailed) {
          var errEl = _qs('zbErrorMsg');
          if (errEl) errEl.textContent = '모든 챕터 생성에 실패했습니다. API 키 설정 또는 네트워크를 확인해 주세요.';
          _showScreen('zbErrorScreen');
          return;
        }
        _showScreen('zbResultScreen');
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
        _zbSaveResult(prof);
        var epBanner = _qs('zbEpilogueBanner');
        if (epBanner) epBanner.style.display = '';
        return;
      }
      if (chapterMsg) chapterMsg.textContent = LOADING_MSGS[idx] || '분석 중...';
      _fetchChapter(idx).then(function (data) {
        if (data && data.ok && data.text) {
          _chapters[idx] = data.text;
        } else {
          _failCount++;
          var msg = (data && data.message) ? data.message : '알 수 없는 오류';
          console.warn('[자미두수 인생 총람] Chapter ' + (idx + 1) + ' 실패:', msg);
          _chapters[idx] = '⚠️ **이 챕터의 분석을 불러오는 데 실패했습니다.**\n\n오류: ' + msg + '\n\n잠시 후 다시 시도해 주세요.';
        }
        _setProgress(idx + 1);
        generateNext(idx + 1);
      });
    })(0);
  };

  /* ─────────────── PDF 다운로드 ─────────────── */
  window.downloadZiweiBookPdf = function () {
    if (!_chapters.some(Boolean)) {
      alert('먼저 자미두수 인생 총람을 생성해 주세요.');
      return;
    }
    var profile = window.__cdActiveBirthProfile || {};
    var name = (profile.name || '사용자') + '님의 자미두수 인생 총람';
    var birth = profile.birth || {};
    var birthStr = [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + (birth.day ? '일' : '');
    var issued = new Date().toLocaleDateString('ko-KR');

    var bodyHtml = '';
    for (var i = 0; i < 13; i++) {
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
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a0a2e;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#060312 0%,#120828 50%,#060312 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:0.75rem;letter-spacing:0.2em;color:#c4b5fd;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:2.8rem;font-weight:700;margin:0 0 12px;color:#f5f0ff;letter-spacing:0.05em;}' +
      '.cover-subtitle{font-size:1.1rem;color:#a78bfa;margin:0 0 16px;}' +
      '.cover-deco-line{width:80px;height:1px;background:rgba(167,139,250,0.4);margin:0 auto 24px;}' +
      '.cover-name{font-size:1.6rem;color:#fde68a;margin:0 0 8px;}' +
      '.cover-info{font-size:0.9rem;color:#94a3b8;margin:0 0 8px;}' +
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
        return '<div class="toc-item">' +
          '<div><div style="display:flex;gap:8px;align-items:baseline"><span class="toc-num">Chapter ' + (i + 1) + '</span>' +
          '<span class="toc-main">' + _escHtml(CHAPTER_TITLES[i]) + '</span></div>' +
          '<div style="padding-left:88px"><span class="toc-sub">' + _escHtml(CHAPTER_SUBTITLES[i]) + '</span></div></div>' +
          '</div>';
      }).join('') +
      '</div>' +
      bodyHtml +
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

  /* ─────────────── 챕터별 PDF 다운로드 ─────────────── */
  window.downloadZiweiChapterPdf = function (ch) {
    var idx = ch - 1;
    if (!_chapters[idx]) {
      alert('Ch.' + ch + ' 이 챕터가 아직 생성되지 않았습니다.');
      return;
    }
    var profile = window.__cdActiveBirthProfile || {};
    var birth = profile.birth || {};
    var issued = new Date().toLocaleDateString('ko-KR');
    var chapterHtml =
      '<div class="chapter">' +
      '<div class="chapter-header">' +
      '<span class="chapter-num">Chapter ' + ch + ' / 13</span>' +
      '<h2 class="chapter-title">' + _escHtml(CHAPTER_TITLES[idx]) + '</h2>' +
      '<p class="chapter-sub">' + _escHtml(CHAPTER_SUBTITLES[idx]) + '</p>' +
      '</div>' +
      '<div class="chapter-body">' + _md2html(_chapters[idx]) + '</div>' +
      '</div>';
    var fullHtml = '<!DOCTYPE html><html lang="ko"><head>' +
      '<meta charset="UTF-8">' +
      '<title>' + _escHtml(CHAPTER_TITLES[idx]) + '</title>' +
      '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Gowun+Dodum&display=swap");' +
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a0a2e;background:#fff;margin:0;padding:0;}' +
      '.cover-line{background:linear-gradient(135deg,#060312,#120828);color:#fff;padding:28px 48px;display:flex;justify-content:space-between;align-items:center;}' +
      '.cover-line .cl-badge{font-size:0.7rem;letter-spacing:0.18em;color:#c4b5fd;text-transform:uppercase;}' +
      '.cover-line .cl-name{font-size:0.9rem;color:#fde68a;}' +
      '.cover-line .cl-issued{font-size:0.8rem;color:#94a3b8;}' +
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

    if (action === 'gotoZiweiPremium' || action === 'openZiweiBookModal') {
      window.openZiweiBookModal();
      return;
    }
    if (action === 'closeZiweiBookModal') {
      window.closeZiweiBookModal();
      return;
    }
    if (action === 'generateZiweiBook') {
      var coinCost = Number(btn.getAttribute('data-coin-cost') || 590);
      if (coinCost > 0 && !btn.getAttribute('data-pvw-bypass')) {
        if (typeof window._cdDeductCoin === 'function') {
          window._cdDeductCoin(coinCost, function (ok) {
            if (ok) window.generateZiweiBook();
          });
          return;
        }
      }
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
      _chapters = Array(13).fill(null);
      _showScreen('zbStartScreen');
      var epBanner = _qs('zbEpilogueBanner');
      if (epBanner) epBanner.style.display = 'none';
      return;
    }
  });

})();
