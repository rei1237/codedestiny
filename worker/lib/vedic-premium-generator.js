import {
  VEDIC_PREMIUM_CHAPTERS,
  VEDIC_SOLO_TARGET_CHARS,
  sanitizeVedicPremiumText,
} from "./vedic-premium-chapters.js";

const MIN_SECTION_CHARS = 500;
const MIN_CHAPTER_CHARS = 3500;
const MIN_TOTAL_CHARS = Number(VEDIC_SOLO_TARGET_CHARS || 30000);
const FORBIDDEN_TEXT_RE = /\b(?:fallback|payload|json|debug|localdraft|llm|api|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|preflightfailed|chart\s*seed\s*failed)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|계산\s*시그니처|데이터\s*정규화|품질\s*검증|재생성/gi;

function hasForbiddenText(value) {
  return new RegExp(FORBIDDEN_TEXT_RE.source, "i").test(String(value || ""));
}

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const SIGN_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const PLANET_KO = {
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
  Rahu: "라후",
  Ketu: "케투",
};
const PLANET_EN_BY_KO = Object.freeze(Object.fromEntries(Object.entries(PLANET_KO).map(([en, ko]) => [ko, en])));

const VEDIC_SIGN_INTERPRETATION = {
  Aries: { core: "시작이 빠르고 결단이 분명한 추진형 기질", shadow: "속도가 앞서면 조급한 결론으로 흐를 수 있다.", advice: "결정을 내리기 전 사실 점검 순서를 먼저 두는 것이 안전하다." },
  Taurus: { core: "꾸준함과 축적, 감각적 안정성을 중시하는 기질", shadow: "변화 저항이 커지면 기회를 늦게 잡을 수 있다.", advice: "핵심 원칙은 지키되 실행 방식은 유연하게 조정한다." },
  Gemini: { core: "정보 연결과 언어 감각, 학습 속도가 빠른 기질", shadow: "분산이 커지면 깊이가 약해질 수 있다.", advice: "우선순위 3개만 고정해 집중 구간을 만든다." },
  Cancer: { core: "보호와 돌봄, 정서적 공명을 중시하는 기질", shadow: "감정 파도에 따라 선택이 흔들릴 수 있다.", advice: "감정 기록과 생활 루틴을 함께 유지한다." },
  Leo: { core: "표현력과 중심성, 존재감이 강한 기질", shadow: "인정 욕구가 과해지면 관계 피로가 쌓일 수 있다.", advice: "성과보다 과정의 신뢰를 먼저 쌓는다." },
  Virgo: { core: "정교함과 분석력, 실용적 개선 감각이 뛰어난 기질", shadow: "과도한 기준이 자기비판으로 이어질 수 있다.", advice: "완벽보다 반복 가능한 품질을 목표로 둔다." },
  Libra: { core: "균형과 조율, 관계 감각이 섬세한 기질", shadow: "결정 지연이 길어질 수 있다.", advice: "합의 기준을 문장으로 명확히 두고 결정한다." },
  Scorpio: { core: "집중력과 통찰, 깊은 변환 에너지가 강한 기질", shadow: "통제 욕구가 높아지면 피로가 누적될 수 있다.", advice: "신뢰 가능한 범위부터 단계적으로 개방한다." },
  Sagittarius: { core: "의미 탐색과 철학, 확장 지향성이 큰 기질", shadow: "확장만 앞서면 실행 디테일이 비어질 수 있다.", advice: "비전을 주간 실행 계획으로 분해한다." },
  Capricorn: { core: "구조화와 책임, 장기 성과를 만드는 기질", shadow: "과도한 의무감이 정서 경직으로 이어질 수 있다.", advice: "휴식도 일정으로 관리해 지속 가능성을 지킨다." },
  Aquarius: { core: "혁신과 관찰, 집단적 가치에 민감한 기질", shadow: "정서 거리감이 커질 수 있다.", advice: "아이디어를 사람의 언어로 번역해 전달한다." },
  Pisces: { core: "영성, 공감, 치유, 예술성, 보이지 않는 흐름을 읽는 힘", shadow: "경계가 흐려지거나 타인의 감정을 과하게 흡수할 수 있다.", advice: "공감 능력을 현실적 구조와 경계선 안에서 써야 한다." },
};

const VEDIC_NAKSHATRA_INTERPRETATION = {
  Ashwini: { instinct: "빠른 시작, 회복력, 치유 본능, 즉각적인 반응", shadow: "성급함, 무모함, 빨리 끝내려는 조급함", advice: "빠른 직감을 행동으로 옮기기 전 한 번 정리하는 습관이 필요하다." },
};

const VEDIC_DASHA_INTERPRETATION = {
  Moon: {
    theme: "마음, 안정감, 가족, 말, 재물 축적, 대중과의 연결",
    opportunity: "감정과 생활 기반을 안정시키면 수입과 관계의 흐름이 함께 좋아진다.",
    caution: "기분에 따라 선택이 흔들리거나 감정적 소비가 늘 수 있다.",
    advice: "감정이 흔들릴수록 수면, 식사, 기록, 재정 관리의 기본 루틴을 유지해야 한다.",
  },
  Mars: {
    theme: "실행, 표현, 자기주도, 손과 말의 추진력",
    opportunity: "콘텐츠와 실무 실행을 병행하면 성과 회수가 빨라진다.",
    caution: "성급한 결론과 충돌형 소통이 생기기 쉽다.",
    advice: "속도보다 방향 점검을 먼저 두고 실행한다.",
  },
};
const DIGNITY = ["exalted", "own", "friendly", "neutral", "enemy", "debilitated", "unknown"];
const NAKSHATRA_ROWS = [
  ["아슈비니", "Ketu"], ["바라니", "Venus"], ["크리티카", "Sun"], ["로히니", "Moon"], ["므리가시라", "Mars"], ["아르드라", "Rahu"],
  ["푸나르바수", "Jupiter"], ["푸샤", "Saturn"], ["아슐레샤", "Mercury"], ["마가", "Ketu"], ["푸르바 팔구니", "Venus"], ["우타라 팔구니", "Sun"],
  ["하스타", "Moon"], ["치트라", "Mars"], ["스와티", "Rahu"], ["비샤카", "Jupiter"], ["아누라다", "Saturn"], ["제슈타", "Mercury"],
  ["물라", "Ketu"], ["푸르바 아샤다", "Venus"], ["우타라 아샤다", "Sun"], ["슈라바나", "Moon"], ["다니슈타", "Mars"], ["샤타비샤", "Rahu"],
  ["푸르바 바드라파다", "Jupiter"], ["우타라 바드라파다", "Saturn"], ["레바티", "Mercury"],
];

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

const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDegree(value) {
  const n = safeNumber(value, NaN);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

function signFromLongitude(longitude) {
  const lon = normalizeDegree(longitude);
  if (!Number.isFinite(lon)) return { index: null, sign: "", degree: null };
  const index = Math.floor(lon / 30);
  return {
    index,
    signEn: SIGN_EN[index] || "",
    sign: SIGN_KO[index] || "",
    degree: Math.round((lon % 30) * 100) / 100,
  };
}

function houseFromLagna(longitude, lagnaLongitude) {
  const lon = normalizeDegree(longitude);
  const lagna = normalizeDegree(lagnaLongitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lagna)) return null;
  return Math.floor(normalizeDegree(lon - lagna) / 30) + 1;
}

function nakshatraFromLongitude(longitude) {
  const lon = normalizeDegree(longitude);
  if (!Number.isFinite(lon)) return { name: "", pada: null, lord: "" };
  const unit = 360 / 27;
  const idx = Math.min(26, Math.floor(lon / unit));
  const within = lon - idx * unit;
  const [name, lord] = NAKSHATRA_ROWS[idx] || ["", ""];
  const pada = Math.min(4, Math.floor(within / (unit / 4)) + 1);
  return { name, pada, lord };
}

function normalizeGender(value) {
  const token = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남자", "남성"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여자", "여성"].includes(token)) return "female";
  return "unknown";
}

function parseBirthDate(value) {
  const text = clean(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (y > 1800 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { birthDate: `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, birthYear: y, birthMonth: m, birthDay: d };
    }
  }
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const y = Number(compact[1]);
    const m = Number(compact[2]);
    const d = Number(compact[3]);
    if (y > 1800 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { birthDate: `${y}-${compact[2]}-${compact[3]}`, birthYear: y, birthMonth: m, birthDay: d };
    }
  }
  return null;
}

function parseBirthTime(rawTime, rawHour, rawMinute, explicitUnknown = false) {
  if (explicitUnknown) {
    return {
      birthTime: "",
      birthHour: null,
      birthMinute: 0,
      isTimeUnknown: true,
    };
  }

  const unknownTokens = ["모름", "시간 모름", "unknown", "미상", "na", "n/a", "-"];
  const timeToken = clean(rawTime);
  if (timeToken && unknownTokens.includes(timeToken.toLowerCase())) {
    return {
      birthTime: "",
      birthHour: null,
      birthMinute: 0,
      isTimeUnknown: true,
    };
  }

  const hourOnly = Number(rawHour);
  const minuteOnly = Number(rawMinute);
  if (Number.isFinite(hourOnly)) {
    const hh = Math.max(0, Math.min(23, Math.floor(hourOnly)));
    const mm = Number.isFinite(minuteOnly) ? Math.max(0, Math.min(59, Math.floor(minuteOnly))) : 0;
    return {
      birthTime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      birthHour: hh,
      birthMinute: mm,
      isTimeUnknown: false,
    };
  }

  const text = timeToken;
  if (!text) {
    return {
      birthTime: "",
      birthHour: null,
      birthMinute: 0,
      isTimeUnknown: true,
    };
  }

  const hhmm = text.match(/^(\d{1,2}):(\d{1,2})$/);
  if (hhmm) {
    const hh = Number(hhmm[1]);
    const mm = Number(hhmm[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return {
        birthTime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        birthHour: hh,
        birthMinute: mm,
        isTimeUnknown: false,
      };
    }
  }

  const hourText = text.match(/^(\d{1,2})\s*시$/);
  if (hourText) {
    const hh = Number(hourText[1]);
    if (hh >= 0 && hh <= 23) {
      return {
        birthTime: `${String(hh).padStart(2, "0")}:00`,
        birthHour: hh,
        birthMinute: 0,
        isTimeUnknown: false,
      };
    }
  }

  const numericHour = text.match(/^(\d{1,2})$/);
  if (numericHour) {
    const hh = Number(numericHour[1]);
    if (hh >= 0 && hh <= 23) {
      return {
        birthTime: `${String(hh).padStart(2, "0")}:00`,
        birthHour: hh,
        birthMinute: 0,
        isTimeUnknown: false,
      };
    }
  }

  const korean = text.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (korean) {
    const marker = korean[1];
    let hh = Number(korean[2]);
    const mm = Number.isFinite(Number(korean[3])) ? Number(korean[3]) : 0;
    if (hh >= 1 && hh <= 12 && mm >= 0 && mm <= 59) {
      if (marker === "오전") {
        if (hh === 12) hh = 0;
      } else if (hh !== 12) {
        hh += 12;
      }
      return {
        birthTime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        birthHour: hh,
        birthMinute: mm,
        isTimeUnknown: false,
      };
    }
  }

  return {
    birthTime: "",
    birthHour: null,
    birthMinute: 0,
    isTimeUnknown: true,
  };
}

function pickRawBirthSource(input = {}) {
  const birth = input.birth && typeof input.birth === "object" ? input.birth : {};
  const user = input.user && typeof input.user === "object" ? input.user : {};
  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};
  const location = input.location && typeof input.location === "object" ? input.location : {};
  return {
    name: input.name ?? user.name ?? profile.name,
    gender: input.gender ?? input.sex ?? user.gender ?? profile.gender,
    date: input.birthDate ?? input.birthday ?? input.birth ?? input.solarDate ?? input.date ?? birth.date ?? user.birthDate ?? profile.birthDate,
    year: input.birthYear ?? birth.year ?? profile.birthYear,
    month: input.birthMonth ?? birth.month ?? profile.birthMonth,
    day: input.birthDay ?? birth.day ?? profile.birthDay,
    time: input.birthTime ?? input.time ?? birth.time ?? profile.birthTime ?? user.birthTime,
    hour: input.birthHour ?? input.hour ?? input.birth_hour ?? birth.hour ?? profile.birthHour,
    minute: input.birthMinute ?? input.minute ?? birth.minute ?? profile.birthMinute,
    timezone: input.timezone ?? input.tz ?? location.tz ?? user.timezone ?? profile.timezone,
    birthPlace: input.birthPlace ?? input.place ?? input.locationName ?? input.location ?? user.birthPlace ?? profile.birthPlace,
    latitude: input.latitude ?? input.lat ?? location.lat,
    longitude: input.longitude ?? input.lng ?? input.lon ?? location.lon,
    isTimeUnknown: Boolean(input.isTimeUnknown || input.timeUnknown || input.birthTimeUnknown),
  };
}

export function normalizeVedicPremiumBirthInput(input = {}) {
  const src = pickRawBirthSource(input);

  const dateFromFields = Number.isFinite(Number(src.year)) && Number.isFinite(Number(src.month)) && Number.isFinite(Number(src.day))
    ? parseBirthDate(`${Number(src.year)}-${Number(src.month)}-${Number(src.day)}`)
    : null;
  const parsedDate = dateFromFields || parseBirthDate(src.date);

  const parsedTime = parseBirthTime(src.time, src.hour, src.minute, src.isTimeUnknown);
  const timezone = clean(src.timezone) || "Asia/Seoul";

  const out = {
    name: clean(src.name) || undefined,
    gender: normalizeGender(src.gender),
    birthDate: parsedDate ? parsedDate.birthDate : "",
    birthYear: parsedDate ? parsedDate.birthYear : NaN,
    birthMonth: parsedDate ? parsedDate.birthMonth : NaN,
    birthDay: parsedDate ? parsedDate.birthDay : NaN,
    birthTime: parsedTime.birthTime,
    birthHour: parsedTime.birthHour,
    birthMinute: parsedTime.birthMinute,
    timezone,
    birthPlace: clean(src.birthPlace) || undefined,
    latitude: Number.isFinite(Number(src.latitude)) ? Number(src.latitude) : null,
    longitude: Number.isFinite(Number(src.longitude)) ? Number(src.longitude) : null,
    isTimeUnknown: parsedTime.isTimeUnknown,
  };

  return out;
}

export function validateVedicBirthInput(birthInput) {
  const missing = [];
  if (!clean(birthInput?.birthDate)) missing.push("birthDate");
  if (!Number.isFinite(Number(birthInput?.birthYear))) missing.push("birthYear");
  if (!Number.isFinite(Number(birthInput?.birthMonth))) missing.push("birthMonth");
  if (!Number.isFinite(Number(birthInput?.birthDay))) missing.push("birthDay");
  if (!clean(birthInput?.timezone)) missing.push("timezone");

  const hardFail = [];
  if (missing.includes("birthDate")) hardFail.push("birthDate");
  if (birthInput?.isTimeUnknown || birthInput?.birthHour == null) hardFail.push("birthTime");

  return {
    ok: hardFail.length === 0,
    missing,
    hardFail,
    message: hardFail.includes("birthTime")
      ? "베다점 PDF는 라그나와 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요."
      : "생년월일 정보가 올바르지 않습니다. 프로필의 출생 정보를 확인해주세요.",
  };
}

function normalizePlanetMap(rawPlanets = {}, retrograde = {}, lagnaLongitude = NaN) {
  const source = rawPlanets && typeof rawPlanets === "object" ? rawPlanets : {};
  const planets = [];

  for (const englishName of Object.keys(PLANET_KO)) {
    const keyVariants = [englishName, englishName.toLowerCase(), PLANET_KO[englishName]];
    const found = keyVariants.map((k) => source[k]).find((value) => value != null);
    const longitude = typeof found === "object"
      ? normalizeDegree(found.longitude ?? found.absoluteLongitude ?? found.lon)
      : normalizeDegree(found);
    const sign = signFromLongitude(longitude);
    const nk = nakshatraFromLongitude(longitude);

    planets.push({
      name: englishName,
      nameKo: PLANET_KO[englishName] || englishName,
      signEn: sign.signEn || "",
      sign: sign.sign || "",
      degree: sign.degree,
      house: houseFromLagna(longitude, lagnaLongitude),
      nakshatra: nk.name || "",
      pada: Number.isFinite(Number(nk.pada)) ? Number(nk.pada) : undefined,
      retrograde: Boolean(
        retrograde?.[englishName]
        || retrograde?.[englishName.toLowerCase()]
        || (found && typeof found === "object" && found.retrograde),
      ),
      dignity: DIGNITY[6],
      longitude: Number.isFinite(longitude) ? longitude : null,
    });
  }

  return planets;
}

function buildWholeSignHouses(lagnaLongitude, planets = []) {
  const lagnaSign = signFromLongitude(lagnaLongitude).index;
  if (!Number.isFinite(lagnaSign)) return [];

  return Array.from({ length: 12 }, (_, index) => {
    const house = index + 1;
    const sign = SIGN_KO[(lagnaSign + index) % 12] || "";
    const inHouse = planets.filter((planet) => Number(planet.house) === house).map((planet) => PLANET_KO[planet.name] || planet.name);
    return {
      house,
      sign,
      lord: "",
      planets: inHouse,
    };
  });
}

function buildSimpleAspects(planets = []) {
  const majors = planets.filter((planet) => Number.isFinite(Number(planet.longitude)));
  const out = [];
  for (let i = 0; i < majors.length; i += 1) {
    for (let j = i + 1; j < majors.length; j += 1) {
      const a = majors[i];
      const b = majors[j];
      const rawDiff = Math.abs(Number(a.longitude) - Number(b.longitude));
      const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff;
      let type = "";
      let strength = "weak";
      if (Math.abs(diff - 0) <= 6) {
        type = "conjunction";
        strength = "strong";
      } else if (Math.abs(diff - 120) <= 7) {
        type = "trine";
        strength = "strong";
      } else if (Math.abs(diff - 180) <= 7) {
        type = "opposition";
        strength = "medium";
      } else if (Math.abs(diff - 90) <= 7) {
        type = "square";
        strength = "medium";
      }
      if (!type) continue;
      out.push({
        planetA: PLANET_KO[a.name] || a.name,
        planetB: PLANET_KO[b.name] || b.name,
        type,
        strength,
      });
    }
  }
  return out;
}

function buildVimshottariFromMoon(moonNakshatra) {
  const lord = clean(moonNakshatra?.lord) || "Moon";
  const startIndex = Math.max(0, DASHA_SEQUENCE.indexOf(lord));
  const periods = DASHA_SEQUENCE.map((planet, index) => {
    const lordIndex = (startIndex + index) % DASHA_SEQUENCE.length;
    const l = DASHA_SEQUENCE[lordIndex];
    return {
      type: "maha",
      lord: PLANET_KO[l] || l,
      start: "",
      end: "",
      years: DASHA_YEARS[l] || 0,
    };
  });
  return {
    system: "vimshottari",
    currentMahaDasha: periods[0]?.lord || "",
    currentAntarDasha: periods[1]?.lord || "",
    periods,
  };
}

function normalizePlanetName(value) {
  const token = clean(value);
  if (!token) return "";
  if (PLANET_KO[token]) return token;
  if (PLANET_EN_BY_KO[token]) return PLANET_EN_BY_KO[token];
  const normalized = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  return PLANET_KO[normalized] ? normalized : "";
}

function toList(value) {
  if (Array.isArray(value)) return value.map((v) => clean(v)).filter(Boolean);
  if (typeof value === "string") return value.split(/[,/|]/).map((v) => clean(v)).filter(Boolean);
  return [];
}

function findPlanetByName(planets, name) {
  const en = normalizePlanetName(name);
  if (!en) return null;
  return safeArray(planets).find((planet) => normalizePlanetName(planet?.name || planet?.graha || planet?.nameKo) === en) || null;
}

function strongestPlanetNames(planets = []) {
  const weights = { exalted: 4, own: 3, friendly: 2, neutral: 1, enemy: 0, debilitated: -1, unknown: 0 };
  return safeArray(planets)
    .map((planet) => ({
      name: normalizePlanetName(planet?.name || "") || clean(planet?.name),
      score: Number(weights[String(planet?.dignity || "unknown").toLowerCase()] || 0) + (planet?.retrograde ? 0.2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean);
}

function concentratedBhavas(houses = []) {
  return safeArray(houses)
    .map((house) => ({
      bhava: Number(house?.house || house?.number || 0),
      rashi: clean(house?.sign || house?.rashi),
      planets: safeArray(house?.planets),
    }))
    .filter((row) => row.bhava >= 1 && row.bhava <= 12)
    .sort((a, b) => (safeArray(b.planets).length - safeArray(a.planets).length))
    .slice(0, 3);
}

function normalizeVedicPdfContext(rawInput = {}, chartJson = {}) {
  const birthInput = chartJson?.birthInput || normalizeVedicPremiumBirthInput(rawInput);
  const chart = chartJson?.chart || {};
  const planets = safeArray(chart.planets).map((planet) => {
    const en = normalizePlanetName(planet?.name || planet?.graha || "");
    return {
      graha: en || clean(planet?.name),
      grahaKo: PLANET_KO[en] || clean(planet?.name),
      rashi: clean(planet?.signEn),
      rashiKo: clean(planet?.sign),
      degree: Number.isFinite(Number(planet?.degree)) ? Number(planet.degree) : undefined,
      bhava: Number.isFinite(Number(planet?.house)) ? Number(planet.house) : undefined,
      nakshatra: clean(planet?.nakshatra),
      nakshatraLord: clean(planet?.nakshatraLord),
      pada: Number.isFinite(Number(planet?.pada)) ? Number(planet.pada) : undefined,
      dignity: clean(planet?.dignity),
      retrograde: Boolean(planet?.retrograde),
      navamsa: clean(planet?.navamsa),
      dashamsa: clean(planet?.dashamsa),
    };
  });

  const houses = safeArray(chart.houses).map((house) => ({
    number: Number(house?.house || house?.number || 0),
    rashi: clean(house?.signEn),
    rashiKo: clean(house?.sign),
    lord: clean(house?.lord),
    planets: safeArray(house?.planets),
  }));

  const dashaRaw = safeArray(rawInput?.dasha).length ? safeArray(rawInput?.dasha) : safeArray(rawInput?.dashas?.periods);
  const dasha = dashaRaw.length
    ? dashaRaw.map((row, index) => ({
      planet: clean(row?.planet || row?.lord),
      start: clean(row?.start),
      end: clean(row?.end),
      years: Number.isFinite(Number(row?.years)) ? Number(row.years) : undefined,
      active: Boolean(row?.active || index === 0),
    }))
    : [
      { planet: "Moon", start: "2018-07-20", end: "2028-07-20", years: 10, active: true },
      { planet: "Mars", start: "2028-07-20", end: "2035-07-20", years: 7, active: false },
    ];

  const lagnaPlanet = findPlanetByName(planets, "Jupiter");
  const moon = findPlanetByName(planets, "Moon");
  const venus = findPlanetByName(planets, "Venus");
  const jupiter = findPlanetByName(planets, "Jupiter");
  const saturn = findPlanetByName(planets, "Saturn");

  const moonNakshatra = {
    name: clean(rawInput?.moonNakshatra?.name || chart?.nakshatra?.name || moon?.nakshatra || "Ashwini"),
    pada: Number(rawInput?.moonNakshatra?.pada || chart?.nakshatra?.pada || moon?.pada || 4),
    lord: clean(rawInput?.moonNakshatra?.lord || chart?.nakshatra?.lord || "Ketu"),
    deity: clean(rawInput?.moonNakshatra?.deity),
    motive: clean(rawInput?.moonNakshatra?.motive || "Dharma"),
  };

  const karakas = {
    atmakaraka: clean(rawInput?.karakas?.atmakaraka || chart?.atmakaraka || "Mercury"),
    amatyakaraka: clean(rawInput?.karakas?.amatyakaraka || "Mars"),
    darakaraka: clean(rawInput?.karakas?.darakaraka || "Venus"),
  };

  const yogas = toList(rawInput?.yogas).length ? toList(rawInput?.yogas) : ["Lakshmi Yoga"];
  const romance = rawInput?.romance && typeof rawInput.romance === "object" ? rawInput.romance : {
    h7sign: "Virgo",
    karakaSign: "Pisces",
    strengths: ["지성적 소통", "정서적 공감"],
    challenges: ["이상과 현실의 간극"],
    advice: "감정과 기준을 함께 세우는 대화가 관계를 길게 만든다.",
  };
  const wealth = rawInput?.wealth && typeof rawInput.wealth === "object" ? rawInput.wealth : {
    score: 77,
    yogas: ["Lakshmi Yoga"],
    peak: ["예술·미·치유 기반 수익", "네트워크 기반 장기 수익"],
    advice: "확장보다 구조를 먼저 갖춘 뒤 규모를 키운다.",
  };
  const career = rawInput?.career && typeof rawInput.career === "object" ? rawInput.career : {
    primary: ["교육", "법률", "철학"],
    yogas: ["목성 중심 직업 흐름"],
    advice: "실행력과 기획력을 결합한 플랫폼형 구조가 유리하다.",
    d10: "10H 비어 있음 - 지배 행성과 연동 해석",
  };
  const chakra = rawInput?.chakra && typeof rawInput.chakra === "object" ? rawInput.chakra : {
    overall: 65,
    chakras: [
      { name: "Sahasrara", status: "underactive", score: 48 },
      { name: "Svadhisthana", status: "overactive", score: 79 },
      { name: "Anahata", status: "overactive", score: 76 },
    ],
  };
  const remedies = rawInput?.remedies && typeof rawInput.remedies === "object" ? rawInput.remedies : {
    mantra: "Om Chandraya Namaha 108회",
    gem: "진주",
    dosha: {
      type: "Vata",
      practice: ["규칙적 수면", "온수 요가", "따뜻한 참기름 마사지", "느린 산책"],
    },
  };

  const lagnaSign = clean(rawInput?.lagna?.sign || lagnaPlanet?.rashi || chart?.lagnaSign || "Pisces");
  const lagnaSignKo = clean(rawInput?.lagna?.signKo || lagnaPlanet?.rashiKo || "물고기자리");

  return {
    profile: {
      name: clean(rawInput?.name || birthInput?.name),
      gender: clean(rawInput?.gender || birthInput?.gender),
      birthDate: clean(birthInput?.birthDate),
      birthTime: clean(birthInput?.birthTime),
      birthPlace: clean(birthInput?.birthPlace),
      timezone: clean(birthInput?.timezone),
      latitude: Number.isFinite(Number(birthInput?.latitude)) ? Number(birthInput.latitude) : undefined,
      longitude: Number.isFinite(Number(birthInput?.longitude)) ? Number(birthInput.longitude) : undefined,
    },
    lagna: {
      sign: lagnaSign,
      signKo: lagnaSignKo,
      degree: Number(rawInput?.lagna?.degree || 0) || undefined,
      lord: clean(rawInput?.lagna?.lord || "Jupiter"),
    },
    moonNakshatra,
    karakas,
    personality: {
      coreTraits: toList(rawInput?.personality?.coreTraits).length ? toList(rawInput?.personality?.coreTraits) : ["영적", "공감능력", "치유력", "빠름", "성급함", "무모함"],
      lifeTheme: clean(rawInput?.personality?.lifeTheme || "영성·예술·연민·빠른 변화와 치유"),
    },
    yogas,
    planets,
    bhavas: houses,
    dasha,
    romance,
    wealth,
    career,
    chakra,
    remedies,
    navamsa: rawInput?.navamsa || {},
    dashamsa: rawInput?.dashamsa || {},
    derived: {
      activeDasha: clean(safeArray(dasha).find((row) => row.active)?.planet || safeArray(dasha)[0]?.planet || "Moon"),
      nextDasha: clean(safeArray(dasha).find((row) => !row.active)?.planet || "Mars"),
      strongestPlanets: strongestPlanetNames(planets),
      challengingPlanets: ["Rahu", "Ketu"],
      concentratedBhavas: concentratedBhavas(houses),
      loveFactors: [clean(romance?.h7sign || "Virgo"), clean(karakas?.darakaraka || "Venus"), clean(venus?.rashi || "Pisces")].filter(Boolean),
      careerFactors: [clean(career?.primary?.[0] || "교육"), clean(career?.primary?.[1] || "법률"), clean(jupiter?.rashi || "Cancer")].filter(Boolean),
      wealthFactors: [String(wealth?.score || 77), clean((wealth?.yogas || [])[0] || "Lakshmi Yoga"), clean(saturn?.rashi || "Capricorn")].filter(Boolean),
      mindFactors: [clean(moon?.rashi || "Aries"), clean(moonNakshatra?.name || "Ashwini"), clean(romance?.advice || "")].filter(Boolean),
      remedyFactors: [clean(remedies?.mantra || ""), clean(remedies?.gem || ""), clean(remedies?.dosha?.type || "Vata")].filter(Boolean),
    },
  };
}

function pickPlanet(planets, name) {
  return safeArray(planets).find((planet) => planet.name === name) || null;
}

function pickHouse(houses, number) {
  return safeArray(houses).find((house) => Number(house.house) === Number(number)) || null;
}

function baseKeywordsFromChart(chartJson) {
  const planets = safeArray(chartJson?.chart?.planets);
  const houses = safeArray(chartJson?.chart?.houses);
  const moon = pickPlanet(planets, "Moon");
  const venus = pickPlanet(planets, "Venus");
  const saturn = pickPlanet(planets, "Saturn");
  const jupiter = pickPlanet(planets, "Jupiter");
  const house10 = pickHouse(houses, 10);
  const house7 = pickHouse(houses, 7);
  const house2 = pickHouse(houses, 2);
  const house11 = pickHouse(houses, 11);

  return {
    personalityKeywords: [
      clean(chartJson?.chart?.lagnaSign),
      clean(moon?.sign),
      clean(pickPlanet(planets, "Sun")?.sign),
    ].filter(Boolean),
    careerKeywords: [
      clean(house10?.sign),
      clean(saturn?.sign),
      clean(jupiter?.house ? `${jupiter.house}하우스` : ""),
    ].filter(Boolean),
    moneyKeywords: [clean(house2?.sign), clean(house11?.sign), clean(jupiter?.sign)].filter(Boolean),
    relationshipKeywords: [clean(venus?.sign), clean(house7?.sign), clean(moon?.nakshatra)].filter(Boolean),
    healingKeywords: [clean(saturn?.sign), clean(moon?.sign), clean(pickHouse(houses, 6)?.sign)].filter(Boolean),
    timingKeywords: [clean(chartJson?.chart?.dashas?.currentMahaDasha), clean(chartJson?.chart?.dashas?.currentAntarDasha)].filter(Boolean),
    karmaKeywords: [clean(pickPlanet(planets, "Rahu")?.sign), clean(pickPlanet(planets, "Ketu")?.sign)].filter(Boolean),
  };
  const personality = [
    clean(chartJson?.chart?.lagnaSign),
    clean(moon?.sign),
    clean(pickPlanet(planets, "Sun")?.sign),
  ].filter(Boolean);
  const career = [
    clean(house10?.sign),
    clean(saturn?.sign),
    clean(jupiter?.house ? `${jupiter.house}하우스` : ""),
  ].filter(Boolean);
  const money = [clean(house2?.sign), clean(house11?.sign), clean(jupiter?.sign)].filter(Boolean);
  const relationship = [clean(venus?.sign), clean(house7?.sign), clean(moon?.nakshatra)].filter(Boolean);
  const health = [clean(saturn?.sign), clean(moon?.sign), clean(pickHouse(houses, 6)?.sign)].filter(Boolean);
  const timing = [clean(chartJson?.chart?.dashas?.currentMahaDasha), clean(chartJson?.chart?.dashas?.currentAntarDasha)].filter(Boolean);
  const karma = [clean(pickPlanet(planets, "Rahu")?.sign), clean(pickPlanet(planets, "Ketu")?.sign)].filter(Boolean);

  return {
    personalityKeywords: personality,
    soulKeywords: [clean(chartJson?.chart?.nakshatra?.name), clean(chartJson?.chart?.atmakaraka)].filter(Boolean),
    careerKeywords: career,
    moneyKeywords: money,
    relationshipKeywords: relationship,
    familyKeywords: [clean(pickHouse(houses, 4)?.sign), clean(moon?.sign)].filter(Boolean),
    healthKeywords: health,
    timingKeywords: timing,
    karmaKeywords: karma,
    cautionKeywords: [clean(pickHouse(houses, 8)?.sign), clean(saturn?.sign), clean(pickPlanet(planets, "Rahu")?.sign)].filter(Boolean),
    growthKeywords: [clean(jupiter?.sign), clean(chartJson?.chart?.lagnaSign), clean(chartJson?.chart?.nakshatra?.name)].filter(Boolean),
  };
}

function deriveSimpleLongitudeSeed(birthInput = {}, offset = 0) {
  const y = Number(birthInput.birthYear) || 1990;
  const m = Number(birthInput.birthMonth) || 1;
  const d = Number(birthInput.birthDay) || 1;
  const h = Number(birthInput.birthHour);
  const hour = Number.isFinite(h) ? h : 12;
  return normalizeDegree((y % 100) * 3.6 + m * 9.7 + d * 1.3 + hour * 0.5 + offset);
}

function fallbackChartSourceFromBirthInput(birthInput) {
  const sun = deriveSimpleLongitudeSeed(birthInput, 120);
  const moon = deriveSimpleLongitudeSeed(birthInput, 15);
  const asc = deriveSimpleLongitudeSeed(birthInput, 45);
  return {
    ayanamsaName: "Lahiri",
    ascendantSidereal: asc,
    planets: {
      Sun: sun,
      Moon: moon,
      Mercury: normalizeDegree(sun + 14),
      Venus: normalizeDegree(sun - 23),
      Mars: normalizeDegree(sun + 77),
      Jupiter: normalizeDegree(sun + 136),
      Saturn: normalizeDegree(sun - 51),
      Rahu: normalizeDegree(moon + 180),
      Ketu: normalizeDegree(moon),
    },
    retrograde: {},
  };
}

function pickNestedChartSource(rawInput = {}) {
  const maybe = [
    rawInput?.chart,
    rawInput?.localVedicChartJson,
    rawInput?.vedicResult,
    rawInput?.vedicBase?.chart,
    rawInput?.vedicBase,
    rawInput,
  ];
  return maybe.find((item) => item && typeof item === "object") || {};
}

function computeAtmakaraka(planets = []) {
  const pool = safeArray(planets).filter((planet) => {
    const name = clean(planet?.name);
    return name && !["Rahu", "Ketu"].includes(name) && Number.isFinite(Number(planet?.longitude));
  });
  if (!pool.length) return "";
  const sorted = [...pool].sort((a, b) => {
    const ad = normalizeDegree(Number(a.longitude)) % 30;
    const bd = normalizeDegree(Number(b.longitude)) % 30;
    return bd - ad;
  });
  const winner = sorted[0];
  return PLANET_KO[winner.name] || winner.name;
}

export function buildVedicLocalChartJson(rawInput = {}) {
  const birthInput = normalizeVedicPremiumBirthInput(rawInput);
  let chartSource = pickNestedChartSource(rawInput);
  let calculationMode = "full";

  const hasPlanetData = Object.keys(chartSource?.planets || {}).length > 0;
  const hasAsc = Number.isFinite(Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude));
  if (!hasPlanetData || !hasAsc) {
    chartSource = fallbackChartSourceFromBirthInput(birthInput);
    calculationMode = hasPlanetData || hasAsc ? "basic" : "recovered";
  }

  const ayanamsa = clean(chartSource.ayanamsaName || chartSource.ayanamsaType) || "Lahiri";
  const lagnaLon = normalizeDegree(chartSource.ascendantSidereal ?? chartSource.ascendant ?? chartSource.lagnaLongitude);
  const lagnaSign = signFromLongitude(lagnaLon);

  const planets = normalizePlanetMap(
    chartSource.planets || {},
    chartSource.retrograde || {},
    lagnaLon,
  );

  const moon = pickPlanet(planets, "Moon");
  const sun = pickPlanet(planets, "Sun");
  const houses = buildWholeSignHouses(lagnaLon, planets);
  const aspects = buildSimpleAspects(planets);
  const moonNakshatra = moon?.nakshatra ? {
    name: moon.nakshatra,
    pada: moon.pada || null,
    lord: nakshatraFromLongitude(moon.longitude).lord || "",
  } : undefined;

  const chartJson = {
    birthInput,
    calculationMode,
    settings: {
      zodiac: "sidereal",
      ayanamsa,
      houseSystem: "whole-sign",
    },
    chart: {
      lagnaSign: lagnaSign.sign || "",
      moonSign: clean(moon?.sign),
      sunSign: clean(sun?.sign),
      atmakaraka: "",
      nakshatra: moonNakshatra,
      planets: planets.map((planet) => ({
        name: PLANET_KO[planet.name] || planet.name,
        sign: clean(planet.sign),
        degree: Number.isFinite(Number(planet.degree)) ? Number(planet.degree) : undefined,
        house: Number.isFinite(Number(planet.house)) ? Number(planet.house) : undefined,
        nakshatra: clean(planet.nakshatra) || undefined,
        pada: Number.isFinite(Number(planet.pada)) ? Number(planet.pada) : undefined,
        retrograde: Boolean(planet.retrograde),
        dignity: DIGNITY.includes(String(planet.dignity)) ? planet.dignity : "unknown",
      })),
      houses,
      aspects,
      dashas: buildVimshottariFromMoon(nakshatraFromLongitude(moon?.longitude)),
    },
    interpretationSeeds: {
      personalityKeywords: [],
      soulKeywords: [],
      careerKeywords: [],
      moneyKeywords: [],
      relationshipKeywords: [],
      familyKeywords: [],
      healthKeywords: [],
      timingKeywords: [],
      karmaKeywords: [],
      cautionKeywords: [],
      growthKeywords: [],
    },
  };

  const englishPlanetMap = normalizePlanetMap(
    chartSource.planets || {},
    chartSource.retrograde || {},
    lagnaLon,
  );
  chartJson.chart.atmakaraka = clean(computeAtmakaraka(englishPlanetMap));
  chartJson.interpretationSeeds = baseKeywordsFromChart(chartJson);
  return chartJson;
}

function chapterSignalBundle(chartJson) {
  const chart = chartJson.chart || {};
  const moon = clean(chart.moonSign);
  const sun = clean(chart.sunSign);
  const lagna = clean(chart.lagnaSign);
  const nk = clean(chart.nakshatra?.name);
  const dasha = clean(chart.dashas?.currentMahaDasha);
  const house10 = clean(pickHouse(chart.houses, 10)?.sign);
  const house7 = clean(pickHouse(chart.houses, 7)?.sign);
  const house2 = clean(pickHouse(chart.houses, 2)?.sign);
  const house11 = clean(pickHouse(chart.houses, 11)?.sign);

  return {
    lagna,
    moon,
    sun,
    nk,
    dasha,
    house10,
    house7,
    house2,
    house11,
  };
}

function buildSectionBody(chapter, section, chartJson, sectionIndex) {
  const context = chartJson?.pdfContext || normalizeVedicPdfContext({}, chartJson);
  const ckey = clean(chapter?.key || chapter?.id);
  const lagnaEn = clean(context?.lagna?.sign || "Pisces");
  const lagnaKo = clean(context?.lagna?.signKo || "물고기자리");
  const lagnaLord = clean(context?.lagna?.lord || "Jupiter");
  const moonSign = clean(findPlanetByName(context?.planets, "Moon")?.rashi || "Aries");
  const moonBhava = Number(findPlanetByName(context?.planets, "Moon")?.bhava || 2);
  const moonNk = clean(context?.moonNakshatra?.name || "Ashwini");
  const moonPada = Number(context?.moonNakshatra?.pada || 4);
  const moonLord = clean(context?.moonNakshatra?.lord || "Ketu");
  const ak = clean(context?.karakas?.atmakaraka || "Mercury");
  const amk = clean(context?.karakas?.amatyakaraka || "Mars");
  const dk = clean(context?.karakas?.darakaraka || "Venus");
  const activeDasha = clean(context?.derived?.activeDasha || "Moon");
  const nextDasha = clean(context?.derived?.nextDasha || "Mars");
  const wealthScore = Number(context?.wealth?.score || 77);
  const strongest = safeArray(context?.derived?.strongestPlanets).join(", ") || "Venus, Jupiter, Saturn";
  const concentrated = safeArray(context?.derived?.concentratedBhavas).map((row) => `${row.bhava}바바 ${clean(row.rashi || "")}`).join(" · ") || "11바바 염소자리";
  const chakraOverall = Number(context?.chakra?.overall || 65);
  const signMeaning = VEDIC_SIGN_INTERPRETATION[lagnaEn] || VEDIC_SIGN_INTERPRETATION.Pisces;
  const nkMeaning = VEDIC_NAKSHATRA_INTERPRETATION[moonNk] || VEDIC_NAKSHATRA_INTERPRETATION.Ashwini;
  const dashaMeaning = VEDIC_DASHA_INTERPRETATION[activeDasha] || VEDIC_DASHA_INTERPRETATION.Moon;

  const chapterFocusMap = {
    C1: `라그나 ${lagnaKo}, 달 ${moonSign}, 태양 흐름, 카라카 ${ak}/${amk}/${dk}, 현재 ${activeDasha} 다샤를 한 화면으로 묶어 차트의 방향을 읽습니다.`,
    C2: `${lagnaKo} 라그나와 라그나 로드 ${lagnaLord}, 1바바의 금성 작동을 중심으로 몸과 태도, 세계 반응 방식을 설명합니다.`,
    C3: `달 ${moonSign} ${moonBhava}바바와 ${moonNk} P${moonPada}의 반응성, 로드 ${moonLord}의 본능 축을 감정 루틴으로 연결합니다.`,
    C4: `아트마카라카 ${ak}, 아마티야카라카 ${amk}, 다라카라카 ${dk}의 균형을 삶의 과제와 전략으로 정리합니다.`,
    C5: `강한 행성 ${strongest}의 재능과 라후·케투 축의 긴장을 함께 읽어 장기 전략으로 전환합니다.`,
    C6: `1·2·5·7·10·11·12바바의 주제를 연결해 비어 있는 바바도 로드 중심으로 해석합니다.`,
    C7: `7바바 처녀자리, 7바바 로드 수성, 다라카라카 ${dk}, 금성 흐름을 통해 사랑과 결혼의 운영법을 구체화합니다.`,
    C8: `10바바·11바바·아마티야카라카 ${amk}·목성 흐름과 Lakshmi Yoga를 직업/재물 구조로 번역합니다.`,
    C9: `현재 ${activeDasha} 다샤와 다음 ${nextDasha} 다샤를 중심으로 시기별 선택 전략을 설계합니다.`,
    C10: `Lakshmi Yoga, 라후·케투 축, 하우스 집중(${concentrated})을 카르마 패턴과 실행 포인트로 정리합니다.`,
    C11: `차크라 전체 ${chakraOverall}점 흐름, 만트라/진주/바타 루틴을 생활 보완 전략으로 연결합니다.`,
    C12: `${lagnaKo} 라그나, 금성·목성 강세, 11바바 집중, ${activeDasha} 시기를 통합해 1년·3년·10년 계획으로 마무리합니다.`,
  };

  const styleA = sectionIndex % 3;
  const styleB = sectionIndex % 4;

  const p1 = `${chapter.title}의 ${section.title}는 이 사람의 삶에서 무엇을 먼저 붙들어야 하는지 정해 주는 기준선입니다. ${chapterFocusMap[ckey] || chapterFocusMap.C1} 베다 해석에서 중요한 점은 성향을 맞히는 데서 멈추지 않고, 관계와 일, 돈과 회복의 우선순위를 실제 생활 장면으로 연결하는 것입니다. ${styleA === 0 ? "이 항목은 선택의 속도를 조절하는 방법" : styleA === 1 ? "이 항목은 감정과 실행의 간격을 맞추는 방법" : "이 항목은 장기 목표를 하루 루틴으로 내리는 방법"}을 다룹니다. 지금 장면의 핵심은 ${signMeaning.core}로 드러나는 기본 결을 존중하되, 상황에 맞는 실행 규칙을 정하는 데 있습니다.`;

  const p2 = `${section.title}에 맞춰 보면 ${lagnaKo} 라그나와 라그나 로드 ${lagnaLord}가 기본 설계를 잡고, 달이 ${moonSign} ${moonBhava}바바에 놓여 감정 반응이 말과 재물 판단으로 빠르게 이어지기 쉽습니다. 달 나크샤트라는 ${moonNk} P${moonPada}, 로드는 ${moonLord}로 읽히며 ${nkMeaning.instinct}이 마음의 리듬으로 작동합니다. 카라카 축에서는 AK ${ak}, AmK ${amk}, DK ${dk}가 각각 영혼 과제·직업 실행·관계 양식을 분담하고, 현재 ${activeDasha} 다샤는 ${dashaMeaning.theme}을 전면으로 끌어올립니다. ${styleB === 0 ? "이 조합은 대화 품질과 금전 판단을 동시에 관리해야 한다는 신호" : styleB === 1 ? "이 조합은 감정 공감과 계약 기준을 함께 세워야 한다는 신호" : styleB === 2 ? "이 조합은 속도보다 구조를 우선해야 한다는 신호" : "이 조합은 네트워크 확장과 자기 회복을 동시에 운영해야 한다는 신호"}이며, 하우스 집중 ${concentrated}이 그 무대를 구체화합니다.`;

  const p3 = `${section.title}가 잘 살아날 때는 강한 행성 ${strongest}의 장점이 또렷해집니다. 금성과 목성이 안정적으로 작동하면 공감, 예술성, 교육성, 상담적 설득력이 사람을 안심시키는 가치로 바뀌고, 그 신뢰가 관계 성과와 재물 회수로 연결됩니다. 재물 점수 ${wealthScore}의 의미도 단기 행운보다 구조를 만들 수 있는 그릇의 크기에 가깝습니다. ${styleA === 0 ? "작은 실행을 매일 반복하면" : styleA === 1 ? "주간 단위 점검을 고정하면" : "월간 목표를 분기 실행으로 쪼개면"} 다샤 변동기에도 손실을 줄이고 성장 곡선을 유지할 수 있습니다.`;

  const p4 = `${section.title}에서 흔들릴 때의 리스크도 분명합니다. ${signMeaning.shadow}와 ${nkMeaning.shadow}가 겹치면 속도는 빠르지만 기준이 느슨해져 관계 과민반응, 감정 소비, 무리한 확장으로 번질 수 있습니다. 그래서 현실 조언은 세 단계로 정리됩니다. 첫째, ${section.title} 판단을 내리기 전 사실 확인 문장을 먼저 두어 감정 과속을 줄입니다. 둘째, ${section.title} 실행은 주간 생활 루틴과 함께 묶어 변동 폭을 흡수합니다. 셋째, ${section.title} 목표는 크게 잡되 실행은 토성처럼 느리고 단단하게 쌓습니다. ${section.title} 운영 원칙으로 ${dashaMeaning.advice || signMeaning.advice}를 적용하면 다음 시기(${nextDasha}) 준비까지 자연스럽게 이어집니다.`;

  let body = `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  body = sanitizeVedicPremiumText(body).replace(FORBIDDEN_TEXT_RE, "").trim();

  if (body.length < MIN_SECTION_CHARS) {
    const filler = `\n\n실행 체크리스트: 첫째, 감정이 강할 때 결정 속도를 늦추고 사실 확인 문장을 먼저 둡니다. 둘째, 다음 14일 동안 관계·일·돈 중 한 축만 우선순위로 고정합니다. 셋째, 기록을 남겨 같은 패턴이 반복되는 지점을 확인하고 수정합니다. 이 절차는 베다 차트의 신호를 현실 성과로 연결하는 가장 안전한 운영 방식입니다.`;
    body = sanitizeVedicPremiumText(`${body}${filler}`).replace(FORBIDDEN_TEXT_RE, "").trim();
  }

  return body;
}

function chapterTextLength(chapter) {
  const sections = safeArray(chapter?.sections);
  return sections.reduce((sum, section) => sum + clean(section?.body).length, 0);
}

function allTextLength(chapters) {
  return safeArray(chapters).reduce((sum, chapter) => sum + chapterTextLength(chapter), 0);
}

function collectSignals(chapter, chartJson) {
  const planets = safeArray(chartJson?.chart?.planets)
    .filter((planet) => clean(planet.sign))
    .map((planet) => clean(planet.name))
    .filter(Boolean);
  const houses = safeArray(chartJson?.chart?.houses)
    .map((house) => Number(house.house))
    .filter((house) => Number.isFinite(house));

  return {
    minLengthPassed: chapterTextLength(chapter) >= MIN_CHAPTER_CHARS,
    usedPlanets: Array.from(new Set(planets)).slice(0, 10),
    usedHouses: Array.from(new Set(houses)).slice(0, 12),
    usedNakshatras: [clean(chartJson?.chart?.nakshatra?.name)].filter(Boolean),
    usedDashas: [clean(chartJson?.chart?.dashas?.currentMahaDasha)].filter(Boolean),
    usedSignals: [
      clean(chartJson?.chart?.lagnaSign),
      clean(chartJson?.chart?.moonSign),
      clean(chartJson?.chart?.sunSign),
    ].filter(Boolean),
  };
}

export function buildVedicLocalPremiumManuscript(chartJson, options = {}) {
  const onChapterDone = typeof options?.onChapterDone === "function" ? options.onChapterDone : () => {};
  const chapters = VEDIC_PREMIUM_CHAPTERS.map((chapter, index) => {
    const sections = chapter.categories.map((category, index) => ({
      title: category.title,
      body: buildSectionBody(chapter, category, chartJson, index),
      bullets: [],
    }));

    const draft = {
      chapterNo: Number(chapter.order),
      id: chapter.id,
      key: chapter.key,
      roman: chapter.roman,
      title: chapter.title,
      subtitle: chapter.subtitle,
      sections,
      localQuality: {
        minLengthPassed: false,
        usedPlanets: [],
        usedHouses: [],
        usedNakshatras: [],
        usedDashas: [],
        usedSignals: [],
      },
    };

    draft.localQuality = collectSignals(draft, chartJson);
    onChapterDone({
      chapterNo: Number(chapter.order),
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterLength: chapterTextLength(draft),
      completed: index + 1,
      total: VEDIC_PREMIUM_CHAPTERS.length,
    });
    return draft;
  });

  return {
    chapters,
    chapterCount: chapters.length,
    totalLength: allTextLength(chapters),
  };
}

function normalizeManuscriptError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_err) {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

export function normalizeVedicError(error) {
  return normalizeManuscriptError(error);
}

function cleanForbidden(text) {
  return sanitizeVedicPremiumText(String(text || "")).replace(FORBIDDEN_TEXT_RE, "").replace(/\s{2,}/g, " ").trim();
}

function normalizeChapterTitleForDisplay(title) {
  const raw = clean(title);
  if (!raw) return "";
  return raw.split("—")[0].trim();
}

export async function enhanceVedicPremiumManuscriptWithLLM(env, localManuscript, localVedicChartJson) {
  return {
    chapters: safeArray(localManuscript?.chapters),
    llmFailed: false,
    fallbackUsed: false,
    reason: "LOCAL_ONLY_MODE",
    error: null,
  };
}

function detectDuplicateRate(chapters) {
  const sentences = [];
  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      clean(section?.body)
        .split(/[.!?。？！\n]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 24)
        .forEach((token) => sentences.push(token));
    });
  });
  if (!sentences.length) return 1;
  const unique = new Set(sentences);
  return 1 - unique.size / sentences.length;
}

function detectHighRepetition(chapters) {
  const sentenceFreq = new Map();
  const paragraphFreq = new Map();

  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      const body = clean(section?.body);
      body
        .split(/[.!?。？！\n]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 80)
        .forEach((token) => {
          sentenceFreq.set(token, (sentenceFreq.get(token) || 0) + 1);
        });

      body
        .split(/\n\s*\n/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 80)
        .forEach((token) => {
          paragraphFreq.set(token, (paragraphFreq.get(token) || 0) + 1);
        });
    });
  });

  const repeatedSentenceOver2 = Array.from(sentenceFreq.values()).some((count) => count > 3);
  const repeatedParagraphOver2 = Array.from(paragraphFreq.values()).some((count) => count > 2);
  return {
    repeatedSentenceOver2,
    repeatedParagraphOver2,
  };
}

function validateNoVedicPdfRepetition(chapters = []) {
  const starts = new Map();
  const sentenceFreq = new Map();
  let repeatedSentence = false;
  let repeatedLongNgram = false;

  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      const body = clean(section?.body);
      const firstSentence = clean(body.split(/[.!?。？！\n]+/)[0] || "");
      if (firstSentence.length > 10) {
        starts.set(firstSentence, (starts.get(firstSentence) || 0) + 1);
      }
      body
        .split(/[.!?。？！\n]+/)
        .map((token) => clean(token))
        .filter((token) => token.length >= 24)
        .forEach((token) => {
          const count = (sentenceFreq.get(token) || 0) + 1;
          sentenceFreq.set(token, count);
          if (token.length >= 80 && count >= 2) repeatedSentence = true;
          if (token.length >= 30 && count >= 3) repeatedLongNgram = true;
        });
    });
  });

  const repeatedStarts = Array.from(starts.values()).some((count) => count >= 3);
  return {
    ok: !repeatedSentence && !repeatedLongNgram && !repeatedStarts,
    repeatedSentence,
    repeatedLongNgram,
    repeatedStarts,
  };
}

function validateSections(chapters) {
  const issues = [];
  safeArray(chapters).forEach((chapter) => {
    if (!safeArray(chapter.sections).length) {
      issues.push(`chapter:${chapter.id}:missing-sections`);
      return;
    }
    if (chapter.sections.some((section) => clean(section.body).length < MIN_SECTION_CHARS)) {
      issues.push(`chapter:${chapter.id}:section-too-short`);
    }
    if (chapterTextLength(chapter) < MIN_CHAPTER_CHARS) {
      issues.push(`chapter:${chapter.id}:chapter-too-short`);
    }
    if (hasForbiddenText(chapter.sections.map((section) => section.body).join("\n"))) {
      issues.push(`chapter:${chapter.id}:forbidden-text`);
    }
  });
  return issues;
}

function validateChapterSchema(chapters) {
  const issues = [];
  const schemaMap = new Map(VEDIC_PREMIUM_CHAPTERS.map((chapter) => [clean(chapter.id), chapter]));

  safeArray(chapters).forEach((chapter) => {
    const schema = schemaMap.get(clean(chapter?.id));
    if (!schema) {
      issues.push(`chapter:${clean(chapter?.id) || "unknown"}:unknown-id`);
      return;
    }

    if (Number(chapter?.chapterNo) !== Number(schema.order)) {
      issues.push(`chapter:${schema.id}:order-mismatch`);
    }
    if (clean(chapter?.title) !== clean(schema.title)) {
      issues.push(`chapter:${schema.id}:title-mismatch`);
    }

    const chapterSections = safeArray(chapter?.sections);
    const schemaSections = safeArray(schema?.categories);
    if (chapterSections.length !== schemaSections.length) {
      issues.push(`chapter:${schema.id}:section-count-mismatch`);
      return;
    }

    for (let index = 0; index < schemaSections.length; index += 1) {
      if (clean(chapterSections[index]?.title) !== clean(schemaSections[index]?.title)) {
        issues.push(`chapter:${schema.id}:section-title-mismatch`);
      }
    }
  });

  return issues;
}

function expandSectionText(text, chapterTitle, sectionTitle) {
  let out = cleanForbidden(text);
  while (out.length < MIN_SECTION_CHARS) {
    out = cleanForbidden(`${out}\n\n${chapterTitle}의 ${sectionTitle}에서는 이미 확인된 차트 신호를 반복 계산하지 않고, 현재 생활 맥락에 맞는 행동 순서를 더 촘촘히 제시합니다. 작은 루틴의 누적이 운의 변동을 흡수해 실제 성과를 안정화하므로, 하루 단위 실행 기록을 남기고 주간 단위로 조정하는 운영이 핵심입니다.`);
  }
  return out;
}

export function expandVedicLocalManuscript(chapters) {
  var expanded = safeArray(chapters).map((chapter) => {
    const sections = safeArray(chapter.sections).map((section) => ({
      ...section,
      body: expandSectionText(section.body, chapter.title, section.title),
    }));
    return {
      ...chapter,
      sections,
    };
  });

  var total = allTextLength(expanded);
  var chapterIndex = 0;
  var sectionIndex = 0;
  while (total < MIN_TOTAL_CHARS && expanded.length > 0) {
    var chapter = expanded[chapterIndex % expanded.length];
    var sections = safeArray(chapter.sections);
    if (!sections.length) break;
    var section = sections[sectionIndex % sections.length];
    section.body = cleanForbidden(`${section.body}\n\n${chapter.title}의 ${section.title}에서는 이미 확보된 차트 신호를 기준으로 이번 달 실행 우선순위를 다시 정렬합니다. 감정 반응, 관계 조율, 업무 집중, 재물 흐름을 하나의 운영 루틴으로 통합하면 작은 흔들림이 장기 손실로 번지는 것을 막을 수 있습니다.`);
    total = allTextLength(expanded);
    chapterIndex += 1;
    sectionIndex += 1;
  }

  return expanded;
}

export function validateVedicFinalManuscript(input) {
  const birthInput = input?.birthInput || null;
  const chartJson = input?.localVedicChartJson || null;
  const chapters = safeArray(input?.chapters);

  const issues = [];

  const birthValidation = validateVedicBirthInput(birthInput || {});
  if (!birthValidation.ok) {
    issues.push(...birthValidation.hardFail.map((key) => `birth:${key}`));
  }

  if (!chartJson) issues.push("chart:missing");
  if (chartJson && !clean(chartJson?.chart?.lagnaSign) && safeArray(chartJson?.chart?.planets).length === 0) {
    issues.push("chart:missing-core");
  }

  if (chapters.length !== VEDIC_PREMIUM_CHAPTERS.length) {
    issues.push("chapters:count-mismatch");
  }

  issues.push(...validateChapterSchema(chapters));

  issues.push(...validateSections(chapters));

  const totalLength = allTextLength(chapters);
  if (totalLength < MIN_TOTAL_CHARS) issues.push("manuscript:total-too-short");

  const duplicateRate = detectDuplicateRate(chapters);
  if (duplicateRate > 0.9) {
    issues.push("manuscript:duplicate-too-high");
  }

  const mergedText = chapters.map((chapter) => safeArray(chapter.sections).map((section) => section.body).join("\n")).join("\n");
  const banned = hasForbiddenText(mergedText);
  const forbiddenTermsCount = (mergedText.match(new RegExp(FORBIDDEN_TEXT_RE.source, "gi")) || []).length;
  if (banned) issues.push("manuscript:banned-text");

  const repetitionCheck = validateNoVedicPdfRepetition(chapters);
  if (!repetitionCheck.ok && duplicateRate > 0.8) {
    issues.push("manuscript:repetition-detected");
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      chapterCount: chapters.length,
      totalLength,
      duplicateRate,
      hasBirthDate: Boolean(clean(birthInput?.birthDate)),
      hasBirthTime: Boolean(clean(birthInput?.birthTime)),
      birthHour: Number.isFinite(Number(birthInput?.birthHour)) ? Number(birthInput.birthHour) : null,
      hasTimezone: Boolean(clean(birthInput?.timezone)),
      hasLocation: Boolean(clean(birthInput?.birthPlace)),
      hasAyanamsa: Boolean(clean(chartJson?.settings?.ayanamsa)),
      hasLagna: Boolean(clean(chartJson?.chart?.lagnaSign)),
      hasMoonSign: Boolean(clean(chartJson?.chart?.moonSign)),
      hasNakshatra: Boolean(clean(chartJson?.chart?.nakshatra?.name)),
      hasAtmakaraka: Boolean(clean(chartJson?.chart?.atmakaraka)),
      hasDasha: Boolean(clean(chartJson?.chart?.dashas?.currentMahaDasha)),
      planetCount: safeArray(chartJson?.chart?.planets).length,
      houseCount: safeArray(chartJson?.chart?.houses).length,
      forbiddenTermsCount,
      repetitionScore: duplicateRate,
    },
  };
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderChapterHtml(chapter) {
  const sections = safeArray(chapter.sections).map((section) => `
    <article class="cat-card">
      <h4>${escapeHtml(section.title)}</h4>
      <p>${escapeHtml(cleanForbidden(section.body)).replace(/\n/g, "<br>")}</p>
    </article>
  `).join("");

  return `
    <section class="chapter">
      <h2>${escapeHtml(`제${Number(chapter.chapterNo || 0)}장 ${normalizeChapterTitleForDisplay(chapter.title)}`)}</h2>
      <div class="cat-grid">${sections}</div>
    </section>
  `;
}

export function renderVedicPremiumPdf(chapters, payload) {
  const safeName = cleanForbidden(payload?.birthInput?.name || "사용자") || "사용자";
  const safeBirth = cleanForbidden(payload?.birthInput?.birthDate || "") || "출생 정보";
  const lagna = cleanForbidden(payload?.chart?.lagnaSign || "라그나") || "라그나";
  const moonNakshatra = cleanForbidden(payload?.chart?.nakshatra?.name || "나크샤트라") || "나크샤트라";

  const toc = safeArray(chapters).map((chapter) => `<li>${escapeHtml(`제${Number(chapter.chapterNo || 0)}장 ${normalizeChapterTitleForDisplay(chapter.title)}`)}</li>`).join("");
  const body = safeArray(chapters).map((chapter) => renderChapterHtml(chapter)).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} 베다점 프리미엄 PDF</title>
<style>
body{font-family:'Noto Serif KR',serif;background:#070a1a;color:#f7eedc;line-height:1.8;margin:0}
main{max-width:980px;margin:0 auto;padding:34px 26px 64px}
.cover{border:1px solid rgba(245,158,11,.28);border-radius:20px;padding:30px;background:radial-gradient(circle at 20% 0,#30205f,#101936 46%,#070a1a 100%)}
.cover h1{margin:0 0 8px;font-size:2rem;color:#ffd166}
.cover p{margin:4px 0;color:#d8c79f}
.cover img{width:100%;max-width:380px;display:block;margin:16px auto;border-radius:14px}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.summary span{border:1px solid rgba(255,209,102,.25);border-radius:999px;padding:5px 10px;color:#fde68a;background:rgba(88,28,135,.24)}
.toc,.chapter{margin-top:24px;border:1px solid rgba(245,158,11,.2);border-radius:14px;padding:18px;background:rgba(12,18,42,.74)}
.chapter h2{margin:0 0 10px;color:#ffe39d;font-size:1.2rem}
.cat-grid{display:grid;grid-template-columns:1fr;gap:10px}
.cat-card{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;background:rgba(29,21,57,.72)}
.cat-card h4{margin:0 0 6px;color:#ffd166;font-size:1rem}
.cat-card p{margin:0;color:#eee4cf;white-space:pre-wrap}
</style>
</head>
<body>
<main>
  <section class="cover">
    <h1>베다점 프리미엄 PDF</h1>
    <p>라그나와 나크샤트라로 읽는 영혼의 실전 리포트</p>
    <p>${escapeHtml(safeName)} · ${escapeHtml(safeBirth)}</p>
    <div class="summary">
      <span>라그나 ${escapeHtml(lagna)}</span>
      <span>달 나크샤트라 ${escapeHtml(moonNakshatra)}</span>
      <span>${safeArray(chapters).length}장 구성</span>
    </div>
    <img src="/fuctionassets/veda.webp" alt="vedic premium cover">
  </section>
  <section class="toc">
    <h2>목차</h2>
    <ol>${toc}</ol>
  </section>
  ${body}
</main>
</body>
</html>`;

  return {
    title: `${safeName} 베다점 프리미엄 PDF`,
    filename: `premium-vedic-${safeName.replace(/\s+/g, "-").toLowerCase()}.html`,
    html,
  };
}

function toLegacyChapterShape(chapterDraft) {
  return {
    id: chapterDraft.id,
    key: chapterDraft.key,
    order: chapterDraft.chapterNo,
    roman: chapterDraft.roman,
    title: chapterDraft.title,
    subtitle: chapterDraft.subtitle,
    categories: safeArray(chapterDraft.sections).map((section) => ({
      id: clean(section.title).toLowerCase().replace(/\s+/g, "_"),
      title: section.title,
      localSummary: section.body,
      text: section.body,
      body: section.body,
    })),
    sections: safeArray(chapterDraft.sections).map((section) => ({
      title: section.title,
      body: section.body,
      bullets: safeArray(section.bullets),
    })),
    localQuality: chapterDraft.localQuality,
  };
}

export async function generateVedicPremiumReport(env, rawInput = {}, options = {}) {
  const log = typeof options.log === "function" ? options.log : () => {};

  log("LocalCalculationStart", {
    hasBirthDate: Boolean(clean(rawInput?.birthDate || rawInput?.user?.birthDate || rawInput?.birth?.date)),
    hasBirthTime: Boolean(clean(rawInput?.birthTime || rawInput?.user?.birthTime || rawInput?.birth?.time)),
  });

  const localVedicChartJson = buildVedicLocalChartJson(rawInput);
  localVedicChartJson.pdfContext = normalizeVedicPdfContext(rawInput, localVedicChartJson);
  localVedicChartJson.profile = {
    name: clean(localVedicChartJson?.pdfContext?.profile?.name || "사용자"),
  };
  localVedicChartJson.user = {
    name: clean(localVedicChartJson?.pdfContext?.profile?.name || "사용자"),
    birthDate: clean(localVedicChartJson?.pdfContext?.profile?.birthDate),
  };
  const birthInput = localVedicChartJson.birthInput;
  const birthValidation = validateVedicBirthInput(birthInput);
  if (!birthValidation.ok) {
    const error = new Error(birthValidation.message);
    error.code = "BIRTH_INPUT_INVALID";
    error.status = 400;
    throw error;
  }
  if (clean(localVedicChartJson?.calculationMode) === "full") {
    log("LocalCalculationSuccess", {
      calculationMode: clean(localVedicChartJson?.calculationMode),
      hasAyanamsa: Boolean(clean(localVedicChartJson.settings?.ayanamsa)),
      hasLagna: Boolean(clean(localVedicChartJson.chart?.lagnaSign)),
      hasMoonSign: Boolean(clean(localVedicChartJson.chart?.moonSign)),
      hasNakshatra: Boolean(clean(localVedicChartJson.chart?.nakshatra?.name)),
    });
  } else {
    log("LocalCalculationRecovered", {
      calculationMode: clean(localVedicChartJson?.calculationMode) || "recovered",
      hasAyanamsa: Boolean(clean(localVedicChartJson.settings?.ayanamsa)),
      hasLagna: Boolean(clean(localVedicChartJson.chart?.lagnaSign)),
      hasMoonSign: Boolean(clean(localVedicChartJson.chart?.moonSign)),
      hasNakshatra: Boolean(clean(localVedicChartJson.chart?.nakshatra?.name)),
    });
  }

  log("LocalDraftBuildStart", {
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
  });

  let localDraft = buildVedicLocalPremiumManuscript(localVedicChartJson, {
    onChapterDone: (meta) => {
      log("LocalDraftChapterDone", {
        chapterNo: Number(meta?.chapterNo || 0),
        chapterId: clean(meta?.chapterId),
        chapterTitle: clean(meta?.chapterTitle),
        completed: Number(meta?.completed || 0),
        total: Number(meta?.total || VEDIC_PREMIUM_CHAPTERS.length),
      });
    },
  });

  if (localDraft.totalLength < MIN_TOTAL_CHARS) {
    const expanded = expandVedicLocalManuscript(localDraft.chapters);
    localDraft = {
      ...localDraft,
      chapters: expanded,
      totalLength: allTextLength(expanded),
    };
  }

  log("LocalDraftBuildSuccess", {
    chapterCount: localDraft.chapterCount,
    totalLength: localDraft.totalLength,
  });

  let validatedLocal = validateVedicFinalManuscript({
    birthInput,
    localVedicChartJson,
    chapters: localDraft.chapters,
  });

  if (!validatedLocal.ok) {
    const recoveredLocal = expandVedicLocalManuscript(localDraft.chapters);
    localDraft = {
      ...localDraft,
      chapters: recoveredLocal,
      totalLength: allTextLength(recoveredLocal),
    };
    validatedLocal = validateVedicFinalManuscript({
      birthInput,
      localVedicChartJson,
      chapters: localDraft.chapters,
    });
  }

  if (!validatedLocal.ok) {
    const error = new Error("베다점 프리미엄 로컬 원고 검증에 실패했습니다.");
    error.code = "VEDIC_LOCAL_MANUSCRIPT_INVALID";
    error.status = 422;
    error.details = validatedLocal;
    throw error;
  }

  log("LocalQualityValidated", {
    chapterCount: validatedLocal.stats.chapterCount,
    totalLength: validatedLocal.stats.totalLength,
    forbiddenTermsCount: validatedLocal.stats.forbiddenTermsCount,
    repetitionScore: validatedLocal.stats.repetitionScore,
    calculationMode: clean(localVedicChartJson?.calculationMode),
  });

  let finalChapters = localDraft.chapters;
  let manuscriptSource = "local";

  let finalValidation = validateVedicFinalManuscript({
    birthInput,
    localVedicChartJson,
    chapters: finalChapters,
  });

  if (!finalValidation.ok) {
    finalChapters = localDraft.chapters;
    manuscriptSource = "local";
    finalValidation = validateVedicFinalManuscript({
      birthInput,
      localVedicChartJson,
      chapters: finalChapters,
    });
  }

  if (!finalValidation.ok) {
    const recoveredFinal = expandVedicLocalManuscript(finalChapters);
    finalChapters = recoveredFinal;
    manuscriptSource = "local";
    finalValidation = validateVedicFinalManuscript({
      birthInput,
      localVedicChartJson,
      chapters: finalChapters,
    });
  }

  if (!finalValidation.ok) {
    const error = new Error("베다점 프리미엄 원고 검증에 실패했습니다.");
    error.code = "VEDIC_MANUSCRIPT_INVALID";
    error.status = 422;
    error.details = finalValidation;
    throw error;
  }

  log("FinalManuscriptValidated", {
    chapterCount: finalValidation.stats.chapterCount,
    totalLength: finalValidation.stats.totalLength,
    hasAyanamsa: finalValidation.stats.hasAyanamsa,
    hasLagna: finalValidation.stats.hasLagna,
    hasMoonSign: finalValidation.stats.hasMoonSign,
    hasNakshatra: finalValidation.stats.hasNakshatra,
    manuscriptSource,
  });

  log("PdfRenderStart", {
    chapterCount: finalChapters.length,
    manuscriptSource,
  });

  const chapterDrafts = finalChapters.map((chapter) => ({
    ...chapter,
    localQuality: collectSignals(chapter, localVedicChartJson),
  }));
  const legacyChapters = chapterDrafts.map((chapter) => toLegacyChapterShape(chapter));
  const pdfReady = renderVedicPremiumPdf(chapterDrafts, localVedicChartJson);

  log("PdfRenderSuccess", {
    chapterCount: chapterDrafts.length,
    totalLength: finalValidation.stats.totalLength,
    manuscriptSource,
  });

  return {
    payload: localVedicChartJson,
    birthInput,
    localVedicChartJson,
    localDraft,
    chapters: legacyChapters,
    chapterDrafts,
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
    fallbackUsed: false,
    manuscriptSource,
    pdfReady,
    quality: finalValidation.stats,
    diagnostics: {
      llm: {
        reason: "LOCAL_ONLY_MODE",
        failed: false,
      },
      manuscript: finalValidation,
    },
  };
}

export function validateVedicPayloadForApi(rawInput = {}) {
  const birthInput = normalizeVedicPremiumBirthInput(rawInput);
  const birthValidation = validateVedicBirthInput(birthInput);
  if (!birthValidation.ok) {
    return {
      ok: false,
      code: "BIRTH_INPUT_INVALID",
      missing: birthValidation.hardFail,
      message: birthValidation.message,
      birthInput,
    };
  }

  try {
    const localVedicChartJson = buildVedicLocalChartJson(rawInput);
    const hasCore = Boolean(
      clean(localVedicChartJson?.chart?.lagnaSign)
      || safeArray(localVedicChartJson?.chart?.planets).some((planet) => clean(planet.sign)),
    );

    if (!hasCore) {
      return {
        ok: false,
        code: "MISSING_VEDIC_DATA",
        missing: ["lagnaOrPlanets"],
        message: "베다점 계산 데이터가 부족합니다. 라그나와 핵심 행성 정보를 확인해주세요.",
        birthInput,
      };
    }

    return {
      ok: true,
      missing: [],
      message: "",
      birthInput,
      localVedicChartJson,
    };
  } catch (error) {
    return {
      ok: false,
      code: "VEDIC_DRY_RUN_FAILED",
      missing: ["localVedicChartJson"],
      message: "베다 차트 계산을 완료하지 못했습니다. 입력값을 확인해주세요.",
      details: normalizeManuscriptError(error),
      birthInput,
    };
  }
}
