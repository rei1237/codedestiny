/**
 * 인생의 책 (Life Book) — 프리미엄 사주 심층 분석 + PDF 다운로드
 * CODE-DESTINY v1.0
 */
(function () {
  'use strict';

  /* ─────────────── 상수 ─────────────── */
  var CHAPTER_TITLES = [
    '📜 사주 원국 완전 해설',
    '🏛️ 나의 설계도',
    '⚔️ 숨겨진 무기',
    '🌀 대운 정밀 분석',
    '👑 사회적 소명',
    '🤝 관계의 전략',
    '💑 연애·결혼 완전 분석',
    '💰 재물·직업 완전 전략',
    '🏥 건강·심신 에너지',
    '🔮 신살·12운성·퀀텀 명리',
    '📅 2026 丙午年 로드맵',
    '🌅 생애 마스터플랜',
    '💌 거장의 최종 전략 제언',
  ];

  var CHAPTER_SUBTITLES = [
    '팔자 8글자 — 년주·월주·일주·시주 완전 해독',
    '타고난 기질과 월지·일간·조후 판정',
    '용신·희신·기신과 나만의 천직 필살기',
    '전생애 대운 표와 현재 대운 심층 분석',
    '격국·상신·구신과 성공 방정식',
    '충·합·육신의 인연 법칙과 파트너십',
    '일지·관성·재성으로 본 사랑 설계도',
    '재성·식상·격국으로 설계하는 부의 지도',
    '오행별 신체 지도와 에너지 관리 전략',
    '신살·12운성·공망·퀀텀 잠재력 해독',
    '丙午年 12개월 Monthly Go/Stop 전략',
    '유년부터 노년까지 대운별 인생 파노라마',
    '12챕터 총결산 · 귀인운 · 3가지 핵심 비책',
  ];

  var LOADING_MSGS = [
    '사주 원국 팔자 8글자와 기둥별 의미를 해독하는 중...',
    '월지·일간·조후·신강신약을 분석하는 중...',
    '용신·희신·기신과 천직 강점을 탐색하는 중...',
    '대운 전체 흐름과 현재 대운을 정밀 분석하는 중...',
    '격국·상신·사회적 소명을 해독하는 중...',
    '충·합·육신 관계 역학을 매핑하는 중...',
    '연애·결혼 구조와 이상형 프로파일을 분석하는 중...',
    '재성·식상·부의 그릇과 직업 전략을 계산하는 중...',
    '오행별 건강 지도와 심신 에너지를 분석하는 중...',
    '신살·12운성·공망·퀀텀 잠재력을 탐색하는 중...',
    '2026 丙午年 월별 로드맵을 작성하는 중...',
    '대운별 생애 파노라마를 조망하는 중...',
    '거장의 최종 전략과 귀인운을 집필하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '팔자(八字) 여덟 글자 속에 당신만의 우주가 담겨 있습니다.',
    '태어난 순간의 하늘 기운이 지금도 당신 안에서 흐르고 있습니다.',
    '천간(天干)과 지지(地支)가 엮어낸 운명의 실타래를 풀어냅니다.',
    '용신(用神)의 빛이 당신이 가야 할 길을 밝히고 있습니다.',
    '대운(大運)은 인생의 계절입니다. 지금 어느 계절을 지나고 있는지 읽습니다.',
    '음양(陰陽)의 균형 속에서 당신만의 해답이 나타나고 있습니다.',
    '오행(五行)의 흐름이 당신의 건강·재물·사랑을 결정합니다.',
    '격국(格局)은 하늘이 당신에게 부여한 사회적 사명입니다.',
    '충(沖)과 합(合)의 자리에서 인연의 법칙을 발견합니다.',
    '재성(財星)의 위치가 당신의 부(富)의 그릇을 말해줍니다.',
    '귀인(貴人)이 나타나는 시기와 장소를 계산하고 있습니다.',
    '삶의 파도를 읽어 오직 당신을 위한 전략으로 엮겠습니다.',
    '신강신약(身强身弱)의 경계에서 당신의 진짜 강점이 드러납니다.',
    '하늘이 숨긴 천기(天機)를 펼쳐 당신의 이름으로 기록합니다.',
  ];

  var MIN_CHAPTER_CHARS = 6000;
  var MIN_TOTAL_CHARS = 65500;

  /* ─────────────── 상태 ─────────────── */
  var _chapters = Array(13).fill(null);
  var _chapterSubtitles = CHAPTER_SUBTITLES.slice();
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var _activeRequestController = null;
  var _cancelGeneration = false;

  function _abortActiveRequest() {
    if (_activeRequestController) {
      try { _activeRequestController.abort(); } catch (_) {}
      _activeRequestController = null;
    }
  }

  /* ─────────────── 유틸 ─────────────── */
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

    // blockquote (must run before > is treated as escaped)
    h = h.replace(/^&gt; (.+)$/gm, '<blockquote class="lb-md-blockquote">$1</blockquote>');
    // merge consecutive blockquotes
    h = h.replace(/<\/blockquote>\n<blockquote class="lb-md-blockquote">/g, '<br>');

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
      if (/^<(h[1-4]|ul|li|hr|blockquote)/.test(line) || /<\/(h[1-4]|ul|li|hr|blockquote)>$/.test(line)) {
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

    // ── 오행 분포
    var analysis = snap.analysis || snap.saju || {};
    if (analysis.elementWeights) {
      var w = analysis.elementWeights;
      lines.push('\n【오행(五行) 분포 — 퀀텀 명리 엔진】');
      lines.push('목(木): ' + (w.wood || 0) + '% | 화(火): ' + (w.fire || 0) + '% | 토(土): ' + (w.earth || 0) + '% | 금(金): ' + (w.metal || 0) + '% | 수(水): ' + (w.water || 0) + '%');
      // 최강/최약 오행
      var elArr = [['목(木)',w.wood||0],['화(火)',w.fire||0],['토(土)',w.earth||0],['금(金)',w.metal||0],['수(水)',w.water||0]];
      elArr.sort(function(a,b){return b[1]-a[1];});
      lines.push('최강 오행: ' + elArr[0][0] + ' (' + elArr[0][1] + '%) → 과다 시 기신 작용 주의');
      lines.push('최약 오행: ' + elArr[4][0] + ' (' + elArr[4][1] + '%) → 결핍 기운, 용신 후보');
    }

    // ── [1부 나의 설계도] 월지·일간·지지 심화
    var G_PILLARS_R = window.G_PILLARS;
    if (G_PILLARS_R) {
      lines.push('\n【1부. 나의 설계도 — 월지·일간·지지 정밀 분석】');
      if (G_PILLARS_R.m && G_PILLARS_R.m.j) {
        lines.push('월지(月支): ' + G_PILLARS_R.m.j + (G_PILLARS_R.m.jE ? ' [' + G_PILLARS_R.m.jE + ']' : '') + ' → 태어난 계절·환경의 기운. 삶의 무대와 난이도를 결정');
      }
      if (G_PILLARS_R.d) {
        lines.push('일간(日干): ' + (G_PILLARS_R.d.g||'') + (G_PILLARS_R.d.gE ? ' [' + G_PILLARS_R.d.gE + ']' : '') + ' → 나의 핵심 정체성, 주도적 vs 협조적 기질의 근원');
        lines.push('일지(日支): ' + (G_PILLARS_R.d.j||'') + (G_PILLARS_R.d.jE ? ' [' + G_PILLARS_R.d.jE + ']' : '') + ' → 나의 내면 심성, 배우자궁, 감정의 결');
      }
      // 지지 4개 — 내 인생 반복 패턴
      var zhiList = [];
      ['y','m','d','h'].forEach(function(k){
        if (G_PILLARS_R[k] && G_PILLARS_R[k].j) zhiList.push(G_PILLARS_R[k].j + (G_PILLARS_R[k].jE ? '['+G_PILLARS_R[k].jE+']' : ''));
      });
      if (zhiList.length) lines.push('지지(地支) 전체: ' + zhiList.join(' · ') + ' → 삶에 반복 출현하는 상황 패턴');
      // 계절(조후)
      var johuType = (window.G_JOHU && window.G_JOHU.type) ? window.G_JOHU.type : (analysis.johuType || analysis.johu_type || '');
      if (johuType) lines.push('조후(調候) 판정: ' + johuType + (johuType==='hot'?' — 뜨거운 여름 사주, 水·金 환경에서 능력 최대화':johuType==='cold'?' — 차가운 겨울 사주, 火·木 환경에서 능력 최대화':johuType==='warm'?' — 따뜻한 봄/여름 사주':johuType==='cool'?' — 선선한 가을/겨울 사주':''));
    }

    // ── [2부 숨겨진 무기] 용신·희신·Specialist vs Generalist
    var G_POWER = window.G_POWER;
    var G_JOHU = window.G_JOHU;
    lines.push('\n【2부. 숨겨진 무기 — 용신·희신·천직 특성 분석】');
    if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
      lines.push('용신(用神): ' + analysis.yongshin_elements.join(', ') + ' → 내가 가장 잘 쓸 수 있는 필살기 오행');
    }
    if (analysis.kishin_elements && analysis.kishin_elements.length) {
      lines.push('기신(忌神): ' + analysis.kishin_elements.join(', ') + ' → 에너지를 소진시키는 장애 오행');
    }
    if (G_POWER) {
      if (G_POWER.yongshin) lines.push('용신 상세: ' + (Array.isArray(G_POWER.yongshin) ? G_POWER.yongshin.join(', ') : G_POWER.yongshin));
      if (G_POWER.kijishin && G_POWER.kijishin.length) lines.push('기신 상세: ' + G_POWER.kijishin.join(', '));
    }
    // 일간/신강신약
    if (analysis.dayStem) lines.push('일간(日干): ' + analysis.dayStem);
    if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label + (analysis.power_label==='신강'?' — 자기 주도성 강, 에너지 과다 주의. 상관·식신으로 발산 권장':' — 지지 기반 필요. 인성·비겁 운에서 비약적 성장'));
    if (analysis.isJong) lines.push('격 판정: ' + (analysis.jongName || '종격') + ' — 종격은 용신을 따르는 방향으로 거스르지 말 것');

    // Specialist vs Generalist 판별
    // G_POWER.groups는 calcPower() 반환값에 없으므로 G_PILLARS 기반으로 직접 계산
    var _tgGroups = null;
    if (G_PILLARS_R && G_PILLARS_R.d && G_PILLARS_R.d.g && typeof window.getTenGod === 'function') {
      var _dg = G_PILLARS_R.d.g;
      _tgGroups = {};
      [
        G_PILLARS_R.y && G_PILLARS_R.y.g, G_PILLARS_R.y && G_PILLARS_R.y.j,
        G_PILLARS_R.m && G_PILLARS_R.m.g, G_PILLARS_R.m && G_PILLARS_R.m.j,
        G_PILLARS_R.d && G_PILLARS_R.d.j,
        G_PILLARS_R.h && G_PILLARS_R.h.g, G_PILLARS_R.h && G_PILLARS_R.h.j
      ].forEach(function (c) {
        if (!c) return;
        var t = window.getTenGod(_dg, c);
        if (t && t !== '?' && t !== '일간') _tgGroups[t] = (_tgGroups[t] || 0) + 1;
      });
    } else if (G_POWER && G_POWER.groups) {
      _tgGroups = G_POWER.groups;
    }
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      lines.push('\n【십성(十星) 분포 — Specialist/Generalist 판별 기반】');
      var gk = Object.keys(_tgGroups);
      for (var gi = 0; gi < gk.length; gi++) {
        lines.push(gk[gi] + ': ' + _tgGroups[gk[gi]]);
      }
      // Specialist: 관성 강하고 비겁 약 / Generalist: 식상 강하고 재성 발달
      var grp = _tgGroups;
      var hasStrongKwan = (grp['정관']||0) + (grp['편관']||0) > 2;
      var hasStrongSik = (grp['식신']||0) + (grp['상관']||0) > 2;
      var hasStrongJae = (grp['정재']||0) + (grp['편재']||0) > 2;
      lines.push('천직 기질: ' + (hasStrongKwan && !hasStrongSik ? 'Specialist형 — 한 분야의 전문 장인, 체계·규범·조직 안에서 빛남' : hasStrongSik && hasStrongJae ? 'Generalist(창업가)형 — 아이디어를 돈으로 전환, 판을 넓히는 사업가' : '균형형 — 전문성과 유연성을 함께 발휘'));
    }

    // ── [3부 관계의 전략] 상충·합·육신
    lines.push('\n【3부. 관계의 전략 — 상충·합·육신 분석】');
    if (G_PILLARS_R) {
      // 천간합 탐색
      var GAN_PAIRS = [['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']];
      var GAN_PAIR_EL = ['토(土)','금(金)','수(水)','목(木)','화(火)'];
      var ganList = ['y','m','d','h'].map(function(k){ return G_PILLARS_R[k] && G_PILLARS_R[k].g || ''; });
      var hapFound = [];
      GAN_PAIRS.forEach(function(p,i){
        var cnt0 = ganList.filter(function(g){return g===p[0];}).length;
        var cnt1 = ganList.filter(function(g){return g===p[1];}).length;
        if (cnt0 > 0 && cnt1 > 0) hapFound.push(p[0]+'·'+p[1]+' 천간합 → '+GAN_PAIR_EL[i]+' 화합, 전략적 파트너십 기운');
      });
      if (hapFound.length) lines.push('천간합(天干合): ' + hapFound.join(' / '));
      // 지지충 탐색
      var JI_CHUNG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
      var jiList = ['y','m','d','h'].map(function(k){ return G_PILLARS_R[k] && G_PILLARS_R[k].j || ''; });
      var chungFound = [];
      JI_CHUNG.forEach(function(p){
        var c0 = jiList.filter(function(j){return j===p[0];}).length;
        var c1 = jiList.filter(function(j){return j===p[1];}).length;
        if (c0>0 && c1>0) chungFound.push(p[0]+'·'+p[1]+' 충(沖)');
      });
      if (chungFound.length) lines.push('지지충(地支沖): ' + chungFound.join(' / ') + ' → 변화의 자극, 성장 트리거이자 예기치 못한 변동 신호');
      else lines.push('지지충: 원국 내 주요 충 없음 — 비교적 안정적 흐름');
      // 삼합/육합 탐색
      var YUKHAP = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
      var yukFound = [];
      YUKHAP.forEach(function(p){
        if (jiList.indexOf(p[0])>=0 && jiList.indexOf(p[1])>=0) yukFound.push(p[0]+'·'+p[1]+' 육합(六合)');
      });
      if (yukFound.length) lines.push('육합(六合): ' + yukFound.join(' / ') + ' → 파트너십·제휴에서 강력한 시너지');
    }
    // 육신(六神) — 타인이 보는 나 vs 내가 바라보는 세상
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      var g = _tgGroups;
      var topStar = '';
      var topVal = 0;
      Object.keys(g).forEach(function(k){ if((g[k]||0)>topVal){topVal=g[k];topStar=k;} });
      var starDesc = {
        '정관': '타인 평가: 책임감 있고 신뢰할 수 있는 사람. 내가 바라보는 세상: 규범·질서·명예가 최우선',
        '편관': '타인 평가: 강렬하고 카리스마 있는 사람. 내가 바라보는 세상: 도전·극복·리더십이 삶의 이유',
        '정재': '타인 평가: 성실하고 믿음직한 사람. 내가 바라보는 세상: 안정된 자산과 현실 결과가 가장 중요',
        '편재': '타인 평가: 매력적이고 사교적인 사람. 내가 바라보는 세상: 기회·확장·자유로운 재물 흐름',
        '식신': '타인 평가: 온화하고 재능 있는 사람. 내가 바라보는 세상: 표현·창조·즐거움이 삶의 핵심',
        '상관': '타인 평가: 개성 강하고 독창적인 사람. 내가 바라보는 세상: 기존 틀을 깨는 혁신과 자유',
        '비견': '타인 평가: 주관·독립심이 강한 사람. 내가 바라보는 세상: 경쟁과 자립이 성장의 원동력',
        '겁재': '타인 평가: 도전적이고 추진력 있는 사람. 내가 바라보는 세상: 승부·쟁취·역동적 변화',
        '정인': '타인 평가: 지성적이고 배려 깊은 사람. 내가 바라보는 세상: 학문·배움·내면 성숙이 삶의 목적',
        '편인': '타인 평가: 신비롭고 독특한 사람. 내가 바라보는 세상: 직관·영적 통찰·비주류적 가치'
      };
      if (topStar && starDesc[topStar]) {
        lines.push('주도 십성(육신): ' + topStar + ' — ' + starDesc[topStar]);
      }
    }

    // ── [4부 사회적 소명] 격국·상신·구신
    lines.push('\n【4부. 사회적 소명 — 격국·상신·구신 분석】');
    if (snap.saju && snap.saju.notes && snap.saju.notes.length) {
      lines.push('격 판정 노트: ' + snap.saju.notes.join(' / '));
    }
    if (johuType) lines.push('조후(調候): ' + johuType);
    // 격국 추론 (월지 기반)
    if (G_PILLARS_R && G_PILLARS_R.m) {
      var monthG = G_PILLARS_R.m.g || '';
      var monthJ = G_PILLARS_R.m.j || '';
      lines.push('격국 기반 월주: ' + monthG + monthJ + ' → 이 월주가 격국(格局)과 직업적성·사회적 그릇의 틀을 결정');
    }
    lines.push('상신(相神): 용신을 돕는 조력 오행 = ' + (analysis.yongshin_elements ? analysis.yongshin_elements.join(' 계열') + ' 관련 인맥·환경·직업' : '사주 상세 분석 필요'));
    lines.push('구신(仇神): 기신(忌神) ' + (analysis.kishin_elements ? analysis.kishin_elements.join(', ') : '') + ' → 고난 끝에 결국 내 것이 되는 역설적 결과 오행 — 극복 후 최대 무기로 전환');

    // ── [5부 부와 사랑] 재물운·애정운·건강운
    lines.push('\n【5부. 부와 사랑 — 재물운·애정운·건강운】');
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      var gg = _tgGroups;
      var jaeTotal = (gg['정재']||0) + (gg['편재']||0);
      var gwanTotal = (gg['정관']||0) + (gg['편관']||0);
      var sikTotal = (gg['식신']||0) + (gg['상관']||0);
      lines.push('재물 그릇(재성 총량): ' + jaeTotal + '개 — ' + (jaeTotal >= 3 ? '재성 풍부. 단, 겁재가 강하면 재물 유출 주의' : jaeTotal >= 1 ? '적정 재물 기운. 식상 활성화 시 재물이 따름' : '재성 약. 전문 기술(식상)을 먼저 키워야 재물이 열림'));
      lines.push('돈그릇 모양: ' + (gg['편재']||0 > gg['정재']||0 ? '편재형 — 공격적 투자형, 사업·주식·부동산 등 변동성 자산에 강점' : '정재형 — 안정적 저축형, 꾸준한 수입·안전 자산 선호'));
      lines.push('애정 구조: ' + (gwanTotal > 0 ? '관성 발달 — 책임 기반 연애, 진지한 관계 지향' : sikTotal > 2 ? '식상 강 — 매력·표현력 넘치는 연애, 자유로운 감정 표현' : '비겁 강 — 독립심 강해 주체적 연애, 상대방 존중이 관계의 열쇠'));
    }
    if (analysis.elementWeights) {
      var hw = analysis.elementWeights;
      var weakEl = '';
      var minV = 999;
      [['목(木)',hw.wood||0],['화(火)',hw.fire||0],['토(土)',hw.earth||0],['금(金)',hw.metal||0],['수(水)',hw.water||0]].forEach(function(e){ if(e[1]<minV){minV=e[1];weakEl=e[0];} });
      lines.push('건강 취약 오행: ' + weakEl + ' — ' + {'목(木)':'간·담·근육·눈 계열 주의, 스트레스 해소 필수', '화(火)':'심장·소장·혈관·정신 에너지 소진 주의', '토(土)':'소화기·비위·췌장, 과식·불규칙 식사 주의', '금(金)':'폐·대장·피부·호흡기 주의, 환절기 건강 관리', '수(水)':'신장·방광·생식기·뼈 주의, 수분 보충 중요'}[weakEl]);
      lines.push('타고난 에너지 총량: ' + (analysis.power_label === '신강' ? '신강(身强) — 에너지가 넘쳐 과로·번아웃 주의. 정기적 운동과 이완 필수' : '신약(身弱) — 에너지 효율적 분배 필요. 무리한 다중 역할보다 선택과 집중이 건강의 핵심'));
    }

    // ── [6부 2026 실전 로드맵]
    lines.push('\n【6부. 2026 丙午 실전 로드맵 — 신년 행동 지침】');
    lines.push('2026년 세운(歲運): 丙午年 — 천간 丙(병,火)·지지 午(오,火). 화(火) 기운이 천지를 뒤덮는 해');
    // 용신/기신에 따른 2026 판단
    var yong = analysis.yongshin_elements || [];
    var ki = analysis.kishin_elements || [];
    var is2026Good = yong.indexOf('火') >= 0 || yong.indexOf('화') >= 0 || yong.indexOf('fire') >= 0;
    var is2026Bad = ki.indexOf('火') >= 0 || ki.indexOf('화') >= 0 || ki.indexOf('fire') >= 0;
    lines.push('2026 용신/기신 판정: ' + (is2026Good ? '🔥 丙午 火 기운이 용신 — 2026년은 적극 행동의 해! Go 시즌' : is2026Bad ? '⚠️ 丙午 火 기운이 기신 — 2026년은 내실 강화의 해. Stop→내공 축적' : '🌀 중립 — 2026년은 전략적 선별 행동의 해'));
    lines.push('타이밍 전략(Go/Stop): ' + (is2026Good ? '봄(1~3월) 씨앗 심기 → 여름(5~7월) 폭발 성장 → 가을(9~10월) 수확. 무리한 확장보다 핵심 1개 승부' : '상반기 조심(충돌·과소비 금지), 하반기 2027 준비 기간. 丙午충 원국 있으면 환경 변동 대비'));
    lines.push('2026년 핵심 키워드: ' + (is2026Good ? '가시성·도전·사회적 인정·관계 확장' : is2026Bad ? '내실·절제·전문성 심화·재정 안정' : '균형·선택과 집중·관계 정리·핵심 역량'));
    // 월별 정보 기반 (현재 연도/월)
    var nowMonth = new Date().getMonth() + 1; // 1~12
    lines.push('현재 월(2026년 ' + nowMonth + '월) 기운: 올해 가장 주의할 월 — 기신 오행이 강해지는 달(月)에 큰 결정 자제, 용신 달에 승부');

    // ── 대운
    var G_DAEWUN = window.G_DAEWUN || window.G_DAEUN;
    if (G_DAEWUN && Array.isArray(G_DAEWUN) && G_DAEWUN.length) {
      lines.push('\n【대운(大運) 전체 흐름 — 생애 마스터플랜 기반】');
      for (var di = 0; di < Math.min(G_DAEWUN.length, 12); di++) {
        var dw = G_DAEWUN[di];
        if (dw) {
          lines.push((dw.age || '') + '세 대운: ' + (dw.g || '') + (dw.j || '') + (dw.gE ? ' [' + dw.gE + ']' : '') + (dw.jE ? '/' + dw.jE : ''));
        }
      }
    }

    // ── 현재 나이 + 현재 대운(大運) 식별
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n현재 나이: ' + currentAge + '세 (만 ' + (currentAge - 1) + '세)');
      lines.push('현재 기준年: 2026년 丙午年');
      // 현재 진행 중인 대운 식별
      if (G_DAEWUN && Array.isArray(G_DAEWUN) && G_DAEWUN.length) {
        var currentDw = null;
        for (var cdi = 0; cdi < G_DAEWUN.length - 1; cdi++) {
          var dwCur = G_DAEWUN[cdi];
          var dwNext = G_DAEWUN[cdi + 1];
          if (dwCur && dwNext && dwCur.age <= currentAge && currentAge < dwNext.age) {
            currentDw = dwCur;
            break;
          }
        }
        if (!currentDw && G_DAEWUN.length > 0) currentDw = G_DAEWUN[G_DAEWUN.length - 1];
        if (currentDw) {
          lines.push('\n【⭐ 현재 진행 중인 대운(大運) — 핵심 분석 대상】');
          lines.push('현재 대운: ' + (currentDw.g || '') + (currentDw.j || '') +
            (currentDw.gE ? ' [' + currentDw.gE + '/' + currentDw.jE + ']' : ''));
          lines.push('대운 진입 나이: ' + currentDw.age + '세 → 현재 나이 ' + currentAge + '세 (대운 경과: ' + (currentAge - currentDw.age) + '년)');
        }
      }
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

  /** DOM 입력값에서 생년월일 복구 */
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
      /* 출생지: 모달 전용 선택기를 우선, 없으면 메인 폼 선택기 사용 */
      var locationData = { label: '대한민국 (서울)', lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
      var countrySel = document.getElementById('lbBirthCountry') || document.getElementById('birthCountry');
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
        birth: {
          year: y, month: m, day: d,
          hour: hourEl ? Number(hourEl.value) : 12,
          minute: minEl ? Number(minEl.value) : 0
        },
        location: locationData
      };
    } catch (_) { return null; }
  }

  /** 사주 데이터 유효성 확인 (여러 소스 순서대로 체크) */
  function _getActiveBirthProfile() {
    // 1순위: window.__cdActiveBirthProfile (사주 계산 후 설정)
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    // 2순위: destiny flower 스냅샷
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    // 3순위: DOM 입력값 직접 읽기
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    return null;
  }

  /* ── localStorage 저장/복원 ── */
  var _LB_STORE_VER = 'lb_v1_';

  function _lbMakeKey(profile) {
    var b = (profile && profile.birth) || {};
    return _LB_STORE_VER + (b.year || '0') + '_' + (b.month || '0') + '_' + (b.day || '0') + '_' + ((profile && profile.gender) || 'u');
  }

  function _lbSaveResult(profile) {
    try {
      localStorage.setItem(_lbMakeKey(profile), JSON.stringify({
        chapters: _chapters,
        subtitles: _chapterSubtitles,
        totalChars: _chapters.reduce(function (acc, c) { return acc + (typeof c === 'string' ? c.trim().length : 0); }, 0),
        name: (profile && profile.name) || '사용자',
        birth: (profile && profile.birth) || {},
        gender: (profile && profile.gender) || '',
        savedAt: new Date().toISOString()
      }));
    } catch (e) { /* 용량 초과 또는 브라우저 제한 */ }
  }

  function _lbLoadSaved(profile) {
    try {
      var raw = localStorage.getItem(_lbMakeKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _lbClearSaved(profile) {
    try { localStorage.removeItem(_lbMakeKey(profile)); } catch (e) {}
  }

  window.openLifeBookModal = function () {
    var modal = _qs('lifeBookModal');
    if (!modal) {
      console.error('[인생의 책] lifeBookModal 요소를 찾을 수 없습니다.');
      return;
    }

    var profile = _getActiveBirthProfile();
    // ★ 프로필 없으면 localStorage 운명 카드(Destiny Profile)에서 복구 시도
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
      // 입력 폼으로 스크롤 유도
      var _lbFormEl = document.getElementById('birthDate') || document.getElementById('run-btn');
      if (_lbFormEl) { try { _lbFormEl.scrollIntoView({behavior:'smooth',block:'center'}); } catch(_){} }
      alert('📜 인생의 책을 생성하려면 생년월일 · 출생 시간을 입력하고 "사주 분석 시작"을 눌러주세요.');
      return;
    }

    // 복구된 프로필이 있으면 window에 주입
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    // 저장된 데이터 복원 시도 — 13개 챕터 모두 최소 글자수 조건을 만족해야 복원
    var saved = _lbLoadSaved(profile);
    var _savedValidCount = saved && saved.chapters
      ? saved.chapters.filter(function(c) {
          return typeof c === 'string' && c.trim().length >= MIN_CHAPTER_CHARS && !/^⚠️/.test(c.trim());
        }).length
      : 0;
    var _savedTotalChars = saved && Array.isArray(saved.chapters)
      ? saved.chapters.reduce(function (acc, c) {
          return acc + (typeof c === 'string' ? c.trim().length : 0);
        }, 0)
      : 0;
    var hasValidCache = _savedValidCount === 13 && _savedTotalChars >= MIN_TOTAL_CHARS;
    if (hasValidCache) {
      _chapters = saved.chapters;
      _chapterSubtitles = (saved && Array.isArray(saved.subtitles) && saved.subtitles.length === 13)
        ? saved.subtitles
        : CHAPTER_SUBTITLES.slice();
      _currentChapter = 1;
      _showScreen('lbResultScreen');
      _updateTocState();
      _renderChapter(1);
      _bindToc();
      var nameEl = _qs('lbResultName');
      var dateEl = _qs('lbResultDate');
      if (nameEl) nameEl.textContent = '📜 ' + (saved.name || '사용자') + '님의 인생의 책';
      if (dateEl) {
        var b = saved.birth || {};
        var savedDate = saved.savedAt ? new Date(saved.savedAt).toLocaleDateString('ko-KR') : '';
        dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · ' +
          (saved.gender === 'F' ? '여성' : saved.gender === 'M' ? '남성' : '') +
          (savedDate ? ' · 💾 ' + savedDate + ' 저장' : '');
      }
      // 저장된 결과 복원 시 마무리 배너 표시
      var lbEpBannerSaved = _qs('lbEpilogueBanner');
      if (lbEpBannerSaved) lbEpBannerSaved.style.display = '';
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      try {
        modal.setAttribute('aria-hidden', 'false');
        var closeBtn2 = modal.querySelector('.lb-modal__close');
        if (closeBtn2) setTimeout(function () { closeBtn2.focus(); }, 60);
      } catch (_) {}
      return;
    }

    _chapters = Array(13).fill(null);
    _chapterSubtitles = CHAPTER_SUBTITLES.slice();
    _currentChapter = 1;
    _showScreen('lbStartScreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    /* 출생지 선택기 초기화 */
    if (typeof window.populateCountrySelectById === 'function') {
      var locLabel = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.location && window.__cdActiveBirthProfile.location.label)
        ? window.__cdActiveBirthProfile.location.label : '대한민국 (서울)';
      window.populateCountrySelectById('lbBirthCountry', locLabel);
    }

    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.lb-modal__close');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    } catch (_) {}
  };

  window.closeLifeBookModal = function () {
    var modal = _qs('lifeBookModal');
    if (!modal) return;
    _cancelGeneration = true;
    _generating = false;
    _abortActiveRequest();
    if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
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
      '<p class="lb-chapter-sub">' + _escHtml((_chapterSubtitles[idx] || CHAPTER_SUBTITLES[idx] || '')) + '</p>' +
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

    var profile = _getActiveBirthProfile();
    if (!profile) {
      alert('사주 계산을 먼저 완료해 주세요.');
      return;
    }
    // 복구된 프로필 주입
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    /* 모달 출생지 선택기 값으로 위치 재설정 */
    var lbCountrySel = document.getElementById('lbBirthCountry');
    if (lbCountrySel && lbCountrySel.selectedIndex >= 0) {
      var _selOpt = lbCountrySel.options[lbCountrySel.selectedIndex];
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
        /* 선택된 위치로 사주 원국 재계산 */
        if (typeof window.computeProfileForModal === 'function') {
          window.computeProfileForModal(profile);
        }
      }
    }

    _generating = true;
    _cancelGeneration = false;
    _chapters = Array(13).fill(null);
    _chapterSubtitles = CHAPTER_SUBTITLES.slice();
    // 사주 분석 화면과 100% 일치하도록 G_PILLARS 등 전역 변수 재계산
    if (typeof window.computeProfileForModal === 'function' && profile && profile.birth) {
      try { window.computeProfileForModal(profile); } catch (_cpE) {}
    }
    var sajuData = _collectSajuData();

    // 사주 데이터가 최소한으로 채워졌는지 확인
    if (!sajuData || sajuData.length < 30) {
      _generating = false;
      alert('사주 데이터를 불러오지 못했습니다. 생년월일을 입력하고 사주 분석을 먼저 실행해 주세요.');
      return;
    }

    _showScreen('lbLoadingScreen');

    var progressBar = _qs('lbProgressBar');
    var progressText = _qs('lbProgressText');
    var chapterMsg = _qs('lbLoadingChapter');
    var chapterNumEl = _qs('lbLoadingChapterNum');
    var mysticEl = _qs('lbMysticQuote');

    // 신비 멘트 인터벌 시작
    if (_mysticTimer) clearInterval(_mysticTimer);
    var _mqIdx = 0;
    if (mysticEl) {
      mysticEl.textContent = MYSTIC_QUOTES[0];
      mysticEl.classList.remove('lb-fade-out');
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
    var chDots = document.querySelectorAll('.lb-ch-dot');
    Array.prototype.forEach.call(chDots, function (d) {
      d.classList.remove('lb-ch-dot--done', 'lb-ch-dot--active');
    });
    if (chDots[0]) chDots[0].classList.add('lb-ch-dot--active');

    function _setProgress(done) {
      var pct = (done / 13) * 100;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / 13 챕터 완성';
      if (chapterMsg && done < 13) chapterMsg.textContent = LOADING_MSGS[done] || '분석 중...';
      if (chapterMsg && done >= 13) chapterMsg.textContent = '모든 챕터가 완성되었습니다 ✦';
      if (chapterNumEl) {
        chapterNumEl.textContent = done < 13 ? 'Chapter ' + (done + 1) : '✦ 완성 ✦';
      }
      // 챕터 아이콘 업데이트
      Array.prototype.forEach.call(chDots, function (d) {
        var ch = Number(d.getAttribute('data-lbch'));
        var wasDone = d.classList.contains('lb-ch-dot--done');
        d.classList.toggle('lb-ch-dot--done', ch <= done);
        d.classList.toggle('lb-ch-dot--active', ch === done + 1 && done < 13);
        if (!wasDone && ch <= done) {
          d.style.animation = 'none';
          requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.animation='';});});
        }
      });
    }

    _setProgress(0);

    /** 챕터 fetch (다중 엔드포인트 + 재시도 + 타임아웃) */
    function _fetchChapter(idx) {
      var _lbAuthToken = '';
      try { _lbAuthToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
      return new Promise(function (resolve) {
        var _settled = false;
        var _abortMsg = '응답 시간 초과 (45초). 네트워크 상태를 확인해 주세요.';
        var _endpoints = _buildApiCandidates('/api/lifebook/session');
        var _attemptPlan = [];
        var _lastMsg = '';

        for (var _ei = 0; _ei < _endpoints.length; _ei++) {
          for (var _ri = 0; _ri < 2; _ri++) {
            _attemptPlan.push({ url: _endpoints[_ei], retry: _ri + 1 });
          }
        }

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
          if (at >= _attemptPlan.length) {
            _done({ ok: false, message: _lastMsg || '모든 API 엔드포인트 시도에 실패했습니다.' });
            return;
          }

          var _plan = _attemptPlan[at];
          var _controller = (typeof AbortController === 'function') ? new AbortController() : null;
          if (_controller) _activeRequestController = _controller;
          var _lbHeaders = { 'Content-Type': 'application/json' };
          if (_lbAuthToken) _lbHeaders['Authorization'] = 'Bearer ' + _lbAuthToken;

          var timeoutId = setTimeout(function () {
            if (_controller) {
              try { _controller.abort(); } catch (_) {}
            }
          }, 45000);

          fetch(_plan.url, {
            method: 'POST',
            headers: _lbHeaders,
            body: JSON.stringify({ sessionId: idx + 1, sajuData: sajuData }),
            signal: _controller ? _controller.signal : undefined,
          })
            .then(function (res) {
              if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (e) {
                  return { ok: false, message: (e && e.message) || ('HTTP ' + res.status) };
                });
              }
              return res.json().catch(function () { return { ok: false, message: 'JSON 파싱 오류' }; });
            })
            .then(function (data) {
              clearTimeout(timeoutId);
              if (_activeRequestController === _controller) _activeRequestController = null;
              if (data && data.ok) {
                _done(data);
                return;
              }
              _lastMsg = (data && data.message) ? data.message : 'API 응답 실패';
              _runAttempt(at + 1);
            })
            .catch(function (err) {
              clearTimeout(timeoutId);
              if (_activeRequestController === _controller) _activeRequestController = null;
              if (err && err.name === 'AbortError') {
                _lastMsg = _cancelGeneration ? '사용자가 생성을 중단했습니다.' : _abortMsg;
              } else {
                _lastMsg = String(err && err.message ? err.message : err);
              }
              _runAttempt(at + 1);
            });
        }

        _runAttempt(0);
      });
    }

    var _failCount = 0;

    // 챕터 순차 생성
    (function generateNext(idx) {
      if (_cancelGeneration) {
        if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
        return;
      }
      if (idx >= 13) {
        clearInterval(_mysticTimer);
        _mysticTimer = null;
        _generating = false;

        // 유효성 체크 — 챕터당 최소 6000자 + 총 65500자
        var _validCount = _chapters.filter(function(c) {
          return typeof c === 'string' && c.trim().length >= MIN_CHAPTER_CHARS && !/^⚠️/.test(c.trim());
        }).length;
        var _totalChars = _chapters.reduce(function(acc, c) {
          return acc + (typeof c === 'string' ? c.trim().length : 0);
        }, 0);
        if (_validCount < 13 || _totalChars < MIN_TOTAL_CHARS) {
          console.warn('[인생의 책] 최소 길이 기준 미충족. 유효 챕터:', _validCount + '/13', '총 글자수:', _totalChars);
        }

        _showScreen('lbResultScreen');
        _updateTocState();
        _renderChapter(1);
        _bindToc();

        var prof = window.__cdActiveBirthProfile || {};
        var nameEl = _qs('lbResultName');
        var dateEl = _qs('lbResultDate');
        if (nameEl) nameEl.textContent = '📜 ' + (prof.name || '사용자') + '님의 인생의 책';
        if (dateEl) {
          var b = prof.birth || {};
          dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · ' + (prof.gender === 'F' ? '여성' : prof.gender === 'M' ? '남성' : '') + ' · 🗓️ ' + new Date().toLocaleDateString('ko-KR') + ' 발행';
        }
        _lbSaveResult(prof);
        // 마무리 배너 표시
        var lbEpBanner = _qs('lbEpilogueBanner');
        if (lbEpBanner) lbEpBanner.style.display = '';
        return;
      }

      if (chapterMsg) chapterMsg.textContent = LOADING_MSGS[idx] || '분석 중...';

      _fetchChapter(idx).then(function (data) {
        if (_cancelGeneration) return;
        var _text = data && typeof data.text === 'string' ? data.text.trim() : '';
        if (data && data.ok && _text.length >= MIN_CHAPTER_CHARS) {
          _chapters[idx] = data.text;
          if (data.chapterMeta && typeof data.chapterMeta.subtitle === 'string' && data.chapterMeta.subtitle.trim()) {
            _chapterSubtitles[idx] = data.chapterMeta.subtitle.trim();
          }
        } else {
          _failCount++;
          var msg;
          if (data && data.ok && _text.length > 0 && _text.length < MIN_CHAPTER_CHARS) {
            msg = '챕터 내용이 최소 기준보다 짧습니다 (' + _text.length + '자 / 최소 ' + MIN_CHAPTER_CHARS + '자).';
          } else {
            msg = (data && data.message) ? data.message : '알 수 없는 오류';
          }
          console.warn('[인생의 책] Chapter ' + (idx + 1) + ' 실패:', msg);
          _chapters[idx] = '⚠️ **이 챕터의 분석을 불러오는 데 실패했습니다.**\n\n오류: ' + msg + '\n\n잠시 후 해당 챕터를 개별적으로 재시도하거나, 처음부터 다시 생성해 주세요.';
        }
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
    var _hasAnyChapter = _chapters.some(function(c) {
      return typeof c === 'string' && c.trim().length > 0;
    });
    if (!_hasAnyChapter) {
      alert('인생의 책이 아직 생성되지 않았거나 내용이 비어 있습니다. 먼저 생성해 주세요.');
      return;
    }

    var profile = window.__cdActiveBirthProfile || {};
    var name = (profile.name || '사용자') + '님의 인생의 책';
    var birth = profile.birth || {};
    var birthStr = [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + (birth.day ? '일' : '');
    var issued = new Date().toLocaleDateString('ko-KR');

    // PDF용 HTML 생성
    var bodyHtml = '';
    for (var i = 0; i < 13; i++) {
      if (!_chapters[i]) continue;
      bodyHtml +=
        '<div class="chapter" style="page-break-before:' + (i > 0 ? 'always' : 'auto') + '">' +
        '<div class="chapter-header">' +
        '<span class="chapter-num">Chapter ' + (i + 1) + '</span>' +
        '<h2 class="chapter-title">' + _escHtml(CHAPTER_TITLES[i]) + '</h2>' +
        '<p class="chapter-sub">' + _escHtml((_chapterSubtitles[i] || CHAPTER_SUBTITLES[i] || '')) + '</p>' +
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
      '.chapter{padding:52px 60px;}' +
      '.chapter-header{border-bottom:2px solid #ede9fe;margin-bottom:36px;padding-bottom:26px;}' +
      '.chapter-num{font-size:0.72rem;letter-spacing:0.25em;color:#7c3aed;text-transform:uppercase;display:block;margin-bottom:10px;}' +
      '.chapter-title{font-size:1.9rem;font-weight:700;color:#1e1b4b;margin:0 0 8px;}' +
      '.chapter-sub{font-size:0.95rem;color:#6d28d9;margin:0;}' +
      '.chapter-body{line-height:2.0;font-size:1.0rem;color:#2d2d4e;}' +
      '.lb-md-h1,.lb-md-h2{font-size:1.3rem;font-weight:700;color:#1e1b4b;margin:30px 0 13px;border-left:4px solid #7c3aed;padding:6px 12px;background:#f5f0ff;}' +
      '.lb-md-h3{font-size:1.1rem;font-weight:700;color:#312e81;margin:22px 0 9px;border-left:2px solid #a78bfa;padding-left:10px;}' +
      '.lb-md-h4{font-size:1rem;font-weight:700;color:#4c1d95;margin:16px 0 6px;}' +
      '.lb-md-p{margin:0 0 16px;}' +
      '.lb-md-ul{margin:0 0 16px;padding-left:26px;}' +
      '.lb-md-li{margin-bottom:8px;line-height:1.8;}' +
      '.lb-md-hr{border:none;border-top:2px solid #ede9fe;margin:28px 0;}' +
      '.lb-md-blockquote{border-left:4px solid #d4a72c;background:#fffbeb;padding:14px 20px;margin:20px 0;border-radius:0 8px 8px 0;color:#7c5500;font-style:italic;font-size:0.97rem;line-height:1.75;}' +
      '@media print{' +
      'body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.cover{min-height:auto;padding:80px 60px;}' +
      '.chapter{padding:52px 60px;}' +
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

    if (action === 'openLifeBookModal') {
      // 코인 게이트 없이 타일 클릭 시 직접 모달 오픈 (결제는 생성하기 버튼에서 처리)
      window.openLifeBookModal();
      return;
    }
    if (action === 'closeLifeBookModal') {
      window.closeLifeBookModal();
      return;
    }
    if (action === 'generateLifeBook') {
      // 이미 생성 중이면 코인 차감 전에 즉시 차단
      if (_generating) {
        window.alert('인생의 책이 이미 생성 중입니다. 잠시만 기다려 주세요.');
        return;
      }
      var _lbCoinCost = Number(btn.getAttribute('data-coin-cost') || 490);
      if (typeof window._cdCoinGatePerUse === 'function') {
        // 코인 게이트: 버튼 비활성화로 중복 클릭 방지 후 진행
        btn.disabled = true;
        window._cdCoinGatePerUse(_lbCoinCost, '인생의 책 생성 (13챕터)', function () {
          btn.disabled = false;
          window.generateLifeBook();
        }, function () {
          // 취소 또는 오류 시 버튼 복원
          btn.disabled = false;
        });
      } else {
        // 결제 확인 모듈 미로드 — 결제 없이 생성 불가
        window.alert('결제 확인 모듈이 아직 준비되지 않았습니다.\n잠시 후 새로고침한 뒤 다시 시도해 주세요.');
      }
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
