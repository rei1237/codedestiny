export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const SIGNS_KO = [
  "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
  "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리",
];

export const SIGN_LORDS = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];

export const GRAHA_KO = {
  Sun: "태양",
  Moon: "달",
  Mars: "화성",
  Mercury: "수성",
  Jupiter: "목성",
  Venus: "금성",
  Saturn: "토성",
  Rahu: "라후",
  Ketu: "케투",
};

export const GRAHA_KEYWORDS = {
  Sun: ["자아", "권위", "삶의 중심"],
  Moon: ["마음", "감정", "생활 리듬"],
  Mars: ["실행", "용기", "충돌 조절"],
  Mercury: ["언어", "학습", "거래"],
  Jupiter: ["성장", "스승", "확장"],
  Venus: ["사랑", "미감", "풍요"],
  Saturn: ["책임", "시간", "구조"],
  Rahu: ["욕망", "확장", "낯선 경험"],
  Ketu: ["분리", "정화", "내면 통찰"],
};

export const GRAHA_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

export const NAKSHATRAS = [
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

export const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const DASHA_YEARS = {
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

export function nd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

export function round(value, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

export function signIndex(longitude) {
  const lon = nd(longitude);
  return Number.isFinite(lon) ? Math.floor(lon / 30) : null;
}

export function signName(longitude) {
  const index = signIndex(longitude);
  return index == null ? "" : SIGNS[index];
}

export function signKoName(longitude) {
  const index = signIndex(longitude);
  return index == null ? "" : SIGNS_KO[index];
}

export function degreeInSign(longitude) {
  const lon = nd(longitude);
  return Number.isFinite(lon) ? round(lon % 30, 4) : null;
}

export function rashiList() {
  return SIGNS.map((nameEn, index) => ({
    label: "라시, Rashi",
    index: index + 1,
    nameKo: SIGNS_KO[index],
    nameEn,
    lord: SIGN_LORDS[index],
    startLongitude: index * 30,
    endLongitude: index === 11 ? 360 : (index + 1) * 30,
  }));
}

export function ketuLongitudeFromRahu(rahuLongitude) {
  return nd(Number(rahuLongitude) + 180);
}

export function nakshatraInfo(longitude) {
  const lon = nd(longitude);
  if (!Number.isFinite(lon)) return { name: "", lord: "", pada: null, index: null };
  const span = 360 / 27;
  const padaSpan = span / 4;
  const epsilon = 1e-9;
  const index = Math.min(26, Math.floor((lon + epsilon) / span));
  const pada = Math.min(4, Math.floor((lon - (index * span) + epsilon) / padaSpan) + 1);
  const [name, lord] = NAKSHATRAS[index];
  return { name, lord, pada, index };
}

export function houseFromReference(sign, referenceSign) {
  if (!Number.isInteger(sign) || !Number.isInteger(referenceSign)) return null;
  return ((sign - referenceSign + 12) % 12) + 1;
}

export function addYears(date, years) {
  return new Date(date.getTime() + (years * 365.2425 * 24 * 3600000));
}

export function buildSubDasha(parent, now) {
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

export function buildVimshottariDasha(moonLongitude, birthUtc = new Date(), now = new Date()) {
  const nak = nakshatraInfo(moonLongitude);
  const startLord = nak.lord || "Moon";
  const span = 360 / 27;
  const startIndex = DASHA_ORDER.indexOf(startLord);
  const nakStart = (nak.index || 0) * span;
  const elapsedFraction = Math.max(0, Math.min(1, (nd(moonLongitude) - nakStart) / span));
  const remainingYears = DASHA_YEARS[startLord] * (1 - elapsedFraction);
  const timeline = [];
  let cursor = new Date(birthUtc.getTime());
  let remainingTimelineYears = 120;
  for (let i = 0; i < 18 && remainingTimelineYears > 0.0001; i += 1) {
    const lord = DASHA_ORDER[(startIndex + i) % DASHA_ORDER.length];
    const fullYears = i === 0 ? remainingYears : DASHA_YEARS[lord];
    const years = Math.min(fullYears, remainingTimelineYears);
    const end = addYears(cursor, years);
    timeline.push({
      lord,
      start: cursor.toISOString(),
      end: end.toISOString(),
      startDate: cursor.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      years: round(years, 3),
      durationYears: round(years, 3),
    });
    cursor = end;
    remainingTimelineYears -= years;
  }
  let current = timeline.find((period) => new Date(period.start) <= now && now < new Date(period.end)) || timeline[0];
  if (!current) current = timeline[0];
  const antar = buildSubDasha(current, now);
  const pratyantar = antar ? buildSubDasha(antar, now) : null;
  return {
    system: "Vimshottari",
    label: "다샤, Dasha",
    systemLabel: "빈쇼타리 다샤, Vimshottari Dasha",
    currentMahadasha: current?.lord || "",
    currentAntardasha: antar?.lord || "",
    currentPratyantarDasha: pratyantar?.lord || "",
    current: current ? {
      lord: current.lord,
      startDate: current.startDate,
      endDate: current.endDate,
    } : null,
    currentAntardashaPeriod: antar ? {
      lord: antar.lord,
      startDate: antar.start.slice(0, 10),
      endDate: antar.end.slice(0, 10),
    } : null,
    timeline,
    periods: timeline,
    birthNakshatra: nak.name || "",
    birthNakshatraLord: startLord,
    firstDashaLord: startLord,
    birthDashaBalanceYears: round(remainingYears, 3),
    birthBalanceYears: round(remainingYears, 3),
    moonNakshatraElapsedFraction: round(elapsedFraction, 6),
  };
}
