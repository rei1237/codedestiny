const ELEMENT_KEYS = ['wood', 'fire', 'earth', 'metal', 'water'];

const ELEMENT_ALIASES = {
  wood: 'wood',
  Wood: 'wood',
  WOOD: 'wood',
  목: 'wood',
  fire: 'fire',
  Fire: 'fire',
  FIRE: 'fire',
  화: 'fire',
  earth: 'earth',
  Earth: 'earth',
  EARTH: 'earth',
  토: 'earth',
  metal: 'metal',
  Metal: 'metal',
  METAL: 'metal',
  gold: 'metal',
  Gold: 'metal',
  GOLD: 'metal',
  금: 'metal',
  water: 'water',
  Water: 'water',
  WATER: 'water',
  수: 'water'
};

const ELEMENT_LABELS = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water'
};

const ELEMENT_KOREAN_LABELS = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)'
};

const SEASON_ALIASES = {
  spring: 'Spring',
  Spring: 'Spring',
  봄: 'Spring',
  summer: 'Summer',
  Summer: 'Summer',
  여름: 'Summer',
  autumn: 'Autumn',
  fall: 'Autumn',
  Autumn: 'Autumn',
  Fall: 'Autumn',
  가을: 'Autumn',
  winter: 'Winter',
  Winter: 'Winter',
  겨울: 'Winter'
};

const MONTH_TO_SEASON = {
  1: 'Winter',
  2: 'Winter',
  3: 'Spring',
  4: 'Spring',
  5: 'Spring',
  6: 'Summer',
  7: 'Summer',
  8: 'Summer',
  9: 'Autumn',
  10: 'Autumn',
  11: 'Autumn',
  12: 'Winter'
};

const WATER_LEVELS = ['low', 'balanced', 'high'];
const ENVIRONMENTS = ['Forest', 'Garden', 'Pond', 'Lake', 'Rock', 'Desert', 'Field', 'Wetland', 'NightSky'];

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeElement(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return ELEMENT_ALIASES[trimmed] || ELEMENT_ALIASES[trimmed.toLowerCase()] || '';
}

function normalizeSeason(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return SEASON_ALIASES[trimmed] || SEASON_ALIASES[trimmed.toLowerCase()] || '';
}

function normalizeEnvironment(value) {
  if (typeof value !== 'string') return '';
  const v = value.trim().toLowerCase();
  if (!v) return '';
  if (v.includes('rock') || v.includes('바위') || v.includes('cliff')) return 'Rock';
  if (v.includes('pond') || v.includes('연못')) return 'Pond';
  if (v.includes('lake') || v.includes('호수')) return 'Lake';
  if (v.includes('forest') || v.includes('숲')) return 'Forest';
  if (v.includes('garden') || v.includes('정원')) return 'Garden';
  if (v.includes('desert') || v.includes('사막')) return 'Desert';
  if (v.includes('field') || v.includes('초원') || v.includes('들')) return 'Field';
  if (v.includes('wet') || v.includes('습지')) return 'Wetland';
  if (v.includes('night') || v.includes('cosmic') || v.includes('우주') || v.includes('밤')) return 'NightSky';
  return '';
}

function getBirthFromData(userData) {
  const birth = userData && userData.birth ? userData.birth : {};
  return {
    year: safeNumber(birth.year, 0),
    month: safeNumber(birth.month, 0),
    day: safeNumber(birth.day, 0),
    hour: safeNumber(birth.hour, 12),
    minute: safeNumber(birth.minute, 0)
  };
}

function readElementWeightMap(userData) {
  const sources = [
    userData && userData.elementWeights,
    userData && userData.elements,
    userData && userData.saju && userData.saju.elementWeights,
    userData && userData.saju && userData.saju.elements,
    userData && userData.saju && userData.saju.oheng,
    userData && userData.analysis && userData.analysis.elementWeights,
    userData && userData.analysis && userData.analysis.elements
  ];

  const map = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0
  };

  let assigned = false;

  for (let i = 0; i < sources.length; i += 1) {
    const src = sources[i];
    if (!src || typeof src !== 'object') continue;

    if (Array.isArray(src) && src.length >= 5) {
      map.wood = safeNumber(src[0], map.wood);
      map.fire = safeNumber(src[1], map.fire);
      map.earth = safeNumber(src[2], map.earth);
      map.metal = safeNumber(src[3], map.metal);
      map.water = safeNumber(src[4], map.water);
      assigned = true;
      continue;
    }

    Object.keys(src).forEach((k) => {
      const key = normalizeElement(k);
      if (!key) return;
      map[key] = safeNumber(src[k], map[key]);
      assigned = true;
    });
  }

  if (!assigned) {
    map.wood = 20;
    map.fire = 20;
    map.earth = 20;
    map.metal = 20;
    map.water = 20;
  }

  const total = ELEMENT_KEYS.reduce((sum, key) => sum + Math.max(0, map[key]), 0);
  if (total <= 0) {
    return {
      wood: 20,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 20
    };
  }

  return ELEMENT_KEYS.reduce((acc, key) => {
    acc[key] = Number(((Math.max(0, map[key]) / total) * 100).toFixed(1));
    return acc;
  }, {});
}

function sortedElements(weights) {
  return ELEMENT_KEYS
    .map((key) => ({ key, value: safeNumber(weights[key], 0) }))
    .sort((a, b) => b.value - a.value);
}

function inferSeason(userData, birth) {
  const direct =
    normalizeSeason(userData && userData.season) ||
    normalizeSeason(userData && userData.saju && userData.saju.season) ||
    normalizeSeason(userData && userData.analysis && userData.analysis.season);

  if (direct) return direct;
  if (birth.month && MONTH_TO_SEASON[birth.month]) return MONTH_TO_SEASON[birth.month];
  return 'Spring';
}

function inferEnvironment(userData, weights, season) {
  const direct =
    normalizeEnvironment(userData && userData.environment) ||
    normalizeEnvironment(userData && userData.saju && userData.saju.environment) ||
    normalizeEnvironment(userData && userData.analysis && userData.analysis.environment);

  if (direct) return direct;

  if (weights.water >= 30) return season === 'Winter' ? 'Lake' : 'Pond';
  if (weights.metal >= 30 && weights.earth >= 22) return 'Rock';
  if (weights.fire >= 32 && weights.water <= 15) return 'Desert';
  if (weights.wood >= 30) return 'Forest';
  if (weights.earth >= 30) return 'Field';
  return 'Garden';
}

function inferWaterLevel(userData, weights, season) {
  const fromInput = userData && (
    userData.water_level || userData.waterLevel || userData.moistureLevel ||
    (userData.saju && (userData.saju.water_level || userData.saju.waterLevel || userData.saju.moistureLevel)) ||
    (userData.analysis && (userData.analysis.water_level || userData.analysis.waterLevel || userData.analysis.moistureLevel))
  );
  if (typeof fromInput === 'string') {
    const v = fromInput.trim().toLowerCase();
    if (WATER_LEVELS.includes(v)) return v;
  }

  const hydrationScore =
    weights.water +
    (season === 'Winter' ? 6 : 0) +
    (season === 'Summer' ? -4 : 0) -
    weights.fire * 0.2;

  if (hydrationScore >= 28) return 'high';
  if (hydrationScore <= 16) return 'low';
  return 'balanced';
}

function inferTemperatureLevel(weights, season) {
  const thermal = weights.fire - weights.water;
  if (season === 'Summer' && thermal >= 8) return 'hot';
  if (season === 'Winter' && thermal <= -6) return 'cold';
  if (thermal >= 10) return 'hot';
  if (thermal <= -10) return 'cold';
  return 'temperate';
}

function inferYinYangBalance(userData, weights) {
  const explicit = userData && userData.yin_yang_balance;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();

  const yin = weights.water + weights.earth;
  const yang = weights.fire + weights.wood + weights.metal * 0.6;
  const diff = yin - yang;
  if (Math.abs(diff) < 5) return 'balanced';
  return diff > 0 ? 'yin-leaning' : 'yang-leaning';
}

function pickParticleHint(dominantElement) {
  switch (dominantElement) {
    case 'Water':
      return 'water_droplet';
    case 'Fire':
      return 'ember_spark';
    case 'Earth':
      return 'dust_mote';
    case 'Metal':
      return 'metal_shard';
    case 'Wood':
    default:
      return 'pollen_glow';
  }
}

function normalizeBirthSign(data) {
  if (!data || typeof data !== 'string') return '';
  const v = data.trim();
  if (!v) return '';
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function normalizeSignalList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((x) => String(x || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function normalizeElementList(value) {
  return normalizeSignalList(value)
    .map((v) => ELEMENT_LABELS[normalizeElement(v)] || '')
    .filter(Boolean);
}

const ASTRO_ELEMENT_BY_SIGN = Object.freeze({
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water'
});

const ASTRO_ELEMENT_LABEL_KO = Object.freeze({
  Fire: '불',
  Earth: '흙',
  Air: '공기',
  Water: '물'
});

const ASTRO_FLOWER_LIBRARY = Object.freeze({
  flame_tulip: {
    id: 'flame_tulip',
    name: '불꽃튤립',
    scientific_name: 'Tulipa gesneriana var. flame',
    symbolism: '점화, 추진, 생명력의 폭발',
    primary_color: '#FF6B35',
    secondary_color: '#FFB703',
    particle_type: 'stardust_ember',
    keywords: ['점화', '돌파', '열정'],
    vibe_message: '별의 불씨를 행동으로 옮길 때 운이 가장 빠르게 열린다.'
  },
  tiger_lily: {
    id: 'tiger_lily',
    name: '호랑이백합',
    scientific_name: 'Lilium lancifolium',
    symbolism: '야성, 용기, 자존의 광채',
    primary_color: '#FF7A00',
    secondary_color: '#E5383B',
    particle_type: 'stardust_ember',
    keywords: ['용기', '리더십', '폭발력'],
    vibe_message: '정면 돌파가 필요한 시기, 당신의 불은 이미 충분히 강하다.'
  },
  ivy_bloom: {
    id: 'ivy_bloom',
    name: '아이비',
    scientific_name: 'Hedera helix',
    symbolism: '지속, 안정, 구조적 성장',
    primary_color: '#386641',
    secondary_color: '#6A994E',
    particle_type: 'stardust_moss',
    keywords: ['지속', '안정', '축적'],
    vibe_message: '오늘의 한 칸을 채우는 꾸준함이 운명의 벽을 완성한다.'
  },
  resilient_rose: {
    id: 'resilient_rose',
    name: '클래식 로즈',
    scientific_name: 'Rosa hybrida resilient',
    symbolism: '회복탄력, 품격, 고전적 힘',
    primary_color: '#9B2226',
    secondary_color: '#6B705C',
    particle_type: 'stardust_moss',
    keywords: ['품격', '현실감', '견고함'],
    vibe_message: '견고한 기준을 유지할수록 관계와 성과가 동시에 자란다.'
  },
  astro_lavender: {
    id: 'astro_lavender',
    name: '성운 라벤더',
    scientific_name: 'Lavandula nebula',
    symbolism: '청명한 사고, 흐름, 지적 유연성',
    primary_color: '#8D99FF',
    secondary_color: '#C77DFF',
    particle_type: 'stardust_air',
    keywords: ['유연성', '소통', '발상'],
    vibe_message: '생각의 결을 가볍게 유지할수록 정답은 더 빨리 도착한다.'
  },
  bird_of_paradise: {
    id: 'bird_of_paradise',
    name: '극락조화',
    scientific_name: 'Strelitzia reginae',
    symbolism: '독창성, 비상, 시야 확장',
    primary_color: '#3A86FF',
    secondary_color: '#F77F00',
    particle_type: 'stardust_air',
    keywords: ['독창성', '비상', '개방성'],
    vibe_message: '새로운 시야를 택하는 순간, 낡은 한계는 바로 무너진다.'
  },
  water_narcissus: {
    id: 'water_narcissus',
    name: '수선화',
    scientific_name: 'Narcissus aquaticus',
    symbolism: '정화, 감정 재정렬, 내면의 복원',
    primary_color: '#EAF4FF',
    secondary_color: '#9BD0FF',
    particle_type: 'stardust_water',
    keywords: ['정화', '회복', '감정선'],
    vibe_message: '감정을 부정하지 말고 흐르게 두면 해답이 떠오른다.'
  },
  water_anemone: {
    id: 'water_anemone',
    name: '물의 아네모네',
    scientific_name: 'Anemone coronaria aqua',
    symbolism: '몽환, 감응, 부드러운 집중',
    primary_color: '#BDE0FE',
    secondary_color: '#A0C4FF',
    particle_type: 'stardust_water',
    keywords: ['감응', '직관', '몽환'],
    vibe_message: '조용한 직감의 파동이 다음 전환점을 먼저 알려준다.'
  }
});

const ASTRO_ELEMENT_FLOWERS = Object.freeze({
  Fire: ['flame_tulip', 'tiger_lily'],
  Earth: ['ivy_bloom', 'resilient_rose'],
  Air: ['astro_lavender', 'bird_of_paradise'],
  Water: ['water_narcissus', 'water_anemone']
});

const ASTRO_RISING_MOODS = Object.freeze({
  Fire: '위로 치솟는 실루엣과 선명한 발광 테두리',
  Earth: '단단한 줄기 구조와 안정적인 로우 실루엣',
  Air: '떠오르는 곡선과 공중에 부유하는 경량 실루엣',
  Water: '물결형 곡선과 유체 같은 흐름의 실루엣'
});

const ASTRO_MOON_GLOW = Object.freeze({
  Fire: { inner: '#FFB703', outer: '#FB5607' },
  Earth: { inner: '#84A98C', outer: '#52796F' },
  Air: { inner: '#C77DFF', outer: '#6D28D9' },
  Water: { inner: '#A0C4FF', outer: '#48BFE3' }
});

function resolveAstroElement(sign) {
  const normalized = normalizeBirthSign(sign);
  return ASTRO_ELEMENT_BY_SIGN[normalized] || '';
}

function resolveAstroChart(chartData = {}) {
  const sunSign = normalizeBirthSign(chartData.sunSign || chartData.sun_sign || chartData.sun || '');
  const moonSign = normalizeBirthSign(chartData.moonSign || chartData.moon_sign || chartData.moon || '');
  const risingSign = normalizeBirthSign(
    chartData.risingSign || chartData.rising_sign || chartData.ascendant || chartData.rising || ''
  );
  return { sunSign, moonSign, risingSign };
}

function pickAstroFlowerIdsByElement(element, sunSign) {
  const pair = ASTRO_ELEMENT_FLOWERS[element] || ASTRO_ELEMENT_FLOWERS.Air;
  const hash = hashString((sunSign || '') + '|' + element);
  const primary = pair[hash % pair.length];
  const secondary = pair.find((id) => id !== primary) || pair[0];
  return [primary, secondary];
}

function buildAstroNarrative(chart, flower, sunElement, risingElement, moonElement) {
  const sunKo = chart.sunSign || '태양궁 미확인';
  const risingKo = chart.risingSign || '상승궁 미확인';
  const moonKo = chart.moonSign || '달궁 미확인';
  const sunElementKo = ASTRO_ELEMENT_LABEL_KO[sunElement] || '별';
  const risingMood = ASTRO_RISING_MOODS[risingElement] || ASTRO_RISING_MOODS.Air;

  return [
    '당신의 태양은 ' + sunKo + '에 머물며, ' + flower.name + '처럼 ' + sunElementKo + ' 원소의 생명력을 선명하게 드러냅니다.',
    '상승궁 ' + risingKo + '은 꽃의 외형을 ' + risingMood + '으로 만들고,',
    '달궁 ' + moonKo + '은 내면 글로우를 조율해 감정 표현의 결을 완성합니다.'
  ].join(' ');
}

export function getAstrologyFlower(chartData = {}) {
  const chart = resolveAstroChart(chartData);
  const sunElement = resolveAstroElement(chart.sunSign) || 'Air';
  const risingElement = resolveAstroElement(chart.risingSign) || sunElement;
  const moonElement = resolveAstroElement(chart.moonSign) || sunElement;
  const ids = pickAstroFlowerIdsByElement(sunElement, chart.sunSign);
  const primaryFlower = ASTRO_FLOWER_LIBRARY[ids[0]] || ASTRO_FLOWER_LIBRARY.astro_lavender;
  const secondaryFlower = ASTRO_FLOWER_LIBRARY[ids[1]] || primaryFlower;
  const moonGlow = ASTRO_MOON_GLOW[moonElement] || ASTRO_MOON_GLOW.Air;

  const astroVerdict =
    '점성술로 볼 때 당신의 운명꽃은 ' + primaryFlower.name + ' (' + primaryFlower.scientific_name + ') 입니다.';
  const narrative = buildAstroNarrative(chart, primaryFlower, sunElement, risingElement, moonElement);

  return {
    source: 'astrology',
    chart: {
      sun_sign: chart.sunSign,
      moon_sign: chart.moonSign,
      rising_sign: chart.risingSign,
      sun_element: sunElement,
      moon_element: moonElement,
      rising_element: risingElement
    },
    flower: primaryFlower,
    flower_options: [primaryFlower, secondaryFlower],
    astro_verdict: astroVerdict,
    narrative,
    theme: {
      palette: {
        primary: primaryFlower.primary_color,
        secondary: primaryFlower.secondary_color,
        moonGlowInner: moonGlow.inner,
        moonGlowOuter: moonGlow.outer
      },
      zodiac_trace: chart.sunSign || 'Cosmic',
      nebula_blur: 22,
      particle: {
        type: primaryFlower.particle_type,
        intensity: 1
      }
    },
    flower_data: {
      sticker_label: '점성술로 보는 꽃',
      day_master_badge: chart.sunSign ? ('태양궁 ' + chart.sunSign) : '태양궁 미확인',
      season_label: chart.risingSign ? ('상승궁 ' + chart.risingSign) : '상승궁 미확인',
      environment_label: chart.moonSign ? ('달궁 ' + chart.moonSign) : '달궁 미확인',
      scenario_title: '태양·상승·달궁 통합 개화 시나리오',
      scenario_reason: narrative,
      motion_preset: sunElement === 'Water' ? 'water-flow' : (sunElement === 'Fire' ? 'fire-bloom' : 'wood-grow'),
      focus_signal: [chart.sunSign, chart.risingSign, chart.moonSign].filter(Boolean).join(' · ') || '차트 데이터 대기',
      ritual_tip: '오늘 밤 3분간 호흡을 고르고 별자리 하나를 바라보며 의도를 고정해보세요.',
      relationship_theme: '태양궁의 주도성과 달궁의 감수성을 균형 잡을 때 관계가 가장 아름답게 개화합니다.',
      career_theme: '상승궁이 만든 페르소나를 업무 스타일에 반영하면 실행력과 표현력이 동시에 상승합니다.',
      growth_cycle: '별의 호출 → 궤적 형성 → 성운 개화 → 광휘 확산',
      fallback_note: chart.sunSign ? '' : '태양궁 데이터가 없어 상승/달궁 중심으로 보정했습니다.'
    }
  };
}

export function matchAstrologyFlower(userData = {}, options = {}) {
  const profile = userData && userData.schema === 'universal-destiny-profile' ? userData : parseDestinyProfile(userData);
  const chartData = {
    sunSign: profile.domains.astrology.sun_sign,
    moonSign: profile.domains.astrology.moon_sign,
    risingSign: profile.domains.astrology.rising_sign
  };
  const astroMatch = getAstrologyFlower(chartData);
  const hasSajuAndAstro = Boolean(
    profile.domains.saju && profile.domains.saju.day_master && astroMatch.chart && astroMatch.chart.sun_sign
  );

  return {
    profile,
    ...astroMatch,
    ultimate_destiny_flower: hasSajuAndAstro
      ? {
          enabled: true,
          title: 'Ultimate Destiny Flower',
          concept:
            '동양의 ' + profile.domains.saju.day_master + ' 기운이 서양의 ' + astroMatch.chart.sun_sign + ' 별빛과 융합한 하이브리드 개화',
          palette: {
            primary: astroMatch.theme.palette.primary,
            secondary: astroMatch.theme.palette.secondary,
            stardust: astroMatch.theme.palette.moonGlowOuter
          }
        }
      : { enabled: false },
    algorithm: {
      version: '1.0.0-astrology-flower',
      note: 'Sun(핵심 꽃) + Rising(실루엣) + Moon(글로우) 통합 매핑 엔진',
      source: options.source || 'astrology'
    }
  };
}

const JAMIDUSU_FLOWER_LIBRARY = Object.freeze({
  peony_ziwei: {
    id: 'peony_ziwei',
    name: '모란',
    scientific_name: 'Paeonia suffruticosa regalis',
    symbolism: '제왕의 기품, 풍요, 중심성',
    primary_color: '#D946EF',
    secondary_color: '#F9A8D4',
    particle_type: 'imperial_petal',
    keywords: ['제왕', '기품', '중심']
  },
  thorny_rose: {
    id: 'thorny_rose',
    name: '붉은 장미',
    scientific_name: 'Rosa rubra ferox',
    symbolism: '결단, 돌파, 압도적 존재감',
    primary_color: '#E11D48',
    secondary_color: '#FB7185',
    particle_type: 'thorn_spark',
    keywords: ['장군', '돌파', '강렬함']
  },
  delicate_willow: {
    id: 'delicate_willow',
    name: '버드나무꽃',
    scientific_name: 'Salix babylonica florets',
    symbolism: '유연한 지략, 세밀함, 적응',
    primary_color: '#67E8F9',
    secondary_color: '#A7F3D0',
    particle_type: 'willow_mist',
    keywords: ['책사', '유연성', '지략']
  },
  sunflower_ziwei: {
    id: 'sunflower_ziwei',
    name: '해바라기',
    scientific_name: 'Helianthus annuus solaris',
    symbolism: '태양성, 낙관, 명랑한 리더십',
    primary_color: '#FACC15',
    secondary_color: '#FB923C',
    particle_type: 'solar_pollen',
    keywords: ['태양', '명랑함', '확장']
  },
  night_cereus: {
    id: 'night_cereus',
    name: '월하미인',
    scientific_name: 'Epiphyllum oxypetalum',
    symbolism: '달빛의 우아함, 밤의 직관, 신비',
    primary_color: '#E2E8F0',
    secondary_color: '#93C5FD',
    particle_type: 'lunar_mist',
    keywords: ['태음', '우아함', '신비']
  },
  orchid_tanlang: {
    id: 'orchid_tanlang',
    name: '난초',
    scientific_name: 'Orchidaceae venusta',
    symbolism: '도화, 매혹, 감각적 집중력',
    primary_color: '#C084FC',
    secondary_color: '#F0ABFC',
    particle_type: 'orchid_perfume',
    keywords: ['탐랑', '매혹', '도화']
  }
});

const JAMIDUSU_STAR_RULES = Object.freeze([
  {
    keys: ['자미', 'zi wei', 'ziwei'],
    flowerId: 'peony_ziwei',
    title: '제왕의 모란',
    keyword: '제왕의 기품'
  },
  {
    keys: ['칠살', 'seven killings', 'qisha', '파군', 'the breaker', 'pogun'],
    flowerId: 'thorny_rose',
    title: '장군의 붉은 장미',
    keyword: '돌파의 결단'
  },
  {
    keys: ['천기', 'tian ji', 'tianji'],
    flowerId: 'delicate_willow',
    title: '책사의 버드나무꽃',
    keyword: '부드러운 지략'
  },
  {
    keys: ['태양', 'tai yang', 'taiyang'],
    flowerId: 'sunflower_ziwei',
    title: '태양의 해바라기',
    keyword: '빛의 확장'
  },
  {
    keys: ['태음', 'tai yin', 'taiyin'],
    flowerId: 'night_cereus',
    title: '달빛의 월하미인',
    keyword: '야간 개화의 신비'
  },
  {
    keys: ['탐랑', 'tan lang', 'tanlang'],
    flowerId: 'orchid_tanlang',
    title: '도화의 난초',
    keyword: '관능적 매혹'
  }
]);

const JAMIDUSU_BRIGHTNESS_INTENSITY = Object.freeze({
  miao: { glow: 1, saturation: 1, mist: 0.08, label: '묘(廟)' },
  wang: { glow: 0.94, saturation: 0.96, mist: 0.12, label: '왕(旺)' },
  li: { glow: 0.8, saturation: 0.88, mist: 0.2, label: '이(利)' },
  de: { glow: 0.74, saturation: 0.82, mist: 0.26, label: '득(得)' },
  ping: { glow: 0.62, saturation: 0.74, mist: 0.34, label: '평(平)' },
  han: { glow: 0.5, saturation: 0.68, mist: 0.42, label: '한(閑)' },
  xian: { glow: 0.42, saturation: 0.62, mist: 0.52, label: '함(陷)' }
});

function normalizeJamidusuBrightness(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'ping';
  if (raw.includes('묘') || raw.includes('miao')) return 'miao';
  if (raw.includes('왕') || raw.includes('wang')) return 'wang';
  if (raw.includes('이') || raw === 'li' || raw.includes('bright')) return 'li';
  if (raw.includes('득') || raw.includes('de')) return 'de';
  if (raw.includes('평') || raw.includes('ping')) return 'ping';
  if (raw.includes('한') || raw.includes('han')) return 'han';
  if (raw.includes('함') || raw.includes('xian')) return 'xian';
  return 'ping';
}

function parseJamidusuPrimaryStars(starData) {
  const rawStars =
    starData.mainStar ||
    starData.main_star ||
    starData.primaryStar ||
    starData.primary_star ||
    '';
  const list = normalizeSignalList(rawStars)
    .flatMap((item) => item.split(/[\/|·+]/g).map((x) => x.trim()))
    .filter(Boolean);
  return list.length ? list.slice(0, 2) : ['자미'];
}

function findJamidusuRule(starName) {
  const normalized = String(starName || '').trim().toLowerCase();
  if (!normalized) return JAMIDUSU_STAR_RULES[0];
  return JAMIDUSU_STAR_RULES.find((rule) =>
    rule.keys.some((key) => normalized.includes(String(key).toLowerCase()))
  ) || JAMIDUSU_STAR_RULES[0];
}

function getJamidusuFlowerById(id) {
  return JAMIDUSU_FLOWER_LIBRARY[id] || JAMIDUSU_FLOWER_LIBRARY.peony_ziwei;
}

function blendJamidusuPalette(primaryHex, secondaryHex, ratio = 0.5) {
  const a = String(primaryHex || '').replace('#', '');
  const b = String(secondaryHex || '').replace('#', '');
  if (a.length !== 6 || b.length !== 6) return primaryHex || '#C084FC';
  const ar = parseInt(a.slice(0, 2), 16);
  const ag = parseInt(a.slice(2, 4), 16);
  const ab = parseInt(a.slice(4, 6), 16);
  const br = parseInt(b.slice(0, 2), 16);
  const bg = parseInt(b.slice(2, 4), 16);
  const bb = parseInt(b.slice(4, 6), 16);
  const r = Math.round(ar * (1 - ratio) + br * ratio);
  const g = Math.round(ag * (1 - ratio) + bg * ratio);
  const bMix = Math.round(ab * (1 - ratio) + bb * ratio);
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(bMix);
}

export function getJamidusuFlower(starData = {}) {
  const stars = parseJamidusuPrimaryStars(starData);
  const primaryRule = findJamidusuRule(stars[0]);
  const secondaryRule = stars[1] ? findJamidusuRule(stars[1]) : null;
  const primaryFlower = getJamidusuFlowerById(primaryRule.flowerId);
  const secondaryFlower = secondaryRule ? getJamidusuFlowerById(secondaryRule.flowerId) : null;
  const palace = starData.palace || starData.mainPalace || starData.ming_gong || '명궁';
  const brightnessCode = normalizeJamidusuBrightness(
    starData.brightness || starData.starBrightness || starData.main_star_brightness || starData.star_brightness
  );
  const intensity = JAMIDUSU_BRIGHTNESS_INTENSITY[brightnessCode] || JAMIDUSU_BRIGHTNESS_INTENSITY.ping;

  const blendedPrimary = secondaryFlower
    ? blendJamidusuPalette(primaryFlower.primary_color, secondaryFlower.primary_color, 0.35)
    : primaryFlower.primary_color;
  const blendedSecondary = secondaryFlower
    ? blendJamidusuPalette(primaryFlower.secondary_color, secondaryFlower.secondary_color, 0.45)
    : primaryFlower.secondary_color;

  const jamidusuVerdict =
    '자미두수로 볼 때 당신의 운명꽃은 ' + primaryFlower.name + ' (' + primaryFlower.scientific_name + ') 입니다.';
  const narrative = secondaryRule
    ? ('명궁 주성 ' + stars.join('·') + ' 조합으로 ' + primaryRule.title + '을 중심으로 하되, ' + secondaryRule.keyword + ' 파티클을 블렌딩했습니다.')
    : ('명궁 주성 ' + stars[0] + '의 성질을 따라 ' + primaryRule.title + '으로 개화합니다.');

  return {
    source: 'jamidusu',
    ziwei: {
      palace,
      primary_stars: stars,
      brightness: intensity.label,
      brightness_code: brightnessCode
    },
    flower: {
      ...primaryFlower,
      primary_color: blendedPrimary,
      secondary_color: blendedSecondary,
      keywords: secondaryRule
        ? Array.from(new Set([...(primaryFlower.keywords || []), ...(secondaryFlower.keywords || [])])).slice(0, 5)
        : primaryFlower.keywords
    },
    flower_options: secondaryFlower ? [primaryFlower, secondaryFlower] : [primaryFlower],
    jamidusu_verdict: jamidusuVerdict,
    narrative,
    visual_intensity: {
      glow: intensity.glow,
      saturation: intensity.saturation,
      mist: intensity.mist,
      brightness_label: intensity.label
    },
    theme: {
      palette: {
        primary: blendedPrimary,
        secondary: blendedSecondary,
        glow: blendedSecondary,
        mistOpacity: intensity.mist
      },
      particle: {
        type: secondaryFlower ? secondaryFlower.particle_type : primaryFlower.particle_type,
        intensity: intensity.glow
      },
      star_alignment: stars.join(' · ')
    },
    flower_data: {
      sticker_label: '자미두수로 보는 꽃',
      day_master_badge: '명궁 ' + stars.join('·'),
      season_label: '별 밝기 ' + intensity.label,
      environment_label: palace,
      scenario_title: '명궁 주성 개화 시나리오',
      scenario_reason: narrative,
      motion_preset: (stars.some((s) => /천기|태음/i.test(String(s))) ? 'water-flow' : 'wood-grow'),
      focus_signal: stars.join(' · '),
      ritual_tip: '오늘의 핵심 키워드: ' + primaryRule.keyword,
      relationship_theme: '명궁 주성의 성향을 관계의 기준으로 삼으면 갈등이 줄고 합이 선명해집니다.',
      career_theme: '주성의 강점을 전면에 배치할수록 실행력과 포지셔닝이 안정됩니다.',
      growth_cycle: '별 정렬 → 기운 응집 → 씨앗 점화 → 개화',
      fallback_note: secondaryRule ? ('복합 주성 보정: ' + stars[0] + ' 중심 + ' + stars[1] + ' 향기 블렌드') : ''
    }
  };
}

export function matchJamidusuFlower(userData = {}, options = {}) {
  const profile = userData && userData.schema === 'universal-destiny-profile' ? userData : parseDestinyProfile(userData);
  const ziweiData = {
    mainStar: profile.domains.ziwei.main_star,
    palace: profile.domains.ziwei.palace,
    brightness: profile.domains.ziwei.brightness,
    stars: profile.domains.ziwei.stars
  };

  const jamiMatch = getJamidusuFlower(ziweiData);

  return {
    profile,
    ...jamiMatch,
    hybrid_hint: {
      enabled: Boolean(profile.domains.saju && profile.domains.saju.day_master),
      description: profile.domains.saju && profile.domains.saju.day_master
        ? ('사주 ' + profile.domains.saju.day_master + ' 기운과 자미두수 ' + jamiMatch.ziwei.primary_stars.join('·') + ' 주성을 결합한 하이브리드 렌더링 가능')
        : ''
    },
    algorithm: {
      version: '1.0.0-jamidusu-flower',
      note: '명궁 주성 + 밝기(묘왕평함) 기반 자미두수 꽃 매칭 엔진',
      source: options.source || 'jamidusu'
    }
  };
}

const SUKUYO_FLOWER_LIBRARY = Object.freeze({
  white_baby_breath: {
    id: 'white_baby_breath',
    name: '안개꽃',
    scientific_name: 'Gypsophila paniculata alba',
    symbolism: '온화한 신뢰, 투명한 배려, 고요한 확산',
    primary_color: '#F8FAFC',
    secondary_color: '#DBEAFE',
    particle_type: 'mist_spark',
    keywords: ['온화함', '정화', '배려']
  },
  moon_lily: {
    id: 'moon_lily',
    name: '백합',
    scientific_name: 'Lilium candidum luna',
    symbolism: '맑은 결심, 수호, 순백의 직관',
    primary_color: '#FFFFFF',
    secondary_color: '#BFDBFE',
    particle_type: 'lunar_pollen',
    keywords: ['순백', '수호', '고요함']
  },
  red_lycoris: {
    id: 'red_lycoris',
    name: '붉은 석산',
    scientific_name: 'Lycoris radiata crimson',
    symbolism: '불굴의 돌파, 강렬한 결단, 카리스마',
    primary_color: '#B91C1C',
    secondary_color: '#EF4444',
    particle_type: 'thorn_shard',
    keywords: ['강렬함', '돌파', '결단']
  },
  black_rose: {
    id: 'black_rose',
    name: '흑장미',
    scientific_name: 'Rosa hybrida nocturna',
    symbolism: '강철 같은 내면, 위엄, 절제된 열정',
    primary_color: '#0F172A',
    secondary_color: '#7F1D1D',
    particle_type: 'obsidian_petal',
    keywords: ['위엄', '절제', '강인함']
  },
  violet_wisteria: {
    id: 'violet_wisteria',
    name: '등나무꽃',
    scientific_name: 'Wisteria floribunda',
    symbolism: '유연한 흐름, 섬세한 연결, 매혹적 리듬',
    primary_color: '#A78BFA',
    secondary_color: '#DDD6FE',
    particle_type: 'cascade_thread',
    keywords: ['유연함', '연결', '리듬']
  },
  orange_trumpet: {
    id: 'orange_trumpet',
    name: '능소화',
    scientific_name: 'Campsis grandiflora',
    symbolism: '경쾌한 도약, 생동감, 열린 확장',
    primary_color: '#FB923C',
    secondary_color: '#FDBA74',
    particle_type: 'sun_ribbon',
    keywords: ['경쾌함', '도약', '생동감']
  },
  blue_iris: {
    id: 'blue_iris',
    name: '붓꽃',
    scientific_name: 'Iris sanguinea indigo',
    symbolism: '통찰, 질서, 지적 평정',
    primary_color: '#1D4ED8',
    secondary_color: '#6366F1',
    particle_type: 'indigo_trace',
    keywords: ['지혜', '통찰', '정갈함']
  },
  moon_narcissus: {
    id: 'moon_narcissus',
    name: '수선화',
    scientific_name: 'Narcissus poeticus azure',
    symbolism: '정돈된 직관, 절제된 우아함, 명료함',
    primary_color: '#60A5FA',
    secondary_color: '#E0E7FF',
    particle_type: 'clarity_ring',
    keywords: ['총명함', '명료함', '우아함']
  }
});

const SUKUYO_GROUP_THEME = Object.freeze({
  '안중숙': {
    mood: '온화함',
    flowerIds: ['white_baby_breath', 'moon_lily'],
    paletteTint: '#E2E8F0',
    motion: 'water-flow'
  },
  '강성숙': {
    mood: '강렬함',
    flowerIds: ['red_lycoris', 'black_rose'],
    paletteTint: '#B91C1C',
    motion: 'fire-bloom'
  },
  '경쾌숙': {
    mood: '유연함',
    flowerIds: ['violet_wisteria', 'orange_trumpet'],
    paletteTint: '#A855F7',
    motion: 'water-flow'
  },
  '지혜숙': {
    mood: '총명함',
    flowerIds: ['blue_iris', 'moon_narcissus'],
    paletteTint: '#1D4ED8',
    motion: 'wood-grow'
  }
});

const SUKUYO_MANSION_TABLE = Object.freeze([
  { index: 1, name: '각숙', group: '지혜숙', guardian: '학', aliases: ['각', '角'] },
  { index: 2, name: '항숙', group: '안중숙', guardian: '사슴', aliases: ['항', '亢'] },
  { index: 3, name: '저숙', group: '강성숙', guardian: '오소리', aliases: ['저', '氐'] },
  { index: 4, name: '방숙', group: '강성숙', guardian: '표범', aliases: ['방', '房'] },
  { index: 5, name: '심숙', group: '강성숙', guardian: '매', aliases: ['심', '心'] },
  { index: 6, name: '미숙', group: '안중숙', guardian: '사향고양이', aliases: ['미', '尾'] },
  { index: 7, name: '기숙', group: '경쾌숙', guardian: '다람쥐', aliases: ['기', '箕'] },
  { index: 8, name: '두숙', group: '지혜숙', guardian: '거북', aliases: ['두', '斗'] },
  { index: 9, name: '우숙', group: '안중숙', guardian: '수달', aliases: ['우', '牛'] },
  { index: 10, name: '녀숙', group: '지혜숙', guardian: '올빼미', aliases: ['녀', '女'] },
  { index: 11, name: '허숙', group: '경쾌숙', guardian: '제비', aliases: ['허', '虛'] },
  { index: 12, name: '위숙', group: '강성숙', guardian: '늑대', aliases: ['위', '危'] },
  { index: 13, name: '실숙', group: '지혜숙', guardian: '학', aliases: ['실', '室'] },
  { index: 14, name: '벽숙', group: '안중숙', guardian: '토끼', aliases: ['벽', '壁'] },
  { index: 15, name: '규숙', group: '경쾌숙', guardian: '여우', aliases: ['규', '奎'] },
  { index: 16, name: '루숙', group: '강성숙', guardian: '호랑이', aliases: ['루', '婁'] },
  { index: 17, name: '위성숙', group: '지혜숙', guardian: '청조', aliases: ['위성', '胃'] },
  { index: 18, name: '묘숙', group: '경쾌숙', guardian: '닭', aliases: ['묘', '昴'] },
  { index: 19, name: '필숙', group: '강성숙', guardian: '살쾡이', aliases: ['필', '畢'] },
  { index: 20, name: '자숙', group: '지혜숙', guardian: '학', aliases: ['자', '觜'] },
  { index: 21, name: '삼숙', group: '안중숙', guardian: '고양이', aliases: ['삼', '參'] },
  { index: 22, name: '정숙', group: '강성숙', guardian: '수리', aliases: ['정', '井'] },
  { index: 23, name: '귀숙', group: '안중숙', guardian: '사슴', aliases: ['귀', '鬼'] },
  { index: 24, name: '류숙', group: '경쾌숙', guardian: '나비', aliases: ['류', '柳'] },
  { index: 25, name: '성숙', group: '지혜숙', guardian: '문어', aliases: ['성', '星'] },
  { index: 26, name: '장숙', group: '강성숙', guardian: '독수리', aliases: ['장', '張'] },
  { index: 27, name: '익숙', group: '안중숙', guardian: '백조', aliases: ['익', '翼'] }
]);

const SUKUYO_GUARDIAN_PARTICLE = Object.freeze({
  학: 'feather_arc',
  사슴: 'dew_spark',
  오소리: 'earth_mote',
  표범: 'claw_shard',
  매: 'wing_slash',
  사향고양이: 'mist_tail',
  다람쥐: 'seed_glint',
  거북: 'shell_ring',
  수달: 'ripple_loop',
  올빼미: 'wisdom_orb',
  제비: 'stream_line',
  늑대: 'howl_spike',
  토끼: 'soft_pulse',
  여우: 'fox_flare',
  호랑이: 'stripe_edge',
  청조: 'sky_glint',
  닭: 'crest_spark',
  살쾡이: 'feral_dust',
  고양이: 'silk_step',
  수리: 'talon_trail',
  나비: 'butter_glow',
  문어: 'indigo_wave',
  독수리: 'apex_ray',
  백조: 'silver_wave'
});

function clampSukuyoMansionIndex(indexLike) {
  const n = Number(indexLike);
  if (!Number.isFinite(n)) return 1;
  const normalized = ((Math.floor(n) - 1) % 27 + 27) % 27;
  return normalized + 1;
}

function estimateSukuyoMansionIndexFromBirth(birth = {}) {
  const y = Number(birth.year || 2000);
  const m = Number(birth.month || 1);
  const d = Number(birth.day || 1);
  const seed = y * 372 + m * 31 + d + 13;
  return clampSukuyoMansionIndex((seed % 27) + 1);
}

function resolveSukuyoMansionIndex(mansionLike, birth = {}) {
  const raw = String(mansionLike || '').trim();
  if (raw) {
    // Prefer explicit hanja tokens in labels like "위(胃)" over ambiguous Korean syllables.
    const hanjaMatch = raw.match(/\(([^)]+)\)/);
    if (hanjaMatch && hanjaMatch[1]) {
      const token = String(hanjaMatch[1]).trim();
      const byHanja = SUKUYO_MANSION_TABLE.find((item) => item.aliases.some((alias) => alias === token));
      if (byHanja) return byHanja.index;
    }

    const found = SUKUYO_MANSION_TABLE.find((item) => {
      if (raw === item.name) return true;
      if (raw.includes(item.name.replace('숙', ''))) return true;
      return item.aliases.some((alias) => raw.includes(alias));
    });
    if (found) return found.index;
  }

  if (Number.isFinite(Number(mansionLike))) {
    return clampSukuyoMansionIndex(Number(mansionLike));
  }

  return estimateSukuyoMansionIndexFromBirth(birth);
}

function estimateMoonPhaseFromBirthDate(birth = {}) {
  const year = Number(birth.year || 2000);
  const month = Number(birth.month || 1);
  const day = Number(birth.day || 1);
  const date = Date.UTC(year, Math.max(0, month - 1), day, 12, 0, 0);
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const lunarCycle = 29.530588;
  const days = (date - knownNewMoon) / 86400000;
  const age = ((days % lunarCycle) + lunarCycle) % lunarCycle;
  if (age <= 2.2 || age >= 27.3) return 'new';
  if (age >= 13.4 && age <= 15.8) return 'full';
  if (age < 8.8) return 'crescent';
  return 'gibbous';
}

function normalizeSukyoMoonPhase(moonPhaseLike, birth = {}) {
  const raw = String(moonPhaseLike || '').trim().toLowerCase();
  if (!raw) return estimateMoonPhaseFromBirthDate(birth);
  if (raw.includes('보름') || raw.includes('full')) return 'full';
  if (raw.includes('초승') || raw.includes('crescent')) return 'crescent';
  if (raw.includes('그믐') || raw.includes('new') || raw.includes('dark')) return 'new';
  if (raw.includes('상현') || raw.includes('wax')) return 'crescent';
  if (raw.includes('하현') || raw.includes('wane')) return 'gibbous';
  return estimateMoonPhaseFromBirthDate(birth);
}

function resolveSukyoMoonStyle(phase) {
  if (phase === 'full') {
    return {
      mode: 'full_glow',
      label: '보름달',
      silhouette_only: false,
      glow: 1,
      halo: 0.92,
      bg: 'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.58), rgba(56,189,248,0.20) 40%, rgba(10,15,35,0.88) 76%)'
    };
  }
  if (phase === 'new' || phase === 'crescent') {
    return {
      mode: 'eclipse',
      label: phase === 'new' ? '그믐달' : '초승달',
      silhouette_only: true,
      glow: 0.54,
      halo: 0.3,
      bg: 'radial-gradient(circle at 50% 20%, rgba(148,163,184,0.22), rgba(15,23,42,0.82) 52%, rgba(2,6,23,0.96) 78%)'
    };
  }
  return {
    mode: 'lunar_flow',
    label: '상현/하현달',
    silhouette_only: false,
    glow: 0.72,
    halo: 0.56,
    bg: 'radial-gradient(circle at 50% 18%, rgba(191,219,254,0.35), rgba(37,99,235,0.16) 42%, rgba(9,14,34,0.9) 78%)'
  };
}

function buildSukuyoConstellation(index) {
  const points = [];
  const base = hashString('sukuyo-constellation-' + String(index));
  for (let i = 0; i < 7; i += 1) {
    const x = 18 + ((base + i * 37) % 286);
    const y = 12 + ((Math.floor(base / (i + 2)) + i * 17) % 96);
    points.push([x, y]);
  }
  return points;
}

function parseSukuyoMansionIndex(value, birth = {}) {
  return resolveSukuyoMansionIndex(value, birth);
}

export function calculateSukyoFlower(mansionIndex, moonPhase) {
  const idx = clampSukuyoMansionIndex(mansionIndex);
  const mansion = SUKUYO_MANSION_TABLE[idx - 1] || SUKUYO_MANSION_TABLE[0];
  const groupTheme = SUKUYO_GROUP_THEME[mansion.group] || SUKUYO_GROUP_THEME['안중숙'];
  const phase = normalizeSukyoMoonPhase(moonPhase || '');
  const moonStyle = resolveSukyoMoonStyle(phase);
  const flowerIds = groupTheme.flowerIds || ['white_baby_breath', 'moon_lily'];
  const primaryId = flowerIds[idx % flowerIds.length];
  const flower = SUKUYO_FLOWER_LIBRARY[primaryId] || SUKUYO_FLOWER_LIBRARY.white_baby_breath;
  const constellation = buildSukuyoConstellation(idx);
  const guardianParticle = SUKUYO_GUARDIAN_PARTICLE[mansion.guardian] || 'lunar_dust';
  const narrativeCopy =
    '달이 차오르는 밤, ' + mansion.guardian + '의 영험함을 품은 ' + mansion.name + '의 기운이 당신을 한 송이 ' + flower.name + '으로 피워냈습니다.';

  return {
    source: 'sukuyo',
    sukuyo: {
      mansion_index: idx,
      mansion_name: mansion.name,
      group: mansion.group,
      guardian_animal: mansion.guardian,
      moon_phase: moonStyle.label,
      moon_style: moonStyle.mode,
      constellation_points: constellation
    },
    flower,
    sukuyo_verdict: '숙요점으로 볼 때 당신의 운명꽃은 ' + flower.name + ' (' + flower.scientific_name + ') 입니다.',
    narrative: narrativeCopy,
    visual_intensity: {
      glow: moonStyle.glow,
      halo: moonStyle.halo,
      silhouette_only: moonStyle.silhouette_only,
      moon_style: moonStyle.mode,
      moon_label: moonStyle.label
    },
    theme: {
      palette: {
        primary: flower.primary_color,
        secondary: flower.secondary_color,
        moonTint: groupTheme.paletteTint,
        bgGradient: moonStyle.bg
      },
      particle: {
        type: guardianParticle,
        flower_particle: flower.particle_type,
        intensity: moonStyle.glow
      },
      constellation_points: constellation,
      mix_blend_mode: 'screen'
    },
    flower_data: {
      sticker_label: '숙요점으로 보는 꽃',
      day_master_badge: mansion.name + ' · ' + mansion.group,
      season_label: '달 위상 ' + moonStyle.label,
      environment_label: '수호동물 ' + mansion.guardian,
      scenario_title: '27숙-달 위상 통합 개화 시나리오',
      scenario_reason: narrativeCopy,
      motion_preset: groupTheme.motion,
      focus_signal: mansion.name + ' · ' + mansion.guardian,
      ritual_tip: '달빛이 보이는 창가에서 27번 호흡하며 오늘의 의도를 한 단어로 고정해보세요.',
      relationship_theme: mansion.group + '의 결을 따를수록 관계의 긴장이 누그러지고 교감이 선명해집니다.',
      career_theme: mansion.guardian + ' 패턴의 실행 리듬을 업무 루틴에 반영하면 성과가 안정됩니다.',
      growth_cycle: '별자리 연결 → 달빛 응집 → 영성 점화 → 개화',
      fallback_note: ''
    }
  };
}

export function matchSukuyoFlower(userData = {}, options = {}) {
  const profile = userData && userData.schema === 'universal-destiny-profile' ? userData : parseDestinyProfile(userData);
  const birth = (profile.identity && profile.identity.birth) || {};
  const sukuyo = (profile.domains && profile.domains.sukuyo) || {};
  const mansionHint = options.mansion || sukuyo.mansion || sukuyo.name || '';
  const mansionNumericHint = options.mansionIndex || sukuyo.mansion_index || '';
  const mansionIndex = resolveSukuyoMansionIndex(
    mansionHint || mansionNumericHint,
    birth
  );
  const phase = normalizeSukyoMoonPhase(options.moonPhase || sukuyo.phase || '', birth);
  const match = calculateSukyoFlower(mansionIndex, phase);

  return {
    profile,
    ...match,
    algorithm: {
      version: '1.0.0-sukuyo-flower',
      note: '27숙 그룹/수호동물 + 달 위상(이클립스/풀글로우) 기반 숙요 운명꽃 매칭 엔진',
      source: options.source || 'sukuyo'
    }
  };
}

const DAY_MASTER_DEFS = Object.freeze([
  { stem: '갑', hanja: '甲', element: 'Wood', aliases: ['갑', '甲', 'jia', '갑목', '甲木'], badge: '갑목(甲木)' },
  { stem: '을', hanja: '乙', element: 'Wood', aliases: ['을', '乙', 'yi', '을목', '乙木'], badge: '을목(乙木)' },
  { stem: '병', hanja: '丙', element: 'Fire', aliases: ['병', '丙', 'bing', '병화', '丙火'], badge: '병화(丙火)' },
  { stem: '정', hanja: '丁', element: 'Fire', aliases: ['정', '丁', 'ding', '정화', '丁火'], badge: '정화(丁火)' },
  { stem: '무', hanja: '戊', element: 'Earth', aliases: ['무', '戊', 'wu', '무토', '戊土'], badge: '무토(戊土)' },
  { stem: '기', hanja: '己', element: 'Earth', aliases: ['기', '己', 'ji', '기토', '己土'], badge: '기토(己土)' },
  { stem: '경', hanja: '庚', element: 'Metal', aliases: ['경', '庚', 'geng', '경금', '庚金'], badge: '경금(庚金)' },
  { stem: '신', hanja: '辛', element: 'Metal', aliases: ['신', '辛', 'xin', '신금', '辛金'], badge: '신금(辛金)' },
  { stem: '임', hanja: '壬', element: 'Water', aliases: ['임', '壬', 'ren', '임수', '壬水'], badge: '임수(壬水)' },
  { stem: '계', hanja: '癸', element: 'Water', aliases: ['계', '癸', 'gui', '계수', '癸水'], badge: '계수(癸水)' }
]);

const ELEMENT_TO_DAY_MASTER_STEMS = Object.freeze({
  Wood: { yang: '갑', yin: '을' },
  Fire: { yang: '병', yin: '정' },
  Earth: { yang: '무', yin: '기' },
  Metal: { yang: '경', yin: '신' },
  Water: { yang: '임', yin: '계' }
});

const ZODIAC_TO_ELEMENT = Object.freeze({
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Metal',
  Libra: 'Metal',
  Aquarius: 'Metal',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water'
});

const ZIWEI_MAINSTAR_TO_ELEMENT_HINT = Object.freeze([
  { hint: '자미', element: 'Earth' },
  { hint: '천기', element: 'Wood' },
  { hint: '태양', element: 'Fire' },
  { hint: '무곡', element: 'Metal' },
  { hint: '태음', element: 'Water' },
  { hint: '천동', element: 'Water' },
  { hint: '염정', element: 'Fire' },
  { hint: '천부', element: 'Earth' },
  { hint: '탐랑', element: 'Wood' },
  { hint: '거문', element: 'Water' },
  { hint: '천상', element: 'Metal' },
  { hint: '천량', element: 'Earth' },
  { hint: '칠살', element: 'Metal' },
  { hint: '파군', element: 'Water' }
]);

function parseDayMaster(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();

  for (let i = 0; i < DAY_MASTER_DEFS.length; i += 1) {
    const def = DAY_MASTER_DEFS[i];
    const hasAlias = def.aliases.some((alias) => normalized.includes(String(alias).toLowerCase()));
    const hasStem = raw.includes(def.stem) || raw.includes(def.hanja);
    if (hasAlias || hasStem) {
      return {
        stem: def.stem,
        hanja: def.hanja,
        element: def.element,
        badge: def.badge,
        sourceText: raw
      };
    }
  }
  return null;
}

function getDayMasterDefByStem(stem) {
  const found = DAY_MASTER_DEFS.find((def) => def.stem === stem);
  if (!found) return null;
  return {
    stem: found.stem,
    hanja: found.hanja,
    element: found.element,
    badge: found.badge,
    sourceText: found.badge
  };
}

function createDayMasterFromElement(element, preferYin = false) {
  const pair = ELEMENT_TO_DAY_MASTER_STEMS[element] || ELEMENT_TO_DAY_MASTER_STEMS.Wood;
  const stem = preferYin ? pair.yin : pair.yang;
  return getDayMasterDefByStem(stem);
}

function inferElementFromZiweiMainStar(ziweiMainStar) {
  if (typeof ziweiMainStar !== 'string' || !ziweiMainStar.trim()) return '';
  const raw = ziweiMainStar.trim();
  const found = ZIWEI_MAINSTAR_TO_ELEMENT_HINT.find((item) => raw.includes(item.hint));
  return found ? found.element : '';
}

function inferElementFromAstrologySunSign(sunSign) {
  const normalized = normalizeBirthSign(sunSign);
  return ZODIAC_TO_ELEMENT[normalized] || '';
}

function resolveDayMasterContext(userData, dominantElement, yinYangBalance) {
  const explicitDayMaster =
    userData.dayMaster ||
    userData.day_master ||
    userData.dayStem ||
    (userData.saju && (userData.saju.dayMaster || userData.saju.day_master || userData.saju.dayStem || userData.saju.day_stem)) ||
    (userData.analysis && (userData.analysis.dayMaster || userData.analysis.day_master || userData.analysis.dayStem));

  const parsedExplicit = parseDayMaster(explicitDayMaster);
  if (parsedExplicit) {
    return {
      ...parsedExplicit,
      source: 'saju',
      fallbackUsed: false,
      fallbackNote: ''
    };
  }

  const preferYin = String(yinYangBalance || '').toLowerCase().includes('yin');

  const ziweiMainStar =
    (userData.ziwei && (userData.ziwei.mainStar || userData.ziwei.main_star)) ||
    (userData.analysis && (userData.analysis.ziweiMainStar || userData.analysis.ziwei_main_star)) ||
    '';
  const elementFromZiwei = inferElementFromZiweiMainStar(ziweiMainStar);
  if (elementFromZiwei) {
    const ziweiDayMaster = createDayMasterFromElement(elementFromZiwei, preferYin);
    return {
      ...ziweiDayMaster,
      source: 'ziwei_fallback',
      fallbackUsed: true,
      fallbackNote: '사주 일간 데이터가 부족해 자미두수 주성을 기준으로 일간 성질을 보정했습니다.'
    };
  }

  const astrology = userData.astrology || {};
  const elementFromAstrology = inferElementFromAstrologySunSign(
    astrology.sunSign || astrology.sun_sign || userData.sunSign
  );
  if (elementFromAstrology) {
    const astroDayMaster = createDayMasterFromElement(elementFromAstrology, preferYin);
    return {
      ...astroDayMaster,
      source: 'astrology_fallback',
      fallbackUsed: true,
      fallbackNote: '사주 일간 데이터가 부족해 태양궁 성향으로 일간 성질을 대체했습니다.'
    };
  }

  const dominantFallback = createDayMasterFromElement(dominantElement || 'Wood', preferYin);
  return {
    ...dominantFallback,
    source: 'dominant_element_fallback',
    fallbackUsed: true,
    fallbackNote: '사주/자미/점성 핵심 지표가 부족해 우세 오행을 기준으로 일간 성질을 추정했습니다.'
  };
}

export function parseDestinyProfile(userData = {}) {
  const birth = getBirthFromData(userData);
  const weights = readElementWeightMap(userData);
  const sorted = sortedElements(weights);

  const dominantKey = sorted[0].key;
  const supportKey = sorted[1].key;
  const lackingKey = sorted[sorted.length - 1].key;

  const season = inferSeason(userData, birth);
  const environment = inferEnvironment(userData, weights, season);
  const waterLevel = inferWaterLevel(userData, weights, season);
  const temperatureLevel = inferTemperatureLevel(weights, season);
  const yinYangBalance = inferYinYangBalance(userData, weights);
  const dayMasterContext = resolveDayMasterContext(userData, ELEMENT_LABELS[dominantKey], yinYangBalance);

  const astrology = userData.astrology || {};
  const ziwei = userData.ziwei || {};
  const sukuyo = userData.sukuyo || {};

  const profile = {
    schema: 'universal-destiny-profile',
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    identity: {
      name: userData.name || userData.profileName || '익명의 여행자',
      gender: userData.gender || '',
      birth
    },
    core: {
      element_strength_percent: {
        Wood: weights.wood,
        Fire: weights.fire,
        Earth: weights.earth,
        Metal: weights.metal,
        Water: weights.water
      },
      dominant_element: ELEMENT_LABELS[dominantKey],
      support_element: ELEMENT_LABELS[supportKey],
      lacking_element: ELEMENT_LABELS[lackingKey],
      season,
      environment,
      water_level: waterLevel,
      temperature_level: temperatureLevel,
      yin_yang_balance: yinYangBalance,
      particle_hint: pickParticleHint(ELEMENT_LABELS[dominantKey])
    },
    domains: {
      saju: {
        enabled: true,
        element_strength_percent: {
          Wood: weights.wood,
          Fire: weights.fire,
          Earth: weights.earth,
          Metal: weights.metal,
          Water: weights.water
        },
        season,
        day_master: dayMasterContext.badge,
        day_master_stem: dayMasterContext.stem,
        day_master_hanja: dayMasterContext.hanja,
        day_master_element: dayMasterContext.element,
        day_master_source: dayMasterContext.source,
        day_master_fallback_used: dayMasterContext.fallbackUsed,
        day_master_fallback_note: dayMasterContext.fallbackNote,
        yongshin_elements: normalizeElementList(
          (userData.saju && (userData.saju.yongshin_elements || userData.saju.yongshinElements)) ||
          (userData.analysis && (userData.analysis.yongshin_elements || userData.analysis.yongshinElements))
        ),
        kishin_elements: normalizeElementList(
          (userData.saju && (userData.saju.kishin_elements || userData.saju.kishinElements)) ||
          (userData.analysis && (userData.analysis.kishin_elements || userData.analysis.kishinElements))
        ),
        notes: normalizeSignalList((userData.saju && userData.saju.notes) || userData.sajuNotes)
      },
      ziwei: {
        enabled: Boolean(ziwei && Object.keys(ziwei).length),
        main_star: ziwei.mainStar || ziwei.main_star || '',
        palace: ziwei.palace || ziwei.mainPalace || '',
        brightness: ziwei.brightness || ziwei.starBrightness || ziwei.mainStarBrightness || '',
        stars: normalizeSignalList(ziwei.stars),
        tags: normalizeSignalList(ziwei.tags)
      },
      astrology: {
        enabled: Boolean(astrology && Object.keys(astrology).length),
        sun_sign: normalizeBirthSign(astrology.sunSign || astrology.sun_sign || userData.sunSign || ''),
        moon_sign: normalizeBirthSign(astrology.moonSign || astrology.moon_sign || ''),
        rising_sign: normalizeBirthSign(astrology.risingSign || astrology.rising_sign || ''),
        planetary_tags: normalizeSignalList(astrology.tags || astrology.planetaryTags)
      },
      sukuyo: {
        enabled: Boolean(sukuyo && Object.keys(sukuyo).length),
        mansion: sukuyo.mansion || sukuyo.name || '',
        // Legacy calculators can expose shifted numeric indexes; prefer textual mansion labels first.
        mansion_index: parseSukuyoMansionIndex(sukuyo.mansion || sukuyo.name || sukuyo.mansionIndex || sukuyo.index || '', birth),
        phase: sukuyo.phase || '',
        tags: normalizeSignalList(sukuyo.tags)
      },
      custom: {
        enabled: Boolean(userData.customDomains && typeof userData.customDomains === 'object'),
        payload: userData.customDomains && typeof userData.customDomains === 'object' ? userData.customDomains : {}
      }
    },
    extensibility: {
      acceptedDomains: ['saju', 'ziwei', 'astrology', 'sukuyo', 'custom'],
      updateMethod: 'updateFlowerTheme(newData)',
      notes: '새로운 점술 도메인은 domains.custom.payload 또는 domains.{newDomain} 형태로 확장 가능'
    }
  };

  return profile;
}

export const flowerSymbology = Object.freeze({
  LOTUS: {
    id: 'lotus',
    name: '연꽃',
    scientific_name: 'Nelumbo nucifera',
    symbolism: '정화, 재탄생, 심연의 지혜',
    primary_color: '#A9E7FF',
    secondary_color: '#7C8BFF',
    particle_type: 'water_droplet',
    title: '심연에서 피어난 정화의 빛, 연꽃',
    keywords: ['순수', '생명력', '자정 작용'],
    description: '차갑고 깊은 수기운을 머금은 을목의 형상입니다. 진흙 속에서도 물들지 않고 스스로 빛을 내며 주변을 정화하는 당신은, 어떤 시련 속에서도 고결함을 잃지 않는 강인한 영혼을 가졌습니다.',
    vibe_message: '당신의 존재 자체가 주변을 맑게 하는 치유의 에너지가 됩니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Summer'],
    environments: ['Pond', 'Lake', 'Wetland'],
    water_levels: ['high']
  },
  CACTUS_FLOWER: {
    id: 'cactus_flower',
    name: '선인장꽃',
    scientific_name: 'Echinopsis spp.',
    symbolism: '인내, 역경 돌파, 반전의 개화',
    primary_color: '#FF9A5A',
    secondary_color: '#FF4D6D',
    particle_type: 'ember_spark',
    title: '메마른 대지의 찬란한 외침, 선인장꽃',
    keywords: ['인내', '반전 매력', '희귀한 아름다움'],
    description: '뜨거운 태양과 메마른 토양을 견뎌낸 을목의 결실입니다. 겉은 단단하고 날카로울지라도 그 내면에는 누구보다 뜨겁고 화려한 생명력을 품고 있습니다. 쉽게 피지 않기에 당신의 성취는 더욱 값지고 아름답습니다.',
    vibe_message: '가장 척박한 순간, 당신은 가장 화려하게 피어날 것입니다.',
    elements: ['Fire', 'Earth'],
    seasons: ['Summer'],
    environments: ['Desert', 'Field'],
    water_levels: ['low']
  },
  WINTER_PLUM: {
    id: 'winter_plum',
    name: '설중매',
    scientific_name: 'Prunus mume',
    symbolism: '절개, 인내, 선구성',
    primary_color: '#F9B8D0',
    secondary_color: '#9DD6FF',
    particle_type: 'mist_orb',
    title: '빙벽을 뚫고 나온 고결한 의지, 설중매',
    keywords: ['절개', '인내', '선구자'],
    description: '혹독한 수기운을 이겨내고 가장 먼저 봄을 알리는 전령사입니다. 남들이 모두 움츠러들 때 홀로 향기를 내뿜는 당신은, 고독 속에서 진정한 자아를 발견하고 세상을 깨우는 지혜를 가졌습니다.',
    vibe_message: '추위가 깊을수록 당신의 향기는 더욱 멀리 퍼져 나갑니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Winter', 'Spring'],
    environments: ['Rock', 'Garden'],
    water_levels: ['balanced', 'high']
  },
  HIBISCUS: {
    id: 'hibiscus',
    name: '히비스커스',
    scientific_name: 'Hibiscus rosa-sinensis',
    symbolism: '열정, 태양성, 표현력',
    primary_color: '#FF7B54',
    secondary_color: '#7E57C2',
    particle_type: 'ember_spark',
    title: '태양을 머금은 열정의 화신, 히비스커스',
    keywords: ['화려함', '열정', '에너지'],
    description: '타오르는 화기운이 절정에 달한 순간의 형상입니다. 주저함 없이 자신을 드러내고 주변을 밝은 에너지로 전염시키는 당신은, 어디서나 주인공이 되는 타고난 스타성과 뜨거운 심장을 가졌습니다.',
    vibe_message: '당신이 머무는 곳은 언제나 눈부신 여름의 한복판입니다.',
    elements: ['Fire'],
    seasons: ['Summer'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced', 'low']
  },
  EDELWEISS: {
    id: 'edelweiss',
    name: '에델바이스',
    scientific_name: 'Leontopodium nivale',
    symbolism: '고결함, 불멸성, 신념',
    primary_color: '#F0F4FF',
    secondary_color: '#AAB4C8',
    particle_type: 'metal_shard',
    title: '준엄한 바위산의 고귀한 별, 에델바이스',
    keywords: ['고귀', '불멸', '결단력'],
    description: '날카로운 금기운과 험준한 바위틈 사이에서 피어난 기적입니다. 쉽게 꺾이지 않는 신념과 정제된 아름다움을 지닌 당신은, 복잡한 세상 속에서도 자신만의 원칙을 지키며 고고한 가치를 증명해냅니다.',
    vibe_message: '흔들리지 않는 당신의 결단이 결국 가장 높은 곳에 닿게 할 것입니다.',
    elements: ['Metal', 'Earth'],
    seasons: ['Autumn', 'Winter'],
    environments: ['Rock'],
    water_levels: ['low', 'balanced']
  },
  WILD_CHRYSANTHEMUM: {
    id: 'wild_chrysanthemum',
    name: '들국화',
    scientific_name: 'Chrysanthemum indicum',
    symbolism: '품위, 절제, 맑은 정신',
    primary_color: '#F7D774',
    secondary_color: '#D98C5F',
    particle_type: 'dust_mote',
    title: '바위 틈의 고결한 들국화',
    keywords: ['절제', '품위', '성숙'],
    description: '가을 바람 속에서도 중심을 잃지 않는 들국화는 성숙한 금기운의 미학을 상징합니다. 흔들리지 않는 내면이 당신의 말과 선택을 단단하게 만듭니다.',
    vibe_message: '조용한 단단함이 가장 오래 빛나는 힘이 됩니다.',
    elements: ['Metal', 'Earth'],
    seasons: ['Autumn'],
    environments: ['Rock', 'Field'],
    water_levels: ['balanced', 'low']
  },
  PEONY: {
    id: 'peony',
    name: '모란',
    scientific_name: 'Paeonia suffruticosa',
    symbolism: '풍요, 명예, 화려함',
    primary_color: '#FFB7D5',
    secondary_color: '#F57BB0',
    particle_type: 'pollen_glow',
    title: '풍요의 궁정, 모란',
    keywords: ['풍요', '귀품', '확장'],
    description: '토와 화의 균형에서 피어나는 모란은 넉넉한 확장성과 품격을 드러냅니다. 당신의 존재는 공간의 기준을 끌어올립니다.',
    vibe_message: '당신이 가꾸는 무대는 결국 모두의 중심이 됩니다.',
    elements: ['Earth', 'Fire'],
    seasons: ['Spring'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  ROSE: {
    id: 'rose',
    name: '장미',
    scientific_name: 'Rosa hybrida',
    symbolism: '사랑, 열정, 매혹',
    primary_color: '#FF4F7A',
    secondary_color: '#FF96B6',
    particle_type: 'ember_spark',
    title: '심장을 관통하는 장미의 언어',
    keywords: ['열정', '매력', '관계'],
    description: '강렬한 화기운이 타인과의 연결을 촉진합니다. 감정의 밀도를 진실하게 표현하는 힘이 큽니다.',
    vibe_message: '당신의 진심은 가장 강한 설득력이 됩니다.',
    elements: ['Fire', 'Wood'],
    seasons: ['Spring', 'Summer'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  SUNFLOWER: {
    id: 'sunflower',
    name: '해바라기',
    scientific_name: 'Helianthus annuus',
    symbolism: '희망, 추진력, 태양 지향',
    primary_color: '#FFC94A',
    secondary_color: '#FF8F3F',
    particle_type: 'ember_spark',
    title: '태양을 추적하는 의지, 해바라기',
    keywords: ['추진력', '낙관', '리더십'],
    description: '화와 토가 강한 흐름에서 해바라기는 목표지향적 실행력을 상징합니다. 결심이 행동으로 빠르게 연결됩니다.',
    vibe_message: '당신의 시선이 향한 곳이 곧 길이 됩니다.',
    elements: ['Fire', 'Earth'],
    seasons: ['Summer'],
    environments: ['Field'],
    water_levels: ['low', 'balanced']
  },
  ORCHID: {
    id: 'orchid',
    name: '난초',
    scientific_name: 'Orchidaceae',
    symbolism: '섬세함, 고급감, 집중력',
    primary_color: '#C9B6FF',
    secondary_color: '#8FE3FF',
    particle_type: 'starlight',
    title: '정교한 감각의 난초',
    keywords: ['품격', '정교함', '집중'],
    description: '목과 금의 균형이 섬세한 감각을 만듭니다. 복잡한 정보를 아름답게 정리하는 재능이 돋보입니다.',
    vibe_message: '정밀한 감각은 당신의 가장 강력한 무기입니다.',
    elements: ['Wood', 'Metal'],
    seasons: ['Spring', 'Autumn'],
    environments: ['Garden', 'Forest'],
    water_levels: ['balanced', 'high']
  },
  CAMELLIA: {
    id: 'camellia',
    name: '동백',
    scientific_name: 'Camellia japonica',
    symbolism: '헌신, 품위, 겨울의 생명력',
    primary_color: '#FF5A7A',
    secondary_color: '#2EC4B6',
    particle_type: 'pollen_glow',
    title: '겨울을 밝히는 동백의 심장',
    keywords: ['헌신', '지속성', '온기'],
    description: '찬 기운 속에서도 온기를 유지하는 힘이 강합니다. 관계를 오래 지키고 책임을 끝까지 수행합니다.',
    vibe_message: '꾸준한 온기가 결국 가장 큰 신뢰를 만듭니다.',
    elements: ['Water', 'Fire'],
    seasons: ['Winter'],
    environments: ['Garden', 'Forest'],
    water_levels: ['balanced']
  },
  MAGNOLIA: {
    id: 'magnolia',
    name: '목련',
    scientific_name: 'Magnolia kobus',
    symbolism: '고귀함, 선명한 시작, 결단',
    primary_color: '#F3E9FF',
    secondary_color: '#FFD9B8',
    particle_type: 'mist_orb',
    title: '새봄의 문을 여는 목련',
    keywords: ['시작', '고결함', '명확함'],
    description: '봄의 문턱에서 가장 먼저 피는 목련처럼, 당신은 새로운 국면을 여는 촉발자입니다.',
    vibe_message: '가장 먼저 피는 용기가 판을 바꿉니다.',
    elements: ['Wood', 'Earth'],
    seasons: ['Spring'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced']
  },
  LILY: {
    id: 'lily',
    name: '백합',
    scientific_name: 'Lilium longiflorum',
    symbolism: '정결, 회복, 보호',
    primary_color: '#FFFFFF',
    secondary_color: '#BEE8FF',
    particle_type: 'mist_orb',
    title: '맑은 결계의 백합',
    keywords: ['정결', '치유', '보호'],
    description: '금과 수의 맑은 진동이 경계를 정돈하고 회복력을 높입니다. 감정의 노이즈를 정리하는 능력이 뛰어납니다.',
    vibe_message: '맑은 경계가 삶의 에너지를 보호합니다.',
    elements: ['Metal', 'Water'],
    seasons: ['Summer', 'Autumn'],
    environments: ['Garden'],
    water_levels: ['balanced', 'high']
  },
  TULIP: {
    id: 'tulip',
    name: '튤립',
    scientific_name: 'Tulipa gesneriana',
    symbolism: '희망, 기분 전환, 리셋',
    primary_color: '#FF7A9E',
    secondary_color: '#FFD166',
    particle_type: 'pollen_glow',
    title: '봄의 리듬을 깨우는 튤립',
    keywords: ['리셋', '희망', '경쾌함'],
    description: '정체된 흐름에 산뜻한 전환점을 만듭니다. 가벼운 시작이 큰 변화를 여는 타입입니다.',
    vibe_message: '작은 전환이 큰 행운의 문을 엽니다.',
    elements: ['Wood', 'Fire'],
    seasons: ['Spring'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced']
  },
  DAISY: {
    id: 'daisy',
    name: '데이지',
    scientific_name: 'Bellis perennis',
    symbolism: '순수, 명료함, 소통',
    primary_color: '#FFF8D6',
    secondary_color: '#F9B233',
    particle_type: 'dust_mote',
    title: '명료한 마음의 데이지',
    keywords: ['순수', '소통', '균형'],
    description: '복잡한 상황에서도 핵심을 단순하게 정리하는 힘을 상징합니다.',
    vibe_message: '명확한 한마디가 판세를 바꿉니다.',
    elements: ['Earth', 'Metal'],
    seasons: ['Spring', 'Autumn'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced']
  },
  HYDRANGEA: {
    id: 'hydrangea',
    name: '수국',
    scientific_name: 'Hydrangea macrophylla',
    symbolism: '감정의 층위, 공감, 유연성',
    primary_color: '#8EC5FF',
    secondary_color: '#D6A4FF',
    particle_type: 'water_droplet',
    title: '감정의 스펙트럼, 수국',
    keywords: ['공감', '유연함', '정서'],
    description: '수기운이 만든 다층적 감정 해석 능력이 강합니다. 사람의 마음결을 읽어 조율합니다.',
    vibe_message: '당신의 공감은 관계를 부드럽게 연결합니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Summer'],
    environments: ['Garden', 'Wetland'],
    water_levels: ['high']
  },
  LAVENDER: {
    id: 'lavender',
    name: '라벤더',
    scientific_name: 'Lavandula angustifolia',
    symbolism: '안정, 정화, 수면의 평온',
    primary_color: '#B39DDB',
    secondary_color: '#7FD3C6',
    particle_type: 'mist_orb',
    title: '평온한 파동의 라벤더',
    keywords: ['안정', '정화', '회복'],
    description: '과열된 흐름을 식히고 호흡을 되찾게 하는 치유의 시그널입니다.',
    vibe_message: '천천히 고르는 호흡이 운을 바로잡습니다.',
    elements: ['Water', 'Metal'],
    seasons: ['Summer', 'Autumn'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced']
  },
  NARCISSUS: {
    id: 'narcissus',
    name: '수선화',
    scientific_name: 'Narcissus tazetta',
    symbolism: '각성, 자기 인식, 부활',
    primary_color: '#FFF3A8',
    secondary_color: '#FFB347',
    particle_type: 'starlight',
    title: '각성의 종소리, 수선화',
    keywords: ['각성', '자기인식', '재시작'],
    description: '멈춘 감각을 깨우고 새로운 기준점을 제시하는 꽃입니다.',
    vibe_message: '당신의 각성이 다음 챕터를 엽니다.',
    elements: ['Metal', 'Fire'],
    seasons: ['Spring'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced']
  },
  IRIS: {
    id: 'iris',
    name: '아이리스',
    scientific_name: 'Iris germanica',
    symbolism: '통찰, 신뢰, 메시지 전달',
    primary_color: '#6E7BFF',
    secondary_color: '#A7B8FF',
    particle_type: 'starlight',
    title: '통찰의 화살, 아이리스',
    keywords: ['통찰', '메시지', '신뢰'],
    description: '핵심을 정확히 전달하는 금기운의 언어를 상징합니다.',
    vibe_message: '정확한 언어가 당신의 길을 넓힙니다.',
    elements: ['Metal', 'Water'],
    seasons: ['Spring'],
    environments: ['Garden'],
    water_levels: ['balanced', 'high']
  },
  ANEMONE: {
    id: 'anemone',
    name: '아네모네',
    scientific_name: 'Anemone coronaria',
    symbolism: '예감, 보호, 감정 민감성',
    primary_color: '#6A5ACD',
    secondary_color: '#FF7AA2',
    particle_type: 'mist_orb',
    title: '바람의 예감, 아네모네',
    keywords: ['예감', '민감성', '보호'],
    description: '작은 변화의 징후를 빠르게 감지하는 감응력을 뜻합니다.',
    vibe_message: '당신의 직감은 이미 다음 장면을 보고 있습니다.',
    elements: ['Water', 'Fire'],
    seasons: ['Spring'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced']
  },
  COSMOS: {
    id: 'cosmos',
    name: '코스모스',
    scientific_name: 'Cosmos bipinnatus',
    symbolism: '균형, 우아함, 가벼운 자유',
    primary_color: '#FFB3C7',
    secondary_color: '#FFD4A3',
    particle_type: 'pollen_glow',
    title: '바람을 타는 균형, 코스모스',
    keywords: ['균형', '자유', '우아'],
    description: '가벼움 속 중심을 유지하는 토기운의 성숙함을 보여줍니다.',
    vibe_message: '유연함이 곧 당신의 중심입니다.',
    elements: ['Earth', 'Wood'],
    seasons: ['Autumn'],
    environments: ['Field'],
    water_levels: ['balanced']
  },
  CARNATION: {
    id: 'carnation',
    name: '카네이션',
    scientific_name: 'Dianthus caryophyllus',
    symbolism: '헌신, 존중, 지속적 애정',
    primary_color: '#FF6F91',
    secondary_color: '#FFC7D9',
    particle_type: 'pollen_glow',
    title: '오래 남는 마음, 카네이션',
    keywords: ['헌신', '사랑', '존중'],
    description: '관계를 안정적으로 유지하고 돌보는 에너지를 상징합니다.',
    vibe_message: '당신의 꾸준함은 신뢰의 기반이 됩니다.',
    elements: ['Earth', 'Fire'],
    seasons: ['Spring'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  AZALEA: {
    id: 'azalea',
    name: '진달래',
    scientific_name: 'Rhododendron mucronulatum',
    symbolism: '봄의 도래, 회복, 따뜻한 초대',
    primary_color: '#FF8DBB',
    secondary_color: '#FFC9DE',
    particle_type: 'pollen_glow',
    title: '봄 언덕의 진달래',
    keywords: ['회복', '도래', '온기'],
    description: '새로운 순환의 시작을 알리는 부드러운 목기운의 꽃입니다.',
    vibe_message: '당신은 사람들의 마음에 봄을 데려옵니다.',
    elements: ['Wood'],
    seasons: ['Spring'],
    environments: ['Forest', 'Field'],
    water_levels: ['balanced']
  },
  FORSYTHIA: {
    id: 'forsythia',
    name: '개나리',
    scientific_name: 'Forsythia koreana',
    symbolism: '점화, 개시, 봄의 시동',
    primary_color: '#FFD84D',
    secondary_color: '#FFAA00',
    particle_type: 'ember_spark',
    title: '봄의 점화자, 개나리',
    keywords: ['점화', '개시', '활력'],
    description: '겨울 끝자락의 정체를 깨고 판을 여는 점화형 에너지를 상징합니다.',
    vibe_message: '망설임보다 점화가 먼저입니다. 당신의 시작이 계절을 바꿉니다.',
    elements: ['Fire', 'Wood'],
    seasons: ['Spring'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced', 'low']
  },
  GARDENIA: {
    id: 'gardenia',
    name: '치자',
    scientific_name: 'Gardenia jasminoides',
    symbolism: '정결, 우아함, 깊은 향',
    primary_color: '#F8F4E8',
    secondary_color: '#F2D9A6',
    particle_type: 'mist_orb',
    title: '깊은 향의 치자',
    keywords: ['정결', '우아', '여운'],
    description: '겉보다 깊은 잔향으로 사람을 끌어당기는 타입의 매력입니다.',
    vibe_message: '당신의 여운은 오래 남아 길을 만듭니다.',
    elements: ['Metal', 'Earth'],
    seasons: ['Summer'],
    environments: ['Garden'],
    water_levels: ['balanced', 'high']
  },
  JASMINE: {
    id: 'jasmine',
    name: '자스민',
    scientific_name: 'Jasminum officinale',
    symbolism: '순도, 달콤한 직관, 영감',
    primary_color: '#FFFFFF',
    secondary_color: '#9AE6B4',
    particle_type: 'mist_orb',
    title: '밤을 여는 자스민',
    keywords: ['직관', '영감', '순도'],
    description: '은은하지만 강한 존재감으로 공간을 정화합니다.',
    vibe_message: '고요한 영감이 당신의 선택을 밝힙니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Summer'],
    environments: ['NightSky', 'Garden'],
    water_levels: ['high']
  },
  CHERRY_BLOSSOM: {
    id: 'cherry_blossom',
    name: '벚꽃',
    scientific_name: 'Prunus serrulata',
    symbolism: '순간의 아름다움, 개화, 유연한 전환',
    primary_color: '#FFD1E6',
    secondary_color: '#FFE8F2',
    particle_type: 'pollen_glow',
    title: '순간을 찬란하게 만드는 벚꽃',
    keywords: ['개화', '순간', '전환'],
    description: '짧은 순간에 최대치를 보여주는 폭발적 개화 에너지입니다.',
    vibe_message: '지금의 찬란함이 다음 길을 준비합니다.',
    elements: ['Wood', 'Water'],
    seasons: ['Spring'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced', 'high']
  },
  RANUNCULUS: {
    id: 'ranunculus',
    name: '라넌큘러스',
    scientific_name: 'Ranunculus asiaticus',
    symbolism: '층위, 풍성함, 섬세한 열정',
    primary_color: '#FF9EB5',
    secondary_color: '#FFC978',
    particle_type: 'pollen_glow',
    title: '겹겹의 감정을 품은 라넌큘러스',
    keywords: ['풍성함', '층위', '감성'],
    description: '다층적 감정과 복합적인 매력을 조화롭게 펼칩니다.',
    vibe_message: '당신의 복합성은 곧 깊이입니다.',
    elements: ['Fire', 'Earth'],
    seasons: ['Spring'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  POPPY: {
    id: 'poppy',
    name: '양귀비',
    scientific_name: 'Papaver rhoeas',
    symbolism: '강렬함, 해방, 창조적 충동',
    primary_color: '#FF3D3D',
    secondary_color: '#1D3557',
    particle_type: 'ember_spark',
    title: '해방의 불꽃, 양귀비',
    keywords: ['해방', '창조', '강렬함'],
    description: '압축된 감정을 창조로 전환하는 폭발력의 상징입니다.',
    vibe_message: '강렬함을 다루는 법을 아는 사람이 결국 예술이 됩니다.',
    elements: ['Fire'],
    seasons: ['Summer'],
    environments: ['Field'],
    water_levels: ['low', 'balanced']
  },
  BLUEBELL: {
    id: 'bluebell',
    name: '블루벨',
    scientific_name: 'Hyacinthoides non-scripta',
    symbolism: '겸손, 신뢰, 잔잔한 기쁨',
    primary_color: '#7A8CFF',
    secondary_color: '#A7C7FF',
    particle_type: 'starlight',
    title: '숲의 맑은 종소리, 블루벨',
    keywords: ['겸손', '신뢰', '청량'],
    description: '작지만 깊은 울림으로 관계를 안정시키는 기운입니다.',
    vibe_message: '조용한 신뢰가 가장 강한 네트워크를 만듭니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Spring'],
    environments: ['Forest'],
    water_levels: ['high']
  },
  WATER_LILY: {
    id: 'water_lily',
    name: '수련',
    scientific_name: 'Nymphaea tetragona',
    symbolism: '평정, 내면의 집중, 명상',
    primary_color: '#B2D8FF',
    secondary_color: '#E5B5FF',
    particle_type: 'water_droplet',
    title: '고요의 중심, 수련',
    keywords: ['평정', '명상', '집중'],
    description: '흔들리는 수면 위에서도 중심을 잃지 않는 정신력을 상징합니다.',
    vibe_message: '고요한 중심이 가장 빠른 길입니다.',
    elements: ['Water'],
    seasons: ['Summer'],
    environments: ['Pond', 'Lake'],
    water_levels: ['high']
  },
  GLACIER_BLOOM: {
    id: 'glacier_bloom',
    name: '빙하꽃',
    scientific_name: 'Imaginary cryoflora',
    symbolism: '응축, 정밀한 인내, 잠재력 보존',
    primary_color: '#D6F0FF',
    secondary_color: '#8FC9FF',
    particle_type: 'water_droplet',
    title: '빙층 아래의 응축된 잠재력, 빙하꽃',
    keywords: ['응축', '인내', '잠재력'],
    description: '차가운 환경 속에서 에너지를 보존하며 결정적 시점에 폭발하는 응축형 운세를 상징합니다.',
    vibe_message: '지금의 고요는 멈춤이 아니라, 가장 강한 개화를 위한 축적입니다.',
    elements: ['Water', 'Metal'],
    seasons: ['Winter'],
    environments: ['Lake', 'NightSky', 'Rock'],
    water_levels: ['high']
  },
  MARIGOLD: {
    id: 'marigold',
    name: '메리골드',
    scientific_name: 'Tagetes erecta',
    symbolism: '보호, 태양성, 현실 감각',
    primary_color: '#FFB703',
    secondary_color: '#FB8500',
    particle_type: 'ember_spark',
    title: '태양 결계, 메리골드',
    keywords: ['보호', '현실감', '온기'],
    description: '현실적인 판단과 강한 보호 본능을 동시에 지닌 에너지입니다.',
    vibe_message: '따뜻한 현실감이 행운을 오래 붙잡습니다.',
    elements: ['Fire', 'Earth'],
    seasons: ['Summer', 'Autumn'],
    environments: ['Field', 'Garden'],
    water_levels: ['low', 'balanced']
  },
  DAHLIA: {
    id: 'dahlia',
    name: '달리아',
    scientific_name: 'Dahlia pinnata',
    symbolism: '품격, 창의성, 독창성',
    primary_color: '#D65DB1',
    secondary_color: '#845EC2',
    particle_type: 'starlight',
    title: '독창성의 무대, 달리아',
    keywords: ['독창성', '품격', '집중'],
    description: '복합적 구조를 아름답게 통합하는 창의적 지도력을 상징합니다.',
    vibe_message: '당신의 조합 감각이 새로운 미학을 만듭니다.',
    elements: ['Fire', 'Metal'],
    seasons: ['Autumn'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  SNAPDRAGON: {
    id: 'snapdragon',
    name: '금어초',
    scientific_name: 'Antirrhinum majus',
    symbolism: '재치, 반전, 메시지 전달',
    primary_color: '#FF6B6B',
    secondary_color: '#FFD93D',
    particle_type: 'pollen_glow',
    title: '재치의 파동, 금어초',
    keywords: ['재치', '반전', '표현력'],
    description: '말과 아이디어에 반전 포인트를 만드는 능력이 큽니다.',
    vibe_message: '당신의 한마디가 분위기를 바꿉니다.',
    elements: ['Fire', 'Wood'],
    seasons: ['Spring', 'Summer'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced']
  },
  FREESIA: {
    id: 'freesia',
    name: '프리지아',
    scientific_name: 'Freesia refracta',
    symbolism: '우정, 신뢰, 밝은 신호',
    primary_color: '#FFE66D',
    secondary_color: '#8AC926',
    particle_type: 'mist_orb',
    title: '밝은 약속의 프리지아',
    keywords: ['신뢰', '우정', '명랑함'],
    description: '관계를 부드럽게 시작하고 오래 유지하는 친화 에너지를 뜻합니다.',
    vibe_message: '밝은 신호를 먼저 보내는 용기가 관계를 엽니다.',
    elements: ['Wood', 'Earth'],
    seasons: ['Spring'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  VIOLET: {
    id: 'violet',
    name: '제비꽃',
    scientific_name: 'Viola mandshurica',
    symbolism: '겸손, 진실성, 내밀한 강인함',
    primary_color: '#7F5AF0',
    secondary_color: '#B8A1FF',
    particle_type: 'starlight',
    title: '작지만 강한 진실, 제비꽃',
    keywords: ['겸손', '진실', '내구성'],
    description: '드러내지 않아도 흔들리지 않는 진심의 힘을 상징합니다.',
    vibe_message: '조용한 진실이 가장 오래 살아남습니다.',
    elements: ['Water', 'Earth'],
    seasons: ['Spring'],
    environments: ['Forest', 'Field'],
    water_levels: ['high', 'balanced']
  },
  ASTER: {
    id: 'aster',
    name: '아스터',
    scientific_name: 'Symphyotrichum novi-belgii',
    symbolism: '인내, 희망의 귀환, 별빛',
    primary_color: '#9B5DE5',
    secondary_color: '#F15BB5',
    particle_type: 'starlight',
    title: '별의 귀환, 아스터',
    keywords: ['인내', '희망', '회복'],
    description: '끝자락에서 다시 빛나는 회복 탄력성을 나타냅니다.',
    vibe_message: '늦게 피는 꽃일수록 오래 갑니다.',
    elements: ['Metal', 'Water'],
    seasons: ['Autumn'],
    environments: ['Field', 'NightSky'],
    water_levels: ['balanced']
  },
  BEGONIA: {
    id: 'begonia',
    name: '베고니아',
    scientific_name: 'Begonia semperflorens',
    symbolism: '배려, 적응, 생활의 미학',
    primary_color: '#FF8FA3',
    secondary_color: '#FFB677',
    particle_type: 'pollen_glow',
    title: '생활의 미학, 베고니아',
    keywords: ['배려', '적응', '안정'],
    description: '작은 루틴을 아름답게 유지하는 생활형 강점을 상징합니다.',
    vibe_message: '일상의 디테일이 당신의 운을 키웁니다.',
    elements: ['Earth', 'Wood'],
    seasons: ['Summer'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  GERANIUM: {
    id: 'geranium',
    name: '제라늄',
    scientific_name: 'Pelargonium zonale',
    symbolism: '방어, 정화, 관계의 경계',
    primary_color: '#FF6F61',
    secondary_color: '#2A9D8F',
    particle_type: 'dust_mote',
    title: '경계의 균형, 제라늄',
    keywords: ['방어', '정화', '경계'],
    description: '좋은 에너지는 들이고 해로운 기운은 차단하는 선택 능력을 뜻합니다.',
    vibe_message: '건강한 경계가 관계를 지켜줍니다.',
    elements: ['Earth', 'Metal'],
    seasons: ['Summer'],
    environments: ['Garden', 'Field'],
    water_levels: ['low', 'balanced']
  },
  HELIOTROPE: {
    id: 'heliotrope',
    name: '헬리오트로프',
    scientific_name: 'Heliotropium arborescens',
    symbolism: '태양 추종, 충성, 집중',
    primary_color: '#7B2CBF',
    secondary_color: '#C77DFF',
    particle_type: 'starlight',
    title: '태양을 따르는 헬리오트로프',
    keywords: ['집중', '충성', '방향성'],
    description: '흩어진 관심을 한 방향으로 모아 성과를 만드는 집중의 상징입니다.',
    vibe_message: '집중의 방향이 곧 성취의 방향입니다.',
    elements: ['Fire', 'Metal'],
    seasons: ['Summer'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced']
  },
  YARROW: {
    id: 'yarrow',
    name: '서양톱풀',
    scientific_name: 'Achillea millefolium',
    symbolism: '회복, 지혜, 보호',
    primary_color: '#F1FA8C',
    secondary_color: '#06D6A0',
    particle_type: 'dust_mote',
    title: '회복의 허브 꽃, 서양톱풀',
    keywords: ['회복', '보호', '지혜'],
    description: '몸과 마음의 균형을 되찾게 하는 실용적 치유 에너지입니다.',
    vibe_message: '회복을 아는 사람은 쉽게 무너지지 않습니다.',
    elements: ['Earth', 'Water'],
    seasons: ['Summer'],
    environments: ['Field'],
    water_levels: ['balanced']
  },
  FOXGLOVE: {
    id: 'foxglove',
    name: '디기탈리스',
    scientific_name: 'Digitalis purpurea',
    symbolism: '강렬한 매혹, 경계, 전문성',
    primary_color: '#9D4EDD',
    secondary_color: '#5A189A',
    particle_type: 'metal_shard',
    title: '매혹과 경계의 디기탈리스',
    keywords: ['전문성', '매혹', '경계'],
    description: '강한 존재감과 냉정한 판단이 동시에 작동하는 전문형 에너지입니다.',
    vibe_message: '당신의 깊이는 쉽게 복제되지 않습니다.',
    elements: ['Metal', 'Fire'],
    seasons: ['Summer'],
    environments: ['Forest', 'Rock'],
    water_levels: ['balanced']
  },
  HONEYSUCKLE: {
    id: 'honeysuckle',
    name: '인동초',
    scientific_name: 'Lonicera japonica',
    symbolism: '지속, 유대, 회복탄력',
    primary_color: '#FFF3B0',
    secondary_color: '#B8E986',
    particle_type: 'mist_orb',
    title: '끈기의 유대, 인동초',
    keywords: ['지속', '유대', '회복'],
    description: '끈기 있게 관계와 목표를 이어가는 장기전의 강자입니다.',
    vibe_message: '당신의 지속성은 결국 결실로 돌아옵니다.',
    elements: ['Wood', 'Earth'],
    seasons: ['Summer'],
    environments: ['Forest', 'Garden'],
    water_levels: ['balanced', 'high']
  },
  BELLFLOWER: {
    id: 'bellflower',
    name: '도라지꽃',
    scientific_name: 'Platycodon grandiflorus',
    symbolism: '진실, 뿌리 깊은 의지, 정직한 소통',
    primary_color: '#6C63FF',
    secondary_color: '#9FA8FF',
    particle_type: 'starlight',
    title: '뿌리의 진실, 도라지꽃',
    keywords: ['진실', '의지', '소통'],
    description: '겉치레보다 본질을 중시하며, 단단한 중심으로 말하는 힘을 상징합니다.',
    vibe_message: '정직한 말은 결국 가장 멀리 갑니다.',
    elements: ['Earth', 'Metal'],
    seasons: ['Summer', 'Autumn'],
    environments: ['Field', 'Rock'],
    water_levels: ['balanced']
  },
  CROCUS: {
    id: 'crocus',
    name: '크로커스',
    scientific_name: 'Crocus vernus',
    symbolism: '재시작, 희망, 새벽의 신호',
    primary_color: '#9B5DE5',
    secondary_color: '#FEE440',
    particle_type: 'starlight',
    title: '새벽의 신호탄, 크로커스',
    keywords: ['재시작', '희망', '신호'],
    description: '긴 겨울 뒤 첫 신호를 보내는 선도자 에너지를 뜻합니다.',
    vibe_message: '당신이 움직이면 계절이 바뀝니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Winter', 'Spring'],
    environments: ['Field', 'Rock'],
    water_levels: ['balanced', 'high']
  },
  PRIMROSE: {
    id: 'primrose',
    name: '프림로즈',
    scientific_name: 'Primula vulgaris',
    symbolism: '첫사랑, 설렘, 개시',
    primary_color: '#FFE066',
    secondary_color: '#FF922B',
    particle_type: 'pollen_glow',
    title: '시작의 설렘, 프림로즈',
    keywords: ['설렘', '시작', '발아'],
    description: '새로운 관계와 프로젝트의 발아를 촉진하는 밝은 기운입니다.',
    vibe_message: '첫걸음의 설렘을 놓치지 마세요.',
    elements: ['Wood', 'Fire'],
    seasons: ['Spring'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced']
  },
  LARKSPUR: {
    id: 'larkspur',
    name: '라크스퍼',
    scientific_name: 'Delphinium consolida',
    symbolism: '도전, 개방성, 상승 기류',
    primary_color: '#4CC9F0',
    secondary_color: '#4361EE',
    particle_type: 'starlight',
    title: '상승 기류의 라크스퍼',
    keywords: ['도전', '상승', '개방성'],
    description: '한 단계 위로 도약하려는 상승 의지를 상징합니다.',
    vibe_message: '도전의 높이가 당신의 시야를 넓힙니다.',
    elements: ['Wood', 'Metal'],
    seasons: ['Summer'],
    environments: ['Field'],
    water_levels: ['balanced']
  },
  QUEEN_ANNE_LACE: {
    id: 'queen_anne_lace',
    name: '당근꽃',
    scientific_name: 'Daucus carota',
    symbolism: '섬세함, 보호, 직관적 설계',
    primary_color: '#FFFFFF',
    secondary_color: '#D9E3F0',
    particle_type: 'dust_mote',
    title: '레이스 같은 보호막, 당근꽃',
    keywords: ['섬세함', '보호', '설계'],
    description: '촘촘한 구조를 설계하고 보호하는 전략형 감각을 나타냅니다.',
    vibe_message: '디테일을 아는 사람이 판을 지배합니다.',
    elements: ['Metal', 'Earth'],
    seasons: ['Summer', 'Autumn'],
    environments: ['Field'],
    water_levels: ['balanced']
  },
  WISTERIA: {
    id: 'wisteria',
    name: '등나무꽃',
    scientific_name: 'Wisteria floribunda',
    symbolism: '연결, 깊은 유대, 느린 확장',
    primary_color: '#B497E7',
    secondary_color: '#8E7CC3',
    particle_type: 'mist_orb',
    title: '연결의 아치, 등나무꽃',
    keywords: ['연결', '유대', '확장'],
    description: '사람과 사람을 자연스럽게 잇는 네트워크형 에너지가 강합니다.',
    vibe_message: '연결의 힘이 당신의 자산입니다.',
    elements: ['Wood', 'Water'],
    seasons: ['Spring'],
    environments: ['Garden', 'Forest'],
    water_levels: ['high', 'balanced']
  },
  MOONFLOWER: {
    id: 'moonflower',
    name: '달맞이꽃',
    scientific_name: 'Oenothera biennis',
    symbolism: '야간 개화, 직관, 은밀한 성장',
    primary_color: '#F8F4C4',
    secondary_color: '#C8D6FF',
    particle_type: 'starlight',
    title: '밤에 피는 서사, 달맞이꽃',
    keywords: ['직관', '야간개화', '은밀함'],
    description: '보이지 않는 시간대에 에너지를 축적해 결정적 순간에 개화합니다.',
    vibe_message: '당신의 밤은 내일의 빛을 준비합니다.',
    elements: ['Water', 'Metal'],
    seasons: ['Summer', 'Autumn'],
    environments: ['NightSky', 'Field'],
    water_levels: ['balanced', 'high']
  },
  PASSIONFLOWER: {
    id: 'passionflower',
    name: '시계꽃',
    scientific_name: 'Passiflora caerulea',
    symbolism: '몰입, 상징 해석, 초월',
    primary_color: '#7EC8E3',
    secondary_color: '#5E60CE',
    particle_type: 'starlight',
    title: '몰입의 구조, 시계꽃',
    keywords: ['몰입', '상징', '초월'],
    description: '복잡한 상징을 읽어 통합하는 정신적 몰입 에너지가 큽니다.',
    vibe_message: '집중의 깊이가 새로운 차원을 엽니다.',
    elements: ['Water', 'Fire'],
    seasons: ['Summer'],
    environments: ['Forest', 'NightSky'],
    water_levels: ['high']
  },
  BLUE_LOTUS: {
    id: 'blue_lotus',
    name: '블루 로터스',
    scientific_name: 'Nymphaea caerulea',
    symbolism: '영감, 몽환, 직관적 예술성',
    primary_color: '#4EA8DE',
    secondary_color: '#6930C3',
    particle_type: 'water_droplet',
    title: '몽환의 수면, 블루 로터스',
    keywords: ['영감', '몽환', '예술성'],
    description: '감성과 영감의 흐름을 극대화하는 수기운의 예술형 상징입니다.',
    vibe_message: '당신의 감수성은 현실을 예술로 바꿉니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Summer'],
    environments: ['Pond', 'NightSky'],
    water_levels: ['high']
  },
  RED_SPIDER_LILY: {
    id: 'red_spider_lily',
    name: '석산',
    scientific_name: 'Lycoris radiata',
    symbolism: '이별과 전환, 강렬한 재생',
    primary_color: '#D90429',
    secondary_color: '#FF6B6B',
    particle_type: 'ember_spark',
    title: '경계의 불꽃, 석산',
    keywords: ['전환', '재생', '강렬함'],
    description: '끝과 시작의 경계에서 가장 강한 변화를 만들어내는 꽃입니다.',
    vibe_message: '끝을 받아들이는 용기가 재탄생을 부릅니다.',
    elements: ['Fire', 'Water'],
    seasons: ['Autumn'],
    environments: ['Field', 'Rock'],
    water_levels: ['balanced']
  },
  MORNING_GLORY: {
    id: 'morning_glory',
    name: '나팔꽃',
    scientific_name: 'Ipomoea nil',
    symbolism: '하루의 각성, 빠른 발아, 명료한 목표',
    primary_color: '#5E60CE',
    secondary_color: '#80FFDB',
    particle_type: 'pollen_glow',
    title: '새벽의 각성, 나팔꽃',
    keywords: ['각성', '속도', '목표'],
    description: '하루 시작의 에너지를 극대화해 행동으로 빠르게 연결합니다.',
    vibe_message: '당신의 아침 루틴이 운명을 이끕니다.',
    elements: ['Wood', 'Water'],
    seasons: ['Summer'],
    environments: ['Garden', 'Field'],
    water_levels: ['balanced', 'high']
  },
  SWEET_PEA: {
    id: 'sweet_pea',
    name: '스위트피',
    scientific_name: 'Lathyrus odoratus',
    symbolism: '감사, 우정, 따뜻한 배려',
    primary_color: '#FFAFCC',
    secondary_color: '#BDE0FE',
    particle_type: 'mist_orb',
    title: '감사의 향기, 스위트피',
    keywords: ['감사', '우정', '배려'],
    description: '사소한 친절을 큰 신뢰로 바꾸는 관계형 에너지의 꽃입니다.',
    vibe_message: '작은 감사가 큰 복으로 돌아옵니다.',
    elements: ['Wood', 'Earth'],
    seasons: ['Spring'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  CHRYSANTHEMUM_GOLD: {
    id: 'chrysanthemum_gold',
    name: '황국',
    scientific_name: 'Chrysanthemum morifolium',
    symbolism: '장수, 성숙, 절제된 광채',
    primary_color: '#F9C74F',
    secondary_color: '#F9844A',
    particle_type: 'dust_mote',
    title: '성숙의 황금, 황국',
    keywords: ['성숙', '장수', '절제'],
    description: '시간을 이겨낸 성숙함과 품위를 상징하는 가을의 대표 꽃입니다.',
    vibe_message: '시간이 당신 편이 되는 순간이 옵니다.',
    elements: ['Earth', 'Metal'],
    seasons: ['Autumn'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced', 'low']
  },
  PERSIAN_BUTTERCUP: {
    id: 'persian_buttercup',
    name: '페르시안 버터컵',
    scientific_name: 'Ranunculus asiaticus Persicus',
    symbolism: '매혹, 집중, 감정의 결',
    primary_color: '#FF99C8',
    secondary_color: '#FCF6BD',
    particle_type: 'pollen_glow',
    title: '감정의 결을 세우는 버터컵',
    keywords: ['매혹', '집중', '감정'],
    description: '감정의 텍스처를 정교하게 다루는 예민한 감각의 상징입니다.',
    vibe_message: '당신의 섬세함은 강력한 몰입을 만듭니다.',
    elements: ['Fire', 'Wood'],
    seasons: ['Spring'],
    environments: ['Garden'],
    water_levels: ['balanced']
  },
  PLUM_BLOSSOM: {
    id: 'plum_blossom',
    name: '매화',
    scientific_name: 'Prunus mume var. formosa',
    symbolism: '고결함, 절개, 겨울의 의지',
    primary_color: '#F8BBD0',
    secondary_color: '#90CAF9',
    particle_type: 'mist_orb',
    title: '절개의 향기, 매화',
    keywords: ['절개', '의지', '고결'],
    description: '추위를 견디는 정신력과 조용한 품격을 상징합니다.',
    vibe_message: '고요한 의지가 결국 계절을 바꿉니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Winter'],
    environments: ['Rock', 'Garden'],
    water_levels: ['high', 'balanced']
  },
  CORNFLOWER: {
    id: 'cornflower',
    name: '수레국화',
    scientific_name: 'Centaurea cyanus',
    symbolism: '지성, 청렴, 명료함',
    primary_color: '#3A86FF',
    secondary_color: '#A0C4FF',
    particle_type: 'starlight',
    title: '청렴한 사고의 수레국화',
    keywords: ['지성', '청렴', '명료'],
    description: '사고의 잡음을 줄이고 핵심을 선명히 보는 정신성을 뜻합니다.',
    vibe_message: '맑은 지성이 길을 만듭니다.',
    elements: ['Metal', 'Water'],
    seasons: ['Summer'],
    environments: ['Field'],
    water_levels: ['balanced', 'high']
  },
  LOTUS_PINK: {
    id: 'lotus_pink',
    name: '홍련',
    scientific_name: 'Nelumbo nucifera rubra',
    symbolism: '사랑의 정화, 감정 승화, 자비',
    primary_color: '#FF8FAB',
    secondary_color: '#A0E7E5',
    particle_type: 'water_droplet',
    title: '자비의 홍련',
    keywords: ['자비', '승화', '치유'],
    description: '감정의 상처를 사랑의 힘으로 승화시키는 연꽃의 변주입니다.',
    vibe_message: '부드러운 연민이 가장 강한 치유가 됩니다.',
    elements: ['Water', 'Fire'],
    seasons: ['Summer'],
    environments: ['Pond', 'Lake'],
    water_levels: ['high']
  },
  MUGUNGHWA: {
    id: 'mugunghwa',
    name: '무궁화',
    scientific_name: 'Hibiscus syriacus',
    symbolism: '끈기, 부활, 정체성',
    primary_color: '#F4A6C1',
    secondary_color: '#6F42C1',
    particle_type: 'ember_spark',
    title: '불굴의 개화, 무궁화',
    keywords: ['끈기', '부활', '정체성'],
    description: '넘어져도 다시 피어나는 장기전의 회복 탄력을 상징합니다.',
    vibe_message: '당신은 끝까지 피어나는 사람입니다.',
    elements: ['Fire', 'Wood'],
    seasons: ['Summer'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced']
  },
  GENTIAN: {
    id: 'gentian',
    name: '겐티안',
    scientific_name: 'Gentiana scabra',
    symbolism: '깊은 신뢰, 성실함, 고산의 의지',
    primary_color: '#3F37C9',
    secondary_color: '#4895EF',
    particle_type: 'metal_shard',
    title: '고산의 의지, 겐티안',
    keywords: ['성실', '신뢰', '의지'],
    description: '험한 환경에서도 묵묵히 피어나는 책임감과 성실의 상징입니다.',
    vibe_message: '성실함은 결국 가장 높은 곳에 닿습니다.',
    elements: ['Metal', 'Earth'],
    seasons: ['Autumn'],
    environments: ['Rock'],
    water_levels: ['low', 'balanced']
  },
  NEMOPHILA: {
    id: 'nemophila',
    name: '네모필라',
    scientific_name: 'Nemophila menziesii',
    symbolism: '청명함, 확장된 시야, 자유',
    primary_color: '#89C2FF',
    secondary_color: '#D0EBFF',
    particle_type: 'starlight',
    title: '하늘빛 파도, 네모필라',
    keywords: ['청명', '자유', '시야'],
    description: '넓은 시야로 사고를 확장하는 공기 같은 자유 에너지입니다.',
    vibe_message: '시야가 넓어질수록 운도 넓어집니다.',
    elements: ['Water', 'Wood'],
    seasons: ['Spring'],
    environments: ['Field', 'Lake'],
    water_levels: ['high', 'balanced']
  },
  LOTUS_WHITE: {
    id: 'lotus_white',
    name: '백련',
    scientific_name: 'Nelumbo nucifera alba',
    symbolism: '정결, 고요, 고차원 집중',
    primary_color: '#F8FAFC',
    secondary_color: '#CFE8FF',
    particle_type: 'water_droplet',
    title: '고요한 각성, 백련',
    keywords: ['정결', '집중', '고요'],
    description: '소음을 비우고 본질에 몰입하게 하는 높은 차원의 정화 에너지입니다.',
    vibe_message: '비움이 곧 최고의 집중입니다.',
    elements: ['Water', 'Metal'],
    seasons: ['Summer'],
    environments: ['Pond', 'NightSky'],
    water_levels: ['high']
  },
  DELPHINIUM: {
    id: 'delphinium',
    name: '델피니움',
    scientific_name: 'Delphinium elatum',
    symbolism: '도전, 이상, 상승',
    primary_color: '#3A86FF',
    secondary_color: '#8338EC',
    particle_type: 'starlight',
    title: '이상의 첨탑, 델피니움',
    keywords: ['도전', '이상', '상승'],
    description: '높은 목표를 향해 에너지를 수직으로 모아 올리는 타입입니다.',
    vibe_message: '당신의 기준이 높을수록 결과도 높아집니다.',
    elements: ['Wood', 'Metal'],
    seasons: ['Summer'],
    environments: ['Field', 'Garden'],
    water_levels: ['balanced']
  },
  LOTUS_GOLDEN: {
    id: 'lotus_golden',
    name: '금련',
    scientific_name: 'Nelumbo nucifera aurea',
    symbolism: '번영, 영적 풍요, 성취',
    primary_color: '#FFD166',
    secondary_color: '#FFB703',
    particle_type: 'starlight',
    title: '번영의 금련',
    keywords: ['번영', '성취', '풍요'],
    description: '물의 지혜와 태양의 광휘가 만나 성취를 현실로 끌어옵니다.',
    vibe_message: '당신의 성취는 깊이와 빛을 동시에 가집니다.',
    elements: ['Water', 'Fire'],
    seasons: ['Summer', 'Autumn'],
    environments: ['Pond', 'Garden'],
    water_levels: ['high', 'balanced']
  }
});

export const flowerCatalog = Object.freeze(Object.values(flowerSymbology));

function normalizeElementsCountInput(elementsCount) {
  const out = { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
  if (!elementsCount) return out;

  if (Array.isArray(elementsCount) && elementsCount.length >= 5) {
    out.wood = safeNumber(elementsCount[0], out.wood);
    out.fire = safeNumber(elementsCount[1], out.fire);
    out.earth = safeNumber(elementsCount[2], out.earth);
    out.metal = safeNumber(elementsCount[3], out.metal);
    out.water = safeNumber(elementsCount[4], out.water);
  } else if (typeof elementsCount === 'object') {
    Object.keys(elementsCount).forEach((key) => {
      const normalized = normalizeElement(key);
      if (!normalized) return;
      out[normalized] = safeNumber(elementsCount[key], out[normalized]);
    });
  }

  const total = ELEMENT_KEYS.reduce((sum, key) => sum + Math.max(0, safeNumber(out[key], 0)), 0);
  if (total <= 0) return { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };

  return ELEMENT_KEYS.reduce((acc, key) => {
    acc[key] = Number(((Math.max(0, out[key]) / total) * 100).toFixed(1));
    return acc;
  }, {});
}

function lookupFlowerById(id) {
  if (!id) return null;
  const targetId = String(id).trim().toLowerCase();
  if (!targetId) return null;
  return flowerCatalog.find((flower) => String(flower.id || '').toLowerCase() === targetId) || null;
}

function motionPresetByDayMasterElement(element) {
  switch (element) {
    case 'Water':
      return 'water-flow';
    case 'Fire':
      return 'fire-bloom';
    case 'Wood':
    default:
      return 'wood-grow';
  }
}

export function calculateDestinyFlower(profileData = {}) {
  const season =
    normalizeSeason(profileData.season || (profileData.core && profileData.core.season)) ||
    MONTH_TO_SEASON[safeNumber(profileData.birthMonth || profileData.birth_month || (profileData.birth && profileData.birth.month), 0)] ||
    'Spring';

  const environment =
    normalizeEnvironment(profileData.environment || (profileData.core && profileData.core.environment)) ||
    'Garden';

  const waterLevel = String(
    profileData.waterLevel ||
    profileData.water_level ||
    (profileData.core && profileData.core.water_level) ||
    'balanced'
  ).toLowerCase();

  const elementsCount = normalizeElementsCountInput(
    profileData.elementsCount ||
    profileData.elements_count ||
    profileData.elements ||
    (profileData.core && profileData.core.element_strength_percent)
  );

  const parsedDayMaster = parseDayMaster(
    profileData.dayMaster ||
    profileData.day_master ||
    profileData.dayStem ||
    (profileData.saju && (profileData.saju.day_master || profileData.saju.dayMaster || profileData.saju.dayStem))
  );

  const fallbackDayMaster = createDayMasterFromElement(
    parsedDayMaster ? parsedDayMaster.element :
      ELEMENT_LABELS[normalizeElement(profileData.dayMasterElement || profileData.day_master_element || '')] ||
      (profileData.core && profileData.core.dominant_element) ||
      'Wood',
    false
  );

  const dayMaster = parsedDayMaster || fallbackDayMaster;
  const dayMasterElement = dayMaster.element || 'Wood';
  const woodStrong = elementsCount.wood >= 30;
  const fireStrong = elementsCount.fire >= 30;
  const earthStrong = elementsCount.earth >= 30;
  const metalStrong = elementsCount.metal >= 30;
  const waterStrong = elementsCount.water >= 30;
  const isDry = waterLevel === 'low';
  const isWet = waterLevel === 'high';

  let primaryFlowerId = 'lotus';
  let secondaryFlowerIds = [];
  let reason = '일간의 성질과 오행 환경을 통합해 현재 개화 시나리오와 가장 맞는 꽃을 선정했습니다.';
  let title = dayMaster.badge + ' 환경 개화 시나리오';

  switch (dayMaster.stem) {
    case '갑':
      if (season === 'Spring' && woodStrong) {
        primaryFlowerId = 'magnolia';
        secondaryFlowerIds = ['forsythia', 'delphinium'];
        reason = '갑목(甲木)은 큰 나무의 양기처럼 곧게 뻗는 성질이 강합니다. 봄 목기운과 공명해 판을 여는 선도형 개화가 활성화됩니다.';
        title = '갑목의 직간(直幹) 선도 시나리오';
      } else if (metalStrong && season === 'Autumn') {
        primaryFlowerId = 'bellflower';
        secondaryFlowerIds = ['gentian'];
        reason = '갑목(甲木)이 가을 금기운의 압력을 받을 때, 가지를 정리하고 핵심만 남기는 구조조정형 성장 모드로 전환됩니다.';
        title = '갑목의 금기 단련 시나리오';
      } else if (isDry && fireStrong) {
        primaryFlowerId = 'mugunghwa';
        secondaryFlowerIds = ['sunflower'];
        reason = '갑목(甲木)이 조열한 화토 환경에서 뿌리 체력을 길러야 할 때, 장기전 회복 탄력을 상징하는 무궁화 축이 선택됩니다.';
        title = '갑목의 조열 내구 시나리오';
      }
      break;

    case '을':
      if (metalStrong && waterStrong) {
        primaryFlowerId = 'lotus';
        secondaryFlowerIds = ['water_lily', 'lotus_white'];
        reason = '을목(乙木)은 넝쿨과 화초의 음기처럼 유연하게 스며드는 성질입니다. 금수 강세 환경에서 품위와 정화력이 극대화됩니다.';
        title = '을목의 금수 상생 시나리오';
      } else if (earthStrong && isDry) {
        primaryFlowerId = 'cactus_flower';
        secondaryFlowerIds = ['marigold'];
        reason = '을목(乙木)이 건조한 토기운에 놓이면 생존력과 회복 탄성이 핵심 과제가 됩니다. 척박함을 돌파하는 선인장꽃 축으로 판정됩니다.';
        title = '을목의 조열 토양 생존 시나리오';
      } else if (season === 'Autumn') {
        primaryFlowerId = 'daisy';
        secondaryFlowerIds = ['cosmos'];
        reason = '을목(乙木)이 가을 금기운을 통과하며 섬세함을 질서로 바꾸는 시기입니다. 균형감과 정리력이 강조됩니다.';
        title = '을목의 가을 수련 시나리오';
      } else if (season === 'Spring' && isWet) {
        primaryFlowerId = 'wisteria';
        secondaryFlowerIds = ['sweet_pea'];
        reason = '을목(乙木)이 봄의 습윤한 기운을 만나면 연결과 번식력이 커집니다. 관계 기반 확장 운이 활성화됩니다.';
        title = '을목의 습윤 확장 시나리오';
      }
      break;

    case '병':
      if (season === 'Spring' && woodStrong) {
        primaryFlowerId = 'forsythia';
        secondaryFlowerIds = ['magnolia'];
        reason = '병화(丙火)는 태양의 양화로서 점화와 확산이 빠릅니다. 봄 목기운과 만나 강한 런칭 에너지를 만듭니다.';
        title = '병화의 봄 점화 시나리오';
      } else if (season === 'Summer' && fireStrong) {
        primaryFlowerId = 'sunflower';
        secondaryFlowerIds = ['hibiscus'];
        reason = '병화(丙火)가 여름 화기운과 중첩되면 외부 확장과 리더십 발현이 최대로 상승합니다.';
        title = '병화의 하계 확장 시나리오';
      } else if (waterStrong) {
        primaryFlowerId = 'marigold';
        secondaryFlowerIds = ['narcissus'];
        reason = '병화(丙火)가 수기운을 강하게 만날 때는 과열보다 방향 제어가 중요합니다. 보호와 현실 감각 축으로 보정됩니다.';
        title = '병화의 수기 제어 시나리오';
      }
      break;

    case '정':
      if (season === 'Winter' || (waterStrong && !fireStrong)) {
        primaryFlowerId = 'camellia';
        secondaryFlowerIds = ['gardenia'];
        reason = '정화(丁火)는 촛불의 음화처럼 내면 집중형 광휘를 가집니다. 한습 환경에서 온기를 오래 지키는 지속형 개화가 핵심입니다.';
        title = '정화의 한습 온기 시나리오';
      } else if (season === 'Autumn' && metalStrong) {
        primaryFlowerId = 'dahlia';
        secondaryFlowerIds = ['foxglove'];
        reason = '정화(丁火)가 금기운을 만나면 정밀함과 미적 집중이 강화됩니다. 섬세한 완성도형 시나리오가 활성화됩니다.';
        title = '정화의 금기 정련 시나리오';
      } else {
        primaryFlowerId = 'rose';
        secondaryFlowerIds = ['ranunculus'];
        reason = '정화(丁火)는 감정의 결을 정교하게 다듬어 관계 밀도를 높입니다. 표현의 농도를 올릴수록 운이 열립니다.';
        title = '정화의 감응 개화 시나리오';
      }
      break;

    case '무':
      if (earthStrong && fireStrong) {
        primaryFlowerId = 'peony';
        secondaryFlowerIds = ['chrysanthemum_gold'];
        reason = '무토(戊土)는 산악의 양토로서 구조와 외연을 크게 만듭니다. 화토가 받쳐주면 대형 성취형 개화가 유리합니다.';
        title = '무토의 화토 성취 시나리오';
      } else if (waterStrong && season === 'Winter') {
        primaryFlowerId = 'yarrow';
        secondaryFlowerIds = ['gentian'];
        reason = '무토(戊土)가 겨울 수기운을 만나면 속도를 줄이고 기반을 다지는 회복형 운영 모드가 적합합니다.';
        title = '무토의 동계 기반 시나리오';
      } else {
        primaryFlowerId = 'begonia';
        secondaryFlowerIds = ['carnation'];
        reason = '무토(戊土)의 핵심은 판을 안정시키는 중심력입니다. 루틴과 지속성을 정교하게 다듬을수록 성과가 커집니다.';
        title = '무토의 중심 구축 시나리오';
      }
      break;

    case '기':
      if (earthStrong && isWet) {
        primaryFlowerId = 'sweet_pea';
        secondaryFlowerIds = ['begonia'];
        reason = '기토(己土)는 밭의 음토처럼 세밀한 배양이 강점입니다. 습윤한 환경에서 관계/협업의 생산성이 올라갑니다.';
        title = '기토의 배양 확장 시나리오';
      } else if (metalStrong) {
        primaryFlowerId = 'queen_anne_lace';
        secondaryFlowerIds = ['daisy'];
        reason = '기토(己土)가 금기운과 결합하면 디테일 설계력과 정리력이 상승합니다. 품질 중심 운영에 강합니다.';
        title = '기토의 정밀 설계 시나리오';
      } else {
        primaryFlowerId = 'cosmos';
        secondaryFlowerIds = ['carnation'];
        reason = '기토(己土)는 부드러운 균형감으로 팀과 환경을 맞추는 데 탁월합니다. 완급 조절이 행운 포인트입니다.';
        title = '기토의 균형 조율 시나리오';
      }
      break;

    case '경':
      if (metalStrong && earthStrong) {
        primaryFlowerId = 'edelweiss';
        secondaryFlowerIds = ['gentian'];
        reason = '경금(庚金)은 원석의 양금처럼 강한 절단력과 결단을 가집니다. 토금 기반에서 원칙 실행력이 극대화됩니다.';
        title = '경금의 원칙 관철 시나리오';
      } else if (fireStrong && season === 'Summer') {
        primaryFlowerId = 'foxglove';
        secondaryFlowerIds = ['dahlia'];
        reason = '경금(庚金)이 화기 단련을 통과하면 카리스마와 전문성이 동시에 강화됩니다. 승부처 집중력이 높습니다.';
        title = '경금의 화련 단련 시나리오';
      } else {
        primaryFlowerId = 'bellflower';
        secondaryFlowerIds = ['iris'];
        reason = '경금(庚金)의 장점은 핵심을 명확히 자르는 판단력입니다. 정확한 기준 설정이 곧 성과로 연결됩니다.';
        title = '경금의 정단 판단 시나리오';
      }
      break;

    case '신':
      if (metalStrong && waterStrong) {
        primaryFlowerId = 'cornflower';
        secondaryFlowerIds = ['iris'];
        reason = '신금(辛金)은 보석의 음금처럼 정제된 감각과 언어가 강점입니다. 금수 조합에서 분석/표현력이 선명해집니다.';
        title = '신금의 금수 정제 시나리오';
      } else if (woodStrong && season === 'Spring') {
        primaryFlowerId = 'orchid';
        secondaryFlowerIds = ['bluebell'];
        reason = '신금(辛金)이 봄 목기운을 만날 때는 날을 세우기보다 조율과 감각 설계로 성과를 내는 편이 유리합니다.';
        title = '신금의 목기 조율 시나리오';
      } else {
        primaryFlowerId = 'wild_chrysanthemum';
        secondaryFlowerIds = ['queen_anne_lace'];
        reason = '신금(辛金)은 과한 확장보다 완성도를 높이는 전략에서 강합니다. 세부 완성으로 신뢰를 확보합니다.';
        title = '신금의 완성도 시나리오';
      }
      break;

    case '임':
      if (season === 'Summer') {
        primaryFlowerId = 'water_lily';
        secondaryFlowerIds = ['blue_lotus'];
        reason = '임수(壬水)는 대양의 양수처럼 큰 흐름을 다루는 힘이 있습니다. 여름 화열을 식히며 냉정한 집중력이 상승합니다.';
        title = '임수의 하계 냉각 시나리오';
      } else if (season === 'Winter') {
        primaryFlowerId = 'glacier_bloom';
        secondaryFlowerIds = ['winter_plum', 'lotus_white'];
        reason = '임수(壬水)가 겨울 수기운과 공명해 얼음층 아래 잠재력을 응축하는 빙하꽃 시나리오로 전개됩니다.';
        title = '임수의 동계 응축 시나리오';
      } else {
        primaryFlowerId = 'moonflower';
        secondaryFlowerIds = ['blue_lotus'];
        reason = '임수(壬水)는 낮보다 밤의 직감에서 방향성을 잡는 경우가 많습니다. 리듬 기반 의사결정이 유리합니다.';
        title = '임수의 야간 직감 시나리오';
      }
      break;

    case '계':
      if (season === 'Winter' && (isWet || waterStrong)) {
        primaryFlowerId = 'lotus_white';
        secondaryFlowerIds = ['plum_blossom', 'water_lily'];
        reason = '계수(癸水)는 이슬의 음수처럼 미세한 감응과 정화력이 탁월합니다. 한습 환경에서 고요한 집중이 힘이 됩니다.';
        title = '계수의 한습 정화 시나리오';
      } else if (season === 'Summer' && fireStrong) {
        primaryFlowerId = 'hydrangea';
        secondaryFlowerIds = ['blue_lotus'];
        reason = '계수(癸水)가 여름 화열을 만나면 감정 조율과 공감 네트워크가 핵심 전략이 됩니다. 수국 축이 활성화됩니다.';
        title = '계수의 하계 감응 시나리오';
      } else {
        primaryFlowerId = 'anemone';
        secondaryFlowerIds = ['moonflower'];
        reason = '계수(癸水)는 작은 신호를 빠르게 읽는 감지력이 강점입니다. 정교한 타이밍 운용이 성패를 가릅니다.';
        title = '계수의 미세 감지 시나리오';
      }
      break;

    default:
      if (dayMasterElement === 'Wood') {
        primaryFlowerId = 'wisteria';
        secondaryFlowerIds = ['orchid'];
      } else if (dayMasterElement === 'Fire') {
        primaryFlowerId = 'hibiscus';
        secondaryFlowerIds = ['sunflower'];
      } else if (dayMasterElement === 'Earth') {
        primaryFlowerId = 'peony';
        secondaryFlowerIds = ['chrysanthemum_gold'];
      } else if (dayMasterElement === 'Metal') {
        primaryFlowerId = 'edelweiss';
        secondaryFlowerIds = ['wild_chrysanthemum'];
      } else if (dayMasterElement === 'Water') {
        primaryFlowerId = 'lotus_white';
        secondaryFlowerIds = ['water_lily'];
      }
      break;
  }

  const primaryFlower = lookupFlowerById(primaryFlowerId) || flowerSymbology.LOTUS;
  const secondaryFlowers = secondaryFlowerIds
    .map((id) => lookupFlowerById(id))
    .filter(Boolean);

  return {
    dayMasterBadge: dayMaster.badge,
    dayMasterStem: dayMaster.stem,
    dayMasterElement,
    dayMasterSource: parsedDayMaster ? 'saju' : 'fallback',
    fallbackUsed: !parsedDayMaster,
    season,
    environment,
    waterLevel,
    elementsCount,
    title,
    reason,
    primaryFlowerId: primaryFlower.id,
    primaryFlower,
    secondaryFlowerIds: secondaryFlowers.map((flower) => flower.id),
    secondaryFlowers,
    motionPreset: motionPresetByDayMasterElement(dayMasterElement)
  };
}

function buildFlowerDataSheet(profile, flower, scenario, matchedSignals) {
  const seasonKo = { Spring: '봄', Summer: '여름', Autumn: '가을', Winter: '겨울' };
  const environmentKo = {
    Forest: '숲',
    Garden: '정원',
    Pond: '연못',
    Lake: '호수',
    Rock: '바위산',
    Desert: '사막',
    Field: '들판',
    Wetland: '습지',
    NightSky: '밤하늘'
  };

  const elementRitual = {
    Wood: '해 뜨기 전 10분 스트레칭으로 목기운을 열어주세요.',
    Fire: '아침 햇빛 5분을 의식적으로 받으며 화기를 정렬해보세요.',
    Earth: '책상/집 한 구역을 정돈해 토기운의 중심을 회복하세요.',
    Metal: '하루 우선순위 3개를 적어 금기운의 절제력을 강화하세요.',
    Water: '짧은 산책과 깊은 호흡으로 수기운의 순환을 열어주세요.'
  };
  const relationshipTheme = {
    Wood: '서로의 성장 속도를 존중할수록 관계가 안정됩니다.',
    Fire: '감정 표현을 숨기지 않을수록 관계의 온도가 올라갑니다.',
    Earth: '일관된 태도가 신뢰를 오래 지켜줍니다.',
    Metal: '명확한 경계와 약속이 관계의 질을 높입니다.',
    Water: '공감과 경청이 관계의 전환점을 만듭니다.'
  };
  const careerTheme = {
    Wood: '확장형 프로젝트에서 성장 폭이 크게 나타납니다.',
    Fire: '런칭/홍보/발표처럼 전면에 서는 업무와 궁합이 좋습니다.',
    Earth: '운영·관리·체계화 업무에서 강점이 극대화됩니다.',
    Metal: '분석·기획·품질관리에서 정확도가 성과를 만듭니다.',
    Water: '연구·리서치·콘텐츠 설계에서 깊이가 빛납니다.'
  };

  const dayMasterBadge = (scenario && scenario.dayMasterBadge) || (profile.domains.saju && profile.domains.saju.day_master) || '일간 판독 대기';
  const dayMasterElement = (scenario && scenario.dayMasterElement) || (profile.domains.saju && profile.domains.saju.day_master_element) || 'Wood';
  const seasonLabel = seasonKo[(scenario && scenario.season) || profile.core.season] || profile.core.season;
  const environmentLabel =
    environmentKo[(scenario && scenario.environment) || profile.core.environment] ||
    (scenario && scenario.environment) ||
    profile.core.environment;

  return {
    sticker_label: '사주로 보는 꽃',
    day_master_badge: dayMasterBadge,
    season_label: seasonLabel,
    environment_label: environmentLabel,
    scenario_title: (scenario && scenario.title) || (dayMasterBadge + ' 개화 시나리오'),
    scenario_reason: (scenario && scenario.reason) || '일간과 환경을 통합해 개화 흐름을 판독했습니다.',
    motion_preset: (scenario && scenario.motionPreset) || motionPresetByDayMasterElement(dayMasterElement),
    focus_signal: _buildSignalSummary(matchedSignals),
    ritual_tip: elementRitual[dayMasterElement] || elementRitual.Wood,
    relationship_theme: relationshipTheme[dayMasterElement] || relationshipTheme.Wood,
    career_theme: careerTheme[dayMasterElement] || careerTheme.Wood,
    growth_cycle: '발아(기운 수집) → 신장(행동 증폭) → 개화(성과 표면화) → 결실(관계/자산 축적)',
    fallback_note:
      (profile.domains.saju && profile.domains.saju.day_master_fallback_note) ||
      ((scenario && scenario.fallbackUsed) ? '일간 데이터 보강 로직이 적용되었습니다.' : '')
  };
}

function _buildSignalSummary(matchedSignals) {
  const list = Array.isArray(matchedSignals) ? matchedSignals.slice(0, 5) : [];
  if (!list.length) return '핵심 시그널 계산 대기';
  return list.join(' · ');
}

function hashString(value) {
  let hash = 0;
  const str = String(value || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildSignalSeed(profile) {
  const birth = profile.identity && profile.identity.birth ? profile.identity.birth : {};
  return [
    profile.identity && profile.identity.name,
    birth.year,
    birth.month,
    birth.day,
    profile.core && profile.core.dominant_element,
    profile.core && profile.core.support_element
  ].join('|');
}

function normalizeFlowerElementList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => ELEMENT_LABELS[normalizeElement(x)] || String(x || '').trim())
    .filter(Boolean);
}

function getCoreElementPercentMap(core) {
  const src = (core && core.element_strength_percent) || {};
  const out = {};

  ELEMENT_KEYS.forEach((key) => {
    const label = ELEMENT_LABELS[key];
    out[key] = safeNumber(src[label], 0);
  });

  const total = ELEMENT_KEYS.reduce((sum, key) => sum + Math.max(0, out[key]), 0);
  if (total <= 0) {
    return { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
  }
  return out;
}

function scoreAllElementLevels(corePercent, flowerElements) {
  const labelToKey = {
    Wood: 'wood',
    Fire: 'fire',
    Earth: 'earth',
    Metal: 'metal',
    Water: 'water'
  };

  const includeKeys = flowerElements
    .map((label) => labelToKey[label])
    .filter(Boolean);

  if (!includeKeys.length) return 0;

  let score = 0;
  ELEMENT_KEYS.forEach((key) => {
    const pct = Math.max(0, safeNumber(corePercent[key], 0));
    if (includeKeys.includes(key)) {
      score += pct * 0.36;
    } else {
      score -= pct * 0.04;
    }
  });

  return Number(score.toFixed(3));
}

function scoreFlower(profile, flower, dayMasterScenario) {
  const core = profile.core;
  const domains = profile.domains;
  const saju = domains.saju || {};
  const elements = normalizeFlowerElementList(flower.elements);
  const corePercent = getCoreElementPercentMap(core);

  let score = 0;
  const matchedSignals = [];

  const fiveElementLevelScore = scoreAllElementLevels(corePercent, elements);
  score += fiveElementLevelScore;
  matchedSignals.push('five_element_levels');

  if (elements.includes(core.dominant_element)) {
    score += 26;
    matchedSignals.push('dominant_element');
  }
  if (elements.includes(core.support_element)) {
    score += 14;
    matchedSignals.push('support_element');
  }
  if (saju.day_master_element && elements.includes(saju.day_master_element)) {
    score += 12;
    matchedSignals.push('day_master_element');
  }
  if (Array.isArray(saju.yongshin_elements) && saju.yongshin_elements.length) {
    if (saju.yongshin_elements.some((el) => elements.includes(el))) {
      score += 10;
      matchedSignals.push('yongshin_element');
    }
  }
  if (Array.isArray(saju.kishin_elements) && saju.kishin_elements.length) {
    if (saju.kishin_elements.some((el) => elements.includes(el))) {
      score -= 6;
      matchedSignals.push('kishin_penalty');
    }
  }
  if (Array.isArray(flower.seasons) && flower.seasons.includes(core.season)) {
    score += 16;
    matchedSignals.push('season');
  }
  if (Array.isArray(flower.environments) && flower.environments.includes(core.environment)) {
    score += 10;
    matchedSignals.push('environment');
  }
  if (Array.isArray(flower.water_levels) && flower.water_levels.includes(core.water_level)) {
    score += 12;
    matchedSignals.push('water_level');
  }
  if (flower.particle_type === core.particle_hint) {
    score += 4;
    matchedSignals.push('particle_hint');
  }

  if (dayMasterScenario && dayMasterScenario.dayMasterElement && elements.includes(dayMasterScenario.dayMasterElement)) {
    score += 9;
    matchedSignals.push('day_master_environment_element');
  }

  if (dayMasterScenario && dayMasterScenario.primaryFlowerId === flower.id) {
    score += 48;
    matchedSignals.push('day_master_environment_primary');
  } else if (
    dayMasterScenario &&
    Array.isArray(dayMasterScenario.secondaryFlowerIds) &&
    dayMasterScenario.secondaryFlowerIds.includes(flower.id)
  ) {
    score += 24;
    matchedSignals.push('day_master_environment_secondary');
  }

  const sunSign = domains.astrology && domains.astrology.sun_sign;
  if (sunSign && Array.isArray(flower.zodiac_affinity) && flower.zodiac_affinity.includes(sunSign)) {
    score += 6;
    matchedSignals.push('astrology_sun_sign');
  }

  const ziweiMainStar = domains.ziwei && domains.ziwei.main_star;
  if (ziweiMainStar && Array.isArray(flower.star_affinity) && flower.star_affinity.includes(ziweiMainStar)) {
    score += 5;
    matchedSignals.push('ziwei_main_star');
  }

  const sukuyoMansion = domains.sukuyo && domains.sukuyo.mansion;
  if (sukuyoMansion && Array.isArray(flower.mansion_affinity) && flower.mansion_affinity.includes(sukuyoMansion)) {
    score += 4;
    matchedSignals.push('sukuyo_mansion');
  }

  // Refined anchor rules from the product design brief.
  if (core.dominant_element === 'Wood' && core.water_level === 'high' && core.season === 'Summer') {
    if (flower.id === 'lotus') {
      score += 40;
      matchedSignals.push('refined_rule_wood_high_water_summer');
    }
  }

  if (core.dominant_element === 'Metal' && core.environment === 'Rock' && core.season === 'Autumn') {
    if (flower.id === 'edelweiss') {
      score += 38;
      matchedSignals.push('refined_rule_metal_rock_autumn_primary');
    }
    if (flower.id === 'wild_chrysanthemum') {
      score += 22;
      matchedSignals.push('refined_rule_metal_rock_autumn_secondary');
    }
  }

  const noise = (hashString(buildSignalSeed(profile) + '|' + flower.id) % 100) / 1000;
  score = Number((score + noise).toFixed(3));

  return {
    score,
    matchedSignals
  };
}

function buildRationale(profile, flower, matchedSignals, dayMasterScenario) {
  const seasonKorean = {
    Spring: '봄',
    Summer: '여름',
    Autumn: '가을',
    Winter: '겨울'
  };
  const waterKorean = {
    low: '건조한 기운',
    balanced: '균형 잡힌 기운',
    high: '촉촉하고 유연한 기운'
  };
  const environmentKorean = {
    Forest: '숲의 확장성',
    Garden: '정원의 조화',
    Pond: '연못의 순환',
    Lake: '호수의 깊이',
    Rock: '바위의 응축력',
    Desert: '사막의 생존력',
    Field: '들판의 개방성',
    Wetland: '습지의 생명력',
    NightSky: '밤하늘의 직관성'
  };

  const dominant = ELEMENT_KOREAN_LABELS[normalizeElement(profile.core.dominant_element)];
  const support = ELEMENT_KOREAN_LABELS[normalizeElement(profile.core.support_element)];
  const corePercent = getCoreElementPercentMap(profile.core);
  const elementLevelLine = ELEMENT_KEYS
    .map((key) => ELEMENT_KOREAN_LABELS[key] + ' ' + Number(corePercent[key]).toFixed(1) + '%')
    .join(' · ');
  const season = seasonKorean[profile.core.season] || profile.core.season;
  const water = waterKorean[profile.core.water_level] || profile.core.water_level;
  const environment = environmentKorean[profile.core.environment] || profile.core.environment;
  const dayMasterBadge =
    (dayMasterScenario && dayMasterScenario.dayMasterBadge) ||
    (profile.domains.saju && profile.domains.saju.day_master) ||
    '일간 판독 대기';
  const sajuVerdict =
    '사주로 볼 때 당신의 운명꽃은 ' + flower.name + ' (' + flower.scientific_name + ') 입니다.';

  const lines = [];
  lines.push(
    '사주 오행 분석 결과, 주기운은 ' + dominant + '이고 보조 흐름은 ' + support + '으로 정리됩니다.'
  );
  lines.push(
    '현재 운의 계절 결은 ' + season + ', 에너지 밀도는 ' + water + ', 삶의 무대는 ' + environment + ' 성향으로 판독되었습니다.'
  );
  lines.push('일간 주인공은 ' + dayMasterBadge + '으로 확인되었고, 일간이 놓인 계절/환경 상호작용을 최우선으로 매칭했습니다.');
  if (dayMasterScenario && dayMasterScenario.reason) {
    lines.push('일간-환경 시나리오: ' + dayMasterScenario.reason);
  }
  lines.push('오행 레벨은 ' + elementLevelLine + '이며, 목·화·토·금·수 다섯 레벨을 모두 가중 반영해 운명꽃을 확정했습니다.');
  lines.push(sajuVerdict);
  if (flower.symbolism) {
    lines.push('이 꽃은 ' + flower.symbolism + '을 상징하며, 지금 시기의 운명 테마를 가장 정확히 반영합니다.');
  }
  if (flower.description) {
    lines.push('운명꽃 해석: ' + flower.description);
  }
  if (flower.vibe_message) {
    lines.push('개화 가이드: ' + flower.vibe_message);
  }
  if (profile.domains.saju && profile.domains.saju.day_master_fallback_used && profile.domains.saju.day_master_fallback_note) {
    lines.push('보정 로직: ' + profile.domains.saju.day_master_fallback_note);
  }

  return lines.join(' ');
}

export function rankFlowerCandidates(profile, options = {}) {
  const limit = clamp(safeNumber(options.limit, 5), 1, 20);
  const dayMasterScenario =
    options.dayMasterScenario ||
    calculateDestinyFlower({
      dayMaster: profile.domains && profile.domains.saju && profile.domains.saju.day_master,
      dayMasterElement: profile.domains && profile.domains.saju && profile.domains.saju.day_master_element,
      season: profile.core && profile.core.season,
      environment: profile.core && profile.core.environment,
      waterLevel: profile.core && profile.core.water_level,
      birthMonth: profile.identity && profile.identity.birth && profile.identity.birth.month,
      elementsCount: getCoreElementPercentMap(profile.core || {})
    });

  const candidates = flowerCatalog
    .map((flower) => {
      const scoring = scoreFlower(profile, flower, dayMasterScenario);
      return {
        flower,
        score: scoring.score,
        matchedSignals: scoring.matchedSignals
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return candidates;
}

export function matchDestinyFlower(userData = {}, options = {}) {
  const profile = userData && userData.schema === 'universal-destiny-profile' ? userData : parseDestinyProfile(userData);
  const dayMasterScenario = calculateDestinyFlower({
    dayMaster: profile.domains && profile.domains.saju && profile.domains.saju.day_master,
    dayMasterElement: profile.domains && profile.domains.saju && profile.domains.saju.day_master_element,
    season: profile.core && profile.core.season,
    environment: profile.core && profile.core.environment,
    waterLevel: profile.core && profile.core.water_level,
    birthMonth: profile.identity && profile.identity.birth && profile.identity.birth.month,
    elementsCount: getCoreElementPercentMap(profile.core || {})
  });
  const candidates = rankFlowerCandidates(profile, { ...options, dayMasterScenario });
  const picked = candidates[0] || { flower: flowerSymbology.LOTUS, score: 0, matchedSignals: [] };
  const sajuVerdict =
    '사주로 볼 때 당신의 꽃은 ' + picked.flower.name + ' (' + picked.flower.scientific_name + ') 입니다.';
  const flowerData = buildFlowerDataSheet(profile, picked.flower, dayMasterScenario, picked.matchedSignals);

  return {
    profile,
    flower: picked.flower,
    flowerSymbology: picked.flower,
    candidates,
    day_master_environment: dayMasterScenario,
    flower_data: flowerData,
    saju_verdict: sajuVerdict,
    narrative: buildRationale(profile, picked.flower, picked.matchedSignals, dayMasterScenario),
    fallback_logic: {
      used: Boolean(profile.domains && profile.domains.saju && profile.domains.saju.day_master_fallback_used),
      source: profile.domains && profile.domains.saju && profile.domains.saju.day_master_source,
      note: profile.domains && profile.domains.saju && profile.domains.saju.day_master_fallback_note
    },
    algorithm: {
      version: '1.2.0-day-master-environment',
      note: '일간-환경(억부용신/조후) 우선 매칭 + 다중 신호 가중치 엔진'
    }
  };
}

export function updateFlowerTheme(newData = {}, currentTheme = {}) {
  const profile = newData && newData.schema === 'universal-destiny-profile' ? newData : parseDestinyProfile(newData);
  const matching = matchDestinyFlower(profile, { limit: 3 });
  const flower = matching.flower;
  const flowerData = matching.flower_data || {};

  const dominant = normalizeElement(profile.core.dominant_element);
  const baseBackgroundByElement = {
    wood: 'linear-gradient(135deg, #0f2f26 0%, #2f7f6d 55%, #a8e6cf 100%)',
    fire: 'linear-gradient(135deg, #2b0f1c 0%, #d65a31 55%, #6a2c70 100%)',
    earth: 'linear-gradient(135deg, #33261d 0%, #8c6a43 55%, #f3d9b1 100%)',
    metal: 'linear-gradient(135deg, #101721 0%, #516170 55%, #dbe7f3 100%)',
    water: 'linear-gradient(135deg, #081a32 0%, #1c4f82 55%, #7bdff2 100%)'
  };

  const baseBackgroundByEnvironment = {
    Forest: 'linear-gradient(140deg, #102a1f 0%, #2e6b4f 52%, #9fd3b2 100%)',
    Garden: 'linear-gradient(140deg, #2f1c31 0%, #b34c8e 50%, #7bdff2 100%)',
    Pond: 'linear-gradient(140deg, #0a2845 0%, #2b6ea8 50%, #9ed8ff 100%)',
    Lake: 'linear-gradient(140deg, #071f36 0%, #356995 52%, #9ad7ff 100%)',
    Rock: 'linear-gradient(140deg, #1d232f 0%, #5b6678 52%, #ccd4e0 100%)',
    Desert: 'linear-gradient(140deg, #3d2818 0%, #bb7d3a 52%, #f2d39b 100%)',
    Field: 'linear-gradient(140deg, #263118 0%, #628a3c 52%, #cde89f 100%)',
    Wetland: 'linear-gradient(140deg, #0f3132 0%, #3d8082 52%, #a5dcd2 100%)',
    NightSky: 'linear-gradient(140deg, #0d1026 0%, #2d3f78 52%, #7f8ce1 100%)'
  };

  const seasonTint = {
    Spring: 'rgba(160, 231, 197, 0.22)',
    Summer: 'rgba(255, 192, 105, 0.20)',
    Autumn: 'rgba(227, 171, 110, 0.24)',
    Winter: 'rgba(170, 202, 255, 0.24)'
  };

  let backdropPreset = 'ethereal-garden';
  if (profile.domains.astrology && profile.domains.astrology.enabled) {
    backdropPreset = 'cosmic-night';
  }
  if (profile.domains.ziwei && profile.domains.ziwei.enabled) {
    backdropPreset = 'stellar-scroll';
  }

  return {
    ...currentTheme,
    flower_id: flower.id,
    flower_name: flower.name,
    palette: {
      primary: flower.primary_color,
      secondary: flower.secondary_color,
      glow: flower.secondary_color + '66'
    },
    particles: {
      type: flower.particle_type,
      intensity: profile.core.water_level === 'high' ? 1 : profile.core.water_level === 'low' ? 0.75 : 0.9
    },
    motion: {
      preset: flowerData.motion_preset || 'wood-grow'
    },
    background: {
      preset: backdropPreset,
      gradient:
        baseBackgroundByEnvironment[profile.core.environment] ||
        baseBackgroundByElement[dominant] ||
        baseBackgroundByElement.wood,
      season_tint: seasonTint[profile.core.season] || seasonTint.Spring,
      dimming: 0.55,
      blurPx: 12
    },
    source: {
      dominant_element: profile.core.dominant_element,
      day_master: profile.domains.saju.day_master,
      day_master_source: profile.domains.saju.day_master_source,
      season: profile.core.season,
      environment: profile.core.environment,
      astrology_enabled: profile.domains.astrology.enabled,
      ziwei_enabled: profile.domains.ziwei.enabled
    }
  };
}

export function createDestinyFlowerEngine(initialData = {}) {
  let currentProfile = parseDestinyProfile(initialData);

  return {
    getFlowerSymbology() {
      return flowerSymbology;
    },
    getFlowerCatalog() {
      return flowerCatalog;
    },
    parseDestinyProfile(userData) {
      currentProfile = parseDestinyProfile(userData || {});
      return currentProfile;
    },
    getCurrentProfile() {
      return currentProfile;
    },
    matchDestinyFlower(userData, options) {
      if (userData) {
        currentProfile = parseDestinyProfile(userData);
      }
      return matchDestinyFlower(currentProfile, options);
    },
    getAstrologyFlower(chartData) {
      return getAstrologyFlower(chartData || {});
    },
    matchAstrologyFlower(userData, options) {
      if (userData) {
        currentProfile = parseDestinyProfile(userData);
      }
      return matchAstrologyFlower(currentProfile, options);
    },
    getJamidusuFlower(starData) {
      return getJamidusuFlower(starData || {});
    },
    matchJamidusuFlower(userData, options) {
      if (userData) {
        currentProfile = parseDestinyProfile(userData);
      }
      return matchJamidusuFlower(currentProfile, options);
    },
    calculateSukyoFlower(mansionIndex, moonPhase) {
      return calculateSukyoFlower(mansionIndex, moonPhase);
    },
    matchSukuyoFlower(userData, options) {
      if (userData) {
        currentProfile = parseDestinyProfile(userData);
      }
      return matchSukuyoFlower(currentProfile, options);
    },
    updateFlowerTheme(newData, currentTheme) {
      if (newData) {
        currentProfile = parseDestinyProfile(newData);
      }
      return updateFlowerTheme(currentProfile, currentTheme);
    }
  };
}

export function registerDestinyFlowerEngineGlobals(target = window, engine = createDestinyFlowerEngine()) {
  if (!target) return engine;
  target.DestinyFlowerEngine = engine;
  target.parseDestinyProfile = engine.parseDestinyProfile.bind(engine);
  target.calculateDestinyFlower = calculateDestinyFlower;
  target.getAstrologyFlower = engine.getAstrologyFlower.bind(engine);
  target.matchAstrologyFlower = engine.matchAstrologyFlower.bind(engine);
  target.getJamidusuFlower = engine.getJamidusuFlower.bind(engine);
  target.matchJamidusuFlower = engine.matchJamidusuFlower.bind(engine);
  target.calculateSukyoFlower = engine.calculateSukyoFlower.bind(engine);
  target.matchSukuyoFlower = engine.matchSukuyoFlower.bind(engine);
  target.matchDestinyFlower = engine.matchDestinyFlower.bind(engine);
  target.updateFlowerTheme = engine.updateFlowerTheme.bind(engine);
  target.flowerSymbology = flowerSymbology;
  return engine;
}
