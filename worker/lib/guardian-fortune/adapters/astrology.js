import { getSwissWesternChart } from "../../swiss-ephemeris.js";
import { nonEmptyText, text } from "../../guardian-fortune-adapter-utils.js";

function planetSign(chart, name) {
  const planet = chart?.planets?.[name] || chart?.planets?.[name.toLowerCase()] || {};
  return nonEmptyText(planet.signKo || planet.sign || planet.rashiKo || planet.rashi, 80);
}

function timezoneOffsetHours(year, month, day, hour, minute, timezone) {
  try {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(utcGuess).map((part) => [part.type, part.value]));
    const wallUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return (wallUtc - utcGuess.getTime()) / 3600000;
  } catch {
    return 9;
  }
}

export async function buildAstrologyAdapter(input, options = {}) {
  if (!input.hasBirthPlace) {
    const error = new Error("ASTROLOGY_BIRTH_PLACE_REQUIRED");
    error.code = "BIRTH_PLACE_REQUIRED";
    throw error;
  }

  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = (input.birthTime || "12:00").split(":").map(Number);
  const payload = {
    year,
    month,
    day,
    hour: input.hasBirthTime ? hour : 12,
    minute: input.hasBirthTime ? minute : 0,
    timezone: timezoneOffsetHours(year, month, day, input.hasBirthTime ? hour : 12, input.hasBirthTime ? minute : 0, input.birthPlace.timezone),
    lat: input.birthPlace.latitude,
    lon: input.birthPlace.longitude,
  };
  const calculate = options.calculator || getSwissWesternChart;
  const raw = await calculate(options.env, payload, { requestUrl: options.requestUrl });
  const sun = planetSign(raw, "Sun");
  const moon = planetSign(raw, "Moon");
  const venus = planetSign(raw, "Venus");
  const mars = planetSign(raw, "Mars");
  const saturn = planetSign(raw, "Saturn");
  const ascendant = input.hasBirthTime
    ? nonEmptyText(raw?.ascendant?.signKo || raw?.ascendant?.sign || raw?.ascendant?.rashiKo || raw?.ascendant?.rashi, 80)
    : undefined;

  if (!sun && !moon && !ascendant) {
    const error = new Error("ASTROLOGY_PROJECTION_EMPTY");
    error.code = "ASTROLOGY_PROJECTION_EMPTY";
    throw error;
  }

  return {
    sunSummary: sun ? `태양은 ${sun}의 방식으로 목표와 행동 기준을 드러냅니다.` : undefined,
    moonSummary: moon ? `달은 ${moon}의 결로 감정 반응과 안정감을 찾는 방식을 보여줍니다.` : undefined,
    ascendantSummary: ascendant ? `상승궁은 ${ascendant}의 인상과 첫 대응 방식을 살펴보는 단서입니다.` : undefined,
    venusSummary: venus ? `금성은 ${venus}의 방식으로 관계에서 좋아하는 것과 편안함을 느끼는 결을 보여줍니다.` : undefined,
    marsSummary: mars ? `화성은 ${mars}의 방식으로 밀어붙이는 힘과 행동의 속도를 보여줍니다.` : undefined,
    saturnSummary: saturn ? `토성은 ${saturn}의 방식으로 부담, 책임, 배워야 할 과제를 드러냅니다.` : undefined,
    currentMoodSummary: moon || venus
      ? `오늘은 ${moon || "감정"}${venus ? `와 ${venus}의 관계 감각` : "의 감정 리듬"}을 서두르지 않고 확인하는 편이 좋습니다.`
      : "오늘의 분위기는 태양과 달의 큰 흐름을 중심으로 낮은 확신으로 읽습니다.",
    evidence: [
      sun ? "astrology.sun" : null,
      moon ? "astrology.moon" : null,
      ascendant ? "astrology.ascendant" : null,
      venus ? "astrology.venus" : null,
      mars ? "astrology.mars" : null,
      saturn ? "astrology.saturn" : null,
    ].filter(Boolean),
    engine: text(raw?.source || "swiss-ephemeris", 80),
  };
}
