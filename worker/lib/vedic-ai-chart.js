import { getSwissVedicPlanets } from "./swiss-ephemeris.js";
import {
  DASHA_ORDER,
  DASHA_YEARS,
  GRAHA_KEYWORDS,
  GRAHA_KO,
  GRAHA_ORDER,
  NAKSHATRAS,
  SIGN_LORDS,
  SIGNS,
  SIGNS_KO,
  buildVimshottariDasha,
  degreeInSign,
  houseFromReference,
  ketuLongitudeFromRahu,
  nakshatraInfo,
  nd,
  rashiList,
  round,
  signIndex,
  signName,
} from "./vedic-derived-calculations.js";
import { guessTimezoneFromLongitude } from "./geo-timezone.js";

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
  ["서울", "한국", 37.5665, 126.9780, "Asia/Seoul"],
  ["부산", "한국", 35.1796, 129.0756, "Asia/Seoul"],
  ["인천", "한국", 37.4563, 126.7052, "Asia/Seoul"],
  ["대구", "한국", 35.8714, 128.6014, "Asia/Seoul"],
  ["대전", "한국", 36.3504, 127.3845, "Asia/Seoul"],
  ["광주", "한국", 35.1595, 126.8526, "Asia/Seoul"],
  ["제주", "한국", 33.4996, 126.5312, "Asia/Seoul"],
  ["tokyo", "japan", 35.6762, 139.6503, "Asia/Tokyo"],
  ["osaka", "japan", 34.6937, 135.5023, "Asia/Tokyo"],
  ["new york", "usa", 40.7128, -74.0060, "America/New_York"],
  ["los angeles", "usa", 34.0522, -118.2437, "America/Los_Angeles"],
  ["london", "uk", 51.5072, -0.1276, "Europe/London"],
  ["paris", "france", 48.8566, 2.3522, "Europe/Paris"],
  ["delhi", "india", 28.6139, 77.2090, "Asia/Kolkata"],
  ["mumbai", "india", 19.0760, 72.8777, "Asia/Kolkata"],
];

const DEFAULT_TIMEZONE = "Asia/Seoul";

function clean(value, maxLength = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function angularDistance(a, b) {
  const diff = Math.abs(nd(a) - nd(b));
  return Math.min(diff, 360 - diff);
}

function normalizePlaceObject(rawPlace = {}) {
  return rawPlace && typeof rawPlace === "object"
    ? rawPlace
    : { place: rawPlace };
}

function isValidCoordinatePair(lat, lon) {
  return Number.isFinite(lat)
    && Number.isFinite(lon)
    && lat >= -90
    && lat <= 90
    && lon >= -180
    && lon <= 180;
}

function optionalCoordinate(value) {
  const text = clean(value, 40);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function placeSearchText(rawPlace = {}) {
  const place = normalizePlaceObject(rawPlace);
  return [
    place.label,
    place.displayName,
    place.name,
    place.place,
    place.city,
    place.birthCity,
    place.country,
  ].map((item) => clean(item, 120)).filter(Boolean).join(", ");
}

function withDefaultTimezone(place) {
  if (!place) return null;
  return {
    ...place,
    timezone: clean(place.timezone || place.timeZone, 80)
      || guessTimezoneFromLongitude(place.longitude)
      || DEFAULT_TIMEZONE,
  };
}

function resolvePlace(rawPlace = {}) {
  const place = normalizePlaceObject(rawPlace);
  const lat = optionalCoordinate(place.latitude ?? place.lat);
  const lon = optionalCoordinate(place.longitude ?? place.lng ?? place.lon);
  const timezone = clean(place.timezone || place.timeZone);
  if (isValidCoordinatePair(lat, lon)) {
    return {
      city: clean(place.city, 80),
      country: clean(place.country, 80),
      latitude: lat,
      longitude: lon,
      timezone: timezone || guessTimezoneFromLongitude(lon) || DEFAULT_TIMEZONE,
      source: "provided-coordinates",
    };
  }

  const city = clean(place.city || place.birthCity || place.place || place.label || place.displayName || place.name, 80).toLowerCase();
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
    timezone: timezone || matched[4] || DEFAULT_TIMEZONE,
    source: "city-preset",
  };
}

async function geocodePlace(rawPlace = {}) {
  const query = placeSearchText(rawPlace);
  if (!query) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("accept-language", "ko,en");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "CodeDestiny/1.0 (vedic-ai)" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const lat = Number(first?.lat);
    const lon = Number(first?.lon);
    if (!isValidCoordinatePair(lat, lon)) return null;

    const place = normalizePlaceObject(rawPlace);
    return withDefaultTimezone({
      city: clean(place.city || place.place || place.label || place.name || query, 80),
      country: clean(place.country, 80),
      latitude: lat,
      longitude: lon,
      timezone: clean(place.timezone || place.timeZone, 80),
      displayName: clean(first?.display_name, 180),
      source: "nominatim-geocode",
    });
  } catch (error) {
    return null;
  }
}

async function resolvePlaceForCalculation(rawPlace = {}) {
  const provided = resolvePlace(rawPlace);
  if (provided) return withDefaultTimezone(provided);

  const geocoded = await geocodePlace(rawPlace);
  if (geocoded) return geocoded;

  const error = new Error("Birth place coordinates are required for Lagna and Bhava calculation.");
  error.code = "BIRTH_PLACE_INVALID";
  error.status = 422;
  error.details = { placeProvided: Boolean(placeSearchText(rawPlace)) };
  throw error;
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
      timeZone: timezone || DEFAULT_TIMEZONE,
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
    nameKo: GRAHA_KO[name] || name,
    sign: sign == null ? "" : SIGNS[sign],
    signKo: sign == null ? "" : SIGNS_KO[sign],
    signIndex: sign,
    degree: degreeInSign(longitude),
    degreeInRashi: degreeInSign(longitude),
    longitude: round(nd(longitude), 4),
    house: houseFromReference(sign, referenceSign),
    bhava: houseFromReference(sign, referenceSign),
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
      label: "바바, Bhava",
      house: index + 1,
      sign: SIGNS[sign],
      signKo: SIGNS_KO[sign],
      rashi: SIGNS[sign],
      rashiKo: SIGNS_KO[sign],
      lord: SIGN_LORDS[sign],
      planets: planets.filter((planet) => planet.house === index + 1).map((planet) => planet.name),
      grahas: planets.filter((planet) => planet.house === index + 1).map((planet) => GRAHA_KO[planet.name] || planet.name),
      meaning: houseMeaning(index + 1),
      basis: mode,
    };
  });
}

function houseMeaning(house) {
  return [
    "나 자신, 외모, 기본 기질, 삶의 출발점",
    "돈, 말, 가족 기반",
    "표현, 용기, 형제자매, 짧은 이동",
    "집, 마음의 안정, 어머니, 내면의 기반",
    "창조성, 연애, 자녀, 지성, 전생 공덕",
    "노동, 건강 관리, 경쟁, 문제 해결",
    "결혼, 파트너, 계약, 대인관계",
    "변화, 위기, 상속, 깊은 심리, 숨겨진 것",
    "철학, 신념, 스승, 장거리 이동, 행운",
    "직업, 사회적 역할, 명예",
    "수익, 네트워크, 큰 목표",
    "무의식, 고립, 해외, 영성, 내려놓음",
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

function summarizeChart(chart) {
  const lagna = chart.lagna?.sign ? `${chart.lagna.sign} Lagna` : "Lagna/Bhava unavailable";
  const moon = chart.moon?.sign ? `${chart.moon.sign} Moon` : "Moon data pending";
  const nak = chart.moon?.nakshatra ? `${chart.moon.nakshatra} Pada ${chart.moon.pada}` : "";
  const dasha = [chart.dasha?.currentMahadasha, chart.dasha?.currentAntardasha].filter(Boolean).join(" / ");
  return [lagna, moon, nak, dasha ? `current dasha ${dasha}` : ""].filter(Boolean).join(" · ");
}

function buildLagnaResult(rawAscendant, lagnaSign) {
  if (!Number.isInteger(lagnaSign) || !Number.isFinite(Number(rawAscendant))) return null;
  const nak = nakshatraInfo(rawAscendant);
  return {
    label: "라그나, Lagna",
    rashi: SIGNS[lagnaSign],
    rashiKo: SIGNS_KO[lagnaSign],
    longitude: round(rawAscendant, 4),
    degreeInRashi: degreeInSign(rawAscendant),
    degree: degreeInSign(rawAscendant),
    nakshatra: nak.name,
    nakshatraLord: nak.lord,
    pada: nak.pada,
    firstHouseRashi: SIGNS[lagnaSign],
    firstHouseRashiKo: SIGNS_KO[lagnaSign],
  };
}

function buildGrahaRows(points) {
  const byName = new Map(points.map((point) => [point.name, point]));
  return GRAHA_ORDER.map((name) => {
    const point = byName.get(name);
    if (!point) return null;
    return {
      label: "그라하, Graha",
      nameKo: GRAHA_KO[name] || name,
      nameEn: name,
      rashi: point.sign,
      rashiKo: point.signKo,
      longitude: point.longitude,
      degreeInRashi: point.degreeInRashi,
      degree: point.degree,
      bhava: point.house,
      house: point.house,
      nakshatra: point.nakshatra,
      nakshatraLord: point.nakshatraLord,
      pada: point.pada,
      interpretationKeywords: GRAHA_KEYWORDS[name] || [],
      dignity: point.dignity,
      retrograde: point.retrograde,
      combust: point.combust,
    };
  }).filter(Boolean);
}

function buildBhavaRows(houses) {
  return houses.map((house) => ({
    label: "바바, Bhava",
    house: house.house,
    rashi: house.sign,
    rashiKo: house.signKo,
    meaning: house.meaning,
    grahas: house.grahas || house.planets || [],
    lord: house.lord,
  }));
}

function buildMoonNakshatraResult(moonPoint) {
  if (!moonPoint) return null;
  return {
    label: "나크샤트라, Nakshatra",
    name: moonPoint.nakshatra,
    pada: moonPoint.pada,
    lord: moonPoint.nakshatraLord,
    moonLongitude: moonPoint.longitude,
  };
}

function buildVimshottariResult(dasha) {
  if (!dasha) return null;
  const current = dasha.current || null;
  return {
    label: "다샤, Dasha",
    systemLabel: "빈쇼타리 다샤, Vimshottari Dasha",
    birthNakshatra: dasha.birthNakshatra || "",
    firstDashaLord: dasha.firstDashaLord || dasha.birthNakshatraLord || "",
    birthBalanceYears: dasha.birthBalanceYears,
    currentMahadasha: current,
    currentAntardasha: dasha.currentAntardashaPeriod || null,
    periods: (dasha.periods || dasha.timeline || []).map((period) => ({
      lord: period.lord,
      startDate: period.startDate || String(period.start || "").slice(0, 10),
      endDate: period.endDate || String(period.end || "").slice(0, 10),
      durationYears: period.durationYears ?? period.years,
    })),
  };
}

export async function calculateVedicAiChart(env, consultationInput = {}, options = {}) {
  const birthInfo = consultationInput.birthInfo || {};
  const place = await resolvePlaceForCalculation(birthInfo.birthPlace || consultationInput.birthPlace || {});

  const chartInput = localBirthToChartInput(birthInfo, place);
  const raw = await getSwissVedicPlanets(env, chartInput, {
    requestUrl: options.requestUrl,
    strictSwiss: false,
  });
  const moonLongitude = raw.planets?.Moon;
  const lagnaSign = birthInfo.birthTimeUnknown === true ? null : signIndex(raw.ascendantSidereal);
  const referenceSign = Number.isInteger(lagnaSign) ? lagnaSign : null;
  const sunLongitude = raw.planets?.Sun;
  const points = Object.keys(raw.planets || {})
    .filter((name) => Number.isFinite(Number(raw.planets[name])))
    .map((name) => buildPoint(name, raw.planets[name], referenceSign, raw.retrograde?.[name] === true, sunLongitude));
  applyAspects(points);

  const moonPoint = points.find((planet) => planet.name === "Moon") || null;
  const sunPoint = points.find((planet) => planet.name === "Sun") || null;
  const houses = buildHouses(referenceSign, points, "whole-sign");
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
    calculationConfig: {
      zodiac: "sidereal",
      ayanamsa: "Lahiri",
      bhavaSystem: "whole-sign",
      source: "SWISS",
    },
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
      bhavaSystem: "whole-sign",
      zodiac: "sidereal",
      ayanamsa: "Lahiri",
      locationRequiredForLagnaBhava: true,
      lagnaBhavaAvailable: Number.isInteger(lagnaSign),
      unavailableReason: Number.isInteger(lagnaSign) ? "" : "birth-time-missing",
      calculatedAt: new Date().toISOString(),
    },
    lagna: Number.isInteger(lagnaSign) ? {
      label: "라그나, Lagna",
      sign: SIGNS[lagnaSign],
      signKo: SIGNS_KO[lagnaSign],
      rashi: SIGNS[lagnaSign],
      rashiKo: SIGNS_KO[lagnaSign],
      degree: degreeInSign(raw.ascendantSidereal),
      degreeInRashi: degreeInSign(raw.ascendantSidereal),
      longitude: round(raw.ascendantSidereal, 4),
      nakshatra: lagnaNak?.name || "",
      nakshatraLord: lagnaNak?.lord || "",
      pada: lagnaNak?.pada || null,
      firstHouseRashi: SIGNS[lagnaSign],
      firstHouseRashiKo: SIGNS_KO[lagnaSign],
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
    rashis: rashiList(),
    grahas: buildGrahaRows(points),
    rahuKetu: {
      rahu: points.find((planet) => planet.name === "Rahu") || null,
      ketu: points.find((planet) => planet.name === "Ketu") || null,
    },
    houses,
    bhavas: buildBhavaRows(houses),
    moonNakshatra: buildMoonNakshatraResult(moonPoint),
    divisionalCharts: buildDivisionalCharts(points),
    yogas: buildYogas(points, houses),
    dasha,
    vimshottariDasha: buildVimshottariResult(dasha),
    transits,
    chartSummary: "",
  };
  chart.chartSummary = summarizeChart(chart);
  return chart;
}

export const __vedicAiChartTestUtils = {
  nd,
  signIndex,
  signName,
  degreeInSign,
  NAKSHATRAS,
  DASHA_ORDER,
  DASHA_YEARS,
  rashiList,
  nakshatraInfo,
  ketuLongitudeFromRahu,
  resolvePlace,
  timezoneOffsetHours,
  buildVimshottariDasha,
  vargaSign,
};
