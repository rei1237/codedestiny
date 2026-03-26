/**
 * Saju Totem Service Layer
 * 도메인 계산/해석 로직만 담당합니다.
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

  var ELEMENT_BG = {
    wood: { bg: 'linear-gradient(135deg,#e8f5e9 0%,#f1f8e9 50%,#e0f2f1 100%)', glow: '#4caf50', text: '#1b5e20' },
    fire: { bg: 'linear-gradient(135deg,#fff3e0 0%,#fce4ec 50%,#fff8e1 100%)', glow: '#ff9800', text: '#bf360c' },
    earth: { bg: 'linear-gradient(135deg,#fffde7 0%,#fff8e1 50%,#fef3c7 100%)', glow: '#f59e0b', text: '#78350f' },
    metal: { bg: 'linear-gradient(135deg,#f3f4f6 0%,#ecfeff 50%,#f8fafc 100%)', glow: '#6b7280', text: '#1f2937' },
    water: { bg: 'linear-gradient(135deg,#eff6ff 0%,#f0f9ff 50%,#eef2ff 100%)', glow: '#3b82f6', text: '#1e3a8a' }
  };

  function getDominantElement() {
    try {
      var natal = window.G_NATAL;
      if (!natal || !natal.ratios) return 'wood';
      var r = natal.ratios;
      var dominated = 'wood';
      var max = 0;
      var keys = ['wood', 'fire', 'earth', 'metal', 'water'];
      keys.forEach(function (k) {
        var v = Number(r[k] || 0);
        if (v > max) {
          max = v;
          dominated = k;
        }
      });
      return dominated;
    } catch (e) {
      return 'wood';
    }
  }

  function getDayZhi() {
    try {
      var pillars = window.G_PILLARS;
      if (pillars && pillars.d && pillars.d.j) return pillars.d.j;
      return null;
    } catch (e) {
      return null;
    }
  }

  function getDayGanElement() {
    try {
      var pillars = window.G_PILLARS;
      if (pillars && pillars.d && pillars.d.gE) return pillars.d.gE;
      var dg = window.DAY_GAN || '';
      var GAN = window.GAN || {};
      return GAN[dg] && GAN[dg].e ? GAN[dg].e : null;
    } catch (e) {
      return null;
    }
  }

  function getPowerLabel() {
    try {
      var p = window.G_POWER;
      if (p && typeof p.isStrong === 'boolean') return p.isStrong ? '신강' : '신약';
      return '';
    } catch (e) {
      return '';
    }
  }

  function captureSajuAnalysisSnapshot() {
    var natal = window.G_NATAL || {};
    var keys = ['wood', 'fire', 'earth', 'metal', 'water'];
    var toNum = function (v) {
      return isFinite(Number(v)) ? Number(v) : 0;
    };
    var hasAny = function (obj) {
      return keys.some(function (k) {
        return toNum(obj[k]) > 0;
      });
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
      keys.forEach(function (k) {
        normalizedCounts[k] = Math.max(0, Math.round(normalizedRatios[k] / 10));
      });
    }
    if (!hasRatios && hasCounts) {
      var totalCounts = keys.reduce(function (sum, k) {
        return sum + normalizedCounts[k];
      }, 0);
      if (totalCounts > 0) {
        keys.forEach(function (k) {
          normalizedRatios[k] = Number(((normalizedCounts[k] / totalCounts) * 100).toFixed(1));
        });
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

  function buildAvatarPromptSeed() {
    try {
      if (typeof window.generateAvatarPrompt !== 'function') return '';
      var dayGan = (window.G_PILLARS && window.G_PILLARS.d && window.G_PILLARS.d.g) || window.DAY_GAN || '';
      if (!dayGan) return '';
      var seed = window.generateAvatarPrompt({ d: { g: dayGan } });
      return toPromptSafeEnglish(seed, '');
    } catch (e) {
      return '';
    }
  }

  function buildImagePrompt(totemData, profile) {
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
    var sipseong = toPromptSafeEnglish(totemData && totemData.sipseong ? String(totemData.sipseong) : '', '');
    var sipseongPhrase = sipseong ? ('subtle archetype influence inspired by ' + sipseong) : 'subtle archetype influence from East Asian destiny symbolism';
    var avatarSeed = buildAvatarPromptSeed(profile);

    return [
      'A highly detailed, breathtaking magical pastel fantasy character portrait.',
      'Main subject: a ' + animalTraits + ' ' + animalNameEn + ', full-body, centered composition, expressive eyes, premium character design.',
      'Energy signature: ' + meta.energy + ', ' + powerPhrase + ', surrounded by a ' + colorAura + ' glowing aura and soft volumetric light.',
      'Saju context: dominant element ' + element + ', zodiac spirit ' + (zodiacAnimalEn || 'mystic zodiac guardian') + ', elemental companion ' + (baseAnimalEn || animalNameEn) + '.',
      avatarSeed ? ('Avatar base prompt seed: ' + avatarSeed + '.') : 'Avatar base prompt seed: pastel cute guardian style with clear animal identity.',
      'Art direction: whimsical Korean destiny-card vibe, ornate costume details, elegant brush texture, cinematic rim light, layered atmospheric depth.',
      'Background: ' + meta.motif + ', ' + meta.palette + ', magical particles, dreamy bokeh, sacred symbol motifs, depth-rich composition.',
      'Quality: polished high-quality illustration, clean anatomy, balanced detail density for fast SVG generation.',
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
    } catch (e) {
      return '';
    }
  }

  function selectTotem() {
    var dayZhi = getDayZhi();
    var dominantEl = getDominantElement();
    var dayGanEl = getDayGanElement();
    var powerLabel = getPowerLabel();
    var sipseong = getSipseong();

    var zhiAnimal = dayZhi && DIZHI_ANIMALS[dayZhi] ? DIZHI_ANIMALS[dayZhi] : null;
    var elAnimalList = ELEMENT_ANIMALS[dominantEl] || ELEMENT_ANIMALS.wood;
    var elAnimal = elAnimalList[0];

    if (dayGanEl && ELEMENT_ANIMALS[dayGanEl]) {
      elAnimal = ELEMENT_ANIMALS[dayGanEl][0];
    }

    return {
      primary: zhiAnimal || elAnimal,
      element: dominantEl,
      dayGanElement: dayGanEl || dominantEl,
      dayZhi: dayZhi,
      powerLabel: powerLabel,
      sipseong: sipseong,
      zhiAnimal: zhiAnimal,
      elAnimal: elAnimal
    };
  }

  function buildDescription(totemData) {
    var a = totemData.primary;
    var el = totemData.element;
    var elKr = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
    var elDesc = {
      wood: '성장과 창조의 기운',
      fire: '열정과 빛의 기운',
      earth: '안정과 포근함의 기운',
      metal: '결단과 순수함의 기운',
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
        lat: latRaw != null && latRaw !== '' ? Number(latRaw) : 37.5665,
        lng: lonRaw != null && lonRaw !== '' ? Number(lonRaw) : 126.9780,
        tz: tzRaw || 'Asia/Seoul',
        baseTzOffset: tzOffRaw != null && tzOffRaw !== '' ? Number(tzOffRaw) : 9
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

  window.SajuTotemService = {
    ELEMENT_BG: ELEMENT_BG,
    normalizeAnimalLabel: normalizeAnimalLabel,
    selectTotem: selectTotem,
    buildDescription: buildDescription,
    buildImagePrompt: buildImagePrompt,
    buildAvatarPromptSeed: buildAvatarPromptSeed,
    captureSajuAnalysisSnapshot: captureSajuAnalysisSnapshot,
    getProfileFromManager: getProfileFromManager,
    buildProfileFromInputs: buildProfileFromInputs,
    ensureSajuContext: ensureSajuContext
  };
})();