import { callGeminiText } from "./gemini.js";
import { ASTRO_PREMIUM_CHAPTERS, sanitizeAstroPremiumText } from "./astro-premium-chapters.js";

const MIN_SECTION_LENGTH = 500;
const MIN_CHAPTER_LENGTH = 2000;
const MIN_TOTAL_LENGTH = 25000;
const FORBIDDEN_PATTERNS = [
  /자동\s*복구\s*생성/gi,
  /fallback/gi,
  /chapter\s*1\s*chapter\s*1/gi,
  /데이터가\s*부족합니다/gi,
  /\bpayload\b/gi,
  /\bjson\b/gi,
  /\bdebug\b/gi,
];

function clean(value) {
  return String(value || "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toIsoDate(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && clean(value)) return value;
  }
  return undefined;
}

function normalizeGender(raw) {
  const value = clean(raw).toLowerCase();
  if (!value) return "unknown";
  if (value === "m" || value === "male" || value.includes("남")) return "male";
  if (value === "f" || value === "female" || value.includes("여")) return "female";
  return "unknown";
}

function parseDateParts(rawDate, fallbackYear, fallbackMonth, fallbackDay) {
  const date = clean(rawDate);
  const parts = date ? date.split(/[-./]/).map((v) => Number(v)) : [];
  const year = Number.isFinite(parts[0]) ? Math.trunc(parts[0]) : parseNum(fallbackYear, NaN);
  const month = Number.isFinite(parts[1]) ? Math.trunc(parts[1]) : parseNum(fallbackMonth, NaN);
  const day = Number.isFinite(parts[2]) ? Math.trunc(parts[2]) : parseNum(fallbackDay, NaN);
  return {
    birthYear: Number.isFinite(year) ? year : null,
    birthMonth: Number.isFinite(month) ? month : null,
    birthDay: Number.isFinite(day) ? day : null,
  };
}

function parseTime(rawTime, rawHour, rawMinute) {
  const text = clean(rawTime);
  const unknown = /모름|미상|unknown|none|na/i.test(text);
  if (unknown) {
    return { birthTime: "", birthHour: null, birthMinute: 0, isTimeUnknown: true };
  }

  const hourOnly = parseNum(rawHour, NaN);
  const minuteOnly = parseNum(rawMinute, NaN);

  const hhmm = text.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})/);
  if (hhmm) {
    const hour = clamp(Number(hhmm[1]), 0, 23);
    const minute = clamp(Number(hhmm[2]), 0, 59);
    return {
      birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      birthHour: hour,
      birthMinute: minute,
      isTimeUnknown: false,
    };
  }

  const korean = text.match(/오(전|후)\s*(\d{1,2})(?:\s*[:시]\s*(\d{1,2}))?/);
  if (korean) {
    const isPm = korean[1] === "후";
    let hour = clamp(Number(korean[2]), 0, 23);
    const minute = clamp(Number(korean[3] || 0), 0, 59);
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return {
      birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      birthHour: hour,
      birthMinute: minute,
      isTimeUnknown: false,
    };
  }

  const numericHour = Number.isFinite(hourOnly)
    ? clamp(Math.trunc(hourOnly), 0, 23)
    : (text && /^\d{1,2}$/.test(text) ? clamp(Number(text), 0, 23) : null);
  const numericMinute = Number.isFinite(minuteOnly) ? clamp(Math.trunc(minuteOnly), 0, 59) : 0;

  if (numericHour !== null) {
    return {
      birthTime: `${String(numericHour).padStart(2, "0")}:${String(numericMinute).padStart(2, "0")}`,
      birthHour: numericHour,
      birthMinute: numericMinute,
      isTimeUnknown: false,
    };
  }

  return { birthTime: "", birthHour: null, birthMinute: 0, isTimeUnknown: true };
}

export function normalizeAstroPremiumBirthInput(rawInput = {}) {
  const body = asObject(rawInput);
  const profile = asObject(body.profile);
  const birth = asObject(profile.birth);
  const location = asObject(profile.location || body.location);
  const user = asObject(body.user);

  const dateSource = pickFirst(
    body.birthDate,
    body.birthday,
    body.birth,
    body.solarDate,
    body.date,
    user.birthDate,
    birth.birthDate,
  );
  const dateParts = parseDateParts(
    dateSource,
    pickFirst(body.birthYear, body.year, birth.year),
    pickFirst(body.birthMonth, body.month, birth.month),
    pickFirst(body.birthDay, body.day, birth.day),
  );

  const timeParts = parseTime(
    pickFirst(body.birthTime, body.time, birth.time, user.birthTime),
    pickFirst(body.birthHour, body.hour, body.birth_hour, birth.hour),
    pickFirst(body.birthMinute, body.minute, birth.minute),
  );

  const timezone = clean(pickFirst(body.timezone, body.tz, location.timezone, user.timezone)) || "Asia/Seoul";
  const birthPlace = clean(pickFirst(body.birthPlace, body.place, body.locationName, body.location, location.label, location.name, user.birthPlace));
  const latitude = parseNum(pickFirst(body.latitude, body.lat, location.lat), null);
  const longitude = parseNum(pickFirst(body.longitude, body.lng, body.lon, location.lon), null);

  const out = {
    name: clean(pickFirst(body.name, profile.name, user.name)) || undefined,
    gender: normalizeGender(pickFirst(body.gender, profile.gender, user.gender)),
    birthDate: toIsoDate(dateParts.birthYear, dateParts.birthMonth, dateParts.birthDay),
    birthYear: Number.isFinite(dateParts.birthYear) ? dateParts.birthYear : 0,
    birthMonth: Number.isFinite(dateParts.birthMonth) ? dateParts.birthMonth : 0,
    birthDay: Number.isFinite(dateParts.birthDay) ? dateParts.birthDay : 0,
    birthTime: timeParts.birthTime,
    birthHour: timeParts.birthHour,
    birthMinute: timeParts.birthMinute,
    timezone,
    birthPlace: birthPlace || undefined,
    latitude,
    longitude,
    isTimeUnknown: Boolean(timeParts.isTimeUnknown),
  };

  return out;
}

export function validateAstroPremiumBirthInput(input) {
  const missing = [];
  if (!clean(input?.birthDate)) missing.push("birthDate");
  if (!Number.isFinite(Number(input?.birthYear)) || Number(input?.birthYear) < 1900 || Number(input?.birthYear) > 2100) missing.push("birthYear");
  if (!Number.isFinite(Number(input?.birthMonth)) || Number(input?.birthMonth) < 1 || Number(input?.birthMonth) > 12) missing.push("birthMonth");
  if (!Number.isFinite(Number(input?.birthDay)) || Number(input?.birthDay) < 1 || Number(input?.birthDay) > 31) missing.push("birthDay");
  if (input?.isTimeUnknown || !Number.isFinite(Number(input?.birthHour))) missing.push("birthHour");
  if (!clean(input?.timezone)) missing.push("timezone");
  return { ok: missing.length === 0, missing };
}

export function toSwissChartInputFromBirthInput(input = {}) {
  const timezone = clean(input.timezone);
  const tzNumeric = /^-?\d+(\.\d+)?$/.test(timezone) ? Number(timezone) : 9;
  return {
    year: Number(input.birthYear),
    month: Number(input.birthMonth),
    day: Number(input.birthDay),
    hour: Number(input.birthHour),
    minute: Number(input.birthMinute || 0),
    timezone: Number.isFinite(tzNumeric) ? tzNumeric : 9,
    lat: Number.isFinite(Number(input.latitude)) ? Number(input.latitude) : 37.5665,
    lon: Number.isFinite(Number(input.longitude)) ? Number(input.longitude) : 126.978,
  };
}

function signNameFromNode(node) {
  if (!node || typeof node !== "object") return "";
  return clean(node.signKo || node.signName || node.sign || node.name);
}

function strengthLabel(orb) {
  const n = Number(orb);
  if (!Number.isFinite(n)) return "medium";
  if (n <= 2.5) return "strong";
  if (n <= 5) return "medium";
  return "weak";
}

export function buildAstroLocalChartJson(birthInput, swissChart = {}) {
  const planets = Object.entries(asObject(swissChart.planets)).map(([name, node]) => ({
    name,
    sign: signNameFromNode(node) || "미확인",
    degree: Number.isFinite(Number(node?.degree)) ? Number(node.degree) : undefined,
    house: Number.isFinite(Number(node?.house)) ? Number(node.house) : undefined,
    retrograde: Boolean(node?.retrograde),
  }));

  const houses = safeArray(swissChart.houseCusps).slice(0, 12).map((cusp, idx) => {
    const signIndex = Math.floor((((Number(cusp) % 360) + 360) % 360) / 30);
    const signMap = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
    return {
      house: idx + 1,
      sign: signMap[signIndex] || undefined,
      cuspDegree: Number.isFinite(Number(cusp)) ? Math.round((Number(cusp) % 30) * 100) / 100 : undefined,
    };
  });

  const aspects = safeArray(swissChart.aspects).map((aspect) => ({
    planetA: clean(aspect?.p1 || aspect?.planetA),
    planetB: clean(aspect?.p2 || aspect?.planetB),
    type: clean(aspect?.type),
    orb: Number.isFinite(Number(aspect?.orb)) ? Number(aspect.orb) : undefined,
    strength: strengthLabel(aspect?.orb),
  })).filter((aspect) => aspect.planetA && aspect.planetB && aspect.type);

  const sun = planets.find((planet) => planet.name === "Sun");
  const moon = planets.find((planet) => planet.name === "Moon");
  const ascSign = signNameFromNode(swissChart.ascendant) || "미확인";
  const mcSign = signNameFromNode(swissChart.midheaven) || "미확인";

  const seeds = buildInterpretationSeeds({ planets, houses, aspects, ascSign, mcSign, sun, moon });

  return {
    birthInput,
    chart: {
      sunSign: clean(sun?.sign),
      moonSign: clean(moon?.sign),
      ascendantSign: ascSign,
      midheavenSign: mcSign,
      planets,
      houses,
      aspects,
    },
    interpretationSeeds: seeds,
  };
}

function buildInterpretationSeeds(ctx) {
  const signs = safeArray(ctx.planets).map((planet) => clean(planet.sign)).filter(Boolean);
  const dominantSign = signs[0] || "중립";
  const asc = clean(ctx.ascSign) || "중립";
  const mc = clean(ctx.mcSign) || "중립";
  const aspectNames = safeArray(ctx.aspects).slice(0, 4).map((aspect) => `${aspect.planetA}-${aspect.planetB} ${aspect.type}`);
  const houseNames = safeArray(ctx.houses).slice(0, 4).map((house) => `${house.house}하우스 ${clean(house.sign) || "미확인"}`);
  return {
    personalityKeywords: [clean(ctx.sun?.sign) || dominantSign, clean(ctx.moon?.sign) || dominantSign, asc, "자기표현", "핵심기질"],
    careerKeywords: [mc, "목표정렬", "성과관리", "실행력", "포지셔닝"],
    moneyKeywords: [houseNames[0] || "2하우스", houseNames[1] || "8하우스", "현금흐름", "재무리듬", "보수운영"],
    relationshipKeywords: ["금성", "화성", "7하우스", "관계경계", "대화조율"],
    healingKeywords: ["회복루틴", "정서조절", "에너지관리", "수면", "리듬"],
    timingKeywords: [aspectNames[0] || "전환신호", aspectNames[1] || "관찰신호", "시기판단", "우선순위", "점검체계"],
  };
}

function uniqueList(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const key = clean(value).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(clean(value));
  }
  return out;
}

function buildSignals(localAstroChartJson, chapter, section, sectionIndex) {
  const chart = asObject(localAstroChartJson.chart);
  const planets = safeArray(chart.planets);
  const houses = safeArray(chart.houses);
  const aspects = safeArray(chart.aspects);
  const pickPlanets = planets.slice(sectionIndex, sectionIndex + 4).map((planet) => `${planet.name} ${planet.sign}`).filter(Boolean);
  const pickHouses = houses.slice(sectionIndex, sectionIndex + 3).map((house) => `${house.house}하우스 ${house.sign || "미확인"}`).filter(Boolean);
  const pickAspects = aspects.slice(sectionIndex, sectionIndex + 3).map((aspect) => `${aspect.planetA}-${aspect.planetB} ${aspect.type}`).filter(Boolean);
  const usedSignals = uniqueList([
    `${clean(chart.sunSign) || "태양 미확인"}`,
    `${clean(chart.moonSign) || "달 미확인"}`,
    `${clean(chart.ascendantSign) || "상승궁 미확인"}`,
    `${clean(chart.midheavenSign) || "MC 미확인"}`,
    ...pickPlanets,
    ...pickHouses,
    ...pickAspects,
    chapter.title,
    section.title,
  ]).slice(0, 12);

  return {
    usedSignals,
    usedPlanets: uniqueList(pickPlanets.map((text) => text.split(" ")[0])),
    usedHouses: uniqueList(pickHouses.map((text) => Number(text))).filter((n) => Number.isFinite(n)),
    usedAspects: uniqueList(pickAspects),
  };
}

function buildConsultingParagraph(signalText, chapterTitle, sectionTitle, index) {
  const p1 = `${chapterTitle}의 ${sectionTitle}에서는 ${signalText}를 중심 축으로 읽어야 합니다. 이 조합은 단일 사건 예측보다 선택의 방식과 감정 반응 패턴을 선명하게 보여 줍니다. 특히 반복적으로 나타나는 신호를 먼저 정리하면, 순간적인 기분이나 외부 압력에 휘둘리지 않고 본인에게 맞는 결정 기준을 세울 수 있습니다.`;
  const p2 = `실전에서는 좋은 흐름과 주의 구간을 동시에 관리해야 합니다. 강점 구간에서는 관계, 일, 돈의 우선순위를 한 번에 넓히기보다 검증 가능한 단위로 쪼개 실행하는 편이 결과가 안정적입니다. 반대로 긴장 신호가 올라오는 구간에서는 약속, 계약, 커뮤니케이션 속도를 낮추고 확인 루틴을 강화해야 손실을 줄일 수 있습니다.`;
  const p3 = `행동 전략은 단순해야 오래 유지됩니다. 첫째, 이번 주 핵심 목표를 하나만 정하고 성과 기준을 문장으로 기록합니다. 둘째, 중요한 대화나 협상 전에는 감정 상태를 점검해 불필요한 과잉 반응을 줄입니다. 셋째, 매주 같은 시간에 실행 결과를 되짚어 조정합니다. 이 세 가지를 반복하면 차트 신호가 말하는 성장 방향과 실제 생활이 일치하기 시작합니다.`;
  const p4 = `관계 관점에서는 경계와 온도를 함께 조절하는 것이 핵심입니다. 지나친 단정이나 감정적 확신은 오해를 키울 수 있으므로, 상대의 반응 속도와 맥락을 확인하며 협력의 폭을 조절해야 합니다. 직업과 재무에서는 확장과 보수의 스위치를 명확히 분리해 운영하는 것이 좋습니다. 같은 노력으로 더 큰 성과를 얻으려면 타이밍보다 구조를 먼저 정비해야 합니다.`;
  const p5 = `마지막으로 ${index + 1}번째 실행 포인트는 회복력 유지입니다. 일정이 흔들리는 주간에는 무리한 보완보다 리듬 복구를 우선하고, 수면과 이동 동선, 집중 시간을 재정렬해 에너지를 누수 없이 묶어야 합니다. 이렇게 운영하면 불확실성이 커지는 구간에서도 판단력이 유지되고, 장기 목표를 현실적으로 이어갈 수 있습니다.`;
  return [p1, p2, p3, p4, p5].join("\n\n");
}

function sanitizeBody(text) {
  let out = sanitizeAstroPremiumText(text);
  for (const pattern of FORBIDDEN_PATTERNS) out = out.replace(pattern, "");
  return out.replace(/\s{2,}/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
}

function ensureMinLength(text, minLength, appendix) {
  let out = sanitizeBody(text);
  if (out.length >= minLength) return out;
  while (out.length < minLength) {
    out = `${out}\n\n${appendix}`;
    out = sanitizeBody(out);
  }
  return out;
}

export function buildAstroLocalPremiumManuscript(localAstroChartJson) {
  const drafts = ASTRO_PREMIUM_CHAPTERS.map((chapter, chapterIndex) => {
    const sections = chapter.categories.map((category, sectionIndex) => {
      const signalPack = buildSignals(localAstroChartJson, chapter, category, sectionIndex + chapterIndex);
      const signalText = signalPack.usedSignals.slice(0, 6).join(" · ");
      const appendix = `${category.title}에서는 차트의 신호를 바탕으로 실행 가능한 습관과 의사결정 기준을 함께 설계해야 합니다. 같은 패턴이 반복될수록 원인을 단순화하고, 행동 단위를 작게 유지하며, 점검 간격을 일정하게 두는 운영법이 유효합니다.`;
      const body = ensureMinLength(
        buildConsultingParagraph(signalText || "핵심 차트 신호", chapter.title, category.title, sectionIndex),
        MIN_SECTION_LENGTH,
        appendix,
      );
      return {
        title: category.title,
        body,
        bullets: signalPack.usedSignals.slice(0, 5),
        localQuality: {
          minLengthPassed: body.length >= MIN_SECTION_LENGTH,
          usedPlanets: signalPack.usedPlanets,
          usedHouses: signalPack.usedHouses,
          usedAspects: signalPack.usedAspects,
          usedSignals: signalPack.usedSignals,
        },
      };
    });

    let chapterTextLength = sections.reduce((sum, section) => sum + clean(section.body).length, 0);
    if (chapterTextLength < MIN_CHAPTER_LENGTH) {
      const reinforce = `이 장의 핵심은 차트 신호를 현실 시간표에 반영하는 것입니다. 계획-실행-점검의 3단계를 반복해 결과를 축적하면 기회 구간에서는 속도를 높이고 주의 구간에서는 손실을 줄이는 균형을 만들 수 있습니다.`;
      sections[sections.length - 1].body = ensureMinLength(sections[sections.length - 1].body, MIN_SECTION_LENGTH + (MIN_CHAPTER_LENGTH - chapterTextLength), reinforce);
      chapterTextLength = sections.reduce((sum, section) => sum + clean(section.body).length, 0);
    }

    return {
      chapterNo: chapter.order,
      title: chapter.title,
      subtitle: `${chapter.roman}. ${chapter.title}`,
      sections,
      localQuality: {
        minLengthPassed: chapterTextLength >= MIN_CHAPTER_LENGTH,
        usedPlanets: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedPlanets))),
        usedHouses: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedHouses))),
        usedAspects: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedAspects))),
        usedSignals: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedSignals))),
      },
    };
  });

  return reinforceManuscriptLength(drafts);
}

function parseJsonMaybe(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const target = fenced ? fenced[1] : raw;
  const start = target.indexOf("{");
  const end = target.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(target.slice(start, end + 1));
  } catch (_error) {
    return null;
  }
}

function chapterPrompt(localAstroChartJson, chapterDraft) {
  const rules = [
    "너는 점성술 계산을 새로 하지 않는다.",
    "이미 제공된 localAstroChartJson과 localChapterDraft만 사용한다.",
    "챕터 수, 챕터 제목, 세부 섹션 제목을 절대 변경하지 않는다.",
    "PDF 본문에 JSON, payload, debug, fallback, 자동 복구 생성이라는 표현을 출력하지 않는다.",
    "각 섹션은 실제 차트 데이터에 근거한 상담문으로 작성한다.",
    "동일 문장 반복을 금지한다.",
    "계산값이 일부 부족해도 없는 정보를 지어내지 말고, 제공된 차트 신호 중심으로 자연스럽게 보강한다.",
    "반드시 JSON만 반환한다. 형식: {\"sections\":[{\"title\":\"...\",\"body\":\"...\"}]}",
  ].join("\n");

  return `${rules}\n\n${JSON.stringify({
    localAstroChartJson,
    localChapterDraft: {
      chapterNo: chapterDraft.chapterNo,
      title: chapterDraft.title,
      sections: chapterDraft.sections.map((section) => ({ title: section.title, body: section.body })),
    },
  })}`;
}

function validateLlmChapterOutput(chapterDraft, parsed) {
  const sections = safeArray(parsed?.sections);
  if (sections.length !== chapterDraft.sections.length) return null;
  const mergedSections = chapterDraft.sections.map((localSection, index) => {
    const llm = asObject(sections[index]);
    if (clean(llm.title) !== localSection.title) return null;
    const body = sanitizeBody(clean(llm.body));
    if (body.length < 240) return null;
    return {
      ...localSection,
      body: ensureMinLength(body, MIN_SECTION_LENGTH, localSection.body.slice(0, 220)),
    };
  });
  if (mergedSections.some((section) => !section)) return null;
  return {
    ...chapterDraft,
    sections: mergedSections,
    source: "llm",
  };
}

export async function enhanceAstroPremiumChaptersWithLLM(env, localAstroChartJson, localDrafts) {
  console.info("[AstroPremiumPDF][LLMEnhanceStart]", { chapterCount: localDrafts.length });

  const timeoutMs = Number(env.ASTRO_PREMIUM_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 26000);
  const totalTimeoutMs = Number(env.ASTRO_PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 32000);
  const retries = Number(env.ASTRO_PREMIUM_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 2);

  const settled = await Promise.allSettled(localDrafts.map(async (chapterDraft) => {
    const response = await callGeminiText(env, chapterPrompt(localAstroChartJson, chapterDraft), {
      modelEnvKeys: ["ASTRO_PREMIUM_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
      temperature: 0.68,
      maxOutputTokens: 4096,
      timeoutMs,
      totalTimeoutMs,
      maxAttemptsPerPair: retries,
    });
    if (!response?.ok) throw new Error(clean(response?.message || response?.error || "llm_request_failed"));
    const parsed = parseJsonMaybe(response?.text || response?.content || "");
    const normalized = validateLlmChapterOutput(chapterDraft, parsed);
    if (!normalized) throw new Error("llm_parse_or_schema_failed");
    return normalized;
  }));

  let fallbackUsed = false;
  const chapters = settled.map((item, index) => {
    if (item.status === "fulfilled") return item.value;
    fallbackUsed = true;
    return { ...localDrafts[index], source: "local" };
  });

  if (fallbackUsed) {
    console.warn("[AstroPremiumPDF][LLMEnhanceFailedUseLocal]", { chapterCount: chapters.length });
  } else {
    console.info("[AstroPremiumPDF][LLMEnhanceSuccess]", { chapterCount: chapters.length });
  }

  return { chapters, fallbackUsed };
}

function chapterLength(chapter) {
  return safeArray(chapter?.sections).reduce((sum, section) => sum + clean(section.body).length, 0);
}

function totalLength(chapters) {
  return safeArray(chapters).reduce((sum, chapter) => sum + chapterLength(chapter), 0);
}

function containsForbidden(text) {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(String(text || "")));
}

function repeatedSentenceCount(text) {
  const sentences = String(text || "")
    .split(/[.!?\n]/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 24);
  const map = new Map();
  for (const sentence of sentences) {
    map.set(sentence, (map.get(sentence) || 0) + 1);
  }
  return Math.max(0, ...Array.from(map.values()));
}

function reinforceManuscriptLength(chapters) {
  const updated = safeArray(chapters).map((chapter) => ({
    ...chapter,
    sections: safeArray(chapter.sections).map((section) => ({
      ...section,
      body: ensureMinLength(
        section.body,
        MIN_SECTION_LENGTH,
        `${section.title} 실행 팁: 차트 신호를 일상 루틴으로 변환할 때는 목표를 작게 시작하고, 주간 회고에서 개선 포인트를 하나씩 반영해 누적 성과를 만드세요.`,
      ),
    })),
  }));

  let currentTotal = totalLength(updated);
  if (currentTotal >= MIN_TOTAL_LENGTH) return updated;

  const supplement = "추가 실행 조언: 판단 기준을 명확히 문장화하고, 행동 결과를 수치와 기록으로 남기면 감정 기복이 큰 구간에서도 안정적인 의사결정을 유지할 수 있습니다.";
  let index = 0;
  while (currentTotal < MIN_TOTAL_LENGTH && updated.length > 0) {
    const chapter = updated[index % updated.length];
    const section = chapter.sections[index % chapter.sections.length];
    section.body = sanitizeBody(`${section.body}\n\n${supplement}`);
    index += 1;
    currentTotal = totalLength(updated);
  }
  return updated;
}

function validateFinalManuscript(localAstroChartJson, chapters) {
  const issues = [];
  const birthInput = asObject(localAstroChartJson?.birthInput);
  if (!clean(birthInput.birthDate)) issues.push("birthInput.birthDate");
  if (!Number.isFinite(Number(birthInput.birthHour))) issues.push("birthInput.birthHour");
  if (!clean(birthInput.timezone)) issues.push("birthInput.timezone");

  const chart = asObject(localAstroChartJson?.chart);
  if (!safeArray(chart.planets).length) issues.push("chart.planets");

  if (!Array.isArray(chapters) || chapters.length !== ASTRO_PREMIUM_CHAPTERS.length) {
    issues.push("chapterCount");
  }

  for (const chapter of safeArray(chapters)) {
    if (!Array.isArray(chapter.sections) || chapter.sections.length < 3) {
      issues.push(`chapter${chapter.chapterNo}.sections`);
      continue;
    }
    if (chapterLength(chapter) < MIN_CHAPTER_LENGTH) issues.push(`chapter${chapter.chapterNo}.length`);
    for (const section of chapter.sections) {
      const body = clean(section.body);
      if (body.length < MIN_SECTION_LENGTH) issues.push(`chapter${chapter.chapterNo}.${section.title}.length`);
      if (!body) issues.push(`chapter${chapter.chapterNo}.${section.title}.empty`);
      if (containsForbidden(body)) issues.push(`chapter${chapter.chapterNo}.${section.title}.forbidden`);
      if (repeatedSentenceCount(body) > 3) issues.push(`chapter${chapter.chapterNo}.${section.title}.repetition`);
    }
  }

  if (totalLength(chapters) < MIN_TOTAL_LENGTH) issues.push("totalLength");
  return { ok: issues.length === 0, issues };
}

function toLegacyPayload(localAstroChartJson) {
  return {
    user: {
      name: clean(localAstroChartJson?.birthInput?.name) || "사용자",
      birthDate: clean(localAstroChartJson?.birthInput?.birthDate),
      birthTime: clean(localAstroChartJson?.birthInput?.birthTime),
      birthPlace: clean(localAstroChartJson?.birthInput?.birthPlace),
      timezone: clean(localAstroChartJson?.birthInput?.timezone),
      gender: clean(localAstroChartJson?.birthInput?.gender),
    },
    chart: {
      sunSign: clean(localAstroChartJson?.chart?.sunSign),
      moonSign: clean(localAstroChartJson?.chart?.moonSign),
      ascendant: clean(localAstroChartJson?.chart?.ascendantSign),
      midheaven: clean(localAstroChartJson?.chart?.midheavenSign),
      planets: safeArray(localAstroChartJson?.chart?.planets),
      houses: safeArray(localAstroChartJson?.chart?.houses),
      aspects: safeArray(localAstroChartJson?.chart?.aspects),
    },
    interpretationSeeds: asObject(localAstroChartJson?.interpretationSeeds),
  };
}

function toLegacyChapters(chapterDrafts) {
  return safeArray(chapterDrafts).map((chapter, idx) => ({
    id: ASTRO_PREMIUM_CHAPTERS[idx]?.id || `chapter_${idx + 1}`,
    order: chapter.chapterNo,
    roman: ASTRO_PREMIUM_CHAPTERS[idx]?.roman || String(idx + 1),
    title: chapter.title,
    categories: safeArray(chapter.sections).map((section) => ({
      id: `${idx + 1}_${clean(section.title)}`,
      title: section.title,
      text: section.body,
      localSummary: section.body,
    })),
  }));
}

function renderAstroPremiumPdfFromDrafts(chapterDrafts, payload) {
  const name = sanitizeBody(payload?.user?.name) || "사용자";
  const birthDate = sanitizeBody(payload?.user?.birthDate) || "출생 정보";
  const toc = safeArray(chapterDrafts).map((chapter, idx) => `<li>${idx + 1}. ${sanitizeBody(chapter.title)}</li>`).join("");
  const chaptersHtml = safeArray(chapterDrafts).map((chapter, idx) => {
    const sectionHtml = safeArray(chapter.sections).map((section) => `
      <article class="sec-card">
        <h3>${sanitizeBody(section.title)}</h3>
        ${sanitizeBody(section.body).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}
      </article>
    `).join("");
    return `<section class="chapter"><h2>${idx + 1}. ${sanitizeBody(chapter.title)}</h2>${sectionHtml}</section>`;
  }).join("");

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${name} 프리미엄 점성술 리포트</title><style>
  body{margin:0;background:#060f1f;color:#dbe6ff;font-family:'Noto Serif KR',serif;line-height:1.8}
  main{max-width:980px;margin:0 auto;padding:30px 24px 64px}
  .cover,.toc,.chapter{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px;background:rgba(10,19,36,.88);margin-top:18px}
  .cover h1{margin:0 0 8px;font-size:2rem;color:#ffd88f}
  .cover p{margin:4px 0;color:#c7d6f5}
  .chapter h2{margin:0 0 12px;color:#ffe3a6}
  .sec-card{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;background:rgba(22,31,52,.82);margin-bottom:10px}
  .sec-card h3{margin:0 0 8px;color:#fff0c4}
  .sec-card p{margin:0 0 8px;color:#d8e4ff;white-space:pre-wrap}
  </style></head><body><main>
    <section class="cover"><h1>프리미엄 점성술 리포트</h1><p>태양·달·상승궁과 하우스 신호를 기반으로 한 실행형 상담문</p><p>${name} · ${birthDate}</p></section>
    <section class="toc"><h2>목차</h2><ol>${toc}</ol></section>
    ${chaptersHtml}
  </main></body></html>`;

  return {
    title: `${name} 프리미엄 점성술 리포트`,
    filename: `premium-astrology-${name.replace(/\s+/g, "-").toLowerCase()}.html`,
    html,
  };
}

export async function generateAstroPremiumReport(env, rawInput = {}) {
  const birthInput = normalizeAstroPremiumBirthInput(rawInput.birthInput || rawInput);
  const localAstroChartJson = rawInput.localAstroChartJson || buildAstroLocalChartJson(birthInput, rawInput.chart || rawInput.swissChart || {});

  console.info("[AstroPremiumPDF][LocalDraftBuildStart]", {
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    hasBirthDate: Boolean(clean(birthInput.birthDate)),
    hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
    hasTimezone: Boolean(clean(birthInput.timezone)),
    hasLocation: Boolean(clean(birthInput.birthPlace)),
    houseSystemUsed: true,
  });

  const localDrafts = buildAstroLocalPremiumManuscript(localAstroChartJson);
  console.info("[AstroPremiumPDF][LocalDraftBuildSuccess]", {
    chapterCount: localDrafts.length,
    totalLength: totalLength(localDrafts),
  });

  const enhanced = await enhanceAstroPremiumChaptersWithLLM(env, localAstroChartJson, localDrafts);
  let finalDrafts = reinforceManuscriptLength(enhanced.chapters);

  let validated = validateFinalManuscript(localAstroChartJson, finalDrafts);
  if (!validated.ok) {
    finalDrafts = reinforceManuscriptLength(localDrafts);
    validated = validateFinalManuscript(localAstroChartJson, finalDrafts);
  }

  console.info("[AstroPremiumPDF][FinalManuscriptValidated]", {
    ok: validated.ok,
    issueCount: validated.issues.length,
    chapterCount: finalDrafts.length,
    totalLength: totalLength(finalDrafts),
  });

  console.info("[AstroPremiumPDF][PdfRenderStart]", { chapterCount: finalDrafts.length });
  const payload = toLegacyPayload(localAstroChartJson);
  const pdfReady = renderAstroPremiumPdfFromDrafts(finalDrafts, payload);
  console.info("[AstroPremiumPDF][PdfRenderSuccess]", { chapterCount: finalDrafts.length });

  const chapters = toLegacyChapters(finalDrafts);
  return {
    payload,
    chapters,
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    fallbackUsed: Boolean(enhanced.fallbackUsed),
    pdfReady,
    localAstroChartJson,
    finalManuscript: finalDrafts,
    validation: validated,
  };
}

export function validateAstroPayloadForApi(rawInput = {}) {
  const input = normalizeAstroPremiumBirthInput(rawInput.birthInput || rawInput);
  const missing = [];
  const validation = validateAstroPremiumBirthInput(input);
  if (!validation.ok) missing.push(...validation.missing);
  return { ok: missing.length === 0, missing };
}
