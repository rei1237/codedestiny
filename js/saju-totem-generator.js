/**
 * Saju Totem Generator
 * 생년월일 기반 에너지로 사주 초상 이미지를 생성합니다.
 */

(function () {
  'use strict';

  function normalizeAnimalLabel(value) {
    return String(value || '')
      .replace(/^\s*아기\s*/g, '')
      .replace(/\b(cute|baby|little|tiny)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ─────────────────────────────────────
     1. 오행 → 동물 매핑 테이블
  ───────────────────────────────────── */
  var ELEMENT_ANIMALS = {
    wood: [
      { name: '청룡', nameEn: 'azure dragon spirit', keyword: '창조·성장', traits: '창의적이고 성장하는', color: 'green' },
      { name: '숲사슴', nameEn: 'graceful forest deer', keyword: '유연·섬세', traits: '섬세하고 맑은', color: 'green' },
      { name: '민트 고양이', nameEn: 'mystic cat guardian', keyword: '독립·직관', traits: '자유롭고 독립적인', color: 'green' }
    ],
    fire: [
      { name: '태양 사자', nameEn: 'radiant lion guardian', keyword: '열정·용기', traits: '용맹하고 밝은', color: 'orange' },
      { name: '봉황', nameEn: 'celestial phoenix', keyword: '재생·열정', traits: '불꽃처럼 빛나는', color: 'red' },
      { name: '불꽃 여우', nameEn: 'ember fox spirit', keyword: '직관·기지', traits: '재치 있고 빛나는', color: 'orange' }
    ],
    earth: [
      { name: '산곰', nameEn: 'gentle mountain bear', keyword: '안정·치유', traits: '든든하고 포근한', color: 'yellow' },
      { name: '팬더 도인', nameEn: 'tranquil panda sage', keyword: '균형·여유', traits: '느긋하고 균형 잡힌', color: 'yellow' },
      { name: '별 고슴도치', nameEn: 'starlit hedgehog', keyword: '배려·성실', traits: '알뜰하고 성실한', color: 'brown' }
    ],
    metal: [
      { name: '은빛 독수리', nameEn: 'silver eagle sentinel', keyword: '결단·고결', traits: '날카롭고 고결한', color: 'silver' },
      { name: '설원 늑대', nameEn: 'moonlit snow wolf', keyword: '의지·충절', traits: '충직하고 의지 있는', color: 'white' },
      { name: '유니콘', nameEn: 'prismatic unicorn', keyword: '순수·정밀', traits: '순수하고 빛나는', color: 'silver' }
    ],
    water: [
      { name: '청해 거북', nameEn: 'ancient sea turtle', keyword: '지혜·인내', traits: '지혜롭고 깊은', color: 'blue' },
      { name: '돌고래', nameEn: 'dreamwave dolphin', keyword: '조화·직관', traits: '유쾌하고 현명한', color: 'blue' },
      { name: '달빛 물범', nameEn: 'moonlight seal spirit', keyword: '감성·치유', traits: '부드럽고 감성적인', color: 'indigo' }
    ]
  };

  /* 일지(日支) 십이지 동물 */
  var DIZHI_ANIMALS = {
    '子': { name: '월광 쥐', nameEn: 'moonlit zodiac rat', keyword: '영리·적응', traits: '영리하고 빠른' },
    '丑': { name: '수호 황소', nameEn: 'steadfast ox guardian', keyword: '인내·성실', traits: '성실하고 든든한' },
    '寅': { name: '호랑이', nameEn: 'noble tiger spirit', keyword: '용기·의지', traits: '용맹하지만 장난기 넘치는' },
    '卯': { name: '토끼', nameEn: 'graceful rabbit guardian', keyword: '도약·풍요', traits: '사랑스럽고 도약하는' },
    '辰': { name: '용', nameEn: 'celestial dragon', keyword: '창조·권위', traits: '신비롭고 창의적인' },
    '巳': { name: '비단 뱀', nameEn: 'silken serpent spirit', keyword: '재생·지혜', traits: '지혜롭고 신비로운' },
    '午': { name: '질풍마', nameEn: 'windrunner horse', keyword: '자유·열정', traits: '자유롭고 활달한' },
    '未': { name: '양', nameEn: 'pastel sheep muse', keyword: '온화·예술', traits: '온화하고 예술적인' },
    '申': { name: '원숭이', nameEn: 'clever monkey trickster', keyword: '기지·변통', traits: '재치 있고 영특한' },
    '酉': { name: '황금 닭', nameEn: 'golden dawn rooster', keyword: '성실·직관', traits: '부지런하고 직관적인' },
    '戌': { name: '수호견', nameEn: 'loyal guardian dog', keyword: '충성·보호', traits: '충직하고 사랑스러운' },
    '亥': { name: '복돼지', nameEn: 'fortune boar spirit', keyword: '풍요·행운', traits: '복스럽고 따뜻한' }
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

  function captureSajuAnalysisSnapshot() {
    var natal = window.G_NATAL || {};
    var keys = ['wood', 'fire', 'earth', 'metal', 'water'];
    var toNum = function (v) { return isFinite(Number(v)) ? Number(v) : 0; };
    var hasAny = function (obj) {
      return keys.some(function (k) { return toNum(obj[k]) > 0; });
    };
    var normalize = function (obj) {
      return keys.reduce(function (acc, key) {
        acc[key] = toNum(obj[key]);
        return acc;
      }, {});
    };

    var normalizedCounts = normalize(natal.counts || {});
    var normalizedRatios = normalize(natal.ratios || {});
    var hasCounts = hasAny(normalizedCounts);
    var hasRatios = hasAny(normalizedRatios);

    if (!hasCounts && !hasRatios) return null;

    if (!hasCounts && hasRatios) {
      keys.forEach(function (k) { normalizedCounts[k] = Math.max(0, Math.round(normalizedRatios[k] / 10)); });
    }
    if (!hasRatios && hasCounts) {
      var totalCounts = keys.reduce(function (sum, k) { return sum + normalizedCounts[k]; }, 0);
      if (totalCounts > 0) {
        keys.forEach(function (k) { normalizedRatios[k] = Number(((normalizedCounts[k] / totalCounts) * 100).toFixed(1)); });
      }
    }

    return {
      dominant_element: natal.dominant || getDominantElement(),
      five_elements_count: normalizedCounts,
      five_elements_ratio: normalizedRatios
    };
  }

  function mapPowerLabelToPrompt(label) {
    if (label === '신강') return 'dominant self-energy with powerful momentum';
    if (label === '신약') return 'sensitive self-energy with elegant balance';
    return 'balanced spiritual temperament';
  }

  function toPromptSafeEnglish(text, fallback) {
    var value = String(text || '').trim();
    if (!value) return fallback;
    return /[^\x00-\x7F]/.test(value) ? fallback : value;
  }

  function buildImagePrompt(totemData) {
    var primary = totemData && totemData.primary ? totemData.primary : {};
    var zhiAnimal = totemData && totemData.zhiAnimal ? totemData.zhiAnimal : null;
    var elAnimal = totemData && totemData.elAnimal ? totemData.elAnimal : null;
    var element = (totemData && totemData.element) || 'wood';
    var animalNameEn = normalizeAnimalLabel(primary.nameEn || primary.name || 'mystic guardian animal');
    var animalTraits = toPromptSafeEnglish(primary.traits, 'graceful, spiritual, and charismatic');
    var colorAura = primary.color || (elAnimal && elAnimal.color) || 'iridescent';

    var elementMeta = {
      wood: { energy: 'vital growth energy', palette: 'jade green and mint highlights', motif: 'enchanted forest and blooming vines' },
      fire: { energy: 'radiant fire energy', palette: 'amber, scarlet, and warm gold', motif: 'celestial flame petals and solar particles' },
      earth: { energy: 'grounded earth energy', palette: 'honey yellow, warm beige, and soft brown', motif: 'sacred mountain mist and crystal dust' },
      metal: { energy: 'refined metal energy', palette: 'silver white, platinum, and icy blue', motif: 'prismatic shards and aurora reflections' },
      water: { energy: 'deep water energy', palette: 'azure, indigo, and moonlit cyan', motif: 'dreamwave ripples and lunar mist' }
    };
    var meta = elementMeta[element] || elementMeta.wood;
    var zodiacAnimalEn = zhiAnimal && zhiAnimal.nameEn ? zhiAnimal.nameEn : '';
    var baseAnimalEn = elAnimal && elAnimal.nameEn ? elAnimal.nameEn : '';
    var powerPhrase = mapPowerLabelToPrompt((totemData && totemData.powerLabel) || '');
    var sipseong = toPromptSafeEnglish((totemData && totemData.sipseong) ? String(totemData.sipseong) : '', '');
    var sipseongPhrase = sipseong ? ('subtle archetype influence inspired by ' + sipseong) : 'subtle archetype influence from East Asian destiny symbolism';

    return [
      'A highly detailed, breathtaking magical pastel fantasy character portrait.',
      'Main subject: a ' + animalTraits + ' ' + animalNameEn + ', full-body, centered composition, expressive eyes, premium character design.',
      'Energy signature: ' + meta.energy + ', ' + powerPhrase + ', surrounded by a ' + colorAura + ' glowing aura and soft volumetric light.',
      'Saju context: dominant element ' + element + ', zodiac spirit ' + (zodiacAnimalEn || 'mystic zodiac guardian') + ', elemental companion ' + (baseAnimalEn || animalNameEn) + '.',
      'Art direction: whimsical Korean destiny-card vibe, ornate costume details, elegant brush texture, cinematic rim light, layered atmospheric depth.',
      'Background: ' + meta.motif + ', ' + meta.palette + ', magical particles, dreamy bokeh, sacred symbol motifs, depth-rich composition.',
      'Quality: masterpiece, ultra-detailed illustration, high contrast yet soft pastel harmony, clean anatomy, polished shading, 8k render.',
      'Negative constraints: no text, no watermark, no logo, no frame, no blurry face, no extra limbs, no deformed anatomy.',
      'Creative note: ' + sipseongPhrase + '.'
    ].join(' ');
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
    var animalName = normalizeAnimalLabel(a.name || '수호신') || '수호신';

    var sentParts = parts.length > 0 ? parts.join('과 ') : (elDesc[el] || 'star energy');

    return [
      '생년월일 에너지에서 읽힌 핵심은 ' + sentParts + '입니다.',
      '사주 동물 아트 결과에서 <strong>' + traitStr + ' ' + animalName + '</strong> 타입으로 해석됩니다.',
      '<small style="color:var(--sg-text-muted,rgba(0,0,0,0.5))">✦ ' + (a.keyword || '') + ' · ' + (elKr[el] || '') + ' 시그니처</small>'
    ].join('<br>');
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
        title: '사주 동물 아트: ' + a.name,
        description: a.traits + ' ' + a.name + ' 타입의 사주 동물 아트를 확인해보세요!',
        imageUrl: imgUrl,
        link: { mobileWebUrl: 'https://code-destiny.com', webUrl: 'https://code-destiny.com' }
      },
      buttons: [{
        title: '나도 사주 동물 아트 보기',
        link: { mobileWebUrl: 'https://code-destiny.com', webUrl: 'https://code-destiny.com' }
      }]
    });
  }

  function shareNative(totemData) {
    var a = totemData.primary;
    if (navigator.share) {
      navigator.share({
        title: '사주 동물 아트: ' + a.name,
        text: a.traits + '한 ' + a.name + '! 사주 동물 아트를 Code Destiny에서 확인해보세요.',
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
    var contextState = ensureSajuContext();
    var hasSaju = !!contextState.ready;
    if (hasSaju) {
      renderStateB(contextState.source);
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
    body.innerHTML = `
      <div class="stg-no-saju">
        <div class="stg-no-saju__icon">🔮</div>
        <p class="stg-no-saju__title">생년월일 정보가 필요해요</p>
        <p class="stg-no-saju__desc">프로필 카드에 생년월일시를 저장하거나 입력창에 정보를 넣어주세요.<br>분석 버튼을 누르지 않아도 사주 동물 아트를 바로 생성할 수 있습니다.</p>
        <button class="stg-btn stg-btn--primary" onclick="window.closeSajuTotemModal();window.scrollTo({top:0,behavior:'smooth'})">생년월일 입력하러 가기 ✨</button>
      </div>`;
  }

  function renderStateB(contextSource) {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;

    var totemData = selectTotem();
    var el = totemData.element;
    var theme = ELEMENT_BG[el] || ELEMENT_BG.wood;
    var imagePrompt = buildImagePrompt(totemData);

    body.innerHTML = `
      <div class="stg-loading" id="sajuTotemLoading">
        <div class="stg-loading__orbs">
          <span class="stg-orb stg-orb--1"></span>
          <span class="stg-orb stg-orb--2"></span>
          <span class="stg-orb stg-orb--3"></span>
        </div>
        <div class="stg-loading__paintbrush">
          <div class="stg-pb-char">🎨</div>
          <div class="stg-pb-dust">
            <span>✨</span><span>⭐</span><span>💫</span><span>🌟</span><span>✦</span>
          </div>
        </div>
        <p class="stg-loading__title">사주 기운을 읽어 동물 캐릭터를 스케치 중이에요</p>
        <p class="stg-loading__subtitle">파스텔 만화풍으로 당신의 동물 아트를 채색하고 있어요...</p>
        <div class="stg-loading__bar"><div class="stg-loading__bar-fill" id="sajuTotemLoadBar"></div></div>
      </div>`;

    /* 로딩 바 애니메이션 */
    var bar = document.getElementById('sajuTotemLoadBar');
    var progress = 0;
    var barTimer = setInterval(function () {
      progress = Math.min(progress + Math.random() * 12, 88);
      if (bar) bar.style.width = progress + '%';
    }, 600);

    var requestProfile = getProfileFromManager() || buildProfileFromInputs();
    if (!requestProfile || !requestProfile.birth) {
      clearInterval(barTimer);
      renderStateNoSaju();
      return;
    }

    var done = false;
    function finishWithSuccess(guardian) {
      if (done) return;
      done = true;
      clearInterval(barTimer);
      if (bar) bar.style.width = '100%';
      setTimeout(function () {
        renderStateC(totemData, guardian, theme, contextSource);
      }, 240);
    }
    function finishWithFailure() {
      if (done) return;
      done = true;
      clearInterval(barTimer);
      renderStateFailure(contextSource);
    }

    var sajuAnalysis = captureSajuAnalysisSnapshot();
    fetch('/api/guardian-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imagePrompt: imagePrompt,
        profile: requestProfile,
        sajuAnalysis: sajuAnalysis,
        renderMode: 'saju-animal',
        promptVersion: 'saju-totem-v2'
      })
    })
      .then(function (resp) {
        return resp.json().catch(function () { return null; }).then(function (data) {
          if (!resp.ok || !data || !data.ok || !data.guardian || !data.guardian.svg_data_uri) {
            throw new Error((data && data.message) || ('saju-animal-api-failed-' + resp.status));
          }
          return data.guardian;
        });
      })
      .then(function (guardian) {
        finishWithSuccess(guardian);
      })
      .catch(function () {
        finishWithFailure();
      });
  }

  function renderStateFailure(contextSource) {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;
    var sourceLabel = contextSource === 'profile' ? '프로필 기반 에너지 리포트' : '생년월일 에너지 리포트';
    body.innerHTML = `
      <div class="stg-no-saju">
        <div class="stg-no-saju__icon">⏳</div>
        <p class="stg-no-saju__title">현재 API 이용자가 많아 실패했습니다. 잠시 후 다시 시도해주세요.</p>
        <p class="stg-no-saju__desc">${sourceLabel}를 바탕으로 재시도하면 더 선명한 결과를 받을 수 있어요.</p>
        <button class="stg-btn stg-btn--primary" id="sajuTotemRetryBtn" type="button">다시 시도하기 ✨</button>
      </div>`;

    var retryBtn = document.getElementById('sajuTotemRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        renderStateB(contextSource || 'analysis');
      });
    }
  }

  function drawCanvasBackdrop(ctx, size, element) {
    var palettes = {
      wood: ['#d9f99d', '#86efac', '#bbf7d0'],
      fire: ['#fed7aa', '#fca5a5', '#fdba74'],
      earth: ['#fde68a', '#fcd34d', '#fef3c7'],
      metal: ['#e2e8f0', '#cbd5e1', '#bfdbfe'],
      water: ['#bfdbfe', '#93c5fd', '#c4b5fd']
    };
    var p = palettes[element] || palettes.wood;
    var bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, p[0]);
    bg.addColorStop(0.55, p[1]);
    bg.addColorStop(1, p[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    var glow = ctx.createRadialGradient(size * 0.5, size * 0.36, size * 0.06, size * 0.5, size * 0.36, size * 0.42);
    glow.addColorStop(0, 'rgba(255,255,255,0.85)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    var i;
    for (i = 0; i < 24; i += 1) {
      var x = Math.random() * size;
      var y = Math.random() * size * 0.75;
      var r = Math.random() * (size * 0.009) + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function isFlatRenderedCanvas(ctx, size) {
    try {
      var data = ctx.getImageData(0, 0, size, size).data;
      var minL = 255;
      var maxL = 0;
      var alphaPixels = 0;
      var step = Math.max(16, Math.floor((size * size) / 1800)) * 4;
      var i;
      for (i = 0; i < data.length; i += step) {
        var a = data[i + 3];
        if (a > 20) {
          alphaPixels += 1;
          var lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
          if (lum < minL) minL = lum;
          if (lum > maxL) maxL = lum;
        }
      }
      if (alphaPixels < 40) return true;
      return (maxL - minL) < 16;
    } catch (e) {
      return false;
    }
  }

  function drawGuardianOnCanvas(imageUrl, totemData, onFail) {
    var canvas = document.getElementById('sajuTotemCanvas');
    if (!canvas) return;

    if (!imageUrl) {
      if (typeof onFail === 'function') onFail();
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var cssSize = Math.max(320, canvas.clientWidth || 560);
    var dpr = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cssSize, cssSize);
    drawCanvasBackdrop(ctx, cssSize, (totemData && totemData.element) || 'wood');

    var img = new Image();
    if (/^https?:\/\//.test(imageUrl)) img.crossOrigin = 'anonymous';
    img.onload = function () {
      var iw = img.naturalWidth || cssSize;
      var ih = img.naturalHeight || cssSize;
      var scale = Math.max(cssSize / iw, cssSize / ih);
      var dw = iw * scale;
      var dh = ih * scale;
      var dx = (cssSize - dw) / 2;
      var dy = (cssSize - dh) / 2;

      ctx.clearRect(0, 0, cssSize, cssSize);
      drawCanvasBackdrop(ctx, cssSize, (totemData && totemData.element) || 'wood');
      ctx.drawImage(img, dx, dy, dw, dh);
      if (isFlatRenderedCanvas(ctx, cssSize)) {
        if (typeof onFail === 'function') onFail();
      }
    };
    img.onerror = function () {
      if (typeof onFail === 'function') onFail();
    };
    img.src = imageUrl;
  }

  function renderStateC(totemData, guardian, theme, contextSource) {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;
    var a = totemData.primary;
    var el = totemData.element;
    var elIcons = { wood: '🌿', fire: '🔥', earth: '🌏', metal: '✨', water: '💧' };
    var desc = buildDescription(totemData);
    var sourceLabel = contextSource === 'profile' ? '프로필 기반 에너지 리포트' : '생년월일 에너지 리포트';
    var imgUrl = guardian && guardian.svg_data_uri ? guardian.svg_data_uri : '';
    if (!imgUrl) {
      renderStateFailure(contextSource);
      return;
    }
    var cleanAnimalName = normalizeAnimalLabel(a.name || '수호 동물') || '수호 동물';
    var guardianTitle = (guardian && guardian.title) ? guardian.title : (cleanAnimalName + ' 수호 캐릭터');
    var face = guardian && guardian.facial_expression ? guardian.facial_expression : '';
    var bg = guardian && guardian.background_motif ? guardian.background_motif : '';
    var summary = guardian && guardian.summary ? guardian.summary : '';
    var apiWarning = guardian && guardian.warning_message ? guardian.warning_message : '';
    var cardKeyword = summary || (a.keyword || '사주 에너지 기반 수호 캐릭터');
    body.innerHTML = `
      <div class="stg-result" id="sajuTotemResult" style="--stg-glow:${theme.glow};--stg-bg:${theme.bg};--stg-text:${theme.text}">
        <div class="stg-card">
          <div class="stg-card__glow"></div>
          <div class="stg-card__badge">${elIcons[el] || '✨'} SAJU PORTRAIT</div>
          <div class="stg-card__img-wrap">
            <canvas class="stg-card__canvas" id="sajuTotemCanvas" style="width:min(92vw,640px);height:min(92vw,640px);" aria-label="사주 동물 아트 결과 캔버스"></canvas>
            <div class="stg-card__img-overlay"></div>
          </div>
        </div>

        <div class="stg-desc-card">
          ${apiWarning
            ? '<div class="stg-api-warning-row"><div class="stg-api-warning">⚠ ' + apiWarning + '</div><button class="stg-api-retry-inline" id="sajuTotemAiRetryBtn" type="button">AI 원본 다시 생성</button></div>'
            : ''}
          <div class="stg-desc-card__label">✦ ${sourceLabel}</div>
          <div class="stg-desc-card__title">${guardianTitle}</div>
          <div class="stg-desc-card__text" style="margin-bottom:8px;">${cardKeyword}</div>
          <div class="stg-desc-card__label">요약</div>
          <div class="stg-desc-card__text" style="margin-bottom:8px;">${summary || '사주 중심 기운에 맞는 얼굴과 배경으로 완성된 이미지입니다.'}</div>
          <div class="stg-desc-card__label">표정</div>
          <div class="stg-desc-card__text" style="margin-bottom:8px;">${face || '사주 성향에 맞춘 부드러운 표정'}</div>
          <div class="stg-desc-card__label">배경 모티프</div>
          <div class="stg-desc-card__text" style="margin-bottom:8px;">${bg || '오행 중심 파스텔 배경'}</div>
          <div class="stg-desc-card__label">동물 해석</div>
          <div class="stg-desc-card__text">${desc}</div>
        </div>

        <div class="stg-actions">
          <button class="stg-btn stg-btn--save" id="sajuTotemSaveBtn" type="button">
            <span class="stg-btn__icon">⬇</span> 이미지 저장하기
          </button>
          <button class="stg-btn stg-btn--share" id="sajuTotemShareBtn" type="button">
            <span class="stg-btn__icon">💬</span> 내 모습 공유하기
          </button>
          <button class="stg-btn stg-btn--regen" id="sajuTotemRegenBtn" type="button">
            <span class="stg-btn__icon">🔄</span> 다시 소환하기
          </button>
        </div>
      </div>`;

    drawGuardianOnCanvas(imgUrl, totemData, function () {
      renderStateFailure(contextSource);
    });

    /* 버튼 이벤트 바인딩 */
    var saveBtn = document.getElementById('sajuTotemSaveBtn');
    var shareBtn = document.getElementById('sajuTotemShareBtn');
    var regenBtn = document.getElementById('sajuTotemRegenBtn');
    var aiRetryBtn = document.getElementById('sajuTotemAiRetryBtn');

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        downloadImage(imgUrl, 'my-guardian-' + (a.nameEn || 'totem').replace(/\s+/g, '-') + '.png');
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var safeShareImage = /^https?:\/\//.test(imgUrl) ? imgUrl : 'https://code-destiny.com/icons/honeypig.webp';
        shareKakao(totemData, safeShareImage);
      });
    }
    if (regenBtn) {
      regenBtn.addEventListener('click', function () {
        renderStateB(contextSource || 'analysis');
      });
    }
    if (aiRetryBtn) {
      aiRetryBtn.addEventListener('click', function () {
        renderStateB(contextSource || 'analysis');
      });
    }
  }

  function getProfileFromManager() {
    try {
      if (!window.DestinyProfileManager || !window.DestinyProfileManager.storage || typeof window.DestinyProfileManager.storage.current !== 'function') {
        return null;
      }
      var profile = window.DestinyProfileManager.storage.current();
      if (profile && profile.birth && profile.birth.year && profile.birth.month && profile.birth.day) {
        return profile;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function buildProfileFromInputs() {
    var birthDateEl = document.getElementById('birthDate');
    var rawDate = birthDateEl && birthDateEl.value ? String(birthDateEl.value) : '';
    if (!rawDate || rawDate.indexOf('-') < 0) return null;

    var parts = rawDate.split('-');
    if (parts.length < 3) return null;

    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    if (!year || !month || !day) return null;

    var hourEl = document.getElementById('birthHour');
    var minuteEl = document.getElementById('birthMinute');
    var calTypeEl = document.getElementById('calType');
    var countrySel = document.getElementById('birthCountry');
    var selectedOpt = countrySel && countrySel.options ? countrySel.options[countrySel.selectedIndex] : null;

    var latRaw = selectedOpt && (selectedOpt.getAttribute('data-lat') || (selectedOpt.dataset && selectedOpt.dataset.lat));
    var lonRaw = selectedOpt && (selectedOpt.getAttribute('data-lon') || (selectedOpt.dataset && selectedOpt.dataset.lon));
    var tzRaw = selectedOpt && (selectedOpt.getAttribute('data-tz') || (selectedOpt.dataset && selectedOpt.dataset.tz));
    var tzOffRaw = selectedOpt && (
      selectedOpt.getAttribute('data-tz-offset') ||
      selectedOpt.getAttribute('data-tzoffset') ||
      selectedOpt.getAttribute('data-utc-offset') ||
      (selectedOpt.dataset && (selectedOpt.dataset.tzOffset || selectedOpt.dataset.tzoffset || selectedOpt.dataset.utcOffset))
    );

    return {
      name: (document.getElementById('name') || {}).value || '나',
      gender: window._gender || 'F',
      birth: {
        year: year,
        month: month,
        day: day,
        hour: Number(hourEl && hourEl.value != null ? hourEl.value : 12) || 12,
        minute: Number(minuteEl && minuteEl.value != null ? minuteEl.value : 0) || 0,
        calType: (calTypeEl && calTypeEl.value) || 'solar'
      },
      location: {
        lat: (latRaw != null && latRaw !== '') ? Number(latRaw) : 37.5665,
        lng: (lonRaw != null && lonRaw !== '') ? Number(lonRaw) : 126.9780,
        tz: tzRaw || 'Asia/Seoul',
        baseTzOffset: (tzOffRaw != null && tzOffRaw !== '') ? Number(tzOffRaw) : 9
      }
    };
  }

  function ensureSajuContext() {
    if (window.G_PILLARS && window.G_PILLARS.d) {
      return { ready: true, source: 'analysis' };
    }

    if (typeof window.computeProfileForModal === 'function') {
      var profile = getProfileFromManager();
      if (profile) {
        var fromProfile = window.computeProfileForModal(profile);
        if (fromProfile && window.G_PILLARS && window.G_PILLARS.d) {
          return { ready: true, source: 'profile' };
        }
      }

      var inputProfile = buildProfileFromInputs();
      if (inputProfile) {
        var fromInput = window.computeProfileForModal(inputProfile);
        if (fromInput && window.G_PILLARS && window.G_PILLARS.d) {
          return { ready: true, source: 'input' };
        }
      }
    }

    return { ready: false, source: 'none' };
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
