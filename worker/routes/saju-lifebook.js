import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    roman: "I",
    title: "🌌 사주 원국 완전 해설 — 팔자 8글자의 비밀",
    subtitle: "원국 8글자의 구조와 반복 패턴을 해독하는 시작 장",
    categories: ["년주·월주·일주·시주의 역할", "일간과 일지의 핵심 성향", "원국 전체의 첫인상", "인생에서 반복되는 기본 패턴", "타고난 기질과 삶의 방향성"],
  },
  {
    id: "02",
    roman: "II",
    title: "🏛️ 나의 설계도 — 월지·일간·조후와 기질의 뿌리",
    subtitle: "월지·일간·조후를 중심으로 기질의 뿌리를 정리하는 장",
    categories: ["월지 중심의 계절 에너지", "일간의 강약과 생존 방식", "조후상 필요한 기운", "정서적 온도와 행동 패턴", "삶을 편하게 만드는 환경 조건"],
  },
  {
    id: "03",
    roman: "III",
    title: "⚔️ 숨겨진 무기 — 용신·희신과 나만의 필살기",
    subtitle: "용신·희신 운용법과 반복 문제를 전환하는 실행 장",
    categories: ["용신 후보와 실제 활용 방향", "희신이 열어주는 기회", "기신·구신으로 인한 반복 문제", "나에게 맞는 성장 전략", "현실에서 써먹는 개운 포인트"],
  },
  {
    id: "04",
    roman: "IV",
    title: "🌀 대운 정밀 분석 — 인생의 큰 파도",
    subtitle: "대운 흐름에서 기회와 리스크를 읽는 장",
    categories: ["현재 대운의 핵심 주제", "과거 대운에서 형성된 성향", "다음 대운의 기회와 리스크", "대운 전환기의 주의점", "인생의 큰 흐름 로드맵"],
  },
  {
    id: "05",
    roman: "V",
    title: "👑 격국과 사회적 소명 — 나의 성공 방정식",
    subtitle: "격국·직업성·브랜딩을 연결해 소명을 설계하는 장",
    categories: ["격국 구조 분석", "사회적으로 인정받는 방식", "직업적 강점과 약점", "명예·성과·브랜딩 방향", "내가 세상에 제공할 수 있는 가치"],
  },
  {
    id: "06",
    roman: "VI",
    title: "🤝 관계의 전략 — 인연의 법칙과 파트너십",
    subtitle: "관계 패턴과 갈등 해소 전략을 정밀하게 다루는 장",
    categories: ["인간관계에서 반복되는 패턴", "도움 되는 사람과 소모시키는 사람", "가족·동료·친구 관계의 핵심", "관계에서 생기는 오해와 갈등", "좋은 인연을 유지하는 방식"],
  },
  {
    id: "07",
    roman: "VII",
    title: "💑 연애·결혼 완전 분석 — 사랑의 구조",
    subtitle: "연애 성향부터 결혼 운용까지 사랑의 구조를 푸는 장",
    categories: ["연애 성향", "끌리는 상대의 특징", "결혼운과 배우자궁", "이별 패턴과 회복 방식", "오래가는 사랑을 위한 전략"],
  },
  {
    id: "08",
    roman: "VIII",
    title: "💰 재물과 현실 기반 — 돈이 모이는 구조",
    subtitle: "재성 구조와 현실 자산 운영을 정리하는 장",
    categories: ["재성 구조와 돈 버는 방식", "소비·저축·투자 성향", "사업성/직장성 판단", "돈이 새는 패턴", "재물운을 키우는 현실 전략"],
  },
  {
    id: "09",
    roman: "IX",
    title: "🧭 직업·사업·커리어 — 세상에서 살아남는 무기",
    subtitle: "적성, 업무 환경, 장기 커리어 생존 전략을 다루는 장",
    categories: ["적성 직업군", "조직형/프리랜서형/사업형 판단", "성과가 나는 업무 환경", "피해야 할 커리어 패턴", "장기적 커리어 설계"],
  },
  {
    id: "10",
    roman: "X",
    title: "🩺 건강·멘탈·에너지 관리 — 무너지지 않는 몸과 마음",
    subtitle: "오행 불균형과 번아웃 패턴을 관리하는 장",
    categories: ["오행 불균형으로 보는 건강 취약점", "스트레스 반응", "번아웃 패턴", "생활 리듬 처방", "멘탈 회복 루틴"],
  },
  {
    id: "11",
    roman: "XI",
    title: "🔮 신살과 특수 기운 — 운명의 숨은 장치",
    subtitle: "도화·역마·화개·귀문 등 신살을 실전적으로 운용하는 장",
    categories: ["도화·역마·화개·귀문 등 주요 신살", "신살이 삶에서 나타나는 방식", "장점으로 쓰는 법", "위험하게 작동하는 상황", "실전 조절법"],
  },
  {
    id: "12",
    roman: "XII",
    title: "📅 세운·월운 활용법 — 가까운 미래 전략",
    subtitle: "올해와 월별 흐름을 행동 계획으로 전환하는 장",
    categories: ["올해의 핵심 흐름", "월별 주의 포인트", "기회가 강한 시기", "피해야 할 결정 타이밍", "현실적인 12개월 행동 전략"],
  },
  {
    id: "13",
    roman: "XIII",
    title: "🕯️ 최종 인생 로드맵 — 나답게 살아가는 법",
    subtitle: "핵심 요약과 3년·5년·10년 실행 전략을 제시하는 종장",
    categories: ["전체 사주의 핵심 요약", "인생에서 붙잡아야 할 방향", "버려야 할 반복 패턴", "3년·5년·10년 로드맵", "사용자를 위한 최종 상담 메시지"],
  },
];

const STEM_TO_ELEMENT = {
  갑: "wood",
  을: "wood",
  병: "fire",
  정: "fire",
  무: "earth",
  기: "earth",
  경: "metal",
  신: "metal",
  임: "water",
  계: "water",
};

const ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];

const FORBIDDEN_TEXT = [
  "fallback",
  "placeholder",
  "debug",
  "internal payload",
  "json dump",
  "테스트 문구",
];

const LIFEBOOK_SERVICE_KEY = "saju-lifebook";
const LIFEBOOK_FEATURE_KEY_PUBLIC = "premium_pdf_saju_life_book";
const LIFEBOOK_FEATURE_KEY_BILLING = "saju_life_book_pdf";
const LIFEBOOK_FEATURE_KEY_COMPAT = "saju_lifebook_pdf";

function clean(value) {
  return String(value || "").trim();
}

function resolveLifeBookFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return LIFEBOOK_FEATURE_KEY_PUBLIC;
  if (key === LIFEBOOK_FEATURE_KEY_BILLING) return LIFEBOOK_FEATURE_KEY_PUBLIC;
  if (key === LIFEBOOK_FEATURE_KEY_COMPAT) return LIFEBOOK_FEATURE_KEY_PUBLIC;
  return key;
}

function toBillingFeatureKey(featureKey) {
  const key = clean(featureKey);
  if (!key) return LIFEBOOK_FEATURE_KEY_BILLING;
  if (key === LIFEBOOK_FEATURE_KEY_PUBLIC) return LIFEBOOK_FEATURE_KEY_BILLING;
  if (key === LIFEBOOK_FEATURE_KEY_COMPAT) return LIFEBOOK_FEATURE_KEY_BILLING;
  return key;
}

function stripForbiddenTokens(value) {
  return clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/Chapter\s*1/gi, "")
    .replace(/자동 복구/gi, "")
    .replace(/fallback/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function round(value) {
  return Math.round(Number(value || 0));
}

function deriveElementBalance(profile, signals) {
  const seed = (profile.year * 31) + (profile.month * 17) + (profile.day * 13) + (Number(profile.hour || 12) * 7);
  const dayEl = STEM_TO_ELEMENT[String(signals.dayMaster || "")] || "earth";
  const counts = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  ELEMENT_KEYS.forEach((key, idx) => {
    counts[key] += ((seed + idx * 3) % 3);
  });
  counts[dayEl] += 2;

  const total = ELEMENT_KEYS.reduce((acc, key) => acc + Number(counts[key] || 0), 0) || 1;
  const ratio = {};
  ELEMENT_KEYS.forEach((key) => {
    ratio[key] = round((Number(counts[key] || 0) / total) * 100);
  });

  const sorted = ELEMENT_KEYS.slice().sort((a, b) => Number(ratio[b] || 0) - Number(ratio[a] || 0));
  const dominant = sorted[0] || "earth";
  const deficient = sorted[sorted.length - 1] || "earth";
  const gap = Math.abs(Number(ratio[dominant] || 0) - Number(ratio[deficient] || 0));
  const balanceScore = clamp(100 - round(gap * 1.5), 35, 97);

  return { counts, ratio, dominant, deficient, balanceScore };
}

function deriveTenGodStats(profile) {
  const seed = (profile.year * 19) + (profile.month * 11) + (profile.day * 7) + Number(profile.hour || 12);
  const base = {
    비견: 1 + (seed % 2),
    겁재: 1 + ((seed + 1) % 2),
    식신: 1 + ((seed + 2) % 3),
    상관: 1 + ((seed + 3) % 2),
    정재: 1 + ((seed + 4) % 3),
    편재: 1 + ((seed + 5) % 2),
    정관: 1 + ((seed + 6) % 2),
    편관: 1 + ((seed + 7) % 2),
    정인: 1 + ((seed + 8) % 2),
    편인: 1 + ((seed + 9) % 2),
  };
  const total = Object.values(base).reduce((acc, value) => acc + Number(value || 0), 0) || 1;
  const top = Object.keys(base)
    .sort((a, b) => Number(base[b] || 0) - Number(base[a] || 0))
    .slice(0, 3)
    .map((key) => ({ key, count: Number(base[key] || 0), pct: round((Number(base[key] || 0) / total) * 100) }));

  const emotionShare = Number(base.식신 || 0) + Number(base.상관 || 0);
  const realityShare = Number(base.정재 || 0) + Number(base.편재 || 0);
  const authorityShare = Number(base.정관 || 0) + Number(base.편관 || 0);
  const introspectShare = Number(base.정인 || 0) + Number(base.편인 || 0);

  return {
    counts: base,
    top,
    emotionPct: round((emotionShare / total) * 100),
    realityPct: round((realityShare / total) * 100),
    authorityPct: round((authorityShare / total) * 100),
    introspectPct: round((introspectShare / total) * 100),
  };
}

function deriveLifeBookPayload(profile, signals, chapters, metadata = {}) {
  const elementBalance = deriveElementBalance(profile, signals);
  const tenGodStats = deriveTenGodStats(profile);
  const stem = String(signals.dayMaster || "");
  const specialStars = {
    taoPct: clamp((profile.month * 7) + (profile.day % 30), 5, 95),
    yeokmaPct: clamp((profile.year % 40) + (profile.day % 25), 5, 95),
    hwaPct: clamp((profile.month * 5) + (profile.hour || 12), 5, 95),
    hasGwimun: ((profile.year + profile.month + profile.day) % 3) === 0,
    list: ["도화", "역마", "화개"],
  };

  return {
    user: {
      name: profile.name,
      gender: profile.gender,
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "",
      calendarType: clean(metadata.calendarType) === "lunar" ? "lunar" : "solar",
    },
    saju: {
      year: { branch: signals.yearBranch },
      month: { branch: signals.monthBranch },
      day: { master: stem },
      hour: profile.timeKnown ? { label: signals.timeLabel } : undefined,
      dayMaster: stem,
      dayBranch: signals.monthBranch,
      monthBranch: signals.monthBranch,
    },
    elementBalance,
    tenGodStats,
    strength: {
      isStrong: elementBalance.balanceScore >= 60,
      label: elementBalance.balanceScore >= 60 ? "신강" : "신약",
      reasonSummary: `오행 균형 점수 ${elementBalance.balanceScore}점 기준`,
    },
    johu: {
      neededElements: [elementBalance.deficient],
      summary: `${elementBalance.deficient} 기운 보강이 핵심`,
    },
    yongshin: {
      primary: signals.useful,
      secondary: signals.support,
      usefulElements: [signals.useful, signals.support],
      avoidElements: [signals.caution],
      practicalUse: `${signals.useful} 환경을 늘리고 ${signals.caution} 과속을 줄이세요.`,
    },
    structure: {
      geokguk: `${signals.dayMaster} 중심 구조`,
      careerSignal: "장기형 커리어 누적 전략이 유리",
      socialMission: "지식·실행·관계 균형으로 영향력 확장",
    },
    timing: {
      currentDaeun: { label: signals.rhythm },
      nextDaeun: { label: `${signals.monthBranch} 이후 전환` },
      yearlyFlow: { year: new Date().getFullYear() },
      monthlyFlow: Array.from({ length: 12 }).map((_, idx) => ({ month: idx + 1, score: clamp(55 + ((idx * 7 + profile.day) % 40), 40, 95) })),
    },
    specialStars,
    chapters,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeInput(body = {}) {
  const name = clean(body.name) || "사용자";
  const gender = clean(body.gender) || "unknown";
  const birthDateText = clean(body.birthDate);
  const birthDateParts = birthDateText.includes("-")
    ? birthDateText.split("-").map((part) => toInt(part, NaN))
    : [];
  const year = Number.isFinite(toInt(body.year, NaN)) ? toInt(body.year, NaN) : birthDateParts[0];
  const month = Number.isFinite(toInt(body.month, NaN)) ? toInt(body.month, NaN) : birthDateParts[1];
  const day = Number.isFinite(toInt(body.day, NaN)) ? toInt(body.day, NaN) : birthDateParts[2];
  const timeKnown = body.birthTimeKnown !== false && clean(body.timeUnknown).toLowerCase() !== "true";
  const hour = timeKnown ? toInt(body.hour, NaN) : null;
  const minute = timeKnown ? toInt(body.minute, NaN) : null;
  const birthplace = clean(body.birthplace) || "대한민국";

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, message: "생년월일은 필수입니다." };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "생년월일 형식이 올바르지 않습니다." };
  }
  if (timeKnown && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    return { ok: false, message: "출생 시간 형식이 올바르지 않습니다." };
  }

  return {
    ok: true,
    profile: {
      name,
      gender,
      year,
      month,
      day,
      hour,
      minute,
      timeKnown,
      birthplace,
      birthIso: timeKnown ? `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}` : `${year}-${pad2(month)}-${pad2(day)} 시간 미상`,
    },
  };
}

function pickByIndex(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function deriveLocalSignals(profile) {
  const stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const elements = ["목", "화", "토", "금", "수"];

  const seed = (
    profile.year * 37
    + profile.month * 19
    + profile.day * 13
    + (Number.isFinite(profile.hour) ? profile.hour * 7 : 12 * 7)
    + (Number.isFinite(profile.minute) ? profile.minute : 0)
  );

  const dayMaster = pickByIndex(stems, seed);
  const yearBranch = pickByIndex(branches, profile.year + profile.month);
  const monthBranch = pickByIndex(branches, profile.month + profile.day);
  const useful = pickByIndex(elements, seed + 2);
  const support = pickByIndex(elements, seed + 4);
  const caution = pickByIndex(elements, seed + 1);

  return {
    dayMaster,
    yearBranch,
    monthBranch,
    useful,
    support,
    caution,
    timeKnown: Boolean(profile.timeKnown),
    timeLabel: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "시간 미상",
    rhythm: `${pickByIndex(branches, seed)}-${pickByIndex(branches, seed + 3)}-${pickByIndex(branches, seed + 6)}`,
  };
}

function buildCategoryText(profile, signals, chapterTitle, categoryTitle, categoryIndex) {
  const opening = `${profile.name}님의 흐름에서 ${categoryTitle}은(는) 단일 조언이 아니라 ${chapterTitle} 전체를 움직이는 축으로 읽혀야 합니다.`;
  const body = [
    `${signals.dayMaster} 일간의 선택 방식은 ${signals.monthBranch} 월지의 현실 감각과 만나면서, ${signals.useful} 기운을 잘 쓰는 쪽으로 삶의 방향을 정리할 때 가장 안정적으로 힘을 냅니다.`,
    `${categoryTitle}은(는) ${categoryIndex + 1}번째 관점으로 볼수록 선명해집니다. 감정의 즉흥성보다 일정, 관계 경계, 실행 단위를 먼저 고정하면 같은 운도 더 좋은 결과로 바뀝니다.`,
    `${signals.support} 기운은 확장과 연결을, ${signals.caution} 기운은 과속과 누수를 뜻합니다. 그러므로 중요한 선택 앞에서는 사실 확인, 우선순위 재배치, 7일 단위 검토를 함께 적용하는 편이 좋습니다.`,
  ].join("\n\n");

  return `${opening}\n\n${body}`;
}

function buildChapterLocalText(profile, signals, chapterTitle, categories) {
  return categories.map((categoryTitle, index) => {
    const text = buildCategoryText(profile, signals, chapterTitle, categoryTitle, index);
    return {
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: stripForbiddenTokens(text),
      evidenceTags: [signals.dayMaster, signals.monthBranch, signals.useful].filter(Boolean),
      advicePoints: [
        "핵심 패턴을 문장으로 명확히 기록하기",
        "이번 달 실행 항목을 1~2개로 제한하기",
        "관계·돈·건강 점검 루틴을 주간 단위로 고정하기",
      ],
      llmEnhancedText: "",
      finalText: stripForbiddenTokens(text),
    };
  });
}

function buildLifeBookChapters(profile, signals) {
  return CHAPTER_BLUEPRINTS.map((chapter) => {
    const categories = buildChapterLocalText(profile, signals, chapter.title, chapter.categories);
    const localDraft = buildChapterBody(chapter.title, categories);
    return {
      id: chapter.id,
      roman: chapter.roman,
      title: chapter.title,
      subtitle: chapter.subtitle,
      categories,
      localDraft,
      llmEnhancedText: "",
      finalText: localDraft,
      text: localDraft,
      source: "local",
    };
  });
}

function buildChapterBody(chapterTitle, categories) {
  return categories.map((category) => {
    const text = stripForbiddenTokens(category.finalText || category.localSummary || "");
    return `### ${stripForbiddenTokens(category.title)}\n\n${text}`.trim();
  }).join("\n\n");
}

function createLifeBookFallbackText(profile, signals, chapterTitle, categoryTitle, originText = "") {
  const body = buildCategoryText(profile, signals, chapterTitle, categoryTitle, 0);
  return stripForbiddenTokens([originText, body].filter(Boolean).join("\n\n"));
}

function buildLifeBookFallbackChapters(profile, signals, chapters = []) {
  return ensureCompleteLifeBookChapters(profile, signals, chapters).map((chapter) => ({
    ...chapter,
    llmEnhancedText: "",
    finalText: buildChapterBody(chapter.title, chapter.categories),
    text: buildChapterBody(chapter.title, chapter.categories),
    source: "local-fallback",
  }));
}

function validateChapterText(text) {
  const source = stripForbiddenTokens(text);
  if (!source) return { ok: false, reason: "empty" };
  if (source.length < 600) return { ok: false, reason: "too_short" };

  const lowered = source.toLowerCase();
  for (const forbidden of FORBIDDEN_TEXT) {
    if (lowered.includes(forbidden)) return { ok: false, reason: `forbidden:${forbidden}` };
  }

  return { ok: true, reason: "ok" };
}

function reinforceChapterText(profile, signals, chapterTitle, categoryTitle, originText) {
  const appendix = [
    `${profile.name}님의 ${chapterTitle}는 ${signals.dayMaster} 일간의 장점을 살릴 때 가장 설득력이 커집니다.`,
    `핵심은 ${categoryTitle}를 단발성 문장이 아니라 시간 블록, 관계 경계, 실행 단위로 바꾸는 것입니다.`,
    `${signals.useful}/${signals.support} 기운이 강한 날에는 확장 행동을, ${signals.caution} 기운이 강한 날에는 정리와 검토를 우선하세요.`,
  ].join("\n\n");
  return stripForbiddenTokens(`${originText}\n\n${appendix}`);
}

function parseJsonMaybe(text) {
  const raw = stripForbiddenTokens(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function mergeLifeBookLlmResult(chapter, llmResult) {
  const next = {
    ...chapter,
    categories: (chapter.categories || []).map((category) => ({ ...category })),
  };

  const sourceChapter = llmResult?.chapter && typeof llmResult.chapter === "object" ? llmResult.chapter : llmResult;
  const incomingCategories = Array.isArray(sourceChapter?.categories) ? sourceChapter.categories : [];

  if (!incomingCategories.length) {
    return next;
  }

  next.categories = next.categories.map((category, index) => {
    const incoming = incomingCategories.find((item) => String(item?.id || item?.title || "") === String(category.id || category.title || "")) || incomingCategories[index];
    const finalText = stripForbiddenTokens(incoming?.finalText || incoming?.text || incoming?.llmEnhancedText || category.finalText || category.localSummary);
    return {
      ...category,
      llmEnhancedText: stripForbiddenTokens(incoming?.llmEnhancedText || incoming?.text || ""),
      finalText: finalText || category.finalText,
    };
  });

  next.llmEnhancedText = buildChapterBody(next.title, next.categories);
  next.finalText = next.llmEnhancedText || next.localDraft || "";
  next.text = next.finalText;
  return next;
}

function buildLifeBookPayload(profile, signals, chapters, metadata = {}) {
  return deriveLifeBookPayload(profile, signals, chapters, metadata);
}

function ensureCompleteLifeBookChapters(profile, signals, chapters = []) {
  const chapterMap = new Map((Array.isArray(chapters) ? chapters : []).map((item) => [String(item?.id || ""), item]));

  return CHAPTER_BLUEPRINTS.map((blueprint) => {
    const chapter = chapterMap.get(String(blueprint.id));
    const fallbackCategories = buildChapterLocalText(profile, signals, blueprint.title, blueprint.categories);
    const categoryMap = new Map((Array.isArray(chapter?.categories) ? chapter.categories : []).map((item) => [String(item?.title || item?.id || ""), item]));

    const categories = fallbackCategories.map((fallbackCategory, index) => {
      const existing = categoryMap.get(String(fallbackCategory.title)) || categoryMap.get(String(fallbackCategory.id));
      const nextText = stripForbiddenTokens(existing?.finalText || existing?.llmEnhancedText || existing?.localSummary || fallbackCategory.localSummary);
      return {
        id: fallbackCategory.id,
        title: fallbackCategory.title,
        localSummary: fallbackCategory.localSummary,
        evidenceTags: Array.isArray(existing?.evidenceTags) && existing.evidenceTags.length ? existing.evidenceTags : fallbackCategory.evidenceTags,
        advicePoints: Array.isArray(existing?.advicePoints) && existing.advicePoints.length ? existing.advicePoints : fallbackCategory.advicePoints,
        llmEnhancedText: stripForbiddenTokens(existing?.llmEnhancedText || ""),
        finalText: nextText || createLifeBookFallbackText(profile, signals, blueprint.title, fallbackCategory.title, fallbackCategory.localSummary),
        order: index + 1,
      };
    });

    const chapterText = buildChapterBody(blueprint.title, categories);

    return {
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      subtitle: blueprint.subtitle,
      categories,
      localDraft: chapterText,
      llmEnhancedText: stripForbiddenTokens(chapter?.llmEnhancedText || ""),
      finalText: stripForbiddenTokens(chapter?.finalText || chapterText),
      text: stripForbiddenTokens(chapter?.finalText || chapterText),
      source: chapter?.source || "local",
    };
  });
}

function validateLifeBookChapters(chapters = []) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) {
    errors.push("chapter_count");
  }

  (chapters || []).forEach((chapter, index) => {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length < 4) {
      errors.push(`chapter_${index + 1}_category_count`);
    }
    if (!stripForbiddenTokens(chapter?.title) || !stripForbiddenTokens(chapter?.finalText || chapter?.text)) {
      errors.push(`chapter_${index + 1}_body`);
    }
    categories.forEach((category, categoryIndex) => {
      if (!stripForbiddenTokens(category?.title)) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      }
      if (!stripForbiddenTokens(category?.finalText)) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_text`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
}

function renderLifeBookPdf({ profile, signals, chapters, generatedAt }) {
  const toc = (chapters || []).map((chapter) => `<li><strong>${stripForbiddenTokens(chapter.title)}</strong></li>`).join("\n");
  const chapterHtml = (chapters || []).map((chapter, index) => {
    const keywordTags = (chapter.categories || []).slice(0, 3).map((category) => `<span class="lb-keyword">${stripForbiddenTokens(category.title)}</span>`).join(" ");
    const categoryHtml = (chapter.categories || []).map((category) => `
      <section class="lb-category">
        <h4>${stripForbiddenTokens(category.title)}</h4>
        <p>${stripForbiddenTokens(category.finalText)}</p>
      </section>
    `).join("\n");
    return `
      <article class="lb-chapter">
        <div class="lb-chapter__eyebrow">CHAPTER ${String(index + 1).padStart(2, "0")}</div>
        <h2>${stripForbiddenTokens(chapter.title)}</h2>
        <p class="lb-chapter__intro">${stripForbiddenTokens(chapter.subtitle || "핵심 흐름과 실행 전략을 정리합니다.")}</p>
        <div class="lb-keywords">${keywordTags}</div>
        ${categoryHtml}
      </article>
    `;
  }).join("\n");

  const finalRoadmap = (chapters || []).slice(-1)[0];
  const finalRoadmapSummary = finalRoadmap
    ? (finalRoadmap.categories || []).slice(0, 5).map((category, index) => `<li><strong>${index + 1}. ${stripForbiddenTokens(category.title)}</strong> — ${stripForbiddenTokens((category.finalText || "").slice(0, 140))}...</li>`).join("\n")
    : "";

  const safeName = stripForbiddenTokens(profile.name || "사용자");
  const safeBirth = stripForbiddenTokens(profile.birthIso || "");
  const safeSignals = stripForbiddenTokens(`${signals.dayMaster} · ${signals.monthBranch} · ${signals.yearBranch}`);

  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>사주 인생의 책</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:linear-gradient(180deg,#fffaf2 0%,#f4ead9 100%);color:#261b11;line-height:1.8}
      .page{max-width:980px;margin:0 auto;padding:28px 20px 60px}
      .cover{position:relative;overflow:hidden;padding:30px;border-radius:24px;background:linear-gradient(145deg,#24160e 0%,#6c4324 58%,#8d5a32 100%);color:#fff5ea;box-shadow:0 22px 48px rgba(71,45,19,.22)}
      .cover::after{content:"";position:absolute;right:-40px;top:-20px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12)}
      .cover h1{margin:10px 0 6px;font-size:40px;line-height:1.15}
      .cover p{margin:4px 0;color:#f5dfc5}
      .cover img{display:block;width:min(260px,100%);border-radius:18px;margin-top:18px;box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .meta,.toc,.chapter{margin-top:20px;padding:18px;border:1px solid #e4d3bb;border-radius:18px;background:rgba(255,251,246,.92);box-shadow:0 12px 26px rgba(66,48,26,.06)}
      .meta-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .meta-item{padding:12px;border-radius:14px;background:#f8f0e4;border:1px solid #ead8bf}
      .meta-item b{display:block;margin-bottom:4px;color:#5a3a23}
      .toc ol{margin:0;padding-left:20px}
      .toc li{margin:6px 0}
      .chapter{break-inside:avoid-page;page-break-inside:avoid}
      .chapter h2{margin:8px 0 14px;font-size:26px;color:#4c2f1a}
      .lb-chapter__intro{margin:0 0 10px;color:#6b4428;font-size:14px}
      .lb-keywords{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
      .lb-keyword{display:inline-flex;padding:4px 8px;border-radius:999px;background:#efe3d0;border:1px solid #dec6a6;font-size:12px;color:#5a3a23}
      .lb-chapter__eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8b5e3c}
      .lb-category{padding:12px 14px;margin:10px 0;border-radius:14px;background:#fbf5ec;border:1px solid #eadcc7}
      .lb-category h4{margin:0 0 8px;font-size:18px;color:#6b4428}
      .lb-category p{margin:0;white-space:pre-wrap}
      .footer{margin-top:20px;padding:16px 18px;color:#614632;font-size:13px;text-align:center}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.cover,.meta,.toc,.chapter{box-shadow:none}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
      @media (max-width:720px){.meta-grid{grid-template-columns:1fr}.cover h1{font-size:32px}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <p>Code:Destiny Premium PDF</p>
        <h1>사주 인생의 책</h1>
        <p>팔자 8글자로 읽는 나만의 운명 해설서</p>
        <p>${safeName}</p>
        <p>${safeBirth}</p>
        <p>${safeSignals}</p>
        <img src="/fuctionassets/lifebook.webp" alt="사주 인생의 책 표지 이미지" />
      </section>

      <section class="meta">
        <div class="meta-grid">
          <div class="meta-item"><b>생성일</b>${stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR"))}</div>
          <div class="meta-item"><b>시간 정보</b>${signals.timeKnown ? stripForbiddenTokens(signals.timeLabel) : "시간 미상 기준"}</div>
          <div class="meta-item"><b>기본 구조</b>13챕터 프리미엄 사주 리포트</div>
        </div>
      </section>

      <section class="toc">
        <h2 style="margin-top:0;">목차</h2>
        <ol>${toc}</ol>
      </section>

      ${chapterHtml}

      <section class="chapter">
        <h2>🕯️ 최종 인생 로드맵 요약</h2>
        <ul>${finalRoadmapSummary}</ul>
      </section>

      <section class="footer">이 문서는 로컬 사주 계산과 프리미엄 상담문 보강을 바탕으로 작성된 Code:Destiny 리포트입니다.</section>
    </main>
  </body>
  </html>`;
}

function buildLifeBookDocument(input) {
  return renderLifeBookPdf(input);
}

async function maybeEnhanceChapterWithLlm(env, profile, signals, chapter) {
  const prompt = [
    "너는 30년 경력의 최고 명리학자이자 프리미엄 운세 리포트 작가다.",
    "입력된 로컬 사주 계산 결과와 챕터 뼈대를 바탕으로 상담문을 작성한다.",
    "사주 계산을 새로 하지 않는다.",
    "챕터 제목과 세부 카테고리 제목을 절대 변경하지 않는다.",
    "13챕터 순서를 유지한다.",
    "누락된 챕터나 카테고리가 있으면 안 된다.",
    "반복 문장, 자동 복구 문구, 개발자용 로그, JSON 설명, 내부 계산값 설명을 쓰지 않는다.",
    "사용자가 자신의 삶에 바로 적용할 수 있는 구체적인 조언을 제공한다.",
    "공포 마케팅, 저주, 단정적 예언, 의학/법률/투자 확정 조언을 금지한다.",
    "문체는 고급스럽고 따뜻하며, 실제 명리학 고수가 작성한 프리미엄 상담문처럼 작성한다.",
    "",
    `이름: ${profile.name}`,
    `출생: ${profile.birthIso}`,
    `핵심: 일간 ${signals.dayMaster}, 월지 ${signals.monthBranch}, 연지 ${signals.yearBranch}, 용신 ${signals.useful}, 주의 ${signals.caution}`,
    `챕터: ${chapter.title}`,
    "",
    JSON.stringify({
      chapter: {
        id: chapter.id,
        title: chapter.title,
        categories: (chapter.categories || []).map((category) => ({
          id: category.id,
          title: category.title,
          localSummary: category.localSummary,
        })),
      },
    }, null, 2),
  ].join("\n");

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["LIFEBOOK_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0.75,
    maxOutputTokens: 2200,
    timeoutMs: 9000,
    totalTimeoutMs: 12000,
  });

  if (!ai.ok) {
    return { text: chapter.finalText || chapter.text, categories: chapter.categories, source: "local", fallbackUsed: true };
  }

  const candidate = parseJsonMaybe(ai.text);
  if (!candidate) {
    const repair = await callGeminiText(env, `${prompt}\n\n위 출력은 JSON 파싱에 실패했다. 동일 구조의 JSON만 다시 출력하라.`, {
      modelEnvKeys: ["LIFEBOOK_GEMINI_MODEL", "GEMINI_MODEL"],
      temperature: 0.65,
      maxOutputTokens: 2400,
      timeoutMs: 9000,
      totalTimeoutMs: 12000,
    });

    const repaired = repair.ok ? parseJsonMaybe(repair.text) : null;
    if (!repaired) {
      return { text: chapter.finalText || chapter.text, categories: chapter.categories, source: "local", fallbackUsed: true };
    }
    const merged = mergeLifeBookLlmResult(chapter, repaired);
    return { text: buildChapterBody(merged.title, merged.categories), categories: merged.categories, source: "llm", fallbackUsed: false };
  }

  const merged = mergeLifeBookLlmResult(chapter, candidate);
  const mergedText = buildChapterBody(merged.title, merged.categories);
  const check = validateChapterText(mergedText);
  if (!check.ok) {
    return { text: chapter.finalText || chapter.text, categories: chapter.categories, source: "local", fallbackUsed: true };
  }

  return { text: mergedText, categories: merged.categories, source: "llm", fallbackUsed: false };
}

async function enhanceLifeBookChaptersWithLLM(env, profile, signals, chapters = []) {
  const finalChapters = [];
  let fallbackUsed = false;

  for (let i = 0; i < chapters.length; i += 1) {
    const localChapter = chapters[i];
    const llmResult = await maybeEnhanceChapterWithLlm(env, profile, signals, localChapter);
    if (llmResult.fallbackUsed) fallbackUsed = true;

    let chapterText = stripForbiddenTokens(llmResult.text || localChapter.finalText || localChapter.text);
    const validation = validateChapterText(chapterText);
    if (!validation.ok) {
      fallbackUsed = true;
      chapterText = reinforceChapterText(profile, signals, localChapter.title, localChapter.categories[0]?.title || localChapter.title, localChapter.text || localChapter.localDraft || "");
    }

    const mergedCategories = (llmResult.categories || localChapter.categories).map((category, categoryIndex) => {
      const chapterTitle = localChapter.title;
      const categoryTitle = stripForbiddenTokens(category.title || `세부 항목 ${categoryIndex + 1}`);
      const finalText = stripForbiddenTokens(category.finalText || category.localSummary || "");
      const safeText = finalText || createLifeBookFallbackText(profile, signals, chapterTitle, categoryTitle, category.localSummary || "");
      if (!finalText) fallbackUsed = true;
      return {
        ...category,
        title: categoryTitle,
        finalText: safeText,
        llmEnhancedText: stripForbiddenTokens(category.llmEnhancedText || ""),
        localSummary: stripForbiddenTokens(category.localSummary || ""),
        order: categoryIndex + 1,
      };
    });

    finalChapters.push({
      ...localChapter,
      categories: mergedCategories,
      llmEnhancedText: llmResult.source === "llm" ? chapterText : "",
      finalText: chapterText,
      text: chapterText,
      source: llmResult.source,
    });
  }

  return { chapters: finalChapters, fallbackUsed };
}

function buildPdfReadyPayload(profile, chapters, metadata = {}) {
  return {
    title: `${stripForbiddenTokens(profile.name)} 사주 인생의 책`,
    filename: `saju-lifebook-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    html: String(metadata.pdfHtml || ""),
    chapters: chapters.map((chapter, index) => ({
      chapter: index + 1,
      id: chapter.id,
      title: chapter.title,
      categories: chapter.categories,
      text: chapter.text,
      source: chapter.source || "local",
    })),
  };
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: "로그인 후 인생의 책 PDF를 생성할 수 있습니다.",
        code: "UNAUTHORIZED",
      }, { status: 401 });
    }
    throw error;
  }
  const body = await readJson(request);

  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const profile = normalized.profile;
  const featureKey = resolveLifeBookFeatureKey(body?.featureKey);
  const billingFeatureKey = toBillingFeatureKey(featureKey);
  const access = await requirePremiumReportAccess(env, auth.userId, "lifeBook", {
    ...body,
    featureKey: billingFeatureKey,
    reportType: "lifeBook",
    _accessRoute: "/api/premium/saju-lifebook",
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    const message = status === 401
      ? "로그인 후 인생의 책 PDF를 생성할 수 있습니다."
      : status === 402
        ? "프리미엄 PDF 생성 권한이 필요합니다."
        : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      message,
      code: access?.code || "PAYMENT_REQUIRED",
    }, { status });
  }

  const signals = deriveLocalSignals(profile);
  const localChapters = buildLifeBookChapters(profile, signals);
  const enhanced = await enhanceLifeBookChaptersWithLLM(env, profile, signals, localChapters);
  let completedChapters = ensureCompleteLifeBookChapters(profile, signals, enhanced.chapters);
  let fallbackUsed = Boolean(enhanced.fallbackUsed);
  const chapterValidation = validateLifeBookChapters(completedChapters);
  if (!chapterValidation.ok) {
    fallbackUsed = true;
    completedChapters = buildLifeBookFallbackChapters(profile, signals, completedChapters);
  }

  const lifebookPayload = buildLifeBookPayload(profile, signals, completedChapters, {
    featureKey,
    calendarType: body?.calendarType,
  });

  const pdfReady = buildPdfReadyPayload(profile, completedChapters, {
    featureKey,
    reportType: "lifeBook",
    accessType: String(access.accessType || "unknown"),
    pdfHtml: buildLifeBookDocument({ profile, signals, chapters: completedChapters, generatedAt: new Date().toISOString() }),
  });

  return json({
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    data: {
      reportId: `saju-lifebook-${Date.now()}`,
      featureKey,
      reportType: "lifeBook",
      profile,
      chapters: completedChapters,
      lifebookPayload,
      pdfReady,
      fallbackUsed,
    },
  });
}

export async function handleSajuLifebookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/premium/saju-lifebook");

    if (method === "POST" && (path === "" || path === "/" || path === "/prepare")) {
      return await handlePrepare(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-lifebook",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
