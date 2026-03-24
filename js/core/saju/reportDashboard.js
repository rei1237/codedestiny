/* 리포트 대시보드 UI — 원본 saju-engine-continuation.js 에서 분리 (로직 동일)
 * 로드 순서: js/saju-engine.js → js/saju-engine-tarot-sukuyo-quantum.js → (본 파일) → js/saju-engine-continuation.js */

/* ══════════════════════════════════════════════
   리포트 대시보드 — 10개 분석 기능 카드 UI
   ══════════════════════════════════════════════ */
var REPORT_CARDS = [
  { id:'meryok',     label:'나의 매력 클래스',      desc:'신살 스탯 · 도화 · 역마 지수를 확인해보세요.',          note:'요즘 왜 유독 시선이 꽂히는지, 내 매력 포인트를 한 번에 읽어드립니다.', cta:'✨ 매력 분석 자세히 보기',     accent:'#f472b6', glow:'rgba(244,114,182,.55)', target:'specialCharmCard'    },
  { id:'quntum',     label:'퀀텀 명리 천기',        desc:'합화 우선 분석으로 나만의 천기 지도를 제공합니다.',      note:'지금 밀어붙일 타이밍인지, 숨을 고를 타이밍인지 천기적으로 짚어드립니다.', cta:'⚡ 천기 리포트 보기',          accent:'#38bdf8', glow:'rgba(56,189,248,.55)',  target:'quantumCard'         },
  { id:'sajuhealth', label:'명리 헬스 리포트',      desc:'오행 균형과 건강 약점 신호를 점검해보세요.',             note:'놓치기 쉬운 몸의 신호를 사주 관점으로 풀어, 수호 우선순위를 정리해드립니다.', cta:'💚 건강 리포트 확인하기',      accent:'#4ade80', glow:'rgba(74,222,128,.55)',  target:'healthReportCard'    },
  { id:'sajuprompt', label:'사주 프롬프트',         desc:'AI 아바타/초상화 제작용 프롬프트를 받아보세요.',         note:'내 사주 분위기를 AI 이미지로 구현할 문장까지 바로 가져갈 수 있습니다.', cta:'🤖 사주 프롬프트 보기',        accent:'#c084fc', glow:'rgba(192,132,252,.55)', target:'aiPromptCard'    },
  { id:'sajurpg',    label:'인생 스킬 트리',        desc:'운명 RPG 스타일로 내 능력치 레벨을 확인합니다.',         note:'내 강점 스탯과 취약 스탯을 RPG처럼 시각화해 성장 루트를 제시합니다.', cta:'🎮 스킬 트리 펼쳐보기',        accent:'#fbbf24', glow:'rgba(251,191,36,.55)',  target:'skillTreeCard'       },
  { id:'tbal',       label:'극T 테스트',            desc:'The Frozen Logic, 내 논리 온도를 분석합니다.',          note:'감정보다 이성이 먼저 반응하는 순간, 당신의 판단 패턴을 콕 집어드립니다.', cta:'🧊 극T 테스트 결과 보기',      accent:'#67e8f9', glow:'rgba(103,232,249,.55)', target:'tTestCard'           },
  { id:'tetoegen',   label:'테토 vs 에겐',          desc:'사주 기반으로 나의 매력 에너지 결을 분석합니다.',       note:'강하게 끌어당기는 타입인지, 부드럽게 스며드는 타입인지 매력 결을 보여드립니다.', cta:'❤️ 테토/에겐 분석 보기',      accent:'#fb923c', glow:'rgba(251,146,60,.55)',  target:'hormone-vibe-section'},
  { id:'trip',       label:'에너지 원정 리포트',     desc:'나의 에너지 방향과 이상적 여정지를 안내합니다.',         note:'지금 나와 맞는 방향을 찾고 싶다면, 장소/활동 추천까지 한 번에 확인하세요.', cta:'🗺️ 에너지 좌표 확인하기',      accent:'#2dd4bf', glow:'rgba(45,212,191,.55)',  target:'energyCoordCard'     },
  { id:'vilun',      label:'빌런 블랙리스트',        desc:'내 인생을 흔드는 위험 유형을 분석합니다.',               note:'유난히 소모되는 관계의 패턴을 파악하고, 피해야 할 시그널을 정리해드립니다.', cta:'⚠️ 빌런 리포트 열기',          accent:'#f87171', glow:'rgba(248,113,113,.55)', target:'villainCard'         },
  { id:'lotto',      label:'퀀텀 로또 리포트',       desc:'수리 에너지 공명 기반 추천 번호를 제공합니다.',          note:'오늘 운의 파동과 맞는 번호 흐름을 기반으로 흥미로운 조합을 제안합니다.', cta:'🎱 로또 리포트 보기',          accent:'#fde047', glow:'rgba(253,224,71,.55)',  target:'lottoCard'           },
  { id:'4CUT',       label:'사주네컷 : 운명 필터',   desc:'사주 데이터를 인생네컷 감성으로 재해석해 한 장에 담아보세요.', note:'킹받는데 공감되는 팩폭으로 네 컷을 완성했어요. 저장하고 카톡으로 바로 던져봐.', cta:'📸 사주네컷 열기',            accent:'#f97316', glow:'rgba(249,115,22,.45)',  target:'sajuFourCutCard'     }
];

var S4C_TAG_TEXT = '#사주네컷 #코드데스티니 #꿀꿀 만세력 #무료 사주 #무료 운세 #대박 운세 #신년운세 #성격테스트 #2026운세';
var _s4cCanvasLoader = null;
var S4C_TAG_LIST = ['#사주네컷', '#코드데스티니', '#꿀꿀만세력', '#무료사주', '#무료운세', '#대박운세', '#신년운세', '#성격테스트', '#2026운세'];

function _s4cEscapeHtml(raw) {
  return String(raw == null ? '' : raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _s4cPercent(v) {
  var n = Number(v || 0);
  if (!isFinite(n)) n = 0;
  return Math.max(0, Math.round(n));
}

function _s4cGetDominantElement() {
  var ratios = (window.G_NATAL && window.G_NATAL.ratios) || null;
  var els = ['wood', 'fire', 'earth', 'metal', 'water'];
  var best = { key: 'earth', val: -1 };
  els.forEach(function(el) {
    var score = Number(ratios && ratios[el]);
    if (!isFinite(score)) score = 0;
    if (score > best.val) best = { key: el, val: score };
  });
  return best.key;
}

function _s4cGetAnimalSticker(dayBranch) {
  var byBranch = {
    '子': '🐭', '丑': '🐮', '寅': '🐯', '卯': '🐰',
    '辰': '🐲', '巳': '🐍', '午': '🐴', '未': '🐑',
    '申': '🐵', '酉': '🐔', '戌': '🐶', '亥': '🐷'
  };
  var name = (window.JI && window.JI[dayBranch] && window.JI[dayBranch].a) ? window.JI[dayBranch].a : '';
  var emoji = (name && window.ANIMAL_EMOJI && window.ANIMAL_EMOJI[name]) ? window.ANIMAL_EMOJI[name] : '';
  return {
    emoji: emoji || byBranch[dayBranch] || '🐷',
    name: name || '돼지'
  };
}

function _s4cBuildTenGodMix(p) {
  if (!p || !p.d || !p.d.g || typeof window.getTenGod !== 'function') {
    return [
      { name: '식신', pct: 55, mz: '먹을 생각' },
      { name: '편인', pct: 45, mz: '망상 모드' }
    ];
  }
  var dg = p.d.g;
  var stars = [p.y && p.y.g, p.y && p.y.j, p.m && p.m.g, p.m && p.m.j, p.d && p.d.j, p.h && p.h.g, p.h && p.h.j]
    .filter(Boolean);
  var cnt = {};
  stars.forEach(function(c) {
    var t = window.getTenGod(dg, c);
    if (t && t !== '?') cnt[t] = (cnt[t] || 0) + 1;
  });
  var total = stars.length || 1;
  var mzMap = {
    '비견': '내 방식 고수',
    '겁재': '승부욕 ON',
    '식신': '먹을 생각',
    '상관': '드립 발사',
    '편재': '기회 레이더',
    '정재': '현실 계산기',
    '편관': '압박 돌파',
    '정관': '원칙 수호',
    '편인': '망상 모드',
    '정인': '공부 모드'
  };
  var list = Object.keys(cnt).map(function(k) {
    return { name: k, pct: _s4cPercent((cnt[k] / total) * 100), mz: mzMap[k] || '감정 롤러코스터' };
  }).sort(function(a, b) { return b.pct - a.pct; });

  if (!list.length) {
    return [
      { name: '식신', pct: 50, mz: '먹을 생각' },
      { name: '정인', pct: 50, mz: '공부 모드' }
    ];
  }
  if (list.length === 1) {
    list.push({ name: '정인', pct: Math.max(0, 100 - list[0].pct), mz: '공부 모드' });
  }
  return [list[0], list[1]];
}

function _s4cBuildFrameData() {
  var p = window.G_PILLARS || {};
  var dayStem = (p.d && p.d.g) || '甲';
  var dayBranch = (p.d && p.d.j) || '子';
  var monthStem = (p.m && p.m.g) || '';
  var monthBranch = (p.m && p.m.j) || '';
  var dominant = _s4cGetDominantElement();
  var sticker = _s4cGetAnimalSticker(dayBranch);
  var tg = _s4cBuildTenGodMix(p);

  var elementTheme = {
    wood: { name: '목', bg: '#d9f99d', card: '#f7fee7', line: '#65a30d' },
    fire: { name: '화', bg: '#fbcfe8', card: '#fdf2f8', line: '#db2777' },
    earth: { name: '토', bg: '#f5e9d3', card: '#fff8ee', line: '#b45309' },
    metal: { name: '금', bg: '#f8fafc', card: '#ffffff', line: '#475569' },
    water: { name: '수', bg: '#1e3a8a', card: '#dbeafe', line: '#1d4ed8' }
  };

  var dayVibe = {
    '甲': "생각보다 낯가리는 갑목 대장",
    '乙': "유연하게 스며드는 을목 치트키",
    '丙': "겉은 바삭, 속은 촉촉한 병화 인간",
    '丁': "조용히 타오르는 정화 무드메이커",
    '戊': "묵직하게 판 깔아주는 무토 리더",
    '己': "디테일로 승부보는 기토 장인",
    '庚': "단호한데 은근 다정한 경금 검객",
    '辛': "폼 미쳤다 소리 듣는 신금 감각러",
    '壬': "스케일 큰 임수 고래형 기획자",
    '癸': "잔잔한데 깊은 계수 공감러"
  };

  var monthTenGod = (monthStem && typeof window.getTenGod === 'function') ? window.getTenGod(dayStem, monthStem) : '';
  var monthView = {
    '비견': '일할 땐 AI, 놀 땐 파티피플',
    '겁재': '친해지면 기절하는 반전 매력',
    '식신': '맛집과 생산성 둘 다 챙기는 타입',
    '상관': '팩폭 날리는데 웃기게 하는 타입',
    '편재': '인맥에서 기회를 꺼내는 타입',
    '정재': '지갑 관리까지 갓생 찍는 타입',
    '편관': '프로젝트 급발진해도 결과 내는 타입',
    '정관': '룰 지키면서도 폼 미쳤다 듣는 타입',
    '편인': '뜬금 영감으로 판 뒤집는 타입',
    '정인': '디테일 메모로 팀 살리는 타입'
  };

  var luckyByElement = {
    wood: '초록 포인트 장착하고 미루던 일 1개만 끝내. 오히려 좋아. 끝나면 산책 12분으로 리프레시하면 집중력 폼 미쳤다.',
    fire: '핑크 아이템 하나 들고 아아 마시면서 할 일 3개 중 1개만 선빵쳐. 첫 스타트만 끊으면 럭키비키 모드가 바로 켜진다.',
    earth: '베이지 무드로 책상 10분 정리하고 메모 3줄 써. 루틴 하나만 고정하면 오늘 갓생 루프가 자동으로 돌아간다.',
    metal: '화이트 포인트 룩에 일정 2개만 칼같이 처리해. 디테일 챙긴 너 오늘 완전 일잘러 모드라 주변이 기절한다.',
    water: '네이비 포인트 + 잔잔한 플리 조합으로 25분 몰입 타이머 돌려. 깊게 파고드는 흐름이 오늘 대박 기회를 데려온다.'
  };

  var luckyElement = (window.G_POWER && Array.isArray(window.G_POWER.yongshin) && window.G_POWER.yongshin[0]) || dominant;
  var theme = elementTheme[dominant] || elementTheme.earth;
  var monthPillar = (monthStem || '') + (monthBranch || '');

  var frame1Detail = '겉보기는 쿨한데 속은 은근 섬세한 타입. 분위기만 보면 쉬워 보여도 기준선은 꽤 높은 편이라 아무나 못 넘는다.';
  var frame2Detail = '처음엔 차분해 보여도 친해지면 텐션 급상승. 회의/일할 때는 정확하고, 놀 때는 분위기 메이커라 반전 매력 제대로 터진다.';
  var tgA = tg[0] || { name: '식신', pct: 50, mz: '먹을 생각' };
  var tgB = tg[1] || { name: '정인', pct: 50, mz: '공부 모드' };
  var frame3Detail = tgA.name + ' ' + tgA.pct + '%(' + tgA.mz + ') + ' + tgB.name + ' ' + tgB.pct + '%(' + tgB.mz + ') 조합으로, 머릿속은 늘 프로젝트 탭 20개 열어둔 상태.';
  var frame4Detail = '오늘은 작게 시작해서 크게 먹는 날. 대놓고 무리하지 말고, 1개 완수 -> 1개 보상 루프로 가면 성과가 진짜 빨리 붙는다.';

  return {
    theme: theme,
    dominantElement: dominant,
    stickerEmoji: sticker.emoji,
    stickerName: sticker.name,
    frame1: dayVibe[dayStem] || '오히려 좋아를 실천하는 균형형 인간',
    frame2: monthView[monthTenGod] || ('첫인상은 차분한데, ' + monthPillar + ' 포인트에서 반전 터지는 타입'),
    frame3: tg,
    frame4: luckyByElement[luckyElement] || luckyByElement[dominant] || luckyByElement.earth,
    frame1Detail: frame1Detail,
    frame2Detail: frame2Detail,
    frame3Detail: frame3Detail,
    frame4Detail: frame4Detail,
    monthPillar: monthPillar || '월주 대기',
    dayPillar: dayStem + dayBranch,
    stickerPack: ['🐔', '✨', '📸', '💘', '🎀', sticker.emoji || '🐷'],
    rare: (typeof window.__sajuFourCutRare === 'boolean') ? window.__sajuFourCutRare : (window.__sajuFourCutRare = (Math.random() < 0.01))
  };
}

function _s4cEnsureCanvasLib() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (_s4cCanvasLoader) return _s4cCanvasLoader;
  _s4cCanvasLoader = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.async = true;
    script.onload = function() { resolve(window.html2canvas); };
    script.onerror = function() { reject(new Error('html2canvas load failed')); };
    document.head.appendChild(script);
  });
  return _s4cCanvasLoader;
}

function _s4cCoverSrcCandidates() {
  return [
    '/fuctionassets/4CUT.webp',
    'fuctionassets/4CUT.webp',
    '/public/fuctionassets/4CUT.webp'
  ];
}

window.handleS4CCoverError = function(imgEl) {
  if (!imgEl) return;
  var tried = imgEl.dataset && imgEl.dataset.s4cTried ? String(imgEl.dataset.s4cTried) : '';
  var idx = tried ? Number(tried) : 0;
  var candidates = _s4cCoverSrcCandidates();
  if (idx < candidates.length - 1) {
    imgEl.dataset.s4cTried = String(idx + 1);
    imgEl.src = candidates[idx + 1];
    return;
  }
  imgEl.style.display = 'none';
};

function renderSajuFourCutContent() {
  var host = document.getElementById('sajuFourCutResult');
  if (!host) return;
  var data = _s4cBuildFrameData();
  var frameEmoji = ['🪩', '🎭', '🧠', '🍀'];

  host.innerHTML = ''
    + '<div class="s4c-wrap s4c-tw" style="--s4c-bg:' + _s4cEscapeHtml(data.theme.bg) + ';--s4c-card:' + _s4cEscapeHtml(data.theme.card) + ';--s4c-line:' + _s4cEscapeHtml(data.theme.line) + ';">'
    + '  <div class="s4c-aurora s4c-aurora-a" aria-hidden="true"></div>'
    + '  <div class="s4c-aurora s4c-aurora-b" aria-hidden="true"></div>'
    + '  <div class="s4c-head">'
    + '    <img class="s4c-cover" src="/fuctionassets/4CUT.webp" alt="사주 네컷 프레임" loading="lazy" decoding="async" onerror="handleS4CCoverError(this)">'
    + '    <div class="s4c-head-copy">'
    + '      <span class="s4c-chip">MZ 운명 필터 ON</span>'
    + '      <h4 class="s4c-main-title">사주네컷 찍고 바로 스토리 각</h4>'
    + '      <p class="s4c-sub">킹받게 정확한 팩폭 + 하찮고 귀여운 감성으로 오늘 분위기 박제. 공유 안 하면 손해인 텐션으로 뽑았어.</p>'
    + '    </div>'
    + '  </div>'
    + '  <div class="s4c-capture' + (data.rare ? ' s4c-capture--rare' : '') + '" data-s4c-capture="1">'
    + '    <div class="s4c-brand">CODE DESTINY · SAJU 4CUT</div>'
    + '    <div class="s4c-tag-watermark">MZ SAJU SNAP · VIBE MODE</div>'
    + (data.rare ? '<div class="s4c-rare-card">✨ 대운 프리패스 카드 등장! 오늘 폼 미쳤다 ✨</div>' : '')
    + '    <div class="s4c-grid">'
    + '    <article class="s4c-frame"><div class="s4c-frame-head"><h4>1. 나의 본캐 Vibe</h4><span>' + frameEmoji[0] + '</span></div><p>' + _s4cEscapeHtml(data.frame1) + '</p><em>' + _s4cEscapeHtml(data.frame1Detail) + '</em><span>' + _s4cEscapeHtml(data.dayPillar) + ' · ' + _s4cEscapeHtml(data.theme.name) + ' 무드</span></article>'
    + '    <article class="s4c-frame"><div class="s4c-frame-head"><h4>2. 남들이 보는 나</h4><span>' + frameEmoji[1] + '</span></div><p>' + _s4cEscapeHtml(data.frame2) + '</p><em>' + _s4cEscapeHtml(data.frame2Detail) + '</em><span>' + _s4cEscapeHtml(data.monthPillar) + ' 분위기 리딩</span></article>'
    + '    <article class="s4c-frame"><div class="s4c-frame-head"><h4>3. 머릿속 복잡도</h4><span>' + frameEmoji[2] + '</span></div><p>'
    + _s4cEscapeHtml(data.frame3[0].name) + ' ' + _s4cEscapeHtml(String(data.frame3[0].pct)) + '% (' + _s4cEscapeHtml(data.frame3[0].mz) + ') · '
    + _s4cEscapeHtml(data.frame3[1].name) + ' ' + _s4cEscapeHtml(String(data.frame3[1].pct)) + '% (' + _s4cEscapeHtml(data.frame3[1].mz) + ')</p>'
    + '      <em>' + _s4cEscapeHtml(data.frame3Detail) + '</em><span>기절 포인트: 생각이 너무 많아서 웃김</span></article>'
    + '    <article class="s4c-frame"><div class="s4c-frame-head"><h4>4. 오늘의 럭키비키</h4><span>' + frameEmoji[3] + '</span></div><p>' + _s4cEscapeHtml(data.frame4) + '</p><em>' + _s4cEscapeHtml(data.frame4Detail) + '</em><span>한 줄 미션으로 갓생 스타트</span></article>'
    + '    </div>'
    + '    <div class="s4c-sticker-pack" aria-label="cute emoji stickers">'
    + '      <span class="s4c-sticker-emoji s1">' + _s4cEscapeHtml(data.stickerPack[0]) + '</span>'
    + '      <span class="s4c-sticker-emoji s2">' + _s4cEscapeHtml(data.stickerPack[1]) + '</span>'
    + '      <span class="s4c-sticker-emoji s3">' + _s4cEscapeHtml(data.stickerPack[2]) + '</span>'
    + '      <span class="s4c-sticker-emoji s4">' + _s4cEscapeHtml(data.stickerPack[3]) + '</span>'
    + '      <span class="s4c-sticker-emoji s5">' + _s4cEscapeHtml(data.stickerPack[4]) + '</span>'
    + '      <span class="s4c-sticker-emoji s6">' + _s4cEscapeHtml(data.stickerPack[5]) + '</span>'
    + '    </div>'
    + '  </div>'
    + '  <div class="s4c-tags" aria-label="share hashtags">'
    + S4C_TAG_LIST.map(function(tag){ return '<span class="s4c-tag-chip">' + _s4cEscapeHtml(tag) + '</span>'; }).join('')
    + '  </div>'
    + '  <div class="s4c-actions">'
    + '    <button type="button" class="s4c-btn" onclick="saveSajuFourCutImage(this)">📥 네컷 이미지 저장</button>'
    + '    <button type="button" class="s4c-btn s4c-btn--kakao" onclick="shareSajuFourCutKakao(this)">💬 카카오톡 공유</button>'
    + '  </div>'
    + '</div>';
}

window.saveSajuFourCutImage = function(btn) {
  var wrap = btn && btn.closest ? btn.closest('.s4c-wrap') : null;
  var capture = wrap ? wrap.querySelector('[data-s4c-capture]') : null;
  if (!capture) return;

  _s4cEnsureCanvasLib().then(function(html2canvas) {
    return html2canvas(capture, {
      scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
      useCORS: true,
      backgroundColor: null,
      logging: false
    });
  }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'saju-fourcut-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(function(err) {
    console.error('[SajuFourCut] 이미지 저장 실패:', err);
    alert('이미지 저장 중 오류가 났어. 잠깐 후 다시 눌러줘.');
  });
};

window.shareSajuFourCutKakao = function(btn) {
  var wrap = btn && btn.closest ? btn.closest('.s4c-wrap') : null;
  if (!wrap) return;

  var text = [
    '📸 사주네컷 : 운명 필터',
    '',
    '1) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(1) p') || {}).textContent || ''),
    '2) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(2) p') || {}).textContent || ''),
    '3) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(3) p') || {}).textContent || ''),
    '4) ' + ((wrap.querySelector('.s4c-frame:nth-of-type(4) p') || {}).textContent || ''),
    '',
    S4C_TAG_TEXT,
    window.location.href
  ].join('\n');

  if (navigator.share) {
    navigator.share({
      title: '사주네컷 : 운명 필터',
      text: text,
      url: window.location.href
    }).catch(function(){});
    return;
  }

  var encoded = encodeURIComponent(text);
  var a = document.createElement('a');
  a.href = 'kakaotalk://send?text=' + encoded;
  a.click();

  setTimeout(function() {
    if (typeof window.copyToClipboard === 'function') {
      window.copyToClipboard(text, '카카오톡 앱이 없거나 PC라서 문구를 복사했어. 붙여넣기 하면 끝!');
    }
  }, 220);
};

function handleReportThumbError(imgEl) {
  if (!imgEl) return;
  if (imgEl.dataset && imgEl.dataset.assetFallbackTried !== '1') {
    var src = imgEl.getAttribute('src') || '';
    if (src.indexOf('/fuctionassets/') === 0) {
      imgEl.dataset.assetFallbackTried = '1';
      imgEl.src = src.replace('/fuctionassets/', 'fuctionassets/');
      return;
    }
    if (src.indexOf('fuctionassets/') === 0) {
      imgEl.dataset.assetFallbackTried = '1';
      imgEl.src = '/' + src;
      return;
    }
  }
  var wrap = imgEl.closest ? imgEl.closest('.rpt-v2-img-wrap') : imgEl.parentNode;
  if (wrap) wrap.style.display = 'none';

  var row = wrap && wrap.parentNode;
  if (!row || !row.classList || !row.classList.contains('rpt-v2-img-row')) return;

  var visibleCount = 0;
  for (var i = 0; i < row.children.length; i++) {
    if (row.children[i].style.display !== 'none') visibleCount += 1;
  }
  if (visibleCount === 0) row.style.display = 'none';
}

window.handleReportThumbError = handleReportThumbError;

function renderReportDashboard() {
  var container = document.getElementById('reportDashboard');
  var dashCard  = document.getElementById('reportDashboardCard');
  if (!container || !dashCard) return;
  dashCard.style.display = '';
  try { renderSajuFourCutContent(); } catch (fourCutErr) { console.warn('[SajuFourCut] 렌더 실패:', fourCutErr); }

  /* ── 타겟 기준 중복 제거 블록 목록 생성 ── */
  var seenTargets = {};
  var blocks = [];
  REPORT_CARDS.forEach(function(c) {
    if (!seenTargets[c.target]) {
      seenTargets[c.target] = {
        images: [],
        target: c.target,
        title: c.label,
        preview: c.desc,
        note: c.note,
        cta: c.cta,
        accent: c.accent,
        glow: c.glow
      };
      blocks.push(seenTargets[c.target]);
    }
    seenTargets[c.target].images.push({ id: c.id, label: c.label, accent: c.accent });
  });

  /* ── 그리드 HTML 생성 ── */
  var gridHtml = '<div class="rpt-v2-grid">';
  blocks.forEach(function(b) {
    var sectionId = 'rpt-v2-section-' + b.target;
    var titleId = 'rpt-v2-title-' + b.target;
    gridHtml += '<section class="rpt-v2-block fortune-section" id="' + sectionId + '" aria-labelledby="' + titleId + '" style="border-color:' + b.accent + '44;">';

    /* 이미지 영역 — 이미지 짤림 없이 전체 표시 */
    gridHtml += '<div class="rpt-v2-img-row">';
    b.images.forEach(function(img) {
      var thumbSrc = '/fuctionassets/' + img.id + '.webp';
      gridHtml += '<div class="rpt-v2-img-wrap">';
      gridHtml += '<img class="rpt-v2-img" src="' + thumbSrc + '" alt="' + img.label + '" loading="lazy" '
        + 'decoding="async" onerror="handleReportThumbError(this)">';
      gridHtml += '</div>';
    });
    gridHtml += '</div>';

    /* 카드 헤더 + CTA */
    gridHtml += '<div class="rpt-v2-head">';
    gridHtml += '<h3 id="' + titleId + '" class="sec-title rpt-v2-title">' + b.title + '</h3>';
    gridHtml += '<p class="rpt-v2-preview">' + b.preview + '</p>';
    gridHtml += '<p class="rpt-v2-note">' + (b.note || '지금 내 흐름과 맞는 인사이트를 펼쳐 확인해보세요.') + '</p>';
    gridHtml += '<button class="rpt-v2-toggle-btn" type="button" onclick="toggleReportFeatureCard(this)" aria-expanded="false" data-label="' + b.cta + '">';
    gridHtml += '<span class="rpt-v2-toggle-label">' + b.cta + '</span>';
    gridHtml += '<span class="rpt-v2-toggle-arrow" aria-hidden="true">▼</span>';
    gridHtml += '</button>';
    gridHtml += '</div>';

    /* 토글 상세 영역 */
    gridHtml += '<div class="rpt-v2-detail" aria-hidden="true"><div class="rpt-v2-detail-inner">';

    /* 기능 콘텐츠 슬롯 */
    gridHtml += '<div class="rpt-v2-body" id="rpt-v2-body-' + b.target + '"></div>';
    gridHtml += '</div></div>';
    gridHtml += '</section>';
  });
  gridHtml += '</div>';
  container.innerHTML = gridHtml;

  /* ── 기존 섹션을 슬롯 안으로 이동 ── */
  blocks.forEach(function(b) {
    var slot = document.getElementById('rpt-v2-body-' + b.target);
    var targetEl = document.getElementById(b.target);
    if (slot && !targetEl) {
      var missingBlock = document.getElementById('rpt-v2-section-' + b.target);
      if (missingBlock) missingBlock.style.display = 'none';
      return;
    }
    if (slot && targetEl) {
      /* 내부 콘텐츠 div가 비어 있으면 대시보드 블록 자체를 숨김 */
      var innerSection = targetEl.querySelector('div[id]');
      if (innerSection && innerSection.innerHTML.trim().length < 30) {
        var dashBlock = document.getElementById('rpt-v2-section-' + b.target);
        if (dashBlock) dashBlock.style.display = 'none';
        return;
      }
      /* 숨겨진 섹션도 대시보드 안에서 표시 */
      if (targetEl.style.display === 'none') {
        targetEl.style.display = '';
      }
      slot.appendChild(targetEl);
    }
  });
}

function syncReportBlockHeight(block) {
  if (!block || !block.classList || !block.classList.contains('open')) return;
  var detail = block.querySelector('.rpt-v2-detail');
  var inner = block.querySelector('.rpt-v2-detail-inner');
  if (!detail || !inner) return;
  detail.style.setProperty('--rpt-open-height', (inner.scrollHeight + 6) + 'px');
}

var _rptHeightWatchers = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

function _bindReportHeightWatcher(block) {
  if (!_rptHeightWatchers || !block) return;
  if (_rptHeightWatchers.has(block)) return;

  var inner = block.querySelector('.rpt-v2-detail-inner');
  if (!inner) return;

  var rafId = 0;
  var schedule = function() {
    if (!block.classList || !block.classList.contains('open')) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function() {
      syncReportBlockHeight(block);
    });
  };

  var ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(schedule);
    ro.observe(inner);
  }

  var mo = null;
  if (typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver(schedule);
    mo.observe(inner, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  _rptHeightWatchers.set(block, { ro: ro, mo: mo });
}

function _unbindReportHeightWatcher(block) {
  if (!_rptHeightWatchers || !block) return;
  var watcher = _rptHeightWatchers.get(block);
  if (!watcher) return;
  if (watcher.ro) watcher.ro.disconnect();
  if (watcher.mo) watcher.mo.disconnect();
  _rptHeightWatchers.delete(block);
}

function syncReportHeightFromNode(node) {
  if (!node || !node.closest) return;
  var block = node.closest('.rpt-v2-block');
  syncReportBlockHeight(block);
}

function toggleReportFeatureCard(btn) {
  var block = btn.closest('.rpt-v2-block');
  if (!block) return;
  var open = block.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  var detail = block.querySelector('.rpt-v2-detail');
  if (detail) {
    detail.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      _bindReportHeightWatcher(block);
      syncReportBlockHeight(block);
    } else {
      _unbindReportHeightWatcher(block);
      detail.style.setProperty('--rpt-open-height', '0px');
    }
  }
  var label = btn.querySelector('.rpt-v2-toggle-label');
  var arrow = btn.querySelector('.rpt-v2-toggle-arrow');
  if (label) label.textContent = open ? '닫기' : (btn.dataset.label || '자세히 보기');
  if (arrow) arrow.textContent = open ? '▲' : '▼';

  if (open) {
    requestAnimationFrame(function(){ syncReportBlockHeight(block); });
    setTimeout(function(){ syncReportBlockHeight(block); }, 220);
  }
}

(function(){
  var resizeTicking = false;
  function onResize() {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function() {
      resizeTicking = false;
      document.querySelectorAll('.rpt-v2-block.open').forEach(function(block) {
        syncReportBlockHeight(block);
      });
    });
  }
  window.addEventListener('resize', onResize, { passive: true });
})();
