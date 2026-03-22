/**
 * Saju Totem Generator — "Who am I with Saju?"
 * AI가 사주를 분석해 귀여운 수호 동물을 Pollinations.ai로 생성합니다.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────
     1. 오행 → 동물 매핑 테이블
  ───────────────────────────────────── */
  var ELEMENT_ANIMALS = {
    wood: [
      { name: '아기 용', nameEn: 'baby dragon', keyword: '창조·성장', traits: '창의적이고 성장하는', color: 'green' },
      { name: '아기 사슴', nameEn: 'baby deer', keyword: '유연·섬세', traits: '섬세하고 맑은', color: 'green' },
      { name: '아기 고양이', nameEn: 'kitten', keyword: '독립·직관', traits: '자유롭고 독립적인', color: 'green' }
    ],
    fire: [
      { name: '아기 사자', nameEn: 'baby lion cub', keyword: '열정·용기', traits: '용맹하고 밝은', color: 'orange' },
      { name: '아기 봉황', nameEn: 'baby phoenix', keyword: '재생·열정', traits: '불꽃처럼 빛나는', color: 'red' },
      { name: '아기 여우', nameEn: 'baby fox', keyword: '직관·기지', traits: '재치 있고 빛나는', color: 'orange' }
    ],
    earth: [
      { name: '아기 곰', nameEn: 'baby bear', keyword: '안정·치유', traits: '든든하고 포근한', color: 'yellow' },
      { name: '아기 팬더', nameEn: 'baby panda', keyword: '균형·여유', traits: '느긋하고 균형 잡힌', color: 'yellow' },
      { name: '아기 고슴도치', nameEn: 'baby hedgehog', keyword: '배려·성실', traits: '알뜰하고 성실한', color: 'brown' }
    ],
    metal: [
      { name: '아기 독수리', nameEn: 'baby eagle', keyword: '결단·고결', traits: '날카롭고 고결한', color: 'silver' },
      { name: '아기 늑대', nameEn: 'baby wolf', keyword: '의지·충절', traits: '충직하고 의지 있는', color: 'white' },
      { name: '아기 유니콘', nameEn: 'baby unicorn', keyword: '순수·정밀', traits: '순수하고 빛나는', color: 'silver' }
    ],
    water: [
      { name: '아기 거북이', nameEn: 'baby turtle', keyword: '지혜·인내', traits: '지혜롭고 깊은', color: 'blue' },
      { name: '아기 돌고래', nameEn: 'baby dolphin', keyword: '조화·직관', traits: '유쾌하고 현명한', color: 'blue' },
      { name: '아기 물범', nameEn: 'baby seal', keyword: '감성·치유', traits: '부드럽고 감성적인', color: 'indigo' }
    ]
  };

  /* 일지(日支) 십이지 동물 */
  var DIZHI_ANIMALS = {
    '子': { name: '아기 쥐', nameEn: 'cute baby rat', keyword: '영리·적응', traits: '영리하고 빠른' },
    '丑': { name: '아기 소', nameEn: 'cute baby ox calf', keyword: '인내·성실', traits: '성실하고 든든한' },
    '寅': { name: '아기 호랑이', nameEn: 'cute baby tiger cub', keyword: '용기·의지', traits: '용맹하지만 장난기 넘치는' },
    '卯': { name: '아기 토끼', nameEn: 'cute baby bunny', keyword: '도약·풍요', traits: '사랑스럽고 도약하는' },
    '辰': { name: '아기 용', nameEn: 'cute baby dragon', keyword: '창조·권위', traits: '신비롭고 창의적인' },
    '巳': { name: '아기 뱀', nameEn: 'cute baby snake', keyword: '재생·지혜', traits: '지혜롭고 신비로운' },
    '午': { name: '아기 말', nameEn: 'cute baby horse foal', keyword: '자유·열정', traits: '자유롭고 활달한' },
    '未': { name: '아기 양', nameEn: 'cute baby lamb', keyword: '온화·예술', traits: '온화하고 예술적인' },
    '申': { name: '아기 원숭이', nameEn: 'cute baby monkey', keyword: '기지·변통', traits: '재치 있고 영특한' },
    '酉': { name: '아기 닭', nameEn: 'cute baby chick', keyword: '성실·직관', traits: '부지런하고 직관적인' },
    '戌': { name: '아기 강아지', nameEn: 'cute baby puppy', keyword: '충성·보호', traits: '충직하고 사랑스러운' },
    '亥': { name: '아기 돼지', nameEn: 'cute baby piglet', keyword: '풍요·행운', traits: '복스럽고 따뜻한' }
  };

  /* 오행 배경 테마 */
  var ELEMENT_BG = {
    wood: { bg: 'linear-gradient(135deg,#e8f5e9 0%,#f1f8e9 50%,#e0f2f1 100%)', glow: '#4caf50', text: '#1b5e20', badge: '#a5d6a7', icon: '🌿' },
    fire: { bg: 'linear-gradient(135deg,#fff3e0 0%,#fce4ec 50%,#fff8e1 100%)', glow: '#ff9800', text: '#bf360c', badge: '#ffcc80', icon: '🔥' },
    earth: { bg: 'linear-gradient(135deg,#fffde7 0%,#fff8e1 50%,#fef3c7 100%)', glow: '#f59e0b', text: '#78350f', badge: '#fde68a', icon: '🌏' },
    metal: { bg: 'linear-gradient(135deg,#f3f4f6 0%,#ecfeff 50%,#f8fafc 100%)', glow: '#6b7280', text: '#1f2937', badge: '#d1d5db', icon: '✨' },
    water: { bg: 'linear-gradient(135deg,#eff6ff 0%,#f0f9ff 50%,#eef2ff 100%)', glow: '#3b82f6', text: '#1e3a8a', badge: '#bfdbfe', icon: '💧' }
  };

  /* ─────────────────────────────────────
     2. 사주 → 동물 결정 로직
  ───────────────────────────────────── */
  function getDominantElement() {
    try {
      var natal = window.G_NATAL;
      if (!natal || !natal.ratios) return 'wood';
      var r = natal.ratios;
      var dominated = 'wood', max = 0;
      var keys = ['wood', 'fire', 'earth', 'metal', 'water'];
      keys.forEach(function (k) {
        var v = Number(r[k] || 0);
        if (v > max) { max = v; dominated = k; }
      });
      return dominated;
    } catch (e) { return 'wood'; }
  }

  function getDayZhi() {
    try {
      var pillars = window.G_PILLARS;
      if (pillars && pillars.d && pillars.d.j) return pillars.d.j;
      return null;
    } catch (e) { return null; }
  }

  function getDayGanElement() {
    try {
      var pillars = window.G_PILLARS;
      if (pillars && pillars.d && pillars.d.gE) return pillars.d.gE;
      var dg = window.DAY_GAN || '';
      var GAN = window.GAN || {};
      return (GAN[dg] && GAN[dg].e) ? GAN[dg].e : null;
    } catch (e) { return null; }
  }

  function getPowerLabel() {
    try {
      var p = window.G_POWER;
      if (p && typeof p.isStrong === 'boolean') return p.isStrong ? '신강' : '신약';
      return '';
    } catch (e) { return ''; }
  }

  function getSipseong() {
    try {
      var pillars = window.G_PILLARS;
      var dayGan = window.DAY_GAN || (pillars && pillars.d && pillars.d.g) || '';
      var monthGan = pillars && pillars.m && pillars.m.g;
      if (!dayGan || !monthGan) return '';
      var getTenGod = window.getTenGod;
      if (typeof getTenGod === 'function') return getTenGod(dayGan, monthGan);
      return '';
    } catch (e) { return ''; }
  }

  /* 동물 선택: 일지 동물 우선, 없으면 지배 오행 */
  function selectTotem() {
    var dayZhi = getDayZhi();
    var dominantEl = getDominantElement();
    var dayGanEl = getDayGanElement();
    var powerLabel = getPowerLabel();
    var sipseong = getSipseong();

    /* 일지 기반 동물 (60갑자 일주론) */
    var zhiAnimal = dayZhi && DIZHI_ANIMALS[dayZhi] ? DIZHI_ANIMALS[dayZhi] : null;

    /* 오행 기반 동물 (지배 오행 → 배열 중 첫 번째) */
    var elAnimalList = ELEMENT_ANIMALS[dominantEl] || ELEMENT_ANIMALS.wood;
    /* 일간 오행으로 세밀 조정 */
    var elAnimal = elAnimalList[0];
    if (dayGanEl && ELEMENT_ANIMALS[dayGanEl]) {
      elAnimal = ELEMENT_ANIMALS[dayGanEl][0];
    }

    /* 최종: 일지 우선 사용, fallback 오행 */
    var primary = zhiAnimal || elAnimal;
    var secondary = elAnimal;

    return {
      primary: primary,
      element: dominantEl,
      dayGanElement: dayGanEl || dominantEl,
      dayZhi: dayZhi,
      powerLabel: powerLabel,
      sipseong: sipseong,
      zhiAnimal: zhiAnimal,
      elAnimal: elAnimal
    };
  }

  /* ─────────────────────────────────────
     3. 프롬프트 빌드
  ───────────────────────────────────── */
  function buildPrompt(totemData) {
    var a = totemData.primary;
    var el = totemData.element;
    var bgMap = {
      wood: 'enchanted forest with glowing green fireflies and cherry blossom petals',
      fire: 'magical sunset sky with warm orange and pink pastel clouds and sparkling embers',
      earth: 'cozy golden wheat field with soft sunlight and floating dandelion seeds',
      metal: 'ethereal silver moonlit crystal cave with sparkling gems',
      water: 'serene magical ocean with soft blue bioluminescent waves and bubbles'
    };
    var bg = bgMap[el] || bgMap.wood;
    var colorMap = {
      wood: 'soft pastel green and mint',
      fire: 'warm peach, coral, and gold',
      earth: 'soft yellow, honey, and warm brown',
      metal: 'soft silver, lavender, and pearl white',
      water: 'soft sky blue, indigo, and aqua'
    };
    var colorPalette = colorMap[el] || colorMap.wood;

    var prompt = [
      'ultra cute chibi ' + a.nameEn,
      'kawaii style character art',
      'vibrant pastel colors in ' + colorPalette,
      'clean smooth line art',
      'big sparkling eyes with starry highlights',
      'round chubby adorable body',
      'magical glowing aura',
      'tiny sparkles and stars floating around',
      'magical background: ' + bg,
      'soft pastel gradient background',
      'studio ghibli inspired character design',
      'children book illustration style',
      'high quality digital art',
      'square format',
      'no text no typography no words no letters'
    ].join(', ');

    return prompt;
  }

  /* ─────────────────────────────────────
     4. 설명 문구 생성
  ───────────────────────────────────── */
  function buildDescription(totemData) {
    var a = totemData.primary;
    var el = totemData.element;
    var elKr = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    var elDesc = {
      wood: '성장과 창조의 기운', fire: '열정과 빛의 기운',
      earth: '안정과 포근함의 기운', metal: '결단과 순수함의 기운',
      water: '지혜와 깊이의 기운'
    };

    var pillars = window.G_PILLARS;
    var dayGan = window.DAY_GAN || (pillars && pillars.d && pillars.d.g) || '';
    var GAN = window.GAN || {};
    var ganInfo = GAN[dayGan] || {};
    var ganName = ganInfo.n || dayGan;

    var dayZhi = totemData.dayZhi;
    var JI = window.JI || {};
    var jiInfo = JI[dayZhi] || {};
    var jiAnimal = jiInfo.a || '';

    var parts = [];

    if (ganName) {
      parts.push('<strong>' + ganName + '(' + dayGan + ')</strong>의 ' + elDesc[el]);
    }
    if (dayZhi && jiAnimal) {
      parts.push('일지 <strong>' + dayZhi + '(' + jiAnimal + ')</strong>의 ' + (totemData.dayGanElement ? (elKr[totemData.dayGanElement] || '') : '') + ' 특성');
    }
    if (totemData.powerLabel) {
      parts.push('<strong>' + totemData.powerLabel + '</strong> 구조의 강인한 에너지');
    }

    var traitStr = a.traits || '귀엽고 신비로운';
    var animalName = a.name || '수호신';

    var sentParts = parts.length > 0 ? parts.join('과 ') : (elDesc[el] || 'star energy');

    return [
      '사주에 ' + sentParts + '에 의해서,',
      '사주로 볼 때 당신은 <strong>' + traitStr + ' ' + animalName + '</strong>입니다.',
      '<small style="color:var(--sg-text-muted,rgba(0,0,0,0.5))">✦ ' + (a.keyword || '') + ' · ' + (elKr[el] || '') + ' 기반</small>'
    ].join('<br>');
  }

  /* ─────────────────────────────────────
     5. 이미지 URL / 다운로드
  ───────────────────────────────────── */
  function buildImageUrl(prompt) {
    var seed = Math.floor(Math.random() * 999999);
    return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) +
      '?width=512&height=512&nologo=true&seed=' + seed + '&enhance=true';
  }

  function downloadImage(url, filename) {
    fetch(url)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename || 'my-totem.png';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(function () {
        /* fallback: 새 탭으로 열기 */
        window.open(url, '_blank', 'noopener,noreferrer');
      });
  }

  /* ─────────────────────────────────────
     6. 카카오 공유
  ───────────────────────────────────── */
  function shareKakao(totemData, imgUrl) {
    var Kakao = window.Kakao;
    var a = totemData.primary;
    if (!Kakao || !Kakao.isInitialized || !Kakao.isInitialized()) {
      /* 기본 공유 fallback */
      shareNative(totemData);
      return;
    }
    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '내 사주 수호신: ' + a.name,
        description: a.traits + ' ' + a.name + '의 기운을 가진 당신의 수호신을 확인해보세요!',
        imageUrl: imgUrl,
        link: { mobileWebUrl: 'https://code-destiny.com', webUrl: 'https://code-destiny.com' }
      },
      buttons: [{
        title: '나도 수호신 소환하기',
        link: { mobileWebUrl: 'https://code-destiny.com', webUrl: 'https://code-destiny.com' }
      }]
    });
  }

  function shareNative(totemData) {
    var a = totemData.primary;
    if (navigator.share) {
      navigator.share({
        title: '내 사주 수호신: ' + a.name,
        text: a.traits + '한 ' + a.name + '! 사주로 보는 당신의 수호신을 Code Destiny에서 확인해보세요.',
        url: 'https://code-destiny.com'
      }).catch(function () {});
    } else {
      var el = document.createElement('input');
      el.value = 'https://code-destiny.com';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert('링크가 복사되었습니다! code-destiny.com');
    }
  }

  /* ─────────────────────────────────────
     7. 모달 UI 렌더링
  ───────────────────────────────────── */
  function showModal() {
    var overlay = document.getElementById('sajuTotemOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    /* State 결정: 사주 계산 완료 여부 */
    var hasSaju = !!(window.G_PILLARS && window.G_PILLARS.d);
    if (hasSaju) {
      renderStateB();
    } else {
      renderStateNoSaju();
    }
  }

  function hideModal() {
    var overlay = document.getElementById('sajuTotemOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function renderStateNoSaju() {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;
    body.innerHTML = '<div class="stg-no-saju">' +
      '<div class="stg-no-saju__icon">🔮</div>' +
      '<p class="stg-no-saju__title">먼저 사주 분석을 완료해주세요</p>' +
      '<p class="stg-no-saju__desc">생년월일시를 입력하고 사주 분석하기 버튼을 눌러주세요.<br>분석 완료 후 나만의 수호신을 소환할 수 있어요!</p>' +
      '<button class="stg-btn stg-btn--primary" onclick="document.getElementById(\'sajuTotemOverlay\').style.display=\'none\';document.body.style.overflow=\'\';window.scrollTo({top:0,behavior:\'smooth\'})">사주 분석하러 가기 ✨</button>' +
    '</div>';
  }

  function renderStateB() {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;

    var totemData = selectTotem();
    var el = totemData.element;
    var theme = ELEMENT_BG[el] || ELEMENT_BG.wood;

    body.innerHTML =
      '<div class="stg-loading" id="sajuTotemLoading">' +
        '<div class="stg-loading__orbs">' +
          '<span class="stg-orb stg-orb--1"></span>' +
          '<span class="stg-orb stg-orb--2"></span>' +
          '<span class="stg-orb stg-orb--3"></span>' +
        '</div>' +
        '<div class="stg-loading__paintbrush">' +
          '<div class="stg-pb-char">🎨</div>' +
          '<div class="stg-pb-dust">' +
            '<span>✨</span><span>⭐</span><span>💫</span><span>🌟</span><span>✦</span>' +
          '</div>' +
        '</div>' +
        '<p class="stg-loading__title">AI가 당신의 사주 기운을 읽고</p>' +
        '<p class="stg-loading__subtitle">수호신을 소환 중입니다...</p>' +
        '<div class="stg-loading__bar"><div class="stg-loading__bar-fill" id="sajuTotemLoadBar"></div></div>' +
      '</div>';

    /* 로딩 바 애니메이션 */
    var bar = document.getElementById('sajuTotemLoadBar');
    var progress = 0;
    var barTimer = setInterval(function () {
      progress = Math.min(progress + Math.random() * 12, 88);
      if (bar) bar.style.width = progress + '%';
    }, 600);

    var prompt = buildPrompt(totemData);
    var imgUrl = buildImageUrl(prompt);
    var img = new Image();
    var revealed = false;

    function doReveal() {
      if (revealed) return;
      revealed = true;
      clearInterval(barTimer);
      if (bar) bar.style.width = '100%';
      setTimeout(function () { renderStateC(totemData, imgUrl, theme); }, 300);
    }

    img.onload = doReveal;
    img.onerror = doReveal; /* 실패해도 UI 진행 */
    img.src = imgUrl;

    /* 최대 18초 fallback */
    setTimeout(function () { doReveal(); }, 18000);
  }

  function renderStateC(totemData, imgUrl, theme) {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;
    var a = totemData.primary;
    var el = totemData.element;
    var elIcons = { wood: '🌿', fire: '🔥', earth: '🌏', metal: '✨', water: '💧' };
    var desc = buildDescription(totemData);

    body.innerHTML =
      '<div class="stg-result" id="sajuTotemResult" style="--stg-glow:' + theme.glow + ';--stg-bg:' + theme.bg + ';--stg-text:' + theme.text + '">' +

        /* 이미지 카드 */
        '<div class="stg-card">' +
          '<div class="stg-card__glow"></div>' +
          '<div class="stg-card__badge">' + (elIcons[el] || '✨') + ' YOUR GUARDIAN</div>' +
          '<div class="stg-card__img-wrap">' +
            '<img class="stg-card__img" src="' + imgUrl + '" alt="' + a.name + '" id="sajuTotemImg" loading="lazy">' +
            '<div class="stg-card__img-overlay"></div>' +
          '</div>' +
          '<h2 class="stg-card__title">당신의 수호신: <span>' + a.name + '</span></h2>' +
          '<p class="stg-card__keyword">' + (a.keyword || '') + '</p>' +
        '</div>' +

        /* 설명 카드 */
        '<div class="stg-desc-card">' +
          '<div class="stg-desc-card__label">✦ 사주 분석 리포트</div>' +
          '<div class="stg-desc-card__text">' + desc + '</div>' +
        '</div>' +

        /* 버튼 영역 */
        '<div class="stg-actions">' +
          '<button class="stg-btn stg-btn--save" id="sajuTotemSaveBtn" type="button">' +
            '<span class="stg-btn__icon">⬇</span> 이미지 저장하기' +
          '</button>' +
          '<button class="stg-btn stg-btn--share" id="sajuTotemShareBtn" type="button">' +
            '<span class="stg-btn__icon">💬</span> 내 수호신 공유하기' +
          '</button>' +
          '<button class="stg-btn stg-btn--regen" id="sajuTotemRegenBtn" type="button">' +
            '<span class="stg-btn__icon">🔄</span> 다시 소환하기' +
          '</button>' +
        '</div>' +

      '</div>';

    /* 버튼 이벤트 바인딩 */
    var saveBtn = document.getElementById('sajuTotemSaveBtn');
    var shareBtn = document.getElementById('sajuTotemShareBtn');
    var regenBtn = document.getElementById('sajuTotemRegenBtn');

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        downloadImage(imgUrl, 'my-guardian-' + (a.nameEn || 'totem').replace(/\s+/g, '-') + '.png');
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        shareKakao(totemData, imgUrl);
      });
    }
    if (regenBtn) {
      regenBtn.addEventListener('click', function () {
        renderStateB();
      });
    }
  }

  /* ─────────────────────────────────────
     8. 초기화 & 전역 노출
  ───────────────────────────────────── */
  function init() {
    /* 모달 닫기 버튼 */
    var closeBtn = document.getElementById('sajuTotemCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideModal);
    }
    /* 아웃사이드 클릭으로 닫기 */
    var overlay = document.getElementById('sajuTotemOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideModal();
      });
    }
  }

  /* 전역 함수 노출 */
  window.openSajuTotemModal = showModal;
  window.closeSajuTotemModal = hideModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
