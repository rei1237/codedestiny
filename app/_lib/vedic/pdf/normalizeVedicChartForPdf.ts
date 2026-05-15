import type {
  VedicPdfContext,
  VedicPdfHouse,
  VedicPdfPlanet,
  VedicReportMode,
} from "./types";

const RASHI_NAMES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const RASHI_LORDS = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
];

const PLANET_KEYS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function toSignName(sign: unknown, fallbackName: unknown): string | null {
  if (typeof fallbackName === "string" && fallbackName.trim()) return fallbackName.trim();
  const idx = toNumber(sign);
  if (idx == null) return null;
  const safeIdx = ((Math.floor(idx) % 12) + 12) % 12;
  return RASHI_NAMES[safeIdx] || null;
}

function buildHouses(chart: any, lagnaSign: number | null): VedicPdfHouse[] {
  const planets = chart?.planets && typeof chart.planets === "object" ? chart.planets : {};

  const houses: VedicPdfHouse[] = [];
  for (let houseNumber = 1; houseNumber <= 12; houseNumber += 1) {
    const signIndex = lagnaSign == null
      ? null
      : ((lagnaSign + houseNumber - 1) % 12 + 12) % 12;

    const sign = signIndex == null ? "Unknown" : (RASHI_NAMES[signIndex] || "Unknown");
    const lord = signIndex == null ? "Unknown" : (RASHI_LORDS[signIndex] || "Unknown");

    const planetsInHouse = Object.entries(planets)
      .filter(([, planet]) => Number((planet as any)?.house) === houseNumber)
      .map(([name]) => String(name));

    houses.push({
      houseNumber,
      sign,
      lord,
      planets: planetsInHouse,
      fallbackUsed: signIndex == null,
    });
  }

  return houses;
}

function buildPlanets(chart: any): VedicPdfPlanet[] {
  const planets = chart?.planets && typeof chart.planets === "object" ? chart.planets : {};

  return PLANET_KEYS.map((name) => {
    const raw = planets?.[name] || {};
    const sign = toSignName(raw?.sign, raw?.signName);
    const degree = toNumber(raw?.degree);
    const house = toNumber(raw?.house);
    const nakshatra = toText(raw?.nakshatra);

    const fallbackUsed = !sign || degree == null || house == null;

    return {
      name,
      sign,
      degree,
      house,
      nakshatra,
      retrograde: Boolean(raw?.isRetrograde),
      dignity: toText(raw?.dignity),
      fallbackUsed,
    };
  });
}

function normalizeBirth(input: any) {
  return {
    year: toNumber(input?.year),
    month: toNumber(input?.month),
    day: toNumber(input?.day),
    hour: toNumber(input?.hour),
    minute: toNumber(input?.minute),
    timezone: toNumber(input?.timezone),
    lat: toNumber(input?.lat),
    lon: toNumber(input?.lon),
    birthPlace: toText(input?.birthPlace),
  };
}

export function normalizeVedicChartForPdf(input: {
  chart: any;
  reportMode: VedicReportMode;
  userProfile: any;
  partnerProfile?: any;
  chartEngine?: string;
  chartFallbackUsed?: boolean;
}): VedicPdfContext {
  const chart = input?.chart || {};

  const lagnaSign = toNumber(chart?.lagna?.sign);
  const lagnaSignName = toSignName(chart?.lagna?.sign, chart?.lagna?.signName);

  const moon = chart?.planets?.Moon || {};
  const sun = chart?.planets?.Sun || {};
  const dasha = chart?.vimshottariDasha || {};

  const d1Planets = buildPlanets(chart);
  const d1Houses = buildHouses(chart, lagnaSign == null ? null : Math.floor(lagnaSign));

  const d9Planets = PLANET_KEYS.map((planet) => {
    const sign = toText(chart?.d9?.[planet]?.signName) || toText(chart?.d9?.[planet]?.signKo);
    return { planet, sign, fallbackUsed: !sign };
  });

  const d10Planets = PLANET_KEYS.map((planet) => {
    const sign = toText(chart?.d10?.[planet]?.signName) || toText(chart?.d10?.[planet]?.signKo);
    return { planet, sign, fallbackUsed: !sign };
  });

  const yogasRaw = Array.isArray(chart?.yogas) ? chart.yogas : [];
  const yogas = yogasRaw.map((item: any) => ({
    name: toText(item?.nameKo) || toText(item?.name) || "Unnamed Yoga",
    planets: Array.isArray(item?.planets) ? item.planets.map((p: unknown) => String(p || "").trim()).filter(Boolean) : [],
    fallbackUsed: false,
  }));

  const missingSummary: string[] = [];
  if (!lagnaSignName) missingSummary.push("lagna.sign");
  if (!toText(moon?.signName) && !toText(moon?.signKo)) missingSummary.push("moon.sign");
  if (!toText(chart?.moonNakshatra?.name)) missingSummary.push("moon.nakshatra");
  if (!toText(sun?.signName) && !toText(sun?.signKo)) missingSummary.push("sun.sign");
  if (!toText(dasha?.current?.planet)) missingSummary.push("dasha.current.planet");
  if (!toText(dasha?.antar?.planet)) missingSummary.push("dasha.antar.planet");
  if (!yogas.length) missingSummary.push("yogas");
  if (d9Planets.every((item) => item.fallbackUsed)) missingSummary.push("d9");
  if (d10Planets.every((item) => item.fallbackUsed)) missingSummary.push("d10");

  const context: VedicPdfContext = {
    reportMode: input?.reportMode || "single",
    user: {
      name: toText(input?.userProfile?.name),
      birth: normalizeBirth(input?.userProfile),
    },
    partner: input?.reportMode === "compatibility"
      ? {
          name: toText(input?.partnerProfile?.name),
          birth: normalizeBirth(input?.partnerProfile),
        }
      : undefined,
    core: {
      lagna: {
        sign: lagnaSignName,
        degree: toNumber(chart?.lagna?.degree),
        fallbackUsed: !lagnaSignName,
      },
      moon: {
        sign: toText(moon?.signName) || toText(moon?.signKo),
        nakshatra: toText(chart?.moonNakshatra?.name) || toText(chart?.moonNakshatra?.ko),
        pada: toNumber(chart?.moonNakshatra?.pada),
        fallbackUsed: !toText(chart?.moonNakshatra?.name) && !toText(chart?.moonNakshatra?.ko),
      },
      sun: {
        sign: toText(sun?.signName) || toText(sun?.signKo),
        house: toNumber(sun?.house),
        fallbackUsed: !toText(sun?.signName) && !toText(sun?.signKo),
      },
      atmakaraka: {
        planet: toText(chart?.atmakaraka?.planet),
        sign: toText(chart?.atmakaraka?.sign) || toText(chart?.atmakaraka?.signKo),
        fallbackUsed: !toText(chart?.atmakaraka?.planet),
      },
      dasha: {
        maha: {
          planet: toText(dasha?.current?.planet),
          startDate: toText(dasha?.current?.startDate),
          endDate: toText(dasha?.current?.endDate),
          fallbackUsed: !toText(dasha?.current?.planet),
        },
        antar: {
          planet: toText(dasha?.antar?.planet),
          startDate: toText(dasha?.antar?.startDate),
          endDate: toText(dasha?.antar?.endDate),
          fallbackUsed: !toText(dasha?.antar?.planet),
        },
        fallbackUsed: !toText(dasha?.current?.planet) && !toText(dasha?.antar?.planet),
      },
      yogas,
    },
    charts: {
      d1: {
        houses: d1Houses,
        planets: d1Planets,
      },
      d9: {
        planets: d9Planets,
        fallbackUsed: d9Planets.every((item) => item.fallbackUsed),
      },
      d10: {
        planets: d10Planets,
        fallbackUsed: d10Planets.every((item) => item.fallbackUsed),
      },
    },
    missingSummary,
    sourceMeta: {
      ayanamsa: toNumber(chart?.ayanamsa),
      chartEngine: String(input?.chartEngine || "vedic-local+swiss"),
      fallbackUsed: Boolean(input?.chartFallbackUsed) || Boolean(missingSummary.length),
    },
  };

  return context;
}
