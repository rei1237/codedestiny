const RASHIS = [
  { name: "메샤", en: "Aries", element: "불", quality: "활동" },
  { name: "브리샤바", en: "Taurus", element: "땅", quality: "고정" },
  { name: "미투나", en: "Gemini", element: "바람", quality: "이변" },
  { name: "카르카", en: "Cancer", element: "물", quality: "활동" },
  { name: "심하", en: "Leo", element: "불", quality: "고정" },
  { name: "칸야", en: "Virgo", element: "땅", quality: "이변" },
  { name: "툴라", en: "Libra", element: "바람", quality: "활동" },
  { name: "브리쉬치카", en: "Scorpio", element: "물", quality: "고정" },
  { name: "다누", en: "Sagittarius", element: "불", quality: "이변" },
  { name: "마카라", en: "Capricorn", element: "땅", quality: "활동" },
  { name: "쿰바", en: "Aquarius", element: "바람", quality: "고정" },
  { name: "미나", en: "Pisces", element: "물", quality: "이변" },
];

const NAKSHATRAS = [
  { name: "아스위니", lord: "케투", deity: "Ashvins", symbol: "말의 머리" },
  { name: "바라니", lord: "금성", deity: "Yama", symbol: "요니" },
  { name: "크리티카", lord: "태양", deity: "Agni", symbol: "면도날" },
  { name: "로히니", lord: "달", deity: "Brahma", symbol: "수레" },
  { name: "므리가시라", lord: "화성", deity: "Soma", symbol: "사슴 머리" },
  { name: "아르드라", lord: "라후", deity: "Rudra", symbol: "눈물방울" },
  { name: "푸나르바수", lord: "목성", deity: "Aditi", symbol: "화살통" },
  { name: "푸샤", lord: "토성", deity: "Brihaspati", symbol: "꽃" },
  { name: "아슬레샤", lord: "수성", deity: "Sarpa", symbol: "뱀" },
  { name: "마가", lord: "케투", deity: "Pitris", symbol: "왕좌" },
  { name: "푸르바팔구니", lord: "금성", deity: "Bhaga", symbol: "해먹" },
  { name: "우타라팔구니", lord: "태양", deity: "Aryaman", symbol: "침대" },
  { name: "하스타", lord: "달", deity: "Savitar", symbol: "손" },
  { name: "치트라", lord: "화성", deity: "Tvashtar", symbol: "진주" },
  { name: "스와티", lord: "라후", deity: "Vayu", symbol: "산호" },
  { name: "비샤카", lord: "목성", deity: "Indragni", symbol: "아치" },
  { name: "아누라다", lord: "토성", deity: "Mitra", symbol: "연꽃" },
  { name: "제스타", lord: "수성", deity: "Indra", symbol: "귀걸이" },
  { name: "물라", lord: "케투", deity: "Nirriti", symbol: "뿌리" },
  { name: "푸르바샤다", lord: "금성", deity: "Apas", symbol: "상아" },
  { name: "우타라샤다", lord: "태양", deity: "Vishvedevas", symbol: "코끼리 이빨" },
  { name: "스라바나", lord: "달", deity: "Vishnu", symbol: "귀" },
  { name: "다니스타", lord: "화성", deity: "Ashta Vasus", symbol: "북" },
  { name: "샤타비샤", lord: "라후", deity: "Varuna", symbol: "원" },
  { name: "푸르바바드라", lord: "목성", deity: "Aja Ekapada", symbol: "칼" },
  { name: "우타라바드라", lord: "토성", deity: "Ahir Budhyana", symbol: "쌍둥이" },
  { name: "레바티", lord: "수성", deity: "Pushan", symbol: "물고기" },
];

const DASHA_ORDER = ["케투", "금성", "태양", "달", "화성", "라후", "목성", "토성", "수성"];
const DASHA_YEARS = { 케투: 7, 금성: 20, 태양: 6, 달: 10, 화성: 7, 라후: 18, 목성: 16, 토성: 19, 수성: 17 };

function normalizeDegree(value) {
  return ((value % 360) + 360) % 360;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function julianDay(year, month, day, utcHour) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716))
    + Math.floor(30.6001 * (m + 1))
    + day
    + utcHour / 24
    + b
    - 1524.5;
}

export function lahiriAyanamsha(jd) {
  const t = (jd - 2451545.0) / 36525;
  return 23.853 + (50.2811 / 3600) * t * 36525 / 365.25;
}

function gmst(jd) {
  const t = (jd - 2451545.0) / 36525;
  return normalizeDegree(
    280.46061837
    + 360.98564736629 * (jd - 2451545)
    + 0.000387933 * t * t
    - t * t * t / 38710000,
  );
}

function sunLongitudeTropical(jd) {
  const t = (jd - 2451545.0) / 36525;
  const l = normalizeDegree(280.46646 + 36000.76983 * t);
  const m = (357.52911 + 35999.05029 * t) * Math.PI / 180;
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * m)
    + 0.000289 * Math.sin(3 * m);
  return normalizeDegree(l + c);
}

function moonLongitudeTropical(jd) {
  const t = (jd - 2451545.0) / 36525;
  const l = normalizeDegree(218.3165 + 481267.8813 * t);
  const m = (134.9634 + 477198.8676 * t) * Math.PI / 180;
  const mp = (357.5291 + 35999.0503 * t) * Math.PI / 180;
  const d = (297.8501 + 445267.1115 * t) * Math.PI / 180;
  const f = (93.2721 + 483202.0175 * t) * Math.PI / 180;
  return normalizeDegree(
    l
    + 6.2886 * Math.sin(m)
    + 1.2740 * Math.sin(2 * d - m)
    + 0.6583 * Math.sin(2 * d)
    + 0.2136 * Math.sin(2 * m)
    - 0.1851 * Math.sin(mp)
    - 0.1143 * Math.sin(2 * f),
  );
}

// 라후(달 승교점)의 평균 황경. Meeus, Astronomical Algorithms 2nd ed. 22장 식 22.2
// (mean ascending node). 태양/달 저정밀 공식과 동일한 등급의 근사(평균 노드 — 진노드
// 아님). 음의 1차항으로 역행이 자연히 반영됨.
function rahuMeanLongitudeTropical(jd) {
  const t = (jd - 2451545.0) / 36525;
  return normalizeDegree(
    125.04452
    - 1934.136261 * t
    + 0.0020708 * t * t
    + t * t * t / 450000,
  );
}

function ascendantTropical(jd, latDeg, lngDeg) {
  const t = (jd - 2451545.0) / 36525;
  const lst = normalizeDegree(gmst(jd) + lngDeg);
  const e = (23.439 - 0.013 * t) * Math.PI / 180;
  const lstRad = lst * Math.PI / 180;
  const latRad = latDeg * Math.PI / 180;
  const asc = Math.atan2(
    Math.cos(lstRad),
    -Math.sin(e) * Math.tan(latRad) - Math.cos(e) * Math.sin(lstRad),
  ) * 180 / Math.PI;
  return normalizeDegree(asc + 180);
}

function toSidereal(tropical, ayanamsha) {
  return normalizeDegree(tropical - ayanamsha);
}

function rashiIndex(deg) {
  return Math.floor(normalizeDegree(deg) / 30);
}

// whole-sign 하우스(바바): 라그나 라시를 1하우스로 보고 행성 라시가 몇 번째 집인지.
function houseFromLagna(bodyRashiIndex, lagnaRashiIndex) {
  return ((bodyRashiIndex - lagnaRashiIndex + 12) % 12) + 1;
}

function getNakshatra(sidDeg) {
  const normalized = normalizeDegree(sidDeg);
  const span = 360 / 27;
  const idx = Math.min(26, Math.floor(normalized / span));
  const offset = normalized % span;
  const pada = Math.floor(offset / (span / 4)) + 1;
  const progress = offset / span;
  return { ...NAKSHATRAS[idx], index: idx, pada, progress };
}

function vimshottariDasha(moonSidereal, birthDateObj) {
  const nak = getNakshatra(moonSidereal);
  const lordName = NAKSHATRAS[nak.index].lord;
  const totalYears = DASHA_YEARS[lordName];
  const remaining = totalYears - nak.progress * totalYears;
  const lordIdx = DASHA_ORDER.indexOf(lordName);
  const sequence = [];
  let accYears = 0;

  for (let i = 0; i < 9; i += 1) {
    const lord = DASHA_ORDER[(lordIdx + i) % 9];
    const years = i === 0 ? remaining : DASHA_YEARS[lord];
    const startDate = new Date(birthDateObj);
    startDate.setUTCDate(startDate.getUTCDate() + Math.round(accYears * 365.25));
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + Math.round(years * 365.25));
    sequence.push({
      lord,
      years: round(years, 1),
      startYear: startDate.getUTCFullYear(),
      endYear: endDate.getUTCFullYear(),
    });
    accYears += years;
    if (accYears > 120) break;
  }

  return { currentLord: lordName, remaining: round(remaining, 1), sequence };
}

function requireFiniteNumber(value, code) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(code);
  return value;
}

export function calculateVedicChart(input) {
  const year = requireFiniteNumber(Number(input.year), "INVALID_YEAR");
  const month = requireFiniteNumber(Number(input.month), "INVALID_MONTH");
  const day = requireFiniteNumber(Number(input.day), "INVALID_DAY");
  const hour = requireFiniteNumber(Number(input.hour), "INVALID_HOUR");
  const minute = requireFiniteNumber(Number(input.minute), "INVALID_MINUTE");
  const tzOffset = requireFiniteNumber(Number(input.tzOffset), "INVALID_TIMEZONE");
  const latitude = requireFiniteNumber(Number(input.latitude), "INVALID_LATITUDE");
  const longitude = requireFiniteNumber(Number(input.longitude), "INVALID_LONGITUDE");

  if (latitude < -90 || latitude > 90) throw new Error("LATITUDE_OUT_OF_RANGE");
  if (longitude < -180 || longitude > 180) throw new Error("LONGITUDE_OUT_OF_RANGE");

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute) - tzOffset * 3600000);
  const utcHour = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600;
  const jd = julianDay(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(), utcHour);
  const ayanamsha = lahiriAyanamsha(jd);
  const sun = toSidereal(sunLongitudeTropical(jd), ayanamsha);
  const moon = toSidereal(moonLongitudeTropical(jd), ayanamsha);
  const lagna = toSidereal(ascendantTropical(jd, latitude, longitude), ayanamsha);
  const lagnaRashi = rashiIndex(lagna);
  const rahu = toSidereal(rahuMeanLongitudeTropical(jd), ayanamsha);
  const ketu = normalizeDegree(rahu + 180);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  return {
    ayanamsha: round(ayanamsha, 2),
    lagna: {
      degree: round(lagna, 2),
      rashi: RASHIS[lagnaRashi],
      rashiIndex: lagnaRashi,
    },
    sun: {
      degree: round(sun, 2),
      rashi: RASHIS[rashiIndex(sun)],
      nakshatra: getNakshatra(sun),
      house: houseFromLagna(rashiIndex(sun), lagnaRashi),
    },
    moon: {
      degree: round(moon, 2),
      rashi: RASHIS[rashiIndex(moon)],
      nakshatra: getNakshatra(moon),
      house: houseFromLagna(rashiIndex(moon), lagnaRashi),
    },
    rahu: {
      degree: round(rahu, 2),
      rashi: RASHIS[rashiIndex(rahu)],
      nakshatra: getNakshatra(rahu),
      house: houseFromLagna(rashiIndex(rahu), lagnaRashi),
    },
    ketu: {
      degree: round(ketu, 2),
      rashi: RASHIS[rashiIndex(ketu)],
      nakshatra: getNakshatra(ketu),
      house: houseFromLagna(rashiIndex(ketu), lagnaRashi),
    },
    dasha: vimshottariDasha(moon, birthDate),
    rawInput: input,
  };
}
