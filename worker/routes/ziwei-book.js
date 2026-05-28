import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";

const ZIWEI_SERVICE_KEY = "ziwei-book";
const ZIWEI_FEATURE_KEY = "premium_pdf_ziwei";
const ZIWEI_FEATURE_ALIASES = new Set(["premium-ziwei-report", "premium_pdf_ziwei"]);

const STRENGTH_LEGEND = Object.freeze({
  miao: "◎",
  de: "O",
  li: "▲",
  ping: "△",
  xianOrShi: "X",
});

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    roman: "I",
    palaceKey: "ming",
    title: "Chapter 1. 명궁 완전 해독 — 타고난 나의 중심 별",
    categories: ["명궁의 주성 구조", "내가 세상에 드러나는 방식", "성격의 핵심 장점과 약점", "명궁 별 강도에 따른 인생 전략"],
  },
  {
    id: "02",
    roman: "II",
    palaceKey: "body",
    title: "Chapter 2. 신궁 심층 분석 — 후천적으로 완성되는 나",
    categories: ["신궁이 보여주는 후천적 변화", "나이가 들수록 강해지는 성향", "명궁과 신궁의 조화 또는 충돌", "인생 후반부의 핵심 방향"],
  },
  {
    id: "03",
    roman: "III",
    palaceKey: "siblings",
    title: "Chapter 3. 형제궁과 인간관계 — 가까운 사람들과의 거리",
    categories: ["형제·동료·친구 관계의 기본 구조", "협력과 경쟁의 패턴", "가까운 사람에게서 받는 도움과 부담", "인간관계에서 지켜야 할 경계선"],
  },
  {
    id: "04",
    roman: "IV",
    palaceKey: "spouse",
    title: "Chapter 4. 부부궁 — 사랑, 결혼, 깊은 인연의 방식",
    categories: ["연애와 결혼에서 끌리는 인연", "배우자상과 관계의 핵심 성향", "갈등이 생기는 지점", "좋은 관계를 유지하는 현실적 조언"],
  },
  {
    id: "05",
    roman: "V",
    palaceKey: "children",
    title: "Chapter 5. 자녀궁 — 창조성, 표현력, 이어지는 운",
    categories: ["자녀운과 후대운의 흐름", "창작력과 표현력", "내가 남기는 영향력", "돌봄과 책임의 균형"],
  },
  {
    id: "06",
    roman: "VI",
    palaceKey: "wealth",
    title: "Chapter 6. 재백궁 — 돈, 자산, 현실 감각",
    categories: ["돈을 버는 방식", "재물운의 강점과 약점", "투자·소비·저축 성향", "재물 흐름을 안정시키는 전략"],
  },
  {
    id: "07",
    roman: "VII",
    palaceKey: "health",
    title: "Chapter 7. 질액궁 — 몸과 마음의 취약 지점",
    categories: ["체력과 건강 리듬", "스트레스가 쌓이는 방식", "마음의 불균형이 나타나는 패턴", "생활 습관 개선 조언"],
  },
  {
    id: "08",
    roman: "VIII",
    palaceKey: "travel",
    title: "Chapter 8. 천이궁 — 세상 밖에서 열리는 기회",
    categories: ["이동운과 외부 활동운", "낯선 환경에서 드러나는 능력", "귀인과 기회가 들어오는 방식", "외부 세계를 활용하는 전략"],
  },
  {
    id: "09",
    roman: "IX",
    palaceKey: "friends",
    title: "Chapter 9. 노복궁 — 사람을 얻고 쓰는 힘",
    categories: ["주변 사람과의 협력운", "부하·동료·조력자와의 관계", "사람 때문에 생기는 기회와 손실", "인맥을 운으로 바꾸는 법"],
  },
  {
    id: "10",
    roman: "X",
    palaceKey: "career",
    title: "Chapter 10. 관록궁 — 직업, 명예, 사회적 성취",
    categories: ["직업적 재능과 일의 방식", "사회적 인정과 명예운", "조직 안에서의 위치", "성공을 만드는 커리어 전략"],
  },
  {
    id: "11",
    roman: "XI",
    palaceKey: "property",
    title: "Chapter 11. 전택궁 — 집, 기반, 축적되는 복",
    categories: ["부동산과 생활 기반", "가정환경과 안정감", "쌓이는 자산과 물질적 기반", "오래 지켜야 할 삶의 터전"],
  },
  {
    id: "12",
    roman: "XII",
    palaceKey: "fortune",
    title: "Chapter 12. 복덕궁 — 행복, 내면, 영혼의 쉼터",
    categories: ["마음의 만족과 행복 조건", "혼자 있을 때 회복되는 방식", "정신적 안정과 취미의 방향", "삶의 질을 높이는 조언"],
  },
  {
    id: "13",
    roman: "XIII",
    palaceKey: "timing",
    title: "Chapter 13. 대운·유년 종합 전략 — 앞으로 열리는 운의 지도",
    categories: ["현재 대운의 핵심 흐름", "가까운 유년운의 기회와 주의점", "인생 전환점에서의 선택 기준", "앞으로의 3년 실전 전략"],
  },
];

const PALACE_LABELS = Object.freeze({
  ming: "명궁",
  body: "신궁",
  siblings: "형제궁",
  spouse: "부부궁",
  children: "자녀궁",
  wealth: "재백궁",
  health: "질액궁",
  travel: "천이궁",
  friends: "노복궁",
  career: "관록궁",
  property: "전택궁",
  fortune: "복덕궁",
  parents: "부모궁",
  timing: "대운·유년",
});

const FORBIDDEN_TEXT = ["payload", "raw json", "json", "debug", "engine", "자동 복구 생성", "localdraft", "fallback"];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function esc(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripForbiddenTokens(value) {
  let text = clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/localdraft/gi, "")
    .replace(/fallback/gi, "")
    .replace(/payload/gi, "")
    .replace(/debug/gi, "")
    .replace(/raw\s*json/gi, "")
    .replace(/\bjson\b/gi, "")
    .replace(/\bengine\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (/^Chapter\s*\d+\s*$/i.test(text)) text = "";
  return text;
}

function normalizeFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return ZIWEI_FEATURE_KEY;
  if (ZIWEI_FEATURE_ALIASES.has(key)) return ZIWEI_FEATURE_KEY;
  return key;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function pad2(value) {
  return String(toInt(value, 0)).padStart(2, "0");
}

function normalizeSymbol(symbol, name = "") {
  const s = clean(symbol);
  const n = clean(name);
  if (s === "◎") return "◎";
  if (s === "O" || s === "○" || s === "◉") return "O";
  if (s === "▲") return "▲";
  if (s === "△") return "△";
  if (s === "X" || s === "×" || /^x$/i.test(s)) return "X";
  if (/묘|왕|廟|旺/.test(n)) return "◎";
  if (/득|得/.test(n)) return "O";
  if (/리|利|약/.test(n)) return "▲";
  if (/평|平/.test(n)) return "△";
  if (/함|실|陷|불|쇠/.test(n)) return "X";
  return "△";
}

function normalizeStrengthName(value) {
  const raw = clean(value);
  if (/묘|왕|廟|旺|◎/.test(raw)) return "묘";
  if (/득|得|○|O/.test(raw)) return "득";
  if (/리|利|약|▲/.test(raw)) return "리";
  if (/평|平|△/.test(raw)) return "평";
  if (/함|실|陷|불|쇠|×|X/i.test(raw)) return "함";
  return "평";
}

function normalizeStar(star) {
  if (!star || typeof star !== "object") return null;
  const name = clean(star.nameKo || star.name || star.starName);
  if (!name) return null;
  const strengthName = normalizeStrengthName(star.strengthName || star.strength || star.brightnessKo || star.brightness || star.symbol || star.strengthSymbol);
  const strengthSymbol = normalizeSymbol(star.strengthSymbol || star.symbol, strengthName);
  return {
    name,
    strengthName,
    strengthSymbol,
    borrowed: star.borrowed === true,
    sihua: clean(star.sihua || star.transformation || star.transform),
  };
}

function normalizeStarList(list) {
  return (Array.isArray(list) ? list : []).map(normalizeStar).filter(Boolean);
}

function starsText(stars) {
  const rows = normalizeStarList(stars);
  if (!rows.length) return "확인되는 주성이 없습니다";
  return rows.map((star) => `${star.name}${star.strengthSymbol}(${star.strengthName})${star.sihua ? ` ${star.sihua}` : ""}${star.borrowed ? " 차성" : ""}`).join(", ");
}

function normalizeInput(body = {}) {
  const bp = body.birthProfile && typeof body.birthProfile === "object" ? body.birthProfile : {};
  const birth = bp.birth && typeof bp.birth === "object" ? bp.birth : {};
  const birthDate = clean(body.birthDate || bp.birthDate || birth.solarDate || birth.date);
  const dateParts = birthDate.includes("-") ? birthDate.split("-").map((part) => toInt(part, NaN)) : [];
  const year = Number.isFinite(toInt(body.year, NaN)) ? toInt(body.year, NaN) : (Number.isFinite(toInt(birth.year, NaN)) ? toInt(birth.year, NaN) : dateParts[0]);
  const month = Number.isFinite(toInt(body.month, NaN)) ? toInt(body.month, NaN) : (Number.isFinite(toInt(birth.month, NaN)) ? toInt(birth.month, NaN) : dateParts[1]);
  const day = Number.isFinite(toInt(body.day, NaN)) ? toInt(body.day, NaN) : (Number.isFinite(toInt(birth.day, NaN)) ? toInt(birth.day, NaN) : dateParts[2]);
  const hour = Number.isFinite(toInt(body.hour, NaN)) ? toInt(body.hour, NaN) : (Number.isFinite(toInt(birth.hour, NaN)) ? toInt(birth.hour, NaN) : 12);
  const minute = Number.isFinite(toInt(body.minute, NaN)) ? toInt(body.minute, NaN) : (Number.isFinite(toInt(birth.minute, NaN)) ? toInt(birth.minute, NaN) : 0);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "정확한 명반 계산을 위해 생년월일시 정보를 확인해 주세요." };
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, message: "정확한 명반 계산을 위해 출생 시간을 확인해 주세요." };
  }
  return {
    ok: true,
    profile: {
      name: clean(body.name || bp.name) || "사용자",
      gender: clean(body.gender || bp.gender) || "unknown",
      year,
      month,
      day,
      hour,
      minute,
      calendarType: clean(body.calendarType || bp.calendarType) || "solar",
      birthplace: clean(body.birthplace || bp.birthplace || bp.birthPlace) || "대한민국",
      birthIso: `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}`,
    },
  };
}

function getZiweiBase(body = {}) {
  const candidates = [
    body.ziweiBase,
    body.ziweiPdfSeed,
    body.chartResult?.reportPayload,
    body.chartResult?.ziweiBase,
    body.reportPayload,
    body.chart,
  ];
  for (const item of candidates) {
    if (item && typeof item === "object") return item;
  }
  return null;
}

function normalizePalaces(base = {}) {
  const rawPalaces = Array.isArray(base.palaces)
    ? base.palaces
    : Array.isArray(base.chart?.palaces)
      ? base.chart.palaces
      : Array.isArray(base.chartMeta?.palaces)
        ? base.chartMeta.palaces
        : [];
  const palaces = rawPalaces.map((palace, index) => {
    const key = clean(palace.key || palace.id || palace.palaceKey || "");
    const nameKo = clean(palace.nameKo || palace.name || palace.palace || PALACE_LABELS[key] || "");
    return {
      key,
      nameKo,
      branch: clean(palace.branch || palace.earthlyBranch || palace.zhi),
      index,
      mainStars: normalizeStarList(palace.mainStars || palace.stars),
      auxStars: normalizeStarList(palace.auxStars || palace.auxiliaryStars || palace.subStars),
      maleficStars: normalizeStarList(palace.maleficStars || palace.badStars),
      transformations: Array.isArray(palace.transformations) ? palace.transformations : [],
      decadeLuck: palace.decadeLuck || null,
      annualLuck: palace.annualLuck || null,
    };
  });
  return palaces;
}

function findPalace(seed, key) {
  if (key === "body") {
    return seed.bodyPalace || seed.palaces.find((p) => p.key === "body") || seed.palaces.find((p) => p.branch && p.branch === seed.chart.shenGong) || seed.lifePalace;
  }
  if (key === "timing") return null;
  const expectedName = PALACE_LABELS[key];
  return seed.palaces.find((p) => p.key === key) || seed.palaces.find((p) => p.nameKo === expectedName) || null;
}

function buildZiweiPdfSeed(profile, base) {
  const palaces = normalizePalaces(base);
  const chartMeta = base.chartMeta || base.chart || {};
  const lifePalace = palaces.find((p) => p.key === "ming" || p.nameKo === "명궁") || null;
  const bodyBranch = clean(chartMeta.shenGong || chartMeta.bodyPalaceBranch || base.shen);
  const bodyPalace = palaces.find((p) => p.key === "body") || palaces.find((p) => p.branch && p.branch === bodyBranch) || null;
  const sihua = Array.isArray(base.sihua) ? base.sihua : (Array.isArray(base.transformations) ? base.transformations : []);
  const luck = base.luck && typeof base.luck === "object" ? base.luck : {};
  const decadeLuck = Array.isArray(luck.decadeLuck) ? luck.decadeLuck : (Array.isArray(base.decadeLuck) ? base.decadeLuck : []);
  const annualLuck = Array.isArray(luck.annual) ? luck.annual : (Array.isArray(base.annualLuck) ? base.annualLuck : []);

  const diagnostics = {
    palaceCount: palaces.length,
    hasAll12Palaces: palaces.length >= 12,
    hasMingGong: Boolean(lifePalace),
    hasShenGong: Boolean(bodyPalace || bodyBranch),
    hasSihua: sihua.length > 0,
    hasDecadeLuck: decadeLuck.length > 0,
  };

  return {
    mode: "single",
    birthProfile: {
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}`,
      calendarType: profile.calendarType,
      gender: profile.gender,
      birthplace: profile.birthplace,
    },
    chart: {
      mingGong: clean(chartMeta.mingGong || base.meng || lifePalace?.branch || ""),
      shenGong: bodyBranch,
      fiveElementBureau: clean(chartMeta.fiveElementBureau || base.juInfo || ""),
      yearStemBranch: clean(chartMeta.yearStemBranch || chartMeta.yearGan || base.yearGan || ""),
      palaces,
      transformations: sihua,
      decadeLuck,
      annualLuck,
    },
    strengthLegend: STRENGTH_LEGEND,
    lifePalace,
    bodyPalace,
    diagnostics,
  };
}

function validateSeed(seed) {
  const errors = [];
  if (!seed?.diagnostics?.hasAll12Palaces) errors.push("palaces.length");
  if (!seed?.diagnostics?.hasMingGong) errors.push("mingGong");
  if (!seed?.diagnostics?.hasShenGong) errors.push("shenGong");
  return { ok: errors.length === 0, errors };
}

function palaceEvidenceText(seed, palace) {
  if (!palace) return "현재 계산된 명반에서 확인되는 범위에서는 이 궁의 세부 별 배치를 보수적으로 해석합니다.";
  const main = starsText(palace.mainStars);
  const aux = starsText(palace.auxStars);
  const malefic = starsText(palace.maleficStars);
  const trans = Array.isArray(palace.transformations) && palace.transformations.length
    ? palace.transformations.map((t) => `${clean(t.star)} ${clean(t.type || t.label)}`.trim()).filter(Boolean).join(", ")
    : "사화 직접 작동은 약하게 확인됩니다";
  return `${palace.nameKo || "해당 궁"}(${palace.branch || "지지 미확인"})의 주성은 ${main}입니다. 보조성은 ${aux}, 살성·압박 신호는 ${malefic}로 정리되며, 사화 흐름은 ${trans}로 읽습니다.`;
}

function timingEvidenceText(seed) {
  const current = seed.chart.decadeLuck.find((item) => item && (item.current || item.isCurrent)) || seed.chart.decadeLuck[0] || null;
  const decade = current ? `${clean(current.label || current.range || "대운")}` : "현재 대운 세부 범위는 제한적으로 확인됩니다";
  const sihua = seed.chart.transformations.length
    ? seed.chart.transformations.map((item) => `${clean(item.star)} ${clean(item.type)}`).filter(Boolean).join(", ")
    : "사화 자료는 기본 명반 범위에서만 확인됩니다";
  return `대운 기준은 ${decade}이며, 가까운 흐름은 ${sihua}를 중심으로 현실 선택의 우선순위를 정리합니다.`;
}

function buildCategoryText(profile, seed, blueprint, categoryTitle, categoryIndex) {
  const palace = findPalace(seed, blueprint.palaceKey);
  const evidence = blueprint.palaceKey === "timing" ? timingEvidenceText(seed) : palaceEvidenceText(seed, palace);
  const label = blueprint.palaceKey === "timing" ? "대운·유년" : (palace?.nameKo || PALACE_LABELS[blueprint.palaceKey] || "해당 궁");
  const strengthGuide = "별 강도는 묘 ◎, 득 O, 리 ▲, 평 △, 함·실 X 순서로 보며, 강한 별은 바로 쓰는 재능으로, 약한 별은 관리해야 할 습관으로 해석합니다.";
  const practical = [
    "먼저 확인되는 별과 궁의 신호를 하나의 결론으로 단정하지 말고, 반복되는 선택 패턴을 구분하는 기준으로 삼는 편이 좋습니다.",
    "강한 신호는 작은 실행을 자주 반복할 때 성과가 커지고, 약한 신호는 일정·관계·돈의 경계를 먼저 세울 때 손실을 줄입니다.",
    `${categoryTitle}에서는 ${label}의 특징을 기준으로 이번 달에 바로 조정할 행동 하나와 장기적으로 유지할 습관 하나를 분리해 보세요.`,
  ];
  const focus = categoryIndex % 2 === 0
    ? "현실적인 선택에서는 빠른 확장보다 안정적인 반복 구조가 유리합니다."
    : "관계와 일의 균형에서는 부탁을 받을 때의 기준과 거절의 문장을 미리 정해두는 것이 도움이 됩니다.";
  return stripForbiddenTokens(`${evidence}\n\n${strengthGuide}\n\n${practical.join("\n\n")}\n\n${focus}`);
}

function buildLocalChapters(profile, seed) {
  return CHAPTER_BLUEPRINTS.map((blueprint) => {
    const categories = blueprint.categories.map((categoryTitle, index) => ({
      id: `${blueprint.id}-${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: buildCategoryText(profile, seed, blueprint, categoryTitle, index),
      finalText: buildCategoryText(profile, seed, blueprint, categoryTitle, index),
      order: index + 1,
    }));
    return {
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      categories,
      finalText: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
      text: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
      source: "local-skeleton",
    };
  });
}

function parseJsonMaybe(text) {
  const raw = clean(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function mergeLlmChapter(localChapter, llmJson) {
  const source = llmJson?.chapter && typeof llmJson.chapter === "object" ? llmJson.chapter : llmJson;
  const incoming = Array.isArray(source?.categories) ? source.categories : [];
  if (!incoming.length) return { ...localChapter, source: "local" };
  const categories = localChapter.categories.map((category, index) => {
    const matched = incoming.find((item) => clean(item?.title) === category.title || clean(item?.id) === category.id) || incoming[index] || {};
    const finalText = stripForbiddenTokens(matched.finalText || matched.text || matched.body || category.finalText);
    return { ...category, finalText: finalText || category.finalText, llmEnhancedText: finalText || "" };
  });
  return {
    ...localChapter,
    categories,
    finalText: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    text: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    source: "llm",
  };
}

function validateChapters(chapters = []) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) errors.push("chapter_count");
  CHAPTER_BLUEPRINTS.forEach((blueprint, index) => {
    const chapter = chapters[index];
    if (!chapter || clean(chapter.title) !== blueprint.title) errors.push(`chapter_${index + 1}_title`);
    const cats = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (cats.length !== blueprint.categories.length) errors.push(`chapter_${index + 1}_category_count`);
    blueprint.categories.forEach((title, categoryIndex) => {
      const category = cats[categoryIndex];
      if (!category || clean(category.title) !== title) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      const text = stripForbiddenTokens(category?.finalText || category?.text || "");
      if (text.length < 80) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_text`);
      const lowered = text.toLowerCase();
      for (const token of FORBIDDEN_TEXT) {
        if (lowered.includes(token.toLowerCase())) errors.push(`chapter_${index + 1}_forbidden_${token}`);
      }
    });
  });
  return { ok: errors.length === 0, errors };
}

async function enhanceChaptersWithLlm(env, profile, seed, localChapters) {
  const chapters = [];
  let fallbackUsed = false;
  for (let i = 0; i < localChapters.length; i += 1) {
    const chapter = localChapters[i];
    console.info("[ZiweiBook][Flow] LLM_ENRICH_START", { chapter: i + 1 });
    const prompt = [
      "당신은 자미두수 12궁, 명궁, 신궁, 사화, 대운·유년 해석에 능한 전문 상담가입니다.",
      "제공된 자미두수 계산 결과와 13챕터 뼈대를 바탕으로 각 챕터와 세부 카테고리에 맞는 완성형 상담문을 작성하세요.",
      "자미두수 계산을 새로 하지 말고, 제공된 명궁, 신궁, 12궁, 주성, 보조성, 별 강도, 사화, 대운·유년 데이터만 근거로 사용하세요.",
      "챕터 제목과 세부 카테고리 제목은 절대 바꾸지 마세요.",
      "각 세부 카테고리마다 2~4문단으로 설명하되, 예언을 단정하지 말고 선택과 전략 중심으로 쓰세요.",
      "내부 데이터 구조, 계산 로그, 개발자용 단어를 본문에 노출하지 마세요.",
      "반드시 JSON 객체 하나만 반환하세요. 형식: {\"chapter\":{\"title\":string,\"categories\":[{\"title\":string,\"finalText\":string}]}}",
      `프로필: ${JSON.stringify({ name: profile.name, gender: profile.gender, birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`, birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}` })}`,
      `계산 요약: ${JSON.stringify({ chart: seed.chart, legend: seed.strengthLegend })}`,
      `챕터 뼈대: ${JSON.stringify(chapter)}`,
    ].join("\n");
    try {
      const result = await callGeminiText(env, prompt, {
        keyEnvKeys: ["ZIWEI_GEMINI_API_KEY"],
        modelEnvKeys: ["ZIWEI_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"],
        temperature: 0.55,
        maxOutputTokens: 4096,
        timeoutMs: Number(env.ZIWEI_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 45000),
        totalTimeoutMs: Number(env.ZIWEI_GEMINI_TOTAL_TIMEOUT_MS || 90000),
        maxAttemptsPerPair: Number(env.ZIWEI_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 4),
      });
      const parsed = result?.ok ? parseJsonMaybe(result.text) : null;
      const merged = parsed ? mergeLlmChapter(chapter, parsed) : { ...chapter, source: "local" };
      if (!parsed) fallbackUsed = true;
      chapters.push(merged);
      console.info("[ZiweiBook][Flow] LLM_ENRICH_OK", { chapter: i + 1, source: merged.source });
    } catch (error) {
      fallbackUsed = true;
      chapters.push({ ...chapter, source: "local" });
      console.warn("[ZiweiBook][Flow] LLM_ENRICH_FALLBACK", { chapter: i + 1, message: clean(error?.message || error) });
    }
  }
  return { chapters, fallbackUsed };
}

function buildZiweiPayload(profile, seed, chapters, metadata = {}) {
  return {
    mode: "single",
    birthProfile: seed.birthProfile,
    chart: {
      mingGong: seed.chart.mingGong,
      shenGong: seed.chart.shenGong,
      palaces: seed.chart.palaces,
      transformations: seed.chart.transformations,
      decadeLuck: seed.chart.decadeLuck,
      annualLuck: seed.chart.annualLuck,
    },
    strengthLegend: seed.strengthLegend,
    interpretationSeeds: {
      personality: [palaceEvidenceText(seed, seed.lifePalace)],
      relationship: [palaceEvidenceText(seed, findPalace(seed, "spouse"))],
      career: [palaceEvidenceText(seed, findPalace(seed, "career"))],
      wealth: [palaceEvidenceText(seed, findPalace(seed, "wealth"))],
      health: [palaceEvidenceText(seed, findPalace(seed, "health"))],
      happiness: [palaceEvidenceText(seed, findPalace(seed, "fortune"))],
      timing: [timingEvidenceText(seed)],
    },
    chapters,
    metadata: { featureKey: ZIWEI_FEATURE_KEY, ...metadata },
  };
}

function renderZiweiPdf({ profile, seed, chapters, generatedAt, fallbackUsed }) {
  const toc = chapters.map((chapter) => `<li><span>${esc(chapter.roman)}</span><strong>${esc(chapter.title)}</strong></li>`).join("\n");
  const palaceSummary = seed.chart.palaces.slice(0, 12).map((p) => `<tr><td>${esc(p.nameKo)}</td><td>${esc(p.branch)}</td><td>${esc(starsText(p.mainStars))}</td></tr>`).join("\n");
  const chapterHtml = chapters.map((chapter, index) => {
    const categoryHtml = chapter.categories.map((category) => `<section class="zb-category"><h3>${esc(category.title)}</h3><p>${esc(category.finalText)}</p></section>`).join("\n");
    return `<article class="zb-chapter"><div class="zb-eyebrow">${esc(chapter.roman)} · 제 ${index + 1}장</div><h2>${esc(chapter.title)}</h2>${categoryHtml}</article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>자미두수 프리미엄 리포트</title>
  <style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:"Noto Serif KR","Malgun Gothic",serif;background:#100821;color:#f8f4ff;line-height:1.82}.page{max-width:980px;margin:0 auto;padding:28px 20px 64px}.cover{position:relative;overflow:hidden;min-height:92vh;padding:42px 34px;border-radius:24px;background:radial-gradient(circle at 72% 12%,rgba(250,204,21,.25),transparent 26%),linear-gradient(145deg,#160729 0%,#30125f 48%,#091b3a 100%);box-shadow:0 24px 60px rgba(0,0,0,.32);display:flex;flex-direction:column;justify-content:center}.cover::after{content:"";position:absolute;inset:24px;border:1px solid rgba(250,204,21,.28);border-radius:20px;pointer-events:none}.cover img{position:relative;z-index:1;width:min(320px,82%);border-radius:18px;margin:24px 0 0;box-shadow:0 18px 42px rgba(0,0,0,.34);background:#271146}.cover h1{position:relative;z-index:1;margin:8px 0 8px;font-size:44px;line-height:1.12;color:#fff7d6}.cover p{position:relative;z-index:1;margin:4px 0;color:#d8ccff}.badge{letter-spacing:.22em;text-transform:uppercase;color:#facc15;font-size:12px}.panel,.toc,.zb-chapter,.legend{margin-top:20px;padding:20px;border:1px solid rgba(216,180,254,.28);border-radius:18px;background:rgba(255,255,255,.08);box-shadow:0 14px 30px rgba(0,0,0,.16)}.panel h2,.toc h2,.legend h2{margin:0 0 12px;color:#fde68a}.meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.meta-item{padding:12px;border-radius:14px;background:rgba(16,8,33,.52);border:1px solid rgba(250,204,21,.2)}.meta-item b{display:block;color:#facc15}.legend-list{display:flex;flex-wrap:wrap;gap:8px}.legend-list span{padding:6px 10px;border-radius:999px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.26)}.palace-table{width:100%;border-collapse:collapse;font-size:13px}.palace-table td,.palace-table th{border-bottom:1px solid rgba(255,255,255,.12);padding:8px;text-align:left;vertical-align:top}.toc ol{margin:0;padding-left:20px}.toc li{margin:8px 0}.toc span{display:inline-block;min-width:44px;color:#facc15}.zb-chapter{break-inside:avoid-page;page-break-inside:avoid;background:#fbf7ff;color:#241333}.zb-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#7c3aed;font-size:12px}.zb-chapter h2{margin:8px 0 18px;color:#2e1065;font-size:26px}.zb-category{padding:14px 16px;margin:12px 0;border-radius:14px;background:#fff;border:1px solid #e9d5ff}.zb-category h3{margin:0 0 8px;color:#5b21b6;font-size:18px}.zb-category p{margin:0;white-space:pre-wrap;color:#2f2440}.notice{color:#d8ccff;font-size:13px}.footer{margin-top:22px;text-align:center;color:#c4b5fd;font-size:13px}@page{size:A4;margin:16mm 14mm 18mm}@media print{body{background:#fff}.page{padding:0}.cover,.panel,.toc,.legend,.zb-chapter{box-shadow:none}.cover{border-radius:0}.zb-chapter{break-before:page;page-break-before:always}.zb-chapter:first-of-type{break-before:auto;page-break-before:auto}}@media(max-width:720px){.cover h1{font-size:32px}.meta-grid{grid-template-columns:1fr}.page{padding:14px 10px 40px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <p class="badge">Code:Destiny Premium Ziwei</p>
      <h1>자미두수 프리미엄 리포트</h1>
      <p>명궁과 12궁으로 읽는 나만의 운명 설계도</p>
      <p>${esc(profile.name)} · ${esc(profile.birthIso)}</p>
      <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄 리포트 표지 이미지" />
    </section>
    <section class="panel">
      <div class="meta-grid"><div class="meta-item"><b>명궁</b>${esc(seed.chart.mingGong || "확인 범위 내")}</div><div class="meta-item"><b>신궁</b>${esc(seed.chart.shenGong || "확인 범위 내")}</div><div class="meta-item"><b>발행일</b>${esc(new Date(generatedAt).toLocaleDateString("ko-KR"))}</div></div>
      <p class="notice">${fallbackUsed ? "일부 해석은 기본 명반 해석으로 생성되었습니다." : "계산된 명반을 바탕으로 상담문을 보강했습니다."}</p>
    </section>
    <section class="legend"><h2>별 강도 기호</h2><div class="legend-list"><span>◎ 묘: 가장 강하게 드러나는 별</span><span>O 득: 안정적으로 힘을 얻은 별</span><span>▲ 리: 이롭게 활용할 수 있는 별</span><span>△ 평: 균형 관리가 필요한 별</span><span>X 함·실: 보완과 주의가 필요한 별</span></div></section>
    <section class="panel"><h2>12궁 핵심 명반</h2><table class="palace-table"><thead><tr><th>궁</th><th>지지</th><th>주성</th></tr></thead><tbody>${palaceSummary}</tbody></table></section>
    <section class="toc"><h2>목차</h2><ol>${toc}</ol></section>
    ${chapterHtml}
    <section class="footer">이 문서는 로컬 자미두수 명반 계산 결과와 프리미엄 상담문 보강을 바탕으로 작성되었습니다.</section>
  </main>
</body>
</html>`;
}

function buildPdfReadyPayload(profile, seed, chapters, metadata = {}) {
  const html = renderZiweiPdf({ profile, seed, chapters, generatedAt: new Date().toISOString(), fallbackUsed: Boolean(metadata.fallbackUsed) });
  return {
    title: `${stripForbiddenTokens(profile.name)} 자미두수 프리미엄 리포트`,
    filename: `ziwei-premium-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    html,
    chapters: chapters.map((chapter, index) => ({ chapter: index + 1, id: chapter.id, title: chapter.title, categories: chapter.categories, text: chapter.text, source: chapter.source })),
    metadata,
  };
}

async function handleChapters() {
  return json({ ok: true, serviceKey: ZIWEI_SERVICE_KEY, chapterCount: CHAPTER_BLUEPRINTS.length, chapters: CHAPTER_BLUEPRINTS });
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "UNAUTHORIZED", message: "자미두수 PDF 생성을 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "INVALID_INPUT", message: normalized.message }, { status: 422 });

  const premiumAccessToken = clean(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  );
  const featureKey = normalizeFeatureKey(body?.featureKey);

  console.info("[ZiweiBook][Flow] BILLING_CHECK_START", { featureKey, userId: auth.userId });
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
    ...body,
    featureKey,
    reportType: "ziweiPremium",
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/ziwei-book",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
      message: status === 401
        ? "자미두수 PDF 생성을 위해 먼저 로그인해 주세요."
        : status === 402
          ? "프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status });
  }
  console.info("[ZiweiBook][Flow] BILLING_CHECK_OK", { featureKey, accessType: clean(access.accessType || "") });

  const base = getZiweiBase(body);
  if (!base) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "MISSING_ZIWEI_ENGINE_RESULT", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요." }, { status: 422 });
  }

  console.info("[ZiweiBook][Flow] PDF_SEED_READY", { featureKey, hasBase: true });
  const profile = normalized.profile;
  const seed = buildZiweiPdfSeed(profile, base);
  const seedValidation = validateSeed(seed);
  if (!seedValidation.ok) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "ZIWEI_SEED_INVALID", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.", missing: seedValidation.errors }, { status: 422 });
  }

  const localChapters = buildLocalChapters(profile, seed);
  console.info("[ZiweiBook][Flow] LOCAL_SKELETON_READY", { chapterCount: localChapters.length });
  const enhanced = await enhanceChaptersWithLlm(env, profile, seed, localChapters);
  let completedChapters = enhanced.chapters;
  let fallbackUsed = Boolean(enhanced.fallbackUsed);
  const validation = validateChapters(completedChapters);
  if (!validation.ok) {
    fallbackUsed = true;
    completedChapters = localChapters.map((chapter) => ({ ...chapter, source: "local-fallback" }));
  }

  console.info("[ZiweiBook][Flow] PDF_RENDER_START", { chapterCount: completedChapters.length, fallbackUsed });
  const ziweiPayload = buildZiweiPayload(profile, seed, completedChapters, { accessType: clean(access.accessType || "unknown") });
  const pdfReady = buildPdfReadyPayload(profile, seed, completedChapters, { featureKey, reportType: "ziweiPremium", fallbackUsed });
  console.info("[ZiweiBook][Flow] PDF_RENDER_OK", { chapterCount: completedChapters.length });

  return json({
    ok: true,
    serviceKey: ZIWEI_SERVICE_KEY,
    featureKey,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    chapters: completedChapters,
    payload: ziweiPayload,
    ziweiPayload,
    pdfReady,
    fallbackUsed,
  });
}

export async function handleZiweiBookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/ziwei-book");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, message: "지원하지 않는 자미두수 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[ZiweiBook][Error]", { message: clean(error?.message || error) });
    return handleRouteError(error, "ZiweiBookRoutes");
  }
}

export const __ziweiBookTestUtils = {
  CHAPTER_BLUEPRINTS,
  buildZiweiPdfSeed,
  buildLocalChapters,
  validateChapters,
};