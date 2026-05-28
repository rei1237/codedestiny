import { callGeminiText } from "./gemini.js";

export const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
export const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
export const SUKYO_PDF_CHAPTER_COUNT = 15;

const INTERNAL_TEXT_RE = /\b(?:payload|debug|engine|api|json|llm|fallback|localdraft)\b/gi;
const FORBIDDEN_PHRASES = [
  "자동 복구 생성",
  "Chapter 1 실패",
  "핵심 진단",
  "사용자 숙요 계산 데이터가 불완전합니다",
];

export const SUKYO_PDF_CHAPTERS = Object.freeze([
  { key: "chapter-01-my-host", order: 1, title: "나의 본명숙 — 태어날 때 새겨진 달의 별", sections: ["본명숙의 핵심 상징", "타고난 성격과 감정 반응", "사람들에게 보이는 첫인상", "본명숙이 알려주는 인생의 기본 리듬"] },
  { key: "chapter-02-partner-host", order: 2, title: "상대방의 본명숙 — 그 사람의 숨은 감정 코드", sections: ["상대방 숙의 핵심 상징", "상대방의 사랑 방식", "가까워질수록 드러나는 성향", "상대방을 이해하기 위한 핵심 키워드"] },
  { key: "chapter-03-relation-type", order: 3, title: "두 사람의 관계 타입 — 인연의 이름", sections: ["두 사람의 숙요 관계 분류", "관계 타입이 만드는 첫 끌림", "가까워질수록 생기는 장점", "관계 타입이 품은 위험 신호"] },
  { key: "chapter-04-distance", order: 4, title: "관계 거리 — 가까운 인연인가, 먼 인연인가", sections: ["근거리·중거리·원거리 관계 해석", "감정 밀도와 관계 속도", "너무 가까울 때 생기는 문제", "적절한 거리 조절법"] },
  { key: "chapter-05-first-attraction", order: 5, title: "첫 만남의 끌림 — 왜 서로에게 반응했는가", sections: ["첫인상에서 느끼는 매력", "본능적으로 끌리는 지점", "상대에게 투사하는 환상", "첫 끌림을 오래 유지하는 법"] },
  { key: "chapter-06-love-rhythm", order: 6, title: "연애 궁합 — 사랑할 때의 리듬", sections: ["연애 초반의 흐름", "애정 표현 방식의 차이", "서운함이 생기는 패턴", "사랑을 안정시키는 대화법"] },
  { key: "chapter-07-conflict", order: 7, title: "갈등 궁합 — 왜 반복해서 부딪히는가", sections: ["감정 충돌이 생기는 지점", "말투와 반응 속도의 차이", "질투, 불안, 집착의 가능성", "싸운 뒤 회복하는 방법"] },
  { key: "chapter-08-past-life", order: 8, title: "전생 인연 — 다시 만난 이유", sections: ["숙요점으로 보는 전생적 연결감", "이유 없이 익숙한 감정의 정체", "이번 생에서 반복되는 관계 숙제", "인연을 소모하지 않고 성장시키는 법"] },
  { key: "chapter-09-intimacy", order: 9, title: "속궁합과 스킨십 리듬 — 가까워지는 방식", sections: ["정서적 친밀감의 속도", "스킨십에 대한 감각 차이", "안정감과 설렘의 균형", "부담 없이 가까워지는 방법"] },
  { key: "chapter-10-long-term", order: 10, title: "결혼·장기 관계 가능성 — 함께 살아갈 수 있는가", sections: ["장기 관계에서의 안정성", "생활 습관과 가치관의 조화", "결혼 후 강해지는 장점", "오래 가기 위해 반드시 조율할 점"] },
  { key: "chapter-11-money-reality", order: 11, title: "돈과 현실 궁합 — 생활 감각의 차이", sections: ["돈을 대하는 태도 차이", "소비와 저축의 궁합", "현실 문제 앞에서의 협력도", "함께 기반을 만드는 전략"] },
  { key: "chapter-12-work-growth", order: 12, title: "일과 목표 궁합 — 서로의 성장을 돕는가", sections: ["상대가 나의 목표에 주는 영향", "함께할 때 강해지는 능력", "서로의 성취를 방해하는 패턴", "응원과 간섭의 경계선"] },
  { key: "chapter-13-signature", order: 13, title: "재미 요소 리포트 — 우리 관계의 별명과 시그니처", sections: ["두 사람의 관계 별명", "관계를 상징하는 이미지", "우리만의 궁합 키워드", "관계 시그니처 문장"] },
  { key: "chapter-14-risk-recovery", order: 14, title: "위험 신호와 회복 전략 — 무너지지 않는 관계 사용법", sections: ["이 관계에서 가장 조심할 점", "관계가 흔들리는 타이밍", "연락, 거리, 감정 표현의 회복법", "헤어짐을 막는 현실적 체크리스트"] },
  { key: "chapter-15-final", order: 15, title: "최종 궁합 판정 — 이 인연을 어떻게 살릴 것인가", sections: ["전체 궁합 요약", "강점과 약점의 균형", "지금 가장 중요한 선택", "앞으로의 관계 운영 전략"] },
]);

const CHAPTER_SEED_KEYS = Object.freeze({
  1: ["userSukyo", "userProfile"],
  2: ["partnerSukyo", "partnerProfile"],
  3: ["relationType", "roles", "compatibilityIndex"],
  4: ["distance", "distanceMetrics"],
  5: ["attraction", "elementHarmony"],
  6: ["lovePattern", "communicationScore"],
  7: ["conflictPattern", "conflictScore"],
  8: ["karmicTheme", "relationType"],
  9: ["intimacyPattern", "distance"],
  10: ["longTermPotential", "stabilityScore"],
  11: ["moneyReality", "elementHarmony"],
  12: ["growthSupport", "growthScore"],
  13: ["relationNickname", "signaturePhrase"],
  14: ["riskSignals", "recoveryStrategy"],
  15: ["summary", "operatingStrategy"],
});

function text(value, fallback = "") {
  const out = String(value == null ? "" : value).trim();
  return out || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter((item) => text(item)) : [];
}

function safeNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeSukyoPremiumText(value) {
  let out = text(value)
    .replace(INTERNAL_TEXT_RE, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/\bChapter\s*\d+\s*실패\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  for (const phrase of FORBIDDEN_PHRASES) out = out.split(phrase).join("");
  return out.trim();
}

export function isLowQualityShukuyoSection(value) {
  const body = text(value).toLowerCase();
  if (!body) return true;
  if (FORBIDDEN_PHRASES.some((phrase) => body.includes(phrase.toLowerCase()))) return true;
  if (/\b(payload|debug|engine|json|llm|fallback)\b/i.test(body)) return true;
  const sentences = body.split(/[.!?。？！\n]+/).map((s) => s.trim()).filter((s) => s.length >= 24);
  return new Set(sentences).size < Math.min(sentences.length, 2) && sentences.length > 2;
}

function normalizeMode(raw) {
  const mode = text(raw).toLowerCase();
  return mode.includes("compat") || mode.includes("couple") ? "compatibility" : "compatibility";
}

export function getSukyoPdfChapters() {
  return SUKYO_PDF_CHAPTERS.map((chapter) => ({
    key: chapter.key,
    order: chapter.order,
    title: chapter.title,
    sections: chapter.sections.slice(),
  }));
}

function normalizeProfile(raw = {}) {
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  return {
    name: text(raw.name || profile.name, "사용자"),
    birthDate: text(raw.birthDate || profile.birthDate),
    birthTime: text(raw.birthTime || profile.birthTime),
    calendarType: text(raw.calendarType || profile.calendarType || profile.calType || "solar"),
    gender: text(raw.gender || profile.gender),
  };
}

function normalizeSukuyo(raw = {}) {
  const source = raw.sukuyo && typeof raw.sukuyo === "object" ? raw.sukuyo : raw;
  return {
    index: safeNumber(source.index ?? source.mansionIdx ?? source.mansionNumber ?? source.user宿Index ?? source.partner宿Index),
    nameKo: text(source.nameKo || source.mansion || source.name || source.user宿 || source.partner宿).replace(/宿$/u, ""),
    nameHan: text(source.nameHan || source.han || source.宿),
    symbol: text(source.symbol || source.archetypeTitle || source.category),
    element: text(source.element),
    direction: text(source.direction),
    animalSymbol: text(source.animalSymbol),
    archetypeTitle: text(source.archetypeTitle),
    traits: safeArray(source.traits || source.keywords),
    strengths: safeArray(source.strengths),
    shadows: safeArray(source.shadows),
  };
}

export function normalizeShukuyoPdfPayload(raw = {}) {
  const mode = normalizeMode(raw.mode || raw.reportMode);
  const user = normalizeProfile(raw.user || raw.sukuyoBookContext?.user || {});
  const partner = normalizeProfile(raw.partner || raw.sukuyoBookContext?.partner || {});
  const result = raw.sukuyoResult || raw.compatibility || raw.sukuyoBookContext?.compatibility || {};
  const userSukuyo = normalizeSukuyo(raw.userSukyo || raw.sukuyoBookContext?.user?.sukuyo || result.user || {
    user宿: result.user宿,
    user宿Index: result.user宿Index,
  });
  const partnerSukuyo = normalizeSukuyo(raw.partnerSukyo || raw.sukuyoBookContext?.partner?.sukuyo || result.partner || {
    partner宿: result.partner宿,
    partner宿Index: result.partner宿Index,
  });
  return {
    mode,
    user,
    partner,
    sukuyoResult: {
      user宿: text(result.user宿 || userSukuyo.nameKo),
      user宿Index: safeNumber(result.user宿Index ?? userSukuyo.index),
      partner宿: text(result.partner宿 || partnerSukuyo.nameKo),
      partner宿Index: safeNumber(result.partner宿Index ?? partnerSukuyo.index),
      relationshipType: text(result.relationshipType || result.relationType || result.type),
      distance: text(result.distance || result.distanceLabel),
      summary: text(result.summary || result.relationSummary),
      strengths: safeArray(result.strengths),
      risks: safeArray(result.risks || result.shadows),
      advice: safeArray(result.advice || result.recoveryStrategy),
    },
  };
}

export function validateSukyoPdfInput(raw = {}) {
  const normalized = normalizeShukuyoPdfPayload(raw);
  const hardMissingFields = [];
  const softMissingFields = [];
  const userHasBirth = Boolean(normalized.user.birthDate);
  const userHasSukuyo = Boolean(normalized.sukuyoResult.user宿 || normalized.sukuyoResult.user宿Index != null);
  const partnerHasBirth = Boolean(normalized.partner.birthDate);
  const partnerHasSukuyo = Boolean(normalized.sukuyoResult.partner宿 || normalized.sukuyoResult.partner宿Index != null);

  if (!userHasBirth && !userHasSukuyo) hardMissingFields.push("user.birthDate");
  if (!text(normalized.user.birthTime)) softMissingFields.push("user.profile.birthTime");
  if (!partnerHasBirth && !partnerHasSukuyo) hardMissingFields.push("partner.birthDate");
  if (!text(normalized.partner.birthTime)) softMissingFields.push("partner.profile.birthTime");
  if (!text(normalized.sukuyoResult.relationshipType)) hardMissingFields.push("compatibility.relationType");

  return {
    canGenerate: hardMissingFields.length === 0,
    reportMode: "compatibility",
    hardMissingFields,
    softMissingFields,
    payloadValidation: { missingFields: hardMissingFields.slice() },
  };
}

function relationNickname(seed) {
  const rel = text(seed?.compatibility?.relationType, "달빛 인연");
  const distance = text(seed?.compatibility?.distance, "중거리");
  const a = text(seed?.userSukyo?.nameKo, "나");
  const b = text(seed?.partnerSukyo?.nameKo, "상대");
  if (rel === "안괴") return `${a}와 ${b}의 번개 같은 성장 인연`;
  if (rel === "영친") return `${a}와 ${b}의 서로를 키우는 달빛 인연`;
  if (rel === "업태") return `${a}와 ${b}의 오래된 숙제 인연`;
  if (rel === "위성") return `${a}와 ${b}의 목표를 비추는 ${distance} 인연`;
  return `${a}와 ${b}의 ${rel} ${distance} 인연`;
}

function signaturePhrase(seed) {
  const rel = text(seed?.compatibility?.relationType, "관계");
  const distance = text(seed?.compatibility?.distance, "거리");
  return `${rel}의 끌림은 살리고, ${distance}의 호흡은 서로에게 맞추는 관계`;
}

export function buildSukyoPdfSeed(input = {}) {
  const canonical = input.canonical || {};
  const personA = canonical.personA || {};
  const personB = canonical.personB || {};
  const comp = canonical.compatibility || input.compatibility || {};
  const matrix = canonical.relationshipMatrix || {};
  const userProfile = normalizeProfile(input.userProfile || input.user || personA || {});
  const partnerProfile = normalizeProfile(input.partnerProfile || input.partner || personB || {});
  const userSukyo = normalizeSukuyo(input.userSukyo || personA.sukuyo || {});
  const partnerSukyo = normalizeSukuyo(input.partnerSukyo || personB.sukuyo || {});
  const compatibility = {
    relationType: text(comp.relationType),
    relationTypeHan: text(comp.relationTypeHan),
    distance: text(comp.distanceLabel),
    forwardDistance: safeNumber(comp.forwardDistance),
    reverseDistance: safeNumber(comp.reverseDistance),
    shortestDistance: safeNumber(comp.shortestDistance),
    aRole: text(comp.aRole),
    bRole: text(comp.bRole),
    attractionLevel: safeNumber(comp.chemistryScore),
    conflictLevel: safeNumber(comp.conflictScore),
    stabilityScore: safeNumber(comp.stabilityScore),
    growthScore: safeNumber(comp.growthScore),
    communicationScore: safeNumber(comp.communicationScore),
    compatibilityIndex: safeNumber(comp.compatibilityIndex),
    elementHarmony: comp.elementHarmony || null,
    roleActionGuide: comp.roleActionGuide || null,
    strengthShadowMap: comp.strengthShadowMap || null,
    relationVariant: text(comp.relationVariant),
    relationNickname: "",
    signaturePhrase: "",
    karmicTheme: text(matrix?.emotionalPattern?.summary || comp.summary),
    longTermPotential: text(matrix?.longTermPotential?.summary),
  };
  const seed = {
    mode: "compatibility",
    userProfile,
    partnerProfile,
    userSukyo,
    partnerSukyo,
    compatibility,
    interpretationSeeds: {
      firstAttraction: [text(matrix?.attractionPattern?.summary), text(comp.summary)].filter(Boolean),
      lovePattern: [text(matrix?.emotionalPattern?.summary), text(comp.roleActionGuide?.meAction)].filter(Boolean),
      conflictPattern: [text(matrix?.conflictPattern?.summary), text(comp.roleActionGuide?.resetLine)].filter(Boolean),
      pastLifeBond: [text(compatibility.karmicTheme), text(comp.relationVariant)].filter(Boolean),
      intimacyPattern: [text(matrix?.recoveryPattern?.summary), text(comp.distanceMetrics?.tensionBand)].filter(Boolean),
      marriagePotential: [text(matrix?.marriagePotential?.summary), text(compatibility.longTermPotential)].filter(Boolean),
      moneyReality: [text(matrix?.businessPotential?.summary), text(comp.elementHarmony?.summary)].filter(Boolean),
      growthSupport: [text(comp.strengthShadowMap?.complementSummary), text(comp.roleActionGuide?.otherAction)].filter(Boolean),
      riskSignals: [text(matrix?.conflictPattern?.summary), text(comp.strengthShadowMap?.a?.shadow), text(comp.strengthShadowMap?.b?.shadow)].filter(Boolean),
      recoveryStrategy: [text(matrix?.recoveryPattern?.summary), text(comp.roleActionGuide?.resetLine)].filter(Boolean),
    },
  };
  seed.compatibility.relationNickname = relationNickname(seed);
  seed.compatibility.signaturePhrase = signaturePhrase(seed);
  seed.chapters = buildSukyoLocalSkeleton(seed);
  return seed;
}

function seedDigest(seed, chapter, sectionTitle) {
  const c = seed.compatibility || {};
  const user = seed.userSukyo || {};
  const partner = seed.partnerSukyo || {};
  const base = [
    `${text(user.nameKo, "나")}宿(${text(user.nameHan, "")})`,
    `${text(partner.nameKo, "상대")}宿(${text(partner.nameHan, "")})`,
    `${text(c.relationType, "관계")} ${text(c.distance, "거리")}`,
    c.compatibilityIndex != null ? `궁합 지수 ${c.compatibilityIndex}` : "",
  ].filter(Boolean).join(" · ");
  const keys = CHAPTER_SEED_KEYS[chapter.order] || [];
  const extra = keys.map((key) => {
    if (key === "relationNickname") return c.relationNickname;
    if (key === "signaturePhrase") return c.signaturePhrase;
    if (key === "distanceMetrics") return c.shortestDistance != null ? `최단 거리 ${c.shortestDistance}` : "";
    if (key === "elementHarmony") return text(c.elementHarmony?.summary);
    if (key === "roles") return [c.aRole, c.bRole].filter(Boolean).join("/");
    if (key === "riskSignals") return safeArray(seed.interpretationSeeds?.riskSignals).join(" · ");
    if (key === "recoveryStrategy") return safeArray(seed.interpretationSeeds?.recoveryStrategy).join(" · ");
    return text(c[key]) || safeArray(seed.interpretationSeeds?.[key]).join(" · ");
  }).filter(Boolean).join(" · ");
  return sanitizeSukyoPremiumText(`${sectionTitle}: ${base}. ${extra}`);
}

function localSectionText(seed, chapter, sectionTitle, sectionIndex) {
  const digest = seedDigest(seed, chapter, sectionTitle);
  const rel = text(seed?.compatibility?.relationType, "관계");
  const distance = text(seed?.compatibility?.distance, "거리");
  const action = text(seed?.compatibility?.roleActionGuide?.resetLine, "감정이 커질수록 대화 시간을 짧게 나누고, 사실과 감정을 분리해 확인하는 편이 안정적입니다.");
  const variants = [
    `현재 계산된 숙요점 관계에서 확인되는 범위에서는 ${digest} 이 흐름이 가장 먼저 보입니다. ${rel} 관계는 끌림과 역할 기대가 동시에 움직이므로, 상대가 다르게 반응할 때 성격 문제로 단정하기보다 관계 구조의 리듬으로 읽는 편이 좋습니다.`,
    `${distance}의 거리감은 두 사람이 가까워지는 속도와 회복 시간을 결정합니다. 이 항목에서는 감정을 오래 붙잡기보다 서로가 받아들일 수 있는 표현 방식으로 바꾸는 것이 핵심입니다. ${action}`,
    `두 사람의 숙은 같은 언어를 쓰는 부분과 전혀 다른 속도로 반응하는 부분을 함께 드러냅니다. ${sectionTitle}에서는 강한 끌림을 유지하되, 과열되는 순간에는 약속·연락·거리의 기준을 짧고 명확하게 정하는 전략이 필요합니다.`,
    `이 관계를 오래 살리려면 좋고 나쁨의 판정보다 운영법이 중요합니다. ${digest} 이 신호를 기준으로, 한 사람은 서두르는 지점을 늦추고 다른 한 사람은 회피하는 지점을 말로 확인해야 관계의 체감 안정도가 올라갑니다.`,
  ];
  return sanitizeSukyoPremiumText(variants[sectionIndex % variants.length]);
}

export function buildSukyoLocalSkeleton(seed = {}) {
  return SUKYO_PDF_CHAPTERS.map((chapter) => ({
    key: chapter.key,
    order: chapter.order,
    title: chapter.title,
    sections: chapter.sections.map((heading, index) => ({
      heading,
      localSummary: seedDigest(seed, chapter, heading),
      body: localSectionText(seed, chapter, heading, index),
    })),
  }));
}

export function sanitizeSukyoChapterJson(chapter = {}, source = {}, seed = {}) {
  const sectionTitles = Array.isArray(chapter.sections) ? chapter.sections : [];
  const sections = sectionTitles.map((section, index) => {
    const heading = text(section.heading || section.title || section, `세부 카테고리 ${index + 1}`);
    const rawBody = text(section.body || section.text || source?.sections?.[index]?.body || "");
    return { heading, body: sanitizeSukyoPremiumText(rawBody), fallbackUsed: false };
  });
  return {
    key: text(chapter.key || source.key),
    order: safeNumber(chapter.order || source.order),
    title: text(chapter.title || source.title),
    summary: sanitizeSukyoPremiumText(source.summary || ""),
    coreReading: sanitizeSukyoPremiumText(source.coreReading || ""),
    sections,
    fallbackUsed: false,
    seed,
  };
}

export function buildSukyoGeminiPrompt(seed, chapters) {
  return JSON.stringify({
    role: "숙요점 27宿 궁합 상담가",
    instruction: [
      "제공된 숙요점 계산 결과만 근거로 사용한다.",
      "본인 숙, 상대방 숙, 관계 타입, 거리, 역할, 지수, seed를 바탕으로 해석문만 보강한다.",
      "챕터 제목과 세부 카테고리 제목을 변경하지 않는다.",
      "각 세부 카테고리는 2~4문단의 완성형 상담문으로 작성한다.",
      "내부 JSON, payload, engine, debug, API, LLM 같은 단어를 본문에 쓰지 않는다.",
      "반복 문장과 공포 조장을 피하고, 대화법·거리 조절·회복 전략을 구체적으로 쓴다.",
      "반드시 JSON만 출력한다. 코드펜스는 쓰지 않는다.",
    ],
    seed: {
      mode: seed.mode,
      userProfile: seed.userProfile,
      partnerProfile: seed.partnerProfile,
      userSukyo: seed.userSukyo,
      partnerSukyo: seed.partnerSukyo,
      compatibility: seed.compatibility,
      interpretationSeeds: seed.interpretationSeeds,
    },
    chapters: chapters.map((chapter) => ({
      key: chapter.key,
      order: chapter.order,
      title: chapter.title,
      sections: chapter.sections.map((section) => ({ heading: section.heading, localSummary: section.localSummary })),
    })),
    outputSchema: { chapters: [{ key: "string", order: "number", title: "string", sections: [{ heading: "string", body: "string" }] }] },
  });
}

function parseJsonMaybe(value) {
  try { return JSON.parse(text(value)); } catch (_) { return null; }
}

export function parseSukyoGeminiChapterResponse(value) {
  const parsed = parseJsonMaybe(value);
  return Array.isArray(parsed?.chapters) ? parsed.chapters : null;
}

function validateChapterShape(chapters) {
  if (!Array.isArray(chapters) || chapters.length !== SUKYO_PDF_CHAPTERS.length) return false;
  return SUKYO_PDF_CHAPTERS.every((spec, index) => {
    const chapter = chapters[index];
    if (!chapter || chapter.key !== spec.key || Number(chapter.order) !== spec.order || chapter.title !== spec.title) return false;
    if (!Array.isArray(chapter.sections) || chapter.sections.length !== spec.sections.length) return false;
    return spec.sections.every((heading, sectionIndex) => {
      const section = chapter.sections[sectionIndex];
      return section && section.heading === heading && text(section.body) && !isLowQualityShukuyoSection(section.body);
    });
  });
}

export async function enhanceSukyoChaptersWithLLM(env, seed, skeleton) {
  const prompt = buildSukyoGeminiPrompt(seed, skeleton);
  try {
    const result = await callGeminiText(env, prompt, {
      modelEnvKeys: ["SUKYO_PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
      temperature: 0.72,
      maxOutputTokens: 16000,
      timeoutMs: 24000,
      totalTimeoutMs: 30000,
    });
    if (!result?.ok) return { chapters: buildSukyoFallbackChapters(seed, skeleton), fallbackUsed: true };
    const parsed = parseSukyoGeminiChapterResponse(result.text);
    if (!validateChapterShape(parsed)) return { chapters: buildSukyoFallbackChapters(seed, skeleton), fallbackUsed: true };
    return {
      chapters: parsed.map((chapter) => ({
        ...chapter,
        sections: chapter.sections.map((section) => ({ ...section, body: sanitizeSukyoPremiumText(section.body) })),
      })),
      fallbackUsed: false,
    };
  } catch (_) {
    return { chapters: buildSukyoFallbackChapters(seed, skeleton), fallbackUsed: true };
  }
}

export function buildSukyoFallbackChapters(seed, skeleton) {
  return (Array.isArray(skeleton) && skeleton.length ? skeleton : buildSukyoLocalSkeleton(seed)).map((chapter) => ({
    key: chapter.key,
    order: chapter.order,
    title: chapter.title,
    sections: chapter.sections.map((section, index) => ({
      heading: section.heading,
      body: sanitizeSukyoPremiumText(section.body || section.localSummary || localSectionText(seed, chapter, section.heading, index)),
    })),
  }));
}

export function renderSukyoChapterMarkdown(chapter = {}) {
  const lines = [`## ${text(chapter.title)}`];
  for (const section of Array.isArray(chapter.sections) ? chapter.sections : []) {
    lines.push(`### ${text(section.heading)}`);
    lines.push(sanitizeSukyoPremiumText(section.body));
  }
  return lines.join("\n\n");
}

export function renderSukyoPremiumPdf(chapters, seed) {
  const safeName = sanitizeSukyoPremiumText(seed?.userProfile?.name) || "사용자";
  const partnerName = sanitizeSukyoPremiumText(seed?.partnerProfile?.name) || "상대방";
  const rel = sanitizeSukyoPremiumText(seed?.compatibility?.relationType) || "관계";
  const distance = sanitizeSukyoPremiumText(seed?.compatibility?.distance) || "거리";
  const userHost = `${sanitizeSukyoPremiumText(seed?.userSukyo?.nameKo) || "?"}宿`;
  const partnerHost = `${sanitizeSukyoPremiumText(seed?.partnerSukyo?.nameKo) || "?"}宿`;
  const toc = chapters.map((chapter) => `<li><span>Chapter ${chapter.order}</span>${escapeHtml(chapter.title)}</li>`).join("");
  const chapterHtml = chapters.map((chapter) => {
    const sections = chapter.sections.map((section) => `
      <article class="section-card">
        <h3>${escapeHtml(section.heading)}</h3>
        <p>${escapeHtml(sanitizeSukyoPremiumText(section.body)).replace(/\n/g, "<br>")}</p>
      </article>`).join("");
    return `
      <section class="chapter">
        <p class="chapter-kicker">Chapter ${chapter.order}</p>
        <h2>${escapeHtml(chapter.title)}</h2>
        <div class="section-grid">${sections}</div>
      </section>`;
  }).join("");
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} x ${escapeHtml(partnerName)} 숙요점 프리미엄 궁합 리포트</title>
<style>
@page{margin:18mm 14mm}*{box-sizing:border-box}body{margin:0;background:#070817;color:#f7eefc;font-family:'Noto Serif KR','Gowun Dodum',serif;line-height:1.78}main{max-width:980px;margin:0 auto;padding:34px 24px 72px}.cover{min-height:720px;border:1px solid rgba(216,180,254,.34);border-radius:18px;padding:34px;background:radial-gradient(circle at 18% 8%,rgba(244,194,255,.25),transparent 32%),linear-gradient(145deg,#0a1029 0%,#251044 50%,#070817 100%);page-break-after:always}.cover img{width:min(420px,92%);display:block;margin:22px auto;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:#15122a}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#f7c7ff;font-size:12px}.cover h1{margin:10px 0 8px;font-size:38px;color:#fff7fb}.cover .subtitle{font-size:18px;color:#ffd7ef;margin:0 0 18px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:24px 0}.summary div{border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px;background:rgba(14,20,45,.72)}.summary strong{display:block;color:#ffe8a3}.intro,.toc,.chapter{border:1px solid rgba(216,180,254,.22);border-radius:14px;background:rgba(13,18,40,.88);padding:20px;margin:22px 0;page-break-inside:avoid}.toc ol{columns:2;gap:28px}.toc li{break-inside:avoid;margin:0 0 8px;color:#eee1ff}.toc li span{color:#f9c6ff;margin-right:8px}.chapter{page-break-before:always}.chapter-kicker{margin:0 0 6px;color:#f8c8ff;letter-spacing:.12em;text-transform:uppercase}.chapter h2{margin:0 0 16px;color:#fff4c2;font-size:24px}.section-grid{display:grid;grid-template-columns:1fr;gap:12px}.section-card{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;background:linear-gradient(180deg,rgba(64,38,92,.72),rgba(18,24,48,.86))}.section-card h3{margin:0 0 8px;color:#ffd6f6;font-size:17px}.section-card p{margin:0;color:#f4edf7;white-space:normal}.notice{color:#d8c8ed;font-size:13px}@media print{body{background:#070817}.cover,.chapter{break-after:page}.toc ol{columns:1}}
</style>
</head>
<body>
<main>
  <section class="cover">
    <p class="eyebrow">SUKYO COMPATIBILITY PREMIUM</p>
    <h1>숙요점 프리미엄 궁합 리포트</h1>
    <p class="subtitle">27개의 달별로 읽는 두 사람의 인연 지도</p>
    <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄 궁합 리포트 표지" onerror="this.style.display='none'">
    <div class="summary">
      <div><strong>본인 숙</strong>${escapeHtml(userHost)}</div>
      <div><strong>상대방 숙</strong>${escapeHtml(partnerHost)}</div>
      <div><strong>관계 타입</strong>${escapeHtml(rel)}</div>
      <div><strong>관계 거리</strong>${escapeHtml(distance)}</div>
    </div>
    <p class="notice">이 리포트는 계산된 본명숙과 두 사람의 관계 타입, 거리, 역할 구조를 바탕으로 작성되었습니다. 단정 예언이 아니라 관계를 더 잘 운영하기 위한 상담형 해석입니다.</p>
  </section>
  <section class="intro"><h2>숙요점 27숙 안내</h2><p>숙요점은 달의 길 위에 놓인 27개의 별자리 숙을 통해 사람의 기질과 관계 리듬을 읽는 체계입니다. 이 문서는 본인과 상대방의 본명숙, 관계 타입, 거리감을 먼저 계산한 뒤 사랑과 갈등, 현실 조율, 회복 전략을 15챕터로 정리합니다.</p></section>
  <section class="toc"><h2>15챕터 목차</h2><ol>${toc}</ol></section>
  ${chapterHtml}
</main>
</body>
</html>`;
  return {
    title: `${safeName} x ${partnerName} 숙요점 프리미엄 궁합 리포트`,
    filename: `sukyo-premium-compat-${safeName}-${partnerName}.html`.replace(/\s+/g, "-"),
    html,
  };
}

export async function generateSukyoPremiumReport(env, seed) {
  const skeleton = Array.isArray(seed?.chapters) && seed.chapters.length === SUKYO_PDF_CHAPTER_COUNT
    ? seed.chapters
    : buildSukyoLocalSkeleton(seed);
  const enhanced = await enhanceSukyoChaptersWithLLM(env, seed, skeleton);
  const chapters = enhanced.fallbackUsed ? buildSukyoFallbackChapters(seed, skeleton) : enhanced.chapters;
  return {
    payload: { ...seed, chapters },
    chapters,
    chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    fallbackUsed: Boolean(enhanced.fallbackUsed),
    pdfReady: renderSukyoPremiumPdf(chapters, seed),
  };
}
