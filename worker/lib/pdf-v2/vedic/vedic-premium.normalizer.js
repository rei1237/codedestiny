import { asArray, clean, safeObject } from "./vedic-premium.types.js";

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

function normalizePlanet(row = {}) {
  const source = safeObject(row);
  return compactObject({
    name: clean(source.nameKo || source.name || source.planet || source.id),
    sign: clean(source.signKo || source.sign),
    house: Number.isFinite(Number(source.house)) ? Number(source.house) : undefined,
    nakshatra: clean(source.nakshatra || source.nakshatraName),
    degree: clean(source.degreeText || source.degree || source.longitude),
    dignity: clean(source.dignity),
    retrograde: source.retrograde === true,
    combust: source.combust === true,
  });
}

function normalizeHouse(row = {}) {
  const source = safeObject(row);
  return compactObject({
    house: Number.isFinite(Number(source.house || source.number)) ? Number(source.house || source.number) : undefined,
    sign: clean(source.signKo || source.sign),
    planets: asArray(source.planets).map((planet) => clean(planet.nameKo || planet.name || planet)).filter(Boolean),
    lord: clean(source.lordKo || source.lord),
    notes: asArray(source.notes).map((item) => clean(item)).filter(Boolean),
  });
}

function normalizeDasha(row = {}) {
  const source = safeObject(row);
  return compactObject({
    type: clean(source.type || source.level || source.kind || "vimshottari"),
    planet: clean(source.planetKo || source.planet || source.lord),
    startDate: clean(source.startDate || source.start),
    endDate: clean(source.endDate || source.end),
    theme: clean(source.theme || source.meaning),
  });
}

function normalizeYoga(row = {}) {
  const source = safeObject(row);
  return compactObject({
    name: clean(source.nameKo || source.name || source.id),
    meaning: clean(source.meaning || source.description || source.text),
    strength: clean(source.strength || source.level),
  });
}

function summarizeRawResult(localVedicChartJson = {}, facts = {}) {
  const chart = safeObject(localVedicChartJson.chart);
  const settings = safeObject(localVedicChartJson.settings);
  return compactObject({
    calculationMode: clean(localVedicChartJson.calculationMode),
    chartSourceQuality: safeObject(localVedicChartJson.chartSourceQuality),
    settings: {
      zodiac: clean(settings.zodiac),
      ayanamsa: clean(settings.ayanamsa),
      houseSystem: clean(settings.houseSystem),
    },
    evidenceCounts: {
      planets: asArray(chart.planets).length,
      houses: asArray(chart.houses).length,
      yogas: asArray(localVedicChartJson?.insights?.yogas).length,
      dashaPeriods: asArray(chart?.dashas?.periods).length,
    },
    calculationBasis: safeObject(facts.calculationBasis),
  });
}

export function normalizeVedicPremiumInput(rawInput = {}, localVedicChartJson = {}, facts = {}) {
  const birthInput = safeObject(localVedicChartJson.birthInput || rawInput.birthInput || rawInput.userProfile);
  const chart = safeObject(localVedicChartJson.chart || rawInput.chart);
  const context = safeObject(localVedicChartJson.pdfContext || {});
  const moonNakshatra = safeObject(context.moonNakshatra || chart.nakshatra);
  const warnings = [];

  const rashiChart = asArray(chart.houses).map(normalizeHouse).filter((house) => Number.isFinite(Number(house.house)));
  const planets = asArray(chart.planets).map(normalizePlanet).filter((planet) => clean(planet.name));
  const dashaPeriods = asArray(chart?.dashas?.periods).map(normalizeDasha).filter((dasha) => clean(dasha.planet));
  if (clean(chart?.dashas?.currentMahaDasha) && !dashaPeriods.length) {
    dashaPeriods.push(compactObject({ type: "vimshottari", planet: clean(chart.dashas.currentMahaDasha), theme: "현재 마하 다샤" }));
  }
  const yogas = asArray(localVedicChartJson?.insights?.yogas || context.yogas).map(normalizeYoga).filter((yoga) => clean(yoga.name));

  if (!clean(chart.lagnaSign || context?.lagna?.signKo)) warnings.push("라그나 정보가 제한적입니다.");
  if (!clean(chart.moonSign)) warnings.push("문사인 정보가 제한적입니다.");
  if (!clean(moonNakshatra.name)) warnings.push("나크샤트라 정보가 제한적입니다.");
  if (!planets.length) warnings.push("행성 배치 목록이 제한적입니다.");

  return compactObject({
    userProfile: {
      name: clean(birthInput.name || rawInput.name || rawInput.user?.name),
      gender: clean(birthInput.gender || rawInput.gender || rawInput.user?.gender),
      birthDate: clean(birthInput.birthDate || rawInput.birthDate || rawInput.user?.birthDate),
      birthTime: clean(birthInput.birthTime || rawInput.birthTime || rawInput.user?.birthTime),
      birthPlace: clean(birthInput.birthPlace || rawInput.birthPlace || rawInput.user?.birthPlace),
      timezone: clean(birthInput.timezone || rawInput.timezone || rawInput.user?.timezone),
    },
    chart: {
      ascendant: clean(chart.lagnaSign || context?.lagna?.signKo),
      lagna: clean(chart.lagnaSign || context?.lagna?.signKo),
      moonSign: clean(chart.moonSign),
      sunSign: clean(chart.sunSign),
      nakshatra: clean(moonNakshatra.name),
      pada: clean(moonNakshatra.pada),
      rashiChart,
      navamsaChart: asArray(context?.divisionalCharts?.navamsaD9?.houses || rawInput?.navamsaChart).map(normalizeHouse).filter((house) => Number.isFinite(Number(house.house))),
      planets,
      dashas: dashaPeriods,
      yogas,
      transits: asArray(context?.transits?.majorTransitEvents || rawInput?.transits).map((row) => compactObject({
        planet: clean(row?.planetKo || row?.planet),
        sign: clean(row?.signKo || row?.sign),
        house: Number.isFinite(Number(row?.house)) ? Number(row.house) : undefined,
        theme: clean(row?.theme || row?.meaning),
      })).filter((row) => clean(row.planet || row.theme)),
    },
    rawResultSummary: summarizeRawResult(localVedicChartJson, facts),
    warnings,
  });
}
