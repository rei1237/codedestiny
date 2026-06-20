import { asArray, clean, safeObject } from "./astrology-premium.types.js";

const PLANET_LABELS = Object.freeze({
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
  Uranus: "천왕성",
  Neptune: "해왕성",
  Pluto: "명왕성",
  "North Node": "북쪽 노드",
  "South Node": "남쪽 노드",
});

const ASPECT_LABELS = Object.freeze({
  conjunction: "컨정션",
  sextile: "섹스타일",
  square: "스퀘어",
  trine: "트라인",
  opposition: "오포지션",
});

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return undefined;
    return value === undefined || value === null || value === "" ? undefined : value;
  }
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const next = compactObject(item);
    if (next !== undefined && !(Array.isArray(next) && next.length === 0)) output[key] = next;
  }
  return output;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function degreeText(value) {
  const number = finiteNumber(value);
  if (number === undefined) return clean(value);
  return `${Math.round(number * 100) / 100}도`;
}

function planetName(value) {
  const raw = clean(value);
  return PLANET_LABELS[raw] || raw;
}

function aspectType(value) {
  const raw = clean(value);
  return ASPECT_LABELS[raw.toLowerCase()] || raw;
}

function normalizePlanet(row = {}) {
  const source = safeObject(row);
  const name = clean(source.nameKo || source.label || planetName(source.name || source.planet || source.id));
  return compactObject({
    name,
    sign: clean(source.signKo || source.sign || source.zodiacSign),
    house: finiteNumber(source.house),
    degree: degreeText(source.degreeText || source.degree || source.longitude),
    retrograde: source.retrograde === true,
    dignity: clean(source.dignity || source.condition),
    element: clean(source.element),
    modality: clean(source.modality || source.mode),
  });
}

function normalizeHouse(row = {}) {
  const source = safeObject(row);
  return compactObject({
    house: finiteNumber(source.house || source.number),
    sign: clean(source.signKo || source.sign || source.cuspSign),
    cuspDegree: degreeText(source.cuspDegree || source.cusp || source.longitude),
    planets: asArray(source.planets).map((planet) => clean(planet.nameKo || planet.label || planetName(planet.name || planet))).filter(Boolean),
    theme: clean(source.theme || source.meaning),
  });
}

function normalizeAspect(row = {}) {
  const source = safeObject(row);
  const planetA = clean(source.planetAKo || source.p1Ko || planetName(source.planetA || source.p1 || source.from));
  const planetB = clean(source.planetBKo || source.p2Ko || planetName(source.planetB || source.p2 || source.to));
  return compactObject({
    planetA,
    planetB,
    type: aspectType(source.type || source.aspect),
    orb: degreeText(source.orb),
    applying: source.applying === true,
    meaning: clean(source.meaning || source.summary),
  });
}

function normalizeBalance(value = {}, aliases = {}) {
  const source = safeObject(value);
  const output = {};
  for (const [key, names] of Object.entries(aliases)) {
    for (const name of names) {
      const number = finiteNumber(source[name]);
      if (number !== undefined) {
        output[key] = number;
        break;
      }
    }
  }
  return compactObject(output);
}

function normalizeTransit(row = {}) {
  const source = safeObject(row);
  const aspect = safeObject(source.aspect || source.aspectToNatal);
  return compactObject({
    planet: clean(source.planetKo || source.label || planetName(source.planet)),
    sign: clean(source.signKo || source.sign),
    house: finiteNumber(source.house),
    aspectToNatal: clean(source.aspectToNatal || source.aspectText || aspect.text || aspect.label),
    theme: clean(source.theme || source.summary || source.text),
  });
}

function normalizeProgression(row = {}) {
  const source = safeObject(row);
  return compactObject({
    planet: clean(source.planetKo || planetName(source.planet)),
    sign: clean(source.signKo || source.sign),
    house: finiteNumber(source.house),
    theme: clean(source.theme || source.summary || source.text),
  });
}

function normalizeSolarReturn(value = {}) {
  const source = safeObject(value);
  return compactObject({
    year: finiteNumber(source.year),
    ascendant: clean(source.ascendantKo || source.ascendant || source.risingSign),
    sunHouse: finiteNumber(source.sunHouse),
    moonSign: clean(source.moonSignKo || source.moonSign),
    themes: asArray(source.themes || source.keyThemes).map((item) => clean(item)).filter(Boolean),
  });
}

function normalizeTimingInsights(timingInsights = {}, rawInput = {}) {
  const source = safeObject(timingInsights || rawInput.timingInsights);
  const snapshots = asArray(source.snapshots);
  const transits = [
    ...asArray(rawInput.transits),
    ...snapshots.flatMap((snapshot) => [
      ...asArray(snapshot.outerPlanets).map((text) => ({ theme: `${clean(snapshot.label || snapshot.date)} ${clean(text)}` })),
      ...asArray(snapshot.aspects).map((aspect) => ({ aspectToNatal: aspect.text, theme: clean(snapshot.label || snapshot.date) })),
    ]),
  ].map(normalizeTransit).filter((item) => clean(item.planet || item.aspectToNatal || item.theme));
  return {
    transits,
    rawTimingSummary: compactObject({
      calculated: source.calculated === true,
      source: clean(source.source),
      baseDate: clean(source.baseDate),
      currentSummary: clean(source.currentSummary),
      ninetyDaySummary: clean(source.ninetyDaySummary),
      threeYearSummary: clean(source.threeYearSummary),
      snapshotCount: snapshots.length,
    }),
  };
}

function summarizeRawResult(localAstroChartJson = {}, normalized = {}) {
  const chart = safeObject(localAstroChartJson.chart);
  return compactObject({
    calculationMode: clean(localAstroChartJson.calculationMode),
    chartSource: clean(localAstroChartJson.chartSource || localAstroChartJson.calculationSource),
    engineQuality: clean(localAstroChartJson.engineQuality),
    houseSystem: clean(localAstroChartJson.houseSystem || chart.houseSystem),
    evidenceCounts: {
      planets: asArray(chart.planets).length,
      houses: asArray(chart.houses).length,
      aspects: asArray(chart.aspects).length,
      transits: asArray(normalized?.chart?.transits).length,
      progressions: asArray(normalized?.chart?.progressions).length,
    },
    timing: safeObject(normalized.rawTimingSummary),
  });
}

export function normalizeAstrologyPremiumInput(rawInput = {}, localAstroChartJson = {}) {
  const birthInput = safeObject(localAstroChartJson.birthInput || rawInput.birthInput || rawInput.userProfile || rawInput.profile);
  const chart = safeObject(localAstroChartJson.chart || rawInput.chart || rawInput.astroBase?.chart);
  const warnings = [];
  const planets = asArray(chart.planets).map(normalizePlanet).filter((planet) => clean(planet.name));
  const houses = asArray(chart.houses).map(normalizeHouse).filter((house) => Number.isFinite(Number(house.house)));
  const aspects = asArray(chart.aspects).map(normalizeAspect).filter((aspect) => clean(aspect.planetA && aspect.planetB && aspect.type));
  const timing = normalizeTimingInsights(localAstroChartJson.timingInsights, rawInput);
  const progressions = asArray(rawInput.progressions || chart.progressions).map(normalizeProgression).filter((item) => clean(item.planet || item.theme));
  const solarReturn = normalizeSolarReturn(rawInput.solarReturn || chart.solarReturn);

  if (!clean(chart.sunSign)) warnings.push("태양 별자리 정보가 제한적입니다.");
  if (!clean(chart.moonSign)) warnings.push("달 별자리 정보가 제한적입니다.");
  if (!clean(chart.ascendantSign || chart.ascendant)) warnings.push("상승궁 정보가 제한적입니다.");
  if (!planets.length) warnings.push("행성 배치 목록이 제한적입니다.");
  if (!houses.length) warnings.push("하우스 정보가 제한적입니다.");
  if (!aspects.length) warnings.push("애스펙트 정보가 제한적입니다.");
  if (!timing.transits.length) warnings.push("트랜짓 정보가 제한적입니다.");
  if (!progressions.length) warnings.push("프로그레션 정보가 제공되지 않았습니다.");
  if (!clean(solarReturn.year || solarReturn.ascendant || solarReturn.moonSign)) warnings.push("솔라리턴 정보가 제공되지 않았습니다.");

  const normalized = compactObject({
    userProfile: {
      name: clean(birthInput.name || rawInput.name || rawInput.user?.name),
      gender: clean(birthInput.gender || rawInput.gender || rawInput.user?.gender),
      birthDate: clean(birthInput.birthDate || rawInput.birthDate || rawInput.user?.birthDate),
      birthTime: clean(birthInput.birthTime || rawInput.birthTime || rawInput.user?.birthTime),
      birthPlace: clean(birthInput.birthPlace || rawInput.birthPlace || rawInput.user?.birthPlace),
      timezone: clean(birthInput.timezone || rawInput.timezone || rawInput.user?.timezone),
      latitude: finiteNumber(birthInput.latitude || rawInput.latitude),
      longitude: finiteNumber(birthInput.longitude || rawInput.longitude),
    },
    chart: {
      zodiacType: clean(chart.zodiacType || chart.zodiac || "tropical"),
      houseSystem: clean(localAstroChartJson.houseSystem || chart.houseSystem || "Placidus"),
      ascendant: clean(chart.ascendantSign || chart.ascendant),
      midheaven: clean(chart.midheavenSign || chart.midHeaven || chart.midheaven || chart.mc),
      sunSign: clean(chart.sunSign),
      moonSign: clean(chart.moonSign),
      risingSign: clean(chart.risingSign || chart.ascendantSign || chart.ascendant),
      planets,
      houses,
      aspects,
      elements: normalizeBalance(chart.elementBalance || chart.elements, {
        fire: ["fire", "Fire", "불"],
        earth: ["earth", "Earth", "흙"],
        air: ["air", "Air", "공기"],
        water: ["water", "Water", "물"],
      }),
      modalities: normalizeBalance(chart.modalityBalance || chart.modalities || chart.modeBalance, {
        cardinal: ["cardinal", "Cardinal", "카디널"],
        fixed: ["fixed", "Fixed", "픽스드"],
        mutable: ["mutable", "Mutable", "뮤터블"],
      }),
      transits: timing.transits,
      progressions,
      solarReturn,
    },
    rawTimingSummary: timing.rawTimingSummary,
    warnings,
  });

  return compactObject({
    ...normalized,
    rawResultSummary: summarizeRawResult(localAstroChartJson, normalized),
  });
}
