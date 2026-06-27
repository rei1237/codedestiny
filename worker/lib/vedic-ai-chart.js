import { getSwissVedicPlanets } from "./swiss-ephemeris.js";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_LORDS = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];

const NAKSHATRAS = [
  ["Ashwini", "Ketu"],
  ["Bharani", "Venus"],
  ["Krittika", "Sun"],
  ["Rohini", "Moon"],
  ["Mrigashira", "Mars"],
  ["Ardra", "Rahu"],
  ["Punarvasu", "Jupiter"],
  ["Pushya", "Saturn"],
  ["Ashlesha", "Mercury"],
  ["Magha", "Ketu"],
  ["Purva Phalguni", "Venus"],
  ["Uttara Phalguni", "Sun"],
  ["Hasta", "Moon"],
  ["Chitra", "Mars"],
  ["Swati", "Rahu"],
  ["Vishakha", "Jupiter"],
  ["Anuradha", "Saturn"],
  ["Jyeshtha", "Mercury"],
  ["Mula", "Ketu"],
  ["Purva Ashadha", "Venus"],
  ["Uttara Ashadha", "Sun"],
  ["Shravana", "Moon"],
  ["Dhanishta", "Mars"],
  ["Shatabhisha", "Rahu"],
  ["Purva Bhadrapada", "Jupiter"],
  ["Uttara Bhadrapada", "Saturn"],
  ["Revati", "Mercury"],
];

const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

const OWN_SIGNS = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"],
  Saturn: ["Capricorn", "Aquarius"],
  Rahu: [],
  Ketu: [],
};

const EXALTATION_SIGNS = {
  Sun: "Aries",
  Moon: "Taurus",
  Mars: "Capricorn",
  Mercury: "Virgo",
  Jupiter: "Cancer",
  Venus: "Pisces",
  Saturn: "Libra",
  Rahu: "Taurus",
  Ketu: "Scorpio",
};

const DEBILITATION_SIGNS = {
  Sun: "Libra",
  Moon: "Scorpio",
  Mars: "Cancer",
  Mercury: "Pisces",
  Jupiter: "Capricorn",
  Venus: "Virgo",
  Saturn: "Aries",
  Rahu: "Scorpio",
  Ketu: "Taurus",
};

const FRIENDS = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};

const ENEMIES = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};

const COMBUST_LIMITS = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,
  Jupiter: 11,
  Venus: 10,
  Saturn: 15,
};

const CITY_COORDS = [
  ["seoul", "korea", 37.5665, 126.9780, "Asia/Seoul"],
  ["서울", "한국", 37.5665, 126.9780, "Asia/Seoul"],
  ["busan", "korea", 35.1796, 129.0756, "Asia/Seoul"],
  ["부산", "한국", 35.1796, 129.0756, "Asia/Seoul"],
  ["incheon", "korea", 37.4563, 126.7052, "Asia/Seoul"],
  ["daegu", "korea", 35.8714, 128.6014, "Asia/Seoul"],
  ["daejeon", "korea", 36.3504, 127.3845, "Asia/Seoul"],
  ["gwangju", "korea", 35.1595, 126.8526, "Asia/Seoul"],
  ["jeju", "korea", 33.4996, 126.5312, "Asia/Seoul"],
  ["tokyo", "japan", 35.6762, 139.6503, "Asia/Tokyo"],
  ["osaka", "japan", 34.6937, 135.5023, "Asia/Tokyo"],
  ["new york", "usa", 40.7128, -74.0060, "America/New_York"],
  ["los angeles", "usa", 34.0522, -118.2437, "America/Los_Angeles"],
  ["london", "uk", 51.5072, -0.1276, "Europe/London"],
  ["paris", "france", 48.8566, 2.3522, "Europe/Paris"],
  ["delhi", "india", 28.6139, 77.2090, "Asia/Kolkata"],
  ["mumbai", "india", 19.0760, 72.8777, "Asia/Kolkata"],
];

function clean(value, maxLength = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function nd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

function round(value, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function signIndex(longitude) {
  const lon = nd(longitude);
  return Number.isFinite(lon) ? Math.floor(lon / 30) : null;
}

function signName(longitude) {
  const index = signIndex(longitude);
  return index == null ? "" : SIGNS[index];
}

function degreeInSign(longitude) {
  const lon = nd(longitude);
  return Number.isFinite(lon) ? round(lon % 30, 4) : null;
}

function nakshatraInfo(longitude) {
  const lon = nd(longitude);
  if (!Number.isFinite(lon)) return { name: "", lord: "", pada: null, index: null };
  const span = 360 / 27;
  const padaSpan = span / 4;
  const index = Math.min(26, Math.floor(lon / span));
  const pada = Math.min(4, Math.floor((lon - (index * span)) / padaSpan) + 1);
  const [name, lord] = NAKSHATRAS[index];
  return { name, lord, pada, index };
}

function houseFromReference(sign, referenceSign) {
  if (!Number.isInteger(sign) || !Number.isInteger(referenceSign)) return null;
  return ((sign - referenceSign + 12) % 12) + 1;
}

function angularDistance(a, b) {
  const diff = Math.abs(nd(a) - nd(b));
  return Math.min(diff, 360 - diff);
}

function resolvePlace(rawPlace = {}) {
  const place = rawPlace && typeof rawPlace === "object" ? rawPlace : {};
  const lat = Number(place.latitude ?? place.lat);
  const lon = Number(place.longitude ?? place.lng ?? place.lon);
  const timezone = clean(place.timezone || place.timeZone);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      city: clean(place.city, 80),
      country: clean(place.country, 80),
      latitude: lat,
      longitude: lon,
      timezone: timezone || guessTimezoneFromLongitude(lon),
      source: "provided-coordinates",
    };
  }

  const city = clean(place.city || place.birthCity || place.place, 80).toLowerCase();
  const country = clean(place.country, 80).toLowerCase();
  if (!city) return null;
  const matched = CITY_COORDS.find(([knownCity, knownCountry]) => (
    city.includes(knownCity) || knownCity.includes(city)
  ) && (!country || knownCountry.includes(country) || country.includes(knownCountry)));
  if (!matched) return null;
  return {
    city: clean(place.city || matched[0], 80),
    country: clean(place.country || matched[1], 80),
    latitude: matched[2],
    longitude: matched[3],
    timezone: timezone || matched[4],
    source: "city-preset",
  };
}

function guessTimezoneFromLongitude(longitude) {
  const offset = Math.max(-12, Math.min(14, Math.round(Number(longitude) / 15)));
  if (offset === 9) return "Asia/Seoul";
  return `UTC${offset >= 0 ? "+" : ""}${offset}`;
}

function parseUtcOffset(timezone) {
  const text = clean(timezone);
  const match = text.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hour = Number(match[2]);
  const minute = Number(match[3] || 0);
  return sign * (hour + (minute / 60));
}

function timezoneOffsetHours(utcDate, timezone) {
  const fixed = parseUtcOffset(timezone);
  if (fixed != null) return fixed;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Asia/Seoul",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = Object.fromEntries(formatter.formatToParts(utcDate).map((part) => [part.type, part.value]));
    const wallUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return (wallUtc - utcDate.getTime()) / 3600000;
  } catch (error) {
    return 9;
  }
}

function localBirthToChartInput(birthInfo, place) {
  const [year, month, day] = clean(birthInfo.birthDate, 10).split("-").map(Number);
  const timeUnknown = birthInfo.birthTimeUnknown === true;
  const [hour, minute] = timeUnknown
    ? [12, 0]
    : clean(birthInfo.birthTime || "12:00", 5).split(":").map(Number);
  const localUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let offset = timezoneOffsetHours(new Date(localUtc), place.timezone);
  const actualUtc = new Date(localUtc - (offset * 3600000));
  offset = timezoneOffsetHours(actualUtc, place.timezone);
  return {
    year,
    month,
    day,
    hour,
    minute,
    timezone: offset,
    lat: place.latitude,
    lon: place.longitude,
    utcDate: new Date(localUtc - (offset * 3600000)),
    birthTimeConfidence: timeUnknown ? "unknown" : "provided",
  };
}

function buildPoint(name, longitude, referenceSign, retrograde = false, sunLongitude = null) {
  const sign = signIndex(longitude);
  const nak = nakshatraInfo(longitude);
  const dignity = planetDignity(name, sign);
  const point = {
    name,
    sign: sign == null ? "" : SIGNS[sign],
    signIndex: sign,
    degree: degreeInSign(longitude),
    longitude: round(nd(longitude), 4),
    house: houseFromReference(sign, referenceSign),
    nakshatra: nak.name,
    nakshatraLord: nak.lord,
    pada: nak.pada,
    dignity,
    retrograde: Boolean(retrograde),
    combust: isCombust(name, longitude, sunLongitude),
    aspects: [],
  };
  return point;
}

function planetDignity(planet, sign) {
  if (!Number.isInteger(sign)) return "";
  const signLabel = SIGNS[sign];
  if (EXALTATION_SIGNS[planet] === signLabel) return "exalted";
  if (DEBILITATION_SIGNS[planet] === signLabel) return "debilitated";
  if ((OWN_SIGNS[planet] || []).includes(signLabel)) return "own sign";
  const lord = SIGN_LORDS[sign];
  if ((FRIENDS[planet] || []).includes(lord)) return "friendly sign";
  if ((ENEMIES[planet] || []).includes(lord)) return "enemy sign";
  return "neutral";
}

function isCombust(planet, longitude, sunLongitude) {
  if (sunLongitude == null || planet === "Sun" || planet === "Rahu" || planet === "Ketu") return false;
  const limit = COMBUST_LIMITS[planet];
  if (!limit) return false;
  return angularDistance(longitude, sunLongitude) <= limit;
}

function aspectTargets(planet) {
  if (planet === "Mars") return [4, 7, 8];
  if (planet === "Jupiter") return [5, 7, 9];
  if (planet === "Saturn") return [3, 7, 10];
  if (planet === "Rahu" || planet === "Ketu") return [5, 7, 9];
  return [7];
}

function applyAspects(planets) {
  const byHouse = new Map(planets.map((planet) => [planet.name, planet.house]));
  for (const planet of planets) {
    if (!planet.house) continue;
    planet.aspects = aspectTargets(planet.name).map((offset) => {
      const targetHouse = ((planet.house + offset - 2) % 12) + 1;
      const receivers = planets.filter((other) => other.name !== planet.name && byHouse.get(other.name) === targetHouse).map((other) => other.name);
      return receivers.length ? `${targetHouse}th house (${receivers.join(", ")})` : `${targetHouse}th house`;
    });
  }
}

function buildHouses(referenceSign, planets, mode) {
  if (!Number.isInteger(referenceSign)) return [];
  return Array.from({ length: 12 }, (_, index) => {
    const sign = (referenceSign + index) % 12;
    return {
      house: index + 1,
      sign: SIGNS[sign],
      lord: SIGN_LORDS[sign],
      planets: planets.filter((planet) => planet.house === index + 1).map((planet) => planet.name),
      meaning: houseMeaning(index + 1),
      basis: mode,
    };
  });
}

function houseMeaning(house) {
  return [
    "self, body, life direction",
    "wealth, speech, family resources",
    "courage, skills, siblings",
    "home, mother, emotional ground",
    "creativity, children, intelligence",
    "work, health routines, obstacles",
    "partnership, marriage, contracts",
    "transformation, hidden matters",
    "dharma, teachers, fortune",
    "career, status, public role",
    "income, networks, gains",
    "release, foreign places, inner life",
  ][house - 1] || "";
}

function vargaSign(longitude, division, kind) {
  const sign = signIndex(longitude);
  if (!Number.isInteger(sign)) return "";
  const part = Math.min(division - 1, Math.floor(((nd(longitude) % 30) / 30) * division));
  if (kind === "d9") {
    const start = sign % 3 === 0 ? sign : (sign % 3 === 1 ? sign + 8 : sign + 4);
    return SIGNS[(start + part) % 12];
  }
  if (kind === "d10") {
    const start = sign % 2 === 0 ? sign : sign + 8;
    return SIGNS[(start + part) % 12];
  }
  if (kind === "d7") {
    const start = sign % 2 === 0 ? sign : sign + 6;
    return SIGNS[(start + part) % 12];
  }
  if (kind === "d2") {
    const firstHalf = (nd(longitude) % 30) < 15;
    const odd = sign % 2 === 0;
    return odd === firstHalf ? "Leo" : "Cancer";
  }
  if (kind === "d12") return SIGNS[(sign + part) % 12];
  return SIGNS[(sign * division + part) % 12];
}

function buildDivisionalCharts(points) {
  const chartFor = (kind, division) => Object.fromEntries(
    points.map((planet) => [planet.name, {
      sign: vargaSign(planet.longitude, division, kind),
      natalSign: planet.sign,
      natalHouse: planet.house,
    }]),
  );
  return {
    d1: Object.fromEntries(points.map((planet) => [planet.name, { sign: planet.sign, house: planet.house, degree: planet.degree }])),
    d9: chartFor("d9", 9),
    d10: chartFor("d10", 10),
    d7: chartFor("d7", 7),
    d2: chartFor("d2", 2),
    d12: chartFor("d12", 12),
  };
}

function planetsInHouse(planets, house) {
  return planets.filter((planet) => planet.house === house).map((planet) => planet.name);
}

function buildYogas(planets, houses) {
  const yogas = [];
  const moon = planets.find((planet) => planet.name === "Moon");
  const jupiter = planets.find((planet) => planet.name === "Jupiter");
  const mars = planets.find((planet) => planet.name === "Mars");
  if (moon && jupiter && [1, 4, 7, 10].includes(houseFromReference(jupiter.signIndex, moon.signIndex))) {
    yogas.push({
      name: "Gaja Kesari Yoga",
      planets: ["Moon", "Jupiter"],
      meaning: "mind and wisdom can support public trust, learning, and recovery after pressure",
      strength: jupiter.dignity === "debilitated" ? "moderate" : "notable",
    });
  }
  if (moon && mars && (moon.house === mars.house || mars.aspects.some((item) => item.includes(`${moon.house}th house`)))) {
    yogas.push({
      name: "Chandra Mangala Yoga",
      planets: ["Moon", "Mars"],
      meaning: "emotional urgency and practical drive can create strong earning or initiative patterns",
      strength: "contextual",
    });
  }
  const secondLord = houses.find((house) => house.house === 2)?.lord;
  const eleventhLord = houses.find((house) => house.house === 11)?.lord;
  const second = planets.find((planet) => planet.name === secondLord);
  const eleventh = planets.find((planet) => planet.name === eleventhLord);
  if (second && eleventh && (second.house === eleventh.house || [2, 5, 9, 11].includes(second.house) || [2, 5, 9, 11].includes(eleventh.house))) {
    yogas.push({
      name: "Dhana Yoga tendency",
      planets: Array.from(new Set([secondLord, eleventhLord])).filter(Boolean),
      meaning: "resources grow through skills, networks, or accumulated credibility rather than chance alone",
      strength: "supportive",
    });
  }
  const kendraPlanets = planetsInHouse(planets, 1).concat(planetsInHouse(planets, 4), planetsInHouse(planets, 7), planetsInHouse(planets, 10));
  if (kendraPlanets.includes("Venus") || kendraPlanets.includes("Jupiter")) {
    yogas.push({
      name: "Kendra benefic support",
      planets: kendraPlanets.filter((planet) => ["Venus", "Jupiter", "Mercury", "Moon"].includes(planet)),
      meaning: "benefic planets in angular houses can soften pressure and make support arrive through people or visible roles",
      strength: "supportive",
    });
  }
  return yogas;
}

function addYears(date, years) {
  return new Date(date.getTime() + (years * 365.2425 * 24 * 3600000));
}

function buildVimshottariDasha(moonLongitude, birthUtc = new Date(), now = new Date()) {
  const nak = nakshatraInfo(moonLongitude);
  const startLord = nak.lord || "Moon";
  const span = 360 / 27;
  const startIndex = DASHA_ORDER.indexOf(startLord);
  const nakStart = (nak.index || 0) * span;
  const elapsedFraction = Math.max(0, Math.min(1, (nd(moonLongitude) - nakStart) / span));
  const remainingYears = DASHA_YEARS[startLord] * (1 - elapsedFraction);
  const timeline = [];
  let cursor = new Date(birthUtc.getTime());
  let lordIndex = startIndex;
  let first = true;
  for (let i = 0; i < 12; i += 1) {
    const lord = DASHA_ORDER[(lordIndex + i) % DASHA_ORDER.length];
    const years = first ? remainingYears : DASHA_YEARS[lord];
    const end = addYears(cursor, years);
    timeline.push({ lord, start: cursor.toISOString(), end: end.toISOString(), years: round(years, 3) });
    cursor = end;
    first = false;
  }
  let current = timeline.find((period) => new Date(period.start) <= now && now < new Date(period.end)) || timeline[0];
  if (!current) current = timeline[0];
  const antar = buildSubDasha(current, now);
  const pratyantar = antar ? buildSubDasha(antar, now) : null;
  return {
    system: "Vimshottari",
    currentMahadasha: current?.lord || "",
    currentAntardasha: antar?.lord || "",
    currentPratyantarDasha: pratyantar?.lord || "",
    timeline,
    birthNakshatraLord: startLord,
    birthDashaBalanceYears: round(remainingYears, 3),
  };
}

function buildSubDasha(parent, now) {
  const start = new Date(parent.start);
  const end = new Date(parent.end);
  const totalMs = end.getTime() - start.getTime();
  if (!Number.isFinite(totalMs) || totalMs <= 0) return null;
  let cursor = new Date(start.getTime());
  const parentIndex = DASHA_ORDER.indexOf(parent.lord);
  for (let i = 0; i < DASHA_ORDER.length; i += 1) {
    const lord = DASHA_ORDER[(parentIndex + i) % DASHA_ORDER.length];
    const duration = totalMs * (DASHA_YEARS[lord] / 120);
    const next = new Date(cursor.getTime() + duration);
    if (cursor <= now && now < next) return { lord, start: cursor.toISOString(), end: next.toISOString() };
    cursor = next;
  }
  return null;
}

function summarizeChart(chart) {
  const lagna = chart.lagna?.sign ? `${chart.lagna.sign} Lagna` : "Moon chart 중심";
  const moon = chart.moon?.sign ? `${chart.moon.sign} Moon` : "Moon data pending";
  const nak = chart.moon?.nakshatra ? `${chart.moon.nakshatra} Pada ${chart.moon.pada}` : "";
  const dasha = [chart.dasha?.currentMahadasha, chart.dasha?.currentAntardasha].filter(Boolean).join(" / ");
  return [lagna, moon, nak, dasha ? `current dasha ${dasha}` : ""].filter(Boolean).join(" · ");
}

export async function calculateVedicAiChart(env, consultationInput = {}, options = {}) {
  const birthInfo = consultationInput.birthInfo || {};
  const place = resolvePlace(birthInfo.birthPlace || consultationInput.birthPlace || {});
  if (!place) {
    const error = new Error("출생지 정보를 확인하지 못했습니다.");
    error.code = "BIRTH_PLACE_INVALID";
    throw error;
  }

  const chartInput = localBirthToChartInput(birthInfo, place);
  const raw = await getSwissVedicPlanets(env, chartInput, {
    requestUrl: options.requestUrl,
    strictSwiss: false,
  });
  const moonLongitude = raw.planets?.Moon;
  const lagnaSign = birthInfo.birthTimeUnknown === true ? null : signIndex(raw.ascendantSidereal);
  const moonSign = signIndex(moonLongitude);
  const referenceSign = Number.isInteger(lagnaSign) ? lagnaSign : moonSign;
  const sunLongitude = raw.planets?.Sun;
  const points = Object.keys(raw.planets || {})
    .filter((name) => Number.isFinite(Number(raw.planets[name])))
    .map((name) => buildPoint(name, raw.planets[name], referenceSign, raw.retrograde?.[name] === true, sunLongitude));
  applyAspects(points);

  const moonPoint = points.find((planet) => planet.name === "Moon") || null;
  const sunPoint = points.find((planet) => planet.name === "Sun") || null;
  const houses = buildHouses(referenceSign, points, Number.isInteger(lagnaSign) ? "lagna" : "moon");
  const dasha = moonPoint?.longitude != null
    ? buildVimshottariDasha(moonPoint.longitude, chartInput.utcDate, options.now instanceof Date ? options.now : new Date())
    : null;
  const lagnaNak = Number.isInteger(lagnaSign) ? nakshatraInfo(raw.ascendantSidereal) : null;
  let transits = null;
  try {
    const now = options.now instanceof Date ? options.now : new Date();
    const nowOffset = timezoneOffsetHours(now, place.timezone);
    const transitRaw = await getSwissVedicPlanets(env, {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours() + nowOffset,
      minute: now.getUTCMinutes(),
      timezone: nowOffset,
      lat: place.latitude,
      lon: place.longitude,
    }, { requestUrl: options.requestUrl, strictSwiss: false });
    transits = {
      calculatedAt: now.toISOString(),
      gochara: Object.fromEntries(Object.entries(transitRaw.planets || {}).map(([name, longitude]) => [name, {
        sign: signName(longitude),
        degree: degreeInSign(longitude),
        nakshatra: nakshatraInfo(longitude).name,
      }])),
    };
  } catch (error) {
    console.warn("[vedic-ai] transit calculation skipped", {
      message: clean(error?.message || error, 300),
      city: place.city,
      country: place.country,
    });
  }

  const chart = {
    ayanamsa: "Lahiri",
    ayanamsaDegree: round(raw.ayanamsa, 6),
    calculationMeta: {
      source: raw.source || "swiss-ephemeris",
      engineQuality: raw.engineQuality || "",
      fallbackUsed: raw.fallbackUsed === true,
      birthTimeConfidence: chartInput.birthTimeConfidence,
      interpretationMode: Number.isInteger(lagnaSign) ? "lagna-chart" : "moon-chart",
      locationSource: place.source,
      timezone: place.timezone,
      timezoneOffsetHours: chartInput.timezone,
      calculatedAt: new Date().toISOString(),
    },
    lagna: Number.isInteger(lagnaSign) ? {
      sign: SIGNS[lagnaSign],
      degree: degreeInSign(raw.ascendantSidereal),
      longitude: round(raw.ascendantSidereal, 4),
      nakshatra: lagnaNak?.name || "",
      pada: lagnaNak?.pada || null,
    } : null,
    moon: moonPoint ? {
      sign: moonPoint.sign,
      degree: moonPoint.degree,
      longitude: moonPoint.longitude,
      nakshatra: moonPoint.nakshatra,
      pada: moonPoint.pada,
      house: moonPoint.house,
    } : null,
    sun: sunPoint ? {
      sign: sunPoint.sign,
      degree: sunPoint.degree,
      longitude: sunPoint.longitude,
      nakshatra: sunPoint.nakshatra,
      pada: sunPoint.pada,
      house: sunPoint.house,
    } : null,
    planets: points,
    rahuKetu: {
      rahu: points.find((planet) => planet.name === "Rahu") || null,
      ketu: points.find((planet) => planet.name === "Ketu") || null,
    },
    houses,
    divisionalCharts: buildDivisionalCharts(points),
    yogas: buildYogas(points, houses),
    dasha,
    transits,
    chartSummary: "",
  };
  chart.chartSummary = summarizeChart(chart);
  return chart;
}

export const __vedicAiChartTestUtils = {
  nakshatraInfo,
  resolvePlace,
  timezoneOffsetHours,
  buildVimshottariDasha,
  vargaSign,
};
