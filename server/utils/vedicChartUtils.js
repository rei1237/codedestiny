/**
 * 베다점 API 응답을 클라이언트에서 쓰기 쉽게 정제하는 유틸리티
 * 행성 위치, 하우스, 다샤, 요가 등을 일관된 형식으로 반환합니다.
 */

const PLANET_ORDER = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
const PLANET_LABELS_KO = {
  sun: "태양",
  moon: "달",
  mars: "화성",
  mercury: "수성",
  jupiter: "목성",
  venus: "금성",
  saturn: "토성",
  rahu: "라후",
  ketu: "케투",
};
const PLANET_LABELS_EN = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu",
};

/**
 * API 원본 데이터를 클라이언트용으로 정제
 * @param {Object} data - API 응답의 data 객체 (planets, houses, ascendant, yogas, dashas 등)
 * @param {Object} options - { name?: string }
 * @returns {Object} 클라이언트용 차트 객체
 */
function refineBirthChartForClient(data, options = {}) {
  if (!data || typeof data !== "object") {
    return getEmptyChart(options.name);
  }

  const planets = normalizePlanets(data.planets);
  const houses = normalizeHouses(data.houses);
  const ascendant = normalizeAscendant(data.ascendant);
  const yogas = normalizeYogas(data.yogas);
  const dashas = normalizeDashas(data.dashas);

  return {
    profileName: options.name || null,
    planets,
    houses,
    ascendant,
    yogas,
    dashas,
    meta: {
      ayanamsa: data.ayanamsa || "lahiri",
      language: data.language || "en",
    },
  };
}

function getEmptyChart(profileName) {
  return {
    profileName: profileName || null,
    planets: [],
    houses: [],
    ascendant: null,
    yogas: [],
    dashas: { current: null, mahadasha: null, antardasha: null },
    meta: { ayanamsa: "lahiri", language: "en" },
  };
}

/**
 * planets 객체를 배열로 변환하고, 클라이언트용 필드만 남김
 */
function normalizePlanets(planets) {
  if (!planets || typeof planets !== "object") return [];
  const list = [];
  for (const key of PLANET_ORDER) {
    const p = planets[key];
    if (!p || typeof p !== "object") continue;
    list.push({
      id: key,
      labelKo: PLANET_LABELS_KO[key] || key,
      labelEn: PLANET_LABELS_EN[key] || key,
      sign: p.sign || null,
      signLord: p.sign_lord || null,
      degree: typeof p.degree === "number" ? round2(p.degree) : null,
      house: typeof p.house === "number" ? p.house : null,
      nakshatra: p.nakshatra || null,
      nakshatraLord: p.nakshatra_lord || null,
      pada: typeof p.pada === "number" ? p.pada : null,
      retrograde: Boolean(p.retrograde),
      combust: Boolean(p.combust),
      dignity: p.dignity || null,
    });
  }
  return list;
}

/**
 * houses 객체를 1~12 순서 배열로 변환
 */
function normalizeHouses(houses) {
  if (!houses || typeof houses !== "object") return [];
  const list = [];
  for (let i = 1; i <= 12; i++) {
    const h = houses[String(i)] || houses[i];
    if (!h || typeof h !== "object") {
      list.push({ house: i, sign: null, degree: null, lord: null });
      continue;
    }
    list.push({
      house: i,
      sign: h.sign || null,
      degree: typeof h.degree === "number" ? round2(h.degree) : null,
      lord: h.lord || null,
    });
  }
  return list;
}

function normalizeAscendant(asc) {
  if (!asc || typeof asc !== "object") return null;
  return {
    sign: asc.sign || null,
    degree: typeof asc.degree === "number" ? round2(asc.degree) : null,
    nakshatra: asc.nakshatra || null,
    pada: typeof asc.pada === "number" ? asc.pada : null,
  };
}

function normalizeYogas(yogas) {
  if (!Array.isArray(yogas)) return [];
  return yogas.slice(0, 50).map((y) => ({
    name: y.name || null,
    description: y.description || null,
    strength: y.strength || null,
    effects: y.effects || null,
    category: y.category || null,
    planetsInvolved: Array.isArray(y.planets_involved) ? y.planets_involved : [],
    housesInvolved: Array.isArray(y.houses_involved) ? y.houses_involved : [],
  }));
}

function normalizeDashas(dashas) {
  if (!dashas || typeof dashas !== "object") {
    return { current: null, mahadasha: null, antardasha: null };
  }
  const mahadasha = dashas.mahadasha && typeof dashas.mahadasha === "object"
    ? {
        planet: dashas.mahadasha.planet || null,
        start: dashas.mahadasha.start || null,
        end: dashas.mahadasha.end || null,
      }
    : null;
  const antardasha = dashas.antardasha && typeof dashas.antardasha === "object"
    ? {
        planet: dashas.antardasha.planet || null,
        start: dashas.antardasha.start || null,
        end: dashas.antardasha.end || null,
      }
    : null;
  return {
    current: mahadasha || antardasha ? { mahadasha, antardasha } : null,
    mahadasha,
    antardasha,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * 클라이언트에서 행성/하우스 라벨 표시 시 사용할 수 있는 헬퍼 (공유용)
 */
function getPlanetLabel(key, lang = "ko") {
  const map = lang === "ko" ? PLANET_LABELS_KO : PLANET_LABELS_EN;
  return map[key] || key;
}

module.exports = {
  refineBirthChartForClient,
  getPlanetLabel,
  PLANET_ORDER,
  PLANET_LABELS_KO,
  PLANET_LABELS_EN,
};
