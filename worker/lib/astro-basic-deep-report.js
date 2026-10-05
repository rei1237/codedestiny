import natalReading from "./astro-natal-reading.cjs";
import { createHttpError } from "./http.js";

const BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function signAt(longitude) {
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) throw new Error("Invalid Swiss chart position");
  const lon = ((longitude % 360) + 360) % 360;
  return { idx: Math.floor(lon / 30), deg: lon % 30 };
}

// 요청의 chart/HTML을 신뢰하지 않고 기존 서버 Swiss 계산 결과만 기존 해석 정본에 맞춘다.
export function toNatalReadingChart(chart, timeKnown) {
  const planets = {};
  for (const body of BODIES) {
    const position = chart.planets?.[body];
    if (!position && BODIES.indexOf(body) >= 7) continue;
    planets[body] = { sign: signAt(position?.longitude), retro: position?.retrograde === true };
  }
  const result = { sun: planets.Sun.sign, moon: planets.Moon.sign, planets };
  if (timeKnown) {
    if (!Array.isArray(chart.houseCusps) || chart.houseCusps.length !== 12
      || chart.houseCusps.some((v) => typeof v !== "number" || !Number.isFinite(v))) {
      throw new Error("Invalid Swiss house cusps");
    }
    result.asc = signAt(chart.ascendant?.longitude);
    result.mc = signAt(chart.midheaven?.longitude);
    result.houseCuspsLon = chart.houseCusps;
  }
  return result;
}

export function validateBasicDeepInput(body) {
  const invalid = () => createHttpError(400, "생년월일, 출생 시각과 장소를 확인해 주세요.", { code: "ASTRO_INVALID_BIRTH_INPUT" });
  if (!body || typeof body !== "object" || Array.isArray(body)) throw invalid();
  const date = String(body.date || body.birthDate || "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw invalid();
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (year < 1800 || year > 2200 || parsed.toISOString().slice(0, 10) !== date) throw invalid();
  if (body.timeKnown !== undefined && typeof body.timeKnown !== "boolean") throw invalid();
  const timeKnown = body.timeKnown !== false;
  const time = timeKnown ? String(body.time || body.birthTime || "") : "12:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw invalid();
  const lat = body.latitude ?? body.lat;
  const lon = body.longitude ?? body.lon;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90
    || typeof lon !== "number" || !Number.isFinite(lon) || lon < -180 || lon > 180) throw invalid();
  if (!((typeof body.timezone === "string" && body.timezone.trim())
    || (typeof body.timezone === "number" && Number.isFinite(body.timezone)))) throw invalid();
  return {
    date, time, timeKnown, lat, lon,
    // 기존 정규화기의 || 기본값이 UTC 0을 KST 9로 바꾸지 않도록 문자열로 전달한다.
    timezone: String(body.timezone),
    name: typeof body.name === "string" ? body.name.trim().slice(0, 80) : "",
    birth: { year, month, day },
  };
}

export function buildBasicDeepReport(chart, input, { today, moonDay = null }) {
  const report = natalReading.build(toNatalReadingChart(chart, input.timeKnown), {
    timeKnown: input.timeKnown, name: input.name, birth: input.birth, today, moonDay,
  });
  return {
    report,
    html: natalReading.render(report) + natalReading.renderDeep(report),
  };
}
