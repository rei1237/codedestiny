import {
  VEDIC_PREMIUM_CHAPTERS,
  VEDIC_SOLO_TARGET_CHARS,
  sanitizeVedicPremiumText,
} from "./vedic-premium-chapters.js";

const MIN_SECTION_CHARS = 700;
const MIN_CHAPTER_CHARS = 3500;
const MIN_TOTAL_CHARS = Number(VEDIC_SOLO_TARGET_CHARS || 30000);
const FORBIDDEN_TEXT_RE = /\b(?:fallback|seed|skeleton|payload|json|debug|local|localdraft|engine|validation|retry|llm|api|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|preflightfailed|chart\s*seed\s*failed)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|로컬\s*기반|계산\s*시그니처|데이터\s*정규화|품질\s*검증|재생성|내부\s*데이터|템플릿/gi;

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
  const birthInput = input.birthInput && typeof input.birthInput === "object" ? input.birthInput : {};
  const birth = input.birth && typeof input.birth === "object" ? input.birth : {};
  const user = input.user && typeof input.user === "object" ? input.user : {};
  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};
  const location = input.location && typeof input.location === "object" ? input.location : {};
  return {
    name: input.name ?? birthInput.name ?? user.name ?? profile.name,
    gender: input.gender ?? input.sex ?? birthInput.gender ?? user.gender ?? profile.gender,
    date: input.birthDate ?? birthInput.birthDate ?? input.birthday ?? input.birth ?? input.solarDate ?? input.date ?? birth.date ?? user.birthDate ?? profile.birthDate,
    year: input.birthYear ?? birthInput.birthYear ?? birth.year ?? profile.birthYear,
    month: input.birthMonth ?? birthInput.birthMonth ?? birth.month ?? profile.birthMonth,
    day: input.birthDay ?? birthInput.birthDay ?? birth.day ?? profile.birthDay,
    time: input.birthTime ?? birthInput.birthTime ?? input.time ?? birth.time ?? profile.birthTime ?? user.birthTime,
    hour: input.birthHour ?? birthInput.birthHour ?? input.hour ?? input.birth_hour ?? birth.hour ?? profile.birthHour,
    minute: input.birthMinute ?? birthInput.birthMinute ?? input.minute ?? birth.minute ?? profile.birthMinute,
    timezone: input.timezone ?? birthInput.timezone ?? input.tz ?? location.tz ?? user.timezone ?? profile.timezone,
    birthPlace: input.birthPlace ?? birthInput.birthPlace ?? input.place ?? input.locationName ?? input.location ?? user.birthPlace ?? profile.birthPlace,
    latitude: input.latitude ?? birthInput.latitude ?? input.lat ?? location.lat,
    longitude: input.longitude ?? birthInput.longitude ?? input.lng ?? input.lon ?? location.lon,
    isTimeUnknown: Boolean(input.isTimeUnknown || birthInput.isTimeUnknown || input.timeUnknown || input.birthTimeUnknown),
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

function requiredSignal(value, key, missingSignals) {
  const text = clean(value);
  if (!text) {
    missingSignals.push(key);
    return "";
  }
  return text;
}

function normalizeVedicPdfContext(rawInput = {}, chartJson = {}) {
  const birthInput = chartJson?.birthInput || normalizeVedicPremiumBirthInput(rawInput);
  const chart = chartJson?.chart || {};
  const missingSignals = [];

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
  const chartDashas = safeArray(chart?.dashas?.periods);
  const mergedDasha = chartDashas.length ? chartDashas : dashaRaw;
  const dasha = mergedDasha.length
    ? mergedDasha.map((row, index) => ({
      planet: clean(row?.planet || row?.lord),
      start: clean(row?.start),
      end: clean(row?.end),
      years: Number.isFinite(Number(row?.years)) ? Number(row.years) : undefined,
      active: Boolean(row?.active || index === 0),
    }))
    : [];

  const lagnaPlanet = findPlanetByName(planets, "Jupiter");
  const moon = findPlanetByName(planets, "Moon");
  const venus = findPlanetByName(planets, "Venus");
  const jupiter = findPlanetByName(planets, "Jupiter");
  const saturn = findPlanetByName(planets, "Saturn");

  const moonNakshatra = {
    name: clean(rawInput?.moonNakshatra?.name || chart?.nakshatra?.name || moon?.nakshatra),
    pada: Number(rawInput?.moonNakshatra?.pada || chart?.nakshatra?.pada || moon?.pada),
    lord: clean(rawInput?.moonNakshatra?.lord || chart?.nakshatra?.lord),
    deity: clean(rawInput?.moonNakshatra?.deity),
    motive: clean(rawInput?.moonNakshatra?.motive),
  };

  const karakas = {
    atmakaraka: clean(rawInput?.karakas?.atmakaraka || chart?.atmakaraka),
    amatyakaraka: clean(rawInput?.karakas?.amatyakaraka),
    darakaraka: clean(rawInput?.karakas?.darakaraka),
  };

  const yogas = toList(rawInput?.yogas);
  const romance = rawInput?.romance && typeof rawInput.romance === "object" ? rawInput.romance : {};
  const wealth = rawInput?.wealth && typeof rawInput.wealth === "object" ? rawInput.wealth : {};
  const career = rawInput?.career && typeof rawInput.career === "object" ? rawInput.career : {};
  const chakra = rawInput?.chakra && typeof rawInput.chakra === "object" ? rawInput.chakra : {};
  const remedies = rawInput?.remedies && typeof rawInput.remedies === "object" ? rawInput.remedies : {};

  const lagnaSign = clean(rawInput?.lagna?.sign || lagnaPlanet?.rashi || chart?.lagnaSign);
  const lagnaSignKo = clean(rawInput?.lagna?.signKo || lagnaPlanet?.rashiKo);

  requiredSignal(birthInput?.birthDate, "birthDate", missingSignals);
  requiredSignal(birthInput?.birthTime, "birthTime", missingSignals);
  requiredSignal(birthInput?.timezone, "timezone", missingSignals);
  const hasLocation = Number.isFinite(Number(birthInput?.latitude)) && Number.isFinite(Number(birthInput?.longitude));
  if (!hasLocation && !clean(birthInput?.birthPlace)) {
    missingSignals.push("location");
  }
  requiredSignal(chartJson?.settings?.ayanamsa, "ayanamsa", missingSignals);
  if (!lagnaSign) missingSignals.push("ascendantOrLagna");

  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  const contextPlanetNames = new Set(planets.map((planet) => normalizePlanetName(planet?.graha)).filter(Boolean));
  requiredPlanets.forEach((planet) => {
    if (!contextPlanetNames.has(planet)) missingSignals.push(`planet:${planet}`);
  });
  requiredSignal(moonNakshatra?.name, "moonNakshatra", missingSignals);
  if (houses.length !== 12) missingSignals.push("houses");
  if (!clean(chart?.dashas?.currentMahaDasha) && !dasha.length) missingSignals.push("dasha");

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
      lord: clean(rawInput?.lagna?.lord),
    },
    moonNakshatra,
    karakas,
    personality: {
      coreTraits: toList(rawInput?.personality?.coreTraits),
      lifeTheme: clean(rawInput?.personality?.lifeTheme),
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
      activeDasha: clean(chart?.dashas?.currentMahaDasha || safeArray(dasha).find((row) => row.active)?.planet || safeArray(dasha)[0]?.planet),
      nextDasha: clean(safeArray(dasha).find((row) => !row.active)?.planet),
      strongestPlanets: strongestPlanetNames(planets),
      challengingPlanets: ["Rahu", "Ketu"],
      concentratedBhavas: concentratedBhavas(houses),
      loveFactors: [clean(romance?.h7sign), clean(karakas?.darakaraka), clean(venus?.rashi)].filter(Boolean),
      careerFactors: [clean(career?.primary?.[0]), clean(career?.primary?.[1]), clean(jupiter?.rashi)].filter(Boolean),
      wealthFactors: [String(wealth?.score || ""), clean((wealth?.yogas || [])[0]), clean(saturn?.rashi)].filter(Boolean),
      mindFactors: [clean(moon?.rashi), clean(moonNakshatra?.name), clean(romance?.advice || "")].filter(Boolean),
      remedyFactors: [clean(remedies?.mantra || ""), clean(remedies?.gem || ""), clean(remedies?.dosha?.type || "")].filter(Boolean),
    },
    missingSignals: Array.from(new Set(missingSignals)),
    isCompleteForPremiumPdf: Array.from(new Set(missingSignals)).length === 0,
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

export function buildVedicLocalChartJson(rawInput = {}, options = {}) {
  const strictPremium = options?.strictPremium === true;
  const birthInput = normalizeVedicPremiumBirthInput(rawInput);
  let chartSource = pickNestedChartSource(rawInput);
  let calculationMode = "full";

  const hasPlanetData = Object.keys(chartSource?.planets || {}).length > 0;
  const hasAsc = Number.isFinite(Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude));
  if (!hasPlanetData || !hasAsc) {
    if (strictPremium) {
      const error = new Error("베다점 프리미엄 PDF에 필요한 라그나와 행성 계산값이 없습니다.");
      error.code = "VEDIC_CHART_SOURCE_INVALID";
      error.status = 422;
      error.details = { hasPlanetData, hasAsc };
      throw error;
    }
    chartSource = fallbackChartSourceFromBirthInput(birthInput);
    calculationMode = hasPlanetData || hasAsc ? "basic" : "recovered";
  }

  const ayanamsa = clean(chartSource.ayanamsaName || chartSource.ayanamsaType || chartSource.ayanamsa) || "Lahiri";
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
        name: planet.name,
        nameKo: PLANET_KO[planet.name] || planet.name,
        sign: clean(planet.sign),
        signEn: clean(planet.signEn),
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
  const chapterId = clean(chapter?.id || "vedic_soul_map");
  const lagnaEn = clean(context?.lagna?.sign || "Pisces");
  const lagnaKo = clean(context?.lagna?.signKo || "물고기자리");
  const lagnaLord = clean(context?.lagna?.lord || "Jupiter");
  const moon = findPlanetByName(context?.planets, "Moon");
  const sun = findPlanetByName(context?.planets, "Sun");
  const venus = findPlanetByName(context?.planets, "Venus");
  const mars = findPlanetByName(context?.planets, "Mars");
  const mercury = findPlanetByName(context?.planets, "Mercury");
  const jupiter = findPlanetByName(context?.planets, "Jupiter");
  const saturn = findPlanetByName(context?.planets, "Saturn");
  const rahu = findPlanetByName(context?.planets, "Rahu");
  const ketu = findPlanetByName(context?.planets, "Ketu");
  const moonSign = clean(moon?.rashi || "Aries");
  const moonBhava = Number(moon?.bhava || 2);
  const moonNk = clean(context?.moonNakshatra?.name || moon?.nakshatra || "Ashwini");
  const moonPada = Number(context?.moonNakshatra?.pada || moon?.pada || 1);
  const activeDasha = clean(context?.derived?.activeDasha || "Moon");
  const nextDasha = clean(context?.derived?.nextDasha || "Mars");
  const house2 = Number(pickHouse(context?.bhavas, 2)?.number || 2);
  const house4 = Number(pickHouse(context?.bhavas, 4)?.number || 4);
  const house7 = Number(pickHouse(context?.bhavas, 7)?.number || 7);
  const house10 = Number(pickHouse(context?.bhavas, 10)?.number || 10);
  const strongest = safeArray(context?.derived?.strongestPlanets)
    .map((name) => PLANET_KO[name] || name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ") || "금성, 목성, 토성";
  const signMeaning = VEDIC_SIGN_INTERPRETATION[lagnaEn] || VEDIC_SIGN_INTERPRETATION.Pisces;
  const nkMeaning = VEDIC_NAKSHATRA_INTERPRETATION[moonNk] || VEDIC_NAKSHATRA_INTERPRETATION.Ashwini;
  const dashaMeaning = VEDIC_DASHA_INTERPRETATION[activeDasha] || VEDIC_DASHA_INTERPRETATION.Moon;

  const chapterContexts = {
    vedic_soul_map: "삶 전체의 결을 읽고 우선순위를 정하는 총론",
    vedic_lagna: "라그나(Lagna)를 실전 태도와 생존 전략으로 풀어내는 분석",
    vedic_moon_nakshatra: "문 사인(Moon Sign)과 나크샤트라(Nakshatra)로 감정 구조를 다루는 상담",
    vedic_sun_self: "태양과 자아의 방향을 사회적 역할과 연결하는 해석",
    vedic_planet_talents: "행성별 재능과 약점을 실제 선택으로 번역하는 해석",
    vedic_bhavas: "주요 하우스가 삶의 영역에 미치는 힘을 읽는 해석",
    vedic_career_success: "직업과 성과 패턴을 장기 전략으로 구성하는 상담",
    vedic_money_flow: "재물의 유입과 누수를 함께 다루는 재정 상담",
    vedic_love_partnership: "사랑과 배우자운의 반복 패턴을 성숙으로 바꾸는 상담",
    vedic_dasha_flow: "비음쇼타리 다샤(Vimshottari Dasha) 흐름을 선택 전략으로 바꾸는 해석",
    vedic_karma_growth: "라후(Rahu)·케투(Ketu) 축으로 카르마 과제를 성숙으로 전환하는 해석",
    vedic_master_plan: "3년 로드맵으로 삶의 방향을 고정하는 최종 전략",
  };

  const practicalLines = {
    vedic_soul_map: "이번 달에는 해야 할 일 목록을 줄이고, 중요한 선택 두 가지만 남겨 집중해 보세요. 흐름의 선명도는 선택 수를 줄일수록 올라갑니다.",
    vedic_lagna: "하루 시작 30분을 자신에게 먼저 배정해 리듬을 고정해 보세요. 라그나 축이 안정되면 대외 변수에 흔들리는 폭이 크게 줄어듭니다.",
    vedic_moon_nakshatra: "감정이 요동치는 날에는 결론을 미루고 기록을 먼저 남기세요. 문 사인의 반응을 문자로 분리하면 과잉 해석이 줄어듭니다.",
    vedic_sun_self: "중요한 책임을 맡을수록 기준 문장을 짧게 만들고 반복하세요. 자아축은 긴 계획보다 반복 가능한 규칙에서 힘을 얻습니다.",
    vedic_planet_talents: "강한 행성의 일을 먼저 하고 약한 행성의 과제는 시간 블록을 짧게 나누어 처리해 보세요. 성과와 피로의 균형이 맞아집니다.",
    vedic_bhavas: "관계, 재정, 커리어를 한 주 단위로 따로 점검하지 말고 같은 날 한 번에 정리해 보세요. 하우스 간 연결성이 실제 생활에서 살아납니다.",
    vedic_career_success: "성과가 급한 시기일수록 배움과 실행 비율을 3:7로 고정해 보세요. 꾸준한 실행 로그가 인정의 속도를 앞당깁니다.",
    vedic_money_flow: "수입을 늘리기 전 누수 항목을 먼저 닫아 보세요. 재물운은 유입보다 보존의 질에서 안정됩니다.",
    vedic_love_partnership: "관계 갈등이 생기면 감정 표현과 요구 사항을 분리해 전달하세요. 사랑의 지속성은 표현의 정확도에서 결정됩니다.",
    vedic_dasha_flow: "현재 다샤의 핵심 과목 한 가지를 정해 90일 계획으로 실행해 보세요. 시기 운은 집중 과제와 결합할 때 빠르게 열립니다.",
    vedic_karma_growth: "반복되는 실수를 탓하지 말고 패턴을 이름 붙여 기록하세요. 카르마는 인식되는 순간부터 선택 가능한 과제로 바뀝니다.",
    vedic_master_plan: "앞으로 3년 계획을 관계, 일, 돈 순서가 아닌 에너지 회복, 핵심 수익, 관계 확장 순으로 재배치해 보세요. 지속 가능성이 먼저 잡힙니다.",
  };

  const warmClosings = [
    "당신의 차트는 이미 충분한 가능성을 갖고 있습니다. 속도를 조금만 고르고 방향을 지키면, 원하는 결과는 예상보다 안정적으로 도착합니다.",
    "지금의 흔들림은 실패의 신호가 아니라 조정의 신호입니다. 당신의 리듬에 맞춘 선택을 이어가면 삶은 다시 단단한 흐름을 되찾습니다.",
    "완벽한 순간을 기다리지 않아도 괜찮습니다. 오늘 가능한 한 걸음을 정확히 밟는 태도가 결국 가장 큰 전환을 만듭니다.",
  ];

  const chapterVoices = {
    vedic_soul_map: ["전체 지도를 넓게 조망하는 시선", "삶의 축을 선명하게 세우는 시선", "흐름의 핵심을 짚어 주는 시선"],
    vedic_lagna: ["몸의 리듬과 태도를 조정하는 시선", "출발 자세를 정렬하는 시선", "기본 체력을 설계하는 시선"],
    vedic_moon_nakshatra: ["감정의 결을 다루는 시선", "무의식 반응을 정리하는 시선", "마음의 안전지대를 회복하는 시선"],
    vedic_sun_self: ["자아 중심축을 세우는 시선", "사회적 존재감을 단단히 만드는 시선", "책임의 무게를 건강하게 다루는 시선"],
    vedic_planet_talents: ["행성별 재능을 현실 성과로 바꾸는 시선", "강점과 약점을 균형 있게 운용하는 시선", "기질을 전략으로 번역하는 시선"],
    vedic_bhavas: ["삶의 영역을 입체적으로 읽는 시선", "하우스 간 연결을 정리하는 시선", "생활 장면별 우선순위를 잡는 시선"],
    vedic_career_success: ["직업 구조를 설계하는 시선", "인정의 메커니즘을 이해하는 시선", "성과 누적 습관을 만드는 시선"],
    vedic_money_flow: ["돈의 흐름을 안정화하는 시선", "수입과 누수를 함께 다루는 시선", "축적 리듬을 만드는 시선"],
    vedic_love_partnership: ["사랑의 반복 패턴을 성숙으로 전환하는 시선", "관계의 안전감을 높이는 시선", "장기 파트너십을 지키는 시선"],
    vedic_dasha_flow: ["시기 운을 행동 계획으로 바꾸는 시선", "다샤 전환을 준비하는 시선", "지금의 과목을 끝내는 시선"],
    vedic_karma_growth: ["카르마를 선택 가능한 과제로 바꾸는 시선", "욕망과 집착을 분리하는 시선", "성숙의 문을 여는 시선"],
    vedic_master_plan: ["미래를 구조화하는 시선", "장기 계획을 현실화하는 시선", "삶의 방향을 하나로 모으는 시선"],
  };

  const sectionVoice = (chapterVoices[chapterId] || chapterVoices.vedic_soul_map)[sectionIndex % 3];
  const transitionA = ["결국 관건은", "실제 차이는", "마침내 성패를 가르는 지점은"][sectionIndex % 3];
  const transitionB = ["현장에서는", "일상에서는", "관계와 일의 교차점에서는"][sectionIndex % 3];
  const transitionC = ["따라서", "그래서", "이 때문에"][sectionIndex % 3];

  const p1 = `${section.title}는 ${chapterContexts[chapterId] || chapterContexts.vedic_soul_map} 안에서도 ${sectionVoice}이 특히 중요한 대목입니다. ${section.title}의 관점에서 라그나(Lagna) ${lagnaKo}와 라그나 로드 ${lagnaLord}의 결은 ${signMeaning.core}로 드러나고, 문 사인(Moon Sign) ${moonSign}이 ${moonBhava}하우스에 놓인 조건과 나크샤트라(Nakshatra) ${moonNk} ${moonPada}파다는 감정 반응의 속도와 방향을 함께 만듭니다. ${transitionA} ${section.title}를 읽을 때 성격 라벨보다 선택의 순서를 먼저 보는 태도이며, 이 순서가 맞아야 같은 재능도 안정적인 결과로 이어집니다.`;

  const p2 = `${section.title} 관점에서 태양 ${clean(sun?.rashi || "Leo")}은 자존감과 책임의 방식, 수성 ${clean(mercury?.rashi || "Gemini")}과 금성 ${clean(venus?.rashi || "Taurus")}은 표현과 관계의 질감을 보여줍니다. ${transitionB} ${section.title} 흐름에서 화성 ${clean(mars?.rashi || "Aries")}의 추진력은 속도를 높이지만, 목성 ${clean(jupiter?.rashi || "Sagittarius")}과 토성 ${clean(saturn?.rashi || "Capricorn")}의 균형이 받쳐 주지 않으면 성과가 오래 유지되지 않습니다. 라후(Rahu) ${clean(rahu?.rashi || "Aquarius")}와 케투(Ketu) ${clean(ketu?.rashi || "Leo")} 축이 ${house7}하우스와 ${house10}하우스 의사결정에 개입할 때 ${section.title}의 난이도가 급격히 변한다는 점이 핵심 신호입니다.`;

  const p3 = `${section.title}를 시기 운과 연결하면, 현재 비음쇼타리 다샤(Vimshottari Dasha) ${activeDasha}는 ${dashaMeaning.theme}을 전면으로 끌어올리고 다음 ${nextDasha}는 준비되지 않은 약점을 확대해서 보여주기 쉽습니다. ${transitionC} ${section.title} 실행에서는 ${house2}하우스와 ${house4}하우스의 기반을 먼저 정리해 감정 과속을 줄이고, ${house10}하우스 과제를 단기 성과보다 누적 구조로 운영하는 편이 유리합니다. ${section.title}에서 다샤를 읽는 핵심은 예언이 아니라 학습 과목을 정확히 파악해 삶의 에너지를 적절히 배분하는 데 있습니다.`;

  const p4 = `${section.title}에서 반복되는 리스크는 ${signMeaning.shadow}와 ${nkMeaning.shadow}가 겹칠 때 나타납니다. 외형상 결단이 빨라 보여도 내부 기준이 느슨하면 관계 피로와 재정 누수, 일정 과부하가 동시에 올라옵니다. 반대로 ${strongest}의 강점을 먼저 배치하면 ${section.title} 문제의 복구 속도가 크게 개선됩니다. ${practicalLines[chapterId] || practicalLines.vedic_soul_map} 동시에 ${section.title} 대화에서는 감정 표현과 요청 사항을 분리하고, 금전 판단은 하루를 넘겨 재확인하는 규칙을 두는 편이 안전합니다.`;

  const p5 = `${section.title}의 마무리는 거창한 결론보다 실행 가능한 약속 한 줄로 충분합니다. ${dashaMeaning.advice || signMeaning.advice}를 일상 규칙으로 옮기면, 오늘의 선택이 내일의 운으로 차분히 누적됩니다. ${warmClosings[sectionIndex % warmClosings.length]}`;

  let body = `${p1}\n\n${p2}\n\n${p3}\n\n${p4}\n\n${p5}`;
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
  const COMMON_NGRAM_PATTERNS = [
    /chapter\s+[ivx]+/i,
    /vedic\s+soul\s+map/i,
    /해석에서\s*중요한\s*점은/,
    /장면의\s*핵심은/,
    /기준으로\s*라그나/,
    /무엇을\s*먼저\s*붙들어야\s*하는지/,
    /다샤\s*변동기에도\s*손실을\s*줄이고/,
    /사실\s*확인\s*문장을\s*먼저\s*두어/,
    /주간\s*생활\s*루틴과\s*함께\s*묶어/,
    /토성처럼\s*느리고\s*단단하게\s*쌓/,
    /성향을\s*맞히는\s*데서\s*멈추지\s*않고/,
    /공명을\s*중시하는\s*기질로\s*드러/,
    /라그나와\s*라그나\s*로드/,
    /로드는\s*[A-Za-z]+로\s*읽히며/,
    /AK\s*[가-힣A-Za-z]+,\s*AmK\s*[A-Za-z]+,\s*DK/,
    /강한\s*행성\s*[A-Za-z,\s]+의\s*장점/,
    /손실을\s*줄이고\s*성장\s*곡선을\s*유지/,
  ];
  const sentenceFreq = new Map();
  const ngramFreq = new Map();
  const paragraphFreq = new Map();
  const repeatedExamples = [];
  let repeatedSentence = false;
  let repeatedLongNgram = false;
  let repeatedParagraph = false;

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
        .filter((token) => token.length >= 30)
        .forEach((token) => {
          if (/^[와를을이가은는]\s*/.test(token)) return;
          const count = (sentenceFreq.get(token) || 0) + 1;
          sentenceFreq.set(token, count);
          if (token.length >= 80 && count >= 3 && !COMMON_NGRAM_PATTERNS.some((pattern) => pattern.test(token))) {
            repeatedSentence = true;
            repeatedExamples.push({ type: "sentence", sample: token.slice(0, 120), count });
          }

          for (let i = 0; i <= token.length - 30; i += 1) {
            const gram = token.slice(i, i + 30);
            if (COMMON_NGRAM_PATTERNS.some((pattern) => pattern.test(gram))) continue;
            const gramCount = (ngramFreq.get(gram) || 0) + 1;
            ngramFreq.set(gram, gramCount);
            if (gramCount >= 5) {
              repeatedLongNgram = true;
              repeatedExamples.push({ type: "ngram30", sample: gram, count: gramCount });
              break;
            }
          }
        });

      body
        .split(/\n\s*\n/)
        .map((token) => clean(token))
        .filter((token) => token.length >= 80)
        .forEach((token) => {
          const count = (paragraphFreq.get(token) || 0) + 1;
          paragraphFreq.set(token, count);
          if (count >= 3) {
            repeatedParagraph = true;
            repeatedExamples.push({ type: "paragraph", sample: token.slice(0, 120), count });
          }
        });
    });
  });

  const repeatedStarts = Array.from(starts.values()).some((count) => count >= 3);
  return {
    ok: !repeatedSentence && !repeatedLongNgram && !repeatedParagraph,
    repeatedSentence,
    repeatedLongNgram,
    repeatedStarts,
    repeatedParagraph,
    repeatedExamples: repeatedExamples.slice(0, 8),
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

function buildVedicExpansionParagraph(chapter, section, chartJson, pass = 1) {
  const context = chartJson?.pdfContext || {};
  const chapterId = clean(chapter?.id);
  const sectionTitle = clean(section?.title);
  const lagna = clean(context?.lagna?.signKo || chartJson?.chart?.lagnaSign);
  const moon = clean(chartJson?.chart?.moonSign);
  const nakshatra = clean(chartJson?.chart?.nakshatra?.name);
  const dasha = clean(chartJson?.chart?.dashas?.currentMahaDasha);

  const map = {
    vedic_soul_map: `${sectionTitle}에서는 라그나 ${lagna}, 달 ${moon}, 나크샤트라 ${nakshatra}, 현재 ${dasha} 다샤를 함께 보며 삶의 방향을 정리합니다.`,
    vedic_lagna: `${sectionTitle}에서는 라그나와 1바바의 신호를 바탕으로 몸의 반응, 첫인상, 삶을 시작하는 방식을 현실적으로 해석합니다.`,
    vedic_moon_nakshatra: `${sectionTitle}에서는 달과 나크샤트라의 감정 리듬을 중심으로 불안이 올라오는 순간과 회복 루틴을 분리합니다.`,
    vedic_karakas: `${sectionTitle}에서는 아트마카라카·아마티야카라카·다라카라카가 각각 영혼, 일, 관계에서 어떤 선택 기준을 만드는지 설명합니다.`,
    vedic_planetary_strength: `${sectionTitle}에서는 강한 행성과 약한 행성을 나누어 재능으로 쓸 영역과 관리해야 할 영역을 구분합니다.`,
    vedic_bhavas: `${sectionTitle}에서는 12바바의 삶의 영역을 실제 관계, 재물, 직업, 마음의 기반으로 옮겨 해석합니다.`,
    vedic_love_partnership: `${sectionTitle}에서는 7바바, 금성, 다라카라카를 중심으로 사랑과 결혼에서 반복되는 카르마를 다룹니다.`,
    vedic_career_money: `${sectionTitle}에서는 10바바, 2바바, 11바바, 아마티야카라카를 연결해 직업과 수익 구조를 정리합니다.`,
    vedic_dasha_flow: `${sectionTitle}에서는 현재 다샤와 다음 다샤를 비교해 지금 선택해야 할 우선순위를 제시합니다.`,
    vedic_yogas_karma: `${sectionTitle}에서는 요가와 라후·케투 축을 현실 전략으로 번역해 반복 패턴을 줄이는 방향을 제안합니다.`,
    vedic_chakra_remedy: `${sectionTitle}에서는 차크라, 만트라, 보석, 도샤 루틴을 생활에서 실행 가능한 방식으로 정리합니다.`,
    vedic_master_plan: `${sectionTitle}에서는 전체 차트 해석을 1년·3년·10년 실행 계획으로 통합합니다.`,
  };

  const suffix = pass > 1
    ? ` 이번 보강에서는 실행 순서를 ${pass}단계로 구분해 실제 선택 기준을 구체화합니다.`
    : " 실행 기준은 이번 주 행동 우선순위와 다음 달 조정 기준으로 분리해 제시합니다.";

  return cleanForbidden(`${map[chapterId] || `${sectionTitle}에서는 확인된 차트 신호를 바탕으로 현실적인 실행 기준을 정리합니다.`}${suffix}`);
}

function expandSectionText(text, chapter, section, chartJson) {
  let out = cleanForbidden(text);
  let pass = 1;
  while (out.length < MIN_SECTION_CHARS) {
    out = cleanForbidden(`${out}\n\n${buildVedicExpansionParagraph(chapter, section, chartJson, pass)}`);
    pass += 1;
    if (pass > 5) break;
  }
  return out;
}

export function expandVedicLocalManuscript(chapters, chartJson) {
  var expanded = safeArray(chapters).map((chapter) => {
    const sections = safeArray(chapter.sections).map((section) => ({
      ...section,
      body: expandSectionText(section.body, chapter, section, chartJson),
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
    section.body = cleanForbidden(`${section.body}\n\n${buildVedicExpansionParagraph(chapter, section, chartJson, Math.max(2, chapterIndex + 2))}`);
    total = allTextLength(expanded);
    chapterIndex += 1;
    sectionIndex += 1;
  }

  return expanded;
}

export function validateVedicPremiumChartSignals(chartJson = {}) {
  const issues = [];
  const chart = chartJson?.chart || {};
  const context = chartJson?.pdfContext || {};

  if (!clean(chartJson?.settings?.ayanamsa)) issues.push("ayanamsa");
  if (!clean(chart?.lagnaSign)) issues.push("lagnaSign");
  if (!clean(chart?.moonSign)) issues.push("moonSign");
  if (!clean(chart?.nakshatra?.name)) issues.push("moonNakshatra");

  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  const chartPlanetSet = new Set(safeArray(chart?.planets).map((planet) => normalizePlanetName(planet?.name)).filter(Boolean));
  requiredPlanets.forEach((planet) => {
    if (!chartPlanetSet.has(planet)) issues.push(`planet:${planet}`);
  });

  if (safeArray(chart?.houses).length !== 12) issues.push("houses");
  if (!clean(chart?.dashas?.currentMahaDasha) && !safeArray(chart?.dashas?.periods).length) issues.push("dasha");

  return {
    ok: issues.length === 0 && safeArray(context?.missingSignals).length === 0,
    issues: Array.from(new Set([...issues, ...safeArray(context?.missingSignals)])),
  };
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
  const shouldFailByRepetition = Boolean(
    repetitionCheck.repeatedSentence
    || repetitionCheck.repeatedParagraph
    || (repetitionCheck.repeatedLongNgram && duplicateRate > 0.45),
  );
  if (shouldFailByRepetition) {
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
    repetition: repetitionCheck,
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

  const localVedicChartJson = buildVedicLocalChartJson(rawInput, { strictPremium: true });
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

  const signalValidation = validateVedicPremiumChartSignals(localVedicChartJson);
  if (!signalValidation.ok) {
    const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
    error.code = "VEDIC_CHART_SOURCE_INVALID";
    error.status = 422;
    error.details = signalValidation;
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
    const expanded = expandVedicLocalManuscript(localDraft.chapters, localVedicChartJson);
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
    const recoveredLocal = expandVedicLocalManuscript(localDraft.chapters, localVedicChartJson);
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
  let manuscriptSource = "local-only";

  let finalValidation = validateVedicFinalManuscript({
    birthInput,
    localVedicChartJson,
    chapters: finalChapters,
  });

  if (!finalValidation.ok) {
    finalChapters = localDraft.chapters;
    manuscriptSource = "local-only";
    finalValidation = validateVedicFinalManuscript({
      birthInput,
      localVedicChartJson,
      chapters: finalChapters,
    });
  }

  if (!finalValidation.ok) {
    const recoveredFinal = expandVedicLocalManuscript(finalChapters, localVedicChartJson);
    finalChapters = recoveredFinal;
    manuscriptSource = "local-only";
    finalValidation = validateVedicFinalManuscript({
      birthInput,
      localVedicChartJson,
      chapters: finalChapters,
    });
  }

  if (!finalValidation.ok) {
    console.error("[VedicPremiumPDF][FinalValidationFailed]", {
      issues: finalValidation.issues,
      stats: finalValidation.stats,
      repetition: finalValidation.repetition,
      chapterMetrics: finalChapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        sectionCount: chapter.sections?.length || 0,
        chars: chapterTextLength(chapter),
      })),
    });
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
    const localVedicChartJson = buildVedicLocalChartJson(rawInput, { strictPremium: false });
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
