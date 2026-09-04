// 지오코딩 결과(국가 코드·경도)를 IANA 시간대 이름으로 옮긴다.
//
// 🔴 경도 추정은 마지막 수단이다 — 서울(경도 126.978)은 Math.round(126.978 / 15) === 8 이라
//    "UTC+8" 이 나온다. 한국은 UTC+9 를 쓰므로 성공한 서울 지오코딩에도 1시간이 어긋난 차트가 나왔다.
//    표준시는 경도가 아니라 나라가 정하므로 국가 코드를 먼저 본다.
// 🔴 표에는 나라 전체가 한 시간대를 쓰는 곳만 담는다. 여러 시간대를 쓰는 나라(us·ca·ru·au·br·mx·id·
//    es·pt·cl·ec·nz·mn·kz·cd·pf·ki)는 일부러 뺐다 — 대표 도시 하나를 골라 넣으면 나머지가 전부
//    조용히 틀린다. 표에 없으면 경도 추정으로 내려간다.

/** ISO 3166-1 alpha-2 소문자 → IANA 시간대. */
export const SINGLE_ZONE_TIMEZONE_BY_COUNTRY = {
  kr: "Asia/Seoul",
  kp: "Asia/Pyongyang",
  jp: "Asia/Tokyo",
  cn: "Asia/Shanghai",
  tw: "Asia/Taipei",
  hk: "Asia/Hong_Kong",
  mo: "Asia/Macau",
  sg: "Asia/Singapore",
  my: "Asia/Kuala_Lumpur",
  th: "Asia/Bangkok",
  vn: "Asia/Ho_Chi_Minh",
  kh: "Asia/Phnom_Penh",
  la: "Asia/Vientiane",
  mm: "Asia/Yangon",
  ph: "Asia/Manila",
  bn: "Asia/Brunei",
  in: "Asia/Kolkata",
  np: "Asia/Kathmandu",
  bd: "Asia/Dhaka",
  lk: "Asia/Colombo",
  pk: "Asia/Karachi",
  af: "Asia/Kabul",
  ir: "Asia/Tehran",
  iq: "Asia/Baghdad",
  ae: "Asia/Dubai",
  sa: "Asia/Riyadh",
  qa: "Asia/Qatar",
  kw: "Asia/Kuwait",
  bh: "Asia/Bahrain",
  om: "Asia/Muscat",
  ye: "Asia/Aden",
  jo: "Asia/Amman",
  lb: "Asia/Beirut",
  sy: "Asia/Damascus",
  il: "Asia/Jerusalem",
  tr: "Europe/Istanbul",
  ge: "Asia/Tbilisi",
  am: "Asia/Yerevan",
  az: "Asia/Baku",
  uz: "Asia/Tashkent",
  gb: "Europe/London",
  ie: "Europe/Dublin",
  is: "Atlantic/Reykjavik",
  fr: "Europe/Paris",
  de: "Europe/Berlin",
  nl: "Europe/Amsterdam",
  be: "Europe/Brussels",
  lu: "Europe/Luxembourg",
  ch: "Europe/Zurich",
  at: "Europe/Vienna",
  it: "Europe/Rome",
  cz: "Europe/Prague",
  sk: "Europe/Bratislava",
  pl: "Europe/Warsaw",
  hu: "Europe/Budapest",
  se: "Europe/Stockholm",
  no: "Europe/Oslo",
  dk: "Europe/Copenhagen",
  fi: "Europe/Helsinki",
  ee: "Europe/Tallinn",
  lv: "Europe/Riga",
  lt: "Europe/Vilnius",
  gr: "Europe/Athens",
  ro: "Europe/Bucharest",
  bg: "Europe/Sofia",
  hr: "Europe/Zagreb",
  si: "Europe/Ljubljana",
  rs: "Europe/Belgrade",
  ua: "Europe/Kyiv",
  eg: "Africa/Cairo",
  ma: "Africa/Casablanca",
  za: "Africa/Johannesburg",
  ng: "Africa/Lagos",
  gh: "Africa/Accra",
  ke: "Africa/Nairobi",
  et: "Africa/Addis_Ababa",
  tz: "Africa/Dar_es_Salaam",
  ug: "Africa/Kampala",
  ar: "America/Argentina/Buenos_Aires",
  pe: "America/Lima",
  co: "America/Bogota",
  ve: "America/Caracas",
  uy: "America/Montevideo",
  py: "America/Asuncion",
  bo: "America/La_Paz",
  cr: "America/Costa_Rica",
  pa: "America/Panama",
  gt: "America/Guatemala",
  cu: "America/Havana",
  jm: "America/Jamaica",
  do: "America/Santo_Domingo",
  pr: "America/Puerto_Rico",
  gu: "Pacific/Guam",
  fj: "Pacific/Fiji",
};

/** 국가 코드로만 판정한다. 표에 없으면 "" — 호출자가 경도 추정으로 내려간다. */
export function timezoneFromCountryCode(countryCode) {
  const key = String(countryCode || "").trim().toLowerCase();
  if (!key) return "";
  return SINGLE_ZONE_TIMEZONE_BY_COUNTRY[key] || "";
}

/** 마지막 수단. 나라를 모를 때만 쓴다 — 표준시가 경도와 어긋나는 나라에서는 어긋난 값이 나온다. */
export function guessTimezoneFromLongitude(longitude) {
  const numeric = Number(longitude);
  if (!Number.isFinite(numeric)) return "";
  const offset = Math.max(-12, Math.min(14, Math.round(numeric / 15)));
  if (offset === 9) return "Asia/Seoul";
  return `UTC${offset >= 0 ? "+" : ""}${offset}`;
}

/** 국가 코드 → 경도 순서로 시간대를 정한다. 둘 다 실패하면 "". */
export function resolveGeoTimezone({ countryCode, longitude } = {}) {
  return timezoneFromCountryCode(countryCode) || guessTimezoneFromLongitude(longitude);
}
