import {
  ChartAnglePoint,
  NormalizedAspect,
  NormalizedChartData,
  NormalizedHouse,
  NormalizedPlanet,
  RawAspectLike,
  RawHouseLike,
  RawPlanetLike,
  RawWesternChart,
  ZodiacSign,
} from "@/types/astrology";
import { getPlanetDisplayLabel, normalizeDegree, signToBaseDegree, toAbsoluteDegree } from "@/utils/astrology/chartMath";

const ZODIAC_SIGNS: ZodiacSign[] = [
  { index: 0, key: "Aries", labelKo: "\uc591\uc790\ub9ac", glyph: "\u2648", baseDegree: 0 },
  { index: 1, key: "Taurus", labelKo: "\ud669\uc18c\uc790\ub9ac", glyph: "\u2649", baseDegree: 30 },
  { index: 2, key: "Gemini", labelKo: "\uc30d\ub465\uc774\uc790\ub9ac", glyph: "\u264a", baseDegree: 60 },
  { index: 3, key: "Cancer", labelKo: "\uac8c\uc790\ub9ac", glyph: "\u264b", baseDegree: 90 },
  { index: 4, key: "Leo", labelKo: "\uc0ac\uc790\uc790\ub9ac", glyph: "\u264c", baseDegree: 120 },
  { index: 5, key: "Virgo", labelKo: "\ucc98\ub140\uc790\ub9ac", glyph: "\u264d", baseDegree: 150 },
  { index: 6, key: "Libra", labelKo: "\ucc9c\uce6d\uc790\ub9ac", glyph: "\u264e", baseDegree: 180 },
  { index: 7, key: "Scorpio", labelKo: "\uc804\uac08\uc790\ub9ac", glyph: "\u264f", baseDegree: 210 },
  { index: 8, key: "Sagittarius", labelKo: "\uc0ac\uc218\uc790\ub9ac", glyph: "\u2650", baseDegree: 240 },
  { index: 9, key: "Capricorn", labelKo: "\uc5fc\uc18c\uc790\ub9ac", glyph: "\u2651", baseDegree: 270 },
  { index: 10, key: "Aquarius", labelKo: "\ubb3c\ubcd1\uc790\ub9ac", glyph: "\u2652", baseDegree: 300 },
  { index: 11, key: "Pisces", labelKo: "\ubb3c\uace0\uae30\uc790\ub9ac", glyph: "\u2653", baseDegree: 330 },
];

const PLANET_GLYPH: Record<string, string> = {
  Sun: "\u2609",
  Moon: "\u263d",
  Mercury: "\u263f",
  Venus: "\u2640",
  Mars: "\u2642",
  Jupiter: "\u2643",
  Saturn: "\u2644",
  Uranus: "\u2645",
  Neptune: "\u2646",
  Pluto: "\u2647",
  NorthNode: "\u260a",
  SouthNode: "\u260b",
};

const SIGN_ALIAS: Record<string, number> = {
  aries: 0,
  taurus: 1,
  gemini: 2,
  cancer: 3,
  leo: 4,
  virgo: 5,
  libra: 6,
  scorpio: 7,
  sagittarius: 8,
  capricorn: 9,
  aquarius: 10,
  pisces: 11,
  "\uc591\uc790\ub9ac": 0,
  "\ud669\uc18c\uc790\ub9ac": 1,
  "\uc30d\ub465\uc774\uc790\ub9ac": 2,
  "\uac8c\uc790\ub9ac": 3,
  "\uc0ac\uc790\uc790\ub9ac": 4,
  "\ucc98\ub140\uc790\ub9ac": 5,
  "\ucc9c\uce6d\uc790\ub9ac": 6,
  "\uc804\uac08\uc790\ub9ac": 7,
  "\uc0ac\uc218\uc790\ub9ac": 8,
  "\uad81\uc218\uc790\ub9ac": 8,
  "\uc5fc\uc18c\uc790\ub9ac": 9,
  "\ubb3c\ubcd1\uc790\ub9ac": 10,
  "\ubb3c\uace0\uae30\uc790\ub9ac": 11,
};

const ASPECT_TYPE_LABEL: Record<string, { key: NormalizedAspect["type"]; ko: string }> = {
  conjunction: { key: "conjunction", ko: "\ud569" },
  opposition: { key: "opposition", ko: "\ucda9" },
  trine: { key: "trine", ko: "\ud2b8\ub77c\uc778" },
  square: { key: "square", ko: "\uc2a4\ud018\uc5b4" },
  sextile: { key: "sextile", ko: "\uc139\uc2a4\ud0c0\uc77c" },
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function signByIndex(index: number): ZodiacSign {
  const safeIndex = ((Math.floor(index) % 12) + 12) % 12;
  return ZODIAC_SIGNS[safeIndex];
}

function signFromValue(signValue: string | number | undefined): ZodiacSign | null {
  if (typeof signValue === "number" && Number.isFinite(signValue)) return signByIndex(signValue);
  const key = String(signValue || "").trim().toLowerCase();
  if (!key) return null;
  const idx = SIGN_ALIAS[key];
  if (Number.isFinite(idx)) return signByIndex(idx);
  const baseDeg = signToBaseDegree(key);
  if (Number.isFinite(baseDeg)) return signByIndex(baseDeg / 30);
  return null;
}

function toAbsoluteDegreeFromRaw(point: RawPlanetLike | RawHouseLike | undefined): number {
  const absCandidates = [
    safeNumber((point as RawHouseLike | undefined)?.absoluteDegree),
    safeNumber((point as RawPlanetLike | undefined)?.longitude),
  ];
  for (const val of absCandidates) {
    if (Number.isFinite(val)) return normalizeDegree(val);
  }

  const signObj = signFromValue(point?.sign);
  const degInSign = safeNumber(point?.degree);
  if (signObj && Number.isFinite(degInSign)) return normalizeDegree(signObj.baseDegree + degInSign);

  return NaN;
}

function normalizeAnglePoint(key: "ASC" | "MC", raw: RawPlanetLike | undefined): ChartAnglePoint | null {
  const absoluteDegree = toAbsoluteDegreeFromRaw(raw);
  if (!Number.isFinite(absoluteDegree)) return null;
  const sign = signByIndex(Math.floor(absoluteDegree / 30));
  return {
    key,
    absoluteDegree,
    sign,
    degreeInSign: Number((absoluteDegree - sign.baseDegree).toFixed(2)),
  };
}

function normalizePlanet(name: string, raw: RawPlanetLike | undefined): NormalizedPlanet | null {
  if (!raw) return null;
  const absoluteDegree = toAbsoluteDegreeFromRaw(raw);
  if (!Number.isFinite(absoluteDegree)) return null;

  const sign = signByIndex(Math.floor(absoluteDegree / 30));
  const degreeInSign = Number((absoluteDegree - sign.baseDegree).toFixed(2));
  const retrograde = Boolean(raw.retrograde ?? raw.isRetrograde);
  const houseValue = safeNumber(raw.house);

  return {
    id: name,
    label: getPlanetDisplayLabel(name),
    glyph: PLANET_GLYPH[name] || name.slice(0, 2),
    sign,
    degreeInSign,
    absoluteDegree,
    house: Number.isFinite(houseValue) ? Math.max(1, Math.min(12, Math.floor(houseValue))) : null,
    retrograde,
  };
}

function buildFallbackHouses(ascDegree: number): NormalizedHouse[] {
  return Array.from({ length: 12 }, (_, idx) => {
    const degree = normalizeDegree(ascDegree + idx * 30);
    const sign = signByIndex(Math.floor(degree / 30));
    return {
      house: idx + 1,
      absoluteDegree: degree,
      sign,
    };
  });
}

function normalizeHouses(rawChart: RawWesternChart, ascDegree: number): { houses: NormalizedHouse[]; warning?: string } {
  const fromCusps = (rawChart.houseCusps || [])
    .map((deg, idx) => ({
      house: idx + 1,
      absoluteDegree: normalizeDegree(Number(deg)),
    }))
    .filter((h) => Number.isFinite(h.absoluteDegree))
    .slice(0, 12)
    .map((h) => ({ ...h, sign: signByIndex(Math.floor(h.absoluteDegree / 30)) }));

  if (fromCusps.length === 12) {
    return { houses: fromCusps };
  }

  const fromHouses = (rawChart.houses || [])
    .map((h, idx) => {
      const degree = toAbsoluteDegreeFromRaw(h);
      return {
        house: Number.isFinite(safeNumber(h.house)) ? Number(h.house) : idx + 1,
        absoluteDegree: degree,
      };
    })
    .filter((h) => Number.isFinite(h.absoluteDegree))
    .slice(0, 12)
    .map((h) => ({ ...h, sign: signByIndex(Math.floor(h.absoluteDegree / 30)) }));

  if (fromHouses.length === 12) {
    return { houses: fromHouses };
  }

  return {
    houses: buildFallbackHouses(ascDegree),
    warning: "Swiss house cusp 데이터가 없어 ASC 기준 30도 등분으로 표시됩니다.",
  };
}

function normalizeAspect(raw: RawAspectLike): NormalizedAspect | null {
  const from = String(raw.p1 || raw.planet1 || "").trim();
  const to = String(raw.p2 || raw.planet2 || "").trim();
  const rawType = String(raw.type || "").trim().toLowerCase();
  if (!from || !to) return null;
  if (!ASPECT_TYPE_LABEL[rawType]) return null;

  const typeInfo = ASPECT_TYPE_LABEL[rawType];
  const orb = safeNumber(raw.orb);
  return {
    id: `${from}-${to}-${typeInfo.key}`,
    from,
    to,
    type: typeInfo.key,
    orb: Number.isFinite(orb) ? Number(orb.toFixed(2)) : null,
    typeLabelKo: raw.typeKo || typeInfo.ko,
  };
}

export function getZodiacSigns(): ZodiacSign[] {
  return ZODIAC_SIGNS;
}

export function formatDegreeText(degreeInSign: number): string {
  if (!Number.isFinite(degreeInSign)) return "-";
  const d = Math.floor(Math.abs(degreeInSign));
  const min = Math.floor((Math.abs(degreeInSign) - d) * 60);
  return `${d}\u00b0${String(min).padStart(2, "0")}'`;
}

export function normalizeChartData(rawChart: RawWesternChart | null | undefined): NormalizedChartData {
  const warnings: string[] = [];
  const source = String(rawChart?.source || "swiss-api");

  const asc = normalizeAnglePoint("ASC", rawChart?.ascendant);
  const mc = normalizeAnglePoint("MC", rawChart?.midheaven);

  if (!asc) warnings.push("ASC 데이터가 없어 기본 회전값을 사용합니다.");
  if (!mc) warnings.push("MC 데이터가 없어 MC 마커 표시를 제한합니다.");

  const planets: NormalizedPlanet[] = [];
  const rawPlanets = rawChart?.planets || {};
  Object.entries(rawPlanets).forEach(([name, value]) => {
    const normalized = normalizePlanet(name, value);
    if (normalized) {
      planets.push(normalized);
    } else {
      warnings.push(`${name} 위치 데이터가 누락되어 차트에서 제외되었습니다.`);
    }
  });

  // Ensure node points are visible when supplied outside planets map.
  const extraPlanetPairs: Array<[string, RawPlanetLike | undefined]> = [
    ["NorthNode", rawChart?.northNode],
    ["SouthNode", rawChart?.southNode],
  ];
  extraPlanetPairs.forEach(([name, raw]) => {
    if (planets.some((p) => p.id === name)) return;
    const normalized = normalizePlanet(name, raw);
    if (normalized) planets.push(normalized);
  });

  const ascDegree = asc?.absoluteDegree ?? 0;
  const houseResult = normalizeHouses(rawChart || {}, ascDegree);
  if (houseResult.warning) warnings.push(houseResult.warning);

  const aspects = Array.isArray(rawChart?.aspects)
    ? rawChart!.aspects.map(normalizeAspect).filter(Boolean) as NormalizedAspect[]
    : [];

  if (!aspects.length) {
    warnings.push("어스펙트 데이터가 없어 표시는 생략되거나 제한됩니다.");
  }

  return {
    source,
    planets,
    houses: houseResult.houses,
    aspects,
    angles: {
      asc,
      mc,
    },
    warnings,
  };
}

export function getCoreSummary(planets: NormalizedPlanet[], asc: ChartAnglePoint | null): {
  sun: NormalizedPlanet | null;
  moon: NormalizedPlanet | null;
  asc: ChartAnglePoint | null;
} {
  const byId = new Map(planets.map((p) => [p.id, p]));
  return {
    sun: byId.get("Sun") || null,
    moon: byId.get("Moon") || null,
    asc,
  };
}

export function rawPointToAbsoluteDegree(point: RawPlanetLike | undefined): number {
  if (!point) return NaN;
  const direct = safeNumber(point.longitude);
  if (Number.isFinite(direct)) return normalizeDegree(direct);
  const sign = signFromValue(point.sign);
  const degree = safeNumber(point.degree);
  if (sign && Number.isFinite(degree)) return toAbsoluteDegree(sign.key, degree);
  return NaN;
}
