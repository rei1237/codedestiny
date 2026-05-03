/**
 * 자미두수 인생 총람 (Ziwei Doushu Life Book) — 프리미엄 자미두수 심층 분석 + PDF 다운로드
 * CODE-DESTINY v1.0  •  자미두수(紫微斗數) 기반 인생 총람 생성기
 */
(function () {
  'use strict';

  var MIN_CHAPTER_CHARS = 5000;

  /* ─────────────── 챕터 상수 ─────────────── */
  var CHAPTER_TITLES = [
    '🌌 내 인생의 주인공 캐릭터 — 명궁(命宮) 완전 해독',
    '🌟 내면의 본체 — 신궁(身宮) 심층 분석과 잠재 무기',
    '🌙 무의식의 도화지 — 복덕궁(福德宮)으로 읽는 행복의 설계도',
    '🌍 세상이라는 무대 — 천이궁(遷移宮)과 이미지 관리',
    '👑 커리어와 성취 — 관록궁(官祿宮)의 천직 방정식',
    '💰 재화와 자산의 흐름 — 재백궁(財帛宮)의 부의 법칙',
    '💑 파트너십과 로맨스 — 부처궁(夫妻宮)의 인연 구조',
    '🤝 팀워크와 네트워크 — 교우궁(交友宮)의 인적 자원 법칙',
    '🏠 공간과 환경 — 전택궁(田宅宮)의 환경심리학',
    '💪 신체 에너지와 바이오리듬 — 질액궁(疾厄宮)의 건강 설계',
    '🌊 10년의 메가 트렌드 — 대한(大限) 분석과 전 생애 파노라마',
    '📅 올해의 마이크로 전술 — 2026 유년(流年)·유월(流月) 로드맵',
    '🌅 인생 설계도 총결산 — 자미두수 거장의 마스터플랜 봉서',
  ];

  var CHAPTER_SUBTITLES = [
    '명궁 주성·사화 완전 해독 — 타고난 핵심 성향·삼방사정·상황별 강점 활용 전략',
    '신궁 심층 분석 — 내면의 본체·잠재 무기·명궁과의 통합으로 완성되는 진짜 자아',
    '복덕궁 주성 분석 — 행복 DNA·스트레스 패턴·심상화 마인드 트레이닝',
    '천이궁 주성 분석 — 사회적 이미지·이미지 관리·외부 활동 황금 타이밍',
    '관록궁 주성 분석 — 업무 성향 DNA·천직 영역·오피스 심리학·커리어 도약 타이밍',
    '재백궁 주성 분석 — 재물 그릇·수입 파이프라인·파재성 역이용·황금 타이밍',
    '부처궁 주성 분석 — 이상형 성향·감정 비춤 패턴·관계 경계 설정·인연 타이밍',
    '교우궁 주성 분석 — 귀인 구별법·에너지 뱀파이어 차단·위임과 아웃소싱 전략',
    '전택궁 주성 분석 — 공간 심리학·인테리어 무드·깔끔한 정리법·자산 전략',
    '질액궁 주성 분석 — 오행 체질·스트레스 신체화 패턴·라이프스타일 의학 가이드',
    '현재 대한 완전 해독 — 상승장/하락장 전략 + 전 생애 파노라마 + 황금 대한 지목',
    '2026 소한 완전 해독 — Go/Hold/Retreat 판정 · 분기별·월별 마이크로 전술 로드맵',
    '13챕터 총결산 — 3가지 핵심 비책 · Master Habit · 거장의 천명 봉서(封書)',
  ];

  var LOADING_MSGS = [
    '명궁(命宮) 주성의 핵심 성향을 해독하는 중...',
    '신궁(身宮) 내면의 본체와 잠재 무기를 분석하는 중...',
    '복덕궁(福德宮)의 행복 DNA와 심상화 코드를 분석하는 중...',
    '천이궁(遷移宮)의 사회적 이미지 기운을 탐색하는 중...',
    '관록궁(官祿宮)의 천직 방정식을 계산하는 중...',
    '재백궁(財帛宮)의 재물 그릇과 부의 흐름을 읽는 중...',
    '부처궁(夫妻宮)의 인연 구조와 사랑의 거울을 해독하는 중...',
    '교우궁(交友宮)의 귀인 지도와 네트워크 전략을 탐색하는 중...',
    '전택궁(田宅宮)의 공간 에너지와 자산 라인을 분석하는 중...',
    '질액궁(疾厄宮)의 신체 에너지 바이오리듬을 해독하는 중...',
    '대한(大限) 10년 흐름과 전 생애 파노라마를 펼치는 중...',
    '2026 소한(小限) 월별 마이크로 전술을 로드맵으로 구성하는 중...',
    '인생 설계도 총결산 — 거장의 마스터플랜 봉서를 집필하는 중...',
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

  function _trace(stage, payload) {
    try {
      if (typeof window.__cdZiweiTrace === 'function') {
        window.__cdZiweiTrace(stage, payload || {});
      }
    } catch (_) {}
  }

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
      sessionStorage.setItem(_zbMakeKey(profile), JSON.stringify({
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
      var raw = sessionStorage.getItem(_zbMakeKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _zbClearSaved(profile) {
    try { sessionStorage.removeItem(_zbMakeKey(profile)); } catch (e) {}
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

    // 저장된 결과 복원 시도 — 유효 챕터 10개 이상(각 5000자+, ⚠️ 없음)이어야 복원
    var saved = _zbLoadSaved(profile);
    var _savedValidCount = saved && saved.chapters
      ? saved.chapters.filter(function(c) {
          return typeof c === 'string' && c.trim().length >= MIN_CHAPTER_CHARS && !/^⚠️/.test(c.trim());
        }).length
      : 0;
    if (_savedValidCount >= 10) {
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
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      modal.style.zIndex = '100120';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('lb-modal-open');
      try { modal.setAttribute('aria-hidden', 'false'); } catch(_) {}
      return;
    }

    _chapters = Array(13).fill(null);
    _currentChapter = 1;
    _showScreen('zbStartScreen');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
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
    if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  /* ─────────────── 생성 로직 ─────────────── */
  window.generateZiweiBook = function () {
    if (_generating) return;
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

    if (!ziweiData || ziweiData.length < 20) {
      _generating = false;
      _trace('FLOW_ABORT_ZIWEI_DATA_MISSING', { length: ziweiData ? ziweiData.length : 0 });
      alert('자미두수 데이터를 불러오지 못했습니다. 생년월일을 입력하고 사주 분석을 먼저 실행해 주세요.');
      return;
    }

    _showScreen('zbLoadingScreen');

    var progressBar = _qs('zbProgressBar');
    var progressText = _qs('zbProgressText');
    var stageEl = _qs('zbLoadingStageText');
    if (!stageEl && progressText && progressText.parentElement) {
      stageEl = document.createElement('div');
      stageEl.id = 'zbLoadingStageText';
      stageEl.style.cssText = 'margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(124,58,237,0.12);border:1px solid rgba(167,139,250,0.35);font-size:0.83rem;color:#ddd6fe;line-height:1.45;';
      progressText.parentElement.appendChild(stageEl);
    }
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
      var pct = Math.round((done / 13) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / 13 챕터 완성 (' + pct + '%)';
      if (stageEl) {
        var _phase = done === 0
          ? '데이터 검증 및 명반 정렬 중'
          : (done < 13 ? ('AI가 Chapter ' + (done + 1) + ' 분석 중') : 'PDF 저장 준비 완료');
        stageEl.textContent = '진행 단계: ' + _phase;
      }
      if (chapterMsg && done < 13) chapterMsg.textContent = LOADING_MSGS[done] || '분석 중...';
      if (chapterMsg && done >= 13) chapterMsg.textContent = '자미두수 인생 총람이 완성되었습니다 ✦';
      if (chapterNumEl) chapterNumEl.textContent = done < 13 ? 'Chapter ' + (done + 1) : '✦ 완성 ✦';
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
        var isActive = ch === done + 1 && done < 13;
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

    function _fetchChapter(idx) {
      var _zbAuthToken = '';
      try { _zbAuthToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
      return new Promise(function (resolve) {
        var timeoutId = setTimeout(function () {
          resolve({ ok: false, message: '응답 시간 초과 (60초).' });
        }, 60000);
        var _zbHeaders = { 'Content-Type': 'application/json' };
        if (_zbAuthToken) _zbHeaders['Authorization'] = 'Bearer ' + _zbAuthToken;
        fetch('/api/ziwei-book/session', {
          method: 'POST',
          headers: _zbHeaders,
          body: JSON.stringify({
            sessionId:   idx + 1,
            ziweiData:   ziweiData,
            ziweiStructured: _collectZiweiStructuredData(),
            birthYear:   _zbProfile.birthYear,
            birthMonth:  _zbProfile.birthMonth,
            birthDay:    _zbProfile.birthDay,
            birthHour:   _zbProfile.birthHour,
            gender:      _zbProfile.gender,
            name:        _zbProfile.name,
          }),
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
        var _validCount = _chapters.filter(function(c) {
          return typeof c === 'string' && c.trim().length >= MIN_CHAPTER_CHARS && !/^⚠️/.test(c.trim());
        }).length;
        _trace('PDF_GENERATION_COMPLETE', { validChapters: _validCount, totalChapters: 13 });
        if (_validCount < 10) {
          var errEl = _qs('zbErrorMsg');
          if (errEl) errEl.textContent = _validCount === 0
            ? '모든 챕터 생성에 실패했습니다. API 키 설정 또는 네트워크를 확인해 주세요.\n잠시 후 다시 시도해 주세요.'
            : '챕터 생성이 불완전합니다 (성공 ' + _validCount + '/13). 다시 시도해 주세요.';
          _zbClearSaved(window.__cdActiveBirthProfile || {});
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
        var _zbText = data && typeof data.text === 'string' ? data.text.trim() : '';
      if (data && data.ok && _zbText.length >= MIN_CHAPTER_CHARS) {
          _chapters[idx] = data.text;
          _trace('CHAPTER_DATA_RECEIVED', { chapter: idx + 1, length: _zbText.length });
        } else {
          _failCount++;
          var msg = (data && data.message) ? data.message : '알 수 없는 오류';
          _trace('CHAPTER_DATA_FAILED', { chapter: idx + 1, message: msg });
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
      '<meta name="color-scheme" content="light">' +
      '<title>' + _escHtml(CHAPTER_TITLES[idx]) + '</title>' +
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

  // mobile-interaction-patch LAZY_LOAD_ACTIONS 호환: window.gotoZiweiPremium 래퍼
  window.gotoZiweiPremium = function() { window.openZiweiBookModal(); };

})();
